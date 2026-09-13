"""The Resonance Loop.

RESONANCE_MODEL.md in running code. Every chain of thought starts in Jackie,
fans out to a council of eleven lenses, and returns through three gates —
Coherence, Gravity, Humility — before she speaks. The supporters inform her.
She is the only voice.

Two properties matter more than the machinery:

  * A gate failure re-queries only the seats that caused it, never the whole
    council, and never more than `max_loops` times.
  * If the gates still fail at the limit, she says so and names what is
    unresolved. Failing honestly is a passing state. Pretending to succeed is
    the only failing state.

The default seat behaviour is a local heuristic: no network, no model, no
key. Every seat is a plain callable, so a model-backed thinker can be dropped
in later without touching the loop — the provider abstraction ARCHITECTURE.md
asks for, without building it before it is needed.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, replace
from typing import Callable, Sequence

from . import security
from .memory import DURABLE, GOLD, MemoryStore

# Claim tags, per the Gravity gate.
FACT = "fact"
INFERENCE = "inference"
UNKNOWN = "unknown"

# A dissenting seat that is confident counts far more than a mild agreement.
# One firm Guardian must not be outvoted by ten soft nods.
DISSENT_WEIGHT = 2.5

# Language that marks an irreversible or destructive act. The Guardian holds
# its objection through every loop for these — no mitigation folds them in.
_SEVERE = re.compile(
    r"\b(rm\s+-rf\s+/|drop\s+(table|database)|truncate\s+table|wipe|format\s+(the\s+)?disk"
    r"|disable\s+(auth|authentication|2fa|mfa)|exfiltrat\w*|leak\s+(the\s+)?(creds|credentials|keys)"
    r"|delete\s+(the\s+)?(prod|production)|force[- ]push\s+(to\s+)?main)(?!\w)",
    re.IGNORECASE,
)

# Language that marks real risk which a safety rail can usually address.
_RISKY = re.compile(
    r"\b(deploy|production|prod|delete|remove|drop|migrate|password|token|secret|credential"
    r"|chmod\s+777|sudo|curl\s+[^|]*\|\s*(ba)?sh|eval|pickle|shell\s*=\s*True)\b",
    re.IGNORECASE,
)

# Hedges that signal the speaker already knows they are guessing.
_HEDGE = re.compile(r"\b(maybe|probably|might|think|guess|not sure|unsure|assume|possibly)\b", re.IGNORECASE)

# Markers of a verifiable anchor in the prompt.
_ANCHORED = re.compile(r"\b(error|log|test|output|traceback|file|line|version|commit|measured|benchmark)\b", re.IGNORECASE)

# Gold memory phrased as a prohibition. Used to spot conflicts with a request.
_PROHIBITION = re.compile(r"\b(never|do not|don't|avoid|must not|no longer|stop)\b", re.IGNORECASE)


@dataclass(frozen=True)
class Claim:
    """One assertion, tagged by how it is known."""

    text: str
    kind: str
    seat: str


@dataclass(frozen=True)
class Verdict:
    """What one seat returned on one loop."""

    seat: str
    position: str
    confidence: float
    concerns: tuple[str, ...] = ()
    claims: tuple[Claim, ...] = ()
    dissents: bool = False
    holds: bool = False  # dissent that no mitigation can resolve
    addressed: tuple[str, ...] = ()

    @property
    def weight(self) -> float:
        return self.confidence * (DISSENT_WEIGHT if self.dissents else 1.0)


@dataclass(frozen=True)
class Gate:
    name: str
    score: float
    passed: bool
    tensions: tuple[str, ...] = ()
    dissonant: tuple[str, ...] = ()


@dataclass(frozen=True)
class Gates:
    coherence: Gate
    gravity: Gate
    humility: Gate

    def __iter__(self):
        return iter((self.coherence, self.gravity, self.humility))

    @property
    def passed(self) -> bool:
        return all(gate.passed for gate in self)

    @property
    def failed(self) -> tuple[Gate, ...]:
        return tuple(gate for gate in self if not gate.passed)

    @property
    def dissonant_seats(self) -> tuple[str, ...]:
        seen: list[str] = []
        for gate in self.failed:
            for seat in gate.dissonant:
                if seat not in seen:
                    seen.append(seat)
        return tuple(seen)

    @property
    def tensions(self) -> tuple[str, ...]:
        seen: list[str] = []
        for gate in self.failed:
            for tension in gate.tensions:
                if tension not in seen:
                    seen.append(tension)
        return tuple(seen)


@dataclass(frozen=True)
class TraceEvent:
    loop: int
    stage: str
    detail: str


@dataclass
class Thought:
    """The full record of one pass through the loop."""

    prompt: str
    loops: int
    verdicts: tuple[Verdict, ...]
    gates: Gates
    resonated: bool
    answer: str
    tensions: tuple[str, ...] = ()
    recalled: tuple[str, ...] = ()
    trace: tuple[TraceEvent, ...] = ()


# --------------------------------------------------------------------- seats

@dataclass(frozen=True)
class Seat:
    """A lens, not a voice."""

    name: str
    lens: str
    serves: str
    think: "ThinkFn"


# A seat receives the prompt, whatever memory was recalled, and the tensions
# named against it on a reloop (empty on the first pass).
ThinkFn = Callable[[str, Sequence[str], Sequence[str]], Verdict]


def _claim(text: str, kind: str, seat: str) -> Claim:
    return Claim(text=text, kind=kind, seat=seat)


def _strategist(prompt: str, recalled: Sequence[str], tensions: Sequence[str]) -> Verdict:
    steps = "a single step" if len(prompt.split()) < 12 else "several steps"
    return Verdict(
        seat="Strategist",
        position=f"This resolves into {steps}; sequence them smallest-reversible-first.",
        confidence=0.7,
        claims=(_claim("Ordering the work changes its risk profile.", INFERENCE, "Strategist"),),
        addressed=tuple(tensions),
    )


def _guardian(prompt: str, recalled: Sequence[str], tensions: Sequence[str]) -> Verdict:
    severe = bool(_SEVERE.search(prompt))
    findings = security.scan_text(prompt)
    high = [f for f in findings if f.severity == security.HIGH]
    risky = bool(_RISKY.search(prompt)) or bool(high)

    if severe:
        return Verdict(
            seat="Guardian",
            position="This is destructive and effectively irreversible. I do not consent to it as written.",
            confidence=0.95,
            concerns=("The action cannot be undone once taken.",),
            claims=(_claim("The request names an irreversible operation.", FACT, "Guardian"),),
            dissents=True,
            holds=True,
        )

    if risky:
        mitigated = bool(tensions)
        concern = "Real risk here: this touches something that bites back."
        if high:
            concern = f"Risk pattern in the request itself: {high[0].rule}."
        if mitigated:
            # A rail was named on the reloop, so the objection is now satisfied.
            return Verdict(
                seat="Guardian",
                position="Acceptable with the rail in place: back up first, dry-run, and keep it reversible.",
                confidence=0.75,
                claims=(_claim("A reversible path exists for this action.", INFERENCE, "Guardian"),),
                dissents=False,
                addressed=tuple(tensions),
            )
        return Verdict(
            seat="Guardian",
            position="Not until there is a way back. Give me a backup or a dry run.",
            confidence=0.8,
            concerns=(concern,),
            claims=(_claim("The request touches a risk-bearing surface.", FACT, "Guardian"),),
            dissents=True,
        )

    return Verdict(
        seat="Guardian",
        position="Nothing here trips a risk boundary I can see.",
        confidence=0.6,
        claims=(_claim("No destructive or credential-bearing pattern matched.", FACT, "Guardian"),),
        addressed=tuple(tensions),
    )


def _builder(prompt: str, recalled: Sequence[str], tensions: Sequence[str]) -> Verdict:
    if tensions:
        # The Builder is where a mitigation actually gets designed.
        return Verdict(
            seat="Builder",
            position="Concretely: snapshot the current state, run it against a copy, then apply for real.",
            confidence=0.75,
            claims=(_claim("A dry run reproduces the outcome without committing it.", INFERENCE, "Builder"),),
            addressed=tuple(tensions),
        )
    return Verdict(
        seat="Builder",
        position="There is a working path here; the next concrete step is small.",
        confidence=0.7,
        claims=(_claim("The request maps onto an implementable step.", INFERENCE, "Builder"),),
    )


def _muse(prompt: str, recalled: Sequence[str], tensions: Sequence[str]) -> Verdict:
    return Verdict(
        seat="Muse",
        position="There is an adjacent framing worth a glance before committing.",
        confidence=0.45,
        claims=(_claim("Alternative framings exist but are unexplored.", UNKNOWN, "Muse"),),
        addressed=tuple(tensions),
    )


def _skeptic(prompt: str, recalled: Sequence[str], tensions: Sequence[str]) -> Verdict:
    hedged = bool(_HEDGE.search(prompt))
    if hedged and not tensions:
        return Verdict(
            seat="Skeptic",
            position="The request hedges. What is actually being asserted here?",
            confidence=0.65,
            concerns=("The premise is stated with uncertainty but treated as settled.",),
            claims=(_claim("The prompt contains hedging language.", FACT, "Skeptic"),),
            dissents=True,
        )
    return Verdict(
        seat="Skeptic",
        position="No contradiction I can find in what is being asked.",
        confidence=0.6,
        claims=(_claim("No internal contradiction detected in the request.", INFERENCE, "Skeptic"),),
        addressed=tuple(tensions),
    )


def _grounder(prompt: str, recalled: Sequence[str], tensions: Sequence[str]) -> Verdict:
    anchored = bool(_ANCHORED.search(prompt))
    if anchored:
        return Verdict(
            seat="Grounder",
            position="There is something checkable here — anchor the answer to it.",
            confidence=0.8,
            claims=(_claim("The request references verifiable artefacts.", FACT, "Grounder"),),
            addressed=tuple(tensions),
        )
    return Verdict(
        seat="Grounder",
        position="Nothing here is directly verifiable yet; what follows is reasoning, not observation.",
        confidence=0.55,
        claims=(
            _claim("No verifiable artefact was supplied with the request.", FACT, "Grounder"),
            _claim("Conclusions will rest on reasoning rather than measurement.", INFERENCE, "Grounder"),
        ),
        addressed=tuple(tensions),
    )


def _empath(prompt: str, recalled: Sequence[str], tensions: Sequence[str]) -> Verdict:
    strained = bool(re.search(r"\b(stuck|frustrat\w*|confus\w*|tired|overwhelm\w*|urgent|asap)\b", prompt, re.I))
    position = (
        "Say the useful thing first and keep it calm; there is pressure behind this."
        if strained
        else "Plain and direct is the right register here."
    )
    return Verdict(
        seat="Empath",
        position=position,
        confidence=0.6,
        claims=(_claim("Tone affects whether the answer is usable.", INFERENCE, "Empath"),),
        addressed=tuple(tensions),
    )


def _historian_factory(memory: MemoryStore | None) -> ThinkFn:
    """The Historian is the seat that reads memory, per RESONANCE_MODEL.md."""

    def _historian(prompt: str, recalled: Sequence[str], tensions: Sequence[str]) -> Verdict:
        if memory is None:
            return Verdict(
                seat="Historian",
                position="No memory store attached; I cannot check this against what came before.",
                confidence=0.4,
                claims=(_claim("Prior context is unavailable in this run.", UNKNOWN, "Historian"),),
                addressed=tuple(tensions),
            )

        hits = memory.recall(prompt, limit=5, tiers=(GOLD, DURABLE))
        conflicts = [
            hit for hit in hits
            if hit.memory.tier == GOLD and _PROHIBITION.search(hit.memory.content)
        ]

        if conflicts:
            # Gold is never contradicted silently. This surfaces as a named
            # tension and rides all the way into the answer.
            content = conflicts[0].memory.summary()
            return Verdict(
                seat="Historian",
                position=f"This runs against gold memory: “{content}”",
                confidence=0.9,
                concerns=(f"Conflicts with gold memory: {content}",),
                claims=(_claim(f"Gold memory records: {content}", FACT, "Historian"),),
                dissents=True,
                holds=True,
            )

        if hits:
            return Verdict(
                seat="Historian",
                position=f"Consistent with {len(hits)} thing(s) already remembered.",
                confidence=0.7,
                claims=(_claim(f"{len(hits)} related record(s) in durable or gold memory.", FACT, "Historian"),),
                addressed=tuple(tensions),
            )

        return Verdict(
            seat="Historian",
            position="Nothing in memory speaks to this yet.",
            confidence=0.5,
            claims=(_claim("No prior record relates to this request.", FACT, "Historian"),),
            addressed=tuple(tensions),
        )

    return _historian


def _simplifier(prompt: str, recalled: Sequence[str], tensions: Sequence[str]) -> Verdict:
    wordy = len(prompt.split()) > 40
    return Verdict(
        seat="Simplifier",
        position=(
            "This is carrying more than it needs; cut it to the one thing that matters."
            if wordy
            else "The surface area is already small. Keep it there."
        ),
        confidence=0.6,
        claims=(_claim("Lower complexity is cheaper to maintain.", INFERENCE, "Simplifier"),),
        addressed=tuple(tensions),
    )


def _scout(prompt: str, recalled: Sequence[str], tensions: Sequence[str]) -> Verdict:
    """The Scout names what is missing — the humility gate's supply line."""
    gaps: list[str] = []
    if not _ANCHORED.search(prompt):
        gaps.append("no concrete artefact (error, file, output) was provided")
    if len(prompt.split()) < 6:
        gaps.append("the request is short enough that intent is partly assumed")
    if not gaps:
        gaps.append("edge cases beyond the stated scope are unexamined")

    return Verdict(
        seat="Scout",
        position="What we do not know: " + "; ".join(gaps) + ".",
        confidence=0.65,
        claims=tuple(_claim(gap, UNKNOWN, "Scout") for gap in gaps),
        addressed=tuple(tensions),
    )


