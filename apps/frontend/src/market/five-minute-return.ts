import { directionOf } from "@marketpulse/shared";

import { formatBarInstant } from "./chart-reading.js";
import { formatChangePercent } from "./price-format.js";
import {
  percentileReading,
  percentileRefusal,
  percentileSample,
} from "./return-percentile.js";
// **The tape line's one grammar** (Task 5.5.4). It was `tapeOf` in this file
// until the volume band needed the same sentence with a different pair of
// feeds; a second copy there would be a second answer to *how does this
// product name the tapes behind a comparison*.
import { measuredTape } from "./measured-tape.js";

import type {
  WireReturnComparison,
  WireReturnRefusal,
} from "@marketpulse/shared";
import type { SymbolReturnView } from "./live-feed.js";
import type { PriceDirection } from "./price-format.js";

// **The 5-minute return's read side** (Task 5.2.3) — the first figure in
// `Abnormal-move indicators`, and the second of the three reserved rail
// regions to fill.
//
// ## Nothing here computes the figure
//
// The percentage, both endpoints, the observed count and the span are the
// backend's, from a trailing window no browser holds — and at `3M` and `1Y`
// the series the chart holds is `1d` bars with no five-minute endpoint in it
// at all, which is one of the three reasons the owner's Gate 1 decision put
// the computation behind the wire. What this module does is **spell** it: a
// formatted figure, a direction read off the one classifier, two instants
// through the one formatter, and a sentence per refusal.
//
// ## Why the symbol is compared rather than trusted
//
// The gateway answers the focus a browser last declared, and a reader moving
// from NVDA to AMD has one subscribe round trip in which the last answer is
// about NVDA. A surface reading the figure alone would draw NVDA's return
// under AMD's name — a well-formed, correctly-coloured figure about the wrong
// security, which is the class of defect this region exists to avoid at the
// arithmetic level. So the band is **about a symbol** and a figure for another
// one is the same answer as no figure at all.
//
// ## It says nothing about the feed, and that is AC 6
//
// No threshold, no status word, no connection word, no second staleness
// sentence. The two instants are on screen and the reader does the
// subtraction — `ProxyReading.note`'s *an age, never a verdict*, and the one
// home for *the feed has stopped* is the status bar (Story 3.10). The 187-minute
// ordinary maximum gap between one security's bars is what any threshold here
// would have had to spare.
//
// ## And it dates the OBSERVATION, never the computation
//
// `computedAt`, `sentAt` and `Date.now()` appear nowhere in this module or in
// the component that draws it. Both instants are bars' own `startsAt`, carried
// on the frame, and **neither has `OBSERVATION_INTERVAL_MS` added**:
// `describeMeasuredReach` adds it because it claims *reach* — how far the data
// we hold extends — while these two are the ends of a **span**, and a minute
// added to each would print a five-minute return as six minutes apart.

/** The micro label over the figure. */
export const RETURN_LABEL = "5-minute return";

/**
 * **`No return yet.` — the sixth honest-nothing noun in this product**, beside
 * `No prices yet.`, `No count yet.`, `No sector moves yet.`, `No moves to
 * rank yet.` and `No comparison yet.`
 *
 * It is the region's own sentence, so it takes the terminal stop the five
 * in-region absences below do not, and it means **one** thing: no `return`
 * frame about this security has arrived. *The frame arrived and the window was
 * empty* is a different fact with its own words, which is Task 5.1.4's lesson
 * one region up — collapsing them tells a reader the socket is quiet when it
 * is not, and that is the state every gated run is permanently in.
 */
export const NO_RETURN = "No return yet.";

