# Task 4.1.3 — The two regions that were waiting for a shape

**Status:** Not started
**Story:** [4.1 The Decisions & the Overview Shell](STORY.md)
**Depends on:** 4.1.2

## Objective

**The first visible change this epic makes**, and it is one Task 1.5.4 wrote
down as this epic's to make:

> _"§8.1 lists two contents §9's sketch does not place — the index/ETF summary
> and sector performance. They are deliberately not given regions of their own:
> where they belong is a question about their shape, and Epic 4 is the first
> thing that will know it. Adding two more empty boxes now would be guessing."_

Task 4.1.2 answered the shape question on the canvas. **This task builds the
two regions**, deferred honestly, in the grid the canvas drew.

## What the user can see when this lands

**The landing page grows two regions** — one for the index and ETF summary, one
for sector performance — each naming what fills it and when, in the same voice
the three existing deferrals use.

**It is a small change and it is the first real one**: the screen stops being
§9's sketch minus two things and becomes §9's sketch.

## Work

- Two `Region`s added in the positions the canvas decided, at all four widths
- Their `filledBy` sentences written to the existing idiom — **naming the story
  that fills them**, which for both is this epic's own 4.2 and 4.3
- The grid's spans **restated at every breakpoint that narrows it**, because an
  item wider than its explicit grid grows implicit columns and looks identical
  in every test below a browser
- `pnpm probe` at 1440, 1024, 768 and 390, read rather than filed

## Done when

1. Two regions render in the canvas's positions at four widths
2. Neither sentence points at a control that does not exist — the repair this
   product already made once, when a defaulted search note invited a reader to
   use a control that had just said it was unavailable
3. `pnpm probe`'s resolved grid tracks match what the canvas drew

## Amended by Task 4.1.1 — 2026-09-25: this task also removes the paragraph that says it twice

**There is a fifth surface above the four regions**, and nothing owned it: a
`Placeholder` whose prose describes the whole screen — _"index and ETF
summaries, an unusual activity feed, market breadth, sector performance and the
topology. Epic 4 builds it on live data, Epic 5 scores the anomalies in it and
Epic 6 draws the topology."_

**That is the same claim the four `filledBy` sentences make, in one more
place.** Today it is harmless, because everything below it is a deferral and
the paragraph summarises four deferrals. **The moment this task adds two real
regions it becomes a paragraph describing a screen that no longer matches it**
— and one fact with two homes is the defect this product has shipped twice, in
a chrome cell and in a ledger, both inheriting a word that had stopped being
true.

**So the paragraph goes in this change**, not in 4.1.4's. What survives it is
the `Region`s' own sentences, which are per-region, specific, and already the
established idiom.

## Amended by Task 4.1.2 — 2026-09-25: three regions, not two, and two of them defer to a story rather than to an epic

**Drawing the screen found a third region with no home in §9's sketch: the
movers.** Epic 4's scope lists top gainers and losers; §9 does not place them,
and Task 1.5.4's deferral named only the index summary and sector performance.

> **They could have gone in the unusual-activity region's place** — it is empty,
> and a ranked list of big movers looks like a ranked list of unusual ones.
> **Story 4.5 already names that as the trap**: _unusual is not largest_. On the
> one screen whose job is explaining what this product does, a mover list
> standing in for an anomaly feed teaches a reader the wrong thing about it.

**So this task adds three regions**, in the positions
`Market overview.dc.html` §01 places them:

| Region                                      | Where                                                | Filled by     |
| ------------------------------------------- | ---------------------------------------------------- | ------------- |
| **Market summary** — the four index proxies | a full-width strip at the very top, `span 12`        | **Story 4.2** |
| **Sector performance**                      | the primary column, under the reserved topology band | **Story 4.3** |
| **Movers**                                  | the primary column, below sectors                    | **Story 4.5** |

### And a new kind of deferral sentence

**Every `filledBy` sentence in the tree today names an EPIC.** Three of these
name a **story in this epic**, which is a different promise — weeks rather than
months — and the reader should be able to tell.

**Do not invent a second vocabulary for it.** The breadth region has named Epic
4 since Task 1.5.4 and is the precedent: the sentence describes **what will be
there**, and the tag says **whose**. A near-term deferral is the same component
with a nearer name in the tag.
