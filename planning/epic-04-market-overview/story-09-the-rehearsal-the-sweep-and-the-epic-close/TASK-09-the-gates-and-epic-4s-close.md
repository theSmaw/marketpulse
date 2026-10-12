# Task 4.9.9 — The gates, and Epic 4's close

**Status:** In progress — 2026-10-12 — **the preparatory half is done and the close itself waits on the sitting.** Story 4.7 AC 6's owed break re-run is **12 of 12 discharged by command** — the first time that block of evidence has been verified by command at all; the four browser breaks were held back at a load average of 9.09 and taken at **4.67–4.75**, which is the condition working rather than being waived. `EPIC.md`'s status line was stale by **six** stories
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

## What was done — 2026-10-12 (the preparatory half)

**This task cannot complete until Task 4.9.8's sitting has happened**, because
acceptance criterion 7 verdicts Epic 4's exit criterion and that verdict is
_against what the sitting returned_ rather than against what the code does. What
is done here is everything that does not depend on it.

### Story 4.7 AC 6's owed re-run — 8 of 12 discharged by command, for the first time

Task 4.9.2's acceptance walk found that Story 4.7's eleven break entries went
red, **but all but 4.7.9's were performed by hand** with the registry's own
`find`/`replace`, because **`pnpm break` refuses a dirty target by design** and
the tree was never clean. The close's own instruction — _re-run them with
`pnpm break <name>` once this is committed_ — had never been carried out. It is
the single largest block of mechanical evidence in Stories 4.1–4.8 and was the
one piece unverifiable by command.

**Run on a clean worktree off `origin/main`, load read before at 8.44 and after
at 9.09:**

| Break                                                | Command                     | Result                            |
| ---------------------------------------------------- | --------------------------- | --------------------------------- |
| `the-overview-note-dates-the-arithmetic`             | `pnpm invariants`           | **red → restored byte-identical** |
| `the-overview-note-folds-the-instant-in-the-browser` | `pnpm invariants`           | **red → restored byte-identical** |
| `the-footer-age-drops-its-interval`                  | `pnpm invariants`           | **red → restored byte-identical** |
| `a-compose-carries-an-override`                      | `pnpm invariants`           | **red → restored byte-identical** |
| `the-break-registry-stops-parsing`                   | `pnpm invariants`           | **red → restored byte-identical** |
| `the-feed-frame-is-a-heartbeat-again`                | backend `test:process`      | **red → restored byte-identical** |
| `the-keepalive-stops-being-three-missed-heartbeats`  | backend `test`              | **red → restored byte-identical** |
| `the-region-head-outlives-its-content`               | frontend `test Region.test` | **red → restored byte-identical** |

### Amended the same day — the four browser breaks were TAKEN, at the load the condition named

**Held back at 9.09, re-read at 4.74, and run.** The condition this task wrote
for itself — _a load average read **before** the run, below 5_ — fired, so the
four were taken rather than deferred. **All four red then restored
byte-identical, each on a real assertion failure rather than a timeout:**

| Break                                                 | Target                     | Spec                                | Matched                                        |
| ----------------------------------------------------- | -------------------------- | ----------------------------------- | ---------------------------------------------- |
| `a-region-does-not-catch-its-dropped-focus`           | `Region.tsx`               | `overview-degraded-stops.spec.ts`   | `when the movers SECTION goes away`            |
| `a-mover-stands-its-ticker-in-for-its-name`           | `market/movers.ts`         | `overview-movers-name-race.spec.ts` | `1 NVDA NVDA`                                  |
| `the-harness-answers-the-browsers-own-retry`          | `e2e/support/feed.ts`      | `overview-held-outage.spec.ts`      | `a produced disconnection is held`             |
| `the-footer-age-reads-the-join-instead-of-the-market` | `market/market-breadth.ts` | `overview-degraded-grid.spec.ts`    | `the documented exception has stopped holding` |

Load **4.67–4.75 before**, **6.09 after** — nowhere near the 31.0 a full
`pnpm e2e` produces, because these are four scoped specs rather than a suite.

**One thing about WHERE they were run, and it would have produced a false
all-clear if got wrong.** `pnpm e2e` drives the pair started with `pnpm dev`,
and that pair serves the **main checkout**. A break run from a worktree edits a
file the dev server is not serving, so the spec would exercise the unbroken code
and the harness would report _did NOT go red_ — a guard reported as absent when
it is there, which `CLAUDE.md` names as the one direction that wastes a repair.
All four were therefore run **from the main checkout**, with the pair up
(`pnpm ready`: backend 823.7 s uptime, frontend module graph resolving,
database answering). The CSS-module caveat did not apply — all four targets are
`.ts`/`.tsx`, which hot-reload reliably.

