import { EXCESS_FACTOR_REFUSALS } from "./excess-move.js";
import { PERCENTILE_REFUSALS } from "./return-baseline.js";
import { VOLUME_REFUSALS } from "./volume-baseline.js";

import type { AnomalyBand } from "./anomaly.js";
import type {
  ExcessFactorRefusal,
  ExcessMoveInapplicability,
} from "./excess-move.js";
import type { PercentileRefusal } from "./return-baseline.js";
import type { VolumeRefusal } from "./volume-baseline.js";

/**
 * **The composite anomaly score, its explanation, and the one place the
 * addition is decided** (Task 5.6.3).
 *
 * ## Why it is in `packages/shared/src/` — the whole purity argument
 *
 * `eslint.config.mjs`' `no-restricted-syntax` block scopes **four** clock rules
 * to `packages/shared/src/**` and permits nothing at all there: constructing an
 * `Intl.DateTimeFormat`, spelling the market's timezone, `Date.now()`, and a
 * zero-argument `new Date()`. Story 5.6's AC 12 asks that *the scorer reads no
 * clock, socket or handle* — and in this directory the first half of that is a
 * **lint error** rather than a reading. `docs/GAPS.md`'s *Nothing checks for
 * `?? 0`, and backend factor purity is held by prose* names *"the next story
 * that adds a factor"* as its owner; this is it, and siting the scorer here is
 * half of what that entry asked for. The other half — widening the clock rules
 * to `apps/backend/src` — is **still open and deliberately so**: that widening
 * catches `index.ts` and the gateway, which read the clock legitimately, and
 * needs an argued exemption list rather than a line.
 *
 * Everything this module needs arrives as an **argument**. There is no store,
 * no cache, no `fetch`, no socket and no instant: a factor's answer is a
 * value, and Epic 13's replay gets the same score for the same answers with no
 * second code path.
 *
 * ## The combination rule: a weighted sum in score points
 *
 * `PRODUCT_SPEC.md` §11's *interpretable rather than sophisticated* is a
 * constraint on the arithmetic, not a tone. A weighted sum is the only family
 * where *"this score is 73 because the price term contributed 38 of its 40"* is
 * a true sentence a reader can check **by addition**, and Story 5.6's
 * Description records why each alternative was refused: **max** throws away
 * corroboration, a **product** lets one absent factor annihilate the score,
 * **rank-based cross-sectional** guarantees a 91 on a dead day, and
 * **Mahalanobis or PCA** is unexplainable to a reader.
 *
 * Six things make that addition checkable, and all six are structural here:
 *
 * 1. **The weights are integers summing to 100 over the full factor set** —
 *    see {@link FACTOR_WEIGHTS}. *"38 of its 40"* is unreadable unless the
 *    weight is the term's own maximum **in the score's own unit**.
 * 2. **Every factor maps to a unit value in `[0, 100]`**, and that unit is a
 *    **percentile of the factor's own history** — the one unit needing no
 *    invented constant. Story 5.6's Gate 1 records the finding that outranks
 *    the rest: an invented curve (a log cap, a sigmoid, a chosen knee) is
 *    calibrated in one tape's units, so the mapped factor stops being
 *    scale-free, and ADR 0045's invariance test and this rule are the same
 *    argument arriving from two directions.
 * 3. **A contribution is `round(w × u / 100)`**, so `0 ≤ c ≤ w` **by
 *    construction** rather than by a clamp.
 * 4. **Score and contributions print at the same precision** — both are
 *    integers in score points. There is no rounding at the draw.
 * 5. **The factor's printed figure IS the unit value.** `u = rank`, the same
 *    integer ordinal the clause draws, so the multiplication is checkable from
 *    the screen. See {@link unitOf} for why `rank + 1` and `rank × 100/99` were
 *    both refused.
 * 6. **The score IS the sum of the rounded contributions.** See below.
 *
 * ## Round each contribution first, then sum — and state the cost
 *
 * The score is `Σ round(w_i × u_i / 100)` and **not** `round(Σ w_i × u_i /
 * 100)`. The two differ by up to **±1 per factor**, so by up to ±1 today and ±2
 * when the third factor arrives.
 *
 * The alternative is worse in the one way that matters: if contributions were
 * rounded for display while the score came from unrounded values, `38 + 12 =
 * 50` could be drawn beside a score of `51` and **the reader's addition would
 * fail on a correct implementation**. A score nobody can add up is not an
 * interpretable score, and §11 asks for interpretable.
 *
 * Monotonicity survives, because `Math.round` is monotone non-decreasing: a
 * larger unit never produces a smaller contribution, so it never produces a
 * smaller score.
 *
 * **Reversal trigger, a condition:** the first figure in an explanation drawn
 * at a precision finer than one score point — a decimal score, or a
 * contribution in tenths — at which point the rounding happens at that
 * precision and the ±1 becomes ±0.1, rather than this decision being
 * revisited.
 *
 * ## The absent-factor rule — no imputation, no renormalisation
 *
 * ```
 * score = Σ_{i∈P} round(w_i × u_i / 100)        max = Σ_{i∈P} w_i
 * ```
 *
 * where `P` is the set of factors that produced a figure. **A factor that
 * refused contributes nothing and reduces the maximum**, so the number means
 * *"at least this unusual, on the evidence we have"* — it can only understate.
 *
 * Story 5.6's AC 3 argues the alternative out: renormalising raises the
 * variance of a score computed from fewer factors, which **systematically
 * promotes the worst-covered securities into the top-N** — the opposite of what
 * `UNIVERSE.md` rule 4 spent ~19 discretionary curation slots to prevent. And
 * Story 5.5's close states the shipped form of it: *"a composite that quietly
 * redistributes a missing factor's weight across the other three is a different
 * score wearing the same number, and nothing on screen would say so."*
 *
 * **Both halves of the label travel** — {@link AnomalyScore.contributing}`
 * .length` **and** {@link AnomalyScore.max} — because with unequal weights
 * `2 of 3` has different maxima depending on **which** two: price and the
 * excess move is 75, price and volume is 65, the excess move and volume is 60.
 * A count alone would be three different scales wearing one label.
 *
 * ## The brand, and exactly what it does and does not prove
 *
 * `ticker.ts`' pattern, with one deliberate divergence argued at {@link brand}:
 * a `unique symbol` that is **not exported**, so **no module but this one can
 * mint a branded value**, and there is no exported constructor and no
 * satisfiable interface. `{ factor: "volume",
 * contribution: 3.8 }` is a type error wherever a clause is wanted, and
 * {@link AnomalyScore.contributing} is `[T, ...T[]]`, so **a score with no
 * contributing factor is untypeable** — AC 5's *cannot be constructed without
 * its explanation*, as a compile error.
 *
 * **What it does not prove, said plainly because a claimed mechanism that is
 * really prose is this repository's most-recorded failure mode.** TypeScript
 * cannot prove that the number inside a branded clause came from the
 * calculation the clause names. The brand is a compile error about **which
 * module minted the value**; that the value is `round(w × u / 100)` of the
 * right inputs is a **test** ({@link scoreAnomaly}'s properties and golden
 * sample), and nothing more. Two halves, and they are not the same half.
 *
 * ## The brand dies at `JSON.parse`, and the repair is stronger than the brand
 *
 * `JSON.stringify` drops symbol keys, so a score that has crossed a wire
 * carries no brand at all — the type survives the process and not the socket. {@link readAnomalyScore} is the repair and it makes
 * a claim about the **value** rather than about the module: it **re-adds the
 * published contributions and refuses the whole explanation when the sum is not
 * the score it was sent**, and it **re-derives each contribution from the
 * published weight and the drawn figure**. That is what AC 5 was reaching for —
 * *every figure in an explanation traces to a named calculation* — asserted by
 * walking the explanation rather than by reading it.
 *
 * **Exactly two mint sites**, {@link scoreAnomaly} and
 * {@link readAnomalyScore}, held by `pnpm invariants`'
 * `two-mint-sites-for-an-anomaly-score` with the break
 * `a-third-mint-site-for-an-anomaly-score`.
 *
 * ## `Object.keys` skips symbol keys, which is why there are TWO types
 *
 * `wire-serialiser.ts`' {@link toWire} walks `Object.keys(fields)`. A
 * `WireFields<AnomalyScore>` map is a mapped type over `keyof AnomalyScore`,
 * which **includes the brand's symbol key** — so the map would require an entry
 * for it, the entry would typecheck, and `Object.keys` would **never read it**.
 * Nothing would be wrong on the type and the explanation would silently never
 * encode.
 *
 * So the domain type and the wire type are two types, and
 * {@link toWireAnomalyScore} is a **named mapper, field by field, never a
 * spread** — ADR 0031's reason exactly: a spread of a branded value onto a wire
 * object is the leak `toWire` exists to prevent, arriving by a route `toWire`
 * cannot see.
 */

