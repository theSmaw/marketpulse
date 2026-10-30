# Epic 6 — Market Topology

**Status:** **Decomposed into NINE stories on 2026-10-30; Story 6.1 complete the same day, eight remain.** Eight are visible; the ninth is the close. **The theme question is SETTLED the same day: light theme only**, which is the cheapest moment it could have been answered — this epic's renderer is the first that reads the design tokens from a **canvas**, so a second ground would have doubled the surface of a renderer that did not exist yet. **The renderer question is also settled, by measurement rather than by the spec's own recommendation**: a hand-rolled Canvas2D module, not Sigma.js/WebGL — [ADR 0048](../../docs/adr/0048-the-topology-renderer-chosen-by-measurement-where-the-graph-model-lives-and-why-the-layout-is-closed-form.md) is the decision and [`TOPOLOGY.md`](TOPOLOGY.md) is the subject document, written at Story 6.1's own close rather than deferred to this epic's. **Nothing is on any route yet** — the whole of Story 6.1's work is reviewable only in Storybook; Story 6.2 is what changes that.
**Sequence:** 6 of 15 — follows Epic 5 (Anomaly Detection)
**Spec references:** PRODUCT_SPEC.md §10 (market topology visualization), §27 (high-performance rendering)

## Goal

Create MarketPulse's distinctive high-performance visual representation of the market.

## Outcome

Users can explore securities as an interactive relationship graph.

## Scope

- Graph domain model
- Sector/industry relationships
- Correlation relationships
- Graph-layout generation
- WebGL renderer
- Node sizing
- Node movement/anomaly encoding
- Edge strength
- Hover/select interactions
- Filtering
- Sector clustering
- Live visual updates

## Exit criteria

The tracked universe can be explored smoothly as an interactive graph, and unusual securities are visually obvious.

**Note before anything is built: half of this criterion has a number and half
does not.** _Smoothly_ is `PRODUCT_SPEC.md` §28's **60 FPS at 500 nodes /
5,000 edges**, which has been in the specification since the beginning and has
**never been measured, because nothing rendered**. _Visually obvious_ is a
person's judgement with no instrument at all — so it is owed a sitting rather
than a suite, and Story 6.9 says what a sitting can and cannot claim.

## Stories — split 2026-10-30

> 6.1 → **6.2** → 6.3 → 6.4 → 6.5 → 6.6 → 6.7 → 6.8 → 6.9

