# Task 6.1.3 — The Graph, in Storybook

**Status:** **Complete — 2026-10-30.** The real 516-security market draws in
Storybook across nine states. One finding travels open rather than closed: a
sector label still visibly crosses a neighbouring cluster at the component's
own default size — a genuine, measured improvement (the ring radius fix)
narrowed it but could not eliminate it, and this task's own first attempt at
that fix was itself proved wrong (a units bug) before being corrected into an
honest regression-floor test. `docs/GAPS.md` carries the rest, owned by the
next story that fits this layout into a real box.
**Story:** [6.1 The Decisions, the Renderer Measured, & the Graph in the Workshop](STORY.md)
**Depends on:** 6.1.2

## Objective

This is the task that pays off the story's own promise: "a graph of the whole
tracked market, in Storybook." Everything before this task was model, layout
and measurement with nothing to look at; this task wires the winning renderer
to real data and draws it exactly as `The graph at rest.dc.html` specifies.

## What the user can see when this lands

**A real graph of 516 real securities, in Storybook** — eleven sector clusters
converging on their benchmark ETFs, SPY at the centre with the three undecoded
proxies held beside it, pannable and zoomable, on the light grounds, with
every state this component can actually be in.

## Work

- **The host component** — `apps/frontend/src/components/MarketTopology/`
  (a `.tsx`, so `pnpm stories` can see it; **not** under `src/market/`, which
  holds no `.tsx` today and would escape that check silently). Props take a
  `SecuritiesView` (reuse the existing union from `use-securities.ts` — do not
  invent a parallel state type), builds `TopologyGraph` and `TopologyLayout`
  from the `loaded` securities, and mounts the winning renderer from Task
  6.1.2.
- **`apps/frontend/src/topology/index.ts`** — the barrel. Add the `eslint`
  boundary entry to the **same** `no-restricted-imports` `patterns` array that
  already holds `market/`'s entry (a second config block for the same rule
  silently _replaces_ rather than adds to it — verified in this repository
  once already).
- **Colour, read from tokens, never a literal**: add any new topology token
  names to `styles/tokens.ts`'s `TOKEN_NAMES` (the real mechanism — a startup
  throw) even though the `var()`-reading invariant cannot see a canvas. The
  parse layer (`getComputedStyle` → packed colour) **throws** on a missing or
  malformed token; it does not default silently.
- **Sizing**: the component reads its box via `ResizeObserver` and fits the
  layout's normalised coordinates to it — no pixel constant, no remembered
  size. (This story ships no route, so the box is Storybook's own; Story 6.2
  owns fitting it to the real, narrower landing-page region.)
- **Draw every state, each its own Storybook export**:
  - `loading` — a reserved box, never a half-drawn canvas.
  - `loaded`, whole universe — the headline story, matching the canvas page's
    geometry (ring radius, cluster radii, node ladder, edge gaps).
  - `loaded`, filtered to one sector — close enough to read labels and the
    footprint annulus.
  - `loaded`, the four market-proxy nodes alone — the state nobody had named:
    confirm the `sector: null` nodes render as the diamond shape, grouped
    under one `MARKET PROXIES` label, with `SPY` distinguished as the one
    carrying edges.
  - `empty` — the service answered correctly and holds nothing. DOM text,
    sibling to the (absent) canvas, never drawn inside it.
  - `failed` (+ `retryable`/`retrying`) — the sentence, a `requestId`
    reference, one `Try again`. DOM text, same rule.
- **A component test, in jsdom, for exactly the part jsdom can see**: the
  `empty` and `failed` states render their sentence as real DOM text (not
  inside the canvas/SVG), and `loading` renders no canvas element at all.
  **Do not write a `renders without crashing` test for the drawn graph
  itself** — jsdom has no WebGL/2D context and `getTokens()` throws in the
  test environment, so nothing below a real browser can assert a single pixel
  this renderer draws; a vacuous test here is worse than its absence.
- **`pnpm probe --story <id>`** against each state, at all four widths, for a
  person (orchestrator or designer) to compare against the canvas page before
  this task closes.

## Done when

