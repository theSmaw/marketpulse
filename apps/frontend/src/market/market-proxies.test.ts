import { describe, expect, it } from "vitest";

import type {
  Bar,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";

import { marketProxyStrip } from "./market-proxies.js";

// **`computedAt` is 14:01 EDT on Friday 2026-09-25, which is a session that is
// RUNNING**, and that is load-bearing for every assertion below that does not
// mention it: the absolute rule keys on this instant, so the default frame is
// deliberately one where the clause does not fire. The frames that produce it
// pass their own — see `frameAt`.
const frame = (figures: readonly WireOverviewFigure[]): WireMarketOverview =>
  frameAt("2026-09-25T18:01:00.000Z", figures);

const frameAt = (
  computedAt: string,
  figures: readonly WireOverviewFigure[],
): WireMarketOverview => ({ computedAt, feeds: [], figures });

const storedFigure = (
  symbol: string,
  session: string,
  close: number,
): WireOverviewFigure => ({ state: "stored", symbol, session, close });

// `exactOptionalPropertyTypes` is on, so the overrides are spelled with an
// explicit `| undefined` rather than as `Partial<…>`: "absent" and "present as
// `undefined`" are different types, and here the tests want the second — an
// omitted `changePercent` is the state the wire actually produces.
const observed = (
  symbol: string,
  overrides: {
    readonly at?: string;
    readonly price?: number;
    readonly changePercent?: number | undefined;
    readonly changeBasis?: string | undefined;
  } = {},
): WireOverviewFigure => {
  const changePercent =
    "changePercent" in overrides ? overrides.changePercent : 0.42;
  const changeBasis =
    "changeBasis" in overrides ? overrides.changeBasis : "2026-09-24";

  // Built in branches rather than with optional fields, which is what
  // `exactOptionalPropertyTypes` costs and is also what it buys: the absent
  // case here is genuinely a **missing key** on the wire, not a key holding
  // `undefined`, and the compiler holds the difference.
  return {
    state: "observed",
    symbol,
    at: overrides.at ?? "2026-09-25T18:01:00.000Z",
    price: overrides.price ?? 774.03,
    ...(changePercent === undefined ? {} : { changePercent }),
    ...(changeBasis === undefined ? {} : { changeBasis }),
  };
};

const bar = (close: number, volume = 100): Bar => ({
  startsAt: new Date("2026-09-25T18:01:00.000Z"),
  open: close,
  high: close,
  low: close,
  close,
  volume,
});

const NO_OBSERVATIONS = new Map<string, Bar>();
const NO_SNAPSHOT = new Set<string>();

describe("marketProxyStrip", () => {
  it("renders the frame's securities in the frame's own order", () => {
    const strip = marketProxyStrip(
      frame([
        observed("SPY"),
        observed("QQQ"),
        observed("DIA"),
        observed("IWM"),
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    // **Never sorted.** The order is the seam's answer and the browser renders
    // what it is given — a component that sorted would be a second opinion
    // about §6.
    expect(strip.cells.map((cell) => cell.symbol)).toEqual([
      "SPY",
      "QQQ",
      "DIA",
      "IWM",
    ]);
  });

  it("formats the change the wire carried and derives no percentage of its own", () => {
    const strip = marketProxyStrip(
      frame([observed("SPY", { changePercent: -0.18 })]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    const [cell] = strip.cells;
    expect(cell?.reading).toMatchObject({
      kind: "observed",
      price: "774.03",
      change: { change: "−0.18%", direction: "negative" },
    });
  });

  it("omits the change when the frame carried none", () => {
    // ADR 0029: a clause renders only when its own data is present. A price
    // with no basis is one fact missing from an entry that has the other, and
    // `0.00%` would be a claim nobody made.
    const strip = marketProxyStrip(
      frame([observed("SPY", { changePercent: undefined })]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.cells[0]?.reading).toMatchObject({
      kind: "observed",
      change: undefined,
    });
  });

  it("marks a proxy behind the newest observation with its instant, and no verdict", () => {
    const strip = marketProxyStrip(
      frame([
        observed("SPY"),
        observed("DIA", { at: "2026-09-25T16:07:00.000Z" }),
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.cells[0]?.reading).toMatchObject({ note: undefined });
    expect(strip.cells[1]?.reading).toMatchObject({ note: "from 12:07" });
  });

  it("states the closing session once for the strip, with the noun", () => {
    // **The defect this replaces was a missing NOUN, not a repeated date.**
    // Four cells each read a bare `2026-09-11` — no preposition, no noun —
    // and the shared line was suppressed in exactly this state, so the words
    // `close` and `closing` appeared NOWHERE in the strip. A listener got
    // `SPY. 764.29. 2026-09-11.`
    const strip = marketProxyStrip(
      frame([
        storedFigure("SPY", "2026-09-11", 764.29),
        storedFigure("QQQ", "2026-09-11", 714.88),
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toBe("2026-09-11 · closing prices");
    // Stated once rather than four times: the shared-claim-with-exceptions
    // idiom, and the cells are covered by it.
    expect(strip.cells.map((cell) => cell.reading)).toEqual([
      { kind: "stored", price: "764.29", note: undefined },
      { kind: "stored", price: "714.88", note: undefined },
    ]);
  });

  it("gives a stored close its own noun when the shared line does not cover it", () => {
    // Two sessions is no single claim, so the shared line says nothing about
    // the session and every cell says its own — with the noun, which is the
    // half that was missing. `2026-09-11` alone is a date a reader has to
    // interpret; `2026-09-11 close` is a figure that says what it is.
    const strip = marketProxyStrip(
      frame([
        storedFigure("SPY", "2026-09-11", 764.29),
        storedFigure("QQQ", "2026-09-10", 714.88),
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toBeUndefined();
    expect(strip.cells.map((cell) => cell.reading)).toEqual([
      { kind: "stored", price: "764.29", note: "2026-09-11 close" },
      { kind: "stored", price: "714.88", note: "2026-09-10 close" },
    ]);
  });

  it("lets an unknown figure abstain rather than break the shared claim", () => {
    // `None stored` has no session to contribute. It is not a disagreement.
    const strip = marketProxyStrip(
      frame([
        storedFigure("SPY", "2026-09-11", 764.29),
        { state: "unknown", symbol: "QQQ" },
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toBe("2026-09-11 · closing prices");
  });

  it("keeps a stored close's noun when an observed figure owns the shared line", () => {
    // A strip that has heard from one proxy is not a strip of closing prices,
    // so the shared line is the observation's and the stored cell is the
    // exception — which is the universe table's shipped idiom.
    const strip = marketProxyStrip(
      frame([observed("SPY"), storedFigure("QQQ", "2026-09-11", 714.88)]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toBe(
      "Sep 25 · 14:01 EDT · change from 2026-09-24's close",
    );
    expect(strip.cells[1]?.reading).toEqual({
      kind: "stored",
      price: "714.88",
      note: "2026-09-11 close",
    });
  });

  it("reports nothing stored when every figure is unknown — CI's state", () => {
    const strip = marketProxyStrip(
      frame([
        { state: "unknown", symbol: "SPY" },
        { state: "unknown", symbol: "QQQ" },
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.nothingStored).toBe(true);
    expect(strip.qualifier).toBeUndefined();
    expect(strip.cells[0]?.reading).toEqual({ kind: "unknown" });
  });

  it("does not call a strip of stored closes `nothing stored`", () => {
    const strip = marketProxyStrip(
      frame([storedFigure("SPY", "2026-09-11", 764.29)]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.nothingStored).toBe(false);
  });

  it("builds the shared line from the newest observation, with its basis", () => {
    const strip = marketProxyStrip(
      frame([
        observed("DIA", { at: "2026-09-25T16:07:00.000Z" }),
        observed("SPY", { changeBasis: "2026-09-24" }),
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toBe(
      "Sep 25 · 14:01 EDT · change from 2026-09-24's close",
    );
  });

  it("says 'the previous close' when the basis has no session name", () => {
    // `LiveChange.basis`'s own absence: the same-session case measures from
    // `previousClose`, a number with no date beside it.
    const strip = marketProxyStrip(
      frame([observed("SPY", { changeBasis: undefined })]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toBe(
      "Sep 25 · 14:01 EDT · change from the previous close",
    );
  });

  it("drops the basis clause when the observed figures disagree about it", () => {
    // `changeBasis` is PER SECURITY, and a gapped store gives two proxies
    // previous closes in different sessions ordinarily enough that
    // `pnpm bars:check` exists for it. One line under all four saying
    // `change from 2026-09-24's close` would be true of one and invented for
    // the rest — and `note` cannot rescue it, because `note` carries an
    // instant and only for a proxy that is BEHIND.
    const strip = marketProxyStrip(
      frame([
        observed("SPY", { changeBasis: "2026-09-24" }),
        observed("QQQ", { changeBasis: "2026-09-18" }),
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toBe("Sep 25 · 14:01 EDT");
  });

  it("treats a named session and an unnamed previous close as a disagreement", () => {
    // `undefined` is a VALUE here — `LiveChange.basis`'s same-session case —
    // rather than a gap to be defaulted away.
    const strip = marketProxyStrip(
      frame([
        observed("SPY", { changeBasis: "2026-09-24" }),
        observed("QQQ", { changeBasis: undefined }),
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toBe("Sep 25 · 14:01 EDT");
  });

  it("keeps the clause when a proxy with no measurable change disagrees about nothing", () => {
    // Only figures carrying a `changePercent` assert a basis. A price with no
    // measurable change has an opinion about nothing and must not suppress a
    // clause that is true of the ones that do.
    const strip = marketProxyStrip(
      frame([
        observed("SPY", { changeBasis: "2026-09-24" }),
        observed("QQQ", { changePercent: undefined, changeBasis: undefined }),
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toBe(
      "Sep 25 · 14:01 EDT · change from 2026-09-24's close",
    );
  });

  it("reports an overview about nothing as no cells and no shared claim", () => {
    // `figures: []` used to fall through to the ordinary path, where the grid
    // rendered at height 0 and the region said nothing at all.
    const strip = marketProxyStrip(frame([]), NO_OBSERVATIONS, NO_SNAPSHOT);

    expect(strip.cells).toHaveLength(0);
    expect(strip.qualifier).toBeUndefined();
    // Not `nothingStored`: that sentence is a claim about the store, and an
    // overview about no securities says nothing about the store.
    expect(strip.nothingStored).toBe(false);
  });

  it("marks a price from outside the regular session with the shipped word", () => {
    const strip = marketProxyStrip(
      frame([observed("SPY", { at: "2026-09-25T11:42:00.000Z" })]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toBe(
      "Sep 25 · 07:42 EDT · pre-market · change from 2026-09-24's close",
    );
  });

  it("skips an instant it cannot read rather than printing Invalid Date", () => {
    // `Date.parse` returns NaN, `new Date(NaN)` formats without complaining,
    // and those two words reach a qualifier. `live-feed.ts` owns the same rule
    // one layer up.
    const strip = marketProxyStrip(
      frame([observed("SPY", { at: "not an instant" })]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toBeUndefined();
    expect(strip.cells[0]?.reading).toMatchObject({ note: undefined });
  });

  // ## The absolute rule (Task 4.2.6)
  //
  // The universe table dates a row only when it is BEHIND the page's newest
  // observation, which fails closed when the whole map is uniformly old — every
  // evening, every weekend, every morning before the bell. The strip gets the
  // rule the table is deliberately not given, keyed on ADR 0028's calendar
  // rather than on any elapsed time.

  it("names the session a figure belongs to once its bell has rung", () => {
    // 2026-09-26 is a Saturday. The figures are Friday's 15:59 bars, which is
    // exactly what `currentMarketState` holds all weekend because it is not
    // cleared on a session boundary.
    const strip = marketProxyStrip(
      frameAt("2026-09-26T14:00:00.000Z", [
        observed("SPY", { at: "2026-09-25T19:59:00.000Z" }),
        observed("QQQ", { at: "2026-09-25T19:59:00.000Z" }),
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toBe(
      "Sep 25 · 15:59 EDT · last prices of the session · " +
        "change from 2026-09-24's close",
    );
  });

  it("names it before the bell on a trading day too", () => {
    // 08:00 EDT on Monday 2026-09-28. `before_open` is the status the relative
    // rule can never see and the one a reader meets every weekday morning.
    const strip = marketProxyStrip(
      frameAt("2026-09-28T12:00:00.000Z", [
        observed("SPY", { at: "2026-09-25T19:59:00.000Z" }),
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toContain("last prices of the session");
  });

  it("says nothing extra while the session the figure belongs to is running", () => {
    const strip = marketProxyStrip(
      frameAt("2026-09-25T18:01:00.000Z", [
        observed("SPY", { at: "2026-09-25T18:01:00.000Z" }),
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toBe(
      "Sep 25 · 14:01 EDT · change from 2026-09-24's close",
    );
  });

  it("names the session even while the market is open, when the figure is from an older one", () => {
    // The rule is absolute rather than relative to the market being shut: a
    // proxy that has not traded today, in a map that is never cleared, is a
    // yesterday figure under a running session.
    const strip = marketProxyStrip(
      frameAt("2026-09-25T18:01:00.000Z", [
        observed("SPY", { at: "2026-09-24T19:59:00.000Z" }),
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toBe(
      "Sep 24 · 15:59 EDT · last prices of the session · " +
        "change from 2026-09-24's close",
    );
  });

  it("dates a proxy behind the shared line, in the product's own spelling", () => {
    // `from 12:07` under a line reading `Sep 25 · 14:01 EDT` says *two hours
    // behind* when the truth is *a day and two hours behind*. Still an age and
    // never a verdict — the instant joins, no threshold appears.
    //
    // **The whole instant goes through `formatBarInstant`**, which is how
    // every other dated instant in this product is spelled and is what carries
    // the zone. A hand-built `from 2026-09-24 12:07` was a third spelling with
    // no zone in it, a few pixels under a line spelling the same kind of fact
    // as `Sep 25 · 14:01 EDT`.
    const strip = marketProxyStrip(
      frame([
        observed("SPY"),
        observed("DIA", { at: "2026-09-24T16:07:00.000Z" }),
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.cells[1]?.reading).toMatchObject({
      note: "from Sep 24 · 12:07 EDT",
    });
  });

  it("borrows the shared line's date when the cell is in the same session", () => {
    const strip = marketProxyStrip(
      frame([
        observed("SPY"),
        observed("DIA", { at: "2026-09-25T16:07:00.000Z" }),
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.cells[1]?.reading).toMatchObject({ note: "from 12:07" });
  });

  it("says nothing about the session ending while the price is an extended-hours one", () => {
    // **The correction.** `marketSessionStateAt` answers `before_open` at
    // 07:42, so the clause used to fire — and `pre-market` says the session has
    // NOT STARTED three words before `last prices of the session` said it had
    // ended. Worse than odd: that figure is TODAY's pre-market print, and the
    // clause invites a reader to take it for the previous session's close.
    //
    // The backend stores and streams extended-hours bars, so this was the
    // deployed landing page 04:00–09:30 and 16:00–20:00 ET every weekday.
    const preMarket = marketProxyStrip(
      frameAt("2026-09-28T11:42:00.000Z", [
        observed("SPY", { at: "2026-09-28T11:42:00.000Z" }),
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(preMarket.qualifier).toBe(
      "Sep 28 · 07:42 EDT · pre-market · change from 2026-09-24's close",
    );

    const afterHours = marketProxyStrip(
      frameAt("2026-09-25T20:12:00.000Z", [
        observed("SPY", { at: "2026-09-25T20:12:00.000Z" }),
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(afterHours.qualifier).toBe(
      "Sep 25 · 16:12 EDT · after-hours · change from 2026-09-24's close",
    );
  });

  it("stays silent rather than false about a Friday after-hours print read on the Saturday", () => {
    // The recorded residue of the rule above: the figure is dated and correct
    // and one clause shorter than it could be. A sentence that is silent beats
    // one that is false.
    const strip = marketProxyStrip(
      frameAt("2026-09-26T14:00:00.000Z", [
        observed("SPY", { at: "2026-09-25T20:12:00.000Z" }),
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toBe(
      "Sep 25 · 16:12 EDT · after-hours · change from 2026-09-24's close",
    );
  });

  it("makes no staleness claim it cannot establish, from EITHER instant", () => {
    // Three refusals, one answer: an unreadable `computedAt`, and either
    // instant outside the trading calendar's covered range. An unsupported
    // input is a reason to say less, never a licence to assert something this
    // function could not establish — and propagating `MarketCalendarRangeError`
    // out of a render is a blank page: nothing above `App` catches one, so
    // `main` and all seven regions go with it.
    //
    // **`at` is the case that arrives and the one the guard used to miss.**
    // `extendedHoursAt(at)` was called unguarded two lines before the guarded
    // call was reached, and this test varied only `computedAt` — so it passed
    // over the hazard while the identical class of input threw out of render.
    const outOfRange = "2030-01-05T14:00:00.000Z";

    const byComputedAt = () =>
      marketProxyStrip(
        frameAt("not an instant", [
          observed("SPY", { at: "2026-09-25T19:59:00.000Z" }),
        ]),
        NO_OBSERVATIONS,
        NO_SNAPSHOT,
      );

    const byFarComputedAt = () =>
      marketProxyStrip(
        frameAt(outOfRange, [
          observed("SPY", { at: "2026-09-25T19:59:00.000Z" }),
        ]),
        NO_OBSERVATIONS,
        NO_SNAPSHOT,
      );

    const byObservationInstant = () =>
      marketProxyStrip(
        frame([observed("SPY", { at: outOfRange })]),
        NO_OBSERVATIONS,
        NO_SNAPSHOT,
      );

    for (const read of [byComputedAt, byFarComputedAt, byObservationInstant]) {
      expect(read).not.toThrow();
      expect(read().qualifier).not.toContain("last prices");
    }
  });

  it("keys the mark on the socket's observation, and not on the aggregate", () => {
    const strip = marketProxyStrip(
      frame([observed("SPY"), observed("QQQ")]),
      new Map([
        ["SPY", bar(774.03)],
        ["QQQ", bar(601.88)],
      ]),
      new Set(["QQQ"]),
    );

    // A snapshot is not an arrival — which is what stops four marks firing on
    // first paint, announcing as news the thing the reader has just asked to
    // see.
    expect(strip.cells[0]?.arrival).toBeDefined();
    expect(strip.cells[1]?.arrival).toBeUndefined();
  });

  it("gives a corrected bar a different key, so the decay restarts", () => {
    const before = marketProxyStrip(
      frame([observed("SPY")]),
      new Map([["SPY", bar(774.03)]]),
      NO_SNAPSHOT,
    );
    const after = marketProxyStrip(
      frame([observed("SPY")]),
      new Map([["SPY", bar(774.09)]]),
      NO_SNAPSHOT,
    );

    expect(after.cells[0]?.arrival).not.toBe(before.cells[0]?.arrival);
  });
});
