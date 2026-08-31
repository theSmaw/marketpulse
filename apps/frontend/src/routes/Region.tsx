import { useId, type ReactNode } from "react";

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
// **Why it lives in `src/routes/` and owes no stories.** Task 1.5.3 settled the
// line: a `.tsx` under `src/components/` is workshop material and owes an
// `AllPermutations` grid, and the test is *does it have states worth reviewing
// side by side?* A region shell is a label and a slot — one state — so it sits
// beside the route it serves. The day it acquires empty, loading and failed
// states it moves into `src/components/`, and its permutation grid will then
// walk straight into the landmark conflict below. Note the rule is enforced in
// one direction only: nothing would have stopped this file being stateful and
// escaping `pnpm stories` entirely.
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
      {children === undefined ? null : (
        <div className={styles.content}>{children}</div>
      )}
    </section>
  );
}
