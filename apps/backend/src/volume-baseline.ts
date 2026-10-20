import type {
  MarketSession,
  ReturnBaselineRefusal,
  VolumeRefusal,
} from "@marketpulse/shared";

import { breakpointsOf, SAMPLE_SPAN_MINUTES } from "./return-baseline.js";

/**
 * **The volume baseline's arithmetic — a time-of-day grid, a median per
 * bucket, a precision bound per bucket and a split verdict it READS rather
 * than re-derives** (Task 5.5.3, Story 5.5's Gate 1 decisions 1 and 4).
 *
 * `return-baseline.ts` is the shape copied and the reason is that module's
 * rather than testing convenience: **nothing here reads a clock, a socket or a
 * handle.** The sessions and the minute volumes arrive as arguments, so a
 * function that reads nothing cannot read something timestamped after a replay
 * clock — invariant 4 made structural instead of instructed.
 * `volume-baseline-store.ts` is the only module that knows there is a
 * database.
 *
 * ## The quantity, stated once so nothing downstream has to guess
 *
 * For one security, one tape and one 60-session window: **the median volume of
 * a single minute, per 5-minute bucket of the session, pooled across every
 * session in the window.** A bucket is a *time of day* — bucket 3 is 09:45–09:49
 * on every session at once — which is what makes `n` run into the thousands
 * rather than sitting at the ~18 session sums Gate 1 decision 4 rejected
 * (`4.1×` would really have meant `2.9–5.3×`).
 *
 * **The sample is one MINUTE and the bucket is five**, and the two are not the
 * same number by accident: a numerator that is a five-minute window's volume
 * has to be read against this median as a **per-minute rate**, never by
 * multiplying this median by five. Which is also why
 * `bucket-partially-observed` exists in the vocabulary below and belongs to the
 * story that draws the figure: scaling a bucket holding 2 of 5 minutes by `5/2`
 * is an imputation, not a measurement.
 *
 * ## Four properties, each of them somebody's defect
 *
 * **1. The tape is `iex` and it is written by name.** Gate 1 decision 1:
 * same-tape or refusal, and the numerator is the live IEX socket's. The
 * consequence the decision accepted explicitly is that the `iex` tape holds
 * **1.9–24.9%** of the consolidated tape's depth and begins on 2026-09-23, so
 * **the refusal is the expected answer for essentially every security for
 * weeks**. {@link VOLUME_BASELINE_FEED} is the constant and
 * `volume-baseline-store.ts` spells it in the query's own `where` —
 * `SERVED_TAPE_RANK` is a *preference* for serving the best history available
 * and this needs a *restriction*.
 *
 * **2. `n` is COUNTED per bucket, never computed from a constant.** `60 × 5`
 * is wrong three ways over: an early close has 42 buckets rather than 78, the
 * `iex` tape's median per-symbol minute presence is 65.1%, and the window
 * reaches back past the live writer's first session. Every sample here is a
 * minute that was found.
 *
 * **3. The precision bound is DERIVED per bucket and applied when the row is
 * READ.** See {@link TARGET_RELATIVE_STANDARD_ERROR} and
 * {@link medianRelativeStandardError}. The pass stores the achieved relative
 * standard error beside each bucket's median and `n`; which error is too large
 * to print is a decision about the **figure**, so moving the target is a deploy
 * rather than a recompute of 516 securities — `BASELINE_MINIMUM_SAMPLE`'s own
 * recorded reasoning, applied to a different kind of number.
 *
 * **4. The split verdict is READ from the price pass, never re-derived.** Gate
 * 1's false premise 9: the price guard is a ratio over two **closes** at a
 * session boundary, and volume legitimately moves 10× day to day, so there is
 * no analogous overnight ratio to threshold. A split breaks volume **harder**
 * than price — the share count multiplies by exactly the factor the price
 * divides by, so an unadjusted 10:1 split is a **+900%** volume figure — which
 * is why inheriting the verdict is not optional. {@link volumeBaselineOf} takes
 * it as an argument and {@link VOLUME_REFUSAL_FOR_A_PRICE_REFUSAL} is the
 * mapping, as a `Record` over the closed union, so a second stored price
 * refusal is a compile error here rather than a verdict that silently stops
 * being inherited.
 */

