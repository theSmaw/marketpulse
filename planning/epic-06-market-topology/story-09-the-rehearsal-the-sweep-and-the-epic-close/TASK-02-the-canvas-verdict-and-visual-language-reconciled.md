# Task 6.9.2 — The canvas verdict, and `VISUAL-LANGUAGE.md` reconciled

**Status:** Not started
**Story:** [6.9 The Rehearsal, the Sweep, & Epic 6's Close](STORY.md)
**Depends on:** nothing (independent of 6.9.1)

## Objective

The design chain is **canvas → `VISUAL-LANGUAGE.md` → `tokens.css` →
components**, and `CLAUDE.md`'s own rule is that it "only stays true if a
close walks it." Every topology canvas page was drawn **before** anything
was built (Story 6.1's own framing: "Epic 6's visual language, drawn before
anything is built"), and eight stories have since re-derived figures the
canvas only guessed at, refused encodings the canvas may still show as open,
and shipped treatments (the anomaly ring, the correlation stroke ladder, the
filter's de-emphasized landmark) the canvas has never been told about. This
task is where the canvas and the shipped product are reconciled, in the one
direction `CLAUDE.md` always resolves disagreements: the canvas is amended
where it is a design decision still to make; the document is corrected where
the canvas's own figure has been superseded by a real measurement.

## What the user can see when this lands

Nothing — this is the design-system chain's own integrity, not the product.

## Work

- **Fix the two stale story numbers in `The motion vocabulary.dc.html`**,
  standing since 2026-09-21 (this story's own description names the
  defect; find the two references and correct them against the actual
  stories that now own that content).
- **Read every topology-related canvas page** (at minimum `The graph at
rest.dc.html` and `Hover, select, and the way out.dc.html` — list every
  other one found) and verdict each as **finished** (an accurate account of
  what shipped) or **needing a correction**, against the real figures this
  epic actually measured: the elliptical ring's real radii
  (`TOPOLOGY_RING_RADIUS_X/Y`, arc-length-proportional wedges, re-derived
  from the shipped layout rather than the canvas's own stale circular
  figures — already corrected in code and in `TOPOLOGY.md`, but is the
  **canvas** still showing the old figures?); the anomaly ring's real
  weights and the measured band distribution; node size's refusal (does
  the canvas still show an un-refused size candidate?); the correlation
  stroke ladder's real tertile floors; the live-update mark; the filter's
  hide/de-emphasize treatment (new since the canvas was last touched, per
  this story's own "Design work" note that there was no topology page on
  the canvas when this epic began — confirm whether one exists now and
  whether it reflects Story 6.8's shipped treatment).
- **Where the canvas is stale, correct it** (pre-authorised — draw and
  upload as part of this task, report afterwards rather than asking
  first). Where the canvas documents a decision correctly and the written
  record is what's behind, correct the written record instead. Record
  which happened, for which page, in this task's own "What was done."
- **Confirm the full chain holds**: canvas → `VISUAL-LANGUAGE.md` →
  `tokens.css` → components, for every topology-specific token this epic
  introduced (the anomaly ramp, the correlation stroke weights, the
  de-emphasis treatment) — not a re-audit of the whole design system, only
  this epic's own additions to it.

## Done when

1. `The motion vocabulary.dc.html`'s two stale story numbers are corrected.
2. Every topology-related canvas page has a stated verdict (finished /
   corrected, with what changed) in this task's own record.
3. Any canvas correction is uploaded; any document correction is made in
   the same change.
4. The canvas → tokens → components chain is confirmed to hold for every
   token this epic introduced.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
