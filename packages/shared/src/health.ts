/**
 * The health endpoint's wire contract: what `GET /health` answers with.
 *
 * This lived in `apps/backend/src/routes/health.ts` from Task 1.2.3 until Task
 * 1.12.1 moved it here, and the move is the point rather than a tidy-up.
 * `apps/backend` has **declared** `@marketpulse/shared` in its manifest since
 * Story 1.1 without importing a single thing from it; this is the first import
 * that makes that entry honest, and so the first thing that exercises the
 * deployment machinery Story 1.11 built for it — `pnpm deploy --legacy`, the
 * `files` field on both manifests, and `@marketpulse/shared` arriving in the
 * container image as real files rather than as a symlink into a workspace that
 * is not there.
 *
 * It belongs here by the same test {@link ApiError} passes and Story 1.6's
 * configuration type failed: **shared means both sides depend on the same
 * fact**, not "shared is where types go". The backend writes this shape and
 * Story 1.12's frontend reads it, and two copies of a wire format is how they
 * stop matching.
 *
 * The cost is real and is the same one: this package is consumed as **built
 * output**, so changing anything here means rebuilding it before either app
 * typechecks against the change. `tsc -b` orders that itself; a bare `tsc
 * --noEmit` in an app passes happily against the previous shape, so do not read
 * one as evidence.
 *
 * What did **not** move: the response schema and the
 * `satisfies Record<keyof HealthResponse, JsonSchemaProperty>` guard that keeps
 * it in step with {@link HealthResponse}. Those stay in the backend, because
 * `JsonSchemaProperty` is deliberately not in this package — nothing outside
 * that application declares a response schema.
 */

/**
 * The states this server can report about **itself**.
 *
 * A string literal union, not a boolean and not a free string, for the reason
 * {@link ApiErrorCode} is one: a client matching on prose breaks when the prose
 * is improved.
 *
 * It has exactly one member and that is deliberate. There is no dependency for
 * this server to be degraded about until Epic 2 adds one, and a vocabulary
 * invented before there is anything to hold it to is a set of names somebody
 * later has to unpick. Epic 3 adds market-feed state here, and a union is what
 * makes that an **addition rather than a breaking change**.
 *
 * Note what is structurally absent from it and always will be: "unreachable".
 * That is the absence of a response, which no server can report about itself —
 * see {@link BackendStatus}, which is the other vocabulary and a different kind
 * of fact.
 *
 * A `const` array rather than a bare `type` so the response schema can declare
 * `enum: HEALTH_STATUSES` and the union is enforced in the serialiser as well
 * as the compiler, which is the shape {@link API_ERROR_CODES} already has.
 */
export const HEALTH_STATUSES = ["ok"] as const;

/** One of {@link HEALTH_STATUSES}. */
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

/** The body of a successful `GET /health` response. */
export interface HealthResponse {
  status: HealthStatus;

  /**
   * `apps/backend`'s package manifest version. Not the git SHA and not a build
   * stamp.
   *
   * It reports `"0.0.0"` deliberately, and Story 1.11 took that as a decision
   * rather than leaving it unfinished: the image tag and its digest already
   * answer "what is deployed", and writing a version into `package.json` at
   * build time would dirty the tree that the commit-SHA tag rule needs clean.
   * Do not render it to a user and do not "fix" it.
   */
  version: string;

  /**
   * *Process* uptime, not time since the server started listening. They differ
   * by milliseconds today and could differ by more once startup does real
   * work, so the field says which one it is.
   *
   * The unit travels in the **name** rather than in a comment nobody reads over
   * the wire. That is why it is not `uptime`, and renaming it is a breaking
   * change to the contract rather than a tidy-up.
   */
  uptimeSeconds: number;
}

/**
 * Is this parsed JSON a {@link HealthResponse}?
 *
 * This exists because {@link BackendStatus}'s `degraded` state is defined as "a
 * response arrived and it is not a health report", and a definition a client
 * cannot execute is prose. It lives beside the interface it checks for the same
 * reason the schema guard lives beside the schema: a validator written anywhere
 * else is one that drifts from the shape it validates.
 *
 * It takes `unknown` because that is what `response.json()` returns to anyone
 * who has not lied to the compiler, and it is the only honest entry point for
 * bytes that arrived over a network from something that may not be this server
 * at all.
 *
 * It checks presence and type and nothing else — it deliberately does not
 * require `status` to be a member of {@link HEALTH_STATUSES}. A server
 * reporting a status this client has not been taught yet is a version skew, not
 * a broken server, and the whole reason the union exists is that adding a
 * member is non-breaking. Rejecting an unknown member here would quietly undo
 * that.
 */
export function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.status === "string" &&
    typeof candidate.version === "string" &&
    typeof candidate.uptimeSeconds === "number"
  );
}
