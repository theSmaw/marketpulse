# Task 6.1.2 — The Renderer, Chosen by Measurement

**Status:** **Complete — 2026-10-30**
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

## What was done — 2026-10-30

**Candidate B — the hand-rolled Canvas2D renderer — won, and Candidate A was
deleted in the same change.** [ADR 0048](../../../docs/adr/0048-the-topology-renderer-chosen-by-measurement-where-the-graph-model-lives-and-why-the-layout-is-closed-form.md)
is the decision; `PRODUCT_SPEC.md` §27 carries a dated amendment recording that
its WebGL intent was overruled by its own measurement clause.

**The frame rate did not decide it, and that is the finding rather than a
shortfall.** The story's own Gate 1 predicted it in as many words — _"both
candidates will pass §28's 60 FPS comfortably at this size … this story's
measurement prices the two candidates rather than separating them at scale"_ —
and the figures below are that prediction coming true to the decimal. What
decided it is **334× the gzipped cost for a worse picture**.

### What was built

- `apps/frontend/src/topology/` — the second `PRODUCT_SPEC.md` §26 feature
  module, with its barrel and its `no-restricted-imports` boundary entry in the
  **same** `patterns` array as `market/`'s. Six files: `renderer.ts` (the seam
  and the node ladder), `fit.ts` (the affine transform and the zoom rule, pure
  and unit-tested), `palette.ts` (every colour and type value, read from tokens,
  throwing rather than defaulting), `graph-source.ts`, `renderer-canvas.ts`, and
  — for the length of this task — `renderer-sigma.ts`.
- `apps/frontend/src/components/MarketTopology/` — one component, one container,
  one sizing path, one palette, one graph, and a `renderer` prop as the **only**
  difference between the two arms. That is why the comparison is about drawing
  rather than about two mount paths.
- `scripts/topology-instrument.mjs` and `scripts/topology-bundle.mjs` — the
  measurement.
- `assertStorybookBuild` in `scripts/overview-instrument.mjs`, with its own
  negative proof in `scripts/prove-instrument.mjs`.

### The instrument fixes, both of which this task's figures depend on

**1. `assertStorybookBuild`, a second detector rather than a loosened regex.**
`assertProductionBuild` is keyed on `/assets/index-*.js`, which `storybook
build` does not emit. Both fingerprints were **recorded from both ends** rather
than inferred:

```
# storybook dev -p 6016 --no-open, then curl http://localhost:6016/iframe.html
window.CONFIG_TYPE = 'DEVELOPMENT';
<script type="module" src="/@vite/client"
  (no assets/iframe-*.js anywhere in the document)

# storybook build, then apps/frontend/storybook-static/iframe.html
window.CONFIG_TYPE = 'PRODUCTION';
./assets/iframe-BDppRiLe.js        45 bytes — a re-export stub
./assets/iframe-BFxUIUj8.js   1,159,176 bytes — the workshop itself
  (no @vite/client anywhere in the document)
```

Three conjuncts, any one of which refuses. **And the first draft took `[0]` of
the bundle matches and reported the artefact at `0 KiB`** — the 45-byte stub —
which is a fingerprint that passes while printing a figure nobody can use. It
sums every match now.

`node scripts/prove-instrument.mjs`, **15 of 15 proved**, verbatim:

```
  PROVED   a storybook dev server is refused, and the built workshop is not
            planted: "CONFIG_TYPE = 'DEVELOPMENT' + /@vite/client at /iframe.html"
            refusal: "Error: http://127.0.0.1:50068/iframe.html is NOT a built Storybook — @vite/client=true CONFIG_TYPE=DEVELOPMENT bundles=[]. A dev server serves unminified modules through an on-dema"
            builtBundle: "iframe-BDppRiLe.js + iframe-BFxUIUj8.js"
            builtConfigType: "PRODUCTION"
            builtBundleKiB: 1132
            builtRefusal: null
```

The proof has **both halves** — the planted dev fingerprint refused, and the
artefact `pnpm build` produced accepted — because a refusal that refuses
everything is not a detector either.