1. `pnpm stories` passes (the host component has a sibling `.stories.tsx`).
2. All six states above exist as named Storybook exports and were reviewed via
   `pnpm probe --story` against `The graph at rest.dc.html`'s geometry and ink
   figures (ring radius ≈335px-equivalent, 4.3% ink, the node ladder, the gapped
   edges) — discrepancies are recorded, not silently reconciled.
3. The `eslint` boundary entry is in place and verified (attempt a deep import
   into `topology/` from outside it; confirm it fails lint; revert the
   attempt).
4. The jsdom component test for `empty`/`failed`/`loading` passes.
5. `pnpm build && pnpm lint && pnpm format:check` all exit 0.
6. `pnpm stories`'s own known blind spot is named in this task's record: it
   proves the file exists, not that these six states are inside it — the real
   verification is the `pnpm probe` review in item 2.

---

## What was done — 2026-10-30

### The host component, mostly built by Task 6.1.2's own overlap

Task 6.1.2 built `apps/frontend/src/components/MarketTopology/` and
`apps/frontend/src/topology/index.ts`'s barrel and `eslint` boundary entry
while mounting its two renderer candidates — "far enough to draw the real
universe" turned out to require most of this task's own host-component work.
Five of the six named states already existed as Storybook exports
(`WholeUniverse`, `OneSector`, `Loading`, `Empty`, `Failed`) before this task
began. What follows is this task's own contribution on top of that.

### The sector-label collision, found by Task 6.1.2 — genuinely improved here, NOT solved, and my own first attempt at this write-up overclaimed it

**The defect, confirmed real.** `The graph at rest.dc.html` §06 places every
sector's label directly above its own cluster (same x as the benchmark ETF,
smaller y). At a bearing near three or nine o'clock that direction is nearly
_tangential_ to the ring rather than radial, so a label's lateral extent
competes for the clearance the circle-to-circle wedge allocation protects —
and at `TOPOLOGY_RING_RADIUS = 335` it lost: `CONSUMER DISCRETIONARY` crossed
into `Financials`' circle and `COMMUNICATION SERVICES` crossed into `Consumer
Discretionary`'s.

**My first repair raised `R` from 335 to 400 and verified it with a test that
compared the wrong units, and reported success.** The circle-to-circle
proportional-arc argument is genuinely scale-invariant in `R` (so that half of
the fix, and the closest-circle-clearance figure — 28.75 → **57.69 units** — is
real and unconditional), which is why raising `R` looked like the right lever
for the label collision too. It is not, for a reason I missed the first time:
I compared each sector's measured label width **in CSS pixels** directly
against this layout's own **abstract units**, as though they were the same
quantity. They are not — `renderer-canvas.ts` draws label text at a **constant
CSS-pixel size regardless of the fit scale** (the design work's own rule: type
does not scale), while a circle's radius and position shrink with whatever box
the layout is fitted into. My test implicitly assumed a fit scale of exactly
1, which no real rendering of this component ever uses. Against that flawed
test, `R = 335` failed (`92.72` not `≥ 101.60`) and `R = 400` passed — and I
wrote this section reporting the collision fixed.

**It was not fixed, and the person who finished this task's remaining work
found it by photographing the built page rather than trusting my test.**
Re-measured through the real fit scale (`{ width: 1392, height: 520 }`, the
box `apps/frontend/src/topology/fit.ts`'s own tests already use, close to this
component's actual default Storybook box), the fit scale is ≈0.515, and the
worst label/circle clearance — the same `communication_services` →
`consumer_discretionary` pair — moved from **−37.3 px at `R = 335` to
−28.0 px at `R = 400`**: real, measured progress, and a real, visible
collision still present. `pnpm probe --story
components-markettopology--whole-universe` at 1440 shows it: the word
`COMMUNICATION SERVICES` runs into the edge of the `Consumer Discretionary`
cluster's dots.

**Why I did not keep raising `R` to chase zero.** The layout-unit room a label
needs at a given box is `(label width in CSS px) / (fit scale)`, and fit scale
shrinks as the box narrows, so the required clearance grows without bound as
the box narrows while `R` is one constant committed to independent of any box.
Swept over the real layout: clearing the `1392 × 520` reference box outright
costs `R ≈ 700` (buying 9 px at `R = 400` for roughly 300 more units of ring
radius), and a materially narrower box needs far more than that — `R ≈ 1600`
for a 390-wide box, at which point whole-graph ink density approaches the
~2%-reads-as-empty floor the design work itself names. **No single value of
`R` is the right lever for a problem that is fundamentally about the box, not
the ring** — the renderer is the one thing in this picture that knows its own
fit scale, and a scale-aware label treatment there is the real fix.

**What I actually shipped, corrected rather than withdrawn.** `R = 400` stays
— it is a genuine, unconditional improvement to circle-circle clearance and a
real (if partial) reduction in the label collision, and reverting it would
make both worse for no gain. What changed is the record and the test:
`topology-layout.test.ts`'s check is rewritten as **`a sector label against a
NEIGHBOURING cluster's circle`**, converting through the real fit scale and
asserting a **regression floor** (−30 px at the reference box) rather than a
correctness guarantee — proved wrong-then-right the same way as before (fails
at `R = 335` with `−38.27`, passes at `R = 400`), but honest about what it
actually proves. `ADR 0048`'s dated amendment and `TOPOLOGY_RING_RADIUS`'s own
docblock are both corrected to match. `docs/GAPS.md` carries the open defect,
its re-measure, and its owner — the next story that fits this layout into a
real box, which is already Story 6.2's job for an unrelated reason (its own
elliptical ring).

