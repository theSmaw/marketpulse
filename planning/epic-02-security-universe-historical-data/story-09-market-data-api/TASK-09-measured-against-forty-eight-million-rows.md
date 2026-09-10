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

- ~~**The served read is TWO queries**~~ **— it is THREE on the route, corrected
  2026-09-09 by Task 2.9.6, which built the route.** `readSeries` issues the bar
  query **and** a `bar_coverage` lookup, deliberately in that order (bars first,
  so a concurrent write cannot leave the ledger narrower than the bars in hand)
  — and the handler issues a **third before either of them**:
  `securities.findSecurity(symbol)`, the point lookup that answers the 404 and
  supplies `securityStatus`. It is a unique-index read of a 518-row table and
  should be invisible, but it is on the path of **every** request including the
  ones that then fail, so measure it rather than assume it: a lookup that turned
  out to be a sequential scan would be a per-request cost nobody budgeted, and it
  is the one query on this path that no earlier task measured.

  The per-row cost is unchanged and still worth its own number: the bar query
  selects `recorded_at` beside the five values, because the series' `retrievedAt`
  is `min(recorded_at)` over the rows returned — invisible at 390 bars and worth
  a reading at the 10,000-bar cap. **Measure all three separately.** Both point
  reads — the universe lookup and the ~1,036-row ledger — should be microseconds,
  and if either is not, that is the query nobody meant to write.

  First readings, local, single-request, warm, so a later divergence is
  attributable: one full `NVDA` session at `1m` is **390 bars in 42 ms cold and
  6 ms warm**, provenance `alpaca`/`sip`. Re-take rather than quote — they were
  taken from a script against the repository handle, not through HTTP, which is
  precisely the gap this task exists to close.

  **Half of that gap is now closed and the reading is a baseline to beat rather
  than the answer — added 2026-09-09 by Task 2.9.6.** The same session through
  the real route, against `dist/`, is **44,701 bytes in 36 ms** end to end
  including `curl`'s own overhead — one request, warm, unrepeated, with no
  gzip negotiated and no percentile behind it. So it is a sanity check that the
  HTTP half is not hiding an order of magnitude, and it is **not** criterion 5:
  this task still owes n, a distribution, the gzipped size, the deployed
  reading, and the same for every other access pattern. Note it also sits 0.9%
  above §8's 44.3 kB envelope arithmetic, which is the estimate behaving.

- **`/securities` is now an access pattern too, and it is the one with a local
  reading and no deployed one — added 2026-09-09 by Task 2.9.7.** That task made
  the universe page issue **four** concurrent reads instead of three, and the
  fourth is the first query on any page-load path in this product that touches
  `market_bars` at all. It is a cross-sectional read — the last two daily closes
  for every tracked security — which is exactly the shape the bullet below warns
  about, so it was measured rather than assumed:

  | Reading                                           |                Local, 2026-09-09 |
  | ------------------------------------------------- | -------------------------------: |
  | `GET /securities` end to end, warm                |                     **13–20 ms** |
  | the same, cold                                    |                            33 ms |
  | the close query alone, warm, round trip from Node |                       4.8–8.2 ms |
  | the close query alone, cold                       |                          21.4 ms |
  | payload                                           | 190,736 B, **19,526** gzipped -9 |

  What is owed here is the deployed half and a distribution: those are single
  requests from `curl` against a container on the same machine, with no n and no
  percentile. The deployed database is across a link, and the query is 518 index
  searches inside **one** statement rather than 518 round trips — which is the
  property to confirm rather than assume, because it is the difference between
  20 ms and a page that visibly stalls.

- **One control named in Task 2.9.7's brief was NOT re-taken, and it is this
  task's to settle — added 2026-09-09.** That brief said `BARS.md` §8.6's
  cross-sectional reading — **493 rows, 28.2 ms, via a PostgreSQL 18 skip scan**
  — was "the control to re-take rather than cite". It was not: the task measured
  the query it actually shipped instead, which is the better instrument for its
  own decision and leaves §8.6's figure standing on its 2026-09-08 reading with
  nothing having re-confirmed it. That matters because §8.6's skip-scan finding
  is what keeps `0004_market_bars.sql`'s deferred `(observed_at)`-leading index
  deferred, and that deferral is enforced by a test asserting the table has
  exactly two indexes. Re-take it here, and if it has moved, the deferral is the
  claim to check rather than the timing.

- **There is a CACHE on this path now, and it will silently make your numbers
  wrong — added 2026-09-10 by Task 2.9.8.** The route holds an in-process LRU of
  served answers, keyed on the **resolved** `(symbol, timeframe, range)`, with a
  300-second lifetime for a window inside closed sessions and 60 seconds for one
  reaching into the live session. So a naive "hit the endpoint five times and take
  the median" measures **one store read and four cache hits**, and the median is
  the cache. That trap is not hypothetical: it is exactly how 2.9.8's own first
  timing run came out with a miss and a hit five milliseconds apart.

  The technique, which that task used and which this one should reuse: **vary the
  window by one minute per sample** so every request is a distinct key and every
  one is a real read. Its own readings, as a baseline to beat rather than an
  answer — `NVDA` `1m`, 9,360 bars, 1.06 MB, median of 15 on loopback against
  `dist/`: **miss 31.3 ms, hit 11.6 ms, conditional 304 10.9 ms**, against
  **11.1 ms** for the same read timed inside PostgreSQL. Two thirds of a miss is
  the database and the rest is serialising a megabyte.

  Three consequences for this task's own bullets. The **stitch** bullet's "how
  often it happens with 2.9.8's caching in front of it" now has an answer —
  **at most once a minute per resolved window** (`MARKET-DATA-API.md` §11) — so
  what is owed here is the added latency of a tail that _is_ fetched, not the
  frequency. The **cap-check** bullet is unaffected: the calendar walk runs before
  the cache is consulted, on every request including a hit. And the **`/securities`**
  bullet gains a second reading to take: that route now carries an `ETag`, so its
  deployed measurement should record the conditional request as well as the full
  one — 190,736 B against 0 B locally, and the deployed figure is the one that
  matters because 190 kB costs nothing over loopback and is the entire saving over
  a link.

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
  recorded in `MARKET-DATA-API.md`, dated, with the row counts they were taken at,
  and **each one says whether it was a cache miss or a hit** — a figure that does
  not is a figure nobody can reproduce
- `/securities` is among them, deployed as well as local, and its close query is
  confirmed to be one statement rather than 518 round trips
- `BARS.md` §8.6's 28.2 ms cross-sectional reading is re-taken, and if it moved,
  the two-index deferral it justifies is re-argued rather than the number simply
  replaced
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
