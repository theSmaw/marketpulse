import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";

import { cx } from "../cx.js";
import { getTokens, type TokenName } from "../styles/tokens.js";
import styles from "./chart-tokens.stories.module.css";

// The chart's token vocabulary, shown as a **language** rather than as one
// chart.
//
// **Kept deliberately at Story 2.12's close** (`CHARTING.md` §17.4), when every
// token on it had acquired a real consumer and the obvious reading was that it
// had become redundant. It is the only surface that shows the marks side by
// side at their real weights, and it is where Epic 5's anomaly markers and Epic
// 9's filing markers get reviewed before they are drawn anywhere. The trigger
// for removing it is a condition: the first time a token here disagrees with
// what the chart draws.
//
// **Task 2.13.2 added the volume vocabulary to it for exactly that reason** —
// three tokens with no application consumer until Task 2.13.4, reviewed here as
// a language first.
//
// **This file has no component beside it and that is deliberate.** Task
// 2.12.2's fence is that it draws no chart in the application: a token without
// a consumer is fine and expected for one task, and a `ChartTokens.tsx` that
// appeared in order to demonstrate one would be Task 2.12.4 arriving without
// its states, its axis module or its measurement. `check-stories.mjs` enforces
// components → stories and not the reverse, so a stories file standing alone
// passes `pnpm stories` — checked rather than assumed.
//
// What it does instead is show the **marks** at the weights the tokens declare:
// five straight lines, one curve of eight points, and three filled rectangles.
// No scale, no domain, no data, no state union.
//
// The values are read back through `getTokens()` rather than typed in, which
// makes this surface a live reading of the stylesheet instead of a second copy
// of it. A token removed from `tokens.css` throws here naming itself; a token
// whose value changed shows the new value without anybody editing this file.

