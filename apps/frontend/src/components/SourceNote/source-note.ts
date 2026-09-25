import type { SeriesFeedStretch, SeriesProvenance } from "@marketpulse/shared";
import {
  ADJUSTMENT_DESCRIPTIONS,
  describeSeriesFeeds,
  distinctSeriesFeeds,
  marketDateAt,
} from "@marketpulse/shared";

import type { BarSeriesView } from "../../market/index.js";
import type { MarketFeedView } from "../../use-market-feed.js";
import type { SecuritiesView } from "../../use-securities.js";

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
// of them. **The classification clause is a property of the *universe*
// answer** (Task 2.14.4), which on a zero-bar page has resolved — so it draws
// alone, which matters more than it looks: CI's store is 518 securities and
// zero bars, so that is the commonest page in the suite, and until this clause
// shipped the note was absent from every one of them.
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
 * Where the words **above** the numbers came from (Task 2.14.4).
 *
 * The one clause on this surface that is not about the bars. `GET /securities`
 * has carried `provenance.classification` since Story 2.9 and no screen has
 * ever rendered a character of it, so a sector sitting three centimetres above
 * a price chart on a market product has read, until now, exactly like a market
 * observation. It is not one: it is this project's own curated file.
 *
 * **The group is named and its source string never is** (`PROVENANCE.md` §5.2).
 * `FieldGroupProvenance.source` is a free `string` by design, so that a provider
 * can replace `curated` later — which means no `Record<…>` guard can ever give
 * it words, and a renderer printing `s&p-500-gics + curated ETFs` at a reader is
 * printing an internal identifier. The slug stays in the response for an
 * operator, which is where a free string belongs.
 *
 * **`profile` is deliberately not stated.** Nobody mistakes a company's name or
 * its listing exchange for a market observation. The condition that earns it a
 * clause of its own is *the first profile field that is a number* — a market
 * cap, a share count — because at that point it is a figure and
 * `PRODUCT_SPEC.md` §35 applies to it.
 */
export interface ClassificationClause {
  /**
   * When the curated file was last checked, or the sentence that says we
   * cannot tell — already assembled, because the words live here rather than
   * in JSX (`PROVENANCE.md` §9).
   *
   * **No threshold and no mark, whatever it says** (§5.3). The date is the
   * disclosure. `pnpm universe:check` already compares the curated universe
   * against the vendor and changes nothing, so the honest path to a staleness
   * mark is to put *that* on a schedule first — until then *overdue* would mean
   * a date somebody eyeballed rather than a run that did not happen.
   */
  readonly checked: string;
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

  /**
   * The curated-classification claim, whenever this page has a security.
   *
   * **Its data is the universe answer, not the series**, which is the whole
   * consequence of §0.1 being a per-clause rule: a page holding no bars has
   * resolved its security, so this clause draws there — alone — and it is what
   * makes the note appear at all on every zero-bar page. CI's store is 518
   * securities and zero bars, so that is the commonest page in the suite.
   */
  readonly classification: ClassificationClause | null;
}

/** Whether the note has anything at all to say. The component renders nothing
 * when it does not, rather than an empty box with a hairline over it. */
export function hasClauses(note: SourceNoteView): boolean {
  return (
    note.feeds !== null || note.prices !== null || note.classification !== null
  );
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
  securities: SecuritiesView,
  symbol: string,
  /**
   * Whether this page has watched a bar for this security **arrive** (Task
   * 3.10.8).
   *
   * It decides the live row's marker, and it is the one fact the ledger
   * cannot otherwise recover. Two stretches — `All US exchanges` then `IEX` —
   * arise from two different histories since Story 3.8: a window the **server**
   * answered with two tapes, and a SIP window this page has been **extending**
   * over a socket. Those are not the same claim: one is about the past and one
   * is happening while somebody watches. Nothing else on the screen tells them
   * apart, and the chrome cannot — it knows whether data is arriving, not which
   * stretch of this picture it is arriving into.
   */
  watchingLive = false,
): SourceNoteView {
  const classification = toClassification(securities, symbol);
  const provenance = drawnProvenance(shown);

  if (provenance === null) return { feeds: null, prices: null, classification };

  const description = ADJUSTMENT_DESCRIPTIONS[provenance.adjustment];
  const retrieved = formatRetrieval(provenance);

  return {
    feeds: namesFeeds(provenance, feed)
      ? withLiveRow(describeSeriesFeeds(provenance), watchingLive)
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
    classification,
  };
}

/**
 * Mark the stretch this page is still adding to.
 *
 * **The LAST one, and only when a bar has actually arrived for this security.**
 * Contribution order is the ledger's rule (`TAPE.md`), so the stretch being
 * extended is the final row — which is also why this is not *"a first row
 * above the stretches"* as `VISUAL-LANGUAGE.md` reserved it. That reservation
 * was for **§36's sentence**, and Task 3.10.2 found that sentence already
 * shipping in the chrome; putting it here too is the two-surfaces defect this
 * repository has produced three times on one screen. What the note gains
 * instead is the thing it alone owns: **which stretch of this picture is
 * still growing.**
 *
 * **A state, so it persists** (`VISUAL-LANGUAGE.md`'s motion rule: work in
 * progress LOOPS, a state PERSISTS, a fact arriving DECAYS). It is not an
 * arrival — the arrival mark exists and belongs to the figure it marks — and a
 * fourth motion behaviour would cost the set the legibility that is its whole
 * value.
 *
 * **It goes when the socket stops**, because the claim is present tense. The
 * stretch stays, its count stays, and the row stops saying it is being added
 * to — which is true, and is the note's half of §36 rather than a second copy
 * of it.
 */
