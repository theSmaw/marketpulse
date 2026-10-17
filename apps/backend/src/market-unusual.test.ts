import {
  BASELINE_MINIMUM_SAMPLE,
  UNUSUAL_ROWS,
  compareByPercentile,
  toMarketDate,
  toTicker,
} from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import {
  BREADTH_WINDOW_MINUTES,
  eligibleMoves,
  marketBreadth,
} from "./market-breadth.js";
import { RETURN_SPAN_MINUTES } from "./five-minute-return.js";
import { breakpointsOf } from "./return-baseline.js";
import { topMovers } from "./market-movers.js";
import { unusualActivity } from "./market-unusual.js";

import type { Bar, BarSource, Ticker } from "@marketpulse/shared";
import type { LiveObservation } from "./market-data-stream.js";
import type { MarketOverviewEntry } from "./market-overview.js";
import type {
  RankableReturnBaseline,
  StoredReturnBaseline,
} from "./return-baseline-store.js";
import type {
  StoredSessionPass,
  StoredSessionPercentile,
  StoredSessionRanking,
} from "./session-percentile-store.js";

// **No clock, no socket, no database** — `market-breadth.ts`' note unchanged.
// Every input is an argument, including the instant, the windows and the
// baselines, so this module cannot read anything timestamped after a replay
// clock because it reads nothing at all.

/** 14:03:30 ET on a Wednesday — inside the regular session. */
const ASOF = new Date("2026-09-16T18:03:30.000Z");

const MINUTE = 60_000;

const source: BarSource = {
  provider: "alpaca",
  feed: "iex",
  retrievedAt: "2026-09-16T18:03:00.000Z",
  barCount: 1,
};

const bar = (close: number, minutesAgo: number): Bar => ({
  startsAt: new Date(ASOF.getTime() - minutesAgo * MINUTE),
  open: close,
  high: close,
  low: close,
  close,
  volume: 100,
});

/**
 * A live entry one minute old, which is inside the freshness cutoff.
 *
 * `change.percent` is non-null because the shared pass refuses an entry with
 * no measurable move — that narrowing is breadth's and this region inherits
 * it, which is one of the things the intersection test below states.
 */
const live = (symbol: string, minutesAgo = 1): MarketOverviewEntry => ({
  state: "live",
  symbol: toTicker(symbol),
  bar: bar(100, minutesAgo),
  source,
  change: { percent: 1.5, basis: toMarketDate("2026-09-15") },
  // **A stored close, so the SESSION basis admits this entry too.** Without
  // one `sessionMoves` excludes it and the basis-gate test below would be
  // vacuous — nothing to score because the shared pass found nothing, rather
  // than because this module refused.
  close: {
    symbol: toTicker(symbol),
    session: toMarketDate("2026-09-16"),
    close: 100,
    previousClose: 98,
  },
});

const observation = (close: number, minutesAgo: number): LiveObservation => ({
  symbol: toTicker("NVDA"),
  bar: bar(close, minutesAgo),
  source,
  // Every bar in a window is a first observation here; the revision case is
  // `trailing-window.test.ts`' and this module never reads the field.
  supersedes: false,
});

/**
 * A window holding a pair exactly the span apart, with every minute between
 * them — the newer bar `minutesAgo` old, the older one a span before it.
 *
 * **Dense rather than two bars**, because `observed` counts the minutes the
 * walk went past: a two-bar window is a perfectly good five-minute return with
 * `observed 1 of 5`, and the common case on a liquid name is all five. Oldest
 * first, which is `TrailingWindow.read`'s own order.
 */
const pair = (
  from: number,
  to: number,
  minutesAgo = 1,
): readonly LiveObservation[] =>
  Array.from({ length: RETURN_SPAN_MINUTES + 1 }, (_unused, index) => {
    const ago = minutesAgo + RETURN_SPAN_MINUTES - index;
    return observation(index === 0 ? from : to, ago);
  });

