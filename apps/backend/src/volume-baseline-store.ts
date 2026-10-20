import { Kysely, PostgresDialect, sql } from "kysely";
import type pg from "pg";

import { toTicker } from "@marketpulse/shared";

import type { Ticker, TimeRange } from "@marketpulse/shared";

import type { Database } from "./schema.js";
import type { BaselineSubject } from "./return-baseline-store.js";
import {
  VOLUME_BASELINE_FEED,
  type VolumeBaselineOutcome,
  type VolumeBaselineStoredRefusal,
  type VolumeBucketBaseline,
} from "./volume-baseline.js";

/**
 * **The volume baseline's database half, and the one place that knows there is
 * one** (Task 5.5.3, [ADR 0044](../../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)).
 *
 * `market-bars.ts`' seam, fifth instance: **build the `Kysely` instance here,
 * do not export it, export functions that return domain objects.** The read
 * below is over `market_bars.observed_at` — the column Epic 13's plugin
 * rewrites — and `withPlugin` returns a *different object*, so the guarantee is
 * worth nothing if an unplugged handle can be imported.
 *
 * ## `feed = 'iex'` IS WRITTEN BY NAME IN THE QUERY'S OWN `where`
 *
 * This is the module's whole reason for existing rather than being three
 * methods on `return-baseline-store.ts`, and the alternatives were each refused
 * for a reason somebody can check:
 *
 * **Not `readSeries`.** Its `distinct on (observed_at)` is correct *only*
 * because it is already filtered to one symbol; copied without that predicate
 * it **collapses across securities** and answers one row per minute for the
 * entire market — a well-formed answer that is 1/516th of the data. And with
 * no tie-break the surviving row per instant is **arbitrary**, so one
 * distribution would hold minutes of both tapes in whatever proportion the
 * planner supplied.
 *
 * **Not `readBars`.** Its own docblock says it answers **every** row, both
 * tapes included, and does not answer the tape question for you. Neither it nor
 * `readSeries` **takes a feed parameter**, so there is nothing to pass: the
 * predicate has to be written where the query is.
 *
 * **Not `SERVED_TAPE_RANK`.** That record is a *preference* for serving a chart
 * the best history available; this is a **restriction** to one tape. The two
 * happen to agree on which feed wins and disagree completely about what to do
 * with the loser — and here the loser is the entire consolidated tape, which on
 * a settled session covers every regular-session minute.
 *
 * **Not `windowQuery`, widened.** That query filters `BASELINE_FEED` by name
 * for the same reason in the opposite direction, and relaxing it to admit both
 * tapes would put the return baseline's closes back in the arbitrary-row regime
 * the module next door was written to leave.
 *
 * `the-volume-baseline-reads-one-tape-by-name` in `scripts/check-invariants.mjs`
 * is the mechanical half, with the break `a-volume-read-that-names-no-tape`
 * behind it — the plant is the shape that typechecks, lints, runs, and takes
 * whichever row the planner returned.
 *
 * ## The cost, which is a second statement and not a second pass
 *
 * One ordered index range scan per security, keyed on the row id, over the
 * **same** `(security_id, timeframe, observed_at, feed)` range the price
 * window read touches — the 538 physically adjacent blocks
 * `return-baseline-store.ts`' header measured, in the bandwidth regime rather
 * than the 120-IOPS one. It is issued immediately after that read inside the
 * same per-security iteration, so the blocks are hot; what it adds is a round
 * trip and the deserialisation of the `iex` rows, which are a minority of the
 * range. Measured rather than assumed — the task record carries the pass's
 * re-taken total, because this epic got a derived cost wrong once by 20–66×.
 *
 * ## Both writes are upserts on the natural key
 *
 * Re-running `pnpm baselines` for a generation that is already stored converges
 * rather than appending — `pnpm universe`'s property, for `0015` §1's reason:
 * this table is derived and recomputable. The tape is **in** the key (`0015`
 * §4), so a pass over a different tape is a different row rather than an
 * overwrite with nothing recording the change.
 */

