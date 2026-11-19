import { toInvestigationId, toMarketDate, toTicker } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { createLatestOverviewPass } from "./latest-overview-pass.js";
import {
  BREADTH_WINDOW_MINUTES,
  eligibleMoves,
  marketBreadth,
} from "./market-breadth.js";
import { overviewPassOf } from "./market-overview.js";
import {
  createMarketBreadthTool,
  toWireMarketBreadthReading,
} from "./tool-market-breadth.js";

import type { ToolContext } from "./analytical-tool.js";
import type { MarketOverviewEntry, OverviewPass } from "./market-overview.js";
import type { BarSource, Ticker } from "@marketpulse/shared";

// **The market-breadth tool, against the real arithmetic** (Task 7.2.5,
// Done-when 3). No server, no socket, no database: the counts come from the
// shipped `eligibleMoves` and `marketBreadth` over real entries, carried on a
// real `OverviewPass` through the real holder — so what the tool reads is the
// shape production produces rather than a frame somebody typed.
//
// Independent of every other tool's test: nothing here imports
// `tool-security-snapshot.ts`, `tool-return-percentile.ts`,
// `tool-volume-ratio.ts`, `tool-compare-securities.ts` or the scripted
// provider.

/** 14:03 ET on a Wednesday — inside the regular session. */
const ASOF = new Date("2026-09-16T18:03:30.000Z");

const CONTEXT: ToolContext = {
  investigationId: toInvestigationId("inv-1"),
  asOf: ASOF,
  mode: "live",
};

const SOURCE: BarSource = {
  provider: "fixture",
  feed: "iex",
  retrievedAt: "2026-09-16T18:03:00.000Z",
  barCount: 1,
};

/** A live entry one minute old, which is inside breadth's own window. */
const live = (symbol: string, percent: number): MarketOverviewEntry => ({
  state: "live",
  symbol: toTicker(symbol),
  bar: {
    startsAt: new Date(ASOF.getTime() - 60_000),
    open: 100,
    high: 100,
    low: 100,
    close: 100,
    volume: 100,
  },
  source: SOURCE,
  change: { percent, basis: toMarketDate("2026-09-15") },
});

/**
 * **A pass built the way the producer builds one** — the same three calls, in
 * the same order, over the equities alone.
 *
 * `tracked` is `entries.length` inside `marketBreadth`, so the denominator
 * here is a fact about the set handed in rather than a literal typed in a
 * test.
 */
const passOver = (entries: readonly MarketOverviewEntry[]): OverviewPass => {
  const eligible = eligibleMoves(entries, { asOf: ASOF, marketOpen: true });
  return overviewPassOf({
    proxies: [],
    breadth: marketBreadth(eligible),
    movers: eligible,
    // Required by the producer and not this tool's subject —
    // `market-unusual.test.ts` owns that section. A scored count of zero with
    // every refusal at zero is the state a process that has heard nothing is
    // in.
    unusual: {
      basis: "observed",
      rows: [],
      tracked: 0,
      eligible: 0,
      scored: 0,
      windowMinutes: BREADTH_WINDOW_MINUTES,
      spanMinutes: 5,
      baseline: { feed: "sip", spanMinutes: 5, minimumSampleCount: 2500 },
      refusals: {
        figure: {
          "nothing-observed": 0,
          "no-earlier-endpoint": 0,
          "no-basis": 0,
        },
        comparison: { "too-few-samples": 0, "split-discontinuity": 0 },
      },
    },
    entries,
    asOf: ASOF,
  });
};

const TWO_UP_TWO_DOWN_ONE_FLAT: readonly MarketOverviewEntry[] = [
  live("NVDA", 1.2),
  live("AAPL", 0.4),
  live("MSFT", 0.001),
  live("INTC", -0.8),
  live("KO", -2.6),
];

