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

**Amended 2026-09-15 by Task 3.1.2.** The eight questions in §2 are still open
and none of them is answered below. What has changed is that the socket has been
**read** for the first time: §4 holds the handshake frame by frame, the control
messages, what a bad subscription does, the `sip` refusal first-hand and the
clock discipline every later figure depends on, and §5 records how to re-take
all of it.

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

**Re-taken first-hand 2026-09-15 (Task 3.1.2, §4.5), and the shape is not what
inheritance would suggest.** The socket **opens**, the server greets us exactly
as the working endpoint does, and the `409` arrives at **authentication** as a
frame — after which the server leaves the socket open. Connection state must be
driven by the authenticated frame, never by `onopen`.

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

> **Amended 2026-09-17 by §7.11's second decision, and this is a premise change
> rather than a detail.** The product subscribes `updatedBars`, so **a live
> observation can be superseded by a later, corrected one for the same minute**
> — measured at about thirty seconds behind, changing volume always and the
> close price in three of fourteen cases (§7.8). Every alternative below was
> written assuming an observation is final once delivered. Whichever is chosen
> must answer what happens when a bar arrives for a minute that already has one:
> replace in place, keep both, or version it. **Nothing below currently does.**

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

**Amended 2026-09-16 — the grid has a fifth cell, and it is the one where the
word and the connection state disagree most.**
[ADR 0030](../../../docs/adr/0030-replaying-our-own-bars-and-the-mechanisms-that-stop-the-live-feed-rotting.md)
adds a **replay** stream over our own stored bars, so a screen can now show a
connection that is genuinely delivering observations while the market is shut
and the numbers are a recording. Three consequences for this question:

- **A fifth `MarketFeed` member, `replay`, with a sentence of its own.** Neither
  existing member is honest for it. `sip` is the recording's real tape, and
  printing it beside a live-looking screen is exactly the coverage implication
  §7.1 forbids; `synthetic`'s _"Generated test data. Not a market feed."_ invites
  a reader to dismiss numbers that are **real**. The words:

  > **Market feed: Replay** — real bars from a past US session, replayed. Not
  > the live market.

- **The word `LIVE` must never render while the feed is `replay`.** This is the
  sub-question above — _does `LIVE` mean the socket is up or data is arriving_ —
  arriving in its sharpest form, and it answers itself: at 03:00 with a replay
  running, **both** readings are true of the connection and **neither** is true
  of the market, which is what the word is read as claiming. The cell reads
  **`REPLAYING`**. That leaves the original sub-question live only for the
  `iex` cells, where it remains Task 3.1.6's.
- **Three regions, three facts, and this is where the two vocabularies earn
  their separation.** The market clock still says **closed** — a replay running
  does not open a market — the feed region says **Replay**, and the connection
  region reports arriving observations honestly. A design that collapsed any two
  of those would have to lie about one of them.
- **None of this renders in production**, and that is a decision rather than an
  omission: ADR 0030 decision 7a. **The deployed site never replays at any
  hour** — it has real users and must only ever tell the absolute truth about
  the real market — so out of hours it shows stored history, a clock reading
  closed, and a feed that is not delivering. The replay cell is specified to the
  production standard anyway, because a screenshot of a local run is the most
  likely thing to escape into a README or a slide, and holding the development
  surface to the same bar is what retires that risk rather than accepting it.

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

**Amended 2026-09-15 by Task 3.1.3 — the out-of-hours half is now measured, and
it is not close.** An idle socket receives **0 payload bytes**, ≈**0.15 B/s**
counting the control frames' own headers, against the 1,000 B/s threshold
(§6.4). So the out-of-hours rate cannot move the replica off the idle rate, and
the objection this question was waiting on does not exist. What survives is a
question about **meaning** rather than money, and it is Task 3.1.6's first: what
`LIVE` claims at 03:00 when the socket is up and nothing is arriving. The
in-session half is still figure 9 and still Task 3.1.4's.

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

| #   | Figure                                                                                                                                     | Sized against it                           | Task  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ----- |
| 1   | ~~The shape of a `b` frame~~ **STRUCK 2026-09-16 — §7.2: one field set `S,T,c,h,l,n,o,t,v,vw` across all 129,481 frames**                  | 3.2's normalization to `Bar` + `BarSource` | 3.1.4 |
| 2   | ~~The shapes of `t` and `q` frames~~ **STRUCK 2026-09-16 — §7.2, both verbatim; `q` is 552 msg/s for TEN symbols**                         | §2.1's alternative 3                       | 3.1.4 |
| 3   | ~~The handshake verbatim — connect, auth, subscribe, and the acknowledgement's own shape~~ **STRUCK 2026-09-15 — §4.1, §4.2**              | 3.2's state machine                        | 3.1.2 |
| 4   | ~~**Which end of the interval the stream's `t` marks**~~ **STRUCK 2026-09-16 — §7.3: the START, agreeing with §1.5, with an HTTP control** | Every surface at once, silently            | 3.1.4 |
| 5   | ~~Whether a `b` frame ever arrives with zero volume~~ **STRUCK 2026-09-16 — §7.2: ABSENT. 0 of 129,481 carried `v:0`; 0 repeats**          | §2.5's thresholds; 3.10's gap-filling      | 3.1.4 |

**And one figure arrived that nobody listed — 2026-09-16, §7.8.** The `u`
(`updatedBars`) channel restates a bar about thirty seconds after it was
delivered, and in this capture **every one of the fourteen restatements changed
the bar**, three of them on the close price. It is not on this register because
nobody thought to ask, which is the argument for capturing a channel once even
when the story's position is that it is out of scope. **A register is a list of
known unknowns and this is what the other kind looks like.**

### 3.2 Rate, latency and size

| #   | Figure                                                                                                                                                                                                                  | Sized against it                                                                                                                                              | Task  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 6   | ~~Messages per second for 518 symbols at the open, at midday and at the close~~ **STRUCK 2026-09-16 — §7.5: open p50 9 / p95 419, midday p50 2 / p95 12, close p50 11 / p95 57**                                        | §2.2's coalescing, §2.3, 3.5, 3.6                                                                                                                             | 3.1.4 |
| 7   | ~~The burst shape~~ **STRUCK 2026-09-16 — §7.4: a minute's bars land within 243 ms p50 / 511 ms p95**                                                                                                                   | §2.2, and §1.10's re-render question one layer out                                                                                                            | 3.1.4 |
| 8   | ~~**p50/p95 gap between a bar's `t` and its arrival**~~ **STRUCK 2026-09-16 — §7.4: 491 ms p50 / 684 ms p95 raw, 708 / 901 corrected, against `t + 60s`. An upper bound from Asia/Singapore**                           | `PRODUCT_SPEC.md` §28's _event → application state <250 ms p95_, which **excludes upstream latency** and which nothing has ever measured the upstream half of | 3.1.4 |
| 9   | ~~Bytes per second on the socket during a session~~ **STRUCK 2026-09-16 — §7.5: 6,838 B/s mean at the open, 977 at midday, against ADR 0011's 1,000 B/s**                                                               | §2.8's cost, 3.11's envelope                                                                                                                                  | 3.1.4 |
| 10  | ~~Bytes per second on the socket **outside** a session~~ **STRUCK 2026-09-15 — §6.4: 0 payload bytes in 721 s, ≈0.15 B/s counting the control frames' own headers, against a 1,000 B/s threshold**                      | §2.8's whole question; the 1,000 B/s idle-rate condition                                                                                                      | 3.1.3 |
| 11  | ~~Connect + authenticate + subscribe latency for 518 symbols~~ **STRUCK 2026-09-15 — §4.3: 1,312–1,537 ms, 518/518 accepted, and read it as an envelope rather than a budget until it is re-taken from the deployment** | 3.2's startup, 3.10's reconnection budget                                                                                                                     | 3.1.2 |

**On figure 8 specifically.** §28's target is stated as excluding provider
latency, and **nothing in this repository knows where the provider ends.** Until
that gap is measured, any claim that the target is met is a claim about a
denominator nobody has. It is the single most consequential number on this list.

**Answered 2026-09-16 (§7.4), and the answer is uncomfortable.** The provider's
share is **901 ms p95 corrected** — which is **more than triple §28's entire
250 ms budget, before our own code has run at all**. That figure is an upper
bound from Asia/Singapore over a round trip the production path does not have,
so it does not yet falsify §28; what it does is make §28 **unevaluable** until
the same measurement is taken from `eastus2`. **Story 3.11 owns the re-measure,
its condition is the first real socket in the deployed backend, and no story
before it may quote 901 ms as _the_ number.**

### 3.3 Coverage, and whether the feed looks broken

| #   | Figure                                                                                                                                                         | Sized against it                                                | Task  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----- |
| 12  | ~~**Real live IEX per-minute coverage**~~ **STRUCK 2026-09-16 — §7.6: 321 of 518 symbols p50 in a given minute; 65.1% median per-symbol against 82.8% stored** | §2.1, §2.5, 3.6's 518 rows, 3.7's chart, 3.10's honest sentence | 3.1.4 |
| 13  | ~~Whether the universe's thinnest names produce a bar in a session at all~~ **STRUCK 2026-09-16 — §7.6: all 518 did. Worst is `ERIE` at 2.1%**                 | Whether a bar-only feed reads as quiet or as broken             | 3.1.4 |

### 3.4 Silence, and being unhappy

