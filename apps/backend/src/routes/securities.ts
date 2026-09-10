// GET /securities — the third route this server has, and the first that
// returns data (Task 2.4.2). Since Task 2.8.9 it also answers **how much market
// history we hold for each of them**, which is the first thing this API has
// ever said about the market rather than about its own configuration.
//
// Everything below is one of three things: the wire shape, the schema that
// enforces it, and one decision about where this route is registered. The
// wire shape lives in `packages/shared` and the argument for its envelope is
// there; this file is the server's rendering of it.
//
// ## Why the schema is the interesting half
//
// Fastify serialises a schema'd response through `fast-json-stringify`, which
// **strips every property the schema does not declare**. That is the mechanism
// behind Story 1.7's "no internal detail reaches a client", and it is silent in
// the other direction: a field added to `SecuritiesResponse` and forgotten here
// vanishes from the wire with a green build, a green lint and a passing test.
// `satisfies Record<keyof T, JsonSchemaProperty>` is what turns that into
// `TS1360`, and this route applies it **five times** — the envelope, a
// security, a provenance record, a coverage record and a last close — because
// the guard checks top-level keys and does not reach into a nested object.
// Nothing forces any application after the first; `json-schema.ts` records that
// as the limit.
//
// The stripping is asserted on this route rather than on a copy of its schema,
// through a `preSerialization` hook in the tests. An `onSend` hook is handed a
// string that has already been stripped, so it can only ever confirm itself.
//
// ## Where it is registered, which is a decision and not a default
//
// **From `index.ts`, like `/diagnostics/database`, and not from
// `buildServer()`.** Task 2.4.2's own brief recommended the opposite — put the
// repository into `ServerOptions` and fire the reversal trigger `database.ts`
// records — and that turns out to be blocked by an ordering the brief did not
// have in front of it:
//
//   - the route needs a `SecuritiesRepository`;
//   - the repository is built over the process's one `pg.Pool`;
//   - `createDatabasePool` takes a `DatabaseLogger`, and the only logger this
//     application has is `app.log`, which does not exist until `buildServer()`
//     has returned. `pino` is not importable from this package at all — pnpm's
//     strict linking hides it, since it arrives transitively through Fastify —
//     so there is no second logger to hand it.
//
// So `ServerOptions.securities` is unconstructible before the call it would be
// an argument to. Three ways out were considered and all three are worse than
// the thing they buy: a repository built over a thunk that closes over a
// binding assigned on the next line; a `createSecurities(log)` factory in
// `ServerOptions`, which makes `index.ts` recover the pool out of a callback in
// order to close it; and splitting the pool's construction from its `error`
// handler, which is the one line in `database.ts` whose absence crash-loops the
// replica. Each is a closure trick or a resource-lifecycle change bought to
// move a registration by one file.
//
// The cost of registering here is the one Task 2.1.7 already paid and named: a
// server built by `buildServer()` alone does not have this route, so
// `server.test.ts`'s route-table walk does not see it *by construction*. That
// is closed rather than accepted — the walk now registers this route and the
// diagnostics one the way `index.ts` does, so it covers every route this
// application serves rather than every route the factory happens to know about.
// What it cannot cover is a route registered in `index.ts` and forgotten there,
// which is a stated gap of the third kind.
//
// **The reversal trigger is therefore restated rather than deleted**, in
// `database.ts` where it lives: what would fire it is the repository becoming
// constructible without the application's logger, or a route that must exist
// before the pool does.

import type { FastifyPluginCallback } from "fastify";

import {
  marketDateAt,
  SECTORS,
  SECURITY_KINDS,
  SECURITY_STATUSES,
  TIMEFRAMES,
} from "@marketpulse/shared";
import type {
  FieldGroupProvenance,
  SecuritiesProvenance,
  SecuritiesResponse,
  Security,
  SecurityCoverage,
  SecurityLastClose,
  Timeframe,
} from "@marketpulse/shared";