/** One sample per rank — `return-percentile.test.ts`' shape, so the answer is the input. */
const ONE_PER_RANK = Array.from({ length: 101 }, (_unused, index) => index);

const baseline = (
  overrides: Partial<RankableReturnBaseline> = {},
): StoredReturnBaseline => ({
  symbol: toTicker("NVDA"),
  observedAt: new Date("2026-09-11T20:00:00.000Z"),
  lookbackSessions: 60,
  sampleCount: BASELINE_MINIMUM_SAMPLE,
  refusal: null,
  breakpoints: breakpointsOf(ONE_PER_RANK),
  ...overrides,
});

const GRID = { spanMinutes: 5, feed: "sip" } as const;

const OPEN = { asOf: ASOF, marketOpen: true } as const;
const SHUT = { asOf: ASOF, marketOpen: false } as const;

/**
 * The pass over a set of entries, with each security's window and baseline
 * given by name — absent means *this security has none*, which is the ordinary
 * state rather than a fixture gap.
 */
const score = (
  entries: readonly MarketOverviewEntry[],
  over: {
    readonly windows?: Readonly<Record<string, readonly LiveObservation[]>>;
    readonly baselines?: Readonly<Record<string, StoredReturnBaseline>>;
    readonly marketOpen?: boolean;
    readonly rows?: number;
    readonly sessionRanking?: StoredSessionRanking;
  } = {},
) =>
  unusualActivity({
    moves: eligibleMoves(entries, {
      asOf: ASOF,
      marketOpen: over.marketOpen ?? true,
    }),
    windowOf: (symbol: Ticker) => over.windows?.[symbol] ?? [],
    baselineOf: (symbol: Ticker) => over.baselines?.[symbol],
    grid: GRID,
    asOf: ASOF,
    ...(over.sessionRanking === undefined
      ? {}
      : { sessionRanking: over.sessionRanking }),
    ...(over.rows === undefined ? {} : { rows: over.rows }),
  });

/**
 * **A stored session ranking, as the nightly pass wrote one** (Task 5.4.5).
 *
 * Every figure on it is the pass's rather than this bundle's, which is the
 * property the assertions below are about: the counts, the refusals, the tape
 * and the bound are all **deliberately different** from the constants this
 * process would spell, so a producer reading its own instead of the row's is
 * visible rather than coincidentally right.
 */
const storedRanking = (
  scores: readonly StoredSessionPercentile[],
  overrides: Partial<StoredSessionPass> = {},
): StoredSessionRanking => ({
  pass: {
    observedAt: new Date("2026-09-15T20:00:00.000Z"),
    tracked: 501,
    eligible: 466,
    scored: 455,
    refusals: {
      nothingObserved: 35,
      noEarlierEndpoint: 0,
      noBasis: 0,
      tooFewSamples: 11,
      splitDiscontinuity: 0,
    },
    spanMinutes: 5,
    baseline: {
      feed: "sip",
      spanMinutes: 5,
      lookbackSessions: 59,
      minimumSampleCount: 2400,
    },
    ...overrides,
  },
  scores,
});

/** One stored score. The store returns these in TICKER order, never ranked. */
const storedScore = (
  symbol: string,
  rank: number,
  percent: number,
): StoredSessionPercentile => ({
  symbol: toTicker(symbol),
  rank,
  aboveSample: false,
  sampleCount: 4620,
  percent,
  from: {
    at: new Date("2026-09-15T19:54:00.000Z"),
    price: 100,
    feed: "sip",
  },
  to: {
    at: new Date("2026-09-15T19:59:00.000Z"),
    price: 100 + percent,
    feed: "sip",
  },
  observed: 5,
});

