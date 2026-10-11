import { OBSERVATION_INTERVAL_MS } from "@marketpulse/shared";

import { formatBarInstant } from "./chart-reading.js";

// **The one clause two regions state about the same set** (Task 4.5.6).
//
// `Market breadth` and `Movers` are computed from **one eligibility pass** over
// one array in `apps/backend/src/market-breadth.ts` — which is what makes
// `breadth.measured` and `movers.eligible` the same number by construction
// rather than by two filters agreeing, and
// `breadth-is-counted-over-the-equities-alone` permits exactly one call to it.
//
// The owner's Gate 1 decision for Story 4.5 is that the **ranked region states
// the denominator too**, 200–300 px from the region that already does: a
// ranking's whole honesty rests on it, and a reader must not cross the page to
// learn whether the top five is the top five. So one screen carries the same
// fact twice, deliberately — and ADR 0029's *one fact has one home* is
// satisfied the way it is satisfied everywhere else in this product: **one
// string with two renderings**, built here, read by both.
//
// ## What this module is NOT
//
// It is not a second producer. Nothing here counts, subtracts or compares — it
// is handed two integers and a qualifier that came off the wire and spells
// them. A `+ 1` here would be a second count and it would be the one that
// drifts.
//
// ## Why it is its own file rather than an export of `market-breadth.ts`
//
// Because the dependency would run the wrong way. `movers.ts` must be unable to
// read the **breadth section** — `encodeBreadth` drops that whole section on
// one non-finite count (ADR 0031), and a ranked list with no denominator is the
// one thing Story 4.5 must not ship, which is precisely why
// `WireMoverLists.eligible` and `WireMoverLists.tracked` exist as the movers
// section's own fields. A movers module importing from a module named for
// breadth is one refactor away from reading its figures, and the symptom is
// invisible: the two figures agree, so the region looks right in every state
// anybody photographs and goes **silent about its denominator** in the one
// state the field was added for. `the-ranking-states-its-own-denominator`
// refuses the import by name.
//
// ## The two grammars are keyed on the basis the WIRE sent
//
// Never on a clock this module reads. *Heard from in the last five minutes* is
// false about a closed market — the market is shut for roughly 80% of the week
// — and *had a close-to-close move* is false about a live one. Neither member
// can render the other's: `windowMinutes` does not exist on the session member
// and `session` does not exist on the observed one, so a renderer that mixes
// them is a **compile error rather than a wrong sentence**.

/**
 * **The question the count answered, and the one fact that names it.**
 *
 * Structurally satisfied by both `WireMarketBreadth` and `WireMarketMovers`,
 * which is deliberate: the qualifier is the producer's own
 * `MoveQualifier`, spelled once in the pass both sections are taken from, so
 * the two sections of one frame cannot be two values apart. A rollback can put
 * a gateway and a bundle two values apart; that is why the window is **read**
 * here and never spelled.
 */
export type MeasuredQualifier =
  | { readonly basis: "observed"; readonly windowMinutes: number }
  | { readonly basis: "session"; readonly session: string };

/** What a region was computed over, in the three figures that say so. */
export interface MeasuredSet {
  /** The qualifier — a wire section, passed whole. */
  readonly qualifier: MeasuredQualifier;
  /**
   * **The size of the set, read and never typed.** `WireBreadthCounts.tracked`
   * and `WireMoverLists.tracked` are the same figure at the two ends of this
   * sentence; a literal `503` is a lie with no symptom the day a constituent is
   * delisted, which is what `the-population-is-never-a-literal` refuses.
   */
  readonly tracked: number;
  /** How many of it the region's own figures are about. */
  readonly count: number;
}

/**
 * How many were counted, **as a sentence says it**.
 *
 * `none` rather than `0`, because a clause reading *0 were heard from* is a
 * figure where a word belongs. Reachable rather than theoretical: Task 4.1.6
 * measured a five-minute minimum of 5 during a session, so a single figure is
 * an extended-hours or dying-feed reading and `1 were heard from` is the defect
 * a count's own grammar invites.
 */
export const countInWords = (count: number): string =>
  count === 0 ? "none" : String(count);

/**
 * How far back *heard from* reaches, in words — **and the window is read**.
 *
 * `windowMinutes` is the producer's figure, so every clause built from it is
 * right about the count beside it. A `5` typed at a call site would be the
 * second home for a number this repository has already decided travels.
 */
export const measuredWindow = (minutes: number): string =>
  `the last ${String(minutes)} ${minutes === 1 ? "minute" : "minutes"}`;

/**
 * **The clause both ranked-and-counted regions state**, with no trailing stop —
 * the caller supplies the punctuation and whatever it goes on to say.
 *
 * ## Why the session grammar is `had` rather than `were`
 *
 * Because a closed market's count is about a session that has ended, and
 * because the past tense is the one verb in English that does not have to agree
 * with the number in front of it: `1 had` and `451 had` are both right, which
 * removes an agreement this module would otherwise have to get right twice. The
 * live grammar has no such escape, so {@link countInWords} and the `was`/`were`
 * pair below are explicit.
 */
