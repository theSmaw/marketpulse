# Task 4.7.1 — A harness that can hold an outage

**Status:** Not started
**Story:** [4.7 The Overview's Degraded Set, & the 390 Question Answered](STORY.md)
**Depends on:** —

## Objective

**No spec that visits `/` has ever degraded a feed, and the shared harness
cannot hold a disconnection even if one asked it to.**

## What the user can see when this lands

**Nothing.** Every task after this one runs through it.

## Work

### The harness answers the browser's own retry

`e2e/support/feed.ts`'s `routeWebSocket` callback **unconditionally re-sends a
`live` snapshot**, so the browser's reconnect is answered and a produced
`disconnected` **self-heals about 2 s after `drop()`** —
`ABNORMAL_FIRST_MS = 2_000`. That is **Task 3.10.9's fourth instrument error**,
whose fix lived in `state-grid.mjs`, which was deleted, and **was never carried
into the shared harness.** A real outage does not answer the retry.

Make refusing the retry an **opt-in option defaulting to today's behaviour**:
`market-reconnect.spec.ts` exists to watch the retry **be** answered, and
`serveFeed`'s connect sequence drives `LiveFeedView.resumes`, which
`security-gap-fill.spec.ts` — the 25%→5.6% flake — asserts a quiet refill
against.

### `serveFeed` has no `overview` verb, and ten specs have one each

Measured: thirteen `overview-*` specs each build a `type: "overview"` frame
inline. `FURNISHED_BREADTH`'s own docblock makes the argument — _the day the
section gains a field, four specs stop compiling at one line_. **This story's
grid is the eleventh copy unless the verb lands first.**

The verb the degraded states actually need is the one no spec can express
today: **serve a different, POORER aggregate on the reconnect** — which is
Task 4.7.3's subject and this task's capability.

### What the harness must not pretend

**A harness that can lie produces findings that look exactly like real ones** —
the canvas's `Degraded states.dc.html` §02 records Task 3.10.1 manufacturing
two states the server cannot reach, one written up as a defect before being
withdrawn. So the frames this harness can build are **derived from the shipped
encoder and the gateway's own connect sequence**, and a state a deployment
cannot reach must be a state the harness cannot reach — **except** the rollback
shape, which is deliberately reachable and must be **labelled** as furnished
because `WireMarketOverviewInputs.breadth` and `.movers` are non-optional and
no shipped producer can build it.

### And prove the plant per channel

Task 4.8.10's rule transfers exactly: **a produced state whose producer went
quiet looks identical to a state drawn correctly.** Every arm asserts its own
subject arrived — a frame counted **by URL**, the socket wrapper intact, the
text moved — and reports **nothing** rather than zero when it cannot.

## Done when

1. `serveFeed` gains an `overview` verb, and the thirteen inline copies are
   either migrated or the count of those left is recorded with the reason
2. Refusing the retry is opt-in, defaults to today's behaviour, and
   `market-reconnect` and `security-gap-fill` are unaffected — asserted, not
   assumed
3. A `disconnected` state can be **held** for the length of an assertion, shown
   by a spec that would have passed wrongly against the old harness
4. The poorer-aggregate-on-reconnect verb exists
5. `pnpm verify` and the overview specs green
