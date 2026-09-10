# Task 2.9.5 — The live tail, and the seam it has to label

**Status:** Complete — 2026-09-09
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

- ~~**Clamp the tail to what the plan will actually serve.** `ALPACA.md` §10's
  recency cliff keys on `end` **alone** and refuses the **whole** request rather
  than trimming it, so an unclamped mid-session fetch returns nothing at all.
  `alpacaServableEnd` already exists and is what the backfill uses; reuse it
  rather than writing a second definition of "16 minutes".~~ **This bullet's
  premise was false when it was written, and it had been false since Task 2.7.5.
  Read against the tree rather than against `ALPACA.md`, 2026-09-09.**

  An unclamped mid-session fetch does **not** return nothing, because nothing
  reaches the vendor unclamped: `alpaca-provider.ts` calls `alpacaServableEnd`
  itself before building its first request, reports the clamp as
  `coverage.covered`, and makes **no request at all** for a window lying
  entirely inside the withheld minutes. And `alpacaServableEnd` is not "what the
  backfill uses" — `grep` finds it in `alpaca-mapping.ts`, `alpaca-provider.ts`
  and their tests, and in no command. `pnpm backfill` and `pnpm bars` both get
  it transitively, through the seam.

  So the strongest form of _"reuse it rather than writing a second definition"_
  turned out to be **not calling it here at all**, and that is what shipped. Two
  things a second call site would have cost: `ALPACA_SIP_WITHHOLDING_MS` is a
  fact about one vendor's free plan, and importing it into a module read through
  the `MarketDataProvider` seam is invariant 7 going the wrong way for no gain;
  and §5's own reversal trigger says the clamp stops being necessary when Epic 3
  arrives — a clamp inside the provider disappears with the provider, where one
  here is something Epic 3 has to find and remove.

  What the read path owes instead is that the clamp be **visible in the answer**,
  and that is asserted either side of the boundary against a stub reporting a
  short window the way the real client does. The figure is unchanged and is
  quoted with its source and date: at a simulated 12:00 ET, a request for today's
  session clamps to `now − 16 min` and yields **134 of 390 minutes**
  (`BARS.md` §8.13, 2026-09-08). `MARKET-DATA-API.md` §5 rule 2 carries the same
  amendment, dated, because that is the live claim; this one is the record of a
  brief and is struck rather than rewritten.

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
  the end of this task is to keep what was just fetched: it consumed one of a
  finite number of requests per minute, and Task 2.9.8 is about not spending that
  quota twice on the same question. (**Wording corrected 2026-09-09**: this
  bullet said "it was paid for … not paying twice", which reads as money. It is
  not. See the correction under the stakeholder section below.) **`recordSeries` will
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

---

## What was built, 2026-09-09

`apps/backend/src/serve-series.ts` — `serveSeries()`, plus `tailWindow()`
exported beside it so the decision _"which window, or why none"_ can be read and
tested without a provider at all. `apps/backend/src/serve-series.test.ts` is 24
tests against a stub provider, no socket, no database, no credential.

Two things were **exported** from `market-bars.ts` rather than copied:
`STORED_BAR_ADJUSTMENT`, because a literal `"raw"` at the fetch call site would
be a second statement about what that table holds, and `sessionsInGap`, because
the read side asks the write side's question and a second copy would be a
threshold that disagreed about a half day.

### The four decisions this task had to take, and what each answered

**1. The absent `held`.** A symbol the ledger has no row for **fetches the
current session's tail and nothing earlier** — the same bound, from the same
session start, with no gap test because there is nothing to be contiguous with.
The tail is then the only source in the record. The alternative, serving
nothing, is cheaper by one request and answers a legitimate question with
silence; a security added to the universe before its first backfill now charts
today rather than charting nothing.

**2. The session bound has two independent arguments and they agree**, which is
why it shipped as one rule rather than as a budget. The cost argument is §5's.
The one that makes it structural is that `SeriesCoverage.covered` is **one**
half-open range: a stored half ending Friday and a tail starting Wednesday
cannot be described by one range without claiming Tuesday. So the contract
cannot express a discontiguous stitch, and the bound that keeps the cost down is
the same bound that keeps the claim honest. The test is `sessionsInGap` — the
calendar, not a threshold — so the overnight, a weekend and Labor Day are all
_no_ gap and a single skipped session is one.

**3. A half that contributed no bars contributes no source**, applied in **both**
directions. The brief named the empty stored half; the tail has the identical
problem, because a tail refused for its whole window comes back `ok` with zero
bars and putting it on the wire as a second feed is the same fiction wearing the
other hat. Neither half having bars returns the stored series unchanged, since
the domain type requires exactly one source and the store's is the one with a
ledger row behind it.

**4. `DEFAULT_BARS_DEADLINE_MS` is taken rather than replaced.**
`market-data-provider.ts` records _"Owner: Story 2.9, which is the story that
first puts a provider behind a route"_ against that constant — and its 3,000 ms
was derived for exactly this shape (a 5,000 ms browser budget less a 250–768 ms
deployed round trip). Taking the default deliberately is the answer to that
handover; inventing a second number here would have been the fork it warns
about. Its reversal trigger, a measured p99 near the number, belongs to Task
2.9.9.

### Three breaks made, and each went red

Per `CLAUDE.md` — a break that does not go red is equally evidence the break did
not land.

| Substitution                                    | What went red                                 |
| ----------------------------------------------- | --------------------------------------------- |
| `sessionsInGap(...) > 0` → `false`              | the two-session-gap test (1 failed)           |
| merge the empty stored half's provenance anyway | the "tail is the only source" test (1 failed) |
| drop the session bound from the tail's start    | four tests (1 failed → 4 failed)              |

