import { Kysely, PostgresDialect, sql } from "kysely";
import type pg from "pg";

import { toTicker } from "@marketpulse/shared";

import type {
  ExcessBaselineRefusal,
  MarketFeed,
  Ticker,
} from "@marketpulse/shared";

import type { Database } from "./schema.js";
import type { BaselineSubject } from "./return-baseline-store.js";
import { EXCESS_REFERENCE_KIND } from "./excess-move-baseline.js";

import type {
  ExcessBaselineOutcome,
  ExcessReferenceKind,
} from "./excess-move-baseline.js";

/**
 * **The excess-move baseline's database half, and the one place that knows
 * there is one** (Task 5.6.2, ADR 0044).
 *
 * `volume-baseline-store.ts`' arrangement, fourth instance: build the `Kysely`
 * instance here, do not export it, export functions that return domain
 * objects. The reason is the same and is sharper on the derived tables than
 * anywhere else — every read is over a column Epic 13's plugin rewrites, and
 * `withPlugin` returns a **different object**, so the guarantee is worth
 * nothing if an unplugged handle can be imported.
 *
 * ## It reads NO BARS, which is the one thing worth knowing before reusing it
 *
 * `return_baselines`' store already has the read this pass needs —
 * `readWindowCloses(subject, window)`, one ordered index range scan over
 * `market_bars` for one security, measured at **538 correlated blocks** — and
 * it already has `subjectFor(symbol)` to resolve a benchmark's row id from its
 * ticker. So this module is a **writer**, and the pass issues both legs'
 * reads through the one query object that `EXPLAIN` has been taken of.
 *
 * The alternative — a `readWindowCloses` of its own here — would have been a
 * second definition of the same read, which is Task 4.8.11's lesson: an
 * instrument that describes a second copy of the subject is measuring the copy,
 * and a pass that issues a second copy is paying for a plan nobody measured.
 *
 * ## The reference is in the key and therefore in every statement below
 *
 * `0016` §3. A write that omitted it would `on conflict do update` across a
 * reference change and rewrite the meaning of every stored row with nothing
 * recording that the meaning changed — ADR 0045 §3's argument, which is why
 * `feed` is in `0015`'s key and why the two columns are in this one's.
 */

/** The parameters one generation was computed under. */
export interface ExcessBaselineParameters {
  /** The form of the comparison — `0016` §3, and part of the pass row's key. */
  readonly referenceKind: ExcessReferenceKind;
  readonly lookbackSessions: number;
  /** The grid's stride — `SAMPLE_SPAN_MINUTES`, read and never spelled. */
  readonly spanMinutes: number;
  /** The tape both legs were read on — `BASELINE_FEED`'s. */
  readonly feed: MarketFeed;
  /** The bound a reader applies — `BASELINE_MINIMUM_SAMPLE`. */
  readonly minimumSampleCount: number;
}

/**
 * **What one pass did, as four populations that PARTITION and one breakdown.**
 *
 * `0016`'s `excess_move_baseline_passes_securities_partition` holds the
 * arithmetic in the database, and `volume_baseline_passes`' note is the reason
 * it is a partition rather than `0014`'s nesting: a reader cannot subtract
 * *how many securities can this factor be drawn for* out of four figures that
 * overlap.
 */
export interface ExcessBaselinePassWrite {
  readonly tracked: number;
  readonly measured: number;
  readonly inapplicable: number;
  /** No grid pair on both legs — **no row written**. */
  readonly absent: number;
  /** The two refusal words, which sum to the refused population. */
  readonly refusals: ExcessRefusalTally;
  readonly parameters: ExcessBaselineParameters;
}

/** The refused population's breakdown. `0016` §5. */
export interface ExcessRefusalTally {
  splitDiscontinuity: number;
  referenceSplitDiscontinuity: number;
}

/** What every stored row carries, answer or refusal. */
interface StoredExcessBaselineFacts {
  readonly symbol: Ticker;
  /** The window's end — the session close instant the generation is FOR. */
  readonly observedAt: Date;
  readonly referenceKind: ExcessReferenceKind;
  /** The benchmark this security was differenced against. */
  readonly referenceSymbol: string;
  readonly lookbackSessions: number;
  /**
   * The counted `n`. **A refused row carries one too**, because *how much did
   * you have* is the first question asked of a refusal.
   */
  readonly sampleCount: number;
}

/** A stored generation with a distribution in it. */
export interface RankableExcessBaseline extends StoredExcessBaselineFacts {
  readonly refusal: null;
  /** `BASELINE_BREAKPOINT_COUNT` ascending magnitudes, in points. */
  readonly breakpoints: readonly number[];
}

/**
 * A stored generation the pass **declined** to compute, and the arm with **no
 * `breakpoints` member at all** — `RefusedReturnBaseline`'s mechanism (Task
 * 5.3.4), which is what makes *a refused generation has no breakpoints* a
 * compile error rather than a test.
 */
