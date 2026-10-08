import {
  changeFromClose,
  changePercent,
  marketDateAt,
  rankSectorFigures,
} from "@marketpulse/shared";

import type {
  Bar,
  BarSource,
  LiveChange,
  MarketDate,
  MarketFeed,
  SectorLadderStep,
  SecurityLastClose,
  Ticker,
  WireMarketBreadth,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";
import { topMovers } from "./market-movers.js";

import type { CurrentObservation } from "./current-market-state.js";
import type { EligibleMoves } from "./market-breadth.js";

/**
 * **The join** — a live observation against the previous session's stored
 * close (Task 4.2.3).
 *
 * ## What was missing, which is not what the story's title says
 *
 * Story 4.2 calls its subject *"where an aggregate over the universe is
 * computed"* and then calls the index proxies *"the one aggregate that is not
 * an aggregate"*. Both are true, and together they hide the thing nothing in
 * this backend could do: `current-market-state.ts` holds the live map,
 * `market-bars.ts`'s `readLastCloses` holds the stored closes, and **only
 * `GET /securities` ever read the second**. Nothing joined them.
 *
 * Sector performance (4.3), breadth (4.4 — an advancer is the *sign* of a
 * change from close), the movers (4.5 — ranked *by* it) and Epic 5's anomaly
 * scores all need exactly that join. The four index proxies are its smallest
 * possible consumer, which is why they go through it first: if the seam
 * cannot serve four known symbols the failure is visible in minutes rather
 * than in a percentage nobody can check by eye.
 *
 * ## A sibling of `current-market-state.ts`, never a method on it
 *
 * That map has **one writer and many readers**, and that is the property
 * `LIVE-DATA.md` §10.3 bought. A derivation hung off it as a method is a
 * second reason for it to change, and the first thing that would follow is a
 * repository handle inside the object the socket callback writes to.
 *
 * ## Pure, and that is invariant 4 rather than a testing convenience
 *
 * Every input arrives as an **argument**: the observations map, a closes
 * lookup, an `asOf` instant and the symbols asked about. This module reads no
 * clock, opens no socket and holds no repository handle — so under a replay
 * it **cannot** read anything timestamped after the replay clock, because it
 * reads nothing at all. Temporal isolation here is a property of the shape,
 * and every later aggregate built on this seam inherits it by construction.
 * The day this file grows a `Kysely` handle that property is gone, and
 * nothing in `pnpm verify` will say so.
 *
 * ## The `asOf` seam, and the site ADR 0015's gap 4 should be pointed at
 *
 * `readLastCloses` answers *the latest close we hold*, with no replay clock in
 * it. Under a replay of a past session that is **future information**, and
 * this module is the code path that creates the demand for it — the first
 * thing to ask *what was the previous close* about a session that is not
 * today's.
 *
 * So the question is asked in the shape Epic 13 will need it:
 * {@link MarketOverviewInputs.closesAsOf} takes the session derived from
 * `asOf`. **The production implementation may ignore that argument and return
 * the latest closes it holds, and that is recorded rather than hidden** — see
 * the field's own note. The parameter existing is the point: Epic 13's
 * temporal plugin (ADR 0015's gap 4, *"the temporal seam holds only while no
 * unplugged handle is exported"*, restated at its new weight by ADR 0020)
 * changes **one implementation**, instead of finding a call site with no way
 * to ask the question. **If you are the author of that plugin: this is one of
 * the sites it has to reach.**
 */

/**
 * One security's place in the overview.
 *
 * **A discriminated union, because two different absences must not collapse
 * into one value.** `PROVENANCE.md`'s and ADR 0029's rule — a claim about data
 * requires data — has a concrete consequence here: *we have heard nothing
 * about SPY* and *we hold no stored close for SPY* are different facts, they
 * have different remedies, and neither of them is a zero or a null price. A
 * `{ price: number | null }` shape would spell both the same way and would
 * make `0` a reachable value on the wire.
 *
 * `exactOptionalPropertyTypes` is on, so this is built in three branches
 * rather than with optional fields: "absent" and "present as `undefined`" are
 * different types and the compiler holds the difference.
 */
export type MarketOverviewEntry =
  | {
      /**
       * **A live observation, and a change we may or may not be able to
       * measure.**
       *
       * `change.percent` is `null` when there is no stored close to measure
       * from — the live price is still true and is still reported. That is
       * the *third* state, and it is not a fourth member of this union: a
       * price with no basis is one fact missing from an entry that has the
       * other, and {@link LiveChange} already spells it as an absence.
       */
      readonly state: "live";
      readonly symbol: Ticker;
      readonly bar: Bar;
      /** Per-observation provenance. Invariant 6 is displayed, never implied. */
      readonly source: BarSource;
      readonly change: LiveChange;
      /**
       * **The close the change was measured against, when we hold one**
       * (Task 4.4.4) — the same `SecurityLastClose` the `stored` member
       * carries, on the member that has an observation as well.
       *
       * ## Why it is here rather than looked up again by whoever needs it
       *
       * Breadth's `session` basis is a close-to-close count, and **the market
       * is shut for roughly 80% of the week** — during which this process is
       * still holding the session's observations, so most of the 503 are
       * `live` and not `stored`. A count over the `stored` entries alone would
       * therefore be taken over whatever happens to have gone quiet, and it
       * would be *well-formed, small and silent* rather than visibly broken:
       * the exact shape of defect this story exists to prevent.
       *
       * The alternative was a sibling aggregate reading `closesAsOf` a second
       * time, which is a second home for a lookup this join has already done —
       * and the second home is the one that stops being filtered.
       *
       * **Absent, not `null`**, when there is no stored close for the symbol.
       * `exactOptionalPropertyTypes` is on, so that is a different type from
       * present-and-`undefined`, and the builder spreads it in a branch.
       *
       * **It does not reach the wire.** `figureOf` builds the `observed`
       * figure field by field and never spreads an entry — ADR 0031 — so
       * adding a field here adds nothing to a browser's view. A
       * `previousClose` is *the answer to measure from what*, not a price
       * anybody should render.
       */
      readonly close?: SecurityLastClose;
    }
  | {
      /**
       * **Nothing observed, but we hold a close** — which on IEX is ordinary
       * rather than broken (§7.6: 65.1% of minutes for a median symbol,
       * **2.1%** for `ERIE`), and is the state every security is in for some
       * minutes after a restart.
       *
       * The close carries its own **session**, so a renderer cannot show this
       * number without the date it belongs to. That is
       * `current-market-state.ts`'s property 2 applied to the other side of
       * the join.
       */
      readonly state: "stored";
      readonly symbol: Ticker;
      readonly close: SecurityLastClose;
    }
  | {
      /**
       * **Nothing observed and nothing stored.** A true answer rather than a
       * degraded one, and the state CI's store puts all 518 securities in —
       * 518 securities, zero bars.
       */
      readonly state: "unknown";
      readonly symbol: Ticker;
    };

export interface MarketOverviewInputs {
  /**
   * Which securities this overview is about, **in the order it reports
   * them**.
   *
   * A parameter rather than `INDEX_PROXIES`, because the join is the seam and
   * the proxies are one caller of it. 4.3's sectors, 4.4's breadth and 4.5's
   * movers pass different lists to the same function.
   */
  readonly symbols: readonly Ticker[];

  /**
   * What this process has heard — `currentMarketState.all()`.
   *
   * Passed **in**, never read: this module does not know that a socket
   * exists, which is what keeps it callable from a replay and from a test
   * with no Fastify instance.
   */
  readonly observations: ReadonlyMap<Ticker, CurrentObservation>;

  /**
   * The closes to measure against, **as of a session**.
   *
   * Synchronous by design. The production implementation reads a cache
   * (`readLastCloses` is a 518-row database read that changes once a night,
   * and it must not sit inside the socket callback — that callback is the one
   * place an `await` holds up every browser's price and an unhandled
   * rejection kills the process). Making the lookup `async` here would put
   * that `await` back on the path by default.
   *
   * **The production implementation is expected to ignore `session` and
   * return the latest closes it holds, and that is a recorded limitation
   * rather than an oversight.** It is correct for a live session, where the
   * latest close *is* the close as of today, and it is wrong under a replay
   * of a past session, where it is future information. See this module's own
   * note on the `asOf` seam, and ADR 0015's gap 4.
   */
  readonly closesAsOf: (
    session: MarketDate,
  ) => ReadonlyMap<Ticker, SecurityLastClose>;

  /**
   * The instant this overview is **as of** — the replay clock's reading under
   * a replay, and the wall clock's in production.
   *
   * An argument rather than `new Date()`, which is the whole of this module's
   * temporal isolation. It is converted to a market date exactly once, by
   * `marketDateAt`, the one module permitted to convert.
   */
  readonly asOf: Date;
}

/**
 * Join the live map to the stored closes, for a named set of securities.
 *
 * **One computation for every browser** (Task 4.1.1's decision 1): the result
 * is built where `currentMarketState` already lives and sent, not recomputed
 * per page. `one-producer-of-the-overview-aggregate` in
 * `scripts/check-invariants.mjs` holds that to one call site.
 *
 * The change itself is **not computed here**. `changeFromClose` is
 * `packages/shared`'s, and it is the same function the browser's own table and
 * identity block call. What it carries that a re-implementation would not is
 * the **same-session branch**: during the hours between the nightly backfill
 * and the next session's open, the store's last session and the live bar's
 * session meet, and measuring against `close.close` reports ≈0.00% for
 * everything — well-formed, correctly-coloured numbers saying the market did
 * not move.
 */
export function buildMarketOverview(
  inputs: MarketOverviewInputs,
): readonly MarketOverviewEntry[] {
  const { symbols, observations, closesAsOf, asOf } = inputs;

  // **The replay seam, in one line.** Everything below reads `closes`; nothing
  // below can ask for a different session.
  const closes = closesAsOf(marketDateAt(asOf));

  return symbols.map((symbol) => {
    const observed = observations.get(symbol);
    const close = closes.get(symbol);

    if (observed !== undefined) {
      return {
        state: "live",
        symbol,
        bar: observed.bar,
        source: observed.source,
        change: changeFromClose(observed.bar, close),
        // Two branches rather than one spread of a possibly-`undefined`
        // value: `exactOptionalPropertyTypes` is on and *absent* is what the
        // field means. See the member's own note for why it is carried at all.
        ...(close === undefined ? {} : { close }),
      };
    }

    if (close !== undefined) return { state: "stored", symbol, close };

    return { state: "unknown", symbol };
  });
}

/**
 * The overview as it travels — **the aggregate's one wire conversion** (Task
 * 4.2.4), and `snapshotOf`'s sibling one module over.
 *
 * ## Why the conversion is here and not in the gateway
 *
 * The gateway knows about sockets, subscriptions and backpressure and knows
 * nothing about a join; this module holds the join and is pure. Putting the
 * mapping here keeps the gateway's new code to *encode this and send it*, and
 * keeps the one place that reads a `LiveObservation` or a `SecurityLastClose`
 * the one place that decides what a browser is allowed to see.
 *
 * ## The derived figures carry NEITHER of the things they were derived from
 *
 * A {@link CurrentObservation} holds a six-field `Bar`, a `BarSource` with a
 * provider and a retrieval instant, and an `ageMs` computed on read; a
 * `SecurityLastClose` holds a `previousClose` which is *the answer to measure
 * from what* rather than a price anybody should render. **None of it goes on
 * the wire.** ADR 0031: on HTTP a field on the object and not on the type is
 * stripped, and on a socket it **leaks** — so the figure is built field by
 * field rather than spread, and every nested object has its own field map in
 * `market-stream-protocol.ts`.
 *
 * ## `computedAt` is the caller's `asOf`, not a clock read here
 *
 * This module reads no clock (invariant 4, and the note at the top of this
 * file), so the instant the aggregate was true is the instant the caller said
 * it was about. Under a replay that is the replay clock.
 */
export interface WireMarketOverviewInputs {
  /**
   * The index proxies, in the order they are reported — `overview.figures`.
   *
   * Named `proxies` rather than `figures` since Task 4.3.4, because the frame
   * now has two sections and *figures* stopped being unambiguous at the call
   * site.
   */
  readonly proxies: readonly MarketOverviewEntry[];

  /**
   * The sector benchmarks, **which this function ranks**.
   *
   * Absent means *no sector section on this frame*, which is not the same as an
   * empty one: a renderer draws the first as the region's reserved state and the
   * second as eleven figures it knows nothing about.
   *
   * The caller passes them in `SECTORS`' declared order and gets them back in
   * rank order — the ordering is `rankSectorFigures`', from `packages/shared`,
   * because the declared order is the tie-break for two figures that read the
   * same on screen and a stable sort is the whole mechanism.
   */
  readonly sectors?: readonly MarketOverviewEntry[];

  /**
   * The ladder's rung, **from the ranked figures** — a callback because the
   * ratchet is state and this module is pure.
   *
   * `closesAsOf`'s shape for the same reason: the rung depends on the previous
   * rung and on the session, so something has to remember, and it must not be
   * this module. `sector-ladder-ratchet.ts` is the cell; this is the seam it
   * reaches the frame through, and a caller with no ladder passes nothing.
   */
  readonly sectorLadderStep?: (
    ranked: readonly WireOverviewFigure[],
  ) => SectorLadderStep;

  /**
   * **How broad the move is — and it is NOT optional** (Task 4.4.4).
   *
   * `WireMarketOverview.breadth` is optional and this is not, which is the
   * whole mechanism: the **read** side has to tolerate a frame from a previous
   * image, and the **producer** must not be able to build one without a count.
   * A frame carrying figures and no breadth leaves the region's `waiting`
   * false, so its 2,000 ms silence floor never fires and the panel sits
   * reserved and silent for ever — Task 4.3.8's produced defect, made
   * unreachable by a missing property being a compile error here.
   *
   * The counts are `market-breadth.ts`'. The serialiser may still drop the
   * section, for a non-finite count, and that is ADR 0031 holding its guarantee
   * where the encoding happens.
   */
  readonly breadth: WireMarketBreadth;

  /**
   * **The set the movers are selected from — and it is NOT optional either**
   * (Task 4.5.4), for {@link WireMarketOverviewInputs.breadth}'s recorded
   * reason: a frame carrying figures and no movers section leaves the region's
   * `waiting` false, so its 2,000 ms silence floor never fires and the panel
   * sits reserved and silent for ever.
   *
   * It is the **eligibility pass**, not the lists: `eligibleMoves`' answer,
   * the same array `breadth` was tallied from. The ranking and the slice are
   * `market-movers.ts`'; the rows are built here, because `figureOf` is the
   * one place entitled to say what a browser may see and the one place that
   * records a figure's tape on the frame.
   */
  readonly movers: EligibleMoves;

  /** The instant the aggregate was true — the caller's, never a clock here. */
  readonly asOf: Date;
}

export function toWireMarketOverview(
  inputs: WireMarketOverviewInputs,
): WireMarketOverview {
  const { proxies, sectors, sectorLadderStep, breadth, movers, asOf } = inputs;

  // First-seen order, and only for figures that are actually **observed** —
  // a stored close's tape is not this frame's provenance, and claiming it
  // would be invariant 6 implied rather than displayed. **One list for the
  // whole frame**, across both sections: the tapes are a property of the
  // observations this aggregate was built from, and the sector ETFs arrive on
  // the same socket from the same batch.
  const feeds: MarketFeed[] = [];

  const encode = (
    entries: readonly MarketOverviewEntry[],
  ): WireOverviewFigure[] => entries.map((entry) => figureOf(entry, feeds));

  const figures = encode(proxies);

  // **The movers' rows go through the same `figureOf`**, which is why the
  // selection happens here rather than in `index.ts`: it is the one place
  // entitled to decide what a browser sees, and it is what keeps the frame's
  // `feeds` a description of the figures the frame actually carries.
  //
  // **A mover row is encoded on the basis it was RANKED on** — Task 4.5.8's
  // other half, and the rank key is only half the repair. `topMovers` now
  // ranks on the move `eligibleMoves` measured, so on the `session` basis the
  // order is a close-to-close order; if the row then **drew** the `observed`
  // figure's live-against-close change, the drawn order would contradict the
  // drawn figures, which is the one thing `sector-ranking.ts` exists to
  // prevent. So the figure a session-basis mover carries is the figure of the
  // **close the pass read** — one quantity measured once, ranked on, bucketed
  // by and printed.
  //
  // Two consequences, both improvements and both worth knowing before
  // changing this line. The section's rows are now **uniform** on the session
  // basis — every one `stored`, every `basis` string `stored:<session>`, every
  // price that session's close — where an evening frame used to be a mixture
  // of `observed` and `stored` rows nothing on screen distinguished
  // (`SectorRow.price`'s fired trigger, re-closed in the same change). And a
  // mover row **contributes no tape to `feeds`** on this basis, because a
  // stored close's tape deliberately never does.
  const moverFigureOf = (entry: MarketOverviewEntry): WireOverviewFigure => {
    if (movers.qualifier.basis === "observed") return figureOf(entry, feeds);

    // `undefined` is unreachable from `topMovers` on this basis —
    // `sessionMoves` admits only entries it read a close off — and it is
    // delegated rather than thrown: `figureOf` is the one encoder, and this
    // function is a **choice of basis**, never a second answer to what a
    // browser may see.
    const close = lastCloseOf(entry);
    return close === undefined
      ? figureOf(entry, feeds)
      : storedFigureOf(entry.symbol, close);
  };

  const movements = topMovers(movers, moverFigureOf);

  const ranked =
    sectors === undefined ? undefined : rankSectorFigures(encode(sectors));

  const step =
    ranked === undefined || sectorLadderStep === undefined
      ? undefined
      : sectorLadderStep(ranked);

  return {
    computedAt: asOf.toISOString(),
    feeds,
    figures,
    breadth,
    movers: movements,
    // Two branches rather than one spread of a possibly-`undefined` value:
    // `exactOptionalPropertyTypes` is on, *absent* and *present as `undefined`*
    // are different types, and only the first is what this wire means.
    ...(ranked === undefined ? {} : { sectors: ranked }),
    ...(step === undefined ? {} : { sectorLadderStep: step }),
  };
}

/**
 * One entry to one wire figure, **appending its tape to the frame's list**.
 *
 * Extracted from the loop by Task 4.3.4 so the two sections cannot diverge: a
 * second copy of this mapping is a second answer to *what may a browser see*,
 * and the one that gets forgotten is the one added later.
 */
function figureOf(
  entry: MarketOverviewEntry,
  feeds: MarketFeed[],
): WireOverviewFigure {
  if (entry.state === "unknown") {
    return { state: "unknown", symbol: entry.symbol };
  }

  if (entry.state === "stored")
    return storedFigureOf(entry.symbol, entry.close);

  if (!feeds.includes(entry.source.feed)) feeds.push(entry.source.feed);

  const { percent, basis } = entry.change;

  return {
    state: "observed",
    symbol: entry.symbol,
    at: entry.bar.startsAt.toISOString(),
    price: entry.bar.close,
    // **Omission, in two branches.** `exactOptionalPropertyTypes` is on, so
    // *absent* and *present as `undefined`* are different types and only
    // the first is what this wire means.
    //
    // **`null` is the DOMAIN absence and is this module's to spell**:
    // `LiveChange.percent` is `null` when there is nothing to measure from,
    // which is §36's partial answer rather than a zero. **A non-finite
    // number is the WIRE's problem and is deliberately not checked here** —
    // `encodeFigure` omits one, in the serialiser, because ADR 0031's
    // argument is that a transport with no schema layer owes its guarantee
    // where the encoding happens and not at whichever call site happens to
    // remember. A `Number.isFinite` here as well would be one rule with two
    // homes, and the second is the one that gets forgotten.
    ...(percent === null ? {} : { changePercent: percent }),
    // The basis names the session a figure was measured from, so it does
    // not travel without one — a date describing a percentage that is not
    // there is ADR 0029's false impression, one field wide.
    ...(percent === null || basis === null ? {} : { changeBasis: basis }),
  };
}

/**
 * **The completed session's own close-to-close move**, as a wire figure (Task
 * 4.3.4, the owner's Gate 1 decision): outside a session this is the only key
 * a ranking has, and the market is shut for roughly 80% of the week.
 *
 * `changePercent` is `packages/shared`'s — the *same* function `/securities`'
 * table has always used for this figure, and the one module permitted to read
 * `previousClose` as a basis. It returns `null` when there is nothing behind
 * the session we hold, and that travels as an **omission**: a zero would say
 * the market did not move.
 *
 * **Extracted from {@link figureOf}'s `stored` branch by Task 4.5.8** so that
 * the movers' session-basis encoder can reach it for an entry whose state is
 * `live` — the pass read that entry's close, so the figure the row draws is
 * the figure of **that close** rather than of the last trade. It takes the
 * close rather than the entry for exactly that reason: the caller has decided
 * which of an entry's two facts this figure is about, and a function taking
 * the entry would have to decide again.
 *
 * It appends nothing to the frame's `feeds`, which is the other half of the
 * same point: **a stored close's tape is not this frame's provenance**, and
 * claiming it would be invariant 6 implied rather than displayed.
 */
function storedFigureOf(
  symbol: Ticker,
  close: SecurityLastClose,
): WireOverviewFigure {
  const move = changePercent(close);

  return {
    state: "stored",
    symbol,
    session: close.session,
    close: close.close,
    ...(move === null ? {} : { sessionChangePercent: move }),
  };
}

/**
 * **The close an entry was measured against, whatever state it is in** — or
 * `undefined` for a security we hold no close for.
 *
 * Moved here from `market-breadth.ts` by Task 4.5.8, which gave it a second
 * reader. It belongs beside {@link MarketOverviewEntry}: *which member carries
 * a close* is a fact about that union, and the union is this module's — the
 * same argument `moveRankingKey` makes about a figure's move one package over.
 * A second spelling of the two-line branch is a second place to forget that
 * the `live` member has one.
 *
 * `undefined` for a `live` entry whose change is unmeasurable, and for an
 * `unknown` one, which is every security in CI's store.
 */
export function lastCloseOf(
  entry: MarketOverviewEntry,
): SecurityLastClose | undefined {
  return entry.state === "unknown" ? undefined : entry.close;
}
