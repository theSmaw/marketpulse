import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubFetch } from "../fixtures/stub-fetch.js";
import { INVESTIGATION_STEP_COUNT } from "./investigation-checklist-state.js";
import {
  CONNECTION_LOST_SENTENCE,
  useInvestigation,
} from "./use-investigation.js";
import type { WorkspaceHighlightState } from "./workspace-highlight.js";

/**
 * **The command, out of the two-arm state the hook now answers with** (Task
 * 7.4.3) — `undefined` for *no command in force*, which is both the
 * `withdrawn` arm and the before-anything state. A test asserting on the
 * command alone goes through this; a test about the LIFETIME asserts on
 * `.kind` directly, because that is the fact it is about.
 */
function commanded(state: WorkspaceHighlightState | undefined) {
  return state?.kind === "commanded" ? state.command : undefined;
}

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

const findingCreated = (stepId: string, claim: string, confidence: string) => ({
  type: "FINDING_CREATED",
  seq: 2,
  investigationId: "inv-1",
  finding: { stepId, claim, confidence },
});

/**
 * Invariant 2's own event, permitted (Task 7.4.2) — the shipped wire shape:
 * an `outcome` with two arms, `relations` plural, and `subject` deliberately
 * NOT a member of its own `symbols`.
 */
const workspaceCommand = (outcome: Record<string, unknown>) => ({
  type: "WORKSPACE_COMMAND",
  seq: 3,
  investigationId: "inv-1",
  stepId: "step-1",
  outcome,
});

