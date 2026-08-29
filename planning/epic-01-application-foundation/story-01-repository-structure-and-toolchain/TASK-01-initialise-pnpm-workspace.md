# Task 1.1.1 — Initialise the pnpm workspace root

**Status:** Not started
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** nothing

## Objective

Create the workspace root so `pnpm install` succeeds from a clean checkout, before any package exists inside it.

## Work

* Pin the Node version (`.nvmrc` or equivalent) and record it in `engines`
* Enable Corepack so the pnpm version is pinned by the repository rather than by whatever is installed globally — set `packageManager` in the root `package.json`
* Create the root `package.json` as private, with no dependencies yet
* Create `pnpm-workspace.yaml` declaring `apps/*` and `packages/*`
* Add `.npmrc` if any non-default resolution behaviour is wanted

## Done when

* `pnpm install` completes at the root with no packages present
* The pnpm version is pinned by the repo and does not depend on a global install
* The root package is private and cannot be published by accident
* `pnpm-lock.yaml` is committed

## Notes

Pinning both Node and pnpm matters here — Task 1.1.8 verifies a clean checkout, and Story 1.10 runs the same install in CI. Version drift between the two is a common source of "works locally" failures.
