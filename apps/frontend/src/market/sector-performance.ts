import {
  SECTORS,
  SECTOR_LABELS,
  sectorOfEtf,
  moveRankingKey,
  type Bar,
  type SectorLadderStep,
  type WireMarketOverview,
  type WireOverviewFigure,
} from "@marketpulse/shared";

import { arrivalKey } from "./arrival.js";
import {
  directionOf,
  formatChangePercent,
  type PriceDirection,
} from "./price-format.js";

// What the eleven sector rows read as, from the overview frame alone
// (Task 4.3.5).
//
// ## Nothing here ranks, rounds or scales
//
// Three facts arrive already decided and this module reads them rather than
// reproducing them, because each one has a checkable invariant hanging off it:
//
//   - **The order** is `rankSectorFigures`' in `packages/shared`, computed
//     server-side. The array is mapped in place, and **nothing here compares
//     two figures** — *two figures equal at displayed precision never swap* is a
//     property of that comparator and must stay one.
//
//     {@link rowsInPinnedOrder} added the file's only `sort` on 2026-09-27
//     (Task 4.3.6) and it does not weaken that: it sorts by a **position a
//     reader pinned**, reads no figure and can produce no order the comparator
//     did not already produce — it reproduces an order the comparator produced
//     one frame earlier. A comparison of `move.percent` anywhere in this file
//     would be the defect the sentence above is about.
//   - **Which field a move lives in** is `moveRankingKey`'s. An `observed`
//     figure's move is `changePercent` and a `stored` figure's is
//     `sessionChangePercent` — different bases, deliberately different names —
//     and a renderer reaching for the wrong one finds nothing. This file asks
//     the shared function and never names either field.
//   - **The rung** is `overview.sectorLadderStep`, ratcheted server-side with a
//     session lifetime. A `Math.max` here would be the frame-max normalisation
//     `The ranked list.dc.html` §03 rejected on two grounds.
//
// The one arithmetic this file does is the **rank**, and it is a count rather
// than a comparison: the first keyed figure is 1, and a keyless figure gets no
// number at all. `sector-ranking.ts`'s absent-key rule is what makes that
// sound — every keyless figure already sorts after every keyed one, so a
// running count cannot hand a number to a figure that has no key.
//
// ## Why a rank is absent rather than defaulted
//
// ADR 0029's false impression, expressed as a position. A sector we have heard
// nothing about and hold no close for has not moved 0%: a number would place it
// among the genuinely flat ones and claim exactly the thing that is missing. So
// the rank is `undefined` and the row says what it has instead of a figure.
//
// **The absence words are three rather than one, because three different
// things are missing.** Task 4.3.7 owns the honest states and may reword any of
// them; what this file fixes is that they are produced in one place and are
// told apart by what the store actually holds.
//
// ## It names no feed, no venue and no connection word
//
// `LIVE` / `STALE` / `DISCONNECTED` have one home and it is the status bar
// (Story 3.10), and `one-home-for-the-feed-words` covers this route. What a
// sector row may state is an instant, an age, a basis, a session and a tape;
// what it states today is a **session**, through {@link SectorRow.absent}, in
// the spelling `MarketProxyStrip` already uses for a stored close.

/**
 * **The region's footer, in two clauses — the benchmark claim and the bar's
 * scale.**
 *
 * ## What the claim says, and the sentence it replaces
 *
 * It states the **weighting**, not the membership, and the difference is a
 * falsification rather than a preference. This region was specified to draw
 * `Each row is the sector's benchmark ETF — S&P 500 constituents only`, and the
 * second clause stopped being true on **2026-09-08**, when the universe was
 * defined **as** the S&P 500: the equity that clause warns about — one with a
 * sector and a benchmark it is not in — **does not exist**. `UNIVERSE.md` §5 has
 * carried the dated amendment ever since, and the claim came within one task of
 * being drawn on the landing page as shipped copy.
 *
 * **A membership claim is not written here even in corrected form.** It would be
 * true and it would be noise: the universe being the index is why the mapping is
 * total by construction, which is a fact about our curation rather than about
 * the figure on the row.
 *
 * What survives, and it is the more interesting claim — **the story's own
 * subtitle**: a sector SPDR is capitalisation-weighted, so **its move is not the
 * average of its members' moves**. Two securities in one sector contribute
 * unequally to the benchmark they are compared against, and a reader who takes
 * the figure as *what the average stock in this sector did* is wrong for that
 * reason and for no other.
 *
 * **It must not imply the eleven sum to the market.** They partition the S&P 500
 * exactly, which is a narrower thing than *the market*, and `Market proxies` two
 * hundred pixels above is what speaks for the broad indices. So the sentence
 * says nothing about coverage at all.
 *
 * ## What it must not restate
 *
 * The change basis, the instant, the feed and the adjustment, all of which the
 * screen's one source note or the chrome already own — and no connection word,
 * which has one home and is guarded by name. One clause, so the region cannot
 * grow a second sentence.
 *
 * ## Why the scale clause is separate
 *
 * ADR 0029: the scale clause renders only when the bar does, and **whether the
 * bar is drawn is a decision the stylesheet takes** (there is none below 37rem,
 * where 25 px each side of zero is a tick). So it is its own string for the
 * stylesheet to hide, rather than a width the arithmetic here has to know about.
 */
