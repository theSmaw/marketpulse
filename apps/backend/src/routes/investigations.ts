// `POST /investigations` and `GET /investigations/:id/events` — the first
// Server-Sent Events route this product has ever had, and the first route
// in this application that `reply.hijack()`s at all (Task 7.1.3).
//
// ## Why hijack, and what it costs
//
// `http-compression.ts` registers `@fastify/compress` with `global: true`,
// attached per route through Fastify's `onRoute` hook. `reply.hijack()`
// takes a reply out of Fastify's own response pipeline entirely — nothing
// downstream of the handler runs, including that hook — which is what lets
// an SSE frame leave the process unbuffered rather than waiting behind
// gzip's own framing. The cost is that everything Fastify would otherwise
// do for free has to be done by hand: the correlation-id header (the
// `onRequest` hook in `server.ts` already set it on the *managed* reply,
// but hijacking means that reply object is never flushed, so it is written
// again directly onto `reply.raw`), the status line, and ending the
// response.
//
// ## Why every frame goes through `toWireInvestigationEvent`
//
// SSE bypasses `fast-json-stringify` too — there is no declared response
// schema for this route's 200 at all, because nothing would ever read it.
// `toWireInvestigationEvent` (`packages/shared/src/investigation.ts`) is
// the only thing standing between an orchestration value and the wire, and
// it is the same `WireFields`/`toWire` idiom this codebase already uses
// everywhere else a leak must be structurally impossible rather than
// merely avoided.
//
// ## Second-press idempotency
//
// `STORY.md`'s own Gate 1 settled this: a second `POST` for a symbol with
// an already-running investigation returns that investigation's existing
// id and status rather than starting a second one. The search is a linear
// scan over `InvestigationStore.list()` — bounded at 200 entries by that
// store's own cap, so this is the same order of work as everything else it
// does.

import { randomUUID } from "node:crypto";

import {
  REQUEST_ID_HEADER,
  apiError,
  isTerminalEventType,
  isTicker,
  toInvestigationId,
  toWireInvestigation,
  toWireInvestigationEvent,
} from "@marketpulse/shared";

import { apiErrorSchema } from "../errors.js";

import type { RunnableTool } from "../analytical-tool.js";
import type { InvestigationStore } from "../investigation-store.js";
import type { JsonSchemaProperty } from "../json-schema.js";
import type {
  AgentProvider,
  RunInvestigationContext,
} from "../scripted-agent-provider.js";
import type { Investigation } from "@marketpulse/shared";
import type { FastifyPluginCallback } from "fastify";
import type { ServerResponse } from "node:http";

/**
 * A `Step`'s own wire shape, loosely — `Step` is a five-member
 * discriminated union whose members declare different timing fields, and
 * `json-schema.ts`'s own `JsonSchemaProperty` has no `oneOf` to express
 * that variance in one flat object. The leak-prevention guarantee this
 * repository otherwise gets from a `satisfies Record<keyof T, …>` guard on
 * this schema is already provided one layer down: every field reaching
 * this value has already passed through `toWireStep`'s own per-member
 * field maps (`packages/shared/src/investigation.ts`), which is what
 * `WireFields`/`toWire` exists to be. What this schema still buys is real:
 * any field NOT named here — on any member — is stripped at the wire.
 */
const investigationStepItemSchema: JsonSchemaProperty = {
  type: "object",
  properties: {
    id: { type: "string" },
    description: { type: "string" },
    tool: { type: "string" },
    status: { type: "string" },
    startedAt: { type: "string" },
    completedAt: { type: "string" },
    durationMs: { type: "number" },
    reason: { type: "string" },
  },
  required: ["id", "description", "tool", "status"],
};

const investigationResponseProperties = {
  id: { type: "string" },
  title: { type: "string" },
  createdAt: { type: "string" },
  mode: { type: "string", enum: ["live", "replay"] },
  status: {
    type: "string",
    enum: ["running", "awaiting_user", "completed", "failed", "cancelled"],
  },
  subjectSymbols: { type: "array", items: { type: "string" } },
  currentTime: { type: "string" },
  steps: { type: "array", items: investigationStepItemSchema },
} satisfies Record<keyof Investigation, JsonSchemaProperty>;

const investigationResponseSchema: JsonSchemaProperty = {
  type: "object",
  properties: investigationResponseProperties,
  // Total: every field of `Investigation` is always present (ADR 0029 is
  // why `findings`/`evidence`/`workspaceState`/`messages` are not among
  // them at all, rather than present-and-empty).
  required: Object.keys(investigationResponseProperties),
};

const postInvestigationSchema = {
  response: {
    201: investigationResponseSchema,
    400: apiErrorSchema,
    500: apiErrorSchema,
  },
};

