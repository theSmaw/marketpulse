# Task 4.9.11 — The subject document Epic 4 never wrote

**Status:** **Complete — 2026-10-12.** `MARKET-OVERVIEW.md` is written, 11
sections, and `CLAUDE.md`'s _Where the record lives_ table has an Epic 4 row for
the first time. **The one finding worth knowing: gathering is not the same as
reading, and the gap is about ORDER rather than content.** **38 of the epic's 92
documents** were read — eleven in full and twenty-seven for their status line and
their figures; roughly four fifths of what they carry is already condensed
somewhere in `CLAUDE.md`, ADR 0038 or ADR 0039 — but **spread across eleven
paragraphs of a _Current state_ section ordered by the date each story shipped**,
so a reader asking _how does the grid work_ meets the grid's spans, the ≤860
collapse, the shared `fr` ratio and the scroll falsification in four different
paragraphs separated by breadth, movers and a performance story. **Six things were
not condensed anywhere** and are listed below; the largest is that the five-minute
window's own measured curve lives only in a `STORY.md` amendment.
**Story:** [4.9 The Rehearsal, the Sweep, & Epic 4's Close](STORY.md)
**Depends on:** nothing — it reads the epic rather than changing it

## Objective

**Epic 4 produced no subject document at all.** Epic 2 produced seven and Epic 3
seven, and `CLAUDE.md`'s _Where the record lives_ table had **no Epic 4 row** —
so the answer to _how does the landing page work_ was **read eighty-one task
files**, about 35,000 lines. The technical architect found it at Gate 2 and the
owner decided the document on 2026-10-12.

**This is a gathering job rather than an authoring job.** Nothing below is
decided here; every section of the document says where its argument lives, and
where a decision belongs to an ADR the ADR is pointed at rather than restated.

## What the user can see when this lands

**Nothing.** No shipped file changed, no route changed, no figure changed. This
task adds one Markdown document and one table row. The story that puts the next
thing on this screen is **Epic 5's**, which fills `Unusual activity`.

**What a reader can do that they could not** is answer a question about `/` from
one file. That is a developer rather than a user, and it is worth saying plainly
that the user-visible answer is nothing.

## What was done

### The document

`planning/epic-04-market-overview/MARKET-OVERVIEW.md` — **11 sections, 1,889
lines.**

| §   | Subject                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------- |
| 0   | How to read it; the population; the three caveats; what it is not                                           |
| 1   | The screen — seven regions, the grid, the collapse, the heights, the tab stop, the falsified scroll premise |
| 2   | The join — purity, the bound on invariant 4, one producer, one frame, the arithmetic, three instants        |
| 3   | What `current` means — five minutes measured, `startsAt` never `ageMs`, one pass, two bases                 |
| 4   | Counts never percentages, and why the denominator is a fact about our reach                                 |
| 5   | The ranked surfaces — the comparator, selection vs reduction, the hold, the pad, the denominator, the bar   |
| 6   | Selection — twenty-four destinations, the figure is never the link                                          |
| 7   | The degraded set — 13 × 4 × 7, the furnished row, partition by class, the 390 question                      |
| 8   | What the screen costs — seven subsections, each figure with its caveats                                     |
| 9   | **What no gated machine and no person has ever seen**                                                       |
| 10  | The traps — fifteen of them                                                                                 |
| 11  | What a green run does not certify, and where each argument lives                                            |

**Three rules were applied throughout.** A figure carries its date and its task,
and where a figure has **moved** both are given with both datings rather than one
substituted — the movers region at **466 px then 491 px**, `marketDateAt` at
**3.366 then 1.288 ms**, the per-batch join at **3.497 → 1.521 p50 → 0.000 with
nobody attached**, the sector region at **383 → 433 → 461 → 486**. Every
population is named: the universe is **516 securities and 501 equities** since
Task 2.3.9, and the epic's figures were taken over **518 and 503** and are quoted
as the dated measurements they are. And a falsified premise is recorded as
falsified with what falsified it — _no region on `/` scrolls at any of the four
widths_ was four width/**height** pairs, and `Unusual activity` scrolls at
**1440×680**.

### The table row

`CLAUDE.md` gains one row above the existing Story 4.7 row, in that table's own
style. **The Story 4.7 row is left alone deliberately**: it is the degraded set's
detail and names its own kept spec, which is a different subject from the screen.
The new row's `Read` description says what the document is for, that it **wins**
where a task file disagrees, and that §0 is where the population caveat is — the
one thing a reader quoting a figure out of it needs to know first.

## What was NOT already condensed in `CLAUDE.md`, ADR 0038 or ADR 0039

**Six items**, which is the useful evidence about whether the document was worth
writing. Everything else was findable in one of those three, albeit spread.

1. **The five-minute window's own curve.** The measured table — 1/2/5/15/60
   minutes at min, p10, median, p90, max over n = 390 samples, and the by-hour
   shape that decided it on the **worst hour** rather than the median — exists
   only as an amendment inside Story 4.4's `STORY.md`. `CLAUDE.md` carries _"the
   window is **5 minutes, measured**"_ and no figure. **This is the biggest gap
   the document closes**, and it is the one section that is also becoming an ADR
   (0040) in the same batch of work.
2. **The grid's own rules, as rules.** The spans restated at three breakpoints,
   `min-height: auto` restated in the ≤860 rule, `minmax(min-content, 1fr)`
   rather than `auto`, and row 1 being a `calc()` length for Epic 6's WebGL box.
   All of it is in `MarketOverview.module.css`'s comments — which is the right
   home for it — and in **no document at all**.
3. **The height ledger as one table.** 265 → 461 → 486 → 491, with what each step
   bought and the retirement rule that replaced Task 4.1.4's. It is spread across
   four amendments in three `STORY.md` files, each of which corrects the one
   before it.
4. **The two coverage figures that measure different things.** _332 of 518 in a
   median minute_ and _0 in all 390 one-minute samples_ are both true and nothing
   outside Story 4.4's own reassessment says so. A reader taking the first as the
   1-minute denominator is 332 away from the truth.
5. **The partition-by-content-class rule, stated generally.** `CLAUDE.md` records
   that _a content class is ONE AGGREGATE_ and that the count form was green on
   the defect; what it does not carry is the **two verbatim failure messages**,
   which are what show that the assertion fails in both directions.
6. **`observedAt` being deliberately outside `the-send-instant-is-not-a-clock`.**
   ADR 0038 says it in a sub-clause of a bullet; the reason — it is a fact about
   the market rather than about this process, and it is the field a staleness rule
   would legitimately be built on — is the kind of thing a reader needs **before**
   reaching for it, not inside the ADR that forbids its two siblings.

### And one thing the gathering found that is a defect rather than a gap

**`e2e/specs/overview-degraded-grid.spec.ts` contains a literal NUL byte**, at
offset 18,431 of 51,609, used as a field separator in the comparison key
(`` `${surface}\0${reading[surface]}` ``). `file` reports the spec as `data`, and
`grep -rl` over `e2e/` returns **nothing** for a string that is in the file —
reporting it **absent rather than empty**, which is the one direction that wastes
a repair. Task 4.9.3 hit it inside its own run and reached a false _this guard
does not exist_ conclusion. It is §10's trap 5 and the cure is `git grep`.

**It was verified here rather than taken on report**, because the brief asserted
it:

```text
$ grep -rl 'overview-degraded-grid' e2e/
$ git grep -l 'DEGRADED_GRID_PHOTOS'
docs/GAPS.md
e2e/specs/overview-degraded-grid.spec.ts
…
$ file e2e/specs/overview-degraded-grid.spec.ts
e2e/specs/overview-degraded-grid.spec.ts: data
```

## Three disagreements with the brief, each reported rather than worked around

1. **ADR 0040 and ADR 0041 do not exist in this tree.** `docs/adr/` ends at 0039
   and Task 4.9.10 is writing them on a sibling branch. So §3 and §5.3 **name**
   them in prose and **do not link** them: a relative link to
   `docs/adr/0040-*.md` would fail `pnpm links`, which is the gate this task
   owes. If 4.9.10 lands first, the two names in §11's table are the sites to
   turn into links.
2. **There is no Task 4.9.10 slot in Story 4.9's own file.** Gate 1 approved
   **nine** tasks, 4.9.1–4.9.9, and this is `TASK-11`. The numbering is the
   orchestrator's and is not changed here, but `STORY.md`'s Gate 1 list now
   understates the task count by two and will need the same treatment the epic's
   own re-order got — **the identifiers do not move and the list says so**.
3. **This worktree is one commit behind `origin/main`.** Task 4.9.5 landed as
   `75bfeac` while this branch sits at `3627fe8`, so `TASK-05`'s status reads
   `Not started` here and this tree's `docs/GAPS.md` predates that task's
   additions. **No reference in the document depends on it**: §11 points at
   `docs/GAPS.md` as a file rather than at an entry, and the two product defects
   §8/§9 name are quoted from Story 4.8's close rather than from the list.

## Two things deliberately not done

- **No figure was re-taken.** This is a gathering task and every number in the
  document carries the task that measured it. A re-measure would have been a
  different task and would have put a 2026-10-12 figure beside eight stories'
  dated ones with no instrument recorded.
- **Nothing was corrected in a story or a task file.** The document is new, so it
  corrects nothing; where a story's premise was falsified it is recorded **as
  falsified, with what falsified it**, and the dated record is left standing.
  `CLAUDE.md`'s Story 4.7 row was read and left alone for the reason above.

### Gates

Read the load before the run, never during it — **2.75 on 8 cores** before
`pnpm links` and **8.14** before `pnpm verify`. The second reading is **not this
task's work**: a sibling agent's suite was executing on the same machine, which
is `CLAUDE.md`'s own note that the browser suite is its own plant. Nothing here
is a timing, so it does not corrupt a figure.

```text
$ pnpm links
539 documents, 1741 cross-file links, 39 anchor links, 0 broken.

$ pnpm format
(all files written; MARKET-OVERVIEW.md and CLAUDE.md reformatted — prose rewrapped
 and both tables widened)

$ pnpm verify
All matched files use Prettier code style!
42 components, 42 stories files.
539 documents, 1741 cross-file links, 39 anchor links, 0 broken.
54 invariants hold.
packages/shared test:  Test Files  22 passed (22)   Tests   440 passed (440)
apps/backend  test:    Test Files  50 passed (50)   Tests  1045 passed (1045)
apps/frontend test:    Test Files  86 passed (86)   Tests  1413 passed (1413)
apps/backend test:process:  Test Files   2 passed (2)   Tests   55 passed (55)
VERIFY EXIT=0
```

**`pnpm links` is the gate this task owes most**, because a reference document
whose pointers rot is worse than none. The two new files add **40 relative links
between them** — **39** in the document and 1 in this file, counted with
`grep -oE '\]\([^)]+\)'` — and **all 1,741 in the corpus resolve, with 0
broken.** The before-count was not taken, so no delta on the totals is quoted.

`Unhandled Error` grepped across the whole log: **zero occurrences.**

**`pnpm e2e`, `pnpm test:database` and `pnpm probe` were deliberately not run.**
The diff is two Markdown files and nothing under `e2e/`, `apps/` or
`packages/` — there is no layout to look at, no browser behaviour to drive and no
data layer touched. **No check was added, so no break is owed**; the document
makes no claim about a mechanism that is not already held by a named invariant,
and §11 states which three of those do less than their names suggest.

## For a stakeholder — a status report, 2026-10-12

**Epic 4 built the landing page over eight stories and never wrote down how it
works.** Epic 2 left seven reference documents behind it and Epic 3 left seven;
Epic 4 left none, so the only way to understand or safely change `/` was to read
**eighty-one task files and nine story files — about 35,000 lines**. That is a
real cost and it falls on whoever touches this screen next, which is Epic 5 in
the next few weeks.

**What was delivered is one document, `MARKET-OVERVIEW.md`, and one row in the
repository's index of documents.** Eleven sections, 1,889 lines. It is
a **gathering** rather than new work: nothing in it was decided here, every
figure carries the date and the task that measured it, and where a decision
belongs to an architectural decision record the document points at the record
rather than paraphrasing it.

**What was read: 38 of the epic's 92 documents** — the epic file, all nine story
files, the sitting protocol, and twenty-seven task files, eleven of those in full
and the rest for the status line and the figures they carry. Beside them, both of
the epic's architectural decision records in full, the landing page's own
stylesheet, two of its source modules and the list of mechanical checks. **Two
things the brief asked for were not read**: Story 3.10's file, offered as a model
for shape, and the design canvas. The shape was taken from the price-chart
document instead, and the canvas is Task 4.9.6's subject rather than this one's.

**The honest finding is that about four fifths of the material was already
written down somewhere, and that the problem was ORDER rather than absence.** The
repository's own guidance file carries a great deal of it — but spread across
eleven paragraphs ordered by the date each story shipped, so a reader asking one
question about the grid meets the answer in four separated places. The document's
value is that it is organised by **subject**: a reader asking _what does the grid
do_, _what does "current" mean_, or _what has nobody ever seen_ gets one section
each.

**Six things were in no condensed form at all**, and the largest is the one that
matters most commercially: **the measured evidence behind the five-minute
window** — the curve across 390 sampled minutes of a real session, and the
by-hour shape that made the decision on the worst hour rather than the average —
existed only as an amendment buried in one story file. That is the number the
whole screen's honesty rests on, and it was the hardest fact in the epic to find.

**One defect was confirmed rather than reported.** A browser-test file contains a
stray zero byte, which makes ordinary text search **skip it silently and report
it as absent rather than empty** — and absent and empty call for opposite
repairs. It had already produced one wrong conclusion inside this story. It is
written up as a trap with the cure.

**Nothing a customer can see changed, and that is the correct outcome.** No
screen, no figure and no behaviour moved. All gates are green: `pnpm verify`
exits 0 with 2,953 tests passing, 54 invariants holding, and **1,741 cross-file
links with 0 broken** — which matters more than usual here, because a reference
document whose pointers rot is worse than none.

**What remains open in this epic is unchanged by this task and is one thing: a
person.** The landing page's figures have never been watched against the real
market by anybody — the test infrastructure's database holds no price history at
all, so a gated run can never see a breadth figure, a mover, or a price move.
That sitting is booked for tonight's session, and Section 9 of the new document
is the list it has to work through.
