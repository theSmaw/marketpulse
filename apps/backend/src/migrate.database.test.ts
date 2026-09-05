// The sixth level of test: a real database, under its own command (Task 2.2.5).
//
// Epic 1 has five levels — unit, integration through `app.inject()`, component
// under jsdom, the process half against a spawned `dist/index.js`, and a real
// browser. This is the sixth, and it exists because three claims this story
// makes are **only** answerable by a database:
//
//   1. Acceptance criterion 2 — a migration applied to an empty database
//      produces the expected schema, and applying it twice is a no-op. That was
//      measured once by hand in Tasks 2.2.2 and 2.2.4; here it becomes a check.
//   2. The hand-written `Database` interface in `schema.ts` matches the schema
//      the migrations actually produce. Nothing generates either one, so this
//      is the only thing standing between them.
//   3. The conventions in `../migrations/README.md` that are reachable from a
//      migrated database, which that document names one by one and hands here.
//
// **What it does to the database it ran against: nothing.** It creates a
// database of its own, migrates that, reads it, and drops it — see
// {@link TEST_DATABASE_NAME}. The alternatives were weighed and each fails a
// property this repository already holds. A transaction rolled back per test
// cannot work, because the migrator opens one of its own around the whole run
// and the thing under test is what that transaction does. Truncation destroys the
// development database's rows — which from Story 2.3 onward is a ~100-row
// universe that takes a documented command to rebuild, so a suite that
// truncates costs a developer that command every time they run it. And a
// schema-per-run needs `search_path` games that the migration SQL, which names
// tables unqualified, would silently follow into the wrong place. A separate
// database is the only option where **running this suite is invisible to the
// database you were debugging**, which is the same argument Task 2.1.2 used to
// keep the database out of `pnpm dev`.
//
// **There is no `skipIf` and there never will be.** A skipped test reports
// green, which this repository has twice called the worst failure mode
// available. Task 2.1.4's answer was for the test to ask the question itself
// and assert the matching answer either way; this suite cannot do that, because
// it genuinely needs a database rather than merely caring whether one exists.
// So it **fails loudly** in `beforeAll`, with a message naming `pnpm db`.
//
// **How it points the runner at its own database.** `runMigrations()` reads
// `loadConfig()`, which reads `process.env`, and a real environment variable
// beats a `.env` entry — measured rather than assumed, because the whole
// arrangement rests on it. So the suite sets `DATABASE_NAME` and restores it.
// That is the *supported* interface an operator would use, not a seam opened
// for a test: `migrate.ts` is untouched, and in particular it still does not
// export the `Kysely` instance it builds, so this file opens its own `pg`
// client. Relaxing that export to save a few lines here would undo Task 2.2.1's
// query-layer seam for a test's convenience, which is the trade Task 1.13.3
// refused when it declined to move two constants into `packages/shared`.

import { readdir } from "node:fs/promises";
import { basename, resolve } from "node:path";

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { SECURITY_KINDS } from "@marketpulse/shared";

import { loadConfig, loadEnvFile } from "./config.js";
import { runMigrations } from "./migrate.js";
import type { SecuritiesTable } from "./schema.js";

/**
 * The database this suite creates, uses and drops.
 *
 * A fixed name rather than a per-run one, and dropped **at the start as well as
 * at the end**, which is what makes a crashed previous run self-healing rather
 * than something a developer has to clean up by hand. `fileParallelism: false`
 * in the config is what stops two files racing over it.
 */
const TEST_DATABASE_NAME = "marketpulse_vitest";

/** The same directory `migrate.ts` reads, resolved the same way. */
const MIGRATIONS_DIR = resolve(import.meta.dirname, "../migrations");

/**
 * Bookkeeping, which is not part of the schema being checked.
 *
 * Kysely's two, plus `migration_checksum` (Task 2.2.7), which is the migration
 * runner's own. The conventions in `migrations/README.md` are about tables that
 * describe things in the world — a `bigint` identity `id`, the `observed_at` /
 * `recorded_at` pair, `numeric` for money — and none of them means anything for
 * a table keyed on a migration's name. Excluding it here rather than making it
 * conform is the same call the list already makes for Kysely's, and it is why
 * that table is deliberately named in the singular too.
 */
