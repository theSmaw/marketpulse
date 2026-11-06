import { Kysely, PostgresDialect, sql } from "kysely";
import type pg from "pg";

import { toTicker } from "@marketpulse/shared";
import type { MarketFeed, Ticker } from "@marketpulse/shared";

import type { Database, ReturnCorrelationsTable } from "./schema.js";

/**
 * **The pairwise correlation's database half, and the one place that knows
 * there is one** (Task 6.5.1, ADR 0049).
 *
 * `excess-move-baseline-store.ts`' arrangement, fifth instance: build the
 * `Kysely` instance here, do not export it, export functions that return
 * domain objects. The reason is the same and is sharper on the derived tables
 * than anywhere else — every read is over a column Epic 13's plugin rewrites,
 * and `withPlugin` returns a **different object**, so the guarantee is worth
 * nothing if an unplugged handle can be imported.
 *
 * ## It reads NO BARS, and it reads nothing at all today
 *
 * This module is a **writer**. The pass's own reads already exist: one ordered
 * index range scan of `market_bars` per security through
 * `ReturnBaselineStore.readWindowCloses`, measured at **538 correlated
 * blocks**, which is the read the correlation's input series is a by-product
 * of. A second read here would be a second definition of the same query —
 * Task 4.8.11's lesson, *an instrument that describes a second copy of the
 * subject is measuring the copy*.
 *
 * ~~**There is deliberately no read method at all**~~ — **false since
 * 2026-11-06 (Task 6.5.2), on the condition this paragraph itself named.** The
 * struck text is kept because it is the reason the read below has the shape it
 * has rather than a shape somebody guessed at a story earlier: `0018`'s rows
 * are read by **nothing**
 * until Task 6.5.2 builds the route. A `readNewestGeneration` written now
 * would be a query shaped against a reader that does not exist yet, and
 * `0018` §7's index decision is explicitly written against the read Task 6.5.2
 * will actually issue. The condition for adding one is that task.
 *
 * {@link ReturnCorrelationStore.readNewestGeneration} is that read, and it is
 * **the whole generation of one session and only that** — the second step of
 * the two-step `0018` §7 argues the `(observed_at, …)`-leading key for, with
 * no per-node query anywhere. That matters beyond tidiness: there is
 * deliberately **no index on `security_high_id`**, so *every edge touching one
 * security* is a scan, and the condition for adding one is still the condition
 * that file states — the first reader that asks for one node's edges without
 * reading the whole generation. This is not that reader, and a graph could not
 * be one: an edge layer is meaningless an edge at a time.
 *
 * ## The pair is resolved by TICKER and written as two ids
 *
 * `0018` §3: `security_low_id` is the security whose **ticker** sorts lower,
 * because `securities.id` is assigned in row-insertion order and CI's store
 * and the deployed store disagree about that order. The canonicalisation
 * therefore happens **here**, against the ticker, and the ids are looked up
 * afterwards — never the other way round. `return_correlations_one_row_per_unordered_pair`
 * in the database refuses the reverse orientation of a stored pair without
 * needing to know the ticker order, and that is the only part of this rule the
 * database can express — a `check (low < high)` would have refused legitimate
 * rows, because ticker order and id order are different orders (migration §3).
 *
 * ## Two statements, no transaction, pass row LAST
 *
 * Which is every sibling pass's arrangement and is kept rather than
 * reconsidered — `excess-move-baseline-store.ts`, `volume-baseline-store.ts`
 * and `session-percentile-store.ts` all write their rows and then their pass
 * row, outside a transaction, and `compute-baselines.ts` states why: a pass
 * that dies has written what it finished, and **the pass row is the thing that
 * makes a generation readable**, because a reader reads the pass row first and
 * the rows for its `observed_at`. A crash between the two leaves rows nothing
 * reads rather than a session drawn under the wrong figures.
 *
 * It is worth saying that the argument is **weaker here than one table over**
 * and still points the same way. The per-security tables are resumable as
 * their loop progresses; this table's rows all arrive at once, after the
 * pairwise phase, so wrapping them in a transaction would buy atomicity the
 * pass does not otherwise have. What it would not buy is any protection a
 * reader can use — the pass row already bounds the generation — and it would
 * hold one of `POOL_MAX = 10` connections open across thousands of inserts for
 * a window the nightly runner has no other contention in.
 */

/** The parameters one pass computed its correlations under. */
export interface ReturnCorrelationParameters {
  /** `CORRELATION_LOOKBACK_SESSIONS`, read and never spelled. */
  readonly lookbackSessions: number;
  /** The grid's stride — `SAMPLE_SPAN_MINUTES`. */
  readonly spanMinutes: number;
  /** The tape both legs were read on — `BASELINE_FEED`'s. `0018` §8. */
  readonly feed: MarketFeed;
}

