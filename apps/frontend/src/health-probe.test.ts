import { REQUEST_ID_HEADER } from "@marketpulse/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

import { probeBackendHealth } from "./health-probe.js";

// The probe is deliberately not a client, so these tests are deliberately not a
// client's tests. What they pin is the three outcomes and the two things this
// task exists to prove reach the browser at all: the correlation id, and the
// fact that an unreachable backend is a *result* rather than a thrown error.

function respondWith(init: {
  status: number;
  body: unknown;
  requestId?: string;
}): void {
  const headers = new Headers();

  if (init.requestId !== undefined) {
    headers.set(REQUEST_ID_HEADER, init.requestId);
  }

  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(init.body), {
          status: init.status,
          headers,
        }),
      ),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("probeBackendHealth", () => {
  it("reports the body and the correlation id from a healthy response", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    respondWith({
      status: 200,
      body: { status: "ok", version: "0.0.0", uptimeSeconds: 1.5 },
      requestId: "0199c0de-1234-7000-8000-0123456789ab",
    });

    const result = await probeBackendHealth();

    expect(result).toStrictEqual({
      outcome: "ok",
      status: 200,
      requestId: "0199c0de-1234-7000-8000-0123456789ab",
      body: { status: "ok", version: "0.0.0", uptimeSeconds: 1.5 },
    });
  });

  // The body is asserted as an opaque object on purpose. Typing it means
  // promoting `HealthResponse` out of the backend, which is Story 1.12's payoff
  // and not this task's.
  it("requests /health against the resolved base URL", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    respondWith({ status: 200, body: {}, requestId: "abc" });

    await probeBackendHealth();

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "http://localhost:3000/health",
      expect.objectContaining({ headers: { accept: "application/json" } }),
    );
  });

  // A `null` id from a deployed page means the server stopped *exposing* the
  // header, not that it stopped sending it — the CORS safelist is short and
  // this header is not on it.
  it("reports a null correlation id rather than throwing when the header is not exposed", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    respondWith({ status: 200, body: {} });

    const result = await probeBackendHealth();

    expect(result).toMatchObject({ outcome: "ok", requestId: null });
  });

  it("reports an HTTP failure as a result, with the ApiError body intact", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    respondWith({
      status: 404,
      body: { code: "NOT_FOUND", message: "Not found", requestId: "id-1" },
      requestId: "id-1",
    });

    const result = await probeBackendHealth();

    expect(result).toMatchObject({
      outcome: "http-error",
      status: 404,
      requestId: "id-1",
    });
    expect(error).toHaveBeenCalled();
  });

  // The branch that matters most, and the one a browser produces for a
  // cross-origin rejection. It must not reject: `main.tsx` fires this without
  // awaiting it, and an unreachable backend must not be able to take the mount
  // down.
  it("reports an unreachable backend as a result and never rejects", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    );

    const result = await probeBackendHealth();

    expect(result).toMatchObject({ outcome: "unreachable" });
    expect(error).toHaveBeenCalled();
  });

  // The console line for that branch is the whole diagnostic value of this
  // module: a bare `Failed to fetch` names neither CORS nor the origin, and
  // sends a developer to look at a server that is logging a healthy 200.
  it("names the cross-origin check in the unreachable message", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    );

    await probeBackendHealth();

    expect(error.mock.calls[0]?.join(" ")).toContain("cross-origin");
  });
});