export interface RefusedExcessBaseline extends StoredExcessBaselineFacts {
  readonly refusal: ExcessBaselineRefusal;
}

/**
 * **One stored generation, as a reader sees it — a union rather than two
 * nullable columns.**
 *
 * `StoredReturnBaseline`'s shape and its whole argument: the mapping is exactly
 * where a nullable column becomes an explicit domain answer, and the narrowing
 * is the only way across. The sample bound is **not** applied here —
 * `comparableExcessBaseline` in `excess-move-factor.ts` owns it, because this
 * module's job is to say what the row holds and the bound is a statement about
 * what may be **printed**.
 */
export type StoredExcessBaseline =
  RankableExcessBaseline | RefusedExcessBaseline;

export interface ExcessBaselineStore {
  /**
   * Write one generation. **An upsert on the full key**, so re-running
   * `pnpm baselines` for a window that is already stored converges on the
   * store rather than appending — `pnpm universe`'s property, for the same
   * reason: this table is derived and recomputable.
   */
  writeBaseline(
    subject: BaselineSubject,
    observedAt: Date,
    reference: { kind: ExcessReferenceKind; symbol: string },
    parameters: ExcessBaselineParameters,
    outcome: ExcessBaselineOutcome,
  ): Promise<void>;

  /** Write the pass's own row, once, at the end. */
  writePass(observedAt: Date, pass: ExcessBaselinePassWrite): Promise<void>;

  /**
   * **The newest generation at or before an instant** — every security's row
   * for one window end, which is what a cache would hold.
   *
   * It does **not** filter on `securities.status`: this is a read of something
   * we stored, and a security untracked last week still has a baseline that
   * was true when it was computed. The bound is an argument rather than a
   * clock, which is `closesAsOf`'s shape and ADR 0015's gap 4.
   *
   * **It is pinned to {@link EXCESS_REFERENCE_KIND}** — one form of the
   * comparison, in both the frontier read and the generation read. See the
   * implementation for the defect that repaired, and for why the key's fourth
   * column is an **order** here rather than a second pin.
   */
  readNewestGeneration(
    atOrBefore: Date,
  ): Promise<readonly StoredExcessBaseline[]>;
}

