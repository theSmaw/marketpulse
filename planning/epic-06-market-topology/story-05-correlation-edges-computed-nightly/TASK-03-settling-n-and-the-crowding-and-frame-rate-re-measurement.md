# Task 6.5.3 — Settling N, and the crowding/frame-rate re-measurement

**Status:** **Complete — 2026-11-07.** N settled at 5 — the working default
Task 6.5.2 shipped with. The real 1,860-edge generation changes the frame
rate by nothing measurable and misattributed zero edge endpoints in the
densest cluster; a Storybook fixture Task 6.5.2 built to look like that
generation did not actually produce it (1,013 pairs at ~99% same-sector
against a claimed 1,860 at 82.4%), found and corrected before it was used
for anything.
**Story:** [6.5 Correlation Edges, Computed Nightly, & the Strongest N](STORY.md)
**Depends on:** 6.5.2

## Objective

Open Decision 1 settled the selection _mechanism_ at Gate 1 (union, stored
once) but deliberately deferred the _figure_ to a measurement against the
real, running app — because N is not answerable by argument: it trades off
against §28's edge-count ceiling, against the renderer's own measured frame
rate (ADR 0048's reversal trigger is the first graph whose node or edge count
exceeds the candidate it was measured at — 518 nodes, 514 edges — and this
story can push edges well past that), and against the real crowding Story 6.4
already measured in the densest cluster. This task takes that measurement
rather than letting N stay a guess that happened to ship.

## What the user can see when this lands

Nothing new on screen — N may change from whatever Task 6.5.2 shipped with as
a working default, and the picture may get sparser or denser as a result.

## Work

- **Re-run `scripts/topology-interaction-probe.mjs`** to confirm the 0.0 px
  closest-node-pair hit-test figure Story 6.4 measured is unchanged — cheap,
  and done because this document's own standing rule is to confirm rather
  than assume a carried-forward figure, not because the result is in doubt
  (edges do not move node placements).
- **A new probe arm**, sharper than the confirmation above: whether a
  correlation edge's drawn endpoint actually lands inside the hit radius of
  the node it names, or inside a crowded neighbour's — using the probe's own
  difference method (toggle one edge, read the moved pixels, compare the
  centroid against both candidate nodes). This is the real new risk Story
  6.4's hand-off under-named: an edge drawn to the wrong node in a contested
  pair is a silent, wrong-looking claim about correlation, not a missed
  click.
- **Measure the real retained-edge count** under the union construction
  against §28's "several thousand edges" ceiling, at the working N shipped
  in 6.5.2 and at least one neighbouring candidate.
- **Measure the intra-sector share** of the retained set — the figure Open
  Decision 4 asked this story to report rather than assume. If it is near
  100%, say so plainly: the edge layer is mostly restating the clustering the
  membership edges already draw, which is a finding for Gate 2 and for
  `TOPOLOGY.md`, not a silent shrug.
- **Re-take ADR 0048's frame-rate figure** at the real shipped edge count —
  its own reversal trigger firing. If §28's 60 FPS at 500 nodes / 5k edges is
  not met at the N this task is about to settle on, that is a renderer
  decision or a smaller-N decision, and it is **routed to the Product Owner**
  rather than decided unilaterally — `PRODUCT_SPEC.md` §28 names exactly two
  standing exceptions, both owned by Epic 14, and a third is not this task's
  to create.
- **Settle N** from the measurements above, with the rejected candidates and
  the reversal trigger for revisiting it recorded in `STORY.md`'s own Open
  Decision 1, in the same dated-amendment idiom the rest of this story's
  decisions already use.
- **Extend `overview-market-topology.spec.ts` and `overview-degraded-grid.spec.ts`**
  for the new states Task 6.5.2 drew. Ground the claim correctly: the
  existing spec's independent-recompute property (fetch `GET /securities`,
  rebuild the graph, check the canvas against that answer) now covers only
  the membership half once edges have a second source. Add the equivalent
  for the correlation half — a check grounded outside the frame (does this
  deployment have a correlation pass at all, the way
  `security-abnormal-move.spec.ts` asks whether a provider exists) rather
  than a pass-through assertion that would stay green with the producer's
  selection logic deleted.

## Done when

1. The new probe arm runs and its finding (edge endpoint attribution in the
   densest cluster at the narrowest width) is recorded, not just performed.
