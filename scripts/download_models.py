#!/usr/bin/env python3
"""Download Jackie's compact on-device model queue.

Reads src/data/model-queue.json (the same catalog the /models page renders) and
pulls each model from the Hugging Face Hub into the queue's folder layout, then
writes a manifest.json next to it. Runs on your PC, not in the Lovable app.

    pip install "huggingface_hub>=0.23"
    python scripts/download_models.py --plan --phase 1        # offline: what would happen
    python scripts/download_models.py --check --phase 1       # online: verify repos + real sizes
    python scripts/download_models.py --phase 1               # download
    python scripts/download_models.py --only whisper-tiny,bge-small-en-v1.5 --formats onnx
    python scripts/download_models.py --verify                # offline: re-check files on disk

Safe by default, for a machine you want to keep clean:
  * Files that can run code when loaded are skipped: PyTorch pickle checkpoints
    (.bin/.pt/.pth/.ckpt/.pkl/.nemo) and the repo's own .py files. Opt in per run with
    --allow-pickle / --allow-code, only for repos you trust.
  * Each repo is pinned to one commit, and every file is checked against the fingerprint
    the Hub publishes (SHA-256 for weights, git blob hash for small files). A file that
    doesn't match fails its job and is named in the report.
  * manifest.json records the commit and each file's SHA-256, so --verify can re-check a
    copy later (for example one restored from a backup drive) without going online.

Layout under --out (default $JACKIE_MODELS_DIR or ~/jackie-models):
    <folder>/<id>/                native weights (safetensors, pytorch, ggml, ctranslate2, diffusers)
    <folder>/<id>/manifest.json   what was fetched, from where, and what still needs converting
    converted/<format>/<id>/      onnx / gguf builds (and later your own tflite, coreml, ...)

Gated repos (Gemma, MobileLLM) need the license accepted on the Hub and a token:
`hf auth login` or HF_TOKEN=...
"""

from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import os
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CATALOG_PATH = REPO_ROOT / "src" / "data" / "model-queue.json"

# Formats that land beside the native weights vs. under converted/<format>/.
NATIVE_FORMATS = {"safetensors", "pytorch", "ggml", "ctranslate2", "diffusers"}
# Formats the Hub rarely hosts directly — recorded as pending conversions unless a variant repo is given.
CONVERT_ONLY = {"tflite", "coreml", "executorch", "openvino"}

SUPPORT_FILES = [
    "*.json", "*.txt", "*.model", "*.tiktoken", "*.py", "*.yaml", "*.yml",
    "README.md", "LICENSE*", "USE_POLICY*", "NOTICE*",
]
WEIGHT_PATTERNS = {
    "safetensors": ["*.safetensors"],
    "pytorch": ["pytorch_model*.bin", "*.pt", "*.pth", "*.ckpt", "*.nemo"],
    "onnx": ["*.onnx", "*.onnx_data", "*.onnx.data"],
    "gguf": ["*.gguf"],
    "ctranslate2": ["model.bin", "vocabulary.*"],
}
ONNX_QUANT_SUFFIXES = ("fp16", "q4f16", "q4", "bnb4", "int8", "uint8", "quantized", "q8")
# Python pickle files can run code when they are loaded. `.bin` is a pickle only for PyTorch
# checkpoints: whisper.cpp ggml and CTranslate2 use `.bin` for plain binary weights.
PICKLE_SUFFIXES = (".pt", ".pth", ".ckpt", ".pkl", ".pickle", ".joblib", ".nemo")
PLAIN_BIN_FORMATS = {"ggml", "ctranslate2"}
WEIGHT_SUFFIXES = (".safetensors", ".onnx", ".onnx_data", ".onnx.data", ".gguf", ".bin", *PICKLE_SUFFIXES)
HASH_CHUNK = 8 * 1024 * 1024

FLAG_WARNINGS = {
    "gated": "gated: accept the license on the Hub and log in first",
    "non-commercial": "non-commercial license",
    "custom-license": "custom license: review the terms before shipping",
    "agpl": "AGPL-3.0",
    "remote-code": "needs trust_remote_code: read the repo's .py files before you run them",
    "large": "large download",
}


