/**
 * **The vocabulary of the return baseline** — the four numbers and one word
 * both halves of this product have to agree about (Task 5.3.2).
 *
 * The baseline itself is computed in `apps/backend/src/return-baseline.ts`,
 * stored by `0013_return_baselines.sql` and held in memory by
 * `return-baseline-cache.ts`. What is here is the part that must not be spelled
 * twice: the depth of the window, the size of the grid, and the words a refusal
 * can carry. `ANOMALY_BANDS`' own reasoning applies unchanged — the backend that
 * computes and the interface that renders must not end up with two vocabularies
 * for one thing.
 *
 * ~~**Deliberately NOT here: the minimum sample below which a percentile is
 * refused.**~~ **Amended 2026-10-14 by Task 5.3.4, and the reasoning below is
 * why it took until the figure was on screen.** AC 6 asks for one and it is
 * *presentation* policy: the pass counts `n` and stores it, and which `n` is
 * too small to print belongs to the story that draws the figure rather than to
 * the pass that counts. It is here now — {@link BASELINE_MINIMUM_SAMPLE} — and
 * it is here rather than in `0013_return_baselines.sql` for exactly that
 * reason: the stored row carries the count and **not** the verdict, so
 * changing the bound is a deploy rather than a recompute of 516 securities,
 * and a generation computed before the bound existed is refused when it is
 * **read**. It is not the threshold outliving its guess `anomaly.ts` warns
 * about, because it is not a guess: it is `50/√n ≤ 1` solved for `n`.
 */

/**
 * **60 trading sessions**, and it is settled by a downstream document quoting
 * an example rather than by a requirement.
 *
 * `PRODUCT_SPEC.md` §11 states no lookback at all; the only one in the whole
 * spec is §5.1's illustrative
 * `calculate_return_percentile(NVDA, 5m, 60 trading days)`. `BARS.md` §2 treated
 * that as settled and capped history on the strength of it, so the store was
 * sized for this quantity two epics ago.
 *
 * ## This is a SESSION count, and that is why it is not beside the other two
 * ## five-minutes
 *
 * [ADR 0043](../../../docs/adr/0043-two-five-minutes-a-freshness-cutoff-and-a-measurement-span.md)
 * separates `BREADTH_WINDOW_MINUTES` (an eligibility cutoff over a population)
 * from `RETURN_SPAN_MINUTES` (a measurement span between two endpoints of one
 * security). **This is a third quantity and neither of those** — a depth of
 * history, counted in sessions and resolved through the trading calendar, with
 * no minute factor and no subtraction from an instant anywhere in its
 * implementation.
 *
 * Story 5.2's close said `one-home-for-the-observation-window` **will** refuse
 * this lookback. It does not, and that is worse than refusing it: that check's
 * pattern matches `getTime() - <minutes> * MS_PER_MINUTE`, and a
 * 60-trading-session window goes through `lastMarketSessions` with neither half
 * on disk. Story 5.3's Gate 1 records it as false premise 6 and the conjunct
 * that keys on a **session count** is Task 5.3.5's, in the same story.
 */
export const BASELINE_LOOKBACK_SESSIONS = 60;

/**
 * **101 breakpoints — `0th` through `100th` inclusive**, which is what makes a
 * 99th percentile expressible at all.
 *
 * Story 5.3's Description offers `~84 KB` for "pooled breakpoints", and that
 * figure is **~21 breakpoints** — a vigintile grid, whose finest statement
 * about the upper tail is *above the 95th*. Expressing the 99th is the single
 * reason a pooled distribution was chosen over a per-bucket one, so the grid
 * has to be able to carry it.
 *
 * The cost is arithmetic rather than a guess: 516 securities × 101 × 8 B is
 * **417 KB**, about 2× `currentMarketState`'s measured 0.2 MB, against ~19 MB
 * for the raw magnitudes — which buy an exactness nothing can print, because
 * `PRODUCT_SPEC.md` §11's own `99.1st percentile` example is below the sample's
 * resolving power (the binomial standard error at the 99th of n = 4,620 is
 * **0.146 points**).
 */
export const BASELINE_BREAKPOINT_COUNT = 101;

