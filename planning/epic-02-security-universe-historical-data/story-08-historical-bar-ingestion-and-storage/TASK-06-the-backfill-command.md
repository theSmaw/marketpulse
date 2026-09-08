# Task 2.8.6 — The backfill: session-shaped windows, pacing, and resuming

**Status:** Complete (2026-09-08)
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

---

## What shipped (2026-09-08)

Three new files in `apps/backend/src` — `backfill.ts`, `bar-window.ts` and two
test suites — plus `scripts/run-backfill.mjs` and one root script, `pnpm
backfill`. **No dependency and no lockfile change.**

`windowFor` was **extracted from `fetch-bars.ts` rather than copied**, into
`bar-window.ts`. Two callers now share one definition of the window shape, which
is the trap `alpaca-mapping.ts` names for the inclusive-`end` conversion
arriving one level up: a window shape that disagreed between the command a
person checks by eye and the command that fills the database would disagree in
the worst possible place, because only one of the two is ever looked at.

`backfill` was checked against `pnpm help -a` before it was claimed, **with the
detection validated in the same run** against names known to be built-ins
(`clean`, `test`, `start`, `config`, `env`, `deploy`) — the control that failed
its own first attempt at Task 2.7.8. `backfill`, `ingest` and `fill` are all
free.

## The decisions this task owed, and what they came out as

**Sequential, and the recommendation is confirmed rather than re-taken.** The
2026-09-08 amendment left it open between ~3.6 hours sequential and ~8 requests
in flight; Task 2.8.4's amendment then constrained it, because eight in flight
is eight _sessions_ in flight and they do not complete in order — which the
ledger refuses by name. The measurement below removes the last of the argument
for concurrency anyway: the sequential year is **~72 minutes, not ~3.6 hours**.

**Backwards from the present, and forwards first when there is a gap at the
recent end.** `planRequests` emits two monotonic walks: the newer half oldest
request first (the catch-up), then the older half newest request first (the
deepening). Both extend the one contiguous ledger range from one of its ends,
which is what makes a single ledger row enough. On a first run there is nothing
held, so the whole thing is one backward walk — and the direction is why an
interrupted run leaves the product _more_ useful rather than less: what it has
is the recent history, contiguous, which is what every chart opens on.

**`commonCoverage` is the intersection across the batch, and skipping is a spend
optimisation rather than a correctness mechanism.** A batch fetches one window
for every symbol, so there is no such thing as fetching it for some; a session is
skipped only when _every_ symbol already holds it. Correctness is the upsert,
which makes re-writing a held session change no byte. The cost is stated: one
symbol behind the rest drags the whole batch's skip window back to its own.

**`CoverageGapError` blocks the symbol and the run continues.** Task 2.8.4's
amendment asked for a choice between retrying the session and stopping the
symbol; Task 2.8.5's then removed the first option for a transport failure, so
what is left is genuinely per symbol. A blocked symbol is dropped from the
**request** and not merely from the write — fetching bars we would then refuse to
store spends a metered budget on nothing — and it is named in the report with its
missing sessions. Ending the run on it would let one thin symbol stop 517 others;
swallowing it would reopen the hole the check was built to close.

**A whole-batch failure stops the run.** It is already retried, because
`withRetry` wraps the provider, and carrying on to the next session would leave a
gap the ledger refuses on the very next write anyway, for every symbol at once.

**`raw`, always, and adjustment is not an argument.** A stored _adjusted_ series
is retroactively wrong the moment the next split happens, which makes the store a
cache by the back door — the one thing open decision 1 settled it is not.

**`--sessions` defaults to 5.** A backfill whose default spends an hour against a
metered API is a trap; `--sessions 251` is a year and is typed deliberately.

**`SIGINT` finishes the request in flight, and exits 0.** A request already sent
has been paid for, so abandoning it wastes it _and_ leaves the ledger one session
further behind. A second `SIGINT` exits immediately. Exit **0** is a decision: an
interrupted run did exactly what it was asked to up to the point somebody asked
it to stop, and a non-zero code would make Ctrl-C indistinguishable from a
failure in anything that wraps this.

## What was measured, against a real key and a real database

**A year of one security.** `--symbols NVDA --from 2025-09-09 --to 2026-09-04`:
**244 sessions, 94,800 bars, 89.4 s**, every regular session **exactly 390** and
**both half days in the year exactly 210** — `2025-11-28` and `2025-12-24`.
Nothing else in 244 sessions deviated. That is criterion 4's half-day half
produced rather than reasoned about: a check expecting 390 would have reported
180 phantom gaps on each of those two days, and a span-shaped window would have
inflated both.

**The whole universe, one session: ONE fetch.** 518 securities, **188,726 bars in
15.8 s**. A four-session run is 3 fetches, 571,167 bars, 52 s — **~17.3 s a
session**.

