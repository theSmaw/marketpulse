import { Kysely, PostgresDialect, sql } from "kysely";
import type pg from "pg";

import { toTicker } from "@marketpulse/shared";

import type { MarketFeed, Ticker } from "@marketpulse/shared";
import type { Database } from "./schema.js";
import type { BaselineSubject } from "./return-baseline-store.js";

/**
 * **The session ranking's database half, and the one place that knows there is
 * one** (Task 5.4.5, [ADR 0044](../../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)).
 *
 * `market-bars.ts`' seam, fourth instance: **build the `Kysely` instance here,
 * do not export it, export functions that return domain objects.** Both reads
 * below are over `observed_at` — the column Epic 13's plugin rewrites — and
 * `withPlugin` returns a *different object*, so the guarantee is worth nothing
 * if an unplugged handle can be imported.
 *
 * ## Its own module rather than three methods on `return-baseline-store.ts`
 *
 * They are written by one pass and share a pool, so the argument is not about
 * coupling. It is about what each module's reads are **of**: that one reads
 * ~24,000 `market_bars` rows per security and is the regime argument's home;
 * this one reads two small derived tables and never touches the heap. A reader
 * asking *what does the session ranking cost* should not have to walk past the
 * 538-block arithmetic to find out that the answer is a few hundred rows.
 *
 * ## The pass row is read FIRST, and that is the partial-failure answer
 *
 * The nightly pass writes one score per security as it goes and the pass row at
 * the end, outside a transaction (`compute-baselines.ts` says why: a pass that
 * dies has written every security it finished). So a crash leaves scores with
 * no pass row — and `readNewestSession` bounds the scores on the **pass row's**
 * `observed_at`, which makes that state invisible rather than half-drawn: no
 * pass row, no section, and the region draws its honest-nothing sentence.
 *
 * The three populations and the five refusal counts live on that row for the
 * reason `0014` §4 gives: a refused security has **no score row**, so on a
 * session where nothing was rankable there are no rows at all — and that is
 * exactly the session whose footer has to stay honest.
 */

/** One stored session score, as the cache and the producer read it. */
export interface StoredSessionPercentile {
  readonly symbol: Ticker;
  /** The integer ordinal, `0`–`99`. */
  readonly rank: number;
  readonly aboveSample: boolean;
  /** The counted `n` the ordinal was taken against. Never a constant. */
  readonly sampleCount: number;
  /** The **signed** move, as a percentage. The ranked magnitude's own figure. */
  readonly percent: number;
  readonly from: StoredSessionEndpoint;
  readonly to: StoredSessionEndpoint;
  /** How many of the span's minutes we hold a close for. */
  readonly observed: number;
}

/** One endpoint: the bar's own `startsAt`, its close, and its tape. */
export interface StoredSessionEndpoint {
  readonly at: Date;
  readonly price: number;
  readonly feed: MarketFeed;
}

/**
 * **What the pass was over, how much got past the line, and why the rest did
 * not** — one session's own figures, read off the row the pass wrote.
 *
 * Every figure here is the **producer's**, never this bundle's constant: see
 * `0014` §5 for the rollback that makes the difference visible.
 */
export interface StoredSessionPass {
  /** The scored session's close. The key, and what dates the figures. */
  readonly observedAt: Date;
  readonly tracked: number;
  readonly eligible: number;
  readonly scored: number;
  /** The five refusal counts, by the name each vocabulary gives it. */
  readonly refusals: StoredSessionRefusals;
  /** The span each row's endpoints are apart, in minutes. */
  readonly spanMinutes: number;
  readonly baseline: StoredSessionBaseline;
}

export interface StoredSessionRefusals {
  readonly nothingObserved: number;
  readonly noEarlierEndpoint: number;
  readonly noBasis: number;
  readonly tooFewSamples: number;
  readonly splitDiscontinuity: number;
}

/** What the ordinals were measured against, as the pass applied it. */
export interface StoredSessionBaseline {
  readonly feed: MarketFeed;
  readonly spanMinutes: number;
  readonly lookbackSessions: number;
  readonly minimumSampleCount: number;
}

