# 0050 — The `AgentProvider` is keyed by investigation id, the SSE transport decisions, and the domain-type split

**Status:** Accepted
**Date:** 2026-11-17
**Story:** [7.1 The Investigation Shell, & One Tool Running End to End](../../planning/epic-07-deterministic-investigation-engine/story-01-the-investigation-shell-and-one-tool-running-end-to-end/STORY.md)
**Tasks:** [7.1.1](../../planning/epic-07-deterministic-investigation-engine/story-01-the-investigation-shell-and-one-tool-running-end-to-end/TASK-01-the-domain-model-and-tool-contract.md) (the domain model and tool contract), [7.1.2](../../planning/epic-07-deterministic-investigation-engine/story-01-the-investigation-shell-and-one-tool-running-end-to-end/TASK-02-the-security-snapshot-tool-and-scripted-agent-provider.md) (the scripted provider), [7.1.3](../../planning/epic-07-deterministic-investigation-engine/story-01-the-investigation-shell-and-one-tool-running-end-to-end/TASK-03-the-sse-route-and-wire-protocol.md) (the SSE route), [7.1.4](../../planning/epic-07-deterministic-investigation-engine/story-01-the-investigation-shell-and-one-tool-running-end-to-end/TASK-04-the-security-page-ui.md) (the UI)

## Context

`PRODUCT_SPEC.md` §32 names the shape an agent provider must have and §33
names the events it streams, in both cases as pseudocode rather than a
contract this repository had ever built against. Story 7.1 is the first to
build it, against the cheapest possible tool (a security snapshot) so the
pipe itself — domain model, orchestration, streaming, UI — could be proven
before any of the next six tools exist. Three decisions follow, each one a
divergence from or an addition to what §32/§33 state, and each one load-
bearing for every later story in this epic rather than a detail local to
this one.

---

## Decision 1 — `AgentProvider` is addressed by investigation id, not one instance per run

§32's own pseudocode is parameterless:

```text
AgentProvider

runInvestigation(context, tools)
streamEvents()
cancel()
```

That shape presumes **one provider instance per investigation** — a fresh
object stands up to run one investigation and is discarded. Story 7.1 ships

```text
runInvestigation(context, tools)
streamEvents(id, fromSeq)
cancel(id)
```

**one long-lived provider**, addressed by investigation id on every call
after the first.

This was confirmed necessary rather than assumed, by looking at what the
epic itself already commits to: Story 7.6's `Current investigations` region
on `/` is specified as a **list**, which means more than one investigation
exists in this process's memory at once, and a UI driven by polling or by a
second stream subscription has to be able to name _which_ one it is asking
about. A one-per-instance provider has no second investigation to be asked
about — the shape is only coherent if "the application has at most one
investigation in flight," which this product does not claim anywhere.

The investigation store (`investigation-store.ts`) backs this: a bounded
map, 200 entries, evicting the oldest **completed** investigation first,
never one still running (AC 9) — the same bound every other in-memory
structure in this product states. `streamEvents(id, fromSeq)` and
`cancel(id)` are both lookups into that one map, which is what keeps the
provider itself stateless between calls: it holds no per-run closure, only
a reference to the store.

**`cancel(id)` is a documented no-op in this story** — it does not move an
investigation's status, because nothing in this story's own scripted
pipeline runs long enough to need cancelling mid-flight. Story 7.5 is where
it does something.

---

## Decision 2 — The SSE transport: `fetch` + `ReadableStream`, monotonic `seq`, no keepalive yet, and two real defects `reply.hijack()` introduced

**`fetch` + `ReadableStream`, never `EventSource`.** `EventSource`
reconnects automatically on any drop, with no way to suppress it and no
custom header on the request — which would silently start a **second**
investigation on a flaky connection, exactly the state the second-press
idempotency rule (§32's own `runInvestigation` called twice for one
symbol) exists to prevent, and it would also drop this product's own
correlation id from the one transport that most needs it to debug a lost
stream. `investigation-stream.ts` is therefore a second, deliberate `fetch`
call site in a codebase whose own docblock had called `api-client.ts` "the
only file… that calls fetch" — an SSE body is an open stream a reader
consumes incrementally, not one JSON request answered by one JSON
response, and folding it into that client would make its own method
signature a lie for every other caller. `api-client.ts`'s docblock and
`CLAUDE.md`'s repo map both carry the dated correction this story owed.

