import { toMarketDate } from "@marketpulse/shared";
import type { SecurityLastClose } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { commonSession } from "./last-close.js";

// What a *response* shares, tested without a DOM — `coverage.test.ts` next
// door, for the same reason. The rendering is `UniverseTable.test.tsx`'s.
//
// **This file held the change arithmetic's tests until 2026-09-26.** They left
// with `changeFromClose` and `changePercent` for `packages/shared`, and are
// now `packages/shared/src/live-change.test.ts` (Task 4.2.3). What stayed is
// the one question that is about a response rather than about a figure.

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
