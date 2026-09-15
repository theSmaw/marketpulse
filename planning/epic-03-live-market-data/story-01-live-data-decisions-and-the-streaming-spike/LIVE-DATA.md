# Live data — how a live observation reaches a screen

**Status:** Open. Eight questions, none of them answered.
**Story:** [3.1 Live-Data Decisions & the Streaming Spike](STORY.md)
**Created:** 2026-09-15 by [Task 3.1.1](TASK-01-the-subject-document-and-the-eight-questions.md)
**Finished by:** [Task 3.1.9](TASK-09-the-store-the-process-the-harness-is-gone-and-the-document-lands.md)

This is the subject document for **how a live observation reaches a screen**, and
the file the ten stories after this one cite instead of re-deciding. It is not a
section of [`PROVIDER.md`](../../epic-02-security-universe-historical-data/story-06-market-data-provider-abstraction/PROVIDER.md),
which is the historical provider seam and its outcome taxonomy, and it is not a
section of [`MARKET-DATA-API.md`](../../epic-02-security-universe-historical-data/story-09-market-data-api/MARKET-DATA-API.md),
which is the HTTP wire. Every story in Epic 3 reads this one, and so does
Epic 4's overview.

**On the day it is created it contains no answers, and that is the point.** Six
of its eight questions are settled by a measurement this repository has never
taken. A question written down before the instrument runs is a question the
instrument gets pointed at; a question answered from documentation is how three
error mappings were wrong last time
([`ALPACA.md`](../../epic-02-security-universe-historical-data/story-07-alpaca-historical-data-integration/ALPACA.md)
§9b). Tasks 3.1.3 to 3.1.5 take the captures; Tasks 3.1.7 to 3.1.9 write the
verdicts into §2 and strike the corresponding lines from §3.

**How to read a section that has been answered.** When a question is settled,
its subsection keeps the alternatives and gains a verdict, a date, the
instrument that produced the figure, and a **reversal trigger written as a
condition** rather than as a story number. Nothing here is deleted when it is
answered — the alternatives are the record of what was considered, and a
document that keeps only its conclusions cannot be argued with.

---

## 1. What this epic inherits

**Written for a reader who has not read Epic 2.** Each of these would otherwise
be settled here, differently, by whichever story touched it first — and each is
argued somewhere else. Nothing in §2 may contradict this section; a question
that needs one of these reopened is an escalation rather than a decision.

### 1.1 The stream seam is a sibling interface, and its shape is already taken

`MarketDataStream` is a **second interface** in `apps/backend/src`, beside
`MarketDataProvider` rather than a `subscribe()` method on it, sharing every
domain type in `packages/shared`. Three arguments, all in `PROVIDER.md` §12: the
lifecycles are genuinely different — a fetch is a request with a deadline, an
abort signal and a result, a subscription is long-lived and has connection
state, backpressure and reconnection; a single widened interface forces the
fixture provider to fake a stream and Story 2.7's historical client to ship a
method that throws, which Task 2.6.6 forbids in as many words; and what the two
share is **the data and its provenance, not their shape**.

Composition stays available and is not required — one vendor object may
implement both. And the configuration follows: `MARKET_DATA_PROVIDER`'s id
vocabulary is shared between them, so a deployment names a vendor once.
**This epic adds no second configuration variable.**

Story 3.2 implements it. This document decides what flows through it, not what
it looks like.

### 1.2 WebSocket for market data, SSE for agent events, and the two stay separate

[`PRODUCT_SPEC.md`](../../PRODUCT_SPEC.md) §31. Market data is continuous and
benefits from bidirectional subscription management; agent execution is an
ordered stream of server-generated events. They have different semantics and do
not share a transport.

**What is open here is the message protocol on the browser socket** — §2.2 — and
not the choice of protocol. A proposal that reaches the browser over SSE is out
of scope of this document and is a change to §31.

### 1.3 The free Alpaca plan is asymmetric, and it was measured rather than read

Stored historical bars are consolidated **SIP** — the full US tape. The live
stream is **IEX only**: `wss://stream.data.alpaca.markets/v2/sip` is refused
with `409 insufficient subscription` (`ALPACA.md` §2, 2026-09-07).

