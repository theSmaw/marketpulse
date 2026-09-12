# Visual language — MarketPulse

**Status:** Settled 2026-08-31 · **refreshed 2026-09-10** ([ADR 0022](../../../docs/adr/0022-the-design-refresh-three-typefaces-an-identity-accent-and-what-a-token-change-certifies.md)) · **reconciled to the design canvas 2026-09-11** ([ADR 0026](../../../docs/adr/0026-the-design-canvas-as-the-source-of-truth.md))
**Story:** [1.4 UI Component Library & Styling Conventions](STORY.md)
**Consumed by:** Tasks 1.4.3, 1.4.4, 1.4.5, 1.4.6 — and every screen since

This is the design input to the token layer. `tokens.css` turns it into CSS custom properties, `brand.css` and `market.css` layer the two kinds of colour over them, and the components in `src/components/` are built from it. It is not itself a decision record — it is the description of the look those files are aiming at, written down so that "does this match?" has an answer other than someone's memory of a screenshot.

**Treat a divergence from this document as a change to this document**, not as a local judgement call in a component. That is the whole reason it exists: a design language that lives in individual files stops being one after about six of them.

## This document is no longer the origin of the language — added 2026-09-11

**The `Component library for MarketPulse` design canvas is the source of truth.** It lives in Claude Design and is reached from this repository with the `DesignSync` tool; [ADR 0026](../../../docs/adr/0026-the-design-canvas-as-the-source-of-truth.md) records the decision and what it costs.

**It is at `https://claude.ai/design/p/727b5b14-fe78-47c1-9d9c-fb84b6ce5280`** — added 2026-09-11, because naming the canvas without its address meant every session had to ask for it. The last path segment is the `projectId` that `DesignSync` takes. **Do not go looking for it in `list_projects`**: that method filters to design-system projects and this one is not, so it comes back absent rather than listed, which reads exactly like "the canvas does not exist". ADR 0026 has the rest of the mechanics.

What that changes about how to read this file:

- **Where this file and the canvas disagree, the canvas wins and this file is wrong** — which is the opposite of the rule above, and the rule above still holds for everything _downstream_: a component still may not diverge from this document. The chain is canvas → this document → `tokens.css` → components, and each link is a change to the next.
- **There is one standing exception, and it is the only one.** Where a canvas value fails a measured accessibility floor, the _intent_ is adopted and the value is not, and the deviation is recorded with its measurement beside the token. This has happened three times already — the input boundary, the placeholder ink, and the validated tick's green. Each is written up where it lives rather than here.
- **This file keeps its arguments.** The canvas carries values; it does not carry the reasoning for them, and a value with no argument is the thing that gets "fixed" by the next person. Everything below that explains _why_ is still load-bearing, including the parts whose numbers have since moved.

## What the 2026-09-10 refresh changed, and why this document was rewritten rather than amended

Between 2026-08-31 and the refresh, three of the four decisions below were reversed. That is too much to carry as marginal notes — a reader following an amended document would have had to reconstruct the current language from a sequence of corrections — so the sections that describe **what the interface looks like today** were rewritten, and the sections that describe **how it got here** were kept intact and dated.

The refresh's own recommendations were already written in this document on 2026-09-05, in [_Each decision against the bar_](#each-decision-against-the-bar-with-a-recommendation--2026-09-05). All three were taken. What actually changed:

| Was (2026-08-31)                | Is (2026-09-10)                                                              |
| ------------------------------- | ---------------------------------------------------------------------------- |
| System font stack, no webfont   | **Two self-hosted variable faces**, three roles — display, sans, data        |
| No accent hue anywhere          | **One crimson accent, confined to four positions in the chrome**             |
| Warm ground (`#f4f3ee`)         | **Cool ground** (`#f8f9ff`)                                                  |
| Near-black border on every card | Near-black reserved for **structure**; panels take an ordinary grey hairline |
| Radius 2px                      | **Radius 0** — square                                                        |
| Default text size 14px          | **13px**                                                                     |
| Mono for identifiers only       | **The data face carries every figure and identifier**                        |

Decision 1 (light theme only) and decision 4 (colour is never the sole encoding) are unchanged.

## Intent, in one paragraph

