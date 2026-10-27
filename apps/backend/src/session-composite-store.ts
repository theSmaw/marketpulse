import { Kysely, PostgresDialect, sql } from "kysely";
import type pg from "pg";

import {
  ANOMALY_BAND_FLOORS,
  FACTOR_WEIGHTS,
  readFactorAnswer,
  scoreAnomaly,
  toTicker,
} from "@marketpulse/shared";

import type {
  AnomalyBand,
  AnomalyOutcome,
  CompositeFactor,
  FactorAnswer,
  FactorAnswerState,
  FactorInapplicability,
  FactorRefusal,
  Ticker,
} from "@marketpulse/shared";
import type { Database } from "./schema.js";
import type { BaselineSubject } from "./return-baseline-store.js";

/**
 * **The stored composite's database half, and the one place that knows there is
 * one** (Task 5.6.6, [ADR 0044](../../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)).
 *
 * `session-percentile-store.ts`' arrangement, fifth instance: **build the
 * `Kysely` instance here, do not export it, export functions that return domain
 * objects.** Both reads below are over `observed_at` — the column Epic 13's
 * plugin rewrites — and `withPlugin` returns a *different object*, so the
 * guarantee is worth nothing if an unplugged handle can be imported.
 *
 * ## Its own module rather than methods on `session-percentile-store.ts`
 *
 * They are written by one pass for one session and share a pool, so the
 * argument is not about coupling. It is about what each module's rows **are**:
 * that one holds a measurement (an ordinal, its `n`, its two endpoints) and this
 * one holds a **policy applied to measurements** — the weights, the floors, and
 * a score that is a function of both. A reader asking *what would change if the
 * weights moved* should find one module whose whole answer is *everything in
 * here*, rather than that question answered halfway down a module about
 * percentiles.
 *
 * ## The pass row is read FIRST, which is the partial-failure answer
 *
 * `session-percentile-store.ts`' arrangement, unchanged and for its reason: the
 * nightly pass writes one score per security as it goes and the pass row at the
 * end, outside a transaction, so a crash leaves scores with no pass row.
 * {@link SessionCompositeStore.readNewestSession} bounds the scores on the
 * **pass row's** `observed_at`, which makes that state invisible rather than
 * half-drawn.
 *
 * ## **THE SCORE IS MINTED HERE, NEVER READ** — and that is the module's point
 *
 * `scoreAnomaly` is the only arithmetic in a composite anywhere in this
 * product: the weights, the `round(w × u / 100)`, the sum, the maximum and the
 * band. This store reads the three **factor answers** off the row and hands
 * them to it, so the outcome a caller gets was minted by the same function the
 * live path's was — which is what makes *the two bases answer the same
 * question* a property rather than a hope.
 *
 * The stored `score`, `band` and `max` are read **as well**, and only to be
 * **disagreed with**: `0017` §5's argument is that storing a minted figure
 * beside the answers it was minted from makes a producer/reader split
 * detectable. A row whose stored figures do not reproduce is **dropped and
 * counted** ({@link StoredCompositeRanking.disagreed}), never drawn — because
 * the two numbers mean two different weight sets or two different floor sets,
 * and a reader picking one would be the renormalisation Story 5.6 refused
 * arriving as a rollback. `readAnomalyScore` applies the identical rule at the
 * wire's end for the identical reason.
 */

/** One stored composite, as the cache and a producer read it. */
export interface StoredCompositeScore {
  readonly symbol: Ticker;
  /**
   * **Minted by `scoreAnomaly` from {@link StoredCompositeScore.answers}**,
   * never read off the row. See the header.
   *
   * It is an {@link AnomalyOutcome} rather than an `AnomalyScore` because the
   * type is the scorer's; in practice every row that survives the mapper is
   * `scored: true`, because `session_composite_scores_one_factor_contributes`
   * refuses a row with no ranked factor and an outcome that came back unscored
   * is counted as a disagreement.
   */
  readonly outcome: AnomalyOutcome;
  /**
   * The three factor answers as the row holds them — the score's **identity**,
   * and what a later reader re-mints from if the policy moves.
   */
  readonly answers: Readonly<Record<CompositeFactor, FactorAnswer>>;
}

/**
 * **What the pass was over, how much of it got a score, and the POLICY it
 * applied** — one session's own figures, read off the row the pass wrote.
 *
 * Every figure here is the **producer's**, never this bundle's constant: see
 * `0014` §5 for the rollback that makes the difference visible, and `0017` §5
 * for why a stored composite is a cache of two policies rather than one
 * measurement.
 */
