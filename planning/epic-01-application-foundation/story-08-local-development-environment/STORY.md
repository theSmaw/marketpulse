# Story 1.8 — Local Development Environment

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Stories 1.2, 1.3
**Epic scope covered:** local development environment

## Description

Make frontend and backend run together with one command, and make the setup reproducible for someone cloning the repository for the first time — including an interviewer (PRODUCT_SPEC.md §40).

## Acceptance criteria

* A single documented command starts both frontend and backend in development
* The frontend can call the backend without CORS or proxy errors
* Both services reload on source change
* Prerequisites (runtime versions, package manager) are documented
* A clean clone reaches a running application by following the README only
* Ports are configurable and conflicts produce a clear message

## Notes

No database is required yet — PostgreSQL arrives in Epic 2, at which point this story's setup extends to include it.
