import { Kysely, PostgresDialect, sql } from "kysely";
import type pg from "pg";

import { toTicker, type Ticker, type TimeRange } from "@marketpulse/shared";

import { createMarketBarsRepository } from "./market-bars.js";
import type { Database } from "./schema.js";
import type { ReturnBaselineOutcome } from "./return-baseline.js";
import type { ReturnBaselineRefusal } from "@marketpulse/shared";

/**
 * **The baseline's database half, and the one place that knows there is one**
 * (Task 5.3.2, [ADR 0044](../../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)).
 *
 * `market-bars.ts`' seam, third instance: **build the `Kysely` instance here,
 * do not export it, export functions that return domain objects.** The reason
 * is sharper on this module than on either of the first two, because every read
 * below is over `market_bars.observed_at` — the column Epic 13's plugin
 * rewrites — and `withPlugin` returns a *different object*, so the guarantee is
 * worth nothing if an unplugged handle can be imported.
 *
 * ## The regime, which the query shape decides by two orders of magnitude
 *
 * Measured cold on a store holding 48,797,343 bars: a single security's
 * 60-session read is **`Buffers: shared hit=8 read=538`, 58.4 ms, 24,142 rows**
 * — **~45 rows a block**, so the heap is **well correlated**. The whole universe
 * is ~269,538 blocks ≈ 2,105 MB, which is **~3.5 minutes** at `HOSTING.md`'s
 * 10 MiB/s and **~37 minutes** at the **120 provisioned IOPS** if the fetches
 * are uncorrelated.
 *
 * **So the pass is one index range scan per security, taken deliberately and
 * against the task file's own preference**, and the argument is the correlation
 * figure above. `market_bars_unique_bar` is
 * `(security_id, timeframe, observed_at, feed)`: with `security_id` and
 * `timeframe` fixed and `observed_at` ranged, that is **one already-ordered
 * range scan reading 538 physically adjacent blocks**, which is the bandwidth
 * regime rather than the IOPS one — the 37-minute figure prices *uncorrelated*
 * fetches and this shape has none. The alternative, a single pass with no
 * `security_id` predicate, has to produce `order by security_id, observed_at`
 * over 11.7 million rows: the planner under-estimates this read by **212×**
 * (`rows=114` against 24,142 actual), which is exactly the input that turns that
 * shape into a sequential scan over 5 GB **plus** an external sort, on a tier
 * whose `shared_buffers` is 256 MB. One scan per security is bounded,
 * streamable inside 0.5 GiB, and resumable; `GET /diagnostics/baseline-cost`
 * measures that unit on the deployed store because that unit **is** the pass.
 *
 * ## What is NOT done here, and each absence is somebody's recorded defect
 *
 * **No `distinct on`.** It is the first thing a copier of `readSeries` reaches
 * for and it is wrong four ways here: without a tie-break the surviving row per
 * instant is **arbitrary**, mixing consolidated and single-venue closes inside
 * one distribution; even with `SERVED_TAPE_ORDER` it admits every **IEX-only**
 * minute, so the baseline's tails move with **the hour it was built**; it adds a
 * sort over millions of rows; and `distinct on (observed_at)` **collapses across
 * securities**, returning one row per minute for the entire market — a
 * well-formed answer that is 1/516th of the data.
 *
 * **`feed = 'sip'` is written by name**, never as `SERVED_TAPE_RANK`'s first
 * entry. That record is a *preference* for serving a chart the best history
 * available; AC 5 is a *restriction* to one tape, because minutes in progress
 * and extended hours are the live IEX tape's permanently and a preference
 * silently admits them in whatever proportion the hour supplies. The two
 * happen to agree on which feed wins and disagree completely about what to do
 * with the loser.
 *
 * **Every predicate is a builder predicate and there is no `sql` fragment in a
 * `where`.** The one raw fragment in this file is `now()` in an `on conflict`
 * update, which is neither a temporal filter nor anything Epic 13's plugin
 * needs to rewrite — `market-bars.ts`' own standard, and the same fragment it
 * already uses on its correction path.
 */

/** A security the pass has to compute for: the row id, and the ticker. */
export interface BaselineSubject {
  /** `securities.id`, a `bigint`, carried as a string. Never a `number`. */
  readonly id: string;
  readonly symbol: Ticker;
}

