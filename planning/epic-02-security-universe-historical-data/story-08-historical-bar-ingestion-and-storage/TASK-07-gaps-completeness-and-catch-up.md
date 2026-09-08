# Task 2.8.7 — Four reasons a bar is missing, and telling them apart

**Status:** Complete (2026-09-08)
**Story:** [2.8 Historical Bar Ingestion, Storage & Backfill](STORY.md)
**Depends on:** Task 2.8.6

## Objective

Acceptance criterion 4, which is where correctness lives in this story:

> A market holiday, a half day and a genuinely untraded minute are each distinguishable from a
> failed fetch.

And the thing that depends on it — **incremental catch-up**, which is "fetch only what is
missing" and therefore cannot be written until "missing" has a definition.

## What the user can see when this lands

**Nothing on screen.** What exists is a command that reports what the store holds and what it
does not, and a catch-up that can be run repeatedly.

The report is the second showable artefact in this story after Task 2.8.6's progress output, and
Task 2.8.9 is what turns it into a page.

## The four causes, and why three of them look identical in the database

A missing bar has four causes and the database shows the same thing for all of them: no row.

1. **The market was closed** — a weekend, a holiday, or minutes outside a half day's early
   close. **`market-session.ts` distinguishes this completely**, and it is the only one of the
   four that is free. **And it distinguishes it for BOTH timeframes with no special case**,
   because Task 2.8.1 capped daily at 2024-01-01 rather than reaching to ~2016: every bar this
   story stores falls inside the calendar's range and therefore has a session to be checked
   against. Had daily gone deeper by bypassing the calendar, `1Day` would have been the one
   timeframe where this whole criterion had no answer.
2. **The security did not trade in that minute.** Real and rare on this feed: SIP measures
   **99.7% mean coverage with a longest gap of 2 minutes**, against IEX's 82.8% and 15 minutes.
   So an absent bar in anything this story stores is **notable rather than ordinary** — which is
   the opposite of what `PROVIDER.md` §6.4 expected, and it is what makes a threshold encodable.
3. **The fetch failed** — one of the eight `BarsResult` members, and the whole point of that
   taxonomy is that this case is loud at the moment it happens. **With one measured exception
   that this task must not inherit**: Task 2.8.5 found that a multi-symbol page can omit a
   symbol entirely, so a batch that concluded early reports it as a _successful_ empty answer.
   That is cause 3 disguised as cause 2, it is the one failure in this story that survives every
   check, and 2.8.5 is where it is prevented rather than detected. **It stops being loud the moment
   the command exits**, which is what this task fixes: a failed session has to leave a trace in
   the store, not only in a terminal somebody has closed.
4. **The fetch never happened** — the window was never walked, because a backfill was
   interrupted, or a symbol was added after it ran. Task 2.8.4's ledger is what distinguishes
   this from 3, and only if 3 writes something.

**Distinguishing them is not a column on `market_bars`**, because the row does not exist. It is
a computation: for each `(security_id, timeframe, session)`, what the calendar says should exist,
what the ledger says was attempted, and what the bars say arrived.

## The half day, which is the case most likely to be missed

**Eleven days across the covered range close at 13:00 ET and have 210 bars.** A check that
expects 390 a session reports **180 phantom gaps on each of them**, and Epic 5's volume baseline
then treats a normal early close as a data outage.

`marketSessionOn(date).minuteBars` already knows — **390 for a regular session, 210 for a half
day, derived from the bounds rather than stored beside them.** Ask it. Do not re-derive it and
do not store it.

**And the session count is not 252.** The real per-year figures are 2024: 252, 2025: 250,
2026: 251, 2027: 251, 2028: 251, because 2025 carries an **unscheduled** full closure — the
National Day of Mourning on 2025-01-09, announced eleven days beforehand, which no rule set can
produce in principle. **If anything here pins a session count, pin the per-year table.**

## What a failed session has to leave behind

This is the piece that does not exist yet and is the reason this is a task rather than a query.

Task 2.8.6's backfill meets all eight `BarsResult` members. Today a failure is a line of output.
For criterion 4 it has to be a **record**, and the smallest thing that works is an attempt log:
`(security_id, timeframe, session_date, outcome, attempted_at)`, written for a failure and
either written or not written for a success — decide which, and the cheaper answer is
**failures only**, because successes are already recorded by the bars themselves and a row per
symbol per session per timeframe is another ten million rows.

