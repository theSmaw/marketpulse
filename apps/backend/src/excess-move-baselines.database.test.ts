// `0016_excess_move_baselines` and its store, against a real PostgreSQL server
// (Task 5.6.2).
//
// ## What this file is the only level that can see
//
// **Every constraint in `0016` is invisible to `pnpm verify`.** It has no
// database, by design, so a key missing a column, a partition that does not
// partition, a `default now()` on `observed_at` and an upsert that appends
// rather than converging are all green there and in `pnpm e2e`. Three of those
// four are the specific defects `0013`, `0014` and `0015` each wrote a section
// about, and this file plants each of them.
//
// The sharpest one is the **key**. `0016` §3 puts the reference in it because a
// reference change against a reference-blind key would *rewrite the meaning of
// every stored row with nothing recording that the meaning changed* — ADR 0045
// §3's argument, the one that put `feed` in `0015`'s key. That claim is a claim
// about an `on conflict` clause, so the only thing that can check it is an
// insert of two rows that differ only by their reference.
//
// It has its own database, which is `volume-baselines.database.test.ts`'
// precedent: a shared one would make this suite's fixture visible to that one's
// assertions about its own window. There is no `skipIf` — with no database it
// fails loudly in `beforeAll` naming `pnpm db`, because a skipped test reports
// green.

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { BASELINE_LOOKBACK_SESSIONS, toTicker } from "@marketpulse/shared";

import { loadConfig, loadEnvFile } from "./config.js";
import { runMigrations } from "./migrate.js";
import { SAMPLE_SPAN_MINUTES } from "./return-baseline.js";
import { BASELINE_FEED } from "./return-baseline-store.js";
import type { BaselineSubject } from "./return-baseline-store.js";
import { EXCESS_REFERENCE_KIND } from "./excess-move-baseline.js";
import { createExcessBaselineStore } from "./excess-move-baseline-store.js";
import type { ExcessBaselineStore } from "./excess-move-baseline-store.js";

const TEST_DATABASE_NAME = "marketpulse_vitest_excess_baseline";

const OBSERVED_AT = new Date("2026-09-24T20:00:00.000Z");

const PARAMETERS = {
  referenceKind: EXCESS_REFERENCE_KIND,
  lookbackSessions: BASELINE_LOOKBACK_SESSIONS,
  spanMinutes: SAMPLE_SPAN_MINUTES,
  feed: BASELINE_FEED,
  minimumSampleCount: 2500,
};

const REFERENCE = { kind: EXCESS_REFERENCE_KIND, symbol: "XLK" };

/** 101 ascending magnitudes, as the pass writes them. */
const BREAKPOINTS = Array.from({ length: 101 }, (_, rank) => rank / 10);

let adminPool: pg.Pool | undefined;
let testPool: pg.Pool | undefined;
let store: ExcessBaselineStore | undefined;
let subject: BaselineSubject | undefined;
let other: BaselineSubject | undefined;

function db(): pg.Pool {
  if (testPool === undefined) {
    throw new Error("beforeAll did not create the test database.");
  }
  return testPool;
}

function baselines(): ExcessBaselineStore {
  if (store === undefined) {
    throw new Error("beforeAll did not create the store.");
  }
  return store;
}

function probe(): BaselineSubject {
  if (subject === undefined) {
    throw new Error("beforeAll did not insert the probe security.");
  }
  return subject;
}

function second(): BaselineSubject {
  if (other === undefined) {
    throw new Error("beforeAll did not insert the second security.");
  }
  return other;
}

async function insertSecurity(symbol: string): Promise<BaselineSubject> {
  const inserted = await db().query<{ id: string }>(
    `insert into securities
       (symbol, name, exchange, kind, sector, industry, status, cik,
        profile_source, profile_retrieved_at,
        classification_source, classification_retrieved_at)
     values ($1, 'Probe', 'PROBE', 'equity', 'technology', null,
             'active', null, 'test', now(), 'test', now())
     returning id::text as id`,
    [symbol],
  );

  return { id: inserted.rows[0]?.id ?? "", symbol: toTicker(symbol) };
}

interface ColumnFacts {
  readonly column_name: string;
  readonly data_type: string;
  readonly udt_name: string;
  readonly is_nullable: string;
  readonly column_default: string | null;
}

