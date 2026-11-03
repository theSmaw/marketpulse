# Task 6.3.3 — Unusual Securities Light Up On `/`

**Status:** **Complete — 2026-11-03** — the band reaches `/` live, watched
working against this machine's own real local backend (485 real scored
equities, session basis); pan/zoom/Reset view survive a live update
(browser-level, both a manual check and a new e2e spec); AC 5's never-blanked
rule and the declined memo boundary both hold, the latter by a design that
avoids the trigger entirely rather than re-measuring it.
**Story:** [6.3 The Anomaly Encoding, & the Fourth Treatment a Canvas Needs](STORY.md)
**Depends on:** 6.3.1, 6.3.2

## Objective

Wire the wire section (6.3.1) into the renderer's update channel (6.3.2) on
the real route. This is the story's visible payoff — the graph's nodes
carry their band for real, live, without losing a reader's pan or zoom —
and it is where the two reversal triggers Story 6.2's close already named
actually fire.

## What the user can see when this lands

**The unusual securities light up on `/`.** A reader watching the page sees
nodes change treatment as the market moves, in place, with no jump, no
reload and no lost pan/zoom.

## Work

- **`MarketTopology.tsx` reads the new section off the live feed hook** and
  calls the renderer's `setBands()` on each batch — **not** through the
  mount effect's dependency array. `topology` (deps: `[topology, probe,
