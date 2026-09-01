/**
 * The shape every API error response takes, and the only one.
 *
 * This is a **wire shape, not an `Error`**. Nothing throws an `ApiError` and
 * nothing catches one; it is what the server serialises when a request fails,
 * and what a client parses. Task 1.7.4 owns the mapping from a thrown `Error`
 * to this, and until it lands nothing here is constructed. That is deliberate:
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
 * client matching on prose breaks when the prose is improved. It is a union of
 * exactly **two** today, and both are measured rather than anticipated — they
 * are the two failures the server already produces, a 404 for an unrouted
 * address and a 500 for a thrown error. Task 1.7.4 is what makes those
 * responses take this shape.
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
export const API_ERROR_CODES = ["NOT_FOUND", "INTERNAL_ERROR"] as const;

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