async function columnsOf(table: string): Promise<readonly ColumnFacts[]> {
  const rows = await db().query<ColumnFacts>(
    `select column_name, data_type, udt_name, is_nullable, column_default
       from information_schema.columns
      where table_schema = 'public' and table_name = $1`,
    [table],
  );
  return rows.rows;
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

  subject = await insertSecurity("ZZZZ");
  other = await insertSecurity("YYYY");
  store = createExcessBaselineStore(testPool);
});

afterAll(async () => {
  delete process.env.DATABASE_NAME;
  await testPool?.end();

  if (adminPool !== undefined) {
    await adminPool.query(`drop database if exists ${TEST_DATABASE_NAME}`);
    await adminPool.end();
  }
});

describe("the migration applies and the shape is the one `0016` describes", () => {
  it("creates both tables", async () => {
    expect((await columnsOf("excess_move_baselines")).length).toBeGreaterThan(
      0,
    );
    expect(
      (await columnsOf("excess_move_baseline_passes")).length,
    ).toBeGreaterThan(0);
  });

  it("gives `observed_at` NO DEFAULT on either table", async () => {
    // `0002`'s decision 3 and `0016` §2. `default now()` on this column
    // silently turns *when it was true in the market* into *when we wrote it*,
    // on the one column a replay keys on — and every row would look plausible.
    for (const table of [
      "excess_move_baselines",
      "excess_move_baseline_passes",
    ]) {
      const observedAt = (await columnsOf(table)).find(
        (column) => column.column_name === "observed_at",
      );

      expect(observedAt?.data_type).toBe("timestamp with time zone");
      expect(observedAt?.column_default, `${table}.observed_at`).toBeNull();
      expect(observedAt?.is_nullable).toBe("NO");
    }
  });

  it("defaults `recorded_at`, which is the other half of the pair", async () => {
    const recordedAt = (await columnsOf("excess_move_baselines")).find(
      (column) => column.column_name === "recorded_at",
    );

    expect(recordedAt?.column_default).toContain("now()");
  });

  it("declares `breakpoints` as a `double precision[]`, which is an ARGUED exemption", async () => {
    // `0016` §6. `information_schema.columns.data_type` says `ARRAY` and only
    // `udt_name` says which — `_float8` — which is the blind spot
    // `docs/GAPS.md` recorded and `migrate.database.test.ts` now closes with a
    // named allowlist this column is on.
    const breakpoints = (await columnsOf("excess_move_baselines")).find(
      (column) => column.column_name === "breakpoints",
    );

    expect(breakpoints?.data_type).toBe("ARRAY");
    expect(breakpoints?.udt_name).toBe("_float8");
  });
});

describe("the key carries the reference — `0016` §3", () => {
  it("keeps two rows that differ ONLY by their reference", async () => {
    // **The claim in §3, as the only thing that can check it.** Against a
    // reference-blind key the second write is an `on conflict do update` and
    // the first row's meaning is rewritten with nothing recording that it
    // changed; against this key it is a new row beside the old one.
    await baselines().writeBaseline(
      probe(),
      OBSERVED_AT,
      REFERENCE,
      PARAMETERS,
      {
        kind: "measured",
        sampleCount: 4_000,
        breakpoints: BREAKPOINTS,
      },
    );

    await baselines().writeBaseline(
      probe(),
      OBSERVED_AT,
      // The form the key is shaped for. The vocabulary check admits one member
      // today, so this row uses the same kind and a different fund — which is
      // the same test of the key and is reachable without a migration.
      { kind: EXCESS_REFERENCE_KIND, symbol: "XLV" },
      PARAMETERS,
      { kind: "measured", sampleCount: 3_000, breakpoints: BREAKPOINTS },
    );

    const rows = await db().query<{ reference_symbol: string }>(
      `select reference_symbol from excess_move_baselines
        where security_id = $1 and observed_at = $2
        order by reference_symbol`,
      [probe().id, OBSERVED_AT],
    );

    expect(rows.rows.map((row) => row.reference_symbol)).toEqual([
      "XLK",
      "XLV",
    ]);
  });

  it("CONVERGES on a re-run for the same key rather than appending", async () => {
    // `pnpm universe`'s property, for this table's reason: it is derived and
    // recomputable, so `pnpm baselines` must be re-runnable.
    await baselines().writeBaseline(
      second(),
      OBSERVED_AT,
      REFERENCE,
      PARAMETERS,
      {
        kind: "measured",
        sampleCount: 4_000,
        breakpoints: BREAKPOINTS,
      },
    );
    await baselines().writeBaseline(
      second(),
      OBSERVED_AT,
      REFERENCE,
      PARAMETERS,
      {
        kind: "measured",
        sampleCount: 4_100,
        breakpoints: BREAKPOINTS,
      },
    );

    const rows = await db().query<{ sample_count: string }>(
      `select sample_count::text from excess_move_baselines
        where security_id = $1 and reference_symbol = 'XLK'`,
      [second().id],
    );

    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]?.sample_count).toBe("4100");
  });

  it("refuses a reference kind outside the vocabulary", async () => {
    await expect(
      db().query(
        `insert into excess_move_baselines
           (security_id, observed_at, reference_kind, reference_symbol,
            lookback_sessions, sample_count, breakpoints)
         values ($1, $2, 'industry_peer_median', 'Semiconductors', 60, 10, $3)`,
        [probe().id, OBSERVED_AT, BREAKPOINTS],
      ),
    ).rejects.toThrow(/reference_kind_known/);
  });
});

