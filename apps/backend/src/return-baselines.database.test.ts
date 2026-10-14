// `return_baselines` against a real database (Task 5.3.2).
//
// **What is here is what a fixture cannot have**, and the file is deliberately
// short because `return-baseline.test.ts` already owns the arithmetic. Four
// things need a server:
//
//   1. **Both tapes seeded for the same minute, with grossly different
//      closes.** This is the ONLY test that can catch a dropped `feed`
//      predicate, because **no machine outside Azure holds an `iex` row** — the
//      live writer only runs where a provider is configured — so the defect is
//      invisible on every developer's store and on CI's, and would land the day
//      the deployed pass ran. The two closes differ by a factor of ten
//      thousand, so the dropped predicate is not a subtle shift in a tail: the
//      distribution becomes unrecognisable.
//   2. **An early-close session in the fixture**, so `n` has to be COUNTED.
//      A writer who computed `anchors × sessions` fails here.
//   3. **The `loadedFor` case driven through a real stored generation.** The
//      precedent (`last-closes-cache.ts`) memoises on the session it was ASKED
//      about, stamps today's date on yesterday's data and can never fire again
//      that day. The repair is that this cache memoises on the `observed_at`
//      the stored ROW carries, and the only honest way to drive it is with two
//      real generations in a real table.
//   4. **The shape** — the three descriptions of this table (the migration,
//      `ReturnBaselinesTable` in `schema.ts`, and the expectation below) bound
//      to each other, plus `observed_at` having no default, which is the single
//      most important assertion in the file.
//
// It reuses the fixture arrangement of the other database suites — its own
// `marketpulse_vitest`, created, migrated, read and dropped. There is no
// `skipIf`: with no database it fails loudly in `beforeAll` naming `pnpm db`,
// because a skipped test reports green.

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  BASELINE_BREAKPOINT_COUNT,
  RETURN_BASELINE_REFUSALS,
  marketDateAt,
  marketSessionOn,
  toMarketDate,
  toTicker,
  toTimeRange,
  type MarketSession,
} from "@marketpulse/shared";

import { loadConfig, loadEnvFile } from "./config.js";
import { runMigrations } from "./migrate.js";
import { createReturnBaselineCache } from "./return-baseline-cache.js";
import { returnBaselineOf, sessionAnchors } from "./return-baseline.js";
import { createReturnBaselineStore } from "./return-baseline-store.js";
import type { ReturnBaselineStore } from "./return-baseline-store.js";
import type { ReturnBaselinesTable } from "./schema.js";

const TEST_DATABASE_NAME = "marketpulse_vitest";

/** A regular session and an early close, with Thanksgiving between them. */
const REGULAR = session("2026-11-25");
const EARLY = session("2026-11-27");
const WINDOW = toTimeRange(REGULAR.open, EARLY.close);

function session(date: string): MarketSession {
  const found = marketSessionOn(toMarketDate(date));
  if (found === undefined) {
    throw new Error(`${date} is not a trading session; the fixture is wrong.`);
  }
  return found;
}

interface ColumnRow {
  readonly column_name: string;
  readonly data_type: string;
  readonly is_nullable: "YES" | "NO";
  readonly is_identity: "YES" | "NO";
  readonly column_default: string | null;
}

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
 * {@link ReturnBaselinesTable} and not described here is `TS1360` at compile
 * time, so the pair below cannot silently check one fewer thing.
 */
const EXPECTED_RETURN_BASELINES = {
  id: { dataType: "bigint", nullable: false, identity: true },
  security_id: { dataType: "bigint", nullable: false },
  // No `defaultExpression`, and that absence is the point of the table.
  observed_at: { dataType: "timestamp with time zone", nullable: false },
  lookback_sessions: { dataType: "integer", nullable: false },
  // `bigint` and not `integer`: README §4's *a count is a bigint*, which
  // `migrate.database.test.ts` enforces on every `_count` column and which
  // fired on this table's first draft.
  sample_count: { dataType: "bigint", nullable: false },
  breakpoints: { dataType: "ARRAY", nullable: true },
  refusal: { dataType: "text", nullable: true },
  recorded_at: {
    dataType: "timestamp with time zone",
    nullable: false,
    defaultExpression: "now()",
  },
} satisfies Record<keyof ReturnBaselinesTable, ExpectedColumn>;