/** The parameters a stored generation records as *what the pass applied*. */
export interface VolumeBaselineParameters {
  /** `BASELINE_LOOKBACK_SESSIONS`, read through `baselineWindowEndingAt`. */
  readonly lookbackSessions: number;
  /** `SAMPLE_SPAN_MINUTES` — the grid's stride, Gate 1 decision 4. */
  readonly bucketMinutes: number;
}

/** The security populations one pass saw. They **partition**; `0015` §5. */
export interface VolumeBaselinePassWrite {
  readonly tracked: number;
  readonly measured: number;
  readonly splitDiscontinuity: number;
  readonly absent: number;
  /** The bucket populations, over the sample-bearing buckets. */
  readonly buckets: VolumeBucketTally;
  readonly parameters: VolumeBaselineParameters;
  /** `TARGET_RELATIVE_STANDARD_ERROR` in force when the pass ran. */
  readonly targetRelativeStandardError: number;
}

/**
 * How the measured securities' buckets came out.
 *
 * `total` is the **sample-bearing** buckets and the first three partition it;
 * `empty` sits outside, because a bucket with no sample at all is a fact about
 * the grid — an early close's afternoon — rather than about the security.
 */
export interface VolumeBucketTally {
  total: number;
  measured: number;
  tooFewSessions: number;
  zeroVolume: number;
  empty: number;
}

/** What every stored volume generation carries, answer or refusal. */
interface StoredVolumeBaselineFacts {
  readonly symbol: Ticker;
  /** The window's end — the session close instant the generation is FOR. */
  readonly observedAt: Date;
  readonly lookbackSessions: number;
  /** The grid's stride — *which* time of day a bucket index means. */
  readonly bucketMinutes: number;
  /** The grid's size, and the three arrays' arity. */
  readonly bucketCount: number;
  /**
   * The counted `n` over the whole window. **A refused row carries one too**,
   * because *how much we had* is the first question asked of a refusal.
   */
  readonly sampleCount: number;
}

/** A stored generation with a median per bucket in it. */
export interface MeasuredVolumeBaseline extends StoredVolumeBaselineFacts {
  readonly refusal: null;
  /** One entry per bucket, bucket 0 first, aligned with the grid. */
  readonly buckets: readonly VolumeBucketBaseline[];
}

/**
 * A stored generation the pass **declined** to compute, and the arm with **no
 * `buckets` member at all** — `RefusedReturnBaseline`'s mechanism, for its
 * reason: a caller holding a refusal cannot read a denominator off it, because
 * the member does not exist on that arm.
 */
export interface RefusedVolumeBaselineRow extends StoredVolumeBaselineFacts {
  readonly refusal: VolumeBaselineStoredRefusal;
}

/**
 * **One stored generation, as the cache reads it — a union rather than two
 * nullable columns** (Task 5.5.4).
 *
 * `0015_volume_baselines.sql`'s `volume_baselines_one_answer` makes *both* and
 * *neither* unrepresentable in the database; this is the same constraint in the
 * type system, which is `StoredReturnBaseline`'s own arrangement and
 * `CLAUDE.md`'s rule about this seam — the mapping is exactly where a nullable
 * column becomes an explicit domain answer.
 *
 * **The precision bound is NOT applied here**, deliberately:
 * `comparableVolumeBaseline` owns it, so a generation computed before the bound
 * existed is refused when it is **read** rather than recomputed.
 */
export type StoredVolumeBaseline =
  MeasuredVolumeBaseline | RefusedVolumeBaselineRow;

export interface VolumeBaselineStore {
  /**
   * **One security's `iex` minute volumes over the window**, keyed by the bar's
   * own `startsAt` in epoch milliseconds.
   *
   * A volume genuinely at `0` is kept and an absent minute is simply not in the
   * map — which is AC 4's distinction at the one place nothing downstream could
   * detect it, because `Number(null)` is `0` and a `0` here would be a claim
   * that IEX traded nothing in a minute it merely did not print in.
   */
  readWindowVolumes(
    subject: BaselineSubject,
    window: TimeRange,
  ): Promise<ReadonlyMap<number, number>>;

