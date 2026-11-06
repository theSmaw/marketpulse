# Task 6.5.2 — Edges, drawn

**Status:** **Complete — 2026-11-06.** The short-edge drop the task file
flagged as a risk is REAL and was measured before it was fixed: the existing
`length <= head + tail` check silently dropped **5.70% / 11.02% / 8.82% /
35.32%** of the 1,860 retained correlation edges at 1440 / 1024 / 768 / 390 —
of which **106 / 78 / 82 / 262** would have shown ink — so a proportional
clearance clamp scoped to the correlation batch alone replaced the refusal,
and **0 are dropped at any width** after it.
**Story:** [6.5 Correlation Edges, Computed Nightly, & the Strongest N](STORY.md)
**Depends on:** 6.5.1

## Objective

Task 6.5.1 writes rows nobody reads. This task is what makes Story 6.5's own
promise true on screen: securities that move together are drawn together, and
the graph stops being only a sector diagram.

## What the user can see when this lands

Correlation edges, drawn between equities whose returns move together,
alongside the existing sector-membership edges — at every width, in every
data state (a store with real rows, a store that has never run the pass, and
a store that ran the pass and retained nothing).

## Work

- **A new route** serving the newest pass's retained set: session-keyed, with
  an explicit as-of parameter (never a clock read — the same discipline
  `buildTopologyGraph`'s own Epic 13 hand-off already commits to), and
  stating its own population (pairs considered, pairs measured, securities
  refused) per ADR 0029 — a graph that joins only the row table under-reports
  and looks correct. Cached by the session, not the request instant
  (`last-closes-cache.ts`'s own repaired defect is the trap to avoid).
- **`packages/shared/src/topology.ts`**: `TOPOLOGY_EDGE_KINDS` gains
  `return_correlation`; `TopologyEdge` becomes a discriminated union with the
  new kind carrying a **required** weight, structurally absent on the two
  membership kinds (the reversal trigger the module's own docblock
  pre-committed to, firing exactly as worded). `buildTopologyGraph` itself
  does **not** change signature — add a separate, equally pure merge function
  (e.g. `withCorrelationEdges(graph, correlations)`) so the model stays a
  function of the curated universe alone and the correlation set is a second,
  explicit input rather than a second thing the builder reads. Keep the
  existing byte-comparable-sort guarantee: the new edges sort deterministically
  by `from`, `to`, `kind`, which requires the pair's canonical order to agree
  between the stored rows and the graph model's own tickers.
- **`apps/frontend/src/topology/graph-source.ts`**: fix the existing memo to
  key on **every** input the merge now takes, not only the securities array's
  identity — a real latent defect the shaping found: a correlation set
  arriving while the securities array is unchanged would otherwise silently
  serve the stale, edge-less graph, invisible to any test where both inputs
  change together.
- **Renderer**: a third batched stroke for `return_correlation` edges.
  Address the short-edge-drop defect the shaping found —
  `renderer-canvas.ts`'s existing `length <= head + tail` clearance check
  silently drops any segment shorter than its own end-padding, and a
  same-sector correlation pair (adjacent nodes inside one cluster, the
  shortest segments in the whole layout) is exactly the shape most likely to
  be dropped. Either give a short correlation edge a minimum legible
  treatment with the count of anything still dropped stated honestly, or
  document and count the drop deliberately — but do not let it stay a silent,
  undocumented gap the way it has been since the membership-edge code was
  written (harmless there; not harmless here).
- **Three absence/presence states, each with its own honest account** (no new
  ink in the first two — the picture is byte-identical to today's except for
  the sentence):
  1. the pass has never run (CI, every laptop, forever) — no pass row;
  2. the pass ran and every candidate pair was refused or cut — a pass row,
     zero retained rows;
  3. the pass ran and produced rows — edges drawn.
- **The missing degraded state** the shaping found: the universe loads
  successfully but the correlation route fails or times out. The canvas and
  its membership edges must stay drawn and intact — this product's own
  failure-handling rule (a failed part leaves the rest of the workspace
  intact and clearly labelled) applies here for the first time inside this
  region, which today has only one failure state (the universe request
  itself failing). One sentence names the gap; nothing blanks what is already
  correctly on screen.
- **The accessible sentence** gains one clause stating the population/reach
  figure (never a per-edge fact, never a correlated pair named) — one builder,
  three variants for the three states above. The `role="status"` selection
  announcement Story 6.4 built stays unchanged: no per-edge or per-neighbour
  fact is added to it, deliberately, because that is exactly the shape of
  Story 6.4's own measured arrow-key-auto-repeat cadence problem at its worst.
- **No hover, no select, no keyboard reachability for an edge itself** — nodes
  only, this story. Write the gap into Story 6.6's own `STORY.md`, in words
  that story can act on, rather than leaving it implicit.

## Done when

1. A correlation edge renders, at every tested width, distinguishable from a
   membership edge, over a store holding real rows.
2. All three absence/presence states and the degraded-read state each draw
   their own correct, distinct picture, confirmed with `pnpm probe`.
3. The graph-source memo fix is covered by a test that changes one input and
   not the other and asserts the merge re-runs.
4. `pnpm invariants`, `pnpm test` and the relevant component/unit suites are
   green; `pnpm e2e`'s topology specs pass against the new route.

## What was done

### The files

**New:**

- `packages/shared/src/relationships-response.ts` — the wire contract for
  `GET /market-data/relationships`, and `isRelationshipsResponse`. The one
  judgement in it: **`pass` is an ABSENT field rather than a present `null`**,
  which is what makes _no pass has ever run_ a different body from _a pass ran
  and kept nothing_.
- `packages/shared/src/relationships-response.test.ts` — 15 tests.
- `apps/backend/src/relationships-cache.ts` — the fifth member of ADR 0044's
  cache family and the first that serves a **route** rather than the socket's
  own callback, so it **awaits** and its failures **throw**.
- `apps/backend/src/relationships-cache.test.ts` — 11 tests.
- `apps/frontend/src/use-relationships.ts` — `RelationshipsView`, four states,
  and `toRelationshipsView`.
- `apps/frontend/src/use-relationships.test.ts` — 6 tests.
- `apps/frontend/src/topology/graph-source.test.ts` — 6 tests, this module's
  first test file, written for the memo defect below.

**Amended:**

- `packages/shared/src/topology.ts` — `TOPOLOGY_EDGE_KINDS` gains
  `return_correlation`; `TopologyEdge` becomes a union of
  `TopologyMembershipEdge` and `TopologyCorrelationEdge` (a **required**
  `weight`, structurally absent on the two curated kinds);
  `withCorrelationEdges`; `byEdge`, the sort comparator extracted so two
  producers share one order. `buildTopologyGraph`'s signature and body are
  **unchanged**.
- `packages/shared/src/topology.test.ts` — 9 tests for the merge.
- `packages/shared/src/index.ts` — the new exports.
- `apps/backend/src/return-correlation-store.ts` — `readNewestGeneration`, the
  read `0018` §7's index decision was written against: the whole generation of
  one session, pass row first, two aliased joins of `securities`.
- `apps/backend/src/routes/market-data.ts` — `GET /market-data/relationships`,
  its response schema (two more `satisfies` applications), `parseAsOf` and
  `toRelationshipsResponse`.
- `apps/backend/src/routes/market-data.test.ts` — 11 tests for it.
- `apps/backend/src/return-correlations.database.test.ts` — 6 tests for the
  read, including the orphaned-rows case.
- `apps/backend/src/index.ts`, `server.test.ts`,
  `routes/market-feed-grid.test.ts` — the new required dependency.
- `apps/frontend/src/api-client.ts` — `getRelationships`, the fifth request.
- `apps/frontend/src/topology/graph-source.ts` — the memo keyed on **both**
  inputs.
- `apps/frontend/src/topology/palette.ts` — `correlationEdge`, `--chart-seam`.
- `apps/frontend/src/topology/renderer-canvas.ts` — a third `DrawableEdge[]`,
  an exhaustive `switch` filing the three kinds, and a dashed batched stroke
  with the clamp below.
- `apps/frontend/src/components/MarketTopology/MarketTopology.tsx` — the
  `relationships` prop, `topologyCorrelationClause`, `measuredPairs`, and the
  clause threaded through **both** writers of the accessible sentence.
- `apps/frontend/src/components/MarketTopology/MarketTopology.test.tsx` — 8
  tests for the clause; every existing render updated.
- `MarketTopology.stories.tsx` — four new stories, and the measured set built
  at the real shape (82.4% same-sector).
- `apps/frontend/src/routes/MarketOverview.tsx` — `useRelationships()`.
- `e2e/specs/overview-market-topology.spec.ts` — two tests.
- `docs/GAPS.md` — one entry.
- `planning/epic-06-market-topology/story-06-…/STORY.md` — the edge-interaction
  hand-off, in words that story can act on.

### The short-edge drop: measured first, then fixed

**The risk was real and it is bigger than the task file guessed at one width.**
`renderer-canvas.ts`' existing `length <= head + tail` check refuses to draw
any segment shorter than its own end clearance — **11.0 px for an equity
pair** — and 82.4% of the retained pairs join two equities in one cluster,
which are the shortest segments in the layout.

Measured with a throwaway instrument (a temporary vitest file that fetched
`/securities` and `/market-data/relationships` from the running backend,
rebuilt the merged graph and layout, and ran `fitView`/`worldToScreen` at the
four content boxes `pnpm probe` reports for `/` — **996 / 568 / 684 / 306 ×
411**, fit scales **0.4452 / 0.3022 / 0.3639 / 0.1628**). Run, recorded,
deleted. Against the real 1,860-pair generation:

| width | dropped          | covered by the two node BODIES anyway | **lost ink** | median segment |
| ----- | ---------------- | ------------------------------------- | ------------ | -------------- |
| 1440  | 106 (5.70%)      | 0                                     | **106**      | 38.92 px       |
| 1024  | 205 (11.02%)     | 127                                   | **78**       | 26.42 px       |
| 768   | 164 (8.82%)      | 82                                    | **82**       | 31.82 px       |
| 390   | **657 (35.32%)** | 395                                   | **262**      | 14.23 px       |

The middle column is the part that reframes the decision and is not in the
task file: edges are stroked **before** node bodies, so the two 8 px equity
bodies paint over the first and last 4 px of every segment whatever the
clearance is. A segment shorter than 8 px cannot show a pixel at any
clearance, so the honest size of the defect is the **lost ink** column — and
at 1440 every one of the 106 is pure loss, with nothing covering it.

**The fix chosen: a proportional clamp scoped to the correlation batch**, and
nothing else touched. `CORRELATION_EDGE_CLEARANCE_SHARE = 0.8`: both
clearances are scaled by `min(1, length × 0.8 / (head + tail))`, so a long
edge is untouched (`factor === 1`, ends exactly where a membership edge would)
and a short one draws at reduced clearance rather than not at all.

`0.8` is derived rather than chosen: at that share the stroke spans
`[0.4L, 0.6L]`, and the open window outside both bodies is `[4, L−4]`, which
exists only for `L > 8` — so **the clamp is not the binding constraint at any
length; node overlap is**. Simulated over the same 1,860 pairs before the code
was written: **0 dropped at every width**, and the count showing ink outside
both bodies is exactly `1860 − covered` — **1,860 / 1,733 / 1,778 / 1,465**.

The membership and hub loop keeps the hard refusal, which is correct there for
the reason its own comment gives (at low fit scale every cluster is nearly
coincident with its benchmark), and is why this is a second block rather than
a conditional inside the first.

### The second channel is DASH, which Story 6.1's close reserved by name

`--chart-seam` (one value step above the membership hairline's `--chart-grid`,
1.70:1 against 1.27:1) **and** a 3/2 dash rhythm. The dash is the channel
Story 6.1's close handed this story — _both kinds here are solid, and a
correlation is a measurement where membership is a curated fact_ — it survives
`grayscale(1)` completely, and Canvas2D restarts a dash pattern at each
subpath, so every edge begins **on** a dash rather than on whatever phase the
previous one left. The rhythm is derived against the measured medians above
(≈6 px of open ink at a 390 median) and is deliberately **not** one of the
three `stroke-dasharray` rhythms the chart layer uses —
`VISUAL-LANGUAGE.md`'s constraint on this epic is _no idiom from the chart
layer_.

### The route

`GET /market-data/relationships`, with an optional `asOf` ISO instant serving
the newest pass **at or before** it. Against the running backend and this
developer's populated store, verbatim:

```
{"correlations":[{"low":"A","high":"DHR","r":0.642854,"n":4124},
 {"low":"A","high":"HAS","r":0.310967,"n":3620}, …]
```

and the pass row:

```
{'observedAt': '2026-09-11T20:00:00.000Z', 'trackedEquities': 501,
 'eligibleEquities': 496, 'splitDiscontinuity': 5, 'absent': 0,
 'candidatePairs': 122760, 'computedPairs': 122760, 'retainedPairs': 1860,
 'tooFewOverlappingSamples': 0, 'zeroVariance': 0, 'belowSignificance': 20752,
 'retainedN': 5, 'lookbackSessions': 60, 'spanMinutes': 5, 'feed': 'sip'}
```

1,860 rows, matching Task 6.5.1's own recorded pass exactly.

**Three decisions inside it.** The `asOf` **refuses** rather than falling back
to now — a repeated key (which arrives as an array) and an unparseable string
are both 400s — because answering as of the present when a reader asked about
the past is the one behaviour invariant 4 forbids by name. There is **no
`Cache-Control` and therefore no `ETag`**, deliberately: the freshness lifetime
this route would want is _until tonight's pass_, a calendar derivation this
task has no measurement for, and the server-side cache already removes the
repeated read. And the cache is keyed on **the session the stored rows are
for**, read off the pass row's own `observed_at` — `last-closes-cache.ts`'
recorded defect repaired rather than copied.

### Four findings, in the order they matter

**1. The memo defect the shaping predicted was real, and the test for it is
the one that changes exactly one input.** `topologySource` keyed on the
securities array alone, and the correlation set arrives on a **second**
request — so the ordinary sequence (universe settles, graph cached,
measurement settles with `securities` unchanged) served the stale, edge-less
graph for ever. It is invisible to any test where both inputs change together,
which is every test written from one fixture.

**2. The accessible sentence has TWO writers, and a clause only one of them
knows about is deleted by the other.** `applyAnomalyBands` replaces
`textContent` wholesale on every live band update — 6.8–16.1 times a minute on
`/` — so the correlation clause is computed once at render and **passed to
both**. The component test for it drives a real `setBands` through the handle
and asserts both facts survive in one sentence.

**3. The degraded state this story adds costs no ink at all, and that is
structural rather than careful.** `withCorrelationEdges(graph, [])` is
`graph`, so _in flight_, _never measured_ and _could not be read_ are the same
picture — the one the region drew before Story 6.5 existed — and differ only in
the clause. The browser spec asserts it by **blocking the route** and checking
the canvas still draws with no refusal.

**4. The e2e ink check needed a control arm, because a canvas has no DOM for a
stroke.** The spec loads `/` twice at one size — once with
`**/market-data/relationships*` aborted, once not — and asserts the canvas's
own `toDataURL()` **differs**. That is the only way to ask _did this layer draw
anything_; the degraded arm doubles as the degraded-state assertion. On CI both
arms are identical by construction (no pass), so the comparison is skipped
there and the spec asserts the `has not been measured here` sentence instead —
stated in the spec, because a conditional assertion otherwise reads exactly
like a passing one.

### The two sentences, verbatim off the running page

Read out of the real DOM at 1440×900 against this developer's populated store,
with the relationships route allowed and then aborted:

```
measured: … with the broad market at the centre. Each equity also carries how
unusual its recent behaviour is, on a four-band scale from normal through
elevated and high to extreme. 106 are high and 16 are extreme. The ten most
unusual are named in Unusual activity. Securities that moved together are
joined by a dashed edge: 1,860 pairs, reaching 496 of the 501 equities, from
122,760 pairs measured over 60 trading sessions with the strongest 5 kept for
each security.

degraded: … The ten most unusual are named in Unusual activity. Which
securities move together could not be read, so only the sector groupings are
drawn.
```

Both are the **whole** sentence after a live band update has rewritten it,
which is finding 2 below working on the real page rather than in a test. The
counts are `toLocaleString("en-US")` — this application's own idiom for a
counted population in prose (`return-percentile.ts`' _of 4,620 5-minute
returns_) — adopted after reading the first render, which printed `122760`.

### Looked at, on the running page

`pnpm probe / --within "Market topology"` at all four widths, against the
real store, and the screenshots read rather than only the numbers. The region's
boxes are unchanged — **998 / 570 / 686 / 308 × 413** — which is the claim that
matters for a region in a column of three: this change moves nothing on the
page. At 8× crops the dashes read as dashed and clearly apart from the solid
membership spokes and the solid hub rays; at full page the 328 cross-sector
segments read as a light haze over the ring with the hub's eleven solid rays
still the dominant structure.

**The degraded state was produced and photographed rather than only
asserted** — a throwaway Playwright script loaded `/` twice at 1440×900, once
with `**/market-data/relationships*` aborted, and the blocked arm is the
pre-6.5 picture exactly: every node, every membership edge, the eleven solid
hub rays, the readout plate and the legend, with no dashed segment anywhere
and no refusal. Run, read, deleted. The other two absence states (`loading`,
`never-measured`) are **the same bytes by construction** —
`withCorrelationEdges(graph, [])` is `graph` — and differ only in the clause,
which is what the component tests assert; they were not photographed
separately, because a photograph of an identical picture is evidence of
nothing.

**One judgement for the owner rather than a defect:** the cross-cluster
segments are the visible half of this layer (the same-sector 82.4% is mostly
inside the clusters, under the node bodies), so what a reader actually meets is
roughly 330 long dashed lines across the ring. It reads as intentional at 1440;
whether it is _too much_ is a Gate 2 question, and Story 6.6's weight encoding
is the thing that would change it.

### Gates

Every command run from the repository root on 2026-11-06, with a local
PostgreSQL up (`pnpm db`) and a `pnpm dev` pair running for the browser and
probe runs.

| Gate                                                                             | Result                                                             |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `pnpm verify`                                                                    | **exit 0**, `skipped 0`, **no `Unhandled Errors` block**           |
| — `pnpm typecheck` / `lint` / `format:check`                                     | green (`--max-warnings 0`)                                         |
| — `pnpm links`                                                                   | `638 documents, 2016 cross-file links, 39 anchor links, 0 broken.` |
| — `pnpm invariants`                                                              | `81 invariants hold.`                                              |
| — `packages/shared` tests                                                        | `Tests 711 passed (711)` (687 before)                              |
| — `apps/backend` tests                                                           | `Tests 1383 passed (1383)` (1361 before)                           |
| — `apps/frontend` tests                                                          | `Tests 1838 passed (1838)` (1818 before)                           |
| — `test:process`                                                                 | `Tests 60 passed (60)`                                             |
| `pnpm test:database`                                                             | **exit 0**, `Test Files 14 passed (14)`, `Tests 414 passed (414)`  |
| `pnpm e2e overview-market-topology.spec.ts`                                      | `3 passed (3.2s)`                                                  |
| `pnpm e2e overview-degraded-grid.spec.ts`                                        | `4 passed (1.8m)`                                                  |
| `pnpm e2e` (hover / keyboard / anomaly-bands)                                    | `22 passed (18.2s)`                                                |
| `pnpm e2e` (**whole suite**)                                                     | **exit 0**, `302 passed (6.5m)`                                    |
| `pnpm e2e` (the two sentence-touching specs, re-run after the number formatting) | `7 passed (1.7m)`                                                  |

**No `pnpm break` entry is owed**: this task adds no `pnpm invariants` check.
What it adds instead is a `docs/GAPS.md` entry naming the one claim here that
nothing mechanical can hold — the dash reset — with the reason a grep cannot
hold it and the probe that can.

### Review, and three small corrections before this was committed

A second developer instance reviewed every file the orchestrator had not
already personally verified (the route, the cache, the frontend fetch and
merge, `MarketTopology.tsx`'s own wiring, the e2e spec, and the documentation
hand-offs). The graph model and the renderer's short-edge fix were already
independently confirmed by the orchestrator before this review ran. Verdict:
every hard constraint held — `asOf` honoured and never a bare clock, the
cache keyed on the stored session rather than the request instant, `500`
declared and walked, the absent-`pass`-not-null claim proved on the raw wire,
400/503 both tested, the graph-source memo keyed on both inputs with a
regression test that changes one and not the other, two genuinely
independent requests where a slow or failed correlation fetch cannot blank
the drawn graph, three distinct data states with byte-identical ink in the
two absences, `role="status"` untouched, and the accessible clause naming a
reach rather than a pair. One real defect and two precision nits, fixed in
this same change:

1. **A real copy defect**: the accessible sentence's count was never
   pluralised, so a store with exactly one retained correlation would have
   spoken "1 pairs, reaching 2 of the 501 equities" — unreachable at the
   measured 1,860 pairs, but a real error in spoken prose on the one surface
   this task's own brief treats as the deliverable. Fixed with this
   application's own `count === 1 ? singular : plural` idiom
   (`measured-set.ts`'s own precedent), in the sentence itself, the two
   component tests that had enshrined the wrong wording, and the e2e spec's
   own regex (built from the real `measured.length` rather than hard-coded,
   so it would have silently passed on any store retaining exactly one pair).
2. `relationships-response.ts`'s docblock claimed a field added to
   `RelationshipsPassPayload` and forgotten in its count list "is a compile
   error at this `satisfies`" — false: `as const satisfies readonly
(keyof T)[]` checks only that named members are real keys, not that every
   key is named, so the claimed mechanism does not exist. The real guard is
   `relationships-response.test.ts`'s own "refuses a pass missing any one of
   its figures," which loops `Object.keys(pass)` over a typed fixture.
   Corrected to name the actual guard.
3. `TOPOLOGY.md` §5 said `withCorrelationEdges(graph, [])` "is" `graph` —
   loose: the function always returns a new object (content-equivalent, never
   reference-identical), and the frontend in fact passes `null` and skips the
   call entirely in all three absence states, never `[]`. Corrected to say
   both things precisely.

Two findings the review raised and judged not to need a fix: the e2e ink
assertion's control arm differs in more than the correlation layer (live
anomaly bands aren't pinned between the two page loads), which weakens but
does not void the one browser-level check that a stroke exists — already
framed honestly as the best available answer to "there is no DOM for a
stroke," with `TOPOLOGY.md` and `docs/GAPS.md` both naming a person looking
as the real verification; and a latent, currently-unreachable cache
cold-start case for a future historical `asOf` caller, noted for Epic 13
rather than fixed now, since nothing sends `asOf` today.

All gates in the table above were re-run after these three fixes and stayed
green, including a fresh run of the two sentence-touching e2e tests.

### What nobody has seen

**No gated machine will ever draw one of these edges.** CI's store has 516
securities, zero bars, no provider and no nightly pass, so the route answers
`{"correlations":[]}` with no `pass` there for ever, every gated run draws the
graph this region drew before Story 6.5, and the clamp's branch is never
entered. The only machine that has drawn a correlation edge is this
developer's own, and the only person who has looked at one is this developer.

**No person has checked a single coefficient against anything**, which is Task
6.5.1's own standing note and is unchanged: nothing here establishes that any
of the 1,860 pairs is right about the market.

**And the measured clause has never been read by a screen reader.** It is one
more sentence in a paragraph `docs/GAPS.md` already carries eleven
screen-reader entries about.

## For a stakeholder

**The market graph now shows which companies actually move together.** Until
today it drew which sector a company is in — a diagram of how the market is
organised. It now also draws a dashed line between any two companies whose
five-minute price movements have tracked each other over the last 60 trading
sessions, which is a measurement rather than a classification, and is the
first thing on this screen that says something the curated list of securities
does not already know.

Three things are worth a stakeholder's attention.

**It is sparse, and it says so.** Of 122,760 possible pairs, 1,860 are drawn.
The graph states its own population in its text description — how many pairs
are drawn, how many companies they reach, and out of how many measured — so a
reader never has to guess whether a company with no lines has no relationships
or simply was not measured.

**Most of the relationships are inside one sector**, which the nightly pass
measured at 82%. So the new layer mostly reinforces the grouping the graph
already showed, and the roughly 330 lines that cross between sectors are the
surprising ones. Whether that is the right balance of ink is a design question
for Gate 2, not something this task settled.

**And when the measurement is missing, nothing breaks.** The relationships come
from a second request to the server, and if it is slow, absent or fails, the
graph is exactly the graph it was — every company, every sector, fully
interactive — with one sentence saying which layer is missing. That is a first
for this region: until today its only failure was _the whole universe could not
be read_, which correctly blanks it.

**What nobody has checked:** no person has verified any of these relationships
against an outside source, and the machine that gates our merges has no market
data, so it will never draw one. Both are written down with owners.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
