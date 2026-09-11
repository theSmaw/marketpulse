import type { Bar, TimeRange } from "@marketpulse/shared";
import { marketWallClockAt } from "@marketpulse/shared";

import type { PopulatedBarSeries } from "../../market/index.js";

// The arithmetic and the formatting behind the panel, with no JSX in it (Task
// 2.10.7).
//
// `UniverseTable/last-close.ts` and `UniverseTable/coverage.ts` are the
// precedent and the reason: a component that computes is a component whose
// arithmetic can only be tested by rendering it, and every figure here is one a
// reader is entitled to assume nobody invented.
//
// ## What this may and may not do
//
// **It reads bars and it never fetches, resolves a window, or reads a clock.**
// There is no `new Date()` in this file and there must not be one: every
// instant here comes from the series, which came from the server, which
// resolved it against the market calendar. A browser in Singapore and a browser
// in New York must render the same panel for the same series, and the way that
// is guaranteed is that neither of them has an opinion.
//
// **Timestamps go through `packages/shared/src/market-time.ts`**, which is the
// one module in this workspace allowed to convert a UTC instant to market time
// and is enforced by lint. A bar stamped `2026-09-04T13:30:00Z` is the 09:30
// bar, and rendering it in the reader's own zone is the same class of defect as
// resolving a window from the reader's clock — plausible, shifted, and visible
// to nobody who is not looking for it.

/**
 * The four prices a session is usually summarised by, over the bars we hold.
 *
 * **Over `covered`, never over `requested`** — these describe the data, and a
 * high computed over a window we hold half of is a high for the half we hold.
 * The panel says which window that is, immediately beside these, which is what
 * makes the pair honest rather than the number alone.
 */
export interface SeriesPrices {
  /** The first held bar's open. */
  readonly open: number;
  /** The highest high across the held bars. */
  readonly high: number;
  /** The lowest low across the held bars. */
  readonly low: number;
  /** The last held bar's close. */
  readonly close: number;
}

/**
 * Reduce the held bars to four prices.
 *
 * A single pass with `min`/`max` rather than `Math.min(...bars.map(…))`,
 * because the spread form applies the array as **arguments** and a 10,000-bar
 * series — the cap this endpoint allows — is an argument list long enough to
 * throw `RangeError: Maximum call stack size exceeded` on some engines. That is
 * a crash whose frequency depends on the window the user chose, which is the
 * worst kind.
 *
 * **`min` and `max` rather than a sum, and that is the whole reason this is
 * allowed in JavaScript at all.** `CLAUDE.md`'s rule is that money is
 * aggregated in SQL rather than in JavaScript, because float addition is not
 * associative and a sum can disagree with itself between two renders when a
 * query plan changes the order. Comparison is order-independent, so a high and
 * a low are the same number whichever way the array is walked. The day this
 * panel wants an average or a total, that is a query rather than a loop.
 */
export function seriesPrices(series: PopulatedBarSeries): SeriesPrices {
  const [first, ...rest] = series.bars;

  let high = first.high;
  let low = first.low;
  let close = first.close;

  for (const bar of rest) {
    if (bar.high > high) high = bar.high;
    if (bar.low < low) low = bar.low;
    close = bar.close;
  }

  return { open: first.open, high, low, close };
}

/**
 * The move across the bars we hold, as a percentage of where it opened.
 *
 * `null` when the open is zero, which is not a price any equity has and is
 * therefore a corrupt bar rather than a division to attempt. The panel renders
 * nothing rather than `Infinity%`.
 */
export function changePercent(prices: SeriesPrices): number | null {
  if (prices.open === 0) return null;
  return ((prices.close - prices.open) / prices.open) * 100;
}

/**
 * One instant, in market time, as `2026-09-04 09:30:00 EDT`.
 *
 * The zone abbreviation is **not** decoration: without it this is a bare
 * timestamp that a reader in another country will assume is theirs. It comes
 * off `marketWallClockAt`, so it says `EDT` in summer and `EST` in winter
 * without this file knowing that either exists.
 */
export function formatMarketInstant(instant: Date): string {
  const wall = marketWallClockAt(instant);
  return (
    `${wall.date} ${pad(wall.hour)}:${pad(wall.minute)}:${pad(wall.second)} ` +
    wall.offset.abbreviation
  );
}

/**
 * A half-open range, as two market instants.
 *
 * **The end is rendered as it is stored — exclusive — and not decremented to
 * look inclusive.** A window of `[13:30, 20:00)` is the whole session and its
 * end is 20:00; showing 19:59:59 to avoid explaining a half-open interval would
 * be inventing a second vocabulary for the one the API and the store both
 * already use, and it would make two adjacent windows look like they overlap.
 */
export function formatMarketRange(range: TimeRange): string {
  return `${formatMarketInstant(range.start)} → ${formatMarketInstant(range.end)}`;
}

/** A count with thousands separators, so 10,000 reads as a number. */
export function formatCount(count: number): string {
  return count.toLocaleString("en-US");
}

/**
 * The market timestamps of the first and last bars we hold.
 *
 * Off the **bars** rather than off `covered`, and the two are not the same
 * question. `covered` is the window the store claims; the first bar's
 * `startsAt` is where the data actually begins inside it. They usually agree
 * and the interesting case is when they do not — a window opening on a session
 * that had no prints in its first minutes — and a panel reading the claim would
 * report a bar that is not there.
 */
export function barSpan(series: PopulatedBarSeries): {
  readonly first: Bar;
  readonly last: Bar;
} {
  const [first] = series.bars;
  const last = series.bars[series.bars.length - 1] ?? first;
  return { first, last };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// **The third copy moved, on 2026-09-11.** The note that stood here named the
// condition — *the third consumer that formats a price or a percentage* — and
// Task 2.12.3's value axis was it: every gridline on the price chart is a price.
// `PRICE_DECIMALS`, `MINUS`, `formatPrice`, `formatChangePercent` and
// `directionOf` are now in `market/price-format.ts`, which is where the note
// said they would go and for the reason it gave: they are market vocabulary
// rather than component furniture.
//
// **`changePercent` did not move, and that is the same judgement made again.**
// The note called the two copies near-twins, and the formatting halves were.
// This one computes a move across the bars of one window from a `SeriesPrices`;
// `last-close.ts`'s computes a move between two sessions' closes from a
// `SecurityLastClose`. One function over both would take a parameter type that
// is the union of two unrelated records, which is a module named after a shape
// rather than a meaning — the thing the note was avoiding in the first place.
//
// `pad` is still a twin of `MarketClock`'s and is still waiting for a third.
