// The volume baseline against a **hand-built two-tape store** (Task 5.5.3).
//
// ## Why this file exists at all, and what it is the only level that can see
//
// **This is the one level at which two rows for one minute exist.** Every
// machine this suite will ever run on except Azure holds **zero `iex` rows** —
// `live-bar-writer.ts` only runs where a provider is configured — so on CI's
// store and on every laptop the volume baseline refuses for every security, and
// a dropped `feed` predicate is invisible to `pnpm verify`, to `pnpm e2e` and
// to the pass's own summary. `volume-baseline.test.ts` cannot see it either: a
// map of minute volumes has no tape in it at all.
//
// The fixture is chosen so a feed-blind read is wrong by **four orders of
// magnitude** rather than by a rounding error:
//
//   session 2026-09-23              sip          iex
//     minute   0              9,000,000          100
//     minute   1              9,000,000          300
//     minute   2              9,000,000            —
//     minute   3                      —            0   ← a ZERO-volume bar
//     minute   5                      —          900   ← bucket 1
//     minute 395 (after hours)        —       50,000   ← no bucket at all
//   session 2026-09-24
//     minute   0                      —          500
//     minute   1                      —          700
//
//   bucket 0, `iex`      [0, 100, 300, 500, 700]   median      300
//   bucket 0, `sip`      [9M, 9M, 9M]              median  9,000,000
//
// Five of those rows are each a defect somebody would otherwise ship:
//
//   1. **The three `sip` rows at 9,000,000.** A read without the `feed`
//      predicate keys a map on the instant with no tie-break, takes whichever
//      row the planner returned, and produces a median **30,000×** too large
//      from a query that typechecks, lints and runs. That is the plant behind
//      `the-volume-baseline-reads-one-tape-by-name`.
//   2. **The `sip`-only minute 2.** A feed-blind read holds **8** minutes where
//      the tape-aware one holds 7, which is the count that separates them
//      without looking at a volume at all.
//   3. **The zero-volume `iex` bar at minute 3.** It is a **sample** — a bar
//      with no shares in it is a thing the vendor sends and is a measurement —
//      while the absent `iex` bar at minute 2 is not one. `Number(null)` is
//      `0`, which is AC 4's whole distinction.
//   4. **The single sample in bucket 1.** Its relative standard error is `null`
//      rather than `0`: a bucket with no measurable spread has unknown
//      precision, and a `0` there would pass the floor at any depth.
//   5. **The after-hours bar at minute 395.** The grid is over the **regular**
//      session, so it is read and then placed nowhere — `sampleCount` is 6 and
//      not 7.
//
// It has its own database — `session-return-percentiles.database.test.ts`'
// precedent, and `volume-share.database.test.ts`' — because that file's fixture
// asserts `iex = 1` over its window and seeding volume into it would break its
// own claims. There is no `skipIf`: with no database it fails loudly in
// `beforeAll` naming `pnpm db`, because a skipped test reports green.

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  BASELINE_LOOKBACK_SESSIONS,
  marketSessionOn,
  toMarketDate,
  toTicker,
  toTimeRange,
  type MarketSession,
} from "@marketpulse/shared";

import { loadConfig, loadEnvFile } from "./config.js";
import { runMigrations } from "./migrate.js";
import { SAMPLE_SPAN_MINUTES } from "./return-baseline.js";
import type { BaselineSubject } from "./return-baseline-store.js";
import {
  TARGET_RELATIVE_STANDARD_ERROR,
  VOLUME_BASELINE_FEED,
  volumeBaselineOf,
} from "./volume-baseline.js";
import { createVolumeBaselineStore } from "./volume-baseline-store.js";
import type { VolumeBaselineStore } from "./volume-baseline-store.js";

const TEST_DATABASE_NAME = "marketpulse_vitest_volume_baseline";

const FIRST = session("2026-09-23");
const SECOND = session("2026-09-24");

/** The pass's own range shape: the first session's open to the last's close. */
const WINDOW = toTimeRange(FIRST.open, SECOND.close);

/** The generation's key instant — the window's end. */
const OBSERVED_AT = SECOND.close;

