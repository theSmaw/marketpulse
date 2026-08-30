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

Two more things that are true today and will not be forever. Until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0. Until Stories 1.2 and 1.3 land, both apps' `dev` scripts are placeholders too; only `packages/shared`'s (`tsc -b --watch`) is real.

## What that means for this story

- **Prettier is root-only and there is one `prettier.config.mjs`.** A styling choice that wants a Prettier plugin — `prettier-plugin-tailwindcss` is the obvious one — adds it there and at the root, not per package. Every option in that file is explicit on purpose, so an addition is a deliberate edit rather than a silently inherited default
- **Formatting is Prettier's and correctness is ESLint's, and they do not overlap today** — measured at zero conflicting rules, twice, which is why `eslint-config-prettier` is not installed. A styling approach that brings its own lint rules should be checked against that with `eslint --print-config` rather than assumed compatible. If a genuine conflict appears, `eslint-config-prettier` goes last in the flat config array
- A CSS-in-JS choice interacts with `verbatimModuleSyntax` and `isolatedModules`, both of which are on so that `tsc` and esbuild cannot disagree about what a file means. Libraries relying on whole-program type information at build time will feel that

## Acceptance criteria

- Component library and styling approach chosen, installed, and rendering
- Design tokens defined for colour, spacing, typography and elevation, with a dark theme
- Semantic tokens exist for market-specific meaning — positive/negative price movement, anomaly intensity, stale/disconnected data
- At least one representative component built to demonstrate the conventions
- Conventions documented, and the decision captured as **ADR 0002 in `docs/adr/`** (PRODUCT_SPEC.md §39). That directory now exists, with `0001-repository-structure-and-typescript-toolchain.md` and a `README.md` stating the convention: numbered in the order written, never renumbered, superseded records kept with a `**Superseded by:**` line rather than deleted. Follow 0001's shape — context, decision, rejected alternatives, and consequences a future reader would otherwise discover by tripping over them. This is the ADR where "expensive to reverse once dozens of components exist" earns the record

## Notes

Positive/negative colour choices need to survive an accessibility review — red/green alone is insufficient as the sole encoding.
