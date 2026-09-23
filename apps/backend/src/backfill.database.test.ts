// The backfill against a real PostgreSQL server (Task 2.8.6).
//
// **This is the suite that proves acceptance criteria 2 and 3**, and it needs a
// real database rather than the fake repository `backfill.test.ts` uses,
// because both criteria are statements about what is *stored* rather than about
// what the command reported. A re-run changing nothing is a fact about rows and
// about the ledger; a resumed run neither duplicating nor skipping is a fact
// about the same. The command's own counters are the thing under test, not the
// evidence.
//
// It drives the **fixture provider** rather than Alpaca, which is what makes it
// runnable in CI and on a laptop with no key: the corpus is deterministic and
// covers 2026, and its ordinary entries are real tracked-universe tickers
// precisely so a test like this has a `security_id` to file bars against.
//
// It reuses the fixture arrangement of the other database suites: its own
// `marketpulse_vitest` database, created, migrated, read and dropped. There is
// no `skipIf` — with no database it fails loudly in `beforeAll` naming
// `pnpm db`, because a skipped test reports green.

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  marketSessionsBetween,
  toMarketDate,
  toSeriesProvenance,
  toTicker,
  toTimeRange,
  type MarketSession,
  type Ticker,
} from "@marketpulse/shared";

import { runBackfill, type BackfillDependencies } from "./backfill.js";
import { loadConfig, loadEnvFile } from "./config.js";
import { createFixtureProvider } from "./fixture-provider.js";
import { createLiveBarWriter } from "./live-bar-writer.js";
import type { LiveObservation } from "./market-data-stream.js";
import { loadUniverse } from "./load-universe.js";
import {
  createBarAttemptsRepository,
  type BarAttemptsRepository,
} from "./bar-attempts.js";
import {
  createMarketBarsRepository,
  type BarCoverage,
  type MarketBarsRepository,
} from "./market-bars.js";
import { runMigrations } from "./migrate.js";

/** The same database name the other database suites use, for the same reasons. */
const TEST_DATABASE_NAME = "marketpulse_vitest";

/**
 * Three sessions inside the fixture corpus's 2026 window.
 *
 * Three rather than one because every property here is about the *walk*: a
 * single session cannot be resumed, cannot skip and cannot duplicate.
 */
const SESSIONS: readonly MarketSession[] = marketSessionsBetween(
  toMarketDate("2026-03-02"),
  toMarketDate("2026-03-04"),
);

/** A liquid fixture symbol that is also a tracked security. */
const SYMBOL: Ticker = toTicker("NVDA");

let adminPool: pg.Pool | undefined;
let testPool: pg.Pool | undefined;
let bars: MarketBarsRepository | undefined;
let attempts: BarAttemptsRepository | undefined;

function db(): pg.Pool {
  if (testPool === undefined) {
    throw new Error("beforeAll did not create the test database.");
  }
  return testPool;
}

function repository(): MarketBarsRepository {
  if (bars === undefined) {
    throw new Error("beforeAll did not create the repository.");
  }
  return bars;
}

function attemptLog(): BarAttemptsRepository {
  if (attempts === undefined) {
    throw new Error("beforeAll did not create the attempt log.");
  }
  return attempts;
}

async function coverageMap(): Promise<Map<Ticker, BarCoverage>> {
  const held = new Map<Ticker, BarCoverage>();
  for (const entry of await repository().listCoverage()) {
    if (entry.timeframe === "1m") held.set(entry.symbol, entry);
  }
  return held;
}

/** Everything the run needs, with the fixture provider behind it. */
async function dependencies(
  overrides: Partial<BackfillDependencies> = {},
): Promise<BackfillDependencies> {
  return {
    provider: createFixtureProvider(),
    bars: repository(),
    attempts: attemptLog(),
    symbols: [SYMBOL],
    timeframe: "1m",
    sessions: SESSIONS,
    coverage: await coverageMap(),
    report: () => undefined,
    // The pacer is tested against a fake clock in the fast suite; here it would
    // only make the suite slower than the thing it is testing.
    paceMs: 0,
    ...overrides,
  };
}

