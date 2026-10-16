import {
  PERCENTILE_REFUSALS,
  UNUSUAL_ROWS,
  directionOf,
} from "@marketpulse/shared";

import type {
  Bar,
  PercentileRefusal,
  WireMarketOverview,
  WireUnusualActivity,
  WireUnusualRow,
} from "@marketpulse/shared";

import { arrivalKey } from "./arrival.js";
import { describeMeasuredReach, describeMeasuredSet } from "./measured-set.js";
import { NAME_NOT_ARRIVED } from "./movers.js";
import {
  BASELINE_REFUSALS_COUNTED,
  percentileOrdinal,
  percentileReading,
} from "./return-percentile.js";
import type { SectorRow } from "./sector-performance.js";

// **What the `Unusual activity` region reads as** (Task 5.4.3) — the rows it
// draws, the padding that keeps it one height, and nothing that computes an
// ordinal.
//
// ## Nothing here ranks and nothing here scores
//
// `movers.ts`' rule, and it is sharper here. The order is
// `selectByPercentile`'s, server-side, and the ordinal is
// `returnPercentileOf`'s against a 60-session distribution **no browser
// holds** — 101 breakpoints × 501 securities, ~417 KB, which is never going on
// this wire. So the rank below is the position in the array the frame sent,
// and a comparison of two ordinals anywhere in this file would be the second
// comparator `one-comparator-for-the-order-of-a-percentile` refuses by name.
//
// That makes this region's figure the first on this screen that a reader
// **cannot check against anything on the page**: a price has a chart beside
// it, a sector move has ten siblings, and a percentile has a distribution
// nobody can see. `readUnusual` is the only thing between a producer defect
// and a confident, well-formed row — which is why its five cross-field checks
// are the reader's half of the claim rather than belt and braces.
//
// ## No band, no score, no chip
//
// Story 5.4's Gate 1 decision 1. `packages/shared/src/anomaly.ts` deliberately
// holds no score→band boundaries, the four bands are defined for the composite
// 0–100 score, and this region ranks **one factor of four** — so a chip here
// would read `extreme` on price alone, ten times over, in a column 74 px
// wide. `AnomalyBadge` is imported by no shipped route and stays that way
// until Story 5.6 has thresholds to put in it.
//
// ## And the figure is drawn short and spoken whole
//
// `>99th percentile` is sixteen glyphs — 143.6 px in the cold-load face, on a
// row whose content box is **308 px at 1440** — which leaves the company name
// about six characters. So the word moves to the list heading, once, and the
// row draws the ordinal; the spoken string is unchanged. One fact, two
// renderings (ADR 0029), and the derivation runs short-from-long in
// `return-percentile.ts` so the two cannot drift.

/** Room and nothing else — see {@link withHeldUnusualRows}. */
const NBSP = " ";

/**
 * **The rows the region draws, in the order the frame sent them.**
 *
 * A record rather than a bare array, for `MarketMovers`' reason: the region's
 * three populations and its cut land **here** (Task 5.4.4) rather than in a
 * second shape beside this one. The baseline's **provenance** does not — it
 * is the screen's source note's, one surface up.
 */
export interface UnusualActivity {
  /** The ranked rows, most unusual first. At most {@link UNUSUAL_ROWS}. */
  readonly rows: readonly SectorRow[];
  /**
   * **What the ranking was taken over, and how much of it got past the line**
   * — the region's footer, in two renderings of one string (Task 5.4.4).
   *
   * `undefined` is the **reservation's** value and nothing else: a hidden
   * string is still in `textContent`, and every sentence this region can draw
   * is a claim about a ranking nothing has been computed over.
   */
  readonly claim: UnusualClaim | undefined;
  /**
   * **What the region says when it ranked nothing**, or `undefined` when it
   * ranked something — and `undefined` also for the reservation, which must
   * say nothing at all.
   *
   * ## Two nouns, because the two repairs differ
   *
   * *The market is shut* and *we are hearing nothing from an open market* are
   * different facts, and **one of them is not a fault**: its repair is *wait
   * until 09:30*. `market-unusual.ts` refuses the session basis outright — a
   * pass that ignored it would rank yesterday's 15:55→16:00 pair, for ever,
   * as unusual activity right now — so `eligible: 0` out of hours is
   * literally true, and that state lasts about 80% of the week until Task
   * 5.4.5 writes a nightly row.
   *
   * ## It is a string on the view rather than a flag for the component
   *
   * `MoversClaim`'s shape and `RESERVED_MOVERS`' reason: the reservation
   * renders the **real component** inside a `visibility: hidden` box to hold
   * its geometry, and **a hidden string is still in `textContent`** — so a
   * component that derived its own sentence from `rows.length === 0` would
   * put this region's words on the page twice in the one state where neither
   * is true yet, one `expect` away from being asserted.
   */
  readonly nothing: string | undefined;
}

