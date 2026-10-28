# Task 5.6.7 — The landing page ranks the composite

**Status:** Not started
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

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