**That corrects this file's own amendment.** It predicted ~55 s a session (21
pages × 2.52–2.65 s) and therefore **~3.6 hours** for a sequential year at 518.
Measured, a year is **251 × 17.3 s ≈ 72 minutes**. The amendment's conclusion —
sequential — survives with a much easier argument, and Task 2.8.5's claim that
the batch is _"what makes the backfill a command somebody runs rather than an
overnight job"_ turns out to be **true sequentially** after all.

**The mean is 364 bars a security-session, not 390.** 188,726 ÷ 518. That is Task
2.8.5's liquidity finding at universe scale — only 8 of 28 sampled S&P 500
constituents returned a full 390 — and it is why no test here asserts a bar
count.

**Criterion 2, at scale and on the rows.** A re-run of a held range is **0
fetches, 0 bars, 0.4 s** at 518 securities. The database suite asserts the
stronger form: an `md5` over every stored bar _and_ the ledger, byte-identical
across a re-run. `updated_at` is inside that digest deliberately, because
`market-bars.ts` only moves it when the statement actually changed.

**Criterion 3, both ways.** `SIGINT` mid-run: the request in flight finished, its
ledger row was written, exit 0, and the resume reported **4 already held** and
walked the remaining 6. `kill -9` mid-run: the session in flight rolled back with
its ledger row, and the resume reported **2 already held** and walked 6. Neither
duplicated nor skipped a session.

**Storage, measured rather than estimated.** 768,123 bars occupy **144 MB**
including indexes — **197 bytes a row**, against the story's assumed ~120, which
was a heap figure that explicitly excluded the index. Two headroom figures
against Story 2.1's measured ~22.5 GiB usable, and both are worth having because
they bracket the answer:

| Basis                                         | Rows / year | GiB / year | Years to read-only |
| --------------------------------------------- | ----------: | ---------: | -----------------: |
| The calendar's ceiling, 97,494 bars/security  |   **50.5M** |   **9.27** |           **~2.4** |
| The measured density, 364.3 bars/security-day |   **47.4M** |   **8.69** |           **~2.6** |

**Plan against ~2.4 years**, the ceiling: the density figure is one session's
mean and a thin name that starts trading more actively moves it towards the
ceiling rather than away from it. Either way this is **not the ~3.8 years the
story's ~120 B assumption gives**, and the `psql-storage-80pct` alert Story 2.1
created stops being theoretical within the life of this project. Task 2.8.8 owns
the formal reading, deployed; this is the datum it should start from.

**`pnpm verify` is exit 0 in 34.7 s with no database**, and this command is in
neither chain — for the reason `pnpm bars` is not, and more firmly: it makes
metered requests _and_ writes to a database.

## Four deliberate breaks, each seen to fail and reverted

| Break                                            | Red                                     |
| ------------------------------------------------ | --------------------------------------- |
| `SESSIONS_PER_REQUEST["1m"]` 1 → 5               | 7 tests, naming the window and the walk |
| The daily window framed on the session           | 1 test, naming midnight ET              |
| `commonCoverage` as the union not the section    | 2 tests, naming the intersection        |
| `CoverageGapError` swallowed instead of blocking | 2 tests, naming the blocked symbol      |

The tree was confirmed byte-identical after each revert.

## One finding worth more than a passing test: a check that could not fail

The database suite's first version asserted that **no stored bar falls outside
the sessions walked** — which reads like the deliberate-break assertion for the
window shape and is not one. Widening `SESSIONS_PER_REQUEST["1m"]` to 3 leaves it
**green**, measured, because `fixture-corpus.ts` is synthetic: it generates a bar
per minute of a session and nothing outside one, so it has **no extended-hours
prints to leak**. A synthetic corpus cannot exhibit the failure the assertion is
written against.

It was kept with a **non-vacuity guard** and an honest comment saying what it does
and does not hold, rather than deleted or left looking like a check. That is Task
1.13.6's blind-renderer problem in a new place: a query finding nothing outside
the sessions passes identically whether the walk is session-shaped or whether the
symbol has no bars at all. The window _shape_ is held by `backfill.test.ts`'s
assertion on the request range, which is the level that can see it, and by the
real vendor at the point a real key is used — where it was produced, at 390 and 210.

## The pacer paces walks, not pages, and that is stated rather than hidden

`BACKFILL_PACE_MS` is 350 ms — one ~310 ms token plus margin — measured from the
_start_ of the previous provider call, so it costs nothing whenever the previous
call took longer than the floor. Task 2.8.5's amendment warns that a pacer must
count **requests** rather than walks, and this one counts walks: `fetchManyBars`
pages internally with no pacing between pages. Measured rather than assumed, a
518-symbol session is ~21 pages in 15.8 s — **~1.3 pages a second against a
3.23/s refill** — so it does not breach the limiter and the floor between walks is
what actually binds. **The reversal trigger is a `rate-limited` outcome on a run
this pacer was supposed to keep under the limit**, at which point the pace belongs
inside the walk, which means inside the provider, and `PROVIDER.md` §8.8 would
have to be revisited rather than worked around here.

