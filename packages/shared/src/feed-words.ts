import { FEED_STATUSES, type FeedStatus } from "./feed-status.js";
import type { ExtendedHours } from "./market-session.js";
import type { MarketFeed, ProvenanceDescription } from "./market-provenance.js";

/**
 * What the chrome says about a **connection** (Task 3.3.3).
 *
 * `LIVE-DATA.md` §11.3 names this record as unwritten and names Story 3.3 as
 * its owner, and is explicit that it is **not a string in a component**. The
 * feed's words have lived in `MARKET_FEED_DESCRIPTIONS` since Story 2.6 and
 * `pnpm break feed-words-in-a-renderer` proves a second spelling goes red; this
 * is the same arrangement for the other half of the status strip.
 *
 * ## Two vocabularies because two facts fail independently
 *
 * *Which venues are in these numbers* and *is data arriving right now* are
 * different questions — Task 1.12.4's two-indicators argument, applied a fourth
 * time. `MARKET_FEED_DESCRIPTIONS` answers the first; this answers the second.
 *
 * ## `LIVE` means the feed is HEALTHY, not that data arrived
 *
 * §9.4, and the intuitive definition is the wrong one for this feed: §7.6
 * measured a median symbol producing a bar in **65.1%** of minutes and `ERIE`
 * in **2.1%**, so a definition keyed on data would report a correctly-working
 * feed as not-live for most of the day.
 *
 * **The consequence is the grid row that looks wrong and is correct** —
 * `IEX` / `LIVE` / `CLOSED` at 03:00. Our connection is healthy; the market is
 * shut. Three regions, three facts, none collapsing into the others.
 *
 * ## §11.3's capitals are the STYLESHEET's, not the string's
 *
 * The grid writes every cell in capitals and these labels are lower case, and
 * that is deliberate rather than a transcription slip. `type.module.css`'s
 * `.microLabel` carries `text-transform: uppercase`, and every cell of the
 * status strip composes it — so the capitals in the grid are what a reader
 * sees, produced by the stylesheet, and a label spelled `LIVE` here would be
 * asking for them twice.
 *
 * Two things already in the tree say the same:
 *
 * - `MARKET_FEED_DESCRIPTIONS` ships `"Simulated"`, `"Replay"` and
 *   `"All US exchanges"`. Only `"IEX"` is capitals, because the acronym is.
 * - `BackendIndicator`'s `STATUS_WORD` — the **other cell of this same strip** —
 *   ships `healthy` / `degraded` / `unreachable` on a stated rule: *the words
 *   are the union's own members, so the screen and the type share one
 *   vocabulary.* This record keeps that rule.
 *
 * It also makes Task 3.3.5 a substitution rather than a change: `FeedIndicator`
 * renders the raw `FeedStatus` today, so pointing it at this record alters no
 * pixel and no browser assertion.
 */
export const CONNECTION_DESCRIPTIONS: Record<
  FeedStatus,
  ProvenanceDescription
> = {
  live: {
    // **No sentence**, and the rule is `MarketFeedDescription.sentence`'s
    // rather than a new one: *a sentence appears when the label cannot stand
    // alone, and not otherwise.* `LIVE` beside a named venue and a market
    // clock is not ambiguous, and padding in a status strip is worse than
    // silence — it teaches a reader the second line is not worth reading.
    //
    // **And no instant either — the same decision, taken by the owner on
    // 2026-09-19 and recorded here because this is where the word lives.**
    // §36's example sentence — *"Live feed disconnected — displaying data
    // through 10:42:17"* — exists to **qualify a broken state**, and a healthy
    // feed has nothing to qualify. It is `PROVENANCE.md`'s existing rule
    // rather than a new one: a clause renders only when its own data is
    // present, and this product already refuses to print a fully-formed
    // provenance record about zero bars.
    //
    // **The cost, stated rather than discovered later:** silence now means
    // *current*, and a reader has to learn that. Which is why the degraded
    // states are loud — the instant arrives inside the sentence that explains
    // why it is there, never on its own.
    //
    // **Reversal trigger, as a condition:** the first time a user or a
    // reviewer reads a healthy feed as *unqualified* rather than current — asks
    // *how old is this?* of a region showing `LIVE`. At that point silence has
    // stopped communicating and the always-on version is the answer.
    // `FeedIndicator`'s `QUALIFIES_WITH_AN_INSTANT` is what implements it.
    label: "live",
  },
  stale: {
    // The one that cannot stand alone. `STALE` invites *the price is wrong*,
    // and the true statement is narrower: the connection is fine and nothing
    // has arrived. §11.2 puts the threshold at 60 s with the market open.
    label: "stale",
    sentence: "Connected, but no new data has arrived.",
  },
  disconnected: {
    // §36's own example is written for this state — *"Live feed disconnected
    // — displaying data through 10:42:17"* — and Story 3.3's owner decided on
    // 2026-09-19 that the instant appears **only** here and in `stale`, never
    // beside `LIVE`. The sentence therefore has to carry what is still true,
    // because it is the only place a reader learns the numbers did not vanish.
    label: "disconnected",
    sentence:
      "The live feed is not connected. Prices shown are the last known.",
  },
};

