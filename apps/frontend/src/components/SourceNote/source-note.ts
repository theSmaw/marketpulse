import type { SeriesFeedStretch, SeriesProvenance } from "@marketpulse/shared";
import {
  ADJUSTMENT_DESCRIPTIONS,
  describeSeriesFeeds,
  distinctSeriesFeeds,
  marketDateAt,
} from "@marketpulse/shared";

import type { BarSeriesView } from "../../market/index.js";
import type { MarketFeedView } from "../../use-market-feed.js";

// What the source note says, assembled with no DOM (Task 2.14.3).
//
// `PROVENANCE.md` §1.3's rule is the whole editorial content of this file:
// **the note states what the chrome cannot, and never repeats what the chrome
// can.** That is what makes it one line rather than five, and it is the thing
// to check a new clause against — a clause that restates the masthead does not
// belong here, because a fact appearing twice on one screen teaches a reader
// that the small type is not worth reading, which is the harm ADR 0019 §3
// turned on.
//
// ## A claim about data requires data, applied per clause
//
// `market-bars.ts` exports `SOURCE_OF_NOTHING` for the one case the ledger
// cannot describe — an answer holding no bars at all — and its own comment is
// exact: *"that source's `barCount` is `0`, so what these two fields describe is
// nothing. They are not a claim about data; a claim about data requires
// data."* So the domain model hands this module a complete, entirely truthful
// provenance record **about zero numbers**, and printing it under an empty
// frame would be four accurate words making a false impression, because a
// reader takes them as a claim about the picture.
//
// §0.1, as amended by Task 2.14.2, applies that **per clause rather than per
// note**: each clause renders when its own data is present, and the note
// renders when at least one clause does. The feed, the adjustment and the
// retrieval date are properties of the bars, so a series with no bars has none
// of them. Task 2.14.4's classification clause is a property of the *universe*
// answer, which on a zero-bar page has resolved — so it will draw alone, which
// matters more than it looks: CI's store is 518 securities and zero bars, so
// that is the commonest page in the suite.
//
// ## What this module may not do
//
// **It reads the answer and never fetches, resolves a window or reads a clock**
// — `series-facts.ts`'s rule, and for the same reason. There is no `new Date()`
// here and there must not be one: the only instants are the ones the server
// stamped, and a browser in Singapore and a browser in New York must render the
// same note for the same series.

/**
 * What has been done to these prices, and when they were fetched.
 *
 * One clause rather than two because the two are one sentence to read — and
 * because the adjustment is **per series** by construction: it sits on
 * {@link SeriesProvenance} rather than on a source, and `mergeSeriesProvenance`
 * refuses to join two. There is no day on which this is one fact repeated per
 * stretch, so it is never rendered per stretch.
 */
export interface PricesClause {
  /** `ADJUSTMENT_DESCRIPTIONS`' label — never this module's word for it. */
  readonly label: string;

  /** Its sentence, where the label cannot stand alone. `raw`'s can't. */
  readonly sentence?: string;

  /**
   * When these bars were fetched, as a market date in full — `8 September
   * 2026`, or `4–8 September 2026` where the stretches were fetched on
   * different days.
   *
   * **A range rather than a single date when they differ, and that is the
   * honest spelling rather than a flourish.** A stitched series is stored bars
   * plus a tail fetched later; naming only the newer date claims the whole
   * picture is that fresh, and naming only the older one claims it is that
   * stale. Both halves of the range are true of some of the bars on screen.
   */
  readonly retrieved: string;
}

/**
 * The note, as clauses. `null` means *this clause has no data and says
 * nothing*, which is not the same as an empty string.
 *
 * A record of clauses rather than an assembled string, for
 * {@link describeSeriesFeeds}' reason one layer down: the component draws a
 * ledger and a label/text grid, and a string would force the emphasis into the
 * text. Task 2.14.4 adds a third field here and changes nothing else.
 */
export interface SourceNoteView {
  /**
   * The series' stretches, when the feed is worth naming at all — see
   * {@link toSourceNote} for the two conditions that earn it, both of which are
   * unreachable today and both of which become reachable in Epic 3.
   */
  readonly feeds: readonly SeriesFeedStretch[] | null;

  /** The adjustment and the retrieval, whenever there are bars. */
  readonly prices: PricesClause | null;
}

/** Whether the note has anything at all to say. The component renders nothing
 * when it does not, rather than an empty box with a hairline over it. */
export function hasClauses(note: SourceNoteView): boolean {
  return note.feeds !== null || note.prices !== null;
}

