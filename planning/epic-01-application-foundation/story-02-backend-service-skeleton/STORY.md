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

## What Story 1.1 hands this story

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