@dataclass
class Job:
    model: dict
    fmt: str
    repo: str | None
    dest: Path
    include: list[str] | None = None
    quant: str | None = None
    status: str = "pending"
    detail: str = ""
    files: list[str] = field(default_factory=list)
    bytes: int = 0
    revision: str | None = None
    sha256: dict[str, str] = field(default_factory=dict)
    dropped: list[str] = field(default_factory=list)


def load_catalog(path: Path = CATALOG_PATH) -> dict:
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def phase_order(catalog: dict) -> list[tuple[str, dict]]:
    """Every model once, in queue order: phase 1, 2, 3, then the backlog in catalog order."""
    by_id = {m["id"]: m for m in catalog["models"]}
    ordered, seen = [], set()
    for phase in sorted(catalog["phases"], key=int):
        for mid in catalog["phases"][phase]:
            ordered.append((phase, by_id[mid]))
            seen.add(mid)
    ordered += [("backlog", m) for m in catalog["models"] if m["id"] not in seen]
    return ordered


def select(catalog: dict, phases: list[str] | None, only: list[str] | None, categories: list[str] | None,
           skip_flags: list[str]) -> list[tuple[str, dict]]:
    known = {m["id"] for m in catalog["models"]}
    if only:
        unknown = [i for i in only if i not in known]
        if unknown:
            raise SystemExit(f"unknown model id(s): {', '.join(unknown)}")
    picked = []
    for phase, model in phase_order(catalog):
        if only and model["id"] not in only:
            continue
        if phases and phase not in phases:
            continue
        if categories and model["folder"].split("/")[0] not in categories:
            continue
        if set(model.get("flags", [])) & set(skip_flags):
            continue
        picked.append((phase, model))
    return picked


def plan_jobs(model: dict, out: Path, formats: list[str] | None) -> list[Job]:
    native_dir = out / model["folder"] / model["id"]
    variants = model.get("variants", {})
    jobs: list[Job] = []
    wanted = [f for f in model["formats"] if not formats or f in formats]

    if model.get("source", "huggingface") != "huggingface":
        if wanted:
            jobs.append(Job(model, "manual", None, native_dir, status="manual", detail=model.get("url", "")))
        return jobs

    # An explicit `include` on the model is authoritative: one job for exactly those files.
    if model.get("include") and wanted:
        primary = next((f for f in wanted if f in NATIVE_FORMATS), wanted[0])
        jobs.append(Job(model, primary, model["repo"], native_dir, include=model["include"]))
        wanted = [f for f in wanted if f != primary]

    for fmt in wanted:
        variant = variants.get(fmt)
        dest = native_dir if fmt in NATIVE_FORMATS else out / "converted" / fmt / model["id"]
        if variant:
            jobs.append(Job(model, fmt, variant["repo"], dest, include=variant.get("include"), quant=variant.get("quant")))
        elif fmt in CONVERT_ONLY or fmt == "gguf" or (fmt not in NATIVE_FORMATS and model.get("include")):
            jobs.append(Job(model, fmt, None, dest, status="convert", detail=convert_hint(fmt, model)))
        else:
            # Main repo; ONNX is opportunistic (many repos ship an onnx/ folder, many don't).
            jobs.append(Job(model, fmt, model["repo"], dest))
    return jobs


def convert_hint(fmt: str, model: dict) -> str:
    target = f"converted/{fmt}/{model['id']}"
    if fmt == "onnx" and model.get("source", "huggingface") == "huggingface" and not model.get("include"):
        return f"no ONNX build on the Hub: optimum-cli export onnx --model {model['repo']} {target}"
    if fmt == "gguf":
        return f"no GGUF variant listed: llama.cpp convert_hf_to_gguf.py <native dir> --outfile {target}/{model['id']}.gguf"
    return f"export locally into {target}"


def _match(path: str, patterns: list[str]) -> bool:
    low = path.lower()
    return any(fnmatch.fnmatchcase(low, p.lower()) or fnmatch.fnmatchcase(low.rsplit("/", 1)[-1], p.lower())
               for p in patterns)


