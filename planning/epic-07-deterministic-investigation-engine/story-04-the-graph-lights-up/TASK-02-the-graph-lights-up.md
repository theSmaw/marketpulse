# Task 7.4.2 — The graph lights up

**Status:** Complete — 2026-11-26
**Story:** [7.4 The Graph Lights Up](STORY.md)
**Depends on:** 7.4.1 (complete, PR #711 — read its amendments below before
starting; the shipped shape differs from this task's original draft in two
load-bearing ways)

## Objective

This is the story's headline moment: the first time starting an investigation
on one page visibly changes another. Task 7.4.1 built the pipeline that
delivers a validated, permitted, recorded `WorkspaceCommand` to the browser;
this task makes it actually draw.

## What the user can see when this lands

Press `Investigate` on `/securities/NVDA`, let the peer-comparison step
complete, navigate to `/`. NVDA's sector peers (and its sector ETF, and any
correlated equities) are highlighted on the market topology graph; every
other equity is visibly de-emphasised. The subject itself is in the
highlighted set, named in the accompanying note.

## Work

- **The cross-route holder, in `App.tsx`.** `App.tsx` already sits outside
  `<Routes>` and already threads `liveFeed`/`marketFeed`/`onLiveSymbols` into
  both routes for exactly this reason. Add a holder for `{ investigationId,
command }`, filled via `useInvestigation` reporting each decoded
  `WORKSPACE_COMMAND` upward through a new callback prop (mirroring
  `onLiveSymbols`'s existing shape) — **never** lifting the checklist itself,
  which stays pinned to the security page per Story 7.1's own decision.
  `MarketOverview` reads the holder.
- **`MarketTopologyHandle.setHighlight(symbols)` / `clearHighlight()`** (or
  one nullable-argument method) — the exact precedent set by `setBands`,
  `markBurst`, `setObservations`: imperative, no-op while nothing is mounted,
  called from `MarketOverview`'s own effect reading the `App.tsx` holder.
  **Do not** pass the command as an ordinary prop to `MarketTopology` — that
  would be a fifth evaluation of the declined `React.memo` boundary's
  reversal trigger (_"the first prop this region takes that changes at feed
  cadence"_), and while a `WorkspaceCommand` does not change at feed cadence,
  the imperative route keeps the boundary closed by construction rather than
  reopened. Write the fifth evaluation down in the component's own docblock
  alongside the prior four.
- **The holder replays its latest command to a topology that mounts later** —
  a reader presses `Investigate`, then navigates to `/` a few seconds after.
  Same "told again, for the same node" clause `setBands`/`setObservations`
  already carry.
- **The visual treatment: complement de-emphasis.** Dim the non-peer
  equities; add **zero** new ink to the peers themselves. Reuse an
  **already-declared** achromatic ink step — the same value Story 6.8's
  landmark-filter de-emphasis or the `unscored` hollow outline already
  spends — rather than minting a new token (no ADR-0026 canvas round-trip
  needed for reuse; one would be needed for a new value step). Four rules
  travel with it:
  1. The fifteen landmark nodes (sector ETFs, proxies, hub) are excluded from
     the highlight encoding entirely — Story 6.3's own exclusion set, reused
     verbatim.
  2. A de-emphasis never dims a measured anomaly band — an `elevated`/`high`/
     `extreme` ring and the `extreme` recoloured fill draw at full strength
     regardless of highlight state.
  3. A node already hidden by the reader's filter stays hidden; the highlight
     adds nothing on top of a filtered-out node (Task 7.4.4 states the count).
  4. Selection and focus are untouched; the highlight never moves either.
  - **Before this is accepted, probe the collision the technical architect
    flagged**: Story 6.8 already ships a de-emphasised treatment for a
    landmark whose sector is filtered out, described as "structurally
    unconfusable with the existing hollow `unscored` state." Run `pnpm probe
/ --within "Market topology"` at all four widths with _filtered-landmark_,
    _not-a-peer_, and _unscored_ all visible at once, against a store that
    has run the composite pass (so real bands are drawn — CI's zero-bar store
    draws every equity `unscored` and hides this collision entirely). If the
    three are not visually distinguishable, this story's visual approach
    needs a non-ink carrier (shape/weight/word per the standing rule — never
    a second hue) before it ships, not after.
  - Instant both ways — arrival and clearing (no fade, no decay, no
    transition), for consistency with every other state change this renderer
    already draws (selection, filter, band update) and because "a fact
    arriving decays" is about a _mark_ fading while the fact remains, not a
    rule about disappearance.
- **The note.** The region's existing population note names the subject and
  the relation (e.g. "Highlighting NVDA's 73 Technology peers"), through the
  one existing builder with two renderings (`topologyFilterWords` or its
  sibling) — never a second, independently-written string. The subject
  security gets no distinct treatment from its peers (it is in the set, named
  in the note — giving it the selection disc or a seventh mark both lie about
  what the reader did).

## Done when

1. Investigating a Technology equity on `/securities/:symbol`, then
   navigating to `/`, shows the sector peers highlighted and the rest of the
   market de-emphasised, with no coordinates ever having crossed the wire.
2. The treatment is visually distinguishable from `unscored` and from
   Story 6.8's filtered-landmark de-emphasis, verified by `pnpm probe` at all
   four widths against a store with real composite scores, with the
   screenshots kept as evidence.
3. `MarketTopology`'s declined `React.memo` boundary docblock records this as
   its fifth evaluation, unfired, with the reasoning.
4. A command arriving before the topology mounts is replayed correctly once
   it does.
5. Landmarks never participate in the highlight encoding, proven by a test.
6. `pnpm verify` and the relevant e2e specs are green.

## Amended by Task 7.4.1 — 2026-11-26: the shipped wire shape differs from this task's draft in two load-bearing ways

Task 7.4.1 shipped (PR #711, fixed up in a reviewed follow-up commit
`cf235073`) a real `packages/shared/src/workspace-command.ts` and a real
`WORKSPACE_COMMAND` event payload. Read both before writing any frontend
code — this task's own text above still describes the shape as originally
briefed, not as built.

1. **The event carries an `outcome`, not a bare `command`.** `InvestigationEvent`'s
   `WORKSPACE_COMMAND` member is `{ type, seq, investigationId, stepId,
outcome: WorkspaceCommandOutcome }`, where `WorkspaceCommandOutcome` is
   `{ kind: "permitted"; command: WorkspaceCommand } | { kind: "refused";
because: WorkspaceCommandRefusal }` — mirroring `TOOL_CALL_COMPLETED`'s own
   field name. This is because Gate 1 requires a refused command to be an
   observable, countable outcome on the wire, which a field typed
   `command: WorkspaceCommand` cannot express. **The `App.tsx` holder and the
   `useInvestigation` callback this task's Work section describes must carry
   `outcome`, not `command`**, and must do something sensible with a
   `refused` arm (the simplest correct behaviour: treat it exactly like "no
   command yet" — no highlight, no error surfaced on `/`, since the refusal
   belongs to the investigation surface that asked, per `STORY.md`'s own
   Resolved-at-Gate-1 record of the degraded-state table). The frontend
   decoder (`apps/frontend/src/investigations/investigation-event.ts`)
   already parses both arms — read it rather than re-deriving the shape.
2. **The subject is NOT a member of `symbols`, and this task's "What the
   user can see" sentence above is wrong about that.** `HighlightNodesCommand`
   is `{ type: "highlightNodes"; symbols: readonly [Ticker, ...Ticker[]];
relations: readonly [TopologyEdgeKind, ...TopologyEdgeKind[]]; subject:
Ticker }`, with `subject` **structurally excluded** from `symbols` and
   validated as such at the decode boundary (`readWorkspaceCommand` refuses a
   command where `subject` appears in its own `symbols`). So: **the highlighted
   set this task draws is `{subject} ∪ command.symbols`, not `command.symbols`
   alone** — draw the subject exactly as any other member of the set (no
   distinct treatment, which the Work section already correctly says), but
   construct the set to include it explicitly rather than assuming the wire
   already does.
3. **`relation` (singular) is `relations` (plural, non-empty), in
   `TOPOLOGY_EDGE_KINDS` declaration order.** The common case is a set
   spanning more than one relation kind at once (Story 6.5/6.6's own measured
   ~82–84% same-cluster-overlap figure means a technology equity's highlight
   routinely mixes `sector_membership` and `return_correlation`), so the
   note this task builds must read `command.relations` as a list and phrase
   accordingly (e.g. "sector peers and correlated securities" rather than
   assuming one word covers it) — `get_related_securities`' own per-symbol
   `RelatedSecurity.relations` field (server-side, not on the wire) is where
   a future per-node phrasing would come from if ever needed; this task does
   not need it for the set-level note and complement treatment Gate 1
   settled on.

None of this changes what this task visually builds (complement
de-emphasis, the note, the `setHighlight`/`clearHighlight` imperative
pair, the fifth `React.memo` evaluation) — it changes the exact field names
and the one assembly step (`{subject} ∪ symbols`) the implementation must
get right against the real wire shape rather than the drafted one.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

## What was done — 2026-11-26

### The path, end to end

`useInvestigation` → `SecurityExplorer` → `App` → `MarketOverview` →
`MarketTopologyHandle.setHighlight` → `TopologyRenderer.setHighlight`. Six
links, each the shape this tree already uses for the same kind of fact.

- **`use-investigation.ts` surfaces a value, not a callback** —
  `WorkspaceHighlightCommand | undefined`, read off the stream beside the
  reducer (which has a `WORKSPACE_COMMAND` case that returns its input
  unchanged, deliberately: this event is a side channel). The shape follows
  `onLiveSymbols`/`onLiveFocus`' established division — the hook answers a
  value, the route reports it upward from an effect — because a callback
  **parameter** on the hook would have to be stable or it would re-run the
  subscription.
- **It is NOT subject-pinned**, unlike the checklist, and that is the one
  asymmetry worth knowing: navigating is how a reader reaches the screen that
  draws this, so a command withdrawn on a symbol change would be a feature
  with no reachable state. The `SecurityExplorer` effect has **no cleanup**
  for the same reason, and never reports an absence — what clears a highlight
  is Story 7.4's AC 8 and Task 7.4.3's.
- **A refused outcome is decoded and not surfaced.** It leaves the value
  exactly as it was, which is byte-identical to _no command yet_ — Gate 1's
  degraded-state decision, with a stated reversal trigger (_the first surface
  that is supposed to tell a reader a command was refused_).
- **`App.tsx` holds `WorkspaceHighlightCommand | undefined`** — the fourth
  instance of an existing mechanism, not ADR 0023's trigger firing.

### The treatment, and the ink step is a measurement

Complement de-emphasis, through one new palette field — **`equityMuted`,
`--chart-seam`** — and one new pure module, `topology/highlight.ts`, holding
the set assembly (`{subject} ∪ symbols`), the four rules and the words.

**`landmarkMuted` was NOT reused, and the reason is a measured direction.**
A landmark's base ink is `--ink-primary` (17.08:1 on the panel ground), so
`--ink-secondary` (9.32:1) is a step _quieter_ for it; an equity's base is
`--chart-volume` (**3.51:1**), and the same token on an equity is a step
**louder** — a de-emphasised equity would be the most emphatic mark in its own
cluster. Exactly two declared achromatic steps are quieter than the equity
fill: `--chart-seam` (**1.70:1**) and `--chart-grid` (**1.27:1**). The second
is the membership hairline's own ink, which 501 of these nodes sit on, and it
is in the band this repository's greyscale rule calls _hue is the entire
difference_. So `--chart-seam` is the one step between the equity fill and the
gridline. WCAG 1.4.11's 3:1 floor does not fire — `correlationEdge`'s recorded
reason, a node declared irrelevant is not a control — and ink is not the sole
channel: the note is the _word_.

**Size is deliberately not a second channel here**, unlike Story 6.8's muted
landmark: that population is eleven marks a reader must still target (walking
out of a narrowed sector goes through them), this one is ~500 marks whose job
is to recede, node size encodes KIND on this canvas, and `clampNodeScale`'s
floor already puts an equity at 4 px.

The four rules are one pure function, `topologyHighlightTreatment`, with its
own tests: landmarks never participate (in the set or out of it), a measured
`extreme` is never dimmed, nothing is quiet while no command is in force, and
the complement only. `bodyQuiet`/`bodyUnscoredQuiet` are two more arrays in
the renderer's existing partition — **there is no `bodyExtremeQuiet`, which is
what makes rule 2 unrepresentable rather than guarded.**

### Done when — against the amended list

1. **Met.** The journey is a new e2e spec,
   `e2e/specs/overview-investigation-highlight.spec.ts`: press `Investigate`,
   wait for the compare step's own **duration** (the rows are painted
   client-optimistically, so the row's presence proves nothing), click
   `Market Overview`, read the note. The no-coordinate half drives the real
   backend directly (`POST /investigations` then the SSE route, which
   terminates its response after the terminal event) and asserts the real
   frames carry no `"x"` and no `"y"`.
2. **Met, with one honest limit.** `pnpm probe --story
components-markettopology--highlighted-peers` and `…--highlighted-peers-
narrowed`, four widths. The three treatments are distinguishable — a
   filtered landmark is a small **dark square**, a non-highlighted equity a
   full-size **pale filled circle**, `unscored` the full-size pale **hollow**
   one; opposite directions of value step, different shapes, disjoint
   populations. **The limit**: on a fully-scored market ~67% of equities carry
   a ring rule 2 forbids dimming, so the complement reads clearly at 6× and
   **subtly at 1×**, and at 390 the note is doing most of the work. Recorded,
   not smoothed.
3. **Met.** The fifth evaluation is in `MarketTopology.tsx`'s module docblock,
   unfired, with a reason of its own beyond the first four: a command does not
   change at feed cadence at all, so a prop would have been _safe_ by the
   trigger's wording while making this region's prop surface the place the
   next author reaches for the fact that does move.
4. **Met, with a real test.** `appliedHighlight` is held across the `loading`
   state and applied **inside the mount effect** — not through a mount option,
   because `invalidate()` coalesces into the one `requestAnimationFrame`
   `measure()` has just scheduled, so the held command lands on the canvas's
   **first drawn frame**. Two tests: a command before any mount, and a
   re-mount from a fresh universe.
5. **Met, with a test** (`use-investigation.test.ts`): a refused outcome leaves
   `highlight` undefined, the run completes normally, and nothing is drawn.
6. **Met, with tests** over `topologyHighlightTreatment` — every sector ETF,
   both named and unnamed, and the proxies.
7. **`pnpm verify` green** (100 invariants). **No new invariant and therefore
   no break owed.** It RELIES on two existing ones:
   `no-second-affordance-on-a-topology-node`, which reads every non-comment
   line under `topology/` and `components/MarketTopology/` for the name of the
   thing that produces this command — so `TopologyHighlight` carries no
   investigation id and the note names none; and
   `a-permitted-command-is-minted-only-by-the-permission-stage`, unchanged. The
   candidate new check — _a highlight reaches this region only through
   `setHighlight`_ — is held instead by the producer-side test the three
   earlier memo evaluations are held by, which is this file's own precedent.
8. **Partly met, and the gap is named.** The e2e specs could **not be run**:
   this machine has no Docker and no local PostgreSQL, so no pair can be
   started and `pnpm e2e` has no backend to drive. CI is the first execution of
   the new spec. Everything below a browser was run and is green.

### Found while building, and repaired

**A real layout defect, found by `pnpm probe` and by nothing else.** The
highlight note was drafted at the top-**right** corner — the one corner Story
6.8's filter note and Story 6.4's readout plate leave free — capped at half the
frame. Clear at 1440, 1024 and 768; at **390** the frame's content box is
308 px, the note wraps to three lines, and it landed **over the filter note's
text and over its `Show all` link**. A control occluded by a paragraph is
worse than either note being absent. The two notes are now one
absolutely-positioned column (`.notes`, top-left), which cannot overlap at any
width by construction; `.filterNote`'s own position moved up to the column and
its drawn position while no command is in force is unchanged.

### What no gated machine and no person has seen

The **ink**. CI has zero bars and no composite generation, so every equity
draws `unscored` there for ever and the complement is one faint hollow outline
against another; the deployment is the only machine that would draw the real
thing, and nobody has watched it. Both probed pictures are **Storybook**
against the recorded 518-security fixture, driven through a wrapper that calls
the real handle — not a route, and not a real investigation. And no screen
reader has heard the clause, which is Gate 1's own decision (no announcement;
the fact lives in the structural sentence, read on demand) rather than an
omission — `docs/GAPS.md`'s standing screen-reader section is where that sits.