/**
 * **The three factors, and the order an explanation reads them in.**
 *
 * `PRODUCT_SPEC.md` §11 names four and Story 5.6's Gate 1 false premise 3
 * corrects it: **breadth cannot be a weight**, because it is identical for
 * every member of a group — weighting it correlates a whole sector's scores and
 * fills a ranked list with one industry on the day that industry moved
 * together. It is a stated clause beside the score (Story 5.1's decision 4),
 * never a term in it. **The denominator is 3.**
 */
export const COMPOSITE_FACTORS = ["price", "excess", "volume"] as const;

/** One of {@link COMPOSITE_FACTORS}. */
export type CompositeFactor = (typeof COMPOSITE_FACTORS)[number];

/**
 * **The weights, published rather than hidden** — AC 2, whose whole point is
 * that their arbitrariness is **visible**: they are drawn in the explanation,
 * so a reader can see the judgement rather than only its output.
 *
 * ## They sum to 100 over the FULL factor set, which is what makes the label
 * ## readable
 *
 * *"the price term contributed 38 of its 40"* needs the weight to be the term's
 * own maximum in the score's own unit. A weight set summing to anything else
 * puts the reader's arithmetic in a different unit from the figure beside it.
 * `composite-score.test.ts` asserts the sum; it is a **test** rather than a
 * type because TypeScript cannot add.
 *
 * ## Why 40 / 35 / 25, with the one gap that is measured rather than judged
 *
 * **Price 40 and excess 35 are the same KIND of evidence** — each is a
 * percentile of this security's own 60-session history of the same quantity —
 * so they are near-equal by construction, and the ordering between them is a
 * judgement: the price percentile is the security's own behaviour, which is the
 * question a reader asked, and the excess move is **corroboration** of it.
 *
 * **The five-point gap is measured, not judged.**
 * `apps/backend/src/excess-move-baseline.ts` states it as a property of the
 * paired walk: *"`n` here is strictly below the price baseline's for the same
 * security, because the benchmark's coverage multiplies the subject's."* A
 * sample is a sample only where **four** closes exist, so the excess factor's
 * ordinal rests on less history than the price factor's for every security in
 * the universe, at every instant. Less history is less confidence, and less
 * confidence is less weight.
 *
 * **Volume 25, the smallest, and the reason is ADR 0045 rather than coverage.**
 * Absence is handled by the absent-factor rule, so thin coverage is not an
 * argument about weight. What is: volume is an **extensive** quantity (ADR
 * 0045's repaired test), so its figure is a **level across tapes** rather than
 * a ratio within one — the share *is* the quantity, measured at **3.54%–15.19%
 * of consolidated volume running inversely with liquidity**. Story 5.6's Gate 1
 * corollary is that the scored form must therefore be a **percentile and never
 * the `4.1×` multiple**, and a percentile of a single venue's own history is a
 * weaker statement about *the market's* volume than the price percentile is
 * about *the market's* price.
 *
 * **Reversal trigger, a condition:** the first measurement of the relative
 * discriminating power of two factors over the same securities — a
 * cross-sectional comparison of how often each ranks a security the other does
 * not — at which point the weights come from that measurement rather than from
 * this argument.
 */
export const FACTOR_WEIGHTS: Readonly<Record<CompositeFactor, number>> = {
  price: 40,
  excess: 35,
  volume: 25,
};

