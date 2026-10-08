import { MOVERS_PER_SIDE } from "@marketpulse/shared";
import type {
  Bar,
  WireMarketMovers,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";

import { arrivalKey } from "./arrival.js";
import { describeMeasuredSet } from "./measured-set.js";
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
  /**
   * **What the two lists were ranked over** — the region's footer, in two
   * renderings of one string. See {@link MoversClaim}.
   */
  readonly claim: MoversClaim;
  /**
   * **What an empty `GAINERS` says**, or `undefined` when the list has rows —
   * see {@link emptySideOf}, which decides when there is a sentence at all.
   */
  readonly gainersEmpty: string | undefined;
  /** What an empty `LOSERS` says. See {@link emptySideOf}. */
  readonly losersEmpty: string | undefined;
}

/**
 * **The footer clause, in two renderings of one string** — `BreadthClaim`'s
 * idiom one region across, and Task 4.5.6's.
 *
 * ## Why a pair when the two halves are identical in every state today
 *
 * Breadth's drawn half may omit what its geometry already draws: N is printed
 * 24 px above the clause as the ladder's right endpoint, so stating it again
 * inside 24 px reads as a mistake. **This region draws no ladder and prints no
 * denominator anywhere** — `bar: "none"`, because a selected tail has no range
 * — so there is nothing for the drawn half to defer to and the whole sentence
 * is what both audiences get.
 *
 * It is a pair anyway, built in one function from the same fields, because the
 * two cannot then **diverge** the day one of them has somewhere to defer to.
 * Reversal trigger, as a condition rather than a story number: **the first
 * printed figure in this region that states the denominator** — a ladder, a
 * count in the head slot, an `N of M` badge. At that point the drawn half
 * shortens and the spoken half may not, and `Movers` already renders both.
 *
 * `one fact has one home` (ADR 0029) is satisfied as it is everywhere else in
 * this product: a drawn sentence and its spoken twin are one string with two
 * renderings.
 */
export interface MoversClaim {
  /** What is on the screen, under the two lists. */
  readonly drawn: string;
  /**
   * What a listener is handed. Identical to {@link MoversClaim.drawn} today,
   * and the component renders **one element** when they are equal — splitting
   * an identical string across a hidden span and a spoken one would put it in
   * `textContent` twice.
   */
  readonly spoken: string;
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

  const gainers = rowsOf(movers.gainers);
  const losers = rowsOf(movers.losers);

  return {
    gainers,
    losers,
    claim: moversClaimOf(movers),
    gainersEmpty: emptySideOf(gainers, movers.eligible, "rose"),
    losersEmpty: emptySideOf(losers, movers.eligible, "declined"),
  };
}

/**
 * **What the two lists were ranked over, in the grammar of the basis the wire
 * sent** — the ranking's honesty, and the only sentence in the region that
 * carries a denominator.
 *
 * ## It reads the MOVERS section's own figures, never breadth's
 *
 * `eligible` and `tracked` are the same numbers as `breadth.measured` and
 * `breadth.tracked` **by construction** — one eligibility pass over one array,
 * consumed twice, which `breadth-is-counted-over-the-equities-alone` permits
 * exactly one of. So reading breadth's would be numerically identical and
 * still wrong: `encodeBreadth` drops the **whole** breadth section on one
 * non-finite count, and this region would then go silent about its denominator
 * in precisely the state `WireMoverLists.eligible` was added for. The
 * substitution looks right in every state anybody photographs.
 * `the-ranking-states-its-own-denominator` refuses it.
 *
 * ## The tail clause is what makes it the RANKING's sentence
 *
 * Breadth says what was counted. This says what was counted **and that the
 * lists are a selection from it**, which is the whole difference between a
 * denominator and a ranking's denominator: a top five over 446 of 503 looks
 * exactly as confident as one over all of them.
 *
 * At `eligible === 0` the tail is *there is nothing to rank* instead, which is
 * the honest and complete explanation of the one state a gated machine and a
 * weekend both reach — CI holds 518 securities and zero bars, so the region is
 * two headings, ten held rows and **this sentence**, for ever. A sentence that
 * only rendered when something was ranked would leave that box silent, which
 * is `docs/GAPS.md` entry 13 exactly.
 *
 * ## No feed word, no venue, no instant
 *
 * `live`, `stale` and `disconnected` have one home and it is the status bar
 * (`one-home-for-the-feed-words` covers this route and would deserve to fire).
 * `computedAt` is `OverviewSourceNote`'s, once for the screen.
 *
 * ## What it does NOT claim about the PRICE column
 *
 * Task 4.5.5 recorded that *out of hours every mover row is a stored close* and
 * that the basis is uniform over the section, and handed this clause the job of
 * saying so. **It was not uniform when 4.5.6 looked, and this sentence
 * therefore does not make that claim.** On the `session` basis `eligibleMoves`
 * reads a close off the `live` member too — deliberately, because the process
 * holds the session's observations for hours after the bell — and `figureOf`
 * mapped a `live` entry to an `observed` figure, whose `price` is the last
 * trade rather than the session's close. So a session-basis list was a
 * **mixture** of `observed` and `stored` rows, their per-row `basis` strings
 * differed, and *every price is that session's close* would have been false for
 * most of the evening.
 *
 * What the clause names instead is the **set and the question**: which
 * securities had a measurable move, and on what. That is true of every row in
 * either list on either basis, which is why **the sentence did not change on
 * 2026-10-08 when the mixture did**, and that is the point of having written it
 * that way: a clause about the set survives a repair to the rows.
 *
 * **The mixture ended the same day** (Task 4.5.8). It was the visible half of a
 * producer defect — the rows were ranked on the pass's close-to-close move and
 * drew the live change against that close, two quantities in one list — and the
 * repair makes a session-basis row the figure of the close the pass read. So
 * the section is uniform again on that basis, by construction rather than by
 * luck: every row `stored`, one `basis` string, every price that session's
 * close. The trigger 4.5.5 recorded — *the first frame whose movers rows do not
 * share one basis* — fired and is closed **for this region**; it stays open for
 * `Sector performance`, whose rows are a roster rather than a selection and can
 * still arrive mixed. `SectorRow.price` carries the owner.
 */
