// The relationships cache's five rules (Task 6.5.2).
//
// The **memoisation key** — *the session the stored rows are FOR*, which is
// `last-closes-cache.ts`' recorded defect repaired rather than copied — is
// driven here with two real generations from a stub store, and the whole
// generation read it sits in front of is driven against a real table in
// `return-correlations.database.test.ts`.
//
// No socket, no database, no clock. The store is a function and the clock is a
// seam, which is the whole reason `createRelationshipsCache` takes both.

import { describe, expect, it, vi } from "vitest";

import { marketDateAt, toTicker } from "@marketpulse/shared";

import {
  createRelationshipsCache,
  RELATIONSHIPS_REFRESH_FLOOR_MS,
} from "./relationships-cache.js";
import type { StoredCorrelationGeneration } from "./return-correlation-store.js";

/** The close of 2026-09-11 — the session the one local generation is for. */
const OBSERVED_AT = new Date("2026-09-11T20:00:00.000Z");
const NEXT_OBSERVED_AT = new Date("2026-09-14T20:00:00.000Z");

function generation(
  observedAt: Date,
  pairs: number,
): StoredCorrelationGeneration {
  return {
    pass: {
      observedAt,
      trackedEquities: 501,
      eligibleEquities: 496,
      splitDiscontinuity: 5,
      absent: 0,
      candidatePairs: 122_760,
      computedPairs: 122_760,
      retainedPairs: pairs,
      refusals: { tooFewOverlappingSamples: 0, zeroVariance: 0 },
      belowSignificance: 20_752,
      retainedN: 5,
      parameters: { lookbackSessions: 60, spanMinutes: 5, feed: "sip" },
    },
    correlations: Array.from({ length: pairs }, (_unused, index) => ({
      low: toTicker("AAAA"),
      // Letters only: `toTicker` refuses a digit, which is the branded
      // constructor doing its job rather than something to route around.
      high: toTicker(`Z${"ABCDEFGHIJ"[index % 10] ?? "A"}`),
      r: 0.5,
      n: 4620,
    })),
  };
}

/** A clock a test moves by hand. */
function clockFrom(start: number) {
  let value = start;
  return {
    now: () => value,
    advance: (ms: number) => {
      value += ms;
    },
  };
}

