# Task 3.5.2 — One process, one socket, and the second subscription nobody noticed

**Status:** **Complete — 2026-09-21.** One subscription, one closer, and the browser's view is single-sourced **by construction**: `observe()` now returns what it applied, so there is no path from the socket to a browser that bypasses the current market state. A sixteenth invariant, and `pnpm break` caught that invariant counting the wrong thing.
**Story:** [3.5 Subscription Management & the Current Market State](STORY.md)
**Depends on:** 3.5.1

## Objective

Make the lifecycle honest, and collapse a duplication this story created on its
way past.

**There are two subscriptions on one stream today.** `index.ts` calls
`stream.subscribe(STREAM_SYMBOLS, …)` with `onObservations: () => undefined`,
and `market-gateway.ts` separately calls `stream.subscribe([], …)` and
broadcasts. The first exists because Story 3.2 needed the connection to be held
by something before anything consumed it — its own comment says so — and Task
3.5.1 gives it a real consumer. **After 3.5.1 the discard is dead weight; after
this task it is gone.**

## What the user can see when this lands

**Nothing.** The reason it matters is in the story's scope: _the socket belongs
to the process, and `index.ts` is the only thing that exits._

## Why one subscription rather than two

Two is not merely untidy — it makes a question unanswerable. **Which subscriber
owns the upstream connection?** Today the answer is _whichever was registered
first_, which is an accident of file order, and the shutdown path closes one of
them. `registerMarketStreamCloser(unsubscribe)` takes the **`index.ts`** one;
the gateway registers its own closer separately. Two closers, one socket, and
nothing states the order.

This is the same class as the defect fixed on 2026-09-21 in `alpaca-stream.ts`
— **a mutable reference driven by callbacks bound to a previous instance of the
thing it points at** — and that trigger is written into Story 3.10. Worth
reading before touching this.

## The constraints, which are settings rather than tuning knobs

- **One replica, one socket.** Container Apps' documented default is
  `minReplicas: 0` with an HTTP trigger; the Alpaca socket is **outbound**, so
  no ingress timeout governs it and the **only** thing that can kill it is the
  replica ceasing to exist. Set correctly today (ADR 0011). Anything that scales
  this app to zero breaks the epic's exit criterion **in a way that looks like a
  feed that stopped rather than an error**.
- **The free plan allows one concurrent connection**, which makes the same
  constraint true from the vendor's end — and which this session has just seen
  bite: a retry that failed to close its own refused socket put the deployed
  backend into `CrashLoopBackOff` for two days.
- **A socket that delays shutdown shows up as a slower test, not an error.**
  ~5 s of `test:process` **is** the shutdown ceiling elapsing, so a handle left
  open across shutdown is measured in seconds rather than reported.

## Work

- Collapse to **one** subscription, owned by the process, feeding the
  current-state object; the gateway reads that object rather than subscribing
- **One** closer, in a stated order, with the order asserted rather than assumed
- `SIGTERM` closes the upstream socket and the process exits inside the existing
  ceiling — criterion 5, asserted by the **process suite** rather than by a log
  line
- Confirm no handle survives shutdown, by the timing rather than by inspection

## Done when

1. Exactly one `stream.subscribe` exists in shipped serving code, proven by a
   `pnpm invariants` grep — this is a claim that will otherwise quietly stop
   being true
2. `SIGTERM` closes the socket and exits within the ceiling, asserted in
   `test:process`
3. The shutdown does not get **slower**, which is the symptom a leaked handle
   actually produces
4. An ordering assertion has a marker on **each side** of the step it is about,
   and the marker travels with the step — a log line further down the function
   does not move when the step does, and the break passes
5. `pnpm break` behind the invariant
6. `pnpm verify` passes

---

## Amended by Task 3.5.1 — 2026-09-21: this moved from seventh to second, and the reason is not tidiness

**It was written as a clean-up and it is now a correctness problem**, because
3.5.1 gave the two subscriptions **two different policies**.

`market-gateway.ts` broadcasts the **raw** batch straight from the stream:

```ts
unsubscribe = stream.subscribe([], {
  onObservations: (batch) => { broadcast(… observationsToWire(batch) …); },
```

