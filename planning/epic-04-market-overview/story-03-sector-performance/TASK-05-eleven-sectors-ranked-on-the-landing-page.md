# Task 4.3.5 — Eleven sectors, ranked, on the landing page

**Status:** **Complete — 2026-09-27. Eleven sectors are ranked on `/`. The region is 461 px measured (not the drawn 433), `Movers` AND `Market breadth` rose to the same height FOR FREE, nothing a reader is reading moved, and a 390-only defect that `pnpm verify` could not see was caught by the probe: a subgrid cannot grow past the range it adopts, so the dropped bar landed in an implicit second row of every `<li>`.**
**Story:** [4.3 Sector Performance, & the Benchmark That Is Not an Average](STORY.md)
**Depends on:** 4.3.1, 4.3.2, 4.3.4

## Objective

**The payoff, and the first thing on this screen that tells a reader something
they could not have got from a security page:** which sectors are leading and
which are lagging, at a glance.

## What the user can see when this lands

**Eleven sectors, ranked by today's move**, each with a printed rank, its full
name, its benchmark ticker, a bar against a printed scale, and a signed figure
whose direction is carried by the glyph, the sign, the side of the zero anchor
and a spoken word before it is carried by hue.

**What they still cannot do:** watch the order change with any treatment
(4.3.6), see an honest answer for a sector we have not heard from (4.3.7), or
click a sector through to anything (4.6).

## Work

- **`RankedList`** under `src/components/`, built to 4.3.2's drawing, with the
  three props the drawing settled and a slot for the fourth that 4.5 fills. It
  owes stories under the `pnpm stories` rule and has states worth seeing side by
  side.
- **It composes rather than reinvents.** `PriceChange` for direction — the list
  **spells neither the sign nor the glyph**, because a second speller is a second
  thing to keep in step with the palette. The arrival mark composes
  `arrivalMark`, **position only**.
- **`<ol>`/`<li>`, DOM order equal to visual order**, and the rank printed as a
  tabular `2ch` ordinal.
- **A memo boundary in the first commit.** AC 6, and Task 3.6.5's two boundaries
  are the precedent — 4.4 and 4.5 land on this same page.
- **Look at the page before running a suite.** `pnpm probe / --within "Sector
performance"` at all four widths, and take every tolerance from its output.
  Record the region's delta against 4.3.1's figures, because `Movers` sits
  directly below it in the same grid at every width.

## Constraints handed to this task

- **The label column is fixed at 144 px**, never `max-content`, or a re-order
  moves all eleven bars' origins.
- **The figure column is a fixed reserve**, tabular: `+0.9%` → `−12.34%` must not
  move the bar's right edge. `−12.34%` measures 53.7 px at 13 px dense plus a
  16 px glyph box; the drawing reserves 86 px, 66 at 390.
- **The zero anchor never moves**, and when the scale steps, all eleven bars
  rescale in **one** settle — the only permitted whole-list geometry change, and
  it must not touch the anchor, the label column or the figure column.
- **The mark's 8 px slot is reserved in every state including the empty one**,
  from the stylesheet rather than from a list — the defect `pnpm probe` caught in
  4.2.5 was one cell reserved instead of four, invisible at three widths of four.
- **`position: sticky` does nothing inside a `Panel`** — measured. A sticky scale
  legend or group heading will fail silently.
- **The region says nothing about the connection**, and
  `one-home-for-the-feed-words` covers this route. It may state an instant, an
  age, a basis, a session and a tape.
- **No live region**, and the reversal trigger recorded as a condition: _the
  first ranked surface on this screen whose order answers something the reader
  asked for._
- **The region's footer carries the benchmark claim and the bar's scale**, and
  **must not** restate the change basis, the instant, the feed or the adjustment,
  all of which the source note or the chrome own. The scale clause renders only
  when the bar does (ADR 0029). **The copy this constraint used to specify is
  FALSIFIED — see the 4.3.2 amendment below before writing a word of it.**

## Done when

1. Eleven sectors render ranked at 1440/1024/768/390, with the rank printed and
   the ticker on the row
2. The bar's scale is printed, steps outward only within a session, and is never
   normalised to the frame's maximum
3. Direction survives `grayscale(1)` — asserted by a produced photograph, not by
   reasoning
4. The region's height is identical across its states at each width, measured
5. `pnpm probe` figures and the delta recorded; `pnpm e2e` green, and
   `overview-proxy-live-update.spec.ts`'s four-cell assertion still passes