The consequence is the one this epic is most likely to get wrong by inheritance.
`PRODUCT_SPEC.md` §7.1 requires that a reader is **not misled about coverage**,
which is a stronger thing than printing an acronym and is not satisfied by
printing one. Epic 2's chrome says `All US exchanges` for the consolidated tape;
carrying that word onto a live tail is the defect §7.1 forbids.
**Invariant 6's fence stands on the sentence under the acronym, not on the
acronym.** The shipped vocabulary is `MARKET_FEED_DESCRIPTIONS` in
`packages/shared/src/market-provenance.ts`, and `pnpm invariants` already holds
both spellings to one home.

### 1.4 Minute-bar channels are exempt from the 30-symbol cap

1,500 symbols accepted in 305 ms; 5,000 in 867 ms; 518 is nowhere near anything
(`ALPACA.md` §1, 2026-09-07). The cap in Alpaca's pricing page applies to
**trades and quotes**, and the measurement carried its own control — a 60-symbol
trades subscription was refused with `405 symbol limit exceeded` in the same
session, which is what proves the instrument could see a cap at all.

**Capacity upstream is not this epic's problem**, and Story 3.5 already cites
those figures. What the exemption does _not_ settle is §2.1: it makes bars
cheap, it does not make trades unnecessary, and the argument for one or the
other is a product argument about what a price on screen means.

### 1.5 A minute bar's `t` marks the START of the interval — on the HTTP API

`SPY`, 2026-09-03: the first bar of the session is stamped `13:30:00Z`, the
session open exactly (`ALPACA.md` §5.3). `Bar.startsAt` maps from `t` with no
shift, and `PROVIDER.md` §9.2 names that as the trap the field's name exists to
catch.

**That is a finding about a different instrument.** It is this story's job to
check it on the socket — Task 3.1.4 — not to assume it. A stream that disagreed
would put every live bar a minute out, silently, on every surface at once.

### 1.6 One replica, one socket, and `minReplicas: 1` is a required setting

ADR [0011](../../../docs/adr/0011-deploying-both-halves-and-what-a-green-deploy-certifies.md).
Container Apps' documented default is `minReplicas: 0` with an HTTP trigger. The
Alpaca socket is **outbound** — our server dials Alpaca — so no ingress request
timeout governs it and the only thing that can kill it is the replica ceasing to
exist. Anything that scales this app to zero breaks the epic's exit criterion,
and **the failure looks like a feed that stops rather than an error**.

Do not conflate this with Epic 10's inbound SSE stream, which is limited by a
different mechanism (a four-minute idle timeout).

**And the free plan allows one concurrent connection.** That is a constraint on
the _account_ rather than on the deployment, so from Story 3.2 onward a
developer running `pnpm dev` with real credentials and the deployed replica are
contending for the same socket. Task 3.1.5 captures what the loser is told.

### 1.7 `packages/shared` may not read the wall clock

Four `no-restricted-syntax` rules hold the conversion boundary and the clock
seam — `Date.now()` and a zero-argument `new Date()` anywhere in
`packages/shared/src`, and `Intl.DateTimeFormat` or the market's timezone
identifier anywhere but `market-time.ts` (ADR
[0017](../../../docs/adr/0017-the-trading-calendar-market-time-and-what-a-correct-calendar-certifies.md),
decisions 5 and 7).

A live-data module that wants _now_ — and staleness is entirely a question about
_now_ — **takes it as an argument or lives in an app package**. §2.5's thresholds
are therefore a shared _vocabulary_ with an app-package _evaluator_, and that
split is inherited rather than open.

### 1.8 The market clock is Story 2.5's, it is done, and it is not a feed fact

`AppHeader`'s status strip renders market time in ET and whether the market is
open, on every route, from the viewer's own clock — a **timezone claim rather
than a synchronisation claim**, stated as such in the component.

A clock is a fact about the trading calendar, not about the data feed
([`CALENDAR.md`](../../epic-02-security-universe-historical-data/story-05-trading-calendar-and-market-time/CALENDAR.md)).
Anything this epic puts in the header — an exchange-supplied timestamp, a
connection state — is a **new fact beside it**, never a rewiring of it. Note the
strip's own constraint: `.clock` is `align-items: flex-end` as the end of the
strip, so a region appended after it takes that edge away.

### 1.9 The connection state comes back BESIDE provenance, not instead of it

