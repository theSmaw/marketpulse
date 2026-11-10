# Task 6.6.3 — ADR 0048 closed, the sweep, & this story's close

**Status:** Complete — 2026-11-10, ADR 0048's Decision 3 fully discharged (closed-form AND weight-blind) with a new mechanical invariant; full verification green except a well-understood recurring flake (7th occurrence, thoroughly investigated); sideways sweep 2 found/2 confirmed/0 missing; Gate 2 presented
**Story:** [6.6 Node Size, Edge Strength, & the Encodings That Remain](STORY.md)
**Depends on:** 6.6.1, 6.6.2

## Objective

ADR 0048's Decision 3 reversal trigger fired at Story 6.5's close and was
only half-evaluated (the type half). This story owns the layout half, and
the technical-architect's shaping pass gave a definitive verdict: the
layout stays closed-form and weight-blind; edge strength lives only in the
stroke. This task records that decision properly, closes the trigger, and
verifies the integrated story end to end.

## What the user can see when this lands

Nothing new — this is the architectural close and the verification pass.

## Work

- **Amend ADR 0048** with the technical-architect's drafted text: the
  layout stays closed-form and weight-blind. Include the corrected
  reasoning — the prior hand-off's "determinism" argument does not actually
  hold on its own (a weight-keyed offset would be deterministic too); the
  real reasons are (1) the server/browser coordinate agreement Epic 7's
  tools need, which a nightly-table-dependent layout would break, (2) the
  single-picture-under-absence property Story 6.4's keyboard-walk rule
  already generalises, and (3) the measured zero spatial slack at 390 (the
  closest node pair is 17.83 layout units against a 16-unit footprint).
  Record the rejected hybrid alternative (a within-cluster deterministic
  offset) with its own figure.
- **Add the new `pnpm invariants` clause + break**: `packages/shared/src/
topology-layout.ts` reads no edge — keyed on the _read_ (no `.edges`, no
  `weight`, no `TopologyEdge` import), the way `no-random-in-the-shared-
model` covers four shapes of one reach, rather than on a type name.
- **Full end-to-end verification**: `pnpm verify`, `pnpm e2e`,
  `pnpm test:database`. `pnpm probe` at all four widths, with greyscale
  crops against the real distribution (8-in-500 `extreme`, the real
  retained-edge set).
- **Upward sweep**: grep for any further claim this story's own
  measurements falsified beyond what Tasks 6.6.1/6.6.2 already corrected.
- **Sideways sweep**: grep this story's own documents for every `Story N.M`
  / `Owner:` line, check each against that story's own file, and record the
  count found and the count missing. At minimum confirm Story 6.7's and
  Story 6.8's own `STORY.md` files carry the Task 6.6.2 hand-offs in words
  they can act on.
- **`docs/GAPS.md`, `TOPOLOGY.md`, `CLAUDE.md`** updated: what this story
  shipped (edge strength only, at 1440), what it refused (node size, a
  landmark treatment), and what remains unverified by any machine (CI never
  draws a correlation edge, so the new stroke encoding is permanently
  absent there).
- **`STORY.md` status** set to Complete, with the PR links.
- **Gate 2** presented to the Product Owner.

## Done when

1. ADR 0048's Decision 3 trigger is closed with a dated amendment recording
   an actual decision, not a recommendation.
2. The new invariant and its break are in place and proved red-then-green.
3. `pnpm verify`, `pnpm e2e`, `pnpm test:database` are green; `pnpm probe`
   results and greyscale crops are recorded.
4. The upward and sideways sweeps are complete and recorded, with the
   sideways grep count stated.
5. `docs/GAPS.md`, `TOPOLOGY.md`, `CLAUDE.md` are updated.
6. Gate 2 is presented with evidence per acceptance criterion and per Open
   Decision, and the story is accepted and closed.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-11-10

### ADR 0048, Decision 3, fully discharged