describe("unusualActivity — the counts and the row", () => {
  it("scores a security with a pair and a baseline, and states the three counts", () => {
    const section = score([live("NVDA")], {
      windows: { NVDA: pair(100, 110) },
      baselines: { NVDA: baseline() },
    });

    expect(section.tracked).toBe(1);
    expect(section.eligible).toBe(1);
    expect(section.scored).toBe(1);
    expect(section.rows).toHaveLength(1);

    const [row] = section.rows;

    // A +10% move against a baseline whose samples are 0…100 reaches the 10th
    // breakpoint and no higher — the ordinal is the input, which is what
    // `ONE_PER_RANK` is for.
    expect(row?.symbol).toBe("NVDA");
    expect(row?.rank).toBe(10);
    expect(row?.aboveSample).toBe(false);
    expect(row?.sampleCount).toBe(BASELINE_MINIMUM_SAMPLE);
    expect(row?.percent).toBeCloseTo(10, 10);
    expect(row?.observed).toBe(RETURN_SPAN_MINUTES);
  });

  it("carries both endpoints, with the instants they were measured between", () => {
    const section = score([live("NVDA")], {
      windows: { NVDA: pair(100, 110) },
      baselines: { NVDA: baseline() },
    });

    const [row] = section.rows;

    // `MeasuredReturn`'s rule, in a list: the figure may not be read without
    // the two instants it was measured between. They are the bars' own
    // `startsAt` with nothing added — adding the observation interval would
    // print a six-minute span for a five-minute return.
    expect(row?.from.at).toBe(
      new Date(
        ASOF.getTime() - (1 + RETURN_SPAN_MINUTES) * MINUTE,
      ).toISOString(),
    );
    expect(row?.to.at).toBe(new Date(ASOF.getTime() - MINUTE).toISOString());
    expect(row?.from.price).toBe(100);
    expect(row?.to.price).toBe(110);

    // Invariant 6 per endpoint: the numerator is the live tape's, and the
    // baseline's own tape is the section's.
    expect(row?.from.feed).toBe("iex");
    expect(row?.to.feed).toBe("iex");
    expect(section.baseline.feed).toBe("sip");
  });

  it("reads the window, the span and the bound rather than spelling any of them", () => {
    const section = score([live("NVDA")], {
      windows: { NVDA: pair(100, 110) },
      baselines: { NVDA: baseline() },
    });

    // The freshness cutoff is breadth's, read from its one home — ADR 0043's
    // first five. The measurement span is the return's — the second. They are
    // equal today and uncoupled for ever.
    //
    // The narrowing is the type's own: since Task 5.4.5 the cutoff exists on
    // the `observed` arm alone, because *heard from in the last five minutes*
    // is not a sentence about a session that has ended.
    expect(section.basis).toBe("observed");
    if (section.basis !== "observed") return;
    expect(section.windowMinutes).toBe(BREADTH_WINDOW_MINUTES);
    expect(section.spanMinutes).toBe(RETURN_SPAN_MINUTES);

    // The grid's stride is the sampler's — the third five — and it arrives as
    // an argument rather than being read here.
    expect(section.baseline.spanMinutes).toBe(GRID.spanMinutes);
    expect(section.baseline.minimumSampleCount).toBe(BASELINE_MINIMUM_SAMPLE);
  });

  it("reads the generation's session and lookback off the stored row", () => {
    const section = score([live("NVDA")], {
      windows: { NVDA: pair(100, 110) },
      baselines: { NVDA: baseline({ lookbackSessions: 42 }) },
    });

    // Off the row rather than off `BASELINE_LOOKBACK_SESSIONS`: 42 is not a
    // number this bundle believes in, and a rollback is all it takes for the
    // two to differ.
    expect(section.baseline.generation).toEqual({
      session: "2026-09-11",
      lookbackSessions: 42,
    });
  });

  it("omits the generation entirely where no row was read", () => {
    const section = score([live("NVDA")], {
      windows: { NVDA: pair(100, 110) },
    });

    // ADR 0029's defer rule at the producer: a cold replica, and every gated
    // run, has no generation to name — and a fully-formed record about no
    // baseline is a false impression rather than a courtesy.
    expect(section.baseline.generation).toBeUndefined();
    expect("generation" in section.baseline).toBe(false);
  });
});

