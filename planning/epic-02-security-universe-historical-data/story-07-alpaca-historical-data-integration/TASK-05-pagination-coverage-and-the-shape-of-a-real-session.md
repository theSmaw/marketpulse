# Task 2.7.5 — Pagination, coverage, and what a real session actually contains

**Status:** Not started
**Story:** [2.7 Alpaca Historical Data Integration](STORY.md)
**Depends on:** Task 2.7.4

## Objective

Remove Task 2.7.3's deliberate throw: follow `next_page_token` to the end of a range, and make
`SeriesCoverage` tell the truth about what came back — including the three things that make a
real session smaller than the calendar says it should be.

## What the user can see when this lands

**Nothing new on screen.** The deployed chrome still reads `CONSOLIDATED TAPE`; there is still
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
3. **Minutes with no prints — and the number depends entirely on open decision 6's feed.**
   Measured 2026-09-07 over the thinnest equities in the universe: **99.7% mean coverage on the
   default (SIP) feed with a longest gap of 2 minutes**, against **82.8% and 15 minutes on
   `feed=iex`**. So on SIP an absent bar is _rare and mildly notable_; on IEX it is _ordinary_.
   **An absent bar is still never "missing"** in the error sense — but do not encode a threshold
   here until decision 6 is settled, because it is the difference between those two sentences.

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
  survives the measurement.** Two reasons it is still right: thin names legitimately vary
  (98.5–100%), and the count is **feed-dependent**, so a test asserting 390 would go red the day
  open decision 6 sends `feed=iex`. A test that fails on an ordinary day for a correct reason is
  still the worst kind
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
