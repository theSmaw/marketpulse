import { MOVERS_PER_SIDE, selectMovers } from "@marketpulse/shared";

import type { WireMarketMovers, WireOverviewFigure } from "@marketpulse/shared";
import type { EligibleMoves } from "./market-breadth.js";
import type { MarketOverviewEntry } from "./market-overview.js";

/**
 * **Who is actually moving — the top five each way, over the set breadth
 * counts** (Task 4.5.4).
 *
 * ## Three things this module deliberately does not contain
 *
 * **No window and no classifier.** The set arrives as {@link EligibleMoves},
 * from `market-breadth.ts`' one pass, so there is no second spelling of the
 * five minutes, no second reading of `bar.startsAt` and no second answer to
 * *is this security measurable*. A `topMovers` that re-wrote any of those
 * would make the ranked list and the count beside it two populations, and the
 * disagreement would be invisible: both well-formed, both plausible, fifteen
 * or fifty securities apart.
 *
 * **No comparator and no rounding.** `selectMovers` is `packages/shared`'s,
 * through `compareByMove`, through `displayedPercent` — the one order and the
 * one precision. `one-comparator-for-the-order-of-a-move` holds it, and its
 * break was written against **this file**, because the next author of a top-N
 * stands here.
 *
 * **No `Number.isFinite`.** The wire's guarantee about a non-finite number
 * lives in the serialiser (`encodeMovers`, ADR 0031), which drops the whole
 * section rather than a field. A second guard here would be one rule with two
 * homes and the second is the one that gets forgotten.
 *
 * ## And no padding, which is a boundary rather than an omission
 *
 * Five is a **height** (`MOVERS_PER_SIDE`, measured in Task 4.5.3), and the
 * producer slices to it while the drawing pads to it. A held row on the wire
 * is a row every reader of the frame would have to know to ignore; reserving
 * room for one is geometry, and geometry is `withHeldRows`' job.
 */

/**
 * The two ends of the eligible set, ranked, with the counts that qualify them.
 *
 * ## Why it takes an encoder rather than building the figures itself
 *
 * The rows are {@link WireOverviewFigure}s, and **the one place entitled to
 * turn an entry into one is `market-overview.ts`' `figureOf`** — it is the
 * function that decides what a browser may see (ADR 0031: on a socket a field
 * on the object and not on the type **leaks**), and it appends each observed
 * figure's tape to the frame's own `feeds` list. A second mapping here would
 * be a second answer to both questions, and the frame's provenance would stop
 * describing the figures it carries.
 *
 * So the caller passes its own mapping in, which is
 * `WireMarketOverviewInputs.sectorLadderStep`'s shape for a related reason:
 * this module holds a rule and the caller holds the thing that is stateful.
 *
 * ## `eligible` is the length of the array the lists were taken from
 *
 * Not a count of anything else, and not a read of `breadth.measured` — so *a
 * selection cannot exceed the set it is from* is true by construction here and
 * `readMovers` is checking the wire rather than checking this function. See
 * `WireMoverLists.eligible` for why the section carries its own denominator at
 * all: `encodeBreadth` can drop the whole breadth section, and a ranked list
 * with no denominator is the one thing Story 4.5 must not ship.
 */
export function topMovers(
  eligible: EligibleMoves,
  figureOf: (entry: MarketOverviewEntry) => WireOverviewFigure,
): WireMarketMovers {
  const figures = eligible.moves.map((move) => figureOf(move.entry));

  // **Bounded rather than sorted**, and the filter is not optional: a figure
  // with no ranking key is dropped by `selectMovers` rather than placed by a
  // `?? 0`, which is ADR 0029's false impression expressed as a rank position.
  const { gainers, losers } = selectMovers(figures, MOVERS_PER_SIDE);

  const lists = {
    gainers,
    losers,
    eligible: figures.length,
    tracked: eligible.tracked,
  };

  const qualifier = eligible.qualifier;

  // A branch rather than a spread of the union, `marketBreadth`'s idiom for
  // its reason: which fields a member carries is not a thing to leave to
  // inference on a wire whose field maps exist to stop exactly that.
  return qualifier.basis === "observed"
    ? { basis: "observed", ...lists, windowMinutes: qualifier.windowMinutes }
    : { basis: "session", ...lists, session: qualifier.session };
}
