# Task 3.5.4 — The snapshot that removes the largest visual event on the page

**Status:** **Complete — 2026-09-21.** The flash is gone, **watched rather than inferred**: first paint now reads `LATEST PRICE · 100.49 · Sep 16 · 09:30 EDT`. One new rule — **a snapshot is not an arrival** — without which the mark would have fired on every page load, on 518 securities at once.
**Story:** [3.5 Subscription Management & the Current Market State](STORY.md)
**Depends on:** 3.5.1, 3.5.3

## Objective

Replace `snapshot: () => new Map()` in `index.ts` with the real current state —
and in doing so **delete the biggest undesigned visual event in the product.**

## What the user can see when this lands

**The first visible change of this story, and it is a subtraction.**

Today, every page load renders `LAST SESSION CLOSE · 218.29` and then — **up to
a minute later** — the identity block changes **all three of its lines at
once**: the label, the figure, the basis and the colour, together. Story 3.4's
close found it and was blunt about it:

> **That is the biggest visual change on the page, it happens on every single
> visit, and nobody designed it.** It is far larger than any subsequent price
> tick, and Story 3.4's motion vocabulary — which names _a bar arrived_ — has no
> word for _this block now answers a different question_.

Fill the snapshot and the block is correct on the **first frame**. The event
does not get designed; it **stops existing**.

This is the one task in Story 3.5 a stakeholder can be shown, and what they will
see is a page that no longer lurches a second after it loads.

## Why it is a real task and not a one-line change

Because `snapshot()` returning a populated map changes what **three** other
things mean, and two of them are Story 3.4's decisions rather than this story's.

### 1. §11.1's omission semantics must survive

An entry for **every security observed** and **no entry at all** for the rest.
_Present but empty_ stays unspellable — which `WireObservation`'s all-required
fields already enforce, and which this task must not weaken to make a map
easier to build. An empty snapshot is **still the true answer after a restart**
(§11.1) rather than a degraded one, so filling it must not turn `{}` into an
error path.

### 2. The arrival mark must not fire on the snapshot

Story 3.4's disc means **a bar arrived for this security**. A snapshot is
**what we already held when you connected**, which is a different fact.
`SecurityIdentity` remembers the instant it mounted with for exactly this
reason — **check that still holds once a snapshot carries prices**, because it
is the difference between a mark that means something and one that fires on
every page load.

This is the assertion most likely to be missing rather than wrong: nothing
today can produce a non-empty snapshot, so no test has ever exercised the case.

### 3. Monday at 09:31, the snapshot holds Friday

§10.3: the map is **not cleared on a session boundary**, and that is correct.
So the first frame a browser receives on Monday morning may carry Friday's
close, stamped Friday. **The identity block must read the instant and say so**,
which is precisely the qualifier Story 3.4 built (`16:00 EDT · change from …`).

Confirm it: a snapshot whose entries are from the previous session must render
as _that session's_ price with _that session's_ instant, and must **not** be
labelled as live merely because it arrived over the live socket.

## Work

- Pass the current-state read from 3.5.1 as the gateway's `snapshot`
- Assert omission semantics on the wire — observed symbols present, unobserved
  symbols **absent**, never present-and-empty
- Assert the arrival mark does **not** fire for a security carried in the
  snapshot, and **does** fire for the first observation after it
- Assert a previous-session snapshot renders with its own instant and basis
- Look at the page with `pnpm probe` before running a suite — the three-line
  flash was found by a person watching a page load, not by a test

## Done when

1. A browser connecting to a process that has observed bars receives them in
   the snapshot, and the identity block is correct on **first paint**
2. The three-line flash is **gone**, confirmed by watching a load rather than
   by inference
3. An empty snapshot is still served, unchanged, by a process that has observed
   nothing — it is the true answer, not a failure
4. The arrival mark does not fire on snapshot entries, with a `pnpm break`
   behind that assertion
5. A previous-session price is labelled with its own instant
6. `pnpm verify` passes, and the browser spec for the identity block still does

## A note for whoever writes the record

Story 3.4's close handed this over as _"not only a data question"_. It was
right, and the interesting part of the finding is the general one: **an empty
default that is also a true answer hides a design event until the day it stops
being empty.** That is worth a line in `docs/GAPS.md` if the sweep in 3.5.9
agrees.

---

## Amended by Task 3.5.1 — 2026-09-21: the source now exists, and one thing got easier