## Amended by Task 4.3.1 — 2026-09-27: you inherit the only assertion that can guard the grid, and you are the change that must measure the movement

**1. The grid's shape is guarded by nothing until you land, and the guard is
yours to write.** Task 4.3.1 changed `.regions` from `height: 82vh` with three
`fr` rows to `min-height: 82vh` with a resolved row 1 and
`repeat(2, minmax(min-content, 1fr))`. It added **no check**, deliberately and
correctly: a browser assertion that row 1 is resolved while rows 2–3 grow passes
**identically against the reverted stylesheet** while row 2 is empty, because
with no content the two shapes resolve to the same 161 / 265 / 265. **The
assertion that goes red on a revert exists only once the sector list does.** So
write it here: a browser assertion that the sector region's rendered height
**exceeds the 265 px the old fixed grid would have given it**, and that its
`scrollHeight` equals its `clientHeight` — the second is the real defect, which is
a region that reads correct and is **short by one row**. Take the numbers from
`pnpm probe` rather than from this file. A check owes a break.

**2. You are the change that draws the content, so you own the movement report.**
Task 4.1.4's rule — _nothing on the screen moves when `Sector performance`
fills_ — was **retired by the owner on 2026-09-27** rather than honoured, and its
replacement puts the obligation on you in as many words:

> A reserved region's floor is set by the change that DRAWS its content, and that
> change measures and reports the movement before it merges.

So `pnpm probe /` at 1440/1024/768/390 before and after, and the delta per width
in your record. **The movement is already predicted, from a throwaway that
rendered eleven rows at 13/18 leading** — re-measure it rather than citing it:

| width | sectors       | movers          | `.regions`     | `main`          |
| ----- | ------------- | --------------- | -------------- | --------------- |
| 1440  | 265 → **383** | 265 → **383**   | 738 → **975**  | 1203 → **1440** |
| 1024  | 265 → **383** | 265 → **383**   | 738 → **975**  | 1203 → **1440** |
| 768   | 103 → **383** | 103 (unchanged) | 756 → **1036** | 1241 → **1521** |
| 390   | 121 → **383** | 121 (unchanged) | 900 → **1162** | 1543 → **1805** |

**Everything in those columns that moves is another reserved panel or the source
note** — that is what made the retirement safe, and it is the claim your probe
either confirms or breaks. If a figure or a sentence a reader is reading moves,
the retirement was wrong and it comes back to the owner.

**3. Filling this region also fixes `Movers`, for free.** Rows 2 and 3 share one
`fr` ratio, so raising sectors to 383 raises the `Movers` reserved panel to 383
too. **State that in your record**: Story 4.5 filling `Movers` then moves nothing
at all at 1440 and 1024, and that is a debt this task discharges for a story that
has not started.

**4. The row height that produces 383 is 26 px, and it is a placeholder.** It came
from an instrument: eleven `<li>` at 13 px/18 px with
`padding-block: var(--space-4)`. **Task 4.3.3's row design is authoritative**, and
if the real row is not 26 px then every figure above moves and the reserved
floor — which nobody set, by decision — was never pinned to it. That is the whole
reason the floor was not written in 4.3.1.

## Amended by Task 4.3.2 — 2026-09-27: the movement table above is superseded — 383 was a bare list and the drawn region is 433

**The figure in the table above is falsified by the drawing, and the row height is
not why.** Task 4.3.1's 383 px was measured on eleven `<li>` and nothing else:
`2 + 51 + 32 + 298` is the frame, the header, the padding and the list. The row
Task 4.3.2 drew **is** 26 px — eleven rows with ten 1 px separators is 296 px
against the 298 measured, a 2 px difference that is the placeholder's own
separator accounting — so the list is right and **two more lines are not
optional**:

- the **printed ladder** (`--space-8` + 16 = **24 px**), which AC 2 requires: a
  length is a claim about a quantity, so the quantity is printed;
- the **claim line** (`--space-12` + 16 = **28 px**), which is the benchmark
  sentence the footer carries at every width.

| width | region, drawn | why                                                       |
| ----- | ------------- | --------------------------------------------------------- |
| 1440  | **433**       | `2 + 51 + 16 + 296 + 24 + 28 + 16`                        |
| 1024  | **433**       | same tracks, narrower bar                                 |
| 768   | **433**       | same                                                      |
| 390   | **425**       | no bar, therefore no ladder; the claim reserves two lines |

**Re-measure rather than cite these.** They are drawn figures, and your probe is
what turns them into measurements — that is your own done-when 5.

