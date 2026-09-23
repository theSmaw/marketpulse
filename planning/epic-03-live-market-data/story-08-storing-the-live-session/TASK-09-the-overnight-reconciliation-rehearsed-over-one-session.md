# Task 3.8.9 — The overnight reconciliation, rehearsed over one session

**Status:** **Complete — 2026-09-23.** Both writers filled one session in the real order, through the shipped `planRequests`, `recordSeries`, `extendCoverage` and `readSeries`. **The backfill asked** — `requests: 1`, the un-fudgeable half — and a fully reconciled session holds **430 rows over 390 minutes** while the served answer names **one source**, because every live minute had a consolidated version. A second rehearsal covers the shape production actually reaches: extended-hours minutes the session fetch never touches, named `iex ×10` then `sip ×390` in contribution order. **Criterion 9 was NOT honest and is repaired**: `bars:check` would have put its loudest line under every reconciled security; the threshold is now two rows a minute, which keeps its original 2.35× catch. And the daily `covered_end` hand-off was **wrong** — that value is the vendor clamp, not a write time.
**Story:** [3.8 Storing the Live Session](STORY.md)
**Depends on:** 3.8.7

## Objective

Criterion 5, and it is written to be un-fudgeable: the overnight reconciliation
behaves as 3.8.1's decision states, **proved by running both paths over one
session rather than by reasoning about them**.

This is the first time in this product's life that two writers fill the same
table for the same minutes, and it is the case the whole story was created to
make safe.

## What the user can see when this lands

**Nothing.** Confidence that tonight does not quietly rewrite today.

## The rehearsal

- **One session, both paths, in the real order**: the live writer fills a
  session from the socket (or the fixture feed standing in for it, stated as
  such), then the backfill fetches the same session from the consolidated tape,
  exactly as the nightly cron would.
- **Read the table before and after** with a fingerprint rather than a count —
  the store's own test suite already has `BARS_FINGERPRINT`, and a count hides
  a replacement.
- **Then read the served answer**, because that is what a user meets: how many
  sources does the window name, in what order, with what counts, and what does
  the source note draw.
- **And `pnpm bars:check`** — criterion 9, **and Task 3.8.5 has already found
  one way it misreports, so start there rather than from scratch.** It reports
  _series holding MORE bars than their sessions have minutes_ as an anomaly,
  and the ledger's `bar_count` counts **rows**. A fully reconciled session
  holds up to two rows a minute, so every reconciled security trips that line —
  a false alarm, on exactly the night the tool's output matters most. Decide
  whether the count becomes distinct instants, whether the expectation doubles,
  or whether the line says which tape it means. That script tells the truth about
  what is missing and why, and it was written when one writer filled this table.
  Two writers can make a session look complete when one tape's holes are filled
  by the other's, or incomplete when neither covers a minute nobody traded in.
  Read its output against the session you just built and decide whether it still
  answers honestly.

## What to watch for, named in advance

- **A minute neither tape covers** is not a defect and must not be reported as
  one: **live** IEX's median minute coverage is **65.1%**, worst case 2.1%
  (`LIVE-DATA.md` §7.6, measured on the stream), and SIP's is 99.7%; `BARS.md`
  measured that only 8 of 28 S&P 500 constituents print a full 390 minutes.

  **The figure above was wrong until 2026-09-23** — it read _IEX's median
  minute coverage is 82.8%_, which is `ALPACA.md` §5.2's measurement of the
  **stored** `feed=iex` REST endpoint, struck for the live feed by §7.6 on
  2026-09-16. It matters here more than anywhere: this rehearsal counts the
  minutes the two tapes disagree about, and **a third of a median name's
  minutes are missing from the live tape rather than a sixth.** Sizing the
  expected gap from 82.8% would have made a correct reconciliation look
  broken.

- **A minute both cover with different numbers** is the interesting one, and
  what happens to it is exactly 3.8.1's decision. Count them.
  **And since 2026-09-23 there is a stated answer to hold it to** (Task 3.8.4):
  both rows are kept, and the **consolidated** one is what `readSeries` serves,
  under `SERVED_TAPE_RANK`. So the assertion is two-sided — the count of
  doubly-covered minutes against the store, and the served answer naming the
  consolidated tape for every one of them. A rehearsal that only counted rows
  would pass against a read that served the wrong one.