**2. The frame-rate plant lives inside the render loop, and no DOM is watched at
all.** Both candidates call a `probe` once per **drawn** frame, from inside
their own draw; the plant is a block inside it. This is not a nicety: **a canvas
mutates no DOM**, so `overview-instrument.mjs`' repaint arm would read silent
for a working graph exactly as it would for one that painted once and died —
and **that failure was produced here rather than imagined.** Candidate A's first
build drew a complete, correct 518-node graph and reported **zero** frames,
because Sigma's constructor renders before an `afterRender` listener can be
attached and then never renders again without input. A DOM watch would have
called that a success.

### The figures, verbatim

`node scripts/topology-instrument.mjs --headed`, 2026-10-30, on the built
Storybook asserted on the wire, 1440 × 900, two interleaved passes per
candidate, 518 nodes / 514 edges, machine load **2.08 across 8 cores (ratio
0.260)** read **before** the run:

```
2. BUILT STORYBOOK — http://127.0.0.1:49807/iframe.html
   CONFIG_TYPE=PRODUCTION bundle=iframe-BDppRiLe.js + iframe-BFxUIUj8.js 1132 KiB

3.1 Candidate A — Sigma.js 4 + graphology (WebGL2)
    GPU            ANGLE (Apple, ANGLE Metal Renderer: Apple M3, Unspecified Version)
    DOM nodes      172
    plant 120 ms   LoAF [135.9,120.6,121.5,121,135.2,120.5,120.8,120.7,137.2,120.4,120.6,120.5,121.4,120.4,120.3,120.3] longtask [121,120,121,120,120,120,120,120,120,120,120,120,120,120,120,120] rAF-gap [116.5,116.9,116.6,132.1,115.7,117.7,116.6,116.7,116.7,116.7,116.6,116.6,116.7,116.7,116.6,114.8]
    frames drawn   115 in 2643 ms (43.5/s)
    rAF gap        {"n":161,"p50":16.7,"p95":18.4,"max":31.9,"min":14.7}
    over 16.7 ms   82 of 161   over 50 ms 0
    LoAF > 50 ms   0   longtask entries 0   excluded (ended before the run) 0
    calibrator     {"n":20,"p50":2,"p95":6,"max":6,"min":1.5}

3.1 Candidate B — hand-rolled Canvas2D (zero dependencies)
    GPU            ANGLE (Apple, ANGLE Metal Renderer: Apple M3, Unspecified Version)
    DOM nodes      171
    plant 120 ms   LoAF [137.5,137.1,136.8,137.1] longtask [121,120,120,120] rAF-gap [117.3,116.7,116.7,116.6]
    frames drawn   54 in 2615 ms (20.7/s)
    rAF gap        {"n":159,"p50":16.7,"p95":18.4,"max":33.3,"min":14.7}
    over 16.7 ms   88 of 159   over 50 ms 0
    LoAF > 50 ms   0   longtask entries 0   excluded (ended before the run) 0
    calibrator     {"n":20,"p50":1.7,"p95":5.8,"max":5.8,"min":1.4}

3.2 Candidate A — Sigma.js 4 + graphology (WebGL2)
    GPU            ANGLE (Apple, ANGLE Metal Renderer: Apple M3, Unspecified Version)
    DOM nodes      172
    plant 120 ms   LoAF [141.2,120.8,121.3,121.1,131.6,120.3,121,120.7,120.6,120.4,120.5,120.7,135.7,120.6,120.6,120.5] longtask [123,120,121,121,120,120,121,120,120,120,120,120,120,120,120,120] rAF-gap [118.6,116.6,133.4,116.6,116.6,116.7,116.7,116.7,116.7,116.7,115.1,134.9,118,115.6,117.7,116.7]
    frames drawn   115 in 2628 ms (43.8/s)
    rAF gap        {"n":160,"p50":16.7,"p95":18.4,"max":35,"min":14.6}
    over 16.7 ms   86 of 160   over 50 ms 0
    LoAF > 50 ms   0   longtask entries 0   excluded (ended before the run) 1
    calibrator     {"n":20,"p50":2,"p95":6.4,"max":6.4,"min":1.5}

3.2 Candidate B — hand-rolled Canvas2D (zero dependencies)
    GPU            ANGLE (Apple, ANGLE Metal Renderer: Apple M3, Unspecified Version)
    DOM nodes      171
    plant 120 ms   LoAF [137.9,137.5,137.1,137.2] longtask [121,120,120,120] rAF-gap [116.7,116.4,116.6,116.6]
    frames drawn   54 in 2612 ms (20.7/s)
    rAF gap        {"n":159,"p50":16.7,"p95":18.4,"max":33.3,"min":14.7}
    over 16.7 ms   88 of 159   over 50 ms 0
    LoAF > 50 ms   0   longtask entries 0   excluded (ended before the run) 1
    calibrator     {"n":20,"p50":2,"p95":6.1,"max":6.1,"min":1.6}

Load 2.08 before, 2.46 after (ceiling 1, 8 cores).
```

