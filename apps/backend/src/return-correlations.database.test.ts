// `0018_return_correlations` and its store, against a real PostgreSQL server
// (Task 6.5.1).
//
// ## What this file is the only level that can see
//
// **Every constraint in `0018` is invisible to `pnpm verify`.** It has no
// database, by design, so a key missing a column, a partition that does not
// partition, a `default now()` on `observed_at`, a reversed pair and an upsert
// that appends rather than converging are all green there and in `pnpm e2e`.
// This file plants each of them.
//
// The sharpest two are new to this table and have no precedent in the five
// derived tables before it.
//
// **The canonical order, and the constraint this file's own fixture sent
// back to the drawing board.** `0018` §3 canonicalises on **ticker** because
// `securities.id` is assigned in row-insertion order and CI's store and the
// deployed store disagree about that order. The planned backstop was
// `check (security_low_id < security_high_id)` — and this suite's fixture,
// which inserts `CCCC`, `BBBB`, `AAAA` in that order so that ticker order and
// id order DISAGREE, refused the first legitimate row the store wrote. That
// check would have failed the nightly pass on the deployed store and passed
// on any store whose securities were inserted in ticker order, which is every
// store anybody would have tested it against.
//
// What is below instead is `return_correlations_one_row_per_unordered_pair`,
// a unique index over `least`/`greatest` of the two ids, which refuses the
// reverse orientation of a stored pair **without** needing to know the ticker
// order — plus the writer's own throw, which is the only place the ticker rule
// can live. This file drives both: a raw insert of a stored pair with the ids
// swapped, refused by the index, and a reversed pair handed to the store,
// refused by the store with the reason named.
//
// **No landmark node.** `0018` §6 records that this is deliberately NOT a
// database constraint, because which securities are landmarks is a curated
// fact in `packages/shared`/`apps/backend` and a `check` on `kind` alone would
// be a partial restatement that looks complete. So it is asserted here on the
// **producer's population** — `equityTickers()` against `UNIVERSE` — rather
// than by observing that today's rows happen not to name one, which is a
// vacuous observation on a store with no bars.
//
// It has its own database, which is `volume-baselines.database.test.ts`'
// precedent: a shared one would make this suite's fixture visible to that
// one's assertions about its own window. There is no `skipIf` — with no
// database it fails loudly in `beforeAll` naming `pnpm db`, because a skipped
// test reports green.

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  CORRELATION_LOOKBACK_SESSIONS,
  CORRELATION_MINIMUM_OVERLAP,
  toTicker,
} from "@marketpulse/shared";

import { loadConfig, loadEnvFile } from "./config.js";
import { runMigrations } from "./migrate.js";
import { SAMPLE_SPAN_MINUTES } from "./return-baseline.js";
import { BASELINE_FEED } from "./return-baseline-store.js";
import { createReturnCorrelationStore } from "./return-correlation-store.js";
import type {
  ReturnCorrelationStore,
  RetainedCorrelation,
} from "./return-correlation-store.js";
import {
  UNIVERSE,
  equityTickers,
  indexProxyTickers,
  sectorEtfTickers,
} from "./universe.js";

const TEST_DATABASE_NAME = "marketpulse_vitest_return_correlations";

const OBSERVED_AT = new Date("2026-09-24T20:00:00.000Z");

const PARAMETERS = {
  lookbackSessions: CORRELATION_LOOKBACK_SESSIONS,
  spanMinutes: SAMPLE_SPAN_MINUTES,
  feed: BASELINE_FEED,
};

/** A pass row whose two chains both close, for mutating in one place. */
const PASS = {
  trackedEquities: 501,
  eligibleEquities: 485,
  splitDiscontinuity: 5,
  absent: 11,
  candidatePairs: 117_370,
  computedPairs: 117_000,
  retainedPairs: 2_400,
  refusals: { tooFewOverlappingSamples: 300, zeroVariance: 70 },
  belowSignificance: 400,
  retainedN: 5,
  parameters: PARAMETERS,
};

let adminPool: pg.Pool | undefined;
let testPool: pg.Pool | undefined;
let store: ReturnCorrelationStore | undefined;
const ids = new Map<string, string>();

function db(): pg.Pool {
  if (testPool === undefined) {
    throw new Error("beforeAll did not create the test database.");
  }
  return testPool;
}

