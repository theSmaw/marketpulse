// The attempt log against a real PostgreSQL server (Task 2.8.7).
//
// **This is where acceptance criterion 4 is demonstrated one cause at a time**,
// and it needs a real database rather than the fake repository
// `bar-completeness.test.ts` uses, because the whole claim is that four causes
// which look identical in the database can be told apart *from the database*.
// Asserting that against an in-memory stub would be asserting it against the
// stub.
//
// It also closes the vocabulary pair `bar-attempts.ts` creates: the shipped
// `BAR_ATTEMPT_OUTCOMES` array and the `bar_attempts_outcome_check` constraint
// must agree, and nothing in `pnpm verify` can see the second. This suite parses
// the constraint **Postgres rewrote** — Task 2.2.4 measured that a `check (x in
// (…))` comes back as `CHECK ((x = ANY (ARRAY[…])))`, so a string match against
// the migration text catches nothing.
//
// It reuses the fixture arrangement of the other database suites: its own
// `marketpulse_vitest` database, created, migrated, read and dropped. There is
// no `skipIf` — with no database it fails loudly in `beforeAll` naming
// `pnpm db`, because a skipped test reports green.

import pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  marketSessionsBetween,
  toMarketDate,
  toTicker,
  toTimeRange,
  type MarketSession,
  type Ticker,
} from "@marketpulse/shared";

import {
  BAR_ATTEMPT_OUTCOMES,
  createBarAttemptsRepository,
  type BarAttemptsRepository,
} from "./bar-attempts.js";
import {
  compareStoreToCalendar,
  needsAttention,
  type SeriesStore,
} from "./bar-completeness.js";
import { loadConfig, loadEnvFile } from "./config.js";
import { loadUniverse } from "./load-universe.js";
import type { BarCoverage } from "./market-bars.js";
import { runMigrations } from "./migrate.js";

/** The same database name the other database suites use, for the same reasons. */
const TEST_DATABASE_NAME = "marketpulse_vitest";

const NVDA: Ticker = toTicker("NVDA");
const AMD: Ticker = toTicker("AMD");

/**
 * A real week out of the shipped calendar, and the Thanksgiving one so the half
 * day is a real half day rather than a fixture pretending to be one.
 */
const WEEK = marketSessionsBetween(
  toMarketDate("2026-03-02"),
  toMarketDate("2026-03-06"),
);
const THANKSGIVING_WEEK = marketSessionsBetween(
  toMarketDate("2026-11-23"),
  toMarketDate("2026-11-27"),
);

let adminPool: pg.Pool | undefined;
let testPool: pg.Pool | undefined;
let attempts: BarAttemptsRepository | undefined;

function db(): pg.Pool {
  if (testPool === undefined) {
    throw new Error("beforeAll did not create the test database.");
  }
  return testPool;
}

function log(): BarAttemptsRepository {
  if (attempts === undefined) {
    throw new Error("beforeAll did not create the attempt log.");
  }
  return attempts;
}

function coverageOver(
  symbol: Ticker,
  sessions: readonly MarketSession[],
  barCount: number,
): BarCoverage {
  const first = sessions[0];
  const last = sessions.at(-1);
  if (first === undefined || last === undefined) {
    throw new Error("A coverage window needs at least one session.");
  }
  return {
    symbol,
    timeframe: "1m",
    covered: toTimeRange(first.open, last.close),
    source: { provider: "alpaca", feed: "sip" },
    barCount,
    updatedAt: new Date("2026-03-07T00:00:00.000Z"),
  };
}

/** Bars a complete store would hold, read off the sessions themselves. */
function completeBars(sessions: readonly MarketSession[]): number {
  return sessions.reduce((total, session) => total + session.minuteBars, 0);
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

  attempts = createBarAttemptsRepository(db());
});

afterEach(async () => {
  await db().query("delete from bar_attempts");
});

afterAll(async () => {
  delete process.env.DATABASE_NAME;
  await testPool?.end();
  await adminPool?.query(`drop database if exists ${TEST_DATABASE_NAME}`);
  await adminPool?.end();
});

