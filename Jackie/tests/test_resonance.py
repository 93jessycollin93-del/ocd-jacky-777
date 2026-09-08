"""The Resonance Loop must behave the way RESONANCE_MODEL.md says it does.

These are the doctrine tests. If one of them fails, the loop has drifted from
the document, and the document is the contract.
"""

import unittest

from core.memory import GOLD, MemoryStore
from core.resonance import (
    DISSENT_WEIGHT,
    FACT,
    UNKNOWN,
    Claim,
    Council,
    Seat,
    Verdict,
    evaluate,
)

SAFE = "Explain how the retry helper works in the error log on line 42"
RISKY = "Delete the old migration files in production"
SEVERE = "rm -rf / on the prod box to free space"


class DoctrinePathTests(unittest.TestCase):
    """The three paths named in the model."""

    def setUp(self) -> None:
        self.council = Council(threshold=0.70, max_loops=3)

    def test_safe_thought_resonates_on_the_first_loop(self) -> None:
        thought = self.council.think(SAFE)
        self.assertTrue(thought.resonated)
        self.assertEqual(thought.loops, 1)

    def test_risky_thought_reloops_then_resonates(self) -> None:
        """Coherence fails, the Guardian folds in a rail, the thought resonates."""
        thought = self.council.think(RISKY)
        self.assertTrue(thought.resonated)
        self.assertEqual(thought.loops, 2)

    def test_severe_thought_ends_in_honest_non_resonance(self) -> None:
        thought = self.council.think(SEVERE)
        self.assertFalse(thought.resonated)
        self.assertEqual(thought.loops, 3, "must exhaust the loop ceiling before giving up")
        self.assertTrue(thought.tensions, "non-resonance must name what is unresolved")

    def test_non_resonance_says_so_plainly(self) -> None:
        """Failing honestly is a passing state; pretending is the failing one."""
        answer = self.council.think(SEVERE).answer.lower()
        self.assertIn("could not bring this to resonance", answer)
        self.assertNotIn("here's how to", answer)

    def test_never_exceeds_the_loop_ceiling(self) -> None:
        for max_loops in (1, 2, 3, 5):
            with self.subTest(max_loops=max_loops):
                council = Council(threshold=0.70, max_loops=max_loops)
                self.assertLessEqual(council.think(SEVERE).loops, max_loops)

    def test_empty_prompt_is_refused(self) -> None:
        with self.assertRaises(ValueError):
            self.council.think("   ")


class CouncilShapeTests(unittest.TestCase):
    def test_eleven_seats_are_present(self) -> None:
        council = Council()
        self.assertEqual(len(council.seats), 11)

    def test_every_doctrine_seat_is_seated(self) -> None:
        expected = {
            "Strategist", "Guardian", "Builder", "Muse", "Skeptic", "Grounder",
            "Empath", "Historian", "Simplifier", "Scout", "Harmonizer",
        }
        self.assertEqual({seat.name for seat in Council().seats}, expected)

    def test_jackie_is_the_only_voice(self) -> None:
        """Seats inform the answer; they never address the user directly."""
        thought = Council().think(SAFE)
        self.assertTrue(thought.answer.startswith("Jackie here"))


class RelooopTargetingTests(unittest.TestCase):
    """A reloop re-queries only the dissonant seats, never the whole council."""

    def test_only_dissonant_seats_are_requeried(self) -> None:
        calls: dict[str, int] = {}

        def make(name: str, dissents: bool) -> Seat:
            def think(prompt, recalled, tensions):
                calls[name] = calls.get(name, 0) + 1
                return Verdict(
                    seat=name,
                    position="…",
                    confidence=0.9,
                    claims=(Claim("anchored", FACT, name), Claim("gap", UNKNOWN, name)),
                    dissents=dissents,
                    holds=dissents,
                )
            return Seat(name, "lens", "serves", think)

        council = Council(seats=(make("Agreeable", False), make("Objector", True)), max_loops=3)
        council.think("something")

        self.assertEqual(calls["Objector"], 3, "the dissenting seat is re-queried each loop")
        self.assertEqual(calls["Agreeable"], 1, "an agreeing seat is asked exactly once")