/*
 * ## The four sentences below, and why none of them is one of the eight
 * ## already approved (Task 5.2.4, done-when 3)
 *
 * The eight are `relative-performance.ts`' — `No comparison yet.`,
 * `Not heard from`, `No close to measure from`, `No move for this security
 * yet`, `No move for the reference yet`, `Measured from different closes`,
 * `A broad-market fund has no sector` and `This security is its sector's
 * benchmark`. The register is inherited rather than re-invented: short, no
 * connection word, no terminal stop except on the region-level one.
 *
 * **{@link NO_RETURN}** is the **region-level noun**, and `NO_COMPARISON`
 * names the region one down. Reusing it would put one string in two regions
 * and tell a reader the comparison is missing when the return is.
 *
 * **{@link NO_EARLIER}** is the **missing-endpoint refusal**. `NO_CLOSE` says
 * *no close to measure from* and a close is a **session** artefact off the
 * universe answer; what is missing here is a **minute bar at an instant**, so
 * reusing it would tell a reader the store lacks a close when it lacks a
 * minute.
 *
 * **And there are FOUR rather than the two this task's brief names**, which is
 * recorded here because the count is the sort of thing the next reader
 * inherits. The brief enumerated the two states it was arguing about; the
 * producer has **three** refusals, each of which needs words, plus the region
 * noun. Neither of the other two can be one of the eight either:
 *
 * **{@link NO_BARS}** is *nothing has been observed for this security*, which
 * is the closest any of them comes to an approved sentence — `NOT_HEARD` reads
 * *Not heard from*. It is not reused for two reasons. That string is private
 * to the comparison region and exporting it to a second region is the one
 * string in two places this file's own argument refuses; and `NOT_HEARD` is a
 * row label in a three-row ladder where the subject is named beside it, while
 * this stands alone in a figure's slot where *from* would have no object.
 *
 * **{@link NO_BASIS}** is *the older close is zero or not a number*. Nothing
 * in the eight says anything about a **divisor**: `NO_CLOSE` is an absence and
 * this is a present value that cannot be divided by, which is a different fact
 * and the one that otherwise renders as `Infinity%`.
 */

/** The window holds no bar at or before now. A cold process's first minutes. */
const NO_BARS = "No bars observed yet";

/**
 * **The refusal this story exists for.** There is a newer bar and no bar whose
 * own instant is exactly the span before it, so there is no pair to measure —
 * and the nearest bar is not a substitute: `ERIE` at 2.1% minute coverage
 * would produce "the 5-minute return" between bars 47 minutes apart.
 */
const NO_EARLIER = "No bar five minutes back";

/** The older close is zero or not a number, so the division has no meaning. */
const NO_BASIS = "No basis for a percentage";

/** The figure, formatted and classified — `PriceChange`'s two inputs. */
export interface ReturnFigure {
  /** The signed percentage as the screen shows it — `+0.42%`, `−1.08%`. */
  readonly change: string;
  readonly direction: PriceDirection;
}

/** What the band draws. One band today; 5.3, 5.5 and 5.6 add their own. */
export interface ReturnBand {
  /** The micro label. Spelled by the component, read from here. */
  readonly label: string;
  /** The figure, or `undefined` when there is none. */
  readonly move: ReturnFigure | undefined;
  /**
   * The stated word where a figure would be — **never a dash.** `—` is
   * `unchanged` in `PriceChange`, so a dash in this slot asserts a zero
   * return.
   */
  readonly absent: string | undefined;
  /**
   * The instants and how much of the span was observed, or `undefined` where
   * there is nothing to describe.
   *
   * **Two instants on a measured figure and one on a refusal that held a bar**
   * (Task 5.2.4), because that is what each has: `undefined` is reserved for a
   * window that observed nothing and for an instant that cannot be read.
   */
  readonly qualifier: string | undefined;
  /**
   * **How unusual the magnitude is**, drawn as a second cell on the figure's
   * own row — `99th percentile` — or `undefined` where there is no baseline to
   * compare it with (Task 5.3.3).
   *
   * `undefined` is the ordinary answer rather than a degraded one: a cold
   * replica holds no generation, a security with no stored `sip` history has no
   * distribution, one whose window crosses an unadjusted split is **refused**,
   * one below `BASELINE_MINIMUM_SAMPLE` is refused when it is read, and on CI
   * no frame can carry one at all. **Since Task 5.3.4 every one of those says
   * so** in {@link sample} rather than leaving the row blank.
   */
  readonly percentile: string | undefined;
  /**
   * **What the percentile was taken against — or why there is none** — the
   * counted `n`, the span the samples are of, and the pooling, in one footer
   * line.
   *
   * ~~It draws exactly where {@link percentile} does.~~ **Amended 2026-10-14
   * (Task 5.3.4): it draws where a comparison was ATTEMPTED**, which is a
   * larger set. Beside a rank it states the sample, because a rank with no
   * sample behind it is the same claim at `n = 737` and at `n = 4,620` —
   * ADR 0029's false impression in one number. Without one it states the
   * refusal, in the same row, because a figure with blank room under it says
   * *we did not think to compare this* when the truth is *we will not*.
   */
  readonly sample: string | undefined;
  /** Which tape the figure was measured on — invariant 6, or `undefined`. */
  readonly tape: string | undefined;
  /**
   * **No frame about this security has arrived.** The component holds the
   * band's room and says {@link NO_RETURN} over it, which is not the same
   * state as a frame carrying a refusal.
   */
  readonly nothing: boolean;
}

