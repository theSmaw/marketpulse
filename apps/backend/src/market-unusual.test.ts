import {
  BASELINE_MINIMUM_SAMPLE,
  FACTOR_WEIGHTS,
  UNUSUAL_ROWS,
  bandOf,
  compareByScore,
  scoreAnomaly,
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
import type {
  AnomalyScore,
  CompositeFactor,
  ExcessMoveReference,
  FactorAnswer,
} from "@marketpulse/shared";
import type { StoredExcessBaseline } from "./excess-move-baseline-store.js";
import type {
  StoredCompositePass,
  StoredCompositeRanking,
  StoredCompositeScore,
} from "./session-composite-store.js";

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

/**
 * **The benchmark every equity below is differenced against** — `XLK`, the
 * technology SPDR, which is the one `excessMoveReference` resolves for `NVDA`.
 *
 * It is the default for every symbol in these fixtures rather than per-symbol,
 * because what this module does with the answer is read it and hand it on: the
 * resolver's own correctness is `excess-move-reference.test.ts`'.
 */
const BENCHMARK = toTicker("XLK");

const REFERENCE: ExcessMoveReference = {
  applies: true,
  symbol: BENCHMARK,
  sector: "technology",
};

/**
 * An excess-move baseline whose breakpoints are `0 … 10` evenly, so a
 * magnitude of `r` sits at the `10 r`th percentile and the arithmetic is
 * checkable by eye — `excess-move-factor.test.ts`' own fixture.
 */
const excessBaseline = (
  symbol: string,
  sampleCount = BASELINE_MINIMUM_SAMPLE,
): StoredExcessBaseline => ({
  symbol: toTicker(symbol),
  observedAt: new Date("2026-09-11T20:00:00.000Z"),
  referenceKind: "sector_etf",
  referenceSymbol: BENCHMARK,
  lookbackSessions: 60,
  sampleCount,
  refusal: null,
  breakpoints: Array.from({ length: 101 }, (_unused, rank) => rank / 10),
});

/** The price factor's own weight — read, never typed. */
const PRICE_ONLY_MAX = FACTOR_WEIGHTS.price;

/** `{price, excess}` — the cohort every machine that exists produces. */
const TWO_FACTOR_MAX = FACTOR_WEIGHTS.price + FACTOR_WEIGHTS.excess;

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
    readonly excess?: Readonly<Record<string, StoredExcessBaseline>>;
    /**
     * The resolver's answer per symbol. Defaults to {@link REFERENCE} for
     * every symbol, which is what the shared pass's own population looks like
     * — 501 curated equities, each with a sector.
     */
    readonly referenceOf?: (symbol: Ticker) => ExcessMoveReference | undefined;
    readonly marketOpen?: boolean;
    readonly rows?: number;
    readonly sessionRanking?: StoredSessionRanking;
    readonly compositeRanking?: StoredCompositeRanking;
  } = {},
) =>
  unusualActivity({
    moves: eligibleMoves(entries, {
      asOf: ASOF,
      marketOpen: over.marketOpen ?? true,
    }),
    windowOf: (symbol: Ticker) => over.windows?.[symbol] ?? [],
    baselineOf: (symbol: Ticker) => over.baselines?.[symbol],
    excessBaselineOf: (symbol: Ticker) => over.excess?.[symbol],
    referenceOf: over.referenceOf ?? (() => REFERENCE),
    grid: GRID,
    asOf: ASOF,
    ...(over.sessionRanking === undefined
      ? {}
      : { sessionRanking: over.sessionRanking }),
    ...(over.compositeRanking === undefined
      ? {}
      : { compositeRanking: over.compositeRanking }),
    ...(over.rows === undefined ? {} : { rows: over.rows }),
  });

/**
 * **A score minted through the real scorer**, for the stored-composite
 * fixtures below — never a typed object, because `AnomalyScore` is branded and
 * unforgeable outside its own module and the store's own reader mints rather
 * than reading the stored column (`0017` §5).
 */
const minted = (
  answers: Readonly<Record<CompositeFactor, FactorAnswer>>,
): AnomalyScore => {
  const outcome = scoreAnomaly(answers);
  if (!outcome.scored) throw new Error("the fixture produced no score");
  return outcome;
};

const RANKED_AT = (rank: number): FactorAnswer => ({
  state: "ranked",
  rank,
  aboveSample: false,
  sampleCount: 4620,
});

const PRICE_REFUSED: FactorAnswer = {
  state: "refused",
  refusal: "too-few-samples",
  sampleCount: 100,
  minimumSampleCount: 2500,
};