/**
 * Assemble the note from what is **drawn** and what the chrome claims.
 *
 * The first argument is `BarSeriesScreen.shown` rather than `view`, and the
 * distinction is load-bearing: while a newer request is in flight the picture
 * on screen is the previous answer, and a note describing the request rather
 * than the picture would be provenance for bars nobody can see.
 *
 * ## When the feed is named, and why it is almost never
 *
 * The chrome carries `FeedProvenance` on every route, so for a series whose
 * every source names the one feed this deployment is configured with, naming it
 * here is the same fact three centimetres apart. Two conditions earn it:
 *
 *  - **more than one distinct feed**, which is the case invariant 6 exists for.
 *    The free Alpaca plan is asymmetric — stored history is the consolidated
 *    SIP tape, the live stream is IEX only — so the moment Epic 3 stitches a
 *    live tail onto stored bars, one page-level label is wrong about half of
 *    this series and the honest answer is per series;
 *  - **one feed that is not the configured one**, which is the same defect with
 *    the stitch removed: a deployment reading one feed can still serve a stored
 *    series from another.
 *
 * **Suppression requires a positive match**, which is the direction that fails
 * safe. A deployment with no provider configured still serves stored bars, and
 * there the chrome says *not configured* and claims no feed at all — so the
 * note names one, because it is stating what the chrome cannot rather than
 * repeating it. The one state that suppresses without a match is `checking`,
 * and only to avoid a row that appears on the first frame and is taken away a
 * few hundred milliseconds later; a flicker is a worse reading than a fact
 * arriving with everything else on the page.
 */
export function toSourceNote(
  shown: BarSeriesView,
  feed: MarketFeedView,
): SourceNoteView {
  const provenance = drawnProvenance(shown);

  if (provenance === null) return { feeds: null, prices: null };

  const description = ADJUSTMENT_DESCRIPTIONS[provenance.adjustment];
  const retrieved = formatRetrieval(provenance);

  return {
    feeds: namesFeeds(provenance, feed)
      ? describeSeriesFeeds(provenance)
      : null,
    // Two spellings for `exactOptionalPropertyTypes`' reason, which is the same
    // branch `describeSeriesFeeds` makes: a label that stands alone has no
    // sentence rather than a sentence that is nothing.
    prices:
      description.sentence === undefined
        ? { label: description.label, retrieved }
        : {
            label: description.label,
            sentence: description.sentence,
            retrieved,
          },
  };
}

/**
 * The provenance of the bars **on screen**, or `null` where there are none.
 *
 * `loaded` and `partial` are the two states carrying a `PopulatedBarSeries`,
 * and the type is what makes the zero-bar case unrepresentable here rather than
 * merely handled: `empty` carries a `BarSeries` whose provenance is
 * `SOURCE_OF_NOTHING`'s, which is a record about no numbers.
 */
function drawnProvenance(shown: BarSeriesView): SeriesProvenance | null {
  switch (shown.state) {
    case "loaded":
    case "partial":
      return shown.series.provenance;
    case "empty":
    case "loading":
    case "refused":
    case "failed":
      return null;
  }
}

function namesFeeds(
  provenance: SeriesProvenance,
  feed: MarketFeedView,
): boolean {
  const feeds = distinctSeriesFeeds(provenance);

  if (feeds.length > 1) return true;
  if (feed.state === "checking") return false;

  return !(feed.state === "configured" && feeds[0] === feed.feed);
}

/**
 * When these bars were fetched, in market time, written in full.
 *
 * **In full, and not relative** (`PROVENANCE.md` §5.3's rule, which is about a
 * date on this same note): `6 days ago` would be computed against the browser's
 * clock, which this product fences off from market instants for good reasons,
 * and `2026-09-08` is a machine's spelling of a date in body text.
 *
 * **In market time**, through the one module allowed to convert one, because
 * every other date on this screen is a market date and a retrieval stamped at
 * 23:40 UTC would otherwise read as the following day for half the world.
 */
function formatRetrieval(provenance: SeriesProvenance): string {
  const dates = provenance.sources
    .map((source) => marketDateAt(new Date(source.retrievedAt)))
    .sort();

  const first = dates[0] ?? "";
  const last = dates[dates.length - 1] ?? first;

  if (first === last) return formatFullDate(first);

  // Same month and year: `4–8 September 2026` rather than the month and the
  // year twice. An en dash, which is the range dash, and no spaces around it —
  // the same mark `formatMarketRange`'s arrow is not, because that one joins
  // two full timestamps and this joins two numerals.
  if (first.slice(0, 7) === last.slice(0, 7)) {
    return `${dayOf(first)}–${formatFullDate(last)}`;
  }

  return `${formatFullDate(first)}–${formatFullDate(last)}`;
}

/** `2026-09-08` as `8 September 2026`. */
function formatFullDate(date: string): string {
  const month = MONTH_NAMES[Number(date.slice(5, 7)) - 1] ?? date.slice(5, 7);
  return `${dayOf(date)} ${month} ${date.slice(0, 4)}`;
}

function dayOf(date: string): string {
  return String(Number(date.slice(8, 10)));
}

// Spelled out rather than formatted, which is `chart-time-axis.ts`'s idiom and
// Story 2.5's acceptance criterion 2: `market-time.ts` is the one module in
// this workspace that constructs an `Intl.DateTimeFormat`, and a month name is
// not a timezone conversion — it is a word, and a table of twelve words is
// cheaper to read than a formatter whose output depends on the runtime's
// locale.
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
