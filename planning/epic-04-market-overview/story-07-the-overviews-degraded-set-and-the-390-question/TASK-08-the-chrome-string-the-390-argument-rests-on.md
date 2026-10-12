# Task 4.7.8 — `AppHeader`'s `composes` defect, and the 201 px the 390 argument rests on

**Status:** Not started
**Story:** [4.7 The Overview's Degraded Set, & the 390 Question Answered](STORY.md)
**Depends on:** 4.7.2

## Objective

**This story owns the defect because of what it corrupted**, and what it
corrupted is this story's own subject.

## What the user can see when this lands

**A chrome descriptor at the size its stylesheet says**, and at 390 a
measurement that is of the product rather than of a defect.

## Work

### The defect

`AppHeader.module.css`'s `.descriptor` composes `microLabel` and then declares
`font-size: 9px; line-height: 1` — and **loses**, because `composes`
concatenates class names rather than cascading and `type.module.css` lands
later. Verified in the built bundle: it renders at **11px/16px** against
`--font-size-micro: 11px` and `--line-height-micro: 16px`.

**Nothing in this product asserts a font size**, so no test and no screenshot
of the existing states can see it.

### Why it is this story's

That element is the one `AppHeader.module.css`'s own comment calls **"the
longest string in the chrome — 201 px at 1440"**, in the argument that decided
**what wraps at 390** — which is this story's subject. **The repair shrinks it
to roughly 165 px, so the figure and the wrap argument cannot both be carried
forward.**

### The blast radius, which is the widest in the story

**It is not a font-size change, it is a chrome-height change.** `AppHeader`
measures itself and publishes `--sticky-chrome-height`; `base.css`'s
`scroll-padding-top` reads it. So shrinking 11px/16px to 9px/1 moves the
published height, hence the scroll padding, hence **every sticky-edge
measurement in the repository**: `overview-focus-ring.spec.ts` at four widths
in both directions (Story 4.6's +1.20 px clearance), the 0.09–0.14 px
reverse-Tab entry, `search-keyboard.spec.ts`'s 768 stops,
`universe-navigation.spec.ts`'s `stickyChromeClearance()`, and the 94/73 at 390
that the wrap argument rests on.

**Order matters: this must not run AFTER Task 4.7.2's photographs**, or the
photographs are of the defect. If 4.7.2 has already run, its 390 column is
re-taken here.

## Done when

1. `.descriptor` renders at the size its own rule declares, by spelling the
   properties rather than composing them where a value must differ
2. The **201 px re-measured**, and every live site carrying it corrected — with
   the wrap argument re-stated against the new figure or explicitly left
   standing as a dated record
3. Every sticky-edge figure the change moves is re-taken, named, and the ones
   that did not move said to have not moved
4. `pnpm verify` and `pnpm e2e` green, including the focus-ring walk at four
   widths in both directions

---

## Handed here by Task 4.7.9 — 2026-10-12: 104 photographs were taken against the defect, and your own hand-off never reached its sibling

Written here rather than linked.

**1. Your hand-off section is MISSING from Task 4.7.9's file.** That task's
brief asserts it carries one from 4.7.1, 4.7.2, 4.7.3, 4.7.4, 4.7.5, 4.7.6
**and 4.7.8**. It does not: the file has six sections and none of them is
yours. The figures (`.descriptor` 200.59 → 164.13 px; every sticky figure
unmoved, 94/73 at 390 re-taken and identical) reached 4.7.9 through the
**prompt** rather than through the file, so a later reader of that file does
not have them. This is `CLAUDE.md`'s _a hand-off sweeps SIDEWAYS, and a story
close does not reach it_ arriving from the other end — the constraint was
measured, it was written somewhere, and the somewhere was not the sibling's own
file. Write it in when this task closes.

**2. Your `Work` section's ordering clause now names a second thing.** It says
_this must not run AFTER Task 4.7.2's photographs, or the photographs are of
the defect_. There is a second set: **104 photographs at
`.capture/overview-degraded-grid/`**, thirteen states × four widths × colour
and greyscale, produced on 2026-10-12 on a branch off `main` that does **not**
carry your repair. Their masthead descriptor is the pre-repair 11px/16px.

**3. What that does and does not cost.** The grid's **strings** are unaffected
and need no re-take: the masthead is recorded per row and **excluded from both
comparison keys** (its clock mutates every second and its session word is the
wall clock's), and the descriptor is absent at 390 entirely. Only the
**pictures'** chrome is of the defect, and re-taking them is one command:

```
DEGRADED_GRID_PHOTOS=1 pnpm e2e overview-degraded-grid.spec.ts
```

~1.4 minutes, 104 PNGs and four `readings-<width>.json`, into a gitignored
directory. The producer is a **kept spec** rather than a throwaway, which is
the whole reason this is a command rather than a reconstruction.

**4. One figure you may want, measured here.** The sticky **footer**'s own box
is the one quantity on this screen that changes with the state, and nothing in
this task touches it — but if your sweep re-takes Task 4.7.2's five footer
heights, note that the state set is now thirteen rather than seven and the
spec above produces all of them.
