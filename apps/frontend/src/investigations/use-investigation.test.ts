import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubFetch } from "../fixtures/stub-fetch.js";
import { INVESTIGATION_STEP_COUNT } from "./investigation-checklist-state.js";
import {
  CONNECTION_LOST_SENTENCE,
  useInvestigation,
} from "./use-investigation.js";

// The hook drives the real transport against a stubbed `fetch` — the POST
// and the SSE stream both — because the property under test is the
// COLLAPSE of real network timing onto client-optimistic paint, the
// second-press guard, the 160 ms cover threshold and subject-pinning. Every
// one of those is a property of the LOOP, not of `investigation-stream.ts`
// or `investigation-checklist-state.ts` in isolation, which already have
// their own files.

afterEach(() => {
  vi.unstubAllGlobals();
});

const STARTED = {
  id: "inv-1",
  status: "running",
  subjectSymbols: ["NVDA"],
};

function jsonResponse(status: number, body: unknown): Promise<Response> {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

/** An SSE body this test can feed events into on demand, so a test can
 * control exactly how much real time elapses between them — the only way
 * to exercise the 160 ms cover threshold honestly, since it is a real
 * `setTimeout` inside the hook. */
function controllableSseStream(): {
  readonly response: Response;
  readonly push: (event: Record<string, unknown>) => void;
  readonly end: () => void;
} {
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  const encoder = new TextEncoder();

  return {
    response: new Response(stream, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    }),
    push(event) {
      const frame = `id: ${String(event.seq)}\nevent: ${String(event.type)}\ndata: ${JSON.stringify(event)}\n\n`;
      controller?.enqueue(encoder.encode(frame));
    },
    end() {
      controller?.close();
    },
  };
}

const INVESTIGATION_STARTED = {
  type: "INVESTIGATION_STARTED",
  seq: 1,
  investigationId: "inv-1",
  investigation: {
    id: "inv-1",
    title: "Investigate NVDA",
    subjectSymbols: ["NVDA"],
  },
};

const STEP_STARTED = {
  type: "STEP_STARTED",
  seq: 2,
  investigationId: "inv-1",
  stepId: "step-1",
  description: "Measure move",
  tool: "get_security_snapshot",
  startedAt: "2026-11-16T14:00:00.000Z",
};

const stepCompleted = (durationMs: number) => ({
  type: "STEP_COMPLETED",
  seq: 3,
  investigationId: "inv-1",
  stepId: "step-1",
  status: "completed",
  durationMs,
});

const INVESTIGATION_COMPLETED = {
  type: "INVESTIGATION_COMPLETED",
  seq: 4,
  investigationId: "inv-1",
  status: "completed",
  completedAt: "2026-11-16T14:00:00.012Z",
  stepCount: 1,
};

