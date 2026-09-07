# The trading calendar and market time — MarketPulse

**Task:** 2.5.1 — Choose the calendar source, the session definition and the clock's shape,
shipping nothing
**Date:** 2026-09-06
**Status:** decided; nothing installed, no module written, no test added, tree
byte-identical

This is Story 2.5's one document about what **a trading day** and **market time** mean in
this product. It is to Story 2.5 what `UNIVERSE.md` is to Story 2.3, `DATA-LAYER.md` to
Story 2.2 and `HOSTING.md` to Story 1.11. One document per subject; a second one about the
same subject is a copy waiting to disagree.

**Epic 13 is a reader of this file**, not only Tasks 2.5.2 to 2.5.6. Section 3 is the one
written for it: it is the seam invariant 4 rests on, and it is the only decision here that
cannot be repaired from outside later.

Every measurement below was **taken on this machine and reverted**, not cited.

---

## The decisions, in one paragraph

**The calendar is a checked-in table of exceptions covering 2024–2028**, because a
provider endpoint is circular (it needs Story 2.6, which depends on this story) and a
computed rule set gets Good Friday wrong for eleven months of every year. **Full closures
and early closes are one table with three kinds, not two tables** — the same argument that
made `SECURITY_KINDS` one column with three members rather than a nullable second column.
**A date outside the covered range is a refusal naming the range and the file**, never a
silent "no holidays that year", because the silent version turns every holiday into a
phantom trading session. **Pre- and post-market are OUT for V1**, and the IEX argument was
used and is the deciding one. **There is no injected clock and no `Clock` interface, and
that is the decision rather than a deferral**: every function in this story is a pure
function of an instant it is given, exactly one module reads the wall clock, and a pure
function of an instant is _already_ replay-ready — injection would be a second mechanism
buying nothing. **The code lives in `packages/shared`**, which is forced rather than
chosen, because Story 2.8's ingestion and Story 2.12's chart axis both need it. **A market
timestamp on the wire is a UTC ISO 8601 instant**, and a market **date** is a separate wire
type that is a plain `YYYY-MM-DD` string and never an instant at midnight. **No dependency
is added**: `Intl.DateTimeFormat` performs all four operations in both halves of
`packages/shared`, `Temporal` is unflagged in Chrome 148 and **flagged in Node 24**, and
the cheapest library that would help is itself a wrapper over `Intl`.

**Two downstream task files are corrected by measurement below** — the 252-session check
(§7.2) and the DST assertion (§7.3). Both would have shipped red tests.

---

## 1. The calendar source: a checked-in table of exceptions

### 1.1 A provider endpoint is circular, and the circularity is structural

Alpaca publishes a calendar endpoint. Reaching it needs the market-data provider
abstraction, which is **Story 2.6 — and Story 2.6 depends on this story.** That is not a
sequencing inconvenience that could be resolved by reordering: Story 2.6 needs a session
definition to describe what it is fetching, and this story would need Story 2.6 to fetch
the definition. One of the two has to hold the definition, and it is this one.

It also breaks acceptance criterion 5 outright — _fast unit tests, no database, no
network_. A calendar reached over HTTP is a calendar the test suite cannot ask about
Christmas without a network.

### 1.2 A computed rule set fails on one holiday, and that holiday is the whole argument

Nine of the ten US market holidays are nth-weekday or fixed-date rules that about a hundred
lines of code produce correctly. **Good Friday is Easter-derived.** It moves on a
lunar-solar cycle, and it is in no federal holiday list because it is not a federal
holiday — it is a _market_ holiday. Computed from the anonymous Gregorian computus over the
covered range it lands on 2024-03-29, 2025-04-18, 2026-04-03, 2027-03-26 and 2028-04-14 —
which is to say it moves by up to three weeks year to year and shares no rule with anything
else in the list.

The failure shape is what decides it: **a rule set that gets nine right and Good Friday
wrong looks correct for eleven months.** It reports a phantom session on one spring Friday a
year, and the symptom arrives in Story 2.8 as one day of missing bars nobody can attribute
and in Story 2.12 as a bar on a day the market was shut.

Computus _itself_ is not the objection — it is forty lines and it is right. The objection is
that adopting a rule set means adopting **eleven** rules, of which one is computus, one is
the weekend-observance rule with a documented exception (§7.4), and one is the half-day rule
that has to yield to the observance rule (§7.5). That is not a hundred lines of arithmetic;
it is a hundred lines of arithmetic encoding a policy that NYSE publishes as a table.

### 1.3 The shape: one table, three kinds, and the exceptions only

**A row is an exception. A normal session is the absence of a row.** The table lists days
the market is closed and days it closes early; every other weekday in the covered range is a
regular 09:30–16:00 session.

**Full closures and early closes go in the same table**, each row carrying its kind. Two
tables was the alternative and it loses on one question: _is 2026-11-27 a holiday?_ would
have to be asked twice, and forgetting the second ask is precisely the failure Task 2.5.3
predicts — three hours of missing bars a year read as a data-quality failure. This is
`UNIVERSE.md` §2's argument reused rather than re-derived: `SECURITY_KINDS` widened to three
members instead of gaining a nullable second column, for the same reason.

**The early close time is on the row, not a constant.** Every scheduled early close in living
memory is 13:00 ET, so `EARLY_CLOSE_TIME = "13:00"` is tempting. The row-level version costs
nothing and buys one thing: **an unscheduled closure or an unusual close time is expressible
as data rather than as a code change.** NYSE has closed for national days of mourning and has
closed early for other reasons; a table that can only say "13:00" cannot record them.

The shape, for Task 2.5.3 to write:

```
{ date: "2026-11-27", kind: "early_close", closesAt: "13:00", name: "Day after Thanksgiving" }
{ date: "2026-12-25", kind: "closed",                          name: "Christmas Day" }
```

**It is a plain array literal of object literals**, and that is load-bearing rather than
stylistic — see §4.3.

### 1.4 The range is 2024–2028 inclusive, and each end has a reason

**Backward to 2024-01-01.** Epic 5's baselines are specified in trading days
(`calculate_return_percentile(NVDA, 5m, 60 trading days)`, §5.1) and Epic 13 wants a deep
pool of historical sessions to replay. Two full years behind today clears a 60-session
baseline many times over and gives Epic 13 roughly 670 sessions to choose a demonstration
from. It is also cheap: ten rows a year.

