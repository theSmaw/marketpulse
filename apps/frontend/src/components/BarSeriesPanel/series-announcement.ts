import type { SecurityStatus } from "@marketpulse/shared";

import type { BarSeriesView } from "../../market/index.js";
import {
  changePercent,
  directionOf,
  formatChangePercent,
  formatPrice,
  formatCount,
  formatMarketInstant,
  formatMarketRange,
  seriesPrices,
} from "./series-facts.js";

// What this panel says to a screen reader, as one sentence per state (Task
// 2.10.8).
//
// Separate from the component for the reason `series-facts.ts` is: it is a pure
// function of the state, every clause of it is a decision somebody has to be
// able to argue with, and a test that reads it as text is the only instrument
// that can. The component holds the element; this holds the words.
//
// ## The three rules inherited from `UniverseTable`'s `Announcement`
//
// Task 2.4.5 settled the mechanism and none of it is re-derived here:
//
//   1. **A persistent `role="status"`, rendered in every state and never
//      unmounted.** A live region added at the same moment as its content is
//      not reliably announced, and one that is *removed* announces nothing at
//      all — which is the defect that task reproduced in a browser.
//   2. **`status` and never `alert`.** `role="alert"` is `ErrorFallback`'s, and
//      the browser suite asserts that distinction on every route. §36 also makes
//      an unavailable service a product state rather than an emergency.
//   3. **Silent on arrival.** Arriving at a page is not a change, so a
//      `loading` sentence would never be heard as an announcement and would only
//      be a second copy of the visible line.
//
// ## What is new here, and it is the whole reason this file exists
//
// **This surface's content changes more than once.** The universe table fills
// once and stops; this panel changes subject on a navigation, and will change
// window from Story 2.13. Two questions follow that a page filling once could
// not raise.
//
// ### One: the page now has two live regions, and this is the second
//
// `/securities` fills two things over the network — the tracked universe and
// this panel — and the table already owned a `role="status"`. Two polite regions
// updated in the same moment are queued by a screen reader in an order neither
// component controls, so landing on the page announces two things about two
// different subjects with nothing to say which is which.
//
// **The decision is two regions, one per subject, and every sentence names its
// own subject.** That is what makes the order stop mattering: *"NVDA: holding
// 1,438 bars…"* and *"The tracked universe loaded. 518 securities…"* are each
// complete out of context, in either order. The alternative — one region for the
// page — was rejected because it would make one component the owner of another's
// sentences, and the two states are produced by two independent hooks with no
// moment at which both are settled.
//
// The design brief's other proposal, **two regions inside this panel** (a
// lifecycle one and a data one), is rejected for the same reason the page-level
// problem exists: two polite regions about *one* subject can be queued against
// each other in an order neither controls, and a listener hearing *"NVDA:
// refreshing"* after *"NVDA: 1,438 bars"* cannot tell which is current. One
// region per subject, and the lifecycle fact is a **clause** on the subject's
// own sentence rather than a second voice.
//
// The rule the next asynchronous surface inherits: **a live region per subject,
// and its sentences name it.** Story 2.11's search inherits one more thing —
// see {@link announceSeries}'s note on rate.
//
// ### Two: a state can be re-entered, and a region that repeats itself is silent
//
// Measured on the universe page's retry: **a live region whose text does not
// change announces nothing.** So any two consecutive states producing the same
// sentence are inaudible, and the case nobody pictures is the one that matters —
// a refetch that lands back on the answer it started from, which is the *common*
// case for a closed session's bars.
//
// **The stale clause is what makes that audible, and it is why it is a clause
// rather than a separate sentence.** The sequence is `answer` → `answer` +
// *"Showing a held answer while a newer one is read."* → `answer`. The region
// passes through a different text and back out of it, so the return is heard
// even when every number in it is identical. Nothing had to be invented for
// this: the clause is true, it is the same fact the mark on screen carries, and
// it happens to be the in-between sentence the mechanism needs.
//
// This is a deliberate departure from the design's *"settled unchanged →
// silent"*, and only for the **spoken** channel. The visible settle flash *is*
// suppressed on an unchanged answer, because a flash on numbers that did not
// move is a claim about the numbers. A listener has no flash: silence would
// leave them unable to tell *nothing changed* from *nothing happened*, and both
// transitions here follow something the user did — a navigation or a retry.

/**
 * One sentence, written to be heard, saying what this panel currently knows.
 *
 * Every sentence begins with the symbol, which is the page-level decision above
 * made concrete. It is deliberately **not** the visible copy hoisted up here:
 * visible text is written to be scanned and an announcement to be heard once,
 * out of context — `PriceChange` is the precedent and `UniverseTable` carries
 * the longer argument.
 *
 * **A note on rate, for Story 2.11.** Nothing today changes this text without a
 * user having navigated or pressed something. A search field that re-requested
 * on every keystroke would drive this region at typing speed, which is actively
 * hostile; whatever ships there owes either a debounce upstream of the request
 * or a decision to leave the region silent while a query is being typed.
 */
