import type {
  ChecklistState,
  ChecklistStepView,
} from "../../investigations/index.js";
import { CONNECTION_LOST_SENTENCE } from "../../investigations/index.js";
import { cx } from "../../cx.js";
import a11y from "../../styles/a11y.module.css";
import { ConfidenceMark } from "../ConfidenceMark/ConfidenceMark.js";
import { Icon } from "../Icon/Icon.js";
import { Marker } from "../Marker/Marker.js";
import styles from "./InvestigationChecklist.module.css";

// The one-line checklist beneath `Investigate` — `PRODUCT_SPEC.md` §14's own
// example shape, `✓ Measure move 120 ms` (Task 7.1.4).
//
// ## Invisible before any press
//
// `checklist === undefined` renders `null`, no reserved room at all. Gate 1's
// own settled decision over the always-visible-and-reserved alternative: a
// reader who has never pressed `Investigate` sees nothing, which is what keeps
// this region out of the "a reserved region nobody has built" pattern Story 4.7
// already routed as a defect once.
//
// ## Where the control sits — and why it moved
//
// The `Investigate` button itself is NOT rendered by this component: it is
// `SecurityExplorer.tsx`'s own `<Region meta={...}>`, `Panel`'s `meta` slot.
// This was the task's first-choice placement, measured at **47 → 53 px**
// against a body-row alternative measured at **595 → 635 px** — a control
// added to the header costs this panel 6px; one added as a body row costs it
// 40px, because the row's own height and the gap above the score band are
// both new. The 6px version was shelved at first on a narrower question (does
// a 28px button sit awkwardly in a 22px heading line?) and the 40px version
// shipped instead — until `search-keyboard.spec.ts`'s own "no tab stop lands
// under the chrome" walk found that the 635px panel exceeds the 605px
// available between the sticky masthead and the sticky status bar at
// 390×780, landing this region's own ADR-0039 tab stop with its top edge
// behind the header. Re-sited into `meta` at this task's own close: 601px
// clears that budget, and the header-height question turned out to be the
// smaller cost by a wide margin once a real keyboard walk measured both.
//
// **The 4px of headroom in the paragraph above is GONE, measured 2026-11-20
// (Task 7.2.7), and no row treatment brings it back.** The paragraph stays
// standing because its reasoning is why this component sits where it does.
// What is no longer true is its arithmetic: with six rows the panel is
// **781px** at 390×780 and 768×780 and **763px** at 1024 and 1440, against a
// scroll-padding box of 613/670/690/690 — and the panel is **603px before
// any press at all**, so the first row of anything overflows the narrow
// budget. At 390 the region's own tab stop then lands 88px behind the
// masthead, because the browser does not scroll a target it already
// considers in view; `search-keyboard.spec.ts`' own predicate excludes an
// element at least as tall as the viewport, deliberately, so it went blind
// to this when the panel crossed 780px rather than catching it. Three
// progressively tighter row treatments were measured (no row padding, a 4px
// gap, micro type): the panel came down to 743px and the clearance stayed
// negative in every arm. **Decided 2026-11-20 by the Product Owner: the
// 605px/390×780 fit-budget is WITHDRAWN as a target.** The shipped
// `focusIsObscured` predicate's viewport-height exclusion is the real rule
// going forward — an element at least as tall as the viewport is not
// "obscured", because the browser will not scroll a target it already
// considers in view. `docs/GAPS.md` carries the figures and the decision.
// Nothing in this file was changed for it.
//
// `queued` = `Marker shape="dashed"` (its own existing meaning, "not yet"),
// `running` = `Marker shape="ring"`, `completed` = `Icon name="check"`. The
// security-identity arrival mark two hundred pixels up this same page is
// already a solid disc meaning *a bar arrived*; a second disc here meaning *a
// step finished* would be a fourth meaning for one silhouette, which `Marker`'s
// own header already refused once. No state here spends colour either — the
// glyph alone tells the three states apart, confirmed in a greyscale
// permutation in this file's own stories.
//
// ## The breathing ground, and why it has a floor
//
// `running` grows a pulsing row-ground only past 160 ms (`styles.breathing`,
// below) — `use-investigation.ts`'s own citation of `use-pending-panel.ts`'s
// `SHOW_AFTER_MS`, ADR 0028's cover threshold. A one-step run against this
// story's one tool typically finishes under that floor, so the ordinary case
// never breathes at all, which is the same argument `ChartPending`'s own cover
// makes for its slower threshold.
//
// ## The duration column is reserved, not appearing
//
// `.duration` has a fixed inline-size from first paint, filled with a held
// space until a real figure lands — so the row's own width does not shift
// the moment a `durationMs` arrives, the same `NBSP` idiom `AbnormalMove.tsx`
// uses throughout its own column.
//
// ## The live region
//
// One `role="status"`, scoped to this component and never to the whole
// region, persistent for as long as this component is mounted — matching
// `BarSeriesPanel`/`ChartReading`'s own shape exactly: first in the tree,
// never removed, so a screen reader is already attached to it before there is
// anything to say.

export interface InvestigationChecklistProps {
  /** `undefined` means nothing to show yet — see the header. The
   * `Investigate` control itself lives outside this component entirely
   * (`SecurityExplorer.tsx`'s own `<Region meta={...}>`) and is never
   * hidden, whatever this is. */
  readonly checklist: ChecklistState | undefined;
  /** What the live region should currently hold. Owned by
   * `use-investigation.ts`, which is the only thing with a clock. */
  readonly announcement: string;
  /** Has the active run been `running` for more than the 160 ms cover
   * threshold — `use-investigation.ts`'s own flag, the SAME one that
   * gates its "started" announcement. Gates the breathing ground below
   * rather than `step.status === "running"` alone: this component has no
   * clock of its own, so a run that finishes in a handful of
   * milliseconds must be told, not timed, that it never crossed the
   * floor. */
  readonly pastCoverThreshold: boolean;
}

