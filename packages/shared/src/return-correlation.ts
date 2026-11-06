import { BASELINE_LOOKBACK_SESSIONS } from "./return-baseline.js";

/**
 * **The vocabulary and the arithmetic of a pairwise return correlation — the
 * first derived quantity in this product that is about TWO securities** (Task
 * 6.5.1).
 *
 * `return-baseline.ts` is the module this sits beside, and the division between
 * them is the same one that file states: the numbers and words both halves of
 * this product must agree about live in `packages/shared`, and the pass that
 * reads a store lives in `apps/backend`. What is different here is that the
 * **arithmetic** is in this file too, which `return-baseline.ts` deliberately
 * leaves to the backend — because a correlation is a pure function of two
 * series and nothing about it needs a session grid, a calendar or a handle.
 * `market-breadth.ts`' own shape, and for its reason: a function that reads
 * nothing cannot read something timestamped after a replay clock, which is
 * invariant 4 made structural rather than instructed.
 *
 * ## What is here, and what is deliberately not
 *
 * **Here:** the window (a re-export, never a second number), the two refusal
 * words, the definedness floor on the overlap, Pearson's own coefficient, and
 * the significance test that decides whether an edge is drawn at all.
 *
 * **Not here:** the **selection** — _which_ of the retained pairs survive a
 * top-N per node — which is `apps/backend/src/return-correlation-selection.ts`.
 * The split is the one Story 4.5 established between
 * `moveRankingKey`/`compareByMove` (the order) and `selectMovers` (the cut):
 * the order of two coefficients is a property of the quantity, and how many of
 * them a graph can carry is a property of a drawn surface.
 *
 * ## Three things this module refuses rather than approximates
 *
 * **1. A pair with too little overlap.** Two securities' 5-minute grids
 * intersect only where **both** printed a bar at the same anchor, and median
 * stored coverage is 82.8% — so the intersection is strictly smaller than
 * either leg's own `n` and, for a thinly-traded security, very much smaller.
 * Below {@link CORRELATION_MINIMUM_OVERLAP} the statistic is not imprecise, it
 * is **undefined**; see that constant.
 *
 * **2. A leg with no variance.** A security whose grid returns are all the same
 * number — a halt, a stub, a single repeated close — gives Pearson a
 * denominator of zero. The answer is a refusal and never a `0`: a coefficient
 * of zero is a **claim** (*these two do not move together*) and this product
 * does not make it from an arithmetic accident.
 * `no-imputed-zero-in-a-figure`'s rule, arriving on a correlation.
 *
 * **3. A coefficient indistinguishable from zero.** Story 6.5's Open Decision 3
 * settled *no edge below a DERIVED floor*, and
 * {@link correlationIsSignificant} is that floor. There is no round `|r| ≥ 0.5`
 * anywhere in this product, because AC 4 forbids exactly that number.
 */

/**
 * **The window a correlation is computed over — 60 trading sessions, and it is
 * {@link BASELINE_LOOKBACK_SESSIONS} rather than a second constant.**
 *
 * This is a **re-export and not a copy**, which is the whole point of the line.
 * Story 6.5's Open Decision 2 settled the window as *the existing 60-session
 * `return_baselines` grid of 5-minute returns* — the same sessions, the same
 * anchors, the same stride, read in the same pass — so a second number here
 * would be a second home for one quantity, and the two would drift the first
 * time somebody re-sized one of them.
 *
 * It is exported under its own name anyway, because a reader of a correlation
 * row is owed *how deep is this* without having to know that the figure is
 * borrowed from a different factor's constant. `SAMPLE_SPAN_MINUTES`' own
 * argument one quantity over, with the opposite conclusion — there the two
 * fives had independent reasons to change, and here the two sixties cannot:
 * they are the same read.
 *
 * **Reversal trigger, a condition:** _the first correlation computed over a
 * window the price baseline does not read_ — at which point this stops being a
 * re-export and becomes a constant with its own derivation.
 */
export const CORRELATION_LOOKBACK_SESSIONS = BASELINE_LOOKBACK_SESSIONS;

