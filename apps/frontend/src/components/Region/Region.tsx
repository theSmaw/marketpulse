import { useId, type ReactNode } from "react";

import { ErrorBoundary } from "../ErrorBoundary/ErrorBoundary.js";
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
export function Region({
  name,
  filledBy,
  children,
}: {
  readonly name: string;
  readonly filledBy: string;
  readonly children?: ReactNode;
}) {
  const headingId = useId();

  return (
    <section className={styles.region} aria-labelledby={headingId}>
      <h2 className={styles.name} id={headingId}>
        {name}
      </h2>
      <p className={styles.filledBy}>{filledBy}</p>
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
    </section>
  );
}