/**
 * **What a degraded connection says when NOTHING has ever arrived**
 * (Task 3.10.2).
 *
 * `CONNECTION_DESCRIPTIONS`' two degraded sentences each carry a clause about
 * the **data on screen** — *Prices shown are the last known*, and *no **new**
 * data has arrived*. Both are true of a page that has received a live price
 * and stopped receiving them. **Neither is true of a page that has never
 * received one**, and that page is ordinary rather than exotic: a cold load
 * while the market is shut, a first paint before any bar lands, a gateway that
 * is up against a vendor connection that is not.
 *
 * The rule is ADR 0029's first and it is already stated one link up the chain —
 * *a clause renders only when its own data is present, and a surface that owns
 * nothing defers*. The canvas applied it to the **instant** (`Live in the
 * chrome` §05) and not to the sentence carrying it, so the instant is
 * correctly withheld and the words beside it are left hanging.
 *
 * ## Why not simply drop the clause
 *
 * *The live feed is not connected.* on its own is true and **says nothing
 * about the numbers on screen**, which is the question the sentence exists to
 * answer. This product names an empty answer rather than leaving it silent —
 * `StoredHistory` has three members and not two for exactly this reason.
 *
 * ## Why `live` has no entry
 *
 * The same reason it carries no instant: a healthy connection has nothing to
 * qualify, and silence means *current*. A `live` feed that has delivered
 * nothing yet is a market that has not traded yet, which is the session's fact
 * rather than the connection's.
 *
 * ## The word `live` inside the sentence is load-bearing
 *
 * The page is **not** empty — the chart and the table are full of stored
 * closes from HTTP — so *no prices have arrived* would contradict what the
 * reader can see. *No **live** prices* is the true and narrower claim, and it
 * draws the one distinction this whole strip exists for.
 */
export const CONNECTION_SENTENCES_WITHOUT_DATA: Partial<
  Record<FeedStatus, string>
> = {
  // One word apart from the sentence above it, deliberately: *no NEW data*
  // implies there was old data, and with nothing ever received that is a false
  // implication rather than a clumsy one.
  stale: "Connected, and no live prices have arrived yet.",
  disconnected:
    "The live feed is not connected. No live prices have arrived yet.",
};

/**
 * The word for a connection that is live **on a replay**.
 *
 * ADR 0030 decision 4: **`LIVE` must never render while the feed is `replay`.**
 * `FeedStatus.live` is a claim about a **connection**; `LIVE` in the chrome
 * reads as a claim about the **market**, and with a replay running on a
 * Saturday afternoon those two diverge completely.
 *
 * **It is not a fourth `FeedStatus`** (§11.2 keeps that union at three), and it
 * is not a feed word either — it is a **rendering of `live` when the feed
 * identity is `replay`**, which makes it the one string in this product that
 * crosses the two vocabularies. {@link connectionWordFor} is where that
 * crossing happens, once.
 */
export const REPLAYING_DESCRIPTION: ProvenanceDescription = {
  label: "replaying",

  // **No sentence, and that is `Live in the chrome` §05's rule rather than an
  // omission** (Task 3.4.9). *A clause renders only when its own data is
  // present*, and a **healthy** connection has nothing to qualify — which is
  // why `LIVE` carries no instant while `STALE` and `DISCONNECTED` do.
  // `REPLAYING` is the replay's healthy state and is the exact analogue.
  //
  // It had one, and it produced the defect this task exists for the moment the
  // feed cell beside it became reachable:
  //
  //   REPLAY      Real bars from a past US session, replayed. Not the live market.
  //   REPLAYING   Replaying a past session. Not the live market.
  //
  // **A shared four-word run**, three words apart — which is exactly what
  // `Live in the chrome` §04 checked the other pair against and what
  // `search-and-the-universe-share-no-words` exists to stop. The clause that
  // survives is the one in the half that **owns** the subject: `Not the live
  // market` is a coverage claim, invariant 6 puts those in the provenance
  // half, and ADR 0029's rule is that everything else points once and stops.
  //
  // The canvas drew it this way — `Live in the chrome` §03's replay row has no
  // sentence after `replaying` — and the code had not caught up.
};

/**
 * The connection cell, given both facts.
 *
 * **The crossing lives here rather than in a renderer**, which is the whole
 * point: a component writing `status === "live" && feed === "replay"` for
 * itself is a second place the rule can be got wrong, and `pnpm break
 * feed-words-in-a-renderer` exists because that has happened before with the
 * feed's own words.
 *
 * **`null` means there is nothing to say.** A deployment with no provider
 * configured has no connection to describe, and §11.3's grid gives that row a
 * `—` in this column rather than a word. The gateway sends `disconnected` with
 * `feed: null` because `FeedStatus` has three members and *not configured* is
 * not one of them — so this function is what turns the wire's shape back into
 * the grid's.
 */
