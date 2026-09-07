/**
 * Where a price series came from, and what has been done to its numbers.
 *
 * This is the module with product weight rather than engineering weight in
 * Story 2.6, and the reason is invariant 6 and §7.1: Alpaca's free tier is
 * **IEX, not the consolidated SIP tape**, MarketPulse must display which feed a
 * number came from, and it must not imply full US-market coverage. §35 lists
 * *"hide data provenance"* among the things this product must not do.
 *
 * ## Why this is a field on the data and not a caption on a component
 *
 * The cheap version of this file is a `feed: string` on a response object and a
 * caption under the chart, and it survives exactly until the first stitch. The
 * argument is mechanical rather than moral: **a caption is true of the
 * component, and provenance is a fact about the data.** The moment Story 2.8's
 * read path puts stored bars and freshly fetched bars in one series — which it
 * does the first time a request runs past what the store holds — the caption is
 * unchanged and wrong.
 *
 * So provenance rides on the series, and a series names a **list** of sources
 * rather than one (`PROVIDER.md` §2). The candidate that lost was one record
 * plus a rule that the stitcher must not produce a mixed series: that is a rule
 * nothing checks, of the third kind `CLAUDE.md` already lists several of, and
 * its failure is silent, produces a plausible number, and is a false claim
 * about data.
 *
 * Per-**bar** provenance is never wrong and is not affordable: ~100 securities
 * × 390 minute bars × ~252 sessions is ~10 million rows a year, and four
 * provenance fields on each is ten million copies of the string `iex` in the
 * table, in every response and in every array the browser holds. Note the half
 * that is already free, because it changes what per-series has to carry:
 * `migrations/README.md` §4 makes `recorded_at` mandatory on every table, so
 * the **store** knows per-row when each bar was written. The honest statement
 * is that the database has per-bar retrieval time by convention and the wire
 * does not.
 *
 * ## The one thing the sources may not disagree about
 *
 * Two sources may disagree about **feed**, and that is reported truthfully —
 * it is the whole reason {@link SeriesProvenance.sources} is a list. Two
 * sources that disagree about **adjustment** are **refused**, because the
 * result is not a series: raw and split-adjusted prices for one symbol are on
 * two different scales, so an array holding both has a cliff in it that is an
 * artefact of our own stitching, and every percentage change computed across
 * the seam is wrong.
 *
 * That is why `adjustment` sits on the provenance record and not on a source,
 * and why {@link mergeSeriesProvenance} is the only way to obtain a
 * multi-source record: the incoherent case is unrepresentable rather than
 * merely discouraged.
 *
 * ## What is deliberately not here
 *
 * The `MarketDataProvider` interface, the request type and the error taxonomy
 * all live in `apps/backend` (`PROVIDER.md` §1). The line, stated so it can be
 * applied without re-deriving it: **the frontend may know the NAME of a
 * provider, because it renders it, and may not know the SHAPE of one**, because
 * that is a thing which holds a credential and makes vendor network calls.
 */

/**
 * Who sold us the data — **our** name for them, not a vendor's marketing name.
 *
 * A closed union for `TIMEFRAMES`' reason: a typo is then a compile error, and
 * the fixture provider and every later client are checked against one set.
 *
 * **It ships with one member and the vendor is deliberately absent.** Story
 * 2.6's acceptance criterion 1 is that these types exist *with no reference to
 * any vendor, checked by grep*, and a vendor's name as a string literal in this
 * package fails that grep. The story that writes the client adds its own member
 * in the same commit as the thing that can produce it, which is
 * `SECURITY_STATUSES`' rule — `delisted` waits for the code that can set it —
 * held for the fourth time. The reflex is to write both now. Do not.
 *
 * **Amended 2026-09-07 by Task 2.7.3, which is that commit.** `alpaca` is the
 * second member and it arrives beside `alpaca-provider.ts`, the client that
 * produces it — the rule above honoured rather than broken, held for the fifth
 * time. Two consequences worth stating because both are easy to misread:
 *
 *  - **`createMarketDataProvider`'s exhaustive `switch` fails the build until
 *    it is wired**, which is `market-data.ts`'s own stated mechanism working.
 *    That is the check, not an obstacle to route around.
 *  - **It moves Task 2.6.8's recorded vendor grep from zero to one**, and that
 *    is expected rather than a regression. Criterion 1 asks that the *domain
 *    types* carry no vendor reference; a `ProviderId` is the one place the
 *    vendor's name is the subject rather than an implementation detail, because
 *    a provenance record has to name who sold us the data for §7.1's display to
 *    be possible at all. **That is the opposite of a leak.** The figure and its
 *    reading are amended where Task 2.6.8 recorded them.
 */
