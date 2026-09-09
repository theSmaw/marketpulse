/**
 * The wire contract for `GET /market-data/bars` (Task 2.9.3).
 *
 * Here rather than in `apps/backend` for Story 1.6's test — shared means both
 * sides depend on the same fact — and it sits beside `bar.ts`, `bar-series.ts`
 * and `market-provenance.ts` rather than inside them for
 * `securities-response.ts`'s reason. Those files say what a bar, a series and
 * its provenance **are**, and three later epics read them without caring how
 * one arrives. This file says what one **response** looks like, which is a fact
 * about this API's transport and nothing else.
 *
 * `MARKET-DATA-API.md` settled the shape a task earlier and none of it is
 * re-decided here: the path (§1), the always-absolute window (§2), no
 * server-side reduction (§3), the 10,000-bar cap (§4), the stitch (§5) and
 * which situation is which HTTP status (§6).
 *
 * ## Why these types exist at all, when the domain already has them
 *
 * `BarSeries`, `SeriesProvenance` and `TimeRange` are all **branded**, and a
 * brand is a compile-time claim that a value passed through a constructor that
 * checked it. Nothing that arrives as JSON has. So a wire type is not a
 * duplicate of the domain type — it is the honest description of a thing that
 * has been checked by nobody, and the domain type is what you get back after
 * re-validating it. `bar-series.ts` states that cost in terms: *"a series parsed
 * out of JSON is not a `BarSeries` and has to be re-validated"*.
 *
 * Two mechanical consequences follow, and both would otherwise be discovered
 * awkwardly:
 *
 *  - **A branded interface cannot be the subject of the schema guard.** The
 *    brand is a `unique symbol` key, so `Record<keyof BarSeries,
 *    JsonSchemaProperty>` demands a property for a symbol no schema can carry.
 *  - **`Date` is not a wire type.** `Bar.startsAt`, `TimeRange.start` and
 *    `TimeRange.end` are `Date`s in the domain and ISO 8601 UTC strings here,
 *    per `CALENDAR.md` §5 — with the `Z`, and with `America/New_York` existing
 *    only at the moment of display. There is no timezone in this payload and
 *    there must not be one.
 *
 * The `Payload` suffix marks exactly that difference at a call site, so the
 * checked object and the parsed one cannot be confused for each other. What is
 * **not** re-declared is {@link BarSource}: every one of its four fields is
 * already JSON-native — `retrievedAt` is a string precisely because JSON has no
 * date type — so a wire twin of it would be a second copy of a shape that
 * agrees with the first only until somebody edits one.
 *
 * ## Why an envelope rather than a bare series
 *
 * `securities-response.ts`'s argument, one resource over: a bare series has
 * nowhere to put a fact that is true of the **answer** rather than of the
 * series, and there is already one such fact — whether we still track the
 * security. `MARKET-DATA-API.md` §7 requires it: `status` is not filtered on
 * this path, so a request for an `untracked` symbol returns its stored history
 * **and says the security is untracked**, because a 404 there would be a lie
 * about data we hold.
 *
 * It could have been flattened into the series object, and that was refused for
 * the reason `bar-series.ts` gives for putting coverage on the series rather
 * than on an envelope, read in the other direction: a security's status is not
 * a property of a run of bars, and a payload that mixes the two produces a
 * series-shaped object carrying a field `BarSeries` deliberately does not have.
 * Nesting means {@link BarSeriesResponse.series} re-validates into a `BarSeries`
 * on its own, with nothing to strip first.
 *
 * ## What it deliberately does not carry
 *
 * **A feed on the envelope.** `GET /market-data` is the one home for *which
 * feed is this deployment reading* (Task 2.6.7), and per-source provenance is
 * already on the series. A second field answering the first question is the
 * thing that route's amendment forbids.
 *
 * **A `complete` flag, or any other derived summary of coverage.** Story 2.14's
 * *"we have data through 15:42"* is `coverage.covered.end`, computed by whoever
 * makes the claim — the reason `securities-response.ts` refused a `count`: a
 * second copy of a fact whose only interesting behaviour is to disagree with
 * the first.
 *
 * **A `reduction` record.** `MARKET-DATA-API.md` §3 decided the server never
 * reduces a series, so there is no reduction to declare. The shape the repair
 * would take is recorded there rather than pre-built here: a record naming
 * `from`, `bucket` and `method`, and never a new member of `TIMEFRAMES`.
 *
 * **An `isBarSeriesResponse` predicate.** Task 1.7.3's rule is that a validator
 * ships with its first reader, because one written anywhere but beside its
 * shape drifts from it — and the first reader is Story 2.10's frontend
 * market-data layer. `isSecuritiesResponse` waited for Task 2.4.3 for the same
 * reason and this absence is the same decision, not an omission. What it will
 * have to do is more than the universe's envelope needed, and worth stating
 * now: the domain constructors are the validation. A body re-checked field by
 * field and never passed through `toTimeRange`, `toSeriesProvenance` and
 * `toBarSeries` is a body whose bars may be out of order and whose sources may
 * not add up, which are exactly the failures those constructors exist to catch.
 */

