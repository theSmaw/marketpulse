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
// and the region's words. **A `+ 1` anywhere in this file would be a second
// count**,
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
// ## The denominator sentence is the only delivery of N to a LISTENER
//
// **Task 4.4.6, and it is this story's own thesis failing for one audience.**
// N is printed once, as the ladder's right endpoint, and the ladder is
// `aria-hidden` — `RankedList`'s decision at its own ladder, inherited
// correctly. Read from the accessibility tree rather than from the DOM, a
// listener gets the three counts, the set heading, the remainder and the
// footer, and **never the denominator this story exists to put on screen.**
//
// It is a defect in no file: the ladder is correctly hidden, the counts are
// correctly labelled, nothing is missing from the DOM. So the repair is a
// **second rendering of one string** rather than a second string —
// {@link BreadthClaim}, whose drawn half may omit what the geometry already
// draws and whose spoken half may not, because for a listener there is no
// geometry.
//
// `one fact has one home` (ADR 0029) is satisfied the way it is satisfied
// everywhere else in this product: *a drawn sentence and its spoken twin are
// one string with two renderings*. Both halves are built here, in one function,
// from the same three fields of the same frame.

/** Room and nothing else — see {@link RESERVED_BREADTH}. */
const NBSP = "\u00a0";

/**
 * The smallest N a band, an origin rule or a printed ladder may be drawn
 * against — see {@link MarketBreadth.scale}, which argues it.
 *
 * Spelled once, as a name, because the two values it excludes are excluded for
 * two different reasons and a bare `< 2` at a call site would read as an
 * off-by-one.
 */
const SMALLEST_DRAWABLE_SCALE = 2;

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
   * The band's length as a share of the track, `0` to `1` — or **`undefined`
   * when no proportional picture may be drawn at all**.
   *
   * **Against N and never against the set**, which is the shape's own decision:
   * three bands drawn against 503 while the rows count 451 are three bands that
   * are all 10% short, with a strip of nothing at the right end that looks like
   * a fourth state and is not labelled as one.
   *
   * `undefined` below {@link SMALLEST_DRAWABLE_SCALE} — see
   * {@link MarketBreadth.scale}, which is the one place that threshold is
   * decided. It is not `0`: a zero-length band and *there is no scale to draw a
   * band against* are different facts, and the first is already the honest
   * drawing of `Unchanged 0`.
   */
  readonly fraction: number | undefined;
}

/**
 * **The footer clause, in two renderings of one string** — Task 4.4.6, and the
 * repair for the finding in this module's header.
 *
 * ## Why two renderings rather than two strings
 *
 * Because they are one fact — *what the count was taken over* — and the only
 * difference is what the reader has already been given. A sighted reader has N
 * 24 px above the clause, at the ladder's right endpoint, so the drawn
 * rendering states the **method** and stating N again inside 24 px would read
 * as a mistake whatever the architecture says. A listener has none of that:
 * the ladder is `aria-hidden`, so for them the clause is **the only place the
 * denominator exists**.
 *
 * So the drawn half may omit what the geometry draws, and the spoken half may
 * not. Built together, from the same three fields, in {@link claimOf} — which
 * is what makes them unable to disagree about the window, the session or N.
 *
 * ## And at N = 0 they are the same string
 *
 * There is no ladder in that state (ADR 0029 — a scale whose endpoints are both
 * `0` is a fully-formed claim about nothing), so there is nothing for the drawn
 * half to defer to and the sentence itself is what explains the room the
 * suppression is holding. **That is the only sentence the state draws**: the
 * quiet group two lines above already carries the set and the remainder, and a
 * second sentence over the held rows would be the same fact a third time.
 */
