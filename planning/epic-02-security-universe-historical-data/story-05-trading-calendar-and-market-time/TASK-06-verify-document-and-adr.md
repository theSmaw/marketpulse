# Task 2.5.6 — Verify, document, and ADR 0017

**Status:** Complete
**Story:** [2.5 Trading Calendar & Market Time Handling](STORY.md)
**Depends on:** Tasks 2.5.1 to 2.5.5

## Objective

Re-run all five acceptance criteria against what shipped rather than against what the task
files claimed, re-take every figure, and record the decisions where the four consumers will
find them — three later stories in this epic and Epic 13.

## What the user can see when this lands

**No change from Task 2.5.5**, which is the check rather than a gap: this task ships no
application source, so the artefact should reproduce Task 2.5.5's figures to the byte. It
being identical is evidence; it being different means something was shipped here that was
not meant to be.

## Work

- **Re-run all five criteria**, and re-take the numbers rather than citing them. Criterion 1
  is the one to be strict about: run the named-date suite and _read the names of the tests
  that passed_, because a suite that silently stopped collecting a file reports green — this
  repository has recorded that trap twice (`.tsx` under a `.ts`-only glob, and a
  non-matching `-t` filter reporting 0 failures at exit 0)
- **Write `docs/adr/0017-*`.** It is an ADR rather than only a `CALENDAR.md` because two of
  its decisions are consumed outside this epic: **where market time is converted**, and
  **where "now" is read**, which is the seam invariant 4 rests on. Follow ADR 0016's shape,
  including the closing section this repository always writes — _what a correct calendar
  certifies and what it cannot_. The honest content of that section is that the calendar is
  a **checked-in table with a one-edit-a-year obligation nothing enforces**, and that a green
  suite says the covered years are right and says nothing about next year.
  **Task 2.5.3 found a second and sharper thing that section has to say (added 2026-09-06):
  a green suite does not say the covered years are still RIGHT.** `2025-01-09` was a full
  closure announced eleven days beforehand for a National Day of Mourning. An unscheduled
  closure inside an already-checked year is invisible to every instrument here — the table
  passes its own tests, and the arithmetic check passes because it is derived from the table
  it is checking. The only thing that catches one is somebody re-reading the source. So the
  obligation is not merely "extend the range once a year"; it is also **"a year you already
  checked can acquire a row"**, which is a different and worse obligation because it has no
  due date. That is what makes `CALENDAR.md` §1.6's cross-check against a provider calendar
  worth more than it looked when it was written, and the ADR should say so: it is the only
  mechanism anybody has proposed that would notice.
  **One of this story's own claims changed at Task 2.5.2 and the ADR must not repeat
  the old one (added 2026-09-06): criterion 2 is ENFORCED rather than written down.**
  `CALENDAR.md` §3.4 predicted it would join `CLAUDE.md`'s third kind of gap — a
  stated invariant nothing checks, held "by a grep and a written rule" alongside
  "one file calls `fetch`". It did not: it is held by two `no-restricted-syntax`
  rules in `eslint.config.mjs` with `market-time.ts` as their single exception,
  both made to fail in two packages before being believed. So the ADR should say
  criterion 2 is checked, say what the check **cannot** see — a conversion written
  with a hard-coded `-5` and no timezone name, which is a reimplementation rather
  than a duplicate — and **not** list it beside the two genuine unenforced
  obligations, which are the calendar's annual edit and the runtime's tzdata.
  **The same thing happened a second time and the ADR owes the SHIPPED scope rather
  than the sketch (added 2026-09-06 by Task 2.5.5).** `CALENDAR.md` §3.4 asked for a
  `Date.now()` rule in the same change that created the clock module, and imagined a
  **workspace-wide** rule with `use-market-clock.ts` excepted. What shipped is
  **narrower and stronger**: `Date.now()` and a zero-argument `new Date()` are
  forbidden anywhere in `packages/shared/src`, **with no exception at all**. The
  argument is the one the ADR should carry, because it generalises — the
  workspace-wide version needs **two** exceptions, since `use-backend-health.ts`
  legitimately stamps `new Date()` for a local diagnostic, and **a rule with two
  exceptions teaches every reader to consult the exception list rather than the
  rule**. Both patterns were made to fail in `market-session.ts` before being
  believed, and the tree was confirmed byte-identical after the revert.
  §3.4 and `STORY.md`'s open decision 3 are **already amended** by 2.5.5 — do not
  redo them; what is owed here is the ADR saying the shipped scope
