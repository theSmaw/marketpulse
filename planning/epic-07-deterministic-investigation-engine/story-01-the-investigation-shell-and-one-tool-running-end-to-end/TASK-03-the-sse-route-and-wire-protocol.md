# Task 7.1.3 — The SSE route & wire protocol

**Status:** Complete — 2026-11-16. Both routes ship; a real Node bug was
found and fixed along the way — `writeHead()` alone never puts headers on
the wire, so a client attaching to a caught-up stream (the common case
for a reconnect) received nothing at all until `flushHeaders()` was
added.
**Story:** [7.1 The Investigation Shell, & One Tool Running End to End](STORY.md)
**Depends on:** 7.1.2

## Objective

Put the orchestrator behind a real HTTP transport — the first
Server-Sent Events route this product has ever had, on a backend whose
global compression plugin would otherwise buffer it into uselessness.
Get the framing, the replay semantics and the shutdown behaviour right
once, here, since every later story's own tool rides this same route.

## What the user can see when this lands

Nothing directly (no UI yet — Task 7.1.4 is the frontend), but the real
route is reachable with `curl` and streams real frames.

## Work

- **`POST /investigations`**: starts an investigation (`{ symbol }` body
  for this story), returns `201` with the created `Investigation`'s wire
  projection. Declares `500: apiErrorSchema` like every other route.
  Second-press idempotency (Gate 1's own settled rule) is enforced here:
  a `POST` for a symbol with an already-running investigation returns
  that investigation's existing id and status rather than creating a
  second one.
- **`GET /investigations/:id/events`**: the SSE route.
  **`reply.hijack()`**, writing to `reply.raw` directly — this is what
  escapes `@fastify/compress`'s `global: true` registration, which would
  otherwise gzip-buffer the stream. Manually write the correlation-id
  header (`REQUEST_ID_HEADER`) onto `reply.raw` before the first frame,
  since hijacking discards the hook that would otherwise have set it.
  Accepts an optional `?from=<seq>` (or honours `Last-Event-ID`) and
  replays the store's own event log from that point, then follows live
  until a terminal event type, then **ends the HTTP response** — no
  keepalive in this story (Gate 1's own settled decision; `HOSTING.md`'s
  4-minute idle-timeout keepalive becomes live once a stream can be held
  open across steps, Story 7.5 or later).
- **The wire serialisation**: every frame is produced through Task
  7.1.1's `WireFields`/`toWire` field map, never a bare `JSON.stringify`
  of an orchestration value — this is the one new mechanism this task
  owes a `pnpm invariants` entry for (see this story's own close).
- **The shutdown closer**: register an investigation-stream closer
  alongside `registerMarketGatewayCloser`, so an open SSE connection does
  not hold `app.close()` open past the measured 5-second shutdown
  ceiling `test:process` asserts.
- **`request.raw.on("close")` detaches a stream subscriber only** — it
  must never cancel the investigation. A client disconnecting and an
  investigation being cancelled are different facts; conflating them
  contradicts `PRODUCT_SPEC.md` §13's own definition of an investigation
  as independent of any one response.
- **Register both routes in `index.ts`** (they need `currentMarketState`
  and the investigation store, the same way `securities` and
  `diagnostics` are registered) **and add them to `server.test.ts`'s own
  route-table walk** — that test only sees routes it is told about, and
  a route registered in `index.ts` and left out of the test is invisible
  to the very check that exists to catch a missing `500` schema.

## Done when

1. `GET /investigations/:id/events` is reachable with `curl
--no-buffer` and produces real `text/event-stream` frames with no
   gzip `Content-Encoding` header.
2. A client attaching with `?from=0` after the investigation has already
   completed receives the full replayed sequence, byte-identical in
   content to what a client attached from the start would have seen.
3. Disconnecting a stream (closing the client's own connection) does not
   change the investigation's status — proven by starting one,
   disconnecting immediately, then reconnecting and observing it still
   reaches `completed`.
4. `pnpm test:process` still completes within its existing ceiling with
   an SSE connection open at shutdown time.
5. `server.test.ts`'s route-table walk passes with both new routes
   included, each declaring `500: apiErrorSchema`.
6. An integration test (`app.inject()`) asserts the full six-event
   sequence for a one-step investigation: strictly increasing `seq`,
   the exact pairing predicates (`STEP_STARTED` precedes its own step's
   `TOOL_CALL_STARTED`, etc.), and exactly one `INVESTIGATION_STARTED`
   first and one `INVESTIGATION_COMPLETED` last — asserted as pairing
   predicates over ids, not as one hard-coded six-item literal array
   that Story 7.2 would immediately invalidate.
7. A hand-audit of every event payload confirms no internal detail
   (a stack trace, an internal id, a thrown message) reaches the wire —
   SSE bypasses `fast-json-stringify`'s own stripping, so this check has
   no mechanical backstop yet (the invariant proposed at this story's
   own close is what adds one).

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-11-16

- **`apps/backend/src/routes/investigations.ts`** (new): `POST
/investigations` (idempotent per running symbol, via a linear scan of
  `InvestigationStore.list()`; returns the real, already-running
  `Investigation` from `runInvestigation`'s own synchronous prefix,
  never awaited) and `GET /investigations/:id/events` (`reply.hijack()`,
  a hand-written status line and correlation-id header, `?from=`/
  `Last-Event-ID` replay via `AgentProvider.streamEvents`, a terminal-
  event-ends-the-response rule, `request.raw.on("close")` detaching the
  subscriber only). Both declare `500: apiErrorSchema`; the POST route
  also declares a real 201/400 schema built from `toWireInvestigation`'s
  own field set; the GET route declares no 200 at all, since hijacking
  means nothing would ever read it.
- **`packages/shared/src/investigation.ts`**: `toWireInvestigationEvent`,
  one `WireFields` map per event member (six today), mirroring
  `toWireStep`'s own per-member pattern — the mechanism this task's own
  Work section named as owing a `pnpm invariants` entry at the story's
  close.
- **`apps/backend/src/investigation-store.ts`**: `list()` added — not
  named in the task's own Work list, but required for the second-press
  idempotency rule, which has to search by subject rather than by id.
- **`apps/backend/src/index.ts`**: `currentMarketState`'s own
  construction moved earlier in the file, ahead of `app.listen()` —
  every existing reader of it is wired up _after_ `listen()` because
  none of them is a genuine Fastify plugin (the gateway attaches to
  `app.server`'s own `upgrade` event directly), and this route is the
  first one that is. The investigation store, the scripted provider and
  the one configured tool are constructed alongside the diagnostics/
  securities/market-data routes, for the same ordering reason those are
  registered there. A third shutdown closer
  (`registerInvestigationStreamCloser`) ends every open SSE stream
  ahead of `app.close()`'s own drain.

### Two real defects found and fixed, neither in this task's own first draft

1. **A genuine `ReferenceError` at module load.** The investigation
   stream closer's own registration call was first written right beside
   the route registration — which runs _before_ the `let
closeInvestigationStreams` declaration a few hundred lines later in the
   file, a textbook temporal-dead-zone violation. Caught immediately by
   `pnpm test:process`, which spawns the real built `dist/index.js` and
   crashed on startup; `app.inject()`-based tests cannot see this class
   of bug at all, because they never import `index.ts`. Fixed by moving
   the call to immediately after the declaration.
2. **Node's `ServerResponse.writeHead()` does not flush.** A client
   attaching to an investigation that has already finished — the
   _common_ case for a real reconnect, not a corner one — has nothing
   left to replay and nothing new coming, so the handler never called
   `write()`. Measured directly: without `flushHeaders()`, such a client
   receives **no response at all**, not even a status line, because
   Node buffers headers until the first `write()`/`end()`. A process-
   level test (`index.process.test.ts`) attaching to a caught-up stream
   and then sending `SIGTERM` hung for the full 30 s test timeout before
   this was found and fixed.

### Gates

`pnpm --filter @marketpulse/backend typecheck` clean (clean rebuild).
`pnpm --filter @marketpulse/backend lint` clean. `pnpm --filter
@marketpulse/shared lint` clean. `pnpm --filter @marketpulse/backend
test` — **1412 passed** (9 new in `routes/investigations.test.ts`).
`pnpm --filter @marketpulse/backend test:process` — **63 passed** (3
new: the real-socket transport/disconnect tests in
`routes/investigations.process.test.ts`, and the shutdown-ceiling test
in `index.process.test.ts`). Full `pnpm verify` — green: 86 invariants
hold, `packages/shared` 734 tests, `apps/backend` 1,412, `apps/frontend`
1,956, `scripts/*.test.mjs` 21, `test:process` 63.

A real dev server was also driven by hand with `curl --no-buffer`
(Done-when 1 and the hand-audit for Done-when 7): a real
`text/event-stream` response with no `content-encoding` header, every
one of the six real frames, and a `TOOL_CALL_COMPLETED` outcome
(`{"kind":"refused","reason":"nothing-observed"}`) carrying no internal
detail — a stack trace, an internal id or a thrown message would have
shown up here, since this path has no `fast-json-stringify` backstop at
all.

## For a stakeholder — a status report, 2026-11-16

Still nothing on screen — Task 7.1.4 is the frontend. What exists now is
a real, reachable transport: `curl` (or any HTTP client) can start an
investigation and watch it run, live, over a real streaming connection.
Two real bugs were found and fixed before anyone else could hit them: a
startup crash that only a test spawning the actual built server could
see, and a genuine Node behaviour (headers are not sent until the first
byte of body) that would otherwise have made a reconnect to a finished
investigation hang forever on a real deployment.