Three properties:

- **The outcome is the taxonomy's member, stored as text with a check** — the same
  vocabulary-plus-constraint shape `timeframe` and `kind` use, against `BarsResult`'s eight
  members, which creates the same unchecked pair and closes it the same way in a database test.
- **A later success clears it**, or the log accumulates a permanent record of a transient
  failure and every report reads worse than the store is.
- **`upstream-unavailable` and `rate-limited` mean "come back"; `unauthorised` means "stop".**
  A report that treats them alike sends somebody looking at a network when the key is wrong.

**And two members of the taxonomy that are not producible from the bars endpoint are producible
here.** `unknown-symbol` answers `200` with an empty `bars` object, **byte-identical** to a real
symbol with no prints in range — which is why Task 2.7.6 named it unproducible rather than
leaving it looking implemented. **This story is the first thing that could tell them apart,
because it knows which symbols are in the universe**: a symbol we curated returning empty across
_every_ session is a different thing from one returning empty on a Tuesday. Whether that becomes
a member or stays a line in a report is this task's to decide; the argument against promoting it
is `PROVIDER.md` §8.5's — a member is added when a failure can be **produced**, and this is an
inference over many requests rather than a fact about one.

## The completeness report

A command — `pnpm bars:check`, or whatever fits beside `pnpm universe:check`, which is the
precedent worth following in **four** respects:

- **It reads and changes nothing**, so it can be run at any time against any environment.
- **A finding does NOT change the exit code.** The exit code answers _did the check run_, never
  _did it find something_ — `/diagnostics/database`'s rule, and the guard against somebody
  wiring it into CI where it goes red on a thin security having a quiet Tuesday.
- **It is not and never can be a `pnpm verify` step**, because `verify` runs with no network,
  no credential and no database.
- **Its comparison function is pure and takes both sides as parameters**, which is what lets the
  fast suite make findings happen that the real store has no instance of. `validateUniverse` and
  `compareUniverseToVendor` both have that shape for that reason.

What it reports, per symbol and timeframe: sessions expected from the calendar, sessions held,
sessions attempted and failed, and — for a held session — bars held against `minuteBars`.

**Do not report a bar count as a percentage without saying which side of 100 it can be on.**
More bars than minutes is a genuine invariant violation: it means the timestamp mapping or the
window shape is wrong, and it is exactly what a span-shaped request produces. Fewer is ordinary
at 98.5–100%.

**The threshold, and the one constraint on it.** SIP's density makes a threshold encodable, and
Story 2.7's spent instruction is replaced by a narrower one rather than an unlock: **if a
threshold is encoded it is SIP's, and Epic 3 must not reuse it** — its live stream is a sibling
provider entitled only to IEX, whose density is a different number by a measured factor.

## Incremental catch-up

Now definable: fetch the sessions the calendar says exist, the ledger says were not attempted or
failed, and the bars do not hold.

Two things it is not:

- **It is not the naïve shape**, which is the refused one. _"From the last bar I stored, to
  now"_ is a flat `403` carrying `subscription does not permit querying recent SIP data`, keyed
  on `end` **alone**, refusing the **whole** request rather than answering partially, and
  applying to daily too. Every single time. `alpacaServableEnd` is what makes it work, and the
  16-minute clamp is reported as `coverage.covered` rather than swallowed.
- **It is not a different program from the backfill.** It is the same walk with a different
  starting point, and the reason to say so is that two programs is how the two disagree about
  window shape.

**The catch-up's home is THIS task's decision**, and that is an ownership transfer rather than a
restatement: Task 2.8.1 settled where the _initial backfill_ runs — a local command against the
deployed database — and **deliberately deferred the catch-up**, on the argument that a one-off of
hours and a repeated job of minutes are different shapes and deciding them together is how the
one-off ends up in the pipeline. So this task inherits the open half.

A catch-up is minutes, so the pipeline objection that kills a full backfill is weaker for it. It
is still not free — it is metered traffic on every merge — and it would put a vendor's
availability inside a deploy. The honest answer may be that neither runs automatically in V1,
with a person running the catch-up before a demonstration; if so, say it in those words, because
an unscheduled catch-up is the thing that makes the store quietly stale.

## The `delisted` signal, which Task 2.7.8 moved here

