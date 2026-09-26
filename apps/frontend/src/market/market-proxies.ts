import {
  EXTENDED_HOURS_WORDS,
  extendedHoursAt,
  type Bar,
  type WireMarketOverview,
  type WireOverviewFigure,
} from "@marketpulse/shared";

import { arrivalKey } from "./arrival.js";
import { formatBarInstant } from "./chart-reading.js";
import { formatSessionTime } from "./chart-time-axis.js";
import {
  directionOf,
  formatChangePercent,
  formatPrice,
  type PriceDirection,
} from "./price-format.js";

// What the four index proxies read as, from the overview frame alone
// (Task 4.2.5).
//
// ## Why this is a function and not the component
//
// `MarketProxyStrip` draws three rows in a grid and nothing in this file
// knows that. What is here is the part a test can hold without a browser: which
// of the three wire states a cell is in, how its figure is spelled, what the one
// shared qualifier may honestly claim about four separate observations, and
// which proxies disagree with it. `CHARTING.md`'s split between a reading and a
// renderer, one region along.
//
// ## Nothing here computes a change, and that is AC 2 rather than tidiness
//
// `changePercent` arrives on the wire, already computed by `changeFromClose`
// in `packages/shared` — called by the **backend**, from an IEX numerator and a
// consolidated-SIP denominator this browser cannot see. A second derivation
// here is the ≈0.00% defect `one-home-for-the-live-change` exists to refuse.
// This module formats a number somebody else produced.
//
// ## It names no feed, no venue and no connection word
//
// `LIVE` / `STALE` / `DISCONNECTED` have exactly one home and it is the status
// bar (Story 3.10). What the strip may state is an **instant**, an **age** and
// a **change basis**, all three of which are true of either tape — which is the
// only answer to invariant 6 available without putting a second venue word on a
// screen that already has one.

/** A formatted change and the direction `PriceChange` pairs with a glyph. */
export interface ProxyChange {
  readonly change: string;
  readonly direction: PriceDirection;
}

/**
 * What one cell says, in the three states the wire distinguishes.
 *
 * The three are `WireOverviewFigure`'s own, carried through rather than
 * collapsed: *we have heard nothing about SPY* and *we hold no stored close for
 * SPY* are different facts with different remedies, and neither of them is a
 * zero.
 */
export type ProxyReading =
  | {
      readonly kind: "observed";
      readonly price: string;
      /**
       * Absent when the frame carried no `changePercent` — there was nothing to
       * measure from. ADR 0029: a clause renders only when its own data is
       * present, so the cell shows a price and no change rather than `0.00%`.
       */
      readonly change: ProxyChange | undefined;
      /**
       * `from 12:07`, and only when this proxy's observation is older than the
       * newest one in the same frame.
       *
       * **An age, never a verdict.** `LIVE-DATA.md` §11.2 refused to give a
       * security a status word with a measurement behind it — the ordinary
       * maximum gap between one security's bars is 187 minutes — so this states
       * the instant and makes no judgement about it. On IEX a proxy sitting a
       * few minutes behind is ordinary rather than broken.
       */
      readonly note: string | undefined;
    }
  | {
      /** Nothing observed, and a stored close that travels with its session. */
      readonly kind: "stored";
      readonly price: string;
      /** The session the close belongs to. Never omitted: see the type. */
      readonly note: string;
    }
  | {
      /** Nothing observed and nothing stored. CI's state for all 518. */
      readonly kind: "unknown";
    };

export interface ProxyCell {
  readonly symbol: string;
  readonly reading: ProxyReading;
  /**
   * The value the arrival mark is keyed on, or `undefined` for no mark.
   *
   * `arrivalKey`'s, unchanged — the strip is the **third** surface to mark an
   * arrival and it does not get a third policy. A snapshot is not an arrival,
   * which is what stops four marks firing on first paint.
   */
  readonly arrival: string | undefined;
}

export interface MarketProxyStrip {
  /** One per security the frame reports, **in the order it reported them**. */
  readonly cells: readonly ProxyCell[];
  /**
   * The one line under the strip, or `undefined` when it has nothing to claim.
   *
   * `undefined` is reserved-and-hidden rather than removed: four copies of the
   * instant is a paragraph, and a line that disappears moves every region below
   * the strip.
   *
   * **Its instant is the newest observed one**, because that is the only claim
   * one line can make about four separate observations without over-claiming
   * for the others — and the ones it does not cover carry their own instant in
   * {@link ProxyReading} `note`. That is the universe table's shipped idiom: a
   * shared claim in the heading, an exception on the row that disagrees.
   *
   * **Its BASIS is not, and this file asserted otherwise for a few hours.**
   * `changeBasis` is per security: a gapped store gives two proxies previous
   * closes in different sessions, which is ordinary enough that
   * `pnpm bars:check` exists for it. Taking the newest figure's basis and
   * printing it unqualified under all four made one of them true and the rest
   * a claim nobody computed — and `note` could not rescue it, because `note`
   * carries an **instant** and only for a proxy that is *behind*, so a proxy
   * that is current and measured from a different session got no exception at
   * all. The clause is therefore dropped when the observed figures disagree;
   * see {@link sharedBasis}.
   */
  readonly qualifier: string | undefined;
  /**
   * Every figure is `unknown` — the store holds nothing for any of them.
   *
   * A true answer rather than a degraded one, and the only state a browser spec
   * on CI's runner can assert about: 518 securities, zero bars.
   */
  readonly nothingStored: boolean;
}

/**
 * Read the overview frame as four cells and one line.
 *
 * `observations` and `fromSnapshot` are the **socket's** map rather than the
 * frame's, and they are here only for the mark: the figure a reader sees is the
 * backend's join, and the disc says *a bar arrived for this security*. They are
 * two different claims from two different frames and they are deliberately not
 * derived from each other — a mark keyed on the aggregate would fire on every
 * recomputation, which the gateway does on connect, on subscribe and up to
 * sixteen times a minute.
 */
