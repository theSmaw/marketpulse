# Task 3.5.6 — A slow browser is dropped rather than tolerated forever

**Status:** Not started
**Story:** [3.5 Subscription Management & the Current Market State](STORY.md)
**Depends on:** 3.5.5

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

Because it is a different failure and a different test. Task 3.5.5 is about
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
  reconnect from Task 3.5.4 should treat it as _back off_ rather than _we are
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
3. A dropped client's close code does not cause Task 3.5.4's reconnect to hot-loop
4. Healthy clients on the same process are unaffected throughout — asserted,
   because "we dropped everybody" also passes a naive version of criterion 1
5. `pnpm break` proves the drop goes red when the threshold check is removed
6. `pnpm verify` passes

## Reversal trigger

**The first legitimate client that is slow by design** — a recording harness, a
low-priority background tab, an agent consuming the stream at its own pace.
At that point _drop_ stops being the only correct answer and a per-client rate
becomes the question.
