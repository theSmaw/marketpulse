# Task 5.5.4 — The volume band draws

**Status:** Not started
**Story:** [5.5 The Volume Factor, & the Tape It Rests On](STORY.md)
**Depends on:** 5.5.3

## Objective

The story's visible deliverable: a volume figure beside the return and the
percentile.

## What the user can see when this lands

**`volume 4.1× typical for this time of day`** in `Abnormal-move indicators`,
with its baseline defined and its tape named — or, on every machine without IEX
depth, an honest refusal saying which kind.

## Work

- **A second BAND, not a third cell** (Gate 1 decision 3). Derived reserve:
  separator 12 + label 16 + 4 + figure 26 + 8 + terms 32 + 4 + tape 16 =
  **+118 px, region 142 → 260**, uniform at four widths. **Re-probe per width
  and record the measured figure** — `pnpm probe /securities/NVDA --within
"Abnormal-move indicators"` (the **full** region name; a prefix prints
  `⚠ no region named …`). §1.4's trigger fires a **third** time.
- **The nearest relative is `Band` in `AbnormalMove.tsx` itself**, generalised
  from _the return band_ to _a band_, with `HeldRoom` reserving both. Nothing new
  is needed.
- **Drawing a multiple, five channels, three colourless.** `×` is **U+00D7
  glued to the digits**, same size, weight and ink — never `x`, never
  superscript, never a smaller suffix; no other figure in this product ends in
  `×`. **No sign, ever** — `+4.1×` is a category error and an unsigned figure is
  the strongest single discriminator. **One decimal always** (`1.0×`, `10.0×`),
  tabular numerals. **The word `typical` immediately after**, as the comparand
  rather than a unit. **Untinted `--ink-primary`** — inherited, not decided:
  _Volume does not encode direction_ is already settled in
  `VISUAL-LANGUAGE.md`.
- **The shapes that break naive formatting.** Below 1: `0.3× typical`, identical
  treatment, **no reciprocal and no word** — "3.3× quieter" invents a second
  scale and a direction, and `quiet`/`heavy` collide with Story 5.6's band
  vocabulary, which is the collision AC 3 is about. Very large: a stated digit
  cap, `>999× typical` above it, **re-using the percentile's shipped `>` glyph**.
  Exactly 1: **`1.0× typical`** — never `—`, which is `unchanged` in
  `PriceChange` and would assert zero volume, AC 4's own lesson.
- **The baseline's three facts in one row**, `·`-separated, in the register
  `.sample` already set: `median of 60 sessions · same 5-minute bucket · today
excluded`. Measured: **1 line at 419/446 px of content, 2 at 318/308**, so a
  32 px reserve. Foldable: the median and the lookback, and the bucket width.
  **Not foldable**: the refusal sentences and the shortfall count.
- **The tape row is per band**, which is already how this region works —
  `five-minute-return.ts:280` ships `Measured on IEX · baseline on All US
exchanges` **today**, so two tape claims in one region is **structural rather
  than a contradiction**. The failure mode would be one region-level tape line,
  which this region does not have.
- **The serialiser trap, before the schema is written.** A refusal must not reach
  the wire as a figure: declare the properties
  `satisfies Record<keyof T, JsonSchemaProperty>` and assert an **injected
  body**, because `fast-json-stringify` turns a `null` under `"number"` into
  **`0`** — a plausible `0× typical`.

## Done when

1. The figure draws, and the region is **one height in every state at every
   width** — probed, screenshots **looked at**, and the measured number recorded
   rather than the +118 derivation.
2. Every refusal kind draws a sentence that does not read like another's.
3. A browser spec through a **furnished frame**, plus an **out-of-frame** claim:
   `baseline-cost`'s `iexRows` at `0`/`null` means no same-tape baseline exists,
   so a drawn IEX ratio is fabricated **by construction**. Proved red on a
   planted producer defect first.
4. §1.4's trigger recorded as fired, with the measured displacement.
5. `pnpm verify` green; scoped specs green.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
