# Task 2.5.4 — The session functions, and the named dates that prove them

**Status:** Complete
**Story:** [2.5 Trading Calendar & Market Time Handling](STORY.md)
**Depends on:** Tasks 2.5.2 and 2.5.3

## Objective

Turn the boundary and the table into the small set of functions the rest of the product
consumes, and assert every one of them against the named dates Task 2.5.1 chose — including
acceptance criterion 3, which is that **"the last N sessions" returns sessions rather than
calendar days**.

This is the task the whole story exists for. Three later stories and one epic call these
functions.

## What the user can see when this lands

**Nothing on screen**, and this is the last task in the story of which that is true.
Task 2.5.5 is the visible one.

What can be demonstrated is worth a line in the write-up anyway: after this, the question
"how many trading days between two dates" has one answer in this codebase instead of three.

## Work

- **Write the smallest set that covers the four known consumers**, and write down which
  consumer each exists for, so a fifth function has to justify itself:
  - `isMarketOpen(instant)` — or rather, the session **state** at an instant, because the
    boolean loses the distinction between closed-for-the-night, closed-for-a-holiday and
    early-closed, and Task 2.5.5 renders that difference
  - the session **bounds** for a market date — open and close as instants, honouring half
    days, which is Story 2.8's "which minutes should have bars"
  - previous and next session from a date
  - sessions between two dates, and **the last N sessions**, which is Story 2.13's window
    control and criterion 3
- **Return a session as an object rather than a pair of times.** A half day is a session
  whose close is 13:00, and a caller that gets two instants has to be told separately that
  it was early. `market_bars` in Story 2.8 will want to say "this session should have 210
  bars, not 390" without re-deriving it
- **Every function takes an instant or a market date and never reads the clock.** That is
  Task 2.5.1's decision applied: the wall clock is read in exactly one place, which is Task
  2.5.5's, and everything here is a pure function of its arguments. It is also what makes
  these tests fast and what makes Epic 13's substitution a change to one module
- **What Task 2.5.2 actually shipped, so this task builds on it rather than beside
  it (added 2026-09-06).** The boundary module exports `marketWallClockAt`,
  `marketDateAt`, `marketOffsetAt` and `instantFromMarketTime`, plus a **branded**
  `MarketDate` with `toMarketDate`/`isMarketDate` and a `MarketTimeOfDay` with
  `toMarketTimeOfDay`. Three consequences for this task. **Session bounds are
  built with `instantFromMarketTime(date, time)`** and nothing else — there is no
  other way, because `eslint.config.mjs` now forbids constructing an
  `Intl.DateTimeFormat` or naming the market's timezone outside that module, and
  both rules were made to fail before being believed. **This module is where the
  calendar table's plain-string dates get branded**, per Task 2.5.3's measured
  finding that branding them at rest costs ~1.5 kB in the frontend bundle. And
  **`instantFromMarketTime` throws `MarketTimeError` on the gap and the fold**,
  which no session bound can ever hit (both transitions are Sundays), so a
  `try`/`catch` around it here would be catching a condition that cannot occur —
  if one ever fires, the calendar table has a Sunday in it
- **Every one of these functions can walk off the end of the calendar, and the brief did not
  say so (added 2026-09-06, from Task 2.5.3).** `previousSession("2024-01-02")` steps back
  into 2023, `nextSession("2028-12-29")` steps into 2029, and "the last 60 sessions" from
  early January crosses the lower bound routinely — Epic 5's baseline is specified at exactly
  that length. All three hit `MarketCalendarRangeError`, which is correct and is the whole
  point of the refusal, but **each function has to decide whether it propagates or reports**,
  and doing that by accident is how the range becomes an invisible cliff. The cheap answer is
  to propagate, because the caller asked a question the calendar genuinely cannot answer and
  a truncated list of sessions is a wrong answer wearing a right shape — but say so, and
  assert both edges, because the alternative (silently returning fewer sessions than asked
  for) is exactly what criterion 3 exists to prevent in the holiday case and is no better in
  the range case. **Task 2.5.5's clock is the one caller that must NOT propagate**, and its
  file now says why
