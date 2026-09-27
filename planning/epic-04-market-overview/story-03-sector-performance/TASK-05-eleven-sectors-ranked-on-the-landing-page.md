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

## Amended by Task 4.3.1 — 2026-09-27: you inherit the only assertion that can guard the grid, and you are the change that must measure the movement

**1. The grid's shape is guarded by nothing until you land, and the guard is
yours to write.** Task 4.3.1 changed `.regions` from `height: 82vh` with three
`fr` rows to `min-height: 82vh` with a resolved row 1 and
`repeat(2, minmax(min-content, 1fr))`. It added **no check**, deliberately and
correctly: a browser assertion that row 1 is resolved while rows 2–3 grow passes
**identically against the reverted stylesheet** while row 2 is empty, because
with no content the two shapes resolve to the same 161 / 265 / 265. **The
assertion that goes red on a revert exists only once the sector list does.** So
write it here: a browser assertion that the sector region's rendered height
**exceeds the 265 px the old fixed grid would have given it**, and that its
`scrollHeight` equals its `clientHeight` — the second is the real defect, which is
a region that reads correct and is **short by one row**. Take the numbers from
`pnpm probe` rather than from this file. A check owes a break.

**2. You are the change that draws the content, so you own the movement report.**
Task 4.1.4's rule — _nothing on the screen moves when `Sector performance`
fills_ — was **retired by the owner on 2026-09-27** rather than honoured, and its
replacement puts the obligation on you in as many words:

> A reserved region's floor is set by the change that DRAWS its content, and that
> change measures and reports the movement before it merges.

So `pnpm probe /` at 1440/1024/768/390 before and after, and the delta per width
in your record. **The movement is already predicted, from a throwaway that
rendered eleven rows at 13/18 leading** — re-measure it rather than citing it:

| width | sectors       | movers          | `.regions`     | `main`          |
| ----- | ------------- | --------------- | -------------- | --------------- |
| 1440  | 265 → **383** | 265 → **383**   | 738 → **975**  | 1203 → **1440** |
| 1024  | 265 → **383** | 265 → **383**   | 738 → **975**  | 1203 → **1440** |
| 768   | 103 → **383** | 103 (unchanged) | 756 → **1036** | 1241 → **1521** |
| 390   | 121 → **383** | 121 (unchanged) | 900 → **1162** | 1543 → **1805** |

**Everything in those columns that moves is another reserved panel or the source
note** — that is what made the retirement safe, and it is the claim your probe
either confirms or breaks. If a figure or a sentence a reader is reading moves,
the retirement was wrong and it comes back to the owner.

**3. Filling this region also fixes `Movers`, for free.** Rows 2 and 3 share one
`fr` ratio, so raising sectors to 383 raises the `Movers` reserved panel to 383
too. **State that in your record**: Story 4.5 filling `Movers` then moves nothing
at all at 1440 and 1024, and that is a debt this task discharges for a story that
has not started.

**4. The row height that produces 383 is 26 px, and it is a placeholder.** It came
from an instrument: eleven `<li>` at 13 px/18 px with
`padding-block: var(--space-4)`. **Task 4.3.3's row design is authoritative**, and
if the real row is not 26 px then every figure above moves and the reserved
floor — which nobody set, by decision — was never pinned to it. That is the whole
reason the floor was not written in 4.3.1.