export const SECTOR_CLAIM =
  "Each row is the sector’s benchmark ETF — capitalisation-weighted, not the average of its members";

/** The figure on a row, or the words that stand where one would be. */
export interface SectorRow {
  /**
   * The benchmark ETF's symbol — printed on the row, and the React key.
   *
   * **Keyed by symbol rather than by position**, which is Task 4.3.6's
   * requirement rather than a convention: a row that keeps its identity across
   * a re-order is what lets the travel be measured, and a row keyed by index is
   * a row that is recycled into somebody else's place.
   *
   * It is printed because the owner's whole argument for the ETF row is that it
   * is checkable by eye against a public quote, and it is the only thing on the
   * row that can contradict a **permutation** — eleven correct figures against
   * eleven wrong labels satisfies every arithmetic guard and is invisible in
   * greyscale.
   */
  readonly symbol: string;
  /**
   * The full `SECTOR_LABELS` string, never abbreviated and never derived by
   * transform — `Health Care` and `Healthcare` are the same slug and different
   * words.
   *
   * A symbol the shared inverse does not know is **labelled with itself**
   * rather than with a guess. The producer sends the eleven, so this cannot
   * happen from our own gateway; inventing a name for an unrecognised fund
   * would be the one thing a fixed 144 px label column cannot survive being
   * wrong about.
   */
  readonly label: string;
  /** `1`-based among the figures that have a move, or `undefined`. */
  readonly rank: number | undefined;
  /**
   * The move, the way it will be read — **one object, so the bar's length and
   * the printed figure cannot disagree**.
   *
   * `The ranked list.dc.html` §05's inherited gap is two speakers in one box
   * contradicting each other, and a `percent` held beside a formatted string is
   * exactly that shape. The direction is `directionOf`'s, which decides on the
   * **rounded** figure, so a +0.001% move cannot draw an up arrow beside
   * `0.00%` — nor a bar beside it, since the same value decides both.
   */
  readonly move: SectorMove | undefined;
  /**
   * What the figure column says when {@link SectorRow.move} is absent — words
   * rather than digits, which is what tells it apart from a figure.
   */
  readonly absent: string | undefined;
  /** `arrivalKey`'s, unchanged. A snapshot is not an arrival. */
  readonly arrival: string | undefined;
  /**
   * **What this row's rank was measured against** — the identity of the basis,
   * not a number and never drawn.
   *
   * It exists for one rule, and the rule is `arrivalKey`'s with one word
   * changed: **a row moves only if it had a previous rank under the same
   * basis.** So the first order a browser draws is drawn flat, and the opening
   * bell — where all eleven figures stop being *that session's close-to-close
   * move* and start being *today against yesterday's close* — is a **new list**
   * rather than eleven simultaneous re-orders, which is the one moment the whole
   * list legitimately does change position at once.
   *
   * **Per row rather than per list**, which is the more precise rule and the
   * cheaper one: a single sector crossing from `stored` to `observed` mid-morning
   * arrives at its new place without travelling, while the rows it displaced
   * travel, because their own ranks are comparable either side of that frame. A
   * digest over all eleven would have frozen the whole gesture on that frame.
   *
   * The value pairs the member with the session it measured from, because those
   * are the two things that can change: `moveRankingKey` reads
   * `changePercent` on an `observed` figure and `sessionChangePercent` on a
   * `stored` one, and those are different claims in the same units (see
   * `WireStoredFigure.sessionChangePercent`). A row with no move has no basis
   * and no rank.
   */
  readonly basis: string | undefined;
  /**
   * **The price, already formatted, or absent — and the absence is a fact
   * about the row rather than about the layout** (Task 4.5.5).
   *
   * ## Why it is on this type rather than on a movers-only row
   *
   * `RankedList` is drawn once for two uses and the sector row simply has no
   * price cell: its geometry is four tracks and its subject is a benchmark's
   * move, not a share price. So this is optional for {@link SectorRow.held}'s
   * reason — *the eleven sector rows, which can never carry one, say nothing
   * about it* — and the mover layout is the only anatomy that renders it. A
   * second row interface with six shared members would be the thing
   * `movers.ts`' header already refuses on its own behalf.
   *
   * ## Which field it is read from is the FIGURE'S state, never the section's
   *
   * `price` on an observed figure and `close` on a stored one, through
   * `moveOf`'s own discipline one function along: the state decides which
   * field carries the number, and a renderer that reached for `price` on a
   * stored figure would find nothing. Out of hours **every** mover row is a
   * stored close, which is most of the week.
   *
   * ## And it carries no session, no instant and no noun
   *
   * That is the decision Task 4.5.5 took, and it is a **labelling** decision
   * rather than a plumbing one. Three reasons, in order of weight:
   *
   *   - **The basis is uniform over the whole section by construction.** The
   *     producer takes one `MoveQualifier` for both lists
   *     (`WireMarketMovers`), so *what these ten figures are measured from* is
   *     one claim about the region and not ten claims about rows — and a claim
   *     about the region has one home, which is the region's footer (Task
   *     4.5.6's denominator sentence, whose room is reserved and empty today).
   *   - **The row has nowhere to put it.** The track is 80 px; `2026-10-07
   *     close` measures 82, which is the measurement `.quiet .figure` was
   *     widened for after an honest sentence ellipsised into `2026-09-25 cl…`.
   *   - **The change beside it already works this way**, and so does the
   *     region two hundred pixels above: `Sector performance` has drawn eleven
   *     session-basis moves with no per-row session since Story 4.3, and the
   *     proxy strip states the closing session once beneath four cells rather
   *     than in each of them.
   *
   * **Reversal trigger**, as a condition: the first frame whose movers rows do
   * **not** share one basis — a mixed section, or a per-row basis on the wire.
   * At that point *what this figure is measured from* stops being statable once
   * per region and the clause has to move onto the row, where the 80 px track
   * cannot hold it and the geometry is owed a re-take.
   */
  readonly price?: string;
  /**
   * **A row that holds its own room and nothing else** — present in the list,
   * absent from the screen and from the accessibility tree (Task 4.5.3).
   *
   * It exists for `Movers`, where each list holds only the rows whose direction
   * matches it: a one-sided day draws one full list and one short one, and at
   * 768 and 390 the grid row is content-sized, so 5 → 2 would shrink the region
   * by 81 px and step the whole lower page. Padding each list to
   * `MOVERS_PER_SIDE` with held rows means **the pitch comes from `.row`
   * itself** and no arithmetic gets a second home — which a `min-height` on the
   * list would have been.
   *
   * **It is a real `<li>` in the `<ol>`, deliberately**, and that is a
   * correctness requirement rather than a convenience: `useSettle` indexes into
   * `element.children`, so a row drawn in the list and missing from the array
   * handed to the FLIP makes every `to` position read off the wrong row.
   *
   * Optional rather than `boolean | undefined` so that the eleven sector rows,
   * which can never be held, say nothing about it.
   */
  readonly held?: boolean;
}