/**
 * **The band floors, DERIVED from a measured distribution** (Task 5.6.3).
 *
 * `anomaly.ts` has omitted these since Story 1.4 on the recorded grounds that
 * *"inventing thresholds now would be a number that outlives the guess that
 * produced it"*. They are not a guess. Each is a **measured quantile** of this
 * product's own score distribution, taken over the local store on 2026-10-22:
 * **34,318 two-factor scores** — every S&P-500 constituent with both baselines,
 * at every one of the **77 five-minute grid pairs** of the 2026-09-11 session,
 * ranked against the 60-session generations `pnpm baselines` wrote.
 *
 * | floor | measured quantile | value |
 * | --- | --- | --- |
 * | `elevated` | p50 | **32** |
 * | `high` | p90 | **63** |
 * | `extreme` | p99 | **73** |
 *
 * ## The owner's decision 2 is what SELECTS those three quantiles
 *
 * Gate 1 decision 2: *band boundaries on the **raw** score, with `extreme`
 * above what a reduced-factor score can reach*, so less evidence means less
 * claim. The rejected alternative — boundaries on `score ÷ max` — is
 * **renormalisation arriving at the band layer instead of the arithmetic
 * layer**, and is a violation of AC 3 rather than an option.
 *
 * On the raw scale a single-factor score reaches at most **40** (price alone;
 * the excess move alone reaches 35). So the decision is the inequality
 *
 * ```
 * elevated ≤ 40 < high
 * ```
 *
 * — graduated rather than absolute, because *less claim* is not *no claim*: a
 * price-only score may say `elevated` and may never say `high` or `extreme`.
 * That inequality is what chose **p50 over p75**: the measured p75 is **49**,
 * above 40, and would make **every** reduced-factor score `normal` for ever —
 * a band that says *ordinary* about a security at the 99th percentile of its
 * own history. A price-only score needs the **79th** percentile to read
 * `elevated` under the shipped floors — `round(40 × 79 / 100) = round(31.6) =
 * 32` against `round(40 × 78 / 100) = 31` — which is the graduation stated as
 * an ordinal, and is a **golden-sample row** rather than an arithmetic nobody
 * re-ran.
 *
 * ## What the floors draw, measured rather than projected
 *
 * Per instant, over the **484** securities scored at a median anchor of that
 * session: `normal` **219.2**, `elevated` **179.4**, `high` **39.3**,
 * `extreme` **7.74** — so 8.1% of the universe reads `high` and 1.6% reads
 * `extreme` at a random instant.
 *
 * ## AC 1's coupling to `UNUSUAL_ROWS`, checked rather than assumed
 *
 * The region holds **ten rows and cannot grow** (`percentile-ranking.ts`'
 * `UNUSUAL_ROWS`, and its own note that twelve overflows by 21 px and drags
 * three other regions). Measured across the top ten of each instant under these
 * floors: **7.2 `high`, 2.6 `extreme`, 0.2 `elevated`, 0.0 `normal`** — two
 * bands typically drawn, three occasionally, and never a `normal` row. A reader
 * meeting that list meets a ladder rather than ten identical chips.
 *
 * ## The reversal trigger, and Story 5.6's own wording is ALREADY MET
 *
 * The story's condition is *"the first session in which more than three of
 * `/`'s ten rows draw the same band"*. **Measured: 77 of 77 instants, under
 * every one of six candidate floor sets, and all ten rows share one band in 35
 * of 77.** It is not a signal, it is arithmetic: ten rows selected as *the ten
 * most unusual* are drawn from the extreme top of the distribution, so they
 * concentrate in the top bands **by construction** — that is the ranking
 * working, not the bands failing. The condition is recorded as corrected rather
 * than deleted, because it was the owner's and the correction is a
 * measurement.
 *
 * **Two conditions replace it, and the first is the one that will fire.**
 *
 * 1. **The first score computed over a factor set this derivation did not
 *    measure** — in practice the first session in which the volume factor
 *    contributes. Every quantile above was taken over **two** factors with a
 *    maximum of 75; a three-factor score has a maximum of 100 and a
 *    distribution shifted up by roughly a third, and these floors would then be
 *    describing a scale that no longer exists.
 * 2. **The first session whose median instant draws `extreme` for more than a
 *    fifth of the scored universe.** The median instant draws **1.6%** today,
 *    so there is a 12× margin; at a fifth the top band has stopped being a
 *    statement about a tail.
 *
 * ## One finding that is NOT a defect in these floors and must not be read as
 * ## one
 *
 * `PRODUCT_SPEC.md` §11's *"a quiet day produces no high scores and the product
 * says so"* is **false of any composite whose factors are percentiles of each
 * security's own history**, and this measurement is the demonstration: a
 * percentile is uniform on its own sample **by construction**, so ~1% of
 * securities sit at their own 99th at every instant of every session, quiet or
 * not. The only thing that would make a quiet day quiet in the cross-section is
 * a cross-sectional reference, which §11's decision 5 refused in terms
 * (*absolutely calibrated against each security's own history*). The two
 * sentences cannot both hold. Routed rather than repaired: it is a product
 * claim, recorded in this task's record for the owner.
 */
export const ANOMALY_BAND_FLOORS: Readonly<
  Record<Exclude<AnomalyBand, "normal">, number>
> = {
  elevated: 32,
  high: 63,
  extreme: 73,
};

/**
 * **The band a raw score falls in.** `normal` is the floor-less arm, so the
 * four bands **tile** `0`–`100` with no gap and no overlap — asserted
 * exhaustively over every integer in that range rather than argued.
 */
export function bandOf(score: number): AnomalyBand {
  if (score >= ANOMALY_BAND_FLOORS.extreme) return "extreme";
  if (score >= ANOMALY_BAND_FLOORS.high) return "high";
  if (score >= ANOMALY_BAND_FLOORS.elevated) return "elevated";
  return "normal";
}

/**
 * **Why a factor has no figure.** The shipped vocabularies, by reference rather
 * than by copy: a word added to any of the three is a compile error at the call
 * site that builds the answer, not a sentence this module cannot carry.
 */
export type FactorRefusal =
  PercentileRefusal | ExcessFactorRefusal | VolumeRefusal;

/**
 * **Every word {@link FactorRefusal} can hold, as a VALUE — derived from the
 * three vocabularies and never a fourth copy of them** (Task 5.6.6).
 *
 * The type above is a union of three closed lists that each live beside the
 * producer that owns them. What had no runtime form was the **union**, and
 * `0017_session_composite_scores.sql` needs one: a stored factor answer carries
 * its refusal word, and `README.md` §1's rule is that a closed set of values is
 * `text` with a `check` constraint — *"the database's backstop against a writer
 * that bypassed it"*. A hand-written list in the migration would be a fourth
 * home for three vocabularies, so the migration's constraint is asserted
 * against **this** array by `session-composite-scores.database.test.ts`, which
 * is `market-bars.database.test.ts`' arrangement for `PROVIDER_IDS` and
 * `MARKET_FEEDS`.
 *
 * **Deduplicated, because the three lists overlap** — `split-discontinuity` is
 * in two of them and `too-few-samples` in two — and the insertion order is
 * `PercentileRefusal`, then the excess's, then the volume's, so the array is
 * deterministic and a `check` written from it is stable across runs.
 *
 * ## It does NOT narrow what a reader accepts, deliberately
 *
 * {@link readAnomalyScore} validates that a refusal is a non-empty string and
 * **not** that it is a member of this list, on `readReturnPercentile`'s own
 * recorded grounds: *a vocabulary member a newer gateway knows and this bundle
 * does not would otherwise refuse a frame the producer is being honest in.*
 * The database is the opposite boundary — our own nightly writer, where a word
 * nobody has migrated for should be a loud refusal rather than a stored string
 * no reader has a sentence for — so the two disagree on purpose.
 */
export const COMPOSITE_FACTOR_REFUSALS: readonly FactorRefusal[] = [
  ...new Set<FactorRefusal>([
    ...PERCENTILE_REFUSALS,
    ...EXCESS_FACTOR_REFUSALS,
    ...VOLUME_REFUSALS,
  ]),
];

/**
 * **Why a factor's question does not arise** — the composite's own
 * inapplicability type, by reference to each factor's vocabulary exactly as
 * {@link FactorRefusal} is.
 *
 * ## It was `ExcessMoveInapplicability` until 2026-10-23, and that was a latent
 * ## defect rather than a shorthand
 *
 * One factor's vocabulary was standing as the **composite's** type, so a word
 * the excess factor happens to own — `no-sector` — was the only thing any
 * factor could ever be inapplicable *for*. The price factor can never be
 * inapplicable for `no-sector`: it has no reference and no sector, so the
 * question *does this security have a benchmark* does not arise for it at all.
 * A second factor acquiring its own inapplicability would have had to either
 * widen the excess move's list — putting a word in a vocabulary whose own
 * docblock says what it is for — or cast.
 *
 * **One member type today**, and that is the point of the shape rather than an
 * argument against it: a vocabulary added to any factor is a **compile error**
 * at the builder that constructs the answer, which is what
 * {@link FactorRefusal}'s union buys three times over.
 */
