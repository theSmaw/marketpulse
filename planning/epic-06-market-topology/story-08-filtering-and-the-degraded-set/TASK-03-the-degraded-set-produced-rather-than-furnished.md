# Task 6.8.3 — The degraded set, produced rather than furnished

**Status:** Not started
**Story:** [6.8 Filtering, & the Degraded Set](STORY.md)
**Depends on:** 6.8.1 (the degraded grid must know what a filtered state looks
like, even though filtering itself is orthogonal to degradation)

## Objective

CI's store has 516 securities, zero bars, no provider and no composite
generation — not an edge case this epic can defer, but the permanent state
every gated run is in, and the state a reviewer sees first. This task makes
that state, and the other ways the topology's own two requests and one
aggregate section can come back thin, honestly distinguishable from each
other and from a bug — through the real socket, decoder and store wherever
that is possible, with the one genuine exception named rather than built.

## What the user can see when this lands

Nothing new on a healthy store. On a thin one — no provider, no bars, a
quiet aggregate, an unreachable backend, a stale rollback missing its band
section, a failed correlation fetch — the topology says plainly what it does
and doesn't know, never reading as a region nobody built, and never silently
restating a fact the status bar or the source note already own.

## Work

- **A new sibling e2e spec** for the topology's own degraded states —
  deliberately not more rows in `overview-degraded-grid.spec.ts`, whose own
  documented flakiness-under-load history (now at seven sessions and no
  longer reliably cleared by `--workers=1` alone) and nine-surface key make a
  third axis the wrong place to add weight. Reuse its machinery (declared
  collision classes, asserted in both directions; a plant per channel per
  row) rather than its file.
- **AC5's rewritten states, each classified produced or named unproducible**:
  - the whole market (already covered, unfiltered);
  - one sector (Task 6.8.1, reused here as a cross-check rather than
    re-built);
  - a store with no bars — `pnpm store:bare` for a whole-run shape, or
    within one run: the relationships route aborted/empty plus no
    `anomalyBands` section;
  - no provider — `serveFeed(page, { feed: null })`;
  - the aggregate arrived carrying nothing — the existing `CI_SHAPE`/
    `RESTARTED_REPLICA` furnished shapes;
  - the backend unreachable — route-level refusal
    (`page.route(..., r => r.abort("connectionrefused"))`), never killing the
    real backend process, which would poison every later spec in the run;
  - an aggregate whose `anomalyBands` section is absent — produced, a real
    rollback frame;
  - a relationships response that failed or answered a shape the decoder
    refuses — produced, reusing the existing `failed` sentence;
  - the region removed from the bundle entirely — **named unproducible**, in
    this spec's own `ENUMERATED_AND_NOT_PRODUCED`, alongside "a region whose
    content threw." No byte this harness can send removes a shipped region
    from a bundle.
- **The declared collision class** (AC6): assert, in both directions, that a
  store with no bars, no provider, and the aggregate carrying nothing draw
  the identical picture and sentence inside this region — and that every
  other state stays distinct from all three and from each other. Name the
  real differentiators (the status bar's connection word, the source note's
  provider line) as living elsewhere, not as a gap.
- **Closes Task 4.7.11's routed hand-off**: confirm whether "a degraded
  region reads as one nobody has built" is now discharged (only
  `Current investigations` remains a badged hatch on `/`) or still live, and
  make the degraded topology's own failure state (white ground, sentence,
  `Try again` where retrying is worth offering, a correlation id) visibly
  distinct from `Panel`'s `reserved` hatch — never borrowing it.
- **Fixes the pre-existing defect found while shaping**: the correlation
  layer is suppressed below `TOPOLOGY_SECTOR_LABEL_MIN_SCALE` at three of the
  four widths this product tests, but the accessible sentence is width-blind
  and states a pair count regardless. Make the sentence (or the suppression)
  width-aware, since this is exactly AC7's subject.
- **`pnpm probe`** at all four widths, with the Task 6.8.1/6.8.2 filter
  controls present, across the degraded states above — this spec is text and
  cannot see a layout; the probe is the only instrument for "one height in
  every state," per this repository's own standing rule.

## Done when

1. The new sibling spec exists, passes, and covers every AC5 state above as
   produced or explicitly unproducible.
2. The collision class for no-bars/no-provider/aggregate-carrying-nothing is
   asserted in both directions and documented as a deliberate, accepted
   exception to AC6 rather than a silent gap.
3. The degraded-vs-deferred hatch question is answered in writing, with
   evidence.
4. The width-blind correlation-sentence defect is fixed and covered.
5. `pnpm probe` results at all four widths are recorded, across the degraded
   states and with an active filter.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
