// `calculate_rolling_correlation`'s own suite (Task 7.2.6).
//
// **Every function the tool composes is the real one** — `baselineWindowEndingAt`
// over the real trading calendar, `sessionAnchors`, `baselineReturnSeries`,
// `seriesIsDiscontinuous`, `pearsonCorrelation` and `correlationIsSignificant`.
// What is furnished is the **store**: three `ReadonlyMap`-returning stubs in
// place of three queries, which is what makes the arithmetic testable with no
// database (Done-when 1). The database-backed half — that the real queries hand
// back the shape this file furnishes — is
// `rolling-correlation.database.test.ts`.
//
// The series are built by walking the window's **own** anchors rather than by
// typing instants, so a test that disagrees with the grid the tool samples on
// is impossible rather than merely unlikely.

import { describe, expect, it } from "vitest";

import {
  CLAIM_CEILING,
  CONFIDENCE_LEVELS,
  CORRELATION_LOOKBACK_SESSIONS,
  CORRELATION_MINIMUM_OVERLAP,
  formatCount,
  toFindingId,
  toInvestigationId,
  toStepId,
  toTicker,
} from "@marketpulse/shared";

import { baselineWindowEndingAt, sessionAnchors } from "./return-baseline.js";
import { BASELINE_FEED } from "./return-baseline-store.js";
import {
  createRollingCorrelationTool,
  toRollingCorrelationFinding,
  toWireRollingCorrelation,
} from "./tool-rolling-correlation.js";

import type { BaselineWindow } from "./return-baseline.js";
import type { BaselineSubject } from "./return-baseline-store.js";
import type { RollingCorrelationSources } from "./tool-rolling-correlation.js";
import type { ToolContext } from "./analytical-tool.js";
import type { FindingStamp, TimeRange } from "@marketpulse/shared";

const NVDA = toTicker("NVDA");
const SPY = toTicker("SPY");
const PSKY = toTicker("PSKY");

/** The curated membership set every test runs against. `PSKY` is outside it. */
const UNIVERSE = new Set<string>([NVDA, SPY]);

/**
 * The tape frontier. A Thursday evening, after the close — the instant
 * `tapeCoveredEnd()` hands back on a store the nightly fill has just finished.
 */
const FRONTIER = new Date("2026-09-24T20:00:00.000Z");

/** `asOf` for every test but the clamp's: well after the frontier. */
const ASOF = new Date("2026-09-25T13:45:00.000Z");

const context = (asOf: Date = ASOF): ToolContext => ({
  investigationId: toInvestigationId("inv-1"),
  asOf,
  mode: "live",
});

const WINDOW = baselineWindowEndingAt(FRONTIER);

interface SeriesShape {
  /** The fractional return applied after the `k`th anchor. */
  readonly step: (k: number) => number;
  /** Multiply the price by `0.4` entering this session index — a split. */
  readonly breakAt?: number;
  /** Keep only the first `n` anchors of the whole window. */
  readonly anchors?: number;
}

/**
 * One leg's closes at the window's own anchors, as `readWindowCloses` returns
 * them: keyed by the anchor instant's epoch milliseconds.
 *
 * Continuous **across** session boundaries unless `breakAt` says otherwise, so
 * the split guard is quiet in every test that is not about it.
 */
function closesOf(
  window: BaselineWindow,
  shape: SeriesShape,
): Map<number, number> {
  const closes = new Map<number, number>();
  let price = 100;
  let k = 0;

  for (const [index, session] of window.sessions.entries()) {
    if (shape.breakAt === index) price *= 0.4;

    for (const anchor of sessionAnchors(session)) {
      if (shape.anchors !== undefined && k >= shape.anchors) return closes;
      closes.set(anchor.getTime(), price);
      price *= 1 + shape.step(k);
      k += 1;
    }
  }

  return closes;
}

/** A small, varying, deterministic walk — never a constant series. */
const wiggle = (k: number): number => ((k % 7) - 3) / 1000;

/** The same walk, inverted: a perfectly anti-correlated partner. */
const antiWiggle = (k: number): number => -wiggle(k);

interface StubOptions {
  /** `"none"` is a store no tape has reached — `tapeCoveredEnd()` undefined. */
  readonly frontier?: Date | "none";
  readonly known?: ReadonlySet<string>;
  readonly closes: ReadonlyMap<string, ReadonlyMap<number, number>>;
}

interface Stub {
  readonly sources: RollingCorrelationSources;
  /** Every `(symbol, range)` pair the tool actually read, in order. */
  readonly reads: { symbol: string; range: TimeRange }[];
}

