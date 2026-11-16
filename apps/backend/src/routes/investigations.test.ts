// `POST /investigations` and `GET /investigations/:id/events`, driven
// through the assembled server (Task 7.1.3) — `diagnostics.test.ts`'s own
// shape: the real HTTP layer through `app.inject()`, with the response
// schema and both error handlers registered, because the whole point of
// this route is a property of the *serialised* wire frames.
//
// What this file cannot reach: a real client disconnecting mid-stream
// (`app.inject()` has no socket to close) and the shutdown ceiling with a
// stream open. Both are `investigations.process.test.ts`'s and
// `index.process.test.ts`'s.

import { REQUEST_ID_HEADER, toTicker } from "@marketpulse/shared";
import type { Investigation, InvestigationEvent } from "@marketpulse/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { toRunnableTool } from "../analytical-tool.js";
import type { RunnableTool } from "../analytical-tool.js";
import { createCurrentMarketState } from "../current-market-state.js";
import { createInvestigationStore } from "../investigation-store.js";
import type { LiveObservation } from "../market-data-stream.js";
import { createScriptedAgentProvider } from "../scripted-agent-provider.js";
import { buildServer } from "../server.js";
import {
  createSecuritySnapshotTool,
  toWireSecuritySnapshot,
} from "../tool-security-snapshot.js";
import type { InvestigationStore } from "../investigation-store.js";
import { createInvestigationRoutes } from "./investigations.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const NVDA = toTicker("NVDA");
const READ_AT = Date.parse("2026-11-16T14:00:00.000Z");

const OBSERVATION: LiveObservation = {
  symbol: NVDA,
  bar: {
    startsAt: new Date("2026-11-16T13:59:00.000Z"),
    open: 181.2,
    high: 181.9,
    low: 180.8,
    close: 181.5,
    volume: 1_234_567,
  },
  source: {
    provider: "fixture",
    feed: "iex",
    retrievedAt: "2026-11-16T13:59:30.000Z",
    barCount: 1,
  },
  supersedes: false,
};

function serverWith(options?: {
  readonly universe?: ReadonlySet<string>;
  readonly observe?: boolean;
  readonly tools?: readonly RunnableTool[];
}): { instance: FastifyInstance; store: InvestigationStore } {
  const instance = buildServer({
    logLevel: "silent",
    logFormat: "json",
    corsOrigin: "http://localhost:5173",
  });

  const state = createCurrentMarketState({ now: () => READ_AT });
  if (options?.observe ?? true) state.observe([OBSERVATION]);

  const store = createInvestigationStore();
  const provider = createScriptedAgentProvider({
    store,
    now: () => new Date(READ_AT),
  });
  const tools = options?.tools ?? [
    toRunnableTool(
      createSecuritySnapshotTool(state, options?.universe ?? new Set([NVDA])),
      (subjectSymbols) => {
        const [symbol] = subjectSymbols;
        if (symbol === undefined) throw new Error("test setup");
        return { symbol };
      },
      toWireSecuritySnapshot,
    ),
  ];

  const routes = createInvestigationRoutes({
    store,
    provider,
    tools,
    corsOrigin: "http://localhost:5173",
  });
  instance.register(routes.plugin);

  app = instance;
  return { instance, store };
}

/** A tool whose `run()` never resolves until the test calls `resolve()` —
 * for pinning the idempotency window, which the real tool's own near-
 * instant `Promise.resolve()` makes otherwise unobservable: by the time a
 * second `inject()` call runs, the first investigation has usually already
 * reached `completed`. */
function stuckTool(): { tool: RunnableTool; resolve: () => void } {
  let resolve!: () => void;
  const gate = new Promise<void>((r) => {
    resolve = r;
  });
  const tool: RunnableTool = {
    name: "get_security_snapshot",
    description: "Measure move",
    async run() {
      await gate;
      return { kind: "refused", reason: "nothing-observed" };
    },
  };
  return { tool, resolve };
}

/** The tool is a `Map` lookup with no real I/O, so a run reaches
 * `completed` within a handful of microtask ticks — this flushes enough
 * of them that polling `store.get(id)` sees the final state. */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

