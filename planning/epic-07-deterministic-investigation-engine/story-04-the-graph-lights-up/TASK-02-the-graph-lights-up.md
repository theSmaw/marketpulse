# Task 7.4.2 — The graph lights up

**Status:** Not started
**Story:** [7.4 The Graph Lights Up](STORY.md)
**Depends on:** 7.4.1

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
  reversal trigger (*"the first prop this region takes that changes at feed
  cadence"*), and while a `WorkspaceCommand` does not change at feed cadence,
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
    / --within "Market topology"` at all four widths with *filtered-landmark*,
    *not-a-peer*, and *unscored* all visible at once, against a store that
    has run the composite pass (so real bands are drawn — CI's zero-bar store
    draws every equity `unscored` and hides this collision entirely). If the
    three are not visually distinguishable, this story's visual approach
    needs a non-ink carrier (shape/weight/word per the standing rule — never
    a second hue) before it ships, not after.
  - Instant both ways — arrival and clearing (no fade, no decay, no
    transition), for consistency with every other state change this renderer
    already draws (selection, filter, band update) and because "a fact
    arriving decays" is about a *mark* fading while the fact remains, not a
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

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
