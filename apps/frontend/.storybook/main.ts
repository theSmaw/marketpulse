import type { StorybookConfig } from "@storybook/react-vite";

// Storybook's build-time configuration — the component workshop introduced in
// Task 1.4.5.
//
// Hand-written rather than produced by `storybook init`. That command scaffolds
// an example `stories/` directory (Button, Header, Page), rewrites
// package.json, and picks addons by its own judgement; none of it survives a
// review here, and the parts worth keeping are the six lines below.
//
// This file sits outside `tsconfig.json`'s `include` (`src/**/*`), exactly like
// vite.config.ts, so type-aware linting cannot run on it and errors if asked
// to — `Parsing error: ... was not found by the project service`. Both files
// are named in the trailing `disableTypeChecked` block in eslint.config.mjs.
// Widening `include` was the alternative and is wrong: it would pull the
// workshop's configuration into `tsc -b` and into the application's program.
const config: StorybookConfig = {
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },

  // Stories are colocated with the component they describe, under
  // `src/components/<Name>/`. That colocation is what
  // `scripts/check-stories.mjs` relies on: a component file with no sibling
  // `.stories.tsx` fails `pnpm verify`.
  //
  // `.mdx` is deliberately absent — `@storybook/addon-docs` is not installed,
  // see the note in the frontend package.json.
  stories: ["../src/components/**/*.stories.@(ts|tsx)"],

  addons: [
    // Runs axe against the rendered story and reports in a panel. The story's
    // selection constraints name accessible primitives, and Epic 15 carries a
    // full review; this is the cheap continuous half of that, sitting next to
    // the component while it is being written rather than after.
    //
    // It reports. It does not fail a build: the addon's `test` parameter drives
    // Storybook's Vitest integration, which this repository has not adopted —
    // Story 1.9 picks the test runner.
    "@storybook/addon-a11y",
  ],

  core: {
    // Storybook reports anonymous usage data to its own servers by default.
    // Every other network call this workspace makes is one it chose to make,
    // and a development tool phoning home should be a stated decision rather
    // than a default nobody read.
    disableTelemetry: true,
  },

  // There is deliberately no `viteFinal`. The builder loads
  // apps/frontend/vite.config.ts on its own, which is the point: one
  // `build.target`, one React plugin, one place where the browser baseline is
  // decided. A Storybook-only override would be a second answer to a question
  // that already has one, and if it ever becomes necessary it is a divergence
  // to record rather than a config to fork.
};

export default config;
