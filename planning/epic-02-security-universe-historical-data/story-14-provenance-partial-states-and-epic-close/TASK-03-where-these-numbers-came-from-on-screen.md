# Task 2.14.3 — Where these numbers came from, on screen, per series

**Status:** Not started
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** 2.14.1, 2.14.2

## Objective

Make the Security Explorer's numbers carry their own provenance: which feed each
source is, whether the prices have been adjusted, and — per 2.14.1's decision —
when they were retrieved. Ship the sentence for a series whose sources disagree
about feed, even though nothing can produce one yet.

This is the task acceptance criterion 1 turns on: _a user looking at any market
number can see which feed it came from, without hovering._

## What the user can see when this lands

**Under the price and volume, the product says where those numbers came from
and what has been done to them** — in words rather than an acronym, for the
first time on a surface that holds actual figures rather than a status strip.
The chrome has claimed a feed since Task 2.6.7; from here the _chart_ does, and
a screenshot of it carries its own provenance.

## What is already decided and must not be re-taken

- **`MARKET_FEED_DESCRIPTIONS` owns the words.** Read them; do not re-word them
  here. A renderer deriving a user-facing sentence from a slug plus a table of
  its own is the copy that drifts, and the `satisfies` on that record is the
  thing that makes a feed added without words a compile error.
- **A feed gets a sentence when its label cannot stand alone** (ADR 0019 §3).
  `IEX` does; `All US exchanges` does not. Inherited, not re-argued.
- **Provenance rides on the series and names a list of sources.** The existing
  code takes the **distinct feeds** from `series.provenance.sources`, which is
  the right shape: two sources naming one feed is one fact, not two.
- **Nothing here is red or green**, and `synthetic` keeps its amber, its square
  and its sentence.

## Work

- **Change the condition, not the shape.** `BarSeriesPanel` renders its
  provenance line only when `feeds.length >= 2`, which was a correct decision on
  the day — with one feed the line repeated the chrome — and which 2.14.1 has now
  either confirmed or overturned. Implement what it decided, and if the line
  becomes unconditional, the chrome's line and the panel's line must not read as
  the same sentence printed twice.
- **The adjustment disclosure**, in the words and at the grain 2.14.1 settled.
  It is on every source, on the wire, and rendered nowhere today. Watch the trap
  named in that task: on this plan every source carries the same adjustment, so a
  per-source rendering is one fact repeated until the day it is not.
- **Retrieval time, if 2.14.1 said so**, and if so read its warning first — a
  retrieval timestamp changes on **every request**, so anything that renders it
  is a value that changes when nothing about the market did. Decide what that
  does to the live region before it announces a page as changed because a
  timestamp moved.
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
- **Stories for every permutation**, in `BarSeriesPanel.stories.tsx`'s existing
  `AllPermutations` grid rather than beside it — the grid is the review surface
  and a state outside it is a state nobody looks at twice.
- **Component tests assert the concatenation a screen reader is handed**, not a
  single element's text: this panel splits its sentences across elements, and
  `CLAUDE.md`'s rule exists because of exactly that shape.

## Done when

- Every market number on `/securities/:symbol` has visible provenance without
  hovering, at the prominence 2.14.2's canvas chose.
- The two-feed sentence exists, is reachable from a story, and its story says
  what cannot produce it yet.
- The `AllPermutations` grid covers every new state; `pnpm stories` passes.
- `pnpm probe /securities/NVDA --within Price` was run and **looked at** before
  any suite — the panel is the most crowded surface in the product and this task
  adds to it.
- `pnpm verify` passes and the frontend suite is green.

## Notes

The failure mode to watch for is not a bug. It is a panel that is now correct,
complete, honest and unreadable. If the probe screenshot shows four grey
sentences stacked under a chart, the fix is in 2.14.2's canvas, not in a
`font-size`.
