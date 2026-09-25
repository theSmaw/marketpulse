// **A drawn series that keeps growing** (Task 3.9.2).
//
// Story 3.5 settled that the backend holds only the **latest observation per
// security** — 440 B each, and 518 × 390 minute bars declined at 55.6 MB — so
// there is no series anywhere in the process for a chart to ask for. The
// browser assembles today from two halves: what `GET /market-data/bars`
// answered on load, which since Story 3.8 already reaches the last minute the
// live writer stored, and what has arrived over the socket **since the page
// opened**.
//
// This module is the second half, and it is deliberately a **pure function**
// rather than a hook: the hook wires it, this decides it. Every rule below is
// a rule about data and is testable without a browser.
//
// ## The rule that matters: replace in place, never append
//
// `toBarSeries` refuses bars that are not strictly ascending by instant and
// **throws a `RangeError`**. Task 3.8.4 paid for learning what that costs on
// the other side of the wire: a window holding two rows for one minute was a
// **500 on a page load**, not a chart drawn from the less good row.
//
// The socket delivers a bar for a minute and then — measured, §7.8 — a
// **corrected** one about thirty seconds later, on 0.1062% of bars, 37.6% of
// which move the close (0.064% / 35.3% over the spike's window; §14.1's
// 2026-09-24 amendment carries both). So a merge that appends produces two entries for one
// instant and the next render throws. It is a crash that cannot happen in a
// quick test and cannot be avoided in a long sitting: it needs a page open
// across a correction, which is minutes of ordinary use.
//
// **There is no partial bar and this module does not handle one.** Task 3.9.1
// established it from both ends: the vendor sends a bar for minute *M* at the
// end of *M* (`LIVE-DATA.md` §7), and `live-bar-writer.ts`'s own rule says a
// bar that arrives is a finished minute. Every observation here is complete.
//
// ## Three things that are NOT this module's to decide
//
//   * **What the new bar looks like.** Nothing here marks it, distinguishes it
//     or draws a seam. Task 3.9.3 argues that in front of this working.
//   * **What an absent minute looks like.** The axis is session-ordinal and
//     closes gaps up (`CHARTING.md` §3): measured on production, `ERIE` drew
//     131 bars and `NVDA` 390 over one session, both the full width of the
//     frame. A chart extending across a four-minute outage therefore looks
//     exactly like one extending across four quiet minutes — and on IEX, quiet
//     is the common case at 65.1% median coverage. **That distinction is Story
//     3.10's**, which owns the difference between *did not trade* and *we were
//     not told*. This module must not invent one.
//   * **Whether the window moves.** A live bar outside the requested window is
//     dropped rather than drawn. The window is what the reader asked for, and a
//     series that quietly grew past it would make `?sessions=5` mean something
//     that changes while you look at it.

import {
  toBarSeries,
  type Bar,
  type BarSource,
  type MarketFeed,
  type SeriesProvenance,
  type TimeRange,
} from "@marketpulse/shared";

import type { PopulatedBarSeries } from "./bar-series-view.js";

/** How long a bar covers, by timeframe. A daily bar is never live-extended. */
const MINUTE_MS = 60_000;

/**
 * Fold the live observations this page has seen into the answer it was served.
 *
 * Returns the **same series object** when nothing changes, which is what keeps
 * the chart's memo boundaries working: §28's word is *routine*, and a chart
 * that re-derived its geometry on every keepalive would be the universe
 * table's 2026-09-22 defect drawn as a line instead of as 518 rows.
 */
export function withLiveBars(
  series: PopulatedBarSeries,
  live: readonly Bar[],
  /**
   * The tape the live observations came from — `LiveFeedView.feed` (Task
   * 3.10.8).
   *
   * `null` when the deployment reports no feed, which is also when no live
   * bar can arrive; a bar in hand with no tape to name extends the last
   * stretch, because a stretch this page cannot name is worse than one it
   * merely has not split.
   */
  liveFeed: MarketFeed | null = null,
): PopulatedBarSeries {
  if (live.length === 0) return series;

  const requested = series.coverage.requested;
  const inWindow = live.filter(
    (bar) =>
      bar.startsAt.getTime() >= requested.start.getTime() &&
      bar.startsAt.getTime() < requested.end.getTime(),
  );
  if (inWindow.length === 0) return series;

  // **Last wins, by instant.** A `Map` keyed on the epoch rather than on the
  // `Date`, because two `Date`s for one instant are different keys and that is
  // precisely the bug this rule exists to prevent.
  const byInstant = new Map<number, Bar>();
  for (const bar of series.bars) byInstant.set(bar.startsAt.getTime(), bar);

  let added = 0;
  let changed = false;
  for (const bar of inWindow) {
    const at = bar.startsAt.getTime();
    const held = byInstant.get(at);
    if (held === undefined) {
      added += 1;
      changed = true;
    } else if (!sameBar(held, bar)) {
      changed = true;
    }
    byInstant.set(at, bar);
  }

  if (!changed) return series;

  const bars = [...byInstant.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, bar]) => bar);

  const lastAt = bars[bars.length - 1]?.startsAt.getTime() ?? 0;
  const interval = series.timeframe === "1m" ? MINUTE_MS : 0;

  return toBarSeries({
    symbol: series.symbol,
    timeframe: series.timeframe,
    bars,
    provenance: withLiveBarCount(series.provenance, added, liveFeed),
    coverage: {
      requested,
      covered: coveredThrough(
        series.coverage.covered,
        lastAt + interval,
        requested,
      ),
    },
  }) as PopulatedBarSeries;
}