MarketPulse should read as an **internal application at a large financial institution** — the kind of dense, sober, desktop tool an analyst has open all day — rather than as a consumer product or a modern SaaS dashboard. Concretely that means: white and cool off-white grounds, near-black text, hairline rules doing the work that borders and shadows do elsewhere, near-square corners, generous whitespace around genuinely dense numeric content, and **no decoration that does not carry information**. The aesthetic is restraint. It is not minimalism as a style choice; it is the absence of anything competing with the numbers.

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
| Page ground        | `#f8f9ff` | The application background. Cool, and noticeably not white                                 |
| Raised surface     | `#ffffff` | Cards, modules, panels, table bodies — the content sits here                               |
| Sunken / secondary | `#f2f3f9` | Table header rows, chips, status strips, disabled fields                                   |
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

| Role           | Value     | Notes                                                                                                            |
| -------------- | --------- | ---------------------------------------------------------------------------------------------------------------- |
| Primary text   | `#181c23` | Near-black, cool. **Never `#000000`** — pure black reads as harsh here                                           |
| Secondary text | `#43474f` | Labels, metadata, captions. 8.87:1 on the page ground                                                            |
| Disabled text  | `#74777f` | 4.26:1 on the page ground — under the floor deliberately, and only ever on disabled content, which 1.4.3 exempts |
| Inverse text   | `#eef0f5` | On the inverse ground only                                                                                       |

**Three rule weights, and choosing between them is the most consequential styling decision in this language.**

| Token             | Value     | For                                                                                                                                                  |
| ----------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--rule-strong`   | `#181c23` | **Structure**: under the chrome, under a table head, over a group band, under a masthead, the 2px bar on the current tab, the left edge of a callout |
| `--rule-hairline` | `#e2e4ed` | The **ordinary** border: panels, controls, inputs, chips. The default                                                                                |
| `--rule-soft`     | `#eef0f4` | **Repeated** dividers — rows inside a long table — where the hairline would stripe                                                                   |

**The near-black rule is still the single most distinctive idiom here and it is still the easiest to soften by accident**; what changed is where it belongs. Before the refresh it wrapped every panel, which works on a screen with one panel and reads as a cage on a screen with twelve. Reserved for structure it keeps its whole effect and lands where a reader is re-orienting.

The trap this leaves, recorded because it has already caught two stylesheets: the token **name** `--rule-hairline` kept its meaning and changed its value, so a rule that wanted the near-black and says `--rule-hairline` now renders grey, and nothing complains.

## Geometry

- **Radius: 3px** since 2026-09-11, adopting the value in the `Component library for MarketPulse` design canvas. It was 2px before the 2026 refresh and 0 from the refresh until then, and the argument for zero is worth keeping because it is still the argument: a rounded corner is a softening gesture, and square corners read as a _grid_, which is what a dense table of figures is. **What decided the move is a measurement rather than a preference** — at 3px the dense table is visually unchanged, because nothing in it is a rounded rectangle. The radius reaches controls, chips and panels only, so the grid reading survives and the hardest edge comes off the things a person touches. Still one value, not a scale, not per-component. See ADR 0022's dated amendment
- **Border width: 1px.** Always. 2px is a focus ring or a structural marker, not a border
- **Circles** are the sole exception, for status dots only, and are written as `50%` at the two places that need one
- **Density is desktop-first.** PRODUCT_SPEC.md §3 gives substantial screen real estate, and this is analyst tooling. Rows are tight; the space goes _around_ content blocks rather than inside them
- **The measure is 96rem**, centred. Wide, because this product is a dense table and a graph rather than an article

### Focus

Focus is **achromatic, and it stayed achromatic through a refresh that introduced an accent** — which is a decision rather than an oversight. A crimson focus ring on a page where crimson means "this is MarketPulse" makes the accent mean two things, and the second is invisible to anyone with a red-green deficiency.

It is a **2px `#181c23` outline with a 2px offset**, on every interactive element, declared once globally in `base.css`, and never removed. This is the one place the "1px always" rule is deliberately broken, because a 1px focus ring against a 1px border is not a state change anybody can see. It is high contrast on all four grounds, and it does not depend on colour perception — one fewer thing for Epic 15's accessibility review to find.

## Spacing

A **4px grid**:

```
4   8   12   16   20   24   40
```

Note the gap between 24 and 40 and the absence of 32 — the reference jumps. That gap is real and it is what produces the airy separation between modules on an otherwise dense page. Keep the ladder short rather than filling it in.

**Control heights are tokens, not prose**, since the first real control shipped:

| Token                 | Value | Use                                            |
| --------------------- | ----- | ---------------------------------------------- |
| `--control-height`    | 34px  | The default: buttons, inputs, selects          |
| `--control-height-sm` | 28px  | Inline, toolbar, dense contexts                |
| `--app-header-height` | 56px  | The masthead, and every sticky offset under it |

A button, an input and a select that disagree by 2px turn a toolbar into a ransom note. That is what these are for.

## Typography

**Two faces, three jobs, self-hosted.** `fonts.css` declares them; nothing is fetched from a third party. `--font-display` and `--font-sans` resolve to the same stack since 2026-09-11 — both tokens are kept, because the roles are still three and a third face returning should be a value change rather than an audit.

| Token            | Face                    | For                                                                                                   |
| ---------------- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `--font-display` | Hanken Grotesk Variable | Anything that **names** something: titles, panel headings, the wordmark, micro-labels                 |
| `--font-sans`    | Hanken Grotesk Variable | **Prose and interface text**: labels, buttons, descriptions                                           |
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

### The combobox and its result surface — added 2026-09-11 by Task 2.11.4

The field's first real consumer, and the product's first interactive control. The canvas section is `03.1 · Security search`; what follows is the part of it that is language rather than screen, because the next three controls inherit it.

**The surface is welded to the field, not floated near it.** It continues the field's focused border (`--rule-strong`) with no top edge of its own, squares the join by having `TextField`'s `surfaceOpen` flatten its lower corners, and carries the only shadow in this language so far. Two boxes stacked with a gap read as two things; this reads as one control that has opened.

**Two row states that must not be confused, and one tone is not enough for both.** Hover is `--surface-page`. The active option — the one Enter opens — is a tone _and_ a 2px inset bar. This is not decoration: a person using a mouse and the keyboard together has a hovered row and an active row on screen at the same moment, and if the only difference is a shade, pressing Enter is a guess. It is also why the active row is not simply "the hovered row" — DOM focus never leaves the input, so the active row is a pointer (`aria-activedescendant`), and the drawing has to say which of the two the keyboard will act on.

**Emphasis on a matched substring is weight and ink. Never colour, never a wash.** 700 on `--ink-primary` against the row's resting 400/500 on `--ink-secondary`. The crimson accent has four positions in the chrome and none of them is a datum, and a coloured background behind part of a company name is a colour-on-data decision that has had no argument made for it. This is the general rule stated in [The rule that outranks every value above](#the-rule-that-outranks-every-value-above) applied to text: **standing out is a job for weight and hierarchy**.

One consequence worth carrying forward, because it is easy to get backwards: **emphasising inside a monospace identifier needs the _unmatched_ part to recede**, not the matched part to advance. A symbol is already set at `--ink-primary` 600, so 700 on the same ink is invisible at 13px; the tail drops to `--ink-secondary` 500 instead. A name is already secondary, so there the mark alone carries the step.

**One divergence from the canvas, and it is a mechanism rather than a preference.** The canvas writes the surface's footer as `Closes as of 4 Sep`. The shipped footer reads `Closes as of 2026-09-04`, because `Intl.DateTimeFormat` is confined by a `no-restricted-syntax` rule to `packages/shared/src/market-time.ts` — and `UniverseTable` already renders a session as its ISO date. A second date idiom, hand-rolled to avoid the rule, would be worse than the longer string. The intent is adopted, the format is not.

## Colour, and the two rules about it

Colour lives in exactly two files, and **which file a colour is declared in is what defines its scope**.

### `market.css` — colour with market meaning

| Meaning      | Value                             | on `#ffffff` | on `#f8f9ff` | Notes                              |
| ------------ | --------------------------------- | ------------ | ------------ | ---------------------------------- |
| Positive     | `#0f7b50`                         | 5.29         | 5.03         | From the design canvas, 2026-09-11 |
| Negative     | `#c5221f`                         | 5.80         | 5.52         | From the design canvas, 2026-09-11 |
| Anomaly ramp | `#f0dda4` · `#e2b544` · `#c08a12` | —            | —            | **Fills, never text, at any size** |
| Neutral fill | `#e8eaef`                         | —            | —            | Under a `normal` anomaly band      |

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

## The chart — added 2026-09-11 by Task 2.12.2