/** What every stored row carries, answer or refusal. */
interface StoredReturnBaselineFacts {
  readonly symbol: Ticker;
  /** The window's end — the session close instant the generation is FOR. */
  readonly observedAt: Date;
  readonly lookbackSessions: number;
  /**
   * The counted `n` the pass reached. **A refused row carries one too**,
   * because *how much we had* is the first question asked of a refusal.
   */
  readonly sampleCount: number;
}

/** A stored generation with a distribution in it. */
export interface RankableReturnBaseline extends StoredReturnBaselineFacts {
  readonly refusal: null;
  /** {@link BASELINE_BREAKPOINT_COUNT} ascending magnitudes. */
  readonly breakpoints: readonly number[];
}

/**
 * A stored generation the pass **declined** to compute, and the arm with
 * **no `breakpoints` member at all** (Task 5.3.4).
 */
export interface RefusedReturnBaseline extends StoredReturnBaselineFacts {
  readonly refusal: ReturnBaselineRefusal;
}

/**
 * **One stored generation, as the cache reads it — a union rather than two
 * nullable columns** (Task 5.3.4).
 *
 * `0013_return_baselines.sql`'s `return_baselines_one_answer` makes *both* and
 * *neither* unrepresentable **in the database**; this is the same constraint
 * expressed in the type system, and it is `CLAUDE.md`'s own rule about this
 * seam: *the mapping is exactly where a nullable column becomes an explicit
 * domain answer, and a generic mapper is where that decision gets skipped.*
 *
 * What it buys is a compile error rather than a test: a reader holding a
 * refused generation **cannot ask for its breakpoints**, because the member
 * does not exist on that arm. The previous shape — `readonly number[] | null`
 * beside `ReturnBaselineRefusal | null` — let a caller read `?.breakpoints`
 * off either and decide for itself, which is the narrowing Task 5.3.3's join
 * site did by hand and the next reader would have had to repeat.
 *
 * **The sample bound is NOT applied here**, deliberately. `comparableBaseline`
 * in `return-percentile.ts` owns it, because this module's job is to say what
 * the row holds — a store whose domain answer disagreed with
 * `select refusal from return_baselines` is a debugging trap, and the bound is
 * a statement about what may be **printed** rather than about what was
 * stored.
 */
export type StoredReturnBaseline =
  RankableReturnBaseline | RefusedReturnBaseline;

/**
 * What `GET /diagnostics/baseline-cost` answers with — the measurement no
 * machine outside Azure can take.
 *
 * **The plan node types are the most valuable fields here**, not the
 * milliseconds. Locally the planner under-estimates this read by 212×, and
 * whether the deployed planner picks an `Index Scan` or a `Seq Scan` is the
 * difference between ~3.5 minutes and tens of minutes for the whole pass.
 */
export interface BaselineReadCost {
  /** The top plan node's type, from Postgres's own fixed vocabulary. */
  readonly planNodeType: string;
  /**
   * The innermost node whose type names a scan, or `null` if the plan has
   * none.
   *
   * **Two fields rather than one, because the top node is routinely not the
   * interesting one.** An `Index Scan` under a `Sort` and a `Seq Scan` under
   * the same `Sort` have identical top nodes and differ by the whole cost
   * question.
   */
  readonly scanNodeType: string | null;
  /** The planner's row estimate — half of the 212× under-estimate. */
  readonly planRows: number;
  /** The rows it actually returned — the other half. */
  readonly actualRows: number;
  /** Blocks found in `shared_buffers`, cumulative over the plan. */
  readonly sharedHitBlocks: number;
  /** Blocks read from disk, cumulative. The figure the arithmetic uses. */
  readonly sharedReadBlocks: number;
  /** `Actual Total Time` on the top node, in milliseconds. */
  readonly elapsedMs: number;
}

/** The two tape counts over one security's window. */
export interface BaselineTapeCounts {
  readonly sip: number;
  readonly iex: number;
}

export interface ReturnBaselineStore {
  /**
   * The securities the pass computes for: `status = 'active'`.
   *
   * **This one filters**, and that is `UNIVERSE.md` §12.2's rule rather than a
   * default: a baseline is a computation over the market we track **now**, so
   * the two symbols Task 2.3.9 untracked must not consume a 538-block read
   * apiece. A read of something we **stored** — which is what the generation
   * read below is — does not filter, and does not.
   */
  activeSubjects(): Promise<readonly BaselineSubject[]>;

