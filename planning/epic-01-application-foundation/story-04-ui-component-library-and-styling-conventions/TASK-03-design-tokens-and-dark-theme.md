# Task 1.4.3 — Design tokens and the dark theme

**Status:** Not started
**Story:** [1.4 UI Component Library & Styling Conventions](STORY.md)
**Depends on:** Task 1.4.2

## Objective

Define the foundational tokens — colour, spacing, typography, elevation — and the mechanism that applies a theme, with dark as the primary theme. This task owns the token _system_; Task 1.4.4 adds the market-specific meanings on top of it.

## Work

- Define tokens for the four categories the story names. Keep the set small: a scale nobody can hold in their head gets ignored, and Epic 4 is the first screen dense enough to prove any of it. Prefer a few well-spaced steps over a complete ramp invented in advance
- **Dark is the primary theme, not a variant of a light one.** Build the dark palette first and derive any light theme from it if one is wanted at all — the reverse produces a dark theme made of inverted light values, which is the recognisable failure. Decide explicitly whether a light theme exists in V1; "no light theme yet" is a legitimate answer and a cheaper one, provided the token layer does not make adding one a rewrite
- **Choose the theming mechanism deliberately, and write down what it costs.** A `data-theme` attribute, a class on the root, `prefers-color-scheme`, or a single fixed theme are different bets on whether the user gets a choice. Note that `index.html` currently sets no `color-scheme` at all, so form controls, scrollbars and the pre-hydration background are the browser's light defaults — a dark application on a white flash. Fixing that is a `<meta name="color-scheme">` or a CSS `color-scheme` declaration, and it belongs here
- **Two consumers exist that are not React components, and the token layer has to reach both.** Epic 6's Sigma.js/WebGL topology cannot read a CSS class — it needs values it can pass to a renderer as numbers and colour strings — and Epic 2's charting library will want the same. If tokens are CSS custom properties only, there is no typed access from JavaScript, and the workaround people reach for (`getComputedStyle`) is a layout read on the main thread. Decide now whether the source of truth is CSS, TypeScript, or a generated pair, and record the reason. This is the single decision in this task most likely to be regretted
- **If any token value is shared with the backend, it does not belong in `packages/shared`.** Nothing about colour is domain knowledge, and the shared package is consumed as built output by a Fastify server that will never render anything. Tokens live in `apps/frontend`. Anomaly _levels_ are domain; their colours are not — that distinction matters in Task 1.4.4
- Set the typography scale against the actual product: dense numeric tables where digits must align. Tabular figures (`font-variant-numeric: tabular-nums`) are the difference between a readable price column and a jittering one, and it is a token-level decision rather than a per-component fix
- **Elevation in a dark theme is not shadow.** Shadows are close to invisible against a dark ground; surface lightness does the work instead. Define elevation as a small ladder of surface colours, and say so, or the token will be defined as a shadow that nobody can see and quietly worked around
- Document each token's _meaning_ next to its value, in the same style as `tsconfig.base.json` and `prettier.config.mjs` — every entry carrying the reason it exists. A palette without semantics is a palette that gets picked from by eye
- Apply the tokens to the existing `App.tsx` shell only far enough to prove they work. Building components is Task 1.4.5's job

## Done when

- Colour, spacing, typography and elevation tokens exist, with a dark theme applied and rendering
- The theming mechanism is chosen and its cost written down, including the `color-scheme` behaviour of the current `index.html`
- The question of non-React consumers (WebGL, charts) is answered rather than deferred by silence
- Numeric text renders with tabular figures, verified in the browser rather than assumed from the CSS
- `pnpm verify` passes and `pnpm build` still produces a working artefact from a static host
- No market-specific semantics have appeared yet — those are Task 1.4.4

## Notes

The tokens defined here are what Story 1.5's persistent chrome is built from, and what Epic 4's Market Overview is built from after that. Under-specifying is recoverable; over-specifying a ramp of forty values before a single dense screen exists is not, because the unused half stays unused and misleading.
