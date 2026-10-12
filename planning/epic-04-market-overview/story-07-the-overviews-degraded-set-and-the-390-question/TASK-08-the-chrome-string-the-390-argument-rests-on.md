# Task 4.7.8 — `AppHeader`'s `composes` defect, and the 201 px the 390 argument rests on

**Status:** In progress — 2026-10-11
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