export type FactorInapplicability = ExcessMoveInapplicability;

/**
 * **One factor's answer, in four arms that differ in SHAPE.**
 *
 * **Three until 2026-10-23**; the fourth is Task 5.6.4's, is payload-free, and
 * carries its own argument at the arm.
 *
 * `ExcessMoveFactor`'s mechanism (Task 5.6.2) lifted into the shared package:
 * the discriminant is a word and the arms carry **different members**, so a
 * surface cannot read a rank off a refusal or print *unavailable* for a
 * question that does not arise. `scoreAnomaly` narrows and there is no member
 * to read on the wrong arm.
 *
 * ## There is no `no-data` arm, and that is a correction rather than an
 * ## omission
 *
 * Task 5.6.3's brief asks for *no data* and *refused* to differ in shape. The
 * shipped factor vocabulary **already decided that they do not**, deliberately:
 * `return-baseline.ts` folds *we hold no distribution at all* into
 * `too-few-samples` with a counted `sampleCount` of `0`, on the recorded
 * grounds that *"`0 of 2,500 returns` is a true statement about a cold replica
 * and a second sentence for it would be a second sentence saying the same
 * thing"*, and `excess-move-factor.ts` repeats the argument for the excess.
 * A fourth arm here would be a **second vocabulary** for one fact — which is
 * the collision `ANOMALY_BANDS`' own header exists to prevent. The two arms
 * that do differ in shape are the two the product actually distinguishes:
 * **`refused`** (*we will not answer*) and **`inapplicable`** (*the question
 * does not arise*).
 *
 * **The fourth arm added on 2026-10-23 is not that argument reversed.**
 * `no-distribution` is neither *no data* nor *refused*: the factor **has** its
 * figure and what is missing is the **history to rank it against**, which is a
 * fact about this product's stored aggregates rather than about this security's
 * coverage. See the arm.
 */
export type FactorAnswer =
  | {
      readonly state: "ranked";
      /** The integer ordinal, `0`–`99`. Never `100` — see {@link unitOf}. */
      readonly rank: number;
      /** The magnitude is strictly above every sample in the baseline. */
      readonly aboveSample: boolean;
      /** The counted `n`, never a constant. */
      readonly sampleCount: number;
    }
  | {
      readonly state: "refused";
      readonly refusal: FactorRefusal;
      readonly sampleCount: number;
      readonly minimumSampleCount: number;
    }
  | {
      readonly state: "inapplicable";
      readonly because: FactorInapplicability;
    }
  | {
      /**
       * **The factor produced a figure and there is nothing to rank it
       * against** — the fourth arm, PAYLOAD-FREE (Task 5.6.4, the owner's
       * decision).
       *
       * ## Why it is not `refused`
       *
       * That arm carries `sampleCount` **and** `minimumSampleCount`, and
       * {@link readAnomalyScore}'s reader refuses `minimumSampleCount === 0` —
       * so *there is no bound at all* is literally not encodable on it, and
       * writing a `0` or a `2500` would be two invented figures in a module
       * `no-imputed-zero-in-a-figure` covers. The volume factor's own bound is
       * a **function** of a per-bucket measured dispersion
       * (`TARGET_RELATIVE_STANDARD_ERROR`) rather than a count, so there is no
       * number to put there even in principle.
       *
       * ## Why it is not `inapplicable`
       *
       * That word's charter is *no waiting, backfilling or repairing will ever
       * produce a figure* (`excess-move.ts`' own argument for choosing it over
       * four others). A nightly pass that stored a **distribution** of this
       * factor's quantity **would** produce this one, so a reader told
       * *inapplicable* would be told something false about the future.
       *
       * ## Why it carries nothing
       *
       * An arm carrying a word would be byte-identical in shape to
       * `inapplicable`, which negates the property the three arms above are
       * built on: they differ in **shape** rather than in a nullable word. And
       * there is no per-security sentence to carry, because **the fact is not
       * about the security** — no security in the universe has a distribution
       * of this factor's quantity, so a figure beside it would describe the
       * product rather than the subject. The factor's own drawn figure has one
       * home already, on the `return` frame's `volume` half; this arm must not
       * grow a second.
       *
       * **What a reader meets, corrected 2026-10-23 at Task 5.6.5's close,
       * because the sentence above this correction claimed a drawing that does
       * not exist.** This docblock said the owner's sentence
       * `Measured, but no history to rank it against.` *"is drawn by Task 5.6.5
       * and spelled in exactly one place there"*. **It is drawn nowhere.** The
       * ledger's reason cell measures ~34 characters at the rail's narrowest box
       * and that sentence is 43, so Task 5.6.5 drew `no history to rank it` (21)
       * instead — correct for the cell, and not the sentence this claimed.
       *
       * A claim about a mechanism reads identically whether the mechanism is
       * there or not, which is this repository's most-recorded failure mode, so
       * the claim is corrected here rather than left to be discovered by
       * somebody going to use it.
       *
       * **What is true:** `no history to rank it` is the drawn reason and has
       * one home in `apps/frontend/src/market/anomaly-score.ts`. **What is
       * owed:** the owner's full sentence has no home, and the honest one is the
       * volume band beside a *drawn* multiple — the only place a reader can ask
       * why a figure they can see is not scored. That state needs `iex` depth no
       * machine here has, so it is owed to Gate 2 as a product question rather
       * than guessed at.
       *
       * ## Reversal trigger, a condition
       *
       * **The first nightly pass that stores a distribution — breakpoints, not
       * a median and a dispersion — of a factor's own quantity for a factor
       * currently using this arm.** At that point the arm is **deleted** rather
       * than re-purposed, because the factor becomes `ranked` like the other
       * two; and {@link ANOMALY_BAND_FLOORS}' own trigger 1 — *the first score
       * computed over a factor set this derivation did not measure* — fires in
       * the **same commit**, because that is the day the scale stops being
       * max-75. The two are one condition seen from two sides and must be
       * acted on together.
       */
      readonly state: "no-distribution";
    };

/**
 * **{@link FactorAnswer}'s four arms, as a VALUE** (Task 5.6.6) — the
 * discriminant spelled once so a stored row can carry it and a `check`
 * constraint can bound it.
 *
 * The arms differ in **shape**, which is the whole mechanism above, and a
 * stored row cannot: `0017_session_composite_scores.sql` holds one column group
 * per factor, so the shape is expressed as a check that each arm's members are
 * present exactly when its state is. That check needs the state's vocabulary,
 * and `FACTOR_ANSWER_STATES_COVER_THE_ARMS` is what stops this list and the
 * union drifting apart — a fifth arm is a compile error here rather than a
 * state the database silently refuses on the first night it is written.
 */
