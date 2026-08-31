# ADR 0004 — Styling approach, component library and the component workshop

**Status:** Accepted
**Date:** 2026-08-31
**Delivered by:** Epic 1, Story 1.4 (Tasks 1.4.1–1.4.6)

## Context

Story 1.4 decides how every screen from Epic 4 onward is built. ADR 0003 left
the frontend as a React application with a bundler and no styling system at
all: 17 modules, 190.80 kB of JavaScript, and **no CSS asset in `dist/`**,
because nothing imported one.

Two questions were open and they are one question. Which component library
supplies behaviour, and how styles are authored — a full library answers both
at once, and a headless one answers only the first. `PRODUCT_SPEC.md` §25 named
React and stopped there. The story's own selection constraints are unusual
enough to be worth restating, because they are what most of the decisions below
turn on:

- **Dense, numeric, desktop analyst tooling** (§3), not a consumer product
- **Must coexist with a WebGL canvas and charting libraries** (Epics 2 and 6)
  without fighting them for layout or theming
- **Fast at high update rates** — Epic 3 updates prices continuously, so §28
  budgets work done during render
- **Accessible primitives**, because Epic 15 includes an accessibility review

A fifth constraint arrived mid-story and changed the shape of the answer.
The visual direction was settled with the user on 2026-08-31 and written down
in `planning/epic-01-application-foundation/story-04-…/VISUAL-LANGUAGE.md`:
light theme only in V1, neutral chrome with **no brand accent**, the system
font stack with no webfont, and colour never being the sole encoding of
anything. Two of those reversed constraints this story started with. Their
consequence is that **the product's identity is entirely structural** — a warm
ground under white surfaces, near-black hairlines rather than grey borders, one
2px radius, a 4px grid and right-aligned tabular numerals — which raises the
cost of getting the token layer approximately right.

## Decisions

### 1. CSS Modules plus CSS custom properties, not a styling library

Settled 2026-08-30 from a throwaway spike on the real toolchain — Vite 8.2.2
(Rolldown), React 19.2.8, `strictTypeChecked` linting, `noUncheckedIndexedAccess`
on — with six candidates each built far enough to render the same dense numeric
row. The full table is in Task 1.4.1's record; the three lines that decided it:

| Candidate                      | Modules | JS        | CSS asset |
| ------------------------------ | ------- | --------- | --------- |
| _baseline — nothing installed_ | 17      | 190.80 kB | none      |
| CSS Modules                    | 81      | 255.74 kB | 0.56 kB   |
| Mantine 9.5.2 (full library)   | 814     | 309.48 kB | 231.11 kB |
| MUI 9.4.0 + emotion            | 902     | 322.74 kB | **none**  |

Three reasons, in order of weight.

**It adds nothing to the build.** CSS Modules are a Vite feature, so the
styling half of this decision costs zero dependencies, zero plugins and zero
native bindings. Task 1.4.2 confirmed that in the shipping tree: the first
stylesheet landed with `pnpm-lock.yaml` untouched.

**The stylesheet is static.** Styles are resolved at build time and shipped as
a file; nothing is computed during render. MUI's row in the table is the direct
argument — **no CSS asset at all**, because emotion computes and injects rules
while rendering, which moves the cost out of the artefact and onto the main
thread. That is precisely what §28 budgets, with prices ticking continuously.

**Tokens end up as CSS custom properties, which is the only form the rest of
this product can read.** Epic 6's WebGL topology and Epic 2's charts cannot read
a CSS class. They can read a custom property.

### 2. Base UI (`@base-ui/react`) for behaviour — a reversal taken against the measurements

The library was **Radix Primitives** on 2026-08-30 and is **Base UI** from
2026-08-31. Both were measured on the same day against the same component:

| Candidate                             | Modules | JS        | Δ baseline |
| ------------------------------------- | ------- | --------- | ---------- |
| Radix, one primitive (popover)        | 83      | 255.36 kB | +64.56 kB  |
| Radix, three (popover/dialog/tooltip) | 86      | 267.34 kB | +76.54 kB  |
| Base UI, one primitive (popover)      | 179     | 292.67 kB | +101.87 kB |
| Base UI, three                        | 215     | 313.51 kB | +122.71 kB |