The bound's negative assertion is paired with its positive: _"DOES fetch across
the overnight"_ is the same code path with one session less staleness, because a
negative that would hold however the bound were written is not evidence.

### What was NOT done, and who owns it

- **The route.** Task 2.9.6. This is a function; nothing is registered and no
  URL changed.
- **Storing the tail.** Refused by `recordSeries`, correctly — Epic 3's per-bar
  `feed` column is the story that can change it.
- **Bounding the metered request.** Task 2.9.8. Every chart window ending _now_
  is one vendor request on a cache miss, and the session bound caps its **size**
  rather than its **frequency**.

### Verification

`pnpm verify` passes with no database and no network (543 backend tests, 24 of
them new). `pnpm test:database` passes against a real server, 154 tests — run
because `market-bars.ts` changed and `database` is a required check.

---

## For the stakeholders — what this actually did, in plain terms

**Short version: charts can now reach today.**

Until this task, MarketPulse could only serve you prices it had already
collected overnight. That collection deliberately stops at the end of a
completed trading day, so a chart asking for "the last five days including now"
would have quietly ended at yesterday's closing bell — technically honest,
visibly wrong to anyone who expected to see this morning. This task closes that
last few hours.

> **Correction, 2026-09-09.** This section originally described fetching data
> from our supplier as _buying_ it, and talked about _the bill_. **That was a bad
> metaphor and it is wrong: we are on Alpaca's free plan and no money changes
> hands for market data.** What a request actually costs is **quota** — the free
> plan allows about 200 requests per minute (measured: 201, then the 201st is
> refused with a `429`), and the whole account shares that allowance. So "cheap"
> and "expensive" below now mean _how much of a shared, per-minute allowance a
> page load consumes_, which is a real constraint with real consequences — a page
> that burns the allowance makes the next request fail for everyone — but is not
> an invoice. The corrected wording follows. The one thing this project genuinely
> does pay for is **Azure hosting**, about $9/month, which has nothing to do with
> how many times we call the market-data supplier
> (`HOSTING.md`, _Cost, and the free-tier envelope_).

**How it works, without the machinery.** When you ask for a window, we first
take everything we already hold from our own database — which is instant and
where 99% of the data is. Then we look at whether your window runs past where
our records stop. If it does, and only if it does, we ask our data supplier for
the missing piece, and we join the two together into a single chart. If your
window is entirely in the past, we ask for nothing at all.

**Three decisions worth explaining, because they all spend a shared allowance or
spend trust.**

_We only ever request the missing piece, never the whole thing._ Our data
supplier allows a fixed number of requests per minute across the whole account,
and refuses the rest outright. The lazy version of this feature asks the supplier
for the entire window every time somebody opens a chart, which works perfectly
until enough people open charts at once, and then it does not work for anybody.
Most of the tests written for this task exist to prove we are asking for the
small piece, because a chart drawn from the wasteful version looks identical to a
chart drawn from the careful one — the difference is invisible until the
allowance runs out.

_We ask for at most today, never a backlog._ If our overnight collection has
fallen behind — say it missed a night — the naive version turns one page load
into a multi-day fetch. Worse, the amount of the allowance it consumes then
depends on how far behind we are rather than on what you asked for, which is the
kind of problem that grows quietly for months and then surfaces as an outage
under load. So the rule is: today's missing hours we will fetch on demand;
anything older is the overnight job's problem, and the chart tells you honestly
how far its data actually reaches rather than pretending. There is
a second reason this rule is right, and it is about honesty rather than money:
if we filled in today but skipped a missed day in the middle, the chart would
have a hole in it that it had no way to describe. Better to say "our data runs
to here" than to draw a line across a gap.

_Every chart says where each half of it came from._ This is the product
requirement we keep coming back to. The historical data we store comes from the
full US consolidated tape — every exchange. The live feed we will add in the
next phase comes from a single exchange, IEX, which is a much narrower view. A
chart stitched from both is genuinely part one and part the other, and it would
be misleading to put a single label under it. So a series now carries a _list_
of sources rather than one, the joining code physically cannot produce a chart
that forgets half its own history, and the display layer will be able to say
"part consolidated tape, part IEX". Today both halves happen to say the same
thing, and that is correct rather than a bug — the machinery is built and proven
before the second feed exists, so adding it next phase is a data change and not
a code change.

**And one thing that will happen and is not a failure.** Data suppliers go down,
rate-limit you, and reject your credentials at inconvenient moments. When that
happens while somebody has a chart open, the chart does **not** turn into an
error page. It shows everything we already had, and says how far it reaches —
"displaying data through 15:42". That is a deliberate product stance we have
written down since the beginning: in a system that talks to the outside world,
partial answers are normal states, not exceptions, and collapsing the whole
screen because one supplier hiccuped is the worst possible response.

**Where this leaves us.** Nothing on screen changed today; this is plumbing, and
it is the second-to-last piece before something visible. The next task turns
this into an actual web address you can open in a browser and see real prices
come back. Two tasks after that, the first real price appears on the securities
page — the first number this product has ever shown that came from an actual
market. The charts themselves follow in the same epic.

**The one cost we have created on purpose, stated plainly — and it is not a
financial one.** Every chart that runs up to _now_ consumes one of our supplier's
per-minute requests unless we have already answered that question recently. Task
2.9.8 is where we make sure we do not spend that allowance twice on the same
question — and because a trading day, once it has closed, can never change again,
that is one of the easiest and most complete caching opportunities this product
will ever have. If that task somehow cannot bound it, the decision to stitch
comes back to you rather than being quietly narrowed by us.
