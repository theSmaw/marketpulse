import { changePercent, directionOf, marketDateAt } from "@marketpulse/shared";

import type {
  MarketDate,
  PriceDirection,
  WireMarketBreadth,
} from "@marketpulse/shared";
import { lastCloseOf } from "./market-overview.js";

import type { MarketOverviewEntry } from "./market-overview.js";

/**
 * **How many of the market's names are up, down and unchanged** — Story 4.4's
 * count, over the join's answer (Task 4.4.4).
 *
 * ## Pure, for `market-overview.ts`' reason rather than for testing
 *
 * Every input arrives as an argument — the entries, the instant and whether
 * the market is open. No clock, no socket, no repository handle, which is
 * invariant 4 made structural: a function that reads nothing cannot read
 * something timestamped after a replay clock. A sibling of the join rather
 * than a second section inside it, because the join is a **join** and this is
 * arithmetic on top of one.
 *
 * ## The clock, which is the part most likely to be got wrong
 *
 * The window is measured on each bar's **own instant** — `bar.startsAt` —
 * against the aggregate's `asOf`. **Never `CurrentObservation.ageMs`**, for
 * two separate reasons: that field is computed on read with its own wall clock,
 * so reading it would put a second clock inside this function and would be
 * wrong under a replay; and an age measured at an arrival instant is not the
 * age Task 4.1.6's curve measures. That curve reads **0 at one minute in all
 * 390 samples** precisely because a bar arrives ~0.5 s after the minute it
 * describes has **ended**, so a window keyed on anything but `startsAt` shifts
 * every figure in its table by a minute.
 *
 * ## The same window filters the numerator AND the denominator
 *
 * One pass, three accumulators, and `measured` is their **sum**. If the counts
 * folded over the whole map while `measured` was windowed, the stated
 * denominator and the counted numerator would disagree — invisibly, with every
 * number well-formed — and the surplus would land in `unchanged`, **collapsing
 * *unchanged* into *not heard from*, which is the one failure this story
 * exists to prevent.** There is no second measurement to disagree with the
 * first because there is no second measurement.
 *
 * **Amended 2026-10-08 (Task 4.5.4): the pass is now shared, and that is a
 * stronger version of the paragraph above rather than a dilution of it.**
 * {@link eligibleMoves} decides *who has a measurable move on which basis* and
 * is consumed twice — by the tally here and by `market-movers.ts`' top-N — so
 * the ranked list and the count are not two filters that agree, they are one
 * array. `movers.eligible` is its length and `breadth.measured` is its tally,
 * and the only legitimate difference between the two is a figure with no
 * **direction**, which is eligible and in no bucket.
 *
 * ## No `Number.isFinite` anywhere in this module, deliberately
 *
 * A count is an integer this module produced by adding ones; the wire's
 * guarantee about a non-finite number belongs in the **serialiser**
 * (`encodeBreadth`, ADR 0031), which drops the whole section rather than a
 * field. A second guard here would be one rule with two homes, and the second
 * is the one that gets forgotten. What this module **does** refuse is a figure
 * with no direction: {@link directionOf} answers `undefined` for a non-finite
 * percentage, and such a figure is in no bucket and outside `measured`.
 */

/**
 * How many minutes back *heard from* reaches.
 *
 * **Measured, not chosen** (Task 4.1.6, 390 sampled minutes of a session):
 * one minute is structurally **0** because a bar arrives after the minute it
 * describes has ended, two minutes reads as a fault (57.5% of the universe
 * after lunch, beside a chrome saying `LIVE`), fifteen buys 8.5 points and
 * costs the word *live*. Five holds ~90% at the median and never drops below
 * 86% in any hour.
 *
 * **It is spelled once, here, and travels on the frame** as
 * `WireObservedBreadth.windowMinutes` — because the count is computed on the
 * server and the sentence that qualifies it is drawn in a browser, and two
 * spellings of `5` is the shape this repository refuses. A rollback can put a
 * gateway and a bundle two values apart; the figure beside the count is always
 * the one the count was taken with.
 */
