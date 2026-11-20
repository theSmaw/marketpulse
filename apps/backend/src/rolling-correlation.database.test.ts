// `calculate_rolling_correlation` against a real PostgreSQL server (Task
// 7.2.6, Done-when 2).
//
// ## What this file is the only level that can see
//
// The tool's unit suite furnishes three `ReadonlyMap`s in place of three
// queries, which proves the arithmetic and proves nothing about the **fetch**.
// Everything below is the fetch, and every piece of it is invisible to
// `pnpm verify`:
//
//  1. **The whole chain is real** — `tapeCoveredEnd()` narrowing a tape-blind
//     ledger through a per-tape count, `baselineWindowEndingAt`,
//     `subjectFor`'s id resolution, and `readWindowCloses`' `sip`-filtered
//     window read — against rows a `numeric(18, 6)` column round-tripped and a
//     parser turned back into numbers.
//  2. **The split guard re-run, on real stored closes, on EITHER leg.** This
//     is the half the nightly pass does not do and this caller must: a
//     security whose stored closes break across a session boundary is refused
//     with its own word, and the **benchmark** breaking is a different word
//     from the **subject** breaking.
//  3. **A store with no bars for a security answers the overlap-zero
//     refusal** — CI's permanent state, reached here through real empty reads
//     rather than a furnished empty map.
//
// It has its own database, which is `return-correlations.database.test.ts`'
// precedent. There is no `skipIf` — with no database it fails loudly in
// `beforeAll` naming `pnpm db`, because a skipped test reports green.

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { toInvestigationId, toTicker } from "@marketpulse/shared";

import { loadConfig, loadEnvFile } from "./config.js";
import { runMigrations } from "./migrate.js";
import { baselineWindowEndingAt, sessionAnchors } from "./return-baseline.js";
import {
  BASELINE_FEED,
  createReturnBaselineStore,
} from "./return-baseline-store.js";
import { createRollingCorrelationTool } from "./tool-rolling-correlation.js";

import type { MarketSession, Ticker } from "@marketpulse/shared";
import type { ToolContext } from "./analytical-tool.js";

const TEST_DATABASE_NAME = "marketpulse_vitest_rolling_correlation";

/** A Thursday close — the instant the ledger's `covered_end` carries. */
const COVERED_END = new Date("2026-09-24T20:00:00.000Z");

/** The morning after. Later than the frontier, as production always is. */
const ASOF = new Date("2026-09-25T13:45:00.000Z");

const CONTEXT: ToolContext = {
  investigationId: toInvestigationId("inv-1"),
  asOf: ASOF,
  mode: "live",
};

const SUBJECT = toTicker("AAAA");
const MARKET = toTicker("BBBB");
/** Its stored closes break across a session boundary — a split. */
const BROKEN = toTicker("CCCC");
/** No bars at all. */
const SILENT = toTicker("DDDD");

const UNIVERSE = new Set<string>([SUBJECT, MARKET, BROKEN, SILENT]);

/** The window the tool will build, derived here the same way it does. */
const WINDOW = baselineWindowEndingAt(COVERED_END);

/** The two newest sessions of it — the only ones this suite stores bars in. */
const STORED_SESSIONS: readonly MarketSession[] = WINDOW.sessions.slice(-2);

let adminPool: pg.Pool | undefined;
let testPool: pg.Pool | undefined;
const ids = new Map<string, string>();

function db(): pg.Pool {
  if (testPool === undefined) {
    throw new Error("beforeAll did not create the test database.");
  }
  return testPool;
}

function tool(): ReturnType<typeof createRollingCorrelationTool> {
  return createRollingCorrelationTool(
    createReturnBaselineStore(db()),
    UNIVERSE,
  );
}

async function insertSecurity(symbol: string): Promise<void> {
  const inserted = await db().query<{ id: string }>(
    `insert into securities
       (symbol, name, exchange, kind, sector, industry, status, cik,
        profile_source, profile_retrieved_at,
        classification_source, classification_retrieved_at)
     values ($1, 'Probe', 'PROBE', 'equity', 'technology', null,
             'active', null, 'test', now(), 'test', now())
     returning id::text as id`,
    [symbol],
  );

  ids.set(symbol, inserted.rows[0]?.id ?? "");
}

function idOf(symbol: string): string {
  const id = ids.get(symbol);
  if (id === undefined) throw new Error(`beforeAll did not insert ${symbol}.`);
  return id;
}

/** A small, varying, deterministic walk — never a constant series. */
const wiggle = (k: number): number => ((k % 7) - 3) / 1000;

/**
 * One security's `sip` minute bars at the window's own grid anchors.
 *
 * **Only the anchors**, which is 78 rows a session rather than 390: the store
 * reads every close in the range and `baselineReturnSeries` selects the
 * anchors from it, so a grid anchor is the only row either can use.
 *
 * `breakAt` multiplies the price by `0.4` entering that session, which is
 * below `SPLIT_DISCONTINUITY_RATIO` either way round.
 */
