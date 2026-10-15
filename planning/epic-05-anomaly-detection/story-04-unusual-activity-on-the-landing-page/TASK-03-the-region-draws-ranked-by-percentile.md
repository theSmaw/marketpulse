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

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
