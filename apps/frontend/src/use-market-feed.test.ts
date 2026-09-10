import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubFetch } from "./fixtures/stub-fetch.js";
import { useMarketFeed } from "./use-market-feed.js";

// The hook drives the real effect against a stubbed `fetch`, which is its only
// seam — the deadline, the abort composition and the `ApiError` parse belong to
// `api-client.ts` and are tested there. What is tested here is the collapse of
// the client's seven outcomes onto the four states, and the two properties that
// belong to the loop rather than to a request: it asks **once**, and a teardown
// writes nothing.

const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useMarketFeed", () => {
  it("starts on the placeholder before anything has settled", () => {
    stubFetch(() => json(200, { feed: "iex" }));

    const { result } = renderHook(() => useMarketFeed());

    expect(result.current).toEqual({ state: "checking" });
  });

  it("reports the configured feed", async () => {
    stubFetch(() => json(200, { feed: "iex" }));

    const { result } = renderHook(() => useMarketFeed());

    await waitFor(() => {
      expect(result.current).toEqual({ state: "configured", feed: "iex" });
    });
  });

  // The default deployment. `feed: null` is the contract's spelling of "no
  // provider is configured", and it is exact because every provider declares a
  // feed — so this branch is the whole of how the unconfigured state reaches
  // the screen.
  it("reports a null feed as no provider configured, not as a failure", async () => {
    stubFetch(() => json(200, { feed: null }));

    const { result } = renderHook(() => useMarketFeed());

    await waitFor(() => {
      expect(result.current).toEqual({ state: "not-configured" });
    });
  });

  it("reports nothing arriving as unknown", async () => {
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));

    const { result } = renderHook(() => useMarketFeed());

    await waitFor(() => {
      expect(result.current).toEqual({ state: "unknown" });
    });
  });

  it("reports a service answering badly as unknown", async () => {
    stubFetch(() => json(500, { code: "INTERNAL_ERROR", message: "boom" }));

    const { result } = renderHook(() => useMarketFeed());

    await waitFor(() => {
      expect(result.current).toEqual({ state: "unknown" });
    });
  });

  // **The state production is actually in for the ninety seconds of the rollout
  // that ships this**, and it is worth a test rather than an assumption: the
  // frontend and the backend deploy as two steps, so a page served by the new
  // frontend can ask a backend that does not have this route yet. Measured
  // against the deployed backend before the merge — it answers a 404 carrying
  // the `ApiError` contract — so the chrome degrades to `unknown` and says so,
  // rather than breaking or claiming a feed.
  it("reports a backend with no such route as unknown, which is the rollout window", async () => {
    stubFetch(() =>
      json(404, {
        code: "NOT_FOUND",
        message: "Route not found.",
        requestId: "04af22bc-81d8-4331-bade-e35e7fd6c4b1",
      }),
    );

    const { result } = renderHook(() => useMarketFeed());

    await waitFor(() => {
      expect(result.current).toEqual({ state: "unknown" });
    });
  });

  // The case the strict predicate exists for, and the reason it is stricter
  // than `isHealthResponse`: a feed slug this bundle has no words for must not
  // reach a component that would print it. It arrives as `unreadable-body` and
  // renders as the honest `unknown` rather than as a raw slug in the chrome.
  it("reports a feed it has no words for as unknown rather than rendering a slug", async () => {
    stubFetch(() => json(200, { feed: "otc" }));

    const { result } = renderHook(() => useMarketFeed());

    await waitFor(() => {
      expect(result.current).toEqual({ state: "unknown" });
    });
  });

  // A static host answering `index.html` at 200 — the case this repository has
  // measured twice, in `vite preview` and in `navigationFallback`.
  it("reports a 200 that is not this API as unknown", async () => {
    stubFetch(() =>
      Promise.resolve(new Response("<!doctype html>", { status: 200 })),
    );

    const { result } = renderHook(() => useMarketFeed());

    await waitFor(() => {
      expect(result.current).toEqual({ state: "unknown" });
    });
  });

  // The property that makes this hook different from `useBackendHealth`: a
  // deployment's configured feed cannot change without a deploy and a reload,
  // so polling it would be standing traffic to re-learn a fact that has not
  // moved.
  it("asks once and never again", async () => {
    const { calls } = stubFetch(() => json(200, { feed: "iex" }));

    const { result, rerender } = renderHook(() => useMarketFeed());

    await waitFor(() => {
      expect(result.current).toEqual({ state: "configured", feed: "iex" });
    });

    rerender();
    rerender();

    expect(calls).toHaveLength(1);
  });

  // A torn-down effect is not a fact about the service. Under `StrictMode` the
  // development double-invoke produces exactly this, and mapping it to no state
  // at all is what closes the "resolved after unmount" bug at the one place it
  // can be closed.
  it("writes nothing after unmounting", async () => {
    let settle: ((response: Response) => void) | undefined;
    stubFetch(
      () =>
        new Promise<Response>((resolve) => {
          settle = resolve;
        }),
    );

    const { result, unmount } = renderHook(() => useMarketFeed());
    unmount();

    settle?.(new Response(JSON.stringify({ feed: "iex" }), { status: 200 }));
    await Promise.resolve();

    expect(result.current).toEqual({ state: "checking" });
  });
});