`BackfillReport.requests` is documented as _calls to the provider_ rather than
HTTP requests, and the summary line says `fetches` for the same reason.

## The honest gap

**Nothing was written to the deployed database.** Open decision 4 settled the
initial backfill as a local command against the deployed store, and this task
built the command; running it there is Task 2.8.8's, alongside the query-plan and
storage measurements it needs a real row count for. What ran here is the same
command, the same key and the same code path, against the local PostgreSQL 18
container — which is the same major, and the write path is Task 2.2.7-verified as
producing an identical schema at both ends.

---

## For a non-technical reader — where the product has got to

**In one sentence: MarketPulse can now go and get its own market history, and
keep it.**

Everything before this could _look at_ market data. Until now the product could
ask Alpaca for one day of one company's prices and print them to a terminal, and
they vanished when the window closed. This task builds the machine that fetches
that history in bulk and files it in the database, so the product owns a record
of what happened in the market rather than borrowing one.

**Why that matters more than it sounds.** Almost everything on the roadmap needs
history rather than "right now". You cannot say a price move is _unusual_ without
knowing what usual looks like for that company — which means months of its own
past. You cannot compare a chip-maker against its sector without both sides'
history. And the product's signature feature, replaying a past trading day and
asking "what could anyone have known at 11:07 that morning?", is obviously
impossible without it. The database is what makes the answer to all three ours to
compute rather than something we have to ask a vendor for, over the internet,
every time somebody clicks.

**What it actually does.** You type `pnpm backfill`. It works out which trading
days it needs from the trading calendar the product already knows, asks Alpaca
for one day at a time, and writes each day's prices into the database as it goes,
printing a running commentary with an estimate of how much longer it will take.
Fetching the last four trading days for **all 518 tracked companies** — 571,167
individual price bars — took **52 seconds**.

**The decisions worth explaining, because each of them is a trap avoided:**

- **It asks for one trading day at a time, and that is not fussiness.** Ask for a
  week in one go and the vendor helpfully throws in overnight and early-morning
  trading, which is **2.35 times as much data**, more than half of it from hours
  the product's own calendar says the market was shut. We would be paying to
  store, and then quietly reasoning over, prices from a market that was closed.
  Asking day by day gets exactly the day.

- **It can be stopped and picked up again.** This is a job that runs for over an
  hour for the full universe. Press Ctrl-C and it finishes the day it is in the
  middle of, records that it has that day, and stops cleanly; pull the plug and
  the half-finished day is discarded whole rather than half-written. Either way
  the next run carries on from precisely where it left off. That was tested by
  actually doing both, not by reasoning about it.

- **Running it twice is free.** It keeps a small ledger of what it already holds,
  so a second run of the same range asks the vendor for **nothing** and finishes
  in under half a second. That matters because a vendor allowance is finite and
  because the honest way to find out whether we already have something is to
  look, not to fetch it again and hope.

- **It fills the most recent history first and works backwards.** If it gets
  interrupted at 60%, what the product has is the most _recent_ months — the part
  every chart opens on — rather than a stretch of old data with a hole where
  today should be.

- **It stores prices exactly as they were quoted on the day**, not "helpfully"
  restated to account for later stock splits. A restated price is right today and
  wrong after the next split; a quoted price is permanently true. If somebody
  wants the restated view, we ask for it when they ask, which keeps the stored
  record honest.

- **When something goes wrong it stops and says so.** If one company's data comes
  back with a hole in it, that company is set aside by name with the missing
  dates printed, and the other 517 carry on. If the vendor refuses the whole
  request, the run stops rather than skipping ahead and leaving a gap nobody
  would ever notice. The failure this whole area of work is designed against is
  not a crash — it is a database that looks perfectly healthy and is quietly
  missing a fortnight.

**Two numbers that turned out better than planned, and one that turned out
worse.** We had estimated roughly three and a half hours to fetch a full year for
all 518 companies; measured, it is about **72 minutes**. And we had assumed each
stored price would take about 120 bytes; measured, it is 197, which means our
free storage allowance holds about **two and a half years** of history rather
than nearly four. Neither changes a decision, and both are now written down as
measurements rather than guesses — which is the point of measuring.

**What a stakeholder can be shown today:** a terminal filling half a million real
market prices into a database in under a minute, and then being run again and
correctly doing nothing at all.

**What they still cannot see:** any of it on a screen. `/securities` renders the
same 518-company page it did before. The next tasks build the instrument that
reports what history we hold and what is missing from it, and then put that on
the page — after which the product can say, per company, exactly how much of the
market's past it can reason about.
