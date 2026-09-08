#!/usr/bin/env python3
"""Jackie — local CLI assistant.

Phase 2 and 3 of ROADMAP.md: the assistant engine, CLI mode, config handling,
memory store, command dispatcher and security scanning, on SQLite with tiered
memory underneath.

Every plain message goes through the Resonance Loop before she answers. She
runs offline: no network, no model, no key. The council's default seats are
local heuristics, and the seat interface is a plain callable so a model-backed
thinker can replace them later without touching the loop.

    python3 jackie_assistant.py                 # interactive
    python3 jackie_assistant.py "a question"    # one shot
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path

# Run correctly whether invoked as a script from any directory or imported.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from core import security
from core.config import CHILL, MODES, Config
from core.dispatcher import Dispatcher, UnknownCommand
from core.memory import DURABLE, EPHEMERAL, GOLD, TIERS, GoldMemoryError, MemoryStore
from core.resonance import Council, Thought


class Quit(Exception):
    """Raised by /quit to unwind the REPL cleanly."""


@dataclass
class Context:
    config: Config
    memory: MemoryStore
    council: Council
    last: Thought | None = None


dispatch = Dispatcher()


# ------------------------------------------------------------------ commands

@dispatch.command("help", "What I can do.", aliases=("h", "?"))
def _help(args: str, ctx: Context) -> str:
    return "Commands:\n" + dispatch.help_text() + "\n\nAnything else you type goes through the council."


@dispatch.command(
    "remember",
    "Store something. Defaults to durable.",
    usage="/remember [--gold] <text>",
)
def _remember(args: str, ctx: Context) -> str:
    tier = DURABLE
    text = args.strip()
    for flag, value in (("--gold", GOLD), ("--durable", DURABLE), ("--ephemeral", EPHEMERAL)):
        if text.startswith(flag):
            tier, text = value, text[len(flag):].strip()
            break

    if not text:
        return "Nothing to remember. Give me the content after the command."

    record = ctx.memory.remember(text, tier=tier, kind="stated")
    if tier == GOLD:
        return f"Held as gold (#{record.id}). I will not prune this, and I will not contradict it quietly."
    return f"Stored as {tier} (#{record.id})."


@dispatch.command("recall", "Search memory.", usage="/recall <query>")
def _recall(args: str, ctx: Context) -> str:
    if not args.strip():
        return "Give me something to search for."

    hits = ctx.memory.recall(args, limit=ctx.config.recall_limit)
    if not hits:
        return "Nothing in memory matches that."

    lines = [f"{len(hits)} hit(s):"]
    for hit in hits:
        lines.append(f"  #{hit.memory.id} [{hit.memory.tier}] {hit.memory.summary()}  ({hit.score:.2f})")
    return "\n".join(lines)


@dispatch.command("memories", "List stored memory.", usage="/memories [tier]")
def _memories(args: str, ctx: Context) -> str:
    tier = args.strip().lower() or None
    if tier is not None and tier not in TIERS:
        return f"Unknown tier {tier!r}. Pick one of: {', '.join(TIERS)}."

    records = ctx.memory.all(tier=tier, limit=20)
    if not records:
        return "Nothing stored yet." if tier is None else f"Nothing in {tier}."

    return "\n".join(f"  #{r.id} [{r.tier}] {r.summary()}" for r in records)


@dispatch.command("forget", "Delete a memory by id.", usage="/forget [--gold] <id>")
def _forget(args: str, ctx: Context) -> str:
    text = args.strip()
    allow_gold = text.startswith("--gold")
    if allow_gold:
        text = text[len("--gold"):].strip()

    if not text.isdigit():
        return "I need a numeric memory id. Use /memories to find it."

    try:
        removed = ctx.memory.forget(int(text), allow_gold=allow_gold)
    except GoldMemoryError:
        return (
            f"#{text} is gold memory. If you genuinely want it gone, say "
            f"/forget --gold {text} — I am not deleting that on a plain command."
        )
    return f"Forgot #{text}." if removed else f"No memory #{text}."


@dispatch.command("prune", "Drop expired ephemeral memory.")
def _prune(args: str, ctx: Context) -> str:
    dropped = ctx.memory.prune()
    if not dropped:
        return "Nothing was old enough to prune. Durable and gold are never touched regardless."
    return f"Pruned {dropped} ephemeral record(s). Durable and gold untouched."


@dispatch.command("scan", "Scan text or a file for risk.", usage="/scan [--file <path>] <text>")
def _scan(args: str, ctx: Context) -> str:
    text = args.strip()
    if not text:
        return "Give me text to scan, or /scan --file <path>."

    if text.startswith("--file"):
        raw = text[len("--file"):].strip()
        if not raw:
            return "Which file?"
        path = Path(raw).expanduser()
        try:
            findings = security.scan_file(path)
        except OSError as exc:
            return f"Could not read {path}: {exc.strerror or exc}."
        return security.render(findings, subject=str(path))

    return security.render(security.scan_text(text), subject="that text")


@dispatch.command("mode", "Show or set loud/chill.", usage="/mode [loud|chill]")
def _mode(args: str, ctx: Context) -> str:
    wanted = args.strip().lower()
    if not wanted:
        return f"Mode is {ctx.config.mode}."
    if wanted not in MODES:
        return f"Modes are: {', '.join(MODES)}."

    ctx.config = ctx.config.with_mode(wanted)
    return (
        "Chill. Shorter answers, fewer unprompted suggestions — same honesty."
        if wanted == CHILL
        else "Loud. Back to active co-pilot: I will flag risks and better routes as I see them."
    )


@dispatch.command("trace", "Show how the last answer was reached.")
def _trace(args: str, ctx: Context) -> str:
    if ctx.last is None:
        return "No thought to trace yet."

    thought = ctx.last
    lines = [f"Loops: {thought.loops} · {'resonated' if thought.resonated else 'honest non-resonance'}"]
    for event in thought.trace:
        lines.append(f"  [loop {event.loop}] {event.stage}: {event.detail}")
    lines.append("")
    lines.append("Seats:")
    for verdict in thought.verdicts:
        mark = "✗" if verdict.dissents else "·"
        lines.append(f"  {mark} {verdict.seat:<12} ({verdict.confidence:.2f}) {verdict.position}")
    return "\n".join(lines)


@dispatch.command("stats", "Memory and configuration at a glance.")
def _stats(args: str, ctx: Context) -> str:
    counts = ctx.memory.counts()
    return (
        f"Memory   ephemeral {counts[EPHEMERAL]} · durable {counts[DURABLE]} · gold {counts[GOLD]}\n"
        f"Database {ctx.config.db_path}\n"
        f"Gates    threshold {ctx.config.gate_threshold:.2f} · max {ctx.config.max_loops} loops\n"
        f"Mode     {ctx.config.mode} · ephemeral TTL {ctx.config.ephemeral_ttl_days}d"
    )


@dispatch.command("quit", "End the session.", aliases=("exit", "q"))
def _quit(args: str, ctx: Context) -> str:
    raise Quit


# --------------------------------------------------------------------- engine

def respond(text: str, ctx: Context) -> str:
    """Route one line of input: a command, or a thought through the council."""
    text = text.strip()
    if not text:
        return ""

    if dispatch.is_command(text):
        try:
            return dispatch.dispatch(text, ctx)
        except UnknownCommand as unknown:
            hint = f" Did you mean {', '.join('/' + s for s in unknown.suggestions)}?" if unknown.suggestions else ""
            return f"No command /{unknown.name}.{hint} Try /help."

    thought = ctx.council.think(text)
    ctx.last = thought

    # The exchange itself is ephemeral by default — it ages out unless it
    # earns a promotion. Auto-prune junk, preserve gold.
    ctx.memory.remember(text, tier=EPHEMERAL, kind="exchange")

    if ctx.config.is_chill:
        return thought.answer

    detail = " · ".join(f"{gate.name} {gate.score:.2f}" for gate in thought.gates)
    footer = f"\n\n[{thought.loops} loop(s) · {detail}]"
    return thought.answer + footer


def build_context(config: Config) -> Context:
    memory = MemoryStore(config.db_path, ephemeral_ttl_days=config.ephemeral_ttl_days)
    council = Council(
        memory=memory,
        threshold=config.gate_threshold,
        max_loops=config.max_loops,
    )
    return Context(config=config, memory=memory, council=council)


BANNER = """Jackie — local core, offline.
Every message goes through the council and the three gates before I answer.
/help for commands. /quit to stop."""


def repl(ctx: Context) -> int:
    print(BANNER)
    for note in ctx.config.notes:
        print(f"  config: {note}")
    print()

    while True:
        try:
            line = input("you › ")
        except (EOFError, KeyboardInterrupt):
            print()
            return 0

        try:
            reply = respond(line, ctx)
        except Quit:
            print("Jackie: Still here when you need me.")
            return 0
        except Exception as exc:  # a bad line should never end the session
            print(f"Jackie: That broke something on my side — {type(exc).__name__}: {exc}")
            continue

        if reply:
            print(reply)
            print()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="jackie_assistant",
        description="Jackie — local-first assistant with tiered memory and the Resonance Loop.",
    )
    parser.add_argument("prompt", nargs="*", help="ask one thing and exit")
    parser.add_argument("--db", help="path to the SQLite database")
    parser.add_argument("--mode", choices=MODES, help="loud (default) or chill")
    args = parser.parse_args(argv)

    config = Config.load()
    if args.db:
        config = Config(
            home=config.home,
            db_path=Path(args.db).expanduser(),
            vault_path=config.vault_path,
            mode=config.mode,
            gate_threshold=config.gate_threshold,
            max_loops=config.max_loops,
            ephemeral_ttl_days=config.ephemeral_ttl_days,
            recall_limit=config.recall_limit,
            notes=config.notes,
        )
    if args.mode:
        config = config.with_mode(args.mode)

    ctx = build_context(config)
    try:
        if args.prompt:
            print(respond(" ".join(args.prompt), ctx))
            return 0
        return repl(ctx)
    finally:
        ctx.memory.close()


if __name__ == "__main__":
    raise SystemExit(main())
