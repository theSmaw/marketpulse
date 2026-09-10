import { REQUEST_ID_HEADER } from "@marketpulse/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  API_TIMEOUT_MS,
  apiRequest,
  getBarSeries,
  getHealth,
} from "./api-client.js";
import { BAR_SERIES_FIXTURES } from "./fixtures/bar-series.js";

// The client's tests are the ones Task 1.11.5's `health-probe.test.ts` used to
// carry, re-homed rather than deleted: the correlation id, the base URL and the
// fact that an unreachable backend is a *result* rather than a thrown error all
// moved here with the `fetch` call they were about.
//
// What is new is the part the probe never had — the four ways a request can
// fail told apart from each other, which is what Task 1.12.3 derives its three
// states from.

const HEALTHY_BODY = { status: "ok", version: "0.0.0", uptimeSeconds: 1.5 };

function respondWith(init: {
  status: number;
  body: unknown;
  requestId?: string;
  /** Send a body that is not JSON at all — a proxy's HTML error page. */
  raw?: string;
}): void {
  const headers = new Headers();

  if (init.requestId !== undefined) {
    headers.set(REQUEST_ID_HEADER, init.requestId);
  }

  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolve(
            new Response(init.raw ?? JSON.stringify(init.body), {
              status: init.status,
              headers,
            }),
          );
        }),
    ),
  );
}

/** A `fetch` that never settles until the signal it was handed aborts. */
function respondNever(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise<Response>((_resolve, reject) => {
          // The rejection value is deliberately a plain `Error` rather than
          // the signal's own `DOMException` reason: the client reads which
          // signal fired off the *signals*, not off what `fetch` threw, and
          // this test would be asserting the wrong mechanism if it supplied a
          // reason for it to read.
          init?.signal?.addEventListener("abort", () => {
            reject(new Error("aborted"));
          });
        }),
    ),
  );
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("getHealth", () => {
  it("reports the parsed body and the correlation id from a healthy response", async () => {
    respondWith({
      status: 200,
      body: HEALTHY_BODY,
      requestId: "0199c0de-1234-7000-8000-0123456789ab",
    });

    const result = await getHealth();

    expect(result).toStrictEqual({
      outcome: "ok",
      status: 200,
      requestId: "0199c0de-1234-7000-8000-0123456789ab",
      data: HEALTHY_BODY,
    });
  });

  it("requests /health against the resolved base URL", async () => {
    respondWith({ status: 200, body: HEALTHY_BODY });

    await getHealth();

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "http://localhost:3000/health",
      expect.objectContaining({ headers: { accept: "application/json" } }),
    );
  });

  // A `null` id from a deployed page means the server stopped *exposing* the
  // header, not that it stopped sending it — the CORS safelist is short and
  // this header is not on it. That is a distinct diagnosis, so it must not
  // throw and must not be confused with an absent response.
  it("reports a null correlation id rather than throwing when the header is not exposed", async () => {
    respondWith({ status: 200, body: HEALTHY_BODY });

    await expect(getHealth()).resolves.toMatchObject({
      outcome: "ok",
      requestId: null,
    });
  });

  // `isHealthResponse` accepts a status it has not been taught and accepts
  // unknown extra fields, because a newer server is a version skew rather than
  // a broken one. Asserted here because this client is the thing that would
  // otherwise quietly re-decide it.
  it("accepts an unrecognised status and unknown extra fields", async () => {
    respondWith({
      status: 200,
      body: { ...HEALTHY_BODY, status: "degraded", feed: "live" },
    });

    const result = await getHealth();

    expect(result.outcome).toBe("ok");
  });

  // The `degraded`/`unreadable-body` cause from Task 1.12.1, produced by the
  // case this repository has measured twice: a static host answering
  // `index.html` at a 200.
  it("reports a 200 that is not a health report as unreadable-body", async () => {
    respondWith({
      status: 200,
      body: null,
      raw: "<!doctype html><html></html>",
    });

    await expect(getHealth()).resolves.toMatchObject({
      outcome: "unreadable-body",
      status: 200,
    });
  });

  it.each([
    ["a missing field", { status: "ok", version: "0.0.0" }],
    ["a field of the wrong type", { ...HEALTHY_BODY, uptimeSeconds: "1.5" }],
  ])("reports %s as unreadable-body", async (_name, body) => {
    respondWith({ status: 200, body });

    await expect(getHealth()).resolves.toMatchObject({
      outcome: "unreadable-body",
    });
  });
});

