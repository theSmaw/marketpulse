import type { ReactNode } from "react";

import { ErrorBoundary } from "../ErrorBoundary/ErrorBoundary.js";
import { Panel } from "../Panel/Panel.js";
import styles from "./Region.module.css";

// A layout region: the box PRODUCT_SPEC.md §9 sketches, with a name and a slot.
//
// Four of these make the landing screen. Each one is a boundary — Epic 4 fills
// the breadth region, Epic 5 the unusual activity feed, Epic 6 the topology and
// Epic 7 the investigations list — and, more to the point for Epic 1, each one
// is a boundary a failure can be contained inside. Story 1.7 is the story that
// puts an error state in one; this task builds the walls and deliberately does
// not build the state, because an error boundary invented before the story that
// needs one is a guess about a shape nobody has seen yet.
//
// **It lived in `src/routes/` until Task 1.7.6, and the boundary is what moved
// it.** Task 1.5.3 settled the line: a `.tsx` under `src/components/` is
// workshop material and owes an `AllPermutations` grid, and the test is *does
// it have states worth reviewing side by side?* A region shell was a label and
// a slot — one state — so it sat beside the route it serves, and its own
// comment said it would move the day it acquired a failed state. It has one
// now: a region renders its contents or it renders a fallback where its
// contents should be, and those are worth seeing next to each other. So it
// moved, and it brought the landmark conflict below with it — six `region`
// landmarks in one permutation grid, exactly what `AppHeader` met in Task
// 1.5.3, fixed the same way and only on that one story.
//
// The alternative was to leave this file alone and wrap each `<Region>` from
// the route instead. That was rejected on what the user sees rather than on
// tidiness: a boundary outside the `<section>` replaces the region's heading
// along with its contents, so the failed box loses its name, loses its landmark
// and stops being one of §9's four areas — a hole in the layout rather than a
// labelled box with a problem in it. Inside, the name and the landmark survive
// the failure, which is what makes "the affected region" a thing the user can
// still point at.
//
// **Why it is a named `<section>` and not a `<div>`.** A `<section>` with an
// accessible name is a `region` landmark; without one it is nothing at all, and
// several unnamed ones are what axe reports as `landmark-unique`. Task 1.5.3
// met both that rule and `landmark-no-duplicate-banner` in a *story*, where six
// headers on one page made them an artefact of the permutation grid. Here they
// would reach the real application, so the choice was taken rather than waited
// for: every region is named, `aria-labelledby` pointing at the heading it
// already has. The alternative — plain `<div>`s, leaving the landmark set as
// the chrome's banner and navigation — is cheaper and gives a keyboard or
// screen-reader user nothing to jump between on the screen the product opens
// on. The names come from §8.1's vocabulary, so the landmark list reads as the
// product's own contents page.
//
// The id is `useId()` rather than a literal, so two regions with the same name
// cannot collide. It is also the first hook in this application, and worth
// noting for that alone: `useId` is not state, so the React Compiler rules that
// failed Task 1.5.1's spike had nothing to say about it.
//
// **`tabIndex={0}` is here because a region SCROLLS, and it was found by a tool
// rather than by a reading (Task 1.13.4).** This box is sized by the grid and
// takes its own overflow, which is the property the layout is built on — and a
// container that scrolls and cannot be reached by keyboard is a WCAG 2.1.1
// failure, because a pointer user can see content a keyboard user cannot reach.
// axe's `scrollable-region-focusable` is the rule, and it does not fire while
// the scrolling box happens to contain something focusable, which is why this
// stood for five stories: `Market topology` holds Story 1.4's render check and
// that holds a popover trigger. The FIRST run of the browser suite on a Linux
// runner reported it on `Current investigations`, which holds a heading and one
// sentence and nothing focusable at all — and it reproduces on the development
// machine at a viewport 160 px shorter, so it is a real defect that a taller
// window was hiding rather than a property of the runner. Every region gets it,
// not just the ones currently overflowing: which of the four scrolls is a
// function of the viewport and of what Epics 4 to 7 put in them, so making it
// conditional would be a guess re-taken on every window resize.
//
// **Since the 2026 refresh the box itself is a `Panel`** (ADR 0022), and what
// is left here is everything a panel is deliberately not: the landmark, the
// explanatory line, and the containment boundary. That split is the reason
// `Panel` does not contain an `ErrorBoundary` of its own — a surface that
// swallowed the failure of anything placed on it would make every future
// boundary decision invisible, because the boundary would end up wherever
// somebody reached for a white background.
//
// The three things this used to draw itself — the ground, the hairline and the
// heading — moved wholesale, so `Region.module.css` is now four rules about
// *contents* and none about the box. The `useId` went with them: `Panel` owns
// the heading, so it owns the id that names the landmark.
export function Region({
  className,
  name,
  filledBy,
  awaiting,
  children,
}: {
  /**
   * The grid area this region occupies, from the route that lays it out.
   *
   * **A region does not know where it sits** — Task 1.5.4's grid was four
   * regions auto-placed into two columns precisely so that none of them had
   * to. Seven do not auto-place: the wide layout wants the primary column and
   * the narrow one wants a different reading order, and no source order
   * satisfies both. So the route names the areas and passes one class; the
   * region still knows nothing but its own name.
   */
  readonly className?: string | undefined;
  readonly name: string;
  /**
   * What this region holds, in a sentence under its heading.
   *
   * **Optional since 2026-09-13**, and the Price region is the first to go
   * without one. The sentence earns its place while a region is a plan or a
   * table; above a *drawing* that is immediately below it, with a control on the
   * same screen that changes it, it is a caption for something the reader can
   * already see — and it costs the picture a paragraph of height at every width.
   * Where there is nothing useful to say, nothing is said rather than something
   * being written to fill the slot.
   */
  readonly filledBy?: string;
  /**
   * Whose work fills this region — `Epic 6`, `Story 4.3` — as a tag at the
   * right-hand end of the header.
   *
   * **It is a tag rather than a clause in the sentence**, so the sentence can
   * describe the product instead of our backlog: a line opening *Epic 6 will…*
   * makes a reader's first fact about the screen a fact about us
   * (`Market overview.dc.html` §03).
   *
   * **And it carries the distance.** Every deferral this product shipped before
   * 2026-09-25 named an epic; three of this screen's name a story in the epic
   * being built, which is weeks rather than months. A reader who cannot tell
   * them apart reads *weeks* as *someday* — and the tag is the only thing that
   * changes between them, deliberately. A brighter ground or a countdown would
   * make the near-term deferral louder than the region beside it that already
   * has content, which is the wrong hierarchy on a screen whose subject is the
   * market rather than our schedule.
   *
   * It renders into `Panel`'s `meta`, which is already *anything that qualifies
   * the panel rather than being its content* — reusing that slot rather than
   * adding a second one is why this treatment costs one prop.
   */
  readonly awaiting?: string;
  readonly children?: ReactNode;
}) {
  return (
    // `scrollable` is `Panel`'s name for the pair this component has carried
    // since Task 1.13.4: `overflow: auto` **and** `tabIndex={0}`, together,
    // because a scrolling box a keyboard cannot reach is a WCAG 2.1.1 failure
    // that no test in this repository can see. Every region gets it rather than
    // the ones currently overflowing — which of the four scrolls is a function
    // of the viewport and of what Epics 4 to 7 put in them.
    <Panel
      className={className}
      scrollable
      title={name}
      /*
       * `reserved` is keyed on there being no children rather than on a prop of
       * its own, because the two can never disagree that way: a region holding
       * content and drawn as reserved, or the reverse, is a state nobody can
       * produce. The hatch and the dashed hairline are `Market overview.dc.html`
       * §03's, and what they protect against is an empty region reading as a
       * broken one.
       */
      reserved={children === undefined}
      meta={
        awaiting === undefined ? undefined : (
          <span className={styles.awaiting}>{awaiting}</span>
        )
      }
    >
      {filledBy === undefined ? null : (
        <p className={styles.filledBy}>{filledBy}</p>
      )}
      {/*
       * The containment boundary, and it is *inside* the section on purpose —
       * see the note above. It wraps only the content slot, so a failure below
       * it leaves the heading, the explanatory line, the landmark and the box
       * itself exactly where they were.
       *
       * The region is sized by the grid and scrolls its own overflow, so the
       * fallback fits whatever box this region was given and cannot change
       * §9's 3:1 and 2:1 proportions or push its neighbours around. That is
       * the property Task 1.5.5 measured the absence of: a boundary at the
       * router blanks the whole of `<main>`, four landmarks and all.
       *
       * `name` is reused in the fallback's title so the failed box says which
       * of the four it is, in the vocabulary §8.1 already gave it.
       */}
      {children === undefined ? null : (
        <div className={styles.content}>
          <ErrorBoundary
            title={`${name} could not be displayed`}
            detail="The rest of this screen is unaffected."
          >
            {children}
          </ErrorBoundary>
        </div>
      )}
    </Panel>
  );
}