**Forward to 2028-12-31.** NYSE publishes roughly three years ahead, so 2027 and 2028 should
both be available to check against. That leaves over two years of runway from today.

**The rate is one edit a year, in one file.** Written where somebody will see it: the
provenance block in the calendar file carries **next edit due 2028-01-01**, which is a full
covered year of margin before the range runs out, and the earliest useful moment to make it
is whenever NYSE publishes 2029.

**One instruction to Task 2.5.3 about the far end.** 2028 contains the observance exception
in §7.4 and is the year most likely to be beyond what NYSE has actually published. If it is
not published, **narrow the range to 2027 and move the next-edit-due date to 2027-01-01**
rather than deriving 2028 from the rules — deriving the far end is the computed rule set
sneaking back in through the back door.

### 1.5 A date outside the range is a refusal

This is acceptance criterion 4's real content and it is the half most calendar
implementations skip.

**A date past 2028-12-31 is not a normal input with a sensible default.** The plausible
wrong answer is "no holidays recorded that year, so no closures" — which turns every 2029
holiday into a phantom trading session, silently, and surfaces in Story 2.12 as a chart with
a bar on Christmas Day 2029. The other plausible wrong answer, "assume closed", is worse: it
loses a whole year of sessions.

**So the calendar refuses, naming the covered range and the file to edit.** It is loud, it
is on the day the obligation was missed rather than a year later, and it is testable — Task
2.5.3 asserts it.

The shape it deliberately does not take: there is no fallback, no `strict` flag and no
"assume open outside the range" option. A flag whose safe setting is the default and whose
unsafe setting is available is a flag somebody sets during an incident.

### 1.6 The reversal: the provider calendar becomes a check, not a replacement

The day Alpaca's calendar endpoint is reachable — Story 2.7 at the earliest — **this table
becomes the thing you check against it, not the thing you delete.** Two reasons. Criterion
5 still forbids a network dependency in the fast suite, so the offline table is still what
the tests ask. And the one thing this arrangement genuinely cannot do is notice that the
obligation in §1.4 was missed; a cross-check can, and that is exactly the gap it should be
spent on.

**That is a Story 2.7 opportunity and not an obligation.** Nothing downstream is blocked by
its absence.

---

## 2. Pre- and post-market: out for V1

**The regular session is 09:30–16:00 ET and that is the whole session.** Extended hours are
not ingested, not charted, not counted in a baseline and not part of a replay day.

### 2.1 The IEX argument was used, and it is the deciding one

`PRODUCT_SPEC.md` §7.1 fixes the feed: Alpaca's free stock-data offering is **IEX**, not
consolidated SIP, and the product is required to say so on screen. IEX is a single venue
with a low single-digit share of consolidated US equity volume during regular hours, and its
**extended-hours** share is thinner still.

The consequence is specific rather than general. Epic 5's volume anomaly is _"current
interval volume against the historical median volume for the same approximate time of day"_
(§11) and reports results like _"4.1× typical"_. Build that denominator over pre-market IEX
minutes and it is a median over a handful of prints — so the ratio measures **how busy this
one venue happened to be**, not how unusual the market is. An anomaly score that fires on
venue noise is worse than one that never fires, because §11 requires every score to carry an
explanation and there is no honest explanation of that one.

`UNIVERSE.md` §10 already recorded the same feed constraint from the other direction.

### 2.2 What it means in the three places it lands

**Story 2.8 — a missing 08:15 bar is correct, not a gap.** A regular session has exactly
**390** minute bars (09:30 through 15:59) and a half day exactly **210** (09:30 through
12:59). Story 2.8's completeness check counts against the session, so the numbers are
derivable from the calendar rather than configured, and an ingest that finds 390 has found
all of them.

> **Confirmed against a real vendor on 2026-09-07 (Task 2.7.1), and this paragraph was
> expected to need amending.** `PROVIDER.md` §6.4 predicted that IEX, being one venue rather
> than the tape, would not yield 390 bars — in which case `minuteBars` would be a count of
> _minutes_ and not of _bars_, and the sentence above would be false. **Measured, it holds.**
> A liquid name returns **exactly 390** across five ordinary sessions, and the day after
> Thanksgiving 2025 returns **exactly 210** — the first time this document's early-close table
> has been validated against a third party. The prediction failed because the free plan serves
> **SIP** for historical bars rather than IEX (`ALPACA.md` §2); on IEX the same thin names run
> 43–99%. So the claim is sound **for stored data** and would not be on a live IEX stream.
>
> **One trap for whoever writes the ingest**, since it is this section's scope that it breaks:
> asking Alpaca for a **bare date** rather than explicit session bounds returns **217 bars for
> that 210-minute half day**, the extras running from an hour before the open to eight minutes
> after the early close. Extended-hours bars are out of V1 scope by §2's decision, so the
> request must carry session bounds. Related, and measured in the same task: Alpaca's `end` is
> **inclusive** where our `TimeRange` is half-open, which adds a further bar stamped at the
> close itself.

**Epic 5 — the baseline denominator is regular-session minutes only.** Stated here so it is
inherited rather than re-decided at a point where changing it would invalidate every stored
baseline.

**Epic 13 — the replay day runs 09:30 to 16:00.** This is not a new decision so much as a
confirmation of one `PRODUCT_SPEC.md` §21 already sketched:

```
09:30 ━━━━━━━━━━●━━━━━━━━━━━━━━━━━━ 16:00
```

The spec's own replay control is drawn against the regular session. Including extended hours
would have meant either a scrubber whose interesting 6.5 hours occupy a third of its width,
or a scrubber that disagrees with the spec.

### 2.3 The cost, stated rather than glossed

**Extended-hours moves become invisible, and some of them are the cause of what is
visible.** A stock that reacts to an 07:00 earnings release shows nothing until 09:30 and
then appears as a gap between the previous close and the open. Epic 5 will detect the gap
and will not be able to say what happened in it.

That is what most charts do, and it is honest as long as nothing claims otherwise — the gap
is visible as a gap rather than smoothed away. What is **not** acceptable is a chart that
implies continuous coverage across it, which is §35's "hide data provenance" in a different
costume. Story 2.12 owns rendering the discontinuity honestly; noted here so it arrives as
an inherited requirement.

### 2.4 The reversal trigger