function correlations(): ReturnCorrelationStore {
  if (store === undefined) {
    throw new Error("beforeAll did not create the store.");
  }
  return store;
}

function idOf(symbol: string): string {
  const id = ids.get(symbol);
  if (id === undefined) {
    throw new Error(`beforeAll did not insert ${symbol}.`);
  }
  return id;
}

/** `(low, high, r, n)` as the store takes it. */
const pair = (
  low: string,
  high: string,
  r: number,
  n = 4_620,
): RetainedCorrelation => ({ low: toTicker(low), high: toTicker(high), r, n });

async function insertSecurity(symbol: string): Promise<void> {
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

  ids.set(symbol, inserted.rows[0]?.id ?? "");
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

  // **Inserted in an order that DISAGREES with the ticker order**, which is the
  // whole point of §3: `CCCC` gets the lowest id and `AAAA` the highest, so a
  // producer that canonicalised on `security_id` would store
  // `(CCCC, AAAA)`-shaped rows and satisfy every constraint in the file. The
  // ticker order is `AAAA < BBBB < CCCC` and the id order is the reverse.
  for (const symbol of ["CCCC", "BBBB", "AAAA"]) {
    await insertSecurity(symbol);
  }

  store = createReturnCorrelationStore(testPool);
});

afterAll(async () => {
  delete process.env.DATABASE_NAME;
  await testPool?.end();

  if (adminPool !== undefined) {
    await adminPool.query(`drop database if exists ${TEST_DATABASE_NAME}`);
    await adminPool.end();
  }
});

describe("the migration applies and the shape is the one `0018` describes", () => {
  it("creates both tables", async () => {
    expect((await columnsOf("return_correlations")).length).toBeGreaterThan(0);
    expect(
      (await columnsOf("return_correlation_passes")).length,
    ).toBeGreaterThan(0);
  });

  it("gives `observed_at` NO DEFAULT on either table", async () => {
    // `0002`'s decision 3 and `0018` §2. `default now()` on this column
    // silently turns *when it was true in the market* into *when we wrote it*,
    // on the one column a replay keys on — and every row would look plausible.
    for (const table of ["return_correlations", "return_correlation_passes"]) {
      const observedAt = (await columnsOf(table)).find(
        (column) => column.column_name === "observed_at",
      );

      expect(observedAt?.data_type).toBe("timestamp with time zone");
      expect(observedAt?.column_default, `${table}.observed_at`).toBeNull();
      expect(observedAt?.is_nullable).toBe("NO");
    }
  });

  it("REFUSES an insert that omits `observed_at`, on both tables", async () => {
    // Driven rather than read off `information_schema` — the two assertions
    // above establish the column has no default and is not nullable, which
    // together imply this, but an omitted insert is the one thing that
    // actually exercises the column the way a crash-mid-write would.
    await expect(
      db().query(
        `insert into return_correlations
           (security_low_id, security_high_id, coefficient, sample_count,
            lookback_sessions, span_minutes, feed)
         values ($1, $2, 0.5, 4620, 60, 5, 'sip')`,
        [idOf("AAAA"), idOf("BBBB")],
      ),
    ).rejects.toThrow(/null value in column "observed_at"/);

    await expect(
      db().query(
        `insert into return_correlation_passes
           (tracked_equities_count, eligible_equities_count,
            split_discontinuity_count, absent_count, candidate_pairs_count,
            computed_pairs_count, retained_pairs_count,
            too_few_overlapping_samples_count, zero_variance_count,
            below_significance_count, retained_n, lookback_sessions,
            span_minutes, feed)
         values (1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 5, 60, 5, 'sip')`,
      ),
    ).rejects.toThrow(/null value in column "observed_at"/);
  });

  it("defaults `recorded_at`, which is the other half of the pair", async () => {
    for (const table of ["return_correlations", "return_correlation_passes"]) {
      const recordedAt = (await columnsOf(table)).find(
        (column) => column.column_name === "recorded_at",
      );

      expect(recordedAt?.column_default, table).toContain("now()");
    }
  });

  it("stores the coefficient as `numeric` and never as a float", async () => {
    // This schema's standing rule, with no exception for a figure that is not
    // money: `migrate.database.test.ts` refuses a scalar floating-point column
    // outright, and `0013`'s and `0016`'s approximate columns escape it only
    // because their `data_type` is `ARRAY`. There is no array here.
    const coefficient = (await columnsOf("return_correlations")).find(
      (column) => column.column_name === "coefficient",
    );

    expect(coefficient?.data_type).toBe("numeric");
    expect(coefficient?.udt_name).toBe("numeric");
  });
});