**Base UI lost on the exact axis that had already decided the choice**, and by
more than the candidate it beat — react-aria-components cost +86 kB for the
same popover and was rejected for it. The marginal cost runs the wrong way too:
one primitive to three costs Radix +11.98 kB and three modules, and Base UI
+20.84 kB and thirty-six.

It was reversed anyway, on a constraint no spike could produce: **an existing
shared component library, used at the author's work and built on Base UI, is
intended to be plugged into MarketPulse later.** Re-authoring every component
at that point costs far more than 46 kB does, and the cheap moment to act on
that is before any component exists. This is the "expensive to reverse once
dozens of components exist" property the story was written around, applied to
the story's own decision.

The assumption doing the work is stated rather than inherited: that the shared
library's interfaces resemble Base UI's. That is likely — Base UI's part
structure (`Root / Trigger / Portal / Positioner / Popup`) is distinctive, and
composition idioms are the expensive thing to change later, not prop names —
but it is **not verified**, because the library is not reachable from this
repository. Two things make the bet cheap to lose: the assumption is written
down, and **every Base UI usage sits behind our own wrapper component.** There
is exactly one file in the application importing `@base-ui/react`.

**Reversal triggers.** An accessibility finding in Epic 15 sends this back to
Radix (−46 kB for the same three primitives) or react-aria-components; both are
headless, so a swap changes markup and leaves styling alone. A second trigger
needs two conditions together: the shared library is not adopted after all
**and** bundle weight becomes a measured problem. The weight alone was already
judged acceptable.

### 3. CSS is the source of truth for tokens; TypeScript is a typed reader over it

`apps/frontend/src/styles/tokens.css` and `market.css` declare the tokens.
`src/styles/tokens.ts` reads them once at startup with `getComputedStyle`,
freezes the result, and caches it.

The rejected alternative was the generated pair — tokens defined in TypeScript,
CSS emitted from them. It buys compile-time values and costs a build step, a
generated file in the tree and a staleness check in `verify` to stop the two
drifting. That is real machinery for a problem this product does not have:
nothing outside the browser needs these values, and CSS is where a second theme
swaps in.

What the reader buys back is a **checked name**. A CSS Module class is an index
signature, so `styles.typo` is `undefined` and renders unstyled in silence; a
token name is a union member, so a typo is a compile error. `main.tsx` calls
`getTokens()` before rendering, and `.storybook/preview.ts` does the same, so a
token declared in TypeScript but missing from the stylesheets is a startup
throw naming it rather than a page that renders wrong.

### 4. Two token layers: `tokens.css` is achromatic, `market.css` is the only colour with meaning

`tokens.css` holds structure — surfaces, ink, rules, geometry, spacing, type —
and is achromatic. `market.css` holds a chromatic palette and a semantic layer
over it, and it is the only place in the application where colour carries
meaning. That split is a property of the visual direction rather than a habit:
with no brand accent, colour appearing anywhere else would be colour that means
nothing.

The semantic layer has **exactly one indirection**. `--price-negative`
resolves to `--palette-red-strong`, never to a hex and never through a second
semantic token. The achromatic semantics deliberately get no palette entry —
`--price-unchanged` is `var(--ink-secondary)`, because a second definition of
the same grey is a value waiting to drift. The palette is themeable and the
semantic mapping is not: positive is green in every theme, and only the green
changes.

The theming mechanism is `:root, [data-theme="light"]`, and both halves were
exercised against the built page: injecting a `[data-theme="dark"]` block of
**eight values and nothing else** moved ground, surfaces, ink and hairline with
no selector, component or markup change, and removing the attribute entirely
still gives a correct light page. The cost, if a second palette arrives: the
`:root` half has to pick a side.

### 5. Colour is never the sole encoding, and this is enforced by components rather than by convention

Measured rather than asserted. Under `grayscale(1)` the positive green and the
negative red differ by **1.05:1** — the same tone, so hue is the entire
difference and nothing about direction survives desaturation. Deuteranopia and
protanopia projections separate them by 2.99:1 and 2.31:1, both olive.

So each semantic group pairs its colour with a channel that survives:

- **Price direction** — a direction glyph in a fixed-width box, plus the sign
  on the figure. The box is fixed-width because arrows are not in the font's
  tabular set and would otherwise undo the column alignment
- **Anomaly intensity** — the band's **name**, written inside the fill. §11
  requires every score to carry its explanation and a gradient cannot be
  labelled. The ramp is amber and deliberately **not** red: red already means
  price-down, and an extreme anomaly on a security moving sharply up would read
  as a fall
- **Feed status** — the **shape** of the marker, filled or hollow, and a
  written label. Only `stale` takes a colour at all

A pairing every author has to remember is a pairing that will be forgotten, so
Task 1.4.5 made each of the three a component. That, and not the token set, is
what makes this decision hold.

One contrast measurement is load-bearing enough to record here: the reference
green `#498100` is 4.27:1 on the warm page ground and fails AA there while
passing at 4.75 on white. It was resolved by **darkening the green** to
`#427400` (5.07 / 5.63 / 5.34 on the three grounds), not by constraining
positive values to white surfaces — a rule with no enforcement, since nothing
in `pnpm verify` can see which ground a figure sits on.

### 6. Storybook is the workshop, every component has stories, and `verify` checks that it does

Added to the story on 2026-08-31 at the user's request, and folded into Task
1.4.5 rather than becoming a task of its own: a workshop with nothing in it
proves nothing, and a component built outside the workshop has to be retrofitted
into it.

The layout is `src/components/<Name>/` holding `<Name>.tsx`,
`<Name>.module.css` and `<Name>.stories.tsx`, **one component per file**. Every
component ships one named story per discrete state plus an `AllPermutations`
story rendering the cartesian product in a labelled grid. Where the product is
unbounded, the story fixes representative **extremes** rather than plausible
examples — the widest digits, the longest ticker, a negative sign — because
those are what break a tabular column, and Task 1.4.3 measured a 14.3 px spread
riding on exactly that.

`pnpm verify` gained a fifth step, `stories`, which fails if a component file
has no sibling stories file. **What it proves is that the file exists, and
nothing more** — whether the stories inside cover the permutations is a review
question, and nothing cheap can answer it, because a variant set is a type and
the check does not typecheck. Its own header says so. This repository keeps
naming green ticks that mean nothing; a convention with no check behind it would
have been another, and an overstated check would have been a third.

Two smaller decisions inside it. `main.ts` does **not** carry a `viteFinal`
override — the builder reuses `apps/frontend/vite.config.ts`, so there is one
`build.target`, one React plugin and one browser baseline. And
`.storybook/preview.ts` imports the same three stylesheets `main.tsx` does, in
the same non-alphabetical order, so a component that renders correctly in one
and wrongly in the other is a cascade problem it should not be possible to have
without seeing.

## Rejected, with reasons

Carried from Task 1.4.1's record rather than from memory. An ADR that lists
alternatives without reasons is a list.

- **MUI + emotion** — 902 modules, 322.74 kB, and **no CSS asset in `dist/` at
  all**. That absence is the finding: the cost moves from the artefact into the
  main thread, which is exactly what §28 budgets. Also the candidate most likely
  to collide with the React Compiler's `purity` rules once components do real
  work
- **Mantine** — 814 modules and **231.11 kB of stylesheet shipped whole** for
  one table and one popover, not tree-shaken. Genuinely dense components, but a
  full opinionated library also picks the styling approach for you, and this one
  picks "ship all of it"
- **vanilla-extract** — the closest loss, and it lost on the install rather
  than on the styling. Typed tokens in TypeScript answer §3's question directly
  and its class exports are typed `string`, so it has neither of CSS Modules'
  costs. But it reintroduces **esbuild**, a bundler this toolchain deliberately
  does not have, and it is what first tripped `allowBuilds`. Worth revisiting if
  the token duplication ever turns out worse than expected
- **Tailwind v4** — closer than the numbers suggest, and it clears every check:
  `@tailwindcss/vite` declares `vite ^8`, the oxide binding ships prebuilt with
  no install script, and `prettier-plugin-tailwindcss` installs cleanly. It lost
  on being a second vocabulary the product does not need — 6.5 kB of its 7.14 kB
  stylesheet is preflight, and utility classes do not reach the WebGL canvas or
  the charts, which is where a large share of this product's colour lives