function moversClaimOf(movers: WireMarketMovers): MoversClaim {
  const lead = describeMeasuredSet({
    qualifier: movers,
    tracked: movers.tracked,
    count: movers.eligible,
  });

  // **Two sentences, and the full stop is a decision rather than a style.** A
  // `—` was drawn first and an em dash is this region's **absence glyph**: an
  // unranked row draws one, and `Movers.test.tsx` asserts there is no em dash
  // anywhere in the region precisely so that a refused rank cannot be confused
  // with anything else. A clause joined by one would have been the second
  // drawer of that glyph, twelve pixels below a list that reserves it, and the
  // repair would have been to weaken somebody else's assertion.
  const sentence = `${lead}. ${movers.eligible === 0 ? NOTHING_TO_RANK : RANKED_OVER}.`;

  return { drawn: sentence, spoken: sentence };
}

/** The second sentence when there was something to rank. */
const RANKED_OVER = "Both lists are ranked over those";

/**
 * The tail clause when there was not.
 *
 * It claims the **ranking**, not the market: *there is nothing to rank* is a
 * fact about what reached this process, where *nothing moved* would be a
 * statement about 503 companies we heard nothing from. The one shipped sentence
 * in this product that ever made that mistake is `describeSilence`, and it took
 * a task to make it honest.
 */
const NOTHING_TO_RANK = "There is nothing to rank";

/**
 * **What one side says when it is empty and the other is not** — the one-sided
 * market, which is the state nothing in this product had ever drawn.
 *
 * Each list holds only the rows whose direction matches it, so on a strong
 * trend day one list is full and the other is short or empty. That is honest,
 * where the alternative draws five gains under a heading saying `LOSERS`. What
 * it is not is self-explanatory: *a region whose content is legitimately
 * conditional looks identical to one whose content silently disappeared*
 * (`docs/GAPS.md` entry 13).
 *
 * ## It claims the set we measured, never the market
 *
 * `Nothing declined.` is a statement about 503 companies, most of which nobody
 * heard from. `None of the names we measured declined.` is a statement about
 * the set the footer two lines below defines, and it is the only form of this
 * sentence that is true. *We measured* is this product's own word for it —
 * `MeasuredMove`, `eligibleMoves`, `WireBreadthCounts.measured` — and it is
 * deliberately **not** `we heard from`, which was the candidate in the brief
 * and carries the exact falsehood the two grammars exist to avoid: out of hours
 * nothing is heard from, and the whole list would then be explained by a clause
 * that is false about every row in it.
 *
 * ## And it is suppressed when NOTHING was measured
 *
 * `BreadthClaim`'s rule at N = 0, for the same reason: with `eligible === 0`
 * the footer carries the whole truth — *of the 503 we track, none were heard
 * from in the last 5 minutes — there is nothing to rank* — and two more
 * sentences saying the same thing per list would be the same fact three times
 * in one 466 px box. What the sentence is **for** is the state where the set is
 * real and one end of it is empty, which is the state a reader cannot tell from
 * a region that broke.
 *
 * ## It agrees with breadth by construction
 *
 * An empty `GAINERS` beside breadth's `Advancing 0` is the two regions
 * agreeing; five rows under `GAINERS` beside `Advancing 0` is the contradiction
 * to design against, and it cannot arise — the lists are a selection from the
 * same array breadth's buckets are a tally of, so a row in `GAINERS` **is** a
 * security in `Advancing`.
 *
 * @param verb The direction in the past tense, which is the only thing that
 * differs between the two sides. `directionOf` is not consulted: there is no
 * figure here to classify, only the heading this sentence sits under.
 */
function emptySideOf(
  rows: readonly SectorRow[],
  eligible: number,
  verb: "rose" | "declined",
): string | undefined {
  if (rows.length > 0 || eligible === 0) return undefined;
  return `None of the names we measured ${verb}.`;
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
export const RESERVED_MOVERS: MarketMovers = {
  gainers: [],
  losers: [],
  // **Room and nothing else**, which is `RESERVED_BREADTH`'s decision and its
  // recorded reason: the whole subtree is `visibility: hidden` and
  // `aria-hidden`, so nothing here is seen or spoken — but **a hidden string is
  // still in `textContent`**, one `expect` away from being asserted. A word
  // reads as a claim, and every clause this region can draw is a claim about a
  // set nothing has been counted over. A non-breaking space is not.
  claim: { drawn: NBSP, spoken: NBSP },
  // Not `undefined` for the room's sake and not a sentence for honesty's: the
  // two-line footer reserve is what holds the height, and the per-list
  // sentences sit inside room the held rows already hold. See `emptySideOf` —
  // `eligible` is unknown here, so there is no state to describe.
  gainersEmpty: undefined,
  losersEmpty: undefined,
};