describe("get_market_breadth", () => {
  it("names the step rather than the function it wraps", () => {
    const tool = createMarketBreadthTool(createLatestOverviewPass().read);

    expect(tool.name).toBe("get_market_breadth");
    expect(tool.description).toBe("Calculate market breadth");
  });

  it("reports the counts off the retained pass, with the denominator they are a part of", async () => {
    const holder = createLatestOverviewPass();
    holder.recordPass(passOver(TWO_UP_TWO_DOWN_ONE_FLAT));

    const outcome = await createMarketBreadthTool(holder.read).run({}, CONTEXT);
    if (outcome.kind !== "ok")
      throw new Error(`expected ok, got ${outcome.kind}`);

    // The three buckets, from the real `directionOf` — `MSFT`'s +0.001%
    // rounds to zero at `PERCENT_DISPLAY_DECIMALS`, so it is `unchanged`
    // rather than advancing. That is the shipped rule rather than this test's
    // opinion, and it is keyed on the DISPLAYED figure: +0.01% is counted as
    // advancing and its row prints `0.01%`.
    expect(outcome.value.counts.advancing).toBe(2);
    expect(outcome.value.counts.declining).toBe(2);
    expect(outcome.value.counts.unchanged).toBe(1);

    // **The denominator and the population both travel**, which is the whole
    // reason breadth ships counts rather than percentages: `measured` is the
    // sum by construction, and `tracked` is the set it is a part of.
    expect(outcome.value.counts.measured).toBe(5);
    expect(outcome.value.counts.tracked).toBe(5);
    expect(
      outcome.value.counts.advancing +
        outcome.value.counts.declining +
        outcome.value.counts.unchanged,
    ).toBe(outcome.value.counts.measured);

    // The basis, which says which question the count answered — and its own
    // window, so the sentence drawn beside it cannot name a different one.
    expect(outcome.value.counts.basis).toBe("observed");
    if (outcome.value.counts.basis !== "observed")
      throw new Error("expected the observed basis");
    expect(outcome.value.counts.windowMinutes).toBe(5);

    // **Dated by the OBSERVATION, never by this process's clock.** ADR 0038
    // forbids any surface to date data from `computedAt`, which advances
    // whenever somebody opens a tab.
    expect(outcome.value.observedAt).toBe("2026-09-16T18:02:30.000Z");
  });

  it("counts zero over a stated denominator where nothing was heard from", async () => {
    // **CI's own answer, and it is an `ok` rather than a refusal**: the join
    // ran, it counted, and the count is zero. A tool that refused here would
    // be throwing away a real measurement — *we heard from nobody in the last
    // five minutes* is the sentence `/`'s own region draws on every gated
    // run.
    const holder = createLatestOverviewPass();
    holder.recordPass(passOver([]));

    const outcome = await createMarketBreadthTool(holder.read).run({}, CONTEXT);
    if (outcome.kind !== "ok")
      throw new Error(`expected ok, got ${outcome.kind}`);

    expect(outcome.value.counts.measured).toBe(0);
    expect(outcome.value.counts.tracked).toBe(0);
    // Nothing observed, so nothing to date the answer by — absent rather
    // than `now`.
    expect(outcome.value.observedAt).toBeUndefined();
  });

  it("refuses with `no-aggregate-yet` where the process has computed no pass", async () => {
    // **The arm every cold process is in**, including every deployment's
    // first seconds and any process nobody has attached to — since Task
    // 4.8.11 the join genuinely does not run then. It is deliberately NOT
    // `nothing-observed`: that word claims a count of zero over a stated
    // denominator, and here there is no count and no denominator.
    const outcome = await createMarketBreadthTool(
      createLatestOverviewPass().read,
    ).run({}, CONTEXT);

    expect(outcome).toStrictEqual({
      kind: "refused",
      reason: "no-aggregate-yet",
    });
  });

  it("refuses the same word where a pass carries no breadth section at all", async () => {
    // **A frame may omit breadth and this producer cannot produce one** —
    // which is why the pass here is hand-built rather than made by
    // `overviewPassOf`, and why that is recorded rather than quietly skipped.
    // `WireMarketOverview.breadth` is optional because the READ side has to
    // tolerate a frame from a previous image, while
    // `WireMarketOverviewInputs.breadth` is required so this product's own
    // producer cannot build one without a count (Task 4.4.4). So the branch
    // is reachable from the type and unreachable from the join, and the
    // honest answer for it is the same word: there is no count to report.
    const holder = createLatestOverviewPass();
    holder.recordPass({
      frame: { computedAt: ASOF.toISOString(), feeds: [], figures: [] },
      figureOf: () => undefined,
    });

    const outcome = await createMarketBreadthTool(holder.read).run({}, CONTEXT);

    expect(outcome).toStrictEqual({
      kind: "refused",
      reason: "no-aggregate-yet",
    });
  });

  it("cannot carry a per-security score, and the COMPILER is the assertion", async () => {
    // **Story 7.2's AC 5, held as a type-level claim rather than as a runtime
    // check** — `return-percentile.ts`'s own `@ts-expect-error` idiom, which
    // fails `tsc -b` if the error ever stops happening, because an unused
    // expectation is itself an error. So the day somebody adds a `symbol`, a
    // `score` or a `band` to this reading in order to grade the investigated
    // security, the build goes red rather than a reviewer noticing.
    //
    // A test asserting that `counts` exists would be green on every one of
    // those.
    const holder = createLatestOverviewPass();
    holder.recordPass(passOver(TWO_UP_TWO_DOWN_ONE_FLAT));

    const outcome = await createMarketBreadthTool(holder.read).run({}, CONTEXT);
    if (outcome.kind !== "ok")
      throw new Error(`expected ok, got ${outcome.kind}`);

    // @ts-expect-error — a breadth reading has no subject to score
    const noScore: unknown = outcome.value.score;
    // @ts-expect-error — nor a symbol it could be about
    const noSymbol: unknown = outcome.value.symbol;
    // @ts-expect-error — nor a band, which is a property of one security's day
    const noBand: unknown = outcome.value.band;

    expect([noScore, noSymbol, noBand]).toStrictEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("takes no symbol at all, so there is nothing to grade", () => {
    // The other half of AC 5, on the INPUT. `buildInput` is `() => ({})` at
    // the wiring site, and a ticker added here would be a ticker this tool
    // could filter or score by — the population is never the subject.
    const tool = createMarketBreadthTool(createLatestOverviewPass().read);

    // @ts-expect-error — the input carries no `symbol` property
    const call = (symbol: Ticker) => tool.run({ symbol }, CONTEXT);

    expect(typeof call).toBe("function");
  });

  it("projects the counts onto the wire without renaming them", async () => {
    // One fact, one spelling: the projection spreads `WireMarketBreadth`
    // rather than re-naming its fields, so the step's own payload and `/`'s
    // own region read the same words for the same numbers.
    const holder = createLatestOverviewPass();
    holder.recordPass(passOver(TWO_UP_TWO_DOWN_ONE_FLAT));

    const outcome = await createMarketBreadthTool(holder.read).run({}, CONTEXT);
    if (outcome.kind !== "ok")
      throw new Error(`expected ok, got ${outcome.kind}`);

    expect(toWireMarketBreadthReading(outcome.value)).toStrictEqual({
      basis: "observed",
      windowMinutes: 5,
      advancing: 2,
      declining: 2,
      unchanged: 1,
      measured: 5,
      tracked: 5,
      observedAt: "2026-09-16T18:02:30.000Z",
    });
  });
});
