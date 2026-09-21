# Task 3.5.9 — The sweep, the hand-offs and the close

**Status:** Not started
**Story:** [3.5 Subscription Management & the Current Market State](STORY.md)
**Depends on:** 3.5.8

## Objective

Close the story: confirm every acceptance criterion against the tree rather than
against memory, sweep the documents this story wrote, and **push its constraints
sideways into the stories that will need them.**

## What the user can see when this lands

**Nothing**, and the honest summary of the whole story is that a user sees two
things from it: the identity block is correct on first paint (3.5.4), and a tab
survives a deploy (3.5.5). Everything else is the model
[3.6](../story-06-live-prices-across-the-universe/STORY.md) spends.

## The criteria, each checked against the tree

Walk all eight from [`STORY.md`](STORY.md) and state where each is proven — a
test name, a break entry, a measurement, or an honest _not met_. Two are worth
flagging in advance:

- **Criterion 7's "explained rather than noted"** is the one most likely to be
  claimed rather than done
- **Criterion 3's "at a size where the difference is visible"** is not satisfied
  by a three-symbol test, for Task 3.5.6's reason

## The hand-offs, which are the part a close routinely misses

**A hand-off sweeps SIDEWAYS, and a story close does not reach it.** A close
sweeps the documents the story **wrote**; a constraint one story measured for
another lives in a document the **owning** story does not own. Nothing about a
close naturally crosses that boundary.

So: write each constraint **into the sibling's `STORY.md`, in words that story
can act on** — never a link back, because a pointer is what a reader follows
when they already know to look, and the whole failure is that they do not.

**Enumerate mechanically rather than from memory.** Grep this story's documents
for every `Story N.M` and `Owner:` line, check each against that story's own
file, and **record the count that were missing.** This has happened twice in
this epic already: Story 3.1's close gathered five constraints for one story and
missed a story its own findings document named in as many words — having written
down, in that same close, that this is _"exactly how a measured constraint gets
lost"_.

Known candidates, to be confirmed rather than trusted:

- **Story 3.6** — the fan-out shape and the per-client subscription protocol it
  is about to spend, and whatever Task 3.5.8 measured about fan-out cost
- **Story 3.7** — whether today's bars are held in memory or assembled, because
  the chart's shape depends on the answer
- **Story 3.9** — that the current-state map is `status`-**filtered** and its own
  read path deliberately is not
- **Story 3.10** — the gap a reconnect leaves, which Task 3.5.5 explicitly did
  not fill, and the backpressure close code's interaction with retry
- **Story 3.11** — anything Task 3.5.8 could not measure, especially §28's p95
  if it is still unmeasurable
- **Epics 4, 5 and 7** — the three readers outside this epic that want the
  latest observation per security and none of which wants to open a socket.
  These are the reason the object exists at all, and they are the most likely to
  be missed because they are not in this epic's table

## Work

- The eight criteria, each with its evidence
- The hand-off enumeration, with the missing count recorded
- Sweep `LIVE-DATA.md` and `STREAM-SEAM.md` for claims this story falsified
- Add to `docs/GAPS.md` anything true, load-bearing and guarded by nothing — the
  candidate already identified is **an empty default that is also a true answer
  hides a design event until the day it stops being empty** (Task 3.5.4)
- Update `CLAUDE.md`'s _Current state_ — what a user can see, and what they
  still cannot
- Confirm `LIVE-REHEARSAL.md` owes this story nothing, since it is an invisible
  story; if 3.5.4 or 3.5.5 changed a visible surface, **it owes a dated row**

## Done when

1. Eight criteria, eight verdicts, none of them _probably_
2. The hand-off count is recorded, including if it is zero
3. `CLAUDE.md` describes the tree as it now is
4. `docs/GAPS.md` has gained whatever this story left standing
5. `pnpm verify` passes, and `pnpm links` resolves every reference added

---

## Amended by Task 3.5.1 — 2026-09-21: one hand-off is now concrete rather than anticipated

**Story 3.9 owns a correction this story deliberately drops.**

3.5.1 decided that the current market state **ignores a revision for a minute
already passed** — it does not change what the _latest_ observation is, and
applying it would walk the object backwards in time. The reasoning is sound and
the consequence must be written into the sibling that can act on it:

> **A revision for a superseded minute is discarded by the live path entirely.**
> §14.1 measured revisions at 0.064% of bars, **35.3% of them changing the
> close**, so these are materially wrong numbers rather than noise. The only
> place they can be applied is the **store**, and the store is Story 3.9's. If
> 3.9 does not apply them, this product's stored history is permanently and
> knowably wrong for a small fraction of bars — and nothing will ever report it,
> because the frame that would have corrected it was dropped a story earlier.

**Write that into `story-09-storing-the-live-session/STORY.md` in words that
story can act on**, not as a link back. It is exactly the shape of constraint
this epic has already lost twice.

**Re-check the hand-off enumeration against the re-ordering.** Tasks 3.5.2–3.5.7
were renumbered on 2026-09-21 after 3.5.1; a hand-off written against an old
number is a pointer to the wrong task, which is worse than no pointer.