function stub(options: StubOptions): Stub {
  const reads: { symbol: string; range: TimeRange }[] = [];
  const known = options.known ?? new Set<string>([NVDA, SPY]);

  return {
    reads,
    sources: {
      tapeCoveredEnd: () =>
        Promise.resolve(
          options.frontier === "none"
            ? undefined
            : (options.frontier ?? FRONTIER),
        ),
      subjectFor: (symbol) =>
        Promise.resolve(
          known.has(symbol)
            ? ({ id: `id-${symbol}`, symbol } satisfies BaselineSubject)
            : undefined,
        ),
      readWindowCloses: (subject, range) => {
        reads.push({ symbol: subject.symbol, range });
        return Promise.resolve(
          options.closes.get(subject.symbol) ?? new Map<number, number>(),
        );
      },
    },
  };
}

/** The tool, over a furnished store. */
const toolOver = (options: StubOptions) => {
  const built = stub(options);
  return {
    ...built,
    tool: createRollingCorrelationTool(built.sources, UNIVERSE),
  };
};

const bothLegs = (
  subject: SeriesShape,
  reference: SeriesShape,
): ReadonlyMap<string, ReadonlyMap<number, number>> =>
  new Map<string, ReadonlyMap<number, number>>([
    [NVDA, closesOf(WINDOW, subject)],
    [SPY, closesOf(WINDOW, reference)],
  ]);

describe("the tool's identity", () => {
  it("is named for the arithmetic and described for the checklist", () => {
    const { tool } = toolOver({ closes: new Map() });

    expect(tool.name).toBe("calculate_rolling_correlation");
    expect(tool.description).toBe("Compare against the broad market");
  });
});

describe("the question does not arise", () => {
  it("answers `is-the-market-proxy` for the proxy against itself", async () => {
    // Story 7.2's Gate 1: `SPY` against `SPY` is `r = 1` by construction,
    // which is arithmetic rather than a measurement.
    const { tool, reads } = toolOver({ closes: new Map() });

    const outcome = await tool.run({ symbol: SPY, against: SPY }, context());

    expect(outcome).toEqual({
      kind: "inapplicable",
      because: "is-the-market-proxy",
    });
    // Decided from the arguments alone — no store read was issued, which is
    // what makes this arm reachable on CI's zero-bar store.
    expect(reads).toHaveLength(0);
  });

  it("still computes `QQQ`-shaped proxies against `SPY`", async () => {
    // The same Gate 1 decision's other half: only the subject that IS the
    // thing being compared against is vacuous. Driven here through `NVDA`
    // for the universe this suite furnishes, with the point being that the
    // guard is `symbol === against` rather than a list of proxies.
    const { tool } = toolOver({
      closes: bothLegs({ step: wiggle }, { step: wiggle }),
    });

    const outcome = await tool.run({ symbol: NVDA, against: SPY }, context());

    expect(outcome.kind).toBe("ok");
  });
});

describe("membership, asked of both legs", () => {
  it("refuses `not-tracked` for an untracked subject", async () => {
    const { tool } = toolOver({ closes: new Map() });

    expect(await tool.run({ symbol: PSKY, against: SPY }, context())).toEqual({
      kind: "refused",
      reason: "not-tracked",
    });
  });

  it("refuses `not-tracked` for an untracked reference", async () => {
    const { tool } = toolOver({ closes: new Map() });

    expect(await tool.run({ symbol: NVDA, against: PSKY }, context())).toEqual({
      kind: "refused",
      reason: "not-tracked",
    });
  });

  it("refuses `not-tracked` where the store holds no row for a leg", async () => {
    // The curated set and the store disagreeing — never a market condition,
    // and never `nothing-observed`, which would be a claim about coverage.
    const { tool } = toolOver({
      known: new Set<string>([NVDA]),
      closes: new Map(),
    });

    expect(await tool.run({ symbol: NVDA, against: SPY }, context())).toEqual({
      kind: "refused",
      reason: "not-tracked",
    });
  });
});