import { throughDatabase } from "../database.js";
import { apiErrorSchema } from "../errors.js";
import { installResponseValidator, REVALIDATE } from "../http-cache.js";
import type { JsonSchemaProperty } from "../json-schema.js";
import type {
  BarCoverage,
  LastClose,
  MarketBarsRepository,
} from "../market-bars.js";
import type { SecuritiesRepository } from "../securities.js";

// One security on the wire.
//
// `keyof Security` over the three-variant union is the keys the variants share,
// which is all eight of them — they differ in their field *types* rather than
// in which fields exist. If a variant ever gains a field of its own this guard
// stops covering it silently, which is the same warning `SECURITY_FIELD_GROUP`
// carries in `packages/shared`.
//
// The three nullable fields declare `["string", "null"]`. That is not
// decoration, and the measurement behind it came out worse than the guess:
// declared plainly `"string"`, an index proxy's genuine `null` `sector` reaches
// the wire as the **empty string**. Not `null`, and not the string `"null"`
// either — `""`, which is falsy, so a client that branches on truthiness keeps
// working and a client that renders the value shows a blank cell reading as
// "unclassified". That is precisely the inference Task 2.3.1 rejected when it
// made `Security` a discriminated union rather than one interface with a
// nullable sector, arriving through the serialiser instead.
//
// `enum` on the three closed vocabularies, so the union is enforced from the
// same const arrays the type is built from and the two cannot disagree — the
// shape `/health` and `apiErrorSchema` already have. `sector`'s enum admits
// `null` for the same reason its type does.
const securityProperties = {
  symbol: { type: "string" },
  name: { type: "string" },
  exchange: { type: "string" },
  kind: { type: "string", enum: SECURITY_KINDS },
  sector: { type: ["string", "null"], enum: [...SECTORS, null] },
  industry: { type: ["string", "null"] },
  status: { type: "string", enum: SECURITY_STATUSES },
  cik: { type: ["string", "null"] },
} satisfies Record<keyof Security, JsonSchemaProperty>;

const securitySchema: JsonSchemaProperty = {
  type: "object",
  properties: securityProperties,
  // Derived rather than written out, so it cannot fall behind the properties it
  // lists. Every field of a `Security` is always present — a null `sector` is a
  // present null rather than an absent field, which is the whole point of the
  // union — so this is total and stays that way.
  required: Object.keys(securityProperties),
};

const fieldGroupProvenanceProperties = {
  source: { type: "string" },
  retrievedAt: { type: "string" },
} satisfies Record<keyof FieldGroupProvenance, JsonSchemaProperty>;

const fieldGroupProvenanceSchema: JsonSchemaProperty = {
  type: "object",
  properties: fieldGroupProvenanceProperties,
  required: Object.keys(fieldGroupProvenanceProperties),
};

const provenanceProperties = {
  profile: fieldGroupProvenanceSchema,
  classification: fieldGroupProvenanceSchema,
} satisfies Record<keyof SecuritiesProvenance, JsonSchemaProperty>;

// One coverage record on the wire.
//
// The **fourth** application of the `satisfies` guard on this route, and it is
// needed for the reason the third was: the guard checks top-level keys and does
// not reach into a nested object, so nothing about the envelope's guard makes a
// field added to `SecurityCoverage` and forgotten here anything other than a
// field that silently vanishes from the wire.
//
// `enum: TIMEFRAMES` for the reason the three vocabularies above carry one: the
// wire's word and the type's members come from the same const array, so they
// cannot disagree. Nothing here is nullable, so no `["string", "null"]` — the
// absence this contract expresses is a **missing record**, not a null field.
const coverageProperties = {
  symbol: { type: "string" },
  timeframe: { type: "string", enum: TIMEFRAMES },
  start: { type: "string" },
  end: { type: "string" },
  barCount: { type: "number" },
} satisfies Record<keyof SecurityCoverage, JsonSchemaProperty>;

