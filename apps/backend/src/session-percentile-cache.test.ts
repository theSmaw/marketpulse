import { describe, expect, it } from "vitest";

import { toMarketDate, toTicker } from "@marketpulse/shared";

import {
  SESSION_RANKING_REFRESH_FLOOR_MS,
  createSessionPercentileCache,
} from "./session-percentile-cache.js";
import type { StoredSessionRanking } from "./session-percentile-store.js";

// **The bounded poll and the failure behaviour** (Task 5.4.5) — the two things
// `session-return-percentiles.database.test.ts` cannot drive, because both are
// about a **clock** and a **throw** rather than about a table.
//
// The read itself is driven against a real database there, for the reason that
// file states: the memoisation key is the session the stored row is FOR, and
// the only honest way to show that is two real sessions in a real table.

const FRIDAY = new Date("2026-11-20T21:00:00.000Z");
const ASKED = toMarketDate("2026-11-23");

const ranking = (observedAt: Date): StoredSessionRanking => ({
  pass: {
    observedAt,
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
  },
  scores: [
    {
      symbol: toTicker("NVDA"),
      rank: 99,
      aboveSample: false,
      sampleCount: 4620,
      percent: -2.4,
      from: { at: FRIDAY, price: 100, feed: "sip" },
      to: { at: FRIDAY, price: 97.6, feed: "sip" },
      observed: 5,
    },
  ],
});

/**
 * A store that counts its reads, and can be made to answer or to throw.
 *
 * The answer is a plain function and the method returns `Promise.resolve` of
 * it rather than being `async`: an `async` wrapper with nothing to await is a
 * lint error here, and `Promise.reject` is how the throwing arm is expressed
 * without one.
 */
const countingStore = (answer: () => StoredSessionRanking | undefined) => {
  let reads = 0;
  return {
    reads: () => reads,
    readNewestSession: (): Promise<StoredSessionRanking | undefined> => {
      reads += 1;
      try {
        return Promise.resolve(answer());
      } catch (error) {
        return Promise.reject(error instanceof Error ? error : new Error(""));
      }
    },
  };
};

describe("createSessionPercentileCache", () => {
  it("asks the store at most once per floor while nothing newer is stored", async () => {
    // The condition stays TRUE while the runner has not written tonight's
    // session — `heldThrough` is Friday's and the ask is Monday's — so without
    // a floor every ask would read, up to ~16 times a minute from the burst
    // path.
    const store = countingStore(() => ranking(FRIDAY));
    let now = 1_000_000;
    const cache = createSessionPercentileCache({ store, now: () => now });

    await cache.load(ASKED);
    expect(store.reads()).toBe(1);

    for (let ask = 0; ask < 20; ask += 1) cache.rankingAsOf(ASKED);
    // A `void` read is started inside `rankingAsOf`; let any that were allowed
    // settle before counting.
    await new Promise((settle) => setTimeout(settle, 0));
    expect(store.reads()).toBe(1);

    now += SESSION_RANKING_REFRESH_FLOOR_MS;
    cache.rankingAsOf(ASKED);
    await new Promise((settle) => setTimeout(settle, 0));
    expect(store.reads()).toBe(2);
  });

  it("stops asking once the held session reaches the ask", async () => {
    // The one state in which the condition is false and the floor is therefore
    // unnecessary: nothing more is owed, so nothing more is read.
    const store = countingStore(() => ranking(FRIDAY));
    const cache = createSessionPercentileCache({ store });

    await cache.load(toMarketDate("2026-11-20"));
    for (let ask = 0; ask < 10; ask += 1)
      cache.rankingAsOf(toMarketDate("2026-11-20"));
    await new Promise((settle) => setTimeout(settle, 0));

    expect(store.reads()).toBe(1);
  });

  it("keeps what it holds when a refresh throws, and never throws at the reader", async () => {
    // It is read from inside the socket's own callback by way of the overview
    // join, where an unhandled rejection is a crashed process — and a region
    // drawing last session's ranking is a better answer than one that went
    // blank because a query failed.
    let fail = false;
    const warnings: string[] = [];
    const store = countingStore(() => {
      if (fail) throw new Error("the database is unreachable");
      return ranking(FRIDAY);
    });

    let now = 1_000_000;
    const cache = createSessionPercentileCache({
      store,
      now: () => now,
      warn: (_fields, message) => warnings.push(message),
    });

    await cache.load(ASKED);
    fail = true;

    // Past the floor, so the ask is allowed to try — inside it the ask reads
    // nothing at all, which is the arm the test above owns.
    now += SESSION_RANKING_REFRESH_FLOOR_MS;
    expect(() => cache.rankingAsOf(ASKED)).not.toThrow();

    // A turn of the event loop rather than two microtasks: the rejection
    // travels through an async store call, the `finally` and the `catch`, and
    // a microtask count is a count of this module's internal awaits.
    await new Promise((settle) => setTimeout(settle, 0));

    expect(cache.rankingAsOf(ASKED)?.pass.scored).toBe(455);
    expect(cache.size()).toBe(1);
    expect(warnings.join(" ")).toContain("keeping the session we hold");
  });

  it("is empty, and says so, where nothing is stored at all", async () => {
    // CI's permanent state and every store's before its first nightly run.
    const warnings: string[] = [];
    const store = countingStore(() => undefined);
    const cache = createSessionPercentileCache({
      store,
      warn: (_fields, message) => warnings.push(message),
    });

    await cache.load(ASKED);

    expect(cache.rankingAsOf(ASKED)).toBeUndefined();
    expect(cache.heldThrough()).toBeUndefined();
    expect(cache.size()).toBe(0);
    expect(warnings.join(" ")).toContain("no session ranking is stored");
  });

  it("does not replace a newer held session with an older one", async () => {
    // A successful read that found an older session is a replay bound or a
    // store that lost rows, and either way the newer answer is the one to
    // keep.
    let answer = ranking(FRIDAY);
    const store = countingStore(() => answer);
    let now = 1_000_000;
    const cache = createSessionPercentileCache({ store, now: () => now });

    await cache.load(ASKED);
    answer = ranking(new Date("2026-11-19T21:00:00.000Z"));

    now += SESSION_RANKING_REFRESH_FLOOR_MS;
    await cache.load(ASKED);

    expect(cache.heldThrough()).toBe("2026-11-20");
  });
});
