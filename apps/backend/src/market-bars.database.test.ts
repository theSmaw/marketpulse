// `market_bars`, against a real PostgreSQL server (Task 2.8.3).
//
// The second real table in this schema, and the first that exercises three
// conventions `securities` structurally could not — so this file is where three
// rules that have been prose since Task 2.2.3 become checks:
//
//   1. **`numeric(18, 6)` for money, `bigint` for a count.** `securities` holds
//      no money, so `migrate.database.test.ts` has carried a *tripwire* instead
//      — an assertion that there are ZERO `numeric` columns anywhere, which
//      fails the moment one arrives. This migration is what fires it, and the
//      work is to replace it with the real rule rather than to delete it.
//   2. **The `observed_at` / `recorded_at` pair.** A database can confirm both
//      are `timestamptz` and that `observed_at` has no default; nothing can
//      confirm a writer put the right value in the right one. Both halves are
//      stated here, the second as a limit rather than as a check.
//   3. **The foreign-key naming rule**, `<referenced_table_singularised>_id`.
//      `0003` recorded that it had survived the story most likely to have
//      exercised it; this is the first place it is tested.
//
// It reuses the fixture arrangement of the other three database suites: its own
// `marketpulse_vitest` database, created, migrated, read and dropped, so running
// it is invisible to the database you were debugging. There is no `skipIf` and
// there never will be — with no database it fails loudly in `beforeAll` naming
// `pnpm db`, because a skipped test reports green.
//
// **It loads the universe**, unlike `migrate.database.test.ts`, because half of
// what is worth asserting here needs a real `securities.id` to point at: an
// orphan is refused, a delete that would orphan is refused, and a duplicate bar
// needs a security to be a duplicate for.

import pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  MARKET_FEEDS,
  PROVIDER_IDS,
  TIMEFRAMES,
  lastMarketSessions,
  mergeSeriesProvenance,
  toBarSeries,
  toMarketDate,
  toSeriesProvenance,
  toTicker,
  toTimeRange,
  type Bar,
  type BarSeries,
  type MarketSession,
  type Ticker,
  type Timeframe,
} from "@marketpulse/shared";

import { loadConfig, loadEnvFile } from "./config.js";
import { loadUniverse } from "./load-universe.js";
import {
  CoverageGapError,
  createMarketBarsRepository,
  ForeignSourceError,
  UnknownSecurityError,
  type LastClose,
  type MarketBarsRepository,
  type SeriesSource,
} from "./market-bars.js";
import { runMigrations } from "./migrate.js";
import type { BarCoverageTable, MarketBarsTable } from "./schema.js";

/** The same database name the other three suites use, for the same reasons. */
const TEST_DATABASE_NAME = "marketpulse_vitest";

/** What `seriesFor` says its bars came from, and therefore what the ledger holds. */
const STORED_SOURCE: SeriesSource = { provider: "alpaca", feed: "sip" };

interface ColumnRow {
  readonly column_name: string;
  readonly data_type: string;
  readonly is_nullable: "YES" | "NO";
  readonly is_identity: "YES" | "NO";
  readonly column_default: string | null;
  readonly numeric_precision: number | null;
  readonly numeric_scale: number | null;
}

/**
 * What `schema.ts` claims about one column, in Postgres's own vocabulary.
 *
 * Same idiom as `migrate.database.test.ts`'s, with `precision` and `scale`
 * added — because on this table those two numbers *are* the convention rather
 * than a detail of it. A `numeric` with no precision at all would satisfy a
 * check written on `data_type` alone.
 */
interface ExpectedColumn {
  readonly dataType: string;
  readonly nullable: boolean;
  readonly identity?: true;
  readonly defaultExpression?: string;
  /**
   * `information_schema.columns.numeric_precision` and `.numeric_scale`.
   *
   * **A trap, found by writing this check the obvious way first:** these are
   * not numeric-only fields. A `bigint` reports `numeric_precision: 64` and
   * `numeric_scale: 0` — the *binary* precision of the integer type — so a
   * check that expects `null` for anything that is not a `numeric` fails on
   * every `bigint` in the table. Both are stated explicitly below rather than
   * defaulted away, because defaulting them away is what would let a
   * `numeric` with no precision at all through.
   */
  readonly precision?: number;
  readonly scale?: number;
}

/**
 * The third description of this table, after the migration and the interface.
 *
 * The `satisfies` is the load-bearing half: a column added to
 * {@link MarketBarsTable} and not described here is `TS1360` at compile time,
 * so the pair below cannot silently check one fewer thing. The compiler holds
 * interface → spec, this suite holds spec → database, and therefore the
 * hand-written interface is bound to the real schema without anything being
 * generated.
 */
const EXPECTED_MARKET_BARS = {
  id: {
    dataType: "bigint",
    nullable: false,
    identity: true,
    precision: 64,
    scale: 0,
  },
  security_id: { dataType: "bigint", nullable: false, precision: 64, scale: 0 },
  timeframe: { dataType: "text", nullable: false },
  // No `defaultExpression`, and that absence is the single most important
  // assertion in this file. See the test named after it below.
  observed_at: { dataType: "timestamp with time zone", nullable: false },
  open: { dataType: "numeric", nullable: false, precision: 18, scale: 6 },
  high: { dataType: "numeric", nullable: false, precision: 18, scale: 6 },
  low: { dataType: "numeric", nullable: false, precision: 18, scale: 6 },
  close: { dataType: "numeric", nullable: false, precision: 18, scale: 6 },
  volume: { dataType: "bigint", nullable: false, precision: 64, scale: 0 },
  recorded_at: {
    dataType: "timestamp with time zone",
    nullable: false,
    defaultExpression: "now()",
  },
} satisfies Record<keyof MarketBarsTable, ExpectedColumn>;

/** The four columns the money rule is about, derived rather than restated. */
const PRICE_COLUMNS = ["open", "high", "low", "close"] as const;

/**
 * The ledger's third description, after the migration and the interface.
 *
 * Same three-hop arrangement as {@link EXPECTED_MARKET_BARS}: the `satisfies`
 * makes a column added to {@link BarCoverageTable} and not described here a
 * compile error, and the suite compares the description against
 * `information_schema` in both directions.
 */
const EXPECTED_BAR_COVERAGE = {
  id: {
    dataType: "bigint",
    nullable: false,
    identity: true,
    precision: 64,
    scale: 0,
  },
  security_id: { dataType: "bigint", nullable: false, precision: 64, scale: 0 },
  timeframe: { dataType: "text", nullable: false },
  // No default on either end of the range, for `observed_at`'s reason: a writer
  // must supply the window it was answered for and cannot have one filled in on
  // its behalf.
  covered_start: { dataType: "timestamp with time zone", nullable: false },
  covered_end: { dataType: "timestamp with time zone", nullable: false },
  // Both carry a default, which `securities` deliberately refuses for its own
  // provenance columns. `0007_bar_coverage_provenance.sql` has the argument: it
  // exists so the *previous* backfill survives the window between the deploy's
  // migrate step and its code roll, and `schema.ts` types both as required on
  // insert so no shipped writer can reach it. Asserted here rather than
  // described, because a default that quietly disappeared would take the
  // deploy's safety with it and break nothing until a deploy.
  provider: {
    dataType: "text",
    nullable: false,
    defaultExpression: "'alpaca'::text",
  },
  feed: { dataType: "text", nullable: false, defaultExpression: "'sip'::text" },
  bar_count: {
    dataType: "bigint",
    nullable: false,
    defaultExpression: "0",
    precision: 64,
    scale: 0,
  },
  recorded_at: {
    dataType: "timestamp with time zone",
    nullable: false,
    defaultExpression: "now()",
  },
  updated_at: {
    dataType: "timestamp with time zone",
    nullable: false,
    defaultExpression: "now()",
  },
} satisfies Record<keyof BarCoverageTable, ExpectedColumn>;

let adminPool: pg.Pool | undefined;
let testPool: pg.Pool | undefined;
let securityId = "";
let otherSecurityId = "";
let symbol: Ticker = toTicker("AAPL");
let otherSymbol: Ticker = toTicker("MSFT");
let thirdSymbol: Ticker = toTicker("NVDA");
let bars: MarketBarsRepository | undefined;

function repository(): MarketBarsRepository {
  if (bars === undefined) {
    throw new Error("beforeAll did not create the repository.");
  }
  return bars;
}

function db(): pg.Pool {
  if (testPool === undefined) {
    throw new Error("beforeAll did not create the test database.");
  }
  return testPool;
}

async function columnsOf(table: string): Promise<readonly ColumnRow[]> {
  const result = await db().query<ColumnRow>(
    `select column_name, data_type, is_nullable, is_identity,
            column_default, numeric_precision, numeric_scale
       from information_schema.columns
      where table_schema = 'public' and table_name = $1
      order by ordinal_position`,
    [table],
  );
  return result.rows;
}

async function marketBarColumns(): Promise<readonly ColumnRow[]> {
  return columnsOf("market_bars");
}

/** Empty both tables, so a test that writes cannot leak into the next one. */
async function clearStore(): Promise<void> {
  await db().query("delete from bar_coverage");
  await db().query("delete from market_bars");
}

