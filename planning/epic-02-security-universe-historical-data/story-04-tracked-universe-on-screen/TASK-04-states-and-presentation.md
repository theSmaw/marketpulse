# Task 2.4.4 — The states, and making it look like the product

**Status:** Not started
**Story:** [2.4 The Tracked Universe On Screen](STORY.md)
**Depends on:** Task 2.4.3

## Objective

Turn a correct table into a page that reads as MarketPulse — and produce each of the three
failure states rather than reasoning about them.

## What the user can see when this lands

**The same data, presented as a product rather than a dump.**

- A **summary line** — "101 securities · 11 sectors" — which is the first sentence in this
  application that states a fact about our own data
- The eleven sectors **legible as groups** rather than an alphabetical run, so the page
  answers "what do we cover?" and not only "what is in the list?"
- The **equity / sector ETF / index ETF distinction shown visually**, so it is obvious at a
  glance that XLK is the benchmark for Technology and SPY is a market proxy rather than a
  company — the distinction Story 2.3 spent a whole task establishing, made visible for the
  first time
- A **loading state** while the request is in flight, rather than a blank region that shifts
  when data lands
- A **failed state** that says the service could not be reached, leaves the rest of the page
  usable, and does not show an error message or a stack — Story 1.7's rule, and the same
  treatment `BackendIndicator` already gets
- An **empty state** that says the universe has not been loaded and names the command,
  because that is what a migrated-but-unseeded database looks like and it is a real state a
  developer will hit on their first run

## The bar this task is held to

**This is the task the design bar lands on**, and it is not "tidy up the table". PRODUCT_SPEC.md §5.6 and `VISUAL-LANGUAGE.md`'s _The bar_ are acceptance criteria here: at the end of it, a screenshot of `/securities` has to look like a real, funded product rather than a scaffold with data in it. Correct and accessible is the floor and was Task 2.4.3's job.

Two of the four tests are genuinely at risk on a table of 101 rows and should be named before the work rather than after it. **"Is there a moment in it worth showing somebody?"** — a table has no natural one, so it has to come from somewhere deliberate: the sector structure made visible, the density made to feel considered rather than cramped, the numerals and labels set with real care. **"Does it feel alive?"** — see the motion bullet below, which is this task's, because it is the first thing in this product where content arrives asynchronously and something has to happen when it does.

## Work

- **Produce each state from a named cause rather than a flag**, which is the standard Story
  1.12 set and met: stop the backend for `failed`, point at an empty database for `empty`,
  and use a throttled connection or a route intercept for `loading`. A state produced by
  flipping a boolean in a component proves the component and not the wiring
- **Use the existing design language rather than inventing one.** `tokens.css` and
  `market.css` already hold the ground, the surfaces, the hairlines, the 4px grid and the
  semantic market colours; `SecurityRow` already exists from Story 1.4 and this is the first
  chance to find out whether it was the right component. If it is not, say so — that is a
  useful finding about a component built before there was data
- **Colour must not be the only encoding of the kind distinction**, per `VISUAL-LANGUAGE.md`
  and invariant 6's spirit. The precedent is `AnomalyBadge`, which writes the band's name
  inside its fill, and `FeedIndicator`, whose marker is a shape rather than a colour. Two
  price directions in this product differ by **1.05:1 in greyscale**, which is the measured
  reason this rule exists
- **Decide grouping versus sorting** and record it. Grouping by sector makes coverage
  legible and makes finding one symbol harder; sorting alphabetically does the reverse.
  Search arrives in Story 2.11 and changes which of those matters, so prefer the one that
  serves _this_ page and say what would reverse it
- **Do not add a sort control, a filter or a density toggle.** They are each a small piece of
  state and a second thing to keep correct, on a page whose job is to show 101 rows, and
  they are the kind of thing that arrives instead of the next story
- **Define the first motion tokens, because there are none and this is the first screen
  that needs any.** `VISUAL-LANGUAGE.md` specifies colour, ink, geometry and spacing to the
  pixel and says **nothing at all** about motion — no durations, no easings, no opinion on
  what happens when content arrives. For a live market application that is the largest gap
  in that document, and it is the reason test 4 currently fails outright. This task owns the
  thin first cut rather than the whole system: **two durations and one easing**, as tokens
  beside the others, used for the loading-to-loaded transition on this page. Do not build a
  motion system for animations nothing has yet — Epic 3's live price updates are where this
  becomes load-bearing and where the full vocabulary should be decided, against something
  that actually moves.
  Two constraints that come with it. **Respect `prefers-reduced-motion`** from the first
  token, because retrofitting it means finding every animation later. And **motion must not
  make a number harder to read** — a value that fades or slides while an analyst is reading
  it is worse than one that changes instantly, which is the specific reason the full
  vocabulary waits for Epic 3 rather than being guessed here
- **Check the contrast of anything new against the page ground**, because Task 1.12.4 found
  a real 2.09:1 violation on exactly this kind of secondary label where 4.5 is the threshold

## Done when

- A screenshot of this page passes the four tests in `VISUAL-LANGUAGE.md`'s _The bar_, and
  the judgement is recorded rather than assumed
- The first motion tokens exist, are used for the loading-to-loaded transition, and honour
  `prefers-reduced-motion`

- All three non-loaded states are produced from a named cause and seen on screen
- The kind distinction is legible without colour
- The summary line is derived from the response rather than written down — nothing anywhere
  states 101 as a constant, which is `UNIVERSE.md` §8's rule arriving on the frontend
- Grouping versus sorting is decided with a stated reversal trigger
- `pnpm verify` passes and the artefact's new size is recorded

## Notes

This is the first page in the product with real content, so it sets the pattern for every
table after it. It is worth more care than its size suggests — and it is also the task most
likely to expand, because everything on it could be a little better. The scope fence is the
list of things deliberately not added above.