const eventsRouteSchema = {
  querystring: {
    type: "object",
    properties: { from: { type: "string" } },
  },
  response: {
    404: apiErrorSchema,
    500: apiErrorSchema,
  },
};

const SYMBOL_FORMAT_MESSAGE =
  "symbol must be one to five uppercase letters, with an optional share-class suffix.";

export interface InvestigationRoutesOptions {
  readonly store: InvestigationStore;
  readonly provider: AgentProvider;
  /** This story's own configuration: exactly one tool, run in order. A
   * later story's own provider wiring adds to this list; the route never
   * decides what it contains. */
  readonly tools: readonly RunnableTool[];
  /**
   * The one allowed browser origin — `config.corsOrigin`, the same value
   * `registerCors` takes. **Required because hijacking bypasses
   * `@fastify/cors` entirely**, the same mechanism that makes the
   * correlation-id header need writing by hand below: `cors.ts` attaches
   * its own `access-control-allow-origin` through the normal hook
   * pipeline, which a hijacked reply never runs. Measured directly before
   * this was added: a real browser's `fetch()` to this route failed with
   * `TypeError: Failed to fetch` while `curl` against the identical
   * request got a clean `200` — `cors.ts`'s own header's exact opening
   * story, reproduced on this route for not having read it closely enough
   * the first time.
   */
  readonly corsOrigin: string;
}

export interface InvestigationRoutes {
  readonly plugin: FastifyPluginCallback;
  /**
   * Ends every currently open SSE stream, synchronously. `index.ts`
   * registers this beside `registerMarketGatewayCloser` so an open
   * connection cannot hold `app.close()`'s drain open past the measured
   * shutdown ceiling — see that file's own `registerInvestigationStreamCloser`.
   *
   * Never touches an investigation's own status: ending the HTTP response
   * a reader was watching through is not the same fact as the
   * investigation itself stopping, which is exactly the distinction
   * `request.raw.on("close")` below also has to keep.
   */
  readonly closeStreams: () => void;
}

/**
 * The route pair, as a factory over the provider and the store rather than
 * a plain `FastifyPluginCallback` — the shape every other route in this
 * application takes. The divergence is `closeStreams`: nothing else this
 * application serves holds a resource (an open HTTP response) that the
 * *route* itself has to be able to end on command, so nothing else needed
 * this second return value.
 */
