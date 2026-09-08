"""Command routing — a lookup table, not a condition chain."""

import unittest

from core.dispatcher import Dispatcher, UnknownCommand


class DispatcherTests(unittest.TestCase):
    def setUp(self) -> None:
        self.dispatch = Dispatcher()

        @self.dispatch.command("echo", "Say it back.", usage="/echo <text>", aliases=("e",))
        def _echo(args: str, ctx) -> str:
            return f"{ctx}:{args}"

    def test_dispatches_to_the_handler(self) -> None:
        self.assertEqual(self.dispatch.dispatch("/echo hello", "ctx"), "ctx:hello")

    def test_aliases_reach_the_same_handler(self) -> None:
        self.assertEqual(self.dispatch.dispatch("/e hi", "ctx"), "ctx:hi")

    def test_command_name_is_case_insensitive(self) -> None:
        self.assertEqual(self.dispatch.dispatch("/ECHO hi", "ctx"), "ctx:hi")

    def test_arguments_may_be_empty(self) -> None:
        self.assertEqual(self.dispatch.dispatch("/echo", "ctx"), "ctx:")

    def test_surrounding_whitespace_is_ignored(self) -> None:
        self.assertEqual(self.dispatch.dispatch("  /echo  hi  ", "ctx"), "ctx:hi")

    def test_unknown_command_raises_with_suggestions(self) -> None:
        with self.assertRaises(UnknownCommand) as caught:
            self.dispatch.dispatch("/ech oops", "ctx")
        self.assertEqual(caught.exception.name, "ech")
        self.assertIn("echo", caught.exception.suggestions)

    def test_plain_text_is_not_a_command(self) -> None:
        self.assertFalse(self.dispatch.is_command("just talking"))
        self.assertTrue(self.dispatch.is_command("/echo"))

    def test_resolving_plain_text_is_an_error(self) -> None:
        with self.assertRaises(ValueError):
            self.dispatch.resolve("just talking")

    def test_duplicate_registration_is_refused(self) -> None:
        with self.assertRaises(ValueError):
            self.dispatch.command("echo", "Clash.")(lambda args, ctx: "")

    def test_alias_clash_is_refused(self) -> None:
        with self.assertRaises(ValueError):
            self.dispatch.command("other", "Clash.", aliases=("e",))(lambda args, ctx: "")

    def test_help_lists_each_command_once(self) -> None:
        help_text = self.dispatch.help_text()
        self.assertEqual(help_text.count("/echo <text>"), 1)
        self.assertIn("also /e", help_text)


if __name__ == "__main__":
    unittest.main()