describe("the pair is canonical, and the order is DRIVEN as well as checked", () => {
  it("writes a pair with the lower TICKER as `security_low_id`, whatever the ids are", async () => {
    // **The assertion `0018` §3 exists for, and it is the one that found the
    // defect.** `AAAA` has the HIGHEST id in this fixture and `BBBB` a lower
    // one, so this row has `security_low_id > security_high_id` **in id
    // terms** — and the planned `check (security_low_id < security_high_id)`
    // refused it outright. That check would have failed the nightly pass on
    // the deployed store, where `PSKY` and `WBD` were curated after every
    // ticker that sorts above them; it reads as though the writer's rule and
    // the constraint "agree by construction" and they do not, because ticker
    // order and id order are different orders.
    //
    // The fixture inserts `CCCC`, `BBBB`, `AAAA` in that order precisely so
    // the two orders disagree — on a store whose securities were inserted in
    // ticker order they coincide and this assertion passes either way.
    const written = await correlations().writeCorrelations(
      OBSERVED_AT,
      PARAMETERS,
      [pair("AAAA", "BBBB", 0.82, 4_620)],
    );

    expect(written).toBe(1);

    const rows = await db().query<{ low: string; high: string }>(
      `select low.symbol as low, high.symbol as high
         from return_correlations c
         join securities low on low.id = c.security_low_id
         join securities high on high.id = c.security_high_id
        where c.observed_at = $1`,
      [OBSERVED_AT],
    );

    expect(rows.rows).toEqual([{ low: "AAAA", high: "BBBB" }]);
  });

  it("REFUSES a pair handed in the wrong ticker order, naming the rule", async () => {
    // The writer's own half, which is the half that holds the ticker rule —
    // the database's `check` compares ids and cannot express it.
    await expect(
      correlations().writeCorrelations(OBSERVED_AT, PARAMETERS, [
        pair("BBBB", "AAAA", 0.82),
      ]),
    ).rejects.toThrow(/canonical ticker order/);
  });

  it("refuses a SECOND row for the same unordered pair, in either orientation", async () => {
    // **`return_correlations_one_row_per_unordered_pair`, driven rather than
    // read off the DDL** — and it is the constraint that can hold this claim
    // without knowing the ticker order, which is why it replaced the `<`
    // check. The row written above is `(AAAA, BBBB)`; this insert is
    // `(BBBB, AAAA)` with the ids swapped, which satisfies
    // `return_correlations_unique_pair`, satisfies every `check` in the table,
    // and is a second edge between one pair of nodes.
    await expect(
      db().query(
        `insert into return_correlations
           (security_low_id, security_high_id, observed_at, coefficient,
            sample_count, lookback_sessions, span_minutes, feed)
         values ($1, $2, $3, 0.5, 4620, 60, 5, 'sip')`,
        [idOf("BBBB"), idOf("AAAA"), OBSERVED_AT],
      ),
    ).rejects.toThrow(/one_row_per_unordered_pair/);
  });

  it("allows the same pair in a DIFFERENT session, which is a generation", async () => {
    // The backstop is per session — `observed_at` leads it — because the whole
    // point of keying by the session a generation is FOR is that two sessions
    // hold two answers for one pair.
    expect(
      await correlations().writeCorrelations(
        new Date("2026-09-26T20:00:00.000Z"),
        PARAMETERS,
        [pair("AAAA", "BBBB", 0.13)],
      ),
    ).toBe(1);
  });

  it("refuses a SELF-pair", async () => {
    // `return_correlations_no_self_pair`. A correlation of a security with
    // itself is `1` by construction and would be the strongest edge on every
    // node — and the unordered-pair index cannot refuse it, because
    // `least(a, a) = greatest(a, a)` is a perfectly good unique key.
    await expect(
      db().query(
        `insert into return_correlations
           (security_low_id, security_high_id, observed_at, coefficient,
            sample_count, lookback_sessions, span_minutes, feed)
         values ($1, $1, $2, 1, 4620, 60, 5, 'sip')`,
        [idOf("BBBB"), new Date("2026-09-25T20:00:00.000Z")],
      ),
    ).rejects.toThrow(/no_self_pair/);
  });

  it("CONVERGES on a re-run for the same key rather than appending", async () => {
    // `pnpm universe`'s property, for this table's reason: it is derived and
    // recomputable, and `N` is already known to be provisional, so
    // `pnpm baselines` must be re-runnable.
    await correlations().writeCorrelations(OBSERVED_AT, PARAMETERS, [
      pair("AAAA", "BBBB", 0.44, 3_000),
    ]);

    const rows = await db().query<{
      coefficient: string;
      sample_count: string;
    }>(
      `select coefficient::text, sample_count::text from return_correlations
        where observed_at = $1`,
      [OBSERVED_AT],
    );

    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]?.coefficient).toBe("0.440000");
    expect(rows.rows[0]?.sample_count).toBe("3000");
  });

  it("writes MANY pairs in one statement and updates each from its OWN row", async () => {
    // **The one way this upsert differs from every single-row sibling**: a
    // `doUpdateSet` capturing a constant would write the first row's
    // coefficient into every conflicting row of the batch, so the update set
    // reads `excluded`. Three pairs, three different coefficients, written
    // twice.
    const session = new Date("2026-09-28T20:00:00.000Z");
    const batch = [
      pair("AAAA", "BBBB", 0.11, 4_000),
      pair("AAAA", "CCCC", 0.22, 4_100),
      pair("BBBB", "CCCC", 0.33, 4_200),
    ];

    expect(
      await correlations().writeCorrelations(session, PARAMETERS, batch),
    ).toBe(3);
    expect(
      await correlations().writeCorrelations(session, PARAMETERS, [
        pair("AAAA", "BBBB", -0.91, 4_000),
        pair("AAAA", "CCCC", -0.92, 4_100),
        pair("BBBB", "CCCC", -0.93, 4_200),
      ]),
    ).toBe(3);

    const rows = await db().query<{ low: string; coefficient: string }>(
      `select low.symbol as low, c.coefficient::text as coefficient
         from return_correlations c
         join securities low on low.id = c.security_low_id
         join securities high on high.id = c.security_high_id
        where c.observed_at = $1
        order by low.symbol, high.symbol`,
      [session],
    );

    expect(rows.rows.map((row) => row.coefficient)).toEqual([
      "-0.910000",
      "-0.920000",
      "-0.930000",
    ]);
  });

  it("writes nothing, and no pass row, for an empty retained set", async () => {
    // CI's permanent state: 516 securities and zero bars, so every equity is
    // absent, no pair is formed and the tables are **empty but present**.
    expect(
      await correlations().writeCorrelations(
        new Date("2026-09-29T20:00:00.000Z"),
        PARAMETERS,
        [],
      ),
    ).toBe(0);
  });

  it("refuses a pair naming a security the store does not hold", async () => {
    await expect(
      correlations().writeCorrelations(OBSERVED_AT, PARAMETERS, [
        pair("AAAA", "ZZZZ", 0.5),
      ]),
    ).rejects.toThrow(/not a row in/);
  });
});

