import {
  COMPOSITE_FACTORS,
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
import { BASELINE_REFUSALS_COUNTED } from "./return-percentile.js";
import type { SectorRow } from "./sector-performance.js";

// **What the `Unusual activity` region reads as** (Task 5.4.3) — the rows it
// draws, the padding that keeps it one height, and nothing that computes an
// ordinal.
//
// ## Nothing here ranks and nothing here scores
//
// `movers.ts`' rule, and it is sharper here. The order is `selectByScore`'s,
// server-side, and the score is `scoreAnomaly`'s over two 60-session
// distributions **no browser holds**. So the rank below is the position in the
// array the frame sent, and a comparison of two scores anywhere in this file
// would be the second comparator
// `one-comparator-for-the-order-of-a-composite-score` refuses by name.
//
// That makes this region's figure the first on this screen that a reader
// **cannot check against anything on the page**: a price has a chart beside
// it, a sector move has ten siblings, and a composite has two distributions
// and a weight set nobody can see. **Task 5.6.7 made that worse rather than
// better** — the figure was one factor against one distribution and is now a
// weighted sum of two, with a band word over it whose thresholds are a third
// thing nothing on screen can check. `readUnusual` is the only thing between a
// producer defect and a confident, well-formed row — which is why its
// cross-field checks are the reader's half of the claim rather than belt and
// braces.
//
// ## ~~No band, no score, no chip~~ — THE SCORE, AND THE BAND IN THE HEADING
//
// Story 5.4's Gate 1 decision 1 refused both, and its stated reason was that
// this region ranked **one factor of three**, so a chip would have read
// `extreme` on price alone, ten times over. **That expired with the
// composite**: the score is the row's figure since Task 5.6.7.
//
// **The band is drawn once, in the head slot, and is not on the row.** A
// per-row chip shipped for an afternoon and the owner took it out on a
// measurement — the top ten shared exactly one band, so 76 px of a 308 px row
// (25%) repeated one word ten times and left the company name eight
// characters. See {@link boundOf}, which carries the measurement and the
// wording.
//
// Two claims this comment used to make are false and are corrected here rather
// than quietly deleted, because one of them was a live claim about the tree:
//
//   - *"`AnomalyBadge` is imported by no shipped route and stays that way
//     until Story 5.6 has thresholds to put in it."* It was false for an
//     afternoon and is **true again**: the chip's one shipped consumer was
//     this region's row, and with the chip gone `AnomalyBadge` is the
//     security page's alone (`AbnormalMove`). Story 5.6's thresholds are
//     `ANOMALY_BAND_FLOORS` — measured quantiles of 34,318 scores (32 / 63 /
//     73) rather than invented ones.
//   - *"`packages/shared/src/anomaly.ts` deliberately holds no score→band
//     boundaries."* **Still true**, and still the right place for it to be
//     true: the floors live in `composite-score.ts` beside the scorer that
//     applies them, and the band this region names is the **producer's** —
//     read off the wire, never re-derived here.
//
// ## The figure has no long form, so it is drawn and spoken as ONE string
//
// `>99th percentile` was sixteen glyphs — 143.6 px in the cold-load face, on a
// row whose content box is **308 px at 1440** — so the word moved to the list
// heading and the row drew the ordinal short with a visually-hidden sibling
// carrying the phrase. `61` is `61`: there is nothing to defer to, so the cell
// renders one element rather than putting the same string in `textContent`
// twice (ADR 0029, and the branch `Unusual.claim` takes one element over).
//
// The noun is still in the heading and the **scale** is in the footer once —
// `2 of 3 factors, to a maximum of 75` — rather than ten times down the
// column, which is what the cohort rule buys: every drawn row shares the
// ranked cohort by construction.

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
  /**
   * **The head slot's whole string: the bound, and today's band** —
   * `Top 10 · all extreme`, or `Top 10 · led by extreme` (see
   * {@link boundOf}).
   *
   * `undefined` where the slot falls silent: the reservation, and a section
   * that ranked nothing. That is `UnusualMeta`'s shipped rule read off the
   * view rather than re-derived from `rows.length` in the component —
   * {@link UnusualActivity.nothing}'s argument at the grain of the head,
   * and it is what lets the reservation render the real component with
   * nothing in its slot.
   */
  readonly bound: string | undefined;
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
    nothing: rows.length > 0 ? undefined : nothingRankedIn(unusual),
    // **The bands are read off the WIRE rows rather than the drawn ones**, so
    // the clause cannot be computed from a held pad: `withHeldUnusualRows`
    // pads to ten with rows that carry no band at all, and a clause derived
    // after the padding would have to decide what an invented row's band is.
    bound: boundOf(unusual.rows),
  };
}

