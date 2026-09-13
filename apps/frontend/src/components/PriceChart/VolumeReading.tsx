import { cx } from "../../cx.js";
import type { Bar, Timeframe } from "@marketpulse/shared";

import type { SlotScale } from "../../market/index.js";
import {
  formatBarInstant,
  formatVolumeExact,
  nearestPlaced,
  nearestSlot,
} from "../../market/index.js";
import type { ChartPoint, PlotBox } from "./chart-geometry.js";
import {
  NO_READING,
  resolveRead,
  useChartReading,
} from "./chart-reading-context.js";
import styles from "./VolumeReading.module.css";

// **The volume plot's half of one reading** (Task 2.13.5) — the same crosshair
// at the same pixel, and a strip that answers a different question.
//
// ## Why this exists at all, rather than one strip under the price chart
//
// `VOLUME-AND-WINDOW.md` §15. The obvious shape is one readout stating
// everything, and it fails on the arrangement this product actually renders at
// one column: Price and Volume are two `Region` panels with the Abnormal-move
// region between them, and the price panel **plus its eight stated facts** is
// taller than a phone. A single strip therefore puts the answer off screen for
// anybody pointing at a volume bar, in any DOM order.
//
// Two strips is not the duplication that objection feared, **because they do not
// say the same thing**. That is this product's existing rule rather than a new
// one: a readout belongs to a subject and its sentences name it
// (`FRONTEND-STATE.md` §7). Two surfaces describing one event in the same words
// is the defect that happened three times in one afternoon on the search screen;
// two surfaces describing two subjects is the repair. The **instant** is the one
// thing both state, and that is the joint — it is what makes two answers legible
// as one reading.
//
// ## What it is not
//
// **Not a second tab stop.** The chart is one tab stop for the pair: `Tab` lands
// on the price plot, the arrows step bars, and this strip follows because there
// is one read position. A keyboard path here would be the same reading at twice
// the cost, and the bar the product is held to is *one tab stop and never one
// per bar*. Nothing this plot can state is unreachable without a pointer — the
// spoken sentence carries the volume clause, and `volumeAlternative` states the
// picture.
//
// **Not a fifth live region.** The page carries four and a reading is announced
// by exactly one of them. See `chart-reading.ts` for why the volume figure is a
// clause in that sentence rather than an announcement of its own.
//
// **Not in the accessibility tree at all**, which follows from both of those:
// every other mark in this region is `aria-hidden` for the same reason — the
// plot, its one gutter label and its two dates are labels on a picture — and
// the region's accessible content is the one sentence `volumeAlternative`
// writes. A strip exposed here would state the window's peak in the same breath
// as that sentence states it, which is the two-surfaces defect with the peak in
// it.

export interface VolumeReadingProps {
  /** Every bar with a place on the axis, and the top of its own column. */
  readonly readings: readonly ChartPoint[];
  /** The plot's measured box, for the crosshair's full-height rule. */
  readonly plot: PlotBox;
  /**
   * The x scale — **the shared one**, so a pointer's pixel becomes the same
   * slot it would on the plot above. Inverted rather than re-derived from a
   * bounding box, which is a second spelling of the scale that disagrees with
   * the first at the edges.
   */
  readonly slots: SlotScale | null;
  /**
   * The bar that traded the window's peak, which is what this strip states when
   * nobody is pointing at it.
   *
   * `null` where there are no bars — in which case there is nothing to read and
   * this component renders nothing at all.
   */
  readonly peakBar: Bar | null;

  /**
   * What one slot is — a trading minute, or a whole session.
   *
   * Here for `ChartReading`'s reason and it is the same value, from the same
   * frame: at `1d` a bar is a session and `formatBarInstant` must not print an
   * hour. The two strips state one instant in one spelling, which is the only
   * thing they both say.
   */
  readonly timeframe: Timeframe | null;
}

