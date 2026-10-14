// The baseline's arithmetic (Task 5.3.2).
//
// Everything here is a property of a pure function over two arguments, so there
// is no database, no clock and no socket. What `pnpm test:database` adds is the
// two things a fixture in this file cannot have: a `feed` predicate asserted
// against rows of **both** tapes, and the `loadedFor` case driven through a real
// stored generation.
//
// **The four assertions worth reading first**, because each is somebody's
// recorded defect rather than a coverage exercise:
//
//   1. **No sample crosses a session boundary.** An overnight gap is the
//      fattest "five-minute return" in any corpus and a naive `lag(close, 5)`
//      produces 59 of them in a 60-session window.
//   2. **An extreme close appears ONCE, not five times.** This is the
//      non-overlapping grid asserted by MULTIPLICITY rather than by a count,
//      because an overlapping grid gives a *more* plausible `n` and nearly the
//      same breakpoints — so a count cannot tell them apart and this can.
//   3. **`n` is counted, with an early close in the fixture**, which is where
//      `78 × 60` fails the second of its three ways.
//   4. **The split guard refuses a 4:1 discontinuity** and admits an ordinary
//      overnight gap.

import { describe, expect, it } from "vitest";

import {
  BASELINE_BREAKPOINT_COUNT,
  SPLIT_DISCONTINUITY_RATIO,
  marketSessionOn,
  toMarketDate,
  type MarketSession,
} from "@marketpulse/shared";

import {
  baselineSamples,
  breakpointsOf,
  returnBaselineOf,
  sessionAnchors,
} from "./return-baseline.js";

/**
 * A regular session and an **early close two sessions later**, with
 * Thanksgiving between them.
 *
 * Deliberately not two adjacent weekdays: 2026-11-26 is closed, so this fixture
 * also drives *a holiday contributes no anchors rather than being spanned*.
 */
const REGULAR = session("2026-11-25");
const EARLY = session("2026-11-27");

function session(date: string): MarketSession {
  const found = marketSessionOn(toMarketDate(date));
  if (found === undefined) {
    throw new Error(
      `${date} is not a trading session, so the fixture is wrong.`,
    );
  }
  return found;
}

/** Every anchor of these sessions at one flat price. */
function flat(
  sessions: readonly MarketSession[],
  price: number,
): Map<number, number> {
  const closes = new Map<number, number>();
  for (const one of sessions) {
    for (const anchor of sessionAnchors(one))
      closes.set(anchor.getTime(), price);
  }
  return closes;
}

describe("sessionAnchors", () => {
  it("anchors 78 minutes of a regular session and 42 of an early close", () => {
    // 390 minute bars run 09:30 through 15:59 inclusive, so the last anchor is
    // 15:55: `floor(389 / 5) + 1 = 78`. The pairs BETWEEN them are 77, which is
    // the first of the three ways `78 × 60 = 4,680` is wrong.
    expect(REGULAR.minuteBars).toBe(390);
    expect(sessionAnchors(REGULAR)).toHaveLength(78);

    expect(EARLY.isEarlyClose).toBe(true);
    expect(EARLY.minuteBars).toBe(210);
    expect(sessionAnchors(EARLY)).toHaveLength(42);
  });

  it("anchors on the session's own open, five minutes apart", () => {
    const anchors = sessionAnchors(REGULAR);

    expect(anchors[0]?.getTime()).toBe(REGULAR.open.getTime());
    expect((anchors[1]?.getTime() ?? 0) - REGULAR.open.getTime()).toBe(300_000);
    // The last anchor is inside the session, never at or past its close.
    expect(anchors[77]?.getTime()).toBeLessThan(REGULAR.close.getTime());
  });
});

