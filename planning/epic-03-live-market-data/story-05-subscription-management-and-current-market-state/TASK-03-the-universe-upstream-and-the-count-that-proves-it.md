# Task 3.5.3 — The universe upstream, and the count that proves it

**Status:** Not started
**Story:** [3.5 Subscription Management & the Current Market State](STORY.md)
**Depends on:** 3.5.2

## Objective

Take the upstream subscription from **five hard-coded symbols to the tracked
universe of 518**, and make the acknowledgement mean something.

`STREAM_SYMBOLS` in `market-stream.ts` is today a literal array — `AAPL`,
`MSFT`, `NVDA`, `SPY`, `QQQ` — chosen so a developer watching `pnpm dev` sees
movement. Its own comment says scaling it is _"changing this array rather than
designing a protocol"_, because §10.2 settled that the upstream set is a
**constant**. This task cashes that in.

## What the user can see when this lands

**Nothing**, and this is the second of two consecutive invisible tasks. The
payoff is [3.6](../story-06-live-prices-across-the-universe/STORY.md).

What changes underneath: the current-state map built in 3.5.1 starts filling
with 518 securities instead of five, which is what makes every later reader —
Epic 4's overview, Epic 5's scores, Epic 7's tools — possible at all.

## Capacity is not the problem, and that was measured

§4.3: **1,500 symbols accepted in 305 ms**, 5,000 in 867 ms, because minute-bar
channels are **exempt** from the 30-symbol cap that applies to trades and
quotes. Nothing here is a scaling risk. The risks are the three findings below,
all of which are about **being lied to** rather than about size.

## The three things that make this more than changing an array

### 1. Alpaca does not validate symbols, so we must — before the frame is sent

§4.4: `bars:["ZZQQTESTX"]` was **silently accepted** and echoed back as held. So
**a subscription acknowledgement is not evidence that a symbol exists**, and a
security that never produces a bar is indistinguishable from a typo.

Task 3.2.4 put a **format** check in the mapping and deliberately stopped there:
a well-formed invention like `ZZQQT` passes a format check and is in nobody's
universe, and a pure mapping function that reads the universe is no longer pure.
**The universe check is this task's**, and it belongs on the path that builds the
subscribe frame rather than in the mapper.

### 2. An empty list is a `400`, and it is the easy bug to write

§4.4: `bars:[]` returns `[{"T":"error","code":400,"msg":"invalid syntax"}]`.

**That is exactly the frame a filter matching nothing produces.** _Send whatever
the selection resolves to_ is correct on every input except the one that will
eventually happen — a `status` filter excluding everything, a universe that
failed to load. Refuse to send, and say so, rather than asking the vendor.

### 3. The acknowledgement is the full current state, not a delta

§4.2, called there _the single most useful finding for Story 3.5_: subscribing
to `["RIVN"]` while already holding `["ZZQQTESTX"]` came back with **both**. The
server is authoritative about what we hold, so **reconcile against the
acknowledgement** rather than maintaining a count and hoping.

Two traps beside it. §6.8: the acknowledgement carries **channels nobody asked
for**, so reconcile **per channel we care about** rather than diffing the whole
frame. And an empty subscription is **not an empty list — the key is absent**:
unsubscribing from everything returns `[{"T":"subscription"}]` with no `bars`
key, which the fixture `subscription-ack-empty.json` exists to catch.

## Work

- Build the subscribe set from the **tracked universe**, `status`-filtered, at
  the point the frame is constructed
- Refuse to send an empty `bars` list, with an operator log saying which filter
  emptied it
- **Count the accepted list** on the acknowledgement rather than checking for
  the absence of an error — criterion 1, and the control that made the original
  cap measurement mean anything
- Reconcile **per channel**: does `bars` hold what we asked for? Ignore channels
  we did not ask about rather than treating them as drift
- Handle the absent-`bars` shape without throwing

## Done when

1. A running process subscribes to 518 symbols drawn from the universe, not
   from a literal
2. The accepted count is **read and logged**, and a short acknowledgement is a
   visible fault rather than a silent one
3. A symbol outside the universe cannot reach the subscribe frame, asserted
   with a well-formed invention (`ZZQQT`) rather than a malformed one — the
   format check already catches malformed and would pass this test for the
   wrong reason
4. An empty resolved set **refuses to send** and says why
5. An acknowledgement with no `bars` key is handled, against the recorded
   fixture
6. Each of 2–5 owes a `pnpm break` entry
7. `pnpm verify` passes

## What this task must NOT build

**A dynamic subscription model.** §10.2: the set is a constant, the server
remembers nothing across a reconnect, so the reconnect path re-sends a constant
and **there is no subscription state to restore**. Diffing, incremental
subscribe and an unsubscribe path are all designing for a problem this epic does
not have.

**Reversal trigger, as a condition:** the first browser surface that must
receive something **no other browser receives** — a per-user watchlist, or a
filter applied upstream rather than in the browser.

---

## Amended by Task 3.5.1 — 2026-09-21: the universe filter already exists, so reuse it

3.5.1 needed the same predicate and built it:

```ts
export const trackedSymbols = (): ReadonlySet<string> =>
  new Set(UNIVERSE.filter((s) => s.status === "active").map((s) => s.symbol));
```

It lives in `current-market-state.ts` because that is where it was first
needed — **which is the wrong home once this task also wants it.** Two callers
of one predicate, in two files, is how `status` quietly stops being filtered in
one of them; §12.2 is explicit that one invisible predicate is a design and two
is a bug waiting for whoever forgets.

**So this task moves it rather than copying it**, and the test for where it
belongs is _which module owns the idea_ — the tracked universe, not the current
state. Both callers then read one definition.

**The `status` filter is therefore not new work here**, and the criterion-1
counting, the empty-list refusal and the acknowledgement reconciliation are what
this task is actually about.
