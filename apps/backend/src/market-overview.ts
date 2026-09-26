import { changeFromClose, marketDateAt } from "@marketpulse/shared";

import type {
  Bar,
  BarSource,
  LiveChange,
  MarketDate,
  SecurityLastClose,
  Ticker,
} from "@marketpulse/shared";
import type { CurrentObservation } from "./current-market-state.js";

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
      };
    }

    if (close !== undefined) return { state: "stored", symbol, close };

    return { state: "unknown", symbol };
  });
}
