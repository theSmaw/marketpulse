// Vitest for @marketpulse/frontend.
//
// One config per package and no root config — Task 1.9.2's decision, because
// root `test` is a `pnpm -r` fan-out and a root `projects` list would be a
// second entry point meaning "run the tests". A `.ts` and not a `.mts`: the
// CommonJS config-loader warning is a property of the *root*, which has no
// `"type": "module"`, and every workspace package is ESM.
//
// This is the only one of the three that merges the package's own build
// config, and that is the point: the resolver that builds the application is
// the resolver that runs its tests. It buys three things measurably rather
// than by reputation — the React plugin, the `@marketpulse/shared` workspace
// resolution, and **real CSS Modules**. A rendered `PriceChange` carries
// `class="_change_ea28d5 _positive_ea28d5"`, Vite's own scoped names, not the
// identity proxy an unconfigured runner would hand back.

import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config.js";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // jsdom, chosen against a measured happy-dom rather than taken as the
      // runner's usual default — see the write-up. Both rendered everything in
      // this tree identically, including the Base UI popover through a portal;
      // jsdom wins on the failure mode rather than on a capability.
      environment: "jsdom",

      // Scoped to `src` like the other two packages, because Vitest 4's
      // `defaultExclude` is only `['**/node_modules/**', '**/.git/**']` — an
      // unscoped run would walk `dist/` and `storybook-static/` on every
      // invocation for nothing. The double-run trap that motivates the scoping
      // in `packages/shared` and `apps/backend` does not bite here: this
      // package is `noEmit`, so tsc puts no test files in `dist/`.
      //
      // **The glob admits `.tsx`, and copying the other two packages'
      // `.ts`-only form verbatim is the mistake in this file that would fail
      // silently.** A component test renders JSX and so is a `.tsx`; under a
      // `.ts`-only glob it is simply not collected. Measured in Task 1.9.3: a
      // deliberately failing `.test.tsx` dropped into `apps/backend/src/` left
      // `vitest run` reporting 3 files / 49 passed, unchanged. The wholly-empty
      // case is loud — Vitest exits 1 with "No test files found" — and the case
      // this package is actually in, one `.test.ts` collected and every
      // component test skipped, is not.
      include: ["src/**/*.test.{ts,tsx}"],

      // Unmounting between tests is not automatic here, and the reason is a
      // direct consequence of a convention this story inherited.
      // `@testing-library/react` registers its own `afterEach(cleanup)` only
      // when it can see a global `afterEach` — and `globals` is off, because
      // that is what keeps every package's tsconfig `types` array untouched.
      // So the two decisions collide, quietly. Measured before it was fixed:
      // two tests each rendering one component left `document.body` with 1 and
      // then 2 children, which surfaces later as `getByRole` throwing "found
      // multiple elements" in a test that did nothing wrong.
      //
      // `setupFiles` is what replaces it. It is deliberately not the render
      // helper: a leaf-component test calls `render()` directly and needs the
      // cleanup just as much.
      setupFiles: ["./src/test-setup.ts"],

      // Coverage (Task 1.9.5). One config per package, three reports, run only
      // by `pnpm coverage` — never `test`, never `verify`.
      coverage: {
        // Vitest's own provider. It matters slightly more here than in the
        // other two packages that it does not instrument the sources: this
        // config *is* the build config, so istanbul's transform would sit
        // inside the same plugin chain that produces `dist/`. Measured on this
        // package against `@vitest/coverage-istanbul`: identical statements,
        // functions and lines (44/160, 26/59, 42/158), and one branch of
        // difference — istanbul counts `compact = false` in
        // `ErrorFallback.tsx` as a branch and v8 does not. That is the known
        // undercount, and it is the reversal trigger if branch coverage ever
        // gates anything.
        provider: "v8",

        // `.tsx` as well as `.ts`, exactly as `test.include` does and for a
        // related reason: a `.ts`-only glob silently drops every component.
        // Explicit rather than defaulted, because Vitest 4 with no `include`
        // reports only the files some test loaded.
        include: ["src/**/*.{ts,tsx}"],

        exclude: [
          // The tests are not the subject. Vitest withholds the files it ran
          // anyway, but `coverageConfigDefaults.exclude` is **`[]`** in
          // Vitest 4 — read out of the package — so every other exclusion
          // below has to be spelled out here or it does not happen.
          "src/**/*.test.{ts,tsx}",

          // The workshop is not the application. Stories are unreachable from
          // `index.html` — verified by grepping the emitted bundle — and
          // `@storybook/addon-vitest` was measured and rejected, so nothing
          // executes them. Left in, nine story files each report 0% and they
          // dominate: measured, statements are **27.04% with stories counted
          // against 68.25% without** (159 statements against 63), and the
          // lower number describes the workshop rather than the application.
          "src/**/*.stories.tsx",

          // Test scaffolding that is not named `*.test.*`: the shared render
          // helper and the `afterEach(cleanup)` file.
          "src/test-render.tsx",
          "src/test-setup.ts",
        ],

        // Nothing else is excluded, and one omission from that list is
        // deliberate: **`main.tsx` stays in**, matching `apps/backend`'s
        // treatment of `index.ts`. It is the mount — `createRoot`,
        // `StrictMode`, the three error-reporting options and the `getTokens()`
        // startup assertion — and no jsdom test calls it, so it reports 0%.
        // Excluding an entrypoint because nothing tests it is how a coverage
        // number stops describing the application.

        // `text` for the terminal, `html` for the lines behind a number.
        // `coverage/` is already in .gitignore, .prettierignore and
        // eslint.config.mjs's ignores.
        reporter: ["text", "html"],

        // No threshold. See the story write-up.
      },
    },
  }),
);