/**
 * **The tape this baseline is built from: `iex`, by name** (Gate 1 decision 1).
 *
 * It is deliberately **not** `BASELINE_FEED` and deliberately not
 * `SERVED_TAPE_RANK`'s first entry. The return baseline's tape is the
 * consolidated one because its numerator is a stored close; this one's
 * numerator is the live IEX socket's own volume, and an IEX numerator over a
 * SIP baseline is **systematically far below 1 regardless of how unusual the
 * volume is** — Task 5.5.2 measured the bias and the share as two different
 * numbers for exactly this reason.
 *
 * **Reversal trigger, Gate 1's own:** the first session on which the `iex`
 * baseline's counted `n` meets the floor for FEWER securities than the
 * previous session — depth has stopped accruing, so the live writer is holing
 * and this decision's premise has failed.
 */
export const VOLUME_BASELINE_FEED = "iex" as const;

/**
 * `√(π/2)` ≈ 1.2533 — the asymptotic ratio of a **median's** standard error to
 * a mean's, at the same `n` and spread.
 *
 * **Computed rather than typed as `1.253`**, which is the figure Story 5.5's
 * Gate 1 and this task's own amendment both quote: a literal is a second,
 * lower-precision home for a constant of mathematics. It is exact for a normal
 * sample and an **approximation** for minute volume, which is heavy-tailed — so
 * the bound it implies is an estimate of the right order rather than an exact
 * interval, and the measured CV beside it is what makes that estimate
 * checkable.
 *
 * **Moved here from `volume-share.ts` by Task 5.5.3**, with
 * {@link TARGET_RELATIVE_STANDARD_ERROR} and
 * {@link coefficientOfVariation}: the floor is the **baseline's** policy and
 * the diagnostic that measured the dispersion is a reader of it, so the
 * dependency runs this way round and the arithmetic has one home rather than
 * two copies of `(MEDIAN_SE_FACTOR * cv) / Math.sqrt(n)`.
 */
export const MEDIAN_SE_FACTOR = Math.sqrt(Math.PI / 2);

/**
 * The precision a printed multiple has to support — **the one chosen input on
 * this surface**, stated so it can be argued with.
 *
 * **The owner's decision, 2026-10-20: one decimal, and refuse per bucket where
 * the measured dispersion cannot support it.** At 5%, a figure printed
 * `4.1× typical` is `4.1 ± 0.2`, so the first decimal place carries
 * information rather than noise. Every other number in this module is
 * measured; this one is a product judgement about how precisely the figure is
 * drawn.
 *
 * ## It is NOT `BASELINE_MINIMUM_SAMPLE`'s arithmetic and must not reuse it
 *
 * That constant is `50/√n ≤ 1` solved for `n` — the precision of an **integer
 * percentile ordinal**, where the last digit drawn is one percentile point. A
 * bucket median's `n` is a different quantity entirely, so the floor here is a
 * **function** rather than a constant: `n ≥ (√(π/2)·CV / target)²` per bucket,
 * with `CV` **measured**. See {@link samplesForRelativeStandardError}.
 *
 * ## One consequence for the floor's own honesty
 *
 * The bound is computed from a `CV` measured over **the same window** whose `n`
 * it then judges, so on a thin window both the estimate and its own precision
 * bound are noisy. **The bound is not exact** and this module does not pretend
 * it is; what it is, is a statement that is checkable from the stored row,
 * because the achieved error and the counted `n` are both written down.
 *
 * ## What it refuses, measured on the better tape
 *
 * Task 5.5.2 measured the full-depth `sip` tape at 60 sessions: only `NVDA`'s
 * median bucket meets 5% (**4.75%**), with `AAPL` at 6.50%, `SPY` at 6.69%,
 * `XLK` at 8.19%, `CCI` at 9.51% and `ERIE` at **16.22%** — needing 98, 259,
 * 311, 533, 727 and 397 sessions respectively. The `iex` tape has 1.9–24.9% of
 * that depth and 18 sessions of history, so **expect the refusal to be the
 * answer for essentially every security for weeks.** That is Gate 1 decision
 * 1's accepted outcome, not a bug.
 */
