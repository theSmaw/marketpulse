# Task 2.14.3 — Where these numbers came from, on screen, per series

**Status:** Not started
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** 2.14.1, 2.14.2

> **Amended 2026-09-14 by Task 2.14.1.** Three things this task left open came
> back decided, and one of them moves the surface:
> [`PROVENANCE.md`](PROVENANCE.md) §1.3 puts the provenance on a **new
> `SourceNote` component at the foot of the Security Explorer**, not under the
> plots and not on `BarSeriesPanel`. `BarSeriesPanel`'s existing two-feed
> condition is **confirmed and untouched**. Retrieval time and the adjustment are
> **in**, and both are `SourceNote`'s. The task below is edited in place; the
> shape of the work is the same size, in a different file.

## Objective

Make the Security Explorer's numbers carry their own provenance: which feed each
source is, whether the prices have been adjusted, and — decided — when they were
retrieved. Ship the sentence for a series whose sources disagree about feed, even
though nothing can produce one yet.

**The vehicle is a new component, `SourceNote`**, one per screen, at the foot of
the region group, governed by §1.3's rule: **it states what the chrome cannot,
and never repeats what the chrome can.** That rule is what keeps it one line
instead of five, and it is the thing to check this task against — a clause that
restates the masthead does not belong in it.

This is the task acceptance criterion 1 turns on: _a user looking at any market
number can see which feed it came from, without hovering._

## What the user can see when this lands

**At the foot of the Security Explorer, the product says what has been done to
these prices and when they were fetched** — in words rather than an acronym, for
the first time on a screen that holds actual figures rather than a status strip.
The chrome has claimed a feed since Task 2.6.7; from here the **page** says the
three things the chrome can never say about a particular answer.

**Be accurate about the screenshot claim when reporting this**, because the
original phrasing overstates it and §1.2 says why: nothing short of a mark inside
the plot frame survives a crop, and that mark is refused. What lands is _on the
page with the number_, which is the form of the argument that survives.

## What is already decided and must not be re-taken

- **`MARKET_FEED_DESCRIPTIONS` owns the words.** Read them; do not re-word them
  here. A renderer deriving a user-facing sentence from a slug plus a table of
  its own is the copy that drifts, and the `Record<MarketFeed, …>` annotation on
  that record is the thing that makes a feed added without words a compile error.
  (It was `as const satisfies` until `sentence` became optional; the guard is
  unchanged, the spelling is not.)
- **A feed gets a sentence when its label cannot stand alone** (ADR 0019 §3).
  `IEX` does; `All US exchanges` does not. Inherited, not re-argued.
- **Provenance rides on the series and names a list of sources.** The existing
  code takes the **distinct feeds** from `series.provenance.sources`, which is
  the right shape: two sources naming one feed is one fact, not two.
- **Nothing here is red or green**, and `synthetic` keeps its amber, its square
  and its sentence.

## Work

- **Do not touch `BarSeriesPanel`'s condition.** It renders its feed line only
  when `feeds.length >= 2`, and §1.3 **confirmed** that: the panel is the right
  place to draw a mixed series when the series is mixed, and it correctly draws
  nothing when one page-level label is already true. Deleting it would leave
  `SourceNote` as the only reader of a fact the panel is better placed to show.
- **Build `SourceNote`** — `apps/frontend/src/components/SourceNote/`, with the
  assembly in `source-note.ts` as a pure function over the two views, so it is
  unit-testable with no DOM. Its clauses, in §1.3's table: the series' feeds
  (**only** when they number more than one, or when the one feed is not what
  `useMarketFeed` reports configured — both unreachable today and both true from
  Epic 3); the adjustment, always; the retrieval, always. Task 2.14.4 adds the
  fourth clause to this same component.
- **It renders nothing when `bars.length === 0`** — §0.1, and it is the rule that
  caught itself: `SOURCE_OF_NOTHING` hands a renderer a complete, truthful
  provenance record describing **zero bars**, and printing it under an empty frame
  is four accurate words making a false impression. This is a real state; it needs
  a story, not just an early return.
