# Task 5.4.3 — The region draws, ranked by percentile

**Status:** Not started
**Story:** [5.4 `Unusual activity` on the Landing Page](STORY.md)
**Depends on:** 5.4.2

## Objective

The landing page's **last reserved region** stops being a placeholder.

## What the user can see when this lands

**`/` draws a short ranked list of the securities whose recent five-minute move
sits furthest out in their own 60-session history** — each row with its rank,
its **ticker as the only link**, its company name and its **percentile
ordinal**. Every row opens a security page that already explains the figure,
because Stories 5.1 to 5.3 filled that screen first.

## Work

- **`RankedList`'s third use**, with `bar: "none"` and
  `quietGroup: "impossible"` — its set **is** the ranking's output, so the quiet
  group has zero members in every state there is and reserving its 25 px heading
  would cost a row. The component already ships AC 4 and AC 5 whole: the printed
  ordinal, symbol-keyed roving stops that **clamp rather than wrap**, the
  ticker-only anchor with its destination resolved at render, held pads as room,
  the FLIP on transform with `--motion-duration-settle` twice, and DOM order
  equal to visual order.
- **The row shape is MEASURED, not argued.** The region is in the narrow column:
  **~308 px of content at 1440, ~323 at 1024, ~686 at 768, ~308 at 390** — so it
  is the _narrowest_ region at the _widest_ viewport, and the width is
  **non-monotonic**. Every shipped `RankedList` use is ≥595 px, so this is new
  geometry. Restate the track list at **all four** widths, inherit none, and keep
  `.bar` in the hide list at every one — leaving it out grows an implicit `<li>`
  and makes every row 33 px instead of 26, invisible below `pnpm probe`.
- **The ordinal, not a band chip** (Gate 1 decision 1). It carries no `%`, spells
  the word `percentile`, and is untinted — the four channels that separate it
  from a price change. One home: `percentileReading`.
- **Held pads carry no `href`.** `visibility: hidden` plus `aria-hidden` do
  nothing whatever to an anchor, and `RankedList` has shipped that defect once
  already by passing `held={undefined}` as a hard-coded constant. The pads must
  also be **present in the array the FLIP is handed**, or every destination is
  read off the wrong row.
- **The arrival disc keeps its shipped meaning** and is not re-pointed at the
  figure. It fires when **a bar arrives for that security** and on nothing else.
  A percentile is the first figure in this product that can change with **no bar
  for its security at all** — its peers moved, or the window rolled — and a
  second meaning for one mark is this product's most-repeated defect.
- **Repair `ORDER HELD` while a re-taken pin moves every row**, routed rather
  than repaired by Story 4.7. This is the first region whose rows move with **no
  arrival mark anywhere on the page** to account for the movement, so the badge
  is the reader's only signal and it is currently wrong.
- The honest-nothing noun is the region's own and is **not** `No moves to rank
yet.` or `No prices yet.` — one noun per region is what tells a reader which
  region went quiet when two do at once.
- The reservation is **the real component, never a `min-height`**, and it is
  **two boxes**: the held geometry keeps its own unconditional
  `visibility: hidden` + `aria-hidden` and the sentence is a **sibling** in the
  room it holds, because `visibility` is inherited by children that never set it
  and the one-box version leaked internal slugs into the accessibility tree for
  ten days.

## Done when

1. The region draws rows on `/`, and `pnpm probe` at four widths shows **one
   height in every state** with the screenshots looked at.
2. A browser spec reaches a row by keyboard and by pointer, proves the **figure
   is not a link**, and proves arrows clamp.
3. A browser spec that is **not a pass-through**: the rank order is recomputed
   from the row's own factor values, and an **out-of-frame** claim grounds it
   (`GET /market-data` for whether this deployment has a provider at all).
   Proved green first on a planted producer defect — `percentile + 7`, or 5.3's
   `rank × 0.8 when n > 500`, which left a golden sample green.
4. `ORDER HELD` is correct across a re-taken pin, asserted.
5. `pnpm verify` and `pnpm e2e` green.

## Amended by Task 5.4.1 — 2026-10-15: the box is measured, so the row budget is no longer a guess

**The region is now `342 × 491` at 1440 and `357 × 491` at 1024** (`pnpm probe`,
2026-10-15), against `342 × 161` and `357 × 161` before. At 768 and 390 the
≤860 block is unchanged and the region is content-sized.

**Two figures to build against rather than re-derive:**

- **Content width ~308 px at 1440 and ~323 at 1024** — `342 − 2` border
  `− 32` padding. The brief's 308 figure was right, and the **non-monotonicity
  is real**: 1024 is _wider_ than 1440 for this region, and 768 (686 px) is the
  outlier with room. Design the row at **308** first.
- **The row budget is ~332 px** — 491 outer less the region's own **159 px** of
  chrome (border 2, header 47, body padding and `.content` margin 48, list
  heading 16, two-line footer 48). At the measured **27 px pitch**
  (`27N − 1`) that is **twelve rows maximum**, so a five-row list at **134 px**
  has ~198 px of slack. **The slack matters**: `Movers` had to reserve a
  _third_ footer line because its claim wraps at 390, and this region states
  more populations than `Movers` does, so a third line here is affordable
  where it was not before.

**AC 1's row count is therefore answerable, and it is a product choice within
12 rather than a constraint.** `PRODUCT_SPEC.md` §9's panel is a short list;
take the number deliberately and state it in the region's head slot the way
`Movers` states `Top 5 each way`.

**And the instrument now exists**: `pnpm probe / --viewports 1440x680,1440x700`
replaces the hard-coded viewport table rather than filtering it, and prints
`clientHeight` against `scrollHeight` per element when they differ. Use it —
it is what found a shipped region scrolling its own placeholder sentence.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
