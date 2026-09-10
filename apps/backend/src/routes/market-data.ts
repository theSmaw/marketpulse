// GET /market-data — which market feed this deployment is reading (Task 2.6.7),
// and, since Task 2.9.3, the response schema for GET /market-data/bars, whose
// route Task 2.9.6 registers. `/market-data` is a resource AND the namespace
// for everything whose subject is the market rather than the security
// (`MARKET-DATA-API.md` §1); the schema is in the second half of this file,
// under its own heading, because a schema belongs beside the route that serves
// it.
//
// The fourth route this server has, and the smallest: one field, no arguments,
// no dependency that can fail. What it exists for is on the *other* side of the
// wire — the header's `Market feed` region has rendered a hard-coded
// `DISCONNECTED` since Story 1.5, and this is the endpoint that lets it stop.
//
// ## Why it is not a field on something that already exists
//
// `packages/shared/src/market-data-response.ts` carries the argument, because
// the shape is the decision. The short form of both rejections:
//
//   - **`/health`.** Settled by Task 2.1.7 and not reopened. It says nothing
//     about dependencies, byte for byte, and three platform probes point at it.
//   - **`/securities`.** Structurally unable to serve this: the chrome renders
//     on all five routes and `useSecurities` fetches only on `/securities`, so
//     four routes out of five — including the landing route — would show an
//     empty region.
//
// **Story 2.9 owns the market-data contract and this is a first cut of it.**
// Recorded in that story's file rather than only here, the way Story 2.4's
// pre-emptions were.
//
// ## Why it reports a CONFIGURATION and not a request outcome
//
// The eight-member error taxonomy is about **one request** — `rate-limited`,
// `upstream-unavailable`, `unauthorised` — produced and consumed inside this
// package. This route answers a question that is true before any request is
// made and stays true while one fails, and the chrome makes no market-data
// request at all. Rendering a per-request outcome in a status strip would be
// the `FeedStatus` widening Task 1.12.4 already refused, wearing a different
// costume. Story 2.12 renders a failed fetch, beside the thing that failed to
// load.
//
// So this route cannot fail in any way of its own: `resolveMarketData` reads a
// frozen configuration object and constructs a provider, both synchronous, and
// there is nothing here to be unavailable. It still declares `500:
// apiErrorSchema` for the reason every other route does — if that ever stops
// being true, the failure answers in the contracted shape rather than
// Fastify's default one.

import type { FastifyPluginCallback } from "fastify";

import {
  ADJUSTMENTS,
  apiError,
  MARKET_FEEDS,
  PROVIDER_IDS,
  SECURITY_STATUSES,
  TIMEFRAMES,
} from "@marketpulse/shared";
import type {
  Bar,
  BarPayload,
  BarSeries,
  BarSeriesPayload,
  BarSeriesResponse,
  BarSource,
  MarketDataResponse,
  SecurityStatus,
  SeriesCoverage,
  SeriesCoveragePayload,
  SeriesProvenancePayload,
  TimeRange,
  TimeWindowPayload,
} from "@marketpulse/shared";

import { throughDatabase } from "../database.js";
import { apiErrorSchema } from "../errors.js";
import { installResponseValidator } from "../http-cache.js";
import type { JsonSchemaProperty } from "../json-schema.js";
import type { MarketBarsRepository } from "../market-bars.js";
import type { MarketData } from "../market-data.js";
import type { SecuritiesRepository } from "../securities.js";
import { createSeriesCache, seriesCacheControl } from "../series-cache.js";
import type { SeriesCache } from "../series-cache.js";
import { parseSeriesRequest } from "../series-request.js";
import type { SeriesRequestQuery } from "../series-request.js";
import { serveSeries } from "../serve-series.js";

// `["string", "null"]` and an `enum` admitting `null`, both measured rather
// than assumed. `routes/securities.ts` found that a genuinely null value under
// a plain `"string"` declaration reaches the wire as the **empty string** — not
// `null`, and not `"null"` — which is falsy, so a client branching on
// truthiness keeps working and a client rendering the value shows a blank. The
// enum is the same guard `/health` and `apiErrorSchema` use: the vocabulary is
// enforced from the const array the type is built from, so the two cannot
// disagree.
const marketDataProperties = {
  feed: { type: ["string", "null"], enum: [...MARKET_FEEDS, null] },
} satisfies Record<keyof MarketDataResponse, JsonSchemaProperty>;