const BOOKKEEPING_TABLES = [
  "kysely_migration",
  "kysely_migration_lock",
  "migration_checksum",
];

interface ColumnRow {
  readonly table_name: string;
  readonly column_name: string;
  readonly data_type: string;
  readonly is_nullable: "YES" | "NO";
  readonly is_identity: "YES" | "NO";
  readonly column_default: string | null;
  readonly numeric_precision: number | null;
  readonly numeric_scale: number | null;
}

/**
 * What `schema.ts` claims about one column, in a form a test can compare
 * against `information_schema`.
 *
 * A TypeScript interface is erased, so it cannot be read at run time. What
 * closes that gap is {@link EXPECTED_SECURITIES} being declared
 * `satisfies Record<keyof SecuritiesTable, ExpectedColumn>` — the same idiom
 * `health.ts`'s response schema uses against `HealthResponse`, and it means a
 * column added to the interface and not described here is a **compile** error
 * rather than a test that quietly checks one fewer thing.
 */
interface ExpectedColumn {
  /** `information_schema.columns.data_type`, verbatim. */
  readonly dataType: string;
  readonly nullable: boolean;
  /** `generated always as identity`. Note this reads `column_default: null`. */
  readonly identity?: true;
  /** The literal text of a `default`, e.g. `now()`. */
  readonly defaultExpression?: string;
}

/**
 * The `securities` half of `schema.ts`, restated in the vocabulary Postgres
 * uses.
 *
 * This is a **third** description of one table, after the migration and the
 * interface, and that is the point rather than an accident: the compiler binds
 * it to the interface and this suite binds it to the database, so the two hops
 * together bind the interface to the database, which is the thing nothing
 * checked.
 */
const EXPECTED_SECURITIES = {
  id: { dataType: "bigint", nullable: false, identity: true },
  symbol: { dataType: "text", nullable: false },
  name: { dataType: "text", nullable: false },
  exchange: { dataType: "text", nullable: false },
  kind: { dataType: "text", nullable: false },
  sector: { dataType: "text", nullable: true },
  industry: { dataType: "text", nullable: true },
  status: { dataType: "text", nullable: false },
  cik: { dataType: "text", nullable: true },
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
} satisfies Record<keyof SecuritiesTable, ExpectedColumn>;

let adminPool: pg.Pool | undefined;
let testPool: pg.Pool | undefined;

/**
 * The pool for the database this suite created.
 *
 * A helper rather than a non-null assertion: `beforeAll` throws loudly when
 * there is no database, so by the time a test runs this is always defined — but
 * that is a fact about the fixture rather than one the compiler can see, and
 * asserting it away would also swallow the case where a future `beforeAll`
 * returns early.
 */
function db(): pg.Pool {
  if (testPool === undefined) {
    throw new Error("beforeAll did not create the test database.");
  }
  return testPool;
}

async function readColumns(pool: pg.Pool): Promise<readonly ColumnRow[]> {
  const result = await pool.query<ColumnRow>(
    `select table_name, column_name, data_type, is_nullable, is_identity,
            column_default, numeric_precision, numeric_scale
       from information_schema.columns
      where table_schema = 'public'
      order by table_name, ordinal_position`,
  );
  return result.rows;
}

