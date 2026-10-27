// `0017_session_composite_scores` and its store, against a real PostgreSQL
// server (Task 5.6.6).
//
// ## What this file is the only level that can see
//
// **Every constraint in `0017` is invisible to `pnpm verify`.** It has no
// database, by design, so an answer-shape check that does not check the shape,
// a `default now()` on `observed_at`, a partition that does not partition, an
// upsert that appends rather than converging, and a score row with no
// contributing factor are all green there and in `pnpm e2e`.
//
// Two of its assertions cannot be made anywhere else at all:
//
// **The refusal vocabulary.** `0017` §6 says the three `*_refusal_known`
// constraints hold `COMPOSITE_FACTOR_REFUSALS` — an array **derived** in
// `packages/shared` from the three lists that own each word, so that a fourth
// home for three vocabularies does not exist. That claim is a claim about the
// constraint's own text against a TypeScript array, and `pg_constraint` is the
// only place the first half lives. `market-bars.database.test.ts` makes the
// same pairing for `PROVIDER_IDS` and `MARKET_FEEDS`.
//
// **The producer/reader disagreement.** `0017` §5's whole argument is that
// storing the minted `score`, `band` and `max` beside the answers they were
// minted from makes a weight or floor rollback **detectable**. Showing that
// needs a row whose stored figures do not reproduce — which no shipped writer
// can produce, so the only way to it is an `update` against a real table.
//
// It has its own database, which is `excess-move-baselines.database.test.ts`'
// precedent. There is no `skipIf` — with no database it fails loudly in
// `beforeAll` naming `pnpm db`, because a skipped test reports green.

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  ANOMALY_BANDS,
  ANOMALY_BAND_FLOORS,
  COMPOSITE_FACTOR_REFUSALS,
  FACTOR_ANSWER_STATES,
  FACTOR_WEIGHTS,
  scoreAnomaly,
  toTicker,
} from "@marketpulse/shared";
import type { CompositeFactor, FactorAnswer } from "@marketpulse/shared";

import { loadConfig, loadEnvFile } from "./config.js";
import { runMigrations } from "./migrate.js";
import type { BaselineSubject } from "./return-baseline-store.js";
import { createSessionCompositeStore } from "./session-composite-store.js";
import type { SessionCompositeStore } from "./session-composite-store.js";

const TEST_DATABASE_NAME = "marketpulse_vitest_session_composite";

const OBSERVED_AT = new Date("2026-09-24T20:00:00.000Z");
const EARLIER = new Date("2026-09-23T20:00:00.000Z");

/** The shipped shape on every machine that exists: price and excess ranked. */
const twoFactorAnswers = (
  priceRank: number,
  excessRank: number,
): Record<CompositeFactor, FactorAnswer> => ({
  price: {
    state: "ranked",
    rank: priceRank,
    aboveSample: false,
    sampleCount: 4620,
  },
  excess: {
    state: "ranked",
    rank: excessRank,
    aboveSample: false,
    sampleCount: 4281,
  },
  volume: { state: "no-distribution" },
});

let adminPool: pg.Pool | undefined;
let testPool: pg.Pool | undefined;
let store: SessionCompositeStore | undefined;
let subject: BaselineSubject | undefined;
let other: BaselineSubject | undefined;

function db(): pg.Pool {
  if (testPool === undefined) {
    throw new Error("beforeAll did not create the test database.");
  }
  return testPool;
}

function composites(): SessionCompositeStore {
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

async function constraintDefinition(
  table: string,
  name: string,
): Promise<string> {
  const result = await db().query<{ definition: string }>(
    `select pg_get_constraintdef(oid) as definition
       from pg_constraint
      where conrelid = $1::regclass and conname = $2`,
    [table, name],
  );

  expect(result.rows, `no constraint named ${name}`).toHaveLength(1);
  return result.rows[0]?.definition ?? "";
}

/** Every single-quoted literal in a constraint definition, deduplicated. */
function literalsIn(definition: string): readonly string[] {
  return [
    ...new Set(
      [...definition.matchAll(/'([^']*)'/gu)].flatMap((match) =>
        match[1] === undefined ? [] : [match[1]],
      ),
    ),
  ].sort();
}

