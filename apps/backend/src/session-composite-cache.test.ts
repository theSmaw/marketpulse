import { describe, expect, it } from "vitest";

import { scoreAnomaly, toMarketDate, toTicker } from "@marketpulse/shared";

import {
  COMPOSITE_RANKING_REFRESH_FLOOR_MS,
  createSessionCompositeCache,
} from "./session-composite-cache.js";
import type { StoredCompositeRanking } from "./session-composite-store.js";

// **The bounded poll, the failure behaviour, and the disagreement warning**
// (Task 5.6.6) — the three things `session-composite-scores.database.test.ts`
// cannot drive, because the first two are about a **clock** and a **throw**
// rather than about a table.
//
// The read itself is driven against a real database there, for the reason that
// file states: the memoisation key is the session the stored row is FOR, and
// the only honest way to show that is two real sessions in a real table.

const FRIDAY = new Date("2026-11-20T21:00:00.000Z");
const ASKED = toMarketDate("2026-11-23");

/**
 * One scored security, minted the way the store mints it — through
 * `scoreAnomaly` over the answers — so the fixture cannot carry a score the
 * arithmetic would not produce.
 */
const scored = () => {
  const answers = {
    price: { state: "ranked", rank: 99, aboveSample: false, sampleCount: 4620 },
    excess: {
      state: "ranked",
      rank: 71,
      aboveSample: false,
      sampleCount: 4281,
    },
    volume: { state: "no-distribution" },
  } as const;

  return {
    symbol: toTicker("NVDA"),
    outcome: scoreAnomaly(answers),
    answers,
  };
};

const ranking = (observedAt: Date, disagreed = 0): StoredCompositeRanking => ({
  pass: {
    observedAt,
    tracked: 501,
    scored: 485,
    unscored: 16,
    weights: { price: 40, excess: 35, volume: 25 },
    floors: { elevated: 32, high: 63, extreme: 73 },
  },
  scores: [scored()],
  disagreed,
});

/**
 * A store that counts its reads, and can be made to answer or to throw.
 *
 * `session-percentile-cache.test.ts`' shape, for its reason: the answer is a
 * plain function and the method returns `Promise.resolve` of it rather than
 * being `async`, because an `async` wrapper with nothing to await is a lint
 * error here and `Promise.reject` is how the throwing arm is expressed without
 * one.
 */
const countingStore = (answer: () => StoredCompositeRanking | undefined) => {
  let reads = 0;
  return {
    reads: () => reads,
    readNewestSession: (): Promise<StoredCompositeRanking | undefined> => {
      reads += 1;
      try {
        return Promise.resolve(answer());
      } catch (error) {
        return Promise.reject(error instanceof Error ? error : new Error(""));
      }
    },
  };
};

/** A turn of the event loop, not a microtask count. See the test below. */
const settle = async (): Promise<void> => {
  await new Promise((done) => {
    setTimeout(done, 0);
  });
};

