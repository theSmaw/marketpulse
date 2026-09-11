# Visual language — MarketPulse

**Status:** Settled 2026-08-31 · **refreshed 2026-09-10** ([ADR 0022](../../../docs/adr/0022-the-design-refresh-three-typefaces-an-identity-accent-and-what-a-token-change-certifies.md))
**Story:** [1.4 UI Component Library & Styling Conventions](STORY.md)
**Consumed by:** Tasks 1.4.3, 1.4.4, 1.4.5, 1.4.6 — and every screen since

This is the design input to the token layer. `tokens.css` turns it into CSS custom properties, `brand.css` and `market.css` layer the two kinds of colour over them, and the components in `src/components/` are built from it. It is not itself a decision record — it is the description of the look those files are aiming at, written down so that "does this match?" has an answer other than someone's memory of a screenshot.

**Treat a divergence from this document as a change to this document**, not as a local judgement call in a component. That is the whole reason it exists: a design language that lives in individual files stops being one after about six of them.

## What the 2026-09-10 refresh changed, and why this document was rewritten rather than amended

Between 2026-08-31 and the refresh, three of the four decisions below were reversed. That is too much to carry as marginal notes — a reader following an amended document would have had to reconstruct the current language from a sequence of corrections — so the sections that describe **what the interface looks like today** were rewritten, and the sections that describe **how it got here** were kept intact and dated.

The refresh's own recommendations were already written in this document on 2026-09-05, in [_Each decision against the bar_](#each-decision-against-the-bar-with-a-recommendation--2026-09-05). All three were taken. What actually changed:

| Was (2026-08-31)                | Is (2026-09-10)                                                              |
| ------------------------------- | ---------------------------------------------------------------------------- |
| System font stack, no webfont   | **Three self-hosted variable faces** — display, sans, data                   |
| No accent hue anywhere          | **One crimson accent, confined to four positions in the chrome**             |
| Warm ground (`#f4f3ee`)         | **Cool ground** (`#f6f7fa`)                                                  |
| Near-black border on every card | Near-black reserved for **structure**; panels take an ordinary grey hairline |
| Radius 2px                      | **Radius 0** — square                                                        |
| Default text size 14px          | **13px**                                                                     |
| Mono for identifiers only       | **The data face carries every figure and identifier**                        |

Decision 1 (light theme only) and decision 4 (colour is never the sole encoding) are unchanged.

## Intent, in one paragraph

MarketPulse should read as an **internal application at a large financial institution** — the kind of dense, sober, desktop tool an analyst has open all day — rather than as a consumer product or a modern SaaS dashboard. Concretely that means: white and cool off-white grounds, near-black text, hairline rules doing the work that borders and shadows do elsewhere, square corners, generous whitespace around genuinely dense numeric content, and **no decoration that does not carry information**. The aesthetic is restraint. It is not minimalism as a style choice; it is the absence of anything competing with the numbers.

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

Settled with the user on 2026-08-31, before Task 1.4.3 began. Three were reversed on 2026-09-10 after the recommendations two sections below; each is shown in its current form with the reversal noted.

