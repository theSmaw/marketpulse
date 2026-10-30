# 0048 — The topology renderer chosen by measurement, where the graph model lives, and why the layout is closed form

**Status:** Accepted
**Date:** 2026-10-30
**Story:** [6.1 The Decisions, the Renderer Measured, & the Graph in the Workshop](../../planning/epic-06-market-topology/story-01-the-decisions-the-renderer-measured-and-the-graph-in-the-workshop/STORY.md)
**Tasks:** [6.1.1](../../planning/epic-06-market-topology/story-01-the-decisions-the-renderer-measured-and-the-graph-in-the-workshop/TASK-01-the-graph-model-and-the-deterministic-layout.md) (the model and the layout), [6.1.2](../../planning/epic-06-market-topology/story-01-the-decisions-the-renderer-measured-and-the-graph-in-the-workshop/TASK-02-the-renderer-chosen-by-measurement.md) (the renderer, measured)

## Context

Epic 6 draws the market as a graph. Three questions had to be answered before
anything could be drawn, and **one of them was not ours to answer freely**:
`PRODUCT_SPEC.md` §27 commits the topology to WebGL and names Sigma.js as _"a
good candidate"_ — a recommendation rather than a mandate — and nothing in this
repository had ever rendered a canvas or measured a frame rate under sustained
interaction.

Story 6.1's Gate 1 settled the governing rule, and it is the Product Owner's
decision rather than this ADR's: **the figures decide, whichever renderer wins,
even if that means no WebGL ships anywhere in this product.** It was taken
explicitly against a recommendation to hand-roll WebGL as a compromise.

Three decisions follow, in the order they had to be taken.

---

## Decision 1 — The renderer is a hand-rolled Canvas2D module, and §27's WebGL intent is overruled by its own measurement clause

**Two real candidates were built, far enough to draw the real universe, and
compared.** Both read the _same_ `TopologyGraph` and the _same_
`TopologyLayout` from `packages/shared`, mounted into the _same_ container from
the _same_ React component, and were driven over the _same_ scripted pan/zoom
path. The only difference between the two arms was a `renderer` prop.

- **Candidate A** — Sigma.js 4 + graphology, over WebGL2.
- **Candidate B** — a hand-rolled Canvas2D renderer: one `<canvas>`, DPR-scaled,
  pan and zoom as a single affine transform, nodes as `arc()` / `rect()` / a
  diamond path per kind, edges as one batched path per edge kind, hit-testing
  against the layout's own coordinates. Zero new dependencies.

### Candidate B ships. And the frame rate is NOT why

This is the part worth carrying forward, because the obvious reading of a
renderer bake-off is that the fast one won.

**Measured 2026-10-30**, `scripts/topology-instrument.mjs --headed`, on the
built Storybook (`CONFIG_TYPE=PRODUCTION`, asserted on the wire by
`assertStorybookBuild`), 1440 × 900, two interleaved passes per candidate, over
518 nodes and 514 edges, on `ANGLE (Apple, ANGLE Metal Renderer: Apple M3,
Unspecified Version)`, machine load 2.08 / 8 cores before the run:

| arm               | rAF gap p50 | p95     | max     | gaps > 50 ms | `longtask` | LoAF > 50 ms |
| ----------------- | ----------- | ------- | ------- | ------------ | ---------- | ------------ |
| A pass 1 (Sigma)  | 16.7 ms     | 18.4 ms | 31.9 ms | 0 of 161     | 0          | 0            |
| B pass 1 (Canvas) | 16.7 ms     | 18.4 ms | 33.3 ms | 0 of 159     | 0          | 0            |
| A pass 2 (Sigma)  | 16.7 ms     | 18.4 ms | 35.0 ms | 0 of 160     | 0          | 0            |
| B pass 2 (Canvas) | 16.7 ms     | 18.4 ms | 33.3 ms | 0 of 159     | 0          | 0            |

**The two are indistinguishable**, and the story's own Gate 1 predicted exactly
this: _"both candidates will pass §28's 60 FPS comfortably at this size … this
story's measurement prices the two candidates rather than separating them at
scale."_ The DOM-node count does not separate them either — **172 against
171**, inside a Storybook iframe whose empty baseline is 171, so the whole
difference is one element.