describe("returnBaselineOf — n is counted", () => {
  it("counts 77 + 41 samples over a regular session and an early close", () => {
    const outcome = returnBaselineOf({
      sessions: [REGULAR, EARLY],
      closes: flat([REGULAR, EARLY], 100),
    });

    // **The assertion that no constant can satisfy.** 78 + 42 anchors yield
    // 77 + 41 = 118 increments, and `(78 + 42) × 1` would be 120. The early
    // close is in the fixture precisely so a writer who computed `anchors ×
    // sessions` cannot pass.
    expect(outcome.kind).toBe("measured");
    if (outcome.kind !== "measured") return;
    expect(outcome.sampleCount).toBe(77 + 41);
  });

  it("counts only the pairs it found, not the pairs the grid allows", () => {
    const closes = flat([REGULAR], 100);
    // Median stored coverage is 82.8%, so grid partners are routinely absent.
    // Drop four anchors; each loss costs the pair before it and the pair after
    // it, except where the losses are adjacent.
    const anchors = sessionAnchors(REGULAR);
    for (const index of [10, 20, 30, 40]) {
      closes.delete(anchors[index]?.getTime() ?? 0);
    }

    const outcome = returnBaselineOf({ sessions: [REGULAR], closes });

    expect(outcome.kind).toBe("measured");
    if (outcome.kind !== "measured") return;
    // Four interior anchors removed, each destroying two pairs and sharing
    // none: 77 − 8.
    expect(outcome.sampleCount).toBe(77 - 8);
  });

  it("answers `none` for a security with no stored closes at all", () => {
    // CI's permanent state: 516 securities and zero bars. **No row is written**
    // — *the pass has not reached this security* and *the pass reached it and
    // will not answer* are different facts.
    expect(
      returnBaselineOf({ sessions: [REGULAR], closes: new Map() }).kind,
    ).toBe("none");
  });
});

describe("returnBaselineOf — no sample crosses a session boundary", () => {
  it("does not pair the last minute of one session with the first of the next", () => {
    // Every anchor of both sessions is flat at 100 EXCEPT the first anchor of
    // the second session, which is 50. A sampler that spanned the boundary
    // would produce a −50% sample from the overnight gap; one that does not
    // produces the two samples INSIDE the second session that touch it.
    const closes = flat([REGULAR, EARLY], 100);
    const earlyAnchors = sessionAnchors(EARLY);
    closes.set(earlyAnchors[0]?.getTime() ?? 0, 50);

    const outcome = returnBaselineOf({ sessions: [REGULAR, EARLY], closes });

    // The guard fires on exactly this shape, which is the point — a jump across
    // the boundary is a corporate action far more often than a move — so the
    // sample count is still the right thing to read, and it is unchanged.
    expect(outcome.kind).toBe("refused");
    if (outcome.kind !== "refused") return;
    expect(outcome.sampleCount).toBe(77 + 41);
  });

  it("produces no sample at all from two sessions with one anchor each", () => {
    // One anchor in each session: within a session a lone anchor has no
    // partner, and across sessions there is no pairing expression at all. A
    // sampler that walked a flat ordered list would find exactly one pair here
    // — the overnight one — and would be wrong by the width of a night.
    const closes = new Map<number, number>([
      [REGULAR.open.getTime(), 100],
      [EARLY.open.getTime(), 100],
    ]);

    expect(returnBaselineOf({ sessions: [REGULAR, EARLY], closes }).kind).toBe(
      "none",
    );
  });
});

describe("returnBaselineOf — the grid is non-overlapping, by multiplicity", () => {
  /** Samples that are not a flat 0%, which is every sample the spike reaches. */
  const reached = (closes: Map<number, number>): readonly number[] =>
    baselineSamples({ sessions: [REGULAR], closes }).magnitudes.filter(
      (magnitude) => magnitude > 1e-9,
    );

  it("lets one extreme close reach exactly ONE sample, not five", () => {
    // **The assertion a count cannot make**, and the whole reason
    // `baselineSamples` is exported. The spike is on the session's LAST anchor,
    // so on a non-overlapping grid it is the `to` of one pair and the `from` of
    // none. On a grid aligned to every minute — the shape AC 3 forbids and the
    // shape a `lag(close, 5)` produces — the same close is the `to` of FIVE,
    // and `n` would read 385 rather than 77: a *more* plausible number, which
    // is exactly why the count is not the test.
    const closes = flat([REGULAR], 100);
    const anchors = sessionAnchors(REGULAR);
    closes.set(anchors[77]?.getTime() ?? 0, 120);

    const touched = reached(closes);

    expect(touched).toHaveLength(1);
    expect(touched[0]).toBeCloseTo(20, 6);
  });

  it("caps the multiplicity of an interior close at TWO, against ten", () => {
    // An interior anchor is the `to` of one pair and the `from` of the next, so
    // two samples is the maximum this grid permits anywhere. An overlapping
    // grid's maximum is **ten** — five as a numerator and five as a
    // denominator — so the two numbers are five apart at every position, which
    // is the serial correlation AC 3 refuses stated as a fact about one close.
    const closes = flat([REGULAR], 100);
    const anchors = sessionAnchors(REGULAR);
    closes.set(anchors[40]?.getTime() ?? 0, 120);

    const touched = reached(closes);

    expect(touched).toHaveLength(2);
    // +20% up into the spike, then −16.67% out of it.
    expect(touched[0]).toBeCloseTo(20, 6);
    expect(touched[1]).toBeCloseTo(100 / 6, 6);
  });

  it("and the breakpoints of a one-spike sample do NOT show the multiplicity", () => {
    // Kept as a recorded correction rather than deleted. The first draft of
    // this file asserted the property off the breakpoints and claimed the 99th
    // would be `0`; it is **4.8**, because the 99th of 77 samples interpolates
    // at position 75.24 and reaches into the top order statistic. The
    // arithmetic was wrong, not the grid — and a reader reaching for the same
    // shortcut should see why it does not work.
    const closes = flat([REGULAR], 100);
    const anchors = sessionAnchors(REGULAR);
    closes.set(anchors[77]?.getTime() ?? 0, 120);

    const outcome = returnBaselineOf({ sessions: [REGULAR], closes });
    expect(outcome.kind).toBe("measured");
    if (outcome.kind !== "measured") return;

    expect(outcome.breakpoints[100]).toBeCloseTo(20, 6);
    expect(outcome.breakpoints[99]).toBeCloseTo(4.8, 6);
    expect(outcome.breakpoints[98]).toBeCloseTo(0, 6);
  });
});