describe("unusualActivity — a refused security is NOT a row", () => {
  it("omits a security the window has never heard of, and counts the kind", () => {
    const section = score([live("NVDA")], { baselines: { NVDA: baseline() } });

    expect(section.rows).toEqual([]);
    expect(section.eligible).toBe(0);
    expect(section.scored).toBe(0);
    expect(section.refusals.figure["nothing-observed"]).toBe(1);
  });

  it("omits a security with no bar the span back", () => {
    const section = score([live("NVDA")], {
      // One bar, so there is a newer endpoint and no older one — `ERIE`'s
      // state, and the one Story 5.2 exists for.
      windows: { NVDA: [observation(100, 1)] },
      baselines: { NVDA: baseline() },
    });

    expect(section.rows).toEqual([]);
    expect(section.refusals.figure["no-earlier-endpoint"]).toBe(1);
    expect(section.refusals.figure["nothing-observed"]).toBe(0);
  });

  it("omits a security whose older endpoint is not a number to divide by", () => {
    const section = score([live("NVDA")], {
      windows: { NVDA: pair(0, 110) },
      baselines: { NVDA: baseline() },
    });

    expect(section.rows).toEqual([]);
    expect(section.refusals.figure["no-basis"]).toBe(1);
  });

  it("omits a security with no baseline at all, and counts it as too few samples", () => {
    const section = score([live("NVDA")], {
      windows: { NVDA: pair(100, 110) },
    });

    // The figure exists, so it is **eligible** and not scored — which is the
    // whole reason the two counts are separate numbers.
    expect(section.eligible).toBe(1);
    expect(section.scored).toBe(0);
    expect(section.rows).toEqual([]);
    expect(section.refusals.comparison["too-few-samples"]).toBe(1);
  });

  it("omits a security whose baseline is too short to rank", () => {
    const section = score([live("NVDA")], {
      windows: { NVDA: pair(100, 110) },
      baselines: {
        NVDA: baseline({ sampleCount: BASELINE_MINIMUM_SAMPLE - 1 }),
      },
    });

    expect(section.eligible).toBe(1);
    expect(section.scored).toBe(0);
    expect(section.refusals.comparison["too-few-samples"]).toBe(1);
  });

  it("omits a split-refused security, and does NOT count it as too few samples", () => {
    const section = score([live("NVDA")], {
      windows: { NVDA: pair(100, 110) },
      baselines: {
        NVDA: {
          symbol: toTicker("NVDA"),
          observedAt: new Date("2026-09-11T20:00:00.000Z"),
          lookbackSessions: 60,
          sampleCount: 4620,
          refusal: "split-discontinuity",
        },
      },
    });

    // The two must not read alike: *we have too little history* and *the
    // history we have contains a price break we cannot adjust* have different
    // repairs, and one count for both would make the surface pick a sentence.
    expect(section.refusals.comparison["split-discontinuity"]).toBe(1);
    expect(section.refusals.comparison["too-few-samples"]).toBe(0);
    expect(section.rows).toEqual([]);
  });

  it("never carries a rank, a sentinel or a null for a refused security", () => {
    const section = score(
      [live("AAA"), live("BBB"), live("CCC"), live("DDD")],
      {
        windows: {
          AAA: pair(100, 110),
          BBB: pair(100, 103),
          CCC: [observation(100, 1)],
        },
        baselines: { AAA: baseline(), BBB: baseline() },
      },
    );

    // Two scored, two refused — and the refused ones are **absent** rather
    // than present with a `rank: 0`, which a lenient reader would draw as the
    // most ordinary move on record at the top of a region about unusual ones.
    expect(section.rows.map((row) => row.symbol)).toEqual(["AAA", "BBB"]);
    expect(section.tracked).toBe(4);
    expect(section.eligible).toBe(2);
    expect(section.scored).toBe(2);

    // The arithmetic the region's sentence depends on.
    const refused =
      Object.values(section.refusals.figure).reduce((sum, n) => sum + n, 0) +
      Object.values(section.refusals.comparison).reduce((sum, n) => sum + n, 0);
    expect(section.tracked - section.scored).toBe(refused);
  });
});

