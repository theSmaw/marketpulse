# Task 2.7.5 — Pagination, coverage, and what a real session actually contains

**Status:** Complete (2026-09-07)
**Story:** [2.7 Alpaca Historical Data Integration](STORY.md)
**Depends on:** Task 2.7.4

## Objective

Remove Task 2.7.3's deliberate throw: follow `next_page_token` to the end of a range, and make
`SeriesCoverage` tell the truth about what came back — including the three things that make a
real session smaller than the calendar says it should be.

## What the user can see when this lands

**Nothing new on screen.** The deployed chrome still reads `ALL US EXCHANGES`; there is still
no chart.

What changes is that `pnpm bars` can be asked for a **month** and returns one rather than
throwing, which is what Story 2.8 needs before it can back-fill anything.

> **AMENDED 2026-09-07 by Task 2.7.3: that flag does not exist, and adding it is this task's.**
> The shipped interface is positional — `pnpm bars <SYMBOL> [1m|1d] [raw|split-adjusted]` — and
> it fetches **the most recent complete trading session** for `1m` and the last 30 sessions for
> `1d`, both derived from the trading calendar rather than from arithmetic on today's date.
> There is no `--from`.
>
> That was deliberate rather than an omission: a range argument is only useful once a range can
> span pages, and until this task one that did **throws**. So this task adds the range argument
> along with the loop that makes it meaningful — and it inherits one shape decision from
> `fetch-bars.ts` worth keeping, which is that **`windowFor` gives the two timeframes different
> windows**, because a daily bar is stamped at **midnight ET** and a session-shaped window
> therefore contains none of them.

## Pagination

The loop itself is small. Five things around it are not, and each is a decision.

**A page ceiling — MEASURED 2026-09-07: the documented 10,000 is exact.** `limit=10000` returns
10,000 bars; `limit=10001` and `limit=25000` are both a clean **`400`** rather than a silent
clamp, so the ceiling cannot be exceeded by accident. `next_page_token` is an opaque base64
string, and **on the last page the field is PRESENT and `null`** rather than omitted — walked to
exhaustion over five pages. A loop testing for the key's _absence_ would never terminate; prefer
a nullish check that handles both. Request the ceiling rather than the default: at 1,000 a single security's
year of minute bars is ~99 requests against a 200/minute limit, and Story 2.8 multiplies that by
a hundred securities. The arithmetic is the reason, and it belongs in a comment beside the
constant so nobody "tidies" it back to the default.

> **Already shipped by Task 2.7.3** — `ALPACA_MAX_LIMIT = 10_000` in `alpaca-mapping.ts`, sent
> on every request, with that arithmetic in the comment beside it. Nothing to build here; what
> this task adds is the loop that makes a second page possible at all. Note the ceiling is also
> what makes 2.7.3's _"every request stays inside one page"_ an arithmetic fact rather than a
> hope: a regular session is 390 bars against a 10,000 ceiling, so a single-session window
> **cannot** paginate.

**A bound on the number of pages, and a loud failure when it is hit.** A `next_page_token` that
never becomes null is an infinite loop that looks like a slow request, and it is the one failure
mode in this task that consumes a rate limit while producing nothing. Bound it, derive the bound
from the requested range rather than picking a round number — the maximum bars a range can
contain is computable from `market-session.ts` and the timeframe — and **throw** when it is
exceeded, because a token loop is us or the vendor behaving impossibly and `PROVIDER.md` §8.5's
line puts both on the throw side.

**The deadline spans the whole fetch, not each page.** `DEFAULT_BARS_DEADLINE_MS` is what the
caller was promised, and a per-page deadline turns three seconds into three seconds times
however many pages the vendor decides to use — the same lie a retry inside the transport tells,
arriving through a different door. One `AbortSignal`, composed once, passed to every page.

**What a deadline expiring mid-pagination returns — and the tempting answer is rejected.** Two
shapes:

