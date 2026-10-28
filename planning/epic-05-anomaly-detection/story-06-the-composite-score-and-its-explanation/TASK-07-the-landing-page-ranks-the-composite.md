# Task 5.6.7 — The landing page ranks the composite

**Status:** **Complete — 2026-10-28**
**Story:** [5.6 The Composite Score, & Its Explanation](STORY.md)
**Depends on:** 5.6.6

## Objective

**So the two surfaces finally agree about what is ranked.** `/`'s `Unusual
activity` ranks by the price percentile today and draws an ordinal with no band
chip — because Story 5.4's Gate 1 refused a chip that would have read `extreme`
on one factor of four. With a real composite that refusal expires.

## What the user can see when this lands

```
 1  NVDA   NVIDIA Corp        91  ┃extreme ┃
 2  AMD    Advanced Micro…    84  ┃  high  ┃
```

The row's figure column becomes the **score**, and the chip is its second
channel. **The score is shorter than the ordinal it replaces**, which is what
pays for most of the chip.

## Work

- **The chip replaces the ordinal track rather than joining it.** Measured:
  the row resolves to `15 68 125 64` at 1440 and `15 68 140 64` at 1024 in a
  308/323 px box — rank, ticker, name, ordinal. `AnomalyBadge`'s `min-width:
