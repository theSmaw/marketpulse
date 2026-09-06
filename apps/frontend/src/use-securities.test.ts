import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSecurities } from "./use-securities.js";

// The hook drives the real effect against a stubbed `fetch`, which is the only
// seam it has — the deadline, the abort composition and the `ApiError` parse
// all belong to `api-client.ts` and are tested there. What is tested here is
// the collapse of the client's seven outcomes onto the four states, and the two
// properties that belong to the loop rather than to a request: it asks once,
// and a teardown writes nothing.

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
    stubFetch(() => json(200, { securities: [NVDA], provenance: PROVENANCE }));

    const { result } = renderHook(() => useSecurities());

    // The first state anybody sees, before anything has settled.
    expect(result.current.state).toBe("loading");

    await waitFor(() => {
      expect(result.current.state).toBe("loaded");
    });

    if (result.current.state !== "loaded") expect.fail("not loaded");
    expect(result.current.securities).toHaveLength(1);
    expect(result.current.securities[0].symbol).toBe("NVDA");
    expect(result.current.provenance).toStrictEqual(PROVENANCE);
  });

  // The state this hook exists to get right. A migrated database with no
  // universe loaded answers 200 with an empty list and no provenance, and it is
  // neither a failure nor a loaded table with nothing in it.
  it("reports an empty universe as empty rather than loaded or failed", async () => {
    stubFetch(() => json(200, { securities: [] }));

    const { result } = renderHook(() => useSecurities());

    await waitFor(() => {
      expect(result.current.state).toBe("empty");
    });
  });

  // The Story 2.7 case: rows that no longer share one source, so the server
  // makes no claim about the whole list. A populated response with no
  // provenance is still loaded.
  it("loads a populated universe that carries no provenance", async () => {
    stubFetch(() => json(200, { securities: [NVDA] }));

    const { result } = renderHook(() => useSecurities());

    await waitFor(() => {
      expect(result.current.state).toBe("loaded");
    });
    if (result.current.state !== "loaded") expect.fail("not loaded");
    expect(result.current.provenance).toBeNull();
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
      expect(result.current.state).toBe("failed");
    });
    if (result.current.state !== "failed") expect.fail("not failed");
    expect(result.current.failure).toBe("answered-badly");
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
      expect(result.current.state).toBe("failed");
    });
    if (result.current.state !== "failed") expect.fail("not failed");
    expect(result.current.failure).toBe("answered-badly");
    expect(result.current.requestId).toBe("abc-123");
  });

  it("reports a refused connection as unreachable, with no id to quote", async () => {
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));

    const { result } = renderHook(() => useSecurities());

    await waitFor(() => {
      expect(result.current.state).toBe("failed");
    });
    if (result.current.state !== "failed") expect.fail("not failed");
    expect(result.current.failure).toBe("unreachable");
    expect(result.current.requestId).toBeNull();
  });

  // The contrast with `useBackendHealth` that is the whole reason this is a
  // different hook: the universe changes a handful of times a year, so it is
  // read once and never polled. A regression here is standing billable traffic
  // per open tab against a fact that has not moved.
  it("asks once and does not poll", async () => {
    stubFetch(() => json(200, { securities: [NVDA], provenance: PROVENANCE }));

    const { result } = renderHook(() => useSecurities());

    await waitFor(() => {
      expect(result.current.state).toBe("loaded");
    });

    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(requests).toBe(1);
  });
});
