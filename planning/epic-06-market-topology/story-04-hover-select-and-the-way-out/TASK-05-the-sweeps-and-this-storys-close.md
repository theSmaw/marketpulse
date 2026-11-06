# Task 6.4.5 — The sweeps, & this story's close

**Status:** Complete — 2026-11-06, awaiting Gate 2 acceptance. Two real UX
defects found and fixed before close (plate occlusion, focus-ring contrast);
one open product decision (the canvas's native context menu) surfaced to the
Product Owner at Gate 2 rather than decided unilaterally.
**Story:** [6.4 Hover, Select, & the Way Out](STORY.md)
**Depends on:** 6.4.4

## Objective

A collection of completed tasks is not automatically a completed story.
This task verifies the integrated behaviour end to end, sweeps what this
story measured upward and sideways, and closes the story at Gate 2.

## What the user can see when this lands

Nothing new — this is verification and documentation.

## Work

- **Verification**: the tester runs the full behaviour end to end (pointer
  and keyboard, all four acceptance-criteria-bearing states), plus
  regression on Stories 6.1–6.3's own specs, `pnpm verify`, `pnpm e2e`.
  UX/design check the integrated experience with `pnpm probe` at all four
  widths and look at the screenshots, not just the numbers. The BA checks
  every acceptance criterion in `STORY.md` against evidence.
- **Upward sweep**: grep for every figure this story measured that
  contradicts something `CLAUDE.md`, `TOPOLOGY.md`, or an ADR currently
  states as fact — in particular the hit-test unit-mismatch finding (Task
  6.4.1 fixed the code; the two docblocks that currently claim the
  footprint "is already sized to be the thing a cursor or a focus ring
  targets" need a dated correction, not a rewrite) and the frame-rate-under-
  interaction gap `TOPOLOGY.md` §4 has carried since Task 6.2.5 (closed by
  Task 6.4.3's harness, or re-stated with a narrower scope if it is not
  fully closed).
- **Sideways sweep**: grep this story's own documents for every
  `Story N.M` / `Owner:` line and check each against that story's own
  file — record the count found and the count missing. At minimum:
  Story 6.5 (correlation edges) and Story 6.6 (node size) both change the
  layout density the hover hit-test and the tree-walk's disjointness
  argument rely on (`17.83` world units between the closest pair, found
  while shaping this story) — write that constraint into both stories'
  own files, in words they can act on, not a link back. Story 6.7 (live
  updates) is the likely trigger for re-opening whether selection state
  needs to leave this region (Gate 1 decision 2's own stated reversal
  condition) — write the condition into 6.7's file too.
- **One already-fired, unrecorded trigger found while shaping this
  story**: `MarketOverview.tsx`'s own docblock states a reversal trigger
  — _the first surface on this screen needing a second field from the
  universe_ — that fired silently at Task 6.3.3 (`equitySymbols` reading
  `security.kind`) and was never recorded. Record it now, in
  `MarketOverview.tsx`'s own docblock, since this story is what found it.
- **`docs/GAPS.md`**: the screen-reader listening entry from Task 6.4.4,
  plus any other claim this story leaves standing that nothing mechanical
  guards (a hover/selection pass on the deployed product against a real
  composite score, since CI's permanent `unscored` state means no gated
  machine has ever rendered a real band in this readout).
- **`TOPOLOGY.md`** gains a dated section recording what this story
  shipped, following the same minimal pattern Stories 6.2 and 6.3 used.
- **`CLAUDE.md`**'s Epic 6 status line and Current-state paragraph updated
  to reflect four of nine stories complete and what a user can now do from
  the graph.
- **`STORY.md`** status set to Complete, with the PR links.

## Done when

1. `pnpm verify` and `pnpm e2e` are green; the tester's end-to-end pass and
   the BA's acceptance-criteria check are both recorded with evidence.
2. The upward sweep is complete and recorded, including the two docblocks
   that need a dated correction.
3. The sideways sweep's grep count and findings are recorded, with the
   named constraints written into Stories 6.5, 6.6, and 6.7's own files.
4. `docs/GAPS.md`, `TOPOLOGY.md`, and `CLAUDE.md` are updated.
5. Gate 2 is presented to the Product Owner with evidence per acceptance
   criterion, and the story is accepted and closed.

---

## What was done — 2026-11-06

### Upward sweep

Two stale docblocks (both in `STORY.md`, carried forward from Story
6.2/6.3's own hand-off notes rather than in any shipped code comment)
claimed `nodeAt()`'s 16-unit footprint threshold "is already sized to be
the thing a cursor or a focus ring targets." **False** — Task 6.4.1 found
and fixed a real unit mismatch (layout units compared against a mark drawn
in constant CSS pixels), measured the hit target narrower than the ink at
every width, not only the narrowest. Both passages corrected in place with
a struck-and-dated amendment rather than a rewrite, per this repository's
own convention; the historical record of what was originally argued is
left standing beside the correction.

`TOPOLOGY.md` §4's frame-rate-under-interaction gap had already been
re-scoped correctly by Task 6.4.3's own commit — the geometry harness
(`scripts/topology-interaction-probe.mjs`) closed the measurement half,
and the entry already states plainly that the frame-rate half stays
Epic 14's. No further correction needed there.

A third, unplanned correction was found while doing this sweep: a
contrast figure in `palette.ts`'s own docblock (`--ink-inverse` on
`--surface-inverse`, quoted as **14.6:1**) does not reproduce from the
shipped tokens — the WCAG formula applied to `#eef0f5` on `#181c23` gives
**14.98:1**. Both figures clear ADR 0026's standing-exception floor by
roughly 5×, so no verdict moved; the number was simply wrong, caught by
recomputing rather than re-citing. Corrected in `palette.ts` and in Task
6.4.3's own record, which had quoted the same wrong figure.

### Sideways sweep

`grep -noE "Story [0-9]+\.[0-9]+" STORY.md TASK-0*.md` across this story's
own six documents, filtered to forward references (excluding this story's
own 6.1–6.4 self-citations and historical references to Story 4.6): **3
found** — `Story 6.5`, `Story 6.6`, `Story 6.7`, all three in this task's
own Work section. `grep -noiE "owner[: ]"` across the same six documents:
**0 found** beyond the instruction quoting the word itself — this story's
own `Owner:` assignments (the `docs/GAPS.md` entries) live in that shared
ledger rather than in a sibling story's file, which is the correct home
for them and needs no further sweep.

**All 3 forward references now carry the named constraint, in words that
story can act on, not a link back:**

- **Story 6.5** (`STORY.md`) — node crowding inside a cluster is real,
  measured, and already accepted (Story 6.2/6.3's own finding); Story 6.4
  confirmed it reaches the hit-test itself (0.0 px at the narrowest tested
  width, in the densest real cluster). Correlation edges don't move node
  positions, so the figure should not change by construction — told to
  re-confirm that rather than assume it.
- **Story 6.6** (`STORY.md`) — the more urgent of the two, since node size
  directly shrinks the same clear space correlation edges cannot touch. Told
  explicitly that the inherited `TOPOLOGY_NODE_SCALE_FLOOR`/`_CEILING` range
  was never checked against this crowding figure, and owes its own fresh
  measurement before trusting it.
- **Story 6.7** (`STORY.md`) — the reversal condition for whether a
  selection needs to leave the topology region (ADR 0023's own trigger,
  left deliberately unfired at this story's Gate 1) is named as a condition
  this story's own live-update treatment may or may not fire, with the
  correct current location of the selection fact (the renderer, not a
  `useState`) stated precisely rather than approximately.

**One already-fired, unrecorded trigger found while shaping this story**
(carried from the original task brief) was recorded in
`MarketOverview.tsx`'s own docblock: the reversal trigger on `names`'
memo ("the first surface on this screen needing a second field from the
universe") fired silently at Task 6.3.3 (`equitySymbols` reading
`security.kind`) and was never recorded. Recorded now, along with the
honest finding that the comparison the trigger calls for was never taken
— left as a finding rather than repaired, since two narrow memos over two
different fields is not yet the shape the trigger exists to catch.

### An open decision reaching this close undecided, not a new finding

Task 6.4.2's own record flagged, and explicitly did not decide, that a canvas
node is now pressable while `canvas` elements still carry the browser's own
native `contextmenu` for free — a second, unauthored affordance on a surface
AC6 is explicit about having exactly one. It named this "worth a decision
somewhere in this story rather than here." No task after 6.4.2 — not 6.4.3,
not 6.4.4, not this one — took that decision. Grepped directly to confirm
rather than assumed: no mention of it in any task file after 6.4.2's own.
Recorded in `docs/GAPS.md` with an owner (the Product Owner, at this story's
own Gate 2) rather than decided unilaterally in this closing task, since it is
a product judgement about what a press on this surface should do, not a
correctness question this task is positioned to answer.

### `docs/GAPS.md`, `TOPOLOGY.md`, `CLAUDE.md`

- `docs/GAPS.md` gained a new entry (this task): the hover/selection
  readout had never shown a real band word on any machine. **Discharged in
  part hours later, by the same task**, while photographing an unrelated
  fix (below) against the real local store — the plate read `STZ /
ELEVATED`, `WMT / NORMAL` and `ADBE / HIGH`, none from an authored frame.
  The entry was struck and corrected rather than deleted: what remains
  unseen is `extreme` specifically and a mixed scored/unscored store, tied
  to the same deployed-store sitting Epic 5's own composite score already
  owes (`LIVE-REHEARSAL.md` row 5.6). A second, small correction: an
  existing entry's "strong candidate: Story 6.4" owner prediction (the
  topology legend's 390px absence) was checked and found NOT to have
  fired — this story's own focus treatment stayed inside the canvas's own
  frame rather than touching the region's header — recorded rather than
  silently left to mislead the next reader.
- `TOPOLOGY.md` gained a dated §0 correction and a new §4 closing
  paragraph, following the same minimal pattern Stories 6.2 and 6.3 used.
- `CLAUDE.md`'s Epic 6 status line now reads four of nine stories
  complete, with a new paragraph describing what a user can now do
  (hover, select, the one anchor, the keyboard tree walk, the accessible
  announcement, and the one real accessibility defect found and fixed). A
  stale "next six stories" reference inside the Story 6.2 paragraph was
  corrected to five, since interaction is no longer among the unbuilt
  encodings.

### Verification

Independent agents (not this orchestrator) ran the tester's end-to-end
pass, the BA's acceptance-criteria check against evidence, and the UX
architect's integrated-experience look. Both the tester's and BA's own
passes found this story's four feature tasks sound — all seven acceptance
criteria satisfied, with caveats recorded rather than hidden. **The UX
pass found two real defects nothing earlier in this story had caught**,
because it was the first look at the integrated experience on a store
holding real composite scores rather than at each task's own isolated
claim — both addressed in this same closing task rather than carried
forward or merely routed, since visual quality is this repository's own
acceptance criterion on the story that builds a screen, not polish
deferred to a later epic.

### Two defects found by the close's own UX pass, and what was done about each

**1. The readout plate was occluding real nodes — a reader could select a
security they could not see.** Measured: **14 securities hidden at 1440,
46 at 1024, 64 (12.7% of the universe) at 768, 0 at 390**, because the
plate's background was fully opaque and the canvas's own `fitView` has no
awareness that a card covers part of its box. **Fixed as a scoped
mitigation, not a full repair, and recorded honestly as such**: the
plate's background is now translucent (`color-mix(in srgb,
var(--surface-raised) 80%, transparent)`, the first translucency in this
codebase — grepped first, nothing else uses `color-mix`/`rgba`/alpha hex),
chosen by computing WCAG contrast at several opacities and finding the
plate's own type has far more headroom (6.14:1 at 80%, floor 4.5:1) than
node perceivability does (1.232:1 at 80%, against 1.000:1 fully opaque) —
turning the dial further buys almost nothing (1.377:1 even at 70%, which
starts eating into the type's own floor). **The two fuller repairs — carving
the plate's footprint out of the canvas's own fitted viewport, or moving
the plate into a reserved footer row below the canvas — were deliberately
not attempted in this closing task**: the first reworks `fitView`'s
symmetric centring and everything that reads it (pan clamp, zoom clamp,
`reviewport`), risking a visible shift in where the whole graph sits at
every width; the second changes the region's own height budget, which
`MARKET-OVERVIEW.md` §1.4's own trigger governs and which several prior
stories (5.4, 6.2) measured carefully against. `docs/GAPS.md` carries the
honest account with a named condition (the first of Stories 6.5–6.7 to
change what this canvas is fitted into) rather than a silent "fixed."

- **This also discharged, in part, the `docs/GAPS.md` entry this very
  task had written a few hours earlier**, claiming no machine or person
  had ever seen the readout plate show a real band. Photographing the
  occlusion fix against the real local store put `STZ / ELEVATED`, `WMT /
NORMAL` and `ADBE / HIGH` in the plate, none from an authored frame —
  struck and corrected in place rather than left standing, the same hour
  it was found wrong.

**2. The focus ring was nearly invisible in dense clusters** — measured by
the UX pass at **1.01:1** against neighbouring halos in `TECHNOLOGY`'s own
~20-node crowding, a defect Task 6.4.3 had flagged and routed to the
product owner as a "question about the treatment" rather than confirmed as
a real legibility failure. **Fixed as a genuine repair**: the ring is now
two-tone — the existing light stroke unchanged, plus a new 1px dark stroke
(`--ink-primary`) drawn just outside it — so at least one half contrasts
with whatever ground the ring happens to land on. Measured floor across
every ground the ring can sit on: **4.88:1** (an equity body, the worst
case), against the reviewer's 1.01:1. **Verified geometrically, not just
by measurement**: the outward-only placement means the light ring's own
inner edge — the one that shares Story 6.3's own 4-unit annulus — never
moved, so the ~5 px of clearance that annulus was built to guarantee is
unchanged by construction. A re-run of `scripts/topology-interaction-probe.mjs`
appeared to show the clearance dropping at two widths (1024, 768); **traced
to the probe's own centroid-based measurement being displaced by the wider
ring, not to a real geometry change** — confirmed with a control run (dark
stroke disabled) reproducing the prior figures exactly, and the instrument's
own `outer − inner` self-check disagreeing with the drawn stroke width at
the two widths that looked wrong. The instrument itself was not changed;
its own imprecision (present before this change too, just not visible)
is named rather than hidden.

### Gates

`pnpm typecheck`, `pnpm lint`, `pnpm format --check`, `pnpm links` — all
clean after every edit in this task, including the two code fixes above.
`pnpm invariants` — 81 hold. `pnpm --filter @marketpulse/frontend test` —
100 files, 1818 tests, all passed, no `Unhandled Errors` block. `pnpm e2e`
over the full topology battery at one worker — 27 passed, re-run clean
after the CSS fix landed (and again after a dev-server restart, since
CLAUDE.md's own documented trap is that a `composes:`-adjacent CSS change
does not reliably hot-reload). No test expectation was weakened to make
either fix pass — the keyboard spec's canvas assertions are digest
comparisons, which a wider ring is exactly built to tolerate. Full
`pnpm verify` results are in the Gate 2 report below.

## For a stakeholder — a status report, 2026-11-06

Story 6.4 is done: the market graph on `/` is no longer only a picture.
Point at any of its 516 nodes and a plate says what it is; click to mark
one and a real link appears to open its own page; the same thing works
with Tab and the arrow keys, with Enter to open and Escape to step back.
Someone using a screen reader gets the same capability, spoken aloud, not
a lesser version of it.

Along the way, two real defects were found and fixed before anything
shipped: a hit-test bug that would have made clicks miss on narrow
screens, and an accessibility bug that could silently drop a keyboard
reader's focus to the top of the page. Both were caught by review before
merging, not after.

What's honestly still owed: nobody has used this with an actual screen
reader yet, and nobody has watched a real, scored security (rather than a
simulated one) show up in the hover plate. Both are written down with an
owner and a plan, not quietly skipped.