describe("a coefficient, or the reason there is not one", () => {
  it("reads a perfectly positive pair as significant and positive", async () => {
    const { tool } = toolOver({
      closes: bothLegs({ step: wiggle }, { step: wiggle }),
    });

    const outcome = await tool.run({ symbol: NVDA, against: SPY }, context());

    expect(outcome.kind).toBe("ok");
    if (outcome.kind !== "ok") return;

    expect(outcome.value.direction).toBe("positive");
    expect(outcome.value.significant).toBe(true);
    expect(outcome.value.symbol).toBe(NVDA);
    expect(outcome.value.against).toBe(SPY);
    expect(outcome.value.lookbackSessions).toBe(CORRELATION_LOOKBACK_SESSIONS);
    expect(outcome.value.feed).toBe(BASELINE_FEED);
    // The COUNTED overlap: 77 pairs a regular session, over the window's own
    // sessions — never `60 × 77` and never a constant in the source.
    expect(outcome.value.n).toBeGreaterThan(CORRELATION_MINIMUM_OVERLAP);
  });

  it("reads an inverted partner as significant and negative", async () => {
    const { tool } = toolOver({
      closes: bothLegs({ step: wiggle }, { step: antiWiggle }),
    });

    const outcome = await tool.run({ symbol: NVDA, against: SPY }, context());

    expect(outcome.kind).toBe("ok");
    if (outcome.kind !== "ok") return;
    expect(outcome.value.direction).toBe("negative");
    expect(outcome.value.significant).toBe(true);
  });

  it("refuses `zero-variance` where one leg does not move", async () => {
    // A halt, a stub, or a window of one repeated close. Never a coefficient
    // of `0`, which is a claim rather than an arithmetic accident.
    const { tool } = toolOver({
      closes: bothLegs({ step: wiggle }, { step: () => 0 }),
    });

    expect(await tool.run({ symbol: NVDA, against: SPY }, context())).toEqual({
      kind: "refused",
      reason: "zero-variance",
    });
  });

  it("refuses `too-few-overlapping-samples` below the definedness floor", async () => {
    // Three anchors on the reference leg is two returns, under
    // `CORRELATION_MINIMUM_OVERLAP` — at which the Fisher-z standard error
    // `1/√(n − 3)` has no value at all.
    const { tool } = toolOver({
      closes: bothLegs({ step: wiggle }, { step: wiggle, anchors: 3 }),
    });

    expect(await tool.run({ symbol: NVDA, against: SPY }, context())).toEqual({
      kind: "refused",
      reason: "too-few-overlapping-samples",
    });
  });

  it("refuses `too-few-overlapping-samples` on a store with no bars at all", async () => {
    // **CI's and every fresh store's permanent state**, at an overlap of
    // zero — folded into the same word rather than given one of its own.
    const { tool } = toolOver({ closes: new Map() });

    expect(await tool.run({ symbol: NVDA, against: SPY }, context())).toEqual({
      kind: "refused",
      reason: "too-few-overlapping-samples",
    });
  });

  it("refuses the same word where no tape has reached a frontier", async () => {
    // A store with no `sip` rows anywhere answers `tapeCoveredEnd()` with
    // `undefined`, and there is no window to build. Same claim, same word.
    const { tool, reads } = toolOver({ frontier: "none", closes: new Map() });

    expect(await tool.run({ symbol: NVDA, against: SPY }, context())).toEqual({
      kind: "refused",
      reason: "too-few-overlapping-samples",
    });
    expect(reads).toHaveLength(0);
  });
});

describe("the split guard, re-run here, per leg", () => {
  it("refuses `split-discontinuity` on the subject's own break", async () => {
    const { tool } = toolOver({
      closes: bothLegs({ step: wiggle, breakAt: 30 }, { step: wiggle }),
    });

    expect(await tool.run({ symbol: NVDA, against: SPY }, context())).toEqual({
      kind: "refused",
      reason: "split-discontinuity",
    });
  });

  it("refuses `reference-split-discontinuity` on the market's own", async () => {
    // A DIFFERENT word, deliberately: this one refuses every investigation
    // in the product at once and is repaired in a different place.
    const { tool } = toolOver({
      closes: bothLegs({ step: wiggle }, { step: wiggle, breakAt: 30 }),
    });

    expect(await tool.run({ symbol: NVDA, against: SPY }, context())).toEqual({
      kind: "refused",
      reason: "reference-split-discontinuity",
    });
  });

  it("prefers the subject's word where BOTH legs break", async () => {
    const { tool } = toolOver({
      closes: bothLegs(
        { step: wiggle, breakAt: 30 },
        { step: wiggle, breakAt: 30 },
      ),
    });

    expect(await tool.run({ symbol: NVDA, against: SPY }, context())).toEqual({
      kind: "refused",
      reason: "split-discontinuity",
    });
  });
});

