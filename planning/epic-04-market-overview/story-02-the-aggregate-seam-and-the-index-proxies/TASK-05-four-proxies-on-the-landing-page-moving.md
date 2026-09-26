# Task 4.2.5 — Four proxies on the landing page, moving

**Status:** Not started
**Story:** [4.2 The Aggregate Seam, & the Index Proxies That Move](STORY.md)
**Depends on:** 4.2.2, 4.2.4

## Objective

**The payoff.** Four tasks have put a join behind a frame; this one puts the
figures on the screen. `SPY`, `QQQ`, `DIA` and `IWM` with their last price,
their change from the previous session's close in both sign and glyph, and the
arrival mark this product already uses.

**And the region is renamed.** `Market proxies` is already the product's word
for exactly these four — the `/securities` group heading, and `Market proxy` on
the security page's classification line. `Market summary` is a second word for
a shipped concept, and on a screen where three later regions summarise all 518
it promises the broadest view while delivering the narrowest.

## What the user can see when this lands

**Four index proxies at the top of the landing page, moving.** A price that
updates without a refresh, a change measured from the previous session's close
carrying its direction in sign and glyph as well as hue, and a disc that appears
beside a proxy when **a bar arrives** and decays over 900 ms.

**What they still cannot do:** read sectors (4.3), breadth (4.4) or the movers
(4.5), or click a proxy to open it (4.6). And the honest states — a proxy
nobody has heard from, a store with nothing in it — are 4.2.6, which is the
next task.

## Work

- **`MarketSummaryStrip`** under `src/components/`, built to 4.2.2's drawing.
  It owes stories under the `pnpm stories` rule and genuinely has states worth
  seeing side by side. What it owns: the dividers, the reserved slots, the
  arrival positioning and the shared qualifier line.
- **It composes rather than reinvents.** `MetricStrip` with a `--metric-columns`
  override for the grid; `PriceChange` inside `Metric.value` for the direction.
  **The strip must not spell a sign or a glyph itself** — `PriceChange` keeps
  that pairing inside itself _"so that 'colour is never the sole encoding' has a
  component behind it instead of a convention every author has to remember"_,
  and this must not become the fourth spelling.
- **The order is `SPY, QQQ, DIA, IWM`** — §6's order, `INDEX_PROXIES`'
  declaration order, and the order already on screen in the reserved region's
  own sentence. The **set** is derived from the universe (`kind === "index_etf"`),
  never a hard-coded four-symbol array in a component; the **order** is served
  by the seam and the browser renders what it is given and never sorts.
- **The rename, swept in this task** rather than deferred: `MarketOverview.tsx`,
  `e2e/specs/landing-route.spec.ts`'s region list, `PRODUCT_SPEC.md` §9's
  2026-09-25 amendment (which enumerates the seven names), `EPIC.md`. The
  canvas is 4.2.2's. The CSS grid area name is internal and may stay.
- **The `reserved` state must become unreachable.** `Region` keys it on
  `children === undefined`, so it cannot linger by accident — but the
  `awaiting="Story 4.2"` string goes in the same change.
- **Nothing on this region announces the connection.** `one-home-for-the-feed-words`
  already covers this route; the region may state a figure's **instant**, its
  **age**, its **basis** and its **tape**, and may not state `LIVE` / `STALE` /
  `DISCONNECTED`, whether the market is open, or any per-security verdict.
- **No live region**, and the reversal trigger recorded as a condition: the
  first surface on this screen where a change is the answer to something the
  user asked for. `FRONTEND-STATE.md` §7's four reasons hold _a fortiori_ here —
  four subjects nobody asked for, on the most unprompted screen in the product.
- **The arrival mark: four, simultaneous, no stagger.** A stagger encodes an
  order the data does not have and turns one event into four. Under
  `prefers-reduced-motion` the token is `0ms` and the animation does not run —
  which makes the per-proxy instant the **only** surviving evidence that a bar
  arrived on a minute where the price did not change. That is a behavioural
  requirement on the layout, not a nicety.
