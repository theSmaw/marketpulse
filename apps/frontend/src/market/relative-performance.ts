import {
  PERCENT_DISPLAY_DECIMALS,
  SECTOR_ETFS,
  SECTOR_LABELS,
  changeFromClose,
  changePercent,
  type Bar,
  type Security,
  type SecurityLastClose,
  type WireMarketOverview,
  type WireOverviewFigure,
} from "@marketpulse/shared";

import { directionOf } from "./price-format.js";
import { barFraction } from "./ranked-bar.js";
import {
  CAP_WEIGHTED_CLAUSE,
  basisOf,
  moveOf,
  type SectorMove,
} from "./sector-performance.js";

// What `Relative performance` reads, from figures that are already on the page
// (Task 5.1.3, `The rail that says how unusual.dc.html`).
//
// ## Nothing here fetches, and nothing here is a second join
//
// The three moves are **three reads**. The subject's is `changeFromClose` or
// `changePercent` over the universe answer this route already holds; the two
// references are the backend's own join, carried on the overview frame —
// `overview.figures` for the broad market and `overview.sectors` for the
// benchmark. `asOf` and the figures are arguments, there is no clock, no socket
// and no repository handle in this file, and that is what makes invariant 4
// structural here rather than instructed.
//
// ## Which field a move lives in is asked, never spelled
//
// `moveOf` and `basisOf` are `sector-performance.ts`'s, through
// `moveRankingKey` in `packages/shared`. **The subject is read as a wire figure
// for exactly that reason**: a local shape would have needed its own answer to
// *which field this state's move lives in* and its own answer to *what was it
// measured from*, which is two second homes for one question each. The subject
// genuinely is a figure in the same two states — a live minute's close with an
// instant, or a stored session's close — so {@link subjectFigure} builds one and
// every reader downstream is the one the sector rows already use.
//
// ## It computes no window and makes no judgement about age
//
// Gate 1 decision 9: the region refuses on **mixed basis, absent figures and
// disagreeing closes** and **does not refuse on age**. A comparison of two
// twenty-minute-old moves is a correct comparison, the one home for *the feed
// has stopped* is the status bar, and a minute-scaled cutoff written here would
// be red against `one-home-for-the-observation-window`.
//
// ## And nothing here ranks
//
// Three figures read against each other is not a ranking, and the order is
// fixed at subject → sector → market. `RankedList`'s ordinal, its roving arrow
// group, its quiet group and its held-row padding are all deliberately absent:
// ranking three figures answers a question nobody asked.

/** The subject of the region — this page's security, and what we hold for it. */
export interface RelativeSubject {
  readonly security: Security;
  /** The latest observation, when the live feed has sent one. */
  readonly live: Bar | undefined;
  /** The last stored close, when the universe answer carried one. */
  readonly lastClose: SecurityLastClose | undefined;
}

/**
 * **The broad market's symbol, and the one place this region names it.**
 *
 * It is not derived from the frame: `overview.figures` carries fifteen funds —
 * four index proxies and the eleven benchmarks — in the producer's order, and
 * *which of them is the broad market* is a product decision rather than a
 * property of the frame. `PRODUCT_SPEC.md` and Story 5.1's AC 1 both name it.
 *
 * **It is one ticker and not two**, which matters:
 * `one-pairing-of-a-sector-and-its-benchmark` treats two of the eleven sector
 * funds in one file as a second pairing, and this region reads all eleven
 * through `SECTOR_ETFS` for that reason.
 */
const BROAD_MARKET = "SPY";

/** The rung the track is drawn against — the region's own ladder. */
export const RELATIVE_RUNGS = [1, 2, 5, 10, 25, 50] as const;

/**
 * One rung of {@link RELATIVE_RUNGS}.
 *
 * **A sibling of `SectorLadderStep` rather than a widening of it** (Task
 * 5.1.2's amendment, and each of its four reasons compiles). `SECTOR_LADDER_STEPS`
 * is **on the wire** — `WireMarketOverview.sectorLadderStep` is validated with
 * `isSectorLadderStep` — so adding `25` and `50` there would widen what the
 * sectors region on `/` accepts and ratchets to, from a task that needs no
 * backend change at all; `LARGEST` is `SECTOR_LADDER_STEPS[3]` and would go on
 * calling `10` the largest rung; and that tuple's own test asserts
 * `[1, 2, 5, 10]`, so the widening would announce itself as a red test rather
 * than as a decision.
 *
 * What is shared is the **arithmetic**: `barFraction` and `ladderTicks` take a
 * widened numeric parameter, because two copies of `ladderTicks` would be two
 * answers to *where the gridlines go*. The midpoint rule falls out correctly —
 * `ladderTicks` labels the midpoints only when `step / 2` is an integer, so
 * `±50` labels them and `±25` does not.
 */
