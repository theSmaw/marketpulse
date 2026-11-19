import {
  BASELINE_MINIMUM_SAMPLE,
  excessMoveReference,
  toInvestigationId,
  toTicker,
} from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { breakpointsOf } from "./return-baseline.js";
import {
  createCompareSecuritiesTool,
  toWireCompareSecurities,
} from "./tool-compare-securities.js";
import { createTrailingWindow } from "./trailing-window.js";
import { UNIVERSE } from "./universe.js";

import type { ToolContext } from "./analytical-tool.js";
import type { StoredExcessBaseline } from "./excess-move-baseline-store.js";
import type { LiveObservation } from "./market-data-stream.js";
import type { PeerComparisonSources } from "./peer-comparison.js";
import type {
  BarSource,
  ExcessMoveReference,
  Ticker,
} from "@marketpulse/shared";

// **The peer-comparison tool, against the real arithmetic** (Task 7.2.4,
// Done-when 1). No server, no socket, no database: the trailing windows are
// the shipped one fed real observations, the reference resolver is the real
// `excessMoveReference` over the real curated `UNIVERSE`, and
// `fiveMinuteReturn`, `comparableExcessBaseline`, `excessMoveFactor` and
// `returnPercentileOf` are the real functions, reached through the one shared
// producer (`peer-comparison.ts`).
//
// Independent of every other tool's test — nothing here imports
// `tool-security-snapshot.ts`, `tool-return-percentile.ts` or the scripted
// provider.

const NVDA = toTicker("NVDA");
const XLK = toTicker("XLK"); // NVDA's own benchmark — `SECTOR_ETFS.technology`.
const SPY = toTicker("SPY"); // a market proxy: `sector: null`.
const PSKY = toTicker("PSKY"); // untracked since 2026-10-12 — CLAUDE.md §2.

const UNIVERSE_SET = new Set<string>([NVDA, XLK, SPY]);

/**
 * **The real resolver over the real curated universe**, so `no-sector` and
 * `is-benchmark` are facts about this product's own file rather than about a
 * literal typed in a test.
 */
const REFERENCES = new Map<string, ExcessMoveReference>(
  UNIVERSE.map((security) => [security.symbol, excessMoveReference(security)]),
);

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

