# Story 1.2 — Backend Service Skeleton

**Status:** In progress — Tasks 1.2.1 to 1.2.3 complete
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Story 1.1
**Epic scope covered:** TypeScript backend service

## Description

A minimal TypeScript HTTP service that starts, serves a health endpoint, and shuts down cleanly. No market data, no database, no domain logic. This is the container everything in Epics 2–3 is added to.

## Decisions

Resolved 2026-08-30:

- **Server framework — Fastify.** PRODUCT_SPEC.md §29 left this at "Fastify or NestJS", and Story 1.1 added a technical input to the choice that was not neutral. The toolchain is ESM-only and single-file-transpile-safe: `"type": "module"`, `module: nodenext`, `isolatedModules` and `verbatimModuleSyntax`. NestJS's decorator-and-metadata model wants `experimentalDecorators` and `emitDecoratorMetadata`, is CommonJS-oriented in much of its ecosystem, and `verbatimModuleSyntax` in particular interferes with the type-only imports its DI relies on — so choosing it meant either relaxing workspace-wide options for one package or accepting friction in every file. Fastify has none of that problem and suits the spec's "keep the backend relatively small" instruction. The structure NestJS would have supplied is a cost to be paid later, in Epic 7 when the investigation engine needs composition; Fastify's plugin model is the intended answer. Recorded in full in ADR 0002 (Task 1.2.6)

## Conventions from Story 1.1

Story 1.1 is complete, and these four bind this story. They are stated in every Epic 1 story so each one can be read on its own; the full reasoning is in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`.

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && test`, chained with `&&` so the first failure is the exit code. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

Two more things that are true today and will not be forever. Until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0. `apps/frontend`'s `dev` is still a placeholder until Story 1.3; `apps/backend`'s stopped being one in Task 1.2.2, and `packages/shared`'s (`tsc -b --watch --preserveWatchOutput`) was always real.

## What that means for this story

- **`apps/backend`'s `dev` script was an `echo` placeholder naming this story; Task 1.2.2 replaced it** with `sh scripts/dev.sh` — `tsc -b --watch` emitting to `dist/` and `node --watch dist/index.js` restarting on the emit. Root `pnpm dev` runs it in parallel with the others
- `build` is `tsc -b` and already emits runnable output to `apps/backend/dist`. If the framework needs a different build, keep the verb meaning what it means in the other two packages — see the parallel note in Story 1.3
- `@types/node` is pinned to **24.x**, tracking the runtime rather than npm's `latest`, and stays declared in this package rather than at the root: it is a type dependency of this package's code, not a tool. Fastify itself is likewise a dependency of this package, not root tooling
- Relative imports carry `.js` extensions from `.ts` files. `nodenext` requires the emitted filename and fails with TS2835 without it
- Any JS/TS tooling file this story adds that sits outside the package's tsconfig `include` needs an `eslint.config.mjs` entry applying `tseslint.configs.disableTypeChecked`, as `eslint.config.mjs` already does for itself

## Acceptance criteria

- Server starts locally on a configurable port
- `GET /health` returns 200 with a JSON body including status, version and uptime
- Development mode restarts on source change
- Production build emits runnable output
- Process shuts down gracefully on SIGTERM/SIGINT, closing in-flight requests
- `pnpm verify` passes from the repository root

## Tasks

Tackled in order. The story is complete when all six are done.

| #     | Task                                                                                 | Status      |
| ----- | ------------------------------------------------------------------------------------ | ----------- |
| 1.2.1 | [Fastify server bootstrap](TASK-01-fastify-server-bootstrap.md)                      | Complete    |
| 1.2.2 | [Development mode: watch and restart](TASK-02-development-mode-watch-and-restart.md) | Complete    |
| 1.2.3 | [The health endpoint](TASK-03-health-endpoint.md)                                    | Complete    |
| 1.2.4 | [Graceful shutdown](TASK-04-graceful-shutdown.md)                                    | Not started |
| 1.2.5 | [Production build and run](TASK-05-production-build-and-run.md)                      | Not started |
| 1.2.6 | [Verify the story end to end and document](TASK-06-verify-and-document.md)           | Not started |

Each task leaves the repository installable, typechecking and passing `pnpm verify`, so the tree is never broken between tasks — the same rule Story 1.1 followed. The watcher comes second rather than last on purpose: Tasks 1.2.3 to 1.2.5 are much easier to work on with a server that restarts on save.

The first five acceptance criteria above map onto tasks 1.2.1, 1.2.3, 1.2.2, 1.2.5 and 1.2.4 respectively, and the sixth — `pnpm verify` — is a "done when" on every one of them. Task 1.2.6 runs all six together from a clean build rather than trusting each task's own claim.

## What this story deliberately does not do

Each of these belongs to a later story, and each is a thing a backend skeleton naturally attracts:

- **Configuration** (Story 1.6) — this story reads `PORT` and `HOST` inline and nothing else. No config module, no schema, no `.env`
- **Structured logging, error shape, `unhandledRejection`** (Story 1.7) — Fastify's default logger, untouched
- **Tests** (Story 1.9) — the `buildServer()` split exists so `app.inject()` is possible later, but no test runner is chosen here
- **Deployment** (Story 1.11) — `apps/backend/dist` is not a self-contained artifact, and `pnpm deploy --filter` is that story's problem
- **CORS and the frontend contract** (Story 1.12) — nothing here proves a browser on another origin can reach this endpoint

## Notes

The health endpoint is consumed by Story 1.12 and later becomes the natural place to report market-feed connection state (Epic 3).