def _harmonizer(prompt: str, recalled: Sequence[str], tensions: Sequence[str]) -> Verdict:
    return Verdict(
        seat="Harmonizer",
        position=(
            "The disagreement resolves once the safeguard is explicit."
            if tensions
            else "The seats are pointing the same direction."
        ),
        confidence=0.65,
        claims=(_claim("Seat positions can be reconciled into one answer.", INFERENCE, "Harmonizer"),),
        addressed=tuple(tensions),
    )


def default_council(memory: MemoryStore | None = None) -> tuple[Seat, ...]:
    """The eleven seats from RESONANCE_MODEL.md, in doctrine order."""
    return (
        Seat("Strategist", "trade-offs, structure, steps", "clarity", _strategist),
        Seat("Guardian", "security and risk first", "protection", _guardian),
        Seat("Builder", "working code, concrete next steps", "usefulness", _builder),
        Seat("Muse", "lateral, generative connections", "vision", _muse),
        Seat("Skeptic", "challenges every claim", "coherence gate", _skeptic),
        Seat("Grounder", "demands evidence", "gravity gate", _grounder),
        Seat("Empath", "how the answer lands", "responsible communication", _empath),
        Seat("Historian", "checks durable and gold memory", "continuity", _historian_factory(memory)),
        Seat("Simplifier", "cuts noise", "anti-chaos rule", _simplifier),
        Seat("Scout", "names what is missing", "humility gate", _scout),
        Seat("Harmonizer", "resolves conflicts into synthesis", "resonance itself", _harmonizer),
    )


