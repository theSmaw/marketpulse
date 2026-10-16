// `session_return_percentiles` and `session_return_percentile_passes` against
// a real database (Task 5.4.5).
//
// **What is here is what a fixture cannot have**, and the file is deliberately
// short because `session-percentile.test.ts` owns the arithmetic and
// `market-unusual.test.ts` owns the section. Five things need a server:
//
//   1. **The shape** — the three descriptions of each table (the migration,
//      the interface in `schema.ts`, and the expectation below) bound to each
//      other, plus `observed_at` having **no default** on both, which is the
//      single most important assertion in the file: a `default now()` there
//      turns *the session this describes* into *when a script ran*, invisibly,
//      because every row would look plausible.
//   2. **The constraints, driven rather than read.** A `check` nothing has
//      ever violated is a claim; the four below are refusals this suite
//      produces — a rank outside `0–99`, populations that do not nest, a `NaN`
//      percent and a reversed pair. Each of them is a well-formed, confident
//      row on the landing page's most unfalsifiable region.
//   3. **The pass row read FIRST**, which is the partial-failure answer: the
//      nightly pass writes scores as it goes and the pass row at the end, so a
//      crash between them leaves scores under no figures. The read bounds the
//      scores on the pass row's own session, which makes that state invisible
//      rather than half-drawn — and only a real table can show it.
//   4. **The upsert's convergence.** Re-running `pnpm baselines` for a session
//      already stored must update rather than append, which is what makes this
//      table derived and recomputable in `pnpm universe`'s sense.
//   5. **The cache's memoisation key** — the session the stored ROW is for,
//      never the session it was asked about, which is `last-closes-cache.ts`'
//      recorded defect and needs two real sessions in a real table to drive.
//
// It reuses the fixture arrangement of the other database suites — its own
// `marketpulse_vitest_sessions`, created, migrated, read and dropped. There is
// no `skipIf`: with no database it fails loudly in `beforeAll` naming `pnpm
// db`, because a skipped test reports green.

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { marketDateAt, toMarketDate, toTicker } from "@marketpulse/shared";

import { loadConfig, loadEnvFile } from "./config.js";
import { runMigrations } from "./migrate.js";
import { createSessionPercentileCache } from "./session-percentile-cache.js";
import { createSessionPercentileStore } from "./session-percentile-store.js";
import type {
  SessionPassWrite,
  SessionPercentileStore,
  SessionPercentileWrite,
} from "./session-percentile-store.js";
import type {
  SessionReturnPercentilePassesTable,
  SessionReturnPercentilesTable,
} from "./schema.js";

const TEST_DATABASE_NAME = "marketpulse_vitest_sessions";

/** Two real sessions, so the cache's key can be driven with both. */
const THURSDAY = new Date("2026-11-19T21:00:00.000Z");
const FRIDAY = new Date("2026-11-20T21:00:00.000Z");

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
 * The third description of the score table.
 *
 * The `satisfies` is the load-bearing half: a column added to
 * {@link SessionReturnPercentilesTable} and not described here is `TS1360` at
 * compile time, so the pair cannot silently check one fewer thing.
 */
const EXPECTED_SCORES = {
  id: { dataType: "bigint", nullable: false, identity: true },
  security_id: { dataType: "bigint", nullable: false },
  // No `defaultExpression`, and that absence is the point of the table.
  observed_at: { dataType: "timestamp with time zone", nullable: false },
  rank: { dataType: "integer", nullable: false },
  above_sample: { dataType: "boolean", nullable: false },
  // `bigint` and not `integer`: README §4's *a count is a bigint*, which
  // `migrate.database.test.ts` enforces on every `_count` column.
  sample_count: { dataType: "bigint", nullable: false },
  // `numeric(18, 6)` and never a float — README §4, which
  // `migrate.database.test.ts` also sweeps for.
  percent: { dataType: "numeric", nullable: false },
  from_at: { dataType: "timestamp with time zone", nullable: false },
  from_price: { dataType: "numeric", nullable: false },
  from_feed: { dataType: "text", nullable: false },
  to_at: { dataType: "timestamp with time zone", nullable: false },
  to_price: { dataType: "numeric", nullable: false },
  to_feed: { dataType: "text", nullable: false },
  observed_minutes: { dataType: "integer", nullable: false },
  recorded_at: {
    dataType: "timestamp with time zone",
    nullable: false,
    defaultExpression: "now()",
  },
} satisfies Record<keyof SessionReturnPercentilesTable, ExpectedColumn>;

