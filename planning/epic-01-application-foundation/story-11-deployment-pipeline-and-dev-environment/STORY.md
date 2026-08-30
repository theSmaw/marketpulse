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
