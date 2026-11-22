"""Offline tests for scripts/model_cleanup.py on a fake home folder.

    python -m unittest discover -s scripts -p "test_*.py"
"""

from __future__ import annotations

import contextlib
import importlib.util
import io
import os
import sys
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("model_cleanup", Path(__file__).with_name("model_cleanup.py"))
mc = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = mc  # dataclasses look the module up while it loads
SPEC.loader.exec_module(mc)

GGUF = b"GGUF" + b"\x03" * 2044  # 2 KB fake model
VIDEO = b"\x00\x00\x00\x18ftypmp42" + b"v" * 4084


class CleanupTest(unittest.TestCase):
    def setUp(self):
        self.home = Path(tempfile.mkdtemp()) / "me"
        self.home.mkdir()

    def put(self, rel: str, data: bytes, age: int = 0) -> Path:
        path = self.home / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        if age:
            t = 1_700_000_000 - age
            os.utime(path, (t, t))
        return path

    def run_main(self, *args: str) -> tuple[int, str]:
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            code = mc.main(["--min-size", "1K", *args], home=self.home)
        return code, buf.getvalue()

    def test_report_only_changes_nothing(self):
        a = self.put("Downloads/model.gguf", GGUF)
        b = self.put("Desktop/copy of model.gguf", GGUF)
        code, out = self.run_main()
        self.assertEqual(code, 0)
        self.assertIn("Duplicate groups: 1", out)
        self.assertIn("Report only, nothing changed", out)
        self.assertTrue(a.exists() and b.exists())
        self.assertFalse((self.home / mc.QUARANTINE_DIR).exists())

    def test_wired_copy_is_kept_and_loose_copy_moved_then_restored(self):
        wired = self.put(".ollama/models/blobs/sha256-abc", GGUF)
        loose = self.put("Downloads/llama.gguf", GGUF)
        code, out = self.run_main("--quarantine")
        self.assertEqual(code, 0)
        self.assertTrue(wired.exists())
        self.assertFalse(loose.exists())
        stored = list((self.home / mc.QUARANTINE_DIR).rglob("llama.gguf"))
        self.assertEqual(len(stored), 1)
        self.assertEqual(stored[0].read_bytes(), GGUF)

        code, out = self.run_main("--restore")
        self.assertEqual(code, 0, out)
        self.assertEqual(loose.read_bytes(), GGUF)
        self.assertEqual(list((self.home / mc.QUARANTINE_DIR).rglob("llama.gguf")), [])

    def test_all_wired_duplicates_are_left_alone(self):
        a = self.put(".lmstudio/models/x/model.gguf", GGUF)
        b = self.put("AppData/Local/nomic.ai/GPT4All/model.gguf", GGUF)
        self.run_main("--quarantine")
        self.assertTrue(a.exists() and b.exists())

    def test_loose_copies_keep_the_oldest(self):
        old = self.put("Videos/trip.mp4", VIDEO, age=1000)
        new = self.put("Downloads/trip (1).mp4", VIDEO, age=10)
        self.run_main("--quarantine")
        self.assertTrue(old.exists())
        self.assertFalse(new.exists())

    def test_loose_models_only_move_when_asked(self):
        stray = self.put("Downloads/random.safetensors", b"x" * 2048)
        jackie = self.put("jackie-models/text/tiny/qwen3/model.safetensors", b"y" * 2048)
        hub = self.put("Desktop/SAS-Jacky-HUB/models/brain.gguf", GGUF + b"1")
        kept = self.put("Projects/mine/model.onnx", b"z" * 2048)
        code, out = self.run_main("--quarantine")
        self.assertTrue(stray.exists(), "loose models need --loose")
        code, out = self.run_main("--quarantine", "--loose", "--keep", str(self.home / "Projects"))
        self.assertFalse(stray.exists())
        self.assertTrue(jackie.exists() and hub.exists() and kept.exists())

    def test_ignores_small_files_hard_links_and_symlinks(self):
        self.put("Downloads/small.gguf", b"GGUF")
        a = self.put("Downloads/big.gguf", GGUF)
        os.link(a, self.home / "Desktop-link.gguf")
        try:
            os.symlink(a, self.home / "Documents-symlink.gguf")
        except (OSError, NotImplementedError):
            pass
        code, out = self.run_main()
        self.assertIn("Duplicate groups: 0", out)
        self.assertNotIn("small.gguf", out)

    def test_same_size_different_content_is_not_a_duplicate(self):
        self.put("Downloads/a.bin", GGUF)
        self.put("Desktop/b.bin", b"GGUF" + b"\x04" * 2044)
        code, out = self.run_main()
        self.assertIn("Duplicate groups: 0", out)
        self.assertIn("AI model files outside any app folder: 2", out)

    def test_second_run_never_pairs_a_file_with_its_quarantined_twin(self):
        self.put(".ollama/models/blobs/sha256-abc", GGUF)
        self.put("Downloads/llama.gguf", GGUF)
        self.run_main("--quarantine")
        again = self.put("Desktop/llama again.gguf", GGUF)
        code, out = self.run_main("--quarantine")
        self.assertNotIn(mc.QUARANTINE_DIR, out.split("Duplicate groups")[1].split("AI model files")[0])
        self.assertFalse(again.exists())  # paired with the wired Ollama copy, not the quarantined one
        self.assertTrue((self.home / ".ollama/models/blobs/sha256-abc").exists())

    def test_restore_never_overwrites(self):
        loose = self.put("Downloads/llama.gguf", GGUF)
        self.put(".ollama/models/blobs/sha256-abc", GGUF)
        self.run_main("--quarantine")
        loose.write_bytes(b"new file the user made later")
        code, out = self.run_main("--restore")
        self.assertEqual(code, 1)
        self.assertEqual(loose.read_bytes(), b"new file the user made later")
        self.assertEqual(len(list((self.home / mc.QUARANTINE_DIR).rglob("llama.gguf"))), 1)


class DetectionTest(unittest.TestCase):
    def test_model_sniffing(self):
        tmp = Path(tempfile.mkdtemp())
        cases = {"m.gguf": b"anything", "w.bin": b"GGUF....", "pickle.bin": b"\x80\x04\x95....",
                 "blob": b"GGUF\x03\x00", "video.mp4": b"\x00\x00\x00\x18ftyp", "notes.bin": b"hello wo"}
        result = {}
        for name, data in cases.items():
            (tmp / name).write_bytes(data)
            result[name] = mc.looks_like_model(tmp / name)
        self.assertEqual(result, {"m.gguf": True, "w.bin": True, "pickle.bin": True, "blob": True,
                                  "video.mp4": False, "notes.bin": False})

    def test_sizes(self):
        self.assertEqual(mc.parse_size("1G"), 1024 ** 3)
        self.assertEqual(mc.parse_size("500MB"), 500 * 1024 ** 2)
        self.assertEqual(mc.parse_size("2048"), 2048)
        with self.assertRaises(mc.argparse.ArgumentTypeError):
            mc.parse_size("big")


if __name__ == "__main__":
    unittest.main()