describe("the coefficient's and the overlap's own bounds, in the database", () => {
  const session = new Date("2026-10-01T20:00:00.000Z");

  const insert = (coefficient: string, sampleCount: number): Promise<unknown> =>
    db().query(
      `insert into return_correlations
         (security_low_id, security_high_id, observed_at, coefficient,
          sample_count, lookback_sessions, span_minutes, feed)
       values ($1, $2, $3, $4, $5, 60, 5, 'sip')`,
      [idOf("BBBB"), idOf("CCCC"), session, coefficient, sampleCount],
    );

  it("refuses a coefficient outside [-1, 1]", async () => {
    // A coefficient of 1.4 draws as a confident, well-formed strongest edge
    // and nothing on the page can contradict one.
    await expect(insert("1.4", 4_620)).rejects.toThrow(/coefficient_in_range/);
    await expect(insert("-1.4", 4_620)).rejects.toThrow(/coefficient_in_range/);
  });

  it("refuses a `NaN` coefficient, which `= itself` would admit", async () => {
    // **`numeric` has a `NaN` and it compares equal to itself**, so the
    // idiomatic `coefficient = coefficient` would let it through. `0/0` is
    // exactly what a zero-variance leg produces if the producer's refusal is
    // ever bypassed: the strongest edge in the graph, from a division by zero.
    await expect(insert("NaN", 4_620)).rejects.toThrow(
      /coefficient_is_a_number|coefficient_in_range/,
    );
  });

  it("refuses an overlap below the definedness floor", async () => {
    // `CORRELATION_MINIMUM_OVERLAP`. Below four shared anchors the
    // significance test's standard error — `1/√(n − 3)` — is not finite, so the
    // coefficient is undefined rather than imprecise.
    expect(CORRELATION_MINIMUM_OVERLAP).toBe(4);
    await expect(insert("0.5", 3)).rejects.toThrow(/sample_count_above_floor/);
    await expect(insert("0.5", 0)).rejects.toThrow(/sample_count_above_floor/);
  });

  it("refuses a tape outside the vocabulary", async () => {
    await expect(
      db().query(
        `insert into return_correlations
           (security_low_id, security_high_id, observed_at, coefficient,
            sample_count, lookback_sessions, span_minutes, feed)
         values ($1, $2, $3, 0.5, 4620, 60, 5, 'synthetic')`,
        [idOf("BBBB"), idOf("CCCC"), session],
      ),
    ).rejects.toThrow(/feed_known/);
  });
});

