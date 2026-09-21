# Task 3.5.7 — A slow browser is dropped rather than tolerated forever

**Status:** Not started
**Story:** [3.5 Subscription Management & the Current Market State](STORY.md)
**Depends on:** 3.5.6

## Objective

Backpressure. **A browser that stops reading must not grow a queue inside the
backend.**

Criterion 4, and the reason it is a criterion rather than a nicety is in the
story's own scope note: _the failure mode of getting this wrong is a memory leak
that only appears on a slow connection during a busy session, which is the
hardest possible thing to find later._

## What the user can see when this lands

**Nothing**, on any healthy connection — which is the point. What it prevents is
the deployed backend growing without bound on a Tuesday afternoon because
somebody's train went into a tunnel with a tab open.

## Why it is its own task rather than part of the fan-out

Because it is a different failure and a different test. Task 3.5.6 is about
**correctness** — did the right client get the right symbol. This is about
**liveness under an adversarial peer**, and the only way to test it is to build
a client that deliberately stops reading, which is a piece of test apparatus
rather than an assertion.

They are also fixed in different places: the filter lives beside the broadcast,
the drop lives beside the socket.

## The shape

`ws` exposes the outbound buffer, and it is the only honest signal available —
a socket that is slow and a socket that is dead look identical at the API until
the buffer says otherwise. This is the same lesson §6.4 taught upstream in
reverse: **readyState is not liveness**, and there it held `OPEN` for 4 h 21 min
on a dead socket.

Two decisions this task owes, both with their reasoning recorded:

- **The threshold**, in bytes or in messages, taken from a measurement rather
  than argued. A tolerance is measured, never argued — that rule has cost this
  repository a full suite run once already.
- **What a dropped client is told.** A close code, and whether the browser's
  reconnect from Task 3.5.5 should treat it as _back off_ rather than _we are
  coming back_ — it is closer to the second, and getting it wrong produces a
  slow client that reconnects instantly and is dropped again in a loop.

## Work

- Measure the outbound buffer per client on send
- Drop a client past the threshold, with a close code the browser can read
- Log the drop with the client count, so an operator sees a pattern rather than
  an incident
- Test apparatus: a client that connects, subscribes and then **stops reading**
- Confirm the process's memory does not grow across a busy period with one such
  client attached

## Done when

1. A client that stops reading is **dropped**, not queued, and the process's
   retained memory returns to its prior level
2. The threshold is a measured figure with the measurement recorded beside it
3. A dropped client's close code does not cause Task 3.5.5's reconnect to hot-loop
4. Healthy clients on the same process are unaffected throughout — asserted,
   because "we dropped everybody" also passes a naive version of criterion 1
5. `pnpm break` proves the drop goes red when the threshold check is removed
6. `pnpm verify` passes

## Reversal trigger

**The first legitimate client that is slow by design** — a recording harness, a
low-priority background tab, an agent consuming the stream at its own pace.
At that point _drop_ stops being the only correct answer and a per-client rate
becomes the question.

---

## Amended by Task 3.5.2 — 2026-09-21: where the drop goes has moved

The gateway no longer subscribes to the stream. Observations now enter through
**`publishObservations`**, and every outbound write still passes through the
`send` helper inside `broadcast`.

So the threshold check belongs beside **`send`**, which is the one place a
payload meets a socket — and after Task 3.5.6 it is also where the per-client
filter sits, so both decisions about _should this client get this message_ end
up in one place rather than two.

Nothing else in this task changes. The measurement, the close code and the
interaction with Task 3.5.5's reconnect are unaffected.

---

## Amended by Task 3.5.5 — 2026-09-21: the close code you drop with is now load-bearing

**A dropped client will reconnect.** That is new, and it turns the choice of
close code from a detail into a policy decision.

`reconnect-policy.ts` reads the code:

| Close code        | First retry               | What the browser concludes                      |
| ----------------- | ------------------------- | ----------------------------------------------- |
| `1001` going away | **500 ms**                | _they are redeploying and coming straight back_ |
| anything else     | **2 s**, doubling to 30 s | _no intent; back off_                           |

**So dropping a slow client with `1001` produces a tight loop**: the browser
returns in half a second, is still slow, is dropped again, and the pair spends
the afternoon doing that. This task's earlier note asked that the close code
"not cause the reconnect to hot-loop" — the concrete form of that is
**do not use `1001`**, and prefer a code that means _this connection, not this
server_.

**The deeper question this task owes an answer to:** a client dropped for being
slow will come back **as slow as it was**. Backoff bounds the rate but does not
change the outcome, so the honest options are (a) accept a slow client cycling
at the 30 s ceiling as the degraded state, or (b) have the browser recognise
_dropped for backpressure_ and stop rather than retry.

**(a) is probably right** — §36 wants incremental degradation, and a reader
whose connection improves should recover without a reload — but it should be
**decided and written down** rather than inherited from whichever code is
convenient.

---

## Amended by Task 3.5.6 — 2026-09-21: the per-client fan-out changes what a slow client costs

### Where the drop goes, now that it exists

`clients` is a **`Map<WebSocket, Set<string>>`** rather than a `Set`, and
dropping one is `clients.delete(client)` — the same call the `close` and
`error` handlers already make. `send` is still the one place a payload meets a
socket, so the threshold check belongs there and will sit beside the per-client
filter rather than in a second place.

### What got worse, and it is the reason this task matters more than it did

**Every client now gets its own encoded message**, because the payloads
genuinely differ. Before 3.5.6 one `broadcast()` string was shared by every
socket; a slow client's outbound buffer grew by a **shared** payload.

Now each slow client accumulates **its own**. The memory a stalled browser can
cost is no longer bounded by one message per tick — it is one message **per
stalled client** per tick, and they do not share.

**Measure that rather than assume the old shape still holds.** A subscription
of one security is a few hundred bytes a minute; a subscription of the whole
universe is **56.9 KiB** a minute, and Story 3.6's overview asks for exactly
that. The worst case this task is protecting against is **a browser on the
overview that stops reading**, not a security page.

### And a size the threshold should be chosen against

The old single-payload figure is no longer the right denominator. Pick the
threshold from a measured buffer under a subscription that is **large**, since
that is the case that can hurt — and record the measurement beside the number,
because a tolerance is measured rather than argued.
