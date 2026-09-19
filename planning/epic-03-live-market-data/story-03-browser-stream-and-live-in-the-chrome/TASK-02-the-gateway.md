# Task 3.3.2 — The gateway: a WebSocket endpoint that serves browsers

**Status:** Not started
**Story:** [3.3 The Browser Stream & `LIVE` in the Chrome](STORY.md)
**Depends on:** 3.3.1

## Objective

A WebSocket endpoint on the Fastify server that accepts a browser, sends the
snapshot, and forwards the connection state. **One browser is enough**; fan-out
at scale is Story 3.5's.

## What the user can see when this lands

**Nothing.** A socket a developer can connect to with a command-line client.

## What is already decided and must not be re-taken

- **Separate from Epic 10's SSE stream** (§31). Market data is continuous and
  wants bidirectional subscription management; agent execution is an ordered
  stream of server-generated events. **Two things, not one with a flag.**
- **The inbound HTTP idle timeout is four minutes** (`CLAUDE.md`'s intended
  stack), which is a fact about **Epic 10's** stream rather than this one — but
  it is the reason to check what the platform does to an idle **WebSocket**
  before assuming it is exempt.
- **What a shutdown owes a connected browser** (§12.2): a **`feed` message**
  saying the feed is going away, **then** a close. Dropping the socket silently
  leaves the browser inferring a state from an absence, which is the ambiguity
  §11.2's thresholds exist to remove.
- **`registerMarketStreamCloser` already runs on `SIGTERM`**, ahead of the pool
  and inside the 5,000 ms ceiling. This gateway's own shutdown hangs off the
  same sequence rather than inventing a second one.

## Work

- **The endpoint**, registered like the other routes and **not** inside
  `buildServer()` if it needs the stream — `index.ts`'s existing ordering
  comment explains which side of that line a dependency puts it on.
- **Send the snapshot on connect**, then forward. §11.1's shape exactly.
- **Forward the CONNECTION STATE as its own message**, because §11.2 requires
  _our socket is fine and the market feed behind it is dead_ to be sayable, and
  a browser that only ever receives observations cannot distinguish a quiet feed
  from a dead one.
- **Say goodbye before closing.** The `feed` message, then the close.
- **Measure what the platform does to an idle socket**, and write the figure
  down. If it kills one at four minutes, this story's `LIVE` is a lie overnight
  and Story 3.10's reconnection becomes this story's problem instead.
- **No fan-out design.** One browser, one subscription, no coalescing — Story
  3.5 owns all three and §9.5 already settled that a browser subscribes to the
  **whole universe**, so there is no per-browser filter to build.

## Done when

- A browser can connect and receives the snapshot
- Connection state reaches the browser as its own message
- A `SIGTERM` sends the `feed` goodbye **before** the close, asserted in
  `pnpm test:process`
- **What the platform does to an idle socket is measured and recorded**, not
  assumed
- `pnpm verify` passes with no socket opened by the suite