export const PROVIDER_IDS = ["fixture", "alpaca"] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

/**
 * Which venues are in the number. **This is the invariant-6 field, and it is
 * not the provider.**
 *
 * Provider and feed vary *independently*, and conflating them is the mistake
 * this type exists to prevent: one vendor serves single-venue data on a free
 * plan and the consolidated tape on a paid one, so "which company sold us this"
 * and "which venues are in it" are two facts — and only the second is the one
 * §7.1 requires us to display.
 *
 * - **`iex`** — one exchange, not the consolidated tape.
 * - **`sip`** — the US consolidated tape, all exchanges.
 * - **`synthetic`** — generated. The fixture provider's, and see
 *   {@link MARKET_FEED_DESCRIPTIONS} for why that matters more than it looks.
 *
 * `iex` and `sip` are **not vendor names**: IEX is an exchange and the SIP is
 * the US consolidated tape, and both would be facts about the market if no
 * particular data vendor existed. This sentence is here so that criterion 1's
 * grep does not produce a false positive somebody then "fixes".
 */
export const MARKET_FEEDS = ["iex", "sip", "synthetic"] as const;

export type MarketFeed = (typeof MARKET_FEEDS)[number];

/**
 * What a person reads when a feed is shown to them.
 *
 * A short label for the chrome, and — **only where the label cannot be
 * understood on its own** — a sentence saying what it means.
 */
export interface MarketFeedDescription {
  /** The affordance: short enough for a status region. */
  readonly label: string;

  /**
   * One plain sentence, **when the label needs one**. Rendered, never hidden in
   * a `title` attribute — which is unreachable by keyboard and by touch, and
   * has been rejected twice already (Tasks 1.4.5 and 1.12.4).
   *
   * **Optional since 2026-09-07, and the rule is the point rather than the
   * type.** This was required, on the reasoning that §7.1 asks for an
   * explanation rather than an acronym — which is true of `iex`, whose label
   * teaches a non-specialist nothing, and of `synthetic`, where *"SIMULATED"*
   * alone could be read as paper trading rather than as invented prices. It is
   * **not** true of a label that already says the whole thing.
   *
   * Forcing one anyway is what produced two bad strings in a day for `sip`:
   * first the jargon and the meaning inverted, then a restatement of the label
   * with a contrast bolted on to a feed this deployment never renders. Both
   * were padding, and padding in a status strip is worse than silence because
   * it teaches a reader that the second line is not worth reading.
   *
   * **The rule: add a sentence when the label cannot stand alone, and not
   * otherwise.** The `satisfies` guard still forces every feed to have a
   * `label`, which is the half that matters — a feed cannot arrive with no
   * words at all.
   */
  readonly sentence?: string;
}

