# Task 4.3.1 — The grid's height, and the reserved panel that lied

**Status:** **In progress — 2026-09-27.**
**Story:** [4.3 Sector Performance, & the Benchmark That Is Not an Average](STORY.md)
**Depends on:** nothing

## Objective

**Eleven rows do not fit, and the panel that is supposed to be holding room for
them is the wrong size in both directions at once.** Two measured facts, pointing
opposite ways:

**At 1440 and 1024 the region is too short.** `.regions` declares
`height: 82vh` with `grid-template-rows: 0.7fr 1.15fr 1.15fr`, so `.areaSectors`
resolves to **265 px whatever is in it**. Minus the border, the 51 px header and
2 × 16 px of body padding, the list gets **180 px** — **16.4 px a row** for
eleven rows, below this product's own dense leading of 13/18. And `Region`
passes `scrollable` unconditionally, so `Panel` is `overflow: auto`: **the
default behaviour is a silent scroller that hides the weakest sector.** That
fails the story's own payoff sentence, is the `Market O` defect class this
product shipped once, and adds a scrolling tab stop inside `.regions` that
Story 4.6's focus work would then have to answer for.

**At 390 the reserved panel is too short, and a rule was written against
exactly that.** `Market overview.dc.html` §03 records Task 4.1.4's decision —
_"`Sector performance` is a tall hatched panel today and eleven ranked rows in
three weeks, and **nothing on the screen moves when it fills**."_ It is **121 px
at 390**. So the page **will** re-compose when this story lands, breaking that
rule in the story it was written for.

**`Movers` has the identical 265 px box** and needs ten rows plus two group
headings, so this is one decision for the interim primary column rather than a
sector quirk.

## What the user can see when this lands

**The landing page's lower grid stops being a fixed height.** Nothing is added
and nothing is removed; the six regions below the strip size to their content
instead of to a proportion. On today's screen — six reserved panels — the
visible change is small and the page should look substantially as it does now,
which is the thing to verify rather than assume.

## Work

- **`min-height: 82vh` with `grid-template-rows: 19vh auto auto`**, taken by the
  owner at Gate 1. Row 1 keeps a **resolved** box because Epic 6's WebGL canvas
  needs one; rows 2 and 3 size to content. `19vh` is `0.7/3.0 × 82vh ≈ 172 px`
  against the 161 px the topology row measures today — confirm that rather than
  trusting the arithmetic.
- **Raise the reserved height of `Sector performance` and `Movers`** so the
  filled region is the height the reserved one already was, at every width.
  Task 4.1.4's rule is that nothing moves when a region fills; this task is
  where that is either honoured or consciously retired.
- **Restate the spans at every breakpoint.** The measured trap: a `span N` item
  wider than the explicit grid is **not clamped** — it grows implicit columns,
  and a `span 3` region in a two-track grid produced `134px 134px 676px`, a
  visibly broken page at every width under 1184 px, with `pnpm verify` and all
  54 browser tests green.
- **Record the deltas.** `pnpm probe /` at 1440/1024/768/390 before and after,
  and the delta per width, the way Task 4.2.5 recorded `+80/+80/+80/+148` —
  because every region below moves by it.
- **A dated amendment to `Market overview.dc.html`** §01, §03 and §04: the real
  filled heights, and the correction to §03's "tall hatched panel" claim. The
  canvas is the source of truth and it currently records a height the tree does
  not have.

## Done when

1. `.regions` is `min-height` with row 1 resolved, and the topology row's box is
   unchanged to the pixel
2. Eleven rows of the product's dense leading fit the sector region with air, at
   1440 and 1024, measured
3. No region on `/` scrolls at any of the four widths in its **reserved** state,
   and `Panel`'s `scrollable` behaviour is either still correct or deliberately
   changed with the reason recorded
4. The reserved height equals the filled height at every width, or Task 4.1.4's
   rule is explicitly retired with its replacement stated
5. `pnpm probe` deltas recorded per width; `pnpm e2e` green, including
   `landing-route.spec.ts`