/** The band's room with nothing in it — the paint before the first frame. */
export const RESERVED_RETURN: ReturnBand = {
  label: RETURN_LABEL,
  move: undefined,
  absent: undefined,
  qualifier: undefined,
  percentile: undefined,
  sample: undefined,
  tape: undefined,
  nothing: true,
};

/**
 * The words for each refusal — three facts, three sentences.
 *
 * **A total record over `WireReturnRefusal`**, so a fourth refusal on the wire
 * is a **compile error naming the missing member** rather than an `undefined`
 * reaching the figure slot. The same guard `MARKET_FEED_DESCRIPTIONS` uses,
 * pointed at a union that crosses a socket.
 */
const REFUSALS: Readonly<Record<WireReturnRefusal, string>> = {
  "nothing-observed": NO_BARS,
  "no-earlier-endpoint": NO_EARLIER,
  "no-basis": NO_BASIS,
};

/**
 * **The two instants and the part of the span that was observed.**
 *
 * ## Oldest first, and both of them
 *
 * AC 4 asks for the older — it is the only thing distinguishing a 5-minute
 * return from a 47-minute one — and printing one leaves the reader doing
 * arithmetic the product has already done. The span is the whole defence
 * against the 47-minute figure, so it is **shown** rather than implied.
 *
 * ## Both are spelled by `formatBarInstant`, which prints the date too
 *
 * That function is the one home for *a bar's instant in market terms*, and at
 * `1m` it prints `Oct 14 · 14:06 EDT` — the date, the time and the zone. So
 * this clause repeats the date.
 *
 * **Decided again on 2026-10-14 (Task 5.2.4), deliberately rather than by
 * eye, and the repetition is KEPT.** The one honest argument against keeping
 * it is stronger than Task 5.2.3 recorded: the two endpoints are **exactly
 * five minutes apart by construction**, and no five-minute span inside the
 * hours the feed delivers bars for can cross a market date — so the second
 * date is not merely repetitive, it is **zero-information**, and dropping it
 * would be an *unconditional* rule rather than the same-day conditional
 * grammar UX refused for the k-count.
 *
 * _Rejected anyway_, on three counts. It needs a **second spelling of an
 * instant** — a time-only formatter beside `formatBarInstant`, which is the
 * one home for this, and the duplication this product refuses is exactly the
 * kind that looks free at the call site. The zero-information argument rests
 * on *no span crosses a date*, which is a property of the **vendor's** hours
 * and of `RETURN_SPAN_MINUTES`, neither of which this module owns — a span
 * widened by a later story, or an overnight bar, makes the dropped date the
 * one thing the reader needed. And a refusal now prints **one** instant
 * ({@link seenQualifierOf}), so a time-only form would have to decide what a
 * lone `14:06 EDT` means, which is a second decision bought with the first.
 *
 * The first endpoint's date is load-bearing either way: a process quiet since
 * Friday holds a perfectly valid pair whose instants are days old, and times
 * alone would read as today's.
 *
 * **Reversal trigger:** the first width at which this clause **clips** rather
 * than wrapping inside its two reserved lines — which is a measurement, not an
 * opinion, and `pnpm probe` is where it comes from.
 *
 * ## One grammar for k, with no special case at five
 *
 * `observed 5 of 5 minutes`, never *all five*. A second grammar at the
 * complete end is two sentences for one fact and destroys the scan between two
 * securities — and `5` is **read** off the frame's `spanMinutes` rather than
 * typed here, which is `one-home-for-the-observation-window`'s rule applied to
 * a span: a rollback can put a gateway and a bundle two values apart.
 */
function qualifierOf(
  from: Date,
  to: Date,
  observed: number,
  spanMinutes: number,
): string {
  return (
    `${formatBarInstant(from, "1m")} → ${formatBarInstant(to, "1m")} · ` +
    observedClause(observed, spanMinutes)
  );
}

