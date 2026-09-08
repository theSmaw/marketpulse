# Task 2.8.6 — The backfill: session-shaped windows, pacing, and resuming

**Status:** Not started
**Story:** [2.8 Historical Bar Ingestion, Storage & Backfill](STORY.md)
**Depends on:** Task 2.8.5

## Objective

`pnpm backfill` — the command that fills the store. It is the first thing in this repository
that runs for tens of minutes, spends a metered budget, and can be interrupted halfway.

Three properties, and each of them is a decision rather than an implementation:

1. **Session-shaped requests**, because a span-shaped one stores 2.35× the data and 57.5% of it
   is extended hours the calendar says should not be there.
2. **Pacing**, because Task 2.7.7 measured that retry helps one caller and does not help a
   crowd, and the fix is asking less often.
3. **Resumability**, because a backfill that cannot be resumed is a backfill that gets run from
   scratch repeatedly.

## What the user can see when this lands

**Nothing on screen**, and this is the task after which the database holds real market history.
`/securities` renders the same page it did after Task 2.8.2.

What can be **shown** rather than seen: the command's own progress output, and a row count. That
is the honest demonstration for this task, and Task 2.8.9 is the one that puts it on a page.

## The window shape, which is the single most expensive thing to get wrong

Task 2.7.5 measured this and Story 2.8's own amendment carries the table. Restated because it is
the instruction most likely to be simplified away:

| Range       | Sessions | Pages |   Bars | Regular-hours |     Ratio |
| ----------- | -------: | ----: | -----: | ------------: | --------: |
| one session |        1 |     1 |    390 |           390 | **1.00×** |
| 25 sessions |       25 |     3 | 22,952 |         9,750 | **2.35×** |
| 47 sessions |       47 |     5 | 43,515 |        18,330 | **2.37×** |

`[first.open, last.close)` spans the nights in between and SIP serves pre- and post-market
prints across them. The regular-hours column is `minuteBars` summed over the sessions and the
walk matched it **exactly**, so the calendar is right and the **window shape** is what differs.

**Request per session, `[open, close)` per day, measured at exactly 1.00×.** And note the trap
one level up: a reader who fixes this by sending explicit **instants** rather than bare dates
has **not** fixed it — that is a different trap (bare dates leak extended hours too, 217 bars on
a 210-minute half day) and fixing one does nothing for the other.

**Daily bars need a different window and this is the third trap.** A daily bar is stamped at
**midnight ET**, hours before the session opens, so a `1Day` request framed on `[open, close)`
contains **no daily bar at all** and returns a perfectly well-formed empty answer. `pnpm bars
NVDA 1d` printed _"no bars"_ until `fetch-bars.ts` gave the two timeframes different windows.
`windowFor` already exists and this command must use it rather than reconstructing a bound.

**And the fourth: `end` is inclusive on the vendor's side and half-open on ours.** `toAlpacaQuery`
converts by subtracting **one millisecond** — the exact conversion rather than an approximation
— and a second copy of that subtraction anywhere is a **duplicated bar at every seam**, tiled
across the whole backfill. Go through that function.

## The batch, which is where the rate limit stops mattering

**The 200/min limit is per REQUEST, not per symbol** — measured, 203 requests of 50 symbols each
against the same ceiling as 201 single-symbol requests, i.e. ~10,150 symbol-fetches a minute.
**So the whole universe is one request per bar-window.**

That inverts the obvious design. The naïve loop is `for each symbol { for each session { fetch }
}`, which is ~101 × 251 ≈ **25,350 requests** and over two hours at the limit. The right loop is `for each
session { fetch all symbols }`, which is **~1,004 requests** for a year of minute bars across the
whole universe — four pages a session, measured (Task 2.8.5) — and the multi-symbol fetch is ~~the thing `MarketDataProvider` deliberately does
not have~~ **`fetchManyBars`, a required member of `MarketDataProvider` since Task 2.8.5 shipped it**.

