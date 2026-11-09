# TOPOLOGY.md — the market graph: what it is, where the decisions live, and what nobody has seen yet

**Written:** 2026-10-30, by [Task 6.1.4](story-01-the-decisions-the-renderer-measured-and-the-graph-in-the-workshop/TASK-04-the-sweeps-and-the-close.md), at Story 6.1's close
**Epic:** [Epic 6 — Market Topology](EPIC.md) · **Spec:** [`PRODUCT_SPEC.md`](../PRODUCT_SPEC.md) §10, §27, §28
**Status:** The maintained account of this product's market-topology graph.
Where a task file disagrees with this document, **this document wins**; where
this document disagrees with an ADR about a decision, **the ADR wins**.

**Written at this story's own close rather than at the epic's**, deliberately.
Epic 4 shipped nine stories with no subject document and wrote
[`MARKET-OVERVIEW.md`](../epic-04-market-overview/MARKET-OVERVIEW.md) only at
its close; Epic 5 then repeated that exactly and wrote
[`ANOMALY.md`](../epic-05-anomaly-detection/ANOMALY.md) only at its own close,
noting in its own first page that this made it _"the second consecutive epic"_
to do so. Epic 6's own decomposition said not to repeat it a third time. **So
this document is minimal rather than comprehensive** — it is a gathering of
what Story 6.1 decided, and a place for every later story in this epic to
amend rather than scatter its own findings across nine more task files for a
future close to rediscover.

---

## 0. What exists today, and the one sentence that bounds everything below

~~**Nothing is on any route.** The whole of what this section describes is
reachable only in Storybook (`Components/MarketTopology`), reviewed by nobody
but the people who built it, on one development machine. Story 6.2 is what
puts this on `/`.~~ — **false since 2026-11-01: Story 6.2 shipped.** The
graph is on `/`'s second region, drawing the real tracked universe, with a
real retry, pan/zoom and an accessible fallback. ~~What bounds the sections
below now is narrower: the **anomaly encoding, node sizing, correlation
edges, interaction and live updates** — Stories 6.3–6.8 — are still
Storybook-only or unbuilt, and §2's renderer figures are still local,
one-laptop ones (§4).~~ — **narrower again since 2026-11-03: the anomaly
encoding shipped too.** Story 6.3 wired a real composite band — a ring
weighted `elevated`/`high`/`extreme`, `extreme` recolouring the node's own
fill, an accessible sentence stating the vocabulary and the counts, a
static legend at three of four widths — onto the live graph, watched
working against this developer's own real local backend. ~~What bounds the
sections below now is narrower still: **node sizing, correlation edges,
interaction and live updates** — Stories 6.4–6.8 — remain Storybook-only or
unbuilt, and §2's renderer figures are still local, one-laptop ones
(§4).~~ — **narrower again since 2026-11-06: interaction shipped.** Story
6.4 made every node something a reader can interrogate and leave from — by
pointer (hover reads it, click selects it, the readout's one anchor opens
it) and by keyboard (Tab into the region, arrow keys walk the graph as a
tree, Enter opens, Escape clears) — and a screen-reader user gets the same
capability through a dedicated announcement region, not a degraded
substitute. ~~What bounds the sections below now is narrower still: **node
sizing, correlation edges and live updates** — Stories 6.5–6.8 — remain
Storybook-only or unbuilt, and §2's renderer figures are still local,
one-laptop ones (§4).~~ — **narrower again since 2026-11-06: the
correlation edges are drawn.** Task 6.5.2 put Task 6.5.1's nightly pass on
screen — a new route, a third edge kind on the model, a dashed batched
stroke — so the graph stops being only a sector diagram. **But the sentence
that bounds it is sharper than the ones above**: no gated machine will ever
draw one of these edges, because CI has no nightly pass and never will.
~~The only machine that has drawn one is one developer's.~~ — **false since
2026-11-07, found by Task 6.5.4 going to check rather than by reading:** the
deployed `baselines` job ran the correlation phase for the first time at
2026-11-07T00:26Z (1,853 retained, 83.6% same-sector, the pass completing in
1,351 s against its own 5,400 s budget) and the deployed route has been
serving those rows to every real visitor since. Three task files, this
document and a `docs/GAPS.md` entry all carried the same now-false claim;
all are corrected in this same sweep. What bounds the
sections below now is **node sizing, edge strength and live updates** —
Stories 6.6–6.8 — and §2's renderer figures are still local, one-laptop
ones (§4). See §5.