1. **Light theme only in V1.** Unchanged. Built directly rather than derived from a dark one — see [_The dark-theme reversal_](#the-dark-theme-reversal) below. The `[data-theme]` mechanism ships and the second palette does not.
2. ~~**Neutral chrome, no brand accent.**~~ → **One identity accent, scoped by file.** Reversed 2026-09-10. The chrome carries a crimson accent in **four positions and no others**; everything else is achromatic, and **colour attached to a number still means market meaning only**. See [_Colour, and the two rules about it_](#colour-and-the-two-rules-about-it).
3. ~~**System font stack, no webfont.**~~ → **Three self-hosted variable faces.** Reversed 2026-09-10. Nothing is fetched from a third party; the files ship in the artefact.
4. **Colour is never the sole encoding of anything.** Unchanged, and unconditional. It is an accessibility property rather than an aesthetic one and it survives any restyle.

### What decisions 2 and 3 cost while they stood, and what replaced them

Together they removed both of the usual carriers of visual identity — a brand hue and a distinctive typeface — and **what was left was structure**: the ground against white cards, the hairline rules, the 2px radius, the uppercase letterspaced micro-labels, the underline tab indicator, the right-aligned tabular numerals, and the whitespace around them. That worked, in the sense that the result was legibly institutional rather than generic. What it could not do was pass tests 3 and 4 of _The bar_, because a design with one channel has nothing to spend on a moment.

The refresh added two channels and **kept every structural idiom in that list**. That is the thing to understand before changing anything here: the typography and the accent did not replace the structure, they joined it. Softening a hairline "now that there is a typeface" undoes both.

### Each decision against the bar, with a recommendation — 2026-09-05

_Kept as written. All three recommendations were taken on 2026-09-10; the fourth was left with the user._

**Decision 4 — colour is never the sole encoding — is kept unconditionally.** It is an accessibility property rather than an aesthetic one, it survives any restyle, and the measurement behind it stands: the two price directions differ by **1.05:1 in greyscale**, so hue is doing all the work and something else has to carry the meaning. Nothing about raising the visual bar touches it.

**Decision 3 — system font stack, no webfont — is the one to reverse first.** Typography is the single highest-leverage change available and it is the reason a screen reads as designed rather than defaulted: the system stack is, definitionally, what every undesigned page already uses. A financial instrument wants a text face with real character and a numeric face with true tabular figures, and the cost is one or two self-hosted files plus a loading strategy. **Recommended: reverse.** Self-hosted rather than fetched, so it survives the deployed CSP and adds no third-party origin.

**Decision 2 — neutral chrome, no brand accent — is under review, and it is reconcilable rather than binary.** Its purpose is that colour means something: an accent hue competing with the price and anomaly palettes would make the market colours ambiguous, which is a correctness problem rather than a taste one. But "no accent anywhere" is a stronger rule than that purpose needs. **Recommended: admit an accent that is confined to the chrome** — navigation, focus, selection, brand marks — and hold the market palette untouched, with the boundary written down and checked the way the semantic tokens already are.

**Decision 1 — light theme only in V1 — is flagged rather than recommended, because it has already been reversed once at the user's instruction.** The case for revisiting is real: market practitioners overwhelmingly work in dark interfaces, a dark ground makes the price and anomaly palettes far more vivid, and it is what makes this kind of product photograph well for a portfolio. The case against is equally real — it doubles the surface every token, chart and canvas has to be correct in, and Epic 6's WebGL renderer reads its colours from these tokens. **This one is the user's to settle**, and the mechanism is already built.

**And one thing is missing rather than under review: there is nothing here about MOTION.** _Answered on 2026-09-06 — see [Motion](#motion--added-2026-09-06-by-task-244)._

## Surfaces and elevation

Four grounds. The ladder is **cool** and shallow: 4% of lightness separates the page from a panel, and the panel is told from the page by its hairline and its shadow rather than by a step in tone. A deeper ladder is how an interface ends up looking like a stack of grey boxes.

| Role               | Value     | Where                                                                                      |
| ------------------ | --------- | ------------------------------------------------------------------------------------------ |
| Page ground        | `#f6f7fa` | The application background. Cool, and noticeably not white                                 |
| Raised surface     | `#ffffff` | Cards, modules, panels, table bodies — the content sits here                               |
| Sunken / secondary | `#f0f2f6` | Table header rows, chips, status strips, disabled fields                                   |
| Inverse            | `#21242a` | The **one** thing that reverses out: a selected control. Ink on it is `#eef0f5` at 13.64:1 |

**The warm ladder is gone and its loss is deliberate.** `#f4f3ee` existed to give an achromatic interface some character; the interface is no longer achromatic, and a warm ground under Inter and a crimson mark reads as two design languages sharing a page.

**The inverse ground is near-black rather than the accent.** Selection is not brand, and an interface where the selected thing is crimson has spent its loudest colour on its least interesting statement.

Elevation is **ground contrast, a hairline and a shadow you cannot quite see**:

```
--elevation-panel:    0 1px 2px rgb(16 20 28 / 5%)

--elevation-floating: 0 6px 14px rgb(16 20 28 / 8%),
                      0 1px  2px rgb(16 20 28 / 4%),
                      0 0    0 1px rgb(16 20 28 / 4%)
```

The panel shadow is new, and it is a consequence of the border going grey: the pre-refresh idiom was "ground contrast plus a **near-black** hairline, never a shadow", and that idiom worked _because_ the hairline was near-black. Note the floating shadow's third line — a 1px spread ring standing in for a border. Even the floating case keeps its hairline.

## Ink and rules

| Role           | Value     | Notes                                                                  |
| -------------- | --------- | ---------------------------------------------------------------------- |
| Primary text   | `#14171c` | Near-black, cool. **Never `#000000`** — pure black reads as harsh here |
| Secondary text | `#5b5e66` | Labels, metadata, captions. 6.05:1 on the page ground                  |
| Disabled text  | `#9ba0aa` | Fails contrast deliberately; disabled content must read as unavailable |
| Inverse text   | `#eef0f5` | On the inverse ground only                                             |

**Three rule weights, and choosing between them is the most consequential styling decision in this language.**

| Token             | Value     | For                                                                                                                                                  |
| ----------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--rule-strong`   | `#14171c` | **Structure**: under the chrome, under a table head, over a group band, under a masthead, the 2px bar on the current tab, the left edge of a callout |
| `--rule-hairline` | `#e2e5ec` | The **ordinary** border: panels, controls, inputs, chips. The default                                                                                |
| `--rule-soft`     | `#eef0f4` | **Repeated** dividers — rows inside a long table — where the hairline would stripe                                                                   |

**The near-black rule is still the single most distinctive idiom here and it is still the easiest to soften by accident**; what changed is where it belongs. Before the refresh it wrapped every panel, which works on a screen with one panel and reads as a cage on a screen with twelve. Reserved for structure it keeps its whole effect and lands where a reader is re-orienting.

The trap this leaves, recorded because it has already caught two stylesheets: the token **name** `--rule-hairline` kept its meaning and changed its value, so a rule that wanted the near-black and says `--rule-hairline` now renders grey, and nothing complains.

## Geometry

- **Radius: 0.** Square. Not a scale, not per-component. A rounded corner is a softening gesture, and square corners read as a _grid_, which is what a dense table of figures is. The token still exists, so reversing this is one line
- **Border width: 1px.** Always. 2px is a focus ring or a structural marker, not a border
- **Circles** are the sole exception, for status dots only, and are written as `50%` at the two places that need one
- **Density is desktop-first.** PRODUCT_SPEC.md §3 gives substantial screen real estate, and this is analyst tooling. Rows are tight; the space goes _around_ content blocks rather than inside them
- **The measure is 96rem**, centred. Wide, because this product is a dense table and a graph rather than an article

### Focus

Focus is **achromatic, and it stayed achromatic through a refresh that introduced an accent** — which is a decision rather than an oversight. A crimson focus ring on a page where crimson means "this is MarketPulse" makes the accent mean two things, and the second is invisible to anyone with a red-green deficiency.

It is a **2px `#14171c` outline with a 2px offset**, on every interactive element, declared once globally in `base.css`, and never removed. This is the one place the "1px always" rule is deliberately broken, because a 1px focus ring against a 1px border is not a state change anybody can see. It is high contrast on all four grounds, and it does not depend on colour perception — one fewer thing for Epic 15's accessibility review to find.

## Spacing

A **4px grid**:

```
4   8   12   16   20   24   40
```

Note the gap between 24 and 40 and the absence of 32 — the reference jumps. That gap is real and it is what produces the airy separation between modules on an otherwise dense page. Keep the ladder short rather than filling it in.

**Control heights are tokens, not prose**, since the first real control shipped:

| Token                 | Value | Use                                            |
| --------------------- | ----- | ---------------------------------------------- |
| `--control-height`    | 36px  | The default: buttons, inputs, selects          |
| `--control-height-sm` | 28px  | Inline, toolbar, dense contexts                |
| `--app-header-height` | 56px  | The masthead, and every sticky offset under it |

A button, an input and a select that disagree by 2px turn a toolbar into a ransom note. That is what these are for.

## Typography

**Three faces, three jobs, self-hosted.** `fonts.css` declares them; nothing is fetched from a third party.

| Token            | Face                    | For                                                                                                   |
| ---------------- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `--font-display` | Hanken Grotesk Variable | Anything that **names** something: titles, panel headings, the wordmark, micro-labels                 |
| `--font-sans`    | Inter Variable          | **Prose and interface text**: labels, buttons, descriptions                                           |
| `--font-data`    | JetBrains Mono Variable | **Figures and identifiers**: prices, changes, volumes, tickers, timestamps, correlation ids, commands |

Each stack names real fallbacks with comparable metrics rather than ending at a bare `sans-serif`: a variable webfont is one round trip away on a cold load and `font-display: swap` means the fallback is what a user reads for that frame.

Only **latin, upright, variable weight** is referenced — the packages' own stylesheets cover nine subsets and both slants, which is 1.9 MB of woff2 for an application whose entire text is English. Adding italics or a second subset is a `url()` in `fonts.css`, and forgetting one is silent: the browser synthesises an oblique and nobody notices until it is compared against the real thing.

### Scale

| Size | Line height | Role                                                    |
| ---- | ----------- | ------------------------------------------------------- |
| 40   | 44          | Display — a single headline figure, sparingly           |
| 24   | 30          | Page title                                              |
| 18   | 26          | Panel and section heading                               |
| 15   | 22          | **Prose** — a paragraph somebody reads to the end of    |
| 13   | 18          | **Dense content — tables, rows, the product's default** |
| 11   | 16          | Micro-labels, metadata, captions                        |
| 20   | 26          | The metric figure — a headline number in a metric strip |

13px is where this product actually lives, and the refresh moved it there from 14: 13/18 is the size a professional market interface sets its tables at. 15px stays for prose, because a page's opening sentence is read rather than scanned.

Four weights — 400, 500, 600, 700 — where there used to be two. **Weight is the cheapest hierarchy there is**, and 500 is the one to reach for on a data cell that should come forward without shouting.

Tracking: `-0.01em` at display and heading sizes (a face designed for 13px opens up at 24px and reads loose without it); `0.08em` on micro-labels.

### The weight-300 divergence — resolved 2026-09-10

_Recorded 2026-08-31:_ the reference leaned hard on weight 300, system stacks do not reliably have a 300, and so the weights were 400 and 600 with hierarchy carried by size and grey. The note ended: _"If the light headings are later judged essential, the fix is a self-hosted variable font and it is a contained change."_

That is what happened. The faces are variable, every weight from 100 to 900 is available, and the fix was as contained as predicted — a token value and three font files. The refresh did **not** take the light headings: with a display face carrying the voice, bold headings against Inter body text separate better than light ones, and a 300-weight heading in a dense instrument reads as a marketing page.

### The data face, and the rule that reversed

_2026-09-06 (Task 2.4.4):_ a monospace family was added for one category of string — a value somebody is expected to transcribe or type back — with the rule **"this is not for numbers in tables"**, because tabular figures already fix column alignment and reaching for mono to make a column look technical was the failure that rule feared.

_2026-09-10:_ **reversed.** Tabular figures make a column _align_; a monospaced face makes a column **scan** — every glyph on one rhythm, so a price, a volume and a timestamp in adjacent columns share one grid instead of three. This is the strongest single signal that a screen is an instrument. What survives of the old rule is its real content: **the data face is for values, never for prose.** A sentence set in JetBrains Mono is a terminal, not a product.

### Numerals

**`font-variant-numeric: tabular-nums` is a token-level decision, not a per-component fix**, and it is set on `body`. Every digit that appears in a column must occupy the same width, or the column jitters on every tick. Epic 3 updates these continuously.

Numeric columns are **right-aligned**, always. A right-aligned tabular column aligns decimal points for free.

## Structural idioms

These are what a screenshot shows and a stylesheet does not. They are the identity, and the refresh kept every one of them.

- **Micro-labels are uppercase, letterspaced, 11px and grey.** `MARKET FEED`, `LAST CLOSE`, `SYMBOL`. This is the idiom that most says "institutional application"; a sentence-case grey label does not read the same way
- **A selected tab is an underline**, never a filled pill, never a rounded background. It is a 2px bar in the accent, paired with a weight change so that colour is not the only encoding
- **A panel's heading sits over a near-black rule.** This is the most common piece of structure in the product and the thing that makes a panel read as a readout rather than a card
- **A table's head is sunken, uppercase and sits over the same rule**; groups inside it are banded with a sunken ground and a 2px rule above
- **Links inside prose are text** — underline and weight, plus the accent. A link that is _only_ coloured is a link half the audience reads as plain text
- **Actions are small, uppercase and quiet.** A control's label is set in the micro-label idiom, which is what makes these read as instrument controls rather than as web buttons
- **A metric strip separates its figures with a vertical hairline**, not with whitespace: three figures separated by space alone read as one sentence broken up
- **Modules are white panels on the cool ground**, laid out on a grid — a module spans one, two or three columns rather than being free-form

### Controls

Two heights (see [Spacing](#spacing)), and three button variants:

| Variant     | Look                                  | For                                                                                   |
| ----------- | ------------------------------------- | ------------------------------------------------------------------------------------- |
| `primary`   | Filled `--brand-fill`, white label    | _The_ action on a screen. Two of them means there is no primary action                |
| `secondary` | Hairline box on the raised ground     | Every ordinary action. The default                                                    |
| `quiet`     | No border and no ground until hovered | Controls inside dense content, where a bordered box per row turns a table into a form |

There is deliberately **no `danger` variant**: it would want red, red means price-down on every screen, and V1 is a read-only analytical tool with nothing to destroy.

**Input fields were not built until 2026-09-11**, and that was deliberate rather than an omission — Story 2.11 is the first screen with a search field, and a control designed against no consumer is a control designed against a guess. The 2026-08-31 specification for them was: label _above_ the field at micro-label size, never a placeholder; bordered or underlined; and **seven states — Empty, Filled, Hover, Focus, Error, Disabled, Locked** — where `Locked` (not editable by this user) is distinct from `Disabled` (temporarily unavailable) and looks different.

**Built 2026-09-11 by Task 2.11.3 as `TextField`, and the specification was implemented with three changes**, each argued in the component's own header and in [`SEARCH-AND-SELECTION.md`](../../epic-02-security-universe-historical-data/story-11-security-search-and-selection/SEARCH-AND-SELECTION.md) §5:

- **Bordered**, not underlined. An underline on a page of hairline-bordered panels reads as a form field on a document and has no resting silhouette
- **Six states, not seven.** `Locked` is **dropped** until authentication exists: §37 excludes it, so the state has no consumer, and a state drawn against no consumer is exactly the guess that deferred fields in the first place. The trigger for the seventh is **the first field a person can see and may not edit**. Two states were added instead, for this consumer and every later one: _searching_ and _surface open_
- **The input text is set in `--font-data`**, the monospace face, because what a person types into the first consumer is predominantly a ticker. It is the single detail that most makes a field read as a command line rather than as a web form, and the cost — a typed company name is also in mono — was accepted rather than overlooked

Two things the field could not settle by itself, both recorded because the next control meets them:

- The resting border is `--rule-hairline` and **not** the 2px near-black the design deliverable drew. A resting border of the focus ring's own weight and colour leaves a field with no visible focus state
- **A composite control cannot use the global focus ring unaltered**, and that is the first escalation this layer has had. The element a browser focuses is the bare `<input>` inside the box, so the token's outline lands _inside_ the control. `a11y.module.css` now carries `focusRingHost`/`focusRingSource`, which hand the ring — the same three tokens, unchanged — from the focused element to the box that is the control. It is shared rather than local because Story 2.13's window control and Epic 8's picker meet the identical problem

## Colour, and the two rules about it

Colour lives in exactly two files, and **which file a colour is declared in is what defines its scope**.

### `market.css` — colour with market meaning

| Meaning      | Value                             | on `#ffffff` | on `#f6f7fa` | Notes                                       |
| ------------ | --------------------------------- | ------------ | ------------ | ------------------------------------------- |
| Positive     | `#046a38`                         | 6.72         | 6.28         | Emerald. Re-picked at the refresh           |
| Negative     | `#ba1a1a`                         | 6.46         | 6.03         | Paired with the green, not picked beside it |
| Anomaly ramp | `#f0dda4` · `#e2b544` · `#c08a12` | —            | —            | **Fills, never text, at any size**          |
| Neutral fill | `#e8eaef`                         | —            | —            | Under a `normal` anomaly band               |

The green and the red are within 0.25 of each other so that neither direction of a price move shouts louder than the other. Ink on the amber ramp is `--ink-primary` at 13.33 / 9.35 / 5.89.

### `brand.css` — the identity accent, and its scope is exhaustive

| Token          | Value     | Notes                                                              |
| -------------- | --------- | ------------------------------------------------------------------ |
| `--brand-ink`  | `#a20000` | 8.28 on white, 7.73 on the page ground. **Text** colour            |
| `--brand-fill` | `#d00000` | White ink on it measures 5.70. **Fill** colour, never a foreground |
| `--brand-wash` | `#ffe9e5` | A tinted ground; ink on it stays achromatic                        |

**The accent may appear in four places and nowhere else:** the mark beside the wordmark, the 2px bar under the current navigation tab, a primary button, and a link inside prose. **It never touches a datum** — not a price, a change, a volume, a ticker, a score or a status.

That scope is not tidiness. The accent is a hair from `--price-negative`, and on a screen where a number can be red because the market fell, a second red meaning "MarketPulse" is a coin flip for the reader. The reference design breaks this rule in exactly one place — it sets the benchmark ETF's ticker in brand crimson — and on a day SPY is down that cell is red for two unrelated reasons at once.

**The reversal trigger is a fifth position.** At that point the rule needs a lint rule, or the accent needs a hue that cannot be confused with a price move.

### The rule that outranks every value above

**Colour is never the sole encoding.** A negative change is red **and** carries its sign **and** a glyph; a positive one is green and does the same. An anomaly band is a fill **and** a written band name. A feed status is a colour **and** a marker silhouette. The current tab is crimson **and** heavier **and** underlined.

The measurement behind it, re-taken against the refreshed palette: under `grayscale(1)` the positive green and the negative red differ by **1.04:1**. They are the same tone. Hue is the whole of the difference, which is exactly what this rule says cannot be relied on. Roughly one man in twelve has a red-green deficiency and this product's primary signal is the direction of a price move.

### The divergences taken, recorded here because this document is the reference

**2026-09-06 (Task 1.4.4):** the reference's `#498100` measured 4.27 on the warm page ground — a fail against 4.5 exactly where a price column sits — so the green shipped as `#427400`, the same hue at 90% brightness. The alternative, constraining positive values to white surfaces, was rejected as a rule with no enforcement.

**2026-09-10 (the refresh):** that olive was replaced by `#046a38`. Not because it failed — it measured 5.26 on the new ground — but because it belonged to the ground it was picked against: an olive reads as a highlighter against a cool grey, and 5.26 was always the thinnest margin in the file. The negative red moved from `#c81219` to `#ba1a1a` at the same time, to pair with it.

## Motion — added 2026-09-06 by Task 2.4.4

**This document said nothing at all about motion until this section existed**, which for a live market application was the largest gap in it: it specifies colour, ink, geometry and spacing to the pixel, and had no opinion on what happens when a number changes or data arrives. That is why test 4 of _The bar_ — **does it feel alive?** — failed outright on every screen built before it.

What is here is a **thin first cut**, not a system, and the restraint is the decision rather than a shortfall.

| Token                      | Value                     | For                              |
| -------------------------- | ------------------------- | -------------------------------- |
| `--motion-duration-quick`  | 120ms                     | a state change under the pointer |
| `--motion-duration-settle` | 240ms                     | content arriving                 |
| `--motion-ease-standard`   | `cubic-bezier(0.2,0,0,1)` | both                             |

One easing, and it is asymmetric on purpose: fast out of the gate and slow into rest, which reads as something coming to a stop rather than something being tweened.

### Two rules, and the second is the one that will be argued with

**`prefers-reduced-motion` is answered here, once, at the token layer** — the durations resolve to `0ms` under the preference, so a consumer that reads the tokens honours it by construction and a consumer that hard-codes `240ms` is the only way to get it wrong. A per-component media query is a thing each author has to remember and whose failure is silent: the animation simply plays for somebody who asked it not to. Zero rather than "smaller", because a transition of `0ms` still ends in the same final state and an animation of `0ms` does not run — nothing disappears and nothing is left half-played.

**Motion must never make a number harder to read.** A value that fades or slides while an analyst is reading it is worse than one that changes instantly. This is the constraint that makes a market application's motion vocabulary genuinely hard, and it is why the set above is deliberately small.

### What is deliberately not decided here

**Epic 3 owns the full vocabulary**, and waiting is the decision rather than a deferral. The hard question in this product is what should happen when a **price** changes on screen, and that has to be answered against real moving numbers. A vocabulary settled against the first screen that needed any — a table that arrives once and then sits still — would be a vocabulary designed for the easy case and then inherited by the hard one.

So: nothing here about a value updating, nothing about a row entering or leaving a live list, nothing about a chart redrawing, and no third duration. Add those against something that actually moves.

## What this is not

Stated explicitly, because each one is a thing somebody will otherwise add in good faith.

- **No second accent hue.** One crimson, four positions, chrome only. A colour proposed for anything that is neither market data nor one of those four positions is answered with grey
- **No accent on a datum**, ever. That includes a "highlighted" row, a "featured" ticker and a brand-coloured benchmark
- **No third-party font request.** The faces ship in the artefact; a `<link>` to a font CDN is a second origin in the critical path
- **No dark theme in V1.** The mechanism is built so a second palette is a values-only swap; the palette is not
- **No shadows as elevation.** Ground contrast, a hairline, and a shadow you cannot quite see
- **No radius scale.** Zero
- **No icon beyond the closed set.** Adding one is an edit to `Icon.tsx`, which is the moment somebody asks whether the interface needs another symbol. That moment has happened once: the set was five from the refresh until **2026-09-11**, when Task 2.11.3 added `magnifier` for `TextField`. It is **six**, and the seventh needs its own argument in its own task rather than citing that one

## The dark-theme reversal

Story 1.4 was written with **"dark theme is the primary theme for a market-monitoring surface, not an afterthought"** as a selection constraint, and Task 1.4.3 instructed the author to build the dark palette first and derive any light theme from it. That was reversed on **2026-08-31**, before either task ran.

The reason is the same shape as the reversal that took the component library from Radix to Base UI a day earlier: **a constraint arrived that no spike could have produced.** The dark-primary constraint was a reasonable inference about market-monitoring software in general; the target here is a specific class of application, and that class is light. No measurement was going to discover that.

What the reversal costs is small, and it is worth being precise about why. Task 1.4.1's spike rendered its dense numeric row against a dark ground, but **its measurements are theme-independent** — module counts and bundle weights do not change with a palette — so the component-library decision stands untouched. Task 1.4.2's pipeline is a stylesheet reaching the browser and cares about no colour at all. The reversal lands entirely on tasks that had not started.

One thing genuinely improves. Task 1.4.3 flagged that `index.html` sets no `color-scheme`, so form controls, scrollbars and the pre-paint background are the browser's light defaults — "a dark application on a white flash". That problem disappears; what remains is declaring `color-scheme: light` so the light defaults are a stated choice rather than a coincidence.

## Sources

Three, and they were treated differently.

- **A live institutional wealth-management site** (2026-08-31), read through computed styles rather than by eye: the surfaces, ink, radius, shadow, spacing and type values in the original version of this document were a census of what that page actually renders, not an estimate from a screenshot
- **Four styleguide and application-mockup screenshots** supplied by the user, which carry what a marketing page cannot: the named palette with its positive/negative separation, the multi-width module grid, the control heights and the seven-state matrix, and the structural idioms above
- **`story-10-design.html`** (2026-09-10), a Tailwind/Material mock of the Security Explorer supplied by the user and the input to the refresh. It is a **reference and not a specification**: three of its decisions were taken, one was narrowed and two were declined, and [ADR 0022](../../../docs/adr/0022-the-design-refresh-three-typefaces-an-identity-accent-and-what-a-token-change-certifies.md) says which is which and why

The institution is deliberately not named here or anywhere else in this repository, at the user's instruction. Nothing in this document depends on knowing which one it is — the values are values, and the aesthetic is a class of application rather than a brand.