/**
 * **The footer, in two renderings of one string** — `MoversClaim`'s shape and
 * its reason, one region across (Task 5.4.4).
 *
 * The two halves are identical in every state today and are a pair anyway, so
 * they cannot **diverge** the day the drawn half has somewhere to defer to.
 * The reversal trigger is `MoversClaim`'s, unchanged and still unfired here:
 * **the first printed figure in this region that states a denominator** — a
 * ladder, a count in the head slot, an `N of M` badge. The head slot states
 * the **bound** (`Top 10`) and no count at all, which is the recorded refusal
 * this region inherited from `MoversMeta`.
 */
export interface UnusualClaim {
  /** What is on the screen, under the list. */
  readonly drawn: string;
  /** What a listener is handed. */
  readonly spoken: string;
}

/**
 * **What this region has none of, when nothing was ranked** — see
 * {@link UnusualActivity.nothing}.
 *
 * One noun per region is what tells a reader **which** region went quiet when
 * two do at once, and this region's noun is **the ranking**: not `No moves to
 * rank yet.` (`Movers`'), not `No prices yet.`, not `No return yet.` nor `No
 * comparison yet.` And **not** AC 11's `No scores yet.`, which is stale rather
 * than wrong in register — Gate 1 decision 1 removed the score from this story
 * entirely, so a sentence about scores would be this region's first claim
 * about a figure it does not compute.
 *
 * Neither claims anything about the **market**: *nothing ranked* is a fact
 * about this ranking's input, where *nothing is unusual* would be a statement
 * about 501 companies most of which nobody heard from. The one shipped
 * sentence in this product that ever made that mistake is `describeSilence`.
 */
export const NOTHING_RANKED = "Nothing ranked yet.";

/** See {@link NOTHING_RANKED}. The market is shut, and that is not a fault. */
const NOTHING_RANKED_SHUT = "Nothing ranked while the market is shut.";

/**
 * **What this row's ordinal was measured against**, as the identity
 * `useSettle` compares — {@link SectorRow.basis}' rule with one word changed.
 *
 * A row travels only if it had a previous position under the **same** basis,
 * and a percentile's basis is the stored generation it was ranked against.
 * The nightly job writes a new one per session (ADR 0044), so the morning
 * after a generation lands every ordinal on the list is measured against a
 * different distribution — which is a **new list** rather than five
 * simultaneous re-orders, exactly as the opening bell is for `Movers`.
 *
 * The whole section shares one generation, so this is a section-level fact
 * read per row: the field is per row because `SectorRow` is, and a row cannot
 * be handed a basis the section did not have.
 *
 * A section whose rows read no generation — a cold replica, and **every gated
 * run** — has none, and the empty string stands for *the generation this
 * gateway did not name* rather than for a gap. It is still a basis every row
 * shares, which is `basisOf`'s own treatment of an unnamed close.
 */
const basisOf = (unusual: WireUnusualActivity): string =>
  `percentile:${unusual.baseline.generation?.session ?? ""}`;

