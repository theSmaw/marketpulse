# ADR 0017 — The trading calendar, market time, the clock seam, and what a correct calendar certifies

**Status:** Accepted
**Date:** 2026-09-06
**Delivered by:** Epic 2, Story 2.5 (Tasks 2.5.1–2.5.6)

## Context

Story 2.5 is an **addition to Epic 2's stated scope**. It exists because three later
bodies of work each need one definition of "a trading day" and none of them is the right
place to invent it:

- **Story 2.8** cannot decide which minutes should have bars without a session definition.
- **Story 2.13**'s "the last 5 days" is wrong if it means five calendar days.
- **Epic 13**'s temporal isolation — invariant 4, the one the whole replay capability rests
  on — is a comparison against a **market** clock rather than a wall clock.

`PRODUCT_SPEC.md` puts numbers under all three. §5.1 specifies a baseline as
`calculate_return_percentile(NVDA, 5m, 60 trading days)` — trading days, not calendar days.
§21's replay sketch runs a scrubber from 09:30 to 16:00. §9's header mock reads
`10:42:16 ET`. §22 states the constraint the whole product is designed around: _"No system
component may use information from after the replay timestamp"_, enforced _"at the tool/data
layer rather than merely included in the LLM prompt"_.

The story is small and it is not optional. `STORY.md` puts it plainly: _"It is here because
the alternative is three inconsistent copies of it."_

Two properties of the tree shaped every decision below.

**`packages/shared` is consumed as built output and is inlined into the frontend bundle.**
ADR 0016 measured the mechanism precisely — a vocabulary declared as a plain array literal
is tree-shaken out completely, one built by _calling_ a function is not. A holiday table is
browser code whether or not the browser asks for it, so how it is declared is a shipping
decision rather than a style one.

**This repository already holds two invariants by absence rather than by mechanism.** Task
2.4.1's temporal seam is held by `securities.ts` not exporting its `Kysely` handle; Task
1.12.2's transport rule is held by exactly one file calling `fetch`. Both are guarantees
about what is _missing_. The clock seam below is the third instance, and it is the one
invariant 4 rests on.

The full working record — the rejected candidates, the measurements, the named dates and
their derivations — is
[`planning/epic-02-security-universe-historical-data/story-05-trading-calendar-and-market-time/CALENDAR.md`](../../planning/epic-02-security-universe-historical-data/story-05-trading-calendar-and-market-time/CALENDAR.md).
That file is Story 2.5's `HOSTING.md`. **This ADR records the decisions consumed outside
this epic; it does not copy that document**, because duplicating a paragraph for legibility
is how Epic 1 ended with twelve near-identical blocks.

---

## Decisions

### 1. The calendar is a checked-in table of exceptions covering 2024–2028

Not a provider endpoint and not a computed rule set.

A **provider endpoint is circular**: the only provider in this system is Alpaca, which
arrives in Story 2.6, which depends on this story. It also loses acceptance criterion 5 —
these must be fast unit tests with no database and no network.

A **computed rule set** is the tempting answer and it is wrong for a reason that is easy to
underestimate. Nine of the ten annual US market holidays are trivially derivable. **Good
Friday is not** — it is Easter-derived, so a rule set that gets the other nine right looks
completely correct for eleven months of every year and is wrong on one spring Friday, at
which point the product draws a bar on a day the market was shut.

**Task 2.5.3 then found something stronger than Good Friday, and it is the finding that
retires the rule set in principle rather than in practice.** The US equity market was fully
closed on **Thursday 9 January 2025** for the National Day of Mourning for President Carter
— announced on 2024-12-30 and effective eleven days later. **No function of the calendar
produces that row.** It is not an awkward rule; it is a decision a person took. A table read
off the published record holds it. Nothing derived can.

The **range is 2024–2028 inclusive**, and each end has a reason. Backward to 2024 because
Epic 5's baselines are 60 trading days and Epic 13 wants a deep pool of sessions to replay —
roughly 670 of them, at a cost of ten rows a year. Forward to 2028 because NYSE publishes
about three years ahead, so the far end can be **checked** rather than derived. `2028-01-01`
falls on a Saturday and New Year's Day on a Saturday is _not_ observed on the preceding
Friday — that Friday is in the previous year — which is exactly the sort of thing a
derivation gets wrong and a published calendar does not.

