# Task 3.6.7 — The rehearsal, the sweep, the hand-offs and the close

**Status:** Not started
**Story:** [3.6 Live Prices Across the Tracked Universe](STORY.md)
**Depends on:** 3.6.6

## Objective

Close the story: walk all eight criteria against the tree, **watch it work
during a real session**, sweep the documents this story wrote, and push its
constraints **sideways** into the stories that will need them.

## What the user can see when this lands

**Nothing new.** What a user can see is Task 3.6.1's and Task 3.6.2's.

## The rehearsal, which this story genuinely owes

Criterion 7: **`pnpm probe` at all four viewports, and a person looked at the
page during a live session before the suite ran.**

**`LIVE-REHEARSAL.md` has a row for 3.6 and it is empty.** The rules are that
file's and they are short: a row is added by the story it names rather than
retrospectively at the epic close; a rehearsal is **minutes, not an evening**;
and **a replay-only observation is not a rehearsal** and must not be recorded as
one — if the surface was watched against the replay, say so beneath the table
rather than in a row.

**`What was wrong` is the column that earns the file.** Six stories with nothing
in it is a rehearsal nobody did.

**Production is the real socket and is the venue.** The deployed site serves the
real IEX feed during a session and an honest still page outside one; a developer
machine cannot take the connection while the deployment holds the plan's single
one. So the rehearsal for this story is **a browser and a Monday**, not a local
session — which is where Story 3.4's blocked list already sits, so the two
rehearsals are one sitting.

**Watch for the thing this story is most likely to have got wrong**, which is
not correctness: **a page with 518 rows moving on their own can be calm or it
can be a fairground**, and that is a judgement only a person watching it during
a live session can return.

## The criteria, each checked against the tree

Walk all eight from [`STORY.md`](STORY.md) and state where each is proven — a
test name, a break entry, a measurement, or an honest _not met_. Two are worth
flagging in advance:

- **Criterion 5** was unmeasurable when this story started and Task 3.6.4 was
  supposed to fix that. If it did not, say so plainly rather than deferring it a
  fourth time.
- **Criterion 4's** trigger evaluation is the one most likely to be claimed
  rather than done.

## The hand-offs, which are the part a close routinely misses

**A hand-off sweeps SIDEWAYS, and a story close does not reach it.** A close
sweeps the documents the story **wrote**; a constraint one story measured for
another lives in a document the **owning** story does not own.

**Enumerate mechanically rather than from memory.** Grep this story's documents
for every `Story N.M`, `Epic N` and `Owner:` line, check each against that
story's own file, and **record the count that were missing.**

**This epic's own history says how badly this goes when it is done from
memory.** Story 3.5's close ran the enumeration mechanically and found **seven
of eight recipients missing their constraint** — and the three missed by the
widest margin were the three **outside this epic's table**, which were also the
three its own story text named as the reason the work existed.

Known candidates, to be confirmed rather than trusted:

- **Story 3.9** — the chart inherits the motion vocabulary and whatever Task
  3.6.2 decided about it at scale, and is the second surface to apply it
- **Story 3.10** — this story produces the per-row degraded states at 518, and
  3.10 owns the set. Anything Task 3.6.2 decided about a row that has nothing is
  a member of that set
- **Story 3.11** — whatever Task 3.6.4 could and could not measure, and Task
  3.6.5's verdict on §28
- **Epic 4** — which this story's data makes possible: the breadth denominator,
  gainers and losers, and the ordering decision Task 3.6.3 deliberately did not
  take
- **Epic 14** — Task 3.6.5's verdict, either way

## Work

- The rehearsal, with a dated row — and `What was wrong` filled in honestly
- The eight criteria, each with its evidence
- The hand-off enumeration, with the missing count recorded **including if it is
  zero**
- Sweep `LIVE-DATA.md` for claims this story falsified, and **sweep upward**: a
  figure that falsifies `PRODUCT_SPEC.md`, an ADR or `CLAUDE.md` is corrected
  the same day, live claims amended and historical records left standing
- Add to `docs/GAPS.md` anything true, load-bearing and guarded by nothing
- Update `CLAUDE.md`'s _Current state_ — what a user can see, and what they
  still cannot

## Done when

1. Eight criteria, eight verdicts, none of them _probably_
2. `LIVE-REHEARSAL.md` has a dated row for 3.6, or an honest statement of why it
   could not be taken and what that blocks
3. The hand-off count is recorded, including if it is zero
4. `CLAUDE.md` describes the tree as it now is
5. `docs/GAPS.md` has gained whatever this story left standing
6. `pnpm verify` passes, and `pnpm links` resolves every reference added
