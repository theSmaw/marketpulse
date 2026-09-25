import { useMemo, useState } from "react";

import type { Bar, MarketFeed } from "@marketpulse/shared";

import type { BarSeriesView } from "./bar-series-view.js";
import { withLiveBars } from "./live-series.js";

// **The accumulation `withLiveBars` cannot do for itself** (Task 3.9.2).
//
// `LiveFeedView.observations` holds the **latest** bar per security and
// nothing else — that is Story 3.5's decision and the reason the backend is
// 222.8 KiB rather than 55.6 MB. A chart wants a *series*, so somebody has to
// remember the ones that came before, and in this architecture that somebody
// is the page.
//
// ## Why a Map keyed on the instant rather than an array
//
// The same reason `withLiveBars` uses one: a correction arrives ~30 s after
// its bar (§7.8) and carries **the minute it corrects**, so the natural key is
// the instant. Keeping an array and appending would grow a second copy of a
// minute the chart already holds, and the throw would land in `toBarSeries` on
// the next render rather than here.
//
// ## What resets it, and what deliberately does not
//
// **The security or the window changing resets it**, because the bars
// accumulated for NVDA's five sessions are not part of AMD's one. That is the
// same rule `held-series.ts` applies one layer up, for the same reason: a held
// answer under the wrong heading is the thing this layer is most careful
// about.
//
// **A refetch does not.** The window control refetches, the cache answers, a
// newer answer replaces the old one — and the minutes this page watched arrive
// in none of them, because the store is behind the socket by design. Clearing
// on every answer would make the chart flick backwards each time a reader
// pressed a window and then catch up a minute later.

/** What the page has watched arrive, for one request. */
interface Watched {
  /** The request these bars belong to: symbol, timeframe and the window. */
  readonly key: string;
  readonly bars: ReadonlyMap<number, Bar>;
}

const EMPTY: Watched = { key: "", bars: new Map() };

/**
 * Identity of the request a series answers.
 *
 * Built from the series rather than from the request object because that is
 * what is in hand here, and because the two cannot disagree: a view's series
 * carries the window it was asked for.
 */
function requestKey(view: BarSeriesView): string {
  if (
    view.state === "loading" ||
    view.state === "refused" ||
    view.state === "failed"
  ) {
    return "";
  }
  const { symbol, timeframe, coverage } = view.series;
  return `${symbol}:${timeframe}:${String(coverage.requested.start.getTime())}-${String(coverage.requested.end.getTime())}`;
}

/**
 * The view, with every live bar this page has watched arrive folded in.
 *
 * Returns the **same view object** when there is nothing to add, so a page with
 * no feed, a shut market or a security the feed has not mentioned pays nothing
 * and re-renders nothing.
 */
export function useLiveSeries(
  view: BarSeriesView,
  live: Bar | undefined,
  /**
   * The tape the socket's bars came from (Task 3.10.8).
   *
   * Passed through rather than read here, for the reason everything else in
   * this module is: the decision is `withLiveBars`', which is pure and
   * testable without a browser. What this adds is that the tail's bars stop
   * being counted under the **stored** tape's name — invariant 6, in the
   * ledger.
   */
  liveFeed: MarketFeed | null = null,
): BarSeriesView {
  const key = requestKey(view);
  const [watched, setWatched] = useState<Watched>(EMPTY);

  // **Adjusted during render rather than in an effect**, which is React's own
  // documented shape for *state derived from a prop that has changed* and is
  // what the compiler's `set-state-in-effect` rule points at when it refuses
  // the effect version. The draft that used an effect was rejected, correctly:
  // an effect here renders once with the stale accumulation and again with the
  // new one, so the chart would be one frame behind the price beside it.
  const [seen, setSeen] = useState<Bar | undefined>(undefined);

  if (live !== seen) {
    setSeen(live);
    if (live !== undefined && key !== "") {
      setWatched((held) => {
        const bars = held.key === key ? held.bars : new Map<number, Bar>();
        const at = live.startsAt.getTime();
        if (bars.get(at) === live) {
          return held.key === key ? held : { key, bars };
        }

        const next = new Map(bars);
        next.set(at, live);
        return { key, bars: next };
      });
    }
  }

  return useMemo(() => {
    if (watched.key !== key || watched.bars.size === 0) return view;
    if (view.state !== "loaded" && view.state !== "partial") return view;

    const series = withLiveBars(
      view.series,
      [...watched.bars.values()],
      liveFeed,
    );
    return series === view.series ? view : { ...view, series };
  }, [view, watched, key, liveFeed]);
}
