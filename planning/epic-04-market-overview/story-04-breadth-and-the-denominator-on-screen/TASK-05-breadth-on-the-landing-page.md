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

## Amended by Task 4.4.4 — 2026-10-07: the frame is ready, the geometry figure in STORY.md is wrong, and four specs now need a line

**`overview.breadth` exists**, required on the producer and tolerated as absent on
the read side. What you render, and the four things that would otherwise cost you a
round trip:

**1. `Market breadth` is 139 px at 390, not the 121 `STORY.md` records.** Measured
2026-10-07 with `pnpm probe /`. **Measure your delta from 139.** At 1440 and 1024 it
is 486, and the drawing fits in 486 **exactly** — 378 px of content against 389
available, with the 11 px of slack in one declared gap — so **nothing moves at those
two widths**. At 768 and 390 the rows are untied and filling **will** grow the page;
that is yours to measure and report.

**2. Four furnished-frame browser specs now send overview frames with NO breadth**,
which is the legitimate _previous image_ state. **Add breadth to them, or your
region draws reserved inside those specs** and you will read it as a defect. They
are the ones that build an `overview` object by hand.

**3. The shut-market member names ONE session and excludes stragglers.** A security
the nightly backfill missed sits outside both the count and `measured`, so
`measured` can legitimately be **less than 503 with the market shut** — and that is
the honest reading rather than a fault. Do not draw it as one.

**4. With an empty store the section reads `measured: 0` beside the date asked
about** — on a Saturday, a Saturday. **This is CI's state on every run**, so it is
the state your browser spec will meet. `measured: 0` is what says we hold nothing;
the date says which day was asked about. **You may choose to draw the sentence
rather than the date in that state** — that is a rendering decision and it is yours.

### And what the frame does NOT carry

**No percentages.** Counts only, by Gate 1 — three independently-rounded
percentages sum to 99 or 101. If you draw a percentage it is derived in **one**
place from `measured`, and it never replaces a count.

**No instant.** `computedAt` is already on the frame and already drawn by
`OverviewSourceNote` under `Computed`. **The region prints no instant** — the
window travels as `windowMinutes` and belongs in the region's **footer**, which is
the Gate 1 resolution of the two documents that read as though they disagreed.
