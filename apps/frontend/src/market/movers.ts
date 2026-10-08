import { MOVERS_PER_SIDE } from "@marketpulse/shared";
import type {
  Bar,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";

import { arrivalKey } from "./arrival.js";
import { formatPrice } from "./price-format.js";
import { basisOf, moveOf, type SectorRow } from "./sector-performance.js";

// **What the two movers lists read as** — the view the region draws, and the
// padding that keeps it one height (Task 4.5.3).
//
// ## ~~There is no reader here yet~~ — {@link marketMovers} arrived 2026-10-08
// (Task 4.5.5), and the paragraph below is left standing because it is why the
// shape came first
//
// `sector-performance.ts` one file over reads the overview frame's own section
// into rows. **Movers has no section on the wire until Task 4.5.4**, which
// owns the producer, the wire union and the reader that collapses it into
// {@link MarketMovers}. So what is here is the **shape** — the type the
// drawing takes, the padding, and the reservation — and nothing that reads a
// frame. A reader written before the frame exists is a guess about a payload
// nobody has sent.
//
// ## Nothing here ranks, and the rank is a COUNT
//
// `sector-performance.ts`' rule, and it holds harder here: the producer's
// `selectMovers` is the one order, it drops a figure with no ranking key rather
// than placing it, and the two arrays arrive strongest-first. So the rank below
// is the position in the array it was sent in, and **a comparison of two moves
// anywhere in this file would be a second comparator** — the thing
// `one-comparator-for-the-order-of-a-move` refuses by name.
//
// A keyless figure would therefore get **no rank**, and `RankedList` drops an
// unranked row outright when the quiet group is `impossible`. That is the
// honest end of a producer defect rather than a state to draw: the alternative
// is an ordinal announced over a row this product is refusing to rank.
//
// ## The company name is not on the frame, and that is this module's one
// dependency on something other than the aggregate
//
// A mover row's label is the company's name, which lives in `securities` and
// reaches a browser through `GET /securities` — the overview frame carries a
// symbol and no name. So the name is passed **in**, as a lookup the route
// already holds, and a symbol the lookup does not know is **labelled with
// itself**: `labelOf`'s rule one file over, for the same reason. The name is
// context and the ticker is the identifier, so a universe that has not
// arrived — or failed — costs the region its names and nothing else.
//
// **Why not on the wire** (Task 4.5.5's decision): a name is a fact about a
// security that never changes, and the aggregate is rebuilt up to sixteen times
// a minute — so putting ten names on it would re-send immutable data at the
// cadence of the most volatile thing on the page, and it would have to go on
// `WireOverviewFigure`, which the proxy and sector sections share and neither
// needs. **Reversal trigger**: the first surface on this screen that needs a
// *second* field from the universe (a sector, a kind, an exchange). At that
// point the universe is the page's dependency rather than one region's context,
// and the fetch, the frame and a narrower endpoint are owed a comparison.
//
// ## The row type is `SectorRow`, and the name is residue
//
// `RankedList` was drawn once for two uses and its row is `SectorRow`: a
// symbol, a label, a rank, a move, an absence, an arrival key and a basis. A
// mover row is exactly those seven — the ticker, the company name, the rank
// within its own end, today's move, no absence (a name with no observation
// cannot appear at all), the arrival mark's key and the basis the rank was
// measured against. So this module reuses the type rather than declaring a
// second one with the same members, for the reason `sector-ranking.ts` records
// about its own file name: **the name is the residue of which use arrived
// first, and a second shape would be a second thing to keep in step.**
//
// `packages/shared`'s `moveRankingKey` and `compareByMove` were renamed for
// exactly this reason on 2026-10-08 and the module was not; this is the same
// judgement one layer up.

/** Room and nothing else — see {@link withHeldRows}. */
const NBSP = " ";

/**
 * **Two peers: each end of the ranking, each ranked from 1, neither
 * subordinate.**
 *
 * The sector region's trailing group is a **demotion** — no ordinal, regular
 * weight, secondary ink, below a rule, words where a figure would be. These two
 * are not that: a list of the day's biggest falls is a complete answer to its
 * own question, and on a market surface a −9% name is the most interesting thing
 * on the screen. So the shape is two arrays rather than one array and a
 * partition, and the drawing gives both the same treatment.
 *
 * Each array is **at most {@link MOVERS_PER_SIDE} long and may be shorter** —
 * a one-sided day is an ordinary state rather than an edge case, and the
 * shortness is a fact about the market rather than about the request. What it
 * may never be is padded by the producer: the padding below is geometry and is
 * the drawing's business, because a held row in a payload is a row a reader of
 * the wire would have to know to ignore.
 */
export interface MarketMovers {
  /** The biggest risers, biggest first. */
  readonly gainers: readonly SectorRow[];
  /** The biggest falls, biggest fall first. */
  readonly losers: readonly SectorRow[];
}

/**
 * Read the overview frame's movers section as two lists of rows.
 *
 * `undefined` is **the absence of the section**, which the route draws as the
 * region's reserved state or as its own sentence depending on whether a frame
 * arrived at all — `sectorPerformance`'s discriminator, unchanged, because the
 * two reachable absences are the same two: no frame yet (first paint), and a
 * frame from a **previous image** that sends no movers section at all, which a
 * rollback pins.
 *
 * **An empty section is NOT the absence here, and that is the difference from
 * its two siblings.** `sectorPerformance` treats `sectors: []` as the absence
 * because eleven benchmarks are a roster and a frame about none of them is a
 * frame it cannot draw. A movers list's membership is an **answer**: two empty
 * lists mean *nothing was rankable*, which is CI's permanent state (518
 * securities, zero bars), most of a weekend, and the first minute of every
 * session — so it is drawn, as ten held rows under two headings, and the
 * region says so in words rather than reserving itself invisibly.
 *
 * @param names Symbol → company name, from the tracked universe. A symbol it
 * does not know is labelled with itself; an empty map labels every row with
 * its ticker, which is the state while the universe is in flight.
 */
export function marketMovers(
  overview: WireMarketOverview | undefined,
  observations: ReadonlyMap<string, Bar>,
  fromSnapshot: ReadonlySet<string>,
  names: ReadonlyMap<string, string>,
): MarketMovers | undefined {
  const movers = overview?.movers;
  if (movers === undefined) return undefined;

  const rowsOf = (figures: readonly WireOverviewFigure[]): SectorRow[] => {
    let ranked = 0;

    return figures.map((figure) => {
      const move = moveOf(figure);
      if (move !== undefined) ranked += 1;
      const price = priceOf(figure);

      return {
        symbol: figure.symbol,
        label: names.get(figure.symbol) ?? figure.symbol,
        rank: move === undefined ? undefined : ranked,
        move,
        // Two branches rather than one spread of a possibly-`undefined` value:
        // `exactOptionalPropertyTypes` is on and **absent** is what the field
        // means on a row that cannot have one — `market-overview.ts`' idiom at
        // the other end of the same wire.
        ...(price === undefined ? {} : { price }),
        // **A mover row has no absence words, and the field is not a
        // placeholder for some the next task writes.** AC 5 is that a name with
        // no current observation cannot appear in either list, so a row that
        // reached a list has a figure by construction; a row that somehow has
        // none is dropped by the list rather than captioned.
        absent: undefined,
        basis: move === undefined ? undefined : basisOf(figure),
        arrival: arrivalKey(
          observations.get(figure.symbol),
          fromSnapshot.has(figure.symbol),
        ),
      };
    });
  };

  return { gainers: rowsOf(movers.gainers), losers: rowsOf(movers.losers) };
}

/**
 * The price, **read off the member the figure's own state names** — see
 * {@link SectorRow.price}, which carries the labelling decision.
 *
 * `unknown` has neither a price nor a close and cannot be ranked, so it cannot
 * reach a list; it is spelled here rather than defaulted, because `?? 0` on a
 * price column is a plausible figure for a security we know nothing about.
 */
function priceOf(figure: WireOverviewFigure): string | undefined {
  if (figure.state === "observed") return formatPrice(figure.price);
  return figure.state === "stored" ? formatPrice(figure.close) : undefined;
}

/**
 * **Every symbol the two lists name, for the page's subscription** (Task
 * 4.5.5).
 *
 * `MarketOverview.tsx` builds its subscription key from every section the frame
 * carries, because a region that draws an arrival mark from `observations` is
 * drawing from a map that effect fills — omit a section and the mark can never
 * fire on the deployed page, which is Task 4.3.6's shipped defect. This is the
 * movers section's contribution, taken from the **frame** rather than from the
 * drawn rows, so the held pads' non-breaking spaces can never reach a
 * subscription.
 *
 * It is here rather than inline at the route for one reason: the route already
 * spreads `figures` and `sectors`, which are arrays of figures, and this
 * section is two. A `[...movers.gainers, ...movers.losers]` written there is
 * the shape of the thing that gets half-updated when a third list arrives.
 */
export function moverSymbols(
  overview: WireMarketOverview | undefined,
): readonly string[] {
  const movers = overview?.movers;
  if (movers === undefined) return [];

  return [...movers.gainers, ...movers.losers].map((figure) => figure.symbol);
}

/**
 * The rows a list draws: the real ones, then as many **held** rows as it takes
 * to reach {@link MOVERS_PER_SIDE}.
 *
 * ## Why the region pads rather than reserving a height
 *
 * Each list holds only the rows whose direction matches it, so a one-sided day
 * draws one full list and one short one. At 1440 and 1024 that costs nothing —
 * the landing grid's row is `minmax(min-content, 1fr)` and resolves to 486
 * whatever the content is. **At 768 and 390 the rows are untied and the region
 * is its content**, so a list going 5 → 2 shrinks it by 81 px and steps
 * everything below it: the second list, the footer, the source note and two
 * reserved panels. That is three times the 25 px Task 4.3.7 spent a whole task
 * designing out.
 *
 * A `min-height` on the list would be the other way to buy it and it is the
 * wrong one: the height is the row pitch times five plus four separators, and
 * **the row pitch already exists exactly once**, in `.row`. A second copy is
 * wrong the first time the pitch changes and wrong *silently*, because nothing
 * below `pnpm e2e` computes a layout at all.
 *
 * ## The pads are real rows in the list, and that is a correctness requirement
 *
 * `useSettle` indexes into `element.children`, so the array handed to the FLIP
 * must be exactly the `<ol>`'s children: a row drawn in the list and missing
 * from that array makes every `to` position read off the wrong row, and rows
 * travel to places they were never in. `RankedList`'s own comment at the
 * `ranked`/`quiet` split records the trap. So the pads go through the ordinary
 * `rows` prop, carry a rank so the `quietGroup="impossible"` filter keeps them,
 * and are refused a journey by the FLIP itself rather than by being left out of
 * it.
 *
 * ## They name nothing, and the key is the one thing they have to be unique in
 *
 * `RESERVED_SECTORS` can hold the eleven real sector labels because **the set
 * is known from the universe**; a mover's membership is an *answer*, so naming
 * tickers here would put invented securities with no figures on the landing
 * page — and the reserved state leaked internal sector slugs into the
 * accessibility tree for ten days when it was last got wrong. So this is
 * breadth's precedent: a non-breaking space where a word goes, and nothing
 * else.
 *
 * The key is `row.symbol` in `RankedList` — *keyed by symbol, never by
 * position*, which is Task 4.3.6's requirement and is not weakened here — so a
 * pad's symbol is a **run** of non-breaking spaces, one per slot. Unique as a
 * key, invisible on screen, nothing a reader could mistake for a ticker, and
 * positional, which is what keeps a pad in the same slot when the real rows
 * either side of it change in number.
 *
 * The rank is the slot's own ordinal. It reaches neither the screen nor a
 * listener — the `<li>` is `visibility: hidden` and `aria-hidden` — and a
 * keyless row would be dropped outright by a list that has declared the quiet
 * group impossible.
 */
export function withHeldRows(rows: readonly SectorRow[]): readonly SectorRow[] {
  if (rows.length >= MOVERS_PER_SIDE) return rows;

  const held: SectorRow[] = [];
  for (let slot = rows.length; slot < MOVERS_PER_SIDE; slot += 1) {
    held.push({
      symbol: NBSP.repeat(slot + 1),
      label: NBSP,
      rank: slot + 1,
      move: undefined,
      absent: undefined,
      arrival: undefined,
      basis: undefined,
      held: true,
    });
  }

  return [...rows, ...held];
}

/**
 * **The paint before the first frame: both lists empty, so the region is ten
 * held rows and two headings.**
 *
 * It is the same value as *the frame arrived and nothing is rankable*, which is
 * CI's permanent state (518 securities, zero bars) and most of a weekend —
 * deliberately, because the two differ in what the **region** says about them
 * rather than in what the lists hold. `MoversReservation` wraps this in a
 * `visibility: hidden` box with the sentence as a sibling; the route draws it
 * plain when a frame has arrived and had nothing in it.
 *
 * There is no `RESERVED_MOVERS` row list to get wrong, which is the quiet
 * difference from `RESERVED_SECTORS` and `RESERVED_BREADTH`: both of those have
 * to hold a set, because both draw a known roster. A movers list's membership is
 * an answer, so its reservation is **the empty answer with its room held**, and
 * the room comes from the same padding every other state uses.
 */
export const RESERVED_MOVERS: MarketMovers = { gainers: [], losers: [] };
