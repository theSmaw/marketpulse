/**
 * The wire contract for `GET /market-data` (Task 2.6.7).
 *
 * One question, asked once per page load: **which market feed is this
 * deployment reading?** It is here rather than in `apps/backend` for Story
 * 1.6's test — shared means both sides depend on the same fact — and this one
 * has two sides from the moment it exists, because the whole point of the task
 * is that the chrome renders the *backend's* configuration rather than a
 * literal of its own.
 *
 * ## Why this is not a field on an existing response
 *
 * `/health` was settled by Task 2.1.7 and is not reopened: it says nothing
 * about dependencies, byte for byte, and it has five readers and three platform
 * probes pointed at it.
 *
 * `/securities` was the cheap candidate and it is **structurally unable** to
 * serve this, which is a stronger objection than the one Task 2.6.7's brief
 * anticipated. That brief worried about conflating two provenance records that
 * answer different questions — true, and secondary. The decisive fact is that
 * the thing rendering this is the **chrome**, which is on all five routes,
 * while `useSecurities` fetches only on `/securities`. A field there would
 * leave the market-feed region empty on four routes out of five, including the
 * landing route, which is the one the product opens on.
 *
 * So it is a small endpoint of its own. **Story 2.9 owns the market-data
 * contract and this is a first cut of it**, recorded in that story's file the
 * way Story 2.4's pre-emptions of 2.9, 2.10 and 2.11 were.
 *
 * ## Why the body is one field, and what a second one would have to earn
 *
 * The reflex is `{ provider, feed }`, and `provider` is **not** here because
 * nothing reads it. `API_ERROR_CODES`' rule governs a response's fields as much
 * as a union's members: a field exists when something reads it. Two facts make
 * the provider redundant today:
 *
 *  - Every provider declares its feed (`MarketDataProvider.feed`), so
 *    `feed === null` happens **exactly** when no provider is configured. The
 *    unconfigured state is therefore already distinguishable without naming it.
 *  - What §7.1 requires on screen is the **feed**, not the vendor: *"we must
 *    not imply that IEX represents every US exchange"* is a claim about which
 *    venues are in the number. `MARKET_FEEDS`' own comment records that
 *    provider and feed vary independently and that only the second is the one
 *    invariant 6 requires us to display.
 *
 * The provider's name arrives with its first reader, which is Story 2.14
 * rendering provenance beside data — and there it comes off
 * {@link SeriesProvenance}, where it already travels per series. Adding it here
 * now would be a second copy of a fact, reachable through a different path,
 * which is how two answers to one question start disagreeing.
 *
 * ## Strict, not lenient, and that is the opposite of `isHealthResponse`
 *
 * `isHealthResponse` deliberately accepts a `status` member it has not been
 * taught, because a newer server is a version skew rather than a broken one.
 * {@link isMarketDataResponse} does **not** extend that courtesy to `feed`, for
 * two reasons:
 *
 *  - There is nothing useful to do with a feed we have no words for. §7.1's
 *    requirement is that a reader is told what the feed covers, and
 *    {@link MARKET_FEED_DESCRIPTIONS} is where the words live — so an
 *    unrecognised slug would either be rendered raw, which is the caption
 *    problem this whole story exists to prevent, or rendered as nothing, which
 *    is worse. Refusing it makes the failure loud and puts it in the one state
 *    that says so honestly.
 *  - The skew window is not the one `isHealthResponse` guards. A new feed slug
 *    is a change to `packages/shared`, which is **inlined into the frontend
 *    bundle**, and `deploy.yml` ships both halves from one commit — so a
 *    frontend that does not know a feed and a backend that serves it cannot
 *    both be current.
 */

import { MARKET_FEEDS } from "./market-provenance.js";
import type { MarketFeed } from "./market-provenance.js";

/**
 * What market data this deployment is configured to read.
 *
 * A flat object with a nullable field rather than a discriminated union on the
 * wire, and the reason is mechanical: Fastify serialises through
 * `fast-json-stringify`, and this repository's guard against a forgotten schema
 * property — `satisfies Record<keyof T, JsonSchemaProperty>` — checks
 * **top-level keys**, which a `oneOf` has none of. The union lives on the
 * client side instead, where it belongs anyway: `MarketFeedView` in
 * `apps/frontend/src/use-market-feed.ts` has states this response cannot have,
 * because *"nothing has answered yet"* is a fact about a browser.
 */
export interface MarketDataResponse {
  /**
   * Which venues are in the numbers this deployment serves, or `null` when no
   * provider is configured at all.
   *
   * `null` is a **present null** rather than an absent field, which matters on
   * the wire: `routes/securities.ts` measured that a nullable field declared
   * plainly `"string"` reaches the client as the empty string rather than as
   * `null`, so the schema declares `["string", "null"]` and the predicate below
   * checks for `null` explicitly.
   */
  readonly feed: MarketFeed | null;
}

/**
 * Is this the body `GET /market-data` promises?
 *
 * Beside the shape it checks, for the reason `isHealthResponse` and
 * `isSecuritiesResponse` are: a validator written at the call site is a second
 * definition of the same judgement and it is the copy that disagrees first.
 *
 * Unknown extra fields are accepted — a newer server may grow a key, and
 * `securities-response.ts` records that growing by gaining a key is the whole
 * argument for an envelope. What is refused is a missing `feed`, a `feed` that
 * is neither `null` nor a member of {@link MARKET_FEEDS}, and a non-object,
 * the last being the string body a static host returns.
 */
export function isMarketDataResponse(
  value: unknown,
): value is MarketDataResponse {
  if (typeof value !== "object" || value === null) return false;

  const { feed } = value as { feed?: unknown };

  if (feed === null) return true;

  return (
    typeof feed === "string" &&
    (MARKET_FEEDS as readonly string[]).includes(feed)
  );
}
