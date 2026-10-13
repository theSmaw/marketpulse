// `security_memberships` against a real database (Task 5.1.5).
//
// **What this file is for, and what it is not.** The membership history's
// *behaviour* — one row per transition, nothing on a steady state, a second
// interval on a re-add — belongs to the only writer there is and is asserted in
// `load-universe.database.test.ts`, where the full cycle runs through
// `loadUniverse()`. What is here is the **shape**: the three descriptions of
// this table (the migration, `SecurityMembershipsTable` in `schema.ts`, and the
// expectation below) bound to each other, plus the four properties that are the
// whole reason the table has the shape it has and that nothing else can see.
//
//   1. **`effective_from` has no default.** The single most important assertion
//      in this file. A `default now()` would turn the column a replay keys on
//      into a record of when a script ran — invisibly, because every row would
//      look plausible — which is `0002`'s decision 3 and `market_bars`'
//      `observed_at` arriving on a third table.
//   2. **The foreign key is real, names its column by the convention, and has
//      no `on delete`.** Done-when 5's decision, asserted rather than only
//      written down.
//   3. **The status vocabulary and `SECURITY_STATUSES` agree**, which is the
//      same gap Task 2.2.5 closed for `kind`: two spellings of one vocabulary,
//      and a member added to one and not the other is a value the compiler
//      permits and the database refuses at run time.
//   4. **There is no index and no `unique (security_id, effective_from)`**, both
//      of which are decisions with reasons in the migration rather than
//      omissions — so an index added without a reader fails here and the fix is
//      to say which query it serves.
//
// It reuses the fixture arrangement of the other database suites — its own
// `marketpulse_vitest`, created, migrated, read and dropped — so running it is
// invisible to the database you were debugging. There is no `skipIf`: with no
// database it fails loudly in `beforeAll` naming `pnpm db`, because a skipped
// test reports green.

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { SECURITY_STATUSES } from "@marketpulse/shared";

import { loadConfig, loadEnvFile } from "./config.js";
import { runMigrations } from "./migrate.js";
import type { SecurityMembershipsTable } from "./schema.js";

/** The same database name the other database suites use, for the same reasons. */
const TEST_DATABASE_NAME = "marketpulse_vitest";

interface ColumnRow {
  readonly column_name: string;
  readonly data_type: string;
  readonly is_nullable: "YES" | "NO";
  readonly is_identity: "YES" | "NO";
  readonly column_default: string | null;
}

/** What `schema.ts` claims about one column, in Postgres's own vocabulary. */
interface ExpectedColumn {
  readonly dataType: string;
  readonly nullable: boolean;
  readonly identity?: true;
  readonly defaultExpression?: string;
}

/**
 * The third description of this table, after the migration and the interface.
 *
 * The `satisfies` is the load-bearing half: a column added to
 * {@link SecurityMembershipsTable} and not described here is `TS1360` at
 * compile time, so the pair below cannot silently check one fewer thing. The
 * compiler holds interface → spec, this suite holds spec → database, and
 * therefore the hand-written interface is bound to the real schema with nothing
 * generated.
 */
const EXPECTED_SECURITY_MEMBERSHIPS = {
  id: { dataType: "bigint", nullable: false, identity: true },
  security_id: { dataType: "bigint", nullable: false },
  status: { dataType: "text", nullable: false },
  // No `defaultExpression`, and that absence is the point of the table. See the
  // test named after it.
  effective_from: { dataType: "timestamp with time zone", nullable: false },
  recorded_at: {
    dataType: "timestamp with time zone",
    nullable: false,
    defaultExpression: "now()",
  },
} satisfies Record<keyof SecurityMembershipsTable, ExpectedColumn>;

let adminPool: pg.Pool | undefined;
let testPool: pg.Pool | undefined;
let securityId = "";

function db(): pg.Pool {
  if (testPool === undefined) {
    throw new Error("beforeAll did not create the test database.");
  }
  return testPool;
}

async function columns(): Promise<readonly ColumnRow[]> {
  const result = await db().query<ColumnRow>(
    `select column_name, data_type, is_nullable, is_identity, column_default
       from information_schema.columns
      where table_schema = 'public' and table_name = 'security_memberships'
      order by ordinal_position`,
  );
  return result.rows;
}

/**
 * Insert a membership row, overriding whichever field a test is about.
 *
 * The defaults are a valid row for the security `beforeAll` created, so every
 * test below states only the thing it is trying to break — which is what stops
 * a constraint test passing because a *different* constraint refused the row
 * first.
 */
