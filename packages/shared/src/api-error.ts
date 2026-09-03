/**
 * The shape every API error response takes, and the only one.
 *
 * This is a **wire shape, not an `Error`**. Nothing throws an `ApiError` and
 * nothing catches one; it is what the server serialises when a request fails,
 * and what a client parses. Task 1.7.4 owns the mapping from a thrown `Error`
 * to this, and it is `apps/backend/src/errors.ts` — the only file that
 * constructs one. The contract shipped unused for exactly one task, on purpose:
 * a contract defined and unused is honest, a contract half-wired into a handler
 * is not.
 *
 * It lives in `packages/shared` because it is the first thing in this
 * repository both apps genuinely have to agree about — the backend writes it,
 * Story 1.12's frontend reads it, and two copies of a wire format is how they
 * stop matching. Note the contrast with Story 1.6, which declined to put the
 * *configuration* type here: the two apps share no environment variable, so
 * that would have been a shared file with one consumer. The rule is "shared
 * means both sides depend on the same fact", not "shared is where types go".
 *
 * The cost, and it is real: shared is consumed as **built output**, so changing
 * this shape means rebuilding the package before either app typechecks against
 * the change. `pnpm build` and `pnpm verify` order that themselves; a bare
 * `tsc --noEmit` in an app passes against the previous shape.
 *
 * **This is a transport error and not a `Finding`.** Architectural invariant 5
 * gives findings a confidence level — `CONFIRMED` / `SUPPORTED` / `POSSIBLE` /
 * `UNKNOWN` — and an evidence trail, and "not enough evidence to explain this
 * move" is a **successful** response carrying an uncertain finding. It is not
 * an error and must never be expressed as one. If the next reader arrived here
 * looking for how the product expresses uncertainty, this is the wrong file:
 * that vocabulary belongs to the domain model, and Epic 7 builds it.
 *
 * ## The payload is flat
 *
 * `{ code, message, requestId }` and not `{ error: { code, message }, … }`.
 * Wrapping was considered and lost on one specific question rather than on
 * taste: **where does `requestId` go?** It is a property of the response, not
 * of the failure — the same id is on the successful responses too, as the
 * `x-request-id` header — so inside the wrapper it is misfiled and outside it
 * the payload has two levels for four fields. Flat has no such seam. The HTTP
 * status code already says an error is what this is, so the wrapper's usual
 * job — telling success from failure by shape — is one the status line has
 * already done.
 *
 * RFC 9457 `application/problem+json` was the other candidate and was rejected
 * for the same reason `request-id.ts` rejected W3C `traceparent`: its
 * machine-readable discriminator is a `type` **URI** that is supposed to
 * dereference to documentation, and adopting the field names without the URIs
 * behind them is the shape of the thing without the thing. Its `title` /
 * `detail` pair is also prose where `code` is a union, which is the half a
 * client can actually branch on.
 *
 * ## Fields, and the ones deliberately absent
 *
 * `statusCode` is **not** a field, though Fastify's own default error body has
 * one. It is already the HTTP status; a copy in the body is a second place for
 * it to be wrong, and a client that reads it from there is a client that
 * believes the body over the response line.
 *
 * No `timestamp` either. The log record has one, the correlation id joins the
 * two, and a clock in the payload invites a client to treat it as authoritative
 * when it is this server's wall clock.
 */

/**
 * The failures this API can report, as a closed set a client can branch on.
 *
 * A union rather than a free string, for the same reason `HealthStatus` is: a
 * client matching on prose breaks when the prose is improved. Every member is
 * measured rather than anticipated — it names a failure the server can actually
 * be made to produce, which is the test this union is kept to.
 *
 * `NOT_FOUND` and `INTERNAL_ERROR` shipped with Task 1.7.3: an unrouted address
 * and a thrown error, the two failures the server produced before anything
 * mapped them. `BAD_REQUEST` was added by Task 1.7.4 under the same test, and
 * its measurement is worth keeping because it is counter-intuitive — with a
 * single `GET /health` route and nothing accepting a body, `POST /health` with
 * `content-type: application/json` and a malformed body is a **400**, and a 2 MB
 * body is a **413**, because Fastify's content-type parser runs before its
 * not-found handler. Both are the client's mistake and neither is a 404.
 *
 * One member covers both, decided on what a client branches on rather than on
 * status codes: 400 and 413 both mean "your request was not acceptable, fix it
 * and retry", and the status line still carries the difference. A caller that
 * genuinely has to behave differently on a 413 is the reversal trigger.
 *
 * Adding a member is non-breaking by construction, which is the property that
 * lets this union start small. Removing one is not.
 *
 * Deliberately **not** enumerated here: Epic 7's failed analytical tools, Epic
 * 9's SEC unavailability and Epic 10's agent failures. Those are product states
 * with their own vocabulary, and this contract has to accommodate them, not
 * guess at them. A union of two that grows is a non-breaking addition; a union
 * of twelve invented now is eleven names to unpick.
 *
 * SCREAMING_SNAKE rather than the lowercase of `AnomalyBand` and `FeedStatus`,
 * because those are names the interface renders to a human and these are
 * discriminators a client switches on — the same distinction that makes the
 * event vocabulary `STEP_STARTED` rather than `step started`.
 */