async function barCount(): Promise<number> {
  const result = await db().query<{ count: string }>(
    "select count(*)::text as count from market_bars",
  );
  return Number(result.rows[0]?.count ?? "0");
}

/**
 * A checksum over every stored bar and over the ledger.
 *
 * **Criterion 2 is asserted on this rather than on the command's own report**,
 * which is the distinction the criterion itself draws: a run reporting `0
 * inserted` is the command's claim, and a byte-identical table is the fact.
 * `updated_at` is included deliberately — `market-bars.ts` only moves it when
 * the statement actually changed, so a re-run that touched it would show here.
 */
async function fingerprint(): Promise<string> {
  const result = await db().query<{ digest: string }>(
    `select coalesce(md5(string_agg(line, E'\\n' order by line)), 'empty') as digest
       from (
         select concat_ws('|', s.symbol, b.timeframe, b.observed_at,
                          b.open, b.high, b.low, b.close, b.volume) as line
           from market_bars b join securities s on s.id = b.security_id
         union all
         select concat_ws('|', 'coverage', s.symbol, c.timeframe,
                          c.covered_start, c.covered_end, c.bar_count,
                          c.updated_at) as line
           from bar_coverage c join securities s on s.id = c.security_id
       ) as lines`,
  );
  return result.rows[0]?.digest ?? "";
}

beforeAll(async () => {
  loadEnvFile();
  const config = loadConfig();

  const connection = {
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    ...(config.database.password === undefined
      ? {}
      : { password: config.database.password }),
    ssl: false as const,
  };

  adminPool = new pg.Pool({ ...connection, database: config.database.name });

  try {
    await adminPool.query("select 1");
  } catch (error) {
    throw new Error(
      `This suite needs a running database and could not reach ${config.database.host}:${String(config.database.port)}.\n` +
        "Start one with `pnpm db`, then run `pnpm test:database` again.",
      { cause: error },
    );
  }

  await adminPool.query(`drop database if exists ${TEST_DATABASE_NAME}`);
  await adminPool.query(`create database ${TEST_DATABASE_NAME}`);

  process.env.DATABASE_NAME = TEST_DATABASE_NAME;
  testPool = new pg.Pool({ ...connection, database: TEST_DATABASE_NAME });

  const migration = await runMigrations();
  if (migration.exitCode !== 0) {
    throw new Error(`could not migrate: ${migration.errors.join("")}`);
  }

  const load = await loadUniverse();
  if (load.exitCode !== 0) {
    throw new Error(`could not load the universe: ${load.errors.join("")}`);
  }

  bars = createMarketBarsRepository(db());
  attempts = createBarAttemptsRepository(db());
});

afterAll(async () => {
  delete process.env.DATABASE_NAME;
  await testPool?.end();
  await adminPool?.query(`drop database if exists ${TEST_DATABASE_NAME}`);
  await adminPool?.end();
});

describe("a backfill against a real store", () => {
  it("stores every session it walked, and the ledger spans them contiguously", async () => {
    const report = await runBackfill(await dependencies());

    expect(report.stoppedBy).toBe("completed");
    expect(report.requests).toBe(SESSIONS.length);
    expect(report.sessionsFetched).toBe(SESSIONS.length);
    expect(report.inserted).toBeGreaterThan(0);
    expect(await barCount()).toBe(report.inserted);

    const held = (await coverageMap()).get(SYMBOL);
    expect(held).toBeDefined();
    // The walk is backwards, so the ledger's range runs from the OLDEST
    // session's open to the NEWEST session's close — one contiguous window
    // grown from one end, which is what makes a single ledger row enough.
    expect(held?.covered.start.getTime()).toBe(SESSIONS[0]?.open.getTime());
    expect(held?.covered.end.getTime()).toBe(SESSIONS.at(-1)?.close.getTime());
    expect(held?.barCount).toBe(report.inserted);

    // Criterion 1 of Story 3.7, on the shipped command rather than on the
    // repository alone: every bar the fixture provider's backfill stored
    // carries the fixture's own tape, read from the row and not from the
    // ledger. `distinct` rather than a count, so a single `sip` among them —
    // a writer falling back to a constant — would show up as a second value.
    const tapes = await db().query<{ feed: string }>(
      "select distinct feed from market_bars",
    );
    expect(tapes.rows.map((row) => row.feed)).toEqual(["synthetic"]);
  });

  it("re-running changes nothing at all — criterion 2, on the rows", async () => {
    const before = await fingerprint();
    const rowsBefore = await barCount();

    const report = await runBackfill(await dependencies());

    // Nothing was even asked for: every session is inside the held window, so
    // a re-run of a completed range costs the metered API zero requests.
    expect(report.requests).toBe(0);
    expect(report.sessionsAlreadyHeld).toBe(SESSIONS.length);
    expect(report.inserted).toBe(0);
    expect(await barCount()).toBe(rowsBefore);
    expect(await fingerprint()).toBe(before);
  });
});

