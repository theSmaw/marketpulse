import { MOVERS_PER_SIDE } from "@marketpulse/shared";

import type { SectorRow } from "./sector-performance.js";

// **What the two movers lists read as** — the view the region draws, and the
// padding that keeps it one height (Task 4.5.3).
//
// ## There is no reader here yet, and that is the task boundary rather than an
// omission
//
// `sector-performance.ts` one file over reads the overview frame's own section
// into rows. **Movers has no section on the wire until Task 4.5.4**, which
// owns the producer, the wire union and the reader that collapses it into
// {@link MarketMovers}. So what is here is the **shape** — the type the
// drawing takes, the padding, and the reservation — and nothing that reads a
// frame. A reader written before the frame exists is a guess about a payload
// nobody has sent.
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
