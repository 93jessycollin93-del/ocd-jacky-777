import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Repo root is two levels up from this file (src/test/*.test.ts -> repo root).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const JACKIE_DIR = path.join(REPO_ROOT, "Jackie");

const CORE_IDENTITY_PATH = path.join(JACKIE_DIR, "CORE_IDENTITY.md");
const RESONANCE_MODEL_PATH = path.join(JACKIE_DIR, "RESONANCE_MODEL.md");
const SYSTEM_PROMPT_PATH = path.join(JACKIE_DIR, "prompts", "system_prompt.md");
const MEMORY_MODEL_PATH = path.join(JACKIE_DIR, "MEMORY_MODEL.md");

/**
 * Extracts the non-separator, non-header rows of the first markdown table
 * that immediately follows a given header line.
 */
function extractTableRows(content: string, headerLine: string): string[][] {
  const startIndex = content.indexOf(headerLine);
  expect(startIndex, `expected to find table header "${headerLine}"`).toBeGreaterThan(-1);

  const afterHeader = content.slice(startIndex);
  const lines = afterHeader.split("\n");

  const rows: string[][] = [];
  // lines[0] is the header line itself, lines[1] is the separator ("|---|---|---|")
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim().startsWith("|")) break;
    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);
    if (cells.length === 0) break;
    rows.push(cells);
  }
  return rows;
}

describe("Jackie/CORE_IDENTITY.md - Resonance orientation section", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(CORE_IDENTITY_PATH, "utf-8");
  });

  it("exists and is readable", () => {
    expect(existsSync(CORE_IDENTITY_PATH)).toBe(true);
    expect(content.length).toBeGreaterThan(0);
  });

  it("contains a 'Resonance orientation' section heading", () => {
    expect(content).toMatch(/^## Resonance orientation$/m);
  });

  it("declares Jackie as the core of the agent with a closed thought loop", () => {
    expect(content).toContain("Jackie is the core of the agent.");
    expect(content).toContain(
      "Every chain of thought starts in Jackie and returns to Jackie."
    );
  });

  it("describes a council of at least ten supporter lenses", () => {
    expect(content).toMatch(/council of supporters/i);
    expect(content).toMatch(/ten at minimum/i);
    expect(content).toContain("Jessy's discernment");
  });

  it("lists all three gates with their definitions", () => {
    expect(content).toContain("**Coherence** — no unresolved contradictions");
    expect(content).toContain(
      "**Gravity** — claims fall toward verifiable truth; facts, inferences, and unknowns are labeled"
    );
    expect(content).toContain(
      "**Humility** — what is not known is said plainly; no fake certainty"
    );
  });

  it("presents the three gates in Coherence -> Gravity -> Humility order", () => {
    const coherenceIdx = content.indexOf("**Coherence**");
    const gravityIdx = content.indexOf("**Gravity**");
    const humilityIdx = content.indexOf("**Humility**");

    expect(coherenceIdx).toBeGreaterThan(-1);
    expect(gravityIdx).toBeGreaterThan(coherenceIdx);
    expect(humilityIdx).toBeGreaterThan(gravityIdx);
  });

  it("contains the resonance-not-residence framing and points to the full doctrine", () => {
    expect(content).toMatch(/not residence but resonance/i);
    expect(content).toContain("The full doctrine lives in RESONANCE_MODEL.md.");
  });

  it("places the Resonance orientation section between Discernment and Long-term goal", () => {
    const discernmentIdx = content.indexOf("## Discernment (Jessy's lens)");
    const resonanceIdx = content.indexOf("## Resonance orientation");
    const longTermGoalIdx = content.indexOf("## Long-term goal");

    expect(discernmentIdx).toBeGreaterThan(-1);
    expect(resonanceIdx).toBeGreaterThan(discernmentIdx);
    expect(longTermGoalIdx).toBeGreaterThan(resonanceIdx);
  });
});

