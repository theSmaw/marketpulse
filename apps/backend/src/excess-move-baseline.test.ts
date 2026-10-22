// The excess-move baseline's arithmetic (Task 5.6.2).
//
// ## The three layers, because Story 5.3 proved they are not interchangeable
//
// Story 5.6's hand-off from 5.3, item 5: a planted signed-percentile defect was
// caught by **properties only**, `rank + 1` by the **golden sample only**, and
// `rank × 0.8 when n > 500` by the **independent recompute only — with the
// golden sample green.** So this file carries all three for the differenced
// sampler: properties (magnitude symmetry, the grid's multiplicity, no
// cross-session pair), a hand-computed golden sample small enough to check by
// addition, and an independent recompute of the excess from the two legs.

import { describe, expect, it } from "vitest";

import {
  SPLIT_DISCONTINUITY_RATIO,
  marketSessionOn,
  toMarketDate,
  type MarketSession,
} from "@marketpulse/shared";

import {
  EXCESS_REFERENCE_KIND,
  excessBaselineOf,
  excessSamples,
} from "./excess-move-baseline.js";
import {
  SAMPLE_SPAN_MINUTES,
  seriesIsDiscontinuous,
} from "./return-baseline.js";

const MS_PER_MINUTE = 60_000;

function session(date: string): MarketSession {
  const found = marketSessionOn(toMarketDate(date));
  if (found === undefined) {
    throw new Error(`${date} is not a trading session; the fixture is wrong.`);
  }
  return found;
}

const FIRST = session("2026-09-23");
const SECOND = session("2026-09-24");

/** A close at the grid anchor `index` of `one`'s session. */
function anchor(one: MarketSession, index: number): number {
  return one.open.getTime() + index * SAMPLE_SPAN_MINUTES * MS_PER_MINUTE;
}

/** Closes at consecutive grid anchors of one session, from a list. */
function grid(
  one: MarketSession,
  closes: readonly number[],
): Map<number, number> {
  const map = new Map<number, number>();
  closes.forEach((close, index) => {
    map.set(anchor(one, index), close);
  });
  return map;
}

/** The arguments the pass hands in, with no refusal on either leg. */
function clean(
  sessions: readonly MarketSession[],
  closes: ReadonlyMap<number, number>,
  referenceCloses: ReadonlyMap<number, number>,
): Parameters<typeof excessBaselineOf>[0] {
  return {
    sessions,
    closes,
    referenceCloses,
    priceRefusal: null,
    referenceDiscontinuous: false,
  };
}

describe("the reference kind", () => {
  it("has one member, and it is the one `0016`'s check constraint admits", () => {
    // A vocabulary member nothing can produce is scaffolding ahead of the step,
    // and widening the constraint is a migration either way. The second form —
    // an unweighted industry peer median — is what the KEY is shaped for.
    expect(EXCESS_REFERENCE_KIND).toBe("sector_etf");
  });
});

