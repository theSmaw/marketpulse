# Visual language — MarketPulse

**Status:** Settled 2026-08-31
**Story:** [1.4 UI Component Library & Styling Conventions](STORY.md)
**Consumed by:** Tasks 1.4.3, 1.4.4, 1.4.5, 1.4.6 — and every screen from Epic 4 onward

This is the design input to the token tasks. Task 1.4.3 turns it into CSS custom properties, Task 1.4.4 layers market meaning on top, Task 1.4.5 builds the first components from it, and Task 1.4.6 records the decision as ADR 0004. It is not itself a decision record — it is the description of the look those tasks are aiming at, written down so that "does this match?" has an answer other than someone's memory of a screenshot.

**Treat a divergence from this document as a change to this document**, not as a local judgement call in a component. That is the whole reason it exists: a design language that lives in individual files stops being one after about six of them.

## Intent, in one paragraph

MarketPulse should read as an **internal application at a large financial institution** — the kind of dense, sober, desktop tool an analyst has open all day — rather than as a consumer product or a modern SaaS dashboard. Concretely that means: white and warm off-white grounds, near-black text, hairline rules doing the work that borders and shadows do elsewhere, corners that are almost square, generous whitespace around genuinely dense numeric content, and **no decoration that does not carry information**. The aesthetic is restraint. It is not minimalism as a style choice; it is the absence of anything competing with the numbers.

## The bar — added 2026-09-05, and it outranks everything below it

**The UI has to be outstanding. It has to excite the people who see it. It must never read as old-fashioned, basic, or like a default admin panel.** That is a standing instruction from the user, given unprompted after a long stretch of backend work, and it is recorded here rather than in a task file because this is the document every screen is built against.

**This is not in conflict with the paragraph above it, and reading it as one is the mistake to avoid.** "Dense, sober, institutional" describes a _category_ of product, and the best things in that category — a trading terminal somebody actually wants to open, a professional instrument — are exciting precisely because of how well they are made, not in spite of being serious. What the bar rules out is the failure this document already names in its own words: _"get the structure approximately wrong and the result is a generic admin panel, because there is nothing else holding it up."_ **Restraint is not the same as plain, and the text below has been read as licensing the second.**

### What "outstanding" means here, so it is not a matter of taste

Four tests, each of which can be applied to a screenshot by somebody who has never read this document:

1. **Would a stranger believe this is a real, funded product?** Not a demo, not a tutorial, not a scaffold with data in it.
2. **Does it look designed rather than defaulted?** Every framework and every component library has a look. Meeting the bar means none of the defaults survived contact with a decision.
3. **Is there a moment in it worth showing somebody?** PRODUCT_SPEC.md §38 is built around a five-minute demonstration and §40's success criterion is a first-time viewer understanding the product in about a minute. A screen with no moment in it fails at the thing this project exists for.
4. **Does it feel alive?** This is a market application. Numbers change. A UI that updates by silently swapping text is technically correct and feels dead.

### The consequence: visual quality is an acceptance criterion, not polish

**Polish deferred is polish never**, and this repository is set up to defer it — there is no design review in any of the fifteen epics, and Epic 15 is a release epic rather than a design one. So the bar is enforced per story, on the story that builds the screen, and a UI story is not done because it is correct and accessible. Correct and accessible is the **floor**.

## The four decisions this document rests on

**Three of the four below are now under review against the bar above**, because between them they remove almost every tool that makes an interface exciting. They were settled with the user on 2026-08-31 and **they are not reversed here** — reversing a decision the user took, in a document, without asking, is how a design language stops being one. What follows each is what it costs against the new bar and what is recommended.

Settled with the user on 2026-08-31, before Task 1.4.3 began, and each one is a constraint on everything below.

1. **Light theme only in V1.** Built directly rather than derived from a dark one. This **reversed** Story 1.4's original "dark theme is the primary theme" constraint — see [_The dark-theme reversal_](#the-dark-theme-reversal) below.
2. **Neutral chrome, no brand accent.** The interface chrome is black, white and grey. **Colour appears only where it carries market meaning.**
3. **System font stack, no webfont.** No font files ship, and none are fetched.
4. **Colour is never the sole encoding of anything.** Inherited from Task 1.4.4's brief and promoted here, because decisions 2 and 3 make it load-bearing rather than an accessibility footnote.

