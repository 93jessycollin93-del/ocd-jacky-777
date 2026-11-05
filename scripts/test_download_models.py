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

    collections: dict = {}

    def run_main(self, hub: FakeHub, models: list[dict], *args: str) -> tuple[int, str]:
        path = self.tmp / "catalog.json"
        path.write_text(json.dumps({**catalog(models), "collections": self.collections}))
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

    def test_catalog_vouched_raw_bin_is_kept(self):
        hub = FakeHub({"o/tts": {"onnx/model.onnx": b"graph", "voices/af.bin": b"\x80floats", "other.bin": b"\x80pickle"}})
        model = {"id": "tts", "repo": "o/tts", "folder": "audio/asr", "formats": ["onnx"],
                 "include": ["onnx/model.onnx", "voices/*.bin", "other.bin"], "raw_bin": ["voices/*.bin"]}
        code, _ = self.run_main(hub, [model])
        self.assertEqual(code, 0)
        art = self.manifest("audio/asr", "tts")["artifacts"][0]
        self.assertEqual(sorted(art["files"]), ["onnx/model.onnx", "voices/af.bin"])
        self.assertEqual(art["skipped_for_safety"], ["other.bin"])

    def test_collection_selects_only_its_models(self):
        hub = FakeHub({"o/a": {"model.safetensors": b"a"}, "o/b": {"model.safetensors": b"b"}})
        models = [{"id": "a", "repo": "o/a", "folder": "text/llm", "formats": ["safetensors"]},
                  {"id": "b", "repo": "o/b", "folder": "text/llm", "formats": ["safetensors"]}]
        self.collections = {"best": {"label": "Best", "blurb": "", "models": ["b"]}}
        code, out = self.run_main(hub, models, "--collection", "best")
        self.assertEqual(code, 0)
        self.assertEqual([d["repo"] for d in hub.downloads], ["o/b"])
        with self.assertRaises(SystemExit):
            self.run_main(hub, models, "--collection", "nope")

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


class FakeResponse:
    def __init__(self, data: bytes, status: int = 200, drop_after: int | None = None):
        self.data, self.status, self.drop_after, self.pos = data, status, drop_after, 0

    def read(self, n: int) -> bytes:
        if self.drop_after is not None and self.pos >= self.drop_after:
            raise ConnectionResetError("wifi dropped")
        chunk = self.data[self.pos:self.pos + n]
        self.pos += len(chunk)
        return chunk

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class FakeOpener:
    """Serves files by URL, honours Range, and can drop the connection once per URL."""

    def __init__(self, files: dict[str, bytes], drop_once_after: int | None = None):
        self.files, self.drop_once_after, self.requests, self.dropped = files, drop_once_after, [], set()

    def open(self, req, timeout=None):
        self.requests.append(req)
        url = req.full_url
        if url not in self.files:
            raise dm.urllib.error.HTTPError(url, 404, "Not Found", {}, None)
        data = self.files[url]
        rng = req.get_header("Range")
        start = int(rng.split("=")[1].rstrip("-")) if rng else 0
        drop = None
        if self.drop_once_after is not None and url not in self.dropped:
            self.dropped.add(url)
            drop = self.drop_once_after
        return FakeResponse(data[start:], 206 if rng else 200, drop)


class FakeTime:
    def __init__(self):
        self.now, self.sleeps = 0.0, []

    def clock(self) -> float:
        return self.now

    def sleep(self, seconds: float) -> None:
        self.sleeps.append(seconds)
        self.now += seconds


def url(repo: str, name: str) -> str:
    return f"https://huggingface.co/{repo}/resolve/{COMMIT}/{name}"


def sibling(name: str, data: bytes):
    return SimpleNamespace(rfilename=name, size=len(data), blob_id=blob_sha1(data),
                           lfs=SimpleNamespace(sha256=hashlib.sha256(data).hexdigest()))


class SteadyFetcherTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.time = FakeTime()

    def fetcher(self, opener, **kw):
        return dm.SteadyFetcher(opener=opener, sleep=self.time.sleep, clock=self.time.clock, **kw)

    def quiet(self, fn, *args):
        with contextlib.redirect_stdout(io.StringIO()) as buf:
            fn(*args)
        return buf.getvalue()

    def test_speed_cap_spreads_the_download_out(self):
        data = b"x" * (256 * 1024)
        f = self.fetcher(FakeOpener({url("o/m", "w.safetensors"): data}), max_rate=64 * 1024)
        self.quiet(f, "o/m", COMMIT, self.tmp, ["w.safetensors"], {"w.safetensors": sibling("w.safetensors", data)})
        self.assertEqual((self.tmp / "w.safetensors").read_bytes(), data)
        self.assertAlmostEqual(sum(self.time.sleeps), 4.0)  # 256 KB at 64 KB/s

    def test_resumes_after_a_drop_from_the_last_byte(self):
        data = bytes(range(256)) * 1024  # 256 KB
        opener = FakeOpener({url("o/m", "w.safetensors"): data}, drop_once_after=128 * 1024)
        f = self.fetcher(opener)
        out = self.quiet(f, "o/m", COMMIT, self.tmp, ["w.safetensors"], {"w.safetensors": sibling("w.safetensors", data)})
        self.assertEqual((self.tmp / "w.safetensors").read_bytes(), data)
        self.assertFalse((self.tmp / "w.safetensors.part").exists())
        self.assertEqual([r.get_header("Range") for r in opener.requests], [None, f"bytes={128 * 1024}-"])
        self.assertEqual(self.time.sleeps, [5])
        self.assertIn("resuming in 5s", out)

    def test_backoff_grows_and_caps(self):
        f = self.fetcher(FakeOpener({}))
        self.assertEqual([f.backoff(n) for n in (1, 2, 3, 7, 20)], [5, 10, 20, 300, 300])

    def test_skips_a_file_that_already_matches(self):
        data = b"weights"
        (self.tmp / "w.safetensors").write_bytes(data)
        opener = FakeOpener({})
        out = self.quiet(self.fetcher(opener), "o/m", COMMIT, self.tmp, ["w.safetensors"],
                         {"w.safetensors": sibling("w.safetensors", data)})
        self.assertEqual(opener.requests, [])
        self.assertIn("have w.safetensors already", out)

    def test_missing_file_and_login_errors_stop_that_file(self):
        f = self.fetcher(FakeOpener({}))
        with self.assertRaises(dm.urllib.error.HTTPError):
            self.quiet(f, "o/m", COMMIT, self.tmp, ["nope.json"], {"nope.json": sibling("nope.json", b"{}")})

        class Denied(FakeOpener):
            def open(self, req, timeout=None):
                raise dm.urllib.error.HTTPError(req.full_url, 401, "Unauthorized", {}, None)

        with self.assertRaisesRegex(RuntimeError, "hf auth login"):
            self.quiet(self.fetcher(Denied({})), "o/m", COMMIT, self.tmp, ["a.json"], {"a.json": sibling("a.json", b"{}")})

    def test_token_never_follows_a_redirect_to_another_host(self):
        f = self.fetcher(FakeOpener({}), token="hf_secret")
        handler = dm._AuthRedirect("hf_secret", "huggingface.co")
        req = dm.urllib.request.Request("https://huggingface.co/o/m/resolve/x/w.safetensors")
        req.add_unredirected_header("Authorization", "Bearer hf_secret")
        req.add_header("Range", "bytes=10-")
        cdn = handler.redirect_request(req, None, 302, "Found", {}, "https://cdn-lfs.hf.co/signed")
        self.assertIsNone(cdn.get_header("Authorization"))
        self.assertEqual(cdn.get_header("Range"), "bytes=10-")
        same = handler.redirect_request(req, None, 307, "Temporary Redirect", {}, "https://huggingface.co/api/resolve-cache/x")
        self.assertEqual(same.get_header("Authorization"), "Bearer hf_secret")
        self.assertEqual(f.host, "huggingface.co")

    def test_steady_run_downloads_smallest_first_and_verifies(self):
        big, small = b"B" * 5000, b"s" * 10
        hub = FakeHub({"o/big": {"model.safetensors": big}, "o/small": {"model.safetensors": small}})
        opener = FakeOpener({url("o/big", "model.safetensors"): big, url("o/small", "model.safetensors"): small})
        orig = dm._hub
        dm._hub = lambda: (hub, hub.snapshot_download, GatedRepoError, RepositoryNotFoundError, HfHubHTTPError)
        try:
            jobs = [j for mid in ("big", "small") for j in dm.plan_jobs(
                {"id": mid, "repo": f"o/{mid}", "folder": "text/llm", "formats": ["safetensors"]}, self.tmp, None)]
            self.quiet(dm.run, jobs, "download", "fp32", False, False, self.fetcher(opener), True)
        finally:
            dm._hub = orig
        self.assertEqual([j.status for j in jobs], ["downloaded", "downloaded"])
        self.assertEqual([r.full_url for r in opener.requests], [url("o/small", "model.safetensors"), url("o/big", "model.safetensors")])
        self.assertEqual(hub.downloads, [], "steady mode must not use snapshot_download")


class RateTest(unittest.TestCase):
    def test_parse(self):
        self.assertEqual(dm.parse_rate("300K"), 300 * 1024)
        self.assertEqual(dm.parse_rate("1M"), 1024 ** 2)
        self.assertEqual(dm.parse_rate("2mb"), 2 * 1024 ** 2)
        self.assertEqual(dm.parse_rate("1.5M/s"), int(1.5 * 1024 ** 2))
        self.assertEqual(dm.parse_rate("4096"), 4096)
        for bad in ("0", "fast", "-1M"):
            with self.assertRaises(dm.argparse.ArgumentTypeError):
                dm.parse_rate(bad)


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