async function insertBars(
  symbol: Ticker,
  options: { readonly invert?: boolean; readonly breakAt?: number } = {},
): Promise<void> {
  let price = 100;
  let k = 0;

  for (const [index, session] of STORED_SESSIONS.entries()) {
    if (options.breakAt === index) price *= 0.4;

    for (const anchor of sessionAnchors(session)) {
      await db().query(
        `insert into market_bars
           (security_id, timeframe, observed_at, open, high, low, close,
            volume, feed)
         values ($1, '1m', $2, $3, $3, $3, $3, 1000, $4)`,
        [idOf(symbol), anchor, price.toFixed(6), BASELINE_FEED],
      );

      const step = wiggle(k);
      price *= 1 + (options.invert === true ? -step : step);
      k += 1;
    }
  }
}

async function insertCoverage(symbol: Ticker): Promise<void> {
  await db().query(
    `insert into bar_coverage
       (security_id, timeframe, covered_start, covered_end, provider, feed)
     values ($1, '1m', $2, $3, 'alpaca', $4)`,
    [idOf(symbol), WINDOW.range.start, COVERED_END, BASELINE_FEED],
  );
}

beforeAll(async () => {
  loadEnvFile();
  const config = loadConfig();

  // Deliberately not `createDatabasePool`, for `migrate.database.test.ts`'s
  // reason: that resolves an Entra token under `DATABASE_AUTH=entra`, and this
  // suite issues `CREATE DATABASE`.
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

  for (const symbol of [SUBJECT, MARKET, BROKEN, SILENT]) {
    await insertSecurity(symbol);
  }

  await insertBars(SUBJECT);
  // Inverted, so the real coefficient is negative rather than a tautological
  // `1` from two identical series.
  await insertBars(MARKET, { invert: true });
  await insertBars(BROKEN, { breakAt: 1 });

  // The ledger's own frontier. `SILENT` gets none — a security with no
  // coverage row and no bars, which is every security on CI.
  for (const symbol of [SUBJECT, MARKET, BROKEN]) {
    await insertCoverage(symbol);
  }
}, 60_000);

afterAll(async () => {
  delete process.env.DATABASE_NAME;
  await testPool?.end();

  if (adminPool !== undefined) {
    await adminPool.query(`drop database if exists ${TEST_DATABASE_NAME}`);
    await adminPool.end();
  }
});

describe("the on-demand fetch, end to end", () => {
  it("computes a coefficient from real stored rows", async () => {
    const outcome = await tool().run(
      { symbol: SUBJECT, against: MARKET },
      CONTEXT,
    );

    expect(outcome.kind).toBe("ok");
    if (outcome.kind !== "ok") return;

    expect(outcome.value.symbol).toBe(SUBJECT);
    expect(outcome.value.against).toBe(MARKET);
    // `MARKET` is `SUBJECT`'s walk inverted.
    expect(outcome.value.direction).toBe("negative");
    expect(outcome.value.significant).toBe(true);
    // **The COUNTED overlap**: 77 pairs in each of the two regular sessions
    // this suite stored, and nothing in the source spells it.
    expect(outcome.value.n).toBe(
      STORED_SESSIONS.reduce(
        (total, session) => total + sessionAnchors(session).length - 1,
        0,
      ),
    );
  });

  it("reads the window the tape frontier narrowed the ledger to", async () => {
    // Driven rather than asserted on a mock: the only way this answers at all
    // is `readCoveredEnd` → `baselineTapeFrontier` → `tapeCounts` finding a
    // `sip` row in the newest candidate session, which is the chain Task
    // 5.5.1's production defect ran through tape-blind.
    const store = createReturnBaselineStore(db());

    expect(await store.tapeCoveredEnd()).toEqual(COVERED_END);
  });
});

describe("the split guard, re-run by this caller, on real closes", () => {
  it("refuses `reference-split-discontinuity` where the BENCHMARK breaks", async () => {
    const outcome = await tool().run(
      { symbol: SUBJECT, against: BROKEN },
      CONTEXT,
    );

    expect(outcome).toEqual({
      kind: "refused",
      reason: "reference-split-discontinuity",
    });
  });

  it("refuses `split-discontinuity` where the SUBJECT breaks", async () => {
    // The same stored rows, the legs swapped — which is what makes the two
    // words a real distinction rather than a label: they refuse different
    // securities and are repaired in different places.
    const outcome = await tool().run(
      { symbol: BROKEN, against: SUBJECT },
      CONTEXT,
    );

    expect(outcome).toEqual({ kind: "refused", reason: "split-discontinuity" });
  });
});

describe("a security this store holds no bars for", () => {
  it("refuses `too-few-overlapping-samples` at an overlap of zero", async () => {
    // **CI's permanent state**, reached through a real empty window read.
    const outcome = await tool().run(
      { symbol: SILENT, against: MARKET },
      CONTEXT,
    );

    expect(outcome).toEqual({
      kind: "refused",
      reason: "too-few-overlapping-samples",
    });
  });

  it("answers `is-the-market-proxy` without reading anything", async () => {
    const outcome = await tool().run(
      { symbol: MARKET, against: MARKET },
      CONTEXT,
    );

    expect(outcome).toEqual({
      kind: "inapplicable",
      because: "is-the-market-proxy",
    });
  });
});