**A feed with real extended-hours coverage** — SIP, i.e. a paid Alpaca tier — **or Epic 5
finding that opening-gap anomalies are systematically unexplainable without it.** The second
is the likelier one and it is a measurement Epic 5 can make. The change is a fourth session
kind in the same table plus a wider bar count; it is not a redesign, which is what makes
deferring it cheap.

---

## 3. The clock's shape: there is no injected clock, and that is the decision

This is the section Epic 13 reads.

### 3.1 The rule, in one sentence

**Every function in this story takes the instant it needs as an argument. Exactly one module
reads the wall clock.**

### 3.2 Why not a `Clock` interface

The task frames this as a choice between "take an injectable clock now" and "read
`Date.now()` and get a parameter in Epic 13". Both are wrong, and the right answer is
stronger than either.

A `Clock` interface — `interface Clock { now(): Date }`, threaded through `isMarketOpen`,
`sessionBounds`, `nextSession` and the rest — is **speculative generality that buys
nothing**, because a pure function of an instant is _already substitutable_. Replay does not
need to inject a clock into `sessionBounds(date)`; it needs to call it with a replay date.
The injection would be a second mechanism achieving what the signature already achieves,
and every call site would carry a parameter it does not use.

Reading `Date.now()` inside the session functions is the failure invariant 4 names by
name — _"design data access with this in mind from the first query"_ — because then Epic 13
has to rewrite every call site rather than one module.

**So the seam is not something added. It is something absent.** The guarantee is that
`Date.now()` and zero-argument `new Date()` appear in exactly one module, and everything
else is a pure function.

That is this repository's own established shape, twice over. Task 2.4.1's temporal seam is
held by `securities.ts` **not exporting** its `Kysely` handle — the guarantee is what is
missing from the export list. Task 1.12.2's transport rule is held by exactly one file
calling `fetch`. Both are held by a grep and a written rule rather than by the compiler, and
both have survived. This is the third instance and it is the one invariant 4 rests on.

### 3.3 What Epic 13 replaces, precisely

~~**One function, and one hook.**~~ **Corrected 2026-09-06 by Task 2.5.5: ONE HOOK, and
nothing else.** This section is the one Epic 13 reads, so the correction matters more here
than the original claim did.

- ~~The backend/shared side: the single function answering _what instant is it now_. Replay
  substitutes the replay clock's instant.~~ **It was never built, because nothing in
  `apps/backend` has yet needed to know what time it is.** Speculating one would have been
  the `Clock` interface §3.2 rejects, arriving through a different door. The day the backend
  needs "now" it gets its own module and this section gains its second bullet back.
- The frontend side: **`apps/frontend/src/use-market-clock.ts`** (Task 2.5.5), which ticks
  the header clock. Replay substitutes the scrubber's position. Its `useMarketClock` is the
  whole of the substitution; `readMarketClock` below it is already pure and needs no change.

Nothing else in Story 2.5 changes, because nothing else in Story 2.5 knows what time it is.

**What this does not do, and the honesty matters:** it makes replay's _clock_ substitutable.
It does not enforce temporal isolation on _queries_ — that is Epic 13's, through the
mechanism `DATA-LAYER.md` describes and Task 2.4.1 established the module arrangement for.
A correct clock passed to a query that ignores it leaks the future just as thoroughly. The
two seams are independent and both are needed.

### 3.4 How it is held, and what nothing checks

~~Task 2.5.2 verifies with a grep and writes the rule beside the export list. This joins
`CLAUDE.md`'s third kind of gap — a stated invariant nothing enforces — alongside "one file
calls `fetch`", "one module owns UTC↔ET conversion" (§5) and the temporal seam itself.~~
**Corrected 2026-09-06 by Task 2.5.2, which went further than this section predicted: it is
NOT an unenforced invariant.** A grep test was written first and does not work where it has
to live — greping the tree needs `@types/node`, and `packages/shared` deliberately has none
because it is inlined into the browser bundle, so giving it Node types to hold a lint-shaped
rule would breach one boundary to enforce another. So criterion 2 is held by **two
`no-restricted-syntax` rules in `eslint.config.mjs`** with `market-time.ts` as their single
exception: one forbids constructing an `Intl.DateTimeFormat` anywhere else in the workspace,
one forbids spelling `America/New_York` anywhere else. Both were made to fail — in
`apps/frontend` and in `packages/shared` — before being believed. What the rule cannot see is
a conversion written with a hard-coded `-5` and no timezone name at all, which is a
reimplementation rather than a duplicate. So of the three invariants this paragraph listed,
"one module owns UTC↔ET conversion" has **left** the unenforced list and the other two remain
on it.

**It is worth stating that a lint rule could hold it and is not proposed.** ESLint's
`no-restricted-syntax` could forbid `Date.now()` outside a named file, the way
`no-restricted-globals` already holds the frontend's browser boundary. It is declined here
for one task's worth of reason: the module does not exist yet, so the rule would have
nothing to permit. **The reversal trigger is the first time a `Date.now()` appears outside
that module in review** — at which point the rule is four lines in a config that already has
the pattern.

**Amended 2026-09-06.** That reasoning was right and its conclusion is now cheaper to act on
than it was: Task 2.5.2 added exactly this shape of rule for the _conversion_ boundary, so
`eslint.config.mjs` already carries the pattern, the exception mechanism and the argument.
The `Date.now()` rule is still not written, because Task 2.5.5's clock module — the one thing
it would permit — does not exist yet, which is the same objection unchanged. **Task 2.5.5
should write it in the same change that creates that module**, at which point it is a third
entry beside two that already work, rather than a new idea.

**Written 2026-09-06 by Task 2.5.5, and it is scoped differently from what that paragraph
imagined — deliberately, and the difference is the finding.** The sketch above was a
workspace-wide rule with `use-market-clock.ts` excepted. What shipped is a rule over
**`packages/shared/src` with no exception at all**, forbidding both `Date.now()` and a
zero-argument `new Date()`; anything constructed _from_ an argument is untouched, which
leaves the calendar's own `new Date(...T00:00:00Z)` alone.

Two reasons, and the second is why the narrower rule is the stronger one.

- **It permits nothing, so nobody has to check which file is excused.** A clock read inside a
  session function is the failure invariant 4 names by name, and `packages/shared` is where
  every one of those functions lives — so a rule with no exception there says exactly the
  thing that matters.
