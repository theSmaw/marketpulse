# Story 6.7 — Live Updates, & the Graph That Stays at 60 FPS

**Status:** Not started
**Epic:** [Epic 6 — Market Topology](../EPIC.md)
**Depends on:** 6.6
**Epic scope covered:** Live visual updates

## Description

**This is the story where the graph becomes alive**, which `PRODUCT_SPEC.md` §5.6
makes a product requirement rather than polish: _"It must feel alive. This is a
market application; a screen that updates by silently swapping text is
technically correct and feels dead."_

**It is also where §28's one unmet target gets measured.** _500 nodes / 5,000
edges: 60 FPS during normal interaction on a representative laptop_ has been in
the specification since the beginning and no figure has ever been taken, because
nothing rendered.

**Two measured facts make this harder than it sounds.** `/` commits **2 renders
per applied batch** at the feed's measured **6.8–16.1 batches a minute** —
**13.6–32.2 renders a minute** — and every overview frame is a new object
reference, so the host component re-renders whether or not any graph datum
changed. And the feed delivers bars **as one burst a minute** rather than
smoothly, which is the shape Story 3.6 found for the universe table: 518 rows
changing at once, then 59 seconds of nothing.

**The motion vocabulary is already decided and this story inherits it rather
than inventing one**: _work in progress LOOPS, a state PERSISTS, a fact arriving
DECAYS_ — and the arrival mark fires when **a bar arrives**, not when a price
changes, because it says _a bar arrived for this security_ rather than _this
price moved_. `an-arrival-mark-is-keyed-on-the-arrival` now fails the build on
a mark keyed on anything else, over every shipped source file in three trees.

## What the user can see when this story lands

**The graph moves on its own.** Nodes change as their securities do, a bar
arriving is marked, and the picture stays smooth while it happens.

## Acceptance criteria

1. **60 FPS at 500 nodes and 5,000 edges during pan and zoom**, measured on a
   production build on a representative laptop, with the load read **before**
   each run. §28's target, taken for the first time.
2. **No routine main-thread task over 50 ms**, on **three channels**, each
   proved by a plant on the page that produced the figure — because a channel
   going quiet and a cost going away produce the same output, and `longtask`
   alone can no longer see this product's existing breach.
3. **A burst is absorbed.** The feed delivers one burst a minute; the graph must
   not stutter once a minute. Measured against the real cadence, and the cadence
   is **furnished** if no offline source produces it — said beside the figure,
   every time.
4. **The arrival mark keeps its shipped meaning.** It fires on a **bar
   arriving**, keyed on `arrivalKey`'s answer — the observation's own content —
   and never on the score, which is now the node's only figure and therefore the
   cheapest thing for the next author to reach for.
5. **Reduced motion is honoured.** Under `prefers-reduced-motion` the decay does
   not run and what survives is the state, which is the rule the identity
   block's disc already follows and a browser asserts.
6. **The graph does not re-layout under live data.** Positions are deterministic
   (6.1) and a node that moved because its score changed is a different claim
   from a node that moved because the layout re-ran. The securities table
   **never re-orders** under live data — chosen, and asserted — and the same
   argument applies with more force to a spatial surface.
7. **A node that stops being heard from is honest about it.** The feed's median
   per-symbol minute coverage is **65.1%**, worst case **2.1%**, so at any
   instant a third of the graph has not been heard from recently. An **age
   rather than a verdict** is this product's rule, with no threshold and no
   connection word.

## Open decisions — for the Product Owner

1. **What moves when a node updates?** The band changing colour is the minimum.
   A decaying arrival mark per node at 516 nodes is 516 animations; the chart
   layer's answer at that scale was **one** path rather than one element per bar,
   and the same arithmetic applies.
2. **Does the graph show staleness per node, or not at all?** Six surfaces
   announcing one fact is how two of them come to disagree, and the connection's
   one home is the status bar — but a node is a _security_, and a stale security
   is a per-node fact rather than a connection fact.

## Out of scope

Filtering and the degraded set (6.8), the synthetic 5,000-node mode — that is
Epic 14's, and §27 says so.

## Handed here by Story 6.4's close — 2026-11-06: the reversal condition for whether a selection leaves the topology region, named in advance and aimed at this story

**Story 6.4's Gate 1 decided a selected node is local to the topology
region only — it does not filter `Unusual activity`, `Movers`, or anything
else on `/`, and ADR 0023's reversal trigger (_the first piece of state two
features must agree about that neither owns_) was left deliberately
unfired.** That decision carries its own stated condition for revisiting
it, written into Story 6.4's own `STORY.md` rather than only argued in
passing: **the first story in which two regions on this screen must agree
about which security the reader is looking at.**

**This story is the most likely one to fire it, by its own subject.** Live
updates change what a node looks like while a reader may be looking at one
in particular — if this story's own per-node staleness/arrival treatment
(Open Decision 2 above) ever needs to know _which node the reader currently
cares about_ to do something sensible with it (dimming everything else
while one node updates, say, or pausing a decaying mark on the selected
node specifically), that is exactly the shape of two regions needing to
agree about one security that neither owns. **Read Story 6.4's own
selection mechanism before assuming a new one is needed**: the selection
itself lives in the RENDERER (`let selected`, `renderer-canvas.ts`) —
deliberately not in React state, because the renderer needs it anyway to
draw the selection's own ground disc — and is reported out through
`TopologyRendererOptions.onSelect`. `MarketTopology.tsx` holds only a
**derived** value in `useState<Ticker | null>` (`openable`, the answer to
"is this symbol currently the one real anchor should point at," built by
`topologyOpenableSymbol` from the renderer's report), never the selection
itself. If this story needs the selection from outside `MarketTopology`,
the question is whether to lift the RENDERER's own fact up (to
`MarketOverview.tsx`, or further) rather than to invent a second selection
mechanism alongside it — a second home for the same fact is exactly how
two selections come to disagree, which is the whole reason Story 6.4 kept
the renderer as the one owner in the first place. If this story's own
live-update treatment does NOT need to know the selection, say so
explicitly and leave the condition unfired for the next story — the
trigger is a condition, not a deadline, and firing it without a real need
is the thing Story 6.4's own Gate 1 declined to do.