let adminPool: pg.Pool | undefined;
let testPool: pg.Pool | undefined;
let store: ReturnBaselineStore | undefined;
let securityId = "";

/** The subject every read below is keyed on — the row id, not the symbol. */
function subject(): { id: string; symbol: ReturnType<typeof toTicker> } {
  return { id: securityId, symbol: toTicker("ZZZZ") };
}

function db(): pg.Pool {
  if (testPool === undefined) {
    throw new Error("beforeAll did not create the test database.");
  }
  return testPool;
}

function baselines(): ReturnBaselineStore {
  if (store === undefined) {
    throw new Error("beforeAll did not create the store.");
  }
  return store;
}

async function columns(): Promise<readonly ColumnRow[]> {
  const result = await db().query<ColumnRow>(
    `select column_name, data_type, is_nullable, is_identity, column_default
       from information_schema.columns
      where table_schema = 'public' and table_name = 'return_baselines'
      order by ordinal_position`,
  );
  return result.rows;
}

/** One minute bar, on a named tape. Only the close is ever read back. */
async function insertBar(
  observedAt: Date,
  close: number,
  feed: "sip" | "iex",
): Promise<void> {
  await db().query(
    `insert into market_bars
       (security_id, timeframe, observed_at, open, high, low, close, volume, feed)
     values ($1, '1m', $2, $3, $3, $3, $3, 1000, $4)`,
    [securityId, observedAt, close, feed],
  );
}

/** Every anchor of these sessions, on `sip`, at one flat price. */
async function seedFlatSip(
  sessions: readonly MarketSession[],
  price: number,
): Promise<void> {
  for (const one of sessions) {
    for (const anchor of sessionAnchors(one)) {
      await insertBar(anchor, price, "sip");
    }
  }
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
  store = createReturnBaselineStore(testPool);

  await seedFlatSip([REGULAR, EARLY], 100);
});

afterAll(async () => {
  delete process.env.DATABASE_NAME;
  await testPool?.end();

  if (adminPool !== undefined) {
    await adminPool.query(`drop database if exists ${TEST_DATABASE_NAME}`);
    await adminPool.end();
  }
});

describe("the ReturnBaselinesTable interface in schema.ts", () => {
  it("describes every column of the table, and no column it does not have", async () => {
    const actual = (await columns()).map((column) => column.column_name).sort();

    expect(actual).toEqual(Object.keys(EXPECTED_RETURN_BASELINES).sort());
  });

  it.each(Object.entries(EXPECTED_RETURN_BASELINES))(
    "%s has the type, nullability and default the interface claims",
    async (name, expected: ExpectedColumn) => {
      const column = (await columns()).find(
        (candidate) => candidate.column_name === name,
      );

      expect(column?.data_type).toBe(expected.dataType);
      expect(column?.is_nullable).toBe(expected.nullable ? "YES" : "NO");
      expect(column?.is_identity).toBe(
        expected.identity === true ? "YES" : "NO",
      );
      expect(column?.column_default).toBe(expected.defaultExpression ?? null);
    },
  );

  it("gives `observed_at` NO default, which is the point of the table", async () => {
    // **The single most important assertion in this file.** A `default now()`
    // on the column a replay keys on turns *when the window ended* into *when
    // a script ran*, invisibly, because every row would look plausible.
    const column = (await columns()).find(
      (candidate) => candidate.column_name === "observed_at",
    );

    expect(column?.column_default).toBeNull();
    expect(column?.is_nullable).toBe("NO");
  });

  it("refuses a row that is both an answer and a refusal, and one that is neither", async () => {
    // **The array is 101 long on purpose.** A two-element one is refused by
    // `return_baselines_breakpoint_count` first, and the test then passes for
    // the wrong reason — which is what the first draft of this file did, and
    // is the "a different constraint refused the row first" trap
    // `security-memberships.database.test.ts` writes down beside its own
    // insert helper.
    const both = db().query(
      `insert into return_baselines
         (security_id, observed_at, lookback_sessions, sample_count,
          breakpoints, refusal)
       values ($1, $2, 60, 1,
               array_fill(1.0::double precision, array[101]),
               'split-discontinuity')`,
      [securityId, EARLY.close],
    );
    await expect(both).rejects.toThrow(/return_baselines_one_answer/u);

    const neither = db().query(
      `insert into return_baselines
         (security_id, observed_at, lookback_sessions, sample_count)
       values ($1, $2, 60, 1)`,
      [securityId, EARLY.close],
    );
    await expect(neither).rejects.toThrow(/return_baselines_one_answer/u);
  });

  it("refuses a breakpoint array that is not 101 long", async () => {
    // An array column has no arity of its own, so a writer shipping a
    // vigintile grid — the 21 breakpoints the story's `~84 KB` actually
    // describes, which cannot express a 99th percentile at all — would be
    // caught by nothing else.
    const wrong = db().query(
      `insert into return_baselines
         (security_id, observed_at, lookback_sessions, sample_count, breakpoints)
       values ($1, $2, 60, 1, array[1.0, 2.0]::double precision[])`,
      [securityId, EARLY.close],
    );

    await expect(wrong).rejects.toThrow(/return_baselines_breakpoint_count/u);
  });

  it("agrees with `RETURN_BASELINE_REFUSALS` about the vocabulary", async () => {
    // Two spellings of one vocabulary: a member added to one and not the other
    // is a value the compiler permits and the database refuses at run time.
    const constraint = await db().query<{ definition: string }>(
      `select pg_get_constraintdef(oid) as definition
         from pg_constraint
        where conname = 'return_baselines_refusal_known'`,
    );

    const definition = constraint.rows[0]?.definition ?? "";
    for (const refusal of RETURN_BASELINE_REFUSALS) {
      expect(definition).toContain(`'${refusal}'`);
    }
  });
});