**Every channel caught its own plant in every arm, per candidate** — the `plant
120 ms` lines above are the transcript of that, three channels wide. A channel
going quiet and a cost going away produce the same output, and none of these
channels went quiet.

**`frames drawn` is NOT a frame rate and must not be read as one.** The two
numbers — 115 against 54 — are two **redraw policies**, not two speeds.
Candidate B invalidates on input and draws exactly once per event: 24 + 24
pointer moves and 6 wheel notches is **exactly 54**. Candidate A animates its
camera transitions over several frames. The comparable figure is the rAF-gap
distribution, and it is identical.

`node scripts/topology-bundle.mjs`:

```
  A       Sigma.js 4 + graphology
             532137 B minified     120142 B gzipped   (+117219 B gzipped over the shared half)
  B       hand-rolled Canvas2D
               8530 B minified       3274 B gzipped   (+351 B gzipped over the shared half)
  shared  the shared half alone (fit, palette, graph source)
               7593 B minified       2923 B gzipped

  installed  sigma              3408191 B
  installed  graphology         2729833 B
```

**This is not what `/` will pay**, and saying so is part of the figure: both
candidates were reachable only from a `.stories.tsx`, which Rolldown tree-shakes
out of the application entry entirely, so the app-bundle delta is **0 bytes for
both** — a true number that means nothing. Story 6.2 takes the real one.

### What Candidate A could not draw, photographed rather than argued

Three things, and all three are properties of the library rather than of the
time spent on it:

1. **The 1 px `--surface-raised` halo.** Sigma 4 ships exactly one node fragment
   layer, `layerFill`; a border needs a `CustomNodeLayer` with hand-written
   GLSL. Candidate B gets it free, as the same batched path stroked at
   `lineWidth: 2` before it is filled.
2. **The edge gap at both ends.** Sigma's edge extremities are arrows and
   squares; there is no _stop short of the node_.
3. **Either label placement.** Sigma's label margin is one setting for the whole
   graph and `NodeDisplayData` carries no per-node offset, so a sector name
   asked to sit clear of its cluster's own derived radius (53–106 units) lands
   **on** the centroid, and a proxy ticker below its diamond lands on the next
   diamond in a column 32 units apart. `labelPosition: "right"` is reachable,
   collision-free and **not what the design asks for**.

So **Candidate A drew strictly less at the same node and edge count and was no
faster for it.**

### Three defects found by LOOKING at the built page, invisible to everything mechanical

This is the working loop's own rule paying out three times in one task, and
every one of them was green on 3,6xx unit tests, `pnpm lint` and `tsc -b`.

1. **Candidate A reported zero frames while drawing a complete graph** — see the
   plant note above. Repaired by attaching `afterRender` and forcing one
   `refresh()`, with the reason written beside it.
2. **Candidate A's labels were in Storybook's own inherited face, at Sigma's
   default size and position, and no token had reached them.** A Sigma 4 styles
   declaration **replaces** the defaults rather than extending them, so
   `labelFont`, `labelSize` and `labelPosition` have to be declared or the
   attributes are ignored. The graph looked right, which is acceptance criterion
   6's failure mode arriving by the one route a colour check cannot see.
3. **Candidate B labelled every non-equity node**, printing eleven ETF tickers
   into the middle of eleven clusters that had just been labelled with their
   sector names, and stacked the three proxy tickers on top of each other in a
   32-unit column. The design work's count is literal: **eleven sector names,
   four proxy tickers, 501 deliberate silences**. Repaired, and the
   `MARKET PROXIES` heading the column was missing was added with it.

### Two instrument defects found by reading the output rather than the verdict

