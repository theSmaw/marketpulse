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
// cannot work, because a migration opens its own transaction and the thing
// under test is what that transaction does. Truncation destroys the
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

import {
  SECTORS,
  SECURITY_KINDS,
  SECURITY_STATUSES,
} from "@marketpulse/shared";

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

/** Kysely's own bookkeeping, which is not part of the schema being checked. */
const BOOKKEEPING_TABLES = ["kysely_migration", "kysely_migration_lock"];

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
  profile_source: { dataType: "text", nullable: false },
  profile_retrieved_at: {
    dataType: "timestamp with time zone",
    nullable: false,
  },
  classification_source: { dataType: "text", nullable: false },
  classification_retrieved_at: {
    dataType: "timestamp with time zone",
    nullable: false,
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

/**
 * Insert one row, overriding whichever fields a test is about.
 *
 * The defaults are a valid equity, so every test below states only the thing it
 * is trying to break — which is what stops a constraint test passing because a
 * *different* constraint refused the row first. Each test asserts on the
 * constraint's own name for the same reason.
 */
async function insertProbe(
  overrides: Readonly<Record<string, string | null>> = {},
): Promise<void> {
  const row: Record<string, string | null> = {
    symbol: "ZZZZ",
    name: "Probe",
    exchange: "PROBE",
    kind: "equity",
    sector: "technology",
    industry: null,
    status: "active",
    cik: null,
    profile_source: "test",
    profile_retrieved_at: new Date().toISOString(),
    classification_source: "test",
    classification_retrieved_at: new Date().toISOString(),
    ...overrides,
  };

  const names = Object.keys(row);
  const placeholders = names.map((_, index) => `$${String(index + 1)}`);

  await db().query(
    `insert into securities (${names.join(", ")})
     values (${placeholders.join(", ")})`,
    names.map((name) => row[name] ?? null),
  );
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

describe("the closed vocabularies and the check constraints that back them", () => {
  // Task 2.2.4 created this gap deliberately and in the open: a union in
  // `packages/shared` and a `check` constraint in the database are two
  // spellings of one vocabulary, and adding a member to one without the other
  // gives a value the compiler permits and the database refuses, at run time,
  // in whatever writes it. Both halves are readable from here, so by this
  // repository's rule — a test beats another `verify` step whenever the thing
  // is reachable from an assembled instance — it is a check rather than a third
  // paragraph of prose.
  //
  // **It is worth knowing that this check has caught something.** Task 2.3.2
  // widened `SECURITY_KINDS` to three members and Task 2.3.3 wrote the
  // migration; in between, this reported `1 failed | 22 passed` naming both
  // sides. That is the only evidence worth having that a check works.
  //
  // Table-driven rather than one test per vocabulary, because `0003` took this
  // schema from one closed set to three and the next table will add more. The
  // spec below is the thing to extend.
  const CLOSED_SETS = [
    { constraint: "securities_kind_check", members: SECURITY_KINDS },
    { constraint: "securities_status_check", members: SECURITY_STATUSES },
    { constraint: "securities_sector_check", members: SECTORS },
  ] as const;

  async function constraintDefinition(name: string): Promise<string> {
    const result = await db().query<{ definition: string }>(
      `select pg_get_constraintdef(oid) as definition
         from pg_constraint
        where conrelid = 'securities'::regclass and conname = $1`,
      [name],
    );

    expect(result.rows, `no constraint named ${name}`).toHaveLength(1);
    return result.rows[0]?.definition ?? "";
  }

  it.each(CLOSED_SETS)(
    "$constraint permits exactly the members of its union",
    async ({ constraint, members }) => {
      const definition = await constraintDefinition(constraint);

      // Parsed rather than string-matched, because **Postgres rewrites the
      // constraint**: `check (kind in ('equity', 'etf'))` reads back as
      // `CHECK ((kind = ANY (ARRAY['equity'::text, 'etf'::text])))`, so an
      // assertion written against what the migration says would never match
      // what the database holds.
      const permitted = [...definition.matchAll(/'([^']*)'::text/g)]
        .map((match) => match[1])
        .sort();

      expect(permitted).toEqual([...members].sort());
    },
  );

  it("refuses a kind outside SECURITY_KINDS", async () => {
    // The compile-time half is `SecurityKind`; this is the run-time half, and
    // it is what a writer that bypassed the type would meet. Note the value
    // chosen is `etf` — the member `0003` REMOVED — rather than an invented
    // one, because the non-additive half of that migration is the half worth
    // proving actually took effect.
    await expect(
      insertProbe({ kind: "etf", sector: "technology" }),
    ).rejects.toThrow(/securities_kind_check/);
  });

  it("refuses a status outside SECURITY_STATUSES", async () => {
    // `delisted` specifically: it is the member Task 2.3.1 deferred to Story
    // 2.6 because nothing here can produce it, and a database that accepted it
    // would make that deferral a comment rather than a fact.
    await expect(insertProbe({ status: "delisted" })).rejects.toThrow(
      /securities_status_check/,
    );
  });

  it("refuses a sector outside the taxonomy", async () => {
    // The label rather than the slug — the realistic mistake, and the one with
    // the most expensive silent failure, because Epic 5 indexes SECTOR_ETFS
    // with this value and an unrecognised sector is a security with no
    // benchmark.
    await expect(insertProbe({ sector: "Technology" })).rejects.toThrow(
      /securities_sector_check/,
    );
  });
});

describe("the cross-column invariant between kind and sector", () => {
  // `Security` in `packages/shared` is a discriminated union rather than one
  // interface with a nullable sector, because the nullability has two distinct
  // meanings: on an index proxy null is the correct and complete answer, and on
  // an equity it is a row that should have failed to load. The row type cannot
  // express that — a row is one interface with one nullable column — so the
  // database is the only place the two halves can be held together, and
  // `securities_sector_matches_kind` is where.
  //
  // This is deliberately **not** Story 2.3's acceptance criterion 3, whose
  // second half ("every sector present has a corresponding sector ETF") is a
  // statement about the whole table and stays Task 2.3.5's loader's.

  it("refuses an equity with no sector", async () => {
    await expect(insertProbe({ kind: "equity", sector: null })).rejects.toThrow(
      /securities_sector_matches_kind/,
    );
  });

  it("refuses an index proxy that carries a sector", async () => {
    await expect(
      insertProbe({ kind: "index_etf", sector: "technology" }),
    ).rejects.toThrow(/securities_sector_matches_kind/);
  });

  it("accepts an index proxy with no sector, and a sector ETF with one", async () => {
    // The positive half. Without it every assertion above could be passing
    // because the constraint refuses everything, which is the same class of
    // blind-green result the tripwire below exists for.
    //
    // Cleared first rather than assumed empty: if a constraint above is broken
    // its probe row *succeeded*, and a row count that then reads 4 is a second
    // failure pointing at the wrong test.
    await db().query("delete from securities");

    await insertProbe({ symbol: "SPY", kind: "index_etf", sector: null });
    await insertProbe({
      symbol: "XLK",
      kind: "sector_etf",
      sector: "technology",
    });

    const rows = await db().query("select symbol from securities");
    expect(rows.rowCount).toBe(2);

    // Left empty for whatever runs next: this suite's other assertions read
    // `information_schema` rather than rows, but a table that quietly gained
    // rows halfway through a file is the kind of thing that makes a later
    // failure impossible to attribute.
    await db().query("delete from securities");
  });
});

describe("the provenance columns", () => {
  // Acceptance criterion 6 is that the metadata's source is recorded PER FIELD
  // in a way Story 2.13 can display. The compiler holds the field-to-group
  // mapping (`SECURITY_FIELD_GROUP` is `Record<keyof Security, …>`, so a field
  // added without a group is TS1360); what the database holds is that a row
  // cannot exist without saying where it came from.

  it("refuses a row that does not say where its data came from", async () => {
    // The enforcement half, and the reason those columns are `not null` with no
    // default. A `default 'curated'` would make this insert succeed and would
    // silently attribute a provider's row to a file — a schema that has
    // somewhere to put provenance rather than one that requires it.
    await expect(
      db().query(
        `insert into securities (symbol, name, exchange, kind, sector, status)
         values ('ZZZZ', 'Probe', 'PROBE', 'equity', 'technology', 'active')`,
      ),
    ).rejects.toThrow(/profile_source/);
  });

  it("has no source column for a judgement or for an identifier we do not hold", async () => {
    // Two groups deliberately get no columns, and their absence is as much a
    // decision as the two that do. `ours` (`kind`, `status`) gets none because
    // "we decided this" is not a retrieval; `identity` (`cik`) gets none until
    // Epic 9 populates `cik`, because a column null in every row in every
    // environment cannot be checked against anything.
    const names = (await readColumns(db()))
      .filter((column) => column.table_name === "securities")
      .map((column) => column.column_name);

    for (const absent of [
      "kind_source",
      "status_source",
      "identity_source",
      "cik_source",
      "cik_retrieved_at",
    ]) {
      expect(names, `${absent} exists; see 0003's section 5`).not.toContain(
        absent,
      );
    }
  });

  it("has no observed_at, because a sector is not a fact about the market", async () => {
    // README.md §2 asks every table to answer this explicitly rather than by
    // omission. `*_retrieved_at` is invariant 5's RETRIEVAL timestamp and there
    // is no event timestamp beside it, because there is no instant at which
    // "AAPL is in technology" became true the way a price became true. A
    // defaulted `observed_at` here would be exactly the leak that convention
    // forbids. `market_bars` in Story 2.7 is the first table that exercises the
    // pair, and this assertion fails there — deliberately, so whoever adds it
    // reads this comment.
    const names = (await readColumns(db()))
      .filter((column) => column.table_name === "securities")
      .map((column) => column.column_name);

    expect(names).not.toContain("observed_at");
    expect(names).toContain("recorded_at");
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
