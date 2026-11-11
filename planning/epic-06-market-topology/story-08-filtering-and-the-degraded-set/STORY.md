# Story 6.8 — Filtering, & the Degraded Set

**Status:** Gate 1 approved 2026-11-11 — decomposed into four tasks.
**Epic:** [Epic 6 — Market Topology](../EPIC.md)
**Depends on:** 6.7
**Epic scope covered:** Filtering

## Description

Two halves that belong together because they are the same question asked twice:
**what does the graph draw when it is showing less than everything** — once
because a reader asked, and once because the data is not there.

**The second half is the one this epic cannot skip.** On CI the store has 516
securities, **zero bars, no provider and no composite generation**, so the graph
there has nodes, sector edges, **no correlations and no scores, permanently**.
That is not an edge case to handle later; it is the state every gated run is in
for ever, and the state a reviewer sees.

**And the degraded set is a KEPT spec with a row this epic added.**
`e2e/specs/overview-degraded-grid.spec.ts` compares thirteen states × four
widths × seven surfaces and asserts the collapse as **declared collision
classes** rather than as a count — so it fails both when two rows collapse
accidentally and when a documented exception stops holding. Task 3.10.9's
earlier grid was **deleted** and took a repair with it that had to be
re-derived two epics later, which is why this one is kept.

## What the user can see when this story lands

**A reader can narrow the graph** — by sector, and by band — and the graph is
honest in every state where it has less to draw than a full market.

## Acceptance criteria

**Rewritten at Gate 1, 2026-11-11, after six parallel shaping reports found AC3
unfalsifiable as written for a client-side filter and AC5's seventh state
naming a wire shape that does not exist.** Kept struck below each rewrite, per
this repository's own rule that a sentence recording what was asked for is not
the same sentence as one recording what the data permits.

1. **Filtering states its own population**, the way every ranked and counted
   surface in this product does: _of the 501 companies we track…_. A graph
   showing 40 nodes with no statement of what was excluded is a confident claim
   over a filtered set.
2. **A filter is reflected in the URL** where it is a selection a reader would
   share or return to — ADR 0023's rule, and the window control's precedent
   (`?sessions=21`).
3. ~~Filtering never blanks the screen. The last answer stays until a newer one
   replaces it, and a wait over 160 ms draws a cover over the picture rather
   than over a number (ADR 0028).~~ — **A client-side filter over a universe
   already in the browser makes no request, so ADR 0028's cover is unreachable
   by construction — six shaping reports independently found this.** Rewritten:
   **a filter change neither re-mounts the renderer nor resets the reader's
   pan, zoom or selection** (mechanically checkable: `framesDrawn()` plus a
   pan surviving a filter press), and the 160 ms cover is recorded as
   unproducible per AC4's own escape clause rather than built for a wait this
   feature cannot have.
4. **Every degraded state is PRODUCED rather than furnished where it can be** —
   through the shipped socket, the shipped decoder and a real store — which is
   how Story 4.7's grid found **six lying aggregates** and a duplicate provenance
   line two years old. A state nobody can produce is named as unproducible.