export const BREADTH_WINDOW_MINUTES = 5;

const MS_PER_MINUTE = 60_000;

export interface MarketBreadthOptions {
  /**
   * The instant the count is **as of** — the aggregate's own `asOf`, which is
   * the replay clock's reading under a replay.
   */
  readonly asOf: Date;

  /**
   * Whether the **regular session** is open at {@link asOf}.
   *
   * **The basis is session-driven rather than data-driven**, which is the
   * owner's Gate 1 decision 3. The rejected alternative was choosing the
   * `observed` basis whenever anything had arrived: the measured five-minute
   * minimum is **5 of 518**, so thin extended hours would produce a breadth
   * figure over five names — and a reader will believe it.
   *
   * An argument rather than a predicate called here, so this module reads no
   * calendar and no clock. `isMarketOpen` in `feed-diagnostic.ts` is the one
   * home for the question, and it fails **closed** outside the checked-in
   * calendar — which is the right failure here too: *we cannot say this is a
   * session* reports the stored session's breadth rather than a live count.
   */
  readonly marketOpen: boolean;
}

/** The three accumulators, by the name the wire gives each bucket. */
type Buckets = Record<"advancing" | "declining" | "unchanged", number>;

/**
 * Which bucket a direction is counted in.
 *
 * **A `switch` with no `default`, which is what makes a fourth category a
 * compile error** rather than a figure that quietly stops summing: with every
 * case returning and the end of the function reachable, a new member of
 * `PRICE_DIRECTIONS` fails the build here naming itself. A `default` — even
 * one that threw — would turn that into a run-time surprise inside the
 * socket's own callback.
 *
 * The three wire names are not the three direction names, and that is not an
 * oversight: `directionOf` answers `positive | negative | unchanged` about a
 * **number**, and the market's words for the same three facts are *advancing*,
 * *declining* and *unchanged*. This function is the one translation.
 */
const bucketOf = (direction: PriceDirection): keyof Buckets => {
  switch (direction) {
    case "positive":
      return "advancing";
    case "negative":
      return "declining";
    case "unchanged":
      return "unchanged";
  }
};

/**
 * Count the three buckets and their sum.
 *
 * The denominator is produced by adding the three accumulators, so it cannot
 * be a count of a different set from the one that filled them. A percentage
 * with no direction — non-finite — is in no bucket and therefore outside the
 * denominator, which is what *we cannot say* means.
 */
const tally = (percents: readonly number[]): Buckets & { measured: number } => {
  const buckets: Buckets = { advancing: 0, declining: 0, unchanged: 0 };

  for (const percent of percents) {
    const direction = directionOf(percent);
    if (direction === undefined) continue;
    buckets[bucketOf(direction)] += 1;
  }

  return {
    ...buckets,
    measured: buckets.advancing + buckets.declining + buckets.unchanged,
  };
};

/**
 * **One security whose move can be measured, with the move itself** (Task
 * 4.5.4).
 *
 * The entry travels beside the percentage because the movers section needs the
 * **security** — it ships rows — and breadth needs only the **number**. One
 * pass produces both, which is what makes the two sections' denominators the
 * same number rather than two filters agreeing.
 */
export interface MeasuredMove {
  readonly entry: MarketOverviewEntry;
  readonly percent: number;
}

/**
 * **What qualifies the set** — the basis, and the one fact that names it.
 *
 * It is the producer's half of `WireObservedBreadth.windowMinutes` and
 * `WireSessionBreadth.session`: the window is spelled once, here, and both
 * wire sections carry the copy this pass was taken with. A rollback can put a
 * gateway and a bundle two values apart; it cannot put two sections of one
 * frame two values apart.
 */
export type MoveQualifier =
  | { readonly basis: "observed"; readonly windowMinutes: number }
  | { readonly basis: "session"; readonly session: MarketDate };

