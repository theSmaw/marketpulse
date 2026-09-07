import { describe, expect, it } from "vitest";

import { toTimeRange } from "./time-range.js";

const OPEN = new Date("2026-09-04T13:30:00Z");
const CLOSE = new Date("2026-09-04T20:00:00Z");

describe("toTimeRange", () => {
  it("keeps the instants it was given", () => {
    const range = toTimeRange(OPEN, CLOSE);

    expect(range.start.toISOString()).toBe("2026-09-04T13:30:00.000Z");
    expect(range.end.toISOString()).toBe("2026-09-04T20:00:00.000Z");
  });

  it("refuses a reversed range, naming both ends", () => {
    // The whole failure mode is not knowing which of the two is wrong, so the
    // message has to carry both — asserted rather than assumed.
    expect(() => toTimeRange(CLOSE, OPEN)).toThrow(RangeError);
    expect(() => toTimeRange(CLOSE, OPEN)).toThrow(
      /reversed.*2026-09-04T20:00:00\.000Z.*2026-09-04T13:30:00\.000Z/s,
    );
  });

  it("refuses a zero-width range", () => {
    // Half-open, so [t, t) contains nothing at all. The only ways to arrive at
    // one are a swapped pair that happened to be equal or an off-by-one, and an
    // empty series is a plausible-looking answer to both.
    expect(() => toTimeRange(OPEN, new Date(OPEN.getTime()))).toThrow(
      /zero-width/,
    );
  });

  it("refuses an invalid Date at either end", () => {
    // An invalid instant compares as neither before nor after anything, so it
    // slips past the ordering check below and produces an empty result at the
    // point of use rather than an error here.
    const invalid = new Date("nonsense");

    expect(() => toTimeRange(invalid, CLOSE)).toThrow(/start is an invalid/);
    expect(() => toTimeRange(OPEN, invalid)).toThrow(/end is an invalid/);
  });

  it("tiles adjacent windows without overlapping at the seam", () => {
    // This is what half-open buys, and it is the property Story 2.8's backfill
    // depends on thousands of times: the boundary instant belongs to exactly
    // one of the two windows.
    const seam = new Date("2026-09-04T14:00:00Z");
    const first = toTimeRange(OPEN, seam);
    const second = toTimeRange(seam, CLOSE);

    const inFirst =
      seam.getTime() >= first.start.getTime() &&
      seam.getTime() < first.end.getTime();
    const inSecond =
      seam.getTime() >= second.start.getTime() &&
      seam.getTime() < second.end.getTime();

    expect(inFirst).toBe(false);
    expect(inSecond).toBe(true);
  });
});