Task 2.7.8 declined `delisted` as a `SECURITY_STATUSES` member and **moved the ownership here
rather than deferring it**, on a new argument: **bars stopping is better correlated with reality
than the vendor's flag** — 100% against 92% on a 50/50 sample — it costs no request, and it
arrives as a consequence of ingestion this story is doing anyway.

This task is the first thing that can see it. Whether to adopt the member is a decision, and
**`UNIVERSE.md` §15.3's produced overwrite is what has to be solved first**: a `status` written
by anything other than the loader is silently reverted by the next deploy's `pnpm universe`,
reported as an ordinary `1 updated`. Produced, not argued. So adopting `delisted` is two
decisions, not one, and the recommendation is to **report it and not write it** — Task 2.1.7's
shape, where the instrument says _whether_ and a person decides _what to do_.

## Work

- The attempt log: migration, `schema.ts`, the outcome vocabulary and its constraint check
- The backfill amended to write it, and to clear it on a later success
- `compareStoreToCalendar` — pure, both sides as parameters, tested against synthetic stores that
  have holidays, half days, thin minutes and failures in them
- The report command, following `pnpm universe:check`'s four properties
- Catch-up, as the same walk from a different start
- The `delisted` signal reported, with the overwrite problem stated
- Deliberate breaks: a 390-bar expectation applied to a half day (which must report 180 phantom
  gaps and therefore go red), a failure that leaves no trace, and a report whose exit code
  changes on a finding

## Done when

- All four causes are distinguishable, demonstrated one at a time: a holiday, a half day, a thin
  security's genuine gap, and a session failed on purpose by pointing at a wrong key
- The report is correct after a partial failure, which is criterion 5's second half
- Catch-up run twice in a row fetches nothing the second time
- No test asserts a real bar count against `minuteBars`
- `pnpm verify` is exit 0 with no network

## Notes

Criterion 4 reads like a reporting requirement and it is a **correctness** requirement, because
Epic 5's volume baseline divides by the median volume for a time of day. A session stored as
zero bars because a fetch failed is not a gap in a chart — it is a zero in a denominator, and it
makes an ordinary day look like the most unusual one in the sample. That is a false anomaly with
a plausible explanation attached, which is the worst output this product can produce, and it
originates here rather than in Epic 5.

---

## Amended 2026-09-08 by Task 2.8.2 — "complete" cannot mean 390 bars, and that is measured

This task's sharpest warning is the half day: a check expecting 390 a session reports **180
phantom gaps** on each of eleven days, and the fix is to ask
`marketSessionOn(date).minuteBars` rather than to assume. **That is right and it is not
enough**, and re-curating the universe to 518 S&P 500 constituents is what made the rest
visible.

**Most constituents are missing minutes on an ordinary regular session, on SIP.** Measured
against the live API for 2026-09-03 — a full regular session — each symbol fetched alone and
walked to `next_page_token: null`, so these are exhausted answers rather than truncated pages:

| Symbol |    Bars | Span          |
| ------ | ------: | ------------- |
| `AAPL` | **390** | 13:30 → 19:59 |
| `ACGL` | **385** | 13:30 → 19:59 |
| `ABBV` | **384** | 13:30 → 19:59 |
| `AME`  | **344** | 13:30 → 19:59 |

Across the 28 symbols served on one 10,000-row page, **only 8 of 28 returned a full 390** —
and every short one spans the whole session, so the minutes are genuinely absent rather than
cut off. `AME` is missing 46 of them.

### What that changes about this task

**Not the structure — the vocabulary.** The three-way computation this task defines (what the
calendar says should exist, what the ledger says was attempted, what the bars say arrived) is
exactly right and is what survives. What does not survive is treating _calendar minus arrived_
as a **gap**, because on that definition the universe is permanently ~5% incomplete on every
session and the report is red forever — which is the same failure as the half day, arriving
on the other 240 days of the year.

So the report needs a distinction the body does not currently draw:

- **Not fetched.** No ledger entry for `(security, timeframe, session)`. This is the only
  state a catch-up run should act on, and the only one that means something is wrong with us.
- **Fetched, and thin.** The ledger says the session was attempted and the vendor answered;
  the count is below `minuteBars` because the security did not trade in every minute. **This
  is the normal state of most securities on most days** and it is a fact about liquidity
  rather than about our ingestion.