| #   | Figure                                                                                                                                                                                                                                                                            | Sized against it                                                             | Task         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------ |
| 14  | What the socket says pre-market, after hours, overnight, at a weekend and on a holiday. **PART-STRUCK 2026-09-15 — §6.2, §6.7: early pre-market is silent on nine channels; after hours `dailyBars` rebroadcasts every minute. Weekend → 3.1.9, holiday → unmeasured (§6.9)**     | §2.8, §2.5, 3.10                                                             | 3.1.3        |
| 15  | ~~**The longest legitimate silence**, inside a session and outside one~~ **STRUCK 2026-09-16 — §6.6 outside (≥76 min on bar channels, 60.1 s with `dailyBars`, 54.85 s of any frame) and §7.9 inside (8.6 s of any frame; 54.0 s across the whole hold, which is the heartbeat)** | §2.5's two numbers, directly                                                 | 3.1.3, 3.1.4 |
| 16  | ~~Whether the server sends keepalives or pings, and at what interval~~ **STRUCK 2026-09-15 — §6.3: a server-initiated WebSocket ping every 53.96–54.85 s, on a socket subscribed to nothing and on one subscribed to all 518**                                                    | 3.2's liveness detection; §2.5's disconnected threshold                      | 3.1.3        |
| 17  | The duplicate-connection frame and code, verbatim — the free plan allows **one**                                                                                                                                                                                                  | 3.2, and every developer running `pnpm dev` against a live deployment (§1.6) | 3.1.5        |
| 18  | The bad-credential frame and code, verbatim                                                                                                                                                                                                                                       | 3.2's error mapping                                                          | 3.1.5        |
| 19  | What a server-side close looks like, and whether an idle connection is closed at all                                                                                                                                                                                              | 3.10's reconnection                                                          | 3.1.5        |
| 20  | **Whether a resubscribe replays missed bars** — almost certainly not, and _almost certainly_ is not a measurement                                                                                                                                                                 | 3.10's gap-filling, which is a different story if the answer is yes          | 3.1.5        |

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
- **The harness's own clock was 257 ms slow on 2026-09-15** (§4.7), agreed by
  three independent NTP references. Every arrival gap this story quotes must be
  corrected by the offset recorded in its **own** capture header, and the
  vendor's clock could not be pinned down at all — so figure 8 carries a stated
  residual risk rather than a clean denominator.
- **Every latency in §4.3 was taken from a machine in Asia/Singapore**, and the
  deployment is Azure `eastus2`. The round trip measured 271–311 ms (§4.6), ICMP
  agreeing at 242–383 ms, which is most of the connect term. **This is the
  longest plausible path of the three continents involved**, so the figures are a
  ceiling rather than a typical case.
- **The subscription-cap figures (§1.4) were taken on 2026-09-07 against a
  different question.** They are the only WebSocket numbers this repository has,
  they are about the acknowledgement rather than about any message, and they are
  **dated observations of a third party** — re-measure rather than cite.

---

## 4. What the socket actually says — the handshake, verbatim (2026-09-15, Task 3.1.2)

**This is the first WebSocket frame this repository has ever read.** `ALPACA.md`
§10 is explicit that the stream was measured for its subscription cap and for
nothing else; everything below is new, and it was taken with the market **shut**
(03:49–03:55 ET on a Tuesday), which is deliberate — a handshake needs no
session, so it should not spend one. §5 records how to re-take all of it.

Three lines are struck from §3's register by this section: **figure 3** (the
handshake and the acknowledgement's own shape), **figure 11** (connect +
authenticate + subscribe for 518), and the first-hand version of §1.3's `sip`
refusal.

### 4.1 The handshake, frame by frame, with every frame labelled

```text
                                         (client connects — TLS + HTTP upgrade)
<-- [+2 ms]    SERVER-INITIATED   [{"T":"success","msg":"connected"}]

--> [+0 ms]    request            {"action":"auth","key":"…","secret":"…"}
<-- [+273 ms]  REPLY              [{"T":"success","msg":"authenticated"}]

--> [+0 ms]    request            {"action":"subscribe","bars":["AAPL","NVDA","SPY"]}
<-- [+261 ms]  REPLY              [{"T":"subscription","bars":["AAPL","NVDA","SPY"]}]

--> [+0 ms]    request            {"action":"unsubscribe","bars":["AAPL","NVDA","SPY"]}
<-- [+256 ms]  REPLY              [{"T":"subscription"}]

--> close(1000)
<-- socket-close                  code 1006, empty reason
```

**Which are server-initiated, checked rather than assumed.** The harness sat
**three seconds quiet after connecting and before authenticating** — that window
is the control. The `connected` greeting arrived 2 ms into it with nothing sent,
so it is server-initiated; nothing else arrived in the window, and nothing
arrived in a further five seconds while subscribed to three liquid names with
the market shut. **In this whole capture, exactly one frame is unsolicited and
every other frame is a reply.**

That matters to Story 3.2 in a specific way: a state machine that sends `auth`
on the `open` event, before the greeting, is writing into a socket the server
has not greeted yet. It appears to work — and the six findings below are the
reason "appears to work" is not the bar.

### 4.2 Six things a state machine written from the documentation would get wrong

**1. Every frame is an ARRAY, including the single-message ones.** `[{"T":…}]`,
never `{"T":…}`. A parser written against the example in a blog post unwraps
nothing and matches nothing.

**2. `T` is the discriminant and it is overloaded.** `success`, `error` and
`subscription` are all control messages on the same channel the data arrives on.
`error` is a **frame**, not a transport failure: in nine deliberately bad
requests (§4.4) the socket was never closed once.

**3. The subscription acknowledgement is the FULL CURRENT STATE, not a delta.**
Subscribing to `["RIVN"]` while already holding `["ZZQQTESTX"]` came back
`{"T":"subscription","bars":["RIVN","ZZQQTESTX"]}`. This is the single most
useful finding for Story 3.5: the server is authoritative about what we hold, so
a subscription manager should **reconcile against the ack** rather than maintain
its own count and hope.

**4. An empty subscription is not empty — the key is ABSENT.** Unsubscribing
from everything returned `[{"T":"subscription"}]` with **no `bars` key at all**,
not `"bars":[]`. Code reading `ack.bars.length` throws on the one transition it
most needs to handle.

**5. The acknowledgement list is ordered, and it is not our order.** For 518 the
returned list matched the request exactly — but the request was alphabetical.
In §4.4 a two-symbol hold came back `["RIVN","ZZQQTESTX"]` after being
subscribed in the other order. **Treat the list as a set.**

**6. A clean client-initiated close is observed as `1006`, with an empty
reason.** We sent `close(1000)`; Alpaca does not echo a close frame, so the
local socket reports **abnormal closure** — the same code a dropped link
produces. Confirmed twice, once with a 600 ms wait and once with 3,000 ms, so it
is the server's behaviour rather than our timeout. **The close code cannot tell
Story 3.10 whether we closed or the network did.** The client must carry its own
intent and read the code only after it.

### 4.3 Connect, authenticate and subscribe for the real 518 — figure 11

Three fresh connections, sequential (the free plan allows exactly one), each
subscribing to all **518** tracked securities in one frame.

|                         | Run 1        | Run 2        | Run 3        |
| ----------------------- | ------------ | ------------ | ------------ |
| Connect (TLS + upgrade) | 879 ms       | 807 ms       | 793 ms       |
| Authenticate            | 276 ms       | 280 ms       | 246 ms       |
| Subscribe (518)         | 273 ms       | 450 ms       | 272 ms       |
| **Total**               | **1,427 ms** | **1,537 ms** | **1,312 ms** |
| Accepted                | **518/518**  | **518/518**  | **518/518**  |

The subscribe frame is **3,243 bytes** and the acknowledgement is **3,243
bytes** — the server echoes the list back, so a naive resubscribe-everything
loop costs 6.5 KB each time it fires.

**The control fired.** The accepted **list was counted**, not checked for the
absence of an error, for the reason `ALPACA.md` §1 gives: a server silently
dropping the 31st symbol looks identical to one that took it. And §4.4's last
probe re-took that control on this date — 60 trades symbols still refused with
`405` — so the instrument demonstrably sees a refusal when there is one.

**Three caveats that make these numbers an envelope rather than a budget.**
`connect` is by far the largest term and it is almost entirely network: this was
taken from a machine in **Asia/Singapore** — `/etc/localtime`, verified
2026-09-15, after an earlier draft of this section said "a UK domestic link" and
was wrong — and the round trip to Alpaca measured **271–311 ms** in the
WebSocket probe (§4.6), with ICMP agreeing at **242–383 ms**. The deployment is
Azure `eastus2`, which is a different and **much** shorter path: this is close
to the longest vantage the three continents allow. **Re-take this from the deployed backend before Story
3.2 spends it**, and until then read it as _worst case_, not as _the number_.

### 4.4 What a BAD subscription does — nine probes, one connection

The question Story 3.5 turns on: does the server **reject**, **ignore**, or
**silently accept**? All nine on one authenticated connection, 1.5 s apart, each
followed by a deliberate wait — because "ignored" and "answered" are told apart
by the silence, so a probe that gets no frame must still wait for one.

| Probe                                        | Server's answer, verbatim                                  | Reading                   |
| -------------------------------------------- | ---------------------------------------------------------- | ------------------------- |
| `bars:["ZZQQTESTX"]` — no such symbol        | `[{"T":"subscription","bars":["ZZQQTESTX"]}]`              | **SILENTLY ACCEPTED**     |
| `bars:["RIVN"]` — real, not in our 518       | `[{"T":"subscription","bars":["RIVN","ZZQQTESTX"]}]`       | Accepted; full state back |
| `bars:[]` — empty list                       | `[{"T":"error","code":400,"msg":"invalid syntax"}]`        | **Rejected**              |
| `{"action":"subscribe"}` — no channel        | `[{"T":"error","code":400,"msg":"invalid syntax"}]`        | Rejected                  |
| `sprockets:["AAPL"]` — unknown channel       | `[{"T":"error","code":400,"msg":"invalid syntax"}]`        | Rejected                  |
| `news:["AAPL"]` — real channel, wrong stream | `[{"T":"error","code":400,"msg":"invalid syntax"}]`        | Rejected                  |
| `trades:[60 symbols]` — **the control**      | `[{"T":"error","code":405,"msg":"symbol limit exceeded"}]` | Control fired             |
| `unsubscribe bars:["KO"]` — never held       | `[{"T":"subscription","bars":["RIVN","ZZQQTESTX"]}]`       | Accepted, state unchanged |
| `{"action":"levitate"}` — unknown action     | `[{"T":"error","code":400,"msg":"invalid syntax"}]`        | Rejected                  |

