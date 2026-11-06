# Story 6.6 — Node Size, Edge Strength, & the Encodings That Remain

**Status:** Not started
**Epic:** [Epic 6 — Market Topology](../EPIC.md)
**Depends on:** 6.3, 6.5
**Epic scope covered:** Node sizing · Edge strength

## Description

`PRODUCT_SPEC.md` §10 lists **five** possible node encodings — size, intensity,
shape, border, cluster — and this epic has shipped two of them by now (cluster in
6.2, the anomaly band in 6.3). This story takes the rest, and the reason it is
late rather than early is legibility: **five encodings shipped together makes
none of them readable**, and each one added has to be measured against the ones
already there.

**Node size is where ADR 0045 bites hardest, and the obvious answer is
refused.** §10 offers _"market capitalization or liquidity proxy"_. A liquidity
proxy means **volume or traded value**, which is **extensive** — it scales with
the tape's share of the market — and the live feed is `iex` while the stored
history is consolidated `sip`. IEX carries **3.54%** of the volume on minutes
both tapes printed while **printing in 81.6%** of them, so a volume-sized node
is wrong by roughly **36×** and the error is invisible on screen. The dispersion
forbids a correction: **p10 1.60% against p90 5.83%**, a 3.6× spread, admits no
single constant.

**Market capitalisation is not a market quantity we hold.** The universe file
carries sector, industry and listing venue; there is no share count and no
market cap anywhere in this product. So sizing by cap means **new curated data**,
with the drift problem `UNIVERSE.md` §5 already records for classification —
and a cap that goes stale silently re-sizes the whole graph.

## What the user can see when this story lands

**The graph gains hierarchy.** Larger companies read as larger, stronger
relationships as stronger, and the picture starts to carry the shape of the
market rather than a uniform mesh.

## Acceptance criteria

1. **Whatever sizes a node is INTENSIVE, or reads one tape by name, or is
   refused** — ADR 0045's three permitted answers, in its order of preference.
   A measured share applied as a multiplier is **not** one of them: that is
   computing an adjustment whose error is invisible, which is the one place
   `PROVIDER.md` §3.5's objection actually reaches.
2. **If the answer is market capitalisation, its provenance is displayed and its
   staleness is dated** — invariant 6, and `UNIVERSE.md`'s rule that curated
   data carries the date it was checked. Sector and industry already do.
3. **Every added encoding is measured against the ones already drawn**, in
   greyscale, at the real distribution — not at an even split. 8 nodes in 500
   carry `extreme`; a size encoding that swamps it has broken 6.3.
4. **No invented curve.** A log cap, a sigmoid or a chosen knee is calibrated in
   one tape's units and breaks ADR 0045's invariance. If a non-linear map is
   needed, it is **derived** from the measured distribution and recorded with
   its derivation, which is the discipline behind `ANOMALY_BAND_FLOORS` and
   `BASELINE_MINIMUM_SAMPLE = 2500`.
5. **Edge strength is drawn from the stored weight**, not recomputed in the
   renderer, and the top-N cut 6.5 established is still visible as a cut rather
   than as a fade to nothing.
6. **`shape/icon — security type` is taken or refused in writing.** The universe
   has three `SECURITY_KINDS` — `equity`, the sector SPDRs and the market
   proxies — and fifteen of 516 nodes are not equities. Drawing them identically
   is a decision; so is not.
7. **A photograph of the full graph at all four widths**, with the encodings
   named in the record.

## Open decisions — for the Product Owner

1. **Size by what?** Market cap needs new curated data and a staleness story.
   A one-tape volume figure (`iex`, by name) is permitted by ADR 0045 but means
   _size by how much IEX saw_, which is a fact about our reach rather than about
   the company. **Refusing to size nodes at all** is the third option and leaves
   a uniform graph that is honest — recommendation is to take this one explicitly
   rather than reach for the liquidity proxy §10 suggests.
2. **Are the fifteen non-equities drawn differently?** They are the anchors of
   every ETF edge and arguably the most important nodes on the screen.

## Design work

Size, edge weight and security type on the canvas, against the band treatment
6.3 established — because the question is not whether each works but whether all
of them work **at once**.

## Out of scope

Live updates (6.7), filtering (6.8).

## Handed here by Story 6.2's close — 2026-11-01: the memo trigger this story may fire, and the annulus it has to share

**This story's own node size is named, by `MarketTopology.tsx`'s docblock, as
one of the two likely sources of the declined `React.memo` boundary's
reversal trigger** ("the first prop this region takes that changes at feed
cadence" — Story 6.3's anomaly band is the other). If the size this story
draws is driven by a quantity that updates live (a share figure refreshed
per batch, say, rather than a value fixed at mount like the rest of the
graph), the memo decision needs re-taking with a producer-side
`framesDrawn()`/mount-count measurement, not assumed to still hold — see
`MarketTopology.test.tsx`'s "the declined memo boundary" describe block for
the test shape.

**The 4-unit annulus between ink and footprint is reserved, not idle, and
this story is a THIRD claimant on it.** `renderer.ts`'s own docblock: ink is
`TOPOLOGY_NODE_INK` (8/10/12 px at zoom 1, by kind) while the drawn
footprint is `TOPOLOGY_NODE_FOOTPRINT = 16` layout units — the 4-unit margin
is reserved for Story 6.3's anomaly band and Story 6.4's focus ring. A size
encoding that grows a node's own ink into that margin collides with both
before either ships, or after one has; **check which of the two has landed
before taking the margin**, and `TOPOLOGY_NODE_SCALE_FLOOR`/`_CEILING`
(0.5–1.5, already clamped at zoom) is the existing precedent for keeping a
scaled quantity inside a bounded range rather than growing without limit.

## Handed here by Story 6.4's close — 2026-11-06: this story is the one most likely to BREAK node crowding's own measured bound, directly rather than as a side effect

**A node size encoding changes the one thing Story 6.5's own hand-off (above
this one, written the same day) warns is already contested: screen-space
separation between neighbours.** Story 6.4 measured (Task 6.4.1's hit-test,
Task 6.4.3's interaction probe) that the densest real cluster
(`TECHNOLOGY`) already has at least one node whose hit-test target reaches
**0.0 px** at the narrowest tested width (390) — contested at its own
centre, because `topologyNodeAt` returns whichever of two neighbours is
nearer and neither is unambiguously nearer there today. **Story 6.5's own
edges do not move anything and so cannot make this worse by construction;
this story's own node size DOES move something** — `TOPOLOGY_NODE_INK`
scaled by whatever this story's size quantity resolves to will, for any
node drawn larger than today's constant 8/10/12 px, shrink the clear space
to its neighbours by exactly the amount it grows, and the 0.0 px finding
means there is **no slack left to spend** in `TECHNOLOGY` at 390 before
this story ships anything.

**Concretely, before taking `TOPOLOGY_NODE_SCALE_FLOOR`/`_CEILING`'s
0.5–1.5 range as the safe envelope for a size encoding**: that range was
derived for the existing constant ink and the existing hit-test (the one
Task 6.4.1 repaired to read screen pixels from the ink, not the other way
around) — it was never checked against the crowding figure above, because
nothing drew a variable size when it was chosen. This story owes a fresh
measurement of the SAME `scripts/topology-interaction-probe.mjs` figures
(or its successor) with its own size encoding applied, at 390 specifically,
before accepting the inherited 0.5–1.5 range as sufficient. If the range
needs narrowing to keep `TECHNOLOGY`'s hit targets above zero, that is this
story's own finding to make and record — not an assumption to inherit.
