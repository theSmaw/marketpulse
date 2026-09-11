import type { TimeTickOptions } from "./chart-time-axis.js";

// How much chart fits in the space there is (Task 2.12.3).
//
// `VISUAL-LANGUAGE.md`'s _Density, and the chart never stops being a chart_
// settles the table and this file is it in code. Four breakpoints, five value
// gridlines down to three, and **the axis never disappears at any width** — a
// plot with no axis is a sparkline, and a sparkline is a different product.
//
// ## The breakpoints are the region's width, not the viewport's
//
// The Price region is 1,019 px at a 1920 viewport and 342 px at 390
// (`CHARTING.md` §2), and Task 2.11.7's grid narrows it independently of the
// page. A chart keyed on the window would be at its widest treatment inside a
// region that had already collapsed to a column.
//
// ## What is here, and what is deliberately a token
//
// **Counts and policies are here; values are in CSS.** `CLAUDE.md` is explicit
// that CSS is the source of truth for design tokens and `styles/tokens.ts` is a
// typed reader over `getComputedStyle` — so this file does not spell 280 px or
// 56 px. It says *which* pair applies, as a flag, and the component reads
// `--chart-height` / `--chart-height-compact` and `--chart-gutter` /
// `--chart-gutter-compact` and hands the numbers to the scales.
//
// The 600 px boundary is therefore stated **twice** — once in a media query in
// the component's stylesheet, once here — and nothing checks that the two agree.
// That is not avoidable: no stylesheet is applied in the test environment and
// jsdom computes no layout, so a module that read the breakpoint from CSS could
// not be tested without a browser. It is the same class of gap as the grid's
// column count, and it is recorded in the task file rather than left implicit.

/** What a region's width buys. */
export interface ChartDensity extends TimeTickOptions {
  /**
   * How many value gridlines to aim for. A **target**: `valueTicks` only
   * returns ticks that fall inside the domain on round numbers, so a narrow
   * domain yields fewer.
   */
  readonly valueTicks: number;
  /**
   * Whether to use the compact plot height and gutter —
   * `--chart-height-compact` and `--chart-gutter-compact` rather than
   * `--chart-height` and `--chart-gutter`.
   */
  readonly compact: boolean;
}

/**
 * The four breakpoints, widest first.
 *
 * Read as *"at this region width and above"*. The last entry has no lower bound
 * and is what every narrower region gets, which is how the axis is guaranteed
 * never to disappear.
 */
const BREAKPOINTS: readonly (ChartDensity & { readonly from: number })[] = [
  // Everything: five gridlines, every session dated, and times between them.
  {
    from: 900,
    valueTicks: 5,
    sessionLabels: "all",
    intraday: true,
    compact: false,
  },
  // The times go first, because a date is worth more than a time: it is the
  // thing the ordinal axis took away, and the only place the night is given
  // back.
  {
    from: 600,
    valueTicks: 4,
    sessionLabels: "all",
    intraday: false,
    compact: false,
  },
  // The seam *rules* stay — they are what says a night passed — and only the
  // labels reduce. A reader still sees the discontinuity; they read its date off
  // the ends.
  {
    from: 400,
    valueTicks: 3,
    sessionLabels: "ends",
    intraday: false,
    compact: true,
  },
  {
    from: 0,
    valueTicks: 3,
    sessionLabels: "ends",
    intraday: false,
    compact: true,
  },
];

/**
 * What to draw at a given region width.
 *
 * A negative or non-finite width answers with the narrowest treatment rather
 * than throwing. An unmeasured element reports zero — `ResizeObserver` fires
 * once before layout — and a chart that throws on its own first frame would take
 * the region's error boundary with it over a number that is about to be
 * replaced.
 */
export function chartDensity(regionWidth: number): ChartDensity {
  const width = Number.isFinite(regionWidth) ? Math.max(0, regionWidth) : 0;

  for (const breakpoint of BREAKPOINTS) {
    if (width >= breakpoint.from) {
      return {
        valueTicks: breakpoint.valueTicks,
        sessionLabels: breakpoint.sessionLabels,
        intraday: breakpoint.intraday,
        compact: breakpoint.compact,
      };
    }
  }

  /* v8 ignore next 2 -- unreachable: the last breakpoint starts at 0 and a
     negative width is clamped by the `>=` above reaching it. */
  throw new RangeError(
    `No chart density for a region ${String(width)}px wide.`,
  );
}
