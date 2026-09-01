# Task 1.7.2 — Request logging and the correlation id

**Status:** Complete
**Story:** [1.7 Logging & Error Handling](STORY.md)
**Depends on:** Task 1.7.1

## Objective

Make every request log a deliberate record rather than Fastify's default one, and get its correlation id back to the client so a user-visible failure can be traced to a log entry.

## Work

- **Two of this criterion's five fields already ship, and one of the five is the one that matters.** Fastify's default request logging gives method, url, status and `responseTime` per request, plus a `reqId` that appears in the log and **nowhere else**. What this task adds is the id leaving the process, and the fields being chosen rather than inherited. Task 1.7.1 quoted the default record as literal output, so this task **replaces `req-1` rather than inventing it** — but re-take the baseline here anyway rather than citing 1.7.1's, which is the rule Task 1.6.4 paid for
- **`genReqId` is a decision, and Fastify's default is wrong for this product.** The default is a per-process counter starting at 1, which collides across restarts and across instances — two requests logged as `reqId: 1` on two days are indistinguishable, and Story 1.11 may run more than one process. Choose an id that is unique without coordination (`crypto.randomUUID()`, or a shorter random token) and record the cost: a UUID is 36 bytes on every log line and every response header, which matters at Epic 3's message rates and does not matter here
- **Decide whether an inbound id is honoured, and decide it now rather than when something sends one.** If a request arrives with `x-request-id` (or a W3C `traceparent`), the choice is to adopt it or to ignore it and mint a fresh one. Story 1.12 is where the frontend starts making requests, Epic 10 is where the agent layer makes several per investigation, and both are easier if the id propagates. The counter-argument is that an id from outside is attacker-controlled text going straight into a log line — so if it is honoured, it is validated for shape and length first. Whichever way, write it down; this is the field a later epic will assume
- **Name the response header once and put it in the contract.** `x-request-id` is the conventional choice. The header has to be set for **every** response including errors and 404s, which means an `onSend` hook or `onRequest` setting it early rather than a per-route line — verify it on a 200, a 404 and a thrown 500, not only on `/health`
- **Check the serialisers rather than trusting them.** Measured in Task 1.7.1: pino's default `req` serialiser logs `method`, `url`, `host`, `remoteAddress` and `remotePort` and **no headers**, so no `Authorization` reaches a log line today — that is a constraint this task inherits and must not relax, not a property to rediscover. `res` logs `statusCode`. Two things to decide: whether `url` or `path` is logged — a query string can carry values that should not be in a log, and the standing rule is that personal data never goes in a URL in the first place — and whether `remoteAddress` is wanted at all, since it is the one field here with a privacy dimension. Custom serialisers go inside the `logger` object in `buildServer()`, which since Task 1.7.1 already holds a `level` and a `transport` that is present only for `pretty` — so a serialiser added carelessly outside that conditional spread is a serialiser that only applies in one format
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

## Outcome

Completed 2026-09-01. One new module, three edits to `buildServer()`, no new
dependency, no new configuration variable. `pnpm verify` exits 0.

### The three decisions

**The id is `crypto.randomUUID()`, not Fastify's counter.** The counter is per
process and starts at 1, so it collides across every restart and across every
instance — two requests logged as `req-1` on two days are indistinguishable, and
Story 1.11 may run more than one process. Uniqueness without coordination is
what makes an id worth returning to a client at all.

The cost, measured rather than estimated: **34 ns per call against the counter's
11 ns**, so 23 ns a request, against the 0.14 ms a warm `/health` response takes.
On the wire it is 36 characters instead of five, +31 bytes on each of the two
records a request writes. That is more than paid for by the serialiser narrowing
below — see the byte figures.

**An inbound `x-request-id` is honoured, validated.** It must match
`^[A-Za-z0-9_-]{1,128}$`; anything else is dropped and a fresh UUID is minted. It
is honoured because the id's purpose is to join records belonging to one user
action, and Story 1.12 and Epic 10 both make several requests where an id that
survives the hop is the difference between one trace and several unrelated ones.
Deciding it now is the point: a caller that sends an id and is silently ignored
has no way to find that out.

The pattern is deliberately narrow rather than merely bounded. It excludes
whitespace, control characters, quotes and commas, so an id reaching a log line
cannot carry structure into whatever reads that line. A failing value is
**dropped, not sanitised** — a repaired id is a different id, and correlating on
it would be a lie. Note the free property: Node joins repeated headers of this
kind with `", "`, so two `x-request-id` headers arrive as one comma-bearing
string, fail, and get a fresh id, which is the right answer because there is no
way to choose between them.

A W3C `traceparent` was rejected, and not on cost. Trace context is a
propagation _format_ — version, trace id, parent id, flags, plus `tracestate`
and a sampling decision — and adopting the header without the model behind it is
the shape of the thing without the thing. Epic 10 can adopt the whole
specification alongside this header rather than instead of it.

**The header is `x-request-id`, set in an `onRequest` hook.** Same name in both
directions, so a caller can echo the value it was given. `onRequest` rather than
`onSend` or a per-route line: it is the earliest hook, so the header is on the
reply before anything downstream can fail — verified on a 404 and on a thrown
500, both produced by Fastify's own handlers with no route code running.

The name lives in `apps/backend/src/request-id.ts` rather than in
`packages/shared`, because this task is backend-only and **Task 1.7.3 is the
task that decides where the wire contract lives**. When the error shape moves,
this name should go with it; Story 1.12 must import it rather than writing the
string out again.

### The logged field set

`req` is now a custom serialiser emitting **`method` and `url`, and nothing
else**. `res` is deliberately left as Fastify's, which logs `statusCode` alone —
restating a one-field default would be a second copy to keep in step for no gain.