describe("the two kinds that are rows, and the one that is not", () => {
  it("refuses a row with both a distribution and a refusal", async () => {
    await expect(
      db().query(
        `insert into excess_move_baselines
           (security_id, observed_at, reference_kind, reference_symbol,
            lookback_sessions, sample_count, breakpoints, refusal)
         values ($1, $2, 'sector_etf', 'XLE', 60, 10, $3, 'split-discontinuity')`,
        [probe().id, OBSERVED_AT, BREAKPOINTS],
      ),
    ).rejects.toThrow(/one_answer/);
  });

  it("refuses a row with NEITHER", async () => {
    await expect(
      db().query(
        `insert into excess_move_baselines
           (security_id, observed_at, reference_kind, reference_symbol,
            lookback_sessions, sample_count)
         values ($1, $2, 'sector_etf', 'XLE', 60, 10)`,
        [probe().id, OBSERVED_AT],
      ),
    ).rejects.toThrow(/one_answer/);
  });

  it("refuses a refusal word outside the stored vocabulary", async () => {
    await expect(
      db().query(
        `insert into excess_move_baselines
           (security_id, observed_at, reference_kind, reference_symbol,
            lookback_sessions, sample_count, refusal)
         values ($1, $2, 'sector_etf', 'XLE', 60, 10, 'mixed-basis')`,
        [probe().id, OBSERVED_AT],
      ),
      // `mixed-basis` is a READ refusal, decided when the figure is scored. A
      // stored one would be a row claiming the pass refused something it never
      // looked at.
    ).rejects.toThrow(/refusal_known/);
  });

  it("refuses a distribution that is not 101 points", async () => {
    await expect(
      db().query(
        `insert into excess_move_baselines
           (security_id, observed_at, reference_kind, reference_symbol,
            lookback_sessions, sample_count, breakpoints)
         values ($1, $2, 'sector_etf', 'XLE', 60, 10, $3)`,
        [probe().id, OBSERVED_AT, BREAKPOINTS.slice(0, 21)],
      ),
      // 21 is a vigintile grid, whose finest statement about the upper tail is
      // *above the 95th* — the shape `BASELINE_BREAKPOINT_COUNT` exists to
      // refuse, because expressing the 99th is the whole reason for a pooled
      // distribution.
    ).rejects.toThrow(/breakpoint_count/);
  });

  it("refuses to write a `none` outcome at all, naming the distinction", async () => {
    await expect(
      baselines().writeBaseline(probe(), OBSERVED_AT, REFERENCE, PARAMETERS, {
        kind: "none",
      }),
    ).rejects.toThrow(/DIFFERENT fact from a refusal/);
  });
});