async function writeRow(
  who: BaselineSubject,
  observedAt: Date,
  answers: Record<CompositeFactor, FactorAnswer>,
): Promise<void> {
  await composites().writeScore(who, observedAt, {
    outcome: scoreAnomaly(answers),
    answers,
  });
}

async function writePassRow(observedAt: Date): Promise<void> {
  await composites().writePass(observedAt, {
    tracked: 501,
    scored: 485,
    unscored: 16,
  });
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
  store = createSessionCompositeStore(testPool);
});

afterAll(async () => {
  delete process.env.DATABASE_NAME;
  await testPool?.end();

  if (adminPool !== undefined) {
    await adminPool.query(`drop database if exists ${TEST_DATABASE_NAME}`);
    await adminPool.end();
  }
});

describe("the migration applies and the shape is the one `0017` describes", () => {
  it("creates both tables", async () => {
    expect(
      (await columnsOf("session_composite_scores")).length,
    ).toBeGreaterThan(0);
    expect(
      (await columnsOf("session_composite_score_passes")).length,
    ).toBeGreaterThan(0);
  });

  it("gives `observed_at` NO DEFAULT on either table", async () => {
    // `0002`'s decision 3 and `0017` §2. `default now()` on this column
    // silently turns *when it was true in the market* into *when we wrote it*,
    // on the one column a replay keys on — and every row would look plausible.
    for (const table of [
      "session_composite_scores",
      "session_composite_score_passes",
    ]) {
      const observedAt = (await columnsOf(table)).find(
        (column) => column.column_name === "observed_at",
      );

      expect(observedAt?.column_default, table).toBeNull();
      expect(observedAt?.is_nullable, table).toBe("NO");
      expect(observedAt?.udt_name, table).toBe("timestamptz");
    }
  });

  it("defaults `recorded_at` on both tables, which is the other half of the pair", async () => {
    for (const table of [
      "session_composite_scores",
      "session_composite_score_passes",
    ]) {
      const recordedAt = (await columnsOf(table)).find(
        (column) => column.column_name === "recorded_at",
      );
      expect(recordedAt?.column_default, table).toContain("now()");
    }
  });

  it("has NO approximate column of any kind, scalar or array", async () => {
    // `0017` §7's claim, and the reason `migrate.database.test.ts`' allowlist
    // gains no entry: a composite carries integers, booleans, words and
    // `numeric`, and there is no distribution in it. That assertion is an
    // **exact set equality**, so an unneeded entry would fail it exactly as a
    // missing one would.
    const approximate = [
      ...(await columnsOf("session_composite_scores")),
      ...(await columnsOf("session_composite_score_passes")),
    ].filter((column) =>
      ["float8", "float4", "_float8", "_float4"].includes(column.udt_name),
    );

    expect(approximate).toEqual([]);
  });

  it("keys the score on `(security_id, observed_at)` and the pass on the session", async () => {
    expect(
      await constraintDefinition(
        "session_composite_scores",
        "session_composite_scores_unique_score",
      ),
    ).toBe("UNIQUE (security_id, observed_at)");

    expect(
      await constraintDefinition(
        "session_composite_score_passes",
        "session_composite_score_passes_unique_session",
      ),
    ).toBe("UNIQUE (observed_at)");
  });

  it("points the one foreign key at `securities.id` with no `on delete`", async () => {
    const keys = await db().query<{ definition: string }>(
      `select pg_get_constraintdef(oid) as definition
         from pg_constraint
        where conrelid = 'session_composite_scores'::regclass
          and contype = 'f'`,
    );

    expect(keys.rows).toHaveLength(1);
    expect(keys.rows[0]?.definition).toContain("REFERENCES securities(id)");
    expect(keys.rows[0]?.definition).not.toContain("ON DELETE");
  });
});

