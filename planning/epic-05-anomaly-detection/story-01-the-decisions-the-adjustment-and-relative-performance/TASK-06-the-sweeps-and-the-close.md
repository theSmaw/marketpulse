# Task 5.1.6 — The Sweeps & the Close

**Status:** Complete — 2026-10-13 — the sideways sweep found a **misrouting**: two documents said Story 5.6 fills `Anomaly history`, and that region is filled by **no story in Epic 5** at all. A constraint routed to a story that will never draw the region is a constraint nobody receives. Also: AC 4's _satisfied by construction_ is now a mechanism, and the four gates are green on the final tree
**Story:** [5.1 The Decisions, the Adjustment, & `Relative performance` Drawn](STORY.md)
**Depends on:** 5.1.5

## Objective

**A collection of completed tasks is not automatically a completed story**, and
a close sweeps only the documents the story wrote. This task does the two
sweeps nothing does on its own, and takes Story 5.1 to Gate 2.

## What the user can see when this lands

**Nothing.** A story whose figures can be re-taken rather than cited.

## Work

- **Every acceptance criterion in `STORY.md` verdicted**, with the instrument
  named and split between **re-takes from a clean clone** (which must be a
  runnable command) and **dated readings**. Epic 4's close found that only three
  of its eight stories published a per-criterion verdict of their own, so this
  story owes one that a later close can quote rather than reconstruct.
  **Note AC 2 and AC 4 were amended at Gate 1** and are verdicted as amended,
  with the originals quoted.
- **The upward sweep, against the list and against a grep.** Known candidates:
  `PRODUCT_SPEC.md` §8.3's region list; `VISUAL-LANGUAGE.md`'s anomaly prose
  after the band rename; `LiveFeedView.overview`'s docblock, which says
  _"Nothing renders it yet"_ and is about to be stale on a second route;
  `market.css`'s `--anomaly-unusual`; and the three discrepancies Task 5.1.1
  corrected. **Amend live claims by date, leave historical records standing, and
  record the count of each.**
