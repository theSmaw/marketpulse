// GET /market-data — which market feed this deployment is reading (Task 2.6.7).
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

import { MARKET_FEEDS } from "@marketpulse/shared";
import type { MarketDataResponse } from "@marketpulse/shared";

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
