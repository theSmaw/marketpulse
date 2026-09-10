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
 *
 * > **Amended 2026-09-10 by Task 2.10.3, which is that first reader.** The
 * > predicate is at the foot of this file and the paragraph above is kept as
 * > the prediction it was, because **its second half was measured wrong while
 * > its first half held.** The constructors are *not* in the predicate, and
 * > {@link isBarSeriesResponse}'s own header carries the argument: a body that
 * > is exactly this shape and carries mis-ordered bars is our own server with a
 * > bug, and `api-client.ts` would report it as `unreadable-body`, whose
 * > documented meaning is *something that is not this API is answering at this
 * > address*. That is a diagnosis pointing at the wrong half of the system. The
 * > coherence check the paragraph is right to want is `toBarSeries`, and it
 * > belongs where the payload first becomes domain objects — Task 2.10.4's
 * > `market` module, which carries the obligation. **Discharged 2026-09-10:
 * > `apps/frontend/src/market/bar-series-payload.ts`.**
 */

import { TIMEFRAMES } from "./bar.js";
import type { Timeframe } from "./bar.js";
import {
  ADJUSTMENTS,
  MARKET_FEEDS,
  PROVIDER_IDS,
} from "./market-provenance.js";
import type { Adjustment, BarSource } from "./market-provenance.js";
import { SECURITY_STATUSES } from "./security.js";
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

/**
 * Is `value` a {@link BarSeriesResponse}?
 *
 * **This ships here, beside the shape, and it ships now rather than with the
 * contract** — Task 1.7.3's rule is that a predicate arrives with its first
 * reader, and Task 2.10.3's `getBarSeries` is that reader. The module comment
 * above records the absence as a decision rather than an omission; this is that
 * decision being paid off, and the reason it is not written at the call site is
 * `isSecuritiesResponse`'s: a validator written where it is used is a second
 * description of the same judgement, and it is the copy that drifts when the
 * interface moves.
 *
 * ## How strict it is, and why it is strict in exactly one direction
 *
 * There is a precedent on each side of this and neither is copied wholesale.
 * `isHealthResponse` deliberately accepts an unknown `status` and unknown extra
 * fields, because a newer server is a version skew rather than a broken one.
 * `isMarketDataResponse` is deliberately stricter about `feed`, because a slug
 * this bundle has no words for cannot be rendered honestly and must not reach a
 * component that would print it.
 *
 * **This one is `isMarketDataResponse`-strict about every closed vocabulary and
 * `isHealthResponse`-lenient about everything else.** The line is *would an
 * unrecognised value be rendered?*, which is the same asymmetry
 * `isSecurityCoverage` already draws between `timeframe` and an instant:
 *
 *  - **Refused: a `feed`, `provider`, `adjustment`, `timeframe` or
 *    `securityStatus` outside its const array.** `feed` is the invariant-6
 *    field — {@link MARKET_FEED_DESCRIPTIONS} is where a feed's words live, so
 *    an unknown slug is rendered raw or rendered as nothing, and both are the
 *    caption problem `market-provenance.ts` exists to prevent. The other four
 *    are the same argument with a different noun: each is a **discriminator a
 *    consumer switches on**, and this package has no words for a member it has
 *    not been taught. The skew window `isHealthResponse` guards is not open
 *    here either — every one of these unions lives in `packages/shared`, which
 *    is **inlined into the frontend bundle**, and `deploy.yml` ships both halves
 *    from one commit, so a client that does not know a value and a server that
 *    sends it cannot both be current.
 *  - **Accepted: unknown extra keys, anywhere.** `securities-response.ts` records
 *    that growing by gaining a key is the whole argument for an envelope, and a
 *    client that refuses a field it has not been taught cannot be deployed before
 *    the backend that adds one.
 *  - **Accepted: any string where the contract says instant.** `startsAt`,
 *    `retrievedAt` and both ends of both windows are checked for being strings
 *    and not for being parseable, which is `isSecurityCoverage`'s stated
 *    position: a value a consumer *renders* fails locally and visibly, where a
 *    discriminator it *switches on* fails silently. `Invalid Date`'s one virtue.
 *  - **Accepted: `symbol` as any string.** `toTicker` re-validates it where a
 *    branded `Ticker` is actually wanted; asserting the form here would be this
 *    module claiming a judgement it did not make.
 *
 * ## Two shapes that look like failures and are answers
 *
 * `MARKET-DATA-API.md` §6 makes both of these a **200**, and a predicate that
 * refused either would turn this contract's own empty answer into
 * `unreadable-body` — *something else is answering at this address* — which is
 * the most misleading diagnosis available.
 *
 *  - **`bars: []`**, with provenance and `coverage.requested` present. *We asked
 *    and we hold nothing for this symbol.*
 *  - **`coverage.covered` of `null`**, which is the same answer said the other
 *    way: an empty series reaches nowhere, and `null` rather than a zero-width
 *    window because `[t, t)` is refused at construction.
 *
 * What it *does* refuse is an **empty `sources` array**.
 * {@link SeriesProvenancePayload.sources} names this predicate as the place the
 * domain's non-emptiness is re-established on the way in, and the empty series
 * above is not the exception it looks like: `serve-series.ts` gives one exactly
 * one source, with `barCount: 0`. A series that came from nowhere is not a
 * series.
 *
 * ## What it deliberately does not check, and what that makes an
 * `unreadable-body` from this endpoint mean
 *
 * **It checks shape, never coherence.** It does not run `toTimeRange`,
 * `toSeriesProvenance` or `toBarSeries`, so it does not know whether the bars
 * ascend, whether the sources' `barCount`s sum to the bars, or whether `covered`
 * agrees with either. The module comment above anticipated that those
 * constructors would be the validation, and building this found the argument
 * against putting them here — which is about **what the answer would mean**
 * rather than about cost:
 *
 * `api-client.ts` maps a 2xx whose body fails its predicate to
 * `unreadable-body`, whose documented meaning is *something is answering at this
 * address and it is not this API* — the static host returning `index.html` at a
 * 200 this repository has measured twice. A body that is shaped exactly like
 * this contract and carries mis-ordered bars is the opposite diagnosis: it is
 * **our own server with a bug**, and reporting it as a stranger at the address
 * would send the next reader to the wrong half of the system. A predicate is
 * also the wrong instrument for it — it would have to `try`/`catch` three
 * throwing constructors, discard what they built, and let whatever wanted a
 * domain object build it again.
 *
 * So the sentence to carry: **an `unreadable-body` from `/market-data/bars` means
 * the body is not this contract's shape — a wrong host, or a vocabulary this
 * bundle predates. It never means the numbers disagree with each other.**
 *
 * The coherence check is still worth having and is not lost: it is what
 * `toBarSeries` does, and it belongs wherever the frontend first turns this
 * payload into domain objects. Task 2.10.4 owns that module and carried the
 * obligation: `apps/frontend/src/market/bar-series-payload.ts`, since
 * 2026-09-10, where a throw becomes a *failed* state rather than this
 * predicate's reading.
 */