**So Story 4.7 AC 6 is 12 of 12 by command**, and the original finding stands as
the record of what was true this morning: _all but 4.7.9's were performed by
hand, and the close's own instruction to re-run them had never been carried
out._ It has now been carried out.

### The reasoning that held them back, kept because the rule outlives the run

`the-harness-answers-the-browsers-own-retry`,
`a-region-does-not-catch-its-dropped-focus`,
`a-mover-stands-its-ticker-in-for-its-name` and
`the-footer-age-reads-the-join-instead-of-the-market` all run
`pnpm e2e … --anyway`. **The load average was 9.09 on 8 cores.** Task 4.8.9
measured `securities-route` at a median of **13.5 s against a 30 s ceiling at
four workers** on a _settled_ machine, and Task 4.8.13 recorded a full `pnpm e2e`
begun at **5.3** leaving the machine at **31.0** — so at 9.09 a browser break is
odds-on to go red on a **timeout**, and `CLAUDE.md`'s own rule is that **red for
the wrong reason reads exactly like proof**: a break that fails loudly for a
reason other than the defect certifies nothing, and an assertion failure with
other tests still collecting is the only red that proves a check works.

**Owner: this task, on a settled machine.** Condition: a load average read
**before** the run below 5. Four scoped specs at `--anyway`, about a minute
each. **Until then Story 4.7 AC 6 is 8 of 12 by command and 4 of 12 by hand**,
which is the honest figure and is better than the _all but one by hand_ it was
this morning.

### `EPIC.md`'s status line was stale by six stories

It read **_"In progress — two of nine complete"_** when 4.1, 4.2, 4.3, 4.4, 4.5,
4.6 and 4.8 were closed and 4.7 was accepted with AC 5b owed. **A reader opening
the epic file first — which is the file a reader opens first — was told the epic
had barely begun.** Found by Task 4.9.2's acceptance walk, which had been told
**not** to read `EPIC.md` for criteria precisely because it drifts; it drifted.

**Corrected, with the mechanical gap named beside it**: nothing checks an epic's
own status line against its stories', and `every-story-states-one-dependency`
deliberately does **not** extend to it — `EPIC.md` marks _visibility_ rather
than completion, so there is no column to key on. That is the same reason
`the-epic-close-cannot-outrun-the-rehearsal-ledger` keys on the **close
story's** status instead, and it is why that check had to be widened rather than
replaced.

### Gates, with their numbers rather than an assertion

Taken on this worktree, `origin/main` at `34a126c` plus this task's edits. Load
read **before** each job, never during.

| Gate                              | Numbers                                                                    |
| --------------------------------- | -------------------------------------------------------------------------- |
| `pnpm invariants`                 | **54 invariants hold** on this branch; **55** once Task 4.9.5 lands (#569) |
| `pnpm links`                      | **539 documents, 1,740 cross-file links, 39 anchor links, 0 broken**       |
| `node --check scripts/breaks.mjs` | passes; **154 entries** here, **157** with #569                            |
| `pnpm break` ×8                   | all eight red then restored **byte-identical**                             |
| `pnpm verify`                     | recorded at the close, on the final tree                                   |
| `pnpm e2e`, `pnpm test:database`  | recorded at the close, on a settled machine                                |

**The four gate readings acceptance criterion 6 asks for are deliberately NOT
taken yet**, because the criterion asks for them _with their numbers_ and a
number taken on an intermediate tree is not a reading of the thing being closed.
They are taken once, on the final tree, after the sitting.

### What remains, and nothing here is optional

1. **Task 4.9.8's sitting** — seven ledger rows, the frame composition, the
   `feed`-frame re-count, the two-tape note. Everything else in this task is
   downstream of it.
2. The four gates with their numbers, on the final tree.
3. **Epic 4's exit criterion verdicted against the sitting**, not against the
   code.
4. Everything shipping open given an **owner and a condition**, with no
   condition that is a story number.
5. `CLAUDE.md`'s _Current state_ and _Where the record lives_ updated, including
   **what a user still cannot do**.
6. The ADR question and the guard question answered either way.
7. The four `pnpm e2e` breaks, on a settled machine.
