import {
  BASELINE_BREAKPOINT_COUNT,
  BASELINE_LOOKBACK_SESSIONS,
  SPLIT_DISCONTINUITY_RATIO,
  lastMarketSessions,
  marketDateAt,
  toTimeRange,
  type MarketDate,
  type MarketSession,
  type ReturnBaselineRefusal,
  type TimeRange,
} from "@marketpulse/shared";

/**
 * **The baseline's arithmetic — a grid, a sampler, a guard and 101 order
 * statistics, and not one of them reads a clock, a socket or a handle** (Task
 * 5.3.2).
 *
 * `marketBreadth` and `fiveMinuteReturn` are the shape copied, for their reason
 * rather than for testing: a function that reads nothing cannot read something
 * timestamped after a replay clock, which is invariant 4 made structural here
 * instead of instructed. The sessions and the closes arrive as **arguments**;
 * `return-baseline-store.ts` is the only thing that knows there is a database.
 *
 * ## Four properties, all four of them somebody's defect
 *
 * **1. No sample crosses a session boundary, and that is structural rather than
 * checked.** An overnight gap is the fattest "five-minute return" in any corpus
 * — the market is shut for seventeen and a half hours and the price moves —
 * and a naive `lag(close, 5)` over an ordered read produces exactly that,
 * silently, 59 times in a 60-session window. Here the anchors are generated
 * **per session** by {@link sessionAnchors} and a sample is a pair of
 * **consecutive anchors of one session's own array**, so there is no expression
 * anywhere in this module that can pair the last minute of Tuesday with the
 * first of Wednesday. The only thing that looks across a boundary is the split
 * guard, which produces a refusal and never a sample.
 *
 * **2. The grid is NON-OVERLAPPING, and the reason is not `n`.** Story 5.3's
 * AC 3: overlapping 5-minute returns are serially correlated, so quoting
 * `n = 23,340` over-claims the sample by a factor of five. But the number is
 * the *visible* half — the real cost is that an overlapping grid lets **one
 * extreme close appear in five samples**, so a single violent minute moves the
 * upper tail five times as far as it should and the distribution's shape is
 * wrong, not just its stated size. That is why the test for this property is a
 * **multiplicity** assertion rather than a count: an overlapping grid gives a
 * *more* plausible `n` and nearly the same breakpoints.
 *
 * **3. `n` is COUNTED, never computed from a constant.** `60 × 78` is wrong
 * three ways over: 78 anchors yield **77** increments, an early close yields
 * **41**, and median stored coverage is **82.8%** so grid pairs are routinely
 * absent. Every sample this module produces is a pair it found.
 *
 * **4. The split guard, from Gate 1 decision 1.** The store's bars are
 * `STORED_BAR_ADJUSTMENT = "raw"`, so an unadjusted corporate action inside the
 * window is a −50% or −90% overnight "return" that breaks no percentile
 * property and poisons every figure for 60 sessions. `SPLIT_DISCONTINUITY_RATIO`
 * carries the ceiling and the argument for the number.
 *
 * ## Magnitudes, because the percentile is a magnitude percentile
 *
 * Story 5.1's decisions 2 and 3: the figure 5.3.3 draws is *how unusual is a
 * move of this size*, which is a percentile of `|return|` over the pooled
 * session distribution. The guard keeps the **sign** because a split is
 * directional; the distribution does not.
 *
 * ## Floating point, and why README §4's rule does not reach here
 *
 * That rule exists because **float addition is not associative** — a sum can
 * disagree with itself when a query plan reorders it. Nothing in this module is
 * summed. Each sample is one division of two parsed `numeric` closes, and the
 * aggregation is a **sort**: order statistics are exact and order-independent
 * whatever the element type. `0013_return_baselines.sql` §5 is the long version.
 */

/** The window one generation is computed over, derived from the ledger. */
export interface BaselineWindow {
  /** The session the generation is FOR — the window's last session. */
  readonly asOfSession: MarketDate;
  /** Every session in the window, oldest first. One anchor grid each. */
  readonly sessions: readonly MarketSession[];
  /** The read's bound. Half-open, so two adjacent windows tile. */
  readonly range: TimeRange;
  /**
   * The instant stored in `return_baselines.observed_at` — the window's end,
   * which is the last session's close.
   */
  readonly observedAt: Date;
}