export function createExcessBaselineStore(pool: pg.Pool): ExcessBaselineStore {
  // Not exported, not returned, not reachable. See the header.
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  return {
    async writeBaseline(subject, observedAt, reference, parameters, outcome) {
      if (outcome.kind === "none") {
        throw new RangeError(
          `${subject.symbol} produced no grid pair present on both legs, so ` +
            "there is nothing to write. `none` means the pass found nothing, " +
            "which is a DIFFERENT fact from a refusal and is recorded by the " +
            "absence of a row — and a different fact again from " +
            "`inapplicable`, which never reaches this function at all. See " +
            "`0016_excess_move_baselines.sql` §4.",
        );
      }

      const values = {
        lookback_sessions: parameters.lookbackSessions,
        sample_count: outcome.sampleCount,
        breakpoints:
          outcome.kind === "measured" ? [...outcome.breakpoints] : null,
        refusal: outcome.kind === "refused" ? outcome.refusal : null,
      };

      await db
        .insertInto("excess_move_baselines")
        .values({
          security_id: subject.id,
          // Supplied by the writer and never defaulted — `0016` §2.
          observed_at: observedAt,
          reference_kind: reference.kind,
          reference_symbol: reference.symbol,
          ...values,
        })
        .onConflict((oc) =>
          oc
            .columns([
              "security_id",
              "observed_at",
              "reference_kind",
              "reference_symbol",
            ])
            .doUpdateSet({
              ...values,
              // The one raw fragment in a write here, as `market-bars.ts` uses
              // on its correction path: `now()` is transaction start time, so a
              // re-run's rows share one value.
              recorded_at: sql<Date>`now()`,
            }),
        )
        .execute();
    },

    async writePass(observedAt, pass) {
      const refused =
        pass.refusals.splitDiscontinuity +
        pass.refusals.referenceSplitDiscontinuity;

      const values = {
        tracked_count: pass.tracked,
        measured_count: pass.measured,
        refused_count: refused,
        inapplicable_count: pass.inapplicable,
        absent_count: pass.absent,
        split_discontinuity_count: pass.refusals.splitDiscontinuity,
        reference_split_discontinuity_count:
          pass.refusals.referenceSplitDiscontinuity,
        lookback_sessions: pass.parameters.lookbackSessions,
        span_minutes: pass.parameters.spanMinutes,
        baseline_feed: pass.parameters.feed,
        minimum_sample_count: pass.parameters.minimumSampleCount,
      };

      await db
        .insertInto("excess_move_baseline_passes")
        .values({
          observed_at: observedAt,
          reference_kind: pass.parameters.referenceKind,
          ...values,
        })
        .onConflict((oc) =>
          oc
            .columns(["observed_at", "reference_kind"])
            .doUpdateSet({ ...values, recorded_at: sql<Date>`now()` }),
        )
        .execute();
    },

    async readNewestGeneration(atOrBefore) {
      // **Two statements rather than a correlated subquery**, which is
      // `readNewestGeneration`'s own arrangement one table over: the frontier
      // read is one row and the generation read is a few hundred, and a `max()`
      // inlined as a subquery would be re-planned against a growing table for
      // no gain.
      //
      // **The reference is in the key, so the frontier is per reference FORM**
      // (repaired 2026-10-23, Task 5.6.4). `volume-baseline-store.ts`'
      // precedent, in its own words — *"the tape is in the key, so the frontier
      // is per tape"* — and this table's key carries two such columns rather
      // than one. Unpinned, `max(observed_at)` was taken across **every**
      // reference form: the day a second kind is written by a pass with a
      // different schedule, *the newest generation* would be that kind's, and
      // the generation read below would then return **both** forms for one
      // `observed_at` ordered by symbol alone — so a `Map<Ticker, …>` would
      // keep whichever row the result set happened to yield last, with **no
      // defined tie-break**. `0016` §3's whole argument is that the reference
      // in the key means *a reader holding either can say which question it
      // answers*, and a read that cannot say which discards that protection one
      // layer up. Latent today — one vocabulary member — and maximally quiet
      // when it fires, because `referenceSymbol` travels on the row, so the
      // drawn sentence would name the benchmark the **wrong** baseline was
      // computed against.
      const frontier = await db
        .selectFrom("excess_move_baselines")
        .select(({ fn }) => fn.max("observed_at").as("newest"))
        .where("observed_at", "<=", atOrBefore)
        .where("reference_kind", "=", EXCESS_REFERENCE_KIND)
        .executeTakeFirst();

      const newest = frontier?.newest ?? undefined;
      if (newest === undefined) return [];

      const rows = await db
        .selectFrom("excess_move_baselines")
        .innerJoin(
          "securities",
          "securities.id",
          "excess_move_baselines.security_id",
        )
        .select([
          "securities.symbol",
          "excess_move_baselines.observed_at",
          "excess_move_baselines.reference_kind",
          "excess_move_baselines.reference_symbol",
          "excess_move_baselines.lookback_sessions",
          "excess_move_baselines.sample_count",
          "excess_move_baselines.breakpoints",
          "excess_move_baselines.refusal",
        ])
        // No filter on `securities.status`. See the interface.
        .where("excess_move_baselines.observed_at", "=", newest)
        // **The same pin as the frontier read**, for the frontier read's
        // reason: a generation is *one form of the comparison as of one window
        // end*, and a read that admitted two forms would hand a cache two rows
        // for one ticker.
        .where(
          "excess_move_baselines.reference_kind",
          "=",
          EXCESS_REFERENCE_KIND,
        )
        // **`reference_symbol` is the key's fourth column and CANNOT be pinned
        // to a constant here**, because it is per security — each equity's own
        // sector benchmark — rather than one value for the whole generation,
        // which is where this table's key stops resembling `volume_baselines`'.
        // So the two halves of the repair are different: the kind is pinned,
        // and the symbol is made a **deterministic order** so that a security
        // whose benchmark changed between two runs cannot yield *whichever row
        // came last*. The reader's own half is in `excess-move-factor.ts`,
        // which treats a row computed against a different benchmark as
        // **absent** rather than ranking against it.
        .orderBy("securities.symbol")
        .orderBy("excess_move_baselines.reference_symbol")
        .execute();

      // **One function per domain type, beside the query** — and here that is
      // also where the row's two nullable columns become one explicit answer.
      // `flatMap` for the one case the database forbids and this mapper must
      // still answer for: a row with neither a distribution nor a refusal,
      // which `excess_move_baselines_one_answer` makes unrepresentable and
      // which a mapper returning `breakpoints: []` would have smuggled through
      // as the least unusual security in the universe.
      return rows.flatMap<StoredExcessBaseline>((row) => {
        const facts = {
          symbol: toTicker(row.symbol),
          observedAt: row.observed_at,
          referenceKind: row.reference_kind,
          referenceSymbol: row.reference_symbol,
          lookbackSessions: row.lookback_sessions,
          // `bigint` on the wire, a `number` in the domain — `toCoverage`'s own
          // judgement for `bar_count`, taken beside the query.
          sampleCount: Number(row.sample_count),
        };

        if (row.refusal !== null) return [{ ...facts, refusal: row.refusal }];
        if (row.breakpoints === null) return [];

        return [{ ...facts, refusal: null, breakpoints: row.breakpoints }];
      });
    },
  };
}