export interface ConnectionWordInputs {
  /**
   * Can this browser still hear the backend?
   *
   * **The argument that completes §11.3's grid rather than re-reading it**, and
   * it is required rather than defaulted so that every call site decides.
   *
   * The grid was written about the **server's** feed, before a browser socket
   * existed, so it has no row for *we lost the server*. Both that and *the
   * server has no provider* arrive as `disconnected` with `feed: null`, and
   * they are different facts: the first is a broken connection §36 requires be
   * labelled, the second is a deployment behaving exactly as configured.
   *
   * The `—` belongs to the second only. See `STORY.md`'s open decision 3,
   * answered by the owner on 2026-09-19.
   */
  readonly backendReachable: boolean;
}

export function connectionWordFor(
  status: FeedStatus,
  feed: MarketFeed | null,
  { backendReachable }: ConnectionWordInputs,
): ProvenanceDescription | null {
  // **Our own connection outranks the feed's identity.** A browser that cannot
  // hear the backend has a connection fact to report whatever the deployment
  // was configured with, and reporting nothing would leave a reader inferring a
  // dropped socket from an absence — which is exactly what §36 forbids and what
  // §11.2's thresholds exist to remove.
  if (!backendReachable) return CONNECTION_DESCRIPTIONS.disconnected;

  if (feed === null) return null;
  if (feed === "replay" && status === "live") return REPLAYING_DESCRIPTION;
  return CONNECTION_DESCRIPTIONS[status];
}

/**
 * The feed cell's words when **no provider is configured**.
 *
 * ## Why it is here rather than in `MARKET_FEED_DESCRIPTIONS`
 *
 * That record is `Record<MarketFeed, …>` and **`none` is a `ProviderId`, not a
 * `MarketFeed`** — widening `MARKET_FEEDS` to hold it would be inventing a feed
 * to describe the absence of one, and every consumer of that union would then
 * have to handle a member that can never be stamped on a bar.
 *
 * ## Why it is here rather than in the component, where it currently lives
 *
 * `FeedProvenance.tsx` held this string until Task 3.3.3, grouped with `checking` and
 * `unknown` under a comment saying they are *"the states that are about **us**
 * rather than about a venue"*. **That grouping is right about two of the three
 * and wrong about this one**, which is the finding Task 3.3.3 acted on:
 *
 * | State | Whose fact | Server knows it? |
 * | --- | --- | --- |
 * | `checking` | This browser's first request has not returned | **No** |
 * | `unknown` | This browser could not read an answer | **No** |
 * | `not configured` | **The deployment's configuration** | **Yes — it sends `feed: null`** |
 *
 * `checking` and `unknown` genuinely cannot be server vocabulary: the server
 * always knows its own state, and both describe the **client's** ignorance. But
 * *no provider is configured* is a fact the server holds and transmits, so it
 * belongs where the other transmitted words are.
 */
export const NOT_CONFIGURED_DESCRIPTION: ProvenanceDescription = {
  label: "not configured",
  sentence: "No market-data provider is configured.",
};

/** Every connection word, for a permutation grid or a test that walks them. */
export const CONNECTION_STATUSES = FEED_STATUSES;

/**
 * What a reader is told when a price came from outside the regular session
 * (Task 3.4.6).
 *
 * ## A word rather than a glyph, and the argument is this product's own
 *
 * `PRODUCT_SPEC.md` §7.1 makes it about IEX and it generalises: **three letters
 * teach a non-specialist nothing**, and the fix there was a sentence rather
 * than an acronym. A dot or a bar beside the figure would need a legend; a
 * reader either knows what *pre-market* means or can look it up, and neither is
 * true of a shape.
 *
 * Three more reasons, all of them constraints rather than taste:
 *
 * - **The left margin of the digits is already spent.** Story 3.4's arrival
 *   mark lives there, and a second glyph in one position is two marks competing
 *   at 390 — which is where this chrome already has a recorded clipping defect.
 * - **Colour is never the sole encoding of anything**, and a word is the
 *   strongest non-colour encoding there is. It survives greyscale by
 *   construction rather than by a check.
 * - **It costs no geometry.** The qualifier line already wraps, and this joins
 *   it rather than reserving anything.
 *
 * ## And it sits beside the instant, because it qualifies the instant
 *
 * The line reads *when, then what kind of when, then what the change is
 * measured from*. §10.3's rule is that every entry carries its own instant and
 * no reader may render a price without reading it; **this word is that instant
 * interpreted**, so putting it anywhere else would separate a fact from the
 * thing that produces it.
 *
 * **Nothing renders for a regular-session price.** `PROVENANCE.md`'s rule that
 * a clause renders only when its own data is present, and the same call the
 * chrome makes for `LIVE`, which carries no timestamp: silence means *the
 * ordinary case*, and the exceptional case is the one that speaks.
 */
export const EXTENDED_HOURS_WORDS = {
  pre_market: "pre-market",
  after_hours: "after-hours",
} as const satisfies Record<ExtendedHours, string>;
