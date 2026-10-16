import { describe, expect, it } from "vitest";

import { UNUSUAL_ROWS } from "@marketpulse/shared";
import type {
  Bar,
  WireMarketOverview,
  WireUnusualActivity,
  WireUnusualRow,
} from "@marketpulse/shared";

import {
  RESERVED_UNUSUAL,
  unusualActivity,
  unusualSymbols,
  withHeldUnusualRows,
} from "./unusual-activity.js";

// **The read side of `Unusual activity`** (Task 5.4.3).
//
// What this level can see: which fields a row carries, which it refuses, the
// padding, and which of the two honest-nothing nouns a frame earns. What it
// **cannot** see is anything about the row's geometry — jsdom applies no
// stylesheet and computes no layout — so the 308 px arithmetic, the four
// restated track lists and the region's one-height claim are `pnpm probe`'s
// and the browser suite's.

const row = (
  symbol: string,
  rank: number,
  percent: number,
  aboveSample = false,
): WireUnusualRow => ({
  symbol,
  rank,
  aboveSample,
  sampleCount: 4620,
  percent,
  from: { at: "2026-10-15T17:55:00.000Z", price: 100, feed: "iex" },
  to: { at: "2026-10-15T18:00:00.000Z", price: 100 + percent, feed: "iex" },
  observed: 5,
});

const section = (
  rows: readonly WireUnusualRow[],
  generation?: { session: string; lookbackSessions: number },
): WireUnusualActivity => ({
  rows,
  tracked: 501,
  eligible: 466,
  scored: Math.max(rows.length, 455),
  windowMinutes: 5,
  spanMinutes: 5,
  baseline: {
    feed: "sip",
    spanMinutes: 5,
    minimumSampleCount: 2500,
    ...(generation === undefined ? {} : { generation }),
  },
  refusals: {
    figure: { "nothing-observed": 35, "no-earlier-endpoint": 0, "no-basis": 0 },
    comparison: { "too-few-samples": 11, "split-discontinuity": 0 },
  },
});

const frame = (
  unusual: WireUnusualActivity | undefined,
  basis: "observed" | "session" | "none" = "observed",
): WireMarketOverview => ({
  computedAt: "2026-10-15T18:00:00.000Z",
  feeds: ["iex"],
  figures: [],
  ...(unusual === undefined ? {} : { unusual }),
  ...(basis === "none"
    ? {}
    : {
        breadth:
          basis === "session"
            ? {
                basis: "session",
                advancing: 284,
                declining: 152,
                unchanged: 15,
                measured: 451,
                tracked: 501,
                session: "2026-10-15",
              }
            : {
                basis: "observed",
                advancing: 284,
                declining: 152,
                unchanged: 15,
                measured: 451,
                tracked: 501,
                windowMinutes: 5,
              },
      }),
});

const NAMES = new Map([
  ["NVDA", "NVIDIA Corporation"],
  ["AVGO", "Broadcom Inc."],
]);

const read = (
  overview: WireMarketOverview | undefined,
  observations: ReadonlyMap<string, Bar> = new Map(),
  fromSnapshot: ReadonlySet<string> = new Set(),
  names: ReadonlyMap<string, string> = NAMES,
) => unusualActivity(overview, observations, fromSnapshot, names);

