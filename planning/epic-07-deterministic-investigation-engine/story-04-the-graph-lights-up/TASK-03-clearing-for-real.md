# Task 7.4.3 — Clearing, for real

**Status:** In progress — 2026-11-26
**Story:** [7.4 The Graph Lights Up](STORY.md)
**Depends on:** 7.4.2 (complete, PR #713 — read its amendment below before
starting; the shipped design has no investigation id to key supersession on,
which this task needs to add)

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
  mirroring `useInvestigation`'s own `runIdRef` supersession rule. **See this
  task's own amendment below — the id this bullet assumes does not exist yet
  on the shipped command, and adding it is this task's own first piece of
  work, not a given.**
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

## Amended by Task 7.4.2 — 2026-11-26: carried forward from its own independent review, two things this task needs that the shipped design does not yet have

Task 7.4.2 shipped (PR #713) `WorkspaceHighlightCommand = { subject, symbols,
relations }` — **no investigation id anywhere**, by design: the invariant
`no-second-affordance-on-a-topology-node` (`scripts/check-invariants.mjs`)
forbids the word "investigat" appearing anywhere under
`apps/frontend/src/topology/` or `apps/frontend/src/components/MarketTopology/`,
and the id correctly does not live there. `App.tsx`'s holder and
`use-investigation.ts`'s returned value are **outside** that invariant's
corpus, so the id is not forbidden there — it simply was not added, because
7.4.2's own supersession (one producer, sequential SSE events, a `runIdRef`
guard that drops a superseded run's events before they reach `setHighlight`)
is correct without one **for a single investigation hook on a single
security page**. Two things follow for this task:

1. **Add `investigationId: InvestigationId` to `WorkspaceHighlightCommand`
   and to `App.tsx`'s holder, before building anything else.** AC 8's two
   hardest clauses — clear on any terminal event, clear on channel death —
   need to answer _"is the terminal event / dead channel I'm looking at the
   one that produced the highlight I'm holding?"_, which position alone
   cannot answer once more than one producer or one tab is in the picture.
   This is cheap now (one field, one assignment) and expensive to retrofit
   once clearing logic is built against a positional assumption. Keep the id
   **out** of `TopologyHighlight`/`MarketTopology.tsx`/`renderer-canvas.ts` —
   the invariant above still applies to those files; the id lives in the
   holder and the clearing logic that reads it, one layer up from the canvas.
2. **A real mechanical gap exists on the frontend that this task should
   close.** `a-permitted-command-is-minted-only-by-the-permission-stage`
   (Task 7.4.1) is backend-only (`apps/backend/src`); nothing stops a future
   frontend author from hand-constructing `{ subject, symbols, relations }`
   and feeding it to `setHighlight` directly, bypassing the decoded,
   validated wire value entirely — the same shape of gap 7.4.1's own review
   found and fixed on the backend side. Add a sibling `pnpm invariants` entry
   anchored on the **construction** of a `WorkspaceHighlightCommand` (it
   should be minted in exactly one place — `use-investigation.ts`'s own
   decode-and-report path), **not** on a count of `setHighlight` call sites:
   this task legitimately adds more call sites (the Escape handler, the
   empty-canvas click, the terminal-event clear, the channel-death clear all
   need to call `setHighlight(null)` or equivalent), so a call-site count
   would be a check this task has to fight rather than one that helps it.
   Give it its own `pnpm break`.

Neither of these changes what this task visually does — they change what the
supersession and clearing logic can safely key on, and close a real,
previously-unflagged gap on the frontend's side of the same class of defect
Task 7.4.1's review already found once on the backend's.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
