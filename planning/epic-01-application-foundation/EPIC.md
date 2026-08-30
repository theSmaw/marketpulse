# Epic 1 — Application Foundation

**Status:** In progress — Story 1.1 complete (2026-08-30)
**Sequence:** 1 of 15 — first epic, no dependencies
**Spec references:** PRODUCT_SPEC.md §25 (frontend architecture), §29 (backend architecture), §41 Phase 0

## Goal

Establish the development and deployment foundation for MarketPulse.

## Outcome

A working frontend and backend can be run locally and deployed, with shared conventions in place for future development.

## Scope

- React application shell
- TypeScript backend service
- Local development environment
- Basic routing and application layout
- Shared configuration
- Environment handling
- Logging
- Basic error handling
- Unit/integration test foundations
- CI pipeline
- Initial deployment pipeline
- Select UI component library and styling conventions

## Exit criteria

- Frontend and backend run together locally
- A deployed development environment is accessible
- Automated tests run in CI
- Backend health/status can be viewed from the frontend

## Stories

| #    | Story                                                                                                        | Depends on    |
| ---- | ------------------------------------------------------------------------------------------------------------ | ------------- |
| 1.1  | [Repository Structure & TypeScript Toolchain](story-01-repository-structure-and-toolchain/STORY.md)          | —             |
| 1.2  | [Backend Service Skeleton](story-02-backend-service-skeleton/STORY.md)                                       | 1.1           |
| 1.3  | [Frontend Application Shell](story-03-frontend-application-shell/STORY.md)                                   | 1.1           |
| 1.4  | [UI Component Library & Styling Conventions](story-04-ui-component-library-and-styling-conventions/STORY.md) | 1.3           |
| 1.5  | [Application Layout & Routing](story-05-application-layout-and-routing/STORY.md)                             | 1.4           |
| 1.6  | [Configuration & Environment Handling](story-06-configuration-and-environment-handling/STORY.md)             | 1.2, 1.3      |
| 1.7  | [Logging & Error Handling](story-07-logging-and-error-handling/STORY.md)                                     | 1.2           |
| 1.8  | [Local Development Environment](story-08-local-development-environment/STORY.md)                             | 1.2, 1.3      |
| 1.9  | [Automated Testing Foundations](story-09-automated-testing-foundations/STORY.md)                             | 1.2, 1.3      |
| 1.10 | [Continuous Integration Pipeline](story-10-continuous-integration-pipeline/STORY.md)                         | 1.9           |
| 1.11 | [Deployment Pipeline & Development Environment](story-11-deployment-pipeline-and-dev-environment/STORY.md)   | 1.6, 1.10     |
| 1.12 | [Health & Status Vertical Slice](story-12-health-status-vertical-slice/STORY.md)                             | 1.5, 1.7, 1.8 |

Stories 1.2–1.3 can proceed in parallel once 1.1 lands, as can 1.6–1.9 once both skeletons exist. Story 1.12 closes the epic by proving the foundation end to end.

## Conventions Story 1.1 set for the rest of this epic

Story 1.1 is complete, and the conventions it established bind every story after it. They are recorded in full in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`, and **restated verbatim in every story from 1.2 to 1.12** under a `Conventions from Story 1.1` heading, followed there by a `What that means for this story` section spelling out the consequences for that story in particular. Each story is meant to be readable on its own without this file; the duplication is deliberate, and the wording is identical so that drift is visible in a diff. Change one and change all eleven.

The four, summarised:

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && test`. Every story here should pass it from the root, and Story 1.10 runs it unchanged rather than re-listing the tools
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. A new package gets all six; a story that changes what a verb means in one package should change it everywhere or explain why not. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** A test runner, a bundler or a formatter plugin goes at the root. A library the code imports — React, Fastify, a schema library, `@types/node` — goes in the package that imports it
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files. This constrains framework and runner choices in Stories 1.2, 1.3 and 1.9, and each of those now says so

One thing to keep visible until Story 1.9 lands: **`pnpm test` passes because there are no tests**, not because tests pass. Story 1.10 will put that tick on every pull request.
