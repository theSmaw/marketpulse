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
  toTicker,
  type MarketSession,
  type Ticker,
} from "@marketpulse/shared";

import { runBackfill, type BackfillDependencies } from "./backfill.js";
import { loadConfig, loadEnvFile } from "./config.js";
import { createFixtureProvider } from "./fixture-provider.js";
import { loadUniverse } from "./load-universe.js";
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
