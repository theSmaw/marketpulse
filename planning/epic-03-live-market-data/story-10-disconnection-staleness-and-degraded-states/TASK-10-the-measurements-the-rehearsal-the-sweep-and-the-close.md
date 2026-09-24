# Task 3.10.10 — The measurements, the rehearsal, the sweep and the close

**Status:** Not started
**Story:** [3.10 Disconnection, Staleness & Every Degraded State](STORY.md)
**Depends on:** 3.10.9

## Objective

Close the story and, with it, **Epic 3's feature work**. Eight criteria, eight
verdicts; the figures this story owes; the rehearsal row; the upward sweep; the
hand-offs pushed sideways.

## What the user can see when this lands

**Nothing new.**

## The measurements this story owes

- **The per-row cost of whatever 3.10.4 added**, on a production build, against
  the figures Task 3.6.5 left: cold load **50–56 ms**, `Expand all` **65–86 ms**,
  steady state **37–40 ms** of script. Epic 14's trigger evaluated in writing.
- **The transition's own cost.** A feed dying re-renders every surface at once;
  that is a burst with a different shape from a bar arriving.
- **Any figure 3.10.1's decisions were taken against**, re-taken if the
  implementation moved it.

> **A figure that has moved looks exactly like a figure that was mis-recorded.**
> Only rebuilding the old commit tells them apart.

## The rehearsal, which is the half no instrument can take

`LIVE-REHEARSAL.md`'s 3.10 row. **And one item on the combined list is
specifically yours**: Task 3.4.10's _a tab survives a deploy_, now to be
confirmed deliberately on `/securities/NVDA` **during a session** — the first
time a person watches a real deploy under this page. Story 3.6's close repaired
the blank-page defect on this story's behalf; nobody has watched the repair
work in the wild.

**Take this story's items in the same sitting as the others.** `docs/GAPS.md`
entry 10 — the free plan holds **one** Alpaca connection and the deployment has
it — and the one-sitting list in Task 3.4.10 is where the pooling is recorded.
**Four stories already share that window.**

> **`scripts/session-watch.mjs` is still in the tree**, deliberately, because
> its findings were not finished being produced when Story 3.9 closed. If Story
> 3.10's sitting is the one that records them, **this task deletes it** — and
> checks first that the findings quote at least one frame, body or row
> **verbatim**, because the conclusion outlives the instrument and the evidence
> does not.

## The upward sweep — candidates, each checked rather than assumed

- **`PRODUCT_SPEC.md` §36** itself. This story ships the sentence that section
  names. If what shipped differs from what it describes, §36 gets a dated
  amendment beside it rather than a rewrite.
- **`CLAUDE.md`'s _What a user can see today_**, and its **_What they still
  cannot do_** — which, when this story lands, has nothing left in it from this
  epic. That is a paragraph that changes shape rather than gains a sentence.
- **`CLAUDE.md`'s open item on the region that says nothing when its subject is
  missing** — 3.10.9 publishes the state grid its owner-condition names.
- **`docs/GAPS.md`** — entry 13 by name, and the listening backlog, which this
  story will have added to.
- **`LIVE-DATA.md` §11.2's refusal to give a security a status word**, which
  3.10.1's decision 1 either upholds or overturns. Either way it is recorded
  where the refusal is.
- **`FRONTEND-STATE.md`** — what a page announces, which every degraded state
  touches, and the identity block's no-live-region decision with its trigger.
- **`PROVENANCE.md`** — the live row is a new kind of clause in a document that
  enumerates them.
- **ADR 0029** — a claim about data requires data, applied to a claim that
  **stops** being true while somebody watches.

## The hand-offs, enumerated rather than remembered

**Grep this story's documents for every `Story N.M`, `Epic N` and `Owner:`
line, check each recipient's own file, and record the count that were
missing — including if it is zero.**

The record so far, which is why this is spelled out: Story 3.7's close gathered
five constraints for one story and **missed a story its own findings document
named in as many words**; Story 3.8's found six recipients and **six
incomplete**; Story 3.9's found six and **three missing**, all of them epics
rather than the next story.

Known candidates:

- **Story 3.11** — the deployed re-take, the cost of holding a socket through a
  bad week, and the eight diagnostic events that reach production nowhere
  (`market-stream.ts` never references `onLog`, which is why a dead feed ran
  for nineteen hours unseen)
- **Epic 4** — the overview inherits this set rather than re-inventing it
- **Epic 5** — scores computed over a series that can now be degraded
- **Epic 10** — an agent's failure states, which has its own §36 list and must
  not grow a second vocabulary for the same idea
- **Epic 13** — replay has no feed to disconnect, so which of these states are
  _unrepresentable_ under a replay clock is a real answer it needs

## Work

- Eight criteria, eight verdicts, each with a test name, a break entry, a
  measurement or an honest _not met_
- The figures, dated, written where a later reader will find them
- The `LIVE-REHEARSAL.md` row, or the recorded reason there is none
- The upward sweep, live claims amended with a date and historical records left
  standing
- The hand-off enumeration, with the count
- `CLAUDE.md`'s _Current state_ and _Where the record lives_
- **The epic's own close**, since this is its last feature story: check
  `EPIC.md`'s exit criteria against what Stories 3.1–3.10 actually delivered

## Done when

1. Eight criteria, eight verdicts, none of them _probably_
2. The hand-off count is recorded
3. `CLAUDE.md` describes the tree as it now is
4. `pnpm verify`, `pnpm test:database`, `pnpm e2e` and `pnpm links` pass