beforeAll(async () => {
  loadEnvFile();
  const config = loadConfig();

  // Deliberately NOT `createDatabasePool`: that resolves an Entra token under
  // `DATABASE_AUTH=entra`, and this suite is local-only by construction — it
  // issues `CREATE DATABASE`, which is not something the deployed identity
  // should be able to do. Plain `pg` with the same settings keeps that
  // asymmetry visible rather than accidental.
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
    // Loud, and naming the command. The whole point of not having `skipIf`.
    throw new Error(
      `This suite needs a running database and could not reach ${config.database.host}:${String(config.database.port)}.\n` +
        "Start one with `pnpm db`, then run `pnpm test:database` again.",
      // The driver's own error says *why* — ECONNREFUSED against a stopped
      // container reads very differently from an authentication failure — and
      // `preserve-caught-error` is right that discarding it would throw that
      // away.
      { cause: error },
    );
  }

  // Identifiers cannot be parameterised, and this one is a module constant
  // rather than input, so interpolation is safe here in a way it would not be
  // if it came from anywhere else.
  await adminPool.query(`drop database if exists ${TEST_DATABASE_NAME}`);
  await adminPool.query(`create database ${TEST_DATABASE_NAME}`);

  process.env.DATABASE_NAME = TEST_DATABASE_NAME;
  testPool = new pg.Pool({ ...connection, database: TEST_DATABASE_NAME });
});

afterAll(async () => {
  delete process.env.DATABASE_NAME;
  await testPool?.end();

  if (adminPool !== undefined) {
    // Dropped here as well as in `beforeAll`. Both matter: this one keeps an
    // ordinary run from leaving anything behind, and the other one makes a run
    // that crashed before reaching here self-healing rather than something a
    // developer has to clean up by hand.
    await adminPool.query(`drop database if exists ${TEST_DATABASE_NAME}`);
    await adminPool.end();
  }
});

describe("the migration mechanism", () => {
  it("migrates an empty database, and every file on disk is applied", async () => {
    const files = (await readdir(MIGRATIONS_DIR)).filter((file) =>
      file.endsWith(".sql"),
    );

    const outcome = await runMigrations();

    expect(outcome.errors).toEqual([]);
    expect(outcome.exitCode).toBe(0);
    // Counted from the directory rather than pinned to a number, so adding a
    // migration does not silently leave this assertion checking fewer things.
    expect(outcome.lines.filter((line) => line.includes("✓"))).toHaveLength(
      files.length,
    );
    expect(files.length).toBeGreaterThan(0);
  });

  it("applying it a second time changes nothing at all", async () => {
    const before = await readColumns(db());

    const outcome = await runMigrations();

    expect(outcome.exitCode).toBe(0);
    expect(outcome.lines.join("")).toContain("Already up to date");
    // Acceptance criterion 2's second half. Asserting the *schema* rather than
    // only the runner's own report is the point: a runner that said "up to
    // date" while a migration had quietly re-run would pass the first check and
    // fail this one.
    expect(await readColumns(db())).toEqual(before);
  });

  it("records what it applied, and nothing it did not", async () => {
    const files = (await readdir(MIGRATIONS_DIR))
      .filter((file) => file.endsWith(".sql"))
      .map((file) => basename(file, ".sql"))
      .sort();

    const recorded = await db().query<{ name: string }>(
      "select name from kysely_migration order by name",
    );

    expect(recorded.rows.map((row) => row.name)).toEqual(files);
  });

  // The checksum pass, against a real database rather than against a pure
  // function (Task 2.2.7). `checkMigrationChecksums` has its own unit tests and
  // they cover the decision; what they cannot cover is that the row was
  // actually written when the migration ran, that the runner reads it back, and
  // that a mismatch stops the run before anything is applied. Task 2.2.6's
  // finding is exactly that two green instruments can sit over a wrong
  // database, so this one is worth having at the level that talks to one.
  //
  // It corrupts the RECORD rather than the file, which is the same divergence
  // seen from the other side and is the only version of it a test can produce
  // without editing a tracked migration.
  it("refuses to migrate when an applied migration no longer matches its record", async () => {
    const original = await db().query<{ name: string; checksum: string }>(
      "select name, checksum from migration_checksum order by name",
    );
    expect(original.rows.length).toBeGreaterThan(0);
    const target = original.rows[0]?.name ?? "";

    await db().query(
      "update migration_checksum set checksum = $1 where name = $2",
      ["0".repeat(64), target],
    );

    try {
      const outcome = await runMigrations();

      expect(outcome.exitCode).toBe(1);
      const text = outcome.errors.join("");
      expect(text).toContain(target);
      expect(text).toContain("Nothing was migrated");
    } finally {
      await db().query(
        "update migration_checksum set checksum = $1 where name = $2",
        [original.rows[0]?.checksum ?? "", target],
      );
    }
  });

  it("records a checksum for every migration it applied", async () => {
    const applied = await db().query<{ name: string }>(
      "select name from kysely_migration order by name",
    );
    const checksums = await db().query<{ name: string }>(
      "select name from migration_checksum order by name",
    );

    expect(checksums.rows.map((row) => row.name)).toEqual(
      applied.rows.map((row) => row.name),
    );
  });
});

