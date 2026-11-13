# Task 6.9.4 — Full verification, the exit criterion verdicted, and the close

**Status:** Complete — 2026-11-13, accepted at Gate 2. Verification green,
exit criterion verdicted, `TOPOLOGY.md` §10.6 settled per the recommendation
below, Story 6.9 and Epic 6 both closed.
**Story:** [6.9 The Rehearsal, the Sweep, & Epic 6's Close](STORY.md)
**Depends on:** 6.9.1, 6.9.2, 6.9.3

## Objective

A collection of completed tasks is not automatically a completed story, and
a collection of completed stories is not automatically a completed epic.
This task runs every gate once on the final tree, resolves the one question
`TOPOLOGY.md` §10.6 explicitly deferred to this story's own Gate 2, verdicts
Epic 6's own exit criterion, and performs both closes — this story's, and the
epic's.

## What the user can see when this lands

Nothing new — the verification and the close.

## Work

- **Full verification, once on the final tree**: `pnpm verify`, `pnpm
test:database`, `pnpm e2e`, with `uptime` read **before** each run (never
  during — this repository's own standing finding that a full suite is its
  own plant). Report the real numbers, not an adjective.
- **Resolve the carried-over Gate-2 question**: `TOPOLOGY.md` §10.6 found
  that the sector/band filter controls and `Reset view` stay present and
  inert over a degraded topology that has no graph to filter, and
  deliberately left whether that reads as consistent or as broken for this
  story's own Gate 2 rather than deciding it as a check. Present it to the
  Product Owner as part of Gate 2 below, with a recommendation.
- **Epic 6's own exit criterion verdicted**: "The tracked universe can be
  explored smoothly as an interactive graph, and unusual securities are
  visually obvious." _Smoothly_ has a number (§28's 60 FPS, Story 6.7's
  real figure, cited from Task 6.9.3's own table) and is met. _Visually
  obvious_ has no instrument and is a person's judgement — the thing the
  waived rehearsal row would have answered; state plainly that this half
  is **owed rather than met**, per the waiver Task 6.9.3 wrote.
- **`STORY.md`** status set to Complete, with the four tasks' PR links.
- **Epic 6's own `EPIC.md`** status set to Complete, citing the exit
  criterion's own verdict (met / owed, by half) and pointing to
  `TOPOLOGY.md` as the maintained account rather than restating its
  figures.
- **Gate 2** presented to the Product Owner — this story's own, **and**
  Epic 6's own close, together, since this is the epic's last story.

## Done when

1. `pnpm verify`, `pnpm test:database`, `pnpm e2e` are green, run once on
   the final tree, with load read before each.
2. The filter-controls-over-a-degraded-topology question is put to the
   Product Owner with a recommendation, and resolved.
3. Epic 6's exit criterion is verdicted in writing, both halves, with the
   waived half stated as owed rather than quietly marked met.
4. `STORY.md` and `EPIC.md` are both set to Complete.
5. Gate 2 is presented covering both this story's own acceptance criteria
   and Epic 6's own exit criterion, and both are accepted and closed.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-11-13

### Full verification, once on the final tree

`uptime` read before each run, never during, per this repository's own
standing finding that a full suite is its own plant.

**`pnpm verify`** (load 3.55/3.09/4.18 before) — green: **86 invariants
hold**, 653 documents/2,034 cross-file links/0 broken, `packages/shared`
711 tests, `apps/backend` 1,388 tests, `apps/frontend` 1,956 tests, 21
script tests, `apps/backend` process suite 60 tests, all passed.

**`pnpm test:database`** (load 6.15/4.93/4.74 before) — green: 14 files,
414 tests, against a real PostgreSQL server.

**`pnpm e2e`** (load 5.20/4.85/4.72 before) — **318 passed, 16 skipped, 9
failed** on the first full run, which took 12.3 minutes and left the
machine at load 23.37/28.29/20.92 immediately after — the suite being its
own plant, measured rather than assumed. The 9 failures spanned
`overview-degraded-grid.spec.ts` (all four widths — this repository's own
documented long-running, load-sensitive spec, already carrying a
"failed across a seventh session" `docs/GAPS.md` entry), `overview-held-
outage.spec.ts`, `overview-market-topology-burst-absorption.spec.ts`,
`overview-market-topology-degraded.spec.ts`, `security-gap-fill.spec.ts`
and `security-holiday-week.spec.ts`. **Re-run after load settled back to
this session's own baseline (4.11/16.63/17.42), targeting exactly these
six spec files at `--workers=1`**: **29 of 29 passed clean, zero
failures**, in 3.7 minutes. Confirmed machine contention rather than a
regression, per this repository's own established control (re-run at
reduced parallelism after load settles) — not re-litigated with a full
second full-suite run, since the targeted re-run is the documented,
sufficient control and a second 12-minute run would only re-contend the
machine.

