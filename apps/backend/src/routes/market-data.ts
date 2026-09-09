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
  MARKET_FEEDS,
  PROVIDER_IDS,
  SECURITY_STATUSES,
  TIMEFRAMES,
} from "@marketpulse/shared";
import type {
  BarPayload,
  BarSeriesPayload,
  BarSeriesResponse,
  BarSource,
  MarketDataResponse,
  SeriesCoveragePayload,
  SeriesProvenancePayload,
  TimeWindowPayload,
} from "@marketpulse/shared";

import { apiErrorSchema } from "../errors.js";
import type { JsonSchemaProperty } from "../json-schema.js";
import type { MarketData } from "../market-data.js";

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

/**
 * The route, as a factory taking the resolved market data.
 *
 * It takes {@link MarketData} rather than the whole `Config`, for
 * `buildServer`'s stated reason: a factory takes what the application needs
 * rather than everything the process read. That also keeps this file unable to
 * see a credential.
 *
 * **Registered from `index.ts` rather than inside `buildServer()`**, which
 * follows `/diagnostics/database` and `/securities` and keeps one rule rather
 * than two: `/health` needs nothing and lives in the factory; a route with a
 * dependency is registered where its dependency is constructed. This one
 * *could* have gone in the factory — `resolveMarketData` needs no pool and no
 * logger, so the ordering that blocked `/securities` does not apply — and
 * putting it there would have meant a required `ServerOptions` field and a
 * change to every test that builds a server, to move one registration by one
 * file. The cost is the one Task 2.1.7 named: `server.test.ts`'s route-table
 * walk sees this route only because that walk registers what `index.ts`
 * registers, which it does.
 */
export function createMarketDataRoutes(
  marketData: MarketData,
): FastifyPluginCallback {
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
    app.get("/market-data", { schema: marketDataSchema }, async () =>
      Promise.resolve(body),
    );

    done();
  };
}
