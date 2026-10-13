import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  SECTOR_ETFS,
  toTicker,
  type Bar,
  type EquitySecurity,
  type IndexEtfSecurity,
  type MarketDate,
  type SectorEtfSecurity,
  type SecurityLastClose,
  type WireMarketOverview,
  type WireOverviewFigure,
} from "@marketpulse/shared";

import {
  RelativePerformance,
  type RelativePerformanceProps,
} from "./RelativePerformance.js";

// What the region DRAWS. The arithmetic and the basis predicate are asserted
// directly in `relative-performance.test.ts`; what is here is the markup a
// reader meets, and the two things jsdom genuinely can see — **the text** and
// **the accessibility tree**.
//
// **What is deliberately not asserted**: colour (structurally impossible, no
// stylesheet is applied here), any height (jsdom computes no layout, so one
// height in every state is the browser's and the probe's), and any bracket
// length. The lengths are percentages on inline styles, which is the one piece
// of geometry a unit test can read, and they are read as *drawn or not* rather
// than as a measurement.

const BENCHMARK = SECTOR_ETFS.technology;
const MARKET = "SPY";

const NVDA: EquitySecurity = {
  symbol: toTicker("NVDA"),
  name: "NVIDIA Corporation",
  exchange: "NASDAQ",
  kind: "equity",
  sector: "technology",
  industry: "Semiconductors",
  status: "active",
  cik: null,
};

const XLK: SectorEtfSecurity = {
  ...NVDA,
  symbol: toTicker(BENCHMARK),
  name: "The Technology Select Sector SPDR Fund",
  kind: "sector_etf",
  industry: null,
};

const SPY: IndexEtfSecurity = {
  ...NVDA,
  symbol: toTicker(MARKET),
  name: "SPDR S&P 500 ETF Trust",
  kind: "index_etf",
  sector: null,
  industry: null,
};

const bar = (close: number): Bar => ({
  startsAt: new Date("2026-10-13T18:01:00.000Z"),
  open: close,
  high: close,
  low: close,
  close,
  volume: 1_000,
});

const CLOSE: SecurityLastClose = {
  symbol: toTicker("NVDA"),
  session: "2026-10-12" as MarketDate,
  close: 100,
  previousClose: 98.4,
};

const observed = (
  symbol: string,
  changePercent: number,
): WireOverviewFigure => ({
  state: "observed",
  symbol,
  at: "2026-10-13T18:01:00.000Z",
  price: 100,
  changePercent,
  changeBasis: "2026-10-12",
});

const stored = (
  symbol: string,
  sessionChangePercent: number,
): WireOverviewFigure => ({
  state: "stored",
  symbol,
  session: "2026-10-12",
  close: 100,
  sessionChangePercent,
});

const frame = (
  figures: readonly WireOverviewFigure[],
  sectors: readonly WireOverviewFigure[] = [],
): WireMarketOverview => ({
  computedAt: "2026-10-13T18:01:00.000Z",
  feeds: [],
  figures,
  sectors,
});

/**
 * **A spread rather than destructured defaults, and that is a defect avoided
 * rather than a style.** The first version took
 * `({ live = bar(104.2), ... } = {})`, and in JavaScript an explicitly passed
 * `undefined` *triggers* a parameter default — so `draw({ live: undefined })`
 * drew the fully-populated state and two tests asserting the honest-nothing
 * state passed against the complete one.
 */
const DEFAULTS: RelativePerformanceProps = {
  security: NVDA,
  live: bar(104.2),
  lastClose: CLOSE,
  overview: frame([observed(MARKET, 2)], [observed(BENCHMARK, 6)]),
};

const draw = (over: Partial<RelativePerformanceProps> = {}) =>
  render(<RelativePerformance {...DEFAULTS} {...over} />);

