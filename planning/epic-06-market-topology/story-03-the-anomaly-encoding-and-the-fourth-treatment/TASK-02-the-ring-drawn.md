# Task 6.3.2 — The Ring, Drawn

**Status:** **Complete — 2026-11-03** — the five-state ladder draws and is
provable in Storybook (three new stories: the real measured distribution,
all-unscored, all-extreme); the anticipated low-fit-scale degradation of
`elevated` does not occur (node ink is constant in CSS pixels regardless of
fit scale), so no threshold was derived; the ring needs no extra edge
clearance because draw order already resolves it.
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

## What was done — 2026-11-03

**The redraw-without-remount channel.** `TopologyRenderer.setBands(treatments:
ReadonlyMap<Ticker, TopologyAnomalyTreatment>)` — a new method, implemented in
`renderer-canvas.ts` alongside `resize`/`reset`. Calling it replaces the
closure's `bands` map, regroups the 501 equities into treatment buckets
(`regroupAnomalyTreatments`, O(501), run once per call rather than once per
frame) and calls `invalidate()` — no DOM mutation, no re-mount, a reader's pan
and zoom survive. `TopologyAnomalyTreatment = AnomalyBand | "unscored"`, new in
`renderer.ts`: a symbol with no entry in the map draws `normal` (today's
shipped node); the fifth state, `"unscored"`, is not a reading of the score —
it is the absence of one.

**The five-state ladder**, in `renderer-canvas.ts`'s `draw()`:

- `normal` — unchanged: halo + `--chart-volume` fill. **Pixel-identical to
  Story 6.2's shipped node by construction**, not by inspection: `bodyDefault`
  (which carries `normal` **and** `elevated` **and** `high`, since only
  `extreme` touches the body) runs through the exact same circle-path,
  halo-then-fill code the single `"equity"` group used before this task: with
  an empty `bands` map every equity lands in `bodyDefault` and nothing else,
  reproducing the original code path exactly.
- `unscored` — hollow: no halo, a 1 px achromatic (`--ink-disabled`) outline,
  no fill.
- `elevated` — a 1 px ring, `--ink-secondary` (**not** `--anomaly-elevated`,
  which is `--palette-amber-pale` and therefore a hue — Gate 1 Decision 2 is
  explicit that `elevated` is achromatic; using the market-wide token here
  would have put colour on ~41% of the graph in the one ramp this screen's
  chrome already spends on degraded states).
- `high` — a 2 px ring, `--anomaly-high`, body otherwise unchanged.
- `extreme` — a 3 px ring, `--anomaly-extreme`, **and** the body's own fill
  recoloured to `--anomaly-extreme` (the one band that touches it).

Ring radius scales with `nodeScale` (the same clamp the ink itself uses, so it
tracks the node at every zoom); ring stroke width is constant in CSS pixels,
same rule as the halo and the edges.

**`TopologyPalette` gained four fields** (`anomalyUnscored`, `anomalyElevated`,
`anomalyHigh`, `anomalyExtreme`), each read from a token — never a literal,
per Story 6.1's acceptance criterion 6, which this task extends rather than
relaxes.

**`MarketTopology` gained an optional `bands` prop**, wired through a
**second, separate `useEffect`** from the mount effect — deliberately, so
`bands` changing at feed cadence (Task 6.3.3's problem, not this one's) can
never re-mount the canvas the way folding it into the mount effect's deps
would. A no-op while nothing is mounted, same contract as `resetView`.

