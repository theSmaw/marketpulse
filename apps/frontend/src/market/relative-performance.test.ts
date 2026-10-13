import { describe, expect, it } from "vitest";

import {
  SECTOR_ETFS,
  toTicker,
  type Bar,
  type EquitySecurity,
  type IndexEtfSecurity,
  type MarketDate,
  type SectorEtfSecurity,
  type SecurityLastClose,
  type WireMarketOverview,
  type WireOverviewFigure,
} from "@marketpulse/shared";

import { basisOf } from "./sector-performance.js";
import {
  NO_COMPARISON,
  REFERENCE_CLAIM,
  RELATIVE_RUNGS,
  RESERVED_RELATIVE,
  fitRelativeRung,
  relativePerformance,
  sharedBasis,
  subjectFigure,
  type RelativeComparison,
  type RelativeSubject,
} from "./relative-performance.js";

// The three reads, the four basis outcomes and the refusals (Task 5.1.3).
//
// **The tickers in here are read off `SECTOR_ETFS` rather than typed**, which
// is not only the invariant: a hand-typed benchmark is the permutation defect
// `sector-ranking.ts` names, and a test that types one asserts the pairing it
// is supposed to be checking.

const BENCHMARK = SECTOR_ETFS.technology;
const MARKET = "SPY";

const equity = (sector: EquitySecurity["sector"]): EquitySecurity => ({
  symbol: toTicker("NVDA"),
  name: "NVIDIA Corporation",
  exchange: "NASDAQ",
  kind: "equity",
  sector,
  industry: "Semiconductors",
  status: "active",
  cik: null,
});

const sectorFund = (): SectorEtfSecurity => ({
  symbol: toTicker(BENCHMARK),
  name: "The Technology Select Sector SPDR Fund",
  exchange: "ARCA",
  kind: "sector_etf",
  sector: "technology",
  industry: null,
  status: "active",
  cik: null,
});

const indexFund = (): IndexEtfSecurity => ({
  symbol: toTicker(MARKET),
  name: "SPDR S&P 500 ETF Trust",
  exchange: "ARCA",
  kind: "index_etf",
  sector: null,
  industry: null,
  status: "active",
  cik: null,
});

const bar = (close: number, at = "2026-10-13T18:01:00.000Z"): Bar => ({
  startsAt: new Date(at),
  open: close,
  high: close,
  low: close,
  close,
  volume: 1_000,
});

const closeOf = (
  close: number,
  previousClose: number | null,
  session = "2026-10-10",
): SecurityLastClose => ({
  symbol: toTicker("NVDA"),
  session: session as MarketDate,
  close,
  previousClose,
});

const observed = (
  symbol: string,
  changePercent?: number,
  changeBasis?: string,
): WireOverviewFigure => ({
  state: "observed",
  symbol,
  at: "2026-10-13T18:01:00.000Z",
  price: 100,
  ...(changePercent === undefined ? {} : { changePercent }),
  ...(changeBasis === undefined ? {} : { changeBasis }),
});

const storedFigure = (
  symbol: string,
  sessionChangePercent?: number,
  session = "2026-10-13",
): WireOverviewFigure => ({
  state: "stored",
  symbol,
  session,
  close: 100,
  ...(sessionChangePercent === undefined ? {} : { sessionChangePercent }),
});

const frame = (
  figures: readonly WireOverviewFigure[],
  sectors?: readonly WireOverviewFigure[],
): WireMarketOverview => ({
  computedAt: "2026-10-13T18:01:00.000Z",
  feeds: [],
  figures,
  ...(sectors === undefined ? {} : { sectors }),
});

/** A subject with a live price and a basis in a different session. */
const liveSubject = (close: number): RelativeSubject => ({
  security: equity("technology"),
  live: bar(close),
  // `session` is BEFORE the live bar's session, so `changeFromClose` measures
  // from `close` and names `2026-10-10` as the basis — the branch that gives
  // the subject a `changeBasis` rather than omitting one.
  lastClose: closeOf(100, 90),
});