export type RelativeRung = (typeof RELATIVE_RUNGS)[number];

/** The smallest rung, and the one a region with nothing to draw sits at. */
const NARROWEST = RELATIVE_RUNGS[0];

/** The widest rung, which a bigger move saturates against. */
const WIDEST = RELATIVE_RUNGS[5];

/** Which of the three figures a row or a line is about. */
export type RelativeRole = "subject" | "sector" | "market";

/** One of the three moves — a row in the region and a mark on the track. */
export interface RelativeEntry {
  readonly role: RelativeRole;
  /** The ticker, printed; `undefined` where there is no fund to name. */
  readonly symbol: string | undefined;
  /** What the row is called — never derived by transform from a slug. */
  readonly label: string;
  /** The move, formatted and raw together — `moveOf`'s, unchanged. */
  readonly move: SectorMove | undefined;
  /** The words that stand where a figure would be, when there is no move. */
  readonly absent: string | undefined;
  /** `basisOf`'s identity — what this figure was measured from. Never drawn. */
  readonly basis: string | undefined;
  /**
   * Where this figure's mark sits across the track, `0` to `100`, or
   * `undefined` with no move.
   *
   * **A reference that is silent draws no mark**, rather than a mark at `50`:
   * absent and unchanged are different claims, and a tick at zero is the second
   * one.
   */
  readonly at: number | undefined;
  /**
   * The figure is past the rung, so the mark is **clipped** and no bracket may
   * be measured from it.
   *
   * A bracket between a clipped end and an unclipped tick is a *wrong* length
   * rather than a saturated one, which is the one thing the printed figures
   * cannot rescue.
   */
  readonly clipped: boolean;
  /** Room and nothing else — the row is in the list and off the screen. */
  readonly held?: boolean;
}

/** The derived figure, or the reason there is not one. */
export type RelativeExcess =
  | {
      readonly kind: "excess";
      /** `behind by 2.2 pts` — the word carries the direction. */
      readonly stated: string;
      /** The span the bracket is drawn over, `0` to `100` on the track. */
      readonly bracket:
        { readonly from: number; readonly to: number } | undefined;
    }
  | {
      readonly kind: "refused";
      /** Why, in this region's own words. One clause, no connection word. */
      readonly because: string;
    };

/** One of the two derived lines — labelled separately, and failing alone. */
export interface RelativeComparison {
  readonly reference: "sector" | "market";
  /** `Against Technology`, `Against the broad market`. */
  readonly label: string;
  readonly excess: RelativeExcess;
}

/** The region, in one value. */
export interface RelativePerformance {
  /** The rung in force — raised by the caller's cell, never lowered. */
  readonly step: RelativeRung;
  /** Three, always three, in the fixed order subject → sector → market. */
  readonly entries: readonly RelativeEntry[];
  /** Two, always two. The sector half and the market half fail independently. */
  readonly comparisons: readonly RelativeComparison[];
  /** The footer's first clause — what the references are. */
  readonly claim: string;
  /**
   * No figure anywhere — the region's honest nothing, and **CI's permanent
   * state**: 516 securities and zero bars, so every entry is `unknown` for
   * ever.
   */
  readonly nothing: boolean;
}

/**
 * **`No comparison yet.` — the fifth honest-nothing noun in this product**,
 * beside `no history stored for NVDA yet`, `no bars stored for this window`,
 * `unknown` and breadth's `heard from`.
 */
export const NO_COMPARISON = "No comparison yet.";

/** A reference we have heard nothing about and hold no close for. */
const NOT_HEARD = "Not heard from";

/** A price with nothing to measure it from — something *is* stored. */
const NO_CLOSE = "No close to measure from";

/** The subject has a figure and no move, so there is nothing to subtract. */
const NO_SUBJECT_MOVE = "No move for this security yet";

