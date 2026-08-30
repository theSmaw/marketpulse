# Task 1.1.6 — Prettier and editor conventions

**Status:** Not started
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** Task 1.1.5

## Objective

Make formatting automatic, consistent and invisible — and make sure it does not fight ESLint or the editor.

## Work

* Add Prettier with an explicit configuration file
* Add `.prettierignore` covering build output, lockfiles and generated artefacts — `dist/`, `pnpm-lock.yaml` and `*.tsbuildinfo`. The last is a single-line JSON file that Prettier will otherwise happily reformat on every build
* Each package's `tsconfig.json` carries comments too, but those are matched by Prettier's JSONC filename list natively — only the root file is the awkward case. `tsconfig.base.json` is JSONC — it carries the reasoning for each compiler option as comments. Prettier 3.9.6 infers the plain `json` parser for it (the `.base.` infix misses Prettier's JSONC filename list), but that parser preserves comments regardless; verified in Task 1.1.2. **No `overrides` entry is needed** — do not add one on the assumption that it is.
* Ensure ESLint and Prettier do not conflict — formatting rules belong to Prettier, correctness rules to ESLint
* Add `.editorconfig` so line endings and indentation are consistent regardless of editor
* Add `.gitattributes` with `* text=auto eol=lf`. `.editorconfig` binds editors, not git — on its own it cannot deliver the "no spurious diffs" criterion below, because git still normalises on checkout according to its own settings. Mark `pnpm-lock.yaml` as generated here too, so it stops dominating diff review.
* Add `format` (write) and `format:check` (verify) scripts
* Confirm WebStorm picks up the configuration without manual per-machine setup

## Done when

* Formatting the whole tree produces no ESLint errors
* `format:check` passes on a formatted tree and fails on an unformatted one
* Line endings are consistent and will not produce spurious diffs
* Formatting on save works in the editor without extra configuration

## Notes

`format:check` is what Story 1.10 runs in CI; `format` is what runs locally. Keep them separate so CI never rewrites files.
