# Task 4.3.1 — The grid's height, and the reserved panel that lied

**Status:** **Complete — 2026-09-27. The grid grows instead of the panel scrolling, and every box on the page is unchanged to the pixel — but `19vh` was 10 px out and Task 4.1.4's reserved-equals-filled rule is RETIRED by the owner rather than honoured.**
**Story:** [4.3 Sector Performance, & the Benchmark That Is Not an Average](STORY.md)
**Depends on:** nothing

## Objective

**Eleven rows do not fit, and the panel that is supposed to be holding room for
them is the wrong size in both directions at once.** Two measured facts, pointing
opposite ways:

**At 1440 and 1024 the region is too short.** `.regions` declares
`height: 82vh` with `grid-template-rows: 0.7fr 1.15fr 1.15fr`, so `.areaSectors`
resolves to **265 px whatever is in it**. Minus the border, the 51 px header and
2 × 16 px of body padding, the list gets **180 px** — **16.4 px a row** for
eleven rows, below this product's own dense leading of 13/18. And `Region`
passes `scrollable` unconditionally, so `Panel` is `overflow: auto`: **the
default behaviour is a silent scroller that hides the weakest sector.** That
fails the story's own payoff sentence, is the `Market O` defect class this
product shipped once, and adds a scrolling tab stop inside `.regions` that
Story 4.6's focus work would then have to answer for.

**At 390 the reserved panel is too short, and a rule was written against
exactly that.** `Market overview.dc.html` §03 records Task 4.1.4's decision —
_"`Sector performance` is a tall hatched panel today and eleven ranked rows in
three weeks, and **nothing on the screen moves when it fills**."_ It is **121 px
at 390**. So the page **will** re-compose when this story lands, breaking that
rule in the story it was written for.

**`Movers` has the identical 265 px box** and needs ten rows plus two group
headings, so this is one decision for the interim primary column rather than a
sector quirk.

## What the user can see when this lands

**The landing page's lower grid stops being a fixed height.** Nothing is added
and nothing is removed; the six regions below the strip size to their content
instead of to a proportion. On today's screen — six reserved panels — the
visible change is small and the page should look substantially as it does now,
which is the thing to verify rather than assume.

## Work

- **`min-height: 82vh` with `grid-template-rows: 19vh auto auto`**, taken by the
  owner at Gate 1. Row 1 keeps a **resolved** box because Epic 6's WebGL canvas
  needs one; rows 2 and 3 size to content. `19vh` is `0.7/3.0 × 82vh ≈ 172 px`
  against the 161 px the topology row measures today — confirm that rather than
  trusting the arithmetic.
- **Raise the reserved height of `Sector performance` and `Movers`** so the
  filled region is the height the reserved one already was, at every width.
  Task 4.1.4's rule is that nothing moves when a region fills; this task is
  where that is either honoured or consciously retired.
- **Restate the spans at every breakpoint.** The measured trap: a `span N` item
  wider than the explicit grid is **not clamped** — it grows implicit columns,
  and a `span 3` region in a two-track grid produced `134px 134px 676px`, a
  visibly broken page at every width under 1184 px, with `pnpm verify` and all
  54 browser tests green.
- **Record the deltas.** `pnpm probe /` at 1440/1024/768/390 before and after,
  and the delta per width, the way Task 4.2.5 recorded `+80/+80/+80/+148` —
  because every region below moves by it.
- **A dated amendment to `Market overview.dc.html`** §01, §03 and §04: the real
  filled heights, and the correction to §03's "tall hatched panel" claim. The
  canvas is the source of truth and it currently records a height the tree does
  not have.

## Done when

1. `.regions` is `min-height` with row 1 resolved, and the topology row's box is
   unchanged to the pixel
2. Eleven rows of the product's dense leading fit the sector region with air, at
   1440 and 1024, measured
3. No region on `/` scrolls at any of the four widths in its **reserved** state,
   and `Panel`'s `scrollable` behaviour is either still correct or deliberately
   changed with the reason recorded
4. The reserved height equals the filled height at every width, or Task 4.1.4's
   rule is explicitly retired with its replacement stated
5. `pnpm probe` deltas recorded per width; `pnpm e2e` green, including
   `landing-route.spec.ts`

---

## What was done — 2026-09-27

**One file, `apps/frontend/src/routes/MarketOverview.module.css`. No TSX, no
component, no test, no check.**

```css
grid-template-rows:
  calc((82vh - 2 * var(--space-24)) * 7 / 30)
  repeat(2, minmax(min-content, 1fr));
…
min-height: 82vh;          /* was height: 82vh */
```

and in `@media (width <= 860px)`, `height: auto` → `min-height: auto`. That
restatement is load-bearing rather than tidiness: with the base rule declaring a
**minimum**, leaving `height: auto` there leaves `min-height: 82vh` in force on
the one-column layout — invisible at a tall viewport, because the column is
already taller than that, and **82 vh of dead space under six panels on a short
one**. The areas and `grid-template-rows: none` were already restated in that
block and were not touched.

### Two corrections to the Gate 1 decision, both measured