- **The ADR owes one decision Task 2.5.4 took that this file predates (added 2026-09-06):
  what happens when a session walk leaves the calendar's covered range.** It **propagates**
  `MarketCalendarRangeError` rather than truncating, in all four walking functions, and that
  belongs in an ADR rather than only in `CALENDAR.md` for the same reason the other two do —
  it is consumed **outside this epic**. Epic 5's baseline is specified at 60 trading days
  (`PRODUCT_SPEC.md` §5.1), so asking for it from early January crosses the lower bound
  routinely, and the alternative — hand back the 47 sessions that exist — is indistinguishable
  from a correct answer at the call site and surfaces as an anomaly score computed over the
  wrong window. **Task 2.5.5's clock is the single stated exception**, because its input is
  always today and it cannot refuse; record the exception with the decision, not separately.
- **Number it 0017 and do not renumber anything.** ADR numbers are permanent identifiers and
  the file number is not the ordinal — this file already records that 0014 was written after
  0015
- **Point at `CALENDAR.md` rather than copying it** into `CLAUDE.md` and `README.md`. That is
  `e2e/README.md`'s and `migrations/README.md`'s treatment, and it exists because duplicating
  a paragraph for legibility is how Epic 1 ended with twelve near-identical blocks
- **Amend `STORY.md`'s Out-of-scope list**, which says the market-clock region stays reserved
  for Epic 3. Task 2.5.5 shipped it. Amend the file rather than remembering — the convention
  is a strike-through with the correction beside it, never a silent rewrite
- **Amend the four consumers rather than leaving them to discover this.** Story 2.8 (which
  minutes should have bars, and the half-day count), Story 2.9 (the wire format for a market
  timestamp), Story 2.13 (the window control resolves through these functions) and Epic 3
  (what remains of the header strip). A story whose inputs changed and whose file does not
  say so is how work gets done twice
- **Run the sweep, and expect it to find something**, because every close in this project has.
  The candidates here: the "reserved market clock" claim, which is in `CLAUDE.md`'s tree
  block, `README.md`'s list of things that read as faults on a correct first run, `AppHeader`'s
  own source comment and Story 1.5's files; the `--:--:-- ET` string itself, which appears in
  `README.md`'s first-run list as one of the seven things that read as faults and stops being
  one at Task 2.5.5; and any claim that nothing in this codebase handles time. **Sweep for
  "252" as well** — Task 2.5.1 corrected it in this story's own files, and the ADR must not
  reintroduce it. **Sweep for "251" beside it (added 2026-09-06)**, because that figure was
  corrected a second time and only for 2025: a bare `251` is correct for three of the five
  years, so this is the one sweep in the story where the string alone cannot separate a live
  claim from a correct one and every hit has to be read in its year's context. Apply the
  distinction Task 1.10.8 established and every close since has
  re-applied: **a live claim gets corrected and a historical record of what a task believed
  is left standing**, because rewriting the second destroys the record. Read each hit.
  **Task 2.5.5 ran that sweep and closed most of it; what it left open is listed here so this
  task does not spend its time on work already done (added 2026-09-06).** That is this file's
  own rule about silently-closed candidates, applied to itself.
  **Closed, verify rather than redo:** `README.md`'s first-run list (struck through, with the
  clock's real behaviour and the `LIVE`-belongs-to-Epic-3 note beside it) and its routing
  section; `CLAUDE.md`'s tree block (now carries `use-market-clock.ts` and `MarketClock/`),
  its Story 1.5 and Story 1.12 sentences, and its `Commands` block's test and e2e counts;
  `AppHeader`'s source comment and its stylesheet; `STORY.md`'s Out-of-scope list and open
  decision 3; `CALENDAR.md` §3.3 and §3.4.
  **STILL OPEN, and the first is a live claim in a file this list did not name:**
  - **`planning/epic-01-application-foundation/EPIC.md`'s Epic 1 exit summary** ends
    _"So Story 1.12 fills a third region rather than repointing the feed one, **and the clock
    region stays reserved**"_. That is a live claim and Task 2.5.5 falsified it. It is neither
    `CLAUDE.md`, `README.md`, `AppHeader` nor Story 1.5, which is the four places this bullet
    named — so the lesson is the one this repository keeps relearning: **the sweep's candidate
    list is a list of the places somebody remembered.** Grep, do not read the list.
  - **`docs/adr/0005-*` §3** describes _"a reserved market clock region"_ in the **present
    tense**. That is exactly the shape Task 1.12.8 found and corrected in ADR 0011 §23, which
    described a deleted module in the present tense two tasks after its deletion — so this is
    a **decision to take rather than an obvious fix**: an ADR is a record of a decision at a
    point in time and is not renumbered or rewritten, but a present-tense sentence that is now
    false is a trap for whoever reads it next. Take the call and say which rule you applied.
  - **`CLAUDE.md`'s `Commands` section** still mentions neither `market-time.ts` nor any of
    the lint rules — and note there are **four** now rather than the two this file's closing
    section names, because Task 2.5.5 added the two clock patterns beside the two conversion
    ones.
  - **`CLAUDE.md`'s third-kind-of-gap list owes a new entry**: the frontend half of the clock
    rule stays prose, deliberately, because a workspace-wide version needs two exceptions.
    That is a genuine unenforced invariant and it belongs on the list beside the calendar's
    annual edit and the runtime's tzdata