- **The two shared vocabularies go in `packages/shared/src/market-provenance.ts`
  in this task.** `ADJUSTMENT_DESCRIPTIONS` as a `Record<Adjustment,
ProvenanceDescription>` — `raw` → **Unadjusted** with _"Prices as they printed.
  Not restated for stock splits."_, `split-adjusted` → **Split-adjusted** with
  **no sentence**, which is ADR 0019 §3's rule doing work rather than being
  applied uniformly. `MarketFeedDescription` generalises to
  `ProvenanceDescription`; the feed name stays as an alias so the sentence rule is
  stated once rather than twice.
- **The adjustment is per series and the type already enforces it.** §4.1: it
  sits on `SeriesProvenance` and not on `BarSource`, and `mergeSeriesProvenance`
  refuses to join two. The trap the original bullet warned about — one fact
  repeated per source — has no day on which it is not. Do not render it per
  source.
- **Retrieval time, and the original warning is narrower than it was written.**
  It is stamped at fetch and **never re-stamped on read**, so for a fully-stored
  series it does not move between requests; it moves when a tail is fetched. Two
  consequences to honour anyway: it stays out of `Figures`' `settleSignature`,
  which deliberately excludes it so a refetch does not flash the panel, and
  `SourceNote` is **outside the panel's live region**, so a moved timestamp
  never announces a page as changed.
- **Write the two-feed sentence, and reach it honestly.** It goes in the module
  2.14.1 named. It is reachable from a **story** built on a body the fixtures can
  justify, and the story says in its own text that no server has yet sent one and
  why (Epic 3's IEX socket is the first). Do not hand-edit a recorded fixture
  into claiming a pairing no server produces — `stitched.json` names two sources
  that both name `sip`, and that is a fact about this plan rather than a gap in
  the corpus.
- **Invariant 6's fence.** With two feeds on screen the reader must not be able
  to conclude that one venue is the whole tape. That is a wording requirement on
  the _stitched_ sentence specifically, and it is the reason 2.14.1 forbade
  collapsing to whichever feed is first.
- **Stories for every permutation**, in a `SourceNote.stories.tsx` grid built the
  way `BarSeriesPanel`'s `AllPermutations` is — one grid, every state side by
  side, because a state outside the grid is a state nobody looks at twice. The
  states: one feed, two feeds, a feed that is not the configured one, both
  adjustments, and the **no-bars** case that renders nothing.
- **Component tests assert the concatenation a screen reader is handed**, not a
  single element's text: this panel splits its sentences across elements, and
  `CLAUDE.md`'s rule exists because of exactly that shape.

## Done when

- Every market number on `/securities/:symbol` has visible provenance without
  hovering, at the placement §1.3 settled and 2.14.2's canvas drew.
- **`SourceNote` repeats nothing the masthead says.** This is the acceptance test
  for §1.3's rule and it is read rather than asserted: put the two on one
  screenshot and check no fact appears twice.
- The two-feed sentence exists, names the split in contribution order with the
  bar counts, is reachable from a story, and its story says what cannot produce
  it yet.
- The no-bars case renders **nothing** and is in the grid as a state.
- `ADJUSTMENT_DESCRIPTIONS` exists with its `Record<…>` guard; adding a member to
  `ADJUSTMENTS` without words is a compile error.
- The grid covers every new state; `pnpm stories` passes.
- `pnpm probe /securities/NVDA --within Price` was run and **looked at** before
  any suite — the panel is the most crowded surface in the product and this task
  adds to it.
- `pnpm verify` passes and the frontend suite is green.

## Notes

The failure mode to watch for is not a bug. It is a screen that is now correct,
complete, honest and unreadable. If the probe screenshot shows four grey
sentences stacked at the foot of the page, the fix is in 2.14.2's canvas, not in
a `font-size`.

The second failure mode is subtler and §1.3's rule exists for it: a note that
restates the masthead. `Market feed: All US exchanges` appearing twice on one
screen is not redundancy a reader forgives — it teaches them that the small type
is not worth reading, which is the harm ADR 0019 §3 turned on.