**1. `19vh` is 10 px out, and it would have moved the topology row — the one box
done-when 1 says must not move.** The `fr` rows never divided `82vh`; they
divided `82vh` minus **two gaps**. At a 900 px viewport that is
`(738 − 48) × 0.7/3 = 161`, which is what the row measures. `19vh` is **172**.
So the row is written as the old arithmetic expressed as a length —
`calc((82vh - 2 * var(--space-24)) * 7 / 30)` — exact at 900 px and at **every**
viewport height rather than only at the one it was derived from, with the gap
read from the token so the two cannot drift. Topology row before and after:
**1026×161, 595×161, 720×121, 342×139** — unchanged to the pixel.

**2. `auto auto` for rows 2 and 3 is the wrong shape; `minmax(min-content, 1fr)`
is right.** Both were measured rather than argued:

| rows 2–3                   | reserved today, 1440                                                                                                                    | eleven rows in sectors, 1440                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `auto auto`                | sectors **274**, movers **256** — the leftover space lands on top of each row's own content height, so §9's equal rows stop being equal | sectors 396, movers shrinks to **134**, grid stays 738 |
| `minmax(min-content, 1fr)` | sectors **265**, movers **265** — identical to before                                                                                   | sectors **383**, movers **383**, grid 975              |

**`min-content` is load-bearing and bare `1fr` will not do.** `1fr` is
`minmax(auto, 1fr)`, and **the automatic minimum size of a scroll container is
zero** — so `1fr` alone sizes the track to its share and hands the overflow back
to `Panel`'s `overflow: auto`, which is the original defect restored. Caveat for
the record: block-axis `min-content` track sizing over an `overflow: auto` item
is measured in **Chromium only**, the one browser this repository tests.

### Done when 1 — the probe deltas are 0 / 0 / 0 / 0

`diff` of the whole `pnpm probe /` output, before against after, at
1440/1024/768/390: **WHOLE PROBE IDENTICAL.** Every box, every resolved track,
every position, and no page error either side.

| width | topology | sectors  | movers   | unusual | breadth | investigations | `.regions` | `main`    |
| ----- | -------- | -------- | -------- | ------- | ------- | -------------- | ---------- | --------- |
| 1440  | 1026×161 | 1026×265 | 1026×265 | 342×161 | 342×265 | 342×265        | 1392×738   | 1440×1203 |
| 1024  | 595×161  | 595×265  | 595×265  | 357×161 | 357×265 | 357×265        | 976×738    | 1024×1203 |
| 768   | 720×121  | 720×103  | 720×103  | 720×103 | 720×103 | 720×103        | 720×756    | 768×1241  |
| 390   | 342×139  | 342×121  | 342×121  | 342×139 | 342×139 | 342×121        | 342×900    | 390×1543  |

Resolved **columns** unchanged too — `1026 342` / `595 357` / `720` / `342` —
which is the `span N` trap answered by measurement rather than by reading the
stylesheet.

### Done when 2 — eleven rows fit, measured with a throwaway

Eleven `<li>` at 13 px/18 px with `padding-block: var(--space-4)` (**26 px a
row**) were rendered into the sectors region, probed, recorded, and deleted. The
sector panel's **intrinsic height is 383 px** and it does **not** scroll at any
width. At 1440 and 1024 the track gave it 383 with the room coming from the grid
growing rather than from any region shrinking.

**180 → 298 px of body. 16.4 → 27.1 px a row.** Before this change the same
content had 180 px and would have scrolled silently.

### Done when 3 — no reserved region scrolls, at any width

A second throwaway compared `clientHeight` against `scrollHeight` on each panel
at four viewports, then was deleted. Verbatim, the two ends:

```
=== 1440x900
  Market proxies           client 181  scroll 181  fits  (auto)
  Market topology          client 159  scroll 159  fits  (auto)
  Sector performance       client 263  scroll 263  fits  (auto)
  Movers                   client 263  scroll 263  fits  (auto)
  Unusual activity         client 159  scroll 159  fits  (auto)
  Market breadth           client 263  scroll 263  fits  (auto)
  Current investigations   client 263  scroll 263  fits  (auto)
=== 390x780
  Market proxies           client 267  scroll 267  fits  (auto)
  Market topology          client 137  scroll 137  fits  (auto)
  Sector performance       client 119  scroll 119  fits  (auto)
  Movers                   client 119  scroll 119  fits  (auto)
  Unusual activity         client 137  scroll 137  fits  (auto)
  Market breadth           client 137  scroll 137  fits  (auto)
  Current investigations   client 119  scroll 119  fits  (auto)
```

**`Panel`'s `scrollable` is unchanged, and that is deliberate.** Task 1.13.4's
argument is that a box which _might_ scroll needs a tab stop, and that is still
true of the fixed row 1 at a short viewport. What changed is that scrolling is
now a **backstop** rather than the default behaviour of a region that does not
fit. Whether it should become conditional is **Story 4.6's**, which owns the
focus order on this screen — asked and deferred there rather than decided here.

### Done when 4 — the rule is NOT honoured. It is retired, by the owner