/**
 * **The minimum overlap a coefficient may be computed from: 4 — and it is a
 * DEFINEDNESS floor rather than a precision one.**
 *
 * This is where it differs from `BASELINE_MINIMUM_SAMPLE`, which is the
 * nearest relative and is derived the other way. That bound asks *at what `n`
 * is the printed digit worth one digit* — `50/√n ≤ 1`, giving 2,500 — which is
 * a question about **presentation**, so a generation computed before the bound
 * existed is refused when it is **read**. This one is a question about
 * **correctness**, and the arithmetic is one line:
 *
 * The significance test this module ships ({@link correlationIsSignificant})
 * is a Fisher-z interval, whose standard error is `1/√(n − 3)`. That
 * expression is **finite and positive for `n ≥ 4` and for no smaller `n`**:
 * at `n = 3` it divides by zero, and below that it takes the square root of a
 * negative number. So 4 is not a round number somebody chose, and it is not a
 * floor on how much we are willing to believe — it is the smallest overlap at
 * which the test the decision rests on **has a value at all**.
 *
 * **It is deliberately NOT a precision floor, and the reason is that the
 * selection is a ranking.** A precision floor would be the honest analogue of
 * `50/√n ≤ 1` — `SE(z) ≤ some bound` — and this module does not have one,
 * because the figure is never printed to a precision: nothing draws `r = 0.73`,
 * and what the pass does with the coefficient is **order** it. What protects a
 * low-`n` pair from being promoted on noise is the significance test, which
 * widens its own interval as `n` falls and refuses the pair outright: at
 * `n = 4` a pair needs `|r| > 0.96` to clear it, and at the ceiling `n = 4,620`
 * it needs `|r| > 0.029`. So the thin pairs are filtered by the thing that
 * knows how thin they are rather than by a second number here.
 *
 * **What it does NOT protect against is stated rather than hidden** — a
 * thinly-traded security's sparser grid attenuates every coefficient it forms
 * toward zero, biasing the ranking against exactly the securities a reader can
 * least independently verify. That is accepted, named in Story 6.5's own Open
 * Decision 2, and carried in `docs/GAPS.md` with an owner.
 *
 * **Reversal trigger, a condition:** _the first surface that prints a
 * coefficient as a figure rather than drawing it as an edge_ — at which point
 * this bound is joined by a precision floor derived from that figure's own
 * printed precision, exactly as `BASELINE_MINIMUM_SAMPLE` was.
 */
export const CORRELATION_MINIMUM_OVERLAP = 4;

/**
 * **The two-tailed critical value at 95%: 1.96 — a STATED convention, not a
 * derived number.**
 *
 * There is no measurement that produces 95%. It is the conventional
 * significance level, and it is spelled out here rather than buried in an
 * expression for the same reason Pearson is named rather than implied: a
 * reader asking *why is this pair not drawn* is owed the convention that
 * excluded it. `0.95` and `1.96` are two spellings of one choice and only one
 * of them is in the code.
 *
 * Changing it does not change what a coefficient means — it changes how much
 * evidence a pair needs before this product will draw an edge for it. A
 * stricter level draws fewer, sparser edges; a looser one draws more edges on
 * less evidence. **Reversal trigger, a condition:** _the first session on which
 * the significance test, rather than the top-N, is what bounds the drawn set_ —
 * if a node's own top-N is routinely shorter than N because its candidates are
 * all refused, the level is doing the cutting and is a product decision rather
 * than a convention.
 */
export const CORRELATION_CONFIDENCE_Z = 1.96;

/**
 * **Why a pair has no coefficient. Two members, and a refusal is a first-class
 * outcome** rather than an error — invariant 5 and ADR 0029.
 *
 * - `too-few-overlapping-samples` — the two securities' grids intersect at
 *   fewer than {@link CORRELATION_MINIMUM_OVERLAP} anchors, so the statistic
 *   is undefined rather than imprecise.
 * - `zero-variance` — one leg's returns do not vary over the window, so
 *   Pearson's denominator is zero. A halted security, a stub, or a security
 *   whose whole overlap is one repeated close.
 *
 * **Both are facts about the PAIR and neither is a fact about a security**,
 * which is the one place this vocabulary's shape differs from
 * `RETURN_BASELINE_REFUSALS`'. A security the split guard refuses forms **no
 * pair at all** and is counted once, in security space — not once per pair, of
 * which there are ~500. `0018_return_correlations.sql` §5 holds that
 * arithmetic.
 *
 * Unlike `return_baselines`, a refused pair is **not a row**: there are
 * 125,250 candidate pairs over 501 equities, so storing a refusal each would
 * be a table two orders of magnitude larger than the retained set, about a
 * fact that is uniform across tens of thousands of pairs. The counts go on the
 * pass row instead, which is `0014` §4's rule at the pair grain.
 */
export const CORRELATION_REFUSALS = [
  "too-few-overlapping-samples",
  "zero-variance",
] as const;

/** One of {@link CORRELATION_REFUSALS}. */
export type CorrelationRefusal = (typeof CORRELATION_REFUSALS)[number];