/** The third description of the pass table. */
const EXPECTED_PASSES = {
  id: { dataType: "bigint", nullable: false, identity: true },
  observed_at: { dataType: "timestamp with time zone", nullable: false },
  tracked_count: { dataType: "bigint", nullable: false },
  eligible_count: { dataType: "bigint", nullable: false },
  scored_count: { dataType: "bigint", nullable: false },
  nothing_observed_count: { dataType: "bigint", nullable: false },
  no_earlier_endpoint_count: { dataType: "bigint", nullable: false },
  no_basis_count: { dataType: "bigint", nullable: false },
  too_few_samples_count: { dataType: "bigint", nullable: false },
  split_discontinuity_count: { dataType: "bigint", nullable: false },
  span_minutes: { dataType: "integer", nullable: false },
  baseline_feed: { dataType: "text", nullable: false },
  baseline_span_minutes: { dataType: "integer", nullable: false },
  baseline_lookback_sessions: { dataType: "integer", nullable: false },
  minimum_sample_count: { dataType: "bigint", nullable: false },
  recorded_at: {
    dataType: "timestamp with time zone",
    nullable: false,
    defaultExpression: "now()",
  },
} satisfies Record<keyof SessionReturnPercentilePassesTable, ExpectedColumn>;

let adminPool: pg.Pool | undefined;
let testPool: pg.Pool | undefined;
let store: SessionPercentileStore | undefined;
let securityId = "";

function db(): pg.Pool {
  if (testPool === undefined) {
    throw new Error("beforeAll did not create the test database.");
  }
  return testPool;
}

function scores(): SessionPercentileStore {
  if (store === undefined) {
    throw new Error("beforeAll did not create the store.");
  }
  return store;
}

function subject(): { id: string; symbol: ReturnType<typeof toTicker> } {
  return { id: securityId, symbol: toTicker("ZZZZ") };
}

async function columns(table: string): Promise<readonly ColumnRow[]> {
  const result = await db().query<ColumnRow>(
    `select column_name, data_type, is_nullable, is_identity, column_default
       from information_schema.columns
      where table_schema = 'public' and table_name = $1
      order by ordinal_position`,
    [table],
  );
  return result.rows;
}

const score = (
  overrides: Partial<SessionPercentileWrite> = {},
): SessionPercentileWrite => ({
  rank: 99,
  aboveSample: false,
  sampleCount: 4620,
  percent: -2.413,
  from: {
    at: new Date("2026-11-20T20:54:00.000Z"),
    price: 178.42,
    feed: "sip",
  },
  to: { at: new Date("2026-11-20T20:59:00.000Z"), price: 174.11, feed: "sip" },
  observed: 5,
  ...overrides,
});

const pass = (overrides: Partial<SessionPassWrite> = {}): SessionPassWrite => ({
  tracked: 501,
  eligible: 466,
  scored: 455,
  refusals: {
    nothingObserved: 35,
    noEarlierEndpoint: 0,
    noBasis: 0,
    tooFewSamples: 11,
    splitDiscontinuity: 0,
  },
  spanMinutes: 5,
  baseline: {
    feed: "sip",
    spanMinutes: 5,
    lookbackSessions: 60,
    minimumSampleCount: 2500,
  },
  ...overrides,
});

