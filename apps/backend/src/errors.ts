// Every error response this application produces, and the log record beside it.
//
// Task 1.7.3 defined the shape in `packages/shared`; this is what constructs it.
// Both of Fastify's failure paths are replaced here, because they are two paths
// and not one: `setErrorHandler` never sees an unmatched route, which Fastify
// answers through `setNotFoundHandler`. Measured before replacing them, the two
// default bodies were
//
//   {"message":"Route GET:/nope not found","error":"Not Found","statusCode":404}
//   {"statusCode":500,"error":"Internal Server Error","message":"…"}
//
// — different field order, because they come from different places. "API errors
// use a single consistent shape" was false the first time anyone mistyped a URL.
//
// This is registered inside `buildServer()` rather than in index.ts, so Story
// 1.9's `app.inject()` instances get it. Handlers registered on the root
// instance apply to every route, including ones registered later by a plugin.

import { API_ERROR_CODES, apiError } from "@marketpulse/shared";
import type { ApiError, ApiErrorCode } from "@marketpulse/shared";
import type { FastifyError, FastifyInstance } from "fastify";

import type { JsonSchemaProperty } from "./json-schema.js";

// The response schema for a failure, declared with Task 1.7.3's guard.
//
// One place where it does *not* copy `/health` verbatim, and the difference is
// load-bearing. `/health` derives `required` from `Object.keys(properties)`,
// which is exact only because every field of `HealthResponse` is required.
// `ApiError.details` is optional, so the same derivation would mark it required
// and produce a **500 at runtime** on every error that has no details — which
// is every error this application currently produces. So `required` is a
// literal of the three, and the guard below still catches a missing property.
//
// `code` carries `enum: API_ERROR_CODES`, so the serialiser enforces the union
// the type already exports. That is the one field a client branches on, and it
// is now checked in three places that cannot disagree: the TypeScript union,
// this enum, and the `satisfies` below.
const apiErrorProperties = {
  code: { type: "string", enum: API_ERROR_CODES },
  message: { type: "string" },
  requestId: { type: "string" },
  details: { type: "array", items: { type: "string" } },
} satisfies Record<keyof ApiError, JsonSchemaProperty>;

export const apiErrorSchema = {
  type: "object",
  properties: apiErrorProperties,
  required: ["code", "message", "requestId"],
};

// The message every 5xx carries, and the reason criterion 6 is closed rather
// than remembered.
//
// Fastify's default returns the thrown error's own message verbatim — measured:
// a route throwing `new Error("connection to postgres at 10.0.0.4:5432 refused")`
// answered with exactly that string. The stack never reached the client even by
// default, so the stack was never the whole risk: a message written for a
// developer is internal detail too, and it is the half that looks harmless.
//
// The client loses nothing, because it is handed the correlation id in the same
// body, and the real message is on the log record carrying that id.
const INTERNAL_ERROR_MESSAGE = "An unexpected error occurred.";

// The message a 503 carries, and it is a different sentence rather than the
// same one at a different status (Task 2.9.6).
//
// A 5xx never carries the thrown message, and that rule is unchanged here — the
// thrown message on this path names a host, a port and a driver. What changes is
// what the constant says, because the two 5xx classes are two different
// instructions to the client: `INTERNAL_ERROR_MESSAGE` describes something that
// will fail again, and this describes something that may not. It says nothing
// about Postgres, a pool or a connection, which is `database.ts`' stated
// requirement for exactly this string.
const SERVICE_UNAVAILABLE_MESSAGE =
  "Market data is temporarily unavailable. Try again shortly.";

// The 404 message does **not** name the route, and Fastify's default did.
//
// Two reasons, and the second is the deciding one. Reflecting an unvalidated
// request URL into a response body is a shape worth not having, even where the
// JSON serialiser makes it harmless today. And the client already knows which
// URL it asked for, so the reflection buys it nothing — while the log record
// has the method and the url beside the same correlation id, which is where
// somebody debugging this actually looks.
const NOT_FOUND_MESSAGE = "Route not found.";

