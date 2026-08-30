import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Vite's configuration. It exists for three reasons today — `build.target`,
// the React plugin, and the two dev-server settings below.
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
  // React Fast Refresh — the part that preserves component state across an
  // edit — is this plugin's, not Vite's. Plain Vite already replaces modules
  // on save; without the plugin that replacement is a full reload and every
  // `useState` in the tree resets.
  //
  // `@vitejs/plugin-react` rather than the alternatives, and the obvious-
  // looking answer is the wrong one: `@vitejs/plugin-react-oxc` peers on
  // `^6.3.0 || ^7.0.0` and does not admit Vite 8, despite Vite 8 being the
  // Rolldown/oxc release its name points at. Re-check the peer ranges on a
  // Vite upgrade rather than trusting this comment.
  //
  // Its three transformer peers — `oxc-transform-react`,
  // `@rolldown/plugin-babel`, `babel-plugin-react-compiler` — are all
  // `optional: true` and none is installed. The plugin works alone; adding one
  // is a decision to state, not a dependency to acquire quietly.
  plugins: [react()],

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

  // Vite clears the terminal on start and on every restart. Under root
  // `pnpm dev` — `pnpm -r --parallel run dev`, three packages into one
  // terminal — that takes the backend's JSON log lines and the shared
  // watcher's output with it. Exactly what `--preserveWatchOutput` is for on
  // the TypeScript side, in a different costume.
  clearScreen: false,

  server: {
    // Both stated explicitly, and `strictPort` is the decision rather than the
    // default. Vite's default is to print `Port 5173 is in use, trying another
    // one...` and quietly bind 5174 — which Task 1.3.1 hit on its first run.
    // That makes the URL in the terminal the only reliable statement of where
    // the app is, and under the parallel fan-out above that line is competing
    // with two other packages' output.
    //
    // The backend does the opposite: a busy `PORT` exits 1 with the
    // `EADDRINUSE` record intact (Task 1.2.1). Matching it is the smaller
    // reason. The larger one is that this origin is about to be depended on:
    // Story 1.12 configures CORS against it, and a frontend that silently
    // moves to 5174 fails an allowlist pinned to 5173 as a browser CORS error
    // — a symptom that names neither the port nor the cause.
    port: 5173,
    strictPort: true,
  },

  // `vite preview` serves the *built* output, and it is a different server
  // with its own defaults — it does not reuse `server` above wholesale.
  // Measured rather than inferred, in both directions: `preview` **inherits**
  // `server.strictPort` but **not** `server.port`. So a second preview against
  // a busy port already exits 1 with `Error: Port 4173 is already in use`, and
  // removing `strictPort` above makes the same command quietly bind 4174.
  //
  // Two consequences, and the first is a thing not to do: **do not add
  // `preview.strictPort`.** It is inherited, and a second copy is one more
  // place for the two to disagree on an upgrade. The port itself is the
  // opposite case — it is *not* inherited, so 4173 below is Vite's default
  // restated deliberately rather than a setting doing nothing. It is written
  // out for the same reason 5173 is: it is a URL a human reads out of
  // `README.md`, and a config that states one port and leaves the other
  // implicit reads as though `server.port` covered both, which is exactly the
  // wrong conclusion.
  preview: {
    port: 4173,
  },
});
