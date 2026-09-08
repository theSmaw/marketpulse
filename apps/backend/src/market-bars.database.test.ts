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
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { TIMEFRAMES } from "@marketpulse/shared";

import { loadConfig, loadEnvFile } from "./config.js";
import { loadUniverse } from "./load-universe.js";
import { runMigrations } from "./migrate.js";
import type { MarketBarsTable } from "./schema.js";

/** The same database name the other three suites use, for the same reasons. */
const TEST_DATABASE_NAME = "marketpulse_vitest";

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

let adminPool: pg.Pool | undefined;
let testPool: pg.Pool | undefined;
let securityId = "";
let otherSecurityId = "";

function db(): pg.Pool {
  if (testPool === undefined) {
    throw new Error("beforeAll did not create the test database.");
  }
  return testPool;
}

async function marketBarColumns(): Promise<readonly ColumnRow[]> {
  const result = await db().query<ColumnRow>(
    `select column_name, data_type, is_nullable, is_identity,
            column_default, numeric_precision, numeric_scale
       from information_schema.columns
      where table_schema = 'public' and table_name = 'market_bars'
      order by ordinal_position`,
  );
  return result.rows;
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

  const ids = await db().query<{ id: string }>(
    "select id from securities order by symbol limit 2",
  );
  securityId = ids.rows[0]?.id ?? "";
  otherSecurityId = ids.rows[1]?.id ?? "";
  if (securityId === "" || otherSecurityId === "") {
    throw new Error("the universe loaded no securities to reference");
  }
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