/**
 * The words, decided here rather than by whatever renders them.
 *
 * **`Market feed: IEX` alone satisfies §7.1's letter and fails its intent**,
 * and that is the whole reason this table exists rather than a slug. §7.1 does
 * not require us to print an acronym; it requires that we *"must not imply that
 * IEX represents every US exchange"* — and a reader who does not know what IEX
 * is learns nothing at all from three letters. **The sentence is the
 * requirement; the label is the affordance.**
 *
 * It lives beside {@link MARKET_FEEDS} because the alternative is a renderer
 * deriving a user-facing sentence from a slug and a lookup table of its own,
 * which is two vocabularies for one fact and is the copy that drifts. Story
 * 2.14 renders these; it does not re-invent them.
 *
 * The `satisfies` is load-bearing rather than decorative: a feed added to
 * {@link MARKET_FEEDS} without words here is a compile error naming the missing
 * member, so the two cannot fall out of step — the same guard
 * `SECTOR_LABELS` and `/health`'s response schema already use.
 *
 * `synthetic`'s sentence is the one that does real work. `PROVIDER.md` §5.4:
 * because a fixture series carries `provider: "fixture"` and `feed:
 * "synthetic"`, a screenshot of a fixture-backed chart advertises itself in the
 * chrome **structurally**, without anybody remembering to add a `SAMPLE DATA`
 * banner. That is this record earning its place before anything renders it.
 */
export const MARKET_FEED_DESCRIPTIONS: Record<
  MarketFeed,
  MarketFeedDescription
> = {
  iex: {
    label: "IEX",
    sentence:
      "Trades reported by the IEX exchange only — not the full US consolidated tape.",
  },
  sip: {
    // **The one feed with no sentence, and it took three attempts to get here.**
    // It shipped as `"Consolidated tape"` over *"All US exchanges, via the
    // consolidated tape."* — the jargon as the big word and the meaning as the
    // small print. Swapping those gave *"The full consolidated tape, not a
    // single venue."*, which restated the label and bolted on a contrast with a
    // feed this deployment never shows. Then *"Known as the consolidated
    // tape."*, which is a fact nobody reading a status strip needs.
    //
    // The label says the whole thing. §7.1 asks that we not imply coverage we
    // lack; we have this coverage, and four plain words state it exactly. See
    // {@link MarketFeedDescription.sentence} for the rule that follows.
    label: "All US exchanges",
  },
  synthetic: {
    label: "Simulated",
    sentence: "Generated test data. Not a market feed.",
  },
};

// The annotation replaced `as const satisfies` when `sentence` became optional,
// and **the guard it existed for is fully preserved**: a `Record<MarketFeed,
// …>` still makes a feed added to `MARKET_FEEDS` without words a compile error
// naming the missing member. What is given up is literal types on the strings,
// which nothing read. What is bought is that `.sentence` now types as
// `string | undefined` at **every** call site rather than existing on two of
// three union members — so making it optional surfaced all six readers at
// compile time instead of one of them at run time.

/**
 * What has been done to the prices, and it is **asked for** rather than
 * inferred.
 *
 * Two members, and that is the decision rather than a starting point. A vendor
 * offering five is offering its own vocabulary; ours needs a reader per member,
 * which is `API_ERROR_CODES`' rule one layer up.
 *
 * - **`raw`** — what happened. Read by Story 2.8's store, which holds raw bars
 *   and never rewrites one because of a corporate action, and by Epic 13's
 *   replay, which has to reproduce what was knowable rather than what we know
 *   now.
 * - **`split-adjusted`** — read by Story 2.12's multi-year chart, and by **Epic
 *   5, which is the stronger reader**: §11 computes return percentiles over
 *   ~60 trading days, and an unadjusted 10-for-1 split is a **−90% return**
 *   sitting at the 100th percentile of every distribution it touches,
 *   producing a permanent, confident and entirely false anomaly.
 *
 * **Dividend adjustment is declined, with a trigger.** A dividend gap is a real
 * observed price move of typically well under 1%, it is not a cliff, and a
 * dividend-adjusted price *is not a price anybody saw*. Nothing in V1 computes
 * total return. The reversal trigger is the first reader that compares two
 * securities' **total** return rather than their price return. A combined
 * "adjust everything" member is declined too, and for a reason specific to this
 * module: it hides *which* adjustments were applied, which is the opposite of
 * what a provenance record is for.
 *
 * ## The consequence to know, because it is the thing that will actually happen
 *
 * **A series spanning no corporate action returns identical numbers in both
 * modes** — which is almost every series, almost all the time. So a wrong
 * adjustment argument is invisible in testing and wrong exactly once, on the
 * one name and the one week somebody is looking at. That is why there is
 * deliberately **no default value exported from this module**: acceptance
 * criterion 5 forbids one, because there is no safe value here, only a value
 * whose wrongness is deferred.
 */
