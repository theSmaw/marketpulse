import { toMarketDate, toTicker } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { BREADTH_WINDOW_MINUTES, marketBreadth } from "./market-breadth.js";
import { buildMarketOverview } from "./market-overview.js";

import type {
  Bar,
  BarSource,
  SecurityLastClose,
  Ticker,
} from "@marketpulse/shared";
import type { CurrentObservation } from "./current-market-state.js";
import type { MarketOverviewEntry } from "./market-overview.js";

// **No clock, no socket, no database — and that is the assertion rather than
// the setup.** `market-overview.ts`' note applies unchanged one module over:
// every input is an argument, so this count cannot read anything timestamped
// after a replay clock, because it reads nothing at all.

const source: BarSource = {
  provider: "alpaca",
  feed: "iex",
  retrievedAt: "2026-09-16T18:03:00.000Z",
  barCount: 1,
};

/** 14:03 ET on a Wednesday — inside the regular session. */
const ASOF = new Date("2026-09-16T18:03:30.000Z");

const minutesBefore = (minutes: number): Date =>
  new Date(ASOF.getTime() - minutes * 60_000);

const bar = (close: number, startsAt: Date): Bar => ({
  startsAt,
  open: close,
  high: close,
  low: close,
  close,
  volume: 100,
});

/**
 * A live entry, written directly rather than through the join.
 *
 * The join has its own tests; what these need is control over the two things
 * the count reads — the bar's **own instant** and the measured percentage.
 */
const live = (
  symbol: string,
  over: {
    readonly percent: number | null;
    readonly minutesAgo?: number;
  },
): MarketOverviewEntry => ({
  state: "live",
  symbol: toTicker(symbol),
  bar: bar(100, minutesBefore(over.minutesAgo ?? 1)),
  source,
  change: {
    percent: over.percent,
    basis: over.percent === null ? null : toMarketDate("2026-09-15"),
  },
});

const closeOf = (
  symbol: string,
  over: {
    readonly close: number;
    readonly previousClose: number | null;
    readonly session?: string;
  },
): SecurityLastClose => ({
  symbol: toTicker(symbol),
  session: toMarketDate(over.session ?? "2026-09-16"),
  close: over.close,
  previousClose: over.previousClose,
});

const stored = (
  symbol: string,
  over: Parameters<typeof closeOf>[1],
): MarketOverviewEntry => ({
  state: "stored",
  symbol: toTicker(symbol),
  close: closeOf(symbol, over),
});

const OPEN = { asOf: ASOF, marketOpen: true } as const;
const SHUT = { asOf: ASOF, marketOpen: false } as const;

