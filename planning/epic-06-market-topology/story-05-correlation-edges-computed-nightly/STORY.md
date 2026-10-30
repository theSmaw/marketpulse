# Story 6.5 — Correlation Edges, Computed Nightly, & the Strongest N

**Status:** Not started
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

1. **What is N?** §10 says _strongest N per node_ without a number. At 500 nodes,
   N = 5 is 2,500 edge slots and §28's target is _several thousand edges_, which
   fits; N = 20 does not. The figure should come from a measurement of
   readability and frame rate, not from the target.
2. **What window, and does it update intraday?** A 60-session correlation is a
   slow-moving quantity; recomputing it live is expensive and probably
   meaningless. Nightly is the recommendation.
3. **Does a weak correlation draw a weak edge, or no edge?** The second is what
   §10's _strongest N_ implies and is cheaper to read.

## Design work

Edge weight as a visible property, and what the graph looks like when a security
has **no** computable correlations — which on CI is every security, for ever.

## Out of scope

Node sizing (6.6), live updates (6.7). The edge's **visual** strength beyond
presence is 6.6's.
