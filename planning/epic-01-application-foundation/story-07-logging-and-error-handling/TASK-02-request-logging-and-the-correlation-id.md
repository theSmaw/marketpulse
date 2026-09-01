# Task 1.7.2 — Request logging and the correlation id

**Status:** Not started
**Story:** [1.7 Logging & Error Handling](STORY.md)
**Depends on:** Task 1.7.1

## Objective

Make every request log a deliberate record rather than Fastify's default one, and get its correlation id back to the client so a user-visible failure can be traced to a log entry.

## Work

- **Two of this criterion's five fields already ship, and one of the five is the one that matters.** Fastify's default request logging gives method, url, status and `responseTime` per request, plus a `reqId` that appears in the log and **nowhere else**. What this task adds is the id leaving the process, and the fields being chosen rather than inherited. Start by quoting the default record so the diff is visible
- **`genReqId` is a decision, and Fastify's default is wrong for this product.** The default is a per-process counter starting at 1, which collides across restarts and across instances — two requests logged as `reqId: 1` on two days are indistinguishable, and Story 1.11 may run more than one process. Choose an id that is unique without coordination (`crypto.randomUUID()`, or a shorter random token) and record the cost: a UUID is 36 bytes on every log line and every response header, which matters at Epic 3's message rates and does not matter here
- **Decide whether an inbound id is honoured, and decide it now rather than when something sends one.** If a request arrives with `x-request-id` (or a W3C `traceparent`), the choice is to adopt it or to ignore it and mint a fresh one. Story 1.12 is where the frontend starts making requests, Epic 10 is where the agent layer makes several per investigation, and both are easier if the id propagates. The counter-argument is that an id from outside is attacker-controlled text going straight into a log line — so if it is honoured, it is validated for shape and length first. Whichever way, write it down; this is the field a later epic will assume
- **Name the response header once and put it in the contract.** `x-request-id` is the conventional choice. The header has to be set for **every** response including errors and 404s, which means an `onSend` hook or `onRequest` setting it early rather than a per-route line — verify it on a 200, a 404 and a thrown 500, not only on `/health`
- **Check the serialisers rather than trusting them.** pino's default `req` serialiser logs `method`, `url`, `hostname`, `remoteAddress` and `remotePort`; `res` logs `statusCode`. Two things to decide: whether `url` or `path` is logged — a query string can carry values that should not be in a log, and the standing rule is that personal data never goes in a URL in the first place — and whether `remoteAddress` is wanted at all, since it is the one field here with a privacy dimension. Custom serialisers go on the Fastify options beside `logger`, in `buildServer()`
- **Confirm `responseTime` is the duration the criterion means.** It is Fastify's own measurement of the request lifecycle, which is what is wanted; state its unit (milliseconds, fractional) rather than leaving a reader to guess from the number
- **This is a backend-only task and the client half is later.** The frontend makes no requests until Story 1.12, so "a user-visible error can be traced to a log entry" is a capability this task builds and a later story consumes. Do not build a frontend consumer for it here
- **Watch the volume against the dev loop.** `node --watch` restarts on every source change, and each restart re-emits the startup lines. If request logging becomes noisy enough to bury the `signal received` / `shutdown complete` pair the dev loop relies on, that is a finding for Task 1.7.1's level decision rather than something to fix by logging less

## Done when

- Every response carries the correlation id in a named header, verified on a 200, a 404 and a 500
- The id generator is chosen, and the inbound-id question is answered either way with its reasoning
- The logged field set is stated, including what was deliberately left out
- Literal log lines and the matching `curl -i` output are recorded together, so the id in the header and the id in the log can be seen to be the same value
- `pnpm verify` exits 0

## Notes

The 500 case needs something that throws. A route added and removed inside this task is fine; Task 1.7.4 is where a failing request gets a real shape, and this task only needs to prove the id survives one.
