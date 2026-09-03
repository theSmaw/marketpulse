import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { API_TIMEOUT_MS } from "./api-client.js";
import {
  HEALTH_POLL_INTERVAL_MS,
  useBackendHealth,
} from "./use-backend-health.js";

// The hook's tests drive the real effect against a stubbed `fetch`, which is
// the only seam this loop has: everything else — the deadline, the abort
// composition, the `ApiError` parse — belongs to `api-client.ts` and is tested
// there. What is tested here is the collapse of seven outcomes onto three
// states, and the three things that are properties of the *loop* rather than of
// a request: a failure not clearing the last success, recovery with no remount,
// and teardown aborting what is in flight.
//
// Real timers with a small interval rather than fake ones. `AbortSignal.timeout`
// is native and is not faked by `vi.useFakeTimers()`, so a suite that faked
// timers would still wait five real seconds for the deadline — which is why the
// hook takes both numbers as options.

const HEALTHY_BODY = { status: "ok", version: "0.0.0", uptimeSeconds: 1.5 };

/** A poll interval and deadline small enough to watch, ordered as the shipped
 * pair is: the deadline strictly below the interval. */
const FAST = { intervalMs: 60, timeoutMs: 20 } as const;

interface FetchCall {
  readonly signal: AbortSignal | undefined;
}

const calls: FetchCall[] = [];

/**
 * Stub `fetch` with a handler taking the zero-based call index, so a test can
 * answer differently on the first and second poll — which is what recovery
 * needs.
 */
function stubFetch(
  handler: (call: number, signal: AbortSignal | undefined) => Promise<Response>,
): void {
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init?: RequestInit) => {
      const index = calls.length;
      calls.push({ signal: init?.signal ?? undefined });
      return handler(index, init?.signal ?? undefined);
    }),
  );
}

const json = (status: number, body: unknown): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

/**
 * A request that never answers — the socket that accepts and does not reply,
 * which is what makes the deadline observable.
 *
 * It rejects when the signal it was handed aborts, because that is what a real
 * `fetch` does and it is the whole mechanism under test: without it the
 * deadline expires and nothing tells the client. The rejection value is
 * deliberately a plain `Error` rather than the signal's own `DOMException` —
 * the client reads which signal fired off the *signals*, so supplying a reason
 * for it to read would test the wrong mechanism.
 */
const never = (
  _call: number,
  signal: AbortSignal | undefined,
): Promise<Response> =>
  new Promise<Response>((_resolve, reject) => {
    signal?.addEventListener("abort", () => {
      reject(new Error("aborted"));
    });
  });

afterEach(() => {
  calls.length = 0;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the polling interval", () => {
  // The one invariant in this story that `pnpm verify` could not otherwise
  // check. `api-client.ts` states it beside `API_TIMEOUT_MS` and nothing
  // enforces it — except this, which is the repository's own rule that a test
  // beats a seventh verify step when the thing being checked is reachable from
  // code.
  it("is strictly greater than the request deadline", () => {
    expect(HEALTH_POLL_INTERVAL_MS).toBeGreaterThan(API_TIMEOUT_MS);
  });
});

describe("the three states", () => {
  it("reports healthy, with the time and body of the successful check", async () => {
    stubFetch(() => json(200, HEALTHY_BODY));

    const { result } = renderHook(() => useBackendHealth(FAST));

    await waitFor(() => {
      expect(result.current.status).toBe("healthy");
    });

    expect(result.current.degradedCause).toBeNull();
    expect(result.current.lastSuccess).toEqual(HEALTHY_BODY);
    expect(result.current.lastSuccessAt).toBeInstanceOf(Date);
    expect(result.current.hasChecked).toBe(true);
  });

  // A 200 that is not a health report: the static host answering `index.html`,
  // which this repository has measured twice.
  it("reports degraded / unreadable-body for a 200 that is not a health report", async () => {
    stubFetch(() => json(200, { hello: "world" }));

    const { result } = renderHook(() => useBackendHealth(FAST));

    await waitFor(() => {
      expect(result.current.status).toBe("degraded");
    });
    expect(result.current.degradedCause).toBe("unreadable-body");
  });

  // Both `api-error` and `http-error` land here, and the point of testing both
  // is that the client's distinction between them — whether the body carried a
  // quotable `requestId` — is deliberately not a distinction `BackendStatus`
  // has.
  it("reports degraded / not-ok-status for a non-2xx carrying an ApiError", async () => {
    stubFetch(() =>
      json(500, {
        code: "INTERNAL_ERROR",
        message: "something failed",
        requestId: "0199c0de-1234-7000-8000-0123456789ab",
      }),
    );

    const { result } = renderHook(() => useBackendHealth(FAST));

    await waitFor(() => {
      expect(result.current.status).toBe("degraded");
    });
    expect(result.current.degradedCause).toBe("not-ok-status");
  });

  it("reports degraded / not-ok-status for a non-2xx that is not an ApiError", async () => {
    stubFetch(() =>
      Promise.resolve(
        new Response("<html>502 Bad Gateway</html>", { status: 502 }),
      ),
    );

    const { result } = renderHook(() => useBackendHealth(FAST));

    await waitFor(() => {
      expect(result.current.status).toBe("degraded");
    });
    expect(result.current.degradedCause).toBe("not-ok-status");
  });

  // `TypeError: Failed to fetch` — a refused connection, a name that did not
  // resolve, or the browser-side CORS rejection, which names none of them.
  it("reports unreachable when nothing answers", async () => {
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));

    const { result } = renderHook(() => useBackendHealth(FAST));

    await waitFor(() => {
      expect(result.current.hasChecked).toBe(true);
    });
    expect(result.current.status).toBe("unreachable");
    expect(result.current.degradedCause).toBeNull();
  });

  // The half of `unreachable` that is easy to mis-map. A deadline that expires
  // is not `degraded`: nothing arrived, and `degraded` is a judgement about an
  // answer that did.
  it("reports unreachable — not degraded — when the deadline expires", async () => {
    stubFetch(never);

    const { result } = renderHook(() => useBackendHealth(FAST));

    await waitFor(() => {
      expect(result.current.hasChecked).toBe(true);
    });
    expect(result.current.status).toBe("unreachable");
  });

  // Before anything has settled the status reads `unreachable`, which is true —
  // nothing has arrived — and `hasChecked` is what says the client has not
  // finished asking. No fourth state name.
  it("starts unreachable and unchecked", () => {
    stubFetch(never);

    const { result } = renderHook(() => useBackendHealth(FAST));

    expect(result.current.status).toBe("unreachable");
    expect(result.current.hasChecked).toBe(false);
    expect(result.current.lastSuccessAt).toBeNull();
  });
});