The shipped table is **61 rows: 50 full closures and 11 early closes**, per year `10 / 11 /
10 / 10 / 9` and `3 / 3 / 2 / 1 / 2`. **Task 2.5.6 corrected that count from the recorded
60/49/11, and the correction is worth more than the number** — see _Measured_ below.

### 2. One table with a `kind` discriminator, holding exceptions only

Full closures and early closes are one table with two kinds, not two tables. That is
`SECURITY_KINDS`' argument reused for `SECURITY_KINDS`' reason: two tables means asking "is
this day an exception?" twice, and eventually somebody forgets the second ask.

It is a **discriminated union**, so the compiler refuses a full closure carrying a close time
and an early close missing one. A row that means nothing cannot be written.

**A row is an exception. A normal session is the absence of one, and a weekend is not a
row.** Listing weekends would be 260 rows a year of information that is a rule.

**The dates are plain strings and branding happens at the point of use.** Measured: branding
them at rest ships roughly 1.5 kB to every visitor for a table no frontend code reads
directly. Validation is a **lazy one-time pass** — real weekday dates, ascending, no
duplicates, in range, parseable close times — that throws naming the offending row. The
weekday check earns its place twice over: a Saturday row means the observance rule was
misapplied, and a **Sunday** row is the only way `instantFromMarketTime` could ever be asked
to resolve a DST transition.

### 3. A date outside the covered range is a REFUSAL, with no fallback and no flag

This is acceptance criterion 4's real content and it is the half most calendar
implementations skip.

The plausible wrong answer is _"no holidays recorded that year, so no closures"_, which turns
every 2029 holiday into a phantom trading session — silently, and surfacing in Story 2.12 as
a chart with a bar on Christmas Day. The other plausible wrong answer, "assume closed", loses
a whole year of sessions.

So `MarketCalendarRangeError` names **the covered range, the file to edit, and the
provenance field to move when you do**. There is no fallback, no `strict` flag and no
"assume open outside the range" option: **a flag whose unsafe setting is available is a flag
somebody sets during an incident.**

### 4. Pre- and post-market are OUT for V1, so a session is 390 bars and a half day is 210

The deciding argument is the **feed**, not simplicity. `PRODUCT_SPEC.md` §7.1 puts us on
Alpaca's free tier, which is **IEX — a single venue**. IEX's extended-hours volume is thin
enough that an Epic 5 volume baseline built on it measures the venue rather than the market,
which is the anomaly detector reporting on our data source. §21's own replay sketch already
runs 09:30–16:00.

> **Amended 2026-09-09. The decision stands; the argument above does not.** Story 2.7
> measured the plan and it is **asymmetric**: historical bars come from **SIP, the full
> consolidated tape**, on the free tier, and only the live stream is IEX (`ALPACA.md` §2).
> So "IEX — a single venue" is true of Epic 3's stream and false of every bar this epic
> stores, and the thin-extended-hours objection does not apply to stored data — SIP serves
> pre- and post-market prints, and they are a majority of a night-spanning window's bars.
>
> **What keeps the conclusion is §2 of `CALENDAR.md`, which never rested on this**: a
> baseline denominator wants a session's minutes, comparably, every day, and a thin
> pre-market hour makes a percentile worse whether or not the bytes are free. The reversal
> trigger is therefore **Epic 5's measurement alone** — opening-gap anomalies turning out
> to be systematically unexplainable without extended hours. `CALENDAR.md` §2.4 carries the
> re-stated trigger; this note exists so a reader of the ADR is not left with the premise.

**`minuteBars` is derived from the session's own bounds** rather than stored beside them, so
the count and the times cannot disagree and Story 2.8 never re-derives it.

### 5. Exactly one module converts between UTC and market time, and it is ENFORCED

`packages/shared/src/market-time.ts` is the one place a UTC instant becomes market wall time
or the reverse. That is acceptance criterion 2.

**The story's own planning document predicted this would be prose held by a grep, and it is
not.** It is held by two `no-restricted-syntax` rules in `eslint.config.mjs` naming that file
as their single exception: one forbids constructing an `Intl.DateTimeFormat` anywhere else in
the workspace, one forbids spelling `America/New_York` anywhere else. Both were made to fail
in two packages before being believed, and re-made to fail at Task 2.5.6.