export interface StoredCompositePass {
  /** The scored session's close. The key, and what dates the figures. */
  readonly observedAt: Date;
  /** `tracked = scored + unscored`, checked in the database. */
  readonly tracked: number;
  readonly scored: number;
  readonly unscored: number;
  /** `FACTOR_WEIGHTS` as the pass applied them. */
  readonly weights: Readonly<Record<CompositeFactor, number>>;
  /** `ANOMALY_BAND_FLOORS` as the pass applied them. */
  readonly floors: Readonly<Record<Exclude<AnomalyBand, "normal">, number>>;
}

/** One session's whole answer: the pass's figures and its scored rows. */
export interface StoredCompositeRanking {
  readonly pass: StoredCompositePass;
  /**
   * The scored securities — **not ranked here**. The order is
   * `compareByScore`'s, applied by the producer, because
   * `one-comparator-for-the-order-of-a-composite-score` permits exactly one
   * home for it and a store that sorted would be the second.
   */
  readonly scores: readonly StoredCompositeScore[];
  /**
   * **How many rows were dropped because the stored figures did not reproduce
   * from the stored answers** — see the header. `0` on every row this
   * product's own pass writes; above `0` means the writer and this bundle
   * disagree about the weights or the floors, which is a rollback rather than a
   * data fault, and the figure is exposed so a test and a log line can see it
   * rather than it being a silently shorter list.
   */
  readonly disagreed: number;
}

/** What the nightly pass writes for one security. */
export interface CompositeScoreWrite {
  /** The outcome `compositeAnomaly` produced. Must be `scored: true`. */
  readonly outcome: AnomalyOutcome;
  /** The answers it was minted from, which is what the row's content is. */
  readonly answers: Readonly<Record<CompositeFactor, FactorAnswer>>;
}

/** What the nightly pass writes once, at the end of a session's pass. */
export type CompositePassWrite = Omit<
  StoredCompositePass,
  "observedAt" | "weights" | "floors"
>;

export interface SessionCompositeStore {
  /**
   * Write one security's composite for one session. **An upsert on
   * `(security_id, observed_at)`**, so re-running `pnpm baselines` for a
   * session already stored converges rather than appending.
   *
   * **It throws on an unscored outcome**, which is `0017` §4 in the one place a
   * type cannot hold it: `AnomalyScore.contributing` is a non-empty tuple, so
   * no score exists without a contributing factor — but `AnomalyOutcome` is the
   * union, and a caller holding one has to be told rather than quietly writing
   * a row the database would refuse with a constraint name instead of a
   * sentence. `writeBaseline`'s own treatment of `none`, one table over.
   */
  writeScore(
    subject: BaselineSubject,
    observedAt: Date,
    score: CompositeScoreWrite,
  ): Promise<void>;

  /**
   * Write the session's own figures and the policy the pass applied. **An
   * upsert on `observed_at`**, written **after** the scores — see the header
   * for what a crash between them leaves and why it is invisible.
   *
   * The weights and the floors are **not** arguments: they are
   * `FACTOR_WEIGHTS` and `ANOMALY_BAND_FLOORS`, read here from the one home
   * each has, because what must be stored is what the **minting** applied and
   * the minting is `scoreAnomaly`'s — which reads those two constants and no
   * others. A parameter would let a caller store a policy the scorer did not
   * use, which is the one failure this column group exists to detect.
   */
  writePass(observedAt: Date, pass: CompositePassWrite): Promise<void>;

  /**
   * **The newest session at or before an instant, with its scores** — or
   * `undefined` where no pass has been written at or before it, which is CI's
   * permanent state and every store's before the first nightly run.
   *
   * It does **not** filter on `securities.status`: this is a read of something
   * we stored, and a security untracked last week still had a score that was
   * true when it was computed (`UNIVERSE.md` §12.2's second side).
   *
   * The bound is an argument rather than a clock, which is `closesAsOf`'s shape
   * and ADR 0015's gap 4: under a replay Epic 13's plugin additionally narrows
   * `observed_at` inside these queries, so this expression answers *the newest
   * session that had already closed* with no second code path.
   */
  readNewestSession(
    atOrBefore: Date,
  ): Promise<StoredCompositeRanking | undefined>;
}

