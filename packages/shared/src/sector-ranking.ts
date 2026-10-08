/**
 * **The order eleven sector benchmarks are reported in, and the one place a
 * figure's ranking key is read** (Task 4.3.4).
 *
 * ## Two halves, and only one of them is about sectors — amended 2026-10-08
 *
 * Task 4.5.2 renamed the generic two. `sectorRankingKey` and
 * `compareSectorFigures` are {@link moveRankingKey} and {@link compareByMove},
 * because both are generic over `WireOverviewFigure` and are about **a move**:
 * the key reader already had a consumer with no sector semantics at all
 * (`fitSectorLadder`, which asks for the widest move in a set), and a movers
 * selector calling `compareSectorFigures` would read as the wrong rule being
 * borrowed. {@link rankSectorFigures} keeps its name — it ranks a roster of
 * eleven, every row of which is drawn.
 *
 * The sector-shaped half is now `SECTOR_BY_ETF`, `sectorOfEtf` and
 * `rankSectorFigures`; the move-shaped half is `moveRankingKey`,
 * `compareByMove`, {@link selectMovers} and {@link selectMoversBy} — the last
 * of which is not about figures at all (Task 4.5.8). **The file name is the
 * residue**,
 * and splitting it was deliberately not done here: the reversal trigger is a
 * condition — *the first consumer of the move half that is in neither the
 * sector region nor the movers region.*
 *
 * ## Why it is here and not in the browser that draws the list
 *
 * Story 4.5 ranks a top-N over 518 securities **server-side**, because a
 * top-N computed in a browser means shipping the 518-figure input to every
 * tab — which is `STORY.md`'s own table (~56 KB a frame, ~875 KiB/min per
 * browser, decoded on all five routes). So the ranking rule cannot be a
 * browser module: adopting one at eleven would set exactly the precedent
 * Story 4.3 is told not to set, and the second implementation would be the
 * one over 518 rows.
 *
 * ADR 0038 decision 2 is the precedent for what happens when a shared
 * computation starts in one package: `changeFromClose` began in
 * `apps/frontend/src/components/UniverseTable/` and its third consumer was a
 * different **process**. This module starts on the far side of that move.
 *
 * ## What the rule actually is, in three sentences
 *
 * **Descending by the figure's own move.** **A figure with no move is not
 * ranked among the ranked** — it sorts after every figure that has one, and
 * never at a position `?? 0` would give it. And **two figures that read the
 * same on screen never swap**, which is decided on the displayed precision
 * rather than on a threshold somebody chose.
 *
 * ## The absent key, which is ADR 0029's false impression as a RANK POSITION
 *
 * This is the part worth being careful about, and it is a new shape of an old
 * defect. A sector we have heard nothing about and hold no close for has **no
 * ranking key at all**. `key ?? 0` places it among the genuinely flat ones —
 * mid-table, between a sector that moved +0.01% and one that moved −0.01% —
 * which is a **claim that it did not move**, expressed as a position rather
 * than as a number. ADR 0029's rule is that a claim about data requires data;
 * a rank is a claim.
 *
 * So the absence is handled by an explicit rule and **never by a default**:
 * every keyless figure sorts **after** every keyed one, and keyless figures
 * hold the order they arrived in — which is `SECTORS`' declared order at the
 * producer. A reader then sees the sectors we can say something about, ranked,
 * followed by the ones we cannot, and the renderer says so per row rather than
 * drawing them as flat.
 */

import { directionOf, displayedPercent } from "./price-direction.js";
import { SECTOR_ETFS, SECTORS } from "./security.js";

import type { Sector } from "./security.js";
import type { WireOverviewFigure } from "./market-stream-protocol.js";