_Which venues are in these numbers_ and _is data arriving right now_ are two
facts that **fail independently**, and a single indicator would have to pick
between them. That is Task 1.12.4's two-indicators argument, and Task 2.6.7
already applied it once: the `Market feed` region stopped rendering a hard-coded
`FeedStatus` and started rendering provenance, which is why `FeedStatus` ships
today with `live | stale | disconnected` argued and unreachable.

`FeedStatus` is **not deprecated and must not be struck**. It is this epic's,
and this epic brings it back beside provenance.

### 1.10 The counterfactual for where a live hook is called has been measured once

`useMarketClock` is called from `AppHeader` rather than from `App`. At 1 Hz it
produces **0 `longtask` entries and 60 header DOM mutations over 60 s, all 60
inside the clock cell**; lifting the same hook to `App` re-renders the whole
landing route **40 times in 20 s** against **0**.

Any live hook this epic designs faces exactly that choice **at a much higher
rate**, and the counterfactual already exists so nobody has to argue it. §2.7's
store question and §2.4's state question both land on it.

### 1.11 What Epic 2 handed forward, and it is three sentences that become false

Recorded in [`EPIC.md`](../EPIC.md) and not re-argued here:

- **`market_bars` has no column saying which tape a bar came from.** Provenance
  is one row per `(security, timeframe)` in `bar_coverage`. That is sufficient
  and honest while everything stored is SIP, and stops being either the day this
  epic stores an IEX bar. Story 3.8, and it is a migration.
- **The two-feed ledger has never been produced by a server this product runs.**
  All sixteen recorded bar-series bodies carry `sip`; the state is reached
  through `twoFeedStitchView()`, the recorded stitch with one field changed.
  Story 3.7.
- **`No shares changed hands anywhere in the window.`** is the only shipped
  sentence claiming something about **the market** rather than about our store.
  True while every bar is the consolidated tape; a single venue's silence
  reported as the whole market's the moment it is not — and an absent bar is
  **ordinary** on IEX (82.8% median minute coverage against 99.7% on SIP, worst
  case 43.1%) and **notable** on SIP. Stories 3.7 and 3.10.

### 1.12 The design test this epic was handed by name

**Does it feel alive** has been answered _not yet_ seven times, the seventh at
Epic 2's close. `PRODUCT_SPEC.md` §5.6 is explicit that a market screen updating
by silently swapping text is _technically correct and feels dead_.

The motion vocabulary belongs to **Story 3.4**, against a real moving number,
and this document does not pre-empt it. What this document owes it is §2.1 and
§2.5: what a change _is_ and how often one arrives are the inputs to any
vocabulary about change, and a vocabulary settled before those are known is a
vocabulary settled against a guess.

---

## 2. The eight questions, open

Each carries: what the question actually is; the alternatives, stated so a
reader can tell them apart; **what would settle it** — a named instrument or a
named person; and which stories consume the answer. Where a preference is
obvious it is said so and **what would have to be true to overturn it** is said
with it, because a leaning recorded as a leaning is a thing a measurement can
still move.

**None of these carries an answer**, and the temptation to answer three of them
while writing them down is the thing this task exists to resist. Task 2.7.1's
cap test is the precedent that matters: it was expected to confirm a blocker and
instead re-sized the universe from 101 to 518. A measurement sometimes moves the
product question rather than confirming it.

---

### 2.1 What a live observation is

**The question.** What arrives from Alpaca and becomes a domain object: minute
bars, individual trades, or both.

**The product consequence, stated first because it is not a mechanism.** A
minute bar means a price on screen can be **up to a minute old and still live**.
Every staleness sentence this epic writes inherits that, §2.5 is arithmetic
about it, Story 3.4's motion vocabulary animates it, and a reader looking at a
number that last changed 55 seconds ago is looking at a correct one. A trade
stream has no such floor and a completely different one: a thin name may not
print for minutes, and its "live" price is then an old trade rather than a
recent bar.

**The alternatives.**

1. **Minute bars only (`b`).** One observation per symbol per minute, exempt
   from the 30-symbol cap (§1.4). The same shape as everything already stored,
   so a live bar is a `Bar` and the chart, the store and the provenance record
   all already understand it.
2. **Trades only (`t`).** The finest grain the plan sells, **capped at 30
   symbols** — which is 5.8% of the universe and cannot serve `/securities` at
   all.