/** One stored composite, as `readNewestSession` returns one. */
const storedComposite = (
  symbol: string,
  rank: number,
  factors: readonly CompositeFactor[] = ["price", "excess"],
): StoredCompositeScore => {
  const answers = {
    price: factors.includes("price") ? RANKED_AT(rank) : PRICE_REFUSED,
    excess: factors.includes("excess") ? RANKED_AT(rank) : PRICE_REFUSED,
    volume: { state: "no-distribution" },
  } satisfies Record<CompositeFactor, FactorAnswer>;

  return { symbol: toTicker(symbol), outcome: minted(answers), answers };
};

/**
 * **A stored composite ranking, as the nightly pass wrote one** (Task 5.6.7).
 *
 * `observedAt` matches `storedRanking`'s by default, because the producer
 * refuses to mix two sessions' halves and the ordinary state is that they
 * agree — `0017` §2 keys both tables on the same session's close for exactly
 * that.
 */
const storedComposites = (
  scores: readonly StoredCompositeScore[],
  overrides: Partial<StoredCompositePass> = {},
): StoredCompositeRanking => ({
  pass: {
    observedAt: new Date("2026-09-15T20:00:00.000Z"),
    tracked: 501,
    scored: 485,
    unscored: 16,
    weights: FACTOR_WEIGHTS,
    floors: { elevated: 32, high: 63, extreme: 73 },
    ...overrides,
  },
  scores,
  disagreed: 0,
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
    // `ONE_PER_RANK` is for. The price factor's contribution is therefore
    // `round(40 × 10 / 100) = 4`, and with no excess baseline given the excess
    // factor refuses: so the score is **4** on a one-factor scale.
    expect(row?.symbol).toBe("NVDA");
    expect(row?.score).toBe(4);
    expect(row?.band).toBe(bandOf(4));
    expect(row?.percent).toBeCloseTo(10, 10);
  });

  it("carries the band the PRODUCER minted rather than one the row implies", () => {
    const section = score([live("NVDA")], {
      // A +90% move reaches the 90th breakpoint, so the price factor pays
      // `round(40 × 90 / 100) = 36` of its 40 — which is above `elevated`'s
      // floor of 32 and below `high`'s 63.
      windows: { NVDA: pair(100, 190) },
      baselines: { NVDA: baseline() },
    });

    const [row] = section.rows;

    expect(row?.score).toBe(36);
    expect(row?.band).toBe("elevated");
  });

  it("carries the score, the band and the move, and NOTHING of the explanation", () => {
    // **ADR 0031 at this grain, and the leak it prevents is the whole
    // explanation**: the producer ranks on a minted `AnomalyScore` carrying a
    // clause per factor with every figure behind it, and on a socket a field
    // on the object and not on the type leaks. `Candidate` is a separate type
    // for exactly this.
    const section = score([live("NVDA")], {
      windows: { NVDA: pair(100, 110) },
      baselines: { NVDA: baseline() },
      excess: { NVDA: excessBaseline("NVDA") },
    });

    const [row] = section.rows;
    expect(row).toBeDefined();
    if (row === undefined) return;

    expect(Object.keys(row).toSorted()).toEqual([
      "band",
      "percent",
      "score",
      "symbol",
    ]);

    // And the baseline's own tape is still the section's — invariant 6 for the
    // denominator, which no longer has a per-row numerator beside it.
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

  it("COUNTS a refused price baseline and no longer drops the row", () => {
    // **The meaning change at the heart of Task 5.6.7.** Until then this
    // `continue`d: the ordinal was the row's figure, so no baseline meant no
    // figure meant no row. Under a composite a refused price factor is an
    // **absent factor** — so a security whose excess move ranked is honestly
    // scored on a lower scale, and the tally still counts the price factor's
    // own refusal because the region's cut sentence is written from it.
    const section = score([live("NVDA")], {
      windows: { NVDA: pair(100, 110), XLK: pair(100, 101) },
      excess: { NVDA: excessBaseline("NVDA") },
    });

    expect(section.eligible).toBe(1);
    // It got a score, so it is **scored** — which is the count that changed
    // meaning. The excess is `10 − 1 = 9` points, at the 90th breakpoint of a
    // `0 … 10` distribution, so `round(35 × 90 / 100) = 32` of 35.
    expect(section.scored).toBe(1);
    expect(section.rows).toHaveLength(1);
    expect(section.rows[0]?.score).toBe(32);
    // And the cohort says which scale that is: the excess factor alone.
    expect(section.cohort?.factors).toEqual(["excess"]);
    expect(section.cohort?.max).toBe(FACTOR_WEIGHTS.excess);
    // The refusal is still counted, so the footer can still say why.
    expect(section.refusals.comparison["too-few-samples"]).toBe(1);
  });

  it("omits a security whose EVERY factor refused, with no score member at all", () => {
    // `UnscoredAnomaly` has no `score` member, so there is no `?? 0` to write
    // and no `rank: null` to leak — a `0` would be the most ordinary security
    // on record drawn at the top of a region about unusual ones.
    const section = score([live("NVDA")], {
      windows: { NVDA: pair(100, 110) },
    });

    expect(section.eligible).toBe(1);
    expect(section.scored).toBe(0);
    expect(section.rows).toEqual([]);
    expect(section.cohort).toBeUndefined();
    expect(section.refusals.comparison["too-few-samples"]).toBe(1);
  });

  it("counts a baseline too short to rank, and does not score on it", () => {
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

  it("counts a split-refused security separately from a short one", () => {
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

  it("omits a security with no resolvable benchmark rather than inventing one", () => {
    // There is no honest `FactorAnswer` for *we did not ask*: `inapplicable`
    // means the question does not arise and `refused` demands a word and two
    // counts. So the security falls out unscored rather than being handed an
    // answer nobody computed — and it is unreachable for the shared pass's own
    // population, which is 501 curated equities.
    const section = score([live("NVDA")], {
      windows: { NVDA: pair(100, 110) },
      baselines: { NVDA: baseline() },
      referenceOf: () => undefined,
    });

    expect(section.eligible).toBe(1);
    expect(section.scored).toBe(0);
    expect(section.rows).toEqual([]);
  });

  it("scores an INAPPLICABLE security on its price factor alone", () => {
    // A broad-market fund has no sector and a sector ETF is its own benchmark,
    // so the excess question does not arise — which is a different thing from
    // refusing it, and the score is honestly one-factor rather than absent.
    const section = score([live("NVDA")], {
      windows: { NVDA: pair(100, 110) },
      baselines: { NVDA: baseline() },
      referenceOf: () => ({ applies: false, because: "no-sector" }),
    });

    expect(section.scored).toBe(1);
    expect(section.cohort?.factors).toEqual(["price"]);
    expect(section.cohort?.max).toBe(PRICE_ONLY_MAX);
  });

  it("never carries a score, a sentinel or a null for a security with no factor", () => {
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

    // Two scored, two with no factor at all — and the latter are **absent**
    // rather than present with a `score: 0`, which a lenient reader would draw
    // as the most ordinary security on record at the top of a region about
    // unusual ones.
    expect(section.rows.map((row) => row.symbol)).toEqual(["AAA", "BBB"]);
    expect(section.tracked).toBe(4);
    expect(section.eligible).toBe(2);
    expect(section.scored).toBe(2);

    // **The nesting chain, which gained a link.** The rows are a selection
    // from the **cohort** rather than from `scored`.
    expect(section.rows.length).toBeLessThanOrEqual(
      section.cohort?.scored ?? 0,
    );
    expect(section.cohort?.scored ?? 0).toBeLessThanOrEqual(section.scored);
    expect(section.scored).toBeLessThanOrEqual(section.eligible);
    expect(section.eligible).toBeLessThanOrEqual(section.tracked);
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
    // `round(40 × rank / 100)` at the 50th, 10th and 3rd breakpoints.
    expect(section.rows.map((row) => row.score)).toEqual([20, 4, 1]);
  });

  it("breaks a tie on the ticker ascending, whatever order the join reported", () => {
    const given = score([live("BBB"), live("CCC")], { windows, baselines });
    const reversed = score([live("CCC"), live("BBB")], { windows, baselines });

    // Both rows score 4. The join's order is the universe's
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
    // `compareByScore` puts these rows in, and no second inequality is
    // expressed here to drift from it.
    for (let at = 1; at < section.rows.length; at += 1) {
      const earlier = section.rows[at - 1];
      const later = section.rows[at];
      expect(earlier).toBeDefined();
      expect(later).toBeDefined();
      if (earlier === undefined || later === undefined) return;
      expect(compareByScore(earlier, later)).toBeLessThan(1);
    }
  });

  it("ranks within ONE cohort and counts the securities on another scale", () => {
    // **AC 3 arriving at a ranked surface.** A one-factor score of 32 would
    // outrank a two-factor score of 20 on the raw scale — correctly, within a
    // cohort — and ranking them together is the promotion of the worst-covered
    // securities AC 3 refuses in terms: a score from fewer factors has the
    // higher variance.
    //
    // `AAA` and `BBB` have both baselines; `CCC` has only the excess one. So
    // `{price, excess}` is the larger cohort at two members and `CCC` is set
    // aside — **counted**, so the restriction is visible rather than silent.
    const section = score([live("AAA"), live("BBB"), live("CCC")], {
      windows: {
        AAA: pair(100, 150),
        BBB: pair(100, 110),
        CCC: pair(100, 190),
        XLK: pair(100, 101),
      },
      baselines: { AAA: baseline(), BBB: baseline() },
      excess: {
        AAA: excessBaseline("AAA"),
        BBB: excessBaseline("BBB"),
        CCC: excessBaseline("CCC"),
      },
    });

    expect(section.cohort?.factors).toEqual(["price", "excess"]);
    expect(section.cohort?.max).toBe(TWO_FACTOR_MAX);
    expect(section.cohort?.scored).toBe(2);
    expect(section.cohort?.others).toBe(1);

    // Three got a score; two are ranked. The chain closes.
    expect(section.scored).toBe(3);
    expect(section.rows.map((row) => row.symbol)).toEqual(["AAA", "BBB"]);

    // And `CCC`'s score is the highest of the three — which is exactly why
    // ranking across cohorts would have promoted it.
    expect(section.rows.every((row) => row.symbol !== "CCC")).toBe(true);
  });

  it("reads the benchmark's leg ONCE however many securities share it", () => {
    // ~512 walks a batch rather than ~1,002: 501 subjects plus the eleven
    // sector SPDRs, each read once. A `Map` keyed on the **benchmark's**
    // symbol is what makes 501 reads into 11, and it is the whole of this
    // task's cost story.
    const reads: string[] = [];
    const entries = [live("AAA"), live("BBB"), live("CCC")];

    unusualActivity({
      moves: eligibleMoves(entries, OPEN),
      windowOf: (symbol: Ticker) => {
        reads.push(symbol);
        return pair(100, 110);
      },
      baselineOf: () => baseline(),
      excessBaselineOf: (symbol: Ticker) => excessBaseline(symbol),
      referenceOf: () => REFERENCE,
      grid: GRID,
      asOf: ASOF,
    });

    expect(reads.filter((symbol) => symbol === BENCHMARK)).toHaveLength(1);
    expect(reads.filter((symbol) => symbol !== BENCHMARK)).toEqual([
      "AAA",
      "BBB",
      "CCC",
    ]);
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

  it("draws the stored COMPOSITE's rows, ranked, with each pass's own figures", () => {
    const section = score([live("NVDA")], {
      marketOpen: false,
      // Ticker order in, ranked order out — the store never sorts, because
      // `one-comparator-for-the-order-of-a-composite-score` permits one home
      // for that order and this is not it.
      sessionRanking: storedRanking([
        storedScore("AMD", 71, -1.2),
        storedScore("MSFT", 99, 3.4),
        storedScore("NVDA", 88, -2.6),
      ]),
      compositeRanking: storedComposites([
        storedComposite("AMD", 71),
        storedComposite("MSFT", 99),
        storedComposite("NVDA", 88),
      ]),
    });

    expect(section.basis).toBe("session");
    expect(section.rows.map((row) => row.symbol)).toEqual([
      "MSFT",
      "NVDA",
      "AMD",
    ]);

    // **The scores are MINTED from the stored answers**, never read off the
    // stored column (`0017` §5, and `a-stored-composite-is-minted-from-its-
    // answers` in `pnpm invariants`). At rank 99 both factors pay nearly in
    // full: `round(40 × 99/100) + round(35 × 99/100) = 40 + 35 = 75`.
    expect(section.rows[0]?.score).toBe(75);
    expect(section.rows[0]?.band).toBe(bandOf(75));

    // **`tracked` and `eligible` are the PERCENTILE pass's** — the composite
    // pass row has no `eligible` column, because `tracked = scored + unscored`
    // is the only arithmetic that table closes.
    expect(section.tracked).toBe(501);
    expect(section.eligible).toBe(466);
    // **And `scored` is the COMPOSITE pass's**, which is a genuinely different
    // figure: 485 against the percentile pass's 455.
    expect(section.scored).toBe(485);

    // **The five refusals are the percentile pass's**, which is what makes the
    // footer out of hours the same sentence it is at 11:00.
    expect(section.refusals.figure["nothing-observed"]).toBe(35);
    expect(section.refusals.comparison["too-few-samples"]).toBe(11);
  });

  it("reads the MOVE from beside the score, because the composite row has none", () => {
    // `session_composite_scores` stores the factor answers and no signed move
    // — the ordinal, its `n` and the two endpoints live in
    // `session_return_percentiles`, keyed by the same `observed_at` (`0017`
    // §2 pairs them deliberately). The glyph cannot do without it.
    const section = score([live("NVDA")], {
      marketOpen: false,
      sessionRanking: storedRanking([storedScore("NVDA", 88, -2.6)]),
      compositeRanking: storedComposites([storedComposite("NVDA", 88)]),
    });

    expect(section.rows[0]?.percent).toBeCloseTo(-2.6, 10);
  });

  it("omits the move for a security with a composite row and no percentile row", () => {
    // A security scored on its excess factor alone — `0` of 485 measured, and
    // representable. The glyph is absent rather than invented, because a
    // direction of `0` is the claim *this security did not move*.
    const section = score([live("NVDA")], {
      marketOpen: false,
      sessionRanking: storedRanking([storedScore("AMD", 71, -1.2)]),
      compositeRanking: storedComposites([storedComposite("NVDA", 88)]),
    });

    expect(section.rows.map((row) => row.symbol)).toEqual(["NVDA"]);
    expect(section.rows[0]?.percent).toBeUndefined();
    expect("percent" in (section.rows[0] ?? {})).toBe(false);
  });

  it("states the stored COHORT, which is `{price, excess}` on every machine", () => {
    const section = score([live("NVDA")], {
      marketOpen: false,
      sessionRanking: storedRanking([storedScore("NVDA", 88, -2.6)]),
      compositeRanking: storedComposites([storedComposite("NVDA", 88)]),
    });

    expect(section.cohort?.factors).toEqual(["price", "excess"]);
    expect(section.cohort?.max).toBe(TWO_FACTOR_MAX);
    expect(section.cohort?.others).toBe(0);
  });

  it("DROPS the composite where the two tables are for different sessions", () => {
    // **The defect this refuses is `last-closes-cache.ts`' recorded one**: the
    // two caches memoise on their own pass rows' instants and read *the newest
    // session at or before* independently, so a crash between the two writes —
    // or a re-run that got through one — leaves them one session apart. Stating
    // Friday's `eligible` beside Thursday's scores is a well-formed,
    // correctly-dated wrong answer.
    const section = score([live("NVDA")], {
      marketOpen: false,
      sessionRanking: storedRanking([storedScore("NVDA", 88, -2.6)]),
      compositeRanking: storedComposites([storedComposite("NVDA", 88)], {
        observedAt: new Date("2026-09-14T20:00:00.000Z"),
      }),
    });

    expect(section.rows).toEqual([]);
    expect(section.scored).toBe(0);
    expect(section.cohort).toBeUndefined();
    // The percentile pass's own figures still travel, so the footer is honest
    // about the population it heard from.
    expect(section.tracked).toBe(501);
    expect(section.eligible).toBe(466);
    if (section.basis !== "session")
      throw new Error("expected the session arm");
    expect(section.session).toBe("2026-09-15");
  });

  it("draws no rows where the percentile pass is stored and the composite is not", () => {
    // The state between the migration deploying and the next nightly run, and
    // `scored: 0` is honest rather than conservative: none of these securities
    // has a composite this process can draw.
    const section = score([live("NVDA")], {
      marketOpen: false,
      sessionRanking: storedRanking([storedScore("NVDA", 88, -2.6)]),
    });

    expect(section.rows).toEqual([]);
    expect(section.scored).toBe(0);
    expect(section.eligible).toBe(466);
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
    const symbols = Array.from(
      { length: UNUSUAL_ROWS + 4 },
      // Real ticker shapes, because `toTicker` refuses anything else — a
      // fixture the domain would reject is a measurement of nothing.
      (_unused, at) => `A${String.fromCharCode(65 + at)}`,
    );

    const section = score([live("NVDA")], {
      marketOpen: false,
      sessionRanking: storedRanking(
        symbols.map((symbol, at) =>
          storedScore(symbol, Math.max(0, 99 - at), 1 + at),
        ),
      ),
      compositeRanking: storedComposites(
        symbols.map((symbol, at) =>
          storedComposite(symbol, Math.max(0, 99 - at)),
        ),
      ),
      rows: UNUSUAL_ROWS,
    });

    expect(section.rows).toHaveLength(UNUSUAL_ROWS);
    // The cut is visible in the arithmetic rather than hidden.
    expect(section.cohort?.scored).toBe(UNUSUAL_ROWS + 4);
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
      excessBaselineOf: () => undefined,
      referenceOf: () => REFERENCE,
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
      excessBaselineOf: () => undefined,
      referenceOf: () => REFERENCE,
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
      excessBaselineOf: () => undefined,
      referenceOf: () => REFERENCE,
      grid: GRID,
      asOf: ASOF,
    });

    expect(JSON.stringify(pass)).toBe(before);
  });
});
