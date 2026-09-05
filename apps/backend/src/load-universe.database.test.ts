// The loader against a real database (Task 2.3.5).
//
// **Everything here is a claim only a database can settle**, which is the line
// `vitest.database.config.ts` draws: the validation is a pure function over a
// list and lives in the fast suite, and these are the properties that are about
// what actually happened to rows —
//
//   1. Acceptance criterion 2 — the universe loads in one command, and
//      re-running it is idempotent in the sense that matters here: it
//      **converges on the file**, picking up an edit rather than doing nothing.
//   2. That `updated_at` moves on a row that changed and **does not** move on
//      one that did not. Task 2.2.4 removed the trigger and recorded that
//      maintaining this column is the writer's obligation with nothing catching
//      a writer who gets it wrong. This is that writer, and this is that check.
//   3. That a refused universe leaves the table **exactly** as it was, which is
//      what acceptance criterion 3's "fails the load" has to mean.
//   4. That the provenance columns carry the file's stated date rather than the
//      instant the loader ran.
//
// **Asserted on the database rather than on the loader's own report**, which is
// the distinction Task 2.2.5 drew about idempotence: a loader that said
// "unchanged" while quietly rewriting every row would pass a check written
// against its output and fail one written against `updated_at`.
//
// It reuses the fixture arrangement of `migrate.database.test.ts` — its own
// `marketpulse_vitest` database, created, migrated, read and dropped, so
// **running this is invisible to the database you were debugging**. That matters
// more here than it did there: from this task onward the development database
// holds a ~100-row universe that takes a documented command to rebuild.
//
// There is no `skipIf` and there never will be: with no database it fails loudly
// in `beforeAll` naming `pnpm db`, because a skipped test reports green.

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  toTicker,
  type EquitySecurity,
  type Security,
} from "@marketpulse/shared";

import { loadConfig, loadEnvFile } from "./config.js";
import { loadUniverse } from "./load-universe.js";
import { runMigrations } from "./migrate.js";
import { UNIVERSE, UNIVERSE_PROVENANCE } from "./universe.js";

/** The same database name the migration suite uses, for the same reasons. */
const TEST_DATABASE_NAME = "marketpulse_vitest";

let adminPool: pg.Pool | undefined;
let testPool: pg.Pool | undefined;

function db(): pg.Pool {
  if (testPool === undefined) {
    throw new Error("beforeAll did not create the test database.");
  }
  return testPool;
}

interface SecurityRow {
  readonly id: string;
  readonly symbol: string;
  readonly name: string;
  readonly sector: string | null;
  readonly industry: string | null;
  readonly status: string;
  readonly kind: string;
  readonly profile_source: string;
  readonly profile_retrieved_at: Date;
  readonly classification_source: string;
  readonly classification_retrieved_at: Date;
  readonly recorded_at: Date;
  readonly updated_at: Date;
}

async function rows(): Promise<readonly SecurityRow[]> {
  const result = await db().query<SecurityRow>(
    "select * from securities order by symbol",
  );
  return result.rows;
}

async function row(symbol: string): Promise<SecurityRow> {
  const result = await db().query<SecurityRow>(
    "select * from securities where symbol = $1",
    [symbol],
  );

  const found = result.rows[0];
  if (found === undefined) throw new Error(`no row for ${symbol}`);
  return found;
}

/**
 * Load an arbitrary list rather than the shipped universe.
 *
 * `loadUniverse()` deliberately reads `UNIVERSE` itself — a loader whose data
 * source is an argument is a loader that can be pointed at the wrong list — so
 * a test that needs a *different* universe cannot use it. What it uses instead
 * is the same thing an operator would: SQL against the same table, standing in
 * for a file edit. The two places this matters are the convergence tests, where
 * what is being checked is what the loader does with a row that already exists
 * and differs.
 */
