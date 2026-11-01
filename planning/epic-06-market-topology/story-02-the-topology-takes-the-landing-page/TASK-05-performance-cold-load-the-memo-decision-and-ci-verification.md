# Task 6.2.5 — Performance: Cold Load, the Memo Decision, & CI Verification

**Status:** **Complete — 2026-11-01.** The memo boundary is declined with a
reversal trigger, held by a producer-side `mountCanvasTopology`-call-count
assertion; `/`'s cold load is re-measured for real on today's tree — **0 of
10 loads over 50ms on either long-frame channel, worst rAF gap 18.6–18.7ms**
(against a 24.7/34.7 baseline), DOM nodes **565** (against 447, the markup
Story 6.2 added) — no Product Owner escalation needed; the
frame-rate-under-interaction claim stays a stated Storybook bound,
documented in `TOPOLOGY.md` rather than invented for the route; and three
new CI-capable browser assertions exist on a route no earlier region could
verify for real.
**Story:** [6.2 The Topology Takes the Landing Page](STORY.md)
**Depends on:** 6.2.1, 6.2.3, 6.2.4

## Objective

This story's AC 8 and AC 9 both need real measurement, not an activity that
cannot fail. This task also exploits something new: `buildTopologyGraph`
needs only `GET /securities`, which CI's gated runner actually has (516
securities, zero bars) — the first region on `/` whose real content a gated
machine can verify rather than permanently render `empty`.

## What the user can see when this lands

**Nothing new.** This task measures and proves what the previous four
already built.

## Work

- **AC 8, the memo decision — record it, don't just decide it.** `STORY.md`'s
  own technical finding is precise: the mount effect's deps (`[securities,
probe]`) are stable across every live-feed batch, so the canvas does not
  re-mount and a host re-render touches nothing the renderer owns. **Decline
  a `React.memo` boundary** and write the reversal trigger into the
  component's own docblock: _the first prop this region takes that changes at
  feed cadence_. Hold the claim with a **producer-side** test: drive several
  applied batches through the shipped socket path against a mounted
  `MarketTopology`, assert `framesDrawn()` is unchanged — this is the "prove
  it on the producer, the wire cannot see it" shape, not a render-count
  assertion.
- **AC 9, split into two measurements:**
  - **Cold load**, for real, via `overview-instrument.mjs`'s `pageInstrument()`
    against the built pair (not `topology-instrument.mjs`, which has no route
    arm at all — it serves Storybook's own static build). Three channels
    (`longtask`, `long-animation-frame`, rAF-gap), each proved by its own
    plant, `assertProductionBuild`, `visibilityState` checked first, machine
    load read before the run. Compare against the 447-node / 24.7ms p50 /
    34.7ms p95 baseline. Note `devicePixelRatio` beside every figure — the
    canvas's backing-store cost scales with it, and a DPR-1 CI runner and a
    DPR-2 laptop are not measuring the same thing.
  - **Frame rate under interaction** stays a **Storybook-measured, stated
    bound** (ADR 0048's own figures), because `probe` has no entry point on
    the real route today (it is wired only in `MarketTopology.stories.tsx`).
    Do not invent a route-level entry point for this task; state the
    limitation in `TOPOLOGY.md` instead.
  - If the cold-load figure crosses §28's 50ms, **stop and report to the
    Product Owner before closing this task** — the decision to ship anyway
    with the figure handed to Epic 14 is theirs, per this story's own Gate 1
    decision record, not a default outcome of taking the measurement.
- **New browser-level assertions, exploiting CI's real capability:**
  - A `&lt;canvas&gt;` exists in the region with non-zero `width`/`height`
    attributes, derived from the box × `devicePixelRatio` (never a constant).
  - The renderer's refusal sentence is **absent** — a real negative no other
    `/` region can assert, because every other region's browser-level
    verification is permanently blind on CI's zero-bar store.
  - **Out-of-frame grounding**: the drawn node census agrees with `GET