describe("apiRequest failure classification", () => {
  it("parses a contracted error body as api-error, keeping the requestId a user could quote", async () => {
    respondWith({
      status: 404,
      body: {
        code: "NOT_FOUND",
        message: "Not found",
        requestId: "0199c0de-1234-7000-8000-0123456789ab",
      },
      requestId: "0199c0de-1234-7000-8000-0123456789ab",
    });

    const result = await apiRequest("/nope", isRecord);

    expect(result).toStrictEqual({
      outcome: "api-error",
      status: 404,
      requestId: "0199c0de-1234-7000-8000-0123456789ab",
      error: {
        code: "NOT_FOUND",
        message: "Not found",
        requestId: "0199c0de-1234-7000-8000-0123456789ab",
      },
    });
  });

  // A proxy or an ingress answering its own 502 while the replica behind it is
  // not serving. It is a *different* result from `api-error` because there is
  // no `requestId` in it for anyone to quote.
  it("reports a non-2xx whose body is not an ApiError as http-error", async () => {
    respondWith({
      status: 502,
      body: null,
      raw: "<html>502 Bad Gateway</html>",
    });

    await expect(apiRequest("/health", isRecord)).resolves.toStrictEqual({
      outcome: "http-error",
      status: 502,
      requestId: null,
    });
  });

  // The branch a browser produces for a cross-origin rejection, and the one
  // whose whole diagnostic difficulty is that the server logs a healthy 200.
  it("reports a transport failure as unreachable and never rejects", async () => {
    const cause = new TypeError("Failed to fetch");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(cause)),
    );

    await expect(apiRequest("/health", isRecord)).resolves.toStrictEqual({
      outcome: "unreachable",
      cause,
    });
  });

  // Without a deadline this request reaches *no* state at all rather than the
  // wrong one: a socket that accepts and never answers hangs `fetch` forever
  // (Task 1.8.4). A timeout is `unreachable` in Task 1.12.1's vocabulary rather
  // than `degraded`, because nothing arrived — but the client reports it
  // separately so the caller can say which of the two happened.
  it("reports an expired deadline as timeout, distinct from unreachable", async () => {
    respondNever();

    const result = await apiRequest("/health", isRecord, { timeoutMs: 10 });

    expect(result).toStrictEqual({ outcome: "timeout", timeoutMs: 10 });
  });

  // The default is asserted as a value rather than by waiting for it: a real
  // five-second deadline would make this the slowest test in the repository,
  // and the behaviour it produces is covered by the case above. What is
  // asserted here instead is that a request with no options is still given a
  // signal at all, which is the half that would silently disappear.
  it("gives every request a signal, and defaults the deadline to API_TIMEOUT_MS", async () => {
    respondWith({ status: 200, body: HEALTHY_BODY });

    await apiRequest("/health", isRecord);

    const init = vi.mocked(fetch).mock.calls[0]?.[1];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(API_TIMEOUT_MS).toBe(5_000);
  });

  // A caller's abort is not a fact about the backend at all — it is a torn-down
  // effect, and Task 1.12.3 must not render one as a state.
  it("reports a caller's abort as aborted rather than as unreachable", async () => {
    respondNever();
    const controller = new AbortController();

    const pending = apiRequest("/health", isRecord, {
      signal: controller.signal,
    });
    controller.abort();

    await expect(pending).resolves.toStrictEqual({ outcome: "aborted" });
  });

  // Both signals have to work: composing them is what stops a caller's signal
  // replacing the deadline it was meant to sit beside.
  it("still times out when the caller supplied a signal that never fires", async () => {
    respondNever();
    const controller = new AbortController();

    await expect(
      apiRequest("/health", isRecord, {
        signal: controller.signal,
        timeoutMs: 10,
      }),
    ).resolves.toMatchObject({ outcome: "timeout" });
  });
});

// The fourth request shape, and the first with parameters. What these tests are
// about is the three things that could only go wrong here: the URL is assembled
// by `barSeriesQuery` and not by hand, the two answers that look like failures
// survive the guard, and the two refusals the contract promises arrive as
// `api-error` with a code a caller can branch on rather than being flattened
// into "something went wrong".

// **The bodies are recorded rather than written** (Task 2.10.6). Every one of
// these came off the real endpoint over the real store, so no closed vocabulary
// in them can be wrong — which is the exact defect an inline fixture in this
// file would be free to have, and which `unreadable-body` would then report as
// a stranger at the address. `fixtures/bar-series.ts` says how each was
// recorded and holds each one to its label as it loads.
const SERIES_BODY = BAR_SERIES_FIXTURES.full.body;

const FIVE_SESSIONS = {
  symbol: "NVDA",
  timeframe: "1m",
  window: { form: "named", sessions: 5 },
} as const;

