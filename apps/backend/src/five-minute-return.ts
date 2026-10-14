import { TRAILING_WINDOW_SPAN_MS } from "./trailing-window.js";

import type { BarSource } from "@marketpulse/shared";
import type { LiveObservation } from "./market-data-stream.js";

/**
 * **The 5-minute return — two subtractions and one refusal, and the refusal is
 * the whole substance** (Task 5.2.2).
 *
 * `ERIE` at **2.1%** minute coverage (`LIVE-DATA.md` §7.6) would otherwise
 * produce _"the 5-minute return"_ between bars **47 minutes** apart, and the
 * measured ordinary maximum gap is **187 minutes** — a well-formed,
 * correctly-signed, correctly-coloured figure that is wrong by a factor nobody
 * can see. AC 3 makes that a **refusal**, never a stretch to the nearest bar.
 *
 * ## Pure, for `market-breadth.ts`' reason rather than for testing
 *
 * The window's bars and the instant arrive as **arguments**. No clock, no
 * socket, no repository handle — which is invariant 4 made structural here
 * rather than instructed: a function that reads nothing cannot read something
 * timestamped after a replay clock. `marketBreadth` and `buildMarketOverview`
 * are the shape copied. **`relativePerformance` is not** — it is a frontend
 * function over a wire frame and takes no `asOf` at all.
 *
 * ## The refusal is in the SELECTION, not in the arithmetic
 *
 * There is **no exported function taking `(earlier, later)`**. A pair is
 * something a caller can get wrong — hand it the newest bar and the oldest one
 * and it will return a correctly-computed 47-minute figure — so *pick the
 * endpoints* and *subtract them* are deliberately not two separable steps
 * anybody can re-assemble. {@link fiveMinuteReturn} takes a **window** and
 * answers either a figure or a refusal, and the only percentage this module
 * computes is computed from a pair it picked itself.
 *
 * ## It says nothing about staleness, and that is AC 6 rather than an omission
 *
 * A pair exactly five minutes apart is a five-minute return whether it ended a
 * minute ago or 187 minutes ago, and **no threshold is applied to the later
 * endpoint**. The 187-minute maximum is what any threshold would have had to
 * spare, the connection has one home (the status bar), and a quiet security is
 * **an age rather than a verdict**. So both endpoints' instants travel with the
 * figure — AC 4's _instant of the oldest endpoint_ — and the surface states the
 * age rather than this module judging it.
 *
 * That is also why there is no `asOf − span` freshness cutoff in this file.
 * There is exactly one minute-scaled subtraction here and it is a **span
 * between two named endpoints of one security**; the eligibility cutoff over a
 * population — _is this security's newest observation still about now_ — is
 * ADR 0040's, lives in `market-breadth.ts`, and has exactly one home.
 * `one-home-for-the-observation-window` holds both, separately, by file.
 *
 * ## The tape
 *
 * Every bar in the trailing window arrives from one stream whose feed is
 * `iex`, so this figure is `iex`-over-`iex` **by construction** — a property of
 * there being no store fill rather than of a check (`trailing-window.ts`'s own
 * note). {@link ReturnEndpoint.source} carries it so invariant 6's surface can
 * say `IEX` rather than inherit the stored bars' `All US exchanges`; the
 * saying is Task 5.2.3's.
 */

const MS_PER_MINUTE = 60_000;