export function announceSeries(view: BarSeriesView, symbol: string): string {
  const sentence = describe(view, symbol);
  return sentence === "" ? "" : `${symbol}: ${sentence}`;
}

/** Everything after the subject. */
function describe(view: BarSeriesView, symbol: string): string {
  switch (view.state) {
    case "loading":
      // Silent, and the same asymmetry the universe table records: there is no
      // transition *into* `loading` to announce. The panel starts here and a
      // key change returns to it, but in both cases the region is either being
      // created or is moving to a subject the next sentence will name.
      return "";

    case "loaded": {
      const prices = seriesPrices(view.series);
      return join([
        `holding all ${formatCount(view.series.bars.length)} bars of the window asked for.`,
        lastClose(prices.close, changePercent(prices)),
        untracked(view.securityStatus),
        stale(view.stale),
      ]);
    }

    case "partial": {
      const prices = seriesPrices(view.series);
      const { requested, covered } = view.series.coverage;
      return join([
        `holding ${formatCount(view.series.bars.length)} bars, through ${formatMarketInstant(covered.end)}, of a window running to ${formatMarketInstant(requested.end)}.`,
        lastClose(prices.close, changePercent(prices)),
        untracked(view.securityStatus),
        stale(view.stale),
      ]);
    }

    case "empty":
      return join([
        `no bars are stored for the window asked for, ${formatMarketRange(view.series.coverage.requested)}.`,
        untracked(view.securityStatus),
        stale(view.stale),
      ]);

    case "refused":
      // The server's sentence, verbatim, for the same reason the screen renders
      // it verbatim: the numbers in it are the server's own arithmetic. It
      // already names the symbol in the unknown-security case, which is a
      // harmless second mention rather than a reason to re-word it.
      return `that request could not be answered. ${view.message}`;

    case "failed": {
      // **A retry in flight is announced**, which is what makes the control
      // audible: pressing it changes nothing else a listener can hear. It is
      // also the in-between sentence that makes a second identical failure
      // heard at all — the same mechanism the stale clause uses above, and the
      // one `UniverseTable` shipped first.
      if (view.retrying) return `trying ${symbol} again.`;

      const headline =
        view.failure === "unreachable"
          ? "no response from the service."
          : "the series could not be read.";

      // **The correlation id is not spoken**, and this is a deliberate
      // departure from the design brief's *"always announces correlation ID"*.
      // It is a 36-character UUID: read aloud it is thirty seconds of hex a
      // listener cannot hold or transcribe, and it is the same judgement the
      // universe table made about a magnitude — `47.7M` spoken is worse than
      // not said. What a listener can act on is that a reference exists and
      // where it is; the id itself is on screen, selectable, and is what gets
      // pasted into a support conversation.
      const prospect = view.retryable
        ? "This is usually temporary. Try again in a moment."
        : "Asking again will not change this answer.";

      return join([
        headline,
        prospect,
        view.requestId === null
          ? undefined
          : "A reference for this failure is shown beside it.",
      ]);
    }
  }
}

/**
 * The security is one we no longer follow.
 *
 * Spoken on **every** answer that carries the status, not only where the badge
 * happens to be looked at, because it changes what the numbers mean: they are a
 * record rather than something being kept up to date.
 */
function untracked(status: SecurityStatus): string | undefined {
  return status === "untracked"
    ? "MarketPulse no longer tracks this security; these bars are what was stored while it did."
    : undefined;
}

/**
 * A newer answer is on its way.
 *
 * See the header: this clause is doing two jobs at once, and the second is
 * mechanical rather than editorial. It must not imply the figures are wrong —
 * they are correct and they are one request old — which is why it says *held*
 * rather than *out of date*.
 */
function stale(isStale: boolean): string | undefined {
  return isStale
    ? "Showing a held answer while a newer one is read."
    : undefined;
}

/**
 * The headline figure, for a listener who is not looking at it.
 *
 * The direction is a **word** — the visible figure carries it as a glyph and a
 * sign, and neither survives being read aloud: `−0.75%` is spoken as
 * "0.75%" by some screen readers and as "dash 0.75 percent" by others. So the
 * word is the announcement's channel for the one thing colour is forbidden from
 * carrying alone, and it comes from `directionOf` rather than from the sign, so
 * a move that rounds to nothing is "unchanged" here and on screen alike.
 */
function lastClose(close: number, percent: number | null): string {
  if (percent === null) return `Last close ${formatPrice(close)}.`;

  const direction = directionOf(percent);
  const figure = formatChangePercent(percent).replace(/^[+−]/u, "");

  if (direction === "unchanged")
    return `Last close ${formatPrice(close)}, unchanged.`;

  return `Last close ${formatPrice(close)}, ${direction === "positive" ? "up" : "down"} ${figure}.`;
}

/** The clauses that are present, in one sentence, single-spaced. */
function join(clauses: readonly (string | undefined)[]): string {
  return clauses.filter((clause) => clause !== undefined).join(" ");
}