- **The sideways enumeration.** Grep this story's documents for every
  `Story N.M`, `Epic N` and `Owner:` line and check each against the
  **recipient's own** file. The record across six runs reads **1, 6, 3, 6, 2,
  8**, and Epic 4's run found that **six of its eight were recipients the
  prescribed grep could not find** — so the walk matters more than the grep.
  Known recipients: **Story 5.2** (the rail's idiom and the slot it inherits),
  **Story 5.6** (the one amber position, the ETF-versus-peer-median decision
  this story deferred by name, and the chart marker lane), **Epic 6** (the
  `reserved`-state finding this story's filled region leaves live for theirs),
  and **Epic 13** (the membership data's start date).
- **`docs/GAPS.md`** gains an entry for every claim this story leaves standing
  that nothing mechanical guards, and anything mechanisable is **made
  mechanical** as a `pnpm invariants` entry **with a `pnpm break` in the same
  change**. The standing candidates: the dropped staleness refusal, in ADR
  0040's own terms; the `≥74rem`-only rail adjacency, which nothing asserts;
  and the co-presence of the region's sector reference with the source note's
  date, which is Gate 1 decision 11's owed mechanism.
- **The architect's two questions**, answered either way: does anything here
  deserve an ADR, and **is any guard this story described a sentence rather
  than a mechanism**. The second has one known candidate already — AC 4's
  _satisfied by construction_.
- **`STORY.md` status updated**, and `CLAUDE.md`'s _Current state_ amended,
  because this story changes what a user can see on `/securities/:symbol`.
- **`LIVE-REHEARSAL.md`**: decide whether this story needs a person to have
  watched it, and if so write the row **before** the sitting rather than at the
  close. Epic 4's gate now **refuses a close** with an unwatched row, and a
  waived row needs a date, a reason and an `Owner:`.

## Done when

1. Every `STORY.md` acceptance criterion has a verdict, an instrument and a
   kind, with the two amended criteria quoted in both forms.
2. Both sweeps are run and **both counts recorded**, including if either is
   zero.
3. `docs/GAPS.md` is updated, every mechanisable claim is mechanical, and every
   check added has a break that was performed in **both** directions — passing
   wrongly first, with the transcript kept.
4. The ADR question and the guard question are both answered in writing.
5. The four gates are run **once on the final tree** with their numbers, the
   load read **before** each.
6. Gate 2 is put to the owner with what a user can now see, each criterion's
   evidence, what shipped open with an owner and a condition, and **what was
   not verified and why**.

---

## What was done — 2026-10-13

<!-- written at completion -->

## What was done — 2026-10-13

### Done-when 1 — every criterion verdicted

In `STORY.md`'s own **Gate 2** section: eight criteria, each with a verdict, a
named instrument and a **kind** — a `re-take` is a command a clean clone can run,
a `reading` is dated. Six are re-takes, one is a reading, one is both. The two
criteria the owner amended at Gate 1 are verdicted **as amended with the
originals quoted**, because a close that quietly verdicts the amended form
destroys the record of what was asked for.

### Done-when 2 — both sweeps, both counts

**Upward: 2 found in this sweep, 4 corrected in flight earlier in the story.**

- `live-feed.ts`'s `overview` docblock said `Relative performance` _"is the first
  surface there that **will**"_ read the field. **False three tasks after it was
  written** — and the sentence directly above it is a correction of the same
  shape, made five days late. A docblock in the future tense about the next story
  is a claim with an expiry date nobody sets.
- `MARKET-OVERVIEW.md` §1.4's reversal trigger had **fired** and the document said
  nothing. It now carries the firing, the four measurements, the owner's
  acceptance, and what the trigger still keeps.

The four corrected in flight: `VISUAL-LANGUAGE.md`'s 324 px rail width (5.1.3),
Task 5.1.2's record (same), `CLAUDE.md`'s invariant 4 qualification (5.1.5), and
`UNIVERSE.md` §12.2 (same).

**Sideways: 4 recipients, and 4 of 4 had nothing.** Story 5.2, Story 5.6, Epic 6,
Epic 13 (written in 5.1.5). The record across seven runs now reads
**1, 6, 3, 6, 2, 8, 4**.

**And the enumeration found a misrouting, which is what this pass exists for.**
The canvas page and `VISUAL-LANGUAGE.md` both said _Story 5.2 fills
`Abnormal-move indicators` and Story 5.6 fills `Anomaly history`_. **Both halves
were wrong**, and the second is the one that matters: `Anomaly history` is filled
by **no story in Epic 5** — deferred at that epic's Gate 1 with a condition, _the
first surface that needs a score older than the process_, because it is the only
surface needing scores **written down**. Every constraint this story drew for
that region was addressed to a story that will never draw it. Corrected on the
canvas, in `VISUAL-LANGUAGE.md` and in `EPIC.md`, where the reserved shape is now
recorded as an inheritance for whoever eventually fills it.

### Done-when 3 — `docs/GAPS.md`, and one claim made mechanical

**Made mechanical: AC 4.** `a-sector-named-on-a-route-carries-its-curation-date`
— every route rendering a component that reaches `SECTOR_LABELS` or `SECTOR_ETFS`
must also render a source note. **Both halves are derived rather than listed**:
the sector-naming set is computed through the `src/market/` modules that read the
constants and the identifiers they export, because neither `RelativePerformance`
nor `SectorPerformance` mentions the constants itself; and the note is any
component whose name ends `SourceNote`, because there are two of them. Anchored
on a member that must be **found**, so a rename that empties the set fails rather
than passing vacuously.

**The break was performed in both directions.** First the defect somebody else
will write: a **new route** drawing the region with no source note —

```
✗ a-sector-named-on-a-route-carries-its-curation-date
  1 route(s) name a curated sector and render no source note:
    apps/frontend/src/routes/PlantedBoard.tsx
```

— then the registry entry, `a-sector-with-its-curation-date-removed`, which
removes the note from the route it was written around:

```
✓ apps/frontend/src/routes/SecurityExplorer.tsx broken → red → restored byte-identical.
  matched: a-sector-named-on-a-route-carries-its-curation-date
```

**Not made mechanical, with reasons and conditions, in `docs/GAPS.md`:** the
`≥74rem`-only rail adjacency (no grep can see a resolved grid track, and the
browser form would pin a layout this epic is still filling — the condition is the
first story that makes the rail explicit at every width); and the nine approved
sentences, where what is unguarded is whether a **tenth** matches the register.
The membership entry is **half-discharged** with a `git grep` re-measure that
becomes testable the day anything reads the table.

### Done-when 4 — the architect's two questions

**An ADR: yes, one.**
[ADR 0042](../../../docs/adr/0042-membership-is-a-history-and-it-starts-the-day-somebody-writes-it.md).
The decision is read by an epic eight ahead that does not exist yet, and a
150-line migration header is not where anybody looks for a decision. The
comparison's own design decisions are not ADR-shaped — ADR 0026 makes the canvas
the source of truth and they live there.

**A guard that was a sentence: one, and it is now a mechanism.** AC 4's
_satisfied by construction_ — true the day it was written and silent the day
somebody adds a second route.

### Done-when 5 — the four gates on the final tree, load read first

| Gate                 | Load before | Result                                                                              |
| -------------------- | ----------- | ----------------------------------------------------------------------------------- |
| `pnpm verify`        | 5.29        | **exit 0**, `58 invariants hold.`, **3,000 tests** (440 + 1,047 + 1,458 + 55)       |
| `pnpm test:database` | 10.22       | **7 files, 237 tests**                                                              |
| `pnpm e2e`           | 4.79        | **254 passed, 16 skipped**, 3.8m                                                    |
| `pnpm probe`         | —           | the route at four widths and ten story states at four widths; screenshots looked at |

**And the first `pnpm e2e` run was RED, for a reason that was not this story's
and is worth the paragraph.** Two specs failed — `market-reconnect`'s
`toHaveLength(516)` against a received 518, and `universe-navigation`'s
`0 of 516 rows shown` against `0 of 518`. Neither is a flake: both reproduce, and
**both specs say in their own comments that they are asserting CI's number and
that a developer's populated store reads 518**. They are correct about both
stores and they leave `pnpm e2e` **red on every machine that has one** — which is
Task 2.3.9's untracking landing on the suite, and this is the first close since.

Both are repaired to assert the claim they are actually making rather than the
number CI happens to have: the resubscription covers **every security the
universe response carried** (read from `GET /securities`), and the summary line
reports **nothing on screen out of the whole table** (`/0 of \d+ rows shown/`).
One detail worth keeping: the first regex was `/\b0 of …/` and failed, because
the summary's clauses are adjacent in `textContent` and the `0` follows the
coverage date's own last digit — `…through 2026-09-11` then `0 of 518` — so there
is no word boundary between them.

### Done-when 6 — Gate 2

Put to the owner with what a user can now see, each criterion's evidence, what
shipped open with an owner and a condition, and what was not verified and why.

### What was NOT verified, and why

- **Nobody has watched this region against a real feed.** `LIVE-REHEARSAL.md`
  carries row **5.1, unwatched**, written **before** the sitting rather than at
  the close — which is what Epic 4's gate earned. Epic 5 was added to
  `REHEARSAL_LEDGER_EPICS` in the same change, so `pnpm invariants` will **refuse
  Epic 5's close** until the row is filled; proved by marking Story 5.7 complete
  and watching the run go red on `5.1 — its date cell reads \`—\``.
- **No gated machine has seen a relative move either.** CI's store is 516
  securities and zero bars.
- **The one-height claim is asserted in a browser at one width**, 1440, over two
  of the nine states; the other seven are measured in the workshop at four widths
  and the route's own panel is measured at four widths in one state.
- **The deployed store has not been looked at since this merged.**

## For a stakeholder — a status report, 2026-10-13

**Story 5.1 is finished, and this last task is the pass that checks the story
against itself.**

Three things it found. The design notes said the region below the comparison
would be built by a particular later story — and **that region is built by no
story in this epic at all**; it was deliberately deferred, and every instruction
we had written for it was addressed to somebody who will never read it. A
promise this product had been making about where a sector's "last checked" date
appears was **enforced by nothing**, and is now enforced by a check that fails
the build — proved first against a page a future story would plausibly write,
then against the page we have. And the browser suite turned out to be **red on
any machine with a real database**, because two tests were written against the
exact number of securities our test machine happens to hold; they now check what
they actually mean, and pass on both.

**All four gates are green on the final tree** — 3,000 unit and integration
tests, 237 database tests, 254 browser tests.

**What is owed is a person.** Nothing in this story has been watched working
against a real market: our test machine holds no price history, so the comparison
there is permanently "No comparison yet.". The row is written in the rehearsal
ledger **unwatched**, and the build will now **refuse to close Epic 5** until
somebody fills it. Three things to take deliberately when that sitting happens
are written in the row, each unobtainable afterwards.
