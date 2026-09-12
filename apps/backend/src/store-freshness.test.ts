import { toMarketDate, toTimeRange } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import type { CoverageRow } from "./store-freshness.js";
import {
  lastCompletedSession,
  sessionsBetween,
  storeFreshness,
} from "./store-freshness.js";

// The arithmetic behind the freshness diagnostic.
//
// **Every date here is a real one from the checked-in calendar**, chosen so the
// weekend and the holiday are load-bearing rather than incidental:
//
//   - 2026-09-04 Friday   — where the `1d` store was frozen when the bug ran
//   - 2026-09-07 Monday   — **Labor Day**, closed
//   - 2026-09-08 Tuesday … 2026-09-11 Friday — four sessions
//   - 2026-09-12 Saturday — the day it was found
//
// That span is eight calendar days and **four** trading sessions, which is the
// single most important thing this module must not get wrong. Reporting "8"
// would be wrong in a way that invites a tolerance nobody can justify.

/** 16:00 ET on a market date, as the EXCLUSIVE end of a covered range. */
function coveredThrough(timeframe: "1m" | "1d", close: string): CoverageRow {
  return {
    timeframe,
    covered: toTimeRange(new Date("2020-01-02T14:30:00.000Z"), new Date(close)),
  };
}

/** 2026-09-04 16:00 EDT, exclusive — the frozen daily store. */
const SEP_4_CLOSE = "2026-09-04T20:00:00.000Z";
/** 2026-09-11 16:00 EDT, exclusive — the current minute store. */
const SEP_11_CLOSE = "2026-09-11T20:00:00.000Z";

/** Saturday 2026-09-12, the morning the defect was reported. */
const SATURDAY = new Date("2026-09-12T12:00:00.000Z");

describe("lastCompletedSession", () => {
  it("is Friday on the Saturday after it", () => {
    expect(lastCompletedSession(SATURDAY)).toBe("2026-09-11");
  });

  it("is yesterday while today's session is still open", () => {
    // 11:00 ET on Wednesday the 9th. Wednesday has not completed, so a store
    // holding through Tuesday is CURRENT. Measuring against the date rather
    // than the close would report the whole universe stale every weekday
    // morning, which is the shape of alert nobody keeps.
    expect(lastCompletedSession(new Date("2026-09-09T15:00:00.000Z"))).toBe(
      "2026-09-08",
    );
  });

  it("is the previous session at the moment of the close, and this one after it", () => {
    // The boundary is `close <= now`, and the close is exclusive. One
    // millisecond either side of 16:00 ET on the 11th.
    expect(lastCompletedSession(new Date("2026-09-11T19:59:59.999Z"))).toBe(
      "2026-09-10",
    );
    expect(lastCompletedSession(new Date("2026-09-11T20:00:00.000Z"))).toBe(
      "2026-09-11",
    );
  });

  it("skips the holiday rather than counting it", () => {
    // Tuesday 2026-09-08, before the open. The previous session is FRIDAY,
    // because Monday was Labor Day. A day-based answer would say Monday.
    expect(lastCompletedSession(new Date("2026-09-08T12:00:00.000Z"))).toBe(
      "2026-09-04",
    );
  });
});

describe("sessionsBetween", () => {
  it("counts the real gap the bug produced — four sessions, not eight days", () => {
    // This is the assertion the whole module exists for.
    expect(
      sessionsBetween(toMarketDate("2026-09-04"), toMarketDate("2026-09-11")),
    ).toBe(4);
  });

  it("is zero for a store that is current", () => {
    expect(
      sessionsBetween(toMarketDate("2026-09-11"), toMarketDate("2026-09-11")),
    ).toBe(0);
  });

  it("is zero rather than negative when the store is somehow ahead", () => {
    // Reachable through the live tail: a request can stitch a session the
    // ledger has not recorded. A negative "sessions behind" would render as a
    // nonsense figure on a screen.
    expect(
      sessionsBetween(toMarketDate("2026-09-11"), toMarketDate("2026-09-04")),
    ).toBe(0);
  });

  it("does not count a weekend as a session", () => {
    // Friday to Monday is one session, not three days.
    expect(
      sessionsBetween(toMarketDate("2026-09-11"), toMarketDate("2026-09-14")),
    ).toBe(1);
  });
});

