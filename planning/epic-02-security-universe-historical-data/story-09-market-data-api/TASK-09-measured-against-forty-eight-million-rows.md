# Task 2.9.9 — Measured against the real store, locally and deployed

**Status:** Done — 2026-09-10
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

- **Confirm the cache headers SURVIVE THE DEPLOYED INGRESS, and treat that as a
  gate rather than a reading — added 2026-09-10 by Task 2.9.8.** Everything that
  task built is carried by two response headers, and **every test it wrote runs
  through `app.inject()`, which has no proxy in it at all**. Between the
  application and a browser sits an Azure Container Apps ingress that no file in
  this repository configures — `CLAUDE.md`'s _What `pnpm verify` does not cover_
  §6 names that class exactly — and a proxy that strips `ETag`, rewrites
  `Cache-Control` or answers a conditional request itself makes the whole
  mechanism inert **with every test still green**. That is the shape of failure
  `CLAUDE.md` warns about in terms: a green run certifies internal consistency,
  not an environment.

  Four readings, and they are `curl` against the deployed backend rather than a
  timing:

  1. `GET /market-data/bars` over an **absolute closed** window answers
     `cache-control: private, max-age=300` and an `etag`, byte for byte as the
     local one does;
  2. the same URL with `If-None-Match` answers **304**, and the `304` still
     carries `cache-control` and `etag`;
  3. a **named** window (`?sessions=N`) answers `private, no-cache` — a proxy
     that "helpfully" adds a lifetime here is the one failure that produces a
     wrong chart rather than a slow one;
  4. `GET /securities` answers `private, no-cache` with an `etag`, and its
     conditional request answers 304.

  If any of them differ, the finding is **not** a number for a table: it is a
  falsification of `MARKET-DATA-API.md` §11 and it sweeps upward the same day.
  Note the deployed **frontend** host is not on this path at all — it serves the
  bundle, and the browser calls the backend directly — so this is one hop rather
  than two.

- **Read the deployed REPLICA COUNT, because it is the multiplier on §11's
  vendor bound — added 2026-09-10 by Task 2.9.8.** That task's cache is an
  in-process `Map`, so its "one vendor request per resolved window per minute"
  is **per process**. `HOSTING.md` records `minReplicas: 1` as a required setting
  and records **no maximum**, because the Container App's scale rule exists only
  on the platform. So the deployed bound is `replicas × 1` and nobody in this
  repository can currently say what `replicas` is. Read it, record it in §11
  beside the bound, and add it to `HOSTING.md`'s account of what lives only on
  the platform if it is not there. **Do not "fix" it with a shared cache** — that
  is a second database bought to save a request the free plan does not charge
  for, and `CLAUDE.md`'s rule against a second database in V1 without a
  measurement applies squarely.

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
- **The four deployed header readings are taken and quoted**, and any difference
  from the local ones is swept upward the same day rather than recorded as a
  variation
- **The deployed replica count is read and recorded beside §11's vendor bound**,
  because that bound is per process and the multiplier lives only on the
  platform
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
  for the claim and amending the live sites — not deferred to the close task
- `pnpm verify` passes

## Notes

This is the task most likely to change Story 2.12's plan. If a five-session minute
window turns out to be 700 kB, the chart story needs to know before it starts, not
during.

---

## What was measured — 2026-09-10

**No application code changed.** This task is a measurement and four documents;
`git diff --stat` on the source tree is empty by design.

The readings live in **`MARKET-DATA-API.md` §12**, which is the durable record —
this section says what was done, what surprised, and what it cost the documents.
Take a figure from §12, not from here.

### The instrument, and the trap it was written around

§11 warned that a naive "hit it five times and take the median" measures one
store read and four cache hits. Every miss reading here **shifts the window's
start one minute earlier per sample**, into pre-market where no bar exists — so
every sample is a distinct cache key and the bar count is constant. The first
run of this task's own script had the ETag bug's mirror image (the conditional
request carried an ETag from a _different_ window and got a 200), which is the
same class of mistake and is why the conditional column reads 304 now.

Local readings are through `node dist/index.js` with `MARKET_DATA_PROVIDER=alpaca`
on loopback; deployed readings are from a laptop in the United Kingdom against
`eastus`, and every deployed table is reported alongside the conditional request
that isolates the link.

### The gate came first, and it passed

The four deployed header readings the brief made a gate, taken before anything
was timed:

| Reading                            | Result                                                |
| ---------------------------------- | ----------------------------------------------------- |
| Absolute closed window             | `cache-control: private, max-age=300` + `etag` ✅     |
| The same with `If-None-Match`      | **304**, still carrying `cache-control` and `etag` ✅ |
| Named window (`?sessions=1`)       | `private, no-cache` ✅ — no proxy added a lifetime    |
| `/securities`, and its conditional | `private, no-cache` + `etag`; **304** ✅              |

