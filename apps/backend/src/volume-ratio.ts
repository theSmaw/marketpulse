import { marketSessionStateAt } from "@marketpulse/shared";

import { RETURN_SPAN_MINUTES } from "./five-minute-return.js";
import {
  VOLUME_BASELINE_FEED,
  comparableVolumeBaseline,
  volumeBucketOf,
  type VolumeBaselineOutcome,
} from "./volume-baseline.js";

import type { MarketFeed, VolumeRefusal } from "@marketpulse/shared";
import type { FiveMinuteReturn } from "./five-minute-return.js";
import type { StoredVolumeBaseline } from "./volume-baseline-store.js";

/**
 * **The volume factor's numerator, and the one division that produces the
 * multiple** (Task 5.5.4) — the join of a live trailing window and a stored
 * 60-session baseline, which is the one thing neither producer can do for
 * itself.
 *
 * ## Nothing here reads a clock, a handle, a socket or a protocol
 *
 * `return-percentile.ts`' property for its reason: Epic 13's replay calls this
 * with a generation addressed as-of a past session and gets the same answer the
 * live path gets, because the only inputs are a figure and a row. The wire
 * shape is `volume-ratio-wire.ts`' and the words are the browser's.
 *
 * ## THE NUMERATOR CONTRACT, which Task 5.5.3 left to this story
 *
 * **A five-minute sum against a per-minute median is a RATE.** The numerator is
 * the shares printed in the five minutes the return covers, divided by the
 * span; the denominator is the median volume of **one minute** of this time of
 * day. Both sides are shares-per-minute, so the ratio is dimensionless and
 * nothing is scaled anywhere.
 *
 * **The arithmetic is identical to `Σvolume / (5 × median)`; the claim is
 * not**, and the claim is what reaches a screen. `5 × median` is *the typical
 * five-minute volume*, which this product does not hold and cannot derive: the
 * median of a sum is not the sum of medians, and a heavy-tailed minute
 * distribution makes the gap between them large rather than academic. So the
 * figure says *each of the last five minutes traded 4.1× what a typical minute
 * of this time of day trades*, and the denominator is never named as a
 * five-minute quantity.
 *
 * **A partial span is REFUSED rather than scaled**, which is the other half of
 * the contract and the half with two wrong answers rather than one.
 * `bucket-partially-observed` fires at `k < 5`, because:
 *
 * - `Σvolume × 5/k` imputes the minutes IEX did not print **as if they traded
 *   like the ones it did**, which is an estimate wearing a measurement's
 *   clothes; and
 * - `Σvolume / k` — the rate over the observed minutes alone — is the **same
 *   imputation with the arithmetic rearranged**, because it compares the mean
 *   of the minutes we heard against the median of all of them. On a tape whose
 *   median per-symbol minute presence is 65.1%, the minutes IEX does not print
 *   are systematically its quiet ones, so that figure is biased **upward** by
 *   an amount nobody can see.
 * - `Σvolume / 5` with `k < 5` is the third wrong answer and is the `?? 0`
 *   defect: it reads an absent bar as zero shares, which on IEX is a claim
 *   about a stock exchange rather than about our listening (AC 4).
 *
 * Three wrong answers and no right one, so the figure is refused and the
 * surface says `k of 5`. `fiveMinuteReturn` already counts `k` in the same pass
 * that sums the volume, so the two describe the same minutes by construction.
 *
 * ## Which time of day the baseline is read at, and the one approximation here
 *
 * The bucket is the one the **newest** of the five minutes falls in. The five
 * minutes therefore straddle two buckets whenever the newest minute is not the
 * last of its bucket — up to four minutes of the day away from the bucket whose
 * median they are divided by.
 *
 * _Rejected: aligning the numerator to the grid_, which would make the claim
 * exact and draw the figure **one minute in five** at full coverage, because a
 * grid bucket is only complete on its last minute and the trailing window is
 * 6.5 minutes deep — it does not reliably hold the previous bucket at all. A
 * figure that blinks on and off on a five-minute cycle is a worse answer to
 * *how busy is this* than one whose time-of-day grain is the five minutes
 * `PRODUCT_SPEC.md` §11 calls *approximate* in as many words.
 *
 * _Rejected: a denominator summed from each minute's own bucket median_, which
 * is exact and continuous and needs two buckets' precision bounds combined into
 * one — new arithmetic, and a counted `n` the surface could no longer state as
 * a single number.
 *
 * **Where the approximation bites is the open**, where the intraday curve is
 * steepest: a window running 09:33 → 09:37 is divided by 09:35–09:39's median
 * while two of its minutes are opening minutes. The surface states the bucket
 * width so a reader can see the grain; the percentile beside it already carries
 * the opening-bucket clause for the same curve.
 *
 * ## A bucket-independent refusal outranks the numerator's
 *
 * *We have never heard IEX for this security* and *the history crosses a price
 * break* are facts about the whole session that no passing minute will change;
 * *we heard two of these five minutes* resolves itself in a minute. Reporting
 * the transient one first would hide the durable one behind a sentence that
 * keeps changing — and on every machine that exists today the durable one is
 * the answer, because the `iex` tape is empty wherever no provider is
 * configured.
 */

