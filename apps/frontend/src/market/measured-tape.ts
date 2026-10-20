import { MARKET_FEED_DESCRIPTIONS } from "@marketpulse/shared";

import type { MarketFeed } from "@marketpulse/shared";

// **The tape line's one grammar** (Task 5.5.4) — `Measured on IEX`, and
// `Measured on IEX · baseline on All US exchanges` where a comparison was
// drawn.
//
// It was `tapeOf`, private to `five-minute-return.ts`, until the volume band
// needed the same sentence about a different pair of feeds. Two copies of it
// would be two answers to *how does this product name the tapes behind a
// comparison* — and the second copy is the one that would have been written
// with the venue spelled rather than read, which
// `one-home-for-the-feed-words` refuses by name.
//
// **Both bands of `Abnormal-move indicators` draw one of these, and they are
// deliberately different sentences**: the return's percentile is a
// consolidated-tape baseline against a single-venue numerator, and the
// volume's baseline is the **same** venue as its numerator (Gate 1 decision
// 1). A reader comparing the two lines is reading the difference between the
// two factors, which invariant 6 wants displayed rather than implied.

/**
 * **Which tape the figure was measured on** — invariant 6, at the region
 * rather than at the screen.
 *
 * Every bar in the backend's trailing window is `iex` by construction (there
 * is no store fill), while the chart a few centimetres away says `All US
 * exchanges` about its stored bars — so a region that said nothing would
 * inherit a coverage claim the plan does not have for this figure.
 *
 * **The words come from `MARKET_FEED_DESCRIPTIONS`** and not from this file:
 * `one-home-for-the-feed-words` is the check, and the reason behind it is that
 * a renderer with its own spelling of a venue is a coverage claim no
 * vocabulary decided. The **sentence** is deliberately not drawn — the source
 * note at the foot of this screen carries the explanation, and repeating it
 * here would be the duplicate `BarSeriesPanel` shipped for two years.
 *
 * Two different tapes across the pair cannot happen today and are spelled
 * anyway, in endpoint order, because a return measured across a stitch is a
 * thing a reader is owed rather than a thing to assume away.
 */
export function measuredTape(
  feeds: readonly MarketFeed[],
  baseline?: MarketFeed,
): string {
  const named: string[] = [];
  for (const feed of feeds) {
    const label = MARKET_FEED_DESCRIPTIONS[feed].label;
    if (!named.includes(label)) named.push(label);
  }

  const measured = `Measured on ${named.join(" and ")}`;

  // **One tape per comparison is not achievable, and the screen must not imply
  // it is** (Task 5.3.3, Story 5.3's Gate 1 false premise 5).
  //
  // The numerator is `iex`-over-`iex` by construction — there is no store fill
  // in the trailing window — and the baseline window is `feed = 'sip'` only,
  // because minutes in progress and extended hours belong to the live tape
  // permanently and a `distinct on` baseline would admit them in whatever
  // proportion the hour supplied. So **every comparison this story ships is a
  // consolidated-tape baseline against a single-venue numerator**, and AC 5 is
  // satisfiable only as *the baseline window is one tape*.
  //
  // Invariant 6 then has something to say: provenance is **displayed, never
  // implied**, and a percentile drawn beside `Measured on IEX` alone would
  // invite a reader to assume the two numbers came from the same place. One
  // clause, in the register this region already set — the venue's own words
  // from `MARKET_FEED_DESCRIPTIONS` (`one-home-for-the-feed-words`), no
  // sentence, no terminal stop, and the explanation left to the source note at
  // the foot of the screen.
  //
  // **It draws only where a percentile does**, which is ADR 0029's defer rule
  // rather than tidiness: on most securities, on a cold replica and on every
  // gated run there is no baseline, and a clause naming the tape of a
  // comparison that did not happen is the fully-formed provenance record about
  // nothing that rule exists for.
  if (baseline === undefined) return measured;

  return `${measured} · baseline on ${MARKET_FEED_DESCRIPTIONS[baseline].label}`;
}
