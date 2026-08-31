# Task 1.4.3 — Design tokens and the theme

**Status:** Not started
**Story:** [1.4 UI Component Library & Styling Conventions](STORY.md)
**Depends on:** Task 1.4.2

## Objective

Define the foundational tokens — colour, spacing, typography, elevation — and the mechanism that applies a theme. This task owns the token _system_; Task 1.4.4 adds the market-specific meanings on top of it.

**Build against [`VISUAL-LANGUAGE.md`](VISUAL-LANGUAGE.md).** That document is the design input to this task and it is specific: it carries the three grounds, the ink values, the 4px spacing grid, the type scale, the 2px radius, the focus treatment, and the structural idioms. This task's job is to turn it into tokens, not to redesign it. **A divergence from it is a change to that document**, made deliberately, rather than a local judgement call here.

## Work

- Define tokens for the four categories the story names. Keep the set small: a scale nobody can hold in their head gets ignored, and Epic 4 is the first screen dense enough to prove any of it. Prefer a few well-spaced steps over a complete ramp invented in advance — note the reference's spacing ladder jumps from 24 to 40 with no 32, and that gap is doing work rather than waiting to be filled in
- **Light is the only theme in V1, and it is built directly rather than derived.** This **reversed** the story's original dark-primary constraint on 2026-08-31, before this task started; the reasoning is in `VISUAL-LANGUAGE.md` under _The dark-theme reversal_. The original instruction's underlying point still holds in mirror image — a theme derived by inverting another theme's values is the recognisable failure — so build the light palette as the real one, not as an inversion of a dark palette that does not exist
- **Choose the theming mechanism deliberately, and write down what it costs.** A `data-theme` attribute, a class on the root, `prefers-color-scheme`, or a single fixed theme are different bets on whether the user ever gets a choice. The decision taken is that the **mechanism ships and the second palette does not**: a `[data-theme]` selector with one theme defined, so adding a dark theme later is a values-only swap rather than a rewrite. Note that `index.html` currently sets no `color-scheme` at all — which now happens to give the right result, since the browser's defaults for form controls, scrollbars and the pre-paint background are light. **Declare `color-scheme: light` anyway**, so it is a stated choice rather than a coincidence that a later change could silently undo
- **Two consumers exist that are not React components, and the token layer has to reach both.** Epic 6's Sigma.js/WebGL topology cannot read a CSS class — it needs values it can pass to a renderer as numbers and colour strings — and Epic 2's charting library will want the same. If tokens are CSS custom properties only, there is no typed access from JavaScript, and the workaround people reach for (`getComputedStyle`) is a layout read on the main thread. Decide now whether the source of truth is CSS, TypeScript, or a generated pair, and record the reason. **This is the single decision in this task most likely to be regretted, and the theme reversal did not touch it** — it is the same question against a light palette as it was against a dark one
- **If any token value is shared with the backend, it does not belong in `packages/shared`.** Nothing about colour is domain knowledge, and the shared package is consumed as built output by a Fastify server that will never render anything. Tokens live in `apps/frontend`. Anomaly _levels_ are domain; their colours are not — that distinction matters in Task 1.4.4
- Set the typography scale against the actual product: dense numeric tables where digits must align. **Tabular figures (`font-variant-numeric: tabular-nums`) are the difference between a readable price column and a jittering one**, and it is a token-level decision rather than a per-component fix. Epic 3 updates these continuously, so a proportional figure set turns a live column into visible noise
- **The typeface is the system stack and no webfont ships**, and the cost of that is already known rather than waiting to be found: the reference leans on weight 300 for its headings, system stacks do not reliably have a 300, and a heading whose weight changes by operating system is worse than one that never claimed to be light. So carry **400 and 600**, and let hierarchy come from size and grey. Record it as a known divergence — `VISUAL-LANGUAGE.md` does, and it names the contained fix if it is ever judged essential
- **Elevation here is ground contrast plus a hairline, not shadow.** A raised module is a white surface on the warm page ground with a 1px rule, and the rule is near-black rather than light grey — that hairline is the most distinctive idiom in the target look and the easiest to soften by accident. Shadows exist but are nearly subliminal and are reserved for genuinely floating content: popovers, dropdowns, dialogs. Define elevation as a small ladder of **surfaces**, and say so, or the token gets defined as a shadow, quietly does nothing, and gets worked around
- **Focus cannot be a coloured ring, because the chrome has no accent colour.** It is a 2px near-black outline with a 2px offset, and it is the one deliberate exception to the 1px border rule — a 1px ring against a 1px border is not a visible state change. This also means focus visibility does not depend on colour perception, which is worth stating where Epic 15 will look for it
- Document each token's _meaning_ next to its value, in the same style as `tsconfig.base.json` and `prettier.config.mjs` — every entry carrying the reason it exists. A palette without semantics is a palette that gets picked from by eye
- Apply the tokens to the existing `App.tsx` shell only far enough to prove they work. Building components is Task 1.4.5's job

## Done when

- Colour, spacing, typography and elevation tokens exist, with the light theme applied and rendering
- The theming mechanism is chosen and its cost written down, including the `color-scheme` behaviour of the current `index.html` and the explicit declaration that replaces relying on it
- The question of non-React consumers (WebGL, charts) is answered rather than deferred by silence
- Numeric text renders with tabular figures, verified in the browser rather than assumed from the CSS
- The rendered shell is recognisably the language `VISUAL-LANGUAGE.md` describes — warm ground, white surface, near-black hairline, 2px radius — rather than a default-looking page that happens to use the right hex values
- `pnpm verify` passes and `pnpm build` still produces a working artefact from a static host
- No market-specific semantics have appeared yet — those are Task 1.4.4

## Notes

The tokens defined here are what Story 1.5's persistent chrome is built from, and what Epic 4's Market Overview is built from after that. Under-specifying is recoverable; over-specifying a ramp of forty values before a single dense screen exists is not, because the unused half stays unused and misleading.

One thing this task carries that the token list does not show. With no brand hue and no distinctive typeface, **the identity of the product is carried entirely by structure** — the ground ladder, the hairlines, the radius, the spacing, the tabular numerals. That makes the values in this task less forgiving than a token set usually is: `#f5f5f5` instead of `#f4f3ee` looks like nothing on its own and loses the warmth the whole look depends on, and a light-grey border instead of a near-black one produces a generic admin panel. `VISUAL-LANGUAGE.md` says so at more length; it is repeated here because this is the task that types the values in.