Three fields were dropped, and the reasons differ:

- **`host`** is this server's own bind address, constant across every record and
  already known to anyone reading the log.
- **`remoteAddress`** and **`remotePort`** have the privacy dimension the brief
  named, but the deciding argument is stronger than that: behind Story 1.11's
  proxy or load balancer they become the _proxy's_ address, so they would be a
  field that is quietly **wrong** rather than one that is merely absent. If a
  client address is ever wanted, it comes from a forwarded-header decision taken
  on purpose.

`url` and not `path`, so the **query string is logged** — verified:
`"url":"/health?window=1d&symbol=AAPL"`. The standing rule that personal data
never goes in a URL is what makes that safe, which means the rule is now
load-bearing here: the day a query string carries something sensitive, this
serialiser is the second place to change and the caller is the first.

The inherited constraint held and was re-measured rather than cited: **no request
header reaches a log line**, so no `Authorization` does. The serialisers sit
beside `level` in the `logger` object and **outside** the conditional `transport`
spread, so they apply in both formats — verified in `json` and in `pretty`.

### Measurements

| Thing                          | Before                        | After                            |
| ------------------------------ | ----------------------------- | -------------------------------- |
| Correlation id                 | `req-1` (per-process)         | UUID v4                          |
| Id visible outside the process | no                            | `x-request-id` on every response |
| Inbound id honoured            | no (`requestIdHeader: false`) | yes, validated                   |
| `req` fields logged            | 5                             | 2                                |
| JSON record pair, one request  | **427 bytes**                 | **416 bytes**                    |
| Pretty output, one request     | **15 lines**                  | **9 lines**                      |
| Id generation                  | 11 ns                         | 34 ns                            |

The two size figures are the finding worth keeping: **a UUID made every record
longer and the record got shorter anyway**, because dropping three fields saved
more than the 62 bytes the id added. In `pretty` the effect is larger — the
dropped fields were three whole lines each in the `req` block, so a request went
from 15 rendered lines to 9. That answers the dev-loop volume bullet in the
right direction: request logging is now **less** likely to bury the
`signal received` / `shutdown complete` pair than it was before this task.

`responseTime` is **fractional milliseconds over the request lifecycle**, and
this was confirmed rather than inferred from the magnitude: a route sleeping
250 ms logged `responseTime: 262.350541` against a `curl` total of 0.266 s.

### The header and the log line, together

```
$ curl -si http://127.0.0.1:3113/health
HTTP/1.1 200 OK
x-request-id: 670a0de7-1783-44b2-a59e-d0ce84fce79b

$ curl -si http://127.0.0.1:3113/nope
HTTP/1.1 404 Not Found
x-request-id: c0228719-f4e2-4b8b-8442-e586a084fd08

$ curl -si http://127.0.0.1:3113/boom
HTTP/1.1 500 Internal Server Error
x-request-id: c4f77ec6-5f60-41ae-aee6-e34a62f8b524
```

```
{"level":30,...,"reqId":"670a0de7-1783-44b2-a59e-d0ce84fce79b","req":{"method":"GET","url":"/health"},"msg":"incoming request"}
{"level":30,...,"reqId":"670a0de7-1783-44b2-a59e-d0ce84fce79b","res":{"statusCode":200},"responseTime":5.350999999999885,"msg":"request completed"}
{"level":30,...,"reqId":"c0228719-f4e2-4b8b-8442-e586a084fd08","req":{"method":"GET","url":"/nope"},"msg":"incoming request"}
{"level":30,...,"reqId":"c0228719-f4e2-4b8b-8442-e586a084fd08","msg":"Route GET:/nope not found"}
{"level":30,...,"reqId":"c0228719-f4e2-4b8b-8442-e586a084fd08","res":{"statusCode":404},"responseTime":0.2564589999999498,"msg":"request completed"}
{"level":30,...,"reqId":"c4f77ec6-5f60-41ae-aee6-e34a62f8b524","req":{"method":"GET","url":"/boom"},"res":{"statusCode":500},"err":{...},"msg":"deliberate failure ..."}
{"level":30,...,"reqId":"c4f77ec6-5f60-41ae-aee6-e34a62f8b524","res":{"statusCode":500},"responseTime":0.8341660000000957,"msg":"request completed"}
```

The `/boom` route existed only for this measurement and was removed before the
task closed, as the brief allowed.

### Inbound-id cases, all exercised

| Sent                                      | Response header |
| ----------------------------------------- | --------------- |
| `0198f2c1-aaaa-bbbb-cccc-000000000001`    | the same value  |
| 129 × `a`                                 | a fresh UUID    |
| `hello world;drop`                        | a fresh UUID    |
| the header twice (`aaaa1111`, `bbbb2222`) | a fresh UUID    |
| `aa"},"level":99,"msg":"FORGED`           | a fresh UUID    |

The last was sent over a raw socket rather than through `curl`, which refuses to
send it — so the rejection is the pattern's doing and not the client's. Zero
occurrences of `FORGED` in the log.

### Two findings for later tasks

**Fastify 5.12.1's `requestIdHeader` defaults to `false`** — measured via
`app.initialConfig`, not read from documentation. So nothing was being honoured
before this task, and the option is still not used: it copies the header's value
with **no validation at all**, which is the whole thing this task's pattern
exists to prevent. Do not turn it on as a "simplification".

**The 500's log record already carries the full stack, and its response body
already carries the error message.** Measured here incidentally:
`{"statusCode":500,"error":"Internal Server Error","message":"deliberate failure ..."}`
went to the client. That is Task 1.7.4's to fix — noted here so it is a known
starting point rather than a discovery.
