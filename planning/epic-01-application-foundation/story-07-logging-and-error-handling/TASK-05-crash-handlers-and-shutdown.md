# Task 1.7.5 — Crash handlers, and their interaction with shutdown

**Status:** Complete
**Story:** [1.7 Logging & Error Handling](STORY.md)
**Depends on:** Task 1.7.4

## Objective

Catch and log what escapes the request lifecycle entirely, without breaking the drain that is already there.

## Work

- **Measure what happens today before writing anything, because the criterion's wording is slightly wrong about it.** `unhandledRejection` and `uncaughtException` have no handlers, but Node has defaults: since Node 15 an unhandled rejection is thrown and exits the process non-zero, and an uncaught exception prints a stack to stderr and exits. So the process does not crash _silently_ — it crashes **outside the log stream**, as raw stderr with no level, no timestamp, no correlation id and nothing a log aggregator can index. Quote both defaults as literal output; that is what this task is actually replacing
- **They can only log through `app.log`, and that is worth stating rather than letting it read as a shortcut.** Task 1.7.4 uses `request.log` everywhere, precisely so every error record carries `reqId`. A process-level handler has no request and therefore no `request.log`, so `app.log` here is not the lazier choice but the only available one — and it is the mechanical reason the crash record has no correlation id. That and the asymmetry two bullets down are the same fact.
- **The handlers go in `index.ts`, not `buildServer()`.** They are process-wide, and a factory that installs process-wide handlers is a surprise for anything constructing two instances — which Story 1.9's tests will. This is the same reason the signal handlers live there, and the file's comment already says so
- **The `shuttingDown` flag exists to be reused, and this is the interaction to decide rather than discover.** A shutdown owns the flag and a 5-second ceiling (ADR 0002 §6). A rejection thrown _during_ the drain must not start a second `app.close()`, must not clear or restart the ceiling, and must not turn a clean exit 0 into a race. Reuse the flag: if `shuttingDown` is already true, log and let the existing path finish. Test it, by throwing during a drain rather than reasoning about it
- **Decide log-and-exit versus log-and-continue, for each of the two events separately.** After an `uncaughtException` the process state is unknown by definition, so continuing serves requests from a program that has already proved it is not the program you thought — exit. An unhandled rejection is arguably softer, but treating the two differently means two behaviours to remember and Node's own default already treats them the same. Recommend exiting on both and say what would change that
- **The flush worry was measured in Task 1.7.1 and did not materialise — but the shape of the question changed, so re-take it rather than citing it.** Two things 1.7.1 established. First, **the default path has no worker thread at all**: `transport` is set only for `LOG_FORMAT=pretty`, so a production process logging JSON is writing through pino's ordinary destination and the worker-thread hazard is a _development_ hazard here. Second, 5000 records followed immediately by `process.exit(0)` lost nothing in **either** mode, to a file or to a pipe. So the precedent is stronger than Task 1.2.1's surviving `EADDRINUSE` record — but this task adds exit paths 1.7.1 did not have, and the crash line is the one line whose loss is unrecoverable. Check both modes explicitly. If either loses it, `pino.final` or an explicit flush is the answer rather than a delay
- **Decide whether a crash respects `LOG_LEVEL`, and this is a new question Task 1.7.1 created.** `silent` is an admitted value and was admitted deliberately for Story 1.9's test runner; `warn` and above already make a healthy server completely silent, `Server listening at …` included. If the crash handlers log through `app.log.fatal`/`app.log.error`, then `LOG_LEVEL=silent` gives a process that dies leaving **nothing at all** — no stack on stderr either, because these handlers are what replaced Node's default stderr behaviour. That is a strictly worse failure mode than the one this task exists to fix. Three ways out: log the crash through pino regardless of level (a deliberate exception to the level, which has to be written down as one), refuse `silent` after all, or accept it as the operator's stated choice. **Prefer the first** — an operator asking for quiet logs is not asking for a silent death — and say what the exception costs. Whichever way, exercise it under `LOG_LEVEL=silent` rather than reasoning about it.

  Task 1.7.4 set the precedent for the _other_ half of this, and it points the same way without settling this one. It logs a 4xx at `info` specifically so Task 1.7.1's property survives — at `LOG_LEVEL=warn` a healthy server is silent, and a server answering 404s is healthy — which is ordinary traffic respecting the level, deliberately. That is not an argument for a crash respecting it; it is the contrast that makes the exception legible. **Ordinary traffic obeys the level; the process dying does not.** If this task takes that line, those two clauses are the rule to write down

