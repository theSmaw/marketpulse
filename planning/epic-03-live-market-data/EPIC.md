# Epic 3 — Live Market Data

**Status:** Not started
**Sequence:** 3 of 15 — follows Epic 2 (Security Universe & Historical Market Data)
**Spec references:** PRODUCT_SPEC.md §7.1 (Alpaca), §29 (backend architecture), §31 (streaming protocols), §36 (failure/partial states)

## Goal

Turn MarketPulse from a historical explorer into a live application.

## Outcome

Tracked securities update automatically as live market observations arrive.

## Scope

* Alpaca WebSocket ingestion
* Backend subscription management
* Market-data normalization
* Current market-state model
* Backend-to-browser streaming
* Live connection state
* Reconnection handling
* Stale-data detection
* Live price updates in the UI
* Market timestamp / LIVE indicator

## Exit criteria

The application can maintain a live connection for the tracked universe and update visible market values without page refreshes.