const marketDataSchema = {
  response: {
    200: {
      type: "object",
      properties: marketDataProperties,
      // Derived rather than written out, so it cannot fall behind the
      // properties it lists. `feed` is always present — a `null` feed is a
      // present null rather than an absent field, which is what lets the
      // predicate refuse a missing one.
      required: Object.keys(marketDataProperties),
    },
    500: apiErrorSchema,
  },
};

// ---------------------------------------------------------------------------
// GET /market-data/bars — the response schema (Task 2.9.3).
//
// The type lives in `packages/shared/src/bar-series-response.ts`; this is the
// other half of the contract, and it is here rather than there for the reason
// `json-schema.ts` states in terms: `JsonSchemaProperty` is deliberately not in
// `packages/shared`, because nothing outside this application declares a
// response schema and Story 1.6's rule is that shared means both sides depend
// on the same fact. Task 2.9.3's brief says "the response types and their
// schemas live in packages/shared"; the schemas are here instead, following
// `/health`, `/securities` and `/market-data`, because moving the guard's type
// into the shared package to satisfy the letter of that sentence would put a
// backend transport concern into the frontend bundle and reverse a decision two
// files argue for. The task file records the deviation.
//
// It is in this file rather than a new one because `/market-data` is the
// namespace as well as a resource (`MARKET-DATA-API.md` §1) and a schema
// belongs beside the route that serves it. **Task 2.9.6 registers that route**
// and exports nothing new to do it.
//
// ## The guard is applied SEVEN times, and nothing forces any of them
//
// `satisfies Record<keyof T, JsonSchemaProperty>` checks the **top-level keys**
// of one object against one type and **does not reach into a nested object**.
// `routes/securities.ts` applies it four times for exactly that reason. This
// response nests deeper — envelope → series → coverage → window, and series →
// provenance → source — so there are seven shapes and each gets its own
// application. A field added to any one interface and forgotten in its schema
// is then `TS1360` naming that object, rather than a value that silently
// vanishes from the wire because `fast-json-stringify` strips what the schema
// does not declare.
//
// The `enum`s come from the same const arrays their types are built from, so
// the wire's vocabulary and the type's members cannot disagree — the shape
// `/health`, `apiErrorSchema` and `/securities` already have.

// A half-open window. `start` and `end` are ISO 8601 UTC instants with the `Z`;
// there is no timezone in this payload, per `CALENDAR.md` §5.
const timeWindowProperties = {
  start: { type: "string" },
  end: { type: "string" },
} satisfies Record<keyof TimeWindowPayload, JsonSchemaProperty>;

const timeWindowSchema: JsonSchemaProperty = {
  type: "object",
  properties: timeWindowProperties,
  required: Object.keys(timeWindowProperties),
};

// The same shape, nullable — and this is the one declaration in the file that
// carries a product decision rather than a mechanical one.
//
// `coverage.covered` is `null` exactly when the series is empty, which is how
// this contract says *"we asked and we hold nothing for this symbol"* as a 200
// rather than as an error (`MARKET-DATA-API.md` §6). Declared without the
// `"null"` member the serialiser does not emit `null` — `routes/securities.ts`
// measured a nullable **string** reaching the wire as `""`, and the object case
// is the same class of loss — so the honest empty answer would arrive as
// something a client reads as a covered window. Asserted on the raw body in
// this route's tests, because `JSON.parse` is exactly what hides it.
const nullableTimeWindowSchema: JsonSchemaProperty = {
  type: ["object", "null"],
  properties: timeWindowProperties,
  required: Object.keys(timeWindowProperties),
};

// What was asked for, and how much of it the answer reaches. Both keys are
// required: `covered` is a **present null** rather than an absent field, so a
// client can tell "the series is empty" from "this server did not say".
const seriesCoverageProperties = {
  requested: timeWindowSchema,
  covered: nullableTimeWindowSchema,
} satisfies Record<keyof SeriesCoveragePayload, JsonSchemaProperty>;