describe("unusualActivity — the order and the tie-break", () => {
  const windows = {
    AAA: pair(100, 150),
    BBB: pair(100, 110),
    CCC: pair(100, 110),
    DDD: pair(100, 103),
  } as const;

  const baselines = {
    AAA: baseline(),
    BBB: baseline(),
    CCC: baseline(),
    DDD: baseline(),
  } as const;

  it("ranks most unusual first", () => {
    const section = score([live("DDD"), live("AAA"), live("BBB")], {
      windows,
      baselines,
    });

    expect(section.rows.map((row) => row.symbol)).toEqual([
      "AAA",
      "BBB",
      "DDD",
    ]);
    expect(section.rows.map((row) => row.rank)).toEqual([50, 10, 3]);
  });

  it("breaks a tie on the ticker ascending, whatever order the join reported", () => {
    const given = score([live("BBB"), live("CCC")], { windows, baselines });
    const reversed = score([live("CCC"), live("BBB")], { windows, baselines });

    // Both rows are the 10th percentile. The join's order is the universe's
    // and re-orders under a live feed, so a `0` from the comparator — a stable
    // sort over the arrival order — would swap these two between frames with
    // nothing having changed.
    expect(given.rows.map((row) => row.symbol)).toEqual(["BBB", "CCC"]);
    expect(reversed.rows.map((row) => row.symbol)).toEqual(["BBB", "CCC"]);
  });

  it("cuts to the row bound and takes the strongest, not the first seen", () => {
    const section = score([live("DDD"), live("AAA"), live("BBB")], {
      windows,
      baselines,
      rows: 2,
    });

    expect(section.rows.map((row) => row.symbol)).toEqual(["AAA", "BBB"]);
    // The cut is visible in the arithmetic rather than hidden: three were
    // scored and two are drawn.
    expect(section.scored).toBe(3);
  });

  it("defaults the bound to UNUSUAL_ROWS", () => {
    const many = Array.from({ length: UNUSUAL_ROWS + 3 }, (_unused, index) =>
      live(`A${String.fromCodePoint(65 + index)}`),
    );

    const section = score(many, {
      windows: Object.fromEntries(
        many.map((entry) => [entry.symbol, pair(100, 110)]),
      ),
      baselines: Object.fromEntries(
        many.map((entry) => [entry.symbol, baseline()]),
      ),
    });

    expect(section.rows).toHaveLength(UNUSUAL_ROWS);
    expect(section.scored).toBe(UNUSUAL_ROWS + 3);
  });

  it("agrees with the one comparator, row by row", () => {
    const section = score([live("DDD"), live("AAA"), live("BBB")], {
      windows,
      baselines,
    });

    // The verification half beside the rule: the drawn order is the order
    // `compareByPercentile` puts these rows in, and no second inequality is
    // expressed here to drift from it.
    for (let at = 1; at < section.rows.length; at += 1) {
      const earlier = section.rows[at - 1];
      const later = section.rows[at];
      expect(earlier).toBeDefined();
      expect(later).toBeDefined();
      if (earlier === undefined || later === undefined) return;
      expect(compareByPercentile(earlier, later)).toBeLessThan(1);
    }
  });
});