describe("the outcome vocabulary and the constraint agree", () => {
  it("matches the check constraint Postgres rewrote", async () => {
    // The pair `bar-attempts.ts` creates and nothing in `pnpm verify` can see:
    // a member added to the array without the migration is a value the compiler
    // permits and the database refuses at run time.
    const result = await db().query<{ definition: string }>(
      `select pg_get_constraintdef(oid) as definition
         from pg_constraint
        where conrelid = 'bar_attempts'::regclass
          and conname = 'bar_attempts_outcome_check'`,
    );

    const definition = result.rows[0]?.definition ?? "";
    // Postgres rewrites `check (x in (…))` into `CHECK ((x = ANY (ARRAY[…])))`,
    // so this parses the values out rather than matching the migration's text.
    const values = [...definition.matchAll(/'([^']+)'::text/g)].map(
      (match) => match[1],
    );

    expect([...values].sort()).toEqual([...BAR_ATTEMPT_OUTCOMES].sort());
  });

  it("refuses a value the vocabulary does not carry", async () => {
    await expect(
      db().query(
        `insert into bar_attempts (security_id, timeframe, session_date, outcome)
         values ((select id from securities where symbol = 'NVDA'), '1m', '2026-03-02', 'made-up')`,
      ),
    ).rejects.toThrow(/bar_attempts_outcome_check/);
  });

  it("refuses a session date that is not a market date", async () => {
    // A malformed date here is a row no report can join to a calendar.
    await expect(
      db().query(
        `insert into bar_attempts (security_id, timeframe, session_date, outcome)
         values ((select id from securities where symbol = 'NVDA'), '1m', '2 March', 'ok')`,
      ),
    ).rejects.toThrow(/bar_attempts_session_date_check/);
  });
});

describe("the log itself", () => {
  it("round-trips a market date without reinterpreting it", async () => {
    // The reason `session_date` is `text` rather than a Postgres `date`: `pg`
    // hands a `date` back as a `Date` at local midnight, so a row written as
    // 2026-03-02 reads back as 2026-03-01 in any process east of UTC.
    await log().recordAttempts([
      {
        symbol: NVDA,
        timeframe: "1m",
        sessionDate: toMarketDate("2026-03-02"),
        outcome: "ok",
      },
    ]);

    const stored = await log().listAttempts();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.sessionDate).toBe("2026-03-02");
    expect(stored[0]?.symbol).toBe(NVDA);
    expect(stored[0]?.detail).toBeUndefined();
  });

  it("upserts, and leaves updated_at alone when nothing changed", async () => {
    // `load-universe.ts`'s idiom, so a re-run that fails the same way twice
    // leaves this table byte-identical and criterion 2's checksum covers it.
    const entry = {
      symbol: NVDA,
      timeframe: "1m" as const,
      sessionDate: toMarketDate("2026-03-02"),
      outcome: "rate-limited" as const,
    };

    await log().recordAttempts([entry]);
    const [first] = await log().listAttempts();
    await log().recordAttempts([entry]);
    const [again] = await log().listAttempts();

    expect(again?.updatedAt.getTime()).toBe(first?.updatedAt.getTime());
    expect(again?.recordedAt.getTime()).toBe(first?.recordedAt.getTime());

    await log().recordAttempts([{ ...entry, outcome: "unauthorised" }]);
    const [changed] = await log().listAttempts();

    expect(changed?.outcome).toBe("unauthorised");
    expect(changed?.updatedAt.getTime()).toBeGreaterThan(
      first?.updatedAt.getTime() ?? 0,
    );
    // Still one row: the key is `(security, timeframe, session)`.
    expect(await log().listAttempts()).toHaveLength(1);
  });

  it("forgets a session on a later success, so a transient failure is not permanent", async () => {
    // Without this the log accumulates a record of every failure that has ever
    // happened and every report from then on reads worse than the store is.
    await log().recordAttempts([
      {
        symbol: NVDA,
        timeframe: "1m",
        sessionDate: toMarketDate("2026-03-02"),
        outcome: "upstream-unavailable",
      },
      {
        symbol: AMD,
        timeframe: "1m",
        sessionDate: toMarketDate("2026-03-02"),
        outcome: "upstream-unavailable",
      },
      {
        symbol: NVDA,
        timeframe: "1m",
        sessionDate: toMarketDate("2026-03-03"),
        outcome: "upstream-unavailable",
      },
    ]);

    const cleared = await log().clearAttempts([NVDA], "1m", [
      toMarketDate("2026-03-02"),
    ]);

    expect(cleared).toBe(1);
    expect(
      (await log().listAttempts()).map(
        (entry) => `${entry.symbol} ${entry.sessionDate}`,
      ),
    ).toEqual(["AMD 2026-03-02", "NVDA 2026-03-03"]);
  });

  it("does not clear another timeframe's record of the same session", async () => {
    // Minute and daily history are walked independently, so a successful daily
    // fetch says nothing about whether the minute fetch worked.
    await log().recordAttempts([
      {
        symbol: NVDA,
        timeframe: "1m",
        sessionDate: toMarketDate("2026-03-02"),
        outcome: "timeout",
      },
      {
        symbol: NVDA,
        timeframe: "1d",
        sessionDate: toMarketDate("2026-03-02"),
        outcome: "timeout",
      },
    ]);

    await log().clearAttempts([NVDA], "1d", [toMarketDate("2026-03-02")]);

    const left = await log().listAttempts();
    expect(left).toHaveLength(1);
    expect(left[0]?.timeframe).toBe("1m");
  });

  it("skips a symbol this database does not have rather than refusing the batch", async () => {
    // The one place this deliberately differs from `market-bars.ts`, which
    // throws `UnknownSecurityError`: there a dropped symbol produces a store
    // quietly one security short, which is a claim this product makes on
    // screen. Here it would abort a whole run's logging because of a note.
    const written = await log().recordAttempts([
      {
        symbol: NVDA,
        timeframe: "1m",
        sessionDate: toMarketDate("2026-03-02"),
        outcome: "ok",
      },
      {
        symbol: toTicker("ZZZZ"),
        timeframe: "1m",
        sessionDate: toMarketDate("2026-03-02"),
        outcome: "ok",
      },
    ]);

    expect(written).toBe(1);
    expect(await log().listAttempts()).toHaveLength(1);
  });
});