**What separates them is bytes and fidelity.**

`node scripts/topology-bundle.mjs`, each candidate's own module graph bundled
and gzipped on its own against a shared-half control:

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

**+117,219 B against +351 B is 334×**, for a picture that is **worse**.
Candidate A could not reproduce three things the design canvas asks for, and
all three are properties of the library rather than of the time spent on it:

1. **The 1 px `--surface-raised` halo.** Sigma 4 ships exactly one node fragment
   layer, `layerFill`; a border needs a `CustomNodeLayer` with hand-written
   GLSL. Candidate B gets it free — the same batched path stroked at
   `lineWidth: 2` before it is filled.
2. **The edge gap at both ends**, which exists so 83 membership edges converging
   on one square do not sum into a grey disc. Sigma's edge _extremities_ are
   arrows and squares; there is no "stop short of the node".
3. **Either label placement.** Sigma's label margin is one setting for the
   **whole graph** and `NodeDisplayData` carries no per-node offset, so both
   placements collide, photographed rather than argued: a sector name asked to
   sit clear of its cluster's own derived radius (53–106 units) lands **on** the
   centroid, and a proxy ticker below its diamond lands on the next diamond in a
   column 32 units apart. `labelPosition: "right"` is reachable, collision-free
   and **not what the design asks for**, which is the shape of every workaround
   available here.

So **Candidate A drew strictly less than Candidate B at the same node and edge
count and was no faster for it.** That is the whole finding: the library's cost
is paid in bytes and in the parts of the design it cannot express, and bought
nothing a measurement can see.

**§27's stated WebGL intent is therefore overruled by §27's own measurement
clause**, and that section carries a dated amendment in the same change as this
ADR. The reasoning is ADR 0027's arriving a second time: _the constraint is a
count rather than a taste_, and 516 nodes with 512 edges at **4.3% ink** is not
a count that needs a GPU.

### Alternatives rejected

- **Sigma.js 4 + graphology (Candidate A).** Built, measured, deleted. Rejected
  on 334× the gzipped cost for an indistinguishable frame rate and three
  undrawable parts of the design. **Not** rejected on quality: it is a good
  library that renders 518 nodes beautifully, and had the frame rate separated
  the two it would have shipped.
- **PixiJS / three.js.** Reasoned rather than measured: a general scene graph
  with no graph semantics, so Candidate B's logic still has to be written while
  paying 100–400 kB gzipped for an abstraction that is not used.
- **`react-force-graph` / `force-graph`.** Reasoned: drags d3-force _and_
  three.js, and **its graph object IS its renderer's model**, which breaks
  Decision 2 structurally rather than inconveniently.
- **Cosmograph / regl-based GPU layouts.** Reasoned: GPU-resident force
  simulation, which is exactly the non-determinism Decision 3 refuses, in the
  one place it cannot be configured away.
- **Hand-rolled WebGL.** The compromise the owner was offered and declined at
  Gate 1 in favour of letting the figures decide. The figures then said a GPU
  is not needed at this size at all.

### What the measurement does NOT certify, stated rather than discovered later

- **It is 518 nodes and 514 edges, not 516 and 512.** The harness draws the
  recorded `GET /securities` body, taken 2026-09-11, before the 2026-10-12
  curation untracked `PSKY` and `WBD` — two nodes and two edges **more** than
  the deployed universe, which is the conservative direction.
- **It is one machine, headed, on an Apple M3.** The same instrument run
  headless on the same machine reports
  `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) …))` — a
  **software rasteriser** — and a figure taken there prices a GPU library
  against a CPU. Every figure above names the renderer string it was taken
  under; that is not optional.
- **It is 5,000 edges short of §28's target.** This story's real edge count is
  512; §28's 5,000 arrives with Story 6.5's correlation edges, and that is where
  §28 takes its amendment rather than here.
- **`/`'s real cost is not measured.** Both candidates were reachable only from
  a `.stories.tsx`, which Rolldown tree-shakes out of the application entry
  entirely — so the app-bundle delta is **0 bytes for both**, a true number that
  means nothing. Story 6.2 takes the real figure.