describe("POST /investigations", () => {
  it("returns 201 with the created, already-running investigation", async () => {
    const { instance } = serverWith();

    const response = await instance.inject({
      method: "POST",
      url: "/investigations",
      payload: { symbol: "NVDA" },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<Investigation>();
    expect(body.status).toBe("running");
    expect(body.subjectSymbols).toStrictEqual(["NVDA"]);
    expect(body.title).toBe("Investigate NVDA");
    expect(body.steps).toHaveLength(1);
    // Client-optimistic by construction: the synchronous prefix of
    // `runInvestigation` has already queued and started the one step by
    // the time this response is built, before the tool call itself
    // resolves.
    expect(body.steps[0]?.status).toBe("running");
  });

  it("refuses a malformed symbol with 400 BAD_REQUEST", async () => {
    const { instance } = serverWith();

    const response = await instance.inject({
      method: "POST",
      url: "/investigations",
      payload: { symbol: "not a ticker" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "BAD_REQUEST" });
  });

  it("is idempotent: a second press for a running symbol returns the SAME investigation", async () => {
    const { tool } = stuckTool();
    const { instance } = serverWith({ tools: [tool] });

    const first = await instance.inject({
      method: "POST",
      url: "/investigations",
      payload: { symbol: "NVDA" },
    });
    expect(first.json<Investigation>().status).toBe("running");

    const second = await instance.inject({
      method: "POST",
      url: "/investigations",
      payload: { symbol: "NVDA" },
    });

    expect(second.statusCode).toBe(201);
    expect(second.json<Investigation>().id).toBe(
      first.json<Investigation>().id,
    );
  });

  it("starts a SECOND investigation once the first has completed", async () => {
    const { instance } = serverWith();

    const first = await instance.inject({
      method: "POST",
      url: "/investigations",
      payload: { symbol: "NVDA" },
    });
    await settle();

    const second = await instance.inject({
      method: "POST",
      url: "/investigations",
      payload: { symbol: "NVDA" },
    });

    expect(second.json<Investigation>().id).not.toBe(
      first.json<Investigation>().id,
    );
  });
});

describe("GET /investigations/:id/events", () => {
  it("is a real text/event-stream with no gzip Content-Encoding", async () => {
    const { instance } = serverWith();
    const created = (
      await instance.inject({
        method: "POST",
        url: "/investigations",
        payload: { symbol: "NVDA" },
      })
    ).json<Investigation>();
    await settle();

    const response = await instance.inject({
      method: "GET",
      url: `/investigations/${created.id}/events?from=0`,
    });

    expect(response.headers["content-type"]).toBe("text/event-stream");
    expect(response.headers["content-encoding"]).toBeUndefined();
    // `@fastify/cors`'s own hook never runs on a hijacked reply, which is
    // the same mechanism that makes the correlation-id header need
    // writing by hand two lines up in `routes/investigations.ts` — so
    // both halves of the CORS contract are written there too. Without
    // this, a real browser's `fetch()` to this route fails outright
    // (`TypeError: Failed to fetch`) while this very assertion, run
    // through `app.inject()`, would stay green regardless — `inject()`
    // never enforces the policy a header merely states, which is `curl`'s
    // own blind spot restated.
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
    expect(response.headers["access-control-expose-headers"]).toBe(
      REQUEST_ID_HEADER,
    );
  });

  it("404s for an unknown investigation id", async () => {
    const { instance } = serverWith();

    const response = await instance.inject({
      method: "GET",
      url: "/investigations/no-such-id/events",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: "NOT_FOUND" });
  });

  it("replays the full six-event sequence, byte-identical to a from-the-start attach", async () => {
    const { instance } = serverWith();
    const created = (
      await instance.inject({
        method: "POST",
        url: "/investigations",
        payload: { symbol: "NVDA" },
      })
    ).json<Investigation>();
    await settle();

    const response = await instance.inject({
      method: "GET",
      url: `/investigations/${created.id}/events?from=0`,
    });

    const frames = parseSseFrames(response.body);
    const events = frames.map((frame) => frame.data as InvestigationEvent);

    // Strictly increasing seq, from 1.
    expect(events.map((event) => event.seq)).toStrictEqual([1, 2, 3, 4, 5, 6]);

    // Exactly one INVESTIGATION_STARTED, first; one INVESTIGATION_COMPLETED,
    // last — asserted as pairing predicates over the events present, not as
    // one hard-coded six-item literal (Done-when 6: Story 7.2 adds a second
    // tool and this must still hold).
    const started = events.filter((e) => e.type === "INVESTIGATION_STARTED");
    const completed = events.filter(
      (e) => e.type === "INVESTIGATION_COMPLETED",
    );
    expect(started).toHaveLength(1);
    expect(completed).toHaveLength(1);
    expect(events[0]?.type).toBe("INVESTIGATION_STARTED");
    expect(events.at(-1)?.type).toBe("INVESTIGATION_COMPLETED");

    // Every STEP_STARTED precedes its own step's TOOL_CALL_STARTED,
    // TOOL_CALL_COMPLETED and STEP_COMPLETED — over ids, not positions.
    const byStepId = new Map<string, InvestigationEvent[]>();
    for (const event of events) {
      if (!("stepId" in event)) continue;
      const forStep = byStepId.get(event.stepId) ?? [];
      forStep.push(event);
      byStepId.set(event.stepId, forStep);
    }
    for (const stepEvents of byStepId.values()) {
      expect(stepEvents.map((event) => event.type)).toStrictEqual([
        "STEP_STARTED",
        "TOOL_CALL_STARTED",
        "TOOL_CALL_COMPLETED",
        "STEP_COMPLETED",
      ]);
    }

    // A replay from the beginning is byte-identical to a second one — the
    // store's own log is immutable once an investigation is complete.
    const replay = await instance.inject({
      method: "GET",
      url: `/investigations/${created.id}/events?from=0`,
    });
    expect(replay.body).toBe(response.body);
  });

  it("carries the real tool outcome, with no change field and no internal detail", async () => {
    const { instance } = serverWith();
    const created = (
      await instance.inject({
        method: "POST",
        url: "/investigations",
        payload: { symbol: "NVDA" },
      })
    ).json<Investigation>();
    await settle();

    const response = await instance.inject({
      method: "GET",
      url: `/investigations/${created.id}/events?from=0`,
    });
    const frames = parseSseFrames(response.body);
    const toolCallCompleted = frames.find(
      (frame) => frame.event === "TOOL_CALL_COMPLETED",
    );
    expect(toolCallCompleted).toBeDefined();

    const outcome = (
      toolCallCompleted?.data as {
        outcome: { kind: string; value?: Record<string, unknown> };
      }
    ).outcome;
    expect(outcome.kind).toBe("ok");
    expect(outcome.value?.symbol).toBe("NVDA");
    expect(outcome.value).not.toHaveProperty("change");
    // A hand-audit against SSE's own bypass of `fast-json-stringify`
    // (Done-when 7): the only fields on the wire are the ones
    // `toWireSecuritySnapshot` names.
    expect(Object.keys(outcome.value ?? {}).sort()).toStrictEqual([
      "ageMs",
      "high",
      "low",
      "observedAt",
      "open",
      "price",
      "source",
      "symbol",
      "volume",
    ]);
  });

  it("refuses honestly for an untracked security, through the full stack", async () => {
    const { instance } = serverWith({ universe: new Set<string>() });
    const created = (
      await instance.inject({
        method: "POST",
        url: "/investigations",
        payload: { symbol: "NVDA" },
      })
    ).json<Investigation>();
    await settle();

    const response = await instance.inject({
      method: "GET",
      url: `/investigations/${created.id}/events?from=0`,
    });
    const frames = parseSseFrames(response.body);
    const toolCallCompleted = frames.find(
      (frame) => frame.event === "TOOL_CALL_COMPLETED",
    );
    expect(
      (toolCallCompleted?.data as { outcome: unknown }).outcome,
    ).toStrictEqual({ kind: "refused", reason: "not-tracked" });
  });
});

/** A minimal SSE frame reader for this test's own fixtures — no event this
 * route ever sends spans a blank line, so splitting on `\n\n` is enough. */
function parseSseFrames(
  body: string,
): { event: string; id: string; data: unknown }[] {
  return body
    .split("\n\n")
    .filter((chunk) => chunk.trim().length > 0)
    .map((chunk) => {
      const lines = chunk.split("\n");
      const idLine = lines.find((line) => line.startsWith("id: "));
      const eventLine = lines.find((line) => line.startsWith("event: "));
      const dataLine = lines.find((line) => line.startsWith("data: "));
      if (
        idLine === undefined ||
        eventLine === undefined ||
        dataLine === undefined
      ) {
        throw new Error(`malformed SSE frame: ${chunk}`);
      }
      return {
        id: idLine.slice("id: ".length),
        event: eventLine.slice("event: ".length),
        data: JSON.parse(dataLine.slice("data: ".length)) as unknown,
      };
    });
}