describe("returnBaselineOf — the split guard", () => {
  const overnight = (ratio: number): ReturnType<typeof returnBaselineOf> => {
    const closes = flat([REGULAR], 100);
    for (const anchor of sessionAnchors(EARLY)) {
      closes.set(anchor.getTime(), 100 * ratio);
    }
    return returnBaselineOf({ sessions: [REGULAR, EARLY], closes });
  };

  it("refuses a 4:1 split", () => {
    const outcome = overnight(0.25);

    expect(outcome.kind).toBe("refused");
    if (outcome.kind !== "refused") return;
    expect(outcome.refusal).toBe("split-discontinuity");
  });

  it("refuses a 2:1 split, which is the smallest action it must catch", () => {
    expect(overnight(0.5).kind).toBe("refused");
  });

  it("refuses a 1:2 reverse split, which no percentage ceiling below 100 can", () => {
    // The whole reason the ceiling is a RATIO: a reverse split is `+100%`, and
    // a bound written as "±40%" catches the forward split and misses this.
    expect(overnight(2).kind).toBe("refused");
  });

  it("admits an ordinary overnight gap", () => {
    // A −30% earnings collapse is the class of event this must not refuse, and
    // it is well inside `0.6`.
    expect(overnight(0.7).kind).toBe("measured");
    expect(overnight(1.3).kind).toBe("measured");
    // The constant is the boundary itself, so state which side is which: the
    // bound is inclusive on the refusing side.
    expect(overnight(SPLIT_DISCONTINUITY_RATIO).kind).toBe("refused");
    expect(overnight(SPLIT_DISCONTINUITY_RATIO + 0.01).kind).toBe("measured");
  });

  it("does not refuse a violent move INSIDE a session", () => {
    // A halt and resume inside one session is a market event and belongs in the
    // distribution. The guard looks only across boundaries.
    const closes = flat([REGULAR], 100);
    const anchors = sessionAnchors(REGULAR);
    for (let index = 40; index < 78; index += 1) {
      closes.set(anchors[index]?.getTime() ?? 0, 20);
    }

    expect(returnBaselineOf({ sessions: [REGULAR], closes }).kind).toBe(
      "measured",
    );
  });
});

describe("breakpointsOf", () => {
  it("answers 101 ascending magnitudes, with the 0th and 100th the extremes", () => {
    const breakpoints = breakpointsOf([3, 1, 2, 4]);

    expect(breakpoints).toHaveLength(BASELINE_BREAKPOINT_COUNT);
    expect(breakpoints[0]).toBe(1);
    expect(breakpoints[100]).toBe(4);
    for (let rank = 1; rank < BASELINE_BREAKPOINT_COUNT; rank += 1) {
      expect(breakpoints[rank]).toBeGreaterThanOrEqual(
        breakpoints[rank - 1] ?? 0,
      );
    }
  });

  it("interpolates linearly, which is the definition 5.3.3 has to invert", () => {
    // `[0, 10]`: the 50th sits halfway between the two order statistics.
    expect(breakpointsOf([0, 10])[50]).toBeCloseTo(5, 6);
  });

  it("refuses an empty sample rather than answering zeroes", () => {
    // 101 zeroes is a well-formed distribution saying *every move is ordinary*,
    // which is the single most misleading answer available here.
    expect(() => breakpointsOf([])).toThrow(/empty sample/u);
  });
});