/**
 * One security's grid returns, keyed by the **later** anchor's epoch
 * milliseconds and holding the **signed** percentage return.
 *
 * **Keyed by instant rather than an array**, which is `ReturnBaselineInput`'s
 * own argument pointed at a second consumer: the whole question a correlation
 * asks of two series is *which anchors do these two share*, and that is a set
 * intersection on instants. Two arrays would have to be aligned by position,
 * which is only correct if both securities printed every anchor — and median
 * stored coverage is 82.8%, so they do not.
 *
 * **Signed, not magnitudes.** The baseline's sampler keeps `Math.abs` because
 * a percentile of a magnitude is what it draws; a correlation of magnitudes is
 * a different and far less interesting quantity (two securities that both move
 * violently on the same minutes, in opposite directions, would read as
 * perfectly correlated). The sign is the information.
 */
export type ReturnSeries = ReadonlyMap<number, number>;

/** One pair's coefficient, or the reason there is not one. */
export type CorrelationOutcome =
  | {
      /** Pearson's `r`, in `[-1, 1]`. */
      readonly r: number;
      /**
       * **The COUNTED overlap** — anchors present in both series, never
       * `60 × 77` and never either leg's own `n`. It travels with the
       * coefficient because the significance test is a function of both, and
       * a reader of a stored row cannot re-derive it.
       */
      readonly n: number;
    }
  | {
      /** No coefficient, and which of the two reasons. */
      readonly refusal: CorrelationRefusal;
    };

/**
 * **Pearson's product-moment correlation of two securities' grid returns, over
 * the anchors they share — or the reason there is not one.**
 *
 * ## Pearson, named rather than implied
 *
 * Of the three ordinary choices — Pearson, Spearman's rank, Kendall's tau —
 * this is Pearson, and the choice is stated because the other two answer
 * different questions. Spearman would rank the returns and correlate the
 * ranks, which throws away the **size** of a move and would make a pair that
 * co-moves gently on every minute indistinguishable from one that co-moves
 * violently; the product this is drawn in is about unusual **magnitudes**.
 * Kendall's tau is O(n²) in the overlap, which at `n = 4,620` and 125,250
 * candidate pairs is not a cost this pass can carry. Pearson is also the
 * statistic the Fisher-z transform is defined for, which is what
 * {@link correlationIsSignificant} rests on.
 *
 * ## The intersection, and which map is walked
 *
 * The **smaller** series is iterated and the larger is probed, so the walk is
 * `O(min(|a|, |b|))` rather than `O(|a|)`. At universe scale this is the
 * difference between walking a sparse security's 400 anchors and walking a
 * liquid one's 4,620 for the same answer, 125,250 times.
 *
 * ## The single-pass form, and why it is safe here
 *
 * `r = (n·Σxy − Σx·Σy) / (√(n·Σx² − (Σx)²) · √(n·Σy² − (Σy)²))`, accumulated
 * in one walk rather than a mean pass followed by a covariance pass. The
 * single-pass form is the one with a cancellation hazard, and the operands are
 * what bound it: these are **5-minute percentage returns**, order 0.1, so the
 * squares are order 0.01 and the sums at `n = 4,620` are order 10 — the two
 * terms of `n·Σx² − (Σx)²` are not two nearly-equal large numbers, which is
 * the condition the hazard needs. README §4's non-associativity rule is a rule
 * about **money**, and nothing here is money or is summed into a stored total.
 *
 * **What the single-pass form costs, measured rather than argued.** A
 * perfectly linear pair comes out at **0.9999999999999998** rather than at
 * `1` — a residual of `2.22e-16`, two ulps, reproducible on the four-point
 * cases this module's own test uses. The centred two-pass form gives exactly
 * `1` on the same inputs and is the textbook recommendation, and it is **not**
 * what ships: it needs either a second intersection walk or two arrays
 * allocated per pair, 125,250 times a pass, to move a figure that is stored in
 * a `numeric(18, 6)` column (where `0.9999999999999998` rounds to
 * `1.000000`), ranked by magnitude, and compared against a significance floor
 * of 0.029 at best. The residual is stated here and asserted as a tolerance in
 * the test rather than papered over, because a test claiming exact `1` would
 * be claiming something this implementation does not do.
 *
 * ## The clamp, and the guard that is not a `?? 0`
 *
 * Floating point can put a perfectly correlated pair a few ulps outside
 * `[-1, 1]`, which would fail `return_correlations_coefficient_in_range` in
 * the database and `Math.atanh` in the test. The answer is a **clamp** to the
 * mathematical bound, which is not an imputation: the true value is known to
 * be exactly on the bound. A non-finite `r` from any other cause is **refused**
 * as `zero-variance` rather than clamped, because the only way to reach one
 * with both variances positive is an input this function was handed wrongly.
 */