6rem` is **96 px, 31% of the row**, so a fifth track leaves the name about six
  characters, which is the arithmetic that already moved the word `percentile`
  off this row. Score (`91`, two glyphs, tabular, ~28 px) + chip (~72 px) costs
  the name ~36 px instead of ~80.
- **`AnomalyBadge` is ADOPTED with a `compact` modifier** (AC 8's disposition):
  drop `min-width`, narrow the padding, **keep everything load-bearing** — the
  four fills, `--ink-primary` on every step (12.65 / 8.87 / 5.59 measured against
  the three ambers), the `normal` outline variant with its `calc()`, and above
  all **the written word inside the fill**. Never an abbreviation, never a dot,
  never `H`/`E`: the ramp's greyscale steps are 1.12 / 1.43 / 1.59, enough to see
  a change and nowhere near enough to name one.
  - **If the type shrinks, re-measure those three contrasts.** Micro is already
    the smallest ink in the product and 1.4.3's large-text exemption does not
    reach it.
  - **The chip column is a FIXED width probed at the widest band word**, centred —
    not `max-content`. A column sized to the longest word _in today's frame_
    makes the layout move when the data moves, on a region that already re-orders
    under live data and needed `ORDER HELD` for it. And measure it in the
    **cold-load face**: `RankedList.module.css` records a 44.20 / 50.73 px
    discrepancy, so a chip sized from the shipped face **clips on a cold load**.
- **`SecurityRow`'s disposition, recorded rather than cleaned up:** **deleted**,
  with the reason — the popover shape was refused on §11's own grounds. That
  leaves `Popover` with **no live consumer**, which is itself a disposition owed:
  name it as a deferral for Epic 7's dense surfaces, not an accident.
- **The cohort rule, which is AC 3 arriving at a ranked surface.** Two scores are
  comparable iff computed over the **same factor set** — with unequal weights even
  a count-based cohort mixes scales. **Rank within the largest non-empty cohort,
  state which, and count the others.** Ranking only full-factor scores empties
  the region permanently on CI and for months on the deployment; ranking across
  cohorts is refused by AC 3 in terms, because it systematically promotes the
  worst-covered securities — what `UNIVERSE.md` rule 4 spent ~19 curation slots
  preventing.
  - **A result worth knowing: while `{price}` is the live cohort, ranking by the
    composite is order-identical to ranking by the percentile**, because the score
    is a monotone function of one unit value. So this changes the drawn figure and
    the label now, and the order later.
  - **`eligible`/`scored` change meaning and the nesting sentence must still
    close.** Today `!figure.measured → continue` **drops** the row; under a
    composite a refused price factor is an **absent factor**, not a dropped row.
- **Do not add a fourth population sentence.** The footer reserves **four micro
  lines** and the lead clause plus the age line already fill them at 308 px — the
  width this region draws at, at the **widest** viewport this product supports.
  The cut sentence absorbs the arity; the volume factor's population belongs in
  the per-security explanation.
- **The independent recompute moves, and is rewritten rather than re-imported.**
  `overview-unusual-ranking.spec.ts` writes `compareByPercentile` out by hand
  deliberately so it cannot agree with the renderer by construction. Rewrite it
  for the composite; **never import the new comparator**.
- **This is the commit that makes amber reachable on `/`** — `Unusual.tsx`
  currently records that _"no amber appears in this region, so that collision
  stays Story 5.6's and is unreachable from `/`."_ That sentence becomes false
  here and is a live claim to amend. Task 5.6.8 photographs it.
- **Epic 14's `/` frontend clause does NOT fire** — ten rows, not 516 elements —
  and the fourth consecutive non-firing is evidence the wording works. Say so in
  writing.

## Amended by Task 5.6.2 — 2026-10-22: Epic 14's per-batch re-take is YOURS, deferred here deliberately

**Epic 14's backend condition fired once already** (Task 5.4.2: **0.474–0.509 ms
p50 a batch**, **946–1,015 ns a security**, 2.8× the breadth-plus-movers work),
and `planning/epic-14-performance-scale-validation/EPIC.md` asks the next story
that changes the per-batch path on `/` to **"re-take the whole arm with a control
rather than add another term to an estimate."**

**Task 5.6.2 changed that path and did NOT take the arm.** That is a decision, not
an omission: 5.6.2 added the excess-move factor to the producer, and **this** task
re-ranks the region on top of it, so measuring at 5.6.2 would have priced an
intermediate state that never ships and would have had to be re-taken here
anyway. **Take it once, here, over the whole arm.**

Rules that are not optional, each of them somebody's measured defect:

- **the calibrator in its OWN loop** — an in-loop calibrator read 1.07–1.25 ms
  standing alone and **8.1–8.3 ms** sampled inside the subject's loop, a
  reproducible **7.2×** artefact that discarded 321–400 of 400 samples and cost
  two complete runs;
- **arms rotated and interleaved**, not blocked — blocked arms drifted 0.2 ms;
- **the load average read BEFORE the run, never during** — a full `pnpm e2e`
  begun at 5.31 left the machine at 31.04, so **the suite is its own plant**.
  Task 5.6.2 lost an hour to a machine at load **244** driven by unrelated
  applications, and every figure it reports was taken after it settled;
- **report the total, never a subtraction** — the 1.521 ms reference has not been
  re-taken since Task 4.8.11's repair and three downstream products are still
  pre-repair;
- **the _tight-loop upper bound_ caveat on every Node figure and NOT on browser
  ones** — the calibrator reads ×1.00 in a browser and does not divide out in
  Node.

**And one caveat that is new to this epic and points both ways at once.** Every
previous backend arm was an **upper** bound, because a tight loop inflates. Here
the **volume factor refuses on every machine that exists** — `no same-tape
history 516` on this store, measured by 5.6.2's own pass run — so a composite
measured locally is a **two-of-three** composite and the figure is simultaneously
a **lower** bound on the deployed cost. State both; do not let a reader take it
as either alone.

## Amended 2026-10-26 before this task started — THREE premises in it were wrong, and all three were mine

A developer read this file, measured against the real store, and **stopped before
writing code**. Every claim it made was verified. The corrections are here rather
than in a closed task's record, because they are the premises this task would
otherwise act on.

### 1. The live cohort is `{price, excess}`, NOT `{price}`

Measured against the local store — and the deployment has run the same nightly
pass since 5.6.2 merged:

```
excess_move_baselines:       501 distinct securities
return_baselines:            516 distinct securities
session_return_percentiles:  485 rows
```

**So essentially every equity has BOTH baselines.** Two consequences, and both
reverse what this file said:

- _"Ranking by the composite is **order-identical** to ranking by the
  percentile"_ is **false**. The score is no longer a monotone function of one
  unit value, so the order is genuinely different.
- _"This changes the drawn figure and the label **now**, and the order
  **later**"_ is **false**. **The order changes on the first frame.**

**The owner accepted the re-order**, on the grounds that the composite is what
the epic exists to rank by and a security unusual on two factors should outrank
one unusual on a single factor. ADR 0041 already governs a ranked surface
re-ordering under live data, and `ORDER HELD` exists for exactly this. **What
changed is the risk description, not the work** — this is not the low-risk
change the paragraph above claimed.

### 2. The mock row is unreachable in this tree

```
 1  NVDA   NVIDIA Corp        91  ┃extreme ┃
