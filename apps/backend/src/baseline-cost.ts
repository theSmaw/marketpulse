import {
  BASELINE_LOOKBACK_SESSIONS,
  isTicker,
  toTicker,
} from "@marketpulse/shared";

import { baselineWindowEndingAt } from "./return-baseline.js";
import type { ReturnBaselineStore } from "./return-baseline-store.js";

/**
 * **What the replica can measure about its own store, and nothing else** (Task
 * 5.3.2, amended into this task by Task 5.3.1).
 *
 * ## Why a route at all, when AC 1 refuses one
 *
 * Story 5.3's AC 10 wants the pass's real cost measured on the **deployed**
 * store rather than derived, and Task 5.3.1 ran the two commands it names and
 * **could not connect**: this laptop's network *refuses* outbound 5432 — a
 * refusal, not the timeout `HOSTING.md` warns about for a stale firewall rule —
 * while the deployed backend reads the same server perfectly. `HOSTING.md`'s
 * operator path has a precondition nobody wrote down and it is not satisfiable
 * from here.
 *
 * So the owner ruled, on 2026-10-14, that AC 1's *not in a route* governs
 * **computing the baseline for a reader** and not **measuring it**. This is
 * `/diagnostics/database`'s own argument arriving a second time: *a laptop
 * dialling the database tests a laptop's network, its own credential and no
 * managed identity at all* — the replica is the only instrument standing in the
 * interesting position.
 *
 * ## What it must not do, and the limits are the point
 *
 * **It never runs the pass.** An `EXPLAIN` of one security and two counts over
 * the same security's window — otherwise AC 1's refusal would be real rather
 * than ruled around, and a cold full-universe pass under a reader is minutes.
 *
 * **It is O(one security) and says which.** `/diagnostics/freshness` is
 * deliberately unbounded *because its answer is about the whole store*; this
 * one's answer is about one security, so the symbol is a parameter with a
 * default and nothing here touches the other 515.
 *
 * **It leaks no plan text.** Postgres's `FORMAT JSON` plan carries index names,
 * relation names and, under some settings, file paths; what is returned is a
 * handful of **named fields from a fixed vocabulary** — the node types, four
 * integers and a float — rather than a plan a reader could mine. `CLAUDE.md`'s
 * rule that *a message written for a developer is internal detail too*, applied
 * to a plan.
 *
 * **The plan node types are the most valuable fields and the milliseconds are
 * not.** Locally the planner under-estimates this read by **212×** (`rows=114`
 * against 24,142 actual), and whether the deployed planner answers `Index Scan`
 * or `Seq Scan` is the difference between ~3.5 minutes and tens of minutes for
 * the whole pass.
 *
 * ## And the caveat that travels with the tape counts, which is not optional
 *
 * The live bar writer started **2026-09-23**, so a 60-session window today
 * exposes only ~15 of ~62 sessions to two-tape writing. **Any inflation figure
 * read off `iexRows` is ~25% of steady state** and has to be recorded as a
 * dated, partially-exposed measurement — never as ADR 0035's +69% projection
 * confirmed or refuted.
 */

/** Why no measurement was taken. A fixed vocabulary; see the type. */
export type BaselineCostRefusal = "unknown-symbol" | "no-coverage";

/** The body of `GET /diagnostics/baseline-cost`. */
export interface BaselineCostDiagnostic {
  /** The security measured, or the one that was asked for and not found. */
  symbol: string;
  /** `1m`. Stated rather than implied, because the daily read is a different cost. */
  timeframe: string;
  /** `BASELINE_LOOKBACK_SESSIONS`, the depth the window was built at. */
  lookbackSessions: number;
  /**
   * Whether a measurement was taken at all.
   *
   * `false` on CI's store and on every developer's bare one, where
   * `bar_coverage` holds no `1m` row — which is the honest answer rather than a
   * row of zeroes that reads like a free query.
   */
  measured: boolean;
  /** Why not, or `null`. One of {@link BaselineCostRefusal}. */
  refusal: string | null;
  /** The session the window ends at, or `null`. */
  asOfSession: string | null;
  /** The read's bounds as ISO 8601 instants, or `null`. */
  windowStart: string | null;
  windowEnd: string | null;
  /** The top plan node's type, from Postgres's own vocabulary. */
  planNodeType: string | null;
  /** The innermost scan node's type — the field the cost question turns on. */
  scanNodeType: string | null;
  /** The planner's row estimate, and the rows it actually returned. */
  planRows: number | null;
  actualRows: number | null;
  /** `shared hit` and `shared read` blocks, cumulative over the plan. */
  sharedHitBlocks: number | null;
  sharedReadBlocks: number | null;
  /** `Actual Total Time` on the top node, in milliseconds. */
  elapsedMs: number | null;
  /**
   * The two tape counts over the same window, for the same security.
   *
   * `iexRows` is the figure no machine outside Azure can produce — every
   * developer's store holds **zero** of them. Read the caveat in this module's
   * header before quoting it.
   */
  sipRows: number | null;
  iexRows: number | null;
  /** When this was computed, as an ISO 8601 instant. */
  checkedAt: string;
}

