import {
  BASELINE_MINIMUM_SAMPLE,
  toInvestigationId,
  toTicker,
} from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { breakpointsOf } from "./return-baseline.js";
import { createTrailingWindow } from "./trailing-window.js";
import {
  createReturnPercentileTool,
  toWireReturnPercentile,
} from "./tool-return-percentile.js";

import type { ToolContext } from "./analytical-tool.js";
import type { LiveObservation } from "./market-data-stream.js";
import type { PriceAnomalySources } from "./price-anomaly.js";
import type { StoredReturnBaseline } from "./return-baseline-store.js";
import type { BarSource, Ticker } from "@marketpulse/shared";

// **The price-anomaly tool, against the real arithmetic** (Task 7.2.2,
// Done-when 1 and 4). No server, no socket, no database: the trailing window
// is the shipped one fed real observations, and `fiveMinuteReturn`,
// `comparableBaseline` and `returnPercentileOf` are the real functions,
// reached through the one shared producer.
//
// Independent of every other tool's test — nothing here imports
// `tool-security-snapshot.ts` or the scripted provider.

const NVDA = toTicker("NVDA");
const PSKY = toTicker("PSKY"); // untracked since 2026-10-12 — CLAUDE.md §2.
const UNIVERSE = new Set<string>([NVDA]);

const SOURCE: BarSource = {
  provider: "fixture",
  feed: "iex",
  retrievedAt: "2026-11-19T14:06:00.000Z",
  barCount: 1,
};

const ASOF = new Date("2026-11-19T14:06:00.000Z");

const CONTEXT: ToolContext = {
  investigationId: toInvestigationId("inv-1"),
  asOf: ASOF,
  mode: "live",
};

const barAt = (minute: string, close: number): LiveObservation => ({
  symbol: NVDA,
  bar: {
    startsAt: new Date(`2026-11-19T${minute}:00.000Z`),
    open: close,
    high: close,
    low: close,
    close,
    volume: 1_000,
  },
  source: SOURCE,
  supersedes: false,
});

/** One security's window, through the shipped window rather than a literal. */
const windowOver = (
  observations: readonly LiveObservation[],
): ((symbol: Ticker) => readonly LiveObservation[]) => {
  const window = createTrailingWindow();
  window.record(observations);
  return (symbol) => window.read(symbol);
};

/**
 * **A rankable generation over a uniform sample in `[0, 1]`**, so the expected
 * ordinal is arithmetic rather than a figure copied out of a run: with 2,500
 * magnitudes evenly spread across one percentage point, the `k`th breakpoint
 * sits at `k / 100`, and a magnitude of `0.5` reaches the 50th and no higher.
 */
const UNIFORM_SAMPLES = Array.from(
  { length: BASELINE_MINIMUM_SAMPLE },
  (_unused, index) => index / (BASELINE_MINIMUM_SAMPLE - 1),
);

const rankableBaseline = (
  samples: readonly number[] = UNIFORM_SAMPLES,
): StoredReturnBaseline => ({
  symbol: NVDA,
  observedAt: new Date("2026-11-18T21:00:00.000Z"),
  lookbackSessions: 60,
  sampleCount: samples.length,
  refusal: null,
  breakpoints: breakpointsOf(samples),
});

const sourcesWith = (
  observations: readonly LiveObservation[],
  stored: StoredReturnBaseline | undefined,
): PriceAnomalySources => ({
  windowOf: windowOver(observations),
  baselineOf: () => stored,
  grid: { spanMinutes: 5, feed: "sip" },
});

/** A pair exactly five minutes apart — a measurable 0.5% move. */
const HALF_PERCENT_UP = [barAt("14:00", 100), barAt("14:05", 100.5)];