### What decisions 2 and 3 cost, stated rather than discovered later

Together they remove both of the usual carriers of visual identity — a brand hue and a distinctive typeface. **What is left is structure**, and the identity stands or falls on it: the warm ground against white cards, the hairline rules, the 2px radius, the uppercase letterspaced micro-labels, the underline tab indicator, the right-aligned tabular numerals, and the whitespace around them. Get the structure approximately right and the result is an institutional tool. Get it approximately wrong and the result is a generic admin panel, because there is nothing else holding it up.

This is why the sections below specify geometry as precisely as they specify colour. The radius is one value and it is 2px; the separator is a 1px rule and it is near-black; the grid is 4px. Those are not defaults to be adjusted per component.

### Each decision against the bar, with a recommendation — 2026-09-05

**Decision 4 — colour is never the sole encoding — is kept unconditionally.** It is an accessibility property rather than an aesthetic one, it survives any restyle, and the measurement behind it stands: the two price directions differ by **1.05:1 in greyscale**, so hue is doing all the work and something else has to carry the meaning. Nothing about raising the visual bar touches it.

**Decision 3 — system font stack, no webfont — is the one to reverse first.** Typography is the single highest-leverage change available and it is the reason a screen reads as designed rather than defaulted: the system stack is, definitionally, what every undesigned page already uses. A financial instrument wants a text face with real character and a numeric face with true tabular figures, and the cost is one or two self-hosted files plus a loading strategy. **Recommended: reverse.** Self-hosted rather than fetched, so it survives the deployed CSP and adds no third-party origin.

**Decision 2 — neutral chrome, no brand accent — is under review, and it is reconcilable rather than binary.** Its purpose is that colour means something: an accent hue competing with the price and anomaly palettes would make the market colours ambiguous, which is a correctness problem rather than a taste one. But "no accent anywhere" is a stronger rule than that purpose needs. **Recommended: admit an accent that is confined to the chrome** — navigation, focus, selection, brand marks — and hold the market palette untouched, with the boundary written down and checked the way the semantic tokens already are.

**Decision 1 — light theme only in V1 — is flagged rather than recommended, because it has already been reversed once at the user's instruction.** The case for revisiting is real: market practitioners overwhelmingly work in dark interfaces, a dark ground makes the price and anomaly palettes far more vivid, and it is what makes this kind of product photograph well for a portfolio. The case against is equally real — it doubles the surface every token, chart and canvas has to be correct in, and Epic 6's WebGL renderer reads its colours from these tokens. **This one is the user's to settle**, and the mechanism is already built: Task 1.4.3 made theming a `[data-theme]` attribute over one block of tokens, and proved a whole-page swap with eight values and no component change.

**And one thing is missing rather than under review: there is nothing here about MOTION.** No durations, no easings, no opinion on what happens when a number changes, a panel opens or data arrives. For a live market application that is the largest single gap in this document — test 4 above is the one it currently fails outright — and it is not a token layer anybody has to reverse a decision to add.

## Surfaces and elevation

Three grounds, and the ladder is **warm**. Every neutral here has a slight yellow-red cast rather than being a pure grey or a blue-grey — that warmth is a large part of why the reference reads as institutional rather than as a developer tool, and it is the easiest thing to lose by substituting `#f5f5f5` for `#f4f3ee` because the difference looks like nothing in isolation.

| Role               | Value     | Where                                                        |
| ------------------ | --------- | ------------------------------------------------------------ |
| Page ground        | `#f4f3ee` | The application background. Warm, and noticeably not white   |
| Raised surface     | `#ffffff` | Cards, modules, panels, table bodies — the content sits here |
| Sunken / secondary | `#f9f9f7` | Table header rows, disabled fields, secondary strips         |

