import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  WireMarketBreadth,
  WireMarketOverview,
} from "@marketpulse/shared";

import { marketBreadth } from "../../market/index.js";
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

  it("states the window and no instant, and names no connection word", () => {
    const { container } = draw();
    const text = container.textContent;

    expect(text).toContain(
      "Heard from means at least one observation in the last 5 minutes.",
    );
    // `computedAt` is on the frame this was read from and `OverviewSourceNote`
    // draws it under `Computed`; the region prints no instant.
    expect(text).not.toContain("18:01");
    for (const word of ["LIVE", "STALE", "DISCONNECTED", "IEX"]) {
      expect(text).not.toContain(word);
    }
  });

  it("takes the whole reservation out of the accessibility tree", () => {
    const { container } = render(<BreadthLedgerReservation />);

    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    // Three rows of room, and no word a reader could assert.
    expect(container.querySelectorAll("dl > div")).toHaveLength(4);
    expect(container.textContent).not.toContain("Not heard from");
  });
});