The route to that is itself worth recording: a grep **test** was written first and does not
work where it would have to live. Greping the tree needs `@types/node`, and `packages/shared`
deliberately has none because it is inlined into the browser bundle — so holding one boundary
that way would have breached another. A lint rule has no such problem.

**What the rules cannot see** is a conversion written with a hard-coded `-5` and no timezone
name at all. That is a reimplementation rather than a duplicate, and it is stated here rather
than left for somebody to discover.

**No dependency was added**, and that was measured rather than assumed. `Temporal` is
unflagged in Chrome 148 and **flagged in Node 24**, which is worse than neither runtime
having it, because this package is consumed by both. luxon is +262 kB against a 357 kB
bundle. `@date-fns/tz` is small and is a **wrapper over `Intl.DateTimeFormat`** — so the
cheap library pays a dependency to make the call we would otherwise make ourselves.

`Intl.DateTimeFormat` construction is **memoised lazily, inside the function, on first use**
— 14.2× cheaper than reconstructing, and deliberately not a module-load `const`, which is
`SECTOR_ETFS`' shape and would be retained in a build that never uses it.

### 6. The spring gap and the autumn fold are REFUSED, not resolved

Converting a market wall-clock time to an instant has two inputs that do not have one answer.
On the spring-forward morning, 02:30 ET **does not exist**. On the autumn morning, 01:30 ET
**happens twice**.

**No library refuses these on your behalf** — luxon and `@date-fns/tz` both resolve them
silently, and so does the obvious hand-rolled approach. `instantFromMarketTime` refuses both,
naming which case it was.

**Refusing is provably safe here**, which is why it is affordable: every US DST transition is
a Sunday, and the market is shut on Sundays. So no session can ever ask for a time that does
not resolve.

One correction Task 2.5.2 made to its own brief, recorded because it is the trap: the
"natural two-pass offset resolution" everybody reaches for **cannot detect the fold at all**.
What works is bracketing 24 hours either side and keeping the candidates that **round-trip**.

### 7. There is NO injected clock and no `Clock` interface — the seam is an ABSENCE

This is the decision Epic 13 reads, and it is the only one here that cannot be repaired from
outside later.

The framing everybody starts with is a choice between "thread an injectable clock through
now" and "read `Date.now()` and add a parameter in Epic 13". **Both are wrong.**

A `Clock` interface threaded through `marketSessionStateAt`, `marketSessionOn` and the rest
is **speculative generality that buys nothing, because a pure function of an instant is
already substitutable**. Replay does not need a clock injected into a session function; it
needs to call it with a replay instant. The injection is a second mechanism achieving what
the signature already achieves, and every call site carries a parameter it does not use.

Reading `Date.now()` inside the session functions is the failure invariant 4 names by name,
because then Epic 13 rewrites every call site rather than one module.

**So: every function in this story takes the instant it needs as an argument, and exactly one
module reads the wall clock.** The guarantee is what is missing.

**It is enforced where it matters.** Two more `no-restricted-syntax` rules forbid `Date.now()`
and a **zero-argument** `new Date()` anywhere in `packages/shared/src`, **with no exception at
all**; `new Date(someValue)` is untouched, which leaves the calendar's own
`new Date(...T00:00:00Z)` alone.

**The scope of that rule is narrower than the sketch it replaced, and the narrowing is the
finding.** `CALENDAR.md` §3.4 imagined a workspace-wide rule excepting the clock module. Two
reasons the narrow one is stronger:

- **It permits nothing, so nobody has to check which file is excused.** Every session
  function lives in `packages/shared`, so a rule with no exception there says exactly the
  thing that matters.
- **The workspace-wide version needs _two_ exceptions.** `apps/frontend/src/use-backend-health.ts`
  legitimately stamps `new Date()` for "when this client last got an answer" — a diagnostic
  about _this browser_ with nothing to do with market time. **A rule with two exceptions is
  weaker than the sentence it is trying to hold**, because it teaches every future reader
  that the list of excused files is the thing to consult rather than the rule.

**What Epic 13 replaces is one hook: `apps/frontend/src/use-market-clock.ts`.** The
originally-predicted second half — a backend "what time is it" function — was never built,
because nothing in `apps/backend` has yet needed to know. Speculating one would have been the
`Clock` interface arriving through a different door. The day the backend needs "now", it gets
its own module and its own rule.