/securities`' own active-security count — not inferred from the frame,
    independently recomputed, per this repository's own rule that a
    frame-derived assertion is green against a lying producer and only an
    independent recompute catches it.
- **Confirm the existing suite stays green**: `overview-region-order.spec.ts`,
  `landing-route.spec.ts`, `overview-no-element-per-security.spec.ts`,
  `expectEveryRegionIsATabStop`.

## Done when

1. The memo boundary is declined, recorded with a reversal trigger in the
   component's own docblock, and held by a producer-side `framesDrawn()`
   assertion across several applied batches.
2. The route's cold load is measured for real on three proved channels,
   against the 447-node baseline, with the verdict (pass, or handed to Epic
   14 with figures) stated plainly — and if over budget, reported to the
   Product Owner before this task closes.
3. The frame-rate-under-interaction claim is documented as a Storybook-bound
   limitation in `TOPOLOGY.md`, not invented for the route.
4. New CI-capable browser assertions exist: canvas dimensions from the real
   box, refusal sentence absent, drawn census independently verified against
   `GET /securities`.
5. `pnpm e2e` is green on every touched and newly-added spec.
6. `pnpm build && pnpm lint && pnpm format:check` all exit 0.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-11-01

### AC 8 — the memo boundary declined, and held

`MarketTopology.tsx`'s module docblock gained a dated section tracing the
claim precisely: the mount effect's deps are `[topology, probe, sentenceId]`;
`topology` is `topologySource(securities)`, memoised on `securities`' own
array identity, which `use-securities.ts` changes only on a settled response
or a retry — never on a live-feed batch; `probe` is `undefined` at every call
site; the canvas has no continuous render loop (it redraws only from
`invalidate()`, reached by resize, drag or wheel). A `React.memo` boundary
here would buy nothing. **Reversal trigger, a condition**: the first prop
this region takes that changes at feed cadence (Story 6.3's anomaly band or
Story 6.6's liquidity-driven size are the likely source).

Held by a new producer-side test in `MarketTopology.test.tsx`
(`the declined memo boundary` describe block): `mountCanvasTopology` is
mocked (jsdom has no 2d context, so the real one always throws there —
`topologyPalette()` throws first in this test environment too, since
`getTokens()` reads no applied stylesheet, so it is mocked alongside it), a
`MarketTopology` is mounted once with a `universe` held by identity, then
re-rendered **five times** with that same reference — simulating `/`'s
6.8–16.1 batches a minute, which change nothing this component reads.
`mountCanvasTopology` is asserted called **exactly once** across all six
renders, its returned renderer's `destroy` spy is asserted never called, and
its `framesDrawn()` is asserted unchanged — the producer, not a render count,
per this repository's own "the wire cannot see a defect in the producer"
rule.

### AC 9 — the cold load, re-measured for real

A throwaway instrument (`scripts/zz-topology-cold-load.mjs`, run and
deleted) reused `overview-instrument.mjs`'s own `startProductionPair` /
`openInstrumentedPage` / `waitForObserverProof` / `drain` — the exact
method and the exact store Task 4.8.6 took the 447/24.7/34.7 baseline
against: a production build (`vite build` + `dist/index.js`),
`provider=none` (no live writer), `DATABASE_NAME=marketpulse` (518
securities, real bars — confirmed via `GET /diagnostics/freshness` before
the run: 516 active securities, bars through 2026-09-11), viewport
1440×900, 10 cold loads of `/`, each page's self-test proved before its
4,000ms acceptance window opened (the self-test's own planted 120ms block
runs inside a real `requestAnimationFrame` callback and contaminates the
continuous rAF-gap recorder if the window starts before it closes — found
by a first draft of the instrument reading 117–143ms "worst gaps" on every
single load, tightly clustered around exactly the planted figure, and
corrected by draining the self-test window separately before the
measurement window opens).

**Result, n = 10, all channels proved (`observerProved: true` on every
load):**

```
DOM nodes: [565,565,565,565,565,565,565,565,565,565]
LoAF frames over 50ms, per load: [0,0,0,0,0,0,0,0,0,0] (0 of 10)
longtask over 50ms, per load:    [0,0,0,0,0,0,0,0,0,0] (0 of 10)
worst rAF gap per load (ms): [18.7,18.7,18.7,18.6,18.7,18.6,18.6,18.6,18.6,18.7]
worst-rAF-gap distribution: {"n":10,"p50":18.7,"p95":18.7,"max":18.7,"min":18.6}
```

Load average 2.23 (ratio 0.279) before the run, 2.88 (ratio 0.360) after —
well under the harness's 1.00 ceiling throughout.

**`/` is not in breach, and the comparison is favourable rather than merely
clean**: worst rAF gap **18.6–18.7ms** against the 2026-10-09 baseline's
**24.7 (p50) / 34.7 (p95)**, 0 of 10 loads over 50ms on both long-frame
channels against the baseline's 1 of 10 LoAF frames at 50.9ms. DOM nodes
rose **447 → 565** (+118), which is the `Reset view` button, its icon and
label spans, the canvas itself, and the visually-hidden drawn-sentence
paragraph Story 6.2 added — markup growth with no timing cost attached to
it, confirmed by the same measurement finding nothing over the line. **No
Product Owner escalation was needed**, per the task's own decision gate.

Per CLAUDE.md's own rule for a throwaway instrument's findings — quote at
least one frame, body or row verbatim — the summary block above is the
script's own unedited output.

### AC 9 — frame-rate-under-interaction, documented rather than invented

`TOPOLOGY.md` §4 gained a dated 2026-11-01 bullet recording that the
interaction claim stays a Storybook-measured, stated bound (ADR 0048's own
figures): `pnpm probe`'s scripted pan/zoom path has no entry point on `/` at
all today, and building one was out of this task's own scope — owned by the
next story that changes what the renderer draws under interaction (Story
6.3's anomaly band or Story 6.4's hover/selection), at which point the ADR
0048 figures are being re-argued anyway.

### New CI-capable browser assertions

A new spec, `e2e/specs/overview-market-topology.spec.ts` — the first
browser-level verification on `/` that compares a real, independently
recomputed answer against what actually drew, because the topology is a
function of the universe REQUEST rather than of the overview aggregate and
`GET /securities` succeeds on every store that exists, bars or none (CI's
516-security, zero-bar store included). It:

1. Fetches `GET /securities` directly (never through the page), filters
   `status === "active"`, and calls the **same shipped, pure**
   `buildTopologyGraph` the application calls — an independent recompute,
   never a frame-derived assertion, per `overview-breadth-counts.spec.ts`'s
   own established pattern and the lesson behind it (four overview specs
   once passed against a server with its ranking deleted, each furnishing
   the frame it then checked).
2. Asserts the renderer's refusal sentence is **absent** — a real negative
   no other `/` region's browser-level verification can assert on CI's
   zero-bar store.
3. Asserts the canvas's `width`/`height` attributes are non-zero and equal
   to `Math.round(containerBox × devicePixelRatio)` — the real relationship,
   not only the sign, polled rather than read once (the `ResizeObserver`
   that keeps the bitmap in step fires a tick after the layout it reacts
   to). Found and fixed one off-by-the-border bug while writing it: the
   canvas's OWN bounding box sits 2px inside its parent `.frame`'s (a 1px
   border on every side), so the box to compare against is the canvas's
   **container**, not the canvas itself — `measure()`'s own read.
4. Asserts the drawn graph's hidden text-equivalent states the
   independently recomputed sector count (`graph.clusters.length`), never
   the count read off the page's own sentence.

### Confirming the existing suite

`overview-region-order.spec.ts`, `landing-route.spec.ts`,
`overview-no-element-per-security.spec.ts` (Done-when #5 of this task plus
#6 of Task 6.2.4), `overview-degraded-grid.spec.ts`,
`overview-source-note.spec.ts`, `overview-sector-order.spec.ts`,
`securities-route.spec.ts`, `overview-movers-hold.spec.ts`,
`overview-sector-region.spec.ts`, `security-explorer-shell.spec.ts` and the
new `overview-market-topology.spec.ts` — **55 tests, all green**
(`expectEveryRegionIsATabStop` runs inside `overview-region-order.spec.ts`
and `securities-route.spec.ts`, both passing).

### Gates

- `pnpm build` — passed.
- `pnpm lint` — clean, 0 warnings.
- `pnpm format:check` — clean.
- `pnpm test` — 659 (shared) + 1344 (backend) + 1717 (frontend), all green
  (frontend rose by 1 — the new memo-boundary test).
- `pnpm invariants` — 80/80 hold.
- `pnpm links` — 0 broken.
- `pnpm stories` — 45/45.
- `pnpm e2e` across the eleven specs named above — **55 passed**.

## For a stakeholder — a status report, 2026-11-01

This task didn't add anything a reader can see — it proved two things the
previous four tasks built were actually fine, and it wrote two decisions
down.

First: does re-rendering the landing page every few seconds (as the live
feed does) waste work redrawing the market map underneath everything else?
No — traced and proven: the map only redraws when something about the
underlying data actually changes, which a live price tick never does for
this region, so no special optimisation was needed and the reasoning is now
written down with a condition for when to revisit it.

Second, and more important: did adding the market map to the landing page
slow the page down? Measured properly, with a production build and the real
database, exactly the way an earlier story measured this page's speed
before: **no.** The page is still comfortably under the 50-millisecond
budget on every one of ten test loads, and by one measure (the worst
stutter between frames) it's actually a touch better than the earlier
reading, not worse. The page did get a bit more markup — a few dozen extra
elements for the "Reset view" button and the accessibility text — but that
cost nothing in time.

One thing was deliberately left as a documented limitation rather than
built: there's no way yet to test how smoothly the map pans and zooms once
it's actually on the real page (only in the design workshop). That's
correctly scoped to a later story that will need to build a proper
interaction-testing harness anyway when it changes what the map does
during a drag or hover.

Finally, this task added a genuinely new kind of automated check: because
the market map only needs the list of tracked securities (not live prices),
it's the first part of this page that our automated testing robot can
verify for real, with real data, every single time — checking that the map
actually drew something, drew the right number of groups, and sized itself
correctly. Every other part of this page can only be tested with placeholder
data in automated testing.