function withLiveRow(
  stretches: readonly SeriesFeedStretch[],
  watchingLive: boolean,
): readonly SeriesFeedStretch[] {
  if (!watchingLive || stretches.length === 0) return stretches;

  const last = stretches[stretches.length - 1];
  if (last === undefined) return stretches;

  return [...stretches.slice(0, -1), { ...last, live: true }];
}

/**
 * The words of the claim, in three pieces so the group can carry the emphasis.
 *
 * **Here rather than in JSX** — `PROVENANCE.md` §9's rule: a vocabulary that
 * describes a domain value lives beside that value, a sentence that assembles
 * several of them for one screen lives beside the component that draws it, and
 * neither is ever a literal inside a renderer. There is no shared table to put
 * it in, for the reason the clause exists: the value this sentence is about is
 * a free string that may never reach a screen, so there is nothing for a
 * `Record<…>` to be keyed on.
 *
 * Three pieces and not one, because the word a reader lands on is the middle
 * one. The alternative — hoisting `Curated` onto the line the way the prices
 * clause hoists `Unadjusted` — was rejected on the same grounds: that label
 * comes from `ADJUSTMENT_DESCRIPTIONS`, a closed vocabulary, and this group has
 * none. A label invented in a renderer to look symmetrical is the second
 * vocabulary this story spends its time preventing.
 */
export const CLASSIFICATION_CLAIM = {
  before: "Sector and industry are ",
  group: "curated",
  after: ", not from the market feed.",
} as const;

/** What the clause says when the file's date is known, and when it is not. */
const CHECKED_ON = (date: string) => `Last checked ${date}`;
const CHECKED_UNKNOWN = "When they were last checked is not recorded.";

/**
 * The classification claim, or `null` where this page has no security to make
 * it about.
 *
 * ## Why it needs the symbol and not only the response
 *
 * The claim is per response — one curated file means one pair of provenance
 * values for every row — but §0.1 is per clause: *a claim about data requires
 * data*. On an address naming a symbol the universe does not hold there is no
 * sector on the page to disclose the origin of, so the sentence would have no
 * subject, and `SecurityIdentity` has already said what is wrong with the
 * address in its own words and with its own marker. Silence here is that
 * surface being allowed to own it.
 *
 * The other three universe states — in flight, unreadable, migrated but never
 * loaded — are the same answer for the same reason.
 *
 * ## Why a `null` provenance still makes the claim
 *
 * **The claim survives; only the date goes.** `provenance` goes absent when the
 * server declines to make *one* claim about the whole list — the day Alpaca
 * fills the profile fields on a different date than the curated file filled the
 * classification ones, or two rows stop sharing a classification source. None
 * of those is the rows ceasing to be ours: whatever slug the server would have
 * named, the universe is still this project's own file rather than a market
 * observation, so the sentence this task exists to say is still true. What we
 * cannot say is when it was last checked, and the clause says that rather than
 * a date or an empty space.
 *
 * **And it earns no marker for saying so** — `SourceNote` is entirely
 * typographic and stays that way. The question was whether *we have no date*
 * deserves the absence marker `SecurityIdentity` uses when *these prices are
 * unadjusted* does not. It does not: what is missing is one date inside a claim
 * that is still being made, and a marker would rank a missing date above a
 * stated one, which is the opposite of what the two mean.
 */
function toClassification(
  securities: SecuritiesView,
  symbol: string,
): ClassificationClause | null {
  if (securities.state !== "loaded") return null;

  const held = securities.securities.some(
    (security) => security.symbol === symbol,
  );

  if (!held) return null;

  const retrievedAt = securities.provenance?.classification.retrievedAt;

  return {
    checked:
      retrievedAt === undefined
        ? CHECKED_UNKNOWN
        : CHECKED_ON(formatFullDate(curatedDateOf(retrievedAt))),
  };
}

/**
 * The calendar date inside a curated file's retrieval instant — **read as UTC,
 * and deliberately not converted to market time.**
 *
 * This is the one date on this note that is not a market instant, and treating
 * it as one reads it a day early. `UNIVERSE_PROVENANCE` holds `checkedOn` as a
 * plain `YYYY-MM-DD` a person types and reviews in a diff; the loader parses it
 * as **UTC midnight** so a run in any timezone stores the same instant, and the
 * route serves that back through `toISOString()`. Put `2026-09-08T00:00:00Z`
 * through `marketDateAt` and it lands at 20:00 on the 7th in New York — so the
 * screen would read `7 September 2026` against a file, an ADR and four
 * documents that all say the 8th, and nothing would look wrong.
 *
 * So the conversion `formatRetrieval` is right to make is the conversion this
 * one is right to refuse. A bar's `retrievedAt` is an instant a server stamped
 * and its market date is a real question; this is a date somebody typed,
 * widened to an instant only because JSON has no date type, and the honest
 * reading is the one that round-trips it.
 *
 * A slice rather than a `Date`, for the same reason stated positively: there is
 * nothing here to convert, and constructing one would invite a reader to
 * convert it.
 */
function curatedDateOf(retrievedAt: string): string {
  return retrievedAt.slice(0, 10);
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
