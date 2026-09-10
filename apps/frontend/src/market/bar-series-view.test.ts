import type {
  ApiError,
  ApiErrorCode,
  BarSeriesPayload,
  BarSeriesResponse,
} from "@marketpulse/shared";
import { describe, expect, it, vi } from "vitest";

import type { ApiResult } from "../api-client.js";
import type { BarSeriesView } from "./bar-series-view.js";
import { toBarSeriesView, toRetryingBarSeriesView } from "./bar-series-view.js";

// Every one of the client's seven transport outcomes reaches a state here, and
// the two that are easiest to get wrong are the reason the file exists:
// **`aborted` produces no state at all**, and a **partial answer is not a
// failure**.

const REQUESTED = {
  start: "2026-09-08T13:30:00.000Z",
  end: "2026-09-08T20:00:00.000Z",
};

const LOADING: BarSeriesView = { state: "loading" };

function series(overrides: Partial<BarSeriesPayload> = {}): BarSeriesPayload {
  return {
    symbol: "NVDA",
    timeframe: "1m",
    bars: [
      {
        startsAt: "2026-09-08T13:30:00.000Z",
        open: 1,
        high: 2,
        low: 0.5,
        close: 1.5,
        volume: 100,
      },
    ],
    provenance: {
      adjustment: "raw",
      sources: [
        {
          provider: "alpaca",
          feed: "sip",
          retrievedAt: "2026-09-09T02:00:00.000Z",
          barCount: 1,
        },
      ],
    },
    coverage: { requested: REQUESTED, covered: REQUESTED },
    ...overrides,
  };
}

function ok(payload: BarSeriesPayload): ApiResult<BarSeriesResponse> {
  return {
    outcome: "ok",
    status: 200,
    requestId: "8f14e45f-ceea-467a-9e1b-1b9e2d0a3f11",
    data: { series: payload, securityStatus: "active" },
  };
}

function apiErrorResult(
  code: ApiErrorCode,
  message: string,
): ApiResult<BarSeriesResponse> {
  const error: ApiError = {
    code,
    message,
    requestId: "8f14e45f-ceea-467a-9e1b-1b9e2d0a3f11",
  };
  return {
    outcome: "api-error",
    status: 400,
    requestId: error.requestId,
    error,
  };
}

describe("toBarSeriesView — the answers", () => {
  it("is loaded when the covered window is exactly the one asked for", () => {
    const view = toBarSeriesView(LOADING, ok(series()));

    expect(view.state).toBe("loaded");
    if (view.state !== "loaded") return;
    expect(view.series.bars).toHaveLength(1);
    expect(view.securityStatus).toBe("active");
  });

  it("is partial — not failed — when we hold less than was asked for", () => {
    // The state a static list could not teach. A 200, an answer, and the normal
    // case for a window reaching towards now.
    const view = toBarSeriesView(
      LOADING,
      ok(
        series({
          coverage: {
            requested: REQUESTED,
            covered: {
              start: REQUESTED.start,
              end: "2026-09-08T15:00:00.000Z",
            },
          },
        }),
      ),
    );

    expect(view.state).toBe("partial");
    if (view.state !== "partial") return;

    // Both windows, because a component needs both: "you asked for the session"
    // and "we have data through 15:00" are two sentences off one state.
    expect(view.series.coverage.requested.end.toISOString()).toBe(
      REQUESTED.end,
    );
    expect(view.series.coverage.covered.end.toISOString()).toBe(
      "2026-09-08T15:00:00.000Z",
    );
  });

  it("is empty when the answer holds nothing, and keeps what was asked for", () => {
    const view = toBarSeriesView(
      LOADING,
      ok(
        series({
          bars: [],
          provenance: {
            adjustment: "raw",
            sources: [
              {
                provider: "alpaca",
                feed: "sip",
                retrievedAt: "2026-09-09T02:00:00.000Z",
                barCount: 0,
              },
            ],
          },
          coverage: { requested: REQUESTED, covered: null },
        }),
      ),
    );

    expect(view.state).toBe("empty");
    if (view.state !== "empty") return;
    expect(view.series.coverage.requested.start.toISOString()).toBe(
      REQUESTED.start,
    );
  });
});

describe("toBarSeriesView — the refusals", () => {
  it("keeps the cap's own sentence, numbers included", () => {
    // A state that discarded the message would leave the panel saying "too much
    // data" instead of the two numbers the server actually computed.
    const message =
      "That window is 98,280 bars and one response carries at most 10,000. " +
      "Ask for a narrower window, or the same window at the 1d timeframe.";
    const view = toBarSeriesView(
      LOADING,
      apiErrorResult("BAD_REQUEST", message),
    );

    expect(view).toStrictEqual({ state: "refused", message });
  });

  it("treats an unknown security as a refusal rather than a failure", () => {
    const view = toBarSeriesView(
      LOADING,
      apiErrorResult("NOT_FOUND", "We do not track ZZZZ."),
    );

    expect(view.state).toBe("refused");
  });

  it("carries no retryable flag and no requestId on a refusal", () => {
    // Both absences are decisions. Waiting never helps, so saying "not
    // retryable" would imply it might otherwise; and a refusal is not a failure
    // the user is being told about, which is the only place an id may appear.
    const view = toBarSeriesView(
      LOADING,
      apiErrorResult("BAD_REQUEST", "That window reaches 2029-01-02."),
    );

    expect(view).not.toHaveProperty("retryable");
    expect(view).not.toHaveProperty("requestId");
  });
});

