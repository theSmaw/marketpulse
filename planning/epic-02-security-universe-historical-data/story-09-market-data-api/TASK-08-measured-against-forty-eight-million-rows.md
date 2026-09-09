# Task 2.9.8 — Measured against the real store, locally and deployed

**Status:** Not started
**Story:** [2.9 Market Data API](STORY.md)
**Depends on:** Tasks 2.9.5, 2.9.6, 2.9.7

## Objective

Acceptance criterion 5, taken properly: **response times for the access patterns
the charts actually need, against the real row count** — and the payload sizes
that decide whether Story 2.12 is possible as specified.

## What the user can see when this lands

**Nothing**, and every figure in this story's documents stops being an estimate.

## Work

- **Measure the endpoint, not the query.** `BARS.md` §8.6 has the SQL half
  (11.8 ms for a month, 2.1 ms for a five-session window, 61.6 ms for a year of
  minutes) and those are `EXPLAIN ANALYZE` timings with no serialisation, no
  schema stripping and no HTTP in them. The number this story owes is the one a
  browser experiences.

- **Take the patterns Stories 2.12 and 2.13 will actually issue**, and say for
  each what it is: one symbol at `1d` over the daily depth; one symbol at `1m`
  over a five-session window; the same over a month; and the pathological case —
  a year of minutes, **97,530 rows ≈ ~~8.4 MB~~ 11.08 MB of JSON** (re-measured
  2026-09-09 by Task 2.9.1, which reproduced the row count exactly and found the
  payload 24% larger; `MARKET-DATA-API.md` §8 has the method) — with and without whatever
  Task 2.9.1 decided about reduction. Record bytes, gzipped bytes and time, the
  way Task 2.8.10 recorded the universe response.

- **Check the reduction is honest as well as small.** If the server reduces, take a
  window containing a known spike and assert the spike survives at every bucket
  size offered. That is the one property a downsample can lose, and it is the
  property this product exists for.

- **Watch for the query nobody meant to write.** A serving path that touches
  `market_bars` where it should touch `bar_coverage`, or that runs at minute
  resolution where daily would answer, is invisible in a unit test and obvious in
  a timing. If a number surprises you, `EXPLAIN (ANALYZE, BUFFERS)` it before
  explaining it.

- **Then take the same readings against the deployed backend and the deployed
  store**, because the local database is a container on the same machine and the
  deployed one is across a link — §8.16 records that the two stores match to the
  digit, so a divergence in timing is the network and the platform rather than the
  data. Probe from more than one place before calling anything an outage: a check
  running from one machine over one link cannot tell its own network from the
  environment.

- **Report against §28's targets rather than in isolation**, and say plainly which
  of them this path can and cannot be held to — the <250 ms p95 target is about a
  server-received event reaching application state and is Epic 3's, not this
  request's, and quoting it here would be the wrong instrument.

## Done when

- Local and deployed timings and payload sizes for each named access pattern are
  recorded in `MARKET-DATA-API.md`, dated, with the row counts they were taken at
- The reduction (if any) is shown to preserve a real spike
- Any figure that falsifies a claim in `BARS.md`, `PROVIDER.md`, an ADR,
  `PRODUCT_SPEC.md` or `CLAUDE.md` is **swept the same day**, upward, by grepping
  for the claim and amending the live sites — not deferred to Task 2.9.9
- `pnpm verify` passes

## Notes

This is the task most likely to change Story 2.12's plan. If a five-session minute
window turns out to be 700 kB, the chart story needs to know before it starts, not
during.