  /**
   * Write one generation. **An upsert on `(security_id, observed_at, feed)`.**
   *
   * It refuses an outcome of `none`, which is the absence of a row rather than
   * a row saying nothing — `0015` §5.
   */
  writeBaseline(
    subject: BaselineSubject,
    observedAt: Date,
    parameters: VolumeBaselineParameters,
    outcome: VolumeBaselineOutcome,
  ): Promise<void>;

  /** Write the pass row. An upsert on `(observed_at, feed)`. */
  writePass(observedAt: Date, pass: VolumeBaselinePassWrite): Promise<void>;

  /**
   * **The newest generation at or before an instant**, one row per security
   * that has one — `readNewestGeneration`'s shape and its reasons, one table
   * over (Task 5.5.4).
   *
   * Two statements rather than a correlated subquery: the frontier is one row
   * and the generation is a few hundred, and a generation landing between them
   * is simply not seen until the next refresh, which the cache's own
   * fifteen-minute floor already tolerates.
   *
   * **It does not filter on `securities.status`** — `UNIVERSE.md` §12.2's two
   * sides: this is a read of something we **stored**, and a security untracked
   * last week still has a baseline that was true when it was computed.
   *
   * **On every machine without a provider this answers `[]` for ever**, and
   * that is not a degraded state: the pass writes no row for a security with
   * no `iex` bar in the window, which is all 516 of them there.
   */
  readNewestGeneration(
    atOrBefore: Date,
  ): Promise<readonly StoredVolumeBaseline[]>;
}

/** The timeframe a baseline is computed at. Minute bars, never daily. */
const BASELINE_TIMEFRAME = "1m" as const;

/**
 * A `bigint` volume as a `number`, or `undefined` for a row this pass cannot
 * use.
 *
 * `volume` is a `bigint`, so `pg` hands it back as a **string**; a consumer
 * that added two of them would concatenate and produce a plausible number. The
 * blank check is not redundant with `isFinite` — `Number("")` is **0**, which
 * is the one wrong answer here, because a zero volume is a legal measurement
 * and would be indistinguishable from an unreadable one.
 *
 * A malformed value is **dropped from the map** and the bucket's counted `n` is
 * one lower, which is `parseClose`'s rule for its reason: a pass over ~24,000
 * rows a security must not fail on one bad value.
 */