async function insertMembership(
  overrides: Readonly<Record<string, string>> = {},
): Promise<void> {
  const row: Record<string, string> = {
    security_id: securityId,
    status: "active",
    effective_from: "2026-10-12T00:00:00.000Z",
    ...overrides,
  };

  const names = Object.keys(row);
  const placeholders = names.map((_, index) => `$${String(index + 1)}`);

  await db().query(
    `insert into security_memberships (${names.join(", ")})
     values (${placeholders.join(", ")})`,
    names.map((name) => row[name] ?? null),
  );
}

beforeAll(async () => {
  loadEnvFile();
  const config = loadConfig();

  // Deliberately not `createDatabasePool`, for `migrate.database.test.ts`'s
  // reason: that resolves an Entra token under `DATABASE_AUTH=entra`, and this
  // suite issues `CREATE DATABASE`, which the deployed identity must not be
  // able to do.
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

  const inserted = await testPool.query<{ id: string }>(
    `insert into securities
       (symbol, name, exchange, kind, sector, industry, status, cik,
        profile_source, profile_retrieved_at,
        classification_source, classification_retrieved_at)
     values ('ZZZZ', 'Probe', 'PROBE', 'equity', 'technology', null,
             'active', null, 'test', now(), 'test', now())
     returning id::text as id`,
  );

  securityId = inserted.rows[0]?.id ?? "";
});

afterAll(async () => {
  delete process.env.DATABASE_NAME;
  await testPool?.end();

  if (adminPool !== undefined) {
    await adminPool.query(`drop database if exists ${TEST_DATABASE_NAME}`);
    await adminPool.end();
  }
});

