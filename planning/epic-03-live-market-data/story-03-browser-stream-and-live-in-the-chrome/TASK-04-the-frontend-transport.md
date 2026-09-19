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
- **`stale` is gated on the market being open** (§11.2). Out of hours the same
  socket is legitimately silent for **76 minutes**.

  **AMENDED 2026-09-19 after Task 3.3.1, and this is now a decision this task
  owes rather than an inherited fact.** That task put `marketOpen` on the wire
  in `WireFeedState`, **so the browser now has two answers** to _is the market
  open_:

  | Answer                     | Whose clock      | What it is about                                    |
  | -------------------------- | ---------------- | --------------------------------------------------- |
  | `WireFeedState.marketOpen` | The **server's** | What the feed's own gate actually used              |
  | `useMarketClock`           | The **viewer's** | What this person's machine says the market is doing |

  **They can disagree, and the disagreement is the point rather than a bug.**
  `marketSessionStateAt` takes an instant (ADR 0017), so it is only as good as
  the clock supplied — a viewer an hour out would compute a different session
  state from the server's, and gating on theirs would suppress or invent a
  staleness warning about a feed the server can see perfectly well.

  **Decide which drives the status, and say why in the code.** The likely answer
  is the **server's**, because the status describes the server's feed — but
  `MarketClock` must keep rendering the **viewer's**, because that region is a
  timezone claim about the person reading it, and this story's `Out of scope`
  explicitly refuses to turn it into a synchronisation claim.

  **Do not let them silently be the same variable.**

### `feed: null` is a THIRD thing, and the hook is where it stops being confusable — added 2026-09-19 after Task 3.3.3

`connectionWordFor(status, feed)` returns **`null`** when the feed identity is
`null`, because §11.3's grid gives the unconfigured row a `—` in the connection
cell rather than a word. **That rule is already written and this task must not
re-derive it** — but it lands two obligations here:

- **A `feed: null` state has no connection to age.** Do not run §11.2's 60 s and
  165 s thresholds over a deployment that was never asked to connect to
  anything: a staleness threshold applied to a feed that does not exist produces
  a transition between two states that are both _nothing is configured_.
- **`the server has no provider` and `we lost the server` are two different
  facts and both arrive as `disconnected`.** The first is what the gateway sends
  (3.3.2); the second is this hook noticing its own socket is gone. **They are
  distinguishable here and nowhere above here** — once the hook has collapsed
  them into one `FeedStatus`, no component can tell them apart. See the open
  question in [`STORY.md`](STORY.md); **do not settle it by accident in a
  reducer.**

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
- **Handle the `unreadable` decode, which Task 3.3.1 made a value rather than a
  throw.** `decodeMarketStreamMessage` returns
  `{ kind: "unreadable", reason }` for a malformed message, **and something has
  to do something with it.** The transport must not crash — that is the whole
  reason it is a value — but a message the browser cannot read is also not
  nothing: dropping it silently means a protocol mismatch after a deploy looks
  identical to a quiet feed. **Decide whether it is logged, counted, or surfaced,
  and record which.**
- **A `feed` message arrives every 120 s whether or not anything changed —
  added 2026-09-19 after Task 3.3.2.** The gateway keeps the socket alive
  against Azure's **240-second idle** ingress timeout, because §6.6 measured our
  own feed legitimately silent for **76 minutes** out of hours and an
  unkeepalived socket would be cut every four minutes all night.

  **Two consequences for this hook, and the second is the subtle one:**

  1. **An unchanged state must not cause a render.** Story 3.3's criterion 6
     measures the render count against `useMarketClock`'s baseline — lifting
     that hook to `App` produced **40 re-renders in 20 s against 0**. Thirty
     keepalives an hour is not that, but a hook that notifies on every message
     rather than on every _change_ is the same defect at a lower rate, and it is
     free to avoid.
  2. **The keepalive is ALSO the browser's liveness signal, and that is a
     stronger position than the backend's.** Story 3.2's client watches inbound
     frames because the vendor's 54 s heartbeat is the only thing distinguishing
     a quiet feed from a dead one. Here the gateway's 120 s keepalive plays the
     same role — **so a browser that has heard nothing for 165 s has genuinely
     lost the socket**, rather than merely watching a quiet market. Say so where
     the threshold is applied, because it is the reason the same number means
     something different on this side.

- **No reconnection policy** — Story 3.10's. Report `disconnected` honestly and
  stop. **Say so in the code**, because a transport is exactly where somebody
  adds a retry loop without noticing it is a policy.

## Done when

- One module knows the socket URL; a grep proves nothing else does
- The hook's transition is a pure function with tests and **no socket**
- Both clocks are taken, and a test proves `stale` is reachable — the regression
  that made it unreachable is the reason this is an acceptance criterion
- A closed socket produces a state, not a thrown render
- **An `unreadable` message has a decided disposition** — not dropped by default
- **A keepalive `feed` message carrying an unchanged state causes no render**
- **Which `marketOpen` gates the status is decided and argued in the code**, and
  `MarketClock` still renders the viewer's clock
- **No component consumes the hook yet**
- `pnpm verify` passes