import type { Timeframe } from "./bar.js";
import type { Adjustment, BarSource } from "./market-provenance.js";
import type { SecurityStatus } from "./security.js";

/**
 * A half-open window on the wire, `[start, end)`.
 *
 * `TimeRange`'s convention and its two `Date`s, spelled as the two ISO 8601 UTC
 * instants JSON can carry. Half-open is what lets adjacent windows tile without
 * a bar at the seam belonging to both, and it is why a consumer rendering
 * *"through when"* reports the session containing `end − 1ms` rather than `end`
 * — `securities-response.ts` says the same thing about `SecurityCoverage`.
 *
 * A separate shape rather than four flat fields on {@link SeriesCoveragePayload}
 * because `covered` is nullable as a **whole**: `coveredStart` and `coveredEnd`
 * would be two nulls that can disagree, and a half-null pair is a state the
 * domain cannot represent and no consumer could act on.
 */
export interface TimeWindowPayload {
  /** The first instant in the window, inclusive, as an ISO 8601 UTC instant. */
  readonly start: string;

  /** The first instant **not** in it, as an ISO 8601 UTC instant. */
  readonly end: string;
}

/**
 * What was asked for, and how much of it this answer reaches.
 *
 * `SeriesCoverage` on the wire, and this is the field that carries the partial
 * answer `MARKET-DATA-API.md` §6 makes a **200** rather than an error. All
 * three of *"we hold all of it"*, *"we hold up to 15:42"* and *"we hold nothing
 * for this symbol"* are answers, and they differ only here.
 */
export interface SeriesCoveragePayload {
  /**
   * Exactly the window that was asked for — **always the resolved absolute
   * range**, whichever form the caller used.
   *
   * `MARKET-DATA-API.md` §2: the named form (`sessions=5`) is sugar that
   * resolves server-side through the trading calendar, and reporting the
   * resolved range back is what makes a named request and an absolute request
   * the same answer rather than two. It is also the only way a client can tell
   * what "5 sessions" meant, since it cannot compute today's market date
   * correctly from a browser clock.
   */
  readonly requested: TimeWindowPayload;

  /**
   * The window this answer actually reaches, or `null` when the series is
   * empty.
   *
   * **`null` and never `""`,** which is a schema decision as much as a type
   * one: `routes/securities.ts` measured that a nullable field declared plainly
   * `"string"` reaches the wire as the empty string — falsy, so a client
   * branching on truthiness keeps working while a client rendering it shows a
   * blank. Here that would turn *"we hold nothing"* into *"we hold up to the
   * empty string"*, which is the partial answer this contract exists to state
   * honestly. The schema declares the nullable form and a test asserts it on
   * the **raw body**, because `JSON.parse` is exactly what hides the
   * difference.
   *
   * `null` rather than a zero-width window for `bar-series.ts`'s reason:
   * ranges are half-open and `[t, t)` is refused at construction, and *"we can
   * make no claim"* and *"we cover an instant"* are different statements. An
   * empty answer says nothing here about **why** it is empty; a consumer that
   * needs to tell *"nothing traded"* from *"we never asked"* reads
   * {@link requested} beside it.
   *
   * It says how far the answer **reaches, not whether it is dense**. A thinly
   * traded name with no print in a given minute produces a covered window with
   * holes in it.
   */
  readonly covered: TimeWindowPayload | null;
}

/**
 * Where a series came from, and what has been done to its numbers.
 *
 * `SeriesProvenance` unbranded, carrying {@link BarSource} unchanged. Both
 * halves matter and neither may be flattened away:
 *
 *  - **`adjustment` is on the record and not on a source**, because two sources
 *    that disagree about it are not a series at all — raw and split-adjusted
 *    prices are on two different price scales, so an array holding both has a
 *    cliff in it that is an artefact of our own stitching and every percentage
 *    change across the seam is wrong. `mergeSeriesProvenance` refuses that join
 *    and this shape must not make the refusal unrepresentable.
 *  - **`sources` is a list**, because a stitched series may name two feeds
 *    truthfully. `MARKET-DATA-API.md` §5 is the case: the stored part is `sip`
 *    and Epic 3's live tail is `iex`, in one series, and §7.1 requires each to
 *    be labelled for what it is rather than the pair being given one name.
 *    Today both parts report `sip` and the seam is invisible in the payload;
 *    that is correct and it is not the steady state.
 */
export interface SeriesProvenancePayload {
  /** One value for the whole series. */
  readonly adjustment: Adjustment;

