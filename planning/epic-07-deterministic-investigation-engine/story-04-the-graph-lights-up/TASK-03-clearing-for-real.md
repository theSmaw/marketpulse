# Task 7.4.3 — Clearing, for real

**Status:** Not started
**Story:** [7.4 The Graph Lights Up](STORY.md)
**Depends on:** 7.4.2

## Objective

Task 7.4.2 made the highlight arrive and persist. This task closes AC 8's
real requirement — "leaving the topology exactly as a reader would have left
it themselves" — across every way the highlight's reason for existing can
end: the reader's own gesture, the investigation's own terminal state, the
channel dying under it, and a second investigation superseding the first.

## What the user can see when this lands

Press Escape, or click empty canvas: the highlight clears instantly, exactly
as those gestures already clear a selection today. Let the investigation
finish, fail, or (once Story 7.5 ships) get cancelled: the highlight clears
on its own. Close the tab that was running the investigation, or let its
connection die: the highlight on `/` clears rather than sitting there with
nothing live behind it. Start a second investigation on a different
security: its highlight wholly replaces the first — never a union of two
peer sets with nothing on screen saying which is whose.

## Work

- **Reader-driven clear** — reuse Story 6.4's existing gestures verbatim:
  `Escape`, and clicking empty canvas. No new affordance, no new vocabulary
  for an existing word. The highlight must never move focus, never move the
  reader's selection, and never re-key the keyboard walk — add a sibling
  invariant, `the-topology-walk-reads-no-highlight`, mirroring
  `the-topology-walk-reads-no-band`'s own reasoning and its own `pnpm break`
  planting exactly that defect (a highlight-keyed sort of a cluster's
  members is the same shape of sensible-sounding mistake `the-topology-walk-
  reads-no-band` was written to forbid).
- **Clear on any terminal investigation event** — read from
  `isTerminalEventType` (already includes `INVESTIGATION_COMPLETED` and
  `INVESTIGATION_FAILED`), never a hand-maintained list of two event names —
  so Story 7.5's cancellation clears the highlight with no later change
  needed here.
- **Clear on channel death** — if the investigation this highlight depends on
  no longer has a live channel (the SSE stream the browser used to receive it
  is gone, whether from navigation, a dropped connection, or anything else),
  the highlight clears rather than persisting as a claim about a peer set
  with nothing standing behind it (ADR 0029's false-impression rule, applied
  to ~70 dimmed nodes rather than to a provenance sentence).
- **Supersession** — a later `WORKSPACE_COMMAND` (a different investigation
  id) replaces the current highlight wholesale. Keyed on investigation id;
  the most recently started investigation wins if two are somehow concurrent,
  mirroring `useInvestigation`'s own `runIdRef` supersession rule.
- **Clear on unmount** — no highlight survives a reload or outlives the
  browser session (already stated as out of scope for persistence in
  STORY.md; this task is what actually makes that true rather than assumed).

## Done when

1. Escape and empty-canvas click clear a highlight exactly as they already
   clear a selection, with a test asserting the highlight specifically (not
   just the selection).
2. `the-topology-walk-reads-no-highlight` exists, is proven red by its own
   `pnpm break`, and then green.
3. Every `isTerminalEventType` member clears the highlight, proven by a test
   that does not hand-enumerate event names.
4. A simulated channel death (investigation stream closes with no terminal
   event, e.g. a dropped connection) clears the highlight within one
   reasonable interval, stated and justified.
5. A second investigation's command wholly replaces the first — no state in
   which two peer sets are simultaneously highlighted.
6. A reload clears the highlight (no persistence past the session).
7. `pnpm verify` and the relevant e2e specs are green.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