- **A partial `ok`**, with `covered` clipped to the bars that arrived. Truthful in one sense and
  useful to a resumable backfill.
- **`timeout`**, discarding the pages already fetched. **Chosen.**

The argument is that a clipped `covered` is **indistinguishable from "the vendor had nothing
after this point"**, which is precisely the distinction Story 2.8's backfill has to make: one
means resume, the other means done, and a caller cannot tell them apart from a `BarSeries`. A
member that is usually right and occasionally silently wrong is worse than one that is blunt —
`PROVIDER.md` §8.1's own argument for merging the three `unauthorised` causes, applied to a
success. The reversal trigger is Story 2.8 wanting resumable partial fetches, at which point the
right shape is a new outcome member carrying a resume point, not a widened `ok`.

**An abort mid-pagination is `aborted`**, unchanged, and never a partial anything — Task 1.12.3's
rule that a caller's teardown is not a fact about the world at all.

**Provenance stays one source across every page**, because it is one fetch of one symbol from
one feed at one adjustment. `retrievedAt` is stamped **once, when the fetch begins**, and that is
the decision rather than the obvious one: stamping at completion makes a slow paginated fetch
claim a freshness it does not have for its earliest bars, and the field's job is to report
staleness. `barCount` is the total across pages, and `toBarSeries` already refuses a series whose
sources' counts do not sum to `bars.length` — which is exactly the check a pagination bug trips.

## Coverage: the three reasons a real session is smaller than the calendar says

`SeriesCoverage` distinguishes what was **requested** from what is **covered**, and
`PROVIDER.md` §2.5 puts it on the series for this reason. Three producers, all real, all
measured by Task 2.7.1:

1. **The withheld recent window — and THIS TASK OWES THE MEASUREMENT, because Task 2.7.1 could
   not take it.** That task's probe ran at 06:59 UTC on Labor Day with the market shut, so its
   `0 bars` means nothing; `ALPACA.md` §10 records it as explicitly unmeasured. **Re-take it
   during a regular session**: request a range ending `now` and record where the bars actually
   stop. Two things are known already — the documented figure is roughly fifteen minutes, and a
   `feed=sip` request for recent data is refused outright with `403 subscription does not permit
querying recent SIP data`, which independently confirms _some_ recency restriction is
   enforced. **This is not an error and must never map onto one** — `PROVIDER.md` §7 says so
   explicitly — and it is the case most likely to be misread as a fault, because it looks
   exactly like a feed that has stopped.
2. **A market holiday or a half day.** An empty answer is a **successful** answer: `bars: []`,
   `covered: null`. `PROVIDER.md` §8.2 calls this the single most likely thing to be got wrong
   by whoever writes the first `if (bars.length === 0)`, and Story 2.12 showing a failure screen
   on Thanksgiving is the consequence.
3. **Minutes with no prints.** ~~The number depends entirely on open decision 6's feed~~ —
   **decision 6 is SETTLED (`sip`, Task 2.7.3) and DEPLOYED (Task 2.7.4), so this is no longer
   conditional.** Measured 2026-09-07 over the thinnest equities in the universe: **99.7% mean
   coverage on SIP with a longest gap of 2 minutes**, against **82.8% and 15 minutes on
   `feed=iex`**. This provider sends `feed=sip` explicitly and unconditionally, so **the SIP
   number is the one this task builds against**: an absent bar is _rare and mildly notable_
   rather than ordinary.

   **An absent bar is still never "missing"** in the error sense. The instruction that used to
   read _"do not encode a threshold until decision 6 is settled"_ is now spent, and what
   replaces it is narrower rather than an unlock: **if a threshold is encoded, it is SIP's, and
   it must not be reused by Epic 3**, whose live stream is a _sibling_ provider entitled only to
   IEX and whose density is a different number by a factor this task has measured.

