import type { Bar, TimeRange } from "@marketpulse/shared";
import { marketWallClockAt } from "@marketpulse/shared";

import type { PopulatedBarSeries } from "../../market/index.js";
import type { PriceDirection } from "../PriceChange/PriceChange.js";

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

/** The two decimals every price in this product is shown to. */
const PRICE_DECIMALS = 2;

/**
 * U+2212 MINUS SIGN, not a hyphen.
 *
 * `last-close.ts` carries the same constant for the same reason: a hyphen is
 * narrower than a digit in a tabular font and breaks the column that
 * `font-variant-numeric: tabular-nums` exists to hold. **This is the second
 * copy**, and the third is where this repository extracts — see the note at the
 * bottom of this file, which says what would move and where.
 */
const MINUS = "−";

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

/** A price, to the product's two decimals. */
export function formatPrice(price: number): string {
  return price.toFixed(PRICE_DECIMALS);
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
 * That move as a signed figure.
 *
 * The sign is on the number and the direction is a separate value, because
 * `PriceChange` takes both — the glyph and the sign carry the direction and the
 * colour is the redundancy, since the price palette differs by 1.05:1 in
 * greyscale and hue is the entire distinction.
 */
export function formatChangePercent(percent: number): string {
  const figure = `${Math.abs(percent).toFixed(PRICE_DECIMALS)}%`;
  if (directionOf(percent) === "unchanged") return figure;
  return `${percent > 0 ? "+" : MINUS}${figure}`;
}

/**
 * Which way, decided on the **rounded** figure.
 *
 * A move of +0.001% renders as `0.00%`, and calling that "up" puts an upward
 * arrow beside a figure that says nothing moved. The rounding and the direction
 * have to agree or the panel contradicts itself in two channels at once.
 */
export function directionOf(percent: number): PriceDirection {
  const rounded = Number(percent.toFixed(PRICE_DECIMALS));
  if (rounded > 0) return "positive";
  if (rounded < 0) return "negative";
  return "unchanged";
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

// **The third copy is where this moves**, and this file holds two of them
// already: `PRICE_DECIMALS`, `MINUS`, `formatPrice`, `changePercent`,
// `formatChangePercent` and `directionOf` are near-twins of
// `UniverseTable/last-close.ts`'s, and `pad` is a twin of `MarketClock`'s.
//
// They are deliberately **not** shared yet, and the reason is which way the
// coupling would run rather than laziness. `last-close.ts` computes a change
// between two *sessions'* closes from a `SecurityLastClose`; this computes a
// move across the *bars of one window*. The formatting is identical today and
// the subjects are not, so extracting now would produce a module named after a
// shape rather than a meaning — and this repository has a rule about that: the
// visually-hidden idiom moved at its third copy, and `Marker` took the geometry
// off three components that were each remembering it.
//
// So the trigger is a condition rather than a story: **the third consumer that
// formats a price or a percentage.** What moves then is these six values into
// `src/market/` — they are market vocabulary, not component furniture — leaving
// `seriesPrices`, `barSpan` and the two instant formatters here, because those
// genuinely are about this panel's subject.