**Elevation is ground contrast plus a hairline, not shadow.** A raised module is white on the warm page ground with a 1px rule; it is not a white box with a drop shadow. This is the light-theme mirror of a note Task 1.4.3 already carried in the opposite direction — the original text said elevation in a dark theme is surface lightness rather than shadow, and the reasoning survives the reversal intact. Only the direction flipped.

Shadow exists but is nearly subliminal, and is reserved for content that genuinely floats above the page — a popover, a dropdown, a dialog. When used:

```
0 6px 14px rgba(0, 0, 0, 0.08),
0 1px  2px rgba(0, 0, 0, 0.04),
0 0    0 1px rgba(0, 0, 0, 0.04)
```

Note the third line: a 1px spread ring standing in for a border. Even the floating case keeps its hairline.

## Ink

| Role           | Value     | Notes                                                                   |
| -------------- | --------- | ----------------------------------------------------------------------- |
| Primary text   | `#1c1c1c` | Near-black, warm. **Never `#000000`** — pure black reads as harsh here  |
| Secondary text | `#5a5d5c` | Labels, metadata, captions. Warm grey, not blue-grey                    |
| Hairline rule  | `#1c1c1c` | The **primary separator**, at 1px. Yes, near-black — see below          |
| Soft divider   | `#d7d7d7` | Where a near-black rule would be too loud: between rows in a long table |
| Disabled text  | `#aaaaaa` | Fails contrast deliberately; disabled content must read as unavailable  |

**The near-black hairline is the single most distinctive idiom here and the easiest to soften by accident.** A section heading, a tab strip, a table header, and the bottom of a form field are all separated by a 1px `#1c1c1c` rule. Reaching for a light grey border instead is the default instinct and it is wrong — it produces the generic admin panel described above. Light grey is for _repeated_ dividers inside a list, where near-black would stripe the page.

## Geometry

- **Radius: 2px.** One value. Not a scale, not per-component, and not 4 or 6 or 8. Applied to buttons, inputs, cards, popovers and menus alike. The effect is "square with the corner knocked off", which is the intent
- **Border width: 1px.** Always. A 2px border is a focus ring, not a border — see below
- **Circles** are the sole exception, for avatars and status dots only
- **Density is desktop-first.** PRODUCT_SPEC.md §3 gives substantial screen real estate, and this is analyst tooling. Rows are tight; the space goes _around_ content blocks rather than inside them

### Focus

With no accent hue, focus cannot be a coloured ring. It is a **2px `#1c1c1c` outline with a 2px offset**, on every interactive element, and it is never removed. This is the one place the "1px always" rule is deliberately broken, because a 1px focus ring against a 1px border is not a state change anybody can see.

Two consequences worth knowing before they are rediscovered: a black focus ring is high contrast in every ground above, which is the reason it works at all; and it means focus visibility does not depend on colour perception, which is one fewer thing for Epic 15's accessibility review to find.

## Spacing

A **4px grid**. The values actually used in the reference, in order of frequency:

```
4   8   12   16   20   24   40
```

Note the gap between 24 and 40 and the absence of 32 — the reference jumps. That gap is real and it is what produces the airy separation between modules on an otherwise dense page. Task 1.4.3 should keep the ladder short rather than filling it in; a complete ramp invented in advance is exactly what that task's brief warns against.

## Typography

**Stack:** system fonts, no webfont, no download.

```css
font-family:
  ui-sans-serif,
  system-ui,
  -apple-system,
  "Segoe UI",
  Roboto,
  "Helvetica Neue",
  Arial,
  sans-serif;
```

The reference uses a licensed humanist sans that cannot ship. A self-hosted open substitute was considered and rejected: it costs bytes, a binary in the repository and a hosting concern, and — see the divergence below — it would not have bought the thing it was wanted for.

### Scale

Sizes and line heights, taken from the reference rather than invented:

| Size | Line height | Role                                                    |
| ---- | ----------- | ------------------------------------------------------- |
| 40   | 48          | Display — a single headline figure, sparingly           |
| 24   | 36          | Section heading                                         |
| 20   | 30          | Subsection heading                                      |
| 16   | 24          | Body                                                    |
| 14   | 20          | **Dense content — tables, rows, the product's default** |
| 12   | 16          | Micro-labels, metadata, captions                        |

