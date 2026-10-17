import { mkdir, writeFile } from "node:fs/promises";

import type {
  MarketFeed,
  WireMarketBreadth,
  WireMarketMovers,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { serveFeed } from "../support/feed.js";
import {
  HEALTH_ROUTE_PATTERN,
  SECURITIES_ROUTE_PATTERN,
} from "../support/pair.js";
import {
  sessionUnusualSection,
  unrankedSection,
  unusualRow,
  unusualSection,
} from "../support/unusual.js";

// **The landing screen's whole degraded set, produced and compared** (Task
// 4.7.9) — and the grid IS this file rather than a table in a document beside
// it.
//
// ## Why that is the shape, in `docs/GAPS.md` entry 13's own words
//
// > for each published state grid, take the **producers** rather than the
// > renderers … and confirm every row is reachable from one of them, and that
// > every reachable pair has a row.
//
// Two grids have discharged that by construction and a third was deleted. Task
// 3.10.9's lived in `scripts/state-grid.mjs`, which is gone, and with it went
// the repair for *the harness answers the browser's own retry* — carried back
// into the shared harness two epics later, by hand, by Task 4.7.1. Task
// 4.7.2's lived in `e2e/specs/degraded-grid-producer.spec.ts`, which was run
// twice and deleted on purpose, so its 28 rows are a quotation in a task file
// and nothing re-takes them. Task 4.8.12's lived in
// `overview-source-note.spec.ts` and **is still running**.
//
// So this is the third of that shape and the first over the whole screen: every
// row below is produced through the shipped socket path, read back as the
// string a reader is handed, printed by the run, and **asserted against a
// declared collision class**. A row nothing can produce cannot appear in it, a
// row whose spelling drifts cannot stay in it, and — the half that is new — a
// documented collision that has silently stopped holding cannot stay in it
// either.
//
// ## Produced, and furnished, which the grid says per row
//
// **Produced** is the transition: the socket, the connect sequence, the
// shipped encoder, the shipped decoder, the 2,000 ms gate, the renderer, the
// close code, the page's own retry. **Furnished** is the content: which
// figures the frame carries. Every row here is produced; `kind` says which
// rows are additionally furnished in the stronger sense of carrying a frame
// **no shipped producer can build** — `WireMarketOverviewInputs.breadth` and
// `.movers` are non-optional, so an aggregate missing one models a pinned
// previous image and is labelled `rollback`.
//
// **No state here is reached by setting a component's props or a view
// object's fields.** The one state this screen has that no frame can produce —
// a region whose content **threw** — is therefore not in this grid, and
// `ENUMERATED_AND_NOT_PRODUCED` at the foot of this file says where it is
// owned instead.
//
// ## Eight surfaces, compared separately — and the eighth arrived two epics late
//
// **`Unusual activity` was not in this grid at all until Task 5.4.6**, and the
// reason it went unnoticed is worth more than the repair: this file keys on
// the **text** of named surfaces, so Task 5.4.1 re-areaed the entire landing
// grid and this spec passed 4 of 4 with no expectation changed in either
// direction, and Task 5.4.4 added two new footer strings and it passed again.
// A region that is not a surface is invisible here however much it changes,
// and geometry is invisible here full stop — *one height in every state* is
// `pnpm probe`'s claim and this spec's silence is not evidence for it.
//
// **Adding it was not a re-key; it was a new surface plus four new rows, and
// it falsified the six aggregates already here.**
// `WireMarketOverviewInputs.unusual` is **not optional**, so every frame a
// shipped gateway has built since Task 5.4.2 carries the section — which means
// every aggregate in this file that omits it was modelling a **pinned previous
// image** while claiming to be CI's shape, a running session or a closed
// market. They now carry it at the value the producer would send, and the one
// row that omits it says so in its `kind`.
//
// ## One whole-`main` string per state is strictly weaker than eight
//
// One whole-`main` string per state is strictly weaker than eight: two states
// differing only in a breadth footer are "distinct" while a reader of the
// sector region cannot tell them apart. And the **chrome** is in the key
// because of what Task 4.7.2 measured — three states are byte-identical over
// all five content surfaces at every width and separate only on the two footer
// cells, so a collision assertion written over `main` alone goes red on ADR
// 0029's one-home rule working correctly.
//
// The **masthead** is recorded per row and excluded from both keys. Its clock
// mutates every second, and the one fact it carries that this grid cares about
// — whether the market is open — is read from the wall clock rather than from
// any frame, so it cannot be driven at all. That is not a convenience: it is
// the whole of this screen's *market shut* versus *feed stopped* distinction,
// and it is a declared collision class below.

const OVERVIEW = "/";

/** The one venue value — `overview-proxy-live-update.spec.ts`'s rule. */
const VENUE: MarketFeed = "iex";

/** 14:01 ET on a Wednesday, so no extended-hours word anywhere on the page. */
const AT = "2026-09-16T18:01:00Z";

/**
 * **The session `AT` falls in**, which is the session a mid-session frame's
 * baseline generation is keyed by (ADR 0044) — spelled once because the
 * furnished `unusual` sections on this frame would otherwise date their
 * baseline a month after the figures above them.
 */
const SESSION = "2026-09-16";

/** A second join, later, over the same observations — see `one-aggregate-two-joins`. */
const LATER = "2026-09-16T21:44:11Z";

const WIDTHS = [1440, 1024, 768, 390] as const;

/**
 * Whether to write the contact sheet as well as the grid.
 *
 * **The strings are the record and the photographs are the illustration**, and
 * only the first can be asserted — nothing below `pnpm e2e` can see a layout
 * and nothing at any level can see *reads as designed*. So the assertion runs
 * on every gated run and the 136 PNGs are produced by a person who is going to
 * look at them:
 *
 * **The count is `STATES.length × WIDTHS.length × 2` and it is written here
 * because it has been wrong before.** It read `112` from Task 4.7.9 until Task
 * 5.4.6, against thirteen states at four widths in colour and in greyscale —
 * which is **104**. Nothing can check a number in a comment, so the arithmetic
 * is spelled beside it: 17 × 4 × 2 = 136.
 *
 * ```
 * DEGRADED_GRID_PHOTOS=1 pnpm e2e overview-degraded-grid.spec.ts
 * ```
 *
 * They land in `.capture/overview-degraded-grid/`, which is gitignored, beside
 * a `readings.json` of every row. Task 4.7.2's producer was a throwaway and
 * its photographs outlived the thing that made them; this way the picture and
 * the claim cannot come apart.
 */
const PHOTOGRAPH = process.env.DEGRADED_GRID_PHOTOS === "1";

const CAPTURE = ".capture/overview-degraded-grid";

const observed = (
  symbol: string,
  price: number,
  changePercent: number,
): WireOverviewFigure => ({
  state: "observed",
  symbol,
  at: AT,
  price,
  changePercent,
  changeBasis: "2026-09-15",
});

const stored = (symbol: string, close: number): WireOverviewFigure => ({
  state: "stored",
  symbol,
  session: "2026-09-11",
  close,
});

const unknown = (symbol: string): WireOverviewFigure => ({
  state: "unknown",
  symbol,
});

const PROXIES = [
  observed("SPY", 774.03, 0.42),
  observed("QQQ", 601.88, 0.61),
  observed("DIA", 525.79, -0.18),
  observed("IWM", 288.89, 0.07),
];

const CLOSED_PROXIES = [
  stored("SPY", 764.29),
  stored("QQQ", 714.88),
  stored("DIA", 525.79),
  stored("IWM", 288.89),
];

const NO_PROXIES = ["SPY", "QQQ", "DIA", "IWM"].map(unknown);

const SECTOR_MOVES: readonly (readonly [string, number])[] = [
  ["XLK", 1.32],
  ["XLI", 1.07],
  ["XLC", 0.99],
  ["XLY", 0.89],
  ["XLRE", 0.86],
  ["XLF", 0.67],
  ["XLB", 0.37],
  ["XLP", 0.35],
  ["XLE", 0.32],
  ["XLV", 0.22],
  ["XLU", -0.12],
];

const SECTORS = SECTOR_MOVES.map(([symbol, percent]) =>
  observed(symbol, 100, percent),
);

const NO_SECTORS = SECTOR_MOVES.map(([symbol]) => unknown(symbol));

const GAINERS: readonly (readonly [string, number])[] = [
  ["HPE", 12.44],
  ["DELL", 11.98],
  ["NTAP", 8.54],
  ["ON", 8.51],
  ["HPQ", 8.4],
];

const LOSERS: readonly (readonly [string, number])[] = [
  ["ALB", -3.76],
  ["STX", -3.73],
  ["SNDK", -3.5],
  ["WDC", -2.98],
  ["EW", -2.82],
];

const observedMovers = (
  up: readonly (readonly [string, number])[],
  down: readonly (readonly [string, number])[],
): WireMarketMovers => ({
  basis: "observed",
  gainers: up.map(([symbol, percent]) => observed(symbol, 100, percent)),
  losers: down.map(([symbol, percent]) => observed(symbol, 100, percent)),
  // Large enough that the selection cannot exceed it (`readMovers`' first
  // cross-field check) and no larger than `tracked` (its second) — and **zero**
  // when nothing was rankable, which is CI's permanent state.
  eligible: up.length + down.length === 0 ? 0 : 466,
  tracked: 503,
  windowMinutes: 5,
});

/**
 * A stored row's move, and the field name is the whole of a produced defect.
 *
 * **It is `sessionChangePercent`, never `changePercent`.** The first draft of
 * this file put `changePercent` on a `stored` figure, which **typechecks**: the
 * literal is returned from a `.map` callback with no contextual type, so there
 * is no freshness check and the extra key is structurally harmless. Three
 * layers later the whole `Movers` region drew its RESERVED panel in four rows
 * of this grid — because `storedFigureFields` walks the **map's** keys (ADR
 * 0031), so an undeclared field is silently dropped on the wire, which leaves
 * every row with no move, which makes the list unrankable, which makes
 * `readMovers` refuse the section, which is indistinguishable from a rollback.
 *
 * `WireStoredFigure`'s own docblock is explicit that this is a different claim
 * from the observed field — *close-against-the-previous-close for a session
 * that is over* — and that *"a renderer that reached for `changePercent` on a
 * stored figure and found one would print Friday's move as today's"*. What it
 * does not say, and what this cost, is that a WRITER reaching for the wrong one
 * loses a region and is told nothing.
 */
const storedMover = (
  symbol: string,
  sessionChangePercent: number,
): WireOverviewFigure => ({
  state: "stored",
  symbol,
  session: "2026-09-11",
  close: 100,
  sessionChangePercent,
});

const sessionMovers = (): WireMarketMovers => ({
  basis: "session",
  gainers: GAINERS.map(([symbol, percent]) => storedMover(symbol, percent)),
  losers: LOSERS.map(([symbol, percent]) => storedMover(symbol, percent)),
  eligible: 503,
  tracked: 503,
  session: "2026-09-11",
});

const OBSERVED_BREADTH: WireMarketBreadth = {
  basis: "observed",
  advancing: 284,
  declining: 152,
  unchanged: 30,
  measured: 466,
  tracked: 503,
  windowMinutes: 5,
};

/** Breadth over an empty eligibility window: `measured: 0`, and it sums. */
const BREADTH_OF_NOTHING: WireMarketBreadth = {
  basis: "observed",
  advancing: 0,
  declining: 0,
  unchanged: 0,
  measured: 0,
  tracked: 503,
  windowMinutes: 5,
};

const SESSION_BREADTH: WireMarketBreadth = {
  basis: "session",
  advancing: 335,
  declining: 166,
  unchanged: 2,
  measured: 503,
  tracked: 503,
  session: "2026-09-11",
};

// ---------------------------------------------------------------------------
// The eighth surface's figures (Task 5.4.6)
// ---------------------------------------------------------------------------

/**
 * **Ten securities behaving least like themselves**, in the one order
 * `compareByPercentile` admits for these ordinals.
 *
 * The order is not a preference: `readUnusual`'s fourth cross-field check is
 * `isRankedByPercentile`, and the ordinal comparator **breaks ties on ticker
 * ascending** — so a correct frame admits exactly one arrangement and a
 * swapped pair refuses the whole section. Task 5.4.5 produced that by hand,
 * putting `MNST (96)` ahead of `GOOGL (96)`, and what reached the screen was
 * not a mis-ordered list: it was the **rollback** picture, because an
 * unreadable section is the same absence as a missing one.
 *
 * Four rows share `99`, three share `98` and two share `97`, which is what ten
 * rows drawn from ~455 scored securities over 100 integer ordinals looks like
 * — and it exercises the tie-break rather than dodging it with ten distinct
 * ranks. One row is `aboveSample`, which is the only ordinal this product
 * draws with a `>` and is legal at the ceiling alone.
 */
const UNUSUAL_RANKED = [
  unusualRow("AVGO", 99, -8.42, { aboveSample: true }),
  unusualRow("CTSH", 99, 7.91),
  unusualRow("GOOGL", 99, -7.44),
  unusualRow("NVDA", 99, 6.88),
  unusualRow("ADBE", 98, 5.12),
  unusualRow("APH", 98, -4.76),
  unusualRow("MNST", 98, 4.4),
  unusualRow("CRWD", 97, -3.68),
  unusualRow("MSFT", 97, 3.2),
  unusualRow("TSLA", 96, -2.85),
];

/**
 * **Nothing is unusual right now, and the region says so with a FULL LIST** —
 * the state this screen has that is most likely to be read as a defect, and
 * Story 5.4's AC 11 as Gate 1 decision 1 amended it.
 *
 * A top ten always has ten members; *unusual* is the tail of a distribution,
 * not a threshold, so the honest answer to *is anything going on* is ten
 * ordinals in the fifties and sixties rather than an empty region. `62nd` is
 * Gate 1's own example of a row a reader can see is ordinary, and the list
 * heading — `Percentile of its own 60-session history` — is what makes that
 * readable at all.
 *
 * **The same ten tickers as {@link UNUSUAL_RANKED}, deliberately**, so the
 * only thing that differs between *the market is doing something* and *the
 * market is doing nothing* is the figures. If those two rows ever collide on
 * this surface, the ordinals have stopped reaching the screen.
 */
const UNUSUAL_ORDINARY = [
  unusualRow("NVDA", 62, 0.31),
  unusualRow("GOOGL", 61, -0.28),
  unusualRow("CTSH", 60, 0.25),
  unusualRow("AVGO", 59, -0.22),
  unusualRow("MSFT", 58, 0.2),
  unusualRow("MNST", 57, -0.18),
  unusualRow("CRWD", 56, 0.15),
  unusualRow("APH", 55, -0.12),
  unusualRow("ADBE", 54, 0.1),
  unusualRow("TSLA", 53, -0.08),
];

/**
 * **Fewer scored securities than the region reserves room for** — three rows
 * and seven held pads.
 *
 * The first minutes of every session, every morning: a security is scored only
 * once it holds two bars exactly five minutes apart, so **both** `eligible`
 * and `scored` climb from zero through the opening. The pads are why a list
 * going 10 → 3 does not step the lower page at 768 and 390, where the grid
 * rows are untied.
 *
 * ## `eligible: 14` rather than 466, and the first draft had it wrong
 *
 * `market-unusual.ts` records that **`eligible − scored` equals the
 * comparison refusals in every reachable state**, and `readUnusual`
 * deliberately does **not** check it — the producer can refuse a security
 * with no word at all, so the identity is an inequality and an equality in
 * the decoder would refuse honest frames. A harness must not lean on that
 * tolerance: `eligible: 466` beside `scored: 3` and eleven counted refusals
 * leaves **452 securities unaccounted for**, drawn as a confident sentence
 * under three rows. Fourteen heard from, three ranked, eleven too short is
 * the arithmetic a producer would actually emit, and it is also the truer
 * picture of 09:35 — the region's population is a second pass over securities
 * holding two bars five minutes apart, which is why it is far below
 * `Market breadth`'s 466 on the same frame rather than equal to it.
 */
const UNUSUAL_SHORT = [
  unusualRow("AVGO", 99, -8.42, { aboveSample: true }),
  unusualRow("NVDA", 97, 6.88),
  unusualRow("TSLA", 96, -2.85),
];

/** What a healthy gateway mid-session sends: every section furnished. */
const RICH: WireMarketOverview = {
  computedAt: AT,
  observedAt: AT,
  feeds: [VENUE],
  figures: PROXIES,
  sectors: SECTORS,
  sectorLadderStep: 2,
  breadth: OBSERVED_BREADTH,
  movers: observedMovers(GAINERS, LOSERS),
  // **Every frame a shipped gateway builds carries this section** — it is
  // non-optional on `WireMarketOverviewInputs` — so *healthy mid-session*
  // without it was a rollback wearing the wrong label (Task 5.4.6).
  unusual: unusualSection(
    UNUSUAL_RANKED,
    { scored: 455, eligible: 466, tracked: 503 },
    // **The generation held is the one keyed by the session on screen** (ADR
    // 0044) — the helper's default is a month after `AT`, which would draw
    // `generated for Oct 14` under figures from 16 September.
    SESSION,
  ),
};

/**
 * **The same observations, joined again later.**
 *
 * `computedAt` has moved and `observedAt` has not, which is what a second cold
 * load of `/` genuinely produces — the gateway runs the join on every connect
 * and every subscribe (Task 4.8.3 counted three per browser). Every drawn
 * instant on this screen must be the data's.
 */
const RICH_REJOINED: WireMarketOverview = { ...RICH, computedAt: LATER };

/**
 * **The same screen with the observation instant withheld** (Task 4.7.4's
 * axis).
 *
 * `observedAt` is **absent** rather than `undefined` —
 * `exactOptionalPropertyTypes` is on, and an aggregate holding no observation
 * has no instant. The arm matters because both region footers and the source
 * note draw a clause only when it is present, and the discriminant is a field
 * that is nowhere on the screen.
 */
const SESSION_BASIS: WireMarketOverview = {
  computedAt: AT,
  feeds: [],
  figures: CLOSED_PROXIES,
  sectors: SECTORS,
  sectorLadderStep: 2,
  breadth: SESSION_BREADTH,
  movers: sessionMovers(),
  /*
   * **The last completed session's stored closing ranking** (Task 5.4.5), on
   * the arm this screen is in for about 80% of the week.
   *
   * The session arm is built field by field rather than spread, because the
   * two arms must differ in **exactly** the discriminant and its companion:
   * `windowMinutes` hanging off a closed session is *heard from in the last
   * five minutes* about a market that shut hours ago, which is the
   * well-formed, confidently-dated wrong sentence
   * `the-counted-basis-is-read-off-the-frame` exists to refuse.
   */
  unusual: sessionUnusualSection(
    UNUSUAL_RANKED,
    { scored: 455, eligible: 466, tracked: 503 },
    "2026-09-11",
  ),
};

/**
 * **CI's permanent state: 518 securities, zero bars, and four `unknown`s.**
 *
 * And since Task 5.4.6 a **fifth** absence beside the other four:
 * `unrankedSection` is what a gateway with no bars and **no baseline
 * generation** sends — `eligible: 0`, `scored: 0`, both refusal tallies zero
 * and no generation at all. That last field is why this is not
 * `unusualSection([], …)`: a generation here would draw the source note's
 * third source over a baseline nobody read, which is a frame no producer
 * builds and this harness's standing hazard.
 */
const CI_SHAPE: WireMarketOverview = {
  computedAt: AT,
  feeds: [],
  figures: NO_PROXIES,
  sectors: NO_SECTORS,
  sectorLadderStep: 2,
  breadth: BREADTH_OF_NOTHING,
  movers: observedMovers([], []),
  unusual: unrankedSection("observed"),
};

/**
 * **What a 46-second-old replica builds**: every section present, every section
 * empty, over closes it does hold.
 *
 * This is the **deploy** state and not the outage state, which is Task 4.7.3's
 * correction: the gateway now serves a reconnecting browser its last broadcast,
 * so an ordinary reconnect no longer empties anything. What has no last
 * broadcast is a replica that has just started, and `docs/GAPS.md` records that
 * this repair does not reach it.
 */
const RESTARTED_REPLICA: WireMarketOverview = {
  computedAt: LATER,
  feeds: [],
  figures: NO_PROXIES,
  sectors: NO_SECTORS,
  sectorLadderStep: 2,
  breadth: BREADTH_OF_NOTHING,
  movers: observedMovers([], []),
  // The same empty section as `CI_SHAPE`, which is what keeps the two rows in
  // one content class: a restarted replica has no trailing windows and no
  // baseline row loaded, so it ranks nothing for the same reason CI does.
  unusual: unrankedSection("observed"),
};

/**
 * **The rollback: an aggregate with no breadth section at all** — and the one
 * row in this grid that is labelled `rollback` for the stronger reason.
 *
 * `WireMarketOverviewInputs.breadth` is non-optional, so **no shipped producer
 * can build this frame**. The read side admits it on purpose, because a new
 * bundle meeting a gateway from a pinned previous image is a reachable pair,
 * and `Market breadth` then draws its reserved panel rather than a count of
 * nothing.
 */
const ROLLBACK_NO_BREADTH: WireMarketOverview = {
  computedAt: AT,
  observedAt: AT,
  feeds: [VENUE],
  figures: PROXIES,
  sectors: SECTORS,
  sectorLadderStep: 2,
  movers: observedMovers(GAINERS, LOSERS),
};

/**
 * **A movers section the shipped encoder will serialise and the shipped
 * decoder refuses** — so the transition is produced end to end rather than
 * furnished.
 *
 * Task 4.7.6 handed this row over: `readOverview` says in as many words that
 * *"an unreadable one is the same absence rather than a discarded frame
 * carrying four true prices"*, so a present-but-unreadable section reaches
 * `MarketOverview` as the no-movers state. The list below is type-legal —
 * `gainers` is a `readonly WireOverviewFigure[]` and nothing in the type says
 * it is ordered — and **out of rank order**, which is the one check
 * `readMovers` can perform that a producer cannot violate by accident:
 * `selectMovers` ranks, so the reachable cause is deploy skew or a gateway
 * defect rather than a healthy process.
 *
 * It is the row that tells *this gateway sends no movers* apart from *this
 * gateway sent two empty lists* — a `filledBy` sentence with no rows at all,
 * against `GAINERS`/`LOSERS` over ten held pads.
 */
const UNREADABLE_MOVERS: WireMarketOverview = {
  computedAt: AT,
  observedAt: AT,
  feeds: [VENUE],
  figures: PROXIES,
  sectors: SECTORS,
  sectorLadderStep: 2,
  breadth: OBSERVED_BREADTH,
  movers: {
    basis: "observed",
    // Weakest first — `isRankedByMove` refuses it, and the section is dropped.
    gainers: [...GAINERS]
      .reverse()
      .map(([symbol, percent]) => observed(symbol, 100, percent)),
    losers: LOSERS.map(([symbol, percent]) => observed(symbol, 100, percent)),
    eligible: 466,
    tracked: 503,
    windowMinutes: 5,
  },
  // **Readable, and that is the point of the row**: one refused section does
  // not take the others with it, so this frame draws nine surfaces correctly
  // and one `filledBy` sentence.
  unusual: unusualSection(
    UNUSUAL_RANKED,
    { scored: 455, eligible: 466, tracked: 503 },
    // **The generation held is the one keyed by the session on screen** (ADR
    // 0044) — the helper's default is a month after `AT`, which would draw
    // `generated for Oct 14` under figures from 16 September.
    SESSION,
  ),
};

/**
 * **The rollback that this story's own deploy makes reachable: breadth and
 * movers present, no `unusual` section at all** (Task 5.4.6).
 *
 * It is `08-rollback-no-breadth`'s shape one section over and a strictly more
 * likely pair, because **it is the frame the image before this story built**.
 * A new bundle meeting a pinned Epic 4 gateway gets exactly this, and the
 * region's answer is its `filledBy` sentence — *the companies whose recent
 * five-minute move sits furthest out in their own 60-session history* — over
 * a hatched panel.
 *
 * **What that leaves live for Epic 6 is the reason this row is worth a
 * photograph.** Task 4.7.9 row 08 found that a rollback omitting a section
 * draws a region looking almost exactly like one this product has not built
 * yet; the only difference is the absence of an `EPIC n` badge. Filling this
 * region took the last badged hatch on grid rows 2 and 3 away, so two remain
 * — and the fewer badged hatches there are, the more a badge-less hatch reads
 * as house style rather than as *something is wrong*.
 */
const ROLLBACK_NO_UNUSUAL: WireMarketOverview = {
  computedAt: AT,
  observedAt: AT,
  feeds: [VENUE],
  figures: PROXIES,
  sectors: SECTORS,
  sectorLadderStep: 2,
  breadth: OBSERVED_BREADTH,
  movers: observedMovers(GAINERS, LOSERS),
};

/**
 * **A healthy session in which nothing is unusual** — see
 * {@link UNUSUAL_ORDINARY}.
 *
 * Identical to {@link RICH} but for the ten ordinals, so every other surface
 * must read the same and this one must not.
 */
const NOTHING_UNUSUAL: WireMarketOverview = {
  ...RICH,
  unusual: unusualSection(
    UNUSUAL_ORDINARY,
    { scored: 455, eligible: 466, tracked: 503 },
    SESSION,
  ),
};

/**
 * **A healthy session in which three securities have been scored** — see
 * {@link UNUSUAL_SHORT}, and `scored: 3` is the frame's own figure rather than
 * a floor, so the cut sentence states a population the rows are a selection
 * from.
 */
const FEW_SCORED: WireMarketOverview = {
  ...RICH,
  unusual: unusualSection(
    UNUSUAL_SHORT,
    { scored: 3, eligible: 14, tracked: 503 },
    SESSION,
  ),
};

/**
 * **The market is shut and no nightly ranking has ever been written** — which
 * is CI for ever, every fresh store, and any deployment whose first nightly
 * pass has not run.
 *
 * It is {@link SESSION_BASIS} with the one section emptied, so **seven
 * surfaces are byte-identical and this one is the whole difference**: the
 * region is the only thing on this screen that can tell a store whose nightly
 * pass has run from one whose has not. Declared as a partial collision below,
 * in both directions.
 *
 * The noun is read off **this section's own basis** rather than off
 * `Market breadth`'s, which is Task 5.4.5's repair — so it says
 * `Nothing ranked while the market is shut.` where `03-ci-shape-nothing-at-all`
 * says `Nothing ranked yet.` The two are different facts with different
 * repairs, and one of them is not a fault.
 */
const SESSION_BASIS_UNRANKED: WireMarketOverview = {
  ...SESSION_BASIS,
  unusual: unrankedSection("session", { session: "2026-09-11" }),
};

// ---------------------------------------------------------------------------
// The eight surfaces
// ---------------------------------------------------------------------------

const REGIONS = [
  "Market proxies",
  "Sector performance",
  "Market breadth",
  "Movers",
  // **The eighth surface, and the fifth region** (Task 5.4.6) — the landing
  // page's last reserved region, filled by Story 5.4 and invisible to this
  // grid until it was named here.
  "Unusual activity",
] as const;

/** The content surfaces, in the order a row prints them. */
const CONTENT_SURFACES = [...REGIONS, "source note"] as const;

/** The chrome surfaces — Task 4.7.2 needed BOTH to separate its triple. */
const CHROME_SURFACES = ["feed cell", "service cell"] as const;

const SURFACES = [...CONTENT_SURFACES, ...CHROME_SURFACES] as const;

type Surface = (typeof SURFACES)[number];

/**
 * **A row, with `null` meaning *nothing drawn*** — never `""`.
 *
 * An empty string makes two states distinct for a reason no reader can see;
 * `overview-source-note.spec.ts` already does this right, and the honest
 * reading of *the note drew nothing at all* is an absence rather than a gap.
 */
type Reading = Record<Surface, string | null>;

/**
 * The note's four possible terms, which are the only `dt` texts it has.
 *
 * **`Baselines` was missing until Task 5.4.6 and the omission was silent in
 * the worst available direction.** {@link noteOf} requires **every** `dt` to
 * be a known term, so an unlisted one does not fail an assertion — it makes
 * the note **unfindable**, and the row prints `(nothing drawn)`, which is a
 * legitimate reading of this surface and reads exactly like the product
 * having dropped its provenance note. Produced: the first run of this grid
 * with a `generation` on the frame reported the note absent on **ten of
 * seventeen rows**.
 *
 * It had been harmless for two days because **no aggregate in this file
 * carried the `unusual` section at all**, and the third clause draws only
 * where a generation was read. `overview-source-note.spec.ts` added the term
 * to **its** copy in Task 5.4.4 and wrote down this exact hazard in its own
 * docblock; what neither it nor this file had was anything that crosses
 * between the two. The duplication is deliberate — see {@link noteOf} — so
 * **each copy owes a pointer at the other**, which is this paragraph, and
 * `OVERVIEW_NOTE_TERMS` in `overview-source-note.ts` is the one home the two
 * are copies of.
 */
const NOTE_TERMS = [
  "Observed prices",
  "Closing prices",
  "Observed through",
  "Baselines",
];

/**
 * The source note, found by its terms rather than by position.
 *
 * Lifted from `overview-source-note.spec.ts` deliberately rather than shared:
 * that spec owns the note's own grid and this one owns the screen's, and a
 * shared locator would make one grid's rows depend on the other's idea of what
 * a note is. More than one match is **thrown**, because *two source notes on
 * one screen* is the defect `PROVENANCE.md` §1.3 exists to prevent and it must
 * not read as a passing locator.
 */
async function noteOf(page: Page): Promise<string | null> {
  return page.evaluate((terms: readonly string[]) => {
    const notes = [...document.querySelectorAll("dl")].filter((list) => {
      const written = [...list.querySelectorAll("dt")].map((term) =>
        term.textContent.trim(),
      );
      return (
        written.length > 0 && written.every((term) => terms.includes(term))
      );
    });

    if (notes.length > 1) {
      throw new Error(`${String(notes.length)} source notes on one screen`);
    }

    const note = notes[0];
    if (note === undefined) return null;
    return (note as HTMLElement).innerText.replace(/\s+/gu, " ").trim();
  }, NOTE_TERMS);
}

const collapse = (text: string): string | null => {
  const written = text.replace(/\s+/gu, " ").trim();
  return written === "" ? null : written;
};

async function textOf(locator: Locator): Promise<string | null> {
  if ((await locator.count()) === 0) return null;
  return collapse(await locator.innerText());
}

/** The two footer cells, which are the chrome half of every key here. */
const footerCells = (page: Page): Locator =>
  page.locator("footer").first().locator("> div");

async function readRow(page: Page): Promise<Reading> {
  const cells = footerCells(page);

  // **The plant for the chrome half.** A key whose two chrome surfaces were
  // both `null` because the selector stopped matching would collapse every
  // row in this grid into one class and read as a finding about the product.
  expect(await cells.count()).toBe(CHROME_SURFACES.length);

  const [feedCell, serviceCell] = await Promise.all([
    textOf(cells.nth(0)),
    textOf(cells.nth(1)),
  ]);

  const regions = await Promise.all(
    REGIONS.map(async (name) => textOf(page.getByRole("region", { name }))),
  );

  return {
    "Market proxies": regions[0] ?? null,
    "Sector performance": regions[1] ?? null,
    "Market breadth": regions[2] ?? null,
    Movers: regions[3] ?? null,
    "Unusual activity": regions[4] ?? null,
    "source note": await noteOf(page),
    "feed cell": feedCell,
    "service cell": serviceCell,
  };
}

/** The masthead, recorded and excluded from both keys — see the header. */
async function mastheadOf(page: Page): Promise<string | null> {
  return textOf(page.locator("header").first());
}

const keyOf = (reading: Reading, surfaces: readonly Surface[]): string =>
  surfaces
    .map((surface) => `${surface} ${reading[surface] ?? "nothing"}`)
    .join("");

// ---------------------------------------------------------------------------
// The collision classes, declared rather than counted
// ---------------------------------------------------------------------------

/**
 * **`rows.length - 1` is a magic number that says *one of these may collide*
 * and not which.**
 *
 * So each row carries the class it may collide within, and the assertion is
 * that the partition of rows **by drawn string** equals the partition **by
 * declared class**. That fails in both directions: an accidental collapse goes
 * red, *and a documented exception that has silently stopped holding also goes
 * red* — which today nobody would notice, because a grid with a deliberate
 * collision expressed as a count is green whichever rows collapse into it.
 *
 * There are two keys and therefore two class columns, and the second is not
 * decoration. Over the **six content surfaces** — five regions and the note,
 * the fifth region added by Task 5.4.6 — three states are byte-identical at
 * every width (Task 4.7.2 measured it over five; the sixth did not separate
 * them), so the content classes
 * document *what the chrome alone tells apart*; over **all eight** the only
 * collisions left are the ones nothing on the screen tells apart at all.
 */
/**
 * **A content class is ONE AGGREGATE**, and the rows in it are the chrome
 * states that aggregate can sit under.
 *
 * That is the rule the partition turned out to express, rather than a list of
 * exceptions: `main` is a pure function of the aggregate, so two rows whose
 * frames carry the same figures MUST read identically over the six content
 * surfaces however their connection, their service or their market session
 * differ — and ADR 0029's one-home rule is what keeps those three facts in the
 * chrome where the second key can see them. A content class that held two
 * different aggregates would be the accidental collapse; a content class whose
 * rows stopped colliding would mean a connection word had leaked into `main`.
 *
 * **Task 5.4.6 is the first test of that rule against a region added after it
 * was written, and it held in both directions.** `Unusual activity` is a pure
 * function of `overview.unusual` and `overview.observedAt` — it reads no
 * clock, no connection and no `computedAt` — so the four rows of
 * `one-aggregate-the-session-basis` still collide across a stopped feed, a
 * shut market and an unreachable backend, and the two rows of
 * `one-aggregate-the-empty-join` still collide because a replica with no
 * baseline row ranks nothing for the same reason CI does.
 */
const CONTENT_CLASSES: Record<string, string> = {
  "one-aggregate-the-session-basis":
    "Closes present with nothing observed, the feed stopped mid-session, the " +
    "feed stopped with the market shut, and the backend unreachable carry ONE " +
    "aggregate between them — the last session's closes. The connection, the " +
    "service and the market session are facts about the chrome, and a reader " +
    "of main cannot tell these four apart because there is nothing in main to " +
    "tell apart. Task 4.7.2 measured three of them as byte-identical and the " +
    "two footer cells are the separation, which is why they are in the second " +
    "key.",
  "one-aggregate-the-empty-join":
    "CI's permanent state — 518 securities and zero bars — and a replica that " +
    "restarted mid-session are ONE picture: four unknown figures, eleven " +
    "unknown sectors, measured 0, two empty lists, a section that ranked " +
    "nothing with no baseline generation, and no observation instant. " +
    "Produced and found by this grid on its first run. The collision is right " +
    "and it is also the sharp edge of Task 4.7.3's unrepaired half: the screen " +
    "has no memory, so the state a reader ARRIVES in and the state a reader is " +
    "DROPPED into after a deploy are the same eight surfaces. What differs is " +
    "only the transition, which is why docs/GAPS.md owns that case and why a " +
    "memo could not have reached it.",
};

const CHROME_CLASSES: Record<string, string> = {
  "the-session-word-has-one-home-and-it-is-the-masthead":
    "The market being shut and the feed having stopped are the same eight " +
    "surfaces, at every width. marketOpen rides the feed frame and reaches no " +
    "word of the status bar or of main; MarketSessionStatus owns it, from the " +
    "wall clock, in the opposite corner of the viewport. At 390 a reader must " +
    "read BOTH corners to tell the two apart, which is Story 4.7's question in " +
    "its sharpest shipped form.",
};

/**
 * **A collision one surface wide**, with the surfaces that must collide and the
 * surfaces that must differ named separately.
 *
 * This exists because the brief's own third candidate class was refuted by the
 * production, and the refutation is more interesting than the class would have
 * been. `one-aggregate-two-joins` — *a session running and the same screen
 * hours later are one picture, because no drawn sentence reads `computedAt`* —
 * holds for `overview-source-note.spec.ts`' five rows, where Task 4.8.12
 * measured it and encoded it as `rows.length - 1`. **Over the whole screen it
 * is false**, and this grid went red on it in the second direction on the
 * first run that could: `Market proxies` adds `last prices of the session`
 * between the instant and the basis.
 *
 * It is not a defect. `market-proxies.ts`' `sessionTiming` asks the trading
 * calendar about `computedAt` deliberately and argues it at length — *there is
 * no clock in the browser to read*, and
 * `a-second-clock-on-the-landing-page` refuses one on this route by name. What
 * it is, is the difference between reading the join instant as an **age** (the
 * claim Task 4.8.12 removed) and reading it as a **question to the calendar**
 * (the claim that shipped before it and still does).
 *
 * So the pair is kept as a row pair and the claim is written at the grain it
 * is true at: five surfaces must be byte-identical and one must differ. Both
 * halves are asserted, so this cannot rot in either direction either.
 */
interface PartialCollision {
  readonly rows: readonly [string, string];
  readonly same: readonly Surface[];
  readonly differs: readonly Surface[];
  readonly sentence: string;
}

const PARTIAL_COLLISIONS: readonly PartialCollision[] = [
  {
    rows: ["05-session-running", "06-session-rejoined-after-the-bell"],
    same: [
      "Sector performance",
      "Market breadth",
      "Movers",
      // **The eighth surface joins the SAME side, and that is an assertion
      // rather than a convenience** (Task 5.4.6): `unusualActivity` is handed
      // `overview.observedAt` and never `computedAt`, so if this region ever
      // reaches for the join instant — the defect Task 4.8.12 removed from the
      // source note — this row pair goes red here first.
      "Unusual activity",
      "source note",
      "feed cell",
      "service cell",
    ],
    differs: ["Market proxies"],
    sentence:
      "One aggregate, joined twice — the second after the bell. Every instant " +
      "a reader meets is the DATA's, so the source note's `Observed through` " +
      "and both region footers' `Nothing newer than` are byte-identical: that " +
      "is Task 4.8.12's repair, and a grid over the source note alone measures " +
      "the whole of it. The proxy strip is the one surface that reads " +
      "computedAt, and it reads it as a question to the trading calendar " +
      "rather than as an age — `last prices of the session`, which is true of " +
      "both joins and only SAYABLE by the one that ran after the close. So " +
      "the screen has a fifth surface in the two-instants family, and the " +
      "amendment in WireMarketOverview.computedAt's own docblock — `no drawn " +
      "sentence reads it any more` — is the source note's claim rather than " +
      "the screen's.",
  },
  {
    rows: [
      "04-closes-present-nothing-observed",
      "16-session-basis-with-no-stored-ranking",
    ],
    same: [
      "Market proxies",
      "Sector performance",
      "Market breadth",
      "Movers",
      "feed cell",
      "service cell",
    ],
    differs: ["Unusual activity", "source note"],
    sentence:
      "A store whose nightly ranking pass has run and one whose has not, with " +
      "the market shut in both. The two aggregates differ in exactly one " +
      "section, and the screen reports it in exactly TWO places — which is " +
      "the correction this row pair produced: it was declared as one, on the " +
      "assumption that the region owns its own state. The second place is the " +
      "source note's `Baselines` term, which draws only where the frame " +
      "carried a GENERATION — the row the nightly pass actually read — so a " +
      "store with no ranking has no third source either. That is ADR 0029 per " +
      "clause rather than a duplicate: the region says what it could not " +
      "rank, the note says which stored distribution the ordinals were ranked " +
      "AGAINST, and neither sentence is the other one. The four content " +
      "surfaces that must NOT move are the assertion that the section has not " +
      "leaked into a region that does not own it. Note also what the region " +
      "is not allowed to say: `Nothing ranked while the market is shut.` is " +
      "read off this section's own basis, not off a clock and not off Market " +
      "breadth's, so the sentence survives Epic 13's replay.",
  },
];

// ---------------------------------------------------------------------------
// The states
// ---------------------------------------------------------------------------

interface Produced {
  /** The counters this row's own production left behind, per channel. */
  readonly plant: Record<string, number>;
  /** Anything the row wants printed beside its strings. */
  readonly note?: string;
  /**
   * **Torn down AFTER the row has been read and photographed**, never at the
   * end of the drive.
   *
   * The first draft released the held `GET /securities` in the drive's own
   * `finally`, which runs before the caller reads anything — so the universe
   * arrived during the 300 ms settle and the row printed five fully-named
   * mover rows under the id `13-universe-outstanding`. **A state released
   * before it is read is a row of a state the grid does not contain**, and the
   * only tell was the `(unsettled)` marker beside it.
   */
  readonly release?: () => void;
}

interface State {
  readonly id: string;
  /**
   * `produced` — every byte of this row crossed the shipped socket path.
   *
   * `rollback` — additionally furnished in the strong sense: the frame is one
   * **no shipped producer can build**, because the section it omits is
   * non-optional on `WireMarketOverviewInputs`. The read side admits it
   * because a new bundle meeting a pinned previous image is a reachable pair.
   */
  readonly kind: "produced" | "rollback";
  readonly contentClass?: string;
  readonly chromeClass?: string;
  /**
   * **Read once, immediately** rather than settled, for the one row that is
   * only itself inside 2,000 ms of mount.
   */
  readonly preFloor?: boolean;
  readonly drive: (page: Page, width: number) => Promise<Produced>;
}

/** Load `/` and wait for the application to have rendered something. */
async function open(page: Page): Promise<void> {
  await page.goto(OVERVIEW, { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("region", { name: "Market proxies" }),
  ).toBeVisible();
}

/**
 * A plain served aggregate — the gateway's own connect sequence and nothing
 * else.
 */
const serving =
  (overview: WireMarketOverview, feed: MarketFeed | null = VENUE) =>
  async (page: Page): Promise<Produced> => {
    const produced = await serveFeed(page, { feed, overview });
    await open(page);

    // **Channel: the aggregate.** A frame that was built and never sent and a
    // frame the page ignored read the same on screen.
    await expect
      .poll(() => produced.overviews(), { timeout: 10_000 })
      .toBeGreaterThan(0);

    return {
      plant: {
        connections: produced.connections(),
        overviews: produced.overviews(),
      },
    };
  };

/** Serve an aggregate, then hold an outage across the page's own retry. */
const servingThenHeldOutage =
  (overview: WireMarketOverview, marketOpen: boolean) =>
  async (page: Page, width: number): Promise<Produced> => {
    const produced = await serveFeed(page, {
      feed: VENUE,
      overview,
      marketOpen,
      reconnect: "refused",
    });
    await open(page);
    await expect
      .poll(() => produced.overviews(), { timeout: 10_000 })
      .toBeGreaterThan(0);

    const chrome = page.locator("footer").first();
    await expect(chrome).toContainText(/live/iu);
    produced.drop();
    await expect(chrome).toContainText(/disconnected/iu);

    // **Channel: the refusal, and it costs the backoff's first 2 s.** *The
    // retry was refused* and *the page never retried* leave an identical
    // screen, so one width per refusing state pays for the proof and the rest
    // record the counter they happen to have reached. The screen is the same
    // either way — Task 4.7.1 asserted the cell is byte-identical across the
    // refused retry — so this is a plant proof rather than a state difference.
    if (width === WIDTHS[0]) {
      await expect
        .poll(() => produced.refusals(), { timeout: 15_000 })
        .toBeGreaterThan(0);
      expect(await chrome.innerText()).toMatch(/disconnected/iu);
    }

    return {
      plant: {
        connections: produced.connections(),
        overviews: produced.overviews(),
        refusals: produced.refusals(),
      },
      note: `marketOpen: ${String(marketOpen)} on the wire; the masthead is the wall clock's`,
    };
  };

const STATES: readonly State[] = [
  {
    id: "01-no-aggregate-before-the-floor",
    kind: "produced",
    preFloor: true,
    drive: async (page) => {
      // **The socket is answered and no aggregate is ever sent**, which is
      // every cold load for its first instants and is the state the 2,000 ms
      // gate exists for.
      const produced = await serveFeed(page, { feed: VENUE });
      await open(page);
      return {
        plant: {
          connections: produced.connections(),
          overviews: produced.overviews(),
        },
        note: "read inside SAY_NOTHING_ARRIVED_AFTER_MS of mount",
      };
    },
  },
  {
    id: "02-no-aggregate-after-the-floor",
    kind: "produced",
    drive: async (page) => {
      const produced = await serveFeed(page, { feed: VENUE });
      await open(page);
      // The gate, waited out through the shipped renderer rather than mocked.
      await expect(
        page.getByRole("region", { name: "Market proxies" }),
      ).toContainText("No prices yet.", { timeout: 10_000 });
      return {
        plant: {
          connections: produced.connections(),
          overviews: produced.overviews(),
        },
        note: "the terminal no-frame state: four regions, four sentences",
      };
    },
  },
  {
    id: "03-ci-shape-nothing-at-all",
    kind: "produced",
    contentClass: "one-aggregate-the-empty-join",
    drive: serving(CI_SHAPE, null),
  },
  {
    id: "04-closes-present-nothing-observed",
    kind: "produced",
    contentClass: "one-aggregate-the-session-basis",
    drive: serving(SESSION_BASIS, null),
  },
  {
    id: "05-session-running",
    kind: "produced",
    drive: serving(RICH),
  },
  {
    id: "06-session-rejoined-after-the-bell",
    kind: "produced",
    drive: serving(RICH_REJOINED),
  },
  {
    id: "07-movers-section-unreadable",
    kind: "produced",
    drive: serving(UNREADABLE_MOVERS),
  },
  {
    id: "08-rollback-no-breadth-section",
    kind: "rollback",
    drive: serving(ROLLBACK_NO_BREADTH),
  },
  {
    id: "09-restarted-replica-on-reconnect",
    kind: "produced",
    contentClass: "one-aggregate-the-empty-join",
    drive: async (page) => {
      // **The deploy state rather than the outage state** (Task 4.7.3): the
      // page's own retry is answered with the aggregate a 46-second-old
      // replica builds, which has no last broadcast to serve instead.
      const produced = await serveFeed(page, {
        feed: VENUE,
        overview: RICH,
        overviewOnReconnect: RESTARTED_REPLICA,
      });
      await open(page);
      await expect(
        page.getByRole("region", { name: "Market proxies" }),
      ).toContainText("774.03");

      const before = produced.overviews();
      produced.drop();

      const chrome = page.locator("footer").first();
      await expect(chrome).toContainText(/disconnected/iu);
      await expect(chrome).not.toContainText(/disconnected/iu, {
        timeout: 20_000,
      });

      // **Channel: the second aggregate.** A reconnect that was never answered
      // with a frame leaves the screen exactly where it was.
      await expect
        .poll(() => produced.overviews(), { timeout: 15_000 })
        .toBeGreaterThan(before);
      await expect(
        page.getByRole("region", { name: "Market proxies" }),
      ).not.toContainText("774.03");

      return {
        plant: {
          connections: produced.connections(),
          overviews: produced.overviews(),
          refusals: produced.refusals(),
        },
        note: "the page's own retry, answered by a replica with no last broadcast",
      };
    },
  },
  {
    id: "10-feed-stopped-held-market-open",
    kind: "produced",
    chromeClass: "the-session-word-has-one-home-and-it-is-the-masthead",
    contentClass: "one-aggregate-the-session-basis",
    drive: servingThenHeldOutage(SESSION_BASIS, true),
  },
  {
    id: "11-feed-stopped-held-market-shut",
    kind: "produced",
    chromeClass: "the-session-word-has-one-home-and-it-is-the-masthead",
    contentClass: "one-aggregate-the-session-basis",
    drive: servingThenHeldOutage(SESSION_BASIS, false),
  },
  {
    id: "12-backend-unreachable-feed-stopped",
    kind: "produced",
    contentClass: "one-aggregate-the-session-basis",
    drive: async (page, width) => {
      let aborted = 0;
      await page.route(HEALTH_ROUTE_PATTERN, async (route) => {
        aborted += 1;
        await route.abort("connectionrefused");
      });

      const produced = await servingThenHeldOutage(SESSION_BASIS, true)(
        page,
        width,
      );

      // **Channel: the refusals, counted at the route.** A backend that was
      // never dialled and one that refused leave the same two words.
      expect(aborted).toBeGreaterThan(0);
      return {
        plant: { ...produced.plant, "health refused": aborted },
      };
    },
  },
  {
    id: "13-universe-outstanding",
    kind: "produced",
    drive: async (page) => {
      // **The axis this grid has never had** (Task 4.7.5): `GET /securities`
      // is the one HTTP request beside the socket, the movers name track is
      // the only thing that depends on it, and it measured 124 ms against
      // first-frame times of 174–277 ms — so every cold load may paint movers
      // with no names. Held open rather than refused: an abort reaches the
      // same screen and is the failure case, and the point is that the failure
      // and the ordinary cold load are one picture.
      const produced = await serveFeed(page, { feed: VENUE, overview: RICH });

      let held = 0;
      let release: (() => void) | undefined;
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route(SECURITIES_ROUTE_PATTERN, async (route) => {
        held += 1;
        await released;
        await route.continue();
      });

      await open(page);
      await expect
        .poll(() => produced.overviews(), { timeout: 10_000 })
        .toBeGreaterThan(0);

      // **Channel: the hold.** Without it, a blank name column is equally
      // evidence the page never asked for a universe.
      await expect.poll(() => held, { timeout: 10_000 }).toBeGreaterThan(0);

      return {
        plant: {
          connections: produced.connections(),
          overviews: produced.overviews(),
          "universe requests held": held,
        },
        note: "worth a row at 390 specifically: that is the width where the price column is dropped, so the blank name track is widest",
        // **Handed back rather than released here** — see `Produced.release`.
        release: () => release?.(),
      };
    },
  },
  // -------------------------------------------------------------------------
  // The eighth surface's own four rows (Task 5.4.6). The region's other five
  // drawn states are already produced by the rows above: ten ranked rows on
  // the observed basis (05, 06, 07, 13), the last session's stored ranking
  // (04, 10, 11, 12), the unranked observed section (03, 09), the absent
  // section (08), and the reservation before and after the 2,000 ms floor
  // (01, 02). **Appended rather than inserted in subject order**, because
  // renumbering a row renames it in every quotation of this grid's output.
  // -------------------------------------------------------------------------
  {
    id: "14-nothing-unusual-at-all",
    kind: "produced",
    drive: serving(NOTHING_UNUSUAL),
  },
  {
    id: "15-fewer-scored-than-the-region-reserves",
    kind: "produced",
    drive: serving(FEW_SCORED),
  },
  {
    id: "16-session-basis-with-no-stored-ranking",
    kind: "produced",
    drive: serving(SESSION_BASIS_UNRANKED, null),
  },
  {
    id: "17-rollback-no-unusual-section",
    kind: "rollback",
    drive: serving(ROLLBACK_NO_UNUSUAL),
  },
];

/**
 * **Enumerated and deliberately NOT produced, with the reason** — which is
 * `docs/GAPS.md` entry 13's second direction answered rather than asserted.
 */
const ENUMERATED_AND_NOT_PRODUCED = [
  {
    state: "a region whose content THREW",
    why:
      "Not a state of any frame. `readOverview` refuses a malformed aggregate " +
      "rather than handing the renderer something that throws, so no byte this " +
      "harness can send reaches it. It is a reachable state of the PRODUCT (a " +
      "renderer defect) and since Task 4.7.5 the head is part of the picture — " +
      "`Region` suppresses `meta` when its content boundary trips. It is owned " +
      "at the component level, by `Region.test.tsx`' exhaustive walk over the " +
      "content slot's three states plus the retry, and in the workshop by " +
      "`Region.stories.tsx`' FailedWithAClaimInItsHead. **Unchanged by Task " +
      "5.4.6, which was asked for a region error on the new region and found " +
      "the same answer**: `readUnusual` refuses a malformed section at the " +
      "decoder, so the renderer is never handed one, and the thrown state is " +
      "owned by `Unusual.stories.tsx`' Threw — which also carries the head " +
      "suppression (a thrown region used to keep `Top 10` over a box saying " +
      "the region could not be displayed).",
  },
  {
    state: "an `unusual` section the shipped decoder REFUSES",
    why:
      "Produced in the strong sense — the encoder serialises it and the " +
      "transition is real — and left out because it is " +
      "`17-rollback-no-unusual-section` **byte for byte at every width**, " +
      "which is `readUnusual`'s own documented contract rather than a " +
      "defect: *a frame from a previous image carries no section at all, and " +
      "an unreadable one is the same absence*. A row for it would be an " +
      "accidental collapse by this grid's own rule, or a content class " +
      "holding two aggregates, and neither states the claim as well as this " +
      "line does. The six refusals that reach it are checked where they can " +
      "be asserted rather than photographed — `market-stream-protocol.test.ts` " +
      "walks each one — and Task 5.4.5 met this the expensive way, by " +
      "hand-ordering `MNST (96)` ahead of `GOOGL (96)` and getting the " +
      "rollback picture back with no diagnostic anywhere. **The ticker " +
      "tie-break is why a furnished ranking is one keystroke from furnishing " +
      "nothing**, which is this harness's standing hazard with the direction " +
      "reversed: not a state the server cannot reach drawn as though it " +
      "could, but a state the harness meant to reach silently replaced by " +
      "another one it already had.",
  },
  {
    state: "`Unusual activity` SCROLLING, or any other fact about its box",
    why:
      "Not in either key and not catchable here at all. This grid is text, " +
      "so Task 5.4.1 re-areaed the whole landing grid — moving this region " +
      "from a 1026x161 row-1 track with no content floor onto a " +
      "`minmax(min-content, 1fr)` row at ~491 px — and the spec passed 4 of 4 " +
      "with no expectation changed in either direction. *One height in every " +
      "state at every width* is `pnpm probe`'s claim and this file's silence " +
      "is not evidence for it; the region that scrolled at 1440x680 with " +
      "nothing in it but a hatched placeholder was found by measuring, not " +
      "by running this.",
  },
  {
    state: "CI's shape with the market SHUT and no close anywhere",
    why:
      "Task 4.7.2 enumerated it and left it out, because `market-breadth.ts`' " +
      "behaviour with a null session was unchecked and building it by hand " +
      "risks this harness's standing hazard — a state the server cannot reach, " +
      "drawn as though it could. Still not produced here, for the same reason " +
      "and with the same remedy: produce it from the producer. What IS produced " +
      "is the nearest reachable pair, `03-ci-shape-nothing-at-all` beside " +
      "`11-feed-stopped-held-market-shut`.",
  },
  {
    state: "the masthead's other three market-shut spellings",
    why:
      "`CLOSED · Weekend` is one of at least four — a holiday, pre-market and " +
      "after-hours are the others — and the masthead reads the WALL CLOCK, so " +
      "which one a row carries is a property of when the suite ran and is " +
      "driveable by nothing in it. Recorded per row and excluded from both " +
      "keys for exactly that reason.",
  },
] as const;

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

interface Row {
  readonly state: State;
  readonly width: number;
  readonly reading: Reading;
  readonly masthead: string | null;
  readonly produced: Produced;
  readonly settled: boolean;
  /** Which surfaces disagreed between two reads, when the row never settled. */
  readonly moved: readonly Surface[];
}

/**
 * **A settled read is two reads 300 ms apart agreeing on every surface** —
 * Task 4.7.2's rule, and it is needed: `/` re-renders 13.6–32.2 times a minute
 * in every degraded state, so a state read twice may differ only in which
 * render was caught.
 */
async function settledRead(
  page: Page,
  settle: boolean,
): Promise<{ reading: Reading; settled: boolean; moved: readonly Surface[] }> {
  let previous = await readRow(page);
  if (!settle) return { reading: previous, settled: false, moved: [] };

  let moved: Surface[] = [];
  // **Eight attempts rather than four, and the budget is the loaded runner's
  // rather than the idle one's.** The loop exits on the first agreement, so in
  // the ordinary case this costs one 300 ms wait; the ceiling only matters on
  // a machine under contention. Measured: 52 rows settled on the first
  // comparison in four single-width runs at load 3.4–4.7, and **one row in 52
  // did not settle at all** on the four-worker photography run with the
  // machine at 9.76 — which is the run a gated machine most resembles. Four
  // attempts was the previous grid's number and it was never enforced, so
  // nothing had ever been red on it.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.waitForTimeout(300);
    const again = await readRow(page);
    // **Which surface moved, not merely that one did.** An unsettled row is a
    // row whose string could have been either of two, which would make the
    // collision assertion flaky — so the instrument has to name the surface
    // rather than leave a marker. Found needed at 390 on
    // `08-rollback-no-breadth-section`, where the bare marker said a row was
    // unstable and nothing said what about it was.
    moved = SURFACES.filter((surface) => again[surface] !== previous[surface]);
    if (moved.length === 0) return { reading: again, settled: true, moved };
    previous = again;
  }
  return { reading: previous, settled: false, moved };
}

async function photograph(page: Page, name: string): Promise<void> {
  await mkdir(CAPTURE, { recursive: true });

  // **`fullPage`, and it draws the sticky status bar across the middle of the
  // page.** Task 4.7.2 recorded that and it is written here too, because it is
  // an artefact of `position: sticky` against a full-page capture and it reads
  // exactly like a defect. The whole page is what a degraded picture is of:
  // the four sentences are 400–700 px apart at 390.
  await page.screenshot({ path: `${CAPTURE}/${name}.png`, fullPage: true });

  // **Greyscale at every width.** The price palette differs by 1.04:1 in
  // greyscale, so hue is the entire difference between up and down — and four
  // greyscale simulations once passed against a chart that was wrong. Story
  // 4.2's grid greyscaled 1440 only.
  await page.addStyleTag({
    content: `html { filter: grayscale(1) !important }`,
  });
  await page.screenshot({
    path: `${CAPTURE}/${name}-grey.png`,
    fullPage: true,
  });

  // The page is closed immediately after this, so removing the tag is
  // belt-and-braces — but a photograph taken after a surviving filter would be
  // a greyscale picture filed under a colour name, which no reader could tell.
  await page.evaluate(() => {
    for (const tag of document.querySelectorAll("style")) {
      if (tag.textContent.includes("grayscale(1)")) tag.remove();
    }
  });
}

for (const width of WIDTHS) {
  test.describe(`the degraded grid at ${String(width)}`, () => {
    test.use({ viewport: { width, height: width === 390 ? 780 : 900 } });

    test(`eight surfaces, every state, and the declared collisions`, async ({
      context,
    }) => {
      test.slow();
      const rows: Row[] = [];

      for (const state of STATES) {
        // **Every state gets its own page**, from the `context` fixture rather
        // than the `page` one. Two reasons and both are load-bearing: the
        // pre-floor row is only itself inside 2,000 ms of a **fresh mount**,
        // and a `page.route` one state installs would otherwise answer the
        // next — which is how a held `GET /securities` becomes a finding about
        // a state that never had one.
        const page = await context.newPage();
        let produced: Produced | undefined;
        try {
          produced = await state.drive(page, width);
          const { reading, settled, moved } = await settledRead(
            page,
            state.preFloor !== true,
          );

          if (state.preFloor === true) {
            // **The proof that this read IS pre-floor**, rather than an
            // assertion about a timer: the gate's own sentence is not on
            // screen yet. Without it the row is indistinguishable from 02.
            expect(reading["Market proxies"]).not.toContain("No prices yet.");
          }

          // **No state in this grid is a crash**, which is the claim every
          // degraded picture is only worth anything under.
          await expectNothingFailedToRender(page);

          // **An unsettled row is a FAILURE, not a marker.** A row that could
          // have been either of two strings makes every collision assertion
          // below it a coin toss, and the previous grid's own settle rule was
          // reported rather than enforced. The pre-floor row is the one
          // exception and it is read once on purpose.
          if (state.preFloor !== true) {
            expect(
              moved,
              `${state.id} never settled at ${String(width)}: four reads ` +
                `300 ms apart disagreed, and the surfaces that moved are ` +
                `named here rather than left to a marker`,
            ).toEqual([]);
          }

          rows.push({
            state,
            width,
            reading,
            masthead: await mastheadOf(page),
            produced,
            settled,
            moved,
          });

          if (PHOTOGRAPH) {
            await photograph(page, `${state.id}-${String(width)}`);
          }
        } finally {
          // **The release first, then the page.** A row whose production holds
          // a request open must be torn down after it has been read, and a
          // page closed with a route still awaiting a promise leaves the
          // handler pending.
          produced?.release?.();
          await page.close();
        }
      }

      // **The grid, printed, so the record is the run's own output.**
      console.log(renderGrid(rows));

      // **The partition by drawn string equals the partition by declared
      // class**, pairwise so that a failure names the two rows and the
      // direction. Both directions are live:
      //
      //   - two rows that collide with no class declared is an ACCIDENTAL
      //     collapse — a grid that has stopped distinguishing something;
      //   - two rows sharing a class that no longer collide is a documented
      //     exception that has silently stopped holding, which is the half
      //     `rows.length - 1` can never see.
      for (const [key, classOf, classes] of [
        ["content", (row: Row) => row.state.contentClass, CONTENT_CLASSES],
        ["chrome", (row: Row) => row.state.chromeClass, CHROME_CLASSES],
      ] as const) {
        const surfaces = key === "content" ? CONTENT_SURFACES : SURFACES;

        for (const row of rows) {
          const declared = classOf(row);
          if (declared === undefined) continue;
          expect(
            Object.keys(classes),
            `${row.state.id} declares a ${key} class nothing justifies`,
          ).toContain(declared);
        }

        for (let a = 0; a < rows.length; a += 1) {
          for (let b = a + 1; b < rows.length; b += 1) {
            const one = rows[a];
            const two = rows[b];
            if (one === undefined || two === undefined) continue;

            const collide =
              keyOf(one.reading, surfaces) === keyOf(two.reading, surfaces);
            const declared =
              classOf(one) !== undefined && classOf(one) === classOf(two);

            expect(
              collide,
              declared
                ? `${one.state.id} and ${two.state.id} share the ${key} class ` +
                    `${String(classOf(one))} and no longer read identically at ` +
                    `${String(width)} — the documented exception has stopped ` +
                    `holding, which is the direction a count cannot see`
                : `${one.state.id} and ${two.state.id} read IDENTICALLY over ` +
                    `the ${key} surfaces at ${String(width)} and declare no ` +
                    `shared class — an accidental collapse`,
            ).toBe(declared);
          }
        }
      }

      // **The partial collisions, both halves.** A declared class is a claim
      // about whole keys; this is the same claim at the grain a surface has,
      // and it is where the brief's own third class actually lives.
      for (const collision of PARTIAL_COLLISIONS) {
        const [first, second] = collision.rows;
        const one = rows.find((row) => row.state.id === first);
        const two = rows.find((row) => row.state.id === second);
        expect(one, `${first} is not in this grid`).toBeDefined();
        expect(two, `${second} is not in this grid`).toBeDefined();
        if (one === undefined || two === undefined) continue;

        for (const surface of collision.same) {
          expect(
            two.reading[surface],
            `${first} and ${second} are declared identical on ${surface} at ` +
              `${String(width)} and are not — the documented collision has ` +
              `stopped holding`,
          ).toBe(one.reading[surface]);
        }
        for (const surface of collision.differs) {
          expect(
            two.reading[surface],
            `${first} and ${second} are declared to DIFFER on ${surface} at ` +
              `${String(width)} and read identically — the surface that ` +
              `distinguished them has gone quiet`,
          ).not.toBe(one.reading[surface]);
        }
      }

      if (PHOTOGRAPH) {
        await mkdir(CAPTURE, { recursive: true });
        await writeFile(
          `${CAPTURE}/readings-${String(width)}.json`,
          `${JSON.stringify(
            rows.map((row) => ({
              id: row.state.id,
              kind: row.state.kind,
              width: row.width,
              contentClass: row.state.contentClass ?? null,
              chromeClass: row.state.chromeClass ?? null,
              surfaces: row.reading,
              masthead: row.masthead,
              plant: row.produced.plant,
              settled: row.settled,
              moved: row.moved,
            })),
            null,
            1,
          )}\n`,
          "utf8",
        );
      }
    });
  });
}

function renderGrid(rows: readonly Row[]): string {
  const lines: string[] = [
    `# The landing screen's degraded set at ${String(rows[0]?.width ?? 0)}`,
    "",
  ];

  for (const row of rows) {
    lines.push(
      `## ${row.state.id}  [${row.state.kind}]${
        row.settled
          ? ""
          : row.state.preFloor === true
            ? " (read once, inside the floor — not settled, by design)"
            : ` (UNSETTLED — ${row.moved.join(", ")} moved)`
      }`,
    );
    if (row.produced.note !== undefined)
      lines.push(`    note: ${row.produced.note}`);
    lines.push(
      `    plant: ${Object.entries(row.produced.plant)
        .map(([channel, count]) => `${channel}=${String(count)}`)
        .join(", ")}`,
    );
    lines.push(
      `    classes: content=${row.state.contentClass ?? "—"} chrome=${row.state.chromeClass ?? "—"}`,
    );
    for (const surface of SURFACES) {
      lines.push(
        `    ${surface.padEnd(19)}: ${row.reading[surface] ?? "(nothing drawn)"}`,
      );
    }
    lines.push(
      `    masthead (excluded) : ${row.masthead ?? "(nothing drawn)"}`,
    );
    lines.push("");
  }

  lines.push("## Enumerated and deliberately not produced");
  for (const item of ENUMERATED_AND_NOT_PRODUCED) {
    lines.push(`  - ${item.state}: ${item.why}`);
  }

  lines.push("", "## The declared partial collisions");
  for (const collision of PARTIAL_COLLISIONS) {
    lines.push(
      `  - ${collision.rows.join("  vs  ")}`,
      `      same    : ${collision.same.join(", ")}`,
      `      differs : ${collision.differs.join(", ")}`,
      `      ${collision.sentence}`,
    );
  }

  lines.push("", "## The declared collision classes");
  for (const [name, sentence] of [
    ...Object.entries(CONTENT_CLASSES),
    ...Object.entries(CHROME_CLASSES),
  ]) {
    lines.push(`  - ${name}: ${sentence}`);
  }

  return lines.join("\n");
}
