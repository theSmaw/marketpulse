# Story 1.1 — Repository Structure & TypeScript Toolchain

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** nothing
**Epic scope covered:** shared configuration

## Description

Establish how the repository is laid out and how TypeScript, linting and formatting work across it, before any application code exists. Frontend and backend share a language and will share domain types (security identifiers, market events, investigation objects), so the layout needs to make that sharing cheap from the start.

## Open decisions

* Repository layout — single repo with `apps/` + `packages/`, or two independent packages
* Package manager and workspace tooling — npm workspaces / pnpm / other
* Whether a shared `packages/shared` types package is created now or when Epic 2 first needs it

## Acceptance criteria

* A clean checkout installs with a single documented command
* Typecheck and lint run from the repository root across every package
* A shared base `tsconfig` exists and each package extends it
* Formatting is enforced consistently and does not fight the editor
* Script names are consistent across packages (`dev`, `build`, `test`, `lint`, `typecheck`)

## Notes

Strict TypeScript from the outset — this project's value depends on typed domain boundaries (workspace commands, agent events, evidence records) and retrofitting strictness later is painful.
