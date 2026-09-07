# Task 2.7.5 — Pagination, coverage, and what a real IEX session actually contains

**Status:** Not started
**Story:** [2.7 Alpaca Historical Data Integration](STORY.md)
**Depends on:** Task 2.7.4

## Objective

Remove Task 2.7.3's deliberate throw: follow `next_page_token` to the end of a range, and make
`SeriesCoverage` tell the truth about what came back — including the three things that make a
real session smaller than the calendar says it should be.

## What the user can see when this lands

**Nothing new on screen.** The deployed chrome still reads `IEX`; there is still no chart.

What changes is that `pnpm bars NVDA --from 2026-08-01` returns a **month** rather than
throwing, which is what Story 2.8 needs before it can back-fill anything.

## Pagination

The loop itself is small. Five things around it are not, and each is a decision.

**A page ceiling.** `limit`'s documented maximum is 10,000 and Task 2.7.1 measured what this
plan actually serves. Request the ceiling rather than the default: at 1,000 a single security's
year of minute bars is ~99 requests against a 200/minute limit, and Story 2.8 multiplies that by
a hundred securities. The arithmetic is the reason, and it belongs in a comment beside the
constant so nobody "tidies" it back to the default.

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

1. **The withheld recent window.** The free plan withholds roughly the latest fifteen minutes.
   A range ending `now` therefore returns bars that stop short. **This is not an error and must
   never map onto one** — `PROVIDER.md` §7 says so explicitly — and it is the case most likely
   to be misread as a fault, because it looks exactly like a feed that has stopped.
2. **A market holiday or a half day.** An empty answer is a **successful** answer: `bars: []`,
   `covered: null`. `PROVIDER.md` §8.2 calls this the single most likely thing to be got wrong
   by whoever writes the first `if (bars.length === 0)`, and Story 2.12 showing a failure screen
   on Thanksgiving is the consequence.
3. **Minutes with no prints.** IEX is one venue. A thin name simply has no bar for many minutes,
   and Task 2.7.1 measured how many. **An absent bar is ordinary, not missing.**

`covered` must lie **inside** `requested` — `toBarSeries` refuses otherwise — so a vendor that
returns a bar outside the requested window is clipped rather than trusted, and the clip is
logged at `debug` rather than silently performed.

## Reconciling the generator, and the amendment this may force

`PROVIDER.md` §6.4's first number lands here: **does a full regular session actually yield 390
IEX minute bars?** Task 2.7.1 measured it; this task is where the consequence is written into
code and documents.

**If it does not — and it probably does not — then `market-session.ts`'s `minuteBars` is the
count of minutes in a session and not the count of bars to expect**, and three things follow:

- `CALENDAR.md` gets a dated amendment saying so, if Task 2.7.1 has not already made it
- **Nothing in this story asserts a bar count against `minuteBars`.** A test that expects 390
  real bars is a test that will fail on an ordinary day for a correct reason, which is the worst
  kind
- Story 2.8's gap handling is sized against the **difference**, and that difference is a number
  recorded in `ALPACA.md` rather than a shrug. Getting it wrong makes every absent bar look like
  a fault, which is an alerting problem rather than a data one

What this task _does_ assert is the relationship the fixture corpus can hold honestly: a real
session's bars all fall inside the session's bounds, are strictly ascending, and are no more
numerous than `minuteBars`. That last one is a genuine invariant — more bars than minutes means
the timestamp mapping or the timeframe is wrong — and it is the assertion worth having in place
of a count.

## Work

- The pagination loop, its ceiling, its page bound and its single composed signal
- The four recorded multi-page fixtures — a month of minute bars is several pages and is the
  one to record first
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
