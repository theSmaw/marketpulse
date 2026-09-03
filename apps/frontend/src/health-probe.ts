import { REQUEST_ID_HEADER } from "@marketpulse/shared";

import { apiBaseUrl } from "./api-base-url.js";
import { getHealth } from "./api-client.js";

// One request from the page to the API, at startup, reported to the console
// (Task 1.11.5).
//
// **This is still not a client, and since Task 1.12.2 it no longer pretends to
// be.** It used to call `fetch` itself; the base URL, the deadline, the abort,
// the `ApiError` parse and the correlation id now all live in
// `api-client.ts`, which is the only file in this application that calls
// `fetch`. What is left here is what this file always was: a console line
// proving Story 1.11's criterion that the deployed frontend talks to the
// deployed backend.
//
// **It is meant to be deleted, by Task 1.12.3, and not before.** That task
// replaces the call it makes with a polling hook; deleting it here would leave
// a merge window in which the deployed frontend calls the deployed backend
// nowhere at all, which is Story 1.11's criterion regressing mid-story for no
// gain. There is still no state, no effect, no component and no polling in it.
//
// It runs from `main.tsx` before the tree mounts, which keeps React out of it
// entirely — and that matters beyond tidiness, because the React Compiler rule
// set has never fired on shipped code and Task 1.12.3's polling effect is meant
// to be its first real test. A `useEffect` here would spend that test on code
// that is about to be deleted.

/**
 * Fetch `/health` once and report the result to the console.
 *
 * Never rejects. The whole point is that failing to reach the backend is a
 * *result* rather than an exception, and `main.tsx` fires this without awaiting
 * it, so an unreachable backend must not be able to take the mount down.
 *
 * It shows a developer a `requestId` in a console; it shows a user nothing.
 * What a *user* may ever see of one is decided in `api-client.ts`, beside the
 * type that carries it.
 */
export async function probeBackendHealth(): Promise<void> {
  const result = await getHealth();
  const url = `${apiBaseUrl}/health`;

  switch (result.outcome) {
    case "ok":
      console.info(
        `[health-probe] ${url} answered ${String(result.status)}`,
        `${REQUEST_ID_HEADER}: ${result.requestId ?? "(not exposed)"}`,
        result.data,
      );
      return;

    // A 200 that is not a health report. The address is answering and it is not
    // this API — a static host serving `index.html` is the shape to suspect.
    case "unreadable-body":
      console.error(
        `[health-probe] ${url} answered ${String(result.status)} with something that is not a health report.`,
        "Something is serving that address and it is not this API.",
        `${REQUEST_ID_HEADER}: ${result.requestId ?? "(not exposed)"}`,
      );
      return;

    case "api-error":
      console.error(
        `[health-probe] ${url} answered ${String(result.status)}`,
        result.error,
      );
      return;

    case "http-error":
      console.error(
        `[health-probe] ${url} answered ${String(result.status)} and the body is not an ApiError.`,
        "A proxy or an ingress is answering for the backend rather than the backend.",
        `${REQUEST_ID_HEADER}: ${result.requestId ?? "(not exposed)"}`,
      );
      return;

    case "timeout":
      console.error(
        `[health-probe] ${url} did not answer within ${String(result.timeoutMs)} ms.`,
        "Nothing arrived, so this is unreachable rather than slow-but-working.",
      );
      return;

    // **The branch worth reading before debugging one.** A cross-origin
    // rejection arrives here as `TypeError: Failed to fetch`, which names
    // neither CORS nor the origin — and the server, meanwhile, logs a perfectly
    // healthy 200, because with a string origin `@fastify/cors` asserts
    // `access-control-allow-origin` unconditionally and the *browser* is the
    // only party that compares. The request was made, answered and then
    // discarded by the browser, and nothing on the server side knows. The
    // message says so, because the alternative is a developer reading a bare
    // `Failed to fetch` and going to look at the one place the evidence is not.
    case "unreachable":
      console.error(
        `[health-probe] could not reach ${url}.`,
        "If the backend is up and logging a 200, this is the cross-origin check failing:",
        "the browser is the only party that compares CORS_ORIGIN against this page's origin.",
        result.cause,
      );
      return;

    // Nobody aborts this probe — it takes no signal. The case is here because
    // the union has it and a missing branch is how a state stops being handled
    // silently.
    case "aborted":
      return;
  }
}
