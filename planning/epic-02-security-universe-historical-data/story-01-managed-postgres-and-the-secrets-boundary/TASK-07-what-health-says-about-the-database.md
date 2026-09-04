# Task 2.1.7 — Decide what `/health` says about the database, and where reachability is actually reported

**Status:** Not started
**Story:** [2.1 Managed Postgres Provisioning & the Secrets Boundary](STORY.md)
**Depends on:** Task 2.1.6

## Objective

Answer the story's fourth open decision with something running: whether `/health` reports the database, and if not, what surface does — without turning a database blip into a crash-loop.

## Work

- **Start from the property that makes this dangerous.** The Container App's **liveness probe hits `/health`**, and a failing liveness probe kills the replica. So a `/health` that fails when the database is unreachable converts a recoverable dependency outage into a restart loop, during which the application is _less_ available than it would have been, and on a platform where Task 1.11.7 already measured a failing rollout sitting at `Activating` for ten minutes. Whatever is decided, the liveness answer must stay cheap and local
- **Read what `/health` currently is before changing it.** It is a wire contract in `packages/shared` — `HEALTH_STATUSES`, `HealthResponse`, `isHealthResponse()` — with a response schema and a `satisfies` guard on the backend, a 61-byte body, three platform probes pointed at it, a client that polls it every 30 seconds, and a `BackendStatus` vocabulary on the frontend derived from it. Adding a field is therefore a change to a contract with five readers, and the guard means the type and the schema cannot silently disagree — which is the mechanism working, and it makes the change cheap to do correctly and impossible to do accidentally
- **Note that the vocabulary for this already exists and was designed for exactly this arrival.** `BackendStatus`'s `degraded` is defined **structurally** — `not-ok-status` and `unreadable-body` — rather than by latency, and the recorded reason for structural definition was that there was nothing to set a threshold from _while `/health` reads `process.uptime()` and returns_. A database check is the first thing that changes that sentence. Whether "the backend is up and its database is not" should reach the user as `degraded` is a genuine product question and it belongs to this task, not to the frontend story that would render it
- **Take the decision explicitly among at least three shapes**, with the rejected ones named: `/health` gains a field the probes do not fail on; a **second endpoint** (a readiness or diagnostic surface) that the platform's readiness probe may use where liveness does not; or nothing at all in this story, with database reachability visible only in logs and Story 2.8 owning the surface. The third is a legitimate answer and the record should say why it was or was not taken
- **If a check is added, decide what it costs and how often it runs.** A per-request `SELECT 1` on an endpoint polled by three probes and every open browser tab is a real query rate against a B1MS with a small connection ceiling — Task 1.12.7 measured the deployed baseline as a precise and explainable **4 requests per 30 s** with **+1 per visible tab** — and it is also billable traffic against the Consumption plan's under-1,000-bytes-per-second idle condition. Cache it, or bound it, and say which
- **Whatever is added must be produced rather than reasoned about.** Break the database, watch the endpoint, watch the probes, watch the replica, and watch what the frontend's indicator does — in a browser, because that is the only instrument that sees the frontend's verdict. If the indicator changes state, `e2e/specs-deployed/` is where that becomes an assertion; if it does not, say so, because "no user-visible change" is a valid outcome that should be a decision rather than an omission
- **Do not widen the health contract for a future need.** If a database field is added, it is one field with a stated meaning; Epic 3's feed and Epic 10's agent will both want one too, and a generic dependency-status map invented here is a schema nobody has requirements for yet

## Done when

- The decision is taken and recorded with the rejected shapes named
- Whatever ships was produced against a genuinely unreachable database, with the endpoint, the probes, the replica and the frontend all observed
- The liveness probe does not kill the replica when the database is down, watched across probe intervals
- Any contract change to `/health` carries the schema, the `satisfies` guard, the shared type and the frontend's reading of it in the same change
- The added query rate and its cost are stated
- `pnpm verify`, `pnpm test:process` and the browser suites all still pass, with and without a database

## Notes

Story 1.12 built a three-state vocabulary and then spent two tasks proving that a server-side instrument cannot see what a browser sees. This is the first time a state has arrived that the _server_ can see and the browser cannot infer — and the temptation will be to report it everywhere. The probe property is the reason not to.
