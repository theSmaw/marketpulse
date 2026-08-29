# Task 1.1.8 — Verify from a clean checkout and document

**Status:** Not started
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** Task 1.1.7

## Objective

Prove the story's headline criterion — a clean checkout installs and verifies with documented commands — and write down what was decided.

## Work

* Clone or copy the repository to a fresh location and install from scratch, with no reuse of existing `node_modules` or store state
* Run the full verification chain and confirm it passes
* Document prerequisites (Node version, Corepack/pnpm) and the setup commands
* Fill in the **Commands** section of `CLAUDE.md`, which is currently a placeholder
* Record the workspace decisions as a short ADR draft — pnpm workspaces, the `apps/` + `packages/` layout, project references, and strictness settings, each with its reasoning (PRODUCT_SPEC.md §39)
* Mark Story 1.1 complete

## Done when

* A fresh checkout reaches a passing verification run by following the written instructions only
* No step required knowledge that exists solely in this session
* `CLAUDE.md` documents the real commands, including how to run them for a single package
* The ADR draft exists and explains *why*, not just *what*

## Notes

This is the acceptance test for the whole story. If a step turns out to be undocumented or machine-specific, fix it here rather than noting it — Story 1.10 will run the same sequence in CI and Story 1.11 in a deployment environment.
