"""The assistant layer: routing, and the behaviour BEHAVIOR_RULES.md asks for."""

import unittest

import jackie_assistant as app
from core.config import CHILL, Config
from core.memory import EPHEMERAL, GOLD


class RespondTests(unittest.TestCase):
    def setUp(self) -> None:
        self.config = Config(db_path=":memory:")
        self.ctx = app.build_context(self.config)
        self.addCleanup(self.ctx.memory.close)

    # -- routing ----------------------------------------------------------

    def test_command_input_reaches_the_command(self) -> None:
        self.assertIn("Commands:", app.respond("/help", self.ctx))

    def test_plain_input_goes_through_the_council(self) -> None:
        reply = app.respond("Explain the retry helper in the error log on line 42", self.ctx)
        self.assertTrue(reply.startswith("Jackie here"))
        self.assertIsNotNone(self.ctx.last)

    def test_unknown_command_is_answered_not_raised(self) -> None:
        self.assertIn("No command", app.respond("/nonsense", self.ctx))

    def test_empty_input_is_ignored(self) -> None:
        self.assertEqual(app.respond("   ", self.ctx), "")

    # -- memory behaviour --------------------------------------------------

    def test_exchanges_are_stored_as_ephemeral(self) -> None:
        app.respond("a passing question about the log file", self.ctx)
        self.assertEqual(self.ctx.memory.counts()[EPHEMERAL], 1)

    def test_remember_defaults_to_durable(self) -> None:
        app.respond("/remember I prefer small reversible commits", self.ctx)
        self.assertEqual(self.ctx.memory.counts()["durable"], 1)

    def test_remember_gold_flag_stores_gold(self) -> None:
        app.respond("/remember --gold Never deploy on Fridays", self.ctx)
        self.assertEqual(self.ctx.memory.counts()[GOLD], 1)

    def test_forget_refuses_gold_and_explains_how(self) -> None:
        app.respond("/remember --gold Never deploy on Fridays", self.ctx)
        record = self.ctx.memory.all(tier=GOLD)[0]
        reply = app.respond(f"/forget {record.id}", self.ctx)
        self.assertIn("--gold", reply)
        self.assertEqual(self.ctx.memory.counts()[GOLD], 1, "gold must survive the refusal")

    def test_forget_gold_works_when_explicit(self) -> None:
        app.respond("/remember --gold temporary doctrine", self.ctx)
        record = self.ctx.memory.all(tier=GOLD)[0]
        app.respond(f"/forget --gold {record.id}", self.ctx)
        self.assertEqual(self.ctx.memory.counts()[GOLD], 0)

    def test_recall_finds_a_stored_memory(self) -> None:
        app.respond("/remember I prefer Postgres over MySQL", self.ctx)
        self.assertIn("Postgres", app.respond("/recall postgres", self.ctx))

    # -- modes -------------------------------------------------------------

    def test_loud_mode_shows_the_gate_readout(self) -> None:
        reply = app.respond("Explain the retry helper in the error log on line 42", self.ctx)
        self.assertIn("coherence", reply)

    def test_chill_mode_drops_the_readout_but_keeps_the_answer(self) -> None:
        app.respond("/mode chill", self.ctx)
        reply = app.respond("Explain the retry helper in the error log on line 42", self.ctx)
        self.assertNotIn("coherence", reply)
        self.assertTrue(reply.startswith("Jackie here"))

    def test_mode_change_is_reflected_in_context(self) -> None:
        app.respond("/mode chill", self.ctx)
        self.assertEqual(self.ctx.config.mode, CHILL)

    # -- scanning ----------------------------------------------------------

    def test_scan_reports_without_echoing_the_secret(self) -> None:
        secret = "sk-live-51H9xQqRvT8mNpZ"
        reply = app.respond(f'/scan api_key = "{secret}"', self.ctx)
        self.assertIn("hardcoded-secret", reply)
        self.assertNotIn(secret, reply)

    def test_scan_of_a_missing_file_is_handled(self) -> None:
        self.assertIn("Could not read", app.respond("/scan --file /nope/missing.py", self.ctx))

    # -- trace -------------------------------------------------------------

    def test_trace_before_any_thought(self) -> None:
        self.assertIn("No thought", app.respond("/trace", self.ctx))

    def test_trace_after_a_thought_lists_the_seats(self) -> None:
        app.respond("Explain the retry helper in the error log on line 42", self.ctx)
        trace = app.respond("/trace", self.ctx)
        self.assertIn("Guardian", trace)
        self.assertIn("Historian", trace)


class QuitTests(unittest.TestCase):
    def test_quit_raises_the_signal(self) -> None:
        ctx = app.build_context(Config(db_path=":memory:"))
        self.addCleanup(ctx.memory.close)
        with self.assertRaises(app.Quit):
            app.respond("/quit", ctx)


if __name__ == "__main__":
    unittest.main()