describe("useInvestigation", () => {
  it("paints every queued row in the SAME commit as start(), before any fetch resolves", () => {
    stubFetch(() => new Promise(() => undefined)); // never resolves in this test

    const { result } = renderHook(() => useInvestigation("NVDA"));
    expect(result.current.checklist).toBeUndefined();

    act(() => {
      result.current.start();
    });

    // Done-when 3: client-optimistic, measured — no `await` happened above.
    // **All six rows, not one** (Task 7.2.7): the pipeline's length is a
    // fixed, known list, so the checklist's height is settled in this same
    // commit rather than six commits later.
    expect(result.current.checklist?.steps).toHaveLength(
      INVESTIGATION_STEP_COUNT,
    );
    for (const step of result.current.checklist?.steps ?? []) {
      expect(step).toMatchObject({ id: undefined, status: "queued" });
    }
  });

  it("reaches completed with the real duration, for a run under the 160ms threshold", async () => {
    const stream = controllableSseStream();
    stubFetch((call) => {
      if (call.url.endsWith("/investigations"))
        return jsonResponse(201, STARTED);
      return Promise.resolve(stream.response);
    });

    const { result } = renderHook(() => useInvestigation("NVDA"));
    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.checklist?.investigationId).toBe("inv-1");
    });

    act(() => {
      stream.push(INVESTIGATION_STARTED);
      stream.push(STEP_STARTED);
      stream.push(stepCompleted(5));
      stream.push(INVESTIGATION_COMPLETED);
      stream.end();
    });

    await waitFor(() => {
      expect(result.current.checklist?.terminal).toBe(true);
    });

    expect(result.current.checklist?.steps[0]).toMatchObject({
      status: "completed",
      durationMs: 5,
    });
    // Under the threshold throughout: the "started" announcement never
    // fires, so the live region speaks exactly once — Done-when 6's first
    // half.
    expect(result.current.pastCoverThreshold).toBe(false);
    expect(result.current.announcement).toBe("Measure move complete, 5 ms");
  });

  it("announces the step the run is AT, not the first row — a two-step run", async () => {
    // Task 7.2.7: with six seeded rows, `steps[0]` is the row that finished
    // FIRST, so a live region keyed on it would report a step that ended
    // four steps ago as the run's own outcome.
    const stream = controllableSseStream();
    stubFetch((call) => {
      if (call.url.endsWith("/investigations"))
        return jsonResponse(201, STARTED);
      return Promise.resolve(stream.response);
    });

    const { result } = renderHook(() => useInvestigation("NVDA"));
    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.checklist?.investigationId).toBe("inv-1");
    });

    act(() => {
      stream.push(INVESTIGATION_STARTED);
      stream.push(STEP_STARTED);
      stream.push(stepCompleted(5));
      stream.push({
        type: "STEP_STARTED",
        seq: 4,
        investigationId: "inv-1",
        stepId: "step-2",
        description: "Measure price anomaly",
        tool: "calculate_return_percentile",
        startedAt: "2026-11-16T14:00:00.005Z",
      });
      stream.push({
        type: "STEP_COMPLETED",
        seq: 5,
        investigationId: "inv-1",
        stepId: "step-2",
        status: "completed",
        durationMs: 7,
      });
      stream.push(INVESTIGATION_COMPLETED);
      stream.end();
    });

    await waitFor(() => {
      expect(result.current.checklist?.terminal).toBe(true);
    });

    expect(result.current.checklist?.steps[0]).toMatchObject({
      description: "Measure move",
      durationMs: 5,
    });
    expect(result.current.checklist?.steps[1]).toMatchObject({
      description: "Measure price anomaly",
      durationMs: 7,
    });
    expect(result.current.announcement).toBe(
      "Measure price anomaly complete, 7 ms",
    );
  });

  it("crosses the 160ms cover threshold on a slower run, and the live region says so before completion", async () => {
    const stream = controllableSseStream();
    stubFetch((call) => {
      if (call.url.endsWith("/investigations"))
        return jsonResponse(201, STARTED);
      return Promise.resolve(stream.response);
    });

    const { result } = renderHook(() => useInvestigation("NVDA"));
    act(() => {
      result.current.start();
    });

    act(() => {
      stream.push(INVESTIGATION_STARTED);
      stream.push(STEP_STARTED);
    });

    await waitFor(() => {
      expect(result.current.checklist?.steps[0]?.status).toBe("running");
    });

    // Real elapsed time past the 160 ms floor, with the step still
    // running — the one way to exercise a real `setTimeout` honestly.
    await waitFor(
      () => {
        expect(result.current.pastCoverThreshold).toBe(true);
      },
      { timeout: 2000 },
    );
    expect(result.current.announcement).toBe("Measure move running");

    act(() => {
      stream.push(stepCompleted(250));
      stream.push(INVESTIGATION_COMPLETED);
      stream.end();
    });

    await waitFor(() => {
      expect(result.current.checklist?.terminal).toBe(true);
    });
    // The live region's SECOND utterance — Done-when 6's other half: this
    // run spoke "running" above and "complete" here, twice in total.
    expect(result.current.announcement).toBe("Measure move complete, 250 ms");
  });

  it("is idempotent: a second press while non-terminal does nothing", async () => {
    const stream = controllableSseStream();
    const postCalls: string[] = [];
    stubFetch((call) => {
      if (call.url.endsWith("/investigations")) {
        postCalls.push(call.url);
        return jsonResponse(201, STARTED);
      }
      return Promise.resolve(stream.response);
    });

    const { result } = renderHook(() => useInvestigation("NVDA"));
    act(() => {
      result.current.start();
    });
    await waitFor(() => {
      expect(result.current.checklist?.investigationId).toBe("inv-1");
    });

    act(() => {
      result.current.start();
    });

    expect(postCalls).toHaveLength(1);
  });

  it("starts a second run once the first has reached a terminal state", async () => {
    const stream = controllableSseStream();
    let posts = 0;
    stubFetch((call) => {
      if (call.url.endsWith("/investigations")) {
        posts += 1;
        return jsonResponse(201, STARTED);
      }
      return Promise.resolve(stream.response);
    });

    const { result } = renderHook(() => useInvestigation("NVDA"));
    act(() => {
      result.current.start();
    });
    await waitFor(() => {
      expect(result.current.checklist?.investigationId).toBe("inv-1");
    });

    act(() => {
      stream.push(INVESTIGATION_STARTED);
      stream.push(STEP_STARTED);
      stream.push(stepCompleted(5));
      stream.push(INVESTIGATION_COMPLETED);
      stream.end();
    });
    await waitFor(() => {
      expect(result.current.checklist?.terminal).toBe(true);
    });

    act(() => {
      result.current.start();
    });

    expect(posts).toBe(2);
  });

  it("hides the checklist when the page's symbol no longer matches the investigation's own", async () => {
    const stream = controllableSseStream();
    stubFetch((call) => {
      if (call.url.endsWith("/investigations"))
        return jsonResponse(201, STARTED);
      return Promise.resolve(stream.response);
    });

    const { result, rerender } = renderHook(
      ({ symbol }) => useInvestigation(symbol),
      { initialProps: { symbol: "NVDA" } },
    );
    act(() => {
      result.current.start();
    });
    await waitFor(() => {
      expect(result.current.checklist).toBeDefined();
    });

    rerender({ symbol: "AAPL" });

    // Subject-pinned: a checklist for NVDA does not follow a page now
    // showing AAPL — Story 7.1's own Gate 1 rule.
    expect(result.current.checklist).toBeUndefined();

    rerender({ symbol: "NVDA" });
    // And it reappears exactly as it was, because the investigation itself
    // never stopped — only this browser's rendering of it did.
    expect(result.current.checklist).toBeDefined();
  });

  it("renders the named sentence once, and speaks it, when the stream ends with no terminal event", async () => {
    stubFetch((call) => {
      if (call.url.endsWith("/investigations"))
        return jsonResponse(201, STARTED);
      // A stream that ends (200, empty body) with no INVESTIGATION_COMPLETED
      // ever sent — the dropped-stream case.
      return Promise.resolve(
        new Response(
          new ReadableStream({
            start(c) {
              c.close();
            },
          }),
          { status: 200 },
        ),
      );
    });

    const { result } = renderHook(() => useInvestigation("NVDA"));
    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.checklist?.connectionLost).toBe(true);
    });
    expect(result.current.announcement).toBe(CONNECTION_LOST_SENTENCE);
  });

  it("does not throw and does not freeze the checklist when startInvestigation itself fails", async () => {
    stubFetch(() => Promise.reject(new Error("network down")));

    const { result } = renderHook(() => useInvestigation("NVDA"));
    expect(() => {
      act(() => {
        result.current.start();
      });
    }).not.toThrow();

    await waitFor(() => {
      expect(result.current.checklist?.connectionLost).toBe(true);
    });

    // And the second-press guard does not permanently wedge shut: a
    // connection-lost checklist is not "still running", so a fresh press
    // is honoured — the exact regression this module's own comment
    // records finding during manual verification.
    stubFetch(() => Promise.reject(new Error("still down")));
    act(() => {
      result.current.start();
    });
    expect(result.current.checklist?.steps[0]?.status).toBe("queued");
  });
});