- **A crash record has no correlation id, and that asymmetry should be stated rather than left to be noticed.** Task 1.7.2 gave every _request_ record a `reqId` and every response an `x-request-id` header. A process-level handler has neither: `uncaughtException` and `unhandledRejection` fire outside any request context, so the record these handlers write carries no id and the user who triggered it holds a header pointing at a request that logged normally and then died. That is not fixable here — Node's handlers are handed an error, not a request — but it is the one case where "quote the id from the response and find the log entry" gives an incomplete answer, and Story 1.11's operator should know it. Note also which half of the pair the id _does_ reach, which Task 1.7.4 measured rather than left as a prediction: an error thrown inside a route never gets here at all — the error handler catches it, answers `{"code":"INTERNAL_ERROR","message":"An unexpected error occurred.","requestId":"…"}` and writes a level-50 record carrying the full stack under that same `reqId`. So there are two distinct failure experiences to describe rather than one: **a contained 5xx, where the user holds an id that finds the stack, and a crash, where there is no id and the request in flight may get no response at all.** Measure that second half — a client whose request is in flight when the process dies sees a reset connection rather than an `ApiError`, so the shape Task 1.7.4 made universal has exactly one hole in it and this task is where it gets named
- **Keep the exit codes consistent with what is already there.** Every existing failure path exits 1 — bad configuration, failed listen, shutdown timeout, second signal. A crash is another 1; inventing a distinct code buys nothing that the log line does not already say, unless Story 1.11's orchestrator wants one, and it does not exist yet
- **`node --watch` waits for the child indefinitely (Task 1.2.2), so a handler that hangs stops the dev loop rather than slowing it.** Whatever this task installs must reach `process.exit()` on every path, the same property the shutdown handler's `Promise<never>` signature encodes
- **Consider whether the 5-second ceiling should also cover a crash-triggered close**, if the chosen behaviour drains at all before exiting. If it does not drain — exit immediately after the log — say so, because "we deliberately drop in-flight requests when the process is already broken" is a decision and not an oversight

## Done when

- Both handlers are installed, and both produce a structured log record rather than raw stderr — including under `LOG_LEVEL=silent`, or with a recorded reason why not
- A rejection thrown during a drain is exercised, and the drain's outcome and exit code are recorded
- The flush question is settled by observation in **both** log formats — the crash line is shown to survive the exit under JSON and under pretty
- Node's pre-existing defaults are recorded as the baseline, so the change is attributable
- `pnpm verify` exits 0, and the dev loop's Ctrl-C still gives a clean exit 0 with both ports released

## Notes

This is the last backend task in the story. After it, criteria 1–6 are all backend-side and satisfied; criterion 7 is Task 1.7.6's and touches no file in `apps/backend`.

## Outcome

Two `process.on` handlers in `apps/backend/src/index.ts` and nothing else. No
new file, no new dependency, no change to `buildServer()` — the whole task is
one function and two registrations, which is the shape the brief predicted.

### The baseline, measured before anything was written

The criterion's wording is wrong about this and the brief said so. Node 24
already handles both events. Both exit **1**, and both print:

```
file:///…/probe/baseline.mjs:7
    setTimeout(() => { throw new Error("boom from a timer"); }, 10);
                       ^

Error: boom from a timer
    at Timeout._onTimeout (file:///…/probe/baseline.mjs:7:30)
    at listOnTimeout (node:internal/timers:685:17)
    at process.processTimers (node:internal/timers:618:7)

Node.js v24.20.0
```

The rejection's output is the same shape with the rejected value in place of
the thrown one. Two things follow, and the second was not anticipated:

- **It is the wrong stream, not silence.** That text goes to **stderr**, with no
  level, no timestamp, no pid and nothing an aggregator indexes, while the
  `Server listening at …` record beside it goes to **stdout** as JSON. A
  deployment collecting stdout loses the crash and keeps everything else.
- **The two defaults are indistinguishable from each other.** Node 15+ throws an
  unhandled rejection, so it prints exactly like an uncaught exception. Nothing
  in the output says which one happened. The `event` field is what fixes that,
  and it was added for this reason rather than for tidiness.

### What was decided

| Question                     | Decision                                 | Why                                                                                                                      |
| ---------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Where                        | `index.ts`, not `buildServer()`          | Process-wide, like the signal handlers. A factory installing them surprises Story 1.9's two instances                    |
| Logger                       | `app.log`                                | The only option, not the lazy one — a process handler is handed an error, not a request, so there is no `request.log`    |
| Level                        | `fatal` (60), **overriding `LOG_LEVEL`** | Ordinary traffic obeys the level; the process dying does not                                                             |
| Both events                  | Treated the same                         | Two behaviours is two things to remember, and Node's own default treats them alike                                       |
| Drain                        | **None.** Exit immediately               | `app.close()` on a process of unknown state stacks a second failure on the one being reported                            |
| Exit code                    | 1                                        | Every other failure path here is 1; no orchestrator exists yet to want a distinct one                                    |
| During a shutdown            | Log and return; the drain finishes       | Reuses `shuttingDown`. The ceiling is what still guarantees `process.exit()`                                             |
| Non-`Error` rejection reason | Passed through unnormalised              | pino renders `"err":"a bare string reason"`. `new Error(String(reason))` would manufacture a stack pointing at this file |