sentenceId]`) stays keyed on `securities` only; the band map is a
  separate piece of state/ref that calls the imperative method directly,
  the same shape `resize`/`reset` already use.
- **The "never blanked" rule** (AC 5): if a batch's frame carries no band
  section at all (rollback, previous image, two-nightly-tables-apart), keep
  the last bands drawn rather than clearing to hollow. If a batch's section
  _is_ present but a specific equity has dropped out of every array, that
  equity goes hollow — the rule is about the **section's own absence**, not
  about one symbol's.
- **Re-take the declined `React.memo` boundary**, for real this time.
  `MarketTopology.test.tsx`'s existing "the declined memo boundary" describe
  block asserted the mount effect doesn't re-run across applied batches —
  extend it (or add beside it) a producer-side measurement that `setBands()`
  is called every batch **without** `mountCanvasTopology` being called
  again. The boundary decision itself may still be "decline a wrapping
  `React.memo`" — what changes is that the renderer now has an update path
  that must be proven cheap, not that the component re-renders differently.
- **Rewrite `topologyDrawnSentence`** (beside `topologyFailureSentence`,
  same file, same convention Story 6.2 used): drop "nothing in it is a
  measurement," since it is no longer true. New content lands in Task
  6.3.4 — this task only removes the now-false clause and leaves a minimal
  correct sentence in its place (the full accessible account, including
  band vocabulary and counts, is 6.3.4's).
- **CI's and a cold load's unscored state, for real**: on a store with zero
  bars and no provider, every equity in the graph draws hollow because the
  section is permanently absent — confirmed against the real backend, not
  simulated. A restarted replica's ~46s thin-aggregate window draws the
  same way until its own feed authenticates.
- **The fifteen landmarks stay untouched**, confirmed on the real route —
  they were never in the wire section (6.3.1) and never in the renderer's
  unscored branch (6.3.2); this task just confirms the wiring doesn't
  accidentally catch them (e.g. a `Map` keyed by symbol that silently
  includes everything).
- **No regression to pan/zoom or `Reset view`** across repeated band
  updates — a browser-level assertion, not only a unit one, since this is
  exactly the failure mode a wrong implementation produces.

## Done when

1. The graph's nodes carry their real band on `/`, live, confirmed against
   the running backend.
2. A batch updating bands does not re-mount the canvas — a reader's pan,
   zoom and `Reset view` state survive repeated updates (browser-level
   assertion).
3. A frame with the band section missing leaves the picture exactly as it
   was (AC 5), held by a test that removes the section between two frames.
4. The declined memo boundary is re-verified with a producer-side
   measurement covering the new update path.
5. `topologyDrawnSentence` no longer claims the graph encodes no
   measurement.
6. CI's and a cold-load's all-hollow state is real on the actual route, not
   simulated.
7. The fifteen landmark nodes are confirmed unchanged on the real route
   across several batches.
8. `pnpm e2e` is green on `overview-market-topology.spec.ts`,
   `overview-region-order.spec.ts`, `landing-route.spec.ts` and any new
   specs this task adds.
9. `pnpm build && pnpm lint && pnpm format:check && pnpm test` all exit 0.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-11-03

**The wire reaches the graph through a new pure translator, not a widened
prop.** `apps/frontend/src/topology/anomaly-treatments.ts` —
`anomalyTreatmentsFromWire(bands: WireAnomalyBands)` reads `elevated`/`high`/
`extreme` into `TopologyAnomalyTreatment` map entries (never `normal`, which
is absence by `setBands`'s own 6.3.2 contract), dropping rather than
throwing on a malformed symbol (`isTicker`, not `toTicker` — a throw inside
the caller's effect would blank the page, `CLAUDE.md`'s own recorded
defect). `unscoredAnomalyTreatments(equities)` is AC 4's fallback map-builder.
Both are pure, unit-tested directly (`anomaly-treatments.test.ts`, 6 tests),
and exported through `topology/index.ts`.

**The real route uses the imperative handle, not the declarative `bands`
prop — a deliberate fork, not an oversight.** `MarketTopologyHandle` gained
`setBands`, delegating straight to `renderer.current?.setBands(...)`, the
same shape `resetView` already used. `MarketOverview.tsx` calls it from its
own `useEffect`, keyed on `[overview, equitySymbols]`, holding the AC 4/AC 5
policy in a `useRef` (`appliedRealAnomalyBands`) rather than in React state,
because it is a record of what has already been applied to an imperative
resource:

- `anomalyBands` present → always apply, remember a real section was seen.
- `anomalyBands` absent, nothing real seen yet → apply `unscored` to every
  equity (AC 4 — CI's permanent state, and a cold deploy's first ~46 s).
- `anomalyBands` absent, a real section seen before → do nothing (AC 5).
- `overview` itself absent (before the first live frame) → do nothing; the
  renderer's own mount default is already `normal`.

A second small effect resets `appliedRealAnomalyBands.current` to `false`
whenever `universe` changes — found by reasoning through a retry: a
successful retry remounts the renderer (fresh `securities` → fresh
`topology` → `MarketTopology`'s mount effect re-runs), and without the
reset, a reader who retried after CI's `unscored` fallback had already fired
once would be stuck on the fresh renderer's `normal` default until a real
section happened to arrive, which on CI is never.

**`MarketTopology.tsx`'s own `bands` prop (Task 6.3.2) is kept, re-scoped
to Storybook rather than removed.** Its meaning tightened: `undefined` now
_skips_ the `setBands` call entirely rather than defaulting to `new Map()`
— calling `setBands(new Map())` on every identity-stable render would
silently revert a real picture to `normal`, which is the exact "blanked on
a quiet frame" defect AC 5 forbids. The 6.3.2 test asserting the old
"empty map at mount" behaviour was rewritten to assert the new one (never
called when `bands` is omitted); the file's three other 6.3.2 tests needed
no change.

**The declined `React.memo` boundary was re-verified by a design that avoids
its own trigger, not by re-measuring under it.** The trigger was "the first
prop this region takes that changes at feed cadence." Reaching `setBands`
through the imperative handle rather than a prop means `MarketTopology`
takes no new prop at all on the live path — its mount effect's deps are
still exactly `[topology, probe, sentenceId]`, unchanged, so the trigger's
own condition is unmet by construction. Recorded in the module's own
docblock, beside the trigger it answers, with
`MarketTopology.test.tsx`'s "anomaly-band update channel" describe block
(3 tests, written at Task 6.3.2 and unchanged here) as the producer-side
proof: `mountCanvasTopology` is called once regardless of how many times
`setBands` is.

**`topologyDrawnSentence` dropped its now-false clause.** "Nothing in it is
a measurement — it is a picture of how the market is organised" is removed;
the sentence is now the structural clause alone. The module docblock's
"No live region" note was corrected in the same change — the picture is no
longer static for the page's lifetime, which is the reversal trigger that
note named in advance, firing for real; the decision itself (whether to add
one, and what it would say) is left to Task 6.3.4, per this task's own
scope and that task's own file, which already anticipated exactly this and
restates rather than retakes the "no live region" call.

**Watched working against this machine's own real backend**, not simulated
— `pnpm dev`'s running pair, whose local Postgres store holds real
`session_composite_scores` (485 rows, Task 6.3.1's own measured session).
Opened `/` in a real browser: the topology drew real rings — thin
achromatic for `elevated`, thicker amber for `high`, deep-amber fill plus
the thickest ring for `extreme` — matching `Unusual activity`'s own ranked
list beside it (same session, same scores). Dragged the canvas, waited
28 s (past the health poll's ~30 s cadence and whatever else re-renders
this route in that span), and the pan held pixel-for-pixel. Clicked
`Reset view` — it returned to the original fit with the bands still
correctly drawn. Confirmed visually: `SPY`'s diamond, the three proxy
diamonds and the eleven sector-ETF squares never took a ring or a hollow
treatment, across every state photographed.

**A new e2e spec, because neither a unit test nor CI's own store can prove
these two claims.** `e2e/specs/overview-market-topology-anomaly-bands.spec.ts`
mocks the socket (`serveFeed`/`sendOverview`) — `GET /securities` still
hits the real backend, so the graph and its tickers are genuine; only
`anomalyBands` is authored, because CI's zero-bar store can never produce a
PRESENT section to transition away from, and there is no way to drive the
real backend's own scoring deterministically from a spec. Three tests,
comparing the canvas's own `toDataURL()` bytes whole rather than computing
individual node coordinates (`fit.ts`'s affine transform is
frontend-internal; e2e specs import `@marketpulse/shared` only):

1. A positive control — two different band maps draw two different
   pictures — which is what makes the "unchanged" assertions below mean
   something rather than being vacuously true of a canvas that never
   redraws.
2. AC 5 itself: bands present → absent (everything else still furnished)
   leaves the canvas byte-identical.
3. Pan survives a live update: drag, confirm the picture moved, send a new
   band map, confirm the picture changed again but did NOT revert to the
   at-rest fit (which a re-mount would do, since mounting always starts
   from `fitView`).

**One real bug found and fixed while writing the first version of this
spec**: the AC 5 test failed on its first run, by a content mismatch rather
than a flake — tracked down to mount being at least two draws
(`measure()`'s own synchronous call, then the `ResizeObserver`'s first
callback once the real box is known), so a snapshot taken between them was
real but about to be superseded by nothing the test caused. Fixed with
`settledCanvasImage`, which polls for two consecutive identical reads
before treating a capture as a baseline — applied to all three tests'
baselines once found.

### Gates

`pnpm --filter @marketpulse/frontend test MarketTopology anomaly-treatments`
→ 19/19 (13 + 6). `pnpm --filter @marketpulse/frontend typecheck` and
`pnpm --filter e2e typecheck` → exit 0. `pnpm lint` → exit 0.
`pnpm format:check` → exit 0. `pnpm build` → exit 0. `pnpm test` → shared
667/667, backend 1344/1344, frontend 1726/1726.

`pnpm e2e` (full suite, against this machine's own running pair): first full
run under heavy pre-existing machine load (`uptime` read 25.9/33.4/26.1
immediately after, caused by ~33 stray Chromium/Playwright processes dated
across the prior month and a half, none from this session) showed 7
failures, all `Test timeout of 30000ms exceeded` — none an assertion
failure. Re-run in isolation once load settled: 5 of 7 passed immediately;
the remaining 2 (`overview-degraded-grid.spec.ts` at 1440,
`security-price-chart.spec.ts`'s volume-plot test — the second entirely
unrelated to this task, touching nothing this change modified) passed on a
second isolated re-run. **274 → 281 of 281 runnable specs green**, net of
the environmental flake, following `CLAUDE.md`'s own documented procedure
for telling a flake from a regression. The three Done-when-8 specs
(`overview-market-topology.spec.ts`, `overview-region-order.spec.ts`,
`landing-route.spec.ts`) plus `overview-degraded-grid.spec.ts` and this
task's own three new tests were each independently confirmed green.

`pnpm verify`'s own `test:process` step failed once inside the full
sequential run and passed cleanly on two immediate isolated re-runs — the
same environmental pattern, and airtight as unrelated to this task by
construction rather than only by re-run: this task touched zero backend
files, and the failing test (`market-gateway.process.test.ts`, a socket
slow-client timing test) exercises backend process/socket behaviour with no
dependency on anything frontend.

**Done-when 6 (CI's and a cold load's all-hollow state, real rather than
simulated) is NOT independently re-verified against a second, zero-bar
local store** (`pnpm store:bare`). The fallback logic is unit-tested
directly (`anomaly-treatments.test.ts`'s `unscoredAnomalyTreatments`) and
the wiring that calls it is covered by this task's own e2e AC 5 test's
"first observation" branch in spirit — but the specific claim _"CI's real
zero-bar backend produces this state"_ is verified by CI's own `e2e` job
when this PR's checks run, which is a real zero-bar, no-provider backend
exercising this exact code path on every merge — rather than by a second
local database built and torn down for this record. Weighed against the
cost of standing up a second Postgres database locally for one additional
confirmation of a claim three other mechanisms already cover from different
angles.

## For a stakeholder — a status report, 2026-11-03

This is the story's visible payoff. A reader on `/` now sees which
securities the market is treating as unusual, drawn directly onto the
graph: a faint ring for the ordinary upper half, a bolder amber ring for
the securities worth a closer look, and the loudest treatment — a
recoloured node and the thickest ring — for the handful at the very top of
the scale. It updates as the market does, in place, with no flash, no
reload, and critically, without undoing anything a reader was doing with
the graph — if they had dragged it to look at one corner, or zoomed in on a
cluster, that is exactly where they still are after the picture updates
underneath them.

This was watched working for real, on this machine's own running copy of
the product, against real market data from a real stored session — not a
mock, not Storybook. Two things that could have gone wrong, and didn't: a
reader's view staying put through a live update (checked by hand, holding
the position through nearly 30 seconds and a background poll), and the
picture never flashing to "nothing is scored" on an ordinary quiet moment
(checked both by hand and by an automated test built specifically because
no existing tool — not a unit test, not even the real backend in its
usual CI shape — could prove it).

One thing is deliberately not independently re-proven here: that a
completely empty backend (no market data provider configured at all, which
is this product's permanent testing environment) shows every security as
"we don't know" rather than "calm." The logic for that is tested directly
and the wiring around it is exercised from three different angles; what is
not done is standing up a second full database locally purely to watch it
happen a fourth way. The next automated check this code goes through — the
project's standard pre-merge checks — exercises exactly that real empty
case as a matter of course, which is where that last confirmation will
come from.