describe("the observed count, while the regular session is open", () => {
  it("counts the three buckets and states the window it used", () => {
    const breadth = marketBreadth(
      [
        live("AAPL", { percent: 1.2 }),
        live("MSFT", { percent: 0.4 }),
        live("KO", { percent: -0.9 }),
        live("PG", { percent: 0 }),
      ],
      OPEN,
    );

    expect(breadth).toEqual({
      basis: "observed",
      advancing: 2,
      declining: 1,
      unchanged: 1,
      measured: 4,
      tracked: 4,
      windowMinutes: BREADTH_WINDOW_MINUTES,
    });
  });

  it("excludes a stale observation from the count AND from the denominator", () => {
    // **Done-when 4, and the failure it rules out is the one this story
    // exists to prevent.** If the counts folded over the whole map while the
    // denominator was windowed — or the reverse — the stated denominator and
    // the counted numerator would disagree invisibly, with every number
    // well-formed, and the surplus would land in `unchanged`: *unchanged*
    // collapsed into *not heard from*.
    const breadth = marketBreadth(
      [
        live("AAPL", { percent: 1.2, minutesAgo: 1 }),
        live("MSFT", { percent: 1.4, minutesAgo: 90 }),
        live("KO", { percent: -0.9, minutesAgo: 6 }),
      ],
      OPEN,
    );

    expect(breadth).toMatchObject({
      advancing: 1,
      declining: 0,
      unchanged: 0,
      measured: 1,
    });
  });

  it("measures the window on the bar's OWN instant, never on an age computed at the read", () => {
    // **The clock, proved through the join rather than asserted about it.**
    // `CurrentObservation.ageMs` is computed on read with its own wall clock,
    // and a count keyed on it would be wrong under a replay and would shift
    // every figure in Task 4.1.6's table by a minute — that curve reads 0 at
    // one minute in all 390 samples precisely because a bar arrives after the
    // minute it describes has ended.
    //
    // So: an observation whose `ageMs` says one second and whose bar is from
    // ninety minutes ago. A count reading `ageMs` says *one advancer*; a count
    // reading `startsAt` says *we have not heard from anybody*.
    const AAPL = toTicker("AAPL");
    const observation: CurrentObservation = {
      symbol: AAPL,
      bar: bar(120, minutesBefore(90)),
      source,
      ageMs: 1_000,
    };

    const entries = buildMarketOverview({
      symbols: [AAPL],
      observations: new Map<Ticker, CurrentObservation>([[AAPL, observation]]),
      closesAsOf: () =>
        new Map([[AAPL, closeOf("AAPL", { close: 100, previousClose: 99 })]]),
      asOf: ASOF,
    });

    expect(entries[0]?.state).toBe("live");
    expect(marketBreadth(entries, OPEN)).toMatchObject({
      advancing: 0,
      measured: 0,
    });
  });

  it("classifies on the DISPLAYED figure, so a move that prints 0.00% is unchanged", () => {
    // `directionOf`'s rounding, which this module must not re-implement: a
    // +0.004% move is positive by sign and renders as `0.00%`. A breadth
    // figure saying *2 advancing* beside two rows reading `0.00%` is the same
    // three-channel contradiction `PriceChange` is built to prevent, stated
    // as a total.
    expect(
      marketBreadth(
        [live("AAPL", { percent: 0.004 }), live("MSFT", { percent: -0.001 })],
        OPEN,
      ),
    ).toMatchObject({ advancing: 0, declining: 0, unchanged: 2, measured: 2 });
  });

  it("leaves a figure with no direction out of every bucket and outside the denominator", () => {
    // A non-finite percentage has no direction, and `directionOf` answers
    // `undefined` rather than `"unchanged"` for exactly this reason: a naive
    // count over 518 non-finite figures would report *518 unchanged, 0
    // advancing* — a confident, well-formed claim that the market did not
    // move. **The honest answer is that it is in no bucket at all.**
    const breadth = marketBreadth(
      [
        live("AAPL", { percent: Number.NaN }),
        live("MSFT", { percent: Number.POSITIVE_INFINITY }),
        live("KO", { percent: 0.5 }),
      ],
      OPEN,
    );

    expect(breadth).toMatchObject({
      advancing: 1,
      declining: 0,
      unchanged: 0,
      measured: 1,
    });
  });

  it("leaves a true price with no basis outside the denominator", () => {
    // Heard from and measurable are different sets, and the count is over the
    // second. A live price with no stored close is a true price with no
    // figure — §36's partial answer — and counting it as unchanged would be a
    // claim the store cannot support.
    expect(
      marketBreadth(
        [live("AAPL", { percent: null }), live("MSFT", { percent: 0.5 })],
        OPEN,
      ),
    ).toMatchObject({ measured: 1 });
  });

  it("counts a stored figure NOT AT ALL while the session is open", () => {
    // A security nobody has heard from is `503 − measured`, it is never a
    // bucket, and it is never labelled. A stored close is a fact about last
    // night, not about the last five minutes.
    expect(
      marketBreadth([stored("AAPL", { close: 100, previousClose: 99 })], OPEN),
    ).toMatchObject({ basis: "observed", measured: 0 });
  });

  it("answers `measured: 0` for an empty universe rather than refusing to answer", () => {
    // CI's store — 518 securities, zero bars — and every process for its
    // first minutes. *We counted and heard nothing* is a true answer, and it
    // is spelled differently from *this gateway does not send breadth*, which
    // is the section's absence.
    expect(marketBreadth([], OPEN)).toEqual({
      basis: "observed",
      advancing: 0,
      declining: 0,
      unchanged: 0,
      measured: 0,
      tracked: 0,
      windowMinutes: BREADTH_WINDOW_MINUTES,
    });
  });
});