const coverageSchema: JsonSchemaProperty = {
  type: "object",
  properties: coverageProperties,
  required: Object.keys(coverageProperties),
};

// One last close on the wire.
//
// The **fifth** application of the `satisfies` guard on this route, for the
// fourth's reason: the guard checks top-level keys and does not reach into a
// nested object, so nothing about the envelope's guard would stop a field added
// to `SecurityLastClose` from silently vanishing.
//
// `previousClose` declares `["number", "null"]` and that is the one line here
// worth measuring rather than trusting. `sector` next door is the recorded
// precedent: declared plainly `"string"`, a genuine `null` reaches the wire as
// the **empty string**. The numeric analogue is worse — a `null` under a plain
// `"number"` serialises as **`0`**, which is not obviously wrong, renders as a
// price, and turns "we hold one session and cannot compare it" into a −100%
// move. The nullable case is therefore asserted on the raw body rather than on
// `response.json()`, which is exactly what would hide it.
//
// `session` is a plain `"string"`: `MarketDate` is a branded string and JSON
// has no brands, so what crosses the wire is the eleven characters
// `marketDateAt` produced. The client's predicate is what re-establishes the
// brand, which is the same division `Ticker` already has.
const lastCloseProperties = {
  symbol: { type: "string" },
  session: { type: "string" },
  close: { type: "number" },
  previousClose: { type: ["number", "null"] },
} satisfies Record<keyof SecurityLastClose, JsonSchemaProperty>;

const lastCloseSchema: JsonSchemaProperty = {
  type: "object",
  properties: lastCloseProperties,
  // Total, and stays total: a null `previousClose` is a present null rather
  // than an absent field, which is the whole point of declaring it nullable.
  required: Object.keys(lastCloseProperties),
};

const securitiesProperties = {
  securities: { type: "array", items: securitySchema },
  coverage: { type: "array", items: coverageSchema },
  lastCloses: { type: "array", items: lastCloseSchema },
  provenance: {
    type: "object",
    properties: provenanceProperties,
    required: Object.keys(provenanceProperties),
  },
} satisfies Record<keyof SecuritiesResponse, JsonSchemaProperty>;

const securitiesSchema = {
  response: {
    200: {
      type: "object",
      properties: securitiesProperties,
      // A **literal** and not `Object.keys(...)`, unlike `/health`, and that is
      // the one place this schema departs from the established idiom. Deriving
      // it would mark `provenance` required, and a required property the
      // handler omits is a 500 at runtime with `"provenance" is required!` —
      // which is every response from an empty table, and every response at all
      // once Story 2.7 makes the rows disagree. `apiErrorSchema` has the same
      // shape for the same reason: `details` is optional there.
      //
      // `coverage` **is** listed, which is the difference between the two: it
      // is always sent, empty when the store holds nothing, and its contract
      // says why (an absent field would give "we hold nothing yet" a second
      // spelling). `lastCloses` joined it on the same argument at Task 2.9.7.
      // So the literal is now three of four keys rather than one, and the one
      // it omits is the one whose absence carries meaning.
      required: ["securities", "coverage", "lastCloses"],
    },

    // Declared, and doing real work here rather than as ceremony. This handler
    // *can* fail: `toSecurity` throws `SecurityMappingError` on a row the
    // database's own check constraints should have refused, and the read fails
    // whole rather than dropping the row — Task 2.4.1's decision, because a
    // universe list silently one security short is indistinguishable from a
    // universe one security smaller, and that number is a claim this product
    // makes on screen.
    //
    // Nothing catches it here, deliberately. Task 1.7.4's error handler maps an
    // uncaught throw to a **500 and `INTERNAL_ERROR`**, which is the right
    // answer: a malformed row is this server having failed rather than the
    // client having asked wrongly. A 503 is the shape `database.ts` reserves for
    // a database that is *unavailable*, which is a different failure with a
    // different instruction to the client.
    //
    // **Amended 2026-09-09 by Task 2.9.6.** This paragraph used to end "and its
    // `SERVICE_UNAVAILABLE` code does not exist yet … a connection that fails is
    // that other case and is still Story 2.9's". The code exists now and this
    // route answers it — see the `throughDatabase` call in the handler. A
    // malformed row is unchanged and still a 500.
    //
    // The two properties worth stating: the thrown message names the offending
    // symbol and **must not reach the client**, which is Task 1.7.4's rule that
    // a 5xx never carries the thrown message; and the response is still the
    // `ApiError` shape, which is what this line buys, because a route-level
    // response schema is the only place Fastify applies the serialiser to what
    // an error handler sends. Both are asserted rather than assumed.
    // Added by Task 2.9.6 with `SERVICE_UNAVAILABLE` itself: the database being
    // unreachable is a dependency that is down rather than this server having
    // failed, and this route reads three queries out of that database. The
    // paragraph above is amended by it rather than rewritten — the reasoning
    // that a malformed row is a 500 is unchanged and still the common case.
    503: apiErrorSchema,
    500: apiErrorSchema,
  },
};

