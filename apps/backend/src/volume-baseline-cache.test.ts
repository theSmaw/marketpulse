import { describe, expect, it } from "vitest";

import { toMarketDate, toTicker } from "@marketpulse/shared";

import { BASELINE_REFRESH_FLOOR_MS } from "./return-baseline-cache.js";
import { createVolumeBaselineCache } from "./volume-baseline-cache.js";

import type { StoredVolumeBaseline } from "./volume-baseline-store.js";

// **The bounded poll and the failure behaviour** (Task 5.5.4) — the two things
// a database suite cannot drive, because both are about a **clock** and a
// **throw** rather than about a table. The read itself is driven against a real
// database in `volume-baselines.database.test.ts`, for that file's reason: the
// memoisation key is the session the stored rows are FOR, and the only honest
// way to show that is a real generation in a real table.

const FRIDAY = new Date("2026-11-20T21:00:00.000Z");
const ASKED = toMarketDate("2026-11-23");

const generation = (observedAt: Date): readonly StoredVolumeBaseline[] => [
  {
    symbol: toTicker("NVDA"),
    observedAt,
    lookbackSessions: 60,
    bucketMinutes: 5,
    bucketCount: 1,
    sampleCount: 80,
    refusal: null,
    buckets: [{ median: 2_500, samples: 80, relativeStandardError: 0.1065 }],
  },
];

/** A store that counts its reads, and can be made to answer or to throw. */
const countingStore = (answer: () => readonly StoredVolumeBaseline[]) => {
  let reads = 0;
  return {
    reads: () => reads,
    readNewestGeneration: (): Promise<readonly StoredVolumeBaseline[]> => {
      reads += 1;
      try {
        return Promise.resolve(answer());
      } catch (error) {
        return Promise.reject(error instanceof Error ? error : new Error(""));
      }
    },
  };
};

const settle = (): Promise<unknown> =>
  new Promise((done) => setTimeout(done, 0));

describe("createVolumeBaselineCache", () => {
  it("asks the store at most once per floor while nothing newer is stored", async () => {
    // The condition stays TRUE while the runner has not written tonight's
    // generation, so without a floor every ask would read — up to ~16 times a
    // minute from the burst path, and this cache is asked on every `return`
    // frame.
    const store = countingStore(() => generation(FRIDAY));
    let now = 1_000_000;
    const cache = createVolumeBaselineCache({ store, now: () => now });

    await cache.load(ASKED);
    expect(store.reads()).toBe(1);

    for (let ask = 0; ask < 20; ask += 1) cache.baselineAsOf(ASKED);
    await settle();
    expect(store.reads()).toBe(1);

    now += BASELINE_REFRESH_FLOOR_MS;
    cache.baselineAsOf(ASKED);
    await settle();
    expect(store.reads()).toBe(2);
  });

  it("memoises on the session the ROWS are for, never the session asked about", async () => {
    // `last-closes-cache.ts`' recorded defect, not repeated: a cache keyed on
    // the ask records today's date against last night's figures and can then
    // never refresh again that day.
    const store = countingStore(() => generation(FRIDAY));
    const cache = createVolumeBaselineCache({ store });

    await cache.load(ASKED);

    expect(cache.heldThrough()).toBe("2026-11-20");
    expect(cache.size()).toBe(1);
  });

  it("keeps what it holds when a refresh throws, and never throws at the reader", async () => {
    // It is read from inside the socket's own callback by way of
    // `symbolReturn`, where an unhandled rejection is a crashed process.
    let fail = false;
    const warnings: string[] = [];
    const store = countingStore(() => {
      if (fail) throw new Error("the database is unreachable");
      return generation(FRIDAY);
    });

    let now = 1_000_000;
    const cache = createVolumeBaselineCache({
      store,
      now: () => now,
      warn: (_fields, message) => warnings.push(message),
    });

    await cache.load(ASKED);
    fail = true;

    now += BASELINE_REFRESH_FLOOR_MS;
    expect(() => cache.baselineAsOf(ASKED)).not.toThrow();
    await settle();

    expect(cache.baselineAsOf(ASKED).get(toTicker("NVDA"))?.sampleCount).toBe(
      80,
    );
    expect(warnings.join(" ")).toContain("keeping the generation we hold");
  });

  it("is empty, and says so, where nothing is stored at all", async () => {
    // **Every machine without a provider, permanently** — the pass writes no
    // row for a security with no `iex` bar in the window, so this is not a
    // degraded state but Gate 1 decision 1's accepted one.
    const warnings: string[] = [];
    const store = countingStore(() => []);
    const cache = createVolumeBaselineCache({
      store,
      warn: (_fields, message) => warnings.push(message),
    });

    await cache.load(ASKED);

    expect(cache.baselineAsOf(ASKED).size).toBe(0);
    expect(cache.heldThrough()).toBeUndefined();
    expect(warnings.join(" ")).toContain("no volume baseline generation");
  });

  it("does not replace a newer held generation with an older one", async () => {
    let answer = generation(FRIDAY);
    const store = countingStore(() => answer);
    let now = 1_000_000;
    const cache = createVolumeBaselineCache({ store, now: () => now });

    await cache.load(ASKED);
    answer = generation(new Date("2026-11-19T21:00:00.000Z"));

    now += BASELINE_REFRESH_FLOOR_MS;
    await cache.load(ASKED);

    expect(cache.heldThrough()).toBe("2026-11-20");
  });
});
