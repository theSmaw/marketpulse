# Task 2.9.5 — The live tail, and the seam it has to label

**Status:** Not started
**Story:** [2.9 Market Data API](STORY.md)
**Depends on:** Task 2.9.4

## Objective

Serve a window that ends **after** what the store holds, by fetching only the
uncovered tail and joining it to the stored part through
`mergeSeriesProvenance` — so a chart running up to _now_ reaches now, and the
response says truthfully which feed each half came from.

**This task exists because of a decision, and the decision is recorded rather
than assumed.** [`MARKET-DATA-API.md`](MARKET-DATA-API.md) §5: the user chose the
stitch over "serve only what is stored", with the four bounding rules below. It
was added to the breakdown on 2026-09-09, after Task 2.9.1, because no task owned
it — 2.9.4 reads stored rows and 2.9.6 puts them on a wire, and the join was
between the two with nobody holding it.

## What the user can see when this lands

**Nothing on screen.** A read function with tests, and the first time this
application makes a **vendor network call while serving a user request** — every
previous one is a CLI command or the backfill. That property is the reason this is
a task rather than a bullet, and it is what its tests are mostly about.

## Work

- **Fetch only the uncovered tail, never the whole window.** The stored part comes
  from Task 2.9.4's read; the provider is asked for `(covered_end, requestedEnd)`
  and nothing else. This is the single rule that separates the chosen option from
  "ask the provider for the whole window on demand", which was the option nobody
  wanted, and it is invisible in a test that only checks the bars came back right.

  **`covered_end` is `StoredSeries.held.covered.end`, and `held` can be
  `undefined` — added 2026-09-09 by Task 2.9.4, which built the read.**
  `readSeries` returns `{ series, held }`, where `held` is the **ledger row** and
  is absent exactly when we hold nothing at all for that `(symbol, timeframe)`.
  Read the tail's start from there rather than from `series.coverage.covered`,
  which is `null` on every empty answer and would give a nullable field two
  meanings. **The absent case has no `covered_end` to start from and this task
  owes it an answer** — a symbol we have never backfilled is not the same request
  as one whose store is two days behind, and "fetch from `undefined`" is the shape
  that becomes "fetch the whole window", which is the option nobody chose. The
  session bound below is what keeps that honest whichever way it is answered.

- **Clamp the tail to what the plan will actually serve.** `ALPACA.md` §10's
  recency cliff keys on `end` **alone** and refuses the **whole** request rather
  than trimming it, so an unclamped mid-session fetch returns nothing at all.
  `alpacaServableEnd` already exists and is what the backfill uses; reuse it
  rather than writing a second definition of "16 minutes". Quoted with its source
  and date: at a simulated 12:00 ET, a request for today's session clamps to
  `now − 16 min` and yields **134 of 390 minutes** (`BARS.md` §8.13, 2026-09-08).

- **Bound the tail to the current session, and this is the rule that keeps the
  cost from growing while nobody is looking.** If the store is days behind — as
  the local one was on 2026-09-09, by two sessions — an unbounded rule turns a
  "last 5 sessions" request into a multi-day metered vendor fetch **on a page
  load**, and the amount it costs is a function of how stale the store is rather
  than of what the user asked for. Anything older than the current session is a
  gap the backfill owns; `coverage.covered` reports it honestly and the chart says
  how far it reaches. **Assert the negative**: a request whose gap is two sessions
  wide must issue **no** provider call. Make the break and watch it go red.

- **Join through `mergeSeriesProvenance` and `toBarSeries`, never a literal.** The
  merge is the only supported way to obtain a multi-source record, and it already
  carries the two halves of `PROVIDER.md` §2.4: **feed disagreement is truthful**
  (both survive in `sources`, which is why it is a list) and **adjustment
  disagreement is refused** (raw and split-adjusted are two price scales and every
  percentage change across the seam would be wrong). The store holds `raw`, so the
  tail is requested `raw` — passed explicitly, because there is deliberately no
  default adjustment anywhere in `packages/shared` and Story 2.6's criterion 5
  forbids one. `toBarSeries` then checks the `barCount`s sum to the bars, which is
  precisely the check that catches a stitch that concatenated two arrays and kept
  one provenance record.

- **A failing tail must not fail the request.** §36 is the governing rule and this
  is its first real instance in this epic: a provider that is rate-limited,
  unauthorised or simply down leaves the **stored part intact and served**, with
  `coverage.covered` ending where the store ends. The failure is logged under the
  request's `reqId`; it is not a 500, and the eight-member provider error taxonomy
  does not leak to the client. _"Live feed disconnected — displaying data through
  10:42:17"_ is the shape, and Story 2.14 renders it.