/**
 * The series this endpoint reports on, stated once.
 *
 * The ledger holds a row per `(security, timeframe)` and this route sends the
 * minute half; `SecuritiesResponse.coverage` carries the argument. It is a
 * constant rather than a query parameter because a parameter is a second
 * decision — which series does a list of securities describe? — that nothing
 * on the page can make, and Story 2.11's per-security route is where the daily
 * depth belongs.
 */
const REPORTED_TIMEFRAME: Timeframe = "1m";

/**
 * The ledger's statement, as the wire says it.
 *
 * One function beside the query for `toSecurity`'s reason, and it is where the
 * two representational decisions land: a `Date` becomes an ISO 8601 instant,
 * and `covered` — a `TimeRange`, half-open — becomes the two fields the
 * contract names. `barCount` is a `number` on both sides; `market-bars.ts`
 * records why that is safe against a universe-wide ceiling of ~50.5M rows.
 */
function toWireCoverage(coverage: BarCoverage): SecurityCoverage {
  return {
    symbol: coverage.symbol,
    timeframe: coverage.timeframe,
    start: coverage.covered.start.toISOString(),
    end: coverage.covered.end.toISOString(),
    barCount: coverage.barCount,
  };
}

/**
 * The series the last close is read from.
 *
 * **`1d` where {@link REPORTED_TIMEFRAME} is `1m`**, and the two constants
 * disagreeing is the decision rather than an oversight. Coverage answers *how
 * much history do we hold*, which is about the minute series every chart reads;
 * a close is the **official session close**, which only a daily bar carries —
 * `bar.ts` records that a close derived from single-venue minute bars may not
 * contain the auction print, so it would be a different and worse number rather
 * than the same one computed twice. `SecuritiesResponse.lastCloses` carries the
 * argument at length.
 *
 * It is also what makes the read cheap: 345k daily rows against 47.7M minute
 * ones, two per security through the existing index.
 */
const CLOSE_TIMEFRAME: Timeframe = "1d";

/**
 * The last close, as the wire says it.
 *
 * One function beside the query for `toWireCoverage`'s reason, and it holds the
 * one representational decision this field has: a daily bar's `observed_at`
 * becomes a **market date** rather than an ISO instant. `marketDateAt` and not
 * `toISOString().slice(0, 10)` — `market-time.ts` is the one module permitted
 * to convert and a lint rule enforces it (ADR 0017). It matters here rather
 * than being ceremony: a daily bar is labelled at market midnight, which is
 * 04:00Z in summer and 05:00Z in winter, and a slice of the ISO string is right
 * both times by luck and wrong the day the vendor labels a bar at the open
 * instead.
 *
 * `previousClose` passes through untouched, `null` included. The change itself
 * is not computed here: `PriceChange`'s header draws that line — a band name is
 * a decision this server reports, the direction of a move is arithmetic on two
 * numbers already on the wire.
 */
