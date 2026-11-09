# Story 6.6 — Node Size, Edge Strength, & the Encodings That Remain

**Status:** **Gate 1 approved 2026-11-09 — decomposed into three tasks.**
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

**Rewritten at Gate 1, 2026-11-09, after six parallel shaping reports found
AC1/AC2 in tension, AC3/AC5's second half unfalsifiable as drafted, and AC6
already half-shipped.** The original seven are kept struck below each
rewrite, because they recorded what was asked for before the shaping found
what the data and the renderer actually permit.

1. ~~Whatever sizes a node is INTENSIVE, or reads one tape by name, or is
   refused — ADR 0045's three permitted answers, in its order of preference.
   A measured share applied as a multiplier is not one of them.~~ —
   **Satisfied by Open Decision 1's answer below: node size is refused.**
   Nothing sizes a node by any quantity, so there is no venue-share factor to
   test. **Falsifiable by:** no field reaching node geometry varies by
   anything but `SecurityKind`; held by a `pnpm invariants` clause with its
   `pnpm break`.
2. ~~If the answer is market capitalisation, its provenance is displayed and
   its staleness is dated.~~ — **Vacuous: no quantity is taken, so nothing is
   displayed or dated.** Left struck rather than deleted, because a later
   story curating market capitalisation (Open Decision 1's third option)
   inherits this criterion verbatim.
3. **Every encoding this story adds or changes is checked against every
   encoding already drawn, in greyscale, at the real measured distribution,
   with a stated pass condition per pair — not at an even split.** The real
   distribution is **8 `extreme` in ~500** at a median instant and **1,853
   retained edges**. Measured by difference (snapshot, change one thing, read
   the pixels that moved), not by eye. Concretely: the heaviest-weight
   correlation stroke stays distinguishable from a membership edge's solid
   kind-stroke, and from the lightest-weight retained stroke, in greyscale, at
   1440 (the one width the correlation layer draws at default zoom).
4. **If edge strength needs a non-linear map, it is derived from the measured
   `return_correlations` distribution and recorded as a named constant with
   its derivation and its selecting inequality in the docblock** — the
   `ANOMALY_BAND_FLOORS` / `BASELINE_MINIMUM_SAMPLE = 2500` shape, with a test
   that the number is right. A chosen round number (`|r| ≥ 0.8`, say) fails
   this criterion.
5. **Edge strength is drawn from the stored `weight` and nothing else is
   recomputed in the renderer** (held by a `pnpm invariants` clause: no file
   under `apps/frontend/src/topology/**` computes a correlation), **and no
   retained edge draws fainter than this story's own measured floor — the
   weakest edge Story 6.5 ever draws is drawn with the same confidence as the
   strongest.** ~~The top-N cut 6.5 established is still visible as a cut
   rather than as a fade to nothing~~ — **struck because its premise is
   false**: the retained set is a **per-node rank** cut (union of each
   node's own top 5) plus a per-pair Fisher-z significance floor, not a
   global weight threshold — the real generation's retained `|r|` spans
   **0.090 to 0.990**, so a kept edge at 0.09 is not "the 5th-strongest" of
   anything global, and a discarded pair elsewhere in the graph can carry a
   far higher `|r|` than the weakest kept one. No monotone strength encoding
   can make a rank cut legible as a weight boundary, because the data does
   not contain one. What the criterion can honestly ask for, and does above:
   a visible floor that never fades, so the product never implies an absent
   edge was measured and found weak. The region's accessible sentence must
   state that the drawn set is a **per-security selection**, not everything
   above a threshold.
6. **§10's `shape/icon — security type` encoding is recorded as taken, by
   Story 6.2** — circle 8 / square 10 / diamond 12, shipped 2026-11-01 — with
   one line closing it in the epic record, so §10's encodings are each
   closed by a named story rather than looking open when they are not.
   ~~Taken or refused in writing~~ — the "or refused" branch is moot; it was
   already taken fifteen tasks ago and nobody had written that down.
7. **The full graph is photographed at all four widths, in every state the
   changed encoding can be in, with a table saying which widths actually draw
   it.** Correlation edges draw only above `TOPOLOGY_SECTOR_LABEL_MIN_SCALE`,
   which only 1440 clears at default zoom — so "all four widths" photographs
   the edge-strength encoding at **one** of them, and the record must say so
   rather than implying four independent checks.

## Open decisions — for the Product Owner

**Both answered at Gate 1, 2026-11-09**, after the business-analyst, UX
architect, designer, technical analyst and tester each converged on the same
recommendation independently, for different reasons — see Task 6.6.2 for
where each is recorded in full.

1. ~~**Size by what?** Market cap needs new curated data and a staleness
   story. A one-tape volume figure (`iex`, by name) is permitted by ADR 0045
   but means _size by how much IEX saw_. Refusing to size nodes at all is
   the third option.~~ — **SETTLED: refuse.** A node has exactly one radius
   and cannot express "we don't know" the way the anomaly ring's hollow
   `unscored` state can — so every quantity that can be missing or thin for
   some securities (market cap for a handful, `iex` volume for most) makes a
   claim this product cannot support for them. And `iex` volume specifically
   would **invert** the hierarchy it claims to show: IEX's venue share runs
   3.54%–15.19% **inversely with liquidity**, so a volume-sized graph would
   draw thinly-traded names systematically **larger**, not merely biased.
   Market capitalisation is the quantity a reader actually wants, but it is
   a story's worth of work on its own (new curated data, a provenance/
   staleness column, a wire change, and an unreconstructable-history problem
   the same shape as the membership-replay gap) — named as a possible future
   story rather than folded in here. **Reversal trigger, a condition:** _the
   first story that curates share-count or market-cap data with its own
   staleness story_ — not a story number, because this one may never be
   written.
2. ~~**Are the fifteen non-equities drawn differently?**~~ — **SETTLED: no,
   beyond the shape they already have.** They already carry five separating
   channels (shape, size, fill token, being the only labelled nodes on the
   resting canvas, and edge topology); a sixth is over-decorating the
   clearest things on screen and spends an annulus already claimed twice
   (Story 6.3's band, Story 6.4's focus ring). A real, separate finding from
   the same review — the eleven sector benchmark ETFs are **unlabelled
   squares at three of the four tested widths**, below the sector-label
   fit-scale threshold, exactly where this Open Decision called them "the
   most important nodes on the screen" — is a labelling defect rather than
   an encoding question, and is routed to `docs/GAPS.md` at Task 6.6.2 rather
   than fixed with a new node treatment here.

**Two more questions were escalated during shaping, outside the story's own
two Open Decisions, and are also settled at this Gate 1.**

3. **§10 names a third node encoding — `Intensity`, current price movement —
   that none of this story's seven acceptance criteria covered.** It was
   never decided whether this story owed it. **SETTLED: handed to Story 6.7**,
   whose own subject is live movement, in words that story's `STORY.md` can
   act on (Task 6.6.2). It would have collided directly with Story 6.3's
   anomaly-band ring if taken here, and `Movers`/`Unusual activity` already
   answer "which securities moved" elsewhere on this screen.
4. **Task 6.5.2's close asked whether a correlation edge should be hoverable,
   readable on a plate, or keyboard-reachable.** **SETTLED: deferred to
   Story 6.8**, with the measurements already taken (the 0.0 px crowding
   figure, the plate's five already-reserved line slots, the counted overlap
   `n` deliberately absent from the model) handed to that story's own
   `STORY.md` (Task 6.6.3) rather than taken here. This story draws strength
   in the stroke only; an edge remains a fact a reader sees but cannot point
   at, in this story.

## Design work

Edge weight only, on the canvas, against the band treatment 6.3 established
and the membership-edge kind-stroke 6.1 established — because the question
is not whether the new treatment works but whether it stays distinguishable
from both of the treatments already there. Node size and a landmark
treatment are both refused per the Open Decisions above, so neither needs a
canvas page.

## Out of scope

Node size (refused, Open Decision 1). A landmark treatment beyond shape
(refused, Open Decision 2). The `Intensity` encoding (Story 6.7). Edge
hover, selection, readout and keyboard reach (Story 6.8). Live updates
(6.7). Filtering (6.8).

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

## Handed here by Task 6.5.2 — 2026-11-06: an edge is now a drawn, measured thing that a reader cannot point at, hover, select or reach with a key, and this story inherits that gap

**`/`'s topology draws a dashed edge for every retained correlation pair since
2026-11-06, and the edge is not an affordance of any kind.** Story 6.5 ships
nodes-only interaction, deliberately and with Gate 1's own agreement — but
that decision was taken when the only edges were curated memberships, which
say nothing a reader could want to interrogate. A correlation edge **is a
measurement**: it has a signed coefficient, a counted overlap `n` (466–4,620
on the one real generation), a 60-session window and a tape, none of which is
reachable from anywhere on this screen. A reader who sees two securities joined
and wants to know _how strongly_ has nowhere to go.

**Three things this story needs to decide, and they are not one decision.**

1. **Is an edge hoverable at all?** `hit-test.ts` answers _which node is under
   this pointer_ and has no concept of a segment. A point-to-segment test over
   1,860 edges is a different cost and a different ambiguity problem from the
   node test, which is already measured as **contested at 0.0 px** in
   `TECHNOLOGY` at 390 (Story 6.4's own hand-off above) — and an edge passes
   _through_ that same crowding, so an edge hit-test inside a cluster would be
   resolving between a node and several edges in the same few pixels.
2. **If it is, what does the plate say?** The readout has **five reserved line
   slots** and a fixed height (`Movers`' held-row lesson carried from rows to
   lines); an edge's four facts do not obviously fit the ticker / name / sector
   / band shape a node's do, and a second plate layout is a second height.
3. **Can a keyboard reader reach one?** `walk.ts` is a tree walk over nodes
   keyed on ticker. An edge has no position in that tree, and the obvious
   answer — _from a selected node, walk its own edges_ — would make the walk's
   own shape depend on the correlation set, which changes nightly and is absent
   entirely on CI. Story 6.4's rule that the band must never move a reader's
   position under their stationary hands applies here with more force.

**What is already true and should not be re-derived.** The edge's own weight is
on the model (`TopologyCorrelationEdge.weight`, signed, required) and reaches
the renderer today unused — this story's own _edge strength_ encoding is the
first reader of it. The route serves the counted overlap `n` per pair
(`CorrelationPayload`), which is **not** on the model and would have to be
carried there if a readout ever states it; that is a deliberate omission rather
than an oversight, because nothing drew it.

**And one measurement this story should take before it changes the edge's
appearance at all**, because the figures exist and were taken against the real
generation: `renderer-canvas.ts`' `CORRELATION_EDGE_CLEARANCE_SHARE` records
the per-width share of correlation segments whose two endpoints' node bodies
cover them entirely — **0 / 127 / 82 / 395 of 1,860** at 1440 / 1024 / 768 / 390. Those segments draw ink that nothing can see, and a **heavier** stroke for
a strong edge does not change that: the cover is the node's own radius. A
weight encoding spent on width alone is therefore invisible for 21.2% of the
drawn set at 390.

## Handed here by Task 6.5.4 — 2026-11-07: ADR 0048's own Decision-3 reversal trigger fired, and only half of what it calls for was taken

**This is a decision this story owns, not a measurement to re-confirm.** ADR
0048's Decision 3 (the layout is closed-form, no simulation, no random seed)
carries its own named reversal trigger: _"the first edge kind whose strength
is a measurement rather than a membership… the day one does, a layout that
ignores edge strength is drawing a picture its own data contradicts, and the
closed-form-against-simulation question is open again with a new argument on
the other side."_ Story 6.5's correlation edges are exactly that edge kind,
and the trigger has fired — confirmed and recorded in that ADR's own dated
amendment (2026-11-07). Only the **type** half of what it calls for was
done (`TopologyEdge.weight`, required on the measured kind). Nobody has
asked the **layout** half of the question: should the closed-form layout
respond to a correlation's weight at all, or does edge strength have to
live entirely in the stroke?

**The architectural read, offered as a recommendation rather than a
decision already taken:** closed-form should almost certainly stay —
a correlation-driven layout would dissolve the sector clustering this
screen's whole picture organises around, and determinism is what
`no-random-in-the-shared-model` and Epic 13's replay refusal both rest
on. If this story agrees and keeps the layout closed-form, say so
explicitly in this story's own record (a one-line confirmation closes
the trigger properly, rather than leaving it to fire a third time
unanswered) — and then the 21.2%-at-390 coverage figure two paragraphs
above is not a footnote, it is the bound on what the one remaining
channel (the stroke) can actually show.
