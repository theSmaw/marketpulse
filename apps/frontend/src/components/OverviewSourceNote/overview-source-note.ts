import {
  MARKET_FEED_DESCRIPTIONS,
  type MarketFeed,
  type WireMarketOverview,
} from "@marketpulse/shared";

import { chromeAlreadyNames } from "../../feed-claim.js";
import { formatMarketInstant } from "../BarSeriesPanel/series-facts.js";
import type { MarketFeedView } from "../../use-market-feed.js";

// What the landing screen says about where its numbers came from, assembled
// with no DOM (Task 4.2.7).
//
// `PROVENANCE.md` §1.3's rule transfers verbatim and is the whole editorial
// content of this file: **one note for the SCREEN, not one per region**, and
// **the note states what the chrome cannot and never repeats what the chrome
// can.** The rule exists because five correct additions made one at a time
// produce a footnote pile, and this screen is the one where that is about to
// be tested: 4.3, 4.4 and 4.5 each land a region with figures in it, and each
// of them would otherwise arrive with a caption of its own.
//
// ## The two tapes, and why the wire can only name one of them
//
// A change percentage on this screen has an **IEX numerator and a
// consolidated-SIP denominator**. `WireMarketOverview.feeds` describes the
// **observed** figures only — `["iex"]` on the deployed gateway during a
// session, `[]` with no provider, never `["sip"]` — because a stored close's
// tape deliberately does not appear in it (Task 4.2.4's amendment). So the
// wire can say *these figures are IEX* and cannot say *and the denominators
// are consolidated*, which is the whole of invariant 6 on this screen and is
// this module's to state rather than the frame's.
//
// **A second wire field was declined rather than forgotten.** The division is:
// the note states both tapes, each tile states **which of the two it is**
// through the `observed` / `stored` discriminant the frame already carries,
// and neither repeats the other.
//
// ## What this note may NOT say
//
// **Which tape a particular tile is showing.** `SPY` can be a live IEX
// observation while `DIA` is yesterday's consolidated close, in the same
// strip, at the same moment — the ordinary state of IEX (`LIVE-DATA.md` §7.6
// measured a median symbol producing a bar in 65.1% of minutes). A
// screen-level note cannot state that and a region-level note only pushes it
// down a level.
//
// **A connection word.** `LIVE` / `STALE` / `DISCONNECTED` have one home and
// it is the status bar (Story 3.10). Nothing here is derived from whether data
// is arriving.
//
// ## What this module may not do
//
// **It reads the frame and never fetches, resolves a window or reads a
// clock** — `source-note.ts`'s rule, for its reason: the only instants are the
// ones the server stamped, and a browser in Singapore and a browser in New
// York must render the same note for the same frame. There is no `new Date()`
// here with no argument, and there must not be one.

/** A feed as a reader meets it: the vocabulary's own label, and its sentence
 * where the label cannot stand alone (ADR 0019 §3). */
export interface FeedClause {
  readonly label: string;
  readonly sentence?: string;
}

/**
 * The note, as clauses. `null` means *this clause has no data and says
 * nothing*, which is not the same as an empty string.
 *
 * A record of clauses rather than an assembled string, for `SourceNoteView`'s
 * reason: the component draws a label/value grid, and a string would force the
 * emphasis into the text.
 */
export interface OverviewSourceNoteView {
  /**
   * The tape behind the figures this screen **observed**, one entry per
   * distinct feed, in the frame's own first-seen order.
   *
   * **`observed` rather than `live`, and the near-miss is recorded in
   * `OverviewSourceNote.tsx`**: a clause called *live* on a screen whose status
   * bar owns `LIVE` / `STALE` / `DISCONNECTED` would be a second answer to a
   * question one surface answers. This is the wire's own discriminant.
   *
   * `null` in two different situations and the difference is recorded
   * elsewhere rather than here: there are no observed figures at all (the
   * clause has no data — ADR 0029), or the chrome is already naming this exact
   * feed correctly (`chromeAlreadyNames`).
   */
  readonly observed: readonly FeedClause[] | null;