- **Re-take the artefact figures, against Task 2.5.1's table of predictions** rather than
  the assumption this bullet originally carried. ~~The bundle moved at Task 2.5.2 or 2.5.3~~
  — **`CALENDAR.md` §4.3 predicts it did not**: 0 bytes and an unchanged hash at 2.5.2, 2.5.3
  and 2.5.4, and **+5 to +8 kB raw at 2.5.5**, which is the first task with a real frontend
  consumer. Check all four. **An unchanged bundle at 2.5.2–2.5.4 is evidence rather than a
  null result** — it means the holiday table stayed a plain literal and the
  `Intl.DateTimeFormat` was constructed lazily rather than at module load. If any of the three
  moved, that is the finding, and Task 2.3.8's `SECTOR_ETFS` mechanism is the first thing to
  look at. ~~**Two of the four are already measured and hold (added 2026-09-06): 2.5.2 and
  2.5.3 both read 357,216 B, the baseline exactly**, with every calendar string absent from
  `dist/` and `storybook-static/` — so what is genuinely open is 2.5.4 and 2.5.5~~ **THREE of
  the four are measured and hold (updated 2026-09-06 by Task 2.5.4): 2.5.2, 2.5.3 and 2.5.4
  all read 357,216 B on an unchanged 18,058 B stylesheet**, with `before_open`, `after_close`
  and `Good Friday` all zero in the bundle alongside the calendar strings — every function in
  `market-session.ts` is a function declaration and its three exported constants are plain
  literals, so the whole module drops. ~~**So only 2.5.5's is genuinely open**, and 2.5.5's
  is the only one of the four with a number in it worth being wrong about~~ — **all four are
  measured now and the fourth was WRONG, which is the finding (added 2026-09-06 by Task
  2.5.5).** The artefact reads **368,877 B of JavaScript (`cdfb315a…`) and 19,489 B of CSS
  (`e853a70a…`)**, `index.html` 1,101 B (`f5410211…`), 300 B, for **389,767 B over four
  files** — **+11,661 B and +1,431 B** against a predicted **+5 to +8 kB raw**. `CALENDAR.md`
  §4.3 is amended with the breakdown; do not re-derive it, and **do not quietly correct the
  prediction to match** — an estimate that was out by half is worth an ADR sentence.
  The useful half of why: **the table came in almost exactly as forecast** (3,853 B minified
  against ~3.25 kB) and **the code that reads it was under-costed by roughly 4 kB**, which is
  more than twice the table. All three market modules are in the browser bundle for the first
  time, confirmed by grep rather than inferred — `Thanksgiving Day`, `Good Friday`,
  `America/New_York` and `before_open` are all present where Task 2.5.4 measured them at
  zero. This task's own artefact must reproduce those figures **to the byte**, because it
  ships no application source
