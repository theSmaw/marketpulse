import { SECTOR_ETFS, type Sector, type Security } from "./security.js";
import type { Ticker } from "./ticker.js";

/**
 * **The vocabulary of the excess-move factor, and the one question only the
 * universe can answer: is there a reference at all?** (Task 5.6.2.)
 *
 * The baseline itself is computed in `apps/backend/src/excess-move-baseline.ts`,
 * stored by `0016_excess_move_baselines.sql` and scored in
 * `apps/backend/src/excess-move-factor.ts`. What is here is the part that must
 * not be spelled twice: the words a refusal can carry, and **which fund a
 * security is compared against**, because the browser draws a sentence for the
 * first and the backend scores against the second.
 *
 * `volume-baseline.ts` is the shape copied, for its stated reason: the producer
 * picks a word and the browser prints a sentence for it, so a second
 * vocabulary is a second sentence.
 *
 * ## INAPPLICABLE — a third kind beside *refused* and *absent*, and the word is
 * ## chosen here
 *
 * This product already has two ways for a figure not to exist, and both of
 * them promise that it one day might:
 *
 * - **absent** — no row. *The pass has not reached this security.* Retrying
 *   helps; CI's permanent state is this one.
 * - **refused** — a row, and a reason. *The pass reached it and will not
 *   answer.* `too-few-samples` is a wait, `split-discontinuity` is a repair.
 *
 * A **broad-market fund has no sector** and a **sector ETF is its own
 * benchmark**. Neither is a gap in our data, neither is a judgement about a
 * sample, and **no amount of waiting, backfilling or repairing will ever
 * produce a figure** — the question does not arise. Reporting either as
 * *unavailable* would be the defect `too-few-sessions` against
 * `no-same-tape-baseline` already is one factor over (Story 5.5's hand-off,
 * item 3): a reader told *unavailable* reasonably waits.
 *
 * **The word is `inapplicable`**, and it was chosen over four others for
 * reasons worth writing down once:
 *
 * - *not applicable* / `n-a` — two words and an abbreviation, and `N/A` is the
 *   spreadsheet idiom this product's honest-nothing states exist to avoid;
 * - *unavailable* / *missing* — both say a figure exists somewhere and we do
 *   not have it, which is the false promise above;
 * - *exempt* — says somebody granted an exception, and nobody did;
 * - *undefined* — already means something else in every file here.
 *
 * `inapplicable` is the plain-English antonym of *applies*, it is **unused in
 * this repository**, and it reads correctly in the only sentence it has to
 * survive: `Relative move — does not apply: a broad-market fund has no
 * sector.` The type-level half is that the applicable arm of
 * {@link ExcessMoveReference} is the **only** one carrying a symbol, so a
 * caller cannot score an inapplicable security without a compile error.
 */

/**
 * **Why the question does not arise for this security.** Two members, both
 * properties of the universe rather than of the store, so both are stable for
 * as long as the curated file says what it says.
 *
 * - `no-sector` — an `index_etf` has `sector: null`. **4 of 516** today: the
 *   four market proxies.
 * - `is-benchmark` — a `sector_etf` **is** the fund its own sector is measured
 *   against, so the comparison would be with itself and the excess would be
 *   exactly `0` for ever. **11 of 516** today: the eleven sector SPDRs.
 */
export const EXCESS_MOVE_INAPPLICABILITIES = [
  "no-sector",
  "is-benchmark",
] as const;

/** One of {@link EXCESS_MOVE_INAPPLICABILITIES}. */
export type ExcessMoveInapplicability =
  (typeof EXCESS_MOVE_INAPPLICABILITIES)[number];

/**
 * **Why a security has no stored distribution of `|excess|` — the words the
 * PASS writes, backed by `excess_move_baselines_refusal_known`.**
 *
 * A member added here is a migration, which is `RETURN_BASELINE_REFUSALS`'
 * arrangement one table over.
 *
 * - `split-discontinuity` — the **subject's** own history crosses a
 *   session-boundary jump beyond `SPLIT_DISCONTINUITY_RATIO`. **Read from the
 *   price pass's verdict for the same `(security, window end)` rather than
 *   re-derived**, exactly as the volume baseline reads it: it is the same guard
 *   over the same closes, and a second evaluation is a second answer.
 * - `reference-split-discontinuity` — **the benchmark's** history crosses one.
 *   A separate word rather than a shared one, because the two are different
 *   sentences to a reader of a security page: *this security's history has a
 *   price break we cannot adjust* is about the thing on screen, and
 *   *Technology's benchmark has one* is about something else entirely, refuses
 *   every constituent of that sector at once, and is repaired somewhere else.
 *   Collapsing them would be Story 5.5's hand-off item 3 in a new costume.
 */