**The honesty this decision owes:** it makes replay's _clock_ substitutable. It does **not**
enforce temporal isolation on queries — that is Epic 13's, through the mechanism
`DATA-LAYER.md` describes and Task 2.4.1 established the module arrangement for. A correct
clock passed to a query that ignores it leaks the future just as thoroughly. **The two seams
are independent and both are needed.**

### 8. The market's state at an instant is a DISCRIMINATED UNION, not a boolean

`MarketSessionState` has five members: `open`, `before_open`, `after_close`, `holiday`,
`weekend`.

`isMarketOpen()` returns `false` for four things a user needs to tell apart — 04:00 on an
ordinary Tuesday, Christmas Day, Sunday, and 14:00 on a half day that has already shut. The
header renders that difference, and it could not have if the answer were a boolean.

This is `SecuritiesView`'s shape reused for `SecuritiesView`'s reason: the impossible
combinations cannot be constructed, so a renderer renders a state rather than inferring one.

**The clock collapses five states onto three words** — `open`, `closed`, `unknown` — with
four of the five sharing `closed` and differing in the **sentence** below it. That collapse
is a rendering decision the union makes possible; it is not what the union is for, and
`unknown` is deliberately **not** a `MarketSessionStatus` member.

### 9. Walking off the end of the calendar PROPAGATES the refusal rather than truncating

All four walking functions — next, previous, sessions-between, last-N — let
`MarketCalendarRangeError` out rather than returning the sessions that happen to exist.

**A short list of sessions is a wrong answer wearing the shape of a right one.** It is
indistinguishable at the call site and it surfaces four epics later as an anomaly score
computed over 47 days that claims to be 60.

This is not exotic. **Epic 5's baseline is specified at 60 trading days**, so asking for it
from early January crosses the lower bound routinely: `lastMarketSessions(60, "2024-02-01")`
refuses while the same window from `2024-04-01` returns exactly 60. The refusal is about the
range, not about the request.

**Task 2.5.5's clock is the single stated exception, and it is recorded with the decision
rather than separately.** The clock is the one caller that cannot decline its own input — its
input is always today. So on 2029-01-01 an uncaught refusal would throw into the chrome's
`ErrorBoundary` and **the whole header would disappear on every route**. `use-market-clock.ts`
catches `MarketCalendarRangeError` **by type**, one line wide, rethrowing anything else so a
`MarketTimeError` or a genuine bug is not swallowed. The two halves come apart cleanly,
which is why this is affordable: the **time** is a timezone conversion that works forever,
and only the **session state** needs a calendar. So it shows the time and says
`unknown` / `Trading calendar ends 2028-12-31` — §36's degrade-locally rule, and the one
place in the running product that will ever report the provenance obligation having lapsed.

### 10. Two more ordering decisions the callers cannot see and would otherwise each re-take

**Both list functions return OLDEST FIRST**, where the planning document's own case list is
written newest-first. A person reads "the last five" backwards and a time series is iterated
forwards; any other choice means every consumer reverses it and one of them forgets.

**A reversed range is refused** rather than answered with an empty array that hides the swap.

### 11. The clock hook is called from `AppHeader`, not from `App`, and that fired a recorded reversal trigger

Task 1.12.5 accepted a whole-tree re-render per health poll and wrote down the trigger for
revisiting it: _"a second consumer, or a render rate that is no longer a poll."_ A 1 Hz clock
is sixty times the poll rate and mutates the DOM every tick. **The trigger fired and was acted
on**, which is the first time one of this repository's stated triggers has done both.

The counterfactual was **produced rather than argued**: with the hook in `AppHeader` the
landing route re-rendered **0 times in 20 s of ticking**; with it lifted to `App`, **40**.

This is not a hole in `AppHeaderProps`' four-props rule. **That rule is about a network
loop** — a prop named after a hook's return type is how a presentational component acquires a
dependency on a `fetch`. This hook makes no request and has no failure states, and
`MarketClock` itself stays presentational so all six of its renderings are reviewable in the
workshop.

**It ticks on the second boundary rather than every 1000 ms**, because `setInterval` drifts
and visibly skips a second every minute or so on the one component whose entire job is being
right about the time. Re-anchoring is also what makes a returning hidden tab correct for free.