/**
 * **Every factor this module spells a column group for.**
 *
 * The write and the read below name `price`, `excess` and `volume` **in full**
 * rather than looping over `COMPOSITE_FACTORS` with a computed column name, for
 * one reason that is worth the repetition: a template-literal key would make
 * every one of the 21 columns a string the compiler cannot check, so a typo
 * would be a `column "price_rankk" does not exist` on the first night rather
 * than a `TS2322` here.
 *
 * What the spelling costs is exhaustiveness, and this is what buys it back. A
 * fourth member of `COMPOSITE_FACTORS` makes the conditional below `never` and
 * **the constant fails to compile**, naming this module — which is
 * `BAND_FLOORS_COVER_THE_BANDS`' mechanism and the only kind of reminder that
 * cannot be forgotten. `0017` §5 is the same requirement at the schema: a
 * fourth factor is a migration somebody writes.
 */
type WrittenFactor = "price" | "excess" | "volume";

/** Satisfied only while every factor has a column group here. */
export type EveryFactorHasAColumnGroup = CompositeFactor extends WrittenFactor
  ? true
  : never;

/** Satisfied only while the assertion above holds. */
export const EVERY_FACTOR_HAS_A_COLUMN_GROUP: EveryFactorHasAColumnGroup = true;

/**
 * **One factor's answer, as the seven column values it writes.**
 *
 * One branch per arm, with the arm's own members narrowed by the discriminant —
 * so there is no `?? null` and nothing is read off an arm that does not carry
 * it. The `null`s are the **true** answer (*this arm has no such member*)
 * rather than an absent measurement substituted for a present one, which is
 * `no-imputed-zero-in-a-figure`'s distinction.
 */
interface FactorColumnValues {
  readonly state: FactorAnswerState;
  readonly rank: number | null;
  readonly aboveSample: boolean | null;
  readonly sampleCount: number | null;
  readonly refusal: FactorRefusal | null;
  readonly minimumSampleCount: number | null;
  readonly because: FactorInapplicability | null;
}

const EMPTY_ANSWER_COLUMNS = {
  rank: null,
  aboveSample: null,
  sampleCount: null,
  refusal: null,
  minimumSampleCount: null,
  because: null,
} as const;

function columnsOfAnswer(answer: FactorAnswer): FactorColumnValues {
  if (answer.state === "ranked") {
    return {
      ...EMPTY_ANSWER_COLUMNS,
      state: answer.state,
      rank: answer.rank,
      aboveSample: answer.aboveSample,
      sampleCount: answer.sampleCount,
    };
  }

  if (answer.state === "refused") {
    return {
      ...EMPTY_ANSWER_COLUMNS,
      state: answer.state,
      sampleCount: answer.sampleCount,
      refusal: answer.refusal,
      minimumSampleCount: answer.minimumSampleCount,
    };
  }

  if (answer.state === "inapplicable") {
    return {
      ...EMPTY_ANSWER_COLUMNS,
      state: answer.state,
      because: answer.because,
    };
  }

  // **`no-distribution`, which carries nothing at all** — the arm is
  // payload-free on purpose (`FactorAnswer`'s own argument: the fact is about
  // this product's stored aggregates rather than about this security), so every
  // column in the group is `null` and that is the complete truth of it.
  return { ...EMPTY_ANSWER_COLUMNS, state: answer.state };
}

