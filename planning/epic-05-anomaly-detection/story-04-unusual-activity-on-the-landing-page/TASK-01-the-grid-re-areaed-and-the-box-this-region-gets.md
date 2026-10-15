# Task 5.4.1 — The grid re-areaed, and the box this region gets

**Status:** **In progress — 2026-10-15**
**Story:** [5.4 `Unusual activity` on the Landing Page](STORY.md)
**Depends on:** nothing

## Objective

**The region cannot draw one row and its own footer where it sits, and that is
arithmetic rather than a judgement.** Measured 2026-10-15: the region's own
chrome is **exactly 159 px** against a 1440×900 box of **159**, so zero rows fit
at every viewport height and five rows would need a **~1950 px viewport**. Every
later task in this story draws into a box that does not exist until this one
runs.

Gate 1 decision 3: **re-area** rather than floor row 1.

## What the user can see when this lands

**`Market topology` spans the full width of the screen**, and the lower half of
`/` moves down once. Nothing gains a figure. The region is still the hatched
placeholder — it is simply now a box that could hold one.

## Work

- `grid-template-areas` becomes `"topology topology" / "sectors unusual" /
"movers breadth"` at ≥861. Restate the spans at **every** breakpoint — a
  `span N` wider than the explicit grid grows implicit columns rather than
  clamping, which is a visibly broken page that `pnpm verify` cannot see.
- Leave the `≤860` one-column order alone: it is `breadth, sectors, movers,
topology, unusual, investigations` and after this story it is still "content
  before hatch".
- **Add a height flag to `pnpm probe`.** `scripts/probe.mjs` hard-codes a
  four-entry `VIEWPORTS` table and `--widths` only filters it, so AC 1's
  "deliberate runs at 1440×700 and 1440×680" is **unperformable** today. The
  flag is the instrument the rest of this story measures with.
- Measure before and after at **1440/1024/768/390** and at **1440×680, ×700 and
  ×900**: every region's box, `clientHeight` against `scrollHeight`, the
  resolved `grid-template-rows`, `document.scrollHeight`, and the `y` of every
  region below row 1. **Look at the screenshots** — a box figure cannot show a
  clipped glyph.
- Re-key `overview-degraded-grid.spec.ts`. It is a **kept** spec of 13 states ×
  4 widths × 7 surfaces that fails in **both** directions, so a re-area changes
  every key.
- Record **`MARKET-OVERVIEW.md` §1.4's trigger firing** — a figure a reader is
  reading moves — with the before/after figures beside it. Its precedent is
  Story 5.1 (+74 / +136, accepted by the owner).
- **Hand to Epic 6 in words that epic can act on**: row 1 is now a
  **1392 × 161** resolved box rather than 1026 × 161 — wider, not taller. Write
  it into Epic 6's own `EPIC.md`, never a link back.
- Re-check the **≥861 column-major tab order**. `breadth` moves from row 2 to
  row 3, so the six region tab stops run across the grid differently;
  `expectEveryRegionIsATabStop` and `overview-region-order.spec.ts` are the
  gates.

## Done when

1. `pnpm probe / --widths 1440,1024,768,390` and the three height runs are taken
   **before and after**, with both sets of screenshots looked at, and the figures
   recorded verbatim in this file.
2. No region's `scrollHeight` exceeds its `clientHeight` at any measured pair —
   including 1440×680, which is where this story's founding measurement came
   from.
3. `pnpm probe` accepts a height and the flag is documented where the other
   flags are.
4. `pnpm verify` and `pnpm e2e` are green, the re-keyed degraded grid included.
5. §1.4's trigger is recorded as fired, with the measured displacement.
6. Epic 6's `EPIC.md` states the box it now gets.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-10-15

### The template this task was given was wrong, and that is the first finding

**Gate 1 decision 3 and the implementation brief both named FIVE areas for a
SIX-region grid**, omitting `Current investigations`. They also mis-stated the
template being replaced: the real one was
`"topology unusual" / "sectors breadth" / "movers investigations"` — `breadth`
was row 2 column 2 and `movers`' partner was `investigations`, not `breadth`.

That omission is not a typo with a harmless failure mode. **A `grid-area`
naming an undeclared area is not an error** — it is auto-placed into an
_implicit_ row and renders plausibly, which is the same class of defect as the
measured `span N` trap this stylesheet's own comment exists to refuse: a
visibly wrong page that `pnpm verify`, every unit test and every component test
report as green, because **nothing below `pnpm e2e` can see a layout**.

The shipped template has **four** rows:

```
"topology topology"
"sectors unusual"
"movers breadth"
"investigations investigations"
```