// Fastify's own errors arrive here carrying a `statusCode`; a thrown `Error`
// does not. Anything outside the HTTP error range — absent, or a success code
// somebody attached by accident — is a 500, because an error handler running at
// all means something failed, and a reassuring status would be a lie.
function statusOf(error: FastifyError): number {
  const status = error.statusCode;
  return typeof status === "number" && status >= 400 && status <= 599
    ? status
    : 500;
}

// The mapping from an HTTP status to the contract's code, written out rather
// than only coded.
//
//   404           → NOT_FOUND            an address that does not exist
//   any other 4xx → BAD_REQUEST          the request was not acceptable
//   503           → SERVICE_UNAVAILABLE  a dependency is down; retrying may work
//   any other 5xx → INTERNAL_ERROR       ours
//
// The 503 row is Task 2.9.6's addition and it is the reason `SERVICE_UNAVAILABLE`
// could not be added on its own: this function is a *total* mapping from status
// to code, so a 503 thrown by `GET /market-data/bars` before this line existed
// serialised cleanly through the right shape while carrying `INTERNAL_ERROR` —
// a well-formed answer that names the wrong thing, which is the failure mode
// worth the extra line. The member and the mapping therefore land together, and
// the test asserts the *code* rather than only the status.
//
// `BAD_REQUEST` is this task's addition to a union Task 1.7.3 shipped with two
// members, and it is justified by a failure that can actually be produced
// rather than one that can be imagined — which is the test 1.7.3 set. Measured
// against the shipping tree, whose only route is `GET /health`:
//
//   POST /health, content-type application/json, body `{oops`
//     → 400 FST_ERR_CTP_INVALID_JSON_BODY
//   POST /health, content-type application/json, a 2 MB body
//     → 413 FST_ERR_CTP_BODY_TOO_LARGE
//
// Both are reachable today, with no route registered that accepts a body,
// because Fastify's content-type parser runs before the not-found handler.
// (415 is *not* reachable — an unparseable content type resolves to a 404 here
// — and so does not get a member.)
//
// One member for both rather than a member per status, decided on what a client
// would branch on: 400 and 413 both mean "your request was not acceptable; fix
// it and retry", and the HTTP status line still carries the specific difference
// for anyone who wants it. The reversal trigger is a caller that genuinely has
// to behave differently on a 413 — Epic 9's filings are the first plausible
// one — and adding a member then is non-breaking, which is why the union exists.
function codeFor(status: number): ApiErrorCode {
  if (status >= 500) {
    return status === 503 ? "SERVICE_UNAVAILABLE" : "INTERNAL_ERROR";
  }
  return status === 404 ? "NOT_FOUND" : "BAD_REQUEST";
}

// The message that goes with the code, for the 5xx branch only — a 4xx passes
// the thrown message through and the branch below says why that is safe.
function messageFor(status: number): string {
  return status === 503 ? SERVICE_UNAVAILABLE_MESSAGE : INTERNAL_ERROR_MESSAGE;
}

/**
 * A dependency this server needs is unavailable, so the request could not be
 * answered — **not** this server having failed (Task 2.9.6).
 *
 * The one way to produce a 503 from application code, and it exists so the
 * status is chosen where the failure is *classified* rather than where it is
 * caught. `database.ts`' {@link isDatabaseUnavailable} is the classifier today
 * and the only caller is `routes/market-data.ts`; anything else that acquires
 * an unreliable dependency — Epic 9's SEC client is the next plausible one —
 * throws this rather than inventing a second route to the same status.
 *
 * **The message is for the log and never for the client.** It is a 5xx, so
 * {@link registerErrorHandling} replaces it with
 * {@link SERVICE_UNAVAILABLE_MESSAGE}; the thrown message is what lands beside
 * the correlation id, and the `cause` carries the driver's own error with it.
 * Carrying the cause rather than re-wrapping its message is what keeps the host,
 * the port and the SQLSTATE in the log record and out of the body.
 */