/**
 * The window ending at the last session the fill has **completed**.
 *
 * **One home for this derivation**, because two callers need it and they must
 * not disagree: the nightly pass computes over it, and
 * `GET /diagnostics/baseline-cost` measures the read of it. A diagnostic that
 * derived its own window would be measuring a different query from the one the
 * pass issues, which is Task 4.8.11's lesson in a different costume.
 *
 * @param coveredEnd `bar_coverage.covered_end`, which is **exclusive** — so the
 *   last session it covers is the one containing the instant before it.
 */
export function baselineWindowEndingAt(coveredEnd: Date): BaselineWindow {
  const asOfSession = marketDateAt(new Date(coveredEnd.getTime() - 1));
  const sessions = lastMarketSessions(BASELINE_LOOKBACK_SESSIONS, asOfSession);

  const first = sessions[0];
  const last = sessions[sessions.length - 1];
  if (first === undefined || last === undefined) {
    throw new RangeError(
      `lastMarketSessions(${String(BASELINE_LOOKBACK_SESSIONS)}, ${asOfSession}) ` +
        "returned no sessions, which it is documented never to do.",
    );
  }

  return {
    asOfSession,
    sessions,
    // **The sessions are the window and the range is only the read's bound.**
    // The sampler is driven by `sessions` — one anchor grid each — so a holiday
    // inside the range contributes no anchors rather than being silently
    // spanned. The range exists because a database read needs two instants.
    range: toTimeRange(first.open, last.close),
    // **The window ENDS at the last stored session and the session being scored
    // is strictly later**, which is AC 4's *the baseline excludes the window
    // being scored*: 5.3.3 scores a move inside the live session, and the live
    // session is not in the store until that night's fill.
    observedAt: last.close,
  };
}

/**
 * The minutes a 5-minute grid is anchored on, for one session, oldest first.
 *
 * **Anchored on the session's OPEN and never on a wall clock**, which is what
 * makes the grid the same one the numerator is aligned to: Story 5.3's AC 3
 * requires the baseline's samples to sit on *the same minute-of-session grid as
 * the numerator*, and the only instant both sides can derive independently is
 * 09:30 ET on the session in question.
 *
 * **78 anchors in a regular session and 42 on a 13:00 early close**, derived
 * from {@link MarketSession.minuteBars} rather than from two constants — 390
 * minute bars run 09:30 through 15:59 inclusive, so the last anchor is 15:55 and
 * there are `floor(389 / 5) + 1 = 78` of them. The pairs between them are
 * **77** and **41**, which is where Story 5.3's `78 × 60 = 4,680` goes wrong
 * the first of its three ways.
 *
 * It takes the session object rather than a date because a half day is a
 * session whose close is 13:00 and a caller handed two bare instants has to be
 * told separately that it was a short one — `MarketSession`'s own note.
 */
export function sessionAnchors(session: MarketSession): readonly Date[] {
  const anchors: Date[] = [];
  const open = session.open.getTime();

  // `minuteBars` is derived from the session's own bounds, so this cannot
  // disagree with the close instant the way a hard-coded 390/210 pair could.
  for (
    let minute = 0;
    minute <= session.minuteBars - 1;
    minute += SAMPLE_SPAN_MINUTES
  ) {
    anchors.push(new Date(open + minute * MS_PER_MINUTE));
  }

  return anchors;
}

const MS_PER_MINUTE = 60_000;

/**
 * **The grid's stride, in minutes — five.**
 *
 * It is deliberately NOT `RETURN_SPAN_MINUTES`, and that is this module's
 * sharpest piece of restraint. That constant is derived from
 * `TRAILING_WINDOW_SPAN_MS` — the depth of a **live in-memory ring buffer**,
 * chosen against a measured 283–284 B a bar — and reusing it here would make
 * the baseline's grid stride move the day somebody re-sizes that buffer, in a
 * stored table whose rows were computed under the old one. The two fives are
 * the same number for the same *product* reason (`PRODUCT_SPEC.md` §5.1's
 * `5m`) and have independent reasons to change.
 *
 * [ADR 0043](../../../docs/adr/0043-two-five-minutes-a-freshness-cutoff-and-a-measurement-span.md)
 * already separates two of them; this is the third, and the honest statement is
 * that **the product spells `5` three times**, each with its own home and its
 * own argument. The alternative — one shared `FIVE` — is the shape ADR 0043
 * exists to refuse.
 *
 * Note what this is *not*: it is a **stride over a grid**, not a cutoff
 * subtracted from an instant. There is no `getTime() - n * MS_PER_MINUTE`
 * anywhere in this module, which is why `one-home-for-the-observation-window`
 * is silent about it — correctly, and Story 5.3's Gate 1 records that as false
 * premise 6 rather than as a hole.
 */