- **The workspace-wide version would have needed _two_ exceptions rather than one.**
  `apps/frontend/src/use-backend-health.ts` stamps `new Date()` for "when this client last
  got an answer" — a genuine second clock read and a legitimate one, because it is a
  diagnostic about _this browser_ and has nothing to do with market time. **A rule with two
  exceptions is weaker than the sentence it is trying to hold**, and it would have taught
  every future reader that the list of excused files is the thing to consult rather than the
  rule.

So the frontend half of §3.1's sentence stays prose — in `use-market-clock.ts`'s own header —
and remains on `CLAUDE.md`'s third-kind list. Both new patterns were **made to fail** in
`market-session.ts` before being believed, and the tree was confirmed byte-identical after the
revert.

---

## 4. Where the code lives: `packages/shared`

### 4.1 Forced, not chosen

Two consumers on opposite sides of the wire:

- **Story 2.8's ingestion** decides which minutes should have bars — backend.
- **Story 2.12's chart axis** decides where to draw a session boundary — frontend.
- **Story 2.13's window control** resolves "the last 5 days" to sessions — frontend.
- **Epic 13's replay clock** — both.

`apps/backend` would produce a second copy in the frontend, which is exactly the shape this
story exists to prevent — `STORY.md` says so in as many words: _"It is here because the
alternative is three inconsistent copies of it."_ A fifth workspace package would have the
`e2e` package's costs (it joins every `pnpm -r` fan-out) with none of its justification,
since `packages/shared` is already the home for things both halves agree about.

### 4.2 The two costs, stated rather than discovered

**It is consumed as built output.** A change to the calendar means `pnpm build` before
either app typechecks against it — `CLAUDE.md` already records that a bare `tsc --noEmit` in
a consumer passes against a stale `.d.ts`. `pnpm verify` orders this correctly; a filtered
typecheck does not.

**It is inlined into the frontend bundle**, so the calendar is browser code whether or not
the browser asks for it. §4.3 is the consequence.

### 4.3 The bundle prediction, for Task 2.5.6 to measure

Task 2.3.8 measured the mechanism precisely: **a vocabulary declared as a plain array
literal is tree-shaken out completely; one built by _calling_ a function is not.**
`SECURITY_KINDS` and `SECTORS` vanished entirely, while `SECTOR_ETFS` — built by calling
`toTicker()` eleven times — cost 115 bytes, because a call expression is not provably
side-effect-free.

That finding applies here twice, and the second application is the one that would be missed:

1. **The holiday table is a plain literal** (§1.3), so it is free to a build that does not
   reach it. **Predicted: 0 bytes at Task 2.5.3.**
2. **`Intl.DateTimeFormat` construction is a call expression.** Measured below, constructing
   one costs **30.98 µs** against **2.19 µs** to reuse — a **14.2×** ratio — so Task 2.5.2
   will rightly memoise it. **If it is memoised at module load (`const FMT = new
Intl.DateTimeFormat(...)`), it is exactly `SECTOR_ETFS`'s shape and will be retained in a
   build that never uses it.** Construct it **lazily, inside the function, on first use.**
   That is an instruction to Task 2.5.2, not an observation.

**The predictions Task 2.5.6 should test:**

| Task  | Prediction                                       | Why                                                                                                                                                            |
| ----- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.5.2 | **0 bytes**, bundle hash unchanged               | Nothing in the frontend imports it yet, and lazy construction leaves no live call expression                                                                   |
| 2.5.3 | **0 bytes**, bundle hash unchanged               | A plain literal nothing reaches                                                                                                                                |
| 2.5.4 | **0 bytes**, bundle hash unchanged               | Pure functions nothing calls                                                                                                                                   |
| 2.5.5 | ~~**+5 to +8 kB raw**~~ **+11.7 kB — see below** | The first real consumer: the clock reaches the session functions, which reach the table — ~65 rows at ~50 bytes minified, plus the conversion and session code |

If 2.5.2 or 2.5.3 moves the bundle at all, the module-load construction is what did it, and
the fix is one line.

**Measured 2026-09-06. Three of the four predictions held exactly and the fourth was
exceeded by about half, which is worth recording rather than rounding away.** 2.5.2, 2.5.3
and 2.5.4 each read **357,216 B on an unchanged 18,058 B stylesheet** — 0 bytes, three times,
which is the lazy construction and the plain literals both doing what they were chosen for.

2.5.5 reads **368,877 B of JavaScript and 19,489 B of CSS**: **+11,661 B and +1,431 B**
against a predicted +5 to +8 kB. Two things the prediction got wrong, and only one of them is
interesting.

- **The table itself came in almost exactly as forecast** — 3,853 B minified against the
  ~3.25 kB the row arithmetic gives. So the estimate of the thing this section is _about_ was
  sound.
- **The conversion, session, hook and component code was under-costed by roughly 4 kB**, which
  is where the whole overshoot lives. The prediction treated it as a rounding term beside the
  table and it is more than twice the table's size — `market-time.ts` alone carries two
  memoised formatters, a `formatToParts` reader, offset arithmetic and
  `instantFromMarketTime`'s bracket-and-round-trip resolution.
- **The stylesheet was not predicted at all**, because this section forecasts a _bundle_ and
  a visible component is the first thing in the story to bring CSS with it.

The transferable form: **a bundle prediction for a data table is easy and a bundle prediction
for the code that reads it is not**, and this section only attempted the first.

---

## 5. A market timestamp on the wire: a UTC ISO 8601 instant

Story 2.9's contract and Story 2.8's rows both need this before they are written.
`migrations/README.md` already fixes the storage half — `timestamptz`, always, never a naive
`timestamp`. This is the JSON half.

### 5.1 The decision

**`"2026-09-04T13:30:00.000Z"`** — a UTC instant, ISO 8601, always with the `Z`.

The full rule, which is one sentence: **storage is `timestamptz`, the wire is UTC ISO 8601,
`America/New_York` exists only at the moment of display, and exactly one module performs the
conversion.** That last clause is acceptance criterion 2.

### 5.2 The two rejected candidates

**Epoch milliseconds.** Rejected on two counts. It is unreadable in a log line, a network
tab or a database row, which matters for a product whose correlation ids exist so that a
browser observation and a server record can be joined by a human. And more sharply: a JSON
number that is an _instant_ and a JSON number that is a _duration_ are indistinguishable, so
a field named `at` and a field named `elapsed` look the same on the wire — which invites
arithmetic at call sites, and arithmetic on instants is exactly what Task 2.5.2's notes
forbid, because adding 24 hours crosses a DST boundary twice a year and is silently an hour
wrong.