/** A subject with a live price measured from the *unnamed* previous close. */
const sameSessionSubject = (close: number): RelativeSubject => ({
  security: equity("technology"),
  live: bar(close),
  // The store's last session IS the live bar's session, so the basis is
  // `previousClose` and carries no date — `LiveChange.basis` is `null`.
  lastClose: closeOf(100, 100, "2026-10-13"),
});

const storedSubject = (
  close: number,
  previousClose: number,
  session = "2026-10-13",
): RelativeSubject => ({
  security: equity("technology"),
  live: undefined,
  lastClose: closeOf(close, previousClose, session),
});

const lineFor = (
  comparisons: readonly RelativeComparison[],
  reference: "sector" | "market",
) => comparisons.find((line) => line.reference === reference);

describe("subjectFigure", () => {
  it("reads a live price as an observed figure that names its basis session", () => {
    const figure = subjectFigure(liveSubject(110));

    expect(figure).toEqual({
      state: "observed",
      symbol: "NVDA",
      at: "2026-10-13T18:01:00.000Z",
      price: 110,
      changePercent: 10,
      changeBasis: "2026-10-10",
    });
  });

  it("OMITS changeBasis where LiveChange.basis is null — the one mapping", () => {
    // **The trap.** `LiveChange.basis` is `MarketDate | null` and
    // `changeBasis` is a bare `string | undefined`; `null` and *absent* mean
    // the same thing — the same-session case, measured from `previousClose`,
    // a number with no date beside it. An inverted mapping compiles and is
    // wrong on exactly the days the store's last session meets the live one.
    const figure = subjectFigure(sameSessionSubject(110));

    expect(figure).not.toHaveProperty("changeBasis");
    expect(figure).toMatchObject({ state: "observed", changePercent: 10 });
  });

  it("reads a stored close as a stored figure with that session's own move", () => {
    expect(subjectFigure(storedSubject(110, 100, "2026-10-12"))).toEqual({
      state: "stored",
      symbol: "NVDA",
      session: "2026-10-12",
      close: 110,
      sessionChangePercent: 10,
    });
  });

  it("is unknown with nothing observed and nothing stored", () => {
    expect(
      subjectFigure({
        security: equity("technology"),
        live: undefined,
        lastClose: undefined,
      }),
    ).toEqual({ state: "unknown", symbol: "NVDA" });
  });
});

describe("sharedBasis", () => {
  // The four outcomes, read through `basisOf` — the one reader of *what was
  // this figure measured from* — rather than against hand-written strings.

  it("is true for two observed figures measured from the same named close", () => {
    const left = basisOf(observed(MARKET, 1, "2026-10-10"));
    const right = basisOf(observed(BENCHMARK, 2, "2026-10-10"));

    expect(sharedBasis(left, right)).toBe(true);
  });

  it("is TRUE for two observed figures with NO changeBasis at all", () => {
    // **`changeBasis` absent is a VALUE, not a gap** — the same-session case,
    // measured from `previousClose`. So two figures that both omit it agree,
    // and this is the half a `?? "previous close"` default would spell as
    // disagreement.
    const left = basisOf(observed(MARKET, 1));
    const right = basisOf(subjectFigure(sameSessionSubject(110)));

    expect(left).toBe(right);
    expect(sharedBasis(left, right)).toBe(true);
  });

  it("is false for two observed figures measured from different closes", () => {
    const left = basisOf(observed(MARKET, 1, "2026-10-10"));
    const right = basisOf(observed(BENCHMARK, 2, "2026-10-09"));

    expect(sharedBasis(left, right)).toBe(false);
  });

  it("is true for two stored figures in one session and false across two", () => {
    const left = basisOf(storedFigure(MARKET, 1, "2026-10-13"));

    expect(
      sharedBasis(left, basisOf(storedFigure(BENCHMARK, 2, "2026-10-13"))),
    ).toBe(true);
    expect(
      sharedBasis(left, basisOf(storedFigure(BENCHMARK, 2, "2026-10-10"))),
    ).toBe(false);
  });

  it("is FALSE for one of each, even when the dates read the same", () => {
    // Same units, different claims: live-against-a-close moves while somebody
    // watches it, and close-against-previous-close is a session that is over.
    // The kind is in the identity precisely so this pair cannot agree.
    expect(
      sharedBasis(
        basisOf(observed(MARKET, 1, "2026-10-13")),
        basisOf(storedFigure(BENCHMARK, 2, "2026-10-13")),
      ),
    ).toBe(false);
  });

  it("is false when either side has no basis at all", () => {
    // A figure with no move is refused for a different reason, and `a === b`
    // over two `undefined`s would have read it as a comparable pair.
    expect(sharedBasis(undefined, undefined)).toBe(false);
    expect(sharedBasis("stored:2026-10-13", undefined)).toBe(false);
  });
});

