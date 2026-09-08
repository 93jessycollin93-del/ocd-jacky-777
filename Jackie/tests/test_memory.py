"""Memory tiering, and the guarantees MEMORY_MODEL.md makes about gold."""

import unittest

from core.memory import (
    DURABLE,
    EPHEMERAL,
    GOLD,
    SECONDS_PER_DAY,
    GoldMemoryError,
    MemoryStore,
    tokenize,
)

NOW = 1_000_000.0


class MemoryStoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.store = MemoryStore(":memory:", ephemeral_ttl_days=7)
        self.addCleanup(self.store.close)

    def test_stores_and_reads_back(self) -> None:
        record = self.store.remember("small reversible commits", tier=DURABLE, tags=("style",))
        self.assertEqual(self.store.get(record.id).content, "small reversible commits")
        self.assertEqual(record.tier, DURABLE)
        self.assertEqual(record.tags, ("style",))

    def test_refuses_empty_content(self) -> None:
        with self.assertRaises(ValueError):
            self.store.remember("   ")

    def test_rejects_unknown_tier(self) -> None:
        with self.assertRaises(ValueError):
            self.store.remember("something", tier="platinum")

    # -- pruning ---------------------------------------------------------

    def test_prune_drops_expired_ephemeral(self) -> None:
        self.store.remember("chatter", tier=EPHEMERAL, now=NOW - 30 * SECONDS_PER_DAY)
        self.assertEqual(self.store.prune(now=NOW), 1)
        self.assertEqual(self.store.counts()[EPHEMERAL], 0)

    def test_prune_keeps_fresh_ephemeral(self) -> None:
        self.store.remember("recent chatter", tier=EPHEMERAL, now=NOW - SECONDS_PER_DAY)
        self.assertEqual(self.store.prune(now=NOW), 0)

    def test_prune_never_touches_gold_or_durable(self) -> None:
        """The core promise: auto-prune junk, preserve gold."""
        old = NOW - 365 * SECONDS_PER_DAY
        self.store.remember("identity-level truth", tier=GOLD, now=old)
        self.store.remember("project direction", tier=DURABLE, now=old)
        self.store.remember("junk", tier=EPHEMERAL, now=old)

        dropped = self.store.prune(now=NOW)

        self.assertEqual(dropped, 1)
        counts = self.store.counts()
        self.assertEqual(counts[GOLD], 1, "gold must survive pruning at any age")
        self.assertEqual(counts[DURABLE], 1, "durable is not auto-pruned either")
        self.assertEqual(counts[EPHEMERAL], 0)

    def test_ttl_of_zero_disables_pruning(self) -> None:
        store = MemoryStore(":memory:", ephemeral_ttl_days=0)
        self.addCleanup(store.close)
        store.remember("ancient", tier=EPHEMERAL, now=NOW - 900 * SECONDS_PER_DAY)
        self.assertEqual(store.prune(now=NOW), 0)

    # -- gold protection -------------------------------------------------

    def test_forget_refuses_gold_without_explicit_flag(self) -> None:
        record = self.store.remember("foundational", tier=GOLD)
        with self.assertRaises(GoldMemoryError):
            self.store.forget(record.id)
        self.assertEqual(self.store.counts()[GOLD], 1)

    def test_forget_removes_gold_when_explicit(self) -> None:
        record = self.store.remember("foundational", tier=GOLD)
        self.assertTrue(self.store.forget(record.id, allow_gold=True))
        self.assertEqual(self.store.counts()[GOLD], 0)

    def test_forget_missing_id_is_false_not_an_error(self) -> None:
        self.assertFalse(self.store.forget(9999))

    def test_promote_moves_between_tiers(self) -> None:
        record = self.store.remember("recurring preference", tier=EPHEMERAL)
        promoted = self.store.promote(record.id, GOLD)
        self.assertEqual(promoted.tier, GOLD)

    # -- recall ----------------------------------------------------------

    def test_recall_matches_on_content(self) -> None:
        self.store.remember("prefers Postgres over MySQL", tier=DURABLE)
        self.store.remember("likes strong coffee", tier=DURABLE)
        hits = self.store.recall("postgres")
        self.assertEqual(len(hits), 1)
        self.assertIn("Postgres", hits[0].memory.content)

    def test_recall_ranks_gold_above_ephemeral_on_equal_match(self) -> None:
        self.store.remember("deployment policy", tier=EPHEMERAL)
        self.store.remember("deployment policy", tier=GOLD)
        hits = self.store.recall("deployment policy")
        self.assertEqual(hits[0].memory.tier, GOLD)

    def test_recall_can_filter_by_tier(self) -> None:
        self.store.remember("deployment note", tier=EPHEMERAL)
        self.store.remember("deployment rule", tier=GOLD)
        hits = self.store.recall("deployment", tiers=(GOLD,))
        self.assertEqual(len(hits), 1)
        self.assertEqual(hits[0].memory.tier, GOLD)

    def test_recall_returns_nothing_when_no_terms_match(self) -> None:
        self.store.remember("unrelated content", tier=DURABLE)
        self.assertEqual(self.store.recall("kubernetes"), [])

    def test_recall_records_access(self) -> None:
        record = self.store.remember("tracked", tier=DURABLE)
        self.store.recall("tracked")
        self.assertEqual(self.store.get(record.id).access_count, 1)

    def test_tokenize_drops_stopwords_and_single_chars(self) -> None:
        self.assertEqual(tokenize("The a of Deploy X"), ["deploy"])


if __name__ == "__main__":
    unittest.main()