### 12. The clock says `ET`, never `EDT`/`EST`, and it is not a live region

`ET` is fixed width, it is true on both sides of a DST transition, and it is what a trader
says. `EDT`/`EST` changes width and meaning twice a year on a component whose whole point is
stability; rendering the raw offset (`-04:00`) is unreadable at a glance.
`marketOffsetAt().abbreviation` remains available for a chart axis that wants it.

**It is deliberately not an ARIA live region**, for `BackendIndicator`'s reason: the most
common transition is the mount, so one would announce "market closed" on every page load and
every navigation, and `UniverseTable` already owns the page's one live region. The time gets
a visually-hidden `Market time, US Eastern` prefix instead, and the `ET` is `aria-hidden`.

**And it is the viewer's clock rendered in market time — a timezone claim, not a
synchronisation claim.** Stated rather than implied. Epic 3's exchange timestamps are the
honest server-supplied source when one is needed.

---

## Rejected, with reasons and reversal triggers

| Rejected                                 | Why                                                                                                                  | Reversal trigger                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| A provider calendar endpoint             | Circular (needs Story 2.6, which needs this), and loses criterion 5's no-network rule                                | It becomes a **check** against this table, never a replacement — a Story 2.7 opportunity   |
| A computed rule set                      | Good Friday for eleven months a year; and `2025-01-09` proves no rule set is sufficient **in principle**             | None. This one does not come back                                                          |
| Caching the calendar into Postgres       | Loses criterion 5, and a migration is the wrong mechanism for data that gets edited                                  | None foreseen                                                                              |
| `Temporal`, luxon, `@date-fns/tz`        | Flagged in Node 24 / +262 kB / a wrapper over the call we would make anyway — and none of them refuses the DST cases | A second timezone, which is where hand-rolled arithmetic stops being cheap                 |
| A `Clock` interface                      | A pure function of an instant is already substitutable; injection is a second mechanism buying nothing               | None. Epic 13 substitutes a hook                                                           |
| A workspace-wide `Date.now()` rule       | Needs two exceptions, and a rule with two exceptions teaches readers to consult the exception list                   | A second legitimate wall-clock reader, at which point the prose half needs a better answer |
| `isMarketOpen(): boolean`                | Collapses four states a user must tell apart, and the header renders the difference                                  | None                                                                                       |
| Truncating a walk at the calendar's edge | A short list is a wrong answer shaped like a right one, invisible at the call site                                   | None. The clock's `catch` is the exception, and it is one line wide                        |
| Storing `minuteBars` beside the bounds   | Two facts that can disagree                                                                                          | None                                                                                       |
| Making the clock a live region           | Announces "market closed" on every page load and navigation                                                          | A transition a user must be told about while looking elsewhere                             |
| Branding the calendar's dates at rest    | ~1.5 kB shipped to every visitor for a table no frontend code reads directly                                         | A consumer that genuinely needs the branded type at rest                                   |

---

## Consequences worth stating separately

### The bundle moved, and the prediction was out by about half in an instructive direction

`CALENDAR.md` §4.3 predicted **0 bytes at Tasks 2.5.2, 2.5.3 and 2.5.4** and **+5 to +8 kB at
2.5.5**. The first three held **exactly** — three separate builds at 357,216 B on an
unchanged stylesheet — which is the lazy formatter construction and the plain-literal table
each doing what they were chosen for. **An unchanged bundle there is evidence, not a null
result.**

2.5.5 came in at **+11,661 B of JavaScript and +1,431 B of CSS**. The breakdown is the
transferable part:

- **The table itself came in almost exactly as forecast** — 3,853 B minified against ~3.25 kB
  predicted. The estimate of the thing §4.3 is _about_ was sound.
- **The code that reads it was under-costed by roughly 4 kB** — more than twice the table.
- **The stylesheet was not predicted at all**, because a visible component is the first thing
  in the story to bring CSS with it.

**A bundle prediction for a data table is easy; a bundle prediction for the code that reads it
is not**, and §4.3 only attempted the first. The prediction is recorded as exceeded rather
than quietly corrected to match.

### Two obligations nothing enforces, and one that left the list

**"One module owns UTC↔ET conversion" has LEFT `CLAUDE.md`'s unenforced-invariant list** —
it is four lint rules now, along with the `packages/shared` half of the clock seam. It should
not be re-listed there.

