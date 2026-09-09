# Task 2.9.4 — The read, and the provenance the store does not hold

**Status:** Complete — 2026-09-09
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

  **Amended 2026-09-09 by Task 2.9.3 — the field exists, and it is not on the
  thing this task returns.** _"Says it is untracked"_ is now
  `BarSeriesResponse.securityStatus`, on the **envelope**, deliberately not on the
  series: a security's status is a fact about the security rather than about a run
  of bars, and `BarSeries` carries no such field. So this task's read **cannot**
  answer it and must not grow a field to try — a `BarSeries` is obtained only
  through `toBarSeries`, whose input has five members and no status among them.
  The value comes from the securities lookup that produces the 404, which is Task
  2.9.6's. What this task still owes is the half below: telling the answers apart
  so that lookup has something to be beside.

- **Tell the three empty answers apart, because the route needs all three.** A
  symbol not in the universe at all; a symbol we track for which we hold nothing
  at this timeframe; and a window inside which nothing traded. The first is a 404,
  the other two are **200 with an empty series** — and `coverage.requested`
  beside a `null` `covered` is what lets a consumer tell "we never asked" from
  "nothing was there".

  **Amended 2026-09-09 by Task 2.9.3: the wire spelling of the second and third
  is now fixed and asserted, so build to it rather than re-choosing it.** An empty
  answer is `bars: []` with `coverage.covered` **null and not `""`** — measured in
  this exact shape and asserted on the raw body, because the serialiser turns a
  carelessly declared nullable into an empty value that reads as a covered window.
  `toBarSeries` already enforces the domain half: `covered` is null **exactly**
  when the series is empty, in both directions. The consequence for this read is
  that it must produce `covered: null` rather than a zero-width range, which
  `toTimeRange` would refuse to construct anyway.

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

---

## What was done

`readSeries` on `MarketBarsRepository` — one exported read returning a
`BarSeries` and the ledger's own statement beside it, over the handle
`market-bars.ts` already builds and does not export. The mapping half,
`toStoredSeries`, is a pure exported function unit-tested without a socket, for
`toBar`'s reason: the interesting part of it is a set of decisions about what a
served series _claims_, and a decision only exercisable through a database is a
decision nobody exercises.

Measured end to end against the local 48,027,772-row store: a full session of
`NVDA` minute bars is 390 bars in 42 ms cold and 6 ms warm, with provenance
reading `alpaca`/`sip` retrieved `2026-09-08T07:28:40.261Z` — the batch's write
time, not the read's.

### The provenance decision went the other way, and a measurement is why

The task recommended a constant asserted at the read boundary, "written where a
second writer would break it loudly rather than quietly". **It was built that
way first — as a guard on `recordSeries` — and the guard immediately turned four
existing tests red.** `backfill.database.test.ts` drives the **shipped**
backfill with the **fixture** provider into a real PostgreSQL database, so a
store holding `fixture`/`synthetic` bars is not a hypothetical waiting for Epic
3: it is something this repository creates on purpose, in CI, and `pnpm backfill`
under `MARKET_DATA_PROVIDER=fixture` is one command from doing it to a store
something serves. A constant would have labelled invented prices as the full US
consolidated tape.

So candidate 3 was taken for `provider` and `feed`
(`0007_bar_coverage_provenance.sql`, ~1,036 rows) and candidate 4 for
`retrievedAt` (`min(market_bars.recorded_at)` over the rows actually returned).
They turned out to be complementary rather than competing, which the original
list did not make obvious: provenance has three fields and the schema could
answer none of them. `MARKET-DATA-API.md` §10 records all four candidates, the
`min`-versus-`max` choice, the one case the ledger cannot answer, and the
reversal trigger.

**The guard survives, and is now true rather than asserted.** `recordSeries`
refuses a series whose source disagrees with the ledger row it would extend, and
refuses a stitched series naming two sources for one window — so
`0004_market_bars.sql`'s trigger for a per-bar `feed` column fires **per series,
at the write, at the moment it happens**.

### Task 2.9.2's cap assumption, checked

Of **47,682,213** stored minute bars, **zero** fall outside the regular session —
earliest 09:30, latest 15:59 America/New_York. `series-request.ts`'s session-minute
count is therefore an upper bound rather than an under-estimate. Recorded in that
file beside the assumption and in `MARKET-DATA-API.md` §10.

### Checks