### The four market proxies alone — and the state's own name is half wrong

`MarketProxies` is the sixth state, selected by `kind === "index_etf"` (a
**positive** membership test — the negative form would admit whatever kind a
later curation adds) and driven through `toSecuritiesView` like every other
story here. Measured from the real builders rather than guessed, and confirmed
on the page at four widths:

```
four proxies  nodes 4  edges 0  bounds { minX 0, minY -32, maxX 448, maxY 32 }
placements    DIA (448,-32)  IWM (448,0)  QQQ (448,32)  SPY (0,0)
```

**Three of the four things that state was named to confirm are confirmed**: the
`cluster: null` nodes draw as **diamonds**, the three undecomposed proxies sit
in one column under a single `MARKET PROXIES` heading, and `SPY` is sited
**apart from** them at the origin rather than in the column (`renderer-canvas.ts`
filters the column on `x > TOPOLOGY_RING_RADIUS`, so the hub is excluded by
construction).

**The fourth cannot be confirmed in this state and the task's own wording is
what is wrong, not the code.** _"with `SPY` distinguished as the one carrying
edges"_ is unreachable here: `buildTopologyGraph` builds a hub edge to each
sector ETF **that is present**, and a universe of four proxies contains none, so
the graph has **zero** edges — ADR 0029 applied to a line, and the behaviour
this repository wants. Recorded rather than reconciled: the alternative was
quietly adding eleven sector ETFs to a story whose name says it holds four
securities, which would have made the story's name a lie to make a sentence in a
task file true. **`OneSector` is the state where `SPY`'s edge IS visible** — one
hub edge from `SPY` to `XLE` with the twenty-one Energy spokes converging on it
— and it was already there.

### `retryable` / `retrying`, and `MarketTopology` now takes an `onRetry`

The `failed` state was one sentence and threw away both halves of what
`use-securities.ts` had already worked out. It now renders **the sentence, one
`Try again`, and the correlation id**, each on its own condition:

- **The sentence is one of three**, from `topologyFailureSentence` — nothing
  answered / the service cannot reach its data / something answered and it was
  not this service. The third says _trying again now would produce the same
  answer_, which is the half that is easy to leave out: with no control on
  screen, a reader who is not told that waiting will not help waits for a page
  that never comes good.
- **The control is `components/Button`**, `secondary`, `icon="refresh"`, with
  the subject in its accessible name — `Try again — the market topology` — which
  is Task 2.14.7's finding and not a flourish, because Story 6.2 will put this
  region on a screen that can hold a second `Try again`. It is **not disabled**
  while `retrying`; only its word changes (`Trying again…`).
