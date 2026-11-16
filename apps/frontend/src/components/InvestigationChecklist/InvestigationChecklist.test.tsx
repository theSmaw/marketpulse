// `InvestigationChecklist`, driven by plain `ChecklistState` fixtures — the
// same convention `FeedIndicator.test.tsx` states for its own marker: a
// shape is a CSS class this level does not assert on, and what a test CAN
// see is text, structure (an `<svg>` only ever appears for `complete`) and
// the live region's own content. Shape-level verification (dashed vs. ring,
// in greyscale) is this component's own stories file and the browser suite.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ChecklistState } from "../../investigations/index.js";
import { CONNECTION_LOST_SENTENCE } from "../../investigations/index.js";
import { InvestigationChecklist } from "./InvestigationChecklist.js";
import styles from "./InvestigationChecklist.module.css";

const noop = (): void => undefined;

const QUEUED: ChecklistState = {
  symbol: "NVDA",
  investigationId: undefined,
  steps: [
    {
      id: undefined,
      description: undefined,
      status: "queued",
      startedAt: undefined,
      completedAt: undefined,
      durationMs: undefined,
    },
  ],
  terminal: false,
  connectionLost: false,
};

const RUNNING: ChecklistState = {
  symbol: "NVDA",
  investigationId: "inv-1",
  steps: [
    {
      id: "step-1",
      description: "Measure move",
      status: "running",
      startedAt: "2026-11-16T14:00:00.000Z",
      completedAt: undefined,
      durationMs: undefined,
    },
  ],
  terminal: false,
  connectionLost: false,
};

const COMPLETED: ChecklistState = {
  symbol: "NVDA",
  investigationId: "inv-1",
  steps: [
    {
      id: "step-1",
      description: "Measure move",
      status: "completed",
      startedAt: "2026-11-16T14:00:00.000Z",
      completedAt: "2026-11-16T14:00:00.120Z",
      durationMs: 120,
    },
  ],
  terminal: true,
  connectionLost: false,
};

const DROPPED: ChecklistState = {
  ...RUNNING,
  connectionLost: true,
};

describe("InvestigationChecklist", () => {
  it("is invisible before any press — Done-when 2", () => {
    const { container } = render(
      <InvestigationChecklist
        checklist={undefined}
        announcement=""
        pastCoverThreshold={false}
        onInvestigate={noop}
      />,
    );

    expect(screen.getByRole("button", { name: "Investigate" })).toBeTruthy();
    expect(container.querySelector(`.${String(styles.checklist)}`)).toBeNull();
  });

  it("renders a queued row with held room, no svg, no duration", () => {
    const { container } = render(
      <InvestigationChecklist
        checklist={QUEUED}
        announcement=""
        pastCoverThreshold={false}
        onInvestigate={noop}
      />,
    );

    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelectorAll(`.${String(styles.row)}`)).toHaveLength(
      1,
    );
  });

  it("renders a running row under the cover threshold with no breathing class", () => {
    const { container } = render(
      <InvestigationChecklist
        checklist={RUNNING}
        announcement=""
        pastCoverThreshold={false}
        onInvestigate={noop}
      />,
    );

    expect(screen.getByText("Measure move")).toBeTruthy();
    expect(container.querySelector("svg")).toBeNull();
    const row = container.querySelector(`.${String(styles.row)}`);
    // The one assertion in this file that reaches for a CSS class rather
    // than semantic content — deliberately, because this is this task's
    // own found regression: the breathing ground was wired to
    // `step.status === "running"` alone, which breathed on EVERY running
    // row regardless of how long it had been running. `pastCoverThreshold`
    // is the only thing that may gate `.running`.
    expect(row?.className).not.toContain(styles.running);
  });

  it("adds the breathing class ONLY once pastCoverThreshold is true, never from status alone", () => {
    const { container } = render(
      <InvestigationChecklist
        checklist={RUNNING}
        announcement="Measure move running"
        pastCoverThreshold
        onInvestigate={noop}
      />,
    );

    const row = container.querySelector(`.${String(styles.row)}`);
    expect(row?.className).toContain(styles.running);
  });

  it("never applies the breathing class to a queued or completed row, however pastCoverThreshold is set", () => {
    for (const checklist of [QUEUED, COMPLETED]) {
      const { container, unmount } = render(
        <InvestigationChecklist
          checklist={checklist}
          announcement=""
          pastCoverThreshold
          onInvestigate={noop}
        />,
      );
      const row = container.querySelector(`.${String(styles.row)}`);
      expect(row?.className).not.toContain(styles.running);
      unmount();
    }
  });

  it("renders the completed row with the check icon and the real duration", () => {
    const { container } = render(
      <InvestigationChecklist
        checklist={COMPLETED}
        announcement="Measure move complete, 120 ms"
        pastCoverThreshold={false}
        onInvestigate={noop}
      />,
    );

    expect(screen.getByText("Measure move")).toBeTruthy();
    expect(screen.getByText("120 ms")).toBeTruthy();
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders the dropped-stream sentence in place of the last known row", () => {
    render(
      <InvestigationChecklist
        checklist={DROPPED}
        announcement={CONNECTION_LOST_SENTENCE}
        pastCoverThreshold={false}
        onInvestigate={noop}
      />,
    );

    // Twice: once in the row (replacing the step's own description) and
    // once in the live region, which carries the identical sentence.
    expect(screen.getAllByText(CONNECTION_LOST_SENTENCE)).toHaveLength(2);
    // The step's own description is replaced, not shown beside the sentence.
    expect(screen.queryByText("Measure move")).toBeNull();
  });

  it("holds a persistent role=status live region carrying exactly the announcement prop", () => {
    const { rerender } = render(
      <InvestigationChecklist
        checklist={RUNNING}
        announcement=""
        pastCoverThreshold={false}
        onInvestigate={noop}
      />,
    );

    const region = screen.getByRole("status");
    expect(region.textContent).toBe("");

    rerender(
      <InvestigationChecklist
        checklist={COMPLETED}
        announcement="Measure move complete, 120 ms"
        pastCoverThreshold={false}
        onInvestigate={noop}
      />,
    );

    // The SAME element, never unmounted — `BarSeriesPanel`/`ChartReading`'s
    // own shape: a region added at the same moment as its first
    // announcement is not reliably read by every screen reader.
    expect(screen.getByRole("status")).toBe(region);
    expect(region.textContent).toBe("Measure move complete, 120 ms");
  });

  it("the live region is present even with no checklist at all", () => {
    render(
      <InvestigationChecklist
        checklist={undefined}
        announcement=""
        pastCoverThreshold={false}
        onInvestigate={noop}
      />,
    );

    expect(screen.getByRole("status")).toBeTruthy();
  });
});