/**
 * Ticker → sector, **derived from {@link SECTOR_ETFS} rather than written
 * out**.
 *
 * `SECTOR_ETFS` is `Record<Sector, Ticker>` and the frame carries a `symbol`,
 * so somebody needs the inverse. **A hand-written inverse is where a
 * permutation comes from**: one wrong key puts XLV's figure on the Financials
 * row, and *every number on the screen is still right*. That defect satisfies
 * every arithmetic guard in this repository, passes every state grid, and is
 * invisible in greyscale — the only thing on the row that can contradict it is
 * the printed ticker, which is why `STORY.md` put one there.
 *
 * Derived **once**, at module load, by mapping over `SECTORS`: a twelfth
 * sector arrives here with no edit, and it cannot be added to `SECTOR_ETFS`
 * without naming its fund because that record is total over the union.
 *
 * Keyed by `string` rather than by `Ticker` deliberately — the wire's `symbol`
 * is a bare string, and a brand cast at the call site is the sort of thing
 * that gets written once and copied.
 */
export const SECTOR_BY_ETF: ReadonlyMap<string, Sector> = new Map(
  SECTORS.map((sector) => [SECTOR_ETFS[sector] as string, sector] as const),
);

/** Which sector an ETF symbol is the benchmark for, or `undefined`. */
export function sectorOfEtf(symbol: string): Sector | undefined {
  return SECTOR_BY_ETF.get(symbol);
}

/**
 * A figure's move, **or `undefined` for a figure that has none** — the one
 * home for *which field this state's move lives in*.
 *
 * Two states carry a move and they are **different bases**, which is why they
 * are different field names on the wire: an `observed` figure's
 * `changePercent` is live-against-a-close (what a market screen means by
 * *today*), and a `stored` figure's `sessionChangePercent` is the
 * close-to-close move of a session that is over. Both are signed percentages
 * on the same scale, which is what makes ranking them against each other
 * honest; neither is *the other one*, which is what makes reading them through
 * one field name dishonest.
 *
 * **Non-finite is absent.** A `NaN` or an `Infinity` in a comparator is worse
 * than a missing key: `Array.prototype.sort` with a comparator returning `NaN`
 * has no defined result, so the whole order becomes implementation detail.
 * The serialiser drops a non-finite number at the wire (ADR 0031) and
 * `readFigure` refuses one at the other end, but this function is called
 * **in-process, before the encode**, so it is inside that gap and closes it
 * itself.
 */
export function moveRankingKey(figure: WireOverviewFigure): number | undefined {
  if (figure.state === "observed") {
    return figure.changePercent !== undefined &&
      Number.isFinite(figure.changePercent)
      ? figure.changePercent
      : undefined;
  }

  if (figure.state === "stored") {
    return figure.sessionChangePercent !== undefined &&
      Number.isFinite(figure.sessionChangePercent)
      ? figure.sessionChangePercent
      : undefined;
  }

  return undefined;
}

// **`displayedPercent` left this module on 2026-10-07** (Task 4.4.2), for
// `price-direction.ts` beside `directionOf` — which had the same rounding
// expression written out a second time, and breadth would have been the third.
// It is still exported from this package's barrel under the same name; what
// moved is where the rounding is decided. The comparator below calls it.

/** `a` sorts before `b` — the only two sign values {@link compareByMove} has. */
const STRONGER = -1;

/** `a` sorts after `b`. */
const WEAKER = 1;

/**
 * The comparator itself — strongest first, keyless last, display-equal never
 * swapped.
 *
 * Returning `0` for a display-equal pair is what makes the tie-break the
 * **order it was given**, and `Array.prototype.sort` has been stable by
 * specification since ES2019. That is a stable sort against *the order on
 * screen* rather than against a declared one: the producer hands this the
 * eleven in `SECTORS`' order, so the first list breaks its ties on the
 * declared order, and every subsequent frame breaks them the same way — which
 * is why the order is deterministic without anybody holding the previous one.
 *
 * ## It returns a SIGN rather than a difference, since 2026-10-08
 *
 * It returned `other - shown` until Task 4.5.2, which is the same order — a
 * comparator's contract is its sign and nothing reads the magnitude. The
 * difference is that a **bounded** selection has to ask *which of these two is
 * stronger* rather than hand the whole array to `sort`, and a magnitude forces
 * that caller to test the result against zero. A sign makes
 * {@link selectMovers} an exact `=== STRONGER`, so the top-N re-uses this
 * function instead of re-expressing its arithmetic one screen further down —
 * which is the whole defect this module exists to prevent.
 */
export function compareByMove(
  a: WireOverviewFigure,
  b: WireOverviewFigure,
): number {
  return compareKeys(moveRankingKey(a), moveRankingKey(b));
}