describe("the pass row — two population chains at two grains", () => {
  it("writes every count and every parameter the pass applied", async () => {
    await correlations().writePass(OBSERVED_AT, PASS);

    const rows = await db().query<Record<string, string | number>>(
      `select tracked_equities_count::text, eligible_equities_count::text,
              split_discontinuity_count::text, absent_count::text,
              candidate_pairs_count::text, computed_pairs_count::text,
              retained_pairs_count::text,
              too_few_overlapping_samples_count::text,
              zero_variance_count::text, below_significance_count::text,
              retained_n, lookback_sessions, span_minutes, feed
         from return_correlation_passes where observed_at = $1`,
      [OBSERVED_AT],
    );

    expect(rows.rows[0]).toMatchObject({
      tracked_equities_count: "501",
      eligible_equities_count: "485",
      split_discontinuity_count: "5",
      absent_count: "11",
      candidate_pairs_count: "117370",
      computed_pairs_count: "117000",
      retained_pairs_count: "2400",
      too_few_overlapping_samples_count: "300",
      zero_variance_count: "70",
      below_significance_count: "400",
      retained_n: 5,
      lookback_sessions: CORRELATION_LOOKBACK_SESSIONS,
      span_minutes: SAMPLE_SPAN_MINUTES,
      feed: BASELINE_FEED,
    });
  });

  it("refuses security counts that do not PARTITION `tracked`", async () => {
    // `0018` §5. A pass that died mid-loop writes a row whose counts do not
    // sum and this refuses it, which is the intended behaviour: no pass row at
    // all is the readable state.
    await expect(
      correlations().writePass(new Date("2026-10-02T20:00:00.000Z"), {
        ...PASS,
        absent: 99,
      }),
    ).rejects.toThrow(/securities_partition/);
  });

  it("refuses pair counts that do not NEST", async () => {
    // `retained + below_significance ≤ computed ≤ candidate`. The first
    // conjunct is the one worth having: a retained set larger than the
    // significant set is a pass that drew an edge it had refused.
    await expect(
      correlations().writePass(new Date("2026-10-03T20:00:00.000Z"), {
        ...PASS,
        retainedPairs: PASS.computedPairs - PASS.belowSignificance + 1,
      }),
    ).rejects.toThrow(/pairs_nest/);

    // **And the nesting's SECOND conjunct — `computed ≤ candidate` — is
    // implied by the refusal partition and cannot be reached on its own.**
    // Found by planting it rather than by reading: `computedPairs: candidate +
    // 1` goes red naming
    // `return_correlation_passes_pair_refusals_partition`, not `pairs_nest`,
    // because two non-negative refusal counts summing to `candidate −
    // computed` already forces the inequality. The conjunct is kept — it is
    // free, it states the chain a reader expects, and it stops being implied
    // the day the refusal partition is relaxed to a nesting — but the
    // assertion is written against the clause it can actually reach, rather
    // than against a transcript that would have certified the wrong
    // constraint.
    await expect(
      correlations().writePass(new Date("2026-10-04T20:00:00.000Z"), {
        ...PASS,
        computedPairs: PASS.candidatePairs + 1,
      }),
    ).rejects.toThrow(/pair_refusals_partition/);
  });

  it("refuses pair refusals that do not sum to the candidate/computed gap", async () => {
    // **A security-grain refusal removes ~500 pairs at a stroke**, which is
    // why the two grains are counted apart — and why the gap at the pair grain
    // has to be fully accounted for by the two pair-grain reasons.
    await expect(
      correlations().writePass(new Date("2026-10-05T20:00:00.000Z"), {
        ...PASS,
        refusals: { tooFewOverlappingSamples: 1, zeroVariance: 1 },
      }),
    ).rejects.toThrow(/pair_refusals_partition/);
  });

  it("refuses an `N` of zero, which would retain nothing and mean nothing", async () => {
    await expect(
      correlations().writePass(new Date("2026-10-06T20:00:00.000Z"), {
        ...PASS,
        retainedN: 0,
      }),
    ).rejects.toThrow(/parameters_positive/);
  });

  it("holds one row per session and converges on a re-run", async () => {
    await correlations().writePass(OBSERVED_AT, {
      ...PASS,
      retainedPairs: 2_401,
    });

    const rows = await db().query<{ retained_pairs_count: string }>(
      `select retained_pairs_count::text from return_correlation_passes
        where observed_at = $1`,
      [OBSERVED_AT],
    );

    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]?.retained_pairs_count).toBe("2401");
  });
});

