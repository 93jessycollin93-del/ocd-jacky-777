"""Tiered memory on SQLite.

MEMORY_MODEL.md is the contract:

    Auto-prune junk. Preserve gold. Keep the surface area low.

Three tiers, and the difference between them is what survives time:

    ephemeral  chatter and one-offs      pruned automatically after a TTL
    durable    facts, preferences, plans kept and searchable, never auto-pruned
    gold       identity-level decisions  kept indefinitely, removable only on purpose

That last line is enforced structurally, not by good manners. `prune()` names
the one tier it is allowed to delete, so no future edit to a TTL or a filter
can quietly reach gold, and `forget()` refuses a gold record unless the caller
says so explicitly.
"""

from __future__ import annotations

import re
import sqlite3
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

EPHEMERAL = "ephemeral"
DURABLE = "durable"
GOLD = "gold"
TIERS = (EPHEMERAL, DURABLE, GOLD)

# Gold outranks durable outranks ephemeral when ranking recall results, so
# foundational context surfaces above passing chatter that shares a keyword.
TIER_WEIGHT = {EPHEMERAL: 1.0, DURABLE: 1.6, GOLD: 2.4}

SECONDS_PER_DAY = 86_400.0

SCHEMA = """
CREATE TABLE IF NOT EXISTS memories (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    tier             TEXT    NOT NULL CHECK (tier IN ('ephemeral', 'durable', 'gold')),
    content          TEXT    NOT NULL,
    kind             TEXT    NOT NULL DEFAULT 'note',
    source           TEXT,
    tags             TEXT    NOT NULL DEFAULT '',
    created_at       REAL    NOT NULL,
    last_accessed_at REAL,
    access_count     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_memories_tier    ON memories(tier);
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);
"""

_TOKEN = re.compile(r"[a-z0-9']+")

# Small and deliberate: these carry no retrieval signal but appear everywhere.
_STOPWORDS = frozenset(
    """
    a an and are as at be but by do does for from had has have how i if in is it
    its me my of on or so that the their them then there they this to was we
    were what when where which who why will with you your
    """.split()
)


def tokenize(text: str) -> list[str]:
    """Lowercase content words, stopwords and single characters dropped."""
    return [
        token
        for token in _TOKEN.findall(text.lower())
        if len(token) > 1 and token not in _STOPWORDS
    ]


@dataclass(frozen=True)
class Memory:
    """One stored record."""

    id: int
    tier: str
    content: str
    kind: str
    source: str | None
    tags: tuple[str, ...]
    created_at: float
    last_accessed_at: float | None
    access_count: int

    def age_days(self, now: float | None = None) -> float:
        return ((time.time() if now is None else now) - self.created_at) / SECONDS_PER_DAY

    def summary(self, width: int = 72) -> str:
        flat = " ".join(self.content.split())
        return flat if len(flat) <= width else flat[: width - 1] + "…"


@dataclass(frozen=True)
class ScoredMemory:
    """A recall hit and why it ranked where it did."""

    memory: Memory
    score: float
    matched: tuple[str, ...]


class GoldMemoryError(RuntimeError):
    """Raised when something tries to remove gold memory without meaning to."""


