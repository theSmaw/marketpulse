# Epic 3 — Live Market Data

**Status:** Not started
**Sequence:** 3 of 15 — follows Epic 2 (Security Universe & Historical Market Data)
**Spec references:** PRODUCT_SPEC.md §7.1 (Alpaca), §29 (backend architecture), §31 (streaming protocols), §36 (failure/partial states)

## Goal

Turn MarketPulse from a historical explorer into a live application.

## Outcome

Tracked securities update automatically as live market observations arrive.

## Scope

- Alpaca WebSocket ingestion
- Backend subscription management
- Market-data normalization
- Current market-state model
- Backend-to-browser streaming
- Live connection state
- Reconnection handling
- Stale-data detection
- Live price updates in the UI
- Market timestamp / LIVE indicator
- Continuous-connection cost envelope — **the idle-rate estimate does not transfer**
- **A tape column on `market_bars`** — added 2026-09-15 from Epic 2's close; see below
- **The two-feed ledger, produced rather than simulated**
- **The live feed's own honest label**
- **The motion vocabulary** — design test 4, against real moving numbers

## Exit criteria

The application can maintain a live connection for the tracked universe and update visible market values without page refreshes.

## What Epic 2 hands this epic (2026-09-15, Task 2.14.10)

Epic 2 closed with fourteen stories, a product with real market data in it, and
**three things it could not produce and this epic can**. They are written here
because each one is a shipped sentence that is correct today and becomes false
on a specific line of this epic's code, with nothing mechanical standing between
the two.

**The provenance pattern extends from _which feed_ to _which feed, and is it
still connected_.** `FeedIndicator` has read `disconnected` throughout Epic 2
deliberately and correctly — there is nothing to connect to — and this epic is
what makes that true rather than what fixes it.

### 1. A defect in the store, not in the wording — and it is a migration

**`market_bars` has no column saying which tape a bar came from.** Provenance
lives one row per `(security, timeframe)` in `bar_coverage`, which carries a
single `feed` (`apps/backend/src/schema.ts`). Everything stored today is
consolidated SIP, so one row per pair is sufficient and honest.

**The day this epic _stores_ an IEX bar, it stops being either.** That single
row describes the whole series as SIP, `mergeSeriesProvenance` is never called
because there is only ever one provenance record to merge, and the series
reports one feed with complete confidence and is wrong. The two-feed sentence is
true today only because the IEX tail is stitched **at read time**.

So this is a **schema change, before the first stored live bar** — and the
roadmap's Epic 3 scope had no data-layer item at all until 2026-09-15. Note the
migration rules before writing it: forward-only, four-digit sequence, immutable
once applied (`apps/backend/migrations/README.md`).

### 2. The two-feed ledger, produced rather than simulated

`packages/shared/src/market-provenance.ts` names each stretch in contribution order with its bar
count, and refuses to sort or deduplicate to the first. **This epic's socket is
the first thing in the product that can produce one**: all sixteen recorded
bar-series bodies carry `sip`, `stitched.json` included, because both halves of
that stitch came from Alpaca's historical API. The state is reached today
through `twoFeedStitchView()` — the recorded stitch with **one field changed**,
named and commented so that deleting it and pointing its three readers at a real
recorded body is the obvious move.

### 3. One sentence that claims something about the market rather than about our store

**`No shares changed hands anywhere in the window.`** is the only shipped
sentence making a claim about **the market** rather than about our store. It is
true while every stored bar is the consolidated tape, and becomes a single
venue's silence reported as the whole market's the first time a live tail is
stitched on — which is the failure `PRODUCT_SPEC.md` §7.1 forbids, in the one
place a reader would never look for it. It has two homes today, drawn and
spoken, and **nothing guards them**.

This is not theoretical on IEX. `ALPACA.md` §5.2: median minute coverage is
**82.8%** on IEX against **99.7%** on SIP, worst case **43.1%** (`CCI`). An
absent bar is **ordinary** on IEX and **notable** on SIP, and that sentence was
written for the second case.

### And the honest label must not be inherited by word

The free Alpaca plan is **asymmetric**: stored historical bars are consolidated
SIP, the live stream is IEX only (`ALPACA.md` §2 — `wss://.../v2/sip` is refused
with `409 insufficient subscription`). This epic must not carry Epic 2's
`All US exchanges` onto a live tail, and **invariant 6's fence stands on the
sentence under the acronym rather than on the acronym**.

### The design test this epic was handed by name

**Test 4 of the UI bar — _does it feel alive_ — has now been answered "not yet"
seven times**, the seventh at Epic 2's close. Seven deferrals of one criterion is
not caution; it is the shape of a criterion that never gets met. It was deferred
**to this epic's motion vocabulary** because this is the first epic where the
honest version of the question is even askable: the hard form is what happens
when a **price** changes. Its trigger is the calendar rather than a condition,
which is exactly why it is written into this epic's scope — nothing else fires.

## What Story 2.5 hands this epic — and what is left of the header strip (2026-09-06)