This document had no chart vocabulary at all until this section existed, and the product's first data visualisation is the screen `PRODUCT_SPEC.md` §38's demonstration runs through. The positions below were taken on the design canvas — `Price chart.dc.html`, the third file in the `Component library for MarketPulse` project — and the canvas is the source of truth for them ([ADR 0026](../../../docs/adr/0026-the-design-canvas-as-the-source-of-truth.md)). What this section adds is the reasoning the canvas cannot carry.

**The mechanism is settled elsewhere and is not reopened here.** [`CHARTING.md`](../../epic-02-security-universe-historical-data/story-12-price-chart/CHARTING.md) fixes a line of closes on a session-ordinal axis, hand-drawn in SVG with no library. The consequence for this document is that **there are no renderer defaults to diverge from** — every value below is a decision rather than an override.

### The frame is one rule

A near-black hairline along the **bottom** of the plot and nothing else: no left spine, no right spine, no top, no surrounding box. That is this language's existing structural idiom — `--rule-strong` under the chrome, under a table head, over a group band — doing the same job under a plot. A four-sided frame is the single most default-looking thing a chart can do.

The plot keeps the panel's own ground. A sunken plot inside a raised panel is a box drawn in tone instead of ink, and it drags every hairline down with it: the gridline measures 1.27:1 on white and 1.15:1 on sunken.

### The value scale sits on the right, in a gutter

Right rather than left, because right is where the latest price is — the current value, the last point of the line and the scale all land in the same place. Labels drawn _inside_ the plot were tried first and abandoned: at the measured 1,019 px region the topmost label sat on top of the series.

Every figure is in `--font-data` and therefore tabular by construction. Story 1.4 measured a 14.3 px spread on proportional numerals, and a y-axis that shimmers as values change width is the cheapest way to make a live chart feel broken.

### Gridlines are horizontal. The one vertical rule is the session seam

The ordinal axis puts Friday's last minute beside Monday's first and draws no gap, so nothing on the plot says a night passed. **The seam is where that fact is given back**: a dashed vertical rule at each session boundary, and the tick label there carries the date while everything between carries the time. It is the only vertical rule this chart draws.

Dashed rather than solid, and that is load-bearing: a solid vertical near-black rule inside a plot reads as _data_ — a threshold, a marker, an event. Dashes say chrome. And the seam is deliberately **louder** than a value gridline (1.70:1 against 1.27:1) because it carries more.

### The series line is achromatic, always

`--chart-series` is the near-black, at 1.5 px, whether the window rose or fell. Direction is not put on the one mark that is repeated 1,950 times, because that is the mark where the encoding problem is worst and the reader's ability to resolve it is least. 1.5 px rather than 1 or 2 was taken against both ends of the region range: at 1,019 px a 1 px stroke disappears against the grid, and at 342 px a 2 px stroke over 1,950 points is a solid mass.

### Direction without colour — the geometry is the first channel

A dashed horizontal rule sits at the window's **opening close**, and the area between the line and that rule is filled. **The side of the rule the line finishes on is the direction, drawn as geometry.** The fill's tint says the same thing again in colour and says nothing the geometry has not already said.

The measurement that forces that ordering, taken 2026-09-11:

| Pair                                              | Luminance ratio | In `grayscale(1)` |
| ------------------------------------------------- | --------------- | ----------------- |
| `--price-positive` / `--price-negative` (ink)     | 1.096:1         | 1.04:1            |
| `--price-positive-wash` / `--price-negative-wash` | 1.013:1         | **1.009:1**       |

The washes are, for practical purposes, **the same colour**. That is a stronger version of the finding already recorded above under _The rule that outranks every value above_, and it is why the tint here is explicitly decorative: cover it and the chart still says which way the window went, because the line finishes above or below the reference, because the reading carries a glyph and a sign, and because the headline says so in words.

**It is not an [ADR 0026](../../../docs/adr/0026-the-design-canvas-as-the-source-of-truth.md) exception.** A decorative fill has no contrast floor to fail, so nothing was overridden — the canvas value was adopted and a second channel was added beside it. The exception has still fired three times and not four.

**A flat window gets the neutral wash.** Three states, not two, exactly as the price trio already is: `--price-unchanged` is achromatic on every screen in this product, and a window that closed where it opened is not a green one.

**The identity accent stays off all of it.** `brand.css`'s crimson has four sanctioned positions in the chrome and a datum is not one of them; a crimson current-price line would be a fifth position and is a decision to escalate, not a detail to slip in.

