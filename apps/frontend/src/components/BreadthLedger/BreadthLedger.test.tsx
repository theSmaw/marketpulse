import { act, cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  WireMarketBreadth,
  WireMarketOverview,
} from "@marketpulse/shared";

import { marketBreadth } from "../../market/index.js";
import { SAY_NOTHING_ARRIVED_AFTER_MS } from "../MarketProxyStrip/use-waited.js";
import { BreadthLedger, BreadthLedgerReservation } from "./BreadthLedger.js";

// **What this level cannot see**, which is why the browser spec and `pnpm
// probe` are the other half of this task: no stylesheet is applied in jsdom, so
// the three tracks, the 2 px band floor, the origin rule and the two-line
// footer reserve are all invisible here — and `visibility: hidden` leaves every
// string in `textContent`. Colour is structurally unassertable at this level by
// design.
//
// What *is* assertable is the thing the component owes a reader: which figures
// are drawn, which are suppressed, and what a screen reader is handed.

const OBSERVED: WireMarketBreadth = {
  basis: "observed",
  advancing: 284,
  declining: 152,
  unchanged: 15,
  measured: 451,
  tracked: 503,
  windowMinutes: 5,
};

const frame = (breadth: WireMarketBreadth): WireMarketOverview => ({
  computedAt: "2026-10-07T18:01:38.000Z",
  feeds: ["iex"],
  figures: [],
  breadth,
});

/** Through the shipped reader, so a test holds a state the application reaches. */
const draw = (breadth: WireMarketBreadth = OBSERVED) => {
  const view = marketBreadth(frame(breadth));
  if (view === undefined)
    throw new Error("the fixture built an unreadable section");
  return render(<BreadthLedger view={view} />);
};