- **`onRetry` is REQUIRED**, which is `UniverseTable`'s precedent: an optional
  handler a caller forgets takes the control off a failed screen _silently_, and
  an absent control is precisely how this product says _waiting will not help_.
- **The reference renders only where a response carried one** (ADR 0029: each
  clause renders only when its own data is present), so `FailedUnreachable` is
  the state with a button and no `Reference` line and `FailedNotRetryable` is
  the state with a reference and no button.

**It is deliberately not `UniverseTable`'s `FailedState`**, which draws a marker,
a status word, a headline, a cause and a prospect in `BackendIndicator`'s
vocabulary. That surface _is_ the tracked universe; this is one region that will
share a screen with six others, and the sentences are its own rather than a
second copy of that component's strings.

`toRetryingView` is now **exported** from `use-securities.ts` with the note
`toSecuritiesView` already carries, and `securitiesFixtureRetryingView` drives
it — `retrying` is the one member of this union no recorded body can produce,
because it is a fact about an action rather than about a response.

Nine Storybook exports now, covering the six named states: `WholeUniverse`,
`OneSector`, `MarketProxies`, `Loading`, `Empty`, `Failed`, `FailedRetrying`,
`FailedNotRetryable`, `FailedUnreachable`.

### The jsdom test — six tests, and the one it refuses to write

`MarketTopology.test.tsx`. `loading`, `empty` and all four failure states render
their sentence as a real `<p>` (`closest("canvas")` and `closest("svg")` both
`null`), **no `<canvas>` exists in any of them**, the retryable failure offers
**exactly one** button whose accessible name carries its subject and whose click
reaches `onRetry`, the retrying one is not `disabled`, the non-retryable one has
no button at all and says why, and the unreachable one has no `Reference`.

```
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

**No `renders without crashing` test for the drawn graph**, per this task's own
instruction and for a reason worth restating: jsdom has no 2d context and
`getTokens()` throws there, so a `loaded` render takes the component's own
refusal path and such an assertion would be green whatever the renderer did —
cover this component does not have, advertised in a list of test names.

### The `eslint` boundary, verified by planting the defect

Planted `import { mountCanvasTopology as deepImported } from
"../../topology/renderer-canvas.js";` into `MarketTopology.tsx` beside the
existing barrel import (appended, so the file's other imports still match), then:

```
$ pnpm exec eslint apps/frontend/src/components/MarketTopology/MarketTopology.tsx
  11:1   error  '../../topology/renderer-canvas.js' import is restricted from being
                used by a pattern. Import the topology module through its index
                (PRODUCT_SPEC.md §26): a feature module exposes a domain-level API,
                and a deep import is a dependency on an internal that has no reason
                not to move  no-restricted-imports
  11:33  error  'deepImported' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)
