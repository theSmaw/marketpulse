// IEX's share of volume against a **hand-built two-tape store** (Task 5.5.2).
//
// ## Why this file exists at all, and what it is the only level that can see
//
// **This is the one level at which two rows for one minute exist.** Every
// machine this suite will ever run on except Azure holds **zero `iex` rows** —
// `live-bar-writer.ts` only runs where a provider is configured — so on CI's
// store and on every laptop the whole volume block refuses, and a defect in the
// arithmetic between two tapes is invisible to `pnpm verify`, to `pnpm e2e` and
// to the route itself.
//
// `return-baselines.database.test.ts` already inserts **one** `iex` bar, to
// catch a dropped `feed` predicate on a *close*. What no suite in this
// repository has ever built is a store where the same minutes hold **both
// tapes with different volumes**, which is the only shape in which the two
// ratios differ at all. So the figures below are chosen to be checkable by
// hand rather than reproduced from a run:
//
//   session 2026-09-23 (exposed)        sip      iex     per-minute ratio
//     minute  0                        1,000      100               0.10
//     minute  1                        1,000      300               0.30
//     minute  2                        1,000        —                  —
//     minute  3                        1,000        —                  —
//     minute 10                            —  500,000                  —
//     30 minutes before the open           —    7,000                  —
//   session 2026-09-22 (BEFORE the cutoff)
//     minute  0                        9,000        —                  —
//
//   Σsip over exposed sip minutes                 4,000
//   Σsip over two-tape minutes                    2,000
//   Σiex over two-tape minutes                      400
//   bias   = 400 / 4,000                           0.10
//   share  = 400 / 2,000                           0.20
//   volume exposure = 2,000 / 4,000                0.50
//   and 0.20 × 0.50 = 0.10, which is the identity the body claims
//
// Four of those rows are each a defect somebody would otherwise ship:
//
//   1. **The two minutes with no `iex` row.** They are `0` in the bias and
//      **not a sample** in the per-minute distribution (AC 4). Fold them in as
//      `0.0` and the median moves from 0.20 to 0.05.
//   2. **The `iex`-only minute at 500,000 shares.** It has no denominator — it
//      is pre-market, after-hours, or a minute the consolidated tape has not
//      reconciled — so it is in neither ratio. Count it and `iexVolume` is
//      1,251× what it should be.
//   3. **The 9,000-share `sip` minute on 2026-09-22.** An `iex` row cannot
//      exist for a session before the live writer did, so including that
//      session in the denominator measures *how much history we store*. Drop
//      the cutoff and the bias reads 0.031 rather than 0.10.
//   4. **The extended-hours `iex` bar.** The baseline's buckets are a grid over
//      the **regular** session, so a minute outside one belongs in no bucket;
//      it is counted and reported separately rather than silently placed.
//
// It has its own database — `session-return-percentiles.database.test.ts`'
// precedent — because the fixture in `return-baselines.database.test.ts`
// asserts `iex = 1` over its window and seeding volume into it would break that
// file's own claims. There is no `skipIf`: with no database it fails loudly in
// `beforeAll` naming `pnpm db`, because a skipped test reports green.

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  marketSessionOn,
  toMarketDate,
  toTicker,
  toTimeRange,
  type MarketSession,
} from "@marketpulse/shared";

import { readBaselineCost } from "./baseline-cost.js";
import { loadConfig, loadEnvFile } from "./config.js";
import { runMigrations } from "./migrate.js";
import { createReturnBaselineStore } from "./return-baseline-store.js";
import type { ReturnBaselineStore } from "./return-baseline-store.js";
import {
  LIVE_WRITER_FIRST_SESSION,
  volumeDispersionOf,
} from "./volume-share.js";

const TEST_DATABASE_NAME = "marketpulse_vitest_volume";

/** The first session an `iex` row can exist for, and the one before it. */
const EXPOSED = session("2026-09-23");
const BEFORE = session("2026-09-22");

/** The read's bound: both sessions, so the cutoff has something to exclude. */
const WINDOW = toTimeRange(BEFORE.open, EXPOSED.close);