const SAMPLE_SPAN_MINUTES = 5;

/** What the pass learned about one security. */
export type ReturnBaselineOutcome =
  | {
      /** Samples found, breakpoints computed. */
      readonly kind: "measured";
      readonly sampleCount: number;
      /** {@link BASELINE_BREAKPOINT_COUNT} magnitudes, ascending. */
      readonly breakpoints: readonly number[];
    }
  | {
      /** A row is written, with no distribution and the reason. */
      readonly kind: "refused";
      readonly sampleCount: number;
      readonly refusal: ReturnBaselineRefusal;
    }
  | {
      /**
       * **Nothing at all — and no row is written.**
       *
       * *The pass has not reached this security* and *the pass reached it and
       * will not answer* are different facts, and only the second is safe to
       * stop retrying. A security with no stored `sip` bars in the window is
       * the first, which on CI's store — 516 securities and **zero bars** — is
       * every security for ever.
       */
      readonly kind: "none";
    };

export interface ReturnBaselineInput {
  /**
   * The window's sessions, **oldest first** — `lastMarketSessions`' order, and
   * the order the split guard's session-boundary walk depends on.
   */
  readonly sessions: readonly MarketSession[];
  /**
   * One security's closes at the grid anchors, keyed by the anchor instant's
   * epoch milliseconds. `sip` only; the store applies that predicate.
   *
   * **Keyed by instant rather than an array**, because the whole question this
   * sampler asks of a pair is *are these two exactly the span apart* — which
   * `fiveMinuteReturn` answers with `===` on instants for the same reason: a
   * 47-minute pair is not a near miss to be tolerated, it is a bar that is not
   * the endpoint.
   */
  readonly closes: ReadonlyMap<number, number>;
}

/** What one walk over the window found. */
export interface BaselineSamples {
  /**
   * Every sample's magnitude, in the order the walk found them.
   *
   * **Exported, and the reason is the one assertion nothing else can make.**
   * `five-minute-return.ts` deliberately exports no function taking
   * `(earlier, later)`, because a pair is something a caller can get wrong —
   * and that argument does not reach here: this function takes the **window**
   * and picks its own endpoints, exactly as `fiveMinuteReturn` does. What it
   * buys is the **multiplicity** property: *an extreme close appears in one
   * sample, not five* is a statement about the set of samples, and reading it
   * off 101 interpolated order statistics is possible but says nothing a
   * reader can check — the 99th of 77 samples with one extreme is `4.8`
   * rather than `0`, because the interpolation reaches into the top order
   * statistic. The first draft of this module's test asserted exactly that
   * and was wrong about the arithmetic rather than about the grid.
   */
  readonly magnitudes: readonly number[];
  /** Whether any session boundary exceeded the split ceiling. */
  readonly discontinuous: boolean;
}

/**
 * **One walk over the window: every sample, and whether the guard fired.**
 *
 * Two concerns in one pass and they are deliberately not two passes — the
 * sampler runs **inside** each session and the guard runs **between** them, off
 * the same closes, so there is no second traversal to disagree with the first
 * (`market-breadth.ts`' own note, and Story 4.4's defect).
 */
export function baselineSamples(input: ReturnBaselineInput): BaselineSamples {
  const { sessions, closes } = input;

  const magnitudes: number[] = [];

  /**
   * The last anchor close seen in the **previous** session, for the guard
   * below. Carried across the loop rather than re-derived, so the guard reads
   * the same closes the sampler did.
   */
  let previousSessionLast: number | undefined;
  let discontinuous = false;

  for (const session of sessions) {
    const anchors = sessionAnchors(session);

    let sessionFirst: number | undefined;
    let sessionLast: number | undefined;

    for (let index = 0; index < anchors.length; index += 1) {
      const anchor = anchors[index];
      if (anchor === undefined) continue;

      const close = closes.get(anchor.getTime());
      if (close === undefined) continue;

      sessionFirst ??= close;
      sessionLast = close;

      // **The pair is the PREVIOUS anchor of this session's own array.** The
      // index walk is what makes the grid non-overlapping and what makes a
      // cross-session pair unrepresentable: `index - 1` cannot reach outside
      // `anchors`, and `anchors` is one session's.
      if (index === 0) continue;

      const earlier = anchors[index - 1];
      if (earlier === undefined) continue;

      const earlierClose = closes.get(earlier.getTime());
      // A missing grid partner is a sample that does not exist — never a
      // stretch to the nearest bar. `fiveMinuteReturn`'s AC 3, applied to a
      // store whose median coverage is 82.8%.
      if (earlierClose === undefined) continue;

      // `changeFromClose` cannot express this and is not asked to: neither
      // operand is a stored session close, both are minute closes on one tape
      // inside one session, and that function's whole body is *which session's
      // close is the basis*. `five-minute-return.ts` carries the same named
      // exemption for the same reason.
      if (!Number.isFinite(earlierClose) || earlierClose === 0) continue;

      magnitudes.push(Math.abs(((close - earlierClose) / earlierClose) * 100));
    }

    // **The guard, between sessions and never inside one.** A violent minute
    // inside a session is a market event and belongs in the distribution; a
    // jump across the boundary where the market was shut is a corporate action
    // far more often than it is a move.
    if (
      previousSessionLast !== undefined &&
      sessionFirst !== undefined &&
      isDiscontinuous(previousSessionLast, sessionFirst)
    ) {
      discontinuous = true;
    }

    if (sessionLast !== undefined) previousSessionLast = sessionLast;
  }

  return { magnitudes, discontinuous };
}

