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
- Conventions documented, and the decision captured as an ADR draft (PRODUCT_SPEC.md §39)

## Notes

Positive/negative colour choices need to survive an accessibility review — red/green alone is insufficient as the sole encoding.