export function isBarSeriesResponse(
  value: unknown,
): value is BarSeriesResponse {
  if (!isRecord(value)) return false;

  return (
    isBarSeriesPayload(value.series) &&
    isMember(SECURITY_STATUSES, value.securityStatus)
  );
}

/**
 * Is `value` a {@link BarSeriesPayload}?
 *
 * Not exported, for `securities-response.ts`'s reason: nothing outside this
 * module holds a bare series payload to check, and an exported predicate with
 * no caller is a second definition waiting to disagree with the one above it.
 */
function isBarSeriesPayload(value: unknown): value is BarSeriesPayload {
  if (!isRecord(value)) return false;

  return (
    typeof value.symbol === "string" &&
    isMember(TIMEFRAMES, value.timeframe) &&
    Array.isArray(value.bars) &&
    value.bars.every(isBarPayload) &&
    isSeriesProvenancePayload(value.provenance) &&
    isSeriesCoveragePayload(value.coverage)
  );
}

/** Is `value` a {@link BarPayload}? */
function isBarPayload(value: unknown): value is BarPayload {
  if (!isRecord(value)) return false;

  return (
    typeof value.startsAt === "string" &&
    typeof value.open === "number" &&
    typeof value.high === "number" &&
    typeof value.low === "number" &&
    typeof value.close === "number" &&
    typeof value.volume === "number"
  );
}

/**
 * Is `value` a {@link SeriesProvenancePayload}?
 *
 * The one place this predicate is stricter than the wire type it checks:
 * `sources` is typed as a plain array because a tuple has no JSON Schema the
 * server could enforce, and this is where the domain's non-emptiness is put
 * back — {@link SeriesProvenancePayload.sources} names this function for it.
 */
function isSeriesProvenancePayload(
  value: unknown,
): value is SeriesProvenancePayload {
  if (!isRecord(value)) return false;

  return (
    isMember(ADJUSTMENTS, value.adjustment) &&
    Array.isArray(value.sources) &&
    value.sources.length > 0 &&
    value.sources.every(isBarSource)
  );
}

/**
 * Is `value` a {@link BarSource}?
 *
 * `BarSource` is the one shape in this contract that is **not** twinned for the
 * wire — all four of its fields are already JSON-native — so this checks the
 * domain type directly, which is exactly why it can afford to.
 */
function isBarSource(value: unknown): value is BarSource {
  if (!isRecord(value)) return false;

  return (
    isMember(PROVIDER_IDS, value.provider) &&
    isMember(MARKET_FEEDS, value.feed) &&
    typeof value.retrievedAt === "string" &&
    typeof value.barCount === "number"
  );
}

/**
 * Is `value` a {@link SeriesCoveragePayload}?
 *
 * `covered` accepts `null` and refuses `undefined`, which is
 * `isSecurityLastClose`'s distinction and the same reason: the null carries
 * meaning — *the series is empty* — where an absent key would be a body from a
 * server that does not know about this field at all.
 */
function isSeriesCoveragePayload(
  value: unknown,
): value is SeriesCoveragePayload {
  if (!isRecord(value)) return false;

  return (
    isTimeWindowPayload(value.requested) &&
    (value.covered === null || isTimeWindowPayload(value.covered))
  );
}

/** Is `value` a {@link TimeWindowPayload}? */
function isTimeWindowPayload(value: unknown): value is TimeWindowPayload {
  if (!isRecord(value)) return false;

  return typeof value.start === "string" && typeof value.end === "string";
}

/** Anything with keys — the check every predicate above opens with. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Is `candidate` one of `values`?
 *
 * The `readonly string[]` widening is what lets a `const` array of literals be
 * asked about an `unknown`, and the return type is what carries the answer back
 * to the caller as a narrowing.
 */
function isMember<T extends string>(
  values: readonly T[],
  candidate: unknown,
): candidate is T {
  return (
    typeof candidate === "string" &&
    (values as readonly string[]).includes(candidate)
  );
}
