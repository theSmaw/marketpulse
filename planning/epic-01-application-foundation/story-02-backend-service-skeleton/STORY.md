# Story 1.2 — Backend Service Skeleton

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Story 1.1
**Epic scope covered:** TypeScript backend service

## Description

A minimal TypeScript HTTP service that starts, serves a health endpoint, and shuts down cleanly. No market data, no database, no domain logic. This is the container everything in Epics 2–3 is added to.

## Open decisions

- Server framework — PRODUCT_SPEC.md §29 leaves this at "Fastify or NestJS". Fastify suits the spec's "keep the backend relatively small" instruction; NestJS brings more structure and more ceremony.
  **Story 1.1 added a technical input to that choice, and it is not neutral.** The toolchain is ESM-only and single-file-transpile-safe: `"type": "module"`, `module: nodenext`, `isolatedModules` and `verbatimModuleSyntax`. NestJS's decorator-and-metadata model wants `experimentalDecorators` and `emitDecoratorMetadata`, is CommonJS-oriented in much of its ecosystem, and `verbatimModuleSyntax` in particular interferes with the type-only imports its DI relies on. Choosing it means either relaxing those options for one package or accepting friction in every file. Fastify has none of that problem. That is not a decision — the choice is still open — but it should be made with the cost visible rather than discovered afterwards.

## Conventions from Story 1.1

Story 1.1 is complete, and these four bind this story. They are stated in every Epic 1 story so each one can be read on its own; the full reasoning is in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`.

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && test`, chained with `&&` so the first failure is the exit code. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

Two more things that are true today and will not be forever. Until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0. Until Stories 1.2 and 1.3 land, both apps' `dev` scripts are placeholders too; only `packages/shared`'s (`tsc -b --watch`) is real.

## What that means for this story

- **`apps/backend`'s `dev` script is an `echo` placeholder that names this story.** Replacing it with a real watch-and-restart is part of the work; root `pnpm dev` already runs it in parallel with the others
- `build` is `tsc -b` and already emits runnable output to `apps/backend/dist`. If the framework needs a different build, keep the verb meaning what it means in the other two packages — see the parallel note in Story 1.3
- `@types/node` is pinned to **24.x**, tracking the runtime rather than npm's `latest`, and stays declared in this package rather than at the root: it is a type dependency of this package's code, not a tool. Fastify or NestJS itself is likewise a dependency of this package, not root tooling
- Relative imports carry `.js` extensions from `.ts` files. `nodenext` requires the emitted filename and fails with TS2835 without it
- Any JS/TS tooling file this story adds that sits outside the package's tsconfig `include` needs an `eslint.config.mjs` entry applying `tseslint.configs.disableTypeChecked`, as `eslint.config.mjs` already does for itself

## Acceptance criteria

- Server starts locally on a configurable port
- `GET /health` returns 200 with a JSON body including status, version and uptime
- Development mode restarts on source change
- Production build emits runnable output
- Process shuts down gracefully on SIGTERM/SIGINT, closing in-flight requests
- `pnpm verify` passes from the repository root

## Notes

The health endpoint is consumed by Story 1.12 and later becomes the natural place to report market-feed connection state (Epic 3).