def _onnx_stem_quant(path: str) -> str:
    stem = path.rsplit("/", 1)[-1].split(".onnx", 1)[0].lower()
    for suffix in ONNX_QUANT_SUFFIXES:
        if stem.endswith("_" + suffix):
            return suffix
    return "fp32"


def choose_files(job: Job, repo_files: list[str], onnx_quant: str) -> list[str]:
    """Pick the exact files a job needs from a repo listing (case-insensitive globbing)."""
    repo_files = [f for f in repo_files if not f.rsplit("/", 1)[-1].startswith(".")]
    if job.include:
        return [f for f in repo_files if _match(f, job.include)]

    support = [f for f in repo_files if _match(f, SUPPORT_FILES)]
    fmt = job.fmt

    if fmt == "gguf":
        ggufs = [f for f in repo_files if _match(f, WEIGHT_PATTERNS["gguf"])]
        if job.quant:
            ggufs = [f for f in ggufs if job.quant.lower() in f.lower()] or []
        # Vision GGUFs need their projector alongside the language model.
        mmproj = [f for f in repo_files if "mmproj" in f.lower() and f.lower().endswith(".gguf")]
        picked = sorted(set(ggufs + mmproj[:1]))
        return picked + [f for f in support if f.lower().endswith(("readme.md", ".json")) and "/" not in f] if picked else []

    if fmt == "onnx":
        onnx = [f for f in repo_files if _match(f, WEIGHT_PATTERNS["onnx"])]
        if onnx_quant != "all":
            graphs = [f for f in onnx if f.lower().endswith(".onnx")]
            keep = {f.split(".onnx", 1)[0] for f in graphs if _onnx_stem_quant(f) == onnx_quant}
            if keep:
                onnx = [f for f in onnx if f.split(".onnx", 1)[0] in keep]
        return onnx + [f for f in support if not f.lower().endswith(".onnx")] if onnx else []

    if fmt == "diffusers":
        st = [f for f in repo_files if f.lower().endswith(".safetensors")]
        fp16 = [f for f in st if ".fp16." in f.lower()]
        weights = fp16 or [f for f in st if "/" in f] or st
        return weights + support if weights else []

    if fmt == "ctranslate2":
        return repo_files  # Systran repos are just model.bin + tokenizer/config.

    if fmt == "ggml":
        return [f for f in repo_files if f.lower().endswith(".bin")]

    # Native weights: prefer safetensors, fall back to pickled checkpoints.
    st = [f for f in repo_files if _match(f, WEIGHT_PATTERNS["safetensors"]) and not f.lower().startswith("onnx/")]
    weights = st or [f for f in repo_files if _match(f, WEIGHT_PATTERNS["pytorch"])]
    return weights + support if weights else []


def is_pickle(path: str, fmt: str) -> bool:
    name = path.rsplit("/", 1)[-1].lower()
    return name.endswith(PICKLE_SUFFIXES) or (name.endswith(".bin") and fmt not in PLAIN_BIN_FORMATS)


def safety_filter(job: Job, files: list[str], allow_pickle: bool, allow_code: bool) -> tuple[list[str], list[str], bool]:
    """Drop files that can run code. Returns (kept, dropped, weights_lost)."""
    kept, dropped = [], []
    for f in files:
        risky = (not allow_code and f.lower().endswith(".py")) or (not allow_pickle and is_pickle(f, job.fmt))
        (dropped if risky else kept).append(f)
    had_weights = any(f.lower().endswith(WEIGHT_SUFFIXES) for f in files)
    weights_lost = had_weights and not any(f.lower().endswith(WEIGHT_SUFFIXES) for f in kept)
    return kept, dropped, weights_lost


def _expected(sibling) -> tuple[str | None, str | None]:
    """(sha256, git blob sha1) the Hub publishes for a file; LFS files carry a SHA-256."""
    lfs = getattr(sibling, "lfs", None)
    sha256 = getattr(lfs, "sha256", None) or (lfs.get("sha256") if isinstance(lfs, dict) else None)
    return sha256, getattr(sibling, "blob_id", None)


