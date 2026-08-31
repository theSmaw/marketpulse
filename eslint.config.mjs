// The single lint configuration for the workspace. Flat config, so this file
// is the whole story: there is no cascade, no `extends` chain resolved from
// package directories, and no per-package `.eslintrc` to fall out of sync.
//
// It lives at the root and nowhere else, and ESLint is a root-only
// devDependency: pnpm puts the workspace root's `node_modules/.bin` on the
// PATH of every package script, so `eslint` resolves from a package directory
// without each package declaring it. Flat config is found by searching upward
// from the working directory, so `eslint .` inside a package finds this file.
//
// Named `.mjs` because the root package.json has no `"type": "module"` — the
// root is not a published package and does not need one, but this file is ESM.

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import storybook from "eslint-plugin-storybook";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Global ignores. A config object with only `ignores` applies workspace-wide.
    //
    // Emitted output is the important entry: linting `dist/` is slow, noisy and
    // pointless — every finding in it is a finding about source we already
    // linted. `*.tsbuildinfo` sits beside each package's tsconfig rather than
    // inside `dist/`, so the `dist/` pattern does not cover it (Task 1.1.3).
    //
    // `.claude/worktrees/` holds git worktrees — entire second checkouts of
    // this repository nested inside it. Root-level `eslint .` (Task 1.1.7)
    // walks into them otherwise and reports every file twice, from a tree
    // whose `dist/` is usually unbuilt. Mirrored in .prettierignore.
    ignores: [
      "**/dist/",
      "**/build/",
      "**/coverage/",
      "**/storybook-static/",
      "**/*.tsbuildinfo",
      ".claude/worktrees/",
    ],
  },

  // --- Baseline for every file ---
  js.configs.recommended,

  // --- TypeScript sources ---
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      // Type-aware from the start. The slower pass is the entire point: the
      // mistakes this codebase will actually make — a floating promise in a
      // streaming pipeline, an `any` leaking across the tool boundary into the
      // domain model — are invisible to syntax-only rules.
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        // The project service rather than an explicit list of `project` paths.
        // With project references (Task 1.1.4) a hand-maintained list drifts
        // every time a package is added, and this repo will add several.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // --- Per-package environment ---
  //
  // This split mirrors the tsconfig `types` split from Task 1.1.4 exactly, and
  // has to: the frontend sets `types: []` so that `process` fails to typecheck
  // there, and handing it Node globals here would have ESLint call the same
  // code clean. Where the two disagree, tsc is right.
  //
  // Be clear about what this currently buys, though. `no-undef` — the rule
  // globals feed — is switched *off* for TypeScript files by typescript-eslint,
  // because the compiler does that job better; verified with `--print-config`.
  // So on today's tree, which is all `.ts`, these three blocks change no
  // result: `process` in the frontend is caught by tsc (TS2591) and by the
  // type-aware rules, not by `no-undef`. They are kept because `no-undef` *is*
  // an error for plain JS (verified), and this repo will grow JS tooling files
  // per package; a globals split added later, after a config file has already
  // been written against the wrong environment, is the expensive order to do
  // this in.
  {
    files: ["apps/backend/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["apps/frontend/**/*.ts", "apps/frontend/**/*.tsx"],
    languageOptions: { globals: globals.browser },
  },
  {
    // Deliberately neither. `packages/shared` is consumed by both apps, so any
    // platform global reachable here is a bug waiting to be imported into the
    // other environment. Its tsconfig inherits no `types` entry for the same
    // reason.
    files: ["packages/shared/**/*.ts"],
    languageOptions: { globals: {} },
  },

  {
    // Root tooling scripts. This is the block the three above were written in
    // anticipation of: `scripts/check-stories.mjs` (Task 1.4.5) is the first
    // plain-JavaScript file in this workspace, and `no-undef` *is* an error for
    // JavaScript — it is switched off for TypeScript, where the compiler does
    // the job better. So this block is the first one here that changes a
    // result rather than documenting an intention. Without it, `console` and
    // `process` are eight `no-undef` errors and a failing `verify`.
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: globals.node },
  },

  // --- React ---
  //
  // Adopted deliberately in Task 1.3.2 rather than by default, because nothing
  // else in Epic 1 owns React lint rules and Story 1.4 is the component
  // library, not linting. The Rules of Hooks are a correctness concern — call
  // a hook conditionally and the component is broken at runtime, silently —
  // which puts them on ESLint's side of the line Task 1.1.6 drew between
  // correctness and formatting.
  //
  // `recommended` in v7 is much wider than the two rules that name suggests:
  // 17 rules, most of them the React Compiler's Rules of React (`purity`,
  // `immutability`, `set-state-in-render`) rather than hook ordering. Taken
  // whole on purpose. They are the rules React itself already assumes are
  // being followed, and adopting them now — with one component in the tree —
  // costs nothing, where adopting them in Epic 2 would mean a retrofit.
  //
  // Take the config from `configs.flat`, not the top-level `configs`. Both
  // export a `recommended-latest`; the top-level one is still eslintrc-shaped
  // (`plugins: ["react-hooks"]`) and ESLint 10 rejects it outright with
  // "Flat config requires plugins to be an object" and exit 2. Loud, at least.
  //
  // Three of the 17 ship as `warn` (`exhaustive-deps`, `incompatible-library`,
  // `unsupported-syntax`). Left at their shipped severity, but note the lint
  // scripts now pass `--max-warnings 0`: this is the first plugin in the
  // workspace to introduce a non-error severity, and a finding that never
  // fails `verify` is the same green-tick-that-means-nothing problem as the
  // placeholder `test` scripts. See package.json.
  //
  // Scoped to `src` rather than the whole package, so vite.config.ts is not
  // asked to answer React questions.
  {
    files: ["apps/frontend/src/**/*.ts", "apps/frontend/src/**/*.tsx"],
    extends: [reactHooks.configs.flat["recommended-latest"]],
  },

  // --- Storybook ---
  //
  // The workshop's own rules, adopted in Task 1.4.5 alongside Storybook itself.
  // Narrow and mechanical: a story file must have a default export, story
  // exports must be PascalCase, a story must not repeat its own name, and
  // `.storybook/main.ts` must not list an addon that is not installed. They are
  // the rules that turn a story silently not appearing into a lint error, which
  // is the failure mode a component workshop actually has.
  //
  // Taken from `configs["flat/recommended"]` rather than `configs.recommended`,
  // the same trap `eslint-plugin-react-hooks` set in Task 1.3.2: both exist,
  // the unprefixed one is still eslintrc-shaped, and ESLint 10 rejects it
  // outright rather than ignoring it.
  //
  // It carries its own `files` globs — `**/*.stories.@(ts|tsx|...)` and
  // `.storybook/main.*` — so it is spread rather than scoped here. It stays
  // *before* the trailing block below, which must remain last.
  ...storybook.configs["flat/recommended"],

  // --- Tooling config files ---
  //
  // Not covered by any package's tsconfig, so the type-aware rules above
  // cannot run on them and would error if asked to. This block must stay last:
  // flat config is order-sensitive and `disableTypeChecked` has to win over
  // the TypeScript block near the top.
  //
  // `apps/frontend/vite.config.ts` was the first file to need this treatment
  // for a reason other than being this file, and Task 1.4.5's two Storybook
  // configuration files are the third and fourth for exactly the same reason:
  // they sit in `apps/frontend`, they are `.ts`, and `include` is `src/**/*`.
  // Widening that `include` is the alternative and is wrong — it would pull the
  // workshop's configuration into `tsc -b` and into the application's program. It is a `.ts` file inside a
  // package whose tsconfig `include` is `src/**/*`, so the project service has
  // no program for it. It also gets Node globals rather than the browser
  // globals the block above hands the rest of `apps/frontend` — it runs in
  // Vite's process, not in a page. That block being wrong for it is the first
  // time the per-package globals split from Task 1.1.5 has decided anything at
  // all (ADR 0001 §8), even though `no-undef` is still off for `.ts` and so
  // the correction remains theoretical until a `.js` tooling file appears.
  {
    files: [
      "eslint.config.mjs",
      "apps/frontend/vite.config.ts",
      "apps/frontend/.storybook/main.ts",
      "apps/frontend/.storybook/preview.tsx",
    ],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
);
