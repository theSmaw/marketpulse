# Task 3.3.1 — The browser protocol, and the guard that plays `satisfies`'s role on a socket

**Status:** Not started
**Story:** [3.3 The Browser Stream & `LIVE` in the Chrome](STORY.md)
**Depends on:** 3.2 (complete)

## Objective

The message types the browser and the server agree on, in `packages/shared` —
**and the mechanism that stops a field added to a type and forgotten on the wire
becoming a leak.** No socket, no route, no component.

## What the user can see when this lands

**Nothing.** Types and a guard.

## What is already decided and must not be re-taken

- **The protocol is §11.1's**: a **snapshot on connect, then one message per
  upstream frame**. The snapshot is the backend's current-state object
  serialised, and **absence is expressed by omission** — an entry for every
  security observed and **no entry at all** for the rest. After a restart the
  snapshot is `{}`, and that is the **true** answer rather than a degraded one.
- **No `staleSeconds` on the wire** (§11.1). Every entry carries its
  observation's **own instant**; a derived age is a clock read wearing a
  different name, and ADR 0017 forbids `packages/shared` reading one.
- **A security gets NO status word** (§11.2). The gap between one security's
  bars has a p50 of 1 minute and a **maximum of 187**, so no threshold separates
  a quiet security from a broken one. A security carries **the age of its
  observation**; `STALE` beside a price is a judgement this product cannot
  support.
- **The client renders from an ordered stream of TYPED events**, never from
  anything it parses loosely. That is `PRODUCT_SPEC.md` §33's rule for the
  investigation stream and it applies here for the same reason.
- **WebSocket for market data, SSE for agent events** (§31). Two streams, two
  semantics. **Do not build one thing with a mode flag.**

## Work

- **Define the message union** in `packages/shared`, with a **version**. Both
  halves of the wire import one definition — the reason `Bar` and the provenance
  vocabulary live there, applied to a protocol.
- **Decide and build the guard that plays `satisfies`'s role**, which is this
  task's real work. Every HTTP route here declares its schema with
  `satisfies Record<keyof T, JsonSchemaProperty>`, so a field on the interface
  and not in the schema is **`TS1360`** rather than a value that vanishes.
  **A socket message has the same failure and none of the same machinery.**

  **And the trap is WORSE on a socket, which is the sentence to design against:**
  `fast-json-stringify` strips every property a schema does not declare, so an
  undeclared field on an HTTP response **disappears**. Nothing strips a socket
  message. So the failure mode inverts — **an absence becomes a leak**, and the
  thing that leaks is whatever a developer attached to an internal object.

- **Write the encode/decode boundary as pure functions**, so every message shape
  is testable with no socket at all. The precedent is `alpaca-stream-mapping.ts`,
  one layer over.
- **A malformed message is a value, never a throw** — `PROVIDER.md` §8.5's line,
  and the browser is the side that must not crash.

## Done when

- The message union and its version exist in `packages/shared`
- **A field added to a message type and not to its encoder is a COMPILE ERROR**,
  demonstrated by adding one and showing the error, then removing it
- A malformed inbound message decodes to a value rather than throwing
- The snapshot's **omission** semantics are encoded in the type, not a comment —
  an absent security is unrepresentable as "present but empty"
- No module in this task opens a socket
- `pnpm verify` passes

## Notes

**The guard is the deliverable, not the types.** Types anyone can write; the
question this task exists to answer is _what stops the socket's version of
`TS1360` from being a code review_. If the honest answer turns out to be "a
runtime validator", say so and build it — but do not leave the question
unanswered, because §33's ordered-typed-events rule is load-bearing for Epic 10
as well and this is where the shape is set.