Two genuine unenforced obligations remain, and a third arrived with this story:

- **The calendar's annual edit.** The table covers 2024–2028 and `nextEditDue` is
  `2028-01-01`. Nothing can check that a person actually re-read NYSE's calendar; the file's
  own `checkedOn` is a claim, deliberately never `now()`, because a provenance date that is
  always today cannot report staleness.
- **The runtime's tzdata.** Every conversion here is `Intl.DateTimeFormat` over the platform's
  timezone database. A stale or absent tzdata in some future runtime is wrong in a way nothing
  in this repository can see.
- **The frontend half of the clock rule stays prose**, in `use-market-clock.ts`'s own header,
  deliberately — see decision 7. That is a new entry on the third-kind list.

### The tests in this story are largely self-referential, and two things are not

The calendar's tests assert against the calendar's own dates. That is unavoidable and it is
worth naming rather than glossing: a wrong row passes its own test.

**Two checks are not self-referential and are therefore the real ones.**

- **The per-year session count, reached through the session functions** — 2024: **252**,
  2025: **250**, 2026: **251**, 2027: **251**, 2028: **251**. It catches a missing or
  invented holiday that every individual named date passes. **252 is not a constant** and
  folklore has rounded it into one; the count follows how many weekdays a year happens to
  contain and how many closures land on one, so a test asserting 252 would be red on four of
  the five covered years. **That figure was corrected twice during this story**, the second
  time because `2025-01-09` is an eleventh weekday closure — which is the arithmetic check
  catching exactly the class of thing it exists for, before it shipped.
- **The DST group**, which asserts on the **Friday before and the Monday after** each
  transition — both 6.5 hours, with the UTC open moving `14:30Z → 13:30Z` in March and back
  in November — plus **the Tuesday after**, which is what catches an implementation that
  special-cased the transition weekend and then had the new offset wrong from the next day on.
  There is no session on a transition day itself; they are always Sundays.
  **Every UTC instant in that group is a literal rather than derived**, because deriving them
  means re-running the conversion under test, which is how a timezone suite comes to assert
  that the code agrees with itself.

---

## What a correct trading calendar certifies

A green `pnpm verify` on this story means:

- **The sixteen named cases hold**, each asserted rather than reasoned about, each its own
  named test so a failure says which case broke: an ordinary session, a weekend, a full
  holiday, Good Friday, both half-day producers, both directions of the observance rule, both
  DST transitions and the Tuesday after each, the spring gap, the autumn fold, a date outside
  the range, the per-year session counts, and "the last five sessions" across a week
  containing a closure **and** a half day **and** a weekend.
- **The session bounds and the bar counts cannot disagree**, because the count is derived.
- **Nothing outside `market-time.ts` converts between UTC and market time**, and nothing in
  `packages/shared` reads the wall clock — both checked by lint rather than by discipline.
- **A date outside 2024–2028 refuses**, naming the range, the file and the field to move.
- **The clock advances on its own in a real browser**, on every route, without restarting when
  the route changes.
- **The landing route has 0 accessibility violations** with the clock in the chrome.

## What a correct trading calendar CANNOT certify

- **That the covered years are still right.** This is the sharpest item and it is not the
  obvious one. The obligation people expect is "extend the range once a year". The real one is
  worse, because it has **no due date**: **a year you have already checked can acquire a row.**
  `2025-01-09` was announced eleven days beforehand and applied to a year already in the
  table. An unscheduled closure inside a checked year is invisible to every instrument here —
  the table passes its own tests, and the arithmetic cross-check passes because it is derived
  from the table it is checking. **The only thing that catches one is a person re-reading the
  source.** That is what makes `CALENDAR.md` §1.6's cross-check against a provider calendar
  worth more than it looked when it was written: it is the only mechanism anybody has proposed
  that would notice.
- **That the table is right at all.** The tests assert the calendar against itself. What
  stands behind them is that the rows were read off NYSE's published record rather than
  derived, and `checkedOn` says when.
- **That the runtime's timezone database is current.** See above.
- **That a market timestamp is rendered correctly anywhere this story does not render one.**
  The conversion boundary is enforced; using it is not.
- **That temporal isolation works.** This story makes replay's clock substitutable. It does
  not constrain a single query. Epic 13 owns that, and a correct clock handed to a query that
  ignores it leaks the future completely.