const MS_PER_MINUTE = 60_000;

function session(date: string): MarketSession {
  const found = marketSessionOn(toMarketDate(date));
  if (found === undefined) {
    throw new Error(`${date} is not a trading session; the fixture is wrong.`);
  }
  return found;
}

/** A minute of a session, by its offset from the open. Negative is pre-market. */
function minute(one: MarketSession, offset: number): Date {
  return new Date(one.open.getTime() + offset * MS_PER_MINUTE);
}

let adminPool: pg.Pool | undefined;
let testPool: pg.Pool | undefined;
let store: ReturnBaselineStore | undefined;
let securityId = "";

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

function subject(): { id: string; symbol: ReturnType<typeof toTicker> } {
  return { id: securityId, symbol: toTicker("ZZZZ") };
}

/**
 * One minute bar on a named tape, with a volume that is the point of it.
 *
 * The prices are all the same and are never read here — this suite is about
 * `volume`, which is the column `tapeCounts` deliberately does **not** touch
 * because it is not in `market_bars_unique_bar`.
 */
async function insertBar(
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

  // The table at the head of this file, in order.
  await insertBar(minute(EXPOSED, 0), 1000, "sip");
  await insertBar(minute(EXPOSED, 0), 100, "iex");
  await insertBar(minute(EXPOSED, 1), 1000, "sip");
  await insertBar(minute(EXPOSED, 1), 300, "iex");
  await insertBar(minute(EXPOSED, 2), 1000, "sip");
  await insertBar(minute(EXPOSED, 3), 1000, "sip");
  await insertBar(minute(EXPOSED, 10), 500_000, "iex");
  await insertBar(minute(EXPOSED, -30), 7_000, "iex");
  await insertBar(minute(BEFORE, 0), 9_000, "sip");

  // What `recordSeries` writes, tape-blind — so `tapeCoveredEnd` has a
  // candidate to start its retreat from. `covered_end` is exclusive.
  await db().query(
    `insert into bar_coverage
       (security_id, timeframe, covered_start, covered_end,
        provider, feed, bar_count)
     values ($1, '1m', $2, $3, 'alpaca', 'sip', 9)`,
    [securityId, BEFORE.open, new Date(minute(EXPOSED, 3).getTime() + 60_000)],
  );
});

afterAll(async () => {
  delete process.env.DATABASE_NAME;
  await testPool?.end();

  if (adminPool !== undefined) {
    await adminPool.query(`drop database if exists ${TEST_DATABASE_NAME}`);
    await adminPool.end();
  }
});

describe("readMinuteVolumes — the pairing, done in SQL", () => {
  it("returns one row per minute with BOTH tapes beside each other", async () => {
    const minutes = await baselines().readMinuteVolumes(subject(), WINDOW);

    // Nine bars, seven distinct minutes — because two of them hold two rows.
    // A read that did not group would answer nine, and a consumer joining by
    // hand is where the defect this query removes would live.
    expect(minutes).toHaveLength(7);

    const paired = minutes.find(
      (one) => one.startsAt.getTime() === minute(EXPOSED, 0).getTime(),
    );
    expect(paired?.sip).toBe(1000);
    expect(paired?.iex).toBe(100);
  });

  it("answers `undefined` and NEVER 0 for a tape that printed nothing", async () => {
    // **The distinction the whole volume block turns on.** `sum(…) filter (…)`
    // over a group with no matching row is SQL `null`, and `Number(null)` is
    // **0** — so a parser that forgot the explicit check would turn *IEX has no
    // bar for this minute* into *IEX traded nothing*, which is the claim AC 4
    // forbids, at the one place nothing downstream could detect it.
    const minutes = await baselines().readMinuteVolumes(subject(), WINDOW);

    const sipOnly = minutes.find(
      (one) => one.startsAt.getTime() === minute(EXPOSED, 2).getTime(),
    );
    expect(sipOnly?.sip).toBe(1000);
    expect(sipOnly?.iex).toBeUndefined();

    const iexOnly = minutes.find(
      (one) => one.startsAt.getTime() === minute(EXPOSED, 10).getTime(),
    );
    expect(iexOnly?.sip).toBeUndefined();
    expect(iexOnly?.iex).toBe(500_000);
  });

  it("parses a `bigint` volume into a number rather than handing back a string", async () => {
    // `volume` is a `bigint`, so `sum(volume)` arrives as a **string**. A
    // consumer that added two of them would concatenate, silently, and produce
    // a ratio that is a plausible number.
    const minutes = await baselines().readMinuteVolumes(subject(), WINDOW);

    for (const one of minutes) {
      expect(["number", "undefined"]).toContain(typeof one.sip);
      expect(["number", "undefined"]).toContain(typeof one.iex);
    }
  });
});

