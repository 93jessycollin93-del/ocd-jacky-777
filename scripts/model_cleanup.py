#!/usr/bin/env python3
"""Find big duplicate files and stray AI models on this PC, and move them out of the way safely.

Runs on your PC. Standard library only, no network.

    python scripts/model_cleanup.py                       # report only: scans your user folder
    python scripts/model_cleanup.py --roots C:\\ D:\\       # scan whole drives (Windows)
    python scripts/model_cleanup.py --keep "C:\\Users\\me\\Desktop\\SAS-Jacky-HUB"
    python scripts/model_cleanup.py --quarantine          # move extra copies of duplicates
    python scripts/model_cleanup.py --quarantine --loose  # also move AI models no app uses
    python scripts/model_cleanup.py --restore             # put everything back

Nothing is ever deleted. "Quarantine" moves files into a `jackie-quarantine` folder on the
same drive (instant, no copying) and writes a manifest so --restore can put each file back.
Check that your apps still work, then delete the quarantine folder yourself.

What counts as "wired" (in use by an app) and is never moved:
  * Anything under an app's own model store: Ollama, LM Studio, Hugging Face cache, Jackie's
    jackie-models, GPT4All, Jan, ComfyUI, Stable Diffusion WebUI, text-generation-webui,
    AnythingLLM, Msty, LocalAI, KoboldCpp, Whisper and Torch caches, and SAS-Jacky-HUB.
  * Anything under program or system folders: Program Files, Windows, ProgramData, AppData,
    Library, .cache, .local, /usr, /opt, ...
  * Any folder you pass with --keep.
Duplicates keep one copy (a wired copy if there is one) and only loose copies are moved.
If every copy is wired, the group is reported and left alone.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

QUARANTINE_DIR = "jackie-quarantine"
MANIFEST = "manifest.json"
SESSIONS = "sessions.txt"  # in <home>/jackie-quarantine: every session folder, on any drive
PARTIAL = 1024 * 1024
CHUNK = 8 * 1024 * 1024

# Folder names (lower-case) that belong to an app or the system: files under them are "wired".
APP_DIRS = {
    ".ollama", ".lmstudio", "lm-studio", "lmstudio", "huggingface", "jackie-models", "gpt4all", "nomic.ai",
    "jan", "comfyui", "stable-diffusion-webui", "stable-diffusion-webui-forge", "text-generation-webui",
    "anythingllm-desktop", "anythingllm", "msty", "localai", "koboldcpp", "whisper", "torch", "sas-jacky-hub",
    "ocd-jacky-777", QUARANTINE_DIR,
}
SYSTEM_DIRS = {
    "program files", "program files (x86)", "windows", "programdata", "appdata", "library", ".cache", ".local",
    "$recycle.bin", "system volume information", "usr", "opt", "bin", "sbin", "lib", "lib64", "etc", "var",
    "proc", "sys", "dev", "snap", "applications", "node_modules", ".git",
}
# Never scanned. The quarantine is skipped so a later run can't treat a quarantined file as the copy to keep.
SKIP_WALK = {"$recycle.bin", "system volume information", "proc", "sys", "dev", ".git", "node_modules", QUARANTINE_DIR}

MODEL_SUFFIXES = (
    ".gguf", ".ggml", ".safetensors", ".onnx", ".onnx_data", ".pt", ".pth", ".ckpt", ".nemo", ".tflite",
    ".mlmodel", ".h5", ".keras", ".llamafile", ".pkl",
)


@dataclass
class FileInfo:
    path: Path
    size: int
    mtime: float
    wired: bool
    is_model: bool


def human(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024
    return f"{n} B"


def parse_size(text: str) -> int:
    t = text.strip().upper().rstrip("B")
    mult = {"K": 1024, "M": 1024**2, "G": 1024**3, "T": 1024**4}.get(t[-1:], 1)
    number = t[:-1] if t[-1:] in "KMGT" else t
    try:
        value = float(number)
    except ValueError:
        raise argparse.ArgumentTypeError(f"not a size: {text!r} (try 1G or 500M)") from None
    if value <= 0:
        raise argparse.ArgumentTypeError(f"size must be positive: {text!r}")
    return int(value * mult)


def looks_like_model(path: Path) -> bool:
    name = path.name.lower()
    if name.endswith(MODEL_SUFFIXES):
        return True
    if name.endswith(".bin") or "." not in name:
        try:
            with path.open("rb") as fh:
                head = fh.read(8)
        except OSError:
            return False
        if head[:4] in (b"GGUF", b"lmgg", b"ggjt", b"ggla", b"ggml", b"tjgg"):
            return True
        if head[:1] == b"\x80" and head[1:2] in (b"\x02", b"\x03", b"\x04", b"\x05"):
            return True  # Python pickle (PyTorch checkpoint)
        if head[:4] == b"PK\x03\x04" and name.endswith(".bin"):
            try:
                with zipfile.ZipFile(path) as zf:
                    return any(n.endswith("data.pkl") for n in zf.namelist()[:50])
            except (zipfile.BadZipFile, OSError):
                return False
    return False


def is_wired(path: Path, keep: list[Path]) -> bool:
    parts = {p.lower() for p in path.parts[:-1]}
    if parts & (APP_DIRS | SYSTEM_DIRS):
        return True
    resolved = _resolve(path)
    return any(_is_within(resolved, k) for k in keep)


def _resolve(path: Path) -> Path:
    try:
        return path.resolve()
    except OSError:
        return path.absolute()


def _is_within(path: Path, folder: Path) -> bool:
    try:
        path.relative_to(folder)
        return True
    except ValueError:
        return False


def scan(roots: list[Path], min_size: int, keep: list[Path], log=print) -> list[FileInfo]:
    found: list[FileInfo] = []
    seen_inodes: set[tuple[int, int]] = set()
    keep = [_resolve(k) for k in keep]
    for root in roots:
        for dirpath, dirnames, filenames in os.walk(root, onerror=lambda e: None, followlinks=False):
            dirnames[:] = [d for d in dirnames if d.lower() not in SKIP_WALK]
            for name in filenames:
                path = Path(dirpath) / name
                try:
                    st = path.lstat()
                except OSError:
                    continue
                if not path.is_file() or path.is_symlink() or st.st_size < min_size:
                    continue
                inode = (st.st_dev, st.st_ino)
                if st.st_ino and inode in seen_inodes:
                    continue  # a hard link to a file we already have is not a duplicate
                seen_inodes.add(inode)
                found.append(FileInfo(path, st.st_size, st.st_mtime, is_wired(path, keep), looks_like_model(path)))
    log(f"scanned {len(roots)} folder(s): {len(found)} file(s) of {human(min_size)} or more")
    return found


def _digest(path: Path, partial: bool) -> str | None:
    h = hashlib.sha256()
    try:
        with path.open("rb") as fh:
            if partial:
                size = path.stat().st_size
                h.update(fh.read(PARTIAL))
                if size > 2 * PARTIAL:
                    fh.seek(-PARTIAL, os.SEEK_END)
                h.update(fh.read(PARTIAL))
                h.update(str(size).encode())
            else:
                while chunk := fh.read(CHUNK):
                    h.update(chunk)
    except OSError:
        return None
    return h.hexdigest()


def find_duplicates(files: list[FileInfo]) -> list[list[FileInfo]]:
    """Groups of identical files: same size, then same head/tail, then same full SHA-256."""
    by_size: dict[int, list[FileInfo]] = {}
    for f in files:
        by_size.setdefault(f.size, []).append(f)
    groups = []
    for same_size in by_size.values():
        if len(same_size) < 2:
            continue
        for partial_group in _group(same_size, partial=True):
            groups.extend(_group(partial_group, partial=False))
    return sorted(groups, key=lambda g: -g[0].size * (len(g) - 1))


def _group(files: list[FileInfo], partial: bool) -> list[list[FileInfo]]:
    buckets: dict[str, list[FileInfo]] = {}
    for f in files:
        d = _digest(f.path, partial)
        if d is not None:
            buckets.setdefault(d, []).append(f)
    return [b for b in buckets.values() if len(b) > 1]


def pick_keeper(group: list[FileInfo]) -> FileInfo:
    """Keep a wired copy if any; otherwise the oldest, then the shortest path."""
    return min(group, key=lambda f: (not f.wired, f.mtime, len(str(f.path)), str(f.path)))


def plan(files: list[FileInfo], groups: list[list[FileInfo]], include_loose: bool) -> list[tuple[FileInfo, str]]:
    moves: list[tuple[FileInfo, str]] = []
    in_groups: set[Path] = set()
    for group in groups:
        keeper = pick_keeper(group)
        for f in group:
            in_groups.add(f.path)
            if f is not keeper and not f.wired:
                moves.append((f, f"duplicate of {keeper.path}"))
    if include_loose:
        for f in files:
            if f.is_model and not f.wired and f.path not in in_groups:
                moves.append((f, "AI model file that no app folder uses"))
    return moves


def quarantine_root(path: Path, home: Path) -> Path:
    """A quarantine folder on the same drive as `path`, so moving is a rename, not a copy."""
    try:
        dev = path.stat().st_dev
        if home.exists() and home.stat().st_dev == dev:
            return home / QUARANTINE_DIR
        top = path.parent
        while top.parent != top and top.parent.stat().st_dev == dev:
            top = top.parent
        return top / QUARANTINE_DIR
    except OSError:
        return home / QUARANTINE_DIR


def _stored_name(path: Path) -> Path:
    parts = [p.replace(":", "").strip("\\/") for p in path.parts]
    return Path(*[p for p in parts if p])


def do_quarantine(moves: list[tuple[FileInfo, str]], home: Path, stamp: str, log=print) -> int:
    manifests: dict[Path, list[dict]] = {}
    moved = 0
    for f, why in moves:
        session = quarantine_root(f.path, home) / stamp
        dest = session / _stored_name(_resolve(f.path))
        try:
            dest.parent.mkdir(parents=True, exist_ok=True)
            if dest.exists():
                log(f"  skip (already in quarantine): {f.path}")
                continue
            shutil.move(str(f.path), str(dest))
        except OSError as exc:
            log(f"  could not move {f.path}: {exc}")
            continue
        if session not in manifests:
            _remember_session(home, session)
        manifests.setdefault(session, []).append(
            {"original": str(f.path), "stored": str(dest), "size": f.size, "reason": why})
        moved += 1
        log(f"  moved {human(f.size):>9}  {f.path}")
        _write_manifest(session, manifests[session])
    return moved


def _remember_session(home: Path, session: Path) -> None:
    index = home / QUARANTINE_DIR / SESSIONS
    index.parent.mkdir(parents=True, exist_ok=True)
    with index.open("a", encoding="utf-8") as fh:
        fh.write(f"{session}\n")


def known_sessions(home: Path) -> list[Path]:
    index = home / QUARANTINE_DIR / SESSIONS
    lines = index.read_text(encoding="utf-8").splitlines() if index.is_file() else []
    found = {Path(line) for line in lines if line.strip()}
    found |= {m.parent for m in (home / QUARANTINE_DIR).glob(f"*/{MANIFEST}")}
    return sorted(found)


def _write_manifest(session: Path, entries: list[dict]) -> None:
    (session / MANIFEST).write_text(json.dumps(
        {"created": datetime.now(timezone.utc).isoformat(timespec="seconds"), "files": entries}, indent=2),
        encoding="utf-8")


def do_restore(sessions: list[Path], log=print) -> tuple[int, int]:
    restored = problems = 0
    for session in sessions:
        for manifest in [session / MANIFEST] if (session / MANIFEST).is_file() else []:
            data = json.loads(manifest.read_text(encoding="utf-8"))
            remaining = []
            for entry in data.get("files", []):
                stored, original = Path(entry["stored"]), Path(entry["original"])
                if not stored.exists():
                    continue
                if original.exists():
                    log(f"  not restoring over an existing file: {original}")
                    remaining.append(entry)
                    problems += 1
                    continue
                try:
                    original.parent.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(stored), str(original))
                    restored += 1
                    log(f"  restored {original}")
                except OSError as exc:
                    log(f"  could not restore {original}: {exc}")
                    remaining.append(entry)
                    problems += 1
            if remaining:
                data["files"] = remaining
                manifest.write_text(json.dumps(data, indent=2), encoding="utf-8")
            else:
                manifest.unlink()
    return restored, problems


def default_roots(home: Path) -> list[Path]:
    return [home]


def main(argv: list[str] | None = None, home: Path | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--roots", nargs="+", type=Path, help="folders or drives to scan (default: your user folder)")
    parser.add_argument("--min-size", type=parse_size, default=parse_size("1G"), help="only look at files this big (default 1G)")
    parser.add_argument("--keep", nargs="+", type=Path, default=[], help="extra folders whose files are never moved")
    parser.add_argument("--quarantine", action="store_true", help="move extra duplicate copies into jackie-quarantine")
    parser.add_argument("--loose", action="store_true", help="with --quarantine: also move AI models no app uses")
    parser.add_argument("--restore", action="store_true", help="move everything in jackie-quarantine back")
    parser.add_argument("--report", type=Path, help="also write the findings to this JSON file")
    args = parser.parse_args(argv)
    home = home or Path.home()

    if args.restore:
        sessions = set(known_sessions(home))
        for r in args.roots or []:
            sessions |= {m.parent for m in (Path(r) / QUARANTINE_DIR).glob(f"*/{MANIFEST}")}
        restored, problems = do_restore(sorted(sessions))
        print(f"\nrestored {restored} file(s); {problems} left in quarantine")
        return 1 if problems else 0

    roots = args.roots or default_roots(home)
    files = scan(roots, args.min_size, args.keep)
    groups = find_duplicates(files)
    moves = plan(files, groups, args.loose)

    print(f"\nDuplicate groups: {len(groups)}")
    for group in groups:
        keeper = pick_keeper(group)
        print(f"  {human(group[0].size)} x {len(group)}")
        for f in group:
            tag = "keep " if f is keeper else ("wired" if f.wired else "extra")
            print(f"    [{tag}] {f.path}")
    loose = [f for f in files if f.is_model and not f.wired]
    print(f"\nAI model files outside any app folder: {len(loose)}")
    for f in sorted(loose, key=lambda x: -x.size):
        print(f"    {human(f.size):>9}  {f.path}")

    reclaim = sum(f.size for f, _ in moves)
    if args.report:
        args.report.write_text(json.dumps({
            "duplicates": [[{"path": str(f.path), "size": f.size, "wired": f.wired} for f in g] for g in groups],
            "loose_models": [{"path": str(f.path), "size": f.size} for f in loose],
            "would_move": [{"path": str(f.path), "size": f.size, "reason": why} for f, why in moves],
        }, indent=2), encoding="utf-8")

    if not args.quarantine:
        print(f"\nReport only, nothing changed. --quarantine{' --loose' if loose and not args.loose else ''} "
              f"would move {len(moves)} file(s), {human(reclaim)}. Nothing is ever deleted.")
        return 0

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    print(f"\nMoving {len(moves)} file(s), {human(reclaim)}, into {QUARANTINE_DIR}/{stamp} on each drive:")
    moved = do_quarantine(moves, home, stamp)
    print(f"\nmoved {moved} file(s). Check your apps still work, then delete the {QUARANTINE_DIR} folder. "
          f"To undo: python scripts/model_cleanup.py --restore")
    return 0


if __name__ == "__main__":
    sys.exit(main())