/**
 * **How much of the span was observed** — one grammar, and the only clause
 * both a figure and a refusal draw.
 *
 * `5` is read off the frame's `spanMinutes` rather than typed here, which is
 * `one-home-for-the-observation-window`'s rule applied to a span: a rollback
 * can put a gateway and a bundle two values apart.
 */
const observedClause = (observed: number, spanMinutes: number): string =>
  `observed ${String(observed)} of ${String(spanMinutes)} minutes`;

/**
 * **The one instant a refusal has, and the part of the span it saw** (Task
 * 5.2.4).
 *
 * ## Why a refusal draws a clause at all
 *
 * Without it, *we hold one bar and there is no pair* and *we have heard
 * nothing at all* are a four-word difference in one sentence with identical
 * blank room beneath — the two facts that look identical, which Story 5.1
 * shipped collapsed for a day one region down. With it, the first says
 * **when** the bar it holds is and **how much** of the five minutes it heard,
 * and the second says nothing because it has nothing to say.
 *
 * ## One instant and not a pair with one end invented
 *
 * ADR 0029: each clause renders only when its own data is present. There is
 * **no `→`**, because an arrow with one end is a span whose other end the
 * reader has to guess — and the arrow is what a measured figure's clause means.
 * The grammar for `k` is the measured clause's, unchanged, because it is the
 * same fact about the same five minutes.
 *
 * **It is NOT a conditional spelling of one sentence**: the two clauses differ
 * because the data differs, which is the honest-absence idiom, rather than
 * because the same data is spelled two ways — which is what UX refused for the
 * k-count and what the repeated date below is kept to avoid.
 */
function seenQualifierOf(
  newest: Date,
  observed: number,
  spanMinutes: number,
): string {
  return (
    `${formatBarInstant(newest, "1m")} · ` +
    observedClause(observed, spanMinutes)
  );
}

/**
 * An instant off the wire, or `undefined` where it cannot be read.
 *
 * `Date.parse` answers `NaN` for anything it cannot read and `new Date(NaN)`
 * **formats without complaining** — it reaches a screen as the words `Invalid
 * Date`. The decoder checks the field is a string; whether it parses is the
 * drawing surface's refusal, exactly as it is for the overview's instants.
 */
function instantOf(value: string): Date | undefined {
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : new Date(at);
}

/**
 * **The footer row: what the percentile was taken against, or why there is no
 * percentile** (Task 5.3.4).
 *
 * One row with two jobs, which is what *replacing a clause rather than adding
 * a row* means in code — and the row's reserve is the bias clause's at every
 * width, so both refusal sentences fit inside room that was already held.
 *
 * `undefined` for a comparison the frame did not carry, and `undefined` for a
 * ranked one whose instants could not be read: the bias arm of
 * {@link percentileSample} is derived from those two instants, so a sentence
 * that cannot evaluate its own condition is not drawn at all. A **refusal**
 * has no such condition and survives both.
 */
function sampleOf(
  comparison: WireReturnComparison | null,
  from: Date | undefined,
  to: Date | undefined,
): string | undefined {
  if (comparison === null) return undefined;
  if (!comparison.ranked) return percentileRefusal(comparison);
  if (from === undefined || to === undefined) return undefined;

  return percentileSample(comparison, from, to);
}

/**
 * **The band, for the security this page is about.**
 *
 * @param symbol The security on screen.
 * @param held What the feed is holding, or `undefined` before the first frame.
 */