describe("toBarSeriesView — the failures", () => {
  it("says waiting may help only for the code the contract says so about", () => {
    const unavailable = toBarSeriesView(
      LOADING,
      apiErrorResult("SERVICE_UNAVAILABLE", "The market store is unavailable."),
    );
    const internal = toBarSeriesView(
      LOADING,
      apiErrorResult("INTERNAL_ERROR", "Something failed."),
    );

    expect(unavailable).toStrictEqual({
      state: "failed",
      failure: "answered-badly",
      requestId: "8f14e45f-ceea-467a-9e1b-1b9e2d0a3f11",
      retryable: true,
      retrying: false,
    });
    expect(internal).toMatchObject({ retryable: false });
  });

  it("reports a body that is not this API as answered-badly, not retryable", () => {
    const view = toBarSeriesView(LOADING, {
      outcome: "unreadable-body",
      status: 200,
      requestId: null,
    });

    expect(view).toMatchObject({
      state: "failed",
      failure: "answered-badly",
      retryable: false,
    });
  });

  it("understates rather than guesses when there is no code to read", () => {
    // `http-error` is often an ingress's own 503 and genuinely temporary, but
    // it carries no code and the fence is that we promise on the code.
    const view = toBarSeriesView(LOADING, {
      outcome: "http-error",
      status: 502,
      requestId: null,
    });

    expect(view).toMatchObject({ retryable: false });
  });

  it("is unreachable and retryable when nothing arrived", () => {
    for (const result of [
      { outcome: "timeout", timeoutMs: 5_000 },
      { outcome: "unreachable", cause: new TypeError("Failed to fetch") },
    ] as const) {
      expect(toBarSeriesView(LOADING, result)).toStrictEqual({
        state: "failed",
        failure: "unreachable",
        requestId: null,
        retryable: true,
        retrying: false,
      });
    }
  });

  it("fails on a body this API would not have sent, and says which check", () => {
    // The coherence check Task 2.10.3 relocated into this module. A body shaped
    // exactly like the contract, with bars that do not ascend: our own server
    // with a bug, which is the opposite diagnosis from `unreadable-body`'s.
    const reported = vi.spyOn(console, "error").mockImplementation(() => {
      // Silenced rather than allowed through: this test asserts *that* the
      // failure is reported, and a real console.error here would put a
      // deliberate fault in the run's output where a reader would read it as
      // one.
    });

    const view = toBarSeriesView(
      LOADING,
      ok(
        series({
          bars: [
            {
              startsAt: "2026-09-08T13:31:00.000Z",
              open: 1,
              high: 2,
              low: 0.5,
              close: 1.5,
              volume: 100,
            },
            {
              startsAt: "2026-09-08T13:30:00.000Z",
              open: 1,
              high: 2,
              low: 0.5,
              close: 1.5,
              volume: 100,
            },
          ],
          provenance: {
            adjustment: "raw",
            sources: [
              {
                provider: "alpaca",
                feed: "sip",
                retrievedAt: "2026-09-09T02:00:00.000Z",
                barCount: 2,
              },
            ],
          },
        }),
      ),
    );

    expect(view).toStrictEqual({
      state: "failed",
      failure: "answered-badly",
      requestId: "8f14e45f-ceea-467a-9e1b-1b9e2d0a3f11",
      retryable: false,
      retrying: false,
    });

    // Not swallowed: the sentence naming which check failed is the difference
    // between an hour and a minute of finding the bug.
    expect(reported).toHaveBeenCalledOnce();
    expect(String(reported.mock.calls[0]?.[1])).toMatch(/strictly ascending/);
    reported.mockRestore();
  });
});

describe("toBarSeriesView — aborted", () => {
  it("produces no state at all, from any previous state", () => {
    // A torn-down effect and a superseded request are not facts about the
    // backend, and rendering one as a failure is the defect acceptance
    // criterion 3 exists to prevent. Identity, not equality: nothing is built.
    const failed: BarSeriesView = {
      state: "failed",
      failure: "unreachable",
      requestId: null,
      retryable: true,
      retrying: true,
    };

    for (const previous of [LOADING, failed]) {
      expect(toBarSeriesView(previous, { outcome: "aborted" })).toBe(previous);
    }
  });
});

describe("toRetryingBarSeriesView", () => {
  it("marks a retryable failure as retrying without leaving the state", () => {
    const failed: BarSeriesView = {
      state: "failed",
      failure: "unreachable",
      requestId: null,
      retryable: true,
      retrying: false,
    };

    expect(toRetryingBarSeriesView(failed)).toStrictEqual({
      ...failed,
      retrying: true,
    });
  });

  it("leaves every other state exactly as it was", () => {
    const notRetryable: BarSeriesView = {
      state: "failed",
      failure: "answered-badly",
      requestId: null,
      retryable: false,
      retrying: false,
    };

    for (const previous of [LOADING, notRetryable]) {
      expect(toRetryingBarSeriesView(previous)).toBe(previous);
    }
  });
});
