# Task 4.3.6 — The order that changes: the movement, the hold, and reduced motion

**Status:** Not started
**Story:** [4.3 Sector Performance, & the Benchmark That Is Not an Average](STORY.md)
**Depends on:** 4.3.3, 4.3.5

## Objective

**The decision Story 4.5 used to own, taken on eleven rows.** Task 3.6.3 froze
the 518-row table because _a row that moves while it is being read is a row that
cannot be read_ — and this is the surface that decision pointed at. What makes it
answerable here rather than there is the printed ordinal: **a move is recoverable
without motion, without colour, and without the reader having remembered
anything.**

## What the user can see when this lands

**The list re-orders as the market moves**, each row travelling to its new place
over 240 ms, its rank number changing with it. **And it stops moving while they
are reading it** — with a pointer over the list or focus inside it the positions
hold, the figures and ranks keep updating, and the region says `ORDER HELD`.

## Work

- **The FLIP**: re-order the array, measure, invert, transition to zero.
  **Transform only** — animating `top`, `order` or `grid-row` is per-frame layout
  on the page §28 can least afford it. **Rows keyed by `symbol`**, never by index.
- **One settle for the whole list, from one frame. No stagger** — a stagger
  encodes an order the data does not have, which `Market proxies.dc.html` §05
  refused and the refusal transfers verbatim.
- **A first order is not a re-order.** A row is marked only if it had a previous
  rank **under the same basis** — so the first order a browser draws is drawn
  flat, and the opening bell's wholesale basis change is a **new list** rather
  than eleven simultaneous re-orders. `arrivalKey`'s shipped rule with one word
  changed.
- **The hold**, scoped to the region via `:hover` / `:focus-within` — not to the
  row, because row scoping lets rows move out from under an **approaching**
  pointer. Unbounded in time and bounded by the reader rather than a timer.
  Figures and ranks stay true; the mismatch between printed ranks and vertical
  order **is** the pending re-order. `ORDER HELD` in the panel's `meta`, carrying
  `stateMark`. Settles in one 240 ms when the pointer leaves.
- **A re-order never changes `scrollTop`.**
- **Reduced motion**: the row simply **is** in its new place with its new number.
  Clear the transform **without relying on `transitionend`** — at `0 ms` it may
  not fire, and a row stuck under a transform is the same class of defect as the
  missing `opacity: 0` base, failing in the same direction.
- **The rule 4.6 inherits, written here so it cannot be invented**: one tab stop
  for the region; rows reached by **arrow keys** within the list when they become
  activatable, not by eleven tab stops; a roving `tabIndex` keyed on the
  **symbol**, never the index, or a re-order moves focus to a different sector
  while the reader's hands are still; activation resolved against **identity**,
  never position; and `aria-disabled` rather than `disabled` on anything carrying
  a description.

## Done when

1. A frame that changes the order moves the rows and their ordinals; a frame
   that does not changes nothing and re-renders nothing
2. Two figures that read the same on screen never swap — asserted
3. A pointer over the list holds the order; the figures keep updating; the region
   says so; it settles when the pointer leaves — asserted in a browser, which is
   the only level with a pointer
4. Under `prefers-reduced-motion` the treatment does not run, the new order and
   the new ordinals are correct, and no row is left transformed — asserted
   **paired**, one test with the preference and one without, because an absence
   assertion alone passes against a treatment that never worked
5. DOM order equals visual order in every state, asserted
