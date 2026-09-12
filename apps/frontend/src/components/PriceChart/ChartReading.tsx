import type { KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";

import type { Bar } from "@marketpulse/shared";

import { cx } from "../../cx.js";
import type { SlotScale } from "../../market/index.js";
import {
  READING_ANNOUNCEMENT_DELAY_MS,
  READING_ANNOUNCEMENT_MIN_GAP_MS,
  barChangePercent,
  clearedAnnouncement,
  directionOf,
  formatBarInstant,
  formatChangePercent,
  formatPrice,
  nearestPlaced,
  nearestSlot,
  readingAnnouncement,
} from "../../market/index.js";
import { PriceChange } from "../PriceChange/PriceChange.js";
import type { ChartPoint, PlotBox } from "./chart-geometry.js";
import styles from "./ChartReading.module.css";

// **Reading a point** (Task 2.12.6) — the crosshair, the four prices of the bar
// under it, and the keyboard path to the same reading.
//
// This is the second thing in MarketPulse that responds to a person, after
// search, and the first that responds continuously.
//
// ## Why it is a component and not a block inside `PriceChart`
//
// **So that a pointer move does not recompute the chart.** Task 2.12.4's
// amendment handed this task a repair it did not take: `PriceChart` calls
// `chartFrame(...)` in its render body with no memoisation, and `chartFrame`
// walks the trading calendar day by day, re-derives the price domain and
// rebuilds a 1,950-point path string. Nothing re-rendered the chart before
// today, so that was not a defect yet. A crosshair is what makes it one.
//
// The amendment offered two repairs and said the second was structurally
// stronger: memoise the frame, or **keep the crosshair's state out of the
// component that computes the frame**. This is the second. The read position
// lives here, so a pointer move re-renders this component and `PriceChart` does
// not render at all — the frame is not recomputed, not compared, and not
// depended upon.
//
// It is stronger than a `useMemo` for a reason worth stating: a memo makes the
// recomputation *conditional*, and the condition is a dependency array somebody
// has to keep right. This makes the re-render not happen. `PriceChart.test.tsx`
// counts `chartFrame` calls across forty arrow presses so the property is
// measured rather than asserted in a comment.
//
// ## One crosshair, one tab stop, one reading
//
// `VISUAL-LANGUAGE.md`'s _One crosshair, for both inputs_: a vertical
// `--chart-crosshair` rule and a white disc with a near-black ring, **identical
// under the pointer and under keyboard focus**. Two treatments would be two
// things to keep correct and a promise that the keyboard path is the lesser one.
//
// And **one tab stop, never one per bar**. The default window is 1,950 bars; a
// focusable element per bar is the naive implementation and is the thing
// `CHARTING.md` §1's element-count constraint forbids outright. Nothing this
// component renders scales with the bar count — the crosshair is one `<line>`
// and one `<circle>`, whatever the series holds.
//
// ## Where the focus ring lands, which corrects the canvas
//
// `Price chart.dc.html` said the disc is hollow "so the focus ring can land on
// it". **The hollow disc is kept and its reason is unchanged**; where the ring
// lands is not, and the correction was forced by building it. With one tab stop
// the point a ring would sit on **may not exist**: a person arriving by `Tab`
// has focus before they have a reading. So the existing global ring — 2px
// near-black at 2px offset, no new token — lands on the plot, because the plot
// is the control.
//
// Two consequences that are load-bearing rather than incidental:
//
//  - **Arriving by keyboard opens on the last bar**, so focus is never a state
//    with nothing in it, and the reading a person lands on agrees with the
//    headline above the plot. `←` walks back from there.
//  - **`Escape` clears the reading and keeps focus**, which is only legible
//    because the ring is on the plot rather than on a disc that has just gone.
//
// `Price reading.dc.html` §04 carries the drawing and the argument.
//
// ## What is announced, and what is not
//
// **A pointer says nothing at all.** A live region driven per pointer-move is
// actively hostile, and the person moving a mouse is not the person listening.
// Keyboard readings are spoken, paced by `chart-reading.ts`'s two numbers —
// settle, then a floor — so holding `→` across a session announces the bar the
// crosshair is on *now* rather than a backlog of the ones it has left.
//
// The sentence names its subject and says *on the bar* out loud, because this
// page carries three statements of direction about three different subjects and
// they disagree constantly. See `chart-reading.ts`.

export interface ChartReadingProps {
  /**
   * The security, from the address — the same prop `BarSeriesPanel` takes and
   * for its reason: the sentence has to name its subject, and a reading exists
   * in states that carry no series to read a symbol off.
   */
  readonly symbol: string;
  /** Every bar with a place on the axis, and the pixel it was drawn at. */
  readonly readings: readonly ChartPoint[];
  /** The plot's measured box, for the crosshair's full-height rule. */
  readonly plot: PlotBox;
  /**
   * The x scale, so a pointer's pixel becomes a slot through **the same
   * arithmetic that placed the marks**, inverted.
   *
   * The alternative the task brief names and forbids is re-deriving a mapping
   * from the element's bounding box, which is a second spelling of the scale
   * and disagrees with the first at the edges.
   */
  readonly slots: SlotScale | null;
}

/** Where the reading came from, which decides whether it is spoken. */
type ReadingSource = "pointer" | "keyboard";

interface ReadingState {
  /** An index into `readings`, or `null` for no reading. */
  readonly index: number | null;
  readonly source: ReadingSource;
}

const NO_READING: ReadingState = { index: null, source: "pointer" };

export function ChartReading({
  symbol,
  readings,
  plot,
  slots,
}: ChartReadingProps) {
  const [reading, setReading] = useState<ReadingState>(NO_READING);
  const hintId = useId();

  // Clamped on read rather than reset on change. `readings` is rebuilt whenever
  // the window or the box changes, and an index held across that is a stale
  // position into a new array — the classic way to render a bar from the
  // security somebody has just navigated away from. Reading it through a bounds
  // check means the stale case renders *no* reading rather than a wrong one.
  const point = reading.index === null ? undefined : readings[reading.index];

  const spoken = useSpokenReading(
    symbol,
    reading.source === "keyboard" ? (point?.bar ?? null) : null,
    reading.source === "keyboard" && reading.index === null,
  );

  // **Nothing to read means nothing to reach**, and that is three decisions at
  // once rather than a guard.
  //
  //  - **No tab stop.** A focusable chart that answers no key press is a stop
  //    that wastes a press, and this component is reached in `loading` and in
  //    `empty` — both of which draw a real frame with no line in it.
  //  - **No invitation.** "Point at the chart to read a bar" over a chart with
  //    no bars is an instruction that does not work.
  //  - **No live region.** This is the page's fourth, and the persistence rule
  //    (`FRONTEND-STATE.md` §7 — a region mounted at the moment it has
  //    something to say is not reliably announced) is satisfied differently
  //    here than by never unmounting: it mounts **empty**, with the answer, and
  //    fills only on a later key press. There is no moment where a sentence and
  //    the element carrying it arrive together.
  //
  // What a crosshair over a chart with no bars should *look* like is Task
  // 2.12.7's, along with every other state. This is the honest zero until then.
  if (readings.length === 0) return null;

  function readAt(clientX: number, element: HTMLElement) {
    if (slots === null || readings.length === 0) return;

    // The element's own left edge, which is the plot's, because this layer sits
    // in the same grid cell as the plot and is measured with it.
    const pixel = clientX - element.getBoundingClientRect().left;
    const index = nearestPlaced(readings, nearestSlot(slots, pixel));
    if (index !== null) setReading({ index, source: "pointer" });
  }

  function step(to: number | null) {
    if (to === null) {
      setReading({ index: null, source: "keyboard" });
      return;
    }
    setReading({
      index: Math.min(readings.length - 1, Math.max(0, to)),
      source: "keyboard",
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (readings.length === 0) return;

    // The last bar on arrival, for the reason in the header: a first press
    // walks from the most recent price, which is the figure already on screen
    // above the plot.
    const from = reading.index ?? readings.length - 1;

    switch (event.key) {
      case "ArrowLeft":
        step(from - 1);
        break;
      case "ArrowRight":
        step(from + 1);
        break;
      case "Home":
        step(0);
        break;
      case "End":
        step(readings.length - 1);
        break;
      case "Escape":
        // Only when there is something to clear. An `Escape` on a chart with no
        // reading belongs to whatever is above this — a dialog, a popover — and
        // swallowing it would make this the component that broke them.
        if (reading.index === null) return;
        step(null);
        break;
      default:
        return;
    }

    // Reached only on a key this component handled, which is what `default`'s
    // early return is for. `Home` and `End` scroll the page otherwise, and a
    // chart that jumped the document to its top on every `Home` would be worse
    // than one with no keyboard path at all.
    event.preventDefault();
  }

  return (
    <>
      {/*
       * The interactive layer, over the plot and in the same grid cell.
       *
       * `role="img"` with a name, rather than a bare focusable `<div>`: axe's
       * `aria-prohibited-attr` rejects `aria-label` on an element with no role,
       * so an unlabelled div would have been a violation and a labelled one a
       * different violation. What it is, is a picture — and it is focusable
       * because reading it is a thing a person does.
       *
       * **The description is attached to something a key press can reach**,
       * which is Story 2.11's lesson written into the one place it would
       * otherwise be forgotten: a description on an unfocusable element is a
       * sentence nobody is ever read.
       *
       * [Task 2.12.8](../../../../../planning/epic-02-security-universe-historical-data/story-12-price-chart/TASK-08-the-text-alternative-and-the-screen-reader-walk.md)
       * owns the text alternative and may want this same element. The element
       * and its name are settled here; what it says about the *series* is not.
       */}
      <div
        aria-describedby={hintId}
        aria-label={`${symbol} price chart`}
        className={styles.reader}
        onBlur={() => {
          setReading(NO_READING);
        }}
        onFocus={() => {
          if (readings.length > 0 && reading.index === null) {
            step(readings.length - 1);
          }
        }}
        onKeyDown={onKeyDown}
        onPointerLeave={() => {
          setReading(NO_READING);
        }}
        onPointerMove={(event) => {
          readAt(event.clientX, event.currentTarget);
        }}
        role="img"
        tabIndex={0}
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
              {/*
               * Drawn **over** the reference rule and **solid** where that rule
               * is dashed, which is already the only difference between two
               * greys of similar weight meeting at right angles. Left to
               * chance, the intersection reads either as a broken rule or as
               * one shape — `Price reading.dc.html` §06 draws all three.
               */}
              <line
                className={styles.crosshair}
                x1={point.x}
                x2={point.x}
                y1={0}
                y2={plot.height}
              />
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

      <Readout point={point} />

      <p className={styles.visuallyHidden} id={hintId}>
        Use the left and right arrow keys to read each bar, Home and End for the
        ends of the window, and Escape to clear the reading.
      </p>

      {/*
       * The page's fourth polite region, and it is safe to be the fourth for one
       * reason: **nothing else on this screen updates when a key is pressed.**
       * `FRONTEND-STATE.md` §7's hazard is two regions updated in the same
       * moment, queued in an order no component controls — and the panel's own
       * region changes when a request lands, which is a moment this one is
       * silent in, and the reverse.
       *
       * Persistent, never unmounted, `role="status"` and never `alert`, and
       * silent on arrival.
       */}
      <p className={styles.visuallyHidden} role="status">
        {spoken}
      </p>
    </>
  );
}

/**
 * The disc's radius, in pixels.
 *
 * Here rather than in the stylesheet because SVG's `r` is a geometry attribute
 * a CSS Module cannot set without a second selector, and the disc's size is the
 * one number on this mark that is not a token. 4.5 is the canvas's, measured
 * against a 1.5px line: smaller and the ring merges with the series it sits on,
 * larger and it covers the neighbouring minutes it is supposed to distinguish.
 */
const POINT_RADIUS = 4.5;

/**
 * The strip under the axis: one bar's time, its four prices, and its change.
 *
 * ## Why it is here rather than beside the plot or over it
 *
 * Three placements were drawn on `Price reading.dc.html` §01 and two were
 * declined.
 *
 * **Over the plot**, following the pointer, is what most charts do. It covers
 * the mark it describes — so it needs collision-avoidance logic — and it moves
 * while somebody reads a number, which is the one thing this language never
 * does.
 *
 * **A column beside the plot** is honest and does not survive the product. The
 * Price region is 1,019px wide at a 1920 viewport and **342px at 390**
 * (`CHARTING.md` §2), so a 200px column leaves a 140px chart and the narrow case
 * needs a second layout. Two layouts is two things to keep correct, which is the
 * same argument that gave this chart one crosshair rather than two.
 *
 * **A strip under the axis** covers nothing, never moves, and is the same shape
 * at every width — and the crosshair's own vertical rule points down at it.
 *
 * ## The height is reserved whether or not there is a reading
 *
 * A region that grows when a pointer enters it is a page that jumps under
 * somebody's hand, and the figures below this strip are the exact ones the
 * picture rounds. So the empty state is the same height as the full one, and it
 * holds **the invitation** — which is the only affordance this chart has, and
 * the only thing in the product that says the keyboard path exists.
 *
 * ## The change is labelled `BAR`, and that label is load-bearing
 *
 * Three things on this screen say up or down, about three different subjects:
 * the headline (what the **window** did), the wash (whether the price **at that
 * point** is above where the window opened) and this (what **one bar** did). All
 * three can disagree at once and every one of them is right while they do. The
 * precedent is the identity block's `LAST SESSION CLOSE` beside the chart's
 * current value: two figures, two subjects, told apart because each is labelled.
 */
function Readout({ point }: { readonly point: ChartPoint | undefined }) {
  if (point === undefined) {
    return (
      <p className={styles.readout}>
        <span className={styles.invitation}>
          Point at the chart, or press the left and right arrow keys, to read a
          bar.
        </span>
      </p>
    );
  }

  const { bar } = point;
  const percent = barChangePercent(bar);

  return (
    <p className={styles.readout}>
      {/*
       * The instant leads, and it is the reason a reading is never ambiguous.
       * The axis is ordinal — it draws no gap between Friday's last minute and
       * Monday's first — so a time alone does not say which session, and the
       * crosshair snaps to the nearest bar that exists rather than to the pixel
       * under the pointer. Both of those are honest **because** this is here.
       */}
      <span className={styles.stamp}>{formatBarInstant(bar.startsAt)}</span>
      <Figure label="O" value={formatPrice(bar.open)} />
      <Figure label="H" value={formatPrice(bar.high)} />
      <Figure label="L" value={formatPrice(bar.low)} />
      <Figure emphasised label="C" value={formatPrice(bar.close)} />
      {percent !== null && (
        <span className={styles.figure}>
          <span className={styles.label}>Bar</span>
          <PriceChange
            change={formatChangePercent(percent)}
            direction={directionOf(percent)}
          />
        </span>
      )}
    </p>
  );
}

/**
 * One labelled figure.
 *
 * Single letters for the four prices, which is the one place in this product
 * that abbreviates a label — and it is the right call at this size: `O H L C`
 * is the notation of the thing itself, the strip is read left to right in one
 * glance, and the words are stated in full in the metric strip a few
 * centimetres below. The bar's change keeps its word, because `B` is not
 * notation anybody knows.
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
      <span className={cx(styles.value, emphasised ? styles.close : undefined)}>
        {value}
      </span>
    </span>
  );
}

/**
 * What the live region holds, and when it is allowed to change.
 *
 * `SecuritySearch`'s `useAnnouncement`, with one difference: the sentence is
 * derived from a bar rather than from a query, and a *cleared* reading is a
 * sentence rather than silence — `Escape` is a thing the person did and a
 * listener is owed the result of it.
 *
 * The two numbers and what they each answer are in `chart-reading.ts`. What is
 * here is the mechanism: the wait is whichever of *settle* and *floor* is
 * longer, and what lands when it ends is the reading as it is **now**, because
 * each run of the effect cancels the one before it. A floor therefore delays an
 * announcement and never queues a stale one.
 */
function useSpokenReading(symbol: string, bar: Bar | null, cleared: boolean) {
  const sentence = cleared
    ? clearedAnnouncement(symbol)
    : readingAnnouncement(symbol, bar);
  const [spoken, setSpoken] = useState("");

  // Written only inside the effect. A ref written during render is what the
  // React Compiler's `refs` rule rejected in `SecuritySearch`, correctly.
  const lastSpokenAt = useRef(0);

  useEffect(() => {
    if (sentence === null) return;

    const sinceLast = Date.now() - lastSpokenAt.current;
    const wait = Math.max(
      READING_ANNOUNCEMENT_DELAY_MS,
      READING_ANNOUNCEMENT_MIN_GAP_MS - sinceLast,
    );

    const timer = setTimeout(() => {
      lastSpokenAt.current = Date.now();
      setSpoken(sentence);
    }, wait);
    return () => {
      clearTimeout(timer);
    };
  }, [sentence]);

  // Silence is **derived**, not scheduled: a pointer reading and the resting
  // state must empty the region in the same render rather than 400 ms later.
  return sentence === null ? "" : spoken;
}