describe("the Database interface in schema.ts", () => {
  // The gap this closes, stated once: Kysely generates nothing, so `schema.ts`
  // is hand-written, and a column renamed in a migration and not in the
  // interface typechecks, lints, builds and fails at run time. Task 2.2.4 made
  // this comparison once by hand; this is that measurement turned into a check.

  it("describes every column of securities, and no column it does not have", async () => {
    const actual = (await readColumns(db())).filter(
      (column) => column.table_name === "securities",
    );

    expect(actual.length).toBeGreaterThan(0);
    // Both directions. The first catches a column added to the database and
    // not to the interface; the second catches the reverse — and the compiler
    // has already caught a column added to the interface and not to
    // EXPECTED_SECURITIES, through the `satisfies` above.
    expect(actual.map((column) => column.column_name).sort()).toEqual(
      Object.keys(EXPECTED_SECURITIES).sort(),
    );
  });

  it.each(Object.entries(EXPECTED_SECURITIES))(
    "agrees with the database about securities.%s",
    async (name, expected: ExpectedColumn) => {
      const column = (await readColumns(db())).find(
        (row) => row.table_name === "securities" && row.column_name === name,
      );

      expect(column).toBeDefined();
      expect(column?.data_type).toBe(expected.dataType);
      expect(column?.is_nullable).toBe(expected.nullable ? "YES" : "NO");

      // The trap Task 2.2.4 found: an identity column reports
      // `column_default: null` and `is_identity: 'YES'`, so a check written
      // against the default alone concludes there is no identity and finds
      // nothing wrong.
      expect(column?.is_identity).toBe(
        expected.identity === true ? "YES" : "NO",
      );
      expect(column?.column_default).toBe(expected.defaultExpression ?? null);
    },
  );
});

describe("SECURITY_KINDS and the check constraint that backs it", () => {
  // Task 2.2.4 created this gap deliberately and in the open: the union in
  // `packages/shared` and `securities_kind_check` in the database are two
  // spellings of one vocabulary, and adding a member to one without the other
  // gives a value the compiler permits and the database refuses, at run time,
  // in whatever writes it. Both halves are readable from here, so by this
  // repository's rule — a test beats another `verify` step whenever the thing
  // is reachable from an assembled instance — it is a check rather than a third
  // paragraph of prose.

  it("permits exactly the members of SECURITY_KINDS", async () => {
    const constraint = await db().query<{ definition: string }>(
      `select pg_get_constraintdef(oid) as definition
         from pg_constraint
        where conrelid = 'securities'::regclass and conname = $1`,
      ["securities_kind_check"],
    );

    expect(constraint.rows).toHaveLength(1);
    const definition = constraint.rows[0]?.definition ?? "";

    // Parsed rather than string-matched, because **Postgres rewrites the
    // constraint**: `check (kind in ('equity', 'etf'))` reads back as
    // `CHECK ((kind = ANY (ARRAY['equity'::text, 'etf'::text])))`, so an
    // assertion written against what the migration says would never match what
    // the database holds.
    const permitted = [...definition.matchAll(/'([^']*)'::text/g)]
      .map((match) => match[1])
      .sort();

    expect(permitted).toEqual([...SECURITY_KINDS].sort());
  });

  it("refuses a value outside it", async () => {
    // The compile-time half is `SecurityKind`; this is the run-time half, and
    // it is what a writer that bypassed the type would meet.
    await expect(
      db().query(
        `insert into securities (symbol, name, exchange, kind, status)
         values ('ZZZZ', 'Probe', 'PROBE', 'mutual_fund', 'active')`,
      ),
    ).rejects.toThrow(/securities_kind_check/);
  });
});

