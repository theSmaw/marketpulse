import { readFileSync } from "node:fs";
import { join } from "node:path";

import { toTicker } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { observationsIn, toMappedFrames } from "./alpaca-stream-mapping.js";
import { RETURN_SPAN_MINUTES, fiveMinuteReturn } from "./five-minute-return.js";
import {
  TRAILING_WINDOW_SPAN_MS,
  createTrailingWindow,
} from "./trailing-window.js";

import type { LiveObservation } from "./market-data-stream.js";

const CORPUS = join(import.meta.dirname, "fixtures", "alpaca-stream");

/**
 * A recorded vendor frame, mapped through the REAL mapper — `trailing-window`'s
 * and `current-market-state`'s idiom, so no observation in this file is one
 * somebody typed.
 */
const observationsFrom = (name: string): readonly LiveObservation[] =>
  observationsIn(
    toMappedFrames(
      JSON.parse(readFileSync(join(CORPUS, `${name}.json`), "utf8")),
      "2026-09-16T14:02:00.000Z",
    ),
  );

const NVDA = toTicker("NVDA");

const recordedBar = (): LiveObservation => {
  const [recorded] = observationsFrom("bar-nvda");
  if (recorded === undefined) throw new Error("fixture produced no bar");
  return recorded;
};

/** The recorded bar moved to a chosen minute, with a distinguishable close. */
const at = (minute: string, close: number): LiveObservation => {
  const recorded = recordedBar();
  return {
    ...recorded,
    bar: { ...recorded.bar, startsAt: instant(minute), close },
  };
};

const instant = (minute: string): Date =>
  new Date(`2026-09-16T${minute}:00.000Z`);

/** Through the SHIPPED window, so what the selection reads is what it serves. */
const windowOf = (
  observations: readonly LiveObservation[],
): readonly LiveObservation[] => {
  const window = createTrailingWindow();
  window.record(observations);
  return window.read(NVDA);
};