export const FACTOR_ANSWER_STATES = [
  "ranked",
  "refused",
  "inapplicable",
  "no-distribution",
] as const;

/** One of {@link FACTOR_ANSWER_STATES}. */
export type FactorAnswerState = (typeof FACTOR_ANSWER_STATES)[number];

/**
 * Every arm of {@link FactorAnswer} has a word in {@link FACTOR_ANSWER_STATES}.
 * **A type-level assertion rather than a test** — `BandFloorsCoverTheBands`'
 * mechanism, which is the only thing that cannot be forgotten.
 */
export type FactorAnswerStatesCoverTheArms =
  FactorAnswer["state"] extends FactorAnswerState ? true : never;

/** Satisfied only while the assertion above holds. */
export const FACTOR_ANSWER_STATES_COVER_THE_ARMS: FactorAnswerStatesCoverTheArms = true;

/**
 * **A real symbol rather than a `declare const`, and the difference is load-
 * bearing.**
 *
 * `ticker.ts` declares its brand and never writes the key, which works because
 * a `Ticker` is a `string` that a predicate narrows. A branded **object** has
 * to be *constructed*, and a `declare`d symbol has no runtime value — so
 * `[brand]: factor` would be a `ReferenceError` and the only way to mint would
 * be `as unknown as`, which is a type assertion that **checks none of the
 * fields beside it**. Produced rather than reasoned about: the first draft of
 * this module used the casts, built clean, and every one of its 43 tests failed
 * with `brand is not defined` once the key was written.
 *
 * With a real symbol the mint is an ordinary **checked** object construction —
 * a missing or mistyped field is a compile error naming it — and the brand is
 * still unforgeable outside this module, because the symbol is not exported.
 * The runtime cost is one symbol-keyed property per clause, and
 * `JSON.stringify` drops symbol keys, so nothing about the wire changes.
 */
const brand = Symbol("composite-score");

/** What a contributing clause says, before the brand. */
interface ClauseFacts {
  readonly factor: CompositeFactor;
  /** The factor's own maximum in score points — {@link FACTOR_WEIGHTS}. */
  readonly weight: number;
  /**
   * **The drawn figure and the unit value, in one field.** See
   * {@link unitOf}: there is no second copy of this number to disagree with
   * the first, which is what makes `contribution = round(weight × rank / 100)`
   * checkable from the clause alone.
   */
  readonly rank: number;
  readonly aboveSample: boolean;
  readonly sampleCount: number;
  /** `round(weight × rank / 100)`, in score points. `0 ≤ c ≤ weight`. */
  readonly contribution: number;
}

/**
 * **One factor's clause, branded per factor**, so a clause minted for the price
 * factor cannot be handed to the volume factor's slot and
 * `{ factor: "volume", contribution: 3.8 }` is a type error. Mintable only in
 * this module — the brand is `declare`d and not exported.
 */
export type FactorClause<F extends CompositeFactor = CompositeFactor> =
  ClauseFacts & {
    readonly factor: F;
    readonly [brand]: F;
  };

/** What an absent clause says, before the brand. */
interface AbsentFacts {
  readonly factor: CompositeFactor;
  /**
   * **The weight the score did NOT get**, carried because it is the difference
   * between {@link AnomalyScore.max} and 100 and a reader is owed the size of
   * what is missing rather than only its name.
   */
  readonly weight: number;
}

/**
 * **A factor that produced no figure** — two arms, and they differ in shape
 * rather than in a nullable word. See {@link FactorAnswer}.
 */
export type AbsentClause<F extends CompositeFactor = CompositeFactor> =
  AbsentFacts & { readonly factor: F; readonly [brand]: F } & (
      | {
          readonly state: "refused";
          readonly refusal: FactorRefusal;
          readonly sampleCount: number;
          readonly minimumSampleCount: number;
        }
      | {
          readonly state: "inapplicable";
          readonly because: FactorInapplicability;
        }
      /**
       * **A figure with no distribution behind it** — the payload-free arm; see
       * {@link FactorAnswer}. It carries the factor and the weight the score
       * did not get, which every absent clause carries, and nothing else.
       */
      | { readonly state: "no-distribution" }
    );

/**
 * **The score and its explanation, which are one value rather than two.**
 *
 * {@link contributing} is `[T, ...T[]]`, so **this type cannot be constructed
 * with no contributing factor** — AC 5's *cannot be constructed without its
 * explanation*, as a compile error rather than a test. A security whose every
 * factor refused is {@link UnscoredAnomaly}, which is a different type with no
 * `score` member at all.
 */
export interface AnomalyScore {
  readonly scored: true;
  /** `Σ_{i∈P} round(w_i × u_i / 100)` — the sum of the clauses' own figures. */
  readonly score: number;
  /** {@link bandOf} of {@link score}, on the raw scale. */
  readonly band: AnomalyBand;
  /** `Σ_{i∈P} w_i` — the most this factor set could have produced. */
  readonly max: number;
  readonly contributing: readonly [FactorClause, ...FactorClause[]];
  readonly absent: readonly AbsentClause[];
  readonly [brand]: "AnomalyScore";
}

/**
 * **Every factor refused, so there is no score** — and there is no `score`
 * member to read, which is `BaselineComparison`'s mechanism (Task 5.3.4): a
 * constant and a branch would satisfy the words and leave the defect one `if`
 * away.
 *
 * It is this product's permanent state on CI — 516 securities, zero bars and no
 * baseline generation — and on every store with no provider.
 */
export interface UnscoredAnomaly {
  readonly scored: false;
  /** Every factor, each with its own reason. Never empty. */
  readonly absent: readonly [AbsentClause, ...AbsentClause[]];
  readonly [brand]: "UnscoredAnomaly";
}

/** A score, or the reason there is not one. */
export type AnomalyOutcome = AnomalyScore | UnscoredAnomaly;

/**
 * **The unit value a ranked factor maps to: the ordinal itself.**
 *
 * `rank` is an integer `0`–`99` and **never 100** — `WireReturnPercentile.rank`
 * carries the argument: above the highest order statistic there is no sample,
 * so `100th` asserts a strict maximum over a distribution that excludes the
 * very window being scored.
 *
 * ## Three mappings, and two of them are refused for stated reasons
 *
 * - **`u = rank`** — shipped. The unit value **is the drawn figure**, so the
 *   multiplication in the explanation is checkable from the screen: `99` beside
 *   `40 of 40`, with `round(40 × 99 / 100) = round(39.6) = 40`. The full weight
 *   is reachable, so no contribution is structurally short of its own maximum.
 * - **`u = rank + 1`** — refused, and it is the exact defect Story 5.3 found
 *   that **only the golden sample caught**: properties and an independent
 *   recompute that share the mapping are both blind to an off-by-one in it.
 *   A golden row for `rank = 0` pins it here (`0 → 0`, not `0 → 0.4`).
 * - **`u = rank × 100 / 99`** — refused. It would make the full weight
 *   reachable at `rank = 99` too, and it puts a number on the wire that is
 *   **not** the figure beside it, which forfeits checkability 5 for nothing.
 *
 * **`aboveSample` does not raise the unit**, and that is deliberate: it is the
 * stronger claim *the baseline has nothing to compare with at all*, and a unit
 * above 99 would be a 100 the sample cannot support. The flag travels in the
 * clause so the explanation can draw `>99th`.
 */
