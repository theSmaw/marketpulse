# Task 3.5.3 — The universe upstream, and the count that proves it

**Status:** **Complete — 2026-09-21.** The live subscription is **518 securities** drawn from the tracked universe rather than five hard-coded names. Three vendor lies are now guarded, three `pnpm break` entries behind them — and scaling the set falsified **two existing assertions**, one of which had been testing the ordering of a literal.
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

---

## Amended by Task 3.5.2 — 2026-09-21: this task opens a window, deliberately

**After 3.5.2 there is exactly one path from the socket to a browser**, and it
is `gateway.publishObservations(...)` → `broadcast(...)` → **every attached
client**. There is still no per-client filter; Task 3.5.6 builds it.

**So scaling the upstream set from five symbols to 518 means every attached
browser receives the whole universe every minute**, and discards all but the
one or two it is showing. Each task merges and deploys, so this is a real
deployed state rather than a moment on a branch.

**That is accepted rather than overlooked**, on these grounds:

- The cost is bounded and small: ~518 observations a minute, on the order of
  ~~**50 KB/min per attached browser**~~ — **corrected 2026-09-21 to 70.2 KiB**,
  computed from the real `WireObservation` shape at 518 entries rather than
  estimated. The original figure was **40% low**, which is the reason
  `CLAUDE.md` says a tolerance is measured rather than argued. Still bounded,
  still small against a deployment whose realistic audience is a handful of
  tabs; Task 3.5.8 takes it from a real message rather than a constructed one.
- **Nothing renders wrongly.** Story 3.4's arrival mark fires per security on
  the security actually displayed, so the surplus is discarded silently.
- The alternative is building the browser's subscribe protocol **before** the
  thing that motivates it, which is scaffolding ahead of the step.

**Task 3.5.6 closes the window, and it should not drift later than that.**

**Reversal trigger, as a condition:** the first time more than a handful of
browsers are attached at once, or the first measurement showing the surplus is
material. Either makes the filter urgent rather than tidy.

---

## What was built

**`STREAM_SYMBOLS` is now `trackedTickers()`** — one line, and the comment
above it that predicted this change is now the record of it.

### The predicate moved rather than being copied

`trackedSecurities` / `trackedTickers` / `trackedSymbols` live in
`universe.ts`, because **that module owns the idea**. They were written inside
`current-market-state.ts` in 3.5.1, which is where they were first needed.
§12.2's own argument decided the move: _one invisible predicate is a design and
two is a bug waiting for whoever forgets_ — and two callers reading two
definitions is exactly how one of them quietly stops filtering.

**A symbol outside the universe now cannot reach the subscribe frame by
construction rather than by a check**, which matters because §4.4 measured that
Alpaca **silently accepts** a symbol that does not exist and echoes it back as
held. The vendor will never tell us.

### The two guards on the wire

**An empty `bars` list is refused rather than sent.** §4.4: `bars:[]` is a
`400 invalid syntax`, and it is precisely the frame a `status` filter matching
nothing — or a universe that failed to load — produces. The failure would have
arrived looking like a protocol bug rather than like our own empty selection.

**The acknowledgement is reconciled per channel.** §4.2 measured it as the
**full current state rather than a delta**, so the server is authoritative
about what we hold and a shortfall is a fact rather than an inference. Only
`bars` is compared, because §6.8 measured the acknowledgement carrying channels
nobody asked for — diffing the whole frame reports drift that is not ours, and
an operator who sees a false shortfall every minute stops reading the log.

**What the count cannot prove** is written beside it: a full acknowledgement is
not evidence the symbols are real, only that the server thinks it holds that
many.

## What scaling falsified, which is the part worth keeping

Two existing assertions went red, and **neither was a bad test** — both were
true of a five-symbol literal and became false at 518.

### 1. An assertion that was its own inverse

`market-stream.test.ts` asserted `STREAM_SYMBOLS.length` **< 10**, under a
comment explaining that Story 3.5 owns 518. The test and its own comment
described different futures, and the test won until today. Rewritten to state
the claim the tree now holds.

### 2. An assertion that was testing the ordering of a literal

`self-driving-streams.test.ts` asserted `received[0]?.symbol === "AAPL"`. That
was true only because the hard-coded array happened to start with `AAPL`. The
universe's own order is sector proxies first, so the first observation in a
slice is now `XLK`.

**The symbol was incidental to what the test is about** — that a replay
produces a recorded minute with nothing but time passing. Rewritten to assert
the slice carries the subscribed symbols, which survives any future reordering.

### 3. And a test helper that rotted silently

The same file's `flush()` ran **ten** microtask turns. `replay-bar-source.ts`
reads the store **one symbol at a time** —
`for (const symbol of symbols) { await repository.readBars(...) }` — so the
turns a fill needs are **proportional to the size of the subscription**.

