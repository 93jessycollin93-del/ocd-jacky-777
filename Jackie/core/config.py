"""Runtime configuration.

Everything Jackie needs to start is resolved here, once, from environment
variables over local-first defaults. No other module reads os.environ. That
keeps her behaviour auditable rather than magic, which is what
SECURITY_PRINCIPLES.md means by "avoid hidden magic".

Bad values never crash the assistant: they fall back to the default and are
reported, per ARCHITECTURE.md's "graceful fallback behavior".
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

ENV_PREFIX = "JACKIE_"

# Jackie/ — the folder holding this package, which is also the vault root.
JACKIE_HOME = Path(__file__).resolve().parent.parent

# Conversation modes, per BEHAVIOR_RULES.md. Loud is the default: active
# co-pilot. Chill trims verbosity without trimming honesty.
LOUD = "loud"
CHILL = "chill"
MODES = (LOUD, CHILL)


@dataclass(frozen=True)
class Config:
    """Resolved settings. Frozen — runtime changes go through `with_mode`."""

    home: Path = JACKIE_HOME
    db_path: Path = JACKIE_HOME / "memory" / "jackie.db"
    vault_path: Path = JACKIE_HOME / "knowledge"
    mode: str = LOUD

    # Resonance loop. These two are doctrine, not taste: RESONANCE_MODEL.md
    # fixes the gate bar and the three-loop ceiling.
    gate_threshold: float = 0.70
    max_loops: int = 3

    # Memory. Ephemeral content ages out; durable and gold never do.
    ephemeral_ttl_days: int = 7
    recall_limit: int = 5

    notes: tuple[str, ...] = field(default_factory=tuple)

    @property
    def is_chill(self) -> bool:
        return self.mode == CHILL

    def with_mode(self, mode: str) -> "Config":
        """Return a copy in the given mode. Unknown modes are refused."""
        if mode not in MODES:
            raise ValueError(f"unknown mode {mode!r}; expected one of {MODES}")
        return Config(
            home=self.home,
            db_path=self.db_path,
            vault_path=self.vault_path,
            mode=mode,
            gate_threshold=self.gate_threshold,
            max_loops=self.max_loops,
            ephemeral_ttl_days=self.ephemeral_ttl_days,
            recall_limit=self.recall_limit,
            notes=self.notes,
        )

    @classmethod
    def load(cls, env: dict[str, str] | None = None) -> "Config":
        """Build config from the environment, falling back on every bad value."""
        env = os.environ if env is None else env
        notes: list[str] = []

        def _read(name: str, default, cast):
            raw = env.get(ENV_PREFIX + name)
            if raw is None or raw == "":
                return default
            try:
                return cast(raw)
            except (ValueError, TypeError):
                notes.append(
                    f"{ENV_PREFIX}{name}={raw!r} is not valid; using {default!r}"
                )
                return default

        defaults = cls()

        home = _read("HOME_DIR", defaults.home, lambda v: Path(v).expanduser())
        db_path = _read("DB_PATH", home / "memory" / "jackie.db", lambda v: Path(v).expanduser())
        vault_path = _read("VAULT_PATH", home / "knowledge", lambda v: Path(v).expanduser())

        mode = _read("MODE", defaults.mode, lambda v: str(v).strip().lower())
        if mode not in MODES:
            notes.append(f"{ENV_PREFIX}MODE={mode!r} is not a mode; using {defaults.mode!r}")
            mode = defaults.mode

        threshold = _read("GATE_THRESHOLD", defaults.gate_threshold, float)
        if not 0.0 < threshold <= 1.0:
            notes.append(
                f"{ENV_PREFIX}GATE_THRESHOLD={threshold!r} is outside (0, 1]; "
                f"using {defaults.gate_threshold!r}"
            )
            threshold = defaults.gate_threshold

        max_loops = _read("MAX_LOOPS", defaults.max_loops, int)
        if max_loops < 1:
            notes.append(f"{ENV_PREFIX}MAX_LOOPS={max_loops!r} is below 1; using 1")
            max_loops = 1

        ttl = _read("EPHEMERAL_TTL_DAYS", defaults.ephemeral_ttl_days, int)
        if ttl < 0:
            notes.append(f"{ENV_PREFIX}EPHEMERAL_TTL_DAYS={ttl!r} is negative; using 0")
            ttl = 0

        recall_limit = _read("RECALL_LIMIT", defaults.recall_limit, int)
        if recall_limit < 1:
            notes.append(f"{ENV_PREFIX}RECALL_LIMIT={recall_limit!r} is below 1; using 1")
            recall_limit = 1

        return cls(
            home=home,
            db_path=db_path,
            vault_path=vault_path,
            mode=mode,
            gate_threshold=threshold,
            max_loops=max_loops,
            ephemeral_ttl_days=ttl,
            recall_limit=recall_limit,
            notes=tuple(notes),
        )
