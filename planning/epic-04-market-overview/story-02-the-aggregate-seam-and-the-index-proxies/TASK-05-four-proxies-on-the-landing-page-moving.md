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