/**
 * Read the overview frame's unusual section as the rows the region draws.
 *
 * `undefined` is **the absence of the section**, which the route draws as the
 * region's reserved state or as its own sentence depending on whether a frame
 * arrived at all — `marketMovers`' discriminator, unchanged, and the two
 * reachable absences are the same two: no frame yet (first paint), and a frame
 * from a **previous image** that carries no section, which a rollback pins.
 *
 * **An empty `rows` is NOT the absence**, which is `marketMovers`' departure
 * inherited rather than re-decided: `rows: []` means *nothing was rankable*,
 * which is CI's permanent state (516 securities, zero bars, no baseline
 * generation), about 80% of the week, and the first minutes of every session.
 * It is drawn — ten held rows with the region's own sentence over them —
 * rather than reserved invisibly for ever.
 *
 * @param names Symbol → company name, from the tracked universe. A symbol it
 * does not know is drawn with **blank room** rather than with its own ticker
 * (`NAME_NOT_ARRIVED`, Task 4.7.5) — the ticker is already in the track to the
 * left, and at 390 there is nothing between the two to tell them apart.
 */
export function unusualActivity(
  overview: WireMarketOverview | undefined,
  observations: ReadonlyMap<string, Bar>,
  fromSnapshot: ReadonlySet<string>,
  names: ReadonlyMap<string, string>,
): UnusualActivity | undefined {
  const unusual = overview?.unusual;
  if (unusual === undefined) return undefined;

  const basis = basisOf(unusual);

  const rows = unusual.rows.map((row, at) =>
    rowOf(row, at, basis, names, { observations, fromSnapshot }),
  );

  return {
    rows,
    claim: claimOf(unusual, overview?.observedAt),
    nothing: rows.length > 0 ? undefined : nothingRankedIn(overview),
  };
}

/**
 * **The three populations, the cut and the age** — one sentence from the one
 * builder, then `describeMeasuredReach`'s own line (Task 5.4.4).
 *
 * ## The qualifier is `observed` by CONSTRUCTION, not by a clock this reads
 *
 * `WireUnusualActivity` carries no basis of its own, deliberately: the
 * producer refuses the `session` basis outright, because a pass that ignored
 * it would rank yesterday's last pair as *unusual activity right now* for
 * ever (eviction in `trailing-window.ts` is relative to each security's own
 * newest bar, so nothing expires while the market is shut). So every section
 * that exists was taken over the freshness cutoff, and *heard from in the
 * last N minutes* is the one grammar that is true of it — including out of
 * hours, where the honest answer is `eligible: 0` and the sentence reads
 * *none were heard from*. The window itself is **read** off the section, never
 * spelled, which is the rule `one-home-for-the-observation-window` holds.
 *
 * ## The third population is withheld at zero rather than printed as `none`
 *
 * *…none were heard from in the last 5 minutes and none have a long enough
 * history to rank* is a fully-formed denominator about nothing — ADR 0029's
 * false impression, in a conjunct. That state is CI's permanent one and about
 * 80% of the week, so it is the state the sentence is **most often** in.
 *
 * ## What this clause does NOT say
 *
 * **No tape, no feed word and no instant of its own.** The numerator is `iex`
 * and the baseline is `sip` — the first figure on this screen whose two
 * halves come from different tapes — and that is `OverviewSourceNote`'s, once
 * for the screen, because a region-level feed line is the `BarSeriesPanel`
 * duplicate this product deleted. **And no subtraction**: see
 * `measured-set.ts`' `theCut`.
 */
function claimOf(
  unusual: WireUnusualActivity,
  observedAt: string | undefined,
): UnusualClaim {
  // **One condition for both halves of the cut.** A region that heard from
  // nothing ranked nothing and refused nothing, so the clause stating how
  // many got past the line and the clause saying why the rest did not are
  // the same claim and appear together — out of hours and on every gated run
  // the sentence is the lead alone. The producer cannot count a comparison
  // refusal over an empty eligible set, so this is coherence rather than a
  // second opinion about its figures.
  const heardNothing = unusual.eligible === 0;

  const lead = describeMeasuredSet({
    qualifier: { basis: "observed", windowMinutes: unusual.windowMinutes },
    tracked: unusual.tracked,
    count: unusual.eligible,
    ...(heardNothing ? {} : { ranked: unusual.scored }),
  });

  // The age is a sentence of its own rather than a clause, which is
  // `moversClaimOf`'s decision and its reason: it is keyed on neither
  // grammar, and it is **absent** rather than empty where the aggregate holds
  // no observation — every gated run, for ever.
  const reach = describeMeasuredReach(observedAt);
  const sentence =
    `${lead}.` +
    (heardNothing ? "" : whyTheRestAreNot(unusual.refusals.comparison)) +
    (reach === undefined ? "" : ` ${reach}.`);

  return { drawn: sentence, spoken: sentence };
}