**The socket was never closed. Not once.** Nine bad requests, nine frames, one
connection surviving all of them. An error on this protocol is a message about a
request, not an event about the connection, and Story 3.2 should not tear a
socket down for one.

**Two of these change Story 3.5's shape rather than informing it.**

- **Alpaca does not validate symbols, so we must.** `ZZQQTESTX` was accepted and
  echoed back as held. A subscription acknowledgement is therefore **not**
  evidence that a symbol exists, and a security that silently never produces a
  bar is indistinguishable from a typo. Validation against our own universe is
  the only thing that can tell them apart, and it has to happen **before** the
  frame is sent.
- **An empty list is a 400, so a subscription manager must not send one.** That
  is exactly the frame a filter that matched nothing produces. "Send whatever
  the selection resolves to" is a bug on the empty selection, and it is the easy
  one to write.

**And the four `400`s are indistinguishable from each other.** An unknown
channel, an unknown action, a missing key and an empty list all return the same
`code` and the same `msg`. Any developer-facing message about a malformed
subscription has to be written by **us**, from what we sent, because the server
will not say which of the four it was.

### 4.5 The `sip` refusal, first-hand — and it is not where you would look for it

`PRODUCT_SPEC.md` §7.1 and `ALPACA.md` §2 both assert this; **invariant 6 stands
on it**, so this story took it rather than inheriting it.

```text
        (connect to wss://stream.data.alpaca.markets/v2/sip)
<-- socket OPEN                   — the HTTP upgrade SUCCEEDS
<-- [+2 ms]    [{"T":"success","msg":"connected"}]      — identical greeting
--> auth
<-- [+255 ms]  [{"T":"error","code":409,"msg":"insufficient subscription"}]
        (server does NOT close. Held 5s: still open, still silent.)
```

Confirmed on **2026-09-15** against the same credential that authenticated
against `/v2/iex` minutes earlier — which is the control, because a refusal on
both endpoints would have been a bad credential rather than a plan boundary.

**The shape is the finding.** The refusal is not at the upgrade and not at the
DNS — the socket opens, and the server greets us exactly as the working endpoint
does. It arrives **at authentication**, as a frame, and **the server leaves the
socket open afterwards**. A client whose "connected" state keys off the socket
being open would report a healthy SIP connection indefinitely, having received
one `409` it ignored. Connection state must be driven by the **authenticated**
frame, never by `onopen`.

### 4.6 Control frames, keepalives, and a fact about the built-in `WebSocket`

- **The server answers a client ping**, echoing the payload: 311 ms and 271 ms
  for two probes. That is a working liveness check available to Story 3.2 and a
  round-trip figure for §4.3's caveat.
- **No server-initiated ping was observed in 30 seconds of quiet** (nor in the
  10 s of the handshake capture). This **bounds figure 16 from below and does not
  answer it** — a long idle is Task 3.1.3's, and this line is not a strike.
  **Amended 2026-09-15 by Task 3.1.3 (§6.3): the server pings every 54 seconds,
  so this capture was structurally incapable of seeing one and the caution above
  was the difference between a bound and a wrong inference.**
- **Node's built-in `WebSocket` cannot see a ping or a pong at all.** The WHATWG
  API defines `open`/`message`/`close`/`error` and no control-frame event, so an
  implementation built on the global cannot do ping-based liveness detection and
  cannot observe the server's keepalive if there is one. The harness therefore
  uses `ws@8`. **This is a constraint on Story 3.2's client**, discovered here
  and costing nothing here.
- The recorder's control-frame path was **exercised deliberately** rather than
  assumed. Zero server pings in a capture whose ping handler had never fired is
  an untested instrument, not a measurement of silence — and Task 3.1.3's entire
  job is to sit in silence and report what arrived.

### 4.7 The clock discipline — and the figure is bigger than the budget

Every latency this story produces is a difference between a **vendor** timestamp
and **ours**, so an unstated clock offset is a silent constant added to all of
them.

**Measured 2026-09-15, `sntp -t 5`, three samples against each of three
independent servers:**

| Reference             | Median offset | Spread |
| --------------------- | ------------- | ------ |
| `time.apple.com`      | +255.6 ms     | 2.8 ms |
| `time.cloudflare.com` | +258.3 ms     | 2.8 ms |
| `pool.ntp.org`        | +257.7 ms     | 4.0 ms |

**Three independent references agree to within 2.1 ms: this machine's clock is
≈257 ms BEHIND true time.** Three servers rather than one is the control — one
reference cannot tell a wrong local clock from a wrong reference.

**That figure is larger than the whole of `PRODUCT_SPEC.md` §28's 250 ms
budget**, and it has the dangerous sign: a clock running late makes an arrival
look **earlier** than it was, so every uncorrected arrival gap measured on this
machine is **understated by about a quarter of a second**. Figure 8 is described
in §3.2 as the most consequential number on the list; taken naively here it
would have been flattering and wrong.

**The rule, and it is a rule rather than a note.** The harness re-takes the
offset **at the top of every run** and writes it into the capture header
(`capture.clock`), so the correction belongs to the capture rather than to this
paragraph. Tasks 3.1.4 and 3.1.5 must **subtract the offset recorded in their
own capture** before quoting any gap, and must quote the NTP spread beside it.
A capture whose `clock.established` is `false` yields **upper bounds**, labelled
as such, not latencies.

**We did not correct the machine's clock**, deliberately: a spike that silently
changes the environment it measures cannot be re-run against the same
conditions, and the correction is arithmetic we can apply afterwards from a
number we recorded.

**Amended 2026-09-16 by Task 3.1.4, and the amendment is the rule earning its
keep on its first use.** The same machine, the same three-sample method, the
same reference: **+55.3 ms, spread 0.27 ms**, against yesterday's **+257 ms,
spread 2.8 ms**. Nothing was done to the clock between the two — macOS simply
re-disciplined it overnight. So the offset is **not a property of this machine**
that a later capture could inherit; it is a property of the hour a capture ran
in, and it moved by **202 ms**, which is four-fifths of `PRODUCT_SPEC.md` §28's
entire budget. A Task 3.1.4 that had cited §4.7's figure instead of re-taking it
would have over-corrected every arrival gap by about a fifth of a second, in the
direction that makes the provider look **slower** than it is. The rule above
says re-take per run; this is the measurement that says what citing would have
cost.

**The vendor's own clock could not be pinned down, and that is stated rather
than omitted.** Five `HEAD` requests to `data.alpaca.markets` put the apparent
local-minus-vendor difference between **−570 ms and +420 ms**, but the `Date`
header has **one-second granularity** and the round trip was 769–1,288 ms on
this link. That bounds the vendor offset; it does not measure it. **So the
residual risk is stated plainly: if Alpaca's bar timestamps are not
NTP-accurate, no instrument in this story can tell.** Figure 8 should be quoted
with that sentence attached.

### 4.8 The capture format, fixed here (v1)

Three tasks with three different windows must produce **comparable files**
rather than three formats. One JSON document per run:

```text
capture   captureFormat, task, name, endpoint, question, control, instrument,
          node, wsLibrary, startedAt, startedAtMarketTime, clock,
          endedAt, durationMs, frameCount, credentialSweep
outcome   the run's own answers, named
notes     [ { at, offsetMs, text } ]
frames    [ { seq, direction, kind, at, atMarketTime, offsetMs,
              bytes, raw, parsed?, closeCode? } ]
```

**Four fields are load-bearing rather than tidy.**

- **`at` — the arrival instant by our clock, on every frame.** The gap between a
  bar's `t` and this is the number Task 3.1.4 exists to produce, and it **cannot
  be recovered afterwards** from a file that did not record it. This is the one
  field whose absence would make a capture worthless rather than incomplete.
- **`offsetMs`** — monotonic from the run's start (`performance.now()`), so
  burst shape and inter-arrival gaps survive a wall-clock adjustment mid-run.
- **`clock`** — taken fresh per run, per §4.7. Not cited.
- **`control`** — what result would have told me the instrument was lying,
  written **before** the run. A capture with no control is a story, and a run
  whose control did not fire is **inconclusive rather than clean**.

`atMarketTime` sits beside `at` because half the findings in this story are
about session boundaries, and `2026-09-15T07:49:28Z` does not read as
`03:49 EDT` to anybody at speed.

**Extended 2026-09-16 by Task 3.1.4 — v1 gains a sidecar, and it is a
measurement decision rather than a storage one.** A whole-session capture holds
tens of thousands of frames. Re-serialising that array into one pretty-printed
document every 60 s, as the shut-market holds do, **blocks the event loop for
seconds at a time as the file grows** — and the field a block delays is `at`,
the arrival instant §4.8 has already named as the one whose absence would make a
capture worthless. An instrument that inflates the number it exists to produce
is worse than no instrument, because the output looks like a measurement.

So a capture may set `streamFrames`, and then:

- **every frame is appended to `<capture-name>.frames.jsonl`** as one JSON
  object per line, redacted and **swept line by line** before the append, in
  arrival order — a sub-millisecond write that does not grow with the capture;
- the v1 document keeps its header, `outcome`, `notes`, and a `frames` array
  holding **the handshake plus a rolling tail** rather than everything, with
  `framesLog` naming the sidecar;
- `verify-captures.mjs` sweeps the sidecars too, and checks the same per-frame
  shape.

**Nothing is discarded and the sidecar is the evidence.** The header stays the
comparable part across all three capture tasks, which is what §4.8 was fixing in
the first place; what changed is only where the frames live for a run long
enough that holding them in one string would corrupt them.

### 4.9 The credential boundary, and the break that proves it

The shape is `ALPACA.md` §11's, which was verified clean across 22 captures, and
it is a **mechanism rather than a habit**:

- The credential lives in an env file **outside the repository** for the length
  of this story, `chmod 600`, and **Task 3.1.9 deletes it with the harness**.
- `redact()` replaces the credential's bytes at the moment a frame is recorded.
  The `auth` frame is the only frame in this product that ever carries the
  secret, and it reaches every capture as
  `{"action":"auth","key":"[KEY-ID REDACTED]","secret":"[SECRET REDACTED]"}`.
- `sweep()` then **refuses to write the file** if the credential's bytes survive
  anywhere in the serialised document — in verbatim, percent-encoded **and
  base64** form, the last being a smuggling `redact()` alone would not catch.
  Two layers, because a redaction the author forgot is the case this exists for.
- `verify-captures.mjs` re-sweeps **every file on disk afterwards**,
  independently of the writer, and also checks each one still carries the v1
  header and a well-formed frame array.

**And the check was broken on purpose**, per this repository's rule that a check
which has never gone red has never been tested. `sweep-break.mjs` defeats
`redact()` by writing the raw secret into a capture after recording, and asserts
three refusals and that **no file appeared on disk**:

```text
secret verbatim   -> refused: true   (REFUSING TO WRITE: … 1 occurrence(s) …)
key id verbatim   -> refused: true
secret as base64  -> refused: true
files in captures/: 8 before, 8 after — must be equal
BREAK VERIFIED
```

**Nine captures written on 2026-09-15, all swept clean, twice each.**

---

## 5. How the spike was taken, so it can be re-taken (Tasks 3.1.2–3.1.5)

The shape is `ALPACA.md` §11's and Task 1.13.1's, and it is a rule rather than a
style: **a harness outside the tree, run, recorded, deleted, leaving the tree
byte-identical outside `planning/`.** Task 3.1.9 performs the deletion and the
final sweep; until then the harness exists so Tasks 3.1.3 to 3.1.5 can point it
at a window without rebuilding a recorder against a clock.

**Where it lives.** `~/marketpulse-live-spike/`, outside the repository
entirely. Nothing in the workspace imports it and it imports nothing from the
workspace — the 518 symbols were extracted **once, as data**, into
`universe.json` beside it, rather than reaching into `apps/backend/src`.

**What it is.** Eight scripts and one recorder module, on Node 24 with a single
dependency (`ws@8`, for the control-frame visibility §4.6 explains the built-in
`WebSocket` cannot give). `handshake.mjs`, `handshake-518.mjs`,
`bad-subscriptions.mjs`, `sip-refusal.mjs`, `keepalive-probe.mjs`, `clock.mjs`,
`sweep-break.mjs` and `verify-captures.mjs`, writing the v1 captures of §4.8.
**Task 3.1.3 added two**: `quiet-window.mjs`, which holds a window and writes
its capture **incrementally every 60 s** so an interrupted hold still yields the
window it got, and `analyse-window.mjs`, which prints a capture's numbers and
concludes nothing.

**Task 3.1.4 added four more** (2026-09-16): `session.mjs`, one connection held
across a whole trading day with a scheduler that waits for the **next**
occurrence of a market time rather than a number of seconds into its own day;
`analyse-session.mjs`, which prints every figure §7 needs and concludes nothing;
`historical-control.mjs`, the HTTP refetch that makes §7.3 a control rather than
an assertion; and `supervise-session.sh`.

**The supervisor is the one worth explaining, because it exists for a failure
this document has now recorded three times.** §6.4's silent death took Task
3.1.3's open boundary; it took Task 3.1.4's first attempt at 08:38:41 on
2026-09-16 after twenty-two minutes; and a hold that dies is not recoverable by
an instrument that is designed, correctly, to stop when it does. The supervisor
relaunches `session.mjs` whenever a segment ends before the window closes, backs
off, and **refuses to race a capture that is already holding the socket** — the
free plan allows one, and a supervisor that raced would be the duplicate §5's
own note warns about. It does not touch the instrument: the watchdog still bounds
every segment at its last inbound instant, and each segment is its own capture
with its own header.

**It was never needed on the day it was written** — the second hold ran the full
7.77 hours — and that is not an argument against it. **A rate figure must not be
taken across a seam**, because each relaunch re-subscribes 518 symbols and has
its own first-frame latency; `finish.sh` prints the segment count at the head of
its report for that reason, and became segment-aware in the same change after it
was found to read only the **newest** capture file, which is right for one file
and silently a fifth of a measurement once there are seams.

**And it added a watchdog, after §6.4.** `harness.mjs` records the instant of
every inbound frame and exposes `silentForMs()`; a hold ends, names the last
live instant and marks its capture `endedOnWatchdog` when nothing of any kind
has arrived for **165 s** — three missed 54 s heartbeats. `DEAD_AFTER_MS` exists
as an environment override **only** so the watchdog can be proven to fire below
the heartbeat interval; a real capture never sets it.

**Task 3.1.4 added three, and it is the first capture in this story long enough
for the recorder's own cost to matter.** `session.mjs` holds one connection
across a whole trading day and writes the v1 sidecar of §4.8;
`analyse-session.mjs` streams that sidecar back line by line and prints the
figures in bounded memory, concluding nothing; and `historical-control.mjs` is
**the control for the `t` question** — it refetches the same minutes from the
historical HTTP API after the 15-minute embargo and matches them against the
live bars **unshifted and shifted by ±1 minute**, because a high unshifted match
rate proves nothing on its own. It is the shifted rows going to zero that tells
the two hypotheses apart.

Three of `session.mjs`'s choices are decisions rather than settings, and each
would be invisible in a figure that inherited it silently:

- **`quotes` is a bounded probe, not a subscription.** A top-of-book feed for
  ten liquid names runs one to two orders of magnitude above trades; nine and a
  half hours of it would bury the bar measurement in a multi-gigabyte sidecar.
  The shape and a rate figure are taken across two named minutes instead, with
  both instants recorded, so anything quoted about `q` is a figure about those
  minutes and says so.
- **`dailyBars` stays at ten symbols and its byte share is reported apart from
  everything else**, per §6.7. A blended byte rate cannot be un-blended
  afterwards, and Decision 1 may well drop the channel.
- **The tally runs inside the recorder, not over the frame array.** The array is
  deliberately trimmed while streaming, so a poller would miss precisely the
  open burst the capture exists to measure.

**One connection at a time.** The free plan allows exactly one, so every run is
sequential with a gap. Measuring a duplicate-connection refusal **on purpose**
is Task 3.1.5; measuring one by accident is how three of these figures would be
wrong.

**And the hazard is not only a capture you remember starting — 2026-09-16.**
Task 3.1.4's launcher grew a pre-flight refusal that looks for a running harness
process, and **on its first rehearsal it refused**: a monitoring loop left over
from Task 3.1.3's session was still polling, hours after the capture it watched
had been written. It held no socket, so this particular one was a false
positive — but a **stale process from a finished task, still running and
invisible**, is precisely the shape that would have corrupted both captures
silently, and nothing before this looked for one. The check is anchored on
`argv[0]` being `node`, because a pattern loose enough to catch a monitoring
shell is a pattern that refuses to launch on the day the window opens.

**Every capture states its control before it runs**, and §4 says which ones
fired. The three that carry real weight: the three-second silence before `auth`
(the greeting is server-initiated), the 60-symbol trades subscription (the
instrument can see a refusal), and three independent NTP servers (a wrong local
clock is distinguishable from a wrong reference).

**Read the numbers, not the script's conclusion.** `ALPACA.md` §11 records an
automated verdict that was wrong and was caught only because 391 > 390 is
arithmetically impossible. Every figure in §4 was read off the capture by hand
before it was written here.

**What the whole of §4 is n=1 on**, inherited from `ALPACA.md` §10 and not
fixed here: one free-plan paper account, one machine in Asia/Singapore, one domestic link.
§4.3's latencies are the ones this bites hardest — see the caveat there.

---

## 6. What the socket says when the market is shut (2026-09-15, Task 3.1.3)

**A connection that is up says something every 54 seconds and says nothing
else.** Both halves of that sentence are load-bearing, and the second half was
proved in a way this task did not plan: **one of its own captures spent 4 hours
21 minutes recording silence from a connection that was already dead**, and
nothing in the instrument noticed. The finding the task was written to look for
— can Story 3.10 tell _quiet_ from _dead_ — was answered from both ends in the
same window. Yes, and **only** by watching the heartbeat.

Everything below was taken on **Tuesday 2026-09-15**, a full trading day, with
the harness of §5 against `wss://stream.data.alpaca.markets/v2/iex` on the free
plan. **The free plan allows exactly one connection**, so the windows are
sequential by necessity, and two of the four this task was written to take went
to other tasks rather than spend somebody else's window — §6.9 says which, with
owners.

### 6.1 The windows, and which of them this task actually holds

| Window                            | Market time taken          | Held    | Capture                               | Disposition                                           |
| --------------------------------- | -------------------------- | ------- | ------------------------------------- | ----------------------------------------------------- |
| No session at all (overnight)     | 03:49:28 – 03:55:00 ET     | 9 runs  | the nine `3.1.2-*` captures           | Short samples; the long hold is §6.9's                |
| Pre-market, subscribed to nothing | 04:14:56 – 04:27:02 ET     | 724.9 s | `3.1.3-idle-unsubscribed-premarket-…` | **Clean** — figure 10                                 |
| Pre-market, nine channels         | 04:27:09 – **05:31:07** ET | 3,838 s | `3.1.3-premarket-through-open-…`      | **Bounded by the death of the socket**, not by design |
| After hours (16:00–20:00 ET)      | 19:53 – 19:56 ET           | 184.8 s | `3.1.3-watchdog-control-afterhours-…` | A **control** that became §6.7's finding              |
| Across the 20:00 ET boundary      | 19:58 – 20:10 ET           | 12 min  | `3.1.3-after-2000-et-…`               | Taken to bound §6.7                                   |
| The open boundary                 | —                          | —       | —                                     | **Not measured. Moved to Task 3.1.4** — §6.5          |
| A holiday                         | —                          | —       | —                                     | **Unmeasured**, owner named — §6.9                    |