/** One session's whole answer: the pass's figures and its ranked rows. */
export interface StoredSessionRanking {
  readonly pass: StoredSessionPass;
  /**
   * The scored securities — **not ranked here**. The order is
   * `selectByPercentile`'s, applied by the producer, because
   * `one-comparator-for-the-order-of-a-percentile` permits exactly one home
   * for it and a store that sorted would be the second.
   */
  readonly scores: readonly StoredSessionPercentile[];
}

/** What the nightly pass writes for one security. */
export interface SessionPercentileWrite {
  readonly rank: number;
  readonly aboveSample: boolean;
  readonly sampleCount: number;
  readonly percent: number;
  readonly from: StoredSessionEndpoint;
  readonly to: StoredSessionEndpoint;
  readonly observed: number;
}

/** What the nightly pass writes once, at the end of a session's pass. */
export type SessionPassWrite = Omit<StoredSessionPass, "observedAt">;

export interface SessionPercentileStore {
  /**
   * Write one security's score for one session. **An upsert on
   * `(security_id, observed_at)`**, so re-running `pnpm baselines` for a
   * session already stored converges rather than appending — `pnpm universe`'s
   * property, for `return_baselines`' reason: this table is derived and
   * recomputable.
   */
  writeScore(
    subject: BaselineSubject,
    observedAt: Date,
    score: SessionPercentileWrite,
  ): Promise<void>;

  /**
   * Write the session's own figures. **An upsert on `observed_at`**, written
   * **after** the scores — see the header for what a crash between them leaves
   * and why it is invisible.
   */
  writePass(observedAt: Date, pass: SessionPassWrite): Promise<void>;

