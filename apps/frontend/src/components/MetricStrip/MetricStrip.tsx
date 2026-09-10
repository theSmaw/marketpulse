import type { ReactNode } from "react";

import { cx } from "../../cx.js";
import styles from "./MetricStrip.module.css";

// A row of labelled figures — a security's open, high, low and close; how many
// securities we track and how much history we hold. The thing a person reads
// *before* they have decided what they are looking for.
//
// **Extracted rather than invented.** The layout is the idiom `UniverseTable`'s
// summary strip established and `BarSeriesPanel`'s price strip copied — figure
// large, label small beneath it — and that second copy said so in its own
// comment: "`UniverseTable`'s summary strip is the idiom … reused here rather
// than re-invented". A stated copy is the signal this repository extracts on.
//
// ## Why it is a `<dl>`
//
// Each entry is a term and its value, which is what a description list is, and
// the alternative — a `<div>` per pair with a `<span>` label — is invisible to
// a screen reader as a pairing: it reads as six unrelated fragments rather than
// three labelled figures. This costs nothing in markup and is the sort of thing
// that never gets retrofitted.
//
// The layout wraps each pair in a `<div>` inside the `<dl>`, which is valid
// HTML (the spec allows a wrapper `div` around a `dt`/`dd` group) and is the
// only way to lay pairs out as columns without `display: contents`, which is
// still removed from the accessibility tree in some browsers.
//
// ## The figures are strings, and this component does not format them
//
// It takes whatever it is handed. Formatting a number is a **domain** decision
// — how many significant figures a price carries, whether a volume is
// abbreviated, what an absent value reads as — and every one of those answers
// lives near the data (`market/bar-series-view.ts`, `UniverseTable`'s own
// mapping) rather than in a presentation component. A `MetricStrip` that
// accepted `number` would be a second place those decisions could be taken, and
// the two would drift silently.
//
// ## The figure sits above its label, and the markup is the other way round
//
// A definition list is name-then-value and a screen reader reads document
// order, so the `<dt>` stays first in the source and the stylesheet lifts the
// figure above it with `column-reverse`. Swapping the two elements to match the
// visual order looks identical on screen and reads backwards to anybody who is
// not looking at it.
//
// ## No trend arrows, no colour
//
// A metric here is a *state of the world*, not a move: "518 tracked", "100%
// active". Neither is up or down. The day a strip needs to say a figure has
// risen, the component for that already exists — `PriceChange` — and it pairs
// its colour with a sign and a glyph, which is the rule a green figure in a
// generic strip would quietly break.

export interface Metric {
  /** The uppercase micro-label. Short: two or three words. */
  readonly label: string;
  /** Already formatted. See the header. */
  readonly value: ReactNode;
  /** An optional qualifier set beside the value in secondary ink. */
  readonly detail?: string;
}

export const METRIC_STRIP_SIZES = ["large", "compact"] as const;

export type MetricStripSize = (typeof METRIC_STRIP_SIZES)[number];

export interface MetricStripProps {
  readonly metrics: readonly Metric[];
  /**
   * `large` for the strip under a page title — the figures are the point.
   * `compact` for a strip inside a panel, where they qualify something else.
   */
  readonly size?: MetricStripSize;
}

const SIZE_CLASS: Readonly<Record<MetricStripSize, string | undefined>> = {
  large: styles.large,
  compact: styles.compact,
};

export function MetricStrip({ metrics, size = "large" }: MetricStripProps) {
  return (
    <dl className={cx(styles.strip, SIZE_CLASS[size])}>
      {metrics.map((metric) => (
        <div className={styles.metric} key={metric.label}>
          <dt className={styles.label}>{metric.label}</dt>
          <dd className={styles.value}>
            {metric.value}
            {metric.detail === undefined ? undefined : (
              <span className={styles.detail}>{metric.detail}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