## 1. The model — a graph is domain data, and the renderer is a reader

`packages/shared/src/topology.ts` and `topology-layout.ts` hold the whole
model: `TopologyGraph` (nodes, edges, clusters — 516 nodes, 512 real edges:
501 equities each with a membership edge to their sector's benchmark ETF, 11
sector ETFs each with a hub edge to `SPY`, and `QQQ`/`DIA`/`IWM` carrying none
at all, by construction rather than by omission) and `TopologyLayout` (a
closed-form radial placement, no simulation, no random seed). Both live in
`packages/shared` **because two processes read them** — Epic 7's
`get_related_securities` and `highlight_graph_nodes` will read this graph
server-side, exactly as `market-time.ts` is read by both halves of this
product today.

**The model holds no renderer type, and that is mechanical.**
`pnpm invariants`' `no-renderer-type-in-the-graph-model` walks this package's
own transitive import closure from `topology.ts` and `topology-layout.ts` and
refuses a drawing library, a DOM/viewport type, a colour literal or a
`var(--token)` read, with `pnpm break` behind it — proved, on its first draft,
against a corpus too narrow to catch the defect it was written for (a glob
rather than the import closure), which is in [Task 6.1.1](story-01-the-decisions-the-renderer-measured-and-the-graph-in-the-workshop/TASK-01-the-graph-model-and-the-deterministic-layout.md)'s
own record. `no-random-in-the-shared-model` holds the layout's determinism the
same way.

**No edge carries a weight today.** A membership is not a measurement, and a
`weight` field whose only value would be `1` has no producer. The reversal
trigger is a condition, not a story number: _the first edge kind whose
strength is a measurement rather than a membership_ — Story 6.5's correlation
edges.

Full account: [ADR 0048](../../docs/adr/0048-the-topology-renderer-chosen-by-measurement-where-the-graph-model-lives-and-why-the-layout-is-closed-form.md)'s
Decision 2 and 3.

## 2. The renderer — chosen by measurement, and it is not what the spec named

`PRODUCT_SPEC.md` §27 named Sigma.js/WebGL as a recommendation; the Product
Owner's own Gate 1 decision was that the figures would decide regardless,
**even if that meant no WebGL shipped anywhere in this product** — and they
did not. Two real candidates were built far enough to draw the whole tracked
universe and measured against each other on the built Storybook, over an
identical scripted pan/zoom path:

- **Sigma.js 4 + graphology**, over WebGL2. Indistinguishable from the
  Canvas2D candidate on frame rate (rAF gap p50 16.7 ms, zero `longtask`
  entries, zero gaps over 50 ms, in every arm) — and **334× the gzipped
  cost** (+117,219 B against +351 B) for a picture that was **worse**: it
  could not draw the design canvas's node halo, its edge end-gaps, or either
  of its two label placements, all three needing a per-node control the
  library does not expose. Built, measured, **deleted** — a comparison
  harness is not a second implementation to maintain.
- **A hand-rolled Canvas2D renderer**, zero dependencies. Shipped.
  `apps/frontend/src/topology/renderer-canvas.ts`, mounted through
  `apps/frontend/src/components/MarketTopology/`.

Full account, the figures, and the four reasoned (not measured) rejections
beside the one measured one: [ADR 0048](../../docs/adr/0048-the-topology-renderer-chosen-by-measurement-where-the-graph-model-lives-and-why-the-layout-is-closed-form.md)'s
Decision 1. `PRODUCT_SPEC.md` §27 carries a dated amendment recording the
overrule, left standing rather than rewritten.

**Reversal trigger, a condition:** the first graph this product renders whose
node or edge count exceeds what the measured candidate was measured at (518
nodes, 514 edges — the recorded fixture's count, not the deployed universe's
516/512; see §4 below). Story 6.5's correlation edges, and certainly Epic 14's
synthetic 5,000/25,000 mode, are expected to fire it — and Candidate A is a
**legitimate winner** of that re-run; nothing above says WebGL is wrong, only
that it was unpaid-for at this size.

## 3. The design — what is drawn, and what is deliberately not

`The graph at rest.dc.html` is the canvas authority. Three node kinds (circle
8px equities, square 10px sector ETFs, diamond 12px market proxies), two edge
kinds (solid membership and hub, both gapped at both ends), four existing
tokens and zero new ones, zero hue — the resting graph is achromatic by
decision, leaving the whole amber ramp unspent for Story 6.3's anomaly band.

