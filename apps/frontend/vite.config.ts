import { defineConfig } from "vite";

// Vite's configuration. It exists for one reason today — `build.target` — and
// Task 1.3.3 will add `clearScreen` and the dev server's port to it.
//
// Two things about this file that are easy to get wrong:
//
// It is not covered by any package's tsconfig (`include` is `src/**/*`), so
// type-aware linting cannot run on it. eslint.config.mjs carries a trailing
// block giving it `disableTypeChecked`, the same treatment that file already
// gives itself.
//
// It must stay free of Node APIs — `path`, `process`, `__dirname`. Reaching
// for one wants `@types/node` in this package, which is exactly what the empty
// `types: []` in tsconfig.json exists to prevent. Vite resolves `root`,
// `publicDir` and `build.outDir` relative to this file's directory on its own,
// so nothing here needs to compute a path.
export default defineConfig({
  build: {
    // Stated explicitly, and it must stay equal to `target` in tsconfig.json.
    // These are two readers of one decision: tsc uses its `target` to decide
    // what the language allows, and Vite uses this to decide what actually
    // ships after downlevelling. Vite 8's default is
    // `baseline-widely-available`, which is *lower* than es2024 — so leaving
    // this unset is not neutral, it is a silent disagreement in which tsc
    // permits syntax the bundler then rewrites for browsers we have not
    // agreed to support. See the browser baseline note in tsconfig.json.
    target: "es2024",
  },
});