/**
 * **The span, in minutes** — five.
 *
 * ## Derived from the window's span rather than spelled a second time
 *
 * `TRAILING_WINDOW_SPAN_MS` is the one home for *the span a reader is entitled
 * to ask about*, and it is the value ε and the depth of 7 were chosen against.
 * Two independent `5`s is the shape where the window retains four minutes
 * while the return asks for five and the figure refuses for ever with nothing
 * on screen wrong.
 *
 * ## So why in minutes at all, when the window states it in milliseconds
 *
 * Because the one subtraction in this file has to be **visible**. A span
 * hard-coded or pre-multiplied into milliseconds —
 * `startsAt.getTime() - SPAN_MS` — is outside
 * `one-home-for-the-observation-window`'s pattern entirely, which that check's
 * own comment names as the invisible residue it exists to prevent: *a window
 * hard-coded in milliseconds with no minute factor is invisible to it.*
 * Writing the span minute-scaled puts this module's cutoff in front of the
 * check rather than past it, and the check's third conjunct is what permits
 * exactly one of them here.
 *
 * It is also the denominator the surface draws — *observed k of 5* — so Task
 * 5.2.3 reads this rather than typing a `5` into a sentence.
 */
/**
 * **This is a MEASUREMENT SPAN, and the product spells `5` twice** —
 * [ADR 0043](../../../docs/adr/0043-two-five-minutes-a-freshness-cutoff-and-a-measurement-span.md).
 * The other one is `BREADTH_WINDOW_MINUTES`, an **eligibility cutoff over a
 * population**, and reusing it here would couple a `PRODUCT_SPEC.md` §11
 * requirement to a measurement of our own feed's coverage — silently, the day
 * somebody re-measures that curve. `pnpm break a-span-spelled-as-the-observation-window`
 * performs exactly that edit.
 */
export const RETURN_SPAN_MINUTES = TRAILING_WINDOW_SPAN_MS / MS_PER_MINUTE;

/** One end of the measurement, with the instant it was observed at. */
export interface ReturnEndpoint {
  /** The bar's own `startsAt` — the **start** of the minute it describes. */
  readonly startsAt: Date;
  /** That minute's closing price. */
  readonly close: number;
  /** Which tape this number came from, per observation. */
  readonly source: BarSource;
}

/**
 * A measured return.
 *
 * Both endpoints travel with it because **there is no way to read this figure
 * without receiving the instants it was measured between** — `startsAt` on
 * each, exactly {@link RETURN_SPAN_MINUTES} apart by construction.
 */
export interface MeasuredReturn {
  readonly measured: true;
  /** The signed move between the two endpoints' closes, as a percentage. */
  readonly percent: number;
  /** The **older** endpoint. AC 4's instant. */
  readonly from: ReturnEndpoint;
  /** The **newer** endpoint. */
  readonly to: ReturnEndpoint;
  /**
   * **How many of the span's minutes were actually observed**, 1 to
   * {@link RETURN_SPAN_MINUTES}, counted in the **same pass that picked the
   * endpoints** — see {@link fiveMinuteReturn}.
   *
   * The minutes counted are the ones the move covers: the bars at
   * `from.startsAt + 1m … to.startsAt`. The older endpoint anchors the figure
   * rather than being inside it, so the newer endpoint is always one of them
   * and `observed` is never `0` on a measured figure. *Nothing observed* is a
   * refusal, not a figure with a zero count.
   */
  readonly observed: number;
  /** The denominator, so the surface states the span this figure was taken with. */
  readonly spanMinutes: number;
}

/**
 * Why there is no figure. **Three refusals, none of them an error** — Story
 * 3.5's property 4 and ADR 0029: *not enough evidence* is a first-class
 * outcome, and a refusal has **no digits at all**.
 *
 * - `nothing-observed` — the window holds no bar at or before `asOf`. A cold
 *   process's ordinary state for its first five minutes, by Gate 1 decision 3.
 * - `no-earlier-endpoint` — there is a newer endpoint and **no bar whose own
 *   `startsAt` is exactly the span before it**. This is `ERIE`, and it is the
 *   one this story exists for.
 * - `no-basis` — the older endpoint's close is zero or non-finite, so the
 *   division has no meaning. `changePercent`'s own branch, for its own reason:
 *   the quotient is `Infinity`, which formats and renders as the most alarming
 *   figure on the page rather than a blank one.
 */
export type ReturnRefusal =
  "nothing-observed" | "no-earlier-endpoint" | "no-basis";