3. **Both**, with trades for a small focused set and bars for the universe. Two
   observation types, two staleness vocabularies, and a price on the table that
   means something different from the price on the security page.
4. **Bars plus a derived last price**, where the last price is the bar's close
   and nothing subscribes to trades. This is (1) with a name for what a surface
   reads.

**The obvious preference, and what would overturn it.** (1). The cap makes (2)
unable to serve the product and makes (3) a guarantee of two vocabularies, and
`Bar` already exists end to end. It would be overturned if Task 3.1.4 finds that
IEX minute bars are so sparse for real names that a bar-only feed looks
**broken** rather than quiet — `ALPACA.md` §5.2's worst case was a security with
a bar for fewer than half the minutes in a session, and that figure was taken on
_stored_ IEX history rather than on the stream. A 43% surface is a product
problem that a 30-symbol trade channel might partly answer for the focused case.

**What would settle it.** Task 3.1.4, against a live session: the real per-minute
coverage of the `b` channel for 518 symbols, thin names included, and the
message shapes of `t` and `q` recorded once even though they are almost
certainly out of scope.

**Consumed by** Stories 3.2 (normalization), 3.5 (the state model), 3.7 (what a
chart may draw), 3.8 (the schema) and 3.9 (what is stored).

---

### 2.2 The browser transport's message protocol

**The question.** WebSocket is settled (§1.2). What is open is what travels over
it: whether a browser is sent a **snapshot then deltas** or **deltas only**, how
a browser says which symbols it wants, and whether the server **coalesces**
before sending.

**The three sub-questions, because they are separable.**

_Snapshot or not._ A browser that connects mid-session with deltas only has an
empty screen until the next minute boundary — up to 60 s of nothing on a page
that says `LIVE`. A snapshot on subscribe fixes that and duplicates state the
page may already have fetched over HTTP. The alternative that avoids both is
that the HTTP read stays the snapshot and the socket is deltas only, with the
page's existing fetch as its initial state — which couples the socket's
correctness to a request it did not make.

_How a browser asks._ A client→server subscribe message, mirroring Alpaca's own
shape; or an address-derived subscription where the server reads the route; or
no asking at all, because the server pushes the same thing to everybody (§2.3).

_Coalescing._ At one bar a symbol a minute the arrival is bursty — the question
is whether 518 messages land in one browser inside a few hundred milliseconds,
and whether the server should batch a window of frames into one message rather
than let a browser's event loop take 518 wake-ups. This is §1.10's measurement
one layer out.

**What would settle it.** The rate and burst shape from Task 3.1.4 — arrivals
per second at the open, at midday and at the close, and how tightly a minute's
518 bars cluster. Coalescing is a decision about a **measured burst**, and a
batching window written from argument is exactly the tolerance `CLAUDE.md`
forbids.

**Consumed by** Stories 3.3 (which builds the transport), 3.5, 3.6 and 3.10
(which must say something honest when the socket drops mid-protocol).

---

### 2.3 What the browser is subscribed to

**The question.** The whole universe, the rows currently visible, or the one
security on screen. **518 × one bar a minute is a different payload from one.**

**The alternatives.**

1. **Everything.** The server pushes every observation to every browser. One
   subscription model, no client bookkeeping, and the landing page and the table
   are correct for free. The payload is the full universe whether or not a
   reader can see any of it.
2. **What is on screen**, negotiated per client — the table's visible rows plus
   the selected security. The smallest honest payload, and the most state: the
   server tracks a subscription set per connection, and a scroll changes it.
3. **One security**, the route's subject. Trivial, and it cannot serve
   `/securities` at all.
4. **A fixed set** — the four market proxies and eleven sector SPDRs, say —
   pushed to everyone, with per-security detail negotiated on top.

**The preference is not obvious and that is why it goes to a person** (§2.6, and
Task 3.1.6 asks it). The reason is that it trades payload against **the
product's own promise**: `PRODUCT_SPEC.md` §9's landing page shows the whole
market moving at once, and Epic 4 builds it. An answer that only works for one
security is an answer Epic 4 has to re-take, and re-taking a subscription model
after two surfaces depend on it is not a re-take, it is a rewrite.

