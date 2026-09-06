// The first read, against a real PostgreSQL server (Task 2.4.1).
//
// Everything here is a claim only a database can settle, which is the line
// `vitest.database.config.ts` draws. The mapping itself is a pure function and
// is checked next door in the fast suite; what needs a server is —
//
//   1. That the query returns the universe at all, as `Security[]`, with the
//      three kinds each round-tripping through the columns Postgres actually
//      hands back rather than the columns a fixture said it would.
//   2. That the **two meanings of a null sector** survive a round trip through
//      one nullable column — the loader put a discriminated union into it
//      (`load-universe.database.test.ts` asserts that direction) and this is
//      the union coming back out.
//   3. That the read does **not** filter on `status`, produced against a row
//      actually put into that state rather than reasoned about.
//   4. That a malformed row fails the whole read rather than vanishing from
//      it — produced by dropping the constraint that makes it impossible,
//      which is a thing only a scratch database allows.
//
// It reuses the fixture arrangement of `load-universe.database.test.ts`: its
// own `marketpulse_vitest` database, created, migrated, read and dropped, so
// running it is invisible to the database you were debugging. There is no
// `skipIf` and there never will be — with no database it fails loudly in
// `beforeAll` naming `pnpm db`, because a skipped test reports green.

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { SECTORS, type Security } from "@marketpulse/shared";

import { loadConfig, loadEnvFile } from "./config.js";
import { loadUniverse } from "./load-universe.js";
import { runMigrations } from "./migrate.js";
import {
  SecurityMappingError,
  createSecuritiesRepository,
  type SecuritiesRepository,
} from "./securities.js";
import { UNIVERSE } from "./universe.js";

/** The same database name the other two suites use, for the same reasons. */
const TEST_DATABASE_NAME = "marketpulse_vitest";

let adminPool: pg.Pool | undefined;
let testPool: pg.Pool | undefined;
let securities: SecuritiesRepository | undefined;

function db(): pg.Pool {
  if (testPool === undefined) {
    throw new Error("beforeAll did not create the test database.");
  }
  return testPool;
}

function repository(): SecuritiesRepository {
  if (securities === undefined) {
    throw new Error("beforeAll did not create the repository.");
  }
  return securities;
}

function find(list: readonly Security[], symbol: string): Security {
  const found = list.find((security) => security.symbol === symbol);
  if (found === undefined) throw new Error(`${symbol} is not in the universe`);
  return found;
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

  // The repository over a pool it does not own — which is the shipped
  // arrangement, where `index.ts` owns the pool. Note nothing here calls a
  // `destroy()`, because there is none to call: see the note on
  // `createSecuritiesRepository`.
  securities = createSecuritiesRepository(testPool);
});

afterAll(async () => {
  delete process.env.DATABASE_NAME;
  await testPool?.end();

  if (adminPool !== undefined) {
    await adminPool.query(`drop database if exists ${TEST_DATABASE_NAME}`);
    await adminPool.end();
  }
});

describe("reading the universe out of Postgres", () => {
  it("returns every row as a Security", async () => {
    const list = await repository().listSecurities();

    // Counted from the file rather than pinned to a number, so `UNIVERSE.md`
    // §8's "nothing encodes the count" survives contact with this suite too.
    expect(list).toHaveLength(UNIVERSE.length);
  });

  it("returns them ordered by symbol", async () => {
    const list = await repository().listSecurities();
    const symbols = list.map((security) => security.symbol);

    // Postgres guarantees no order without an `order by`, so this is the check
    // that one is there — not a check on Postgres.
    expect(symbols).toEqual([...symbols].sort());
  });

  it("round-trips all three kinds", async () => {
    const list = await repository().listSecurities();

    expect(find(list, "NVDA").kind).toBe("equity");
    expect(find(list, "XLK").kind).toBe("sector_etf");
    expect(find(list, "SPY").kind).toBe("index_etf");

    // The whole row, field by field, against the file it was loaded from —
    // which is what makes this a round trip rather than a shape check. `cik` is
    // null for every security until Epic 9 and is included deliberately, so the
    // day it stops being null this is one of the places that says so.
    expect(find(list, "NVDA")).toEqual(
      UNIVERSE.find((security) => security.symbol === "NVDA"),
    );
  });

  it("brings the union's two meanings of a null sector back apart", async () => {
    const list = await repository().listSecurities();

    const spy = find(list, "SPY");
    if (spy.kind !== "index_etf") expect.fail("SPY came back as another kind");
    // Structurally absent rather than unknown: an index proxy does not belong
    // to a sector, and the type says so after narrowing.
    expect(spy.sector).toBeNull();

    const xlk = find(list, "XLK");
    if (xlk.kind === "index_etf")
      expect.fail("XLK came back as a market proxy");
    expect(xlk.sector).toBe("technology");

    // And the property the page depends on: nothing that is not an index proxy
    // came back without a sector, which is acceptance criterion 3 observed on
    // the way out rather than only enforced on the way in.
    for (const security of list) {
      if (security.kind === "index_etf") continue;
      expect(SECTORS).toContain(security.sector);
    }
  });
});

describe("status, the invisible predicate", () => {
  it("returns an untracked security rather than hiding it", async () => {
    // Produced rather than reasoned about. Standing in for a symbol removed
    // from `universe.ts` and `pnpm universe` re-run — which is what
    // `untrackAbsent` does to the row, and which
    // `load-universe.database.test.ts` covers from the loader's side. What is
    // being checked here is the *reader*.
    await db().query(
      "update securities set status = 'untracked' where symbol = 'GILD'",
    );

    // In a `finally`, so a failing assertion does not leave the row untracked
    // for every test after it. Learned the hard way while making this suite
    // fail on purpose: a deliberate break in the query took *two* tests red,
    // and the second one was collateral from this test's cleanup never running.
    try {
      const list = await repository().listSecurities();

      // Both numbers, because from the first removal onward they are different
      // and a page that reports one has to say which. This read returns rows.
      expect(list).toHaveLength(UNIVERSE.length);
      expect(find(list, "GILD").status).toBe("untracked");
      expect(
        list.filter((security) => security.status === "active"),
      ).toHaveLength(UNIVERSE.length - 1);
    } finally {
      await db().query(
        "update securities set status = 'active' where symbol = 'GILD'",
      );
    }
  });
});

describe("a row that does not map", () => {
  it("fails the whole read rather than dropping the security", async () => {
    // The database refuses this row — `securities_sector_matches_kind` is
    // exactly the constraint that makes an index proxy with a sector
    // impossible — so producing one means dropping the constraint first. That
    // is a thing only a scratch database allows, and it is the reason this
    // suite creates its own.
    await db().query(
      "alter table securities drop constraint securities_sector_matches_kind",
    );
    await db().query(
      "update securities set sector = 'technology' where symbol = 'SPY'",
    );

    try {
      await expect(repository().listSecurities()).rejects.toThrow(
        SecurityMappingError,
      );

      // The failure names the row, which is the difference between a message
      // somebody can act on and a `TypeError` from inside a request handler.
      await expect(repository().listSecurities()).rejects.toThrow(/SPY/);
    } finally {
      await db().query(
        "update securities set sector = null where symbol = 'SPY'",
      );
      await db().query(
        "alter table securities add constraint securities_sector_matches_kind " +
          "check ((kind = 'index_etf' and sector is null) " +
          "or (kind <> 'index_etf' and sector is not null))",
      );
    }

    // And the read is whole again afterwards, so the break was the row rather
    // than the fixture.
    expect(await repository().listSecurities()).toHaveLength(UNIVERSE.length);
  });
});