14px is where this product actually lives. 16px is the reference site's body size because it is a marketing page; a dense analyst table is 14, and a 12px micro-label sits above it.

### The weight-300 divergence, recorded because it is a real loss

The reference leans hard on **weight 300** — headings are light, not bold, and that airiness is a genuine part of its character. **System stacks do not reliably have a 300**, so it renders as 400 on some platforms and as something else on others, and a heading whose weight changes by operating system is worse than a heading that never claimed to be light.

So the weights here are **400 and 600**, and hierarchy is carried by **size and grey** instead — which is how the reference gets most of its hierarchy anyway. This is the one deliberate, known departure from the target look, and it is the price of decision 3. If the light headings are later judged essential, the fix is a self-hosted variable font and it is a contained change: a `--font-sans` token value plus font files.

### Numerals

**`font-variant-numeric: tabular-nums` is a token-level decision, not a per-component fix.** Every digit that appears in a column — price, change, percentage, volume, score — must occupy the same width, or the column jitters on every tick. Epic 3 updates these continuously, so a proportional figure set turns a live price column into visible noise.

Numeric columns are **right-aligned**, always. A right-aligned tabular column aligns decimal points for free.

## Structural idioms

These are what the screenshots show and the stylesheet does not. They are the identity.

- **Micro-labels are uppercase, letterspaced, 12px and grey.** `ACCOUNT`, `NET WORTH`, `MARKET FEED`. This is the idiom that most says "institutional application"; a sentence-case grey label does not read the same way
- **A selected tab is an underline**, never a filled pill, never a rounded background. The underline is the near-black hairline again
- **Links are text.** With no accent hue they are distinguished by underline and weight, not by colour. A blue link would be the only hue in the chrome and would immediately become the thing the eye goes to
- **Actions in a module sit bottom-right**, small, uppercase, and quiet — `VIEW DETAIL`, `VIEW ALL ACCOUNTS`. They are not primary buttons
- **A large headline figure carries its fractional part smaller and raised**, and its currency symbol smaller still. This is a real typographic pattern in the reference and it is worth reproducing where a single number is the point of a module
- **Modules are white cards on the warm ground**, laid out on a multi-width grid — a module spans one, two or three columns rather than being free-form

### Controls

Two heights, and both are large by dense-UI standards because form fields in the reference are comfortable even when tables are tight:

| Height | Use                                        |
| ------ | ------------------------------------------ |
| 48px   | Primary forms                              |
| 36px   | Inline, toolbar, filter and dense contexts |

Two variants: **bordered** (a 1px box, 2px radius) and **underlined** (a bottom rule only, no box). The label sits _above_ the field, at micro-label size, always — never as a placeholder, which disappears on input.

**Seven states, and the set is the specification:** Empty, Filled, Hover, Focus, Error, Disabled, Locked. `Locked` is distinct from `Disabled` — disabled is temporarily unavailable, locked is not editable by this user — and they look different. Task 1.4.5 builds against this list rather than against three states plus improvisation.

## Colour, and the rule about it

**Colour appears only where it carries market meaning.** Everything above is achromatic. The chromatic tokens are Task 1.4.4's subject; these are the starting values and their measured contrast.

| Meaning         | Value     | on `#ffffff` | on `#f4f3ee` |
| --------------- | --------- | ------------ | ------------ |
| Positive        | `#498100` | 4.75         | **4.27**     |
| Negative        | `#c81219` | 5.90         | 5.31         |
| Caution / amber | `#dbaa35` | 2.14         | **1.93**     |

Measured, not assumed, and two of those numbers are findings rather than confirmations.

- **The positive green fails AA on the warm page ground** — 4.27 against a 4.5 threshold. It passes on white cards. Task 1.4.4 must decide this explicitly: darken the green, or constrain positive values to white surfaces. Inheriting it silently is the failure mode
- **The amber fails as text at any size** and is a fill-or-icon colour only. A 12px amber label on any of these grounds is unreadable