**What would settle it.** The measured bytes per minute for the whole universe
(Task 3.1.4) against a person's answer about what the product promises
(Task 3.1.6). Note that (1) is affordable or it is not, and that is arithmetic
nobody has done because nobody has measured a frame.

**Consumed by** Stories 3.5 (subscription management is this question's
implementation), 3.6 (which is affordable or not depending on it) and Epic 4.

---

### 2.4 Where the current market state lives, and how much of it

**The question.** The backend holds something between two extremes, and they are
different objects with different costs.

- **The last observation per security** — a map of 518 entries, a few hundred
  bytes each, rebuilt from nothing in one minute of streaming.
- **Today's bars per security** — 518 × 390 at full session, which is ~202,000
  bars in memory, and the thing Story 3.7's chart wants so that a live edge does
  not re-query the store on every tick.

**The alternatives.**

1. **Last observation only.** Cheap, and every surface that wants today's shape
   asks the database. Which means Story 3.9 — storing the live session — is a
   dependency of Story 3.7 rather than a story after it.
2. **Today's bars in memory**, per security, discarded at the close. Fast reads,
   a real memory figure to justify, and a restart loses the session until the
   store has it.
3. **Last observation in memory, today's bars from the store**, with the store
   written as bars arrive. The split that makes each surface read the thing that
   is already shaped for it — and it makes Story 3.9 load-bearing rather than a
   convenience.
4. **Neither** — the socket fans out and the backend holds nothing. Every
   consumer then needs its own subscription, which Epic 4's overview, Epic 5's
   scores and Epic 7's tools all explicitly do not want.

**What would settle it.** Partly arithmetic — the measured per-bar object size
against 202,000 — and partly the container's real memory headroom, which is a
figure ADR 0011's sizing has but this question has never been put to. Partly it
is §2.1: if an observation is a trade rather than a bar, (2) is not 202,000
objects, it is unbounded.

**Consumed by** Stories 3.5 (it _is_ the current-market-state model), 3.7, 3.9,
and every later epic that reads _the latest observation per security_ without
wanting to hold a socket.

---

### 2.5 The staleness vocabulary, in numbers

**The question.** `FeedStatus` ships `live | stale | disconnected` and says
**nothing about when one becomes the next**. Two numbers are missing: how long
without an observation before a feed is `stale`, and how long before it is
`disconnected` rather than quiet.

**Why this is hard rather than a constant.** The quietest legitimate interval on
a minute-bar feed **is a minute** (§2.1), so any threshold under ~60 s marks a
healthy feed stale. And on IEX an **absent bar is ordinary** — 82.8% median
minute coverage, worst case 43.1% — so a per-security threshold and a per-feed
threshold are genuinely different claims. A security with no bar for four
minutes may be a silent security on a working feed; the feed being silent for
four minutes across 518 securities is not.

**The alternatives.**

1. **One threshold on the feed**, measured across all symbols: the feed is
   `live` while _something_ is arriving. Simple, honest about the connection,
   and says nothing about whether the number a reader is looking at is current.
2. **Two scopes** — a feed status and a per-security freshness — with different
   numbers and different words. Honest, and it is two vocabularies on one screen
   unless §2.6's words keep them apart.
3. **Three scopes**, adding _the market is shut_, which is
   `MarketSessionStatus` and already exists. A feed that is quiet at 03:00 is
   not stale, it is out of hours, and conflating the two is the single most
   likely wrong sentence this epic can ship.

**The obvious part.** (3)'s distinction is not really optional — the market
being open does not mean data is flowing, and `FeedStatus` and
`MarketSessionStatus` are deliberately separate vocabularies for exactly that.
What is open is whether the _per-security_ scope in (2) exists at all in this
epic.

**What would settle it.** Task 3.1.3 and Task 3.1.4 together: the **longest
legitimate silence** on the socket inside a session, and the longest outside
one. A threshold is set from the measured tail of that distribution, not from a
round number — `CLAUDE.md`'s _a tolerance is measured, never argued_, and the
190-not-180 plot-gap ceiling is the local precedent.

**Consumed by** Stories 3.3 (which first renders a status), 3.6, 3.7 and
especially 3.10, which treats the degraded states as a set.

---

### 2.6 What the live feed is called on screen

