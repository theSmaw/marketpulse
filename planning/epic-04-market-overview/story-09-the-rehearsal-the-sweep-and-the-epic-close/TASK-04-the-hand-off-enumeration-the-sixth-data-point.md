# Task 4.9.4 — The hand-off enumeration, the sixth data point

**Status:** Complete — 2026-10-12 — **the sixth data point is 8**, and six of the eight are recipients the prescribed grep CANNOT FIND: the method's load-bearing half is step 2, not step 1. Two findings are live defects on `main`, one of them the other half of a correction made ten days ago, and one is a ledger row tonight's sitting would have been taken without
**Story:** [4.9 The Rehearsal, the Sweep, & Epic 4's Close](STORY.md)
**Depends on:** nothing

## Objective

Acceptance criterion 4. **A hand-off sweeps SIDEWAYS, and a story close does
not reach it.** A close sweeps the documents the story **wrote**; a constraint
one story measured **for another** lives in a document the owning story does
not own, and nothing about a close crosses that boundary.

**The record across five runs reads 1, 6, 3, 6, 2, and it has caught something
every single time.** This is the sixth data point and it is recorded **including
if it is zero** — a zero is a result, and the one run that reports zero without
having been taken is indistinguishable from the five that found something.

Epic 3's spike close is the cautionary case: it gathered five constraints for
one story, the canvas answer for another and two more besides — and missed a
story **its own findings document named in as many words**, having written down
in that same close that this is _"exactly how a measured constraint gets
lost"_. It was found two stories later, by accident, by somebody implementing
an unrelated mapper.

## What the user can see when this lands

**Nothing.** Every constraint this epic measured for a later story sitting in
that story's own file, in words it can act on.

## Work

- **Grep this epic's documents** — every `STORY.md`, every `TASK-*.md`, `EPIC.md`
  and any subject document Epic 4 wrote — for every `Story N.M`, `Stories N.M`,
  `Epic N` and `Owner:` line.
- **Check each against the recipient's OWN file**, not against a pointer back
  to here. A pointer is what a reader follows when they already know to look,
  and the whole failure is that they do not.
- **Write the missing ones into the recipient's own `STORY.md` or `EPIC.md`, in
  words that story can act on** — the measurement, the constraint it imposes,
  and what to do about it. Never a link back.
- **Record the count that were missing**, as the sixth data point, with the
  grep command and the date.
- Known recipients to expect, which is a starting point rather than the set:
  **Epic 5** (the anomaly region this epic leaves named, and the two items
  Story 4.7's Gate 2 handed it already written), **Epic 6** (the topology),
  **Epic 13** (replay must not filter on `status`), **Epic 14** (the trigger's
  second clause, the `changePercent` byte count), **Story 3.11**/`LIVE-DATA.md`
  (the frame counts), and **`docs/GAPS.md`**.
- Note the one thing nothing mechanical checks and this epic paid for: **a
  dependency line is never checked against the story it names.** The 4.7/4.8
  re-order missed 4.9's own `Depends on:` for ten days. If that is cheaply
  mechanisable, route it to Task 4.9.5.

## Done when

1. The grep is run and its command and date recorded.
2. Every reference is checked against the recipient's own file.
3. Every missing constraint is written into the recipient's file in actionable
   words, and none is a link back.
4. **The count is recorded, including if it is zero**, as the sixth data point
   beside 1, 6, 3, 6, 2.
5. `pnpm links` green.

---

## What was done — 2026-10-12

### The grep, the date, the corpus

**2026-10-12.** Epic 4 wrote **no subject document** — unusual for this
repository, and worth stating, because it means this epic's constraints live
only in story files, task files and ADRs. The corpus is **91 files / 35,124
lines**: 1 `EPIC.md`, 9 `STORY.md`, 81 `TASK-*.md`.

```
grep -rnoE "(Stor(y|ies) [0-9]+\.[0-9]+(,? (and )?[0-9]+\.[0-9]+)*|Epic [0-9]+|^.*Owner:.*$)" \
  planning/epic-04-market-overview/
# 896 matching lines
```

Occurrences by target: Epic 14 **126**, Story 4.5 85, Story 4.2 69, Epic 4 65,
Story 4.3 58, Epic 5 **58**, Story 4.4 53, Epic 3 48, Story 4.9 **43**, Story
4.7 42, Epic 6 **39**, Story 4.6 38, Story 4.8 26, Story 4.1 16, Epic 2 15,
Story 3.10 13, Story 3.8 10, Story 1.4 10, Epic 7 **7**, Epic 13 **5**, Epic 10
**3**, Epic 8 **2**. `Owner:` lines: **14** — 9 are conditions with no recipient
file ("whoever next touches either page"), 4 sit inside sweep instructions, 1
names Epic 5 and is discharged.

### The sixth data point

> **1, 6, 3, 6, 2 → 8.**

**24 constraints** were checked against the recipient's own file. **16 were
present** in the recipient's own words — Epic 5 ×5, Epic 6 ×3, Epic 13 ×2,
Epic 14 ×6 — and **8 were missing**. Seven if the Epic 8 entry is rejected,
which is the one this task would defend least and which is recorded as the
judgement call it is: its failure mode is an **absence** — nothing goes red —
which is why it was counted rather than dropped.

**What the distribution says, and it is worth more than the count. Six of the
eight are recipients the prescribed grep cannot find.** Epic 7 is named seven
times and Epic 10 three times, both only in passing; Epic 13's constraint lives
only in an ADR's consequence list; and the two scroll items and the ledger row
are named **nowhere** in a form a grep for a recipient would surface. **The
grep-shaped pass found 2 of the 8.** This is the fourth consecutive run in this
epic where the **walk** out-found the grep, so the method's load-bearing half is
**step 2 — opening the recipient's own file** — and not step 1.

### The eight, and where each landed

| #   | Constraint                                                                                                                    | Recipient                       | Why the grep missed it                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | `/` already draws `Current investigations`, names `EPIC 7` on screen, and constrains it four ways; plus `/`'s measured budget | `epic-07-.../EPIC.md`           | Task 4.1.8 wrote this hand-off for Epic 5's and Epic 6's regions and **not for the third** |
| 2   | ADR 0038's narrower reversal trigger names this epic's **tools** — a tool cannot attach a WebSocket to call a function        | `epic-07-.../EPIC.md`           | lived only in ADR 0038's consequence list                                                  |
| 3   | The same trigger names this epic's **agent**                                                                                  | `epic-10-.../EPIC.md`           | ditto, and Epic 10's file had nothing from Epic 4 at all                                   |
| 4   | A replayed aggregate would compute over **today's** universe, and no point-in-time membership exists                          | `epic-13-.../EPIC.md`           | ADR 0038 only — **and its own claim to be in `docs/GAPS.md` is false**                     |
| 5   | `Market topology` sits on the one grid row with **no content floor** and already overflows with a placeholder in it           | `epic-06-.../EPIC.md`           | named nowhere a recipient grep would reach                                                 |
| 6   | `Unusual activity` is the **first region on `/` that has ever overflowed**                                                    | `epic-05-.../EPIC.md`           | ditto                                                                                      |
| 7   | The day a region is drawn on a new route, `scrollable-region-focusable` goes **silent** for ever                              | `epic-08-.../EPIC.md`           | the judgement call; the failure is an absence                                              |
| 8   | **`LIVE-REHEARSAL.md` had no row for Story 4.6**                                                                              | `epic-03-.../LIVE-REHEARSAL.md` | the ledger ran 4.2, 4.3, 4.4, 4.5, 4.7, 4.8 — **no 4.6**                                   |

**Item 8 is the one that was about to cost something tonight.** Story 4.6's
close says in as many words _"a person opening a mover on the deployed site
mid-session and reading its price — Story 4.9, the ninth rehearsal row"_; Story
4.9's `STORY.md` carries the hand-off; Task 4.9.1's brief repeated it — **and the
row was never written into the ledger.** Task 4.9.8 opens the ledger, not Story
4.9's file, so the sitting would have been taken against a protocol with a hole
in it. **Two independent passes found it on the same day** — this task and Task
4.9.2's acceptance walk — both by going to **use** the mechanism rather than by
reading it, which is this repository's own named signature for a claim about a
mechanism that is not there. The row is inserted between 4.5 and 4.7 and carries
the three things only a sitting returns, including that a **sector** row opens
its **benchmark ETF** — the only row in the product whose destination is not its
own subject.

### Two live defects on `main`, both the same shape

**1. The 2026-10-07 dependency correction was recorded and not propagated.**
Story 4.9's `STORY.md` reads `**Depends on:** 4.7 — **corrected 2026-10-07**`,
while `EPIC.md`'s own table row still read **`4.8`** — and that same `EPIC.md`
states, eighty lines above, that _"a reader following the table's `Depends on`
column gets the execution order"_, which that column no longer gave. **Fixed
here**, a one-cell edit. The defect is `CLAUDE.md`'s _recording a correction and
propagating it are two obligations_, landing on the file that states the rule.

**2. Story 4.1 had no `**Depends on:**` line at all** — the only story file in
Epics 1–4 without one. **Fixed here**, with its epic link.

**The cross-check across all four started epics**, identifier sets with prose
stripped: Epic 1 **13/13 agree**, Epic 2 **14/14**, Epic 3 **11/11**, Epic 4
**7/9** — 4.1 absent, 4.9 disagreeing. A check for this would have been red
exactly where the known defect is **and nowhere else**: non-vacuous, and not a
noise generator.

### The dependency-line check: cheaply mechanisable, and it would have been RED

**Verdict: yes, as one `pnpm invariants` entry.** Routed to Task 4.9.5 with the
clause and the break already specified, because this task's job is the
enumeration and the check is somebody's `verify` step.

`every-story-states-one-dependency`: for every epic directory containing
`story-*/`, the epic's `EPIC.md` has one table with a `Depends on` column and
**exactly as many `N.M` rows as there are story directories**; every
`story-*/STORY.md` has a `**Depends on:**` line; and for each story the set of
`N.M` identifiers in its own line **equals** the set in that epic's table row
for it — with the story's identity read from its `# Story N.M — …` **heading**,
not its directory name. Cost: one pass over 4 `EPIC.md` files (47 rows) and 47
`STORY.md` headers. No AST, no network, no database.

**The defect a re-implementer cannot avoid writing** is why it must be keyed on
**the heading identifier and set equality between two files**. `CLAUDE.md`
forbids renumbering without remapping every reference, so a re-order in this
repository is **always** two edits to the same fact in two files, and the only
way to get it wrong is to make one of them. A clause keyed on the **directory
name**, or one that merely checks the named story **exists**, is green on exactly
the defect this epic paid ten days for: `4.8` is a real story, its file is there,
the link resolves, and `pnpm links` was green throughout. **Do not** extend it to
the 441 `TASK-*.md` `Depends on:` lines — their forms are genuinely heterogeneous
and no second statement of the fact exists to compare against.

### Two adjacent findings, routed rather than claimed

- **ADR 0038 says the point-in-time universe consequence _"is recorded in
  `docs/GAPS.md`"_ and it is not.** A claim about a mechanism, reading
  identically whether the mechanism is there or not. **Routed to Task 4.9.5**;
  the ADR wants a dated amendment beside its decision, never a rewrite.
- **`docs/GAPS.md` lines 3549 and 3655 name `Owner: Task 4.7.10's sitting`** — a
  task that is complete and whose sitting did not happen, since Story 4.7 ships
  owing AC 5b. Line 3753 is correct (it adds _"and Story 4.9's rehearsal if the
  calendar takes it"_). **Two entries point the person taking the sitting at a
  closed task.** Routed to Task 4.9.5.

### One correction to this task's own brief

The brief listed **Epic 14** among the expected recipients. Epic 14 was **0 of 6
missing** — all six constraints are present in its own file, in its own words.
And the `changePercent` byte count the brief attributed to Epic 14 was handed to
**Story 4.9**, not Epic 14. The brief was right to call its list a starting
point rather than a set, and this is the direction that matters: the thought-of
list was wrong about where the gaps were, not merely incomplete.

### Gates

| Gate          | Result                                                                 |
| ------------- | ---------------------------------------------------------------------- |
| `pnpm links`  | **`529 documents, 1725 cross-file links, 39 anchor links, 0 broken.`** |
| `pnpm verify` | recorded below                                                         |

## For a stakeholder — a status report, 2026-10-12

When one story measures something another story needs, the measurement has to be
written into **that** story's own file. A pointer back does not work, because a
pointer is what somebody follows when they already know to look — and the whole
failure is that they do not. This check has been run five times before and has
found something every time: 1, 6, 3, 6, 2.

**This time it found eight, and the most useful one would have cost us
tonight.** The rehearsal ledger — the only file in this repository about a person
_looking_ rather than about a test passing — had no row for the story that made
the landing page a place you can click through from. Two separate reviews found
it on the same day, both by going to use the list rather than by reading it.
Tonight's sitting would have been taken against an incomplete protocol.

**Two other findings are defects live on the main branch today**, and both are
the same shape: a correction recorded in one place and not carried to the other.
Ten days ago two stories were re-ordered; the file that tells a reader the
execution order was never updated. Both are fixed here, and a check that would
have caught them is specified and handed on.

**And four later epics now carry constraints they did not have.** The one worth
naming: replaying a past trading day would count the market using **today's**
list of tracked securities, because the database records no history of what was
tracked when — and that list already moved this morning, from 518 securities to 516. The result would not be a crash or a blank; it would be a plausible,
correctly-formatted, wrong number. That epic now has it in writing, together with
the decision it has to take early rather than late, because the data for past
dates cannot be reconstructed later — only written from the day somebody starts.
