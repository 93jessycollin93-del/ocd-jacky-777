"""Offline tests for scripts/download_models.py, using a fake Hugging Face Hub.

    python -m unittest discover -s scripts -p "test_*.py"
"""

from __future__ import annotations

import contextlib
import hashlib
import importlib.util
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

SPEC = importlib.util.spec_from_file_location("download_models", Path(__file__).with_name("download_models.py"))
dm = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = dm  # dataclasses look the module up while it loads
SPEC.loader.exec_module(dm)

COMMIT = "a" * 40


class GatedRepoError(Exception):
    pass


class RepositoryNotFoundError(Exception):
    pass


class HfHubHTTPError(Exception):
    pass


def blob_sha1(data: bytes) -> str:
    return hashlib.sha1(b"blob %d\0" % len(data) + data).hexdigest()


class FakeHub:
    """repos: {repo: {filename: bytes}}; LFS-style files are the weight files."""

    def __init__(self, repos: dict[str, dict[str, bytes]], commit: str | None = COMMIT, tamper: set[str] = frozenset()):
        self.repos, self.commit, self.tamper = repos, commit, tamper
        self.downloads: list[dict] = []

    def model_info(self, repo, files_metadata=False):
        if repo not in self.repos:
            raise RepositoryNotFoundError(repo)
        siblings = []
        for name, data in self.repos[repo].items():
            lfs = SimpleNamespace(sha256=hashlib.sha256(data).hexdigest()) if name.endswith(dm.WEIGHT_SUFFIXES) else None
            siblings.append(SimpleNamespace(rfilename=name, size=len(data), blob_id=blob_sha1(data), lfs=lfs))
        return SimpleNamespace(sha=self.commit, siblings=siblings)

    def snapshot_download(self, repo, revision=None, local_dir=None, allow_patterns=None):
        self.downloads.append({"repo": repo, "revision": revision, "patterns": list(allow_patterns or [])})
        for name, data in self.repos[repo].items():
            if any(dm.fnmatch.fnmatchcase(name, p) for p in allow_patterns or []):
                target = Path(local_dir) / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data + b"evil" if name in self.tamper else data)


def catalog(models: list[dict]) -> dict:
    return {
        "version": 1,
        "updated": "2026-11-05",
        "memory_tiers": {"fast_max_millions": 100, "balanced_max_millions": 1000},
        "format_runtimes": {"safetensors": ["transformers"], "pytorch": ["transformers"], "ggml": ["whisper.cpp"]},
        "folders": ["text/llm", "audio/asr"],
        "phases": {"1": [m["id"] for m in models], "2": [], "3": []},
        "models": [{"name": m["id"], "task": "test", "priority": "normal", "params": "10M", **m} for m in models],
    }


class DownloaderSafetyTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.out = self.tmp / "models"
        self._orig_hub = dm._hub

    def tearDown(self):
        dm._hub = self._orig_hub

    def run_main(self, hub: FakeHub, models: list[dict], *args: str) -> tuple[int, str]:
        path = self.tmp / "catalog.json"
        path.write_text(json.dumps(catalog(models)))
        dm._hub = lambda: (hub, hub.snapshot_download, GatedRepoError, RepositoryNotFoundError, HfHubHTTPError)
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            code = dm.main(["--catalog", str(path), "--out", str(self.out), *args])
        return code, buf.getvalue()

    def manifest(self, folder: str, mid: str) -> dict:
        return json.loads((self.out / folder / mid / "manifest.json").read_text())

    def test_pickle_only_repo_is_skipped_unless_allowed(self):
        hub = FakeHub({"o/pkl": {"pytorch_model.bin": b"\x80\x04pickle", "config.json": b"{}"}})
        model = {"id": "pkl", "repo": "o/pkl", "folder": "text/llm", "formats": ["pytorch"]}

        code, out = self.run_main(hub, [model])
        self.assertEqual(code, 0)
        self.assertIn("skipped", out)
        self.assertIn("skipped for safety: 1", out)
        self.assertEqual(hub.downloads, [])

        code, out = self.run_main(hub, [model], "--allow-pickle")
        self.assertEqual(code, 0)
        self.assertEqual(self.manifest("text/llm", "pkl")["artifacts"][0]["files"], ["pytorch_model.bin", "config.json"])

    def test_safetensors_preferred_and_code_files_dropped(self):
        hub = FakeHub({"o/st": {
            "model.safetensors": b"weights", "pytorch_model.bin": b"\x80pickle",
            "config.json": b"{}", "modeling_custom.py": b"import os",
        }})
        model = {"id": "st", "repo": "o/st", "folder": "text/llm", "formats": ["safetensors"], "flags": ["remote-code"]}
        code, out = self.run_main(hub, [model])
        self.assertEqual(code, 0)
        self.assertIn("--allow-code", out)
        art = self.manifest("text/llm", "st")["artifacts"][0]
        self.assertEqual(sorted(art["files"]), ["config.json", "model.safetensors"])
        self.assertEqual(art["skipped_for_safety"], ["modeling_custom.py"])
        self.assertEqual(art["revision"], COMMIT)
        self.assertEqual(art["sha256"]["model.safetensors"], hashlib.sha256(b"weights").hexdigest())
        self.assertFalse((self.out / "text/llm/st/modeling_custom.py").exists())
        self.assertEqual(hub.downloads[0]["revision"], COMMIT)

        code, _ = self.run_main(hub, [model], "--allow-code")
        self.assertIn("modeling_custom.py", self.manifest("text/llm", "st")["artifacts"][0]["files"])

    def test_ggml_bin_is_not_treated_as_pickle(self):
        hub = FakeHub({"o/whisper": {"ggml-tiny.bin": b"lmgg-weights"}})
        model = {"id": "w", "repo": "o/whisper", "folder": "audio/asr", "formats": ["ggml"]}
        code, _ = self.run_main(hub, [model])
        self.assertEqual(code, 0)
        self.assertEqual(self.manifest("audio/asr", "w")["artifacts"][0]["files"], ["ggml-tiny.bin"])

    def test_tampered_file_fails_and_writes_no_manifest(self):
        hub = FakeHub({"o/st": {"model.safetensors": b"weights", "config.json": b"{}"}}, tamper={"config.json"})
        model = {"id": "st", "repo": "o/st", "folder": "text/llm", "formats": ["safetensors"]}
        code, out = self.run_main(hub, [model])
        self.assertEqual(code, 1)
        self.assertIn("fingerprint check failed", out)
        self.assertIn("config.json", out)
        self.assertFalse((self.out / "text/llm/st/manifest.json").exists())

    def test_unpinned_repo_is_refused(self):
        hub = FakeHub({"o/st": {"model.safetensors": b"weights"}}, commit=None)
        model = {"id": "st", "repo": "o/st", "folder": "text/llm", "formats": ["safetensors"]}
        code, out = self.run_main(hub, [model])
        self.assertEqual(code, 1)
        self.assertIn("did not report a commit", out)
        self.assertEqual(hub.downloads, [])

    def test_verify_detects_changes_offline(self):
        hub = FakeHub({"o/st": {"model.safetensors": b"weights", "config.json": b"{}"}})
        model = {"id": "st", "repo": "o/st", "folder": "text/llm", "formats": ["safetensors"]}
        self.run_main(hub, [model])

        dm._hub = lambda: self.fail("--verify must not go online")
        code, out = self.run_main(hub, [model], "--verify")
        self.assertEqual(code, 0, out)
        self.assertIn("2 file(s) match", out)

        (self.out / "text/llm/st/model.safetensors").write_bytes(b"swapped")
        code, out = self.run_main(hub, [model], "--verify")
        self.assertEqual(code, 1)
        self.assertIn("model.safetensors: changed since download", out)

    def test_check_mode_reports_skips_without_downloading(self):
        hub = FakeHub({"o/pkl": {"pytorch_model.bin": b"\x80pickle", "config.json": b"{}"}})
        model = {"id": "pkl", "repo": "o/pkl", "folder": "text/llm", "formats": ["pytorch"]}
        code, out = self.run_main(hub, [model], "--check")
        self.assertEqual(code, 0)
        self.assertIn("skipped for safety: 1", out)
        self.assertEqual(hub.downloads, [])


class PickleRuleTest(unittest.TestCase):
    def test_names(self):
        self.assertTrue(dm.is_pickle("yolov8n.pt", "pytorch"))
        self.assertTrue(dm.is_pickle("sub/pytorch_model-00001-of-00002.bin", "pytorch"))
        self.assertTrue(dm.is_pickle("training_args.bin", "safetensors"))
        self.assertTrue(dm.is_pickle("model.nemo", "pytorch"))
        self.assertFalse(dm.is_pickle("ggml-base.bin", "ggml"))
        self.assertFalse(dm.is_pickle("model.bin", "ctranslate2"))
        self.assertFalse(dm.is_pickle("model.safetensors", "safetensors"))


if __name__ == "__main__":
    unittest.main()