**The market clock is done and it is not yours.** `AppHeader`'s status strip is three regions
— `Market feed`, `Backend service`, `Market clock` — and the third has been reserved since
Story 1.5 with a `--:--:-- ET` placeholder. **Task 2.5.5 filled it**, so this epic inherits a
working clock rather than a gap. Every planning document that said Epic 3 supplies it was
wrong and has been corrected; if you find another one, it is stale.

The reason it is not this epic's is worth carrying because it decides the boundary: **a clock
is a fact about the trading calendar, not about the data feed.** It needs a timezone and a
session definition and none of Epic 3's live socket. It renders the market time in ET and
whether the market is open, on every route, from the viewer's own clock — which is a
**timezone claim rather than a synchronisation claim**, stated as such in the component.

**What is genuinely left for this epic, unchanged and not to be quietly absorbed:**

- ~~The **`FeedIndicator`** beside it, which is currently hard-coded to `disconnected` with
  the sentence "No market data until Epic 3". That is the honest value today.~~ **Amended
  2026-09-07 by Task 2.6.7: that hard-coded value is gone and the region holds something
  else.** It renders **provenance** now — which market feed this deployment is configured to
  read, from `GET /market-data`, which is invariant 6 and §7.1 — so `FeedStatus` is rendered
  **nowhere in the chrome** and its only consumers are the landing route's render check and
  the workshop. What is left for this epic is unchanged in substance and changed in shape:
  a **connection state comes back BESIDE provenance rather than instead of it**, because
  _"which venues are in the numbers"_ and _"is data arriving right now"_ are two facts that
  fail independently — Task 1.12.4's two-indicators argument, and a single indicator would
  have to pick between them. Note the strip's constraint before adding a region: `.clock` is
  `align-items: flex-end` as the end of the strip, so a region appended after it takes that
  edge away, and the market-feed cell is where this belongs.
- The **`LIVE`** state `PRODUCT_SPEC.md` §9's header mock shows, and anything at all claiming
  data is **arriving**.
- **Exchange-supplied timestamps.** The clock renders the viewer's clock in market time; the
  honest server-supplied source of "what time does the market think it is" arrives with the
  feed, and if this epic wants the header to show one, it is a **new fact beside** the clock
  rather than a rewiring of it.
- **Stale-data detection**, which is a statement about the feed and not about the session —
  the market being open does not mean data is flowing, and `FeedStatus` and
  `MarketSessionStatus` are deliberately separate vocabularies for that reason.

**Two measurements this epic should start from rather than retake blind.** The clock ticks at
1 Hz and produced **0 `longtask` entries and 60 header DOM mutations over 60 s, all 60 inside
the clock cell** — because `useMarketClock` is called from `AppHeader` rather than from `App`.
Lifting it to `App` re-renders the whole landing route **40 times in 20 s** against **0**. Any
live-price hook this epic adds faces exactly that choice at a much higher rate, and the
counterfactual has already been produced once so nobody has to argue it.

And **`packages/shared` may not read the wall clock** — four `no-restricted-syntax` rules
hold the conversion boundary and the clock seam (ADR 0017, decisions 5 and 7). A live-data
module that wants "now" takes it as an argument or lives in an app package.

## What Epic 1 hands this epic (2026-09-04)

**`minReplicas: 1` is a required setting on the backend and not a tuning knob.**
Container Apps' documented default is `minReplicas: 0` with an HTTP trigger, and
the Alpaca socket this epic opens is **outbound** — our server dials Alpaca — so
no ingress request timeout governs it and the only thing that can kill it is the
replica ceasing to exist. It is set correctly today. Anything that scales this
app to zero silently breaks this epic's exit criterion, and the failure looks
like a feed that stops rather than an error. Recorded in ADR 0011; do not
conflate it with Epic 10's inbound stream, which is limited by a different
mechanism.

**The recorded cost figure is an idle figure and this epic breaks the condition
it rests on.** The Consumption plan's idle vCPU rate requires the replica to
receive **less than 1,000 bytes per second** of network traffic. A replica
holding a live feed exceeds that through every market session, so the estimate
moves from **$4.21** to **$14.04** for the replica — **$9.21 to $19.04** a month
with ACR Basic — and the **$20** budget with its 50/80/100% alerts sits just
_above_ the active-rate total, so it would not fire on the change that matters
most. Memory bills the same either way; the discount is on vCPU alone. Epic 1
could not take a real reading at all (both billing APIs refused, then answered
`[]` and `429`), so **this is a re-measurement rather than a confirmation**, and
the budget threshold should be re-decided against what it reads.

**One logging decision reverses here.** Task 1.12.6 declined `ignore: "reqId,pid"`
on pino-pretty after measuring that 51 request pairs across two windows were
every one adjacent — two requests a minute per tab does not interleave. The
stated reversal trigger is **this epic's socket, or anything else that puts more
than one request in the backend's log at a time**. The lever is worth 156 → 101
columns on the record itself.
