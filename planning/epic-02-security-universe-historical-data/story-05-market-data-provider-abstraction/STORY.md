# Story 2.5 — Market-Data Provider Abstraction

**Status:** Not started
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Story 2.4
**Epic scope covered:** Market-data provider abstraction; market-data provenance (the model half)

## Description

Define the interface market data arrives through, and the domain types it arrives as,
**before** writing a line of Alpaca-specific code. Invariant 7 requires it — "no vendor
SDK types leak into the domain model" — and §7.1 requires it explicitly for Alpaca.

This is the same move Story 1.12 made twice and both times it paid: the contract lands
first, in `packages/shared` or beside it, with a fake implementation, and the vendor
client is then written against something that already exists.

## Why it sits here in the sequence

Immediately before the Alpaca client, and not after it. An interface extracted from a
working client is a description of that client; an interface written first is a
constraint on it. The difference shows up in Epic 3, which adds a **streaming** provider
against the same abstraction, and at whatever point a second provider is evaluated.

## Scope

- Domain types: `Bar` (open, high, low, close, volume, timestamp, and whatever else is
  genuinely needed — resist copying the vendor's field set), `Timeframe`, a time range,
  and the shape of a bar request and response
- The **provenance record**, and this is the part with product weight rather than
  engineering weight. §7.1 and invariant 6 require the feed to be displayed and require us
  not to imply full US coverage. So provenance is a **field on the data**, not a caption
  on a component: which feed, which provider, whether the value is adjusted, when it was
  retrieved. Story 2.13 renders it; this story makes it impossible to have data without it
- Adjustment semantics — splits and dividends — as an explicit part of the request, since
  an unadjusted historical series through a split is a chart with a cliff in it that is
  not a market event
- The error taxonomy, in the shape Story 1.7 established for `ApiError`: a closed union of
  causes a caller can branch on — not-found symbol, rate-limited, unauthorised, upstream
  unavailable, bad range — each of which a later story renders differently
- Whether a provider call can fail without throwing, following `api-client.ts`'s
  seven-outcome result shape, which exists precisely so a caller cannot forget a case
- A **fixture provider**: deterministic, offline, seeded from recorded fixtures, usable by
  tests and by a developer with no Alpaca key. This is what keeps `pnpm test` free of
  network access and what makes Story 2.11's chart work on a laptop on a train
- Rate-limit and retry **policy shape** (where it lives, what it is allowed to do), not
  the numbers, which Story 2.6 measures

## Out of scope, and who owns it

- Alpaca — Story 2.6
- Streaming, subscriptions, connection state — Epic 3, which extends this abstraction
  rather than replacing it. Design so that is an addition
- Persistence and caching — Story 2.7. The provider fetches; it does not store
- Rendering provenance — Story 2.13

## Open decisions — settle with the user

1. **Where the interface lives.** `packages/shared` if the frontend genuinely needs the
   types (it needs `Bar` and the provenance record for charts, so probably yes); the
   backend alone if not. Story 1.12's rule applies: shared means both sides depend on the
   same fact, not "shared is where types go"
2. **Whether provenance is per-series or per-bar.** Per-series is cheap and is right until
   a series is stitched from two sources — which Story 2.7's cache does the moment stored
   bars and freshly fetched bars appear in one response
3. **Adjusted or raw as the stored default**, and whether both are kept. This is
   effectively irreversible for stored history, so it belongs here rather than in 2.7

## Acceptance criteria

1. The interface and its types exist with no reference to any vendor, checked by grep
2. A fixture provider implements it fully and is what tests use
3. Every response carries provenance; there is no code path that produces a bar without it
4. Each error cause is producible against the fixture provider and each is distinguishable
   by the caller
5. Adjustment is explicit at the call site — no default that silently means "whatever the
   provider does"
6. `pnpm verify` passes with no network access

## What this story hands forward

The seam Epic 3 streams through, and the provenance record invariant 6 is enforced by.
