# Story 2.8 — Market Data API

**Status:** Not started
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Stories 2.3, 2.7
**Epic scope covered:** **Addition to this epic's stated scope** — the read contract implied by "security search/select" and the two charts

## Description

The HTTP contract the frontend reads securities and bars through. The epic's scope list
names the ingestion and it names the charts, and assumes the wire between them; this story
makes it explicit, because that wire is a contract three later epics also consume and
because Epic 1 spent a whole story establishing how this codebase declares one.

## Why it sits here in the sequence

After there is something to serve and before anything tries to render it. It is also the
last backend-only story in the epic, so it is the natural place for the epic's server-side
work to be proved end to end.

## Scope

- Endpoint shapes: list the tracked universe, search it, fetch one security, fetch a bar
  series for a symbol over a time window at a timeframe
- The request contract for a series: symbol, timeframe, window, and how the window is
  expressed — an absolute range, or a named window like "5 sessions" resolved server-side
  through Story 2.4's calendar. The second keeps one definition of a session; the first
  keeps the server dumber
- The response contract, in `packages/shared`, with the `satisfies` guard idiom Task 1.7.3
  established so a field added to the interface and forgotten in the schema is a compile
  error rather than a field that silently vanishes from the wire
- **Provenance in the payload**, per Story 2.5 — the response says which feed it came from
  and whether it is adjusted, so the UI cannot render market data without knowing
- Partial answers as first-class results (§36): "we have data through 15:42" and "we have
  nothing for this symbol" are answers, not errors, and the contract must be able to say
  them without using an error code
- Failure responses through Story 1.7's `ApiError` shape and its `500: apiErrorSchema`
  convention, with the correlation id already in place
- Payload size and shape: a year of minute bars is large enough that the encoding matters.
  Measure it before choosing anything clever
- Caching semantics — historical bars for a closed session are immutable, which is the
  cheapest caching opportunity this product will ever have

## Out of scope, and who owns it

- Anything rendered — Stories 2.9 to 2.13
- Streaming updates — Epic 3, which adds a second protocol beside this one (§31)
- Anomaly, filing or investigation endpoints — Epics 5, 9, 7

## Open decisions — settle with the user

1. **Named windows or absolute ranges**, per above
2. **Whether the server ever downsamples.** A three-year daily chart is ~750 points and
   fine; a one-year minute chart is ~100,000 points and is not — something must reduce it,
   and doing it on the server keeps the payload small while doing it on the client keeps
   the server honest about what it holds. Note that downsampling price data has a correct
   and an incorrect way to do it, and the incorrect way removes exactly the spikes this
   product exists to notice
3. **Pagination or a hard cap** on a series request, and what the API does when a request
   exceeds it
4. **How much of the universe the list endpoint returns at once** — 100 is small enough to
   send whole today and the architecture is meant to reach 500

## Acceptance criteria

1. Every endpoint declares a response schema, and a field added to a response type without
   its schema entry fails to compile
2. A series request returns bars with provenance, over a window resolved through the
   trading calendar
3. Unknown symbol, empty window, malformed timeframe and an unavailable database each
   produce the right status and the `ApiError` shape, with a quotable request id
4. "Partial data" is expressible and is not an error
5. Response times for the access patterns the charts need are measured against the real
   row count
6. The contract is exercised by tests against an assembled server, in the shape
   `server.test.ts` established
7. `pnpm verify` passes

## What this story hands forward

The contract Stories 2.9 to 2.13 consume, and the shape Epic 3's live channel sits beside
rather than replaces.