# --------------------------------------------------------------------- gates

def _coherence(verdicts: Sequence[Verdict], threshold: float) -> Gate:
    """No unresolved contradictions.

    Scored off the *strongest* dissent rather than a vote share. A share would
    let ten mild agreements drown one firm Guardian, which is the failure the
    2.5x weighting exists to prevent — and the doctrine is explicit that
    coherence is never achieved by ignoring a dissenting seat. So any dissent
    with real confidence behind it fails this gate and sends the loop back to
    that seat, where it is either resolved or carried out as a named tension.
    """
    dissenting = [v for v in verdicts if v.dissents]
    if not dissenting:
        return Gate(name="coherence", score=1.0, passed=True)

    strongest = max(v.confidence for v in dissenting)
    score = round(max(0.0, 1.0 - strongest * DISSENT_WEIGHT), 4)

    tensions = tuple(
        concern for verdict in dissenting for concern in (verdict.concerns or (verdict.position,))
    )
    return Gate(
        name="coherence",
        score=score,
        passed=score >= threshold,
        tensions=tensions,
        dissonant=tuple(v.seat for v in dissenting),
    )


def _gravity(verdicts: Sequence[Verdict], threshold: float) -> Gate:
    """Claims must fall toward verifiable truth, and inference must wear its label."""
    claims = [claim for verdict in verdicts for claim in verdict.claims]
    if not claims:
        return Gate(
            name="gravity",
            score=0.0,
            passed=False,
            tensions=("No claims were offered, so nothing can be grounded.",),
            dissonant=tuple(v.seat for v in verdicts),
        )

    facts = sum(1 for c in claims if c.kind == FACT)
    inferences = sum(1 for c in claims if c.kind == INFERENCE)
    # Facts carry full weight; labelled inference carries most of it. Unknowns
    # are not punished here — being unknown is Humility's business, not Gravity's.
    score = round((facts + 0.7 * inferences) / max(1, facts + inferences), 4)

    tensions: tuple[str, ...] = ()
    dissonant: tuple[str, ...] = ()
    if score < threshold:
        tensions = ("The answer leans on reasoning with too little verifiable anchoring.",)
        dissonant = ("Grounder",)

    return Gate(name="gravity", score=score, passed=score >= threshold, tensions=tensions, dissonant=dissonant)