/** The reference has no move. The subject's own figure still draws. */
const NO_REFERENCE_MOVE = "No move for the reference yet";

/**
 * **The basis refusal** — the only substance in this region.
 *
 * Two moves are the same units and different claims: live-against-a-close
 * moves while somebody watches it, and close-against-previous-close is a
 * session that is over. Subtracting one from the other produces a number that
 * looks exactly like the answer, which is why the region says this instead.
 */
const MIXED_BASIS = "Measured from different closes";

/** An `index_etf` has no sector, so the sector half does not apply. */
const NO_SECTOR = "A broad-market fund has no sector";

/** A `sector_etf` **is** the benchmark, so the comparison is with itself. */
const IS_BENCHMARK = "This security is its sector’s benchmark";

/** What the subject's row is called. The ticker is beside it. */
const SUBJECT_LABEL = "This security";

/** What the market row and its line are called. */
const MARKET_LABEL = "Broad market";

/** The generic noun for the sector row, where there is no sector to name. */
const SECTOR_LABEL = "Sector";

/**
 * **The footer's first clause, reusing `SECTOR_CLAIM`'s invariant half.**
 *
 * `SPY` needs covering as much as a sector fund does and is the worse case — a
 * mega-cap compared against the S&P 500 is largely being compared with itself —
 * so **one clause covers both references**. The weighting sentence itself is
 * `sector-performance.ts`'s {@link CAP_WEIGHTED_CLAUSE} rather than a second
 * copy: a second home for that clause is the defect `BarSeriesPanel` shipped
 * for two years, and `one-home-for-the-cap-weighting-clause` fails the build on
 * one.
 */
export const REFERENCE_CLAIM = `Each reference is a benchmark ETF — ${CAP_WEIGHTED_CLAUSE}`;

/** The three figures this region reads, before any geometry. */
interface RelativeFigures {
  readonly subject: WireOverviewFigure;
  /** The sector benchmark's, or `undefined` when there is no sector half. */
  readonly sector: WireOverviewFigure | undefined;
  readonly market: WireOverviewFigure | undefined;
  /** The benchmark's ticker and its sector's label, when there is a sector. */
  readonly benchmark:
    { readonly symbol: string; readonly label: string } | undefined;
  /** Why there is no sector half, when there is not one. */
  readonly withoutSector: string | undefined;
}

/**
 * **The subject's own move, read as a figure in the same two states the
 * references arrive in.**
 *
 * The two arms are the two functions `packages/shared` already has, and reading
 * them through one return type is what lets `moveOf` and `basisOf` be the only
 * readers downstream:
 *
 *   - a live observation is `changeFromClose(live, lastClose)` — live against
 *     a close, which is what a market screen means by *today*;
 *   - no observation and a stored close is `changePercent(lastClose)` — that
 *     session's own close-to-close move, which will never change again.
 *
 * ## The one mapping in this file, and the inverted version compiles
 *
 * `LiveChange.basis` is `MarketDate | null` and `changeBasis` is a bare
 * `string | undefined`, and **`null` and absent mean the same thing**: the
 * same-session case, measured from `previousClose`, a number with no date
 * beside it. So `null` becomes **omitted** here, and `basisOf` then reads two
 * same-session figures as one basis.
 *
 * An inverted mapping compiles and is silently wrong on exactly the days the
 * store's last session meets the live session — which is every evening in
 * development and every morning after a deploy.
 */
export function subjectFigure(subject: RelativeSubject): WireOverviewFigure {
  const symbol = subject.security.symbol;
  const { live, lastClose } = subject;

  if (live !== undefined) {
    const change = changeFromClose(live, lastClose);

    return {
      state: "observed",
      symbol,
      at: live.startsAt.toISOString(),
      price: live.close,
      ...(change.percent === null ? {} : { changePercent: change.percent }),
      // The one mapping — see the docblock above. `exactOptionalPropertyTypes`
      // is why it is a spread rather than `changeBasis: change.basis ??
      // undefined`: *absent* and *present as `undefined`* are different types,
      // and only the first is what the wire means.
      ...(change.basis === null ? {} : { changeBasis: change.basis }),
    };
  }

  if (lastClose !== undefined) {
    const session = changePercent(lastClose);

    return {
      state: "stored",
      symbol,
      session: lastClose.session,
      close: lastClose.close,
      ...(session === null ? {} : { sessionChangePercent: session }),
    };
  }

  return { state: "unknown", symbol };
}

