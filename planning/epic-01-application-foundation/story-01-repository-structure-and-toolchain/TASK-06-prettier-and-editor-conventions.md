# Task 1.1.6 — Prettier and editor conventions

**Status:** Complete — 2026-08-30
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** Task 1.1.5

## Objective

Make formatting automatic, consistent and invisible — and make sure it does not fight ESLint or the editor.

## Work

- Add Prettier with an explicit configuration file. Note the tree now contains `eslint.config.mjs` at the root (Task 1.1.5) — the first `.mjs` file in the repo. Prettier should format it like any other source file; it does not belong in `.prettierignore`
- Add `.prettierignore` covering build output, lockfiles and generated artefacts — `dist/`, `pnpm-lock.yaml` and `*.tsbuildinfo`. The last is a single-line JSON file that Prettier will otherwise happily reformat on every build
- Each package's `tsconfig.json` carries comments too, but those are matched by Prettier's JSONC filename list natively — only the root file is the awkward case. `tsconfig.base.json` is JSONC — it carries the reasoning for each compiler option as comments. Prettier 3.9.6 infers the plain `json` parser for it (the `.base.` infix misses Prettier's JSONC filename list), but that parser preserves comments regardless; verified in Task 1.1.2. **No `overrides` entry is needed** — do not add one on the assumption that it is.
- Ensure ESLint and Prettier do not conflict — formatting rules belong to Prettier, correctness rules to ESLint. **The conflict surface has been measured and is very nearly empty, so do not reach for `eslint-config-prettier` reflexively.** Of the 138 rules the Task 1.1.5 config enables on a TypeScript file, _zero_ are formatting rules: typescript-eslint dropped them in v6 and ESLint 10's `recommended` no longer carries the deprecated ones. `indent`, `quotes`, `semi`, `comma-dangle`, `member-delimiter-style` and friends are all absent, verified with `--print-config`. Exactly one of `eslint-config-prettier`'s "special rules" is enabled — `no-unexpected-multiline` — and that one is a precaution against hand-written code, not a fight with Prettier's output. Install `eslint-config-prettier` only if a real conflict appears; if it is added, it goes **last** in the flat config array. Re-run the `--print-config` check rather than trusting this note, since the rule set may have moved
- Add `.editorconfig` so line endings and indentation are consistent regardless of editor
- Add `.gitattributes` with `* text=auto eol=lf`. `.editorconfig` binds editors, not git — on its own it cannot deliver the "no spurious diffs" criterion below, because git still normalises on checkout according to its own settings. Mark `pnpm-lock.yaml` as generated here too, so it stops dominating diff review.
- Add `format` (write) and `format:check` (verify) scripts
- Confirm WebStorm picks up the configuration without manual per-machine setup

## Done when

- Formatting the whole tree produces no ESLint errors. This is a real check now rather than a formality — ESLint exists as of Task 1.1.5 and lint runs clean on the current tree, so any error appearing after a `format` run is genuinely a Prettier/ESLint disagreement and not pre-existing noise. Run lint immediately before and after to be sure of that
- `format:check` passes on a formatted tree and fails on an unformatted one
- Line endings are consistent and will not produce spurious diffs
- Formatting on save works in the editor without extra configuration

## Notes

`format:check` is what Story 1.10 runs in CI; `format` is what runs locally. Keep them separate so CI never rewrites files.

## Outcome

Prettier 3.9.6 at the workspace root, one config, and the three files that make
line endings actually stable — `.editorconfig`, `.gitattributes` and the
`endOfLine` option — all saying LF.

### Root-only, and configured in `.mjs`

`prettier` is a root-only devDependency, exactly like ESLint, for the same
reason: pnpm puts the root's `node_modules/.bin` on every package script's PATH,
and Prettier searches upward for its config. There is one `prettier.config.mjs`.

`.mjs` rather than `.prettierrc.json` was a deliberate trade. JSON cannot hold a
comment, and this repo's configs carry the reasoning for every option they set.
The cost is editor detection, which is why `.idea/prettier.xml` is checked in
(below) — but WebStorm's `AUTOMATIC` mode shells out to Prettier itself, so it
reads the `.mjs` the same way the CLI does.

Every option is written out even where it restates a Prettier default. That is
the point of an explicit config: an upgrade cannot quietly restyle the tree, and
a style argument is settled by editing one line.

### `eslint-config-prettier` is not installed — measured, not assumed

The task's note was re-verified rather than trusted, with `--print-config` over
both a `.ts` file and `eslint.config.mjs`, checked against
`eslint-config-prettier`'s full rule list:

- **138 rules** enabled on a TypeScript file, **zero** of them formatting rules.
  64 on the `.mjs`, also zero.
- Exactly one "special rule" enabled, on both: `no-unexpected-multiline` — a
  guard against hand-written code, not a fight with Prettier's output.

So nothing was installed. If a real conflict ever appears, it goes last in the
flat config array; re-run the check rather than citing this paragraph.

### `tsconfig.base.json` needed no `overrides`

Confirmed on this tree: `prettier --write .` reports it **unchanged**, comments
intact. Prettier infers the plain `json` parser for it, and that parser preserves
comments. No `overrides` entry was added.

### Line endings, in the one place that binds

`.editorconfig` covers charset, indent, final newline and trimmed whitespace
(with Markdown exempted from trimming — two trailing spaces are a hard break).
`.gitattributes` carries `* text=auto eol=lf`, which is the entry that actually
delivers "no spurious diffs": `.editorconfig` binds editors, and git normalises
on checkout by its own rules regardless. `pnpm-lock.yaml` is marked
`linguist-generated=true -diff`, so it stops dominating diff review.

The tree contained no CRLF to begin with — scanned before adding the attributes
— and `git add --renormalize .` produced no line-ending changes, so the rule is
prophylactic rather than corrective. `git check-attr` confirms `eol: lf` on
sources and `diff: unset` on the lockfile.

### WebStorm, without per-machine setup

`.idea/prettier.xml` is checked in (`.idea/.gitignore` only excludes
`workspace.xml` and friends, so it is shared): `myConfigurationMode=AUTOMATIC`
with `myRunOnSave` and `myRunOnReformat` both true. AUTOMATIC means WebStorm
resolves the same `prettier` package and the same config file the CLI does, so
there is no second copy of the configuration to drift. `.editorconfig` is read
natively by WebStorm with no plugin.

### Scripts

`format` and `format:check` at the **root only**. Prettier's unit of work is the
tree rather than the package, so there is no per-package script to fan out to in
Task 1.1.7 — this is the one pair of commands that legitimately lands before
root script orchestration.

### The docs were normalised too

`.prettierignore` covers only what the task named — `dist/`, `build/`,
`coverage/`, `*.tsbuildinfo`, `pnpm-lock.yaml`, `node_modules/` — so `planning/`
Markdown is formatted like everything else. That was a one-time 42-file churn:
`*` bullets became `-`, `*emphasis*` became `_emphasis_`, tables were padded.
Noisy in this commit, silent from here on, and it means CI's `format:check`
covers the prose as well as the code.

### Verified

- Lint **immediately before** the format run: clean. Lint **immediately after**:
  clean. That is the whole of the Done-when's first criterion, and it passed
  without installing anything to make it pass.
- `format:check` exits **1** on an unformatted tree (42 files at the start, and
  again with a deliberately mis-formatted probe file) and **0** once formatted.
- Build and typecheck green across all three packages after formatting; the
  backend skeleton still runs and resolves `@marketpulse/shared`.
- Only four source files changed: two missing final newlines, and two lines
  over 80 columns wrapped.