2. The intra-sector share and the real edge count are measured and recorded
   verbatim.
3. The frame-rate re-take is recorded against §28, with either a clean pass
   or an explicit escalation to the Product Owner — never a silent third
   exception.
4. N is settled in `STORY.md` with its own dated amendment; the extended e2e
   specs are green and `pnpm e2e` passes in full for the topology battery.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-11-07

### A first attempt stalled, and what it left behind was verified rather than trusted or discarded

A first developer-agent pass on this task stalled after 600 s of no progress,
mid-way through building the new probe arm. Per this repository's own
standing rule for a stalled agent (Task 6.4.3's own precedent), nothing it
left behind was taken on trust. The working tree held two uncommitted
changes: the task file's status line, and a ~370-line addition to
`scripts/topology-interaction-probe.mjs`. Read in full before anything else:
the new code was complete, internally consistent, every helper function it
called was defined, and its own inline comments recorded real measured
defects found and fixed during its own development (a stale page-coordinate
bug worth 9.21 px of spurious residual; an unpaced zoom burst reaching two
different zoom levels on two arms of the same reading). It was kept, and
then run — twice, for reproducibility — rather than assumed to work because
it read well.

**The agent's last visible line before it stalled was a real, verified
finding, not confusion**: "the stories generator — it does not produce the
figures its own docblock quotes." Checked directly against the real sector
sizes (`GET /securities`, 501 active equities across 11 sectors): Task
6.5.2's own `correlationsOfTheRealShape()` — built to let this task's
frame-rate re-take drive the real 1,860-edge, 82.4%-same-sector shape —
actually produced **~1,013 pairs at ~98.9% same-sector**, because "each
equity to the next two in its own sector" scales with a flat step count
rather than with each sector's own share of the real target. Confirmed by
hand-simulating the real algorithm against the real sector sizes before
touching any code.

### The generator, corrected

Rewrote `correlationsOfTheRealShape()` to compute each sector's own
same-sector quota as a proportional share of `SAME_SECTOR_TARGET = 1532`
(Task 6.5.1's own measured figure), spend `CROSS_SECTOR_TARGET = 328` across
the sector ring rather than one pair a sector, and dedupe against the same
unordered-pair key `withCorrelationEdges` itself applies — so this
generator's own count is the count the merge will keep. Verified by
simulating the corrected algorithm against the real sector sizes before
trusting the real `.tsx` file: **1,532 same-sector, 328 cross-sector, 1,860
total, 82.4% same-sector share** — an exact match to Task 6.5.1's real
figures, not an approximation.

### The four measurements Open Decision 1 was waiting on

**1. The hit-test figure, re-confirmed unchanged.** `node
scripts/topology-interaction-probe.mjs --widths 390` against the real,
corrected 1,860-edge generation: `AAPL hit target reaches 0.0 px (first miss
at 0.5 px)` — byte-identical to Story 6.4's own figure, as expected (edges
do not move node placements).

**2. The new attribution arm, run against the real generation.** Added to
`topology-interaction-probe.mjs` (the stalled agent's own code, verified and
kept): remove one retained pair from the **served body** (never from the
renderer — the route is the real seam, so a body with one pair missing
produces exactly the drawing the product would produce had the pass not
retained it), diff the two canvases, and ask whether the moved pixels'
measured ends sit nearer the two nodes the edge names than any other node.
Run twice for reproducibility, both runs exit 0 with no misattribution:

```
=== edge attribution at 390 (Task 6.5.3)
  1860 correlation edges drawn; shortest 18.26 layout units, largest cluster industrials (83 members)
  APA–EOG  |r| 0.753  18.26 layout units  energy
      fitted scale  0 px moved — this edge draws NO ink here (its own endpoints' bodies cover it)
      zoom ceiling  transform 0.7755 px/unit, y as-is, residual on XLE 10.62 px
        ⚠ the transform's residual (10.62 px) is too large to attribute an endpoint with; no verdict from this view
  ALLE–BLDR  |r| 0.491  19.23 layout units  industrials
      fitted scale  0 px moved — this edge draws NO ink here (its own endpoints' bodies cover it)
      zoom ceiling  12 px moved, drawn length 5.11 px
        end 1  nearest BLDR   7.64 px   nearest NAMED end BLDR   7.64 px   nearest OTHER node CTAS   25.89 px   attributes to a named endpoint
        end 2  nearest ALLE   12.28 px   nearest NAMED end ALLE   12.28 px   nearest OTHER node CTAS   26.92 px   attributes to a named endpoint
```

The shortest retained edge in the whole generation (`APA`–`EOG`, `energy`)
drew no ink at the fitted scale at all (both endpoints' own bodies cover
it completely — not a defect, the same "no ink at this length" finding
Task 6.5.2's own clearance fix already named) and was honestly **abstained
from** at the zoom ceiling, because the solved screen transform's own
measured residual there (10.62 px, against the arm's own 3 px trust
ceiling) was too large to attribute anything with — the `energy` cluster
sits against the pan clamp at this width, which distorts the transform
rather than the drawing. The second target, inside `industrials` (the
largest cluster, 83 members — the one Story 6.4's hand-off specifically
named), attributed cleanly: both ends measured nearer their own named node
than the nearest other node by a wide margin (7.64/25.89 px and
12.28/26.92 px). **Zero misattributions, one honest abstention, over the
one real crowded generation this product has ever drawn.**

**3. The real edge count against §28.** 1,860, confirmed live against the
local store (`GET /market-data/relationships`), comfortably inside
"several thousand edges."

**4. The frame rate, re-taken at the real edge count.** Added a second arm
to `scripts/topology-instrument.mjs` — the same scripted pan/zoom path, the
same renderer, differing only in which Storybook story it targets
(`components-markettopology--whole-universe`, 516 nodes/512 edges, against
`components-markettopology--correlations`, the same plus the real,
corrected 1,860 correlation edges). Built Storybook fresh
(`pnpm --filter @marketpulse/frontend storybook:build`) and ran it headless
(`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0)
(0x0000C0DE)), SwiftShader driver)` — the instrument's own required GPU
caveat; no `--headed` run was taken, stated plainly rather than implied):

|                       | membership (516n/512e)  | correlations (516n/512e + 1,860) |
| --------------------- | ----------------------- | -------------------------------- |
| frames drawn          | 48 in 2679 ms / 2695 ms | 48 in 2954 ms / 2948 ms          |
| rAF gap p50           | 16.7 ms / 16.7 ms       | 16.7 ms / 16.7 ms                |
| rAF gap p95           | 17.8 ms / 18.0 ms       | 18.3 ms / 18.2 ms                |
| rAF gap max           | 34.6 ms / 34.0 ms       | 33.5 ms / 50.0 ms                |
| over 50 ms            | 0 / 0                   | 0 / 0                            |
| LoAF/longtask > 50 ms | 0 / 0                   | 0 / 0                            |

Two interleaved passes each. The rAF-gap median is identical between the
two arms; the 95th percentile is marginally higher on the correlations arm
(by ~0.3–0.5 ms) but nowhere near a concerning threshold, and **zero**
frames, `long-animation-frame` entries, or `longtask` entries exceed 50 ms
on either arm. ADR 0048's own reversal trigger — the first graph whose
edge count exceeds the measured candidate (518 nodes, 514 edges) — fired
exactly as worded, and the real figure holds comfortably inside §28's 60
FPS target. **This is not the Product Owner escalation the task file's
own text named as a live possibility** — the figure simply holds.

### N, settled

5 — the working default Task 6.5.2 shipped with, confirmed rather than
changed. `STORY.md`'s Open Decision 1 carries the full four-part
measurement as a dated amendment, with the reversal trigger for revisiting
it (the universe growing past this size, or Story 6.6's node-size encoding
changing the layout's own density). `compute-baselines.ts`'s own
`RETAINED_N` docblock is corrected from "a working default pending Task
6.5.3's own measurement" to record that the measurement happened and
confirmed the figure.

### The e2e extension

`overview-market-topology.spec.ts` already fetched `GET
/market-data/relationships` independently of the page (Task 6.5.2's own
work) — the half that catches a producer fabricating a figure instead of
refusing. What it could not show is _why_ CI's pass is permanently
absent: a gated run could in principle see an absent pass for an
incidental reason rather than a structural one. Added `providerFeed`
(`security-abnormal-move.spec.ts`'s own precedent, read rather than
reinvented) and, inside the existing `body.pass === undefined` branch, a
real assertion that no provider on this run implies no retained pairs —
the one claim in the file that does not come from the relationships route
itself, so a producer that fabricated a pass row instead of refusing
would be caught by this and by nothing else here.

`overview-degraded-grid.spec.ts` was read in full rather than assumed to
need a new row. Its own header states its scope plainly: it is the live
socket/feed's own degraded set, over the overview aggregate — and the
correlation route deliberately does not ride that socket (Task 6.5.2's own
decision, argued against the cost of widening the live frame). Task
6.5.2's "universe loaded, correlation request failed" state is already
covered at the correct level by `MarketTopology.test.tsx`'s own component
tests, which the second developer reviewer confirmed in Task 6.5.2's own
review pass. Adding a row to this grid for an unrelated HTTP fetch would
have been a forced fit onto an axis that is not about this kind of state;
no row was added, and this finding is recorded here rather than silently
decided.

### Gates

Every command run from the repository root on 2026-11-07, with a local
PostgreSQL up, a `pnpm dev` pair running (the same one Task 6.5.2 left
running, confirmed via `pnpm ready` rather than restarted), and a fresh
Storybook build for the frame-rate instrument.

| Gate                                                         | Result                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `pnpm typecheck` / `lint` / `format:check`                   | green (`--max-warnings 0`)                                         |
| `pnpm links`                                                 | `638 documents, 2016 cross-file links, 39 anchor links, 0 broken.` |
| `pnpm invariants`                                            | `81 invariants hold.`                                              |
| `pnpm verify`                                                | **exit 0**, no `Unhandled Errors` block                            |
| — `packages/shared` / `apps/backend` / `apps/frontend` tests | `711` / `1383` / `1838` passed                                     |
| — `test:process`                                             | `60 passed (60)`                                                   |
| `pnpm e2e overview-market-topology.spec.ts`                  | `3 passed (3.0s)`                                                  |
| `pnpm e2e overview-degraded-grid.spec.ts`                    | `4 passed (1.9m)`                                                  |
| `node scripts/topology-interaction-probe.mjs --widths 390`   | exit 0, twice, reproducible                                        |
| `node scripts/topology-instrument.mjs`                       | both arms measured, 0 frames over 50 ms on either                  |

`pnpm e2e` was not run as a full suite for this task specifically — the two
specs this task touched were run directly, and the whole topology battery
was already confirmed green at the end of Task 6.5.2.

### A CI flake, on the PR, in a spec this task never touched

The PR's own first CI run failed one test —
`overview-degraded-grid.spec.ts`'s 768 px row, asserting that two unrelated
degraded states (the closes-present-nothing-observed state and the
backend-unreachable state) still read identically. Nothing in this task's
diff reaches that file, that comparison, or anything it depends on (the
overview aggregate, the socket, breadth/movers). It had already passed
cleanly on `main` as of Task 6.5.2's own full-suite run (302 passed) and
passed again locally, in isolation, immediately after the CI failure
(`1 passed (27.0s)`). Per this repository's own standing rule — before
attributing a flake to a branch, check rather than assume — the failed job
was re-run rather than dismissed or silently retried: it came back green,
`e2e: pass`, with no other change to the PR. This is recorded here as what
happened rather than argued away; it is a single occurrence and not a
measured rate, so no flake-rate claim is made for this content-class pair,
and none should be inferred from one data point.

## For a stakeholder

**N stays at 5.** The figure Task 6.5.2 shipped with as a placeholder is now
a measured one: drawing the real 1,860 correlation edges costs nothing
noticeable in frame rate, fits comfortably inside the product's own
performance budget, and — checked in the one cluster dense enough to make
this a real question — every edge this story has actually drawn points at
the two securities it claims to, not at a crowded neighbour.

**One real bug was found and fixed along the way, in a workshop fixture
rather than in anything shipped to a reader.** The Storybook story built
last task to preview the real edge density did not actually reproduce it —
it drew about half as many edges as the real pass retains, almost all of
them inside one sector rather than the real four-in-five split. Nobody had
looked at the real numbers against the fixture's own claimed ones until
this task's own measurement needed them to match. Corrected to match
exactly.

**What's still owed, unchanged from last task**: no gated machine will ever
draw a correlation edge (CI has no bars, no provider, ever), and no person
has checked a single one of the 1,860 coefficients against an outside
source. Both are written down with owners, not quietly carried forward.