**Building the batch is Task 2.8.5's** — it was this task's until 2026-09-08, when a probe
found that `limit` is a **total row budget across all symbols** and a symbol can be **absent
from a page entirely while having a full session of data**. That makes premature conclusion
about a symbol a silent, well-formed lie, which is a different failure from this task's and
earns its own task. What this task inherits is the method and the arithmetic.

**Watch the page ceiling against the batch — measured 2026-09-08.** 101 securities × 390 bars
is **39,390 rows for one session** against the shipped 10,000-row `limit`, so **one session for
the whole universe is 4 pages**, where a single symbol is one. A year is ~251 sessions × 4 ≈
**1,004 requests**, which reconciles with 9.84M rows ÷ 10,000 ≈ **985 pages**. So batching
trades requests for pages, and the walk is where the deadline goes:
**a paginated caller must pass its own `deadlineMs`**, because a 5-page walk is 72% of
`DEFAULT_BARS_DEADLINE_MS` and that default was derived for a single request against a browser's
budget.

~~**And what a retry re-spends**: the wrapper composes around the interface, so a retry re-runs
the walk **from page 1**. A batch of a hundred symbols retried once is a hundred times the page
count, not one request. That is the argument for the batch being modest rather than maximal —
measure where the knee is rather than assuming 100 is right.~~
**Falsified 2026-09-08 by Task 2.8.5 — see this file's last amendment before acting on it.** It
is arithmetic about a batch of _independent fetches_; the batch that shipped is **one walk**, and
a retried walk costs its own page count **once**. Its conclusion is the dangerous half: a modest
batch is the opposite of what the measurement supports, and building one means building the
chunking `alpaca-mapping.ts` explicitly says not to build.

## Pacing

Task 2.7.7's measurement is the strongest evidence in the repository for this being here rather
than in the provider:

| Burst of 320                |    `ok` | HTTP requests |
| --------------------------- | ------: | ------------: |
| bare provider (the control) |      91 |       **320** |
| through the wrapper, 3 s    | **206** |       **606** |
| through the wrapper, 20 s   | **263** |     **1,473** |

**Retry helps one caller and does not help a crowd.** At the 20-second deadline the wrapper
sustained **73 req/s against a 3.23/s refill** and still left 57 calls refused. **What fixes it
is asking less often.**

So the pacer is this command's, and three measured facts shape it:

- **The limiter is a token bucket refilling at ~3.23/s**, not a punished sixty-second window. So
  one `429` costs one request rather than a minute, and a backoff has to outlast a token
  (~310 ms) rather than a minute.
- **The budget is per API**, not per key or per path. A second `data` endpoint competes for the
  same tokens; the **trading** API is separate, which is why `pnpm universe:check` costs this
  command nothing.
- **No `429` carried a `Retry-After`** — not one of 113 — so pacing runs on our own schedule.

**Serial with a small delay is the recommendation**, and the reason is the table above rather
than caution: concurrency buys nothing against a 3.23/s refill and costs the failure mode where
a hundred workers each retry a walk from page 1. Whatever is built, **the pacer is a property of
this command and not of the provider**, per `PROVIDER.md` §8.8.

## Resuming

**The resume point is `covered.end` and never `requested.end`.** Task 2.7.5 measured that a
request ending at `now` is a flat `403` — `subscription does not permit querying recent SIP
data` — keyed on `end` **alone**, refusing the **whole** request rather than answering
partially, and applying to daily as well as minute. `alpacaServableEnd` clamps to `now − 16 min`
and reports the clamp as `coverage.covered`. So a backfill that bookmarks what it asked for
either re-fetches or leaves a permanent 16-minute hole.

The other half is Task 2.8.4's one-range ledger: **the walk must be monotonic**, or the ledger
claims a range it does not hold. Decide the direction and say why. Backwards from the present is
the useful order — recent history is what every chart opens on, so an interrupted backfill leaves
the product more useful than a forwards one does — and it means the ledger's range grows from one
end, which is what makes one row enough.