### `TOPOLOGY.md` §10.6 — resolved at Gate 2

Put to the Product Owner with a recommendation (see Gate 2 below):
**consistent rather than broken**, for the same reason `Reset view` was
never hidden under failure in the first place — a control that comes and
goes under a reader is worse than one that is briefly inert, and neither
`Sector` nor `Band` is disabled or hidden in any state, which is uniform
with how every other control on this surface already behaves. No code
change recommended.

### Epic 6's exit criterion, verdicted

"The tracked universe can be explored smoothly as an interactive graph,
and unusual securities are visually obvious."

- **_Smoothly_ — Met.** §28's 60 FPS line, against Story 6.7's real
  figure: 16.7 ms median frame time on every arm, both the
  software-rendered regression floor and a real Apple M3 GPU, against the
  real shipped graph (516 nodes, ~2,372 edges). Not §28's own 500/5,000
  node/edge count, but the real scale this product runs — cited from Task
  6.9.3's own verdict table and Task 6.9.1's `PRODUCT_SPEC.md` amendment.
- **_Visually obvious_ — Owed rather than met.** No instrument exists for
  this half; only a person watching the graph against a real session could
  answer it, and that sitting is the one Task 6.9.3 recorded as a dated,
  owned waiver (`LIVE-REHEARSAL.md` row 6.7, `**WAIVED 2026-11-13**`)
  rather than quietly marking this half met. The waiver names all seven
  things that sitting would check, including — but not limited to —
  whether unusual securities are findable without hunting.

Written into `EPIC.md`'s own exit-criteria section and status line, both
halves stated separately rather than rounded into one verdict.

### `STORY.md` and `EPIC.md`

Both set to Complete, in the same change this record was written in,
following the Product Owner's acceptance at Gate 2. `STORY.md`'s four task
PRs: 6.9.1 — [#683](https://github.com/theSmaw/marketpulse/pull/683),
6.9.2 — [#684](https://github.com/theSmaw/marketpulse/pull/684),
6.9.3 — [#685](https://github.com/theSmaw/marketpulse/pull/685), 6.9.4 —
this task's own.

### Gates

Summarised above; the real numbers are the record — `pnpm verify` 86
invariants hold, `pnpm test:database` 414/414, `pnpm e2e` 318+29/327 across
two runs with the 9 contention-caused failures cleared on isolated re-run.

## For a stakeholder — a status report, 2026-11-13

This task ran every verification gate once on the tree Epic 6 leaves
behind, with one honest complication: the first full `pnpm e2e` run failed
9 specs, and the machine's own load after that run (23+, against a 3–6
baseline all session) confirmed the suite had contended itself exactly as
this repository's own standing finding predicts. Re-running only the
affected specs after load settled cleared all 29 tests with zero failures,
which is the established control for telling a flake from a regression —
not re-running the whole suite a second time, which would only risk
re-producing the same contention.

Epic 6's own exit criterion is verdicted in two honest halves rather than
one rounded verdict: the performance half has a real number and meets it;
the "visually obvious" half has no instrument, and rather than claim it by
default, this epic's own Story 6.9 recorded a dated, Product-Owner-owned
waiver naming exactly what a future sitting would need to check. The one
open design question this epic carried into its own close — whether three
controls staying visible but inert over a failed graph reads as consistent
or as broken — is answered below with a recommendation, for the Product
Owner's acceptance alongside the story's and the epic's own close.