```

**`91` cannot happen.** A price-only score caps at **40**; a two-factor score at
**75** (40 + 35). `91` needs three factors, and volume is `no-distribution`
**unconditionally** until a nightly pass stores a distribution of a volume rate.
Treat the sketch as a **shape** and draw the states this tree can produce.

### 3. The cold-load figure does not transfer to the chip

This file cited `RankedList.module.css`' **44.20 / 50.73 px** discrepancy. That
measures **five glyphs of `--font-data`** at `--font-size-dense`.
`AnomalyBadge.badge` composes only `microLabel`, which sets size, line-height,
letter-spacing and `text-transform` and **no `font-family`** — so the chip
inherits **`--font-sans`**, a different stack with a different fallback. **The
principle stands and the number does not**: measure in the cold-load face, but
measure _that_ face.

**And the widest band word is `elevated` (8 glyphs), not `extreme` (7)** — a
fixed chip column must be probed at `ELEVATED`.

### 4. One measured figure this file did not have

At **390** the ticker track is **64, not 68** — the gap steps below 37rem. Probed
grids, pre-change: `15 68 125 64` at 1440, `15 68 140 64` at 1024,
`15 68 503 64` at 768, **`15 64 141 64` at 390**. The list is **ten rows, 269 px,
identical at all four widths**, and nothing in the region scrolls at those pairs.

### 5. The excess factor needs a figures seam `OverviewPass` refuses in that direction

`compositeAnomaly` requires an `ExcessMoveFactor`, which requires a
`WireOverviewFigure` for the subject **and** its benchmark — and **there is no
honest `FactorAnswer` for _we did not ask_**: `inapplicable` means the question
does not arise, `refused` demands a refusal word and two counts. So **not
computing the excess factor on `/` is unrepresentable in the type.**

But `figureOf` is private and `OverviewPass`' handle is a **linear find** per
symbol, argued for on the grounds that _one or two symbols are read per applied
batch_. 501 securities × a find over 516 entries is **~258k comparisons a
batch**, and the ordering is circular — `unusual` is an **input** to
`overviewPassOf`, so the pass's `figureOf` does not exist when `unusualActivity`
is called.

**The repair is an eager `Map<string, WireOverviewFigure>` built once in
`marketOverview` and read by both.** That moves ~486 figure encodings per batch
from never-computed to always-computed, **which is the cost Epic 14's re-take
must price** — so build the seam, then measure it, and do not report a figure
taken over an unreviewed seam of your own design.

> **WITHDRAWN 2026-10-26, and do not build this seam.** The whole of this
> section is downstream of a premise that was a **live correctness defect**:
> `ExcessMoveFactor` required a `WireOverviewFigure` either side, and a wire
> figure's move is _the move since the basis close_ — a **session-to-date**
> quantity — while `0016`'s distribution is of **five-minute** excesses.
> Measured on the local store over 34,622 grid pairs: the shipped numerator
> ranked at mean **91.37** with **58.8%** of samples at the 99th, against
> **46.08** for a correct five-minute numerator over the identical sample.
>
> `excessMoveFactor` now takes two `FiveMinuteReturn`s, so **three of this
> section's four problems do not exist**:
>
> - there is no `WireOverviewFigure` seam to build, eagerly or lazily, and no
>   ~258k comparisons and no ~486 figure encodings a batch to price;
> - the **circularity is gone** — `unusual` is still an input to
>   `overviewPassOf`, but the factor's inputs come from `trailingWindows.read`,
>   which `marketOverview` already holds (it passes `windowOf:
trailingWindows.read` into `unusualActivity` today);
> - `mixed-basis` is not a concern on `/` either: two five-minute returns over
>   the same endpoints share a basis by construction, and the factor refuses
>   on the endpoints' own instants.
>
> **What this task must price instead** is ~**512 walks over ≤7 bars** per
> applied batch — 501 subjects plus the eleven sector SPDRs, read once each —
> against the 0.474–0.509 ms p50 a batch Story 5.4 measured for the
> percentile-only ranking. Read both legs off **one `asOf`**:
> `one-instant-for-a-subject-and-its-benchmark` refuses a producer that does
> not, and the symptom it prevents is not a wrong number but a region that is
> quietly `mixed-basis` for ever.
>
> What **remains true** from this section is its first paragraph: there is no
> honest `FactorAnswer` for _we did not ask_, so not computing the excess
> factor on `/` is still unrepresentable in the type.

### Row-shape assertion inventory, taken before any change

**23 role-based row assertions across 10 e2e specs; 25 across 6 component test
files** — of which **`RankedList.test.tsx` holds 14**, the shared component and
therefore the real defect **class**, which is the same shape that bit Task 5.6.5.
By `expect` count the at-risk set is **13 files, ~450 assertions**.

**The four `unusual` e2e specs contain NO role-based row assertion** — they
assert on ordinal **text** and on counts, which is exactly the channel a score
plus a chip breaks. Scope them; never loosen them.

## Done when

1. The row draws the score and a compact chip that keeps the written name; probed
   at four widths in the cold-load face.
2. The region is one height, ten rows, and the 11-row ceiling is not breached.
3. The cohort rule is implemented and stated on screen; the nesting sentence closes.
4. `SecurityRow` deleted with its disposition recorded; `Popover`'s orphaned seam named.
5. The recompute is rewritten by hand and its break goes red.
6. `pnpm verify`, `pnpm e2e` green at two workers.

## Amended by Task 5.6.6 — 2026-10-26: the SESSION arm's composite is stored, nothing reads it, and eight constraints come with it

**`/`'s `Unusual activity` has two bases and the `session` arm — about 80% of
the week, and permanently on CI — read a row carrying a percentile and no
score.** `0017_session_composite_scores` now stores one per equity per session,
written by the nightly pass. **This task is the reader**, and the following are
constraints rather than suggestions: each is something Task 5.6.6 measured or
decided for this task, written here in words this task can act on rather than
as a pointer back.

1. **Nothing constructs the cache.** `session-composite-cache.ts` exists and is
   unit-tested; `index.ts` does **not** build it, so this task owes the
   construction and the startup `load(…)` off the hot path, beside the four
   caches already there. The read must stay synchronous — `symbolReturn` and the
   overview join run inside the socket's own callback, where an unhandled
   rejection is a crashed process.

2. **Read the MINTED outcome, never the stored column.** `readNewestSession`
   returns `StoredCompositeScore.outcome`, minted by `scoreAnomaly` from the
   row's three stored factor answers. The stored `score`, `band` and `max` are
   read only to be disagreed with (`0017` §5), and
   **`a-stored-composite-is-minted-from-its-answers`** in `pnpm invariants`
   fails the build on a reader that returns the column instead. The break
   `the-stored-score-is-read-rather-than-minted` proves it.

3. **`StoredCompositeRanking.disagreed` must not vanish.** A row whose stored
   figures do not reproduce is **dropped** — a rollback that put the runner and
   this bundle two weight sets apart, which is detectable only because both
   halves are stored. The cache logs it; this task decides whether the region's
   own cut sentence needs it, and the chain to preserve is `rows ≤ scored`.
   `scored` comes off the pass row and never from counting rows.

4. **The stored cohort is `{price, excess}` for EVERY scored security, and
   `max = 75` on every row.** Measured on the local store: 501 tracked, **485
   scored**, 16 unscored, **0 single-factor scores** — not merely _dominated by_
   the two-factor set. The two factors refuse for the same root causes, so a
   security whose price factor refuses has an excess factor that refuses too.
   **So the cohort rule has nothing to separate out of hours**, and `2 of 3 ·