/**
 * **What the window DID hold, where it held something** (Task 5.2.4).
 *
 * A refusal carrying nothing but a word draws the same picture whether the
 * window held one bar or none — and *we have one bar and no pair* and *we have
 * heard nothing* are exactly the pair Story 5.1 shipped collapsed into one
 * sentence for a day, one region down. So a refusal that **found a newer
 * endpoint** carries that endpoint and the count of minutes it saw, and the
 * surface prints them in the grammar it already uses for a measured figure.
 *
 * It is produced in the **same pass** that picked the endpoints, for
 * {@link fiveMinuteReturn}'s own reason: a count taken by a second traversal
 * is a second measurement that can disagree with the first.
 */
export interface ObservedSpan {
  /** The newest bar at or before `asOf` — the one instant there is. */
  readonly newest: ReturnEndpoint;
  /** How many of the span's minutes were observed, `1` to `spanMinutes`. */
  readonly observed: number;
  /** The denominator the surface states. */
  readonly spanMinutes: number;
}

/** No figure, which refusal it was, and what the window did hold. */
export interface RefusedReturn {
  readonly measured: false;
  readonly refusal: ReturnRefusal;
  /**
   * What was observed, or `undefined` where nothing was.
   *
   * **A required member holding `undefined` rather than an optional one**, so
   * a refusal built anywhere in this module has to say which of the two it is
   * — `exactOptionalPropertyTypes` makes *absent* and *present as undefined*
   * different types, and the required form is the one a new refusal cannot
   * forget.
   */
  readonly seen: ObservedSpan | undefined;
}

/**
 * Either a figure or a refusal — a discriminated union rather than
 * `number | null`, because *we have no earlier endpoint* and *this security
 * has not been heard from* are different sentences on screen and a `null`
 * cannot tell a surface which to draw.
 */
export type FiveMinuteReturn = MeasuredReturn | RefusedReturn;

export interface FiveMinuteReturnOptions {
  /**
   * The instant the figure is **as of** — the replay clock's reading under a
   * replay, `marketBreadth`'s `asOf` exactly.
   *
   * It selects the newer endpoint (the newest bar at or before it) and does
   * nothing else. A reader wanting the last **settled** five minutes passes
   * the newest-but-one bar's instant, because a bar is not final for ~30 s —
   * which is the case ε exists for (`trailing-window.ts`, corrected by Task
   * 5.2.1's amendment).
   */
  readonly asOf: Date;
}

const endpointOf = (observation: LiveObservation): ReturnEndpoint => ({
  startsAt: observation.bar.startsAt,
  close: observation.bar.close,
  source: observation.source,
});

/**
 * **One security's 5-minute return, or the reason there is not one.**
 *
 * ## One pass, which is what makes `observed` the figure's own count
 *
 * The walk runs **once**, newest-first, and it produces the newer endpoint,
 * the older endpoint and `observed` together. A numerator and a denominator
 * produced by two passes is Story 4.4's own defect arriving one surface over —
 * `market-breadth.ts`' note on it is the long version — and here the two
 * passes would not even be over the same set: `read()` returns the span
 * **plus ε**, so a count over the array's extent would include bars outside
 * the five minutes the figure is about. There is no second measurement to
 * disagree with the first because there is no second measurement.
 *
 * ## The array's extent is not the window, and a full array is not a recent one
 *
 * Both are properties of the shipped window (Task 5.2.1's amendment to this
 * task) and neither is assumed away. Eviction is relative to that security's
 * **own** newest bar, so a security silent for 187 minutes hands over seven
 * bars from 187 minutes ago — correct for memory, and exactly why `held.length`
 * is read nowhere in this function. What bounds the count is the **pair's own
 * span**, `(from.startsAt, to.startsAt]`, which is tighter than `asOf − span`
 * and is the interval the figure was actually measured over; bounding on
 * `asOf` instead would count zero minutes of a perfectly good pair whenever
 * the newer endpoint is older than `asOf`.
 *
 * @param window One security's bars, **oldest first** — `TrailingWindow.read`'s
 *   answer. A copy; this function mutates nothing and reads no handle.
 */
