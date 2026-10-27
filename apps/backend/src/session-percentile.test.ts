import { describe, expect, it } from "vitest";

import { marketSessionOn, toMarketDate } from "@marketpulse/shared";
import type { MarketSession } from "@marketpulse/shared";

import { RETURN_SPAN_MINUTES } from "./five-minute-return.js";
import { excessLegOf, sessionClosingReturn } from "./session-percentile.js";

// **The closing five-minute return, from stored closes** (Task 5.4.5).
//
// **No clock, no socket, no database** — `return-baseline.test.ts`' note
// unchanged: every input is an argument, including the session, so this module
// cannot read anything timestamped after a replay clock because it reads
// nothing at all.
//
// The properties below are `five-minute-return.test.ts`' at one remove, and
// that is deliberate: the two walks are different structures over different
// inputs and must agree about the **rule** — exactly the span apart, never the
// nearest bar, and three refusals that do not read alike.

const MS_PER_MINUTE = 60_000;

/** A real session, so the bounds are the calendar's rather than invented. */
function session(date: string): MarketSession {
  const found = marketSessionOn(toMarketDate(date));
  if (found === undefined) {
    throw new Error(`${date} is not a trading session; the fixture is wrong.`);
  }
  return found;
}

/** A full regular session, 09:30–16:00 ET. */
const REGULAR = session("2026-11-25");
/** A 13:00 early close — the session that catches a hard-coded 15:59. */
const EARLY = session("2026-11-27");

/** The instant the last minute bar of a session STARTS. */
const lastMinute = (one: MarketSession): number =>
  one.close.getTime() - MS_PER_MINUTE;

/** Closes at named offsets back from the session's last minute. */
const closesEndingAt = (
  one: MarketSession,
  prices: Readonly<Record<number, number>>,
): ReadonlyMap<number, number> => {
  const closes = new Map<number, number>();
  for (const [back, price] of Object.entries(prices)) {
    closes.set(lastMinute(one) - Number(back) * MS_PER_MINUTE, price);
  }
  return closes;
};

describe("sessionClosingReturn — the pair, and the three refusals", () => {
  it("measures the newest close against the one exactly the span before it", () => {
    const closes = closesEndingAt(REGULAR, { 0: 110, 5: 100 });

    const outcome = sessionClosingReturn({ session: REGULAR, closes });

    expect(outcome.measured).toBe(true);
    if (!outcome.measured) return;

    expect(outcome.percent).toBeCloseTo(10, 10);
    expect(outcome.spanMinutes).toBe(RETURN_SPAN_MINUTES);
    expect(outcome.to.at.getTime()).toBe(lastMinute(REGULAR));
    expect(outcome.from.at.getTime()).toBe(
      lastMinute(REGULAR) - RETURN_SPAN_MINUTES * MS_PER_MINUTE,
    );
    expect(outcome.to.price).toBe(110);
    expect(outcome.from.price).toBe(100);
  });

  it("derives the session's last minute from the session, not from 15:59", () => {
    // An early close is 13:00, so its last bar starts at 12:59. A walk anchored
    // on a regular session's bounds finds nothing here at all — which is the
    // defect this fixture exists for, and `sessionAnchors` has the same one.
    const closes = closesEndingAt(EARLY, { 0: 99, 5: 100 });

    const outcome = sessionClosingReturn({ session: EARLY, closes });

    expect(outcome.measured).toBe(true);
    if (!outcome.measured) return;
    expect(outcome.to.at.getTime()).toBe(lastMinute(EARLY));
    expect(outcome.percent).toBeCloseTo(-1, 10);
  });

  it("walks back to the newest close it HAS, rather than requiring the last minute", () => {
    // Median stored coverage is 82.8%, so a security whose last few minutes
    // are missing is ordinary rather than exceptional. The pair is still
    // exactly the span apart — it has just moved earlier.
    const closes = closesEndingAt(REGULAR, { 3: 101, 8: 100 });

    const outcome = sessionClosingReturn({ session: REGULAR, closes });

    expect(outcome.measured).toBe(true);
    if (!outcome.measured) return;
    expect(outcome.to.at.getTime()).toBe(
      lastMinute(REGULAR) - 3 * MS_PER_MINUTE,
    );
    expect(outcome.percent).toBeCloseTo(1, 10);
  });

  it("refuses `nothing-observed` where the session holds no close at all", () => {
    // Every security on CI's store, and every security with no stored `sip`
    // history: 516 securities and zero bars.
    const outcome = sessionClosingReturn({
      session: REGULAR,
      closes: new Map(),
    });

    expect(outcome).toEqual({ measured: false, refusal: "nothing-observed" });
  });

  it("refuses `no-earlier-endpoint` rather than stretching to the nearest bar", () => {
    // `ERIE`'s case, which Story 5.2 exists for: a 47-minute pair is not a
    // near miss to be tolerated, it is a bar that is not the endpoint. Here
    // the partner is one minute too far back.
    const outcome = sessionClosingReturn({
      session: REGULAR,
      closes: closesEndingAt(REGULAR, { 0: 110, 6: 100 }),
    });

    expect(outcome).toEqual({
      measured: false,
      refusal: "no-earlier-endpoint",
    });
  });

  it("refuses `no-basis` where the older close is zero", () => {
    // `changePercent`'s own branch for its own reason: the quotient is
    // `Infinity`, which formats and renders as the most alarming figure on the
    // page rather than a blank one.
    const outcome = sessionClosingReturn({
      session: REGULAR,
      closes: closesEndingAt(REGULAR, { 0: 110, 5: 0 }),
    });

    expect(outcome).toEqual({ measured: false, refusal: "no-basis" });
  });

  it("counts the minutes it holds between the endpoints, never the span", () => {
    // `observed` is counted in the walk that picked the endpoints, as
    // `fiveMinuteReturn`'s is: a count taken by a second traversal is a second
    // measurement that can disagree with the first. The newer endpoint is the
    // last of the span's minutes, so a two-bar pair is `1 of 5`.
    const sparse = sessionClosingReturn({
      session: REGULAR,
      closes: closesEndingAt(REGULAR, { 0: 110, 5: 100 }),
    });
    const dense = sessionClosingReturn({
      session: REGULAR,
      closes: closesEndingAt(REGULAR, {
        0: 110,
        1: 109,
        2: 108,
        3: 107,
        4: 106,
        5: 100,
      }),
    });

    expect(sparse.measured && sparse.observed).toBe(1);
    expect(dense.measured && dense.observed).toBe(RETURN_SPAN_MINUTES);
  });

  it("reads only this session, however much of the window it is handed", () => {
    // The pass hands it the WHOLE 60-session window's closes — the map it
    // already read — so the one thing that must not happen is a pair whose
    // older endpoint is the previous session's last minutes. An overnight gap
    // is the fattest "five-minute return" in any corpus.
    const closes = new Map(closesEndingAt(REGULAR, { 0: 110, 5: 100 }));
    const earlier = session("2026-11-24");
    closes.set(lastMinute(earlier), 10);

    const outcome = sessionClosingReturn({ session: REGULAR, closes });

    expect(outcome.measured).toBe(true);
    if (!outcome.measured) return;
    expect(outcome.from.price).toBe(100);
    expect(outcome.percent).toBeCloseTo(10, 10);
  });
});

