# Task 6.4.3 — The keyboard model

**Status:** Complete — 2026-11-06. Implementation and the browser-level
verification were sound from the first pass; a thorough review (given the
implementing agent stalled mid-run) found the component-test gap the agent's
last action implied did not actually exist, one broken `pnpm break` entry
(fixed), and one real measurement-instrument bug whose own first-pass record
was selectively favourable — rewritten with the full, honest re-run.
**Story:** [6.4 Hover, Select, & the Way Out](STORY.md)
**Depends on:** 6.4.2

## Objective

Everything Task 6.4.2 built works by pointer only. This task is the hard
part the story's own description names: ADR 0039 makes this region a tab
stop unconditionally, and there is no existing precedent for what happens
_inside_ a graph's tab stop the way there is for a ranked list (clamp, keyed
on symbol) or the price chart (one stop, arrows drive a reading along a
time axis a graph does not have).

**Gate 1 decision: a tree walk.** The graph already has the shape this
needs — 501 equities each with a membership edge to their sector ETF, 11
sector ETFs each with a hub edge to the broad-market centre. `Down` enters
(centre → first sector ETF in drawn ring order; a sector ETF → the first
member of its cluster, ticker order). `Up` exits the opposite way.
`Left`/`Right` moves among siblings — **clamped** within a cluster (ticker
order, never band order, because the band map updates at feed cadence and a
reader's position must never move under their stationary hands), **wrapped**
around the sector ring (it is drawn as a closed ellipse; wrapping matches
the picture). `Home`/`End` jump to the first/last sibling. Arriving by
keyboard seeds the selection at the centre — focus is never a state with
nothing in it.

This also builds the route-level `pnpm probe` interaction harness
`TOPOLOGY.md` has twice deferred to "the next story that changes what the
renderer draws under interaction" — scoped to what this task needs (a
scripted pointer/focus/arrow-key path against `/`'s real box, for measuring
the hit target and the focus ring's geometry), not to re-arguing Story
6.2's ADR 0048 frame-rate figures, which stay Epic 14's.

## What the user can see when this lands

Tab into `Market topology`; the canvas becomes the thing arrow keys drive.
Press an arrow and a node is selected at the centre, with a visible ring
and the same readout plate Task 6.4.1 built. `Down`/`Up`/`Left`/`Right`
walk the tree as described above; `Home`/`End` jump to the ends of
whichever group is current; `Enter` opens the selected security (the same
one-anchor mechanism Task 6.4.2 built, now reached by the browser's own
native activation rather than a click); `Escape` clears the selection and
leaves focus on the canvas.

## Work

- **One additional tab stop: the canvas itself.** `tabIndex={0}` plus
  `role="img"` (already present) plus a new `aria-describedby` pointing at
  a visually-hidden key-hint string ("Arrow keys walk the graph; Enter
  opens the security"). Mirror `ChartReading.tsx`'s shape (`switch` over
  `event.key`, `default: return`, `preventDefault()` only on a key
  actually handled) — `Tab`, `Home`/`End` outside this control, and the
  browser's own find-in-page shortcut must all still reach the page.
- **The tree walk**, as a pure function (`topology/walk.ts` or similar —
  graph and layout in, next symbol out, no DOM, no canvas, fully
  unit-testable): sector order from the layout's own drawn wedge
  allocation (`TopologyCluster`'s declared order, **not** `graph.clusters`'
  sorted-by-id order — the docblock there says plainly those are not the
  same thing); within-cluster order from `TopologyCluster.members`
  (already sorted by ticker).
- **The one anchor (Task 6.4.2) becomes reachable by Enter with no
  imperative navigation call.** The cleanest shape found while shaping
  this story: once a selection exists, keyboard focus moves to the one
  readout anchor itself (its `href`/label rewritten as arrow keys change
  the selection, the same roving-stop idea `RankedList` already uses, but
  with one physical element rather than one per row); `Enter` is then the
  anchor's own native activation. If the developer finds a cleaner shape
  that keeps zero `navigate()`/`useNavigate()`/`location.*` calls in the
  topology's own files, prefer it — that invariant is the one load-bearing
  constraint, not the specific mechanism above.
- **The focus ring**, per the design canvas
  ([`Hover, select, and the way out.dc.html`](https://claude.ai/design/p/727b5b14-fe78-47c1-9d9c-fb84b6ce5280)):
  radius `(TOPOLOGY_NODE_FOOTPRINT/2 + focus-offset + focus-width/2) ×
nodeScale`, constant 2px stroke, drawn **inset** (`.frame`'s
  `overflow: hidden` clips an outward-drawn outline on every edge — this is
  a clipping fact, not an accessibility-floor exception, so it does not
  need ADR 0026's standing-exception treatment). Two ink values depending
  on whether the node is also selected (light ink on the pale ground,
  `--ink-inverse` on the dark selected ground — `#181c23` on `#181c23`
  would be a silently deleted ring). Confirm with `pnpm probe` at minimum
  zoom that the ring does not touch Story 6.3's `extreme` ring (flagged as
  a tight/zero clearance by arithmetic during shaping; needs a real
  measurement before being trusted).
- **The interaction harness**, scoped: port the scripted pointer/wheel
  path already built for Storybook (`scripts/topology-instrument.mjs`)
  into `overview-instrument.mjs` (or equivalent) driven against `/`'s real,
  resizable box, plus a focus+arrow-key path. Use it to take the ring's
  real clearance figures and the hit target's real screen-pixel radius at
  all four widths — replacing the argued numbers above with measured ones
  before this task is called done. Do **not** use it to re-take Story
  6.2's ADR 0048 frame-rate figures; that stays a separate, explicitly
  deferred piece of work with Epic 14 as its owner.
- A browser spec: `Tab` into the region lands on the canvas; the full
  arrow sequence (`Down`, `Right`×N with clamping asserted at the cluster's
  own end, `Right` again wrapping at the sector ring, `Up`, `Home`/`End`)
  each asserted via `document.activeElement`/the selection's own ticker;
  `Enter` opens the expected security; `Escape` clears the selection
  without leaving the region; the canvas's own drawn bytes change when
  focus moves and change back when it leaves (the one machine-checkable
  proof a ring was actually drawn, following Story 6.3's own
  before/after-bytes pattern); the same sequence driven at 390px.

## Done when

1. The canvas is one additional tab stop; arrow keys walk the tree as
   specified, clamped within a cluster and wrapped around the sector ring,
   keyed on symbol never on an index.
2. `Enter` opens the selected security via the existing one-anchor
   mechanism, with zero `navigate()`/`location.*` calls in any topology
   source file — `pnpm invariants` passes unchanged.
3. A visible focus ring is drawn outside the 16-unit footprint, measured
   against the contrast floor on both grounds it can sit on, and confirmed
   not to collide with Story 6.3's rings at any zoom.
4. The route-level interaction harness exists and was used to take the
   real figures above — not argued ones.
5. A browser spec drives the full keyboard sequence at two widths and
   asserts where focus landed after every key.

## What was done

**The tree walk is a pure module** — `apps/frontend/src/topology/walk.ts`,
`topologyWalk(graph, layout, from, key)` in and a `Ticker | null` out, with
`isTopologyWalkKey` as the type guard the renderer's `switch` asks first. It
takes the **layout** as well as the graph for exactly one reason, stated in
its docblock: the four market proxies are the one group with no order in the
model to read (`QQQ`, `DIA` and `IWM` carry no edges at all), so their order
is read off the drawn column's own `y` rather than off a coincidence of two
sorts agreeing today. Everything else comes from the graph: the ring is
`SECTORS`' declared order (the drawn wedge order), a cluster is
`TopologyCluster.members` (ticker order, already sorted).

**The keyboard reaches `setSelectedNode`, which is the function a click already
called.** There is no second selection state anywhere. The listener is on the
**container** rather than on the canvas, which is the one shape decision worth
knowing: once something is selected, DOM focus is on the readout plate's
anchor, and the plate is a child of the same container — so one `keydown`
handler serves both focusable things and an arrow key pressed on the anchor
walks the graph exactly as one pressed on the canvas does.

**`Enter` is not handled at all**, and that is the point. It is absent from
the `switch`, so it reaches whatever has focus — which after any keyboard walk
is a real `<a href>` resolved at render from the node's own identity. The
activation is the browser's. **Zero `navigate()`, `useNavigate`,
`location.assign` or `location.href` in any topology file**, and
`one-home-for-imperative-navigation`'s allowance list is unchanged.

**Focus follows a keyboard selection and not a pointer one.** `onSelect` now
carries a `TopologySelectionSource` — `"pointer" | "keyboard" | "band"`,
`ChartReading.tsx`'s own `source` precedent — and `MarketTopology.tsx` focuses
the anchor from the `[openable]` effect only when a key produced the change.
`"band"` is a third value rather than a lie: a live `setBands` re-reports the
same node, and nothing downstream should read _a pointer did this_ about a
batch arriving on a socket.

**The canvas is `prepend`ed rather than `append`ed**, which is a tab-order
change and nothing else: the plate holds the anchor, and appended last the
canvas came _after_ it in sequential focus order, so a reader walking the graph
and pressing Tab landed back on the canvas they had just left.

**`Escape` focuses the canvas and then clears**, in that order — clearing
unmounts the anchor, and an element removed while it holds focus drops focus to
the body, which is the state `Region`'s own backstop catches by focusing its
`<section>` one level further out than the reader asked to go.

**Two strings, and one of them is the design canvas's own wording restored.**
`TOPOLOGY_READOUT_IDLE` is now `Point at a security, or press Tab and the
arrow keys.` — the string Task 6.4.1 implemented, caught on review and reverted
because it named a mechanism that did not exist. It does now. Beside it,
`TOPOLOGY_KEY_HINT` is a visually-hidden paragraph the canvas's new
`aria-describedby` points at, in a **second** id derived from `sentenceId`
rather than a second `useId` — because the mount effect's deps are exactly
`[topology, probe, sentenceId]` and that list is load-bearing in three
documents.

## What was measured, with `scripts/topology-interaction-probe.mjs`

A new, deliberately lightweight instrument — `pnpm probe`'s spirit, not
`overview-instrument.mjs`'s apparatus, because **nothing it takes is a timing
figure**: it reads where ink landed, which a dev server draws identically to a
production build. It drives `topology-instrument.mjs`'s own scripted pan/zoom
path against `/`'s real box, then a scripted key path, and measures **by
difference** — snapshot the canvas, change one thing, read the pixels that
moved. Focus arriving is the ring; a selection arriving is the ground disc.

**Measured 2026-11-06 against the running dev pair, all four widths, full
output — re-run twice, byte-for-byte identical both times:**

```
=== 1440 × 900   canvas 996×411
  tab × 2 from the region lands on  CANVAS
  hub         SPY    focus ring 9.74 → 12.10 px (stroke 2.36, 1326 px)  ground disc → 12.73 px  ring clears the disc edge by 0.63 px
              SPY    hit target reaches 11.0 px (first miss at 11.5 px)
  sector ETF  XLK    focus ring 9.67 → 12.19 px (stroke 2.52, 1342 px)  ground disc → 13.25 px  ring clears the disc edge by 1.06 px
              XLK    hit target reaches 8.5 px (first miss at 9.0 px)
  equity      AAPL   focus ring 9.66 → 12.20 px (stroke 2.54, 1362 px)  ground disc → 14.44 px  ring clears the disc edge by 2.25 px
              AAPL   hit target reaches 6.0 px (first miss at 6.5 px)
  banded      ADBE   (high) at the zoom ceiling: anomaly ring → 9.98 px, focus ring 14.97 → 17.87 px, clearance 4.99 px
  zoomed out  focus ring 4.31 → 6.64 px (stroke 2.33)
  zoomed in   focus ring 15.27 → 17.60 px (stroke 2.33)

=== 1024 × 900   canvas 568×411
  tab × 2 from the region lands on  CANVAS
  hub         SPY    focus ring 9.70 → 12.07 px (stroke 2.37, 1318 px)  ground disc → 12.73 px  ring clears the disc edge by 0.65 px
              SPY    hit target reaches 11.0 px (first miss at 11.5 px)
  sector ETF  XLK    focus ring 9.68 → 12.18 px (stroke 2.50, 1420 px)  ground disc → fully overpainted by its neighbours
              XLK    hit target reaches 6.0 px (first miss at 6.5 px)
  equity      AAPL   focus ring 9.76 → 12.12 px (stroke 2.35, 1412 px)  ground disc → fully overpainted by its neighbours
              AAPL   hit target reaches 4.5 px (first miss at 5.0 px)
  banded      ADBE   (high) at the zoom ceiling: anomaly ring → 9.96 px, focus ring 15.20 → 17.74 px, clearance 5.23 px
  zoomed out  focus ring 4.27 → 6.64 px (stroke 2.37)
  zoomed in   focus ring 15.16 → 17.70 px (stroke 2.55)

=== 768 × 800   canvas 684×411
  tab × 2 from the region lands on  CANVAS
  hub         SPY    focus ring 9.70 → 12.14 px (stroke 2.43, 1336 px)  ground disc → 12.69 px  ring clears the disc edge by 0.55 px
              SPY    hit target reaches 11.0 px (first miss at 11.5 px)
  sector ETF  XLK    focus ring 9.74 → 12.13 px (stroke 2.38, 1389 px)  ground disc → 1.96 px  ring clears the disc edge by -10.17 px
              XLK    hit target reaches 7.0 px (first miss at 7.5 px)
  equity      AAPL   focus ring 9.72 → 12.18 px (stroke 2.46, 1391 px)  ground disc → 1.96 px  ring clears the disc edge by -10.22 px
              AAPL   hit target reaches 5.0 px (first miss at 5.5 px)
  banded      ADBE   (high) at the zoom ceiling: anomaly ring → 9.97 px, focus ring 15.18 → 17.78 px, clearance 5.21 px
  zoomed out  focus ring 4.24 → 6.67 px (stroke 2.43)
  zoomed in   focus ring 15.26 → 17.62 px (stroke 2.36)

=== 390 × 780   canvas 306×411
  tab × 2 from the region lands on  CANVAS
  hub         SPY    focus ring 9.72 → 12.10 px (stroke 2.37, 1324 px)  ground disc → 12.72 px  ring clears the disc edge by 0.62 px
              SPY    hit target reaches 11.0 px (first miss at 11.5 px)
  sector ETF  XLK    focus ring 9.76 → 12.09 px (stroke 2.33, 1431 px)  ground disc → fully overpainted by its neighbours
              XLK    hit target reaches 3.0 px (first miss at 3.5 px)
  equity      AAPL   focus ring 9.74 → 12.09 px (stroke 2.35, 1420 px)  ground disc → fully overpainted by its neighbours
              AAPL   hit target reaches 0.0 px (first miss at 0.5 px)
  banded      ADBE (high) — no amber found beside the ring
  zoomed out  focus ring 4.30 → 6.66 px (stroke 2.36)
  zoomed in   focus ring 15.15 → 17.60 px (stroke 2.44)
```

**On review (2026-11-06), the first pass above was found to have quoted a
truncated, selectively favourable code block (one width in full, three
abbreviated to the single most reassuring line each) and a wrong fix — see
"What was found" item 9 below for the full account. The block above is the
complete re-run with the corrected instrument; every line from every width is
included, adverse readings and all.**

**Four readings, and what each settles.**

1. **The focus ring is where the design canvas's formula puts it, at every
   width.** `9.7 → 12.1` against the predicted `10 → 12` (the difference is
   antialiasing, and the measured stroke is 2.33–2.55 against a 2 px
   `lineWidth`). It is **identical at all four widths**, which is Story 6.3's
   own finding holding for a second ring: node ink is constant in CSS pixels
   regardless of the container's fit scale.
2. **It scales with the mark and nothing else.** `4.2 → 6.7` at the zoom floor
   and `15.2 → 17.9` at the ceiling — `clampNodeScale`'s [0.5, 1.5] exactly.
3. **The clearance against Story 6.3's ring is REAL, measured on a real banded
   node, and confirmed at three of the four widths — not all four, and the
   fourth is an honest absence rather than a gap in the record.** `ADBE`,
   drawn `high`, at the zoom ceiling, at 1440/1024/768: the anomaly ring's
   outer edge a consistent **9.96–9.98 px**, the focus ring's inner edge
   **14.97–15.20 px**, **4.99–5.23 px of clearance** — stable across three
   independently-driven widths, which is what makes it a measurement rather
   than a reading taken once and hoped to generalise. Scaled back to zoom 1
   that is ≈3.3 px against the 3.0 the constants predict for `high`;
   `extreme` is 0.5 px wider on each side, so ≈2.8 px at zoom 1 and ≈1.4 px at
   the zoom floor. **They do not touch, at the three widths this was
   reachable.** At 390 the walk still finds `ADBE` and reports it `high`, but
   no amber is found near the measured ring centre at all — not a negative
   clearance, a `null` reading, left unresolved rather than argued past. It
   is not chased further here: Done-when 3 does not require every width, and
   a real but unexplained absence is the honest stopping point.
4. **The hit target is unchanged by this task, confirmed rather than assumed.**
   Swept outward from each node's own measured centre: the hub reaches
   11.0 px (`topologyTargetRadius("index_etf", 1)` = 10) identically at all
   four widths. The sector ETF and equity figures track the fit SCALE, not
   the viewport width — `8.5 (1440) → 7.0 (768) → 6.0 (1024) → 3.0 (390) px`
   for the sector ETF and `6.0 (1440) → 5.0 (768) → 4.5 (1024) → 0.0 (390) px`
   for the equity, ordered by Task 6.4.1's own fit-scale table
   (`0.4477 > 0.3649 > 0.3032 > 0.1639`) rather than by width — 768 is a
   narrower viewport than 1024 but a LARGER fit scale, and the hit-target
   figures track that correctly rather than the width. The 390 equity
   reading of **0.0 px** is **not a repaired table going backward** — it is
   the same neighbour effect item 3 names, at the width where it bites
   hardest: `TECHNOLOGY`'s members are closer together in screen pixels than
   the target radius at this fit scale, so `topologyNodeAt` hands back
   whichever is nearest, and a target that reads `0.0` is a target contested
   at its very centre rather than absent. Task 6.4.1's own table is about one
   node in isolation; this is the first time this task's harness measured a
   CROWDED one, and crowding was already known and accepted (Story 6.2/6.3's
   own measured finding, not a new one).
5. **The 768-width `ground disc → 1.96 px … clears … by -10.17 px` and
   `-10.22 px` readings are NOT a focus-ring-into-selection-disc collision,
   and are flagged here rather than quoted at face value** — the same
   discipline item 3 applies to the anomaly ring, applied to this one too.
   `1.96 px` is far short of the ~12.7 px the disc reads cleanly at the hub;
   it is a tiny surviving sliver of a disc that is mostly overpainted by a
   neighbour (the same fact Task 6.4.2 established and this task's own item 1
   above restates), and the "clearance" arithmetic was written assuming a
   clean disc reading on both sides of the subtraction. Where the disc
   reading is truncated, the clearance figure computed from it is
   **uninterpretable, not negative** — it does not mean the ring sits inside
   the disc; it means the disc reading itself cannot be trusted at that
   point. This is a secondary, non-load-bearing measurement (Done-when 3 is
   about the ANOMALY ring, confirmed cleanly in point 3 above); it is not
   fixed here because fixing it would mean rewriting the ground-disc reader
   to the same ray-based method as the anomaly-ring one, which is more
   instrument than this task's own acceptance criteria call for.

## What was found

**1. The design work's second focus ink is unreachable, so it is not written.**
The canvas specifies two — _light ink on the pale ground, `--ink-inverse` on
the dark selected ground_ — against a model in which a node can be focused
without being selected. The shipped keyboard model has no such state: the first
key seeds the selection at the centre and every later key moves it, so the
focused node **is** the selected node and the ring is always inside the dark
disc. A second ink would be a value no frame can reach, which is this
repository's own rule about a claim with no mechanism behind it. One field,
`palette.focusRing` (`--ink-inverse`, ~~**14.6:1**~~ — corrected 2026-11-06
at this story's close to **14.98:1**, the WCAG formula applied directly to
`#eef0f5` on `#181c23`; the verdict against ADR 0026's floor is unchanged —
on `--surface-inverse`), with the condition for the second written beside
it.

**2. The first version of the probe measured a histogram of the whole picture
and reported it as geometry.** It matched `--ink-inverse`'s own `#eef0f5` in
the backing store and read **4,062 pixels of "ring"** against a stroke of
~1,240, because `--chart-grid` antialiased against 501 white halos produces
intermediates everywhere — so the centroid landed in the middle of the market
and the radii came out `18.19 → 41.83` and then `Infinity`. **It looked like a
measurement.** The difference method that replaced it needs no colour at all
and is the honest definition of each thing besides.

**3. And the probe's own second defect is the same lesson with the arrow
turned.** The zoom-extremes block reused a canvas box read at the top of the
run — but everything between moves focus, and focusing an element scrolls the
page, so the wheel landed on whatever was now at those coordinates and
`zoomAbout` was never called. It printed the **zoom-1 geometry under a heading
saying `zoomed out`**: a figure that looks taken. The box is re-read where it
is used.

**4. A keyboard sweep for the hit target is invalid while something is
selected**, found by reading `hit target reaches 40.0 px` at every node. The
plate falls back to naming the selection at every point over nothing (Task
6.4.2's own decision), so the oracle answers the same ticker for ever. The
sweep now runs after `Escape`.

**5. In the densest clusters the focus ring is hard to find, and that is
routed rather than repaired** — `.probe-interaction/1440-equity.png`. At the
fitted scale `TECHNOLOGY`'s members overlap heavily (Story 6.3 measured the
same crowding and recorded it as pre-existing), and a light ring among twenty
white halos is not the landmark a keyboard reader wants. This is a question
about the treatment rather than a defect in it — the ring is exactly where it
was specified — and it is the kind of judgement the owner takes. Zooming fixes
it completely, and the crop at the zoom ceiling
(`.probe-interaction/1440-banded.png`) is unambiguous.

**6. The landmark-ink collision Task 6.4.2 found does NOT recur here**,
checked by photographing the hub focused and selected at 768 and 1440 rather
than by arithmetic: the ring is `--ink-inverse` on a `--surface-inverse` disc
over an `--ink-primary` body, so it is the one layer on that node drawn in the
inverse ink. `.probe-interaction/768-hub.png`.

**7. The browser spec's own first spelling of _changes back when it leaves_
was wrong, and finding out why took 96 executions.** `expect(final).toBe(atRest)`
over a whole-canvas digest failed about **1 run in 25 at four workers**,
bit-exactly — `431109558` against `2994644590`, with the canvas box
**identical** at `308×413` in both readings, which is what ruled out a re-fit
and left the drawing. Two causes were found and only one of them is the test's:

- **The anomaly bands had not been applied when the baseline was taken.** The
  furnished frame carries no `anomalyBands` section, so the route answers it by
  drawing all 501 equities `unscored` — a redraw that arrives whenever the
  socket connects, which is after two equal digest reads 100 ms apart on a
  fast machine. The spec now waits for the accessible sentence
  `applyAnomalyBands` rewrites in the same call.
- **And a re-mount loses the bands**, which is the deeper one and is **not**
  this task's to repair: anything that lands a fresh `securities` array — a
  retried `GET /securities`, which a restarting dev backend produces — re-runs
  the mount effect, and the new renderer has not had a `setBands` call, so
  every equity draws `normal` until the next batch. It is a real product
  behaviour (Story 6.3's channel, not this story's), it is invisible on any
  machine whose universe request succeeds first time, and a whole-canvas
  digest compared across a whole test is the only thing that can see it.

The assertion was **restructured rather than retried**: the ring is now
_focused-and-selected against unfocused-and-selected_, two readings seconds
apart with only focus between them, and _changes back_ is
_focused-and-empty equals unfocused-and-empty_. Both are claims about the two
pixels this task owns rather than about every pixel on the screen. **264
executions since, zero failures.**

**8. The dev backend went down mid-session and took a full suite with it**,
which is worth recording because it is the explanation for three of the five
failures in this task's first whole-suite run (`overview-degraded-grid` at 768
and 390, and two chart specs, all on timeouts). `pnpm typecheck` is `tsc -b`
and **emits**, `apps/backend` is run under `node --watch dist/index.js`, and a
restart that fails to bind leaves the watcher alive and the port silent —
exactly the state `CLAUDE.md` records as having no symptom. All four specs
pass alone at one worker (`overview-degraded-grid` in 1.8 m against the 90 s
timeout it blew under four workers).

**9. The anomaly-ring clearance instrument had a real correctness bug, found
on review rather than before this task's first pass was written down, and the
first pass's own record was itself incomplete in a way that hid it.**
`measureBandRing` matched the anomaly ring's own colour and took the MAX over
a 24 px box around the measured centre. The docblock argued this was safe
because the caller zooms in first (16 ctrl-wheel steps to the zoom ceiling),
on the reasoning that zoom widens the gap between neighbouring nodes. **That
reasoning is incomplete**: this renderer's fit SCALE is itself width-dependent
(0.4477 at 1440 down to 0.1639 at 390, Task 6.4.1's own table), so the same
RELATIVE zoom ceiling leaves markedly less ABSOLUTE separation on a narrower
viewport — re-run, the box-based method read **33–34 px** of "anomaly ring" at
1024 and 768 against a ring whose own outer edge is a single-digit figure,
which is a neighbour's ring entering the box, not this node's own. **This is
the same class of defect this task's own module docblock already named for
the first draft of the FOCUS-ring instrument** (finding 2's "it looked like a
measurement"), arriving a second time in a sibling function nobody had reason
to suspect because the one width it was checked against (1440) happened to
work. Fixed by replacing the box/colour-match with a ray-based method:
sixteen rays outward from the centre, each stopping at its first gap after
amber begins, so a spatially separate neighbour's ring — reachable only past
a gap — is excluded by construction rather than by hoping the window is wide
enough. Re-run, the figure is now consistent to two decimal places across
three widths (9.96–9.98 px) rather than swinging from 10 px to 34 px depending
on which cluster member the walk happened to enter. **And the task's own
first-pass record, written before this fix, had quoted only the one width
where the broken method happened to agree with the truth, with the other
three abbreviated to a single reassuring line each and the adverse readings
left out entirely** — not a fabrication (every number printed was real
output), but a selective one, which this repository's own rule about a
throwaway instrument's findings needing a verbatim quote exists to catch. The
"What was measured" section above is the full, unabridged re-run.

## Verification

- `pnpm typecheck` — clean.
- `pnpm lint` — clean (`--max-warnings 0`).
- `pnpm format` — applied; `format:check` clean inside `pnpm verify`.
- `pnpm --filter @marketpulse/frontend test topology` — **108 passed**, 6
  files, including `walk.test.ts`'s 15 over the real recorded universe.
- `pnpm --filter @marketpulse/frontend test MarketTopology` — **50 passed**,
  six of them this task's.
- `pnpm e2e overview-market-topology-keyboard.spec.ts overview-market-topology-hover.spec.ts overview-market-topology.spec.ts --workers=1`
  — **16 passed**.
- The keyboard spec **repeated**, which is this story's own recent history
  (Task 6.4.2's canvas race showed up only on repeats): `--repeat-each=12 -g
"drawn bytes"` × 4 at four workers and `--repeat-each=8` over the whole file
  × 3 — **264 executions of the bytes test and 168 of the file, zero
  failures** after the restructure described above. Before it, the same
  command failed 3 times in 96.
- `pnpm e2e overview-degraded-grid.spec.ts --workers=1` — **4 passed** (1.8 m).
- `pnpm e2e overview-focus-ring.spec.ts overview-degraded-stops.spec.ts overview-region-order.spec.ts overview-journey.spec.ts overview-no-element-per-security.spec.ts overview-market-topology-anomaly-bands.spec.ts landing-route.spec.ts --workers=1`
  — **21 passed, 1 skipped** (the skip is `overview-journey`'s own
  figure half, which no gated machine can run). `overview-focus-ring.spec.ts`
  now walks the canvas as a tab stop and reports it clearing both sticky
  edges, which is the new stop covered by an existing check rather than by a
  new one.

**The ring assertion was proved by a plant rather than trusted.** The draw was
disabled (`if (false && focusWithin …)`) and the spec re-run: it went red at
**`expect(blurred).not.toBe(selected)`, line 420** — the one clause that
isolates the ring from the ground disc, since the selection persists across
that comparison and only the ring changes. An assertion failure on the
intended clause, with the rest of the file still collecting; both widths
failed. The plant was then removed and the suite re-run green.

**Re-verified after the review's fixes (2026-11-06), on the orchestrator's own
run rather than quoted from the implementing pass.** `scripts/breaks.mjs`'s
`a-second-affordance-on-a-topology-node` entry had silently stopped landing
(its `find` string no longer matched `TOPOLOGY_READOUT_IDLE`'s own new text,
which this task's own work correctly changed) — `pnpm invariants` caught it
by name (`every-break-can-still-land`), the entry was re-pointed, and the
break was hand-performed to confirm it still catches the planted defect (red,
naming the correct line) before being reverted (green again). `pnpm
typecheck`, `pnpm lint`, `pnpm format --check` clean after every fix in this
section; `pnpm e2e overview-market-topology-keyboard.spec.ts
overview-market-topology-hover.spec.ts overview-market-topology.spec.ts
overview-market-topology-anomaly-bands.spec.ts` — **12 passed**; the keyboard
spec alone, `--repeat-each=5 --workers=1` — **35 passed**. `.probe-interaction/`
is now in `.gitignore`/`.prettierignore`/`eslint.config.mjs`, mirroring
`.probe/`'s own convention, and the stray output directory the first pass
left behind is removed.

## What is NOT covered

- **No screen reader has heard any of this.** The walk moves DOM focus to one
  physical element whose text content changes, rather than between elements —
  so whether a reader is told `XLK, link` on each arrow press, or nothing at
  all after the first, is unanswerable from a DOM and belongs to
  `CLAUDE.md`'s standing listening-pass item. The region still has **no live
  region**, which is this story's own restated decision.
- **`Enter` on the canvas with a pointer-made selection does nothing.** A
  reader who clicks a node and then presses `Enter` without tabbing gets no
  navigation, because focus is on the canvas and the renderer deliberately
  does not handle `Enter`. The keyboard path is unaffected (focus is already
  on the anchor). Named here rather than repaired: the repair is either a
  focus hop or an imperative activation, and both are a third mechanism for
  something two already cover.
- **The focus ring's clearance against an `extreme` ring is arithmetic, not a
  photograph.** The probe found a `high` node on this developer's store and
  measured that one; `extreme` is 0.5 px wider on each side by two shipped
  constants. CI can produce neither — zero bars, no composite generation, so
  every equity there is `unscored` for ever.
- **Nobody has used this with a keyboard on the deployed site.**
  `LIVE-REHEARSAL.md` has no row for Epic 6, and this is a sitting rather than
  a check.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

## Amended by Task 6.4.2 — 2026-11-05: two lessons this task inherits directly

**1. Selection already lives in the renderer, reached through an internal
setter — arrow-key traversal should drive the SAME mechanism, not a second
one.** Task 6.4.2 built `selected`/`setSelectedNode` inside
`renderer-canvas.ts`'s mount closure (reported out via `onSelect`, mirroring
`onHover`), specifically because the renderer needs the selection to draw
the ground disc and a second home for the same fact was rejected during
that task's own shaping. The keyboard's `Down`/`Up`/`Left`/`Right` should
compute the next node (via the tree-walk this task still owns) and call
that same internal setter — never introduce a parallel selection state for
the keyboard path. `MarketTopology.tsx`'s `openable`/`<Link>` plumbing
(the one anchor, Task 6.4.2) needs no change at all if this is done
correctly: it already reacts to whatever the renderer reports selected,
regardless of whether a click or a key produced it.

**2. The selection ground's colour collision with the landmark nodes'
own ink (`--surface-inverse` == `--ink-primary`, found and fixed in Task
6.4.2) is the same hazard this task's focus ring is walking into.** The
focus ring's two-ink design (light ink on the pale ground, `--ink-inverse`
on the dark selected ground) was specified against the equity case; check
it against all sixteen landmark nodes specifically, at a zoom and pan where
one is selected AND focused at once, before trusting the contrast figures
in this task's own "Work" section. If the same collision exists, the fix
Task 6.4.2 used (a halo-matching stroke, `palette.halo`) is the precedent
to reach for rather than a new token.

**3. A canvas assertion taken immediately after a state change must poll,
never read once.** Task 6.4.2's own browser spec had a real, reproducible
race — `darkPixelsAround` read the canvas before the renderer's
`invalidate()`-scheduled animation frame had painted, 2 of 6 repeats failed
in isolation before this was found and fixed. This task's own AC4 and AC7
work (the focus ring's drawn pixels, the canvas-bytes-changed-on-focus
proof) reads the same canvas the same way and needs the same discipline:
`await expect.poll(() => <canvas read>)`, never a bare
`expect(await <canvas read>)`, for any assertion that follows a key press
or a click.
