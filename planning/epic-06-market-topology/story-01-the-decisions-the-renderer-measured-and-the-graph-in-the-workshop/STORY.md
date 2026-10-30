# Story 6.1 — The Decisions, the Renderer Measured, & the Graph in the Workshop

**Status:** Not started
**Epic:** [Epic 6 — Market Topology](../EPIC.md)
**Depends on:** nothing
**Epic scope covered:** Graph domain model · Sector/industry relationships · Graph-layout generation · WebGL renderer

## Description

**This epic has more undecided than any since Epic 3, and one of its decisions
is not ours.** `PRODUCT_SPEC.md` §27 commits the topology to WebGL and names
Sigma.js as _"a good candidate"_ — a recommendation rather than a mandate — and
nothing in this repository has ever rendered a canvas. So this story decides,
**measures rather than assumes**, and puts a real graph of the real universe in
front of a person in the **workshop**.

**It deliberately does not touch `/`.** The reserved band is **161 px** at
1440×900 and **119 px** at a 680 px viewport, which is not a graph — and _the
first commit that renders a graph node_ is the recorded reversal condition for
the landing page's interim layout. Those two facts make the route change a story
of its own, which is 6.2.

**The graph it draws needs no new data.** Nodes are the **516** tracked
securities from the curated universe; clusters are the **eleven** sectors;
`ETF/index relationship` is the sector SPDRs and the four market proxies, which
the universe file already carries. `PRODUCT_SPEC.md` §10's other two
relationships — _common industry_ and _strong historical return correlation_ —
are **not** in this story: industry is curated and free, correlation needs 60
sessions and a nightly pass, which is 6.5.

## What the user can see when this story lands

**A graph of the whole tracked market, in Storybook** — 516 nodes clustered into
eleven sectors, pannable and zoomable, at a measured frame rate.

**Nothing on any route**, and that is the point rather than a shortfall: 6.2 is
the story that pays it off, and it is next.

## Acceptance criteria

**Rewritten 2026-10-30 at this story's own Gate 1**, after shaping found three
of the eight unmeasurable or wrong as first written. Each note below says what
changed and why; nothing here is a correction to work already done, because
none had started.

1. **The renderer is chosen by MEASUREMENT, between two real candidates, and
   whichever wins ships — even if it is not WebGL.** §27 says the topology
   _"should intentionally exercise WebGL"_; the owner's decision at this Gate 1
   is that the measurement decides regardless, and §27 takes a dated amendment
   the day it does not win. **Candidate A** — Sigma.js + graphology, built
   inside `apps/frontend/src/topology/` only (graphology is a browser-oriented
   mutable structure and must never reach `packages/shared`, which a Fastify
   server also depends on). **Candidate B** — a hand-rolled Canvas2D renderer,
   zero dependencies, in the ADR-0027 no-library spirit. Built far enough to
   draw the real 516-node, 514-edge graph (§5) and compared on:
   - **Frame rate** — see AC 5.
   - **DOM-node count** inside the Storybook iframe at the full universe, not
     `/`'s 447 (this story ships no route, so that comparison is 6.2's).
   - **Bundle cost**, measured honestly: if the renderer is reachable only from
     a `.stories.tsx`, Rolldown tree-shakes it out of the **app** bundle
     entirely and the delta there is **0 bytes for both candidates** — report
     that fact plainly rather than a number that means nothing, and report
     instead the Storybook bundle's own delta and each library's installed
     size, **labelled as not what `/` will pay**. That real cost is 6.2's to
     measure, against whichever candidate wins, with or without a dynamic
     `import()` at the region boundary (an open question for 6.2, not this
     story).
     A rejected library (PixiJS/three.js, `react-force-graph`, Cosmograph/regl)
     is recorded with reasons rather than built, and the ADR says which
     rejections are measured and which are reasoned.