describe("an interrupted backfill", () => {
  it("resumes without duplicating or skipping — criterion 3", async () => {
    // A second symbol, so this walk starts from an empty ledger of its own
    // without disturbing the one the tests above built.
    const symbol = toTicker("SPY");
    const held = await coverageMap();

    let requests = 0;
    const stopAfterFirst = (): boolean => requests >= 1;

    const partial = await runBackfill(
      await dependencies({
        symbols: [symbol],
        coverage: held,
        report: () => {
          requests += 1;
        },
        shouldStop: stopAfterFirst,
      }),
    );

    expect(partial.stoppedBy).toBe("interrupted");
    expect(partial.requests).toBe(1);

    const afterInterrupt = (await coverageMap()).get(symbol);
    expect(afterInterrupt).toBeDefined();
    // One session held, and it is the NEWEST — the walk goes backwards, so an
    // interrupted run leaves the most recent history rather than the oldest.
    expect(afterInterrupt?.covered.end.getTime()).toBe(
      SESSIONS.at(-1)?.close.getTime(),
    );

    const rowsAfterInterrupt = await barCount();

    // The resume reads the ledger rather than a bookmark of its own.
    const resumed = await runBackfill(
      await dependencies({ symbols: [symbol], coverage: await coverageMap() }),
    );

    expect(resumed.stoppedBy).toBe("completed");
    // It asked for the two sessions it did not have, and not the one it did.
    expect(resumed.requests).toBe(SESSIONS.length - 1);
    expect(resumed.sessionsAlreadyHeld).toBe(1);

    const final = (await coverageMap()).get(symbol);
    expect(final?.covered.start.getTime()).toBe(SESSIONS[0]?.open.getTime());
    expect(final?.covered.end.getTime()).toBe(SESSIONS.at(-1)?.close.getTime());

    // **Neither duplicated nor skipped**, asserted on three numbers that would
    // each hide one of those: the resumed run inserted exactly the difference
    // in stored rows, the ledger's own count agrees with the rows it claims,
    // and reading the covered window back returns that same number.
    expect(await barCount()).toBe(rowsAfterInterrupt + resumed.inserted);
    expect(final).toBeDefined();
    if (final !== undefined) {
      const readBack = await repository().readBars(symbol, "1m", final.covered);
      expect(readBack).toHaveLength(final.barCount);
    }
  });

  it("stores nothing outside the sessions it walked", async () => {
    const symbol = toTicker("AMD");

    await runBackfill(
      await dependencies({ symbols: [symbol], coverage: await coverageMap() }),
    );

    const rows = await db().query<{ inside: string; total: string }>(
      `select
         count(*) filter (
           where exists (
             select 1 from (values ${SESSIONS.map(
               (_, index) =>
                 `($${String(index * 2 + 2)}::timestamptz, $${String(index * 2 + 3)}::timestamptz)`,
             ).join(", ")}) as w(open, close)
              where b.observed_at >= w.open and b.observed_at < w.close
           )
         )::text as inside,
         count(*)::text as total
         from market_bars b join securities s on s.id = b.security_id
        where s.symbol = $1`,
      [symbol, ...SESSIONS.flatMap((session) => [session.open, session.close])],
    );

    const inside = Number(rows.rows[0]?.inside ?? "0");
    const total = Number(rows.rows[0]?.total ?? "0");

    // **The non-vacuity guard, and it is not decoration.** A query that finds
    // nothing outside the sessions passes identically whether the walk is
    // session-shaped or whether the symbol has no bars at all, which is Task
    // 1.13.6's blind-renderer problem in a new place.
    expect(total).toBeGreaterThan(0);
    expect(inside).toBe(total);

    // **What this does NOT prove, stated rather than implied.** A span-shaped
    // minute window leaks *extended-hours* prints, and this corpus is
    // synthetic: `fixture-corpus.ts` generates a bar per minute of a session
    // and nothing outside one, so it has no overnight prints to leak. Widening
    // `SESSIONS_PER_REQUEST["1m"]` to 3 leaves this assertion **green** —
    // measured, which is why it is written down here rather than trusted.
    //
    // The window *shape* is therefore held by `backfill.test.ts`'s assertion on
    // the request range, which is the level that can see it, and by the real
    // vendor at the point a real key is used. What this test holds is the half
    // a store can: whatever came back was filed where the calendar says it
    // belongs.
  });
});