### The level exception, and the bug it caused

`app.log.level = "fatal"` before the record and **restore afterwards**. The
restore is not tidiness, and the first version of the function did not have it:

- A crash-during-drain run **silently lost `shutdown complete`**, because the
  level stayed at 60 for the rest of the process's life. The ceiling's level-50
  `shutdown timed out, forcing exit` would have gone the same way — the one
  record that explains a hung shutdown.
- The loss looked _selective_ rather than total, which is what made it worth
  chasing: `request completed` records kept appearing at level 30 afterwards.
  Fastify's per-request child loggers keep the level they were created with, so
  mutating the root logger does not reach them. Only the root logger's own
  records — every line in `shutdown()` — went quiet.

With the restore in place, the same run gives the full sequence. Mutating the
level rather than hand-rolling a stderr line is what keeps **one** rendering of
a log record: same serialisers, same format, `pretty` still pretty.

### Measurements

**The crash record, at every combination tried.** `LOG_LEVEL` ∈ {`info`,
`warn`, `silent`} × `LOG_FORMAT` ∈ {`json`, `pretty`}: the record is written,
stderr is **empty**, exit is **1**. At `silent` the record is the _only_ line
the process produces. In JSON:

```
{"level":60,…,"err":{"type":"Error","message":"boom from a timer","stack":"Error: boom from a timer\n    at Timeout._onTimeout …"},"event":"uncaughtException","msg":"process crashed, exiting"}
```

**Flush: nothing lost, in either format.** The record survives an immediate
`process.exit(1)` under `json` and under `pretty` — the worker-thread path
included — at every level above. Task 1.7.1's 5000-record result is the
precedent; this is the one line whose loss is unrecoverable, so it was taken
again on its own rather than cited. No `pino.final`, no delay.

**A rejection during a drain.** Against a temporary slow route (2 s), with
`SIGTERM` sent while a request was in flight and the rejection scheduled after
it:

```
{"level":30,…,"req":{"method":"GET","url":"/slow"},"msg":"incoming request"}
{"level":30,…,"signal":"SIGTERM","msg":"signal received, shutting down"}
{"level":60,…,"err":{…"rejected during the drain"…},"event":"unhandledRejection","msg":"process crashed, exiting"}
{"level":30,…,"res":{"statusCode":200},"responseTime":2010.72,"msg":"request completed"}
{"level":30,…,"msg":"shutdown complete"}
```

Exit **0**, the client got `{"slow":true}`, the ceiling was neither cleared nor
restarted, and there was exactly one shutdown.

**Three failure experiences, not two.** All three on the shipping tree:

| Failure                       | Client sees                                                    | Log                                         | Process |
| ----------------------------- | -------------------------------------------------------------- | ------------------------------------------- | ------- |
| Route throws (Task 1.7.4)     | `500` + `ApiError` + `x-request-id`                            | level 50 with the stack, under that `reqId` | Lives   |
| Crash, request in flight      | `curl: (52) Empty reply from server` — **no body, no headers** | level 60, no `reqId`                        | Dies    |
| Crash detached from a request | **`200` and a valid `x-request-id`**                           | level 60, no `reqId`                        | Dies    |

The third is the uncomfortable one and is new information. A route that
schedules work in a timer answers normally, and the process dies milliseconds
later; the id the user holds points at a record saying the request **succeeded**,
because it did, while the crash record beside it carries no id at all. The
second is the hole in Task 1.7.4's universal shape: not even the header
survives, so there is nothing at all for the user to quote.

**Regressions checked.** `pnpm verify` exits 0 in **9.9 s**. The dev loop's
Ctrl-C — sent as `SIGINT` to the real process group — leaves **zero** survivors,
releases both 3000 and 5173, and still logs `signal received, shutting down` /
`shutdown complete`. Note the obvious way to test that is wrong: signalling
pnpm's pid alone rather than the group orphaned `node dist/index.js` holding
port 3000, which looks exactly like a regression and is the harness.

### Feed-forward

- **Task 1.7.7** gains: the baseline quote above; the level exception and its two
  clauses; the restore and the bug it prevents; the three failure experiences,
  which is the table the ADR should carry; and the deliberate no-drain decision.
  The figure to re-take is that stderr is empty on a crash — it is the whole
  claim of this task in one observation.
- **Story 1.9** should know `app.log.level` is mutated and restored. A test
  asserting on the level around a crash is asserting on a two-statement window.
- **Story 1.11**'s operator needs the third row of that table before reading a
  log with it in, and needs to know a crash drops in-flight requests rather than
  draining them.