/** Reads the cost. A function, so the route never learns there is a driver. */
export type BaselineCostReadFn = (
  symbol: string,
) => Promise<BaselineCostDiagnostic>;

/**
 * The default security.
 *
 * Any one of the 516 would do and the choice is deliberately boring: `NVDA` is
 * the symbol every worked example in this repository already uses, so an
 * operator comparing a figure against a task record is comparing the same
 * security without being told to.
 */
export const BASELINE_COST_DEFAULT_SYMBOL = "NVDA";

function unmeasured(
  symbol: string,
  lookbackSessions: number,
  refusal: BaselineCostRefusal,
): BaselineCostDiagnostic {
  return {
    symbol,
    timeframe: "1m",
    lookbackSessions,
    measured: false,
    refusal,
    asOfSession: null,
    windowStart: null,
    windowEnd: null,
    planNodeType: null,
    scanNodeType: null,
    planRows: null,
    actualRows: null,
    sharedHitBlocks: null,
    sharedReadBlocks: null,
    elapsedMs: null,
    sipRows: null,
    iexRows: null,
    checkedAt: new Date().toISOString(),
  };
}

export async function readBaselineCost(
  store: Pick<
    ReturnBaselineStore,
    "coveredEnd" | "explainWindowRead" | "subjectFor" | "tapeCounts"
  >,
  symbol: string,
): Promise<BaselineCostDiagnostic> {
  // A symbol that is not a well-formed ticker never reaches a query, and one
  // this store has never heard of is reported as such below rather than
  // measured as an empty plan. The parameters are bound either way — nothing
  // here is interpolated.
  if (!isTicker(symbol)) {
    return unmeasured(symbol, BASELINE_LOOKBACK_SESSIONS, "unknown-symbol");
  }

  // **Resolved to the row id here**, because every read the pass issues is
  // keyed on the id rather than on the symbol — `windowQuery`'s note carries the
  // `Sort` that measurement removed, and a diagnostic that reached the security
  // its own way would be measuring its own query rather than the pass's.
  const subject = await store.subjectFor(toTicker(symbol));
  if (subject === undefined) {
    return unmeasured(symbol, BASELINE_LOOKBACK_SESSIONS, "unknown-symbol");
  }

  const frontier = await store.coveredEnd();
  if (frontier === undefined) {
    return unmeasured(symbol, BASELINE_LOOKBACK_SESSIONS, "no-coverage");
  }

  const window = baselineWindowEndingAt(frontier);

  // **The `EXPLAIN` first and the counts second, sequentially.** They are
  // independent and `Promise.all` would be the reflex, exactly as
  // `/diagnostics/freshness` does it — but an `EXPLAIN (ANALYZE)` *runs* its
  // query, and a second statement executing concurrently on a second pooled
  // connection would be contending for the same buffers as the thing being
  // measured. The measurement is the point; two round trips are not.
  const plan = await store.explainWindowRead(subject, window.range);
  const tapes = await store.tapeCounts(subject, window.range);

  return {
    symbol: subject.symbol,
    timeframe: "1m",
    lookbackSessions: BASELINE_LOOKBACK_SESSIONS,
    measured: true,
    refusal: null,
    asOfSession: window.asOfSession,
    windowStart: window.range.start.toISOString(),
    windowEnd: window.range.end.toISOString(),
    planNodeType: plan.planNodeType,
    scanNodeType: plan.scanNodeType,
    planRows: plan.planRows,
    actualRows: plan.actualRows,
    sharedHitBlocks: plan.sharedHitBlocks,
    sharedReadBlocks: plan.sharedReadBlocks,
    elapsedMs: Math.round(plan.elapsedMs * 100) / 100,
    sipRows: tapes.sip,
    iexRows: tapes.iex,
    checkedAt: new Date().toISOString(),
  };
}