/** A figure off a section of the frame, by symbol. */
function figureFor(
  section: readonly WireOverviewFigure[] | undefined,
  symbol: string,
): WireOverviewFigure | undefined {
  return section?.find((figure) => figure.symbol === symbol);
}

/**
 * The three figures and the sector half's own answer.
 *
 * **The type forces the branch** (Gate 1 decision 10): an `index_etf` has
 * `sector: null`, so there is no benchmark to resolve; a `sector_etf` *is* its
 * sector's benchmark, so the comparison would be with itself. Both are
 * reachable routes today and both say so rather than drawing a blank.
 */
function figuresOf(
  subject: RelativeSubject,
  overview: WireMarketOverview | undefined,
): RelativeFigures {
  const market = figureFor(overview?.figures, BROAD_MARKET);
  const { security } = subject;

  if (security.kind === "index_etf") {
    return {
      subject: subjectFigure(subject),
      sector: undefined,
      market,
      benchmark: undefined,
      withoutSector: NO_SECTOR,
    };
  }

  const benchmark = {
    symbol: SECTOR_ETFS[security.sector],
    label: SECTOR_LABELS[security.sector],
  };

  if (security.kind === "sector_etf") {
    return {
      subject: subjectFigure(subject),
      sector: undefined,
      market,
      benchmark,
      withoutSector: IS_BENCHMARK,
    };
  }

  return {
    subject: subjectFigure(subject),
    sector: figureFor(overview?.sectors, benchmark.symbol),
    market,
    benchmark,
    withoutSector: undefined,
  };
}

/**
 * **Whether two moves may be subtracted** — the predicate this task exists for.
 *
 * Two moves are comparable iff they are the **same kind of move measured from
 * the same close**, which `basisOf` already encodes as one identity string:
 * `observed:<the named close, or empty>` and `stored:<session>`. So there are
 * exactly four outcomes and three of them are refusals:
 *
 *   - both `observed` and the basis agrees — comparable;
 *   - both `observed` and the basis disagrees — refused, two different closes;
 *   - both `stored` and the session agrees — comparable; disagrees — refused;
 *   - **one of each — refused.** The prefix is what carries this, and it is why
 *     the identity is a string with a kind in it rather than a bare date.
 *
 * `undefined` on either side is a figure with no move at all, which is refused
 * for a different reason and is not a basis disagreement — hence the explicit
 * guard rather than `a === b`, which would read two keyless figures as a
 * comparable pair.
 */
export function sharedBasis(
  left: string | undefined,
  right: string | undefined,
): boolean {
  if (left === undefined || right === undefined) return false;
  return left === right;
}

/** Where a move's mark sits across the track, `0` to `100`. */
function positionOf(move: SectorMove, step: RelativeRung): number {
  const reach = barFraction(move.percent, step) * 50;

  // **The side comes from `directionOf`'s answer**, carried on the move, rather
  // than from a comparison here: `one-classifier-for-the-direction-of-a-move`
  // is the one home for which of three buckets a figure falls into, and it
  // decides on the **displayed** figure — so a +0.004% move cannot draw a mark
  // to the right of a zero it prints as `0.00%`.
  if (move.direction === "negative") return 50 - reach;
  if (move.direction === "positive") return 50 + reach;
  return 50;
}

/** Is this figure past the rung, so its mark is clipped? */
function clipsAt(move: SectorMove, step: RelativeRung): boolean {
  return Math.abs(move.percent) > step;
}

/** The absence words for a figure with no move — three facts, three answers. */
function absenceOf(figure: WireOverviewFigure): string {
  if (figure.state === "unknown") return NOT_HEARD;
  // Something *is* stored — we have just heard from this fund, or we hold its
  // close — and what is missing is the basis.
  return NO_CLOSE;
}