- **Nobody has seen this on a route**, and no person has watched it at all. The
  built Storybook is the only surface it exists on.

### Reversal trigger

**The first graph this product renders whose node or edge count exceeds what the
measured candidate was measured at — 518 nodes and 514 edges.**

Story 6.5's correlation edges are expected to fire it, and Epic 14's synthetic
5,000-node / 25,000-edge mode certainly does. At that point this comparison is
re-run over the same scripted path with `scripts/topology-instrument.mjs`, whose
candidate list is deliberately a list, and **Candidate A is a legitimate winner
of the re-run**: nothing above says a WebGL renderer is wrong, only that it is
unpaid-for at 518.

**Not a trigger:** disliking the picture. The drawing is the design canvas's and
is changed there.

---

## Decision 2 — The graph model lives in `packages/shared` and holds no renderer type

Nodes, edges, clusters and the layout's output are **domain data**; the renderer
is a reader. They are in `packages/shared/src/topology.ts` and
`topology-layout.ts` for the reason `market-time.ts` is there — **two processes
read them**. Epic 7's `get_related_securities` and `highlight_graph_nodes` are
server-side tools answering questions about this graph, and `packages/shared` is
consumed by a Fastify server.

**The refusal is mechanical, not a convention**: `pnpm invariants` carries
`no-renderer-type-in-the-graph-model`, with a break behind it. A model carrying a
graphology `Graph` or an `HTMLElement` would drag a browser-oriented mutable
structure into a process with no DOM — and Decision 1's Candidate A is the
concrete proof that this was a live risk rather than a hypothetical one: the
candidate that lost would have put graphology in the backend's dependency tree
had it been built where the drawing happens.

The renderer half lives in `apps/frontend/src/topology/`, following `market/`'s
precedent exactly: a barrel `index.ts` as the module's API and an
`eslint.config.mjs` boundary entry in the **same** `no-restricted-imports`
patterns array — a second block would silently _replace_ that array rather than
add to it and take the browser boundary out with it.

**Coordinates are in normalised abstract units, never pixels**, because a pixel
is a fact about a viewport. The unit is _extent-relative_ rather than rescaled
into `[-1, 1]`, and that was a choice: a unit-square rescale makes
`TOPOLOGY_NODE_FOOTPRINT` — the minimum centre-to-centre separation, and the one
figure a later story cannot change cheaply — inexpressible, because the divisor
would be data-dependent and adding one security would change what every
coordinate means.

### Alternatives rejected

- **The model in `apps/frontend/src/topology/`, beside the renderer.** Rejected:
  Epic 7 reads it server-side, and a second copy for the server is two homes for
  one fact.
- **The model in `packages/shared` but the layout in the frontend.** Rejected
  for the same reason one layer down — Epic 7 answers _where is this node_ — and
  because it would have made Decision 1's comparison measure two different
  pictures rather than two renderers, which is the confound Task 6.1.1 was
  sequenced ahead of Task 6.1.2 to remove.
- **A `Map` for the placements.** Rejected: `JSON.stringify(new Map())` is `{}`,
  the layout crosses a wire in Epic 7, and the failure is silent and total.

### Reversal trigger

**The first consumer of the graph model that is not a browser** — which is Epic
7's tool layer, and is the thing this decision was taken _for_. When it arrives,
re-read `no-renderer-type-in-the-graph-model`'s corpus and check it still covers
the new reader's import path; the check is what makes this decision true, and a
stated invariant nothing checks quietly stops being true.

---

## Decision 3 — The layout is closed form, with no simulation and no random seed

A radial layout: eleven sector wedges from twelve o'clock clockwise in `SECTORS`'
own declaration order, each spanning in proportion to its own derived cluster
radius; the benchmark ETF at its cluster's centroid; members on a golden-angle
(Vogel) spiral around it; the hub at the origin; the three undecomposed market
proxies in a column outside the ring.

**Determinism is a property of the function rather than of a configured seed.**
A force-directed simulation satisfies "deterministic" only by freezing a seed and
an iteration count, at which point _deterministic_ means _we stopped writing to
the same place_. Three things fall out of the closed form that no seed can give:

1. **No two clusters can collide**, because each sector's angular span is
   allocated from its own radius rather than negotiated. Over the real universe
   every cluster gets **25% more arc than it occupies**, and the closest pair of
   cluster circles clears by **28.75 units** — measured, with the test asserting
   disjointness rather than quoting it.
2. **The renderer comparison measures drawing.** Both of Decision 1's candidates
   read this one layout.
3. **Adding a security moves one cluster**, not every node. A simulation
   re-converges globally, so a curation change on one name re-draws the whole
   market.

**The mechanical claim is structural rather than byte-identical**, and that is
deliberate: `Math.sin`, `Math.cos` and `Math.sqrt` are not required to be
bit-identical between Node and a browser engine, so there is no checked-in
coordinate fixture anywhere and there must not be one. What is asserted in
`pnpm test` is that every node is placed exactly once, no two are coincident,
and cluster centroids come out in `SECTORS`' declared order — all of which hold
under any conforming implementation. `Math.random()` is the one thing that would
break determinism outright, and `pnpm invariants`' **`no-random-in-the-shared-model`**
refuses it across the whole package, with a break behind it.

### Alternatives rejected

- **ForceAtlas2 or any force simulation, with a frozen seed.** Rejected on all
  three points above; see also Decision 1's rejection of Cosmograph, which is the
  same objection where it cannot be configured away.
- **A checked-in coordinate fixture as the determinism check.** Rejected: it
  would be red the first time the test runner and the browser disagreed in the
  last bits of a `Math.sin`, which proves nothing about the layout.
- **Screenshot comparison.** Rejected because **there is no screenshot-diff
  infrastructure anywhere in `e2e/`**, and claiming otherwise is a mechanism
  that reads identically whether it exists or not. `docs/GAPS.md` carries it with
  a `Re-measure:` naming `pnpm probe`.
- **A grid or concentric rings inside a wedge.** Rejected: the golden angle is
  closed form, index-keyed and near-hexagonal, so it fills a disc at uniform
  density with no relaxation pass.

### Reversal trigger

**The first edge kind whose strength is a measurement rather than a membership**
— a correlation, where the coefficient _is_ the edge, which is Story 6.5's.

A membership has no strength, which is why `TopologyEdge` carries no `weight`
today. The day one does, a layout that ignores edge strength is drawing a picture
its own data contradicts, and the closed-form-against-simulation question is open
again with a new argument on the other side. At that point `TopologyEdge` gains a
weight that is **required on that kind and structurally absent on these two**,
the way `IndexEtfSecurity.sector` is absent rather than null — never an optional
number every reader has to branch on.

---

## Consequences

**`PRODUCT_SPEC.md` §27 carries a dated amendment**, written in the same change
as this ADR, recording that its WebGL intent was overruled by its own
measurement clause. §27's _"should intentionally exercise WebGL"_ now has no
shipped reader in this product.

**`styles/tokens.ts`' own three-year-old prediction is falsified and recorded as
such.** That module's docblock says _"Epic 6's Sigma.js/WebGL renderer wants
numbers and packed colours, so it will need a parse layer."_ It does not:
Canvas2D's `fillStyle` takes a CSS colour string, and so did Sigma's node and
edge `color`. **Neither candidate ever wanted a packed colour**, so the parse
layer that prediction reserved is not written. What _is_ written is the
throw-rather-than-default rule it would have inherited, in `topology/palette.ts`.

**Four type tokens joined the hand-maintained `TOKEN_NAMES` list** —
`--font-sans`, `--font-data`, `--font-size-micro`, `--letter-spacing-micro` —
because a canvas emits no `var()` and `a-var-read-resolves-to-a-declared-token`
is structurally blind to it. The mechanism this surface gets is a **startup
throw**, which is why every token the renderer reads has to be named there.

**`pnpm verify` cannot see a single colour, shape or frame this renderer
draws.** jsdom applies no stylesheet and computes no layout, so `getTokens()`
throws there by design. The verification level for that half is `pnpm probe` and
a person, and it is structural rather than a shortfall.