const PERMITTED = {
  kind: "permitted",
  command: {
    type: "highlightNodes",
    symbols: ["AAPL", "MSFT"],
    relations: ["sector_membership", "return_correlation"],
    subject: "NVDA",
  },
};

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
      stream.push(
        findingCreated(
          "step-1",
          "Traded at 184.52 on 12,480 shares in the latest bar",
          "SUPPORTED",
        ),
      );
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
    // half. **The terminal utterance is now a confidence-count summary**
    // (Task 7.3.3, AC 12), not the last-completed step's own sentence.
    expect(result.current.pastCoverThreshold).toBe(false);
    expect(result.current.announcement).toBe("1 finding supported");
  });

  it("holds each step's own description and duration independently, and the terminal summary counts BOTH findings — a two-step run", async () => {
    // Task 7.2.7: with six seeded rows, `steps[0]` is the row that finished
    // FIRST, so a live region keyed on it alone would report only a step
    // that ended four steps ago — which the confidence-count summary
    // (Task 7.3.3) sidesteps entirely by counting the whole run rather than
    // naming one step.
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
      stream.push(
        findingCreated(
          "step-1",
          "Traded at 184.52 on 12,480 shares in the latest bar",
          "SUPPORTED",
        ),
      );
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
      stream.push(
        findingCreated(
          "step-2",
          "Volume rate — no stored distribution to rank against",
          "POSSIBLE",
        ),
      );
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
    expect(result.current.announcement).toBe("1 finding supported, 1 possible");
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
    // run spoke "running" above and the terminal summary here, twice in
    // total. No `FINDING_CREATED` was ever pushed, so this is the
    // zero-findings fallback — this step's own outcome was `inapplicable`,
    // the one case the summary cannot count.
    expect(result.current.announcement).toBe(
      "Investigation complete — no findings produced",
    );
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

  it("a second press keeps the prior run's claim, marked stale, until that row's own re-completion (AC 11)", async () => {
    const firstStream = controllableSseStream();
    const secondStream = controllableSseStream();
    let posts = 0;
    stubFetch((call) => {
      if (call.url.endsWith("/investigations")) {
        posts += 1;
        return jsonResponse(201, STARTED);
      }
      return Promise.resolve(
        posts === 1 ? firstStream.response : secondStream.response,
      );
    });

    const { result } = renderHook(() => useInvestigation("NVDA"));
    act(() => {
      result.current.start();
    });
    await waitFor(() => {
      expect(result.current.checklist?.investigationId).toBe("inv-1");
    });

    act(() => {
      firstStream.push(INVESTIGATION_STARTED);
      firstStream.push(STEP_STARTED);
      firstStream.push(
        findingCreated(
          "step-1",
          "Traded at 184.52 on 12,480 shares in the latest bar",
          "SUPPORTED",
        ),
      );
      firstStream.push(stepCompleted(5));
      firstStream.push(INVESTIGATION_COMPLETED);
      firstStream.end();
    });
    await waitFor(() => {
      expect(result.current.checklist?.terminal).toBe(true);
    });

    act(() => {
      result.current.start();
    });

    // **Not blanked** — the prior run's claim is still on screen, the whole
    // reason this test exists: `optimisticChecklist` alone would have reset
    // this to `undefined` in the same commit.
    expect(result.current.checklist?.steps[0]).toMatchObject({
      status: "queued",
      claim: "Traded at 184.52 on 12,480 shares in the latest bar",
      confidence: "SUPPORTED",
      stale: true,
    });

    await waitFor(() => {
      expect(posts).toBe(2);
    });

    act(() => {
      secondStream.push(INVESTIGATION_STARTED);
      secondStream.push(STEP_STARTED);
    });

    // **Still showing, through queued and now running** — AC 11's own
    // wording: "queued/running states render exactly as they do today
    // otherwise."
    await waitFor(() => {
      expect(result.current.checklist?.steps[0]?.status).toBe("running");
    });
    expect(result.current.checklist?.steps[0]).toMatchObject({
      claim: "Traded at 184.52 on 12,480 shares in the latest bar",
      stale: true,
    });

    act(() => {
      secondStream.push(
        findingCreated(
          "step-1",
          "Traded at 185.10 on 9,200 shares in the latest bar",
          "SUPPORTED",
        ),
      );
    });

    // **Replaced by this row's own re-completion**, not merely covered.
    await waitFor(() => {
      expect(result.current.checklist?.steps[0]?.stale).toBe(false);
    });
    expect(result.current.checklist?.steps[0]?.claim).toBe(
      "Traded at 185.10 on 9,200 shares in the latest bar",
    );
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
  it("surfaces a PERMITTED workspace command, and holds it through a symbol change — Task 7.4.2", async () => {
    const stream = controllableSseStream();
    stubFetch((call) => {
      if (call.url.endsWith("/investigations"))
        return jsonResponse(201, STARTED);
      return Promise.resolve(stream.response);
    });

    const { result, rerender } = renderHook(
      ({ symbol }: { symbol: string }) => useInvestigation(symbol),
      { initialProps: { symbol: "NVDA" } },
    );
    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.checklist?.investigationId).toBe("inv-1");
    });

    expect(result.current.highlight).toBeUndefined();

    act(() => {
      stream.push(INVESTIGATION_STARTED);
      stream.push(STEP_STARTED);
      stream.push(workspaceCommand(PERMITTED));
    });

    await waitFor(() => {
      // **The id is the event's own** (Task 7.4.3), which is what lets
      // `App`'s holder answer *is the thing being withdrawn the thing I am
      // holding?* — see `workspace-highlight.ts`' own header.
      expect(commanded(result.current.highlight)).toStrictEqual({
        investigationId: "inv-1",
        subject: "NVDA",
        symbols: ["AAPL", "MSFT"],
        relations: ["sector_membership", "return_correlation"],
      });
    });

    // **NOT subject-pinned, unlike the checklist** (AC 7). Navigating is how a
    // reader reaches the screen that draws this, so a command withdrawn on a
    // symbol change would be a feature with no reachable state.
    rerender({ symbol: "AAPL" });

    expect(result.current.checklist).toBeUndefined();
    expect(commanded(result.current.highlight)?.subject).toBe("NVDA");
  });

  it("surfaces NOTHING for a REFUSED workspace command, and raises no error — Task 7.4.2", async () => {
    // Gate 1's degraded-state decision: a refusal is a first-class, countable
    // outcome on the wire and on the server's own record of the run, and it
    // belongs to the surface that ASKED. Nothing on `/` may draw an error
    // about a command a reader never issued, so this is byte-identical to
    // "no command yet".
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
      stream.push(
        workspaceCommand({
          kind: "refused",
          because: "symbol-has-no-placement",
        }),
      );
      stream.push(stepCompleted(4));
      stream.push(INVESTIGATION_COMPLETED);
      stream.end();
    });

    await waitFor(() => {
      expect(result.current.checklist?.terminal).toBe(true);
    });

    expect(result.current.highlight).toBeUndefined();
    // The run itself is unaffected: the refusal is not a failure.
    expect(result.current.checklist?.connectionLost).toBe(false);
    expect(result.current.checklist?.steps[0]).toMatchObject({
      status: "completed",
      durationMs: 4,
    });
  });

  it("a later command supersedes an earlier one", async () => {
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
      stream.push(workspaceCommand(PERMITTED));
      stream.push(
        workspaceCommand({
          kind: "permitted",
          command: {
            type: "highlightNodes",
            symbols: ["XOM"],
            relations: ["sector_membership"],
            subject: "CVX",
          },
        }),
      );
    });

    await waitFor(() => {
      expect(commanded(result.current.highlight)?.subject).toBe("CVX");
    });
    expect(commanded(result.current.highlight)?.symbols).toStrictEqual(["XOM"]);
  });

  it("WITHDRAWS the highlight when the channel dies with no terminal event — Task 7.4.3", async () => {
    // AC 8's channel-death clause, and the interval is the stream's own end:
    // no timer and no threshold, the same instant the checklist starts saying
    // *investigation state unknown*. ~70 dimmed nodes with nothing standing
    // behind them is ADR 0029's false impression, one surface over.
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
      stream.push(workspaceCommand(PERMITTED));
    });

    await waitFor(() => {
      expect(commanded(result.current.highlight)?.subject).toBe("NVDA");
    });

    // The stream simply stops, with no `INVESTIGATION_COMPLETED` and no
    // `INVESTIGATION_FAILED` — a dropped connection, or a browser put to
    // sleep. The run may still be going on the server; this browser cannot
    // say, and that is exactly the state the withdrawal is for.
    act(() => {
      stream.end();
    });

    await waitFor(() => {
      expect(result.current.highlight).toStrictEqual({
        kind: "withdrawn",
        investigationId: "inv-1",
      });
    });
    // And the checklist says the same thing in its own words, which is how a
    // reader on THIS screen learns what the other screen's highlight going
    // away was about.
    expect(result.current.checklist?.connectionLost).toBe(true);
  });

  it("KEEPS the highlight when the run reaches a terminal state — Task 7.4.3", async () => {
    // The other side of the same decision, and the one place in this task
    // where `STORY.md`'s AC 8 and its own Gate 1 record disagree —
    // `highlightOutlivesChannelEnd` carries the argument and the measurement,
    // and `workspace-highlight.test.ts` holds it over every member of
    // `TERMINAL_EVENT_TYPES` rather than over the one this test pushes.
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
      stream.push(workspaceCommand(PERMITTED));
      stream.push(stepCompleted(4));
      stream.push(INVESTIGATION_COMPLETED);
      stream.end();
    });

    await waitFor(() => {
      expect(result.current.checklist?.terminal).toBe(true);
    });

    expect(result.current.highlight?.kind).toBe("commanded");
    expect(commanded(result.current.highlight)?.subject).toBe("NVDA");
  });
});