export function marketProxyStrip(
  overview: WireMarketOverview,
  observations: ReadonlyMap<string, Bar>,
  fromSnapshot: ReadonlySet<string>,
): MarketProxyStrip {
  // **A malformed instant is skipped rather than poisoning the line.**
  // `Date.parse` returns `NaN` for what it cannot read, `Math.max` with one
  // `NaN` is `NaN`, and `new Date(NaN)` formats without complaining — which is
  // how `Invalid Date` reaches a qualifier. `live-feed.ts` owns the same rule
  // one layer up for the same reason.
  const instants = new Map<string, number>();
  let newest: number | undefined;

  for (const figure of overview.figures) {
    if (figure.state !== "observed") continue;

    const instant = Date.parse(figure.at);
    if (Number.isNaN(instant)) continue;

    instants.set(figure.symbol, instant);
    if (newest === undefined || instant > newest) newest = instant;
  }

  return {
    cells: overview.figures.map((figure) => ({
      symbol: figure.symbol,
      reading: readingOf(figure, instants.get(figure.symbol), newest),
      arrival: arrivalKey(
        observations.get(figure.symbol),
        fromSnapshot.has(figure.symbol),
      ),
    })),
    qualifier: qualifierOf(overview.figures, instants, newest),
    nothingStored:
      overview.figures.length > 0 &&
      overview.figures.every((figure) => figure.state === "unknown"),
  };
}

function readingOf(
  figure: WireOverviewFigure,
  instant: number | undefined,
  newest: number | undefined,
): ProxyReading {
  if (figure.state === "unknown") return { kind: "unknown" };

  if (figure.state === "stored") {
    return {
      kind: "stored",
      price: formatPrice(figure.close),
      note: figure.session,
    };
  }

  return {
    kind: "observed",
    price: formatPrice(figure.price),
    change:
      figure.changePercent === undefined
        ? undefined
        : {
            // **The direction is taken from the ROUNDED percentage**, so a
            // +0.001% move cannot render an up arrow beside a figure reading
            // `0.00%`. `directionOf` owns that; the table met it first.
            change: formatChangePercent(figure.changePercent),
            direction: directionOf(figure.changePercent),
          },
    note:
      instant === undefined || newest === undefined || instant >= newest
        ? undefined
        : `from ${formatSessionTime(new Date(instant))}`,
  };
}

/**
 * The shared line, in the states this task can produce.
 *
 * **The absolute staleness rule is deliberately not here.** Task 4.2.6 owns
 * *what this line says when no session is open* — the drawn
 * `Friday 2026-09-25, 16:00 EDT · closing prices · …`, keyed on ADR 0028's
 * *last session whose bell has rung*. Until then a strip with nothing observed
 * makes **no** shared claim and every cell carries its own session, which is
 * the universe table's rule with the shared half not yet written: honest, and
 * smaller than the state it will become.
 */
function qualifierOf(
  figures: readonly WireOverviewFigure[],
  instants: ReadonlyMap<string, number>,
  newest: number | undefined,
): string | undefined {
  if (newest === undefined) return undefined;

  const at = new Date(newest);
  const extended = extendedHoursAt(at);
  const basis = sharedBasis(figures);

  return [
    // **The instant, always, and it is the first clause.** §10.3's rule: every
    // observation carries its own instant and no reader may render a price
    // without reading it. It is also what makes the strip alive when the disc
    // is not — when the feed stops the discs simply stop firing, an absence
    // nobody notices, while this stops advancing and stays on screen.
    formatBarInstant(at, "1m"),
    // Derived from the bar's own instant against Story 2.5's calendar, because
    // §7.7 measured that nothing on the frame distinguishes an extended-hours
    // bar. The words are `feed-words.ts`'s and a second spelling of either is
    // refused by `one-home-for-the-feed-words`.
    extended === undefined ? undefined : EXTENDED_HOURS_WORDS[extended],
    basis,
  ]
    .filter((clause) => clause !== undefined)
    .join(" · ");
}

/**
 * The basis clause, **only when every measured figure agrees about it**.
 *
 * A shared line may say *change from 2026-09-24's close* only if that is true
 * of all of them. Where it is not, the line says **nothing** about the basis
 * rather than one proxy's answer — ADR 0029's rule that a clause renders only
 * when its own data is present, applied to a clause whose data is four values
 * rather than one.
 *
 * **Only figures that carry a `changePercent` are consulted**, because only
 * they assert a basis. A proxy with a price and no measurable change has an
 * opinion about nothing and must not be able to suppress a clause that is true
 * of the ones that do.
 *
 * `undefined` as a basis is itself a value here and not a gap: it is
 * `LiveChange.basis`'s same-session case, *the previous close* — a number with
 * no date beside it. So a strip where one proxy measures from a named session
 * and another from an unnamed previous close is a **disagreement**, which is
 * the case a `?? "…"` default would have silently spelled as agreement.
 */
function sharedBasis(
  figures: readonly WireOverviewFigure[],
): string | undefined {
  const measured = figures.filter(
    (figure) =>
      figure.state === "observed" && figure.changePercent !== undefined,
  );
  if (measured.length === 0) return undefined;

  const [first] = measured;
  if (first?.state !== "observed") return undefined;

  const agreed = first.changeBasis;
  for (const figure of measured) {
    if (figure.state !== "observed") return undefined;
    if (figure.changeBasis !== agreed) return undefined;
  }

  return agreed === undefined
    ? "change from the previous close"
    : `change from ${agreed}'s close`;
}
