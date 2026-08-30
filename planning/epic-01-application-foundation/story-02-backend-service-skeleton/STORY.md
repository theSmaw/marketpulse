# Story 1.2 — Backend Service Skeleton

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Story 1.1
**Epic scope covered:** TypeScript backend service

## Description

A minimal TypeScript HTTP service that starts, serves a health endpoint, and shuts down cleanly. No market data, no database, no domain logic. This is the container everything in Epics 2–3 is added to.

## Open decisions

- Server framework — PRODUCT_SPEC.md §29 leaves this at "Fastify or NestJS". Fastify suits the spec's "keep the backend relatively small" instruction; NestJS brings more structure and more ceremony.

## Acceptance criteria

- Server starts locally on a configurable port
- `GET /health` returns 200 with a JSON body including status, version and uptime
- Development mode restarts on source change
- Production build emits runnable output
- Process shuts down gracefully on SIGTERM/SIGINT, closing in-flight requests

## Notes

The health endpoint is consumed by Story 1.12 and later becomes the natural place to report market-feed connection state (Epic 3).
