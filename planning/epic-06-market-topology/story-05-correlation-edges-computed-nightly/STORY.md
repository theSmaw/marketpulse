# Story 6.5 — Correlation Edges, Computed Nightly, & the Strongest N

**Status:** **Gate 1 approved 2026-11-06 — decomposed into four tasks.**
**Epic:** [Epic 6 — Market Topology](../EPIC.md)
**Depends on:** 6.2
**Epic scope covered:** Correlation relationships · Edge strength (the data half)

## Description

**Until this story the edges are memberships; after it they are measurements.**
`PRODUCT_SPEC.md` §10's second relationship is _strong historical return
correlation_, and it is the first edge in this product that says something the
curated universe does not already know.

**It is the sixth member of ADR 0044's family and the first that is not
per-security.** `relationships` is listed in §30 and does not exist; migrations
stop at `0017`. A correlation is keyed by a **pair**, which every existing
derived table is not, and that changes the arithmetic: 501 equities is **125,250
unordered pairs**, so this story's first question is what it stores rather than
how it draws.

**§10 answers that and the answer is a constraint rather than an optimisation:**
_"To avoid an unreadable graph, the system should retain only the strongest N
relationships per node."_ So the pass stores a **top-N per node**, which is a
**selection** — and Story 4.5 established what that means here: every row
carries its own key, so ordering and uniqueness are checkable from the data
rather than trusted.

**And a correlation is the one market quantity ADR 0045 permits across tapes.**
The restated test is **extensive versus intensive** — _does the quantity scale
with the tape's share of the market?_ A correlation of returns does **not**: it
is scale-free, so it survives the two tapes disagreeing about how much of the
market they saw. **A traded-value or share-volume edge weight is extensive and
is refused**, by a factor measured at ~36× and dispersed 3.6× across securities,
which no multiplier can correct.

## What the user can see when this story lands

**Securities that move together are drawn together**, and the graph stops being
a sector diagram. Edges carry a strength a reader can see.

## Acceptance criteria

1. **The pass is nightly and keyed by the session it is FOR** — ADR 0044's
   shape, in `backfill.yml` after the fill, with its window-end column named
   `observed_at` so Epic 13's plugin covers it structurally.
2. **The key is a pair, and its ordering is declared.** An unordered pair stored
   once with a canonical order, or twice — either is defensible; deciding by
   accident gives a graph with half its edges.
3. **The tape is in the key if the computation reads one** (ADR 0045 decision 3).
   `volume_baselines` is keyed `(security_id, observed_at, feed)` where the
   earlier tables key on the session alone, **because a tape choice that carries
   a reversal trigger can flip, and a flip against a session-only key rewrites
   every row with nothing recording that the meaning changed.**
4. **The window, the minimum sample and the refusal are DERIVED, not chosen** —
   the discipline Story 5.3 established. Its minimum sample came from
   `50/√n ≤ 1`, giving `n ≥ 2500` exactly rather than a round number, and **11
   of 511** securities refuse on it. A correlation over too few sessions is
   refused and says so.
5. **A pair that cannot be computed gets no row, and the surface still states
   its population** — which is why `0014` and `0017` are each paired with a
   **pass** table. A graph that joins only the row table under-reports and looks
   correct.
6. **The split guard applies.** Returns are computed from the **raw** store and a
   session-boundary discontinuity **refuses** the security (ADR 0047). It refused
   **5 of 516** for the percentile, four on exact split factors — a 10-for-1
   split is a −90% return and would correlate with anything that moved that day.
7. **The cost is measured before it is scheduled.** The percentile's
   full-universe pass is **11.78 s warm / 20.67 s cold** over 48.8 M bars; a
   pairwise pass is a different order of magnitude and its figure is taken rather
   than estimated. **The expensive unknown was not expensive last time**, which
   is the reason to measure rather than assume in either direction.
8. **`pnpm test:database` covers the pass**, and the top-N selection is asserted
   on the **producer** — array identity and byte-equality — because the wire
   cannot see a defect in the producer.

## Open decisions — for the Product Owner

