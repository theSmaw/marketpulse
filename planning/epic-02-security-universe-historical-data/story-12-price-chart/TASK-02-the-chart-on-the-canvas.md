# Task 2.12.2 — The chart on the design canvas, and the tokens it needs

**Status:** Complete — 2026-09-11
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

---

## Amended 2026-09-11 by Task 2.12.1 — what you are designing, and the list you are being asked for

[`CHARTING.md`](CHARTING.md) settled the mechanism. Three of its answers change
what this task is designing:

- **It is a line of closes on a session-ordinal axis, hand-drawn in SVG.** Not a
  candlestick chart, and not a library's chart with our colours on it. Every
  pixel is a decision this task gets to take, which is the upside of §1 and also
  the whole of its cost — **there are no defaults to fall back on.**
- **The Work section's phrase _"a candle body or a directional line"_ is now just
  the directional line.** There is no per-bar body to fill or hollow, so the
  non-colour channel for direction attaches to the **window's** change — the
  current-value reading and the headline — rather than to 1,950 marks. See
  [Task 2.12.5](TASK-05-what-a-session-did-and-direction-without-colour.md)'s
  amendment, which is where it is implemented.
- **A high–low band is now a live design question**, because the line throws away
  `high` and `low` and §5 keeps them as stated facts on the grounds that the plot
  rounds them. Whether the band exists is 2.12.5's to decide; **what it looks
  like if it does is this task's**, and it is cheaper to take a position on it
  here than to retrofit one.

**The eleven questions this task is being asked for are enumerated in
[`CHARTING.md`](CHARTING.md) §7**, with what exists today beside them. That
section is this task's input; it deliberately answers none of them. Two carry
measurements already taken:

- The up/down pair is **1.096:1** by luminance ratio — hue is the entire
  difference. (`CLAUDE.md` records 1.04:1 by a greyscale-conversion method; same
  substance.) Both inks clear **5:1** against both surfaces, so the floor is not
  the issue.
- `--rule-hairline` is **1.27:1** against `--surface-raised`, which is right for a
  table rule and is an open question behind data.

One thing this task no longer has to reserve room for in the way the Work section
implies: **Epic 6's topology does not inherit this chart.** `PRODUCT_SPEC.md` §27
commits it to Sigma.js/WebGL and `CHARTING.md`'s preamble says so. Epics 5, 8
and 9 still do.

---

## What was done — 2026-09-11

**Nothing was drawn in the application, and the fence held.** There is no chart
component, no axis module and no scale; `BarSeriesPanel` still states its facts
and draws nothing, and `e2e/specs/security-series.spec.ts` still asserts that.
Task 2.12.4 is still the first chart in MarketPulse.

What exists now:

- **`Price chart.dc.html`**, a third file in the `Component library for
MarketPulse` project — the canvas is the source of truth for the language
  (ADR 0026) and this is where the chart's positions were taken. Nine numbered
  sections, and the specimens in it are **drawn** rather than described: a
  1,950-point synthetic series at the measured 1,019 px region width, the same
  chart at 480 px and 342 px, the crosshair, the partial state, and the
  greyscale pair.
- **`VISUAL-LANGUAGE.md` gained a _The chart_ section.** It had no chart
  vocabulary at all before today.
- **Eighteen tokens**, in the chain and in order: `tokens.css` for the ink and
  the geometry, `market.css` for the three washes, and every one of them in
  `styles/tokens.ts`'s declared set, so a token removed from a stylesheet is a
  startup throw naming itself rather than a mark that silently does not appear.
- **One Storybook surface**, `Foundations/Chart tokens`, with five stories. It
  reads its values back through `getTokens()` rather than restating them, so it
  is a live reading of the stylesheet rather than a second copy of it.
- **`CHARTING.md` §7.1**, answering that section's eleven questions with an
  index rather than a re-argument, plus the three places the canvas and this
  repository each knew something the other did not.
- **ADR 0026 carries a dated amendment**: the canvas is three files, not two.

### The two things drawing it changed

Both were found by rendering, not by reasoning, and both would have shipped as
defects.

1. **Value labels cannot sit inside the plot.** They were drawn there first —
   the argument was that a left-hand gutter of numbers is the shape of every
   default chart ever rendered, and that the 342 px region cannot spare 56 px.
   At the 1,019 px region the topmost label sat **on top of the series**. The
   repair is a gutter on the **right**, which keeps the current value, the last
   point of the line and the value scale in one place.
