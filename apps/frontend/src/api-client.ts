import {
  type ApiError,
  type HealthResponse,
  isApiError,
  isHealthResponse,
  REQUEST_ID_HEADER,
} from "@marketpulse/shared";

import { apiBaseUrl } from "./api-base-url.js";

// The frontend's transport: the one place that knows the base URL, the
// deadline, the abort signal, the `ApiError` shape and the correlation id
// (Task 1.12.2).
//
// **This is the only file in `apps/frontend/src/` that calls `fetch`.** That is
// the property the module exists for rather than a tidiness claim: everything
// below — the deadline, the two failure vocabularies, the header read — is
// invisible in its absence and has to be remembered at every call site instead.
// `health-probe.ts` beside it used to call `fetch` directly and now calls this;
// it is Task 1.12.3's to delete, when the polling hook replaces the call it
// makes.
//
// There is still **no React here**: no state, no effect, no component. A
// request is a promise of a result, and the result never throws.
//
// ## What this client exists to survive is not a server failure
//
// Task 1.11.5 made a cross-origin rejection happen and watched both halves at
// once: the browser reported `TypeError: Failed to fetch` while `curl` with the
// same `Origin` got a **200 with a full body**, and the backend logged
// `statusCode: 200`. With a string origin `@fastify/cors` asserts
// `access-control-allow-origin` unconditionally and the *browser* is the only
// party that compares, so the request was made, answered, and then discarded by
// the browser with nothing on the server side knowing. **Every piece of
// server-side evidence says the system is healthy.** Do not debug a failure
// from this module against the backend's log, and do not build any diagnosis
// that depends on one.
//
// ## Why `api-base-url.ts` is still a separate file
//
// It could have been folded in here and deliberately was not. It answers a
// different question — *where is the API*, a build-time fact substituted by
// Vite and unvaryable by a test — from the one this file answers, which is
// *how do we talk to it*. Keeping them apart is what lets `resolveApiBaseUrl`
// stay a pure function of one argument with its own tests, which is the same
// shape and the same reason as `loadConfig(env)` on the backend. Folding it in
// would put a module-load-time `import.meta.env` read inside the module every
// test of this client has to import.

/**
 * How long a request may take before this client stops waiting.
 *
 * **This number is the boundary between two of Task 1.12.1's three states**,
 * which is why it lives here and is not a detail. `BackendStatus` defines
 * `degraded` structurally — *a response arrived and was not a readable health
 * report* — so a deadline that expires produces `unreachable` and not
 * `degraded`, because nothing arrived. Move this number and you move which
 * state a slow backend reports as.
 *
 * Without a deadline there is no state at all rather than the wrong one: a
 * socket that accepts a connection and never answers hangs `fetch` **forever**,
 * measured in Task 1.8.4 and the reason `scripts/check-ready.mjs` carries a
 * per-attempt timeout of its own. That check uses 2 s and dials a loopback
 * pair; this one crosses the public internet to Azure Container Apps, so 2 s is
 * a threshold a healthy answer could plausibly miss.
 *
 * Five seconds, on the two constraints that actually bound it. It has to sit
 * well above a real round trip — the deployed backend runs at `minReplicas: 1`
 * precisely so there is no cold start to absorb, and `/health` reads
 * `process.uptime()` and returns, so the whole cost is network. And it has to
 * sit **strictly below the poll interval**, or a hung request is still
 * outstanding when the next poll starts and the two overlap forever. That
 * second constraint is a real ordering the compiler cannot hold: **Task 1.12.3
 * owns the interval and inherits the obligation to keep it above this number.**
 *
 * The reversal trigger is a `/health` that does real work. The moment it checks
 * a database or a market-data provider, "how long is too long" stops being a
 * statement about the network and needs measuring against a real distribution
 * rather than choosing — which is the same trigger `BACKEND_DEGRADED_CAUSES`
 * records for admitting latency as a cause of `degraded`.
 */
export const API_TIMEOUT_MS = 5_000;