/**
 * A checksum over a whole table's content, ordered so it is stable.
 *
 * **This is what acceptance criterion 2 is asserted on**, rather than on the
 * writer's own report that it wrote nothing. `id` is excluded deliberately: it
 * is `generated always as identity` and an upsert consumes a sequence value per
 * row per run whether or not anything changed (Task 2.3.5 measured it), so a
 * fingerprint including it would report a difference that is not one.
 */
async function fingerprint(table: string, columns: string): Promise<string> {
  const result = await db().query<{ digest: string | null }>(
    `select md5(coalesce(string_agg(t::text, '|' order by t::text), '')) as digest
       from (select ${columns} from ${table}) as t`,
  );
  return result.rows[0]?.digest ?? "";
}

const BARS_FINGERPRINT =
  "security_id, timeframe, observed_at, open, high, low, close, volume, recorded_at";
const COVERAGE_FINGERPRINT =
  "security_id, timeframe, covered_start, covered_end, bar_count, recorded_at, updated_at";

/**
 * A deterministic minute bar, whose numbers are a function of its instant.
 *
 * Deterministic because idempotence is asserted on a checksum: a generator with
 * a clock or a random in it would make a re-run differ for a reason that has
 * nothing to do with the write path.
 */
function barAt(startsAt: Date, nudge = 0): Bar {
  const tick = (startsAt.getTime() % 997) / 100;
  return {
    startsAt,
    open: 100 + tick + nudge,
    high: 101 + tick + nudge,
    low: 99 + tick + nudge,
    close: 100.5 + tick + nudge,
    volume: 1_000 + (startsAt.getTime() % 313),
  };
}

/** One session's worth of minute bars, `count` of them from the open. */
function sessionBars(
  session: MarketSession,
  count: number,
  nudge = 0,
): readonly Bar[] {
  return Array.from({ length: count }, (_, index) =>
    barAt(new Date(session.open.getTime() + index * 60_000), nudge),
  );
}

/**
 * A `BarSeries` for one whole session — the shape the backfill writes.
 *
 * The window is `[open, close)` per session, which is `ALPACA.md`'s measured
 * requirement rather than a convenience: a span-shaped request across a night
 * collects extended-hours prints at ~2.35×, so the backfill asks per session
 * and this is what it hands over.
 */
function seriesFor(
  ticker: Ticker,
  session: MarketSession,
  options: {
    readonly count?: number;
    readonly nudge?: number;
    readonly timeframe?: Timeframe;
    readonly coveredEnd?: Date;
  } = {},
): BarSeries {
  const requested = toTimeRange(session.open, session.close);
  const seriesBars = sessionBars(session, options.count ?? 5, options.nudge);
  const covered =
    options.coveredEnd === undefined
      ? requested
      : toTimeRange(session.open, options.coveredEnd);

  return toBarSeries({
    symbol: ticker,
    timeframe: options.timeframe ?? "1m",
    bars: seriesBars,
    provenance: toSeriesProvenance("raw", {
      provider: "alpaca",
      feed: "sip",
      retrievedAt: "2026-09-08T00:00:00.000Z",
      barCount: seriesBars.length,
    }),
    coverage: { requested, covered: seriesBars.length === 0 ? null : covered },
  });
}

/** Real sessions, newest last. The calendar decides which days exist. */
function sessions(count: number): readonly MarketSession[] {
  return lastMarketSessions(count, toMarketDate("2026-09-03"));
}

/**
 * Insert one bar, overriding whichever field a test is about.
 *
 * The defaults are a valid minute bar, so every test below states only the
 * thing it is trying to break — which is what stops a constraint test passing
 * because a *different* constraint refused the row first. Each test asserts on
 * the constraint's own name for the same reason.
 */
async function insertBar(
  overrides: Readonly<Record<string, string | number | null>> = {},
): Promise<void> {
  const row: Record<string, string | number | null> = {
    security_id: securityId,
    timeframe: "1m",
    observed_at: "2026-09-03T13:30:00.000Z",
    open: 100.25,
    high: 100.75,
    low: 100.125,
    close: 100.5,
    volume: 12_345,
    ...overrides,
  };

  const names = Object.keys(row);
  const placeholders = names.map((_, index) => `$${String(index + 1)}`);

  await db().query(
    `insert into market_bars (${names.join(", ")})
     values (${placeholders.join(", ")})`,
    names.map((name) => row[name] ?? null),
  );
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

  // Real securities rather than invented ones: a foreign key is only testable
  // against a row that exists, and the loader is the shipped writer.
  const load = await loadUniverse();
  if (load.exitCode !== 0) {
    throw new Error(`could not load the universe: ${load.errors.join("")}`);
  }

  const ids = await db().query<{ id: string; symbol: string }>(
    "select id, symbol from securities order by symbol limit 3",
  );
  securityId = ids.rows[0]?.id ?? "";
  otherSecurityId = ids.rows[1]?.id ?? "";
  if (securityId === "" || otherSecurityId === "") {
    throw new Error("the universe loaded no securities to reference");
  }
  symbol = toTicker(ids.rows[0]?.symbol ?? "");
  otherSymbol = toTicker(ids.rows[1]?.symbol ?? "");
  thirdSymbol = toTicker(ids.rows[2]?.symbol ?? "");

  bars = createMarketBarsRepository(db());
});

afterAll(async () => {
  delete process.env.DATABASE_NAME;
  await testPool?.end();

  if (adminPool !== undefined) {
    await adminPool.query(`drop database if exists ${TEST_DATABASE_NAME}`);
    await adminPool.end();
  }
});

describe("the table the migration produced", () => {
  it("exists and holds zero rows", async () => {
    // Writing is Task 2.8.4's. A migration that seeded rows would be seed data
    // in a migration, which `migrations/README.md` §7 refuses — and it would
    // make every count below meaningless.
    const rows = await db().query<{ count: string }>(
      "select count(*) as count from market_bars",
    );
    expect(rows.rows[0]?.count).toBe("0");
  });

  it("describes every column of market_bars, and no column it does not have", async () => {
    const actual = await marketBarColumns();

    expect(actual.length).toBeGreaterThan(0);
    // Both directions. The compiler has already covered a third — a column on
    // the interface that is not described in EXPECTED_MARKET_BARS.
    expect(actual.map((column) => column.column_name).sort()).toEqual(
      Object.keys(EXPECTED_MARKET_BARS).sort(),
    );
  });

  it.each(Object.entries(EXPECTED_MARKET_BARS))(
    "agrees with the database about market_bars.%s",
    async (name, expected: ExpectedColumn) => {
      const column = (await marketBarColumns()).find(
        (row) => row.column_name === name,
      );

      expect(column).toBeDefined();
      expect(column?.data_type).toBe(expected.dataType);
      expect(column?.is_nullable).toBe(expected.nullable ? "YES" : "NO");
      // Task 2.2.4's trap: an identity column reports `column_default: null`
      // and `is_identity: 'YES'`, so a check written against the default alone
      // concludes there is no identity and finds nothing wrong.
      expect(column?.is_identity).toBe(
        expected.identity === true ? "YES" : "NO",
      );
      expect(column?.column_default).toBe(expected.defaultExpression ?? null);
      expect(column?.numeric_precision).toBe(expected.precision ?? null);
      expect(column?.numeric_scale).toBe(expected.scale ?? null);
    },
  );
});

