import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  Bar,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";

import { MarketProxyStrip } from "./MarketProxyStrip.js";
import { SAY_NOTHING_ARRIVED_AFTER_MS } from "./use-waited.js";

// What a test here can and cannot see is worth stating, because the component's
// whole subject is a layout.
//
// **No stylesheet is applied in this environment**, so jsdom computes no boxes,
// resolves no grid tracks and renders a broken column count identically to a
// correct one. Every claim about the tracks, the reserved slots and the strip's
// height is `pnpm probe`'s and `pnpm e2e`'s, and none of it is asserted below.
//
// What is left here is the **text a reader is handed** and the structure behind
// the mark — which is the half that decides whether a figure is dated, whether
// a claim is made about data that is not there, and whether a disc fires.

const frame = (figures: readonly WireOverviewFigure[]): WireMarketOverview => ({
  computedAt: "2026-09-25T18:01:00.000Z",
  feeds: [],
  figures,
});

const observed = (symbol: string, price: number): WireOverviewFigure => ({
  state: "observed",
  symbol,
  at: "2026-09-25T18:01:00.000Z",
  price,
  changePercent: 0.42,
  changeBasis: "2026-09-24",
});

const NO_OBSERVATIONS = new Map<string, Bar>();
const NO_SNAPSHOT = new Set<string>();

const strip = (
  overview: WireMarketOverview | undefined,
  observations = NO_OBSERVATIONS,
  fromSnapshot = NO_SNAPSHOT,
) =>
  render(
    <MarketProxyStrip
      overview={overview}
      observations={observations}
      fromSnapshot={fromSnapshot}
    />,
  );