/**
 * **One security's baseline, or the reason there is not one.**
 */
export function returnBaselineOf(
  input: ReturnBaselineInput,
): ReturnBaselineOutcome {
  const { magnitudes, discontinuous } = baselineSamples(input);

  // **The refusal outranks the samples it was computed beside**, and it carries
  // the count anyway: *how much did you have* is the first question asked of a
  // refusal, and `0013`'s `return_baselines_one_answer` makes a refusal beside
  // stale breakpoints unrepresentable in the store.
  if (discontinuous) {
    return {
      kind: "refused",
      sampleCount: magnitudes.length,
      refusal: "split-discontinuity",
    };
  }

  if (magnitudes.length === 0) return { kind: "none" };

  return {
    kind: "measured",
    sampleCount: magnitudes.length,
    breakpoints: breakpointsOf(magnitudes),
  };
}

/**
 * Is a session-boundary ratio outside the band {@link
 * SPLIT_DISCONTINUITY_RATIO} describes?
 *
 * **Both ends from one number**, which is the constant's own argument: a 2:1
 * split is `0.5` and a 1:2 reverse split is `2.0`, and a bound expressed as a
 * percentage would catch the first and miss the second.
 */
function isDiscontinuous(before: number, after: number): boolean {
  if (!Number.isFinite(before) || before <= 0) return false;
  if (!Number.isFinite(after) || after <= 0) return false;

  const ratio = after / before;
  return (
    ratio <= SPLIT_DISCONTINUITY_RATIO || ratio >= 1 / SPLIT_DISCONTINUITY_RATIO
  );
}

/**
 * {@link BASELINE_BREAKPOINT_COUNT} order statistics of a sample, ascending.
 *
 * **Linear interpolation between the two neighbouring order statistics** — the
 * inclusive definition, the one `numpy.percentile`'s default and
 * `PERCENTILE.INC` both use. It is chosen because it is **invertible**: Task
 * 5.3.3 has to go the other way, from a magnitude to a percentile, and a
 * nearest-rank definition is a step function whose inverse is a range rather
 * than a number.
 *
 * `0th` is the minimum and `100th` is the maximum, both of which are real
 * order statistics of this sample. **Above the 100th there is no sample**,
 * which is Gate 1 decision 2's reason for never printing `100th` on screen —
 * a rule about the figure rather than about this array.
 *
 * It **copies before sorting**, because the caller's array is its own.
 */
export function breakpointsOf(samples: readonly number[]): readonly number[] {
  if (samples.length === 0) {
    throw new RangeError(
      "A baseline's breakpoints cannot be computed from an empty sample. " +
        "A security with no grid pairs has no distribution at all — " +
        "`returnBaselineOf` answers `none` and the pass writes no row, " +
        "because an absent row and a refused one are different facts.",
    );
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const last = sorted.length - 1;
  const breakpoints: number[] = [];

  for (let rank = 0; rank < BASELINE_BREAKPOINT_COUNT; rank += 1) {
    const position = (rank / (BASELINE_BREAKPOINT_COUNT - 1)) * last;
    const lower = Math.floor(position);
    const upper = Math.min(lower + 1, last);
    const low = sorted[lower] ?? 0;
    const high = sorted[upper] ?? low;

    breakpoints.push(low + (high - low) * (position - lower));
  }

  return breakpoints;
}
