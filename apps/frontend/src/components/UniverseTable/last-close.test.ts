import { toMarketDate } from "@marketpulse/shared";
import type { SecurityLastClose } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import {
  changePercent,
  commonSession,
  directionOf,
  formatChangePercent,
  formatPrice,
} from "./last-close.js";

// What a price and a move *read* as, tested without a DOM — `coverage.test.ts`
// next door, for the same reason. The rendering is `UniverseTable.test.tsx`'s.

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

describe("formatPrice", () => {
  it.each([
    [230.36, "230.36"],
    // The store is `numeric(18, 6)` and those places are real. Two is a display
    // decision, and the rounded value is never fed back into anything.
    [230.364_9, "230.36"],
    [230.365_1, "230.37"],
    // A whole number still gets its places, so the column does not develop a
    // ragged decimal point on the one row that closed evenly.
    [770, "770.00"],
    // A sub-dollar security, where the two places carry the whole figure.
    [0.42, "0.42"],
  ])("renders %s as %s", (price, expected) => {
    expect(formatPrice(price)).toBe(expected);
  });

  it("uses no grouping separator, so four-figure prices keep the column", () => {
    // `Intl.NumberFormat` would give `1,234.56` here and `1.234,56` to a reader
    // in another locale — two widths for one number, which is exactly what
    // `tabular-nums` was bought to prevent. See the module header.
    expect(formatPrice(1234.56)).toBe("1234.56");
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

describe("formatChangePercent", () => {
  it.each([
    [0.836, "+0.84%"],
    [-2.51, "−2.51%"],
    [0, "0.00%"],
  ])("renders %s as %s", (percent, expected) => {
    expect(formatChangePercent(percent)).toBe(expected);
  });

  it("uses a real minus sign rather than a hyphen", () => {
    // A hyphen-minus is a different width from the digits around it, so a
    // column of negative figures stops aligning with the positive ones — which
    // undoes what `tabular-nums` is there for (Task 1.4.3 measured a 14.3px
    // spread). Asserted on the code point, because the two are hard to tell
    // apart by eye in a diff.
    expect(formatChangePercent(-1.5).codePointAt(0)).toBe(0x2212);
    expect(formatChangePercent(-1.5)).not.toContain("-");
  });

  // A move that rounds away carries no sign, because `+0.00%` claims a
  // direction the rounding discarded.
  it("drops the sign from a move that rounds to nothing", () => {
    expect(formatChangePercent(0.001)).toBe("0.00%");
    expect(formatChangePercent(-0.001)).toBe("0.00%");
  });
});

describe("directionOf", () => {
  it.each([
    [0.836, "positive"],
    [-2.51, "negative"],
    [0, "unchanged"],
  ])("calls %s %s", (percent, expected) => {
    expect(directionOf(percent)).toBe(expected);
  });

  // **The reason this is a function and not `percent > 0`.** By sign these are
  // a rise and a fall; rendered they are both `0.00%`. A `positive` here would
  // put an up arrow, a green tint and a figure saying nothing moved in the one
  // component built so its channels cannot disagree.
  it("agrees with the figure, not with the raw sign", () => {
    expect(directionOf(0.001)).toBe("unchanged");
    expect(directionOf(-0.001)).toBe("unchanged");
  });

  it("still calls a move that rounds to two places directional", () => {
    expect(directionOf(0.005)).toBe("positive");
    expect(directionOf(-0.005)).toBe("negative");
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