/**
 * **Why the securities between the two denominators are not rows**, counted
 * by kind — or nothing at all, where none were refused (Task 5.4.4).
 *
 * ## Two kinds rather than one number, because they must not read alike
 *
 * *We hold too little history* and *the history we hold crosses a price
 * break we cannot adjust* are different facts with different repairs — the
 * first ends when the security has traded for long enough and the second
 * needs an adjusted series this product does not fetch (Story 5.3 reversed
 * 5.1's decision to ask the provider for one). A single `11 refused` would
 * make the surface pick one, which is ADR 0029's false impression chosen by
 * a renderer.
 *
 * ## The order is the vocabulary's own, so a third member draws itself
 *
 * Iterating `PERCENTILE_REFUSALS` rather than the record's keys is what makes
 * the clause total: a third refusal word is already a compile error in
 * `BASELINE_REFUSALS_COUNTED`, and this way it also **appears** rather than
 * being silently dropped by a renderer that listed two.
 *
 * ## A kind with no securities behind it says nothing
 *
 * ADR 0029 at the grain of a clause: `0 cross an unadjusted price break` is a
 * fully-formed claim about an empty set, and `split-discontinuity` is `0` on
 * most frames — five securities in the whole universe were over the ratio
 * when Task 5.3.2 measured, and a frame holds whichever of them happened to
 * be eligible. With both at zero there is no sentence at all, which is every
 * gated run and about 80% of the week.
 *
 * ## And it states counts rather than a subtraction
 *
 * `measured-set.ts`' `theCut` carries the argument: the two counts equal
 * `eligible − scored` in every reachable state and not provably in every
 * state, so nothing here says *the rest*, *the remaining 11* or *of those
 * refused*.
 */
function whyTheRestAreNot(
  comparison: Readonly<Record<PercentileRefusal, number>>,
): string {
  const said = PERCENTILE_REFUSALS.filter((kind) => comparison[kind] > 0).map(
    (kind) => BASELINE_REFUSALS_COUNTED[kind](comparison[kind]),
  );

  return said.length === 0 ? "" : ` ${said.join(" and ")}.`;
}

/**
 * **Which of the two honest-nothing nouns this frame earns.**
 *
 * ## The basis is read from the FRAME, and that is not a reach into another region
 *
 * There is exactly **one** eligibility pass per frame
 * (`breadth-is-counted-over-the-equities-alone` permits exactly one call site
 * of `eligibleMoves`), and its qualifier is the frame's, not a section's —
 * which is why `WireUnusualActivity` deliberately carries no basis of its own
 * and why `windowMinutes` stays one number per frame (Story 5.4's Gate 1,
 * false premise 6). So reading the basis off `breadth` is reading **the
 * frame's** answer, in the one section that carries it unconditionally, and
 * this region cannot disagree with the two that state the same fact in words.
 *
 * **It falls back to the open-market noun rather than guessing shut.** A frame
 * whose breadth section is unreadable — a rollback pinning a previous image —
 * tells us nothing about the session, and *nothing ranked yet* is true in
 * either case where *while the market is shut* would be a claim about a clock
 * nobody read. This module reads no clock at all, which is the region's rule
 * since Task 5.2.3 and what keeps it correct under Epic 13's replay.
 *
 * **Reversal trigger**, as a condition: the first state in which this
 * region's population and `Market breadth`'s are taken on different bases.
 * At that point the basis is this section's own fact and belongs on its own
 * wire shape.
 */