**An ET-local string** (`"2026-11-01T01:30:00"`). Rejected on a measurement rather than a
principle: **it cannot represent 2026-11-01 01:30 unambiguously, because that wall-clock
time happens twice.** Taken on this machine, in Node 24 and again in Chrome 148:

```
2026-11-01T05:30:00Z  ->  ET 01:30  (offset -04:00)
2026-11-01T06:30:00Z  ->  ET 01:30  (offset -05:00)
```

Two distinct instants, one hour apart, formatting to the identical string. There is no
recovering which one was meant. This is the same fact `migrations/README.md` already records
as the reason a naive `timestamp` column means nothing, arriving in the transport layer.

**ET-local _with_ an offset** (`"2026-11-01T01:30:00-05:00"`) _is_ unambiguous, and is
rejected for a different reason: it is a UTC instant wearing a costume. It puts a
presentation decision — which timezone — into the transport, so a client that wants to
render something else has to re-parse and re-convert, and every consumer inherits an opinion
the wire had no business having. **The wire carries the instant; the client decides how to
display it.**

### 5.3 A market date is not an instant, and needs its own wire type

**A market date is `"2026-09-04"` — a plain calendar date string, never an instant at
midnight.**

_Which session_ is a date question, not an instant question. Encoding it as
`"2026-09-04T00:00:00Z"` is wrong in the way that costs a whole day: 2026-09-04T00:00:00Z is
2026-09-03 **20:00** in New York, so the obvious `.toISOString().slice(0,10)` on a session's
own open instant is right by luck in the afternoon and wrong in the evening. Story 2.13's
window control, Story 2.9's contract and Story 2.8's per-session bar counts all key on the
market date, and all three get it wrong the same way if it is an instant.

So the two wire types are distinct and named distinctly, and converting between them goes
through §5.1's one module.

---

## 6. The dependency question, answered by measurement

The standing rule is `CLAUDE.md`'s: **a library wins when its failure mode is silent and the
hand-rolled version's is loud.** Timezone arithmetic done wrong _is_ silent, so a library is
not obviously the wrong call here — which is why this was measured rather than assumed. Two
schema libraries and a CORS hand-roll have been thrown away on measurements like this one,
and `@fastify/cors` was kept on exactly this argument.

**The answer is no dependency**, and it is not close.

### 6.1 `Temporal` is not available, and the reason is a split rather than an absence

| Runtime      | `typeof Temporal`                        |
| ------------ | ---------------------------------------- |
| Node 24.20.0 | `undefined` (needs `--harmony-temporal`) |
| Chrome 148   | **`object`** — unflagged                 |

