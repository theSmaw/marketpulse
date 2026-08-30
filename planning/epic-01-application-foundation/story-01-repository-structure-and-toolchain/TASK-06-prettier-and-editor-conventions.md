# Task 1.1.6 — Prettier and editor conventions

**Status:** Not started
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** Task 1.1.5

## Objective

Make formatting automatic, consistent and invisible — and make sure it does not fight ESLint or the editor.

## Work

* Add Prettier with an explicit configuration file. Note the tree now contains `eslint.config.mjs` at the root (Task 1.1.5) — the first `.mjs` file in the repo. Prettier should format it like any other source file; it does not belong in `.prettierignore`
* Add `.prettierignore` covering build output, lockfiles and generated artefacts — `dist/`, `pnpm-lock.yaml` and `*.tsbuildinfo`. The last is a single-line JSON file that Prettier will otherwise happily reformat on every build
* Each package's `tsconfig.json` carries comments too, but those are matched by Prettier's JSONC filename list natively — only the root file is the awkward case. `tsconfig.base.json` is JSONC — it carries the reasoning for each compiler option as comments. Prettier 3.9.6 infers the plain `json` parser for it (the `.base.` infix misses Prettier's JSONC filename list), but that parser preserves comments regardless; verified in Task 1.1.2. **No `overrides` entry is needed** — do not add one on the assumption that it is.
* Ensure ESLint and Prettier do not conflict — formatting rules belong to Prettier, correctness rules to ESLint. **The conflict surface has been measured and is very nearly empty, so do not reach for `eslint-config-prettier` reflexively.** Of the 138 rules the Task 1.1.5 config enables on a TypeScript file, *zero* are formatting rules: typescript-eslint dropped them in v6 and ESLint 10's `recommended` no longer carries the deprecated ones. `indent`, `quotes`, `semi`, `comma-dangle`, `member-delimiter-style` and friends are all absent, verified with `--print-config`. Exactly one of `eslint-config-prettier`'s "special rules" is enabled — `no-unexpected-multiline` — and that one is a precaution against hand-written code, not a fight with Prettier's output. Install `eslint-config-prettier` only if a real conflict appears; if it is added, it goes **last** in the flat config array. Re-run the `--print-config` check rather than trusting this note, since the rule set may have moved
* Add `.editorconfig` so line endings and indentation are consistent regardless of editor
* Add `.gitattributes` with `* text=auto eol=lf`. `.editorconfig` binds editors, not git — on its own it cannot deliver the "no spurious diffs" criterion below, because git still normalises on checkout according to its own settings. Mark `pnpm-lock.yaml` as generated here too, so it stops dominating diff review.
* Add `format` (write) and `format:check` (verify) scripts
* Confirm WebStorm picks up the configuration without manual per-machine setup

## Done when

* Formatting the whole tree produces no ESLint errors. This is a real check now rather than a formality — ESLint exists as of Task 1.1.5 and lint runs clean on the current tree, so any error appearing after a `format` run is genuinely a Prettier/ESLint disagreement and not pre-existing noise. Run lint immediately before and after to be sure of that
* `format:check` passes on a formatted tree and fails on an unformatted one
* Line endings are consistent and will not produce spurious diffs
* Formatting on save works in the editor without extra configuration

## Notes

`format:check` is what Story 1.10 runs in CI; `format` is what runs locally. Keep them separate so CI never rewrites files.
