import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSecurities } from "./use-securities.js";

// The hook drives the real effect against a stubbed `fetch`, which is the only
// seam it has — the deadline, the abort composition and the `ApiError` parse
// all belong to `api-client.ts` and are tested there. What is tested here is
// the collapse of the client's seven outcomes onto the four states, and the two
// properties that belong to the loop rather than to a request: it asks once,
// and a teardown writes nothing.
//
// Task 2.10.2 added a third kind of assertion here: whether a failure says
// waiting will help, and what happens when a user acts on that. The derivation
// itself is `packages/shared`' — `isRetryableApiErrorCode`, tested beside
// `API_ERROR_CODES` — and what is tested here is the mapping from an *outcome*
// onto it, which is this client's own judgement for the three outcomes that
// carry no code at all.

const NVDA = {
  symbol: "NVDA",
  name: "NVIDIA Corporation",
  exchange: "NASDAQ",
  kind: "equity",
  sector: "technology",
  industry: "Semiconductors",
  status: "active",
  cik: null,
};

const PROVENANCE = {
  profile: { source: "curated", retrievedAt: "2026-09-05T00:00:00.000Z" },
  classification: {
    source: "curated",
    retrievedAt: "2026-09-05T00:00:00.000Z",
  },
};

let requests = 0;

function stubFetch(respond: () => Promise<Response>): void {
  requests = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      requests += 1;
      return respond();
    }),
  );
}

