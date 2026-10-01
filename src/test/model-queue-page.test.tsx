import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ModelQueue from "@/pages/ModelQueue";
import { QUEUE, modelsInPhase } from "@/lib/model-queue";

const showAllPhases = () =>
  fireEvent.click(within(screen.getByRole("group", { name: "Phase" })).getByRole("button", { name: /^All/ }));

function renderPage() {
  return render(
    <MemoryRouter>
      <ModelQueue />
    </MemoryRouter>,
  );
}

describe("ModelQueue page", () => {
  it("opens on Phase 1 in queue order", () => {
    renderPage();
    const names = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(modelsInPhase("1").map((m) => m.name));
  });

  it("filters by category and search", () => {
    renderPage();
    showAllPhases();
    fireEvent.click(within(screen.getByRole("group", { name: "Category" })).getByRole("button", { name: "Audio" }));
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "whisper" } });
    const names = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(names).toContain("whisper-tiny");
    expect(names).toContain("distil-medium.en"); // matched through its repo, distil-whisper/…
    expect(names).not.toContain("musicgen-small");
    expect(names).not.toContain("Florence-2-base");

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "zzz-no-such-model" } });
    expect(screen.getByText("No models match.")).toBeInTheDocument();
  });

  it("finds corrected models by their original id and lists every correction", () => {
    renderPage();
    showAllPhases();
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "Florence-2-small" } });
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Florence-2-base"]);

    fireEvent.click(screen.getByRole("button", { name: /Corrections to the original list/ }));
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(QUEUE.models.filter((m) => m.requested_as).length + 1);
  });

  it("shows the manifest when a row is expanded", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Details for SmolLM2-360M-Instruct" }));
    expect(screen.getByText(/"memory_tier": "balanced"/)).toBeInTheDocument();
  });
});
