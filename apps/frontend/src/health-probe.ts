import { REQUEST_ID_HEADER } from "@marketpulse/shared";

import { apiBaseUrl } from "./api-base-url.js";

// One request from the page to the API, at startup, reported to the console
// (Task 1.11.5).
//
// **This is deliberately the smallest thing that proves the criterion, and it
// is not Story 1.12's API client.** Story 1.11's acceptance criterion is that
// the deployed frontend communicates with the deployed backend, and that
// cannot be met without *something* crossing the boundary. What this file is
// allowed to be is one `fetch`, no state, no effect, no component and no
// polling; what it deliberately is not is a client, a hook, a status indicator
// or a promotion of `HealthResponse` into `packages/shared`. Every one of those
// is Story 1.12's, and building them here would land a data layer inside a
// deployment story.
//
// Two consequences of that line, stated so 1.12 inherits a boundary rather
// than a surprise. **The body is `unknown` and stays that way** — typing it
// means promoting `HealthResponse` out of `apps/backend/src/routes/health.ts`,
// which is precisely the payoff Story 1.12 exists to collect, so this file
// logs what it received rather than asserting a shape. And **there is no
// `ApiError` handling here**: the seam where a transport error meets
// `ErrorFallback`, and the decision about how much of a `requestId` a user
// should ever see, are 1.12's to design. This file shows a developer a
// `requestId` in a console; it shows a user nothing.
//
// It runs from `main.tsx` before the tree mounts, which keeps React out of it
// entirely. That matters beyond tidiness: the React Compiler rule set has never
// fired on shipped code, and Story 1.12 is meant to be its first real test with
// a polling effect. A `useEffect` here would spend that test on throwaway code.

/**
 * What the probe found, as a plain object, so a test can assert on it without
 * reading the console.
 */
export type HealthProbeResult =
  | {
      readonly outcome: "ok";
      readonly status: number;
      readonly requestId: string | null;
      readonly body: unknown;
    }
  | {
      readonly outcome: "http-error";
      readonly status: number;
      readonly requestId: string | null;
      readonly body: unknown;
    }
  | { readonly outcome: "unreachable"; readonly error: unknown };

const HEALTH_URL = `${apiBaseUrl}/health`;

/**
 * Fetch `/health` once and report the result.
 *
 * Never rejects: the whole point of the `unreachable` branch is that a failure
 * to reach the backend is a *result*, not an exception, and the caller in
 * `main.tsx` must not be able to take the mount down with it.
 */
export async function probeBackendHealth(): Promise<HealthProbeResult> {
  try {
    const response = await fetch(HEALTH_URL, {
      headers: { accept: "application/json" },
    });

    // Read the correlation id by the name `packages/shared` exports rather than
    // by writing `"x-request-id"` out again. A header-name typo is a compile
    // error nowhere and silently disables correlation on the path it was added
    // to, which is why the constant exists at all (Task 1.7.3).
    //
    // **This read is the first time `exposedHeaders` has been load-bearing.**
    // The CORS-safelisted response headers are a short list and this one is not
    // on it, so cross-origin JavaScript cannot see it unless the server names
    // it in `access-control-expose-headers` — which `apps/backend/src/cors.ts`
    // does. A same-origin setup, or the Vite proxy Story 1.8 rejected, exposes
    // every header and would hide that requirement completely. A `null` here
    // from a deployed page means the server stopped exposing it, not that it
    // stopped sending it.
    const requestId = response.headers.get(REQUEST_ID_HEADER);

    // `.json()` rather than a typed parse: see the note above about
    // `HealthResponse` staying in the backend until Story 1.12 promotes it.
    const body: unknown = await response.json();

    if (!response.ok) {
      const result: HealthProbeResult = {
        outcome: "http-error",
        status: response.status,
        requestId,
        body,
      };
      console.error(
        `[health-probe] ${HEALTH_URL} answered ${String(response.status)}`,
        `${REQUEST_ID_HEADER}: ${requestId ?? "(not exposed)"}`,
        body,
      );
      return result;
    }

    console.info(
      `[health-probe] ${HEALTH_URL} answered ${String(response.status)}`,
      `${REQUEST_ID_HEADER}: ${requestId ?? "(not exposed)"}`,
      body,
    );
    return { outcome: "ok", status: response.status, requestId, body };
  } catch (error) {
    // **This is the branch worth reading before debugging one.** A cross-origin
    // rejection arrives here as `TypeError: Failed to fetch`, which names
    // neither CORS nor the origin — and the server, meanwhile, logs a perfectly
    // healthy 200, because with a string origin `@fastify/cors` asserts
    // `access-control-allow-origin` unconditionally and the *browser* is the
    // only party that compares. So the request was made, answered and then
    // discarded by the browser, and nothing on the server side knows.
    //
    // The message below says so, because the alternative is a developer
    // reading a bare `Failed to fetch` and looking at the backend, which is the
    // one place the evidence is not.
    console.error(
      `[health-probe] could not reach ${HEALTH_URL}.`,
      "If the backend is up and logging a 200, this is the cross-origin check failing:",
      "the browser is the only party that compares CORS_ORIGIN against this page's origin.",
      error,
    );
    return { outcome: "unreachable", error };
  }
}
