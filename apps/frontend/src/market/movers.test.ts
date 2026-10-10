import { describe, expect, it } from "vitest";

import { MOVERS_PER_SIDE } from "@marketpulse/shared";
import type {
  Bar,
  WireMarketMovers,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";

import { marketBreadth } from "./market-breadth.js";
import {
  RESERVED_MOVERS,
  marketMovers,
  moverSymbols,
  withHeldRows,
} from "./movers.js";

// The reader over the frame's movers section (Task 4.5.5). `withHeldRows` and
// the reservation are Task 4.5.3's and are covered by `Movers.test.tsx`
// through the component; what is new here is the read.

const NO_OBSERVATIONS = new Map<string, Bar>();
const NO_SNAPSHOT = new Set<string>();
const NAMES = new Map([
  ["NVDA", "NVIDIA Corporation"],
  ["MRNA", "Moderna, Inc."],
]);

const observed = (
  symbol: string,
  price: number,
  changePercent?: number,
): WireOverviewFigure => ({
  state: "observed",
  symbol,
  at: "2026-10-07T18:01:00.000Z",
  price,
  ...(changePercent === undefined ? {} : { changePercent }),
});

const stored = (
  symbol: string,
  close: number,
  sessionChangePercent?: number,
): WireOverviewFigure => ({
  state: "stored",
  symbol,
  session: "2026-10-07",
  close,
  ...(sessionChangePercent === undefined ? {} : { sessionChangePercent }),
});

const section = (
  gainers: readonly WireOverviewFigure[],
  losers: readonly WireOverviewFigure[],
): WireMarketMovers => ({
  basis: "observed",
  gainers,
  losers,
  eligible: 466,
  tracked: 503,
  windowMinutes: 5,
});

const frame = (movers: WireMarketMovers | undefined): WireMarketOverview => ({
  computedAt: "2026-10-07T18:01:00.000Z",
  feeds: [],
  figures: [],
  ...(movers === undefined ? {} : { movers }),
});

const read = (
  overview: WireMarketOverview | undefined,
  names: ReadonlyMap<string, string> = NAMES,
  observations: ReadonlyMap<string, Bar> = NO_OBSERVATIONS,
  fromSnapshot: ReadonlySet<string> = NO_SNAPSHOT,
) => marketMovers(overview, observations, fromSnapshot, names);

/** Two rows a side, so a sentence about *both lists* has both to be about. */
const GAINERS = [observed("NVDA", 189.42, 3.41), observed("AMD", 211.6, 2.2)];
const LOSERS = [stored("MRNA", 24.5, -8.37), stored("ALB", 117.52, -5.94)];

describe("marketMovers", () => {
  it("reads the price from the member the figure's own state names", () => {
    // **The same trap `sectorPerformance` exists to close, one field over.**
    // An observed figure's price is `price` and a stored one's is `close`;
    // they are not the same field and a renderer reaching for the wrong one
    // finds nothing. Out of hours **every** mover row is the stored member, so
    // this is the common path rather than the edge case.
    const view = read(
      frame(
        section(
          [observed("NVDA", 189.42, 3.41)],
          [stored("MRNA", 24.5, -8.37)],
        ),
      ),
    );

    expect(view?.gainers[0]?.price).toBe("189.42");
    expect(view?.losers[0]?.price).toBe("24.50");
  });

  it("gives a figure with neither a price nor a close no price at all", () => {
    // `?? 0` on a price column is a plausible figure for a security we know
    // nothing about — ADR 0029's false impression with two decimal places. An
    // `unknown` figure cannot be ranked and so cannot reach a list from our own
    // producer; what this asserts is which way the read fails if one does.
    const view = read(
      frame(section([{ state: "unknown", symbol: "NVDA" }], [])),
    );

    expect(view?.gainers[0]?.price).toBeUndefined();
  });

  it("ranks each list from 1 — the two are peers, not one list split", () => {
    const view = read(
      frame(
        section(
          [observed("NVDA", 1, 3.41), observed("AMD", 1, 2.2)],
          [stored("MRNA", 1, -8.37), stored("ALB", 1, -5.94)],
        ),
      ),
    );

    expect(view?.gainers.map((row) => row.rank)).toEqual([1, 2]);
    expect(view?.losers.map((row) => row.rank)).toEqual([1, 2]);
  });

  it("takes the order the producer sent and never re-orders it", () => {
    // `selectMovers` is the one comparator and it has already run. A sort here
    // would be a second order, and two orders that agree today are two orders
    // that disagree at a tie — which is exactly where `compareByMove`'s
    // stability lives.
    const view = read(
      frame(section([observed("A", 1, 1), observed("B", 1, 9)], [])),
    );

    expect(view?.gainers.map((row) => row.symbol)).toEqual(["A", "B"]);
  });

  it("labels a row with its company name, and with its ticker when the universe has not arrived", () => {
    const section_ = section([observed("NVDA", 1, 3.41)], []);

    expect(read(frame(section_))?.gainers[0]?.label).toBe("NVIDIA Corporation");
    expect(read(frame(section_), new Map())?.gainers[0]?.label).toBe("NVDA");
  });

  it("gives a row no rank when its figure carries no ranking key", () => {
    // A producer defect rather than a state to draw: `RankedList` drops an
    // unranked row outright when the quiet group is impossible, and the one
    // thing this must not do is hand it an ordinal.
    const view = read(frame(section([observed("NVDA", 1)], [])));

    expect(view?.gainers[0]?.rank).toBeUndefined();
    expect(view?.gainers[0]?.move).toBeUndefined();
  });

  it("marks an arrival from the observations map and not from a snapshot", () => {
    const bar: Bar = {
      startsAt: new Date("2026-10-07T18:01:00.000Z"),
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 1,
    };
    const observations = new Map([
      ["NVDA", bar],
      ["MRNA", bar],
    ]);

    const view = read(
      frame(section([observed("NVDA", 1, 3.41)], [stored("MRNA", 1, -8.37)])),
      NAMES,
      observations,
      new Set(["MRNA"]),
    );

    expect(view?.gainers[0]?.arrival).toBeDefined();
    expect(view?.losers[0]?.arrival).toBeUndefined();
  });

  it("is undefined when the frame carries no movers section, and when there is no frame", () => {
    // The two states the route tells apart by the **frame**: a rollback pinning
    // a previous image that sends no section, and the first paint.
    expect(read(frame(undefined))).toBeUndefined();
    expect(read(undefined)).toBeUndefined();
  });

  it("is two EMPTY lists when the section carries none — not the absence", () => {
    // **The difference from `sectorPerformance`, which treats an empty section
    // as the absence.** Eleven benchmarks are a roster; a movers list's
    // membership is an answer, and *nothing was rankable* is CI's permanent
    // state and most of a weekend. Collapsing it to `undefined` would make the
    // region reserve itself invisibly for ever rather than say so.
    const view = read(frame(section([], [])));

    expect(view?.gainers).toEqual([]);
    expect(view?.losers).toEqual([]);
    expect(withHeldRows(view?.gainers ?? [])).toHaveLength(MOVERS_PER_SIDE);

    // **And it is NOT `RESERVED_MOVERS`**, which this assertion read as until
    // Task 4.5.6 gave the region words. The two differ in exactly what makes
    // the state coherent rather than blank: the reservation holds room and
    // claims nothing, while a frame that arrived and had nothing rankable
    // carries a denominator and two sentences. They were the same value only
    // for as long as the region was silent.
    expect(view).not.toEqual(RESERVED_MOVERS);
    expect(view?.claim.drawn).not.toBe(RESERVED_MOVERS.claim.drawn);
  });

  // ## The footer clause — Task 4.5.6
  //
  // The ranking's honesty: a top five over 446 of 503 looks exactly as
  // confident as one over all of them. Every figure in the sentence is read off
  // the **movers** section, never breadth's, which
  // `the-ranking-states-its-own-denominator` holds — the two are the same
  // numbers by construction, so the substitution is invisible in every state
  // except the one `WireMoverLists.eligible` exists for.

  it("states the denominator in the live grammar, with the window read off the frame", () => {
    expect(read(frame(section(GAINERS, LOSERS)))?.claim.spoken).toBe(
      "Of the 503 companies we track, 466 were heard from in the last 5 minutes. Both lists are ranked over those.",
    );

    // The window is the producer's figure and never a `5` typed here: a
    // rollback can put a gateway and a bundle two values apart.
    expect(
      read(
        frame({
          ...section(GAINERS, LOSERS),
          basis: "observed",
          windowMinutes: 1,
        }),
      )?.claim.spoken,
    ).toContain("in the last 1 minute.");
  });

  it("states it in the session grammar about a closed market, and neither grammar can render the other's", () => {
    // *Heard from in the last five minutes* is false about a closed market,
    // which is breadth's own recorded reason for having two grammars. Keyed on
    // the basis the wire sent rather than on a clock this module reads, so
    // `windowMinutes` does not exist on the session member and `session` does
    // not exist on the observed one — a compile error rather than a wrong
    // sentence.
    const clause = read(
      frame({
        gainers: GAINERS,
        losers: LOSERS,
        eligible: 501,
        tracked: 503,
        basis: "session",
        session: "2026-10-06",
      }),
    )?.claim.spoken;

    expect(clause).toBe(
      "Of the 503 companies we track, 501 had a close-to-close move on 2026-10-06. Both lists are ranked over those.",
    );
    expect(clause).not.toContain("heard from");
  });

  it("is honest at zero, which is the state a gated machine and a weekend both reach", () => {
    // CI holds 518 securities and zero bars, so the region is two headings, ten
    // held rows and this sentence, for ever. A clause that only rendered when
    // something was ranked would leave 466 px of labelled, empty box silent —
    // `docs/GAPS.md` entry 13 exactly.
    const view = read(frame({ ...section([], []), eligible: 0 }));

    expect(view?.claim.spoken).toBe(
      "Of the 503 companies we track, none were heard from in the last 5 minutes. There is nothing to rank.",
    );

    // And the per-list sentences are suppressed there, which is
    // `BreadthClaim`'s rule at N = 0: the footer carries the whole truth and
    // three sentences saying it is the same fact three times in one box.
    expect(view?.gainersEmpty).toBeUndefined();
    expect(view?.losersEmpty).toBeUndefined();
  });

  it("carries no feed word, no venue and no instant", () => {
    // `live`, `stale` and `disconnected` have one home and it is the status
    // bar; `computedAt` is the source note's, once for the screen.
    const clause = read(frame(section(GAINERS, LOSERS)))?.claim.spoken ?? "";

    for (const word of ["live", "stale", "disconnected", "IEX", "2026-10-07T"])
      expect(clause.toLowerCase()).not.toContain(word.toLowerCase());
  });

  it("builds the drawn and the spoken renderings from one value", () => {
    // Identical today, deliberately: the region draws no ladder and prints no
    // denominator, so the drawn half has nothing to defer to. A pair anyway, so
    // the two cannot diverge the day one of them has somewhere to defer to.
    const claim = read(frame(section(GAINERS, LOSERS)))?.claim;

    expect(claim?.drawn).toBe(claim?.spoken);
  });

  it("says what an empty side is, claiming the set we measured rather than the market", () => {
    // The one-sided market, which is the state nothing in this product had ever
    // drawn: each list holds only the rows whose direction matches it, so on a
    // strong trend day one list is full and the other is empty.
    const view = read(frame(section(GAINERS, [])));

    expect(view?.losersEmpty).toBe("None of the names we measured declined.");
    expect(view?.gainersEmpty).toBeUndefined();

    // `Nothing declined.` would be a statement about 503 companies, 37 of which
    // nobody heard from — the `No shares changed hands anywhere in the window.`
    // lesson, which is the only shipped sentence that ever over-claimed.
    expect(view?.losersEmpty).toContain("we measured");

    expect(read(frame(section([], LOSERS)))?.gainersEmpty).toBe(
      "None of the names we measured rose.",
    );
  });
});

describe("moverSymbols", () => {
  it("names every symbol both lists carry, from the frame rather than the drawn rows", () => {
    // The page's subscription is built from this: a section that draws an
    // arrival mark owes the symbol key a line, and a key taken from the drawn
    // rows would carry the held pads' non-breaking spaces into a `subscribe`.
    const symbols = moverSymbols(
      frame(section([observed("NVDA", 1, 3)], [stored("MRNA", 1, -3)])),
    );

    expect(symbols).toEqual(["NVDA", "MRNA"]);
    expect(moverSymbols(frame(undefined))).toEqual([]);
    expect(moverSymbols(undefined)).toEqual([]);
  });
});

describe("the two lists are disjoint, which is the hold's precondition", () => {
  // **Task 4.5.7's AC 2, at the READER.** `Movers` pins one concatenated array
  // across both lists — gainers at `0..N-1`, losers at `N..2N-1` — and
  // `rowsInPinnedOrder` keys that pin on a `Map` of symbol → position. A symbol
  // in **both** lists collides in that `Map`, last-write-wins, and the gainers
  // row silently takes the losers row's position: a re-order nobody asked for,
  // with every figure on screen still correct.
  //
  // It is asserted rather than assumed at both ends. The producer's end is
  // `readMovers`' check 3 and `market-stream-protocol.test.ts`' *refuses the
  // same symbol in both lists*. **This is the other end**: that a frame
  // carrying the violation never reaches `marketMovers` at all, which is the
  // only thing that makes the precondition a property of this module rather
  // than of a function in another package.

  it("cannot be handed an overlapping section, because the decoder refuses the frame", async () => {
    const { decodeMarketStreamMessage, encodeMarketStreamMessage } =
      await import("@marketpulse/shared");

    // One symbol at both ends — the state `selectMovers` cannot produce, since
    // it decides each candidate's end through the one classifier.
    const overlapping = section(
      [observed("NVDA", 100, 2.4), observed("MRNA", 50, 1.1)],
      [observed("NVDA", 100, -2.4)],
    );

    const message = decodeMarketStreamMessage(
      encodeMarketStreamMessage({
        type: "overview",
        version: 1,
        sentAt: "2026-10-07T18:01:00.000Z",
        overview: frame(overlapping),
      }),
    );

    // The frame survives — it may carry true proxy prices — and the **section**
    // is gone, which is the absence the region already draws.
    const decoded =
      message.kind === "message" && message.message.type === "overview"
        ? message.message.overview
        : undefined;

    expect(message.kind).toBe("message");
    expect(decoded).toBeDefined();
    expect(decoded?.movers).toBeUndefined();

    // And so `marketMovers` returns the absence rather than two lists the pin
    // could collide over.
    expect(
      marketMovers(decoded, NO_OBSERVATIONS, NO_SNAPSHOT, NAMES),
    ).toBeUndefined();
  });

  it("gives every reachable view two lists with no symbol in common", () => {
    // The positive half, over the states this reader can actually produce. A
    // test that only asserted the refusal would pass against a reader that
    // produced one empty list for ever.
    const view = marketMovers(
      frame(
        section(
          [observed("NVDA", 100, 2.4), observed("MRNA", 50, 1.1)],
          [stored("AAPL", 180, -1.2), stored("MSFT", 400, -3.1)],
        ),
      ),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
      NAMES,
    );

    const gainers = new Set((view?.gainers ?? []).map((row) => row.symbol));
    const losers = (view?.losers ?? []).map((row) => row.symbol);

    expect(gainers.size).toBe(2);
    expect(losers).toHaveLength(2);
    expect(losers.some((symbol) => gainers.has(symbol))).toBe(false);

    // And the concatenation the route pins is therefore a `Map` with one entry
    // per row — the arithmetic that makes gainers `0..N-1` and losers `N..2N-1`.
    const pin = [...(view?.gainers ?? []), ...(view?.losers ?? [])].map(
      (row) => row.symbol,
    );
    expect(new Set(pin).size).toBe(pin.length);
  });
});

describe("the age beside the denominator (Task 4.7.4)", () => {
  const read = (overview: WireMarketOverview) =>
    marketMovers(overview, NO_OBSERVATIONS, NO_SNAPSHOT, NAMES);

  it("states how far the observations reach, at the minute's END", () => {
    // `18:01Z` is 14:01 ET and is the **start** of the minute the bar
    // describes, so the reach is 14:02 — the same correction `feedStatusFrom`
    // makes, one surface over, and the thing a raw read gets wrong by exactly
    // one minute in the direction that under-states.
    const view = read({
      ...frame(section([observed("NVDA", 184.12, 4.21)], [])),
      observedAt: "2026-10-07T18:01:00.000Z",
    });

    expect(view?.claim.drawn).toBe(
      "Of the 503 companies we track, 466 were heard from in the last 5 minutes. " +
        "Both lists are ranked over those. " +
        "Nothing newer than Oct 7 · 14:02 EDT has reached us.",
    );
    // The two renderings are one string in this region — it draws no ladder,
    // so the drawn half has nothing to defer to.
    expect(view?.claim.spoken).toBe(view?.claim.drawn);
  });

  it("is the same sentence `Market breadth` states, from the one builder", () => {
    // The whole point of `measured-set.ts`: two regions 200–300 px apart say
    // this about one aggregate, and a second copy is what would let them
    // disagree. Asserted by equality of the two renderings' last sentence
    // rather than by importing the builder, which would make them agree by
    // construction.
    const last = (claim: string | undefined): string =>
      (claim ?? "").split(". ").slice(-1).join("");

    const observedAt = "2026-10-07T18:01:00.000Z";
    const movers = read({
      ...frame(section([observed("NVDA", 184.12, 4.21)], [])),
      observedAt,
    });
    const breadth = marketBreadth({
      computedAt: "2026-10-07T18:01:00.000Z",
      feeds: [],
      figures: [],
      observedAt,
      breadth: {
        basis: "observed",
        advancing: 284,
        declining: 152,
        unchanged: 15,
        measured: 451,
        tracked: 503,
        windowMinutes: 5,
      },
    });

    expect(last(movers?.claim.drawn)).toBe(
      "Nothing newer than Oct 7 · 14:02 EDT has reached us.",
    );
    expect(last(breadth?.claim.drawn)).toBe(last(movers?.claim.drawn));
  });

  it("says NOTHING when the aggregate holds no observation, which is CI's own state", () => {
    // 518 securities and zero bars: `observedAt` is **absent**, the clause is
    // absent with it, and the sentence is byte-identical to the one this
    // region shipped before the clause existed — no empty sentence, no
    // trailing space.
    expect(read(frame({ ...section([], []), eligible: 0 }))?.claim.drawn).toBe(
      "Of the 503 companies we track, none were heard from in the last 5 minutes. There is nothing to rank.",
    );
  });

  it("skips an instant it cannot read rather than drawing `Invalid Date`", () => {
    expect(
      read({
        ...frame(section([observed("NVDA", 184.12, 4.21)], [])),
        observedAt: "not an instant",
      })?.claim.drawn,
    ).toBe(
      "Of the 503 companies we track, 466 were heard from in the last 5 minutes. Both lists are ranked over those.",
    );
  });
});