export function VolumeReading({
  readings,
  plot,
  slots,
  peakBar,
  timeframe,
}: VolumeReadingProps) {
  const { read, setRead } = useChartReading();

  // **Resolved on read rather than reset on change** (Task 2.13.7), through the
  // same function the price overlay calls, on the same bars in the same order —
  // `placeBars(axis, bars)` in both — so the two crosshairs land on one bar by
  // arithmetic rather than by two components agreeing. `resolveRead` carries
  // the decision it encodes: a window change re-anchors by instant, or clears.
  const index = resolveRead(readings, read);
  const point = index === null ? undefined : readings[index];

  // Nothing to read means nothing to reach, and nothing to reserve. The strip
  // is absent in `loading` and `empty` exactly as the price strip is — both
  // draw a real frame with nothing in it, and a peak of a window with no bars
  // is not zero shares, it is no answer.
  if (readings.length === 0 || peakBar === null || timeframe === null) {
    return null;
  }

  function readAt(clientX: number, element: HTMLElement) {
    if (slots === null || readings.length === 0) return;

    const pixel = clientX - element.getBoundingClientRect().left;
    const at = nearestPlaced(readings, nearestSlot(slots, pixel));
    if (at !== null) {
      setRead({
        index: at,
        at: readings[at]?.bar.startsAt.getTime() ?? null,
        source: "pointer",
      });
    }
  }

  return (
    <>
      {/*
       * Pointer only, and out of the accessibility tree — see the header. There
       * is no `role`, no name and no `tabIndex`, because this element is not a
       * control: it is the surface a pointer is over, and the one tab stop for
       * the pair is the plot above.
       */}
      <div
        aria-hidden="true"
        className={styles.reader}
        onPointerLeave={() => {
          setRead(NO_READING);
        }}
        onPointerMove={(event) => {
          readAt(event.clientX, event.currentTarget);
        }}
      >
        <svg
          aria-hidden="true"
          className={styles.overlay}
          focusable="false"
          height={plot.height}
          width={plot.width}
        >
          {point !== undefined && (
            <>
              <line
                className={styles.crosshair}
                x1={point.x}
                x2={point.x}
                y1={0}
                y2={plot.height}
              />
              {/*
               * **At the bar's own volume, which below a pixel per bar is not
               * the top of the ink under it** (§10.5). The silhouette carries
               * each pixel column's tallest bar; this carries the bar the
               * crosshair snapped to. `Volume reading.dc.html` §02 draws the
               * three candidates — a rule alone, the column repainted, and this
               * — and takes this one: it is the same mark as the price plot's
               * at every density, and it is the only place in the picture the
               * snapped bar's own volume appears at all.
               */}
              <circle
                className={styles.point}
                cx={point.x}
                cy={point.y}
                r={POINT_RADIUS}
              />
            </>
          )}
        </svg>
      </div>

      <Readout
        peakBar={peakBar}
        point={point}
        sizer={readings.at(-1)?.bar}
        timeframe={timeframe}
      />
    </>
  );
}

/** The disc's radius, in pixels — the price plot's, because it is one mark. */
const POINT_RADIUS = 4.5;

/**
 * The strip under the volume axis: one bar's instant and its **exact** traded
 * volume, or — at rest — the window's peak and when it happened.
 *
 * ## Why the resting state is a fact rather than an invitation
 *
 * A second copy of the price strip's invitation would be noise: that sentence
 * is already on the page and it is about a keyboard path belonging to the plot
 * above. An empty reserved row is a hole. So this states the figure the plot
 * exists to make checkable — the window's peak, which is also the number its
 * one gutter label abbreviates, and the one `PRODUCT_SPEC.md` §11 and §38 later
 * qualify as a multiple ("volume 3.8× normal"). Epic 5 owns that clause; until
 * it exists, a readout comparing this bar to anything would be a number this
 * product is not entitled to state.
 *
 * ## The figure is exact, and that is the rule rather than a choice here
 *
 * `VOLUME-AND-WINDOW.md` §5a: abbreviate on the axis and in summaries, never in
 * the reading. So the gutter says `3.13M` and this says `3,131,031`, and the
 * answer to *where does the exact figure still exist* is one pointer move away
 * on the same screen rather than "in the API".
 *
 * ## Both states are reserved, which is one more than the price strip needed
 *
 * `CHARTING.md` §15.4's mechanism, applied to a strip whose two states are
 * **both content**: each is laid out in the same grid cell with all but the
 * live one hidden, so the row is the tallest of them at this width. A
 * `min-height` token cannot do it — the taller state is a function of the width
 * and the two wrap at different places.
 */