/**
 * **The securities whose move can be measured, on one basis, in one pass** —
 * the input both `Market breadth` and `Movers` are computed from (Task 4.5.4).
 *
 * ## Why this type exists at all, which is the whole of Task 4.5.4's AC 1
 *
 * A top-N and a count have to agree about **who** they are about, and the
 * thing that can drift between them is not the loop — it is the **predicate**.
 * {@link observedMoves} embeds `state === "live"`, the window on
 * `bar.startsAt` and `change.percent !== null`; {@link sessionMoves} embeds
 * two more. A `topMovers` that re-wrote either set would be a **second home
 * for the window**, and the window is what the denominator sentence beside
 * both regions is written from.
 *
 * So the pass is extracted and consumed twice, and `movers.eligible` and
 * `breadth.measured` are the same number because they are the length and the
 * tally of **one array**. Two caveats, both load-bearing: `measured` stays the
 * **sum of the three accumulators** rather than this array's length (the
 * docblock above makes that a property of the single tally, and
 * `readBreadth`'s first cross-field check depends on it); and a figure with no
 * **direction** — non-finite — is eligible here and in no bucket there, which
 * is the one legitimate way the two can differ and is why `readMovers` checks
 * `eligible` against the lists rather than against breadth.
 */
export interface EligibleMoves {
  /** The basis, and the fact that names it. */
  readonly qualifier: MoveQualifier;
  /** The measurable securities, **in the order the join reported them**. */
  readonly moves: readonly MeasuredMove[];
  /**
   * **The size of the set the pass was over** — the 503 equities, counted
   * rather than named, and the only place that figure crosses the wire. See
   * `WireBreadthCounts.tracked`.
   */
  readonly tracked: number;
}

/**
 * The live set: every security heard from inside the window whose move can
 * be measured.
 *
 * **Heard from and measurable are different sets**, and both sections are over
 * the second: a `live` entry with no stored close is a true price with no
 * basis, so it is in no bucket and outside `measured`. The size of that
 * difference is owed as a measurement by Task 4.4.6 and is not inferred here.
 */
const observedMoves = (
  entries: readonly MarketOverviewEntry[],
  asOf: Date,
): EligibleMoves => {
  // Inclusive at the edge: an observation exactly `windowMinutes` old is
  // inside the window the sentence names. `startsAt` is the **start** of the
  // minute the bar describes, so the newest observation at any instant is
  // already 60–120 s old — see this module's note on the clock.
  const since = asOf.getTime() - BREADTH_WINDOW_MINUTES * MS_PER_MINUTE;

  const moves: MeasuredMove[] = [];

  for (const entry of entries) {
    if (entry.state !== "live") continue;
    if (entry.bar.startsAt.getTime() < since) continue;
    if (entry.change.percent === null) continue;
    moves.push({ entry, percent: entry.change.percent });
  }

  return {
    qualifier: { basis: "observed", windowMinutes: BREADTH_WINDOW_MINUTES },
    moves,
    // **The set, counted rather than named** — the browser draws
    // `tracked − measured` below a rule and its heading names the set, so the
    // figure has to be the length of the array this function was handed. A
    // `503` typed in either process is a lie with no symptom the day a
    // security is delisted.
    tracked: entries.length,
  };
};

/**
 * The shut-market set: the last completed session's close-to-close moves.
 *
 * ## One session, naming itself, filtering both halves
 *
 * The session is the **latest** one any of these securities has a stored close
 * for — a lexicographic maximum over `YYYY-MM-DD`, which for that format is
 * also the chronological one — and only securities whose close belongs to it
 * are counted. A count mixing one security's Friday move with another's
 * Thursday is a figure about neither session, and the nightly backfill
 * guarantees the disagreement is real: a security the backfill missed sits a
 * session behind its neighbours with nothing on screen saying so.
 *
 * ## It reads a close on the `live` member too
 *
 * Which is why that member carries one. This is the path the market is on for
 * roughly 80% of the week, and for most of those hours the process is still
 * holding the session's observations — so a count over `stored` entries alone
 * would be a count over whatever happened to go quiet.
 *
 * ## The empty store names the session it asked about
 *
 * With no close anywhere, `measured` is `0` and the session is the market date
 * of `asOf` — *we counted and heard nothing, about today*. That is CI's store
 * (518 securities, zero bars) and it is a true answer rather than a degraded
 * one. It is **not** a claim that we hold that session: `measured: 0` beside it
 * is what says we do not.
 */