/**
 * One retained pair, as the pass hands it to be written.
 *
 * The two tickers are in **canonical order** — `low` sorts lexicographically
 * before `high` — which this module asserts rather than assumes, because the
 * assertion is the one place the ticker rule can be held at all.
 */
export interface RetainedCorrelation {
  readonly low: Ticker;
  readonly high: Ticker;
  /** Pearson's `r`, signed, in `[-1, 1]`. */
  readonly r: number;
  /** The counted overlap, at or above `CORRELATION_MINIMUM_OVERLAP`. */
  readonly n: number;
}

/**
 * **What one pass did, at both grains** — `0018` §5.
 *
 * The security populations **partition** and the pair populations **nest**,
 * and the database holds both arithmetics. The one judgement a reader of this
 * type needs is why `belowSignificance` is not in `refusals`: *we could not
 * measure this* and *we measured this and it is not distinguishable from zero*
 * are different facts with different repairs.
 */
export interface ReturnCorrelationPassWrite {
  /** The active equities the pass was over — `equityTickers()`' population. */
  readonly trackedEquities: number;
  /** Passed the split guard and produced at least one grid return. */
  readonly eligibleEquities: number;
  /** The price pass's own verdict, inherited rather than re-evaluated. */
  readonly splitDiscontinuity: number;
  /** No stored grid pair at all — **no row written**, and CI's whole state. */
  readonly absent: number;

  /** `C(eligible, 2)`. */
  readonly candidatePairs: number;
  /** Cleared the overlap floor and produced a finite coefficient. */
  readonly computedPairs: number;
  /** In some node's top-N **and** significant. The rows this pass wrote. */
  readonly retainedPairs: number;

  /** The two pair-grain refusals, which sum to `candidate − computed`. */
  readonly refusals: CorrelationRefusalTally;
  /** Computed, finite, and not distinguishable from zero. The **cut**. */
  readonly belowSignificance: number;

  /** The `N` applied — Story 6.5's own provisional figure. */
  readonly retainedN: number;
  readonly parameters: ReturnCorrelationParameters;
}

/** The candidate/computed gap's breakdown. `0018` §5. */
export interface CorrelationRefusalTally {
  tooFewOverlappingSamples: number;
  zeroVariance: number;
}

/**
 * One retained pair, as a reader gets it back — the write shape with the
 * tickers resolved out of `securities` again (Task 6.5.2).
 *
 * **Structurally identical to {@link RetainedCorrelation} and deliberately a
 * second type.** The writer's version is a claim this module asserts the
 * canonical order of; this one is a row that has been through the database,
 * where the orientation is held by `0018`'s unordered-pair index rather than
 * by the ticker rule. They agree today, and a single type would make the
 * reader look like it had inherited the writer's assertion, which it has not.
 */
export interface StoredCorrelation {
  readonly low: Ticker;
  readonly high: Ticker;
  /** Pearson's `r`, signed. Parsed from `numeric`. */
  readonly r: number;
  readonly n: number;
}

/**
 * One pass's own figures, read off the row the pass wrote.
 *
 * `StoredSessionPass`' shape, and every figure here is the **producer's**
 * rather than anything this module counted: `retainedPairs` is what the pass
 * says it kept, which a reader may compare against the rows it was handed.
 */
export interface StoredCorrelationPass extends Omit<
  ReturnCorrelationPassWrite,
  "parameters"
> {
  /** The session the pass is FOR — its window's end. The key. */
  readonly observedAt: Date;
  readonly parameters: ReturnCorrelationParameters;
}

/** One session's whole answer: the pass's figures and its retained pairs. */
export interface StoredCorrelationGeneration {
  readonly pass: StoredCorrelationPass;
  /**
   * The retained pairs, ordered by `low` then `high`.
   *
   * **Not ranked**, which is `StoredSessionRanking.scores`' own rule for its
   * own reason: the ranking is `selectStrongestCorrelations`' and a store that
   * sorted by `|r|` would be a second home for the comparator Task 6.5.1
   * deliberately kept to one. The order here is an identity order, so two
   * reads of one generation are byte-comparable.
   */
  readonly correlations: readonly StoredCorrelation[];
}