class GateTests(unittest.TestCase):
    def _verdict(self, **kwargs) -> Verdict:
        base = dict(
            seat="Seat",
            position="…",
            confidence=0.6,
            claims=(Claim("grounded", FACT, "Seat"), Claim("gap", UNKNOWN, "Seat")),
        )
        base.update(kwargs)
        return Verdict(**base)

    def test_agreement_passes_coherence(self) -> None:
        gates = evaluate([self._verdict(), self._verdict()], 0.70)
        self.assertTrue(gates.coherence.passed)
        self.assertEqual(gates.coherence.score, 1.0)

    def test_one_confident_dissenter_fails_coherence(self) -> None:
        """A firm objection is not outvoted by mild agreement."""
        crowd = [self._verdict(seat=f"Seat{i}", confidence=0.6) for i in range(10)]
        crowd.append(self._verdict(seat="Guardian", confidence=0.95, dissents=True))

        gates = evaluate(crowd, 0.70)

        self.assertFalse(gates.coherence.passed)
        self.assertIn("Guardian", gates.coherence.dissonant)

    def test_dissent_weight_is_the_documented_multiplier(self) -> None:
        self.assertEqual(DISSENT_WEIGHT, 2.5)

    def test_gravity_rewards_facts_over_bare_inference(self) -> None:
        grounded = evaluate([self._verdict(claims=(Claim("measured", FACT, "S"),))], 0.70)
        floating = evaluate(
            [self._verdict(claims=(Claim("reasoned", "inference", "S"),))], 0.70
        )
        self.assertGreater(grounded.gravity.score, floating.gravity.score)

    def test_gravity_fails_when_nothing_is_claimed(self) -> None:
        gates = evaluate([self._verdict(claims=())], 0.70)
        self.assertFalse(gates.gravity.passed)

    def test_humility_fails_on_confident_certainty_with_no_unknowns(self) -> None:
        certain = [
            self._verdict(seat=f"S{i}", confidence=0.95, claims=(Claim("fact", FACT, "S"),))
            for i in range(3)
        ]
        self.assertFalse(evaluate(certain, 0.70).humility.passed)

    def test_humility_passes_when_unknowns_are_named(self) -> None:
        self.assertTrue(evaluate([self._verdict()], 0.70).humility.passed)


class GoldMemoryTests(unittest.TestCase):
    """Gold memory is never contradicted silently."""

    def setUp(self) -> None:
        self.memory = MemoryStore(":memory:")
        self.addCleanup(self.memory.close)
        self.memory.remember("Never deploy on Fridays", tier=GOLD)
        self.council = Council(memory=self.memory, threshold=0.70, max_loops=3)

    def test_conflict_with_gold_blocks_resonance(self) -> None:
        thought = self.council.think("Lets deploy the release on Friday")
        self.assertFalse(thought.resonated)

    def test_conflict_is_named_in_the_answer(self) -> None:
        thought = self.council.think("Lets deploy the release on Friday")
        self.assertIn("Never deploy on Fridays", thought.answer)

    def test_historian_is_the_dissenting_seat(self) -> None:
        thought = self.council.think("Lets deploy the release on Friday")
        historian = next(v for v in thought.verdicts if v.seat == "Historian")
        self.assertTrue(historian.dissents)

    def test_unrelated_request_is_unaffected_by_gold(self) -> None:
        thought = self.council.think("Explain the retry helper in the error log on line 42")
        self.assertTrue(thought.resonated)


class TraceTests(unittest.TestCase):
    def test_trace_records_each_stage(self) -> None:
        thought = Council().think(SAFE)
        stages = [event.stage for event in thought.trace]
        self.assertEqual(stages[0], "open")
        self.assertIn("fan-out", stages)
        self.assertIn("gates", stages)
        self.assertEqual(stages[-1], "speak")

    def test_trace_records_every_loop_of_a_reloop(self) -> None:
        thought = Council(max_loops=3).think(SEVERE)
        self.assertIn("reloop", [event.stage for event in thought.trace])


if __name__ == "__main__":
    unittest.main()