  /**
   * **The newest session at or before an instant, with its scores** — or
   * `undefined` where no pass has been written at or before it, which is CI's
   * permanent state and every store before the first nightly run.
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
  ): Promise<StoredSessionRanking | undefined>;
}

export function createSessionPercentileStore(
  pool: pg.Pool,
): SessionPercentileStore {
  // Not exported, not returned, not reachable. See the header.
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  return {
    async writeScore(subject, observedAt, score) {
      const values = {
        rank: score.rank,
        above_sample: score.aboveSample,
        sample_count: score.sampleCount,
        percent: score.percent,
        from_at: score.from.at,
        from_price: score.from.price,
        from_feed: score.from.feed,
        to_at: score.to.at,
        to_price: score.to.price,
        to_feed: score.to.feed,
        observed_minutes: score.observed,
      };

      await db
        .insertInto("session_return_percentiles")
        .values({
          security_id: subject.id,
          // Supplied by the writer and never defaulted — `0014` §2.
          observed_at: observedAt,
          ...values,
        })
        .onConflict((oc) =>
          oc.columns(["security_id", "observed_at"]).doUpdateSet({
            ...values,
            // The same raw fragment `market-bars.ts` and
            // `return-baseline-store.ts` use on their correction paths: `now()`
            // is transaction start time, so a re-run's rows share one value.
            recorded_at: sql<Date>`now()`,
          }),
        )
        .execute();
    },

    async writePass(observedAt, pass) {
      const values = {
        tracked_count: pass.tracked,
        eligible_count: pass.eligible,
        scored_count: pass.scored,
        nothing_observed_count: pass.refusals.nothingObserved,
        no_earlier_endpoint_count: pass.refusals.noEarlierEndpoint,
        no_basis_count: pass.refusals.noBasis,
        too_few_samples_count: pass.refusals.tooFewSamples,
        split_discontinuity_count: pass.refusals.splitDiscontinuity,
        span_minutes: pass.spanMinutes,
        baseline_feed: pass.baseline.feed,
        baseline_span_minutes: pass.baseline.spanMinutes,
        baseline_lookback_sessions: pass.baseline.lookbackSessions,
        minimum_sample_count: pass.baseline.minimumSampleCount,
      };

      await db
        .insertInto("session_return_percentile_passes")
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
      // `readNewestGeneration`'s arrangement and its reason: the pass read is
      // one row and the score read is a few hundred, and a `max()` inlined as a
      // subquery would be re-planned against a growing table for no gain. A
      // session landing between them is simply not seen until the next refresh,
      // which the cache's own floor already tolerates.
      const pass = await db
        .selectFrom("session_return_percentile_passes")
        .select([
          "observed_at",
          "tracked_count",
          "eligible_count",
          "scored_count",
          "nothing_observed_count",
          "no_earlier_endpoint_count",
          "no_basis_count",
          "too_few_samples_count",
          "split_discontinuity_count",
          "span_minutes",
          "baseline_feed",
          "baseline_span_minutes",
          "baseline_lookback_sessions",
          "minimum_sample_count",
        ])
        .where("observed_at", "<=", atOrBefore)
        .orderBy("observed_at", "desc")
        .limit(1)
        .executeTakeFirst();

      if (pass === undefined) return undefined;

      const rows = await db
        .selectFrom("session_return_percentiles")
        .innerJoin(
          "securities",
          "securities.id",
          "session_return_percentiles.security_id",
        )
        .select([
          "securities.symbol",
          "session_return_percentiles.rank",
          "session_return_percentiles.above_sample",
          "session_return_percentiles.sample_count",
          "session_return_percentiles.percent",
          "session_return_percentiles.from_at",
          "session_return_percentiles.from_price",
          "session_return_percentiles.from_feed",
          "session_return_percentiles.to_at",
          "session_return_percentiles.to_price",
          "session_return_percentiles.to_feed",
          "session_return_percentiles.observed_minutes",
        ])
        // **Bounded on the PASS row's session**, never on the argument — see
        // the header: that is what makes a crashed pass invisible instead of
        // serving one session's scores under another session's figures.
        .where("session_return_percentiles.observed_at", "=", pass.observed_at)
        // No filter on `securities.status`. See the interface.
        .orderBy("securities.symbol")
        .execute();

      // **One function per domain type, beside the query** — and here that is
      // where a `numeric` string and a `bigint` string become the numbers a
      // ranking is taken over. A generic mapper is where that decision gets
      // skipped.
      const scores = rows.flatMap<StoredSessionPercentile>((row) => {
        const percent = Number(row.percent);
        const sampleCount = Number(row.sample_count);
        const from = Number(row.from_price);
        const to = Number(row.to_price);

        // **A row whose figures do not parse is DROPPED rather than refused.**
        // Every `check` in `0014` makes this unreachable from any writer in
        // this repository — a `numeric` that is not a number, a `NaN` percent, a
        // sample count of zero — and there is no honest refusal word for it
        // either: the five are sentences about securities the pass *examined*,
        // and this is a row nothing in the schema says can exist. Dropping it
        // leaves `scored` above the rows, which is the only direction the
        // reader's own `rows ≤ scored` chain permits.
        if (!Number.isFinite(percent)) return [];
        if (!Number.isInteger(sampleCount) || sampleCount <= 0) return [];
        if (!Number.isFinite(from) || !Number.isFinite(to)) return [];

        return [
          {
            symbol: toTicker(row.symbol),
            rank: row.rank,
            aboveSample: row.above_sample,
            sampleCount,
            percent,
            from: { at: row.from_at, price: from, feed: row.from_feed },
            to: { at: row.to_at, price: to, feed: row.to_feed },
            observed: row.observed_minutes,
          },
        ];
      });

      return {
        pass: {
          observedAt: pass.observed_at,
          tracked: Number(pass.tracked_count),
          eligible: Number(pass.eligible_count),
          scored: Number(pass.scored_count),
          refusals: {
            nothingObserved: Number(pass.nothing_observed_count),
            noEarlierEndpoint: Number(pass.no_earlier_endpoint_count),
            noBasis: Number(pass.no_basis_count),
            tooFewSamples: Number(pass.too_few_samples_count),
            splitDiscontinuity: Number(pass.split_discontinuity_count),
          },
          spanMinutes: pass.span_minutes,
          baseline: {
            feed: pass.baseline_feed,
            spanMinutes: pass.baseline_span_minutes,
            lookbackSessions: pass.baseline_lookback_sessions,
            minimumSampleCount: Number(pass.minimum_sample_count),
          },
        },
        scores,
      };
    },
  };
}
