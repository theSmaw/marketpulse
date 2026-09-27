# Task 4.3.5 — Eleven sectors, ranked, on the landing page

**Status:** Not started
**Story:** [4.3 Sector Performance, & the Benchmark That Is Not an Average](STORY.md)
**Depends on:** 4.3.1, 4.3.2, 4.3.4

## Objective

**The payoff, and the first thing on this screen that tells a reader something
they could not have got from a security page:** which sectors are leading and
which are lagging, at a glance.

## What the user can see when this lands

**Eleven sectors, ranked by today's move**, each with a printed rank, its full
name, its benchmark ticker, a bar against a printed scale, and a signed figure
whose direction is carried by the glyph, the sign, the side of the zero anchor
and a spoken word before it is carried by hue.

**What they still cannot do:** watch the order change with any treatment
(4.3.6), see an honest answer for a sector we have not heard from (4.3.7), or
click a sector through to anything (4.6).

## Work

- **`RankedList`** under `src/components/`, built to 4.3.2's drawing, with the
  three props the drawing settled and a slot for the fourth that 4.5 fills. It
  owes stories under the `pnpm stories` rule and has states worth seeing side by
  side.
- **It composes rather than reinvents.** `PriceChange` for direction — the list
  **spells neither the sign nor the glyph**, because a second speller is a second
  thing to keep in step with the palette. The arrival mark composes
  `arrivalMark`, **position only**.
- **`<ol>`/`<li>`, DOM order equal to visual order**, and the rank printed as a
  tabular `2ch` ordinal.
- **A memo boundary in the first commit.** AC 6, and Task 3.6.5's two boundaries
  are the precedent — 4.4 and 4.5 land on this same page.
- **Look at the page before running a suite.** `pnpm probe / --within "Sector
performance"` at all four widths, and take every tolerance from its output.
  Record the region's delta against 4.3.1's figures, because `Movers` sits
  directly below it in the same grid at every width.

## Constraints handed to this task

- **The label column is fixed at 144 px**, never `max-content`, or a re-order
  moves all eleven bars' origins.
- **The figure column is a fixed reserve**, tabular: `+0.9%` → `−12.34%` must not
  move the bar's right edge. `−12.34%` measures 53.7 px at 13 px dense plus a
  16 px glyph box; the drawing reserves 86 px, 66 at 390.
- **The zero anchor never moves**, and when the scale steps, all eleven bars
  rescale in **one** settle — the only permitted whole-list geometry change, and
  it must not touch the anchor, the label column or the figure column.
- **The mark's 8 px slot is reserved in every state including the empty one**,
  from the stylesheet rather than from a list — the defect `pnpm probe` caught in
  4.2.5 was one cell reserved instead of four, invisible at three widths of four.
- **`position: sticky` does nothing inside a `Panel`** — measured. A sticky scale
  legend or group heading will fail silently.
- **The region says nothing about the connection**, and
  `one-home-for-the-feed-words` covers this route. It may state an instant, an
  age, a basis, a session and a tape.
- **No live region**, and the reversal trigger recorded as a condition: _the
  first ranked surface on this screen whose order answers something the reader
  asked for._
- **The region's footer carries the benchmark claim and the bar's scale** —
  `Each row is the sector's benchmark ETF — S&P 500 constituents only · bars to
±2%` — and **must not** restate the change basis, the instant, the feed or the
  adjustment, all of which the source note or the chrome own. The scale clause
  renders only when the bar does (ADR 0029).

## Done when

1. Eleven sectors render ranked at 1440/1024/768/390, with the rank printed and
   the ticker on the row
2. The bar's scale is printed, steps outward only within a session, and is never
   normalised to the frame's maximum
3. Direction survives `grayscale(1)` — asserted by a produced photograph, not by
   reasoning
4. The region's height is identical across its states at each width, measured
5. `pnpm probe` figures and the delta recorded; `pnpm e2e` green, and
   `overview-proxy-live-update.spec.ts`'s four-cell assertion still passes