describe("excessLegOf", () => {
  // **The adapter** (Task 5.6.6) — this figure as one leg of an excess
  // difference. `excessMoveFactor` reads four members of a leg and this type
  // spells two of them differently, because a stored close is not a bar with a
  // `BarSource` and the module header says why it must not pretend to be one.

  /** A full regular session, through the file's own calendar helper. */
  const theSession = REGULAR;

  /** A session's last six minutes of closes, so the walk finds a pair. */
  const closesEnding = (last: number, from: number, to: number) => {
    const closes = new Map<number, number>();
    for (let step = 0; step <= RETURN_SPAN_MINUTES; step += 1) {
      closes.set(last - step * 60_000, step === 0 ? to : from);
    }
    return closes;
  };

  it("renames the endpoints and drops the levels", () => {
    const last = lastMinute(theSession);
    const outcome = sessionClosingReturn({
      session: theSession,
      closes: closesEnding(last, 100, 110),
    });

    expect(outcome.measured).toBe(true);
    if (!outcome.measured) return;

    const leg = excessLegOf(outcome);
    expect(leg).toEqual({
      measured: true,
      percent: outcome.percent,
      spanMinutes: RETURN_SPAN_MINUTES,
      from: { startsAt: outcome.from.at },
      to: { startsAt: outcome.to.at },
    });

    // **The levels are deliberately absent.** The factor subtracts two
    // percentages and compares two instants; it has no business with either
    // leg's price, and carrying one would invite a second use for it.
    expect(leg).not.toHaveProperty("from.price");
    expect(leg).not.toHaveProperty("to.price");
  });

  it("carries a refusal across as nothing but the discriminant", () => {
    // Each leg's own refusal word travels to the surface on the `return`
    // frame's own half; the factor answers `no-subject-move` or
    // `no-reference-move`, one word rather than three.
    const refused = sessionClosingReturn({
      session: theSession,
      closes: new Map(),
    });

    expect(refused.measured).toBe(false);
    expect(excessLegOf(refused)).toEqual({ measured: false });
  });

  it("carries the span the figure itself carries, never a constant", () => {
    // `the-excess-numerator-spans-its-baseline` compares this against the
    // distribution's own stride, and both are read from their producers: two
    // independent constants in two modules, which is why that is a comparison
    // rather than a comment.
    const last = lastMinute(theSession);
    const outcome = sessionClosingReturn({
      session: theSession,
      closes: closesEnding(last, 100, 110),
    });
    if (!outcome.measured) return;

    const leg = excessLegOf(outcome);
    if (!leg.measured) return;
    expect(leg.spanMinutes).toBe(outcome.spanMinutes);
  });
});
