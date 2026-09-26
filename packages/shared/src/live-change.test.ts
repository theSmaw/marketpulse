import { describe, expect, it } from "vitest";

import { changeFromClose, changePercent } from "./live-change.js";
import { toMarketDate } from "./market-time.js";

import type { Bar } from "./bar.js";
import type { SecurityLastClose } from "./securities-response.js";

// What a move *reads* as, tested without a DOM. **Moved here from
// `apps/frontend/src/components/UniverseTable/last-close.test.ts` on
// 2026-09-26 by Task 4.2.3**, with the subject. `commonSession`'s tests stayed
// behind with `commonSession`.
//
// The price and percentage *formatting* was never this file's: its tests are
// the frontend's `market/price-format.test.ts`.

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

/**
 * A live minute bar. **The instant is what decides the basis**, so it is the
 * parameter every test here varies; the other four prices are never read by
 * {@link changeFromClose} and exist because `Bar` requires them.
 */
function liveBar(over: {
  readonly close: number;
  readonly startsAt: string;
}): Bar {
  return {
    startsAt: new Date(over.startsAt),
    open: over.close,
    high: over.close,
    low: over.close,
    close: over.close,
    volume: 1_000,
  };
}

/**
 * **17:00Z is 13:00 in New York on both sides of the DST boundary**, so a date
 * written here is the market session it reads as. Naming the offset instead
 * would be the trap `market-time.ts` exists to prevent, and a lint rule
 * forbids spelling the timezone outside it.
 */
function duringSession(date: string): string {
  return `${date}T17:00:00.000Z`;
}

describe("changeFromClose", () => {
  it("measures a live price against the last stored close", () => {
    const { percent, basis } = changeFromClose(
      liveBar({ close: 230.36, startsAt: duringSession("2026-09-07") }),
      close({ close: 228.45, session: toMarketDate("2026-09-04") }),
    );

    expect(percent).toBeCloseTo(0.836, 3);
    expect(basis).toBe("2026-09-04");
  });

  // **The case this function exists for, and the reason it is not a flag on
  // `changePercent`.** The nightly backfill writes today, so the stored close
  // and the live bar meet — every evening in development, and on a cold load
  // the morning after a deploy. Measuring against `close` then compares a
  // price with a close from its own session and reports ~0.00% down the whole
  // column: 518 well-formed, correctly-coloured numbers saying the market did
  // not move. Nothing about that looks broken, which is why it is asserted.
  it("does NOT measure against a close from the live bar's own session", () => {
    const { percent, basis } = changeFromClose(
      liveBar({ close: 230.36, startsAt: duringSession("2026-09-04") }),
      close({
        close: 229.1,
        session: toMarketDate("2026-09-04"),
        previousClose: 228.45,
      }),
    );

    expect(percent).toBeCloseTo(0.836, 3);
    expect(percent).not.toBeCloseTo(0, 2);
    // There is a price to measure from and no date on the wire beside it, so
    // the honest answer is no session rather than one invented by arithmetic.
    expect(basis).toBeNull();
  });

  it("says nothing when the only stored session is the live bar's own", () => {
    const { percent, basis } = changeFromClose(
      liveBar({ close: 230.36, startsAt: duringSession("2026-09-04") }),
      close({ close: 229.1, session: toMarketDate("2026-09-04") }),
    );

    // An absence rather than a zero: `0.00%` would claim the price has not
    // moved, which is not what *we cannot say* means.
    expect(percent).toBeNull();
    expect(basis).toBeNull();
  });

  it("says nothing when no daily close is stored at all", () => {
    expect(
      changeFromClose(
        liveBar({ close: 230.36, startsAt: duringSession("2026-09-07") }),
        undefined,
      ),
    ).toEqual({ percent: null, basis: null });
  });

  it("is null rather than infinite when the basis close is zero", () => {
    expect(
      changeFromClose(
        liveBar({ close: 230.36, startsAt: duringSession("2026-09-07") }),
        close({ close: 0, session: toMarketDate("2026-09-04") }),
      ).percent,
    ).toBeNull();
  });

  it("is negative when the live price is below the close", () => {
    expect(
      changeFromClose(
        liveBar({ close: 226.0, startsAt: duringSession("2026-09-07") }),
        close({ close: 228.45, session: toMarketDate("2026-09-04") }),
      ).percent,
    ).toBeCloseTo(-1.072, 3);
  });
});

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