Nothing between the application and the browser strips, rewrites or answers on
behalf of any of it. The absolute-window body was **44,701 bytes deployed —
byte for byte the local figure**, which is a second confirmation on top of the
headers. **`MARKET-DATA-API.md` §11 stands unamended in its mechanism.**

### The five things that were not known before today

1. **Nothing on this path compresses.** Neither the application nor the Azure
   Container Apps ingress; measured both ways round with
   `Accept-Encoding: gzip, deflate, br`. §4's cap argument is stated in gzipped
   bytes and therefore reasons about a transfer that does not happen. **The cap
   survives on a re-argument and §4 carries a dated amendment.** This is the
   biggest single thing found.
2. **The cap check costs ~30 µs per session, on every request including a cache
   hit.** For the whole stored daily depth that is **20.6 ms** against a **1.9 ms**
   database read — the dominant cost of the request, and attributed:
   `marketSessionOn` is 28.25 µs on a trading day against 6.42 µs on a weekend,
   so it is constructing each session's instants rather than walking days.
3. **The stitch is cheap.** ~17 ms against a matched control, so §5's condition
   does not fire and the read-side join stands as chosen. It could only be
   measured **deployed**, because the local store is four sessions stale and the
   session-gap bound declines every tail — which is itself what §11 predicted.
4. **`maxReplicas: 1`.** §11's per-process vendor bound has a multiplier of
   exactly one. Recorded in `HOSTING.md`, where it also turns out to be the
   unstated other half of `CLAUDE.md`'s claim about the Epic 3 socket.
5. **The first request after ten idle seconds costs ~170 ms more**, reproducibly,
   because `POOL_IDLE_TIMEOUT_MS` is 10 s and a deployed reconnection mints a
   fresh Entra token. Nothing asked for this reading; it is the largest single
   component of deployed server-side latency and nothing had named it.

### What did not surprise, which is worth saying

Every plan on the served path is an index scan. `findSecurity` is three buffers
and 0.22 ms in-engine; the ledger is six and 0.26 ms; the bar query is the plan
§8.6 recorded. **There is no query nobody meant to write.** `/securities`' close
query is confirmed **one statement with 518 index searches**, not 518 round
trips — on the plan locally, and deployed by arithmetic the alternative cannot
fit inside (§12.2).

### The sweep, done the same day

| Document                    | What                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `MARKET-DATA-API.md` §4     | Two dated amendments — the gzipped-wire inference, and the walk's real cost                               |
| `MARKET-DATA-API.md` §5, §9 | Pointers: the stitch condition settled, criterion 5 taken                                                 |
| `MARKET-DATA-API.md` §11    | The gzip column relabelled; the replica multiplier struck and answered; the deployed `/securities` saving |
| `BARS.md` §8.6              | Dated amendment — query C re-taken, deferral re-argued rather than the number replaced                    |
| `HOSTING.md`                | `maxReplicas: 1` recorded, with both claims that depend on it and a trigger                               |
| Story 2.9 `STORY.md`        | Criterion 5 marked taken                                                                                  |
| Story 2.11 `STORY.md`       | Its live search-sizing argument told to use the uncompressed figure                                       |
| Story 2.12 `STORY.md`       | Three things this changes about how the chart should be built                                             |
| Task 2.9.11 (was 2.9.10)    | What it inherits, once Task 2.9.10 was added ahead of it                                                  |

**Nothing falsifies `PRODUCT_SPEC.md`, an ADR or `CLAUDE.md`.** The nearest miss
is `CLAUDE.md`'s note that the market socket is safe at a minimum replica count
of one — confirmed, and now supplied with the maximum it did not have.

### One thing recommended and deliberately not built

**Register a response-compression plugin.** It is the single largest improvement
available to this API — a megabyte against 164 kB — and it is one dependency.
It is not done here because this is a measurement task, because it changes
shipped behaviour, and because its whole difficulty is ordering it against
§11's validator so the `ETag` is computed over the representation the client
actually validates. §12.5 states the condition.

> **Resolved 2026-09-10, later the same day: it is a task, not a condition.**
> **Task 2.9.10 — Compress the wire** was added and the close renumbered to
> 2.9.11. The argument that moved it out of "recommended" is that `/securities`
> is **shipped and rendered today** at 190,736 bytes, so this is a repair rather
> than scaffolding — and that this story's own scope has always owed it: _"a year
> of minute bars is large enough that the encoding matters. Measure it before
> choosing anything clever."_ The measuring was this task; the choosing is the
> next one.

---

## For the stakeholder — what this means, in plain terms

### What we did

