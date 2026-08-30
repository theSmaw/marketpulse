# Story 1.8 — Local Development Environment

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Stories 1.2, 1.3
**Epic scope covered:** local development environment

## Description

Make frontend and backend run together with one command, and make the setup reproducible for someone cloning the repository for the first time — including an interviewer (PRODUCT_SPEC.md §40).

## What Task 1.1.8 already delivered, and what is left

`README.md` now exists. It carries prerequisites (Node 24.x — required, not a minimum, because `engineStrict` refuses other majors; `corepack enable`), the setup sequence, the full command table, the layout, the install-script policy and editor setup. Every command in it was executed from a clean clone rather than written from memory.

So this story **extends the README, it does not create one** — and two of its criteria below are already met. What is genuinely outstanding is the part the README says plainly it cannot yet do: get you to a _running application_. Its "What exists today" section says so and names itself as the first thing to change when that stops being true.

## Acceptance criteria

- **`pnpm dev` is the single command, and it already exists** — `pnpm -r --parallel run dev`, one of only two root scripts that deliberately fan out. This story makes it start both services rather than introducing a new command name. Two details it inherits: `packages/shared`'s `dev` is a real `tsc -b --watch` that must keep running alongside the two servers, and the apps' `dev` scripts are `echo` placeholders until Stories 1.2 and 1.3 replace them
- The frontend can call the backend without CORS or proxy errors
- Both services reload on source change
- ~~Prerequisites (runtime versions, package manager) are documented~~ — **done in Task 1.1.8.** Re-check them here rather than rewriting them; add nothing unless this story introduces a new prerequisite
- A clean clone reaches a **running application** by following the README only. Task 1.1.8 proved the clone reaches a repository that installs and verifies, twice, from an empty pnpm store and an empty Corepack home. This story is the other half, and the verification method is the same: clone into an empty directory and follow the written words, not the working tree you already have
- Ports are configurable and conflicts produce a clear message

## Notes

No database is required yet — PostgreSQL arrives in Epic 2, at which point this story's setup extends to include it.