function toWireLastClose(close: LastClose): SecurityLastClose {
  return {
    symbol: close.symbol,
    session: marketDateAt(close.observedAt),
    close: close.close,
    previousClose: close.previousClose,
  };
}

/**
 * The route, as a factory over two repositories rather than over a pool.
 *
 * The interfaces are the narrower dependency: this file never learns there is a
 * driver, a connection or a query builder, and a test drives every branch of it
 * over stubs with no database at all — which is what keeps `pnpm verify`
 * passing with nothing listening.
 *
 * **The second one is a `Pick` and not the whole repository**, which is the
 * same instinct one level finer. `MarketBarsRepository` can write bars, upsert
 * a ledger row and read fifty million rows back; this route may do exactly two
 * of those things, and narrowing the parameter is what says so in a way the
 * compiler holds. It also keeps the stub in the tests two functions long — and
 * it is the line that had to be *widened* by hand at Task 2.9.7, which is the
 * `Pick` working: a route reaching for a new read announces itself in its own
 * signature rather than acquiring the capability silently.
 */
export function createSecuritiesRoutes(
  securities: SecuritiesRepository,
  bars: Pick<MarketBarsRepository, "listCoverage" | "readLastCloses">,
): FastifyPluginCallback {
  return (app, _options, done) => {
    // ## This route is IN Task 2.9.8's scope, and only half of it (2026-09-10)
    //
    // The question that task asks explicitly, so a later reader finding one
    // route cached and the other not does not read it as an oversight: **the
    // validator is here, a freshness lifetime is not, and neither is the answer
    // cache.**
    //
    // **Why the validator is in.** Task 2.9.7 put `lastCloses` on this
    // response — the close of a session that has closed, for 518 securities,
    // which is *precisely* the immutable thing 2.9.8's objective names,
    // changing once a day when the nightly catch-up runs. It is also the bigger
    // payload of the two this story serves, fetched once per page load by
    // `useSecurities`. Leaving it out would mean the first question a reader
    // asks — *is my price fresh?* — has one answer on `/market-data/bars` and a
    // different one here, with two rules to keep in step. One rule, one
    // mechanism, both routes.
    //
    // **Why no `max-age`.** This response has no window. `series-cache.ts`'s
    // immutability predicate is a statement about a resolved range, and there
    // is nothing here to resolve — the body is *the universe as of now*, and
    // this route carries the same envelope trap from the other direction: it is
    // immutable in its closes and mutable in its rows, because `securities`
    // carries `status` and `pnpm universe` can flip one at any moment. A
    // lifetime derived from the calendar would be a promise about the closes
    // covering the rows. So: revalidate, always, and let the `ETag` save the
    // ~190 kB rather than the round-trip.
    //
    // **Why no answer cache.** `series-cache.ts` exists to bound a *metered
    // vendor request*, and there is no provider on this path — the four reads
    // behind this body are the universe, its provenance, the ~1,036-row ledger
    // and two daily bars per security, all of which `market-bars.ts` measured
    // and none of which touch the minute table. Caching them would be a second
    // cache with no cost to save, and `index.ts` records why this route has no
    // TTL of its own.
    installResponseValidator(app);

    app.get(
      "/securities",
      { schema: securitiesSchema },
      async (request, reply) => {
        // Three reads, concurrently. They are separate queries rather than one
        // widened select because `Security` carries no provenance and should not
        // start; `securities.ts` records the snapshot-skew that costs and why it
        // is accepted. The third inherits that same skew and it matters even
        // less: a security added between the first read and the third has no
        // coverage record, which is exactly how a security with no bars is
        // reported anyway.
        //
        // **The third is a read of the ledger and never of `market_bars`.**
        // That is the property the whole column depends on — a few hundred rows
        // regardless of how many bars exist — and it is why `bar_coverage`
        // exists at all. A `count(*)` here would be a page load scanning fifty
        // million rows, and it would arrive in Story 2.9's response-time work
        // as a mystery.
        //
        // **Wrapped for the 503 since Task 2.9.6**, which added
        // `SERVICE_UNAVAILABLE` and its status-to-code mapping. This route has
        // been able to produce this failure since Story 2.4 and answered a 500
        // only because the code did not exist — the comment on the schema above
        // says so in terms. Taken here rather than deferred, because a member
        // that exists and is used by one of two routes that can produce the same
        // failure is two answers to one question. A malformed row is still a
        // 500: that is this server having failed, and `isDatabaseUnavailable`
        // rethrows it untouched.
        const [list, provenances, coverage, lastCloses] = await throughDatabase(
          "The securities store",
          () =>
            Promise.all([
              securities.listSecurities(),
              securities.listSecuritiesProvenance(),
              bars.listCoverage(),
              // **The fourth read, and the first on this route that touches
              // `market_bars` at all.** It touches the daily half of it, two
              // rows per security through the existing index — `readLastCloses`
              // carries the measurement and the 200×-worse shape it rejects.
              // The skew it inherits is the same one the third does and matters
              // as little: a security added between reads has no close, which
              // is exactly how a security with no daily bars is reported
              // anyway.
              bars.readLastCloses(CLOSE_TIMEFRAME),
            ]),
        );

        // The envelope's `provenance` is a claim about **every** security in this
        // response, so it is made exactly when the table agrees. `distinct`
        // returning one row is that condition; anything else is not a fault to
        // hide but a fact to report.
        const [provenance, ...rest] = provenances;

        if (rest.length > 0) {
          // Story 2.7 arriving, or a partial load. Either way the envelope cannot
          // carry provenance any more and the payload has to grow a per-row
          // shape — so this record is the thing that says so, at `warn` because
          // the response is still correct and this server has not failed. Through
          // `request.log`, so it carries the `reqId` already on the reply.
          request.log.warn(
            { distinctProvenanceRecords: provenances.length },
            "securities no longer share one provenance record; the response omits it and per-row provenance is now needed",
          );
        }

        // Spread rather than assigned, which is `exactOptionalPropertyTypes`
        // doing its job: `provenance: undefined` is a different type from an
        // absent `provenance`, and the difference is exactly the one this
        // contract is making — "we are not claiming this" rather than "this is
        // unknown". The same branch `apiError()` takes for `details`.
        const body: SecuritiesResponse = {
          securities: list,
          // Filtered here rather than in the repository, so `listCoverage`
          // stays the general read its own contract describes and this route
          // owns the one decision that is about *this page*. The cost is
          // reading ~1,036 rows to send ~518, which is a rounding error against
          // the 518 securities in the same response.
          coverage: coverage
            .filter((record) => record.timeframe === REPORTED_TIMEFRAME)
            .map(toWireCoverage),
          // `Map` → array, ordered by the map's insertion order, which is the
          // query's `order by securities.symbol`. Stated rather than relied
          // upon: nothing on the page reads this array in order (the client
          // keys it by symbol immediately), so the ordering is a property of
          // the payload being diffable rather than a contract.
          lastCloses: [...lastCloses.values()].map(toWireLastClose),
          ...(provenance !== undefined && rest.length === 0
            ? { provenance }
            : {}),
        };

        // Revalidate-always, which is what earns the `ETag` the hook above
        // computes (Task 2.9.8). `no-cache` is *store this and ask me before
        // using it*, not *do not store it*; the saving is a `304` in place of
        // ~190 kB, on a response the page fetches on every load.
        reply.header("cache-control", REVALIDATE);

        // 200 stated rather than left to Fastify's default, for the reason
        // `/health` states it: this route's status code is part of its contract
        // with Task 2.4.3's client.
        return reply.code(200).send(body);
      },
    );

    done();
  };
}
