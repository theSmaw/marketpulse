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
    },
  }),
);
