# Task 4.9.9 — The gates, and Epic 4's close

**Status:** Not started
**Story:** [4.9 The Rehearsal, the Sweep, & Epic 4's Close](STORY.md)
**Depends on:** 4.9.2, 4.9.3, 4.9.4, 4.9.5, 4.9.6, 4.9.7, 4.9.8

## Objective

Acceptance criteria 6 and 7: the four gates green **with their numbers rather
than an assertion**, and **Epic 4 closed** — its exit criterion verdicted, and
what ships open carrying an **owner and a condition** rather than an epic
number.

## What the user can see when this lands

**Nothing new.** A closed epic whose figures can be re-taken rather than cited.

## Work

- **Run `pnpm verify`, `pnpm test:database`, `pnpm e2e` and `pnpm links`, and
  record each one's numbers** — the invariant count, the test counts per
  package, the spec counts, the document and link counts. An assertion that
  they are green is not what the criterion asks for.
- **Read the machine's load BEFORE each run, never during it.** The browser
  suite is its own plant: a full `pnpm e2e` begun at a load average of 5.3 left
  the machine at 31.0. **Never start a second heavy job while one is running.**
- **Read the `Unhandled Errors` block, never only the exit code.** An unhandled
  error is not a failed assertion and the run can still exit 0 — that passed for
  two tasks once.
- **Verdict Epic 4's exit criterion** — _a user opening MarketPulse can quickly
  understand whether the tracked market is broadly rising, falling, mixed, or
  concentrated in particular sectors_ — plainly, and against what the sitting
  returned rather than against what the code does.
- **Everything shipping open carries an owner and a condition.** A trigger is a
  **condition**, never a story number: story numbers move, and a trigger written
  against something that has already happened will never fire. The known set is
  a starting point rather than the list — the three things no gated machine and
  no person had seen, Epic 14's two-clause trigger, the two routed product
  defects, the `pnpm verify` ×24 arm, the aggregate question, the
  `changePercent` decision, and the ninth screen-reader entry.
- **Update `CLAUDE.md`'s _Current state_ and _Where the record lives_** if this
  epic changed what a user can see or added a subject — it did both. Say what a
  user **still cannot do**.
- **Judge whether anything this epic shipped deserves an ADR**, and whether any
  guard this story described is a **sentence rather than a mechanism**. A claim
  about a mechanism reads identically whether the mechanism is there or not.
- **Mark Story 4.9 and Epic 4 complete**, and state the story and task counts.

## Done when

1. All four gates have been run with the load read beforehand, and each one's
   **numbers** are recorded.
2. Epic 4's exit criterion has a plain verdict, against the sitting.
3. Everything open has an owner and a condition, and no condition is a story
   number.
4. `CLAUDE.md`'s two sections are updated, including what a user still cannot do.
5. The ADR question and the guard question are both answered either way.
6. Story 4.9 and Epic 4 are marked complete with their counts.

---

## What was done — 2026-10-12

<!-- written at completion -->