5. ~~The states this epic has to draw, each distinguishable from the others at
   all four widths: the whole market; one sector; a store with no bars (nodes
   and sector edges, no correlations, no scores); no provider; the aggregate
   arrived carrying nothing; the backend unreachable; and a degradation that
   omits the topology section, which must not look like a region nobody has
   built.~~ — **"A degradation that omits the topology section" names a wire
   shape that does not exist: the graph is a function of two always-present
   requests (`GET /securities`, the relationships route) plus the aggregate's
   optional `anomalyBands` section, so there is no single "topology section" to
   omit.** Rewritten into the two real, producible readings, plus the one
   genuine exception: **the whole market; one sector; a store with no bars; no
   provider; the aggregate arrived carrying nothing; the backend unreachable;
   an aggregate whose `anomalyBands` section is absent; a relationships route
   that failed or answered a shape the decoder refuses; and the region nobody
   has built** (named unproducible — no frame removes a shipped region from a
   bundle, so this stays `ENUMERATED_AND_NOT_PRODUCED`, alongside "a region
   whose content threw"). The degradation/deferred-placeholder distinction the
   original wording was guarding against is a real, separate finding (Task
   4.7.11's routed hand-off) and is this story's own to close now that only one
   badged hatch remains on `/`.
6. **No two states read identically at any width** — **with one named,
   accepted exception**: a store with no bars, no provider, and the aggregate
   arriving carrying nothing are **one picture and one sentence inside this
   region**, because the topology reads only the universe, the correlations
   route and `anomalyBands` — never the connection or the provider, which have
   one home each, in the status bar and the source note, and `pnpm invariants`
   refuses a second home for either by name. This is a **declared collision
   class**, asserted in both directions (the three states collapse together;
   every other state stays distinct), the same mechanism the landing page's own
   degraded grid already uses for the session-basis and empty-join collisions.
7. **The canvas's accessible fallback carries the state in words, and survives
   a live band update** — the added clause closes a real risk found while
   shaping: the structural sentence has two writers (this component's JSX and
   the imperative batch writer), and a filter clause is the same collision a
   third time if it is not threaded through both the same way `correlationClause`
   already is.

## Open decisions — settled at Gate 1, 2026-11-11

1. ~~Filter by what? Sector and band are the obvious two. Filtering by
   correlation strength is a third and is closer to a query than a filter.~~ —
   **SETTLED: sector and band, matching this story's own stated scope.
   Correlation strength is REFUSED**, on the unanimous recommendation of six
   independent shaping reports — it is closer to a query than a filter, its
   natural control (a threshold slider) has no precedent anywhere in this
   product, and the data it would filter on is absent on CI and every fresh
   store, permanently. **Reversal trigger: the first surface in this product
   that needs to name a single pair's own correlation coefficient to a
   reader** — the same trigger that also covers the three edge-affordance
   questions handed here by Task 6.6.2 (hover/select/keyboard-reach a
   correlation edge), which are **refused a third time** for the same reason:
   refusing one without the other is a half-finished version of the same
   question. **A band filter over a store where nothing has been scored
   refuses with a stated reason** rather than silently resolving to zero drawn
   nodes — `Nothing here has been scored yet, so the graph can't be narrowed
by band.` — because resolving to zero would be a fully-formed claim about
   zero scored securities on the one state every gated machine is
   permanently in, which is exactly the false impression ADR 0029 forbids.
2. ~~Does a filter hide nodes or dim them? Hiding re-flows a spatial surface and
   loses the shape; dimming keeps it and costs contrast — and contrast is
   already carrying four bands.~~ — **SETTLED: hide the excluded equities;
   hold the full-universe layout; de-emphasize (never fully hide) the fifteen
   landmarks and the hub.** Five of six shaping reports converged on this
   independently, on measured rather than aesthetic grounds: this canvas's
   contrast ramp already carries four anomaly bands at steps as fine as
   1.12:1, with `elevated` deliberately spending no hue at all **because**
   that step is unreliable — a dim channel underneath would read as either a
   fifth band or become indistinguishable from the existing hollow `unscored`
   treatment (the same encoding collision this product has already found and
   fixed once elsewhere). Hiding, by contrast, costs nothing already spent:
   an excluded equity draws no ink, is not hit-testable and is not reachable
   by the keyboard walk. **The layout is never rebuilt and the viewport never
   re-fits to the filtered subset** — `buildTopologyLayout` keeps running over
   the whole 516-node universe every time, placements are looked up by symbol
   rather than recomputed, and a filtered sector draws small inside the full
   frame, with `Reset view` and the reader's own zoom as the way in. This is
   what keeps Epic 7's server/browser coordinate agreement intact and is why
   the mount effect's deps stay unchanged by a filter. The fifteen landmarks
   (eleven sector ETFs, four proxies, the hub) are **never hidden** — they are
   the keyboard walk's own tree and the band encoding's own exclusion set —
   but one whose sector is filtered out draws a visibly distinct, de-emphasized
   treatment, never the same ink as `unscored`, so "not in your filter" and
   "we have no score for this" stay two different claims.

**A third, previously-undecided item, settled in the same Gate 1**: the
native browser context menu a topology node has carried for free since Story
6.4 (`docs/GAPS.md`, "A canvas node now carries a second, unauthored
affordance") is **left alone** — filter controls live in the region's own
chrome, never as a third kind of canvas press, so the entry's own firing
condition ("before Story 6.8 adds a third kind of press to the same
surface") does not fire. The real, unrelated defect found alongside it —
`onPointerDown` not filtering `event.button`/`isPrimary`, so a right-click
also moves the node selection — is fixed in Task 6.8.2 regardless.

## Out of scope

The rehearsal, the sweeps and the close (6.9).

## Handed here by Task 6.6.2 — 2026-11-09: whether a correlation edge is an affordance at all, deferred here from Task 6.5.2's own close with the measurements already taken

**Story 6.5 shipped correlation edges as pure ink — not an affordance of
any kind.** A reader cannot hover, select, or keyboard-reach one, even
though an edge is a measurement (a signed coefficient, a counted overlap
`n`, a 60-session window, a tape) a reader might reasonably want to
interrogate. Task 6.5.2's own close raised three distinct questions about
this and explicitly declined to answer them; Story 6.6 (which drew edge
strength into the stroke) was asked whether it wanted to take them and
declined too, at Gate 1, on the grounds that interaction is a different
kind of work from encoding and this story already owns what a filtered
or degraded edge-set looks like — the natural next owner.

**The three questions, unchanged from Task 6.5.2's own wording:**

1. **Is an edge hoverable at all?** `hit-test.ts` answers _which node is
   under this pointer_ and has no concept of a segment. A point-to-segment
   test over up to ~1,900 edges is a different cost and a different
   ambiguity problem from the node test — which is already measured as
   **contested at 0.0 px** in the `TECHNOLOGY` cluster at 390 (Story 6.4's
   own hand-off, re-confirmed since by Task 6.5.3 and Task 6.5.4's own
   probe runs) — and an edge passes _through_ that same crowding, so an
   edge hit-test inside a dense cluster would be resolving between a node
   and several edges in the same few pixels.
2. **If it is, what does the plate say?** The hover/selection readout has
   **five reserved line slots** and a fixed height (`Movers`' held-row
   lesson, carried from rows to lines) — an edge's facts (two tickers, a
   signed coefficient, a counted overlap, a window) do not obviously fit
   the ticker/name/sector/band shape a node's five slots already hold, and
   a second plate layout is a second height this region has never needed
   before.
3. **Can a keyboard reader reach one?** `walk.ts` is a tree walk over
   nodes, keyed on ticker. An edge has no position in that tree, and the
   obvious answer — _from a selected node, walk its own edges_ — would
   make the walk's own shape depend on the correlation set, which changes
   **nightly** and is **absent entirely on CI** (this story's own second
   half, the degraded set, is exactly the surface that has to answer what
   a keyboard walk does when the thing it would walk does not exist).
   Story 6.4's own rule that the band must never move a reader's position
   under their stationary hands applies here with more force.

**What is already true and should not be re-derived.** The edge's own
weight reaches the renderer (Task 6.6.1) and is spent entirely on the
stroke; the counted overlap `n` is on the wire (`CorrelationPayload`) but
**deliberately not on the shared model** (`TopologyCorrelationEdge`),
because nothing has ever drawn it — carrying it to the model is this
story's own decision to take, not an oversight to fix blindly.

**Why this story rather than another.** Open Decision 1 above already
asks _filter by what_, and names correlation strength as a candidate
("closer to a query than a filter") — a reader who can filter by
correlation strength but cannot select an individual edge to see its
own coefficient is a half-finished version of exactly this question.
Whether this story answers all three edge-affordance questions, some of
them, or refuses them again (a third refusal, this time with a stated
reversal trigger rather than a silent deferral) is this story's own
shaping to do — nothing above is a decision already taken.
