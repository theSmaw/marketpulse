# Task 6.6.1 — Edge strength, measured and drawn

**Status:** Not started
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