The fourth is **`auto`, not a third member of `repeat(2, …)`** — a fourth `1fr`
would hand a hatched placeholder the same 491 px as eleven drawn sectors.
`auto` takes free space only when no `fr` track takes it first, and two do.

### The before/after table — seven viewport pairs, `pnpm probe`

| 1440×900                | before               | after                                |
| ----------------------- | -------------------- | ------------------------------------ |
| `document.scrollHeight` | 1722                 | **1849** (+127)                      |
| resolved rows           | `161 491 491`        | **`161 491 491 103`**                |
| Market topology         | 1026 × 161 @24,372   | **1392 × 161 @24,372**               |
| Sector performance      | 1026 × 491 @24,557   | 1026 × 491 @24,557 — **0 px**        |
| Unusual activity        | 342 × 161 @1074,372  | **342 × 491 @1074,557**              |
| Movers                  | 1026 × 491 @24,1072  | 1026 × 491 @24,1072 — **0 px**       |
| Market breadth          | 342 × 491 @1074,557  | 342 × 491 @1074,1072 — **+515 down** |
| Current investigations  | 342 × 491 @1074,1072 | **1392 × 103 @24,1587**              |

| 1024×900                    | before    | after             |
| --------------------------- | --------- | ----------------- |
| `document.scrollHeight`     | 1722      | **1849** (+127)   |
| Market topology             | 595 × 161 | **976 × 161**     |
| Unusual activity            | 357 × 161 | **357 × 491**     |
| Sector performance / Movers | 595 × 491 | unmoved, **0 px** |

| 1440×680                | before                                           | after                   |
| ----------------------- | ------------------------------------------------ | ----------------------- |
| resolved rows           | `119 491 491`                                    | `119 491 491 103`       |
| Unusual activity        | **342 × 119, `scrollHeight 121` — ⚠ scrolls +4** | **342 × 491 — no flag** |
| `document.scrollHeight` | 1680                                             | 1807 (+127)             |

| 1440×700 | `rows 123 491 491` → `123 491 491 103`; `Unusual activity` 342 × 123 → **342 × 491**; document 1684 → 1811 |
| 768×800 | **every box identical, document 2477 → 2477, 0 px** |
| 390×780 | document 2716 → **2734 (+18)**; topology 139 → **157**; see below |

### Nothing scrolls anywhere, and 1440×680 was worse than the story knew

**No region's `scrollHeight` exceeds its `clientHeight` at any of the seven
pairs.** The founding measurement — `Unusual activity` 117/121 at 1440×680 — is
gone.

And the story under-stated it. At 1440×680 the region was `342 × 119` with
`scrollHeight 121`, which means **the shipped placeholder's own sentence was
overflowing a region whose scroller has no visible edge** — not a hatch 4 px too
tall, a sentence. It is visible in the before screenshot: the third line sits
hard on the box edge with no breathing room, against `Market topology` beside it
which has padding below. It was found by a probe figure that **did not exist
until this task added it**.

One `⚠` survives and is **pre-existing**: `wordmarks` in the masthead reads
`27/28 (+1)` at 1440/1024/768 and `16/18 (+2)` at 390, identically before and
after. It is the `MARKET SITUATIONAL AWARENESS` lockup and is unrelated to this
grid.

### The instrument, which is half of this task

`pnpm probe` gained **`--viewports 1440x680,1440x700`**, which **replaces** the
hard-coded four-entry table rather than filtering it — `--widths` is unchanged
and passing both is **refused rather than resolved**. Screenshots are now named
`1440x680.png`, because two heights at one width previously overwrote each
other. Three figures were added that this measurement turned on: the resolved
`grid-template-rows` per grid, `document.documentElement.scrollHeight`, and
**`clientHeight` against `scrollHeight` per element, printed only when they
differ**. The third is what found the defect above.

### A prediction that was right about the mechanism and wrong about the total

Before the measurement I predicted **no page growth at 1440 and 1024**, reasoning
that rows 2 and 3 share one `fr` ratio already resolving to 491 px, so
`Unusual activity`'s height was pre-paid by its neighbours.

**The mechanism held exactly** — `Sector performance` and `Movers` moved
**0 px in position and size**, and the region got its 491 px for nothing. **The
conclusion was wrong by +127 px**, and the reason is the omitted region: moving
`Current investigations` to a full-width fourth row _adds a row_. So the growth
is not the filled region's at all. Recorded because this document's §1.4 already
carries three figures that moved rather than being mis-recorded (383 → 433 →
461), and the instructive part is the gap between an estimate and a measurement.

### The gates, and the one that went red