function unitOf(answer: Extract<FactorAnswer, { state: "ranked" }>): number {
  return answer.rank;
}

/**
 * **One contribution, and the only place the multiplication happens.**
 *
 * `round(w × u / 100)`. `0 ≤ c ≤ w` by construction for `u ∈ [0, 100]`, with no
 * clamp — a clamp would hide a wrong unit rather than refuse it.
 */
function contributionOf(weight: number, unit: number): number {
  return Math.round((weight * unit) / 100);
}

/**
 * **The scorer. Pure, total, and the first of exactly two mint sites.**
 *
 * One argument — every factor's answer — and no ambient anything. The
 * iteration order is {@link COMPOSITE_FACTORS}, so the explanation's clause
 * order is a declared constant rather than an object's key order, and the same
 * answers produce a byte-identical score in every process for ever (AC 12).
 *
 * **Every factor produces exactly one clause**, contributing or absent, so
 * `contributing.length + absent.length === COMPOSITE_FACTORS.length` always —
 * explanation totality, which is a property rather than a comment.
 *
 * **Nothing here reads a slot that does not exist.** An absent factor has no
 * `rank` member on its arm, so there is no `?? 0` to write and no default to
 * reach for: the narrowing is the only way to a unit value. `docs/GAPS.md`'s
 * `?? 0` entry is half-closed by `no-imputed-zero-in-a-figure` in
 * `pnpm invariants`, which this module is inside the corpus of.
 */
export function scoreAnomaly(
  answers: Readonly<Record<CompositeFactor, FactorAnswer>>,
): AnomalyOutcome {
  const contributing: FactorClause[] = [];
  const absent: AbsentClause[] = [];

  for (const factor of COMPOSITE_FACTORS) {
    const answer = answers[factor];
    const weight = FACTOR_WEIGHTS[factor];

    if (answer.state === "ranked") {
      const rank = unitOf(answer);
      contributing.push({
        factor,
        weight,
        rank,
        aboveSample: answer.aboveSample,
        sampleCount: answer.sampleCount,
        contribution: contributionOf(weight, rank),
        // **The mint.** `brand` is in scope only in this module, so this is a
        // checked object construction rather than a type assertion — every
        // field is validated by the compiler, which a cast would have skipped.
        [brand]: factor,
      });
      continue;
    }

    if (answer.state === "refused") {
      absent.push({
        factor,
        weight,
        state: "refused",
        refusal: answer.refusal,
        sampleCount: answer.sampleCount,
        minimumSampleCount: answer.minimumSampleCount,
        [brand]: factor,
      });
      continue;
    }

    if (answer.state === "no-distribution") {
      // **Nothing beside the state.** See the arm: a figure here would be
      // about the product rather than about this security, and the factor's
      // own drawn figure has one home on the `return` frame already.
      absent.push({
        factor,
        weight,
        state: "no-distribution",
        [brand]: factor,
      });
      continue;
    }

    absent.push({
      factor,
      weight,
      state: "inapplicable",
      because: answer.because,
      [brand]: factor,
    });
  }

  const head = contributing[0];
  if (head === undefined) {
    // **Every factor refused.** `absent` holds one clause per factor and
    // `COMPOSITE_FACTORS` is non-empty, so the tuple's own non-emptiness is
    // true by construction here.
    const [first, ...rest] = absent;
    if (first === undefined) {
      // Unreachable while `COMPOSITE_FACTORS` is non-empty, and it is a `throw`
      // rather than a fallback for `volume-baseline.ts`' recorded reason: AC 8's
      // *no `?? 0`* is at its strongest where the absent value would be
      // structurally impossible, because a default there is a number nobody can
      // trace.
      throw new RangeError(
        "scoreAnomaly produced neither a contributing nor an absent clause, " +
          "which requires COMPOSITE_FACTORS to be empty.",
      );
    }
    return {
      scored: false,
      absent: [first, ...rest],
      [brand]: "UnscoredAnomaly",
    };
  }

  // **The sum of the ROUNDED contributions, and the score IS this sum.** See
  // the header: a score computed from unrounded values can be ±1 from the
  // addition a reader performs on the screen, and an addition that fails on
  // correct code is not an interpretable score.
  let score = 0;
  for (const clause of contributing) score += clause.contribution;

  let max = 0;
  for (const clause of contributing) max += clause.weight;

  return {
    scored: true,
    score,
    band: bandOf(score),
    max,
    contributing: [head, ...contributing.slice(1)],
    absent,
    [brand]: "AnomalyScore",
  };
}

/**
 * **The score as it crosses a socket — a SECOND type, not the same one.**
 *
 * See the header: a `WireFields<AnomalyScore>` map would require an entry for
 * the brand's symbol key, the entry would typecheck, and `toWire`'s
 * `Object.keys` walk would never read it. Two types and a named mapper is the
 * only shape where that cannot happen.
 */
export interface WireAnomalyScore {
  readonly scored: true;
  readonly score: number;
  readonly band: AnomalyBand;
  readonly max: number;
  readonly contributing: readonly WireFactorClause[];
  readonly absent: readonly WireAbsentClause[];
}

/** One contributing clause on the wire. {@link FactorClause} without the brand. */
export interface WireFactorClause {
  readonly factor: CompositeFactor;
  readonly weight: number;
  readonly rank: number;
  readonly aboveSample: boolean;
  readonly sampleCount: number;
  readonly contribution: number;
}

/** One absent clause on the wire. {@link AbsentClause} without the brand. */
export type WireAbsentClause =
  | {
      readonly factor: CompositeFactor;
      readonly weight: number;
      readonly state: "refused";
      readonly refusal: FactorRefusal;
      readonly sampleCount: number;
      readonly minimumSampleCount: number;
    }
  | {
      readonly factor: CompositeFactor;
      readonly weight: number;
      readonly state: "inapplicable";
      readonly because: FactorInapplicability;
    }
  | {
      readonly factor: CompositeFactor;
      readonly weight: number;
      readonly state: "no-distribution";
    };

/** No score on the wire. {@link UnscoredAnomaly} without the brand. */
export interface WireUnscoredAnomaly {
  readonly scored: false;
  readonly absent: readonly WireAbsentClause[];
}

/** A score on the wire, or the reason there is not one. */
export type WireAnomalyOutcome = WireAnomalyScore | WireUnscoredAnomaly;