while `currentMarketState` — fed by `index.ts`'s subscription — **deliberately
ignores a revision for a minute already passed**, so that the latest observation
never walks backwards in time.

**So the two now disagree about what happened.** Today that is invisible,
because nothing reads the state. It becomes **reachable the moment Task 3.5.4
fills the snapshot**, at which point a browser assembles its view from two
sources with different rules: the snapshot from the state, every subsequent tick
from the raw stream. A browser could render a price the server's own current
state rejected.

**That is why this task now runs second.** Two further reasons reinforce it:

- **Tasks 3.5.6 and 3.5.7 build the per-client fan-out and the backpressure on
  top of the gateway's subscription.** Doing them first means building on a
  topology this task then rewires underneath them — twice the work and a
  re-test of both.
- The collapse is **cheaper now than later**, while the gateway's subscriber is
  four lines and nothing depends on its shape.

### The shape the collapse should take

**One subscription, in `index.ts`, which writes the state and then hands the
batch on.** The gateway stops subscribing and gains a way to be told. That makes
the browser's view single-sourced by construction rather than by agreement:
snapshot and ticks both originate in the same object, so they cannot diverge.

### An invariant this task inherits

`pnpm invariants` gained a fifteenth check in 3.5.1 —
**`the-live-stream-has-a-consumer`** — which greps `apps/backend/src/index.ts`
for `currentMarketState.observe(` and for a re-introduced
`onObservations: () => undefined`.

**This task touches exactly that file.** `CLAUDE.md`'s rule applies directly:
_when you touch a file an entry names, check the entry._ The check must be
**updated to match the new wiring, never deleted** — it exists because this
repository has four times built something correct that nothing called, and the
collapse is precisely the change that could quietly orphan the state object
again. `pnpm break the-live-stream-loses-its-consumer` must still go red
afterwards.

---

## What was built

### The collapse, and the one design decision inside it

`market-gateway.ts` no longer subscribes. It gained two methods —
`publishObservations` and `publishFeedState` — and lost its `stream` option
entirely, because nothing else in the file used it. `index.ts` now holds the
**only** subscription:

```ts
onObservations: (observations) => {
  gateway.publishObservations(currentMarketState.observe(observations));
},
```

**`observe()` was changed to return what it actually applied**, and that is the
decision the task did not specify. The alternative — have the gateway publish
the same `observations` the state was handed — would have left the two agreeing
only _by convention_, which is what they were already failing to do. Returning
the applied set makes the divergence **unrepresentable**: there is no path from
the socket to a browser that does not pass through the state, so a browser
cannot be sent a superseded revision this process rejected.

That matters because Story 3.4's arrival mark fires on observation **content** —
a stale correction would both move the number and mark it as news.

### Construction order rather than late binding

The gateway is now registered **before** the subscription, because the
subscription feeds it. The alternative was a mutable reference filled in
afterwards — and that is precisely the shape that put the deployed backend into
`CrashLoopBackOff` for two days on 2026-09-19: _a mutable reference driven by
callbacks bound to a previous instance of the thing it points at._ Ordering two
constructions is free; late-binding a callback target is not.

### The closers

The decided order was already correct and documented — gateway first, so a
browser is told the feed is going away by a process that **still has a feed** —
but **only the gateway-before-drain half was asserted**. The process suite now
asserts **gateway before stream** too. Both markers already travelled with their
steps, which is why the assertion is a two-line addition rather than a
refactor.

## What the break caught, which is the finding worth keeping

**The new invariant was wrong when first written, and `pnpm break` said so
within a minute.**

`one-subscriber-on-the-upstream-socket` counted **files** containing a
subscribe, not **call sites**. The break adds a second subscription _to the file
that already has one_ — so the file count stayed at 1 and the check went green
against the exact defect it exists to catch.

That is also the likeliest shape of the real regression: somebody adds a
subscriber **next to** the existing one rather than in a new module. Fixed to
count call sites; the break now goes red.