def file_digests(path: Path) -> tuple[str, str]:
    """(sha256, git blob sha1) of a file, read once."""
    sha256 = hashlib.sha256()
    blob = hashlib.sha1(f"blob {path.stat().st_size}\0".encode())
    with path.open("rb") as fh:
        while chunk := fh.read(HASH_CHUNK):
            sha256.update(chunk)
            blob.update(chunk)
    return sha256.hexdigest(), blob.hexdigest()


def verify_against_hub(dest: Path, files: list[str], siblings: dict) -> tuple[dict[str, str], list[str]]:
    """Hash each downloaded file and compare with the Hub. Returns (sha256 per file, problems)."""
    hashes, problems = {}, []
    for f in files:
        local = dest / f
        want_sha256, want_blob = _expected(siblings.get(f))
        if not local.is_file():
            problems.append(f"{f}: missing after download")
            continue
        got_sha256, got_blob = file_digests(local)
        hashes[f] = got_sha256
        if want_sha256:
            ok = got_sha256 == want_sha256.lower()
        elif want_blob:
            ok = got_blob == want_blob.lower()
        else:
            problems.append(f"{f}: the Hub gave no fingerprint to check against")
            continue
        if not ok:
            problems.append(f"{f}: does not match the Hub's fingerprint")
    return hashes, problems


def _escape_glob(name: str) -> str:
    return re.sub(r"([*?\[])", r"[\1]", name)


def _hub():
    try:
        import huggingface_hub  # noqa: F401
        from huggingface_hub import HfApi, snapshot_download
        from huggingface_hub.errors import GatedRepoError, HfHubHTTPError, RepositoryNotFoundError
    except ImportError as exc:  # pragma: no cover - environment guard
        raise SystemExit('huggingface_hub>=0.23 is required: pip install "huggingface_hub>=0.23"') from exc
    return HfApi(), snapshot_download, GatedRepoError, RepositoryNotFoundError, HfHubHTTPError


def run(jobs: list[Job], mode: str, onnx_quant: str, allow_pickle: bool = False, allow_code: bool = False) -> None:
    api, snapshot_download, GatedRepoError, RepositoryNotFoundError, HfHubHTTPError = _hub()
    listings: dict[str, tuple[str | None, dict]] = {}
    for job in jobs:
        if job.status in ("manual", "convert"):
            continue
        try:
            if job.repo not in listings:
                info = api.model_info(job.repo, files_metadata=True)
                listings[job.repo] = (getattr(info, "sha", None), {s.rfilename: s for s in (info.siblings or [])})
            revision, siblings = listings[job.repo]
            chosen = choose_files(job, list(siblings), onnx_quant)
            job.files, job.dropped, weights_lost = safety_filter(job, chosen, allow_pickle, allow_code)
            job.bytes = sum(getattr(siblings.get(f), "size", 0) or 0 for f in job.files)
            if not chosen and job.fmt == "onnx" and job.repo == job.model.get("repo"):
                job.repo, job.status, job.detail = None, "convert", convert_hint("onnx", job.model)
                continue
            if weights_lost:
                job.status, job.files, job.bytes = "skipped", [], 0
                job.detail = (f"only pickle weights, which can run code when loaded; "
                              f"use --allow-pickle only if you trust {job.repo}")
                continue
            if not job.files:
                job.status, job.detail = "missing", f"no {job.fmt} files matched in {job.repo}"
                continue
            if any(f.lower().endswith(".py") for f in job.dropped):
                job.detail = "skipped the repo's .py files: this model needs them (trust_remote_code); read them, then use --allow-code"
            if not revision:
                job.status, job.detail = "error", f"the Hub did not report a commit for {job.repo}; not downloading unpinned files"
                continue
            job.revision = revision
            if mode == "check":
                job.status = "ok"
                continue
            print(f"  ↓ {job.model['id']} [{job.fmt}] {job.repo}@{revision[:10]} → {job.dest} ({human(job.bytes)})", flush=True)
            job.dest.mkdir(parents=True, exist_ok=True)
            snapshot_download(job.repo, revision=revision, local_dir=str(job.dest),
                              allow_patterns=[_escape_glob(f) for f in job.files])
            job.sha256, problems = verify_against_hub(job.dest, job.files, siblings)
            if problems:
                job.status = "error"
                job.detail = "fingerprint check failed, do not use these files: " + "; ".join(problems[:3])
                continue
            job.status = "downloaded"
        except GatedRepoError:
            job.status, job.detail = "gated", f"accept the license at https://huggingface.co/{job.repo} and log in"
        except RepositoryNotFoundError:
            job.status, job.detail = "missing", f"repo not found: {job.repo}"
        except HfHubHTTPError as exc:
            job.status, job.detail = "error", str(exc).splitlines()[0]
        except OSError as exc:
            job.status, job.detail = "error", str(exc)


