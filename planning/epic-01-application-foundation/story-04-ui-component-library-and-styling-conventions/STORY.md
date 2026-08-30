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

## Acceptance criteria

- Component library and styling approach chosen, installed, and rendering
- Design tokens defined for colour, spacing, typography and elevation, with a dark theme
- Semantic tokens exist for market-specific meaning — positive/negative price movement, anomaly intensity, stale/disconnected data
- At least one representative component built to demonstrate the conventions
- Conventions documented, and the decision captured as **ADR 0002 in `docs/adr/`** (PRODUCT_SPEC.md §39). That directory now exists, with `0001-repository-structure-and-typescript-toolchain.md` and a `README.md` stating the convention: numbered in the order written, never renumbered, superseded records kept with a `**Superseded by:**` line rather than deleted. Follow 0001's shape — context, decision, rejected alternatives, and consequences a future reader would otherwise discover by tripping over them. This is the ADR where "expensive to reverse once dozens of components exist" earns the record

## Toolchain constraints from Story 1.1

- **Prettier is root-only and there is one `prettier.config.mjs`.** A styling choice that wants a Prettier plugin — `prettier-plugin-tailwindcss` is the obvious one — adds it there and at the root, not per package. Every option in that file is explicit on purpose, so an addition is a deliberate edit rather than a silently inherited default
- **Formatting is Prettier's and correctness is ESLint's, and they do not overlap today** — measured at zero conflicting rules, twice, which is why `eslint-config-prettier` is not installed. A styling approach that brings its own lint rules should be checked against that with `eslint --print-config` rather than assumed compatible. If a genuine conflict appears, `eslint-config-prettier` goes last in the flat config array
- A CSS-in-JS choice interacts with `verbatimModuleSyntax` and `isolatedModules`, both of which are on so that `tsc` and esbuild cannot disagree about what a file means. Libraries relying on whole-program type information at build time will feel that

## Notes

Positive/negative colour choices need to survive an accessibility review — red/green alone is insufficient as the sole encoding.