`covered` must lie **inside** `requested` — `toBarSeries` refuses otherwise — so a vendor that
returns a bar outside the requested window is clipped rather than trusted, and the clip is
logged at `debug` rather than silently performed.

> **What Task 2.7.3 shipped, and it is exactly one line for this task to change.**
> `alpaca-mapping.ts` sets `covered: bars.length === 0 ? null : request.range` — the whole
> requested window whenever anything came back. That is `fixture-provider.ts`'s convention
> (_"the window this provider ANSWERED FOR, not the span of the bars"_) and it is right for
> **producer 3**: a thin name whose last print was 15:42 was still covered to the close, and
> reading `covered` as the span of the bars is what produces the false sentence _"we have data
> through 15:42"_.
>
> **It is wrong for producer 1**, which is why that measurement is this task's. Under the
> withheld recent window the vendor **structurally cannot** answer for the last ~15 minutes, so
> a `covered` reaching `requested.end` is a claim we have no basis for — the one case where the
> optimistic reading is a lie rather than a convenience. Narrowing it is the change; keeping
> producer 3's behaviour while making producer 1 honest is the thing to get right, and the two
> look identical from inside a `BarSeries` unless the recency is known.
>
> **And one thing not to disturb while doing it:** `toAlpacaQuery` converts our half-open `end`
> to the vendor's inclusive one by subtracting **one millisecond** — the exact conversion, not
> an approximation — so a pagination loop that re-derives `end` per page must go through that
> function rather than reconstructing a bound of its own. A second copy of that subtraction is
> a duplicated bar at a seam, which is the corruption this whole section exists to prevent.

## Reconciling the generator, and the amendment this may force

`PROVIDER.md` §6.4's first number lands here: **does a full regular session actually yield 390
IEX minute bars?** Task 2.7.1 measured it; this task is where the consequence is written into
code and documents.

**MEASURED 2026-09-07, and the prediction was wrong: it DOES.** A liquid name returned exactly
**390** bars across five ordinary sessions, and the day after Thanksgiving 2025 returned exactly
**210** — both matching the shipped calendar to the bar. `PROVIDER.md` §6.4's _"probably not"_
was sound reasoning applied to the wrong feed: on `feed=iex` the same thin names run 43–99%,
but the plan serves SIP for history. So:

- **`CALENDAR.md` needed no correction and got a dated confirmation instead** — Task 2.7.1 made
  it. `minuteBars` **is** a usable bar count for a liquid name on the default feed, which is the
  opposite of what this section was written expecting
- **Nothing in this story asserts a real bar count against `minuteBars` anyway, and that rule
  survives the measurement — but ONE of its two reasons expired at Task 2.7.4 and must be
  re-stated rather than left standing.** The reason that stands: thin names legitimately vary
  (98.5–100%), so a test asserting 390 fails on an ordinary day for a correct reason, which is
  the worst kind. ~~The reason that expired: _"a test asserting 390 would go red the day open
  decision 6 sends `feed=iex`"_~~ — **decision 6 is settled as `sip` and this provider sends it
  unconditionally, so that day cannot arrive for this client.**

  This is the mirror of the trap Task 2.7.3 found in `CALENDAR.md` §2.4, and it is worth naming
  because it is the harder direction to spot: **a rule justified by a condition that can no
  longer occur is a rule the next reader deletes** — correctly, on the argument as written, and
  wrongly, on the merits. What replaces it and is still live: the count is **feed-dependent**,
  and **Epic 3's live stream declares `iex`**, so a bar-count assertion written here is a
  landmine for the sibling provider rather than for this one

- Story 2.8's gap handling is sized against the **measured density in `ALPACA.md` §5**, which is
  now a number rather than a shrug — and a much smaller number than this task expected

What this task _does_ assert is the relationship the fixture corpus can hold honestly: a real
session's bars all fall inside the session's bounds, are strictly ascending, and are no more
numerous than `minuteBars`. That last one is a genuine invariant — more bars than minutes means
the timestamp mapping or the timeframe is wrong — and it is the assertion worth having in place
of a count.