export interface ReturnCorrelationStore {
  /**
   * **Write one pass's retained pairs**, resolving each ticker to its
   * `securities.id`.
   *
   * **An upsert on the full key**, so re-running `pnpm baselines` for a window
   * that is already stored converges on the store rather than appending —
   * `pnpm universe`'s property, for this table's reason: it is derived and
   * recomputable, and `N` is already known to be provisional.
   *
   * It does **not** delete the rows a previous run wrote and this one did not.
   * That is stated rather than hidden: a re-run under a *smaller* `N`, or
   * after a curation change, converges each pair it writes and leaves a
   * stale pair standing. The condition for adding a delete is a reader that
   * draws the whole generation and would therefore draw the stale edge —
   * which is Task 6.5.2, and is the first task that can say what the delete's
   * bound should be.
   *
   * @returns `retained.length` — the writer's own count of what it was ASKED
   *   to write, not a read-back of what PostgreSQL reports affected. This is
   *   trustworthy rather than measured: `on conflict … do update` affects
   *   every supplied row, a within-batch duplicate pair would raise "command
   *   cannot affect row a second time" rather than silently short-writing,
   *   and `retained` arrives already de-duplicated from
   *   `selectStrongestCorrelations`. A caller wanting the database's own
   *   affected-row count rather than this argument would read
   *   `InsertResult.numInsertedOrUpdatedRows` instead.
   */
  writeCorrelations(
    observedAt: Date,
    parameters: ReturnCorrelationParameters,
    retained: readonly RetainedCorrelation[],
  ): Promise<number>;

  /** Write the pass's own row, once, at the end. */
  writePass(observedAt: Date, pass: ReturnCorrelationPassWrite): Promise<void>;

  /**
   * **The newest pass at or before an instant, with every pair it retained** —
   * or `undefined` where no pass has been written at or before it, which is
   * CI's permanent state and every store's before the first `pnpm baselines`
   * (Task 6.5.2).
   *
   * ## The pass row is read FIRST, and that is the partial-failure answer
   *
   * `session-percentile-store.ts`' arrangement and its reason, which applies
   * **more** sharply here: this module writes its rows and then its pass row
   * **outside a transaction** (see the header), so a crash between the two
   * leaves retained pairs with no pass row. Bounding the rows on the **pass
   * row's own `observed_at`** makes that state invisible rather than
   * half-drawn — no pass row, no edges, and the surface draws its honest
   * absence sentence instead of a graph with a third of a night's edges on it.
   *
   * ## Two statements rather than a correlated subquery
   *
   * `readNewestSession`' arrangement verbatim: the pass read is one row and
   * the pair read is a bounded set (1,860 on the one store this has run
   * against), and a `max()` inlined as a subquery would be re-planned against
   * a growing table for no gain. A generation landing between the two
   * statements is simply not seen until the next read.
   *
   * ## It does not filter on `securities.status`
   *
   * `UNIVERSE.md` §12.2's second side: this is a read of something we
   * **stored**, and a security untracked this morning still had a correlation
   * that was true when it was computed. The drawn graph drops the edge anyway
   * — `withCorrelationEdges` refuses an endpoint that is not a node — and that
   * is the right place for it, because *which securities we track now* is the
   * renderer's question and not this row's.
   *
   * The bound is an **argument rather than a clock**, which is `closesAsOf`'s
   * shape and ADR 0015's gap 4: under a replay Epic 13's plugin additionally
   * narrows `observed_at` inside both queries, so this expression answers *the
   * newest pass that had already run* with no second code path.
   */
  readNewestGeneration(
    atOrBefore: Date,
  ): Promise<StoredCorrelationGeneration | undefined>;
}

/**
 * The bind-parameter ceiling, and the columns one correlation row supplies.
 *
 * `market-bars.ts`' idiom and its recorded reason: **this list sizes the chunk,
 * so it must be the list the insert actually uses.** A column added to the
 * `values` below without being added here asks PostgreSQL for more parameter
 * formats than the ceiling was computed for, which is a loud failure at the
 * chunk boundary rather than a silent short write — and is the failure that
 * caught exactly this mistake on `market_bars` within a minute.
 *
 * `recorded_at` is deliberately absent: it defaults to `now()`, transaction
 * start time, so every row one statement writes shares one value.
 */
const MAX_BIND_PARAMETERS = 65_535;

const CORRELATION_COLUMNS = [
  "security_low_id",
  "security_high_id",
  "observed_at",
  "coefficient",
  "sample_count",
  "lookback_sessions",
  "span_minutes",
  "feed",
] as const satisfies readonly (keyof ReturnCorrelationsTable)[];