  /**
   * Every place the bars came from, in the order they contribute.
   *
   * **Non-empty in practice and typed as a plain array**, which is the one
   * place this file is weaker than the domain type it mirrors. `SeriesProvenance`
   * types it `[BarSource, ...BarSource[]]`; a tuple has no JSON Schema
   * equivalent `fast-json-stringify` would enforce, so declaring one here would
   * be a claim the wire cannot keep. The non-emptiness is re-established where
   * it can be checked, which is `toSeriesProvenance` on the way out and the
   * predicate Story 2.10 writes on the way in.
   *
   * `barCount` on each source is what lets the record be **checked** rather
   * than trusted: `toBarSeries` asserts the counts sum to the bars it holds, so
   * a stitch that concatenated two arrays and kept one provenance record throws
   * rather than lying. A consumer that re-validates gets that check for free.
   */
  readonly sources: readonly BarSource[];
}

/**
 * One price observation on the wire.
 *
 * `Bar` with its instant as a string. The five numbers are **JSON numbers**,
 * which `bar.ts` settled along with the guard that comes with it and is
 * restated here because this is where a consumer meets them: an aggregate over
 * prices is computed in SQL over `numeric`, never in JavaScript over this type.
 * Float addition is not associative, so a sum can disagree with itself between
 * two renders because a query plan changed the order.
 *
 * `startsAt` marks the instant the interval **begins**, and the name is the
 * mechanism rather than a label — both conventions exist in the wild, and a
 * one-minute systematic error is invisible on a chart and wrong in every
 * anomaly calculation.
 *
 * Measured at 109.4–113.6 bytes per bar across eight securities spanning the
 * price and liquidity range, which is where `MARKET-DATA-API.md` §4's cap of
 * 10,000 bars gets its wire cost. Re-measure rather than cite: §8 records the
 * method.
 */
export interface BarPayload {
  /** The instant the interval begins, as an ISO 8601 UTC instant. */
  readonly startsAt: string;

  /** First trade price in the interval. */
  readonly open: number;

  /** Highest trade price in the interval. */
  readonly high: number;

  /** Lowest trade price in the interval. */
  readonly low: number;

  /** Last trade price in the interval. */
  readonly close: number;

  /** Shares traded in the interval. */
  readonly volume: number;
}

/**
 * A run of bars for one symbol, at one timeframe, with the record of where they
 * came from.
 *
 * `BarSeries` unbranded. Every field is here because the domain type has it,
 * and the two that look redundant beside {@link BarSeriesResponse} are not:
 * `symbol` and `timeframe` echo what was asked for, which is what lets a client
 * holding several of these tell them apart without keeping the request beside
 * each one — Story 2.12's chart and §18's comparison both do exactly that.
 */
export interface BarSeriesPayload {
  /**
   * The security, as a `Ticker` would spell it — a plain `string` here because
   * a brand does not survive JSON and a consumer re-validates with `toTicker`.
   */
  readonly symbol: string;

  /** The interval each bar covers. One of `TIMEFRAMES`. */
  readonly timeframe: Timeframe;

  /**
   * Ascending by `startsAt`, strictly. **May be empty**, and an empty array is
   * an answer rather than an error: it is *"we asked and we hold nothing"*,
   * which arrives as a 200 with {@link SeriesCoveragePayload.covered} null.
   *
   * At most `MAX_SERIES_BARS` of them. A window that would produce more is
   * refused with a 400 naming the limit, before any query runs — there is no
   * pagination and no silent reduction, because a chart drawn from fewer bars
   * than were asked for is wrong and looks right.
   */
  readonly bars: readonly BarPayload[];

  /** Where they came from, and what has been done to the numbers. */
  readonly provenance: SeriesProvenancePayload;

  /** How far this answer reaches, against what was asked for. */
  readonly coverage: SeriesCoveragePayload;
}

/**
 * The body of `GET /market-data/bars`.
 */
export interface BarSeriesResponse {
  /** The answer: bars, where they came from, and how far they reach. */
  readonly series: BarSeriesPayload;

  /**
   * Whether we still track this security.
   *
   * **The field `MARKET-DATA-API.md` §7 requires to exist**, and the reason it
   * is on the envelope rather than on the series is that it is a fact about the
   * security rather than about a run of bars. `status` is this schema's one
   * invisible predicate (`UNIVERSE.md` §12.2) and this path is firmly on the
   * *do not filter* side: bars stored against a security we have since stopped
   * tracking are still what happened, so a series request for an `untracked`
   * symbol returns its stored history and says so. Stories 2.7 and 2.8 filter
   * and this does not, and that asymmetry is deliberate.
   *
   * Named for its subject rather than called `status`, because an envelope
   * field called `status` beside an HTTP status code is a field two readers
   * will understand differently.
   *
   * Always present: a symbol this system has never heard of is a **404**, so
   * there is no unknown case for this field to spell. That is the sentence that
   * settles the temptation to make it nullable — a 404 is about the *security*,
   * never about the *data*.
   */
  readonly securityStatus: SecurityStatus;
}
