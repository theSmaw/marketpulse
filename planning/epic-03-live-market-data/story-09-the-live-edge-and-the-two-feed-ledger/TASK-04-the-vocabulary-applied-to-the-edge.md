# Task 3.9.4 — The vocabulary applied to the edge

**Status:** Not started
**Story:** [3.9 The Live Edge on the Chart & the Two-Feed Ledger](STORY.md)
**Depends on:** 3.9.3

## Objective

Draw what 3.9.3 decided, in the token layer and the components, with the same
discipline Story 3.4's vocabulary was shipped under.

## What the user can see when this lands

**The chart says which part of it is arriving.** Whatever the three decisions
were — a distinguished last bar, a drawn seam, a mark at the edge, or
deliberately none of them — this is where a reader meets it.

## The rules this inherits rather than re-decides

- **Colour is never the sole encoding of anything.** The price palette differs
  by 1.04:1 in greyscale, so hue is the entire difference and shape, sign, glyph
  or word must carry it. This has caught real defects, including one where four
  greyscale simulations passed against a chart that was wrong
- **`prefers-reduced-motion` is not an afterthought.** Story 3.4's mark does not
  run under it and the qualifier's instant is what survives, asserted in a
  browser. Anything that decays here owes the same
- **Focus is the token layer's job** — one global `:focus-visible` rule, and a
  component declaring its own is answering a question already answered
- **A CSS Module class-name typo is completely silent.** It typechecks, lints,
  builds and renders unstyled, and nothing in `pnpm verify` catches it
- **`composes:` does not reliably hot-reload** — restart the dev server before
  believing any measurement of a break in one

## Work

- Tokens first, in `tokens.css`, with any measured accessibility floor recorded
  beside the value it replaced — ADR 0026's one standing exception has fired
  four times and each is written down where the token lives
- The components, then `pnpm probe` at all four viewports against a live or
  replayed edge
- A browser assertion for whatever is now drawn, scoped to its own region —
  `[data-arrival]` is a shared handle and a page-wide count means something
  else
- The reduced-motion case, asserted in a browser rather than reasoned about
- A `pnpm break` for whichever rule is now load-bearing

## Done when

1. The decisions of 3.9.3 are on screen and photographed at four viewports
2. Reduced motion is asserted
3. `pnpm verify` passes and the browser suite is green
