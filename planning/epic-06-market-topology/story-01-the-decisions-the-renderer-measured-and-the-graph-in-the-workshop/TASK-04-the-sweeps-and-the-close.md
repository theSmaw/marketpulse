# Task 6.1.4 — The Sweeps, & This Story's Close

**Status:** Not started
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

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