**Interruption is a real case rather than a hypothetical**, because this runs for tens of
minutes on a laptop over the public internet — and Task 1.11.7 already produced a 65-second
"outage" that turned out to be the laptop rather than the environment. `SIGINT` should finish the session in flight, write its ledger row, and stop — which is
`index.ts`'s drain shape applied to a command, and it is what makes criterion 3 a property rather
than a hope. Killing it mid-transaction is also fine and must be tested: Postgres rolls the
session back, the ledger does not move, and the next run re-fetches one session.

## Progress

It runs long enough that silence is indistinguishable from a hang, so it has to say what it is
doing. `pnpm migrate` and `pnpm universe` set the
shape — three counters and a line per event — and this needs one more thing they do not: an
**estimate**, because a command with no end in sight is one people kill and restart.

Per session or per batch: what was fetched, how many bars, how many written, how many already
held, and how far through. **The counters are the finding, not the ceremony** — `0 inserted, N
already held` on a re-run is the line that says the store and the vendor agree, which is
criterion 2 visible without a query.

## Work

- `scripts/run-backfill.mjs` over `apps/backend/src/backfill.ts` — the shape `pnpm migrate` and
  `pnpm universe` established: the wrapper holds the name, the built-output guard and **the exit
  code**; the mechanism is in `src/` so it is typechecked, linted and testable
- `backfill` checked against `pnpm help -a` before it is claimed, with the detection validated
  in the same run against known built-ins — the check that failed its own control at Task 2.7.8
- ~~The multi-symbol batch on `MarketDataProvider`, returning a `BarsResult` **per symbol**~~
  — **built by Task 2.8.5.** What is left here is _calling_ it, and the four things that
  inherits are in this file's last amendment
- The session walk, both timeframes, through `windowFor` and `toAlpacaQuery`
- The pacer, with its measured constants and the arithmetic in a comment beside them
- Resume from the ledger; `SIGINT` finishing the session in flight
- **The daily walk's lower bound is `2024-01-01`, a constant with a reason** (Task 2.8.1): the
  calendar covers 2024–2028 and **refuses** outside it, so a backfill asked for more history
  than the calendar covers must **refuse in the same shape** rather than silently starting at the
  bound — a short answer shaped like a right one is what ADR 0017 decision 9 rejected. Both
  timeframes are bounded by the same calendar, which is what leaves Task 2.8.7 with no special
  case
- **A trap in the calendar's own API, met while measuring this**: `marketSessionsBetween`
  returns **session objects, not dates**, and feeding one back into `marketSessionOn` throws a
  `MarketCalendarRangeError` whose message renders `[object Object]`. The refusal is correct and
  the message is not; the walk is the first thing to compose those two functions in anger
- Arguments: which symbols, which timeframe, how far back — and **`status = 'active'` is the
  default and is a decision**, not a filter that happened. `UNIVERSE.md` §12.2 puts this reader
  on the filtering side, on Story 2.7's argument that a metered API is not spent on a security
  nobody tracks. **Story 2.9's read path and Epic 13's replay must NOT filter**, and that
  asymmetry is the whole cost of not having a `deleted_at` column
- Offline tests against recorded fixtures for the walk, the windows and the resume; the pacer
  tested against a fake clock rather than by waiting
- Deliberate breaks, each seen to fail and reverted: a span-shaped window (which should show up
  as a bar count that is not `minuteBars`), the resume point from `requested.end`, and the daily
  window framed on the session

## Done when

- A single security's year of minute bars completes against a real key, resumes correctly after
  a `SIGINT` and after a `kill -9`, and a re-run reports everything already held
- A daily request below 2024-01-01 refuses rather than clamping, and says which range it has
- A session's bar count for a liquid name is exactly `minuteBars` — **not asserted in a test**,
  for the reason Task 2.7.5 records: thin names legitimately vary between 98.5% and 100%, so an
  assertion on 390 fails on an ordinary day for a correct reason