describe("the session count, which is the state the market is in ~80% of the week", () => {
  it("counts the last session's close-to-close move and names the session", () => {
    const breadth = marketBreadth(
      [
        stored("AAPL", { close: 101, previousClose: 100 }),
        stored("MSFT", { close: 99, previousClose: 100 }),
        stored("KO", { close: 100, previousClose: 100 }),
      ],
      SHUT,
    );

    expect(breadth).toEqual({
      basis: "session",
      advancing: 1,
      declining: 1,
      unchanged: 1,
      measured: 3,
      tracked: 3,
      session: "2026-09-16",
    });
  });

  it("reads the close on a LIVE entry too, which is why that member carries one", () => {
    // **The defect this rules out is well-formed, small and silent.** The
    // market is shut for roughly 80% of the week and for most of those hours
    // this process is still holding the session's observations — so a count
    // over the `stored` entries alone would be a count over whatever happened
    // to go quiet. Here one of the three has an observation; all three are
    // counted.
    const AAPL = toTicker("AAPL");
    const entries = buildMarketOverview({
      symbols: [AAPL, toTicker("MSFT"), toTicker("KO")],
      observations: new Map<Ticker, CurrentObservation>([
        [
          AAPL,
          {
            symbol: AAPL,
            bar: bar(120, minutesBefore(1)),
            source,
            ageMs: 1_000,
          },
        ],
      ]),
      closesAsOf: () =>
        new Map([
          [AAPL, closeOf("AAPL", { close: 101, previousClose: 100 })],
          [
            toTicker("MSFT"),
            closeOf("MSFT", { close: 99, previousClose: 100 }),
          ],
          [toTicker("KO"), closeOf("KO", { close: 100, previousClose: 100 })],
        ]),
      asOf: ASOF,
    });

    expect(entries.map((entry) => entry.state)).toEqual([
      "live",
      "stored",
      "stored",
    ]);
    expect(marketBreadth(entries, SHUT)).toMatchObject({
      advancing: 1,
      declining: 1,
      unchanged: 1,
      measured: 3,
    });
  });

  it("counts ONE session, leaving a security a session behind out of both halves", () => {
    // The backfill can miss a security, and a count mixing one name's Friday
    // move with another's Thursday is a figure about neither session. The
    // session reported is the latest any of them has a close for, and the same
    // filter decides the numerator and the denominator.
    const breadth = marketBreadth(
      [
        stored("AAPL", { close: 101, previousClose: 100 }),
        stored("MSFT", {
          close: 90,
          previousClose: 100,
          session: "2026-09-15",
        }),
      ],
      SHUT,
    );

    expect(breadth).toEqual({
      basis: "session",
      advancing: 1,
      declining: 0,
      unchanged: 0,
      measured: 1,
      // **The set is the array it was handed, not the count it made of it.**
      // The security a session behind is outside `measured` and inside
      // `tracked`, which is the remainder the region draws below its rule —
      // and the honest reading of a backfill that missed one.
      tracked: 2,
      session: "2026-09-16",
    });
  });

  it("leaves a session with nothing behind it out of every bucket", () => {
    // `changePercent` answers `null` for a security we hold one daily bar for
    // — nothing to measure against — and for a zero basis, where the division
    // is `Infinity` and formats as `"+Infinity%"`.
    expect(
      marketBreadth(
        [
          stored("AAPL", { close: 101, previousClose: null }),
          stored("MSFT", { close: 101, previousClose: 0 }),
          stored("KO", { close: 101, previousClose: 100 }),
        ],
        SHUT,
      ),
    ).toMatchObject({ measured: 1 });
  });

  it("names the session it asked about when it holds no close at all", () => {
    // CI's store again, on the other basis. `measured: 0` beside the date is
    // what says we do not hold it; the date says which question was asked.
    expect(marketBreadth([], SHUT)).toEqual({
      basis: "session",
      advancing: 0,
      declining: 0,
      unchanged: 0,
      measured: 0,
      tracked: 0,
      session: "2026-09-16",
    });
  });
});

