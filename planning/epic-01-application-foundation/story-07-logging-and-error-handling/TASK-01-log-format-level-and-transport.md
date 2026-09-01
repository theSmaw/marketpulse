# Task 1.7.1 — Log format, level, and whether the environment exists

**Status:** Complete
**Story:** [1.7 Logging & Error Handling](STORY.md)
**Depends on:** Story 1.2 (complete), Story 1.6 (complete)

## Objective

Settle the three decisions everything else in this story is written against — how a log line is formatted, what configures the level, and whether prettifying in development introduces the environment concept Task 1.6.3 deliberately declined to build — and land the `LOG_LEVEL` half of them.

## Work

- **Record the baseline before changing anything, as literal output.** `buildServer()` passes `logger: true` and nothing else, so pino already emits structured JSON with `level`, `time`, `pid`, `hostname`, `reqId`, `req`, `res` and `responseTime`. Start the built server, hit `/health`, send `SIGTERM`, and paste the actual lines. Two of this story's seven criteria are partly met today and the task that does not check will re-implement them
- **`LOG_LEVEL` is this story's variable, and `readEnum` is the reader Task 1.6.3 left unwritten.** `apps/backend/src/config.ts` has `readString` and `readInt` and deliberately no third reader, because nothing had an enum-valued variable. Add `readEnum(env, key, allowed, fallback)` beside them in the same shape — blank means absent, and the message names the variable and quotes what was typed: `LOG_LEVEL must be one of fatal, error, warn, info, debug, received "chatty"`. Task 1.6.1 measured that signature; do not re-derive it
- **The variable's default now lives in two places and one check.** `CONFIG_VARIABLES` gains a `{ key, required, default, description }` entry and `apps/backend/.env.example` gains a documented line; `pnpm env:check` fails if the two disagree, defaults included. That is the third of its four checks and the one that rots first — confirm it fires by changing one of the two and watching `verify` fail, rather than assuming it covers a new variable
- **Decide which levels are admitted, and say why the edges are in or out.** pino's set is `fatal`/`error`/`warn`/`info`/`debug`/`trace` plus `silent`. `silent` is the interesting one: Story 1.9's runner will want a quiet server under `app.inject()`, and admitting it here costs one array entry against inventing a second mechanism later. `trace` is the other edge — pino's own request logging is at `info`, so `trace` buys nothing until something emits at it
- **pino-pretty is a dependency of `apps/backend`, not root tooling, and it is a worker thread.** The house rule is "does the package's source `import` it?" — a transport is resolved by application code, so it does not go at the root beside ESLint and Prettier. Two costs to measure rather than assume: install size and the startup delta against the **76 ms median** start-to-listening baseline, and the interaction with shutdown. A pino transport runs in a worker thread, and ADR 0002 §6's drain is a 5-second ceiling around `app.close()` with `process.exit()` at the end of every path. Confirm the last log line actually reaches the terminal before the process leaves, and re-measure the **~100 ms** SIGTERM-to-exit half of the dev loop's ~1.1 s baseline. A transport that adds seconds there is a regression in the thing developers feel most
- **Prettifying only in development is the environment concept, and there are three ways to have it.** Task 1.6.3 closed the question by deciding there is no variable naming the environment: the three environments differ in where _values_ come from, and one precedence rule covers all three. A log format is the first thing that plausibly has to _behave_ differently, so take this on purpose:
  - **(a) JSON always, and pipe.** The application emits JSON unconditionally and `apps/backend/scripts/dev.sh` pipes it through `pino-pretty` as a devDependency. The concept stays unbuilt, production is unaffected by definition, and the cost is named: `scripts/dev.sh` is the one file `pnpm verify` checks with nothing, and a pipe there also breaks the exit-code propagation Task 1.2.5 verified unless it is written carefully
  - **(b) `LOG_FORMAT=json|pretty`.** A value, not an environment — the same shape as `PORT`, read by the same module, and the first caller for `readEnum` if `LOG_LEVEL` alone does not force it. It is one more variable in `.env.example`
  - **(c) `NODE_ENV`.** The thing Task 1.6.3 declined. Choosing it is a reversal of a recorded decision and needs to be written as one
  - `LOG_LEVEL` alone may cover what this story actually needs, which would keep the concept unbuilt for another story. That is a real outcome, not a failure to decide
- **Decide what must never reach a log line, before there is anything secret to leak.** Epic 2's Alpaca credentials and Epic 10's LLM credentials arrive in `config.ts` as required strings, and the obvious convenience — logging the resolved configuration at startup so an operator can see what the process read — is exactly how a key ends up in a log aggregator. Either it is not logged, or `redact` is configured with the key paths now and the rule is written down. Say which, and whether the resolved config is logged at all
- **Check the level actually takes effect end to end**, rather than that the variable parses: run with `LOG_LEVEL=warn` and confirm the request/response pair disappears, and with `LOG_LEVEL=debug` and confirm something appears that did not