  /**
   * **The window's end, from `bar_coverage`'s covered end** and never from
   * `lastCompletedSession(now)`. Delegated to
   * `MarketBarsRepository.readCoveredEnd`, which is the ledger's one querier.
   *
   * Those two disagree between the bell and the nightly run — the market has
   * completed a session the fill has not yet stored — and the disagreement is
   * the `loadedFor` defect one surface over: a generation stamped with a
   * session whose bars are not in the store is a baseline over 59 sessions
   * claiming 60, which nothing downstream can detect.
   *
   * **The MAXIMUM over tracked securities, not the minimum.** The minimum is
   * `commonCoverage`'s intersection, which is dragged permanently backwards by
   * late-listing constituents — `backfill.yml` records three of them by name —
   * so one security that will never hold older history would hold the whole
   * universe's baseline a year behind. The maximum is the frontier the fill
   * reached, and a security that is itself behind simply contributes fewer
   * grid pairs to its own counted `n`.
   */
  coveredEnd(): Promise<Date | undefined>;

  /**
   * One security's `sip` minute closes over the window, keyed by the bar's own
   * `startsAt` in epoch milliseconds.
   *
   * **Every close in the window rather than only the grid anchors.** The
   * anchors are 1 in 5 of these rows and sit in the same 538 blocks — a
   * 5-minute stride over a heap holding ~45 rows a block touches
   * essentially every block either way — so filtering them in SQL would buy
   * no I/O at all, and the only shape that could express it is either 4,680
   * bind parameters a security or an `extract(minute from …)` whose answer
   * depends on the session's `TimeZone`. Which minute is an anchor is a
   * **calendar** question and `market-time.ts` is the only module allowed to
   * answer it; `return-baseline.ts` selects the anchors from this map.
   *
   * The stated cost of that choice: the pass deserialises ~11.7 M rows rather
   * than ~2.4 M. It runs on a GitHub runner, not in the 0.25 vCPU container.
   */
  readWindowCloses(
    subject: BaselineSubject,
    window: TimeRange,
  ): Promise<ReadonlyMap<number, number>>;

  /**
   * One security by its ticker, or `undefined` for a symbol this store has
   * never heard of.
   *
   * It exists for `GET /diagnostics/baseline-cost`, whose parameter is a
   * **symbol** while every read above is keyed on the row **id** — see
   * `windowQuery`'s note for the `Sort` that measurement removed. A diagnostic
   * that resolved the symbol its own way would be measuring its own query.
   */
  subjectFor(symbol: Ticker): Promise<BaselineSubject | undefined>;

  /**
   * Write one generation. **An upsert on `(security_id, observed_at)`**, so
   * re-running `pnpm baselines` for a window that is already stored converges
   * on the file rather than appending — `pnpm universe`'s property, for the
   * same reason: this table is derived and recomputable.
   */
  writeBaseline(
    subject: BaselineSubject,
    observedAt: Date,
    lookbackSessions: number,
    outcome: ReturnBaselineOutcome,
  ): Promise<void>;

  /**
   * **The newest generation at or before an instant** — every security's row
   * for one window end, which is what the in-memory cache holds.
   *
   * It does **not** filter on `securities.status`: this is a read of something
   * we stored, and a security untracked last week still has a baseline that was
   * true when it was computed.
   *
   * The bound is an argument rather than a clock, which is `closesAsOf`'s shape
   * and ADR 0015's gap 4: Epic 13's plugin additionally narrows `observed_at`
   * on its own, so under a replay this expression answers *the newest
   * generation whose window had already closed* with no second code path.
   */
  readNewestGeneration(
    atOrBefore: Date,
  ): Promise<readonly StoredReturnBaseline[]>;

  /**
   * `EXPLAIN (ANALYZE, BUFFERS)` of {@link readWindowCloses} for one security.
   *
   * **The same query object, compiled** — not a hand-written copy of it, which
   * would be a second definition of the read that the measurement then
   * describes instead of the real one.
   */
  explainWindowRead(
    subject: BaselineSubject,
    window: TimeRange,
  ): Promise<BaselineReadCost>;