**`pnpm verify` was RED first, on exactly the right check:**

```
✗ every-break-can-still-land
  the-region-grid-is-capped-again: its `find` matches 0 times in
  apps/frontend/src/routes/MarketOverview.module.css, not once
1 of 59 invariants failed.
```

The break's `find` was `    repeat(2, minmax(min-content, 1fr));` and the fourth
row moved the semicolon onto its own line. This is the check added on 2026-09-21
after four breaks rotted silently, doing the job it was written for on the first
change that could rot one. Repointed to the two-line form → `59 invariants
hold.` → **`pnpm verify` exit 0**, with the `Unhandled Errors` block checked
rather than inferred from the exit code.

- `pnpm e2e overview-region-order.spec.ts` — **2 passed (1.8 s)**
- `pnpm e2e overview-degraded-grid.spec.ts` — **4 passed (1.3 m)**
- `pnpm e2e` full — **257 passed, 16 skipped, 0 failed (4.9 m)**; the 16 skips
  are pre-existing `security-price-chart.spec.ts` conditionals, not a `-t` miss
- Load average read **before** each heavy run and never during: `5.67 4.42 3.91`,
  then `3.28 3.84 3.82`, then `7.69 6.00 4.79` (the `verify` run was its own
  plant), then `5.16 5.70 4.81`

**The brief's claim that the degraded grid's keys would change is FALSE.**
`overview-degraded-grid.spec.ts` keys on the **text** of seven surfaces, and
geometry is not in the key — none of the three reserved regions is a surface. It
passed with **no expectation changed in either direction**, and no spec anywhere
needed updating.

**The repointed break, proved red by hand.** `pnpm break` **refuses a dirty
target** and this task may not stash or commit, so the substitution was applied
by hand with a checksum either side: `pnpm e2e overview-sector-region.spec.ts
--anyway` gave **red for the right reason** — three assertion failures with three
other tests in the same file still passing, which is the only red that proves a
check works:

```
Error: expect(received).toBeGreaterThan(expected)
Expected: > 265
Received:   201
```

Restored, `shasum` identical (`0668d28e…`). The CSS-module hot-reload trap did
not bite: this is a declaration change rather than a `composes:` one.
**`pnpm break the-region-grid-is-capped-again` is still owed once this is
committed.**

### The 390 movement is the sentence, not the grid

`MarketOverview.tsx`'s topology placeholder said it takes **"this column"** when
it arrives, which the re-area makes false on screen; it now says "the full width
of this screen". That is one extra wrapped line at the only width narrow enough
to wrap it — topology 139 → 157 px — and it is the **entire** +18 px at 390. The
≤860 block is byte-for-byte unchanged and **768 proves it at 0 px**.

### What is owed

- **`pnpm break the-region-grid-is-capped-again`**, after the commit.
- `MarketOverview.tsx`'s grid comment says "the stylesheet's **three**
  `grid-template-areas` blocks" and there are two. Wrong before this change too;
  left alone deliberately.

## For a stakeholder — a status report, 2026-10-15

**`Market topology` now spans the full width of the landing page, and the region
below it is four times taller than it was.** Nothing gained a figure: the region
Story 5.4 exists to fill is still a hatched placeholder. What changed is that it
is now a box something could be drawn into.

**It could not hold one row before.** The region's own furniture — its border,
header, padding and the two-line footer it is required to carry — comes to
**159 px**, and the slot it sat in was **161 px** at an ordinary 1440×900
window. So no row fitted at any window height, and five rows would have needed a
window about **1,950 px** tall. The story had diagnosed this as a problem at
short windows; it was a problem at every window, and the short-window case was
worse than recorded — at 1440×680 the placeholder's **own sentence** was
overflowing a box with no visible scrollbar. The measurement that found it did
not exist until this task added it to `pnpm probe`.

**Two regions holding real figures did not move by one pixel** — the eleven
ranked sectors and the ten movers, in position _and_ size, at every width. The
page did grow by **127 px** at the two widest widths, and the honest account is
that this is not the new region's cost: it is the cost of a sixth region my own
instruction had left out of the plan, which had to go somewhere and went to a
new full-width row at the foot. The developer flagged that rather than quietly
filling the hole, which is why it is written down here rather than discovered
later.

**One check failed first, and it was the right one.** A guard added three weeks
ago to catch _guards that have quietly stopped working_ fired on the first change
capable of breaking one — the grid rule it protects had been reformatted by this
edit. It was repointed and then **deliberately broken by hand to prove it still
goes red**, because a check that has never failed has never been tested.

Everything then passed: the full verification suite, and all **257** browser
tests.