**Why two pre-market captures rather than one.** The first is subscribed to
nothing at all, the second to everything this account can have. A silent socket
subscribed to nothing measures the **server's** behaviour toward an idle
connection; a silent socket subscribed to 518 bar channels and eight others
measures the **venue**. Either alone leaves "is this quiet because nothing is
trading, or because a subscription silently did not take?" unanswerable.

### 6.2 Nothing whatsoever, on nine channels at once

**In 76 minutes of early pre-market — 04:14:56 to 05:31:07 ET — not one data
message arrived, on any channel.** Not a bar, not a trade, not a quote, not a
trading status. The qualifier _early_ is doing real work, and §6.7 is why: out
of hours is **not one state**, and there is a channel that is never quiet at
all. The subscription acknowledgement confirms what was live at the time:

```text
{"T":"subscription","trades":10,"quotes":10,"bars":518,"updatedBars":10,
 "dailyBars":10,"statuses":10,"corrections":10,"cancelErrors":10}
```

**518 bar channels and eight other channels for ten of the most liquid names in
the US market** — `AAPL`, `NVDA`, `SPY`, `TSLA`, `AMD`, `QQQ`, `MSFT`, `AMZN`,
`META`, `F` — and the socket said nothing for an hour and a quarter.

**The control was stated before the run and it is what makes this readable.**
Trades and quotes were subscribed _alongside_ bars deliberately: had bars been
silent while trades were not, the silence would have been about the **channel**,
and an instrument subscribed to bars alone could not have told the two apart.
All nine were silent together, which is a quiet venue rather than a broken
subscription.

**What this does and does not say about extended hours.** It says that in the
**early** pre-market — 04:14 to 05:31 ET — IEX delivers nothing at all through
this feed, so an extended-hours tail cannot appear on a chart from that stretch
because there is nothing in it. It says **nothing about 07:00–09:30 ET**, which
is where pre-market volume actually is, and that half of the question is
**unanswered and owned** (§6.9). The task's real worry — that pre-market bars
arrive on `b` indistinguishable from regular-session bars and silently grow a
thin tail on every chart Stories 3.6 and 3.7 draw — is therefore **still open**,
and it is open with a narrower question than it started with.

### 6.3 The server heartbeats every 54 seconds — figure 16 STRUCK

**A WebSocket ping frame arrives from the server every 54 seconds, and it is a
property of the connection rather than of the subscription.**

| Socket                                       | Intervals | Min     | Max     |
| -------------------------------------------- | --------- | ------- | ------- |
| Authenticated, subscribed to **nothing**     | n = 12    | 53.96 s | 54.04 s |
| Authenticated, **518 bars + eight channels** | n = 70    | 53.96 s | 54.85 s |

This **strikes figure 16**, and it inverts what the task expected. Its own Notes
argued that a quiet socket would prove indistinguishable from a dead one and
that the finding would "force a heartbeat into the design". It does not:
**Story 3.10 can tell a quiet socket from a dead one without this product
inventing a keepalive of its own.** A connection with no inbound frame of any
kind — data or control — for materially more than 54 seconds is not quiet. It is
gone. §6.4 is what that sentence cost to learn.

**It also corrects §4.6's reading of its own result.** That capture recorded "no
server-initiated ping in 30 seconds of quiet" and called it a lower bound rather
than a strike. It was right to: 30 seconds is **shorter than the interval**, so
that capture was structurally incapable of seeing a ping, and an instrument that
cannot see a thing has not measured its absence.

**And it decides a library, which §4.6 had only argued about.** Node's built-in
`WebSocket` exposes no control-frame event at all, so a Story 3.2 client written
on the global **cannot see this ping** — it forfeits the only liveness signal the
connection offers at 03:00, on a feed whose data channels are legitimately
silent for hours. That is now a constraint on the client rather than a note about
the instrument, and Task 3.1.9 hands it forward.

### 6.4 A dead connection is indistinguishable from a quiet one — unless you watch the heartbeat

**The capture that was meant to photograph the open instead photographed a
half-open TCP connection, in full, by accident.**

```text
05:31:07 ET   ping  (the 71st, and the last inbound frame of any kind)
   …          4 h 21 min 09 s of nothing: no data, no ping, no close, no error
09:52:16 ET   we ask to close
09:52:46 ET   close fires — 30,016 ms later, ws@8's close TIMEOUT rather than a handshake
```

**Every signal a naive client looks at said the connection was fine.**
`readyState` was `OPEN` throughout. No `error` event. No `close` frame. No
TCP reset reached us. The application had one true statement available to it and
was not reading it: **the heartbeats had stopped.** Twenty minutes in — while the
machine was still awake and before anything else had changed — **22 of them in a
row had failed to arrive**, which is 20 minutes of warning nobody collected. By
the time we asked to close, roughly **290** had been missed.

**The 30-second close is the second, independent witness.** A live socket
answers a close in a fraction of a second — a control run tonight against the
same endpoint completed its close in **243 ms**. This one sat for exactly
ws@8's 30 s close timeout and then gave up, which is what a close looks like
when there is nothing at the other end.

**What killed it is _not_ determined, and that is stated rather than guessed.**
The machine was awake and its lid open until 05:51 ET — twenty minutes **after**
the last heartbeat — so the obvious explanation does not fit; the retained
system logs carry no network event at that instant; the lid then closed, which
is why nothing recovered. Two candidates remain, an upstream or middlebox drop
and a local network interruption, and **this instrument cannot separate them**.
**It does not matter to the product.** The finding is not "Alpaca dropped us" —
it is that **a connection can stop existing without a single event to say so**,
which is true of every WebSocket on every network, and which this epic now has
first-hand in its own record instead of as folklore.

**What it costs and what it buys.** It cost the open boundary, which moves to
Task 3.1.4 (§6.5). It buys three things no argument would have won:

1. **Story 3.2's client must run a liveness watchdog on inbound frames**, not on
   `readyState` and not on data alone. The threshold has a measured basis for the
   first time: three missed heartbeats ≈ **165 s**, against an interval of
   53.96–54.85 s. Under 60 s it would fire on a healthy socket between pings;
   much over 165 s and the product tells a user that a dead feed is live.
2. **`FeedStatus.live` must never be derivable from "the socket object is
   open".** On 2026-09-15 that predicate was true for four hours and twenty-one
   minutes of a connection to nothing. Under §2.6's unresolved reading of the
   word, this is exactly the 3am case: `LIVE` on screen, with the evidence for it
   being a variable rather than a fact about the market.
3. **The reconnect path is not an edge case**, it is the ordinary consequence of
   holding a socket open all day, and §2.8's alternative 1 must be costed with it
   rather than as "one code path rather than two".

**And the instrument was repaired the same day.** `harness.mjs` now records the
instant of every inbound frame and exposes `silentForMs()`; `quiet-window.mjs`
ends a hold, writes a note naming the last live instant, and marks the capture
`endedOnWatchdog` when nothing has arrived for 165 s. **The watchdog was then
broken on purpose** — run with the threshold set below the heartbeat interval, it
must fire on a demonstrably healthy socket, and it did, at 10 s, naming the last
inbound frame. A control run at the real threshold across three heartbeats did
not fire. This matters beyond tidiness: Tasks 3.1.4 and 3.1.5 each get one
window, and an instrument that cannot tell a dead socket from a quiet market
would have spent one of them the same way this task spent its own.

### 6.5 The open boundary was not measured, and it moves to Task 3.1.4

The task's Done-when asks for the instant traffic starts relative to 09:30:00 ET,
to the second. **It was not taken**, and nothing in the capture may be read as if
it were: the socket had been dead for nearly four hours by the time 09:30
arrived, so "no traffic at the open" in that file is a fact about a broken
connection and not about the market.

**It is handed to Task 3.1.4 rather than re-taken here**, for a reason that is
about windows rather than convenience. 3.1.4 must hold a capture across the whole
session anyway; it already inherited the close boundary and after hours (§6.9);
and its capture has to start before 09:30 to measure the open burst at all. So
the open boundary costs it **nothing extra**, where re-taking it here costs
another overnight vigil on a machine that must stay awake, and the second attempt
is the one most likely to be tired. Its capture should start at **07:00 ET** so
that the same run also answers §6.2's open half — whether liquid pre-market
produces bars on `b`, and whether anything marks them as extended-hours.

### 6.6 The longest observed silence, with its instants

Three numbers, and **conflating any two of them is a defect Story 3.10 would
inherit.**

| Silence                                             | Longest observed | From        | To          |
| --------------------------------------------------- | ---------------- | ----------- | ----------- |
| **Of data**, market shut, bar channels, two holds   | **≥ 76 min**     | 04:14:56 ET | 05:31:07 ET |
| **Of data**, market shut, with `dailyBars` attached | **60.1 s**       | 20:00:00 ET | 20:01:00 ET |
| **Of any inbound frame**, on a live connection      | **54.85 s**      | 04:40:42 ET | 04:41:37 ET |

The first is a lower bound rather than a measurement, and twice over: it spans
**two consecutive connections** (a 12-minute idle hold, then the long one) with
a 7-second gap between them, and it is bounded at the far end by the **death of
the socket** at 05:31:07 rather than by a bar arriving. The true out-of-hours data
silence is longer and is at least the whole overnight — the market simply does
not trade, and §6.2's nine-channel control is what makes that a statement about
the venue rather than about a subscription.

**The middle row is why §2.5 cannot have a single number.** The same socket, in
the same shut market, is silent for 76 minutes or for 60 seconds depending
entirely on **which channels are subscribed** — so a staleness threshold defined
against "the feed" is really defined against a subscription decision that has
not been taken yet (§2.1, §2.3). The threshold and the subscription are one
decision seen twice, which is the shape Task 3.1.7 exists to handle.