## Done when

- The format decision, the level decision and the environment decision are each closed with their reasoning, and any option rejected is recorded with why
- `LOG_LEVEL` is readable through `config.ts` via `readEnum`, documented in `.env.example`, and `pnpm env:check` passes — after being made to fail
- Baseline and post-change log output are both quoted as literal lines
- Start-to-listening and the SIGTERM half of the dev loop are re-measured against 76 ms and ~100 ms, and any transport's cost is attributed to the transport
- The redaction rule is stated, whichever way it went
- `pnpm verify` exits 0

## Notes

This task changes no route, no error shape and nothing in the frontend. Its whole job is to make the next four tasks decisions-free.

## Outcome

### The three decisions

**Format: JSON always, from pino, unchanged.** `logger: true` already emitted structured JSON and nothing about the records changed — same fields, same levels, same serialisers. What this task added is a severity floor and a rendering choice on top of them.

**Level: `LOG_LEVEL`, admitting pino's whole set.** `fatal` / `error` / `warn` / `info` / `debug` / `trace` / `silent`, defaulting to `info`, which is what the server did before the variable existed. The set is deliberately not curated. A narrower list is a second vocabulary to keep in step with the logger's own, and the only thing it would buy — refusing `trace` because nothing emits at it — costs an operator a rejected value for a level the library genuinely supports. `silent` is in for Story 1.9, whose test runner will not want a server narrating every injected request.

**Environment: still not built, and this was the test it was most likely to fail.** The log format is genuinely different in development, which is exactly the "something has to _behave_ differently" trigger Task 1.6.3 wrote down. It is `LOG_FORMAT=json|pretty` — a value read by the same module with the same precedence, exactly like `PORT` — and what makes development pretty is that `apps/backend/scripts/dev.sh` exports it. Nothing in the application branches on which environment it is in. The two rejected options:

- **`NODE_ENV`** — a reversal of a recorded decision that buys nothing over a value. Not taken.
- **Piping `node --watch dist/index.js | pino-pretty` in `dev.sh`** — costs the exit-code propagation Task 1.2.5 verified (a pipeline's status is the last command's) and the `trap`, which relies on `node --watch` being the shell's foreground process. Both are real regressions in the loop developers use most, for a rendering choice.

### Measurements

|                                    | JSON       | pretty     | baseline                            |
| ---------------------------------- | ---------- | ---------- | ----------------------------------- |
| start-to-listening, median of 11   | 73 ms      | 79 ms      | 74 ms measured here, 76 ms recorded |
| SIGTERM-to-exit, median of 11      | 2 ms       | 3 ms       | 2 ms                                |
| dev-loop edit-to-listener, 5 edits | 805–936 ms | 815–973 ms | ~1.1 s recorded                     |
| Ctrl-C to loop exit, survivors     | 16 ms, 0   | 19 ms, 0   | —                                   |

**The worker-thread flush worry did not materialise.** 5000 records followed immediately by `process.exit(0)` lost **nothing**, in either mode, to a file or to a pipe. Task 1.7.5 inherits that as a measurement rather than a suspicion — though it should re-take it, because 1.7.5 adds exit paths this task did not.

`pino-pretty` is pinned at **13.1.3**, is **12 packages and 448 kB**, and trips no install script — a full `preinstall`/`install`/`postinstall` sweep of the installed tree still finds only `esbuild`, so `allowBuilds` did not fire.

### Two things that were not obvious

**`pino` is not directly importable from `apps/backend`.** It arrives transitively through Fastify and pnpm's strict linking hides it, so `import pino from "pino"` is `ERR_MODULE_NOT_FOUND`. Anything wanting a logger goes through `app.log`. This cost one wrong measurement before it was noticed — a spike that appeared to show catastrophic log loss was actually a module-resolution failure printing a 19-line stack.

**`pino-pretty` is a `dependency`, not a `devDependency`**, against the first read of the house rule ("does the package's source `import` it?"). Nothing imports it; the transport target is a **string resolved by name at runtime**, so a tree that pruned it turns the documented `LOG_FORMAT=pretty` into `ERR_MODULE_NOT_FOUND` at startup, in the environment that is hardest to debug. The rule keys on resolution, not on the `import` keyword. 448 kB in a production image is the price of a documented value not being a trap.

### Three level behaviours a reader would otherwise find the hard way