describe("the money rule, which was a tripwire until this table existed", () => {
  // `migrations/README.md` §4, and the reason it could not be checked before:
  // `securities` holds no money, so "every price column is numeric(18, 6)"
  // would have passed by having nothing to look at — a green result
  // indistinguishable from one that certifies something. That is Task 1.13.6's
  // blind-renderer problem, and the answer there and here is the same: assert
  // that there is something to look at, and then look at it.

  it("has money columns to check, which is the half that was missing", async () => {
    const numerics = (await marketBarColumns()).filter(
      (column) => column.data_type === "numeric",
    );

    expect(numerics.map((column) => column.column_name).sort()).toEqual(
      [...PRICE_COLUMNS].sort(),
    );
  });

  it.each(PRICE_COLUMNS)("stores %s as numeric(18, 6)", async (name) => {
    const column = (await marketBarColumns()).find(
      (row) => row.column_name === name,
    );

    expect(column?.data_type).toBe("numeric");
    expect(column?.numeric_precision).toBe(18);
    expect(column?.numeric_scale).toBe(6);
  });

  it("stores volume as a bigint, because a count is not money", async () => {
    // The other half of §4's rule, and the one a sweep for `numeric` cannot
    // see: a `numeric(18, 6)` volume would satisfy every assertion above and be
    // wrong. It is exact by being an integer, and a daily consolidated volume
    // exceeds 32 bits.
    const column = (await marketBarColumns()).find(
      (row) => row.column_name === "volume",
    );

    expect(column?.data_type).toBe("bigint");
  });

  it("has no floating-point price anywhere on this table", async () => {
    // Stated on this table specifically as well as in the schema-wide sweep
    // next door, because this is the table where a float would actually be
    // reached for: four prices and a large count look like numbers.
    const floats = (await marketBarColumns()).filter((column) =>
      ["double precision", "real"].includes(column.data_type),
    );

    expect(floats).toEqual([]);
  });

  it("rounds excess scale silently and refuses excess precision", async () => {
    // Both edges of `numeric(18, 6)`, produced rather than cited — §4 records
    // them and this is the table they apply to. The rounding one is the one to
    // know about: it is right for a price and would be wrong for a large
    // aggregate, which is why the rule is scoped to a per-share value.
    await insertBar({
      observed_at: "2026-09-03T14:00:00.000Z",
      close: 1.23456789,
    });
    const rounded = await db().query<{ close: string }>(
      "select close from market_bars where observed_at = '2026-09-03T14:00:00.000Z'",
    );
    expect(rounded.rows[0]?.close).toBe("1.234568");

    await expect(
      insertBar({ observed_at: "2026-09-03T14:01:00.000Z", close: 1e13 }),
    ).rejects.toThrow(/numeric field overflow/);

    await db().query("delete from market_bars");
  });

  it("hands a numeric and a bigint back to JavaScript as strings", async () => {
    // The TypeScript consequence `migrations/README.md` §4 calls not optional,
    // asserted rather than remembered — and it is what `schema.ts` says these
    // columns are. `pg` does this deliberately, because a JavaScript number is
    // a double; a type parser "fixing" it would throw away exactly the property
    // the column type was chosen for, and this test is what would go red.
    await insertBar({ observed_at: "2026-09-03T15:00:00.000Z" });

    const row = await db().query<{
      close: unknown;
      volume: unknown;
      security_id: unknown;
      observed_at: unknown;
    }>(
      `select close, volume, security_id, observed_at from market_bars
        where observed_at = '2026-09-03T15:00:00.000Z'`,
    );

    expect(typeof row.rows[0]?.close).toBe("string");
    expect(typeof row.rows[0]?.volume).toBe("string");
    expect(typeof row.rows[0]?.security_id).toBe("string");
    // And the one that is not a string: a `timestamptz` arrives as a correct
    // `Date`. A naive `timestamp` would also arrive as a `Date` and be silently
    // wrong by the reading process's UTC offset, which is §2's argument
    // arriving in TypeScript.
    expect(row.rows[0]?.observed_at).toBeInstanceOf(Date);

    await db().query("delete from market_bars");
  });
});

describe("the two timestamps, which this table is the first to need", () => {
  it("gives observed_at no default at all", async () => {
    // The single most damaging line this story could have contained is
    // `default now()` on this column: one word, accepted silently by every
    // writer, turning "when it happened in the market" into "when we wrote it"
    // on the exact column Epic 13's temporal isolation filters on. Invariant 4
    // says that leak must be structurally impossible rather than remembered,
    // and the absence of a default is the structural half.
    const column = (await marketBarColumns()).find(
      (row) => row.column_name === "observed_at",
    );

    expect(column?.column_default).toBeNull();
    expect(column?.is_nullable).toBe("NO");
  });

  it("refuses a bar that does not say when it happened", async () => {
    // The consequence of the two properties above, together: not-null with no
    // default means a writer cannot omit it, and cannot have it filled in on
    // their behalf. That is the enforcement half rather than a schema with
    // somewhere to put the instant.
    const row: Record<string, string | number> = {
      security_id: securityId,
      timeframe: "1m",
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 1,
    };
    const names = Object.keys(row);

    await expect(
      db().query(
        `insert into market_bars (${names.join(", ")})
         values (${names.map((_, index) => `$${String(index + 1)}`).join(", ")})`,
        names.map((name) => row[name]),
      ),
    ).rejects.toThrow(/observed_at/);
  });

  it("defaults recorded_at, and gives one batch one value", async () => {
    // `now()` is transaction start time rather than statement time — measured,
    // and it means every bar written by one batch shares one `recorded_at`.
    // That is correct and is not a bug: the batch is the retrieval, and
    // invariant 5 wants the retrieval timestamp rather than a per-row clock
    // reading.
    const client = await db().connect();
    try {
      await client.query("begin");
      await client.query(
        `insert into market_bars
           (security_id, timeframe, observed_at, open, high, low, close, volume)
         values ($1, '1m', '2026-09-03T16:00:00.000Z', 1, 1, 1, 1, 1),
                ($1, '1m', '2026-09-03T16:01:00.000Z', 1, 1, 1, 1, 1)`,
        [securityId],
      );
      // A real gap between the two statements, so a `clock_timestamp()`
      // implementation would visibly disagree with this assertion.
      await client.query("select pg_sleep(0.05)");
      await client.query(
        `insert into market_bars
           (security_id, timeframe, observed_at, open, high, low, close, volume)
         values ($1, '1m', '2026-09-03T16:02:00.000Z', 1, 1, 1, 1, 1)`,
        [securityId],
      );
      await client.query("commit");
    } finally {
      client.release();
    }

    const distinct = await db().query<{ count: string }>(
      "select count(distinct recorded_at) as count from market_bars",
    );
    expect(distinct.rows[0]?.count).toBe("1");

    await db().query("delete from market_bars");
  });

  it("has both halves of the pair and neither of the banned names", async () => {
    // `migrations/README.md` §2 asks every table to answer the `observed_at`
    // question explicitly. `securities` answered "no, a sector is not a fact
    // about the market at an instant"; this table answers "yes", and it is the
    // first to carry both.
    //
    // What no test can check, stated here rather than left implied: that a
    // writer put the right value in the right column. A database can confirm
    // both are `timestamptz`; only review can confirm the mapping.
    const names = (await marketBarColumns()).map((row) => row.column_name);

    expect(names).toContain("observed_at");
    expect(names).toContain("recorded_at");
    for (const banned of ["created_at", "deleted_at"]) {
      expect(names).not.toContain(banned);
    }

    // `updated_at` is **absent by decision rather than banned** — `securities`
    // has one — and the two are worth telling apart. There, a loader
    // converging on a file rewrites rows routinely, so "when we first wrote it"
    // and "when it last changed" are different questions. Here the only event
    // that rewrites a bar is a vendor correction, which Story 2.8's open
    // decision 1 settled overwrites rather than versions — so `recorded_at`
    // moves with it and a second column would carry nothing extra.
    expect(names).not.toContain("updated_at");
  });
});

describe("the foreign key, tested here for the first time in this schema", () => {
  async function constraintDefinition(name: string): Promise<string> {
    const result = await db().query<{ definition: string }>(
      `select pg_get_constraintdef(oid) as definition
         from pg_constraint
        where conrelid = 'market_bars'::regclass and conname = $1`,
      [name],
    );

    expect(result.rows, `no constraint named ${name}`).toHaveLength(1);
    return result.rows[0]?.definition ?? "";
  }

  it("names the column by the convention, and points at securities.id", async () => {
    // `migrations/README.md` §1: a foreign key column is
    // `<referenced_table_singularised>_id`, so the column name says where to
    // look without a lookup. `0003` recorded this rule as still untested after
    // the story most likely to have exercised it; this is the test.
    const foreignKeys = await db().query<{
      conname: string;
      definition: string;
    }>(
      `select conname, pg_get_constraintdef(oid) as definition
         from pg_constraint
        where conrelid = 'market_bars'::regclass and contype = 'f'`,
    );

    expect(foreignKeys.rows).toHaveLength(1);
    expect(foreignKeys.rows[0]?.definition).toContain("(security_id)");
    expect(foreignKeys.rows[0]?.definition).toContain(
      "REFERENCES securities(id)",
    );
  });

  it("refuses a bar for a security that does not exist", async () => {
    await expect(
      insertBar({
        security_id: "999999999",
        observed_at: "2026-09-03T17:00:00.000Z",
      }),
    ).rejects.toThrow(/market_bars_security_id_fkey/);
  });

  it("refuses to delete a security that has bars", async () => {
    // No `on delete` clause means `no action`, and that is the choice rather
    // than a default falling through. `migrations/README.md` §5 says nothing
    // here is ever deleted — a security that leaves the universe is marked
    // `untracked` and keeps its row precisely so its history stays reachable —
    // so this is the database backstopping that convention. `cascade` would
    // turn a mistaken delete into unrecoverable data loss.
    await insertBar({ observed_at: "2026-09-03T18:00:00.000Z" });

    await expect(
      db().query("delete from securities where id = $1", [securityId]),
    ).rejects.toThrow(/market_bars_security_id_fkey/);

    await db().query("delete from market_bars");
  });

  it("has an index leading with security_id, so the key costs the parent nothing", async () => {
    // Postgres does NOT create an index on a referencing column, and without
    // one every operation on the parent row scans the child table — which at
    // fifty million rows is the difference between a delete that returns and
    // one that does not. The unique constraint leads with `security_id`, so
    // this costs no extra index; that it does is asserted rather than assumed.
    const definition = await constraintDefinition("market_bars_unique_bar");

    expect(definition).toContain(
      "UNIQUE (security_id, timeframe, observed_at)",
    );
  });
});

