# Story 1.4 — UI Component Library & Styling Conventions

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Story 1.3
**Epic scope covered:** select UI component library and styling conventions

## Description

Choose the component library and styling approach, and define the design tokens the rest of the application builds on. This decision is load-bearing: it constrains every screen from Epic 4 onward, and it is expensive to reverse once dozens of components exist.

## Selection constraints

The chosen library must suit this specific product, not general web apps:

- **Dense, numeric, desktop-first UI** — analyst tooling, substantial screen real estate (PRODUCT_SPEC.md §3)
- **Must coexist with a WebGL canvas and charting libraries** without fighting them for layout or theming
- **Dark theme is the primary theme** for a market-monitoring surface, not an afterthought
- **Fast at high update rates** — live prices change continuously (Epic 3); heavy runtime-CSS-in-JS is a risk
- **Accessible primitives** — Epic 15 includes an accessibility review

## Open decisions

- Component library — headless primitives (e.g. Radix) plus own styling, versus a full opinionated library
- Styling approach — CSS Modules, Tailwind, or CSS-in-JS
- Charting library selection is **not** part of this story; it belongs to Epic 2

## Conventions from Story 1.1

Story 1.1 is complete, and these four bind this story. They are stated in every Epic 1 story so each one can be read on its own; the full reasoning is in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`.

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && test`, chained with `&&` so the first failure is the exit code. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

One thing that is true today and will not be forever: until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0, and they are now the only placeholders left. The companion note about both apps' `dev` scripts being placeholders is **no longer true** — Stories 1.2 and 1.3 made all three real.

## What that means for this story

- **Prettier is root-only and there is one `prettier.config.mjs`.** A styling choice that wants a Prettier plugin — `prettier-plugin-tailwindcss` is the obvious one — adds it there and at the root, not per package. Every option in that file is explicit on purpose, so an addition is a deliberate edit rather than a silently inherited default
- **Formatting is Prettier's and correctness is ESLint's, and they do not overlap today** — measured at zero conflicting rules, twice, which is why `eslint-config-prettier` is not installed. A styling approach that brings its own lint rules should be checked against that with `eslint --print-config` rather than assumed compatible. If a genuine conflict appears, `eslint-config-prettier` goes last in the flat config array
- A CSS-in-JS choice interacts with `verbatimModuleSyntax` and `isolatedModules`, both of which are on so that `tsc` and the bundler cannot disagree about what a file means — and the bundler is **Rolldown/oxc, not esbuild**, because Vite 8 is the Rolldown release (ADR 0003 §1). Libraries relying on whole-program type information at build time will feel that

### What Story 1.3 hands this story

Three things, now measured rather than expected.

- **There is a React application to style, and it emits no CSS at all.** `apps/frontend/src/App.tsx` is a single stateless component; the production build is 190.80 kB across 17 modules and contains **no stylesheet**, because nothing imports one. This story is what makes a CSS asset appear in `dist/assets/` for the first time, which is worth watching: it is the first change to the shape of the deployable artefact
- **A styling library is a dependency of `apps/frontend`, not of the root** — it is imported by that package's code. A Prettier or ESLint _plugin_ that comes with it is a tool and goes to the root, next to the config it extends. Task 1.3.2 drew that line the same way for React (package) and `eslint-plugin-react-hooks` (root)
- **The React Compiler rule set is already in force and has never met real code.** `eslint-plugin-react-hooks`'s `recommended` is 17 rules, 15 at `error`, most of them Rules of React — `purity`, `immutability`, `set-state-in-render` — rather than hook ordering, and `lint` now runs with `--max-warnings 0`. This story writes the first components those rules will actually see. A CSS-in-JS approach that computes styles during render is the likely first collision, and it will surface as a lint error rather than a runtime problem

## Acceptance criteria

- Component library and styling approach chosen, installed, and rendering
- Design tokens defined for colour, spacing, typography and elevation, with a dark theme
- Semantic tokens exist for market-specific meaning — positive/negative price movement, anomaly intensity, stale/disconnected data
- At least one representative component built to demonstrate the conventions
- Conventions documented, and the decision captured as an ADR in `docs/adr/` (PRODUCT_SPEC.md §39) **numbered with the next free number at the time — not a number fixed in advance.** This criterion said "ADR 0002" and was written before Story 1.2 took that number for the backend framework and Story 1.3 took 0003 for the frontend build; following it as written would force exactly the renumbering the convention forbids. The next free number is **0004** as of 2026-08-30, so check `docs/adr/` rather than trusting that. The convention is in `docs/adr/README.md`: numbered in the order written, never renumbered, superseded records kept with a `**Superseded by:**` line rather than deleted. Follow 0001's shape — context, decision, rejected alternatives, and consequences a future reader would otherwise discover by tripping over them. This is the ADR where "expensive to reverse once dozens of components exist" earns the record

## Notes

Positive/negative colour choices need to survive an accessibility review — red/green alone is insufficient as the sole encoding.