export const TARGET_RELATIVE_STANDARD_ERROR = 0.05;

/**
 * **Why there is no volume multiple — the complete vocabulary, six members**
 * (Task 5.5.3).
 *
 * A refusal is a first-class outcome rather than an error (invariant 5, ADR
 * 0029), and the list is closed so that the story drawing the figure cannot
 * collapse two of these into one sentence without a compile error.
 *
 * Which producer owns each, because three different ones do:
 *
 * - `split-discontinuity` — **read** from the price pass's verdict for the same
 *   `(security_id, observed_at)`; see property 4 in this module's header.
 *   Stored on the row.
 * - `too-few-sessions` — this bucket's median cannot be printed to one decimal:
 *   its achieved relative standard error exceeds
 *   {@link TARGET_RELATIVE_STANDARD_ERROR}, or it has no measurable spread, or
 *   it holds no sample at all. Applied when the row is read; `n` is stored.
 * - `no-same-tape-baseline` — **we have no IEX history for this security at
 *   all**, which is the absence of a row. Every laptop and every CI run is in
 *   this state permanently, because `live-bar-writer.ts` only runs where a
 *   provider is configured.
 * - `zero-volume-baseline` — the typical minute of this time of day printed no
 *   shares, so the denominator is `0`. **A refusal, never an `Infinity`** —
 *   `directionOf`'s precedent, and the reason it matters is that a non-finite
 *   figure serialises to `null` and then reads as *we could not measure*.
 * - `no-bar-in-bucket` — the **numerator** has no bar in the bucket being
 *   scored. **Absent, never `0`**: on IEX an absent bar is ordinary rather than
 *   a claim that nothing traded, and `Number(null)` is `0`, which is AC 4's
 *   whole distinction. *Owned by the story that draws the figure; this task
 *   declares the word and produces none.*
 * - `bucket-partially-observed` — the numerator's bucket holds `k` of
 *   {@link SAMPLE_SPAN_MINUTES} minutes, so its volume is smaller for a
 *   **coverage** reason and scaling by `5/k` is an imputation. *Also the
 *   drawing story's; declared here so it cannot be folded into the one above.*
 *
 * ## Which pairs would read alike if collapsed, and what each collapse costs
 *
 * Story 5.2 shipped **four** refusal kinds for this exact distinction, and
 * `STORY.md` lists five rather than six. The pairs:
 *
 * - **`too-few-sessions` and `no-same-tape-baseline`** read alike and are the
 *   most expensive collapse: *we have 18 sessions and need 98* is a wait, and
 *   *we have never heard IEX for this security* is a gap in our listening. One
 *   resolves itself on a date; the other needs somebody to look at the writer.
 *   `PERCENTILE_REFUSALS` deliberately went the other way with
 *   `too-few-samples`, and it could because `0 of 2,500 returns` is a true
 *   sentence about both — here the tape makes them different facts.
 * - **`no-bar-in-bucket` and `bucket-partially-observed`** read alike and
 *   collapsing them is the `?? 0` defect wearing a coverage costume: *IEX
 *   printed nothing in these five minutes* and *IEX printed in two of them* are
 *   a venue fact and a reach fact, and only the second tempts a re-implementer
 *   into multiplying by `5/2`.
 * - **`zero-volume-baseline` and `too-few-sessions`** read alike on a thin
 *   window, because a median of `0` is what a mostly-empty bucket produces —
 *   which is why the precision bound is asked **first** and the zero only
 *   reported for a bucket deep enough to be believed.
 * - **`split-discontinuity` and `no-same-tape-baseline`** read alike to a
 *   reader and differ for the operator: the first is a security whose history
 *   crosses an unadjusted price break and will stay refused for 60 sessions;
 *   the second is a security we have no rows for.
 *
 * **Amended 2026-10-20 by Task 5.5.4: the list itself is now
 * `VOLUME_REFUSALS` in `packages/shared/src/volume-baseline.ts`**, which is
 * where this module's own note said it would go the day the **wire** carried
 * it. Everything above is unchanged and is the argument for the six members;
 * what moved is the array, because a vocabulary a producer picks from and a
 * browser prints a sentence for cannot have two homes. There is deliberately
 * **no alias here** — a second name for one list is the duplication this move
 * was made to avoid — so callers read `VolumeRefusal` by that name.
 */

