import { readFileSync } from "node:fs";
import { join } from "node:path";

import { toTicker } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { observationsIn, toMappedFrames } from "./alpaca-stream-mapping.js";
import {
  TRAILING_WINDOW_SPAN_MS,
  TRAILING_WINDOW_TOLERANCE_MS,
  createTrailingWindow,
} from "./trailing-window.js";

import type { LiveObservation } from "./market-data-stream.js";

const CORPUS = join(import.meta.dirname, "fixtures", "alpaca-stream");

/**
 * A recorded vendor frame, mapped through the REAL mapper — the same idiom
 * `current-market-state.test.ts` uses, so no observation in this file is one
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
const AAPL = toTicker("AAPL");

/** The recorded bar, at 14:01Z, as the base every instant below is spread off. */
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
    bar: {
      ...recorded.bar,
      startsAt: new Date(`2026-09-16T${minute}:00.000Z`),
      close,
    },
  };
};

const instantsIn = (held: readonly LiveObservation[]): readonly string[] =>
  held.map((observation) => observation.bar.startsAt.toISOString());

describe("the trailing window (Task 5.2.1)", () => {
  it("is written by a real batch and read back with nothing attached", () => {
    // The whole reason this module exists: `currentMarketState` is latest-only,
    // so after two bars it can answer *what is NVDA's price* and cannot answer
    // *what was it five minutes ago*. This can.
    const window = createTrailingWindow();

    window.record(observationsFrom("bar-nvda"));

    expect(window.size()).toBe(1);
    expect(window.depth(NVDA)).toBe(1);
    expect(window.read(NVDA)[0]?.bar.close).toBe(214.75);
  });

  it("answers an empty window for a security it has never seen", () => {
    // An empty window is a **legitimate value, not a degraded one** (Story
    // 3.5's property 4, and Gate 1 decision 3's reason for no store fill).
    // `observed 0 of 5` has to render, so this must not throw or invent a bar.
    const window = createTrailingWindow();
    window.record(observationsFrom("bar-nvda"));

    expect(window.read(AAPL)).toEqual([]);
    expect(window.depth(AAPL)).toBe(0);
    expect(() => window.read(AAPL)).not.toThrow();
  });

  it("holds the bar from five minutes ago, which is the one figure it exists for", () => {
    const window = createTrailingWindow();

    window.record([at("14:00", 200)]);
    window.record([at("14:05", 210)]);

    const held = window.read(NVDA);
    expect(instantsIn(held)).toEqual([
      "2026-09-16T14:00:00.000Z",
      "2026-09-16T14:05:00.000Z",
    ]);
    // Task 5.2.2's pure function takes exactly this array and an `asOf`. The
    // window does no arithmetic — these are the two endpoints, nothing more.
    expect(held[0]?.bar.close).toBe(200);
    expect(held[1]?.bar.close).toBe(210);
  });

  describe("eviction is keyed on each bar's own `startsAt`, never on count", () => {
    it("drops the OLDEST BAR rather than the oldest insertion when a revision interleaves", () => {
      // **Done-when 2, and the test the task was written around.**
      //
      // Insert 14:03, then a revision for 14:02, then advance to 14:09. The
      // insertion order is `14:03, 14:02, 14:04, …`; the instant order is
      // `14:02, 14:03, 14:04, …`. An eviction that drops *oldest inserted* —
      // a FIFO ring buffer, which is the obvious implementation — evicts
      // **14:03** and keeps 14:02, and goes red here.
      const window = createTrailingWindow();

      window.record([at("14:03", 203)]);
      window.record([at("14:02", 202)]);
      for (const minute of ["14:04", "14:05", "14:06", "14:07", "14:08"]) {
        window.record([at(minute, 200)]);
      }
      window.record([at("14:09", 209)]);

      // Newest is 14:09; the cutoff is 14:09 − (5 min + 90 s) = 14:02:30, so
      // 14:02 is out and 14:03 is in — by instant, not by arrival.
      expect(instantsIn(window.read(NVDA))).toEqual([
        "2026-09-16T14:03:00.000Z",
        "2026-09-16T14:04:00.000Z",
        "2026-09-16T14:05:00.000Z",
        "2026-09-16T14:06:00.000Z",
        "2026-09-16T14:07:00.000Z",
        "2026-09-16T14:08:00.000Z",
        "2026-09-16T14:09:00.000Z",
      ]);
      // ε = 90 s is **depth 7 worst case**, which is the depth the memory
      // figure in this task's record is quoted against.
      expect(window.depth(NVDA)).toBe(7);
    });

    it("keeps a sparse security's bars for hours rather than counting to six", () => {
      // The reason eviction is not a count. `ERIE` is measured at **2.1%**
      // minute coverage; a capacity of six on it holds six bars spanning
      // hours, and AC 3 then has to refuse a figure from a window that **looks
      // full**. Keyed on instants, the sparse security simply holds one bar.
      const window = createTrailingWindow();

      window.record([at("14:00", 200)]);
      window.record([at("15:00", 260)]);

      expect(instantsIn(window.read(NVDA))).toEqual([
        "2026-09-16T15:00:00.000Z",
      ]);
    });

    it("keeps the earlier endpoint across the 29.1–30.1 s a revision takes to arrive", () => {
      // **Why ε is not zero, with a control that fires.** A bar is not final
      // for ~30 s, so a reader computing the last *settled* five minutes asks
      // `asOf` the newest-but-one bar — here 14:05, while 14:06 has arrived and
      // its revision has not. That needs **14:00**.
      //
      // Trimmed to exactly five minutes, 14:06's arrival puts the cutoff at
      // 14:01 and 14:00 is gone. ε = 90 s keeps it.
      const window = createTrailingWindow();
      const exact = createTrailingWindow({ toleranceMs: 0 });

      const minutes = [
        "14:00",
        "14:01",
        "14:02",
        "14:03",
        "14:04",
        "14:05",
        "14:06",
      ];
      for (const w of [window, exact]) {
        for (const minute of minutes) w.record([at(minute, 200)]);
      }

      expect(instantsIn(window.read(NVDA))[0]).toBe("2026-09-16T14:00:00.000Z");
      expect(window.depth(NVDA)).toBe(7);

      // The control: ε = 0 loses exactly that endpoint, which is the defect the
      // constant records rather than a hypothetical.
      expect(instantsIn(exact.read(NVDA))).not.toContain(
        "2026-09-16T14:00:00.000Z",
      );
      expect(exact.depth(NVDA)).toBe(6);

      expect(TRAILING_WINDOW_SPAN_MS).toBe(300_000);
      expect(TRAILING_WINDOW_TOLERANCE_MS).toBe(90_000);
    });
  });

  describe("it never walks backwards and never imputes", () => {
    it("holds one bar per minute when a revision arrives for the newest minute", () => {
      // §14.1: revisions are 0.1062% of bars, **37.6% of them change the
      // close** and not one changes nothing. A window that appended would hold
      // two bars for one minute — a return computed over a duplicate endpoint.
      const window = createTrailingWindow();

      window.record(observationsFrom("bar-nvda"));
      window.record(observationsFrom("bar-nvda-revision-close-changed"));

      expect(window.depth(NVDA)).toBe(1);
      expect(window.read(NVDA)[0]?.bar.close).toBe(214.71);
      expect(window.read(NVDA)[0]?.bar.volume).toBe(5284);
    });

    it("never walks backwards, because `applied` has already decided that", () => {
      // **Inherited rather than re-implemented.** The supersede rule lives in
      // `current-market-state.ts` and is acted on there; this window is fed
      // `observed.applied`, which that rule has already filtered. So the
      // assertion here is about the window's *newest* bar never regressing —
      // which it cannot, because the newest is the last element of an
      // instant-ordered array.
      const window = createTrailingWindow();

      window.record([at("14:04", 204)]);
      window.record([at("14:02", 202)]);

      const held = window.read(NVDA);
      expect(held[held.length - 1]?.bar.startsAt.toISOString()).toBe(
        "2026-09-16T14:04:00.000Z",
      );
    });

    it("records a GAP as an absence — asserted as an absence, not a presence", () => {
      // **Done-when 3's harder half, and the one nothing in this repository
      // currently does.** 14:02 and 14:05 arrive; 14:03 and 14:04 never did.
      // The window must hold **two** bars and no interpolation between them.
      // An imputing implementation looks identical on every assertion about
      // what is present.
      const window = createTrailingWindow();

      window.record([at("14:02", 202)]);
      window.record([at("14:05", 205)]);

      const instants = instantsIn(window.read(NVDA));
      expect(instants).toHaveLength(2);
      expect(instants).not.toContain("2026-09-16T14:03:00.000Z");
      expect(instants).not.toContain("2026-09-16T14:04:00.000Z");
      expect(window.depth(NVDA)).toBe(2);
    });
  });

  it("keeps each security's window separate", () => {
    const window = createTrailingWindow();

    window.record([at("14:02", 202)]);
    window.record([{ ...at("14:03", 303), symbol: AAPL }]);

    expect(window.size()).toBe(2);
    expect(window.depth(NVDA)).toBe(1);
    expect(window.depth(AAPL)).toBe(1);
  });

  it("hands the reader a copy rather than the array it is about to splice", () => {
    // The writer `splice`s on every eviction. Handing out the live array would
    // mutate a window a pure function was part-way through reading.
    const window = createTrailingWindow();
    window.record([at("14:02", 202)]);

    const held = window.read(NVDA);
    window.record([at("15:00", 260)]);

    expect(held).toHaveLength(1);
    expect(window.depth(NVDA)).toBe(1);
    expect(held[0]?.bar.startsAt.toISOString()).toBe(
      "2026-09-16T14:02:00.000Z",
    );
  });

  it("carries each bar's own source, so the tape travels with the number", () => {
    // Every bar here arrives from one `iex` stream, so a return computed from
    // this window is `iex`-over-`iex` **by construction**. Invariant 6 then
    // requires the drawing surface to say so, which is Task 5.2.3's.
    const window = createTrailingWindow();
    window.record(observationsFrom("bar-nvda"));

    expect(window.read(NVDA)[0]?.source).toBeDefined();
  });
});