- **Assert against the named-date list rather than against reasoning**, which is criterion 1
  and is worded that way deliberately. At minimum, and each as its own named test so a
  failure says which case broke:
  - a full holiday — and Good Friday separately, because it is the one a rule set misses
  - a half day, asserting the 13:00 close and the shortened bar count
  - a weekend, and the Friday and Monday either side
  - **both DST transitions** — ~~asserting that the session is 6.5 hours on both days~~
    **corrected by Task 2.5.1 on 2026-09-06: there is no session on either day.** Every US
    DST transition is a Sunday, without exception, so no trading session ever begins in, ends
    in or contains one. The assertion that was meant, and the one that catches the bug, is on
    the **Friday before and the Monday after**: both 6.5 hours, with the UTC open moving by an
    hour between them (2026: 14:30Z on Fri 03-06 -> 13:30Z on Mon 03-09). Assert **the Tuesday
    after** as well, which is `CALENDAR.md` §7.1 case 11 and is the one that catches an
    implementation that special-cased the transition weekend and got the new offset wrong.
    This is the assertion that fails if anything anywhere did arithmetic on instants
  - a holiday observed on the Friday before, and one on the Monday after
- **Assert the arithmetic check Task 2.5.3 named**, against `CALENDAR.md` §7.2's **per-year
  table** — 2024: 252, ~~2025: 251~~ **2025: 250**, 2026: 251, 2027: 251, 2028: 251. This
  file's own hedge turned out to be the right one: 252 is not a constant, and a test asserting
  it would be red on four of the five covered years. **Corrected a second time on 2026-09-06
  by Task 2.5.3, which checked the published record rather than deriving it: 2025 has ELEVEN
  weekday closures and 250 sessions**, because `2025-01-09` was a full closure for the
  National Day of Mourning — an unscheduled closure §7.2's derivation could not contain
  (`CALENDAR.md` §7.7). `market-calendar.test.ts` already asserts all five figures, so this
  task can consume them rather than re-derive them; what it owes is the same check reached
  through the **session functions** rather than through the table.
- **What Task 2.5.3 shipped, so this task builds on it (added 2026-09-06).**
  `MARKET_CALENDAR` is a plain array literal of `MarketCalendarException` rows —
  a discriminated union on `kind`, so a full closure cannot carry a close time and an early
  close cannot omit one. Read it through **`marketCalendarExceptionOn(date)`**, which returns
  `undefined` for _both_ an ordinary weekday and a weekend and refuses a date outside
  2024–2028 with a `MarketCalendarRangeError`; **turning that `undefined` into a session is
  this task's job, and it is the piece that also has to know about Saturdays.**
  `marketEarlyCloseOn(date)` gives the close as a parsed `MarketTimeOfDay`, so nothing here
  touches the `"13:00"` string form. `assertWithinMarketCalendar(date)` is exported so the
  session functions refuse out-of-range dates through the same check rather than a second copy
  of the range. The table's own validation — real weekday dates, ascending, no duplicates,
  in range, parseable close times — runs lazily on first read and **throws naming the offending
  row**, so a calendar typo fails where it was typed rather than as a wrong session months
  later.
  It is one line and it catches a missing or invented holiday that every individual named
  date passes
- **Make the interesting ones fail before believing them.** Removing Good Friday from the
  table, and making the half-day close 16:00, should each take a named test red. A green
  suite on a calendar nobody broke is not evidence

## Done when

- Every named date from Task 2.5.1's list is asserted, each in a test named for its case
- Both edges of the calendar's covered range are asserted — a session walk that steps off
  either end refuses rather than truncating, and the decision is recorded
- "The last N sessions" returns sessions and is proved across a holiday week — the test that
  distinguishes it from `N` calendar days
- A half day's bounds and its expected bar count are both available to a caller
- No function in the module reads `Date.now()`
- Two deliberate breaks were each seen to fail and reverted
- `pnpm verify` passes with no database running

## Notes

The reason this is a separate task from 2.5.3 is that the data and the questions asked of it
fail differently: a wrong date in the table is a wrong answer on one day of the year, and a
wrong `nextSession` is a wrong answer every weekend. Keeping them apart means a red test
names which.

---

## What was built (2026-09-06)

`packages/shared/src/market-session.ts` and `packages/shared/src/market-session.test.ts`.
**37 new tests**, taking `packages/shared` to 159 across 9 files and `pnpm test` to **438**.
No dependency, no lockfile change, no new `verify` step, and `market-calendar.ts` and
`market-time.ts` are both **byte-identical** to where Tasks 2.5.2 and 2.5.3 left them.

### The shape

Six exported functions, one state type, and two time-of-day constants, with the consumer each
exists for written beside it so a seventh has to justify itself:

| Export                                        | Exists for                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| `marketSessionStateAt(instant)`               | Task 2.5.5's header clock, and Epic 13's "what was the state at 11:07"     |
| `marketSessionOn(date)`                       | Story 2.8 ("which minutes should have bars"), Story 2.12's axis            |
| `previousMarketSession` / `nextMarketSession` | stepping through history; Story 2.13's scrubber                            |
| `marketSessionsBetween(from, to)`             | Story 2.12's window; the per-year arithmetic cross-check                   |
| `lastMarketSessions(count, upTo)`             | **acceptance criterion 3**; Story 2.13's window control; Epic 5's baseline |

