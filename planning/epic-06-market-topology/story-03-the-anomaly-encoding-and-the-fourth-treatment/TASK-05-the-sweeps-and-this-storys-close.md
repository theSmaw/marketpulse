# Task 6.3.5 — The Sweeps, & This Story's Close

**Status:** Not started
**Story:** [6.3 The Anomaly Encoding, & the Fourth Treatment a Canvas Needs](STORY.md)
**Depends on:** 6.3.1, 6.3.2, 6.3.3, 6.3.4

## Objective

A collection of completed tasks is not automatically a completed story.
This task runs Phase 3's verification and sweeps what this story found
outward to the documents and sibling stories that need it.

## What the user can see when this lands

**Nothing new.** This story's visible payoff was Tasks 6.3.1–6.3.4; this
task closes the record.

## Work

- **Verify the whole story, integrated**: `pnpm verify`, load read before
  the run; `pnpm e2e` in full (this story ships on a route, same as 6.2).
  `pnpm test:database` — confirm whether it's in scope (no migration is
  planned; state so explicitly if it stays out).
- **The degraded grid's declaration breaks, and needs correcting rather than
  deleting.** `overview-degraded-grid.spec.ts` currently declares `Market
topology` **constant across every aggregate-only row** — true because its
  content was a function of the universe request alone. After this story
  it is a function of **two** axes (the universe request, and the band
  section this story adds to the overview aggregate), so the existing
  declaration is false the moment this story ships. Correct it to state
  what is actually still true (the graph's _structure_ and the _unscored_
  fallback are constant across aggregate-only rows; the _bands drawn when
  something is scored_ are not, because they come from the aggregate this
  grid varies) — this is a correction to a kept spec, not a new grid.
- **Sideways sweep**: grep this story's own documents (`STORY.md` plus all
  five task files) for every `Story N.M`/`Epic N` mention; check each lands
  in the recipient's own file.
  - **Story 6.4** (nearly certain): the annulus allocation decided at this
    story's Gate 1 — write it into 6.4's own `STORY.md`, in words that
    story can act on, not a link back.
  - **Story 6.6, 6.8** (check): anything about the reserved channels
    (size, opacity) this story confirmed are spoken for elsewhere.
  - **Epic 7** (check): the `ANOMALY_BAND_FLOORS` reversal trigger this
    story's own description already names — confirm Epic 7's own file
    carries the condition in words it can act on, not only this story's.
  - Record the count checked and the count that needed the hand-off
    written, same discipline as Task 6.1.4 and Task 6.2.6.
- **Upward sweep**: `MARKET-OVERVIEW.md` §8.4 gets the real measured byte
  cost from Task 6.3.1 (the frame-size table), and a dated note that the
  overview frame now carries a sixth-ish section. `docs/GAPS.md` gains an
  entry for anything this story leaves standing that nothing mechanical
  guards (the low-fit-scale `elevated` suppression threshold, if Task 6.3.2
  derived one but could not make it fully mechanical; the legend's deferred
  state if Task 6.3.4 found no room).
- **`TOPOLOGY.md`**: amend §4 ("what no machine and no person has seen")
  with this story's own findings — whether the band encoding has been
  watched against a real feed, what no gated machine can verify (CI's
  all-hollow state is the only one it will ever draw), and the treatment
  ladder's real figures.
- **`CLAUDE.md`**: update the Epic 6 status paragraph (Story 6.3 of nine
  complete) and the "What a user can see today" narrative.
- **`STORY.md`'s own status** set to Complete, with the shipped outcome and
  headline figures in the same line.

## Done when

1. `pnpm verify` is green once, on the final tree, with its numbers quoted
   — load read before the run.
2. `pnpm e2e` is green in full.
3. The degraded grid's `Market topology` declaration is corrected to state
   what is actually constant now, not deleted or left false.
4. The sideways sweep is recorded: count checked, count that needed the
   hand-off written — Story 6.4's annulus allocation confirmed written.
5. `docs/GAPS.md` and `MARKET-OVERVIEW.md` §8.4 both carry this story's
   findings.
6. `TOPOLOGY.md` and `CLAUDE.md` are both current.
7. `STORY.md`'s status is **Complete**.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