**The last row is the one with a threshold hanging off it**, and it is remarkably
tight: across 82 heartbeat intervals on two independently established sockets,
the longest gap between inbound frames on a healthy connection was **54.85 s**.
That is the measured tail §2.5 asks for on the _connection_ scale, and it is what
makes 165 s a derived figure rather than a round number. The **data**-silence
thresholds §2.5 needs for a _security_ still require a session, and are 3.1.4's.

### 6.7 Out of hours is not one state — the daily-bar channel is never quiet

**This was found by a control run rather than by a question**, which is the
second time in one task that the instrument's own scaffolding produced the
finding.

At **19:54, 19:55 and 19:56 ET** — after the closing bell, inside the
extended-hours session — the `dailyBars` channel delivered **ten messages a
minute, one per subscribed symbol, and the payload did not change**:

```text
19:54:00 ET  {"T":"d","S":"F","o":13.88,"h":13.885,"l":13.48,"c":13.51,
              "v":1715158,"t":"2026-09-15T04:00:00Z","n":5663,"vw":13.581094}
19:55:00 ET  {"T":"d","S":"F", … "v":1715158 … "n":5663 … }   byte-identical
19:56:00 ET  {"T":"d","S":"F", … "v":1715158 … "n":5663 … }   byte-identical
```

Same volume, same close, same trade count, three minutes running, for every one
of the ten symbols. **It is an unchanged aggregate rebroadcast on a schedule**,
and it carries no information whatsoever.

**The arithmetic, and it is the reason this is in the record rather than in a
footnote.** Ten symbols cost **21.6 B/s** of payload — 3,887 bytes over 180 s.
Multiplied to the tracked universe that is on the order of **1,100 B/s**, which
is **past ADR 0011's 1,000 B/s idle-vCPU condition**, out of hours, for data
that never changes. §6.4's "an idle socket costs 0.15 B/s" is therefore true of
**the socket** and false of **a subscription** — the out-of-hours byte rate is a
property of the channels chosen, and one of those channels can put the cost
objection to §2.8 straight back on the table.

**Two consequences, and neither is a tuning detail.**

1. **Decision 1 (§2.1) and Decision 3 (§2.3) should not take `dailyBars` at
   universe scale.** Not because of the bytes alone, but because the bytes buy
   nothing: the same number, re-sent. If a surface needs a day's aggregate, it
   can hold the last one it received.
2. **"Did anything arrive?" is not a liveness test.** A feed that re-sends
   identical payloads on a timer will satisfy it forever. This is the mirror
   image of §6.4 — there, a dead socket looked alive because nothing arrived and
   nothing was watching; here, a stale value would look alive because something
   arrives and it never changes. **Story 3.10's staleness rule must be about the
   observation's own timestamp, never about the arrival of a frame.**

**What is bounded and what is not.** A second hold was taken deliberately
across the end of the extended session — 19:58:19 to 20:10:25 ET — to find out
whether it stops at 20:00. **It does not.** 120 `d` messages in 12 minutes, ten
a minute, unchanged, straight through the boundary and still going at 20:10:00,
at **21.574 B/s** against the earlier window's 21.556 B/s. So the rebroadcast is
not tied to the extended session's close.

It **is** absent from the 04:14–05:31 ET window with the same ten symbols
subscribed, so it stops somewhere between 20:10 and 04:14 ET — presumably at the
daily rollover, and **the instant is unmeasured**. It is not chased, and the
reason is worth stating rather than leaving as a gap: the product decision is
the same whichever hour it is, because the channel carries nothing at any of
them. Should a later story ever want the channel, that story owes the boundary.

**Two runs, one number.** 21.556 B/s and 21.574 B/s, from two independently
established connections 4 minutes apart, is as close to a repeated measurement
as anything in this story has.

### 6.8 Three smaller things worth having written down

- **A trades subscription silently attaches `corrections` and `cancelErrors`**
  for the same symbols, unrequested. The acknowledgement remains authoritative
  full state, but **a reconciler that diffs the whole acknowledgement against
  what it asked for is wrong on the first subscription, every time** — it will
  see two channels it never requested and conclude it has drifted. Reconcile per
  channel asked for.
- **`statuses` is accepted and was silent**, which is worth recording because
  trading-status messages are the one thing a reader might expect out of hours
  (a halt, an auction notice). Ten liquid names, 76 minutes, nothing.
- **A clean client-initiated close on a live socket completed in 243 ms**, which
  is the number §4.2's `1006` finding was missing. A close that takes 30 s is not
  a slow close; it is a close with nobody on the other end.

### 6.9 What was NOT covered, and who holds each one

**A window listed as unmeasured with nobody holding it is how a window never
gets taken.** Each of these carries an owner and a condition rather than an
intention.

- **The open boundary — owner: Task 3.1.4**, per §6.5, whose capture should start
  at 07:00 ET and which already runs to 16:30 ET.
- **Liquid pre-market (07:00–09:30 ET) and whether extended-hours bars are
  marked — owner: Task 3.1.4**, the same capture. This is a **product** question
  and not only a vendor one: if pre-market bars arrive on `b` with nothing
  distinguishing them, every chart in Stories 3.6, 3.7 and 3.9 silently gains a
  thin tail, and the decision about whether to draw it belongs beside the
  measurement.
- **After hours (16:00–20:00 ET) and the close boundary — owner: Task 3.1.4.**
  This task could not take them without holding the single permitted connection
  across the entire session, which is what its own placement note promised not to
  do. Tonight's two runs at 19:53 and 19:56 ET are watchdog controls, not that
  window, and they are labelled so in the capture directory.
- **A weekend — owner: Task 3.1.9**, as a constraint on when it may delete the
  harness. It is deliberately **not** a tenth task: a task whose trigger is a
  date is a task that never fires, and this repository has the scar — the fourth
  design test has been deferred seven times for exactly that reason.
- **A holiday — unmeasured, and stated rather than inferred.** No market holiday
  falls inside this story's window. The next closure the calendar table carries
  is **Thanksgiving, 2026-11-26**, with a **13:00 ET half day on 2026-11-27**
  after it; the half day is the more interesting of the two, because it is the
  one case where the socket's idea of the close and `CALENDAR.md`'s can disagree
  by three hours. **Owner: the first story that ships a scheduled transition
  driven by the trading calendar** — Story 3.2 if §2.8 settles on alternative 2
  or 3, otherwise Story 3.10, whose degraded states are the only surface a wrong
  half-day answer reaches.
- ~~**Everything about a session.**~~ The rate, the burst shape, the arrival
  gap, what a bar's `t` marks on the stream, and real IEX coverage are figures 6,
  7, 8, 12 and 13, all Task 3.1.4's. **Nothing in this section bounds any of
  them.** A socket that is silent out of hours has said nothing whatsoever about
  what it does at 09:30:00. **Taken 2026-09-16 — §7.** The sentence is left
  standing because it was the right thing to say at the time and is the reason
  §7 exists; what changed is that §7 now bounds all five.

---

## 7. What the socket says during a session (2026-09-16, Task 3.1.4)

**A minute bar arrives about half a second after the minute it describes has
ended, and roughly 320 of 518 symbols produce one in any given minute.** Those
two sentences are the story: the provider is fast and the feed is thin, and
every later decision in this epic is a consequence of one or the other.

Taken on **Wednesday 2026-09-16**, a full regular session, with the harness of
§5 against `wss://stream.data.alpaca.markets/v2/iex` on the free plan. One
connection, held **08:43:44 → 16:30:03 ET — 7.77 hours, 150,334 frames**, ended
because the window closed rather than because the watchdog fired.

**n=1, and it is a Wednesday in September.** Every rate figure below is one
sample of one day. A later story quoting any of them as a constant is quoting a
Wednesday. The shapes — that the open is burstier than midday, that `t` opens
the interval, that coverage is thin — are the durable part; the numbers are a
sighting.

### 7.1 The windows, and the one that is short

| Window              | Market time            | Disposition                                                        |
| ------------------- | ---------------------- | ------------------------------------------------------------------ |
| Pre-market          | 08:43:47 – 09:30 ET    | **Short by 1h43m** of the 07:00 the task asked for — see below     |
| The open boundary   | 09:30:00 ET            | **Clean** — figures 6, 7, and §6.5's delegated instant             |
| The regular session | 09:30 – 16:00 ET       | **Clean** — 390 of 390 bar minutes observed                        |
| The close boundary  | 16:00:00 ET            | **Clean** — §6.9's delegated instant                               |
| After the bell      | 16:00 – 16:30 ET       | **Clean** — §6.9's fourth window                                   |
| A `quotes` probe    | 09:35:04 – 09:37:04 ET | Bounded on purpose, subscribed and unsubscribed with both instants |

**The pre-market window is short and the reason is not interesting: the capture
was started late.** The first attempt connected at 08:16:59 and its socket went
silent at 08:38:41 — the §6.4 failure again, third occurrence — so the watchdog
ended it at 08:43:12 with 68 frames, and the hold that produced everything below
began 35 seconds later. What is lost is 07:00–08:43, which is most of where
liquid pre-market volume is. **The extended-hours question in §7.7 is answered;
the pre-market _rate_ is not, and must not be quoted from this capture.**

> **A trap in the analyser's own output, recorded because it would have been
> transcribed.** `analyse-session.mjs` prints a `pre-market 07:00-09:30` row with
> `span=9000s silentSeconds=8868 total=218`. The socket did not exist for 8,568
> of those seconds. Read as printed it understates the pre-market rate roughly
> threefold. This is `ALPACA.md` §11's rule — _read the numbers, not the script's
> conclusion_ — earning its keep for the second time.

### 7.2 Every message type that arrived — figures 1, 2 and 5

Seven, and two of them were not asked for by name.