## Work

- The pagination loop, its ceiling, its page bound and its single composed signal
- The range argument on `pnpm bars`, which does not exist yet — see the amendment above
- The four recorded multi-page fixtures — a month of minute bars is several pages and is the
  one to record first. **One paginated body is already recorded**:
  `fixtures/alpaca/nvda-1min-paginated.json`, deliberately taken at `limit=100` so a
  `next_page_token` appears in 20 KB rather than 200 KB. It proves the **token** is handled and
  proves nothing about a **walk**, so it does not substitute for the multi-page fixtures — and
  it should not be re-recorded at the shipped ceiling, because its whole job is being small
- Coverage clipping, and tests for all three narrowing producers against recorded bodies
- The empty-answer path, asserted as `ok` and not as a failure, on a real holiday's response
- The deadline-mid-pagination decision, with its rejected alternative in a comment
- Two deliberate breaks, each seen to fail and reverted: the loop stopping after one page, and
  `retrievedAt` re-stamped per page

## Done when

- A month of minute bars for a liquid name comes back complete, from a real key, through
  `pnpm bars`
- Every pagination and coverage test runs offline against recorded bodies — criterion 7
- A holiday returns `ok` with an empty series; a range ending `now` returns a `covered` that
  stops short of `requested` and says so
- No test anywhere asserts a real bar count against `minuteBars`
- `pnpm verify` is exit 0 with no network

## Notes

Pagination looks like the least interesting thing in this story and it contains its most
dangerous failure: a loop that stops early produces a **well-formed, ascending, correctly
provenanced series that is missing data**. Nothing downstream can detect it — not
`toBarSeries`'s five checks, not a chart, not an anomaly calculation, which will happily compute
a percentile over the bars it was given. It is the same class as Task 2.7.3's silent truncation,
which is why that task threw rather than guessed, and it is why the page bound fails loudly
instead of returning what it has.

---

## What was done, and what it measured (2026-09-07)

Task 2.7.3's throw is gone: the client walks `next_page_token` to the end of a range, and
`pnpm bars NVDA 1m --from 2026-08-03 --to 2026-09-04` returns **22,952 bars across three
pages** from a real key. Five new tests on the walk, four on the withheld window, three
recorded fixtures, and **no dependency, no lockfile change and no new `verify` step**.

### The finding that inverted this task's brief

**The withheld recent window does not produce a short answer. It refuses the whole request.**

This task's coverage section was written expecting the vendor to answer a recent range short,
so that `covered` could be clipped to what arrived. Measured against the live API — and the
market being shut on Labor Day did **not** block it, because what is measurable is the API's
refusal rather than the presence of prints:

| `end`                               | Status    |
| ----------------------------------- | --------- |
| 30 / 20 / 18 / 17 / 16 / 15 min ago | **`200`** |
| 14 / 13 / 12 / 10 min ago           | **`403`** |

A **cliff at exactly 15 minutes**, keyed on **`end` alone** — `start` inside the window is
irrelevant — applying to **daily as well as minute** bars, and `feed=iex` is not subject to it
at all. A window from Friday's open to now, containing 6½ hours of perfectly available data,
is a flat `403` with **nothing in it**.

**So there is no short answer to clip, and the handling moved before the request.**
`alpacaServableEnd` clamps `end` to `now − 16 min` and the clamp is reported as
`coverage.covered`, which is exactly what `SeriesCoverage` was designed to carry. The two
alternatives are rejected on `PROVIDER.md`'s own rules rather than on taste: mapping it to an
error is forbidden by §7 outright, and refusing at construction moves a vendor-plan property
into every call site that §1 exists to keep them from learning. **The naïve backfill — _"from
the last bar I stored, to now"_ — is precisely the refused shape**, so without the clamp Story
2.8 would store nothing on every run.

