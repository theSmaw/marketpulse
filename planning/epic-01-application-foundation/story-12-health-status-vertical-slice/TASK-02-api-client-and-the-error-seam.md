# Task 1.12.2 — Build the API client and decide what a user sees of a failure

**Status:** Not started
**Story:** [1.12 Health & Status Vertical Slice](STORY.md)
**Depends on:** Task 1.12.1

## Objective

Turn Task 1.11.5's one bare `fetch` into the frontend's transport: one place that knows the base URL, the timeout, the abort signal, the `ApiError` shape and the correlation id. Still no React — no state, no effect, no component.

## Work

- Create the client module under `apps/frontend/src/`, and fold `src/api-base-url.ts` into it or leave it beside it deliberately. `resolveApiBaseUrl(raw)` takes its input as a **parameter** for the reason `loadConfig(env)` does — `import.meta.env` is substituted at build time and cannot be varied by a test. Keep that property
- **Import the contract; do not re-describe it.** `ApiError` (`{ code, message, requestId, details? }`) and `REQUEST_ID_HEADER` both live in `packages/shared`. Writing `"x-request-id"` out by hand is a compile error nowhere and silently disables correlation on the path it was added to
- Read the correlation id by that constant. `exposedHeaders: [REQUEST_ID_HEADER]` in `apps/backend/src/cors.ts` is what makes it readable from JavaScript at all — under real CORS the safelist is short and `x-request-id` is not on it, so the headers visible to a page are exactly `content-length`, `content-type` and `x-request-id`. This is the payoff of Story 1.8 rejecting a Vite proxy, which would have exposed every header and hidden the requirement
- Give the request a **timeout and an abort signal**. `AbortSignal.timeout()` is what makes "something is on the port and it is not this server" a distinct outcome from `ECONNREFUSED`: a socket that accepts and never answers hangs `fetch` forever, measured in Task 1.8.4. Without one, "degraded" and "unreachable" are the same code path
- Distinguish the outcomes the caller needs and no more: a parsed body, a parsed `ApiError`, a transport failure, a timeout. Do not invent a retry policy here — retry is a property of the poll, and the poll is Task 1.12.3's
- **Decide how much of a `requestId` a user should ever see, and record the decision.** This is the first internal identifier this product would put on screen. Showing it makes "quote this when you report it" possible; `ErrorBoundary` deliberately keeps a **boolean rather than the error** so the fallback structurally cannot show one, and `ErrorFallback`'s vocabulary is its own — `title`, `detail`, `onRetry`. A transport error with a real `requestId` is the first thing that has anything to say to that component. Whatever you choose, the fallback must not start showing raw error messages
- **Decide the `window` error listener question and record it as a decision.** Task 1.7.6 declined one because a browser has no second stream — an uncaught error is already in the console, which is where a report would go — and named "a server endpoint" as the reversal trigger. This story does not build a reporting endpoint, so the trigger has probably **not** fired; say so in `apps/frontend/src/report-error.ts` rather than leaving the note pointing at a story that has closed
- Tests beside the subject. Task 1.11.5's 15 tests across `api-base-url.test.ts` and `health-probe.test.ts` are the starting point — re-home them rather than deleting their coverage. Do not assert on colour, and do not assert on a `useId()` value
- **Do not delete `health-probe.ts` here.** It is Task 1.12.3's to remove, when something replaces the call it makes — see that task's note

## Done when

- One module owns the base URL, the timeout, the abort, the `ApiError` parse and the correlation id, and nothing else in `apps/frontend/src/` calls `fetch`
- A failure carries enough structure for a caller to tell a transport failure, a timeout and an `ApiError` apart
- The `requestId` decision and the `report-error.ts` decision are both written down where the next reader meets them
- `pnpm verify` passes from the repository root

## Approach note

The failure this client exists to survive is not a server failure. Task 1.11.5 made a cross-origin rejection happen and observed both halves together: the browser reports `TypeError: Failed to fetch` while `curl` with the same `Origin` gets a **200 with a full body** and the server logs `statusCode: 200`. **Every piece of server-side evidence says the system is healthy.** Do not debug this story's fetch failures from the server log, and do not build any diagnosis that depends on one.