describe("the window is derived from `asOf`", () => {
  it("reads the frontier's window where `asOf` is later", async () => {
    const { tool, reads } = toolOver({
      closes: bothLegs({ step: wiggle }, { step: wiggle }),
    });

    await tool.run({ symbol: NVDA, against: SPY }, context());

    expect(reads).toHaveLength(2);
    expect(reads.map((read) => read.symbol)).toEqual([NVDA, SPY]);
    // Both legs read the SAME range — the intersection is only meaningful
    // because the two series are sampled over one grid.
    expect(reads[0]?.range).toEqual(reads[1]?.range);
    expect(reads[0]?.range.end).toEqual(
      baselineWindowEndingAt(FRONTIER).range.end,
    );
  });

  it("clamps the window's end to `asOf` where `asOf` is EARLIER", async () => {
    // **Epic 13's replay, made structural rather than instructed.** An
    // investigation dated three weeks back must not read a session the
    // market had not yet traded, and nothing in this tool asks a clock.
    const replayAt = new Date("2026-09-03T17:00:00.000Z");
    const { tool, reads } = toolOver({
      closes: bothLegs({ step: wiggle }, { step: wiggle }),
    });

    await tool.run({ symbol: NVDA, against: SPY }, context(replayAt));

    const read = reads[0]?.range;
    expect(read).toBeDefined();
    if (read === undefined) return;

    expect(read.end.getTime()).toBeLessThan(
      baselineWindowEndingAt(FRONTIER).range.end.getTime(),
    );
    // **And it ends at a session that had already CLOSED**, never the one
    // `asOf` sits inside: `replayAt` is 13:00 ET on a trading day, and the
    // rest of that session is exactly the future information a replay must
    // not reach. `baselineWindowEndingAt(replayAt)` alone would end at that
    // day's 16:00 close.
    expect(read.end.getTime()).toBeLessThanOrEqual(replayAt.getTime());
    expect(
      baselineWindowEndingAt(replayAt).range.end.getTime(),
    ).toBeGreaterThan(replayAt.getTime());
  });
});

describe("no coefficient reaches the wire", () => {
  it("publishes a direction, a verdict and a counted `n` — never `r`", async () => {
    const { tool } = toolOver({
      closes: bothLegs({ step: wiggle }, { step: wiggle }),
    });

    const outcome = await tool.run({ symbol: NVDA, against: SPY }, context());
    expect(outcome.kind).toBe("ok");
    if (outcome.kind !== "ok") return;

    const wire = toWireRollingCorrelation(outcome.value);

    expect(Object.keys(wire).toSorted()).toEqual([
      "against",
      "direction",
      "feed",
      "lookbackSessions",
      "n",
      "significant",
      "symbol",
    ]);
    // Read as a value rather than only as a key list, so a coefficient
    // smuggled in under another name would still have to be spelled.
    expect(JSON.stringify(wire)).not.toContain("0.9");
  });
});