/**
 * Why a security has no distribution. **One member, and a refusal is a
 * first-class outcome** rather than an error — invariant 5 and ADR 0029.
 *
 * - `split-discontinuity` — a session-boundary jump beyond
 *   {@link SPLIT_DISCONTINUITY_RATIO}, which is an unadjusted corporate action
 *   far more often than it is a market move. See that constant for the whole
 *   argument.
 *
 * An absent row and a refused row are **different facts** — *the pass has not
 * reached this security* against *the pass reached it and will not answer* —
 * which is why a refusal is written down rather than skipped.
 */
export const RETURN_BASELINE_REFUSALS = ["split-discontinuity"] as const;

/** One of {@link RETURN_BASELINE_REFUSALS}. */
export type ReturnBaselineRefusal = (typeof RETURN_BASELINE_REFUSALS)[number];

/**
 * **The split ceiling, as a multiplicative bound on a session-boundary jump:
 * `0.6`.**
 *
 * A security's percentile is refused when any overnight ratio — the first grid
 * anchor's close of a session over the last grid anchor's close of the session
 * before it — falls at or below `0.6`, or at or above `1 / 0.6 ≈ 1.667`.
 *
 * ## Why there has to be a number at all
 *
 * Story 5.3's Gate 1 decision 1: the baseline reads the **store**, whose bars
 * are `STORED_BAR_ADJUSTMENT = "raw"`. A single unadjusted 2:1 split inside the
 * window halves the price overnight, which this sampler would otherwise read as
 * a **−50% five-minute return** — a sample that breaks no percentile property,
 * changes no `n`, keeps the tape pure, and drags every percentile for that
 * security far too low for the next 60 sessions. `PROVIDER.md` §3.5 forbids
 * *computing* an adjustment; refusing is the one answer left.
 *
 * ## Why 0.6, between the two things it has to separate
 *
 * The **smallest corporate action it must catch** is 2:1, at a ratio of exactly
 * `0.5` — every larger one is further away (3:1 is `0.333`, the 10:1 that
 * motivated the guard is `0.1`). The **largest ordinary overnight gap it must
 * admit** is an earnings collapse or a takeover pop in a universe of 501 S&P-500
 * constituents and fifteen broad ETFs, which is a ±20–35% class of event; a
 * −50% overnight move in a name of that size essentially does not occur without
 * a corporate action, which is precisely why `0.5` is a usable dividing line.
 * `0.6` sits between the two with headroom on both sides.
 *
 * **It is stated as a ratio rather than as a percentage because it has to be
 * multiplicatively symmetric.** A 1:2 reverse split is `+100%`, which no
 * percentage ceiling below 100 can distinguish from a real doubling — but
 * `0.6` and its reciprocal catch the forward split and the reverse split with
 * **one number**, and a bound written as "±40%" would catch the first and miss
 * the second.
 *
 * ## What it costs, stated rather than discovered
 *
 * A genuine overnight move beyond this band refuses that security's percentile
 * for every generation whose window contains that session — 60 sessions. That
 * is the trade taken deliberately: a refusal is a first-class outcome and a
 * split-poisoned percentile is a wrong number nobody can see. **Reversal
 * trigger, a condition:** the first security whose refusal is traced to a
 * market move rather than to a corporate action, at which point the guard needs
 * a second signal (a volume ratio, or the provider's own split calendar) rather
 * than a wider number.
 */
export const SPLIT_DISCONTINUITY_RATIO = 0.6;