**The question.** The words. `PRODUCT_SPEC.md` §7.1 is explicit that three
letters teach a non-specialist nothing and that we must not imply IEX represents
every US exchange, so the live feed's label is **a label with a sentence under
it**:

> **Market feed: IEX** — trades reported by the IEX exchange only, not the full
> US consolidated tape.

Those exact strings already ship in `MARKET_FEED_DESCRIPTIONS`, and
`pnpm invariants` holds each to one home. **So the vocabulary is not the open
part.** What is open is the grid: a screen in this epic can show a **feed** and
a **connection state** at once, and there are four cells rather than two —
connected to IEX, disconnected from IEX, showing stored SIP bars with no live
tail, and showing a series that is **both**. Each needs a sentence that is true
on its own and true beside its neighbour, and Task 2.14.7's finding is that a
state is correct alone and wrong beside another.

**The alternatives, for the connection half.**

1. **`LIVE`** as `PRODUCT_SPEC.md` §9's header mock shows, a word rather than a
   status name. It is the mock, it is short, and it is a claim.
2. One of `FeedStatus`'s own three words rendered directly, which is what the
   chrome did until Task 2.6.7 and which put the invented word `DISCONNECTED` on
   a market product for two epics.
3. **A sentence with a time in it** — `§36`'s _Live feed disconnected —
   displaying data through 10:42:17_ — for the non-live cells, with a short word
   for the live one.

**What would settle it.** A person, at Task 3.1.6, for the one sub-question that
is genuinely a claim rather than a word: **whether `LIVE` means the socket is
up or data is arriving.** Those are different claims at 03:00 and identical at
10:42, and §2.8's answer decides how often the difference is visible.

**Consumed by** Story 3.3, which puts these words on every route in the product,
and Story 3.10, which produces the rest of the grid.

---

### 2.7 Whether the frontend gains a store

**The question.**
[`FRONTEND-STATE.md`](../../epic-02-security-universe-historical-data/story-10-frontend-market-data-layer/FRONTEND-STATE.md)
§1 declined a store with **three reversal triggers, written as conditions**, and
this epic is the first plausible firing of the first one:

- the first piece of state **two sibling surfaces both write**;
- the first `WorkspaceCommand` applied to state no URL can carry;
- the first requirement for undo, redo or a replayable command log.

**And what is explicitly not a trigger**: bundle size, a third hook, or a
component tree deep enough that prop-drilling is annoying.

**The question this epic actually has to answer** is whether live observations
are state that two surfaces _write_, or state that one thing writes and many
read. A socket is a single writer by construction. If the table and the security
page both read the same map and neither writes it, the first trigger has **not**
fired however many components are involved. If Story 3.6's table and Story 3.7's
chart both hold and mutate their own copy of today's session, it has.

**The alternatives.**

1. **No store.** A module holding the live map, a subscription hook reading it,
   and the same discriminated-union-with-a-pure-transition shape Story 2.10
   established — a reducer that has not been told it is one.
2. **Redux**, which `PRODUCT_SPEC.md` §25 recommends and which
   `FRONTEND-STATE.md` §1 deferred rather than rejected, taken now while there
   are two live surfaces rather than six.
3. **An RxJS pipeline** into the existing module, which §25 recommends for
   streams specifically and which is a different decision from a store —
   cancellation and backpressure rather than shared mutable state.

**What would settle it.** Not a measurement: this is read off the trigger with
the epic's own design in hand, at Task 3.1.9, and **the answer must name which
condition fired or state that none did.** Answering it in whichever story first
finds prop-drilling annoying is the failure mode the triggers were written to
prevent.

**Consumed by** Stories 3.4, 3.6 and 3.7, and by Epic 11, which is what
`FRONTEND-STATE.md` §1's argument is ultimately about.

---

### 2.8 The socket's relationship to the process

**The question.** One replica, one socket, `minReplicas: 1` (§1.6). What is open
is **whether the socket is held open outside market hours**, and it is a cost
question as much as an engineering one.

**Why it is a cost question.** The Consumption plan's idle vCPU rate requires
the replica to receive **less than 1,000 bytes per second**. A replica holding a
live feed exceeds that through every session, which moves the recorded estimate
from **$4.21** to **$14.04** for the replica — $9.21 to $19.04 a month with ACR
Basic. Whether it _also_ exceeds it at 03:00 depends entirely on what the socket
says when the market is shut, which is Task 3.1.3 and which nobody has measured.
**Both of those figures are Epic 1's arithmetic rather than a bill**; both
billing APIs refused to answer, then answered `[]` and `429`.

