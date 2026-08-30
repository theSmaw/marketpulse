# Task 1.2.6 — Verify the story end to end and document

**Status:** Not started
**Story:** [1.2 Backend Service Skeleton](STORY.md)
**Depends on:** Task 1.2.5

## Objective

Walk the story's six acceptance criteria as a single pass rather than trusting five tasks' individual claims, and write down what was decided. The same shape as Task 1.1.8, which is what made Story 1.1 trustworthy.

## Work

### Verify

Run all six of the story's acceptance criteria in one sitting, from a build made after `pnpm clean`, and record what was actually executed rather than what should work:

- Server starts locally on a configurable port
- `GET /health` returns 200 with status, version and uptime
- Development mode restarts on source change
- Production build emits runnable output
- Process shuts down gracefully on `SIGTERM`/`SIGINT`, closing in-flight requests
- `pnpm verify` passes from the repository root

Also re-run the whole documented command set for this package — the six verbs plus `start` — as Task 1.1.8 did, because two of them (`dev`, and whatever `build` now means) changed meaning during this story.

`dev` is the one that needs running rather than reading. Task 1.2.2 verified it against the code as it stood then; by the time this task runs, the graceful shutdown from Task 1.2.4 sits in the restart path, so the loop's behaviour has changed since it was signed off. Restart on edit, Ctrl-C leaving no orphan (check the `node dist/index.js` child specifically, not just the `node --watch` supervisor, and check the port is released), and root `pnpm dev` staying legible are all worth re-running here rather than inherited.

### Document

- **Write `docs/adr/0002-backend-framework-and-server-composition.md`** and add its row to `docs/adr/README.md`'s index. The framework choice is exactly the kind of decision PRODUCT_SPEC.md §39 wants recorded, and the reasoning is unusually worth keeping: Fastify was chosen over NestJS partly on the spec's "keep the backend relatively small" and partly because NestJS's decorator-and-metadata model fights `verbatimModuleSyntax` and the ESM-only setup, which would have meant relaxing workspace-wide options for one package. Record the rejected alternative and its cost, not just the winner. The `buildServer()` / entrypoint split and the signal-handling placement belong in the same record — and so does **the development loop**, which is a composition decision with a rejected alternative of its own: `node --watch src/index.ts` on Node 24's native type stripping cannot resolve this repository's `./thing.js` specifiers, and `rewriteRelativeImportExtensions` would fix that at the price of a second import convention in the workspace (Task 1.2.2). That is the same shape of trade as the framework choice — a local simplification paid for with a workspace-wide inconsistency — and it belongs beside it rather than buried in a task file
- **Update `CLAUDE.md`** — the current-state paragraph (the backend is no longer a skeleton; the two apps are no longer symmetrical), the file tree, and the Commands section. The `dev` placeholder sentence is now wrong for `apps/backend` and must change; `start` needs stating as an extra like `lint:fix`. The "`pnpm test` means no tests exist" warning stays exactly as it is — this story adds no tests. Task 1.2.2 left four specific stale claims in that file, and they are easy to miss because only one of them mentions the backend:
  - "`packages/shared`'s `dev` is really `tsc -b --watch`" — the script is now `tsc -b --watch --preserveWatchOutput`, and the flag is load-bearing rather than cosmetic: without it that watcher clears the terminal under root `pnpm dev` and takes the other packages' output with it
  - the sentence describing `pnpm dev` as printing two placeholder lines and then sitting in shared's watcher — it is now one placeholder line and a running server
  - the file tree has no `apps/backend/scripts/dev.sh`, which is the first file in the repository that is neither source nor config
  - `pnpm dev` from the root builds `packages/shared` twice, once in its own watcher and once through the backend's `tsc -b --watch` following the project reference. Harmless and worth a line, since the symptom of it going wrong would be a corrupted `.tsbuildinfo` with no obvious cause
- **Update `README.md`** to match. It carries the same command set for humans and the two must stay in step
- **Fix `apps/backend/package.json`'s `description`**, which still reads "MarketPulse API server — a skeleton until Story 1.2". Task 1.2.1 deliberately left it rather than half-correcting it mid-story
- **Update this story's `STORY.md`** — status, the resolved framework decision, and the task table
- **Update `EPIC.md`** — Story 1.2's status, and check whether anything this story learned changes what a later story says. Stories 1.6, 1.7, 1.9, 1.11 and 1.12 all make claims about the backend that were written before it existed

### Then check the downstream stories

Story 1.1's follow-up pass found real corrections in eleven stories. Do the same here, narrowly: 1.6 (configuration replaces this story's two `process.env` reads), 1.7 (error shape, `unhandledRejection`, and the logger this story left at Fastify's default), 1.9 (`app.inject()` against `buildServer()`), 1.11 (`pnpm deploy`, the container host binding, the shutdown timeout inside the orchestrator's kill timeout) and 1.12 (promoting the health type into `packages/shared`). Amend those stories where this story made something concrete that they described speculatively.

Three specific findings from the tasks, which should reach the stories that need them rather than staying in a task file:

- **Story 1.11 — Fastify's startup log is not evidence of the bound interface.** It rewrites `0.0.0.0` to `127.0.0.1` in its `Server listening at` line, so a container that _is_ listening on all interfaces logs as though it is not (Task 1.2.1, confirmed with `lsof`). That story's whole host-binding question has to be answered by checking the socket
- **Story 1.6 — there is slightly more to replace than two `process.env` reads.** Task 1.2.1 also added a `ConfigError` type, a range check on `PORT`, and a fail-before-the-logger-exists stderr path. Whatever configuration approach 1.6 picks has to keep that failure behaviour, not just the values
- **Story 1.12 — `apps/backend` currently declares `@marketpulse/shared` without importing it** (Task 1.2.5). Promoting the health type there is what makes the manifest entry honest again, which is worth saying in that story so the dependency is not deleted first
- **Story 1.10 — `pnpm verify` no longer covers every file in the repository.** `apps/backend/scripts/dev.sh` is checked by nothing: ESLint sees only JS and TS, Prettier has no shell parser and skips it silently, and `tsc` has no view. It is the first file in the workspace outside the tooling net, and it is a file that starts the development server, so a syntax error in it is a real if minor failure mode. **Do not add `shellcheck` in this story** — one small shell file does not justify a new root dependency and a fifth step in `verify`. Say so in that story instead, so the gap is a known and dated choice rather than something CI is quietly assumed to catch

## Done when

- Every acceptance criterion has been executed, and the outcome says what command produced what result
- ADR 0002 exists and is indexed
- `CLAUDE.md`, `README.md`, `STORY.md` and `EPIC.md` agree with each other and with the repository
- `pnpm verify` passes from the repository root
- Story 1.2 is marked complete

## Notes

Task 1.1.8's most useful habit was naming what a verification **could not** prove. Do the same: a local run proves nothing about the deployed environment (Story 1.11), and nothing here proves the frontend can reach this endpoint across an origin boundary (Story 1.12) — CORS has not been considered by any task in this story, which is a deliberate deferral and should be recorded as one.
