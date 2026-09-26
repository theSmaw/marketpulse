# Task 4.2.2 — The strip drawn: four figures side by side, and what 390 does with them

**Status:** Not started
**Story:** [4.2 The Aggregate Seam, & the Index Proxies That Move](STORY.md)
**Depends on:** nothing — runs beside 4.2.1

## Objective

**Four figures side by side is a component this product does not have**, and
the story says so. The nearest relatives are two, not one, and the story names
only the further of them:

- **`SecurityIdentity`'s close block** is closest on the _treatment_ of a price
  — label, figure, qualifier as three lines that move together, the arrival
  disc, `PriceChange` on the baseline. It is designed for **one** number with
  room around it and does not stretch.
- **`MetricStrip`** is closest on the _arrangement_ — a `<dl>`, figure over
  label, a `--metric-columns` override, and an existing measured four-across
  precedent. Its own header settles the seam: it refuses to carry direction on
  purpose, and _"the day a strip needs to say a figure has risen, the component
  for that already exists — `PriceChange`."_

So the grid is solved and the direction is solved. **What is unsolved is
everything between them**, and 390 is the part that is a judgement rather than
an arithmetic.

## What the user can see when this lands

**Nothing on the running product.** A drawing exists that the next three tasks
build against. Task 4.2.5 is the payoff.

## Work

- **A new canvas file**, `Market summary — the four index proxies.dc.html`,
  in six sections: 1440 with its tracks stated; the anatomy of one cell with
  every reserved slot marked; 1024 / 768 / 390 each **restating its tracks**;
  every state including the one with no figures at all; the arrival mark's
  third geometry drawn beside the two shipped ones; and the shared qualifier
  line checked against the universe table's heading claim and the source note.
- **An amendment to `Market overview.dc.html`** §01 and §04, drawing the strip
  **filled** where it is currently drawn deferred — and carrying the region's
  new name (see the constraint below). An amendment rather than a second file,
  because ADR 0026's rule is that a design which does not fit the main canvas
  gets its own file, and this one fits the screen it sits on.

## Constraints this task is handed, each with its source

- **390 is two by two.** Measured, not argued: `pnpm probe /` on 2026-09-26 puts
  the region's content box at **342 px** at 390, so four across is 85 px a
  column and a formatted price plus a signed percentage does not fit at any size
  this language uses. The canvas already decided 2×2 in `Market overview.dc.html`
  §04. A horizontal scroller hides two of four facts behind a gesture on the one
  screen whose job is a picture of the whole market — and this product has met
  that defect once already, in a masthead that read `Market O` with no
  affordance saying so.
- **`repeat(2, minmax(0, 1fr))` explicitly, never `auto-fit`.** `MetricStrip`'s
  own comment carries the reason: `auto-fit` answers a shortage of width by
  dropping a column, and three prices with an orphaned fourth is worse at every
  width than four narrow ones. `minmax(0, 1fr)` is also what stops all four
  cells resizing when one figure crosses from `999.99` to `1000.00`.
- **The type scale is `--font-size-metric` (20px), not `--font-size-display`.**
  `VISUAL-LANGUAGE.md` spends the display size **once per screen**; four of them
  spends it four times and makes the topology's reserved band — §9's stated
  centre of gravity — read as a footnote. `type.module.css` already names
  `.dataMetric` for exactly this job.
- **The qualifier goes once, under the strip, not once per proxy.** Four copies
  of `14:01 EDT · pre-market · change from 2026-09-11's close` is a paragraph,
  and at 390 it is four. This is the shared-claim idiom the universe table
  already uses for sessions, with a per-proxy exception line for the one that
  disagrees.
- **The arrival disc needs a third geometry.** Both shipped positions are
  absolute into a margin that already exists (`right: calc(100% + …)`), and a
  four-across grid of left-aligned columns has no such margin at 1440 and
  certainly none at 390. Draw it **in the label row, immediately after the
  symbol, in a statically reserved slot** — which also reads better, because a
  disc beside `SPY` says _a bar arrived for SPY_, which is what the mark means.
  The motion layer's header licenses this: _"What is here is appearance and
  behaviour; POSITION is the consumer's."_
- **No stagger, and four fire at once.** A stagger encodes an order the data
  does not have. Read `The mark multiplied by five hundred.dc.html` before
  drawing this — it is this product's existing answer to many marks at once.
- **No new tokens.** Every value this needs already ships;
  `--font-size-metric`, `--font-size-micro`, `--font-size-dense`,
  `--letter-spacing-micro`, `.dataMetric`, `.microLabel`, `.arrivalMark`,
  `--motion-duration-decay`, the price palette and the space ladder. Two things
  that must **not** become tokens, both with precedent: the column expression
  (a proportion has no token ladder) and the strip's min-column floor (a height
  token would be _"a measurement of one viewport declared as a constant"_).
- **The region is renamed `Market proxies`** — decided at Gate 1, because that
  is already the product's word for these four in the `/securities` group
  heading and on the security page's classification line. Draw the new name.
- **Colour is never the sole encoding**, and `PriceChange` already owns the
  pairing. The strip must not spell a sign or a glyph itself.

## Done when

1. The new canvas file exists with all six sections, and 390 restates its tracks
2. Every state is drawn, including the one with four proxies and no figures
3. The disc's third geometry is drawn beside the two shipped ones, with the
   argument for moving it
4. `Market overview.dc.html` shows the strip filled and named `Market proxies`
5. No value on the drawing requires a token that does not exist