describe("`tracked` is the set it was handed, on both bases", () => {
  // **The one figure in the section that is not a count of anything measured.**
  // The browser draws `tracked − measured` below a rule and its heading names
  // the set, so this has to be the length of the array — a `503` typed in
  // either process is a lie with no symptom the day a security is delisted, and
  // the one call site is held to the equities by
  // `breadth-is-counted-over-the-equities-alone`.
  //
  // The interesting half is that it may legitimately **exceed** `measured` by a
  // lot: the window excludes a security nobody has heard from, and the session
  // basis excludes one the backfill missed. That difference is the remainder,
  // and it is a product state rather than a fault.
  it("counts the entries rather than the buckets, while the session is open", () => {
    const entries = [
      live("AAPL", { percent: 1.2 }),
      live("MSFT", { percent: 1.4, minutesAgo: 90 }),
      live("KO", { percent: null }),
    ];

    expect(marketBreadth(entries, OPEN)).toMatchObject({
      measured: 1,
      tracked: 3,
    });
  });

  it("counts the entries rather than the buckets, with the market shut", () => {
    expect(
      marketBreadth(
        [
          stored("AAPL", { close: 101, previousClose: 100 }),
          stored("MSFT", { close: 90, previousClose: null }),
        ],
        SHUT,
      ),
    ).toMatchObject({ measured: 1, tracked: 2 });
  });
});

describe("the denominator is the sum, by construction", () => {
  /**
   * **Done-when 3.** The three counts and `measured` come out of one pass
   * over one filtered set — three accumulators and their sum — so there is no
   * second measurement for the first to disagree with. A re-implementation
   * that counts the buckets in one pass and the denominator in another passes
   * every test above and fails this one the moment the two passes see
   * different sets.
   */
  const identity = (breadth: {
    readonly advancing: number;
    readonly declining: number;
    readonly unchanged: number;
    readonly measured: number;
  }): void => {
    expect(breadth.advancing + breadth.declining + breadth.unchanged).toBe(
      breadth.measured,
    );
  };

  const MIXED: readonly MarketOverviewEntry[] = [
    live("AAPL", { percent: 1.2 }),
    live("MSFT", { percent: -0.4 }),
    live("KO", { percent: 0 }),
    live("PG", { percent: null }),
    live("XOM", { percent: Number.NaN }),
    live("JNJ", { percent: 2.1, minutesAgo: 45 }),
    stored("ERIE", { close: 101, previousClose: 100 }),
    stored("MMM", { close: 90, previousClose: null }),
    stored("WMT", { close: 90, previousClose: 100, session: "2026-09-14" }),
    { state: "unknown", symbol: toTicker("NVDA") },
  ];

  it("holds on both bases, over a set containing every refusal", () => {
    identity(marketBreadth(MIXED, OPEN));
    identity(marketBreadth(MIXED, SHUT));
  });

  it("and the counts over that set are the ones the two bases should give", () => {
    // Stated rather than only asserted as an identity, so a pass that counted
    // nothing would not satisfy the test above vacuously.
    expect(marketBreadth(MIXED, OPEN)).toMatchObject({
      advancing: 1,
      declining: 1,
      unchanged: 1,
      measured: 3,
    });

    // On the session basis: `ERIE` is up on 2026-09-16, `MMM` has nothing
    // behind it, `WMT` is a session behind, and the six live entries carry no
    // close at all because none was given to them.
    expect(marketBreadth(MIXED, SHUT)).toMatchObject({
      advancing: 1,
      declining: 0,
      unchanged: 0,
      measured: 1,
      session: "2026-09-16",
    });
  });
});
