# Task 2.9.9 — Measured against the real store, locally and deployed

**Status:** Not started
**Story:** [2.9 Market Data API](STORY.md)
**Depends on:** Tasks 2.9.6, 2.9.7, 2.9.8

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
  way Task 2.8.10 recorded the universe response. **Note 2.9.1 decided there is no
  reduction**, so the pathological case is the one the **cap refuses** — measure it
  anyway, because it is what the cap is protecting against and the refusal has to
  be shown to cost nothing (§4 puts the check before the query, on a calendar walk
  rather than a scan).

- ~~**Check the reduction is honest as well as small.**~~ **No reduction ships**
  (`MARKET-DATA-API.md` §3), so there is no spike-survival property to assert. What
  replaces it: **validate the cap's number.** 10,000 bars was set on a measured
  gzipped-transfer argument, and §4 records that the obvious candidate — §28's
  50 ms parse budget — is **not** the binding constraint. Re-take both readings
  against the endpoint rather than the array, and say whether 10,000 is still the
  right line.

- **Measure the stitch, which is new since this task was written.** A window ending
  _now_ crosses the store's coverage and issues a provider request (Task 2.9.5).
  Record what that costs — added latency, and how often it happens with 2.9.8's
  caching in front of it — because it is the number that decides whether the
  read-side join is affordable as chosen.

- **Measure the cap check on the ACCEPTED path, not only the refused one — added
  2026-09-09 by Task 2.9.2.** `MARKET-DATA-API.md` §4's claim is that an over-cap
  request costs a calendar walk rather than a scan, and the bullet above already
  says to show the refusal costs nothing. The half that is easy to miss: the same
  walk runs on **every** request, because that is how the count is obtained at
  all — `marketSessionsBetween` over the window plus a per-session minute count.
  It should be microseconds against a query measured in milliseconds; say so with
  a reading rather than an expectation, and note it grows with the window's
  session count rather than with the number of bars.

- **§8's per-bar figure excludes the envelope, and the shipped wire shape has one
  — added 2026-09-09 by Task 2.9.3.** That method serialises _an array of bars_;
  what a browser receives is `{ series: { symbol, timeframe, bars, provenance,
coverage }, securityStatus }`. Measured on the shipped shape rather than
  estimated: the fixed cost is **391 bytes** for a populated single-source
  response, 480 with a second source, and 326 for an empty series with a null
  `covered`. Against a session at `1m` (390 bars, 44.3 kB) that is **0.9%** and
  below the noise; against a two-bar answer it is most of the payload. So the
  per-bar figure stays the right instrument for the cap and is the **wrong** one
  for a small window — quote the whole body for each access pattern rather than
  multiplying, and note that a stitched response carries one envelope and two
  sources rather than two envelopes.

- **The served read is TWO queries and one extra column per row — added
  2026-09-09 by Task 2.9.4, with a first reading to beat rather than to cite.**
  `readSeries` issues the bar query **and** a `bar_coverage` lookup, deliberately
  in that order (bars first, so a concurrent write cannot leave the ledger
  narrower than the bars in hand). And the bar query selects `recorded_at` beside
  the five values, because the series' `retrievedAt` is `min(recorded_at)` over
  the rows returned — a per-row cost paid on every response, invisible at 390
  bars and worth a number at the 10,000-bar cap. Measure the ledger lookup
  separately; it is a point read of a ~1,036-row table and should be
  microseconds, and if it is not, that is the query nobody meant to write.

  First readings, local, single-request, warm, so a later divergence is
  attributable: one full `NVDA` session at `1m` is **390 bars in 42 ms cold and
  6 ms warm**, provenance `alpaca`/`sip`. Re-take rather than quote — they were
  taken from a script against the repository handle, not through HTTP, which is
  precisely the gap this task exists to close.

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
- ~~The reduction (if any) is shown to preserve a real spike~~ **Struck
  2026-09-09: no reduction ships** (`MARKET-DATA-API.md` §3), which the third
  bullet above already says — this line contradicted it. What replaces it is that
  bullet's actual job: **the cap's 10,000 is re-validated against the endpoint**
  rather than against an array, and said to be right or not
- The ledger lookup and the per-row `recorded_at` cost are measured separately
  from the bar scan, so a surprise has an author
- Any figure that falsifies a claim in `BARS.md`, `PROVIDER.md`, an ADR,
  `PRODUCT_SPEC.md` or `CLAUDE.md` is **swept the same day**, upward, by grepping
  for the claim and amending the live sites — not deferred to Task 2.9.10
- `pnpm verify` passes

## Notes

This is the task most likely to change Story 2.12's plan. If a five-session minute
window turns out to be 700 kB, the chart story needs to know before it starts, not
during.
