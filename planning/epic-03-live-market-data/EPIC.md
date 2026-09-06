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

## Exit criteria

The application can maintain a live connection for the tracked universe and update visible market values without page refreshes.

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

- The **`FeedIndicator`** beside it, which is currently hard-coded to `disconnected` with the
  sentence "No market data until Epic 3". That is the honest value today.
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
