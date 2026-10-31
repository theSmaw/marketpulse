# Task 6.2.6 — The Sweeps, & This Story's Close

**Status:** Not started
**Story:** [6.2 The Topology Takes the Landing Page](STORY.md)
**Depends on:** 6.2.2, 6.2.3, 6.2.4, 6.2.5

## Objective

A collection of completed tasks is not automatically a completed story. This
task runs the verification Phase 3 asks for — including, for the first time
in this epic, `pnpm e2e` and `pnpm test:database` as genuinely in scope — and
sweeps what this story found outward to the documents that need it.

## What the user can see when this lands

**Nothing new.** This story's visible payoff was Tasks 6.2.1–6.2.4; this task
closes the record.

## Work

- **Verify the whole story, integrated**: `pnpm verify`, load read before the
  run. `pnpm e2e` is **in scope this time** (unlike Story 6.1 — this story
  ships a route) and must be run in full, not just the touched specs.
  `pnpm test:database` — confirm whether it's in scope (no migration is
  planned; state so explicitly if it stays out).
- **`docs/GAPS.md`**: close or narrow the label-collision entry per Task
  6.2.2's real figures. Confirm the 60fps/local-scale entry's language still
  holds now that the route carries the graph (it does — the route measurement
  is still local, one laptop; update if Task 6.2.5 found otherwise).
- **Upward sweep**: `PRODUCT_SPEC.md` §9 gets its dated amendment (the
  canvas's sector/movers grouping over §9's own breadth-beneath sketch —
  Gate 1's design-system reconciliation, not a Product Owner question).
  `MARKET-OVERVIEW.md` §1.1's region table, §7.3's content-class rule (the
  dated amendment from Task 6.2.4), and §1.4's trigger ledger (this story's
  own displacement figures, alongside the other route's +74px).
- **Sideways sweep**: grep this story's own documents for every `Epic N` /
  `Story N.M` mention; check each lands in the recipient's own file. Likely
  candidates: Story 6.3 (the `topologyDrawnSentence` reversal trigger —
  "nothing in it is a measurement" stops being true the moment an anomaly
  band draws), Story 6.4 (the `Reset view` control it inherits; the live-
  region reversal trigger), Story 6.5 (whether 512 edges at the new elliptical
  ring still reads cleanly, or whether 6.5's correlation edges need their own
  geometry check). Record the count checked and the count that needed the
  hand-off written, same discipline as Task 6.1.4.
- **`TOPOLOGY.md`**: amend with this story's own findings — the elliptical
  ring's real figures (replacing Story 6.1's circular ones as the current
  geometry), the renderer-side label threshold, the Storybook-bound
  frame-rate limitation, the degraded-grid's new axis. Keep the "what no one
  has seen yet" section current rather than letting it drift.
- **`CLAUDE.md`**: update the Epic 6 status paragraph (Story 6.2 of nine
  complete) and the "What a user can see today" narrative — this is the first
  story in this epic with something to say there, since `/` now draws the
  graph for real.
- **`STORY.md`'s own status** set to Complete, with the renderer's real
  on-screen outcome and headline figures in the same line.

## Done when

1. `pnpm verify` is green once, on the final tree, with its numbers quoted —
   load read before the run.
2. `pnpm e2e` is green in full (not scoped to touched specs).
3. `docs/GAPS.md`'s relevant entries are closed, narrowed, or confirmed
   current, each with its re-measure command re-verified.
4. The upward sweep is complete: `PRODUCT_SPEC.md` §9, `MARKET-OVERVIEW.md`
   §1.1/§1.4/§7.3 all carry their dated amendments.
5. The sideways sweep is recorded: count checked, count that needed the
   hand-off written.
6. `TOPOLOGY.md` and `CLAUDE.md` are both current.
7. `STORY.md`'s status is **Complete**.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
