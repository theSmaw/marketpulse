# Task 3.10.9 — The whole set, produced and photographed together

**Status:** Not started
**Story:** [3.10 Disconnection, Staleness & Every Degraded State](STORY.md)
**Depends on:** 3.10.3, 3.10.4, 3.10.5, 3.10.6, 3.10.7, 3.10.8

## Objective

Criteria 1 and 2, and **this is the task the whole story is shaped around.**

> Every state in the set is enumerated, reachable in the suite, and photographed
> at 1440, 1024, 768 and 390 — and **two states that imply different next
> actions do not read identically.**

## What the user can see when this lands

**Whatever this task finds.** Which, on the evidence of the pass it is copied
from, will not be nothing.

## Why a pass at the end rather than eight careful tasks

Because **a state is correct on its own and wrong beside its neighbour**, and
that is not a hypothesis. Task 2.14.7 enumerated every failure and partial state
in Epic 2 and photographed them together, and found **four defects, none of
which was visible one state at a time**:

- two empty answers that read identically while implying different next actions;
- a confident sentence about data nobody had read;
- a region that says nothing when its subject is missing;
- a note inviting a reader to use a control that had just said it was
  unavailable.

**Every one of those was shipped, green, and invisible to everything
mechanical.** This task is the same instrument pointed at a bigger set.

## The set, which is a product of two lists rather than a list

Enumerate it properly: **every surface × every state**, plus the states that
only exist in transition.

| Axis       | Members                                                                       |
| ---------- | ----------------------------------------------------------------------------- |
| Connection | `live`, `stale`, `disconnected`, reconnecting, dropped-for-backpressure       |
| Session    | pre-market, open, after-hours, shut, holiday                                  |
| Data       | live and fresh, live and old (**state 4**), stored close only, nothing at all |
| Series     | complete, gap in the middle, stopped edge, never started                      |
| Deployment | no provider configured, replay, fixture                                       |

**Not every cell is reachable and that is a finding rather than a gap** — say
which are unreachable and why, the way Task 2.14.7 did.

## The two rules that catch the defects

**1. Two states that imply different next actions must not read identically.**
The Epic 2 pass found this twice. Candidates here, named so they are checked
rather than stumbled on: _disconnected_ against _market shut_; _stale_ against
_quiet security_; _gap in the middle_ against _a security that did not trade_;
_state 4_ against _state 1_.

**2. A region that says nothing when its subject is missing.** `docs/GAPS.md`
entry 13 carries this with an owner that is a **condition** — _the next story
that publishes a state grid_ — and this task publishes one. **So the owner is
you**, and the repair is checked by walking the **producers** rather than by
rendering a state, which is what `market-feed-grid.test.ts` established.

## Work

- The grid, every reachable cell produced through 3.10.2's harness
- Photographs at four viewports, together rather than one at a time
- Greyscale for every state that differs by hue
- Each unreachable cell named with why
- Every defect found either repaired here or handed on **by name**
- `docs/GAPS.md` entry 13 discharged or re-owned with a condition

## Done when

1. The set is enumerated and every reachable member photographed at four widths
2. No two states implying different next actions read identically, checked
   deliberately against the named candidates
3. Entry 13 has a verdict