describe("the four causes, one at a time and from the database", () => {
  /** Read the store back the way `pnpm bars:check` does. */
  async function report(coverage: BarCoverage | undefined, sessions = WEEK) {
    const stored = await log().listAttempts();
    const first = sessions[0];
    const last = sessions.at(-1);
    if (first === undefined || last === undefined) throw new Error("fixture");

    const series: SeriesStore = {
      symbol: NVDA,
      timeframe: "1m",
      ...(coverage === undefined ? {} : { coverage }),
      attempts: stored.filter((entry) => entry.symbol === NVDA),
      lastBarAt: last.open,
    };

    return compareStoreToCalendar({
      sessions,
      window: { from: first.date, to: last.date },
      series: [series],
    });
  }

  it("1 — the market was closed: a holiday is not a gap and a half day is not thin", async () => {
    // Thanksgiving itself has no session at all, so it contributes nothing to
    // either number; the day after closes at 13:00 ET and holds 210 bars.
    const complete = completeBars(THANKSGIVING_WEEK);
    const found = await report(
      coverageOver(NVDA, THANKSGIVING_WEEK, complete),
      THANKSGIVING_WEEK,
    );

    expect(THANKSGIVING_WEEK).toHaveLength(4);
    expect(THANKSGIVING_WEEK.some((session) => session.isEarlyClose)).toBe(
      true,
    );
    expect(found.series[0]?.barsExpected).toBe(complete);
    expect(found.findings).toEqual([]);
  });

  it("2 — the security did not trade: thin is a density number, never a finding", async () => {
    const found = await report(
      coverageOver(NVDA, WEEK, completeBars(WEEK) - 46),
    );

    expect(found.series[0]?.barsHeld).toBeLessThan(
      found.series[0]?.barsExpected ?? 0,
    );
    expect(found.findings).toEqual([]);
  });

  it("3 — the fetch failed: a recorded attempt is what separates it from cause 2", async () => {
    // Both of these sessions are inside the ledger's range and hold no bars. In
    // `market_bars` and in `bar_coverage` they are the same thing. This is the
    // only place the difference exists.
    await log().recordAttempts([
      {
        symbol: NVDA,
        timeframe: "1m",
        sessionDate: toMarketDate("2026-03-03"),
        outcome: "ok",
      },
      {
        symbol: NVDA,
        timeframe: "1m",
        sessionDate: toMarketDate("2026-03-04"),
        outcome: "unauthorised",
      },
    ]);

    const found = await report(coverageOver(NVDA, WEEK, completeBars(WEEK)));
    const empties = found.findings.filter(
      (finding) => finding.kind === "attempted-and-empty",
    );

    expect(empties).toHaveLength(2);
    // The untraded one needs nobody; the failed one needs a person, and the
    // report says which is which rather than printing two identical lines.
    expect(found.findings.filter(needsAttention)).toHaveLength(1);
  });

  it("4 — the fetch never happened: a session outside the covered range", async () => {
    const found = await report(
      coverageOver(NVDA, WEEK.slice(0, 3), completeBars(WEEK.slice(0, 3))),
    );

    expect(found.series[0]?.notFetched).toEqual([WEEK[3]?.date, WEEK[4]?.date]);
    // And a re-run is the whole of the response — no person needed.
    expect(found.findings.filter(needsAttention)).toEqual([]);
  });

  it("distinguishes a never-fetched series from a fetched and empty one", async () => {
    const never = await report(undefined);
    expect(never.findings[0]?.kind).toBe("never-fetched");
  });
});
