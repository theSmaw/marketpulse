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
