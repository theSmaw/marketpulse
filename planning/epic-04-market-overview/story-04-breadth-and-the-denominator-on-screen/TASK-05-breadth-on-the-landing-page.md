# Task 4.4.5 — Breadth on the landing page

**Status:** Not started
**Story:** [4.4 Breadth, & the Denominator on Screen](STORY.md)
**Depends on:** 4.4.3 (the drawing) and 4.4.4 (the frame)

## Objective

**The payoff: a reader can answer whether a 2% index move is everything or five
names**, which is `PRODUCT_SPEC.md` §4's first job in one line of screen.

## What the user can see when this lands

**How broad today's move is.** Three counts — advancing, declining, unchanged —
each with its own bar, and below a rule the count the measurement could not see.
A headline figure above them.

**What they still cannot do:** see which names (4.5), or click through (4.6).

## Work

- **A sibling component on `RankedList`'s geometry**, not a third use of it. It
  owes stories under the `pnpm stories` rule.
- **The denominator is split by grain, which is the resolution of the story's own
  contradiction.** The two amendments are right about two different facts: **the
  count** (`503` / `N` / the remainder) is a figure and lives **in the region**;
  **the window and `computedAt`** are the method and belong as a clause in
  `OverviewSourceNote`. The region prints **no instant and no window sentence** —
  the window goes in the row's **label**, because a label is not a sentence.
- **`Not heard from` is never labelled `unobserved`.** It is `503 − N`, drawn as
  a trailing row below a rule, and the word stays out of the tree entirely.
- **The region must not say**: any connection word (`one-home-for-the-feed-words`
  would fire and would deserve to), any feed or venue, any instant, any percentage
  of 503 without N beside it, and **never _the market_ as a denominator** — the
  503 are the S&P 500 by curation, which is narrower, and that is the same
  over-claim `describeSilence` was repaired for.
- **Nothing in the head's `meta` slot, deliberately.** `N of 11 ranked` already
  occupies that slot one region up; `466 of 503 heard from` there would be a second
  `N of M` badge 200 px away at a different denominator over a different set —
  two correct badges that read as one pattern.
- **A memo boundary**, and the derivation memoised on `overview` identity rather
  than on `liveFeed`, which is a new object every tick.
- **Look at the page before running a suite.** `pnpm probe /` at all four widths,
  before and after, and **report the movement** — the rule that replaced Task
  4.1.4's. **The number to beat is 486**: go over it and rows 2 and 3's shared
  ratio takes `Sector performance` and `Movers` with you, which makes the height a
  page-level decision. At 768 and 390 the rows are untied and filling **will** grow
  the page.

## Done when

1. Three counts and the unheard remainder render at 1440/1024/768/390, with the
   remainder below a rule and never labelled with a fourth word
2. `advancing + declining + unchanged` visibly equals N, and no percentage is
   drawn without N beside it
3. Direction survives `grayscale(1)` — asserted by a produced photograph, not by
   reasoning
4. The region's height is identical across its states at each width, measured
5. `pnpm probe` deltas recorded per width; the proxy strip byte-identical in
   position and size; `pnpm e2e` green