const seriesCoverageSchema: JsonSchemaProperty = {
  type: "object",
  properties: seriesCoverageProperties,
  required: Object.keys(seriesCoverageProperties),
};

// One source of a series' bars. `BarSource` is the domain type unchanged — all
// four fields are already JSON-native — so this guard is over the shared
// interface itself rather than over a wire twin of it.
//
// `barCount` is the field that makes the record checkable rather than
// trustworthy: `toBarSeries` asserts these sum to the bars the series holds, so
// a stitch that concatenated two arrays and kept one provenance record throws
// instead of lying. Dropping it here would remove a consumer's ability to run
// that same check.
const barSourceProperties = {
  provider: { type: "string", enum: PROVIDER_IDS },
  feed: { type: "string", enum: MARKET_FEEDS },
  retrievedAt: { type: "string" },
  barCount: { type: "number" },
} satisfies Record<keyof BarSource, JsonSchemaProperty>;

const barSourceSchema: JsonSchemaProperty = {
  type: "object",
  properties: barSourceProperties,
  required: Object.keys(barSourceProperties),
};

// Where the series came from. `sources` is an ARRAY because a stitched series
// may name two feeds truthfully (`MARKET-DATA-API.md` §5): the stored part is
// `sip` and Epic 3's live tail is `iex`, in one series. `adjustment` is on the
// record and not on a source, because two sources disagreeing about it are not
// a series — raw and split-adjusted prices are on different scales and every
// percentage change across the seam would be wrong.
const seriesProvenanceProperties = {
  adjustment: { type: "string", enum: ADJUSTMENTS },
  sources: { type: "array", items: barSourceSchema },
} satisfies Record<keyof SeriesProvenancePayload, JsonSchemaProperty>;

const seriesProvenanceSchema: JsonSchemaProperty = {
  type: "object",
  properties: seriesProvenanceProperties,
  required: Object.keys(seriesProvenanceProperties),
};

// One bar. Five JSON numbers and an instant, which is `bar.ts`'s field set
// exactly — with the guard that travels with it: an aggregate over prices is
// computed in SQL over `numeric`, never in JavaScript over these.
const barProperties = {
  startsAt: { type: "string" },
  open: { type: "number" },
  high: { type: "number" },
  low: { type: "number" },
  close: { type: "number" },
  volume: { type: "number" },
} satisfies Record<keyof BarPayload, JsonSchemaProperty>;

const barSchema: JsonSchemaProperty = {
  type: "object",
  properties: barProperties,
  required: Object.keys(barProperties),
};

// The series itself. Every key is required, including `bars`: an empty array is
// an ANSWER — "we asked and we hold nothing" — and an absent field would give
// that state a second spelling.
const barSeriesProperties = {
  symbol: { type: "string" },
  timeframe: { type: "string", enum: TIMEFRAMES },
  bars: { type: "array", items: barSchema },
  provenance: seriesProvenanceSchema,
  coverage: seriesCoverageSchema,
} satisfies Record<keyof BarSeriesPayload, JsonSchemaProperty>;

const barSeriesSchema: JsonSchemaProperty = {
  type: "object",
  properties: barSeriesProperties,
  required: Object.keys(barSeriesProperties),
};

// The envelope. `securityStatus` is the field `MARKET-DATA-API.md` §7 requires
// to exist: `status` is not filtered on this path, so a series request for an
// `untracked` symbol returns its stored history and says the security is
// untracked — a 404 there would be a lie about data we hold.
const barSeriesResponseProperties = {
  series: barSeriesSchema,
  securityStatus: { type: "string", enum: SECURITY_STATUSES },
} satisfies Record<keyof BarSeriesResponse, JsonSchemaProperty>;

