# Task 2.9.4 — The read, and the provenance the store does not hold

**Status:** Not started
**Story:** [2.9 Market Data API](STORY.md)
**Depends on:** Tasks 2.9.2, 2.9.3

## Objective

Turn stored rows into a `BarSeries` — the first query in this repository where
the temporal seam does real work, and the first place where a fact the schema
deliberately does not store has to be produced honestly.

## What the user can see when this lands

**Nothing on screen.** A read function with tests, and a decision recorded.

## Work

- **Build it beside the seam, exactly as `securities.ts` and `market-bars.ts`
  do**: the module builds its own Kysely handle over the pool and **does not
  export it**, and exports functions returning domain objects. `market_bars` is
  the first table with an `observed_at`, so **this is the first query Epic 13's
  plugin would actually filter** — a `selectFrom("market_bars")` reaching for an
  imported handle is the failure the arrangement exists to prevent, and it would
  pass every test anybody can write today. ADR 0015's gap 4 is unchanged: the
  arrangement is honoured, not enforced.

- **`readBars` already exists and returns `readonly Bar[]`, deliberately not a
  series** — its own comment says why, and says Story 2.9 owns meeting it. The
  gap is real and is this task's central problem: **`market_bars` stores no
  provenance and neither does `bar_coverage`.** There is no `feed`, no `provider`
  and no `retrieved_at` on either table, because four provenance fields on fifty
  million rows are fifty million copies of a constant, and `0004`'s stated trigger
  for a per-bar `feed` column is **a second feed writing into this table** —
  Epic 3, not this story.

  So a served series' provenance has to come from somewhere, and there are three
  candidates. Take one explicitly and record the alternatives:

  1. **A constant asserted at the read boundary** — everything stored is
     `alpaca` / `sip` — with the assertion written where a second writer would
     break it loudly rather than quietly.
  2. **`bar_coverage.updated_at` as `retrievedAt`**, which is honest about the
     series' most recent fetch and **overstates the freshness of its older half**,
     since a catch-up that appends today's bars moves it for the whole range.
  3. **A migration adding provenance to the ledger**, which is real work and is
     the answer if the others are all dishonest.
  4. **`market_bars.recorded_at`**, which was missed when this list was written
     and may be the best of the four. `migrations/README.md` §4 makes it mandatory
     on every table and `market-bars.ts` deliberately lets it default to `now()` —
     transaction start, so **every bar in one batch shares one value and the batch
     _is_ the retrieval**, which is exactly what invariant 5 wants. Unlike
     candidate 2 it is scoped to **the window being served** rather than to the
     whole series, so `max(recorded_at)` over the returned rows does not inherit a
     catch-up's freshness for bars fetched a year earlier. Weigh it properly
     rather than inheriting this list's omission.

  **Whatever is chosen, do not re-stamp `retrievedAt` at read time.**
  `market-provenance.ts` names that trap in its own words — Task 2.3.5 already
  found that defaulting a provenance date to `now()` makes it permanently silent,
  unable to report the one thing it exists to report — and a read path that
  stamps this when it serves stored bars turns "fetched three weeks ago" into
  "current".

- **Produce a single-source record here, and leave the join to Task 2.9.5.** This
  task reads the store; the stitched case has its own task and its own tests
  (`MARKET-DATA-API.md` §5). What this one owes the next is a `SeriesProvenance`
  that `mergeSeriesProvenance` can accept — which it will, because the merge takes
  records rather than building them.

- **Construct through `toBarSeries` and never a literal.** The constructor is the
  only way to obtain a `BarSeries`, and its checks are the interesting half:
  ordering, `covered` agreeing with the bars it contains, and `barCount`s summing.
  A hand-written object skips all of it.

- **`status` is NOT filtered on this path.** `UNIVERSE.md` §12.2 is explicit: bars
  stored against a security we have stopped tracking are still what happened, so
  an `untracked` symbol returns its stored history **and says it is untracked**. A
  404 there would be a lie about data we hold. Assert it against a real untracked
  row — Story 2.4 already produced that situation.

- **Tell the three empty answers apart, because the route needs all three.** A
  symbol not in the universe at all; a symbol we track for which we hold nothing
  at this timeframe; and a window inside which nothing traded. The first is a 404,
  the other two are **200 with an empty series** — and `coverage.requested`
  beside a `null` `covered` is what lets a consumer tell "we never asked" from
  "nothing was there".

- **Added 2026-09-09 by Task 2.9.2 — check the assumption its cap rests on.**
  `series-request.ts` refuses an over-cap request by counting **session minutes**
  from the calendar, which is only an upper bound on what this read returns if the
  store holds regular-session bars and nothing else. That is what the backfill
  writes, and this is the first task that can look at the rows and say so. If the
  store turns out to hold extended-hours prints, the cap **under-counts** and
  admits a response larger than it means to — state which it is rather than
  leaving it as an assumption in a comment. This read consumes
  `SeriesRequest`'s `symbol`, `timeframe` and already-absolute `range`; it does
  not re-derive a window.

- **Read coverage from `bar_coverage`, never by counting `market_bars`.**
  `BARS.md` §9.1 makes that a property the store's observability depends on: a
  page load that scanned 48 million rows would arrive in Task 2.9.9's timings as a
  mystery with no obvious author.

- ~~**If Task 2.9.1 chose to reduce a series, the reduction happens in SQL**~~
  **Settled by Task 2.9.1: it does not reduce** (`MARKET-DATA-API.md` §3). This
  read returns exactly the stored bars in the window at the timeframe asked for.
  `bar.ts`'s guard still governs anything that _does_ aggregate — in SQL over
  `numeric`, never in JavaScript over a `number` — and Task 2.9.7's last close is
  where that next applies.

- **Test it at the database level** (`*.database.test.ts`, which is **not** in
  `pnpm test` or `pnpm verify`) and unit-test the mapping half without a server.
  The mapping is `toBar`'s pattern: one function per domain type, never a generic
  mapper, because that is exactly where a nullable column becomes an explicit
  domain answer.

## Done when

- One exported read returns a `BarSeries` for a symbol, timeframe and window, over
  a handle nothing else can reach
- The provenance decision is taken, recorded in `MARKET-DATA-API.md` with its
  alternatives and its reversal trigger, and `retrievedAt` is demonstrably not
  re-stamped
- Unknown symbol, untracked symbol, no stored data and an empty window are four
  distinguishable results, each tested
- Coverage comes from the ledger, asserted against the expensive `min/max/count`
  as its control — the arrangement `market-bars.database.test.ts` already uses
- `pnpm verify` passes with no database running, and `pnpm test:database` passes
  against a real server

## Notes

`readBars`' own comment says a `BarSeries` out of stored rows "needs a `feed` this
schema does not have". That sentence is this task. Resolving it with a shrug is
how invariant 6 stops being true without anything going red.