describe("the loop", () => {
  it("polls repeatedly", async () => {
    stubFetch(() => json(200, HEALTHY_BODY));

    renderHook(() => useBackendHealth(FAST));

    await waitFor(() => {
      expect(calls.length).toBeGreaterThanOrEqual(3);
    });
  });

  // The acceptance criterion most likely to be met by accident: the last
  // successful check time has to survive the failure that made it interesting.
  it("keeps the last successful check time through a failure", async () => {
    stubFetch((call) =>
      call === 0
        ? json(200, HEALTHY_BODY)
        : Promise.reject(new TypeError("Failed to fetch")),
    );

    const { result } = renderHook(() => useBackendHealth(FAST));

    await waitFor(() => {
      expect(result.current.status).toBe("healthy");
    });
    const succeededAt = result.current.lastSuccessAt;

    await waitFor(() => {
      expect(result.current.status).toBe("unreachable");
    });
    expect(result.current.lastSuccessAt).toBe(succeededAt);
    expect(result.current.lastSuccess).toEqual(HEALTHY_BODY);
  });

  // Recovery, with no reload and no remount: the same mounted hook goes back to
  // healthy on the next successful poll.
  it("returns to healthy after a failure without remounting", async () => {
    stubFetch((call) =>
      call === 0
        ? Promise.reject(new TypeError("Failed to fetch"))
        : json(200, HEALTHY_BODY),
    );

    const { result } = renderHook(() => useBackendHealth(FAST));

    await waitFor(() => {
      expect(result.current.status).toBe("unreachable");
    });
    await waitFor(() => {
      expect(result.current.status).toBe("healthy");
    });
    expect(result.current.lastSuccessAt).toBeInstanceOf(Date);
  });

  // Teardown. The request in flight is aborted through the caller's own signal,
  // which the client composes with its deadline rather than replacing — so what
  // comes back is `aborted`, and `aborted` is written nowhere because it is a
  // fact about this component's lifetime and not about the backend.
  it("aborts the in-flight request when it tears down", async () => {
    stubFetch(never);

    const { unmount } = renderHook(() => useBackendHealth(FAST));

    await waitFor(() => {
      expect(calls).toHaveLength(1);
    });
    expect(calls[0]?.signal?.aborted).toBe(false);

    unmount();

    expect(calls[0]?.signal?.aborted).toBe(true);
  });

  it("stops polling once it has torn down", async () => {
    stubFetch(() => json(200, HEALTHY_BODY));

    const { unmount } = renderHook(() => useBackendHealth(FAST));

    await waitFor(() => {
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    unmount();
    const afterUnmount = calls.length;

    await new Promise((resolve) => setTimeout(resolve, FAST.intervalMs * 3));

    expect(calls).toHaveLength(afterUnmount);
  });
});

describe("visibility", () => {
  /** jsdom reports `visible` by default and has no API to change it, so the
   * property is redefined and the event dispatched by hand — which is also all
   * a browser does. */
  function setVisibility(state: "visible" | "hidden"): void {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => state,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }

  afterEach(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  });

  it("stops polling while the tab is hidden and catches up when it returns", async () => {
    stubFetch(() => json(200, HEALTHY_BODY));

    renderHook(() => useBackendHealth(FAST));

    await waitFor(() => {
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    setVisibility("hidden");
    const whenHidden = calls.length;

    await new Promise((resolve) => setTimeout(resolve, FAST.intervalMs * 3));
    expect(calls).toHaveLength(whenHidden);

    // Becoming visible polls immediately rather than waiting out the interval:
    // the state on screen was last written before the tab was hidden and may be
    // arbitrarily old.
    setVisibility("visible");
    await waitFor(() => {
      expect(calls.length).toBeGreaterThan(whenHidden);
    });
  });
});