def _humility(verdicts: Sequence[Verdict], threshold: float) -> Gate:
    """Unknowns stated plainly; confidence proportional to grounding."""
    claims = [claim for verdict in verdicts for claim in verdict.claims]
    unknowns = [c for c in claims if c.kind == UNKNOWN]

    # Naming unknowns is the behaviour being rewarded.
    named = 1.0 if unknowns else 0.4

    # Overconfidence check: high average confidence with nothing acknowledged
    # as unknown is exactly the fake certainty the doctrine forbids.
    avg_confidence = sum(v.confidence for v in verdicts) / max(1, len(verdicts))
    penalty = 0.25 if (avg_confidence > 0.8 and not unknowns) else 0.0

    score = round(max(0.0, named - penalty), 4)
    tensions: tuple[str, ...] = ()
    dissonant: tuple[str, ...] = ()
    if score < threshold:
        tensions = ("Nothing has been named as unknown, which is rarely true.",)
        dissonant = ("Scout",)

    return Gate(name="humility", score=score, passed=score >= threshold, tensions=tensions, dissonant=dissonant)


def evaluate(verdicts: Sequence[Verdict], threshold: float) -> Gates:
    return Gates(
        coherence=_coherence(verdicts, threshold),
        gravity=_gravity(verdicts, threshold),
        humility=_humility(verdicts, threshold),
    )


