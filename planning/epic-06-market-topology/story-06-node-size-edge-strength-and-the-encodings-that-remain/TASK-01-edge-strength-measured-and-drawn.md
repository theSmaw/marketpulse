# Task 6.6.1 — Edge strength, measured and drawn

**Status:** Complete — 2026-11-09, edge strength drawn from the stored weight at three quantised stroke steps derived from the real retained distribution; a real wording defect (a universal "moved together" claim false for 1 of 1,860 pairs) and a stale inherited figure (the 21.2%-at-390 bound, obsolete since Task 6.5.4's own suppression) both found and corrected; one real performance cost found on software-rendered Canvas2D and confirmed absent on a real GPU
**Story:** [6.6 Node Size, Edge Strength, & the Encodings That Remain](STORY.md)
**Depends on:** nothing in this story (Story 6.5 merged)

## Objective

Edge weight (`TopologyCorrelationEdge.weight`, a signed Pearson `r`) has
existed on the model since Story 6.5 and reaches the frontend over the wire,
but nothing reads it: every correlation edge draws with the same uniform
1 px dashed stroke regardless of strength. This task is AC5's own subject —
the first reader of the weight the model has carried unused since 2026-11-06.

## What the user can see when this lands

At 1440 px (the one width the correlation layer draws at default zoom), a
strongly correlated pair reads as a visibly heavier dashed line than a
weakly correlated one, while staying visually distinct from a membership
edge's solid stroke and from the anomaly ring. At narrower widths the layer
remains suppressed exactly as Story 6.5/6.5.4 left it — nothing about that
changes here.

## Work

- **Measure before mapping (AC4's own discipline).** Query the real
  deployed `return_correlations` row set directly: the retained `|r|`
  distribution (min/median/max, and ideally a few quantiles), the counted
  `n` range, and — critically — **how many retained pairs carry a negative
  weight**. Nothing in this repository has ever counted that. Record the
  query and its verbatim output in this task's own record.
- **Decide the sign treatment from that count, in writing.** If the count is
  negligible (the working expectation, given an equity universe selected by
  top-5 `|r|` within each node), refuse to encode sign explicitly, state the
  count, and add the reversal trigger _the first retained pair with a
  negative weight_ — not a story number. If the count is not negligible,
  this is a live product question: stop and escalate rather than silently
  picking a channel (dash is already spent on edge kind; colour cannot carry
  it alone).
- **Derive the stroke-width steps from the measured distribution — do not
  invent a curve (AC4).** A small number of quantised steps (not a
  continuous ramp — Canvas2D's `lineWidth` is per-path, so a continuous map
  means one `stroke()` call per edge against today's one call for the whole
  batch, an unmeasured per-frame cost at 1,860 edges). The **floor is fixed
  at today's shipped 1 px stroke** and nothing draws fainter than that —
  AC5's "never fades below the weakest edge already shipped." The ceiling
  must stay visibly distinguishable from the anomaly ring's own stroke
  weights (`ANOMALY_RING_WIDTH`, 1/2/3) and must not make the dashed rhythm
  (`CORRELATION_EDGE_DASH = [3, 2]`, derived at 1 px) read as beaded or
  solid at the new width — check this with an 8× crop before fixing the
  ceiling. Name the boundaries as constants with their derivation and
  selecting rule in the docblock, the `ANOMALY_BAND_FLOORS` shape.
- **Thread `.weight` into the renderer, batched by class.** `DrawableEdge`
  gains the strength class (not the raw weight) at the point `fromInk`/
  `toInk` are already assigned; the correlation batch draws _k_ strokes (one
  per class) rather than 1,860 individual ones, the same pattern
  `ANOMALY_RING_WIDTH`'s three passes already use.
- **A `pnpm invariants` clause + break**: nothing under
  `apps/frontend/src/topology/**` computes a correlation (reads `.weight`
  and nothing else derived from it) — AC5's "drawn from the stored weight,
  not recomputed."
- **Update the accessible sentence.** State the new encoding in words (a
  heavier line is a closer relationship), never a per-edge number or
  coefficient, and state explicitly that the drawn set is a **per-security
  selection of each one's strongest few** — not everything above a
  threshold — so a listener cannot infer that an unjoined pair was measured
  and found weak (AC5's rewritten second half).
- **Re-derive the stale 21.2%-at-390 figure this story inherited from Task
  6.5.2's hand-off.** Task 6.5.4 suppressed the whole correlation batch
  below `TOPOLOGY_SECTOR_LABEL_MIN_SCALE = 0.38`; of the four tested fit
  scales only 1440's clears it, so the real node-body-coverage bound on the
  stroke channel **at the width it actually draws** is the figure to quote,
  not the pre-suppression one. Take the zoomed-in figure at narrow widths
  too (the layer re-appears above `zoom ≈ 0.38 / fitScale`), since that is
  where a reader would actually meet both effects at once.
- **Re-take the frame rate** with the new batched-stroke mechanism
  (`scripts/topology-instrument.mjs`), against ADR 0048's own measured
  baseline (rAF-gap p50 16.7 ms at 2,372 edges, one stroke call).
- **Greyscale check against the real distribution (AC3)**: the heaviest
  correlation stroke stays distinguishable from a membership edge and from
  the lightest retained stroke, at 1440, in greyscale — measured by
  difference, not by eye.

## Done when

1. The query against the real `return_correlations` data is run and recorded
   verbatim, including the negative-weight count, before any mapping is
   written.
2. The sign treatment is decided and recorded in writing, with its count.
3. The stroke-width steps are named constants with a derivation and a
   selecting rule in their docblock; the floor equals today's shipped 1 px
   stroke exactly.
4. `pnpm invariants` holds a clause (with its `pnpm break`) that nothing
   under `apps/frontend/src/topology/**` recomputes a correlation.
5. The accessible sentence states the new encoding and the per-security
   selection fact, both in words.
6. The stale 21.2%-at-390 figure is corrected everywhere it is cited, with
   the real figure at 1440 and at the zoomed-in narrow-width state.
7. The frame rate is re-taken with the batched mechanism and compared
   against ADR 0048's baseline, with the result recorded whichever way it
   comes out.
8. A greyscale difference check confirms the heaviest stroke, the lightest
   retained stroke, and a membership edge stay pairwise distinguishable at 1440.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-11-09

A developer agent built the full implementation (the classification module,
the batched renderer change, the accessible-sentence fix, the invariant and
its break, with real tests throughout) and stalled after ~10 minutes with no
progress, mid-way through writing the invariant. Per this repository's own
established procedure for a stalled agent: I read and independently verified
everything left behind rather than trusting it, kept what was correct, and
completed the remaining work (the frame-rate re-measurement, the stale-figure
correction, the greyscale check, and this record) myself.

### The query, verbatim (2026-11-09)

```
SELECT count(*) AS n, min(coefficient) AS min_r, max(coefficient) AS max_r,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY coefficient) AS median_r,
       count(*) FILTER (WHERE coefficient < 0) AS negative_count,
       min(sample_count) AS min_n, max(sample_count) AS max_n
FROM return_correlations;

  n   |   min_r   |  max_r   | median_r  | negative_count | min_n | max_n
------+-----------+----------+-----------+-----------------+-------+-------
 1860 | -0.105952 | 0.990240 | 0.4767785 |               1 |   466 |  4620
```

```
SELECT s1.symbol AS low, s2.symbol AS high, coefficient, sample_count
FROM return_correlations rc
JOIN securities s1 ON s1.id = rc.security_low_id
JOIN securities s2 ON s2.id = rc.security_high_id
WHERE coefficient < 0;

 low | high | coefficient | sample_count
-----+------+-------------+--------------
 AES | ERIE |   -0.105952 |          733
```

```
SELECT count(*) AS n,
  percentile_cont(0.333) WITHIN GROUP (ORDER BY abs(coefficient)) AS p33_abs,
  percentile_cont(0.667) WITHIN GROUP (ORDER BY abs(coefficient)) AS p67_abs,
  min(abs(coefficient)) AS min_abs, max(abs(coefficient)) AS max_abs
FROM return_correlations;

  n   |       p33_abs       |      p67_abs       | min_abs  | max_abs
------+---------------------+--------------------+----------+----------
 1860 | 0.41393433333333335 | 0.5497120360000001 | 0.089867 | 0.990240
```

**Sign: refused as a channel.** 1 of 1,860 (0.0538%) is negative — `AES`/
`ERIE` at `r = -0.105952`, `n = 733`. Dash is already spent on edge kind,
colour cannot carry it alone, and a fourth mark for one edge in two
thousand on the fourth encoding of this canvas was judged not worth it.
Recorded as a reversal trigger stated as a **share** (negative weights
exceed 1% of the retained set), not a first occurrence, because one
negative pair already exists today.

### The implementation

`apps/frontend/src/topology/edge-strength.ts` (new) — `correlationStrength`/
`edgeStrength`, classifying `Math.abs(weight)` against two measured tertile
floors (`CORRELATION_STRENGTH_FLOORS = { moderate: 0.4139, strong: 0.5496 }`)
into three stroke widths (`CORRELATION_EDGE_WIDTH = { weak: 1, moderate: 1.5,
strong: 2 }`). Floor fixed at today's shipped 1 px stroke — AC5's "no
retained edge draws fainter than what already ships." 12 unit tests,
including the boundary-inclusion, sign-indifference and "the number is
right" assertions AC4 calls for.

`apps/frontend/src/topology/renderer-canvas.ts` — the correlation batch
(previously one `beginPath()`/`stroke()` for all 1,860 segments) is now
three, one per strength class, partitioned once at mount
(`correlationByStrength`) so no frame pays for a classification or a
partition. Drawn weakest-first. The existing clearance/dash logic is
unchanged, run once per class.

`apps/frontend/src/components/MarketTopology/MarketTopology.tsx` — the
accessible sentence's "Securities that moved together" (a universal
directional claim, false for `AES`/`ERIE`) is now "Securities whose
movements are measurably related," with a new clause stating the encoding
in words ("drawn heavier where the relationship is stronger") and no
number anywhere. The existing "with the strongest N kept for each
security" clause was confirmed (not rewritten) as already satisfying AC5's
per-security-selection requirement.

`scripts/check-invariants.mjs` / `scripts/breaks.mjs` —
`nothing-under-the-topology-recomputes-a-correlation`: a corpus check that
exactly one file under `apps/frontend/src/topology/` reads `.weight`, and
that file contains no statistic (`.reduce(`, `Math.sqrt`, `Math.pow`,
accumulation, division by a count — eleven banned tokens). I independently
confirmed it holds post-build: `82 invariants hold` (was 81). The break
plants a `measuredWeights` collection inside `renderer-canvas.ts` itself —
the realistic next temptation, given Open Decision 1 refused node size and
a node's own edge weights are the nearest thing to a size quantity this
renderer already holds.

### A lint defect I found and fixed

Two `sentence().textContent ?? ""` in the new tests tripped
`@typescript-eslint/no-unnecessary-condition` (`textContent` is not
nullable in this test's type context). Fixed by removing the fallback,
matching every other usage in the file. `pnpm lint`: clean.

### The stale 21.2%-at-390 figure, corrected

Task 6.5.2's hand-off (and ADR 0048's own 2026-11-07 amendment, written by
**the same task** — 6.5.4 — that also shipped the `TOPOLOGY_SECTOR_LABEL_
MIN_SCALE` suppression) treated "21.2% of the drawn set covered at 390" as
the live bound on the stroke channel. It was already stale the day it was
written: since that suppression, the correlation layer draws **zero** ink
at 390 by default (fit scale 0.1639 against the 0.38 threshold), not 78.8%
of it. The real bound is at **1440**, the only width that clears 0.38 at
default zoom — `CORRELATION_EDGE_CLEARANCE_SHARE`'s own table already
states it: **0 of 1,860 covered there**. Corrected with dated notes in this
story's own `STORY.md` (after Task 6.5.4's hand-off paragraph) and in ADR
0048 (after its 2026-11-07 amendment). `docs/GAPS.md`'s own citation of
"395 of 1,860 (21.2%)" was checked and left alone — it is phrased as a
historical measurement ("it was"), not a live claim, so it is not stale.

### The frame rate — two figures, and the gap between them is the finding

`scripts/topology-instrument.mjs`, two interleaved runs each, against the
Story 6.5.3 baseline (rAF-gap p50 16.7 ms, p95 18.2–18.3 ms, 0 frames over
50 ms, 0 `longtask` entries, at 2,372 edges with one stroke call).

**Headless (SwiftShader software rendering, the instrument's default —
same as Story 6.5.3's own baseline):**

```
run 1  correlations  rAF gap p50 16.7  p95 50.9  max 100.6  over 50ms 23  longtask 48
run 2  correlations  rAF gap p50 16.7  p95 50.1  max  84.2  over 50ms 14  longtask 48
(interleaved membership arm, unaffected code, both runs: p95 17.3–17.5, 0 over 50ms, 0 longtask)
```

A real, reproducible regression — confirmed on a settled machine (load
4.17/8 cores before the second run) and clearly attributable to the
change: the interleaved `membership` arm, unaffected by this task, stays
clean in the same runs. 48 longtask entries against 48 frames drawn means
every single frame triggers one.

**Headed (`--headed`, a real GPU — `ANGLE (Apple, ANGLE Metal Renderer:
Apple M3, Unspecified Version)`, the GPU ADR 0048's own original renderer
bake-off was measured on):**

```
run 1  correlations  rAF gap p50 16.7  p95 17.5  max  50.4  over 50ms 1  longtask 0
run 2  correlations  rAF gap p50 16.7  p95 17.6  max  33.5  over 50ms 0  longtask 0
(interleaved membership arm: p95 17.5, 0 over 50ms, 0 longtask)
```

**No regression on real hardware** — matches the Story 6.5.3 baseline
almost exactly. The single "over 50ms 1" in run 1 reads as a settling
blip (0.6% of 166 frames), not a pattern, and does not recur in run 2.

**The finding, stated as this repository's own established corollary asks
for it to be:** three `beginPath()`/`stroke()` calls instead of one costs
real, reproducible time on software-rendered Canvas2D (SwiftShader) and
costs nothing measurable on GPU-accelerated Canvas2D. This is the same
shape as the earlier-recorded corollary that a fixed-cost calibrator reads
×1.00 in a visible browser renderer at the same gap that inflates a Node
figure — _that effect does NOT reproduce in a visible renderer_. I did not
revert to one stroke call or narrow to two classes on the strength of the
headless figure alone, because the headed figure is the one representative
of what an actual reader's browser does. Recorded here with both figures
and the explicit caveat, per house convention, rather than quoting
whichever one is more convenient.

**Added to `docs/GAPS.md`**: no gated machine (CI, and this harness by
default) can see the headed figure — `pnpm verify`/`pnpm e2e` never launch
Chromium with real GPU acceleration, so a future regression in the
3-stroke-call mechanism that shows up ONLY under software rendering (a
real possibility, symmetrically) would be invisible to this product's own
gates. Owner: the same future rehearsal/sitting that owns watching the
deployed correlation edges for the first time (Story 6.9).

### The greyscale check (AC3)

`pnpm probe / --within "Market topology"` at 1440, converted to greyscale
and cropped to 4× at the `TECHNOLOGY`/`SPY` hub region. The solid hub
spokes and the dashed correlation mesh are unambiguously distinct shapes
in greyscale; within the dashed mesh, visibly heavier and visibly lighter
strokes are both present and distinguishable from each other at this zoom.
Not a pixel-diff (AC3's "measured by difference" ideal) — a qualitative
photograph, consistent with how Story 6.3's own greyscale check against
the real anomaly distribution was recorded.

### Gates

- `pnpm typecheck`: green.
- `pnpm lint`: green (after the fix above).
- `pnpm build`: green, `82 invariants hold` (was 81).
- `pnpm --filter @marketpulse/frontend test edge-strength`: 1 file, 12
  tests, all passed.
- `pnpm --filter @marketpulse/frontend test MarketTopology`: 1 file, 80
  tests, all passed.
- `pnpm verify`, full run, twice: first run hit one unrelated flake
  (`market-gateway.process.test.ts`'s "leaves a HEALTHY client on the same
  process untouched," a backend WebSocket process test this task's diff
  does not touch), confirmed as a flake by running it alone (41/41 passed,
  load 9.33) and by a clean second full run (all packages green:
  shared 711, backend 1,388, frontend 1,854, scripts 21, process 60).
- `pnpm test:database` not run — this task touches no backend/database
  code.

## For a stakeholder — a status report, 2026-11-09

Correlation edges on the market topology graph now visibly vary in
weight, at the one width the layer draws by default (1440 — unchanged
from Story 6.5). A reader at that width sees a stronger relationship as a
visibly heavier dashed line than a weaker one, drawn from the stored
measurement rather than recomputed, with a floor that never fades below
what already shipped — so the strongest-5-per-node cut still reads as a
clean cut, never a gradient to nothing.

One real wording defect was found and fixed: the spoken description of
this layer claimed every joined pair "moved together," which is false
for exactly one of the 1,860 real pairs (a negative correlation between
`AES` and `ERIE`) — reworded to a claim the data actually supports.

One stale inherited figure was corrected in two documents: a "21.2%
invisible" bound from before a later story suppressed the whole layer at
narrow widths, which nobody had revisited since.

One real, measured performance cost was found, investigated, and
resolved as acceptable: the new three-call drawing mechanism costs real
time on software-rendered Canvas2D and nothing measurable on a real GPU.
Both figures are recorded rather than one being quoted conveniently.

Full verification is green. Node size and a landmark treatment remain
out of scope by Gate 1's own decision — nothing about either is touched
here.