describe("unusualActivity — the basis gate", () => {
  it("reads no trailing window on the session basis, however full they are", () => {
    const section = score([live("NVDA")], {
      windows: { NVDA: pair(100, 110) },
      baselines: { NVDA: baseline() },
      marketOpen: false,
    });

    // Out of hours a process that was up at the bell still holds that
    // session's last bars — eviction is relative to each security's own newest
    // bar — so a pass that ignored the basis would rank yesterday's
    // 15:55→16:00 pair for ever as unusual activity right now. The windows
    // above are full; the section is the stored one, and nothing is stored.
    expect(section.basis).toBe("session");
    expect(section.rows).toEqual([]);
    expect(section.eligible).toBe(0);
    expect(section.scored).toBe(0);

    // And it is a refusal rather than a gap: the population is still stated,
    // and no refusal word is claimed about a security nothing was asked of.
    expect(section.tracked).toBe(1);
    expect(section.refusals.figure["nothing-observed"]).toBe(0);
  });

  it("names the session it asked about where nothing at all is stored", () => {
    const section = score([live("NVDA")], { marketOpen: false });

    // CI's permanent state, and every store's state before its first nightly
    // run. The sentence is dated rather than dateless, because *of the N
    // companies we track, none had a move into the close on this session* is
    // the true claim about a store with nothing in it.
    expect(section.basis).toBe("session");
    if (section.basis !== "session") return;
    expect(section.session).toBe("2026-09-16");

    // The spans and the bound are still stated — a section with no rows still
    // says what the comparison would have been of — and there is no
    // generation, which is the one thing nothing stored can tell us.
    expect(section.spanMinutes).toBe(RETURN_SPAN_MINUTES);
    expect(section.baseline.feed).toBe("sip");
    expect(section.baseline.generation).toBeUndefined();
  });

  it("draws the stored session's rows, ranked, with the PASS's own figures", () => {
    const section = score([live("NVDA")], {
      marketOpen: false,
      // Ticker order in, ranked order out — the store never sorts, because
      // `one-comparator-for-the-order-of-a-percentile` permits one home for
      // that order and this is not it.
      sessionRanking: storedRanking([
        storedScore("AMD", 71, -1.2),
        storedScore("MSFT", 99, 3.4),
        storedScore("NVDA", 88, -2.6),
      ]),
    });

    expect(section.basis).toBe("session");
    expect(section.rows.map((row) => row.symbol)).toEqual([
      "MSFT",
      "NVDA",
      "AMD",
    ]);

    // **The three counts are the pass's**, not this process's: the entries
    // handed in are one security, and the figures are 501/466/455.
    expect(section.tracked).toBe(501);
    expect(section.eligible).toBe(466);
    expect(section.scored).toBe(455);

    // **So are the five refusals**, which is what makes the footer out of
    // hours the same sentence it is at 11:00.
    expect(section.refusals.figure["nothing-observed"]).toBe(35);
    expect(section.refusals.comparison["too-few-samples"]).toBe(11);
  });

  it("states the stored session rather than the one it asked about", () => {
    const section = score([live("NVDA")], {
      marketOpen: false,
      sessionRanking: storedRanking([storedScore("NVDA", 88, -2.6)]),
    });

    if (section.basis !== "session")
      throw new Error("expected the session arm");

    // The shared pass asked about 2026-09-16 and the stored row is FOR
    // 2026-09-15 — the disagreement every evening between the bell and that
    // night's run. A date recorded against another session's figures is
    // `last-closes-cache.ts`' recorded defect: well-formed, correctly spelled,
    // wrong.
    expect(section.session).toBe("2026-09-15");
    expect(section.baseline.generation?.session).toBe("2026-09-15");
  });

  it("reads the baseline's facts off the stored pass rather than its own constants", () => {
    const section = score([live("NVDA")], {
      marketOpen: false,
      sessionRanking: storedRanking([storedScore("NVDA", 88, -2.6)]),
    });

    // Deliberately not this bundle's values: a rollback can put a runner and a
    // reader two values apart, and the figure the screen states must be the
    // one the producer applied (`0014` §5).
    expect(section.baseline.generation?.lookbackSessions).toBe(59);
    expect(section.baseline.minimumSampleCount).toBe(2400);
    expect(section.baseline.minimumSampleCount).not.toBe(
      BASELINE_MINIMUM_SAMPLE,
    );
  });

  it("bounds the stored rows at the row budget", () => {
    const section = score([live("NVDA")], {
      marketOpen: false,
      sessionRanking: storedRanking(
        // Real ticker shapes, because `toTicker` refuses anything else — a
        // fixture the domain would reject is a measurement of nothing.
        Array.from({ length: UNUSUAL_ROWS + 4 }, (_unused, at) =>
          storedScore(
            `A${String.fromCharCode(65 + at)}`,
            Math.max(0, 99 - at),
            1 + at,
          ),
        ),
      ),
      rows: UNUSUAL_ROWS,
    });

    expect(section.rows).toHaveLength(UNUSUAL_ROWS);
  });
});

