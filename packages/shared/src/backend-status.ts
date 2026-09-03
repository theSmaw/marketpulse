/**
 * What a **client** concludes about the backend, which is a different fact from
 * what the backend said about itself.
 *
 * Story 1.12's acceptance criterion is "status distinguishes healthy, degraded
 * and unreachable", and the reflex is to widen {@link HealthStatus} until it
 * holds those three words. That would be wrong, and the reason is structural
 * rather than stylistic:
 *
 * - **`unreachable` is the absence of a response.** No server can report it
 *   about itself — a server that could say "I am unreachable" has, by saying
 *   so, disproved it. It is produced by a socket that refuses, a name that does
 *   not resolve, a CORS rejection the browser makes on the client's behalf, or
 *   a deadline that expires. Every one of those is observed at the client and
 *   nowhere else.
 * - **`degraded` is a judgement, not a report.** It is what a client decides
 *   about an answer it *did* get. The server did not fail — something answered.
 *
 * So there are two vocabularies here and they are not two spellings of one
 * thing. {@link HealthStatus} is **what the server said**; `BackendStatus` is
 * **what this client concluded**, from the answer plus the fact of getting one
 * at all. Keeping them apart is what stops Epic 3's market-feed states, which
 * are a genuine widening of the first, from silently arriving in the second.
 *
 * ## Why it lives in `packages/shared` even though the server never produces one
 *
 * This is the one place the "shared means both sides depend on the same fact"
 * test needs stating rather than applying, because on its face this is a
 * frontend conclusion and Story 1.6 refused to put a one-consumer type here.
 * It is here because it is defined **in terms of the wire contract** — every
 * member below is a statement about {@link HealthResponse} arriving, not
 * arriving, or arriving unreadable — so it and the contract have to change
 * together, and a copy in `apps/frontend` is a copy that drifts the first time
 * `/health` changes. Story 1.13's browser tests are the second consumer.
 *
 * ## The visual language is a separate decision
 *
 * These are names, not colours, exactly as {@link FeedStatus} and
 * {@link AnomalyBand} are. ~~Nothing here says whether this reuses
 * `FeedIndicator`, widens it or gets an indicator of its own.~~ **Task 1.12.4
 * answered that and it is an indicator of its own** —
 * `apps/frontend/src/components/BackendIndicator/` — beside `FeedIndicator`
 * rather than a widening of it, because `FeedStatus` is a fact the backend
 * *reports* about the market feed and this is one a client *concludes* about
 * whether the backend answered at all. They fail independently, and a live feed
 * behind an unreachable backend is a real state one indicator would have to
 * pick between. What the two share is the marker language — a shape plus a
 * word — and not the component. What was settled before either of them, by the
 * token layer and by PRODUCT_SPEC.md §36: a degraded or unreachable backend is
 * a **product state, not a failure**, and must not be rendered in
 * `--status-error` red.
 */

/**
 * The three conclusions a client can reach about the backend, in descending
 * order of how much it knows.
 *
 * - **`healthy`** — a response arrived within the deadline and parsed as a
 *   {@link HealthResponse}. This is the only member that requires the server to
 *   have said anything, and it is the only one the server participates in.
 *
 * - **`degraded`** — *something answered at the API's address and it was not a
 *   readable health report*. See {@link BACKEND_DEGRADED_CAUSES} for the two
 *   producible causes and for what was rejected.
 *
 * - **`unreachable`** — no response at all. A refused connection, a DNS
 *   failure, a browser-side CORS rejection, or a deadline that expired before
 *   any bytes arrived. The interface must keep working in this state and report
 *   the last successful check time, which is this story's second criterion, and
 *   which is why the state is named rather than treated as an error.
 *
 * Ordering is deliberate: `healthy` first because it is the ordinary case, and
 * `unreachable` last because it is the state carrying the least information —
 * a reader can take the position in this array as "how much did we learn".
 */
export const BACKEND_STATUSES = ["healthy", "degraded", "unreachable"] as const;

/** One of {@link BACKEND_STATUSES}. */
export type BackendStatus = (typeof BACKEND_STATUSES)[number];

/**
 * What makes the backend `degraded`, stated concretely so the state is
 * testable.
 *
 * A third state with no producible cause is a state nobody can exercise, so
 * this exists before anything renders the word. With {@link HEALTH_STATUSES} a
 * one-member union, the server itself has no way to say "degraded", and the
 * only material a client has is: a response that took too long, a response
 * whose shape does not parse, or a non-2xx that is still an answer.
 *
 * The definition taken is the **structural** one — *an HTTP response arrived
 * and it is not a readable health report* — which covers the second and third
 * of those and has exactly two causes:
 *
 * - `not-ok-status` — the response arrived with a non-2xx status. Something is
 *   answering at that address and it is not answering with health. Produced
 *   locally by pointing `VITE_API_BASE_URL` at any other HTTP server, and in a
 *   deployed environment by a proxy or ingress answering its own 502 or 503
 *   while the replica behind it is not serving.
 * - `unreadable-body` — the response arrived 2xx and
 *   {@link isHealthResponse} rejected the body. Produced by an address that
 *   serves something else entirely: a static host answering `index.html` with
 *   a 200, which is precisely the `vite preview` and `navigationFallback`
 *   behaviour this repository has measured twice, or a version skew that
 *   removed a field.
 *
 * ## Why not latency
 *
 * "Answering, but slowly" is the classic reading of the word and it is
 * **rejected here**, on two grounds rather than one. It needs a second number —
 * a slow threshold strictly below the client's request deadline — and nothing
 * would keep those two ordered; invert them by accident and `degraded` becomes
 * unreachable code, silently. And there is no measurement to set it from: this
 * route reads `process.uptime()` and returns, so a slow answer today means a
 * slow network rather than a slow server, and a threshold invented now is a
 * number that outlives the guess that produced it — the same argument that
 * keeps the anomaly score's band boundaries out of {@link ANOMALY_BANDS}.
 *
 * The **reversal trigger** is a `/health` that does real work: the moment it
 * checks a database or a market-data provider, "answered slowly" stops being a
 * statement about the network and becomes one about the server, and it gets a
 * threshold measured against a real distribution rather than chosen.
 *
 * Note what this arrangement makes true and is worth knowing before debugging
 * one: a request that **times out** is `unreachable` and not `degraded`,
 * because nothing arrived. The deadline is therefore the boundary between the
 * two states, and it is the client's to own — Task 1.12.2's, in the one module
 * that calls `fetch`.
 */
export const BACKEND_DEGRADED_CAUSES = [
  "not-ok-status",
  "unreadable-body",
] as const;

/** One of {@link BACKEND_DEGRADED_CAUSES}. */
export type BackendDegradedCause = (typeof BACKEND_DEGRADED_CAUSES)[number];
