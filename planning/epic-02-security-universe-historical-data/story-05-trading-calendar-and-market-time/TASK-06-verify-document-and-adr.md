# Task 2.5.6 — Verify, document, and ADR 0017

**Status:** Not started
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
  obligations, which are the calendar's annual edit and the runtime's tzdata
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
  is left standing**, because rewriting the second destroys the record. Read each hit
- **Re-take the artefact figures, against Task 2.5.1's table of predictions** rather than
  the assumption this bullet originally carried. ~~The bundle moved at Task 2.5.2 or 2.5.3~~
  — **`CALENDAR.md` §4.3 predicts it did not**: 0 bytes and an unchanged hash at 2.5.2, 2.5.3
  and 2.5.4, and **+5 to +8 kB raw at 2.5.5**, which is the first task with a real frontend
  consumer. Check all four. **An unchanged bundle at 2.5.2–2.5.4 is evidence rather than a
  null result** — it means the holiday table stayed a plain literal and the
  `Intl.DateTimeFormat` was constructed lazily rather than at module load. If any of the three
  moved, that is the finding, and Task 2.3.8's `SECTOR_ETFS` mechanism is the first thing to
  look at. **Two of the four are already measured and hold (added 2026-09-06): 2.5.2 and
  2.5.3 both read 357,216 B, the baseline exactly**, with every calendar string absent from
  `dist/` and `storybook-static/` — so what is genuinely open is 2.5.4 and 2.5.5, and 2.5.5's
  is the only one of the four with a number in it worth being wrong about
- **Re-take the test counts and the `pnpm verify` split**, with and without a database
  running, which is criterion 5 and is the one this story could plausibly have broken by
  putting the calendar in Postgres

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
claims and both are now false. `CLAUDE.md`'s tree block and `Commands` section,
which mention neither `packages/shared/src/market-time.ts` nor the two new lint
rules. And `README.md`'s first-run list, which calls the market clock
`--:--:-- ET` a reserved region that **Epic 3 supplies** — that was already wrong
when Story 2.5 was split (Task 2.5.5 supplies it) and stops being true altogether
at 2.5.5. Note also that the `BackendIndicator` timestamp now reads
`Last confirmed HH:MM:SS local`, which no first-run list mentions and which is
deliberate rather than an omission.

This correction is the reason the amendment convention exists: this file writes ADR 0017, and
an ADR is a permanent identifier cited outside this repository. Both errors would have been
recorded as findings in it.