describe("unusualActivity — the shared pass is untouched", () => {
  /**
   * **The assertion is on the PRODUCER, because the wire cannot see a defect
   * in one** (Task 4.8.11's lesson, one producer over).
   *
   * The defect this refuses is the word Story 5.4's Gate 1 struck out: a pass
   * that **splits** — filtered in place, re-derived, or narrowed for this
   * region's predicate — leaving `Market breadth`'s count and `Movers`' rows
   * taken over a smaller population. Every figure would still be well-formed,
   * every section would still encode, and the two sections' denominators would
   * disagree with each other by however many securities hold a baseline.
   *
   * So the comparison is of the **producers' own answers** before and after,
   * byte for byte, plus the array's identity: a new array with the same
   * contents would be a copy this region could mutate tomorrow.
   */
  const entries = [live("AAA"), live("BBB"), live("CCC")];

  it("leaves the pass's array identical — identity, contents and both consumers", () => {
    const pass = eligibleMoves(entries, OPEN);

    const movesBefore = pass.moves;
    const serialisedBefore = JSON.stringify(pass);
    const breadthBefore = JSON.stringify(marketBreadth(pass));
    const moversBefore = JSON.stringify(
      topMovers(pass, (entry) => ({ state: "unknown", symbol: entry.symbol })),
    );

    unusualActivity({
      moves: pass,
      windowOf: () => pair(100, 110),
      baselineOf: () => baseline(),
      grid: GRID,
      asOf: ASOF,
    });

    expect(pass.moves).toBe(movesBefore);
    expect(JSON.stringify(pass)).toBe(serialisedBefore);
    expect(JSON.stringify(marketBreadth(pass))).toBe(breadthBefore);
    expect(
      JSON.stringify(
        topMovers(pass, (entry) => ({
          state: "unknown",
          symbol: entry.symbol,
        })),
      ),
    ).toBe(moversBefore);
  });

  it("reads the population off the pass rather than counting its own rows", () => {
    const pass = eligibleMoves([...entries, live("DDD", 30)], OPEN);

    // `DDD` is outside the freshness cutoff, so the shared pass excluded it —
    // and `tracked` is still four, because it is the size of the set the pass
    // was over rather than the length of anything this module built.
    expect(pass.moves).toHaveLength(3);

    const section = unusualActivity({
      moves: pass,
      windowOf: () => [],
      baselineOf: () => undefined,
      grid: GRID,
      asOf: ASOF,
    });

    expect(section.tracked).toBe(4);
    expect(section.refusals.figure["nothing-observed"]).toBe(3);
  });

  it("is over the session basis's own array too, and still writes nothing", () => {
    const pass = eligibleMoves(entries, SHUT);
    const before = JSON.stringify(pass);

    unusualActivity({
      moves: pass,
      windowOf: () => pair(100, 110),
      baselineOf: () => baseline(),
      grid: GRID,
      asOf: ASOF,
    });

    expect(JSON.stringify(pass)).toBe(before);
  });
});