const PARAMETERS = {
  lookbackSessions: BASELINE_LOOKBACK_SESSIONS,
  bucketMinutes: SAMPLE_SPAN_MINUTES,
};

const MS_PER_MINUTE = 60_000;

function session(date: string): MarketSession {
  const found = marketSessionOn(toMarketDate(date));
  if (found === undefined) {
    throw new Error(`${date} is not a trading session; the fixture is wrong.`);
  }
  return found;
}

function minute(one: MarketSession, offset: number): Date {
  return new Date(one.open.getTime() + offset * MS_PER_MINUTE);
}

let adminPool: pg.Pool | undefined;
let testPool: pg.Pool | undefined;
let store: VolumeBaselineStore | undefined;
let subject: BaselineSubject | undefined;
let other: BaselineSubject | undefined;

function db(): pg.Pool {
  if (testPool === undefined) {
    throw new Error("beforeAll did not create the test database.");
  }
  return testPool;
}

function baselines(): VolumeBaselineStore {
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

function splitProbe(): BaselineSubject {
  if (other === undefined) {
    throw new Error("beforeAll did not insert the second security.");
  }
  return other;
}

async function insertBar(
  securityId: string,
  observedAt: Date,
  volume: number,
  feed: "sip" | "iex",
): Promise<void> {
  await db().query(
    `insert into market_bars
       (security_id, timeframe, observed_at, open, high, low, close, volume, feed)
     values ($1, '1m', $2, 100, 100, 100, 100, $3, $4)`,
    [securityId, observedAt, volume, feed],
  );
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

/** The row the store wrote, as `information_schema` and `pg` hand it back. */
interface StoredRow {
  readonly feed: string;
  readonly lookback_sessions: number;
  readonly bucket_minutes: number;
  readonly bucket_count: string;
  readonly sample_count: string;
  readonly bucket_medians: (number | null)[] | null;
  readonly bucket_samples: string[] | null;
  readonly bucket_errors: (number | null)[] | null;
  readonly refusal: string | null;
}

async function readRow(securityId: string): Promise<StoredRow | undefined> {
  const rows = await db().query<StoredRow>(
    `select feed, lookback_sessions, bucket_minutes, bucket_count::text,
            sample_count::text, bucket_medians, bucket_samples::text[],
            bucket_errors, refusal
       from volume_baselines
      where security_id = $1 and observed_at = $2`,
    [securityId, OBSERVED_AT],
  );
  return rows.rows[0];
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
  store = createVolumeBaselineStore(testPool);

  const id = probe().id;

  // The table at the head of this file, in order.
  await insertBar(id, minute(FIRST, 0), 9_000_000, "sip");
  await insertBar(id, minute(FIRST, 0), 100, "iex");
  await insertBar(id, minute(FIRST, 1), 9_000_000, "sip");
  await insertBar(id, minute(FIRST, 1), 300, "iex");
  await insertBar(id, minute(FIRST, 2), 9_000_000, "sip");
  await insertBar(id, minute(FIRST, 3), 0, "iex");
  await insertBar(id, minute(FIRST, 5), 900, "iex");
  await insertBar(id, minute(FIRST, 395), 50_000, "iex");
  await insertBar(id, minute(SECOND, 0), 500, "iex");
  await insertBar(id, minute(SECOND, 1), 700, "iex");
});

afterAll(async () => {
  delete process.env.DATABASE_NAME;
  await testPool?.end();

  if (adminPool !== undefined) {
    await adminPool.query(`drop database if exists ${TEST_DATABASE_NAME}`);
    await adminPool.end();
  }
});

describe("readWindowVolumes — the tape predicate, in the query's own `where`", () => {
  it("answers ONLY `iex` minutes, and the count alone separates it from a feed-blind read", async () => {
    const volumes = await baselines().readWindowVolumes(probe(), WINDOW);

    // Seven `iex` minutes inside the range. A read with no `feed` predicate
    // holds **eight** — minute 2 is `sip`-only — which is defect 2 at the head
    // of this file, visible without looking at a volume.
    expect(volumes.size).toBe(7);
    expect(volumes.has(minute(FIRST, 2).getTime())).toBe(false);
  });

  it("takes the `iex` volume and NOT whichever row the planner returned", async () => {
    // Defect 1. A `Map` keyed on the instant with no tie-break is the shape a
    // re-implementer writes, and on these two rows it is wrong by 90,000× for
    // one minute and 30,000× for the bucket's median.
    const volumes = await baselines().readWindowVolumes(probe(), WINDOW);

    expect(volumes.get(minute(FIRST, 0).getTime())).toBe(100);
    expect(volumes.get(minute(FIRST, 1).getTime())).toBe(300);
    expect([...volumes.values()]).not.toContain(9_000_000);
  });

  it("keeps a zero-volume bar as a sample and parses a `bigint` into a number", async () => {
    // Defect 3, and the half that `Number("")` is `0` cannot be told from.
    const volumes = await baselines().readWindowVolumes(probe(), WINDOW);

    expect(volumes.get(minute(FIRST, 3).getTime())).toBe(0);
    for (const value of volumes.values()) expect(typeof value).toBe("number");
  });
});

describe("the written generation", () => {
  it("stores three aligned arrays with the grid's arity, and the tape in the key", async () => {
    const volumes = await baselines().readWindowVolumes(probe(), WINDOW);
    const outcome = volumeBaselineOf({
      sessions: [FIRST, SECOND],
      volumes,
      priceRefusal: null,
    });

    expect(outcome.kind).toBe("measured");
    if (outcome.kind !== "measured") return;

    // Defect 5: the after-hours bar is read and placed nowhere.
    expect(outcome.sampleCount).toBe(6);

    await baselines().writeBaseline(probe(), OBSERVED_AT, PARAMETERS, outcome);

    const row = await readRow(probe().id);
    expect(row?.feed).toBe(VOLUME_BASELINE_FEED);
    expect(row?.refusal).toBeNull();
    expect(row?.bucket_count).toBe("78");
    expect(row?.sample_count).toBe("6");
    expect(row?.lookback_sessions).toBe(BASELINE_LOOKBACK_SESSIONS);
    expect(row?.bucket_minutes).toBe(SAMPLE_SPAN_MINUTES);

    // The arity constraint's own subject: three arrays that can disagree in
    // length is a bucket index meaning a different time of day in each.
    expect(row?.bucket_medians).toHaveLength(78);
    expect(row?.bucket_samples).toHaveLength(78);
    expect(row?.bucket_errors).toHaveLength(78);

    // Bucket 0 pooled across both sessions — [0, 100, 300, 500, 700].
    expect(row?.bucket_medians?.[0]).toBe(300);
    expect(row?.bucket_samples?.[0]).toBe("5");
    expect(row?.bucket_errors?.[0]).not.toBeNull();

    // Defect 4: one sample has no measurable spread, so its precision is
    // `null` — unknown — rather than `0`.
    expect(row?.bucket_medians?.[1]).toBe(900);
    expect(row?.bucket_samples?.[1]).toBe("1");
    expect(row?.bucket_errors?.[1]).toBeNull();

    // A bucket with no sample at all: `null` median beside a counted `0`,
    // which is what tells it from a bucket holding too few.
    expect(row?.bucket_medians?.[2]).toBeNull();
    expect(row?.bucket_samples?.[2]).toBe("0");
  });

  it("converges on a re-run rather than appending", async () => {
    // `pnpm universe`'s property, for `0015` §1's reason: this table is derived
    // and recomputable.
    const volumes = await baselines().readWindowVolumes(probe(), WINDOW);
    const outcome = volumeBaselineOf({
      sessions: [FIRST, SECOND],
      volumes,
      priceRefusal: null,
    });

    await baselines().writeBaseline(probe(), OBSERVED_AT, PARAMETERS, outcome);
    await baselines().writeBaseline(probe(), OBSERVED_AT, PARAMETERS, outcome);

    const rows = await db().query<{ count: string }>(
      "select count(*)::text as count from volume_baselines where security_id = $1",
      [probe().id],
    );
    expect(rows.rows[0]?.count).toBe("1");
  });

  it("writes a refusal with no buckets at all, which the database enforces", async () => {
    // `volume_baselines_one_answer`: *buckets and a refusal* and *neither* are
    // both unrepresentable. Writing a refusal beside stale buckets is exactly
    // the shape that would print a split-poisoned multiple for 60 sessions.
    const volumes = await baselines().readWindowVolumes(probe(), WINDOW);
    const refused = volumeBaselineOf({
      sessions: [FIRST, SECOND],
      volumes,
      priceRefusal: "split-discontinuity",
    });

    expect(refused.kind).toBe("refused");
    await baselines().writeBaseline(
      splitProbe(),
      OBSERVED_AT,
      PARAMETERS,
      refused,
    );

    const row = await readRow(splitProbe().id);
    expect(row?.refusal).toBe("split-discontinuity");
    expect(row?.bucket_medians).toBeNull();
    expect(row?.bucket_samples).toBeNull();
    expect(row?.bucket_errors).toBeNull();
    // *How much we had* is the first question asked of a refusal.
    expect(row?.sample_count).toBe("6");
  });

  it("refuses to write `none`, because an absent row is a different fact", async () => {
    // The reader is told `no-same-tape-baseline`. A row saying nothing would
    // claim we hold a volume baseline position for a security we have never
    // heard IEX for.
    await expect(
      baselines().writeBaseline(
        probe(),
        OBSERVED_AT,
        PARAMETERS,
        volumeBaselineOf({
          sessions: [FIRST],
          volumes: new Map(),
          priceRefusal: null,
        }),
      ),
    ).rejects.toThrow(/no-same-tape-baseline/u);
  });
});

describe("the constraints the database holds rather than the writer", () => {
  it("refuses three arrays that disagree in length", async () => {
    await expect(
      db().query(
        `insert into volume_baselines
           (security_id, observed_at, feed, lookback_sessions, bucket_minutes,
            bucket_count, sample_count, bucket_medians, bucket_samples,
            bucket_errors, refusal)
         values ($1, $2, 'iex', 60, 5, 3, 9,
                 '{1,2,3}'::double precision[], '{1,2}'::bigint[],
                 '{0.1,0.1,0.1}'::double precision[], null)`,
        [probe().id, FIRST.close],
      ),
    ).rejects.toThrow(/volume_baselines_bucket_arity/u);
  });

  it("refuses medians with no counts beside them", async () => {
    await expect(
      db().query(
        `insert into volume_baselines
           (security_id, observed_at, feed, lookback_sessions, bucket_minutes,
            bucket_count, sample_count, bucket_medians, bucket_samples,
            bucket_errors, refusal)
         values ($1, $2, 'iex', 60, 5, 1, 9,
                 '{1}'::double precision[], null,
                 '{0.1}'::double precision[], null)`,
        [probe().id, FIRST.close],
      ),
    ).rejects.toThrow(/volume_baselines_arrays_agree/u);
  });

  it("refuses a stored generation with zero samples", async () => {
    // A security the pass found no `iex` minute for has no row at all, so a
    // stored `sample_count` of zero would be a generation claiming to describe
    // a tape it never heard.
    await expect(
      db().query(
        `insert into volume_baselines
           (security_id, observed_at, feed, lookback_sessions, bucket_minutes,
            bucket_count, sample_count, bucket_medians, bucket_samples,
            bucket_errors, refusal)
         values ($1, $2, 'iex', 60, 5, 1, 0,
                 '{1}'::double precision[], '{1}'::bigint[],
                 '{0.1}'::double precision[], null)`,
        [probe().id, FIRST.close],
      ),
    ).rejects.toThrow(/volume_baselines_sample_count_positive/u);
  });

  it("refuses an `observed_at` the writer did not supply", async () => {
    // `0015` §2 and `0002`'s decision 3: a `default now()` on the column a
    // replay keys on turns *when the window ended* into *when a script ran*.
    await expect(
      db().query(
        `insert into volume_baselines
           (security_id, feed, lookback_sessions, bucket_minutes,
            bucket_count, sample_count, bucket_medians, bucket_samples,
            bucket_errors, refusal)
         values ($1, 'iex', 60, 5, 1, 9,
                 '{1}'::double precision[], '{1}'::bigint[],
                 '{0.1}'::double precision[], null)`,
        [probe().id],
      ),
    ).rejects.toThrow(/observed_at/u);
  });

  it("refuses a refusal word outside the stored vocabulary", async () => {
    await expect(
      db().query(
        `insert into volume_baselines
           (security_id, observed_at, feed, lookback_sessions, bucket_minutes,
            bucket_count, sample_count, bucket_medians, bucket_samples,
            bucket_errors, refusal)
         values ($1, $2, 'iex', 60, 5, 1, 9, null, null, null,
                 'too-few-sessions')`,
        [probe().id, FIRST.close],
      ),
    ).rejects.toThrow(/volume_baselines_refusal_known/u);
  });
});

describe("the companion pass row", () => {
  it("records the populations, which partition, and what the pass applied", async () => {
    // ADR 0044's own generalisation: the absence of rows is indistinguishable
    // from the absence of a pass — and on the `iex` tape an empty
    // `volume_baselines` is the ordinary state for weeks.
    await baselines().writePass(OBSERVED_AT, {
      tracked: 516,
      measured: 1,
      splitDiscontinuity: 1,
      absent: 514,
      buckets: {
        total: 2,
        measured: 0,
        tooFewSessions: 2,
        zeroVolume: 0,
        empty: 76,
      },
      parameters: PARAMETERS,
      targetRelativeStandardError: TARGET_RELATIVE_STANDARD_ERROR,
    });

    const rows = await db().query<Record<string, string | number>>(
      `select feed, tracked_count::text, measured_count::text,
              split_discontinuity_count::text, absent_count::text,
              bucket_count::text, measured_bucket_count::text,
              too_few_sessions_bucket_count::text,
              zero_volume_bucket_count::text, empty_bucket_count::text,
              lookback_sessions, bucket_minutes,
              target_relative_standard_error
         from volume_baseline_passes where observed_at = $1`,
      [OBSERVED_AT],
    );

    const row = rows.rows[0];
    expect(row?.feed).toBe(VOLUME_BASELINE_FEED);
    expect(row?.tracked_count).toBe("516");
    expect(row?.absent_count).toBe("514");
    expect(row?.empty_bucket_count).toBe("76");
    // `numeric(18, 6)`, so a **string** on the wire — the migration's §6 says
    // why this is not a `double precision`, and the figure is exact at six
    // decimal places either way.
    expect(Number(row?.target_relative_standard_error)).toBe(
      TARGET_RELATIVE_STANDARD_ERROR,
    );
  });

  it("refuses populations that do not partition", async () => {
    // `volume_baseline_passes_securities_partition`. A pass that died mid-loop
    // writes counts that do not sum, and the readable state is no pass row at
    // all rather than a session drawn under figures nobody can subtract.
    await expect(
      db().query(
        `insert into volume_baseline_passes
           (observed_at, feed, tracked_count, measured_count,
            split_discontinuity_count, absent_count, bucket_count,
            measured_bucket_count, too_few_sessions_bucket_count,
            zero_volume_bucket_count, empty_bucket_count,
            lookback_sessions, bucket_minutes, target_relative_standard_error)
         values ($1, 'iex', 516, 1, 1, 1, 0, 0, 0, 0, 0, 60, 5, 0.05)`,
        [FIRST.close],
      ),
    ).rejects.toThrow(/volume_baseline_passes_securities_partition/u);
  });

  it("refuses bucket populations that do not partition", async () => {
    await expect(
      db().query(
        `insert into volume_baseline_passes
           (observed_at, feed, tracked_count, measured_count,
            split_discontinuity_count, absent_count, bucket_count,
            measured_bucket_count, too_few_sessions_bucket_count,
            zero_volume_bucket_count, empty_bucket_count,
            lookback_sessions, bucket_minutes, target_relative_standard_error)
         values ($1, 'iex', 2, 1, 0, 1, 10, 1, 1, 1, 0, 60, 5, 0.05)`,
        [FIRST.close],
      ),
    ).rejects.toThrow(/volume_baseline_passes_buckets_partition/u);
  });
});