The extra minute over the measured 15 is margin, and the asymmetry is the argument: the
boundary is _exact_, so seconds of clock skew decide between an answer and a total refusal —
the margin costs at most one bar where the wrong side costs the whole request.

### The number that resizes Story 2.8

Driven through the shipped client at its `limit=10000`:

| Range       | Sessions | Pages |   Bars | Regular-hours |     Ratio |     Wall |
| ----------- | -------: | ----: | -----: | ------------: | --------: | -------: |
| one session |        1 |     1 |    390 |           390 | **1.00×** | 1,030 ms |
| 10 sessions |       10 |     1 |  8,948 |         3,900 | **2.29×** | 1,042 ms |
| 25 sessions |       25 |     3 | 22,952 |         9,750 | **2.35×** | 1,448 ms |
| 47 sessions |       47 |     5 | 43,515 |        18,330 | **2.37×** | 2,170 ms |

**A window spanning a night collects extended-hours bars, at ~2.35×** — 57.5% of a month's
bars. The regular-hours column is `market-session.ts`'s `minuteBars` summed over the sessions
and the walk matched it **exactly** (9,750 of 22,952 fall inside a session), so the calendar is
right and the _window shape_ is what differs. That turns `ALPACA.md` §4's _"217 bars on a
210-minute half day"_ from a curiosity into a sizing fact: `UNIVERSE.md` §8's ~1.18 GB/year
assumes 390 a session, and span-shaped windows would store **~2.8 GB/year**. **A backfill
should ask per SESSION**, which returns exactly `minuteBars` — the 1.00× row.

**And a 5-page walk is 72% of `DEFAULT_BARS_DEADLINE_MS`.** That default was derived for a
_single_ request against the browser's 5-second budget and does not survive pagination, so a
paginated caller must pass its own `deadlineMs`. One that forgets gets a `timeout`, which is
loud rather than silent, so this is a handover rather than a hazard.

### The page bound, and what it is actually for

Derived from the range rather than picked: wall-clock intervals in the window, over the page
ceiling. **A provable upper bound rather than a modelled one** — the tighter calendar-based
bound (`minuteBars` summed) is _wrong_, because extended-hours prints exceed it by 2.35×, and
a bound a correct answer can exceed throws on good data.

Its value turned out not to be termination. Removing it, a token loop is stopped by the
**deadline** at 3,024 ms anyway — so what the bound actually buys is the **rate limit**: it
stops at 2–3 requests rather than burning as many as fit in three seconds.

### Two things it caught in my own work, both by a domain type rather than an assertion

**`toTimeRange` refused a reversed range** when the whole window is inside the withheld window
— the clamped end is then earlier than the start. The coverage range is computed lazily now,
only when there are bars, which is also the correct shape: an empty series has no coverage to
describe. Found by a test rather than by reading.

**`toBarSeries` refused a bar outside the covered range** when a walk test still used the
narrow request while its fixture pages were stamped against a wide one. Task 2.7.3 recorded
this exact class — the domain type catching a mistake before any assertion ran.

### A testing constraint anyone recording more fixtures needs

**The page bound couples page size to range, so a fixture recorded at a reduced page size is
only replayable against a range wide enough to justify its page count.** The three recorded
pages are a real walk of 2026-09-03's session at `limit=150` — 150 + 150 + 90 = **390**, the
calendar's number — in 78 KB rather than the ~2.7 MB three pages at the shipped ceiling would
cost. Replayed against that session's own range the shipped client throws, correctly, because
390 bars cannot span three pages at 10,000 a page. The alternative was making the bound
injectable, which is test-shaped API on shipped code and is what Task 1.10.5 refused with
`MIN_PORT`.

### Four deliberate breaks, each seen to fail and reverted

| Break                                  | Result                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------- |
| The loop stops after one page          | **7 red** across the walk, provenance, stamping and bound tests        |
| `retrievedAt` re-stamped at completion | 1 red, naming the start-of-walk property                               |
| No clamp on the withheld window        | 3 red — the clamp, the coverage report and the no-request case         |
| No page bound                          | 1 red, and it took 3,024 ms — the deadline, not the bound, stopping it |

