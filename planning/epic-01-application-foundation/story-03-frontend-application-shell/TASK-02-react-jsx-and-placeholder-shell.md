# Task 1.3.2 — React, JSX and the placeholder shell

**Status:** Not started
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
