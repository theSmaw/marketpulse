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

  // --- Tooling config files ---
  //
  // Not covered by any package's tsconfig, so the type-aware rules above
  // cannot run on them and would error if asked to. This block must stay last:
  // flat config is order-sensitive and `disableTypeChecked` has to win over
  // the TypeScript block near the top.
  //
  // `apps/frontend/vite.config.ts` is the first file to need this treatment
  // for a reason other than being this file. It is a `.ts` file inside a
  // package whose tsconfig `include` is `src/**/*`, so the project service has
  // no program for it. It also gets Node globals rather than the browser
  // globals the block above hands the rest of `apps/frontend` — it runs in
  // Vite's process, not in a page. That block being wrong for it is the first
  // time the per-package globals split from Task 1.1.5 has decided anything at
  // all (ADR 0001 §8), even though `no-undef` is still off for `.ts` and so
  // the correction remains theoretical until a `.js` tooling file appears.
  {
    files: ["eslint.config.mjs", "apps/frontend/vite.config.ts"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
);