**A second entry needed re-anchoring for the same reason.** This task
restructured the line `the-live-stream-loses-its-consumer` was anchored to, so
its `find` no longer matched — and the harness **refused rather than passing**,
which is the entry doing its job. `CLAUDE.md`'s rule fired exactly as written:
_when you touch a file an entry names, check the entry._ Re-anchored, and the
new break is a better regression than the old one — it broadcasts the **raw**
batch instead of the applied one, which is precisely the divergence this task
removed.

## Evidence

- `pnpm break a-second-subscriber-on-the-upstream-socket` — red, restored
  byte-identical
- `pnpm break the-live-stream-loses-its-consumer` — re-anchored, red, restored
- `pnpm break the-current-state-holds-an-untracked-security` — still red
- Process suite asserts gateway-closed **before** stream-closed
- `pnpm verify` green: **16 invariants**, 908 backend tests, 19 process tests

---

## For a stakeholder — a status report, 2026-09-21

### What we did, in one sentence

**We made sure there is exactly one thing listening to the stock market, and
exactly one version of the truth.**

### What was wrong

The system had **two separate listeners** attached to the same live market
connection. Both received every price update. Neither knew about the other.

That sounds merely untidy. It had become something worse, because the two
listeners had started to **disagree**.

The piece we built yesterday — the system's memory — follows a careful rule
about corrections. The exchange occasionally sends a revised version of a price
a few seconds after the original. Usually that arrives before the next minute's
price, so we simply apply it. Occasionally it arrives late, after we've already
moved on. Applying it then would make the displayed price jump **backwards in
time**, so the memory ignores it.

The second listener — the one that feeds prices to your browser — had no such
rule. It forwarded everything, immediately, exactly as it arrived.

**So the server's own records and what a customer saw on screen could tell
different stories about the same minute.** Nobody would have seen it yet,
because the two paths don't overlap until the next piece of work. But it would
have arrived as a price that visibly jumped backwards for no reason, on a screen
that also marks new information with a visual flash — so the stale correction
would have announced itself as news.

### Why we fixed it now rather than later

This work was originally scheduled **seventh** out of nine. We moved it to
**second** after finishing the memory, for three reasons:

1. The disagreement becomes visible to customers as soon as the _next_ task
   ships, so fixing it afterwards means shipping a known defect first.
2. Two later pieces of work build directly on top of the listener we were about
   to replace. Doing them first would have meant building twice.
3. It is cheapest now, while the code involved is four lines.

Re-sequencing work when you learn something is cheaper than following a plan
that has been overtaken — and the plan was only three days old.

### The decisions worth explaining

**We made the mistake impossible rather than agreeing not to make it.** The
obvious fix was to give the second listener the same rule as the first. We
didn't, because two copies of a rule is just a slower way of drifting apart.
Instead, the memory now hands back exactly what it accepted, and that is the
only thing that can be sent to a browser. There is no longer a route from the
market to a customer's screen that bypasses the system's own records — not
because we agreed there shouldn't be, but because one no longer exists.

**We put the pieces together in the right order instead of wiring them up
later.** There's a shortcut here that looks harmless: build things in any order
and connect them afterwards with a placeholder. That exact shortcut is what
caused the outage two days ago that stopped us deploying for two days. We
ordered the construction instead. It costs nothing and removes a whole category
of failure.

**We added an automated check, and it was wrong, and we caught that.** We now
check that only one thing listens to the market. The first version counted the
wrong thing — it would have missed a second listener added right next to the
first, which is exactly how this would realistically happen again. We only found
out because we have a habit of deliberately breaking each new check to confirm
it actually fires. **It didn't.** Ten minutes to find; it would have been a
silent hole otherwise.

That habit also flagged that an _older_ check had come loose from the code it
was watching, because this task moved the line it was anchored to. It told us
rather than quietly passing.

### What you would see on screen today

**Nothing** — this is the second and last invisible task in a row.

**The next one is visible**, and it's a fix to something you can see going wrong
right now: every page currently shows yesterday's closing price for about a
second, then abruptly swaps four things at once when the first live price lands.
That flicker happens on every single visit. The work of the last two days is
what makes it possible to simply hand over the right price when the page opens,
so the flicker stops existing rather than being smoothed over.

After that: tabs surviving a deployment, and then the screen this whole run of
work is for — **live prices across all 518 securities at once**.
