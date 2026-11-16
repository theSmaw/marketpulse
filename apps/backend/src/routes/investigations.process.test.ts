// The two things `app.inject()` cannot reach about this route (Task 7.1.3):
// a REAL `text/event-stream` response over a REAL socket (so the global
// compression plugin has an actual chance to buffer it, which `reply.hijack()`
// is what prevents), and a client genuinely disconnecting mid-stream, which
// `inject()` has no socket to do at all.
//
// `market-gateway.process.test.ts`'s own shape: `buildServer()` plus a real
// `app.listen({ port: 0 })`, not the spawned-`dist/index.js` machinery
// `index.process.test.ts` uses — this needs a socket, not a process. The
// shutdown ceiling itself, with an SSE connection open, is `index.process
// .test.ts`'s own, because that is a property of `index.ts`'s signal
// handling rather than of this route in isolation.

import { toTicker } from "@marketpulse/shared";
import type { Investigation } from "@marketpulse/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import type { RunnableTool } from "../analytical-tool.js";
import { createInvestigationStore } from "../investigation-store.js";
import type { InvestigationStore } from "../investigation-store.js";
import { createScriptedAgentProvider } from "../scripted-agent-provider.js";
import { buildServer } from "../server.js";
import { createInvestigationRoutes } from "./investigations.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

/** A tool whose `run()` resolves only once the test calls `resolve()` —
 * the handle this file needs to disconnect a client while an investigation
 * is still genuinely `running`, rather than racing a near-instant one. */
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

async function listening(
  tools: readonly RunnableTool[],
): Promise<{ port: number; store: InvestigationStore }> {
  const instance = buildServer({
    logLevel: "silent",
    logFormat: "json",
    corsOrigin: "http://localhost:5173",
  });
  const store = createInvestigationStore();
  const provider = createScriptedAgentProvider({
    store,
    now: () => new Date("2026-11-16T14:00:00.000Z"),
  });
  instance.register(
    createInvestigationRoutes({ store, provider, tools }).plugin,
  );

  await instance.listen({ port: 0, host: "127.0.0.1" });
  app = instance;

  const address = instance.server.address();
  if (address === null || typeof address === "string") {
    throw new Error("the server did not bind a port");
  }
  return { port: address.port, store };
}

async function postInvestigation(
  port: number,
  symbol: string,
): Promise<Investigation> {
  const response = await fetch(
    `http://127.0.0.1:${String(port)}/investigations`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbol }),
    },
  );
  return (await response.json()) as Investigation;
}

describe("GET /investigations/:id/events, over a real socket", () => {
  it("is a real text/event-stream with no gzip Content-Encoding", async () => {
    const { port } = await listening([]);
    // No tools at all: `runInvestigation` still mints and completes the
    // investigation (zero steps), which is enough to exercise the stream —
    // this test's own subject is the transport, not the one tool.
    const created = await postInvestigation(port, toTicker("NVDA"));

    const response = await fetch(
      `http://127.0.0.1:${String(port)}/investigations/${created.id}/events?from=0`,
    );

    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(response.headers.get("content-encoding")).toBeNull();

    const body = await response.text();
    expect(body).toContain("event: INVESTIGATION_STARTED");
    expect(body).toContain("event: INVESTIGATION_COMPLETED");
  });

  it("disconnecting a stream does not change the investigation's status", async () => {
    const { tool, resolve } = stuckTool();
    const { port, store } = await listening([tool]);

    const created = await postInvestigation(port, toTicker("NVDA"));
    expect(created.status).toBe("running");

    // Attach for real — far enough that the server has hijacked the
    // reply and written its first frames — then abort: a real socket
    // close, not a `break` out of a loop `app.inject()` has no socket to
    // drive.
    const controller = new AbortController();
    const attached = await fetch(
      `http://127.0.0.1:${String(port)}/investigations/${created.id}/events?from=0`,
      { signal: controller.signal },
    );
    const reader = attached.body?.getReader();
    await reader?.read();
    controller.abort();
    await reader?.cancel().catch(() => undefined);

    // The investigation is still exactly where the disconnect left it —
    // `running`, because the tool has not been let go yet. A premature
    // `completed` here would mean the disconnect reached the orchestrator,
    // which `request.raw.on("close")`'s own contract forbids.
    expect(store.get(created.id)?.status).toBe("running");

    // Reconnect, let the tool resolve, and the SAME investigation reaches
    // `completed` on its own — proving the disconnect above detached a
    // *subscriber*, never the investigation.
    const reconnected = fetch(
      `http://127.0.0.1:${String(port)}/investigations/${created.id}/events?from=0`,
    );
    resolve();
    const response = await reconnected;
    const body = await response.text();

    expect(body).toContain("event: INVESTIGATION_COMPLETED");
    expect(store.get(created.id)?.status).toBe("completed");
  });
});