/**
 * The subset a **stored row** can carry, backed by
 * `volume_baselines_refusal_known` in `0015_volume_baselines.sql`.
 *
 * One member, and the split is the only one: every other refusal above is
 * either decided when the row is read (so a generation computed before the
 * bound existed is refused without being recomputed) or produced by a numerator
 * the pass never sees. A member added here is a migration —
 * `RETURN_BASELINE_REFUSALS`' own arrangement.
 */
export const VOLUME_BASELINE_STORED_REFUSALS = ["split-discontinuity"] as const;

/** One of {@link VOLUME_BASELINE_STORED_REFUSALS}. */
export type VolumeBaselineStoredRefusal =
  (typeof VOLUME_BASELINE_STORED_REFUSALS)[number];

/**
 * Every stored refusal is a refusal the reader can be told. **A type-level
 * assertion rather than a test**, which is `PercentileRefusalIsASuperset`'s
 * mechanism: widening the stored vocabulary without widening the read one fails
 * `tsc -b`.
 */
export type VolumeStoredRefusalIsAMember =
  VolumeBaselineStoredRefusal extends VolumeRefusal ? true : never;

/** Satisfied only while the assertion above holds. */
export const VOLUME_STORED_REFUSALS_ARE_READABLE: VolumeStoredRefusalIsAMember = true;

/**
 * **The price pass's verdict, mapped to this vocabulary** — property 4.
 *
 * A `Record` over the closed `ReturnBaselineRefusal` union, so a second stored
 * price refusal is a compile error here rather than a verdict the volume
 * baseline silently stops inheriting. The split is the one that transfers:
 * it is a fact about the **security's corporate actions** inside the window,
 * not about either tape's prices.
 */
export const VOLUME_REFUSAL_FOR_A_PRICE_REFUSAL: Record<
  ReturnBaselineRefusal,
  VolumeBaselineStoredRefusal
> = {
  "split-discontinuity": "split-discontinuity",
};

/** 60,000. A module-local, which is `return-baseline.ts`' own idiom. */
const MS_PER_MINUTE = 60_000;

/**
 * **Which 5-minute bucket of its session a minute sits in, or `undefined` for a
 * minute outside one.**
 *
 * **A division and never a cutoff**, which is why
 * `one-home-for-the-observation-window` is correctly silent about it: the
 * bucket is `minuteOfSession` divided by the grid's stride, and there is no
 * minute-scaled quantity subtracted from an instant anywhere in this module.
 * `sessionAnchors` is the same shape and the same silence.
 *
 * **The stride is `SAMPLE_SPAN_MINUTES`, the anchor grid's own** (Gate 1
 * decision 4: *one span serves both*), so the buckets a volume median is taken
 * over are the same five minutes the return baseline's grid steps by. It is
 * **not** a new quantity and owes no new conjunct — a second stride would be a
 * second answer to *what is a time of day here*, and this is the division both
 * this module and `volume-share.ts`' dispersion block go through.
 *
 * `minuteBars` is derived from the session's own bounds, so an early close has
 * 210 of them rather than 390 and this cannot disagree with the close instant
 * the way a hard-coded pair would.
 */
export function volumeBucketOf(
  startsAt: Date,
  session: MarketSession,
): number | undefined {
  const minuteOfSession = Math.floor(
    (startsAt.getTime() - session.open.getTime()) / MS_PER_MINUTE,
  );

  if (minuteOfSession < 0 || minuteOfSession >= session.minuteBars) {
    return undefined;
  }

  return Math.floor(minuteOfSession / SAMPLE_SPAN_MINUTES);
}