**The knock-on you must report, because it is bigger than the number the
retirement was argued against.** Task 4.1.4's rule was retired on an estimate of
a **975 px** grid at a 900 px viewport (row 1 at 161, two rows at 383, two 24 px
gaps). At 433 the same arithmetic is **161 + 433 + 433 + 48 = 1075**, so the grid
grows by **337 px rather than 237**, and the pair of lower rows is ~866 rather
than ~766. **The retirement's safety argument is unaffected** — at every width
everything that moves is still another reserved panel or the source note, no
figure and no sentence a reader is reading changes position — **but the magnitude
is yours to measure and state, and if anything a reader is reading does move, it
goes back to the owner rather than into your record.**

## Amended by Task 4.3.4 — 2026-09-27: the frame is ready, and four things about it are not what you would guess

**`overview.sectors` exists and carries eleven figures in rank order.** What you
render, and the traps:

**1. The move on a `stored` figure is `sessionChangePercent`, NOT `changePercent`.**
There is no previous-session **date** anywhere on `SecurityLastClose` — only
`previousClose`, a number with no date — so a `changeBasis` for it would have to be
invented by a calendar walk in the wire conversion, and it is not. The field name
carries the meaning instead: beside the existing `session`, `sessionChangePercent`
says _this session's own close-to-close move_. **A renderer reaching for
`changePercent` on a stored figure finds nothing**, which is the failure mode a
shared field name would have invited — and the label is **yours to draw**.

**2. Both new wire fields are optional on the READ side, and that is deliberate.**
The deploy rolls the backend first, but **a rollback pins a previous image**, so a
new bundle can legitimately meet an old gateway. `sectors` is read only when it **is
an array**, and `sectorLadderStep` **only beside sectors**. Render the absence as a
state, not as an error.

**3. The ladder's rung arrives on the frame — do not compute one.**
`overview.sectorLadderStep` is `1 | 2 | 5 | 10`, held **server-side** so every
reader shares one scale, stepping **outward only within a session** and reset at the
bell. **It saturates above ±10%** by the owner's decision: a sector past 10% draws a
bar clipped at the top rung while **the row's own figure stays exact**. So the
printed ladder and a row's figure can disagree in magnitude on an extreme day, and
that is correct — say nothing about it in the UI, because the figure is the claim and
the bar is the comparison.

**4. Rank position is already decided; do not re-sort.** The array arrives ranked
through the one comparator in `packages/shared`. **A figure with no move is ranked
nowhere** — every keyless figure sorts after every keyed one and holds the declared
`SECTORS` order — and **two figures equal at DISPLAYED precision do not swap**, which
is why `PERCENT_DISPLAY_DECIMALS` now lives in `packages/shared` and
`formatChangePercent` reads it. **If you round differently anywhere, the drawn order
can contradict the drawn figures.**

### What CI cannot show you, and it is more than last time

**Every sector figure is `unknown` on CI, for ever** — 518 securities, zero bars. So
`sessionChangePercent` never occurs there, **the ladder is `±1` for ever**, and the
comparator's keyed branches are reached by unit tests only. The one combination CI
does prove is all-eleven-`unknown`, which asserts the declared order.

**So a browser assertion about a sector's position or its figure is an assertion
about data the runner does not have.** `pnpm store:bare` reproduces it locally in
seconds, and `docs/GAPS.md` now carries the entry. **You are the first thing that can
produce a keyed figure in a browser** — that is your entry's named owner.

## Amended by Task 4.3.2's sweep — 2026-09-27: the footer copy this task specified is FALSIFIED, and the surviving caveat is WEIGHTING

**The constraint above used to tell you to draw `Each row is the sector's
benchmark ETF — S&P 500 constituents only · bars to ±2%`. Do not.** The second
clause stopped being true on **2026-09-08**, when Task 2.8.2 defined the universe
**as** the S&P 500 — so the equity that clause warns about, one with a sector and a
benchmark it is not in, **does not exist**. `UNIVERSE.md` §5 has carried the dated
amendment ever since; Task 4.3.2 struck the claim in `packages/shared/src/security.ts`
and in `UNIVERSE.md` §1, and **missed this file**, which is how it came within one
task of being drawn on the landing page as shipped copy.

