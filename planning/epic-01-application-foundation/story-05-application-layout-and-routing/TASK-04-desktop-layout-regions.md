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
- **The landing route is not empty, and the regions have to be built around what is in it.** Task 1.5.2 moved Story 1.4's render check there — a securities table, the anomaly ramp and the feed states — and it stays until Epic 4 replaces it. Put it in the primary area rather than beside the regions or under them: it is the closest thing this application has to the content §9 sketches there, and a region structure built around an empty box is a structure nobody has looked at. `App.tsx` already renders a `<main>` around the outlet, so the regions go inside that landmark rather than replacing it — and since Task 1.5.3 the chrome is `AppHeader`, rendered outside `<Routes>`, so `App.tsx` is now three elements and the regions are strictly inside the `<main>`
- **Every region you add is a landmark decision, and Task 1.5.3 turned that from a style question into a measured one.** The chrome already contributes a `banner` (`<header>`) and a `navigation` (`<nav aria-label="Primary">`). Task 1.5.3's permutation grid put six banners on one page and axe reported `landmark-no-duplicate-banner` and `landmark-unique` at **moderate** — in a story, where it was an artefact of the grid. Regions are where the same two rules reach the **application**: several `<aside>`s, or `<section>`s with a `region` role and no accessible name, are duplicate and unnamed landmarks on the real page rather than in a workshop grid. So either give every landmark an accessible name — `aria-labelledby` pointing at the heading the region already has, which §8.1's vocabulary supplies — or use plain `<div>`s and leave the landmark set as it is. The a11y panel will report it either way and will not fail the build, so this is a decision to take rather than a warning to wait for
- **The workshop's line is settled, so apply it rather than re-deciding it.** Task 1.5.3 fixed the rule: a `.tsx` under `src/components/` owes stories, anything else does not, and the test is _does it have states worth reviewing side by side?_ A region shell with a label and a slot has one state and belongs beside the route it serves, not in `src/components/`. If a region does acquire states — empty, loading, failed, which Story 1.7 is the story that adds — it moves and it owes an `AllPermutations` grid, and that grid will hit the landmark conflict above. Note the rule is enforced in one direction only: nothing stops a stateful component being put in `src/routes/` and escaping `pnpm stories` entirely
- **Only the landing route gets the full region structure.** The other three placeholders occupy the outlet as a single area — inventing an Investigation Workspace layout here is scaffolding ahead of Epic 7, and the layout it invents will be wrong. Say so where the routes are declared, so the asymmetry reads as a decision
- **Regions are named after what they hold**, using §8.1's vocabulary — unusual activity, topology, breadth, investigations — rather than after where they sit. A region called `rightColumn` is a layout that cannot be rearranged
- **Use the spacing grid and the hairline, not ad-hoc values.** The 4px grid and the 1px near-black rule are what make the regions read as one dense surface rather than as boxes. Not one literal length or colour in the new stylesheets, the same rule `App.module.css` already follows — and note `App.module.css` is now **two rules**, the ground and the gap under the chrome. It has shrunk three times and its own header says so. Region styles belong in the route's or the region's stylesheet; anything arriving back in the shell's file is the signal that something which should own its own styles is being styled from the shell again
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
