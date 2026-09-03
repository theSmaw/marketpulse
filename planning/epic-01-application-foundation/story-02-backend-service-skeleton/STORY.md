# Story 1.2 — Backend Service Skeleton

**Status:** Complete — 2026-08-30 (all six tasks)
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Story 1.1
**Epic scope covered:** TypeScript backend service

## Description

A minimal TypeScript HTTP service that starts, serves a health endpoint, and shuts down cleanly. No market data, no database, no domain logic. This is the container everything in Epics 2–3 is added to.

## Decisions

Resolved 2026-08-30:

- **Server framework — Fastify.** PRODUCT_SPEC.md §29 left this at "Fastify or NestJS", and Story 1.1 added a technical input to the choice that was not neutral. The toolchain is ESM-only and single-file-transpile-safe: `"type": "module"`, `module: nodenext`, `isolatedModules` and `verbatimModuleSyntax`. NestJS's decorator-and-metadata model wants `experimentalDecorators` and `emitDecoratorMetadata`, is CommonJS-oriented in much of its ecosystem, and `verbatimModuleSyntax` in particular interferes with the type-only imports its DI relies on — so choosing it meant either relaxing workspace-wide options for one package or accepting friction in every file. Fastify has none of that problem and suits the spec's "keep the backend relatively small" instruction. The structure NestJS would have supplied is a cost to be paid later, in Epic 7 when the investigation engine needs composition; Fastify's plugin model is the intended answer. Recorded in full in [ADR 0002](../../../docs/adr/0002-backend-framework-and-server-composition.md), written in Task 1.2.6, which also records four composition decisions this story made along the way: the `buildServer()`/entrypoint split and where signal handling lives, `buildServer()` staying synchronous, the development loop compiling rather than stripping types, and reading `version` with a JSON import rather than `createRequire`. Each carries its rejected alternative

## Conventions from Story 1.1

Story 1.1 is complete, and these four bind this story. They are stated in every Epic 1 story so each one can be read on its own; the full reasoning is in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`.

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && stories && env:check && test && test:process`, chained with `&&` so the first failure is the exit code. It took its fifth step in Task 1.4.5: `stories` fails if a component has no stories file, and `build` now also produces the Storybook bundle. It took its sixth in Task 1.6.6: `env:check` fails if `.env.example` and `CONFIG_VARIABLES` have drifted apart, which is what makes the documented variable set a checked claim rather than prose. It took its **seventh** in Task 1.10.5: `test:process` runs the backend's ten process-level tests against a spawned `dist/index.js`, which is why the chain building before it runs is load-bearing rather than incidental. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

~~Two more things that are true today and will not be forever. Until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0. `apps/frontend`'s `dev` is still a placeholder until Story 1.3; `apps/backend`'s stopped being one in Task 1.2.2, and `packages/shared`'s (`tsc -b --watch --preserveWatchOutput`) was always real.~~ **Neither is true any more.** Story 1.3 made the last `dev` script real, and Story 1.9 made all three `test` scripts real — **103 tests**, no `echo` placeholder left anywhere (2026-09-03). This story's own subject gained 49 of them, driving the assembled server through `app.inject()`.

## What that means for this story

- **`apps/backend`'s `dev` script was an `echo` placeholder naming this story; Task 1.2.2 replaced it** with `sh scripts/dev.sh` — `tsc -b --watch` emitting to `dist/` and `node --watch dist/index.js` restarting on the emit. Root `pnpm dev` runs it in parallel with the others
- `build` is `tsc -b` and already emits runnable output to `apps/backend/dist`. If the framework needs a different build, keep the verb meaning what it means in the other two packages — see the parallel note in Story 1.3
- `@types/node` is pinned to **24.x**, tracking the runtime rather than npm's `latest`, and stays declared in this package rather than at the root: it is a type dependency of this package's code, not a tool. Fastify itself is likewise a dependency of this package, not root tooling
- Relative imports carry `.js` extensions from `.ts` files. `nodenext` requires the emitted filename and fails with TS2835 without it
- Any JS/TS tooling file this story adds that sits outside the package's tsconfig `include` needs an `eslint.config.mjs` entry applying `tseslint.configs.disableTypeChecked`, as `eslint.config.mjs` already does for itself

## Acceptance criteria

All six were executed together from a clean build in Task 1.2.6, not inherited from the tasks that claimed them.