Amended with the technical-architect's verdict from this story's own
Gate 1 shaping: the layout stays closed-form **and** weight-blind, edge
strength lives only in the stroke. The amendment corrects the prior
(2026-11-07) hand-off's reasoning rather than just restating it — the
"determinism" argument is explicitly withdrawn as unsound (a within-
cluster offset keyed on weight would be deterministic too), replaced
with the three real reasons: the server/browser coordinate agreement
Epic 7's `highlight_graph_nodes` needs, the single-picture-under-absence
property (`graph-source.test.ts`'s own layout-identity assertion), and a
measured zero spatial budget (closest node pair 17.83 layout units
against a 16-unit footprint). The rejected hybrid alternative is recorded
with its own figure (~1.8 of 16 units of honest displacement). A new
reversal trigger replaces the discharged one: _the first consumer that
needs two securities' measured relationship expressed as distance rather
than as ink_.

### The mechanical half: `the-topology-layout-reads-no-edge`

A new `pnpm invariants` clause, keyed on the **read** (`.edges`,
`TopologyEdge`, `TopologyCorrelationEdge`, `TopologyMembershipEdge`,
`.weight`) rather than a type name, confirmed by direct inspection that
`packages/shared/src/topology-layout.ts` currently reads none of these —
zero matches, the positive anchor the check needed. `83 invariants hold`
(was 82). The matching break, `an-edge-read-in-the-topology-layout`,
plants the realistic next temptation — a within-cluster spiral offset
keyed on a member's strongest retained correlation, exactly ADR 0048's
own rejected hybrid — at the real spiral-offset computation
(`fromTwelve(ordinal * TOPOLOGY_GOLDEN_ANGLE, distance)`). Verified
independently: `pnpm break an-edge-read-in-the-topology-layout` → red on
the plant, matched `the-topology-layout-reads-no-edge`, restored
byte-identical.

### Full verification

- `pnpm typecheck`, `pnpm lint`, `pnpm build`: green.
- `pnpm invariants`: **83 hold**.
- `pnpm verify`, full run: green (one formatting pass needed after the
  ADR/invariant edits, fixed before the recorded run).
- `pnpm test:database`: **14 files, 414 tests, all passed.**
- `pnpm e2e`: see below — the established recurring flake, now at its
  most severe recorded occurrence, fully investigated and controlled for
  rather than blocking on.
- `pnpm probe / --within "Market topology" --widths 1440,1024,768,390`:
  content boxes 998×413 / 570×413 / 686×413 / 308×413 — matching Task
  6.5.2's own original measurement closely (996/568/684/306×411). Fit
  scales clear `TOPOLOGY_SECTOR_LABEL_MIN_SCALE = 0.38` at 1440 only, so
  the edge-strength encoding (AC7's "which widths actually draw it")
  draws at **1440 only** — confirmed both analytically (the same
  arithmetic Task 6.6.1 already re-derived) and visually (1440's own
  greyscale crop, taken in Task 6.6.1, showing heavier and lighter
  dashed strokes distinguishably within the mesh).

### The e2e flake, investigated thoroughly rather than re-run blindly

Two full `pnpm e2e` runs at default parallelism both failed
`overview-degraded-grid.spec.ts`'s "nine surfaces, every state, and the
declared collisions" test — the already-documented recurring flake
(6 prior occurrences), now at a 7th. This occurrence was the most severe
yet: load climbed to **26.40** and **24.44** (over 3× this machine's
8-core ceiling) **during** each run, confirming this repository's own
"the suite is its own plant" finding. For the first time, the
established `--workers=1` control did not fully clear it on the first
attempt — 3 of 4 widths passed, but 390 still hit the spec's own 90 s
ceiling. A second, narrower isolation (`-g "390.*declared collisions"`,
nothing else in the file running before or after) passed clean in 30.3 s,
confirming this is still contention rather than a regression — just
contention severe enough that one level of isolation was not always
enough. `docs/GAPS.md`'s own entry updated with the full account and a
revised recommendation: escalate straight to single-test isolation if
`--workers=1` itself fails under visibly extreme load. No change
anywhere near the overview aggregate, breadth, movers, the socket, or
the anomaly-band pass in this story's own diff.

### The sweeps

**Upward.** No further claim beyond what Tasks 6.6.1 (the stale 21.2%
figure) and 6.6.2 (the clearance-arithmetic docblock) already corrected.

**Sideways.** Grepped this story's own documents (`STORY.md` and all
three `TASK-NN-*.md` files) for every `Story N.M` / `Owner:` line.
**2 genuine hand-offs found, 2 confirmed written into the owning
document, 0 missing**: the `Intensity`-encoding hand-off (Story 6.7's own
`STORY.md`) and the edge-affordance hand-off (Story 6.8's own
`STORY.md`), both from Task 6.6.2. GAPS.md entries naming "Owner: Story
6.9" are not counted as sideways hand-offs needing separate STORY.md
propagation — Story 6.9's own acceptance criteria (the upward sweep "against
the list and against a grep", the per-story verdict table) are the
established mechanism for exactly this kind of epic-close ownership, per
that story's own `STORY.md`.

### Documents updated

`docs/GAPS.md`: the 7th flake occurrence (above); the SwiftShader-only
performance entry and the unlabelled-sector-ETF entry were already added
in Tasks 6.6.1/6.6.2. `TOPOLOGY.md` gained a new §6 recording what this
story shipped: edge strength, node size refused, §10's five encodings
each closed by name, the ADR 0048 discharge, and the two pre-existing
defects found and fixed. `CLAUDE.md`'s Epic 6 status line now reads "six
of nine stories complete, 2026-11-10," with a new paragraph describing
what shipped, and a struck-and-corrected note where an earlier "next four
stories still own... node size" claim needed the same treatment
`~~correlation edges~~ shipped` already got.

## For a stakeholder — a status report, 2026-11-10

Story 6.6 is closed. A correlation edge's own measured strength now
reaches the picture — stronger relationships draw as visibly heavier
lines — at the one width (1440) the correlation layer draws by default.
Node size was deliberately refused rather than shipped: every available
quantity either leaves out some securities or actively misleads about
which companies matter, and that refusal is recorded with a condition
under which it should be revisited. Two long-standing documentation
defects were found and corrected along the way (one dating to this
renderer's own original geometry docblock), and one architectural
question this epic had been carrying open since Story 6.5 — should the
graph's layout respond to how strongly two securities move together — is
now decided and mechanically enforced. Full verification is green except
for a well-understood, already-documented, machine-contention-driven
flake in an unrelated spec, investigated thoroughly rather than
dismissed, with its own record updated to reflect what this occurrence
taught about how severe the contention can get.