/**
 * A bucket index no grid has, for a minute that is **outside a regular
 * session** or a window that holds no minute at all.
 *
 * `comparableVolumeBaseline`'s own documented behaviour: *a bucket past this
 * generation's grid is the same answer as a bucket with no samples*, which is
 * `too-few-sessions` with a counted `n` of zero. That is the true thing to say
 * about 18:05 — the baseline's grid is regular-session only, so we hold no
 * minutes of that time of day at all — and it is deliberately **not** a seventh
 * refusal word, because *we have no history for this time of day* is what the
 * sixth already says.
 */
const OUTSIDE_THE_GRID = -1;

/**
 * The two refusals that are about the **security's history** rather than about
 * this minute, and therefore outrank the numerator's. See the header.
 *
 * A `Record` over the closed union rather than a `Set` of two strings, so a
 * seventh refusal word is a **compile error here** naming the missing member —
 * the mechanism `VOLUME_REFUSAL_FOR_A_PRICE_REFUSAL` and
 * `MARKET_FEED_DESCRIPTIONS` both use, pointed at a question a new member would
 * otherwise be answered `undefined` for.
 */
const BUCKET_INDEPENDENT: Readonly<Record<VolumeRefusal, boolean>> = {
  "no-same-tape-baseline": true,
  "split-discontinuity": true,
  "too-few-sessions": false,
  "zero-volume-baseline": false,
  "no-bar-in-bucket": false,
  "bucket-partially-observed": false,
};

/** The multiple, with what it was taken against. */
export interface VolumeRate {
  readonly measured: true;
  /** Shares-per-minute observed ÷ shares-per-minute typical. Above `0`. */
  readonly ratio: number;
  /** The bucket's counted `n`. */
  readonly sampleCount: number;
  readonly lookbackSessions: number;
  readonly bucketMinutes: number;
  readonly spanMinutes: number;
  /** The tape **both** halves came from. Invariant 6, Gate 1 decision 1. */
  readonly feed: MarketFeed;
}

/** Why there is no multiple, and the two numbers the sentences need. */
export interface RefusedVolumeRate {
  readonly measured: false;
  readonly refusal: VolumeRefusal;
  readonly sampleCount: number;
  readonly observed: number;
  readonly spanMinutes: number;
}

/** The answer a frame carries: a multiple, or why there is none. */
export type VolumeRateAnswer = VolumeRate | RefusedVolumeRate;

/** The numerator's five minutes, as either arm of a return carries them. */
interface ObservedVolume {
  readonly newest: Date;
  readonly observed: number;
  readonly spanMinutes: number;
  readonly volume: number;
}

/**
 * **The numerator, off whichever arm the return took** — and a refused return
 * is not a refused volume.
 *
 * `no-earlier-endpoint` is a window with no bar exactly five minutes back,
 * which says nothing about the five minutes themselves; `no-basis` is a close
 * of zero, which is a price fact. Both can hold all five minutes of volume. The
 * one arm with no numerator is `nothing-observed`, whose `seen` is `undefined`
 * because there was nothing to see.
 */
function observedVolumeOf(
  figure: FiveMinuteReturn,
): ObservedVolume | undefined {
  if (figure.measured) {
    return {
      newest: figure.to.startsAt,
      observed: figure.observed,
      spanMinutes: figure.spanMinutes,
      volume: figure.volume,
    };
  }

  const { seen } = figure;
  if (seen === undefined) return undefined;

  return {
    newest: seen.newest.startsAt,
    observed: seen.observed,
    spanMinutes: seen.spanMinutes,
    volume: seen.volume,
  };
}

/**
 * **A stored row as the arithmetic needs it** — the one place a nullable
 * `refusal` column's two meanings become the three-armed outcome
 * `comparableVolumeBaseline` narrows.
 *
 * `undefined` is `none` rather than a refusal, which is that function's own
 * distinction and the reason it matters here: the absence of a row is *we have
 * never heard this tape for this security*, and a row saying so would be a
 * claim we hold a baseline.
 */