**The alternatives.**

1. **Always open.** A feed that is up is a feed that can say so, reconnection is
   one code path rather than two, and there is no schedule to get wrong. It
   costs money for nothing overnight if the socket is chatty when the market is
   shut.
2. **Open on the session**, closed at the bell, driven by the trading calendar
   that already exists. Cheaper if (1) is chatty, and it adds a scheduled
   transition whose failure mode is a feed that does not come back at 09:30 —
   and a calendar bug then looks like an outage.
3. **Open on demand**, when a browser is connected. Cheapest, and it makes the
   backend's current market state (§2.4) empty for the first minute after a
   quiet period, on every surface, including a cold load at 10:42.

**The obvious preference is (1), and it is the one that costs money.** It would
be overturned by Task 3.1.3 measuring real traffic on an idle socket, or by a
person deciding at Task 3.1.6 that the overnight rate is not worth a simpler
code path.

**And it decides §2.6's open sub-question.** Under (1), `LIVE` at 03:00 means
_the socket is up_ and no data is arriving, so the two readings of the word
visibly diverge every night. Under (2) or (3) they rarely do.

**What would settle it.** Task 3.1.3 for the traffic, Task 3.1.6 for the person,
Task 3.1.9 for the write-up. **Story 3.11 re-measures the bill**, and only a
month of billing reads it; this story produces an **envelope** from the measured
message rate and says so.

**Consumed by** Stories 3.2 (the connection state machine), 3.10 (reconnection)
and 3.11 (the cost envelope and the budget threshold).

---

## 3. The register of figures that do not exist

**The honest starting position, enumerated rather than characterised**, because
_we have measured the WebSocket_ is the sentence this repository is one careless
citation away from. `ALPACA.md` §10 is explicit: the stream was measured **for
its subscription cap and for nothing else**. No bar was ever consumed from the
socket, no message was read, no reconnection behaviour was touched, and every
other figure in that document is from the historical HTTP API.

This is the worklist for Tasks 3.1.3 to 3.1.5 — a list rather than a search —
and every line is something a later story is **currently sized against**. A line
is struck only when the figure is written into §2 with its date and its
instrument.

### 3.1 The frames themselves

| #   | Figure                                                                                        | Sized against it                           | Task  |
| --- | --------------------------------------------------------------------------------------------- | ------------------------------------------ | ----- |
| 1   | The shape of a `b` frame — field names, types, symbol encoding                                | 3.2's normalization to `Bar` + `BarSource` | 3.1.4 |
| 2   | The shapes of `t` and `q` frames, recorded once even though out of scope                      | §2.1's alternative 3                       | 3.1.4 |
| 3   | The handshake verbatim — connect, auth, subscribe, and the acknowledgement's own shape        | 3.2's state machine                        | 3.1.2 |
| 4   | **Which end of the interval the stream's `t` marks.** §1.5 is the HTTP API's answer           | Every surface at once, silently            | 3.1.4 |
| 5   | Whether a `b` frame ever arrives with zero volume, or whether a quiet minute is simply absent | §2.5's thresholds; 3.10's gap-filling      | 3.1.4 |

### 3.2 Rate, latency and size

| #   | Figure                                                                      | Sized against it                                                                                                                                              | Task  |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 6   | Messages per second for 518 symbols at the open, at midday and at the close | §2.2's coalescing, §2.3, 3.5, 3.6                                                                                                                             | 3.1.4 |
| 7   | The burst shape — how tightly a minute's bars cluster after the boundary    | §2.2, and §1.10's re-render question one layer out                                                                                                            | 3.1.4 |
| 8   | **p50/p95 gap between a bar's `t` and its arrival**                         | `PRODUCT_SPEC.md` §28's _event → application state <250 ms p95_, which **excludes upstream latency** and which nothing has ever measured the upstream half of | 3.1.4 |
| 9   | Bytes per second on the socket during a session                             | §2.8's cost, 3.11's envelope                                                                                                                                  | 3.1.4 |
| 10  | Bytes per second on the socket **outside** a session                        | §2.8's whole question; the 1,000 B/s idle-rate condition                                                                                                      | 3.1.3 |
| 11  | Connect + authenticate + subscribe latency for 518 symbols                  | 3.2's startup, 3.10's reconnection budget                                                                                                                     | 3.1.2 |