/**
 * How many buckets the window's grid has — the **maximum** over its sessions.
 *
 * A regular session yields `ceil(390 / 5) = 78` and a 13:00 early close yields
 * `42`, so a window holding both needs 78 slots and the early close simply
 * contributes no samples to the last 36. Taking the maximum rather than the
 * first session's count is what stops a window beginning on a half day from
 * silently discarding the afternoon of every session after it.
 */
export function volumeBucketCount(sessions: readonly MarketSession[]): number {
  let most = 0;
  for (const session of sessions) {
    most = Math.max(most, Math.ceil(session.minuteBars / SAMPLE_SPAN_MINUTES));
  }
  return most;
}

/**
 * `sd / mean` over a bucket's samples, or `undefined`.
 *
 * **The sample standard deviation (`n − 1`)**, because these are samples of a
 * bucket's volume rather than its population — and `undefined` rather than `0`
 * for a single sample, a zero mean or a flat bucket, so a precision bound is
 * never derived from a bucket that has no spread to measure. A CV of zero is a
 * licence to print any figure from any sample.
 *
 * **Moved here from `volume-share.ts` by Task 5.5.3**; see
 * {@link MEDIAN_SE_FACTOR} for the direction of the dependency.
 */
export function coefficientOfVariation(
  samples: readonly number[],
): number | undefined {
  if (samples.length < 2) return undefined;

  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  if (mean === 0) return undefined;

  const variance =
    samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (samples.length - 1);

  const cv = Math.sqrt(variance) / mean;
  return cv > 0 && Number.isFinite(cv) ? cv : undefined;
}

/**
 * The achieved relative standard error of a median: `√(π/2)·CV/√n`.
 *
 * `undefined` when there is no CV to compute it from or no samples, which is a
 * bucket whose precision is **unknown** rather than one whose precision is
 * fine — the two have to stay apart, because `0` here would admit every flat
 * bucket in the universe.
 */
export function medianRelativeStandardError(
  cv: number | undefined,
  samples: number,
): number | undefined {
  if (cv === undefined || samples <= 0) return undefined;
  const error = (MEDIAN_SE_FACTOR * cv) / Math.sqrt(samples);
  return Number.isFinite(error) ? error : undefined;
}

/**
 * The samples one bucket needs for a median whose relative standard error
 * meets `target`, at a measured `cv` — `n ≥ (√(π/2)·CV / target)²`.
 *
 * {@link medianRelativeStandardError} rearranged, in one place, so the bound
 * and the achieved figure cannot drift apart. The task's amendment states it
 * as a **function** rather than a constant precisely because `CV` is measured.
 */
export function samplesForRelativeStandardError(
  cv: number | undefined,
  target: number,
): number | undefined {
  if (cv === undefined || target <= 0) return undefined;
  return Math.ceil(((MEDIAN_SE_FACTOR * cv) / target) ** 2);
}

/** What one bucket of the grid holds, answer or not. */
export interface VolumeBucketBaseline {
  /**
   * The median volume of a single minute of this time of day, or `null` for a
   * bucket holding **no sample at all** — which is a different fact from a
   * bucket holding too few, and {@link samples} is what tells them apart.
   */
  readonly median: number | null;
  /** `n`, **counted**: the minutes of this bucket found across the window. */
  readonly samples: number;
  /**
   * The achieved relative standard error of {@link median}, or `null` for a
   * bucket with no measurable spread. **Stored rather than the CV**, because
   * this is the quantity the bound is read against, and `null` means *unknown*
   * rather than *fine*.
   */
  readonly relativeStandardError: number | null;
}

/** What the pass learned about one security's volume, on one tape. */
export type VolumeBaselineOutcome =
  | {
      /** Samples found; a median per bucket, with its own `n` and error. */
      readonly kind: "measured";
      readonly bucketCount: number;
      readonly buckets: readonly VolumeBucketBaseline[];
      /** `n` over the whole window, summed across buckets. */
      readonly sampleCount: number;
    }
  | {
      /** A row is written, with no buckets and the inherited reason. */
      readonly kind: "refused";
      readonly bucketCount: number;
      readonly sampleCount: number;
      readonly refusal: VolumeBaselineStoredRefusal;
    }
  | {
      /**
       * **Nothing at all on this tape — and no row is written.**
       *
       * *The pass has not reached this security* and *the pass reached it and
       * will not answer* are different facts, and only the second is safe to
       * stop retrying. A security with no stored `iex` bars in the window is
       * the first, which on CI's store and on every laptop is **every**
       * security for ever, and which the reader is told as
       * `no-same-tape-baseline`.
       */
      readonly kind: "none";
    };