describe("the vocabularies in the database are the ones `packages/shared` owns", () => {
  // `0017` §6, and the half of it that only a real catalogue can see. The
  // source of truth is the TypeScript union; the `check` is the database's
  // backstop against a writer that bypassed it, and these assertions are what
  // stop the two drifting.

  it("holds `COMPOSITE_FACTOR_REFUSALS` on each of the three factor groups", async () => {
    // **Derived rather than copied.** `FactorRefusal` is a union of
    // `PERCENTILE_REFUSALS`, `EXCESS_FACTOR_REFUSALS` and `VOLUME_REFUSALS`,
    // and the array this is compared against is the deduplicated spread of all
    // three — so a word added to any one of them without a migration fails
    // here, and a word added to the migration that is in none of them fails
    // here too.
    const expected = [...COMPOSITE_FACTOR_REFUSALS].sort();
    expect(expected.length).toBeGreaterThan(0);

    for (const factor of ["price", "excess", "volume"]) {
      const definition = await constraintDefinition(
        "session_composite_scores",
        `session_composite_scores_${factor}_refusal_known`,
      );
      expect(literalsIn(definition), factor).toEqual(expected);
    }
  });

  it("holds `FACTOR_ANSWER_STATES` on each group's shape check", async () => {
    const expected = [...FACTOR_ANSWER_STATES].sort();

    for (const factor of ["price", "excess", "volume"]) {
      const definition = await constraintDefinition(
        "session_composite_scores",
        `session_composite_scores_${factor}_answer_shape`,
      );
      expect(literalsIn(definition), factor).toEqual(expected);
    }
  });

  it("holds `ANOMALY_BANDS` on the band check", async () => {
    expect(
      literalsIn(
        await constraintDefinition(
          "session_composite_scores",
          "session_composite_scores_band_known",
        ),
      ),
    ).toEqual([...ANOMALY_BANDS].sort());
  });
});