describe("what makes a bar the same bar", () => {
  // `(security_id, timeframe, observed_at)`, and acceptance criteria 2 and 3
  // are both properties of it: re-running a backfill is idempotent because the
  // database refuses the second copy, and an interrupted run resumes by writing
  // the same rows again.

  it("is a unique CONSTRAINT rather than a bare index", async () => {
    // Task 2.2.4 measured that those are not the same thing: a constraint reads
    // back from `pg_constraint` with a btree behind it, where a bare index is
    // invisible there. Anything reading `pg_constraint` — including the
    // `on conflict` inference the write path will use — sees only the first.
    const constraint = await db().query<{ contype: string }>(
      `select contype from pg_constraint
        where conrelid = 'market_bars'::regclass
          and conname = 'market_bars_unique_bar'`,
    );

    expect(constraint.rows).toHaveLength(1);
    expect(constraint.rows[0]?.contype).toBe("u");
  });

  it("refuses a second bar for the same security, timeframe and instant", async () => {
    await insertBar({ observed_at: "2026-09-03T19:00:00.000Z" });

    await expect(
      // Different prices, deliberately: what makes it the same bar is the key
      // and not the values, so a re-fetch whose numbers moved is still a
      // duplicate rather than a new row.
      insertBar({ observed_at: "2026-09-03T19:00:00.000Z", close: 999 }),
    ).rejects.toThrow(/market_bars_unique_bar/);

    await db().query("delete from market_bars");
  });

  it("accepts the same instant on another timeframe or another security", async () => {
    // The positive half. Without it every assertion above could be passing
    // because the constraint refuses everything, which is the same blind-green
    // result the money tripwire existed to prevent.
    await insertBar({ observed_at: "2026-09-03T20:00:00.000Z" });
    await insertBar({
      observed_at: "2026-09-03T20:00:00.000Z",
      timeframe: "1d",
    });
    await insertBar({
      observed_at: "2026-09-03T20:00:00.000Z",
      security_id: otherSecurityId,
    });

    const rows = await db().query<{ count: string }>(
      "select count(*) as count from market_bars",
    );
    expect(rows.rows[0]?.count).toBe("3");

    await db().query("delete from market_bars");
  });
});

describe("the timeframe vocabulary and the check constraint that backs it", () => {
  it("permits exactly the members of TIMEFRAMES", async () => {
    // Parsed rather than string-matched, because Postgres **rewrites** a check
    // constraint: `check (timeframe in ('1m', '1d'))` reads back as
    // `CHECK ((timeframe = ANY (ARRAY['1m'::text, '1d'::text])))`, so an
    // assertion written against what the migration says would never match what
    // the database holds.
    //
    // This closes the same gap Task 2.2.5 closed for `kind`: a union in
    // `packages/shared` and a `check` in the database are two spellings of one
    // vocabulary, and adding a member to one without the other gives a value
    // the compiler permits and the database refuses, at run time, in whatever
    // writes it.
    const result = await db().query<{ definition: string }>(
      `select pg_get_constraintdef(oid) as definition
         from pg_constraint
        where conrelid = 'market_bars'::regclass
          and conname = 'market_bars_timeframe_check'`,
    );

    expect(result.rows).toHaveLength(1);
    const permitted = [
      ...(result.rows[0]?.definition ?? "").matchAll(/'([^']*)'::text/g),
    ]
      .map((match) => match[1])
      .sort();

    expect(permitted).toEqual([...TIMEFRAMES].sort());
  });

  it("refuses a timeframe outside TIMEFRAMES", async () => {
    // `5m` specifically, because it is the realistic mistake rather than an
    // invented one: Epic 5 computes five-minute returns, and `bar.ts` records
    // that it computes them from stored minute bars rather than asking for
    // them. A database that accepted `5m` here would make that a comment.
    await expect(
      insertBar({ timeframe: "5m", observed_at: "2026-09-03T21:00:00.000Z" }),
    ).rejects.toThrow(/market_bars_timeframe_check/);
  });
});

describe("the indexes, chosen rather than accumulated", () => {
  it("has exactly two, and both are constraints", async () => {
    // Every index on this table is ~50.5M rows a year of write amplification
    // against a disk with ~22.5 GiB usable, so what is NOT indexed is the more
    // consequential half. Asserting the count is what turns "chosen rather than
    // accumulated" into something that stays true: an index added without a
    // reader fails here, and the fix is to say which query it serves.
    //
    // In particular there is deliberately no `(observed_at)`-leading index —
    // what a cross-sectional "every security at this minute" query wants, which
    // is §11's breadth calculation. Its trigger is Epic 5, the first reader
    // that issues one.
    const indexes = await db().query<{ indexname: string }>(
      `select indexname from pg_indexes
        where schemaname = 'public' and tablename = 'market_bars'
        order by indexname`,
    );

    expect(indexes.rows.map((row) => row.indexname)).toEqual([
      "market_bars_pkey",
      "market_bars_unique_bar",
    ]);
  });
});

// ===========================================================================
// The write path and the ledger (Task 2.8.4). Everything above this line is a
// property of the migration; everything below is a property of
// `market-bars.ts`.
// ===========================================================================

describe("the ledger's table", () => {
  it("describes every column of bar_coverage, and no column it does not have", async () => {
    const actual = await columnsOf("bar_coverage");

    expect(actual.length).toBeGreaterThan(0);
    expect(actual.map((column) => column.column_name).sort()).toEqual(
      Object.keys(EXPECTED_BAR_COVERAGE).sort(),
    );
  });

  it.each(Object.entries(EXPECTED_BAR_COVERAGE))(
    "agrees with the database about bar_coverage.%s",
    async (name, expected: ExpectedColumn) => {
      const column = (await columnsOf("bar_coverage")).find(
        (row) => row.column_name === name,
      );

      expect(column).toBeDefined();
      expect(column?.data_type).toBe(expected.dataType);
      expect(column?.is_nullable).toBe(expected.nullable ? "YES" : "NO");
      expect(column?.is_identity).toBe(
        expected.identity === true ? "YES" : "NO",
      );
      expect(column?.column_default).toBe(expected.defaultExpression ?? null);
      expect(column?.numeric_precision).toBe(expected.precision ?? null);
      expect(column?.numeric_scale).toBe(expected.scale ?? null);
    },
  );

  it("holds one statement per security and timeframe", async () => {
    // The `on conflict` target, and — per Task 2.2.4 — a `unique` CONSTRAINT
    // rather than a bare index, because only the first is visible in
    // `pg_constraint` where that inference looks.
    const constraint = await db().query<{ contype: string; def: string }>(
      `select contype, pg_get_constraintdef(oid) as def
         from pg_constraint
        where conrelid = 'bar_coverage'::regclass
          and conname = 'bar_coverage_unique_series'`,
    );

    expect(constraint.rows[0]?.contype).toBe("u");
    expect(constraint.rows[0]?.def).toContain(
      "UNIQUE (security_id, timeframe)",
    );
  });

  it("refuses a reversed or zero-width covered range", async () => {
    // `toTimeRange`'s reason, restated at the database: an empty range is a
    // plausible-looking answer to a swapped pair and to an off-by-one alike, so
    // it must not be storable even by something that bypasses the type.
    const insert = (start: string, end: string): Promise<unknown> =>
      db().query(
        `insert into bar_coverage (security_id, timeframe, covered_start, covered_end)
         values ($1, '1m', $2, $3)`,
        [securityId, start, end],
      );

    await expect(
      insert("2026-09-03T14:00:00.000Z", "2026-09-03T13:00:00.000Z"),
    ).rejects.toThrow(/bar_coverage_range_ordered/);
    await expect(
      insert("2026-09-03T14:00:00.000Z", "2026-09-03T14:00:00.000Z"),
    ).rejects.toThrow(/bar_coverage_range_ordered/);
  });

  it("has no index nothing asked for", async () => {
    // ~1,036 rows at 518 securities and two timeframes, so every query here is
    // a sub-millisecond scan and an index would serve nothing. The constraint's
    // own btree leads with `security_id`, which covers the write path's lookup
    // AND stops every operation on a `securities` row scanning this table —
    // Postgres does not index a referencing column on its own.
    const indexes = await db().query<{ indexname: string }>(
      `select indexname from pg_indexes
        where schemaname = 'public' and tablename = 'bar_coverage'
        order by indexname`,
    );

    expect(indexes.rows.map((row) => row.indexname)).toEqual([
      "bar_coverage_pkey",
      "bar_coverage_unique_series",
    ]);
  });
});

