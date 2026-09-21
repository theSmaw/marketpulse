# Task 3.5.7 — A slow browser is dropped rather than tolerated forever

**Status:** **Complete — 2026-09-21.** A stalled browser cost **33.6 MB and rising**; it now costs **1.1 MB and stops**. The threshold is measured rather than argued, and the close code moved to `packages/shared` because it turned out to be one fact with two ends.
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

---

## What was measured, before anything was built

**A throwaway instrument, run against the real gateway with a client that
stops reading** — `socket.pause()` on the underlying stream, which is what _not
reading_ means in Node: the kernel receive buffer fills, TCP flow control stops
the server, and the server's own outbound buffer is what grows.

| Universe batches published | Peak `bufferedAmount` |
| -------------------------- | --------------------- |
| 100                        | 5.1 MB                |
| 600                        | **33.6 MB**           |

**Linear and unbounded** — one payload per batch once the kernel stops
absorbing, at a measured universe payload of **57,024 bytes**.

**The number that actually decided the threshold is the other one in that run.**
`bufferedAmount` stayed at **0** for the first ~10 batches: the kernel absorbed
roughly **557 KiB** before the WebSocket layer held anything at all.

> **A threshold below ~557 KiB would never fire on loopback** — a check that
> silently does nothing, which is the shape this repository has shipped before
> and the reason `pnpm break` exists.

So: **1 MiB**, about eighteen universe payloads, clear of the kernel's own
absorption so a momentarily slow reader is not punished for a hiccup. Reached
after **30 batches** in practice — predicted 28, which is close enough to
confirm the arithmetic rather than to re-derive it.

## What it costs now

Same instrument, same stalled client, with the drop in place:

|                | Before                  | After                            |
| -------------- | ----------------------- | -------------------------------- |
| Client dropped | never                   | **after 30 batches**             |
| Process heap   | 13.4 MB → **unbounded** | 13.4 MB → **14.5 MB**, and stops |

**Criterion 1, in figures rather than in prose.**

## The close code, and the decision it forced

**`1013 try again later`, and deliberately not `1001 going away`.**

`reconnect-policy.ts` reads the code: `goingAway` means _we are redeploying_
and retries in **500 ms**. Dropping a slow client with it produces a tight
loop — back in half a second, still slow, dropped again, all afternoon.
Anything else backs off to a 30 s ceiling.

### It moved to `packages/shared`, because it is one fact with two ends

The backend picks a code and the browser decides what it means, and writing the
test exposed that those were **two literals in two packages**: the backend test
could not reach `reconnectDelayMs`, which is exactly the shape of a protocol
disagreement no test on either side could see.

`MARKET_STREAM_CLOSE` now holds both, and each end asserts its own half —
the gateway that it does not send `goingAway`, the policy that it backs off on
`slowClient`.

### And the browser is deliberately NOT told to stop

**The deeper question this task owed an answer to**, settled rather than
inherited: a client dropped for being slow comes back **as slow as it was**, so
backoff bounds the rate without changing the outcome.

**Cycling at the 30 s ceiling is the degraded state**, and it is the right one:
§36 wants a reader whose connection improves to recover **without a reload**,
and a browser that had given up could not. The alternative — teach the browser
to recognise _dropped for backpressure_ and stop — buys a quieter log at the
cost of a reader who has to notice and refresh.

## What Task 3.5.6 changed about this task's stakes

Its amendment was right and the measurement confirms it. **Each client now
accumulates its own encoded payload** rather than sharing one broadcast string,
so a stalled browser costs one message **per stalled client** per tick. The
57,024-byte figure above is a _universe_ subscription — Story 3.6's overview —
and that is why the threshold was chosen against a large subscription rather
than a security page's few hundred bytes.

## Evidence

- `pnpm break a-slow-browser-grows-a-queue-forever` — red, restored
  byte-identical
- 4 process tests: the drop fires; a **healthy client on the same process is
  untouched and still served**; the code is not `goingAway`; the threshold is
  clear of the kernel's absorption
- 2 policy tests at the browser's end: it backs off, and it never gives up
- `pnpm verify` green: 16 invariants, 921 backend, 1052 frontend, **33** process
- `pnpm e2e` green against CI's own store: **140 passed**
- `pnpm test:database` green: 170 tests

### One thing the test apparatus taught

**`afterEach` had to `terminate` rather than `close`.** A client whose socket is
paused never completes a graceful close — the handshake needs a read that is
not happening — so the hook hung for its full 30 s timeout and reported it as
_the test_ failing. The note is on the hook, because the next person writing a
backpressure test will hit it in the same minute they write it.

---

## For a stakeholder — a status report, 2026-09-21

### What we did, in one sentence

**A browser that stops listening no longer costs us memory forever.**

### What was wrong

When the server sends a price to a browser, it assumes the browser takes it. If
the browser has stopped taking things — a laptop asleep, a phone in a tunnel, a
tab the operating system has frozen — the prices do not vanish. They queue up
inside our server, waiting for a reader who has gone.

**We measured it before fixing it**, because the size of a problem decides the
shape of its fix. A single stalled browser subscribed to all 518 companies
accumulated **5 MB after a hundred price updates and 34 MB after six hundred**,
growing in a straight line with no ceiling at all.

That is the kind of failure that never shows up in testing and then takes a
production server down on a Tuesday afternoon — it needs a real slow connection
during a real busy session, which is precisely the combination nobody arranges
on purpose.

### How we fixed it, and how we chose the number

The server now watches how much unsent data each browser owes it, and
disconnects one that falls too far behind. After the fix, the same stalled
browser costs **1.1 MB and then stops**.

The threshold is **1 MB**, and the interesting part is how that number was
chosen rather than what it is.

When we measured, the queue stayed at **zero** for the first ten updates — the
operating system quietly absorbs about half a megabyte before our own software
sees anything at all. **So any limit below half a megabyte would never have
triggered.** It would have looked like a working safeguard, passed every test
we wrote for it, and done nothing. We set the limit comfortably above what the
operating system absorbs, so a browser that hiccups for a moment is not punished
and one that has genuinely gone is caught.

### The decision that took the most thought

When we disconnect a browser, we tell it why — and what we tell it changes what
it does next.

Last week we taught browsers to reconnect automatically when a deployment
interrupts them. That reconnect is deliberately quick, because a deployment is
over in seconds. **If we used the same signal here, a slow browser would come
straight back, still be slow, be disconnected again, and spend the afternoon
doing that.** So a browser dropped for falling behind is told something
different, and it waits progressively longer before trying again.

We also decided it should **keep trying**, indefinitely, rather than giving up.
A browser dropped for being slow will probably still be slow when it returns —
so this does not fix that reader's experience, it protects everyone else's. But
connections improve: a train leaves a tunnel. Someone whose connection recovers
should find the page working again **without having to reload it**, and a
browser that had given up could not offer that.

Writing this down also uncovered something worth fixing: the signal was being
decided in one place and interpreted in another, with no connection between
them. Two halves of one agreement, either of which could have been changed
without the other noticing. They now read from a single shared definition.

### What you would see today

**Nothing** — on any healthy connection, which is the whole point. What it
prevents is the server quietly growing all afternoon because somebody's laptop
went to sleep with a tab open.

### Where the work stands

This is the **seventh of nine** pieces in the current run, and the last one that
is about plumbing. What remains is a round of measurements and the closing
tidy-up — and then the screen all of this has been building towards: **live
prices for all 518 companies at once**.