/**
 * What a request produced. Never a thrown error, in any branch.
 *
 * **How much of a `requestId` a user should ever see, decided here because this
 * is the first place in this product that has one to show.**
 *
 * The rule is: **the whole id, never a prefix, and only ever as a labelled
 * reference beside a failure the user is already being told about.** Three
 * parts, each with a reason.
 *
 * *The whole id*, because it is a UUID v4 with no internal structure — the
 * first eight characters are not a shorter version of it, they are a different
 * thing that does not match anything in a log — and truncating it defeats the
 * single job it has, which is to be quoted back. A reference nobody can search
 * for is decoration.
 *
 * *Only beside a failure*, because on a successful response it is noise the
 * user has no use for; the header is still there for a developer.
 *
 * *Never as the message*, which is the line `ErrorFallback` draws and this does
 * not cross. That component keeps a **boolean** rather than the error precisely
 * so a fallback structurally cannot show one, and its `detail` is the caller's
 * own sentence. A `requestId` is not an error message: it names the *request*
 * and nothing about our hosts, versions, code paths or data, which is what
 * makes it the one internal identifier that may go on screen at all. If a
 * reference line is ever added to that component it arrives as a **new named
 * prop**, never as a widening of `detail`.
 *
 * The consequence to know is that `requestId` is `string | null` on every
 * variant that has one, and a `null` from a deployed page is a specific
 * diagnosis rather than a missing value — see {@link readRequestId}.
 */
export type ApiResult<T> =
  /** A 2xx whose body is the shape that was asked for. */
  | {
      readonly outcome: "ok";
      readonly status: number;
      readonly requestId: string | null;
      readonly data: T;
    }
  /**
   * A 2xx whose body is **not** that shape. Something is answering at this
   * address and it is not this API — a static host returning `index.html` at a
   * 200 is the case this repository has measured twice, in `vite preview` and
   * in `navigationFallback`.
   */
  | {
      readonly outcome: "unreadable-body";
      readonly status: number;
      readonly requestId: string | null;
    }
  /** A non-2xx whose body parsed as the contract's own error shape. */
  | {
      readonly outcome: "api-error";
      readonly status: number;
      readonly requestId: string | null;
      readonly error: ApiError;
    }
  /**
   * A non-2xx whose body is not an {@link ApiError} — a proxy or an ingress
   * answering its own 502 or 503 while the replica behind it is not serving.
   * Separate from `api-error` because that one carries a `requestId` a user
   * could quote and this one carries nothing.
   */
  | {
      readonly outcome: "http-error";
      readonly status: number;
      readonly requestId: string | null;
    }
  /** The deadline expired. Nothing arrived. */
  | { readonly outcome: "timeout"; readonly timeoutMs: number }
  /**
   * No response: a refused connection, a name that did not resolve, or the
   * browser-side CORS rejection above. `TypeError: Failed to fetch`, which
   * names neither the cause nor the origin.
   */
  | { readonly outcome: "unreachable"; readonly cause: unknown }
  /**
   * The **caller** aborted. Distinct from `timeout` and from `unreachable`
   * because it is not a fact about the backend at all: it is a torn-down effect
   * or a superseded request, and Task 1.12.3 must not render one as a state.
   */
  | { readonly outcome: "aborted" };

/** Options every request accepts. */
export interface ApiRequestOptions {
  /**
   * The caller's own signal, composed with the deadline rather than replacing
   * it. Task 1.12.3 aborts through this when its effect tears down.
   */
  readonly signal?: AbortSignal;

  /** Override {@link API_TIMEOUT_MS} for one request. */
  readonly timeoutMs?: number;
}

