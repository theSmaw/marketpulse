import { useEffect, useRef, useState, type ReactNode } from "react";

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
// **That is now a decision rather than a deferral, and it is guarded rather
// than written down — [ADR 0039](../../../../../docs/adr/0039-a-region-is-a-tab-stop-unconditionally.md),
// Task 4.6.6.** The question was declined twice before being taken, and the
// reframing is the part worth carrying: it was never *does this region scroll*,
// it is **can a tab stop appear and disappear under a reader**, and the answer
// must be no. A condition keyed on the content being focusable — the better of
// the two, and correct about 2.1.1 — would make three of the landing route's
// stops exist at paint and **vanish when the first aggregate lands**, dropping a
// focused reader to `<body>` on a timer nobody controls.
//
// And the rule above stopped being checkable by the tool that found it. **axe
// cannot report these regions any more**: `scrollable-region-focusable` is
// silent while the scrolling box contains something focusable, and Story 4.6
// made the rows in three of them links. The replacement is
// `expectEveryRegionIsATabStop`, called from `overview-region-order.spec.ts` and
// `securities-route.spec.ts`, with the break `a-region-stops-being-a-tab-stop`.
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
  meta,
  onReaderWithin,
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
   *
   * **`| undefined` since 2026-09-27**, so a caller can decide per render
   * rather than per element. `Sector performance` says what belongs in it while
   * it has nothing to draw and says nothing once it does, and under
   * `exactOptionalPropertyTypes` *absent* and *present as `undefined`* are
   * different types — so without this the route would need two `<Region>`
   * elements for one region.
   */
  readonly filledBy?: string | undefined;
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
  /**
   * The right-hand end of the head **while the region holds content** — a
   * count, a state, anything that qualifies the region rather than being in it.
   *
   * **Opened once, by Task 4.3.6, for two strings that share one slot.** The
   * sector region wanted `11 · RANKED` and `ORDER HELD` there, and opening a
   * shared component's head twice — once for a count and once for a badge —
   * would be two changes for one idea. So the slot takes a node and the caller
   * decides which of its strings is true, which is also what lets it reserve the
   * wider of the two so nothing moves when one replaces the other.
   *
   * It is the same `Panel` slot {@link awaiting} renders into, and the two are
   * mutually exclusive by construction rather than by rule: a tag naming the work
   * that will fill a region shows only while the region is empty, and this shows
   * only while it is not.
   */
  readonly meta?: ReactNode;
  /**
   * Called when a reader **enters or leaves this region** — a pointer over it,
   * or focus anywhere inside it.
   *
   * `:hover` / `:focus-within` on the region's own box, reported as one boolean,
   * because the two are one fact: *somebody is reading this*. The sector region
   * holds its order while it is true (Task 4.3.6); everything else on this screen
   * ignores it.
   *
   * **Scoped to the region and never to a row.** A row-scoped hold lets rows
   * move out from under an **approaching** pointer, which is the failure the
   * whole treatment exists to prevent — and the section is the region's only tab
   * stop today, so it is also the only element at which a keyboard reader can be
   * said to be here.
   *
   * **Absent by default, and then nothing is listened for**: six of the seven
   * regions on the landing page have nothing to hold, and a region that reported
   * this anyway would be four listeners and a state change per pointer crossing
   * on every route.
   */
  readonly onReaderWithin?: (within: boolean) => void;
  readonly children?: ReactNode;
}) {
  const box = useRef<HTMLElement | null>(null);

  /*
   * **Whether the content below has thrown — the one thing the head cannot
   * derive** (Task 4.7.5).
   *
   * The boundary is inside the section and wraps only the content slot, which
   * is right and is argued at length above: the name, the landmark, the tab
   * stop and the box all survive a failure. What nobody noticed is that the
   * **head's `meta`** survives it too, and `meta` is where the regions that
   * have content put their claims about it — `11 · RANKED`, `Top 5 each way`,
   * `ORDER HELD`. The route computes it from `movers !== undefined`, which is
   * a statement about the *frame*; a thrown `Movers` leaves it standing over
   * a box saying the region could not be displayed.
   *
   * Two true halves and one contradiction, which is Task 3.4.9's finding one
   * surface over and the reason the check is a walk over this component's own
   * state space rather than a rendering of a named combination.
   *
   * **A state rather than a derivation, because a throw during render is not
   * a thing anything upstream computed.** The setter is a stable identity, so
   * the boundary's effect-free notification does not resubscribe anything,
   * and the `false` on reset is what makes `Try again` restore the head with
   * the figures — see `ErrorBoundary.onCaught`.
   *
   * It governs `meta` and **not** `filledBy`. That sentence says what belongs
   * in the region — the same kind of fact as its name, which the boundary
   * deliberately preserves — rather than anything about figures that have
   * just gone.
   */
  const [caught, setCaught] = useState(false);

  /*
   * **Native listeners rather than React's handlers, and the two halves
   * combined here rather than upstream.**
   *
   * `pointerenter` / `pointerleave` do not bubble and `focusin` / `focusout`
   * do, which is exactly the pair of semantics `:hover` and `:focus-within`
   * have — so the four events answer the question without any filtering. The
   * two booleans are plain locals in the effect's closure rather than state:
   * nothing here renders differently, and the only consumer of the answer is
   * the callback.
   *
   * The effect re-subscribes only when the callback's identity changes, which
   * is why `useOrderHold` returns a stable one. A callback rebuilt per frame
   * would tear the listeners down sixteen times a minute and lose the two
   * locals with them.
   */
  useEffect(() => {
    const element = box.current;
    if (element === null || onReaderWithin === undefined) return;

    let pointer = false;
    let focus = false;
    const report = () => {
      onReaderWithin(pointer || focus);
    };

    const entered = () => {
      pointer = true;
      report();
    };
    const left = () => {
      pointer = false;
      report();
    };
    const focused = () => {
      focus = true;
      report();
    };
    const blurred = () => {
      focus = false;
      report();
    };

    element.addEventListener("pointerenter", entered);
    element.addEventListener("pointerleave", left);
    element.addEventListener("focusin", focused);
    element.addEventListener("focusout", blurred);

    return () => {
      element.removeEventListener("pointerenter", entered);
      element.removeEventListener("pointerleave", left);
      element.removeEventListener("focusin", focused);
      element.removeEventListener("focusout", blurred);

      // **A region that stops listening stops holding.** Without this, a
      // consumer unmounting mid-hover — a rollback replacing the frame, a route
      // change — would leave a pin nobody can release, and the list would be
      // frozen with no pointer anywhere near it.
      onReaderWithin(false);
    };
  }, [onReaderWithin]);

  const tag =
    awaiting === undefined ? undefined : (
      <span className={styles.awaiting}>{awaiting}</span>
    );

  return (
    // `scrollable` is `Panel`'s name for the pair this component has carried
    // since Task 1.13.4: `overflow: auto` **and** `tabIndex={0}`, together,
    // because a scrolling box a keyboard cannot reach is a WCAG 2.1.1 failure
    // that no test in this repository can see. Every region gets it rather than
    // the ones currently overflowing — which of the four scrolls is a function
    // of the viewport and of what Epics 4 to 7 put in them.
    <Panel
      ref={box}
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
      /*
       * **The tag renders only while the region is reserved**, and that is the
       * same argument as `reserved` itself: a tag computed from the content
       * cannot outlive the work it names. Without it, the day Story 4.3 fills
       * the sector region a forgotten `awaiting="Story 4.3"` sits beside real
       * sector data, promising work that has already landed — and nothing in
       * this repository would say so, because prose on a screen is exactly the
       * kind of claim no check can read.
       *
       * **And the slot holds one thing at a time**, which is why the two are one
       * expression rather than two props: an empty region tags the work that
       * will fill it, and a filled one carries whatever qualifies its contents.
       * There is no state in which both are true and none in which the head has
       * to choose.
       *
       * **And a third branch since 2026-10-11, which is the same argument a
       * second time**: `reserved` and the tag are keyed on there being no
       * children so that they cannot disagree with the content, and `caught`
       * is keyed on the content having thrown so that `meta` cannot either. A
       * head whose claim outlives its figures is the reserved-tag defect with
       * the condition inverted — *a tag computed from the content cannot
       * outlive the work it names* was written here about an empty region and
       * is just as true of a failed one.
       */
      meta={children === undefined ? tag : caught ? undefined : meta}
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
            /*
             * **What stops the head outliving what is inside here** — see
             * `caught` above, and `ErrorBoundary.onCaught`, which argues why
             * one bit crossing upward is a notification rather than the
             * second report this component refuses to be.
             */
            onCaught={setCaught}
          >
            {children}
          </ErrorBoundary>
        </div>
      )}
    </Panel>
  );
}
