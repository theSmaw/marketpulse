# Task 6.3.2 — The Ring, Drawn

**Status:** Not started
**Story:** [6.3 The Anomaly Encoding, & the Fourth Treatment a Canvas Needs](STORY.md)
**Depends on:** nothing (independent of 6.3.1 — this task draws from a
Storybook control, not the live wire)

## Objective

The renderer needs an update channel before it can take anomaly data at all
— it is mount-only today, and feeding a band in as a mount-effect prop
would re-mount the canvas on every batch, throwing away a reader's pan and
zoom. This task builds that channel and the visual treatment itself,
provable in Storybook before anything live exists to wire it to.

## What the user can see when this lands

**Nothing on `/`.** Provable only in Storybook, at node scale, in colour and
in greyscale.

## Work

- **A new method on `TopologyRenderer`** — `setBands(bands: ReadonlyMap<string, AnomalyBand | undefined>)`
  or equivalent — that redraws without re-mounting, parallel to the
  existing `resize`/`reset`. `renderer-canvas.ts` already batches 501
  subpaths into one `beginPath()`/`stroke()` per group; extend the grouping
  to `kind × treatment` rather than `kind` alone, so the cost stays a
  constant number of draw calls (roughly 20–30) independent of node count.
- **The treatment ladder**, per Gate 1's Decision 1/2:
  - `normal` (or no entry for a symbol): exactly today's node — filled
    `--chart-volume`, no ring. **This must be pixel-identical to Story
    6.2's shipped node**, so a quiet instant looks like the graph already
    looks.
  - **Unscored** (an equity present in the graph but absent from every band
    array): hollow — an achromatic 1px stroke, no fill. Scoped to the 501
    equities only; the fifteen sector-ETF/proxy/hub nodes never take this
    treatment (Gate 1 Decision 3) and keep their existing filled look.
  - `elevated`: a thin ring in the reserved annulus, **no hue** (Gate 1
    Decision 2) — order carried by ring weight alone.
  - `high`: a thicker ring, `--anomaly-high`.
  - `extreme`: the thickest ring, `--anomaly-extreme`, **and** the node's own
    fill changes to `--anomaly-extreme` — the only band that touches the
    body. Confirmed by contrast measurement at shaping:
    `--anomaly-extreme` against `--surface-raised` is 3.050:1, keeping the
    mark legible; the palette's `elevated`/`normal` tokens fall to ≤1.35:1
    as a fill and must never become one.
  - Ring geometry is **constant under zoom**, same rule as the edges, the
    halo and the label type (`renderer.ts` §09's own table).
- **Palette tokens**: `--anomaly-normal/elevated/high/extreme` already exist
  in `market.css`; read them through `topologyPalette()`
  (`apps/frontend/src/topology/palette.ts`), never as literals, per ADR
  0026's token chain (canvas → `VISUAL-LANGUAGE.md` → `tokens.css` →
  renderer).
- **A Storybook control** driving a simulated band map across the real
  516-node fixture — the measured distribution (pending 6.3.1's
  re-measure), an all-unscored pass (CI's shape), and an all-`extreme` pass
  (a stress case for AC 1's legibility claim at the top of the scale).
- **Exact ring widths and clearance**: derive from `pnpm probe` against the
  Storybook story at the real content box, not from argument — the same
  discipline `TOPOLOGY_SECTOR_LABEL_MIN_SCALE` was derived with. Check
  whether the ring needs the same end-clearance treatment edges get
  (`EDGE_END_CLEARANCE`), since a ring sitting flush against the halo has
  the same notching problem from the inside.
- **The low-scale case** (AC 1 at ≤860, fit scale 0.164–0.365): measure
  whether `elevated`'s thin ring reads as located information or as a warm
  wash at 4px node sizes. If it degrades, derive a fit-scale threshold
  below which `elevated` does not draw (parallel to the sector-label
  threshold) so the picture falls back to `high`/`extreme` only rather than
  a uniform haze — **derived from a measurement, never chosen**.

## Done when

1. `TopologyRenderer` has a redraw-without-remount update method, and
   calling it repeatedly does not increase the draw-call count per batch.
2. The five-state ladder (normal / unscored / elevated / high / extreme)
   is implemented, reading every colour through `topologyPalette()`.
3. `normal` is pixel-identical to Story 6.2's shipped node (a regression
   check, not an assumption).
4. A Storybook story demonstrates all five states across the real universe,
   in colour and in greyscale, at all four widths (AC 1, AC 8's Storybook
   half).
5. The ring's exact geometry (width, clearance) is measured via `pnpm probe`
   against the real content box, not argued.
6. If `elevated` degrades at low fit scale, a derived threshold suppresses
   it there, held by a test.
7. `pnpm build && pnpm lint && pnpm format:check && pnpm test` all exit 0.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