describe("writing a series", () => {
  afterEach(clearStore);

  it("writes the bars and reads them back unchanged", async () => {
    const [session] = sessions(1);
    if (session === undefined) throw new Error("no session");

    const written = await repository().recordSeries(
      seriesFor(symbol, session, { count: 5 }),
    );

    expect(written).toMatchObject({ inserted: 5, corrected: 0, unchanged: 0 });

    const readBack = await repository().readBars(
      symbol,
      "1m",
      toTimeRange(session.open, session.close),
    );

    // The round trip is the assertion, not the row count: it is what proves the
    // parse and the write agree about scale, about `bigint`-as-string and about
    // which timestamp is which. A write path whose output has never been read
    // back is a write path nobody has checked.
    expect(readBack).toEqual(sessionBars(session, 5));
  });

  it("reads half-open, so adjacent windows tile without a shared bar", async () => {
    const [session] = sessions(1);
    if (session === undefined) throw new Error("no session");

    await repository().recordSeries(seriesFor(symbol, session, { count: 4 }));

    const boundary = new Date(session.open.getTime() + 2 * 60_000);
    const first = await repository().readBars(
      symbol,
      "1m",
      toTimeRange(session.open, boundary),
    );
    const second = await repository().readBars(
      symbol,
      "1m",
      toTimeRange(boundary, new Date(boundary.getTime() + 2 * 60_000)),
    );

    expect(first).toHaveLength(2);
    expect(second).toHaveLength(2);
    // The `<` is the whole point: `<=` claims the seam bar twice, which is a
    // real corruption rather than a cosmetic one.
    expect([...first, ...second]).toEqual(sessionBars(session, 4));
  });

  it("writes nothing the second time, proved on the data rather than the report", async () => {
    const [session] = sessions(1);
    if (session === undefined) throw new Error("no session");
    const series = seriesFor(symbol, session, { count: 20 });

    await repository().recordSeries(series);

    const barsBefore = await fingerprint("market_bars", BARS_FINGERPRINT);
    const ledgerBefore = await fingerprint(
      "bar_coverage",
      COVERAGE_FINGERPRINT,
    );

    const again = await repository().recordSeries(series);

    // The function's own report, which is worth having and is not the check.
    expect(again).toMatchObject({ inserted: 0, corrected: 0, unchanged: 20 });

    // The check. Both tables, byte for byte — Task 2.3.8's rule that
    // idempotence is asserted on the data. The ledger is included deliberately:
    // it is only byte-identical because `updated_at` moves on a real change and
    // not on a re-run, which is a decision `0005` argues for at length.
    expect(await fingerprint("market_bars", BARS_FINGERPRINT)).toBe(barsBefore);
    expect(await fingerprint("bar_coverage", COVERAGE_FINGERPRINT)).toBe(
      ledgerBefore,
    );

    const count = await db().query<{ count: string }>(
      "select count(*) as count from market_bars",
    );
    expect(count.rows[0]?.count).toBe("20");
  });

  it("detects a corrected bar and reports it, so the reversal trigger can fire", async () => {
    // Story 2.8's open decision 1 hangs on this: V1 overwrites a corrected bar,
    // `recorded_at` moves, and Epic 13 therefore replays a bar as currently
    // known rather than as known at the time — a real gap in the replay
    // guarantee whose reversal trigger is **the first observed correction**.
    // A plain `do nothing` would make that trigger unfireable.
    const [session] = sessions(1);
    if (session === undefined) throw new Error("no session");

    await repository().recordSeries(seriesFor(symbol, session, { count: 3 }));
    const before = await db().query<{ recorded_at: Date }>(
      "select recorded_at from market_bars order by observed_at limit 1",
    );

    const corrected = await repository().recordSeries(
      // Three bars, all with different numbers: the vendor restated the session.
      seriesFor(symbol, session, { count: 3, nudge: 0.5 }),
    );

    expect(corrected).toMatchObject({
      inserted: 0,
      corrected: 3,
      unchanged: 0,
    });

    const after = await db().query<{ recorded_at: Date; close: string }>(
      "select recorded_at, close from market_bars order by observed_at limit 1",
    );

    // `recorded_at` moving IS the record that a correction happened, which is
    // why there is no `updated_at` on `market_bars`.
    expect(after.rows[0]?.recorded_at.getTime()).toBeGreaterThan(
      before.rows[0]?.recorded_at.getTime() ?? 0,
    );
    expect(Number(after.rows[0]?.close)).toBeCloseTo(
      sessionBars(session, 1, 0.5)[0]?.close ?? 0,
      6,
    );

    // And the ledger did not double-count: a correction is not a new bar.
    const coverage = await repository().readCoverage(symbol, "1m");
    expect(coverage?.barCount).toBe(3);
  });

  it("counts a partly-new series as part inserted and part unchanged", async () => {
    // The realistic resume: a run re-fetches a session it already holds and
    // extends past it. Neither number is the whole answer on its own.
    const [session] = sessions(1);
    if (session === undefined) throw new Error("no session");

    await repository().recordSeries(seriesFor(symbol, session, { count: 3 }));
    const extended = await repository().recordSeries(
      seriesFor(symbol, session, { count: 8 }),
    );

    expect(extended).toMatchObject({
      inserted: 5,
      corrected: 0,
      unchanged: 3,
    });
  });

  it("refuses a series for a symbol this database does not have", async () => {
    const [session] = sessions(1);
    if (session === undefined) throw new Error("no session");

    await expect(
      repository().recordSeries(seriesFor(toTicker("ZZNOP"), session)),
    ).rejects.toThrow(UnknownSecurityError);

    // Nothing was written on the way to finding out.
    const count = await db().query<{ count: string }>(
      "select count(*) as count from market_bars",
    );
    expect(count.rows[0]?.count).toBe("0");
  });

  it("keeps series apart by symbol and by timeframe", async () => {
    const [session] = sessions(1);
    if (session === undefined) throw new Error("no session");

    await repository().recordSeries(seriesFor(symbol, session, { count: 3 }));
    await repository().recordSeries(
      seriesFor(otherSymbol, session, { count: 4 }),
    );
    await repository().recordSeries(
      seriesFor(symbol, session, { count: 2, timeframe: "1d" }),
    );

    const ledger = await repository().listCoverage();
    expect(ledger).toHaveLength(3);
    expect(
      ledger.map(
        (row) => `${row.symbol} ${row.timeframe} ${String(row.barCount)}`,
      ),
    ).toEqual(
      [`${symbol} 1d 2`, `${symbol} 1m 3`, `${otherSymbol} 1m 4`].sort(),
    );
  });

  it("writes past the bind-parameter chunk boundary without dropping a row", async () => {
    // 8 written columns against Postgres's 65,535 bind parameters puts the
    // chunk at 8,191 rows, so this series crosses it once. A backfill's daily
    // walk is what reaches it: a session is 390 bars, and ~2,500 sessions is
    // not.
    const start = new Date("2026-09-01T00:00:00.000Z");
    const count = 8_300;
    const many = Array.from({ length: count }, (_, index) =>
      barAt(new Date(start.getTime() + index * 60_000)),
    );
    const last = many[count - 1];
    if (last === undefined) throw new Error("no bars");
    const range = toTimeRange(
      start,
      new Date(last.startsAt.getTime() + 60_000),
    );

    const written = await repository().recordSeries(
      toBarSeries({
        symbol: thirdSymbol,
        timeframe: "1m",
        bars: many,
        provenance: toSeriesProvenance("raw", {
          provider: "alpaca",
          feed: "sip",
          retrievedAt: "2026-09-08T00:00:00.000Z",
          barCount: count,
        }),
        coverage: { requested: range, covered: range },
      }),
    );

    expect(written.inserted).toBe(count);
    expect(written.coverage?.barCount).toBe(count);

    const stored = await db().query<{ count: string }>(
      "select count(*) as count from market_bars",
    );
    expect(stored.rows[0]?.count).toBe(String(count));
  });
});