/**
 * **The head slot's string: the bound, and the band the ten rows are in** —
 * `Top 10 · all extreme`.
 *
 * ## The band is a property of the DAY, so it is stated ONCE
 *
 * This replaces a per-row chip that shipped for an afternoon and was taken
 * out by the owner on a measurement: against the stored composites, the top
 * ten shared **exactly one** band — ten `extreme` rows out of sixteen
 * `extreme` securities in the whole universe — and Task 5.6.3 had already
 * measured all ten rows sharing one band in **35 of 77** instants and more
 * than three sharing one in **77 of 77**. A top-N selected for extremity and
 * bucketed by extremity concentrates in the top bands by construction, which
 * `Unusual.tsx` had written down as the chip's own argument: *the chip stops
 * being a property of the selection and becomes a property of the day*. A
 * property of the day is stated once, not ten times down a 308 px column —
 * where it cost **76 px of a 308 px row, 25%**, and squeezed the company name
 * to 57 px, about eight characters (`Dominio…`, `The Kra…`, `3M Co…`).
 *
 * ## Two sentences, and the one that is not `all` names the LEADER
 *
 * The rows arrive score-descending and the band is a monotone function of the
 * score, so the drawn bands are a non-increasing run: the honest statements
 * available are *they are all X*, *they run from X down to Y*, and *the
 * leader is X*.
 *
 * **The span does not fit, measured rather than argued.** The head's content
 * box is **308 px** at 1440 and at 390 — the binding width, because at 1024
 * the region is wider and at 768 it is 686 — of which the region title takes
 * **120.3** and `Panel.header`'s gap takes 16, leaving the slot **171.7**.
 * Measured in the **cold-load face** (the webfont aborted, which is the wider
 * one), in `.bound`'s own face at 1440:
 *
 * | string                         | px     |      |
 * | ------------------------------ | ------ | ---- |
 * | `Top 10 · all extreme`         | 141.31 | fits |
 * | `Top 10 · all elevated`        | 145.45 | fits |
 * | `Top 10 · led by extreme`      | 162.36 | fits |
 * | `Top 10 · led by elevated`     | 166.48 | fits |
 * | `Top 10 · extreme to high`     | 170.91 | fits |
 * | `Top 10 · elevated to normal`  | 196.55 | OVER |
 * | `Top 10 · extreme to elevated` | 201.28 | OVER |
 *
 * So a two-band span is reachable **and over the line by 25–30 px** for every
 * span of more than one step, and the failure is not a clipped word: the
 * title's `.headings` carries `min-width: 0`, so an oversized slot **wraps
 * `Unusual activity` onto a second line** and takes the region's height — and
 * at 768 and 390 the grid row is content-sized, so the whole lower page steps.
 * A clause that fits on most days and steps the page on the rest is worse
 * than one that never does.
 *
 * Of the two endpoints, the **leader's** band is the one a ranked surface's
 * heading should carry: it is the row the reader's eye is already on, it is
 * the answer to *is today worth looking at*, and a quiet day states itself
 * (`led by elevated` is how a top ten says it found nothing extreme). The
 * bottom row's band says less and costs the same.
 *
 * **`Top 10` stays.** It is the one thing about this region true in every
 * state that is not a claim about data, and it is the only surface that says
 * the list is a **selection** rather than everything there was.
 *
 * ## It is a word and never a fill
 *
 * The band word is written, never abbreviated — the ramp's four amber steps
 * are separated by 1.12, 1.43 and 1.59 in greyscale, enough to see a change
 * and nowhere near enough to name one — and the head carries **no fill at
 * all**. Fewer amber positions is better, the word reads correctly without
 * one, and `amber-appears-once-in-the-rail` would fail the build on a second
 * stylesheet spending the ramp: the chip's own file is the only one allowed
 * to. So `/` is back to having **no amber on it**, which is the state
 * `Unusual.tsx` recorded before the chip and the collision Story 5.6 owns
 * stays off this screen.
 *
 * **The ten is interpolated, never typed** — `the-population-is-never-a-
 * literal`'s rule one scale down.
 */
const boundOf = (rows: readonly WireUnusualRow[]): string | undefined => {
  const top = rows[0]?.band;
  if (top === undefined) return undefined;

  // **`all` is about the rows that are drawn**, which is what a reader sees:
  // a short list of three that share a band says `all extreme` over three
  // rows beside a `Top 10` that states the bound. The populations are the
  // footer's job and it states three of them.
  const shared = rows.every((row) => row.band === top);

  return `Top ${String(UNUSUAL_ROWS)} · ${shared ? "all" : "led by"} ${top}`;
};