describe("excessSamples — the paired walk", () => {
  it("differences the two legs' returns over the same grid pair", () => {
    // Golden sample, hand-computed and checkable by addition.
    //
    //   anchor      0      1      2
    //   subject   100    101    100       +1.0%   −0.99009901%
    //   reference 200    201    200       +0.5%   −0.49751244%
    //   excess          +0.5            −0.49258657
    const { magnitudes } = excessSamples(
      clean(
        [FIRST],
        grid(FIRST, [100, 101, 100]),
        grid(FIRST, [200, 201, 200]),
      ),
    );

    expect(magnitudes).toHaveLength(2);
    expect(magnitudes[0]).toBeCloseTo(0.5, 10);
    expect(magnitudes[1]).toBeCloseTo(0.4925865721, 8);
  });

  it("agrees with an INDEPENDENT recompute of the excess from the two legs", () => {
    // The third layer. The recompute is written the other way round — read the
    // two legs' closes out of the maps by hand and difference them — so a
    // defect in the walk's own indexing cannot be shared with it.
    const ours = [100, 103, 99, 101];
    const theirs = [50, 51, 50.5, 50];

    const { magnitudes } = excessSamples(
      clean([FIRST], grid(FIRST, ours), grid(FIRST, theirs)),
    );

    const expected: number[] = [];
    for (let index = 1; index < ours.length; index += 1) {
      const ourFrom = ours[index - 1] ?? 0;
      const ourTo = ours[index] ?? 0;
      const theirFrom = theirs[index - 1] ?? 0;
      const theirTo = theirs[index] ?? 0;
      expected.push(
        Math.abs(
          ((ourTo - ourFrom) / ourFrom) * 100 -
            ((theirTo - theirFrom) / theirFrom) * 100,
        ),
      );
    }

    expect(magnitudes).toHaveLength(3);
    magnitudes.forEach((magnitude, index) => {
      expect(magnitude).toBeCloseTo(expected[index] ?? NaN, 10);
    });
  });

  it("is a MAGNITUDE, so running ahead and falling behind are one sample", () => {
    // AC 4, as a property rather than as a sentence. A signed sample would make
    // the composite score higher for falls than for rises, which
    // `PRODUCT_SPEC.md` §11 forbids in terms — and the defect is invisible in
    // every breakpoint except through the sign of the tail.
    const ahead = excessSamples(
      clean([FIRST], grid(FIRST, [100, 102]), grid(FIRST, [100, 101])),
    );
    const behind = excessSamples(
      clean([FIRST], grid(FIRST, [100, 101]), grid(FIRST, [100, 102])),
    );

    expect(ahead.magnitudes).toEqual(behind.magnitudes);
    for (const magnitude of ahead.magnitudes)
      expect(magnitude).toBeGreaterThan(0);
  });

  it("drops a pair the REFERENCE is missing, and never reads it as a flat market", () => {
    // **The `?? 0` defect arriving at the reference leg.** A benchmark that
    // printed nothing in this minute has not been flat, and treating it as flat
    // makes the subject's whole move read as excess — a well-formed number,
    // wrong by the size of the market's move.
    const ours = grid(FIRST, [100, 110, 121]);
    const theirs = grid(FIRST, [100, 110, 121]);
    theirs.delete(anchor(FIRST, 1));

    const { magnitudes, subjectPairs } = excessSamples(
      clean([FIRST], ours, theirs),
    );

    // The subject had two pairs; the reference could be differenced against
    // neither, because anchor 1 is an endpoint of both.
    expect(subjectPairs).toBe(2);
    expect(magnitudes).toEqual([]);
    // And emphatically not the subject's own 10% move twice over.
    expect(magnitudes).not.toContain(10);
  });

  it("drops a pair the SUBJECT is missing, counting no subject pair either", () => {
    const ours = grid(FIRST, [100, 110, 121]);
    ours.delete(anchor(FIRST, 1));

    const { magnitudes, subjectPairs } = excessSamples(
      clean([FIRST], ours, grid(FIRST, [100, 110, 121])),
    );

    expect(subjectPairs).toBe(0);
    expect(magnitudes).toEqual([]);
  });

  it("never pairs the last minute of one session with the first of the next", () => {
    // `return-baseline.ts`' property 1, inherited by construction. The two
    // sessions' closes are chosen so an overnight pair would be a 100% move on
    // one leg and 0% on the other — a sample no walk over one session can
    // produce, and the fattest one in any corpus if it could.
    const ours = new Map([
      ...grid(FIRST, [100, 100]),
      ...grid(SECOND, [200, 200]),
    ]);
    const theirs = new Map([
      ...grid(FIRST, [100, 100]),
      ...grid(SECOND, [100, 100]),
    ]);

    const { magnitudes } = excessSamples(clean([FIRST, SECOND], ours, theirs));

    // One pair per session, both exactly flat on both legs.
    expect(magnitudes).toEqual([0, 0]);
  });

  it("gives one extreme close ONE sample rather than five", () => {
    // The multiplicity property, which is why `magnitudes` is exported at all:
    // an overlapping grid produces a *more* plausible `n` and nearly the same
    // breakpoints, so a count cannot see it and the set can.
    const ours = grid(FIRST, [100, 100, 100, 150, 150, 150]);
    const theirs = grid(FIRST, [100, 100, 100, 100, 100, 100]);

    const { magnitudes } = excessSamples(clean([FIRST], ours, theirs));

    expect(magnitudes.filter((magnitude) => magnitude > 1)).toHaveLength(1);
  });
});