- The whole universe for one session is one batch and a small number of pages, measured
- `pnpm verify` is exit 0 with no network and no database — this command is in neither chain, for
  the reason `pnpm bars` is not: it makes metered requests against a real credential

## Notes

The dangerous failure here is the same class as Task 2.7.3's silent truncation and Task 2.7.5's
early-stopping page loop, arriving a third time and at the largest scale yet: **a backfill that
skips a window produces a well-formed, ascending, correctly provenanced store that is missing
data.** Nothing downstream detects it — not the ledger, which believes the walk; not a chart,
which draws what it is given; not an anomaly calculation, which happily computes a percentile
over a shorter series.

That is what Task 2.8.7 exists for, and it is the reason completeness is a separate task rather
than a flag this one sets.

---

## Amended 2026-09-08 by Task 2.8.2 — 518 securities, and CONCURRENCY becomes a real question

### The arithmetic, re-taken

The session-shaped loop is still right and its case is stronger: it replaces **~130,018**
requests rather than ~25,350. But the figures in the body are 101's:

| Reading                            | 101 (as written) | 518 (shipped) |
| ---------------------------------- | ---------------: | ------------: |
| Rows per session, whole universe   |           39,390 |   **202,020** |
| Pages per session                  |                4 |        **21** |
| Requests for a year of minute bars |           ~1,004 |    **~5,051** |
| Reconciles with rows ÷ 10,000      |            985 ✓ |   **5,051 ✓** |

### The thing that actually changed: the wall clock is no longer set by the rate limit

**This is a correction to `BARS.md` §4's own amendment, made the same day.** That figure —
"~26 minutes" — is `5,051 ÷ 3.23/s`, which is the **rate-limit floor** and is only the wall
clock if enough requests are in flight to saturate the bucket. Measured, a page is
**1,050,183 bytes and 2.52–2.65 s** from a development laptop, and Task 2.8.1 decided the
backfill **runs from a laptop** against the deployed database. So:

|                            | 101          | 518            |
| -------------------------- | ------------ | -------------- |
| Rate-limit floor           | ~5 min       | **~26 min**    |
| **Sequential wall clock**  | **~43 min**  | **~3.6 hours** |
| Concurrency to reach floor | ~8 in flight | ~8 in flight   |

At 101 the gap between floor and sequential was 5 min against 43 — annoying. At 518 it is
26 min against **3.6 hours**, and Task 2.8.5's own claim that the batch is "what makes the
backfill a command somebody runs rather than an overnight job" **is false sequentially**.

**So this task owes a decision it did not owe before: does the backfill issue requests
concurrently?** Both branches are legitimate and neither should be drifted into:

- **Sequential**, and the command is a ~4-hour job run once — which is defensible, because
  Task 2.8.1 already scoped the one-off backfill as a local command rather than a pipeline
  step, and a 4-hour local job is a thing you start and leave.
- **A small fixed concurrency (~8)**, which reaches the rate-limit floor and needs the pacer
  to be shared across in-flight requests rather than per-request. That is a materially more
  complex pacer and it interacts with `withRetry`'s budget, which Task 2.7.7 measured
  degrades badly under a crowd (320 concurrent → 73 req/s against a 3.23/s refill).

**The recommendation is sequential for the one-off**, with the measurement recorded, and
concurrency deferred to Task 2.8.8's evidence rather than assumed here — because Task 2.7.7's
crowd measurement is the strongest evidence in this repository that concurrency against this
vendor is not free, and ~4 hours once is cheaper than a pacer nobody can test.

---

## Amended 2026-09-08 by Task 2.8.4 — the ledger REFUSES a non-monotonic walk, and that changes two things here

The body says _"the walk must be monotonic, or the ledger claims a range it does not hold.
Decide the direction and say why."_ That was written expecting the one-range decision to be a
**convention this task honours**. It shipped as a **mechanism**: `market-bars.ts` refuses a
write whose gap from the stored range contains a trading session, computed from the shipped
calendar, and throws `CoverageGapError` naming the missing dates. The direction is still this
task's decision; **honouring it is no longer optional.**

