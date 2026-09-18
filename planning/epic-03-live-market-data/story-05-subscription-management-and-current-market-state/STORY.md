# Story 3.5 — Subscription Management & the Current Market State

**Status:** Not started
**Epic:** [Epic 3 — Live Market Data](../EPIC.md)
**Depends on:** 3.3
**Epic scope covered:** backend subscription management, current market-state model

## Description

Story 3.2 opened one socket for a handful of symbols and Story 3.3 pushed one
security's observations at one browser. This story takes both to the size the
product is actually for: **518 securities upstream, and an unknown number of
browsers downstream, through one process.**

Two models, and they are separate on purpose:

- **Upstream subscriptions** — what this backend asks Alpaca for. The spike
  already answered the hard part: **1,500 symbols were accepted in 305 ms and
  5,000 in 867 ms**, because minute-bar channels are exempt from the
  30-symbol cap that applies to trades and quotes. Capacity is not the problem.
- **The current market state** — what this backend _knows_ right now, which is a
  different object from a stream of frames and is the thing every later epic
  reads. Epic 4's overview, Epic 5's anomaly scores and Epic 7's analytical
  tools all want _the latest observation per security_, and none of them wants
  to subscribe to a socket to get it.

## What the user can see when this story lands

**Nothing new**, and this is one of the epic's two stories that says so.

The screens are exactly Story 3.4's: `LIVE` in the chrome, and one price moving
on a security page. What changes is underneath — the same screens are now fed by
a model that holds the whole universe instead of whatever the page asked for.

**The payoff is the very next story**, which puts 518 live prices on screen and
could not exist without this one.

What the user still cannot do: see the universe move, see the chart reach now,
or survive a reload.

## Why it sits here in the sequence

**After the slice and before the load.** Story 3.3 proved the protocol with one
security, which is the cheapest possible proof and the one that says least about
size. Everything in this story is a question about scale — how many symbols, how
many browsers, what happens when a message arrives for a security nobody is
looking at — and every one of those questions has a wrong answer that works
perfectly for one security.

## Scope

- **The subscription model upstream.** Whole universe or on demand, decided in
  Story 3.1 and implemented here. Note the asymmetry that makes _whole universe_
  attractive: the socket costs the same whether one browser is open or none, and
  Epic 5's anomaly detection needs every security observed continuously rather
  than the ones somebody happens to be viewing.
- **The current-state model**: the latest observation per security, its instant,
  its source, and **how old it is allowed to get before it stops being current**
  — which is `FeedStatus`'s `stale` with a number under it.
- **Today's bars, or not.** Story 3.7's chart needs today's session as a
  _series_, not just a last value. 518 × 390 minute bars is a materially
  different object from 518 latest values, and this is where it is decided: hold
  them, or let the chart assemble them from what has arrived since the page
  opened plus what the store already serves. Story 3.9 changes the answer by
  making the store hold today, which is a reason to prefer the cheap option now.
- **Fan-out downstream.** One socket in, N browsers out, and the two rates are
  not the same: a browser that has subscribed to eight securities must not be
  sent 518. Decide coalescing here — several observations for one security
  inside one tick is a real case at the open.
- **Backpressure.** A browser that stops reading must not grow a queue inside
  the backend; the failure mode of getting this wrong is a memory leak that only
  appears on a slow connection during a busy session, which is the hardest
  possible thing to find later.
- **The lifecycle.** The socket belongs to the process, and `index.ts` is the
  only thing that exits: connect on start, close on signal, and **never** leave a
  handle open across a shutdown that `test:process` will then wait out. Note
  that ~5 s of that suite _is_ the shutdown ceiling elapsing, so a socket that
  delays shutdown shows up as a slower test rather than as an error.