  /**
   * How many rows of each tape one security's window holds.
   *
   * **Index-only, no heap touched**: `market_bars_unique_bar` is
   * `(security_id, timeframe, observed_at, feed)` and all four columns are in
   * the predicate or the aggregate. It is the one measurement no machine
   * outside Azure can take — every developer's store holds **zero `iex`
   * rows**, because the live writer only runs where a provider is configured.
   */
  tapeCounts(
    subject: BaselineSubject,
    window: TimeRange,
  ): Promise<BaselineTapeCounts>;
}

/** The timeframe a baseline is computed at. Minute bars, never daily. */
const BASELINE_TIMEFRAME = "1m" as const;

/**
 * **The one tape, by name.** See the header for why this is not
 * `SERVED_TAPE_RANK`'s first entry, and why the two are not the same decision.
 *
 * **Exported since Task 5.3.3**, because the screen has to say it. Every
 * comparison this story ships is a consolidated-tape baseline against an `iex`
 * numerator (Gate 1's false premise 5), and invariant 6's rule is that
 * provenance is **displayed, never implied** — so the clause a reader sees is
 * built from the same constant this module's `where` is built from, and a tape
 * changed here reaches the sentence rather than leaving it behind.
 */
export const BASELINE_FEED = "sip" as const;

/** A `float8[]` as `pg` hands it back, which is already `number[]`. */
function toBreakpoints(raw: unknown): readonly number[] | null {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw)) return null;
  return raw.map((value) => Number(value));
}

/**
 * A `numeric` close as a `number`.
 *
 * **Its own parser rather than `market-bars.ts`' `toPrice`**, which is not
 * exported and throws a `BarMappingError`. The difference is the behaviour this
 * module needs: a baseline over 24,142 rows must not fail the whole pass on one
 * malformed close, so an unparseable value is **dropped from the map** and the
 * security's counted `n` is one lower. The blank check is not redundant with
 * `isFinite` — `Number("")` is **0**, and a zero close is the one wrong answer
 * here that divides to `Infinity`.
 */
function parseClose(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value !== 0 ? value : undefined;
}

interface PlanNode {
  readonly "Node Type"?: string;
  readonly "Plan Rows"?: number;
  readonly "Actual Rows"?: number;
  readonly "Shared Hit Blocks"?: number;
  readonly "Shared Read Blocks"?: number;
  readonly "Actual Total Time"?: number;
  readonly Plans?: readonly PlanNode[];
}

/**
 * The innermost node whose type names a scan, depth-first.
 *
 * Returns the **deepest** such node rather than the first, because a plan with
 * a `Bitmap Heap Scan` over a `Bitmap Index Scan` is one access path and the
 * index half is the one that says which regime it is in.
 */
function deepestScan(node: PlanNode | undefined): string | null {
  if (node === undefined) return null;

  for (const child of node.Plans ?? []) {
    const deeper = deepestScan(child);
    if (deeper !== null) return deeper;
  }

  const type = node["Node Type"];
  return type?.includes("Scan") === true ? type : null;
}