max 75` is the only label the session basis can draw today. Do not infer that
   the live basis is the same shape — it is not measured.

5. **`above_sample` is `false` on every stored row, for ever.** `0014` §5's
   recorded asymmetry: the window the pass ranks against **contains** the sample
   being ranked, so `>99th` is reachable in session and never out of hours. The
   column exists because the shape is one shape.

6. **The stored composite is EQUITIES ONLY — 501, never 516.** AC 13's reason:
   scoring `SPY` and the eleven sector SPDRs beside their own constituents would
   make this region and `Market proxies` / `Sector performance`
   non-independent. `0017` §7 carries the condition for widening it, and it is
   not this task's — _the first surface that needs a composite for a security
   the market is shut on_, which is a security page's own score out of hours.

7. **The weights and the floors the pass applied are on the pass row and travel
   with the rows.** AC 2 publishes the weights on screen, and `0014` §5's rule
   is that the figure the screen states must be the one the **producer**
   applied — so out of hours the sentence reads `pass.weights`, not this
   bundle's `FACTOR_WEIGHTS`. `pass.floors` is beside it for the same reason.

8. **Band distribution over the 485, so the chip's states are known before you
   draw them:** `normal 162, elevated 201, high 106, extreme 16` — 3.3% extreme
   against Task 5.6.3's 1.6% at the median live instant. Mean score **43.87**,
   range **3–75**. `ANOMALY_BAND_FLOORS`' trigger 2 (_a fifth of the universe at
   `extreme`_) is nowhere near firing.

**And one premise this file does not yet carry.** Its §1 amendment says _the
order changes on the first frame_ and gives three row counts as evidence. Those
counts are confirmed — `excess_move_baselines` 501, `return_baselines` 516,
`session_return_percentiles` 485 — and what is now also true is that the stored
composite's own order is a genuine re-order of the stored **percentile** order,
because 485 of 485 rows add a second term. `compareByScore` is the one home for
that order and `one-comparator-for-the-order-of-a-composite-score` refuses a
second.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-10-28

### Both arms moved in one change, which is the whole shape of it

`/`'s `Unusual activity` ranked and drew the **price percentile** — one factor
of three — and now ranks and draws the **composite score** with its band as a
chip beside it. The producer, the wire, the reader, the drawing and the session
arm all changed together, because the order and the drawn figure are one
decision: a composite in the comparator with an ordinal in the column draws row
1 at `85th` above row 2 at `97th`, a visibly mis-ordered list with every figure
on it individually correct — and the session arm runs about 80% of the week and
permanently on CI, so that would have been the deployment's ordinary evening
state rather than an edge case.

**`WireUnusualRow` went from eight fields to three** — `symbol`, `score`,
`band`, plus an optional `percent` the direction glyph needs. The ordinal, its
counted `n`, `aboveSample` and both timestamped endpoints left the wire with the
figure they described.

### The cohort rule, implemented, stated on screen, and invisible

**Two scores are comparable iff computed over the same factor set.**
`packages/shared/src/composite-cohort.ts` is the one home for that rule;
`selectLargestCohort` partitions, the largest cohort is ranked within, and the
securities on other scales are **counted** rather than silently absent. The
section carries `WireUnusualCohort` — the factor set, its `max`, how many are in
it and how many are not — and the footer absorbs it into the **cut** sentence
rather than taking a fourth line:

> Of the 501 companies we track, 466 were heard from in the last 5 minutes and
> 455 have a score on 2 of 3 factors, to a maximum of 75. 11 have too short a
> baseline. Nothing newer than Oct 15 · 14:01 EDT has reached us.

Four lines of micro at 308 px, which is exactly the reserve. The nesting chain
gained a link and still closes: **`rows ≤ cohort.scored ≤ scored ≤ eligible ≤
tracked`**, and `readUnusual` walks all five.

**`scored` changed meaning and that is the substantive half.** It was _how many
held a comparable price baseline_; it is now _how many got a composite at all_.
Under a composite a refused price factor is an **absent factor** rather than a
dropped row — so a security whose excess move ranked is honestly `1 of 3 · max
35`, scored and deliberately **not** ranked against a 2-of-3 one.

**It is correct and invisible, and that is said out loud rather than left to be
found.** Task 5.6.6 measured 485 scored securities with **0 single-factor
scores**, because the two scored factors refuse for the same root causes — so
`{price, excess}` is the **sole** cohort and `others` is `0` in every state any
machine can produce. **The machinery is untested against a real second cohort.**
It is written so that the second cohort's arrival is a data change rather than a
code change, and it is held by a check (`a-ranked-score-list-is-one-cohort`)
rather than by a test, precisely because a test over today's fixtures is green
with the partition deleted.

### The defect the probe caught, which nothing else could

**The band chip shipped with `--space-4` of vertical padding, which is 24 px of
chip in a row whose line box is 18.** Measured by `pnpm probe / --within
"Unusual activity"`: every row came out **33 px instead of 26** and the list
**329 instead of 269** — the region 60 px taller, stepping the whole lower page
at the two widths where the grid rows are untied.

**The 41 `RankedList` tests, this region's own tests and all 3,652 unit tests
were green on it.** jsdom applies no stylesheet and computes no layout. It is
the same class `.bar` and `.price` each paid for once at 390, found the same way
and by nothing else — and the thirty seconds the probe costs against the five
minutes the browser suite costs is the whole of `CLAUDE.md`'s working loop
earning its place again.

The repair is `padding: var(--border-width) var(--space-4)` with the bordered
variant taking `0` vertically and letting its own border make up the two pixels:
`0 + 0 + 16 + 1 + 1 = 18`, equal to the filled chips' `1 + 1 + 16`. **The
line-height is NOT re-declared**, because `.badge` composes `microLabel` which
declares it and `a-compose-never-carries-an-override` would fail the build —
correctly, since `type.module.css` lands later and the declaration would be
silently ignored.

**And it left a check behind rather than a comment.**
`overview-unusual-denominator.spec.ts` now asserts the row pitch and the list's
height, so the next cell added to this row goes red in CI rather than on
somebody's screen.

### The row, measured at four widths

| width | row grid (resolved) | name   | list   | region |
| ----- | ------------------- | ------ | ------ | ------ |
| 1440  | `15 68 57 44 76`    | 57 px  | 269 px | 491 px |
| 1024  | `15 68 72 44 76`    | 72 px  | 269 px | 491 px |
| 768   | `15 68 435 44 76`   | 435 px | 269 px | 458 px |
| 390   | `15 64 77 44 76`    | 77 px  | 269 px | 458 px |

Ten rows at a 27 px pitch in every state, in all five Storybook states and on
`/` itself. **The region's heights are unchanged from its pre-change figures.**

**The name paid for the chip, and by more than this task predicted.** The task
budgeted the score at two glyphs (~28 px) and the chip at ~72, leaving the name
~77 at 1440. Two measured things moved it: the score cell **keeps the direction
glyph**, so it is 44 and not 28, and the widest band word is **`elevated`
(8 glyphs)** rather than `extreme` (7). The ordinal's 64 → 44 paid for less than
half the chip; the rest came out of the name, which is **57 px at 1440** against
125 before — about eight characters, ellipsised.

### The chip, measured in the cold-load face

`AnomalyBadge.badge` composes only `microLabel`, which sets **no
`font-family`**, so the chip inherits `--font-sans`. Measured with the webfont
aborted, at 11 px with `0.08em` tracking and `--space-4` either side:

| band       | shipped | cold-load |
| ---------- | ------- | --------- |
| `normal`   | 57.14   | 60.78     |
| `elevated` | 66.05   | **69.64** |
| `high`     | 37.19   | 39.27     |
| `extreme`  | 62.72   | 65.52     |

The track is **76**, holding the widest word in the face a cold load gets with
**6.36 px** to spare. The cold-load inflation is **×1.045–1.064** against the
×1.148 `RankedList.module.css` records for five glyphs of `--font-data`: the
principle transfers and **the number does not**, which is this task's own
premise 3 confirmed by measurement rather than accepted. The **height is 18 px
in both faces**, which is the figure the region's height actually rests on.

### The row-shape assertion sweep

**Taken before any change, with the command**: 28 role-based row assertions
across 10 e2e specs and 46 across 7 component test files by a wide grep; **64
`row`/`listitem` role assertions across 16 files** by the narrow one. `UniverseTable`
holds 16, `RankedList` 15.

**Changed: the `unusual` anatomy's own, and nothing else.** The row gained a
fifth `<li>` child in one anatomy; the sector and mover anatomies are untouched
and `UniverseTable` is a `<table>` this task never reaches. Specifically:

- `RankedList.test.tsx` — the `four cells a row` assertion became **five**, and
  four assertions were added beside it (the chip's written word, that a listener
  gets it, the empty band cell on a held pad, and the one-element figure).
- The **four `unusual` e2e specs contain no role-based row assertion** — they
  assert on ordinal **text** and on counts, which is the channel a score plus a
  chip breaks, exactly as this task predicted. Three were scoped rather than
  loosened: `>99th, 99th, 98th…` → `75, 75, 68, 64, 58` with the band words
  asserted beside them, and `toContain("99th")` → `toContain("75")`.
- `overview-degraded-grid.spec.ts`' ten furnished rows were re-scored, keeping
  the tie structure so the tie-break is still exercised rather than dodged.

### The recompute moved, and it lost an arm

`overview-unusual-ranking.spec.ts` writes the order out **by hand** so it cannot
agree with the renderer by construction. It is rewritten rather than re-pointed:
`b.rank - a.rank` became `b.score - a.score`, a different expression over a
different field. **Had it imported the comparator the rename would have been
invisible here**, and the recompute would have gone on agreeing with the
renderer — which is the one thing it exists not to do.

**One arm is a LOSS and is recorded as one.** The per-endpoint _every endpoint
is `sip`_ check was the strongest claim in that file and the endpoints left the
wire with the ordinal. The tape claim moves to the section's **one** baseline —
a weaker statement about the same fact, one field instead of twenty — and the
per-row _is this instant inside the session_ arm has no instant left to read.
What replaced them is stronger in a different direction: **every score is inside
its own cohort's declared ceiling**, which is the arm that catches a producer
ranking across scales.

### `SecurityRow` deleted, `Popover` deferred by name

**`SecurityRow` is deleted**, and the disposition is a refusal on §11's own
grounds rather than a tidy-up: it wrapped `AnomalyBadge` in a `Popover` so a
reader could **ask** for a score's explanation, and §11 requires every score to
**carry** one. `AbnormalMove.tsx`' reference to it is amended.

That orphaned `Popover`, whose disposition is **named as a deferral for Epic 7's
dense surfaces** in its own header, with a reversal trigger: _the first surface
that needs an explanation a reader asks for, on a row too narrow to carry it._
If Epic 7 closes without one, the disposition to take is deletion plus an ADR
amendment retiring the Base UI seam — not another epic of keeping it.

### What no gated machine and no person has ever seen

**A single drawn row of this.** CI's store is 516 securities with zero bars, no
provider and **no composite generation**, so every gated run draws ten held pads
and the honest-nothing sentence, permanently. The local store has no `iex` row
and no provider either, so the only place a score has ever been drawn is
**Storybook**.

`LIVE-REHEARSAL.md` carries row **5.6** unwatched; this task does not fill it.

### Amber is now reachable on `/`, and nothing here repairs it

`Unusual.tsx` recorded that _"no amber appears in this region, so that collision
stays Story 5.6's and is unreachable from `/` today."_ **That is false as of
this commit** and the claim is amended in place. `market.css` resolves
`--anomaly-high`, `--feed-stale`, `--service-degraded` and
`--provenance-synthetic` all to `--palette-amber`, so this region's chip and the
chrome's degraded words are one hue on one screen. **Task 5.6.8 photographs
it**; the repair needs the photographs first.

## For a stakeholder — a status report, 2026-10-28

**The landing page now ranks by the score the epic exists for.** `/`'s `Unusual
activity` used to list the ten securities whose last five-minute move sat
furthest out in their own history, drawn as an ordinal — `99th`. It now lists
the ten with the highest **composite anomaly score**, drawn as a 0–100 figure
with its band written beside it: `61 ELEVATED`. The security page and the
landing page finally agree about what is being ranked.

**The region says what scale it is on, which is the part that is easy to miss.**
Not every security can be scored on every factor, and a score computed from
fewer factors is not comparable with one computed from more — so the page ranks
within one group, names it (`a score on 2 of 3 factors, to a maximum of 75`),
and says how many it set aside. Today that last number is always zero, because
every scored security happens to be in the same group. The machinery is there
for the day it is not.

**The geometry held, and one defect was caught by looking.** The region is the
same height it has always been at every width, after a first draft that made
every row a quarter taller and would have pushed the whole lower half of the
page down. No test in the repository could see it; opening the page with a
measuring tape took thirty seconds.

**What nobody has seen is a single row of it working.** The data this ranking
needs does not exist on any machine we control — not on the build servers, not
on a developer's laptop. Every figure above was drawn in the component workshop.
A person watching the deployed product during a real session is still owed, and
is recorded as owed.

---

## Amended 2026-10-28, the same day, by the owner — THE CHIP CAME OFF THE ROW

**The per-row band chip above was built, probed and correct, and it was the
wrong drawing for this surface.** It was removed by looking at the rendered
page; nothing mechanical could have raised it, and everything above about it is
left standing because the measurements are what argue the replacement.

### The measurement, which is the chip's own argument carried one step further

`Unusual.tsx` had written down why Story 5.4's Gate 1 could ever be reversed:
_at which point the chip stops being a property of the selection and becomes a
property of the day._ It is. Against the stored composites: **`distinct bands
in top 10: 1`**, all `extreme`, out of **16** `extreme` securities in the whole
universe. Task 5.6.3 had already measured **all ten rows sharing one band in 35
of 77 instants** and **more than three sharing one in 77 of 77**. A top-N
selected for extremity and bucketed by extremity concentrates in the top bands
**by construction** — which is also why that story's own _more than three rows
share a band_ trigger was dead on arrival.

So the chip spent **76 px of a 308 px row — 25%** — repeating one word ten
times, and the company name paid for it at **57 px, about eight characters**:
`Dominio…`, `The Kra…`, `3M Co…`, `ExxonM…`. That reads as broken rather than
as designed, which is `CLAUDE.md`'s own UI bar failing.

**A property of the day is stated once.**

### The wording, and the span that was refused on a measurement

The head slot reads **`Top 10 · all extreme`** when the ranked rows share one
band and **`Top 10 · led by extreme`** when they do not. `boundOf` in
`apps/frontend/src/market/unusual-activity.ts` is the one home.

The rows arrive score-descending and the band is monotone in the score, so the
available honest statements are _all X_, _X down to Y_, and _the leader is X_.
**The span does not fit**, measured in the cold-load face in `.bound`'s own
face at 1440:

| string                         | px     |      |
| ------------------------------ | ------ | ---- |
| `Top 10 · all extreme`         | 141.31 | fits |
| `Top 10 · all elevated`        | 145.45 | fits |
| `Top 10 · led by extreme`      | 162.36 | fits |
| `Top 10 · led by elevated`     | 166.48 | fits |
| `Top 10 · extreme to high`     | 170.91 | fits |
| `Top 10 · elevated to normal`  | 196.55 | OVER |
| `Top 10 · extreme to elevated` | 201.28 | OVER |

The head's content box is **308 px** at 1440 **and at 390** — the binding
width, because 1024 is wider and 768 is 686 — of which the region title takes
**120.3** and `Panel.header`'s gap takes **16**, leaving the slot **171.7**.
Every span of more than one step is over that line by 25–30 px, and **the
failure is not a clipped word**: `Panel.headings` carries `min-width: 0`, so an
oversized slot wraps `Unusual activity` onto a second line and takes the
region's height with it — at 768 and 390 the grid row is content-sized, so the
whole lower page steps. A clause that fits on most days and steps the page on
the rest is worse than one that never does.

Of the two endpoints, the **leader's** band is carried: it is the row the
reader's eye is already on, it answers _is today worth looking at_, and a quiet
day states itself (`led by elevated` is how a top ten says it found nothing
extreme). `Top 10` stays — it is the only surface saying the list is a
**selection**. The margin at the widest string is **5.2 px**, which is why
`overview-unusual-denominator.spec.ts` now asserts the head is one line rather
than a comment saying it should be.

**The band word stays written, never abbreviated**, for the chip's own reason:
the ramp's greyscale steps are 1.12 / 1.43 / 1.59 — enough to see a change and
nowhere near enough to name one.

### Amber: the heading carries the word and NOT the fill

**Fewer amber positions is better and the heading reads correctly without
one**, so there is no fill. The consequence is that `/` is back to the state
`Unusual.tsx` recorded before this task — **no amber on it at all** — and the
`--anomaly-high` / `--feed-stale` / `--service-degraded` /
`--provenance-synthetic` collision stays on the security page, where Task 5.6.8
photographs it. It is also mechanically held: `amber-appears-once-in-the-rail`
fails the build on a second stylesheet reading the ramp, so a fill added to
`Unusual.module.css` could not ship.

### The row, re-probed at four widths

`pnpm probe / --within "Unusual activity"`, 2026-10-28, against the live local
store (ten rows, all `extreme`):

| width | row grid (resolved) | name   | was | list   | header |
| ----- | ------------------- | ------ | --- | ------ | ------ |
| 1440  | `15 68 145 44`      | 145 px | 57  | 269 px | 47 px  |
| 1024  | `15 68 160 44`      | 160 px | 72  | 269 px | 47 px  |
| 768   | `15 68 523 44`      | 523 px | 435 | 269 px | 47 px  |
| 390   | `15 64 161 44`      | 161 px | 77  | 269 px | 47 px  |

The pitch is **27 px** and the list **269 px** in every state, unchanged — the
check the probe earned still holds — and the head is **one line at every
width**, with the slot at **132 px** for the live `all extreme` string.

### `AnomalyBadge.compact`: DELETED, with the reason

Its only consumer was this row. A variant with no consumer is a second
appearance to keep in step with the four fills and the three measured ink
contrasts, and nothing would ever render it; this product already has one
orphaned seam (`Popover`) and a second would make that a habit rather than a
decision. **The reversal condition**: _the first surface that needs this chip in
a column narrower than its `6rem` reserve._ What it must keep when it returns —
the width table in both faces and the **18 px height** the row's pitch rests on
— is kept in `RankedList.module.css`' `.unusual` header rather than deleted
with the rule.

Removing it left `AnomalyBadge.module.css` and `AnomalyBadge.stories.tsx`
**byte-identical to HEAD**, which is the whole of 5.6.7's diff to those two
files; `AnomalyBadge.tsx` differs from HEAD only by the recorded disposition.

### The assertion sweep, found against changed

Taken with the command, 2026-10-28:

```
grep -rn '"row"\|"listitem"\|role=.row.\|role=.listitem.' apps e2e packages \
  --include="*.ts" --include="*.tsx"