describe("unusualActivity — the rows the region draws", () => {
  it("reads the frame's rows in the order the frame sent them", () => {
    // **The rank is a COUNT, never a comparison.** The producer's
    // `selectByPercentile` is the one order and the decoder has already
    // refused a frame whose order disagrees with it, so a comparison here
    // would be the second comparator `one-comparator-for-the-order-of-a-
    // percentile` refuses by name.
    const view = read(
      frame(section([row("AVGO", 99, -4.1), row("NVDA", 97, 2)])),
    );

    expect(view?.rows.map((drawn) => [drawn.symbol, drawn.rank])).toEqual([
      ["AVGO", 1],
      ["NVDA", 2],
    ]);
  });

  it("draws the ordinal short and hands a listener the whole phrase", () => {
    const view = read(frame(section([row("NVDA", 99, 3.2, true)])));

    expect(view?.rows[0]?.reading).toEqual({
      drawn: ">99th",
      spoken: ">99th percentile",
      direction: "positive",
    });
  });

  it("carries the DIRECTION separately, because the ordinal ranks a magnitude", () => {
    // Without it a −9% crash and a +9% spike draw the identical row — same
    // ordinal, same rank — on the region a reader scans to decide where to
    // look. `return-percentile.ts` ranks `Math.abs(percent)`.
    const view = read(
      frame(section([row("AVGO", 99, -9.1), row("NVDA", 99, 9.1)])),
    );

    expect(view?.rows.map((drawn) => drawn.reading?.drawn)).toEqual([
      "99th",
      "99th",
    ]);
    expect(view?.rows.map((drawn) => drawn.reading?.direction)).toEqual([
      "negative",
      "positive",
    ]);
  });

  it("has no `move` on a row, so nothing here is drawn as a price change", () => {
    // The tint is the difference. A `move` is drawn by `PriceChange` and
    // tinted; a percentile has no direction of its own to encode, so a tinted
    // ordinal would be decoration standing where meaning normally is.
    const view = read(frame(section([row("NVDA", 99, 3.2)])));

    expect(view?.rows[0]?.move).toBeUndefined();
    expect(view?.rows[0]?.absent).toBeUndefined();
    expect(view?.rows[0]?.price).toBeUndefined();
  });

  it("gives a name the universe has not answered for BLANK ROOM, never its ticker", () => {
    // Task 4.7.5's repair, inherited: the ticker is already in the track to
    // the left, and at 390 there is nothing between the two to tell them
    // apart. `GET /securities` takes 174–277 ms against a frame at 124, so
    // the ordinary cold load paints at least one frame with an empty map.
    const view = read(
      frame(section([row("CTSH", 99, 3.2)])),
      undefined,
      undefined,
      NAMES,
    );

    expect(view?.rows[0]?.label).toBe(" ");
    expect(view?.rows[0]?.label).not.toBe("CTSH");
  });

  it("keys the FLIP's basis on the stored generation, so a new one is a new list", () => {
    // A row travels only if it had a previous position under the same basis.
    // The nightly job writes one generation per session (ADR 0044), so the
    // morning after it lands every ordinal is measured against a different
    // distribution — a new list rather than five simultaneous re-orders.
    const before = read(
      frame(
        section([row("NVDA", 99, 3.2)], {
          session: "2026-10-14",
          lookbackSessions: 60,
        }),
      ),
    );
    const after = read(
      frame(
        section([row("NVDA", 99, 3.2)], {
          session: "2026-10-15",
          lookbackSessions: 60,
        }),
      ),
    );

    expect(before?.rows[0]?.basis).toBe("percentile:2026-10-14");
    expect(after?.rows[0]?.basis).not.toBe(before?.rows[0]?.basis);
  });

  it("has a basis every row shares even where no generation was read", () => {
    // A cold replica, a security with no stored `sip` history, and **every
    // gated run**. The empty string stands for *the generation this gateway
    // did not name* rather than for a gap, which is `basisOf`'s own treatment
    // of an unnamed close one module over.
    const view = read(frame(section([row("NVDA", 99, 3.2)])));

    expect(view?.rows[0]?.basis).toBe("percentile:");
  });

  it("is ABSENT when the frame carries no section, which is two states the route tells apart", () => {
    // First paint, and a rollback pinning a previous image. `undefined` is
    // the absence; the route decides which sentence it draws.
    expect(read(undefined)).toBeUndefined();
    expect(read(frame(undefined))).toBeUndefined();
  });
});

