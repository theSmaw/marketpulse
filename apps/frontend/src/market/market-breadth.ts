import type {
  WireMarketBreadth,
  WireMarketOverview,
} from "@marketpulse/shared";

import {
  directionOf,
  formatSignedCount,
  type PriceDirection,
} from "./price-format.js";

// What the breadth region reads, from the overview frame alone (Task 4.4.5,
// `The breadth ledger.dc.html`).
//
// ## Nothing here counts
//
// The three buckets, the denominator they sum to and the size of the set they
// are a part of all arrive decided — `market-breadth.ts` in the backend fills
// them in one pass, and `one-producer-of-the-overview-aggregate` permits
// exactly one call site. This module turns them into rows, a fraction per band
// and four strings. **A `+ 1` anywhere in this file would be a second count**,
// and the one that drifts: the wire's `measured` is the sum of its own
// accumulators, so a browser that re-derived it would be stating a denominator
// nobody counted.
//
// The one arithmetic here is a **subtraction** of two printed figures —
// `tracked − measured` for the trailing row and `advancing − declining` for the
// headline — and both are checkable by eye against digits that are on screen
// beside them. That is the property the ledger's shape was chosen for
// (`The breadth ledger.dc.html` §03 and §05): a sum cannot disagree with its
// addends.
//
// ## The three rows are a closed vocabulary in a fixed order
//
// `Advancing` / `Declining` / `Unchanged`, always all three, never re-ordered
// and never four. The order is a vocabulary rather than a ranking — which is
// why the component draws two `<dl>`s and not an `<ol>` — and the fourth figure
// a reader might expect, *not heard from*, is deliberately **not** in the
// ledger: it is not on the 0–N scale, and a fourth band from the same origin
// would assert a four-part whole that does not exist.
//
// ## It names no feed, no venue, no instant and no connection word
//
// `LIVE` / `STALE` / `DISCONNECTED` have one home and it is the status bar, and
// `one-home-for-the-feed-words` covers this route. `computedAt` is already
// drawn by `OverviewSourceNote` under `Computed`, so **the region prints no
// instant** — the only method clause it carries is the window, which qualifies
// the count 24 px above it and would be a footnote nobody reads 500 px below.
//
// ## What is NOT here, and is Task 4.4.6's
//
// Every string below is **placement at a realistic length**. The designed
// wording of the denominator sentence, the quiet group's heading, the session
// grammar's label and the four absence sentences are Task 4.4.6's, together
// with the re-measure of N over the 503, the `useWaited` silence sentence and
// the N = 1 rule. What this module owes that task is that each string has
// exactly one home and is keyed on the **basis the wire sent** rather than on
// anything a renderer guessed.

/** Room and nothing else — see {@link RESERVED_BREADTH}. */
const NBSP = "\u00a0";

/** The three states, by the name the wire gives each bucket. */
export type BreadthBucket = "advancing" | "declining" | "unchanged";

/**
 * The fixed vocabulary order, and the one place it is stated.
 *
 * A `const` array rather than three literals at the call site, so a reader of
 * the component cannot re-order the rows by accident and the test that asserts
 * the order has something to assert it against.
 */
const BUCKETS: readonly BreadthBucket[] = [
  "advancing",
  "declining",
  "unchanged",
];

/**
 * The word on the row, and **it is the row's direction channel**.
 *
 * Not a glyph and not a colour: `PriceChange` owns the pairing of a direction
 * with a glyph, a hidden spoken word and an ink, module-private on purpose, and
 * a breadth row must not become a second speller of that table. It does not
 * need to be — spoken, `Advancing up 284` is the redundancy audible.
 *
 * The three bands are one grey under `grayscale(1)` (measured: 1.57:1, 1.05:1
 * and 1.50:1 at the three pairs), so hue carries nothing here and the word
 * carries everything.
 */
const BUCKET_LABELS: Readonly<Record<BreadthBucket, string>> = {
  advancing: "Advancing",
  declining: "Declining",
  unchanged: "Unchanged",
};