**Three new Storybook stories** (`MarketTopology.stories.tsx`) over the real
516-node fixture: `AnomalyBandsMeasuredDistribution` (Task 6.3.1's own
counted figures — normal 33.4%, elevated 41.4%, high 21.9%, extreme 3.3% —
applied deterministically by contiguous share of the fixture's equity list),
`AnomalyBandsAllUnscored` (CI's permanent state) and `AnomalyBandsAllExtreme`
(the stress case AC 1's legibility claim needs). **Named stories rather than
an interactive control** — this file's own established idiom (one state, one
export) has no precedent for `argTypes` anywhere in this codebase, and
introducing the first one here would have been a second pattern for no gain a
reviewer could not get from three stories side by side in the workshop.

**Two measured findings, where the task anticipated a problem that turned out
not to exist:**

1. **No low-fit-scale threshold for `elevated`.** The Work item asked whether
   the ring reads as "located information" or "a warm wash" at 4 px node
   sizes, parallel to `TOPOLOGY_SECTOR_LABEL_MIN_SCALE`'s own derivation. That
   state is not reachable: node ink is `TOPOLOGY_NODE_INK[kind] * nodeScale`,
   where `nodeScale` answers the explicit user zoom (clamped [0.5, 1.5]) and
   is **never** a function of the container's own fit scale — confirmed by
   reading the code and corroborated visually, an equity is 8 px at 1440 and
   at 390 alike. Checked with `pnpm probe` at the narrowest real content box
   (390×780, fit scale 0.1639) and the single most crowded real cluster
   (`TECHNOLOGY`, 768×800, 83 members): both show heavy node overlap, but a
   control probe of the same crop with no `bands` passed shows the
   **identical** overlap pattern — Story 6.2's own shipped treatment, no ring
   at all. The degradation is pre-existing cluster density, out of this
   task's scope (node sizing is Story 6.6's), not something the ring
   introduces. No threshold was derived because the condition never fires;
   the finding is recorded in `renderer-canvas.ts` beside
   `ANOMALY_UNSCORED_STROKE_WIDTH` so it does not have to be rediscovered.
2. **No extra ring clearance needed.** The Work item asked whether a ring
   sitting flush against the halo notches the same way an edge ending exactly
   on it would. Checked at 20× crops of real ringed nodes with an incoming
   membership edge (`pnpm probe` against `AnomalyBandsMeasuredDistribution`):
   no notch, in any of the three rings. `EDGE_END_CLEARANCE`'s own 5.5 px
   endpoint for an equity geometrically reaches into where a `high`/`extreme`
   ring is painted, but the **draw order** — edges, then node bodies, then
   this ring, each pass painting fully over whatever is already there —
   resolves it before it can be seen, the same mechanism that already lets
   the halo cover an edge's end. Recorded beside `EDGE_END_CLEARANCE` itself.

**Tests.** `MarketTopology.test.tsx` gained three: `setBands` is called once
at mount with an empty map when `bands` is omitted (so "absent" and "an empty
map" provably draw the same picture); a changed `bands` map redraws through
`setBands` without a re-mount (`mountCanvasTopology` called once, `destroy`
never called); an unchanged-by-identity `bands` across a re-render does not
call `setBands` again. **13 of 13 tests pass** in that file (10 pre-existing +
3 new) — the drawing itself is deliberately untested below a browser, same
rule this file's own top note states: jsdom has no 2d context, so a
`renders without crashing` assertion over the drawn graph would be green
whatever the renderer did.

### Gates

`pnpm --filter @marketpulse/frontend test MarketTopology` → 13/13.
`pnpm --filter @marketpulse/frontend typecheck` → exit 0. `pnpm lint`
(`eslint . --max-warnings 0`) → exit 0. `pnpm format:check` → exit 0.
`pnpm build` (tsc -b, Vite bundle, Storybook build) → exit 0. `pnpm test`
(`pnpm -r run test`) → shared 667/667, backend 1344/1344, frontend
1720/1720. `pnpm verify` (build → lint → format:check → stories → env:check
→ links → invariants (80 hold) → coverage:check → test → test:scripts →
test:process) → **exit 0**.

`pnpm probe` against a real Storybook instance (not a gate — this task's own
Work item's measurement method) at 1440×900, 768×800 and 390×780, in colour
and in greyscale, across all three new stories plus a `WholeUniverse` control
— findings quoted above. Screenshots were not kept (`.probe/` is gitignored,
per house convention for a throwaway instrument); the two measured findings
they produced are recorded in code and here instead.

## For a stakeholder — a status report, 2026-11-03

This task is still invisible on `/` — on purpose, per the task's own brief.
What it built is the mechanism the graph needs before an anomaly band can
ever reach the screen: a way to redraw 501 nodes with a new "how unusual is
this" treatment without throwing away whatever a reader was doing with the
graph (panning, zooming) at the time, and the five distinct looks a node can
now take — calm, hollow (we don't know), a faint ring, a bolder ring, or the
loudest treatment with its own colour. All five are demonstrated in the
design workshop (Storybook) against the real 516-security market, including
the exact numbers Task 6.3.1 measured for an ordinary day and the two edge
cases (nothing scored at all, which is what every automated test environment
looks like; everything scored at the extreme, a stress test).

Two things the task asked to check turned out not to be problems. The
worry that a faint ring might become illegible on a small screen does not
apply, because this renderer's nodes do not actually shrink on a small
screen — only their spacing does — so there is nothing to derive a
cutoff for. And a worry that a line connecting two nodes might visibly cut
into the new ring checked out fine too, because of the order things are
painted in.

Nothing was deliberately left undone within this task's scope. Wiring this
mechanism to the real live market (deciding what the picture shows when the
feed actually updates) is the next task's job, not this one's.
