# Task 4.4.7 — The ≤860 order, made one

**Status:** Not started
**Story:** [4.4 Breadth, & the Denominator on Screen](STORY.md)
**Depends on:** 4.4.5

## Objective

**At `width <= 860px` the grid reorders visually through `grid-template-areas`
while DOM order does not** — so the eye meets `Market breadth` second and the
keyboard meets it fifth.

**This story's own premise about it was FALSE and is corrected.** The amendment
said _"there is not one tab stop inside `.regions` at any width."_ **There are
six**: `Region` passes `scrollable` unconditionally and `Panel` renders
`tabIndex={scrollable ? 0 : undefined}`. Three other documents already said so —
Story 4.6's `STORY.md`, `Panel.tsx`'s docblock, `RankedList.tsx`. **So the mismatch
is shipped and live, and the trigger fired at Task 4.1.3 rather than here.** What
breadth changes is that the stop the eye meets second becomes the first one with a
figure under it.

**Owner's decision at Gate 1: reorder the DOM.** Source order can express exactly
one layout; it should express the one where order **is** the meaning. At ≤860 the
stylesheet's own comment says _order is the only hierarchy left_; at 1440 the grid
is two-dimensional and there is no single visual sequence for the DOM to disagree
with.

## What the user can see when this lands

**At ≤860, nothing visually** — and a keyboard or screen-reader user meets the
regions in the order the screen shows them. **At 1440 and 1024, nothing at all.**

## Work

- **Reorder the JSX to the one-column order** — `breadth, sectors, movers,
topology, unusual, investigations` — and change no CSS.
- **Keep the ≤860 `grid-template-areas` block even though it becomes redundant.**
  Deleting it reintroduces the _every breakpoint that narrows a grid must restate
  its areas_ trap on the next change.
- **Verify nothing positional depends on source order**: there is no `nth-child`,
  `first-child`, `last-child`, `first-of-type` or sibling combinator in
  `MarketOverview.module.css`, `Region.module.css` or `Panel.module.css` — **this
  was checked during shaping and must be re-checked, because it is the whole
  safety argument.**
- **`pnpm probe /` at all four widths, before and after, compared box for box.**
  A grid change renders identically in every test below `pnpm e2e`; the probe is
  the only instrument that can see it.
- **State the cost rather than hiding it.** At ≥861 a keyboard reader now gets
  `breadth → sectors → …` against a column-major visual order. The argument for
  accepting it: in two columns the eye is not performing a sequence, so there is
  no reading order to disagree with. **Record it as a decision with that
  argument**, not as a side effect.
- **An assertion a machine can make**: DOM order against geometric top-to-bottom
  order at 768. Whether the result is _meaningful_ sequence is a listener's
  judgement, but the disagreement itself is checkable and currently is not.
- **`docs/GAPS.md` has no entry for this at all** — no mention of `860`,
  `reorder`, `focus order`, `1.3.2` or `2.4.3` — in a file that carries both
  sticky-focus entries. Add it or discharge it.

## Done when

1. DOM order is the ≤860 order, no CSS changed, and the areas block kept
2. `pnpm probe` at four widths shows every region's box unchanged, before and
   after
3. An assertion compares DOM order against geometric order at 768, with a break
4. The wide-width cost is recorded as a decision with its argument and a reversal
   trigger
5. The story's false premise is corrected in its own file