**On figure 8 specifically.** §28's target is stated as excluding provider
latency, and **nothing in this repository knows where the provider ends.** Until
that gap is measured, any claim that the target is met is a claim about a
denominator nobody has. It is the single most consequential number on this list.

### 3.3 Coverage, and whether the feed looks broken

| #   | Figure                                                                                                                                                                                        | Sized against it                                                | Task  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----- |
| 12  | **Real live IEX per-minute coverage, thin names included.** `ALPACA.md` §5.2's 82.8% / 43.1% was measured on **stored** IEX history; the live stream is the case that figure was always about | §2.1, §2.5, 3.6's 518 rows, 3.7's chart, 3.10's honest sentence | 3.1.4 |
| 13  | Whether the universe's thinnest names produce a bar in a session at all                                                                                                                       | Whether a bar-only feed reads as quiet or as broken             | 3.1.4 |

### 3.4 Silence, and being unhappy

| #   | Figure                                                                                                            | Sized against it                                                             | Task         |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------ |
| 14  | What the socket says pre-market, after hours, overnight, at a weekend and on a holiday                            | §2.8, §2.5, 3.10                                                             | 3.1.3        |
| 15  | **The longest legitimate silence**, inside a session and outside one                                              | §2.5's two numbers, directly                                                 | 3.1.3, 3.1.4 |
| 16  | Whether the server sends keepalives or pings, and at what interval                                                | 3.2's liveness detection; §2.5's disconnected threshold                      | 3.1.3        |
| 17  | The duplicate-connection frame and code, verbatim — the free plan allows **one**                                  | 3.2, and every developer running `pnpm dev` against a live deployment (§1.6) | 3.1.5        |
| 18  | The bad-credential frame and code, verbatim                                                                       | 3.2's error mapping                                                          | 3.1.5        |
| 19  | What a server-side close looks like, and whether an idle connection is closed at all                              | 3.10's reconnection                                                          | 3.1.5        |
| 20  | **Whether a resubscribe replays missed bars** — almost certainly not, and _almost certainly_ is not a measurement | 3.10's gap-filling, which is a different story if the answer is yes          | 3.1.5        |

**Why these are captured verbatim rather than mapped from documentation.**
`ALPACA.md` §9b records three things a documentation-based mapping got wrong on
the HTTP API — including a future range answering `403` where a `200` was
expected. The stream has had no such pass at all.

### 3.5 Downstream of the socket, and unmeasured for a different reason

These are not vendor figures and cannot be taken by the spike; they are listed
because later stories are sized against them and nobody should mistake their
absence for a measurement.

| #   | Figure                                                            | Sized against it                             | Owner    |
| --- | ----------------------------------------------------------------- | -------------------------------------------- | -------- |
| 21  | Messages per second reaching one browser tab, and its render cost | §1.10's counterfactual at a much higher rate | 3.3, 3.6 |
| 22  | Concurrent browsers one replica sustains                          | §2.3's fan-out                               | 3.5      |
| 23  | Memory held by today's bars for 518 securities                    | §2.4's alternative 2                         | 3.5      |
| 24  | The real monthly bill with a socket held open                     | §2.8; only a month of billing reads it       | 3.11     |

### 3.6 And two things about the instrument itself

- **Every figure in `ALPACA.md` is from one free-plan paper account**, so
  anything account-scoped is n=1. This spike inherits that and does not fix it.
- **The subscription-cap figures (§1.4) were taken on 2026-09-07 against a
  different question.** They are the only WebSocket numbers this repository has,
  they are about the acknowledgement rather than about any message, and they are
  **dated observations of a third party** — re-measure rather than cite.

---

## What this document deliberately does not decide

- **The client** — Story 3.2. This document decides what flows, not what dials.
- **Anything on screen** — Story 3.3 onwards.
- **The motion vocabulary** — Story 3.4, against a real moving number, which
  this story does not produce.
- **The schema change** — Story 3.8.
- **The bill** — Story 3.11. This story estimates an envelope from a measured
  message rate; only a month of billing reads the real number.