describe("a row is a SCORE, and the constraints say what one is", () => {
  /** A raw insert, so a plant the store refuses can still reach the table. */
  async function insertRaw(
    overrides: Readonly<Record<string, string>>,
  ): Promise<void> {
    const columns: Record<string, string> = {
      security_id: probe().id,
      observed_at: `'${OBSERVED_AT.toISOString()}'`,
      score: "60",
      band: "'elevated'",
      max: "75",
      price_state: "'ranked'",
      price_rank: "99",
      price_above_sample: "false",
      price_sample_count: "4620",
      excess_state: "'ranked'",
      excess_rank: "60",
      excess_above_sample: "false",
      excess_sample_count: "4281",
      volume_state: "'no-distribution'",
      ...overrides,
    };

    await db().query(
      `insert into session_composite_scores
         (${Object.keys(columns).join(", ")})
       values (${Object.values(columns).join(", ")})`,
    );
  }

  it("refuses a row in which no factor contributed", async () => {
    // `0017` §4. `AnomalyScore.contributing` is a non-empty tuple, so a score
    // with no contributing factor is untypeable one layer up; this is the same
    // statement where a `null` cannot sneak past a type. An unscored security
    // is recorded by the ABSENCE of a row and counted on the pass.
    await expect(
      insertRaw({
        price_state: "'refused'",
        price_rank: "null",
        price_above_sample: "null",
        price_refusal: "'no-subject-move'",
        price_minimum_sample_count: "2500",
        excess_state: "'refused'",
        excess_rank: "null",
        excess_above_sample: "null",
        excess_refusal: "'too-few-samples'",
        excess_minimum_sample_count: "2500",
        score: "0",
        band: "'normal'",
        max: "1",
      }),
    ).rejects.toThrow(/one_factor_contributes/u);
  });

  it("refuses a RANKED factor with no rank, and a refusal with no bound", async () => {
    // The arms differ in **shape** and a row cannot, so the shape is a check.
    // Without it a `ranked` factor with a null rank is insertable, and the
    // store's mapper would drop the row — a silent loss of a security from a
    // ranked list, which is the one direction a ranking may not err in without
    // saying so.
    await expect(insertRaw({ price_rank: "null" })).rejects.toThrow(
      /price_answer_shape/u,
    );

    await expect(
      insertRaw({
        excess_state: "'refused'",
        excess_rank: "null",
        excess_above_sample: "null",
        excess_refusal: "'too-few-samples'",
      }),
    ).rejects.toThrow(/excess_answer_shape/u);
  });

  it("refuses a payload on the payload-free arm", async () => {
    // `no-distribution` carries nothing: an answer with a payload here would
    // be a second answer to a question the `return` frame's `volume` half
    // already answers.
    await expect(insertRaw({ volume_rank: "40" })).rejects.toThrow(
      /volume_answer_shape/u,
    );
  });

  it("refuses `0` as a RANKED factor's sample and accepts it on a refusal", async () => {
    await expect(insertRaw({ price_sample_count: "0" })).rejects.toThrow(
      /samples_well_formed/u,
    );

    await expect(
      insertRaw({
        excess_state: "'refused'",
        excess_rank: "null",
        excess_above_sample: "null",
        excess_sample_count: "0",
        excess_refusal: "'too-few-samples'",
        excess_minimum_sample_count: "2500",
        score: "40",
        max: "40",
      }),
    ).resolves.toBeUndefined();

    await db().query("delete from session_composite_scores");
  });

  it("refuses a rank of 100 and a score above its own maximum", async () => {
    await expect(insertRaw({ price_rank: "100" })).rejects.toThrow(
      /ranks_in_range/u,
    );
    await expect(insertRaw({ score: "76" })).rejects.toThrow(/score_in_range/u);
  });

  it("refuses a refusal word no vocabulary holds", async () => {
    await expect(
      insertRaw({
        excess_state: "'refused'",
        excess_rank: "null",
        excess_above_sample: "null",
        excess_refusal: "'nearly-enough-samples'",
        excess_minimum_sample_count: "2500",
        score: "40",
        max: "40",
      }),
    ).rejects.toThrow(/excess_refusal_known/u);
  });
});

describe("the pass row carries the populations and the POLICY", () => {
  it("refuses populations that do not partition", async () => {
    await expect(
      db().query(
        `insert into session_composite_score_passes
           (observed_at, tracked_count, scored_count, unscored_count,
            price_weight, excess_weight, volume_weight,
            elevated_floor, high_floor, extreme_floor)
         values ('${OBSERVED_AT.toISOString()}', 501, 485, 15, 40, 35, 25,
                 32, 63, 73)`,
      ),
    ).rejects.toThrow(/populations_partition/u);
  });

  it("refuses weights that do not sum to 100 and floors that do not ascend", async () => {
    // Both are the same claim from two sides: *"the price term contributed 38
    // of its 40"* needs the weight to be the term's own maximum in the score's
    // own unit, and equal floors delete a band word from the vocabulary
    // silently.
    for (const [weights, floors, pattern] of [
      ["40, 35, 20", "32, 63, 73", /weights_sum_to_100/u],
      ["40, 35, 25", "32, 73, 73", /floors_ascend/u],
    ] as const) {
      await expect(
        db().query(
          `insert into session_composite_score_passes
             (observed_at, tracked_count, scored_count, unscored_count,
              price_weight, excess_weight, volume_weight,
              elevated_floor, high_floor, extreme_floor)
           values ('${OBSERVED_AT.toISOString()}', 501, 485, 16, ${weights},
                   ${floors})`,
        ),
      ).rejects.toThrow(pattern);
    }
  });

  it("stores what the SCORER applied, read from the one home each half has", async () => {
    // `0017` §5. The store takes no weights and no floors as arguments,
    // because what must be stored is what the **minting** applied — and the
    // minting is `scoreAnomaly`'s, which reads those two constants and no
    // others. A parameter would let a caller store a policy the scorer did not
    // use, which is the one failure this column group exists to detect.
    await writePassRow(OBSERVED_AT);

    const held = await composites().readNewestSession(OBSERVED_AT);

    expect(held?.pass.weights).toEqual(FACTOR_WEIGHTS);
    expect(held?.pass.floors).toEqual(ANOMALY_BAND_FLOORS);
    expect(held?.pass.tracked).toBe(501);
    expect(held?.pass.scored).toBe(485);
    expect(held?.pass.unscored).toBe(16);

    await db().query("delete from session_composite_score_passes");
  });
});