1. **The first headed run reported one `long-animation-frame` over 50 ms in all
   four arms** — 50.2 to 65.9 ms, which would have been a §28 breach in both
   candidates. Adding the run's own opening instant to the record showed every
   one of them had `scriptMs: 0`, no invoker, and `intoRunMs` **negative**:
   `-50.9`, `-51.6`, `-52.4`, `-62.7`. They were the frame the **calibrator's
   own `page.evaluate` loop** was straddling — a figure the instrument caused,
   arriving in the acceptance channel. They are now excluded **by position**
   rather than by size, so a real long frame of the same duration is still
   reported, and the count of exclusions is printed.
2. **The headless run measured a WebGL library on a software rasteriser.**
   Headless Chromium on this machine reports
   `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) (0x0000C0DE)), SwiftShader driver)`;
   `--headed` reports `ANGLE (Apple, ANGLE Metal Renderer: Apple M3, …)`. Under
   SwiftShader, Candidate A drew **32.0–32.6 frames a second** against the same
   path it manages **43.5–43.8** on the real device. Every figure quoted here
   names the renderer string it was taken under, and that is not optional.

### What nobody has seen, and what this does not certify

- **No person has looked at this**, and nothing is on a route. The built
  Storybook is the only surface it exists on.
- **518 nodes and 514 edges, not 516 and 512.** The harness draws the recorded
  `GET /securities` body, taken 2026-09-11, before the 2026-10-12 curation
  untracked `PSKY` and `WBD` — two nodes and two edges **more** than the
  deployed universe, which is the conservative direction. Re-recording that body
  is a change to a fixture six other components' stories read.
- **One machine, headed, on an Apple M3.** Nothing here is a claim about a phone
  or about CI.
- **512 edges against §28's 5,000.** §28 takes its amendment at Story 6.5, not
  here.
- **`pnpm verify` cannot see a single colour, shape or frame this renderer
  draws.** jsdom applies no stylesheet, so `getTokens()` throws there by design.
  `fit.ts` is the only part a unit test reaches, and it is tested.

### Handed on, in words rather than as links

- **To Task 6.1.3.** The **sector labels collide with neighbouring clusters** at
  the fitted scale — `CONSUMER DISCRETIONARY` crosses into Financials and
  `COMMUNICATION SERVICES` into Industrials, visible in
  `.capture/topology/candidate-B-pass-2.png`. The cause is upstream of the
  renderer: the layout's wedge allocation gives every cluster **25% more arc
  than it occupies** for its **circle**, and reserves nothing for the 24 units
  of label room above it. Placing the label radially outward instead of straight
  up fixes it and is a **design decision** the canvas has to take, not a
  renderer one. Also still owed from that task's own list: the market-proxies
  story, `retryable`/`retrying`, the jsdom component test, and the `pnpm probe`
  pass at four widths.
- **To Task 6.1.4.** The `pnpm invariants` entry refusing a colour literal in the
  renderer's corpus (story acceptance criterion 6) is **not written** — this
  task added no `pnpm invariants` entry and therefore owes no `pnpm break`. The
  corpus it would run over now exists.
- **To Story 6.2.** `scripts/topology-instrument.mjs` keeps a candidate **list**
  and interleaved passes on purpose: the elliptical ring against `/`'s real
  1392 × 520 box is a second arm over the same scripted path.

## For a stakeholder — a status report, 2026-10-30

**Nothing changed on any screen, and the thing that changed is a decision we can
now defend with numbers.**

The market map needed a drawing engine. The product specification had named a
well-known graph library as the likely choice and committed the feature to GPU
rendering. Rather than take that on trust, we built **both** — the named library
and a from-scratch version with no dependencies at all — far enough that each
drew the whole tracked market, then drove both through an identical, scripted
five-second pan-and-zoom and measured them side by side.

**They are indistinguishable on smoothness.** Both held sixty frames a second
with nothing over the threshold the performance targets set, in every run. The
from-scratch version costs **117 KB less to download — a factor of 334** — adds
**no** third-party dependency, and draws a **better** picture: three details our
designer specified turned out to be things the library cannot express at all.

So the from-scratch renderer ships, the library's code was deleted the same day
rather than left lying around, and the specification now carries a dated note
saying its own measurement clause overruled its own recommendation. The decision
is written down with the figures, the four alternatives we rejected on reasoning
rather than on measurement, and the exact condition under which it should be
re-opened — a bigger graph, which the correlation work later in this epic is
expected to bring.

**Still owed:** nobody has looked at this on a real screen yet, and it is not on
any page — both are the next two tasks.