describe("the window read — one tape, by name", () => {
  it("reads the `sip` close when the same minute holds BOTH tapes", async () => {
    // **The only test that can catch a dropped `feed` predicate.** Every
    // machine this will ever run on except Azure holds zero `iex` rows, so
    // nothing else in the repository can see the defect. The two closes differ
    // by four orders of magnitude on purpose: a dropped predicate is not a
    // subtle shift in a tail.
    const anchor = sessionAnchors(REGULAR)[10];
    if (anchor === undefined) throw new Error("no anchor 10");

    await insertBar(anchor, 999_999, "iex");

    const closes = await baselines().readWindowCloses(subject(), WINDOW);

    expect(closes.get(anchor.getTime())).toBe(100);

    // And the figure it produces is the flat one. A dropped predicate would
    // give a `+999,899%` sample, which the split guard would not even catch —
    // it is inside a session.
    const outcome = returnBaselineOf({
      sessions: [REGULAR, EARLY],
      closes,
    });

    expect(outcome.kind).toBe("measured");
    if (outcome.kind !== "measured") return;
    expect(outcome.breakpoints[100]).toBeCloseTo(0, 6);
  });

  it("counts `n` over a regular session and an early close", async () => {
    // 78 + 42 anchors yield 77 + 41 = 118 increments. `(78 + 42)` is 120 and
    // `78 × 2` is 156, so a writer who computed either fails here — which is
    // why the early close is in the fixture.
    const closes = await baselines().readWindowCloses(subject(), WINDOW);
    const outcome = returnBaselineOf({ sessions: [REGULAR, EARLY], closes });

    expect(outcome.kind).toBe("measured");
    if (outcome.kind !== "measured") return;
    expect(outcome.sampleCount).toBe(118);
  });

  it("resolves a symbol to a subject, and answers nothing for one it has never held", async () => {
    // The diagnostics route's parameter is a symbol while every read above is
    // keyed on the row id — see `windowQuery`'s note for the `Sort` that
    // measurement removed.
    expect((await baselines().subjectFor(toTicker("ZZZZ")))?.id).toBe(
      securityId,
    );
    expect(await baselines().subjectFor(toTicker("QQQQQ"))).toBeUndefined();
  });

  it("reports the two tape counts over the same window", async () => {
    // The measurement `GET /diagnostics/baseline-cost` exists for, driven here
    // against rows of both tapes — which on a deployed store is the one figure
    // nothing local can produce.
    const counts = await baselines().tapeCounts(subject(), WINDOW);

    expect(counts.sip).toBe(78 + 42);
    expect(counts.iex).toBe(1);
  });

  it("explains the read, and names the plan node the cost question turns on", async () => {
    // **No figure is asserted**, and ADR 0029's rule is why: the plan on a
    // 120-row fixture says nothing about a 24,142-row read on the deployed
    // tier, and asserting a block count here would be a number that passes for
    // the wrong reason. What IS asserted is that the instrument answers at all
    // and that it reports a scan rather than `unknown` — because a diagnostic
    // that silently returns zeroes is the shape Task 4.8.6 recorded, where a
    // channel going quiet and a cost going away produce the same output.
    const cost = await baselines().explainWindowRead(subject(), WINDOW);

    expect(cost.planNodeType).not.toBe("unknown");
    expect(cost.scanNodeType).toMatch(/Scan/u);
    expect(cost.actualRows).toBe(78 + 42);
  });
});