export const ADJUSTMENTS = ["raw", "split-adjusted"] as const;

export type Adjustment = (typeof ADJUSTMENTS)[number];

/**
 * One place a stretch of a series came from.
 *
 * Note what is *not* here: {@link Adjustment}. See the module comment — putting
 * it on a source would make the incoherent stitch representable, which is
 * exactly the thing the shape is arranged to prevent.
 */
export interface BarSource {
  /** Who we got it from. */
  readonly provider: ProviderId;

  /** Which venues are in it. The invariant-6 field. */
  readonly feed: MarketFeed;

  /**
   * When it was retrieved, as an ISO 8601 UTC instant with the `Z`.
   *
   * **Stamped at fetch, and never re-stamped on read.** This repository has
   * fallen into the other version of this once already: Task 2.3.5 found that
   * defaulting a provenance date to `now()` makes it always today, which makes
   * it *permanently silent* — it can never report staleness, which is the only
   * thing it exists to do. The same trap is one careless line away here. A read
   * path that stamps this when it serves a stored series turns "these bars were
   * fetched three weeks ago" into "these bars are current".
   *
   * A `string` rather than a `Date` for `securities-response.ts`'s stated
   * reason: JSON has no date type, and epoch milliseconds is a number nobody
   * can read in a response body.
   */
  readonly retrievedAt: string;

  /**
   * How many of the series' bars came from this source.
   *
   * It exists so the record can be *checked* rather than trusted:
   * {@link toBarSeries} asserts these sum to the number of bars, which is what
   * catches a stitcher that concatenated two arrays and one provenance record.
   */
  readonly barCount: number;
}

declare const brand: unique symbol;

/**
 * Where a whole series came from, and what has been done to it.
 *
 * **Branded, and obtainable only from {@link toSeriesProvenance} or
 * {@link mergeSeriesProvenance}.** A plain interface would leave the refusal in
 * the module comment as an instruction rather than a mechanism: a stitcher
 * holding two series would write an object literal, pick one of the two
 * adjustment values, and nothing would ever notice. The brand is erased at
 * runtime, so it costs nothing on the wire and nothing in the bundle; the cost
 * is that a record parsed out of JSON is not one of these and has to be
 * re-validated, which is correct behaviour rather than friction — a record that
 * arrived from outside this process has been checked by nothing.
 */
export interface SeriesProvenance {
  /**
   * One value for the whole series, because a series holding two price scales
   * is not a series.
   */
  readonly adjustment: Adjustment;

  /**
   * Every place the bars came from, in the order they contribute. Non-empty.
   *
   * More than one entry means the series was stitched, which Story 2.8's read
   * path does routinely. They may disagree about feed and that is the point.
   */
  readonly sources: readonly [BarSource, ...BarSource[]];

  /** Type-system only; erased at runtime. */
  readonly [brand]: "SeriesProvenance";
}

/**
 * Builds a single-source {@link SeriesProvenance}.
 *
 * Exactly one source, deliberately: a multi-source record is a *stitch*, and
 * the only supported way to make one is {@link mergeSeriesProvenance}, which
 * always performs the check a hand-written literal would skip.
 *
 * `adjustment` is a required argument with no default, and there is no
 * `DEFAULT_ADJUSTMENT` anywhere in this package — acceptance criterion 5. It
 * throws rather than returning a result, as `toTicker` and `toTimeRange` do:
 * every refusal below is a programming error rather than a market condition,
 * and a market condition is what a result type exists for.
 */
