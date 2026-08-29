# Task 1.1.6 — Prettier and editor conventions

**Status:** Not started
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** Task 1.1.5

## Objective

Make formatting automatic, consistent and invisible — and make sure it does not fight ESLint or the editor.

## Work

* Add Prettier with an explicit configuration file
* Add `.prettierignore` covering build output, lockfiles and generated artefacts
* Ensure ESLint and Prettier do not conflict — formatting rules belong to Prettier, correctness rules to ESLint
* Add `.editorconfig` so line endings and indentation are consistent regardless of editor
* Add `format` (write) and `format:check` (verify) scripts
* Confirm WebStorm picks up the configuration without manual per-machine setup

## Done when

* Formatting the whole tree produces no ESLint errors
* `format:check` passes on a formatted tree and fails on an unformatted one
* Line endings are consistent and will not produce spurious diffs
* Formatting on save works in the editor without extra configuration

## Notes

`format:check` is what Story 1.10 runs in CI; `format` is what runs locally. Keep them separate so CI never rewrites files.