2. **The graph model lives in `packages/shared` and holds no renderer type.**
   Nodes, edges, clusters and the layout's output are domain data; the renderer
   is a reader. §26 puts `topology/` in three parts — `renderer`, `layout`,
   `interaction` — flat files under `apps/frontend/src/topology/`, following
   the `market/` precedent exactly (barrel `index.ts`, an `eslint.config.mjs`
   boundary entry in the **same** `no-restricted-imports` pattern array as
   `market/`'s — a second block silently replaces rather than adds to it).
   The model is what Epic 7's `get_related_securities` and
   `highlight_graph_nodes` will read, and the layout lives in `packages/shared`
   too (coordinates in **normalised abstract units, never pixels** — a pixel is
   a fact about a viewport) so Epic 7 can read positions server-side and the
   two renderer candidates are compared on drawing rather than on two different
   layouts.
3. **The layout is deterministic and reproducible — as a structural property,
   not as a byte-identical fixture.** `Math.sin`/`cos`/`exp` are not required to
   be bit-reproducible across engines (Node on the test runner, Chromium in the
   browser), so the mechanical check is: every node placed exactly once, no two
   nodes coincident, cluster centroids in a stable declared order
   (`SECTORS`' own order) — asserted in `pnpm test`, cross-engine-safe by
   construction. `Math.random()` is unguarded anywhere in this repository
   today and is the likeliest real non-determinism source for a layout; it
   gains an invariant and a break in this story. A **closed-form radial layout**
   (no simulation) is built for this reason among others — see the design
   work below. **Screenshot comparability has no mechanism in this
   repository** — there is no screenshot-diff infrastructure anywhere in
   `e2e/` — and claiming otherwise is `docs/GAPS.md` material with a
   `Re-measure:` naming the `pnpm probe` command and story id, not an
   acceptance criterion a check can hold.
4. **Node identity is the security's `symbol`, resolved from the node's own
   datum** — the wire and domain field, not the display word _ticker_ (which
   is what a reader sees at `/securities/:symbol`). Writing this as "ticker"
   invites a second field name for one fact, which is exactly the defect
   `search-and-the-universe-share-no-words` exists to prevent. This is the rule
   Story 4.6 established for a surface whose members move, and the reason its
   activation race is unrepresentable rather than managed — held by an
   invariant over **every shipped source file in three trees**, the
   `one-home-for-imperative-navigation` shape, because a four-directory corpus
   was green on the file Epic 5 then wrote.
5. **The frame rate is measured at this story's REAL edge count — 514, not
   §28's 5,000** — hub-and-spoke, one edge per equity to its sector's benchmark
   ETF (501 equities with a sector, **plus 11 hub edges, SPY → each sector
   ETF** = 512 membership-shaped edges; see the design work for why `QQQ`,
   `DIA` and `IWM` carry none). §28's 5,000-edge target is **not this story's
   number to hit** — it arrives with Story 6.5's correlation edges, and §28
   gains a dated amendment there rather than here. Method, on a **built
   Storybook, not a dev server**, with two concrete instrument fixes this story
   owes before either figure can be trusted:
   - `overview-instrument.mjs`'s `assertProductionBuild` is keyed on an
     `/assets/index-*.js` fingerprint that a Storybook build does not emit — it
     must gain a **second, separately-proved** `assertStorybookBuild`
     fingerprint rather than a loosened regex, with its own negative proof in
     `prove-instrument.mjs` (refusing a `storybook dev` server).
   - The repaint arm watches `<main>`, which does not exist in a Storybook
     iframe (`#storybook-root` does) **and a canvas mutates no DOM at all** —
     so that channel is silent for exactly the reason a working graph and a
     one-black-frame-then-stopped graph would both report nothing. The plant
     for this story's frame-rate claim must live **inside the render loop**
     (a known-cost per-frame block, or a `readPixels` assertion), never on the
     DOM.
     **60 FPS "during normal interaction"** is measured under a **scripted,
     identical-for-both-candidates pan/zoom path**, over the rAF-gap recorder
     (worst and p95 gap against the 16.7 ms quantum) — a still canvas certifies
     nothing. **No task over 50 ms** is the three-channel claim
     (`longtask`/`long-animation-frame`/rAF-gap, each proved by its own plant).
     Both read `document.visibilityState` first and the machine load **before**
     the run, never during. A browser-side calibrator needs no gap-inflation
     caveat (measured ×1.00 at these gaps); a calibrator sampled while timing the
     layout generation goes in its **own** loop, never inside the measured block
     (the 2026-10-14 lesson: in-loop reads 7.2× high and discards most samples).
6. **Every colour the renderer draws is read from a token**, never a literal —
   mechanically, **in the direction that is checkable**: a `pnpm invariants`
   entry refusing any `#rrggbb`/`rgb(`/`hsl(`/`0x` colour literal in the
   renderer's corpus, with a break, proved by writing the file Story 6.3 would
   write first. **The parse layer must throw rather than default** — a
   `parsePacked(...) ?? 0x000000` draws an invisible black node nothing can
   see, which `getTokens()`'s own "throw rather than silently proceed" rule
   already establishes for every other reader. Two honest limits, stated
   rather than hidden: `a-var-read-resolves-to-a-declared-token` is keyed on
   CSS Module `var()` reads and is **structurally blind to a canvas**, which
   emits none — so new topology tokens must also go into the hand-maintained
   `TOKEN_NAMES` list, which is the mechanism this story actually gets (a real
   startup throw) rather than the one that would be nicer (an automatic
   check); and `getTokens()` throws in the test environment, so **no level
   below a real browser can verify a single colour this renderer draws** —
   that is structural, the same as the existing rule, and `pnpm probe` is the
   verification level for this half.
7. **A Storybook story per state — the real state set, not a copied one.**
   This component needs only `symbol`, `kind` and `sector` (no price, no bar,
   no anomaly score), so **CI's permanent zero-bars state and "the whole
   universe" are the identical picture** for this component — that duplicate
   is dropped. The real states reuse `use-securities.ts`'s existing
   `SecuritiesView` union rather than inventing a parallel one: `loading`
   (a reserved box, never a half-drawn canvas), `loaded` (the whole universe —
   the headline story), `loaded` filtered to **one sector** (the design
   story), `empty` (the service answered correctly and holds nothing — a
   genuinely CI-relevant state, reachable from an unmigrated/universe-unloaded
   database, which `CLAUDE.md` records as having _no other symptom_), and
   `failed` (+ `retryable`/`retrying`). Plus **the state nobody had named**:
   the **four market-proxy nodes**, whose `sector` is `null` — not a null-check
   afterthought but a real layout and design question (see the design work),
   and the exact shape of the serialiser trap this repository records twice
   (a `null` under a declared `"number"` reaches the wire as a plausible `0`,
   never a visible absence). **Every absence state is DOM text, sibling to the
   canvas, never drawn inside it** — the only way it is assertable below a
   browser, reachable by a screen reader, and visible to
   `overview-degraded-grid.spec.ts` once this surface reaches `/` in 6.2.
8. **The decisions are recorded with their alternatives and a reversal
   trigger**, and a trigger is a condition rather than a story number — as
   **ADR 0048** (the next free number), covering the renderer, the model's home
   and the layout's closed form, each with the figures and the reversal
   trigger named in the design and measurement work below.

## Decisions — settled 2026-10-30 at this story's Gate 1

Five decisions, all taken. Nothing below is open; the record stands as the
alternatives considered, because a decision recorded only as its outcome loses
the reasoning the next reader needs.

**1. Theme — light theme only.** Settled the same day as this decomposition,
and the renderer is designed against it from the first node: one palette, the
contrast figures measured against one ground stay meaningful
(`--chart-volume` 3.50:1; the amber ramp's steps **1.12 / 1.43 / 1.59**).
`VISUAL-LANGUAGE.md` carries the decision, the case for reversing it, and a
reversal trigger that is a condition — _the first surface this product ships
that a person is expected to watch for a long sitting in a dim room_.

**2. The canvas — drawn, not discovered in code.** The design work below is
real: `The graph at rest.dc.html`, written to the canvas 2026-10-30, covers the
node, the cluster and the edge at rest for the whole 516-node universe. **And
it found a live conflict on the canvas itself**, corrected in the same
change — see "What the canvas already said, and was wrong" below.

**3. The renderer — chosen by measurement, and the figures decide even
against §27's stated intent.** Two real candidates, built far enough to
compare: **Sigma.js + graphology** (§27's named one) against a **hand-rolled,
zero-dependency Canvas2D renderer** (the ADR-0027 no-library spirit). Whichever
wins on frame rate, DOM-node count and (6.2's) bundle cost ships — **even if
that is not WebGL**, which is the one place this product was going to
exercise it on purpose. If Canvas2D wins, §27 takes a dated amendment the same
day recording that the spec's WebGL intent was overruled by its own
measurement clause. **No synthetic-load discriminator** — the figures are
taken at the real 516-node, 514-edge universe only; both candidates will pass
§28's 60 FPS comfortably at this size (that target's real test is Epic 14's
5,000-node mode), so this story's measurement prices the two candidates rather
than separating them at scale, and that is recorded as what the number means
rather than overstated.

**4. The edge, at the start — sector and ETF membership, 514 edges.** Free
data, no nightly pass, a readable clustered graph from day one. Correlation
(§10's _strong historical return correlation_) is Story 6.5's, deliberately,
because it needs 60 sessions and a pass this story does not build.

**5. No dedicated route.** §8.1 puts the topology inside Market Overview,
§37's V1 scope list never asks for a dedicated route, and `PATHS` has four
entries today. The topology stays inside `/`, which is Story 6.2's to fit —
see the design work's handed-on note about the region's actual box.

## Design work — drawn 2026-10-30, `The graph at rest.dc.html`

**The canvas is the source of truth** (ADR 0026) and now carries this epic's
first page, 12 sections, covering exactly this story's scope and stopping
exactly where it stops — no anomaly band (6.3), no hover or selection (6.4),
no quantitative size (6.6), no motion (6.7).

**Four existing tokens, zero new ones, zero hue.** `--chart-volume` (equity
disc fill, measured **3.50:1** against the panel ground — the best of four
grounds this family was measured on, so ADR 0026's standing exception does not
fire), `--ink-primary` (sector ETF and market-proxy fill), `--chart-grid`
(membership edges), `--chart-reference` (the eleven SPY→sector hub edges) and
`--surface-raised` for every node's 1px halo. `grayscale(1)` changes nothing —
the resting graph is already achromatic, so **every bit of the amber ramp is
unspent and is Story 6.3's**, which is worth more to that story than any band
treatment this page could have guessed at.

**Three node kinds, three shapes, one nominal ladder.** Circle · 8px ·
`--chart-volume` for the 501 equities (the same mark, the same token, as
`Marker`'s arrival disc — _"the 8px is `--space-8` from the spacing grid rather
than a size invented for a dot"_). Square · 10px · `--ink-primary` for the
eleven sector SPDRs. Diamond · 12px · `--ink-primary` for the four market
proxies. Shape carries kind; size is **nominal**, and Story 6.6 inherits a
bound — a quantitative encoding varies the equity circle's radius only, so the
class read survives where a large equity reaches an ETF's footprint.

**The footprint is 16px and 4px of it is reserved, not spare.** 8px of ink
inside a 16px footprint — `--space-8` disc, `--space-16` footprint, `--space-4`
annulus, the annulus being exactly `(16−8)/2` rather than a fourth decision.
§10 calls Story 6.3's encoding `Border — anomaly strength`; a border needs an
annulus, and if 6.3 had to grow the node to fit one, every one of 516
positions, every cluster radius and every label would move. **So the layout's
minimum centre-to-centre separation is 16px, not 8** — the one figure here a
later story cannot change cheaply. A second collision neither story would
find alone: `--focus-width` 2px + `--focus-offset` 2px is **exactly** that
4px, so Story 6.3's band ring and Story 6.4's focus ring want the same
annulus and must agree about it.

**The cluster is drawn by the edge, with no separate treatment at all.** A
sector reads as a group because _n_ faint spokes converge on one near-black
square — the benchmark ETF at its own cluster's centroid. No hull, no wash, no
eleven-colour palette (rejected in §11 for three independent reasons, any one
fatal — it cannot clear contrast _and_ stay mutually distinguishable at 8px,
it collides head-on with Story 6.3's channel, and it dies in greyscale where
this product's two-hue price palette already differs by only 1.04:1). Cluster
radius is **derived** so node density stays constant across sectors that run
83 down to 21 members (a 4.0× spread): `r = √(n · 256 / 0.6 / π)`, computed from
the universe at load, never a checked-in table — Industrials 83→106px down to
Energy 21→53px.

**The edge is two kinds, and the decision for three proxies is a refusal
rather than an omission.** Membership (equity → its sector's ETF, 501 of
them, `--chart-grid`, gapped at both ends so 83 edges bundling into one point
do not sum into a grey disc) and hub (SPY → each sector ETF, 11 of them,
`--chart-reference`) — **512 edges total**. `QQQ`, `DIA` and `IWM` get **no**
edges, and the page states why each, as ADR 0029 applied to a line — _a claim
about data requires data_: `SPY`'s partition by the eleven sector SPDRs is
recorded and derivable (`SECTOR_ETFS` is a total map over `SECTORS`); `QQQ`
and `DIA` are overlapping subsets this product stores no constituent list
for; `IWM` is disjoint from the S&P 500 **by construction**, so there is no
relationship to draw, not merely an unrecorded one. The three float free,
together, under one `MARKET PROXIES` label, so they read as _benchmarks we
have not decomposed_ rather than as broken nodes. **Handed to Story 6.5: dash
is unspent** — both kinds here are solid, and a correlation is a measurement
where membership is a curated fact, which is a difference worth a visual
channel when that story needs one.

**The whole universe is drawn, true to size, and the number that settles
whether 516 is readable at this footprint is 4.3% ink.** A radial layout —
eleven sector wedges from twelve o'clock clockwise in `SECTORS`' own
declaration order, angular span proportional to cluster diameter so no two
clusters can collide by construction, golden-angle placement of members within
a wedge — closed-form, no simulation, satisfying AC 3 as a property of the
function rather than of a random seed's configuration. Ring radius **335px**,
extent **882px** at zoom 1. Below ~2% ink a graph reads as empty; above ~8%
clusters merge and leave Story 6.3's amber nothing to stand against; this
layout draws **4.3%** — "516 nodes is not a density problem at this
footprint," which the page calls the single most useful thing it establishes
before any renderer is chosen.

**Zoom:** position scales; node size scales too but **clamped to [0.5, 1.5]**
so the 8:10:12 ladder holds at every zoom (absolute 4–12 / 5–15 / 6–18px); edge
width, halo and label type stay **constant** — a scaling edge at zoom 3 is a
3px rope and 501 of them are a web.

**Labels — eleven sector names, four proxy tickers, and 501 deliberate
silences.** Sector labels in this product's existing micro-label idiom
(`--font-size-micro` 11/16, `--letter-spacing-micro` 0.08em, uppercase,
`--ink-secondary`) placed above each cluster, `--space-8` clear of its
bounding circle — and that circle's layout box must include **24px above it**
(8px gap + 16px line box) or a long label like `CONSUMER DISCRETIONARY` at
158px paints across whatever is above it, invisible to every test below
`pnpm e2e`. The four proxy tickers in `--font-data`, mixed case (a ticker is
already upper case; the micro-label's tracking is wrong on monospace). **No
equity is labelled at rest** — 501 tickers at ~26px each do not fit without a
5× frame or a non-deterministic collision pass (against AC 3) — with a
reversal trigger that is a condition rather than a default: _the first zoom
level at which the layout's own geometry leaves 26px of clear ground beside
every node in the viewport_, which is Story 6.4's or 6.8's to measure from a
frame rather than to guess.

**What the canvas already said, and was wrong — corrected in the same
change.** `MarketPulse Design System.dc.html` carried an illustrative
"TOPOLOGY NODES & LEGEND" card, predating this story's work, that used
**`size = market cap`** (this product holds no market-capitalisation data
anywhere — there is no share count and no market cap in any store, which
Story 6.6's own open work independently confirms) and **`fill = price move`**
as price direction's **sole** encoding (this product's own settled rule is
that colour is never the sole encoding of anything), with a pulsing red
anomaly ring drawn before Story 6.3 exists to decide what that ring is. This
is not a taste disagreement — the first is a data claim this product cannot
back, the second is a rule this product has already settled against it. The
card now carries a dated amendment in the house idiom (crimson banner,
historical sketch left standing rather than deleted) pointing to
`The graph at rest.dc.html` as the authority for the node, cluster and edge
at rest.

**Handed on, by story**, in the page's own §12: 6.2 (882px square does not fit
`Market overview.dc.html` §02's real box — recommendation **an elliptical
ring**, R_x≈540/R_y≈185 for a 1392×520 box, keeping node size fixed and letting
the ring deform, with clusters near twelve and six o'clock squeezing against
the frame as the measured cost); 6.3 (the 4px annulus, no hue to compete
with, the focus-ring collision with 6.4); 6.4 (`--surface-inverse` is unspent
and is the obvious selection channel); 6.5 (dash is unspent, 512 against
§28's 5,000 leaves room); 6.6 (the ladder is nominal, vary the equity circle
only); 6.8 (the label-at-zoom trigger).

`VISUAL-LANGUAGE.md` line 723 is the constraint this epic inherits regardless
of any of the above: **no idiom from the chart layer**, because §27 commits
the topology to a different renderer against a different problem.

## Out of scope

The landing page's layout (6.2), the anomaly encoding (6.3), interactions (6.4),
correlation edges (6.5), node sizing (6.6), live updates (6.7), filtering and
the degraded set (6.8).