describe("the write, and the generation it is keyed on", () => {
  it("upserts rather than appending, so a re-run converges", async () => {
    const closes = await baselines().readWindowCloses(subject(), WINDOW);
    const outcome = returnBaselineOf({ sessions: [REGULAR, EARLY], closes });

    await baselines().writeBaseline(subject(), EARLY.close, 60, outcome);
    await baselines().writeBaseline(subject(), EARLY.close, 60, outcome);

    const rows = await db().query<{ count: string }>(
      `select count(*)::text as count from return_baselines
        where security_id = $1 and observed_at = $2`,
      [securityId, EARLY.close],
    );

    expect(rows.rows[0]?.count).toBe("1");
  });

  it("stores 101 breakpoints and reads them back as numbers", async () => {
    const generation = await baselines().readNewestGeneration(EARLY.close);
    const row = generation.find((entry) => entry.symbol === "ZZZZ");

    expect(row?.breakpoints).toHaveLength(BASELINE_BREAKPOINT_COUNT);
    expect(typeof row?.breakpoints?.[0]).toBe("number");
    expect(row?.sampleCount).toBe(118);
    expect(row?.refusal).toBeNull();
  });

  it("refuses to write a `none` outcome, because an absent row is the answer", async () => {
    await expect(
      baselines().writeBaseline(subject(), REGULAR.close, 60, { kind: "none" }),
    ).rejects.toThrow(/nothing to write/u);
  });
});

describe("the cache memoises on the session the ROW carries", () => {
  it("keeps asking when the stored generation is older than the session asked about", async () => {
    // **The `loadedFor` case, driven through two real generations.**
    //
    // The precedent records the defect in its own docblock: a refresh that runs
    // after midnight ET and before the nightly fill reads yesterday's data,
    // **records today's date against it, and can never fire again that day**,
    // because `session !== loadedFor` is false for the rest of it.
    //
    // Here the key is `observed_at` — the window end the row itself carries —
    // so the same sequence leaves the condition TRUE and the cache goes on
    // trying. The floor is what keeps that from being a poll.
    let clock = 0;
    let reads = 0;
    const real = baselines();

    const cache = createReturnBaselineCache({
      store: {
        readNewestGeneration: async (atOrBefore) => {
          reads += 1;
          return real.readNewestGeneration(atOrBefore);
        },
      },
      now: () => clock,
    });

    // The store holds a generation for 2026-11-27 (written above). Ask about a
    // LATER session — which is what a reader does on the trading day after the
    // last one the fill completed.
    const laterSession = toMarketDate("2026-11-30");

    await cache.load(laterSession);
    expect(reads).toBe(1);
    // It holds the 2026-11-27 generation and SAYS SO. The precedent would have
    // recorded `2026-11-30` against exactly these rows.
    expect(cache.heldThrough()).toBe(marketDateAt(EARLY.close));
    expect(cache.size()).toBe(1);

    // Immediately asking again does not re-read: the floor is holding.
    cache.baselineAsOf(laterSession);
    expect(reads).toBe(1);

    // A quarter of an hour later it tries again — the condition is still true,
    // which is the whole repair. The precedent's condition would be false for
    // ever.
    clock += 15 * 60_000;
    cache.baselineAsOf(laterSession);
    expect(reads).toBe(2);
    // Let the refresh this triggered finish before the pool is closed. The
    // count above is already correct — `readNewestGeneration` increments
    // synchronously — so this is about not leaving a query in flight, which is
    // how a database suite produces an `Unhandled Errors` block that still
    // exits 0.
    await new Promise((resolve) => setTimeout(resolve, 100));

    // And asking about the session the held rows ARE for does not re-read at
    // all, because that condition is genuinely satisfied.
    const satisfied = cache.baselineAsOf(marketDateAt(EARLY.close));
    expect(satisfied.size).toBe(1);
    expect(reads).toBe(2);
  });
});