export function createReturnCorrelationStore(
  pool: pg.Pool,
): ReturnCorrelationStore {
  // Not exported, not returned, not reachable. See the header.
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  return {
    async writeCorrelations(observedAt, parameters, retained) {
      if (retained.length === 0) return 0;

      // **One lookup of every ticker this pass retained**, rather than one
      // query per row. The pass has already read every one of these securities
      // from `activeSubjects()`, but it reads them as `BaselineSubject`s and
      // the pairs arrive here as tickers — so the resolution happens once,
      // here, where the canonicalisation rule is.
      const symbols = [
        ...new Set(retained.flatMap((pair) => [pair.low, pair.high])),
      ];

      const rows = await db
        .selectFrom("securities")
        .select(["id", "symbol"])
        // **No filter on `securities.status`**, which is `UNIVERSE.md` §12.2's
        // rule: the pass chose its own population by `equityTickers()` before
        // reaching here, and this is a read of an identity rather than a
        // computation over the market we track now.
        .where("symbol", "in", symbols)
        .execute();

      const idOf = new Map(rows.map((row) => [row.symbol, row.id]));

      const values = retained.map((pair) => {
        // **The canonicalisation, asserted rather than assumed.** This is the
        // one place the ticker rule exists, and a pair arriving the wrong way
        // round reaches the database as a perfectly legal row: the unordered
        // -pair index refuses a DUPLICATE of a stored pair and has no opinion
        // about which column holds which id, and it cannot have one, because
        // ticker order and id order are different orders. So the orientation
        // is checked here, on the tickers, where the rule is true.
        if (pair.low.localeCompare(pair.high) >= 0) {
          throw new RangeError(
            `(${pair.low}, ${pair.high}) is not in canonical ticker order. ` +
              "`security_low_id` is the security whose TICKER sorts lower — " +
              "never whose id is lower, because ids are assigned in " +
              "row-insertion order and CI's store and the deployed store " +
              "disagree about that order. See " +
              "`0018_return_correlations.sql` §3.",
          );
        }

        const low = idOf.get(pair.low);
        const high = idOf.get(pair.high);

        if (low === undefined || high === undefined) {
          throw new RangeError(
            `${low === undefined ? pair.low : pair.high} is not a row in ` +
              "`securities`, so a correlation naming it cannot be written. " +
              "A universe load (`pnpm universe`) is what repairs this.",
          );
        }

        return {
          security_low_id: low,
          security_high_id: high,
          // Supplied by the writer and never defaulted — `0018` §2.
          observed_at: observedAt,
          coefficient: pair.r,
          sample_count: pair.n,
          lookback_sessions: parameters.lookbackSessions,
          span_minutes: parameters.spanMinutes,
          feed: parameters.feed,
        };
      });

      const size = Math.max(
        1,
        Math.floor(MAX_BIND_PARAMETERS / CORRELATION_COLUMNS.length),
      );

      for (let index = 0; index < values.length; index += size) {
        await db
          .insertInto("return_correlations")
          .values(values.slice(index, index + size))
          .onConflict((oc) =>
            oc
              .columns(["observed_at", "security_low_id", "security_high_id"])
              .doUpdateSet((eb) => ({
                // **`excluded`, not a captured constant**, because this is one
                // statement over many rows: a captured value would write the
                // first row's coefficient into every conflicting row. The
                // `doUpdateSet` on the single-row sibling stores can capture
                // safely and this one cannot, which is the only way this upsert
                // differs from theirs.
                coefficient: eb.ref("excluded.coefficient"),
                sample_count: eb.ref("excluded.sample_count"),
                lookback_sessions: eb.ref("excluded.lookback_sessions"),
                span_minutes: eb.ref("excluded.span_minutes"),
                // **`feed` is deliberately NOT updated, and `schema.ts`
                // declares it `never` on update so this is a compile error
                // rather than a choice.** A row records which tape its two
                // legs were observed on, and an upsert that rewrote that would
                // be changing what the row is a record *of* rather than
                // correcting its value — ADR 0045 §3's sentence, arriving on a
                // column that is not in the key. A tape change here is a
                // **recompute** (§1: delete and re-run), which is the one
                // operation that cannot leave a coefficient and a tape label
                // out of step.
                // `market-bars.ts`' correction path's idiom: `now()` is
                // transaction start time, so a re-run's rows share one value.
                recorded_at: sql<Date>`now()`,
              })),
          )
          .execute();
      }

      return values.length;
    },

    async writePass(observedAt, pass) {
      const values = {
        tracked_equities_count: pass.trackedEquities,
        eligible_equities_count: pass.eligibleEquities,
        split_discontinuity_count: pass.splitDiscontinuity,
        absent_count: pass.absent,
        candidate_pairs_count: pass.candidatePairs,
        computed_pairs_count: pass.computedPairs,
        retained_pairs_count: pass.retainedPairs,
        too_few_overlapping_samples_count:
          pass.refusals.tooFewOverlappingSamples,
        zero_variance_count: pass.refusals.zeroVariance,
        below_significance_count: pass.belowSignificance,
        retained_n: pass.retainedN,
        lookback_sessions: pass.parameters.lookbackSessions,
        span_minutes: pass.parameters.spanMinutes,
        feed: pass.parameters.feed,
      };

      await db
        .insertInto("return_correlation_passes")
        .values({ observed_at: observedAt, ...values })
        .onConflict((oc) =>
          oc
            .columns(["observed_at"])
            .doUpdateSet({ ...values, recorded_at: sql<Date>`now()` }),
        )
        .execute();
    },

    async readNewestGeneration(atOrBefore) {
      const pass = await db
        .selectFrom("return_correlation_passes")
        .select([
          "observed_at",
          "tracked_equities_count",
          "eligible_equities_count",
          "split_discontinuity_count",
          "absent_count",
          "candidate_pairs_count",
          "computed_pairs_count",
          "retained_pairs_count",
          "too_few_overlapping_samples_count",
          "zero_variance_count",
          "below_significance_count",
          "retained_n",
          "lookback_sessions",
          "span_minutes",
          "feed",
        ])
        .where("observed_at", "<=", atOrBefore)
        .orderBy("observed_at", "desc")
        .limit(1)
        .executeTakeFirst();

      if (pass === undefined) return undefined;

      // **Two aliased joins of one table**, which is the first query in this
      // repository that needs them — a pair row names two securities, and
      // resolving both ends in one statement is what keeps this a single
      // bounded read rather than a per-row lookup or a second pass over the
      // universe. The aliases are `low`/`high` to match `0018`'s own columns.
      const rows = await db
        .selectFrom("return_correlations")
        .innerJoin(
          "securities as low",
          "low.id",
          "return_correlations.security_low_id",
        )
        .innerJoin(
          "securities as high",
          "high.id",
          "return_correlations.security_high_id",
        )
        .select([
          "low.symbol as low_symbol",
          "high.symbol as high_symbol",
          "return_correlations.coefficient",
          "return_correlations.sample_count",
        ])
        // **Bounded on the PASS row's session**, never on the argument — see
        // the interface: that is what makes a crashed pass invisible instead
        // of serving part of one night's edges under no figures at all.
        .where("return_correlations.observed_at", "=", pass.observed_at)
        // No filter on `securities.status`. See the interface.
        .orderBy("low.symbol")
        .orderBy("high.symbol")
        .execute();

      // **One function per domain type, beside the query** — and here that is
      // where a `numeric` string and a `bigint` string become the numbers a
      // drawn edge rests on. A generic mapper is where that decision gets
      // skipped.
      const correlations = rows.flatMap<StoredCorrelation>((row) => {
        const r = Number(row.coefficient);
        const n = Number(row.sample_count);

        // **A row whose figures do not parse is DROPPED rather than refused**,
        // which is `readNewestSession`'s own judgement and the same argument:
        // every `check` in `0018` makes this unreachable from any writer in
        // this repository — a coefficient outside `[-1, 1]`, a `NaN`, an
        // overlap below the floor — and there is no honest refusal word for a
        // row the schema says cannot exist. Dropping it leaves
        // `pass.retainedPairs` **above** the rows, which is the only direction
        // a reader's own nesting chain permits.
        if (!Number.isFinite(r) || r < -1 || r > 1) return [];
        if (!Number.isInteger(n) || n <= 0) return [];

        return [
          {
            low: toTicker(row.low_symbol),
            high: toTicker(row.high_symbol),
            r,
            n,
          },
        ];
      });

      return {
        pass: {
          observedAt: pass.observed_at,
          trackedEquities: Number(pass.tracked_equities_count),
          eligibleEquities: Number(pass.eligible_equities_count),
          splitDiscontinuity: Number(pass.split_discontinuity_count),
          absent: Number(pass.absent_count),
          candidatePairs: Number(pass.candidate_pairs_count),
          computedPairs: Number(pass.computed_pairs_count),
          retainedPairs: Number(pass.retained_pairs_count),
          refusals: {
            tooFewOverlappingSamples: Number(
              pass.too_few_overlapping_samples_count,
            ),
            zeroVariance: Number(pass.zero_variance_count),
          },
          belowSignificance: Number(pass.below_significance_count),
          retainedN: pass.retained_n,
          parameters: {
            lookbackSessions: pass.lookback_sessions,
            spanMinutes: pass.span_minutes,
            feed: pass.feed,
          },
        },
        correlations,
      };
    },
  };
}