describe("the ledger, which is the statement rather than the data", () => {
  afterEach(clearStore);

  it("agrees with min/max/count over the bars — the expensive query as the control", async () => {
    // **This is the only thing that can detect either of the two silent
    // failures.** A ledger that under-reports re-fetches history it holds, on a
    // metered API, in a command nobody investigates because it works; one that
    // over-reports skips a window forever. Neither is visible from the ledger,
    // and both are visible from this comparison — which is why the expensive
    // query exists here and nowhere else.
    const [older, newer] = sessions(2);
    if (older === undefined || newer === undefined) {
      throw new Error("no sessions");
    }

    await repository().recordSeries(seriesFor(symbol, newer, { count: 6 }));
    await repository().recordSeries(seriesFor(symbol, older, { count: 4 }));
    await repository().recordSeries(
      seriesFor(otherSymbol, newer, { count: 9 }),
    );

    const control = await db().query<{
      symbol: string;
      timeframe: string;
      first: Date;
      last: Date;
      count: string;
    }>(
      `select s.symbol, b.timeframe,
              min(b.observed_at) as first, max(b.observed_at) as last,
              count(*) as count
         from market_bars b
         join securities s on s.id = b.security_id
        group by s.symbol, b.timeframe
        order by s.symbol, b.timeframe`,
    );

    const ledger = await repository().listCoverage();
    expect(ledger).toHaveLength(control.rows.length);

    for (const row of control.rows) {
      const stated = ledger.find(
        (entry) =>
          entry.symbol === row.symbol && entry.timeframe === row.timeframe,
      );

      expect(
        stated,
        `${row.symbol} ${row.timeframe} is not in the ledger`,
      ).toBeDefined();
      expect(stated?.barCount).toBe(Number(row.count));
      // The range CONTAINS the bars rather than equalling their span, which is
      // the distinction `SeriesCoverage` exists for: coverage says how far the
      // answer reaches, not whether it is dense.
      expect(stated?.covered.start.getTime()).toBeLessThanOrEqual(
        row.first.getTime(),
      );
      expect(stated?.covered.end.getTime()).toBeGreaterThan(row.last.getTime());
    }
  });

  it("stores the covered window and not the requested one", async () => {
    // Task 2.7.5's measurement as a property: this plan refuses SIP data from
    // the last ~16 minutes with a flat `403` keyed on `end` alone, so the client
    // clamps before the request and reports the clamp as `covered`. A ledger
    // storing `requested` would bookmark a window the vendor never served, and
    // every catch-up would then begin after a hole it renews on every run.
    const [session] = sessions(1);
    if (session === undefined) throw new Error("no session");

    const clamped = new Date(session.close.getTime() - 16 * 60_000);
    await repository().recordSeries(
      seriesFor(symbol, session, { count: 5, coveredEnd: clamped }),
    );

    const coverage = await repository().readCoverage(symbol, "1m");

    expect(coverage?.covered.end.getTime()).toBe(clamped.getTime());
    expect(coverage?.covered.end.getTime()).toBeLessThan(
      session.close.getTime(),
    );
  });

  it("grows to the union as the walk extends backwards, session by session", async () => {
    // One row, one contiguous range, extended from one end — `0005`'s shape
    // decision. Backwards because that is the useful order: recent history is
    // what every chart opens on, so an interrupted backfill leaves the product
    // more useful than a forwards one does.
    const walked = sessions(4);
    const newest = walked[walked.length - 1];
    const oldest = walked[0];
    if (newest === undefined || oldest === undefined) {
      throw new Error("no sessions");
    }

    for (const session of [...walked].reverse()) {
      await repository().recordSeries(seriesFor(symbol, session, { count: 2 }));
    }

    const coverage = await repository().readCoverage(symbol, "1m");

    expect(coverage?.covered.start.getTime()).toBe(oldest.open.getTime());
    expect(coverage?.covered.end.getTime()).toBe(newest.close.getTime());
    expect(coverage?.barCount).toBe(8);

    const rows = await db().query<{ count: string }>(
      "select count(*) as count from bar_coverage",
    );
    expect(rows.rows[0]?.count).toBe("1");
  });

  it("refuses a write that would leave it claiming a session it never fetched", async () => {
    // **The one-range decision made safe rather than merely documented.** The
    // check is exact rather than a threshold: two adjacent sessions are
    // disjoint as intervals — the overnight, the weekend, a holiday — so no
    // interval arithmetic can tell "the next session back" from "a month back".
    // The calendar can.
    const walked = sessions(6);
    const newest = walked[walked.length - 1];
    const skipped = walked[0];
    if (newest === undefined || skipped === undefined) {
      throw new Error("no sessions");
    }

    await repository().recordSeries(seriesFor(symbol, newest, { count: 2 }));

    const before = await fingerprint("market_bars", BARS_FINGERPRINT);

    await expect(
      repository().recordSeries(seriesFor(symbol, skipped, { count: 2 })),
    ).rejects.toThrow(CoverageGapError);

    // And it refused before writing anything, so the bars and the ledger are
    // exactly as they were.
    expect(await fingerprint("market_bars", BARS_FINGERPRINT)).toBe(before);
    const coverage = await repository().readCoverage(symbol, "1m");
    expect(coverage?.covered.start.getTime()).toBe(newest.open.getTime());
  });

  it("accepts the next session in either direction, overnight and weekend included", async () => {
    // The positive half, and it is not a formality: without it the refusal
    // above could be passing because the check rejects everything, which is the
    // blind-green result the money tripwire existed to prevent. The four
    // sessions ending 2026-09-03 span a weekend.
    const walked = sessions(4);
    if (walked.length !== 4) throw new Error("expected four sessions");

    for (const session of walked) {
      await expect(
        repository().recordSeries(
          seriesFor(otherSymbol, session, { count: 1 }),
        ),
      ).resolves.toBeDefined();
    }

    const coverage = await repository().readCoverage(otherSymbol, "1m");
    expect(coverage?.barCount).toBe(4);
  });

  it("records nothing at all for an empty answer", async () => {
    // `BarSeries` requires `covered` to be null exactly when there are no bars,
    // so an empty answer carries no window to record. The consequence is
    // bounded rather than hidden: a genuinely untraded session at the frontier
    // of the walk is re-fetched next run, and one in the middle is absorbed by
    // the union the moment the session beyond it succeeds. Inferring the window
    // from what was *requested* is the bug rather than the fix.
    const [session] = sessions(1);
    if (session === undefined) throw new Error("no session");

    const written = await repository().recordSeries(
      seriesFor(symbol, session, { count: 0 }),
    );

    expect(written).toMatchObject({ inserted: 0, corrected: 0, unchanged: 0 });
    expect(written.coverage).toBeUndefined();

    const rows = await db().query<{ count: string }>(
      "select count(*) as count from bar_coverage",
    );
    expect(rows.rows[0]?.count).toBe("0");
  });
});

describe("the transaction, which is why these two things are one task", () => {
  afterEach(clearStore);

  it("rolls the bars back when a bar in the batch is refused", async () => {
    // A real constraint violation rather than a mock: `numeric(18, 6)` refuses
    // thirteen integer digits, and the offending bar is in the middle of the
    // series so earlier rows have already been sent.
    const [session] = sessions(1);
    if (session === undefined) throw new Error("no session");

    const good = sessionBars(session, 5);
    const broken = good.map((bar, index) =>
      index === 2 ? { ...bar, close: 1e13 } : bar,
    );
    const range = toTimeRange(session.open, session.close);

    await expect(
      repository().recordSeries(
        toBarSeries({
          symbol,
          timeframe: "1m",
          bars: broken,
          provenance: toSeriesProvenance("raw", {
            provider: "alpaca",
            feed: "sip",
            retrievedAt: "2026-09-08T00:00:00.000Z",
            barCount: broken.length,
          }),
          coverage: { requested: range, covered: range },
        }),
      ),
    ).rejects.toThrow(/numeric field overflow/);

    // Neither half landed. A ledger row without its bars over-reports and
    // leaves a permanent hole; that is the failure this assertion is about.
    const bars = await db().query<{ count: string }>(
      "select count(*) as count from market_bars",
    );
    const ledger = await db().query<{ count: string }>(
      "select count(*) as count from bar_coverage",
    );
    expect(bars.rows[0]?.count).toBe("0");
    expect(ledger.rows[0]?.count).toBe("0");
  });

  it("rolls the bars back when the LEDGER write is refused", async () => {
    // The mirror, and the one that needs producing rather than reasoning about:
    // a bar written without its ledger row under-reports what we hold and
    // re-fetches it forever. A temporary constraint makes the ledger write fail
    // *after* the bars have been inserted in the same transaction.
    const [session] = sessions(1);
    if (session === undefined) throw new Error("no session");

    await db().query(
      "alter table bar_coverage add constraint tmp_refuse_writes check (bar_count < 0)",
    );

    try {
      await expect(
        repository().recordSeries(seriesFor(symbol, session, { count: 5 })),
      ).rejects.toThrow(/tmp_refuse_writes/);

      const bars = await db().query<{ count: string }>(
        "select count(*) as count from market_bars",
      );
      expect(bars.rows[0]?.count).toBe("0");
    } finally {
      await db().query(
        "alter table bar_coverage drop constraint tmp_refuse_writes",
      );
    }
  });
});