**`currentMarketState.all()` is the snapshot**, built and tested in 3.5.1. It
returns a `ReadonlyMap<Ticker, CurrentObservation>` where every entry carries
its `bar`, its `source` and its **age computed on read**.

Two consequences:

- **A mapping to `WireObservation` is the only work left** on the data side.
  `observationsToWire` already exists for the live path; the snapshot needs the
  same shape from a slightly different object.
- **§11.1's omission semantics come for free.** The map holds an entry only for
  a security actually observed, so _present but empty_ is unspellable at the
  source rather than only on the wire. 3.5.1 asserts this directly.

### What got harder, and it is why Task 3.5.2 now runs before this one

This task was previously third and depended on 3.5.1 and the universe task. It
now depends on **3.5.2**, the subscription collapse, because of a divergence
3.5.1 created:

**the state ignores a revision for a minute already passed; the gateway's raw
broadcast does not.** Fill the snapshot while those are two separate
subscriptions and a browser's view is assembled from two sources with different
rules — snapshot from the state, ticks from the raw stream. With 3.5.2 landed
first, both come from one object and cannot disagree.

**The arrival-mark assertion this task owes is unchanged and is still the one
most likely to be missing rather than wrong**: nothing has ever produced a
non-empty snapshot, so no test has exercised it.

---

## Amended by Task 3.5.2 — 2026-09-21: the divergence is gone, and a coverage hole is now yours

### The reason this depended on 3.5.2 is discharged

3.5.2 collapsed the two subscriptions, and `currentMarketState.observe()` now
**returns what it applied** — which is the only thing the gateway publishes.
There is no path from the socket to a browser that bypasses the state, so the
snapshot and the ticks after it **cannot disagree**. Fill the snapshot without
re-checking that.

The gateway's hook is `snapshot: () => new Map()` in `index.ts`, and the source
is `currentMarketState.all()`.

### The hole: nothing tests that a published observation reaches a browser

**Found during 3.5.2's sweep and not closed by it.** `market-gateway.test.ts`
tests the **codec** — it encodes and decodes message shapes — and never
constructs a gateway or attaches a socket. The process suite attaches a browser
but asserts only the **snapshot** and the shutdown **farewell**. The browser
spec `security-price-motion.spec.ts` serves the socket **from the test**, so it
exercises the frontend and not this gateway.

**So the backend's observation → browser path is asserted at no level at all**,
and 3.5.2 turned it into a public method (`publishObservations`) with no direct
caller in any test.

This is the same family as the four already recorded — _something that exists
in one layer and cannot be reached from the next_ — and it is this task's to
close because this task is the first one that attaches a browser and asserts
what it receives.

**Add to Done when:**

7. An observation published to the gateway **arrives at an attached browser**,
   asserted against a real socket rather than through the codec — and a bar
   arriving **after** the snapshot is distinguishable from one carried **in**
   it, which is what the arrival-mark assertion above actually rests on

---

## Amended by Task 3.5.3 — 2026-09-21: the snapshot is now a 70 KiB message, and the replay is measurably slower

### The snapshot has a size now

The current market state fills with **518 securities** rather than five, so a
snapshot sent to a browser that connects mid-session is **70.2 KiB** — computed
from the real `WireObservation` shape at 518 entries, not estimated.

Three things follow, none of them blocking:

- **§11.1's omission semantics are what keep it honest AND small.** An entry
  exists only for a security actually **observed**, so a freshly restarted
  process sends almost nothing and the message grows through the session. The
  70.2 KiB figure is the ceiling, reached late in a session, not the typical
  first paint.
- **Take the real figure rather than this one.** Task 3.5.8 owns measuring an
  actual message; this is a constructed upper bound.
- **Do not compress, batch or paginate it here.** One 70 KiB message on connect
  is not a problem worth solving before it is measured, and solving it would
  make Task 3.5.6's scoping harder rather than easier.

### Leave the scoping seam open

Task 3.5.6 scopes both the snapshot and the live ticks to what a client asked
for. **Build the unscoped snapshot in a way that takes a filter later** — read
the map, map to wire, send — rather than anything that bakes _everything_ into
the shape. The delta 3.5.6 needs should be a filter on the map, not a rewrite.

### The replay is slower, and it is fine

Measured against the local store on 2026-09-21, which is what this task will
demonstrate against out of hours:

| Read pattern                                                                | Time                       |
| --------------------------------------------------------------------------- | -------------------------- |
| One symbol, 30-minute window — what the replay does, **518 times per fill** | **2.193 ms**               |
| The same window across all symbols, **one query**                           | **335.5 ms** (14,685 bars) |