describe("BreadthLedger", () => {
  it("draws three rows, each a label and the count it labels", () => {
    draw();

    const rows: readonly (readonly [string, string])[] = [
      ["Advancing", "284"],
      ["Declining", "152"],
      ["Unchanged", "15"],
    ];

    for (const [label, count] of rows) {
      const term = screen.getByText(label);
      expect(term.tagName).toBe("DT");
      expect(term.nextElementSibling?.textContent).toBe(count);
    }
  });

  it("hands a listener one value per term, so the band is not read", () => {
    // The band is a second `dd` and is `aria-hidden`: a listener gets
    // `Advancing 284` and not `Advancing 284 blank`.
    const { container } = draw();
    const bands = container.querySelectorAll("dd[aria-hidden='true']");

    expect(bands).toHaveLength(3);
  });

  it("draws the remainder below the rule, in its own list under its own heading", () => {
    const { container } = draw();

    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading.textContent).toBe("Of the 503 we track");

    // The group is a second `<dl>`, labelled by that heading — so a listener
    // meets the remainder under its own name rather than as a fourth row of the
    // ledger.
    const groups = container.querySelectorAll("dl");
    expect(groups).toHaveLength(2);
    expect(groups[1]?.getAttribute("aria-labelledby")).toBe(heading.id);

    expect(
      screen.getByText("Not heard from").nextElementSibling?.textContent,
    ).toBe("52");
  });

  it("never writes the fourth word for the remainder", () => {
    const { container } = draw();

    expect(container.innerHTML.toLowerCase()).not.toContain("unobserved");
  });

  it("borrows PriceChange for the headline rather than spelling a glyph", () => {
    draw();

    // `PriceChange` brings the glyph, the hidden spoken word and the ink as one
    // pairing — so the direction survives the colour being removed, and the
    // ledger below spells none of the three.
    expect(screen.getByText("up")).toBeDefined();
    expect(screen.getByText("+132")).toBeDefined();
    expect(screen.getByText("Net advancing")).toBeDefined();
  });

  it("drops the caption's direction at a net of zero, and only there", () => {
    // **The owner's call at Gate 2, 2026-10-08.** Task 4.4.8's produced state
    // grid drew `NET ADVANCING` over `— unchanged 0` — a caption naming a
    // direction the figure beneath it denies — and two of the eighteen states
    // reach it. Every channel was individually correct, which is why nothing
    // mechanical found it and why this test exists.
    //
    // Both halves in one test, because the claim is a **difference**: a test
    // of the zero case alone would stay green if the caption lost its
    // direction everywhere, which is the other way to get this wrong.
    draw();
    expect(screen.getByText("Net advancing")).toBeDefined();
    expect(screen.queryByText("Net")).toBeNull();

    cleanup();

    // 220 / 220 / 11 — state `12`, a perfectly split market. `measured` is
    // their sum, so the section is readable and the headline is drawn.
    draw({
      ...OBSERVED,
      advancing: 220,
      declining: 220,
      unchanged: 11,
      measured: 451,
    });

    // The caption loses its direction; the figure, the glyph and the spoken
    // word are untouched, because they already said `unchanged`.
    expect(screen.getByText("Net")).toBeDefined();
    expect(screen.queryByText("Net advancing")).toBeNull();
    // Scoped to the headline's own paragraph: `0` occurs more than once in
    // this region (the net, and any bucket that counts none), and an unscoped
    // match would be ambiguous in exactly the state this test is about.
    const headline = screen.getByText("unchanged").closest("p");
    expect(headline?.textContent).toContain("0");
  });

  it("keeps the caption neutral where there is no net at all", () => {
    // N = 0: nothing to subtract, so the headline is suppressed entirely and
    // this caption is never read. It is asserted anyway because the element is
    // still in the DOM, held rather than removed (the 1 px rule and its 16 px
    // margin stay in the budget) — and **a held element must not hold a
    // claim**, which is the same ADR 0029 clause the suppressed figures take.
    draw({
      ...OBSERVED,
      advancing: 0,
      declining: 0,
      unchanged: 0,
      measured: 0,
    });

    expect(screen.queryByText("Net advancing")).toBeNull();
  });

  it("spells no glyph in the ledger, where the label is the direction", () => {
    const { container } = draw();
    const ledger = container.querySelector("dl");

    // One glyph in the whole region, and it is the headline's. Spoken,
    // `Advancing up 284` would be the redundancy audible.
    expect(ledger?.textContent).not.toContain("▲");
    expect(ledger?.textContent).not.toContain("▼");
  });

  it("draws no band for a count of zero, and the row still renders", () => {
    const { container } = draw({
      ...OBSERVED,
      advancing: 299,
      unchanged: 0,
      measured: 451,
    });

    expect(screen.getByText("Unchanged").nextElementSibling?.textContent).toBe(
      "0",
    );
    // Two bands for three rows: the zero row's cell is present and empty, which
    // is what the origin rule runs through.
    expect(
      container.querySelectorAll("dd[aria-hidden='true'] > i"),
    ).toHaveLength(2);
  });

  it("prints N as the ladder's right endpoint and nothing between the ends", () => {
    const { container } = draw();
    const ticks = [...container.querySelectorAll("span")]
      .map((span) => span.textContent)
      .filter((text) => text === "0" || text === "451");

    expect(ticks).toEqual(["0", "451"]);
  });

  it("hands a listener the denominator the ladder cannot", () => {
    // **The finding Task 4.4.5 recorded**: N is printed once, at the ladder's
    // right endpoint, and the ladder is `aria-hidden` — so this clause is the
    // only route by which the number this story exists to put on screen reaches
    // a listener. Verified in a browser from the accessibility tree; what is
    // assertable here is that the two renderings are there and are not the
    // same string.
    const { container } = draw();
    const claim = [...container.querySelectorAll("p")].at(-1);
    const [drawn, spoken] = [...(claim?.querySelectorAll("span") ?? [])];

    expect(drawn?.getAttribute("aria-hidden")).toBe("true");
    expect(drawn?.textContent).toBe(
      "Heard from means at least one observation in the last 5 minutes.",
    );
    expect(spoken?.getAttribute("aria-hidden")).toBeNull();
    expect(spoken?.textContent).toBe(
      "Of the 503 companies we track, 451 were heard from in the last 5 minutes.",
    );
  });

  it("draws no band, no origin rule and no ladder over one security", () => {
    // **N = 1 is where the arithmetic is sound and the picture lies**: one
    // security is a fraction of `1` and fills the whole track, which reads as
    // *the market is entirely advancing*. The counts stay and the picture goes,
    // together, and the room is held exactly as at N = 0.
    const { container } = draw({
      ...OBSERVED,
      advancing: 1,
      declining: 0,
      unchanged: 0,
      measured: 1,
    });

    expect(screen.getByText("Advancing").nextElementSibling?.textContent).toBe(
      "1",
    );
    expect(
      container.querySelectorAll("dd[aria-hidden='true'] > i"),
    ).toHaveLength(0);
    // The ladder's endpoint is empty rather than `1` — nothing is drawn against
    // a scale, so the scale is not printed.
    expect(container.textContent).not.toContain("01");
  });

  it("suppresses the headline at N = 0 rather than drawing a net over nothing", () => {
    // ADR 0029, and CI's permanent state. The quiet group is the only thing
    // with content; everything else keeps its room.
    draw({
      basis: "session",
      advancing: 0,
      declining: 0,
      unchanged: 0,
      measured: 0,
      tracked: 503,
      session: "2026-10-07",
    });

    expect(screen.queryByText("up")).toBeNull();
    expect(screen.queryByText("down")).toBeNull();
    expect(
      screen.getByText("No prior close").nextElementSibling?.textContent,
    ).toBe("503");
  });

  it("draws the sentence itself at N = 0, where there is no ladder", () => {
    // Done-when: *the sentence, no figures.* The quiet group above it carries
    // the set and the remainder; this is the one sentence the state draws, and
    // a second one over the held rows would be the same fact a third time.
    const { container } = draw({
      basis: "session",
      advancing: 0,
      declining: 0,
      unchanged: 0,
      measured: 0,
      tracked: 503,
      session: "2026-10-07",
    });
    const claim = [...container.querySelectorAll("p")].at(-1);

    expect(claim?.textContent).toBe(
      "Of the 503 companies we track, none had a close-to-close move on 2026-10-07.",
    );
    // **One string, so one element** — a hidden twin of an identical string
    // would put the sentence in `textContent` twice.
    expect(claim?.querySelectorAll("span")).toHaveLength(0);
  });

  it("states the window and no instant, and names no connection word", () => {
    const { container } = draw();
    const text = container.textContent;

    expect(text).toContain(
      "Heard from means at least one observation in the last 5 minutes.",
    );
    // The frame this was read from carries the aggregate's instants and
    // `OverviewSourceNote` draws one of them — under `Observed through` since
    // Task 4.8.12; the region prints no instant.
    expect(text).not.toContain("18:01");
    for (const word of ["LIVE", "STALE", "DISCONNECTED", "IEX"]) {
      expect(text).not.toContain(word);
    }
  });

  it("takes the held geometry out of the accessibility tree", () => {
    const { container } = render(<BreadthLedgerReservation />);

    // The hidden box is the inner one, and it is hidden in every state — the
    // sentence is a sibling in the room it holds, never the same element, or
    // showing the sentence would un-hide three row labels with it.
    expect(
      container.querySelector('[aria-hidden="true"]')?.firstElementChild,
    ).not.toBeNull();
    // Three rows of room, and no word a reader could assert.
    expect(container.querySelectorAll("dl > div")).toHaveLength(4);
    expect(container.textContent).not.toContain("Not heard from");
  });

  it("says nothing until the floor has elapsed, and then says what it has none of", async () => {
    // **`useWaited`'s floor reused rather than a second one invented** — 2,000
    // ms against a first frame measured at 174–277 ms, so the ordinary load
    // never shows this. What it guards is the state a reader actually meets: an
    // unreachable aggregate, where `overview` is never written and the
    // reservation is **terminal** rather than a flash.
    vi.useFakeTimers();
    try {
      render(<BreadthLedgerReservation />);
      expect(screen.queryByText("No count yet.")).toBeNull();

      await act(async () => {
        vi.advanceTimersByTime(SAY_NOTHING_ARRIVED_AFTER_MS + 1);
        await Promise.resolve();
      });

      // **The words are breadth's own.** The strip has no *prices* and sectors
      // have no *moves*; breadth has no **count**, which is a third quantity
      // and the thing that tells a reader which region went quiet.
      expect(screen.getByText("No count yet.")).toBeDefined();
      expect(screen.queryByText("No prices yet.")).toBeNull();
      expect(screen.queryByText("No sector moves yet.")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
