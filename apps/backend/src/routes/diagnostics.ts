// GET /diagnostics/database — the answer to Story 2.1's fourth open decision
// (Task 2.1.7).
//
// **The decision, in one sentence: `/health` says nothing about the database,
// and this says it instead.**
//
// ## Why `/health` was not the place, which is a property of this deployment
// rather than a preference
//
// All three of the Container App's probes — startup, readiness and liveness —
// point at `/health`, read back off the live app rather than recalled:
//
//   | Probe     | period | timeout | failureThreshold |
//   | --------- | ------ | ------- | ---------------- |
//   | Startup   |    2 s |     3 s |               30 |
//   | Readiness |   10 s |     5 s |                3 |
//   | Liveness  |   30 s |     5 s |                3 |
//
// A failing **liveness** probe kills the replica, so a `/health` that fails
// when the database is unreachable converts a recoverable dependency outage
// into a restart loop — during which the application is *less* available than
// if nothing had been done at all. Task 2.1.6 measured the control on the
// correct side of that: with `DATABASE_HOST` pointed at an unroutable address
// the replica held `ready: true`, `restartCount: 0` and `/health` 200 on every
// poll for 3 min 30 s. **That baseline is what this task had to not lose**, and
// the cheapest way to not lose it is to not touch `/health`.
//
// The obvious softening — a field on `/health` the probes are not taught to
// fail on — was rejected on cost rather than on principle, and the cost is
// measured. The pool holds **zero connections at rest** (Task 2.1.6, because
// `pg` closes an idle client after ten seconds and nothing queries afterwards),
// so a check on `/health` pays the **cold** path nearly every time: ~1,023 ms
// deployed, of which the Entra token mint is 866 ms. That is a third of the
// startup probe's 3-second timeout, on a route hit every 2 seconds during
// startup, every 10 seconds by readiness, every 30 seconds by liveness, and
// once per 30 seconds per **visible browser tab**. It would also widen a wire
// contract with five readers — the schema, the `satisfies` guard,
// `HealthResponse`, `isHealthResponse()` and the frontend's `BackendStatus` —
// for a field with no consumer, which is the brief's own "do not widen the
// health contract for a future need".
//
// ## And why the readiness probe is not pointed here either
//
// The brief offers a readiness surface as the middle shape, and it is refused
// on the deployment's own shape. This app is `Single` revision mode at
// `minReplicas: 1`, so there is exactly one replica behind the ingress: an
// unready replica is not a degraded service, it is **no** service, because
// there is no second replica for the ingress to send traffic to. So a readiness
// probe that fails on an unreachable database would take a working application,
// whose every current route is answerable without a database, entirely off the
// air because a dependency none of them uses is down. That is strictly worse
// than the baseline above.
//
// **This one is reasoned rather than produced, deliberately, and saying so is
// the point.** Producing it means pointing the readiness probe at a failing
// path and taking the deployed backend off the air to watch it happen — a live
// outage spent confirming how ingress is defined to work, in support of a shape
// that is being *rejected* rather than shipped. The three facts it rests on are
// each readable without breaking anything: the revision mode, the replica count
// and the probe table are all in `az containerapp show`, and they were read off
// the live app rather than recalled. Where a rejection turns on something that
// could genuinely surprise us, produce it; this one cannot.
//
// ## What this endpoint is, then
//
// A **pull**, not a probe and not a monitor. It exists because of a gap that is
// real rather than anticipated: database reachability is currently reported in
// exactly one place, the level-40 record `index.ts` writes at **startup**, so a
// running replica whose database goes away afterwards reports nothing anywhere.
// And the question cannot be answered from anywhere else — a laptop dialling
// the database tests a laptop's network, its own credential and no managed
// identity at all, where the interesting path is East US replica → North
// Central US server, over TLS, as `marketpulse-backend`, with a token minted
// from the platform's own sidecar. **This endpoint is the only instrument that
// stands in that position.** That is Story 1.12's lesson arriving from the
// other side: there, no server-side instrument could see what a browser saw.
//
// Nothing consumes it automatically, and that is the design. No probe, no
// alert, no timer, no frontend. It costs nothing when nobody asks.
//
// ## It always answers 200, including when the database is down
//
// "Is the database reachable" is a question this endpoint answers *correctly*
// when the answer is no. A 503 would be claiming this endpoint failed, and it
// would additionally need a `SERVICE_UNAVAILABLE` member of `API_ERROR_CODES`
// — which `database.ts` records as Story 2.8's to add, under that union's own
// rule that a member is added by the story that can produce the failure.
//
// ## What the body does not contain
//
// The ingress is **public and unauthenticated**. So the body carries whether,
// and how long it took, and how stale the answer is — and no error message, no
// host, no port, no driver name and no SQLSTATE. That is Task 1.7.4's rule
// applied rather than a new one: a message written for a developer is internal
// detail too. The *reason* goes to the log at `warn`, and the `x-request-id`
// this server already puts on every reply is what joins the two. So the shape
// is: the endpoint tells you **whether**, the log tells you **why**, and the
// correlation id built in Task 1.7.2 is what makes that one investigation
// rather than two.