// The served read (Task 2.9.4). Everything above is the write path checking its
// own round trip; this is the query `GET /market-data/bars` answers from, and
// three of its claims are only settleable against a real server: that the
// provenance timestamp comes off a `default now()` the *database* wrote rather
// than off this process's clock, that `status` is genuinely not filtered, and
// that the ledger it reports agrees with the bars it returns.
describe("readSeries — the read the market-data API serves", () => {
  afterEach(clearStore);

  /** The instant of the read. Distinct from anything the database will write. */
  const readAt = new Date("2030-01-01T00:00:00.000Z");

  it("carries the provenance the schema does not store", async () => {
    const [session] = sessions(1);
    if (session === undefined) throw new Error("no session");

    await repository().recordSeries(seriesFor(symbol, session, { count: 5 }));

    const { series } = await repository().readSeries(
      symbol,
      "1m",
      toTimeRange(session.open, session.close),
      readAt,
    );

    expect(series.bars).toHaveLength(5);

    const [source, ...rest] = series.provenance.sources;
    expect(rest).toEqual([]);
    expect(source.provider).toBe(STORED_SOURCE.provider);
    expect(source.feed).toBe(STORED_SOURCE.feed);
    expect(source.barCount).toBe(5);
  });

  it("does not re-stamp retrievedAt at read time", async () => {
    // **The assertion this task exists for.** `market-provenance.ts` warns in
    // terms that a read path stamping this turns "fetched three weeks ago" into
    // "current", and Task 2.3.5 found the same trap once already. The value has
    // to come off the row's `recorded_at`, which the *database* defaulted at
    // transaction start — so this is checkable only here, where a real `now()`
    // ran, and only against a read clock that is nowhere near it.
    const [session] = sessions(1);
    if (session === undefined) throw new Error("no session");

    await repository().recordSeries(seriesFor(symbol, session, { count: 3 }));

    const written = await db().query<{ recorded_at: Date }>(
      "select min(recorded_at) as recorded_at from market_bars",
    );
    const recordedAt = written.rows[0]?.recorded_at;
    if (recordedAt === undefined) throw new Error("nothing was written");

    const { series } = await repository().readSeries(
      symbol,
      "1m",
      toTimeRange(session.open, session.close),
      readAt,
    );

    const [source] = series.provenance.sources;
    expect(source.retrievedAt).toBe(recordedAt.toISOString());
    expect(source.retrievedAt).not.toBe(readAt.toISOString());
  });

  it("reports coverage from the ledger, checked against min/max/count", async () => {
    // `BARS.md` §9.1: coverage is a read of `bar_coverage` and never a scan of
    // `market_bars` — a page load that counted forty-eight million rows would
    // arrive in Task 2.9.9's timings as a mystery with no obvious author. The
    // expensive query is the control for that, exactly as it is for the write
    // path above: it says what the bars actually are, and the served answer has
    // to contain them without being derived from them.
    const [session] = sessions(1);
    if (session === undefined) throw new Error("no session");

    await repository().recordSeries(seriesFor(symbol, session, { count: 7 }));

    const requested = toTimeRange(session.open, session.close);
    const { series, held } = await repository().readSeries(
      symbol,
      "1m",
      requested,
      readAt,
    );

    const control = await db().query<{
      first: Date;
      last: Date;
      count: string;
    }>(
      `select min(b.observed_at) as first, max(b.observed_at) as last,
              count(*) as count
         from market_bars b
         join securities s on s.id = b.security_id
        where s.symbol = $1 and b.timeframe = '1m'`,
      [symbol],
    );
    const row = control.rows[0];
    if (row === undefined) throw new Error("no control row");

    expect(series.bars).toHaveLength(Number(row.count));
    expect(held?.barCount).toBe(Number(row.count));

    // Contains the bars rather than equalling their span. Seven minutes of a
    // 390-minute session is exactly the thin-name case: the answer still
    // reaches the whole session, because that is how far we looked.
    const covered = series.coverage.covered;
    expect(covered?.start.getTime()).toBeLessThanOrEqual(row.first.getTime());
    expect(covered?.end.getTime()).toBeGreaterThan(row.last.getTime());
    expect(covered).toEqual(requested);
  });

  it("narrows covered to where the store stops, and reports requested unchanged", async () => {
    // The partial answer of `MARKET-DATA-API.md` §6 — "we have data through
    // 15:42" — and the seam Task 2.9.5 stitches onto. It is a 200, and the two
    // windows say between them exactly what is missing.
    const [session] = sessions(1);
    if (session === undefined) throw new Error("no session");

    const storedEnd = new Date(session.open.getTime() + 10 * 60_000);
    await repository().recordSeries(
      seriesFor(symbol, session, { count: 5, coveredEnd: storedEnd }),
    );

    const requested = toTimeRange(session.open, session.close);
    const { series } = await repository().readSeries(
      symbol,
      "1m",
      requested,
      readAt,
    );

    expect(series.coverage.requested).toEqual(requested);
    expect(series.coverage.covered?.end.getTime()).toBe(storedEnd.getTime());
  });

  it("returns an untracked security's stored history, and does not 404 it", async () => {
    // `UNIVERSE.md` §12.2 and `MARKET-DATA-API.md` §7: filter on `status` when
    // computing over the market we track *now*, never when showing something we
    // *stored*. Bars filed against a security we have stopped tracking are
    // still what happened, and refusing them would be a lie about data we hold.
    //
    // The failure this catches is invisible in a query that omits the filter,
    // which is why it is asserted against a real `untracked` row rather than
    // left as a comment.
    const [session] = sessions(1);
    if (session === undefined) throw new Error("no session");

    await repository().recordSeries(seriesFor(symbol, session, { count: 4 }));
    await db().query(
      "update securities set status = 'untracked' where symbol = $1",
      [symbol],
    );

    const { series, held } = await repository().readSeries(
      symbol,
      "1m",
      toTimeRange(session.open, session.close),
      readAt,
    );

    expect(series.bars).toHaveLength(4);
    expect(held?.barCount).toBe(4);

    await db().query(
      "update securities set status = 'active' where symbol = $1",
      [symbol],
    );
  });

  it("tells four empty answers apart", async () => {
    // The route needs all four and a `BarSeries` alone expresses two, which is
    // why the ledger row travels beside the series. The first is not this
    // read's to answer — `MARKET-DATA-API.md` §6: a 404 is about the SECURITY,
    // never about the data — and it is asserted here anyway, because a read
    // that threw on an unknown symbol would take that decision away from the
    // route.
    const [session] = sessions(1);
    if (session === undefined) throw new Error("no session");
    const requested = toTimeRange(session.open, session.close);

    // 1. A symbol this database does not have. Empty, no ledger row, no throw.
    //    The securities lookup is what makes it a 404 (Task 2.9.6).
    const unknown = await repository().readSeries(
      toTicker("ZZZZ"),
      "1m",
      requested,
      readAt,
    );
    expect(unknown.series.bars).toEqual([]);
    expect(unknown.held).toBeUndefined();

    // 2. A security we track and hold nothing for. Same shape, different
    //    meaning, and the difference is the securities lookup rather than this.
    const nothing = await repository().readSeries(
      symbol,
      "1m",
      requested,
      readAt,
    );
    expect(nothing.series.bars).toEqual([]);
    expect(nothing.held).toBeUndefined();

    // 3. A window inside data we hold, in which nothing traded. **This is the
    //    one the ledger row distinguishes**: an empty series again, but with a
    //    statement beside it saying we did look this far.
    await repository().recordSeries(seriesFor(symbol, session, { count: 3 }));
    const quiet = await repository().readSeries(
      symbol,
      "1m",
      toTimeRange(
        new Date(session.open.getTime() + 60 * 60_000),
        new Date(session.open.getTime() + 61 * 60_000),
      ),
      readAt,
    );
    expect(quiet.series.bars).toEqual([]);
    expect(quiet.series.coverage.covered).toBeNull();
    expect(quiet.held).toBeDefined();
    expect(quiet.held?.covered.end.getTime()).toBe(session.close.getTime());

    // 4. A timeframe we hold nothing at, for a security we do hold. The ledger
    //    keys on the pair, so this is empty even though `1m` is not.
    const daily = await repository().readSeries(
      symbol,
      "1d",
      requested,
      readAt,
    );
    expect(daily.series.bars).toEqual([]);
    expect(daily.held).toBeUndefined();
  });

  it("returns bars in the window only, half-open at both ends", async () => {
    const [session] = sessions(1);
    if (session === undefined) throw new Error("no session");

    await repository().recordSeries(seriesFor(symbol, session, { count: 5 }));

    // [open, open+3m) is three bars: the one at open+3m is outside it.
    const { series } = await repository().readSeries(
      symbol,
      "1m",
      toTimeRange(session.open, new Date(session.open.getTime() + 3 * 60_000)),
      readAt,
    );

    expect(series.bars).toHaveLength(3);
    expect(series.bars[0]?.startsAt.getTime()).toBe(session.open.getTime());
  });
});

describe("the ledger's provenance vocabulary, and the checks that back it", () => {
  it("permits exactly the members of PROVIDER_IDS and MARKET_FEEDS", async () => {
    // `market_bars_timeframe_check`'s arrangement, for the same reason and with
    // the same parse: Postgres rewrites `check (provider in (…))` as
    // `= ANY (ARRAY[…])`, so an assertion written against the migration's own
    // text would never match what the database holds.
    //
    // What it closes is the gap that makes a union in `packages/shared` and a
    // `check` in the database two spellings of one vocabulary. It matters more
    // here than for `timeframe`: `MARKET_FEEDS` is the invariant-6 vocabulary,
    // so a member the database refuses is a feed the product cannot record
    // having read.
    for (const [constraint, vocabulary] of [
      ["bar_coverage_provider_check", PROVIDER_IDS],
      ["bar_coverage_feed_check", MARKET_FEEDS],
    ] as const) {
      const result = await db().query<{ definition: string }>(
        `select pg_get_constraintdef(oid) as definition
           from pg_constraint
          where conrelid = 'bar_coverage'::regclass
            and conname = $1`,
        [constraint],
      );

      expect(result.rows, constraint).toHaveLength(1);
      const permitted = [
        ...(result.rows[0]?.definition ?? "").matchAll(/'([^']*)'::text/g),
      ]
        .map((match) => match[1])
        .sort();

      expect(permitted, constraint).toEqual([...vocabulary].sort());
    }
  });
});