- **Today both halves report `sip`, and that is correct rather than a bug.** The
  seam is invisible in the payload until Epic 3's `iex` stream exists, at which
  point the same code path carries two feeds in one `sources` array with no
  change. Do not fake a second feed to make a test interesting; assert the
  **mechanism** — two sources, counts summing, both feeds preserved — with a stub
  provider declaring a different feed.

  **Do not merge the stored half's provenance when the stored half is EMPTY —
  added 2026-09-09 by Task 2.9.4.** `SeriesProvenance.sources` is a non-empty
  tuple, so an empty stored answer still carries **one** source, whose `barCount`
  is `0` and whose `provider`/`feed` come from a module constant rather than from
  the ledger — because with no ledger row there is nothing that knows. Merging it
  with a real tail produces a two-source record whose first source describes
  nothing and is not a fact, and `MARKET_FEED_DESCRIPTIONS` would render it in
  Story 2.14 beside the source that is. Use the tail's own provenance alone when
  the stored half has no bars. The counts still have to sum, which is what
  `toBarSeries` checks and what makes getting this wrong loud rather than subtle.

  **The wire half of that is already built and asserted, so this task does not
  touch the contract (added 2026-09-09 by Task 2.9.3).**
  `SeriesProvenancePayload.sources` is an array in both the type and the schema,
  and a test already sends a two-source series with disagreeing feeds through the
  real serialiser and reads `["sip", "iex"]` and `[1, 1]` back out. So a stitch
  that reaches the wire correctly is a question about _this_ task's join, not
  about whether the payload can express it. One asymmetry to know rather than
  discover: the domain types `sources` as a **non-empty tuple** and the wire types
  it as a plain array, because a tuple has no JSON Schema `fast-json-stringify`
  would enforce — the non-emptiness survives inside the process, through
  `toSeriesProvenance` and `mergeSeriesProvenance`, and is re-established on the
  way in by Story 2.10's predicate.

- **The fetched tail is SERVED and not STORED, and the write path now enforces
  that rather than trusting it — added 2026-09-09 by Task 2.9.4.** The instinct at
  the end of this task is to keep what was just fetched: it was paid for, it is a
  metered request, and Task 2.9.8 is about not paying twice. **`recordSeries` will
  refuse it**, and the refusal is correct rather than an obstacle to route around.
  `0007_bar_coverage_provenance.sql` stores one `provider`/`feed` per
  `(security, timeframe)` window, so the write throws `ForeignSourceError` when
  an arriving series' source disagrees with the ledger row it would extend, and
  again when a **stitched** series names two sources for one window. That is
  `0004_market_bars.sql`'s trigger for a per-bar `feed` column firing at the
  moment a second feed tries to enter the store, which is exactly what it was
  written for. Storing the tail is a decision for the story that adds the per-bar
  column — Epic 3 — and not a side effect of a read path. Task 2.9.8's caching is
  where the metered request is bounded instead, and it is bounded **in front of**
  the store rather than inside it.

- **Test with a stub provider and no network.** `fixture-provider.ts` is the
  precedent and `retry-provider.ts` shows the wrapper shape. `pnpm verify` must
  stay runnable with no server, no database, no network and no credentials; the
  database half goes in a `*.database.test.ts`.

## Done when

- A window ending after `covered_end` returns one series spanning both halves,
  with `provenance.sources` naming each and the counts summing
- A window for a symbol the store holds **nothing** for is answered explicitly
  rather than by arithmetic on an absent `held`, and the tail it fetches (if any)
  is the only source in the resulting record
- A gap older than the current session issues **no** provider call, asserted, with
  the assertion made to fail once
- A provider failure yields the stored part with honest coverage rather than a
  5xx, asserted
- The clamp is exercised either side of `now − 16 min`
- An adjustment disagreement is refused, and the refusal is a programming error
  rather than a client-visible one
- `pnpm verify` passes with no database and no network; `pnpm test:database`
  passes against a real server

## Notes

**The cost this task creates is Task 2.9.8's to bound.** Every chart window ending
_now_ is a metered vendor request on a cache miss, which is what makes the caching
task load-bearing rather than an optimisation. If 2.9.8 finds it cannot bound it,
that is the condition `MARKET-DATA-API.md` §5 names for bringing the stitch
decision back to the user — not a reason to quietly narrow it here.

Epic 3 replaces **what is being stitched**, not the stitching: a live tail is not
16 minutes stale and is not metered, so the clamp and the session bound both stop
being necessary. The join, the merge and the two-feed reporting all stay.
