import { toMarketDate } from "@marketpulse/shared";
import type { SecurityLastClose } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { changePercent, commonSession } from "./last-close.js";

// What a move *reads* as, tested without a DOM — `coverage.test.ts` next door,
// for the same reason. The rendering is `UniverseTable.test.tsx`'s.
//
// The price and percentage *formatting* left this file on 2026-09-11 with the
// functions themselves; its tests are `market/price-format.test.ts`.

function close(
  over: Partial<SecurityLastClose> & Pick<SecurityLastClose, "close">,
): SecurityLastClose {
  return {
    symbol: "NVDA",
    session: toMarketDate("2026-09-04"),
    previousClose: null,
    ...over,
  };
}

describe("changePercent", () => {
  it("measures the move against the session before", () => {
    expect(
      changePercent(close({ close: 230.36, previousClose: 228.45 })),
    ).toBeCloseTo(0.836, 3);
  });

  it("is negative when the price fell", () => {
    expect(
      changePercent(close({ close: 319.97, previousClose: 328.21 })),
    ).toBeCloseTo(-2.51, 2);
  });

  // §36's partial answer, one field wide: we hold one session, so there is
  // nothing to compare against. It is not a zero, because a zero says the
  // market did not move.
  it("is null when there is no previous session", () => {
    expect(changePercent(close({ close: 230.36 }))).toBeNull();
  });

  // Not defensive padding. The division is `Infinity`, which formats as
  // `"+Infinity%"` and renders — the most alarming figure this page could
  // produce, from the one row it could never be true of.
  it("is null rather than infinite when the previous close is zero", () => {
    expect(
      changePercent(close({ close: 230.36, previousClose: 0 })),
    ).toBeNull();
  });
});

describe("commonSession", () => {
  const closes = (...records: readonly SecurityLastClose[]) =>
    new Map(records.map((record) => [record.symbol, record]));

  // The state the real store is in: every security last closed on the same
  // session, so the date is stated once in the heading rather than 518 times.
  it("names the session when every close shares one", () => {
    expect(
      commonSession(
        closes(
          close({ symbol: "NVDA", close: 230.36 }),
          close({ symbol: "AAPL", close: 319.97 }),
        ),
      ),
    ).toBe("2026-09-04");
  });

  // Withdrawn rather than approximated: the moment one row disagrees, the
  // heading stops claiming a session and every cell carries its own.
  it("names nothing when they disagree, even by one", () => {
    expect(
      commonSession(
        closes(
          close({ symbol: "NVDA", close: 230.36 }),
          close({
            symbol: "ABBV",
            close: 256.46,
            session: toMarketDate("2026-08-28"),
          }),
        ),
      ),
    ).toBeNull();
  });

  // No prices, so no session to name — and the heading renders without a date
  // because there is nothing under it either.
  it("names nothing when there are no closes at all", () => {
    expect(commonSession(new Map())).toBeNull();
  });
});
