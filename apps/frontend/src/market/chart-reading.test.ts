import type { Bar } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import {
  barChangePercent,
  clearedAnnouncement,
  formatBarInstant,
  readingAnnouncement,
} from "./chart-reading.js";

// What one bar says (Task 2.12.6).
//
// The bars here are **written** rather than recorded, which is the opposite of
// `chart-geometry.test.ts`'s rule and is right for the same reason it is wrong
// there: what is under test is a sentence about four numbers and an instant, and
// the cases that matter — a zero open, a fall, a move that rounds to nothing —
// either do not exist in the store or cannot be found in it on purpose. A
// recorded body proves the *shape* of a bar is right, and `Bar` is a typed
// interface this file is checked against.

function bar(
  open: number,
  close: number,
  at = "2026-09-04T15:52:00.000Z",
): Bar {
  return {
    startsAt: new Date(at),
    open,
    high: Math.max(open, close) + 0.1,
    low: Math.min(open, close) - 0.1,
    close,
    volume: 1_000,
  };
}

describe("a bar's own change", () => {
  it("is measured open to close, not against anything else on the screen", () => {
    // The whole hazard this figure introduces: the headline says what the
    // *window* did and the wash says where the price is against the window's
    // open. This says neither.
    expect(barChangePercent(bar(100, 101))).toBeCloseTo(1);
    expect(barChangePercent(bar(100, 99))).toBeCloseTo(-1);
    expect(barChangePercent(bar(100, 100))).toBe(0);
  });

  it("declines a zero open rather than dividing by it", () => {
    // Not a price any equity has, so a corrupt bar. `series-facts.ts` and the
    // chart's reference rule decline the same case, and the three staying one
    // statement is what stops the headline, the plot and this readout
    // disagreeing about a bar nobody can read.
    expect(barChangePercent(bar(0, 12))).toBeNull();
  });
});

describe("the instant", () => {
  it("carries the date, the time and the zone", () => {
    // All three, because the axis is ordinal: it draws no gap between Friday's
    // last minute and Monday's first, so a bare time does not say which
    // session — and that is exactly the fact the axis took away.
    expect(formatBarInstant(new Date("2026-09-04T15:52:00.000Z"))).toBe(
      "Sep 4 · 11:52 EDT",
    );
  });

  it("is market time and not the reader's", () => {
    // 20:00Z is 16:00 in New York, which is the close. A conversion that
    // skipped the market-time module would print an hour nobody trades in.
    expect(formatBarInstant(new Date("2026-09-04T20:00:00.000Z"))).toContain(
      "16:00",
    );
  });
});

describe("what a listener is told", () => {
  it("names the subject first and says the direction in a word", () => {
    const sentence = readingAnnouncement("NVDA", bar(178.44, 178.86));

    // The subject leads, because this is one of four polite regions on the
    // Security Explorer and a listener is handed them in an order no component
    // controls (`FRONTEND-STATE.md` §7).
    expect(sentence?.startsWith("NVDA price chart:")).toBe(true);

    // **"up", not "+".** `formatChangePercent` spells a fall with a Unicode
    // minus, which is right on screen and read aloud inconsistently — from
    // "minus" to nothing at all. `PriceChange` solves the same problem for the
    // visible figure with a hidden word; this is that repair one layer down.
    expect(sentence).toContain("up 0.24% on the bar");
    expect(sentence).not.toContain("+");
  });

  it("says 'on the bar', which is the clause that keeps it apart from the panel's", () => {
    // The panel's own region announces what the **window** did in words that
    // are otherwise these. Without this clause a listener hearing two sentences
    // one after the other has no way to tell which subject either is about.
    expect(readingAnnouncement("AMD", bar(10, 9))).toContain(
      "down 10.00% on the bar",
    );
  });

  it("states all four prices, which is why the line of closes was allowed", () => {
    // `CHARTING.md` §2 chose a line over candlesticks *on the grounds that this
    // readout exists*. A sentence naming only the close would retroactively
    // make that decision wrong.
    const sentence = readingAnnouncement("NVDA", bar(178.44, 178.86)) ?? "";

    expect(sentence).toContain("close 178.86");
    expect(sentence).toContain("Open 178.44");
    expect(sentence).toMatch(/high \d/);
    expect(sentence).toMatch(/low \d/);
  });

  it("differs between two bars with the same four prices", () => {
    // §7 measured that a live region whose text does not change announces
    // nothing at all. A flat stretch of a session is four consecutive bars with
    // identical prices, so a sentence keyed on prices alone would speak once and
    // then go silent for the rest of the walk. The instant is what moves.
    const first = readingAnnouncement(
      "NVDA",
      bar(100, 100, "2026-09-04T15:52:00.000Z"),
    );
    const second = readingAnnouncement(
      "NVDA",
      bar(100, 100, "2026-09-04T15:53:00.000Z"),
    );

    expect(first).not.toBe(second);
  });

  it("is silent when there is no reading, rather than saying nothing at length", () => {
    // `null` and not `""`: arriving at a chart nobody has pointed at must
    // announce **nothing**, and keeping the distinction in the type is what
    // stops a caller speaking a sentence about no reading.
    expect(readingAnnouncement("NVDA", null)).toBeNull();
  });

  it("says so when a reading is cleared", () => {
    // Escape is a thing the person did, and a listener is owed its result.
    expect(clearedAnnouncement("NVDA")).toBe(
      "NVDA price chart: reading cleared.",
    );
  });
});