/** A move, formatted, with the direction and the raw percentage together. */
export interface SectorMove {
  /** The signed percentage as the screen shows it — `+1.84%`, `−0.44%`. */
  readonly change: string;
  readonly direction: PriceDirection;
  /**
   * The same number, unformatted, for the bar's length.
   *
   * It is the **bar's** input and never the figure's: the figure is
   * {@link SectorMove.change}, already rounded through
   * `PERCENT_DISPLAY_DECIMALS`. Both come from this one value, which is the
   * whole reason they travel together.
   */
  readonly percent: number;
}

/** Eleven rows and the rung they are drawn against. */
export interface SectorPerformance {
  readonly rows: readonly SectorRow[];
  readonly step: SectorLadderStep;
}

/** Nothing observed and nothing stored — `MarketProxyStrip`'s own words. */
const NONE_STORED = "None stored";

/**
 * A live price with nothing to measure it from.
 *
 * Distinct from {@link NONE_STORED} because something **is** stored — we have
 * just heard from this fund — and the thing that is missing is the basis. The
 * proxy strip's answer to the same state is to draw the price and no change,
 * which this region cannot do: its one column is a move.
 */
const NO_BASIS = "No stored close";

/**
 * Read the overview frame's sector section as rows.
 *
 * `undefined` is **the absence of the section**, which a renderer draws as the
 * region's reserved state rather than as eleven unknowns. Three ways to reach
 * it and they are one state on screen:
 *
 *   - no frame has arrived at all (first paint);
 *   - the frame carries no `sectors` — *this gateway does not send sectors*,
 *     which is a **rollback pinning a previous image** rather than a fault, so
 *     the read side keeps both fields optional on purpose;
 *   - the frame carries sectors and no readable rung. The wire only ever sends
 *     the two together, so this is a frame we cannot draw a bar for — and
 *     choosing a rung here would be inventing the scale the server holds
 *     precisely so that every reader shares one.
 *
 * An empty array is the absence too. `MarketProxyStrip` learned that one the
 * expensive way: *a frame arrived and is about nothing* fell through to the
 * ordinary path and rendered a grid of height 0 that said nothing at all.
 */