/** One entry, with its geometry. */
function entryOf(
  role: RelativeRole,
  symbol: string | undefined,
  label: string,
  figure: WireOverviewFigure | undefined,
  step: RelativeRung,
): RelativeEntry {
  if (figure === undefined) {
    return {
      role,
      symbol,
      label,
      move: undefined,
      absent: NOT_HEARD,
      basis: undefined,
      at: undefined,
      clipped: false,
    };
  }

  const move = moveOf(figure);

  if (move === undefined) {
    return {
      role,
      symbol,
      label,
      move: undefined,
      absent: absenceOf(figure),
      basis: undefined,
      at: undefined,
      clipped: false,
    };
  }

  return {
    role,
    symbol,
    label,
    move,
    absent: undefined,
    basis: basisOf(figure),
    at: positionOf(move, step),
    clipped: clipsAt(move, step),
  };
}

/** A row that is room and nothing else — the sector half that does not apply. */
function heldEntry(role: RelativeRole, label: string): RelativeEntry {
  return {
    role,
    symbol: undefined,
    label,
    move: undefined,
    absent: undefined,
    basis: undefined,
    at: undefined,
    clipped: false,
    held: true,
  };
}

/** The unit is `pts`, never `%` — the difference of two percentages. */
function statePoints(points: number): string {
  const figure = `${Math.abs(points).toFixed(PERCENT_DISPLAY_DECIMALS)} pts`;

  // **`behind` / `ahead`, not `underperforming` / `outperforming`** — neutral,
  // short, and they survive *ahead while falling*: a security down 4.2% against
  // a sector down 6.0% is ahead, and a word that implied *rose* would be wrong
  // in a box whose other three figures are negative.
  //
  // The word comes from the one classifier, so the three channels cannot
  // disagree: `level` is what `0.00` reads as, rather than `ahead by 0.00 pts`.
  const direction = directionOf(points);
  if (direction === "positive") return `ahead by ${figure}`;
  if (direction === "negative") return `behind by ${figure}`;
  return "level";
}

/**
 * One derived line, from the subject and one reference.
 *
 * **Each figure is true; only the derived line is refused.** The three rows and
 * the three marks are drawn in every branch below — what a refusal removes is
 * the subtraction and the bracket, which are the only things a disagreeing
 * basis makes wrong.
 */
function comparisonOf(
  reference: "sector" | "market",
  label: string,
  subject: RelativeEntry,
  against: RelativeEntry,
  withoutSector: string | undefined,
): RelativeComparison {
  if (withoutSector !== undefined) {
    return {
      reference,
      label,
      excess: { kind: "refused", because: withoutSector },
    };
  }

  if (subject.move === undefined) {
    return {
      reference,
      label,
      excess: { kind: "refused", because: NO_SUBJECT_MOVE },
    };
  }

  if (against.move === undefined) {
    return {
      reference,
      label,
      excess: { kind: "refused", because: NO_REFERENCE_MOVE },
    };
  }

  if (!sharedBasis(subject.basis, against.basis)) {
    return {
      reference,
      label,
      excess: { kind: "refused", because: MIXED_BASIS },
    };
  }

  // **The subtraction, with each side on its own line.** Two percentages
  // either side of one operator is the shape
  // `one-comparator-for-the-order-of-a-move` is keyed on — correctly, because
  // that is what an order written out by hand looks like — and this is a
  // difference rather than an order.
  const ours = subject.move.percent;
  const theirs = against.move.percent;
  const points = ours - theirs;

  const from = subject.at;
  const to = against.at;

  return {
    reference,
    label,
    excess: {
      kind: "excess",
      stated: statePoints(points),
      // **A clipped end draws no bracket** and the printed figures stay exact.
      bracket:
        subject.clipped ||
        against.clipped ||
        from === undefined ||
        to === undefined
          ? undefined
          : { from, to },
    },
  };
}

/**
 * **The rung the three figures fit into, ignoring any previous one.**
 *
 * Measured on the raw figure's magnitude through `barFraction`'s own ladder
 * rather than on a displayed one, because this is a question about the
 * **scale** and the widest rung saturates: a move past `±50` draws a clipped
 * mark and prints exactly, which is the state done-when 4 names.
 *
 * A figure with no move contributes nothing — `fitSectorLadder`'s absent-key
 * rule, for the same reason: a reference we have heard nothing about has not
 * moved 0%, so it must not hold the ladder down at `±1`. Three keyless figures
 * therefore fit the narrowest rung, and nothing is drawn against it.
 */