**Chrome has it and Node does not.** That is worse than neither having it, because
`packages/shared` is consumed by both: a module written against `Temporal` would work
perfectly in the frontend bundle and throw `ReferenceError` in `apps/backend` — and would do
so at _runtime_, since neither `tsc` nor `eslint` nor `vite build` has an opinion about a
global that a `lib` setting claims exists. That is the `apps/frontend` browser-boundary
problem (`CLAUDE.md`'s "`process.env.SECRET` compiles to `{}.SECRET`") pointing the other
way.

**The reversal trigger is Node shipping `Temporal` unflagged.** V8 already has it, so this is
a Node release away rather than a standards cycle away. When it lands, `Temporal.ZonedDateTime`
answers the fold and the gap explicitly by design, and §6.3's hand-written resolution becomes
about fifteen lines shorter. Worth revisiting; not worth a polyfill (§6.4).

### 6.2 `Intl.DateTimeFormat` performs all four operations, in both halves

Measured against `America/New_York` in Node 24.20.0 and re-taken in Chrome 148 on the
deployed frontend's own origin. **Every probe returned identical results in both**, which is
the confirmation `packages/shared` needed:

| Capability                        | Result                                                                |
| --------------------------------- | --------------------------------------------------------------------- |
| instant → wall-clock parts        | `formatToParts` → `{year,month,day,hour,minute,second}`               |
| offset **name**                   | `timeZoneName: "short"` → `EST` / `EDT`                               |
| offset **value**                  | `"longOffset"` → `GMT-05:00` / `GMT-04:00`; `"shortOffset"` → `GMT-5` |
| market date + wall time → instant | two-pass offset resolution over the above (§6.3)                      |
| timezone identifier is real       | `Intl.supportedValuesOf("timeZone")` — a `function` in both           |

Two mechanical notes for Task 2.5.2, both measured:

**Use `hour12: false` or `hourCycle: "h23"`, never `"h24"`.** ET midnight formats as `00`
under the first two and **`24:00`** under the third. `"h24"` is a plausible-looking choice
that produces an hour nobody can parse as a number between 0 and 23.

**Memoise, but lazily.** Constructing a formatter per call is **30.98 µs**; reusing one is
**2.19 µs** — **14.2×**, over 20,000 iterations. At the clock's 1 Hz that difference is
nothing; at Story 2.8's scale — 390 bars × 101 securities × a backfill's worth of sessions —
it is the difference between a fast ingest and a slow one. Construct it **inside the
function on first use**, for §4.3's tree-shaking reason.

**One property of the runtime worth recording, because it is a staleness surface nobody
owns:** the timezone database is the _runtime's_, not ours. Node 24.20.0 here reports
**ICU 78.3 / tzdata 2026a**. If the US ever changes its DST rule — which has been legislated
for repeatedly and not enacted — the correction arrives through a Node upgrade and a browser
upgrade, on their schedule, not through this repository. Nothing here can check that, and it
joins the written-obligation list beside §1.4.

### 6.3 The two DST cases, measured — and both fail _silently_ today

This is the strongest argument for a single conversion module, and it is a measurement
rather than a worry. Using the natural two-pass offset resolution over `Intl`:

**The spring-forward gap.** 2026-03-08 02:30 ET does not exist. Asking for it returns
`2026-03-08T06:30:00Z`, which formats back as **01:30** — a different time from the one
asked for, returned with no error.

**The autumn fold.** 2026-11-01 01:30 ET happens twice. Asking for it returns
`2026-11-01T05:30:00Z`, the **first** of the two, chosen with no error and no signal that a
choice was made.

Both are exactly the class of silent failure the standing rule says to buy a library for —
except that the libraries in §6.4 have the same defaults, so buying one does not fix it.
**What fixes it is refusing**, which is Task 2.5.2's instruction and which no library will
do on your behalf.

**One correction to the algorithm this section names, found by Task 2.5.2 on
2026-09-06 while implementing it.** The "natural two-pass offset resolution" above —
resolve with the offset at a first guess, then re-resolve if the offset at the
resulting instant differs — **cannot detect the fold at all**, so it could never have
produced the refusal this section asks for. Probing at the first candidate returns the
offset it started from, so exactly one candidate is ever built and the ambiguity is
invisible. What works is **bracketing**: read the offset ±24 hours around the requested
wall-clock fields (transitions are months apart, so a day either side always straddles
one), build a candidate from each, and keep the ones that **round-trip** back to the date
and time asked for. Zero survivors is the gap, two is the fold, one is the answer. The
two-pass description is left standing above as the record of what this task believed.

**And there is a finding that makes refusing provably safe here.** US DST transitions are
always Sundays — second Sunday in March, first Sunday in November — and the market is closed
on Sundays. So across the covered range:

| Year | Spring forward | Autumn back | Both a Sunday? |
| ---- | -------------- | ----------- | -------------- |
| 2024 | 2024-03-10     | 2024-11-03  | yes            |
| 2025 | 2025-03-09     | 2025-11-02  | yes            |
| 2026 | 2026-03-08     | 2026-11-01  | yes            |
| 2027 | 2027-03-14     | 2027-11-07  | yes            |
| 2028 | 2028-03-12     | 2028-11-05  | yes            |

**No trading session ever begins in, ends in, or contains a DST transition.** So "refuse the
gap and refuse the fold" is not merely the cheap correct answer — it is an answer this
application can never be forced to give, because no caller has a legitimate reason to ask.

### 6.4 The libraries, costed from a fresh install and reverted

Baseline: **419 store entries / 295,348 KB / 4,766 lockfile lines**, `pnpm-workspace.yaml`
md5 `760fcd3c…`.

| Candidate                   | Packages | Lockfile lines | On disk   | Install scripts | Shipped to the browser            |
| --------------------------- | -------- | -------------- | --------- | --------------- | --------------------------------- |
| **`Intl` (no dependency)**  | **0**    | **0**          | **0**     | —               | **0 B**                           |
| `luxon` + `@types/luxon`    | +2       | +17            | 4,732 KB  | none            | **262,085 B raw / 59,958 B gzip** |
| `temporal-polyfill`         | +3       | +21            | 1,328 KB  | none            | ~151,633 B raw / 29,424 B gzip    |
| `date-fns` + `@date-fns/tz` | +2       | +18            | 27,304 KB | none            | small — see below                 |

**`allowBuilds` did not fire for any of them** and `pnpm-workspace.yaml` is md5-unchanged in
every case, so `esbuild@0.28.2` is still the only install script in the tree. Note that
`Packages: +N` and the lockfile delta are the trustworthy figures: pnpm never prunes the
virtual store, so the entry count only ever rises — Task 1.13.1's finding, visible again here
when the count went 419 → 426 across three installs and back to 419 only after the residue was
removed by hand.

**The browser column is what decides it.** The current frontend artefact is **357,210 B** of
JavaScript. Adding luxon's ESM build would be **+73%** — a design language, a router, five
routes, ten components and a live universe table, and then most of that again for date
handling. `temporal-polyfill` is better and is still ~30 kB gzipped to polyfill something one
of the two runtimes already has natively.

**`@date-fns/tz` is genuinely small — and that is the argument against it, not for it.** Its
`tzOffset` and `tzName` are wrappers over `Intl.DateTimeFormat`, read out of the published
package rather than inferred. So the cheap library is a thin layer over the thing we would
otherwise call directly, and it brings `date-fns` itself — **27 MB on disk** — to be useful.
Paying a dependency to call `Intl` on our behalf, while still having to hand-write the gap
and the fold behaviour ourselves (§6.3), is the worst of both.

**The verdict.** The standing rule asks whether the failure mode is silent. It is — and
**the libraries do not fix it**, because they resolve the gap and the fold with the same
silent defaults `Intl` does. What fixes it is a refusal in a module small enough to read,
with both cases asserted. So this is not a hand-roll of something a library does better; it
is about sixty lines of platform calls plus the two decisions no library makes for you.

The reversal trigger is **`Temporal` unflagged in Node**, at which point the platform itself
becomes the library.

---

## 7. The named dates

Acceptance criterion 1 says these are _"asserted rather than reasoned about"_, and this
section exists so Task 2.5.4 implements against a list somebody **chose** rather than a list
somebody remembered. Every date below was computed on this machine, not recalled.

### 7.1 The list, one named case per row

Each is its own named test, so a failure says which case broke.

| #   | Case                                      | Date(s)                                 | What it asserts                                                                                                                            |
| --- | ----------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Ordinary session                          | `2026-09-04` (Fri)                      | 09:30–16:00 ET, 390 bars, the control                                                                                                      |
| 2   | Weekend                                   | `2026-09-05`, `2026-09-06`              | No session; and §3's `nextSession`/`previousSession` skip to Mon/Fri                                                                       |
| 3   | Full holiday                              | `2026-12-25` (Fri) Christmas            | Closed; the Monday after (`12-28`) is an ordinary session and the day before is case 6 — the two exception kinds are adjacent              |
| 4   | **Good Friday**                           | `2026-04-03`                            | Closed — the one a rule set misses                                                                                                         |
| 5   | Half day, day after Thanksgiving          | `2026-11-27` (Fri)                      | Closes **13:00 ET**, **210** bars                                                                                                          |
| 6   | Half day, Christmas Eve                   | `2026-12-24` (Thu)                      | Closes 13:00 ET — the second half-day _producer_, different rule                                                                           |
| 7   | Holiday observed on the **Friday before** | `2026-07-03` — Jul 4 is a Sat           | Closed; and it is **not** a half day that year (§7.5)                                                                                      |
| 8   | Holiday observed on the **Monday after**  | `2027-07-05` — Jul 4 is a Sun           | Closed; `2027-07-02` (Fri) is an ordinary full session                                                                                     |
| 9   | **Spring forward**, sessions either side  | `2026-03-06` (Fri), `2026-03-09` (Mon)  | Both 6.5 h; UTC open moves **14:30Z → 13:30Z**; `2026-03-08` has no session                                                                |
| 10  | **Autumn back**, sessions either side     | `2026-10-30` (Fri), `2026-11-02` (Mon)  | Both 6.5 h; UTC open moves **13:30Z → 14:30Z**; `2026-11-01` has no session                                                                |
| 11  | The day _after_ a transition              | `2026-03-10` (Tue), `2026-11-03` (Tue)  | Ordinary sessions at the _new_ offset — the assertion that catches instant arithmetic that "worked" on Monday                              |
| 12  | The spring gap                            | `2026-03-08 02:30 ET`                   | **Refused**, not silently resolved to 01:30 (§6.3)                                                                                         |
| 13  | The autumn fold                           | `2026-11-01 01:30 ET`                   | **Refused** (or an explicit which-one), not silently the first                                                                             |
| 14  | Outside the covered range                 | `2029-01-02`                            | **Refused**, naming the range and the file (§1.5)                                                                                          |
| 15  | Session counts, per year                  | see §7.2                                | The arithmetic check that catches a missing or invented holiday                                                                            |
| 16  | "The last N sessions" across a holiday    | 5 sessions back from `2026-11-30` (Mon) | Returns `11-30, 11-27, 11-25, 11-24, 11-23` — **not** five calendar days, which would wrongly include Thanksgiving `11-26` and the weekend |

Case 16 is acceptance criterion 3, and the week is chosen deliberately: it contains a full
closure _and_ a half day _and_ a weekend, so a naive implementation is wrong three different
ways in one assertion.

### 7.2 Correction to Task 2.5.3 and 2.5.4: **252 is not a constant**

Both files instruct a check against 252 sessions a year — Task 2.5.3's notes say _"a normal
year has 252 trading days, so a year in this table that produces 253 or 251 has a missing or
invented holiday in it."_ **Measured, that is wrong for four of the five covered years, and
a test asserting 252 would ship red.**

| Year | Weekdays | Holidays on a weekday | **Sessions**    |
| ---- | -------- | --------------------- | --------------- |
| 2024 | 262      | 10                    | **252**         |
| 2025 | 261      | ~~10~~ **11** (§7.7)  | ~~251~~ **250** |
| 2026 | 261      | 10                    | **251**         |
| 2027 | 261      | 10                    | **251**         |
| 2028 | 260      | 9 (see §7.4)          | **251**         |

The session count is a function of how many weekdays the year happens to contain (260–262)
and how many holidays land on one — it is not a property of the calendar being correct. 252
is the _common_ value and folklore has rounded it into a constant.

**The check is still worth having and is still cheap** — it catches a missing or invented
holiday that every individual named date passes. It is just a **per-year table** rather than
a single number, and the table above is it. Task 2.5.4 asserts against these five figures.

**Corrected 2026-09-06 by Task 2.5.3, which checked this table against the published record
rather than deriving it: 2025 is 250 sessions, not 251.** The eleventh weekday closure is
**2025-01-09**, the National Day of Mourning for President Carter — an unscheduled closure no
rule set can produce and which the derivation above therefore could not contain. See §7.7. A
test asserting 251 would have shipped red, which is the second figure in this section to have
been wrong in exactly the way this section was written to catch.

### 7.3 Correction to Task 2.5.4: **there is no session on a DST transition day**

Task 2.5.4 instructs _"both DST transitions, asserting that the session is 6.5 hours on both
days"_. **There is no session on either day** — every US DST transition is a Sunday (§6.3),
without exception across the covered range and by the rule generally.

The assertion that was meant, and the one that actually catches the bug, is on **the Friday
before and the Monday after**: both sessions are 6.5 hours, and their **UTC** bounds move by
an hour between them. That is the assertion that fails if anything anywhere did arithmetic on
an instant instead of a calendar operation on a market date, which is why cases 9, 10 and 11
are worded the way they are. Case 11 matters most and is the one that would have been left
out: the Tuesday _after_ is where an implementation that special-cased the transition
weekend and got the new offset wrong finally shows up.

### 7.4 The observance rule has an exception, and it is inside the covered range

Task 2.5.3 states the rule correctly — Saturday → preceding Friday, Sunday → following
Monday — and it has one documented exception: **New Year's Day falling on a Saturday is not
observed on the preceding Friday**, because that Friday is in the _previous_ year. The
precedent is 2022: 1 January was a Saturday and the market was open on Friday 31 December
2021, with no January closure at all.

**That case is in range: 2028-01-01 is a Saturday**, which is why 2028 has nine weekday
holidays rather than ten in §7.2's table, and why `2027-12-31` (Fri) is an ordinary full
session. It is worth a named test of its own, and it is the specific reason §1.4 tells Task
2.5.3 to confirm 2028 against NYSE's published calendar rather than deriving it.

### 7.5 The half-day rule yields to the observance rule, and 2026 and 2027 both show it

The two rules interact, and the interaction is not stated in any task file:

- **2026**: Independence Day is a Saturday, so 3 July is the **observed full closure** — it
  is _not_ a 13:00 half day. A list that applies the "3 July is a half day" rule
  mechanically produces a phantom half session.
- **2027**: Christmas Day is a Saturday, so 24 December is the **observed full closure** —
  so there is no Christmas Eve half day that year, and the early close does **not** shift to
  23 December.

Derived half days across the range, for Task 2.5.3 to cross-check:

| Year | Half days                 | Count |
| ---- | ------------------------- | ----- |
| 2024 | `07-03`, `11-29`, `12-24` | 3     |
| 2025 | `07-03`, `11-28`, `12-24` | 3     |
| 2026 | `11-27`, `12-24`          | 2     |
| 2027 | `11-26`                   | 1     |
| 2028 | `07-03`, `11-24`          | 2     |

**These are derived and must be confirmed, not trusted.** Task 2.5.3's own note is right that
half days are where published lists disagree, and this table is exactly the artefact of a
rule set that §1.2 rejected — it is here as a _cross-check target_, not as the source. The
day-after-Thanksgiving rows are the safest; the 3 July rows are the ones to look at hardest,
because the historical treatment when 4 July falls on a Sunday (no early close on the
preceding Friday, per the 2021 precedent) is the least uniform part of the rule.

### 7.6 The full closures, derived, for the same cross-check

| Year | Dates                                                                                    |
| ---- | ---------------------------------------------------------------------------------------- |
| 2024 | `01-01`, `01-15`, `02-19`, `03-29`, `05-27`, `06-19`, `07-04`, `09-02`, `11-28`, `12-25` |
| 2025 | `01-01`, `01-20`, `02-17`, `04-18`, `05-26`, `06-19`, `07-04`, `09-01`, `11-27`, `12-25` |
| 2026 | `01-01`, `01-19`, `02-16`, `04-03`, `05-25`, `06-19`, `07-03`, `09-07`, `11-26`, `12-25` |
| 2027 | `01-01`, `01-18`, `02-15`, `03-26`, `05-31`, `06-18`, `07-05`, `09-06`, `11-25`, `12-24` |
| 2028 | `01-17`, `02-21`, `04-14`, `05-29`, `06-19`, `07-04`, `09-04`, `11-23`, `12-25`          |

Note 2027 shows both observance directions in one year (`06-18` Friday-before, `07-05`
Monday-after) and 2028 shows the exception (no January row).

**Both tables were confirmed against the published record on 2026-09-06 by Task 2.5.3, and
they hold exactly** — all 49 derived scheduled closures and all 11 derived half days, 2028's
missing January row included. That is a better result than this section expected: it warned
that the 3 July rows were the ones to look at hardest, and they are right. The source read was
NYSE's own `markets/hours-calendars` page for 2026–2028 and archived editions of that same
page for 2024 and 2025, which NYSE no longer publishes because it carries three years forward
and drops years as they pass.

**Two things that reading changed, and only one of them is in these tables.**

**§1.4's conditional instruction did not fire.** It told Task 2.5.3 to narrow the range to
2027 if 2028 turned out not to be published. **It is published**, footnotes and all, so the
range is 2024–2028 as chosen and nothing in this calendar is derived.

**And the derived tables are missing a row that no derivation could have contained** — which
is §7.7, and which is the strongest confirmation of §1.2 available.

### 7.7 The row no rule set can produce: 2025-01-09

**The US equity market was fully closed on Thursday 9 January 2025** for the National Day of
Mourning for President Carter, announced on 2024-12-30 and effective eleven days later. It is
absent from §7.6's derived list — correctly, because that list is derived — and it is absent
from the NYSE calendar page as it stood before Carter died, which is the page a
forward-looking source is.

Two consequences, and the second is the one that would have cost a task.

**§1.2's argument is confirmed by something stronger than Good Friday.** Good Friday shows
that a rule set needs an awkward rule; this shows that **no rule set is sufficient in
principle**, because the closure was a decision taken eleven days beforehand and no function
of the calendar produces it. `MARKET_CALENDAR` holds it because it was checked against what
happened rather than computed from what was scheduled.

**§7.2's 2025 figure was wrong, and Task 2.5.4 would have shipped a red test.** 2025 has
**eleven** weekday closures and **250** sessions. That correction is applied in §7.2 above.

It also retires a hypothetical: §1.3 kept the early-close time on the row rather than in a
constant so that "an unscheduled closure or an unusual close time is expressible as data".
That is no longer a defence of a possibility — the table already carries an unscheduled
closure, in range, today.

**Provenance, per `UNIVERSE.md` §11's convention rather than a second one of our own:** the
source is **NYSE's published holiday and hours calendar** (the SEC's and Nasdaq's agree), and
the file records **the date the list was last checked against it** — never `now()`, for
exactly the reason §11 gives: a provenance date that is always today cannot report staleness.
Task 2.5.3 sets that date to the day it actually does the check. **It did: `checkedOn` is
`2026-09-06`, and `nextEditDue` is `2028-01-01` per §1.4.** One departure from `UNIVERSE.md`
§11 is recorded rather than absorbed: that file owes its per-group provenance the negative
fact that _every row shares one source_, and here it does not — 2025-01-09 came from the
closure announcement rather than from the calendar page. A per-row `source` field was declined
under Task 1.7.3's rule that a field ships with its first reader, since nothing renders
calendar provenance where Story 2.14 does render the universe's; the fact is written in the
constant's own comment instead. **The reversal trigger is the first screen that shows where a
trading day came from, or a second row from a third source.**

---

## What this task deliberately did not decide

- **The on-screen format of a market timestamp.** §5 fixes the wire; Task 2.5.5 owns the
  formatter, under Task 1.12.4's existing rule (hand-rolled over `toLocaleTimeString`,
  because a locale-dependent string changes width and `tabular-nums` cannot fix that).
