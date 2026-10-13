import type { Meta, StoryObj } from "@storybook/react-vite";

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

import { Region } from "../Region/Region.js";
import { RelativePerformance } from "./RelativePerformance.js";

// `Relative performance`, in the seven states the wire can actually produce.
//
// `The rail that says how unusual.dc.html`, and `VISUAL-LANGUAGE.md`'s *The
// rail, and the anchored comparison track*. **Every state below is built by
// handing the shipped component a real security, a real `Bar`, a real
// `SecurityLastClose` and a real frame** — so each one holds a state the
// application can reach rather than one somebody typed. That matters more here
// than anywhere else on this screen, because the thing being reviewed is a
// **refusal**: a state built by setting a flag would prove nothing about
// whether the predicate produces it.
//
// **What to review side by side is height.** The region sits in a column of
// three with `Abnormal-move indicators` above it and `Anomaly history` below,
// so a state a pixel taller than its neighbour moves everything under it.
// `Movers` paid that already — 5 rows → 2 shrank the region by 81 px and
// stepped the whole lower page.
//
// **And the second thing to review is greyscale.** The two derived lines are
// achromatic on purpose: *ahead while falling* is a real state (`AheadWhile
// Falling` below), and the word is the whole direction channel.
//
// Every story is drawn **inside a `Region`**, which is how it appears on the
// security page: the box is what decides whether the content fits the rail's
// 419 px of content in a 453 px column at 1440. (324 px was measured on the
// wrong screen; corrected 2026-10-13, and in code only by Task 5.2.1.)

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
  symbol: toTicker(BENCHMARK),
  name: "The Technology Select Sector SPDR Fund",
  exchange: "ARCA",
  kind: "sector_etf",
  sector: "technology",
  industry: null,
  status: "active",
  cik: null,
};

const SPY: IndexEtfSecurity = {
  symbol: toTicker(MARKET),
  name: "SPDR S&P 500 ETF Trust",
  exchange: "ARCA",
  kind: "index_etf",
  sector: null,
  industry: null,
  status: "active",
  cik: null,
};

const bar = (close: number): Bar => ({
  startsAt: new Date("2026-10-13T18:01:00.000Z"),
  open: close,
  high: close,
  low: close,
  close,
  volume: 1_204_339,
});

/**
 * A stored close whose session is **before** the live bar's, which is the
 * ordinary mid-session state: `changeFromClose` measures from `close` and names
 * `2026-10-12` as the basis.
 */
const CLOSE: SecurityLastClose = {
  symbol: toTicker("NVDA"),
  session: "2026-10-12" as MarketDate,
  close: 100,
  previousClose: 98.4,
};

/** A stored close with nothing behind it — `changePercent` is `null`. */
const CLOSE_WITH_NO_BASIS: SecurityLastClose = {
  symbol: toTicker("NVDA"),
  session: "2026-10-12" as MarketDate,
  close: 100,
  previousClose: null,
};

const observed = (
  symbol: string,
  price: number,
  changePercent: number,
  changeBasis = "2026-10-12",
): WireOverviewFigure => ({
  state: "observed",
  symbol,
  at: "2026-10-13T18:01:00.000Z",
  price,
  changePercent,
  changeBasis,
});

const stored = (
  symbol: string,
  close: number,
  sessionChangePercent: number,
): WireOverviewFigure => ({
  state: "stored",
  symbol,
  session: "2026-10-12",
  close,
  sessionChangePercent,
});

/** Heard of, nothing held — which is every symbol on a gated machine. */
const unknown = (symbol: string): WireOverviewFigure => ({
  state: "unknown",
  symbol,
});

const frame = (
  figures: readonly WireOverviewFigure[],
  sectors: readonly WireOverviewFigure[] = [],
): WireMarketOverview => ({
  computedAt: "2026-10-13T18:01:00.000Z",
  feeds: ["iex"],
  figures,
  sectors,
});

const LIVE = frame(
  [observed(MARKET, 668.2, 0.42)],
  [observed(BENCHMARK, 187.67, 1.84)],
);

const meta = {
  title: "Market/RelativePerformance",
  component: RelativePerformance,
  parameters: { layout: "padded" },
  args: {
    security: NVDA,
    live: bar(104.2),
    lastClose: CLOSE,
    overview: LIVE,
  },
  render: (args) => (
    <Region name="Relative performance">
      <RelativePerformance {...args} />
    </Region>
  ),
} satisfies Meta<typeof RelativePerformance>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * **State 1 — complete.** Three moves on one anchored track and two
 * differences above it, in `pts` rather than `%`: the difference of two
 * percentages is percentage points, and the two brackets are the spans the
 * figures are read off.
 */
export const Complete: Story = {};

/**
 * **Ahead while falling**, which is why the derived lines are achromatic and
 * why the word is `ahead` rather than `outperforming`.
 *
 * The security is down 4.2%, its sector is down 6.0%, the market is down 1.0%.
 * So it is **ahead of its sector and behind the market, on a day everything
 * fell** — and a tinted cell here would read green and red at once inside a box
 * whose other three figures are red.
 */