async function corrupt(symbol: string, column: string, value: string | null) {
  await db().query(
    `update securities set ${column} = $1, updated_at = '2020-01-01T00:00:00Z' where symbol = $2`,
    [value, symbol],
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

  // Both the migrator and the loader read `loadConfig()`, so pointing them at
  // this database is the supported interface an operator would use rather than
  // a seam opened for a test: a real environment variable beats a `.env` entry.
  process.env.DATABASE_NAME = TEST_DATABASE_NAME;
  testPool = new pg.Pool({ ...connection, database: TEST_DATABASE_NAME });

  const migration = await runMigrations();
  if (migration.exitCode !== 0) {
    throw new Error(`could not migrate: ${migration.errors.join("")}`);
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

describe("loading the universe into a clean database", () => {
  it("loads every security in one command", async () => {
    const outcome = await loadUniverse();

    expect(outcome.errors).toEqual([]);
    expect(outcome.exitCode).toBe(0);

    // Counted from the file rather than pinned to a number, so `UNIVERSE.md`
    // §8's "nothing encodes the count" survives contact with the test suite.
    expect(await rows()).toHaveLength(UNIVERSE.length);
    expect(outcome.lines.join("\n")).toContain(
      `${String(UNIVERSE.length)} inserted`,
    );
  });

  it("writes provenance per field group, from the file rather than the clock", async () => {
    const nvda = await row("NVDA");

    expect(nvda.profile_source).toBe(UNIVERSE_PROVENANCE.profile.source);
    expect(nvda.classification_source).toBe(
      UNIVERSE_PROVENANCE.classification.source,
    );

    // **The decision this task took**, asserted rather than described: the
    // retrieval timestamps carry the date `universe.ts` states, not `now()`. A
    // loader that stamped the clock would make the column mean "when the loader
    // last ran", which is always today and destroys the one mitigation
    // `UNIVERSE.md` §5 offers against the curated file's silent staleness.
    expect(nvda.classification_retrieved_at.toISOString()).toBe(
      `${UNIVERSE_PROVENANCE.classification.checkedOn}T00:00:00.000Z`,
    );
    expect(nvda.profile_retrieved_at.toISOString()).toBe(
      `${UNIVERSE_PROVENANCE.profile.checkedOn}T00:00:00.000Z`,
    );
  });

  it("renders the union's two meanings of a null sector", async () => {
    // Not a restatement of the database's own constraint: this is the loader
    // getting the discriminated union onto a table that has one nullable
    // column, which is the mapping Story 2.8 will do in the other direction.
    expect((await row("SPY")).sector).toBeNull();
    expect((await row("XLK")).sector).toBe("technology");
    expect((await row("NVDA")).sector).toBe("technology");
  });
});

describe("running it again", () => {
  it("changes nothing at all", async () => {
    const before = await rows();

    const outcome = await loadUniverse();

    expect(outcome.exitCode).toBe(0);
    expect(outcome.lines.join("\n")).toContain(
      `${String(UNIVERSE.length)} unchanged`,
    );

    // Asserted on the **database** and not on the report. Every column,
    // `updated_at` and `id` included: a second run that rewrote each row would
    // report "unchanged" happily and be caught only here.
    expect(await rows()).toEqual(before);
  });

  it("does not duplicate anything", async () => {
    await loadUniverse();

    const counted = await db().query<{ n: string }>(
      "select count(*)::text as n from securities",
    );

    expect(counted.rows[0]?.n).toBe(String(UNIVERSE.length));
  });

  it("keeps the same ids, so anything referencing a security still does", async () => {
    // Story 2.7 stores bars against `security_id`. A loader that deleted and
    // reinserted would renumber every row and orphan them, which is why the
    // write is an upsert on the natural key rather than a truncate-and-load.
    const before = await row("NVDA");

    await loadUniverse();

    expect((await row("NVDA")).id).toBe(before.id);
  });
});

describe("converging on the file", () => {
  it("picks up a corrected name and moves updated_at", async () => {
    await corrupt("NVDA", "name", "Nvidia Corp (wrong)");
    const before = await row("NVDA");

    const outcome = await loadUniverse();

    expect(outcome.exitCode).toBe(0);
    expect(outcome.lines.join("\n")).toContain("1 updated");

    const after = await row("NVDA");
    expect(after.name).toBe(
      UNIVERSE.find((security) => security.symbol === "NVDA")?.name,
    );
    expect(after.updated_at.getTime()).toBeGreaterThan(
      before.updated_at.getTime(),
    );
  });

  it("picks up a corrected sector", async () => {
    await corrupt("NVDA", "sector", "utilities");

    await loadUniverse();

    expect((await row("NVDA")).sector).toBe("technology");
  });

  it("picks up a corrected null, which a `<>` comparison would miss", async () => {
    // `null <> null` is `null`, so an upsert whose guard used `<>` rather than
    // `is distinct from` would treat every row with a null `industry` or `cik`
    // as unchanged forever. XLK's industry is null in the file and this sets it
    // to a value, which is that comparison's blind spot from the other side.
    await corrupt("XLK", "industry", "Not an industry");

    await loadUniverse();

    expect((await row("XLK")).industry).toBeNull();
  });

  it("does NOT move updated_at on a row that did not change", async () => {
    // The property with no backstop anywhere: `updated_at` has no trigger, Task
    // 2.2.4 recorded that maintaining it is the writer's obligation, and a bare
    // `do update set ... , updated_at = now()` would move all ~100 rows on every
    // run — which makes the column mean "when the loader last ran" and carry no
    // information at all. The `on conflict ... where` clause is what makes those
    // two different numbers, and this is what fails when somebody simplifies it
    // away.
    await corrupt("NVDA", "name", "Nvidia Corp (wrong)");
    const untouched = await row("AMD");

    await loadUniverse();

    expect((await row("AMD")).updated_at.toISOString()).toBe(
      untouched.updated_at.toISOString(),
    );
    // And the row that did change moved, in the same run, so this is not passing
    // because nothing happened.
    expect((await row("NVDA")).updated_at.getTime()).toBeGreaterThan(
      untouched.updated_at.getTime(),
    );
  });
});

describe("a symbol in the database and not in the file", () => {
  it("is reported, left untouched, and does not fail the load", async () => {
    // **The seam.** Deleting the row, changing its `status` and refusing are the
    // three answers, they are not interchangeable, and one of them destroys data
    // Story 2.7 will have stored against it. Task 2.3.6 decides; this asserts
    // that until then nothing happens to it, because "leave it alone" is the
    // only option all three remain reachable from.
    await db().query(
      `insert into securities
         (symbol, name, exchange, kind, sector, industry, status, cik,
          profile_source, profile_retrieved_at,
          classification_source, classification_retrieved_at)
       values ('ZZZZ', 'Delisted Test Co', 'NYSE', 'equity', 'technology', null,
               'active', null, 'test', now(), 'test', now())`,
    );

    const outcome = await loadUniverse();

    expect(outcome.exitCode).toBe(0);
    expect(outcome.lines.join("\n")).toContain(
      "1 in the database and not in the file",
    );
    expect(outcome.lines.join("\n")).toContain("ZZZZ");

    const survivor = await row("ZZZZ");
    expect(survivor.status).toBe("active");
    expect(survivor.name).toBe("Delisted Test Co");

    await db().query("delete from securities where symbol = 'ZZZZ'");
  });
});

describe("a universe that violates acceptance criterion 3", () => {
  /**
   * Run the loader's write half against a deliberately bad list.
   *
   * `loadUniverse()` reads `UNIVERSE` itself, so a bad universe cannot be handed
   * to it — which is the right shape for the shipped program and means this test
   * has to reproduce the *sequence* rather than call it: validate, and write only
   * if validation passed. That is exactly what `loadUniverse` does, and the thing
   * being asserted is what the table looks like afterwards.
   */
  async function loadBadUniverse(securities: readonly Security[]) {
    const { summariseValidationFailure, validateUniverse } =
      await import("./load-universe.js");

    const violations = validateUniverse(securities, UNIVERSE_PROVENANCE);
    expect(violations.length).toBeGreaterThan(0);

    return summariseValidationFailure(violations);
  }

  it("fails at a non-zero exit naming every offending symbol, leaving the table unchanged", async () => {
    const before = await rows();

    const unclassified = {
      ...(UNIVERSE.find(
        (security) => security.symbol === "NVDA",
      ) as EquitySecurity),
      symbol: toTicker("AAAA"),
      sector: null,
    } as unknown as Security;

    const alsoUnclassified: Security = {
      ...unclassified,
      symbol: toTicker("BBBB"),
    };

    const outcome = await loadBadUniverse([
      ...UNIVERSE,
      unclassified,
      alsoUnclassified,
    ]);

    expect(outcome.exitCode).toBe(1);
    expect(outcome.lines).toEqual([]);
    // **Every** offending symbol, which is why this program fails before the
    // database does: a Postgres constraint error names one row.
    expect(outcome.errors.join("")).toContain("AAAA has no sector");
    expect(outcome.errors.join("")).toContain("BBBB has no sector");

    // Nothing was written — validation runs before a connection is even opened.
    expect(await rows()).toEqual(before);
  });

  it("fails when a sector's ETF is missing, leaving the table unchanged", async () => {
    const before = await rows();

    const outcome = await loadBadUniverse(
      UNIVERSE.filter((security) => security.symbol !== "XLE"),
    );

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors.join("")).toContain("`energy` is on");
    expect(outcome.errors.join("")).toContain("no sector_etf row");
    expect(await rows()).toEqual(before);
  });

  it("fails on a duplicate symbol, which the unique index cannot catch", async () => {
    const before = await rows();

    const nvda = UNIVERSE.find((security) => security.symbol === "NVDA");
    if (nvda === undefined) expect.fail("NVDA is not in the universe");

    const outcome = await loadBadUniverse([...UNIVERSE, nvda]);

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors.join("")).toContain("NVDA appears more than once");
    expect(await rows()).toEqual(before);
  });
});