**The state at an instant is a discriminated union, not a boolean.** `isMarketOpen()`
collapses four things a user needs to tell apart — 04:00 on a normal Tuesday, Christmas Day,
Sunday, and 14:00 on a half day that already shut — so the union has five members
(`open`, `before_open`, `after_close`, `holiday`, `weekend`), the three weekday ones carry
the session, and `holiday` carries the calendar's own name. That is `SecuritiesView`'s shape
(Task 2.4.3) reused rather than re-derived: the impossible combinations cannot be
constructed, so Task 2.5.5 renders a case instead of inferring one from flags.

**A session is an object and `minuteBars` is derived from its own bounds**, so the count and
the times cannot disagree: 390 for a regular session, 210 for a 13:00 half day.

### The decision this task owed and the brief did not anticipate

**Walking off the end of the 2024–2028 calendar propagates the refusal rather than
truncating**, in all four walking functions, and it is asserted at **both** edges. The
argument is that a short list of sessions is a wrong answer wearing the shape of a right one
— indistinguishable at the call site, and it surfaces in Epic 5 as a baseline computed over
47 days that says it was computed over 60. That is the same failure criterion 3 exists to
prevent in the holiday case, arriving through the range instead. It is not exotic: Epic 5's
baseline is 60 trading days and asking for it from early January crosses the lower bound
routinely, which is asserted directly — `lastMarketSessions(60, "2024-02-01")` refuses, and
the same window from `2024-04-01` returns exactly 60, so the refusal is about the range
rather than about the request being unreasonable. **Task 2.5.5's clock is the one caller that
must not propagate**, and its file already says why.

Three smaller ones stated rather than discovered later. **`marketSessionsBetween` and
`lastMarketSessions` return oldest first**, where `CALENDAR.md` §7.1 case 16 lists its
expected answer newest-first — a person reads "the last five sessions" backwards and a time
series is plotted, ingested and iterated forwards, so returning any other order means every
consumer reverses it and one consumer forgets. **A reversed range is refused** rather than
answered with an empty array, because an empty result is a plausible answer that hides a
caller's swapped arguments. **`previousMarketSession` is strictly before** and
`lastMarketSessions` is **at or before**, because the first is "step back one" and the second
is "a window ending today", and collapsing them would need a special case in whichever lost.

### What was asserted, and what was made to fail

Every case in `CALENDAR.md` §7.1 that belongs to this task, each as its own named test so a
failure says which one broke: the ordinary session and its 390 bars; both weekend days and
the skip either side of them; Christmas Day and the adjacent half-day / closure /
ordinary-Monday run; **Good Friday in all five covered years**; both half-day producers; both
observance directions; both DST transitions; and the last-N-sessions week.

**The DST group is the one worth reading.** §7.3 had already corrected this task's own brief —
there is no session on a transition day at all, because every US DST transition is a Sunday —
so what is asserted is the **Friday before and the Monday after**, both 390 bars, with the UTC
open moving `14:30Z → 13:30Z` in March and `13:30Z → 14:30Z` in November while the ET bounds
do not move. **Case 11, the Tuesday after, is asserted too**, which is the one that catches an
implementation that special-cased the transition weekend and then had the new offset wrong
from the next day onwards. Every UTC instant in that group is written as a **literal** rather
than derived, because deriving them would mean re-running the conversion under test — which is
how a timezone suite comes to assert that the code agrees with itself.

**The per-year session count is re-reached through the session functions** rather than
inherited from `market-calendar.test.ts` — 252 / **250** / 251 / 251 / 251, which is a
different claim from the table's own: it catches a session walk that skips or repeats a day
even when every individual named date passes. 252 is not a constant, and 2025 is 250 because
of the National Day of Mourning that no rule set produces.

**Two deliberate breaks, each seen to fail and reverted**, both on the calendar table:

- **Good Friday 2026 removed** → 3 tests red, naming Good Friday, the session walk and the
  per-year count.
- **The 2026 day-after-Thanksgiving half day set to close at 16:00** → 3 tests red, naming
  the half day's bounds, the 14:00 state and the last-N-sessions bar counts.

`market-calendar.ts` was confirmed byte-identical to `git HEAD` after each revert. That
matters more than it sounds, because Task 2.5.3 recorded the trap: **a break that does not go
red is not evidence the check works, it is evidence the break did not land**, and the two are
indistinguishable from an exit code.

