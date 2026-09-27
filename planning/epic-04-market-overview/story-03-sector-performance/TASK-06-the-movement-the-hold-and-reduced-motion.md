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

## Amended by Task 4.3.3 — 2026-09-27: the treatment is drawn and the owner took it — three things you implement rather than decide, and two traps that fail silently

**`The order that changes.dc.html` is the drawing. Read it before writing a line.**
What follows is the part that is a decision rather than a picture.

### 1. The two events are separated in TIME, and it is one token used twice

**`--motion-duration-settle` of stillness, then `--motion-duration-settle` of
travel.** No new token, no new number, no new limb. Taken by the owner on
2026-09-27 against drawing them coincident and against anything louder.

**Why**, on a measurement rather than a worry: `LIVE-DATA.md` §7.4 (**n=445
minutes**, all 518 symbols) bounds the intra-minute first-to-last spread at **p50
243 ms, p95 511, p99 616, max 770**, and the eleven are a subset so their spread is
bounded above by it. Against the mark's **900 ms** decay that is ~650 ms of
**eleven simultaneous discs, however many frames carried them** — and eleven discs
plus a whole-list re-order inside the same quarter-second is the gesture a page
makes when it **reloads**.

**Implement it as the same token twice and not as a delay plus a duration.** Under
`prefers-reduced-motion` both halves must resolve to `0 ms` **together**; a
hard-coded delay leaves an empty pause where the reader who asked for less motion
waits for nothing.

**The printed ordinal commits with the FIGURE, not with the travel.** Nothing on
screen may be stale during the 240 ms pause — that is what makes the lag legible
rather than wrong.

### 2. Two reduced-motion traps, and both are this repository's own shipped defects

- **A zero-duration animation applies no keyframes at all**, which is why the
  mark's `opacity: 0` base is load-bearing. Without it the disc stays on screen
  for ever.
- **A zero-duration transition may not fire `transitionend`.** A treatment that
  clears its transform on that event leaves a row **stuck under a transform** —
  drawn on the canvas as rank 3 sitting 81 px down on rank 6's line **with every
  printed ordinal correct**, which is exactly what makes it survive a review.
  **Clear the transform without relying on `transitionend`.**

Both fail in the same direction: **a reader who asked for less motion gets a worse
page than one who did not.** Assert both in a browser; neither is visible below
`pnpm e2e`.

### 3. The mark's trigger stays `arrivalKey` — and getting this wrong is invisible

**A row can mark without moving, and move without marking.** The second is the
correctness argument: its neighbour's bar arrived and overtook it, and **this row
received nothing**, so marking it would claim data that did not arrive.

**So the disc must keep firing off the observation's own identity, never off a
changed rank.** Firing it off the rank produces a disc in combination C —
moved-and-not-marked — and **nothing below `pnpm e2e` separates the two**, because
both render a disc beside a row that changed position. If you add a check, this is
the one worth having, and it owes a break; prefer a clause the re-implementer
cannot avoid writing.

### 4. The FLIP, as drawn

Measure, commit, invert, release. **Every offset is a multiple of 27 px** (the
26 px row plus its 1 px separator), so the inverse is an integer and no row lands
on a half-pixel. **Transform only** — animating `top`, `order` or `grid-row` is
per-frame layout on the page §28 can least afford it, and re-ordering in CSS while
the DOM stays put hands a screen reader **a different ranking from the one drawn**,
invisible to axe, to jsdom and to a screenshot. **DOM order equals visual order.**
**Rows keyed by `symbol`, never by index**, or React rewrites nodes rather than
moving them and destroys hover, focus and any in-flight decay.

**No stagger.** Refused twice: it encodes an order the data does not have, and it
lengthens the gesture from 240 ms to **640**.

### 5. Reduced motion loses the fact that the order changed, and that is accepted

A reader with the preference gets **the complete order exactly**; what they do not
get is **that it moved**. The owner accepted that rather than repairing it — the
only repair is the fourth mark the drawing refused, which would then exist _only_
for that reader: a treatment nobody reviews, on the rows where least data arrived.
**Do not add it.** If it comes back it is a change to the vocabulary, not to this
component.

### 6. The hold is not a second mode

`ORDER HELD` is `stateMark`'s **third consumer** (_a state PERSISTS_) and the first
use of that limb for something **a reader caused**. The finding from the drawing:
**the ordinary treatment IS the hold with step 4 put back.** One path, one commit —
**the hold gates the movement, not the ranking.** Figures and printed ranks update
underneath it; the disagreement between the ordinals and the list order **is** the
pending re-order. The head slot reserves the wider badge so nothing moves when it
appears. The release is the largest movement this component can make **and the
safest, because the reader caused it**.

### 7. The reversal trigger, and the anti-lever

> **The first sitting in which a person reports the sector region as flashing or
> refreshing rather than as facts arriving.**

**The lever is the disc, not the motion** — the strip cannot lose its disc, because
four barely-changing figures need a _look_, but a ranked list can, because **its
aliveness is its order**. **The anti-lever is named: never slow the motion down.**

## Amended by Task 4.3.5 — 2026-09-27: the region head's slot is yours to open, and the rows are built so you cannot be foreclosed

**Two things 4.3.5 deliberately did NOT build, because they are yours:**

**1. The region head's count slot.** `11 · RANKED` was not built, and the reason is
that **it is the same slot `ORDER HELD` goes in** — and it needs a `Region` /
`Panel` change to exist at all. Opening that slot twice, once for a count and once
for a badge, is two changes to a shared component for one idea. **Open it once,
here**, and reserve the **wider** of the two strings so nothing moves when the
badge replaces the count — `The ranked list.dc.html` §05 state 7 draws it.

**2. The rows are already built not to foreclose you.** Keyed by `symbol`, DOM
order equal to visual order, and the `<ol>`/`<li>` markup the FLIP needs. **The row
pitch is 27 px** — a 26 px row plus its 1 px separator — which is the multiple your
offsets must be, measured rather than assumed. A transform does not change a row's
height, so **the region's 461 px is not yours to move** and 4.3.5's probe figures
stand.

**3. What 4.3.5 shipped that you must not duplicate.** `PriceChange` carries
direction and the list spells **neither the sign nor the glyph**; the arrival mark
composes `arrivalMark` **position only**; and the three absence strings have one
home in `market/sector-performance.ts`. Your two events are a figure changing
(which fires the shipped disc, **keyed on `arrivalKey`, never on a changed rank**)
and a position changing (carried by the movement). Neither needs a new string.