export function fiveMinuteReturnBand(
  symbol: string,
  held: SymbolReturnView | undefined,
): ReturnBand {
  // **A figure about another security is no figure at all** — see the module
  // comment. This is the navigation window, one subscribe round trip wide.
  if (held?.symbol !== symbol) return RESERVED_RETURN;

  const { figure } = held;

  if (!figure.measured) {
    // **The one instant it has, where it has one** (Task 5.2.4). The frame's
    // own shape decides: a window that observed nothing carries no span, so
    // there is nothing here to draw rather than a renderer choosing to draw
    // less. An instant that cannot be read drops the clause and keeps the
    // refusal, which is `qualifier`'s rule on a measured figure arriving at
    // the refusal.
    // **`??` rather than `=== null`**, so a frame from a gateway that predates
    // the field — which a browser can hold across a deploy — is *no span*
    // rather than a thrown read on `undefined.newest`. The decoder answers
    // `null`, and this is the arm that makes that an assurance rather than a
    // requirement.
    const seen = figure.seen ?? undefined;
    const newest = seen === undefined ? undefined : instantOf(seen.newest.at);

    return {
      label: RETURN_LABEL,
      move: undefined,
      absent: REFUSALS[figure.refusal],
      qualifier:
        seen === undefined || newest === undefined
          ? undefined
          : seenQualifierOf(newest, seen.observed, seen.spanMinutes),
      // **No percentile on a refusal**, and the frame cannot carry one: there
      // is no magnitude to rank, so `percentile` is a member of the measured
      // arm alone and this is a compile-time absence rather than a branch.
      percentile: undefined,
      sample: undefined,
      // **No tape line on a refusal** (ADR 0029): there is no number, so there
      // is nothing whose provenance could be claimed, and a fully-formed
      // source line about no figure is the false impression that rule exists
      // for.
      //
      // **Unchanged by the clause above** (Task 5.2.4), and the distinction is
      // the rule's own: `Measured on IEX` is a claim about a **measurement**,
      // and no measurement happened. The instant beside it is a fact about a
      // bar we hold, which is a different claim with its own words.
      tape: undefined,
      nothing: false,
    };
  }

  const from = instantOf(figure.from.at);
  const to = instantOf(figure.to.at);

  // **The direction is the one classifier's**, never a comparison here:
  // `one-classifier-for-the-direction-of-a-move` decides on the **displayed**
  // figure, so a +0.004% return cannot draw an up arrow beside `0.00%`. A
  // non-finite percentage has no direction and the decoder has already refused
  // one, so `?? "unchanged"` is the unreachable arm rather than a decision.
  const direction = directionOf(figure.percent) ?? "unchanged";

  // **The comparison, where the frame carried one and both instants read.**
  //
  // The instants are a condition on the **sample clause** rather than on the
  // percentile: the rank is true whatever the strings carrying its endpoints
  // did, but the bias clause is derived from `from`/`to` and a sample sentence
  // that could not evaluate its own condition would have to guess which of its
  // two grammars to draw. ADR 0029 — each clause renders only when its own
  // data is present — so the pair travels together and the figure survives
  // without either.
  // **The comparison the frame carried, if it carried one at all.** `null` is
  // a gateway that said nothing — a browser holding a bundle across a deploy,
  // or a distribution the producer could not read — and it draws nothing,
  // which is ADR 0029's defer rule: no rank, and no sentence explaining the
  // absence of one, because we were not told there is an absence.
  const comparison = figure.percentile;

  // **A ranked comparison needs both instants and a refusal does not** (Task
  // 5.3.4), and that is not a convenience: the sample clause's bias arm is
  // derived from `from`/`to`, so a sentence that could not evaluate its own
  // condition would have to guess which of its two grammars to draw. The
  // refusal sentences have no such condition — *we hold 737 returns* is true
  // whatever the strings carrying the endpoints did — so they survive an
  // unreadable instant, which is the state that would otherwise silently
  // print a figure with no account of its missing comparison.
  const percentile =
    comparison === null ||
    !comparison.ranked ||
    from === undefined ||
    to === undefined
      ? undefined
      : comparison;

  return {
    label: RETURN_LABEL,
    move: { change: formatChangePercent(figure.percent), direction },
    absent: undefined,
    // **The clause is absent when either instant is unreadable, and the figure
    // still draws.** The percentage is true whatever the strings carrying its
    // instants did; what must not happen is `Invalid Date` on the page.
    qualifier:
      from === undefined || to === undefined
        ? undefined
        : qualifierOf(from, to, figure.observed, figure.spanMinutes),
    percentile:
      percentile === undefined ? undefined : percentileReading(percentile),
    // **The refusal replaces the sample clause rather than adding a row**
    // (Task 5.3.4), which is what keeps the region one height: this row is
    // reserved for the bias clause at every width and both refusal sentences
    // are shorter than it.
    sample: sampleOf(comparison, from, to),
    // **Two tapes rather than one, where a comparison was drawn** — the
    // numerator's and the baseline's. See `tapeOf`: one tape per comparison is
    // not achievable and the screen must not imply it is.
    tape: measuredTape(
      [figure.from.feed, figure.to.feed],
      percentile === undefined ? undefined : percentile.feed,
    ),
    nothing: false,
  };
}