- **react-aria-components** — the same popover cost +86 kB against Radix's
  +64.56 kB, for identical behaviour, because Radix publishes one package per
  primitive and react-aria ships a monolith. Lost on weight, not on quality, and
  it remains a standing alternative
- **Radix Primitives** — chosen on 2026-08-30, reversed on 2026-08-31. It is
  lighter and it did not lose an argument; it lost to a constraint outside the
  spike, in §2 above. The premise usually offered for this pivot is false and
  was checked rather than recalled: `@radix-ui/react-popover` shipped five
  stable releases in July 2026 alone
- **`@storybook/addon-docs`** — autodocs with nothing written in it is a tab
  that says nothing
- **A test runner.** Storybook 10 puts `@vitest/expect`, `@vitest/spy` and
  three Testing Library packages into the lockfile through the front door. No
  `storybook test`, no `@storybook/addon-vitest`, no interaction tests: Story
  1.9 picks the runner, and taking that decision here would be scaffolding ahead
- **Per-file generated CSS Module types.** They would close the silent-typo
  hole below, at the price of a build step, a generated file and a `.gitignore`
  entry. Reconsider if silent typos start causing real defects

## Consequences worth stating separately

### The artefact grew, and most of it is one primitive

Measured from a clean build at the close of the story, and the shape matters as
much as the size:

| Stage                       | Modules | JS            | CSS         | Files |
| --------------------------- | ------- | ------------- | ----------- | ----- |
| ADR 0003 left it            | 17      | 190.80 kB     | none        | 2     |
| Task 1.4.2 — first sheet    | 18      | 190.80 kB     | 0.07 kB     | 3     |
| Task 1.4.3 — tokens         | 18      | ~191 kB       | 3.04 kB     | 3     |
| Task 1.4.4 — market layer   | 18      | 196.36 kB     | 6.22 kB     | 3     |
| **Task 1.4.6 — this story** | **193** | **300.09 kB** | **7.21 kB** | **3** |

**+109 kB of JavaScript, and essentially all of it is Base UI's popover.** That
is the other side of §2's trade being paid, recorded so nobody re-derives it or
reads the growth as a regression. The stylesheet — the whole design language,
both token layers and five components — is **7.21 kB**, 1.94 kB gzipped.

The artefact is still **three files**, still self-contained, and still renders
from `python3 -m http.server` outside the workspace with no `package.json` and
no `node_modules` beside it. The emitted asset path is absolute, so a subpath
deployment is a `base` change and a rebuild rather than a hosting setting.

### The accessible-primitives constraint is a per-primitive question, and finding that out changed a component

The Base UI seam was written as a **tooltip**. Measured against the built
workshop, Base UI's tooltip renders **no `role="tooltip"`** and wires **no
`aria-describedby`** — deliberately, and its own documentation says so: if the
description is important to understanding the element, it should not be hidden
behind a tooltip.

The first thing this product puts behind that seam is an anomaly score's
explanation, which §11 makes mandatory and therefore important by definition.
So the wrapper is a **popover**: `role="dialog"`, with both `aria-labelledby`
and `aria-describedby` present, verified in the browser rather than read off the
library. The cost, stated rather than hidden: an explanation is a click where it
was a glance. If a genuine _hint_ is ever needed it arrives as a **second**
wrapper, not as a looser version of this one.

This is not a finding against Base UI — the behaviour is correct for what a
tooltip is. It is evidence that "accessible primitives" is a property of each
primitive rather than of a library, which is what Epic 15's review should
inherit.

### A CSS Module class-name typo is completely silent, and the house idiom is forced by lint

`vite/client` types a stylesheet as `{ readonly [key: string]: string }`. Two
consequences, both permanent.

A typo typechecks, lints, builds and renders unstyled. Nothing in `pnpm verify`
catches it, because an index signature has no key set to check against. This is
the same shape of gap as the unchecked shell script in ADR 0001 §13, and it is
recorded rather than closed.