- **Three things Task 2.5.5 measured that the ADR's what-it-does-not-certify section should
  carry, and that must not be re-derived blind (added 2026-09-06).**
  - **The re-render cost is measured, including the counterfactual.** With `useMarketClock`
    called from `AppHeader` the landing route re-renders **0 times in 20 s of ticking**; with
    it lifted to `App`, **40**. Over 60 s: **0 `longtask` entries and 60 header DOM mutations,
    all 60 inside the clock cell**. That fired Task 1.12.5's own recorded reversal trigger
    ("a second consumer, or a render rate that is no longer a poll"), so the ADR records a
    trigger that **fired and was acted on** rather than one still standing.
  - **`MarketSessionState` has five members and the clock renders three words**, which is a
    collapse rather than a transcription: four members share `closed` and differ in the
    sentence below it. The ADR should say the union is what makes that possible, because the
    boolean this story rejected could not have carried the difference at all.
  - **A green browser suite does not certify the renderings a browser cannot reach.** Two of
    the clock's six states — a named closure, and an instant past the calendar's range — are
    reachable only by changing the machine's date, so the axe gate and every browser journey
    are structurally blind to them. The workshop is not, and it **caught a real layout defect
    in one of them** that no other instrument here could have seen. That belongs beside the
    existing "what a green run does not certify" items rather than as a component note
- **Re-take the test counts and the `pnpm verify` split**, with and without a database
  running, which is criterion 5 and is the one this story could plausibly have broken by
  putting the calendar in Postgres. **Task 2.5.5's figures to check against**: `pnpm test`
  **466** (159 + 146 + 161), `test:process` **14**, `test:database` **61**, `pnpm e2e` **23**
  in ~1:02 with the wall time unmoved by two new journeys, `pnpm verify` **exit 0** both ways.
  The axe baseline is **0 violations / 37 passes / 1 inconclusive** on the landing route,
  unchanged by the clock

## Done when

- All five criteria are re-run against the shipped tree and every figure is re-taken
- `docs/adr/0017-*` exists and carries the what-it-does-not-certify section
- `STORY.md`'s scope contradiction is resolved in the file, not only here
- The four consumers are amended
- The sweep is run, each hit read, and live claims separated from historical records
- `pnpm verify` is exit 0 both with and without a database

## Notes

The one thing worth being suspicious of at close: this story's tests are entirely
self-referential — the calendar's tests assert against the calendar's own dates. That is
unavoidable and it is worth naming in the ADR, along with the two things that are not
self-referential and are therefore the real checks. **Both were stated wrongly here and were
corrected by Task 2.5.1 on 2026-09-06; the corrected forms are what belongs in the ADR:**

- ~~the **252-session arithmetic** across a full year~~ → the **per-year session count**,
  which is **2024: 252, ~~2025: 251~~ 2025: 250, 2026: 251, 2027: 251, 2028: 251**
  (`CALENDAR.md` §7.2). 252 is not a constant — the count follows how many weekdays a year
  contains and how many holidays land on one, and a test asserting 252 is red on four of the
  five covered years. **Corrected a SECOND time on 2026-09-06, by Task 2.5.3, and this is the
  figure the ADR must carry**: 2025 is **250**, because `2025-01-09` was a full closure for
  the National Day of Mourning — an unscheduled closure §7.2's derivation could not contain
  (`CALENDAR.md` §7.7). `market-calendar.test.ts` asserts all five figures, so read them off
  a passing run rather than off this file
- ~~the **DST assertion** that a session is 6.5 hours on both transition days while its UTC
  bounds move by an hour~~ → **there is no session on either transition day**; they are
  always Sundays. The assertion is on the **Friday before and the Monday after** — both 6.5
  hours, UTC open moving 14:30Z → 13:30Z — plus **the Tuesday after**, which is the case that
  catches an implementation that special-cased the transition weekend (`CALENDAR.md` §7.3)

**Three more sweep candidates, added 2026-09-06 after Task 2.5.2 shipped.** The
claim that criterion 2 is held by a grep and a written rule, which is in
`CALENDAR.md` §3.4 and in `CLAUDE.md`'s third-kind-of-gap list — both are live
claims and both are now false. ~~`CLAUDE.md`'s tree block and `Commands` section,
which mention neither `packages/shared/src/market-time.ts` nor the two new lint
rules.~~ **Half of that is closed and half is not (checked 2026-09-06 by Task
2.5.4): the tree block now carries all three of `market-time.ts`,
`market-calendar.ts` and `market-session.ts`, so what remains is the `Commands`
section and the two lint rules — re-read rather than assumed, because a sweep
candidate that has silently been closed is how a close spends its time on work
already done.** And `README.md`'s first-run list, which calls the market clock
`--:--:-- ET` a reserved region that **Epic 3 supplies** — that was already wrong
when Story 2.5 was split (Task 2.5.5 supplies it) and stops being true altogether
at 2.5.5. Note also that the `BackendIndicator` timestamp now reads
`Last confirmed HH:MM:SS local`, which no first-run list mentions and which is
deliberate rather than an omission.