describe("relativePerformance", () => {
  it("draws three moves and two excesses, in pts and in words", () => {
    const view = relativePerformance(
      liveSubject(104.2),
      frame(
        [observed(MARKET, 2, "2026-10-10")],
        [observed(BENCHMARK, 6, "2026-10-10")],
      ),
      undefined,
    );

    expect(view.entries.map((entry) => entry.move?.change)).toEqual([
      "+4.20%",
      "+6.00%",
      "+2.00%",
    ]);
    expect(lineFor(view.comparisons, "sector")?.excess).toMatchObject({
      kind: "excess",
      stated: "behind by 1.80 pts",
    });
    expect(lineFor(view.comparisons, "market")?.excess).toMatchObject({
      kind: "excess",
      stated: "ahead by 2.20 pts",
    });
  });

  it("says AHEAD while falling, and the unit is pts rather than %", () => {
    // A security down 4.2% against a sector down 6.0% is ahead. The word is
    // neutral for exactly this reason, and nothing about the line is tinted:
    // drawn green it would say the stock rose inside a box whose other three
    // figures are negative.
    const view = relativePerformance(
      liveSubject(95.8),
      frame(
        [observed(MARKET, -1, "2026-10-10")],
        [observed(BENCHMARK, -6, "2026-10-10")],
      ),
      undefined,
    );

    const sector = lineFor(view.comparisons, "sector")?.excess;

    expect(sector).toMatchObject({
      kind: "excess",
      stated: "ahead by 1.80 pts",
    });
    expect(JSON.stringify(sector)).not.toContain("%");
  });

  it("refuses the subtraction on one basis of each while all three still draw", () => {
    // Done-when 3. Each figure is true; only the derived line is refused.
    const view = relativePerformance(
      liveSubject(104.2),
      frame([storedFigure(MARKET, 2)], [storedFigure(BENCHMARK, 6)]),
      undefined,
    );

    expect(view.entries.every((entry) => entry.move !== undefined)).toBe(true);
    expect(view.nothing).toBe(false);
    for (const reference of ["sector", "market"] as const) {
      expect(lineFor(view.comparisons, reference)?.excess).toEqual({
        kind: "refused",
        because: "Measured from different closes",
      });
    }
  });

  it("refuses the two halves INDEPENDENTLY", () => {
    // Two separately labelled lines, never one prose sentence: the sector half
    // and the market half fail on their own and prose cannot be half-refused
    // without becoming ungrammatical.
    const view = relativePerformance(
      liveSubject(104.2),
      frame(
        [observed(MARKET, 2, "2026-10-10")],
        [observed(BENCHMARK, undefined, "2026-10-10")],
      ),
      undefined,
    );

    expect(lineFor(view.comparisons, "sector")?.excess).toEqual({
      kind: "refused",
      because: "No move for the reference yet",
    });
    expect(lineFor(view.comparisons, "market")?.excess).toMatchObject({
      kind: "excess",
    });
  });

  it("draws no mark for a silent reference, rather than a tick at zero", () => {
    const view = relativePerformance(
      liveSubject(104.2),
      frame([observed(MARKET, 2, "2026-10-10")]),
      undefined,
    );

    const sector = view.entries[1];

    expect(sector?.at).toBeUndefined();
    expect(sector?.absent).toBe("Not heard from");
  });

  it("prints a clipped figure exactly and draws no bracket", () => {
    // Done-when 4. A bracket between a clipped end and an unclipped tick is a
    // *wrong* length rather than a saturated one.
    const view = relativePerformance(
      // +62% against the widest rung, which is ±50.
      liveSubject(162),
      frame(
        [observed(MARKET, 2, "2026-10-10")],
        [observed(BENCHMARK, 3, "2026-10-10")],
      ),
      undefined,
    );

    expect(view.step).toBe(50);
    expect(view.entries[0]?.move?.change).toBe("+62.00%");
    expect(view.entries[0]?.clipped).toBe(true);
    expect(lineFor(view.comparisons, "market")?.excess).toEqual({
      kind: "excess",
      stated: "ahead by 60.00 pts",
      bracket: undefined,
    });
  });

  it("says the sector half does not apply on an index fund", () => {
    const view = relativePerformance(
      {
        security: indexFund(),
        live: bar(110),
        lastClose: closeOf(100, 90),
      },
      frame([observed(MARKET, 2, "2026-10-10")]),
      undefined,
    );

    expect(view.entries[1]?.held).toBe(true);
    expect(lineFor(view.comparisons, "sector")?.excess).toEqual({
      kind: "refused",
      because: "A broad-market fund has no sector",
    });
  });

  it("says a sector fund IS its sector's benchmark", () => {
    const view = relativePerformance(
      {
        security: sectorFund(),
        live: bar(110),
        lastClose: closeOf(100, 90),
      },
      frame([observed(MARKET, 2, "2026-10-10")]),
      undefined,
    );

    expect(lineFor(view.comparisons, "sector")?.excess).toEqual({
      kind: "refused",
      because: "This security is its sector’s benchmark",
    });
  });

  it("is `nothing` only before any frame, with nothing of our own to draw", () => {
    const view = relativePerformance(
      {
        security: equity("technology"),
        live: undefined,
        lastClose: undefined,
      },
      undefined,
      undefined,
    );

    expect(view.nothing).toBe(true);
    expect(view.step).toBe(RELATIVE_RUNGS[0]);
    expect(view.entries.every((entry) => entry.at === undefined)).toBe(true);
  });

  it("DRAWS rather than holds when the frame arrived with nothing in it", () => {
    // **CI's permanent state, and it must not read as the state before the
    // socket said anything** (Task 5.1.4, and Task 4.3.8's finding on `/`).
    // The store holds 516 securities and zero bars, so the aggregate arrives
    // carrying `unknown` for every one of them — which is a different fact
    // from *nothing has reached us yet*, and the only state of the two in
    // which the region has something honest to say.
    const arrived = relativePerformance(
      {
        security: equity("technology"),
        live: undefined,
        lastClose: undefined,
      },
      frame(
        [{ state: "unknown", symbol: MARKET }],
        [{ state: "unknown", symbol: BENCHMARK }],
      ),
      undefined,
    );

    const beforeAnything = relativePerformance(
      {
        security: equity("technology"),
        live: undefined,
        lastClose: undefined,
      },
      undefined,
      undefined,
    );

    // The two facts, told apart by the one thing a count of moves cannot
    // recover: whether a frame exists at all.
    expect(beforeAnything.nothing).toBe(true);
    expect(arrived.nothing).toBe(false);

    // And what the drawn one says instead of `No comparison yet.`: three named
    // rows, each stating its own absence, and two refusals saying why there is
    // no subtraction. Held behind one sentence, all of that is thrown away and
    // the reader is told the socket is quiet when it is not.
    expect(arrived.entries.map((entry) => entry.absent)).toEqual([
      "Not heard from",
      "Not heard from",
      "Not heard from",
    ]);
    expect(
      arrived.comparisons.every((line) => line.excess.kind === "refused"),
    ).toBe(true);
  });

  it("states the subject's own move with both references absent", () => {
    const view = relativePerformance(
      storedSubject(110, 100),
      undefined,
      undefined,
    );

    expect(view.entries[0]?.move?.change).toBe("+10.00%");
    expect(view.nothing).toBe(false);
    expect(lineFor(view.comparisons, "market")?.excess).toEqual({
      kind: "refused",
      because: "No move for the reference yet",
    });
  });

  it("refuses with no move for the subject and both references present", () => {
    const view = relativePerformance(
      // A stored close with nothing behind it: `changePercent` is `null`.
      storedSubject(110, 0),
      frame([storedFigure(MARKET, 2)], [storedFigure(BENCHMARK, 6)]),
      undefined,
    );

    expect(view.entries[0]?.move).toBeUndefined();
    expect(view.entries[0]?.absent).toBe("No close to measure from");
    expect(lineFor(view.comparisons, "sector")?.excess).toEqual({
      kind: "refused",
      because: "No move for this security yet",
    });
  });

  it("names the benchmark from SECTOR_ETFS rather than from the frame", () => {
    const view = relativePerformance(
      liveSubject(104.2),
      frame([], [observed(SECTOR_ETFS.health_care, 6, "2026-10-10")]),
      undefined,
    );

    // The subject is a `technology` equity, so the health-care figure on the
    // frame is not its benchmark and is not read.
    expect(view.entries[1]?.symbol).toBe(SECTOR_ETFS.technology);
    expect(view.entries[1]?.absent).toBe("Not heard from");
  });

  it("reuses SECTOR_CLAIM's invariant half in the footer", () => {
    expect(REFERENCE_CLAIM).toContain(
      "capitalisation-weighted, not the average of its members",
    );
    expect(REFERENCE_CLAIM).toContain("benchmark ETF");
  });
});