### Partial coverage is drawn as space

The x-domain comes from what was _requested_, never from the bars held (`CHARTING.md` §6.2). The shortfall is therefore visible: a faintly sunken region at 1.107:1, a dashed vertical where the data stops, and the series **clipped** at that edge rather than drawn to the frame. It must not read as a failure — so no hatching, no warning colour, no icon — and it must not read as flat data, which is what the clip prevents.

### One crosshair, for both inputs

A vertical `--chart-crosshair` rule and a **white disc with a near-black ring** on the line, identical under the pointer and under keyboard focus. Two treatments would be two things to keep correct and a promise that the keyboard path is the lesser one.

The disc is hollow so the focus ring can land on it. Focus here is the existing global 2 px near-black outline at 2 px offset and **no new token**: a near-black ring around a near-black filled dot on a near-black line is invisible, and a white disc gives the outline something to sit outside of. The canvas's box-shadow ring was already declined in ADR 0026 because it vanishes in forced-colors mode.

### Density, and the chart never stops being a chart

| Region width | Plot height | What it shows                                                                                       |
| ------------ | ----------- | --------------------------------------------------------------------------------------------------- |
| ≥ 900 px     | 280 px      | 5 value gridlines; every seam labelled with its date, plus midday ticks between them                |
| 600 – 899 px | 280 px      | 4 gridlines; seam labels only — the midday ticks go first, because a date is worth more than a time |
| 400 – 599 px | 220 px      | 3 gridlines; seam rules stay, seam _labels_ reduce to the first and last date                       |
| < 400 px     | 220 px      | 3 gridlines, first and last date. **The axis never disappears**                                     |

The breakpoints are the **region's**, not the page's: the Price region is 1,019 px at a 1920 viewport and 342 px at 390 (`CHARTING.md` §2). A plot with no axis is a sparkline, and a sparkline is a different product.

### The tokens

Achromatic, structural and geometric values in `tokens.css`; anything carrying market meaning in `market.css`. Several chart values equal a chrome value today and are **still separately named**, which is the argument `--price-unchanged` and the `--service-*` trio already make in `market.css`: two values that coincide for different reasons must be able to move apart.

| Token                    | Value     | Notes                                                             |
| ------------------------ | --------- | ----------------------------------------------------------------- |
| `--chart-axis`           | `#181c23` | The one rule. Same value as `--rule-strong`                       |
| `--chart-grid`           | `#e2e4ed` | 1.27:1 on white; **1.11:1 where a wash passes under one**         |
| `--chart-seam`           | `#c4c6cf` | 1.70:1. The canvas's own `--mp-line-strong`, adopted here at last |
| `--chart-reference`      | `#74777f` | 4.48:1. The dashed rule at the opening close                      |
| `--chart-series`         | `#181c23` | The close line                                                    |
| `--chart-series-width`   | `1.5px`   |                                                                   |
| `--chart-crosshair`      | `#43474f` | 9.32:1 — quieter than the data it points at                       |
| `--chart-uncovered`      | `#f2f3f9` | 1.107:1 — the quietest mark in this language, deliberately        |
| `--chart-height`         | `280px`   |                                                                   |
| `--chart-height-compact` | `220px`   |                                                                   |
| `--chart-gutter`         | `56px`    | The value scale's width                                           |
| `--chart-gutter-compact` | `46px`    |                                                                   |
| `--chart-filing-lane`    | `14px`    | Added 2026-09-12 by Task 2.12.4 — the reserved lane below, named  |
| `--price-positive-wash`  | `#e6f2ec` | 1.15:1 on white; near-black on it measures 14.87                  |
| `--price-negative-wash`  | `#fbeae9` | 1.16:1 on white; near-black on it measures 14.68                  |
| `--price-unchanged-wash` | `#eef0f6` | A window that closed where it opened                              |

### What this section deliberately does not decide

- **Whether the high–low extent band ships.** That is [Task 2.12.5](../../epic-02-security-universe-historical-data/story-12-price-chart/TASK-05-what-a-session-did-and-direction-without-colour.md)'s. What was decided here is what it looks like if it does — `--price-unchanged-wash`, beneath the directional fill — and one finding taken by drawing it: **at `1m` a bar's high and low sit within a few hundredths of a percent of its close, so the envelope is a hairline around the line and is effectively invisible.** It earns its space at `1d`, which Story 2.13's window control is what brings.
- **Anything about motion.** The chart is on the list of things the Motion section above defers to Epic 3 on purpose, and a chart that animates its own first paint is decoration rather than a market moving.
- **The volume chart.** It inherits this axis and this frame, and deciding its bars before a price chart exists to place them under is the mistake Story 2.12's sequence was arranged to avoid.