export interface VolumeBaselineInput {
  /** The window's sessions, oldest first — `BaselineWindow.sessions`. */
  readonly sessions: readonly MarketSession[];
  /**
   * One security's minute volumes on {@link VOLUME_BASELINE_FEED}, keyed by the
   * bar's own `startsAt` in epoch milliseconds.
   *
   * **A volume genuinely at `0` is a sample and an absent minute is not one.**
   * A bar with no shares in it is a thing the vendor sends and is a
   * measurement; a minute with no bar is IEX having printed nothing, which is
   * ordinary and is not a zero. `volume-baseline-store.ts`' parser keeps the
   * first and drops the second.
   */
  readonly volumes: ReadonlyMap<number, number>;
  /**
   * The price pass's stored refusal for the **same** `(security, window end)`,
   * or `null`. Read, never re-derived; this module's header, property 4.
   */
  readonly priceRefusal: ReturnBaselineRefusal | null;
}

/**
 * **One security's volume baseline, or the reason there is not one.**
 *
 * ## `none` outranks the inherited refusal here, which is the OPPOSITE of
 * ## `returnBaselineOf`
 *
 * That function returns `refused` even with zero samples, because the split is
 * a fact about the same tape it was sampling. Here the verdict arrives from the
 * **consolidated** tape's closes while the samples are IEX's, so a security
 * with no `iex` rows at all would otherwise get a row claiming *we hold a
 * volume baseline for you and it crosses a price break* — when the true and
 * more informative answer is that we have never heard IEX for it. The absence
 * of a row says that; a refusal row would not.
 */
export function volumeBaselineOf(
  input: VolumeBaselineInput,
): VolumeBaselineOutcome {
  const { sessions, volumes, priceRefusal } = input;

  const bucketCount = volumeBucketCount(sessions);
  const samplesByBucket: number[][] = Array.from(
    { length: bucketCount },
    () => [],
  );

  let sampleCount = 0;

  for (const session of sessions) {
    // **Driven by the session's own minutes rather than by the map's keys**,
    // so a bar belonging to no session in the window — pre-market,
    // after-hours, a minute the live writer kept and the grid has no slot for
    // — cannot be placed at all. `volume-share.ts` counts those separately;
    // here they simply are not samples.
    for (let offset = 0; offset < session.minuteBars; offset += 1) {
      const at = session.open.getTime() + offset * MS_PER_MINUTE;
      const volume = volumes.get(at);
      if (volume === undefined) continue;

      const bucket = Math.floor(offset / SAMPLE_SPAN_MINUTES);
      const samples = samplesByBucket[bucket];
      /* c8 ignore next -- `bucketCount` is the max over these same sessions. */
      if (samples === undefined) continue;

      samples.push(volume);
      sampleCount += 1;
    }
  }

  if (sampleCount === 0) return { kind: "none" };

  if (priceRefusal !== null) {
    return {
      kind: "refused",
      bucketCount,
      sampleCount,
      refusal: VOLUME_REFUSAL_FOR_A_PRICE_REFUSAL[priceRefusal],
    };
  }

  const buckets = samplesByBucket.map<VolumeBucketBaseline>((samples) => {
    if (samples.length === 0) {
      return { median: null, samples: 0, relativeStandardError: null };
    }

    // **`breakpointsOf` and not a second median.** It is the inclusive,
    // interpolated definition every baseline in this product is computed with,
    // and a second implementation beside it is a second answer to *what is a
    // percentile here*. The 50th of an odd sample is the middle order
    // statistic and of an even one is the midpoint of the two — which is the
    // ordinary definition of a median, reached through the one function.
    const median = breakpointsOf(samples)[50] ?? 0;
    const cv = coefficientOfVariation(samples);

    return {
      median,
      samples: samples.length,
      relativeStandardError:
        medianRelativeStandardError(cv, samples.length) ?? null,
    };
  });

  return { kind: "measured", bucketCount, buckets, sampleCount };
}

