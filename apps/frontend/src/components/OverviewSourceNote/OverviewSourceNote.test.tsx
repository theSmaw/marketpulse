import { MARKET_FEED_DESCRIPTIONS } from "@marketpulse/shared";
import type {
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { MarketFeedView } from "../../use-market-feed.js";
import { OverviewSourceNote } from "./OverviewSourceNote.js";

// What the landing screen's note reads as, as a definition list.
//
// **A concatenation rather than an element's text** (`CLAUDE.md`): this
// component splits every clause into a label and a sentence, so
// `getByText("IEX")` would pass against a note whose sentence had silently
// stopped rendering. The definition list is what a listener is handed, so the
// definition list is what is read.
//
// **Asserted against the shared vocabulary rather than literals**, for
// `overview-source-note.test.ts`' reason: a test spelling `All US exchanges`
// is a second producer of the product's most coverage-claiming string, and the
// invariant that refuses one reads `.test.tsx` out of its corpus.

const SIP = MARKET_FEED_DESCRIPTIONS.sip;
const IEX = MARKET_FEED_DESCRIPTIONS.iex;

const observed = (symbol: string): WireOverviewFigure => ({
  state: "observed",
  symbol,
  at: "2026-09-25T18:01:00.000Z",
  price: 774.03,
  changePercent: 0.42,
  changeBasis: "2026-09-24",
});

const frame = (
  figures: readonly WireOverviewFigure[],
  feeds: WireMarketOverview["feeds"] = [],
): WireMarketOverview => ({
  computedAt: "2026-09-25T18:01:32.000Z",
  feeds,
  figures,
});

const SESSION = frame([observed("SPY")], ["iex"]);
const NOT_CONFIGURED: MarketFeedView = { state: "not-configured" };

/** What a listener is handed for the definition beside one term. */
function definitionOf(term: string): string {
  const dt = screen.getByText(term, { selector: "dt" });
  const dd = dt.nextElementSibling;

  if (dd?.tagName !== "DD") {
    throw new Error(`The ${term} term has no definition beside it.`);
  }

  const parts: string[] = [];
  const walk = (node: Node): void => {
    if (node.nodeType === node.TEXT_NODE) {
      parts.push(node.textContent ?? "");
      return;
    }
    for (const child of Array.from(node.childNodes)) walk(child);
  };
  walk(dd);

  return parts.join(" ").replace(/\s+/gu, " ").trim();
}

describe("OverviewSourceNote", () => {
  it("draws nothing at all before a frame has arrived", () => {
    const { container } = render(
      <OverviewSourceNote overview={undefined} feed={NOT_CONFIGURED} />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("names both tapes during a session, as two terms", () => {
    // The whole of invariant 6 on this screen: an IEX numerator and a
    // consolidated-SIP denominator, which a single row could not state.
    render(<OverviewSourceNote overview={SESSION} feed={NOT_CONFIGURED} />);

    expect(definitionOf("Observed prices")).toBe(
      `${IEX.label} ${IEX.sentence ?? ""}`.trim(),
    );
    expect(definitionOf("Closing prices")).toContain(SIP.label);
  });

  it("stops naming the live feed when the chrome names it correctly", () => {
    render(
      <OverviewSourceNote
        overview={SESSION}
        feed={{ state: "configured", feed: "iex" }}
      />,
    );

    expect(screen.queryByText("Observed prices")).toBeNull();
    expect(definitionOf("Closing prices")).toContain(SIP.label);
  });

  it("renders the aggregate's instant last", () => {
    render(<OverviewSourceNote overview={SESSION} feed={NOT_CONFIGURED} />);

    const terms = screen.getAllByRole("term").map((term) => term.textContent);

    expect(terms).toEqual(["Observed prices", "Closing prices", "Computed"]);
    expect(definitionOf("Computed")).toBe("2026-09-25 14:01 EDT");
  });

  it("says no connection word in any state", () => {
    // Story 3.10's one-home rule: `live | stale | disconnected` belong to the
    // status bar, and this surface has never been allowed to answer them.
    const { container } = render(
      <OverviewSourceNote overview={SESSION} feed={NOT_CONFIGURED} />,
    );

    for (const word of ["LIVE", "STALE", "DISCONNECTED", "REPLAYING"]) {
      expect(container.textContent.toUpperCase()).not.toContain(word);
    }
  });

  it("declares no landmark, so the screen keeps seven named regions", () => {
    render(<OverviewSourceNote overview={SESSION} feed={NOT_CONFIGURED} />);

    expect(screen.queryAllByRole("region")).toHaveLength(0);
  });
});