const meta = {
  title: "Foundations/Chart tokens",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** A token, and the one sentence that says why it has the value it has. */
interface Specimen {
  readonly name: TokenName;
  readonly why: string;
}

const INK: readonly Specimen[] = [
  {
    name: "--chart-axis",
    why: "The one rule on the plot — the bottom, and nothing else. The structural near-black, doing under a plot what it already does under a table head.",
  },
  {
    name: "--chart-grid",
    why: "Value gridlines, horizontal only. 1.27:1 on the raised surface, and 1.11:1 where a wash passes under one.",
  },
  {
    name: "--chart-seam",
    why: "The session boundary — the one vertical rule this chart draws, because it marks the thing an ordinal axis threw away. Louder than a gridline at 1.70:1.",
  },
  {
    name: "--chart-reference",
    why: "The dashed rule at the window's opening close. The side of it the line finishes on is the direction, which is the channel that is not colour.",
  },
  {
    name: "--chart-series",
    why: "The close line. Achromatic whether the window rose or fell.",
  },
  {
    name: "--chart-crosshair",
    why: "Quieter than the data it points at, and identical under the pointer and under keyboard focus.",
  },
  {
    name: "--chart-point",
    why: "The ring around the disc on the line. The fill is the panel's own ground punched through the series, so the disc reads as a hole and a near-black outline has something to sit outside of.",
  },
  {
    name: "--chart-uncovered",
    why: "The span that was asked for and is not held. The quietest mark in this language, at 1.107:1, and it must not read as a failure.",
  },
  {
    name: "--chart-volume",
    why: "The volume column, and the one chart ink with a measured contrast floor rather than a measured cost: 3.50:1 on the panel, 3.16:1 on the uncovered ground, 3.05:1 and 3.01:1 on the two washes. It never encodes direction.",
  },
];

const WASHES: readonly Specimen[] = [
  {
    name: "--price-positive-wash",
    why: "The area between the line and the reference, when the window rose.",
  },
  {
    name: "--price-negative-wash",
    why: "When it fell.",
  },
  {
    name: "--price-unchanged-wash",
    why: "When it closed where it opened — three states, as the price trio is three.",
  },
];

const GEOMETRY: readonly Specimen[] = [
  {
    name: "--chart-series-width",
    why: "Measured against both ends of the region's width range: 1px disappears at 1,019px, 2px is a solid mass at 342px.",
  },
  { name: "--chart-height", why: "The plot at 600px of region and above." },
  { name: "--chart-height-compact", why: "Below it." },
  {
    name: "--chart-gutter",
    why: "The value scale's width, on the right, because right is where the latest price is.",
  },
  { name: "--chart-gutter-compact", why: "Below 600px of region." },
  {
    name: "--chart-volume-height",
    why: "The supporting plot. 3.18:1 against the price plot, taken against the reading it has to support: a window whose peak is 3.8× its typical bar draws that bar at 23px.",
  },
  {
    name: "--chart-volume-height-compact",
    why: "3.24:1 against the compact price plot — the pair keeps the ratio rather than keeping the height.",
  },
];

function Swatches({ specimens }: { specimens: readonly Specimen[] }) {
  const tokens = getTokens();

  return (
    <div className={styles.swatches}>
      {specimens.map(({ name, why }) => (
        <Fragment key={name}>
          <span
            className={styles.chip}
            style={{ background: `var(${name})` }}
            aria-hidden="true"
          />
          <span className={styles.name}>{name}</span>
          <span className={styles.value}>{tokens[name]}</span>
          <span className={styles.why}>{why}</span>
        </Fragment>
      ))}
    </div>
  );
}

export const Ink: Story = { render: () => <Swatches specimens={INK} /> };

export const Washes: Story = { render: () => <Swatches specimens={WASHES} /> };

export const Geometry: Story = {
  render: () => {
    const tokens = getTokens();

    return (
      <div className={styles.geometry}>
        {GEOMETRY.map(({ name, why }) => (
          <Fragment key={name}>
            <span className={styles.name}>{name}</span>
            <span className={styles.value}>{tokens[name]}</span>
            <span className={styles.why}>{why}</span>
          </Fragment>
        ))}
      </div>
    );
  },
};

// Eight points, hand-written, and a mirror of them. Not market data and not
// pretending to be: they exist so the stroke weight has something to be a
// stroke weight of, and so the greyscale story below has a line that genuinely
// finishes on the other side of the reference rule.
//
// `REFERENCE_Y` is the y the dashed rule sits at, and both shapes start on it —
// which is what a reference at the window's *opening close* means.
const REFERENCE_Y = "86";

const SHAPE_UP = "M0,86 L60,80 L120,94 L180,66 L240,72 L300,50 L360,58 L420,32";
const SHAPE_DOWN =
  "M0,86 L60,92 L120,78 L180,106 L240,100 L300,114 L360,106 L420,116";

/**
 * The marks together, at the weights the tokens declare. The nearest thing to a
 * chart this task ships, and it is a specimen rather than a component.
 */
function Marks({ wash, shape }: { wash: string; shape: string }) {
  return (
    <svg
      viewBox="0 0 480 128"
      className={styles.plot}
      role="img"
      aria-label="A specimen of the chart's marks: gridlines, a session seam, a reference rule, the series line, a crosshair with its point, and the uncovered region."
    >
      <rect
        className={styles.uncovered}
        x="430"
        y="0"
        width="50"
        height="120"
      />
      <path
        className={wash}
        d={`${shape} L420,${REFERENCE_Y} L0,${REFERENCE_Y} Z`}
      />
      {[24, 48, 72, 96].map((y) => (
        <line className={styles.grid} key={y} x1="0" y1={y} x2="480" y2={y} />
      ))}
      {[160, 320].map((x) => (
        <line className={styles.seam} key={x} x1={x} y1="0" x2={x} y2="120" />
      ))}
      <line
        className={styles.reference}
        x1="0"
        y1={REFERENCE_Y}
        x2="480"
        y2={REFERENCE_Y}
      />
      <path className={styles.series} d={shape} />
      <line className={styles.crosshair} x1="300" y1="0" x2="300" y2="120" />
      <circle
        className={styles.point}
        cx="300"
        cy={shape === SHAPE_UP ? 50 : 114}
        r="4.5"
      />
      <line className={styles.coverageEdge} x1="430" y1="0" x2="430" y2="120" />
      <line className={styles.axis} x1="0" y1="120" x2="480" y2="120" />
    </svg>
  );
}

export const Marks_: Story = {
  name: "The marks",
  render: () => <Marks wash={cx(styles.washPositive)} shape={SHAPE_UP} />,
};

/** The third wash, which has no other surface. */
export const Unchanged: Story = {
  name: "A window that closed where it opened",
  render: () => <Marks wash={cx(styles.washUnchanged)} shape={SHAPE_UP} />,
};

/**
 * The measurement `market.css` records, made visible.
 *
 * The two washes differ by 1.009:1 under `grayscale(1)` — for practical
 * purposes the same colour. Both rows below are the same drawing; the second is
 * filtered. If the pair on the right can be told apart by anything other than
 * where the line finishes against the dashed reference, something has changed
 * and the measurement needs re-taking.
 */
export const DirectionSurvivesGreyscale: Story = {
  name: "Direction survives greyscale",
  render: () => (
    <div className={styles.pair}>
      <div>
        <span className={styles.pairLabel}>as rendered — up</span>
        <Marks wash={cx(styles.washPositive)} shape={SHAPE_UP} />
      </div>
      <div>
        <span className={styles.pairLabel}>as rendered — down</span>
        <Marks wash={cx(styles.washNegative)} shape={SHAPE_DOWN} />
      </div>
      <div className={styles.greyscale}>
        <span className={styles.pairLabel}>greyscale(1) — up</span>
        <Marks wash={cx(styles.washPositive)} shape={SHAPE_UP} />
      </div>
      <div className={styles.greyscale}>
        <span className={styles.pairLabel}>greyscale(1) — down</span>
        <Marks wash={cx(styles.washNegative)} shape={SHAPE_DOWN} />
      </div>
    </div>
  ),
};

// --- The volume column, at three densities ---
//
// **Specimens, not market data**, and deterministic so that the picture does not
// change between two readers looking at the same decision. A small integer hash
// stands in for a volume series: it has an open-and-close rhythm and occasional
// spikes, which is the shape the mark has to survive.
const SPECIMEN_WIDTH = 480;
const SPECIMEN_HEIGHT = 96;

function specimenVolumes(count: number): readonly number[] {
  return Array.from({ length: count }, (_, i) => {
    // A session-shaped envelope — heavy at the open and the close — with a
    // deterministic jitter and a spike every so often.
    const through =
      (i % Math.max(1, Math.round(count / 5))) /
      Math.max(1, Math.round(count / 5));
    const envelope = 0.35 + 0.65 * Math.abs(through - 0.5) * 2;
    const jitter = ((i * 2654435761) % 1000) / 1000;
    const spike = i % 137 === 0 ? 2.4 : 1;
    return envelope * (0.4 + 0.6 * jitter) * spike;
  });
}

/**
 * The one mark this product draws for volume, and the rule that produces it.
 *
 * **One path at every window.** The columns are butt-capped stems on a single
 * stroked path whose `stroke-width` is the column width, so the element count is
 * one whether the window holds 63 bars or 8,190 — which is the constraint
 * `CHARTING.md` §1 imposes, restated for a mark that is per bar.
 *
 * Three regimes fall out of one question — *does a bar have a pixel of its own?*
 * — rather than out of a chosen breakpoint. Below a pixel per bar the stems
 * overlap completely, so only the tallest in each pixel column can be seen;
 * taking that column's maximum paints the identical picture and bounds the cost
 * by the plot's width rather than by the bar count.
 *
 * This is a specimen of the rule and **not** the shipped implementation, which
 * is Task 2.13.4's and lives beside the rest of the chart's geometry.
 */
function volumeMark(volumes: readonly number[], width: number, height: number) {
  const slot = width / volumes.length;
  const perPixel = slot < 1;
  const gap = slot >= 2 ? 1 : 0;
  const stroke = perPixel ? 1 : slot - gap;

  const peak = Math.max(...volumes);
  const stems: { x: number; value: number }[] = perPixel
    ? Array.from({ length: Math.round(width) }, (_, column) => ({
        x: column + 0.5,
        value: 0,
      }))
    : volumes.map((value, index) => ({ x: (index + 0.5) * slot, value }));

  if (perPixel) {
    volumes.forEach((value, index) => {
      const column = Math.min(
        stems.length - 1,
        Math.floor((index + 0.5) * slot),
      );
      const stem = stems[column];
      if (stem !== undefined && value > stem.value) stem.value = value;
    });
  }

  const d = stems
    .filter((stem) => stem.value > 0)
    .map(
      (stem) =>
        `M${stem.x.toFixed(2)} ${String(height)} L${stem.x.toFixed(2)} ${(
          height -
          (stem.value / peak) * height
        ).toFixed(2)}`,
    )
    .join("");

  return { d, stroke, slot, stems: stems.length, perPixel };
}

function VolumeSpecimen({ bars, label }: { bars: number; label: string }) {
  const mark = volumeMark(
    specimenVolumes(bars),
    SPECIMEN_WIDTH,
    SPECIMEN_HEIGHT,
  );

  return (
    <div>
      <span className={styles.pairLabel}>{label}</span>
      <svg
        viewBox={`0 0 ${String(SPECIMEN_WIDTH)} ${String(SPECIMEN_HEIGHT + 1)}`}
        className={styles.volumePlot}
        role="img"
        aria-label={`A specimen of the volume column at ${String(bars)} bars: ${
          mark.perPixel
            ? "a silhouette, one stem per pixel"
            : `columns ${mark.stroke.toFixed(2)} pixels wide`
        }.`}
      >
        <path className={styles.volume} d={mark.d} strokeWidth={mark.stroke} />
        <line
          className={styles.axis}
          x1="0"
          y1={SPECIMEN_HEIGHT}
          x2={SPECIMEN_WIDTH}
          y2={SPECIMEN_HEIGHT}
        />
      </svg>
      <span className={styles.why}>
        {`${String(bars)} bars · ${mark.slot.toFixed(3)} px per slot · ${
          mark.perPixel
            ? `${String(mark.stems)} stems, one per pixel`
            : `${String(bars)} stems, one per bar`
        }`}
      </span>
    </div>
  );
}

/**
 * The volume mark across the range it actually has to cover — 130× of it.
 *
 * The three specimens are the three regimes, and the thing to look at is that
 * the middle one is not a smaller version of the first: the gap disappears
 * because there is no room for a 1px gap and a 1px column, and the column wins.
 */
export const VolumeDensity: Story = {
  name: "The volume column, at three densities",
  render: () => (
    <div className={styles.volumeSet}>
      <VolumeSpecimen
        bars={40}
        label="≥ 2 px per slot — columns with a 1 px gap"
      />
      <VolumeSpecimen bars={260} label="1 – 2 px per slot — columns, no gap" />
      <VolumeSpecimen
        bars={4000}
        label="< 1 px per slot — a silhouette, one stem per pixel"
      />
    </div>
  ),
};

/**
 * The ink against every ground a column can stand on.
 *
 * `tokens.css` records 3.50:1, 3.16:1, 3.05:1 and 3.01:1, and this is where a
 * reviewer can see rather than read them. The greyscale row is the proof that
 * nothing here depends on hue: volume does not encode direction, so unlike the
 * price plot's wash there is nothing for a filter to take away.
 */
export const VolumeOnEveryGround: Story = {
  name: "The volume column on every ground it can stand on",
  render: () => (
    <div className={styles.pair}>
      {GROUNDS.map(({ token, label }) => (
        <div
          key={token}
          style={{ background: `var(${token})` }}
          className={styles.ground}
        >
          <span className={styles.pairLabel}>{label}</span>
          <VolumeBand />
        </div>
      ))}
      {GROUNDS.map(({ token, label }) => (
        <div
          key={`grey-${token}`}
          style={{ background: `var(${token})` }}
          className={cx(styles.ground, styles.greyscale)}
        >
          <span className={styles.pairLabel}>{`greyscale(1) — ${label}`}</span>
          <VolumeBand />
        </div>
      ))}
    </div>
  ),
};

const GROUNDS: readonly { token: TokenName; label: string }[] = [
  { token: "--surface-raised", label: "the panel" },
  { token: "--chart-uncovered", label: "the uncovered span" },
  { token: "--price-positive-wash", label: "the positive wash" },
  { token: "--price-negative-wash", label: "the negative wash" },
];

function VolumeBand() {
  const mark = volumeMark(specimenVolumes(60), SPECIMEN_WIDTH, 48);

  return (
    <svg
      viewBox={`0 0 ${String(SPECIMEN_WIDTH)} 49`}
      className={styles.volumeBand}
      aria-hidden="true"
    >
      <path className={styles.volume} d={mark.d} strokeWidth={mark.stroke} />
      <line
        className={styles.axis}
        x1="0"
        y1="48"
        x2={SPECIMEN_WIDTH}
        y2="48"
      />
    </svg>
  );
}
