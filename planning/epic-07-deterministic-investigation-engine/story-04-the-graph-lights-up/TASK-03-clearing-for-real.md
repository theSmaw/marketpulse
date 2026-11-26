# Task 7.4.3 — Clearing, for real

**Status:** Complete — 2026-11-26. Six of the seven Done-whens are met and
asserted; **Done-when 3 is not met and is open as a Product-Owner decision**,
because implementing it literally makes the feature unobservable on every
machine and turns this story's own merged headline e2e journey red — see "What
was found" below, and `docs/GAPS.md`' entry for it.
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

## What was done — 2026-11-26

**The id was added first, as the amendment above required**, and it is
load-bearing rather than decorative. `WorkspaceHighlightCommand` moved out of
`use-investigation.ts` into its own module —
`apps/frontend/src/investigations/workspace-highlight.ts` — beside the two
functions that decide a highlight's fate, and gained
`investigationId: string`. **A plain `string`, not `InvestigationId`**, which
is a deliberate departure from this task's own brief: `WireEventBase.
investigationId` and `ChecklistState.investigationId` are both `string` by
this directory's standing rule for a fact that arrived over a wire, and
`CLAUDE.md` records that `InvestigationId`'s brand is deliberately forgeable —
so importing it here would buy a claim this layer cannot make.

**The id never reaches the canvas, and the type is what stops it.**
`WorkspaceHighlightCommand` is now a **superset of `TopologyHighlight` by
exactly one field**, so `MarketOverview` still hands one straight to
`setHighlight` with no converter, and the region cannot read the id because
its own type does not declare one. `no-second-affordance-on-a-topology-node`
is untouched and green: nothing under `topology/` or
`components/MarketTopology/` names what produced a command.

**The hook answers a two-arm state** —
`{ kind: "commanded", command }` / `{ kind: "withdrawn", investigationId }` —
through the one callback `SecurityExplorer` already had, and `App` reduces it
with `applyWorkspaceHighlight`: `commanded` replaces wholesale (supersession,
never a union), `withdrawn` clears **only what that run placed**. Two fields
on the hook's result was the alternative and the clearing is always the one
that gets forgotten.

**The reader's gesture reaches the holder through a new outward prop**, which
is the one genuinely new pattern here and is documented at three levels:
`TopologyRendererOptions.onClearHighlight` (a **request** — the renderer
changes nothing, which is the asymmetry with `onSelect` beside it),
`MarketTopologyProps.onHighlightCleared`, and
`MarketOverviewProps.onHighlightCleared` reaching `App.clearWorkspaceCommand`.
`Escape`'s _not ours to swallow_ guard widened rather than moved (the key is
ours while **either** a selection or a highlight is in force); a click clears
only on **empty** canvas, never on a node. The component clears its own ink,
note and accessible clause through **one path** — `applyHighlight`, which the
handle method is now also a call to — whether or not anybody above is
listening, and then reports, because a command still in `App`'s state is
re-applied on that route's next re-render.

**Channel death is detected from the stream's own last word**, not a timer:
`highlightOutlivesChannelEnd(lastEventType)`, one expression reading
`isTerminalEventType`. The interval in Done-when 4 is therefore _the instant
the stream ends_ — the same instant the checklist starts saying _investigation
state unknown_, which is the earliest moment this browser knows anything, and
needs no threshold to justify.

**A reload clears it by construction**, which was checked rather than assumed:
the holder is ordinary React state in a module nothing persists, so a fresh
document is `undefined`. Done-when 6 is met with no code written for it, and
`App.tsx` now says so where the holder is declared.

### The two invariants, both proved to pass WRONGLY first

`pnpm invariants` holds **102**.

- **`the-topology-walk-reads-no-highlight`**, with break
  `the-topology-walk-sorted-by-highlight`. A sibling of
  `the-topology-walk-reads-no-band` rather than a widening: that one's
  argument is cadence, this one's is _whose position it is_. Planted by hand
  first — a highlighted-peers-first sort inside `step` — and with the plant
  applied **`tsc -b` was clean and all 24 `walk.test.ts` assertions were
  green**, while the check named the file and the lines. Then red, then
  restored byte-identical by `pnpm break`.
- **`a-highlight-command-is-minted-only-where-the-wire-is-decoded`**, with
  break `a-surface-mints-its-own-highlight-command` — the frontend sibling of
  Task 7.4.1's backend mint check, anchored on the **construction** of the
  command's three fields (assignment or shorthand, `readonly` lines skipped so
  the three interfaces that declare the shape are not flagged) rather than on
  a count of `setHighlight` call sites, which this task legitimately added
  to. Two minting files, both on the decode-and-hold path. Planted by hand in
  `MarketOverview.tsx` first: **`pnpm typecheck` completely clean** on the
  plant, which is the point — `WorkspaceHighlightCommand` has no brand, so
  nothing but this check can see a surface inventing a peer set.

### What was found

**Three defects in the plan, one in a spec I wrote, and two in my own prose —
found by an independent review of the merged diff and corrected in a follow-up
commit, which is where the step ordinal and the two docblock facts below come
from.**

1. **Done-when 3 is self-defeating, and `STORY.md` disagrees with itself about
   it.** AC 8 says a terminal event clears the highlight; Gate 1's own record,
   four lines below it, says the lifetime is investigation-scoped and the
   highlight persists _"never until the investigation's own completion, which
   would close the window before any reader could navigate to see it"_. At
   Story 7.2's measured **p50 32.0 ms**, with the command emitted after step 4
   of 6, a terminal event lands tens of milliseconds after the command — so
   clearing there makes the highlight **unobservable on every machine** and
   turns `overview-investigation-highlight.spec.ts`'s merged headline journey
   red. Gate 1's reading shipped, in one named one-expression home with the
   reversal being `true` → `false`; `docs/GAPS.md` carries it with the figures
   and the Product Owner as owner. **Done-when 3's test exists either way**:
   `workspace-highlight.test.ts` iterates `TERMINAL_EVENT_TYPES` rather than
   spelling an event name, so Story 7.5's cancellation is covered with no
   change, and the assertion is of the decided answer.
2. **"Clear on channel death" cannot mean "the stream was aborted"**, for the
   same reason — `SecurityExplorer`'s own prop docblock had already worked this
   out for the unmount case: navigating to `/` is what aborts the stream, so a
   withdrawal there would make the feature unreachable by construction. It
   means _the stream ended with the run in an unknown state_, which is
   `CONNECTION_LOST_SENTENCE`'s own condition and is what shipped.
3. **`Escape` with a highlight and no selection was unreachable.** The
   existing handler returned early on `selected === null` — correct before
   this task, and it would have silently made the keyboard half of AC 8 a
   no-op in the common case (a reader who has navigated to `/` to look at a
   highlight has selected nothing). The guard is now a disjunction.
4. **The first draft of the e2e node-click assertion guessed a coordinate and
   was wrong**: the centre of the canvas box is not the hub's screen position
   (`fitView` fits an elliptical layout to the box), so the click hit nothing,
   cleared the highlight, and read as a defect in the feature. Both points are
   now discovered by a sweep that asks the readout plate what it found —
   `overview-market-topology-hover.spec.ts`' own technique. _The one thing a
   drawn canvas cannot tell a spec is where it drew._
5. **The peer-comparison step is the FOURTH of six, not the third**, and this
   task stated the wrong ordinal in **five** places (four documents plus
   `workspace-highlight.ts`' own docblock) — found by the review, confirmed
   against `index.ts`' `investigationTools` array (snapshot, return
   percentile, volume ratio, **compare securities**, breadth, correlation) and
   against `scripted-agent-provider.ts`' own comment, which had said _step 4
   of 6_ all along. **The conclusion is unaffected**: the two steps after it
   are a breadth read and a correlation read that refuses with no database, so
   a terminal event still lands within a few milliseconds of the command and
   the highlight is still unobservable if it clears there. A figure stated
   five times and wrong five times is worth recording anyway, which is
   `CLAUDE.md`'s own rule arriving on this task's own prose.
6. **Neither navigation this epic has described as unmounting the
   investigation hook actually unmounts it, which was measured rather than
   reasoned.** `workspace-highlight.ts`' first draft said a symbol change
   unmounts the hook; the review said the unmount is `/securities` ↔
   `/securities/:symbol` instead. **A throwaway probe says neither**: with two
   sibling `<Route>`s rendering the same component — which is exactly what
   `App.tsx` has — React reconciles the same element type at the same position
   and React Router keys nothing, so a parameter change (`NVDA` → `AAPL`)
   **and** a move between the two routes both gave **one mount and the same
   component instance**. The hook unmounts only on leaving the Explorer for a
   different route element (`/`), which is Story 7.4's Gate 1 record's own
   case and the one that genuinely aborts the stream. Nothing shipped depends
   on it — the id-keyed withdrawal is reached with the hook mounted throughout
   and is, if anything, more necessary than the draft implied — and no other
   claim in this epic was falsified by it (checked: `use-investigation.ts`'
   subject-pinning is a symbol equality guard rather than an unmount, and both
   surviving _unmounts on reaching `/`_ claims are true).

### What was run

- `pnpm verify` — green (see the PR body for the step list).
- `pnpm e2e overview-investigation-highlight.spec.ts` — **4 passed**, the two
  new clearing journeys included.
- `pnpm e2e overview-market-topology-keyboard.spec.ts` — 7 passed (the
  `Escape` guard change's own blast radius).
- `pnpm e2e overview-market-topology-hover.spec.ts` — 12 passed (the
  empty-canvas click's).
- `pnpm e2e security-investigate.spec.ts` — 4 passed (the hook's).
- `pnpm break the-topology-walk-sorted-by-highlight` and
  `pnpm break a-surface-mints-its-own-highlight-command` — both red on the
  plant, restored byte-identical.

### What a reader can see

Exactly what the task file promised, minus the terminal-event clause: press
`Escape` or click empty canvas on `/`'s topology and the highlight goes,
instantly, with the note and the spoken clause going with it — and it stays
gone across a navigation away and back, which is the holder having been
withdrawn rather than only the canvas. Let a run's connection die and the
highlight goes on its own. Start a second investigation and its peers wholly
replace the first's. Reload and there is no highlight.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