export function describeMeasuredSet(set: MeasuredSet): string {
  const { qualifier, tracked, count } = set;
  const of = `Of the ${String(tracked)} companies we track`;

  if (qualifier.basis === "session") {
    return `${of}, ${countInWords(count)} had a close-to-close move on ${qualifier.session}`;
  }

  return `${of}, ${countInWords(count)} ${count === 1 ? "was" : "were"} heard from in ${measuredWindow(qualifier.windowMinutes)}`;
}

/**
 * **How old the two regions' figures are, beside the denominator they already
 * state** — with no trailing stop, as {@link describeMeasuredSet} has none, or
 * `undefined` where the aggregate holds no observation (Task 4.7.4).
 *
 * ## An age, not a verdict
 *
 * The same decision the proxy strip's third row and the universe table's
 * `Live price from 12:07` already took. There is **no threshold, no status
 * word, no connection word and no per-region verdict**: `live`, `stale` and
 * `disconnected` have one home and it is the status bar (Story 3.10), which
 * `a-second-staleness-sentence` and `one-home-for-the-strip-staleness-sentence`
 * refuse by name. This states an instant and lets the reader do the
 * subtraction, which is the whole difference.
 *
 * ## Why these two regions need it where their siblings do not
 *
 * `Market breadth` and `Movers` are the two things on the landing screen most
 * confidently wrong when stale — a count and a ranking read as current
 * whatever produced them — and until this clause they carried **no instant in
 * any state**. The screen-level one is `OverviewSourceNote`'s `Observed
 * through`, which at 390 sits roughly 2,500 px below both regions behind three
 * reserved panels, so a reader scrolling past `none were heard from in the
 * last 5 minutes` had nothing on screen saying *when*.
 *
 * ## Why it is a SENTENCE of its own rather than a clause in the two grammars
 *
 * The two grammars are keyed on the basis the wire sent and neither can render
 * the other's. **This fact is keyed on neither**: it is about what has reached
 * this process, which is the same question on a live market and a shut one. A
 * clause spliced into each grammar would be the same sentence written twice
 * and would have to agree about its own punctuation in four places; a sentence
 * appended after whatever the caller said composes with both, and with
 * breadth's drawn/spoken pair, without either grammar knowing it exists.
 *
 * ## The instant is the interval's END, and that is the whole arithmetic
 *
 * `WireMarketOverview.observedAt` is a bar's own `startsAt` — **the start of
 * the minute it describes** (`LIVE-DATA.md` §7.3, measured with a control: a
 * bar stamped `14:01:00Z` arrives at `14:02:00.5Z`). So the newest observation
 * an aggregate can hold describes the minute that **ends** a minute later, and
 * *nothing newer than 14:01 has reached us* is false about a feed that has
 * just delivered the 14:01 bar: the 14:01–14:02 minute has reached us whole.
 *
 * Adding {@link OBSERVATION_INTERVAL_MS} is therefore the same correction Task
 * 3.3.4 made to `feedStatusFrom`, one surface over — where leaving it out made
 * `live` structurally unreachable during a session. It is read from
 * `packages/shared` rather than spelled, for that constant's own reason: a
 * second timeframe on this feed is its reversal trigger, and a `60_000` here
 * would be the second home that does not move with it.
 *
 * ## `undefined` is the answer, and it is CI's permanent answer
 *
 * ADR 0029's defer rule, decided at the producer: `observedAt` is **absent**
 * exactly when the aggregate contains no observation — CI's store (518
 * securities, **zero bars**), a `MARKET_DATA_PROVIDER=none` deployment, and a
 * restarted backend before its first bar. **Say nothing rather than say now**,
 * which is also why a malformed instant is skipped rather than drawn:
 * `Date.parse` answers `NaN` for what it cannot read and `new Date(NaN)`
 * formats without complaining, which is how `Invalid Date` reaches a screen.
 *
 * ## What the instant is NOT read from
 *
 * Not `computedAt` and not `sentAt` — both are readings of the **server's own
 * clock**, so on a dead feed they advance with nothing behind them and would
 * date these figures to the minute the reader opened the tab (Task 4.8.12's
 * defect, in the one surface that had already made it). Not the browser's
 * clock either: an age computed here would differ between two tabs opened an
 * hour apart, and since Task 4.7.3 the gateway serves a joining browser its
 * **last broadcast** aggregate — so this instant can be arbitrarily old on a
 * fresh join, it grows without bound on a feed that has stopped, and both are
 * correct.
 *
 * ## The spelling is the product's, not a second one
 *
 * A whole instant with its zone through `formatBarInstant`, which is what
 * `OverviewSourceNote` and the proxy strip's per-cell note both use — to the
 * **minute**, which that function drops seconds for by construction.
 */
export function describeMeasuredReach(
  observedAt: string | undefined,
): string | undefined {
  if (observedAt === undefined) return undefined;

  const startsAt = Date.parse(observedAt);
  if (Number.isNaN(startsAt)) return undefined;

  const closedAt = new Date(startsAt + OBSERVATION_INTERVAL_MS);

  return `Nothing newer than ${formatBarInstant(closedAt, "1m")} has reached us`;
}