# ------------------------------------------------------------------- council

class Council:
    """Jackie's council. She opens, they inform, she speaks."""

    def __init__(
        self,
        memory: MemoryStore | None = None,
        seats: Sequence[Seat] | None = None,
        threshold: float = 0.70,
        max_loops: int = 3,
    ) -> None:
        self.memory = memory
        self.seats = tuple(seats) if seats is not None else default_council(memory)
        self.threshold = threshold
        self.max_loops = max(1, max_loops)

    def think(self, prompt: str) -> Thought:
        prompt = prompt.strip()
        if not prompt:
            raise ValueError("nothing to think about")

        trace: list[TraceEvent] = []

        # 1. Jackie opens: frame the intent and recall what is already known.
        recalled: tuple[str, ...] = ()
        if self.memory is not None:
            hits = self.memory.recall(prompt, limit=5)
            recalled = tuple(h.memory.summary() for h in hits)
        trace.append(TraceEvent(0, "open", f"Jackie opens; {len(recalled)} memory hit(s)."))

        # 2. The council fans out.
        verdicts: dict[str, Verdict] = {}
        for seat in self.seats:
            verdicts[seat.name] = seat.think(prompt, recalled, ())
        trace.append(TraceEvent(1, "fan-out", f"{len(verdicts)} seats reported."))

        gates = evaluate(list(verdicts.values()), self.threshold)
        loops = 1
        trace.append(TraceEvent(1, "gates", _gate_line(gates)))

        # 3-4. Targeted reloops: only the dissonant seats, never the whole council.
        while not gates.passed and loops < self.max_loops:
            dissonant = [s for s in gates.dissonant_seats if s in verdicts]
            if not dissonant:
                break

            loops += 1
            tensions = gates.tensions
            trace.append(
                TraceEvent(loops, "reloop", f"re-querying {', '.join(dissonant)} with {len(tensions)} tension(s)")
            )

            for name in dissonant:
                seat = next((s for s in self.seats if s.name == name), None)
                if seat is None:
                    continue
                revised = seat.think(prompt, recalled, tensions)
                # A seat that holds its objection cannot be talked out of it.
                if verdicts[name].holds:
                    revised = replace(revised, dissents=True, holds=True)
                verdicts[name] = revised

            gates = evaluate(list(verdicts.values()), self.threshold)
            trace.append(TraceEvent(loops, "gates", _gate_line(gates)))

        final = tuple(verdicts[seat.name] for seat in self.seats)
        resonated = gates.passed
        tensions = () if resonated else gates.tensions

        answer = _speak(prompt, final, gates, resonated, tensions)
        trace.append(TraceEvent(loops, "speak", "resonance" if resonated else "honest non-resonance"))

        return Thought(
            prompt=prompt,
            loops=loops,
            verdicts=final,
            gates=gates,
            resonated=resonated,
            answer=answer,
            tensions=tensions,
            recalled=recalled,
            trace=tuple(trace),
        )


