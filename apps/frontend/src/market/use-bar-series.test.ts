import type { BarPayload, BarSeriesPayload } from "@marketpulse/shared";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BarSeriesRequest } from "../bar-series-query.js";
import { barSeriesQuery } from "../bar-series-query.js";
import { barSeriesCache } from "./series-cache.js";
import { useBarSeries } from "./use-bar-series.js";

// The hook drives its real effect against a stubbed `fetch`, which is the only
// seam it has: the deadline, the abort composition and the `ApiError` parse
// belong to `api-client.ts`, the collapse of seven outcomes onto six states
// belongs to `bar-series-view.ts`, and both are tested where they live. What is
// tested here is the **loop** — when a request goes out, when its answer stops
// counting, and what is on screen while the next one is in flight.
//
// Two of these tests are about a failure that is invisible on screen when it
// happens, so each says how it was verified: the supersession test was watched
// going red with the identity guard removed, and the teardown test asserts the
// signal rather than the state, because React does not re-render an unmounted
// component and so a state assertion there would pass either way.

const START = "2026-09-08T13:30:00.000Z";

const REQUEST: BarSeriesRequest = {
  symbol: "NVDA",
  timeframe: "1m",
  window: { form: "named", sessions: 5 },
};

function bars(count: number, from = Date.parse(START)): BarPayload[] {
  return Array.from({ length: count }, (_, i) => ({
    startsAt: new Date(from + i * 60_000).toISOString(),
    open: 1,
    high: 2,
    low: 0.5,
    close: 1.5,
    volume: 100,
  }));
}

/**
 * A coherent series payload of `count` bars, covering exactly what it asked
 * for — so it collapses to `loaded` and nothing here has to assert about the
 * difference between `loaded` and `partial`, which is `bar-series-view.ts`'s
 * test to make.
 */
function series(count: number, symbol = "NVDA"): BarSeriesPayload {
  const from = Date.parse(START);
  const window = {
    start: START,
    end: new Date(from + count * 60_000).toISOString(),
  };

  return {
    symbol,
    timeframe: "1m",
    bars: bars(count, from),
    provenance: {
      adjustment: "raw",
      sources: [
        {
          provider: "alpaca",
          feed: "sip",
          retrievedAt: "2026-09-09T02:00:00.000Z",
          barCount: count,
        },
      ],
    },
    coverage: { requested: window, covered: window },
  };
}

const body = (payload: BarSeriesPayload): string =>
  JSON.stringify({ series: payload, securityStatus: "active" });

/** Every request the stub has seen: its URL, and the signal it was handed. */
let calls: { url: string; signal: AbortSignal | undefined }[] = [];

function stubFetch(
  respond: (url: string, call: number) => Promise<Response>,
): void {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, signal: init?.signal ?? undefined });
      return respond(url, calls.length);
    }),
  );
}

const ok = (payload: BarSeriesPayload): Promise<Response> =>
  Promise.resolve(new Response(body(payload), { status: 200 }));

/** The same, delayed, so an out-of-order pair can be arranged. */
const okAfter = (payload: BarSeriesPayload, ms: number): Promise<Response> =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(new Response(body(payload), { status: 200 }));
    }, ms);
  });

beforeEach(() => {
  // The cache is module-level and therefore process-wide. A test inheriting
  // another test's entries is a test that passes for a reason it does not
  // state — and in this file it would pass by painting a series nobody asked
  // for.
  barSeriesCache.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  barSeriesCache.clear();
});