And `noUncheckedIndexedAccess` makes every class `string | undefined`, so the
obvious ``className={`${styles.a} ${styles.b}`}`` is one
`restrict-template-expressions` error per interpolation and `--max-warnings 0`
makes that a failing `verify`. Reaching for `styles["a"]` instead is a
`dot-notation` error. The answer is `cx(styles.a, styles.b)` from
`apps/frontend/src/cx.ts` — dot access, composed through a three-line helper.
Both halves are needed, and the second was found only after the first was
written down as the whole cost.

### Focus belongs to the token layer, not to components

`base.css` carries one global `:focus-visible` rule and no component declares
another. Measured on a real control for the first time in Task 1.4.5: `Tab`
reaches the popover trigger, which is a genuine `<button>`, `:focus-visible`
matches, and the computed outline is `rgb(28, 28, 28) solid 2px` at
`outline-offset: 2px`. A component that adds its own focus style is answering a
question the tokens already answered.

### The a11y addon reports, and its badge does not mean what it looks like

`@storybook/addon-a11y` runs axe against each story and reports in a panel. It
does not fail a build: the `test` parameter that would do so drives Storybook's
Vitest integration, which this story deliberately did not adopt.

On `SecurityRow`'s 36-row permutation grid, served statically outside the
workspace: **0 violations, 17 passes, 1 inconclusive.** The tab badge shows
`1` — and that `1` is the inconclusive, not a violation. A reader glancing at
the badge will get it wrong.

The inconclusive itself is worth keeping, because of what it is. It is
`color-contrast` over 24 nodes, and every one of them is a direction arrow:
`<span aria-hidden="true">▲</span>`, with axe's reason given as "Element content
contains only non-text characters." **The automated check declines to judge the
exact element that carries the non-colour encoding** — the arrow is what
survives desaturation, and axe has nothing to say about it. That is why Task
1.4.4's manual contrast and colour-blindness measurements are the record, and
why Epic 15's accessibility review cannot be an axe run.

### `allowBuilds` finally fired, which amends ADR 0003

ADR 0003 recorded that `allowBuilds` was empty and had never been exercised in
the shipping tree, after four sweeps found no install scripts anywhere. That is
no longer true. **Storybook 10 depends on `esbuild` directly** — not through
Vite, which still has none, because Vite 8 is the Rolldown release and lists
esbuild only as an optional peer — and esbuild's install script fetches the
platform binary it cannot ship in one package.

The failure is the signature Task 1.4.1's spike documented:
`[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.28.2`, `pnpm
install` at exit 1, and pnpm rewriting the tracked `pnpm-workspace.yaml` with an
`esbuild: set this to true or false` stub. A dirty workspace file after a failed
install is pnpm's edit, not yours.

`allowBuilds` now has exactly one entry, with the reason written beside it, and
a sweep of the installed tree re-run in Task 1.4.6 confirms **esbuild is still
the only package here with an install script**. The prediction history is worth
keeping intact: ADR 0001 predicted esbuild via Vite and was wrong; ADR 0003
predicted it would never happen and was wrong; Task 1.4.1 found the route
through a styling plugin it then rejected. It arrived through a third route
nobody had named — the component workshop.

### `verify` is five steps and runs two bundlers

`build && lint && format:check && stories && test`. Root `build` is now
`tsc -b`, then `vite build`, then `storybook build`, and it hardcodes the
frontend package name **twice** — so a second frontend package would be missed
in two places rather than one.

From a clean tree, `pnpm verify` is **10.5 s** wall, against ~7.6 s before the
workshop. Warm, the steps are build 2.2 s, lint 3.3 s, `format:check` 1.4 s,
`stories` 0.24 s, `test` 0.45 s; cold, the build splits as `tsc -b` 1.54 s,
`vite build` 0.49 s and `storybook build` 1.38 s. The workshop's bundle is
227 modules and 7.4 MB across 50 files — twenty times the application's, and
not shipped to anyone. Story 1.10 inherits these numbers and owns whether
`storybook-static/` is published as a CI artefact.

The failure surface grew with the runtime: a component can now break in the
workshop while the application still builds, and `verify` catches it.

### Stories are inside the program and outside the bundle