| #   | Story                                                                                                                                                    | Depends on | Visible?                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------- |
| 6.1 | [The Decisions, the Renderer Measured, & the Graph in the Workshop](story-01-the-decisions-the-renderer-measured-and-the-graph-in-the-workshop/STORY.md) | nothing    | **In the workshop** — 516 real nodes, eleven sector clusters                |
| 6.2 | [The Topology Takes the Landing Page](story-02-the-topology-takes-the-landing-page/STORY.md)                                                             | 6.1        | **Yes — the largest visible change since `/` stopped being a placeholder**  |
| 6.3 | [The Anomaly Encoding, & the Fourth Treatment a Canvas Needs](story-03-the-anomaly-encoding-and-the-fourth-treatment/STORY.md)                           | 6.2        | **Yes** — unusual securities light up; half the exit criterion              |
| 6.4 | [Hover, Select, & the Way Out](story-04-hover-select-and-the-way-out/STORY.md)                                                                           | 6.3        | **Yes** — the graph becomes a place you leave from                          |
| 6.5 | [Correlation Edges, Computed Nightly, & the Strongest N](story-05-correlation-edges-computed-nightly/STORY.md)                                           | 6.2        | **Yes** — edges stop being memberships and become measurements              |
| 6.6 | [Node Size, Edge Strength, & the Encodings That Remain](story-06-node-size-edge-strength-and-the-encodings-that-remain/STORY.md)                         | 6.3, 6.5   | **Yes** — the graph gains hierarchy                                         |
| 6.7 | [Live Updates, & the Graph That Stays at 60 FPS](story-07-live-updates-and-sixty-frames/STORY.md)                                                        | 6.6        | **Yes** — the graph moves on its own; §28's unmeasured target gets a figure |
| 6.8 | [Filtering, & the Degraded Set](story-08-filtering-and-the-degraded-set/STORY.md)                                                                        | 6.7        | **Yes** — a reader can narrow it, and it is honest when the data is thin    |
| 6.9 | [The Rehearsal, the Sweep, & Epic 6's Close](story-09-the-rehearsal-the-sweep-and-the-epic-close/STORY.md)                                               | 6.8        | no                                                                          |

### Why this order

**6.1 is in the workshop and not on the route, deliberately.** Two measured
facts force it. The reserved band is **161 px** at 1440×900 and **119 px** at a
680 px viewport, which is not a graph. And _the first commit that renders a
graph node_ is the recorded reversal condition for `/`'s interim layout — so the
first node and the grid revert are **one** change, which is too much to carry
alongside choosing and measuring a renderer this repository has never used.
Storybook is a real surface here and 6.1 ships a real graph of the real
universe on it.

**6.2 is second because it is the biggest thing stakeholders have not seen.**
§9 says the visualization _"should be the product's visual centre of gravity"_
and it has never been drawn. The end state is **already designed**
(`Market overview.dc.html` §02) and the regions keep their names, order and
landmarks across the change.

**6.3 before 6.4 and 6.5 because it is half the exit criterion.** _Unusual
securities are visually obvious_ is worth more than more edges or more
interaction, and it is the thing `Unusual activity`'s ten-row list beside it
**cannot** do.

**6.5 depends on 6.2 rather than on 6.4**, so the nightly pass can be built in
parallel with the interaction work if there is appetite — it is the one story in
this epic whose work is mostly backend.

**6.6 is late on purpose.** §10 lists **five** node encodings; shipping them
together makes none of them legible, and each one added has to be measured
against those already there at the real distribution — **8 nodes in 500** carry
`extreme` at a median instant, not an even split.

**6.7 before 6.8** because a graph that moves is more valuable than a graph that
filters, and because §28's 60 FPS target is the epic's hardest number.

### What no story in this epic builds, and why

- **The synthetic 5,000-node / 25,000-edge mode.** §27 and §28 both name it and
  it is **Epic 14's**, by that epic's own scope. Story 6.9 confirms it rather
  than attempting it.
- **A dedicated topology route.** `PATHS` has four entries, §8.1 puts the
  topology inside Market Overview, and §37's V1 list does not ask for one. Open
  for the owner at 6.1's Gate 1 rather than assumed.
- **Supply chain, ownership and fundamental similarity edges.** §10 lists them
  under _Later_.
- **`Investigate` on a node.** Epic 5's Gate 1 refused it on a list row in any
  form and Epic 7 owns the control.

### Story 6.1's Gate 1 — one decision settled, two still open

**1. ~~Light theme only, or light and dark~~ — SETTLED 2026-10-30 by the owner:
LIGHT THEME ONLY.** It was asked here because this epic is the first whose
renderer reads the design tokens from a **canvas** rather than a stylesheet, so
a second ground would have doubled the surface of a renderer that did not exist
yet. `VISUAL-LANGUAGE.md` carries the decision beside the case that was put for
reversing it, which is left standing.

**Two things follow for this epic, and they are requirements rather than
notes.** The renderer reads **one** palette, so the contrast figures this
product has measured against one set of grounds stay meaningful —
`--chart-volume` at 3.50:1, and the amber ramp's internal steps at
**1.12 / 1.43 / 1.59**. And **Story 6.3's four-band encoding is designed and
measured on the LIGHT grounds**: a graph that reads well only on a dark ground
is now a graph that reads wrong — and measured **in greyscale**, because hue is
the entire difference in this product's price palette at 1.04:1.

The reversal trigger is a condition rather than a release: **the first surface
this product ships that a person is expected to watch for a long sitting in a
dim room** — and a market topology watched through a session is the closest
planned thing to it.

**2. There is no canvas page for this epic, and that is now checked against the
canvas rather than inferred from a document.** It holds **29 pages** (`DesignSync` `list_files`, 2026-10-30) and **none of them is
the topology's** — the
nearest relatives being `Market overview.dc.html`, which draws the **landing
grid's end state** this epic reverts to, and
`The rail that says how unusual.dc.html`, which is a **DOM** page whose band
word beside every entry is exactly the affordance a canvas cannot borrow.

**The authorisation gap is closed** (2026-10-30), and one correction is worth
keeping rather than quietly fixing: this split first said _nine pages_, which
was the number of pages **`VISUAL-LANGUAGE.md` names** rather than the number
the canvas holds. **A count taken from a document about a thing is not a count
of the thing.** The substance survived it — there is still no topology page —
which is the only reason it was cheap.

ADR 0026 makes the canvas the source of truth, so **this epic may not invent its
visual language in code**: the node at rest, the cluster, the edge and the four
anomaly states are drawn there first, and `MarketPulse Design System.dc.html` is
the foundation page the renderer's palette comes from.

**3. Sigma.js is a RECOMMENDATION, not a mandate.** §27 says _"a good candidate
is a WebGL graph renderer such as Sigma.js"_. Nothing in this repository renders
a canvas today and neither Sigma nor graphology is installed, so 6.1 chooses by
**measurement** against at least one alternative — bundle cost, frame rate at
516 nodes, and what it does to `/`'s measured 447 DOM nodes — and records the
rejected candidate with its figures.

## Handed to this epic by Task 4.1.8 — 2026-09-25: the landing page changes shape the day you draw your first node, and the end state is already drawn

**Epic 4 built the market overview at `/` while this epic was still unstarted,
and it left a band reserved for the topology.** The layout running there today
is explicitly an **interim** one, and its reversal trigger is a condition this
epic will trip: **the first commit that renders a graph node on that route.**

**You do not have to design the end state.** It is drawn on the design canvas,
in `Market overview.dc.html` §02 — when the first node renders, the reserved
band becomes the **primary** area and sectors and movers drop to a lower band.
The regions keep their **names, their order and their landmarks** across the
change, so nothing a screen reader or a deep link depends on moves.

**Three things to check when you get there:**

- **The reserved band must not have grown in the meantime.** If it has,
  something went wrong that predates this epic.
- **The overview's regions are `PRODUCT_SPEC.md` §9's**, and the topology's is
  one of two that belong to later epics — the other is Epic 5's unusual-activity
  feed. Both are placeholders naming their epic today.
- **The connection has one home**, the status bar, and the landing route renders
  no clock, session word or connection word. `pnpm invariants` holds
  `one-caller-of-the-market-clock` and `one-home-for-the-feed-words`, and a
  topology surface that adds a second will fail the build by name.

> **This is written here rather than linked from Epic 4** because a pointer is
> what a reader follows when they already know to look, and the whole failure
> this repository keeps producing is that they do not. Epic 4's Story 4.1 owns
> the decision; this paragraph is the only thing that has to reach you.

## Handed here by Story 4.8's close — 2026-10-10 by Task 4.8.10: the page you land on is now measured, and Epic 14's second condition is worded for what you might draw

**Found by walking the epic list and asking _did Story 4.8 measure anything
this epic acts on_, after a grep of that story's documents named this epic
once and in passing.** Three things, in words this epic can act on.

**1. `/` has a measured cost and a measured headroom, and your first node
lands on top of it.** Production build, 1440×900, cold load, 40 interleaved
loads with every observer proved by a plant on the page that produced the
figure: `/` draws **447 DOM nodes and zero `<tr>` at 518 securities — the same
447 at 20** — for **0 tasks over 50 ms on 10 of 10 loads**, one 50.9 ms
animation frame in ten, and a worst rAF gap of **24.7 ms p50 / 34.7 p95**
against a 16.7 ms quantum. With a 20-row universe it collapses to the
**18.7 ms** one-frame floor, which is what attributes the difference — ≈
**6 ms** — to the 518-security payload the route computes over rather than to
the page's chrome. **So the landing route is not in breach of
`PRODUCT_SPEC.md` §28 and `/securities` is**, on 10 of 10 loads, and your
region arrives with roughly 26 ms of frame budget before it joins the second
category rather than the first.

**2. The page re-renders on every applied batch, so a canvas on it is not a
still canvas.** `useLiveFeed` is called in `App`; every overview frame is a new
object reference, so **`/` commits 2 renders per applied batch** at the feed's
measured **6.8–16.1 batches a minute** — **13.6–32.2 renders a minute**
(Task 4.8.2, counted on React's commit hook against the real gateway). A
Sigma.js instance mounted in a region on this page will have its host component
re-rendered at that rate whether or not any graph datum changed, and §27's
60 FPS target is a per-frame claim that has to survive it. **The cheap defence
is a memo boundary at the region**, which is what Task 3.6.5 did for the
universe table and what Task 4.8.5 declined for the charts with a measured
reason; the right one is whatever Epic 14 chooses, and the boundary is a
decision rather than a detail.

**3. Epic 14's second condition is worded against DOM elements, and your
renderer is a canvas — so read it before assuming it fires on you.** The clause
added on 2026-10-09 is _"the first surface on `/` that renders one element per
tracked security"_. A WebGL canvas at 500 nodes renders **one element**, so a
graph drawn the way ADR 0027 and this epic's scope intend **cannot trip it** —
and that is correct rather than a loophole, because the clause is a proxy for
style, layout and paint over a large document and a canvas has neither. **What
would trip it is a DOM fallback, an SVG overlay with a node per security, or a
per-node label element** — any of which puts 518 elements on `/` and makes this
epic retroactively the owner of Epic 14's entry 1 on a second page. If you
reach for one, measure it against the 447/24.7 ms baseline above before it
ships, on **three channels** (`longtask`, `long-animation-frame`, an rAF-gap
recorder), each proved by a plant on the page that produced the figure, because
`longtask` alone can no longer see this product's existing breach.

## Handed here by Task 4.7.11 — 2026-10-12, at Story 4.7's close: the day a graph node renders, two of these findings become yours

Written here rather than linked. **The grep-shaped sideways pass does not find
this epic**; it was found by walking the epic list and asking _did 4.7 measure
anything Epic 6 acts on_.

**1. `Market topology`'s `reserved` panel is currently doing a second job, and
deleting it does not end that.** Photographed in the degraded set (Task 4.7.9,
row 08): **a rollback that omits a section from the aggregate draws that region
with the same hatch, the same muted sentence and the same box your placeholder
uses**, differing only in the **absence** of an `EPIC n` badge — which is an
absence rather than a statement. A reader cannot tell _this gateway is behind_
from _this is next year's_. And at 1440 the inverse was found first (Task
4.7.5): **the three unbuilt regions read as more intentional than the four
built ones**, because yours is hatched and labelled while a region waiting for
data is a plain void with one grey sentence. Both are routed to UX/Design and
the owner rather than repaired. `Panel`'s `reserved` state is ADR 0029's defer
rule as a component, and a second variant for _degraded_ is a canvas question.

**2. Your first rendered node is already the reversal trigger for the interim
layout**, and it is also when the degraded grid gains a row. The grid is a
**kept** spec — `e2e/specs/overview-degraded-grid.spec.ts`, thirteen states ×
four widths × seven surfaces, asserting the collapse as **declared collision
classes** rather than as a count, so it fails both when two rows collapse
accidentally and when a documented exception stops holding. A canvas region
contributes a surface to that comparison whose text is whatever the canvas's
accessible fallback says — which is worth deciding before the grid asks.

**3. One keyboard fact, free.** `Region` focuses its own `<section>` when the
element that last held focus inside it is removed while `document.activeElement`
is the body (Task 4.7.6). A canvas that loses its focusable children in a
degradation inherits that backstop; it composes rather than replaces, so a
better landing of your own still wins.

## Handed here by Epic 4's close — 2026-10-12 (Task 4.9.4): your band is the one grid row with no content floor, and it already overflows with a placeholder in it

**Found by walking the epic list.** The premise an earlier hand-off would have
left you with — _no region on `/` scrolls_ — was falsified on 2026-10-09 and the
replacement is a constraint on what you draw.

**The measurement.** `clientHeight` against `scrollHeight` for every
`section[aria-labelledby]` on `/` at **thirteen width/height pairs**, verbatim at
the ends that matter:

- `1440×700` — 0 of 7 scroll.
- `1440×680` — `Unusual activity` 117 / 121, **scrolls by 4 px**.
- `1440×500` — **`Market topology` 82 / 85** and `Unusual activity` 82 / 121.
- `1280×480` — **`Market topology` 79 / 85** and `Unusual activity` 79 / 121.
- `/securities` at every pair — **0 of 8**, the 18,893 px table included,
  because the long table scrolls the page rather than its region.

**The cause is in the stylesheet and it is specific to your row.**
`MarketOverview.module.css` sets
`grid-template-rows: calc((82vh - 2 * var(--space-24)) * 7 / 30) repeat(2,
minmax(min-content, 1fr))`. **Row 1 is a viewport-derived length with no content
floor; rows 2 and 3 have one.** `Market topology` and `Unusual activity` are the
two regions on row 1. So the first height at which anything on `/` scrolls is
between **681 and 700 at 1440**, and today that happens with nothing in your
region but a hatched placeholder.

**What to do about it.** A WebGL canvas sized to its box will not report an
overflow, so this will stop being visible to the measurement above and start
being a **clipped graph** instead. Before your first node renders, decide
whether row 1 gains a content floor (`minmax`), whether the canvas is sized from
the resolved track, or whether the interim layout's end state — the reserved band
becoming the primary area, drawn on the canvas in `Market overview.dc.html` §02 —
changes the track anyway. And note that **ADR 0039 makes every region a tab stop
unconditionally**, so a scrolling region is a focusable scroller and axe's
`scrollable-region-focusable` will never report it: `expectEveryRegionIsATabStop`
in `e2e/support/app.ts` is the replacement, and a scroll check is yours to write
if you want one.

## Handed here by Story 5.1's close — 2026-10-13: the reserved-panel finding is now half-discharged, and the live half is yours

Epic 4's close routed a finding about how this product draws the regions it has
**not** built: at 1440 a reserved panel reads as **more** intentional than a
built one, because it is hatched, carries an `EPIC n` tag and a sentence saying
exactly what will go there, while a region waiting for data is a plain void with
one 12 px grey sentence.

**Story 5.1 discharged the first half by construction.** It put one built region
between two hatched ones on `/securities/:symbol` — `Relative performance`
between `Abnormal-move indicators` and `Anomaly history` — and the built region
was drawn to carry its presence from a derived headline and a ruled track rather
than from a fill or a border weight, so it does not read as a white gap in a
patterned column. The canvas page is `The rail that says how unusual.dc.html`.

**The second half is live and it is yours, because `Market topology` is the next
hatched panel to be filled.** A **rollback that omits a section draws a region
exactly like one nobody has built**, differing only by the absence of an
`EPIC n` badge — so on the two seconds a frontend deploy is incoherent, or on any
image that shipped without a region, a reader cannot tell _this is next year's_
from _this is broken_. Nothing mechanical sees it.

**And one thing to measure before you fill the panel rather than after.**
`MARKET-OVERVIEW.md` §1.4's reversal trigger — _the first reserved region whose
filling would move a figure or a sentence a reader is reading_ — **fired on
2026-10-13**, on the other route: filling `Relative performance` moved the source
note and the 516-row `Tracked universe` table down by **74 px** at 1440, 1024 and
768 and **136 px** at 390. The owner accepted it with the figures recorded. On
`/`, `Market topology`'s neighbours are figures rather than hatch, so take the
before/after at all four widths **before** the merge, and say what moved.

## Handed here by Task 5.4.1 — 2026-10-15: your region's box changed shape, and it is wider rather than taller

**`Market topology` now spans BOTH columns of `.regions` and is the whole first
row.** Story 5.4 had to re-area the landing grid because `Unusual activity`,
which shared row 1 with you, could not draw a single row there — the region's own
chrome is **159 px** against a row-1 length that resolves to **161 px** at a
900 px viewport, so zero rows fit at every viewport height. The areas are now:

```
"topology topology"
"sectors unusual"
"movers breadth"
"investigations investigations"
```

**Your resolved box, measured 2026-10-15 with `pnpm probe` (not derived):**

| viewport | before     | after          |
| -------- | ---------- | -------------- |
| 1440×900 | 1026 × 161 | **1392 × 161** |
| 1024×900 | 595 × 161  | **976 × 161**  |
| 1440×700 | 1026 × 123 | **1392 × 123** |
| 1440×680 | 1026 × 119 | **1392 × 119** |

**Three things to take from that, and the third is the one that will surprise
you.**

**1. You gained width and lost nothing.** +366 px at 1440 and +381 at 1024, same
height, and `Unusual activity` is no longer in your row at all — so the
`minmax(min-content, …)` pressure a filled sibling would have put on a track you
share is gone. The decision that row 1 stays a **resolved length** rather than
becoming content-sized was kept **specifically** for your renderer; Story 5.4
measured the alternative (a content floor on row 1) at +150 px and four
displaced regions and did **not** take it.

**2. The height still tracks the viewport**, and it always did —
`calc((82vh - 2 * var(--space-24)) * 7 / 30)`. So **`1392 × 161` is a figure at
one viewport, not your box.** It is 119 at a 680 px viewport and 123 at 700.
A canvas sized from a `ResizeObserver` is fine; one sized from the `calc`, or
from a remembered `161`, is not. This is written out because the hand-off almost
shipped as the bare pair.

**3. At ≤860 nothing changed at all.** That block sets
`grid-template-rows: none` and its one-column order is unchanged —
`breadth, sectors, movers, topology, unusual, investigations` — verified
byte-identical at 768 (every box, 0 px of movement).

**And one finding that is live for you rather than for Story 5.4.** Task 4.7.9
row 08 found that a rollback omitting a section draws a region **exactly like one
this product has not built yet** — same hatch, same muted sentence, differing
only by the **absence** of an `EPIC n` badge. Story 5.4 deletes
`Unusual activity`'s reserved panel, so after it **two** badged hatches remain
(yours and `Current investigations`) and after you, **one**. The fewer badged
hatches there are on the screen, the more a badge-less hatch reads as the house
style rather than as something wrong — so the first commit that renders a graph
node should settle what a _degraded_ topology looks like against a _deferred_
one, which `MARKET-OVERVIEW.md` already records as one picture today.

**The interim-layout condition is unchanged and still yours**: the landing grid
reverts to the canvas's end state on **the first commit that renders a graph
node**.

## Handed here by Story 5.5's close — 2026-10-20: a new ADR governs any edge or node you weight by a market quantity

**[ADR 0045](../../docs/adr/0045-a-cross-tape-comparison-and-what-a-ratio-is-a-ratio-of.md)
decision 1 applies to this epic before any graph is drawn**, and it is cheaper to
apply than the measurement that forced it.

**The test**: before comparing two market figures, ask whether the quantity is a
**ratio within one tape** or a **level across tapes**.

- A **ratio within** one tape — a correlation of returns, a percentage move, a
  rank among one tape's own history — is **scale-free**, so it survives the two
  tapes disagreeing about how much of the market they saw.
- A **level across** tapes — a **traded value**, a **share volume**, a trade
  count — is **proportional to how much of the market that tape saw**, so the
  share _is_ the quantity. **ADR 0045 refuses it**, and not as a tolerance: it is
  wrong by a factor nobody on screen can see.

**The factor, measured against the deployment on 2026-10-20 and not estimated:
IEX carries 3.54% of the volume** on minutes both tapes printed, and **2.75%**
across all consolidated minutes, while **printing in 81.6% of them**. So an
`iex`-over-`sip` level comparison is **~36× too low**. This product's own
estimate before the measurement was 13×; it understated it threefold.

**Why this reaches you specifically.** A topology that weights edges by **traded
value**, sizes nodes by **volume**, or thresholds a relationship on **turnover**
is comparing levels — and the live feed is `iex` while the stored history is
consolidated `sip`. Two securities whose edge is computed from different tapes,
or one edge computed live against a stored threshold, is the refused shape.
**A correlation of returns is fine**; a weight in shares is not.

**What to do instead**, in the order ADR 0045 prefers: use a **ratio within one
tape**; or read **one** tape by name for both sides, as `volume_baselines` does
with `feed = 'iex'` in the query's own `where`; or **refuse and say so**, which
is this epic's inherited idiom. **What not to do**: measure the share and apply
it as a multiplier — that is computing an adjustment whose error is invisible,
which is the one place `PROVIDER.md` §3.5's objection actually reaches, and the
measured dispersion (p10 **1.60%** against p90 **5.83%**, a **3.6×** spread)
admits no single constant anyway.

**And if you persist a derived graph, the tape belongs in its KEY** — ADR 0045
decision 3. `volume_baselines` is keyed `(security_id, observed_at, feed)` where
ADR 0044's earlier tables key on the session alone, because a tape choice that
carries a reversal trigger can flip, and **a flip against a session-only key
rewrites every row with nothing recording that the meaning changed.**

## Handed here by Story 5.6's close — 2026-10-29: the score you will colour nodes by, and the test that governs every factor you weight

**Story 5.6 shipped the composite anomaly score**, so the figure this epic will
colour a graph by now exists, is drawn on two surfaces, and has a decided
vocabulary. Four things it owes you, in words this epic can act on.

**1. The band floors are DERIVED and they are a two-factor, max-75 scale.**
`ANOMALY_BAND_FLOORS` are `elevated 32 · high 63 · extreme 73`, taken from the
measured distribution of **34,318 scores** rather than chosen — and the
inequality that selected them is `elevated ≤ 40 < high`, because a one-factor
score caps at 40 and _less evidence must mean less claim_. **Those quantiles
describe a scale whose maximum is 75**, not 100, because the volume factor is
`no-distribution` for every security until a nightly pass stores a distribution
of a volume rate. The constant carries a reversal trigger as a condition: _the
first score computed over a factor set this derivation did not measure._ **A
topology that colours nodes by band fires it the day volume contributes.**

**2. `--anomaly-normal` exists FOR YOU and is the one band with no fill.**
`AnomalyBadge` draws `normal` as a bordered chip with no fill, deliberately —
its step to `elevated` is the ramp's weakest at **1.12** in greyscale, so the two
states hardest to tell apart by colour are the two not distinguished by colour at
all. **A canvas cannot do that**: it colours every node whether interesting or
not and cannot render _no chip_. That is why the token exists, and
`anomaly.ts` records it. **You will need a fourth visible treatment where the
chip has three**, and it cannot be hue alone — the ramp's internal steps are
1.12 / 1.43 / 1.59.

**3. ADR 0045's test governs every factor you weight, and it was restated on
2026-10-21 because its original wording refused a figure this product ships
everywhere.** The test is now **extensive versus intensive** — _does the quantity
scale with the tape's share of the market?_ Volume, share counts, trade counts
and **traded value** do, and are refused across tapes; a price, a return, a
percentage change and a **rank** do not, and are permitted. **A traded-value edge
weight is extensive and is refused**; a correlation of returns is intensive and
is permitted. The identity is the discriminant: `venue share × coverage`
factorises for an extensive quantity and is **meaningless** for an intensive one.

**4. And the permission is CONDITIONAL on how you map a factor.** The composite
is tape-safe only because every factor is a **percentile of its own same-tape
history**, which quotients the tape out. **An invented curve — a log cap, a
sigmoid, a chosen knee — is calibrated in one tape's units and breaks it**: a
knee at `3× typical` means a different thing at 3.54% venue share than at 15.19%,
and that spread is measured. So _no invented constant_ and ADR 0045's invariance
test are **the same rule arriving from two directions**.