const barAt = (
  symbol: Ticker,
  minute: string,
  close: number,
): LiveObservation => ({
  symbol,
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

/** Both legs' windows, through the shipped window rather than a literal. */
const windowOver = (
  observations: readonly LiveObservation[],
): ((symbol: Ticker) => readonly LiveObservation[]) => {
  const window = createTrailingWindow();
  window.record(observations);
  return (symbol) => window.read(symbol);
};

/**
 * **A rankable generation over a uniform sample in `[0, 1]` points**, so the
 * expected ordinal is arithmetic rather than a figure copied out of a run:
 * with 2,500 magnitudes evenly spread across one percentage point, the `k`th
 * breakpoint sits at `k / 100`, and a magnitude of `0.5` reaches the 50th and
 * no higher.
 */
const UNIFORM_SAMPLES = Array.from(
  { length: BASELINE_MINIMUM_SAMPLE },
  (_unused, index) => index / (BASELINE_MINIMUM_SAMPLE - 1),
);

const rankableBaseline = (
  samples: readonly number[] = UNIFORM_SAMPLES,
  referenceSymbol: string = XLK,
): StoredExcessBaseline => ({
  symbol: NVDA,
  observedAt: new Date("2026-11-18T21:00:00.000Z"),
  referenceKind: "sector_etf",
  referenceSymbol,
  lookbackSessions: 60,
  sampleCount: samples.length,
  refusal: null,
  breakpoints: breakpointsOf(samples),
});

const sourcesWith = (
  observations: readonly LiveObservation[],
  stored: StoredExcessBaseline | undefined,
): PeerComparisonSources => ({
  referenceOf: (symbol) => REFERENCES.get(symbol),
  windowOf: windowOver(observations),
  baselineOf: () => stored,
  grid: { spanMinutes: 5, feed: "sip" },
});

/**
 * NVDA up 0.9% while XLK is up 0.4% over the same five minutes — a signed
 * excess of **+0.5 points**, which the uniform sample above ranks at the
 * 50th.
 */
const AHEAD_BY_HALF_A_POINT = [
  barAt(NVDA, "14:00", 100),
  barAt(NVDA, "14:05", 100.9),
  barAt(XLK, "14:00", 200),
  barAt(XLK, "14:05", 200.8),
];

describe("compare_securities", () => {
  it("names the step rather than the function it wraps, and not the epic's wording", () => {
    const tool = createCompareSecuritiesTool(
      sourcesWith(AHEAD_BY_HALF_A_POINT, rankableBaseline()),
      UNIVERSE_SET,
    );

    expect(tool.name).toBe("compare_securities");
    // Gate 1's own sentence — `EPIC.md` says "compare peers", which promises
    // an unweighted peer median this product does not compute.
    expect(tool.description).toBe("Compare against sector benchmark");
    expect(tool.description).not.toContain("peers");
  });

  it("differences two five-minute returns and ranks the excess, with its counted n", async () => {
    const tool = createCompareSecuritiesTool(
      sourcesWith(AHEAD_BY_HALF_A_POINT, rankableBaseline()),
      UNIVERSE_SET,
    );

    const outcome = await tool.run({ symbol: NVDA }, CONTEXT);
    if (outcome.kind !== "ok")
      throw new Error(`expected ok, got ${outcome.kind}`);

    // Both legs travel, because each figure is true even where the
    // subtraction is refused.
    expect(outcome.value.percent).toBeCloseTo(0.9, 10);
    expect(outcome.value.referencePercent).toBeCloseTo(0.4, 10);
    // The SIGNED excess, in percentage points.
    expect(outcome.value.excessPoints).toBeCloseTo(0.5, 10);

    // The benchmark is named, never implied — and it is the one the resolver
    // chose, not an argument.
    expect(outcome.value.referenceSymbol).toBe("XLK");
    expect(outcome.value.sector).toBe("technology");

    // The ranking, on the MAGNITUDE, against the uniform sample above.
    expect(outcome.value.rank).toBe(50);
    expect(outcome.value.aboveSample).toBe(false);
    expect(outcome.value.sampleCount).toBe(BASELINE_MINIMUM_SAMPLE);
    expect(outcome.value.baselineSpanMinutes).toBe(5);
    expect(outcome.value.baselineFeed).toBe("sip");

    // The two instants both legs share — `excessMoveFactor` refuses a pair
    // whose endpoints disagree, so these are the comparison's.
    expect(outcome.value.measuredFrom).toStrictEqual(
      new Date("2026-11-19T14:00:00.000Z"),
    );
    expect(outcome.value.measuredTo).toStrictEqual(
      new Date("2026-11-19T14:05:00.000Z"),
    );
    expect(outcome.value.spanMinutes).toBe(5);
  });

  it("ranks falling behind identically to running ahead by the same amount", async () => {
    // `returnPercentileOf` takes the magnitude itself, so the factor cannot
    // score higher for one direction than the other — Story 5.6's AC 4,
    // inherited rather than re-implemented.
    const behind = [
      barAt(NVDA, "14:00", 100),
      barAt(NVDA, "14:05", 99.1),
      barAt(XLK, "14:00", 200),
      barAt(XLK, "14:05", 199.2),
    ];
    const tool = createCompareSecuritiesTool(
      sourcesWith(behind, rankableBaseline()),
      UNIVERSE_SET,
    );

    const outcome = await tool.run({ symbol: NVDA }, CONTEXT);
    if (outcome.kind !== "ok") throw new Error("expected ok");

    expect(outcome.value.excessPoints).toBeCloseTo(-0.5, 10);
    expect(outcome.value.rank).toBe(50);
  });

  describe("inapplicable — the question does not arise", () => {
    it("answers is-benchmark for a sector ETF, from the curated universe alone", async () => {
      // `XLK` IS the fund technology is measured against, so the excess would
      // be exactly `0` for ever. No backfill will change that, which is why
      // this is not a refusal. Note the windows hold a real, measurable move
      // for `XLK` — this is decided before either is read.
      const tool = createCompareSecuritiesTool(
        sourcesWith(AHEAD_BY_HALF_A_POINT, rankableBaseline()),
        UNIVERSE_SET,
      );

      const outcome = await tool.run({ symbol: XLK }, CONTEXT);

      expect(outcome).toStrictEqual({
        kind: "inapplicable",
        because: "is-benchmark",
      });
    });

    it("answers no-sector for a market proxy", async () => {
      const tool = createCompareSecuritiesTool(
        sourcesWith(AHEAD_BY_HALF_A_POINT, rankableBaseline()),
        UNIVERSE_SET,
      );

      const outcome = await tool.run({ symbol: SPY }, CONTEXT);

      expect(outcome).toStrictEqual({
        kind: "inapplicable",
        because: "no-sector",
      });
    });

    it("is a different KIND from every refusal, not a word inside one", async () => {
      // The whole reason `ToolOutcome` grew a third arm: a reader told
      // *unavailable* reasonably waits, and nothing will ever arrive.
      const tool = createCompareSecuritiesTool(
        sourcesWith([], undefined),
        UNIVERSE_SET,
      );

      const proxy = await tool.run({ symbol: SPY }, CONTEXT);
      const equity = await tool.run({ symbol: NVDA }, CONTEXT);

      expect(proxy.kind).toBe("inapplicable");
      expect(equity.kind).toBe("refused");
      expect(proxy).not.toHaveProperty("reason");
      expect(equity).not.toHaveProperty("because");
    });
  });

  describe("refused — we will not answer, and a repair or a backfill might", () => {
    it("refuses not-tracked for a symbol outside the curated universe", async () => {
      // Decided before anything else is consulted — and note `PSKY` IS
      // described by the curated universe (it is `untracked`, not deleted),
      // so this is the membership set's answer rather than the resolver's.
      const tool = createCompareSecuritiesTool(
        sourcesWith(AHEAD_BY_HALF_A_POINT, rankableBaseline()),
        UNIVERSE_SET,
      );

      const outcome = await tool.run({ symbol: PSKY }, CONTEXT);

      expect(outcome).toStrictEqual({ kind: "refused", reason: "not-tracked" });
    });

    it("refuses no-subject-move where the subject's own window is silent", async () => {
      // CI's permanent state: 516 securities, zero bars, no provider.
      const tool = createCompareSecuritiesTool(
        sourcesWith(
          [barAt(XLK, "14:00", 200), barAt(XLK, "14:05", 200.8)],
          rankableBaseline(),
        ),
        UNIVERSE_SET,
      );

      const outcome = await tool.run({ symbol: NVDA }, CONTEXT);

      expect(outcome).toStrictEqual({
        kind: "refused",
        reason: "no-subject-move",
      });
    });

    it("refuses no-reference-move where the BENCHMARK printed nothing — never a zero", async () => {
      // The rule the whole numerator rests on: a benchmark that printed
      // nothing in these five minutes has **not** been flat, and reading its
      // return as `0` would score the subject's whole move as excess.
      const tool = createCompareSecuritiesTool(
        sourcesWith(
          [barAt(NVDA, "14:00", 100), barAt(NVDA, "14:05", 100.9)],
          rankableBaseline(),
        ),
        UNIVERSE_SET,
      );

      const outcome = await tool.run({ symbol: NVDA }, CONTEXT);

      expect(outcome).toStrictEqual({
        kind: "refused",
        reason: "no-reference-move",
      });
    });

    it("refuses mixed-basis where the two legs are over different five minutes", async () => {
      // Reachable whenever one leg prints a minute the other does not: IEX
      // minute presence is 81.6% and `ERIE`'s is 2.1%.
      const tool = createCompareSecuritiesTool(
        sourcesWith(
          [
            barAt(NVDA, "14:00", 100),
            barAt(NVDA, "14:05", 100.9),
            barAt(XLK, "13:55", 200),
            barAt(XLK, "14:00", 200.8),
          ],
          rankableBaseline(),
        ),
        UNIVERSE_SET,
      );

      const outcome = await tool.run({ symbol: NVDA }, CONTEXT);

      expect(outcome).toStrictEqual({
        kind: "refused",
        reason: "mixed-basis",
      });
    });

    it("refuses too-few-samples where no generation is loaded at all", async () => {
      const tool = createCompareSecuritiesTool(
        sourcesWith(AHEAD_BY_HALF_A_POINT, undefined),
        UNIVERSE_SET,
      );

      const outcome = await tool.run({ symbol: NVDA }, CONTEXT);

      expect(outcome).toStrictEqual({
        kind: "refused",
        reason: "too-few-samples",
      });
    });

    it("keeps the SUBJECT's split break and the BENCHMARK's as two different words", async () => {
      // The pair that must never merge: one is about the security on screen,
      // the other refuses every constituent of that sector at once and is
      // repaired somewhere else entirely.
      const refusedFor = async (
        refusal: "split-discontinuity" | "reference-split-discontinuity",
      ): Promise<unknown> => {
        const stored: StoredExcessBaseline = {
          symbol: NVDA,
          observedAt: new Date("2026-11-18T21:00:00.000Z"),
          referenceKind: "sector_etf",
          referenceSymbol: XLK,
          lookbackSessions: 60,
          sampleCount: 4_620,
          refusal,
        };
        return createCompareSecuritiesTool(
          sourcesWith(AHEAD_BY_HALF_A_POINT, stored),
          UNIVERSE_SET,
        ).run({ symbol: NVDA }, CONTEXT);
      };

      expect(await refusedFor("split-discontinuity")).toStrictEqual({
        kind: "refused",
        reason: "split-discontinuity",
      });
      expect(await refusedFor("reference-split-discontinuity")).toStrictEqual({
        kind: "refused",
        reason: "reference-split-discontinuity",
      });
    });

    it("treats a generation computed against another benchmark as no generation", async () => {
      // `0016` §3 puts the reference in the key precisely so a reader holding
      // either can say which question it answers — and the failure is
      // maximally quiet, because `referenceSymbol` would travel on the row
      // naming the WRONG fund.
      const tool = createCompareSecuritiesTool(
        sourcesWith(
          AHEAD_BY_HALF_A_POINT,
          rankableBaseline(UNIFORM_SAMPLES, "XLV"),
        ),
        UNIVERSE_SET,
      );

      const outcome = await tool.run({ symbol: NVDA }, CONTEXT);

      expect(outcome).toStrictEqual({
        kind: "refused",
        reason: "too-few-samples",
      });
    });
  });

  it("reads both legs from the context's asOf, never from a clock", async () => {
    // Invariant 4's own hook, and the property the shared producer exists to
    // keep: both windows hold 14:05 and 14:10. Asked as of 14:11 the pair is
    // whole; asked as of 14:06 the newer endpoint is the 14:05 bar, whose own
    // partner at 14:00 neither window ever held — so the SAME sources answer
    // two different things on nothing but the instant they were asked about,
    // which is what a replay (Epic 13) sets to a past session.
    const tool = createCompareSecuritiesTool(
      sourcesWith(
        [
          barAt(NVDA, "14:05", 100),
          barAt(NVDA, "14:10", 100.9),
          barAt(XLK, "14:05", 200),
          barAt(XLK, "14:10", 200.8),
        ],
        rankableBaseline(),
      ),
      UNIVERSE_SET,
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
      reason: "no-subject-move",
    });
  });
});

describe("toWireCompareSecurities", () => {
  it("carries every field as JSON, with both instants as full instants", async () => {
    const tool = createCompareSecuritiesTool(
      sourcesWith(AHEAD_BY_HALF_A_POINT, rankableBaseline()),
      UNIVERSE_SET,
    );
    const outcome = await tool.run({ symbol: NVDA }, CONTEXT);
    if (outcome.kind !== "ok") throw new Error("expected ok");

    const wire = toWireCompareSecurities(outcome.value);

    expect(wire).toStrictEqual({
      symbol: "NVDA",
      referenceSymbol: "XLK",
      sector: "technology",
      percent: outcome.value.percent,
      referencePercent: outcome.value.referencePercent,
      excessPoints: outcome.value.excessPoints,
      measuredFrom: "2026-11-19T14:00:00.000Z",
      measuredTo: "2026-11-19T14:05:00.000Z",
      spanMinutes: 5,
      rank: 50,
      aboveSample: false,
      sampleCount: BASELINE_MINIMUM_SAMPLE,
      baselineSpanMinutes: 5,
      baselineFeed: "sip",
    });
    // The brand never reaches the wire — a named mapper rather than a spread.
    // Asserted on the symbol keys rather than on the serialised text, because
    // this reading has a field whose NAME contains `Symbol` and the text
    // assertion the other tools use would be green on a brand that leaked
    // while failing on one that did not.
    expect(Object.getOwnPropertySymbols(wire)).toStrictEqual([]);
    expect(Object.getOwnPropertySymbols(outcome.value)).toHaveLength(1);
  });
});