function parseVolume(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** `null` for a refusal, and the array otherwise. Three of these, aligned. */
function medianColumn(
  outcome: VolumeBaselineOutcome,
): (number | null)[] | null {
  return outcome.kind === "measured"
    ? outcome.buckets.map((bucket) => bucket.median)
    : null;
}

function samplesColumn(outcome: VolumeBaselineOutcome): string[] | null {
  return outcome.kind === "measured"
    ? outcome.buckets.map((bucket) => String(bucket.samples))
    : null;
}

function errorsColumn(
  outcome: VolumeBaselineOutcome,
): (number | null)[] | null {
  return outcome.kind === "measured"
    ? outcome.buckets.map((bucket) => bucket.relativeStandardError)
    : null;
}

/**
 * One bucket array element as a number, or `null`.
 *
 * `bigint` columns arrive as **strings** and `double precision` ones as
 * numbers, which is why the samples get their own parser: `Number("")` is `0`
 * and a zero sample count is a legal, meaningful answer — a bucket nothing was
 * found for — so an unreadable one must not become it.
 */
const toSamples = (raw: string): number | undefined => {
  if (raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : undefined;
};

/**
 * The three parallel arrays, zipped into one entry per bucket — or `undefined`
 * for a row this reader will not answer from.
 *
 * `volume_baselines_bucket_arity` makes a disagreement unreachable from any
 * writer in this repository; it is checked anyway, because a bucket index
 * meaning a different time of day in each array is a **wrong figure with no
 * symptom**, and the three arrays are the one thing in this row that a
 * constraint and a reader can disagree about.
 */
function toBuckets(
  bucketCount: number,
  medians: (number | null)[] | null,
  samples: string[] | null,
  errors: (number | null)[] | null,
): readonly VolumeBucketBaseline[] | undefined {
  if (medians === null || samples === null || errors === null) return undefined;
  if (
    medians.length !== bucketCount ||
    samples.length !== bucketCount ||
    errors.length !== bucketCount
  ) {
    return undefined;
  }

  const buckets: VolumeBucketBaseline[] = [];
  for (let index = 0; index < bucketCount; index += 1) {
    const raw = samples[index];
    const counted = raw === undefined ? undefined : toSamples(raw);
    if (counted === undefined) return undefined;

    buckets.push({
      median: medians[index] ?? null,
      samples: counted,
      relativeStandardError: errors[index] ?? null,
    });
  }

  return buckets;
}

export function createVolumeBaselineStore(pool: pg.Pool): VolumeBaselineStore {
  // Not exported, not returned, not reachable. See the header.
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  return {
    async readWindowVolumes(subject, window) {
      const rows = await db
        .selectFrom("market_bars")
        // **No join**, for `windowQuery`'s measured reason: with the security
        // reached through one the top plan node is a `Sort` over ~23,400 rows
        // per security, because `security_id` is not a constant to the planner
        // until the join has produced one. The pass already holds the id.
        .select(["market_bars.observed_at", "market_bars.volume"])
        .where("market_bars.security_id", "=", subject.id)
        .where("market_bars.timeframe", "=", BASELINE_TIMEFRAME)
        // **The tape, by name.** See the header for the four shapes this
        // refuses and why none of them could be handed a feed instead.
        .where("market_bars.feed", "=", VOLUME_BASELINE_FEED)
        // Half-open, matching `TimeRange`, so two adjacent windows tile
        // without a bar claimed by both.
        .where("market_bars.observed_at", ">=", window.start)
        .where("market_bars.observed_at", "<", window.end)
        // Supplied by `market_bars_unique_bar` with `security_id` and
        // `timeframe` fixed and the id a parameter.
        .orderBy("market_bars.observed_at")
        .execute();

      const volumes = new Map<number, number>();
      for (const row of rows) {
        const volume = parseVolume(row.volume);
        if (volume !== undefined) {
          volumes.set(row.observed_at.getTime(), volume);
        }
      }

      return volumes;
    },

    async writeBaseline(subject, observedAt, parameters, outcome) {
      if (outcome.kind === "none") {
        throw new RangeError(
          `${subject.symbol} produced no ${VOLUME_BASELINE_FEED} samples, so ` +
            "there is nothing to write. `none` means the pass found no bar of " +
            "this tape at all, which is a DIFFERENT fact from a refusal and " +
            "is recorded by the absence of a row — the reader is told " +
            "`no-same-tape-baseline`. See `0015_volume_baselines.sql` §5.",
        );
      }

      const values = {
        lookback_sessions: parameters.lookbackSessions,
        bucket_minutes: parameters.bucketMinutes,
        bucket_count: outcome.bucketCount,
        sample_count: outcome.sampleCount,
        bucket_medians: medianColumn(outcome),
        bucket_samples: samplesColumn(outcome),
        bucket_errors: errorsColumn(outcome),
        refusal: outcome.kind === "refused" ? outcome.refusal : null,
      };

      await db
        .insertInto("volume_baselines")
        .values({
          security_id: subject.id,
          // Supplied by the writer and never defaulted — `0015` §2.
          observed_at: observedAt,
          // The tape is part of the key, not an attribute — `0015` §4.
          feed: VOLUME_BASELINE_FEED,
          ...values,
        })
        .onConflict((oc) =>
          oc.columns(["security_id", "observed_at", "feed"]).doUpdateSet({
            ...values,
            // The same raw fragment `market-bars.ts`,
            // `return-baseline-store.ts` and `session-percentile-store.ts`
            // use on their correction paths: `now()` is transaction start
            // time, so a re-run's rows share one value.
            recorded_at: sql<Date>`now()`,
          }),
        )
        .execute();
    },

    async writePass(observedAt, pass) {
      const values = {
        tracked_count: pass.tracked,
        measured_count: pass.measured,
        split_discontinuity_count: pass.splitDiscontinuity,
        absent_count: pass.absent,
        bucket_count: pass.buckets.total,
        measured_bucket_count: pass.buckets.measured,
        too_few_sessions_bucket_count: pass.buckets.tooFewSessions,
        zero_volume_bucket_count: pass.buckets.zeroVolume,
        empty_bucket_count: pass.buckets.empty,
        lookback_sessions: pass.parameters.lookbackSessions,
        bucket_minutes: pass.parameters.bucketMinutes,
        target_relative_standard_error: pass.targetRelativeStandardError,
      };

      await db
        .insertInto("volume_baseline_passes")
        .values({
          observed_at: observedAt,
          feed: VOLUME_BASELINE_FEED,
          ...values,
        })
        .onConflict((oc) =>
          oc
            .columns(["observed_at", "feed"])
            .doUpdateSet({ ...values, recorded_at: sql<Date>`now()` }),
        )
        .execute();
    },

    async readNewestGeneration(atOrBefore) {
      // **The tape is in the key, so the frontier is per tape.** A `sip`
      // generation written by a later story must not answer *the newest
      // generation* for a reader whose numerator is IEX — which is `0015`
      // §4's whole argument for putting the feed in the key rather than
      // leaving it an attribute.
      const frontier = await db
        .selectFrom("volume_baselines")
        .select(({ fn }) => fn.max("observed_at").as("newest"))
        .where("observed_at", "<=", atOrBefore)
        .where("feed", "=", VOLUME_BASELINE_FEED)
        .executeTakeFirst();

      const newest = frontier?.newest ?? undefined;
      if (newest === undefined) return [];

      const rows = await db
        .selectFrom("volume_baselines")
        .innerJoin(
          "securities",
          "securities.id",
          "volume_baselines.security_id",
        )
        .select([
          "securities.symbol",
          "volume_baselines.observed_at",
          "volume_baselines.lookback_sessions",
          "volume_baselines.bucket_minutes",
          "volume_baselines.bucket_count",
          "volume_baselines.sample_count",
          "volume_baselines.bucket_medians",
          "volume_baselines.bucket_samples",
          "volume_baselines.bucket_errors",
          "volume_baselines.refusal",
        ])
        // No filter on `securities.status`. See the interface.
        .where("volume_baselines.observed_at", "=", newest)
        .where("volume_baselines.feed", "=", VOLUME_BASELINE_FEED)
        .orderBy("securities.symbol")
        .execute();

      // **One function per domain type, beside the query** — and here that is
      // also where two nullable array columns become one explicit domain
      // answer. `flatMap` for the row the database forbids and this mapper
      // must still answer for.
      return rows.flatMap<StoredVolumeBaseline>((row) => {
        const facts = {
          symbol: toTicker(row.symbol),
          observedAt: row.observed_at,
          lookbackSessions: row.lookback_sessions,
          bucketMinutes: row.bucket_minutes,
          // `bigint` on the wire, a `number` in the domain — `toCoverage`'s
          // judgement for `bar_count`, taken beside the query as the
          // repository's rule requires.
          bucketCount: Number(row.bucket_count),
          sampleCount: Number(row.sample_count),
        };

        if (row.refusal !== null) {
          return [{ ...facts, refusal: row.refusal }];
        }

        const buckets = toBuckets(
          facts.bucketCount,
          row.bucket_medians,
          row.bucket_samples,
          row.bucket_errors,
        );

        // **A row that is neither an answer nor a refusal is DROPPED**, which
        // `volume_baselines_one_answer` and `volume_baselines_bucket_arity`
        // make unreachable from any writer here. It is dropped rather than
        // refused because there is no honest word for it: every member of
        // `VOLUME_REFUSALS` is a sentence about a baseline we have, and an
        // absent row already means *the pass has not answered for this
        // security*, which is the true thing to say about a row the schema
        // says cannot exist.
        if (buckets === undefined) return [];

        return [{ ...facts, refusal: null, buckets }];
      });
    },
  };
}