export interface BreadthClaim {
  /** What is on the screen, under the ladder it defers to. */
  readonly drawn: string;
  /**
   * What a listener is handed — **the denominator sentence**, and the one
   * delivery of N to that audience.
   *
   * The owner's wording from Task 4.1.1, with the noun the Gate 1 set change
   * requires: *of the 503 companies we track, N were heard from in the last 5
   * minutes.* Every figure in it is **read** — `tracked`, `measured` and
   * `windowMinutes` or `session`, all off the frame — because a literal `503`
   * is a lie with no symptom the day a constituent is delisted and a literal
   * `5` is a second home for a window a rollback can move.
   */
  readonly spoken: string;
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
   * **N, when a proportional picture may be drawn against it** — the ladder's
   * printed right endpoint and the bands' denominator, or `undefined` when
   * there is no scale.
   *
   * ## The threshold is TWO, and the second one is the interesting one
   *
   * At N = 0 a scale whose endpoints are both `0` is undrawable and three bands
   * over zero observations are a partition of nothing (ADR 0029, and it is CI's
   * permanent state).
   *
   * At **N = 1** the arithmetic is sound and the picture lies: one bucket holds
   * the one security, its fraction is `1`, and it draws a **full-track band** —
   * which reads as *the whole market is advancing* and is a statement about the
   * market rather than about the one name we heard from. Technically true, and
   * the thing a reader takes from a band is proportion. So the bands, the
   * origin rule and the printed ladder all go, together, as one decision with
   * one trigger; the three counts stay, because `Advancing 1 / Declining 0 /
   * Unchanged 0` is exactly what we know.
   *
   * Reachable rather than theoretical: Task 4.1.6 measured a five-minute
   * minimum of **5** during a session, so single figures are an extended-hours
   * or dying-feed reading.
   */
  readonly scale: number | undefined;
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
   * The region's footer — one clause, two renderings. See {@link BreadthClaim}.
   *
   * **The window, never the instant.** Gate 1 split the denominator by grain —
   * the count is a figure and lives in the region, `computedAt` is the method
   * and lives in the one source note at the foot of the screen — and this is
   * the clause that reconciles the two documents that read as though they
   * disagreed.
   */
  readonly claim: BreadthClaim;
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
  const scale = measured < SMALLEST_DRAWABLE_SCALE ? undefined : measured;

  return {
    rows: BUCKETS.map((bucket) => ({
      bucket,
      label: BUCKET_LABELS[bucket],
      count: breadth[bucket],
      fraction: scale === undefined ? undefined : breadth[bucket] / scale,
    })),
    measured,
    tracked,
    scale,
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
    fraction: undefined,
  })),
  measured: 0,
  tracked: 0,
  scale: undefined,
  unheard: 0,
  net: undefined,
  setHeading: NBSP,
  unheardLabel: NBSP,
  claim: { drawn: NBSP, spoken: NBSP },
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
 * How many were counted, as the sentence says it — and **the only agreement
 * this module has to get right**.
 *
 * `1 were heard from` is the defect a count's own grammar invites, and it is
 * reachable: Task 4.1.6 measured a five-minute minimum of 5 during a session,
 * so single figures are an extended-hours reading rather than an impossibility.
 * `none` rather than `0`, because a sentence reading *0 were heard from* is a
 * figure where a word belongs.
 */
const countAs = (measured: number): string =>
  measured === 0 ? "none" : String(measured);

/**
 * The footer clause, in the grammar of the basis and in both renderings.
 *
 * **The window is read, never spelled.** `windowMinutes` is the producer's own
 * figure, so the clause cannot be wrong about the count beside it — a rollback
 * can put a gateway and a bundle two values apart, and a `5` typed here would
 * be the second home for a number this repository has already decided travels.
 * The same rule covers the set: `tracked` is counted by the producer over the
 * array it was handed, and the noun beside it is *companies we track* rather
 * than a figure.
 *
 * ## Why the session grammar is `had` rather than `were`
 *
 * Because a closed market's count is about a session that has ended, and
 * because the past tense is the one verb in English that does not have to agree
 * with the number in front of it — `1 had` and `451 had` are both right, which
 * removes an agreement this module would otherwise have to get right twice.
 * The live grammar has no such escape, so {@link countAs} and the `was`/`were`
 * pair below are explicit.
 *
 * ## `Not heard from` is FALSE about a closed market and that is the whole
 * reason there are two grammars
 *
 * Nothing is heard from out of hours; the figure out of hours is how much of
 * the store has two sessions behind it. The two grammars are keyed on the
 * **basis the wire sent** rather than on a clock this module would have to
 * read, so neither can render the other's — `breadth.session` does not exist
 * on the observed member and `breadth.windowMinutes` does not exist on the
 * session one, which is a compile error rather than a wrong sentence.
 */
function claimOf(breadth: WireMarketBreadth): BreadthClaim {
  const { measured, tracked } = breadth;
  const of = `Of the ${String(tracked)} companies we track`;

  if (breadth.basis === "session") {
    const spoken = `${of}, ${countAs(measured)} had a close-to-close move on ${breadth.session}.`;
    return {
      // At N = 0 the ladder is suppressed, so there is no printed endpoint for
      // a method clause to defer to — see {@link BreadthClaim}.
      drawn: measured === 0 ? spoken : `Close to close on ${breadth.session}.`,
      spoken,
    };
  }

  const minutes = breadth.windowMinutes;
  const unit = minutes === 1 ? "minute" : "minutes";
  const window = `the last ${String(minutes)} ${unit}`;
  const spoken = `${of}, ${countAs(measured)} ${measured === 1 ? "was" : "were"} heard from in ${window}.`;

  return {
    drawn:
      measured === 0
        ? spoken
        : `Heard from means at least one observation in ${window}.`,
    spoken,
  };
}