export const AheadWhileFalling: Story = {
  args: {
    live: bar(95.8),
    overview: frame(
      [observed(MARKET, 660.1, -1)],
      [observed(BENCHMARK, 176.4, -6)],
    ),
  },
};

/**
 * **State 2 — nothing observed, and CI's permanent state.** 516 securities and
 * zero bars, so every figure is `unknown` for ever and the region draws its own
 * geometry held and invisible with one sentence over it.
 *
 * The sentence appears after a **2,000 ms floor** — `useWaited`, the proxy
 * strip's own rather than a second one — because an ordinary load's first frame
 * lands at 174–277 ms and a sentence that is replaced by figures a quarter of a
 * second later is a promise the next frame breaks. In the workshop this means
 * the box is empty for two seconds and then speaks, which **is** the state.
 */
export const NothingObserved: Story = {
  args: { live: undefined, lastClose: undefined, overview: undefined },
};

/**
 * **The state every gated run is permanently in, and it is NOT state 1.**
 *
 * CI's store is 516 securities and zero bars, so the aggregate **arrives** and
 * carries `unknown` for every symbol in it. *Nothing has reached us yet* and
 * *everything reached us and none of it had a move* are different facts, and
 * `/` paid for collapsing them once already (Task 4.3.8) — so this draws three
 * named rows each stating its own absence and two refusals, rather than hiding
 * all of it behind `No comparison yet.` and telling the reader the socket is
 * quiet when it is not.
 */
export const EverythingUnknown: Story = {
  args: {
    live: undefined,
    lastClose: undefined,
    overview: frame([unknown(MARKET)], [unknown(BENCHMARK)]),
  },
};

/**
 * **State 3 — no move for the subject, with both references present.**
 *
 * The store holds one close for this security and nothing before it, so
 * `changePercent` is `null`: there is a price and no basis. Both references
 * still draw their own figures and their own ticks, and both derived lines are
 * refused — which is the distinction the whole region rests on. A figure being
 * absent is not the same as a comparison being wrong.
 */
export const NoMoveForTheSubject: Story = {
  args: {
    live: undefined,
    lastClose: CLOSE_WITH_NO_BASIS,
    overview: frame(
      [stored(MARKET, 668.2, 0.42)],
      [stored(BENCHMARK, 187.67, 1.84)],
    ),
  },
};

/**
 * **State 4 — no sector.** `/securities/SPY` is a reachable route and the type
 * forces the branch: an `index_etf` has `sector: null`, so there is no
 * benchmark to compare against and the clause is **absent rather than empty**.
 *
 * The sector row is **held room** — in the list, off the screen, out of the
 * accessibility tree — so this route is the same height as every other, and the
 * line says why rather than drawing an em dash where a number would be.
 */
export const NoSector: Story = {
  args: {
    security: SPY,
    live: bar(668.2),
    lastClose: { ...CLOSE, symbol: toTicker(MARKET) },
    overview: frame([observed(MARKET, 668.2, 0.42)]),
  },
};

/**
 * **State 5 — a reference is silent.** The benchmark is not on the frame at
 * all, so **its tick is not drawn at zero**: absent and unchanged are different
 * claims, and a tick at the anchor is the second one.
 *
 * The market half is unaffected and still states its difference, which is the
 * point of two separately labelled lines.
 */
export const SilentReference: Story = {
  args: { overview: frame([observed(MARKET, 668.2, 0.42)]) },
};

/**
 * **State 6 — the basis refusal, and the reason this task was indivisible.**
 *
 * The subject has a **live** price measured against a close; both references
 * are **stored** session moves. Same units, different claims — one moves while
 * somebody watches it and one is a session that is over — so the subtraction is
 * refused and the region says so rather than producing a number that looks
 * exactly like the answer.
 *
 * **All three figures still draw.** Each is true; only the derived line is
 * refused.
 */
export const BasisRefused: Story = {
  args: {
    overview: frame(
      [stored(MARKET, 668.2, 0.42)],
      [stored(BENCHMARK, 187.67, 1.84)],
    ),
  },
};

/**
 * **State 7 — the subject IS a reference.** On `/securities/XLK` the security
 * is its own sector's benchmark, so the sector comparison would be with itself.
 *
 * Hiding the region on those fifteen routes was refused (Gate 1 decision 10):
 * no other region on this page changes by security kind, and ADR 0039's
 * unconditional tab stop would make it a disappearing landmark.
 */
export const SubjectIsItsBenchmark: Story = {
  args: {
    security: XLK,
    live: bar(187.67),
    lastClose: { ...CLOSE, symbol: toTicker(BENCHMARK) },
    overview: LIVE,
  },
};

/**
 * **A clipped figure prints exactly and draws no bracket**, which is done-when
 * 4 and a decision rather than a limitation: a bracket between a clipped end
 * and an unclipped tick is a *wrong* length rather than a saturated one, and
 * the printed figures are what the reader is owed.
 *
 * The subject is up 62% on a ±50 rung — the widest this region has — so the bar
 * reaches the end of the track while the row reads `+62.00%`.
 */
export const ClippedSubject: Story = {
  args: { live: bar(162) },
};