- **One replica, one socket, and it is a required setting rather than a tuning
  knob.** Container Apps' documented default is `minReplicas: 0` with an HTTP
  trigger; the Alpaca socket is **outbound**, so no ingress timeout governs it
  and the only thing that can kill it is the replica ceasing to exist. It is set
  correctly today (ADR 0011) and anything that scales this app to zero breaks
  the epic's exit criterion in a way that looks like a feed that stopped rather
  than an error. **The free plan allows one concurrent connection**, which makes
  the same constraint true from the vendor's end.
- **The logging decision that reverses here.** Task 1.12.6 declined
  `ignore: "reqId,pid"` on pino-pretty after measuring that 51 request pairs
  across two windows were every one adjacent — two requests a minute per tab
  does not interleave. **The stated reversal trigger is this epic's socket**, and
  it fires in this story rather than in 3.2, because this is where more than one
  thing is in the log at a time. The lever is worth **156 → 101 columns**.

## Out of scope, and who owns it

- Any screen — Story 3.6 is the payoff
- Persistence — Story 3.9. Everything here is in memory and is lost on restart,
  which is correct until the store can hold it honestly
- Reconnection, and the gap a reconnection leaves in the current state —
  Story 3.10
- Anomaly computation over the current state — Epic 5, which is the first real
  consumer of this model beyond the UI

## Open decisions — settle with the user

Expected to be none: Story 3.1 owns them. The one thing that may come back is
**today's-bars-in-memory**, because it trades a few hundred megabytes of process
memory against Story 3.7's shape, and memory bills the same whether the vCPU is
idle or not.

## Acceptance criteria

1. The backend subscribes to the tracked universe and the acknowledgement's
   **accepted list is counted** rather than checked for the absence of an error
   — the control that made the original cap measurement mean anything
2. A security's current state is readable by symbol, carries its instant and its
   source, and says how old it is
3. A browser receives observations only for what it asked for, checked at a size
   where the difference is visible
4. A slow or dead browser connection does not grow a queue in the backend, and
   is dropped rather than tolerated forever
5. `SIGTERM` closes the upstream socket and the process exits within the
   existing ceiling — asserted by the process suite rather than by a log line
6. `status` is filtered here — this is a computation over _the market we track
   now_, which `UNIVERSE.md` §12.2 puts firmly on the filtering side. Story 3.9's
   read path is not, and that asymmetry is deliberate
7. Message rates and memory measured at universe scale against the figures
   Story 3.1 took, with the difference explained rather than noted
8. `pnpm verify` passes

## What this story hands forward

The model Epic 4's overview and Epic 5's scores read, and the capacity Story 3.6
spends.

---

## Handed here by Task 3.1.7 — 2026-09-17, and this story got smaller

