# Task 6.7.3 — Per-node facts in the plate: staleness and direction

**Status:** Complete — 2026-11-10, the plate grew from 5 to 7 reserved rows
(98px → 130px) to carry staleness and direction; a real pre-existing
`topologyAnomalySentence` bug (treating one unscored equity as "nothing
scored") found and fixed along the way
**Story:** [6.7 Live Updates, & the Graph That Stays at 60 FPS](STORY.md)
**Depends on:** 6.7.1

## Objective

Open Decision 2 settled on per-node staleness as text in the readout
plate, never as node ink. The Task 6.6.2 hand-off (§10's `Intensity`
encoding) settled on taking signed direction, also in the plate, rather
than a new node-level channel. Both are powered by Task 6.7.1's widened
subscription, which is what lets either reach any selected node rather
than only the ~25–30 a narrower subscription would have covered.

## What the user can see when this lands

Selecting any node now shows, in its plate: when that security was last
heard from (an instant, no threshold, no status word), and — where the
node carries a `high`/`extreme` band — whether its current anomaly is a
rise or a fall, not just a magnitude.

## Work

- **The staleness line.** `observations.get(symbol)?.startsAt` is the raw
  instant; the honest figure is the observation interval's **end**
  (`startsAt + interval`), per Task 3.3.4's own fixed defect and
  `measured-set.ts`'s existing discipline — read from there rather than
  re-deriving. No threshold, no status word, no connection word: an age,
  stated plainly, matching `UniverseTable`'s own `Live price from 12:07`
  idiom.
- **The direction line.** Derive sign from the node's own observation
  (the composite score's own price factor is a magnitude via `Math.abs` —
  confirm the cheapest correct source of sign against the shipped
  composite/band pipeline rather than assuming one). Shown only where the node already
  carries a `high`/`extreme` band — never a new encoding on `normal`/
  `elevated`/`unscored` nodes. §10's `Intensity` is closed in writing: the
  full per-equity encoding refused, the sign taken, both recorded in
  `TOPOLOGY.md`.
- **The region's own accessible sentence states its population.** AC7's
  rewritten form: the sentence already states counts elsewhere
  (`topologyAnomalySentence`); extend it so a third of the graph drawing
  `unscored` is never silently read as "a third of the graph is broken" —
  the same discipline `Market breadth`'s and `Movers`' sentences already
  apply.
- **`pnpm probe` re-check of the plate's own height.** The plate reserves
  five line slots today; two new (conditional) lines may grow it. Measure
  before assuming it's free — this region's own displacement trigger
  (`MARKET-OVERVIEW.md` §1.4) has already fired twice.
- **Selection reaching the route, if needed.** If sourcing per-node facts
  needs the selected symbol outside the renderer, use the existing
  `onSelect` report (the same path `openable` already uses) — a lift of
  the renderer's own fact, never a second selection mechanism. Confirm in
  the record that Story 6.4's hand-off trigger stays unfired either way
  (already evaluated at Gate 1; re-confirm against what's actually built).

## Done when

1. A selected node's plate states its own staleness as an instant, with no
   threshold, status word or connection word.
2. A selected `high`/`extreme` node's plate states its direction (rise or
   fall); other bands show no direction line.
3. §10's `Intensity` encoding is closed with a one-line record in
   `TOPOLOGY.md`, matching Story 6.6's own `shape/icon` closure.
4. The region's accessible sentence states its own heard-from population.
5. `pnpm probe` confirms the plate's own height and the region's one-height
   property, at all four widths, before and after.
6. `pnpm verify` green; new tests cover both lines' presence/absence logic
   at the component level, and the real population figure
   (`breadth.measured`/501 over the 5-minute window) is taken from the
   deployment at least once and recorded.

---

## What was done — 2026-11-10

**The architecture: an imperative push DOWN, never a selection lift UP.**
The Work section's own "if needed" framed the selection-lift question as
open; building it answered no. `MarketOverview.tsx` cannot know which node
is selected without a new channel, but it does not need to: a new
`MarketTopologyHandle.setObservations(observations)` method — reached the
same way `setBands`/`markBurst` already are, called from the route's own
effect — pushes the raw `observations` Map down, and `MarketTopology.tsx`
holds it in a ref and computes per-node facts for whichever node it
_already_ knows is hovered or selected. **ADR 0023's reversal trigger
("the first piece of state two features must agree about that neither
owns") stays unfired**, confirmed against what was actually built rather
than re-asserting Gate 1's evaluation: there is no new shared state
between the route and this component — `observations` is owned entirely by
`MarketOverview.tsx` and pushed, never read back, and the selected
symbol never leaves `MarketTopology.tsx` at all.

**The staleness line.** `topologyReadoutStaleness(observation)` reads the
observation interval's **end** (`startsAt + OBSERVATION_INTERVAL_MS`,
`measured-set.ts`'s own discipline) through `formatSessionTime`, giving
`Heard from 14:02` — empty string for a symbol with no observation at all.
`universe.lastCloses` is threaded through via a second new ref
(`lastCloses`, kept out of both effects' dependency arrays the same way
`liveObservations` is, since both the mount effect and the focus-recovery
effect must not re-run when it changes).

**The direction line, confirmed against the shipped pipeline rather than
assumed.** `changeFromClose(observation, lastClose).percent` through
`directionOf` — the same figure `PriceChange`/`UniverseTable` already
compute, read rather than rebuilt. The composite score's own price factor
was checked and confirmed to be the wrong source: it is `Math.abs`'d by
design (a crash and a spike must score equally unusual), so it structurally
cannot answer _which way_. Shown only for `high`/`extreme`, exactly as Gate
1 decided; `"unchanged"` and an unreadable sign both answer with the empty
string rather than a guessed word.

**§10's `Intensity` closed in `TOPOLOGY.md`**, in the same section Story
6.6 closed `shape/icon` and refused `size` — a dated correction to the
"undecided, hand-off to Story 6.7" sentence that had stood since Story
6.6's own close.

**A real, pre-existing bug found and fixed in `topologyAnomalySentence`
while extending it for AC 7.** The old `nothingScored` check was
`[...treatments.values()].some(treatment => treatment === "unscored")` —
true the moment a SINGLE equity lacks a score, which made the sentence
claim _"Nothing has been scored yet… every one is unscored"_ about a graph
that might be 99% scored. Story 6.3.1's own measured session puts this at
real scale: 11 of 496 equities "too short a baseline" beside 485 real
bands — a state the old check would have mis-described on every one of
this epic's own real sessions. Replaced with a count (`scored`/`unscored`
tallied together), triggering the all-unscored sentence only when
`scored === 0`, and — AC 7's own ask — a new clause naming the unscored
count (`"55 have not been scored yet."`) in the ordinary, mixed case,
omitted when there is nothing to name. Two new tests cover both the fixed
defect and the omission rule; both pre-existing tests for this function
pass unchanged.

**The plate grew, measured rather than assumed free.** `pnpm probe` before
this task: 5 rows, 288×98, **fully claimed** by the existing four fields
(ticker 1 row, name 2, sector 1, band 1) — there was no spare slot, unlike
an earlier assumption corrected during this task's own shaping. Grown to 7
rows, 288×130 — `+32px`, confirmed via `pnpm probe` to be **uniform across
all four widths** (1440/1024/768/390), so the region's one-height property
holds exactly as before, just at a taller fixed figure. The growth is an
absolutely-positioned overlay's own box, not a sibling in the region's
grid — `MARKET-OVERVIEW.md` §1.4's displacement trigger, which asks whether
a region's own box size changed, does **not** fire: `content` stayed
413px tall at every width, confirmed by the same `pnpm probe` run.

**What the growth DID move: `docs/GAPS.md`'s own count of nodes hidden
behind the plate** (Task 6.4.5's entry). Re-measured with the same
pixel-sweep method that entry's own figures came from: **35 at 1440 (was
14), 97 at 1024 (was 46), 104 at 768 (was 64), and 7 at 390 (was 0)** —
every width worse, and 390 crosses from zero to non-zero for the first
time, because the taller card now reaches into the fitted graph's own
bounds at a width that previously cleared it entirely. Corrected in that
entry with both figures and the reason, rather than left to rot.

**Verified end to end on a real browser**, not only through the fake
renderer: a throwaway Playwright spec drove the real app with `serveFeed`,
walked the keyboard to select the hub (SPY), and confirmed the plate's
`staleness` line read `Heard from 14:02` off the connection's own initial
snapshot (before any burst) and updated to `Heard from 14:03` after a real
`bars` frame arrived — proving `setObservations`'s "every change including
the first" design reaches the plate correctly, both for the connection's
baseline and for a live update. Deleted after confirming.

**Done-when 6's deployment figure could not be taken fresh in this
session**, and that is stated rather than guessed around: the local dev
pair has no live provider configured (`GET /market-data` answers
`{"feed":null}`) and this environment has no path to the deployed site's
own live feed. The best available evidence is the figure this repository
already carries and re-measures regularly — `Market breadth`'s own `466 of
the 503 we track` (and 455 of those with a score on 2 of 3 factors,
Story 5.6's own dated measurement) — cited here as the existing record
rather than claimed as a fresh one. **Owner: the next sitting with real
deployment access**, the same condition `LIVE-REHEARSAL.md` already
tracks for this epic's other live-data figures.

### Gates

- `pnpm --filter @marketpulse/frontend typecheck` — clean.
- `pnpm exec eslint` over every touched file, `--max-warnings 0` — clean.
- `pnpm --filter @marketpulse/frontend test` — 103 files, **1,868** tests
  (11 new), all green.
- `pnpm probe / --within "Market topology"` at 1440/1024/768/390 — before:
  288×98, 5 rows; after: 288×130, 7 rows, uniform at every width.
- A throwaway browser spec confirmed the full route-to-renderer wiring
  works against a real `serveFeed` connection and a real keyboard
  selection; deleted after confirming.
- `pnpm verify` — green: build, lint, format, stories, env:check, links,
  invariants, coverage:check, test, test:scripts, test:process.
- `docs/GAPS.md`'s pre-existing "readout plate covers real nodes" entry
  corrected with re-measured figures rather than left stale.

## For a stakeholder — a status report, 2026-11-10

Selecting any security on the market-topology graph now tells you two more
things in its plate: when that security's price was last updated, and —
for the securities already flagged as unusually high or extreme — whether
its move is a rise or a fall rather than just a size. Both reach every one
of the 516 securities on the graph, not only the ~25–30 the page used to
watch closely, because of the subscription widening two tasks ago. Along
the way, a real bug was found and fixed in the graph's own spoken summary:
it had been capable of claiming "nothing has been scored yet" about a
graph that was almost entirely scored, the moment even one security
genuinely lacked a score — which happens routinely. The plate itself grew
a little taller to fit the two new lines, which in turn means it now
covers a few more nodes on the graph behind it than it used to; that
pre-existing, already-tracked trade-off is recorded with its new, real
numbers rather than left describing a card that no longer exists.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