Two consequences, and the first is the one that changes a design.

### 1. Concurrency across SESSIONS is now refused, and that resolves the open question above

The 2026-09-08 amendment asks this task to decide between a sequential ~3.6-hour run and a
small fixed concurrency of ~8 in flight. **That decision is now constrained rather than free.**

The batch loop is `for each session { fetch all symbols }`, so ~8 in flight means **eight
sessions in flight**, and they will not complete in order. Session `N` commits, then `N−3`
commits before `N−1` and `N−2` — and `N−3`'s write is disjoint from the stored range with two
trading sessions in the gap, so the ledger **refuses it**. Concurrency across symbols is
unaffected (different ledger rows); concurrency across sessions for one symbol is exactly what
the check exists to stop.

So a concurrent design needs one of: ordered commits behind the in-flight window (a completion
buffer, which is the pacer's complexity again), a second ledger shape (which Task 2.8.4
declined with its reasons), or per-symbol concurrency instead — which buys nothing, because the
batch already collapses 518 symbols into one request.

**The recommendation is therefore unchanged and its argument is now stronger: sequential.**
~4 hours once, against a completion buffer plus a shared pacer plus a design the ledger was
built to refuse.

### 2. A failed or dropped session BLOCKS the walk for that symbol, loudly

This is new behaviour and it is the useful kind. A session that fails, or a symbol silently
absent from a page (Task 2.8.5's trap), writes no bars and **does not extend the ledger**. The
very next session's write for that symbol is then disjoint by one session and is **refused by
name**.

So this command has to handle `CoverageGapError` rather than let it end the run: the honest
options are to retry that session, or to stop that symbol and record why, and the choice is
this task's. What it must not do is catch and ignore it — that is the hole the check was built
to close.

**The compensating fact is worth stating plainly: this gives Task 2.8.5's "one failure that
survives every check" a second, independent net.** A symbol dropped from a page is reported as
a successful empty answer, which every instrument in this story accepts — and the ledger
refuses the next write for it. It is caught one session late and named as a gap rather than as
a dropped symbol, so it does not replace 2.8.5's own protection. It is a backstop, and the one
case it cannot see is a drop on the **last** session of a run.

### 3. `SIGINT` and `kill -9` are already proved at this level

Task 2.8.4 asserts the transaction in both directions against a real server, including a
deliberate constraint violation on the ledger write rolling the bars back with it. So the body's
_"killing it mid-transaction is also fine and must be tested: Postgres rolls the session back,
the ledger does not move, and the next run re-fetches one session"_ is now a property of the
write path rather than a hope; what this task still owes is the **signal handling**, not the
atomicity.

### 4. One API note

An empty answer extends the ledger by nothing — `BarSeries` gives an empty series no `covered`
window, and inferring one from `requested` is the bug Task 2.7.5 measured. So a genuinely
untraded session **at the frontier of the walk** is re-fetched on the next run. One re-fetched
session is the safe direction and it is written into `recordSeries`'s doc comment; the reporting
consequence is Task 2.8.7's and is amended there.

---

## Amended 2026-09-08 by Task 2.8.5 — the batch shipped, and four things here inherit from it

Nothing about this task's shape changed: the session-shaped window, the pacer, the resume point
and the sequential recommendation all stand. `fetchManyBars` exists, is a **required** member of
`MarketDataProvider`, and all three implementations have one. What follows is the four things
that are different for the code this task writes.

### 1. The retry paragraph above is WRONG, and its conclusion is the dangerous half

It reads _"a batch of a hundred symbols retried once is a hundred times the page count"_, and
that is arithmetic about a batch of **independent fetches**. The batch that shipped is **one
walk**: the whole thing succeeds or the whole thing fails, so a retry re-runs one walk and costs
**its own page count once** — for which it recovers every symbol. **Retrying a batch is cheaper
per symbol than retrying a single fetch, not more expensive.**

That matters because of what the old paragraph concluded: _"the argument for the batch being
modest rather than maximal"_. **Do not act on it.** Task 2.8.2 measured all 518 symbols in one
`GET` — a 3,209-character query string, HTTP 200, `limit=10000` honoured — and
`toAlpacaManyQuery` carries an explicit instruction that **no chunking should be built**, because
a guard here would be a limit we invented sitting in front of one the vendor does not have. A
"modest" batch trades the one property the batch exists for.

The half of that paragraph that survives is the pacing argument, and it is unchanged: a retry
re-runs from page 1, so the pacer must count **requests** rather than walks.

### 2. A failed session fails the WHOLE universe, which SIMPLIFIES the `CoverageGapError` handling

`isWholeBatchFailure` shipped as the taxonomy's fourth classification: **success is per symbol,
failure is per batch.** A `429`, a timeout, an abort or a bad key ends the walk, and every symbol
in the request carries that outcome — because the pages that never arrived held symbols we cannot
name, so attributing the failure to a subset would be inventing information.

The consequence for the 2026-09-08 amendment below on `CoverageGapError`: it asks this task to
choose between _"retry that session, or stop that symbol and record why"_. **The second option
does not exist for a transport failure.** A failed session leaves all 518 ledger rows equally one
session behind, so the honest choices are to retry the session or to stop the run — there is no
per-symbol divergence to record. That is simpler than the amendment anticipated, and it is a
property of the batch rather than of this command.

**The per-symbol case is still real and is narrower than it looks.** Only three outcomes stay
with one symbol — `ok`, `unknown-symbol` and `range-not-available` — and Task 2.7.6 measured that
this vendor produces neither of the latter two from the bars endpoint. So in practice the map
this command receives is either **all failed with one shared outcome**, or **all `ok`**, some of
them with empty series. The empty-series case is the one that needs judgement, and Task 2.8.4's
note applies to it: an empty answer extends the ledger by nothing.

### 3. The deadline is an unchecked precondition, and getting it wrong is silent twice over

`DEFAULT_BARS_DEADLINE_MS` is unchanged at **3,000 ms** and a 21-page walk at 518 symbols is
**~55 s**. So this command must pass its own `deadlineMs` — already stated above, and now with
two measured reasons rather than one:

- **Nothing enforces it.** The interface's own comment says so and no test can, because the
  caller's deadline is the caller's.
- **`withRetry` silently gives no retries at all when the deadline is tight** (Task 2.7.7's
  recorded unchecked precondition): it gives up when the delay plus one plausible attempt does
  not fit in what is left, and the caller then receives the _real_ cause rather than an error
  saying "I did not try". So a backfill that forgets its deadline fails on the first page **and**
  looks like a vendor problem while doing it.

`pnpm bars` passes 20 s for a five-page single-symbol walk. This command's is larger, and the
number belongs beside the arithmetic that produced it.

### 4. The page count per session is a function of the symbol count, and both ends were measured

`maxPagesFor` now multiplies its numerator by the symbol count, so the bound follows the batch.
Two readings for this command's own arithmetic:

| Request                             | Pages  | Measured                    |
| ----------------------------------- | ------ | --------------------------- |
| 3 symbols, one session, `limit` 10k | **1**  | 1,124 ms, one request, live |
| 518 symbols, one session            | **21** | 2.52–2.65 s a page (2.8.2)  |

The first matters because this command takes a `--symbols` argument: a small run is **one request
per session**, not twenty-one, so a single-security backfill is bounded by round trips rather
than by pages and the two cases should not share one estimate.

### What did NOT change

The window shape, `windowFor`, the one-millisecond `end` conversion, the pacer's constants, the
resume point, the monotonic walk, the `SIGINT` behaviour, the `status = 'active'` default and the
2024-01-01 daily bound are all untouched by this task. So is the **sequential** recommendation,
and its argument is unchanged: the ledger refuses concurrency across sessions, and Task 2.7.7's
crowd measurement says concurrency against this vendor is not free.