describe("fitRelativeRung", () => {
  it("picks the smallest rung containing all three figures", () => {
    expect(
      fitRelativeRung(
        liveSubject(103),
        frame([observed(MARKET, 0.4)], [observed(BENCHMARK, 1.2)]),
      ),
    ).toBe(5);
  });

  it("saturates at the widest rung rather than inventing a new one", () => {
    expect(fitRelativeRung(liveSubject(260), frame([]))).toBe(50);
  });

  it("sits at the narrowest rung when no figure has a move", () => {
    expect(
      fitRelativeRung(
        {
          security: equity("technology"),
          live: undefined,
          lastClose: undefined,
        },
        undefined,
      ),
    ).toBe(1);
  });

  it("is RAISED by the rung in force and never lowered", () => {
    // The ratchet's arithmetic. The cell that remembers is the caller's; what
    // is asserted here is that a held rung wins and a wider fit still steps
    // out.
    const quiet = liveSubject(100.5);

    expect(relativePerformance(quiet, frame([]), 25).step).toBe(25);
    expect(relativePerformance(liveSubject(130), frame([]), 2).step).toBe(50);
  });
});

describe("RESERVED_RELATIVE", () => {
  it("holds every band and draws nothing against any scale", () => {
    expect(RESERVED_RELATIVE.entries).toHaveLength(3);
    expect(RESERVED_RELATIVE.comparisons).toHaveLength(2);
    expect(RESERVED_RELATIVE.entries.every((entry) => entry.held)).toBe(true);
    expect(RESERVED_RELATIVE.nothing).toBe(true);
    expect(RESERVED_RELATIVE.step).toBe(1);
  });

  it("names no ticker at all, so no slug and no symbol can leak into a link", () => {
    // `RESERVED_SECTORS` learned this the expensive way: eleven sector slugs
    // sat in the symbol column of a `visibility: hidden` subtree and reached
    // eleven `href`s, which `aria-hidden` does nothing whatever to.
    expect(
      RESERVED_RELATIVE.entries.every((entry) => entry.symbol === undefined),
    ).toBe(true);
  });
});

describe("NO_COMPARISON", () => {
  it("is a sentence about a comparison rather than about a price or a feed", () => {
    expect(NO_COMPARISON).toBe("No comparison yet.");
    expect(NO_COMPARISON).not.toMatch(/live|stale|disconnect|feed/iu);
  });
});