export function InvestigationChecklist({
  checklist,
  announcement,
  pastCoverThreshold,
}: InvestigationChecklistProps) {
  return (
    <>
      {/*
       * First in the tree and rendered whenever this component is, which is
       * the mechanism `BarSeriesPanel.tsx` argues for at length: a live
       * region added at the same moment as its content is not reliably
       * announced, and one that is removed announces nothing at all.
       */}
      <p role="status" className={cx(a11y.visuallyHidden)}>
        {announcement}
      </p>
      {checklist === undefined ? null : (
        <div className={cx(styles.checklist)}>
          {checklist.steps.map((step, index) => (
            <Row
              key={step.id ?? index}
              step={step}
              breathing={step.status === "running" && pastCoverThreshold}
              droppedSentence={
                checklist.connectionLost && index === checklist.steps.length - 1
                  ? CONNECTION_LOST_SENTENCE
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

function Row({
  step,
  breathing,
  droppedSentence,
}: {
  readonly step: ChecklistStepView;
  /** Past the 160 ms cover threshold — see `InvestigationChecklistProps
   * .pastCoverThreshold`. Never derived from `step` alone. */
  readonly breathing: boolean;
  readonly droppedSentence: string | undefined;
}) {
  if (droppedSentence !== undefined) {
    return (
      <div className={cx(styles.row)} data-step="dropped">
        <span
          aria-hidden="true"
          className={cx(styles.glyph, styles.glyphQueued)}
        >
          <Marker shape="dashed" />
        </span>
        <p className={cx(styles.description, styles.dropped)}>
          {droppedSentence}
        </p>
        <p className={cx(styles.duration)}>{NBSP}</p>
      </div>
    );
  }

  return (
    <div
      className={cx(styles.row, breathing ? styles.running : undefined)}
      // **A row's own status, readable from outside** — the same
      // `data-arrival` idiom `SecurityIdentity` already publishes for its
      // mark, and for the same reason: a row carries no role and no
      // accessible name (it is three `<p>`s in a flex line), so a browser
      // spec asserting "all six rows painted on press" or "this step and
      // not another one completed" has nothing semantic to hold. Never
      // read by any stylesheet — the glyph is the visible encoding, and a
      // second home for that would be two things to keep in step.
      data-step={step.status}
    >
      <span
        aria-hidden="true"
        className={cx(
          styles.glyph,
          step.status === "running" ? styles.glyphRunning : styles.glyphQueued,
        )}
      >
        {step.status === "completed" ? (
          <Icon name="check" />
        ) : (
          <Marker shape={step.status === "queued" ? "dashed" : "ring"} />
        )}
      </span>
      <p className={cx(styles.description)}>{step.description ?? NBSP}</p>
      <p className={cx(styles.duration)}>
        {step.durationMs === undefined ? NBSP : `${String(step.durationMs)} ms`}
      </p>
      {/*
       * **The claim, on the row's second line** (Task 7.3.2, replacing Task
       * 7.3.1's deliberately unstyled `<p>`).
       *
       * It sits in the grid's `claim` area, spanning the description and
       * duration columns so the duration's `8ch` reserve becomes width for the
       * sentence — see `.claim` in this component's stylesheet for the
       * geometry and the settle.
       *
       * **Absent rather than empty**, which is why there is no reserved room
       * here and no `NBSP`: a queued row, a running row and an `inapplicable`
       * step each have nothing to say, and ADR 0029's rule is that a clause
       * renders only when its own data is present. It does mean the rows grow
       * as the claims land — which Story 7.2's own 603px/781px measurement
       * already put outside the withdrawn 390 fit-budget, and which this task
       * measured rather than hid from.
       *
       * **The mark leads the sentence, and the `confidence` is independently
       * optional.** A level this bundle does not recognise is dropped by the
       * decoder without dropping the claim with it, so a measured figure with
       * no mark beside it is a reachable, correct state rather than a defect —
       * `investigation-event.ts`'s own decoder case.
       *
       * **Zero focusable elements and zero click handlers** (AC 7). A `<p>` and
       * three `<span>`s, no tabindex, no role and no handler, so the claim adds
       * nothing to this row's keyboard surface — asserted structurally in this
       * component's own test rather than left as a sentence in a record,
       * because the evidence panel and the click-to-focus interaction are
       * Epic 8's by citation and the easiest way to ship them early by accident
       * is one `onClick`.
       */}
      {step.claim === undefined ? null : (
        <p className={cx(styles.claim)}>
          {step.confidence === undefined ? null : (
            <>
              <ConfidenceMark confidence={step.confidence} />
              {/*
               * **An explicit space, because a `gap` is invisible to a screen
               * reader** — the fix this product already ships twice, in
               * `ScoreBand`'s figure and `AbnormalMove`'s percentile cell.
               * `textContent` would otherwise run `SUPPORTED` straight into the
               * first word of the claim.
               */}{" "}
            </>
          )}
          {step.claim}
        </p>
      )}
    </div>
  );
}

/** Room and nothing else, where a cell would be — `AbnormalMove.tsx`'s own
 * idiom, carried over rather than reinvented. */
const NBSP = " ";