### Figures

`pnpm verify` is **exit 0 with no database running**. `pnpm test` is **438** (159 + 146 +
133), `pnpm test:process` 14.

**The frontend artefact did not move, and that is the check rather than a coincidence.** A
default build is **357,216 B** of JavaScript on an unchanged 18,058 B stylesheet — Task
2.5.3's figure to the byte — and a grep of the bundle for `before_open`, `after_close` and
`Good Friday` returns **zero**. Every function here is a function declaration, which is dead
code in a dead function and drops entirely; the three exported constants are plain object and
array literals, which tree-shake completely. That is Task 2.3.8's rule holding for the third
time: **a vocabulary declared as a literal is free to the browser and one declared through a
constructor is not.**

### The seam, stated once more because it is what Epic 13 reads

**Nothing in this module reads the clock** — confirmed by grep, and the only occurrence of
`Date.now` in the file is the sentence saying there isn't one. Every function is a pure
function of a market date or an instant it is given, which is `CALENDAR.md` §3's decision
applied: replay does not inject a clock into `marketSessionOn(date)`, it calls it with a
replay date. The seam is an **absence**, which is this repository's shape for the third time
after `securities.ts` not exporting its `Kysely` handle and `api-client.ts` being the only
file that calls `fetch`.

---

## For the stakeholder: what this actually did

**Nothing on screen changed, and this is the last invisible task in the story — the next one
is the visible payoff.** What landed is the thing every chart, every data backfill and the
whole replay feature stands on: **this codebase now has exactly one answer to "when is the
market open?"**, where before it had none and was on course to grow three.

Here is the problem in plain terms. The US stock market is open 09:30 to 16:00 New York time
— except it isn't, quite. It shuts for ten public holidays a year, and one of those (Good
Friday) moves around the calendar on the same cycle as Easter. It closes at 1pm on a handful
of afternoons — the day after Thanksgiving, Christmas Eve, sometimes the day before 4 July —
and those half days move too, and sometimes vanish entirely when a holiday lands on a
weekend. New York changes its clocks twice a year, so the opening bell happens at a
_different_ UTC time in summer and winter. And once in a while the market simply shuts with
eleven days' notice, as it did in January 2025 for President Carter's day of mourning.

Every one of those is a small thing that produces a wrong number quietly. **We now assert all
of them, by name, with a test per case**, so a future change that breaks one gets a red test
saying which.

**Why this matters commercially rather than technically.** Three things we have already
committed to are wrong without it:

- **The price charts.** A chart that draws a flat line across a weekend, or puts a bar on
  Christmas Day, is the kind of error a market analyst spots in two seconds and never trusts
  the product again after.
- **"Is this move unusual?"** — the anomaly score that is the heart of the product. It works
  by comparing today against the last 60 _trading_ days. If "60 days" quietly means 60
  calendar days, the comparison silently includes a dozen days the market was shut and the
  score is wrong in a way nobody can see. This task makes "the last 60 sessions" something
  the code can say precisely, and proves it against a real Thanksgiving week where the naive
  version is wrong three different ways at once.
- **Market Replay** — the feature the whole portfolio story is built around, where you wind
  the clock back to 11:07 on a past day and ask what was knowable _then_. Replay needs to
  hand every part of the system a different "now". Because none of the code written here ever
  looks at the real clock — it is always given the moment to work with — replay will be able
  to do that by passing a date rather than by rewriting the application.

**Two judgement calls worth knowing about.** First, when you ask for something the calendar
cannot answer — sessions in 2029, which nobody has published yet — **it refuses loudly rather
than guessing**. The tempting alternative, "no holidays listed that year, so every day is a
trading day", would turn every 2029 public holiday into a phantom trading day with no warning
at all. Loud today beats silently wrong for a year. Second, when you ask for "the last 60
trading days" and only 47 exist in our data, it **refuses rather than handing back 47**. A
short answer looks exactly like a correct one, and it would surface much later as an anomaly
score computed over the wrong window and attributed to something else entirely.

**Cost to the product: none.** No new third-party code, no new build step, and the file a
visitor's browser downloads is **byte-for-byte identical** to before — verified, not assumed.
This work lives entirely in the parts of the system that do the thinking.

**Next up, Task 2.5.5, is the one you can see**: the market clock in the top-right of every
screen — reserved but reading `--:--:-- ET` since the very first interface story — starts
telling the real time in New York, and starts saying whether the market is open, closed for
the night, closed for a holiday, or on a half day. That sentence is only writable because of
the five states this task defined.
