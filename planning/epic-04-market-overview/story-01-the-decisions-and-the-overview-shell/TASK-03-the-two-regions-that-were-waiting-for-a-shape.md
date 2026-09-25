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