export const EXCESS_BASELINE_REFUSALS = [
  "split-discontinuity",
  "reference-split-discontinuity",
] as const;

/** One of {@link EXCESS_BASELINE_REFUSALS}. */
export type ExcessBaselineRefusal = (typeof EXCESS_BASELINE_REFUSALS)[number];

/**
 * **Why there is no excess-move factor — the vocabulary the READER is told.**
 *
 * A **superset** of {@link EXCESS_BASELINE_REFUSALS}, for
 * `PERCENTILE_REFUSALS`' reason: three of these the pass never wrote.
 *
 * - `too-few-samples` — the stored distribution's counted `n` is below
 *   `BASELINE_MINIMUM_SAMPLE`, or there is no row at all. **One word for both**,
 *   because `0 of 2,500 excess moves` is a true sentence about a cold replica
 *   and a second refusal for it would be a second sentence saying it.
 * - `mixed-basis` — the two moves were **measured from different closes**, so
 *   the subtraction is refused. **Inherited rather than re-derived**: the drawn
 *   region has refused exactly this since Story 5.1 and the predicate is
 *   `sharedBasis` over `basisOf`, in `move-basis.ts`, one implementation for
 *   both processes. It is reachable **every day between the overnight
 *   backfill and the next bell**, so it is an ordinary state rather than an
 *   edge.
 * - `no-subject-move` — we hold no move for the security at all: nothing has
 *   been heard from it, or we hold a price with no close to measure it from.
 * - `no-reference-move` — the same, for the benchmark. The subject's own figure
 *   is still true and still drawn; only the difference is withheld.
 */
export const EXCESS_FACTOR_REFUSALS = [
  "split-discontinuity",
  "reference-split-discontinuity",
  "too-few-samples",
  "mixed-basis",
  "no-subject-move",
  "no-reference-move",
] as const;

/** One of {@link EXCESS_FACTOR_REFUSALS}. */
export type ExcessFactorRefusal = (typeof EXCESS_FACTOR_REFUSALS)[number];

/**
 * Every stored refusal is a factor refusal. **A type-level assertion rather
 * than a test** — `PercentileRefusalIsASuperset`'s mechanism, which is the one
 * thing that cannot be forgotten.
 */
export type ExcessFactorRefusalIsASuperset =
  ExcessBaselineRefusal extends ExcessFactorRefusal ? true : never;

/** Satisfied only while the assertion above holds. */
export const EXCESS_FACTOR_REFUSALS_COVER_THE_STORED_ONES: ExcessFactorRefusalIsASuperset = true;

/** What this security's move is measured against, or why nothing is. */
export type ExcessMoveReference =
  | {
      readonly applies: true;
      /**
       * The benchmark's ticker — `SECTOR_ETFS`', never typed here.
       *
       * **The only arm carrying a symbol**, which is what makes an
       * inapplicable security unscoreable rather than scored against nothing.
       */
      readonly symbol: Ticker;
      /** The sector the benchmark stands for. Named, never derived by slug. */
      readonly sector: Sector;
    }
  | {
      readonly applies: false;
      readonly because: ExcessMoveInapplicability;
    };

/**
 * **Which fund this security's move is measured against — the one home for the
 * branch, read by both processes.**
 *
 * ADR 0038 decision 2's precedent: `changeFromClose` went to
 * `packages/shared` because the drawn figure and the scored one must be one
 * implementation. The same argument reaches this branch rather than only the
 * arithmetic — the frontend's `figuresOf` asked it to resolve a **label** and
 * the nightly pass asks it to resolve a **read**, and a second answer would be
 * a security scored against the wrong fund on one surface only.
 *
 * **The branch is on `Security`'s discriminant and not on a nullable column**,
 * which is `security.ts`' own decision: `sector: null` is reachable only on
 * `index_etf`, so there is no fourth case to forget.
 *
 * ## The owner's choice is the cap-weighted ETF, and that is why the key
 * ## records it
 *
 * Story 5.6's AC 9 and Gate 1: the reference is the **capitalisation-weighted
 * sector SPDR** rather than the unweighted industry peer median, with the bias
 * stated on screen (`CAP_WEIGHTED_CLAUSE`, one home, build-enforced). That
 * choice carries a reversal trigger, so `0016`'s key carries the reference —
 * see that migration's §3.
 */
export function excessMoveReference(security: Security): ExcessMoveReference {
  if (security.kind === "index_etf") {
    return { applies: false, because: "no-sector" };
  }

  if (security.kind === "sector_etf") {
    return { applies: false, because: "is-benchmark" };
  }

  return {
    applies: true,
    symbol: SECTOR_ETFS[security.sector],
    sector: security.sector,
  };
}