**And a fifth thing broke that was not a deliberate break: I destroyed my own work.** Reverting
break 2 with `git checkout <file>` wiped every uncommitted change on both source files, because
the whole task lived uncommitted. It was fully recoverable — the test files survived and
specified the API exactly — and the rule is worth more than the hour: **the revert of a
deliberate break is the inverse edit, never a checkout of a file whose task is uncommitted.**
The remaining breaks were run against a committed tree, where `git stash` _is_ the inverse.

### Figures

`pnpm verify` **exit 0**; `pnpm test` **694** (206 + 305 + 183); `test:process` 14. **Criterion
7 checked with a control**: all 305 backend tests pass with every off-machine socket refused,
and a probe against `data.alpaca.markets` was blocked in the same run, so the blocker was
proved to block. `pnpm bars` exits 1 on a refusal and 0 on a success, a single session is still
exactly 390 bars, and a range naming no trading day is a **refusal** rather than a silently
empty answer.

---

## For the stakeholders — in plain language

**The market-data reader can now fetch a month at a time instead of a single day, and it
learned something about our data supplier that changes how we will store prices.**

Last cycle the reader could ask for one trading session and no more. Suppliers hand back long
answers in chunks — like pages of a book — and ours refuses to send more than ten thousand
prices at once. A month is more than that. Until now the reader deliberately **stopped and
complained** when it saw there was a second page, rather than quietly returning the first one
and pretending that was everything. That was the right call: a partial answer that looks
complete is the most dangerous thing this system could produce, because nothing downstream can
tell it is missing anything. This cycle it turns the pages properly. Asking for a month now
returns **22,952 prices across three pages in about a second and a half.**

**We also found a rule of our supplier's that would have quietly broken the next piece of
work.** Our plan does not let us see the last quarter of an hour of market activity. We
expected that to mean "you get everything up to fifteen minutes ago" — instead, **asking for
anything that runs up to _now_ is refused outright, and we get nothing at all**, including the
six-and-a-half hours of the day that were perfectly available. That matters because the
obvious way to keep our database up to date is to ask "give me everything since the last price
I stored, up to now" — which is exactly the request that gets refused. Every single time. We
would have stored nothing and the failure would have looked like a supplier outage.

The reader now trims the request back to what the supplier will actually serve, and — this is
the important half — **it says on the answer that it did so.** The data carries both what we
asked for and what we actually got, so nothing downstream can mistake "we stopped fifteen
minutes short" for "the market went quiet". Being honest about the edges of what we know is one
of this product's founding rules, and this is the first time that rule has been load-bearing on
real data.

**And one measurement will change a budget.** We had estimated storage assuming 390 prices per
company per day — the length of a normal trading session. Asking for a month in one go actually
returns **2.35 times that**, because the request spans the overnight hours and our supplier
includes early-morning and evening trading. Over a year that is the difference between roughly
1.2 GB and 2.8 GB of prices. The fix is free and we now know it in advance: ask day by day
rather than in one long span, which returns exactly the expected 390. Finding this now costs a
sentence in a design document; finding it after we had stored a year of prices would have cost
a rebuild.

**What you can see on screen: still nothing new.** The website reads `ALL US EXCHANGES` as it
did this morning, and there is still no chart, no price and no table of market data. This work
is plumbing, and the honest statement is that the payoff is two chunks of work away — the next
one stores prices in the database, and the one after that draws them.

**One thing worth saying about how this went.** Partway through I broke my own work with a
careless command and lost about an hour re-doing it. Nothing shipped in a bad state and the
tests I had already written meant the rebuild was mechanical rather than guesswork, but it is
recorded in the engineering notes rather than glossed over, along with the rule that prevents
it happening again.
