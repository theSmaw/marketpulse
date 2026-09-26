import type { MarketFeed } from "@marketpulse/shared";

import type { MarketFeedView } from "./use-market-feed.js";

/**
 * **Is the chrome already naming exactly these feeds, correctly?** (Task
 * 4.2.7.)
 *
 * `PROVENANCE.md` §1.3's rule — *the note states what the chrome cannot, and
 * never repeats what the chrome can* — as a predicate, in **one** place. It
 * was `source-note.ts`'s private `namesFeeds` until the landing page grew a
 * note of its own, at which point the choice was two implementations of one
 * rule or one function two notes call. This repository has shipped the first
 * shape four times and named it the two-surfaces defect each time.
 *
 * ## Suppression requires a positive match
 *
 * The amendment `PROVENANCE.md` §1.3 took on 2026-09-14, and the direction of
 * it is what matters: a surface goes quiet **only** when the chrome is naming
 * *this* feed — `state: "configured"` and the same value — and speaks in every
 * other case. The default deployment is why. `MARKET_DATA_PROVIDER` defaults
 * to `none`, the chrome then reads `MARKET FEED — NOT CONFIGURED` and claims
 * no feed at all, and the store goes on serving numbers regardless; a note
 * that suppressed there would leave a screen of prices with no statement
 * anywhere of which venues are in them, which is `PRODUCT_SPEC.md` §35's *hide
 * data provenance* reached by the rule meant to prevent duplication.
 *
 * ## The two cases that are not a match
 *
 * - **More than one feed.** One page-level label is then wrong about part of
 *   the picture, which is the case invariant 6 exists for. The chrome cannot
 *   state a split and does not try.
 * - **`checking`.** The one state that suppresses *without* a match, and only
 *   to avoid a row that appears on the first frame and is taken away a few
 *   hundred milliseconds later: a flicker is a worse reading than a fact
 *   arriving with everything else on the page.
 *
 * **An empty list answers `true`**, which is not a suppression: there is no
 * feed to name, so there is nothing for either surface to say. Callers whose
 * clause has its own data rule — ADR 0029 — check that first and never reach
 * here; this answer exists so that the predicate is total rather than
 * partial.
 */
export function chromeAlreadyNames(
  feeds: readonly MarketFeed[],
  view: MarketFeedView,
): boolean {
  if (feeds.length === 0) return true;
  if (feeds.length > 1) return false;
  if (view.state === "checking") return true;

  return view.state === "configured" && feeds[0] === view.feed;
}