export function toSeriesProvenance(
  adjustment: Adjustment,
  source: BarSource,
): SeriesProvenance {
  assertSource(source);
  const sources: readonly [BarSource, ...BarSource[]] = [source];
  return { adjustment, sources } as SeriesProvenance;
}

/**
 * Joins two or more series' provenance into one, **refusing the incoherent
 * case**.
 *
 * This is `PROVIDER.md` §2.4 as a mechanism rather than a sentence, and the two
 * halves have different answers on purpose:
 *
 * - **Feed disagreement is truthful.** The sources are concatenated and both
 *   feeds survive, so whatever renders this can say the series is part IEX and
 *   part something else. That is the whole reason `sources` is a list.
 * - **Adjustment disagreement is refused.** Raw and split-adjusted prices for
 *   one symbol are on two different scales; the joined array would have a cliff
 *   in it that is an artefact of our stitching rather than a market event, and
 *   every percentage change across the seam would be wrong. There is no
 *   truthful record for that series, so there is no series.
 *
 * At least two arguments, because merging one is a no-op that reads as a
 * mistake at the call site.
 */
export function mergeSeriesProvenance(
  first: SeriesProvenance,
  ...rest: readonly [SeriesProvenance, ...SeriesProvenance[]]
): SeriesProvenance {
  const all = [first, ...rest];

  const disagreeing = all.find((p) => p.adjustment !== first.adjustment);
  if (disagreeing !== undefined) {
    throw new RangeError(
      `Cannot join a ${first.adjustment} series to a ${disagreeing.adjustment} ` +
        `one: the two are on different price scales, so the joined array would ` +
        `have a step in it that is not a market event and every percentage ` +
        `change across the seam would be wrong. Request both stretches with ` +
        `the same adjustment.`,
    );
  }

  // Non-empty by construction: every input's `sources` is a non-empty tuple, so
  // joining at least two of them yields at least two entries. The cast is what
  // carries that fact from the argument types, which the compiler cannot see
  // through `flatMap`.
  const sources = all.flatMap((p) => p.sources) as unknown as readonly [
    BarSource,
    ...BarSource[],
  ];
  return { adjustment: first.adjustment, sources } as SeriesProvenance;
}

/**
 * Refuses a source whose fields are shaped like a mistake.
 *
 * `retrievedAt` gets a real check rather than a type annotation because it is
 * the one field here whose wrongness is *silent* and reaches a user: a
 * local-time stamp with an offset is a plausible-looking string that makes a
 * three-week-old series look three weeks fresher or staler than it is,
 * depending on which way somebody got it wrong. The canonical producer,
 * `Date.prototype.toISOString`, always ends in `Z`, so refusing an offset costs
 * a correct call site nothing.
 */
function assertSource(source: BarSource): void {
  if (!source.retrievedAt.endsWith("Z")) {
    throw new RangeError(
      `Source retrievedAt must be a UTC instant ending in Z, not ` +
        `${JSON.stringify(source.retrievedAt)}. An offset spelling is how a ` +
        `local-time stamp reaches a provenance record and makes a stale ` +
        `series look current.`,
    );
  }

  if (Number.isNaN(Date.parse(source.retrievedAt))) {
    throw new RangeError(
      `Source retrievedAt is not a parseable instant: ` +
        `${JSON.stringify(source.retrievedAt)}.`,
    );
  }

  if (!Number.isInteger(source.barCount) || source.barCount < 0) {
    throw new RangeError(
      `Source barCount must be a non-negative integer, not ` +
        `${String(source.barCount)}. It exists so the record can be checked ` +
        `against the bars rather than trusted.`,
    );
  }
}