describe("the conventions in migrations/README.md that a database can check", () => {
  // That document ends with two lists. These are the entries it named as
  // *reachable* from a migrated database and handed here with the reading that
  // would check them. The rest stay prose permanently, because a database can
  // confirm both timestamps are `timestamptz` and nothing can confirm a writer
  // put the right value in the right one.

  async function projectColumns(): Promise<readonly ColumnRow[]> {
    return (await readColumns(db())).filter(
      (column) => !BOOKKEEPING_TABLES.includes(column.table_name),
    );
  }

  it("has something to look at, which is not automatic", async () => {
    // The guard that stops every assertion below passing by being blind — Task
    // 1.13.6's blind-renderer problem in a new place. A sweep over an empty
    // schema is green and certifies nothing, and the two look identical.
    const columns = await projectColumns();

    expect(columns.length).toBeGreaterThan(0);
    expect(
      new Set(columns.map((column) => column.table_name)).size,
    ).toBeGreaterThan(0);
  });

  it("uses timestamptz and never a naive timestamp", async () => {
    const naive = (await projectColumns()).filter(
      (column) => column.data_type === "timestamp without time zone",
    );

    expect(naive).toEqual([]);
    // Non-vacuous: there is at least one timestamp to have got wrong.
    expect(
      (await projectColumns()).filter(
        (column) => column.data_type === "timestamp with time zone",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("has no floating-point column anywhere", async () => {
    const floats = (await projectColumns()).filter((column) =>
      ["double precision", "real"].includes(column.data_type),
    );

    expect(floats).toEqual([]);
  });

  it("uses none of the banned column names", async () => {
    // `created_at` is banned because it is ambiguous between the two timestamps
    // a row has; the soft-delete names because nothing here is soft-deleted and
    // a second invisible predicate is a bug waiting for whichever one somebody
    // forgets.
    const banned = ["created_at", "deleted_at", "is_deleted", "archived_at"];
    const found = (await projectColumns()).filter((column) =>
      banned.includes(column.column_name),
    );

    expect(found).toEqual([]);
  });

  it("gives every table an identity id", async () => {
    const columns = await projectColumns();
    const tables = [...new Set(columns.map((column) => column.table_name))];

    expect(tables.length).toBeGreaterThan(0);

    for (const table of tables) {
      const id = columns.find(
        (column) => column.table_name === table && column.column_name === "id",
      );

      expect(id, `${table} has no id column`).toBeDefined();
      // `is_identity` and not `column_default`, which is null here.
      expect(id?.is_identity, `${table}.id is not an identity column`).toBe(
        "YES",
      );
      expect(id?.data_type, `${table}.id is not a bigint`).toBe("bigint");
    }
  });

  it("has no money column yet, so the numeric(18,6) rule is UNTESTED", async () => {
    // Not a check — a **tripwire**, and the honest way to record a vacuous
    // rule. `securities` holds no money, so "every price column is
    // numeric(18, 6)" would pass against a schema containing no numbers at all,
    // which is a green result that certifies nothing.
    //
    // This assertion fails the moment a numeric column arrives, which is
    // `market_bars` in Story 2.7. That failure is the point: it puts whoever
    // adds it in this file, to replace this test with the real one rather than
    // to discover months later that the rule was never enforced.
    const numerics = (await projectColumns()).filter(
      (column) => column.data_type === "numeric",
    );

    expect(
      numerics,
      "A numeric column now exists, so the money rule is no longer vacuous: " +
        "replace this tripwire with a real check that every price column is " +
        "numeric(18, 6), and update migrations/README.md's two lists.",
    ).toEqual([]);
  });
});