/**
 * **The comparator itself, over the two KEYS rather than the two figures** —
 * split out by Task 4.5.8, and it is one comparator with two entry points
 * rather than a second rule.
 *
 * {@link compareByMove} is the figure-shaped adapter: it reads each figure's
 * own key through {@link moveRankingKey} and hands them here. {@link
 * selectMoversBy} is the other entry point, for a caller that **already holds
 * the key** and must not have it re-derived from the figure — which is Task
 * 4.5.8's defect in one sentence: the backend's eligibility pass measured one
 * quantity, the figure it built carried another, and the ranking read the
 * figure's.
 *
 * It is not exported. A caller with two numbers and no figures has no
 * legitimate reason to ask this question — `one-comparator-for-the-order-of-a-
 * move`'s clause one would still hold if it were exported, and the point of
 * keeping it private is that the two shapes above are the only two there are.
 */
function compareKeys(
  left: number | undefined,
  right: number | undefined,
): number {
  // The absent-key rule, in three lines and with no default in sight. Two
  // keyless figures are equal to each other — they are not *equally flat*,
  // they are equally unrankable — so they keep the order they arrived in.
  if (left === undefined && right === undefined) return 0;
  if (left === undefined) return WEAKER;
  if (right === undefined) return STRONGER;

  const shownMove = displayedPercent(left);
  const otherMove = displayedPercent(right);
  if (shownMove === otherMove) return 0;

  // **The one comparison of two displayed moves in this repository**, and the
  // anchor `one-comparator-for-the-order-of-a-move` is keyed on: a second
  // ranking cannot be written without either subtracting or comparing two
  // moves somewhere, and this is the only place entitled to.
  return otherMove > shownMove ? WEAKER : STRONGER;
}

/**
 * The figures in rank order — a **new array**, because the producer's own
 * order is `SECTORS`' and is the tie-break.
 *
 * **Sector-specific on purpose, and the one name in this module that stayed
 * one** (Task 4.5.2): it sorts a whole roster of eleven, every row of which is
 * drawn. A top-N over 503 is {@link selectMovers} and is a different shape of
 * answer, not a different rule.
 */
export function rankSectorFigures(
  figures: readonly WireOverviewFigure[],
): readonly WireOverviewFigure[] {
  return [...figures].sort(compareByMove);
}

/**
 * **Is this list already in the order {@link compareByMove} puts it in?**
 * (Task 4.5.4) — the verification half of the rule, beside the rule.
 *
 * ## Why a reader needs it at all
 *
 * The movers are ranked **server-side**, so a browser receives an order it
 * did not compute and cannot otherwise check. `readMovers` is the only thing
 * standing between *a ranked frame* and *a furnished one* — and that
 * distinction is the failure Stories 4.3 and 4.4 both paid for: a frame whose
 * rows are all well-formed, whose counts all add up, and whose order is
 * whatever somebody's test fixture happened to type. Nothing else on the wire
 * can say an array is sorted.
 *
 * ## It is here rather than in the protocol module, which is the whole point
 *
 * An order and the check that it holds are **one fact**. A protocol module
 * that re-expressed *strongest first* with its own inequality would be the
 * second comparator `one-comparator-for-the-order-of-a-move` exists to
 * refuse, written by the one author with the best excuse for writing it.
 *
 * **Display-equal pairs pass in either order**, because {@link compareByMove}
 * answers `0` for them and ties keep the order they arrived in. So this asks
 * *is the order consistent with the displayed figures*, which is the only
 * question a reader of a rounded list is entitled to ask.
 *
 * `reversed` is the losers' end — weakest first — and it swaps the arguments
 * rather than negating the result, {@link selectMovers}' idiom for its reason:
 * negating is an arithmetic second opinion and a swap is the same call.
 */
export function isRankedByMove(
  figures: readonly WireOverviewFigure[],
  reversed = false,
): boolean {
  for (let at = 1; at < figures.length; at += 1) {
    const earlier = figures[at - 1];
    const later = figures[at];

    // `noUncheckedIndexedAccess`: a hole in the array is not an order this
    // function can vouch for.
    if (earlier === undefined || later === undefined) return false;

    const order = reversed
      ? compareByMove(later, earlier)
      : compareByMove(earlier, later);

    if (order === WEAKER) return false;
  }

  return true;
}