- **What the served window's `provenance.sources` says after both runs**, which
  is the part a user meets. It describes **what was served**, not what is
  stored, so the IEX count in the note is the minutes the consolidated tape did
  **not** reach — not the number of IEX rows in the table. Task 3.8.4 saw
  exactly this on a local store: 90 IEX rows held, **45** named. Assert the
  difference rather than the equality, because equality is what a regression
  would produce.
- ~~**The ledger's `covered_end` on the DAILY rows is holding a wall clock**~~
  — **answered, and the answer is that it is the vendor CLAMP rather than a
  write time. See _What was done_ below.** Left standing as the record of what
  was suspected. The original:

  **The ledger's `covered_end` on the DAILY rows is holding a wall clock, and
  it is yours** — handed here 2026-09-23 by Task 3.8.3, which met it by
  accident. Every `1d` row read `2026-09-14T00:04:38.533Z`, milliseconds and
  all: the moment the backfill ran, not an instant in the market. The `1m` rows
  were honest. `covered_end` is a market-time column sitting on the same row as
  `recorded_at`, which is the confusion `DATA-LAYER.md` separates the two to
  prevent — and it is **the column `planRequests` and `commonCoverage` read to
  decide what to fetch**, which is this task's whole subject. Find the writer
  that sets it (the backfill's daily path is the candidate), say whether the
  value is deliberate, and either correct it or record why a wall clock belongs
  there. Nothing on any screen shows it. `STORY.md` carries the same hand-off.

- **What the live writer claims, which is what makes the backfill ask at all.**
  3.8.3 settled it: `seriesFor()` claims `[first.startsAt, last.startsAt + 1
minute)` and never the session close, so `covered_end` lags the session by
  design. Confirmed against a real ledger — thirty `iex` bars from
  `13:30:00Z` moved it to `14:00:00Z` and no further. **Assert that the
  backfill asked**, which is criterion 5's un-fudgeable half, and assert it
  against a `commonCoverage` intersection that is the earliest of 518 lagging
  ends rather than against one symbol's.
- **The ledger's own claim** after both runs: one contiguous window, a bar count
  that agrees with the rows, and a `provider` that did not change.
  **Assert the bar count against `count(*)` rather than reading it**, added
  2026-09-23 by Task 3.8.2: that task found the writer's presence check
  unscoped to the tape, which made a genuine insert count as a correction and
  never reach `extendCoverage` — the ledger under-reports and **nothing says
  so**. A reconciliation is the first place two tapes meet in volume, so it is
  the first place a residual version of that defect would show. The two
  numbers agreeing is the assertion; either one alone is not.
- **That the backfill asked at all** — added 2026-09-23 by Task 3.8.1.
  `planRequests` skips a session wholly inside the covered window, so a live
  writer that claimed today would make tonight's run report
  `0 fetches, 1 already held` and store nothing, **correctly by its own rules
  and wrongly for the product**. The rehearsal's first assertion is therefore
  not about the rows but about the **request count**: a run that fetched
  nothing has not reconciled anything, and it looks identical to a run that
  reconciled perfectly. `LIVE-SESSION.md` §3.

## Work

- The rehearsal above, with its figures in `LIVE-SESSION.md`
- Whatever `bars:check` needs to stay honest with two writers, or a written
  statement that it is honest unchanged — with the reasoning
- `market-bars.database.test.ts` or `backfill.database.test.ts`: the
  reconciliation asserted end to end, so the rehearsal has a mechanical
  successor rather than being a one-off
- A `pnpm break` for the rule the reconciliation rests on

## Done when

1. Criterion 5 holds, proved by running both paths over one session
2. Criterion 9 holds: `pnpm bars:check` still tells the truth, or is repaired
3. `pnpm verify` and `pnpm test:database` pass

## What was done — 2026-09-23

### The rehearsal, and what stands in for what

It lives in `backfill.database.test.ts` so it has a **mechanical successor**
rather than being a one-off. The bars are the fixture corpus's and the clock is
the test's; the **labels are production's** — the live half writes
`alpaca`/`iex` through the shipped writer, the backfill half is the real
`runBackfill` behind a provider declaring `alpaca`/`sip`. `planRequests`,
`recordSeries`, `extendCoverage` and `readSeries` are all the shipped ones and
the tapes rank as they do in production. **What is simulated is the data, not
the path.**

### A fully reconciled session

|                          |                            |
| ------------------------ | -------------------------- |
| **requests**             | **1** — the backfill asked |
| sessions already held    | 0                          |
| inserted by the backfill | 390                        |
| corrected                | 0                          |
| live rows held           | 40                         |
| consolidated rows held   | 390                        |
| **minutes held twice**   | **40**                     |
| bars served              | 390                        |
| **sources named**        | **`sip` × 390 — one**      |

**The first assertion is the request count.** A live writer that claimed the
whole session would make this run report `0 fetches, 1 already held` and store
nothing — correct by its own rules and wrong for the product — and a run that
fetched nothing is indistinguishable from one that reconciled perfectly.

**The note names one source, and that is the right answer**: every live minute
had a consolidated version, so nothing of the live tape survives into the
answer. The store holds **430 rows**; the answer names **390 from one tape**.

### The shape production actually reaches

The case above is a session the consolidated fetch covers completely. Production
has minutes it never covers — the live writer keeps **extended-hours** bars and
the backfill asks per **session**. Ten pre-market minutes plus ten inside:

```text
sources named:  iex × 10 , then  sip × 390
live rows held: 20        live minutes named in the note: 10
```

In contribution order, and asserted as the **difference** between rows held and
minutes named, because equality is what a regression would produce.

### Criterion 9: it was not honest, and is repaired

`bars:check` reports _more bars than their sessions have minutes_ as an
invariant violation, and `bar_count` counts **rows**. A reconciled session
legitimately holds two a minute — **430 over 390** above — so **every reconciled
security would trip the tool's loudest line on exactly the night its output
matters most.**

**The threshold is now `MAX_ROWS_PER_MINUTE = 2`.** That keeps the original
catch: what the check was written for is `ALPACA.md`'s measured **2.35×**, and
2.35 is still over the line — the existing test passes **unchanged**, which is
what made this safe to choose over the alternatives. What is given up is the
band between one and two rows a minute, which is exactly the band a second tape
occupies. A new test asserts the reconciled case says nothing;
`pnpm break bars-check-calls-a-reconciled-session-a-fault` proves the red.

Of the three options the task named, doubling the expectation is what this is —
and the other two were rejected on cost rather than principle: counting distinct
instants changes what `bar_count` **means**, which `extendCoverage` maintains
incrementally and two other readers depend on; naming the tape needs a per-tape
count the ledger does not carry, since Story 3.7 withdrew `bar_coverage.feed`.

### The daily `covered_end` hand-off was wrong, and this is the correction

Task 3.8.3 met a daily ledger reading `2026-09-14T00:04:38.533Z` and handed it
here as _a market-time column carrying a write time_. **It is the vendor
clamp.**

`alpacaServableEnd(range, startedAt)` clamps any request whose end is in the
**future** to `now − 16 min` — the free plan's withholding — and the provider
reports that clamp as `coverage.covered.end`. A daily window is
`[midnight, next midnight)`, so its end is always in the future and the clamp
always binds. `00:04:38.533Z` is a run at `00:20:38.533Z` minus sixteen minutes;
the arithmetic checks.

**So the value is correct.** `covered` is what the answer actually covers, and
claiming the midnight that was asked for would be the ledger overstating. The
minute rows looked honest only because their end is a past session close, where
the clamp does not bind. **And it costs nothing**: the clamp lands after the
last session's close, so `planRequests` still counts that session as covered and
nothing is re-fetched.

Corrected in `STORY.md` and in this file's own inherited list, both left
standing as the record of what was suspected.

### Two things the rehearsal caught in its own construction

- **Wrapping only `fetchBars` left the run using the fixture's own provenance**,
  and the store refused it with a `ForeignSourceError` naming a second
  **provider** — Task 3.7.4's refusal doing exactly its job, on the first run.
  `runBackfill` calls the **batched** fetcher.
- **This file's tests share one store and run in order.** The rehearsal
  truncates before it starts and sits last in the file, rather than depending on
  position.

### And one flake repaired that this task did not write but did ship

Task 3.8.8's browser assertion — _a page fed only by the store marks nothing_ —
**passed alone and failed in a full suite run**, caught by this task's gates
rather than by that one's. It anchored on `getByRole("table")` immediately after
the navigation, and that table is **518 rows behind a 190 kB response**: on a
loaded machine the paint is slower than an assertion's default patience.

**Repaired by waiting on the universe ANSWER rather than on the paint**, which
makes the wait about the thing that is actually slow. Widening the timeout would
have stopped the flake and hidden the reason — the same distinction
`docs/GAPS.md`'s stale-store entry draws about believing a browser failure.
Verified with a clean full run on **both** store shapes: 143 passed, none
failed.

## For a stakeholder — a status report, 2026-09-23

### What this was

**We made the two halves of the product write to the same day's data, in the
real order, and watched what happened — rather than reasoning about it.**

This is the moment the whole story was built for. All week we have been adding
pieces: the product writes the trading session down as it happens, serves it
correctly, labels it honestly. Tonight's job then arrives and fills in the same
minutes from the fuller market-wide feed. **Two writers, one day, first time in
this product's life.** The question was whether tonight quietly rewrites today.

### What we watched

We built a session the way it really happens — the live feed writing forty
minutes, then the overnight job running over the same session — and measured
every step.

**The first thing we checked was not the data. It was whether the overnight job
asked at all.**

That sounds odd until you see the failure it prevents. The job skips any day it
believes it already holds. If the live feed had claimed the whole day, the job
would report "nothing to fetch, already held", store nothing, and **look
exactly like a run that worked perfectly**. A silent no-op is the most dangerous
outcome available here, and it is the one you cannot see from the data
afterwards. It asked. One request, nothing skipped.

Then the rest: 430 records stored for a 390-minute day — because forty of those
minutes are now held twice, once from each feed, which is the deliberate
decision from earlier in the story. And the chart serves 390 of them, choosing
the fuller version every time.

**One result surprised us and turned out to be right.** After a complete
overnight reconciliation, the chart's source note names only **one** feed — not
two. Every minute the live feed saw has a better version now, so nothing of the
live version survives into what you are shown. The database holds both; the
screen describes what it actually drew. That is exactly what we wanted and it
is not what we expected to see.

So we built the second case, which is the one production really reaches:
pre-market trading. The live feed captures those minutes and the overnight job
never asks for them, because it asks day by day. Those minutes stay live-feed
only, for ever — and there the note correctly names both.

### The thing we found that would have gone wrong tonight

Our data-health tool reports any security holding **more prices than the day has
minutes** as a serious fault. It is right to: that pattern means timestamps are
being mapped wrongly, and the tool was built after we hit exactly that.

But it counts **records**, and a reconciled day now legitimately holds two per
minute. So on the first night after a live session, **the tool would have put its
loudest warning under every single security** — on precisely the night its
output matters most. A tool that cries wolf on the expected case is worse than
no tool.

We raised its threshold to two records per minute and kept the original catch
intact: the fault it was built for produces 2.35 records per minute, which is
still over the line. The old test passes unchanged, which is what let us choose
this over the alternatives — the others meant either changing what a stored
count _means_ across the system, or adding data the ledger does not keep.

### And a correction to our own notes

Earlier this week we flagged what looked like a bug: a timestamp in our records
that appeared to hold a _clock reading_ rather than a _market time_. We wrote it
down as a problem for this task.

It is not a bug. That value is our data provider's fifteen-minute embargo made
visible: ask for data up to midnight tonight and you are told "here is
everything up to sixteen minutes ago", so that is honestly what we record
holding. The arithmetic matches to the second. We have corrected the note in
both places rather than leaving a false alarm in the record.

That is the **fourth** time this week a written-down worry turned out to be
narrower than claimed, and the fourth settled by checking rather than building.
It is becoming the most useful habit in this project.

### Where the product stands

**Nine of ten tasks done.** What remains is the story's close: walking its
criteria, sweeping the documents it has made out of date, and handing its
constraints to the stories that come next.

The live trading session is now written down as it happens, served correctly and
freshly, honestly labelled, corrected when the exchange corrects itself, safe to
reconcile overnight — **and proven so by running it rather than by arguing it.**

**What you still cannot see** is any of this against the real market during
trading hours. That sitting now carries seven items across three parts of the
project, and it is the last thing standing between this work and a demonstration.