export function createSessionCompositeStore(
  pool: pg.Pool,
): SessionCompositeStore {
  // Not exported, not returned, not reachable. See the header.
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  return {
    async writeScore(subject, observedAt, score) {
      if (!score.outcome.scored) {
        throw new RangeError(
          `${subject.symbol} produced no composite score — every factor was ` +
            "absent — so there is nothing to write. An unscored security is " +
            "recorded by the ABSENCE of a row and counted in " +
            "`session_composite_score_passes.unscored_count`; see " +
            "`0017_session_composite_scores.sql` §4.",
        );
      }

      const price = columnsOfAnswer(score.answers.price);
      const excess = columnsOfAnswer(score.answers.excess);
      const volume = columnsOfAnswer(score.answers.volume);

      const values = {
        score: score.outcome.score,
        band: score.outcome.band,
        max: score.outcome.max,

        price_state: price.state,
        price_rank: price.rank,
        price_above_sample: price.aboveSample,
        price_sample_count: price.sampleCount,
        price_refusal: price.refusal,
        price_minimum_sample_count: price.minimumSampleCount,
        price_inapplicable_because: price.because,

        excess_state: excess.state,
        excess_rank: excess.rank,
        excess_above_sample: excess.aboveSample,
        excess_sample_count: excess.sampleCount,
        excess_refusal: excess.refusal,
        excess_minimum_sample_count: excess.minimumSampleCount,
        excess_inapplicable_because: excess.because,

        volume_state: volume.state,
        volume_rank: volume.rank,
        volume_above_sample: volume.aboveSample,
        volume_sample_count: volume.sampleCount,
        volume_refusal: volume.refusal,
        volume_minimum_sample_count: volume.minimumSampleCount,
        volume_inapplicable_because: volume.because,
      };

      await db
        .insertInto("session_composite_scores")
        .values({
          security_id: subject.id,
          // Supplied by the writer and never defaulted — `0017` §2.
          observed_at: observedAt,
          ...values,
        })
        .onConflict((oc) =>
          oc.columns(["security_id", "observed_at"]).doUpdateSet({
            ...values,
            // The same raw fragment the four stores beside this one use on
            // their correction paths: `now()` is transaction start time, so a
            // re-run's rows share one value.
            recorded_at: sql<Date>`now()`,
          }),
        )
        .execute();
    },

    async writePass(observedAt, pass) {
      const values = {
        tracked_count: pass.tracked,
        scored_count: pass.scored,
        unscored_count: pass.unscored,
        // **The policy, read from the one home each half has** — see the
        // interface for why these are not parameters.
        price_weight: FACTOR_WEIGHTS.price,
        excess_weight: FACTOR_WEIGHTS.excess,
        volume_weight: FACTOR_WEIGHTS.volume,
        elevated_floor: ANOMALY_BAND_FLOORS.elevated,
        high_floor: ANOMALY_BAND_FLOORS.high,
        extreme_floor: ANOMALY_BAND_FLOORS.extreme,
      };

      await db
        .insertInto("session_composite_score_passes")
        .values({ observed_at: observedAt, ...values })
        .onConflict((oc) =>
          oc
            .column("observed_at")
            .doUpdateSet({ ...values, recorded_at: sql<Date>`now()` }),
        )
        .execute();
    },

    async readNewestSession(atOrBefore) {
      // **Two statements rather than a correlated subquery**, which is
      // `readNewestSession`'s arrangement one table over and its reason: the
      // pass read is one row and the score read is a few hundred, and a
      // `max()` inlined as a subquery would be re-planned against a growing
      // table for no gain. A session landing between them is simply not seen
      // until the next refresh, which the cache's own floor already tolerates.
      const pass = await db
        .selectFrom("session_composite_score_passes")
        .select([
          "observed_at",
          "tracked_count",
          "scored_count",
          "unscored_count",
          "price_weight",
          "excess_weight",
          "volume_weight",
          "elevated_floor",
          "high_floor",
          "extreme_floor",
        ])
        .where("observed_at", "<=", atOrBefore)
        .orderBy("observed_at", "desc")
        .limit(1)
        .executeTakeFirst();

      if (pass === undefined) return undefined;

      const rows = await db
        .selectFrom("session_composite_scores")
        .innerJoin(
          "securities",
          "securities.id",
          "session_composite_scores.security_id",
        )
        .select([
          "securities.symbol",
          "session_composite_scores.score",
          "session_composite_scores.band",
          "session_composite_scores.max",
          "session_composite_scores.price_state",
          "session_composite_scores.price_rank",
          "session_composite_scores.price_above_sample",
          "session_composite_scores.price_sample_count",
          "session_composite_scores.price_refusal",
          "session_composite_scores.price_minimum_sample_count",
          "session_composite_scores.price_inapplicable_because",
          "session_composite_scores.excess_state",
          "session_composite_scores.excess_rank",
          "session_composite_scores.excess_above_sample",
          "session_composite_scores.excess_sample_count",
          "session_composite_scores.excess_refusal",
          "session_composite_scores.excess_minimum_sample_count",
          "session_composite_scores.excess_inapplicable_because",
          "session_composite_scores.volume_state",
          "session_composite_scores.volume_rank",
          "session_composite_scores.volume_above_sample",
          "session_composite_scores.volume_sample_count",
          "session_composite_scores.volume_refusal",
          "session_composite_scores.volume_minimum_sample_count",
          "session_composite_scores.volume_inapplicable_because",
        ])
        // **Bounded on the PASS row's session**, never on the argument — see
        // the header: that is what makes a crashed pass invisible instead of
        // serving one session's scores under another session's figures.
        .where("session_composite_scores.observed_at", "=", pass.observed_at)
        // No filter on `securities.status`. See the interface.
        .orderBy("securities.symbol")
        .execute();

      const scores: StoredCompositeScore[] = [];
      let disagreed = 0;

      for (const row of rows) {
        const price = answerOf({
          state: row.price_state,
          rank: row.price_rank,
          aboveSample: row.price_above_sample,
          sampleCount: row.price_sample_count,
          refusal: row.price_refusal,
          minimumSampleCount: row.price_minimum_sample_count,
          because: row.price_inapplicable_because,
        });
        const excess = answerOf({
          state: row.excess_state,
          rank: row.excess_rank,
          aboveSample: row.excess_above_sample,
          sampleCount: row.excess_sample_count,
          refusal: row.excess_refusal,
          minimumSampleCount: row.excess_minimum_sample_count,
          because: row.excess_inapplicable_because,
        });
        const volume = answerOf({
          state: row.volume_state,
          rank: row.volume_rank,
          aboveSample: row.volume_above_sample,
          sampleCount: row.volume_sample_count,
          refusal: row.volume_refusal,
          minimumSampleCount: row.volume_minimum_sample_count,
          because: row.volume_inapplicable_because,
        });

        // A column group that does not read back as one of the four arms,
        // which every `*_answer_shape` check in `0017` makes unreachable from
        // any writer in this repository. It is counted with the disagreements
        // rather than given a word of its own: both mean *this row was not
        // written by this product's pass*, and there is no sentence a reader
        // could act on that tells them apart.
        if (
          price === undefined ||
          excess === undefined ||
          volume === undefined
        ) {
          disagreed += 1;
          continue;
        }

        const answers = { price, excess, volume };

        // **THE MINT, and the only arithmetic.** See the header.
        const outcome = scoreAnomaly(answers);

        // **The stored figures are read only to be disagreed with.** All three
        // are compared rather than one: a weight change moves `score` and
        // `max`, a floor change moves `band` alone, and the point of storing
        // them is to catch either.
        if (
          !outcome.scored ||
          outcome.score !== row.score ||
          outcome.max !== row.max ||
          outcome.band !== row.band
        ) {
          disagreed += 1;
          continue;
        }

        scores.push({ symbol: toTicker(row.symbol), outcome, answers });
      }

      return {
        pass: {
          observedAt: pass.observed_at,
          tracked: Number(pass.tracked_count),
          scored: Number(pass.scored_count),
          unscored: Number(pass.unscored_count),
          weights: {
            price: pass.price_weight,
            excess: pass.excess_weight,
            volume: pass.volume_weight,
          },
          floors: {
            elevated: pass.elevated_floor,
            high: pass.high_floor,
            extreme: pass.extreme_floor,
          },
        },
        scores,
        disagreed,
      };
    },
  };
}