/** One row of the ledger: a label, a printed count and a band. */
export interface BreadthRow {
  /** The React key, and what picks the band's ink. */
  readonly bucket: BreadthBucket;
  readonly label: string;
  readonly count: number;
  /**
   * The band's length as a share of the track, `0` to `1`.
   *
   * **Against N and never against the set**, which is the shape's own decision:
   * three bands drawn against 503 while the rows count 451 are three bands that
   * are all 10% short, with a strip of nothing at the right end that looks like
   * a fourth state and is not labelled as one. `0` when nothing was measured,
   * which is the state where the whole ledger is suppressed anyway.
   */
  readonly fraction: number;
}

/** The headline — the one figure in the region with a direction of its own. */
export interface BreadthNet {
  /** Already formatted, sign included — `PriceChange`'s own contract. */
  readonly change: string;
  readonly direction: PriceDirection;
}

/** The region, in one value. */
export interface MarketBreadth {
  /** Three, always, in {@link BUCKETS}' order. */
  readonly rows: readonly BreadthRow[];
  /**
   * **N** — the scale's right endpoint and the denominator, printed once, at
   * the right end of the ladder.
   *
   * The denominator **is** the scale, so printing the endpoint and stating the
   * denominator are one act — which is Task 4.1.5's *it qualifies a figure
   * rather than the screen* satisfied by geometry rather than by a sentence.
   */
  readonly measured: number;
  /** The size of the set, printed once, in the quiet group's heading. */
  readonly tracked: number;
  /**
   * `tracked − measured`, drawn below a rule in the aligned count column.
   *
   * **Never labelled `unobserved`.** That word is the union `stored ∪ unknown`
   * and a fourth word beside three already on the wire leaves nobody able to
   * say which of the four a reader is looking at — so the row is labelled with
   * what it is in the positive and the word stays out of the tree entirely.
   */
  readonly unheard: number;
  /**
   * `advancing − declining`, or **absent at N = 0**.
   *
   * ADR 0029: a net over zero observations is a fully-formed figure about
   * nothing. It is derived here rather than carried on the frame because a
   * `netAdvancing` field would be a second producer of a figure the browser can
   * subtract — and the one that drifts, since the counts and their net would
   * then be computed in two places on the same object.
   */
  readonly net: BreadthNet | undefined;
  /** The quiet group's heading. Names the set; the row below it is the remainder. */
  readonly setHeading: string;
  /** The quiet row's label — the session grammar's, or the live one's. */
  readonly unheardLabel: string;
  /**
   * The region's footer: what *heard from* means, in one clause.
   *
   * **The window, never the instant.** Gate 1 split the denominator by grain —
   * the count is a figure and lives in the region, `computedAt` is the method
   * and lives in the one source note at the foot of the screen — and this is
   * the clause that reconciles the two documents that read as though they
   * disagreed. It names no count: N is 24 px above it on the axis, and the same
   * number twice inside 24 px reads as a mistake whatever the architecture
   * says.
   */
  readonly claim: string;
}

/**
 * Read the overview frame's breadth section.
 *
 * `undefined` is **the absence of the section**, which a renderer draws as the
 * region's reserved state rather than as three zeros. Two ways to reach it and
 * they are one state on screen: no frame has arrived at all, or the frame
 * carries no readable `breadth` — *this gateway does not send breadth*, which
 * is a rollback pinning a previous image rather than a fault. `readBreadth`
 * refuses a section whose counts do not sum to its denominator or whose
 * denominator exceeds its set, so an unreadable section arrives here as the
 * same absence.
 *
 * **Absence is never expressed as zeros, and `measured: 0` is not absence.**
 * A section reading `advancing: 0, declining: 0, unchanged: 0, measured: 0` is
 * the honest *we counted and heard nothing* — CI's store, and every process for
 * its first minutes — and it is a different state from the section not being
 * there.
 */