describe("calculate_return_percentile", () => {
  it("names the step rather than the function it wraps", () => {
    const tool = createReturnPercentileTool(
      sourcesWith(HALF_PERCENT_UP, rankableBaseline()),
      UNIVERSE,
    );

    expect(tool.name).toBe("calculate_return_percentile");
    expect(tool.description).toBe("Measure price anomaly");
  });

  it("ranks a real move against a real distribution, with its counted n", async () => {
    const tool = createReturnPercentileTool(
      sourcesWith(HALF_PERCENT_UP, rankableBaseline()),
      UNIVERSE,
    );

    const outcome = await tool.run({ symbol: NVDA }, CONTEXT);
    if (outcome.kind !== "ok")
      throw new Error(`expected ok, got ${outcome.kind}`);

    // The figure, signed, as `fiveMinuteReturn` measured it.
    expect(outcome.value.percent).toBeCloseTo(0.5, 10);
    expect(outcome.value.measuredFrom).toStrictEqual(
      new Date("2026-11-19T14:00:00.000Z"),
    );
    expect(outcome.value.measuredTo).toStrictEqual(
      new Date("2026-11-19T14:05:00.000Z"),
    );
    expect(outcome.value.spanMinutes).toBe(5);

    // The ranking, on the MAGNITUDE, against the uniform sample above —
    // `0.5` reaches the 50th breakpoint (`50 / 100`) and no higher.
    expect(outcome.value.rank).toBe(50);
    expect(outcome.value.aboveSample).toBe(false);
    // Counted, never a constant.
    expect(outcome.value.sampleCount).toBe(BASELINE_MINIMUM_SAMPLE);
    expect(outcome.value.baselineSpanMinutes).toBe(5);
    expect(outcome.value.baselineFeed).toBe("sip");
  });

  it("ranks a fall identically to the rise of the same size — the baseline is a magnitude", async () => {
    const down = [barAt("14:00", 100), barAt("14:05", 99.5)];
    const tool = createReturnPercentileTool(
      sourcesWith(down, rankableBaseline()),
      UNIVERSE,
    );

    const outcome = await tool.run({ symbol: NVDA }, CONTEXT);
    if (outcome.kind !== "ok") throw new Error("expected ok");

    // The sign lives on the figure; the rank does not carry it.
    expect(outcome.value.percent).toBeCloseTo(-0.5, 10);
    expect(outcome.value.rank).toBe(50);
  });

  it("answers >99th for a move above every sample the baseline holds", async () => {
    const tool = createReturnPercentileTool(
      sourcesWith(
        [barAt("14:00", 100), barAt("14:05", 105)],
        rankableBaseline(),
      ),
      UNIVERSE,
    );

    const outcome = await tool.run({ symbol: NVDA }, CONTEXT);
    if (outcome.kind !== "ok") throw new Error("expected ok");

    // Never `100` — above the highest order statistic there is no sample.
    expect(outcome.value.rank).toBe(99);
    expect(outcome.value.aboveSample).toBe(true);
  });

  it("refuses not-tracked for a symbol outside the curated universe", async () => {
    // Decided before either store is consulted — the sources here would
    // have answered a rank for any symbol they were asked about.
    const tool = createReturnPercentileTool(
      sourcesWith(HALF_PERCENT_UP, rankableBaseline()),
      UNIVERSE,
    );

    const outcome = await tool.run({ symbol: PSKY }, CONTEXT);

    expect(outcome).toStrictEqual({ kind: "refused", reason: "not-tracked" });
  });

  describe("the numerator's own refusals — is there a move to rank at all", () => {
    it("refuses nothing-observed for a security the window has never heard from", async () => {
      const tool = createReturnPercentileTool(
        sourcesWith([], rankableBaseline()),
        UNIVERSE,
      );

      const outcome = await tool.run({ symbol: NVDA }, CONTEXT);

      expect(outcome).toStrictEqual({
        kind: "refused",
        reason: "nothing-observed",
      });
    });

    it("refuses no-earlier-endpoint where no bar sits exactly five minutes back", async () => {
      // `ERIE`'s state, and the one `five-minute-return.ts` exists for: a
      // window holding bars that are not the span apart has no pair, and a
      // stretched figure would be wrong by a factor nobody can see.
      const tool = createReturnPercentileTool(
        sourcesWith(
          [barAt("14:03", 100), barAt("14:05", 100.5)],
          rankableBaseline(),
        ),
        UNIVERSE,
      );

      const outcome = await tool.run({ symbol: NVDA }, CONTEXT);

      expect(outcome).toStrictEqual({
        kind: "refused",
        reason: "no-earlier-endpoint",
      });
    });

    it("refuses no-basis where the older endpoint's close is zero", async () => {
      const tool = createReturnPercentileTool(
        sourcesWith(
          [barAt("14:00", 0), barAt("14:05", 100)],
          rankableBaseline(),
        ),
        UNIVERSE,
      );

      const outcome = await tool.run({ symbol: NVDA }, CONTEXT);

      expect(outcome).toStrictEqual({ kind: "refused", reason: "no-basis" });
    });
  });

  describe("the denominator's own refusals — is there a baseline to rank against", () => {
    it("refuses too-few-samples where no generation is loaded at all", async () => {
      // CI's permanent state, and a cold replica's first seconds.
      const tool = createReturnPercentileTool(
        sourcesWith(HALF_PERCENT_UP, undefined),
        UNIVERSE,
      );

      const outcome = await tool.run({ symbol: NVDA }, CONTEXT);

      expect(outcome).toStrictEqual({
        kind: "refused",
        reason: "too-few-samples",
      });
    });

    it("refuses too-few-samples below the stated minimum sample", async () => {
      const short = UNIFORM_SAMPLES.slice(0, BASELINE_MINIMUM_SAMPLE - 1);
      const tool = createReturnPercentileTool(
        sourcesWith(HALF_PERCENT_UP, rankableBaseline(short)),
        UNIVERSE,
      );

      const outcome = await tool.run({ symbol: NVDA }, CONTEXT);

      expect(outcome).toStrictEqual({
        kind: "refused",
        reason: "too-few-samples",
      });
    });

    it("carries split-discontinuity in the store's own word", async () => {
      const refused: StoredReturnBaseline = {
        symbol: NVDA,
        observedAt: new Date("2026-11-18T21:00:00.000Z"),
        lookbackSessions: 60,
        sampleCount: 4_620,
        refusal: "split-discontinuity",
      };
      const tool = createReturnPercentileTool(
        sourcesWith(HALF_PERCENT_UP, refused),
        UNIVERSE,
      );

      const outcome = await tool.run({ symbol: NVDA }, CONTEXT);

      expect(outcome).toStrictEqual({
        kind: "refused",
        reason: "split-discontinuity",
      });
    });

    it("takes too-few-samples for a distribution the arithmetic refused", async () => {
      // Not 101 points, which `0013_return_baselines.sql` makes
      // unrepresentable — there is no honest sentence for it, so it takes
      // the word for *nothing we can rank against* (`market-composite.ts`'s
      // treatment of the same state, inherited rather than re-decided).
      const malformed: StoredReturnBaseline = {
        symbol: NVDA,
        observedAt: new Date("2026-11-18T21:00:00.000Z"),
        lookbackSessions: 60,
        sampleCount: 4_620,
        refusal: null,
        breakpoints: [0, 0.5, 1],
      };
      const tool = createReturnPercentileTool(
        sourcesWith(HALF_PERCENT_UP, malformed),
        UNIVERSE,
      );

      const outcome = await tool.run({ symbol: NVDA }, CONTEXT);

      expect(outcome).toStrictEqual({
        kind: "refused",
        reason: "too-few-samples",
      });
    });
  });

  it("says something DIFFERENT for a silent security and an under-sampled one", async () => {
    // Done-when 4, and the whole reason the two vocabularies are not
    // collapsed: one waits for the feed, the other waits for sessions to
    // accumulate, and a single generic `refused` would send a reader to
    // repair the wrong thing.
    const silent = await createReturnPercentileTool(
      sourcesWith([], rankableBaseline()),
      UNIVERSE,
    ).run({ symbol: NVDA }, CONTEXT);

    const underSampled = await createReturnPercentileTool(
      sourcesWith(
        HALF_PERCENT_UP,
        rankableBaseline(UNIFORM_SAMPLES.slice(0, 737)),
      ),
      UNIVERSE,
    ).run({ symbol: NVDA }, CONTEXT);

    if (silent.kind !== "refused" || underSampled.kind !== "refused") {
      throw new Error("expected both to refuse");
    }
    expect(silent.reason).not.toBe(underSampled.reason);
  });

  it("selects its endpoints from the context's asOf, never from a clock", async () => {
    // Invariant 4's own hook. One window holding 14:05 and 14:10: asked as
    // of 14:11 the newer endpoint is the 14:10 bar and the pair is whole;
    // asked as of 14:06 it is the 14:05 bar, whose own partner at 14:00 the
    // window has already evicted — so the SAME sources answer two different
    // things on nothing but the instant they were asked about, which is what
    // a replay (Epic 13) sets to a past session.
    const tool = createReturnPercentileTool(
      sourcesWith(
        [barAt("14:05", 100), barAt("14:10", 100.5)],
        rankableBaseline(),
      ),
      UNIVERSE,
    );

    const asOfNow = await tool.run(
      { symbol: NVDA },
      { ...CONTEXT, asOf: new Date("2026-11-19T14:11:00.000Z") },
    );
    const asOfEarlier = await tool.run(
      { symbol: NVDA },
      { ...CONTEXT, asOf: new Date("2026-11-19T14:06:00.000Z") },
    );

    if (asOfNow.kind !== "ok") throw new Error("expected a rank as of 14:11");
    expect(asOfNow.value.measuredFrom).toStrictEqual(
      new Date("2026-11-19T14:05:00.000Z"),
    );
    expect(asOfNow.value.measuredTo).toStrictEqual(
      new Date("2026-11-19T14:10:00.000Z"),
    );
    expect(asOfEarlier).toStrictEqual({
      kind: "refused",
      reason: "no-earlier-endpoint",
    });
  });
});

describe("toWireReturnPercentile", () => {
  it("carries every field as JSON, with both instants as full instants", async () => {
    const tool = createReturnPercentileTool(
      sourcesWith(HALF_PERCENT_UP, rankableBaseline()),
      UNIVERSE,
    );
    const outcome = await tool.run({ symbol: NVDA }, CONTEXT);
    if (outcome.kind !== "ok") throw new Error("expected ok");

    const wire = toWireReturnPercentile(outcome.value);

    expect(wire).toStrictEqual({
      symbol: "NVDA",
      percent: outcome.value.percent,
      measuredFrom: "2026-11-19T14:00:00.000Z",
      measuredTo: "2026-11-19T14:05:00.000Z",
      observed: outcome.value.observed,
      spanMinutes: 5,
      rank: 50,
      aboveSample: false,
      sampleCount: BASELINE_MINIMUM_SAMPLE,
      baselineSpanMinutes: 5,
      baselineFeed: "sip",
    });
    // The brand never reaches the wire — a named mapper rather than a spread.
    expect(JSON.stringify(wire)).not.toContain("Symbol");
  });
});
