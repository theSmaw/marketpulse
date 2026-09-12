# Task 2.13.2 — The window control and the volume plot on the design canvas

**Status:** Not started
**Story:** [2.13 Volume Chart & Time-Window Selection](STORY.md)
**Depends on:** 2.13.1

## Objective

Decide what the **window control** and the **volume plot** look like on the
`Component library for MarketPulse` design canvas — the source of truth for the
design language since 2026-09-11 ([ADR 0026](../../../docs/adr/0026-the-design-canvas-as-the-source-of-truth.md))
— and land whatever tokens fall out of it, in the chain the ADR fixes: **canvas →
`VISUAL-LANGUAGE.md` → `tokens.css` → components**.

Separate from 2.13.1 for the reason 2.12.2 was separate from 2.12.1: the first
decides what the product offers, this decides the **instrument**. And before
2.13.4 and 2.13.6 rather than after them, because a control drawn first and
styled second is a row of default buttons with our colours on it, which is test 2
of the four failed exactly.

This task owns the story's two stated design surfaces, and they are not the same
kind of problem:

- **The window control** is a small, high-traffic component that Epic 8 reuses and
  Epic 11 drives. It is the first control in this product that changes what the
  data _says_.
- **The price/volume pair** is the product's first composed visualisation, and the
  story is explicit that its **proportion must be decided rather than defaulted**:
  volume is a supporting series and must not compete with price for attention.

## What the user can see when this lands

**Nothing in the application** — and something real in the canvas and the
workshop. New tokens show up on Storybook's token surfaces, including
`Foundations/Chart tokens`, which `CHARTING.md` §17.4 kept deliberately as the
place a chart mark is reviewed as a **language** before it is drawn anywhere.

## Work

- **Take the window control's positions on the canvas**, reached with
  `DesignSync`. At minimum: whether it is a segmented control, a row of buttons or
  something else; the selected state's encoding — and note the standing rule that
  **colour is never the sole encoding of anything**, so selection needs weight,
  shape or a mark as well as ink; the label idiom, which is very likely the
  existing letterspaced micro-label rather than a new one; where the control sits
  relative to the Price region's header; and what it looks like when a window
  **cannot be offered** (2.13.1's decision 6).

- **Decide the proportion of the pair.** Price and volume share an x-axis exactly
  and the grid already places the Volume region directly beneath Price at the same
  width — `SecurityExplorer.tsx`'s comment calls that the one adjacency in §8.3
  that is not a preference. What is open is the **height ratio** and what the
  volume plot keeps of the price plot's chrome: its own value scale or none,
  gridlines or none, its own time labels or the price chart's. A supporting series
  that repeats every mark of the primary one competes with it.

- **The volume bars themselves, and they are the first marks on this axis that are
  per bar.** Read `CHARTING.md` §1 and §2 before drawing anything: one element per
  bar at the cap is **9,790 plot elements and main-thread tasks of 137–254 ms**,
  and a candle body at the default window is **0.47 px** wide. So the visual
  question and the rendering question are the same question here. Decide what a
  volume column looks like **at both ends of the density range** — 0.47 px and
  ~7 px — and note that §10.3's density flag and its pair of tokens already exist
  and are not a media query (§11.1).

- **The bars are fills, and that has bitten this chart once already.** §14.5: a
  fill is opaque where every earlier mark was a stroke, which is how the uncovered
  ground painted over the axis rule, and §17.5 item 4 names the volume bars as the
  next fills this axis will carry. Decide the bars' ink **against the ground and
  against the uncovered ground**, not against white.

- **Direction, if the bars carry it.** `market.css`'s `--price-positive` and
  `--price-negative` differ by **1.009:1 under `grayscale(1)`** — hue is the
  entire difference — and a volume bar coloured by the bar's own direction is a
  mark whose meaning vanishes under a greyscale filter unless a second channel
  carries it. Decide whether volume encodes direction at all. "No" is a strong
  answer: volume is a magnitude, the price line above it already says which way
  the window went, and 2.12.5's wash was revised **on a screenshot** after four
  greyscale simulations passed against a chart that was wrong.

- **What happens between one window and the next** — the story names this as where
  test 4, _does it feel alive_, is most obviously answerable, and it has now been
  answered "not yet" twice, deferred by name to Epic 3's motion vocabulary. An
  instant swap of one dataset for another is the version that feels dead. What you
  **inherit whole** is stale-while-loading (`FRONTEND-STATE.md` §2's amendment): a
  held answer for the same request paints in the first commit, marked by a rail
  above the body — a dashed marker, a sentence, a travelling dashed hairline — and
  **no number is touched**; the settle wash plays only if a figure actually moved.
  This task's job is to decide what, if anything, the **chart** adds to that, and
  to say plainly if the answer is nothing.

- **Reserve room for what arrives later**, which is cheaper now than as three
  retrofits: Epic 5's volume baseline — the flagship demo's _"Volume 3.8×
  normal"_ line is drawn **on this plot** — Epic 8's comparison series, and Epic
  9's filing markers on the shared time axis. Reserving room means saying where
  each goes and what it displaces, not drawing it. Note §10.2 measured the
  anomaly-marker lane at **2.3 px of headroom** at the compact height, so this is
  a real constraint rather than a courtesy.

- **Land the tokens in the chain and in order.** A value enters
  `VISUAL-LANGUAGE.md` with its rationale, then `tokens.css` or `market.css`
  depending on whether it carries market meaning, then a component reads it.
  `styles/tokens.ts` throws at startup if a declared token is missing from the
  stylesheet, which is the mechanism that keeps this honest — and **no stylesheet
  is applied in the test environment**, so nothing below `pnpm e2e` can see any of
  it. Where a canvas value fails a measured accessibility floor, ADR 0026's **one
  standing exception** applies: adopt the intent, not the value, and record the
  measurement beside the token. It has fired three times.

- **Write the four tests down against a picture**, so 2.13.10 is not the first
  time anybody applies them.

## Done when

- The window control's and the volume plot's positions exist on the canvas and are
  recorded in `VOLUME-AND-WINDOW.md`, including where the canvas and this
  repository disagreed
- The pair's proportion is a decided number with a reason, not a default
- The volume mark is specified at **both** ends of the density range, and its ink
  is measured against the plot ground and the uncovered ground
- Whether volume encodes direction is decided, and if it does, the non-colour
  channel is named
- What the window transition adds beyond the inherited stale rail is decided —
  including "nothing", with a reason
- Epic 5's baseline, Epic 8's series and Epic 9's markers each have a stated place
- Any new token exists in `VISUAL-LANGUAGE.md`, in the stylesheet and in
  `styles/tokens.ts`'s declared set, in that order
- `pnpm verify` and `pnpm stories` pass

## Notes

The fence is that **this task draws no volume and no control in the application**.
A token with no consumer is fine and expected for one task; a component that
appeared in order to demonstrate a token is 2.13.4 arriving without its axis
module, its states or its measurement.

The second fence is the **readout**. The shared reading is 2.13.5's, and its
reserved height is the property §15.4 found wrong at every viewport but 1440 — a
reading wraps where the invitation does not. What this task may decide is how a
two-series reading is **laid out**; what it may not do is reintroduce a
`min-height` token as the reservation.
