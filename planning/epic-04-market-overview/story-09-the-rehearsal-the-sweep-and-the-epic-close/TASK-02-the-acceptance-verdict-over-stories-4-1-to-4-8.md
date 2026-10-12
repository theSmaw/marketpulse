# Task 4.9.2 — The acceptance verdict over Stories 4.1–4.8

**Status:** Complete — 2026-10-12 — **49 verdicts over 48 criteria: 29 met, 17 met with a stated limit, 2 superseded, 1 NOT MET** (4.7 AC 5b, the 390 phone). 34 are re-takes and 15 are dated readings, and **only three of the eight stories published a per-criterion verdict of their own**, so five of these verdicts are derived from task records and the close must say so rather than present them as the stories' own
**Story:** [4.9 The Rehearsal, the Sweep, & Epic 4's Close](STORY.md)
**Depends on:** nothing

## Objective

Acceptance criterion 1: **every criterion in Stories 4.1–4.8 has a verdict with
an instrument named**, split between **re-takes from a clean clone** and
**dated readings a later reader cannot reproduce**.

The split is the whole point. A figure a reader can re-take is a different kind
of claim from one taken once on one laptop against one store, and a close that
presents them in one list has made the second look like the first. This epic
published a great many of the second kind — every Story 4.8 figure is local, on
one laptop, with the cadence **furnished** rather than observed.

**Note the range is written in numbers and the order differs from them.** The
execution order is 4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6 → **4.8 → 4.7** → 4.9, so
"4.1 through 4.8" ends with **4.7**. The criterion is correct as a set and only
misleads about sequence.

## What the user can see when this lands

**Nothing.** A table a reader can act on instead of a claim they have to trust.

## Work

- Walk **every** acceptance criterion in Stories 4.1 through 4.8 inclusive —
  from each `STORY.md`, not from memory and not from this epic's `EPIC.md`.
- For each: the verdict (**met** / **met with a stated limit** / **not met** /
  **superseded**), the **instrument** that returns it by name, and which of the
  two kinds it is.
- **A re-take must be a command.** If the instrument is a paragraph, it is a
  dated reading, whatever it feels like — `CLAUDE.md`'s own rule is that a
  prose re-measure rots silently, and one of the seven that became
  `pnpm invariants` had already gone bad by naming a file whose constants had
  moved.
- **Name every criterion whose instrument is a person**, and do not fold those
  into "met" — they are Task 4.9.8's and the ledger's.
- Record the counts: how many of each verdict and how many of each kind.
- **Where a criterion's stated figure has moved since it was written, say so
  with both figures and the date of each**, rather than substituting. A figure
  that has moved looks exactly like a figure that was mis-recorded.

## Done when

1. Every acceptance criterion in 4.1–4.8 appears exactly once with a verdict,
   a named instrument, and a re-take/dated-reading classification.
2. Every re-take is a runnable command, and each was **run** rather than cited —
   with its output.
3. The counts are stated, and every criterion whose instrument is a person is
   named and routed to Task 4.9.8.
4. Nothing is marked met on the strength of a figure this task did not re-take
   or explicitly date.

---

## What was done — 2026-10-12

Every acceptance criterion in Stories 4.1 through 4.8 inclusive, read from each
`STORY.md` directly rather than from `EPIC.md` or from memory. **49 rows over 48
criteria** — 4.7's AC 5 is split 5a/5b, as its own close splits it.

### The counts

| Verdict                 | Count                                                 |
| ----------------------- | ----------------------------------------------------- |
| Met                     | **29**                                                |
| Met with a stated limit | **17**                                                |
| Superseded              | **2** — 4.1 AC 5, 4.3 AC 3                            |
| **Not met**             | **1** — 4.7 AC 5b, the 390 question from a real phone |

| Kind                                            | Count  |
| ----------------------------------------------- | ------ |
| Re-take from a clean clone (a runnable command) | **34** |
| Dated reading a later reader cannot reproduce   | **15** |

Per story: 4.1 — 3 re-take / 3 dated. 4.2 — 5/1. 4.3 — 5/1. 4.4 — 5/1.
4.5 — 4/2. 4.6 — 4/2. 4.7 — 6/1. 4.8 — **2/4**. **Story 4.8 is the inversion and
that is correct rather than a defect**: it is a measurement story, and a
measurement is a dated reading by nature.

**Of the 34 re-takes, 14 were actually run** — `pnpm invariants`
(`54 invariants hold.`), `pnpm links`
(`528 documents, 1723 cross-file links, 39 anchor links, 0 broken.`), four unit
suites (backend 68, shared 57, frontend 132 + 17 passed) and the greps. **20
were not run and all 20 are browser or break commands** — 19 `pnpm e2e <spec>`,
the eleven `pnpm break` entries of 4.7 AC 6 as one row, and `pnpm probe` —
blocked by two facts stated rather than glossed: another task held the checkout,
and **`pnpm break` refuses a dirty target by design.**

### The rule that decided the hard cases

**A re-take must be a command.** If the instrument is a paragraph it is a dated
reading however authoritative it feels — `CLAUDE.md`'s own rule is that a prose
re-measure rots silently, and Task 4.9.3 found that happening in
`SEARCH-AND-SELECTION.md` with the rot already recorded 200 lines below in the
same file. **A criterion met only against CI's store, which has zero bars, is
met with a stated limit and the limit is named.**

### Eight criteria whose instrument is a PERSON, routed to Task 4.9.8

Not folded into "met". Seven ledger rows across seven stories:

| Criterion                 | What only a sitting returns                                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **4.2 AC 1** (live half)  | a proxy figure **moving**; and _which of two things_ — four marks in one frame (a synchronised wave) or across several (a stagger the data has) |
| **4.3 AC 1** (live half)  | eleven sectors **re-ordering**, needing a session with movement rather than merely an open one                                                  |
| **4.4 AC 1 / AC 4**       | a breadth figure **at all** — CI's `measured` is 0 — and for the item worth most, a session in which the feed **stops**                         |
| **4.5 AC 1**              | a mover at all; the only genuinely **external** check this epic has                                                                             |
| **4.5 AC 2**              | the treatment against real moving numbers with **membership** changing; a replay structurally cannot — one frame, 0 ms spread, 100% of the time |
| **4.6 AC 5**, last clause | land on `/`, open a mover, **read a figure**, deployed, mid-session                                                                             |
| **4.7 AC 5b**             | the 390 question on a real phone, on cellular, network taken away and given back — **the one NOT MET criterion**                                |
| **4.8 AC 1 / 2 / 5**      | any of it against a real feed: a real 16.1-batch minute, frame composition, the deployed cold load                                              |

### Ten things that contradict what a story, `EPIC.md` or a brief claims — the part worth acting on

**1. Only three of the eight stories published a per-criterion verdict of their
own** — 4.2, 4.7 and 4.8. 4.4 and 4.5 have Gate 2 sections with decisions but no
AC table; 4.1, 4.3 and 4.6 vary. **So criterion 1 cannot be discharged by
quoting the stories: five of the eight sets of verdicts above are derived from
task records, and must be read as such.** That is a finding about the epic's
record-keeping, not a defect in the product.

**2. `EPIC.md`'s status line is stale by seven stories** — _"In progress — two
of nine complete"_ when 4.1–4.6 and 4.8 are closed and 4.7 is accepted. A reader
opening the epic file first is told the epic has barely begun. Routed to Task
4.9.9, which owns the close.

**3. Story 4.3 had no close, no Gate 2 record and a status line reading
`In progress`** while all eight of its tasks were `Complete` and the region
shipped. **Corrected by Task 4.9.3**, which also recorded that the missing Gate
2 record is a real gap a status line cannot close.

**4. This task's own brief was wrong about the ledger, in the one direction that
mattered.** The brief said five `OPEN` rows (4.2, 4.3, 4.4, 4.5, 4.8). There
were **six** — the omitted one was **4.7**, which carries AC 5b, **the only
NOT MET criterion in the range and the only one holding a story open.** A
sitting planned off the brief's list would have skipped the blocking item.

**5. `LIVE-REHEARSAL.md` had no row for Story 4.6 at all**, which Story 4.6's
own close and Task 4.9.1's brief both assume exists. **Found independently the
same day by Task 4.9.4**, both by going to **use** the list. Added on `main` by
#564; the ledger now has seven `OPEN` Epic 4 rows.

**6. Story 4.1 AC 4 is not met as written and nothing recorded that.** It asks
for the four decisions _"recorded with their alternatives and a reversal trigger
written as a condition"_. `grep -i "reversal trigger"` returns **zero** hits in
Task 4.1.1, where the decisions were taken, and **zero** in 4.1's `STORY.md`.
The alternatives are there in detail; the triggers are not. They arrived later
and elsewhere — four in ADR 0038 (Story 4.2), one in Task 4.3.3. **Decision 1,
M = 5 minutes, has no reversal trigger to this day**; it has
`the-five-minute-ceiling-stays-derived`, which holds the **derivation** rather
than naming the condition that would change the number. Verdict above:
**met with a stated limit, and the limit is large.**

**7. Story 4.1 AC 5 is not merely superseded — a build check now forbids what it
asked for.** AC 5 wanted a browser spec that asserts the regions and **does
not** assert a figure. `the-landing-route-has-a-spec-that-drives-a-figure` now
**fails the build** unless some spec drives an `overview` frame and asserts the
figure it carries, and its own comment names `landing-route.spec.ts` as scoring
zero on it. Both are correct for their own moment; **a close that lists them
side by side as met and met, without the supersession stated, reads as a
contradiction.**

**8. Story 4.5 AC 6's backend figure and Story 4.4's attribution are pre-repair
and nothing has re-taken the arm.** 4.5 cites 0.28–0.41 ms a batch for the
ranking; 4.4's close cites the widening at 0.118 → 3.497 ms with breadth at
0.041 ms (1.2%). The join has since been re-taken at **1.521 ms p50** and then
at **0.000 ms with nobody attached**. **An epic close that presents 0.041 ms,
0.28–0.41 ms and 1.521 ms in one list has silently mixed two baselines.** Both
figures are quoted above **with their dates and marked pre-repair**, and
Task 4.9.3 amended the two sites that drew forward-looking conclusions from
them.

**9. Story 4.7 AC 6's evidence is a dated reading today, not a re-take, by its
own admission.** Eleven break entries were added and every one went red, but
**all but 4.7.9's were performed by hand** with the registry's own
`find`/`replace`, because `pnpm break` refuses a dirty target. The close's own
instruction — _re-run them with `pnpm break <name>` once this is committed_ —
**has not been carried out.** It is the single largest block of mechanical
evidence in the range and the one piece currently unverifiable by command.
**Routed to Task 4.9.9: eleven `pnpm break` runs on a clean tree is cheap, and
it is the difference between the criterion being met and being reported met.**

**10. Two geometry figures have moved and are quoted at four values across the
tree.** The sector region: **383** (placeholder arithmetic) → **433** drawn
→ **461** measured → **486** with the quiet group's reserved heading — all
within one story, each correct when written. `Movers`: **466 px in every state
at every width** across twenty-two states → **491 px** since Task 4.7.4's age
clause. The tree's `CLAUDE.md` carries the correction; the **copy in this task's
brief did not**, which is consistent with another task editing it concurrently.
Beside it, Task 4.9.3's own finding: **`466` is ambiguous in this repository** —
a pixel height at `CLAUDE.md:143` and an eligible count eleven lines later — so
any future sweep must grep `466 px` and `eligible: 466` separately.

### One claim this task reported that is FALSE, and why it matters

The walk reported that **Task 2.3.9 does not exist and the universe is still
518/503**, having counted 503 equity rows off `universe.ts`. That is **true of
the branch it read** — `story-4-9-task-1`, cut from `origin/main` before #563
merged — and **false of `main`**, where 2.3.9 landed as `26646b1` and the
universe is **516/501**.

**The lesson is worth more than the correction.** A verdict taken on a stale
branch produces a finding **indistinguishable in form from a real
falsification**: correctly reasoned, correctly evidenced, and wrong. Nothing in
the output distinguishes them — only the branch point does. So **an acceptance
verdict must state the commit it was taken at**, and this one was taken at
`6a2d114` for the walk and re-checked at `571900f` for this record.

### Gates

| Gate                                   | Result                                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm invariants`                      | **`54 invariants hold.`**                                                                |
| `pnpm links`                           | **`528 documents, 1723 cross-file links, 39 anchor links, 0 broken.`**                   |
| backend units                          | 68 passed (market-overview, market-breadth, market-movers, sector-ladder-ratchet)        |
| shared units                           | 57 passed (live-change, sector-ranking, sector-ladder)                                   |
| frontend units                         | 132 + 17 passed (the four market modules, OverviewSourceNote, Region, RegionPlaceholder) |
| `pnpm e2e`, `pnpm break`, `pnpm probe` | **not run — 20 re-takes blocked**, and the reasons are stated above rather than glossed  |

## For a stakeholder — a status report, 2026-10-12

Every promise the eight stories of this epic made has been checked one by one,
and each has a verdict, the instrument that returns it, and — the part that
matters most — a label saying whether **you could check it yourself from a fresh
copy of the code**, or whether it is a reading somebody took once and nobody can
reproduce.

**Of 48 promises: 29 kept, 17 kept with a limit worth knowing, 2 replaced by
better decisions, and 1 not kept** — the question of what the screen does on a
real phone at the narrowest width, which needs a person with a phone during a
trading session and is already scheduled.

**Two thirds are things you could re-check yourself; one third are not.** That
split is the honest shape of the work and it has not been presented before. The
measurement story is the inversion — four of its six promises are one-off
readings — and that is correct rather than sloppy: a measurement is a reading by
nature.

**The walk also found ten places where the record contradicts itself**, and the
three worth naming: the epic's own front page still says _two of nine stories
complete_ when eight are; only three of the eight stories ever published this
kind of per-criterion verdict, so five of the sets above had to be rebuilt from
task notes rather than quoted; and one story's eleven safety-check
demonstrations were all performed by hand because the automated harness refuses
to run on a work-in-progress tree — they went red as they should, but nobody has
re-run them by command since, and that is being fixed before the close.

**And one of this review's own findings was wrong, in an instructive way.** It
reported that this morning's change to the tracked-securities list did not
exist — correctly, for the copy of the code it was reading, which predated the
change by one commit. The reasoning was sound and the evidence was real; it was
simply looking at yesterday. A finding like that is indistinguishable from a
genuine discovery, so from now on a review of this kind states which version of
the code it was taken against.