**Task 4.1.4's rule — _nothing on the screen moves when `Sector performance`
fills_ — is broken as shipped**, and the movement is measured rather than
predicted:

| width | sectors       | movers          | `.regions`     | `main`          |
| ----- | ------------- | --------------- | -------------- | --------------- |
| 1440  | 265 → **383** | 265 → **383**   | 738 → **975**  | 1203 → **1440** |
| 1024  | 265 → **383** | 265 → **383**   | 738 → **975**  | 1203 → **1440** |
| 768   | 103 → **383** | 103 (unchanged) | 756 → **1036** | 1241 → **1521** |
| 390   | 121 → **383** | 121 (unchanged) | 900 → **1162** | 1543 → **1805** |

Honouring it means a **383 px reserved floor on both panels now**, which puts a
**975 px grid of six panels, five of them hatched**, on today's landing page for
the three tasks before the list exists — and pins 4.3.3's row design to a
placeholder's 26 px row, a number typed to take a measurement. **The owner chose
retirement**, with the replacement stated:

> **A reserved region's floor is set by the change that DRAWS its content, and
> that change measures and reports the movement before it merges.**

**What makes that safe here rather than a licence**: at every one of the four
widths, everything that moves when this region fills is **another reserved panel
or the source note** — no figure and no sentence a reader is reading changes
position.

**And half the rule is honoured for free, by the grid rather than by a floor.**
Because rows 2 and 3 share one `fr` ratio, filling sectors raises the **`Movers`**
reserved panel to exactly 383 as well — so at 1440 and 1024, **Story 4.5 filling
`Movers` moves nothing at all**, paid for by nobody.

### The canvas amendment — written by the orchestrator, 2026-09-27

`Market overview.dc.html` §03 gained a dated `AMENDED 2026-09-27 BY TASK 4.3.1`
callout beside Task 4.1.4's own, because a claim on the source of truth cannot be
left standing while the tree contradicts it. It records three things: that
**§03's "tall hatched panel" was false when it was written** — the region is
265 px at 1440 and 1024, 103 at 768 and **121 at 390**, _shorter than four of its
six siblings_, where 121 px is a header plus a wrapped sentence rather than a
held band, so the region was holding **the size of its sentence**, which is the
thing that callout forbids; the retirement and its replacement; and a six-row
table of what the canvas recorded against what the tree now has, with the
`19vh`, `auto auto` and `min-content` arguments each in one line.

### Gates

- **`pnpm verify` — exit 0, twice** (once on `auto auto` while measuring, once on
  the shipped value). `36 invariants hold.` `479 documents, 1661 cross-file
links, 39 anchor links, 0 broken.` Tests: shared 345, backend 973, frontend
  1225, process 41. **No `Unhandled Errors` block in either run** — the only
  stderr is the pre-existing PostCSS `from`-option warning and the Rolldown
  chunk-size note.
- **`pnpm e2e` — exit 0, `170 passed (3.1m)`, 15 skipped**, the same 15 as before
  the change. `✓ 2 landing-route.spec.ts:102 › the landing route serves the
chrome and PRODUCT_SPEC §8.1's seven regions (1.4s)`.
- `pnpm probe /` at four widths before and after, plus two further runs for the
  filled and the scroll measurements.
- **No check added, so no break is owed** — and a guard is not writable yet. A
  browser assertion that row 1 is resolved while rows 2–3 grow passes
  _identically_ against the old `fr` + `height` until there is content in row 2.
  The assertion that would go red on a revert exists only once the sector list
  does, and it has been written into **Task 4.3.5's** file as an amendment rather
  than left in this record.

## For a stakeholder — a status report, 2026-09-27

The landing page's lower grid was a **fixed height divided into three
proportions**, which meant the panel reserved for sector performance was 265 px
tall whatever went into it. Eleven sector rows need 383. The panel would not have
looked broken — it would have **scrolled, silently, hiding the worst-performing
sector**, which is a screen that reads correct and is short by one row.

The grid now has a **minimum** height rather than a fixed one: the topology's
band keeps a resolved box, because Epic 6's WebGL canvas needs one, and the two
rows below it grow to fit their contents. **Nothing on the screen moved** —
verified by diffing the whole layout probe at four widths, which came back
byte-identical — and eleven rows now get 27 px each instead of 16.

Two things were found rather than built. The height for the topology's row agreed
at Gate 1 was **10 px wrong**, because the arithmetic behind it forgot the two
gaps between the rows; it is now derived from the gap token so the two cannot
drift apart again. And a rule written three weeks ago — _nothing on the screen
moves when this region fills_ — **cannot be honoured without putting a
975-pixel grid of mostly-empty panels on the live landing page for the next three
tasks**. The owner retired it, with a replacement that puts the obligation on the
change that draws the content rather than on the one that reserves the room, and
with the mitigation that everything which moves is another empty panel rather
than a figure or a sentence somebody is reading.

**One thing was got for free**: because the two rows share a ratio, filling the
sector region also raises the `Movers` panel to its final height — so the story
that fills `Movers` will move nothing at all.
