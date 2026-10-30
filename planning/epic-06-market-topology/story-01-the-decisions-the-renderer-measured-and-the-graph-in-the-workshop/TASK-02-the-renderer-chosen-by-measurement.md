# Task 6.1.2 — The Renderer, Chosen by Measurement

**Status:** Not started
**Story:** [6.1 The Decisions, the Renderer Measured, & the Graph in the Workshop](STORY.md)
**Depends on:** 6.1.1

## Objective

This epic's exit criterion needs the universe to be explorable **smoothly**,
and nothing in this repository has ever rendered a canvas or measured a frame
rate under sustained interaction. §27 names Sigma.js as a recommendation, not
a mandate — this task is where the recommendation either earns its place or
does not, against a real zero-dependency alternative, on this story's own
settled rule: the figures decide, even if that means no WebGL ships anywhere
in this product.

## What the user can see when this lands

**Nothing on a route.** A decision is made and recorded — ADR 0048 — and it is
verifiable in a built Storybook, which Task 6.1.3 turns into the real graph.

## Work

- **Build Candidate A** inside `apps/frontend/src/topology/` (not
  `packages/shared` — graphology is a browser-oriented mutable structure and
  must never reach the backend's dependency tree): Sigma.js + graphology,
  constructed from `TopologyGraph`/`TopologyLayout` at mount, far enough to
  draw the full 516-node, 512-edge graph with the node/cluster/edge treatment
  from the design work.
- **Build Candidate B**, same module, same inputs: a hand-rolled Canvas2D
  renderer — one `<canvas>`, DPR-scaled, pan/zoom as a single affine transform,
  nodes as `arc()`/`rect()` fills per kind, edges as batched paths per edge
  kind, hit-testing against the layout's own coordinates. Zero new
  dependencies.
- **Record, with figures rather than building them, the rejected candidates**:
  PixiJS/three.js (a general scene graph with no graph semantics — you still
  write Candidate B's logic and pay 100–400 kB gzipped for an abstraction you
  do not use), `react-force-graph`/`force-graph` (drags d3-force _and_
  three.js, and its graph object _is_ its renderer's model, which breaks
  AC 2 structurally), Cosmograph/regl-based GPU layouts (GPU-resident force
  simulation, which is the non-determinism AC 3 refuses in the one place it
  cannot be configured away).
- **Fix the measurement instrument before trusting either figure** —
  this is not optional and it is this task's real risk:
  - `scripts/overview-instrument.mjs`'s `assertProductionBuild` matches an
    `/assets/index-*.js` fingerprint that a `storybook-static` build does not
    emit. Add a **second, separately named and separately proved**
    `assertStorybookBuild`, with its own negative proof in
    `scripts/prove-instrument.mjs` refusing a `storybook dev` server (follow
    the shape of the instrument's four existing negative proofs).
  - The repaint arm watches `<main>`, which does not exist in a Storybook
    iframe, **and a canvas mutates no DOM at all** — that channel is silent
    for a working graph exactly as it would be for a broken one. The
    frame-rate plant for this task must live **inside the render loop** (a
    known-cost per-frame block, or a `readPixels`-based assertion), never
    watch the DOM.
- **Measure, per candidate, at the real 516-node / 512-edge universe, on the
  built Storybook, nothing else**:
  - `document.visibilityState` checked first.
  - Machine load read **before** the run, never during.
  - 60 FPS "during normal interaction": a **scripted, identical-for-both**
    pan/zoom path (fixed wheel deltas, fixed drag polyline, ~5 s, driven over
    CDP), rAF-gap recorder, worst and p95 gap against the 16.7 ms quantum.
  - No task over 50 ms: three channels (`longtask`, `long-animation-frame`,
    rAF-gap), each proved by its own in-render-loop plant.
  - DOM-node count inside the iframe at the full universe
    (`document.querySelectorAll("*").length`).
  - Bundle: the Storybook bundle's own gzipped delta, plus each library's
    installed/minified size — **and state plainly that this is not what `/`
    will pay**, because Rolldown tree-shakes anything reachable only from a
    `.stories.tsx` out of the app entry (6.2 takes the real app-bundle figure
    against whichever candidate wins).
- **Decide, in writing, before Task 6.1.3 starts**: the loser is not built
  further.
- **Write ADR 0048** — _the topology renderer, chosen by measurement; where the
  graph model lives; and why the layout is closed-form._ Three decisions, each
  with alternatives and a reversal trigger as a condition:
  1. The renderer — trigger: _the first graph this product renders whose node
     or edge count exceeds what the measured candidate was measured at._
  2. The model's home and the renderer-type refusal — trigger: _the first
     consumer of the graph model that is not a browser_ (Epic 7's tools).
  3. The closed-form layout — trigger: _the first edge kind whose strength is
     a measurement rather than a membership_ (Story 6.5).
     Name the check beside each decision: the `Math.random()` invariant, the
     no-renderer-type invariant, and (if Candidate A loses) record that §27 takes
     a dated amendment the same day, in the same commit as the ADR.

## Done when

1. Both candidates draw the full real universe in a throwaway harness.
2. `assertStorybookBuild` exists, is proved by its own negative test, and both
   frame-rate figures were taken through it.
3. Both candidates' figures are recorded **verbatim** (frame/row/distribution,
   not just a conclusion) in this task's own record, per this repository's
   throwaway-instrument rule.
4. ADR 0048 is written, indexed, and the renderer decision names a specific
   winner with its figures beside the loser's.
5. If Candidate A loses, `PRODUCT_SPEC.md` §27 carries a dated amendment in the
   same change.
6. The losing candidate's code is **deleted**, not left dormant, before this
   task closes — a comparison harness is not a second implementation to
   maintain.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
