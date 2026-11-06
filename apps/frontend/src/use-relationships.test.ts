// The measured-relationships collapse (Task 6.5.2).
//
// `toRelationshipsView` is a pure `(state, result) => state` — a reducer that
// has not been told it is one, which is `FRONTEND-STATE.md` §1's own shape and
// is what makes a later move to a store a re-wiring. So the four states are
// driven here from the client's seven outcomes, with no hook, no effect and no
// network.
//
// What is **not** here is the hook's own effect: `use-market-feed.test.ts`
// records the same division, and the reason is that a `useEffect` with an
// `AbortController` is the one part of this module a unit test can only
// re-describe.

import { describe, expect, it } from "vitest";

import type { RelationshipsPassPayload } from "@marketpulse/shared";

import type { ApiResult } from "./api-client.js";
import { toRelationshipsView } from "./use-relationships.js";
import type { RelationshipsView } from "./use-relationships.js";

const LOADING: RelationshipsView = { state: "loading" };

/** Task 6.5.1's own recorded run, quoted rather than invented. */
const PASS: RelationshipsPassPayload = {
  observedAt: "2026-09-11T20:00:00.000Z",
  trackedEquities: 501,
  eligibleEquities: 496,
  splitDiscontinuity: 5,
  absent: 0,
  candidatePairs: 122_760,
  computedPairs: 122_760,
  retainedPairs: 1860,
  tooFewOverlappingSamples: 0,
  zeroVariance: 0,
  belowSignificance: 20_752,
  retainedN: 5,
  lookbackSessions: 60,
  spanMinutes: 5,
  feed: "sip",
};

const ok = (
  correlations: readonly { low: string; high: string; r: number; n: number }[],
  pass?: RelationshipsPassPayload,
): ApiResult<{
  correlations: readonly { low: string; high: string; r: number; n: number }[];
  pass?: RelationshipsPassPayload;
}> => ({
  outcome: "ok",
  status: 200,
  requestId: null,
  data: pass === undefined ? { correlations } : { correlations, pass },
});

describe("toRelationshipsView", () => {
  it("reads an absent pass as never measured, which is CI for ever", () => {
    expect(toRelationshipsView(LOADING, ok([]))).toEqual({
      state: "never-measured",
    });
  });

  // The distinction the wire's shape exists for: a pass that considered
  // 122,760 pairs and kept none is a different fact from never having
  // measured, with a different sentence on screen.
  it("reads a present pass with no rows as measured, not as never measured", () => {
    expect(
      toRelationshipsView(LOADING, ok([], { ...PASS, retainedPairs: 0 })),
    ).toEqual({
      state: "measured",
      correlations: [],
      pass: { ...PASS, retainedPairs: 0 },
    });
  });

  it("carries the rows and the whole pass row through", () => {
    const view = toRelationshipsView(
      LOADING,
      ok([{ low: "AAPL", high: "MSFT", r: -0.84, n: 4620 }], PASS),
    );

    expect(view).toEqual({
      state: "measured",
      // **The sign survives** — `n` does not travel, because the graph model
      // takes `low`/`high`/`r` and a field nothing reads is a field that gets
      // drawn by accident.
      correlations: [{ low: "AAPL", high: "MSFT", r: -0.84 }],
      pass: PASS,
    });
  });

  // `isTicker` rather than `toTicker`: this runs inside an effect's settle,
  // and a throw there is a render error nothing above `App` catches — the
  // whole page goes blank. A single dropped edge is the honest degrade.
  it("drops a row this bundle cannot read as a ticker rather than throwing", () => {
    const view = toRelationshipsView(
      LOADING,
      ok(
        [
          { low: "AAPL", high: "not a ticker", r: 0.5, n: 10 },
          { low: "AAPL", high: "MSFT", r: 0.5, n: 10 },
        ],
        PASS,
      ),
    );

    expect(view.state === "measured" && view.correlations).toEqual([
      { low: "AAPL", high: "MSFT", r: 0.5 },
    ]);
  });

  it("collapses every non-answer onto one failed state", () => {
    const outcomes: ApiResult<never>[] = [
      { outcome: "unreadable-body", status: 200, requestId: null },
      {
        outcome: "api-error",
        status: 503,
        requestId: "x",
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "no",
          requestId: "x",
        },
      },
      { outcome: "http-error", status: 502, requestId: null },
      { outcome: "timeout", timeoutMs: 5000 },
      { outcome: "unreachable", cause: new Error("no") },
    ];

    for (const outcome of outcomes) {
      expect(toRelationshipsView(LOADING, outcome)).toEqual({
        state: "failed",
      });
    }
  });

  // A torn-down effect is not a fact about the service — under `StrictMode`
  // the development double-invoke produces one on every mount.
  it("leaves the previous state alone when the caller aborted", () => {
    const measured = toRelationshipsView(LOADING, ok([], PASS));

    expect(toRelationshipsView(measured, { outcome: "aborted" })).toBe(
      measured,
    );
  });
});