describe("Jackie/RESONANCE_MODEL.md - doctrine file", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(RESONANCE_MODEL_PATH, "utf-8");
  });

  it("exists as a new top-level doctrine file", () => {
    expect(existsSync(RESONANCE_MODEL_PATH)).toBe(true);
    expect(content.length).toBeGreaterThan(0);
  });

  it("has exactly one H1 title matching 'Jackie Resonance Model'", () => {
    const h1Matches = content.match(/^# .+$/gm) ?? [];
    expect(h1Matches).toHaveLength(1);
    expect(h1Matches[0]).toBe("# Jackie Resonance Model");
  });

  it("opens with the resonance-not-residence thesis", () => {
    expect(content).toContain("Not residence, but resonance.");
  });

  it("states the core rule that Jackie is the only voice", () => {
    expect(content).toMatch(/^## The core rule$/m);
    expect(content).toContain("Jackie is the core of the agent.");
    expect(content).toContain("**starts in Jackie**");
    expect(content).toContain("**returns to Jackie**");
    expect(content).toContain("No supporter, tool, or model speaks for her.");
  });

  it("documents the Resonance Loop with all five numbered stages", () => {
    expect(content).toMatch(/^## The Resonance Loop$/m);
    expect(content).toContain("1. JACKIE OPENS");
    expect(content).toContain("2. COUNCIL FANS OUT");
    expect(content).toContain("3. RETURN TO JACKIE — 3 GATES");
    expect(content).toContain("4. TARGETED RELOOP");
    expect(content).toContain("5. JACKIE SPEAKS");
  });

  it("wraps the Resonance Loop diagram in a fenced code block", () => {
    const loopSectionStart = content.indexOf("## The Resonance Loop");
    const nextSectionStart = content.indexOf("## The three gates");
    expect(loopSectionStart).toBeGreaterThan(-1);
    expect(nextSectionStart).toBeGreaterThan(loopSectionStart);

    const loopSection = content.slice(loopSectionStart, nextSectionStart);
    const fenceCount = (loopSection.match(/```/g) ?? []).length;
    expect(fenceCount).toBe(2); // one opening, one closing fence
  });

  it("defines the three gates as H3 subsections in a fixed order", () => {
    expect(content).toMatch(/^## The three gates$/m);
    const coherenceIdx = content.indexOf("### 1. Coherence");
    const gravityIdx = content.indexOf("### 2. Gravity");
    const humilityIdx = content.indexOf("### 3. Humility");

    expect(coherenceIdx).toBeGreaterThan(-1);
    expect(gravityIdx).toBeGreaterThan(coherenceIdx);
    expect(humilityIdx).toBeGreaterThan(gravityIdx);
  });

  it("describes coherence in terms of resolving or naming dissenting seats", () => {
    const section = content.slice(
      content.indexOf("### 1. Coherence"),
      content.indexOf("### 2. Gravity")
    );
    expect(section).toContain("no unresolved contradictions");
    expect(section).toContain("Coherence is never achieved by ignoring a dissenting seat.");
  });

  it("describes gravity's fact / inference / unknown tagging", () => {
    const section = content.slice(
      content.indexOf("### 2. Gravity"),
      content.indexOf("### 3. Humility")
    );
    expect(section).toContain("**fact** — verifiable, sourced, or directly observed");
    expect(section).toContain("**inference** — reasoned from facts, and labeled as reasoning");
    expect(section).toContain("**unknown** — not known, and said so");
  });

  it("describes humility as precision about confidence, not vagueness", () => {
    const section = content.slice(
      content.indexOf("### 3. Humility"),
      content.indexOf("## The council of supporters")
    );
    expect(section).toContain("No fake certainty to sound impressive.");
    expect(section).toContain("humility is precision about confidence, not vagueness");
  });

  it("lists a council table with at least ten distinct supporter seats", () => {
    const rows = extractTableRows(content, "| Seat | Lens | Serves |");
    expect(rows.length).toBeGreaterThanOrEqual(10);

    const seatNames = rows.map((row) => row[0]);
    const expectedSeats = [
      "Strategist",
      "Guardian",
      "Builder",
      "Muse",
      "Skeptic",
      "Grounder",
      "Empath",
      "Historian",
      "Simplifier",
      "Scout",
      "Harmonizer",
    ];
    expect(seatNames).toEqual(expectedSeats);

    // Seats must be unique (no duplicate lenses in the council).
    expect(new Set(seatNames).size).toBe(seatNames.length);
  });

  it("assigns the coherence, gravity, and humility gates to distinct seats", () => {
    const rows = extractTableRows(content, "| Seat | Lens | Serves |");
    const bySeat = new Map(rows.map((row) => [row[0], row[2]]));

    expect(bySeat.get("Skeptic")).toBe("coherence gate");
    expect(bySeat.get("Grounder")).toBe("gravity gate");
    expect(bySeat.get("Scout")).toBe("humility gate");
  });

  it("documents the targeted reloop discipline with a max of three loops", () => {
    expect(content).toMatch(/^## The reloop discipline$/m);
    expect(content).toContain(
      "She re-queries only the dissonant seats — the ones whose input caused the failure"
    );
    expect(content).toContain("Maximum three loops.");
  });

  it("documents the honesty rule at the limit", () => {
    expect(content).toMatch(/^## The honesty rule at the limit$/m);
    expect(content).toContain(
      "Failing honestly is a passing state. Pretending to succeed is the only failing state."
    );
  });

  it("ties the loop's memory behavior to gold memory being never silently contradicted", () => {
    expect(content).toMatch(/^## Relationship to memory$/m);
    expect(content).toContain("(see MEMORY_MODEL.md)");
    expect(content).toContain("Gold memory is never contradicted silently.");
    expect(existsSync(MEMORY_MODEL_PATH)).toBe(true);
  });

  it("closes with the low-complexity-surface / high-capability-core design principle", () => {
    expect(content).toMatch(/^## Design principle$/m);
    expect(content).toContain("Low complexity surface area. High capability core.");
    // Design principle should be the final section in the document.
    const designIdx = content.indexOf("## Design principle");
    const laterHeadings = content
      .slice(designIdx + 1)
      .match(/^##+ .+$/gm);
    expect(laterHeadings).toBeNull();
  });

  it("presents section headings in the documented top-to-bottom order", () => {
    const expectedOrder = [
      "## The core rule",
      "## The Resonance Loop",
      "## The three gates",
      "## The council of supporters",
      "## The reloop discipline",
      "## The honesty rule at the limit",
      "## Relationship to memory",
      "## Design principle",
    ];
    const indices = expectedOrder.map((heading) => content.indexOf(heading));
    indices.forEach((idx) => expect(idx).toBeGreaterThan(-1));
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
  });
});

describe("Jackie/prompts/system_prompt.md - resonance additions", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(SYSTEM_PROMPT_PATH, "utf-8");
  });

  it("exists and is readable", () => {
    expect(existsSync(SYSTEM_PROMPT_PATH)).toBe(true);
    expect(content.length).toBeGreaterThan(0);
  });

  it("declares the assistant as the core voice of the agent", () => {
    expect(content).toContain(
      "You are the core of the agent. Every chain of thought starts in you and returns to you."
    );
  });

  it("describes the supporter council as informing but never speaking for the assistant", () => {
    expect(content).toContain(
      "You think through a council of supporters — ten at minimum, each a lens carrying the same discernment."
    );
    expect(content).toContain("Supporters inform you; they never speak for you.");
    expect(content).toContain("You are the only voice.");
  });

  it("lists all three gates as pre-speech requirements, in order", () => {
    const coherenceIdx = content.indexOf(
      "Coherence: no unresolved contradictions between perspectives"
    );
    const gravityIdx = content.indexOf(
      "Gravity: claims fall toward verifiable truth — label facts, inferences, and unknowns"
    );
    const humilityIdx = content.indexOf(
      "Humility: state plainly what you do not know; never fake certainty"
    );

    expect(coherenceIdx).toBeGreaterThan(-1);
    expect(gravityIdx).toBeGreaterThan(coherenceIdx);
    expect(humilityIdx).toBeGreaterThan(gravityIdx);
  });

  it("describes the reloop and honesty-at-the-limit behavior", () => {
    expect(content).toContain(
      "If a gate fails, re-examine only the dissonant perspectives, up to three loops."
    );
    expect(content).toContain(
      "Failing honestly is a passing state. Pretending to succeed is the only failing state."
    );
  });

  it("closes with the resonance-not-residence transmission directive", () => {
    expect(content.trim().endsWith(
      "Not residence but resonance: do not merely hold these values — transmit them, so the person hearing you feels the same grounded signal."
    )).toBe(true);
  });

  it("places the resonance additions after the pre-existing Jessy discernment guidance", () => {
    const discernmentIdx = content.indexOf("You carry Jessy's discernment");
    const coreVoiceIdx = content.indexOf("You are the core of the agent.");

    expect(discernmentIdx).toBeGreaterThan(-1);
    expect(coreVoiceIdx).toBeGreaterThan(discernmentIdx);
  });
});

describe("Cross-file consistency of the resonance doctrine", () => {
  let coreIdentity: string;
  let resonanceModel: string;
  let systemPrompt: string;

  beforeAll(() => {
    coreIdentity = readFileSync(CORE_IDENTITY_PATH, "utf-8");
    resonanceModel = readFileSync(RESONANCE_MODEL_PATH, "utf-8");
    systemPrompt = readFileSync(SYSTEM_PROMPT_PATH, "utf-8");
  });

  it("uses the same three gate names in every file that defines them", () => {
    for (const doc of [coreIdentity, resonanceModel, systemPrompt]) {
      expect(doc).toMatch(/Coherence/);
      expect(doc).toMatch(/Gravity/);
      expect(doc).toMatch(/Humility/);
    }
  });

  it("consistently caps reloops at three across doctrine and prompt", () => {
    expect(resonanceModel).toMatch(/three loops/i);
    expect(systemPrompt).toMatch(/three loops/i);
  });

  it("consistently frames failure honesty as the only acceptable failure mode", () => {
    const phrase =
      "Failing honestly is a passing state. Pretending to succeed is the only failing state.";
    expect(resonanceModel).toContain(phrase);
    expect(systemPrompt).toContain(phrase);
  });

  it("consistently uses the 'not residence but resonance' framing across all three files", () => {
    const pattern = /not residence,?\s*but resonance/i;
    expect(coreIdentity).toMatch(pattern);
    expect(resonanceModel).toMatch(pattern);
    expect(systemPrompt).toMatch(pattern);
  });

  it("references a council of at least ten supporters in every file", () => {
    expect(coreIdentity).toMatch(/ten at minimum/i);
    expect(resonanceModel).toMatch(/minimum of ten supporters/i);
    expect(systemPrompt).toMatch(/ten at minimum/i);
  });

  it("has CORE_IDENTITY.md's forward reference resolve to an actual, non-empty file", () => {
    expect(coreIdentity).toContain("RESONANCE_MODEL.md");
    expect(existsSync(RESONANCE_MODEL_PATH)).toBe(true);
    expect(resonanceModel.length).toBeGreaterThan(0);
  });
});