const nothingRankedIn = (overview: WireMarketOverview | undefined): string =>
  overview?.breadth?.basis === "session" ? NOTHING_RANKED_SHUT : NOTHING_RANKED;

/** What the arrival mark needs, as one argument rather than two trailing ones. */
interface Arrivals {
  readonly observations: ReadonlyMap<string, Bar>;
  readonly fromSnapshot: ReadonlySet<string>;
}

/**
 * One drawn row from one wire row.
 *
 * **The rank is the position in the array**, never a comparison — see this
 * module's header. The producer's `selectByPercentile` is the one order, it
 * builds no row for a security it refused, and the array arrives most-unusual
 * first; `readUnusual` has already refused a frame whose order disagrees with
 * the comparator.
 *
 * **There is no `move` on this row and that is the decision rather than a
 * gap.** `SectorRow.move` is a signed percentage against a close, drawn by
 * `PriceChange` and tinted — the quantity `Movers` ranks. This row's figure is
 * an **ordinal**, untinted, and the direction beside it is a glyph rather than
 * a figure: the percentile ranks `Math.abs(percent)`, so without it a −9%
 * crash and a +9% spike draw the identical row. Putting the ordinal in `move`
 * would have been one line and would have tinted it, which is
 * `AbnormalMove.module.css`' own argument — decoration standing where meaning
 * normally is.
 */
const rowOf = (
  row: WireUnusualRow,
  at: number,
  basis: string,
  names: ReadonlyMap<string, string>,
  arrivals: Arrivals,
): SectorRow => ({
  symbol: row.symbol,
  label: names.get(row.symbol) ?? NAME_NOT_ARRIVED,
  rank: at + 1,
  move: undefined,
  reading: {
    drawn: percentileOrdinal(row),
    spoken: percentileReading(row),
    /*
     * **`directionOf` decides on the ROUNDED figure**, which is the same value
     * every other direction on this screen is decided by: a move that prints
     * as `0.00%` draws an em dash rather than an arrow, here as everywhere
     * else. The fallback is the renderer's rather than a count's — a
     * non-finite percent cannot reach this row, because `readUnusual` refuses
     * one, and `"unchanged"` is what the six other drawing sites do.
     */
    direction: directionOf(row.percent) ?? "unchanged",
  },
  /*
   * **No absence words.** A row in this list was ranked by construction — the
   * producer builds no row for a refused security and carries no unranked
   * tail — so a caption saying what is missing would be a sentence about a
   * state this array cannot hold. The refusals are counted, and the region's
   * footer is where they are said (Task 5.4.4).
   */
  absent: undefined,
  basis,
  arrival: arrivalKey(
    arrivals.observations.get(row.symbol),
    arrivals.fromSnapshot.has(row.symbol),
  ),
});

/**
 * **Every symbol the ranking names, for the page's subscription** (Task
 * 5.4.3) — `moverSymbols`' job for this section and for its reason.
 *
 * The route builds its subscription key from every section the frame carries,
 * because a region that draws an arrival mark from `observations` is drawing
 * from a map that effect fills: omit a section and the mark can never fire on
 * the deployed page, which is Task 4.3.6's shipped defect.
 *
 * Taken from the **frame** rather than from the drawn rows, so the held pads'
 * non-breaking spaces can never reach a subscription.
 */
export function unusualSymbols(
  overview: WireMarketOverview | undefined,
): readonly string[] {
  return (overview?.unusual?.rows ?? []).map((row) => row.symbol);
}

