import type { SecuritiesView } from "../../use-securities.js";

// Which empty answer this is, derived from a request the page already makes
// (Task 2.14.6).
//
// `PROVENANCE.md` §6 settles the whole of this file and it is worth restating
// the shape, because the interesting part is what is **absent**: there is no
// new field on the bars wire, no seventh member of `BarSeriesView`, and no
// second request. The server knows two different things and says neither —
// *we hold nothing at all for this security and timeframe*, and *we hold
// history, just none in the window you asked for* — and both are the same 200
// with an empty `bars` array and a `null` coverage, deliberately
// (`routes/market-data.ts`, whose outcome table still maps them to one row).
//
// The distinction is already on the wire, on the **other** request this screen
// makes. `SecuritiesResponse.coverage` is *"one record per security that has
// any"*, and its own comment states the property this turns on: a security
// with no bars is **absent** from that array rather than present with a zero —
// *"the honest spelling of the difference between we hold nothing for this and
// we hold none of this."* The Security Explorer already fetches it for the
// identity block, the source note and the universe table.
//
// So this is a derivation over two views the route already holds, and it is a
// property of **the screen** rather than of either response. That is the cost
// as well as the saving: anything consuming `GET /market-data/bars` without a
// universe cannot make it, which is §6.2's reversal trigger — **the first
// consumer of that route that does not also hold the tracked universe**, with
// Epic 10's agent tools the named candidate.
//
// ## Why three values and not a boolean
//
// Because the third one is the rule rather than a state nobody thought about.
// **When the universe answer is not available, the vacancy says the window
// sentence.** It never infers *we hold nothing* from an absence it could not
// read — a failed or in-flight `GET /securities` producing a confident sentence
// about the store is the same defect this task exists to remove, arriving from
// the other side. A boolean would make that rule a `?? false` at a call site,
// which is exactly where it would later be written the other way round.
//
// ## The `1m` seam, recorded rather than widened
//
// `SecuritiesResponse.coverage` sends the **minute** half of the ledger, by
// Task 2.8.9's stated choice. So a security holding minute bars and no daily
// bars reads as {@link StoredHistory} `"some"` at `3M` and `1Y` when the honest
// answer there is `"none"`. The backfill fills both timeframes, so the shape is
// unlikely rather than impossible, and the endpoint is not widened for it —
// this is the seam a reader of §6.2 would otherwise find by surprise. It also
// fails in the safe direction: the error it can make is the *cautious* sentence
// on a page that could have had the confident one, never the reverse.
//
// The one place it surfaces in the words is case one's *"at this timeframe"*,
// which is `PROVENANCE.md` §6.3's wording and is exact rather than hedging: what
// we are entitled to say is that this pair holds nothing, not that the security
// does.

/**
 * What the store holds for this security, as far as **this screen** can tell.
 *
 * Three values because the third is a rule — see the header. Read by
 * `ChartVacancy` for the visible sentence, by `chart-alternative.ts` for the
 * picture's spoken one and by `series-announcement.ts` for the panel's, so that
 * all three forks are made from one derivation rather than three.
 */
export type StoredHistory =
  /**
   * We hold nothing at all for this security. Changing the window does not
   * help, and the sentence says so.
   */
  | "none"
  /**
   * We hold history for this security, so an empty answer is a fact about the
   * window that was asked for.
   */
  | "some"
  /**
   * We could not read the universe answer — it failed, or it has not landed
   * yet. **Rendered as `"some"` everywhere**, because the window sentence is
   * the one that claims less.
   */
  | "unknown";

/**
 * Which of the two empty answers this is.
 *
 * A pure function of the two views, with no DOM, no clock and no fetch — the
 * rule `source-note.ts` and `series-facts.ts` both state, for the reason all
 * three exist: every clause of an answer like this is a decision somebody has
 * to be able to argue with, and a test that reads it as a value is the only
 * instrument that can.
 *
 * ## Why a symbol absent from the whole response is `"unknown"` and not `"none"`
 *
 * Because the two absences mean different things and only one of them is a
 * statement about the store. A symbol missing from `coverage` while **present**
 * in `securities` is the wire contract speaking: we hold this security and no
 * bars for it. A symbol missing from both is a security this system has never
 * heard of — for which `GET /market-data/bars` answers **404**, so the panel is
 * `refused` and no vacancy is drawn at all. The branch is therefore unreachable
 * through the address today; it is written the cautious way because the cost of
 * being wrong is asymmetric, and because Epic 3's live tail is the first thing
 * that could make a page draw a frame for a symbol the universe has not
 * resolved.
 *
 * The comparison is **exact and case-sensitive**, which is the shipped idiom
 * rather than this function's opinion: `SecurityIdentity` and `source-note.ts`
 * both match the address's symbol against the response's the same way, and
 * `/securities/nvda` is a 404 from the server rather than a lowercase NVDA.
 */
export function storedHistoryFor(
  securities: SecuritiesView,
  symbol: string,
): StoredHistory {
  switch (securities.state) {
    case "loaded":
      // The map lookup first, so the linear scan below happens only for a
      // symbol with no coverage — which on a populated store is the rare case
      // and on `store:bare` is every symbol, where the scan is the price of the
      // page CI renders most. `useSecurities` builds the map for exactly this
      // reason: 518 rows against 518 records is a quarter of a million
      // comparisons per render.
      if (securities.coverage.has(symbol)) return "some";

      return securities.securities.some(
        (security) => security.symbol === symbol,
      )
        ? "none"
        : "unknown";

    case "empty":
      // The universe answered correctly and holds nothing, so it holds no
      // coverage either. This is a read rather than an absence we could not
      // read, and it is the honest `"none"`: a migrated database nobody has
      // loaded answers every chart this way.
      return "none";

    case "loading":
    case "failed":
      // The rule, and the only reason this value exists. Nothing was read, so
      // nothing is claimed about the store.
      return "unknown";
  }
}