describe("excessBaselineOf — the outcome", () => {
  it("answers `measured` with 101 ascending breakpoints and a counted `n`", () => {
    const ours = grid(FIRST, [100, 101, 102, 101, 103, 104]);
    const theirs = grid(FIRST, [100, 100.5, 101, 100.5, 102, 102.5]);

    const outcome = excessBaselineOf(clean([FIRST], ours, theirs));

    expect(outcome.kind).toBe("measured");
    if (outcome.kind !== "measured") return;

    expect(outcome.sampleCount).toBe(5);
    expect(outcome.breakpoints).toHaveLength(101);
    for (let rank = 1; rank < outcome.breakpoints.length; rank += 1) {
      expect(outcome.breakpoints[rank]).toBeGreaterThanOrEqual(
        outcome.breakpoints[rank - 1] ?? 0,
      );
    }
  });

  it("answers `none` with no pair on both legs, and writes no row", () => {
    // *The pass has not reached this security* against *the pass reached it and
    // will not answer*. CI's permanent state is this one.
    expect(excessBaselineOf(clean([FIRST], new Map(), new Map())).kind).toBe(
      "none",
    );
  });

  it("inherits the SUBJECT's split verdict rather than re-deriving it", () => {
    // The verdict arrives as an argument because the price pass computed it a
    // few lines earlier over the same closes. A second evaluation would be a
    // second answer rather than a corroboration.
    const outcome = excessBaselineOf({
      ...clean([FIRST], grid(FIRST, [100, 101]), grid(FIRST, [100, 101])),
      priceRefusal: "split-discontinuity",
    });

    expect(outcome.kind).toBe("refused");
    if (outcome.kind !== "refused") return;
    expect(outcome.refusal).toBe("split-discontinuity");
    // The count travels with the refusal: *how much did you have* is the first
    // question asked of one.
    expect(outcome.sampleCount).toBe(1);
  });

  it("refuses the REFERENCE's break with its own word, not the subject's", () => {
    // `0016` §5: *this security's history crosses a price break* and *the
    // sector benchmark's does* are different sentences, repaired in different
    // places, and the second says nothing about the security on screen.
    const outcome = excessBaselineOf({
      ...clean([FIRST], grid(FIRST, [100, 101]), grid(FIRST, [100, 101])),
      referenceDiscontinuous: true,
    });

    expect(outcome.kind).toBe("refused");
    if (outcome.kind !== "refused") return;
    expect(outcome.refusal).toBe("reference-split-discontinuity");
  });

  it("reports the SUBJECT's break first where both legs are broken", () => {
    // A judgement rather than an accident: the reader is looking at the
    // security. The benchmark's break is still reported for every other
    // constituent of that sector.
    const outcome = excessBaselineOf({
      ...clean([FIRST], grid(FIRST, [100, 101]), grid(FIRST, [100, 101])),
      priceRefusal: "split-discontinuity",
      referenceDiscontinuous: true,
    });

    expect(outcome.kind).toBe("refused");
    if (outcome.kind !== "refused") return;
    expect(outcome.refusal).toBe("split-discontinuity");
  });
});

describe("seriesIsDiscontinuous — the reference leg's own guard", () => {
  it("catches a forward split and a reverse split with one number", () => {
    // `SPLIT_DISCONTINUITY_RATIO` is stated as a ratio precisely so both ends
    // come from one constant: a bound written as "±40%" catches the first and
    // misses the second.
    const forward = new Map([
      ...grid(FIRST, [100, 100]),
      ...grid(SECOND, [50, 50]),
    ]);
    const reverse = new Map([
      ...grid(FIRST, [50, 50]),
      ...grid(SECOND, [100, 100]),
    ]);

    expect(seriesIsDiscontinuous([FIRST, SECOND], forward)).toBe(true);
    expect(seriesIsDiscontinuous([FIRST, SECOND], reverse)).toBe(true);
  });

  it("admits an ordinary overnight gap just inside the band", () => {
    const inside = new Map([
      ...grid(FIRST, [100, 100]),
      // Just above the ceiling, so admitted.
      ...grid(SECOND, [SPLIT_DISCONTINUITY_RATIO * 100 + 1]),
    ]);

    expect(seriesIsDiscontinuous([FIRST, SECOND], inside)).toBe(false);
  });

  it("is silent about a violent minute INSIDE one session", () => {
    // The guard is between sessions and never inside one: a violent minute is a
    // market event and belongs in the distribution.
    expect(seriesIsDiscontinuous([FIRST], grid(FIRST, [100, 10, 100]))).toBe(
      false,
    );
  });

  it("reads nothing at all from an empty series", () => {
    expect(seriesIsDiscontinuous([FIRST, SECOND], new Map())).toBe(false);
  });
});