describe("the SecurityMembershipsTable interface in schema.ts", () => {
  it("describes every column of the table, and no column it does not have", async () => {
    const actual = (await columns()).map((column) => column.column_name).sort();

    expect(actual).toEqual(Object.keys(EXPECTED_SECURITY_MEMBERSHIPS).sort());
  });

  it.each(Object.entries(EXPECTED_SECURITY_MEMBERSHIPS))(
    "%s has the type, nullability and default the interface claims",
    // Annotated rather than inferred, which is `migrate.database.test.ts`'s
    // idiom: `Object.entries` over the literal collapses the value type, and
    // without the annotation `"identity" in expected` is narrowed to always
    // false and the assertion is linted out as unreachable — a check that
    // passes by never looking.
    async (name, expected: ExpectedColumn) => {
      const column = (await columns()).find(
        (candidate) => candidate.column_name === name,
      );

      expect(column, `security_memberships has no ${name}`).toBeDefined();
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

  it("has no updated_at, because nothing here is ever updated", async () => {
    // Append-only is the whole shape: a correction is a further row, in the way
    // `migrations/README.md` §7 says a migration's correction is a further
    // migration. `schema.ts` types every column's update parameter `never`, so
    // there is no `updateTable` against this table that compiles — but that is
    // a compile-time fact about our code and this is the schema's half of it.
    const names = (await columns()).map((column) => column.column_name);

    expect(names).not.toContain("updated_at");
  });
});

describe("effective_from, which is why this table exists", () => {
  it("has NO default, so a writer cannot have the replay clock filled in for it", async () => {
    // **The structural half of invariant 4's leak, on the one column that
    // answers "which securities were tracked on this date".** A `default now()`
    // would silently turn "when this membership became true" into "when we ran
    // the loader", and every row would look plausible — which is exactly why
    // `0002`'s decision 3 refused one for `observed_at` and why
    // `migrations/README.md` §2 calls that rule load-bearing.
    const column = (await columns()).find(
      (candidate) => candidate.column_name === "effective_from",
    );

    expect(column?.column_default).toBeNull();
    expect(column?.is_nullable).toBe("NO");
  });

  it("refuses a row that does not say when the membership began", async () => {
    // The consequence of the two assertions above, produced rather than
    // described: no default plus `not null` means the writer must supply it.
    await expect(
      db().query(
        `insert into security_memberships (security_id, status)
         values ($1, 'active')`,
        [securityId],
      ),
    ).rejects.toThrow(/effective_from/);
  });

  it("is a timestamptz, so the instant survives the reader's timezone", async () => {
    // `migrations/README.md` §2's one-with-a-wrong-answer. A naive `timestamp`
    // is handed back by `pg` as a `Date` reinterpreted in the *reading
    // process's* zone, with nothing failing — on the column a replay filters
    // on, that is an error of the reader's UTC offset in the answer to "was
    // this security tracked that day".
    const column = (await columns()).find(
      (candidate) => candidate.column_name === "effective_from",
    );

    expect(column?.data_type).toBe("timestamp with time zone");
  });
});

describe("the foreign key — done-when 5's decision, asserted", () => {
  it("names the column by the convention and points at securities.id", async () => {
    // `migrations/README.md` §1: a foreign key column is
    // `<referenced_table_singularised>_id`. The decision to have a real key
    // here rather than a bare `security_id` is in `0012`'s §3; this is the half
    // a database can see.
    const foreignKeys = await db().query<{
      conname: string;
      definition: string;
    }>(
      `select conname, pg_get_constraintdef(oid) as definition
         from pg_constraint
        where conrelid = 'security_memberships'::regclass and contype = 'f'`,
    );

    expect(foreignKeys.rows).toHaveLength(1);
    expect(foreignKeys.rows[0]?.definition).toContain("(security_id)");
    expect(foreignKeys.rows[0]?.definition).toContain(
      "REFERENCES securities(id)",
    );
    // No `on delete` clause means `no action`, and the absence is the decision:
    // `cascade` would turn a mistaken delete into unrecoverable history.
    expect(foreignKeys.rows[0]?.definition).not.toContain("ON DELETE");
  });

  it("refuses a membership row for a security that does not exist", async () => {
    // A row here pointing at nothing is a replay computing over a security this
    // product has never heard of — the same class of silent wrongness the table
    // exists to remove.
    await expect(
      insertMembership({ security_id: "999999999" }),
    ).rejects.toThrow(/security_memberships_security_id_fkey/);
  });

  it("refuses to delete a security whose membership we have written down", async () => {
    await insertMembership({ effective_from: "2026-10-01T00:00:00.000Z" });

    await expect(
      db().query("delete from securities where id = $1", [securityId]),
    ).rejects.toThrow(/security_memberships_security_id_fkey/);

    await db().query("delete from security_memberships");
  });
});

describe("the status vocabulary and the check that backs it", () => {
  it("permits exactly SECURITY_STATUSES", async () => {
    // Postgres **rewrites** a check constraint — `check (status in ('active',
    // 'untracked'))` reads back as `CHECK ((status = ANY (ARRAY[...])))` — so
    // nothing can string-match what the migration says, and the values are
    // parsed out of what the database holds.
    const result = await db().query<{ definition: string }>(
      `select pg_get_constraintdef(oid) as definition
         from pg_constraint
        where conrelid = 'security_memberships'::regclass
          and conname = 'security_memberships_status_check'`,
    );

    expect(result.rows).toHaveLength(1);
    const permitted = [
      ...(result.rows[0]?.definition ?? "").matchAll(/'([^']*)'::text/g),
    ]
      .map((match) => match[1])
      .sort();

    expect(permitted).toEqual([...SECURITY_STATUSES].sort());
  });

  it("refuses a status outside the vocabulary", async () => {
    // `delisted` specifically, because it is the realistic mistake rather than
    // an invented one: `0003` left it out of `securities_status_check` because
    // nothing in the product can produce it, and that is still true here. Its
    // arrival is `0003`'s worked drop-check / add-check shape, in both places.
    await expect(insertMembership({ status: "delisted" })).rejects.toThrow(
      /security_memberships_status_check/,
    );
  });
});

describe("the indexes and constraints this table deliberately does not have", () => {
  it("has exactly one index, the primary key", async () => {
    // `migrations/README.md`'s rule: an index chosen before there is a query to
    // serve is a guess with a write cost. The query that will want one — the
    // latest row at or before a date, per security — is Epic 13's and does not
    // exist, and the table is hundreds of rows, which is `bar_coverage`'s
    // argument rather than `market_bars`'. An index added without a reader
    // fails here, and the fix is to say which query it serves.
    const result = await db().query<{ indexname: string }>(
      `select indexname from pg_indexes
        where schemaname = 'public' and tablename = 'security_memberships'
        order by indexname`,
    );

    expect(result.rows.map((row) => row.indexname)).toEqual([
      "security_memberships_pkey",
    ]);
  });

  it("accepts two transitions for one security at the same effective_from", async () => {
    // **A `unique (security_id, effective_from)` looks like a free integrity
    // win and would fail a deploy.** Two membership changes for one security
    // can share a `checkedOn` date — an untrack and a re-add inside one curated
    // revision — and the collision would land on `pnpm universe` inside
    // `deploy.yml`. The resolution rule is `order by effective_from, id`
    // instead, and this is what refuses the constraint somebody will reach for.
    await insertMembership({
      status: "untracked",
      effective_from: "2026-10-12T00:00:00.000Z",
    });
    await insertMembership({
      status: "active",
      effective_from: "2026-10-12T00:00:00.000Z",
    });

    const result = await db().query<{ status: string }>(
      `select status from security_memberships
        where security_id = $1
        order by effective_from, id`,
      [securityId],
    );

    expect(result.rows.map((row) => row.status)).toEqual([
      "untracked",
      "active",
    ]);

    await db().query("delete from security_memberships");
  });
});