**What is true, and it is the more interesting claim**: a sector SPDR is
**capitalisation-weighted**, so **its move is not the average of its members'
moves**. Two securities in one sector contribute unequally to the benchmark they are
compared against, and a reader who takes the figure as _what the average stock in
this sector did_ is wrong — for that reason, and not for the membership one. **This
is the story's own subtitle** — _the Benchmark That Is Not an Average_ — and the
footer is where it becomes a sentence a reader can see.

**So the footer's benchmark clause states the weighting**, not the membership. The
exact wording is yours with the designer, against `The ranked list.dc.html` §05's
claim line, which is the 28 px this region reserves at every width. Keep it to the
one clause: the region must not grow a second sentence, and **the claim must not
imply the eleven sum to the market** — they partition the S&P 500 exactly, which is
a different and narrower thing than _the market_, and `Market proxies` two hundred
pixels above is what speaks for the broad indices.

**Do not write a membership claim at all**, even a corrected one. It would be true
and it would be noise: the universe being the index is why the mapping is total by
construction, which is a fact about our curation rather than about the figure on the
row.

---

## What was done — 2026-09-27

### The files

**New** — `apps/frontend/src/market/sector-performance.ts` (the pure reader: frame
→ rows + rung, plus `SECTOR_CLAIM`, the footer's one home) with 10 tests;
`market/ranked-bar.ts` (`barFraction`, `ladderTicks`, `ladderClause`) with 7;
`components/RankedList/` (6 stories, 8 tests); `components/SectorPerformance/`
(5 stories, 4 tests); `e2e/specs/overview-sector-region.spec.ts` (3 tests).

**Changed** — `routes/MarketOverview.tsx` (wiring and the `useMemo` boundary),
`market/index.ts`, `components/Region/Region.tsx` (`filledBy?: string | undefined`
— one word, forced by `exactOptionalPropertyTypes`: the region says what belongs
in it while empty and says nothing once filled, and without it that needs two
`<Region>` elements), `scripts/breaks.mjs`.

**`RankedList`'s props are three, with `"none"` as the slot Story 4.5 fills:**

```ts
export type RankedListBar =
  | { readonly kind: "signed"; readonly scale: SectorLadderStep }
  | { readonly kind: "none"; readonly scale?: never };
```

The drawing states `bar` and `scale` as two props with _"required when signed,
refused otherwise"_; **the union is that sentence as a type.**

Three memo boundaries: `useMemo` on the route's derivation, `memo(RankedList)`,
and `memo(Row)` **on primitive props** — the row boundary is the one that holds
per tick.

**The track list resolved exactly as drawn**: `2ch 144px 52px 78px minmax(0,1fr)`
with `column-gap: var(--space-12)`, stated **once**, because the `<ol>` and each
`<li>` are `subgrid` and the rule overlay and the ladder are grid items in column 5. **`337.6` is never typed.** Chromium-only, which is the one browser this
repository tests.

### The probe, before and after, all four widths

| width | `Sector performance` | `Movers`             | `.regions`     | `main`          |
| ----- | -------------------- | -------------------- | -------------- | --------------- |
| 1440  | 265 → **461** (+196) | 265 → **461** (+196) | 738 → **1131** | 1203 → **1596** |
| 1024  | 265 → **461** (+196) | 265 → **461** (+196) | 738 → **1131** | 1203 → **1596** |
| 768   | 103 → **461** (+358) | 103 → 103 (0)        | 756 → **1114** | 1241 → **1599** |
| 390   | 121 → **437** (+316) | 121 → 121 (0)        | 900 → **1216** | 1543 → **1859** |

**`Movers` rose for free at 1440 and 1024 — and so did `Market breadth`.** Both
went 265 → 461, because rows 2 and 3 share one `fr` ratio and the second column's
areas sit on the same rows. **So Story 4.5 filling `Movers` and Story 4.4 filling
`Market breadth` now move nothing at all at those widths** — two debts discharged
by a change that was not buying them. At 768 and 390 the grid is
`grid-template-rows: none`, so neighbours are auto-sized and unchanged, which is
4.3.1's own prediction confirmed.

**461, not the drawn 433, and the arithmetic is accounted for:**
`2 (border) + 47 (header) + 16 (body pad) + 16 (Region's .content margin) +
296 (list) + 24 (ladder) + 44 (footer) + 16 (body pad)`. The 28 px the drawing
did not know about, **none of it the row's**: the header is **47** rather than 51
(51 included an `awaiting` tag that no longer renders); **`Region` adds a 16 px
`.content` margin-top** that no drawing models and `MarketProxyStrip` pays too;
and the footer reserves **two** lines at every width.

**That last is the owner's decision.** The scale clause's width is a function of
the **rung** — `bars to ±1%` against `bars to ±10%` — and the rung **steps during a
session**, so a one-line reserve would make this region's height depend on how
heavy the day is, which is the one movement this story designed out. 16 px buys a
height that does not depend on which sentence is true.

### Nothing a reader is reading moved — the retirement's argument held

At all four widths the proxy strip, its `strip` grid, its four cells and its
`qualifier` are **byte-identical in position and size**: `1392×183 @24,149`,
`1358×58 @41,229`, `1358×16 @41,299` at 1440, and likewise at 1024/768/390.
**Everything that moved is a reserved hatched panel or the source note.** Task
4.1.4's retirement was argued on that claim at +237 px and it **holds at +393**.

### A defect at 390 that nothing mechanical could see

The first measurement at 390 came back **503 px, with every row 33 px instead of
26**. The narrow track list drops the bar's track — **but the bar element is still
the row's fifth child, and a subgrid cannot grow columns beyond the range it
adopts**, so it was placed in an **implicit second row of every `<li>`**.

**`pnpm verify` was green, the page looked right, and no assertion at 1440 visits
that width.** Cured with `display: none` in the `<37rem` block, with the finding
written beside it. The rule that generalises: **a narrow track list must say what
happens to the elements whose tracks it dropped**, not only which tracks remain.

### The guard, and the finding inside its break

`overview-sector-region.spec.ts`, pinned to **1440×900** — `devices["Desktop
Chrome"]` is 1280×720, and a height taken at one viewport and asserted at another
is uncheckable.

```ts
expect(box.height).toBeGreaterThan(FIXED_GRID_HEIGHT); // 265, measured
expect(box.scrollHeight).toBe(box.clientHeight); // the real defect
```

plus the last row's bottom inside the region's box, and a second test asserting
**the same height with eleven figures and with eleven `unknown`s** — the second
being CI's permanent state.

**The red, verbatim — an assertion failure with a third test still passing:**

```
    Expected: > 265
    Received:   264.5
  2) … › the region is the same height with eleven figures and with none
    Expected: 263
    Received: 443
  2 failed … 1 passed (5.3s)
```

**`443` of content in a `263` box is the silent scroller, measured.**

**And the "confirm it passes wrongly first" step found something.** Neither
single-clause revert goes red: `minmax(0, 1fr)` alone still measured **461**
(against an indefinite container, `fr` tracks size to max-content whatever their
minimum), and `height: 82vh` alone is held at 461 by `min-content`. **The shipped
repair is belt and braces, so no single-clause edit reproduces the defect** —
which is why the break's `replace` writes both, and why a break written against
either clause alone would have certified nothing. Recorded in the registry entry.

The break targets Task 4.1.3's **own** fixed grid, argued in its own comment for
Epic 6's canvas — so it is the edit **somebody else will make**, not the one just
repaired.

### Greyscale — done-when 3, produced and looked at

`sectors-1440-greyscale.png` beside its colour twin. **Direction is carried four
ways with hue removed and nothing is lost**: which side of the full-height zero
rule the bar grows from, `PriceChange`'s `▲`/`▼`/`—`, the sign on the figure, and
the printed ordinal. **`Materials` at `0.00%` draws the achromatic anchor tick and
no band** — visibly different from a row with no reading, which draws nothing.
Magnitude survives as length against the printed `−2% −1 0 +1 +2%`. Verified by
the orchestrator on the image rather than taken on report.

### Three owner decisions, taken 2026-09-27

1. **The footer's wording, approved as written**: _Each row is the sector's
   benchmark ETF — capitalisation-weighted, not the average of its members ·
   bars to ±2%_. The scale clause is a separate element, dropped below 37rem where
   there is no bar to describe. **No membership claim, no _the market_, no basis,
   instant, feed or adjustment** — two unit tests assert each of those absences.
2. **`Communication Services` stays in 144 px** though it does not fit — see
   below.
3. **The two-line footer reserve stays**, at 461 rather than 445.

### The 144 px premise is false, and this was the drawing's own owed measurement

§01 recorded **143.75 px** with _"0.25 px of margin"_ and owed a re-take to Task
4.3.3, **which did not take it**. The drawing's own owed-measurements table put it
more bluntly: _"A quarter of a pixel is not margin."_ Taken now, Chromium at 13 px:

- **loaded face** (`Hanken Grotesk Variable`): **144.70 px — it OVERFLOWS by 0.70**
- **fallback face**, a cold load with fonts blocked: **153.66 px — overflows by 9.66**

So the figure was wrong **in the face it was measured in**. **Kept at 144 by the
owner**: `white-space: nowrap` sends the spill into the 12 px column gap, so
**nothing collides and nothing truncates at either face**, and the fallback still
has **2.34 px** before it would reach the ticker. Rejected: 146 (fits the loaded
face, does nothing for the fallback — tidiness rather than safety) and 156 (fits
both, costs 12 px of bar at every width). **Reversal trigger, a condition:** the
first change to the text face, or the first sector label longer than
`Communication Services`.

### One deliberate departure from the drawing, and it is a band rather than a width

§04 gives 390 the tracks `2ch 144px 44px 68px`; shipped is
`2ch 144px 44px minmax(68px, 1fr)`. A literal `68px` leaves **213 px of dead
space** to the right of the figure at **591** — the top of the one-column band —
with the figure stranded mid-row. At 390 itself the two coincide to within 12.4 px,
**which is the only width the drawing draws**. The reserve is the minimum; the
`1fr` keeps the figure's right edge on the region's. The lesson generalises: **a
drawing at one width inside a band has to say which of its numbers is a floor.**

### The boundary drawn with Task 4.3.7

The region cannot render at all without **something** in the figure column for a
keyless row, and **CI's entire state is keyless**. So the minimum shipped: an
em-dash rank, and three absence strings produced in **one** place —
`2026-09-25 close` for a stored figure with no prior close (the proxy strip's own
spelling), `None stored` for `unknown` (the proxy strip's words), and
**`No stored close`** for an observed price with no basis, which is the one
genuinely new string.

**Still 4.3.7's**: the trailing quiet group with its `--rule-control` divider, the
first-paint `visibility: hidden` state, the wording review of all three sentences,
and the permutation guard. **The region head's `11 · RANKED` count was not built
either** — that slot is where `ORDER HELD` goes and it needs a `Region`/`Panel`
change, so it belongs with Task 4.3.6 rather than being opened twice.

### Gates

```
$ pnpm verify    EXIT=0
All matched files use Prettier code style!
39 components, 39 stories files.
479 documents, 1661 cross-file links, 39 anchor links, 0 broken.
37 invariants hold.
packages/shared  Tests 385 passed (385)
apps/backend     Tests 990 passed (990)
apps/frontend    Tests 1254 passed (1254)
test:process     Tests  41 passed (41)
```

**No `Unhandled Errors` block anywhere in the log** — grepped for, rather than
read off the exit code.

```
$ pnpm e2e    EXIT=0
  15 skipped
  173 passed (3.0m)
```

Done-when 5, from that run: `overview-proxy-live-update.spec.ts`'s four assertions
all pass, including _the region says something when its subject never arrives_;
and the three new `overview-sector-region.spec.ts` tests pass.
**`security-gap-fill.spec.ts` did not flake on this run.**

`pnpm test:database` not run — no data-layer file was touched. `pnpm store:bare`
not run: the new spec serves its own frames through the shipped socket path, so
both its states are store-independent, and the all-`unknown` state it produces is
exactly what CI's backend builds (`fitSectorLadder([])` is 1, eleven `unknown`
figures, section present).

## For a stakeholder — a status report, 2026-09-27

**The landing page now shows which sectors are leading and which are lagging.**
Eleven rows, ranked, each with its position, its full name, its benchmark ticker,
a bar drawn against a printed scale, and a signed percentage. It is the first thing
on that screen that tells a reader something they could not have got by opening a
security.

**What they still cannot do**: watch the order change with any treatment (the next
task), see the full set of honest answers for a sector we have not heard from (the
one after), or click a sector through to anything (Story 4.6).

Three things worth knowing. **The region is 461 pixels rather than the 433 the
drawing predicted**, and none of the difference is the row — it is a header that
shrank, a margin no drawing models, and a deliberate two-line reserve so the
region's height cannot change when the bar's scale steps during a heavy day.
**Filling it also finished two other regions' work for free**: `Movers` and
`Market breadth` rose to exactly the same height, so the stories that fill them
will move nothing at all.

And **a defect at phone width was caught by looking at the page, not by any test**.
The narrow layout drops the bar's column, but the bar was still in the markup — and
the grid put it on a second line of every row, making the region 66 pixels taller
than it should be. Everything was green and the page looked right at the three
wider sizes. It took thirty seconds of the layout probe to see and a one-line fix.
