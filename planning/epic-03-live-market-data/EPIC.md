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
- **A replay of our own stored bars**, so this epic can be built and designed
  outside 21:30–04:00 local — added 2026-09-16, [ADR 0030](../../docs/adr/0030-replaying-our-own-bars-and-the-mechanisms-that-stop-the-live-feed-rotting.md).
  **A development instrument and never a deployed one:** production has real
  users and must only ever tell the absolute truth about the real market

## Exit criteria

The application can maintain a live connection for the tracked universe and update visible market values without page refreshes.

**And every visible story has been watched working against the real IEX socket,
during a real session, with a dated row in
[`LIVE-REHEARSAL.md`](LIVE-REHEARSAL.md).** Added 2026-09-16 with ADR 0030: this
epic can now be built at any hour against a replay of our own stored bars, and
the exit criterion above would otherwise be satisfiable without anyone ever
having seen the live feed work. Story 3.11 checks the ledger; `pnpm invariants`
checks that Story 3.11 did.

**Two mechanisms make this cheap rather than a discipline**, both ADR 0030's.
**The deployed site never replays, at any hour** (7a) — it serves the real feed
during a session and an honest still page outside one, so the live socket is the
only thing production has ever shown; a deploy configured otherwise fails before
it rolls (7b) and `check-deployed.mjs` fails after every merge if production is
ever replaying (7c). And **a replay refuses to run while the market is open**
(7d), which catches the developer who left it on in their `.env` and is building
against a recording while believing they are live. A broken live feed shows as
broken rather than being masked. The rehearsals are minutes, not evenings.

## Stories

| #    | Story                                                                                                                               | Depends on | Visible?              |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------- |
| 3.1  | [Live-Data Decisions & the Streaming Spike](story-01-live-data-decisions-and-the-streaming-spike/STORY.md)                          | Epic 2     | No                    |
| 3.2  | [The Market-Data Stream Seam & the Alpaca IEX Client](story-02-stream-seam-and-alpaca-iex-client/STORY.md)                          | 3.1        | No                    |
| 3.3  | [**The Browser Stream & `LIVE` in the Chrome** (the first vertical slice)](story-03-browser-stream-and-live-in-the-chrome/STORY.md) | 3.2        | **Yes**               |
| 3.4  | [The Motion Vocabulary & the First Price That Moves](story-04-motion-vocabulary-and-the-first-moving-price/STORY.md)                | 3.3        | **Yes**               |
| 3.5  | [Subscription Management & the Current Market State](story-05-subscription-management-and-current-market-state/STORY.md)            | 3.3        | No                    |
| 3.6  | [Live Prices Across the Tracked Universe](story-06-live-prices-across-the-universe/STORY.md)                                        | 3.4, 3.5   | **Yes**               |
| 3.7  | [The Live Edge on the Chart & the Two-Feed Ledger](story-07-the-live-edge-and-the-two-feed-ledger/STORY.md)                         | 3.6        | **Yes**               |
| 3.8  | [The Tape on the Bar](story-08-the-tape-on-the-bar/STORY.md)                                                                        | 3.1        | No                    |
| 3.9  | [Storing the Live Session](story-09-storing-the-live-session/STORY.md)                                                              | 3.5, 3.8   | **Yes — a cold load** |
| 3.10 | [Disconnection, Staleness & Every Degraded State](story-10-disconnection-staleness-and-degraded-states/STORY.md)                    | 3.7, 3.9   | **Yes**               |
| 3.11 | [Cost, Performance, the Sweep & the Epic Close](story-11-cost-performance-and-the-epic-close/STORY.md)                              | 3.10       | No                    |

**Three phases, and the shape is deliberately not Epic 2's.** **3.1–3.2** make a
socket exist behind a seam; **3.3–3.7** put a live application on screen, one
surface at a time; **3.8–3.11** make the store, the degraded states and the bill
honest. Epic 2 was layered — seven stories and roughly fifty-five tasks before a
user could see anything, which is the defect Story 2.4 was inserted to repair.
**This epic does not repeat it**: the third story is a thin end-to-end slice
through every layer this epic adds, and every story after it changes something a
stranger can see, with two exceptions that say so plainly.

**The one place parallel work is genuinely available is 3.8**, which touches the
schema and nothing 3.3–3.7 touch. It is placed late because its deadline is
_the first stored live bar_ (Story 3.9) rather than the first streamed one, and
early because nothing in 3.9 can start until it lands.

## Two epic-level findings from Story 3.3's close — 2026-09-19

Neither changes the story list. Both change what two of the remaining stories
contain, and the first one is a live defect rather than a planning nicety.

### 1. "Reconnection" is TWO reconnections and they share nothing

Story 3.10 owns reconnection, and its scope argues it against **a vendor that
allows one concurrent connection**, a fifteen-minute embargo and a rate limiter
with no `Retry-After`. Every one of those is a fact about **the backend's socket
to Alpaca**.

**Story 3.3 shipped a second socket — the browser's, to our own gateway — and
it has none of those constraints.** No vendor limit, no embargo, no rate
limiter, and the gap it leaves is filled by a snapshot rather than by a
historical fetch.