export function fiveMinuteReturn(
  window: readonly LiveObservation[],
  options: FiveMinuteReturnOptions,
): FiveMinuteReturn {
  const asOf = options.asOf.getTime();

  let newer: LiveObservation | undefined;
  let older: LiveObservation | undefined;
  let olderAt = 0;
  let observed = 0;

  for (let index = window.length - 1; index >= 0; index -= 1) {
    const candidate = window[index];
    if (candidate === undefined) continue;

    const at = candidate.bar.startsAt.getTime();

    if (newer === undefined) {
      // A bar after `asOf` is outside the question being asked — a reader
      // computing the last settled five minutes has deliberately passed an
      // earlier instant than the newest bar's.
      if (at > asOf) continue;

      newer = candidate;
      // **The one span cutoff in this module**, and it is anchored on the
      // newer endpoint rather than on `asOf`: the figure is a span between two
      // bars, so the instant it needs is an exact bar instant. Anchoring on
      // `asOf` — a wall clock, rarely on a minute boundary — would make the
      // target instant one no bar can ever carry, and the figure would refuse
      // for every security for ever.
      //
      // **`.getTime()` is re-read here rather than reusing `at`, and that is
      // the check's pattern rather than a redundancy.**
      // `one-home-for-the-observation-window` matches
      // `getTime() - <minutes> * MS_PER_MINUTE`, so `at - …` — with `at`
      // already holding the milliseconds — is a span the check cannot see.
      // The first draft of this module wrote exactly that and the run
      // reported **0 measurement-span cutoffs**, which is the third blind
      // spot in that check's own list and is now written into it. The
      // subtraction is spelled in front of the check on purpose.
      olderAt =
        candidate.bar.startsAt.getTime() - RETURN_SPAN_MINUTES * MS_PER_MINUTE;
      // The newer endpoint is the last of the span's minutes.
      observed = 1;
      continue;
    }

    // **Exactly the span apart, never the nearest bar.** `===` on the
    // instants, so a 47-minute pair is not a near miss to be tolerated — it
    // is a bar that is not the endpoint, and the walk goes past it.
    if (at === olderAt) {
      older = candidate;
      break;
    }

    // Oldest-first, so once the walk is below the target the endpoint is
    // absent. Nothing older can be it, and nothing older is inside the span.
    if (at < olderAt) break;

    // A minute inside the span, counted as it is walked past rather than by a
    // second traversal.
    observed += 1;
  }

  // **Nothing was observed, so there is nothing to carry** — and that is the
  // structural half of *these two refusals must not read alike*: this one has
  // no span because there is none, rather than because a renderer chose to
  // draw less of it (Task 5.2.4).
  if (newer === undefined) {
    return { measured: false, refusal: "nothing-observed", seen: undefined };
  }

  // The one instant there is, and the count from the walk above rather than
  // from a second pass over the same array.
  const seen: ObservedSpan = {
    newest: endpointOf(newer),
    observed,
    spanMinutes: RETURN_SPAN_MINUTES,
  };

  if (older === undefined) {
    return { measured: false, refusal: "no-earlier-endpoint", seen };
  }

  const basis = older.bar.close;
  if (!Number.isFinite(basis) || basis === 0) {
    return { measured: false, refusal: "no-basis", seen };
  }

  return {
    measured: true,
    // Not `changePercent`, deliberately: that function's subject is a
    // `SecurityLastClose` — a close and the **stored previous session's**
    // close — and forging one here would need a `session` field belonging to
    // neither endpoint. The arithmetic is the same two operands and a
    // division; the type would be a lie.
    percent: ((newer.bar.close - basis) / basis) * 100,
    from: endpointOf(older),
    to: endpointOf(newer),
    observed,
    spanMinutes: RETURN_SPAN_MINUTES,
  };
}