/**
 * **How many movers each end carries — five, and it is a HEIGHT rather than a
 * taste** (Task 4.5.3).
 *
 * It lives beside {@link selectMovers} because the bound the selection is made
 * to and the number of rows the region holds room for are **one fact**: the
 * producer slices to it and the drawing pads to it, and the two cannot be
 * allowed to be two numbers. There is no second home for it in either app.
 *
 * ## The arithmetic, which is the whole argument
 *
 * The region's content ceiling is **389 px** — 486 outer less 97 of chrome
 * (2 borders + 47 header + 16 `Panel.body` + 16 `Region.content` + 16
 * padding-bottom). Two headed lists at five rows is
 * `16 + 134 + 16 + 25 + 134 + 44 = 369`, which with the chrome is **466**
 * against **486**: twenty pixels of slack.
 *
 * **Six is 520 — over by 34** — and the overflow is not local: rows 2 and 3 of
 * the landing grid share one `fr`, so a sixth row each way raises
 * `Sector performance` and `Market breadth` with it. The figure is stated here
 * and the ledger is in `Movers.module.css`, which is the file a reader
 * proposing a sixth row will be looking at.
 */
export const MOVERS_PER_SIDE = 5;

/** Both ends of a ranked population, each strongest-first. */
export interface MoverSelection {
  /** Up to `limit` figures whose displayed move is **positive**, biggest first. */
  readonly gainers: readonly WireOverviewFigure[];
  /** Up to `limit` figures whose displayed move is **negative**, biggest fall first. */
  readonly losers: readonly WireOverviewFigure[];
}

/**
 * The two ends of a population, **bounded rather than sorted** (Task 4.5.2).
 *
 * ## Why not `rankSectorFigures(…).slice(0, limit)`
 *
 * Two reasons, and the second is a correctness one rather than a cost one.
 *
 * **The cost.** Measured on this machine against 503 synthetic observed
 * figures, 400 timed iterations after 300 warm-up — the figures are in
 * `TASK-02`. A full sort is the right tool for eleven rows whose whole roster
 * is drawn; for a top-N over 503 it is several times the work for an order
 * nobody sees, on a path that runs on every overview frame.
 *
 * **And `slice` would return names we have heard nothing about.** The
 * absent-key rule orders keyless figures *last* — it does not remove them —
 * so on a population where fewer than `limit` figures carry a move,
 * `ranked.slice(0, limit)` is `limit` arbitrary `unknown` symbols presented as
 * the day's biggest movers. That is **CI's store for ever** (518 securities,
 * zero bars), every process restart, and most of a weekend. `STORY.md`'s AC 5
 * is that a name with no current observation cannot appear in either list, so
 * the key is a **filter here** and not only a sort order. Ordering is not
 * enough.
 *
 * ## Disjoint by construction, through the one classifier
 *
 * A figure is a candidate for exactly one end, decided by `directionOf` on its
 * own ranking key: `positive` is a gainer, `negative` is a loser, and
 * `unchanged` and non-finite are **neither**. So the two lists cannot share a
 * symbol without `directionOf` returning two answers for one number — there is
 * no second classifier here to disagree with, which is
 * `one-classifier-for-the-direction-of-a-move`'s whole point.
 *
 * ## The losers end is the SAME comparator with its arguments swapped
 *
 * And that is safe only because of the filter above, which is worth saying
 * plainly: {@link compareByMove} is **not symmetric** about an absent key —
 * keyless figures sort last in both argument orders, so reversing it on an
 * unfiltered population would put the unrankable ones **first**, which is the
 * AC 5 defect arriving by the back door. Every figure reaching either
 * insertion has a key and a direction, so the reversal only ever sees the
 * keyed branch. No second comparator, no second rounding, no `?? 0`.
 */
export function selectMovers(
  figures: readonly WireOverviewFigure[],
  limit: number,
): MoverSelection {
  return selectMoversBy(figures, limit, moveRankingKey);
}