describe("storeFreshness", () => {
  it("reports the defect that shipped: 1m current, 1d four sessions behind", () => {
    const freshness = storeFreshness(
      [coveredThrough("1m", SEP_11_CLOSE), coveredThrough("1d", SEP_4_CLOSE)],
      SATURDAY,
    );

    expect(freshness.lastCompletedSession).toBe("2026-09-11");

    const byTimeframe = new Map(
      freshness.timeframes.map((entry) => [entry.timeframe, entry]),
    );

    expect(byTimeframe.get("1m")?.sessionsBehind).toBe(0);
    expect(byTimeframe.get("1m")?.newestSession).toBe("2026-09-11");

    expect(byTimeframe.get("1d")?.sessionsBehind).toBe(4);
    expect(byTimeframe.get("1d")?.newestSession).toBe("2026-09-04");
  });

  it("reads the covered end as exclusive, so a 16:00 close is that session", () => {
    // The trap this guards: `covered.end` is half-open, and 16:00 ET is 20:00Z,
    // so `marketDateAt(end)` is right here and wrong for an early close at
    // 13:00 ET — and reading it directly would report a store as one session
    // fresher than it is, which is the direction that hides a defect.
    const freshness = storeFreshness(
      [coveredThrough("1d", SEP_11_CLOSE)],
      SATURDAY,
    );

    expect(freshness.timeframes[1]?.newestSession).toBe("2026-09-11");
  });

  it("separates the freshest security from the stalest, because a maximum hides a partial fill", () => {
    // A run that covered one symbol and stopped. `newestSession` says the store
    // was refreshed today; only the stalest figure says most of it was not.
    const freshness = storeFreshness(
      [
        coveredThrough("1d", SEP_11_CLOSE),
        coveredThrough("1d", SEP_4_CLOSE),
        coveredThrough("1d", SEP_4_CLOSE),
      ],
      SATURDAY,
    );

    const daily = freshness.timeframes.find((e) => e.timeframe === "1d");
    expect(daily?.sessionsBehind).toBe(0);
    expect(daily?.stalestSessionsBehind).toBe(4);
    expect(daily?.securities).toBe(3);
  });

  it("names a timeframe the ledger holds nothing for, rather than omitting it", () => {
    // The original defect was not a wrong number, it was an ABSENT one. A
    // timeframe reported by omission is a timeframe nobody notices.
    const freshness = storeFreshness(
      [coveredThrough("1m", SEP_11_CLOSE)],
      SATURDAY,
    );

    const daily = freshness.timeframes.find((e) => e.timeframe === "1d");
    expect(daily).toBeDefined();
    expect(daily?.newestSession).toBeNull();
    expect(daily?.sessionsBehind).toBeNull();
    expect(daily?.securities).toBe(0);
  });

  it("answers for an empty store, which is what CI has", () => {
    // `verify.yml` runs the migrations and the universe loader and never a
    // backfill, so CI's store holds 518 securities and zero bars. A throw here
    // would make the diagnostic unusable in the one environment that runs it
    // most often.
    const freshness = storeFreshness([], SATURDAY);

    expect(freshness.timeframes).toHaveLength(2);
    for (const entry of freshness.timeframes) {
      expect(entry.newestSession).toBeNull();
      expect(entry.securities).toBe(0);
    }
  });
});

describe("a covered range that does not end on a session", () => {
  it("reports the last session traded, never a day the market was closed", () => {
    // Found by running the endpoint against the real ledger: the daily store
    // reported `2026-09-07`, which is Labor Day. A range ending
    // 2026-09-08T04:00Z is the 7th in market time one millisecond earlier, and
    // the 7th is not a session anybody can hold.
    const freshness = storeFreshness(
      [
        {
          timeframe: "1d",
          covered: toTimeRange(
            new Date("2024-01-02T14:30:00.000Z"),
            new Date("2026-09-08T04:00:00.000Z"),
          ),
        },
      ],
      SATURDAY,
    );

    const daily = freshness.timeframes.find((e) => e.timeframe === "1d");
    expect(daily?.newestSession).toBe("2026-09-04");
  });

  it("counts the same lag either way, which is why this was cosmetic", () => {
    // Stated as a test so the claim is checked rather than asserted in a
    // comment: there are no sessions between a closed day and the one before
    // it, so counting forward from either gives the same answer.
    expect(
      sessionsBetween(toMarketDate("2026-09-07"), toMarketDate("2026-09-11")),
    ).toBe(
      sessionsBetween(toMarketDate("2026-09-04"), toMarketDate("2026-09-11")),
    );
  });
});