So a fill costs roughly **1.1 s** at 518 symbols, against ~11 ms at five. It is
a startup and window-boundary cost rather than a per-minute one, so **watching a
page at 1× is unaffected** — which is the only thing this task needs from the
replay.

**Do not fix it here.** The repair is Task 3.5.8's to decide with the figures in
front of it.

---

## Design artifact

**`The snapshot and the first frame.dc.html`**, published to the canvas
2026-09-21. New rather than an amendment, because
`The first price that moves` §06 is a **dated record of Task 3.4.3's
observation** — `CLAUDE.md`'s rule is to amend live claims and leave historical
ones, and that section is history. It reuses the existing design language
verbatim: same tokens, same panels, same block markup, **no new primitives**.

It carries three decisions, one of which is new language:

1. **A subtraction is the right answer.** The cheapest motion decision is the
   one not taken — an event that stops happening needs no word, and the
   vocabulary stays at three.
2. **A snapshot is not an arrival** — the one rule this task adds, argued in
   §02 below.
3. **Monday holds Friday, and no new state is invented.** A three-day-old live
   price is still the latest price we have, and the qualifier's instant already
   says so.

## What was built

### The rule, and why it was not optional

**Without it, filling the snapshot would have made the arrival mark fire on
every page load.** `SecurityIdentity` mounts **before** the socket delivers
anything, so it mounts holding nothing; when the snapshot lands, the figure goes
from _absent_ to _a price_, which is indistinguishable in the component from a
bar arriving.

That is **worse than the flash it replaces**: a mark that fires on every visit
means nothing, and it would have taken the rest of Story 3.4's vocabulary with
it.

**The wire already knew.** §11.1 gives the gateway two message types —
`snapshot` and `bars` — and `live-feed.ts` collapsed both into one map **one
layer later**. The repair is to stop discarding the distinction, not to
reconstruct it:

| Layer | What carries it                                                                                       |
| ----- | ----------------------------------------------------------------------------------------------------- |
| Store | `LiveFeedConnection.fromSnapshot` — symbols whose **current** observation came from a snapshot        |
| View  | `LiveFeedView.fromSnapshot`, reference-compared in `sameLiveFeedView`                                 |
| Route | `liveFeed.fromSnapshot.has(symbol)`                                                                   |
| Block | `useArrival(symbol, identity, fromSnapshot)` — a snapshot **sets the baseline**, a bar **changes it** |

**Delivery decides, not content**, and that is what rules out the tempting
shortcut. _Ignore whichever observation arrives first_ also suppresses a
**genuine** first bar for a thin security the server had never observed — §7.6
measured 2.1% minute coverage for `ERIE`, so that case is ordinary. Three tests
hold the distinction: the snapshot does not mark, the **first bar after** a
snapshot does, and a first bar for a security the snapshot never carried does.

It also survives Task 3.5.5 for free: a reconnect sends a snapshot, and no
snapshot is 518 bars arriving.

### The coverage hole, closed

`market-gateway.process.test.ts` is new, and it is in the **process** suite
because it opens a real socket — `pnpm test` is _no build, no socket, no
database, no network_ by contract, and loopback is still a socket.

Five assertions against a listening server and an attached `ws` client: a
published bar arrives; the snapshot is **first** and carries what the process
holds; an empty snapshot is still served; an unobserved security is **absent**
rather than empty; and an empty batch publishes **nothing**.

## What was measured, watched rather than inferred

**The page, at 1440, against a live fixture stream** — because the flash was
found by a person watching a load and nothing mechanical had ever seen it:

```
LATEST PRICE
100.49  ▼ -53.96%
Sep 16 · 09:30 EDT · change from 2026-09-11's close
```

`LATEST PRICE` on the **first frame**, no `LAST SESSION CLOSE`, **no disc**.
The identity block measured **331 × 72** — the regular-session height, so the
qualifier did not wrap. The date appears because the instant is not today, which
is §03's previous-session case working.

**And the snapshot's real size, which this task owed 3.5.8:**

| Figure             | Value                 |
| ------------------ | --------------------- |
| Securities carried | **518**               |
| Bytes on the wire  | **58,218 — 56.9 KiB** |

**The 70.2 KiB carried into this task's own amendment was 23% high.** It was
computed from a constructed `WireObservation` with five-character symbols;
real tickers are shorter. That is the second time in this story an estimate has
been corrected by a measurement, in both directions — which is the argument for
`CLAUDE.md`'s _a tolerance is measured, never argued_ rather than a restatement
of it.