**This shape ladder is `PRODUCT_SPEC.md` §10's `shape/icon — security
type` node encoding — taken here, by this story, 2026-11-01 — closed in
writing by Task 6.6.2 on 2026-11-09 after Story 6.6's own shaping found
it had never been recorded as such.** §10 names five possible node
encodings; `cluster` is this story's own wedge allocation, `shape/icon`
is the ladder above, `border` is Story 6.3's anomaly ring, `size` is
refused (Story 6.6, Open Decision 1 — a node cannot express "we don't
know" the way a band's hollow `unscored` state can, and every candidate
quantity either omits securities or inverts the hierarchy it claims to
show), and `intensity` (current price movement) is undecided, handed to
Story 6.7 by name.
The cluster is drawn **by the edge alone** — no hull, no wash, no per-sector
palette — for three independent reasons recorded on the canvas, any one
fatal. No equity is labelled at rest (501 tickers do not fit without a
non-deterministic collision pass, which acceptance criterion 3 refuses); the
reversal trigger is a condition — _the first zoom level at which the layout's
own geometry leaves 26px of clear ground beside every node in the viewport_ —
not a default.

### 3.1 Two defects a person found by looking, and what shipped against each (2026-11-06)

Story 6.4's own closing review drove the real running app and photographed two
things nothing mechanical in this repository can see. Both were repaired in the
same change; **both repairs are scoped, and one of them is explicitly a
mitigation rather than a fix.**

**The readout plate covers real nodes.** `.readout` is a 288×98 card inside the
canvas's own frame, bottom-left, and `fitView`/`measure()` fit the **entire**
frame box with no notion that part of it is covered — **14 securities behind it
at 1440, 46 at 1024, 64 (12.7% of the universe) at 768, 0 at 390**. A reader can
select one of them and then see neither its selection ring nor its ground disc.
The plate's ground is now `color-mix(in srgb, var(--surface-raised) 80%,
transparent)`, the first translucent colour anywhere in `apps/frontend/src`
(`opacity` was refused: it fades the five lines of type with the ground). The
80% is measured, and the measurement's surprise is that **the type is not the
binding constraint** — `--ink-secondary` over a field of solid `--ink-primary`
is still 6.14:1 at 80% — while a node's own perceivability through the plate
reaches only **1.232:1**. So a node behind the plate is now perceivable and is
still not legible: its band, its ticker and the direction of its ring are not
readable through the card. `docs/GAPS.md` carries the residue, the two real
fixes (carve the plate's footprint out of the fitted viewport; move the plate
into a reserved row beneath the canvas) and the condition that owns them —
**the first story that changes what this region's canvas is fitted into.**

**The focus ring is nearly invisible in a dense cluster**, measured at
**1.01:1** by the reviewer. Task 6.4.3 had flagged it as a question of
treatment; it is not. `palette.focusRing`'s own argument for a single ink rests
on the ring _always being drawn inside `selectionGround`'s dark disc_, and that
premise is false: the disc is drawn **first** in the frame, so in `TECHNOLOGY`
the neighbours' bodies and their 1 px `--surface-raised` halos cover most of it
and the pale ring lands on near-white. The ring is now **two-tone** — the same
light `--ink-inverse` stroke at the same radius, with a 1 px `--ink-primary`
companion immediately **outside** it (12 → 13 px at zoom 1). Outward is the
load-bearing half: the light ring's inner edge does not move, so the clearance
Story 6.3's `extreme` ring handed this story by name is unchanged **by
construction** rather than by hoping. The floor it buys is arithmetic over the
shipped tokens — on every ground this picture can put under the ring (the dark
disc, a white halo, an edge, an equity body, an amber band ring) the better of
the two tones clears **4.88:1**, the worst case being the mid-value equity body,
which is exactly the ground no single ink of either polarity can serve.

**One instrument caveat travels with that second figure.**
`scripts/topology-interaction-probe.mjs`' `banded` clearance was re-run against
a control with the dark stroke disabled: **4.99 / 5.23 / 5.21 px** at 1440 /
1024 / 768 before, **5.10 / 3.33 / 3.26** after, reproducible to two decimals.
At 1440 the instrument's own self-check holds — `outer − inner` reads 4.48
against a drawn 4.5 — and the clearance there is unchanged (+0.11, noise). At
1024 and 768 it reads **6.00 and 6.11 against the same drawn 4.5**, 1.5 px wider
than anything on the canvas, because `diffCanvas` takes its centre as the
centroid of the changed pixels and a wider annulus displaces it; the same
displacement shortens `inner` by ~0.95 and lengthens `bandOuter` by ~1.00, which
is the whole of the apparent loss. **Every reported figure is still positive at
every width**, and the geometric claim — nothing added is drawn inside radius 12
at zoom 1 — is exact.

## 4. What no machine and no person has seen — the running section every later story amends

- ~~**Nobody has watched this on a real screen.** The built Storybook is the
  only surface any of this exists on. Story 6.2 is what changes that.~~ —
  **false since 2026-11-01: Story 6.2 shipped.** `/`'s second region draws
  the real graph — 516 securities, the elliptical ring, pan/zoom, a real
  retry, an accessible fallback. What remains true of the sentence above is
  everything downstream of this epic's remaining seven stories: the anomaly
  band, node size, correlation edges, live updates and interaction are all
  still Storybook-only or not yet built.
- **The frame-rate and no-task-over-50ms figures are local, one laptop, and
  not §28's scale** — 518 nodes / 514 edges, not §28's 500/5,000 nor its own
  5,000/25,000 synthetic target. `docs/GAPS.md` carries the entry; Epic 14
  owns the re-take at scale.
- ~~**A sector's label still crosses into a neighbouring cluster's circle at
  the component's own default size, and no single ring radius fixes it in
  general.**~~ — **closed 2026-11-01 by Task 6.2.2, with two mechanisms
  rather than one.** The ring is now **elliptical**
  (`TOPOLOGY_RING_RADIUS_X = 800, TOPOLOGY_RING_RADIUS_Y = 340`), with wedge
  allocation changed from angle-proportional to **arc-length**-proportional —
  this is what keeps clusters disjoint on a non-circular ring, and a naive
  squash at the canvas's own first-guess figures without it produced a
  **−53.2-unit** cluster overlap. Beside it, the renderer draws no sector
  label below a derived fit-scale threshold
  (`TOPOLOGY_SECTOR_LABEL_MIN_SCALE = 0.38` in `renderer-canvas.ts`) — the
  scale-aware treatment this bullet used to say did not exist yet. Both
  halves are mechanical (`topology-layout.test.ts`, `pnpm break` entries for
  each); `docs/GAPS.md`'s own entry carries the full account and is itself
  closed.
- **The recorded `full.json` fixture every Storybook story reads is 518
  nodes / 514 edges, dated before the 2026-10-12 untracking** — two nodes and
  two edges more than the deployed universe's 516/512, the conservative
  direction for a frame-rate or bundle figure but not for a geometry one.
  `docs/GAPS.md` has the re-measure; re-recording it is explicitly out of
  this epic's own scope (six other components' stories share the fixture).
- **Nothing compares two drawings of this graph, and there is no
  screenshot-diff mechanism anywhere in this repository** — a renderer change
  that moved every node by a hair, mirrored the market, or dropped the halo
  entirely would be green on every check that exists. `docs/GAPS.md`'s own
  entry names `pnpm probe` as the only re-measure until a story needs more.
- **`a-var-read-resolves-to-a-declared-token` cannot see a canvas.** The real
  mechanism for this renderer's token discipline is `styles/tokens.ts`'s
  hand-maintained `TOKEN_NAMES` list plus its startup throw — a different
  shape of guard than every other component gets, and one that catches an
  absent token but not yet a literal spent where a token should be.
  `docs/GAPS.md` names the condition for closing that gap for real.
- **Added 2026-11-01 (Task 6.2.5): the frame-rate-under-interaction claim is
  still a Storybook-measured, stated bound rather than a route-level one.**
  Story 6.2 re-took the **cold-load** figure for real against `/`'s own box
  via `overview-instrument.mjs` (that task's own record carries the number),
  but `pnpm probe`'s driven pan/zoom path has **no entry point on `/` at
  all** — it is wired only in `MarketTopology.stories.tsx`, over the fixed
  Storybook container this section's own §2 figures were taken against. Task
  6.2.5 deliberately did not invent one for this story: a route-level
  interaction harness is its own piece of work (a scripted drag/wheel path
  driven against `/`'s real, resizable box rather than Storybook's fixed one)
  and nothing in Story 6.2's acceptance criteria asked for it. **Owner: the
  next story that changes what the renderer draws under interaction**
  (Story 6.3's anomaly band or Story 6.4's hover/selection are the likely
  source) — at that point the ADR 0048 figures are being re-argued anyway,
  and a route-level harness is worth building once rather than for a
  limitation this task only had to document.
- **Added 2026-11-01 (Task 6.2.4): the degraded grid has a second axis now,
  and this is the first region on `/` a gated machine can verify for real.**
  `overview-degraded-grid.spec.ts` grew from 17 states × 4 widths × 8
  surfaces to **17 × 4 × 9**, ~~with `Market topology` declared constant
  across every aggregate-only row (the graph's content is a function of the
  universe REQUEST, not the overview aggregate)~~ — **corrected 2026-11-03
  by Task 6.3.5: that declaration went false the moment Story 6.3 shipped,
  and was corrected rather than deleted.** The region's drawn STRUCTURE is
  still a pure function of the universe request alone — that half is
  unchanged and still true. Its accessible SENTENCE is not, since Task
  6.3.3 made it read the overview aggregate's own `anomalyBands` section:
  the one row that never hears an overview at all
  (`02-no-aggregate-after-the-floor`) still reads the plain structural
  sentence, and the other fourteen aggregate-only rows — none of which
  construct a real `anomalyBands` section — now uniformly carry AC 4's
  "nothing has been scored yet" fallback clause. The grid's own assertion
  is now a two-group claim rather than a one-group one; see Task 6.3.4's
  own record for the fix and why a forked investigation, not a guess,
  found the real boundary. And carrying its own four
  new rows on the universe-request axis (`failed`/retryable,
  `failed`/not-retryable, `unreachable`, `empty`) — none of which any other
  region on this screen has, because every other region needs stored bars
  to hold a figure at all and CI's store has zero. A new e2e spec,
  `overview-market-topology.spec.ts`, goes further still: it fetches
  `GET /securities` independently and recomputes the real
  `buildTopologyGraph` over it, then checks the canvas's own dimensions,
  the absence of its refusal sentence and its drawn sector count against
  that independent answer — a real, CI-capable positive and negative no
  other row in `MARKET-OVERVIEW.md` §9's own "what no gated machine has
  ever seen" table can have.
- **Added 2026-11-03 (Task 6.3.5, closing Story 6.3): the frame-rate-
  under-interaction gap Task 6.2.5 flagged is STILL open, and Story 6.3 was
  the predicted trigger that fired without closing it.** The bullet above
  this one named "Story 6.3's anomaly band" as the likely reason a
  route-level `pnpm probe` interaction harness would eventually be needed —
  Story 6.3 shipped the ring, and that harness was not built. What Story
  6.3 confirmed instead is narrower and FUNCTIONAL rather than a
  frame-rate figure: a live band update does not re-mount the canvas and a
  reader's pan survives one (Task 6.3.3, both a manual check against this
  developer's own running backend — a 28-second-held pan surviving a
  background re-render — and a new e2e spec,
  `overview-market-topology-anomaly-bands.spec.ts`, comparing the canvas's
  own rendered bytes before and after). **Nobody has measured what drawing
  up to three extra batched strokes a frame (the ring passes,
  `renderer-canvas.ts`'s own draw-call accounting) costs under the
  pan/zoom/wheel interaction §2's ADR 0048 figures were taken against** —
  those figures predate the ring entirely. Owner unchanged from Task
  6.2.5's own note: the next story that changes what the renderer draws
  under interaction, or the first story that needs the route-level harness
  for its own reason.
- **Added 2026-11-03 (Task 6.3.5, closing Story 6.3): what no gated
  machine will EVER see for this story's own feature, stated plainly
  rather than left to be inferred from the general Epic 5 rule.** CI's
  store has zero bars and no provider, so composite generation never runs
  there — every one of the 501 equities is `unscored` (hollow, achromatic
  outline) on every gated run, for ever, which is AC 4's own permanent
  state rather than a transient one. A `high` ring, an `extreme` ring, the
  node-fill recolour, and the "N are high and M are extreme" sentence
  clause are therefore **structurally unreachable on CI** — the only
  machine that has drawn any of them is this developer's own local store
  (`ANOMALY.md` §0's "almost every claim in Epic 5 is a claim about a
  store" rule, arriving at a sixth surface). `docs/GAPS.md`'s own new entry
  (Task 6.3.5) carries the real distribution figure this one instant
  produced and the condition for re-taking it against the deployed store.
- **Added 2026-11-05 (Task 6.4.3): the route-level interaction harness
  EXISTS, and it closes half of the bullet two above rather than all of
  it.** `scripts/topology-interaction-probe.mjs` drives
  `topology-instrument.mjs`'s own scripted pan/zoom path and a scripted
  focus/arrow-key path against `/`'s real, resizable box at the four widths
  this product tests, and measures the drawn geometry **by difference** —
  snapshot the canvas, change one thing, read the pixels that moved. What it
  closed: the focus ring's real radii (`9.7 → 12.1` CSS px at every width,
  `4.2 → 6.7` at the zoom floor, `15.2 → 17.9` at the ceiling), its measured
  clearance from Story 6.3's own ring on a real `high` node (**confirmed at
  three of the four widths**, 9.96–9.98 px of ring against a 14.97–15.20 px
  focus-ring inner edge — ≈4.99–5.23 px of clearance), and a re-confirmation
  of Task 6.4.1's hit-target table from the other end (the hub reaches
  11.0 px against a computed 10 at every width; an equity in `TECHNOLOGY`
  reaches as little as 0.0 px at the narrowest width, cut short by a
  **neighbour** rather than by the threshold — crowding Story 6.2/6.3 already
  measured and accepted, arriving at a second instrument). What it did
  **not** close, deliberately and by the task's own scope: **the frame-rate
  figures are still Story 6.2's Storybook ones.** This harness takes no
  timing at all — a geometry reading needs no production build, no
  calibrator and no load ceiling, and borrowing `overview-instrument.mjs`'s
  apparatus for one would have bought a refusal to run and nothing else.
  ADR 0048's figures still predate both Story 6.3's ring and this story's,
  and **Epic 14 owns the re-take at scale**; the condition for building the
  timing half is unchanged — the first story that needs a frame-rate figure
  for `/`'s own box rather than for Storybook's.
- **Corrected 2026-11-06, on review: the figure above was wrong and the
  record that carried it was incomplete.** The instrument's anomaly-ring
  reader matched the ring's own colour over a box around the measured
  centre, reasoning that zooming in first would put every neighbour's ring
  outside it — true at 1440, **false at 1024 and 768**, where it read
  33–34 px against a ring whose own edge is a single digit, because this
  renderer's fit scale is itself width-dependent and the same relative zoom
  leaves less absolute separation on a narrower viewport. Fixed with a
  ray-based reader (sixteen rays outward from the centre, each stopping at
  its own first gap after amber, so a spatially separate neighbour is
  excluded by construction); the clearance above is the corrected, re-run
  figure, consistent to two decimal places across the three widths it is
  reachable at. Task 6.4.3's own record carries the full account and the
  unabridged four-width output.
- **Added 2026-11-05 (Task 6.4.3): in the densest clusters the focus ring is
  hard to find, and it is a question about the treatment rather than a
  defect in it.** Photographed at 1440 and 768 via
  `scripts/topology-interaction-probe.mjs` (its crops are gitignored output,
  the same convention `pnpm probe`'s own screenshots follow — regenerate
  rather than open a committed file): at the fitted scale a `TECHNOLOGY`
  member sits under twenty overlapping neighbours, each with its own 1 px
  `--surface-raised` halo, and a light ring among them is not the landmark a
  keyboard reader wants. The crowding is **pre-existing** — Story 6.3
  measured the identical overlap with no ring drawn at all and recorded it
  as node density rather than as a ring problem — and zooming resolves it
  completely (the same script's banded-node crop at the zoom ceiling, where
  the focus ring, the amber band ring and the ground disc are three
  unambiguous layers). Named here because a focus indicator carries more
  weight than a band does: a reader who cannot see where they are has no
  second way of finding out.
  **Owner: the design decision is the product owner's**; the measurement and
  the photographs are in Task 6.4.3's record.
- **Added 2026-11-05 (Task 6.4.3): a re-mount loses the anomaly bands, found
  by a canvas digest and owned by nobody yet.** Anything that lands a fresh
  `securities` array — a retried `GET /securities` is the reachable case —
  re-runs `MarketTopology`'s mount effect, and the new renderer has not had a
  `setBands` call, so all 501 equities draw `normal` (filled) rather than
  `unscored` or their real band until the next batch arrives. It is invisible
  on any machine whose universe request succeeds first time, invisible to
  every DOM assertion, and was found only because a whole-canvas digest
  compared across a whole browser test caught it at about 1 run in 25. The
  spec was restructured to compare the two pixels it owns instead; **the
  product behaviour is unrepaired and is Story 6.3's channel rather than
  6.4's** — the repair is for the route to re-apply its held treatment map
  when the handle changes, which is `MarketOverview.tsx`'s `useRef` policy
  and not this story's code.
- ~~**Added 2026-11-06 (Task 6.4.5, closing Story 6.4): what no gated machine
  and no person has ever seen for this story's own feature.**~~ — **half
  discharged hours later, same task, while photographing an unrelated
  defect.** CI's permanent `unscored` state (no bars, no provider, no
  composite generation) means **no gated run** has ever shown the readout
  plate a real band word — every hover/selection spec authors the band
  through `serveFeed`/`sendOverview`, the same mechanism Story 6.3's own
  specs use, because nothing else can produce one on CI. But **a person
  has**: driving the real local store while verifying a different fix, the
  plate read `STZ / ELEVATED`, `WMT / NORMAL` and, by the keyboard walk,
  `ADBE / HIGH` — none of them an authored frame. `docs/GAPS.md`'s own
  entry (Task 6.4.5) carries the full, struck-and-corrected account: what
  remains genuinely unseen is `extreme` specifically, and a store holding
  both scored and unscored equities at once, tied to the same deployed-
  store sitting Epic 5's own composite score already owes
  (`LIVE-REHEARSAL.md` row 5.6). And **no person with a real screen reader
  has heard any of this region** — the announcement's cadence (one sentence
  per repeat of a held arrow key, across a cluster of up to 83 members), the
  band word read aloud after a sector name, and the comma-joined four-fact
  sentence's own legibility are all unanswerable from a DOM, which
  `docs/GAPS.md`'s eleventh screen-reader-listening entry (also Task 6.4.5)
  states plainly rather than leaves implicit.
- **Added 2026-11-06 (Task 6.5.2): no gated machine will ever draw a
  correlation edge, and this is the first thing in this epic that is
  permanently unreachable on CI rather than merely unmeasured there.** The
  anomaly band at least has an authored frame a browser spec can furnish
  (`overview-market-topology-anomaly-bands.spec.ts` does exactly that); the
  edge layer has **no such channel** — it comes from a nightly pass over
  stored bars, CI has none, and furnishing one would mean the spec drawing
  the picture it then checks, which is the shape four overview specs were
  once green under. So `overview-market-topology.spec.ts`' ink check
  (canvas `toDataURL()` with the route blocked, against the same page with
  it allowed) **runs on a developer's populated store and is skipped on
  CI**, saying so on its face. What that leaves unverified by anything
  mechanical, anywhere: the dash rhythm's legibility, the clamp's behaviour
  on a short segment, and the `setLineDash([])` reset whose absence would
  dash every other mark in the frame. `docs/GAPS.md` carries the last of
  those with the probe that catches it. **Owner: the first sitting that
  opens `/` against a store with a nightly correlation pass** — this
  developer's machine today, and ~~the deployment from the first night
  `backfill.yml` runs after this ships~~. **That night already happened,
  2026-11-07T00:26Z, found by Task 6.5.4 going to check the deployed route
  rather than by reading: the deployment has been serving 1,853 real
  correlation edges to every visitor since, and no person has sat down and
  looked.** The machine has drawn them; the sitting this bullet is actually
  owed is still unfilled. Epic 6 has no `LIVE-REHEARSAL.md` of its own —
  unlike Epic 3, which has one — so this sitting's real home is Story 6.9's
  own rehearsal-and-sweep pass; `docs/GAPS.md` carries the item with that
  owner until then.

## 5. The measured edges — what is drawn, what is clamped, and the one thing nothing can check

**Added 2026-11-06 by Task 6.5.2**, the first task in this epic whose subject
is an edge rather than a node. ADR 0049 is the pass's own decision and
`0018_return_correlations.sql` is the table; this section is what reaches a
reader.

### What is on screen

A **dashed** line between any two equities a nightly pass retained as moving
together — the 60-session grid of 5-minute returns, the strongest `N = 5` per
node by union, with a derived Fisher-z significance floor rather than a chosen
threshold. On this developer's populated store that is **1,860 pairs of
122,760 candidates**, 82.4% of them joining two equities in the same sector.

**Two channels, and dash is the one that carries the kind.** Story 6.1's close
reserved it by name — _both kinds here are solid, and a correlation is a
measurement where membership is a curated fact_ — so a correlation edge is
`--chart-seam` (1.70:1, one value step above the membership hairline's
`--chart-grid` at 1.27:1) stroked with a **3/2** rhythm, constant under zoom
like every other stroke here. The dash survives `grayscale(1)` completely,
which is why it rather than the value step is the kind's encoding. The rhythm
is deliberately not one of the chart layer's three, which is
`VISUAL-LANGUAGE.md`'s standing constraint on this epic.

### The clearance clamp, which is a measured repair rather than a new rule

`renderer-canvas.ts`' end-clearance check refuses any segment shorter than
`head + tail` (11.0 px for an equity pair). That is **correct** for a
membership edge — at low fit scale a cluster is nearly coincident with its own
benchmark and a naive shortening draws the line backwards — and **wrong** for
a correlation edge, which is most often the shortest segment in the layout.

Measured against the real generation at the four content boxes `pnpm probe`
reports for `/` (996 / 568 / 684 / 306 × 411):

| width | dropped          | covered by the two node bodies anyway | lost ink |
| ----- | ---------------- | ------------------------------------- | -------- |
| 1440  | 106 (5.70%)      | 0                                     | **106**  |
| 1024  | 205 (11.02%)     | 127                                   | **78**   |
| 768   | 164 (8.82%)      | 82                                    | **82**   |
| 390   | **657 (35.32%)** | 395                                   | **262**  |

The middle column is the part worth carrying forward: edges are stroked
**before** node bodies, so the two 8 px equity bodies cover the first and last
4 px of every segment whatever the clearance is — a segment shorter than 8 px
cannot show a pixel at any clearance, and the honest size of the defect is the
last column.

`CORRELATION_EDGE_CLEARANCE_SHARE = 0.8` scales both clearances by
`min(1, length × 0.8 / (head + tail))`, so a long edge is untouched and a short
one draws at reduced clearance. At that share the stroke always reaches into
the open window wherever one exists, so **the clamp is not the binding
constraint at any length; node overlap is**. After it: **0 dropped at every
width**, with 1,860 / 1,733 / 1,778 / 1,465 showing ink.

### The three absence states, and the degraded one this story added

`topologySource` is handed `null` rather than `[]` in all three absence
states and skips `withCorrelationEdges` entirely rather than calling it with
an empty array — the merge would be content-equivalent either way (same
nodes, same edges, same clusters) but never reference-identical, since it
always returns a new object. Either way, _the measurement is in flight_, _no
pass has ever run_ and _the measurement could not be read_ draw **the same
picture** — the one this region drew before Story 6.5 — and differ only in
one clause of the accessible sentence. That is `PRODUCT_SPEC.md` §36's
degrade-locally rule arriving inside one region for the first time: until this
task, the topology's only failure state was _the universe request failed_,
which correctly blanks it, because the universe is its subject. A missing
measurement is not.

The fourth state states a **population and a reach** — how many pairs are
drawn, how many equities they touch, out of how many measured over how many
sessions — and names no ticker, because 1,860 named pairs in a hidden
paragraph is a wall rather than a fallback. The figures that describe what is
**drawn** come off the merged graph and the figures that describe the
**population** come off the pass row; neither is derived from the other.

### What the model gained, and what `buildTopologyGraph` did not

`TopologyEdge` is a union now: `TopologyMembershipEdge` (no weight,
structurally absent) and `TopologyCorrelationEdge` (a **required**, signed
`weight`), which is the reversal trigger `topology.ts`' own docblock
pre-committed to, fired as worded. **`buildTopologyGraph` is unchanged, down
to its signature** — the merge is a separate pure function,
`withCorrelationEdges(graph, correlations)`, so the builder stays a function
of the curated universe alone and Epic 13's replay hand-off is intact. A
correlation edge's `from` is the lexicographically **lower** ticker, which is
`0018` §3's canonicalisation rather than a second convention, and the merge
resolves either orientation rather than trusting its caller.

### What nobody has seen

**CI never draws one, permanently** — zero bars, no provider, no pass — so
every gated run draws the pre-6.5 graph and the only assertion a gated browser
run makes is about the _never measured_ sentence. The ink check in
`overview-market-topology.spec.ts` compares the canvas's own `toDataURL()`
between two arms (the route blocked, and not) and is skipped where the store
has no pass, which it says on its face.

And `docs/GAPS.md` carries the sharpest residue: the `setLineDash([])` reset
after the correlation batch is invisible to every level — delete it and every
later mark in the frame is dashed, on a store that has correlations, with
nothing mechanical able to see it.