**For bars, there is almost nothing to manage.** [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §10.2:
a browser subscribes to the **whole universe, implicitly, naming no symbols**, so
the upstream subscription is a **constant** — always the same 518. There is no
diffing, no incremental subscribe, no unsubscribe path.

§8.7 measured that the server remembers nothing across a reconnect, so the set is
ours to re-assert — and re-asserting a constant reduces the reconciliation this
story owed to **one check after each reconnect: does the `bars` key hold 518
entries?** §6.8's warning still applies to that check and only to it: the
acknowledgement carries channels nobody asked for, so reconcile **per channel we
care about** rather than diffing the whole thing.

**What this story does manage is the other two things in its title.** The browser
fan-out — one upstream stream, N browsers, no interaction between them — and the
**current market state object**, which §10.3 settles: a `Map<symbol, Bar>` of the
latest observation per security, **0.2 MB measured**, one writer (the socket) and
many readers.

**Three readers are outside this epic** — Epic 4's overview, Epic 5's anomaly
scores and Epic 7's analytical tools all want _the latest observation per
security_ and none of them wants to open a socket. That is why the object exists
at all.

**Two properties of it that are easy to get wrong**, both in §10.3: after a
restart the map is **legitimately empty** and refills unevenly — within a minute
for a liquid name, possibly hours for `ERIE` — so _no current observation for this
symbol_ is an ordinary answer rather than an error. And it is **not cleared on a
session boundary**: at 09:31 on Monday it still holds Friday's bars, which is
correct, and is only safe because every entry carries its own `startsAt` and no
reader may render a price without reading it.

---

## The five things Story 3.1 measured that change this story's shape — delivered 2026-09-18

**These were measured in Story 3.1 and never handed here, which is the gap this
section closes.** Task 3.1.9's close delivered five constraints to Story 3.2, the
canvas answer to Story 3.4, the gap finding to Story 3.10 and the weekend hold to
Story 3.11 — **and missed this story**, even though [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §4.4
says in as many words that two of its findings _"change Story 3.5's shape rather
than informing it"_. Found on 2026-09-18 by Task 3.2.4, which hit the
symbol-validation question while writing the mapping and had to decide where it
belonged.

**That is exactly the failure 3.1.9 named when it gathered Story 3.2's
constraints: none of them is one of the eight decisions, _which is how a measured
constraint gets lost_.** It was right about the mechanism and missed a story.

### 1. Alpaca does NOT validate symbols, so we must — and before the frame is sent

§4.4: `bars:["ZZQQTESTX"]` was **silently accepted** and echoed back as held.
So **a subscription acknowledgement is not evidence that a symbol exists**, and a
security that never produces a bar is indistinguishable from a typo.

**Validation against our own universe is the only thing that can tell them
apart, and it has to happen BEFORE the subscribe frame is sent.** Task 3.2.4
placed a **format** check in the mapping — which rejects `ZZQQTESTX` because nine
characters fails the ticker pattern — and deliberately stopped there: a
well-formed invention like `ZZQQT` passes a format check and is still in nobody's
universe, and a pure mapping function that reads the universe is no longer pure.
**The universe check is this story's.**

### 2. An empty subscription list is a `400`, so a subscription manager must never send one

§4.4: `bars:[]` returns `[{"T":"error","code":400,"msg":"invalid syntax"}]`.

**That is exactly the frame a filter that matched nothing produces.** _"Send
whatever the selection resolves to"_ is a bug on the empty selection, and it is
the easy one to write.

### 3. The acknowledgement is the FULL CURRENT STATE, not a delta

§4.2's third finding, called there **the single most useful finding for Story
3.5**: subscribing to `["RIVN"]` while already holding `["ZZQQTESTX"]` came back
with **both**. The server is authoritative about what we hold, so a subscription
manager should **reconcile against the acknowledgement** rather than maintain its
own count and hope.

**And an empty subscription is not an empty list — the key is ABSENT.**
Unsubscribing from everything returns `[{"T":"subscription"}]` with no `bars`
key at all. A parser reading `bars` unconditionally breaks there; the fixture
that catches it is `subscription-ack-empty.json`.

### 4. For bars, this story has almost nothing to manage — and that is deliberate

§10.2's note, recorded so this story does not go looking for something that was
decided not to exist: the upstream subscription is a **constant** — always the
same 518 — because §8.7 measured that the server remembers **nothing** across a
reconnect. So the reconnect path re-sends a constant, **there is no subscription
state to restore**, and the only check afterwards is _does the `bars` key hold
518 entries?_

**What this story actually manages is the browser fan-out and the current-state
object of §10.3.** A dynamic subscription model is not required and building one
would be designing for a problem this epic does not have.

**Reversal trigger, as a condition:** the first browser surface that must receive
something **no other browser receives** — a per-user watchlist, or a filter
applied upstream rather than in the browser.

### 5. This story owns where a revision is APPLIED

Task 3.2.4's mapping labels every `u` frame as superseding a
`(symbol, minute)` — `LiveObservation.supersedes` — and deliberately does not act
on it, because acting requires state and the state is this story's.

**The measured shape**: 0.064% of bars at universe scale, arriving
**29.1–30.1 s** after the bar they correct, **35.3%** changing the close, and
**none** changing nothing at all (§14.1, n=68). So the current-state object must
replace by `(symbol, minute)` rather than append — **and a bar is not final for
thirty seconds**, which is the window Story 3.10's gap-filling also has to respect.