def memory_tier(model: dict, catalog: dict) -> str:
    if model.get("memory_tier"):
        return model["memory_tier"]
    millions = params_in_millions(model.get("params"))
    tiers = catalog["memory_tiers"]
    if millions is None:
        return "balanced"
    if millions <= tiers["fast_max_millions"]:
        return "fast"
    return "balanced" if millions <= tiers["balanced_max_millions"] else "quality"


def params_in_millions(params: str | None) -> float | None:
    match = re.fullmatch(r"\s*([\d.]+)\s*([KMB])\s*", params or "", re.I)
    if not match:
        return None
    value, unit = float(match.group(1)), match.group(2).upper()
    return value * {"K": 1e-3, "M": 1, "B": 1e3}[unit]


def write_manifest(model: dict, jobs: list[Job], catalog: dict, out: Path, phase: str) -> Path:
    by_id = {m["id"]: m for m in catalog["models"]}
    runtimes: list[str] = []
    for fmt in model["formats"]:
        for rt in catalog["format_runtimes"].get(fmt, []):
            if rt not in runtimes:
                runtimes.append(rt)
    manifest = {
        "name": model["name"],
        "source": model.get("repo") or model.get("url"),
        "task": model["task"],
        "parameters": model.get("params"),
        "formats": model["formats"],
        "quantizations": [v["quant"] for v in model.get("variants", {}).values() if v.get("quant")],
        "runtime_targets": runtimes,
        "memory_tier": memory_tier(model, catalog),
        "fallbacks": [by_id[f].get("repo") or by_id[f]["id"] for f in model.get("fallbacks", [])],
        "id": model["id"],
        "phase": phase,
        "priority": model["priority"],
        "flags": model.get("flags", []),
        "artifacts": [
            {"format": j.fmt, "repo": j.repo, "revision": j.revision, "path": os.path.relpath(j.dest, out),
             "files": j.files, "bytes": j.bytes, "sha256": j.sha256, "skipped_for_safety": j.dropped}
            for j in jobs if j.status == "downloaded"
        ],
        "pending_conversions": [j.fmt for j in jobs if j.status == "convert"],
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    if model.get("requested_as"):
        manifest["requested_as"] = model["requested_as"]
    path = out / model["folder"] / model["id"] / "manifest.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return path


def verify_local(model: dict, out: Path) -> tuple[str, list[str]]:
    """Offline: re-hash the files a manifest lists and compare with its recorded SHA-256s."""
    path = out / model["folder"] / model["id"] / "manifest.json"
    if not path.is_file():
        return "absent", []
    manifest = json.loads(path.read_text(encoding="utf-8"))
    problems, checked = [], 0
    for art in manifest.get("artifacts", []):
        recorded = art.get("sha256") or {}
        for f in art.get("files", []):
            local = out / art["path"] / f
            if f not in recorded:
                problems.append(f"{art['path']}/{f}: no fingerprint recorded (download it again to add one)")
            elif not local.is_file():
                problems.append(f"{art['path']}/{f}: missing")
            elif file_digests(local)[0] != recorded[f]:
                problems.append(f"{art['path']}/{f}: changed since download")
            else:
                checked += 1
    return ("ok" if not problems else "bad"), problems if problems else [f"{checked} file(s) match"]


def human(n: int) -> str:
    size = float(n)
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024 or unit == "GB":
            return f"{size:.0f} {unit}" if unit == "B" else f"{size:.1f} {unit}"
        size /= 1024
    return f"{n} B"


def _csv(value: str | None) -> list[str] | None:
    return [v.strip() for v in value.split(",") if v.strip()] if value else None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--phase", help="comma list of 1,2,3,backlog (default: everything)")
    parser.add_argument("--only", help="comma list of model ids from the catalog")
    parser.add_argument("--category", help="comma list of text,embeddings,audio,vision,multimodal")
    parser.add_argument("--formats", help="comma list, e.g. gguf,onnx (default: every format the model lists)")
    parser.add_argument("--skip-flag", action="append", default=[], choices=sorted(FLAG_WARNINGS),
                        help="skip models carrying this flag (repeatable), e.g. --skip-flag non-commercial")
    parser.add_argument("--onnx-quant", default="fp32", choices=["fp32", *ONNX_QUANT_SUFFIXES, "all"],
                        help="which ONNX graph variant to keep when a repo ships several (default fp32)")
    parser.add_argument("--out", type=Path, default=Path(os.environ.get("JACKIE_MODELS_DIR", Path.home() / "jackie-models")))
    parser.add_argument("--catalog", type=Path, default=CATALOG_PATH)
    parser.add_argument("--allow-pickle", action="store_true",
                        help="also fetch PyTorch pickle checkpoints (.bin/.pt/.pth/.ckpt); they can run code when loaded")
    parser.add_argument("--allow-code", action="store_true",
                        help="also fetch the repo's .py files (remote-code models need them); read them first")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--plan", action="store_true", help="offline: print the queue and destinations, touch nothing")
    mode.add_argument("--check", action="store_true", help="online: verify every repo and report real download sizes")
    mode.add_argument("--verify", action="store_true",
                      help="offline: re-check downloaded files against the SHA-256s in their manifest.json")
    args = parser.parse_args(argv)

    catalog = load_catalog(args.catalog)
    picked = select(catalog, _csv(args.phase), _csv(args.only), _csv(args.category), args.skip_flag)
    if not picked:
        print("nothing selected")
        return 0
    out = args.out.expanduser().resolve()
    formats = _csv(args.formats)
    if args.verify:
        bad = 0
        for phase, model in picked:
            state, notes = verify_local(model, out)
            if state == "absent":
                continue
            print(f"[{phase:>7}] {model['id']}: {state}")
            for note in notes:
                print(f"           {note}")
            bad += state == "bad"
        print(f"\nverify: {bad} model(s) with problems")
        return 1 if bad else 0
    run_mode = "plan" if args.plan else "check" if args.check else "download"

    plans = [(phase, model, plan_jobs(model, out, formats)) for phase, model in picked]
    plans = [p for p in plans if p[2]]  # --formats can leave a model with nothing to fetch
    all_jobs = [j for _, _, jobs in plans for j in jobs]

    print(f"{run_mode}: {len(plans)} model(s), {len(all_jobs)} job(s) → {out}\n")
    if run_mode != "plan":
        run(all_jobs, run_mode, args.onnx_quant, args.allow_pickle, args.allow_code)

    failed = 0
    for phase, model, jobs in plans:
        flags = model.get("flags", [])
        head = f"[{phase:>7}] {model['id']}  ({model.get('params') or '?'} · {model['task']})"
        print(head)
        if model.get("requested_as"):
            print(f"           corrected from {model['requested_as']}")
        for flag in flags:
            print(f"           ! {FLAG_WARNINGS[flag]}")
        for job in jobs:
            where = os.path.relpath(job.dest, out)
            size = f" {human(job.bytes)}" if job.bytes else ""
            src = job.repo or (job.detail if job.status == "manual" else "local")
            print(f"           {job.status:<10} {job.fmt:<12} {src} → {where}{size}")
            if job.detail and job.status != "manual":
                print(f"           {'':<10} {job.detail}")
            failed += job.status in ("missing", "error", "gated")
        if run_mode == "download" and any(j.status == "downloaded" for j in jobs):
            write_manifest(model, jobs, catalog, out, phase)

    total = sum(j.bytes for j in all_jobs if j.status in ("ok", "downloaded"))
    skipped = sum(j.status == "skipped" for j in all_jobs)
    if run_mode != "plan":
        print(f"\n{'would download' if run_mode == 'check' else 'downloaded'}: {human(total)}; problems: {failed}"
              + (f"; skipped for safety: {skipped}" if skipped else ""))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