/**
 * **The three populations, the cut and the age** — one sentence from the one
 * builder, then `describeMeasuredReach`'s own line (Task 5.4.4).
 *
 * ## The qualifier IS the section, passed whole — no basis is built here
 *
 * `WireUnusualActivity` is a discriminated union whose two arms structurally
 * satisfy `MeasuredQualifier` (Task 5.4.5), so this hands the section over and
 * the builder keys its grammar on the **producer's** own answer — exactly as
 * `market-breadth.ts` and `movers.ts` do with theirs. Nothing here constructs
 * a basis, and `the-counted-basis-is-read-off-the-frame` refuses a renderer
 * that does: a hard-coded `observed` draws *heard from in the last 5 minutes*
 * over the last session's stored closing figures, which is a well-formed,
 * confidently-dated wrong sentence for about 80% of the week. That is the code
 * this function shipped with until this task.
 *
 * The window and the span are **read** off the section, never spelled, which
 * is the rule `one-home-for-the-observation-window` holds.
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
    qualifier: unusual,
    tracked: unusual.tracked,
    count: unusual.eligible,
    // **The cut, and the scale it is on** — absent together with the refusal
    // clause, because a region that heard from nothing scored nothing and
    // refused nothing. The scale comes off the **cohort** rather than off
    // `scored`: `scored` counts every security that got a composite at all and
    // the rows are a selection from the cohort, so a sentence stating `scored`
    // beside the cohort's maximum would be two populations wearing one scale.
    ...(heardNothing
      ? {}
      : {
          cut: {
            count: unusual.cohort?.scored ?? unusual.scored,
            ...(unusual.cohort === undefined
              ? {}
              : {
                  scale: {
                    factors: unusual.cohort.factors.length,
                    absent:
                      COMPOSITE_FACTORS.length - unusual.cohort.factors.length,
                    max: unusual.cohort.max,
                  },
                }),
          },
        }),
    // **Which move the count is of, where the basis names a measurement.**
    // The session grammar's default phrase is `Market breadth`'s figure — the
    // previous session's close against this one's — and these rows are a move
    // into that session's close. The span is read off the section.
    move: { kind: "closing-span", spanMinutes: unusual.spanMinutes },
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
 * **Which of the two honest-nothing nouns this section earns.**
 *
 * ## The basis is this SECTION's own, since Task 5.4.5
 *
 * It used to be read off `breadth`, because the section carried no basis: the
 * recorded reversal trigger was *the first state in which this region's
 * population and `Market breadth`'s are taken on different bases*, and what
 * fired instead was the **wire** gaining the discriminant — the two regions
 * still agree about the basis, and now this one can say so itself rather than
 * reaching across the frame to find out.
 *
 * **It falls back to the open-market noun rather than guessing shut**, which is
 * unchanged: a section whose basis is unreadable is a section this reader
 * dropped entirely, and *nothing ranked yet* is true either way where *while
 * the market is shut* would be a claim about a clock nobody read. This module
 * reads no clock at all, which is the region's rule since Task 5.2.3 and what
 * keeps it correct under Epic 13's replay.
 */
const nothingRankedIn = (unusual: WireUnusualActivity): string =>
  unusual.basis === "session" ? NOTHING_RANKED_SHUT : NOTHING_RANKED;

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
    /*
     * **The score, drawn and spoken as ONE string** — there is no long form to
     * defer to. The ordinal this replaced was drawn `>99th` and spoken `>99th
     * percentile` because sixteen glyphs did not fit the row; `61` is `61`, so
     * the cell renders one element rather than putting the same string in
     * `textContent` twice (ADR 0029, and the branch `Unusual.claim` takes one
     * element over).
     *
     * The noun stays in the list heading, which is where the word `percentile`
     * went for the same arithmetic, and the **scale** is in the footer once —
     * `2 of 3 · max 75` — rather than ten times down a 308 px column.
     */
    drawn: String(row.score),
    spoken: String(row.score),
    /*
     * **The direction, where this basis holds a move** — absent rather than
     * `"unchanged"` since Task 5.6.7, and the change is the `session` arm's.
     *
     * `directionOf` decides on the **rounded** figure, which is the value every
     * other direction on this screen is decided by: a move that prints as
     * `0.00%` draws an em dash rather than an arrow. What is new is that the
     * move itself can be **absent** — `session_composite_scores` stores the
     * factor answers and no signed move, so the session arm reads it from
     * `session_return_percentiles` beside the score, and a security scored on
     * its excess factor alone has a composite row and no percentile row. The
     * old `?? "unchanged"` would draw an em dash there, which is the claim
     * *this security did not move* rather than *we do not hold its move*.
     */
    ...(row.percent === undefined
      ? {}
      : { direction: directionOf(row.percent) ?? "unchanged" }),
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
  // **No head slot either.** The bound is `UnusualMeta`'s shipped rule — it
  // falls silent when nothing was ranked, because a bound stated over an
  // empty list reads as a claim about a selection that selected nothing —
  // and the band half of it would be a claim about rows that do not exist.
  bound: undefined,
};