At five symbols ten turns was ample; at 518 it silently produced
`expected 0 to be greater than 0`, which looks exactly like a broken replay.
The turn count is now derived from `STREAM_SYMBOLS.length`, so it cannot rot
the same way again.

**That sequential read is a real consequence and is recorded rather than
fixed.** A replay fill now issues **518 sequential queries**. ADR 0030 makes
the replay a development instrument that never runs in production, so this is
not a deployed cost — but it is a `pnpm dev` cost, and Tasks 3.5.4 and 3.5.5
both demonstrate against the replay. **Handed to Task 3.5.8 to measure**, with
the repair — read the window once across symbols rather than once per symbol —
named but not taken here, because it is a change to the replay rather than to
the subscription.

## Evidence

- `pnpm break a-short-acknowledgement-goes-unreported` — red, restored
- `pnpm break an-empty-subscription-is-sent-to-the-vendor` — red, restored
- `pnpm break the-upstream-set-stops-being-the-universe` — red, restored
- `ZZQQT` rather than `ZZQQTESTX` in the universe test, so it cannot pass by
  exercising Task 3.2.4's format check instead
- `pnpm verify` green: 16 invariants, **917** backend tests, 2266 in total

---

## For a stakeholder — a status report, 2026-09-21

### What we did, in one sentence

**We pointed the live market feed at all 518 companies we track, instead of the
five we had been testing with.**

### What was there before

The system was subscribed to exactly five stocks — Apple, Microsoft, Nvidia,
and two index funds. They were chosen deliberately months ago, for a practical
reason: they trade constantly, so a developer watching the screen sees numbers
move within a minute. A thinly traded company can sit silent for an hour while
working perfectly, which looks identical to a broken feed.

That was always meant to be temporary, and the note in the code said so.

### Why this was more than changing a number

Three things about the data provider had been measured earlier in the project,
and each one is a way of being **misled rather than told an error**:

**They accept stock symbols that don't exist.** We tested this: we asked for a
made-up ticker and the exchange feed cheerfully confirmed it was subscribed. So
a typo in our list would look identical to a real company that simply hadn't
traded yet. The only thing that can tell those apart is checking against our
own list of companies **before** we ask — which we now do, and which is now
true automatically because the subscription is built _from_ that list rather
than typed separately.

**Asking for nothing is an error, not an empty answer.** If our list of
companies ever came back empty — a bad filter, a failed load — we would have
sent an empty request, and the provider returns a generic "invalid syntax"
error. That would have looked like a bug in how we talk to them, sending
somebody off investigating the wrong thing entirely. We now refuse to send it
and say plainly that our own selection was empty.

**We now count what they confirm.** The provider replies with the full list of
what it thinks we're subscribed to. Previously we checked only that no error
came back. Now we count it, and if it's short of what we asked for, that gets
reported rather than passing silently. Worth being precise about what this does
and doesn't prove: a full count confirms the provider thinks it holds 518
subscriptions. It does **not** confirm all 518 are real companies — nothing
from their side can tell us that, which is why the check against our own list
matters.

### The interesting part: scaling broke two of our own tests

Both were correct when written. Both quietly encoded "five symbols" as an
assumption.

One literally asserted the subscription list was **fewer than ten** items —
directly underneath a comment explaining that it would eventually be 518. The
test and its own explanation disagreed about the future, and the test won until
today.

The other checked that the first price to arrive was Apple's. That was only
ever true because Apple happened to be first in a hand-typed list. Our full
company list starts with sector funds, so the first arrival is now a different
ticker. The test wasn't really about Apple at all — it was checking that
replayed historical prices arrive correctly — so we rewrote it to test that,
rather than to test alphabetical luck.

**A third thing rotted invisibly**, and this is the one worth flagging. A piece
of test scaffolding waited a fixed number of cycles for data to load. Fine for
five companies; far too short for 518. It failed in a way that looked exactly
like the replay system being broken, rather than like a test waiting
impatiently. We found the real cause and made the waiting scale with the number
of companies.

That third one also surfaced something real: our historical-replay tool loads
prices **one company at a time**, so it now makes 518 sequential requests where
it used to make five. That only affects development tools, never the live
product, so we've recorded it and scheduled the measurement rather than
stopping to optimise something customers never touch.

### What you would see on screen today

**Nothing yet** — but this is the last of the invisible groundwork.

The system is now genuinely watching the whole market we care about: every
price, for every tracked company, arriving and being remembered. Everything
from here is about **showing** it.

**Next up is visible**, and it fixes something you can see going wrong on every
single page load: the price flickers, showing yesterday's close for about a
second before swapping. With the full market now flowing in and remembered,
the right price can simply be there when the page opens — and critically, that
now works for **any** of the 518 companies rather than only the five we were
testing with.

After that: browser tabs surviving a deployment, and then the screen this whole
run of work exists for — **live prices across all 518 securities at once**.
