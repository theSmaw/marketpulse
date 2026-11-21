# Task 7.3.3 — Second press, the live region, and the browsable list

**Status:** Not started
**Story:** [7.3 Findings, Evidence, & Confidence](STORY.md)
**Depends on:** 7.3.1

## Objective

Two behavioural gaps that only become real defects once a completed row
carries an actual claim rather than a blank: a second press of
`Investigate` would blank six real findings, and a listener using a
screen reader currently hears only the last of six claims, ever. Fix
both.

## What the user can see when this lands

Pressing `Investigate` a second time after a run has completed keeps the
previous six claims on screen, dimmed, until each row's own re-run
replaces it — rather than blanking the whole checklist back to six empty
rows. Nothing else changes visually. For a screen-reader user: the run's
completion is announced as a count (`4 findings supported, 2 unknown`)
rather than only the last step's sentence, and the six rows are now
reachable as a list, each carrying its own description, claim and
confidence together.

## Work

- **Second-press persistence** (AC 11): `optimisticChecklist` currently
  resets every row to the seeded placeholder on a new press. Change it
  so a row with an existing `claim`/`confidence` keeps them, visually
  dimmed (`--ink-secondary` or equivalent), until that row's own next
  `STEP_COMPLETED`/`FINDING_CREATED` pair replaces them. Queued/running
  states render exactly as they do today otherwise.
- **The live-region summary** (AC 12, part 1): `liveRegionText` in
  `use-investigation.ts` currently speaks only the last-completed step's
  sentence on terminal. Add a summary form — a count of findings by
  confidence level — spoken on the terminal event, replacing (not
  alongside) the last-step sentence. The running-step announcement
  (pre-terminal) is unchanged.
- **The browsable list** (AC 12, part 2): restructure the checklist's
  markup from a `<div>` of `<div>`s to a `<ul>` of `<li>`s, one per
  step, so a browse-mode screen reader announces "list, 6 items" and
  each item carries its description, claim and confidence as one unit.
  No visual change from this alone — it is a semantic restructuring.
- **`docs/GAPS.md`**: add the entry recording that both changes above are
  reasoning from structure, not confirmed by a real screen-reader pass —
  this story does not discharge the existing, dated "no real
  screen-reader pass has ever been taken" entry; it adds to what that
  pass will need to confirm.

## Done when

1. A second press after a terminal run leaves the prior run's six claims
   visible (dimmed) until each row's own re-completion; `security-
investigate.spec.ts` gains an assertion for this.
2. The terminal live-region text is a confidence-count summary, asserted
   in a component test; the running-step announcement is unchanged,
   asserted by the existing tests still passing.
3. The checklist's DOM is a `<ul>`/`<li>` structure; a component test
   asserts the list role and item count.
4. `docs/GAPS.md` carries the new entry.
5. `pnpm verify` and `pnpm e2e security-investigate.spec.ts` are green.