`.stories.tsx` files live under `src/`, so they typecheck, they lint under the
full type-aware pass and the React Compiler rules, and the `.js`
import-extension convention applies to them. They are unreachable from
`index.html`, so `vite build` still emits three files and no story string
appears in the output — verified by grepping the emitted JavaScript for
`AllPermutations`, the story titles and the workshop stylesheet's class names,
all zero. `src/components/stories.module.css` is the file to watch: the day it
appears in `dist/assets/*.css`, something has imported a story from application
code.

### HMR is still fast, and a CSS-only edit is faster than a component edit

Re-measured in Task 1.4.6 with the styling pipeline in place, by observing the
DOM rather than by watching a heading change — a heading passes identically on a
full page reload, so `performance.timeOrigin` was checked as unchanged on every
sample to prove the update was HMR and not a reload.

A **CSS-only** edit lands in **24–130 ms** (median ~72 ms). A **component** edit
lands in 177–280 ms warm, with the first edit after a server start at 977 ms and
one 1.1 s outlier. Both are upper bounds: the measuring tab reported
`visibilityState: "hidden"`, which throttles React's scheduler, so the component
figure is not directly comparable to Task 1.3.3's ~100–140 ms foreground
baseline. The comparison that _is_ sound is the one taken under identical
conditions — a stylesheet edit is a `<style>` swap and a component edit is a
React re-render, and the difference shows.

### Two toolchain behaviours that only appear when writing stories

`exactOptionalPropertyTypes` makes "prop absent" and "prop present as
`undefined`" different types, so a permutation grid mapping over a table of
optional values does not compile and has to be written out — the compiler
drawing the same distinction the component's API does. And a decorator written
inline in a `Meta` object makes the inferred type unnameable (`TS2883`, "cannot
be named without a reference to `PartialStoryFn` … this is likely not
portable"); naming the decorator fixes it.

### What this story deliberately did not do

- **No component library.** Five components, four of which the fifth uses. The
  brief was one representative component and the primitives it needs
- **No score-to-band thresholds.** Where `elevated` ends and `unusual` begins is
  detection policy, it belongs with the scoring model in Epic 5, and a threshold
  invented in a styling task would outlive the guess that produced it
- **No second theme.** The mechanism ships so a second palette is a values-only
  swap; the palette does not
- **No control-height tokens.** `VISUAL-LANGUAGE.md` carries 48px and 36px, and
  a token with no consumer gets used for something else
- **No bundle-size budget.** Still Epic 14's, and still for ADR 0003's reason —
  most of the artefact is dependencies rather than this application's code
- **The React Compiler rule set has still never fired.** Five components in.
  Task 1.4.5 expected to be its first real test and was wrong: nothing here is
  stateful, there are no hooks anywhere, and CSS Modules compute nothing during
  render — which was the collision the story predicted. Adding components was
  the wrong thing to wait for; adding **state** is, which is Story 1.5 or
  Epic 2
- **The shared component library's exports were not read.** It is not reachable
  from this repository, so §2's assumption is still an assumption. The check is
  owed **before Story 1.5 adds more wrappers**, not after

## Related

- [ADR 0003](0003-frontend-build-tooling-and-browser-baseline.md), whose
  install-script conclusion this record amends, and whose `build` and browser
  baseline the workshop reuses rather than forks
- [ADR 0001](0001-repository-structure-and-typescript-toolchain.md) §5 (root
  scripts, now five in `verify`), §6 (root-only tooling — Storybook is the
  counter-example that proves the rule) and §13 (the install-script policy,
  fired for the first time)
- [Story 1.4](../../planning/epic-01-application-foundation/story-04-ui-component-library-and-styling-conventions/STORY.md)
  and its six task records, which carry the measurements behind every claim
  here, and
  [`VISUAL-LANGUAGE.md`](../../planning/epic-01-application-foundation/story-04-ui-component-library-and-styling-conventions/VISUAL-LANGUAGE.md),
  which is the design input they were built from
- `PRODUCT_SPEC.md` §3 (target users and platform), §11 (every score carries its
  explanation), §25 (frontend architecture), §28 (performance), §36 (degraded
  data is a product state), §39 (architecture decision records)