- **At `warn` and above a healthy server is completely silent**, `Server listening at …` included, because nothing in a normal run emits above `info`. A supervisor or health check waiting on that line hangs. Stories 1.10 and 1.11 inherit this.
- **`silent` means silent**, errors included. In on purpose; measured to hang a readiness wait, which is the shape of the hazard.
- **`LOG_LEVEL=debug` shows nothing `info` does not.** Fastify's request logging is at `info` and this application emits below it nowhere. The variable is real and its lower half is empty — as Task 1.7.1's brief predicted.

### Redaction

**The resolved configuration is never logged.** Stated in `config.ts` beside the `return`, so the next person to want the startup-dump convenience reads why not. `redact` with key paths was the alternative and was rejected as a denylist whose failure mode is a key nobody added to it — silent, in the place secrets are hardest to retract from. Related, and inherited by Task 1.7.2 as a constraint rather than a discovery: pino's default `req` serialiser logs `method`, `url`, `host`, `remoteAddress` and `remotePort` and **no headers**, so no `Authorization` reaches a log line today.

### The baseline, as literal output

Before (`logger: true`, `/health` then a 404 then SIGTERM) — reproduced here because two of this story's criteria are partly met today and the task that does not check will re-implement them:

```
{"level":30,"time":1788245791731,"pid":97802,"hostname":"…","msg":"Server listening at http://127.0.0.1:3000"}
{"level":30,"time":1788245791739,"pid":97802,"hostname":"…","reqId":"req-1","req":{"method":"GET","url":"/health","host":"127.0.0.1:3000","remoteAddress":"127.0.0.1","remotePort":52916},"msg":"incoming request"}
{"level":30,"time":1788245791743,"pid":97802,"hostname":"…","reqId":"req-1","res":{"statusCode":200},"responseTime":4.3537919999999986,"msg":"request completed"}
{"level":30,"time":1788245791753,"pid":97802,"hostname":"…","reqId":"req-3","msg":"Route GET:/nope not found"}
{"level":30,"time":1788245791753,"pid":97802,"hostname":"…","reqId":"req-3","res":{"statusCode":404},"responseTime":0.14783299999999144,"msg":"request completed"}
{"level":30,"time":1788245791753,"pid":97802,"hostname":"…","signal":"SIGTERM","msg":"signal received, shutting down"}
{"level":30,"time":1788245791753,"pid":97802,"hostname":"…","msg":"shutdown complete"}
```

So `reqId` already exists and is already returned in no header, and the 404 is already logged at `info` with a Fastify message and no body shape. **Task 1.7.2 has to replace `req-1`, not invent it; Task 1.7.4's not-found path already logs and does not respond in our shape.**

After, at `LOG_FORMAT=pretty`, same sequence:

```
[15:01:38.616] INFO (99483): Server listening at http://127.0.0.1:3000
[15:01:38.625] INFO (99483): incoming request
    reqId: "req-1"
    req: {
      "method": "GET",
      "url": "/health",
      …
    }
[15:01:38.628] INFO (99483): signal received, shutting down
    signal: "SIGTERM"
[15:01:38.628] INFO (99483): shutdown complete
```

### Rejected values, and every bad key at once

```
$ LOG_LEVEL=chatty node dist/index.js
LOG_LEVEL must be one of fatal, error, warn, info, debug, trace, silent, received "chatty"

$ PORT=nope LOG_LEVEL=INFO LOG_FORMAT=fancy node dist/index.js
PORT must be an integer between 1 and 65535, received "nope"
LOG_LEVEL must be one of fatal, error, warn, info, debug, trace, silent, received "INFO"
LOG_FORMAT must be one of json, pretty, received "fancy"
```

Casing is the likeliest mistake here, and `LOG_LEVEL=INFO` looks correct — which is why the message quotes the raw value.

### `env:check`, made to fail

Both new variables are covered, confirmed by breaking each of the two checks that could plausibly miss a new key rather than by assuming:

```
✗ LOG_LEVEL defaults to "info" in config.ts but apps/backend/.env.example says "debug".
✗ LOG_FORMAT is read by apps/backend but is not in apps/backend/.env.example.
```

Restored, `pnpm env:check` reports `4 backend variables documented, frontend example clean.` and `pnpm verify` exits 0.

### One API change the next tasks depend on

`buildServer()` is no longer argument-less. It takes `ServerOptions` — `{ logLevel, logFormat }` — with **no default**, because a default in `server.ts` is a second copy of `config.ts`'s and two copies of a default is how they stop agreeing. Story 1.9 gets `buildServer({ logLevel: "silent", logFormat: "json" })`, which is the thing it wants. `ServerOptions` deliberately is not `Config`: the application has no business knowing there is a port.
