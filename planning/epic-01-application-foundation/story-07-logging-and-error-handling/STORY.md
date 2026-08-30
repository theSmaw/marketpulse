# Story 1.7 — Logging & Error Handling

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Story 1.2
**Epic scope covered:** logging, basic error handling

## Description

Structured logging and a consistent error contract across the stack. PRODUCT_SPEC.md §36 requires that failures degrade locally rather than collapsing the application, so the error handling established here sets the pattern for every later partial-failure state.

## Conventions from Story 1.1

Story 1.1 is complete, and these four bind this story. They are stated in every Epic 1 story so each one can be read on its own; the full reasoning is in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`.

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && test`, chained with `&&` so the first failure is the exit code. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

One thing that is true today and will not be forever: until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0, and they are now the only placeholders left. The companion note about both apps' `dev` scripts being placeholders is **no longer true** — Stories 1.2 and 1.3 made all three real.

## What that means for this story

- The error shape is the first genuinely shared contract between the two apps, so it belongs in `packages/shared` — which is consumed as **built output**. Editing it means rebuilding shared before either app typechecks against the change; `pnpm build` and `pnpm verify` do that, a bare `tsc --noEmit` in an app does not and will pass against the previous shape
- A logger is a library the backend imports, so it is declared in `apps/backend`. The frontend's error boundary is a React concern and belongs to `apps/frontend`; neither is root tooling
- **`exactOptionalPropertyTypes` is on**, which matters here more than anywhere else so far: an error object with `cause` absent and one with `cause: undefined` are different types. The domain reason is the same one that put the setting there — a missing field and an explicitly unknown one are different states, and this story is where that first shows up in real code
- **The backend already logs, at Fastify's defaults, and this story replaces that rather than introducing it.** `buildServer()` passes `logger: true` and nothing else, so pino emits structured JSON to stdout with a request/response pair per request — level, time, pid, hostname, `reqId`, method, url, status and `responseTime` are all there already. What is missing against the criteria below is the configurable level, the correlation id being _returned to the client_, and any error shape at all
- **`NODE_ENV` currently changes nothing about the logs, and that is a baseline rather than a permanent fact.** Task 1.2.5 ran the built server with `NODE_ENV=production` and got a stream identical to the default run, line for line — same level, same request logging, same shutdown records. Fastify's default logger reads nothing from it that matters here. This story is the one likely to introduce a difference (a `LOG_LEVEL`, pino-pretty in development and JSON in production), so make that difference on purpose knowing nothing was doing it beforehand
- **The health route deliberately carries no JSON response schema**, and this story or Story 1.6 inherits it as the first subject. Task 1.2.3 deferred the choice because a schema approach is entangled with this story's error shape and 1.6's configuration validation; the deferral is recorded at the registration site in `apps/backend/src/server.ts` so it is not mistaken for an oversight
- **The crash handlers this story installs have to coexist with a shutdown already in progress.** `unhandledRejection` and `uncaughtException` are deliberately absent today, but a signal handler is not: it owns a `shuttingDown` flag and a 5-second ceiling (ADR 0002 §6). The interaction needs deciding rather than discovering — a rejection thrown _during_ the drain must not restart the close or cancel the ceiling. The flag is already there to be reused
- `*.log` is already gitignored. Logs go to stdout as structured JSON, not to files in the repository

### What Story 1.3 hands this story

This story depends on Story 1.2 alone and its backend half is unblocked today. The frontend half now has code to attach to — and one ordering problem worth seeing before it is discovered.

- **"Contains a failure to the affected region" has no regions yet.** `apps/frontend/src/App.tsx` is one stateless component; layout regions arrive in Story 1.5. The criterion is satisfiable today only in the degenerate sense of wrapping the whole application, which is the thing it exists to rule out. **Deliver the backend half whenever this story runs, and either sequence the frontend half after 1.5 or accept that "region" means "root" for now** — a note in the delivery order rather than a change to the dependency, since the backend half genuinely does not wait
- **An error boundary is a class component, and React 19 has not changed that.** There is still no hook equivalent, so this would be the codebase's first class component — worth deciding on purpose, including whether a small library is preferable to hand-rolling one. Check it against the installed React (19.2.8) rather than against memory: React 19 also added root-level `onUncaughtError` / `onCaughtError` / `onRecoverableError` options to `createRoot`, which are a **reporting** hook rather than a containment one and complement a boundary instead of replacing it. `main.tsx` passes no options today
- **`StrictMode` is on, and it double-invokes render, effects and state updaters in development.** Anything this story writes that counts, reports or logs an error will see it twice locally and once in production. That is a known consequence rather than a bug, and it was adopted deliberately in Task 1.3.3 — but it will look like a duplicate-logging defect the first time it is seen
- **Do not mistake Vite's failure surface for the product's.** The dev server does not typecheck: a **type** error is applied as an ordinary hot update with no overlay and no console error, while a **syntax** error fails the transform loudly and leaves the page on its last good render. Neither is something an error boundary catches — a boundary catches exceptions thrown during render, not build-time failures. The overlay is a development affordance and the boundary is a product state
- **The frontend has nowhere to send a log.** The backend writes structured JSON to stdout; a browser error boundary has no destination at all, and this story's criteria do not ask for one. Note also that the correlation-id criterion only reaches the client half once the frontend actually makes a request, and it makes none until Story 1.12 — so "a user-visible error can be traced to a log entry" is a backend-side capability this story builds and a later story consumes

## Acceptance criteria

- Backend emits structured (JSON) logs with configurable levels
- Every request is logged with a correlation id, method, path, status and duration
- The correlation id is returned to the client so a user-visible error can be traced to a log entry
- API errors use a single consistent shape
- Unhandled errors and promise rejections are caught and logged rather than crashing the process silently
- Stack traces and internal detail are not exposed to clients in production
- The frontend has an error boundary that contains a failure to the affected region and offers recovery, rather than replacing the whole screen

## Notes

Later epics extend this pattern rather than replacing it — failed analytical tools (Epic 7), SEC unavailability (Epic 9) and agent failures (Epic 10) are all _product states_, not exceptions.