export class ServiceUnavailableError extends Error {
  /** Read by {@link statusOf}, which is how Fastify learns the status. */
  readonly statusCode = 503;

  constructor(dependency: string, cause: unknown) {
    super(`${dependency} is unavailable.`, { cause });
    this.name = "ServiceUnavailableError";
  }
}

export function registerErrorHandling(app: FastifyInstance): void {
  // The unmatched-route path. Registered on the root instance, so it covers
  // every route rather than the ones somebody remembered.
  //
  // It logs, because replacing Fastify's handler removes Fastify's own
  // `Route GET:/nope not found` record with it — and a 404 that appears in no
  // log line is a 404 nobody can investigate. `request.log` rather than
  // `app.log`, so the record carries `reqId` and joins the id the client was
  // given.
  app.setNotFoundHandler((request, reply) => {
    request.log.info("route not found");
    return reply
      .code(404)
      .send(apiError("NOT_FOUND", NOT_FOUND_MESSAGE, request.id));
  });

  // Everything else: a thrown route, and every framework error.
  //
  // Levels are split by class, and Fastify already split them — measured, its
  // default writes a 5xx at level 50 with the full `err`, and a 4xx at level 30
  // with `err` too. This keeps that split rather than inventing one. A 4xx is
  // the client's mistake and is ordinary traffic; logging a mistyped URL at
  // `error` is how a log aggregator becomes noise, and it would also break the
  // property Task 1.7.1 measured — that at `LOG_LEVEL=warn` a healthy server is
  // silent. A server answering 404s is healthy.
  //
  // `err` is passed on both branches, so the stack is in the log on both. It is
  // in the log and *only* in the log: the response carries the correlation id,
  // and the two are joined by it. That pairing is the criterion.
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const status = statusOf(error);
    const code = codeFor(status);

    if (status >= 500) {
      // A 503 is logged at `warn` rather than `error`, and the split is the same
      // one this handler already makes between classes: `error` is reserved for
      // this server having failed, and a dependency being down is not that. It
      // is still above the `warn` floor Task 1.7.1 measured, so a database
      // outage is visible at the level a healthy server is silent at — an
      // outage that logged at `info` would be one nobody sees.
      if (status === 503) {
        request.log.warn({ err: error }, "dependency unavailable");
      } else {
        request.log.error({ err: error }, "request failed");
      }

      return reply
        .code(status)
        .send(apiError(code, messageFor(status), request.id));
    }

    // A 4xx message is safe to pass through, and until Story 2.9 every one of
    // them was a constant string Fastify wrote — "Body is not valid JSON but
    // content-type is set to 'application/json'".
    //
    // **That day arrived with Task 2.9.6, and the decision is: reflection of the
    // client's own input is allowed in a 4xx message, and only there.**
    // `parseSeriesRequest` writes messages naming the value that was refused —
    // `"5m" is not a timeframe. Expected 1m or 1d.` — and `GET
    // /market-data/bars` turns them into 400 bodies. The reasoning, recorded so
    // it is not re-taken:
    //
    //   - It is **the client's own content coming back**, never server state.
    //     That is the whole line: a message may name what the caller sent and
    //     may never name a host, a query, a row, a path on this machine or a
    //     thrown error. The 404 above declines to name the route under the same
    //     rule, and the two now agree rather than differing by accident.
    //   - The value is `JSON.stringify`d into the message, and the body is
    //     serialised by `fast-json-stringify` as a JSON string, so a caller
    //     cannot reflect markup into anything but a quoted string. That is a
    //     property of the serialiser rather than of the message, which is why
    //     it is a note and not the argument.
    //   - The alternative — a generic "bad request" and the specifics in the
    //     log — was refused because it makes the API unusable by hand at
    //     exactly the moment somebody is holding it wrongly, and the caller is
    //     the only party who cannot see the log.
    //
    // The reversal trigger is a 4xx message interpolating something the client
    // did **not** send. On Task 2.9.10's sweep list either way.
    request.log.info({ err: error }, "request rejected");
    return reply.code(status).send(apiError(code, error.message, request.id));
  });
}