describe("the store", () => {
  it("converges on a re-run rather than appending", async () => {
    // `pnpm baselines`' own property: this table is derived and recomputable,
    // so a second pass over a session already stored updates both rows.
    await writeRow(probe(), OBSERVED_AT, twoFactorAnswers(99, 60));
    await writeRow(probe(), OBSERVED_AT, twoFactorAnswers(50, 50));
    await writePassRow(OBSERVED_AT);
    await writePassRow(OBSERVED_AT);

    const rows = await db().query<{ n: string }>(
      "select count(*)::text as n from session_composite_scores",
    );
    const passes = await db().query<{ n: string }>(
      "select count(*)::text as n from session_composite_score_passes",
    );

    expect(rows.rows[0]?.n).toBe("1");
    expect(passes.rows[0]?.n).toBe("1");

    const held = await composites().readNewestSession(OBSERVED_AT);
    expect(held?.scores[0]?.answers.price).toEqual({
      state: "ranked",
      rank: 50,
      aboveSample: false,
      sampleCount: 4620,
    });
  });

  it("MINTS the score it returns from the row's own factor answers", async () => {
    // The module's whole point, and `a-stored-composite-is-minted-from-its-
    // answers` in `pnpm invariants` is the structural half. Here it is the
    // behavioural half: `round(40 × 99 / 100) + round(35 × 60 / 100)` is
    // `40 + 21 = 61`, which the store reaches by addition rather than by
    // reading a column.
    await db().query("delete from session_composite_scores");
    await writeRow(probe(), OBSERVED_AT, twoFactorAnswers(99, 60));

    const held = await composites().readNewestSession(OBSERVED_AT);
    const outcome = held?.scores[0]?.outcome;

    expect(outcome?.scored).toBe(true);
    if (!outcome?.scored) return;

    expect(outcome.score).toBe(61);
    expect(outcome.max).toBe(75);
    expect(outcome.band).toBe("elevated");
    expect(outcome.contributing.map((clause) => clause.factor)).toEqual([
      "price",
      "excess",
    ]);
    expect(outcome.absent.map((clause) => clause.state)).toEqual([
      "no-distribution",
    ]);
    expect(held?.disagreed).toBe(0);
  });

  it("DROPS and counts a row whose stored score does not reproduce", async () => {
    // **`0017` §5's argument, demonstrated rather than asserted**, and the one
    // assertion in this story nothing but a real table can make: no shipped
    // writer can produce this row, because the store mints what it writes. A
    // rollback that put the runner and a reader two weight sets apart would,
    // and the point of storing the minted figures is that it would then be
    // visible rather than drawn.
    await db().query("delete from session_composite_scores");
    await writeRow(probe(), OBSERVED_AT, twoFactorAnswers(99, 60));
    await writeRow(second(), OBSERVED_AT, twoFactorAnswers(10, 10));
    await db().query(
      `update session_composite_scores set score = 61 - 7
        where security_id = ${probe().id}`,
    );

    const held = await composites().readNewestSession(OBSERVED_AT);

    expect(held?.disagreed).toBe(1);
    expect(held?.scores.map((score) => score.symbol)).toEqual([
      second().symbol,
    ]);
  });

  it("drops a row whose stored BAND disagrees, which no weight change would move", async () => {
    // All three stored figures are compared rather than one: a weight change
    // moves `score` and `max`, a floor change moves `band` alone, and the
    // point of storing them is to catch either.
    await db().query("delete from session_composite_scores");
    await writeRow(probe(), OBSERVED_AT, twoFactorAnswers(99, 60));
    await db().query(
      `update session_composite_scores set band = 'high'
        where security_id = ${probe().id}`,
    );

    const held = await composites().readNewestSession(OBSERVED_AT);

    expect(held?.disagreed).toBe(1);
    expect(held?.scores).toEqual([]);
  });

  it("bounds the scores on the PASS row's session, so a crashed pass is invisible", async () => {
    // The pass writes one score per security as it goes and the pass row at
    // the end, outside a transaction, so a crash leaves scores with no pass
    // row. `readNewestSession` reads the pass row first and bounds the scores
    // on **its** `observed_at`, which makes that state invisible rather than
    // one session's scores served under another session's figures.
    await db().query("delete from session_composite_scores");
    await db().query("delete from session_composite_score_passes");

    // Tonight's scores, written; tonight's pass row, never reached.
    await writeRow(probe(), OBSERVED_AT, twoFactorAnswers(99, 60));
    // Last night's complete pass.
    await writeRow(probe(), EARLIER, twoFactorAnswers(10, 10));
    await writePassRow(EARLIER);

    const held = await composites().readNewestSession(OBSERVED_AT);

    expect(held?.pass.observedAt.toISOString()).toBe(EARLIER.toISOString());
    expect(held?.scores[0]?.answers.price).toEqual({
      state: "ranked",
      rank: 10,
      aboveSample: false,
      sampleCount: 4620,
    });
  });

  it("answers `undefined` where no pass has been written at or before the bound", async () => {
    // CI's permanent state: 516 securities, zero bars, no nightly runner.
    expect(
      await composites().readNewestSession(new Date("2026-01-01T00:00:00Z")),
    ).toBeUndefined();
  });

  it("refuses to write an unscored outcome rather than letting the database name a constraint", async () => {
    // `0017` §4 in the one place a type cannot hold it: `AnomalyOutcome` is the
    // union, so a caller holding one has to be told in a sentence rather than
    // by a constraint name.
    const absent: Record<CompositeFactor, FactorAnswer> = {
      price: {
        state: "refused",
        refusal: "no-subject-move",
        sampleCount: 0,
        minimumSampleCount: 2500,
      },
      excess: {
        state: "refused",
        refusal: "too-few-samples",
        sampleCount: 0,
        minimumSampleCount: 2500,
      },
      volume: { state: "no-distribution" },
    };

    await expect(
      composites().writeScore(probe(), OBSERVED_AT, {
        outcome: scoreAnomaly(absent),
        answers: absent,
      }),
    ).rejects.toThrow(/unscored_count/u);
  });

  it("round-trips a refused and an inapplicable factor beside a ranked one", async () => {
    // The three arms a stored row can hold beside `ranked`, through the
    // columns and back. `inapplicable` cannot reach this table from the pass —
    // the fifteen non-equities are not scored — but the column group is one
    // shape and the reader has to be right about all four arms.
    await db().query("delete from session_composite_scores");
    await db().query("delete from session_composite_score_passes");

    const answers: Record<CompositeFactor, FactorAnswer> = {
      price: {
        state: "ranked",
        rank: 80,
        aboveSample: true,
        sampleCount: 737,
      },
      excess: { state: "inapplicable", because: "is-benchmark" },
      volume: { state: "no-distribution" },
    };

    await writeRow(probe(), OBSERVED_AT, answers);
    await writePassRow(OBSERVED_AT);

    const held = await composites().readNewestSession(OBSERVED_AT);

    expect(held?.scores[0]?.answers).toEqual(answers);
    expect(held?.disagreed).toBe(0);

    const outcome = held?.scores[0]?.outcome;
    if (!outcome?.scored) {
      expect.fail("the round-tripped row did not score");
      return;
    }
    expect(outcome.score).toBe(32);
    expect(outcome.max).toBe(40);
  });
});