/**
 * The response schema for `GET /market-data/bars`.
 *
 * Exported for Task 2.9.6, which registers the route. It is a full Fastify
 * `schema` object rather than a bare property so the route inherits the status
 * codes with it — and every one of them is settled by `MARKET-DATA-API.md` §6
 * rather than by the route:
 *
 *  - **200** carries the body above, including both partial answers: bars
 *    covering less than was asked for, and no bars at all.
 *  - **400** is every refusal `parseSeriesRequest` can produce — a malformed
 *    timeframe, a reversed range, both window forms at once, an over-cap window
 *    and a window outside the calendar's 2024–2028 range.
 *  - **404** is an unknown **security**, and never an empty series.
 *  - **503** is a database that is unavailable, which is a dependency being
 *    down rather than this server having failed. It needs `API_ERROR_CODES`'
 *    fourth member, which Task 2.9.6 adds with `errors.ts`'s status-to-code
 *    mapping in the same change — a 503 raised before that answers
 *    `INTERNAL_ERROR`, which names the wrong thing.
 *  - **500** is anything uncaught, carrying the correlation id and never the
 *    thrown message.
 *
 * All five error statuses share `apiErrorSchema`, which is what makes a
 * route-level schema the only place Fastify applies the serialiser to what an
 * error handler sends.
 */
export const barSeriesResponseSchema = {
  response: {
    200: {
      type: "object",
      properties: barSeriesResponseProperties,
      // Derived rather than written out, so it cannot fall behind the
      // properties it lists. Unlike `/securities` this is safe to derive:
      // neither key is optional, because neither absence would mean anything —
      // an empty series is spelled by an empty `bars` array and a null
      // `covered`, not by a missing field.
      required: Object.keys(barSeriesResponseProperties),
    },
    400: apiErrorSchema,
    404: apiErrorSchema,
    503: apiErrorSchema,
    500: apiErrorSchema,
  },
};

// ---------------------------------------------------------------------------
// The domain object on the wire (Task 2.9.6)
// ---------------------------------------------------------------------------

/**
 * A domain {@link TimeRange} as the wire says a window.
 *
 * ISO 8601 with the `Z`, which is `toISOString()`'s only output and therefore a
 * choice made by not making one. Epoch milliseconds was the alternative and is
 * refused for `securities.ts`' reason: a response nobody can read by eye is a
 * response nobody checks.
 */
function toTimeWindow(range: TimeRange): TimeWindowPayload {
  return { start: range.start.toISOString(), end: range.end.toISOString() };
}

/** A bar, with its one `Date` flattened. Every other field is already a number. */
function toBarPayload(bar: Bar): BarPayload {
  return {
    startsAt: bar.startsAt.toISOString(),
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  };
}

/**
 * Coverage, and the one field in this whole mapping that is not a format
 * change.
 *
 * `covered` is `null` exactly when the series is empty, and the null is the
 * answer rather than a missing value: it says *we asked over `requested` and
 * hold nothing in it*. `toBarSeries` enforces the correspondence on the domain
 * side, so this branch cannot invent a null the domain would refuse — it is
 * carrying one through.
 */
function toSeriesCoverage(coverage: SeriesCoverage): SeriesCoveragePayload {
  return {
    requested: toTimeWindow(coverage.requested),
    covered: coverage.covered === null ? null : toTimeWindow(coverage.covered),
  };
}

/**
 * A {@link BarSeries} and a security's status, as the response body.
 *
 * **One function, written out, rather than a generic mapper** — `market-bars.ts`
 * settled that rule for `toBar` on the way in and this is the same rule going
 * out. The mapping is exactly where a domain guarantee decides how to become a
 * wire value, and a generic mapper is where those decisions get skipped. Three
 * of them happen here and each is worth naming:
 *
 *  1. Every `Date` becomes an ISO 8601 UTC instant with the `Z` — `startsAt`
 *     and both ends of both windows.
 *  2. `coverage.covered` becomes `null` rather than an object when the series
 *     is empty. See {@link toSeriesCoverage}.
 *  3. The **branded** `SeriesProvenance` becomes a plain
 *     `SeriesProvenancePayload`, losing a guarantee the wire cannot keep. The
 *     brand asserts that `toSeriesProvenance` checked the source counts against
 *     the bars; JSON carries no brands, so a client that wants that guarantee
 *     re-derives it from the numbers, which are all present. Spelling the loss
 *     out is the point — a cast would hide it.
 *
 * `symbol` widens from `Ticker` to `string` for the same reason and by the same
 * mechanism: the payload type says `string`, and a client validates or does not.
 *
 * `securityStatus` is a parameter rather than a field of the series, because it
 * is a fact about the **security** and not about the data
 * (`MARKET-DATA-API.md` §7). It is never null: an unknown security is the 404.
 */