  /**
   * The tape behind the **stored closes**, whenever a figure on this screen
   * rests on one.
   *
   * See {@link STORED_CLOSE_FEED} for why this is a constant rather than a
   * field read off the frame.
   */
  readonly closes: FeedClause | null;

  /** When the aggregate was computed, as a whole market instant. */
  readonly computed: string | null;
}

/**
 * The label column's words.
 *
 * **Here rather than in JSX** — `PROVENANCE.md` §9's rule: a vocabulary that
 * describes a domain value lives beside that value, a sentence that assembles
 * several of them for one screen lives beside the component that draws it, and
 * neither is ever a literal inside a renderer. They are exported so that
 * `pnpm invariants` can assert this file is their only producer, which is what
 * makes *one note for this screen* a check rather than a claim.
 */
export const OVERVIEW_NOTE_TERMS = {
  observed: "Observed prices",
  closes: "Closing prices",
  computed: "Computed",
} as const;

/**
 * The one sentence this note owns, and it is the uncomfortable one.
 *
 * It renders **only where a change percentage is actually on screen**, which
 * is ADR 0029's per-clause rule applied inside a clause: with nothing observed
 * the strip shows four closes and no moves, and a sentence about how the moves
 * were measured would be a claim about numbers a reader cannot see.
 *
 * The label above it stands alone in that state, which is
 * `MarketFeedDescription.sentence`'s rule rather than an exception to it:
 * `All US exchanges` says the whole thing and `sip` ships no sentence at all.
 */
const MEASURED_FROM = "Every change above is measured from one of these.";

/**
 * The tape behind a stored close. **A constant, and stated here rather than
 * read off the frame, because the frame deliberately does not carry it.**
 *
 * Daily bars have exactly one writer: the backfill, through the Alpaca
 * historical client, whose `ALPACA_FEED` is `sip`. The live writer is
 * minute-only by construction (`live-bar-writer.ts`'s `LIVE_TIMEFRAME`), so no
 * `1d` row in `market_bars` has ever been stamped with a single venue's tape —
 * and `readLastCloses` prefers `sip` through `SERVED_TAPE_RANK` besides.
 *
 * **Its reversal trigger is a condition**: the first writer of a `1d` bar that
 * is not the backfill. At that point a close's tape becomes a fact that varies
 * per figure, this constant becomes a claim nothing supports, and the answer is
 * the discriminant the tiles already carry rather than a second constant.
 */
const STORED_CLOSE_FEED: MarketFeed = "sip";

/** Whether the note has anything at all to say. The component renders nothing
 * when it does not, rather than an empty box with a hairline over it. */
export function hasOverviewClauses(note: OverviewSourceNoteView): boolean {
  return (
    note.observed !== null || note.closes !== null || note.computed !== null
  );
}

/**
 * Assemble the note from the frame on screen and what the chrome claims.
 *
 * `undefined` is *no frame has arrived* — first paint, and the note says
 * nothing rather than describing an aggregate that does not exist.
 */
export function toOverviewSourceNote(
  overview: WireMarketOverview | undefined,
  feed: MarketFeedView,
): OverviewSourceNoteView {
  if (overview === undefined) {
    return { observed: null, closes: null, computed: null };
  }

  return {
    observed: observedClause(overview.feeds, feed),
    closes: closesClause(overview),
    computed: computedClause(overview),
  };
}

/**
 * The observed figures' tape, or `null`.
 *
 * One entry per feed rather than one line, because the frame's type is a list
 * and a list with two members in it is the case invariant 6 exists for — the
 * day a replay or a second venue puts one there, a note that had flattened it
 * would name whichever came first and be wrong about the rest.
 */
function observedClause(
  feeds: readonly MarketFeed[],
  view: MarketFeedView,
): readonly FeedClause[] | null {
  // A claim about data requires data: no observed figure, no feed to name.
  // This is the state every deployment with no provider is permanently in,
  // and the state CI's runner is in always.
  if (feeds.length === 0) return null;
  if (chromeAlreadyNames(feeds, view)) return null;

  return feeds.map((feed) => describe(feed));
}

