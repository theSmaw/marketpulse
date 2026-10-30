# Task 6.1.4 — The Sweeps, & This Story's Close

**Status:** **Complete — 2026-10-30.** `pnpm verify` green (80 invariants,
655/1344/1705 tests), four `docs/GAPS.md` entries written, four sideways
recipients found missing the hand-off and given it, `TOPOLOGY.md` written and
linked, and Story 6.1 itself closed.
**Story:** [6.1 The Decisions, the Renderer Measured, & the Graph in the Workshop](STORY.md)
**Depends on:** 6.1.3

## Objective

A collection of completed tasks is not automatically a completed story. This
task runs the verification Phase 3 asks for, sweeps what this story found
outward to the documents that need it, and records what shipped open with an
owner and a condition.

## What the user can see when this lands

**Nothing new.** This story's visible payoff was Task 6.1.3; this task closes
the record.

## Work

- **Verify the whole story, integrated**: `pnpm verify` once, load read before
  the run. `pnpm e2e` and `pnpm test:database` are **out of scope** for this
  story — no route exists yet (e2e is pinned to origins nothing drives at
  Storybook) and no schema changed. Say so in the record rather than silently
  skipping it.
- **`docs/GAPS.md` entries this story owes**, each with a `Re-measure:` and an
  owner:
  - Screenshot comparability has no mechanism in this repository — name the
    `pnpm probe` command and story id as the only re-measure that exists.
  - The 60 FPS and no-task-over-50ms figures are local, one laptop, taken in
    Storybook at 516 nodes / 512 edges — not §28's 5,000/25,000, and not a
    route. Owner: Epic 14, condition: the first synthetic-mode measurement at
    scale.
  - `a-var-read-resolves-to-a-declared-token` does not reach a canvas; the
    mechanism that does is the hand-maintained `TOKEN_NAMES` list.
  - The recorded universe fixture (`full.json`) is **518** securities, dated
    2026-09-11, before Task 2.3.9 untracked `PSKY`/`WBD` — note whether Task
    6.1.1's tests filtered on `status` (making this moot) or need the fixture
    re-recorded.
