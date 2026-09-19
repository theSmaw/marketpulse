# Task 3.3.4 — The frontend transport: one module that knows the URL

**Status:** Not started
**Story:** [3.3 The Browser Stream & `LIVE` in the Chrome](STORY.md)
**Depends on:** 3.3.3

## Objective

The browser's side of the socket — **one module, one place that knows the
address**, and a hook above it holding domain state. No component changes.

## What the user can see when this lands

**Nothing.** A hook nothing calls yet.

## What is already decided and must not be re-taken

- **`api-client.ts` is the only file in the application that calls `fetch`**,
  and that is a stated property of this repository. **A socket is a second
  boundary and wants the same treatment**: one module, one place that knows the
  URL, everything above it holding domain state.
- **Configured at BUILD time**, like every other frontend value — which means
  the deployed frontend **cannot be pointed at a different backend without a
  rebuild**, and that is the existing consequence rather than a new one.
- **Two clocks** (delivered by Task 3.2.6, in this story's `STORY.md`):
  `disconnected` at 165 s is **monotonic**; `stale` at 60 s is **wall clock**.
  Using one for both makes `stale` **unreachable** — it shipped that way once.
  Anything here computing a status or an age takes **both**.
- **`stale` is gated on the market being open** (§11.2), and the market clock
  that gates it is Story 2.5's and already in the chrome. Out of hours the same
  socket is legitimately silent for **76 minutes**.
- **There is no store** (§12.1, ADR 0023). Live state has **one writer** — the
  message handler — and many readers, and **age is derived rather than held**.
  The walk is recorded; do not re-take it because prop-drilling chafes.

## Work

- **The transport module.** Connect, decode with 3.3.1's boundary, hand typed
  messages up. It knows the URL and nothing above it does.
- **The hook.** State as a plain discriminated union whose transition is a
  **pure function** — `FRONTEND-STATE.md` §1's shape, which is what keeps a
  later store a re-wiring rather than a rewrite.
- **Derive the status in the browser** from the connection state and the
  observation instants, taking both clocks. **Do not send a status the server
  computed** — §11.1 has no `staleSeconds` on the wire for the same reason.
- **A closed socket is a state, not an error boundary.** §36 forbids collapsing
  to a global error screen, and this is the first place in the frontend where
  that is testable.
- **No reconnection policy** — Story 3.10's. Report `disconnected` honestly and
  stop. **Say so in the code**, because a transport is exactly where somebody
  adds a retry loop without noticing it is a policy.

## Done when

- One module knows the socket URL; a grep proves nothing else does
- The hook's transition is a pure function with tests and **no socket**
- Both clocks are taken, and a test proves `stale` is reachable — the regression
  that made it unreachable is the reason this is an acceptance criterion
- A closed socket produces a state, not a thrown render
- **No component consumes the hook yet**
- `pnpm verify` passes