/** One absent clause, field by field. Never a spread. */
function absentToWire(clause: AbsentClause): WireAbsentClause {
  if (clause.state === "refused") {
    return {
      factor: clause.factor,
      weight: clause.weight,
      state: "refused",
      refusal: clause.refusal,
      sampleCount: clause.sampleCount,
      minimumSampleCount: clause.minimumSampleCount,
    };
  }

  if (clause.state === "no-distribution") {
    return {
      factor: clause.factor,
      weight: clause.weight,
      state: "no-distribution",
    };
  }

  return {
    factor: clause.factor,
    weight: clause.weight,
    state: "inapplicable",
    because: clause.because,
  };
}

/**
 * **The named mapper, field by field, never a spread** — ADR 0031's reason, met
 * at a type the serialiser's own mechanism cannot protect. A spread would carry
 * the brand's symbol key onto the wire object, where `JSON.stringify` drops it
 * silently and the next reader's `toWire` map goes on looking complete.
 */
export function toWireAnomalyScore(
  outcome: AnomalyOutcome,
): WireAnomalyOutcome {
  if (!outcome.scored) {
    return { scored: false, absent: outcome.absent.map(absentToWire) };
  }

  return {
    scored: true,
    score: outcome.score,
    band: outcome.band,
    max: outcome.max,
    contributing: outcome.contributing.map((clause) => ({
      factor: clause.factor,
      weight: clause.weight,
      rank: clause.rank,
      aboveSample: clause.aboveSample,
      sampleCount: clause.sampleCount,
      contribution: clause.contribution,
    })),
    absent: outcome.absent.map(absentToWire),
  };
}

/**
 * **One factor's answer, read back from somewhere it was STORED** (Task 5.6.6)
 * — the third reader in this module and the only one whose input is not a wire
 * body.
 *
 * ## Why it is here and not in the store that calls it
 *
 * Because the rule it applies is this module's: *which members does each arm
 * require, and where is `0` a legal sample*. `readFactorClause` and
 * `readAbsentClause` already answer that for a frame — `0` is legal on a
 * refusal and nowhere else, a bound of `0` is not a bound, a rank above `99`
 * is not a rank — and a nightly pass's reader re-expressing it beside a
 * `select` would be **a second home for the arms' own shape**, in a module that
 * cannot see the type's docblocks.
 *
 * It also keeps one thing true that a check holds by counting:
 * `no-distribution` is **constructed in exactly two places in this product**,
 * its declaring module and the volume factor's builder, and
 * `one-site-builds-the-no-distribution-arm` is red on a third. A store
 * decoding its own stored rows would be that third site, and the arm is
 * payload-free — so nothing in it would say the construction was a round-trip
 * rather than a claim.
 *
 * ## What it does NOT validate, and that is `readAbsentClause`'s own rule
 *
 * The **refusal word** and the **inapplicability word** are checked to be
 * non-empty strings and not against a list, for that function's recorded
 * reason: a vocabulary member a newer producer knows and this bundle does not
 * would otherwise delete a row rather than draw it. The database is the
 * opposite boundary and holds the list — `0017` §6 — because there the writer
 * is ours.
 *
 * Every numeric member must already **be** a number. A `bigint` column reaches
 * JavaScript as a `string` (`migrations/README.md` §4) and converting it is the
 * caller's decision, taken beside its own query; this function refuses a string
 * rather than coercing one, because a coercion here would be the one place
 * `"1e400"` becomes `Infinity` with nothing saying so.
 */
export function readFactorAnswer(value: unknown): FactorAnswer | undefined {
  if (!isRecord(value)) return undefined;

  if (value.state === "ranked") {
    // **A rank is `0`–`99` and never `100`** — above the highest order
    // statistic there is no sample — and **`0` is not a legal sample on a
    // ranked factor**: an ordinal taken against an empty distribution is not
    // an ordinal. `readFactorClause`'s identical pair.
    if (!count(value.rank) || value.rank > 99) return undefined;
    if (typeof value.aboveSample !== "boolean") return undefined;
    if (!count(value.sampleCount) || value.sampleCount === 0) return undefined;

    return {
      state: "ranked",
      rank: value.rank,
      aboveSample: value.aboveSample,
      sampleCount: value.sampleCount,
    };
  }

  if (value.state === "refused") {
    // **`0` IS a legal sample here and nowhere else** — `0 of 2,500` is a cold
    // replica's own true sentence — and a bound of `0` is not a bound.
    // `readAbsentClause`'s identical pair.
    if (typeof value.refusal !== "string" || value.refusal === "") {
      return undefined;
    }
    if (!count(value.sampleCount)) return undefined;
    if (!count(value.minimumSampleCount) || value.minimumSampleCount === 0) {
      return undefined;
    }

    return {
      state: "refused",
      refusal: value.refusal as FactorRefusal,
      sampleCount: value.sampleCount,
      minimumSampleCount: value.minimumSampleCount,
    };
  }

  if (value.state === "inapplicable") {
    if (typeof value.because !== "string" || value.because === "") {
      return undefined;
    }
    return {
      state: "inapplicable",
      because: value.because as FactorInapplicability,
    };
  }

  if (value.state === "no-distribution") {
    // **Nothing to read beyond the word**, which is the arm's whole shape: an
    // answer with a payload here would be a second answer to a question the
    // `return` frame's `volume` half already answers.
    return { state: "no-distribution" };
  }

  return undefined;
}

/** A record, for the reader's own narrowing. `readUnusual`'s `isRecord`. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A finite number. */
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** A count — finite, integral, `≥ 0`. */
const count = (value: unknown): value is number =>
  finite(value) && Number.isInteger(value) && value >= 0;

/** One of the declared factors. */
const isFactor = (value: unknown): value is CompositeFactor =>
  typeof value === "string" &&
  (COMPOSITE_FACTORS as readonly string[]).includes(value);

/** One contributing clause, or `undefined` for anything that is not one. */
function readFactorClause(value: unknown): FactorClause | undefined {
  if (!isRecord(value)) return undefined;
  if (!isFactor(value.factor)) return undefined;

  // **The weight is the PRODUCER'S**, not this bundle's — `spanMinutes`' own
  // reason on the return frame: a rollback can put a gateway and a bundle two
  // weight sets apart, and a reader that substituted its own would re-derive
  // every contribution against numbers the sender never used. It is bounded
  // rather than compared: a weight outside `1`–`100` is not a weight.
  if (!count(value.weight) || value.weight < 1 || value.weight > 100) {
    return undefined;
  }
  if (!count(value.rank) || value.rank > 99) return undefined;
  if (typeof value.aboveSample !== "boolean") return undefined;
  if (!count(value.sampleCount) || value.sampleCount === 0) return undefined;
  if (!count(value.contribution)) return undefined;

  // **The first half of the stronger-than-the-brand claim: every contribution
  // is re-derived from the published weight and the DRAWN figure.** This is
  // AC 5's *every figure in an explanation traces to a named calculation*
  // asserted by arithmetic rather than by reading — and it is exactly the
  // check a brand cannot make, because the brand is about which module minted
  // the value and this is about the value.
  if (value.contribution !== contributionOf(value.weight, value.rank)) {
    return undefined;
  }

  return {
    factor: value.factor,
    weight: value.weight,
    rank: value.rank,
    aboveSample: value.aboveSample,
    sampleCount: value.sampleCount,
    contribution: value.contribution,
    // **The second and last mint site.** See the header: the brand is erased at
    // `JSON.parse`, so re-minting here is what puts a wire-born clause back
    // inside the type — and it is sound only because every field above was
    // checked and the contribution was re-derived from the published weight.
    [brand]: value.factor,
  };
}

