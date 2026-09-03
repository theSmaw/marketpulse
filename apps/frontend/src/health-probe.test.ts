import { afterEach, describe, expect, it, vi } from "vitest";

import { probeBackendHealth } from "./health-probe.js";

// The probe is a console line over the client, so what is left to test here is
// the console line. Everything about the request itself — the base URL, the
// deadline, the correlation id, the four ways it can fail — moved to
// `api-client.test.ts` with the `fetch` call it was about.

function respondWith(status: number, body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(body), { status })),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("probeBackendHealth", () => {
  it("reports a healthy response at info", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    respondWith(200, { status: "ok", version: "0.0.0", uptimeSeconds: 1.5 });

    await probeBackendHealth();

    expect(info.mock.calls[0]?.join(" ")).toContain("answered 200");
  });

  // The branch that matters most, and the one a browser produces for a
  // cross-origin rejection. It must not reject: `main.tsx` fires this without
  // awaiting it, so an unreachable backend must not take the mount down.
  it("reports an unreachable backend without rejecting", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    );

    await expect(probeBackendHealth()).resolves.toBeUndefined();
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

  // A 200 that is not a health report is a different diagnosis from an
  // unreachable one, and the message has to say which.
  it("says something else is serving the address when the body is not a health report", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    respondWith(200, { not: "health" });

    await probeBackendHealth();

    expect(error.mock.calls[0]?.join(" ")).toContain("not this API");
  });
});
