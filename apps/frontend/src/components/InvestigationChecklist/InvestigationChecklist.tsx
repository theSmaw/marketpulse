import type {
  ChecklistState,
  ChecklistStepView,
} from "../../investigations/index.js";
import { CONNECTION_LOST_SENTENCE } from "../../investigations/index.js";
import { cx } from "../../cx.js";
import a11y from "../../styles/a11y.module.css";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { Marker } from "../Marker/Marker.js";
import styles from "./InvestigationChecklist.module.css";

// The one-line checklist `Investigate` paints beneath itself — `PRODUCT_SPEC.md`
// §14's own example shape, `✓ Measure move 120 ms` (Task 7.1.4).
//
// ## Invisible before any press
//
// `checklist === undefined` renders `null`, no reserved room at all. Gate 1's
// own settled decision over the always-visible-and-reserved alternative: a
// reader who has never pressed `Investigate` sees nothing, which is what keeps
// this region out of the "a reserved region nobody has built" pattern Story 4.7
// already routed as a defect once.
//
// ## Where the control sits
//
// `Abnormal-move indicators`'s own header carries `Panel`'s `meta` slot, and
// that was this task's own first-choice placement — probed before anything
// else, per Gate 1's own stated order. A control added there measured
// **47 → 53 px**, at all four widths, because the button's own line-height
// is taller than the heading's: Gate 1's own stated fallback fires on that
// exact measurement, so the control sits here instead, as the first row of
// the region's own body, owned by this component rather than by the header.
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
  /** `undefined` means nothing to show yet — see the header. The control
   * itself is never hidden: `onInvestigate` is always offered, whatever
   * this is. */
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
  /** Starts (or re-presses) the investigation for the page's current
   * security. The second-press guard lives in `use-investigation.ts`, not
   * here — this control is never disabled. */
  readonly onInvestigate: () => void;
}

export function InvestigationChecklist({
  checklist,
  announcement,
  pastCoverThreshold,
  onInvestigate,
}: InvestigationChecklistProps) {
  return (
    <>
      <div className={cx(styles.controlRow)}>
        {/*
         * `secondary`, never `primary` — zero other consumers of that
         * variant in this product, and spending the one crimson accent on
         * a control this unremarkable is disproportionate. The same label
         * in every state (idle/running/done): `Button.tsx`'s own header
         * records the loading-state trigger evaluated and declined for
         * exactly this control.
         */}
        <Button size="small" variant="secondary" onClick={onInvestigate}>
          Investigate
        </Button>
      </div>
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
      <div className={cx(styles.row)}>
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
    <div className={cx(styles.row, breathing ? styles.running : undefined)}>
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
    </div>
  );
}

/** Room and nothing else, where a cell would be — `AbnormalMove.tsx`'s own
 * idiom, carried over rather than reinvented. */
const NBSP = " ";