/** One absent clause, or `undefined`. */
function readAbsentClause(value: unknown): AbsentClause | undefined {
  if (!isRecord(value)) return undefined;
  if (!isFactor(value.factor)) return undefined;
  if (!count(value.weight) || value.weight < 1 || value.weight > 100) {
    return undefined;
  }

  if (value.state === "no-distribution") {
    // **Nothing to read beyond the word**, which is the arm's whole shape: a
    // clause with a payload here would be a second answer to a question the
    // `return` frame's `volume` half already answers.
    return {
      factor: value.factor,
      weight: value.weight,
      state: "no-distribution",
      [brand]: value.factor,
    };
  }

  if (value.state === "inapplicable") {
    // **The word is not validated against a list, and that is the decoder's
    // own rule one frame over** (`readReturnPercentile`): a vocabulary member
    // a newer gateway knows and this bundle does not would otherwise refuse a
    // frame the producer is being honest in. What is checked is that it is a
    // word at all.
    if (typeof value.because !== "string" || value.because === "") {
      return undefined;
    }
    return {
      factor: value.factor,
      weight: value.weight,
      state: "inapplicable",
      because: value.because as FactorInapplicability,
      [brand]: value.factor,
    };
  }

  if (value.state !== "refused") return undefined;
  if (typeof value.refusal !== "string" || value.refusal === "") {
    return undefined;
  }
  // **`0` is a legal sample on a refusal and nowhere else** — a cold replica,
  // and every gated run. `0 of 2,500` is the sentence it owes.
  if (!count(value.sampleCount)) return undefined;
  if (!count(value.minimumSampleCount) || value.minimumSampleCount === 0) {
    return undefined;
  }

  return {
    factor: value.factor,
    weight: value.weight,
    state: "refused",
    refusal: value.refusal as FactorRefusal,
    sampleCount: value.sampleCount,
    minimumSampleCount: value.minimumSampleCount,
    [brand]: value.factor,
  };
}

/** Every clause names a different factor. A factor twice is two answers. */
function clausesAreDistinct(
  contributing: readonly FactorClause[],
  absent: readonly AbsentClause[],
): boolean {
  const named = [
    ...contributing.map((clause) => clause.factor),
    ...absent.map((clause) => clause.factor),
  ];
  return new Set(named).size === named.length;
}

/**
 * **The score read back off a wire, or `undefined` — and the second of exactly
 * two mint sites.**
 *
 * `readUnusual`'s shape (Task 5.4.3) and its rule: **one unreadable clause
 * refuses the whole explanation**, never a dropped clause, because a score
 * beside a partial account of itself is a figure whose addition no longer
 * reaches it — which is the one thing this type exists to make checkable.
 *
 * ## The five checks, and the third is the point of the function
 *
 * 1. **Every clause is readable**, and each contribution is re-derived from the
 *    published weight and the drawn figure — {@link readFactorClause}.
 * 2. **Every clause names a distinct factor.** A factor twice is two answers
 *    about one thing, and a `Set` size is the only thing that sees it.
 * 3. **The published contributions re-add to the score they were sent beside.**
 *    This is the repair the header calls *stronger than the type claim*: the
 *    brand is erased at `JSON.parse`, so what crosses a wire is checkable only
 *    as a **value**, and `Σ contribution === score` is that check. A producer
 *    broken into inventing a score draws a well-formed, correctly-banded figure
 *    that **no pass-through spec can see** — `CLAUDE.md`'s own note that a
 *    pass-through proves fidelity and never correctness — and this refuses it.
 * 4. **The maximum re-adds too**, `Σ weight === max`, because the label
 *    `2 of 3 · max 75` rests on it and with unequal weights a wrong maximum is
 *    a wrong scale wearing a right number.
 * 5. **The band is this bundle's own** — recomputed from the score rather than
 *    read, because a band is a presentation of a number we now hold and a
 *    disagreement between the two would be a chip contradicting the figure
 *    inside it. A sent band that differs refuses the explanation rather than
 *    being silently replaced: it means the producer's floors are not ours, and
 *    a reader drawing our word over their number is the renormalisation this
 *    story refused arriving as a rollback.
 */
export function readAnomalyScore(value: unknown): AnomalyOutcome | undefined {
  if (!isRecord(value)) return undefined;
  if (!Array.isArray(value.absent)) return undefined;

  const absent: AbsentClause[] = [];
  for (const entry of value.absent) {
    const clause = readAbsentClause(entry);
    if (clause === undefined) return undefined;
    absent.push(clause);
  }

  if (value.scored === false) {
    const head = absent[0];
    if (head === undefined) return undefined;
    if (!clausesAreDistinct([], absent)) return undefined;
    return {
      scored: false,
      absent: [head, ...absent.slice(1)],
      [brand]: "UnscoredAnomaly",
    };
  }

  if (value.scored !== true) return undefined;
  if (!Array.isArray(value.contributing)) return undefined;

  const contributing: FactorClause[] = [];
  for (const entry of value.contributing) {
    const clause = readFactorClause(entry);
    if (clause === undefined) return undefined;
    contributing.push(clause);
  }

  const head = contributing[0];
  if (head === undefined) return undefined;
  if (!clausesAreDistinct(contributing, absent)) return undefined;

  if (!count(value.score)) return undefined;
  if (!count(value.max) || value.max === 0) return undefined;

  let sum = 0;
  for (const clause of contributing) sum += clause.contribution;
  if (sum !== value.score) return undefined;

  let ceiling = 0;
  for (const clause of contributing) ceiling += clause.weight;
  if (ceiling !== value.max) return undefined;

  const band = bandOf(value.score);
  if (value.band !== band) return undefined;

  return {
    scored: true,
    score: value.score,
    band,
    max: value.max,
    contributing: [head, ...contributing.slice(1)],
    absent,
    [brand]: "AnomalyScore",
  };
}

/**
 * Every band word is one of {@link ANOMALY_BANDS}. **A type-level assertion
 * rather than a test**: a floor added for a word that is not a band fails
 * `tsc -b`.
 */
export type BandFloorsCoverTheBands =
  Exclude<AnomalyBand, "normal"> extends keyof typeof ANOMALY_BAND_FLOORS
    ? true
    : never;

/** Satisfied only while the assertion above holds. */
export const BAND_FLOORS_COVER_THE_BANDS: BandFloorsCoverTheBands = true;
