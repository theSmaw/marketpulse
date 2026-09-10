import { describe, expect, it } from "vitest";

import { barSeriesQuery } from "./bar-series-query.js";

// What these tests are actually about is the string being **stable** and the
// window being **exclusive**. The encoding is `URLSearchParams`' and needs no
// test; the order does, because two caches key on this string, and the
// exclusivity does, because a request naming both window forms is a 400 and a
// request naming neither is one too.

describe("barSeriesQuery", () => {
  it("sends the named window as sessions and never resolves it here", () => {
    expect(
      barSeriesQuery({
        symbol: "NVDA",
        timeframe: "1m",
        window: { form: "named", sessions: 5 },
      }),
    ).toBe("symbol=NVDA&timeframe=1m&sessions=5");
  });

  it("sends an absolute window as its two instants, unchanged", () => {
    // Passed through rather than parsed and re-formatted: a `Date` round trip
    // here is a chance to lose the `Z`, and the server refuses a zone-less
    // instant precisely because that mistake is invisible on a UTC machine.
    expect(
      barSeriesQuery({
        symbol: "BRK.B",
        timeframe: "1d",
        window: {
          form: "absolute",
          start: "2026-09-01T13:30:00.000Z",
          end: "2026-09-04T20:00:00.000Z",
        },
      }),
    ).toBe(
      "symbol=BRK.B&timeframe=1d&start=2026-09-01T13%3A30%3A00.000Z" +
        "&end=2026-09-04T20%3A00%3A00.000Z",
    );
  });

  it("produces the same string for the same request, so a cache key is one thing", () => {
    // The property `FRONTEND-STATE.md` §2 relies on when it keys the in-memory
    // series cache on the request as sent, and the property the browser's own
    // HTTP cache relies on for every `ETag` revalidation. Two spellings of one
    // request are two misses and two round trips, and nothing on screen is
    // wrong while it happens.
    const request = {
      symbol: "AMD",
      timeframe: "1m",
      window: { form: "named", sessions: 1 },
    } as const;

    expect(barSeriesQuery(request)).toBe(
      barSeriesQuery({
        window: request.window,
        timeframe: request.timeframe,
        symbol: request.symbol,
      }),
    );
  });

  it("percent-encodes a symbol rather than letting it change the request", () => {
    const query = barSeriesQuery({
      symbol: "A&timeframe=1d",
      timeframe: "1m",
      window: { form: "named", sessions: 5 },
    });

    expect(query).toBe("symbol=A%26timeframe%3D1d&timeframe=1m&sessions=5");
    // The server sees one `timeframe`, and it is ours. A hand-assembled URL is
    // where this stops being true — which is the reason this function exists
    // rather than a template literal at a call site.
    expect(new URLSearchParams(query).getAll("timeframe")).toEqual(["1m"]);
  });

  it("cannot express a half-specified window", () => {
    // Not a run-time assertion — the point is that these are **compile**
    // errors, which is what a discriminated union buys over three optional
    // fields. Both `@ts-expect-error`s fail the build the day either shape
    // becomes constructible, which is the only way this property can be
    // checked at all.
    expect(() =>
      barSeriesQuery({
        symbol: "NVDA",
        timeframe: "1m",
        // @ts-expect-error a named window without a count is not a window
        window: { form: "named" },
      }),
    ).not.toThrow();

    expect(() =>
      barSeriesQuery({
        symbol: "NVDA",
        timeframe: "1m",
        // @ts-expect-error an absolute window is both instants or neither
        window: { form: "absolute", start: "2026-09-01T13:30:00.000Z" },
      }),
    ).not.toThrow();
  });
});
