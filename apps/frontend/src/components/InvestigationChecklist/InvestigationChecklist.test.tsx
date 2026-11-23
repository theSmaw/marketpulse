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
      claim: undefined,
      confidence: undefined,
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
      claim: undefined,
      confidence: undefined,
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
      claim: "Traded at 184.52 on 12,480 shares in the latest bar",
      confidence: "SUPPORTED",
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
  it("renders nothing visible before any press — Done-when 2", () => {
    // The `Investigate` button itself is NOT this component's: it lives in
    // `Region`'s own `meta` slot (`SecurityExplorer.tsx`), so a reader who
    // has never pressed it sees the live region's empty text node and
    // nothing else here.
    const { container } = render(
      <InvestigationChecklist
        checklist={undefined}
        announcement=""
        pastCoverThreshold={false}
      />,
    );

    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector(`.${String(styles.checklist)}`)).toBeNull();
  });

  it("renders a queued row with held room, no svg, no duration", () => {
    const { container } = render(
      <InvestigationChecklist
        checklist={QUEUED}
        announcement=""
        pastCoverThreshold={false}
      />,
    );

    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelectorAll(`.${String(styles.row)}`)).toHaveLength(
      1,
    );
  });

  it("publishes each row's own status as `data-step` — the hook the browser suite scopes to", () => {
    // Task 7.2.7. A row carries no role and no accessible name, so with six
    // of them a browser spec has nothing semantic to count or to scope a
    // per-step duration assertion to. Asserted here as well as there
    // because this is the cheap level: a renamed attribute would otherwise
    // surface as a five-minute browser run going red.
    const mixed: ChecklistState = {
      ...RUNNING,
      steps: [...COMPLETED.steps, ...RUNNING.steps, ...QUEUED.steps],
    };

    const { container } = render(
      <InvestigationChecklist
        checklist={mixed}
        announcement=""
        pastCoverThreshold={false}
      />,
    );

    expect(
      [...container.querySelectorAll("[data-step]")].map((row) =>
        row.getAttribute("data-step"),
      ),
    ).toStrictEqual(["completed", "running", "queued"]);
  });

  it("renders a running row under the cover threshold with no breathing class", () => {
    const { container } = render(
      <InvestigationChecklist
        checklist={RUNNING}
        announcement=""
        pastCoverThreshold={false}
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
      />,
    );

    const region = screen.getByRole("status");
    expect(region.textContent).toBe("");

    rerender(
      <InvestigationChecklist
        checklist={COMPLETED}
        announcement="Measure move complete, 120 ms"
        pastCoverThreshold={false}
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
      />,
    );

    expect(screen.getByRole("status")).toBeTruthy();
  });
});

describe("the claim (Task 7.3.1)", () => {
  it("draws the claim as a second line on a row that has one", () => {
    render(
      <InvestigationChecklist
        checklist={COMPLETED}
        announcement=""
        pastCoverThreshold={false}
      />,
    );

    expect(
      screen.getByText("Traded at 184.52 on 12,480 shares in the latest bar"),
    ).toBeTruthy();
  });

  it("draws NOTHING where a row has no claim — absent rather than empty", () => {
    // ADR 0029's rule at the clause level: a queued row, a running row and an
    // `inapplicable` step each have nothing to say, so there is no reserved
    // room and no `NBSP` here. The growth that costs is Task 7.3.2's layout
    // question rather than this task's to hide from.
    const { container } = render(
      <InvestigationChecklist
        checklist={QUEUED}
        announcement=""
        pastCoverThreshold={false}
      />,
    );

    const row = container.querySelector(`.${styles.row ?? ""}`);
    if (row === null) throw new Error("expected a row");
    // Three paragraphs — glyph, description, duration — and no fourth.
    expect(row.querySelectorAll("p")).toHaveLength(2);
  });

  it("adds ZERO focusable elements and ZERO click handlers to a row — AC 7", () => {
    // **The structural assertion AC 7 asks for rather than a sentence in a
    // record.** No evidence panel, no finding card and no click-to-focus
    // interaction exists: those are `PRODUCT_SPEC.md` §8.2's and Epic 8's by
    // citation, and the easiest way to ship them early by accident is one
    // `onClick`.
    const { container } = render(
      <InvestigationChecklist
        checklist={COMPLETED}
        announcement=""
        pastCoverThreshold={false}
      />,
    );

    expect(
      container.querySelectorAll(
        'a, button, input, select, textarea, [tabindex], [role="button"]',
      ),
    ).toHaveLength(0);

    const claim = screen.getByText(
      "Traded at 184.52 on 12,480 shares in the latest bar",
    );
    expect(claim.tagName).toBe("P");
    expect(claim.getAttribute("tabindex")).toBeNull();
    expect(claim.getAttribute("role")).toBeNull();
    // A click handler is not readable from the DOM, so the tag is the
    // assertion: a `<p>` React rendered with no `onClick` has no listener,
    // and a `<button>` or a `[tabindex]` would have failed the query above.
  });
});