describe("the share, over a store that holds both tapes", () => {
  it("reports the BIAS and the SHARE as different numbers, and the factor between them", async () => {
    const body = await readBaselineCost(baselines(), "ZZZZ");
    const share = body.volumeShare;

    expect(share.measured).toBe(true);
    expect(share.refusal).toBeNull();

    // The table at the head of this file, asserted rather than reproduced.
    expect(share.sipMinutes).toBe(4);
    expect(share.twoTapeMinutes).toBe(2);
    expect(share.sipVolume).toBe(4000);
    expect(share.sipVolumeOnTwoTapeMinutes).toBe(2000);
    expect(share.iexVolume).toBe(400);

    // **The two answers `STORY.md`'s single ratio conflates.** A factor of two
    // apart on this fixture, by construction.
    expect(share.biasOverAllSipMinutes).toBeCloseTo(0.1, 10);
    expect(share.shareOnTwoTapeMinutes).toBeCloseTo(0.2, 10);
    expect(share.volumeExposure).toBeCloseTo(0.5, 10);

    // And the identity the body claims, checked on the body.
    expect(
      (share.shareOnTwoTapeMinutes ?? 0) * (share.volumeExposure ?? 0),
    ).toBeCloseTo(share.biasOverAllSipMinutes ?? 0, 10);
  });

  it("keeps an absent `iex` bar OUT of the per-minute distribution (AC 4)", async () => {
    // Two samples, 0.10 and 0.30: the inclusive interpolated percentile over
    // `[0.1, 0.3]` is 0.12 / 0.20 / 0.28. Counting the two `sip`-only minutes
    // as `0.0` samples gives four samples `[0, 0, 0.1, 0.3]` and a median of
    // **0.05**, so this assertion separates the two implementations by 4×.
    const { volumeShare: share } = await readBaselineCost(baselines(), "ZZZZ");

    expect(share.perMinuteRatioP10).toBeCloseTo(0.12, 10);
    expect(share.perMinuteRatioMedian).toBeCloseTo(0.2, 10);
    expect(share.perMinuteRatioP90).toBeCloseTo(0.28, 10);

    // And the volume-weighted mean is NOT the unweighted one — the reason the
    // headline is summed-then-divided and the distribution sits beside it.
    expect(share.biasOverAllSipMinutes).not.toBeCloseTo(
      share.perMinuteRatioMedian ?? 0,
      3,
    );
  });

  it("excludes the session BEFORE the live writer existed, and says where exposure starts", async () => {
    const { volumeShare: share } = await readBaselineCost(baselines(), "ZZZZ");

    expect(share.exposureFrom).toBe(LIVE_WRITER_FIRST_SESSION);
    // One exposed session, not two. 2026-09-22 holds a `sip` row and could
    // never have held an `iex` one, so counting it would measure our history.
    expect(share.exposedSessions).toBe(1);
    expect(share.firstExposedSession).toBe("2026-09-23");
    expect(share.lastExposedSession).toBe("2026-09-23");
    // Its 9,000 shares are not in the denominator: 4,000 and not 13,000, which
    // is the difference between a bias of 0.10 and one of 0.031.
    expect(share.sipVolume).toBe(4000);
    // And our own uptime is visible beside it — the one exposed session did
    // hear IEX, so these agree. A gap between them is a hole in our listening.
    expect(share.sessionsHoldingIex).toBe(1);
  });

  it("states the minute-presence share beside the volume share, because they disagree", async () => {
    // The whole premise of AC 1: presence and volume are different quantities.
    // Here presence is 50% and the venue's share of the volume it was present
    // for is 20%.
    const { volumeShare: share } = await readBaselineCost(baselines(), "ZZZZ");

    expect(share.minutePresence).toBeCloseTo(0.5, 10);
    expect(share.shareOnTwoTapeMinutes).toBeCloseTo(0.2, 10);
  });
});

