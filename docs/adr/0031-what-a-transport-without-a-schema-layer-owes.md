# 0031 — What a transport without a schema layer owes, and where a rule about a connection lives

**Status:** Accepted
**Date:** 2026-09-19
**Story:** [3.3 The Browser Stream & `LIVE` in the Chrome](../../planning/epic-03-live-market-data/story-03-browser-stream-and-live-in-the-chrome/STORY.md)

## Context

Story 3.3 put a second transport into this product. Every route before it was
HTTP through Fastify, and two of that stack's guarantees were so reliable that
nobody had written down that they were **two**.

**This ADR exists because the next protocol is Epic 10's**, and its `EPIC.md`
knows nothing about either mechanism below. `PRODUCT_SPEC.md` §33's investigation
event stream has the same shape and the same hazard — typed events, a server
holding rich internal objects, no schema layer between them and a client — and
"doing neither" is how it reaches for `JSON.stringify` and re-learns the leak.

## Decision 1 — an HTTP schema buys TWO guarantees, and a transport without one must rebuild the second

> **Exhaustiveness is the type. Stripping is the serialiser. A transport without
> a serialiser has to rebuild the second.**

`satisfies Record<keyof T, JsonSchemaProperty>` buys **exhaustiveness**: a field
on the interface and not in the schema is `TS1360`. But _no internal detail
reaches a client_ is **not** that guarantee — it is `fast-json-stringify`
**stripping every property the schema does not declare**, which is a property of
the serialiser rather than of the type.

**A socket has neither, and the failure inverts:**

|                                            | HTTP response         | Socket message |
| ------------------------------------------ | --------------------- | -------------- |
| Field on the type, missing from the schema | **Vanishes** silently | —              |
| Field on the object, not on the type       | **Stripped**          | **LEAKS**      |

**An absence is a bug somebody eventually notices. A leak is a bug nobody
notices at all** — and what leaks is whatever a developer attached to the
internal object.

**The answer is `wire-serialiser.ts`'s field map**, and it is deliberately not a
runtime validator. `WireFields<T>` is a mapped type over `keyof T` **with `-?`**,
and `toWire` builds its output by walking **the map's keys rather than the
value's**:

- **Exhaustiveness** — a field added to `T` and not to the map is a compile
  error naming it.
- **Narrowing** — a property on the object and not on the type is **never
  read**, so it cannot be written.

**Why not a validator:** it checks at the moment of sending, so the leak becomes
a **test failure rather than a compile failure**, and only on a path a test
happens to cover. The field map makes the leak **unrepresentable** — the
offending property has nowhere to be written from.

Both halves were proven by substitution rather than asserted, and **re-proven
after a lint-driven refactor**, because a guard that stopped working during
cleanup would have looked identical.

### The runtime half is on the other side, and it is a value

`decodeMarketStreamMessage` returns a **value, never a throw**. A malformed
message from a server we wrote is a bug, but **a browser that throws on one takes
the page down**, which §36 forbids.

## Decision 2 — a rule about a connection's health lives with the vocabulary it produces

§11.2's two thresholds — 165 s inbound silence, 60 s without an observation —
were written for the Alpaca client. Story 3.3 gave the browser a second socket,
and **both apply the same rule to different events**.

> **A rule about a connection's health belongs with the vocabulary it produces,
> not with either socket that asks it.**

So `feedStatusFrom`, both thresholds and `worseFeedStatus` live in
`packages/shared/src/feed-liveness.ts`. What stays beside each socket is the
**adapter**: the backend's collapses a vendor handshake phase to one boolean,
the browser's has no handshake to collapse.

**Two copies of either number would be the defect one vocabulary over that
`pnpm break feed-words-in-a-renderer` already guards**, and the move cost
nothing because the module had been written for it — its inputs were arguments
rather than readings, so ADR 0017's ban on `packages/shared` reading a clock was
already satisfied.

### The corollary the browser forced

There are **two connections** between a venue and a reader, and the browser is
downstream of both. `worseFeedStatus` combines them, because **a chain is as
live as its weakest link**: a browser whose own socket is healthy has learned
nothing about the market if the backend's feed is dead, and the backend's last
word of `live` is not evidence of anything once we cannot hear it.

## Decision 3 — one indicator may tell another WHEN TO LOOK; it may not tell it what it sees

The live feed is the first surface in this chrome that is **faster than its
neighbours** — it notices in the same tick, against a 30-second health poll.
Measured on a running page: kill the backend and the strip read
`market feed · disconnected` beside `backend service · healthy`, each cell
honest about its own subject and **the pair pointing away from the fault**.

The shortcut — feeding the socket's state into the backend indicator — was
refused. It would make one cell's word depend on another's evidence and collapse
two facts that fail independently, which is Task 1.12.4's argument for the sixth
time.

**`recheckOn` is a prompt**: a lost socket makes the health check **run**, and
what it reports is its own HTTP result. It is `useBackendHealth`'s own existing
rule with a second trigger — the loop already polls immediately when a hidden tab
becomes visible, _"so a returning user does not read a stale state."_

**The general form, which is what outlives this story:** reviewing a set of
status surfaces _as a set_ used to mean reviewing them at one instant, because
they all learned things at the same rate. **A surface added to a status strip is
now reviewed against the others at the RATES they learn things.**

## What this ADR does not decide

- **Reconnection.** Story 3.10's. `disconnected` is reported honestly and the
  transport stops.
- **Fan-out.** Story 3.5's. One browser, one subscription, no coalescing.
- **Whether Epic 10 uses the field map.** It is handed the mechanism by name;
  the decision is that epic's, and the point of this record is that it is made
  rather than defaulted.

## Consequences

- A new transport in this product inherits a stated obligation rather than an
  HTTP habit.
- `packages/shared` gains connection rules, which is a widening of its remit —
  it held types and vocabulary before. The boundary that keeps it honest is
  unchanged: ADR 0017 means every clock is an argument.
- **A third consumer of §11.2's thresholds costs nothing**, which is the test of
  whether decision 2 was right.

## Alternatives rejected

- **A runtime validator on the send path** — see decision 1. It converts a
  compile failure into a test failure on a covered path.
- **Duplicating the thresholds per socket** — two copies of a measured number,
  which this repository has watched go stale before.
- **Letting the socket set the backend indicator's state** — decision 3.
- **A `satisfies`-shaped schema for the socket** — it buys exhaustiveness and
  not stripping, which is precisely the half that matters here.