2. **The high–low envelope is invisible at `1m`.** §2's amendment left the
   extent band as a live question for Task 2.12.5. Drawn at the default window,
   a bar's high and low sit within a few hundredths of a percent of its close, so
   the envelope is a hairline around the line. That is now written down before
   2.12.5 starts rather than discovered inside it.

### The measurement that decided the largest question

`--price-positive-wash` against `--price-negative-wash`, under `grayscale(1)`:
**1.009:1**. The inks they are drawn from differ by 1.096:1; washed back to a
fill they are, for practical purposes, the same colour. So the plot carries
direction as **geometry** — the side of a dashed rule at the window's opening
close that the line finishes on — and the tint says the same thing again in
colour and says nothing the geometry has not already said. Cover it and the chart
still reads.

**ADR 0026's exception did not fire.** A decorative fill has no contrast floor to
fail, so nothing was overridden; the measurement forced an ordering rather than a
different value. The exception has still fired three times and not four.

### `pnpm verify`

Passes. Note what that does **not** mean here, which is nearly everything: no
stylesheet is applied in the test environment, so `getTokens()` throws there and
colour assertions are structurally impossible. Every value in this task was
checked in a browser by a person looking at it, and that is the only level that
can.

---

## For the stakeholders — what this actually was, in plain terms

**Nothing new appeared in MarketPulse today, and that was the plan.**

Here is the situation this task was built to avoid. The next task but one draws
the product's first chart — the thing a demo audience looks at longest, and the
screen the whole five-minute demonstration runs through. The fastest way to get
a chart on screen is to draw one and then try to make it look right afterwards.
That reliably produces a chart that looks like every other chart: a box with
some lines in it, wearing whatever a drawing library thought was sensible, with
our colours substituted. It is the single easiest way for this product to look
like a scaffold rather than a funded piece of software.

So the decision was taken first, deliberately, and separately.

**What was actually decided.** Everything about how a MarketPulse chart looks: a
single dark rule along the bottom instead of a box around the whole thing; where
the price scale sits and why it sits on the right; how faint the horizontal
guide lines are; what a night between two trading days looks like on a chart
that otherwise hides it; how thick the price line is; what happens when we only
have part of the data we asked for; and what the chart does when you point at a
particular minute.

**And one thing that matters more than any of it.** Roughly one man in twelve
cannot reliably tell red from green. Our product's single most important signal
is whether a price went up or down. We measured our green and our red converted
to grey and they are — this is not an approximation — **the same shade**. So the
chart does not rely on colour to say which way a price went. It draws a faint
dotted line at the price the window opened at, and the price line finishes above
it or below it. That works for everybody, in every light, on every screen, and
in a black-and-white printout. The colour is still there, doing a second job on
top, and if you deleted it the chart would lose nothing it needs.

**Why this unlocks progress.** Three later pieces of the product all hang off
this chart: the markers that will flag unusual activity (Epic 5), the ability to
lay two companies' prices over each other (Epic 8), and the markers showing when
a company filed something with the regulator (Epic 9). Each of those needs
somewhere to go. Deciding that now cost three paragraphs; discovering it later
would have cost three redesigns of a chart already on screen. Every one of them
now has a stated place, and one of them — the comparison view — has a stated
**cost** written down too, because the coloured shading cannot survive more than
one company on the same chart and somebody would otherwise find that out the
hard way.

**Where it lives.** In the shared design canvas, which since yesterday is the
official source of truth for how this product looks — so a designer and the code
cannot drift apart again. You can see the decisions as finished pictures rather
than as a description of pictures.

**What is still not possible.** You cannot see a chart in MarketPulse. That is
Task 2.12.4, and it is next but one. You also still cannot change the time
window or see trading volume — Story 2.13.

**Two things were caught by drawing rather than by thinking**, which is the
argument for doing it this way rather than writing a specification. The price
labels were originally going to sit inside the chart; drawn at full size, the
top one landed on top of the price line. And a feature we were considering — a
shaded band showing each minute's high and low — turns out to be invisible at
minute-by-minute detail, because a share price barely moves inside sixty
seconds. It becomes worth having when we add longer time windows. Both of those
are now decisions on the record instead of surprises waiting inside the next
three tasks.