**Every event carries a monotonic `seq`, and a client attaching after the
start replays from `seq 0` (or `?from=N`).** Without this, the events
emitted between a `POST /investigations` and the client's own attach to
`GET /investigations/:id/events` are lost and the checklist draws nothing —
not a corner case, the common one, since the two requests are never atomic
from the browser's own point of view.

**No keepalive ships in this story, and that is a decision rather than an
oversight.** `HOSTING.md` already names the constraint this story's stream
could in principle meet: Azure Container Apps' 240-second inbound idle
timeout, which closes an SSE connection that goes quiet for four minutes. A
single-step investigation against the security snapshot tool completes in
milliseconds, so the route terminates the HTTP response immediately after
its own terminal event (`isTerminalEventType`) — which is also what lets
`app.inject()` assert the whole six-event sequence in one call, rather than
needing a browser. The keepalive becomes load-bearing the first time a run
is held open across multiple steps, which is Story 7.5's or later — not
this one's, and `HOSTING.md` carries a dated correction recording that the
stream this constraint was written against now exists, in Epic 7 rather
than Epic 10.

> **Amended 2026-11-18 (Story 7.2, Task 7.2.1): this decision's own
> reversal trigger has FIRED, and it fired three stories earlier than the
> guess beside it.**
>
> The trigger as worded — _the first tool call to complete while a second
> one is still queued_ — is met by Story 7.2 **literally and on every
> machine**, not as a consequence of slow tools:
> `scripted-agent-provider.ts` mints all five `QueuedStep`s before its loop
> starts, so the second tool is queued while the first is still running, on
> the very first press, however fast the tools are. The paragraph above is
> left standing as the record of what was decided and why; the guess
> "Story 7.5's or later" is simply wrong, which is what a trigger written
> as a **condition** rather than a story number is for — the condition
> fired correctly and the story number in the prose did not.
>
> **What shipped is the keepalive alone.** An SSE comment line
> (`: keepalive\n\n`) written on an interval and cleared in the same
> `finally` that already ended the stream, at
> `SSE_KEEPALIVE_INTERVAL_MS = 240_000 / 3` — **80 s**, one third of the
> ingress ceiling, which is `market-gateway.ts`'s own derivation
> (`KEEPALIVE_INTERVAL_MS = DISCONNECTED_AFTER_MS / 3`) applied to this
> transport's own ceiling rather than a number picked for looking safe, and
> spelled as the division so the relation cannot decay. The interval is
> **injectable** on `createInvestigationRoutes` for the same reason
> `market-gateway.ts` seams its own `setTimer`/`clearTimer`: a timing
> guarantee whose only assertion takes 80 seconds to make is one nobody
> runs.
>
> **Two consequences this decision's text did not anticipate.** The
> `app.inject()` property it gave as a reason for terminating the response
> — _which is also what lets `app.inject()` assert the whole six-event
> sequence in one call_ — is **unaffected**: the response still ends on a
> terminal event, so the keepalive is additive and no existing assertion
> moved. And a comment frame is a **no-op frame by the SSE specification**,
> so nothing downstream had to learn a new event type and `seq` still
> counts real events only; that `investigation-stream.ts`'s hand-rolled
> parser drops one was **confirmed by assertion before the backend relied
> on it**, rather than assumed, because a parser that read a keepalive as a
> malformed event would have put the checklist into a failure state every
> 80 seconds on a healthy stream.
>
> **A second amendment in the same change, on a different sentence of this
> ADR.** Story 7.2's own Gate 1 considered concurrent tool dispatch and
> rejected it, keeping the orchestrator sequential — unanimously across
> three technical shaping passes — on the ground that `RunnableTool.run`'s
> own **signature** is what makes tool independence true: there is no
> channel through which one tool could read another's output, so the
> guarantee does not depend on dispatch order and survives Epic 10's
> model-backed provider unchanged. Nothing in this ADR became false;
> this extends it with an alternative it had no cause to consider when
> there was one tool. `pnpm invariants` now holds the structural half —
> `a-tool-takes-no-channel-to-another-step`, over the contract file rather
> than over the tools, because a tool cannot widen its own `run` past what
> the contract declares.
>
> **And the terminal-event vocabulary gained a member.**
> `TERMINAL_EVENT_TYPES` was `["INVESTIGATION_COMPLETED"]` alone, with
> `INVESTIGATION_FAILED` deferred to Story 7.5 in both
> `packages/shared/src/investigation.ts` and its own test. That deferral's
> condition — a run that can fail outright — also fired at Story 7.2,
> whose tools read a database and a trading calendar where Story 7.1's
> read an in-memory `Map`: before Task 7.2.1, a thrown tool left
> `runInvestigation`'s loop with **no terminal event at all**, so the
> investigation sat `running` for ever, the SSE response never ended, the
> store never evicted the entry, and `POST /investigations`' second-press
> idempotency handed the stuck run back — `Investigate` was permanently
> dead for that symbol until a backend restart. `INVESTIGATION_FAILED`
> ships as the **terminal event alone**: it carries a `failedAt`, a count
> of the steps that completed, and **no step id, no reason and no thrown
> message**. Which step failed and what a reader is told about it remain
> Story 7.5's, which already has `FailedStep.reason` typed and waiting.