**A percentage against `minuteBars` is therefore a liquidity measure, not a completeness
measure**, and labelling it "completeness" is how somebody later re-fetches 240 sessions that
were already complete. Completeness is a question about the **ledger**; thinness is a question
about the **bars**. Keep them in separate columns and say which is which.

### The deliberate breaks this adds

The body lists a 390-bar expectation applied to a half day. Add its sibling: **a 390-bar
expectation applied to a thin regular session**, which must report the security as _fetched
and thin_ rather than as having 46 gaps — using `AME` on 2026-09-03 as the fixture, because it
is a real measured case rather than an invented one.

---

## Amended 2026-09-08 by Task 2.8.4 — what the ledger actually holds, and the one case "failures only" misses

The ledger shipped. Three corrections, and the second is a hole in this task's own recommendation.

### 1. "No ledger entry for `(security, timeframe, session)`" — the ledger is not per session

The 2026-09-08 amendment above defines **not fetched** as _"no ledger entry for `(security,
timeframe, session)`"_. There is no such entry and there never will be: `bar_coverage` holds
**one row per `(security_id, timeframe)` with one contiguous covered window**, because a row per
symbol per session per timeframe is another ten million rows — the same argument this task
already makes against logging successes.

The correct reading is the same computation with the right query behind it:

> **Not fetched** — the session's `[open, close)` lies **outside** the ledger's covered range
> for that `(security, timeframe)`.
> **Fetched** — it lies inside it.

Everything else in that amendment survives unchanged, including the distinction it exists to
draw: completeness is a question about the **ledger's range**, thinness is a question about the
**bar count**, and a percentage against `minuteBars` is a liquidity measure. Only the shape of
the lookup changes.

The overnight and the weekend between two adjacent sessions fall inside the range and contain no
session, which is why one contiguous window can answer a per-session question at all. Task
2.8.4's contiguity check is what keeps that true: a walk that skips a session is refused rather
than producing a range with an unfetched session inside it.

### 2. "Failures only" is not enough, because an EMPTY SUCCESS is recorded nowhere

This task recommends logging failures only, _"because successes are already recorded by the bars
themselves"_. That is true of every success **except one**, and the exception is exactly the case
criterion 4 is about.

A session the vendor answers successfully with **no bars** writes no bars — and it does not
extend the ledger either, because `BarSeries` gives an empty series no `covered` window and
inferring one from `requested` is the bug Task 2.7.5 measured. So it is recorded in **neither**
table.

It is usually recovered anyway: a later session on the far side of it extends the range **across**
it, because the range is a union. What is not recovered is an empty session at the **frontier**
of the walk — the oldest or newest attempted — which reads as _not fetched_ when it was fetched
and genuinely empty. Those are the two states this criterion exists to tell apart.

**So the attempt log records a successful empty answer as well as a failure**, and that is a
correction to this task's cheaper answer rather than a new idea: the row set becomes _"every
attempt that left no bars"_, which is still a tiny fraction of the sessions and is the smallest
thing that closes the gap. The alternative — leaving it — is a report that says _"we never asked"_
about a day we asked about and were told nothing happened.

### 3. Two tables, two jobs, and they are not interchangeable

`bar_coverage` (Task 2.8.4) answers **how far our history reaches**, in one row per series, read
by Task 2.8.9 to render a page. The attempt log this task adds answers **what happened on a
particular session**, sparsely, read by an operator. Neither can do the other's job: the ledger
cannot name a session and the log cannot state a range without a scan.

Two things the ledger already gives this task for free, so they do not need re-deriving:
`listCoverage()` returns every statement in a few hundred rows, and the ledger's `updated_at`
moves **only when the statement actually changed** — so a catch-up that fetched nothing leaves
the table byte-identical, which is the shape "catch-up run twice fetches nothing the second time"
should be asserted on.

### 4. The failed-session case is now partly loud rather than wholly silent

The body says a failure _"stops being loud the moment the command exits"_. That is still the
reason the attempt log exists, and it is now less true in one useful way: because a failed
session does not extend the ledger, the **next** session's write for that symbol is refused by
name with `CoverageGapError`. So a mid-walk failure surfaces during the run rather than only in
a later report — one session late, and named as a gap rather than by its cause, which is why the
log is still needed to say _why_.

---

## Amended 2026-09-08 by Task 2.8.6 — the catch-up mostly EXISTS, and "not fetched" is now provable rather than merely defined

The backfill shipped. Four things change here and the first two shrink this task's Work list.

### 1. Incremental catch-up is already built, and what is left is the HOME decision

This task's body says the catch-up _"is not a different program from the backfill — it is the
same walk with a different starting point"_, and treats that as an instruction. **It is a
description of what shipped.** `planRequests` emits **two** monotonic walks: the sessions newer
than the ledger's covered range, oldest request first, and then the sessions older than it,
newest request first. The first of those **is** the catch-up. Run a week after the last run,
`pnpm backfill --sessions N` fills the newer gap before it deepens anything, measured — a run
that already held three of five sessions reported `3 fetches, 3 sessions fetched, 3 already
held` and walked exactly the ones it did not have.

So the Work list's _"Catch-up, as the same walk from a different start"_ is **done**, and what
this task actually inherits is the half Task 2.8.1 deliberately deferred and the body already
names: **where it runs, and how often.** That is a decision rather than code, and the body's own
honest answer — that neither runs automatically in V1, with a person running it before a
demonstration — is now the cheaper one, because there is nothing left to build for it.

**One thing to say in those words if that answer is taken:** an unscheduled catch-up is what
makes the store quietly stale, and the ledger's `updatedAt` is the only field that can report it
honestly (it moves only when the statement actually changed, so it is _"when what we hold last
changed"_ rather than _"when the backfill last ran"_). Task 2.8.9 has the same field available.

### 2. "Not fetched" is not merely defined by the ledger's range — it is GUARANTEED by it

Task 2.8.4's amendment corrected the lookup shape: **not fetched** is _the session's
`[open, close)` lies outside the ledger's covered range_. What the backfill adds is the reason
that lookup is **sound rather than approximate**, and it is worth stating because it is what
lets `compareStoreToCalendar` be a simple function:

> **Every session inside the ledger's covered range was attempted.**

Not "probably". The walk extends the range **one contiguous step at a time from one of its two
ends**, and `market-bars.ts` refuses by name any write that would leave a trading session in the
gap. So a range with an unfetched session inside it cannot be constructed by this command at
all — which means the report never has to distinguish _inside the range and never asked_ from
_inside the range and asked_. There is no such state.

The consequence for this task: **`compareStoreToCalendar` is a set difference against one
interval per `(security, timeframe)`, not a per-session join.** The expensive-sounding version
of this computation is not needed.

### 3. The blocked set is the concrete instance of "loud until the command exits"

The body says a failure _"stops being loud the moment the command exits"_ and that the attempt
log is what fixes it. There is now a specific, shipped thing that is exactly that, and it is the
strongest argument for the log rather than a generic one.

The backfill catches `CoverageGapError` per symbol, **drops that symbol from every subsequent
request in the run**, and prints it with its missing sessions. That set lives in memory. When the
process exits it is gone, and the only trace is a terminal somebody closed — while the symbol
itself is now **permanently behind the rest of the universe**, because its ledger stopped
extending and every later run will hit the same gap at the same place.

So the attempt log has a second reader this task did not anticipate: **not only "why was this
session missing" but "which symbols has the backfill given up on, and where".** A blocked symbol
is a state that persists in the data (as a shorter covered range) and is explained nowhere.
Recording it is what turns a silent divergence into something the report can name.

### 4. Empty successes are counted but not stored, which confirms 2.8.4's correction

Task 2.8.4's amendment §2 said the log must record a **successful empty answer** as well as a
failure, because such a session writes no bars and does not extend the ledger, so it is recorded
in neither table. The backfill now surfaces that as a counter — `N symbol-sessions answered with
no bars` — and stores nothing.

That is the handover in its most useful shape: the command already knows the set, it already
tells a person about it, and the log is the one place left to put it. **The counter also makes
the size of the problem measurable before the log is built**, which is the cheap way to check
whether "failures and empty successes only" really is a tiny fraction of sessions.

### 5. Two smaller things

**The report command's name is still to be checked.** `bars:check` was proposed here; `backfill`
was claimed at Task 2.8.6 and `bars` at 2.7.3, so run the `pnpm help -a` detection **with its
control** before claiming a third — the check that failed its own control at Task 2.7.8 and has
been validated in every claim since.

**A percentage against `minuteBars` has a measured denominator now.** The 2026-09-08 amendment
above predicted most constituents would be thin; at universe scale the mean is **364.3 bars per
security-session** (188,726 ÷ 518 on a full regular session). So _fetched and thin_ is not an
edge case to allow for — **it is the normal state of roughly 93% of the universe**, and a report
that leads with a completeness percentage against 390 leads with a number that is never 100.

---

## What shipped, 2026-09-08

Six new files, four amended, **no dependency and no lockfile change**. The full record — the
measurements, the corrections and the demonstrations — is `BARS.md` §7; what follows is the
inventory and then the stakeholder report.

| File                                | What it is                                                          |
| ----------------------------------- | ------------------------------------------------------------------- |
| `migrations/0006_bar_attempts.sql`  | The attempt log: nine-member vocabulary, sparse, cleared on success |
| `src/bar-attempts.ts`               | Its vocabulary, its two classifiers and its repository              |
| `src/bar-completeness.ts`           | `compareStoreToCalendar` — pure, both sides as parameters           |
| `src/check-bars.ts`                 | `pnpm bars:check`: the reading and every sentence a person reads    |
| `scripts/check-bars.mjs`            | The wrapper — a name, a built-output guard, the exit code           |
| `src/bar-attempts.database.test.ts` | The four causes, one at a time, **from a real database**            |

`backfill.ts` writes the log and clears it; `market-bars.ts` gained `readLastBarDates`;
`schema.ts` gained `BarAttemptsTable`; `package.json` gained one script.

`pnpm verify` is exit 0 with no database. `pnpm test` is **861** (206 + 472 + 183),
`pnpm test:database` **141 across 6 files**, `pnpm test:process` 14.

### The Work list, item by item

- **The attempt log** — shipped, with the vocabulary/constraint pair closed in a database test
  that parses the constraint **Postgres rewrote** rather than matching the migration's text.
- **The backfill writes it and clears it** — and the writes are queued and flushed once per
  request, because a round trip per symbol would put 518 of them inside a loop that already
  spends fifty seconds on the vendor.
- **`compareStoreToCalendar`** — pure, tested against synthetic stores holding holidays, half
  days, thin sessions, failures and a series behind the rest.
- **The report command** — `pnpm universe:check`'s four properties, each stated in the file.
- **Catch-up** — **already existed** (Task 2.8.6's forward walk). What this task owed was the
  **home**, and the answer is that neither runs automatically in V1. See `BARS.md` §7.6.
- **The `delisted` signal** — reported and never written, with the overwrite problem stated in
  the report's own output.
- **Deliberate breaks** — four, each seen to fail and reverted: a hard-coded 390 (2 tests red,
  including the half day, once the fixture was made independent of the function under test); a
  failure that leaves no trace (1 red); a report whose exit code changes on a finding (4 red);
  and the thin-regular-session sibling, which is asserted as _fetched and thin_ rather than as 46
  gaps.

### The one thing to read before extending this

**The `delisted` proxy produced a false positive on the day it was written**, and the fix is a
third value rather than a better threshold. It reads **daily** bars because the same query over
minute bars is a full table scan (192 ms over 863k rows here, ~11 s extrapolated to a year of the
universe) — but a store with minute bars and no daily backfill has no daily row for anything, so
"no daily bar" meant _we never asked_ and it reported **AMD and MSFT as delisted** while they held
3,900 and 3,120 minute bars. `lastBarAt` is now `Date | null | absent`, and the report **prints
its own blind spot** rather than staying silent, because a reader who sees no findings would
otherwise conclude that nothing has stopped printing.

---

## For the stakeholders — what this actually does, in plain English

### The problem, in one sentence

Until today, if MarketPulse had no price data for a particular stock on a particular day, the
database gave exactly the same answer for four completely different reasons — and we had no way
to tell which one it was.

### Why that matters more than it sounds

Those four reasons are:

1. **The market was shut.** Christmas Day, a Saturday, the afternoon of Christmas Eve.
2. **Nobody traded that stock in that minute.** Perfectly normal — most companies do not trade
   in every single minute of the day.
3. **Our download failed.** The vendor was busy, or our key was wrong, or the connection dropped.
4. **We never asked.** The download was interrupted, or the stock was added to our list
   afterwards.

Reasons 1 and 2 are the market behaving normally. Reasons 3 and 4 are **us being broken**. And in
the database all four looked identical: nothing there.

That is not a cosmetic problem, and here is the concrete harm. Later in the roadmap, MarketPulse
flags "unusual" trading by comparing today's volume against a typical day's. If a day's data is
missing because our download failed, the system reads it as _a day on which almost nothing
traded_ — which is one of the most unusual things a stock can do. So it flags a false alarm, and
attaches a confident-sounding explanation to it. **A confident wrong answer is the single worst
thing this product can produce**, and it would have originated here, in a piece of plumbing, five
epics before anyone noticed.

### What we built

Two things.

**A logbook.** Whenever the system tries to download a day's prices and comes back with nothing,
it writes down what happened — and crucially, _whether the vendor said "there were no trades" or
whether the download failed_. If a later download succeeds, the note is torn up, so the logbook
only ever holds things that are still true. When everything is working it is completely empty.

**A report.** A new command, `pnpm bars:check`, that reads the store and says in plain terms what
we hold, what we do not, and why. It changes nothing — it cannot, by construction — so it is safe
to run at any time against any environment, including live.

### The judgement call we are most pleased with

The obvious way to build this report is to say: a normal trading day has 390 minutes, so count
the minutes we hold and report the shortfall as a gap.

**That would have been wrong on almost every day of the year.** We measured it against the real
market: on an ordinary full session, only 8 of 28 large US companies actually traded in all 390
minutes. The typical figure is 364. So a report built that way would announce that our data was
permanently 7% broken, every single day, forever — and the entirely predictable result is that
people stop reading it, and then miss the day it is telling the truth.

So the report keeps two numbers apart and gives them two different names:

- **Completeness** — did we ask for this day at all? This is the one that means something is
  wrong with _us_.
- **Density** — of the minutes in the days we did fetch, how many had trades? This is a fact
  about how heavily a stock trades, not about our software.

Same distinction applies to the shortened trading days. There are eleven a year that close at
1pm and hold 210 minutes rather than 390. Naive software reports 180 missing minutes on each of
them. Ours asks the trading calendar what that particular day _should_ hold, so it reports
nothing at all — verified live against the day after Thanksgiving.

### We caught one of our own mistakes with it

The report also tries to answer "has this company stopped trading altogether?" — which is how
you spot a delisting without paying a data vendor for the privilege.

On the first live run it confidently reported **two perfectly healthy companies as delisted**. The
cause was a shortcut: that check reads the cheap daily price data, and our test store had only
ever downloaded the expensive minute-by-minute data, so "no daily prices" was being read as "no
trading" when it actually meant "we never downloaded that".

We fixed it, and the more valuable part of the fix is that the report now **states its own blind
spot out loud** when it cannot answer that question, rather than staying quiet. A reader who sees
no warnings should be able to trust that there is nothing to warn about — a silent check that
cannot see anything looks exactly like a check that found nothing wrong.

### What we deliberately did not do

The report can see that a company has stopped trading. It does **not** update that company's
record to say so. That is not laziness — we tried the alternative and it silently undid itself:
our tracked-company list is reloaded from a file on every deployment, so anything written by
another part of the system is quietly overwritten within hours. So the report tells a person, and
the person edits the list. The instrument says _whether_; a human decides _what to do_.

We also decided **not** to schedule the top-up download automatically. It costs real money per
request against our data vendor, and putting it inside a deployment would mean a deploy could fail
because a third party was having a bad afternoon. In V1 a person runs it before a demonstration —
and this report is how they find out whether they needed to. We have written down the cost of that
choice honestly: an unscheduled top-up is what lets the data go quietly stale, and the store
records _when what we hold last changed_ so that staleness is at least visible rather than
invisible.

### Where this leaves the product

Nothing new is on screen today. What is now true is that **the historical price data underneath
the product can be trusted, and where it cannot, it says so.** That is the last piece of
groundwork before the next task turns it into something you can look at: a page showing how much
history MarketPulse holds for each of the 518 companies it tracks.

It is also the quiet precondition for the headline features. The anomaly detection in Epic 5 is
only as honest as the data underneath it, and the market replay in Epic 13 — reconstructing what
was knowable at 11:07 on a particular morning — is only meaningful if we can say with confidence
that a gap in the record is a gap in the _market_ rather than a gap in our _downloading_. As of
today, we can.
