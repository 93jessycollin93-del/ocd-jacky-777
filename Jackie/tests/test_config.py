"""Configuration resolves from the environment and never crashes on bad input."""

import unittest

from core.config import CHILL, LOUD, Config


class ConfigTests(unittest.TestCase):
    def test_defaults_match_doctrine(self) -> None:
        config = Config.load(env={})
        self.assertEqual(config.gate_threshold, 0.70)
        self.assertEqual(config.max_loops, 3)
        self.assertEqual(config.mode, LOUD)

    def test_reads_values_from_the_environment(self) -> None:
        config = Config.load(env={"JACKIE_MODE": "chill", "JACKIE_MAX_LOOPS": "5"})
        self.assertEqual(config.mode, CHILL)
        self.assertEqual(config.max_loops, 5)

    def test_unparseable_value_falls_back_and_is_reported(self) -> None:
        config = Config.load(env={"JACKIE_MAX_LOOPS": "lots"})
        self.assertEqual(config.max_loops, 3)
        self.assertTrue(any("MAX_LOOPS" in note for note in config.notes))

    def test_out_of_range_threshold_falls_back(self) -> None:
        config = Config.load(env={"JACKIE_GATE_THRESHOLD": "9.5"})
        self.assertEqual(config.gate_threshold, 0.70)
        self.assertTrue(config.notes)

    def test_unknown_mode_falls_back_to_loud(self) -> None:
        config = Config.load(env={"JACKIE_MODE": "shouty"})
        self.assertEqual(config.mode, LOUD)

    def test_negative_ttl_is_clamped(self) -> None:
        self.assertEqual(Config.load(env={"JACKIE_EPHEMERAL_TTL_DAYS": "-3"}).ephemeral_ttl_days, 0)

    def test_loop_ceiling_below_one_is_clamped(self) -> None:
        self.assertEqual(Config.load(env={"JACKIE_MAX_LOOPS": "0"}).max_loops, 1)

    def test_with_mode_returns_a_copy(self) -> None:
        config = Config.load(env={})
        chill = config.with_mode(CHILL)
        self.assertTrue(chill.is_chill)
        self.assertFalse(config.is_chill, "the original must be unchanged")

    def test_with_mode_refuses_unknown_modes(self) -> None:
        with self.assertRaises(ValueError):
            Config.load(env={}).with_mode("shouty")


if __name__ == "__main__":
    unittest.main()
