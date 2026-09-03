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

  // The workshop copies nothing static, and this is a DIVERGENCE with a reason
  // rather than a tidy-up (Task 1.11.6).
  //
  // The builder loads apps/frontend/vite.config.ts, and it inherits its
  // `publicDir` along with everything else — so `apps/frontend/public/` is
  // copied into `storybook-static/` too. That directory holds exactly one file,
  // `staticwebapp.config.json`, which is the DEPLOYED FRONTEND's host
  // configuration and means nothing to a component workshop.
  //
  // It is not merely redundant. The Static Web Apps deploy client GLOBS the
  // working directory for that filename, and both by hand (Task 1.11.4) and in
  // the pipeline (Task 1.11.6, run 33731233275) it reported finding the
  // workshop's copy — `apps/frontend/storybook-static/staticwebapp.config.json`
  // — rather than the one inside the directory being deployed. That was
  // harmless only because the two files were byte-identical, which is a
  // property of today and not of the arrangement: the day somebody edits
  // `public/staticwebapp.config.json` and the workshop has not been rebuilt,
  // the deploy picks up a stale routing and cache policy from a build artefact
  // of a different application, silently.
  //
  // `staticDirs: []` is the narrow fix and it does not work — Storybook honours
  // vite's own `publicDir` regardless, measured rather than assumed. Turning
  // `publicDir` off in a `viteFinal` is what does, and it is the smallest
  // possible override: one key, on the workshop's build only, leaving
  // `build.target`, the React plugin and the browser baseline exactly where
  // they are decided.
  viteFinal: (config) => ({ ...config, publicDir: false as const }),
};

export default config;