### The divergence Task 1.4.4 took, recorded here because this document is the reference

**The positive green shipped is `#427400`, not the reference's `#498100`.** This document's own rule is that a divergence from it is a change to it, so the change is written down here rather than living only in the task record.

It is the same hue at 90% brightness — still recognisably the reference green — and it measures **5.63 on white, 5.07 on the warm page ground, 5.34 on sunken**. It was chosen with margin rather than at the first value that clears 4.5, and close to the negative red's 5.31 so that neither direction of a price move carries more visual weight. The alternative resolution, constraining positive values to white surfaces, was rejected as a rule with no enforcement.

The other two values ship unchanged. The amber's status is unchanged too, and Task 1.4.4 extended it into a three-step ramp — `#f0dda4`, `#e2b544`, `#c08a12` — for anomaly intensity, all of them fills, none of them text.

One measurement to carry into any future palette work, because it is the reason the redundant channel is not optional: under `grayscale(1)` the positive green and the negative red differ by **1.05:1**. They are the same tone. The hue is the whole of the difference, which is exactly what the rule below says cannot be relied on.

**And the rule that outranks all three values:** colour is never the sole encoding. A negative change is red **and** carries its sign; a positive one is green **and** carries its sign. Roughly one man in twelve has a red-green deficiency and this product's primary signal is direction of price movement. With a neutral chrome the redundant channel is doing _more_ work than it would in a colourful interface, not less, because there is no other colour on screen to contrast against.

## What this is not

Stated explicitly, because each one is a thing somebody will otherwise add in good faith.

- **No brand accent hue.** No blue links, no coloured primary button, no accent border. The reference has a saturated brand red; it is deliberately not reproduced, both because red already means price-down on every row of this product and because reproducing a recognisable brand asset is not the goal. The goal is the _class_ of application
- **No webfont**, and no font files in the repository
- **No dark theme in V1.** The mechanism is built so a second palette is a values-only swap; the palette is not
- **No shadows as elevation.** Ground contrast and hairlines
- **No radius scale.** 2px
- **No colour in the chrome.** If a colour is proposed for something that is not market data, the answer is grey

## The dark-theme reversal

Story 1.4 was written with **"dark theme is the primary theme for a market-monitoring surface, not an afterthought"** as a selection constraint, and Task 1.4.3 instructed the author to build the dark palette first and derive any light theme from it. That was reversed on **2026-08-31**, before either task ran.

The reason is the same shape as the reversal that took the component library from Radix to Base UI a day earlier: **a constraint arrived that no spike could have produced.** The dark-primary constraint was a reasonable inference about market-monitoring software in general; the target here is a specific class of application, and that class is light. No measurement was going to discover that.

What the reversal costs is small, and it is worth being precise about why. Task 1.4.1's spike rendered its dense numeric row against a dark ground, but **its measurements are theme-independent** — module counts and bundle weights do not change with a palette — so the component-library decision stands untouched. Task 1.4.2's pipeline is a stylesheet reaching the browser and cares about no colour at all. The reversal lands entirely on tasks that had not started.

One thing genuinely improves. Task 1.4.3 flagged that `index.html` sets no `color-scheme`, so form controls, scrollbars and the pre-paint background are the browser's light defaults — "a dark application on a white flash". That problem disappears; what remains is declaring `color-scheme: light` so the light defaults are a stated choice rather than a coincidence.

## Sources

Two, and they were treated differently.

- **A live institutional wealth-management site**, read through computed styles rather than by eye: every surface, ink, radius, shadow, spacing and type value in this document is a census of what that page actually renders, not an estimate from a screenshot
- **Four styleguide and application-mockup screenshots** supplied by the user, which carry what a marketing page cannot: the named palette with its positive/negative separation, the multi-width module grid, the control heights and the seven-state matrix, and the structural idioms above

The institution is deliberately not named here or anywhere else in this repository, at the user's instruction. Nothing in this document depends on knowing which one it is — the values are values, and the aesthetic is a class of application rather than a brand.