/**
 * Read the correlation id off a response, by the name `packages/shared`
 * exports rather than by writing `"x-request-id"` out again — a header-name
 * typo is a compile error nowhere and silently disables correlation on the one
 * path it was added to.
 *
 * **This read is the payoff of Story 1.8 rejecting a Vite proxy.** The
 * CORS-safelisted response headers are a short list and this one is not on it,
 * so cross-origin JavaScript can see it only because `apps/backend/src/cors.ts`
 * names it in `exposedHeaders`. A same-origin proxy exposes *every* header and
 * would have hidden that requirement completely until the first deploy. The
 * headers this page can actually see are exactly `content-length`,
 * `content-type` and `x-request-id`.
 *
 * So a `null` from a deployed page means the server stopped **exposing** the
 * header, not that it stopped sending it. That is a CORS configuration change,
 * and it is a different diagnosis from a missing id.
 */
function readRequestId(response: Response): string | null {
  return response.headers.get(REQUEST_ID_HEADER);
}

/**
 * Make one request and classify what came back.
 *
 * @param path an absolute path on the API, leading slash included
 * @param isExpected the predicate for the success body — **imported from
 * `packages/shared`, beside the shape it checks, never written again here.** A
 * validator written at the call site is a second definition of the same
 * judgement and it is the copy that disagrees first
 *
 * There is deliberately **no retry** in this function. Retry is a property of
 * the *poll* — how often, how many times, whether a failure should back off —
 * and the poll is Task 1.12.3's. A retry buried in the transport would also
 * make the deadline a lie, because the caller's five seconds would silently
 * become fifteen.
 */
export async function apiRequest<T>(
  path: string,
  isExpected: (value: unknown) => value is T,
  options: ApiRequestOptions = {},
): Promise<ApiResult<T>> {
  const timeoutMs = options.timeoutMs ?? API_TIMEOUT_MS;

  // Two signals, composed rather than chosen between: the caller's teardown and
  // this module's deadline are different reasons to stop and both have to work.
  const deadline = AbortSignal.timeout(timeoutMs);
  const signal =
    options.signal === undefined
      ? deadline
      : AbortSignal.any([deadline, options.signal]);

  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      headers: { accept: "application/json" },
      signal,
    });
  } catch (cause) {
    // Which of the two signals fired is read off the **signals themselves**
    // rather than off the rejection. `AbortSignal.timeout()` aborts with a
    // `TimeoutError` and a caller's controller with an `AbortError`, so the
    // reason is in principle enough — but that requires the thrown value to
    // survive whatever produced it, and a `DOMException` name is a string
    // comparison against a value from another realm. The flags are facts this
    // function owns.
    if (deadline.aborted) return { outcome: "timeout", timeoutMs };
    if (options.signal?.aborted === true) return { outcome: "aborted" };

    return { outcome: "unreachable", cause };
  }

  const requestId = readRequestId(response);

  // The body is read before the status is branched on, because a failed
  // response still has one and it is the half that carries the `requestId` a
  // user can quote. A body that is not JSON at all — a proxy's HTML error page,
  // which is exactly what the `http-error` branch exists for — makes `.json()`
  // reject, so it is caught into `undefined` and the predicates below decline
  // it like any other unrecognised shape.
  let body: unknown;

  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (!response.ok) {
    return isApiError(body)
      ? {
          outcome: "api-error",
          status: response.status,
          requestId,
          error: body,
        }
      : { outcome: "http-error", status: response.status, requestId };
  }

  return isExpected(body)
    ? { outcome: "ok", status: response.status, requestId, data: body }
    : { outcome: "unreadable-body", status: response.status, requestId };
}

/**
 * `GET /health`.
 *
 * The predicate is `isHealthResponse` from `packages/shared`, imported rather
 * than reproduced. Two of its properties are worth knowing before reading an
 * `unreadable-body` result: it **accepts** a `status` member this client has
 * not been taught and it **accepts** unknown extra fields, because a newer
 * server is a version skew rather than a broken one — which is the whole reason
 * `HealthStatus` is a union that can grow. What it rejects is a missing field,
 * a field of the wrong primitive type, and a non-object, the last being the
 * string body a static host returns.
 */
export function getHealth(
  options?: ApiRequestOptions,
): Promise<ApiResult<HealthResponse>> {
  return apiRequest("/health", isHealthResponse, options);
}