describe("the source the ledger stores, and the writer that keeps it true", () => {
  afterEach(clearStore);

  it("stores the series' own source rather than a constant", async () => {
    // The whole reason `0007_bar_coverage_provenance.sql` exists. A read
    // boundary asserting `alpaca`/`sip` would label these invented prices as
    // the full US consolidated tape, and `backfill.database.test.ts` proves
    // that store is a thing this repository creates on purpose.
    const [session] = sessions(1);
    if (session === undefined) throw new Error("no session");

    const requested = toTimeRange(session.open, session.close);
    const invented = sessionBars(session, 3);
    await repository().recordSeries(
      toBarSeries({
        symbol,
        timeframe: "1m",
        bars: invented,
        provenance: toSeriesProvenance("raw", {
          provider: "fixture",
          feed: "synthetic",
          retrievedAt: "2026-09-08T00:00:00.000Z",
          barCount: invented.length,
        }),
        coverage: { requested, covered: requested },
      }),
    );

    const { series, held } = await repository().readSeries(
      symbol,
      "1m",
      requested,
      new Date("2030-01-01T00:00:00.000Z"),
    );

    expect(held?.source).toEqual({ provider: "fixture", feed: "synthetic" });
    const [source] = series.provenance.sources;
    expect(source.provider).toBe("fixture");
    expect(source.feed).toBe("synthetic");
  });

  it("refuses a second source for a series it already holds, writing nothing", async () => {
    // **`0004_market_bars.sql`'s trigger, fired.** One ledger row describes one
    // source, and `market_bars` stores none per row — so appending a second
    // feed to a window a first one filled would put both under one label with
    // nothing able to tell them apart. That is invariant 6 failing with nothing
    // going red, and this is the mechanism that makes it go red instead.
    const [session, next] = sessions(2);
    if (session === undefined || next === undefined) {
      throw new Error("no sessions");
    }

    await repository().recordSeries(seriesFor(symbol, session, { count: 3 }));

    const requested = toTimeRange(next.open, next.close);
    const live = sessionBars(next, 2);
    const iex = toBarSeries({
      symbol,
      timeframe: "1m",
      bars: live,
      provenance: toSeriesProvenance("raw", {
        // Epic 3's stream, against this story's stored SIP history.
        provider: "alpaca",
        feed: "iex",
        retrievedAt: "2026-09-08T00:00:00.000Z",
        barCount: live.length,
      }),
      coverage: { requested, covered: requested },
    });

    await expect(repository().recordSeries(iex)).rejects.toThrow(
      ForeignSourceError,
    );

    // Nothing of the refused series landed, and the ledger still says what it
    // said. A refusal that had written half the bars would be worse than the
    // mislabelling it exists to prevent.
    const stored = await db().query<{ count: string }>(
      "select count(*) as count from market_bars",
    );
    expect(stored.rows[0]?.count).toBe("3");

    const held = await repository().readCoverage(symbol, "1m");
    expect(held?.source).toEqual(STORED_SOURCE);
  });

  it("refuses a stitched series, which names two sources for one window", async () => {
    // `mergeSeriesProvenance` is the only way to obtain a multi-source record
    // and Task 2.9.5 produces one routinely — the stored half plus a live tail.
    // The ledger holds one source per window, so the honest way to store such a
    // series is to record each part against the window it actually covers.
    // Taking the first source silently is how both halves end up under one
    // label.
    const [session] = sessions(1);
    if (session === undefined) throw new Error("no session");

    const requested = toTimeRange(session.open, session.close);
    const stitched = sessionBars(session, 4);
    const series = toBarSeries({
      symbol,
      timeframe: "1m",
      bars: stitched,
      provenance: mergeSeriesProvenance(
        toSeriesProvenance("raw", {
          provider: "alpaca",
          feed: "sip",
          retrievedAt: "2026-09-08T00:00:00.000Z",
          barCount: 2,
        }),
        toSeriesProvenance("raw", {
          provider: "alpaca",
          feed: "iex",
          retrievedAt: "2026-09-08T00:00:00.000Z",
          barCount: 2,
        }),
      ),
      coverage: { requested, covered: requested },
    });

    await expect(repository().recordSeries(series)).rejects.toThrow(
      ForeignSourceError,
    );

    const stored = await db().query<{ count: string }>(
      "select count(*) as count from market_bars",
    );
    expect(stored.rows[0]?.count).toBe("0");
  });
});

describe("readLastCloses — the read behind the first price on screen", () => {
  afterEach(clearStore);

  /**
   * A daily bar at **market midnight**, which is how a `1d` bar is labelled.
   *
   * 04:00Z in EDT and 05:00Z in EST. Written as an explicit instant rather than
   * derived, because the thing under test one layer up is the conversion back
   * to a session date — a helper that computed the instant from the date would
   * be the same arithmetic on both sides of the assertion.
   */
  async function dailyBar(
    id: string,
    observedAt: string,
    close: number,
  ): Promise<void> {
    await insertBar({
      security_id: id,
      timeframe: "1d",
      observed_at: observedAt,
      open: close - 1,
      high: close + 1,
      low: close - 2,
      close,
      volume: 1_000_000,
    });
  }

  it("answers the newest close and the one before it", async () => {
    await dailyBar(securityId, "2026-09-02T04:00:00.000Z", 224.41);
    await dailyBar(securityId, "2026-09-03T04:00:00.000Z", 228.45);
    await dailyBar(securityId, "2026-09-04T04:00:00.000Z", 230.36);

    const found = await repository().readLastCloses("1d");

    expect(found.get(symbol)).toEqual({
      symbol,
      observedAt: new Date("2026-09-04T04:00:00.000Z"),
      close: 230.36,
      previousClose: 228.45,
    });
  });

  it("compares against the session before, not the day before", async () => {
    // The reason the previous close is READ rather than derived. These two
    // sessions are a Friday and the Monday after Labor Day; nothing traded in
    // between, and arithmetic on a calendar would look for a session that does
    // not exist. Made to fail by reversing the `observed_at` ordering, at which
    // point the pair comes back as (oldest, newest) and every figure on the
    // page has its sign inverted.
    await dailyBar(securityId, "2026-09-04T04:00:00.000Z", 230.36);
    await dailyBar(securityId, "2026-09-08T04:00:00.000Z", 235.1);

    const close = closes(await repository().readLastCloses("1d"), symbol);

    expect(close.observedAt).toEqual(new Date("2026-09-08T04:00:00.000Z"));
    expect(close.previousClose).toBe(230.36);
  });

  it("reports a single stored session as a null previous, never a zero", async () => {
    // §36's partial answer, one field wide. A zero would render as a −100%
    // move, which is the most alarming wrong number this page could produce.
    await dailyBar(securityId, "2026-09-04T04:00:00.000Z", 230.36);

    expect(
      closes(await repository().readLastCloses("1d"), symbol),
    ).toMatchObject({ close: 230.36, previousClose: null });
  });

  it("omits a security we hold no daily bars for", async () => {
    // The absence is a missing key rather than a null price — `listCoverage`'s
    // spelling of the same distinction, and the one that keeps "we hold nothing
    // for this" from becoming "it closed at nothing".
    await dailyBar(securityId, "2026-09-04T04:00:00.000Z", 230.36);

    const found = await repository().readLastCloses("1d");

    expect(found.has(symbol)).toBe(true);
    expect(found.has(otherSymbol)).toBe(false);
  });

  it("reads the timeframe it was asked for and not the other one", async () => {
    // The cost decision, held by a test. Minute bars for the same security are
    // 47.7M rows in the deployed store and are not what a close is: a session's
    // official close carries the auction print, which single-venue minute bars
    // may not contain. A read that fell through to `1m` would answer with a
    // plausible and different number.
    await dailyBar(securityId, "2026-09-04T04:00:00.000Z", 230.36);
    await insertBar({
      security_id: securityId,
      timeframe: "1m",
      observed_at: "2026-09-04T19:59:00.000Z",
      close: 999.99,
    });

    expect(closes(await repository().readLastCloses("1d"), symbol).close).toBe(
      230.36,
    );
    expect(closes(await repository().readLastCloses("1m"), symbol).close).toBe(
      999.99,
    );
  });

  it("answers for every security that has bars, in one query", async () => {
    await dailyBar(securityId, "2026-09-03T04:00:00.000Z", 10);
    await dailyBar(securityId, "2026-09-04T04:00:00.000Z", 11);
    await dailyBar(otherSecurityId, "2026-09-04T04:00:00.000Z", 20);

    const found = await repository().readLastCloses("1d");

    expect([...found.keys()].sort()).toEqual([symbol, otherSymbol].sort());
    expect(closes(found, otherSymbol).previousClose).toBeNull();
  });

  it("returns a security we have stopped tracking", async () => {
    // `UNIVERSE.md` §12.2's rule, on the *do not filter* side: a security we
    // removed from the curated file still closed at a price on the last session
    // we hold, and the page renders the row. Nothing in the query filters
    // `status`, and this is what says so.
    await db().query(
      "update securities set status = 'untracked' where id = $1",
      [securityId],
    );
    await dailyBar(securityId, "2026-09-04T04:00:00.000Z", 230.36);

    try {
      expect((await repository().readLastCloses("1d")).has(symbol)).toBe(true);
    } finally {
      await db().query(
        "update securities set status = 'active' where id = $1",
        [securityId],
      );
    }
  });

  it("parses a numeric column into a number rather than the string pg hands back", async () => {
    // `pg` returns a `numeric` as a **string**, deliberately. A price that
    // stayed a string renders, sorts wrongly, and throws nowhere — so the parse
    // is asserted on the type rather than on the value.
    await dailyBar(securityId, "2026-09-04T04:00:00.000Z", 230.36);

    expect(
      typeof closes(await repository().readLastCloses("1d"), symbol).close,
    ).toBe("number");
  });
});

/** One entry out of the map, or a failing test rather than an `undefined`. */
function closes(
  found: ReadonlyMap<Ticker, LastClose>,
  ticker: Ticker,
): LastClose {
  const close = found.get(ticker);
  if (close === undefined) throw new Error(`no close for ${ticker}`);
  return close;
}
