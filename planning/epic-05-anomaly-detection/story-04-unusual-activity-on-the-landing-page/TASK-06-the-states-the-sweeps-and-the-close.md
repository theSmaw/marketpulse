# Task 5.4.6 — The states, the sweeps, and the close

**Status:** Not started
**Story:** [5.4 `Unusual activity` on the Landing Page](STORY.md)
**Depends on:** 5.4.5

## Objective

**A collection of completed tasks is not a completed story.** The region's
states have to be produced together — no single screen shows a collision — and
the falsifications this story found have to travel upward and sideways, which a
story close does not do on its own.

## What the user can see when this lands

**Nothing new.** The states are proved rather than asserted.

## Work

- **The states into the kept grid** (`overview-degraded-grid.spec.ts`, which
  fails in **both** directions): nothing observed — CI's permanent state, zero
  bars and no baseline generation, for ever; the market shut on the session
  basis; **nothing unusual at all**, which is a **full list of ordinary
  ordinals** and not an empty state, and is the state most likely to be mistaken
  for broken; fewer scored securities than the region reserves; a baseline never
  computed; the section absent on a rollback; a region error. **Partition by
  drawn string must equal partition by declared class** — a content class is
  **one aggregate**.
- **Note what deleting the `reserved` panel leaves live for Epic 6**: Task
  4.7.9 row 08 found a rollback omitting a section draws a region **exactly
  like one this product has not built yet**, differing only by the absence of an
  `EPIC n` badge. After this story two hatched panels remain; the fewer badged
  hatches there are, the more a badge-less hatch reads as house style.
- **Sweep upward.** Every figure this story falsified: AC 8's byte estimate and
  its "first reduction" premise, AC 9's three-triggers claim, the 680-versus-900
  framing, and `anomaly.ts`'s band boundaries remaining unbuilt. Correct the
  live sites, amend ADRs with dates rather than rewrites, leave the historical
  records standing.
- **Sweep sideways, by enumeration not by memory.** Grep this story's documents
  for every `Story N.M` and `Owner:` line, check each against that story's own
  file, and **record the count that were missing** — Story 5.3's close
  propagated its 11.78 s figure sideways into 5.5 correctly and missed it
  **upward** in `EPIC.md`, which Story 5.4's Phase 1 found and fixed. The known
  one: **the amber collision belongs to Story 5.6** and must be written into
  5.6's own `STORY.md` in words that story can act on.
- `docs/GAPS.md` for every claim left standing that nothing mechanical guards —
  and anything that can be made mechanical is made mechanical instead.
- `LIVE-REHEARSAL.md` row **5.4**, written before the sitting and saying so.
  **This is the fourth row this epic owes a person**, beside 5.1, 5.2, 5.3 and
  Epic 4's waived 390 row — and `pnpm invariants` refuses Epic 5's close until
  they are filled.
- `STORY.md` status; the subject document — **`MARKET-OVERVIEW.md` wins where a
  task file disagrees**, so the account of `/` is amended there; `CLAUDE.md`'s
  _Current state_, because this story changes what a user can see.

## Done when

1. Every state is produced through the shipped path and photographed, and **no
   two read identically at any width**.
2. The upward sweep names each falsified claim, the command that found it, and
   the sites corrected.
3. The sideways sweep is **enumerated**, with the count that were missing
   recorded, and 5.6's `STORY.md` carries the amber collision.
4. `LIVE-REHEARSAL.md` row 5.4 exists and states what no instrument can claim.
5. `pnpm verify`, `pnpm e2e` and `pnpm test:database` green, with the output
   quoted rather than the verdict line.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