- **Measure, then assert.** `pnpm probe /` before any suite, at 1440/1024/768/390,
  and take the tolerance from its output. Nothing below `pnpm e2e` can see a
  layout, and `.summary` sits **outside** `.regions` so it does not inherit the
  grid's per-breakpoint span restatement.

## Done when

1. Four proxies render in `SPY, QQQ, DIA, IWM` order with price, change and the
   shipped arrival mark, and the figure changes when a bar arrives with no reload
2. The mark fires for the proxy the frame carried and not for the other three,
   and does not fire on a snapshot
3. The region is named `Market proxies` everywhere, including `PRODUCT_SPEC.md`
   §9's amendment and the landing-route spec
4. The strip's height is identical across its states at each width, measured
5. Nothing in the region spells a connection or session word, and
   `one-home-for-the-feed-words` is green
6. `pnpm probe` output is recorded in the task, and the 390 arrangement is the
   one the canvas drew

## Amended by Task 4.2.2 — 2026-09-26: ten constraints off the drawing, in words this task can act on

1. **Track lists are stated at every width and inherited at none:**
   `repeat(4, minmax(0, 1fr))` at 1440, 1024 and 768; `repeat(2, minmax(0, 1fr))`
   at 390. **Never `auto-fit`.** The threshold rule is a content box of
   **508 px** (`4 × 112 + 60`), so a future width answers itself rather than
   being re-argued.
2. **Reserve the mark's 8 px slot statically, in the flow, in the label row
   after the symbol.** `composes: arrivalMark from
"../../styles/motion.module.css"` and declare **position only** — never
   re-declare the disc, its ink, its `opacity: 0` base or the 900 ms decay.
   That base is what stops reduced motion leaving four permanent dots at the
   top of the landing page: a zero-duration animation applies no keyframes at
   all. Both shipped geometries are absolute into a right-hand slack that
   already existed (a measured 26 px gutter; a right-aligned cell); a
   four-across grid of left-aligned columns has neither, which is why this one
   is in the flow.
3. **The acceptance on the mark is `0` layout shift at 1440, 1024, 768 and
   390**, measured in a browser — `The motion vocabulary.dc.html` §10's own
   words, _measured in the browser, never drawn_. Not inferred from a green
   unit run.
4. **Re-take the strip's height at all four widths with `pnpm probe /` and
   record the DELTA, not the absolute.** The reserved region is 103/103/103/121;
   the drawing intends ~158/~158/~158/~236. `.regions` is a flex column
   immediately below, so the delta is what every region on the page moves by.
5. **At 390 the change steps to `--font-size-micro` and the figure does not
   step at all.** The binding case is a four-digit price: render `1234.56` in
   all four cells at 390 and read the boxes — 138 of 149 px. If `PriceChange`
   has no size seam, adding one is a small change and not a new token.
6. **This is a new component, not `MetricStrip` with props.** Borrow the
   arrangement and the type (`.dataMetric`, `.microLabel`), not the element.
7. **The strip names no feed, no venue and no connection word, in any state.**
   It states an instant and a change basis, both true of either tape — which is
   the only AC 5 answer available without a second venue word on a screen that
   already has one.
8. **The exception line occupies row 3 — the index name's slot.** No new row,
   no growth, no re-flow of the other three cells.
9. **Nothing in the no-figures state may assert a window.** Its sentence is
   distinct from both of the security page's empty answers; four named
   securities have no window to change.
10. **`tabular-nums` on the figure.** A proportional digit changing its advance
    width on every tick is the same defect as a layout shift, one glyph at a
    time.

**And one correction to this story's own arithmetic:** the 390 figure quoted
during decomposition (85 px a column) ignored the border, the padding and the
gaps. It is **64.5 px**, which cannot render one of the four figures, let alone
four. Two by two gives 149 px.