describe("getBarSeries", () => {
  it("requests /market-data/bars with the query the builder produced", async () => {
    respondWith({ status: 200, body: SERIES_BODY });

    await getBarSeries(FIVE_SESSIONS);

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "http://localhost:3000/market-data/bars?symbol=NVDA&timeframe=1m&sessions=5",
      expect.objectContaining({ headers: { accept: "application/json" } }),
    );
  });

  it("sends the named window rather than a resolved one, whatever the browser's clock says", async () => {
    // The defect this whole arrangement exists to prevent: a client in
    // Singapore resolving "the last 5 sessions" against its own date is off by
    // one session for several hours of every day, and the chart it produces is
    // plausible and shifted rather than an error anybody sees. Asserted as an
    // **absence** — no instant in the URL — because that is what the property
    // is.
    respondWith({ status: 200, body: SERIES_BODY });

    await getBarSeries(FIVE_SESSIONS);

    // `fetch`'s first argument is typed `RequestInfo | URL`, and this client
    // always passes a string; the narrowing is what keeps the assertion off
    // `[object Object]` if that ever stops being true.
    const [url] = vi.mocked(fetch).mock.calls[0] ?? [];

    expect(typeof url === "string" ? url : "").not.toMatch(/start=|end=/);
  });

  it("reports the parsed series and the correlation id", async () => {
    respondWith({
      status: 200,
      body: SERIES_BODY,
      requestId: "0199c0de-1234-7000-8000-0123456789ab",
    });

    await expect(getBarSeries(FIVE_SESSIONS)).resolves.toMatchObject({
      outcome: "ok",
      status: 200,
      requestId: "0199c0de-1234-7000-8000-0123456789ab",
      data: { series: { symbol: "NVDA" } },
    });
  });

  it("reports an empty series as ok, because it is an answer rather than a failure", async () => {
    // `bars: []` with a null `covered` is a 200 (MARKET-DATA-API.md §6). If
    // this ever reads `unreadable-body`, the guard has turned this contract's
    // own empty answer into "something else is answering at this address".
    respondWith({
      status: 200,
      body: BAR_SERIES_FIXTURES.empty.body,
    });

    await expect(getBarSeries(FIVE_SESSIONS)).resolves.toMatchObject({
      outcome: "ok",
    });
  });

  it("reports the 10,000-bar cap as an api-error whose code and number both survive", async () => {
    // The cap is refused rather than reduced, because a chart drawn from fewer
    // bars than were asked for is wrong and looks right. This client neither
    // renders that nor swallows it: the code is what Task 2.10.4 branches on
    // and the message carries the number a person needs.
    respondWith({
      status: 400,
      body: BAR_SERIES_FIXTURES.refusedCap.body,
      requestId: "0199c0de-1234-7000-8000-0123456789ab",
    });

    const result = await getBarSeries({
      symbol: "NVDA",
      timeframe: "1m",
      window: {
        form: "absolute",
        start: "2025-09-04T13:30:00.000Z",
        end: "2026-09-04T20:00:00.000Z",
      },
    });

    expect(result).toMatchObject({
      outcome: "api-error",
      status: 400,
      error: { code: "BAD_REQUEST" },
    });
    expect(
      result.outcome === "api-error" ? result.error.message : "",
    ).toContain("10,000");
  });

  it("reports a window outside the trading calendar as an api-error with a readable code", async () => {
    // Not a malformed request — a well-formed one this system cannot express,
    // because the calendar is a checked-in table covering 2024-2028 and refuses
    // rather than guessing which days outside it were holidays. Returning fewer
    // sessions than were asked for would be a wrong answer wearing the shape of
    // a right one.
    respondWith({
      status: 400,
      body: BAR_SERIES_FIXTURES.refusedCalendar.body,
    });

    await expect(
      getBarSeries({
        symbol: "NVDA",
        timeframe: "1d",
        window: {
          form: "absolute",
          start: "2016-01-04T14:30:00.000Z",
          end: "2016-01-05T21:00:00.000Z",
        },
      }),
    ).resolves.toMatchObject({
      outcome: "api-error",
      status: 400,
      error: { code: "BAD_REQUEST" },
    });
  });

  it("reports a body that is not this contract as unreadable-body", async () => {
    // A feed slug this bundle has no words for. It must not reach a component
    // that would print it — invariant 6 arriving through the one door left
    // open.
    respondWith({
      status: 200,
      body: BAR_SERIES_FIXTURES.unknownFeed.body,
    });

    await expect(getBarSeries(FIVE_SESSIONS)).resolves.toMatchObject({
      outcome: "unreadable-body",
      status: 200,
    });
  });

  it("reports a caller's abort as aborted rather than as a failure", async () => {
    // Acceptance criterion 3 at the transport layer: a superseded request is
    // not a fact about the backend, and Task 2.10.5 must not render one as a
    // state.
    respondNever();

    const controller = new AbortController();
    const pending = getBarSeries(FIVE_SESSIONS, { signal: controller.signal });

    controller.abort();

    await expect(pending).resolves.toStrictEqual({ outcome: "aborted" });
  });
});