/**
 * The stored closes' tape, or `null` where nothing on screen rests on one.
 *
 * **Two ways to rest on a stored close**, and the second is the one that
 * matters: a `stored` figure *is* one, and an `observed` figure carrying a
 * `changePercent` was **measured against** one. A note that checked only the
 * first would go silent during a session — exactly when every figure is live,
 * every percentage has a consolidated denominator, and the chrome is saying
 * `IEX`.
 */
function closesClause(overview: WireMarketOverview): FeedClause | null {
  let restsOnAClose = false;
  let measured = false;

  for (const figure of overview.figures) {
    if (figure.state === "stored") restsOnAClose = true;
    if (figure.state === "observed" && figure.changePercent !== undefined) {
      restsOnAClose = true;
      measured = true;
    }
  }

  if (!restsOnAClose) return null;

  const described = describe(STORED_CLOSE_FEED);

  return measured ? { ...described, sentence: MEASURED_FROM } : described;
}

/**
 * When the aggregate was computed, in market time, written whole.
 *
 * **`computedAt` and never `sentAt`** — ADR 0033's constraint and the frame's
 * own: the figures are frozen between bursts, bounded at about a minute during
 * a session and **unbounded when the feed dies**, so the send instant would
 * report an afternoon-old aggregate as current.
 *
 * **A whole instant with its zone**, which is `formatMarketInstant`'s spelling
 * and this product's for anything that is a moment rather than a session. It
 * is not the figures' own instant — the strip states that, per figure and in
 * its shared line — it is when *this arithmetic* was done, which nothing else
 * on the screen says and which is the only way to tell a frozen aggregate from
 * a current one.
 *
 * **To the MINUTE, and the seconds were taken off deliberately.** The gateway
 * rebuilds this aggregate up to sixteen times a minute over data that arrives
 * once a minute, so a seconds field ticks visibly while nothing behind it has
 * changed — churn advertised as information, and a second ticking number on a
 * screen where the strip's own advancing instant is the one the design chose
 * to carry *the feed is still arriving*. At minute precision two consecutive
 * aggregates inside one minute read the same, which is the honest reading:
 * nothing new had arrived.
 *
 * **`Computed` rather than `Retrieved`, and the neighbouring surface's verb
 * was rejected rather than overlooked.** `SourceNote` renders `Retrieved 8
 * September 2026` about bars that were fetched; nothing is fetched here. An
 * aggregate is assembled from what this process already holds, so *retrieved*
 * would be false — which is worth knowing before anybody makes the two
 * surfaces match.
 *
 * A malformed instant is skipped rather than poisoning the note: `Date.parse`
 * answers `NaN` for what it cannot read and `new Date(NaN)` formats without
 * complaining, which is how `Invalid Date` reaches a screen.
 */
function computedClause(overview: WireMarketOverview): string | null {
  // **A claim about data requires data, and this clause's data is the
  // figures.** A frame whose every figure is `unknown` is a truthful aggregate
  // over nothing — which is exactly the state CI's store puts all four proxies
  // in, and the state a restarted backend is in before its first read. An
  // instant under a strip saying it holds nothing is `SOURCE_OF_NOTHING`'s
  // defect one screen along: a hairline and a line of fine print that a reader
  // takes as a claim about the figures above them.
  const describesSomething = overview.figures.some(
    (figure) => figure.state !== "unknown",
  );
  if (!describesSomething) return null;

  const instant = Date.parse(overview.computedAt);
  if (Number.isNaN(instant)) return null;

  return formatMarketInstant(new Date(instant), "minute");
}

/**
 * A feed in the product's own words, spread so that `exactOptionalPropertyTypes`
 * sees an absent sentence rather than one present as `undefined`.
 */
function describe(feed: MarketFeed): FeedClause {
  const description = MARKET_FEED_DESCRIPTIONS[feed];

  return description.sentence === undefined
    ? { label: description.label }
    : { label: description.label, sentence: description.sentence };
}
