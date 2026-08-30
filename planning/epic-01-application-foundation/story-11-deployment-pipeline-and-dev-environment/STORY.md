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

## Acceptance criteria

- Merging to the main branch deploys automatically
- A development environment is reachable at a documented URL
- Deployed backend `/health` responds successfully
- The deployed frontend communicates with the deployed backend
- Environment configuration is managed by the hosting platform, not committed
- A failed deployment is visible and does not take down the running environment

## The workspace makes deployment less obvious than it looks

Story 1.1 chose a pnpm workspace with `apps/backend` depending on `packages/shared` as a `workspace:*` dependency, consumed as **built output**. Two consequences land here and both are easier to plan for than to debug on a hosting platform:

- **You cannot deploy `apps/backend` alone.** Its `node_modules/@marketpulse/shared` is a symlink into the workspace, and `packages/shared/dist` must exist. `pnpm deploy --filter @marketpulse/backend` exists for exactly this and produces a self-contained directory; a platform that runs `npm install` in a subdirectory will not work
- **The build has to happen before or during deploy, in dependency order.** `pnpm build` is a single `tsc -b` over the root solution and handles the ordering itself — use it rather than per-package builds
- Pin the toolchain in the deploy environment the way CI and local machines do: Node 24.x from `.nvmrc` (`engineStrict` refuses other majors) and pnpm from `packageManager` via Corepack. A platform that supplies its own pnpm will fail the install rather than warn
- The frontend deploys as static assets; the backend as a long-lived process. The hosting note in the open decisions above matters more than usual because of the persistent WebSocket and long-running agent requirements, so settle it against those rather than against today's health endpoint