export const API_ERROR_CODES = [
  "NOT_FOUND",
  "BAD_REQUEST",
  "INTERNAL_ERROR",
] as const;

/** One of {@link API_ERROR_CODES}. */
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** The body of every failed API response. */
export interface ApiError {
  /** What went wrong, as a value rather than as prose. */
  readonly code: ApiErrorCode;

  /**
   * What went wrong, for a human, and safe to show one.
   *
   * This is the field criterion 6 is about: it must never carry internal
   * detail. Fastify's current 500 returns the thrown error's own message
   * verbatim — measured, and Task 1.7.4's job to stop.
   */
  readonly message: string;

  /**
   * The correlation id for the request that failed — `request.id` from Task
   * 1.7.2, a UUID v4, already on every response as the `x-request-id` header
   * and already on every log record for that request as `reqId`.
   *
   * Required, not optional. It is the whole reason a user can report a failure
   * usefully, and a field that is sometimes there is a field a support process
   * cannot rely on. It is a duplicate of the header on purpose: a header is
   * easy to lose through a client library, a screenshot or a paste, and the
   * body is what a person copies.
   */
  readonly requestId: string;

  /**
   * Specifics, when there are several and they are worth listing separately —
   * every invalid field rather than the first, in the shape `loadConfig()`
   * already reports configuration errors.
   *
   * `readonly string[]` and **not** an arbitrary object, which is the field a
   * leak arrives through: a `Record<string, unknown>` is a hole an exception,
   * a query, or a stack ends up in without anybody deciding it should. Every
   * entry here is a sentence already fit to show a user, by construction.
   *
   * Optional under `exactOptionalPropertyTypes`, so "absent" and "present as
   * `undefined`" are different types — and the domain reason is the same one
   * that put that setting in `tsconfig.base.json`. `details: undefined` is not
   * a thing this API says; either there are specifics or the key is not there.
   * That is why {@link apiError} branches instead of spreading a possibly
   * undefined value.
   */
  readonly details?: readonly string[];
}

/**
 * Build an {@link ApiError}.
 *
 * The branch is the whole point and is not a style choice: under
 * `exactOptionalPropertyTypes`, `{ code, message, requestId, details }` with
 * `details` inferred as `readonly string[] | undefined` does not satisfy an
 * optional `readonly string[]`. Constructing the object two ways is what makes
 * the absent case genuinely absent rather than explicitly unknown.
 */
export function apiError(
  code: ApiErrorCode,
  message: string,
  requestId: string,
  details?: readonly string[],
): ApiError {
  return details === undefined
    ? { code, message, requestId }
    : { code, message, requestId, details };
}

/**
 * Is this parsed JSON an {@link ApiError}?
 *
 * It is here for the reason {@link isHealthResponse} is here rather than in the
 * client that calls it: a validator written anywhere but beside the shape it
 * validates is the copy that drifts first. Task 1.7.3 shipped this contract
 * without one because nothing read it yet — the backend *writes* this shape and
 * needs no predicate for it — and Task 1.12.2 is the first reader, so this is
 * the first task that has anything to check.
 *
 * It takes `unknown` because that is what `response.json()` honestly returns.
 * The bytes on a failed request are the *least* trustworthy in the system: a
 * non-2xx at the API's address may have come from a proxy, an ingress or a
 * static host that has never heard of this contract, which is exactly the case
 * `apps/frontend/src/api-client.ts` has to tell apart from a real one.
 *
 * It differs from {@link isHealthResponse} in one way, and the difference is
 * deliberate: this **does** check that `code` is a member of
 * {@link API_ERROR_CODES}, where the health predicate accepts a `status` it has
 * not been taught. The asymmetry is not an inconsistency — `code` is a
 * discriminator a caller switches on, so an unrecognised value is one this
 * client cannot act on and is better treated as "not an ApiError" than admitted
 * into a union it does not belong to. `status` is a value the interface
 * renders, and a newer server reporting a newer one is a version skew a client
 * can still display.
 *
 * `details` is checked only when present, and `exactOptionalPropertyTypes` is
 * why the absent case has to be a separate branch rather than a comparison
 * against `undefined`.
 */
export function isApiError(value: unknown): value is ApiError {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.message !== "string" ||
    typeof candidate.requestId !== "string"
  ) {
    return false;
  }

  if (!API_ERROR_CODES.some((code) => code === candidate.code)) return false;

  if (candidate.details === undefined) return true;

  return (
    Array.isArray(candidate.details) &&
    candidate.details.every((entry) => typeof entry === "string")
  );
}
