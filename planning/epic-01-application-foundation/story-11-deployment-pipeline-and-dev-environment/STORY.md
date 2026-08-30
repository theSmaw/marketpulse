# Story 1.11 — Deployment Pipeline & Development Environment

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Stories 1.6, 1.10
**Epic scope covered:** initial deployment pipeline

## Description

Get a deployed, reachable development environment early, so deployment problems surface while the system is trivial rather than after the WebGL topology, streaming and agent services exist.

## Open decisions

- Hosting for the frontend (static) and the backend (long-lived process). The backend eventually needs persistent WebSocket connections to Alpaca (Epic 3) and long-running agent execution (Epic 10) — hosting that sleeps idle instances or caps request duration will become a problem, so weigh that now.
- Whether a managed PostgreSQL instance is provisioned now or in Epic 2

## Conventions from Story 1.1

Story 1.1 is complete, and these four bind this story. They are stated in every Epic 1 story so each one can be read on its own; the full reasoning is in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`.

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && test`, chained with `&&` so the first failure is the exit code. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

Two more things that are true today and will not be forever. Until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0. Until Stories 1.2 and 1.3 land, both apps' `dev` scripts are placeholders too; only `packages/shared`'s (`tsc -b --watch`) is real.

## What that means for this story

Deployment is where the workspace stops being invisible, and both of these are easier to plan for than to debug on a hosting platform.

Story 1.1 chose a pnpm workspace with `apps/backend` depending on `packages/shared` as a `workspace:*` dependency, consumed as **built output**. Two consequences land here and both are easier to plan for than to debug on a hosting platform:

- **You cannot deploy `apps/backend` alone.** Its `node_modules/@marketpulse/shared` is a symlink into the workspace, and `packages/shared/dist` must exist. `pnpm deploy --filter @marketpulse/backend` exists for exactly this and produces a self-contained directory; a platform that runs `npm install` in a subdirectory will not work
- **The build has to happen before or during deploy, in dependency order.** `pnpm build` is a single `tsc -b` over the root solution and handles the ordering itself — use it rather than per-package builds
- Pin the toolchain in the deploy environment the way CI and local machines do: Node 24.x from `.nvmrc` (`engineStrict` refuses other majors) and pnpm from `packageManager` via Corepack. A platform that supplies its own pnpm will fail the install rather than warn
- The frontend deploys as static assets; the backend as a long-lived process. The hosting note in the open decisions above matters more than usual because of the persistent WebSocket and long-running agent requirements, so settle it against those rather than against today's health endpoint

## Acceptance criteria

- Merging to the main branch deploys automatically
- A development environment is reachable at a documented URL
- Deployed backend `/health` responds successfully
- The deployed frontend communicates with the deployed backend
- Environment configuration is managed by the hosting platform, not committed
- A failed deployment is visible and does not take down the running environment