import type { FastifyPluginCallback } from "fastify";

import type { DatabaseCheck, DatabaseCheckFn } from "../database.js";
import { apiErrorSchema } from "../errors.js";
import type { JsonSchemaProperty } from "../json-schema.js";

/**
 * The body of `GET /diagnostics/database`.
 *
 * Declared here and deliberately **not** in `packages/shared`, by Story 1.6's
 * test: shared means both sides depend on the same fact, and nothing outside
 * this application reads this. The frontend does not — see the "no
 * user-visible change" decision in the task record — and neither does either
 * browser suite.
 */
interface DatabaseDiagnostic {
  /** Did the last check reach the database? */
  reachable: boolean;

  /** How long that check took, in fractional milliseconds. */
  ms: number;

  /**
   * How old the answer is. `0` means this request caused the query; anything
   * else means it was served from the bound in `createCachedDatabaseCheck`.
   *
   * It is here so a reader cannot mistake a cached answer for a fresh
   * measurement, which is the one way a bounded check can mislead.
   */
  ageMs: number;

  /** When the check ran, as an ISO 8601 instant. */
  checkedAt: string;
}

const diagnosticProperties = {
  reachable: { type: "boolean" },
  ms: { type: "number" },
  ageMs: { type: "number" },
  checkedAt: { type: "string" },
} satisfies Record<keyof DatabaseDiagnostic, JsonSchemaProperty>;

const diagnosticSchema = {
  response: {
    200: {
      type: "object",
      properties: diagnosticProperties,
      required: Object.keys(diagnosticProperties),
    },

    // Declared for the reason `/health` declares it, and it is doing more work
    // here: this handler awaits something that can reject in a way the checker
    // is not supposed to allow, so if `pingDatabase`'s never-throws property
    // ever breaks, the failure answers in the contracted shape rather than
    // Fastify's default one.
    500: apiErrorSchema,
  },
};

/**
 * The route, as a factory rather than a plain plugin.
 *
 * It takes the check as a **function** and not a pool, so this file never
 * learns there is a driver and a test can drive every branch without a socket.
 *
 * **Registered from `index.ts` rather than inside `buildServer()`**, which is
 * the opposite of where `registerCors` and `registerErrorHandling` go, and the
 * ordering forces it: the pool takes `app.log`, so the app must exist before
 * the pool, and the pool before this route. The alternative is the reversal
 * `database.ts` records — the pool entering `ServerOptions` — and that trigger
 * is deliberately **not** fired here: it belongs to Story 2.8's first route
 * that serves data, and firing it for a diagnostic would change
 * `buildServer()`'s signature and every test that calls it, one story early.
 *
 * The cost of that is stated rather than hidden: a server built by
 * `buildServer()` alone does **not** have this route, so `server.test.ts`'s
 * route-table walk does not see it. Its schema is asserted in this route's own
 * test instead.
 */
export function createDiagnosticsRoutes(
  checkDatabase: DatabaseCheckFn,
): FastifyPluginCallback {
  return (app, _options, done) => {
    app.get(
      "/diagnostics/database",
      { schema: diagnosticSchema },
      async (request, reply) => {
        const check: DatabaseCheck = await checkDatabase();

        // The reason, at the one place it is allowed to exist. `warn` and not
        // `error` for `index.ts`'s reason: this server has not failed, a
        // dependency is unavailable, and Task 1.7.4 reserves 50 for a failure
        // this server produced. Through `request.log`, so the record carries
        // the `reqId` that is already on the reply — which is the whole
        // mechanism that lets a caller holding a 200 body saying `false` find
        // out why.
        if (!check.ok) {
          request.log.warn(
            { err: check.error, ageMs: check.ageMs },
            "database unreachable, reported by the diagnostic endpoint",
          );
        }

        const body: DatabaseDiagnostic = {
          reachable: check.ok,
          ms: Math.round(check.ms * 100) / 100,
          ageMs: Math.round(check.ageMs),
          checkedAt: new Date(check.checkedAt).toISOString(),
        };

        return reply.code(200).send(body);
      },
    );

    done();
  };
}
