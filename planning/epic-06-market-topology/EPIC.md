# Epic 6 — Market Topology

**Status:** Not started
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