/** One column group as the row hands it over, before it is an answer. */
interface FactorColumnRow {
  readonly state: FactorAnswerState;
  readonly rank: number | null;
  readonly aboveSample: boolean | null;
  readonly sampleCount: string | null;
  readonly refusal: FactorRefusal | null;
  readonly minimumSampleCount: string | null;
  readonly because: FactorInapplicability | null;
}

/**
 * **One column group, as one {@link FactorAnswer}** — the mapper, and the one
 * place a `bigint` column's string becomes the number an arm carries.
 *
 * `README.md`'s rule: one function per domain type, beside the query, never a
 * generic mapper — *"the mapping is exactly where a nullable column becomes an
 * explicit domain answer."* What is decided **here** is the half that is about
 * this table: `pg` hands a `bigint` back as a **string** deliberately, and
 * converting it is a judgement taken beside the query that produced it.
 *
 * **Which members each arm requires is NOT decided here**, and that is the
 * point of the delegation. `readFactorAnswer` in `packages/shared` owns it,
 * beside the type's own docblocks and beside the two wire readers that apply
 * the identical rules — `0` is a legal sample on a refusal and nowhere else, a
 * bound of `0` is not a bound, a rank above `99` is not a rank. A second
 * expression of that beside a `select` would be a second home for the arms'
 * shape; and the payload-free `no-distribution` arm would be a **third
 * construction site** of a word that carries nothing to say the construction
 * was a round-trip rather than a claim, which
 * `one-site-builds-the-no-distribution-arm` is red on by design.
 *
 * `undefined` refuses a half-written group rather than substituting for it, and
 * the caller counts that with the disagreements.
 */
function answerOf(group: FactorColumnRow): FactorAnswer | undefined {
  return readFactorAnswer({
    state: group.state,
    rank: group.rank,
    aboveSample: group.aboveSample,
    sampleCount: count(group.sampleCount),
    minimumSampleCount: count(group.minimumSampleCount),
    refusal: group.refusal,
    because: group.because,
  });
}

/**
 * A `bigint` column, as the number a score is taken over. `pg` hands a `bigint`
 * back as a **string** deliberately (`README.md` §4), so this is the one place
 * that conversion is decided — and it refuses rather than rounding, because a
 * count above `2^53` is a count this product cannot have and a silent
 * round-trip failure is worse than a dropped row.
 */
function count(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}