const json = (status: number, body: unknown, headers?: HeadersInit) =>
  Promise.resolve(
    new Response(JSON.stringify(body), { status, ...(headers && { headers }) }),
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useSecurities", () => {
  it("reports a populated universe as loaded, with its provenance", async () => {
    stubFetch(() =>
      json(200, {
        securities: [NVDA],
        provenance: PROVENANCE,
        coverage: [],
        lastCloses: [],
      }),
    );

    const { result } = renderHook(() => useSecurities());

    // The first state anybody sees, before anything has settled.
    expect(result.current.view.state).toBe("loading");

    await waitFor(() => {
      expect(result.current.view.state).toBe("loaded");
    });

    if (result.current.view.state !== "loaded") expect.fail("not loaded");
    expect(result.current.view.securities).toHaveLength(1);
    expect(result.current.view.securities[0].symbol).toBe("NVDA");
    expect(result.current.view.provenance).toStrictEqual(PROVENANCE);
  });

  it("indexes the coverage the response sends, by symbol", async () => {
    // The array-to-map turn happens here rather than in the component, because
    // a linear scan per row is a quarter of a million comparisons at 518 rows.
    // What is asserted is the *absence* as much as the presence: a security
    // with no bars is missing from the map, which is the wire contract's own
    // spelling of "we hold nothing for this" carried through unchanged.
    stubFetch(() =>
      json(200, {
        securities: [NVDA],
        coverage: [
          {
            symbol: "NVDA",
            timeframe: "1m",
            start: "2025-09-08T13:30:00.000Z",
            end: "2026-09-04T20:00:00.000Z",
            barCount: 97530,
          },
        ],
        lastCloses: [],
      }),
    );

    const { result } = renderHook(() => useSecurities());

    await waitFor(() => {
      expect(result.current.view.state).toBe("loaded");
    });

    if (result.current.view.state !== "loaded") expect.fail("not loaded");
    expect(result.current.view.coverage.get("NVDA")?.barCount).toBe(97530);
    expect(result.current.view.coverage.get("SPY")).toBeUndefined();
  });

  it("indexes the closes the response sends, by symbol", async () => {
    // The same array-to-map turn for the same reason, and the same absence:
    // a security with no daily bar is missing from the map rather than present
    // with a zero, which is the wire contract's spelling carried through.
    stubFetch(() =>
      json(200, {
        securities: [NVDA],
        coverage: [],
        lastCloses: [
          {
            symbol: "NVDA",
            session: "2026-09-04",
            close: 230.36,
            previousClose: 228.45,
          },
        ],
      }),
    );

    const { result } = renderHook(() => useSecurities());

    await waitFor(() => {
      expect(result.current.view.state).toBe("loaded");
    });

    if (result.current.view.state !== "loaded") expect.fail("not loaded");
    expect(result.current.view.lastCloses.get("NVDA")?.close).toBe(230.36);
    expect(result.current.view.lastCloses.get("SPY")).toBeUndefined();
  });

  it("refuses a body whose session is an instant rather than a market date", async () => {
    // The branded field doing its job. `MarketDate` asserts that a check
    // happened, and the check is `isSecuritiesResponse`'s — so a server sending
    // the shape `coverage` uses one field along is `answered-badly` rather than
    // a value carried into `marketDateAt`'s callers with a claim nobody made.
    stubFetch(() =>
      json(200, {
        securities: [NVDA],
        coverage: [],
        lastCloses: [
          {
            symbol: "NVDA",
            session: "2026-09-04T20:00:00.000Z",
            close: 230.36,
            previousClose: 228.45,
          },
        ],
      }),
    );

    const { result } = renderHook(() => useSecurities());

    await waitFor(() => {
      expect(result.current.view.state).toBe("failed");
    });
  });

  // The state this hook exists to get right. A migrated database with no
  // universe loaded answers 200 with an empty list and no provenance, and it is
  // neither a failure nor a loaded table with nothing in it.
  it("reports an empty universe as empty rather than loaded or failed", async () => {
    stubFetch(() =>
      json(200, { securities: [], coverage: [], lastCloses: [] }),
    );

    const { result } = renderHook(() => useSecurities());

    await waitFor(() => {
      expect(result.current.view.state).toBe("empty");
    });
  });

  // The Story 2.7 case: rows that no longer share one source, so the server
  // makes no claim about the whole list. A populated response with no
  // provenance is still loaded.
  it("loads a populated universe that carries no provenance", async () => {
    stubFetch(() =>
      json(200, { securities: [NVDA], coverage: [], lastCloses: [] }),
    );

    const { result } = renderHook(() => useSecurities());

    await waitFor(() => {
      expect(result.current.view.state).toBe("loaded");
    });
    if (result.current.view.state !== "loaded") expect.fail("not loaded");
    expect(result.current.view.provenance).toBeNull();
  });

  // A 200 carrying `index.html`, which is what `VITE_API_BASE_URL` pointing at
  // the frontend's own origin produces — measured twice in Story 1.12, against
  // `vite preview` and against Azure's `navigationFallback`.
  it("reports a 200 that is not this API as answered-badly", async () => {
    stubFetch(() =>
      Promise.resolve(new Response("<!doctype html>", { status: 200 })),
    );

    const { result } = renderHook(() => useSecurities());

    await waitFor(() => {
      expect(result.current.view.state).toBe("failed");
    });
    if (result.current.view.state !== "failed") expect.fail("not failed");
    expect(result.current.view.failure).toBe("answered-badly");
  });

  // The two outcomes that collapse onto one failure, and the id that survives
  // the collapse: only one of them has a response to have carried one.
  it("keeps the correlation id off a service error a user could quote", async () => {
    stubFetch(() =>
      json(
        500,
        { code: "INTERNAL_ERROR", message: "no", requestId: "abc-123" },
        { "x-request-id": "abc-123" },
      ),
    );

    const { result } = renderHook(() => useSecurities());

    await waitFor(() => {
      expect(result.current.view.state).toBe("failed");
    });
    if (result.current.view.state !== "failed") expect.fail("not failed");
    expect(result.current.view.failure).toBe("answered-badly");
    expect(result.current.view.requestId).toBe("abc-123");
  });

  it("reports a refused connection as unreachable, with no id to quote", async () => {
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));

    const { result } = renderHook(() => useSecurities());

    await waitFor(() => {
      expect(result.current.view.state).toBe("failed");
    });
    if (result.current.view.state !== "failed") expect.fail("not failed");
    expect(result.current.view.failure).toBe("unreachable");
    expect(result.current.view.requestId).toBeNull();
  });

  // The commonest failure this page has, and the reason Task 2.10.2 exists: the
  // service is up and cannot reach its database. Read off the `code` and never
  // off the 503 — `code` is the closed union the contract puts the answer in.
  it("reports a service that cannot reach its data as retryable", async () => {
    stubFetch(() =>
      json(
        503,
        {
          code: "SERVICE_UNAVAILABLE",
          message: "The service is temporarily unavailable.",
          requestId: "abc-123",
        },
        { "x-request-id": "abc-123" },
      ),
    );

    const { result } = renderHook(() => useSecurities());

    await waitFor(() => {
      expect(result.current.view.state).toBe("failed");
    });
    if (result.current.view.state !== "failed") expect.fail("not failed");
    expect(result.current.view.retryable).toBe(true);
    expect(result.current.view.requestId).toBe("abc-123");
  });

  // The other side of the same read. A 500 says this server failed and it will
  // fail again, which is the whole distinction Task 2.9.6 added the code for.
  it("reports a server that failed as not retryable", async () => {
    stubFetch(() =>
      json(500, {
        code: "INTERNAL_ERROR",
        message: "no",
        requestId: "abc-123",
      }),
    );

    const { result } = renderHook(() => useSecurities());

    await waitFor(() => {
      expect(result.current.view.state).toBe("failed");
    });
    if (result.current.view.state !== "failed") expect.fail("not failed");
    expect(result.current.view.retryable).toBe(false);
  });

  // Nothing arrived, so there is no code to read and the judgement is this
  // client's own: a refused connection is a statement about this moment.
  it("reports a refused connection as retryable", async () => {
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));

    const { result } = renderHook(() => useSecurities());

    await waitFor(() => {
      expect(result.current.view.state).toBe("failed");
    });
    if (result.current.view.state !== "failed") expect.fail("not failed");
    expect(result.current.view.retryable).toBe(true);
  });

  // **The deliberate understatement**, and the one worth pinning because it
  // looks like a bug. A 503 from an ingress in front of a replica that is not
  // serving is genuinely temporary — but its body is not an `ApiError`, so
  // there is no code, and we do not promise on what we cannot read.
  it("declines to promise on a 503 that carries no contract", async () => {
    stubFetch(() =>
      Promise.resolve(new Response("<html>503</html>", { status: 503 })),
    );

    const { result } = renderHook(() => useSecurities());

    await waitFor(() => {
      expect(result.current.view.state).toBe("failed");
    });
    if (result.current.view.state !== "failed") expect.fail("not failed");
    expect(result.current.view.retryable).toBe(false);
  });

  // The first control in this product that re-asks a question. The recovery is
  // a real second request rather than a re-render, and it leaves the page it is
  // on alone — which is the whole difference from the document reload it
  // replaces.
  it("re-asks when a retry is requested, and recovers without a reload", async () => {
    let answered = false;
    stubFetch(() => {
      if (answered) {
        return json(200, { securities: [NVDA], coverage: [], lastCloses: [] });
      }
      answered = true;
      return json(503, {
        code: "SERVICE_UNAVAILABLE",
        message: "The service is temporarily unavailable.",
        requestId: "abc-123",
      });
    });

    const { result } = renderHook(() => useSecurities());

    await waitFor(() => {
      expect(result.current.view.state).toBe("failed");
    });

    act(() => {
      result.current.retry();
    });

    // The failure stays on screen while the answer is in flight, marked as
    // busy rather than replaced by a skeleton: the sentence is still true until
    // we know otherwise.
    if (result.current.view.state !== "failed") expect.fail("not failed");
    expect(result.current.view.retrying).toBe(true);

    await waitFor(() => {
      expect(result.current.view.state).toBe("loaded");
    });
    expect(requests).toBe(2);
  });

  // Pressing twice cannot render a stale answer. The second press supersedes
  // the first, and the superseded result is dropped rather than being allowed
  // to overwrite the newer one — which is the `aborted`-is-not-a-failure rule
  // met here on a single request, ahead of Task 2.10.5 generalising it.
  it("cannot render a superseded answer when a retry is pressed twice", async () => {
    // Three answers, arranged so that a superseded one landing is *visible*:
    // the second request is slow and says the universe is populated, the third
    // is immediate and says it is empty. If the loser's answer is allowed to
    // land, this ends up "loaded" 40 ms after it ended up "empty".
    let call = 0;
    stubFetch(() => {
      call += 1;
      const populated = call !== 3;
      const delay = call === 2 ? 40 : 0;

      return new Promise<Response>((resolve) => {
        setTimeout(() => {
          resolve(
            new Response(
              JSON.stringify({
                securities: populated ? [NVDA] : [],
                coverage: [],
                lastCloses: [],
              }),
              { status: 200 },
            ),
          );
        }, delay);
      });
    });

    const { result } = renderHook(() => useSecurities());

    await waitFor(() => {
      expect(result.current.view.state).toBe("loaded");
    });

    act(() => {
      result.current.retry();
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.view.state).toBe("empty");
    });

    // And it stays there: the slow, superseded answer arrives afterwards and is
    // dropped. **Verified by removing the identity guard in the hook and
    // watching this go red** — an abort alone does not do it, because a stubbed
    // `fetch` that ignores the signal is exactly the shape of a real response
    // that had already resolved when the abort landed.
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(result.current.view.state).toBe("empty");
    expect(requests).toBe(3);
  });

  // The contrast with `useBackendHealth` that is the whole reason this is a
  // different hook: the universe changes a handful of times a year, so it is
  // read once and never polled. A regression here is standing billable traffic
  // per open tab against a fact that has not moved.
  it("asks once and does not poll", async () => {
    stubFetch(() =>
      json(200, {
        securities: [NVDA],
        provenance: PROVENANCE,
        coverage: [],
        lastCloses: [],
      }),
    );

    const { result } = renderHook(() => useSecurities());

    await waitFor(() => {
      expect(result.current.view.state).toBe("loaded");
    });

    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(requests).toBe(1);
  });
});