### Two environment artefacts, named so they are not read as defects

The replay could not be used: `defaultReplayStart` targets the most recent
session and the **local store stops at 2026-09-11**, so the window held no bars.
The fixture stream was used instead. Its synthetic prices sit near 100 against a
stored close near 218, which is why the change reads **−53.96%** — the
arithmetic is right and the inputs are synthetic.

## Evidence

- `pnpm break the-snapshot-marks-every-security-as-arriving` — red, restored
  byte-identical
- `market-gateway.process.test.ts` — 5 assertions against a real socket
- `snapshotOf` — 4 assertions including §11.1's omission semantics and the
  empty-after-restart case
- The page, watched at 1440
- `pnpm verify` green: 16 invariants, **921** backend, **1034** frontend,
  **24** process

---

## For a stakeholder — a status report, 2026-09-21

### What we did, in one sentence

**We stopped the page lurching a second after it loads.**

### What was wrong

Until today, every single visit to a security page did this: the price appeared,
showing **yesterday's closing price**, and then — up to a minute later — four
things changed at once. The heading changed, the number changed, the colour
changed, and the explanation underneath changed.

It happened on every visit, to every user, and **nobody had designed it**. It
was simply what fell out of the server having nothing to say when a page
connected: it waited for the next price to arrive naturally, which for a quiet
company can take a minute or more.

It was also, measurably, the largest visual change on the page — considerably
bigger than an actual price moving, which changes one digit.

### How we fixed it, and why the fix is a deletion

The server has been remembering prices since Monday's work. So when a browser
connects, it can simply **be handed what we already know** instead of waiting.
The page is then correct on its very first frame, and the change never happens.

That is worth being explicit about: we did not design a nicer transition, or
soften it, or fade it. **We removed the event.** The best outcome for a piece of
undesigned behaviour is usually that it stops occurring, and it costs nothing to
maintain afterwards.

### The decision that took the real work

Last week we added a small mark — a dot that appears beside the price when new
data arrives for that company, then fades. It is deliberately quiet, and its
whole value is that it means _something just happened_.

Handing a browser everything we know, the moment it connects, looks exactly like
**518 companies all receiving news at once**. The dot would have fired on every
page, on every load, for every company on screen.

That would have been worse than the problem we set out to fix. A signal that
fires every single time you open a page is not a signal — and it would have
devalued the mark everywhere else it is used.

So we drew a line, and it is the one new rule this piece of work adds: **being
handed what we already knew is not the same as something arriving.** The
difference already existed in the messages between server and browser; we had
simply been throwing it away one step later. We stopped throwing it away.

We were careful about _how_ we drew that line. The obvious shortcut — "ignore
the first price after a page opens" — would have been wrong: for a thinly traded
company the server may genuinely have nothing, and the first real price might
arrive three minutes later while you watch. **That is a real event and should be
marked.** So the rule is about where a price came from, not when it showed up.

### What we verified, and how

We **looked at it**. The original problem was found by a person watching a page
load, and nothing automated had ever noticed it — so a passing test suite would
not have been evidence that it was gone. We ran the application, loaded a
security page, and confirmed the heading reads **LATEST PRICE** on the first
frame with no dot and no lurch.

We also closed a gap we had found earlier in the week: **nothing anywhere
checked that a price sent by the server actually reaches a browser.** Every test
we had checked the message _format_ rather than its _delivery_. There is now a
test that starts a real server, attaches a real browser connection, and confirms
prices arrive.

One number we can now report properly rather than estimate: the batch of prices
a browser receives on connect is **56.9 KB** for all 518 companies. We had
estimated 70 KB; the estimate was 23% high. We had previously corrected the same
figure in the other direction. Both corrections are the same lesson — measure it
rather than reason about it.

### What you would see today

**A page that no longer jumps.** That is the whole visible change, and it is on
every visit.

One honest caveat: the flash is removed **where we have data**. A
freshly-restarted server knows nothing for a few moments, and a company we have
genuinely never seen trade still shows the stored closing price until its first
real price arrives. It is now rare rather than universal, and designing around a
server's first minute would be designing for the wrong thing.

**Next:** browser tabs surviving a deployment — right now, every time we release
an update, every open tab silently stops updating until someone reloads it. Then
the screen this whole run of work is building towards: **live prices across all
518 companies at once.**