describe("the 5-minute return (Task 5.2.2)", () => {
  it("is five minutes, read off the window's own span rather than spelled again", () => {
    // Two independent `5`s is the shape where the window retains four minutes
    // while the return asks for five, and the figure refuses for ever with
    // nothing on screen wrong.
    expect(RETURN_SPAN_MINUTES).toBe(5);
    expect(RETURN_SPAN_MINUTES * 60_000).toBe(TRAILING_WINDOW_SPAN_MS);
  });

  describe("the figure", () => {
    it("measures between two bars exactly the span apart", () => {
      const window = windowOf([
        at("14:00", 100),
        at("14:01", 101),
        at("14:02", 102),
        at("14:03", 103),
        at("14:04", 104),
        at("14:05", 110),
      ]);

      const answer = fiveMinuteReturn(window, { asOf: instant("14:05") });

      expect(answer).toStrictEqual({
        measured: true,
        percent: 10,
        from: {
          startsAt: instant("14:00"),
          close: 100,
          source: recordedBar().source,
        },
        to: {
          startsAt: instant("14:05"),
          close: 110,
          source: recordedBar().source,
        },
        observed: 5,
        spanMinutes: 5,
        // **The numerator the volume factor divides**, summed in this same
        // pass (Task 5.5.4): five copies of the recorded bar's own volume,
        // because `at()` moves one fixture bar to five minutes. The 14:00
        // anchor is NOT in it — see the block at the foot of this file.
        volume: 5 * recordedBar().bar.volume,
      });
    });

    it("is signed, and a fall is a fall", () => {
      const window = windowOf([at("14:00", 200), at("14:05", 190)]);

      const answer = fiveMinuteReturn(window, { asOf: instant("14:05") });

      expect(answer).toMatchObject({ measured: true, percent: -5 });
    });

    it("carries the instant of the OLDEST endpoint, which is the only thing distinguishing a 5-minute return from a 47-minute one", () => {
      const window = windowOf([at("14:00", 100), at("14:05", 101)]);

      const answer = fiveMinuteReturn(window, { asOf: instant("14:05") });

      expect(answer).toMatchObject({
        from: { startsAt: instant("14:00") },
        to: { startsAt: instant("14:05") },
      });
    });
  });

  describe("the refusal, which lives in the selection", () => {
    it("refuses a pair FORTY-SEVEN minutes apart — `ERIE` at 2.1% minute coverage", () => {
      // The story's own case, by name. Two real bars, correctly ordered, and
      // the only thing wrong with the figure a stretch would produce is a
      // factor nobody can see: it would be well-formed, correctly-signed and
      // correctly-coloured.
      //
      // **Not through `windowOf`, deliberately.** The shipped window would
      // evict the 13:18 bar on the 14:05 arrival — span + ε is 6m 30s — and
      // the refusal would then be a property of eviction rather than of the
      // selection. The pair is handed over whole so it is the SELECTION that
      // refuses it, which is where AC 3 puts the refusal.
      const window = [at("13:18", 100), at("14:05", 110)];

      const answer = fiveMinuteReturn(window, { asOf: instant("14:05") });

      expect(answer).toMatchObject({
        measured: false,
        refusal: "no-earlier-endpoint",
      });
    });

    it("refuses four minutes and six minutes — not the nearest bar, and never stretched", () => {
      const four = windowOf([at("14:01", 100), at("14:05", 110)]);
      const six = windowOf([at("13:59", 100), at("14:05", 110)]);

      expect(fiveMinuteReturn(four, { asOf: instant("14:05") })).toMatchObject({
        measured: false,
        refusal: "no-earlier-endpoint",
      });
      expect(fiveMinuteReturn(six, { asOf: instant("14:05") })).toMatchObject({
        measured: false,
        refusal: "no-earlier-endpoint",
      });
    });

    it("refuses with NO FIGURE rather than a zero", () => {
      const answer = fiveMinuteReturn(windowOf([at("14:05", 110)]), {
        asOf: instant("14:05"),
      });

      expect(answer).not.toHaveProperty("percent");
      expect(answer).not.toHaveProperty("from");
      expect(answer).not.toHaveProperty("to");
    });

    it("carries the ONE instant it has, and the count, beside the refusal", () => {
      // **Amended 2026-10-14 (Task 5.2.4).** This assertion read
      // `not.toHaveProperty("observed")` until that task, on the argument that
      // a refusal has no digits — and the first half of that is still true and
      // is asserted above: there is no `percent` and no pair. What was wrong
      // is the second half. A refusal carrying nothing at all draws the same
      // picture whether the window held one bar or none, so *we have one bar
      // and no pair* and *we have heard nothing* became the two facts that
      // look identical — which is exactly what Story 5.1 shipped collapsed for
      // a day one region down.
      //
      // The count is under `seen` rather than beside `refusal`, which is the
      // part that keeps the first half honest: there are no digits in the
      // **figure**, and what has digits is a separate member describing what
      // the window held.
      const answer = fiveMinuteReturn(windowOf([at("14:05", 110)]), {
        asOf: instant("14:05"),
      });

      expect(answer).toMatchObject({
        measured: false,
        refusal: "no-earlier-endpoint",
        seen: {
          newest: { startsAt: instant("14:05"), close: 110 },
          observed: 1,
          spanMinutes: 5,
        },
      });
    });

    it("counts every minute it saw inside the span, not just the newest", () => {
      // Three bars inside the span and no bar at the span's start: the count
      // is the walk's own, and `observed 3 of 5 minutes` is a different
      // sentence from `observed 1 of 5 minutes` on a screen where both are
      // refusals.
      const window = windowOf([
        at("14:03", 100),
        at("14:04", 101),
        at("14:05", 102),
      ]);

      expect(
        fiveMinuteReturn(window, { asOf: instant("14:05") }),
      ).toMatchObject({
        refusal: "no-earlier-endpoint",
        seen: { observed: 3 },
      });
    });

    it("carries NOTHING beside *nothing observed*, which is the structural half", () => {
      // The two refusals differ in the **shape** of the answer rather than
      // only in a word, so a surface cannot draw an instant for a window that
      // held none, and a renderer that tried would have nothing to draw it
      // from.
      expect(fiveMinuteReturn([], { asOf: instant("14:05") })).toStrictEqual({
        measured: false,
        refusal: "nothing-observed",
        seen: undefined,
      });
    });

    it("refuses an empty window as *nothing observed*, which is an ordinary answer", () => {
      expect(fiveMinuteReturn([], { asOf: instant("14:05") })).toMatchObject({
        measured: false,
        refusal: "nothing-observed",
      });
    });

    it("refuses when every bar is newer than `asOf`", () => {
      const window = windowOf([at("14:04", 100), at("14:05", 110)]);

      expect(
        fiveMinuteReturn(window, { asOf: instant("13:00") }),
      ).toMatchObject({ measured: false, refusal: "nothing-observed" });
    });

    it("refuses a zero basis rather than dividing by it", () => {
      const window = windowOf([at("14:00", 0), at("14:05", 110)]);

      expect(
        fiveMinuteReturn(window, { asOf: instant("14:05") }),
      ).toMatchObject({ measured: false, refusal: "no-basis" });
    });

    it("has no `(earlier, later)` entry point a caller could assemble wrongly", async () => {
      // The module's one export that produces a figure takes a WINDOW. A
      // function taking a pair is a function that returns a 47-minute figure
      // for a caller that picked the oldest bar it had, and no test of the
      // arithmetic can catch that — so the arity is the check.
      const module: Record<string, unknown> =
        await import("./five-minute-return.js");

      const functions = Object.entries(module).filter(
        ([, value]) => typeof value === "function",
      );

      expect(functions.map(([name]) => name)).toStrictEqual([
        "fiveMinuteReturn",
      ]);
      expect(fiveMinuteReturn.length).toBe(2);
    });
  });

  describe("`observed k of 5`, from the same pass that produced the figure", () => {
    it("counts three of five when the endpoints are exactly five apart and the middle has gaps", () => {
      // The first of the two partials, and it is a LEGITIMATE figure: the
      // endpoints are sound, so the move is a real five-minute move, and what
      // the count says is how much of the interval we actually heard.
      // Three of the five minutes the move covers — 14:02, 14:03 and 14:05 —
      // with 14:01 and 14:04 never heard. 14:00 is the anchor rather than one
      // of the five.
      const window = windowOf([
        at("14:00", 100),
        at("14:02", 101),
        at("14:03", 102),
        at("14:05", 110),
      ]);

      expect(
        fiveMinuteReturn(window, { asOf: instant("14:05") }),
      ).toMatchObject({ measured: true, percent: 10, observed: 3 });
    });

    it("counts the two endpoints alone as one", () => {
      const window = windowOf([at("14:00", 100), at("14:05", 110)]);

      expect(
        fiveMinuteReturn(window, { asOf: instant("14:05") }),
      ).toMatchObject({ observed: 1 });
    });

    it("never counts a bar OUTSIDE the span, including the window's own ε tail", () => {
      // `read()` returns span + ε — 90 s of tolerance — so some of what the
      // selection is handed is outside the five minutes by construction. A
      // count over the array's extent would read 7 of 5.
      const window = windowOf([
        at("13:57", 90),
        at("13:58", 91),
        at("13:59", 92),
        at("14:00", 100),
        at("14:01", 101),
        at("14:02", 102),
        at("14:03", 103),
        at("14:04", 104),
        at("14:05", 110),
      ]);

      expect(window.length).toBeGreaterThan(RETURN_SPAN_MINUTES + 1);
      expect(
        fiveMinuteReturn(window, { asOf: instant("14:05") }),
      ).toMatchObject({ observed: 5, from: { startsAt: instant("14:00") } });
    });

    it("is never a second count: the figure and the count move together", () => {
      // One pass produces both, so there is no pair of numbers that can
      // disagree. Removing an interior minute changes the count and leaves the
      // figure exactly where it was, because the endpoints did not move.
      const whole = windowOf([
        at("14:00", 100),
        at("14:01", 101),
        at("14:02", 102),
        at("14:03", 103),
        at("14:04", 104),
        at("14:05", 110),
      ]);
      const gapped = windowOf([
        at("14:00", 100),
        at("14:02", 102),
        at("14:03", 103),
        at("14:05", 110),
      ]);

      const first = fiveMinuteReturn(whole, { asOf: instant("14:05") });
      const second = fiveMinuteReturn(gapped, { asOf: instant("14:05") });

      expect(first).toMatchObject({ percent: 10, observed: 5 });
      expect(second).toMatchObject({ percent: 10, observed: 3 });
    });
  });

  describe("what it does not do", () => {
    it("applies no staleness threshold — a pair 187 minutes old is still a five-minute return", () => {
      // AC 6: the connection has one home and a quiet security is an age
      // rather than a verdict. The measured ordinary maximum gap is 187
      // minutes, which is what any threshold would have had to spare. The
      // instants are what the surface states.
      const window = windowOf([at("11:00", 100), at("11:05", 110)]);

      expect(
        fiveMinuteReturn(window, { asOf: instant("14:05") }),
      ).toMatchObject({
        measured: true,
        percent: 10,
        from: { startsAt: instant("11:00") },
        to: { startsAt: instant("11:05") },
      });
    });

    it("reads no clock: the same window and the same `asOf` answer the same thing twice", () => {
      const window = windowOf([at("14:00", 100), at("14:05", 110)]);

      expect(
        fiveMinuteReturn(window, { asOf: instant("14:05") }),
      ).toStrictEqual(fiveMinuteReturn(window, { asOf: instant("14:05") }));
    });

    it("mutates nothing it is handed", () => {
      const window = windowOf([at("14:00", 100), at("14:05", 110)]);
      const before = window.map((o) => o.bar.startsAt.toISOString());

      fiveMinuteReturn(window, { asOf: instant("14:05") });

      expect(window.map((o) => o.bar.startsAt.toISOString())).toStrictEqual(
        before,
      );
    });

    it("never infers recency from a full window", () => {
      // Eviction is relative to that security's OWN newest bar, so a security
      // silent for 187 minutes hands over a full window from 187 minutes ago.
      // `held.length` is read nowhere in the selection.
      const window = windowOf([
        at("11:00", 100),
        at("11:01", 101),
        at("11:02", 102),
        at("11:03", 103),
        at("11:04", 104),
        at("11:05", 110),
      ]);

      expect(window).toHaveLength(6);
      expect(
        fiveMinuteReturn(window, { asOf: instant("11:05") }),
      ).toMatchObject({ measured: true, observed: 5 });
    });
  });

  describe("the volume numerator, from the SAME pass (Task 5.5.4)", () => {
    /** The recorded bar at a minute, with a distinguishable volume. */
    const atVolume = (minute: string, volume: number): LiveObservation => {
      const recorded = recordedBar();
      return {
        ...recorded,
        bar: { ...recorded.bar, startsAt: instant(minute), volume },
      };
    };

    it("sums exactly the minutes `observed` counted, and not the anchor", () => {
      // The anchor at 14:00 carries a volume nothing may include: it is the
      // bar the move is measured FROM, and the five minutes the move covers
      // are 14:01 … 14:05. A sum that included it would be six minutes of
      // shares divided by five.
      const window = windowOf([
        atVolume("14:00", 1_000_000),
        atVolume("14:01", 1),
        atVolume("14:02", 2),
        atVolume("14:03", 4),
        atVolume("14:04", 8),
        atVolume("14:05", 16),
      ]);

      expect(
        fiveMinuteReturn(window, { asOf: instant("14:05") }),
      ).toMatchObject({ measured: true, observed: 5, volume: 31 });
    });

    it("counts an absent minute as absent rather than as zero shares", () => {
      // AC 4, at the one place a `?? 0` would be invisible: the sum of two
      // bars and the count of two bars have to describe the same minutes, so
      // the consumer can refuse. `Number(null)` is `0`, and a `0` here would
      // be a claim about a stock exchange.
      const window = windowOf([
        atVolume("14:00", 1_000_000),
        atVolume("14:02", 7),
        atVolume("14:05", 11),
      ]);

      expect(
        fiveMinuteReturn(window, { asOf: instant("14:05") }),
      ).toMatchObject({ measured: true, observed: 2, volume: 18 });
    });

    it("travels on a refusal that found a newer endpoint", () => {
      // `no-earlier-endpoint` says nothing about the five minutes themselves,
      // so the numerator is on `seen` — which is why the volume comparison is
      // a sibling of the return on the wire rather than a field inside its
      // measured arm.
      const window = windowOf([atVolume("14:03", 5), atVolume("14:05", 9)]);

      expect(
        fiveMinuteReturn(window, { asOf: instant("14:05") }),
      ).toMatchObject({
        measured: false,
        refusal: "no-earlier-endpoint",
        seen: { observed: 2, volume: 14 },
      });
    });

    it("has nothing to carry where nothing was observed", () => {
      // The one arm with no numerator, and it is an absence of a `seen`
      // rather than a `volume: 0`.
      expect(fiveMinuteReturn([], { asOf: instant("14:05") })).toStrictEqual({
        measured: false,
        refusal: "nothing-observed",
        seen: undefined,
      });
    });
  });

  describe("the tape", () => {
    it("carries each endpoint's own source, so the surface can say IEX", () => {
      const window = windowOf([at("14:00", 100), at("14:05", 110)]);

      const answer = fiveMinuteReturn(window, { asOf: instant("14:05") });

      expect(answer).toMatchObject({
        from: { source: { feed: "iex" } },
        to: { source: { feed: "iex" } },
      });
    });
  });
});