describe("the pass row — four populations that PARTITION", () => {
  it("writes the counts and the parameters the pass applied", async () => {
    await baselines().writePass(OBSERVED_AT, {
      tracked: 516,
      measured: 480,
      inapplicable: 15,
      absent: 16,
      refusals: { splitDiscontinuity: 4, referenceSplitDiscontinuity: 1 },
      parameters: PARAMETERS,
    });

    const rows = await db().query<Record<string, string | number>>(
      `select tracked_count::text, measured_count::text, refused_count::text,
              inapplicable_count::text, absent_count::text,
              split_discontinuity_count::text,
              reference_split_discontinuity_count::text,
              lookback_sessions, span_minutes, baseline_feed,
              minimum_sample_count::text, reference_kind
         from excess_move_baseline_passes where observed_at = $1`,
      [OBSERVED_AT],
    );

    expect(rows.rows[0]).toMatchObject({
      tracked_count: "516",
      measured_count: "480",
      // Derived from the two refusal counts by the store, so the breakdown and
      // the population cannot be written out of step.
      refused_count: "5",
      inapplicable_count: "15",
      absent_count: "16",
      split_discontinuity_count: "4",
      reference_split_discontinuity_count: "1",
      lookback_sessions: BASELINE_LOOKBACK_SESSIONS,
      span_minutes: SAMPLE_SPAN_MINUTES,
      baseline_feed: BASELINE_FEED,
      minimum_sample_count: "2500",
      reference_kind: EXCESS_REFERENCE_KIND,
    });
  });

  it("refuses counts that do not SUM to `tracked`", async () => {
    // `0015` §5's shape rather than `0014`'s nesting: a reader cannot subtract
    // *how many securities can this factor be drawn for* out of four figures
    // that overlap. A pass that died mid-loop writes a row this refuses, which
    // is the intended behaviour — no pass row at all is the readable state.
    await expect(
      db().query(
        `insert into excess_move_baseline_passes
           (observed_at, reference_kind, tracked_count, measured_count,
            refused_count, inapplicable_count, absent_count,
            split_discontinuity_count, reference_split_discontinuity_count,
            lookback_sessions, span_minutes, baseline_feed,
            minimum_sample_count)
         values ($1, 'sector_etf', 516, 480, 5, 15, 99, 4, 1, 60, 5, 'sip', 2500)`,
        [new Date("2026-09-25T20:00:00.000Z")],
      ),
    ).rejects.toThrow(/securities_partition/);
  });

  it("refuses a refusal breakdown that does not sum to `refused_count`", async () => {
    await expect(
      db().query(
        `insert into excess_move_baseline_passes
           (observed_at, reference_kind, tracked_count, measured_count,
            refused_count, inapplicable_count, absent_count,
            split_discontinuity_count, reference_split_discontinuity_count,
            lookback_sessions, span_minutes, baseline_feed,
            minimum_sample_count)
         values ($1, 'sector_etf', 516, 480, 5, 15, 16, 2, 1, 60, 5, 'sip', 2500)`,
        [new Date("2026-09-25T20:00:00.000Z")],
      ),
    ).rejects.toThrow(/refusals_partition/);
  });

  it("holds one row per `(session, reference kind)` and converges on a re-run", async () => {
    await baselines().writePass(OBSERVED_AT, {
      tracked: 516,
      measured: 481,
      inapplicable: 15,
      absent: 15,
      refusals: { splitDiscontinuity: 4, referenceSplitDiscontinuity: 1 },
      parameters: PARAMETERS,
    });

    const rows = await db().query<{ measured_count: string }>(
      `select measured_count::text from excess_move_baseline_passes
        where observed_at = $1`,
      [OBSERVED_AT],
    );

    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]?.measured_count).toBe("481");
  });
});

describe("readNewestGeneration", () => {
  it("answers the newest window's rows, with the reference on each", async () => {
    const held = await baselines().readNewestGeneration(
      new Date("2026-10-01T00:00:00.000Z"),
    );

    expect(held.length).toBeGreaterThan(0);
    for (const row of held) {
      expect(row.observedAt.getTime()).toBe(OBSERVED_AT.getTime());
      expect(row.referenceKind).toBe(EXCESS_REFERENCE_KIND);
      expect(row.referenceSymbol).not.toBe("");
    }
  });

  it("maps the two nullable columns into one explicit answer", async () => {
    await baselines().writeBaseline(
      second(),
      OBSERVED_AT,
      { kind: EXCESS_REFERENCE_KIND, symbol: "XLE" },
      PARAMETERS,
      {
        kind: "refused",
        sampleCount: 3_100,
        refusal: "reference-split-discontinuity",
      },
    );

    const held = await baselines().readNewestGeneration(
      new Date("2026-10-01T00:00:00.000Z"),
    );

    const refused = held.find((row) => row.referenceSymbol === "XLE");
    expect(refused?.refusal).toBe("reference-split-discontinuity");
    // A refused row carries its count anyway: *how much did you have* is the
    // first question asked of one.
    expect(refused?.sampleCount).toBe(3_100);

    const measured = held.find((row) => row.referenceSymbol === "XLK");
    expect(measured?.refusal).toBeNull();
    expect(measured?.refusal === null ? measured.breakpoints.length : 0).toBe(
      101,
    );
  });

  it("answers nothing at all for a bound before every generation", async () => {
    expect(
      await baselines().readNewestGeneration(
        new Date("2026-01-01T00:00:00.000Z"),
      ),
    ).toEqual([]);
  });
});