// **The overnight reconciliation, rehearsed over one session** (Task 3.8.9).
//
// Criterion 5, and it is written to be un-fudgeable: both writers fill the same
// table for the same minutes, in the real order, and the rehearsal reads what a
// user would meet rather than what the command reports about itself.
//
// **What stands in for what, stated rather than implied.** The bars are the
// fixture corpus's and the clock is the test's; the LABELS are production's —
// the live half writes `alpaca`/`iex` exactly as `live-bar-writer.ts` does from
// the socket, and the backfill half is the real `runBackfill` behind a provider
// declaring `alpaca`/`sip`. So `planRequests`, `recordSeries`, `extendCoverage`
// and `readSeries` are all the shipped ones, and the tapes rank as they do in
// production. What is simulated is the data, not the path.
describe("the overnight reconciliation, over one session (Task 3.8.9)", () => {
  const SESSION = SESSIONS.at(-1);

  /** The consolidated tape, as the nightly run would see it. */
  function consolidatedProvider() {
    const fixture = createFixtureProvider();
    const asSip = (result: Awaited<ReturnType<typeof fixture.fetchBars>>) =>
      result.outcome === "ok"
        ? {
            ...result,
            series: {
              ...result.series,
              provenance: toSeriesProvenance("raw", {
                provider: "alpaca" as const,
                feed: "sip" as const,
                retrievedAt: result.series.provenance.sources[0].retrievedAt,
                barCount: result.series.bars.length,
              }),
            },
          }
        : result;

    return {
      ...fixture,
      id: "alpaca" as const,
      feed: "sip" as const,
      fetchBars: async (...args: Parameters<typeof fixture.fetchBars>) =>
        asSip(await fixture.fetchBars(...args)),
      // **`fetchManyBars` too, and forgetting it was the first failure.**
      // `runBackfill` calls the batched one, so wrapping only `fetchBars` left
      // the run using the fixture's own `fixture`/`synthetic` provenance — and
      // the store refused it with a `ForeignSourceError` naming a second
      // PROVIDER, which is Task 3.7.4's refusal doing exactly its job.
      fetchManyBars: async (
        ...args: Parameters<typeof fixture.fetchManyBars>
      ) =>
        new Map(
          [...(await fixture.fetchManyBars(...args))].map(
            ([symbol, result]) => [symbol, asSip(result)] as const,
          ),
        ),
    };
  }

  /** One minute of the session, on the live tape, as the socket delivers it. */
  const liveMinute = (index: number): LiveObservation => {
    if (SESSION === undefined) throw new Error("no session");
    const startsAt = new Date(SESSION.open.getTime() + index * 60_000);
    const close = 100 + index * 0.25;
    return {
      symbol: SYMBOL,
      supersedes: false,
      bar: {
        startsAt,
        open: close - 0.5,
        high: close + 0.5,
        low: close - 1,
        close,
        volume: 5_000 + index,
      },
      source: {
        provider: "alpaca",
        feed: "iex",
        retrievedAt: "2026-03-04T21:00:00.000Z",
        barCount: 1,
      },
    };
  };

  it("asks, keeps both tapes, serves the consolidated one, and leaves a ledger that agrees with its rows", async () => {
    if (SESSION === undefined) throw new Error("no session");

    // **This file's tests share one store and run in order**, so this one
    // starts from empty rather than from whatever the walk above left. It is
    // last in the file for the same reason.
    await db().query("truncate market_bars, bar_coverage, bar_attempts");

    // ---- The live session, written as it happened ---------------------------
    const writer = createLiveBarWriter({
      bars: repository(),
      warn: () => undefined,
      now: () => SESSION.close.getTime(),
    });
    const LIVE_MINUTES = 40;
    const live = await writer.store(
      Array.from({ length: LIVE_MINUTES }, (_, index) => liveMinute(index)),
    );
    expect(live.inserted).toBe(LIVE_MINUTES);

    const beforeReconciliation = await fingerprint();

    // ---- Then the nightly run, over the same session -------------------------
    const report = await runBackfill(
      await dependencies({
        provider: consolidatedProvider(),
        sessions: [SESSION],
        coverage: await coverageMap(),
      }),
    );

    // **The first assertion is not about the rows. It is about the REQUEST.**
    // `planRequests` skips a session wholly inside the covered window, so a
    // live writer that claimed the whole session would make this run report
    // `0 fetches, 1 already held` and store nothing — correctly by its own
    // rules and wrongly for the product. A run that fetched nothing looks
    // identical to one that reconciled perfectly. Task 3.8.3 claims only up to
    // the last bar seen precisely so that this number is not zero.
    expect(report.requests).toBeGreaterThan(0);
    expect(report.sessionsFetched).toBe(1);
    expect(report.sessionsAlreadyHeld).toBe(0);

    // Something happened. A count would hide a replacement; the fingerprint
    // covers every stored bar and the ledger.
    expect(await fingerprint()).not.toBe(beforeReconciliation);

    // ---- What the table holds ------------------------------------------------
    const tapes = await db().query<{ feed: string; held: string }>(
      `select feed, count(*)::text as held from market_bars
        where timeframe = '1m' group by feed order by feed`,
    );
    const held = new Map(
      tapes.rows.map((row) => [row.feed, Number(row.held)] as const),
    );
    expect(held.get("iex")).toBe(LIVE_MINUTES);
    expect(held.get("sip") ?? 0).toBeGreaterThan(0);

    const doubled = await db().query<{ minutes: string }>(
      `select count(*)::text as minutes from (
         select observed_at from market_bars where timeframe = '1m'
          group by observed_at having count(*) > 1) t`,
    );
    const doublyCovered = Number(doubled.rows[0]?.minutes ?? "0");
    // **A minute both tapes cover is the interesting one.** Counted rather
    // than assumed, and non-zero is what makes the rest of this test mean
    // anything.
    expect(doublyCovered).toBeGreaterThan(0);

    // ---- What a reader is served --------------------------------------------
    const { series } = await repository().readSeries(
      SYMBOL,
      "1m",
      toTimeRange(SESSION.open, SESSION.close),
      new Date(),
    );

    // One bar a minute, which is Task 3.8.4's repair holding under volume.
    const instants = series.bars.map((one) => one.startsAt.getTime());
    expect(new Set(instants).size).toBe(instants.length);

    // **Two-sided, as the task asks.** Counting rows would pass against a read
    // that served the wrong tape. The live tape's prices are 100 + index/4 and
    // the fixture corpus's are not, so a served bar carrying a live price on a
    // doubly-covered minute is visible here.
    const liveCloses = new Set(
      Array.from({ length: LIVE_MINUTES }, (_, index) => 100 + index * 0.25),
    );
    const doublyCoveredInstants = new Set(
      (
        await db().query<{ observed_at: Date }>(
          `select observed_at from market_bars where timeframe = '1m'
            group by observed_at having count(*) > 1`,
        )
      ).rows.map((row) => row.observed_at.getTime()),
    );
    const servedFromLiveWhereBothExist = series.bars.filter(
      (bar) =>
        doublyCoveredInstants.has(bar.startsAt.getTime()) &&
        liveCloses.has(bar.close),
    );
    expect(servedFromLiveWhereBothExist).toHaveLength(0);

    // ---- What the note says --------------------------------------------------
    //
    // `provenance.sources` describes **what was served**, not what is stored.
    // So the live tape's count here is the minutes the consolidated tape did
    // not reach — never the number of `iex` rows in the table. Asserting the
    // DIFFERENCE rather than the equality, because equality is what a
    // regression would produce.
    const namedLive = series.provenance.sources
      .filter((source) => source.feed === "iex")
      .reduce((total, source) => total + source.barCount, 0);
    expect(namedLive).toBeLessThan(LIVE_MINUTES);
    expect(namedLive).toBe(LIVE_MINUTES - doublyCovered);

    // ---- What the ledger claims ---------------------------------------------
    const ledger = (await coverageMap()).get(SYMBOL);
    expect(ledger).toBeDefined();
    expect(ledger?.provider).toBe("alpaca");

    // **The bar count against `count(*)`, not read on its own.** Task 3.8.2
    // found the writer's presence check unscoped to the tape, which made a
    // genuine insert count as a correction and never reach `extendCoverage` —
    // the ledger under-reports and nothing says so. A reconciliation is the
    // first place two tapes meet in volume, so it is the first place a
    // residual version of that defect would show. The two numbers agreeing is
    // the assertion; either one alone is not.
    expect(ledger?.barCount).toBe(await barCount());
  });

  // **The shape production actually reaches, and the one a user meets.** The
  // test above reconciles a session the consolidated fetch covers completely,
  // so every live minute has a better version and the note names ONE source.
  // That is correct and it is not the whole story: the live writer keeps
  // extended-hours bars (Task 3.8.3), and the backfill asks per SESSION — so
  // the minutes outside the bell are the live tape's alone, for ever. Those
  // are the minutes the note's live count is about.
  it("names both tapes when the live one reached minutes the session fetch never covers", async () => {
    if (SESSION === undefined) throw new Error("no session");
    await db().query("truncate market_bars, bar_coverage, bar_attempts");

    const writer = createLiveBarWriter({
      bars: repository(),
      warn: () => undefined,
      now: () => SESSION.close.getTime(),
    });

    // Ten minutes of pre-market, then ten inside the session.
    const PRE_MARKET = 10;
    await writer.store([
      ...Array.from({ length: PRE_MARKET }, (_, index) =>
        liveMinute(index - PRE_MARKET),
      ),
      ...Array.from({ length: 10 }, (_, index) => liveMinute(index)),
    ]);

    await runBackfill(
      await dependencies({
        provider: consolidatedProvider(),
        sessions: [SESSION],
        coverage: await coverageMap(),
      }),
    );

    const { series } = await repository().readSeries(
      SYMBOL,
      "1m",
      toTimeRange(
        new Date(SESSION.open.getTime() - PRE_MARKET * 60_000),
        SESSION.close,
      ),
      new Date(),
    );

    // **In contribution order, which is what the source note draws.** The
    // pre-market run is the live tape's alone and comes first; the session is
    // the consolidated tape's.
    expect(
      series.provenance.sources.map((source) => [source.feed, source.barCount]),
    ).toEqual([
      ["iex", PRE_MARKET],
      ["sip", 390],
    ]);

    // And the live count in the note is the minutes the consolidated tape did
    // not reach — not the 20 live rows the table holds.
    const liveRows = await db().query<{ held: string }>(
      "select count(*)::text as held from market_bars where feed = 'iex'",
    );
    expect(Number(liveRows.rows[0]?.held)).toBe(PRE_MARKET + 10);
    expect(series.provenance.sources[0].barCount).toBe(PRE_MARKET);
  });
});