describe("useBarSeries", () => {
  it("asks for the series it was given, once, and loads it", async () => {
    stubFetch(() => ok(series(3)));

    const { result } = renderHook(() => useBarSeries(REQUEST));

    expect(result.current.view.state).toBe("loading");

    await waitFor(() => {
      expect(result.current.view.state).toBe("loaded");
    });

    const view = result.current.view;
    if (view.state !== "loaded") throw new Error("expected loaded");
    expect(view.series.bars).toHaveLength(3);

    // The URL is `barSeriesQuery`'s spelling and not a second one. A hook that
    // composed its own would be a second copy of the contract, and the copy
    // that still says `sessions` after the server has learned something else.
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain(barSeriesQuery(REQUEST));
  });

  // A fresh object literal describing the identical request is what a route
  // hands this hook on every render. If the effect keyed on the object rather
  // than on the query string, this would fetch forever — and it would look
  // exactly like a working hook on screen.
  it("does not re-ask when the same request arrives as a new object", async () => {
    stubFetch(() => ok(series(1)));

    const { result, rerender } = renderHook(() =>
      useBarSeries({
        symbol: "NVDA",
        timeframe: "1m",
        window: { form: "named", sessions: 5 },
      }),
    );

    await waitFor(() => {
      expect(result.current.view.state).toBe("loaded");
    });

    rerender();
    rerender();

    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(calls).toHaveLength(1);
  });

  it("asks again, and aborts the request in flight, when the symbol changes", async () => {
    stubFetch((url) =>
      okAfter(series(1, url.includes("AMD") ? "AMD" : "NVDA"), 20),
    );

    const { result, rerender } = renderHook(
      ({ symbol }: { symbol: string }) => useBarSeries({ ...REQUEST, symbol }),
      { initialProps: { symbol: "NVDA" } },
    );

    rerender({ symbol: "AMD" });

    await waitFor(() => {
      expect(result.current.view.state).toBe("loaded");
    });

    expect(calls).toHaveLength(2);
    // The first request's signal is aborted — the cancellation half of
    // acceptance criterion 3, asserted on the mechanism rather than on the
    // screen, because a cancelled request is by design invisible there.
    expect(calls[0]?.signal?.aborted).toBe(true);
    expect(calls[1]?.signal?.aborted).toBe(false);

    const view = result.current.view;
    if (view.state !== "loaded") throw new Error("expected loaded");
    expect(view.series.symbol).toBe("AMD");
  });

  // The window is the second supersession cause, and it goes through the same
  // mechanism as the first. A separate test rather than a parameterised one,
  // because "changing the window re-asks" is a claim about the key including
  // the window — which is a different thing to get wrong than the symbol.
  it("asks again when only the window changes", async () => {
    stubFetch(() => ok(series(1)));

    const { result, rerender } = renderHook(
      ({ sessions }: { sessions: number }) =>
        useBarSeries({ ...REQUEST, window: { form: "named", sessions } }),
      { initialProps: { sessions: 5 } },
    );

    await waitFor(() => {
      expect(result.current.view.state).toBe("loaded");
    });

    rerender({ sessions: 20 });

    await waitFor(() => {
      expect(calls).toHaveLength(2);
    });
    expect(calls[1]?.url).toContain("sessions=20");
  });

  // **The half that aborting cannot fix.** A request that had already resolved
  // when the abort landed cannot be un-resolved, and a stubbed `fetch` that
  // ignores its signal is exactly that shape — so this exercises the identity
  // guard rather than the abort. The two answers say different things on
  // purpose: if the loser were allowed to land, the state would end up on 1 bar
  // *after* it had reached 9, and an assertion that only checked "loaded" would
  // pass either way.
  //
  // Verified by deleting the `current.current !== controller` line in the hook
  // and watching this go red.
  it("cannot render a superseded answer that arrives after the newer one", async () => {
    stubFetch((url) =>
      url.includes("NVDA")
        ? okAfter(series(1), 40)
        : okAfter(series(9, "AMD"), 0),
    );

    const { result, rerender } = renderHook(
      ({ symbol }: { symbol: string }) => useBarSeries({ ...REQUEST, symbol }),
      { initialProps: { symbol: "NVDA" } },
    );

    rerender({ symbol: "AMD" });

    await waitFor(() => {
      const view = result.current.view;
      if (view.state !== "loaded") throw new Error("not loaded yet");
      expect(view.series.bars).toHaveLength(9);
    });

    // And it stays there: the slow, superseded answer arrives afterwards and is
    // dropped rather than overwriting the newer one.
    await new Promise((resolve) => setTimeout(resolve, 80));
    const view = result.current.view;
    if (view.state !== "loaded") throw new Error("expected loaded");
    expect(view.series.bars).toHaveLength(9);
    expect(view.series.symbol).toBe("AMD");
  });

  // The teardown case. **Asserted on the signal and not on the state**, and the
  // distinction is worth stating: React does not re-render an unmounted
  // component, so `result.current` cannot move after an unmount whether the
  // guard is there or not, and a state assertion would pass against a hook with
  // no guard at all. What is observable is that the request was cancelled — and
  // the guard that clears the ref beside it is the same line the supersession
  // test above does hold red.
  it("aborts the request in flight when it is unmounted", async () => {
    stubFetch(() => okAfter(series(1), 60));

    const { unmount } = renderHook(() => useBarSeries(REQUEST));

    await waitFor(() => {
      expect(calls).toHaveLength(1);
    });
    expect(calls[0]?.signal?.aborted).toBe(false);

    unmount();

    expect(calls[0]?.signal?.aborted).toBe(true);

    // Nothing is kept from a request nobody is waiting for: the answer lands
    // after the unmount and is not written to the cache, so a later mount of
    // the same request starts from `loading` rather than from an answer no
    // component ever rendered.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(barSeriesCache.read(barSeriesQuery(REQUEST))).toBeUndefined();
  });

  // **What the cache actually buys**, stated as the assertion rather than as a
  // request count: leaving a security and coming back paints the held series in
  // the *first* commit instead of a loading state — the parse and the round
  // trip are still in flight behind it. The request is deliberately still made
  // (`FRONTEND-STATE.md` §2: every read of the cache is accompanied by one), so
  // a test counting requests would be asserting the opposite of the design.
  it("paints a held series immediately when the same security is returned to", async () => {
    stubFetch(() => ok(series(4)));

    const first = renderHook(() => useBarSeries(REQUEST));
    await waitFor(() => {
      expect(first.result.current.view.state).toBe("loaded");
    });
    first.unmount();

    const second = renderHook(() => useBarSeries(REQUEST));

    // No `waitFor`: this is the state of the very first render.
    const view = second.result.current.view;
    expect(view.state).toBe("loaded");
    if (view.state !== "loaded") throw new Error("expected loaded");
    expect(view.series.bars).toHaveLength(4);

    // And the request still went out. The cache paints sooner; it never decides
    // that no request is needed, which is what keeps freshness with the browser
    // and the server's five-minute ceiling.
    await waitFor(() => {
      expect(calls).toHaveLength(2);
    });
  });

  // The key is the whole request. A held series for five sessions must not be
  // painted under a request for twenty — that is a chart of the wrong window
  // wearing the right label, which is plausible and wrong rather than visibly
  // broken.
  it("does not paint a held series under a different window", async () => {
    stubFetch(() => okAfter(series(4), 40));

    const first = renderHook(() => useBarSeries(REQUEST));
    await waitFor(() => {
      expect(first.result.current.view.state).toBe("loaded");
    });
    first.unmount();

    const second = renderHook(() =>
      useBarSeries({ ...REQUEST, window: { form: "named", sessions: 20 } }),
    );

    expect(second.result.current.view.state).toBe("loading");
  });

  // A failure is not held either, and the hook offers the retry the state says
  // is worth offering. The derivation of `retryable` is `packages/shared`'s and
  // the collapse is `bar-series-view.ts`'s; what is asserted here is that
  // pressing it produces a real second request and a recovery with no reload.
  it("recovers from a retryable failure without a reload, and holds nothing from it", async () => {
    stubFetch((_url, call) =>
      call === 1
        ? Promise.resolve(
            new Response(
              JSON.stringify({
                code: "SERVICE_UNAVAILABLE",
                message: "The market data store is not reachable.",
                requestId: "8f14e45f-ceea-467a-9e1b-1b9e2d0a3f11",
              }),
              { status: 503, headers: { "content-type": "application/json" } },
            ),
          )
        : ok(series(2)),
    );

    const { result } = renderHook(() => useBarSeries(REQUEST));

    await waitFor(() => {
      expect(result.current.view.state).toBe("failed");
    });
    expect(barSeriesCache.read(barSeriesQuery(REQUEST))).toBeUndefined();

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.view.state).toBe("loaded");
    });
    expect(calls).toHaveLength(2);
  });

  // A refusal is an answer about the request rather than about the market, and
  // it is not held: re-asking the same request gets the same refusal, so an
  // entry would save nothing and would outlive the screen its sentence was
  // written for.
  it("does not hold a refusal", async () => {
    stubFetch(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            code: "BAD_REQUEST",
            message:
              "That window is 98,280 bars and one response carries at most 10,000.",
            requestId: "8f14e45f-ceea-467a-9e1b-1b9e2d0a3f11",
          }),
          { status: 400, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const { result } = renderHook(() => useBarSeries(REQUEST));

    await waitFor(() => {
      expect(result.current.view.state).toBe("refused");
    });
    expect(barSeriesCache.read(barSeriesQuery(REQUEST))).toBeUndefined();
  });

  // The refetch policy, asserted rather than only written down. A poll here
  // would be standing traffic per open tab for a tail that moves once a night,
  // and it is the wrong mechanism arriving before Epic 3's live feed.
  it("does not poll", async () => {
    stubFetch(() => ok(series(1)));

    const { result } = renderHook(() => useBarSeries(REQUEST));

    await waitFor(() => {
      expect(result.current.view.state).toBe("loaded");
    });

    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(calls).toHaveLength(1);
  });
});
