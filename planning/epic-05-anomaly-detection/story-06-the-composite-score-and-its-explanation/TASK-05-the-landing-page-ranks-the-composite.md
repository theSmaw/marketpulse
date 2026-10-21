# Task 5.6.5 — The landing page ranks the composite

**Status:** Not started
**Story:** [5.6 The Composite Score, & Its Explanation](STORY.md)
**Depends on:** 5.6.4

## Objective

**So the two surfaces finally agree about what is ranked.** `/`'s `Unusual
activity` ranks by the price percentile today and draws an ordinal with no band
chip — because Story 5.4's Gate 1 refused a chip that would have read `extreme`
on one factor of four. With a real composite that refusal expires.

## What the user can see when this lands

```
 1  NVDA   NVIDIA Corp        91  ┃extreme ┃
 2  AMD    Advanced Micro…    84  ┃  high  ┃
```

The row's figure column becomes the **score**, and the chip is its second
channel. **The score is shorter than the ordinal it replaces**, which is what
pays for most of the chip.

## Work

- **The chip replaces the ordinal track rather than joining it.** Measured:
  the row resolves to `15 68 125 64` at 1440 and `15 68 140 64` at 1024 in a
  308/323 px box — rank, ticker, name, ordinal. `AnomalyBadge`'s `min-width:
6rem` is **96 px, 31% of the row**, so a fifth track leaves the name about six
  characters, which is the arithmetic that already moved the word `percentile`
  off this row. Score (`91`, two glyphs, tabular, ~28 px) + chip (~72 px) costs
  the name ~36 px instead of ~80.
- **`AnomalyBadge` is ADOPTED with a `compact` modifier** (AC 8's disposition):
  drop `min-width`, narrow the padding, **keep everything load-bearing** — the
  four fills, `--ink-primary` on every step (12.65 / 8.87 / 5.59 measured against
  the three ambers), the `normal` outline variant with its `calc()`, and above
  all **the written word inside the fill**. Never an abbreviation, never a dot,
  never `H`/`E`: the ramp's greyscale steps are 1.12 / 1.43 / 1.59, enough to see
  a change and nowhere near enough to name one.
  - **If the type shrinks, re-measure those three contrasts.** Micro is already
    the smallest ink in the product and 1.4.3's large-text exemption does not
    reach it.
  - **The chip column is a FIXED width probed at the widest band word**, centred —
    not `max-content`. A column sized to the longest word _in today's frame_
    makes the layout move when the data moves, on a region that already re-orders
    under live data and needed `ORDER HELD` for it. And measure it in the
    **cold-load face**: `RankedList.module.css` records a 44.20 / 50.73 px
    discrepancy, so a chip sized from the shipped face **clips on a cold load**.
- **`SecurityRow`'s disposition, recorded rather than cleaned up:** **deleted**,
  with the reason — the popover shape was refused on §11's own grounds. That
  leaves `Popover` with **no live consumer**, which is itself a disposition owed:
  name it as a deferral for Epic 7's dense surfaces, not an accident.
- **The cohort rule, which is AC 3 arriving at a ranked surface.** Two scores are
  comparable iff computed over the **same factor set** — with unequal weights even
  a count-based cohort mixes scales. **Rank within the largest non-empty cohort,
  state which, and count the others.** Ranking only full-factor scores empties
  the region permanently on CI and for months on the deployment; ranking across
  cohorts is refused by AC 3 in terms, because it systematically promotes the
  worst-covered securities — what `UNIVERSE.md` rule 4 spent ~19 curation slots
  preventing.
  - **A result worth knowing: while `{price}` is the live cohort, ranking by the
    composite is order-identical to ranking by the percentile**, because the score
    is a monotone function of one unit value. So this changes the drawn figure and
    the label now, and the order later.
  - **`eligible`/`scored` change meaning and the nesting sentence must still
    close.** Today `!figure.measured → continue` **drops** the row; under a
    composite a refused price factor is an **absent factor**, not a dropped row.
- **Do not add a fourth population sentence.** The footer reserves **four micro
  lines** and the lead clause plus the age line already fill them at 308 px — the
  width this region draws at, at the **widest** viewport this product supports.
  The cut sentence absorbs the arity; the volume factor's population belongs in
  the per-security explanation.
- **The independent recompute moves, and is rewritten rather than re-imported.**
  `overview-unusual-ranking.spec.ts` writes `compareByPercentile` out by hand
  deliberately so it cannot agree with the renderer by construction. Rewrite it
  for the composite; **never import the new comparator**.
- **This is the commit that makes amber reachable on `/`** — `Unusual.tsx`
  currently records that _"no amber appears in this region, so that collision
  stays Story 5.6's and is unreachable from `/`."_ That sentence becomes false
  here and is a live claim to amend. Task 5.6.6 photographs it.
- **Epic 14's `/` frontend clause does NOT fire** — ten rows, not 516 elements —
  and the fourth consecutive non-firing is evidence the wording works. Say so in
  writing.

## Done when

1. The row draws the score and a compact chip that keeps the written name; probed
   at four widths in the cold-load face.
2. The region is one height, ten rows, and the 11-row ceiling is not breached.
3. The cohort rule is implemented and stated on screen; the nesting sentence closes.
4. `SecurityRow` deleted with its disposition recorded; `Popover`'s orphaned seam named.
5. The recompute is rewritten by hand and its break goes red.
6. `pnpm verify`, `pnpm e2e` green at two workers.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