| `T`             | Count   | Bytes      | Window            |
| --------------- | ------- | ---------- | ----------------- |
| `t` trade       | 165,707 | 18,850,298 | 08:44:06–16:28:08 |
| `b` minute bar  | 129,481 | 15,252,699 | 08:43:59–16:30:00 |
| `q` quote       | 66,204  | 8,832,316  | **120 s only**    |
| `d` daily bar   | 4,200   | 531,629    | 09:31:00–16:30:00 |
| `u` updated bar | 14      | 1,742      | 09:39:30–16:00:30 |
| `subscription`  | 4       | 14,452     | acknowledgements  |
| `success`       | 2       | 70         | connect, auth     |

Plus **516 server WebSocket pings**, which is §6.3's 54 s heartbeat continuing
unchanged inside a session.

**A bar, verbatim** — figure 1, and the field set is the same for all 129,481:

```json
{
  "T": "b",
  "S": "CIEN",
  "o": 347.3,
  "h": 347.3,
  "l": 347.3,
  "c": 347.3,
  "v": 50,
  "t": "2026-09-16T12:43:00Z",
  "n": 2,
  "vw": 347.3
}
```

**A trade** — figure 2:

```json
{
  "T": "t",
  "S": "QQQ",
  "i": 11,
  "x": "V",
  "p": 707.64,
  "s": 120,
  "c": ["@", "T"],
  "z": "C",
  "t": "2026-09-16T12:44:06.259763316Z"
}
```

**A quote** — figure 2, and the reason it was bounded: 66,204 messages and
8.8 MB in **120 seconds for ten symbols** is 552 msg/s and 73.6 kB/s. At 518
symbols it is not a feed this product can carry to a browser, and that is
settled by arithmetic rather than by preference:

```json
{
  "T": "q",
  "S": "QQQ",
  "bx": "V",
  "bp": 708.02,
  "bs": 120,
  "ax": "V",
  "ap": 708.35,
  "as": 280,
  "c": ["R"],
  "z": "C",
  "t": "2026-09-16T13:35:04.443139256Z"
}
```

**Figure 5 is answered, and the answer is _absent_.** Zero of 129,481 bars
carried `v: 0`, and zero `(symbol, t)` pairs arrived twice on `b`. A minute in
which a symbol did not trade produces **no frame at all** — not a zero-volume
bar, not a repeat. Story 3.7 inherits _absent_, and §2.5's staleness vocabulary
has to distinguish _no bar_ from _no connection_ without help from the feed.

### 7.3 `t` marks the START of the interval — figure 4, with a control

**Agreement with `ALPACA.md` §5.3, said plainly: the stream and the HTTP API
mark the same end of the minute, and it is the start.**

Two instruments, the same minutes. `historical-control.mjs` refetched 10:00–11:00
ET for `SPY, NVDA, AAPL, TSLA, F` over HTTP after the embargo and matched them
against the live frames. **Every pair was identical on `o/h/l/c/v/n/vw`, unshifted**,
and the ±1-minute shifted matches went to zero. Two of ten:

```
NVDA  live  {"T":"b","S":"NVDA","o":214.88,"h":214.895,"l":214.555,"c":214.75,"v":5184,"t":"2026-09-16T14:01:00Z","n":82,"vw":214.743662}
NVDA  http  {"c":214.75,"h":214.895,"l":214.555,"n":82,"o":214.88,"t":"2026-09-16T14:01:00Z","v":5184,"vw":214.743662}
```

The arithmetic agrees independently: a bar stamped `14:01:00Z` arrives at
`14:02:00.5Z`, which is only explicable if `t` opens the interval and the frame
is emitted when it closes. **A stream that marked the END would have put every
live bar a minute out, silently, on a chart that looked plausible** — which is
why this was a control and not an assertion.

### 7.4 The arrival gap — figure 8, the number this task exists for

**The clock first.** This capture's own offset, re-taken at the top of the run
per §4.7: **+217.165 ms**, three `sntp -t 5 time.apple.com` samples, **spread
0.661 ms**. Not yesterday's 257 ms and not the morning's 55.3 ms — §4.7's rule
that the offset is re-taken rather than cited has now moved by 200 ms twice in
two days.

Measured against `t + 60s`, which §7.3 establishes is the instant the minute
actually ends:

| Figure | Raw      | Corrected (+217.2 ms) |
| ------ | -------- | --------------------- |
| p50    | 491 ms   | **708 ms**            |
| p95    | 684 ms   | **901 ms**            |
| p99    | 930 ms   | 1,147 ms              |
| min    | −106 ms  | 111 ms                |
| max    | 1,649 ms | 1,866 ms              |

n = 129,481 bars. The raw gap against `t` itself is p50 60,491 ms / p95 60,684 ms,
which is the same figures plus the minute.

> **§28's upstream boundary, in a sentence a later story can quote.** The
> provider's share of `PRODUCT_SPEC.md` §28's _event → application state
> <250 ms p95_ is **901 ms p95, corrected — an upper bound from Asia/Singapore**,
> taken over a 271–311 ms round trip (§4.6) that the production path does not
> have. **§28's budget is already exceeded by the provider alone from this
> vantage**, and the honest reading is that §28 cannot be evaluated until the
> same figure is taken from `eastus2`. **The re-measure is Story 3.11's, and its
> condition is the first time a real socket runs in the deployed backend.** Do
> not quote 901 ms as _the_ number.

**The negative minimum is not an error.** `min = −106 ms` means a bar arrived
106 ms _before_ its own minute ended by our clock, which is a statement about the
clock rather than about causality — and it is well inside the 217 ms offset.

**The burst shape — figure 7.** How tightly one minute's bars cluster after the
boundary, n=445 minutes:

| Measure                      | p50    | p95    | p99    | max      |
| ---------------------------- | ------ | ------ | ------ | -------- |
| spread within one bar-minute | 243 ms | 511 ms | 616 ms | 770 ms   |
| first bar, after `t + 60s`   | 285 ms | 370 ms | 529 ms | 1,229 ms |
| last bar, after `t + 60s`    | 536 ms | 794 ms | 986 ms | 1,649 ms |

**A minute's worth of bars lands inside about half a second.** That is the
figure §2.2's coalescing question is actually about: a browser told about each
bar individually would receive ~320 messages in 243 ms once a minute, and §1.10's
re-render counterfactual is asked at that rate rather than at a smooth one.

### 7.5 Rate and bytes — figures 6 and 9

Per-second distributions rather than averages, because the average hides exactly
the case that sizes the payload.

| Window                     | msg/s p50 | p95 | p99 | max   | B/s p50 | B/s p95 | B/s max | mean B/s |
| -------------------------- | --------- | --- | --- | ----- | ------- | ------- | ------- | -------- |
| **The open** 09:30–10:00   | 9         | 419 | 777 | 1,339 | 1,043   | 54,788  | 175,151 | 6,838    |
| open, first 5 min          | 12        | 43  | 333 | 446   | 1,326   | 4,800   | 52,586  | 2,333    |
| **Midday** 12:00–12:30     | 2         | 12  | 293 | 339   | 237     | 1,357   | 39,699  | 977      |
| **The close** 15:30–16:00  | 11        | 57  | 459 | 725   | 1,266   | 6,484   | 85,701  | 2,796    |
| close, last 5 min          | 32        | 104 | 589 | 725   | 3,633   | 11,849  | 85,701  | 5,651    |
| After the bell 16:00–16:30 | 0         | 0   | 11  | 522   | 0       | 0       | 63,504  | 62       |

**The p50/p95 spread is the finding, not the maximum.** At the open the median
second carries 9 messages and the 95th carries 419 — a 47× ratio, because the
traffic is a once-a-minute burst rather than a stream. Sizing anything on the
mean would be sizing on a number that occurs almost never.

**Against ADR 0011's 1,000 B/s idle-vCPU condition:** the open averages
**6,838 B/s**, the close 2,796, midday 977. The condition is broken by roughly
7× at the open and **met at midday**, which is a sharper result than "broken" and
is the one §2.8 needs.

**`dailyBars` is 1.22% of all bytes — 531,629 of 43,483,206 — and that is for
TEN symbols, not 518.** §6.7 predicted this channel would matter at universe
scale; this capture cannot say by how much, because it did not subscribe it
widely. **Do not scale by 51.8.** Decision 1 may drop the channel; a blended
figure could not be un-blended, so it is recorded apart.

### 7.6 Live IEX coverage — figures 12 and 13

**Every one of 518 symbols produced at least one bar. None sat still all day.**

| Measure                                             | min  | p50  | p95  | p99   | max   |
| --------------------------------------------------- | ---- | ---- | ---- | ----- | ----- |
| symbols producing a bar in one minute (n=390)       | 242  | 321  | 437  | 507   | 513   |
| …as a percentage of 518                             | 46.7 | 62.0 | 84.4 | 97.9  | 99.0  |
| per-symbol minute coverage over the session (n=518) | 2.1  | 65.1 | 99.0 | 100.3 | 105.6 |

**390 of 390 regular-session bar minutes were observed**, so the denominator is
the session rather than the capture.

Worst fifteen: `ERIE` 2.1%, `AIZ` 4.9%, `L` 12.1%, `NVR` 12.6%, `IEX` 12.8%,
`GL` 13.1%, `ESS` 13.8%, `FDS` 14.6%, `CPT` 16.4%, `DVA` 16.7%, `TPL` 16.9%,
`WST` 16.9%, `SNA` 17.9%, `BIIB` 18.5%, `GRMN` 19.0%.

**Against the stored figures** (`ALPACA.md` §5.2, 82.8% median / 43.1% worst,
measured SIP-vs-IEX on history): the live stream is **materially thinner**.
Median per-symbol coverage is **65.1% against 82.8%**, and §5.2's worst case
`CCI` came in at **37.9% live (148 bars) against 43.1% stored**. The two are not
the same measurement — stored coverage is _of SIP_, this is _of minutes_ — but
they point the same way and the live one is worse.

