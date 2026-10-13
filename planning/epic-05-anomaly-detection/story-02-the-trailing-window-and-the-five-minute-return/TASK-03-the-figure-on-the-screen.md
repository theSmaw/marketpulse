# Task 5.2.3 — The Figure on the Screen

**Status:** Not started
**Story:** [5.2 The Trailing Window, & the 5-Minute Return](STORY.md)
**Depends on:** 5.2.2

## Objective

**`Abnormal-move indicators` stops being a hatched panel.** This is the first
figure Epic 5 puts in the region the epic is named for, and the second of the
three reserved rail regions to fill.

## What the user can see when this lands

**On `/securities/:symbol`, the region draws a 5-minute return** — the figure,
the two instants it was measured between, and how much of the window was
observed.

## Work

- **A fifth market-stream frame type, scoped to ONE symbol** — the owner's Gate
  1 decision, taken on a measured ratio: a field on every observation costs
  **+54,525 B per frame** at 516 subscribed (**+82%**, measured as 66,327 B
  against a real article of 58,187–59,475 B), which at **6.8–16.1 batches a
  minute** is **+371–878 KiB a minute per attached browser** for one figure
  about one security. The symbol-scoped frame is **221 B**. A factor of **247**.
  - **`MARKET_STREAM_MESSAGE_TYPES` is commented _"The four message types,
    closed"_**, so this is a deliberate re-opening with a version decision, not
    an addition. Record what the version becomes and why.
  - **The subscription semantics are the part to get right**: a browser
    subscribes to ~516 symbols on this route (its own, plus every row of the
    table below). The frame is about **the security the page is about**, which
    is not a concept the gateway currently has. Decide it and write it down.
  - **ADR 0038's reversal trigger** — _the first overview region whose cadence
    must differ from the applied-batch cadence_ — is crossed **sideways** by
    this. Evaluate it in writing.
- **The band, in three lines**, in the column Story 5.1 set the idiom for:
  - a micro label, `5-MINUTE RETURN`, **spelled rather than composed** (a
    `composes:` does not give the composing rule the last word, and this
    product shipped `2026-09-11 · CLOSING PRICES` for a day because of it);
  - the figure through `PriceChange` — glyph, sign and tint, the glyph
    `aria-hidden`, because colour is never the sole encoding;
  - the qualifier: `14:01 EDT → 14:06 EDT · observed 3 of 5 minutes`.
- **Oldest endpoint first, and both printed.** AC 4 requires the older; the
  span is the entire defence against the 47-minute figure, and one instant
  leaves the reader doing arithmetic the product already did.
- **Both instants are bars' own `startsAt` and neither gets
  `OBSERVATION_INTERVAL_MS` added.** `describeMeasuredReach` adds it because it
  claims _reach_; adding it here prints a **six**-minute span for a five-minute
  return and contradicts AC 3's own definition. Spell them with
  `formatBarInstant`, the one home.
- **It dates the observation, never the computation** (AC 5). `computedAt`,
  `sentAt` and `Date.now()` appear nowhere in this band. This product drew
  `COMPUTED · Oct 9 · 21:42 EDT` under four-week-old closes and repaired it.
- **One grammar for k, with no special case at five** — `observed 5 of 5
minutes`, never _all five_. A second grammar at the complete end is two
  sentences for one fact and destroys the scan between two securities.
- **No dash in the figure slot, ever.** `—` is `unchanged` in `PriceChange`, so
  a dash there asserts a zero return. A refusal is a **stated word**.
- **It says nothing about the feed** (AC 6): no threshold, no connection word,
  no second staleness sentence. `a-second-staleness-sentence` and
  `one-home-for-the-strip-staleness-sentence` hold it — and **their corpus must
  see this new module**, because Story 4.6 found the first version of a check
  like this green on the file Epic 5 writes.
- **Invariant 6: the region says which tape it is.** Every bar in the window is
  `iex`, and the chart a few centimetres away says `All US exchanges`. One
  short source line for the region, the way `/` has one for the screen — never
  a second copy of the chart's.
- **Delete the `filledBy` placeholder sentence** rather than amending it — the
  fourth time on this screen, after Price, Volume and `Relative performance`.
- **Reserve this story's own band properly and NOT one pixel for the score.**
  5.3, 5.5 and 5.6 add figures to this region. Reserving for an unbuilt score is
  a guess 5.6 both re-measures **and** steps, paying twice — and an empty
  reserved band is the picture Story 4.7 routed as a defect, where _a gateway
  that is behind_ and _this is next year's_ are one picture. **The accepted cost
  is one step per story that adds a band**, recorded as a probed figure per
  width so 5.3/5.5/5.6 amend a measurement rather than inherit a guess.

## Done when

1. The region draws the return, both endpoint instants and `observed k of 5`,
   from a frame **this product's own server produced**.
2. The frame is symbol-scoped and **221 B or thereabouts, measured**, with the
   wire version decision and the subscription semantics written down.
3. ADR 0038's reversal trigger is evaluated in writing.
4. No `computedAt`, `sentAt` or `Date.now()` anywhere in the band; both instants
   are bars' own `startsAt` with no interval added.
5. The region names its tape, and no second connection word or staleness
   sentence appears — the existing invariants' corpora see the new module.
6. The `filledBy` placeholder is **deleted**.
7. `pnpm verify` green; `pnpm probe /securities/NVDA --all` run and the
   screenshots looked at, with the region's height recorded per width.

---

## What was done — 2026-10-13

<!-- written at completion -->