export function fitRelativeRung(
  subject: RelativeSubject,
  overview: WireMarketOverview | undefined,
): RelativeRung {
  const figures = figuresOf(subject, overview);
  let widest = 0;

  for (const figure of [figures.subject, figures.sector, figures.market]) {
    if (figure === undefined) continue;
    const move = moveOf(figure);
    if (move === undefined) continue;
    widest = Math.max(widest, Math.abs(move.percent));
  }

  return RELATIVE_RUNGS.find((rung) => widest <= rung) ?? WIDEST;
}

/**
 * Read the page's security and the overview frame as the region.
 *
 * `held` is **the rung already in force**, passed through rather than
 * remembered here — `sector-ladder.ts`'s rule, and it is what keeps this
 * module callable from a test with no process behind it. The cell that
 * remembers is the caller's, and in this product it is
 * `RelativePerformance`'s own state: the figures are already on the page and
 * the frame carries no rung for this region.
 */
export function relativePerformance(
  subject: RelativeSubject,
  overview: WireMarketOverview | undefined,
  held: RelativeRung | undefined,
): RelativePerformance {
  const fits = fitRelativeRung(subject, overview);
  const step = held !== undefined && held > fits ? held : fits;

  const figures = figuresOf(subject, overview);

  const subjectEntry = entryOf(
    "subject",
    subject.security.symbol,
    SUBJECT_LABEL,
    figures.subject,
    step,
  );

  const sectorEntry =
    figures.withoutSector === undefined && figures.benchmark !== undefined
      ? entryOf(
          "sector",
          figures.benchmark.symbol,
          figures.benchmark.label,
          figures.sector,
          step,
        )
      : // **Absent rather than empty** — the clause does not apply, so the row
        // is room and the line says why. A row drawn with an em dash would
        // invite a reader to read a value that was never computed.
        //
        // **The label is the generic noun and NOT the refusal sentence.** The
        // first version put `withoutSector` here as well as on the line, which
        // is one sentence in the DOM twice — invisible on screen, because the
        // row is `visibility: hidden`, and a Playwright strict-mode failure in
        // any spec that locates it. `one-home-for-the-empty-explanation`
        // records that exact cost for the chart's four sentences.
        heldEntry("sector", figures.benchmark?.label ?? SECTOR_LABEL);

  const marketEntry = entryOf(
    "market",
    BROAD_MARKET,
    MARKET_LABEL,
    figures.market,
    step,
  );

  const entries = [subjectEntry, sectorEntry, marketEntry];

  return {
    step,
    entries,
    comparisons: [
      comparisonOf(
        "sector",
        `Against ${figures.benchmark?.label ?? "its sector"}`,
        subjectEntry,
        sectorEntry,
        figures.withoutSector,
      ),
      comparisonOf(
        "market",
        "Against the broad market",
        subjectEntry,
        marketEntry,
        undefined,
      ),
    ],
    claim: REFERENCE_CLAIM,
    nothing: entries.every((entry) => entry.move === undefined),
  };
}

/**
 * **The region's held geometry, for the paint before anything has arrived.**
 *
 * The same reservation idiom `RESERVED_SECTORS` carries one screen over, and
 * for the same measured reason: this region sits in a column of three, so a
 * region that grows when a benchmark arrives moves `Anomaly history` under the
 * reader. Every band is held — two headline cells, the track, the ladder, three
 * rows and a two-line footer — and the whole subtree is taken out of the
 * picture and the accessibility tree by the component.
 *
 * `step` is the narrowest rung and **nothing is drawn against it**: no entry
 * has a move, so there is no bar, no tick and no printed ladder, which is ADR
 * 0029 in the state where it matters most.
 */
export const RESERVED_RELATIVE: RelativePerformance = {
  step: NARROWEST,
  entries: [
    heldEntry("subject", SUBJECT_LABEL),
    heldEntry("sector", SECTOR_LABEL),
    heldEntry("market", MARKET_LABEL),
  ],
  comparisons: [
    {
      reference: "sector",
      label: "Against its sector",
      excess: { kind: "refused", because: NOT_HEARD },
    },
    {
      reference: "market",
      label: "Against the broad market",
      excess: { kind: "refused", because: NOT_HEARD },
    },
  ],
  claim: REFERENCE_CLAIM,
  nothing: true,
};
