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
  suite says the covered years are right and says nothing about next year
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
  own source comment and Story 1.5's files; and any claim that nothing in this codebase
  handles time. Apply the distinction Task 1.10.8 established and every close since has
  re-applied: **a live claim gets corrected and a historical record of what a task believed
  is left standing**, because rewriting the second destroys the record. Read each hit
- **Re-take the artefact figures.** The bundle moved at Task 2.5.2 or 2.5.3 (`packages/shared`
  is inlined) and again at 2.5.5 (real frontend source), so the four-file figure this file
  carries is stale. Confirm the tree-shaking prediction Task 2.5.1 made about the holiday
  table while you are there — a literal should be free to a build that does not use it, and
  a table built by a call expression will not be
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
self-referential and are therefore the real checks: the **252-session arithmetic** across a
full year, and the **DST assertion** that a session is 6.5 hours on both transition days
while its UTC bounds move by an hour.