```

**Read which error, not that there were two**: the second is `no-unused-vars`
and is incidental — the boundary is the first, and it names the rule and the
message the barrel's docblock promises. Reverted from a byte-for-byte copy taken
before the plant (`git diff --stat` on the file is empty afterwards) and
re-linted clean.

### `pnpm probe` against all six states, at all four widths

Storybook dev on `:6006`, `pnpm probe --story components-markettopology--<id>`.
The frame is `1410 / 994 / 738 / 360 × 522` at 1440 / 1024 / 768 / 390 in every
state, nothing scrolls, and no page error was raised anywhere.

**A blind spot of the tool itself, worth one line:** without `--all`, `pnpm
probe` prints _"(nothing with a CSS-module class)"_ for every `loaded` state
here, because the only module-classed element is a plain positioned box and the
default filter keeps flex/grid containers and non-default flex items. For this
component `--all` is not optional.

**One repair, found by looking and invisible to everything else.** `.absence`
declared `place-content: center` and had **no height to centre in**: the
paragraph was its own 66 px at the top of a 522 px reserved frame with 450 px of
nothing under it, which reads at a glance as _the box failed to draw_ — the exact
impression a reserved box exists to avoid. `block-size: 100%` plus
`box-sizing: border-box` on `.absence` and `.state` (this tree has **no** global
box-sizing reset — `100%` plus `--space-24` of padding is 568 px inside a 520 px
frame, which `overflow: hidden` then clips rather than reports). Re-probed:
`1408×520 @17,17` and the sentence at the frame's centre.

#### The 390 question: NOT a resize bug, and the real cause is a UNIT

The report was that at 390 the graph looks cropped on the right —
`CONSUMER STAPLES` reading as `NSUMER STAPLES`, the `MARKET PROXIES` column and
its tickers cut off — with node sizes apparently unchanged from 1440.

**`ResizeObserver` and the re-fit are both correct.** `measure()` calls
`reviewport(view, layout, box)`, which spreads a **fresh** `fitView` and keeps
only the reader's `zoom` and `pan`, so `scale` is recomputed from the new box
every time. Measured: `scale` is **0.518 px/unit at 1440 and 0.333 at 390**, so
the geometry really is 1.55× smaller at 390. It is not stale and it is not a
Storybook-iframe artefact.

**What does not scale is every pixel-sized thing, and that is by design** —
`TOPOLOGY_NODE_INK` is 8 / 10 / 12 **CSS px** multiplied by `clampNodeScale(zoom)`
(1 at rest, and deliberately independent of the fit), and label type, edge width
and the halo are constant by the design work's own rule. So at 390 the marks and
the words are the same size they are at 1440 while the distances between them
shrink by a third: nodes **look** identical, and the labels run out of room.

**The clipping itself is `TOPOLOGY_FIT_MARGIN` being expressed in the wrong
unit.** The margin is **40 layout units**, which is 20.7 px of real clearance at
1440 and **13.3 px at 390** — against a sector label up to **163 px wide** drawn
centred on a cluster that sits on the extent's own edge, and a `MARKET PROXIES`
heading centred on the rightmost column. The reserved room shrinks exactly when
the text needs more of it. Nothing in `fit.ts` is wrong internally; the margin
is simply not the quantity that bounds a label.

**This is a real defect, it is Story 6.2's by subject (that story owns fitting
this layout to a real, narrower box) and it is NOT repaired here**, because the
repair is a design decision — a margin in pixels, a label that shrinks or
truncates, or a label placed radially outward rather than straight up — and
because this task's instruction was to record rather than reconcile.

#### And a collision that the geometry fix above did NOT clear

Looking at `WholeUniverse` at **1440**, where the fix was called visually
confirmed: `COMMUNICATION SERVICES` still paints across the leftmost discs of
`Consumer Discretionary`'s cluster. Photographed at 4× and then measured against
the real layout rather than argued:

```
frame 1410x522  scale 0.5177 px/unit
  COMMUNICATION SERVICES label: width 161.5 px  (constant at every zoom)
  consumer_discretionary circle: r = 41.4 px at this scale
  clearance = -26.5 px        (negative = overlap)

frame 360x522   scale 0.3332 px/unit
  clearance = -26.6 px