export function createInvestigationRoutes(
  options: InvestigationRoutesOptions,
): InvestigationRoutes {
  const { store, provider, tools, corsOrigin } = options;

  // Every hijacked response currently open. `reply.hijack()` takes a reply
  // out of Fastify's own bookkeeping (`http-compression.ts` records the
  // same mechanism from the compression plugin's side), so nothing else in
  // this process would ever learn one exists, let alone end it.
  const openStreams = new Set<ServerResponse>();

  const plugin: FastifyPluginCallback = (app, _options, done) => {
    app.post<{ Body: unknown }>(
      "/investigations",
      { schema: postInvestigationSchema },
      async (request, reply) => {
        const body =
          typeof request.body === "object" && request.body !== null
            ? (request.body as Record<string, unknown>)
            : {};
        const rawSymbol = body.symbol;

        // Validated here rather than through the route's own `body` schema
        // — `routes/market-data.ts` records the same choice for its query
        // string and the argument is the same shape: one request, one
        // error vocabulary. A declared AJV schema would answer a malformed
        // body in Fastify's own shape, which is not this application's
        // `ApiError` envelope.
        if (typeof rawSymbol !== "string" || !isTicker(rawSymbol)) {
          return reply
            .code(400)
            .send(apiError("BAD_REQUEST", SYMBOL_FORMAT_MESSAGE, request.id));
        }
        const symbol = rawSymbol;

        // Second-press idempotency (`STORY.md`'s own Gate 1 rule): a
        // running investigation for this symbol is handed back as-is.
        const existing = store
          .list()
          .find(
            (investigation) =>
              investigation.status === "running" &&
              investigation.subjectSymbols.includes(symbol),
          );
        if (existing !== undefined) {
          return reply.code(201).send(toWireInvestigation(existing));
        }

        const id = toInvestigationId(randomUUID());
        const context: RunInvestigationContext = {
          id,
          title: `Investigate ${symbol}`,
          subjectSymbols: [symbol],
          mode: "live",
          asOf: new Date(),
        };

        // **Not awaited.** `runInvestigation`'s own synchronous prefix —
        // everything up to its first `await tool.run(...)` — already
        // calls `store.create()` and appends `INVESTIGATION_STARTED`
        // before this call returns control here, which is what lets this
        // handler answer with a real, in-progress `Investigation` rather
        // than racing it. A rejection after that point is this server's
        // own failure to finish a run it already promised a 201 for, not
        // the caller's — logged rather than thrown back at a request that
        // has already been answered.
        const run = provider.runInvestigation(context, tools);
        run.catch((error: unknown) => {
          request.log.error(
            { err: error, investigationId: id },
            "investigation run failed after starting",
          );
        });

        const created = store.get(id);
        if (created === undefined) {
          // Unreachable given the synchronous-prefix guarantee above; a
          // 500 here would mean that guarantee itself broke, which the
          // generic error handler reports without this route inventing a
          // second way to say "this server failed".
          throw new Error("investigation was not recorded by its own provider");
        }

        return reply.code(201).send(toWireInvestigation(created));
      },
    );

    app.get<{
      Params: { id: string };
      Querystring: { from?: string };
    }>(
      "/investigations/:id/events",
      { schema: eventsRouteSchema },
      async (request, reply) => {
        const investigationId = toInvestigationId(request.params.id);
        const investigation = store.get(investigationId);
        if (investigation === undefined) {
          return reply
            .code(404)
            .send(
              apiError(
                "NOT_FOUND",
                "No investigation with this id.",
                request.id,
              ),
            );
        }

        // `?from=` wins; `Last-Event-ID` is the header a browser's own SSE
        // reconnect sends automatically, honoured when the query form is
        // absent. Neither present means "from the beginning" — a client
        // attaching after the run started is the common case this story's
        // own `seq` field exists for, not a corner one, so the default
        // replays everything rather than nothing.
        const lastEventId = request.headers["last-event-id"];
        const fromRaw =
          request.query.from ??
          (typeof lastEventId === "string" ? lastEventId : undefined);
        const fromSeq = fromRaw === undefined ? 0 : Number(fromRaw);

        reply.hijack();
        const raw = reply.raw;
        openStreams.add(raw);

        // The correlation-id header AND the CORS headers, both written by
        // hand: hijacking discards the `onRequest` hook in `server.ts` that
        // puts the first on a *managed* reply, and `@fastify/cors`'s own
        // hook that would otherwise put the second two on, for the same
        // reason — a hijacked reply is never flushed through Fastify's own
        // send path at all. Without the CORS pair a real browser's `fetch()`
        // to this route fails outright (`TypeError: Failed to fetch`, no
        // status a page can read), which only a browser can see — `curl`
        // answers 200 against the identical request regardless, because it
        // never enforces the policy the server merely states.
        raw.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
          [REQUEST_ID_HEADER]: request.id,
          "access-control-allow-origin": corsOrigin,
          "access-control-expose-headers": REQUEST_ID_HEADER,
        });
        // `writeHead()` alone does not put the headers on the wire — Node
        // buffers them until the first `write()`/`end()`, which a client
        // attaching after a run has already finished (the common case:
        // `?from=` past every seq this run will ever emit) may never see.
        // Measured directly: without this, a client attaching to a
        // caught-up stream never receives so much as a status line.
        raw.flushHeaders();

        const stream = provider.streamEvents(investigationId, fromSeq);
        const iterator = stream[Symbol.asyncIterator]();

        // **Detaches this subscriber only — never the investigation.**
        // `iterator.return()` resumes the generator at its own `finally`
        // (`scripted-agent-provider.ts`'s `streamEvents`), which
        // unsubscribes from the store's event emitter and nothing else. A
        // client disconnecting and an investigation being cancelled are
        // different facts; `PRODUCT_SPEC.md` §13 defines an investigation
        // as independent of any one response, and conflating the two here
        // would contradict that for every later tool this route serves.
        const onClientClose = (): void => {
          void iterator.return?.();
        };
        request.raw.on("close", onClientClose);

        try {
          for (;;) {
            const next = await iterator.next();
            if (next.done ?? false) break;
            const event = next.value;
            const payload = toWireInvestigationEvent(event);
            raw.write(`id: ${String(event.seq)}\n`);
            raw.write(`event: ${event.type}\n`);
            raw.write(`data: ${JSON.stringify(payload)}\n\n`);
            // The stream terminates the HTTP response after its terminal
            // event, by this story's own settled decision — no keepalive
            // until a run can be held open across steps (Story 7.5 or
            // later), so `app.inject()` can assert the whole sequence in
            // one call.
            if (isTerminalEventType(event.type)) break;
          }
        } finally {
          request.raw.off("close", onClientClose);
          openStreams.delete(raw);
          raw.end();
        }
      },
    );

    done();
  };

  const closeStreams = (): void => {
    for (const raw of openStreams) {
      raw.end();
    }
  };

  return { plugin, closeStreams };
}