- **That the renderings a browser cannot reach are correct.** Two of `MarketClock`'s six
  states — a named closure, and an instant past the calendar's range — are reachable only by
  changing the machine's date, so the axe gate and every browser journey are **structurally
  blind to them**. The workshop is not, and it **caught a real layout defect in one of them**
  that no other instrument here could have seen: on the longest sentence the component renders
  (`National Day of Mourning (President Carter)`), copying `BackendIndicator`'s
  column-spanning arrangement put the marker a centimetre from its word, because this region
  is right-aligned so the slack lands in the marker's column. That is the clearest case yet
  for the permutation grid.
- **That the second market this product ever covers works.** Every decision here is
  single-market and single-timezone by construction.

---

## What this story hands forward — and which parts are properties rather than claims

**Properties, built and exercised:**

- One definition of a trading session, with the bar counts derived from it (Story 2.8).
- One conversion boundary, held by lint (Story 2.12's chart axis).
- "The last N sessions", returning sessions rather than calendar days (Story 2.13).
- A clock in the chrome, on every route.

**A claim, not yet a property:** the seam. `use-market-clock.ts` is the one module that reads
the wall clock **today**, and the `packages/shared` half of that is enforced. The frontend
half is prose. Epic 13 replaces that hook — and must not read this ADR as saying temporal
isolation is solved, because decision 7 says the opposite in as many words.

---

## Measured

Every figure re-taken at Task 2.5.6 against the shipped tree rather than cited.

**The chain.** `pnpm verify` is **exit 0 in 30.87 s with no database** — build 2.67 / lint
6.26 / `format:check` 7.28 / `stories` 0.27 / `env:check` 0.26 / `test` 4.59 /
`test:process` 9.16 — and **exit 0 with one**, which is acceptance criterion 5 taken on the
story that could plausibly have broken it by putting the calendar in Postgres.

**The suites.** `pnpm test` is **468** — `packages/shared` 159 across 9, `apps/backend` 146
across 10, `apps/frontend` 163 across 18 — needing no build, no socket and no database.
`pnpm test:process` is **14**, `pnpm test:database` **61 across 3**, `pnpm e2e` **23 in
1.0 m**, of which the recovery journey is a whole minute on its own.

**Accessibility.** The landing route is **0 violations / 37 passes / 1 inconclusive
(`color-contrast`)** with the clock in the chrome — Task 1.5.4's baseline reproduced exactly,
so the clock introduced nothing. The securities route is 0 / 35 / 1 (`th-has-data-cells`) at
1280×720, ×560 and ×480.

**The artefact.** **369,437 B** of JavaScript (`4f17aff3…`), **17,317 B** of CSS
(`eb223e53…`), `index.html` 1,101 B (`898733b0…`) and `staticwebapp.config.json` 300 B, for
**388,155 B over four files**. Storybook is 74 files / 9.4 MB. **The story's peak was
389,767 B** at Task 2.5.5; two follow-up commits — extracting a `Marker` primitive and a
composed-class layer for the micro-label and visually-hidden idioms — took it down again,
which is why "reproduce Task 2.5.5's figures to the byte" is the wrong instruction and
reproducing **HEAD's** is the right one.

**Criterion 1 was verified by reading the test names rather than the exit code**, which is
this repository's own recorded trap twice over — a `.tsx` file under a `.ts`-only glob, and a
non-matching `-t` filter reporting zero failures at exit 0. All sixteen named cases are
present and named; cases 12 and 13 live in `market-time.test.ts` as _the spring-forward gap_
and _the autumn fold_.

**Criterion 2 was verified by making all four lint rules fail and then reverting.** A
`Date.now()` and a zero-argument `new Date()` in `packages/shared/src`, and an
`Intl.DateTimeFormat` and the string `America/New_York` in `apps/frontend/src` — four errors,
each naming the boundary and the reason. A grep of the tree afterwards finds the timezone
identifier and the formatter construction in `market-time.ts` and in **comments** elsewhere,
and nowhere else.

**Three recorded claims had stopped being true, and one was wrong when it was written.**

- **The calendar table is 61 rows, 50 full closures and 11 early closes — not the recorded
  60/49/11.** `market-calendar.ts` has not been edited since Task 2.5.3 shipped it, so the
  figure was **wrong when written rather than stale**, which only a re-count catches. The
  missing row is the one the task's own headline is about: `10 + 10 + 10 + 10 + 9` is exactly
  **49**, which is what the _derivation_ gives before `2025-01-09` is added back. **The count
  was taken from the rule set rather than from the table, in the task that exists to prove a
  rule set is not enough.**
- **`planning/epic-01-application-foundation/EPIC.md`'s Epic 1 exit summary** still ended
  _"and the clock region stays reserved"_. It is neither `CLAUDE.md`, `README.md`, `AppHeader`
  nor Story 1.5 — the four places the sweep's candidate list named — so the lesson is the one
  this repository keeps relearning: **the candidate list is a list of the places somebody
  remembered. Grep; do not read the list.**
- **ADR 0005 described a reserved market clock region in the present tense**, in two places,
  which is exactly the shape Task 1.12.8 found in ADR 0011 §23. Amended rather than rewritten,
  with the rule stated in the file: **an ADR's decision is never rewritten and never
  renumbered, but a present-tense description of the tree that has become false gets a dated
  amendment beside it**, because a reader cannot tell a stale description from a current one.

**The link sweep found four genuinely broken cross-file links, which is the first time it
ever has.** Every recorded reading of this check since Task 1.8.6 has been **0 broken** —
six of them. Run over all 198 tracked Markdown files at Task 2.5.6 it found four, all
pre-existing and all from the 2026-09-05 Epic 2 renumber: one pointing at
`story-11-deployment-and-hosting/HOSTING.md`, a directory that has never existed, and three
at `../../../../apps/backend/migrations/README.md`, one level too deep. All four are fixed
here, because **a broken link is a defect rather than a historical record** — repairing a path
destroys no words. **This fires the stated reversal trigger for building a link checker**
(_"a broken link actually shipping"_), with one honest qualification: the trigger's wording is
_"found by a reader rather than by a task"_, and these were found by a task. Recorded so the
next close does not have to re-litigate whether it counts. The remaining 14 "broken anchor"
reports are the **double-hyphen trap** this repository has now reproduced six times: a heading
containing an em-dash slugs to two consecutive hyphens, and any checker that collapses
whitespace reports correct anchors as broken.

**One thing that is not a Story 2.5 finding but was found by this task and should not be
silently dropped:** `e2e/specs/securities-route.spec.ts`'s _"nothing answering reads as no
response"_ **flaked once in two full suite runs**, failing on `expectBackendStatus(page,
"healthy")` with the header reading `unreachable / No successful check yet.` It passes alone
and passed on the immediate re-run of the whole suite. The mechanism is legible: that spec
intercepts `/securities` only, so `/health` is untouched — but under four parallel workers the
**first** health poll can exceed `API_TIMEOUT_MS` (5 s), and the next poll is
`HEALTH_POLL_INTERVAL_MS` (30 s) away, which is beyond the 10 s `expect` timeout. **This
repository runs zero retries deliberately**, so a flake is a defect rather than something to
re-run past. It is recorded here with the numbers and left to Story 2.4's owner rather than
patched from a close task.

---

## Related

- [`CALENDAR.md`](../../planning/epic-02-security-universe-historical-data/story-05-trading-calendar-and-market-time/CALENDAR.md)
  — the working record: rejected candidates, every measurement, the sixteen named dates and
  their derivations, and the provenance convention.
- [ADR 0016](0016-the-tracked-universe-what-a-green-load-certifies.md) — the tree-shaking
  mechanism decision 1 and the bundle consequence both rest on, and the provenance convention
  `MARKET_CALENDAR_PROVENANCE` follows.
- [ADR 0012](0012-client-side-status-what-a-green-indicator-certifies.md) — the marker
  language `MarketClock` holds by imitation, and the `degraded`-shaped
  one-word-many-sentences rendering the clock reuses.
- [ADR 0005](0005-routing-application-layout-and-the-deployable-shape.md) — the chrome this
  story finally finishes, amended by this one.
- [ADR 0013](0013-browser-testing-two-suites-and-what-a-green-run-certifies.md) — the browser
  suite the clock's "it advances" assertion lives in, and the axe gate.
- `PRODUCT_SPEC.md` §5.1, §9, §21, §22 and §36.