/** Whether two observations of one minute say the same thing. */
function sameBar(a: Bar, b: Bar): boolean {
  return (
    a.open === b.open &&
    a.high === b.high &&
    a.low === b.low &&
    a.close === b.close &&
    a.volume === b.volume
  );
}

/**
 * Extend the covered window to hold a bar, without outgrowing the request.
 *
 * `toBarSeries` checks both ends of this: every bar must start inside
 * `covered`, and `covered` must lie inside `requested`. Both are real defects
 * rather than formalities — the first is a chart drawing a point outside the
 * window it claims, the second is the provider's window reaching a reader.
 */
function coveredThrough(
  covered: TimeRange | null,
  through: number,
  requested: TimeRange,
): TimeRange {
  const end = Math.min(
    Math.max(through, covered?.end.getTime() ?? through),
    requested.end.getTime(),
  );
  const start = covered?.start ?? requested.start;
  return { start, end: new Date(end) } as TimeRange;
}

/**
 * Count the arrived bars against the stretch they belong to.
 *
 * `toBarSeries` asserts the sources' `barCount`s sum to the bars the series
 * holds, so adding a bar without saying where it came from **throws** — which
 * is the check doing exactly what it was written for. What it forces is a
 * question this module cannot dodge: which source do these bars belong to?
 *
 * **The one whose TAPE they came from — a new stretch when that differs from
 * the last, and an extension when it does not** (corrected 2026-09-24 by Task
 * 3.10.8).
 *
 * The original rule here was *always extend the last one*, argued from the
 * stream and the history sharing a **vendor**: `MARKET_DATA_PROVIDER` selects
 * one provider and both halves come from it, so *the tape does not change at
 * the join and a second stretch would be a seam with no market event behind
 * it*. **The premise is false on this product's own plan.** Alpaca's free
 * tier is asymmetric — stored bars are consolidated **SIP** and the live
 * stream is **IEX** (`PRODUCT_SPEC.md` §7.1) — so a vendor that does not
 * change says nothing about a tape that does, and the tail was being counted
 * under `All US exchanges`.
 *
 * That is `CLAUDE.md`'s **invariant 6** — _Epic 3's live feed must not inherit
 * Epic 2's word_ — in the ledger rather than in the chrome, where Task 3.10.6
 * repaired the same defect a fortnight of tasks earlier. The canvas has drawn
 * the correct shape since Task 2.14.4 (`Provenance and the empty answers`
 * §10, *Shape B*) and nothing could produce it from a live edge.
 *
 * **It still extends where the tape really is the same**, which since Story
 * 3.8 is the commoner case: a window whose last session is today is served
 * with an `iex` stretch already, and a second one would be a boundary with no
 * market event behind it — exactly what the original comment feared, now
 * asked as a question about data rather than assumed.
 *
 * **`retrievedAt` is NOT re-stamped**, which is `TAPE.md` §8's rule applied to
 * the browser: a stretch reports the **oldest** retrieval in it, because that
 * is its honest staleness. Stamping it now would make every series look as
 * fresh as its newest bar, which is the trap Task 2.3.5 already found once. A
 * **new** stretch takes the stretch it follows, for the same reason: the live
 * tail's bars were observed now, but the note's `Retrieved` clause is about
 * when this product asked, and a socket is not an ask.
 *
 * **Reversal trigger, as a condition**: the first deployment whose stored and
 * live tapes are the same, on which this split stops being visible — the same
 * condition `AppFooter/venue.ts` records, because it is the same fact.
 */
function withLiveBarCount(
  provenance: SeriesProvenance,
  added: number,
  liveFeed: MarketFeed | null,
): SeriesProvenance {
  if (added === 0) return provenance;

  const sources = provenance.sources;
  const last = sources[sources.length - 1];
  if (last === undefined) return provenance;

  const opensAStretch = liveFeed !== null && liveFeed !== last.feed;

  const next: readonly BarSource[] = opensAStretch
    ? [...sources, { ...last, feed: liveFeed, barCount: added }]
    : [...sources.slice(0, -1), { ...last, barCount: last.barCount + added }];

  return {
    adjustment: provenance.adjustment,
    sources: next as unknown as readonly [BarSource, ...BarSource[]],
  } as SeriesProvenance;
}
