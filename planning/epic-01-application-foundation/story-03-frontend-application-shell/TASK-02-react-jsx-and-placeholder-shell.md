# Task 1.3.2 — React, JSX and the placeholder shell

**Status:** Complete
**Story:** [1.3 Frontend Application Shell](STORY.md)
**Depends on:** Task 1.3.1

## Objective

Make the page a React application and render the placeholder shell the story asks for. This is the task that introduces `.tsx` to the repository, so it is also the task that finds out what `.tsx` costs the tsconfig, the lint config and the formatter.

## Work

- Install `react` and `react-dom` as **dependencies of `apps/frontend`**, and their `@types` as devDependencies of the same package. This is the half of the root-only tooling rule that is easy to over-apply: Vite is a tool and lives at the root (Task 1.3.1); React is imported by this package's code and lives here. Pin the `@types` to the React major actually installed, the way `@types/node` tracks the runtime major rather than npm's `latest`
- Add the `jsx` compiler option to `apps/frontend/tsconfig.json`. `react-jsx` is the modern transform and needs no `import React` in a component file — which matters here because `verbatimModuleSyntax` makes unused-import behaviour literal. **This is a sixth per-app compiler override**, not the fifth this task originally said: Task 1.3.1 spent the fifth on `noEmit`. CLAUDE.md still records four and is wrong by two until Task 1.3.5 fixes it. The option belongs in `apps/frontend` and nowhere else, and it needs the same one-line comment every option in that file carries
- **The bundler is now the only producer of JavaScript for this package**, because Task 1.3.1 made the TypeScript half `noEmit`. So a misconfigured JSX transform cannot be diagnosed by looking at what tsc emitted — there is nothing to look at. The browser and `vite build`'s output are the only evidence, which makes the "render it and look" check below load-bearing rather than a formality
- **Do not empty `types: []`.** Adding React's types is not a reason to touch that array: `@types/react` arrives through `import` statements, not through global auto-inclusion, so the empty array and working React types are not in tension. Verify that empirically rather than trusting this sentence — if React types genuinely require an entry, add the entry, not the emptiness. A quick check that the guard still holds: a file referencing `process` must still fail with TS2591
- Replace the plain entry with `src/main.tsx` mounting an `App` component into a root element in `index.html`. `react-dom/client`'s `createRoot`, not the legacy render
- **Relative imports still carry `.js` extensions**, so `main.tsx` imports `./App.js` and the file on disk is `App.tsx`. `nodenext` requires the emitted filename and fails with TS2835 without it. The story asserts Vite tolerates this; treat that as a claim to verify in the dev server and the build, not a fact — the resolution rules are the bundler's, not `tsc`'s, and `.js` → `.tsx` is a step further than `.js` → `.ts`. **Task 1.3.1 did not touch this.** Its entry file contained exactly one import and it was a bare package specifier (`@marketpulse/shared`), so what it proved is that Vite resolves the workspace `exports` map — not that it resolves a rewritten relative extension. That question is entirely open, and this is the first task that asks it. Note also that Vite 8 resolves through Rolldown rather than esbuild, so any advice found for older Vite versions is about a different resolver
- Render a genuinely minimal shell: a heading naming the product and a placeholder region. **No routing, no styling system, no state management** — Stories 1.4 and 1.5 and Epic 2 own those, and the value of this story is that it is boring
- Check what ESLint does with `.tsx`. The frontend `globals` block in `eslint.config.mjs` already globs `**/*.tsx`, and the typescript-eslint project service picks up whatever the package's tsconfig `include` covers — so the expectation is that this costs nothing. Confirm it: `pnpm lint` must actually be linting the new files rather than silently skipping them, and the type-aware rules must be the ones running
- **Decide on `eslint-plugin-react-hooks` deliberately, here.** Nothing in this epic owns React lint rules — Story 1.4 is the component library and styling, not linting — so the choice is either made in this task or made by default. The rules of hooks are a correctness concern rather than a formatting one, which puts them on ESLint's side of the line Task 1.1.6 drew. If adopted, it is root-only tooling like every other plugin, in the one flat config, scoped to the frontend's globs. If deferred, record it as a dated deferral with an owner rather than leaving it unstated
- `pnpm format` — Prettier formats `.tsx` with no configuration and this must not become an argument

## Done when

- The browser shows the placeholder shell, rendered by React
- `pnpm verify` passes from the repository root
- `pnpm lint` demonstrably covers `.tsx` files with the type-aware rule set — check by introducing a violation, not by reading the config
- `types: []` is unchanged, and a reference to `process` in frontend code still fails to typecheck
- A relative import written as `./App.js` resolves in both `tsc -b` and the bundler, or the divergence is written down with what was done about it
- No router, no CSS framework, no state library has appeared

## Notes

This task and the next are deliberately separate. Rendering React and _hot-reloading_ React are different mechanisms — the first is a dependency and a transform, the second is a Vite plugin and a dev-server contract — and separating them means an HMR problem in Task 1.3.3 cannot be confused with a rendering problem here.

## Outcome

React 19.2.8 renders the shell. `pnpm verify` passes from a clean tree in **4.9s** (4.5s before this task). The five checks the task set as evidence rather than assertion were all run, and three of them changed something.