export function sectorPerformance(
  overview: WireMarketOverview | undefined,
  observations: ReadonlyMap<string, Bar>,
  fromSnapshot: ReadonlySet<string>,
): SectorPerformance | undefined {
  const figures = overview?.sectors;
  const step = overview?.sectorLadderStep;
  if (figures === undefined || figures.length === 0 || step === undefined) {
    return undefined;
  }

  let ranked = 0;

  return {
    step,
    rows: figures.map((figure) => {
      const move = moveOf(figure);
      if (move !== undefined) ranked += 1;

      return {
        symbol: figure.symbol,
        label: labelOf(figure.symbol),
        rank: move === undefined ? undefined : ranked,
        move,
        absent: move === undefined ? absenceOf(figure) : undefined,
        basis: move === undefined ? undefined : basisOf(figure),
        arrival: arrivalKey(
          observations.get(figure.symbol),
          fromSnapshot.has(figure.symbol),
        ),
      };
    }),
  };
}

/**
 * **Eleven rows of held room, for the paint before the first frame** (Task
 * 4.3.7, `The ranked list.dc.html` §05 state 6).
 *
 * ## Why a reservation exists at all, measured rather than assumed
 *
 * The region draws its reserved panel until an `overview` frame lands, which on
 * a warm page is a few hundred milliseconds. At 1440 and 1024 that costs
 * nothing, because the region's height is the grid's `1fr` share and a reserved
 * panel and a filled one are both 461 px. At **768 and 390 the row is
 * content-sized**: measured 2026-09-27, a reserved region is **103 px** at 768
 * and **121 px** at 390 against **461** and **437** filled — so the landing page
 * stepped **~316 px** on a phone a moment after it painted, taking the two
 * regions below it and the source note with it. `MarketProxyStrip`'s
 * `NoFigures` is the same repair for the same reason one region above, and the
 * 70 px version of it there was invisible at three of the four widths too.
 *
 * ## It names eleven SECTORS and not one ticker
 *
 * The set is known from the universe and does not depend on any observation,
 * which is this region's sharpest difference from a movers list — so unlike the
 * proxy strip's reservation this one can hold the real labels. What it must not
 * hold is a **benchmark**: naming two of the eleven funds here would be a second
 * pairing of a sector with its ETF, and `pnpm invariants` refuses one by name.
 * `symbol` therefore carries the sector's own slug, which is the React key and
 * is never read: the whole subtree is `visibility: hidden` and `aria-hidden`.
 *
 * `step` is the narrowest rung, and nothing is drawn against it — no row has a
 * move, so no bar, no axis and no printed ladder, which is ADR 0029 in the state
 * where it matters most.
 */
export const RESERVED_SECTORS: SectorPerformance = {
  step: 1,
  rows: SECTORS.map((sector) => ({
    symbol: sector,
    label: SECTOR_LABELS[sector],
    rank: undefined,
    move: undefined,
    absent: undefined,
    arrival: undefined,
    basis: undefined,
  })),
};

/** The label, or the symbol standing in for one it does not have. */
function labelOf(symbol: string): string {
  const sector = sectorOfEtf(symbol);
  return sector === undefined ? symbol : SECTOR_LABELS[sector];
}