**`reply.hijack()` is the first use of that mechanism in this codebase, and
it cost two real defects — both found by driving the route with something
other than `app.inject()`, and both fixed in this story.** Hijacking takes
a reply out of Fastify's entire response pipeline, so nothing downstream of
the handler runs for it:

- The correlation-id `onRequest` hook in `server.ts` sets the header on the
  _managed_ reply object, which a hijacked response never flushes — so the
  header has to be written again, by hand, directly onto `reply.raw`.
- `@fastify/cors` attaches through the identical mechanism (an `onRoute`
  hook adding its own `onSend`/preflight handling), which this story's own
  build had not connected to the correlation-id finding above until a real
  browser's `fetch()` to the events route failed outright with `TypeError:
Failed to fetch` while `curl` against the identical request returned a
  clean `200` — CORS is enforced by the browser, never by the server or by
  `app.inject()`, so nothing short of an actual browser could have caught
  this. Fixed the same way: `access-control-allow-origin` and
  `access-control-expose-headers` written by hand onto the hijacked
  response, asserted directly in `routes/investigations.test.ts` rather
  than relied on through the plugin.

The lesson generalises past this one route: **any later stream or response
this product hijacks inherits the identical gap**, for the identical
reason — `reply.hijack()` does not partially bypass Fastify's pipeline, it
exits it entirely, and every hook that pipeline would otherwise have run
has to be re-stated by hand at the hijack site.

---

## Decision 3 — Wire-shape types in `packages/shared`; provider and tool contracts stay backend-only

Two different kinds of type exist in this story and they do not share a
home, by design:

- **What travels on the wire** — `WireInvestigation`,
  `WireInvestigationEvent` and the six per-member `toWire*` functions — live
  in `packages/shared/src/investigation.ts`, the same `WireFields`/`toWire`
  idiom this codebase already uses everywhere a leak must be structurally
  impossible rather than merely avoided (invariant 11: the event payload
  reaching the wire is serialised from the tool's own return value and
  nothing the orchestrator composes). `packages/shared` is also where the
  curated universe and the market-stream wire types already live, so this
  is a second instance of an existing rule rather than a new one.
- **What a tool or a provider IS** — `AnalyticalTool<Input, Output>`,
  `ToolContext`, `RunnableTool`, `AgentProvider` — stays in
  `apps/backend/src`, never `packages/shared`. `analytical-tool.ts`'s own
  docblock states why: "a tool holds no credential, but its shape is
  infrastructure a frontend has no business depending on," the same
  reasoning `market-data-provider.ts` already keeps its own interface out
  of the browser's type graph for (invariant 7, provider abstractions at
  the edges). A frontend that could import `AnalyticalTool` could also be
  handed a vendor SDK type leaking through a future tool's own `Input`,
  which is exactly what invariant 7 exists to make impossible by
  construction.

The frontend's own decoded event type, `WireInvestigationEvent`
(`investigation-event.ts`), is a **third, deliberately separate** type from
both of the above: it carries string dates where the backend's domain
events carry `Date`s and branded ids, mirroring `market-stream-protocol.ts`'s
own established three-member decode result (`event` / `unreadable` /
`unsupported`) rather than reusing the backend's wire type directly. A
frontend module that imported the backend's `WireInvestigationEvent`
(if one existed with that exact shape) would be coupling two packages' own
notions of "what arrived" rather than each owning its own; keeping a
frontend-local type is the same reasoning `packages/shared` consumption as
**built output** already enforces at the build level, applied one layer
further in.

`ToolContext.asOf` is the one field of the backend-only contract worth
naming specifically: every tool receives "now" as an argument rather than
reading the process clock itself, which `analytical-tool.ts`'s own docblock
states is what makes Epic 13's replay isolated **by construction** rather
than by a convention a later tool can quietly break. This story's own tool
does not yet need it — the one thing it will ever disagree with the clock
about is "how old is this bar," and it already gets that as `ageMs` from
`current-market-state.ts` — but the hook exists now so a later, more
clock-sensitive tool cannot be built without it. `pnpm invariants`'
`a-tool-reads-no-clock` makes the rule mechanical: no file matching a
tool's own `): AnalyticalTool<` return-type annotation may call `Date.now()`
or a zero-argument `new Date()`.

---

## Consequences

- **A later `AgentProvider` implementation (Epic 10, model-backed) swaps in
  against the identical `(id, fromSeq)`/`(id)` contract**, never touching
  this story's own callers — the route, the store, and the frontend's
  stream consumer all address a provider by investigation id already, so a
  model-backed implementation only has to honour the same addressing, not
  introduce it.
- **Every later tool inherits `ToolContext.asOf` and the backend-only
  contract boundary for free**, and `a-tool-reads-no-clock` catches the
  first one that does not use it.
- **Every later stream or hijacked response in this product should budget
  for re-stating whatever Fastify hook it bypasses**, per Decision 2's own
  lesson — this is now written down once rather than re-discovered per
  route.
- **The keepalive this story declines to ship is a known, dated debt**,
  named in `HOSTING.md` and owned by "the first run held open across
  multiple steps" as a condition rather than a story number.

## Alternatives rejected

- **A provider instance per investigation**, matching §32's literal
  pseudocode. Rejected because Story 7.6's own list region already commits
  this product to more than one concurrent investigation, which a
  one-per-instance shape cannot address.
- **`EventSource`** for the transport. Rejected: automatic, unsuppressable
  reconnection would silently start a second investigation on a dropped
  connection, and it carries no custom request header for the correlation
  id this product already attaches everywhere else.
- **A keepalive shipped now, against a stream that never holds open long
  enough to need one.** Rejected as premature: nothing in this story's own
  scripted, single-step pipeline runs long enough to go quiet for four
  minutes, and a keepalive with no reachable failure mode is a line of code
  nothing exercises.
- **Reusing the backend's wire event type on the frontend directly.**
  Rejected for the same reason the market-stream wire already has a
  frontend-local decode result: a frontend that decodes strings into `Date`s
  is a different concern from a backend that mints them, and collapsing the
  two types couples what either side is allowed to change independently.

## Reversal trigger, as a condition

**The keepalive.** The first investigation run this product holds open
across more than one step — the first tool call to complete while a second
one is still queued — is the condition under which Decision 2's "no
keepalive yet" stops holding, and whoever builds that run owes the
four-minute emission `HOSTING.md` already names.
