# Task 1.7.1 — Log format, level, and whether the environment exists

**Status:** Not started
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