describe("no landmark node ever forms a correlation pair — `0018` §6", () => {
  it("excludes every sector ETF, every market proxy and the hub from the candidate population", () => {
    // **Asserted on the PRODUCER's population, not on today's rows.** On a
    // store with no bars no pair exists at all, so *absent from the rows* and
    // *excluded by construction* look identical — which is exactly the shape
    // `0018` §6 says must be checked here instead of by a `check` constraint.
    //
    // `equityTickers()` is the one population the pass accumulates series for
    // (`compute-baselines.ts`, the `isEquity` gate), so this is the real
    // candidate set rather than a restatement of it.
    const candidates = new Set<string>(equityTickers());

    const landmarks = [...sectorEtfTickers(), ...indexProxyTickers()];

    // Non-vacuous: there are landmarks to have got wrong. Eleven sector SPDRs
    // and four market proxies today, counted rather than spelled.
    expect(landmarks.length).toBeGreaterThan(0);

    for (const landmark of landmarks) {
      expect(
        candidates.has(landmark),
        `${landmark} is a landmark node and must form no correlation pair`,
      ).toBe(false);
    }

    // And the population is the equities, non-vacuously — a candidate set that
    // was empty would satisfy every assertion above.
    expect(candidates.size).toBeGreaterThan(400);
    for (const symbol of candidates) {
      const security = UNIVERSE.find((one) => one.symbol === symbol);
      expect(security?.kind, symbol).toBe("equity");
    }
  });
});