/**
 * The rows the list draws: the real ones, then as many **held** rows as it
 * takes to reach {@link UNUSUAL_ROWS}.
 *
 * ## Why the region pads rather than reserving a height
 *
 * `withHeldRows`' argument one region over, and it binds harder here. At 1440
 * and 1024 this region sits on a `minmax(min-content, 1fr)` row and resolves
 * to 491 px whatever it holds — but **rows 2 and 3 of the landing grid share
 * one `fr`**, so a region that grows raises `Sector performance`, `Movers` and
 * `Market breadth` with it; and at 768 and 390 the rows are untied and the
 * region **is** its content, so a list going 10 → 2 would step the whole lower
 * page. The first minutes of a session are exactly that state, every morning.
 *
 * A `min-height` on the list is the other way to buy it and is the wrong one:
 * the height is the row pitch times ten plus nine separators, and **the row
 * pitch already exists exactly once**, in `.row`. A second copy is wrong the
 * first time the pitch changes and wrong *silently*, because nothing below
 * `pnpm e2e` computes a layout at all.
 *
 * ## The pads are real rows in the list, and that is a correctness requirement
 *
 * `useSettle` indexes into `element.children`, so the array handed to the FLIP
 * must be exactly the `<ol>`'s children: a row drawn in the list and missing
 * from that array makes every `to` position read off the wrong row, and rows
 * travel to places they were never in. So the pads go through the ordinary
 * `rows` prop, carry a rank so the `quietGroup="impossible"` filter keeps
 * them, and are refused a journey by the FLIP itself rather than by being left
 * out of it.
 *
 * ## They name nothing, and `held` is what keeps them out of the link tree
 *
 * A ranking's membership is an **answer**, so naming tickers here would put
 * invented securities with no figures on the landing page. The symbol is a
 * **run** of non-breaking spaces, one per slot — unique as a key, invisible on
 * screen, nothing a reader could mistake for a ticker, and positional, which
 * keeps a pad in the same slot when the real rows above it change in number.
 *
 * `held: true` is the field the row reads to draw **no anchor at all**.
 * `visibility: hidden` plus `aria-hidden` do nothing whatever to an `href`,
 * and `RankedList` leaked eleven invisible `/securities/<slug>` anchors for
 * ten days when a call site passed `held={undefined}` as a hard-coded
 * constant. The row knows; the list asks it.
 */
export function withHeldUnusualRows(
  rows: readonly SectorRow[],
): readonly SectorRow[] {
  if (rows.length >= UNUSUAL_ROWS) return rows;

  const held: SectorRow[] = [];
  for (let slot = rows.length; slot < UNUSUAL_ROWS; slot += 1) {
    held.push({
      symbol: NBSP.repeat(slot + 1),
      label: NBSP,
      rank: slot + 1,
      move: undefined,
      reading: undefined,
      absent: undefined,
      arrival: undefined,
      basis: undefined,
      held: true,
    });
  }

  return [...rows, ...held];
}

/**
 * **The paint before the first frame: no rows, so the region is ten held
 * pads** — `RESERVED_MOVERS`' shape and its recorded reason.
 *
 * It is the same value as *the frame arrived and nothing was rankable*, which
 * is CI's permanent state and about 80% of the week, deliberately: the two
 * differ in what the **region** says about them rather than in what the list
 * holds. `UnusualReservation` wraps this in a `visibility: hidden` box with
 * the sentence as a sibling; the route draws it plain when a frame has arrived
 * and had nothing in it.
 *
 * There is no roster to get wrong, which is the quiet difference from
 * `RESERVED_SECTORS`: eleven sectors are a set known from the universe, and a
 * ranking's membership is an answer — so the reservation is **the empty answer
 * with its room held**, and the room comes from the same padding every other
 * state uses.
 */
export const RESERVED_UNUSUAL: UnusualActivity = {
  rows: [],
  // **No footer either, and for the sentence's own reason below**: the claim
  // states three populations read off a section that has not arrived. The
  // room it occupies is held by `.claim`'s reserve rather than by a string,
  // which is what keeps the reservation the same height as every other state.
  claim: undefined,
  // **Room and nothing else**, which is `RESERVED_MOVERS`' decision and its
  // recorded reason: the whole subtree is `visibility: hidden` and
  // `aria-hidden`, so nothing here is seen or spoken — but a hidden string is
  // still in `textContent`. Every sentence this region can draw is a claim
  // about a ranking nothing has been computed over, and `undefined` is the
  // only value that is not one. The route draws the first-paint sentence as a
  // **sibling** of the held box, after `useWaited`'s floor.
  nothing: undefined,
};