export function toBarSeriesResponse(
  series: BarSeries,
  securityStatus: SecurityStatus,
): BarSeriesResponse {
  return {
    series: {
      symbol: series.symbol,
      timeframe: series.timeframe,
      bars: series.bars.map(toBarPayload),
      provenance: {
        adjustment: series.provenance.adjustment,
        sources: series.provenance.sources,
      },
      coverage: toSeriesCoverage(series.coverage),
    },
    securityStatus,
  };
}

// ---------------------------------------------------------------------------
// The route
// ---------------------------------------------------------------------------

/**
 * What the pair of routes in this file needs.
 *
 * A named object rather than four positional arguments, which is a departure
 * from `createSecuritiesRoutes(securities, bars)` and is deliberate: two
 * repositories of related shape next to each other is a call site where a
 * transposition typechecks in some future where their interfaces converge. It
 * also makes {@link now} optional without it being "the fourth one".
 */
export interface MarketDataRouteDependencies {
  /** The resolved provider selection, for `GET /market-data`. */
  readonly marketData: MarketData;

  /** The bar store `GET /market-data/bars` reads. */
  readonly bars: MarketBarsRepository;

  /**
   * The universe, for the one question this route asks of it.
   *
   * Narrowed to `findSecurity` rather than taking the whole repository, so the
   * dependency says what it uses — and so a test needs one stub function.
   */
  readonly securities: Pick<SecuritiesRepository, "findSecurity">;

  /**
   * The clock, injected so a test can pin a named window.
   *
   * Defaulted rather than required, because `index.ts` has no clock to pass and
   * inventing one there would put a seam in the process for the benefit of a
   * test file.
   */
  readonly now?: () => Date;

  /**
   * The answer cache, defaulted to a fresh one (Task 2.9.8).
   *
   * **One per registration, which is one per process**, so `index.ts` passes
   * nothing and every test that builds a server gets an empty cache without
   * asking for one. That default is what keeps this from being a seam a suite
   * has to remember: a test asserting a cache hit registers one plugin and
   * injects twice, and a test asserting anything else is unaffected because its
   * server is new.
   *
   * Injectable at all so a test can hold the same cache across two servers, and
   * so a future diagnostic can read {@link SeriesCache.size} without reaching
   * into a closure.
   */
  readonly cache?: SeriesCache;
}

/**
 * The message an unknown symbol gets.
 *
 * It names the symbol, which is **the client's own input coming back** and is
 * the reflection decision `errors.ts` records in full. It deliberately does not
 * name the route — the 404 handler declines to for the same reason — and it
 * says *this system* rather than *the market*, because a symbol we do not track
 * is not a symbol that does not exist.
 */
function unknownSecurityMessage(symbol: string): string {
  return (
    `${symbol} is not a security this system tracks. ` +
    `The tracked universe is listed at /securities.`
  );
}

/**
 * The routes, as a factory taking what they need.
 *
 * It takes {@link MarketData} rather than the whole `Config`, for
 * `buildServer`'s stated reason: a factory takes what the application needs
 * rather than everything the process read. That also keeps this file unable to
 * see a credential.
 *
 * **Registered from `index.ts` rather than inside `buildServer()`**, which
 * follows `/diagnostics/database` and `/securities` and keeps one rule rather
 * than two: `/health` needs nothing and lives in the factory; a route with a
 * dependency is registered where its dependency is constructed. `/market-data`
 * alone *could* have gone in the factory; `/market-data/bars` could not, because
 * it needs the pool — so the question the earlier note left open is now closed
 * by the second route rather than by preference. The cost is the one Task 2.1.7
 * named: `server.test.ts`'s route-table walk sees these routes only because that
 * walk registers what `index.ts` registers, which it does.
 *
 * **Both routes in one plugin because `/market-data` is the namespace as well
 * as a resource** (`MARKET-DATA-API.md` §1). Splitting them would put two
 * registrations of one namespace in `index.ts` and give the schema in this file
 * a reader in another.
 */