- **The upward sweep**: did anything measured here falsify a governing claim?
  Check `PRODUCT_SPEC.md` §27 (amended in Task 6.1.2 if Candidate A lost —
  confirm it landed), §28 (confirm the 5,000-edge target was not misreported
  against this story's 514), and `VISUAL-LANGUAGE.md`'s "Epic 6's WebGL
  renderer reads its colours from these tokens" line if the winning renderer
  is not WebGL.
- **The sideways sweep, and the count recorded** — this epic's record starts
  here, so this is the **first** data point rather than a continuation of
  Epic 5's. Grep this story's documents for every "Epic N" / "Story N.M"
  mention and check each lands in the recipient's own file:
  - **Epic 7** — the real function names and module paths for
    `get_related_securities`/`highlight_graph_nodes` (now that `topology.ts`
    and `topology-layout.ts` exist with real exports).
  - **Epic 13** — confirm the membership-replay hand-off written into
    `buildTopologyGraph`'s own docblock (Task 6.1.1) is _also_ in Epic 13's
    `EPIC.md`, in words that epic can act on — a sideways hand-off belongs in
    the recipient's own file, not only at the source.
  - **Epic 14** — the §28 figures above, and whether this story's
    `assertStorybookBuild` instrument fix is reusable for that epic's
    synthetic mode.
  - **Story 6.2** — confirm its `STORY.md` already carries (from the design
    work) the elliptical-ring recommendation and the real resolved-box
    question; if not, write it there now, in words that story can act on.
- **`TOPOLOGY.md`** — write the subject document now, from this story,
  **rather than waiting for the epic's close to discover it is missing**
  (Epic 4 and Epic 5 each shipped without one and each wrote it at their own
  close; this epic's own decomposition says not to repeat that a third time).
  Minimal at this point: what the model and layout are, where the renderer
  decision and its figures live (ADR 0048), and a running "what no one has
  seen yet" section this story starts and every later story in this epic
  amends.
- **`CLAUDE.md`'s "Where the record lives"** gains a row for `TOPOLOGY.md`,
  and Epic 6's status line in `CLAUDE.md`'s "Current state" section is updated
  from "not started" to name this story's completion and what it shipped
  (nothing visible yet, drawn in Storybook, 516 nodes).

## Done when

1. `pnpm verify` is green once, on the final tree, with its numbers quoted —
   load read before the run.
2. Every `docs/GAPS.md` entry above exists with a `Re-measure:` and an owner.
3. The sideways count is recorded, including which recipients already had the
   constraint and which needed it written.
4. `TOPOLOGY.md` exists and is linked from `CLAUDE.md`.
5. `STORY.md`'s own status is set to **Complete**, with the renderer that won
   and its headline figure in the same line.

---

## What was done — 2026-10-30

### Verification

`pnpm verify`, load read before the run (**3.67 / 3.58 / 3.34** at 21:09, 8
cores): **exit 0**. `80 invariants hold.` · `45 components, 45 stories files.`
· `16 backend variables documented, frontend example clean.` · `617
documents, 1989 cross-file links, 39 anchor links, 0 broken.` ·
`packages/shared` **655 passed**, `apps/backend` **1344 passed**,
`apps/frontend` **1705 passed** · `test:scripts` **21 pass / 0 fail** ·
`test:process` **60 passed**.

**`pnpm e2e` and `pnpm test:database` are out of scope for this story, stated
rather than silently skipped**: no route exists yet for `e2e` to drive (the
suite is pinned to origins nothing at Storybook serves), and no schema
changed, so `test:database` has nothing new to exercise.

### `docs/GAPS.md` — four entries this story owed

All four written at this task, each with a `Re-measure:` and an owner: the
screenshot-comparability gap (Task 6.1.2's own, already written — confirmed
present rather than re-written), the 60 FPS/local-measurement gap (Epic 14),
the `a-var-read-resolves-to-a-declared-token`/canvas-blind-spot gap (this
story's own AC 6, condition: the first task touching
`renderer-canvas.ts`'s drawing code), and the recorded `full.json`
fixture-dating gap (owner: the next story that re-records it for its own
reason, or the first story whose geometry needs to be exact rather than
conservatively close).

### Upward sweep

`PRODUCT_SPEC.md` §27 — **confirmed landed**, Task 6.1.2's dated amendment is
in place recording the WebGL intent overruled. §28 — **confirmed not
misreported**: the 500/5,000 and 5,000/25,000 targets are untouched, and
nothing in this story's own record claims 512 edges satisfies either.
`VISUAL-LANGUAGE.md`'s _"Epic 6's WebGL renderer reads its colours from these
tokens"_ line — **needed no correction**: it sits inside a dated `SETTLED`
amendment block that already uses renderer-neutral language ("canvas",
"renderer") throughout, so nothing there named WebGL specifically except the
preserved pre-decision paragraph, which the house convention already leaves
standing on purpose. A **second**, un-anticipated stale WebGL claim was found
and amended: a one-line aside in the same document's chart-lane inventory
(_"`PRODUCT_SPEC.md` §27 commits it to Sigma.js/WebGL against a different
problem"_), corrected in place with a dated note.

### Sideways sweep — 4 of 4 recipients checked, 4 of 4 needed the hand-off written

Enumerated by grepping every `.md` file under this story's own directory for
`Epic N` / `Story N.M`, then checking each of the four TASK-04 names against
its own file:

- **Epic 7** — had **zero** mention of `get_related_securities` or
  `highlight_graph_nodes` anywhere in its `EPIC.md`, despite both names
  appearing in `PRODUCT_SPEC.md`'s bare tool list. Written: the real exports
  (`buildTopologyGraph`, `buildTopologyLayout`, the node/edge/layout shapes),
  which tool reads which half of the model, the no-renderer-type invariant's
  reversal trigger (_this epic's own arrival_), and the no-`weight`-today
  constraint.
- **Epic 13** — already carried an extensive, general `security_memberships`
  replay bound (from Task 5.1.5 onward) but **named no concrete topology
  consumer**. Written: `buildTopologyGraph` as a named instance of the bound
  already described, with its own three constraints (refuse before
  2026-10-12, take the replay clock explicitly, membership answers "was
  tracked" not "which sector") restated in the epic's own words rather than
  only pointed at from the source.
- **Epic 14** — had no topology-specific section at all. Written: the real
  figures and their scope limit, and — the part this task's own instruction
  did not anticipate but which is the more useful hand-off — a full account
  of `scripts/topology-instrument.mjs`'s reusable shape (candidate list
  separate from universe, the in-render-loop plant, `assertStorybookBuild`,
  the GPU-string caveat) and what a synthetic-scale measurement would still
  need to build.
- **Story 6.2** — its `STORY.md` predates this story's measurement entirely:
  its own scope line still read _"WebGL renderer on the route"_ and AC 3 said
  _"A WebGL canvas…"_. Both corrected in place with dated notes, and a new
  hand-off section written with the real renderer, the real extent (1000 ×
  928, not the canvas's 886 × 826 — `TOPOLOGY_RING_RADIUS` moved under this
  story's own geometry fix), and an explicit warning not to silently inherit
  the open label-collision gap into a differently-shaped box without
  re-measuring it.

### `TOPOLOGY.md`

Written — minimal, as instructed, rather than comprehensive: what the model
and layout are, where the renderer decision and its figures live (ADR 0048),
the design treatment, and a running "what no one has seen yet" section with
five items for later stories to amend. Linked from `CLAUDE.md`'s "Where the
record lives" table and from Epic 6's own `EPIC.md`.

### The close

`CLAUDE.md`'s "Current state" gained a new **Epic 6** paragraph (there was no
existing "Epic 6: not started" line to edit — Epics 1–4 have a header
paragraph each and Epic 5 was narrated entirely in prose with no header at
all, so this follows the Epic 1–4 shape rather than inventing a third one).
`STORY.md`'s own status line and "Epic scope covered" line are both corrected
from "WebGL renderer" to the real outcome. Epic 6's own `EPIC.md` status line
updated from "Not started" to name Story 6.1's completion.

### Gates

Every file this task touched was formatted explicitly
(`pnpm exec prettier --write <paths>`, never a bare `pnpm format`, per
`notes.txt`'s standing exclusion) and `pnpm links` was re-run after every new
or edited document — **0 broken** throughout, including the new `TOPOLOGY.md`
once staged (`pnpm links` reads `git ls-files`, so an unstaged new document's
links are invisible to it until added).

## For a stakeholder — a status report, 2026-10-30

**Story 6.1 is closed.** The market topology now exists as data and as a
drawing, reviewable in the workshop where this product's components are
built — nothing is on a page a visitor can reach yet, and that is next.

**The headline decision is now written down everywhere it needs to be.** The
product specification had recommended a well-known graph-drawing library
running on the GPU; this story built that library's version of the graph
alongside a version built from scratch with no outside code, measured both
honestly, and the from-scratch version won — not on speed, which turned out
to be a tie, but on cost (a third of a megabyte less to download) and on
fidelity (three details our designer specified that the library could not
draw at all). That decision, its figures, and the four alternatives considered
and set aside are recorded in one place for anyone who later asks "why isn't
this on the GPU," and the specification itself now says so.

**What this task adds beyond the decision is the bookkeeping that keeps the
decision from being lost.** Four later parts of this product — the epic that
will let an AI investigate this graph, the epic that will replay a past
session of it, the epic that proves this product scales, and the very next
story that puts this graph on the home page — each now has, in their own
files, exactly what this story found that bears on their work, rather than a
pointer back here that the next reader has to go hunting for.

**What ships open, by design rather than oversight:** one visual rough edge (a
sector name that brushes against its neighbour on screen, reduced but not
eliminated by a fix this story made and then corrected its own account of
after finding the fix's own check was wrong), and four measurement gaps this
story could not close with the equipment it had — each written down with
exactly what would close it and who is best placed to.