### Room reserved for what arrives later

Stated rather than drawn, because three retrofits cost more than three sentences.

- **Epic 5's anomaly markers** — a 16 px lane inside the plot's _top_ padding, at the bar's x. Displaces nothing: the y-domain is already padded so the data never touches the frame, and the top half of that padding is the lane. It inherits the constraint that the amber ramp is a _fill behind a written band name_; on a plot there is no room for the name, so the marker carries the score as a number.
- **Epic 8's comparison series** — the same axes, y switched to normalised percent change, a legend above the plot beside the reading. **It displaces the wash**: one filled area cannot serve _n_ series, so the directional tint is a single-series treatment and is dropped the moment a second series arrives. The second channel there is stroke pattern — the subject stays solid, comparators are dashed and dotted — which survives greyscale where _n_ hues do not.
- **Epic 9's filing markers** — a 14 px lane _below_ the baseline and above the tick labels, outside the plot, because a filing is not a price. The gap between baseline and labels is reserved at 14 px from today rather than 6 px. **It became a token on 2026-09-12**, `--chart-filing-lane`, when Task 2.12.4 drew the first axis that had to spend it: reserved space that exists only as a number inside one component's stylesheet is reserved by nobody, and the volume chart inherits this axis. The hard part is inherited from `CHARTING.md` §3: most 8-Ks land after the close, an ordinal axis has no position for an instant between sessions, and those markers sit on the seam carrying their true timestamp in the label.
- **Epic 6's topology is not an inheritor of any of this.** `PRODUCT_SPEC.md` §27 commits it to Sigma.js/WebGL against a different problem.

## What this is not

Stated explicitly, because each one is a thing somebody will otherwise add in good faith.

- **No second _identity_ accent.** One crimson, four positions, chrome only. **Narrowed 2026-09-11 by [ADR 0025](../../../docs/adr/0025-the-agent-hue-a-second-accent-and-what-authorship-colour-certifies.md)**, which adopted the design canvas's agent hue: colour with **domain meaning** lives in its own scope, and there are now three such scopes — identity (`brand.css`), market meaning (`market.css`) and **authorship**, which is what the agent hue carries. A colour proposed for anything that is none of those is still answered with grey. The agent hue's token lands with its first consumer in Epic 10, never encodes confidence, never touches a datum, and is never the sole encoding
- **No accent on a datum**, ever. That includes a "highlighted" row, a "featured" ticker and a brand-coloured benchmark
- **No third-party font request.** The faces ship in the artefact; a `<link>` to a font CDN is a second origin in the critical path
- **No dark theme in V1.** The mechanism is built so a second palette is a values-only swap; the palette is not
- **No shadows as elevation.** Ground contrast, a hairline, and a shadow you cannot quite see
- **No radius scale.** One value, `--radius`, and it is 3px. A second radius — a "large" for panels, a "small" for chips — is the thing this forbids, not a non-zero value
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
- **The `Component library for MarketPulse` design canvas**, which has been the **source of truth** rather than a source since 2026-09-11 ([ADR 0026](../../../docs/adr/0026-the-design-canvas-as-the-source-of-truth.md)) — and is therefore listed here as the thing this document now follows rather than as one input among three. It is three files: `MarketPulse Design System.dc.html`, `Universe navigation.dc.html` (Task 2.11.8) and `Price chart.dc.html` (Task 2.12.2)
- **`story-10-design.html`** (2026-09-10), a Tailwind/Material mock of the Security Explorer supplied by the user and the input to the refresh. It is a **reference and not a specification**: three of its decisions were taken, one was narrowed and two were declined, and [ADR 0022](../../../docs/adr/0022-the-design-refresh-three-typefaces-an-identity-accent-and-what-a-token-change-certifies.md) says which is which and why

The institution is deliberately not named here or anywhere else in this repository, at the user's instruction. Nothing in this document depends on knowing which one it is — the values are values, and the aesthetic is a class of application rather than a brand.
