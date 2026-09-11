# Task 2.12.2 — The chart on the design canvas, and the tokens it needs

**Status:** Not started
**Story:** [2.12 Price Chart](STORY.md)
**Depends on:** 2.12.1

## Objective

Decide what this chart **looks like** on the `Component library for MarketPulse`
design canvas, which has been the source of truth for the design language since
2026-09-11 ([ADR 0026](../../../docs/adr/0026-the-design-canvas-as-the-source-of-truth.md)),
and land whatever new tokens fall out of it — in the chain the ADR fixes:
**canvas → `VISUAL-LANGUAGE.md` → `tokens.css` → components**.

It is a separate task from 2.12.1 because the two are different kinds of
decision and the story's bar is explicit that the second is an acceptance
criterion rather than polish. 2.12.1 decides the mechanism. This decides the
**instrument**: what a reader sees, and whether a stranger believes it is a real
funded product.

It is before 2.12.4 rather than after it because a chart drawn first and styled
second is a chart wearing a renderer's defaults with our colours substituted,
which is test 2 of the four failed exactly.

## What the user can see when this lands

**Nothing in the application** — and something real in the canvas and the
workshop. If this task lands new tokens, they are visible in Storybook's token
surfaces and nowhere else. The chart itself is Task 2.12.4.

## Work

- **Take the chart's positions on the canvas**, reached with `DesignSync`. At
  minimum: the plot frame and whether it has a rule at all; gridline weight,
  ink and density; axis label idiom, which is very likely the existing
  micro-label — uppercase, letterspaced, 11px, grey — rather than a new one;
  the data face on every figure; the treatment of the current value; the
  crosshair and its readout; and the chart's own header block, which carries
  what Task 2.12.1's decision 5 left on it.

- **The up/down pair, taken once for the product.** `market.css` already holds
  `--price-positive` and `--price-negative` and the standing rule above them is
  that **colour is never the sole encoding** — measured, the two differ by
  1.04:1 in greyscale. A candle body or a directional line is the first mark in
  this product whose _shape_ can carry that difference, so decide here what the
  second channel is, and note that Task 2.12.5 implements it and Task 2.12.8
  proves it under a greyscale filter.

  If the canvas proposes a value that fails a measured accessibility floor, ADR
  0026's **one standing exception** applies: adopt the intent, not the value,
  and record the measurement beside the token. It has fired three times; a chart
  full of thin marks on a cool ground is a likely fourth.

- **The accent stays off the data.** `brand.css`'s crimson has four sanctioned
  positions in the chrome and a datum is not one of them. A crimson current-price
  line is a fifth position, which is a decision to escalate rather than a detail
  to slip in.

- **Reserve room for what arrives later**, which the story asks for by name and
  is far cheaper now than as three retrofits: Epic 5's anomaly markers on the
  plot, Epic 8's comparison series overlaid on the same axes, and Epic 9's
  filing markers on the time axis. Reserving room means saying where each one
  goes and what it displaces — not drawing them.

- **Land the tokens, in the chain and in order.** A new value enters
  `VISUAL-LANGUAGE.md` with its rationale, then `tokens.css` or `market.css`
  depending on whether it carries market meaning, then a component reads it.
  `styles/tokens.ts` throws at startup if a declared token is missing from the
  stylesheet, which is the mechanism that keeps this honest — and note that **no
  stylesheet is applied in the test environment**, so nothing below `pnpm e2e`
  can see any of this.

- **Write the four tests down against a picture**, so Task 2.12.10 is not the
  first time anybody applies them: would a stranger believe this is a real funded
  product; does it look designed rather than defaulted; is there a moment in it
  worth showing somebody; does it feel alive.

## Done when

- The chart's visual positions exist on the canvas and are recorded in
  `CHARTING.md`, including where the canvas and this repository disagreed
- The non-colour channel for direction is decided and named
- Any new token exists in `VISUAL-LANGUAGE.md`, in the stylesheet and in
  `styles/tokens.ts`'s declared set, in that order
- Where an accessibility floor overrode a canvas value, the measurement sits
  beside the token — ADR 0026's exception, applied in its stated shape
- What Epics 5, 8 and 9 will add has a stated place
- `pnpm verify` passes

## Notes

The fence is that **this task draws no chart in the application**. A token
without a consumer is fine and expected for one task; a component that appeared
in order to demonstrate a token is Task 2.12.4 arriving without its states, its
axis module or its measurement.

The other fence is the volume chart. It inherits this axis and this frame, and
deciding its bars here — before a price chart exists to place them under — is
the mistake the story sequence was arranged to avoid.
