# Epic 1 — Application Foundation

**Status:** Not started
**Sequence:** 1 of 15 — first epic, no dependencies
**Spec references:** PRODUCT_SPEC.md §25 (frontend architecture), §29 (backend architecture), §41 Phase 0

## Goal

Establish the development and deployment foundation for MarketPulse.

## Outcome

A working frontend and backend can be run locally and deployed, with shared conventions in place for future development.

## Scope

* React application shell
* TypeScript backend service
* Local development environment
* Basic routing and application layout
* Shared configuration
* Environment handling
* Logging
* Basic error handling
* Unit/integration test foundations
* CI pipeline
* Initial deployment pipeline
* Select UI component library and styling conventions

## Exit criteria

* Frontend and backend run together locally
* A deployed development environment is accessible
* Automated tests run in CI
* Backend health/status can be viewed from the frontend

## Stories

| # | Story | Depends on |
|---|-------|------------|
| 1.1 | [Repository Structure & TypeScript Toolchain](story-01-repository-structure-and-toolchain/STORY.md) | — |
| 1.2 | [Backend Service Skeleton](story-02-backend-service-skeleton/STORY.md) | 1.1 |
| 1.3 | [Frontend Application Shell](story-03-frontend-application-shell/STORY.md) | 1.1 |
| 1.4 | [UI Component Library & Styling Conventions](story-04-ui-component-library-and-styling-conventions/STORY.md) | 1.3 |
| 1.5 | [Application Layout & Routing](story-05-application-layout-and-routing/STORY.md) | 1.4 |
| 1.6 | [Configuration & Environment Handling](story-06-configuration-and-environment-handling/STORY.md) | 1.2, 1.3 |
| 1.7 | [Logging & Error Handling](story-07-logging-and-error-handling/STORY.md) | 1.2 |
| 1.8 | [Local Development Environment](story-08-local-development-environment/STORY.md) | 1.2, 1.3 |
| 1.9 | [Automated Testing Foundations](story-09-automated-testing-foundations/STORY.md) | 1.2, 1.3 |
| 1.10 | [Continuous Integration Pipeline](story-10-continuous-integration-pipeline/STORY.md) | 1.9 |
| 1.11 | [Deployment Pipeline & Development Environment](story-11-deployment-pipeline-and-dev-environment/STORY.md) | 1.6, 1.10 |
| 1.12 | [Health & Status Vertical Slice](story-12-health-status-vertical-slice/STORY.md) | 1.5, 1.7, 1.8 |

Stories 1.2–1.3 can proceed in parallel once 1.1 lands, as can 1.6–1.9 once both skeletons exist. Story 1.12 closes the epic by proving the foundation end to end.