describe("readNewestGeneration — the whole generation of one session (Task 6.5.2)", () => {
  // The read's own session, kept clear of `OBSERVED_AT` above so these tests
  // do not have to care what order the rest of this file wrote rows in.
  const EARLIER = new Date("2026-11-02T21:00:00.000Z");
  const LATER = new Date("2026-11-03T21:00:00.000Z");

  it("answers `undefined` where no pass has run at or before the instant", async () => {
    // CI's permanent state, and every store's before the first
    // `pnpm baselines`. Asked about an instant before anything this file
    // wrote, there is nothing to serve.
    expect(
      await correlations().readNewestGeneration(
        new Date("2020-01-02T20:00:00.000Z"),
      ),
    ).toBeUndefined();
  });

  it("resolves both ends back to TICKERS and parses the figures", async () => {
    await correlations().writeCorrelations(EARLIER, PARAMETERS, [
      pair("AAAA", "BBBB", -0.812345, 1_234),
    ]);
    await correlations().writePass(EARLIER, { ...PASS, retainedPairs: 1 });

    const generation = await correlations().readNewestGeneration(EARLIER);

    // **Tickers, never ids** — `securities.id` is a row-insertion ordinal and
    // this suite's fixture deliberately assigns them in the reverse of ticker
    // order, so a read that handed back ids would be handing back a different
    // security's identity on another store.
    expect(generation?.correlations).toEqual([
      { low: "AAAA", high: "BBBB", r: -0.812345, n: 1_234 },
    ]);
    // The signed coefficient survives `numeric(18, 6)` and the `Number()`
    // parse, and the overlap survives `bigint`-as-string.
    expect(typeof generation?.correlations[0]?.r).toBe("number");
    expect(typeof generation?.correlations[0]?.n).toBe("number");
    expect(generation?.pass.observedAt).toEqual(EARLIER);
    expect(generation?.pass.parameters.feed).toBe(BASELINE_FEED);
    expect(generation?.pass.belowSignificance).toBe(PASS.belowSignificance);
  });

  it("serves the NEWEST pass at or before the instant, and only its rows", async () => {
    await correlations().writeCorrelations(LATER, PARAMETERS, [
      pair("AAAA", "CCCC", 0.5),
      pair("BBBB", "CCCC", 0.6),
    ]);
    await correlations().writePass(LATER, { ...PASS, retainedPairs: 2 });

    const newest = await correlations().readNewestGeneration(
      new Date("2026-11-04T21:00:00.000Z"),
    );

    expect(newest?.pass.observedAt).toEqual(LATER);
    expect(newest?.correlations.map((row) => `${row.low}-${row.high}`)).toEqual(
      ["AAAA-CCCC", "BBBB-CCCC"],
    );

    // And the bound is honoured rather than recorded: asked about the earlier
    // session, the earlier generation is what comes back — one row, not three.
    const earlier = await correlations().readNewestGeneration(EARLIER);

    expect(earlier?.pass.observedAt).toEqual(EARLIER);
    expect(earlier?.correlations).toHaveLength(1);
  });

  // **The partial-failure answer, driven rather than argued.** The store
  // writes its rows and then its pass row, outside a transaction, so a crash
  // between the two is reachable — and bounding the rows on the PASS row's own
  // session is what makes that state invisible instead of half-drawn.
  it("serves nothing for a session whose rows exist but whose pass row does not", async () => {
    const ORPHANED = new Date("2026-11-04T21:00:00.000Z");

    await correlations().writeCorrelations(ORPHANED, PARAMETERS, [
      pair("AAAA", "BBBB", 0.99),
    ]);

    const generation = await correlations().readNewestGeneration(ORPHANED);

    // The newest PASS row at or before that instant is `LATER`'s, so the
    // orphaned session's own row is not served at all — not under `LATER`'s
    // figures, and not on its own.
    expect(generation?.pass.observedAt).toEqual(LATER);
    expect(
      generation?.correlations.some(
        (row) => row.low === "AAAA" && row.high === "BBBB" && row.r === 0.99,
      ),
    ).toBe(false);
  });

  it("orders by `low` then `high`, so two reads of one generation agree", async () => {
    const ORDERED = new Date("2026-11-05T21:00:00.000Z");

    // Written in the wrong order on purpose.
    await correlations().writeCorrelations(ORDERED, PARAMETERS, [
      pair("BBBB", "CCCC", 0.6),
      pair("AAAA", "CCCC", 0.5),
      pair("AAAA", "BBBB", 0.4),
    ]);
    await correlations().writePass(ORDERED, { ...PASS, retainedPairs: 3 });

    const first = await correlations().readNewestGeneration(ORDERED);
    const second = await correlations().readNewestGeneration(ORDERED);

    expect(first?.correlations.map((row) => `${row.low}-${row.high}`)).toEqual([
      "AAAA-BBBB",
      "AAAA-CCCC",
      "BBBB-CCCC",
    ]);
    // Byte-comparable, which is what lets a cache hold one of these and a
    // renderer trust that two page loads draw the same picture.
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("does not filter on `securities.status`, because this is a read of what we stored", async () => {
    // `UNIVERSE.md` §12.2's second side: a security untracked this morning
    // still had a correlation that was true when it was computed. The drawn
    // graph drops the edge anyway — `withCorrelationEdges` refuses an endpoint
    // that is not a node — and that is the right place for it.
    await db().query(
      "update securities set status = 'untracked' where symbol = $1",
      ["CCCC"],
    );

    try {
      const generation = await correlations().readNewestGeneration(LATER);

      expect(
        generation?.correlations.filter((row) => row.high === "CCCC"),
      ).toHaveLength(2);
    } finally {
      await db().query(
        "update securities set status = 'active' where symbol = $1",
        ["CCCC"],
      );
    }
  });
});