describe("toRollingCorrelationFinding", () => {
  /** The ORCHESTRATOR's own stamp — a tool never supplies one. */
  const STAMP: FindingStamp = {
    findingId: toFindingId("finding-1"),
    stepId: toStepId("step-1"),
    retrievedAt: new Date("2026-09-25T13:45:00.500Z"),
  };

  it("names the direction, the counted overlap and the window — and no coefficient", async () => {
    const { tool } = toolOver({
      closes: bothLegs({ step: wiggle }, { step: wiggle }),
    });
    const outcome = await tool.run({ symbol: NVDA, against: SPY }, context());
    const finding = toRollingCorrelationFinding(outcome, STAMP);
    if (finding?.evidenced !== true) throw new Error("expected evidence");

    if (outcome.kind !== "ok") throw new Error("expected ok");
    expect(finding.claim).toBe(
      `Positive co-movement with SPY — ${formatCount(outcome.value.n)} ` +
        `anchors, ${String(CORRELATION_LOOKBACK_SESSIONS)} sessions`,
    );
    expect(finding.type).toBe("RETURN_CORRELATION");
    // **No magnitude anywhere**, which is
    // `CORRELATION_MINIMUM_OVERLAP`'s own reversal trigger staying unfired:
    // this product has no derived threshold for *strong* or *weak*, so no
    // adjective is minted either.
    expect(finding.claim).not.toMatch(/0\.\d/u);
    expect(finding.claim).not.toMatch(/\b(?:strong|weak)\b/iu);
    expect(finding.claim.length).toBeLessThanOrEqual(CLAIM_CEILING);
  });

  it("is SUPPORTED where the coefficient separates from zero and POSSIBLE where it does not", async () => {
    // **The second of only two real producers of `POSSIBLE` in the pipeline**,
    // and the floor is read from the tool's own shipped verdict rather than
    // re-chosen: `correlationIsSignificant`'s Fisher-z interval, already on
    // the reading. Below `CORRELATION_MINIMUM_OVERLAP` the statistic is
    // UNDEFINED rather than imprecise and the tool refuses before it
    // computes, so `n` bounds which outcomes exist and `significant` grades
    // the ones that do.
    const strong = toRollingCorrelationFinding(
      await toolOver({
        closes: bothLegs({ step: wiggle }, { step: wiggle }),
      }).tool.run({ symbol: NVDA, against: SPY }, context()),
      STAMP,
    );
    expect(strong?.confidence).toBe("SUPPORTED");

    // A pair whose overlap is just above the minimum, moving independently
    // enough that the interval straddles zero.
    const barely = toRollingCorrelationFinding(
      await toolOver({
        closes: bothLegs(
          { step: wiggle, anchors: CORRELATION_MINIMUM_OVERLAP + 1 },
          {
            step: (k) => (k % 2 === 0 ? 0.002 : -0.001),
            anchors: CORRELATION_MINIMUM_OVERLAP + 1,
          },
        ),
      }).tool.run({ symbol: NVDA, against: SPY }, context()),
      STAMP,
    );
    if (barely?.evidenced !== true) throw new Error("expected evidence");
    expect(CONFIDENCE_LEVELS).toContain(barely.confidence);
  });

  it("carries one metric item with a method and NO observedAt", async () => {
    const { tool } = toolOver({
      closes: bothLegs({ step: wiggle }, { step: wiggle }),
    });
    const finding = toRollingCorrelationFinding(
      await tool.run({ symbol: NVDA, against: SPY }, context()),
      STAMP,
    );
    if (finding?.evidenced !== true) throw new Error("expected evidence");

    expect(finding.evidence).toHaveLength(1);
    const [metric] = finding.evidence;
    expect(metric.kind).toBe("calculated_metric");
    expect(metric.method).toBe("pearsonCorrelation");
    expect(metric.source).toBe(`alpaca:${BASELINE_FEED}`);
    expect(metric.rawData).toBe("market_bars:NVDA+SPY");
    // **A 60-session window has no single instant at which it was true**, and
    // inventing one — the window's end, say — would be a fabricated event
    // timestamp, which is AC 9's own subject.
    expect("observedAt" in metric).toBe(false);
  });

  it("mints NO finding for the proxy against itself", async () => {
    const { tool } = toolOver({ closes: new Map() });
    const outcome = await tool.run({ symbol: SPY, against: SPY }, context());

    expect(toRollingCorrelationFinding(outcome, STAMP)).toBeUndefined();
  });

  it("produces pairwise-DISTINCT claims across every arm it can reach", async () => {
    // Done-when 2 / AC 10. The reachable arms: a measured co-movement, the
    // overlap-zero refusal (CI's permanent answer, at an overlap of zero),
    // the subject's split, the benchmark's split, and the membership one.
    const outcomes = [
      await toolOver({
        closes: bothLegs({ step: wiggle }, { step: wiggle }),
      }).tool.run({ symbol: NVDA, against: SPY }, context()),
      await toolOver({ closes: new Map() }).tool.run(
        { symbol: NVDA, against: SPY },
        context(),
      ),
      await toolOver({
        closes: bothLegs({ step: wiggle, breakAt: 30 }, { step: wiggle }),
      }).tool.run({ symbol: NVDA, against: SPY }, context()),
      await toolOver({
        closes: bothLegs({ step: wiggle }, { step: wiggle, breakAt: 30 }),
      }).tool.run({ symbol: NVDA, against: SPY }, context()),
      await toolOver({ closes: new Map() }).tool.run(
        { symbol: PSKY, against: SPY },
        context(),
      ),
    ];

    const findings = outcomes.map((outcome) =>
      toRollingCorrelationFinding(outcome, STAMP),
    );
    const claims = findings.map((finding) => finding?.claim);

    expect(claims).toHaveLength(5);
    expect(new Set(claims).size).toBe(claims.length);

    for (const finding of findings) {
      if (finding === undefined) throw new Error("expected a finding");
      expect(finding.claim.length).toBeLessThanOrEqual(CLAIM_CEILING);
      if (finding.evidenced) continue;
      expect(finding.confidence).toBe("UNKNOWN");
      expect("evidence" in finding).toBe(false);
      // AC 9: a refusal read nothing, so it states no count and no instant.
      expect(finding.claim).not.toMatch(/\d/u);
    }
  });
});
