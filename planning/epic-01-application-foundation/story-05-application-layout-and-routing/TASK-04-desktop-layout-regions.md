# Task 1.5.4 — The desktop layout regions

**Status:** Not started
**Story:** [1.5 Application Layout & Routing](STORY.md)
**Depends on:** Task 1.5.3

## Objective

The desktop-first region structure PRODUCT_SPEC.md §9 sketches, below the chrome and around the route outlet — so that every screen from Epic 4 onward is placed rather than invented, and so Story 1.7's "contain a failure to the affected region" criterion has regions to contain it to.

## Work

- **§9's sketch is the input and it is a proportion, not a pixel spec.** A dominant primary area with the market topology as the visual centre of gravity, a narrower right column carrying unusual activity above investigations, and a lower band for market breadth. Reproduce the structure and the emphasis; do not hard-code a mock
- **Desktop-first is a stated product constraint (§3), not a shortcut.** Mobile UX is explicitly out of scope for V1. This is permission to assume substantial screen real estate — and it is not permission to break at 1280px, which is an ordinary analyst monitor. State the width the layout is designed for and check it at that width and one narrower
- **A region is where a failure gets contained, and that is why this task exists before Story 1.7 rather than after it.** Epic 1's exit criteria include containing a failure locally, and §36 forbids collapsing to a global error screen. Each region should be a boundary a later story can put an error state inside without touching the others. This task builds the boundaries; it does **not** build error states, and it should not add an error boundary component ahead of the story that needs one
- **Only the landing route gets the full region structure.** The other three placeholders occupy the outlet as a single area — inventing an Investigation Workspace layout here is scaffolding ahead of Epic 7, and the layout it invents will be wrong. Say so where the routes are declared, so the asymmetry reads as a decision
- **Regions are named after what they hold**, using §8.1's vocabulary — unusual activity, topology, breadth, investigations — rather than after where they sit. A region called `rightColumn` is a layout that cannot be rearranged
- **Use the spacing grid and the hairline, not ad-hoc values.** The 4px grid and the 1px near-black rule are what make the regions read as one dense surface rather than as boxes. Not one literal length or colour in the new stylesheets, the same rule `App.module.css` already follows
- **Check the layout does not undo tabular alignment.** `font-variant-numeric: tabular-nums` is inherited from `body`; a region that re-declares typography can lose it, and losing it costs 14.3 px of drift on a price column at the product's default size — measured in Task 1.4.3. A region that breaks alignment has overridden something
- **The topology region will hold a WebGL canvas in Epic 6.** That is a sizing constraint worth thinking about once, now: a canvas needs a region with a resolved size rather than one that grows to fit its content. Note what the layout does about it; do not build for it

## Done when

- The landing route's regions match §9's structure and emphasis at the stated design width, and remain usable one step narrower
- Each region is a boundary a later story can fail independently, without that having been built yet
- The three non-landing routes render in a single outlet area, and the asymmetry is written down as a decision
- Nothing in the new stylesheets is a literal colour, length or font
- `pnpm verify` exits 0, and the built page renders correctly from a plain static host outside the workspace

## Notes

Every region here is empty apart from a label. That is the point: Epic 4 fills the overview, Epic 5 the unusual activity feed, Epic 6 the topology and Epic 7 the investigations. A region that is easy to fill and hard to move is the outcome; a region that already contains a guess about its contents is not.