```

**83 occurrences across 21 files** (`UniverseTable` 16, `RankedList` 17, the
rest ≤ 5 each). The narrow grep — the four `getByRole`/`getAllByRole` forms —
gives **49 across 17 files**. Both are stated because the task's own prior
inventory used a third shape and reported 64 across 16; the number depends
entirely on the grep, which is this repository's own rule about counting a
phrase.

**Changed: the `unusual` anatomy's own, and nothing else.** The row lost its
fifth `<li>` child in one anatomy; the sector and mover anatomies are untouched
and `UniverseTable` is a `<table>` this change never reaches.

- `RankedList.test.tsx` — `five cells a row` → **four**; the three chip
  assertions (the word inside the fill, that a listener gets it, the empty band
  cell on a held pad) replaced by **one** that no band word appears anywhere in
  the row and no `_badge_` element is rendered; the cell-order test now asserts
  the row has four cells rather than naming a fifth.
- `Unusual.test.tsx` — the head-slot tests now assert the whole string
  (`Top 10 · all extreme`) and a new one asserts the word is written and
  **unfilled**; the list's own _no band word_ assertion kept and re-argued.
- `unusual-activity.test.ts` — _carries the PRODUCER's band_ became _puts no
  band on the ROW_, beside five new `boundOf` assertions (both sentences, the
  wire-not-derived rule, the silence, the interpolation).
- `overview-unusual-keyboard.spec.ts` — the per-row chip text assertion
  (`["extreme", "extreme", "high", "high", "elevated"]`) became the head slot's
  `Top 10 · led by extreme` **plus a count of zero chips in the region**:
  scoped, and strictly stronger about where the band may appear.
- `overview-unusual-denominator.spec.ts` — the pitch check kept unchanged with
  its measured numbers, and a **new** test asserts the head stays one line
  (title box ≤ 24 px, slot ≤ 171 px), which is the failure mode the new string
  introduces.

The other three `unusual` e2e specs and `overview-degraded-grid.spec.ts` needed
**no assertion change**: none asserts a chip, and the degraded states rank
nothing, so the head slot is silent in all of them exactly as it was.

### Gates

`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, the frontend package's
1,686 tests and `pnpm invariants` (**74 hold**) all green; `pnpm verify` green.
`pnpm e2e` is the owner's.

**The break: hand-performed, because `pnpm break` refuses a dirty target and
this task's own work is uncommitted.** `every-break-can-still-land` is inside
the green 74, which is the half that rots. `the-band-chip-puts-its-ramp-in-the-ink`
ran for real (its file is clean again) — _broken → red → restored
byte-identical_, matching `amber-appears-once-in-the-rail`. And the clause this
change is actually in — `.unusual`'s narrow-block track list, now four tracks —
was proved by hand: deleting the narrow `.unusual` block took
`every-row-variant-restates-its-tracks` red with the right message
(`1 row variant(s) state a track list above 37rem and none below it`), `1 of 74
invariants failed`, and the file was restored byte-identical by checksum.
