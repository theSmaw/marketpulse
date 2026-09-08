# Task 2.8.7 — Four reasons a bar is missing, and telling them apart

**Status:** Not started
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
