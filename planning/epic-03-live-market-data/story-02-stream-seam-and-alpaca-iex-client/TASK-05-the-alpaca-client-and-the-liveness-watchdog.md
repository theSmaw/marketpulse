# Task 3.2.5 — The Alpaca IEX client: `ws@8`, the handshake, and the watchdog that is the whole point

**Status:** Not started
**Story:** [3.2 The Market-Data Stream Seam & the Alpaca IEX Client](STORY.md)
**Depends on:** 3.2.4

## Objective

The real client — connect, authenticate, subscribe, read frames, hand them to
3.2.4's mapping — implementing 3.2.2's interface. **The first implementation,
deliberately, and before any convenience.**

## What the user can see when this lands

**Nothing**, and this is the largest task in the story with the least to show.
The socket runs inside the backend process and reaches no route and no screen.

## What is already decided and must not be re-taken — every line below is a measurement

- **`ws@8`, not Node's built-in `WebSocket`.** [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §4.6: the
  built-in can neither observe a server ping nor send a pong; §8.6 measured that
  this server closes such a client **5,999 ms** after the first unanswered ping.
  A client on the global would drop roughly **every 61 seconds, for ever.** `ws`
  is a new dependency and this is its justification.
- **Connection state is driven by the `authenticated` FRAME, never by
  `onopen`** (§4.5). The socket to `/v2/sip` opens and is greeted identically
  before the `409` arrives, and **the server leaves it open**.
- **Every error is a frame, not a closure, and a refused socket stays OPEN**
  (§4.2, §8.4). All four authentication failures leave the connection up
  indefinitely.
- **`402 auth failed` is byte-identical** for a wrong key, a wrong secret and no
  credential at all (§8.3). An operator log **cannot** distinguish them and
  **must not claim to.** `400 invalid syntax` is genuinely distinct and is the
  one an operator can act on differently.
- **`406 connection limit exceeded` is _wait and retry_, never fatal** (§8.2).
  The incumbent wins; a rolling replica replacement has two processes alive **by
  design** and the arriving one is this client. **A client that maps _refused_ to
  _stop_ has no feed after every deploy until somebody restarts it by hand.**
- **The close code carries nothing; the close latency carries everything**
  (§8.5). Five causes, all `1006`, empty reason — ~1 ms, ~240 ms, ~6 s, ~10 s,
  ~30 s apart.
- **The server heartbeats every 54 s** (§6.3, 53.96–54.85 s over 82 intervals),
  a property of the **connection** rather than the subscription. **So this
  product needs no keepalive of its own.**
- **A connection can die with no event at all** (§6.4) — `OPEN` for 4 h 21 min,
  no error, no close. **The watchdog is on INBOUND FRAMES, not `readyState` and
  not data**, firing at **165 s**.
- **Subscriptions are ours to re-assert** (§8.7) and the upstream set is a
  **constant** (§10.2) — the server remembers nothing, so there is no
  subscription state to restore. **A client that designs a resubscription
  protocol is designing for a problem this epic does not have.**
- **The socket's lifecycle is the process's** (§12.2): opened at boot, never
  scheduled, and **closed deliberately on `SIGTERM`** — which bounds the
  every-deploy outage at the existing `SHUTDOWN_TIMEOUT_MS` instead of §6.4's
  4 h 21 min.

## Work

- **Add `ws@8` and `@types/ws`** to `apps/backend` — the package declares what
  it imports, and this is a genuine import.
- **Transport only.** Connect, authenticate, subscribe to **a fixed handful of
  symbols** (universe scale is Story 3.5), read frames, hand them to 3.2.4. Drive
  3.2.2's state machine; do not grow a second one here.
- **The 165 s liveness watchdog on inbound frames.** Build it on a **monotonic**
  clock rather than the wall clock — a suspended or time-adjusted machine must
  not manufacture a disconnection.
- **`406` retries; `402` and `400` do not.** Write the backoff and **say in the
  code that it is politeness rather than penalty avoidance** — §8.7 measured
  that immediate reconnection is not penalised (717/709/709/722/694 ms, all
  authenticating). A backoff justified by a penalty that does not exist is a
  number nobody can ever revisit.
- **Close deliberately on `SIGTERM`**, wired into the existing signal handling
  in `index.ts` — which is the only file that exits.
- **Test every state against 3.2.3's corpus**, with **no network and no
  credential**. That is acceptance criterion 6 and what makes the suite a gate.
- **No reconnection policy beyond `406`** — Story 3.10 owns backoff and the gap
  a reconnection leaves. Report `disconnected` honestly and stop.

## Done when

- `createAlpacaStream` implements `MarketDataStream`; no method throws
- Every state in acceptance criterion 2 is reachable in a test against recorded
  frames — bad credential, duplicate connection, server-side close
- The watchdog fires at 165 s of **inbound silence** on a **monotonic** clock,
  proven with a fixture rather than a real wait
- `406` retries and the code says why the backoff is what it is
- `SIGTERM` closes the socket deliberately, and `pnpm test:process` covers it
- `pnpm verify` passes with **no network, no credential, no socket**
- `ws@8` is a declared dependency of `apps/backend` and of nothing else

## Notes

**Written before the replay, and that ordering is a mechanism rather than a
preference** — the story's own "what must not rot" item 3: _a convenience built
first becomes the thing everything is shaped around._ If this task slips, the
correct response is to let it slip rather than to build 3.2.7 first.