export function createMarketDataRoutes(
  dependencies: MarketDataRouteDependencies,
): FastifyPluginCallback {
  const {
    marketData,
    bars,
    securities,
    now = () => new Date(),
    cache = createSeriesCache(),
  } = dependencies;

  // Read once, at registration. The configuration is frozen and the provider is
  // constructed at startup, so re-deriving this per request would be work that
  // cannot produce a different answer.
  const body: MarketDataResponse = {
    // `undefined` — no provider configured — becomes `null` on the wire, which
    // is the one place this route makes a judgement. `feed === null` is how the
    // contract spells *"no market-data provider is configured"*, and it is
    // exact because every provider declares a feed.
    feed: marketData.provider?.feed ?? null,
  };

  return (app, _options, done) => {
    // The `ETag` and the `304`, scoped by Fastify's encapsulation to this
    // plugin's two routes (Task 2.9.8). It computes nothing for a response
    // whose handler did not set `Cache-Control`, which is how `GET
    // /market-data` — a standing configuration, one field, not worth a
    // validator — opts out by saying nothing.
    installResponseValidator(app);

    app.get("/market-data", { schema: marketDataSchema }, async () =>
      Promise.resolve(body),
    );

    // `GET /market-data/bars` — the first route in this application whose
    // response size depends on what the caller asked for, and the first that
    // serves data out of the store.
    //
    // ## The status table, which is the handler's whole shape
    //
    // | Situation                                              | Answer |
    // | ------------------------------------------------------ | ------ |
    // | Any of `parseSeriesRequest`'s five refusals            | 400 `BAD_REQUEST`, the refusal's own message |
    // | Symbol is not a security we know                       | 404 `NOT_FOUND` |
    // | We hold nothing for it, or nothing traded in the window| 200, empty series, `covered: null` |
    // | We hold part of the window                             | 200, `covered` narrower than `requested` |
    // | The live tail failed                                   | 200, the stored part |
    // | The database is unavailable                            | 503 `SERVICE_UNAVAILABLE` |
    // | Anything uncaught                                      | 500 `INTERNAL_ERROR`, never the thrown message |
    //
    // Every row is `MARKET-DATA-API.md` §6's, restated here because this is
    // where it is implemented and a table split between a document and a handler
    // is a table that drifts.
    //
    // ## No `querystring` schema, and that was produced rather than assumed
    //
    // This is the first route here with a query string, so the question was
    // open. Measured against Fastify 5 with its default ajv, on a throwaway
    // route declaring the obvious schema:
    //
    //   ?symbol=NVDA&symbol=AMD&timeframe=1m
    //     → 400 {"code":"FST_ERR_VALIDATION","message":"querystring/symbol must be string"}
    //   ?symbol=NVDA&timeframe=5m
    //     → 400 {"code":"FST_ERR_VALIDATION","message":"querystring/timeframe must be equal to one of the allowed values"}
    //
    // Both are refused **before the handler runs**, in Fastify's error shape and
    // Fastify's vocabulary. That is the deciding measurement: it would leave
    // `parseSeriesRequest`'s five reasons as dead code for exactly the inputs
    // they were written for, give one request two error vocabularies, and
    // replace *"5m" is not a timeframe. Expected 1m or 1d.* with *must be equal
    // to one of the allowed values*, which does not say what they are.
    //
    // The second measurement is coercion, which ajv does by default here:
    //
    //   sessions declared `integer`, `?sessions=5`  → the handler sees the
    //     number 5, not the string "5"
    //   symbol declared `array`, `?symbol=NVDA`     → the handler sees ["NVDA"]
    //
    // `series-request.ts` types every query value `unknown` precisely so that a
    // repeated key — which arrives as an **array** — is refused with a sentence
    // saying a series is for one symbol. A schema would rewrite the input on the
    // way to the parser that exists to judge it.
    //
    // So: no request schema, and the response schema stays. The reversal
    // trigger is a query parameter whose validation `parseSeriesRequest` cannot
    // express, not a preference for declared inputs.
    app.get<{ Querystring: SeriesRequestQuery }>(
      "/market-data/bars",
      { schema: barSeriesResponseSchema },
      async (request, reply) => {
        // **Read once and passed everywhere.** `parseSeriesRequest` resolves a
        // named window against it and `serveSeries` bounds the live tail
        // against it; two readings is how one request gets answered as of two
        // different moments, which at a session boundary is a window and a
        // bound that disagree.
        const instant = now();

        const parsed = parseSeriesRequest(request.query, instant);

        if ("refusal" in parsed) {
          // At `info`, with the machine-readable reason rather than the
          // sentence: a refused request is ordinary traffic and the client's
          // mistake, and Task 1.7.1's property is that a healthy server is
          // silent at `warn`. A server refusing bad windows is healthy.
          request.log.info(
            { reason: parsed.refusal.reason },
            "series request refused",
          );

          return reply
            .code(400)
            .send(apiError("BAD_REQUEST", parsed.refusal.message, request.id));
        }

        const { symbol, timeframe, range, windowForm } = parsed.request;

        // The universe first, because a 404 must not depend on whether the
        // store happens to hold anything — §6's sentence is that a 404 is about
        // the security, never about the data, and asking in the other order is
        // how that gets inverted by accident.
        const security = await throughDatabase("The market-data store", () =>
          securities.findSecurity(symbol),
        );

        if (security === undefined) {
          request.log.info({ symbol }, "series requested for unknown security");

          return reply
            .code(404)
            .send(
              apiError("NOT_FOUND", unknownSecurityMessage(symbol), request.id),
            );
        }

        // **Set before the answer is computed and regardless of how it is
        // computed** (Task 2.9.8). A cached answer and a freshly read one are
        // the same answer to the same question, so they carry the same
        // freshness — a header that differed between a hit and a miss would
        // make a client's cache lifetime a function of ours, which is a
        // coupling nothing needs and nobody could reason about.
        //
        // `seriesCacheControl` is what decides it, from the **resolved** range
        // and the form the caller used, through Story 2.5's calendar. The
        // header is also the signal `installResponseValidator` reads: a
        // response that sets it gets an `ETag`, and one that does not gets
        // neither that nor a `304`.
        reply.header(
          "cache-control",
          seriesCacheControl(windowForm, range, instant),
        );

        const key = { symbol, timeframe, range };

        // The cache sits **here** — after the universe lookup and in front of
        // `serveSeries` — and `series-cache.ts` carries the argument at length.
        // The short form: the point read above is what keeps a 404 a statement
        // about the security, keeps `securityStatus` current, and keeps a
        // database that is down a 503 rather than a cached 200.
        const cached = cache.read(key, instant);

        const served =
          cached ??
          (await throughDatabase("The market-data store", () =>
            serveSeries(
              { bars, provider: marketData.provider, log: request.log },
              symbol,
              timeframe,
              range,
              instant,
            ),
          ));

        if (cached === undefined) cache.write(key, served, instant);

        // The two empty answers, told apart in the log and nowhere else.
        //
        // `held === undefined` is *we hold nothing for this (symbol,
        // timeframe)*; a present ledger row with an empty series is *the window
        // had no prints in it*. Both are the same 200 body, deliberately — §6
        // — and the distinction is what Story 2.14's wording will be built from.
        // It is available here without a second query because Task 2.9.4 put the
        // ledger row beside the series.
        if (served.series.bars.length === 0) {
          request.log.debug(
            {
              symbol,
              timeframe,
              held: served.held !== undefined,
              tail: served.tail.attempted
                ? served.tail.result.outcome
                : served.tail.reason,
            },
            served.held === undefined
              ? "series is empty: nothing held for this security and timeframe"
              : "series is empty: the window contains no bars we hold",
          );
        }

        // `tail` is otherwise deliberately *not* on the payload. Every non-`ok`
        // outcome is already logged under this request's `reqId` by
        // `serveSeries`, and the provider's eight-member taxonomy is an internal
        // vocabulary that must not reach a client. What a client needs in order
        // to say *"displaying data through 15:42"* is `coverage.covered`, which
        // ends where the answer ends whether the tail succeeded, was declined or
        // failed — one field that is always true rather than two that can
        // disagree. The reversal trigger is a client that has to distinguish
        // *the tail failed* from *there was no tail to fetch*; §36's degrade-
        // locally rule is about the workspace, and this route's honest partial
        // answer is the window.
        return reply
          .code(200)
          .send(toBarSeriesResponse(served.series, security.status));
      },
    );

    done();
  };
}