/**
 * **The minimum sample a percentile may be printed from: 2,500 — and it is
 * derived from the PRINTED PRECISION rather than chosen** (Task 5.3.4, AC 6).
 *
 * ## What the printed figure claims
 *
 * This product prints an **integer ordinal** — `47th`, `99th` — with
 * `>99th` at the ceiling and no decimal anywhere (Story 5.3's Gate 1 decision
 * 2). So the last digit it draws is **one percentile point**, and AC 6's second
 * half — *never printed at a precision the sample cannot support* — is a
 * question with an arithmetic answer: at what `n` is one point inside the
 * sample's own resolving power?
 *
 * ## The arithmetic, at the worst point on the scale rather than at the tail
 *
 * The standard error of a sample percentile, in **percentile points**, is
 * `100 · √(p(1−p)/n)`. It is largest at `p = 0.5`, where it is `50/√n`:
 *
 * | `n`       | SE at the 50th | SE at the 99th |
 * | --------- | -------------- | -------------- |
 * | 737 (the measured floor) | **1.84 pt** | 0.37 pt |
 * | 2,500     | **1.00 pt**    | 0.20 pt        |
 * | 4,620 (the ceiling)      | 0.74 pt | 0.146 pt |
 *
 * `50/√n ≤ 1` gives `n ≥ 2500` **exactly**, which is why the number is round
 * without being chosen: it is the sample size at which the printed digit is
 * worth one digit **everywhere on the scale**, not only in the tail the
 * baseline is usually read for. The 0.146 figure at the 99th is the one
 * `PRODUCT_SPEC.md` §11's dated amendment already quotes, and taking the bound
 * at the tail instead would have given `n ≥ 396` — a floor almost nothing in
 * this universe falls below, which is a threshold that refuses nothing and
 * therefore tests nothing.
 *
 * ## What it costs, measured rather than projected
 *
 * Over this machine's own store (2026-10-14, the 2026-09-11 generation, 511
 * measured securities): **11 are refused** — 2.2% — and they are
 * `ERIE` (737), `NVR` (1,248), `AIZ` (1,284), `ESS` (1,627), `WST` and `GL`
 * (2,041), `IEX` (2,313), `CINF` (2,351), `PKG` (2,386), `L` (2,463) and
 * `VRSN` (2,492). The distribution is not a cliff — 275 of 511 sit in the top
 * tenth — so the bound sits in a thin tail rather than on a mass of securities,
 * and `ERIE`, at 2.1% minute coverage, is the same name Story 5.2 chose as its
 * worked example of a sparse security.
 *
 * ## Why it is here and not in the pass
 *
 * `0013_return_baselines.sql` §4 and Task 5.3.2 both record the reason: the
 * pass **counts** `n` and stores it, and which `n` is too small to print is a
 * decision about the figure rather than about the sample. Keeping it out of the
 * stored row is what makes changing this number a **deploy** rather than a
 * recompute of 516 securities, and it is why the eleven names above are refused
 * today against generations computed before this constant existed.
 *
 * **Reversal trigger, a condition:** the first figure this product prints from
 * this baseline at a precision finer than one percentile point — a decimal
 * ordinal, or a band boundary derived from the distribution — at which point
 * the bound is the arithmetic above re-run against that precision rather than
 * this number adjusted.
 */
export const BASELINE_MINIMUM_SAMPLE = 2500;

/**
 * **Why there is no percentile beside a figure — the vocabulary the WIRE
 * carries** (Task 5.3.4).
 *
 * It is a **superset** of {@link RETURN_BASELINE_REFUSALS}, and the two are
 * deliberately different lists:
 *
 * - `RETURN_BASELINE_REFUSALS` is what the **pass stored**, backed by
 *   `return_baselines_refusal_known` in the database. A member added there is a
 *   migration.
 * - this is what the **reader is told**, which includes a refusal the pass
 *   never wrote: a stored distribution whose counted `n` is below
 *   {@link BASELINE_MINIMUM_SAMPLE} is refused at the moment it is read, so a
 *   generation computed before that bound existed is refused without being
 *   recomputed.
 *
 * `too-few-samples` covers **two** facts with one word, deliberately: *we hold
 * a distribution and it is too short* and *we hold no distribution at all*,
 * because `0 of 2,500 returns` is a true statement about a cold replica and a
 * second sentence for it would be a second sentence saying the same thing. A
 * cold replica, a security with no stored `sip` history, and CI's permanent
 * state are all this member with a `sampleCount` of `0`.
 *
 * The {@link PercentileRefusalIsASuperset} line below is the structural half: a
 * member added to the **stored** vocabulary and not to this one is a compile
 * error here rather than a refusal the wire cannot carry.
 */
export const PERCENTILE_REFUSALS = [
  "too-few-samples",
  "split-discontinuity",
] as const;

/** One of {@link PERCENTILE_REFUSALS}. */
export type PercentileRefusal = (typeof PERCENTILE_REFUSALS)[number];

/**
 * Every stored refusal is a percentile refusal. **A type-level assertion
 * rather than a test**: widening `RETURN_BASELINE_REFUSALS` without widening
 * {@link PERCENTILE_REFUSALS} fails `tsc -b`, which is the only thing that
 * cannot be forgotten.
 */
export type PercentileRefusalIsASuperset =
  ReturnBaselineRefusal extends PercentileRefusal ? true : never;

/** Satisfied only while the assertion above holds. */
export const PERCENTILE_REFUSALS_COVER_THE_STORED_ONES: PercentileRefusalIsASuperset = true;