1. ~~**What is N?** §10 says _strongest N per node_ without a number. At 500
   nodes, N = 5 is 2,500 edge slots and §28's target is _several thousand
   edges_, which fits; N = 20 does not. The figure should come from a
   measurement of readability and frame rate, not from the target.~~ —
   **PARTIALLY SETTLED at Gate 1, 2026-11-06: the figure itself is deferred to
   Task 6.5.3's own measurement, as the decision's own text already asked —
   what is settled now is the SELECTION MECHANISM the figure will be applied
   under.** A node's top-N is not symmetric (A's strongest five may not
   include B even where B's strongest five include A), so "retain the
   strongest N per node" under-specifies the drawn set by roughly a factor of
   two depending on which reading is taken. **Union, stored once**: a pair is
   retained if it is in EITHER endpoint's own top-N, written as a single
   canonically-ordered row (ordered by **ticker**, not `security_id` — the two
   stores disagree on row-insertion order and a `security_id`-ordered key
   would silently canonicalise differently between CI and the deployment).
   Each node's exact top-N is fully recoverable from the stored union with no
   redundant row and no nullable rank column: filter the retained rows
   touching that node, sort by `|r|` descending, take N — correct by
   construction, because every one of a node's own top-N members is
   guaranteed present in the union. Rejected: **intersection** (mutual top-N
   only), which can leave a node with zero drawn edges despite real, strong
   correlations, reading on screen as "this relates to nothing"; and
   **directed, stored twice**, which costs roughly double the rows for a
   per-node rank ordinal nothing today asks for. **Reversal trigger, a
   condition:** _the first surface that must state a node's own rank among
   its neighbours_ (e.g. "your 2nd-strongest partner") — only then does the
   directed form earn its cost.
2. ~~**What window, and does it update intraday?** A 60-session correlation is
   a slow-moving quantity; recomputing it live is expensive and probably
   meaningless. Nightly is the recommendation.~~ — **SETTLED at Gate 1,
   2026-11-06: nightly, and the window is the existing 60-session
   `return_baselines` grid of 5-minute returns, not daily closes.** Nightly
   because a 60-session correlation cannot move visibly within one session
   and §10 asks for a relationship to inform a shape the market-data store
   already updates slowly; the hiding question was never "nightly or live"
   but "daily or intraday returns," which decides whether the ranking means
   anything at all. A 60-session **daily**-close correlation has a Fisher-z
   standard error of ≈0.13 at n = 60 — a top-5 selection over a statistic that
   imprecise re-orders close to randomly from one night to the next, which
   would make a measurement read as a judgement. The 60-session **5-minute**
   grid `return_baselines` already samples gives n up to 4,620 and SE ≈ 0.015,
   and costs **no additional read of `market_bars`** — Task 6.5.1 accumulates
   each security's return vector as a by-product of the window
   `compute-baselines.ts` already reads per security, rather than opening a
   second pass. The known cost of this choice — thinly-traded securities
   under-sample the grid and their pairwise coefficients attenuate toward
   zero, which biases a ranking against exactly the securities a reader can
   least independently verify — is named rather than hidden, with a
   `docs/GAPS.md` entry at this story's close rather than a silent
   acceptance.
3. ~~**Does a weak correlation draw a weak edge, or no edge?** The second is
   what §10's _strongest N_ implies and is cheaper to read.~~ — **SETTLED at
   Gate 1, 2026-11-06: no edge below a DERIVED floor.** A retained pair is
   refused — no row, not a faint one — if its coefficient is not
   statistically distinguishable from zero at that pair's own counted
   overlap `n` (a Fisher-z confidence interval excluding 0), which is Story
   5.3's own discipline (_the minimum sample is derived, not chosen_) applied
   to a quantity Story 5.3 never had to rank. A chosen round threshold (e.g.
   `|r| ≥ 0.5`) was rejected as exactly the kind of number AC 4 already
   forbids. Sparse is a correct, honest outcome, and a weak edge — until
   Story 6.6 ships the visual encoding that would distinguish it from a
   strong one — is a claim the data does not support.
4. **New at Gate 1, 2026-11-06 — which pairs are eligible at all?** Not in the
   story's own list, but the shaping found it undecided: does a correlation
   edge connect any two of the 501 active equities (same-sector pairs
   included), or only cross-sector pairs, or does it extend to the sector
   ETFs and market proxies too? **SETTLED: the 501 active equities, same- and
   cross-sector pairs both eligible, no landmark node (the eleven sector
   SPDRs, the four proxies, the hub) ever forms a correlation edge** — the
   same exclusion Story 6.3 already applies to the anomaly encoding, and for
   an added reason here: `SPY` correlates with nearly every equity in the
   universe, and admitting it (or any sector ETF) to the candidate set would
   make every cluster independently discover a strong correlation to the
   centre, which is the starburst §10's own constraint exists to prevent. The
   first real pass **measures and reports** what share of the retained set
   turns out to be same-sector — if that share is near 100%, the edge layer
   is mostly restating the clustering the membership edges already draw
   rather than adding the cross-cluster information this story's own "what
   the user can see" promises, and that finding is reported at this story's
   close rather than assumed away now.