Conflating them scheduled the cheap half with the expensive half, and the cost
is already being paid: **the browser does not reconnect, so every backend deploy
leaves every open tab reading `DISCONNECTED` until somebody reloads.** Deploys
happen on every merge to `main`. The gateway even sends `1001 going away`
(§12.2) — the browser is told the difference between _this is a deploy_ and _the
network broke_ and does nothing with it.

**So the browser's half moves to Story 3.5**, which already owns the **snapshot**
— the thing a reconnecting browser needs in order to catch up — and depends only
on 3.3. Story 3.10 keeps the upstream half, where its measurements actually
apply.

### 2. The free plan's ONE connection is contended, and production always wins

`docs/GAPS.md` entry 7 was re-pointed three times on the assumption it needed a
trading session. Task 3.3.7 found the real blocker: **the deployed backend runs
`provider: alpaca` and §9.3 chose to hold the socket always**, so a clean
developer machine is refused `406 connection limit exceeded` **at any hour**.

This is an epic-level constraint rather than one story's problem. **Five
remaining stories would want to be developed against a real feed** — 3.5, 3.6,
3.7, 3.8 and 3.9 — and none of them can be, while the deployment is running.
Nobody has costed that. The disposition belongs to **Story 3.10** (which is the
first story that must treat the connection as contended) with the credential
question at **Story 3.11**; what this section records is that it is an _epic_
constraint and not a footnote in one story.

## Why the slice is Story 3.3 and not Story 3.6

**The connection is visible before any number moves, and that ordering is the
design bar rather than impatience.** `VISUAL-LANGUAGE.md`'s Motion section
defers the whole vocabulary to this epic on the argument that _what happens when
a price changes_ must be settled against a real moving price — so a story that
puts a moving price on screen before that vocabulary exists ships the thing the
deferral was protecting against, and it ships it three times in three surfaces.

So Story 3.3 renders a **connection state**, which is a state change rather than
a number changing: `LIVE` appears in the chrome beside provenance, it says which
single venue the stream is, and no datum on any screen moves. Story 3.4 then
settles the vocabulary against the first price that does, on **one** surface,
and Stories 3.6 and 3.7 inherit it rather than each inventing one.

## Every story states what the user will be able to see

Epic 2's convention carries forward unchanged, including the half that protects
the next story: **say what the user still cannot do.** Two stories here answer
"nothing visible" and both name the story that pays them off.

## Every story that builds a screen is held to the design bar

And this epic is the one where the fourth test — **does it feel alive** — is
finally answerable. It has been answered _not yet_ seven times, and the seventh
deferral named this epic by name. `PRODUCT_SPEC.md` §5.6 is explicit that a
market screen which updates by silently swapping text is _technically correct
and feels dead_; four of this epic's screens are exactly that risk.

**A warning about the canvas, recorded rather than discovered.** ADR 0026 makes
the `Component library for MarketPulse` design canvas the source of truth, and
it was **not reachable** from the session that planned this epic — the same
failure `VISUAL-LANGUAGE.md`'s motion row already records, which is why that row
is the one token in the product argued only in the document. Story 3.4 owes a
canvas sync and should establish reachability **before** it designs anything, so
that the chain runs forwards for once.

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

**Re-measured 2026-09-17 by Task 3.1.6, and the premise above is false — the
paragraph stands as the prediction it was, and this is the reading.**
`LIVE-DATA.md` §9.1–§9.2. The condition is a **rate**, not a state, and a
bars-only feed for all 518 securities does not hold it: measured against a real
7.77-hour session capture the replica is above 1,000 B/s for **6.6 minutes a
day** — the minute-bar flush is a burst, and between bursts the socket is quiet
enough to bill idle. The blended monthly total is **$9.26**, five cents above a
replica doing nothing at all, rather than $19.04. **So the re-decision this
paragraph asks for was taken and the answer is to leave the budget exactly as it
is** (§9.6): the defect it was worried about — the $20 ceiling sitting above the
active-rate total — does not arise, because at $9.26 the **50% alert at $10**
sits eight percent above the real spend and is the tightest live tripwire this
environment has. ADR 0011 carries the dated amendment.

**Two things that survive the correction**, because they were never the
arithmetic: the $19.04 column is still reachable by a feed that adds **trades or
quotes**, and `minReplicas: 1` is still a required setting rather than a tuning
knob.

**One logging decision reverses here.** Task 1.12.6 declined `ignore: "reqId,pid"`
on pino-pretty after measuring that 51 request pairs across two windows were
every one adjacent — two requests a minute per tab does not interleave. The
stated reversal trigger is **this epic's socket, or anything else that puts more
than one request in the backend's log at a time**. The lever is worth 156 → 101
columns on the record itself.

**Evaluated 2026-09-17 by Task 3.1.9 and it does NOT fire yet — recorded because
"we checked and it did not" is a different state from "nobody looked".** A
socket is not a request: the Alpaca connection is opened once by the process and
writes no `reqId`, so holding it interleaves nothing in the log that was not
interleaving before. The trigger is unchanged and is handed to **Story 3.2**,
which is the first story that puts a second concurrent source of log lines
beside the HTTP requests — reconnection attempts, close diagnostics and the
subscribe round trip all land while requests are being served.