const sessionMoves = (
  entries: readonly MarketOverviewEntry[],
  asOf: Date,
): EligibleMoves => {
  let session: MarketDate | undefined;

  for (const entry of entries) {
    const close = lastCloseOf(entry);
    if (close === undefined) continue;
    if (session === undefined || close.session > session)
      session = close.session;
  }

  const moves: MeasuredMove[] = [];

  for (const entry of entries) {
    const close = lastCloseOf(entry);
    if (close === undefined || close.session !== session) continue;
    // `changePercent` is `packages/shared`'s — the **same** function
    // `/securities`' table and `WireStoredFigure.sessionChangePercent` use for
    // this figure, and the one module permitted to read `previousClose` as a
    // basis. `null` is *there is nothing behind this session*, which is a
    // security in no bucket rather than an unchanged one.
    const percent = changePercent(close);
    if (percent === null) continue;
    moves.push({ entry, percent });
  }

  return {
    qualifier: {
      basis: "session",
      // `marketDateAt` is the one module permitted to convert an instant to a
      // market date, and this is the only clock reading in the function — of
      // an instant handed in.
      session: session ?? marketDateAt(asOf),
    },
    moves,
    // The same set, however few of it this session's closes cover — see
    // `observedMoves`.
    tracked: entries.length,
  };
};

/**
 * **Which securities have a measurable move, and on which basis** — the one
 * pass `Market breadth` and `Movers` are both computed from (Task 4.5.4).
 *
 * **The caller decides the set**, and it is the 503 equities rather than the
 * universe: a count including `SPY` and the eleven sector SPDRs beside their
 * own constituents makes `Market breadth` and `Market proxies`
 * non-independent, and a **mover** that is a fund is `XLE` drawn a third time
 * twenty-four pixels from a sector row asserting the same figure — one fact
 * with two homes. `breadth-is-counted-over-the-equities-alone` holds the one
 * call site to this, and `each-overview-section-names-its-own-set` holds the
 * two sections to its answer.
 *
 * **The basis is session-driven rather than data-driven** — the owner's Gate 1
 * decision 3 for Story 4.4, argued at {@link MarketBreadthOptions.marketOpen}.
 */
export function eligibleMoves(
  entries: readonly MarketOverviewEntry[],
  options: MarketBreadthOptions,
): EligibleMoves {
  return options.marketOpen
    ? observedMoves(entries, options.asOf)
    : sessionMoves(entries, options.asOf);
}

/**
 * How broad the move is, over the set it is handed.
 *
 * **It takes the pass rather than the entries** (Task 4.5.4): the set is
 * decided once, by {@link eligibleMoves}, so the count and the ranking beside
 * it cannot be over two different populations. `measured` is still the **sum
 * of the three accumulators** rather than `moves.length` — a figure with no
 * direction is eligible and in no bucket, and `readBreadth`'s first
 * cross-field check is that the three sum to the denominator.
 */
export function marketBreadth(eligible: EligibleMoves): WireMarketBreadth {
  const counts = {
    ...tally(eligible.moves.map((move) => move.percent)),
    tracked: eligible.tracked,
  };

  const qualifier = eligible.qualifier;

  // A branch rather than a spread of the union: spreading one would type-check
  // and would leave *which fields a member carries* to inference, which is the
  // thing ADR 0031's field maps exist to stop being inferred.
  return qualifier.basis === "observed"
    ? { basis: "observed", ...counts, windowMinutes: qualifier.windowMinutes }
    : { basis: "session", ...counts, session: qualifier.session };
}
