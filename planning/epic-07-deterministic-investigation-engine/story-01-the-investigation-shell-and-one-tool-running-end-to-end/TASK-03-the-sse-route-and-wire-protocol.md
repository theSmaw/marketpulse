# Task 7.1.3 — The SSE route & wire protocol

**Status:** Not started
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