- ~~**What `BackendIndicator`'s unlabelled local time should become.** Task 2.5.2 owns
  it.~~ **Decided by Task 2.5.2 on 2026-09-06: it stays LOCAL and gains the word
  `local`**, so it now reads `Last confirmed 10:42:17 local`. "When this client last got
  an answer" is a fact about the client rather than the market — a diagnostic about this
  browser's connection, which a reader compares against their own sense of how long ago
  that was — so ET would make it comparable with the market clock nobody wants and
  incomparable with their own. The label is the **word** rather than the viewer's timezone
  abbreviation for two reasons: the abbreviation needs an `Intl.DateTimeFormat` call that
  criterion 2's new lint rule now forbids outside the boundary module, and it varies in
  width (`EDT` against `GMT+8`), which is the exact objection that made this a hand-rolled
  formatter in the first place. The datum that made it urgent: the browser measurement in
  §6.2 was taken on a machine reporting `Asia/Singapore`, so that time was thirteen hours
  from ET and said nothing about which.
- **Whether the clock is trusted from the browser or the server.** Task 2.5.5's, and its
  brief already frames it correctly: for this story it is the viewer's clock rendered in
  market time, which is a timezone claim rather than a synchronisation claim.
- **Anything about the live feed.** The `LIVE` state and the feed indicator remain Epic 3's;
  §2's session definition says when the market is open, not whether data is arriving.

---

## The tree is byte-identical

**Scoped 2026-09-06: this section is Task 2.5.1's own closing statement and is not a claim
about the story.** Task 2.5.2 shipped `packages/shared/src/market-time.ts`, its tests, a
barrel export and two lint rules — with no dependency, no lockfile change and no
`pnpm-workspace.yaml` change, so every figure below still holds for what it names.

Nothing was installed that stayed. Three candidate installs were made and reverted, and the
tree was re-measured afterwards:

```
store entries    419   (unchanged; the residue of three installs removed by hand — pnpm never prunes)
lockfile lines   4766  (unchanged)
pnpm-workspace   md5 760fcd3cdac9aa970f4470c95f965621  (unchanged)
install scripts  esbuild@0.28.2 and nothing else
git status       clean outside planning/
```