> **Percentages above 100 are not an error and are worth understanding.** `QQQ`
> reads 105.6% because it produced 412 bars against a 390-minute regular session:
> the extra 22 are pre-market and after-hours bars, which §7.7 shows are
> indistinguishable from session bars. The arithmetic is the extended-hours tail
> made visible.

**What this decides.** Story 3.6's table of 518 rows will have **roughly 320
moving in any given minute and about 200 sitting still**, with the composition
changing minute to minute. That is a product problem with a product answer, not
a bug — and §2.5's staleness vocabulary is the surface that answers it.

### 7.7 Pre-market bars arrive, and nothing on the frame says so

**37 pre-market bar minutes were observed, and they carry the identical field
set to a regular-session bar** — one field set across all 129,481 frames
(§7.2). There is no flag, no session marker, no `z` distinction.

- first pre-market bar: `t=08:43` ET, arrived 08:43:59, `CIEN`
- last pre-market bar: `t=09:28` ET, arrived 09:29:00, `AVGO`
- first after-hours bar: `t=16:00` ET, arrived 16:01:00, `QQQ`
- last after-hours bar: `t=16:29` ET, arrived 16:30:00, `GS`

**This is a product decision and it is not taken here** — see §7.11.

### 7.8 A bar can be revised after it is delivered — new, and not on the register

**Not a figure anybody listed, found by reading the frames.** The `u`
(`updatedBars`) channel was subscribed for the ten narrow names and delivered
**14 frames, every one of which changed the bar it restated**, at a strikingly
consistent **+28.6 to +29.8 seconds** after the original `b`.

| Symbol      | Bar `t` (UTC) | Lag   | What changed                                 |
| ----------- | ------------- | ----- | -------------------------------------------- |
| SPY         | 13:44:00      | 29.8s | **`c` 758.85 → 758.81**, `v` 6688 → 6788     |
| META        | 13:49:00      | 29.6s | **`c` 676.96 → 677.20**, `h` 677.13 → 677.20 |
| TSLA        | 19:59:00      | 29.0s | **`c` 358.07 → 358.13**, `v` 17877 → 17977   |
| (11 others) | —             | ~29s  | `v` and `n` only                             |

**Three of fourteen changed the close price.** The rest added late-reported
volume. The rate is **0.36%** of the 3,855 `b` frames those ten symbols produced.

**Why this matters more than 0.36% suggests.** A "last price" taken from a `b`
frame is provisional for about thirty seconds, and a chart that never subscribes
`u` is permanently a few cents wrong on roughly one bar in three hundred — with
no way to know which. Story 3.10's gap-filling treats a missing bar as a gap;
**a revised bar is not a gap and would not be caught by any of it**. Whether the
product subscribes `u` at universe scale is §7.11's second open decision.

### 7.9 The longest silence inside a session — figure 15's other half

**8.6 seconds**, between 13:07:40 and 13:07:49 ET, counting inbound frames of
any kind across 518 bar channels plus ten trade channels.

The longest gap across the **whole hold** was **54.0 seconds**, pre-market at
08:57:17 → 08:58:11 — which is the §6.3 heartbeat and nothing else, confirming
that the 54 s ping is the floor on silence whether or not a market is open.

§6.6 gave the outside-a-session half: ≥76 min on bar channels, 60.1 s with
`dailyBars` attached, 54.85 s of any inbound frame. **Together they size §2.5's
two thresholds directly: inside a session, nine seconds of silence on a liquid
feed is already unusual; sixty is not evidence of anything outside one.**

### 7.10 What this session could not answer

In `ALPACA.md` §10's shape — listed so the absence is not mistaken for a
measurement.

- **The pre-market rate.** The socket existed from 08:43:47, not 07:00 (§7.1).
  The shape question is answered; the rate is not. **Re-take with a 07:00 start.**
- **`corrections` and `cancelErrors`.** Both attach to a `trades` subscription
  unrequested (§6.8) and neither emitted a frame. **Absence is not evidence** —
  their shapes need a real correction or cancellation to appear at all.
- **`statuses`.** Subscribed for ten names, no frame arrived. Same reasoning: a
  session with no halt says nothing about what a halt looks like.
- **Whether `u` behaves the same at 518 symbols.** Measured on ten liquid names;
  a thin name's bar may be revised more often, less often, or not at all.
- **Alpaca's own clock.** Unchanged from §4.7 — one-second granularity against a
  769–1,288 ms round trip bounds nothing useful. If the vendor's bar timestamps
  are not NTP-accurate, **no instrument in this story can tell**, and figure 8
  carries that as residual risk rather than as a clean denominator.
- **n=1.** One Wednesday in September. Not a Friday, not a December, not a
  half-day, not a day with a halt in it.
- **The vantage.** Asia/Singapore, not `eastus2`. Story 3.11's re-measure.

### 7.11 Two product decisions this measurement forces — **both answered 2026-09-17**

> **ANSWERED by the owner on 2026-09-17, with the reasoning, and neither is to
> be re-asked.** Task 3.1.6's own rule applies to its own questions: _a question
> already answered and asked again is how a decision gets reversed by accident_.
>
> **1. Extended-hours bars are RENDERED AND MARKED.** Not filtered, not rendered
> silently. The reasoning is the one this document keeps arriving at from other
> directions: **the data is real, and a filter is a claim the feed does not
> make.** Filtering would have been the cheap answer and it would have put a
> session boundary into the product that nothing in the feed asserts — the same
> shape as invariant 6's _provenance is displayed, never implied_, applied to
> time instead of to venue. Rendering unmarked was rejected because a thin
> jagged tail on a session-ordinal axis reads as a defect rather than as
> pre-market.
>
> **The cost is accepted and it is a new dependency rather than work:** marking
> needs a visual vocabulary **Story 3.4 has not designed**, so 3.4 now owes one,
> and Stories 3.6, 3.7 and 3.9 consume it. That dependency did not exist before
> this decision and is recorded in each of those stories rather than here alone.
>
> **Reversal trigger, as a condition:** the first window whose marked tail is
> longer than its session — a pre-market-only or after-hours-only window, which
> `1D` before the bell already produces. At that point "marked" stops being a
> qualifier on a session and becomes the whole chart, and the question is a
> different one.
>
> **2. The product SUBSCRIBES `updatedBars`.** The trade was stated as
> two-sided and the owner took the side that costs display complexity rather
> than the side that costs correctness: **being quietly wrong on one bar in
> three hundred, for ever, with no way to know which, is not a defect this
> product can carry** — its entire purpose is helping somebody trust what they
> are looking at, and a price that is silently stale by a few cents is the exact
> failure the provenance surface of Epic 2 exists to prevent.
>
> **The cost is accepted and it is real:** a number can change under a reader's
> eye about thirty seconds after it appeared. That collides with §2.1's
> definition of a live observation — **an observation can now be superseded, and
> §2.1 must say so** — and it needs a motion treatment from Story 3.4 that says
> _this corrected_ without saying _this moved_, which are different facts and
> must not share a vocabulary. Story 3.2's client must handle `u`, and Story
> 3.10's gap-filling must not mistake a revision for a gap.
>
> **Reversal trigger, as a condition:** the first measurement showing the
> revision rate at universe scale is materially above the 0.36% measured on ten
> liquid names — at which point "rare correction" becomes "the feed is
> provisional", and the display decision is a different one.
>
> **And the trigger has an owner, added 2026-09-17:
> [Task 3.1.5](TASK-05-what-the-socket-does-when-it-is-unhappy.md)**, which
> subscribes `updatedBars` for the whole universe for one session-length window
> and states the trigger as fired or not fired. It is on that task rather than
> this one because it needs a socket and **not** a session, which is 3.1.5's
> shape — and if the calendar denies it a session, 3.1.5 hands it to Task 3.1.9
> by name rather than dropping it. **A trigger nobody owns is a trigger that
> never fires**, which this repository has recorded happening to the fourth
> design test seven times over.

Both belong beside the measurement rather than in the story that trips over
them, and both are the owner's.

Both belong beside the measurement rather than in the story that trips over
them, and both are the owner's.

> **They are questions 4 and 5 of
> [Task 3.1.6](TASK-06-the-three-questions-for-a-person-and-the-cost-envelope.md),
> which is where they are actually asked.** Recorded there as well as here on
> purpose: a decision that lives only in a findings document is not queued for
> anybody — nothing schedules it, nothing blocks on it, and the next task
> proceeds as though it were settled. Neither is blocked on 3.1.6's cost
> envelope, so either may be answered sooner and recorded back here.

**1. Do the charts show extended-hours bars?** Pre-market and after-hours bars
arrive on `b` and are indistinguishable from session bars (§7.7). Left alone,
every chart in Stories 3.6, 3.7 and 3.9 silently gains a thin tail before 09:30
and after 16:00 — which is also what inflates `QQQ` past 100% in §7.6. The three
candidates: render them (honest, but the tail is thin and jagged and the
session-ordinal axis has no vocabulary for it); filter them by market time at
the data layer (clean charts, and the filter is a claim the feed does not make);
or render them marked (most honest, most work, and needs a visual vocabulary
Story 3.4 has not built). **Epic 2's charts never met this because stored bars
were fetched per session.**

**2. Does the product subscribe `updatedBars`?** §7.8. Subscribing costs
effectively nothing in bytes and means a bar can change under a reader ~30 s
after it appeared; not subscribing means being quietly wrong on about one bar in
three hundred, three times in fourteen on the close price itself. This interacts
with §2.1's definition of a live observation and with Story 3.10's gap-filling,
and it is the kind of decision that is very expensive to reverse once a chart
has been built on it.

---

## What this document deliberately does not decide

- **The client** — Story 3.2. This document decides what flows, not what dials.
- **Anything on screen** — Story 3.3 onwards.
- **The motion vocabulary** — Story 3.4, against a real moving number, which
  this story does not produce.
- **The schema change** — Story 3.8.
- **The bill** — Story 3.11. This story estimates an envelope from a measured
  message rate; only a month of billing reads the real number.