Nothing about the product changed today. We **measured** it — the price API we
have spent this story building, against the real store of **48 million** real
prices, both on a developer's machine and on the live deployed system, and we
wrote every number down.

That sounds like bookkeeping and it is not. Several of the decisions in this part
of the product were made on estimates, and an estimate that nobody ever checks
quietly becomes a fact. Two of them turned out to be wrong.

### What we found

**The good news first: the thing works, and it works for the reason we thought.**
Asking for a day of minute-by-minute prices takes about **5 milliseconds** on a
developer's machine. Every database lookup behind it is doing exactly what it was
designed to do — we checked each one individually rather than trusting the total.
The safety net we built last week (the "is this answer still current?"
fingerprint) survives the journey through the live hosting platform intact, which
was not guaranteed and which every test we had written was structurally incapable
of proving.

**And the thing we were most worried about is a non-issue.** When you ask for a
chart that runs up to _right now_, the system has to go and fetch the last few
minutes from our data provider and join them onto what we already hold. We flagged
that as a risk when we designed it. Measured: it adds about **17 milliseconds**.
It is free, in practice. That decision stands.

**Now the two things we got wrong.**

The first is that **we are sending prices over the internet uncompressed.** We had
assumed compression was happening — it is a thing web servers usually do
automatically — and we had used the compressed sizes when deciding how much data
one request is allowed to return. Nobody had ever checked. Nothing compresses
anything. So a month of minute-by-minute prices is **1 megabyte** rather than the
164 kilobytes we had been reasoning about, and from the UK to our US server that
is about **two and a half seconds**.

This is genuinely good news, oddly: it is a large, cheap improvement we now know
is available, and it is available because we looked. Turning compression on is
roughly one line of configuration — but it has to be done carefully so it does not
break the "is this still current?" fingerprint from last week, so we have written
down exactly what needs doing and handed it to the next piece of work rather than
rushing it in at the end of a measurement task.

The second is smaller and stranger. Before answering any request, the system
counts up how many trading days are in the window you asked for, to check you are
not asking for too much. For an ordinary chart that check is invisible. For a
request covering **every trading day we hold**, that counting takes **21
milliseconds** — while reading the actual prices takes 2. We are spending ten
times more effort checking the question than answering it. It is not broken and
nobody would notice it today, but the "show me everything" button on the chart we
are about to build is exactly the request that hits it, so we have written it down
with a clear trigger for fixing it rather than discovering it later.

We also found, unlooked-for, that the very first request after a quiet moment
costs an extra fifth of a second, because the server lets its database connection
lapse after ten seconds of silence and has to re-establish and re-authenticate it.
On a product with steady traffic that never happens. On ours today, it is most
requests. Written down, with the three possible fixes, for whoever holds the
performance budget.

### Why we made the decisions we made

**We measured the endpoint, not the database.** Every earlier figure in this story
was taken by asking the database directly. That is the wrong instrument: it leaves
out turning the answer into something a browser can read, and it leaves out the
network. A browser does not experience a database query. So every number here is
what somebody sitting in front of a screen would actually wait for.

**We measured from the live system as well as a laptop**, and we reported the two
separately rather than averaging them into a number that describes nowhere. A
laptop talking to a database on the same machine tells you about the software. A
laptop in the UK talking to a server in Virginia tells you about the internet.
Both matter, and confusing them is how teams conclude their software is slow when
their office wifi is.

**We resisted fixing things.** Three of the five findings have obvious repairs and
none of them were made today, because a measurement task that also changes the
thing it is measuring produces numbers nobody can trust. Each one is written down
with the specific condition under which it should be done — not "later", but
"when this particular thing happens" — so it fires on its own rather than relying
on somebody remembering.

**We corrected the record the same day.** Where a measurement contradicted
something written down elsewhere, we went and amended the other document
immediately, including a fairly foundational one about how much data a single
request may return. We deliberately do not silently overwrite the old reasoning —
we leave it standing with a dated note explaining what turned out to be untrue.
Anyone reading this project in a year can see not only what we decided, but what
we believed when we decided it and when we found out otherwise.

### Where this leaves the product

The price API is **finished and now verified against reality rather than against
our assumptions**. What is on screen is unchanged: five pages, the tracked list of
518 companies, and their latest closing prices.

What this unlocks is the next two stories, which are the ones that finally make
this look like a market product: **the price chart** and **the volume chart**.
This task existed specifically so that the chart work starts with real numbers —
how big a request is, how long it takes, which window sizes are comfortable and
which are not — rather than discovering them halfway through building it. That is
why the findings were folded directly into the chart story's own brief rather than
left in a report.

The one thing we would highlight upward: charts will feel fast if they draw
themselves immediately and fill in the data as it arrives, and will feel slow if
they wait. That is now a measured requirement on the chart work rather than an
opinion about it.