/** Both ends of a ranked population of anything, each strongest-first. */
export interface RankedEnds<T> {
  /** Up to `limit` members whose displayed key is **positive**, biggest first. */
  readonly gainers: readonly T[];
  /** Up to `limit` members whose displayed key is **negative**, biggest fall first. */
  readonly losers: readonly T[];
}

/**
 * **The same selection over a population that CARRIES its own key** (Task
 * 4.5.8) — the entry point for a caller that has already measured the move
 * and must not have it re-derived.
 *
 * ## The defect this exists to make unwritable
 *
 * {@link selectMovers} reads each member's key off the **figure**. The
 * backend's movers are selected from an eligibility pass that measured the
 * move itself — and on the shut-market basis the two were **different
 * quantities**: the pass measured a close-to-close move while the figure the
 * encoder built for the same security was a live price against that close, so
 * a row in `GAINERS` was ranked on one number and counted in `Advancing` on
 * another. Both numbers correct, one array, two populations.
 *
 * The repair is that the caller passes the key it measured. Which quantity a
 * ranking is over then stops being a property of **what the encoder happened
 * to produce** and becomes a property of the pass that decided eligibility —
 * which is the whole point of there being one pass.
 *
 * ## It is the same rule, not a second one
 *
 * Every ordering decision still goes through `compareKeys`, which is
 * {@link compareByMove}'s own body: the same displayed precision, the same
 * *display-equal never swaps*, the same keyless-last rule, the same
 * `directionOf` classifier deciding which end a member is a candidate for.
 * `selectMovers` is this function with `moveRankingKey` as the key, so there
 * is one bound, one comparator and one filter between them.
 *
 * **A member whose key is `undefined` is dropped rather than placed**, which
 * is `selectMovers`' recorded argument unchanged — ordering is not enough,
 * because the absent-key rule orders keyless members last and does not remove
 * them.
 */
export function selectMoversBy<T>(
  items: readonly T[],
  limit: number,
  keyOf: (item: T) => number | undefined,
): RankedEnds<T> {
  const gainers: Keyed<T>[] = [];
  const losers: Keyed<T>[] = [];

  for (const item of items) {
    const key = keyOf(item);
    if (key === undefined) continue;

    const direction = directionOf(key);
    if (direction === "positive") keepBounded(gainers, { item, key }, limit);
    if (direction === "negative")
      keepBounded(losers, { item, key }, limit, true);
  }

  return {
    gainers: gainers.map((kept) => kept.item),
    losers: losers.map((kept) => kept.item),
  };
}

/**
 * One member of a population beside the key it was ranked on.
 *
 * The key travels with the member rather than being re-read at every
 * comparison: `keyOf` is the caller's function and the insertion asks about
 * one candidate up to `limit` times, so re-deriving would be the caller's
 * arithmetic run O(N × limit) times for an answer that cannot change.
 */
interface Keyed<T> {
  readonly item: T;
  readonly key: number;
}

/**
 * Insert `candidate` where the comparator says it goes, among at most `limit`
 * already-ordered members, and drop whatever falls off the end.
 *
 * The scan walks **leftwards past every member the candidate is strictly
 * stronger than and stops at the first it is not**, which is what reproduces
 * `Array.prototype.sort`'s stability: a candidate display-equal to one we are
 * already holding never overtakes it, so arrival order survives a tie exactly
 * as it does in the full sort. A candidate that reaches `limit` without
 * overtaking anything is weaker than everything on a full list and is dropped
 * unread.
 *
 * `reversed` swaps the comparator's arguments rather than negating its result:
 * negating `0` is `0`, so the tie would survive either way, but a negation is
 * an arithmetic second opinion and a swap is the same call.
 */
function keepBounded<T>(
  kept: Keyed<T>[],
  candidate: Keyed<T>,
  limit: number,
  reversed = false,
): void {
  let at = kept.length;
  while (at >= 1) {
    const held = kept[at - 1];
    if (held === undefined) break;
    const order = reversed
      ? compareKeys(held.key, candidate.key)
      : compareKeys(candidate.key, held.key);
    if (order !== STRONGER) break;
    at -= 1;
  }

  if (at >= limit) return;

  kept.splice(at, 0, candidate);
  if (kept.length > limit) kept.pop();
}