describe("createSessionCompositeCache", () => {
  it("asks the store at most once per floor while nothing newer is stored", async () => {
    // The condition stays TRUE while the runner has not written tonight's
    // session — `heldThrough` is Friday's and the ask is Monday's — so without
    // a floor every ask would read, up to ~16 times a minute from the burst
    // path.
    const store = countingStore(() => ranking(FRIDAY));
    let now = 1_000_000;
    const cache = createSessionCompositeCache({ store, now: () => now });

    await cache.load(ASKED);
    expect(store.reads()).toBe(1);

    for (let ask = 0; ask < 20; ask += 1) cache.rankingAsOf(ASKED);
    await settle();
    expect(store.reads()).toBe(1);

    now += COMPOSITE_RANKING_REFRESH_FLOOR_MS;
    cache.rankingAsOf(ASKED);
    await settle();
    expect(store.reads()).toBe(2);
  });

  it("stops asking once the held session reaches the ask", async () => {
    const store = countingStore(() => ranking(FRIDAY));
    const cache = createSessionCompositeCache({ store });

    await cache.load(toMarketDate("2026-11-20"));
    for (let ask = 0; ask < 10; ask += 1) {
      cache.rankingAsOf(toMarketDate("2026-11-20"));
    }
    await settle();

    expect(store.reads()).toBe(1);
  });

  it("keeps what it holds when a refresh throws, and never throws at the reader", async () => {
    // It would be read from inside the socket's own callback by way of the
    // overview join, where an unhandled rejection is a crashed process — and a
    // region drawing last session's ranking is a better answer than one that
    // went blank because a query failed.
    let fail = false;
    const warnings: string[] = [];
    const store = countingStore(() => {
      if (fail) throw new Error("the database is unreachable");
      return ranking(FRIDAY);
    });

    let now = 1_000_000;
    const cache = createSessionCompositeCache({
      store,
      now: () => now,
      warn: (_fields, message) => warnings.push(message),
    });

    await cache.load(ASKED);
    fail = true;

    now += COMPOSITE_RANKING_REFRESH_FLOOR_MS;
    expect(() => cache.rankingAsOf(ASKED)).not.toThrow();

    // A turn of the event loop rather than two microtasks: the rejection
    // travels through an async store call, the `finally` and the `catch`, and a
    // microtask count is a count of this module's internal awaits.
    await settle();

    expect(cache.rankingAsOf(ASKED)?.pass.scored).toBe(485);
    expect(cache.size()).toBe(1);
    expect(warnings.join(" ")).toContain("keeping the session we hold");
  });

  it("is empty, and says so, where nothing is stored at all", async () => {
    // CI's permanent state — 516 securities, zero bars, no nightly runner —
    // and every store's before its first nightly run.
    const warnings: string[] = [];
    const store = countingStore(() => undefined);
    const cache = createSessionCompositeCache({
      store,
      warn: (_fields, message) => warnings.push(message),
    });

    await cache.load(ASKED);

    expect(cache.rankingAsOf(ASKED)).toBeUndefined();
    expect(cache.heldThrough()).toBeUndefined();
    expect(cache.size()).toBe(0);
    expect(warnings.join(" ")).toContain("no composite ranking is stored");
  });

  it("does not replace a newer held session with an older one", async () => {
    // A successful read that found an older session is a replay bound or a
    // store that lost rows, and either way the newer answer is the one to keep.
    let answer = ranking(FRIDAY);
    const store = countingStore(() => answer);
    let now = 1_000_000;
    const cache = createSessionCompositeCache({ store, now: () => now });

    await cache.load(ASKED);
    answer = ranking(new Date("2026-11-19T21:00:00.000Z"));

    now += COMPOSITE_RANKING_REFRESH_FLOOR_MS;
    await cache.load(ASKED);

    expect(cache.heldThrough()).toBe("2026-11-20");
  });

  it("logs a producer/reader disagreement rather than swallowing it", async () => {
    // **A dropped row with no line anywhere would be a ranked list quietly
    // short of a security it should hold.** `0017` §5 stores the minted figures
    // beside the answers precisely so the split is detectable, and the store
    // drops the row; this is the half that says so out loud.
    const warnings: string[] = [];
    const store = countingStore(() => ranking(FRIDAY, 3));
    const cache = createSessionCompositeCache({
      store,
      warn: (_fields, message) => warnings.push(message),
    });

    await cache.load(ASKED);

    expect(warnings.join(" ")).toContain(
      "do not reproduce from their own factor answers",
    );
  });

  it("says nothing about disagreements when there are none", async () => {
    // The non-vacuous half: a warning that fires on every healthy load is a
    // warning nobody reads.
    const warnings: string[] = [];
    const store = countingStore(() => ranking(FRIDAY));
    const cache = createSessionCompositeCache({
      store,
      warn: (_fields, message) => warnings.push(message),
    });

    await cache.load(ASKED);

    expect(warnings).toEqual([]);
  });
});
