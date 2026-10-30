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

**Nothing is on any route.** The whole of what this section describes is
reachable only in Storybook (`Components/MarketTopology`), reviewed by nobody
but the people who built it, on one development machine. Story 6.2 is what
puts this on `/`.

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
The cluster is drawn **by the edge alone** — no hull, no wash, no per-sector
palette — for three independent reasons recorded on the canvas, any one
fatal. No equity is labelled at rest (501 tickers do not fit without a
non-deterministic collision pass, which acceptance criterion 3 refuses); the
reversal trigger is a condition — _the first zoom level at which the layout's
own geometry leaves 26px of clear ground beside every node in the viewport_ —
not a default.

## 4. What no machine and no person has seen — the running section every later story amends

- **Nobody has watched this on a real screen.** The built Storybook is the
  only surface any of this exists on. Story 6.2 is what changes that.
- **The frame-rate and no-task-over-50ms figures are local, one laptop, and
  not §28's scale** — 518 nodes / 514 edges, not §28's 500/5,000 nor its own
  5,000/25,000 synthetic target. `docs/GAPS.md` carries the entry; Epic 14
  owns the re-take at scale.
- **A sector's label still crosses into a neighbouring cluster's circle at
  the component's own default size, and no single ring radius fixes it in
  general.** `communication_services` into `consumer_discretionary`'s, −28px
  of clearance measured at the `1392 × 520` box Story 6.2 will fit this into.
  `docs/GAPS.md` has the full account, including a repair attempt that was
  itself proved wrong before being corrected into an honest regression-floor
  test rather than a false correctness claim. **Owner: the next story that
  fits this layout into a real box and can make the renderer scale-aware** —
  already Story 6.2's territory for an unrelated reason (its own elliptical
  ring, a different box shape again).
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