**A fourth sweep candidate, added 2026-09-06 by Task 2.5.4: the session functions have real
names now and two live documents use the provisional ones.** `CALENDAR.md` §3.2 threads a
hypothetical `Clock` through `isMarketOpen`, `sessionBounds` and `nextSession`, and §7.1's
case 2 says `nextSession`/`previousSession`. What shipped is `marketSessionStateAt`,
`marketSessionOn`, `nextMarketSession` and `previousMarketSession`. §3.2 is **the section
Epic 13 reads**, so an engineer arriving there will grep for a `sessionBounds` that does not
exist. This is the one sweep hit in the story where the distinction Task 1.10.8 established
needs care in the other direction: §3.2's names are **illustrative of a shape it is arguing
against** rather than claims about the API, so the fix is to name the real functions beside
them rather than to strike them out — and the task files that used the provisional names are
historical records and stay exactly as they are.

This correction is the reason the amendment convention exists: this file writes ADR 0017, and
an ADR is a permanent identifier cited outside this repository. Both errors would have been
recorded as findings in it.

---

## Status: Complete (2026-09-06)

## What this actually was, in plain language

This task shipped **no application code at all**, and that was the point. It was the closing
audit on Story 2.5 — the story that taught MarketPulse what a trading day is.

Five earlier tasks built the thing. This one checked that they built what they said they
built, re-measured every number rather than copying it out of a previous write-up, and wrote
the permanent record of the decisions so that nobody has to reconstruct them from the code in
a year's time.

## Why a stock-market product needed a task about calendars

It sounds like plumbing. It is the difference between a chart a trader trusts and one they
close.

The US stock market is open 09:30 to 16:00 New York time, Monday to Friday — **except** when
it isn't. It shuts on ten public holidays a year. It closes early at 1pm on eleven afternoons
across the next five years, around Thanksgiving, Christmas and Independence Day. It observes a
Saturday holiday on the Friday before, unless that Friday is in the previous year, in which
case it doesn't. Twice a year the clocks change, so the same session starts at a different
moment in universal time. And **on 9 January 2025 it shut for a day nobody could have
predicted**, for the national day of mourning for President Carter, announced eleven days
beforehand.

Get any of that wrong and the product tells lies quietly: a price chart draws a flat line
across Good Friday as though nothing happened, or shows a three-hour hole every Thanksgiving
Friday and calls it missing data, or an "unusual activity" score compares today against 47
days of history while claiming 60. **None of those look like bugs. They look like the market.**

## What was decided, and why you should care about the reasoning

Six decisions matter beyond this story, and they are now written in
`docs/adr/0017-*` — the seventeenth architecture decision record in the project.

**1. The holiday list is a file we maintain by hand, not something we compute.** The obvious
engineering instinct is to write the rules — third Monday in January, last Monday in May, and
so on. Nine of the ten holidays work that way. **Good Friday does not**, because Easter moves.
A rule-based calendar would look completely correct for eleven months a year and be wrong on
one spring Friday. And the Carter closure settles it permanently: **no rule can produce a day
the exchange decided to close eleven days in advance.** So we read the exchange's published
calendar and typed it in — 61 entries covering 2024 to 2028.

**2. If you ask about a date outside those years, it refuses.** It does not guess. The
tempting behaviour — "no holidays on file for 2029, so the market must have been open" — turns
every future Christmas Day into a phantom trading day, silently. Instead it stops and names
the file to edit. There is deliberately no "just carry on anyway" switch, because a switch
whose dangerous setting is available is a switch somebody flips during an emergency.

**3. Exactly one file in the entire codebase is allowed to convert between world time and New
York time — and the build now enforces that rather than asking politely.** Timezone code
scattered across a project is wrong twice a year, on the two days nobody tests. Four automated
rules in the linter now reject any second copy, and each one was deliberately broken and
watched to fail before we believed it.