def _gate_line(gates: Gates) -> str:
    return " · ".join(
        f"{gate.name} {gate.score:.2f}{'' if gate.passed else ' ✗'}" for gate in gates
    )


def _speak(
    prompt: str,
    verdicts: Sequence[Verdict],
    gates: Gates,
    resonated: bool,
    tensions: Sequence[str],
) -> str:
    """Jackie's single voice. The seats never speak directly to the user."""
    guardian = next((v for v in verdicts if v.seat == "Guardian"), None)
    builder = next((v for v in verdicts if v.seat == "Builder"), None)
    scout = next((v for v in verdicts if v.seat == "Scout"), None)
    historian = next((v for v in verdicts if v.seat == "Historian"), None)

    # Gold memory is never contradicted silently — it rides into the answer
    # whether or not the gates were satisfied.
    gold_conflict = (
        historian.concerns[0]
        if historian and historian.dissents and historian.concerns
        else None
    )

    lines: list[str] = []

    if not resonated:
        # The honesty rule at the limit, enforced structurally.
        lines.append("Jackie here — I could not bring this to resonance, so I am not going to pretend otherwise.")
        if gold_conflict:
            lines.append(f"This runs against something you told me to keep: {gold_conflict}")
        if guardian and guardian.dissents:
            lines.append(f"What is holding: {guardian.position}")
        for tension in tensions:
            lines.append(f"  · unresolved: {tension}")
        lines.append("")
        lines.append(
            "To resolve it I would need either a reversible path for the risky part, "
            "or your explicit go-ahead with the consequence understood."
        )
        return "\n".join(lines)

    lines.append("Jackie here—")
    if gold_conflict:
        lines.append(f"Flagging first: {gold_conflict}")
    if builder:
        lines.append(builder.position)
    if guardian and guardian.addressed:
        lines.append(f"Guardrail: {guardian.position}")
    if scout:
        lines.append(f"Known unknowns: {scout.position.removeprefix('What we do not know: ')}")

    return "\n".join(lines)