### The `.js` → `.tsx` question, closed in both directions

This was the one genuinely open question the story carried into this task, and Task 1.3.1 could not answer it — its entry file had a single bare package import. The answer is that **`main.tsx` importing `./App.js` resolves in both producers**: `tsc -b` exits 0, and `vite build` transforms 17 modules without complaint. No divergence, nothing to work around, and the convention Story 1.1 established holds one extension further than it had been tested.

Worth being precise about why that is unsurprising in hindsight and was not safe to assume: the two resolvers agree here for different reasons. `tsc` maps the emitted filename back to a source under `nodenext`; Rolldown resolves it because Vite's resolver tries TypeScript source extensions for a `.js` specifier. Two mechanisms, one result — so a future Vite change could break it without `tsc` noticing, which makes this a thing to re-check on a bundler upgrade rather than a settled property of the language.

### The React plugin's flat config is not where you first look

`eslint-plugin-react-hooks@7.1.1` exports **two** things called `recommended-latest`. The top-level `configs["recommended-latest"]` is still eslintrc-shaped — `plugins: ["react-hooks"]`, an array — and ESLint 10 rejects it outright:

```
Flat config requires "plugins" to be an object, like this:
    { plugins: { react-hooks: pluginObject } }
```

Exit 2, not a lint failure. The usable one is `configs.flat["recommended-latest"]`. Loud rather than silent, which is the good version of this problem, but the two names being identical is a trap worth having written down.

### `eslint-plugin-react-hooks` adopted, and what that actually turned on

The task asked for a deliberate decision rather than a default. **Adopted**, root-only like every other tool, scoped to `apps/frontend/src/**` so `vite.config.ts` is not asked React questions.

What is easy to get wrong: `recommended` in v7 is not the two rules the plugin's name suggests. It is **17 rules**, and most of them are the React Compiler's Rules of React — `purity`, `immutability`, `set-state-in-render`, `preserve-manual-memoization` — rather than hook ordering. Taken whole, on the grounds that adopting them with one component in the tree costs nothing and adopting them in Epic 2 is a retrofit.

Three of the 17 ship at `warn`: `exhaustive-deps`, `incompatible-library`, `unsupported-syntax`. That is the first non-error severity anywhere in this workspace, and it exposed something: **`eslint .` does not fail on warnings**, so `verify` would have gone green with real findings in it. That is the same green-tick-that-means-nothing problem CLAUDE.md already names for the placeholder `test` scripts. So all four `lint` scripts — root and all three packages — now pass **`--max-warnings 0`**, keeping the verb meaning the same thing everywhere. The severities stay as the plugin ships them; what changed is that a warning now costs something.

### The two guards held, checked by breaking them

- **`types: []` is unchanged and still works.** A `.tsx` file referencing `process` fails with `TS2591` even with `@types/react` installed, which confirms the prediction in this task: React's types arrive through `import` statements, not global auto-inclusion, so the empty array and working React types were never in tension.
- **ESLint really does lint `.tsx` with the type-aware set.** Checked by introducing violations, not by reading the config: a probe component drew both `@typescript-eslint/no-unnecessary-condition` (which needs type information to fire at all) and `react-hooks/rules-of-hooks`. The `**/*.tsx` glob and the project service both cost exactly nothing, as expected.
- Prettier parses `.tsx` with no configuration — verified by feeding it mangled JSX and watching it reformat, rather than by observing that already-tidy files were left alone.

### Also observed

- **`@types/react` does not share a version line with `react`** — 19.2.18 against 19.2.8, and `@types/react-dom` is 19.2.5 again. Same shape as `@eslint/js` vs `eslint`, which CLAUDE.md already warns about. Pin them to the React _major_, never in lockstep.
- **React brought no install scripts either.** `allowBuilds` is still empty and still untested, one more task on from the prediction failing. A sweep does turn up `prepare` scripts (`minimatch`, `acorn`, `cookie`, `lightningcss`, …), but `prepare` does not run for registry tarballs — only `preinstall`/`install`/`postinstall` would, and there are none.
- **The bundle went from 1.03 kB to 190.76 kB** (60.15 kB gzipped), 6 modules to 17. That is React, and it is the whole of it — worth having a number for before Story 1.4 adds anything.
- **`StrictMode` was deliberately not added.** It is in every Vite React template, so its absence will look like an oversight. It double-invokes render and effects in development, which is exactly the signal Task 1.3.3 will be reading when it checks whether component state survived a fast refresh. Deferred to Task 1.3.3 to adopt once that measurement is taken — dated 2026-08-30, not forgotten.
- The dev server bound 5173 this time; Task 1.3.1 got 5174. Nothing changed but what else was running, which is the point of the `strictPort` decision Task 1.3.3 owns.

### For Task 1.3.5

Three things beyond the list that task already carries: the `--max-warnings 0` change to all four `lint` scripts and why it happened; `eslint-plugin-react-hooks` as the workspace's first ESLint plugin beyond `typescript-eslint` (and the `configs.flat` trap); and the `StrictMode` deferral, which needs to be a dated decision in writing or it reads as a mistake.