export function pearsonCorrelation(
  seriesA: ReturnSeries,
  seriesB: ReturnSeries,
): CorrelationOutcome {
  const [walked, probed] =
    seriesA.size <= seriesB.size ? [seriesA, seriesB] : [seriesB, seriesA];

  let n = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumYY = 0;
  let sumXY = 0;

  for (const [at, x] of walked) {
    const y = probed.get(at);
    if (y === undefined) continue;

    // A non-finite return is not a sample. It cannot arrive from
    // `baselineReturnSeries`, which refuses a zero or non-finite basis, and
    // this function is pure and total about its own arguments.
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    n += 1;
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumYY += y * y;
    sumXY += x * y;
  }

  if (n < CORRELATION_MINIMUM_OVERLAP) {
    return { refusal: "too-few-overlapping-samples" };
  }

  const varianceX = n * sumXX - sumX * sumX;
  const varianceY = n * sumYY - sumY * sumY;

  // **Zero or negative is one answer, and the negative arm is not dead code.**
  // `n·Σx² − (Σx)²` is `n²` times the population variance and is therefore
  // non-negative in exact arithmetic; in floating point a constant series can
  // come out a hair below zero. Both mean *this leg does not vary*, and both
  // are the same refusal.
  if (varianceX <= 0 || varianceY <= 0) return { refusal: "zero-variance" };

  const coefficient =
    (n * sumXY - sumX * sumY) / (Math.sqrt(varianceX) * Math.sqrt(varianceY));

  if (!Number.isFinite(coefficient)) return { refusal: "zero-variance" };

  return { r: Math.max(-1, Math.min(1, coefficient)), n };
}

/**
 * **Is this coefficient distinguishable from zero at this pair's own counted
 * overlap?** — Story 6.5's Open Decision 3, as a function rather than as a
 * number.
 *
 * ## The test
 *
 * A sample correlation is not normally distributed, so its interval is taken
 * on Fisher's transform, which is: `z = atanh(r)`, whose standard error is
 * `1/√(n − 3)` and which **is** approximately normal. The two-tailed 95%
 * interval is `z ± 1.96·SE`, transformed back with `tanh`, and the pair is
 * significant when that interval **excludes zero** — which, because `tanh` is
 * monotone and `tanh(0) = 0`, is the same statement as both endpoints sharing
 * a sign.
 *
 * It is written as the interval rather than as the equivalent
 * `|atanh(r)| > 1.96·SE` because the interval is the thing a reader can check
 * against a statistics text, and because the endpoints are what a later
 * surface would draw if it ever shows the uncertainty rather than hiding it.
 *
 * ## Why a test rather than a threshold, which is AC 4
 *
 * A fixed `|r| ≥ 0.5` treats a pair measured over 4,620 shared anchors and a
 * pair measured over 6 as the same evidence, and they are not: at `n = 4,620`
 * the interval is ±0.029 wide and at `n = 6` it is wide enough to admit almost
 * anything. So a threshold refuses real relationships in liquid names and
 * admits noise in thin ones — precisely the wrong way round, and precisely the
 * kind of chosen round number Story 5.3 established this product does not
 * ship. The floor here **moves with the evidence**, and nothing has to choose
 * it.
 *
 * ## The two boundary arms
 *
 * Below {@link CORRELATION_MINIMUM_OVERLAP} the standard error is not finite
 * and the answer is `false` — stated as its own branch rather than left to
 * `Infinity` arithmetic, because a reader of this function is owed the floor
 * by name. At `|r| = 1` the transform is infinite and the interval collapses
 * onto the bound, which answers `true` through ordinary IEEE arithmetic: a
 * perfect correlation over four or more shared anchors is distinguishable from
 * zero, and that is the right answer rather than an accident.
 */
export function correlationIsSignificant(r: number, n: number): boolean {
  if (!Number.isFinite(r) || n < CORRELATION_MINIMUM_OVERLAP) return false;

  const standardError = 1 / Math.sqrt(n - 3);
  const transformed = Math.atanh(r);

  const lower = Math.tanh(
    transformed - CORRELATION_CONFIDENCE_Z * standardError,
  );
  const upper = Math.tanh(
    transformed + CORRELATION_CONFIDENCE_Z * standardError,
  );

  return lower > 0 || upper < 0;
}