class MemoryStore:
    """Jackie's active memory. The knowledge vault is separate — see MEMORY_MODEL.md."""

    def __init__(self, db_path: Path | str, ephemeral_ttl_days: int = 7) -> None:
        self.db_path = Path(db_path)
        self.ephemeral_ttl_days = max(0, int(ephemeral_ttl_days))
        if self.db_path.parent and str(self.db_path) != ":memory:":
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(self.db_path))
        self._conn.row_factory = sqlite3.Row
        self._conn.executescript(SCHEMA)
        self._conn.commit()

    # ---------------------------------------------------------------- writing

    def remember(
        self,
        content: str,
        tier: str = EPHEMERAL,
        kind: str = "note",
        tags: Sequence[str] = (),
        source: str | None = None,
        now: float | None = None,
    ) -> Memory:
        """Store a record. Empty content is refused rather than stored as noise."""
        content = content.strip()
        if not content:
            raise ValueError("refusing to store empty memory")
        if tier not in TIERS:
            raise ValueError(f"unknown tier {tier!r}; expected one of {TIERS}")

        created = time.time() if now is None else now
        tag_text = ",".join(sorted({t.strip().lower() for t in tags if t.strip()}))
        cur = self._conn.execute(
            "INSERT INTO memories (tier, content, kind, source, tags, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (tier, content, kind, source, tag_text, created),
        )
        self._conn.commit()
        return self.get(int(cur.lastrowid))  # type: ignore[arg-type]

    def promote(self, memory_id: int, tier: str) -> Memory:
        """Move a record between tiers — how chatter becomes durable, or doctrine gold."""
        if tier not in TIERS:
            raise ValueError(f"unknown tier {tier!r}; expected one of {TIERS}")
        self._conn.execute("UPDATE memories SET tier = ? WHERE id = ?", (tier, memory_id))
        self._conn.commit()
        return self.get(memory_id)

    def forget(self, memory_id: int, allow_gold: bool = False) -> bool:
        """Delete one record.

        Gold is "preserved indefinitely unless explicitly removed", so removing
        it takes an explicit allow_gold=True. An accidental delete cannot reach it.
        """
        row = self._conn.execute(
            "SELECT tier FROM memories WHERE id = ?", (memory_id,)
        ).fetchone()
        if row is None:
            return False
        if row["tier"] == GOLD and not allow_gold:
            raise GoldMemoryError(
                f"memory {memory_id} is gold; pass allow_gold=True to remove it on purpose"
            )
        self._conn.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
        self._conn.commit()
        return True

    def prune(self, now: float | None = None) -> int:
        """Drop ephemeral records past their TTL. Returns how many were dropped.

        The WHERE clause names `ephemeral` positively rather than excluding gold.
        An allowlist cannot rot into a leak the way `tier != 'gold'` could if a
        fourth tier ever appeared.
        """
        if self.ephemeral_ttl_days <= 0:
            return 0
        cutoff = (time.time() if now is None else now) - self.ephemeral_ttl_days * SECONDS_PER_DAY
        cur = self._conn.execute(
            "DELETE FROM memories WHERE tier = ? AND created_at < ?", (EPHEMERAL, cutoff)
        )
        self._conn.commit()
        return cur.rowcount or 0

    # ---------------------------------------------------------------- reading

    def get(self, memory_id: int) -> Memory:
        row = self._conn.execute(
            "SELECT * FROM memories WHERE id = ?", (memory_id,)
        ).fetchone()
        if row is None:
            raise KeyError(f"no memory with id {memory_id}")
        return _row_to_memory(row)

    def all(self, tier: str | None = None, limit: int = 100) -> list[Memory]:
        if tier is not None and tier not in TIERS:
            raise ValueError(f"unknown tier {tier!r}; expected one of {TIERS}")
        if tier is None:
            rows = self._conn.execute(
                "SELECT * FROM memories ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
        else:
            rows = self._conn.execute(
                "SELECT * FROM memories WHERE tier = ? ORDER BY created_at DESC LIMIT ?",
                (tier, limit),
            ).fetchall()
        return [_row_to_memory(r) for r in rows]

    def recall(
        self,
        query: str,
        limit: int = 5,
        tiers: Iterable[str] | None = None,
        now: float | None = None,
    ) -> list[ScoredMemory]:
        """Rank stored memory against a query.

        Scoring is deliberately legible — term overlap, weighted by tier, nudged
        by recency. Readable beats clever here; when a recall looks wrong it
        should be obvious why.
        """
        tokens = tokenize(query)
        wanted = tuple(tiers) if tiers is not None else TIERS
        for tier in wanted:
            if tier not in TIERS:
                raise ValueError(f"unknown tier {tier!r}; expected one of {TIERS}")

        placeholders = ",".join("?" for _ in wanted)
        rows = self._conn.execute(
            f"SELECT * FROM memories WHERE tier IN ({placeholders})", tuple(wanted)
        ).fetchall()

        moment = time.time() if now is None else now
        scored: list[ScoredMemory] = []
        for row in rows:
            memory = _row_to_memory(row)
            haystack = set(tokenize(memory.content)) | set(memory.tags)
            matched = tuple(t for t in tokens if t in haystack)

            if tokens and not matched:
                continue

            # Overlap carries the ranking; tier decides ties; recency breaks the rest.
            overlap = len(matched) / len(tokens) if tokens else 0.0
            recency = 1.0 / (1.0 + memory.age_days(moment))
            base = overlap if tokens else recency
            score = (base + 0.15 * recency) * TIER_WEIGHT[memory.tier]
            scored.append(ScoredMemory(memory=memory, score=round(score, 4), matched=matched))

        scored.sort(key=lambda s: (-s.score, -s.memory.created_at))
        top = scored[:limit]
        self._touch([s.memory.id for s in top], moment)
        return top

    def counts(self) -> dict[str, int]:
        rows = self._conn.execute(
            "SELECT tier, COUNT(*) AS n FROM memories GROUP BY tier"
        ).fetchall()
        counts = {tier: 0 for tier in TIERS}
        for row in rows:
            counts[row["tier"]] = row["n"]
        return counts

    # ---------------------------------------------------------------- internal

    def _touch(self, ids: Sequence[int], now: float) -> None:
        """Record that memory was used. Access counts are how patterns earn a promotion."""
        if not ids:
            return
        self._conn.executemany(
            "UPDATE memories SET last_accessed_at = ?, access_count = access_count + 1 "
            "WHERE id = ?",
            [(now, i) for i in ids],
        )
        self._conn.commit()

    def close(self) -> None:
        self._conn.close()

    def __enter__(self) -> "MemoryStore":
        return self

    def __exit__(self, *exc_info: object) -> None:
        self.close()


def _row_to_memory(row: sqlite3.Row) -> Memory:
    raw_tags = row["tags"] or ""
    return Memory(
        id=row["id"],
        tier=row["tier"],
        content=row["content"],
        kind=row["kind"],
        source=row["source"],
        tags=tuple(t for t in raw_tags.split(",") if t),
        created_at=row["created_at"],
        last_accessed_at=row["last_accessed_at"],
        access_count=row["access_count"],
    )