- Server starts locally on a configurable port — `PORT=4321` bound and served; `PORT=nonsense` and `PORT=70000` both exit 1 naming the variable and the value
- `GET /health` returns 200 with a JSON body including status, version and uptime — `{"status":"ok","version":"0.0.0","uptimeSeconds":0.129}`, `content-type: application/json; charset=utf-8`, `version` matching the manifest
- Development mode restarts on source change — edit to new listener ~1.1s, new pid, no orphans and no held port on Ctrl-C
- Production build emits runnable output — `pnpm clean` then `pnpm build` then plain `node dist/index.js`, no flags
- Process shuts down gracefully on SIGTERM/SIGINT, closing in-flight requests — a 2s in-flight request completed with 200 and the process exited 0 after 1.7s; an 8s one hit the 5s ceiling and exited 1; a second signal mid-drain exited 1 immediately
- `pnpm verify` passes from the repository root

## Tasks

Tackled in order. The story is complete when all six are done.

| #     | Task                                                                                 | Status   |
| ----- | ------------------------------------------------------------------------------------ | -------- |
| 1.2.1 | [Fastify server bootstrap](TASK-01-fastify-server-bootstrap.md)                      | Complete |
| 1.2.2 | [Development mode: watch and restart](TASK-02-development-mode-watch-and-restart.md) | Complete |
| 1.2.3 | [The health endpoint](TASK-03-health-endpoint.md)                                    | Complete |
| 1.2.4 | [Graceful shutdown](TASK-04-graceful-shutdown.md)                                    | Complete |
| 1.2.5 | [Production build and run](TASK-05-production-build-and-run.md)                      | Complete |
| 1.2.6 | [Verify the story end to end and document](TASK-06-verify-and-document.md)           | Complete |

Each task leaves the repository installable, typechecking and passing `pnpm verify`, so the tree is never broken between tasks — the same rule Story 1.1 followed. The watcher comes second rather than last on purpose: Tasks 1.2.3 to 1.2.5 are much easier to work on with a server that restarts on save.

The first five acceptance criteria above map onto tasks 1.2.1, 1.2.3, 1.2.2, 1.2.5 and 1.2.4 respectively, and the sixth — `pnpm verify` — is a "done when" on every one of them. Task 1.2.6 runs all six together from a clean build rather than trusting each task's own claim.

## What this story deliberately does not do

Each of these belongs to a later story, and each is a thing a backend skeleton naturally attracts:

- **Configuration** (Story 1.6) — this story reads `PORT` and `HOST` inline and nothing else. No config module, no schema, no `.env`
- **Structured logging, error shape, `unhandledRejection`** (Story 1.7) — Fastify's default logger, untouched
- **Tests** (Story 1.9) — the `buildServer()` split exists so `app.inject()` is possible later, but no test runner is chosen here
- **Deployment** (Story 1.11) — `apps/backend/dist` is not a self-contained artifact, and `pnpm deploy --filter` is that story's problem
- **CORS and the frontend contract** (~~Story 1.12~~ — **CORS landed in Story 1.8**, 2026-09-02) — nothing here proves a browser on another origin can reach this endpoint, and the story that needed that proof turned out to be the development-pair one rather than the vertical slice. `apps/backend/src/cors.ts` registers `@fastify/cors` inside `buildServer()`; Story 1.12 is its first shipping consumer

## What the verification could not prove

Named deliberately, in the habit Task 1.1.8 established:

- **Nothing here says anything about a deployed environment.** Every measurement was taken against a process started by hand on a developer machine. Signal delivery to PID 1 in a container, the host binding that a platform actually exposes, and whether the orchestrator's kill timeout is larger than the 5s ceiling are all Story 1.11's, and its `pnpm deploy` mechanism is confirmed in shape only — a package directory copied outside the workspace runs
- **Nothing here proves the frontend can reach this endpoint across an origin boundary.** CORS was not considered by any task in this story. That was a deliberate deferral, recorded so it is not mistaken for an oversight — and **it was discharged by Story 1.8 rather than by Story 1.12**. Task 1.8.3 built the Vite proxy alternative before rejecting it, and the deciding finding is one this story could not have anticipated: through a proxy `x-request-id` reads back with no configuration at all, so a proxy would have hidden both the allowlist and the fact that a correlation id needs a server to expose it
- **The `/health` response shape is unverified by anything but a curl.** There is no test runner (Story 1.9) and no response schema (Story 1.7), so a change that broke the contract would pass `pnpm verify`

## Notes

The health endpoint is consumed by Story 1.12 and later becomes the natural place to report market-feed connection state (Epic 3).