describe("MarketProxyStrip", () => {
  it("draws every proxy the frame carried, with its figure", () => {
    strip(frame([observed("SPY", 774.03), observed("QQQ", 601.88)]));

    expect(screen.getByText("SPY")).toBeTruthy();
    expect(screen.getByText("774.03")).toBeTruthy();
    expect(screen.getByText("QQQ")).toBeTruthy();
    expect(screen.getByText("601.88")).toBeTruthy();
  });

  it("names no feed, no venue and no connection word in any state", () => {
    // AC 5, and Story 3.10's one-home rule. The connection has exactly one home
    // and it is the status bar; this region may state an instant, an age and a
    // change basis, all three true of either tape.
    const states: (WireMarketOverview | undefined)[] = [
      frame([observed("SPY", 774.03)]),
      frame([
        {
          state: "stored",
          symbol: "SPY",
          session: "2026-09-11",
          close: 764.29,
        },
      ]),
      frame([{ state: "unknown", symbol: "SPY" }]),
      undefined,
    ];

    for (const overview of states) {
      const { container, unmount } = strip(overview);
      const text = container.textContent;

      for (const word of [
        "LIVE",
        "STALE",
        "DISCONNECTED",
        "REPLAYING",
        "IEX",
        "All US exchanges",
        "Market feed",
      ]) {
        expect(text).not.toContain(word);
      }

      unmount();
    }
  });

  it("dates a stored close rather than showing it as current", () => {
    strip(
      frame([
        {
          state: "stored",
          symbol: "SPY",
          session: "2026-09-11",
          close: 764.29,
        },
      ]),
    );

    expect(screen.getByText("764.29")).toBeTruthy();
    expect(screen.getByText("2026-09-11")).toBeTruthy();
  });

  it("says 'None stored' rather than a zero when nothing is held", () => {
    strip(frame([{ state: "unknown", symbol: "SPY" }]));

    expect(screen.getByText("None stored")).toBeTruthy();
    // Not a figure, and not a change either: a clause renders only when its own
    // data is present.
    expect(screen.queryByText("0.00%")).toBeNull();
  });

  it("changes the shared line's shape when nothing is stored for any of them", () => {
    strip(
      frame([
        { state: "unknown", symbol: "SPY" },
        { state: "unknown", symbol: "QQQ" },
      ]),
    );

    // Distinct from both of the security page's empty answers — four named
    // securities have no window to change, so the sentence must not suggest one.
    const sentence = screen.getByText("No prices stored for these four yet.");
    expect(sentence.textContent).not.toContain("window");
  });

  it("draws no mark when the observation came from a snapshot", () => {
    const bar: Bar = {
      startsAt: new Date("2026-09-25T18:01:00.000Z"),
      open: 774,
      high: 774,
      low: 774,
      close: 774.03,
      volume: 100,
    };

    const { container } = strip(
      frame([observed("SPY", 774.03)]),
      new Map([["SPY", bar]]),
      new Set(["SPY"]),
    );

    expect(container.querySelector("[data-arrival]")).toBeNull();
  });

  it("draws exactly one mark, for the proxy whose bar arrived", () => {
    const bar = (close: number): Bar => ({
      startsAt: new Date("2026-09-25T18:01:00.000Z"),
      open: close,
      high: close,
      low: close,
      close,
      volume: 100,
    });

    const { container } = strip(
      frame([observed("SPY", 774.03), observed("QQQ", 601.88)]),
      new Map([["SPY", bar(774.03)]]),
      NO_SNAPSHOT,
    );

    const marks = container.querySelectorAll("[data-arrival]");
    expect(marks).toHaveLength(1);
    // `aria-hidden`, because the information is the figure — which is already
    // on screen and already spoken. The mark only says *look*.
    expect(marks[0]?.getAttribute("aria-hidden")).toBe("true");
  });

  it("holds the box open before the first frame, and claims nothing in it", () => {
    const { container } = strip(undefined);

    // The symbols are not known yet: the set is served rather than hard-coded.
    expect(screen.queryByText("SPY")).toBeNull();
    // And nothing in it is offered to a reader as a value. The reserved rows
    // hold non-breaking spaces, which is what keeps the box its own height —
    // so the text is whitespace rather than absent.
    expect(container.textContent.trim()).toBe("");
  });

  it("reserves every row with a NON-BREAKING space, which is the mechanism", () => {
    // A plain space in a `<p>` collapses to nothing and the whole reservation
    // scheme would then rest on however a browser resolves an empty line box.
    // The stylesheet's comments name this character; this asserts it is there.
    const { container } = strip(undefined);

    expect(container.textContent).toContain("\u00a0");
    expect(container.textContent).not.toMatch(/ /u);
  });

  it("says one sentence when an overview arrives about nothing", () => {
    // `figures: []` used to render a grid of height 0 under a heading, with the
    // region saying nothing at all — `docs/GAPS.md` entry 13.
    strip({
      computedAt: "2026-09-25T18:01:00.000Z",
      feeds: [],
      figures: [],
    });

    expect(screen.getByText("No prices yet.")).toBeTruthy();
    // Not the store's sentence: nothing here is a claim about the store.
    expect(
      screen.queryByText("No prices stored for these four yet."),
    ).toBeNull();
  });

  describe("when no frame ever arrives", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("stays silent for the wait a real first frame takes", () => {
      strip(undefined);

      act(() => {
        vi.advanceTimersByTime(SAY_NOTHING_ARRIVED_AFTER_MS - 1);
      });

      // Measured 2026-09-26: 174–277 ms from navigation to a figure on screen,
      // five runs against a local pair. The ordinary case never gets here.
      expect(screen.queryByText("No prices yet.")).toBeNull();
    });

    it("gives the terminal state a floor rather than a permanent empty box", () => {
      strip(undefined);

      act(() => {
        vi.advanceTimersByTime(SAY_NOTHING_ARRIVED_AFTER_MS);
      });

      const sentence = screen.getByText("No prices yet.");
      // It names no feed, no venue and no connection word — whether the socket
      // is up has one home and it is the status bar.
      for (const word of ["LIVE", "DISCONNECTED", "feed", "socket", "IEX"]) {
        expect(sentence.textContent).not.toContain(word);
      }
    });
  });
});