describe("createRelationshipsCache", () => {
  it("is empty before the first read, and that is the true answer", () => {
    const cache = createRelationshipsCache({
      store: { readNewestGeneration: () => Promise.resolve(undefined) },
      now: () => 0,
    });

    expect(cache.size()).toBe(0);
    expect(cache.heldThrough()).toBeUndefined();
  });

  it("answers the first caller with the generation rather than with nothing", async () => {
    // Where this diverges from its four siblings, and why: they are read from
    // inside the market socket's own callback and must not await, so their
    // first caller is answered with an empty map. A route's caller is a
    // browser that has no way to re-ask.
    const cache = createRelationshipsCache({
      store: {
        readNewestGeneration: () => Promise.resolve(generation(OBSERVED_AT, 3)),
      },
      now: () => 0,
    });

    const answer = await cache.generationAsOf(OBSERVED_AT);

    expect(answer?.pass.retainedPairs).toBe(3);
    expect(cache.size()).toBe(3);
    expect(cache.heldThrough()).toBe(marketDateAt(OBSERVED_AT));
  });

  it("reads the store ONCE for repeated asks about the session it holds", async () => {
    const read = vi.fn(() => Promise.resolve(generation(OBSERVED_AT, 1)));
    const cache = createRelationshipsCache({
      store: { readNewestGeneration: read },
      now: () => 0,
    });

    await cache.generationAsOf(OBSERVED_AT);
    await cache.generationAsOf(new Date(OBSERVED_AT.getTime() + 3_600_000));
    await cache.generationAsOf(new Date(OBSERVED_AT.getTime() + 7_200_000));

    expect(read).toHaveBeenCalledTimes(1);
  });

  // **The key is the session the ROWS carry and never the session asked
  // about**, which is `last-closes-cache.ts`' own defect: keyed on the ask,
  // the cache would record Monday against Friday's rows and never try again
  // that day.
  it("keys on the stored generation's own session, so a later ask tries again", async () => {
    const read = vi
      .fn<() => Promise<StoredCorrelationGeneration | undefined>>()
      .mockResolvedValueOnce(generation(OBSERVED_AT, 1))
      .mockResolvedValueOnce(generation(NEXT_OBSERVED_AT, 2));

    const cache = createRelationshipsCache({
      store: { readNewestGeneration: read },
      now: () => 0,
    });

    await cache.generationAsOf(OBSERVED_AT);
    expect(cache.heldThrough()).toBe(marketDateAt(OBSERVED_AT));

    // Monday. The held generation is Friday's, so the condition is still true.
    const answer = await cache.generationAsOf(NEXT_OBSERVED_AT);

    expect(read).toHaveBeenCalledTimes(2);
    expect(answer?.pass.observedAt).toBe(NEXT_OBSERVED_AT);
    expect(cache.heldThrough()).toBe(marketDateAt(NEXT_OBSERVED_AT));
  });

  it("holds a read that found nothing newer behind the floor rather than re-asking", async () => {
    // The cost of keying on the rows: the condition stays true while the
    // nightly runner has not written tonight's generation, so a **successful**
    // read that did not satisfy the ask starts the floor too. Without it, a
    // weekend is one query per page load.
    const read = vi.fn(() => Promise.resolve(generation(OBSERVED_AT, 1)));
    const clock = clockFrom(1_000);

    const cache = createRelationshipsCache({
      store: { readNewestGeneration: read },
      now: clock.now,
    });

    await cache.generationAsOf(NEXT_OBSERVED_AT);
    expect(read).toHaveBeenCalledTimes(1);

    await cache.generationAsOf(NEXT_OBSERVED_AT);
    clock.advance(RELATIONSHIPS_REFRESH_FLOOR_MS - 1);
    await cache.generationAsOf(NEXT_OBSERVED_AT);

    expect(read).toHaveBeenCalledTimes(1);

    clock.advance(1);
    await cache.generationAsOf(NEXT_OBSERVED_AT);

    expect(read).toHaveBeenCalledTimes(2);
  });

  it("serves what it holds while the floor is closed, rather than nothing", async () => {
    // The floor is about not re-querying, never about withholding an answer:
    // Friday's edges are still Friday's edges on a Monday whose pass has not
    // run, and a drawn graph that loses its edge layer because a cache is
    // waiting would be a worse answer than a stale-but-true one.
    const read = vi.fn(() => Promise.resolve(generation(OBSERVED_AT, 4)));
    const cache = createRelationshipsCache({
      store: { readNewestGeneration: read },
      now: () => 1_000,
    });

    await cache.generationAsOf(NEXT_OBSERVED_AT);
    const answer = await cache.generationAsOf(NEXT_OBSERVED_AT);

    expect(read).toHaveBeenCalledTimes(1);
    expect(answer?.correlations).toHaveLength(4);
  });

  it("shares one in-flight read across concurrent askers", async () => {
    let settle: (value: StoredCorrelationGeneration | undefined) => void = () =>
      undefined;

    const read = vi.fn(
      () =>
        new Promise<StoredCorrelationGeneration | undefined>((resolve) => {
          settle = resolve;
        }),
    );

    const cache = createRelationshipsCache({
      store: { readNewestGeneration: read },
      now: () => 0,
    });

    const first = cache.generationAsOf(OBSERVED_AT);
    const second = cache.generationAsOf(OBSERVED_AT);
    const third = cache.generationAsOf(OBSERVED_AT);

    settle(generation(OBSERVED_AT, 2));

    expect((await first)?.pass.retainedPairs).toBe(2);
    expect((await second)?.pass.retainedPairs).toBe(2);
    expect((await third)?.pass.retainedPairs).toBe(2);
    expect(read).toHaveBeenCalledTimes(1);
  });

  // **A failed read THROWS**, which is the second divergence from the sibling
  // caches: the caller is a route that can answer 503, and a well-formed body
  // claiming there are no relationships when the truth is that we could not
  // read them is the one answer this product's failure handling forbids.
  it("propagates a failed read rather than swallowing it", async () => {
    const cache = createRelationshipsCache({
      store: { readNewestGeneration: () => Promise.reject(new Error("down")) },
      now: () => 0,
    });

    await expect(cache.generationAsOf(OBSERVED_AT)).rejects.toThrow("down");
    expect(cache.size()).toBe(0);
  });

  // **The floor must not turn a failure into an absence**, which is this
  // story's own Gate 2 defect (Task 6.5.4): armed by the first read of a
  // replica whose database is unreachable, it made every ask for the next
  // fifteen minutes skip the store and resolve `undefined` — a 200 with no
  // `pass`, drawn as *has not been measured here* while the truth was that we
  // could not read it.
  it("goes on failing inside the floor window while it holds nothing", async () => {
    const read = vi.fn(() => Promise.reject(new Error("down")));
    const clock = clockFrom(1_000);

    const cache = createRelationshipsCache({
      store: { readNewestGeneration: read },
      now: clock.now,
    });

    await expect(cache.generationAsOf(OBSERVED_AT)).rejects.toThrow("down");

    // Well inside the floor, which is where the defect lived.
    clock.advance(RELATIONSHIPS_REFRESH_FLOOR_MS / 2);

    await expect(cache.generationAsOf(OBSERVED_AT)).rejects.toThrow("down");
    expect(read).toHaveBeenCalledTimes(2);
    // And it still says what it holds, which is nothing — never that nothing
    // was measured.
    expect(cache.heldThrough()).toBeUndefined();
  });

  it("keeps the generation it holds when a later read fails", async () => {
    // A stale-but-true edge layer beats no edge layer, which is every sibling
    // cache's rule and is unaffected by the throw above: the *next* ask is
    // answered from what we hold, because the held generation is replaced only
    // by a successful read.
    const read = vi
      .fn<() => Promise<StoredCorrelationGeneration | undefined>>()
      .mockResolvedValueOnce(generation(OBSERVED_AT, 5))
      .mockRejectedValueOnce(new Error("down"));

    const clock = clockFrom(0);
    const cache = createRelationshipsCache({
      store: { readNewestGeneration: read },
      now: clock.now,
    });

    await cache.generationAsOf(OBSERVED_AT);
    await expect(cache.generationAsOf(NEXT_OBSERVED_AT)).rejects.toThrow(
      "down",
    );

    expect(cache.size()).toBe(5);
    expect(await cache.generationAsOf(NEXT_OBSERVED_AT)).toBe(
      await cache.generationAsOf(OBSERVED_AT),
    );
  });

  it("never serves a generation from AFTER the instant it was asked about", async () => {
    // Nothing sends a historical `asOf` today and this is the branch that
    // makes the day something does correct rather than a rewrite: the
    // generation we hold is too new to answer it, so the store is asked
    // directly and the held one is left alone — present information reaching a
    // replayed past is the one thing invariant 4 promises cannot happen.
    const read = vi
      .fn<
        (atOrBefore: Date) => Promise<StoredCorrelationGeneration | undefined>
      >()
      .mockResolvedValueOnce(generation(NEXT_OBSERVED_AT, 2))
      .mockResolvedValueOnce(undefined);

    const cache = createRelationshipsCache({
      store: { readNewestGeneration: read },
      now: () => 0,
    });

    await cache.generationAsOf(NEXT_OBSERVED_AT);

    const earlier = new Date("2026-01-02T20:00:00.000Z");
    expect(await cache.generationAsOf(earlier)).toBeUndefined();

    expect(read).toHaveBeenLastCalledWith(earlier);
    // And the cache still holds what it held.
    expect(cache.heldThrough()).toBe(marketDateAt(NEXT_OBSERVED_AT));
  });

  it("answers `undefined` where no pass has ever run, which is CI for ever", async () => {
    const cache = createRelationshipsCache({
      store: { readNewestGeneration: () => Promise.resolve(undefined) },
      now: () => 0,
    });

    expect(await cache.generationAsOf(OBSERVED_AT)).toBeUndefined();
    expect(cache.heldThrough()).toBeUndefined();
  });
});