/** Clear both tables, so each test drives the state it is about. */
async function truncate(): Promise<void> {
  await db().query("delete from session_return_percentiles");
  await db().query("delete from session_return_percentile_passes");
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
  store = createSessionPercentileStore(testPool);
});

afterAll(async () => {
  delete process.env.DATABASE_NAME;
  await testPool?.end();

  if (adminPool !== undefined) {
    await adminPool.query(`drop database if exists ${TEST_DATABASE_NAME}`);
    await adminPool.end();
  }
});

describe("the two interfaces in schema.ts", () => {
  it("describes every column of each table, and no column it does not have", async () => {
    expect(
      (await columns("session_return_percentiles"))
        .map((c) => c.column_name)
        .sort(),
    ).toEqual(Object.keys(EXPECTED_SCORES).sort());
    expect(
      (await columns("session_return_percentile_passes"))
        .map((c) => c.column_name)
        .sort(),
    ).toEqual(Object.keys(EXPECTED_PASSES).sort());
  });

  it.each(Object.entries(EXPECTED_SCORES))(
    "session_return_percentiles.%s has the type, nullability and default the interface claims",
    async (name, expected: ExpectedColumn) => {
      const column = (await columns("session_return_percentiles")).find(
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

  it.each(Object.entries(EXPECTED_PASSES))(
    "session_return_percentile_passes.%s has the type, nullability and default the interface claims",
    async (name, expected: ExpectedColumn) => {
      const column = (await columns("session_return_percentile_passes")).find(
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

  it("gives `observed_at` NO default on EITHER table, which is the point", async () => {
    // `0014` §2 and `0002`'s decision 3. A `default now()` here is the leak
    // invariant 4 exists to prevent, on the column a replay keys on, and it is
    // invisible because every row would look plausible.
    for (const table of [
      "session_return_percentiles",
      "session_return_percentile_passes",
    ]) {
      const observedAt = (await columns(table)).find(
        (column) => column.column_name === "observed_at",
      );

      expect(observedAt?.column_default, `${table}.observed_at`).toBeNull();
      expect(observedAt?.is_nullable, `${table}.observed_at`).toBe("NO");
    }
  });
});

describe("the constraints, produced rather than read", () => {
  it("refuses an ordinal outside 0–99", async () => {
    await truncate();

    // A `140th` draws as a confident, well-formed row at the top of a region
    // about unusual behaviour, and nothing on the page can contradict it.
    await expect(
      scores().writeScore(subject(), FRIDAY, score({ rank: 100 })),
    ).rejects.toThrow(/rank_in_range/u);
    await expect(
      scores().writeScore(subject(), FRIDAY, score({ rank: -1 })),
    ).rejects.toThrow(/rank_in_range/u);
  });

  it("refuses a sample count of zero on a score row", async () => {
    await truncate();

    // Unlike `return_baselines`' refusal arm, where `0 of 2,500 returns` is the
    // cold replica's own sentence: a row here is a security that WAS ranked.
    await expect(
      scores().writeScore(subject(), FRIDAY, score({ sampleCount: 0 })),
    ).rejects.toThrow(/sample_count_positive/u);
  });

  it("refuses a NaN percent, which `percent = percent` would admit", async () => {
    await truncate();

    // `numeric 'NaN'` compares EQUAL to itself in Postgres, so the idiomatic
    // self-comparison is not a finiteness check. A non-finite move formats and
    // renders as the most alarming figure on the page.
    await expect(
      db().query(
        `insert into session_return_percentiles
           (security_id, observed_at, rank, above_sample, sample_count, percent,
            from_at, from_price, from_feed, to_at, to_price, to_feed,
            observed_minutes)
         values ($1, $2, 99, false, 4620, 'NaN'::numeric,
                 $3, 100, 'sip', $4, 101, 'sip', 5)`,
        [
          securityId,
          FRIDAY,
          new Date("2026-11-20T20:54:00.000Z"),
          new Date("2026-11-20T20:59:00.000Z"),
        ],
      ),
    ).rejects.toThrow(/percent_is_a_number/u);
  });

  it("refuses a reversed pair of endpoints", async () => {
    await truncate();

    // The one property of a pair nothing else can check: reversed, the same two
    // closes divide in the wrong order and produce a true-looking figure of the
    // opposite sign.
    await expect(
      scores().writeScore(
        subject(),
        FRIDAY,
        score({
          from: {
            at: new Date("2026-11-20T20:59:00.000Z"),
            price: 100,
            feed: "sip",
          },
          to: {
            at: new Date("2026-11-20T20:54:00.000Z"),
            price: 101,
            feed: "sip",
          },
        }),
      ),
    ).rejects.toThrow(/endpoints_in_order/u);
  });

  it("refuses populations that do not nest", async () => {
    await truncate();

    // `tracked ⊇ eligible ⊇ scored`, which the region's cut sentence rests on:
    // a negative remainder is a count of securities that cannot exist.
    await expect(
      scores().writePass(FRIDAY, pass({ eligible: 600 })),
    ).rejects.toThrow(/populations_nest/u);
    await expect(
      scores().writePass(FRIDAY, pass({ scored: 500 })),
    ).rejects.toThrow(/populations_nest/u);
  });

  it("refuses a tape outside the vocabulary, on a row and on a pass", async () => {
    await truncate();

    await expect(
      db().query(
        `insert into session_return_percentile_passes
           (observed_at, tracked_count, eligible_count, scored_count,
            nothing_observed_count, no_earlier_endpoint_count, no_basis_count,
            too_few_samples_count, split_discontinuity_count, span_minutes,
            baseline_feed, baseline_span_minutes, baseline_lookback_sessions,
            minimum_sample_count)
         values ($1, 501, 466, 455, 0, 0, 0, 0, 0, 5, 'otc', 5, 60, 2500)`,
        [FRIDAY],
      ),
    ).rejects.toThrow(/feed_known/u);
  });
});

describe("the read, and what a crashed pass leaves behind", () => {
  it("round-trips one session's figures and its scores", async () => {
    await truncate();

    await scores().writeScore(subject(), FRIDAY, score());
    await scores().writePass(FRIDAY, pass());

    const read = await scores().readNewestSession(FRIDAY);

    expect(read?.pass.observedAt.toISOString()).toBe(FRIDAY.toISOString());
    expect(read?.pass.tracked).toBe(501);
    expect(read?.pass.eligible).toBe(466);
    expect(read?.pass.scored).toBe(455);
    expect(read?.pass.refusals.tooFewSamples).toBe(11);
    expect(read?.pass.baseline.minimumSampleCount).toBe(2500);
    expect(read?.pass.baseline.lookbackSessions).toBe(60);

    // The figures come back as NUMBERS rather than as the `numeric` and
    // `bigint` strings `pg` hands over — the mapping is beside the query, which
    // is where a column becomes a domain answer.
    const [row] = read?.scores ?? [];
    expect(row?.symbol).toBe("ZZZZ");
    expect(row?.rank).toBe(99);
    expect(row?.sampleCount).toBe(4620);
    expect(row?.percent).toBeCloseTo(-2.413, 6);
    expect(row?.from.price).toBeCloseTo(178.42, 6);
    expect(row?.to.feed).toBe("sip");
    expect(row?.observed).toBe(5);
  });

  it("is INVISIBLE where scores were written and no pass row was", async () => {
    await truncate();

    // The nightly pass writes scores as it goes and the pass row at the end, so
    // a crash between them leaves this state. The read bounds the scores on the
    // pass row's own session, so the session is simply not there — rather than
    // a region drawn with rows and no figures to qualify them.
    await scores().writeScore(subject(), FRIDAY, score());

    expect(await scores().readNewestSession(FRIDAY)).toBeUndefined();
  });

  it("does not serve one session's scores under another session's figures", async () => {
    await truncate();

    await scores().writeScore(subject(), THURSDAY, score({ rank: 42 }));
    await scores().writePass(THURSDAY, pass());
    // Friday's pass ran and scored nothing — a holiday-thin session, or a pass
    // that reached no security. Thursday's rows must not be drawn under it.
    await scores().writePass(FRIDAY, pass({ eligible: 0, scored: 0 }));

    const read = await scores().readNewestSession(FRIDAY);

    expect(read?.pass.observedAt.toISOString()).toBe(FRIDAY.toISOString());
    expect(read?.scores).toEqual([]);
  });

  it("answers the newest session AT OR BEFORE the bound, never a later one", async () => {
    await truncate();

    await scores().writeScore(subject(), THURSDAY, score({ rank: 42 }));
    await scores().writePass(THURSDAY, pass());
    await scores().writeScore(subject(), FRIDAY, score());
    await scores().writePass(FRIDAY, pass());

    // The bound is an argument rather than a clock, which is `closesAsOf`'s
    // shape: under a replay of Thursday, Friday's session does not exist.
    const read = await scores().readNewestSession(THURSDAY);

    expect(read?.pass.observedAt.toISOString()).toBe(THURSDAY.toISOString());
    expect(read?.scores[0]?.rank).toBe(42);
  });

  it("converges rather than appending when a session is recomputed", async () => {
    await truncate();

    await scores().writeScore(subject(), FRIDAY, score({ rank: 42 }));
    await scores().writePass(FRIDAY, pass({ scored: 1 }));
    await scores().writeScore(subject(), FRIDAY, score({ rank: 77 }));
    await scores().writePass(FRIDAY, pass({ scored: 2 }));

    const read = await scores().readNewestSession(FRIDAY);

    // One row and one pass, both carrying the second answer — `pnpm universe`'s
    // property, because this table is derived and recomputable.
    expect(read?.scores).toHaveLength(1);
    expect(read?.scores[0]?.rank).toBe(77);
    expect(read?.pass.scored).toBe(2);
  });
});

describe("the cache, keyed on the session the ROW is for", () => {
  it("holds what the store returned and names the stored session", async () => {
    await truncate();

    await scores().writeScore(subject(), THURSDAY, score({ rank: 42 }));
    await scores().writePass(THURSDAY, pass());

    const cache = createSessionPercentileCache({ store: scores() });

    // Asked about **Friday**, with only Thursday stored: the held session is
    // Thursday's, read off the row's own `observed_at`. The precedent stamps
    // the session it was asked about on the data it got back and can then never
    // refresh again that day — a well-formed, correctly-dated wrong answer.
    await cache.load(toMarketDate("2026-11-20"));

    expect(cache.heldThrough()).toBe(marketDateAt(THURSDAY));
    expect(cache.rankingAsOf(toMarketDate("2026-11-20"))?.scores[0]?.rank).toBe(
      42,
    );
  });

  it("keeps the session it holds when a later read finds nothing newer", async () => {
    await truncate();

    await scores().writeScore(subject(), THURSDAY, score({ rank: 42 }));
    await scores().writePass(THURSDAY, pass());

    const cache = createSessionPercentileCache({ store: scores() });
    await cache.load(toMarketDate("2026-11-20"));

    await truncate();
    await cache.load(toMarketDate("2026-11-20"));

    // A failed or empty read never empties what is held: a region drawing last
    // session's ranking is a better answer than a region that went blank
    // because a query returned nothing.
    expect(cache.heldThrough()).toBe(marketDateAt(THURSDAY));
    expect(cache.size()).toBe(1);
  });

  it("is `undefined` before anything is stored, which is CI's permanent state", async () => {
    await truncate();

    const cache = createSessionPercentileCache({ store: scores() });
    await cache.load(toMarketDate("2026-11-20"));

    expect(cache.heldThrough()).toBeUndefined();
    expect(cache.rankingAsOf(toMarketDate("2026-11-20"))).toBeUndefined();
  });
});