describe("the two honest-nothing nouns, because the two repairs differ", () => {
  it("says nothing at all while something was ranked", () => {
    expect(
      read(frame(section([row("NVDA", 99, 3.2)])))?.nothing,
    ).toBeUndefined();
  });

  it("says the ranking is empty when the market is open", () => {
    expect(read(frame(section([])))?.nothing).toBe("Nothing ranked yet.");
  });

  it("says the market is shut when the shared pass answered on the session basis", () => {
    // `market-unusual.ts` refuses the session basis outright — a pass that
    // ignored it would rank yesterday's 15:55→16:00 pair, for ever, as
    // unusual activity right now — so `eligible: 0` out of hours is literally
    // true. That is about 80% of the week, and *wait until 09:30* is not a
    // repair the other sentence invites.
    expect(read(frame(section([]), "session"))?.nothing).toBe(
      "Nothing ranked while the market is shut.",
    );
  });

  it("falls back to the open-market noun when the frame says nothing about the session", () => {
    // A rollback whose breadth section is unreadable tells us nothing about
    // the clock, and *nothing ranked yet* is true either way where *while the
    // market is shut* would be a claim nobody read a clock for. This module
    // reads no clock at all.
    expect(read(frame(section([]), "none"))?.nothing).toBe(
      "Nothing ranked yet.",
    );
  });

  it("says NOTHING in the reservation, because a hidden string is still in `textContent`", () => {
    expect(RESERVED_UNUSUAL.nothing).toBeUndefined();
    expect(RESERVED_UNUSUAL.rows).toEqual([]);
  });
});

describe("withHeldUnusualRows — room, and nothing a reader could open", () => {
  it("pads a short list to the bound and leaves a full one alone", () => {
    const rows = read(frame(section([row("NVDA", 99, 3.2)])))?.rows ?? [];

    expect(withHeldUnusualRows(rows)).toHaveLength(UNUSUAL_ROWS);
    expect(
      withHeldUnusualRows(new Array(UNUSUAL_ROWS).fill(rows[0])),
    ).toHaveLength(UNUSUAL_ROWS);
  });

  it("names nothing, and every pad is marked `held`", () => {
    // `visibility: hidden` plus `aria-hidden` do nothing whatever to an
    // `href`, and `RankedList` leaked eleven invisible `/securities/<slug>`
    // anchors for ten days when a call site passed `held={undefined}` as a
    // hard-coded constant. `held` is what the row reads to draw no anchor.
    const pads = withHeldUnusualRows([]);

    expect(pads).toHaveLength(UNUSUAL_ROWS);
    for (const pad of pads) {
      expect(pad.held).toBe(true);
      expect(pad.symbol.trim()).toBe("");
      expect(pad.reading).toBeUndefined();
    }
  });

  it("gives each pad a distinct key, so a pad stays in its slot as the real rows change", () => {
    const keys = withHeldUnusualRows([]).map((pad) => pad.symbol);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every pad a rank, because a keyless row is dropped outright", () => {
    // `RankedList` drops an unranked row when the quiet group is
    // `impossible`, and the pads are in the array the FLIP is handed — a row
    // drawn in the list and missing from that array makes every `to` position
    // read off the wrong row.
    for (const pad of withHeldUnusualRows([])) {
      expect(pad.rank).toBeGreaterThan(0);
    }
  });
});

describe("unusualSymbols — the subscription's share", () => {
  it("names every symbol the frame ranked", () => {
    expect(
      unusualSymbols(frame(section([row("AVGO", 99, -4), row("NVDA", 97, 2)]))),
    ).toEqual(["AVGO", "NVDA"]);
  });

  it("is taken from the FRAME, so a held pad's spaces can never reach a subscription", () => {
    expect(unusualSymbols(frame(section([])))).toEqual([]);
    expect(unusualSymbols(frame(undefined))).toEqual([]);
    expect(unusualSymbols(undefined)).toEqual([]);
  });
});