5. **New at Gate 1, 2026-11-06 — `SecurityExplorer.tsx`'s `Connected
securities` region.** Reserved since Epic 5's own shaping for "which
   securities move with this one and the evidence for saying so" — exactly
   this story's data — and claimed by no story in Epic 6's nine. **SETTLED:
   left alone.** Its placeholder is reworded at this story's close to name a
   condition rather than an epic, the same correction Task 5.7.4 made to
   `Anomaly history`'s placeholder once that one's "names an epic" claim went
   stale. Filling that region is a later, explicit decision — this story
   ships only the topology's own edges.

## Design work

Edge weight as a visible property **(Story 6.6's)**; what the graph looks like
when a security has **no** computable correlations — which on CI is every
security, for ever — settled above as "no new ink, the accessible sentence and
any head-slot legend carry the fact instead" and detailed in Task 6.5.2.

## Out of scope

Node sizing (6.6), live updates (6.7). The edge's **visual** strength beyond
presence is 6.6's. Hover/select/keyboard reachability of an edge itself —
this surface stays node-only, and the gap is handed to Story 6.6's own file
at this story's close rather than left implicit. Filling
`SecurityExplorer.tsx`'s `Connected securities` region — Open decision 5.

## Handed here by Story 6.2's close — 2026-11-01: the ring this story's edges are drawn against is no longer the one §10's figure assumed

**The ring is now elliptical, not circular, and the extent is bigger.**
`buildTopologyLayout`'s shipped defaults are
`TOPOLOGY_RING_RADIUS_X = 800, TOPOLOGY_RING_RADIUS_Y = 340` with
arc-length-proportional wedge allocation (not angle-proportional), fitted
extent **1880 × 923** against the circular ring's **1080 × 1008** — a 2.04
aspect ratio rather than near-square. Open decision 1's own readability
argument ("the figure should come from a measurement of readability and
frame rate") has to be re-taken against this real shape: a correlation edge
crossing the long axis of a 2.04-aspect ellipse travels a different real
distance, at a different density of existing membership edges, than the same
edge would have on the near-circular ring this story's own figures (N = 5
giving 2,500 edge slots) were reasoned against.

**Closest node pair is unchanged (17.83 layout units) — the one measurement
from the old geometry that still holds.** The golden-angle spiral inside a
cluster, the member hole and `topologyClusterRadius` are all independent of
the ring's shape, so whatever this story measures about correlation-edge
density **within** a cluster carries over; what does not carry over is
anything about edges that cross **between** clusters, which now travel
through a ring with 130.3 layout units of worst cluster-circle gap rather
than 56.8.

## Handed here by Story 6.4's close — 2026-11-06: node crowding inside a cluster is a real, measured, ALREADY-ACCEPTED fact — not a structural guarantee this story can assume still holds after it draws edges

**The 17.83-unit figure above answers "how far apart are the two closest
node CENTRES" — it does not answer "can a reader's pointer or keyboard
still tell two nodes apart," and those two questions came apart measurably
while this story's sibling was being built.** Story 6.4's own hit-test
(`apps/frontend/src/topology/hit-test.ts`, Task 6.4.1) and its own
interaction probe (`scripts/topology-interaction-probe.mjs`, Task 6.4.3)
measured the **densest real cluster** (`TECHNOLOGY`, the largest in the
tracked universe) at the narrowest width this product tests (390): a
single equity's own hit-test target reached **0.0 px** — not a small but
positive number, genuinely contested at the node's own measured centre,
because `topologyNodeAt` hands back whichever of two neighbours is nearer
and at that fit scale neither is unambiguously nearer. **This is not a
regression and it is not new** — Story 6.2/6.3 had already measured and
accepted the same visual crowding (heavy node overlap in `TECHNOLOGY` at
narrow fit scales) before Story 6.4 ever touched interaction; what Story
6.4 adds is the first confirmation that the crowding reaches the
**hit-test**, not only the ink.

**What this means for correlation edges specifically.** Whatever strength
threshold or `N` this story settles on (Open Decision 1's own question), the
edges it draws will run through — and very likely terminate inside — the
same crowded clusters this measurement already found contested. An edge
drawn to the WRONG node in a crowded pair is a silent, wrong-looking claim
about correlation rather than a missed click; the stakes of the same
crowding are higher here than they were for a click or a keypress. **Before
this story ships edges, re-run `scripts/topology-interaction-probe.mjs` (or
its successor) against the layout AS THIS STORY LEAVES IT** — adding edges
does not move node positions, so the 0.0 px figure itself should not change
by construction, but confirm that rather than assume it, since this
document is exactly the kind of inherited claim CLAUDE.md's own "measure
rather than cite" rule warns against carrying forward unverified.