export function marketBreadth(
  overview: WireMarketOverview | undefined,
): MarketBreadth | undefined {
  const breadth = overview?.breadth;
  if (breadth === undefined) return undefined;

  const { measured, tracked } = breadth;
  const net =
    measured === 0 ? undefined : breadth.advancing - breadth.declining;

  return {
    rows: BUCKETS.map((bucket) => ({
      bucket,
      label: BUCKET_LABELS[bucket],
      count: breadth[bucket],
      fraction: measured === 0 ? 0 : breadth[bucket] / measured,
    })),
    measured,
    tracked,
    unheard: tracked - measured,
    net:
      net === undefined
        ? undefined
        : {
            change: formatSignedCount(net),
            // `?? "unchanged"` is the fallback six shipped call sites already
            // take: `directionOf` answers `undefined` only for a non-finite
            // figure, and a difference of two integers the wire's own
            // cross-field check passed cannot be one.
            direction: directionOf(net) ?? "unchanged",
          },
    setHeading: `Of the ${String(tracked)} we track`,
    unheardLabel: unheardLabelOf(breadth),
    claim: claimOf(breadth),
  };
}

/**
 * **The paint before the first frame: the region's own geometry, held and
 * invisible** — `SectorPerformanceReservation`'s idiom, unchanged, and for the
 * measured reason recorded there.
 *
 * At 1440 and 1024 the region's height is the grid's `1fr` share and a reserved
 * panel and a filled one are the same box, so a reservation costs nothing
 * there. At **768 and 390 the grid row is content-sized**, so without one the
 * landing page would step by the whole of this region a moment after it
 * painted, taking every region below it and the source note with it.
 *
 * ## Why the figures are zeros and the words are a non-breaking space
 *
 * The whole subtree is `visibility: hidden` and `aria-hidden`, so nothing here
 * is seen or spoken — but **a hidden string is still in `textContent`**, which
 * is one `expect` away from being asserted (`RankedList`'s own lesson about its
 * reserved heading). A word reads as a claim: `Of the 0 we track` is false, and
 * so is any clause about a window nothing was counted in. A digit does not —
 * `0` in a region holding room for a count it has not received is the same
 * answer the component's N = 0 state draws, honestly.
 *
 * Every track left of the band is a fixed length and every reserve is a
 * minimum, so the room this holds does not depend on any of the values below.
 */
export const RESERVED_BREADTH: MarketBreadth = {
  rows: BUCKETS.map((bucket) => ({
    bucket,
    label: BUCKET_LABELS[bucket],
    count: 0,
    fraction: 0,
  })),
  measured: 0,
  tracked: 0,
  unheard: 0,
  net: undefined,
  setHeading: NBSP,
  unheardLabel: NBSP,
  claim: NBSP,
};

/**
 * What the trailing row is called, which **depends on the question the count
 * answered**.
 *
 * `Not heard from` is a claim about a live feed, and it is false about a closed
 * market: out of hours nothing is heard from and the figure is instead how much
 * of the store has two sessions behind it. So the label is keyed on the basis
 * the wire sent rather than on a clock this module would have to read.
 *
 * **Both strings are placement at a realistic length and are Task 4.4.6's to
 * word**, together with the two grammars of the clause below. What is fixed
 * here is that there is one of them per basis and that neither can render the
 * other's.
 */
function unheardLabelOf(breadth: WireMarketBreadth): string {
  return breadth.basis === "observed" ? "Not heard from" : "No prior close";
}

/**
 * The footer clause, in the grammar of the basis.
 *
 * **The window is read, never spelled.** `windowMinutes` is the producer's own
 * figure, so the clause cannot be wrong about the count beside it — a rollback
 * can put a gateway and a bundle two values apart, and a `5` typed here would
 * be the second home for a number this repository has already decided travels.
 */
function claimOf(breadth: WireMarketBreadth): string {
  if (breadth.basis === "session") {
    return `Close to close on ${breadth.session}.`;
  }

  const minutes = breadth.windowMinutes;
  const unit = minutes === 1 ? "minute" : "minutes";
  return `Heard from means at least one observation in the last ${String(minutes)} ${unit}.`;
}
