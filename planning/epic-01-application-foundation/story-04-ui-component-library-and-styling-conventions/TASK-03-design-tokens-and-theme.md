# Task 1.4.3 — Design tokens and the theme

**Status:** Complete (2026-08-31)
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

## Outcome

Complete. `pnpm verify` exits 0, the built artefact renders from a dumb static host, and every claim below was measured in the browser rather than read off the CSS.

### What changed

| File                    |                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/styles/tokens.css` | New. The token definitions and the theming mechanism                                                        |
| `src/styles/base.css`   | New. `color-scheme`, the body ground and default type, `tabular-nums`, and one global `:focus-visible` rule |
| `src/styles/tokens.ts`  | New. Typed access for the consumers that are not React components                                           |
| `src/App.module.css`    | New. The shell's styles — not one literal colour, length or font in the file                                |
| `src/App.tsx`           | Rendered in the language rather than in the browser's defaults                                              |
| `src/main.tsx`          | Imports the two stylesheets in cascade order and calls `getTokens()` as a startup assertion                 |
| `index.html`            | `data-theme="light"` on `<html>`, with a comment saying why it is deliberately redundant                    |
| `src/throwaway.css`     | Deleted, as Task 1.4.2 said it would be                                                                     |

The artefact is still **three files**: `index.html`, one JS chunk, one CSS chunk. The stylesheet grew from 0.07 kB to 3.04 kB (0.98 kB gzipped) and the JS from 190.80 kB to 192.40 kB across 21 modules — the JS growth is `tokens.ts` and the larger component, not the styling.

### The theming mechanism, and the measurement that justifies it

The themeable tokens are declared on `:root, [data-theme="light"]`; geometry, spacing and type are declared on `:root` alone, because a second palette would change none of them.

The double selector is the decision. Both halves were exercised in the browser against the built output:

- Injecting a `[data-theme="dark"]` block of **eight values and nothing else**, then flipping the attribute, moved the page ground to `rgb(16, 20, 24)`, the module to `rgb(22, 27, 34)`, the ink to `rgb(230, 237, 243)` and the hairline with it. No selector, component or markup change. That is the "values-only swap" claim, tested rather than asserted
- Removing the `data-theme` attribute entirely left the page correct — ground `rgb(244, 243, 238)`, module `rgb(255, 255, 255)`. A misspelled or missing attribute is not a themeless page

The cost, stated: if a second palette ever arrives, the `:root` half has to pick a side.

`color-scheme: light` is declared in `base.css` and reads back as `light`. It changes no pixel today, which is exactly why it is worth stating — without it the application is light by coincidence.

### Tabular figures, measured

Three figures of equal digit count and different glyph widths, rendered at the product's default 14px and measured with a `Range` over each cell:

| Row           | Figure     | Rendered width | Same string, `proportional-nums` |
| ------------- | ---------- | -------------- | -------------------------------- |
| Narrow digits | `1,111.11` | 60.023 px      | 44.570 px                        |
| Wide digits   | `8,888.88` | 60.023 px      | 58.844 px                        |
| Mixed         | `1,088.18` | 60.023 px      | 53.969 px                        |

Identical to three decimal places under `tabular-nums`, and a **14.3 px spread** without it — about a third of the column's width. Epic 3 updates these continuously, so that spread is what a live price column would do on every tick. Set on `body` rather than per component, so every digit inherits it.

### Focus

Nothing on the page is focusable yet, so the global `:focus-visible` rule was exercised against a temporary button rather than claimed from the CSS. Keyboard `Tab` gave `outline: rgb(28, 28, 28) solid 2px` at `outline-offset: 2px`, with `:focus-visible` matching; a programmatic `focus()` did not match, which is the intended behaviour. Task 1.4.5 is where it meets real controls.

### The non-React consumer question, answered

**CSS is the source of truth, and `src/styles/tokens.ts` is a typed reader over it.** The rejected alternative was TypeScript as the source with a generator emitting the custom properties: that buys compile-time values and costs a build step, a generated file in the tree, and a staleness check in `verify` to stop the two drifting — real machinery for a problem this product does not have yet, given that nothing outside the browser needs these values and CSS is where a second theme swaps in.

Four costs, written down in the module itself rather than here alone:

1. Every value is a **string**. Epic 6's WebGL renderer wants numbers and packed colours and will need a parse layer, written against its real requirements rather than guessed at now
2. `getComputedStyle` is a main-thread read, so it happens **once**, at startup, frozen and cached — that is the whole reason the module exists rather than each consumer calling it
3. The read must happen after the stylesheet is applied. In the built artefact a pending `<link>` blocks script execution, and the startup call was verified against a static host with no console error; in dev the stylesheet is a module import of the entry
4. A second theme invalidates the cache. `readTokens()` is exported uncached for that day

One thing this buys back. A CSS Module class name is unchecked — `styles.typo` is `undefined` and renders unstyled in silence, which `pnpm verify` cannot catch. A token name here is a **union member**, so a typo is a compile error, and a token declared here but missing from the stylesheet is a startup throw naming it. `main.tsx` calls `getTokens()` before rendering for exactly that reason.

### What was deliberately left out

- **Control heights.** `VISUAL-LANGUAGE.md` carries 48px and 36px, and nothing renders a control until Task 1.4.5. A token with no consumer is a token that gets used for something else
- **An `--elevation-1` shadow.** Defining one invites it to be used for cards, where it would quietly replace the hairline idiom. The only shadow token is `--elevation-floating`, for popovers and dialogs
- **`cx()` in `App.tsx`.** Nothing on the page carries two classes at once. Using the helper on a single class name would make it look mandatory rather than useful; Task 1.4.5's components are its first real caller
- Every market semantic — those are Task 1.4.4, including the resolution owed for `#498100` at 4.27 on the page ground

### One stale comment fixed in passing

`vite.config.ts` still said `types: []` in `tsconfig.json` "exists to prevent" reaching for `@types/node`. That array became `["vite/client"]` in Task 1.4.2, and what makes it work is that it is **explicit**, not that it is empty. Corrected where it stood.
