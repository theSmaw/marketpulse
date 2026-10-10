# Task 4.7.3 — The figures that do not survive a fresh join

**Status:** Not started
**Story:** [4.7 The Overview's Degraded Set, & the 390 Question Answered](STORY.md)
**Depends on:** 4.7.1

## Objective

**Story 3.10's inherited rule — _nothing clears the prices on a degraded
feed_ — is true of a browser-side kill and false of a fresh join.** Reachable
by a reload, and routine on every deploy.

## What the user can see when this lands

**A reload during an outage stops contradicting itself.** Today it draws four
live prices and eleven ranked sectors at the top and `Of the 503 companies we
track, none were heard from in the last 5 minutes` in the middle.

## Work

### The mechanism, read from source rather than inferred

- `market-gateway.ts`'s `sendSnapshot()` sends a **freshly computed**
  `overviewMessage()` on connect **and on every subscribe** — three joins per
  cold load of `/`.
- `market-breadth.ts`'s eligibility pass, which breadth **and** movers are both
  taken from, filters on `bar.startsAt` inside a **5-minute** window. With
  nothing arriving it empties.
- `market-overview.ts`'s `buildMarketOverview` marks a proxy or sector entry
  `state: "live"` for as long as the observation sits in the map, **with no
  expiry at all**.

So the top of the screen and the middle disagree, each correct about its own
subject — **Task 3.4.9's `two true halves, one contradiction` arriving by a
fifth door.**

### And the deploy case is worse because it is routine

A restarted replica has an empty observation map and **serves browsers for
45.8–46.5 s before its own feed authenticates** (`docs/GAPS.md` entry 8). So
**every deploy during a session flips every open tab to yesterday's closes for
about 46 seconds with the status bar reading `LIVE`** — correctly, because the
socket is healthy and frames are arriving. Nothing on screen says anything is
wrong.

### The repair, and it is the owner's choice of the four

**The gateway serves a reconnecting client its LAST BROADCAST aggregate rather
than a recomputed one.** One place, and it also **removes two of the three
joins per cold load** that Task 4.8.3 counted. Rejected, with their reasons:
the browser additionally refusing a poorer aggregate (a second place that has
to know what _poorer_ means); expiring the proxy and sector entries on the same
window (throws away figures a reader was reading, which Story 3.10 decided
against); and photographing it as honest (defensible per region, indefensible
as a set, and it leaves the deploy case shipping).

**The rule this expresses**, which is the overview's version of one this
product already holds twice — `LiveFeedView.resumes`' refill rule and
`use-bar-series`' never-blank rule:

> **An aggregate that has held figures must not fall back to its empty state
> because of a join the reader did not ask for.**

### Boundaries and traps

Task 4.8.11 put a `clients.size > 0` guard **inside `publishObservations`** and
Task 4.8.8's `the-aggregate-has-three-producer-paths` counts the ways into
`overviewMessage()` by **slicing both producers by indentation with a
sentinel** — so a repair that hoists a call for readability turns that check
red. **The snapshot path is what you are changing**, so expect to amend that
invariant's claim in the same change, as 4.8.11 did.

And nothing on the socket callback's path may throw: it is called from the
socket's own callback, where an unhandled rejection is a crashed process.

### What it owes

A **behavioural** assertion rather than a grep — the process suite drives a
real socket with an injected clock — and its break, with the 2026-09-26
procedure and the **passing-wrongly transcript kept**. Note Task 4.8.11's
lesson on this exact surface: **the obvious wire-level assertion was green on
the defect**, because an empty broadcast sends nothing either way. Assert on
what the gateway **served**, not on what a quiet client received.

**Reversal trigger, a condition:** _the first consumer that must be served a
recomputed aggregate on connect rather than the last broadcast one_ — a
diagnostics route, a replay client, an agent.

## Done when

1. A reconnecting or subscribing client is served the last broadcast aggregate,
   and the figures on screen survive a reload during an outage
2. The deploy case is shown to be repaired — a restarted replica no longer
   flips an open tab to yesterday's closes
3. A behavioural assertion holds it, with its break and the transcript of the
   check passing wrongly first
4. `the-aggregate-has-three-producer-paths` still holds, with its claim amended
   if this changes what a path does
5. ADR 0038 carries a dated amendment if this changes what it describes
6. `pnpm verify`, `pnpm test:process` and the overview specs green

---

## Handed here by Task 4.7.1 — 2026-10-10: the poorer-aggregate-on-reconnect verb exists, and it is already produced once

Written here rather than linked.

**1. The verb is `overviewOnReconnect` on `serveFeed`** (`e2e/support/feed.ts`).
Serve the rich aggregate as `overview` and the one a restarted replica would
build as `overviewOnReconnect`; `drop()` and the page's own retry are the whole
production. Nothing in the spec reloads and nothing reaches into a component.

**2. It is produced and green already**, in
`e2e/specs/overview-held-outage.spec.ts`' third test — `HEARD_FROM` (four
observed proxies) on connect, `HEARD_NOTHING` (four `unknown`) on the
reconnect, and the strip's `774.03` is gone afterwards. **That test deliberately
does not judge the state**: whether the gateway should serve its last broadcast
aggregate instead is your decision, and the spec exists so the decision can be
measured rather than argued.

**3. It keys on `drop()`, not on a connection count, and that matters to you.**
A cold page opens more than one socket before anything is dropped — React's
`StrictMode` double-invokes the effect, so a dev page opens one plus an
open/close pair ~25 ms apart. Keying on `connections > 1` served the poorer
aggregate on the **first paint** and drew `No prices yet.` over four `None
stored` cells: a real state of this product, produced entirely by the
instrument. If your repair adds a second harness behaviour, key it on the drop.

**4. The counters are the plant proof.** `feed.overviews()` counts aggregate
frames sent across every connection, `feed.connections()` counts sockets **by
URL**, `feed.refusals()` counts retries this harness closed. A frame that was
built and never sent and a frame the page ignored leave the same screen; assert
growth rather than an absolute, because of the `StrictMode` pair above.