function outcomeOf(
  stored: StoredVolumeBaseline | undefined,
): VolumeBaselineOutcome {
  if (stored === undefined) return { kind: "none" };

  if (stored.refusal !== null) {
    return {
      kind: "refused",
      bucketCount: stored.bucketCount,
      sampleCount: stored.sampleCount,
      refusal: stored.refusal,
    };
  }

  return {
    kind: "measured",
    bucketCount: stored.bucketCount,
    buckets: stored.buckets,
    sampleCount: stored.sampleCount,
  };
}

/**
 * **Which 5-minute bucket of the day the newest observed minute sits in**, or
 * {@link OUTSIDE_THE_GRID}.
 *
 * `marketSessionStateAt` is the one home for *which session is this instant
 * in*, and it refuses a date outside the checked-in calendar rather than
 * guessing — which is why a holiday, a weekend and an extended-hours minute all
 * arrive here as the same answer: we hold no baseline minutes for that time of
 * day, because the grid is regular-session only.
 */
function bucketAt(newest: Date): number {
  const state = marketSessionStateAt(newest);
  if (state.status === "holiday" || state.status === "weekend") {
    return OUTSIDE_THE_GRID;
  }

  return volumeBucketOf(newest, state.session) ?? OUTSIDE_THE_GRID;
}

/**
 * **How this security's volume compares with a typical minute of this time of
 * day, or why it does not.**
 *
 * @param figure the 5-minute return for the same security and the same instant,
 *   which carries the numerator summed in the walk that produced it.
 * @param stored this security's row in the generation the cache holds, or
 *   `undefined` where there is none — which is every laptop and every gated
 *   run, for ever.
 */
export function volumeRateOf(
  figure: FiveMinuteReturn,
  stored: StoredVolumeBaseline | undefined,
): VolumeRateAnswer {
  const span = observedVolumeOf(figure);
  const held = outcomeOf(stored);

  // One narrowing, asked once. A bucket we cannot place is the same question
  // with the same answer, which is what `OUTSIDE_THE_GRID` is for.
  const comparable = comparableVolumeBaseline(
    held,
    span === undefined ? OUTSIDE_THE_GRID : bucketAt(span.newest),
  );

  const sampleCount = comparable.sampleCount;
  const observed = span?.observed ?? 0;
  const spanMinutes = span?.spanMinutes ?? RETURN_SPAN_MINUTES;

  const refused = (refusal: VolumeRefusal): RefusedVolumeRate => ({
    measured: false,
    refusal,
    sampleCount,
    observed,
    spanMinutes,
  });

  // **The durable refusals first.** See the header: one resolves itself in a
  // minute and the other needs somebody to look at the live writer.
  if (!comparable.comparable && BUCKET_INDEPENDENT[comparable.refusal]) {
    return refused(comparable.refusal);
  }

  // **Absent, never zero.** The window holds no bar in these five minutes at
  // all; on IEX that is ordinary rather than a claim that nothing traded.
  if (span === undefined || span.observed === 0) {
    return refused("no-bar-in-bucket");
  }

  // **Refused rather than scaled.** The header has the three wrong answers.
  if (span.observed < span.spanMinutes) {
    return refused("bucket-partially-observed");
  }

  if (!comparable.comparable) return refused(comparable.refusal);

  /* c8 ignore next 5 -- a comparable bucket came off a stored row, so there
     is no path here with no row. It is a `return` rather than a `!` because
     **no `?? 0`**: a fallback lookback or bucket width would be a fabricated
     number on the one line of this module that reaches a reader. */
  if (stored === undefined) return refused("no-same-tape-baseline");

  // **The observed rate, in shares per minute** — named rather than inlined,
  // because the whole contract is that this and the denominator are the same
  // kind of quantity. `span.observed === span.spanMinutes` here, checked two
  // branches up, so dividing by the span is not an imputation.
  const rate = span.volume / span.spanMinutes;

  return {
    measured: true,
    // **The one division, and both operands are shares per minute.** The
    // denominator is the bucket's median of a **single minute** — never that
    // median multiplied by anything.
    ratio: rate / comparable.median,
    sampleCount: comparable.sampleCount,
    lookbackSessions: stored.lookbackSessions,
    bucketMinutes: stored.bucketMinutes,
    spanMinutes: span.spanMinutes,
    // One tape for both halves, by construction rather than by a check: the
    // numerator is the live IEX socket's and the baseline's query spells
    // `feed = 'iex'` in its own `where`.
    feed: VOLUME_BASELINE_FEED,
  };
}