describe("RelativePerformance", () => {
  it("draws three figures and two separately labelled differences", () => {
    draw();

    expect(screen.getByText("+4.20%")).toBeTruthy();
    expect(screen.getByText("+6.00%")).toBeTruthy();
    expect(screen.getByText("+2.00%")).toBeTruthy();

    // Two labels and two values, never one prose sentence — the halves fail
    // independently and prose cannot be half-refused.
    expect(screen.getByText("Against Technology")).toBeTruthy();
    expect(screen.getByText("behind by 1.80 pts")).toBeTruthy();
    expect(screen.getByText("Against the broad market")).toBeTruthy();
    expect(screen.getByText("ahead by 2.20 pts")).toBeTruthy();
  });

  it("names both references on the rows, so a permutation is visible", () => {
    draw();

    // Eleven correct figures against eleven wrong labels satisfies every
    // arithmetic guard and is invisible in greyscale — `SectorRow.symbol`'s own
    // reasoning, with three rows instead of eleven.
    expect(screen.getByText(BENCHMARK)).toBeTruthy();
    expect(screen.getByText(MARKET)).toBeTruthy();
    expect(screen.getByText("Technology")).toBeTruthy();
  });

  it("states the scale, from the same rung the ladder prints", () => {
    draw();

    // A length is a claim about a quantity, so the quantity is on screen — and
    // it is on screen twice, in the ladder and in the footer, both read off one
    // value so they cannot drift.
    expect(screen.getByText(/±10%/u)).toBeTruthy();
  });

  it("carries the weighting clause, covering BOTH references in one sentence", () => {
    draw();

    expect(
      screen.getByText(
        /capitalisation-weighted, not the average of its members/u,
      ),
    ).toBeTruthy();
  });

  it("refuses both lines on a mixed basis while all three figures draw", () => {
    draw({ overview: frame([stored(MARKET, 2)], [stored(BENCHMARK, 6)]) });

    expect(screen.getByText("+4.20%")).toBeTruthy();
    expect(screen.getByText("+6.00%")).toBeTruthy();
    expect(screen.getAllByText("Measured from different closes")).toHaveLength(
      2,
    );
  });

  it("says the sector half does not apply on a market proxy", () => {
    draw({
      security: SPY,
      live: bar(668.2),
      overview: frame([observed(MARKET, 2)]),
    });

    expect(screen.getByText("A broad-market fund has no sector")).toBeTruthy();
  });

  it("says a sector fund is its own benchmark", () => {
    draw({ security: XLK, live: bar(187.67) });

    expect(
      screen.getByText("This security is its sector’s benchmark"),
    ).toBeTruthy();
  });

  it("keeps a held row out of the accessibility tree while keeping its room", () => {
    // **Room and nothing else.** The row is a real element so the pitch comes
    // from the row itself rather than from a `min-height` somewhere, and it is
    // `aria-hidden` so a listener is not read a label with no value under it.
    const { container } = draw({
      security: SPY,
      live: bar(668.2),
      overview: frame([observed(MARKET, 2)]),
    });

    expect(
      container.querySelectorAll('[aria-hidden="true"]').length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Technology")).toBeNull();
  });

  it("draws no mark for a silent reference, and still states the other half", () => {
    const { container } = draw({ overview: frame([observed(MARKET, 2)]) });

    expect(screen.getByText("Not heard from")).toBeTruthy();
    expect(screen.getByText("ahead by 2.20 pts")).toBeTruthy();

    // **One bracket rather than two**, counted by the inline `width` the bar
    // and the brackets carry and the ladder's labels do not: the bar, plus the
    // market's bracket, and nothing for a reference with no tick to measure to.
    expect(container.querySelectorAll("span[style*='width']").length).toBe(2);
  });

  it("holds the whole geometry and says nothing yet with no figure anywhere", () => {
    // CI's permanent state. The sentence itself is behind a 2,000 ms floor —
    // `useWaited` — so what is asserted here is that the region drew its own
    // geometry hidden rather than collapsing to nothing.
    const { container } = draw({
      live: undefined,
      lastClose: undefined,
      overview: undefined,
    });

    expect(container.textContent).not.toMatch(/pts/u);
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
    expect(
      screen.getByText(
        /capitalisation-weighted, not the average of its members/u,
      ),
    ).toBeTruthy();
  });

  it("draws the same held room before the universe answer resolves a security", () => {
    const { container } = draw({ security: undefined });

    expect(container.textContent).not.toMatch(/pts/u);
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it("prints a clipped figure exactly and draws no bracket", () => {
    const { container } = draw({ live: bar(162) });

    expect(screen.getByText("+62.00%")).toBeTruthy();
    expect(screen.getByText("ahead by 60.00 pts")).toBeTruthy();
    // The bar and nothing else carries a `width`: neither bracket is drawn,
    // because neither may be measured from a clipped end.
    expect(container.querySelectorAll("span[style*='width']").length).toBe(1);
  });

  it("speaks no feed word, no venue and no connection word", () => {
    const { container } = draw();

    expect(container.textContent).not.toMatch(
      /live|stale|disconnect|iex|all us exchanges/iu,
    );
  });
});