describe("the dispersion AC 7's floor is derived from", () => {
  it("pools a bucket ACROSS sessions by time of day, and derives a floor from it", async () => {
    const { volumeDispersion } = await readBaselineCost(baselines(), "ZZZZ");
    const sip = volumeDispersion.find((one) => one.tape === "sip");

    // Bucket 0 holds minute 0 of both sessions and minutes 1–3 of the exposed
    // one — five samples, `[1000, 1000, 1000, 1000, 9000]` — which is the
    // pooling "typical for this time of day" means. A per-session bucket would
    // report two buckets of 4 and 1.
    expect(sip?.measured).toBe(true);
    expect(sip?.bucketMinutes).toBe(5);
    expect(sip?.buckets).toBe(1);
    expect(sip?.bucketsWithSpread).toBe(1);
    expect(sip?.samplesMedian).toBe(5);

    // sd/mean over that sample is 3577.71/2600 = 1.3760, and the floor follows
    // from it rather than being chosen: `(√(π/2)·CV/0.05)² = 1,190` samples,
    // which at five minutes a session is 238 sessions.
    expect(sip?.cvMedian).toBeCloseTo(1.376, 3);
    expect(sip?.samplesForTargetError).toBe(1190);
    expect(sip?.sessionsForTargetError).toBe(238);
  });

  it("answers for the `iex` tape too, never by omission", async () => {
    const { volumeDispersion } = await readBaselineCost(baselines(), "ZZZZ");

    // Two entries, always, in a fixed order — `FreshnessTimeframe`'s rule. On
    // every store outside Azure the second one refuses, and an absent entry
    // would be indistinguishable from a tape nobody thought to report.
    expect(volumeDispersion.map((one) => one.tape)).toEqual(["sip", "iex"]);

    const iex = volumeDispersion.find((one) => one.tape === "iex");
    // Bucket 0 holds `[100, 300]` and bucket 2 holds `[500000]`.
    expect(iex?.buckets).toBe(2);
    expect(iex?.bucketsWithSpread).toBe(1);
    // **And the pre-market bar is counted, not placed.** The baseline's grid is
    // over the regular session, so a minute 30 before the open has no bucket;
    // placing it would put the thinnest minutes of the day into bucket 0.
    expect(iex?.minutesOutsideSession).toBe(1);
    expect(iex?.minutes).toBe(3);
  });

  it("refuses rather than reporting a CV of 0 for a flat bucket", async () => {
    // A bucket with no spread has nothing to derive a floor from, and `0` there
    // is a licence to print any figure from any sample — a CV of zero makes
    // `samplesForTargetError` come back as **1**. Driven through the shipped
    // read, narrowed to the two flat `sip` minutes, so the rows are real.
    const flat = await baselines().readMinuteVolumes(
      subject(),
      toTimeRange(minute(EXPOSED, 2), minute(EXPOSED, 4)),
    );

    expect(flat).toHaveLength(2);
    expect(flat.every((one) => one.sip === 1000)).toBe(true);

    const sip = volumeDispersionOf([EXPOSED], flat).find(
      (one) => one.tape === "sip",
    );

    expect(sip?.buckets).toBe(1);
    expect(sip?.bucketsWithSpread).toBe(1);
    expect(sip?.measured).toBe(false);
    expect(sip?.refusal).toBe("no-spread");
    expect(sip?.cvMedian).toBeNull();
    expect(sip?.samplesForTargetError).toBeNull();
  });
});
