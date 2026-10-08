# Task 4.5.2 — A comparator with a second consumer

**Status:** Not started
**Story:** [4.5 The Movers, & the First Surface That Ranks by a Live Value](STORY.md)
**Depends on:** —

## Objective

**Discharge the `docs/GAPS.md` entry that names this story as its owner**, and
give the top-N a home beside the comparator rather than a second implementation.

The entry's words: _"Nothing forbids a SECOND comparator over a figure's move,
and the obvious clause is red against shipped code. **Owner: the first story
that ranks anything server-side other than the eleven** — Story 4.5's movers by
name. It writes the second caller, so it is the change that can say what the two
have in common and key a clause on that rather than on this one's incidentals."_

## What the user can see when this lands

**Nothing.** 4.5.5 pays it off.

## Work

### The rule has one home and it is not re-derived

`packages/shared/src/sector-ranking.ts` holds it: **descending by the figure's
own move; a figure with no move has no ranking key and sorts after every keyed
one, holding arrival order; two figures equal at displayed precision never
swap.** No default and no `?? 0` anywhere — `key ?? 0` places a security we have
not heard from **among the genuinely flat ones**, which is ADR 0029's false
impression expressed as a **rank position**.

`sectorRankingKey` is already the one home for _which field this state's move
lives in_ — `changePercent` on an `observed` figure, `sessionChangePercent` on a
`stored` one. **Reuse it. Do not re-derive a move**: Story 4.4 measured that the
expensive part is already paid by the join, and a top-N that re-derives is a
second producer of a figure 518 rows wide.

### The module's name is now wrong for two consumers

The generic half — the key reader and the comparator — is generic over
`WireOverviewFigure` and is about a **move**, not a sector. A movers selector
calling `compareSectorFigures` reads wrong, and writing a second comparator is
the defect the module's own header forbids. **Rename the generic two**
(`moveRankingKey`, `compareByMove`) and keep `rankSectorFigures` sector-specific.
**It touches three `scripts/breaks.mjs` entries (≈2298, 2313, 2639) and they must
move in the same change** — `CLAUDE.md`: _when you move or reformat anything a
break names, run the break._

### The selection, bounded rather than sorted

**Measured** (400 timed iterations after 300 warm-up, built `dist`, 503 synthetic
observed figures, median / p95 / max):

|                                        | median        | p95    | max    |
| -------------------------------------- | ------------- | ------ | ------ |
| full sort of 503 (`rankSectorFigures`) | 0.5985 ms     | 0.6292 | 0.7455 |
| full sort + `slice(0,10)` both ends    | 0.5942 ms     | 0.6254 | 0.6442 |
| bounded top-10, one pass               | 0.0465 ms     | 0.0488 | 0.0995 |
| **bounded top-10 ×2 (both ends)**      | **0.1011 ms** | 0.1296 | 0.1607 |
| one bare pass reading the key          | 0.0012 ms     | 0.0014 | 0.0400 |

A full sort is the right tool for eleven rows whose **whole roster is drawn**;
for a top-N over 503 it is **13×** the cost for an order nobody sees. **Re-take
these figures rather than citing them** — they are a shaping agent's and this
task owns the real ones.

### The check this task owes, and the three recorded false starts

`docs/GAPS.md` says the obvious clause is **red against shipped code**:

- a file-level clause over `.sort(` plus a move-field name is red today against
  `sector-performance.ts`' hold, which sorts by a **reader-pinned position** and
  reads no figure;
- and it flags `UniverseTable.tsx`, where `changePercent` is an imported
  **function** rather than a field.

**Prefer a clause the re-implementer cannot avoid writing — the division, not
the type name.** The candidate is the **subtraction of two displayed
percentages**, the analogue of the division: exactly one shipped module may
contain it. **Confirm it passes WRONGLY on the file the next story would write
before fixing it**, keep the transcript, then confirm red, then delete the file.
Four consecutive tasks in one story shipped guards green on the exact defect they
forbid, and **every one of them had a break that went red**, because a break
edits the file the check was written around.

### Boundaries

Not the producer wiring (4.5.4). Not the population choice — it is the **503
equities**, decided at Gate 1. Not the row or the component (4.5.1, 4.5.3).

## Done when

1. The generic key reader and comparator are named for a **move** rather than a
   sector, every caller and the three `breaks.mjs` entries move with them, and
   each named break still lands
2. A bounded two-ended selection exists beside the comparator, re-uses the one
   rule, and contains no `?? 0`, no second rounding and no second classifier
3. Its cost is re-measured on this machine with n, median, p95 and max, against
   the full sort it replaces
4. `docs/GAPS.md`'s second-comparator entry is **discharged** — a
   `pnpm invariants` clause with a `pnpm break`, keyed on something the
   re-implementer cannot avoid writing, with the passing-wrongly transcript
   recorded
5. `pnpm verify` green