function Readout({
  peakBar,
  point,
  sizer,
  timeframe,
}: {
  readonly peakBar: Bar;
  readonly point: ChartPoint | undefined;
  readonly sizer: Bar | undefined;
  readonly timeframe: Timeframe;
}) {
  return (
    <p aria-hidden="true" className={styles.readout}>
      {sizer !== undefined && (
        <span className={cx(styles.line, styles.sizer)}>
          <VolumeFigures bar={sizer} timeframe={timeframe} />
        </span>
      )}
      <span className={cx(styles.line, styles.sizer)}>
        <PeakFigures bar={peakBar} timeframe={timeframe} />
      </span>
      <span className={styles.line}>
        {point === undefined ? (
          <PeakFigures bar={peakBar} timeframe={timeframe} />
        ) : (
          <VolumeFigures bar={point.bar} timeframe={timeframe} />
        )}
      </span>
    </p>
  );
}

/** One bar's instant and its exact traded volume. */
function VolumeFigures({
  bar,
  timeframe,
}: {
  readonly bar: Bar;
  readonly timeframe: Timeframe;
}) {
  return (
    <>
      {/*
       * The same instant, in the same spelling, as the price strip's leading
       * figure — `formatBarInstant` and not a second one. It is the only thing
       * the two strips both say, and saying it two ways would make one reading
       * look like two.
       */}
      <span className={styles.stamp}>
        {formatBarInstant(bar.startsAt, timeframe)}
      </span>
      <Figure emphasised label="Volume" value={formatVolumeExact(bar.volume)} />
    </>
  );
}

/** The window's peak, and the minute it happened in. */
function PeakFigures({
  bar,
  timeframe,
}: {
  readonly bar: Bar;
  readonly timeframe: Timeframe;
}) {
  // **A window in which nothing traded has no peak to state**, and `Peak 0` at
  // an arbitrary minute would be a figure with a false instant attached to it.
  // It is a real answer rather than a case that cannot happen — a thin
  // security's session, or a window of one — and `chart-volume-axis.ts`'s
  // `FLAT_VOLUME_TOP` exists on the scale for the same window. Said in the
  // words `chart-alternative.ts` says it in, because it is the same fact.
  if (bar.volume <= 0) {
    return (
      <span className={styles.flat}>
        No shares changed hands anywhere in the window.
      </span>
    );
  }

  return (
    <>
      <Figure emphasised label="Peak" value={formatVolumeExact(bar.volume)} />
      {/*
       * Secondary, unlike the reading's leading stamp, and that is the whole of
       * how a reader tells the two states apart at a glance: under the pointer
       * the instant is what is being asked about and leads in the primary ink;
       * at rest it is a footnote on a figure.
       */}
      <span className={cx(styles.stamp, styles.quiet)}>
        {formatBarInstant(bar.startsAt, timeframe)}
      </span>
    </>
  );
}

/**
 * One labelled figure — the price strip's component, with its word rather than
 * its initial.
 *
 * `O H L C` is the one place this product abbreviates a label, and it earns it
 * by being the notation of the thing itself. `V` is not notation anybody knows,
 * so volume keeps its word for the same reason the bar's change does.
 */
function Figure({
  emphasised = false,
  label,
  value,
}: {
  readonly emphasised?: boolean;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <span className={styles.figure}>
      <span className={styles.label}>{label}</span>
      <span
        className={cx(styles.value, emphasised ? styles.emphasis : undefined)}
      >
        {value}
      </span>
    </span>
  );
}
