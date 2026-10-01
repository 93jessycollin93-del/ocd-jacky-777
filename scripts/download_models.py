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


def run(jobs: list[Job], mode: str, onnx_quant: str) -> None:
    api, snapshot_download, GatedRepoError, RepositoryNotFoundError, HfHubHTTPError = _hub()
    listings: dict[str, dict[str, int]] = {}
    for job in jobs:
        if job.status in ("manual", "convert"):
            continue
        try:
            if job.repo not in listings:
                info = api.model_info(job.repo, files_metadata=True)
                listings[job.repo] = {s.rfilename: (s.size or 0) for s in (info.siblings or [])}
            sizes = listings[job.repo]
            job.files = choose_files(job, list(sizes), onnx_quant)
            job.bytes = sum(sizes.get(f, 0) for f in job.files)
            if not job.files and job.fmt == "onnx" and job.repo == job.model.get("repo"):
                job.repo, job.status, job.detail = None, "convert", convert_hint("onnx", job.model)
                continue
            if not job.files:
                job.status, job.detail = "missing", f"no {job.fmt} files matched in {job.repo}"
                continue
            if mode == "check":
                job.status = "ok"
                continue
            print(f"  ↓ {job.model['id']} [{job.fmt}] {job.repo} → {job.dest} ({human(job.bytes)})", flush=True)
            job.dest.mkdir(parents=True, exist_ok=True)
            snapshot_download(job.repo, local_dir=str(job.dest), allow_patterns=[_escape_glob(f) for f in job.files])
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
            {"format": j.fmt, "repo": j.repo, "path": os.path.relpath(j.dest, out), "files": j.files, "bytes": j.bytes}
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
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--plan", action="store_true", help="offline: print the queue and destinations, touch nothing")
    mode.add_argument("--check", action="store_true", help="online: verify every repo and report real download sizes")
    args = parser.parse_args(argv)

    catalog = load_catalog(args.catalog)
    picked = select(catalog, _csv(args.phase), _csv(args.only), _csv(args.category), args.skip_flag)
    if not picked:
        print("nothing selected")
        return 0
    out = args.out.expanduser().resolve()
    formats = _csv(args.formats)
    run_mode = "plan" if args.plan else "check" if args.check else "download"

    plans = [(phase, model, plan_jobs(model, out, formats)) for phase, model in picked]
    plans = [p for p in plans if p[2]]  # --formats can leave a model with nothing to fetch
    all_jobs = [j for _, _, jobs in plans for j in jobs]

    print(f"{run_mode}: {len(plans)} model(s), {len(all_jobs)} job(s) → {out}\n")
    if run_mode != "plan":
        run(all_jobs, run_mode, args.onnx_quant)

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
    if run_mode != "plan":
        print(f"\n{'would download' if run_mode == 'check' else 'downloaded'}: {human(total)}; problems: {failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