/**
 * The move, read through the **shared** key rather than off a field name.
 *
 * This is the one line in the frontend that would have reached for
 * `changePercent` on a stored figure and found nothing.
 *
 * **Exported for `movers.ts` on 2026-10-08 (Task 4.5.5), and exported from
 * this file rather than lifted out of it.** A mover row's move is the same
 * claim read off the same union through the same shared key, so a second
 * reader would be a second answer to *which field this state's move lives in*
 * — the one question `moveRankingKey` exists to answer once. It stays out of
 * `index.ts`: the module's barrel is its API, and nothing outside `src/market/`
 * reads a wire figure.
 */
export function moveOf(figure: WireOverviewFigure): SectorMove | undefined {
  const percent = moveRankingKey(figure);
  if (percent === undefined) return undefined;

  return {
    change: formatChangePercent(percent),
    direction: directionOf(percent) ?? "unchanged",
    percent,
  };
}

/**
 * The identity of the basis a row's rank was measured against — see
 * {@link SectorRow.basis}.
 *
 * Exported beside {@link moveOf} for Task 4.5.5's reason, and the pairing is
 * the point: a mover row's rank is held against the same basis identity as a
 * sector row's, so the hold at two lists (Task 4.5.7) inherits the rule rather
 * than re-deciding it.
 *
 * **It is derived from the same two members `moveOf` reads**, which is what
 * makes it unable to disagree with the figure: the state decides which field
 * carries the move, and the session decides what the move is measured from. A
 * third thing to keep in step would be a third thing to get wrong.
 */
export function basisOf(figure: WireOverviewFigure): string | undefined {
  if (figure.state === "observed") {
    // `changeBasis` is **omitted** on the same-session case, which is a real
    // value rather than a gap (`LiveChange.basis`) — so the empty string here
    // stands for *the previous close, unnamed* and is still a basis this row
    // shares with every other row measuring from it.
    return `observed:${figure.changeBasis ?? ""}`;
  }
  return figure.state === "stored" ? `stored:${figure.session}` : undefined;
}

/**
 * The rows in a **held** order: the one the list already had, with the figures
 * and the ranks that arrived since.
 *
 * ## The hold gates the movement, not the ranking
 *
 * `The order that changes.dc.html` §07's finding, and it is why this is four
 * lines rather than a second mode: every row keeps the `rank` the comparator
 * gave it and only its **position in this array** is pinned, so the printed
 * ordinals go on updating while the list stands still. The disagreement between
 * the ordinals and the order of the rows **is** the pending re-order — the same
 * disagreement every other reader sees for 240 ms and does not notice.
 *
 * ## Why it is here and not in `RankedList`
 *
 * Because `RankedList` never sorts, and that is a property worth keeping: the
 * order it is handed is the order it draws, so *two figures equal at displayed
 * precision never swap* stays a property of one comparator in
 * `packages/shared`. The hold is an order the **caller** chooses, and the
 * movement follows from it with no code in the list at all — the FLIP sees a
 * props order that did not change, so no row travels, and on release it sees
 * every pending move in one frame.
 *
 * A symbol the pin does not know keeps its ranked position relative to the rows
 * that follow it. That cannot happen from our own gateway, which sends the same
 * eleven every frame; what it must not do is drop a row.
 */
export function rowsInPinnedOrder(
  rows: readonly SectorRow[],
  pinned: readonly string[] | undefined,
): readonly SectorRow[] {
  if (pinned === undefined) return rows;

  const positions = new Map(pinned.map((symbol, index) => [symbol, index]));
  const held = rows.map((row, index) => ({
    row,
    // A row the pin never saw sorts by where the comparator put it, offset past
    // the pinned block so it lands after the rows whose position is known.
    at: positions.get(row.symbol) ?? pinned.length + index,
  }));

  held.sort((left, right) => left.at - right.at);
  return held.map(({ row }) => row);
}

/**
 * What is missing, in the store's own terms.
 *
 * A `stored` figure with no move names its **session**, in the spelling
 * `MarketProxyStrip` uses for the same fact (`2026-09-11 close`): we hold that
 * session's close and hold nothing before it to measure against. It is a
 * session rather than a verdict, which is the rule every surface in this
 * product follows about a figure that is behind.
 */
function absenceOf(figure: WireOverviewFigure): string {
  if (figure.state === "stored") return `${figure.session} close`;
  return figure.state === "observed" ? NO_BASIS : NONE_STORED;
}