**4. The groundwork for the product's flagship feature is in place, and it is an absence
rather than a mechanism.** MarketPulse's headline capability, several epics away, is **replay**
— rewind to 11:07am on a past day and see only what was knowable at that moment. That only
works if nothing in the system can secretly peek at the real clock. So every calendar function
takes the moment it is asked about as an input, and **exactly one file in the product is
allowed to ask what time it actually is**. When replay arrives, one file changes instead of
hundreds. The honest caveat is written into the record too: this makes the _clock_ swappable,
it does not yet stop a database query fetching tomorrow's data. That is a separate piece of
work and pretending otherwise would be the most expensive kind of self-deception.

**5. Asking for more history than we hold is an error, not a short answer.** If something asks
for the last 60 trading days and only 47 exist in our calendar, it refuses. Handing back 47
and staying quiet is worse than failing, because the caller cannot tell — and it would surface
much later as an anomaly score computed over the wrong window, which is the sort of bug that
takes a week to find.

**6. The clock in the header is real.** Since the very first weeks of the project, the top of
every screen has carried a greyed-out `--:--:-- ET` placeholder holding space for a market
clock. It now ticks, in New York time, and says whether the market is open, closed for the
weekend, closed for a named holiday, or shut early on a half day. Small on screen; it is the
first thing in the product that is _alive_.

## What this task actually found

Every close in this project turns up something, and this one turned up four things.

**The holiday table has 61 entries, not the 60 that had been written down.** The file has not
been touched since it was created, so the number was **wrong when it was recorded rather than
having gone stale** — and the missing entry is the Carter closure. The count had been worked
out from the _rules_, in the very task written to prove the rules are not enough. That is the
kind of error only a recount catches, and it is exactly why closing tasks exist.

**Two planning documents still said the market clock was somebody else's job.** One of them
was in a file nobody's checklist mentioned. The lesson, which this project keeps relearning:
search the whole tree, don't work from the list of places you remember.

**Four links between documents were broken** — the first time in six audits that this check has
found any. All four dated from a big renumbering exercise a day earlier. Fixed.

**A browser test failed once and passed on the retry, and it was not swept under the carpet.**
It is not one of this story's tests, and it passes on its own. The cause is understandable —
under heavy parallel load the app's first health check can time out and the next attempt is 30
seconds away. This project deliberately runs its tests with **no automatic retries**, on the
principle that a test allowed to retry can no longer tell a flaky test from a real bug, so the
failure is written down with its numbers and handed to the story that owns it rather than
being re-run past.

## Where the product now stands

Epic 1 built the application shell, the deployment pipeline and the live site. Epic 2 is
building the market data underneath it. Of Epic 2's fourteen stories, five are done: the
database exists and is deployed, the schema and migration machinery work, the list of ~100
tracked companies is loaded, **that list is on screen at a public URL**, and as of this story
the system knows what a trading day is.

**For a stakeholder, the honest summary is: you can visit the site and see the real tracked
universe, with a live market clock in the header that knows the market is shut for the weekend.
You cannot yet see a price.** That is next — Story 2.6 puts a market-data provider behind an
interface, 2.7 connects to Alpaca, 2.8 loads years of historical prices, and Story 2.12 draws
the first chart. **This story is why that chart's time axis will be right the first time**,
rather than being right after somebody spends a day working out why there is a gap every
Thanksgiving.

## Verification

- **All five acceptance criteria re-run against the shipped code**, not against what the task
  files claimed.
- Criterion 1 was checked by **reading the names of the tests that passed** rather than
  trusting the green tick — a suite that quietly stops running a file also reports success,
  which this project has been caught by twice.
- Criterion 2 was checked by **deliberately breaking all four linter rules** and watching each
  one fail, then reverting.
- `pnpm verify` passes **with the database running and with it stopped** (30.9 s), which is
  criterion 5 and the one this story could plausibly have broken.
- 468 fast tests, 14 process tests, 61 database tests, 23 browser journeys.
- Accessibility unchanged: **0 violations** on the landing page with the new clock in the
  header.
- The published web bundle reproduces the current committed figures **to the byte**, which is
  the check rather than a coincidence, because this task shipped no application code.
