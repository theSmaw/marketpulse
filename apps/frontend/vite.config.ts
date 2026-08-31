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
// for one wants `@types/node` in this package, which is exactly what the
// explicit `types` list in tsconfig.json exists to prevent — it is
// `["vite/client"]` since Task 1.4.2, and what makes it work is that it is
// explicit rather than that it is short. Vite resolves `root`,
// `publicDir` and `build.outDir` relative to this file's directory on its own,
// so nothing here needs to compute a path.
export default defineConfig({
  // --- The environment boundary (Task 1.6.4) ---
  //
  // Only variables whose names start with one of these prefixes are exposed to
  // client code through `import.meta.env`. That is Vite's default, and it is
  // restated here because the difference between a default and a decision is
  // the whole of this story's "only explicitly whitelisted variables reach the
  // frontend bundle" criterion: a default can be widened by someone who does
  // not know it was load-bearing, and a stated one has to be argued with.
  //
  // Proved against the artefact rather than the documentation (Task 1.6.4).
  // With `PROBE_PLAIN` and `VITE_PROBE` both set in `apps/frontend/.env` and
  // both referenced from `main.tsx`, the built bundle contains the prefixed
  // value as a string literal and renders the non-prefixed reference as
  // `void 0` — statically substituted to `undefined` at the reference site,
  // not merely absent from the string pool. So the boundary is enforced at
  // build time and a non-prefixed variable cannot leak by being read.
  //
  // **Two things defeat it, and neither is configured here.** Widening this
  // array is the obvious one. `define` is the one to watch: it substitutes
  // whatever it is given, with no prefix rule of any kind, so a single
  // `define` entry is how a server-only value reaches the browser without
  // anybody editing this line. Adding one is a decision about the security
  // boundary, not a build tweak. Note Vite already sets one itself —
  // `process.env` becomes `{}`, so a stray `process.env.SECRET` in client code
  // compiles to `{}.SECRET` and is `undefined` at runtime rather than throwing.
  // That is a safe failure but a silent one; see the frontend block in
  // eslint.config.mjs for the rule that makes it loud.
  envPrefix: ["VITE_"],

  // Where `.env` files are read from: this directory, `apps/frontend/`, not
  // the repository root. It is Vite's default (the project root) and it is
  // written down for the same reason as the line above, plus one of its own —
  // the symmetry with the backend, which Task 1.6.3 settled first. That task
  // resolves `apps/backend/.env` from `import.meta.dirname`, deliberately not
  // from the cwd and not from the repository root, so the house rule is one
  // env file per package beside its `package.json`. Pointing this at the root
  // would make the frontend the odd one out.
  //
  // The cost is real and worth stating: a developer who puts a `.env` at the
  // repository root will find both packages silently ignoring it. `.gitignore`
  // covers every location — its `.env` patterns are unanchored — so being
  // ignored by git is not the signal that the file is in the wrong place.
  //
  // Not a Node path computation: Vite resolves this relative to `root`, which
  // is this file's directory, so the rule above about keeping Node APIs out of
  // this file still holds.
  envDir: ".",

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
    //
    // **Left as a literal, deliberately (Task 1.6.4), and the question does not
    // pass to Story 1.8.** The backend reads `PORT` and `HOST` because they are
    // properties of a *deployed process*: Story 1.11's container sets them and
    // nothing else can. Neither of the two ports in this file survives into a
    // deployment at all — `apps/frontend/dist` is three static files served by
    // somebody else's host, and `vite` and `vite preview` are development
    // tools. So the asymmetry is not an inconsistency to resolve; it is the two
    // packages having genuinely different kinds of port.
    //
    // The cost is a developer with a busy 5173, who has to edit this line
    // rather than export a variable. `strictPort` above means they find out
    // immediately, which is the trade being made. Against it: Story 1.12 pins
    // its CORS allowlist to this origin, so a configurable port is a second way
    // to break CORS with a symptom that names neither the port nor the cause —
    // and per the env-file note above, matching the backend *properly* would
    // mean `loadEnv()` here rather than `process.env`, because Vite does not
    // put `.env` entries on the process. The reversal trigger is two people
    // needing two frontends at once, and the shape it takes then is
    // `loadEnv()` plus a `VITE_`-free variable read in this file only.
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