/** A bucket the window holds nothing for. See {@link comparableVolumeBaseline}. */
const NO_SAMPLES: VolumeBucketBaseline = {
  median: null,
  samples: 0,
  relativeStandardError: null,
};

/** A bucket median this product is willing to divide by. */
export interface ComparableVolumeBaseline {
  readonly comparable: true;
  /** The typical volume of one minute of this time of day. Strictly above 0. */
  readonly median: number;
  /** `n`, counted — the figure the surface states beside the multiple. */
  readonly sampleCount: number;
  /** The achieved relative standard error, at or below the target. */
  readonly relativeStandardError: number;
}

/** Why there is no bucket median to divide by. */
export interface RefusedVolumeBaseline {
  readonly comparable: false;
  readonly refusal: VolumeRefusal;
  /** How much we had. The first question asked of a refusal. */
  readonly sampleCount: number;
}

/**
 * **The one narrowing from a stored generation to a denominator** — which is
 * `comparableBaseline`'s shape and its reason (Task 5.3.4).
 *
 * The bound is applied **here**, when the row is read, rather than in the pass:
 * so a generation computed before this target existed is refused without being
 * recomputed, and moving the target is a deploy rather than 516 securities'
 * worth of I/O. `0013` §4 and `BASELINE_MINIMUM_SAMPLE` both record that
 * reasoning; this is the same call on a different kind of number.
 *
 * The refused arm has **no `median` member at all**, which is 5.3.4's mechanism
 * rather than a style: a caller holding a refusal cannot read a denominator off
 * it, because the member does not exist on that arm.
 *
 * ## The order of the questions is load-bearing
 *
 * A thin bucket routinely has a median of `0`, so both the precision refusal
 * and the zero refusal hold at once. The precision one is asked **first**
 * because it is the informative one — *we need more history* against *this
 * time of day never trades*, and only the second would send a reader looking
 * for an illiquid security that is not there. `shareRefusalFor` records the
 * same rule for the same reason.
 *
 * @param bucket the grid bucket of the minute being scored; a bucket past this
 *   generation's grid (an afternoon slot on a window of half days) is the same
 *   answer as a bucket with no samples.
 */
export function comparableVolumeBaseline(
  outcome: VolumeBaselineOutcome | undefined,
  bucket: number,
  target = TARGET_RELATIVE_STANDARD_ERROR,
): ComparableVolumeBaseline | RefusedVolumeBaseline {
  if (outcome === undefined || outcome.kind === "none") {
    // The absence of a row, which is every laptop's and every CI run's
    // permanent state. See the vocabulary: this is NOT `too-few-sessions`.
    return {
      comparable: false,
      refusal: "no-same-tape-baseline",
      sampleCount: 0,
    };
  }

  if (outcome.kind === "refused") {
    return {
      comparable: false,
      refusal: outcome.refusal,
      sampleCount: outcome.sampleCount,
    };
  }

  // **A bucket past this generation's grid is the same answer as an empty
  // one**, which is what the docblock above says and what this `??` makes
  // true in one place rather than in two branches that could drift.
  const held = outcome.buckets[bucket] ?? NO_SAMPLES;

  if (held.median === null || held.samples === 0) {
    return {
      comparable: false,
      refusal: "too-few-sessions",
      sampleCount: held.samples,
    };
  }

  if (
    held.relativeStandardError === null ||
    held.relativeStandardError > target
  ) {
    return {
      comparable: false,
      refusal: "too-few-sessions",
      sampleCount: held.samples,
    };
  }

  if (held.median === 0) {
    // AC 5. A zero denominator is a refusal, never an `Infinity`.
    return {
      comparable: false,
      refusal: "zero-volume-baseline",
      sampleCount: held.samples,
    };
  }

  return {
    comparable: true,
    median: held.median,
    sampleCount: held.samples,
    relativeStandardError: held.relativeStandardError,
  };
}