`pnpm verify` passes with no database running (exit 0). `pnpm test:database`
passes against a real server — 154 tests, six files, including the backfill's
fixture-provider run, which now records `fixture`/`synthetic` in the ledger
honestly instead of being refused or mislabelled. `pnpm migrate` applied `0007`
to the local 48M-row store in under half a second; all 1,036 ledger rows read
back `alpaca`/`sip` with `sum(bar_count)` = 48,027,772.

---

## For the stakeholders — what this means, in plain terms

**Short version: the system can now hand over a stretch of price history and, in
the same breath, say where every number in it came from and how far it reaches.
It could not do either before today.**

### What was actually missing

We already had the prices — forty-eight million of them, one per minute per
company, sitting in the database since last week. What we did not have was a way
to _serve_ them. That sounds like plumbing, and mostly it is, except for one
genuinely awkward problem that this task existed to solve.

MarketPulse has a rule it will not bend: **no chart may show a number without
being able to say where the number came from.** That is not a nicety. Our data
supplier sells us two different things on the free plan — a complete record of
every US exchange for historical prices, and a single small exchange's view for
live prices — and a chart that mixes them without saying so is a chart that
quietly misleads a professional analyst about how much of the market they are
looking at.

The awkward part: when we designed the price table we deliberately **did not**
store that information on each individual price. Writing "this came from the
consolidated tape, fetched on Tuesday" onto forty-eight million rows means
storing the same short sentence forty-eight million times — gigabytes of disk
and money spent to repeat one constant. So the storage was cheap, and the bill
came due today: the thing that serves a chart has to state a fact the database
does not hold.

### What we did, and why

The instinct — and the plan we started from — was simply to **assert** it in the
serving code: _everything in this table came from the consolidated tape._ Free,
one line, and true as far as anyone knew.

Before relying on that, we wrote a check that would refuse to store anything
contradicting it. **The check immediately failed**, and it failed against our own
test suite: we have a "pretend data" mode, used so developers and our automated
tests can work without spending money on real market data, and it writes
_invented_ prices into a real database on purpose. Under the assertion we were
about to ship, those invented prices would have been served to a chart labelled
_"All US exchanges."_

That is the exact failure the product's rules are written to prevent, and it
would have shipped silently, because invented prices look exactly like real ones
on a screen.

So we spent the extra effort and **stored the fact properly** — but on the
summary row rather than on every price. Each company-and-interval has one
bookkeeping row saying "we hold January to September for this company"; adding
two small columns there costs about a thousand copies instead of forty-eight
million. Same honesty, roughly 0.002% of the cost. A chart drawn from pretend
data now says _"Generated test data. Not a market feed."_ by itself, with nobody
having to remember to add a warning label.

We also made the writing side refuse to mix two sources into one record. The day
we add the live feed — the very next epic — the system will stop and say so,
rather than quietly blending two different views of the market under one label.

### The second decision: "when did we get this?"

Every series also has to say when the data was fetched, so a user can tell
yesterday's prices from last month's. There is a trap here the project has
already fallen into once: if the serving code fills in _"just now"_, the answer
is always "fresh" and the field becomes permanently useless — it can never report
the one thing it exists to report.

We take the timestamp from when the data was actually written, and where a
request spans several fetches we report the **oldest** one. That errs towards
saying data is older than it might be, never fresher. For anything financial,
that is the right direction to be wrong in.

### What a user can see today

**Nothing new on screen — and that is the honest answer.** There are still no
charts. What exists now is the part that a chart cannot be built without: ask for
a company, an interval and a window, and get back the prices, their provenance,
and an explicit statement of how much of the window we actually cover.

That last part is worth a sentence, because it is a small piece of the product's
character. If you ask for prices through today and our store only reaches last
Friday, you do not get an error and you do not get a chart that silently stops
early. You get the data we have, plus a plain statement that the answer reaches
Friday and you asked for today. The screen will be able to say _"we have data
through 15:42"_ rather than leaving someone to guess whether the flat line at the
right-hand edge is a quiet market or a gap in our data.

### What this unlocks

This was the hard middle of Story 2.9. Directly downstream:

- **The next task** joins live data onto the end of stored data — and can only do
  that honestly because a series can now carry two sources and say which is
  which.
- **The task after that** puts this behind a web address.
- **Two tasks later, the first real price appears on a screen** — the first time
  MarketPulse shows a user something that actually happened in the market.

Further out, this is load-bearing for the feature the whole product is built
towards: the replay mode that reconstructs what was knowable at 11:07 on a
particular morning. That only means anything if every number can say where it
came from and when we learned it. As of today, they can.
