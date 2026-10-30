# Story 6.9 — The Rehearsal, the Sweep, & Epic 6's Close

**Status:** Not started
**Epic:** [Epic 6 — Market Topology](../EPIC.md)
**Depends on:** 6.8
**Epic scope covered:** the close

## Description

**Epic 3's close is the template, Epic 4's is the correction to it, and Epic 5's
found two things this epic should not repeat.**

**1. Write the subject document DURING the epic, not at the close.** Epic 4
shipped with **no** subject document and wrote `MARKET-OVERVIEW.md` at its own
close; **Epic 5 then did exactly the same thing** and wrote `ANOMALY.md` at its
close, which opens by recording that it is the second consecutive epic caught at
the same point. `TOPOLOGY.md` should exist from **Story 6.2** and be amended by
each story after it, so this epic is the first in three not to be caught.

**2. Every story owes a per-criterion verdict at its own Gate 2.** Epic 5 had
**59** acceptance criteria and **33 had no verdict**, because three of its six
stories closed without the table the other three published — and they were the
three most recent. Reconstructing them weeks later from task files is a
different and weaker artefact; each story writing its own is the whole repair.

**And this epic's exit criterion is measurable in a way its predecessors' were
not.** _The tracked universe can be explored smoothly as an interactive graph,
and unusual securities are visually obvious_ — **smoothly** is §28's 60 FPS and
has a number; **visually obvious** is a person's judgement and has none.

## What the user can see when this story lands

**Nothing new**, and an epic whose figures can be re-taken rather than cited.

## Acceptance criteria

1. **Every acceptance criterion in 6.1–6.8 has a verdict with an instrument
   named**, split between **re-takes** (a runnable command from a clean clone)
   and **dated readings** — and, since Epic 5's close, **which store the reading
   came from**, because _verified_ frequently means verified in the refusal arm.
2. **§28's two topology targets are measured and published**: 60 FPS at 500
   nodes / 5,000 edges, and the main-thread rule on three channels. The
   synthetic 5,000-node target is **Epic 14's** and is confirmed as such rather
   than attempted here.
3. **A person has watched the graph against a real session**, with a dated row
   in `LIVE-REHEARSAL.md`. Epic 5 closed owing **six** unwatched rows plus an
   inherited waiver; this epic should not add a seventh. Four things only a
   sitting returns: whether the graph reads as _the market_ or as _a diagram_;
   whether 8 extreme nodes in 500 are findable without hunting; whether the
   motion reads as alive or as noise; and whether a third of the graph not having
   been heard from is noticeable.
4. **The upward sweep**, against the list **and** against a grep. Known
   candidates: `PRODUCT_SPEC.md` §10's five encodings and three relationships,
   §27's _such as Sigma.js_, §28's two topology targets, §9's sketch (whose
   proportions this epic finally realises), and `VISUAL-LANGUAGE.md`'s line that
   this epic inherits none of the chart layer's idioms.
5. **The sideways hand-off run and its count recorded — the EIGHTH data point.**
   The record reads **1, 6, 3, 6, 2, 8, 10**. Epic 5's run found that four of its
   ten misses were recipients that are **not epics** and therefore have no
   `Handed here by` convention — and that the worst miss was an explicit
   `Owner:` line the prescribed grep finds most easily. **Write the hand-off
   where the measurement is taken, not at the close.** Known recipients: **Epic
   7** (`get_related_securities`, `highlight_graph_nodes`, `set_graph_encoding`
   are its tools over this epic's model), **Epic 10** (the model is what a
   workspace command addresses), **Epic 13** (a replayed graph needs
   point-in-time membership, which begins 2026-10-12 and refuses earlier), and
   **Epic 14** (the synthetic mode, and whether this epic tripped its second
   condition).
6. **`docs/GAPS.md` updated**, with anything mechanisable made mechanical and a
   `pnpm break` for every check added.
7. **`pnpm verify`, `pnpm test:database` and `pnpm e2e` green with their
   numbers**, taken **once on the final tree**, with the load read **before**
   each run.
8. **Epic 6 closed**, its exit criterion verdicted, and everything shipping open
   carrying an **owner and a condition** rather than an epic number.

## Design work

The canvas artefacts this epic produced are verdicted as finished or not, and
`VISUAL-LANGUAGE.md` is reconciled with whatever the canvas gained — the chain
is **canvas → `VISUAL-LANGUAGE.md` → `tokens.css` → components**, and it only
stays true if a close walks it. **Note two items inherited rather than created**:
there was no topology page on the canvas when this epic began, and
`The motion vocabulary.dc.html` has carried **two stale story numbers since
2026-09-21**, because nothing in this repository can grep the canvas.

## Out of scope

Epic 7's investigations, Epic 14's synthetic mode.