```

**Why the check beside `topology-layout.ts` is green while the page is not: the
test compares a width in CSS PIXELS against distances in LAYOUT UNITS.** The
label is drawn at a constant pixel size, so its extent _in layout units_ is
`width / scale` — **312 units at the 1440 fit and 485 at 390**, not the 161.5
the test treats it as. The assertion is therefore optimistic by a factor of 2–3,
which is the same span-mismatch shape as Story 5.6's excess factor: every figure
in it individually correct, and nothing comparing the two sides' units.

**And raising `R` cannot fix it.** Swept over the real cluster radii and the
real measured label widths, worst label-vs-circle clearance **in screen pixels**
when the layout is fitted to the frame:

```
R      1440x522 worst        390x522 worst     (both: communication_services vs consumer_discretionary)
335    -37.3 px              -26.5 px
400    -27.1 px              -26.4 px     <- shipped
500    -15.2 px              -22.3 px
700     +1.4 px              -17.0 px
1000   +15.9 px               -8.2 px
1600   +29.6 px               +0.9 px
2400   +37.7 px               +6.3 px
```

335 → 400 bought **10 px at 1440 and 0.1 px at 390**, and clearing it by ring
radius alone needs `R ≈ 700` at 1440 and `R ≈ 1600` at 390 — four times the
shipped value, at which the whole market draws at `scale 0.10` and the constant
8 px marks swamp the geometry. **Reported, not repaired**: `topology-layout.ts`
is out of this task's scope by instruction, the repair is a label-placement
decision rather than a constant, and it belongs beside the margin finding above
as one question — _what reserves room for a pixel-sized word in a unit-sized
layout_.

#### Against `The graph at rest.dc.html`

- **Node ladder, shapes, two edge kinds, the gapped ends, one `MARKET PROXIES`
  label, eleven sector names, four proxy tickers, 501 silences, achromatic** —
  all as drawn.
- **Ring radius 335 → 400** and **extent 882 → 1000.3 × 928.4**: already
  recorded in `ADR 0048`'s amendment, restated here because every ink and
  geometry figure on the canvas page is quoted against 335.
- **Ink: the canvas says 4.3% and this layout measures 2.87%** of its own
  `1000.3 × 928.4` extent (ink area 26,672 sq units, circles as `πr²`, squares
  as `d²`, diamonds as `d²/2`). **The two are not an apples-to-apples pair** —
  the same model over an 882-square extent gives 3.43% rather than the canvas's
  4.3%, so the canvas is counting something else (footprints, most likely).
  What travels is the magnitude: still well above the ~2% _reads as empty_
  floor and far below the ~8% _clusters merge_ ceiling, so the canvas's
  conclusion — 516 nodes is not a density problem at this footprint — survives
  the larger ring. **A re-derivation of 4.3% in the canvas's own model is
  owed**, and it is Story 6.2's, which has to re-derive the extent anyway.
- **A ticker's gap from its node is scale-dependent too**, same root cause: the
  label x is `placement.x + TOPOLOGY_NODE_INK[kind]` — twelve **layout units** —
  so the gap is 6 px at the whole-universe fit and **32 px** in `MarketProxies`,
  where the scale is 2.67 px/unit. Visible in that story's screenshot as three
  tickers floating well clear of their diamonds. Same question, same owner.

### What `pnpm stories` proves here, and what it does not

It passes, and all it proves is that `MarketTopology.tsx` has a sibling
`.stories.tsx`. It cannot see **how many** states are in that file, whether they
are the six this task names, or whether any of them renders anything — a story
that threw on mount would pass it. The real verification of Done-when 2 is the
`pnpm probe` review above, by a person, against the canvas page.

## For a stakeholder — a status report, 2026-10-30

**There is now a picture of the whole US market we track, and you can open it.**
516 securities — every one of the S&P 500 we follow, the eleven sector funds and
the four market benchmarks — drawn as eleven clusters around `SPY`, in the
workshop where this product's components are reviewed. Nine versions of it are
there: the whole market, one sector close up, the four benchmarks alone, and
every state the screen can be in when the data behind it is late, empty or
unreachable.

**The part that changed for a person today is what happens when it goes wrong.**
Until this morning a failure drew one sentence and nothing else. It now says
_which_ failure, offers a `Try again` where asking again is actually worth
doing, says plainly that trying again will not help where it will not, and
shows the reference number our support would need — and each of those appears
only when it has something true to say.

**Two things were found by opening the page rather than by any test, which is
the point of this task.** The honest-nothing sentence was sitting at the top of
a large empty box, which reads as a broken panel rather than a reserved one;
that is fixed. And one sector's name — `COMMUNICATION SERVICES` — still paints
across the cluster next to it, even after this morning's repair: the repair's own
check was comparing two measurements in different units, so it passed while the
page was wrong. That one is **measured, written down and handed on** rather than
patched, because the fix is a design decision about where a label goes, and the
same decision governs the labels that run off the edge of a narrow phone screen.

**Nothing a visitor to the site can see has changed.** This graph is not on any
page yet; putting it on the landing page is the next story, and it inherits two
measured constraints from today rather than a guess.