export function createReturnBaselineStore(pool: pg.Pool): ReturnBaselineStore {
  // Not exported, not returned, not reachable. See the header.
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  // **The ledger is read through its own module and never from here.** See
  // `coveredEnd` below.
  const bars = createMarketBarsRepository(pool);

  /**
   * **The read, as a query object, built exactly once.**
   *
   * `readWindowCloses` executes it and `explainWindowRead` compiles it, so the
   * measurement is of the shipped read rather than of a transcription of it.
   * Task 4.8.11's lesson in a different costume: an instrument that describes
   * a second copy of the subject is measuring the copy.
   */
  function windowQuery(securityId: string, window: TimeRange) {
    return (
      db
        .selectFrom("market_bars")
        // **No join, and that is a MEASURED decision rather than a tidy-up.**
        // The first draft reached the security through
        // `innerJoin("securities") … where("securities.symbol", "=", …)` and
        // claimed in a comment that the index supplied the order for free. The
        // `EXPLAIN` says otherwise: with the security reached through a join
        // the top plan node is a **`Sort`** over 23,400 rows, per security, 516
        // times a pass — because `security_id` is not a constant to the planner
        // until the join has produced one, so the btree's ordering guarantee
        // does not apply. Keyed on the id it is an `Index Scan` and nothing
        // else. The pass already holds the id (`BaselineSubject`), so the join
        // bought nothing at all.
        .select(["market_bars.observed_at", "market_bars.close"])
        .where("market_bars.security_id", "=", securityId)
        .where("market_bars.timeframe", "=", BASELINE_TIMEFRAME)
        // **AC 5, by name.** See the header.
        .where("market_bars.feed", "=", BASELINE_FEED)
        // Half-open, matching `TimeRange`, so two adjacent windows tile
        // without a bar claimed by both.
        .where("market_bars.observed_at", ">=", window.start)
        .where("market_bars.observed_at", "<", window.end)
        // Supplied by `market_bars_unique_bar` with `security_id` and
        // `timeframe` fixed — see the note above for the measurement that
        // makes this true only when the id is a parameter.
        .orderBy("market_bars.observed_at")
    );
  }

  return {
    async activeSubjects() {
      const rows = await db
        .selectFrom("securities")
        .select(["id", "symbol"])
        // See the interface: a computation over the market we track NOW.
        .where("status", "=", "active")
        .orderBy("symbol")
        .execute();

      return rows.map((row) => ({
        id: row.id,
        symbol: toTicker(row.symbol),
      }));
    },

    // **Delegated to `market-bars.ts`, which is the ledger's ONE querier.**
    // `stored-sources-only-through-the-merge` scopes its grep for the withdrawn
    // `bar_coverage.feed` column to that file on exactly that premise, so a
    // `selectFrom("bar_coverage")` here would widen what the check cannot see —
    // which is what it said when the first draft of this module did it.
    coveredEnd: () => bars.readCoveredEnd(BASELINE_TIMEFRAME),

    async subjectFor(symbol) {
      const row = await db
        .selectFrom("securities")
        .select(["id", "symbol"])
        // No `status` filter: an operator measuring the cost of a read is
        // asking about a row in the store, not about the market we track now.
        .where("symbol", "=", symbol)
        .executeTakeFirst();

      return row === undefined
        ? undefined
        : { id: row.id, symbol: toTicker(row.symbol) };
    },

    async readWindowCloses(subject, window) {
      const rows = await windowQuery(subject.id, window).execute();

      const closes = new Map<number, number>();
      for (const row of rows) {
        const close = parseClose(row.close);
        if (close !== undefined) closes.set(row.observed_at.getTime(), close);
      }

      return closes;
    },

    async writeBaseline(subject, observedAt, lookbackSessions, outcome) {
      if (outcome.kind === "none") {
        throw new RangeError(
          `${subject.symbol} produced no samples and no refusal, so there is ` +
            "nothing to write. `none` means the pass found nothing, which is " +
            "a DIFFERENT fact from a refusal and is recorded by the absence " +
            "of a row — `0013_return_baselines.sql` §4.",
        );
      }

      const breakpoints =
        outcome.kind === "measured" ? [...outcome.breakpoints] : null;
      const refusal = outcome.kind === "refused" ? outcome.refusal : null;

      await db
        .insertInto("return_baselines")
        .values({
          security_id: subject.id,
          // Supplied by the writer and never defaulted — `0013` §2.
          observed_at: observedAt,
          lookback_sessions: lookbackSessions,
          sample_count: outcome.sampleCount,
          breakpoints,
          refusal,
        })
        .onConflict((oc) =>
          oc.columns(["security_id", "observed_at"]).doUpdateSet({
            lookback_sessions: lookbackSessions,
            sample_count: outcome.sampleCount,
            breakpoints,
            refusal,
            // The one raw fragment in a write here, and it is the same one
            // `market-bars.ts` uses on its correction path: `now()` is
            // transaction start time, so a re-run's rows share one value.
            recorded_at: sql<Date>`now()`,
          }),
        )
        .execute();
    },

    async readNewestGeneration(atOrBefore) {
      // **Two statements rather than a correlated subquery**, and the reason is
      // the same one `readSeries` gives for its order: the frontier read is one
      // row and the generation read is a few hundred, and a `max()` inlined as
      // a subquery would be re-planned against a growing table for no gain.
      // A generation landing between them is simply not seen until the next
      // refresh, which is a quarter hour at worst and is what the cache's floor
      // already tolerates.
      const frontier = await db
        .selectFrom("return_baselines")
        .select(({ fn }) => fn.max("observed_at").as("newest"))
        .where("observed_at", "<=", atOrBefore)
        .executeTakeFirst();

      const newest = frontier?.newest ?? undefined;
      if (newest === undefined) return [];

      const rows = await db
        .selectFrom("return_baselines")
        .innerJoin(
          "securities",
          "securities.id",
          "return_baselines.security_id",
        )
        .select([
          "securities.symbol",
          "return_baselines.observed_at",
          "return_baselines.lookback_sessions",
          "return_baselines.sample_count",
          "return_baselines.breakpoints",
          "return_baselines.refusal",
        ])
        // No filter on `securities.status`. See the interface.
        .where("return_baselines.observed_at", "=", newest)
        .orderBy("securities.symbol")
        .execute();

      // **One function per domain type, beside the query** — and here that is
      // also where the row's two nullable columns become one explicit answer.
      // `flatMap` rather than `map` for the one case the database forbids and
      // this mapper must still answer for; see {@link toStoredBaseline}.
      return rows.flatMap<StoredReturnBaseline>((row) => {
        const facts = {
          symbol: toTicker(row.symbol),
          observedAt: row.observed_at,
          lookbackSessions: row.lookback_sessions,
          // `bigint` on the wire, a `number` in the domain — `toCoverage`'s own
          // judgement for `bar_count`, taken beside the query as the
          // repository's rule requires.
          sampleCount: Number(row.sample_count),
        };

        if (row.refusal !== null) {
          return [{ ...facts, refusal: row.refusal }];
        }

        const breakpoints = toBreakpoints(row.breakpoints);
        // **A row that is neither an answer nor a refusal is DROPPED**, which
        // `return_baselines_one_answer` makes unreachable from any writer in
        // this repository. It is dropped rather than refused because there is
        // no honest word for it: every member of `PERCENTILE_REFUSALS` is a
        // sentence on screen about a baseline we have, and an absent row
        // already means *the pass has not answered for this security* — which
        // is the true thing to say about a row the schema says cannot exist.
        if (breakpoints === null) return [];

        return [{ ...facts, refusal: null, breakpoints }];
      });
    },

    async explainWindowRead(subject, window) {
      const compiled = windowQuery(subject.id, window).compile();

      // `EXPLAIN` cannot be expressed by the builder, so the statement is
      // prefixed onto the **compiled** text with its own parameters — which is
      // what keeps the measured query identical to the shipped one. Nothing
      // here is interpolated from a request: the parameters are bound.
      const result = await pool.query<{
        "QUERY PLAN": readonly { Plan: PlanNode }[];
      }>(`explain (analyze, buffers, format json) ${compiled.sql}`, [
        ...compiled.parameters,
      ]);

      const plan = result.rows[0]?.["QUERY PLAN"]?.[0]?.Plan;

      return {
        planNodeType: plan?.["Node Type"] ?? "unknown",
        scanNodeType: deepestScan(plan),
        planRows: plan?.["Plan Rows"] ?? 0,
        actualRows: plan?.["Actual Rows"] ?? 0,
        sharedHitBlocks: plan?.["Shared Hit Blocks"] ?? 0,
        sharedReadBlocks: plan?.["Shared Read Blocks"] ?? 0,
        elapsedMs: plan?.["Actual Total Time"] ?? 0,
      };
    },

    async tapeCounts(subject, window) {
      const row = await db
        .selectFrom("market_bars")
        // **`feed` is what is counted, not `id`.** `id` is not in
        // `market_bars_unique_bar`, so counting it would send the planner to
        // the heap and lose the one property this measurement claims.
        .select(({ fn }) => [
          fn
            .count<string>("market_bars.feed")
            .filterWhere("market_bars.feed", "=", "sip")
            .as("sip"),
          fn
            .count<string>("market_bars.feed")
            .filterWhere("market_bars.feed", "=", "iex")
            .as("iex"),
        ])
        .where("market_bars.security_id", "=", subject.id)
        .where("market_bars.timeframe", "=", BASELINE_TIMEFRAME)
        .where("market_bars.observed_at", ">=", window.start)
        .where("market_bars.observed_at", "<", window.end)
        .executeTakeFirst();

      return {
        sip: Number(row?.sip ?? 0),
        iex: Number(row?.iex ?? 0),
      };
    },
  };
}
