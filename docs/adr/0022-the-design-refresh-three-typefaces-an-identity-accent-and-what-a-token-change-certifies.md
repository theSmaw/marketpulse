# ADR 0022 — The design refresh: three typefaces, an identity accent, and what a token change certifies

**Status:** Accepted
**Date:** 2026-09-10
**Delivered by:** A design refresh spanning the token layer, six new components and every screen

## Context

The visual language shipped in Story 1.4 was settled on 2026-08-31 under four constraints
that were, taken together, a decision to have **no visual identity beyond structure**:
light theme only, neutral chrome with no brand accent, the system font stack with no
webfont, and colour never the sole encoding of anything. ADR 0004 records the consequence
in its own words — "the product's identity is entirely structural" — and `tokens.css`
recorded the cost beside the token it fell on: with only the system stack available, the
reference's light headings could not be used and hierarchy had to be carried by size and
grey alone.

Six stories later the product has real screens: a chrome, a 518-row table with sector
bands and real prices, a bar-series panel, four routes. That is enough surface to see
what the constraint actually bought and what it cost, and the answer was one-sided. The
structure was doing its job — the sector bands, the hairlines, the micro-labels — and
there was **nothing else**. Every screen was correct, dense, legible, and looked like a
well-made internal tool.

`CLAUDE.md`'s standing instruction is stronger than that: the UI "must excite the people
who see it and must never read as old-fashioned, basic, or like a default admin panel",
and four tests a stranger can apply to a screenshot — would they believe it is a real
funded product; does it look designed rather than defaulted; is there a moment in it worth
showing somebody; does it feel alive. A design with one channel passes the first two and
cannot reach the last two.

The refresh was driven by a reference design (`planning/epic-02-…/story-10-…/story-10-design.html`),
a Tailwind/Material mock of the Security Explorer carrying three typefaces, a crimson
brand hue, a sticky tabbed masthead, sector accordions and a filter toolbar. **It is a
reference and not a specification**, and three of its decisions were taken, one was
narrowed and two were declined; each is below.

## Decisions

### 1. Three self-hosted typefaces, reversing "the system font stack, no webfont"

Hanken Grotesk for anything that names something, Inter for prose and interface text,
JetBrains Mono for figures and identifiers. `--font-display`, `--font-sans`, `--font-data`.

The reversal is deliberate and its argument is the one above: a product whose identity is
_entirely_ structural has exactly one channel, and the structure had already been copied
from the reference this design language was derived from. Three faces with genuinely
different jobs is a second channel that costs nothing at runtime and cannot be mistaken
for decoration — a reader can tell a _value_ from a _name_ from a _sentence_ at a glance,
which is a functional property of a dense interface rather than a stylistic one.

**They are self-hosted `@fontsource-variable` packages, not a Google Fonts `<link>`**,
which is what the reference does. Three reasons, all properties of this repository rather
than preferences: the browser suite and `pnpm preview` run with no network beyond
localhost, so a font that only arrives over the public internet is absent exactly where
the visual bar is checked; a third-party stylesheet is a second origin in the critical
path of a page whose backend is already a hop away; and the deployed frontend is a static
artefact with a build-time configuration, so anything it needs at runtime and does not
contain is a dependency nobody can roll back.

`fonts.css` declares the three `@font-face` rules by hand rather than importing the
packages' own stylesheets, because those cover nine subsets and both slants — 1.9 MB of
woff2 for an application whose entire text is English. Only latin-upright-variable is
referenced, so only three files are emitted. **The cost, stated rather than discovered:**
adding italics or a second subset is a `url()` in that file, and forgetting one is silent
— the browser synthesises an oblique and nobody notices until it is compared against the
real thing.

The old rule that mono is "not for numbers in tables" is reversed with it. Tabular figures
make a column _align_; a monospaced face makes a column **scan**, with a price, a volume
and a timestamp in adjacent columns sharing one rhythm instead of three. What survives of
the old rule is its real content: the data face is for values, never for prose.

### 2. An identity accent, scoped by which file it lives in

Crimson: `--brand-ink` (#a20000) for marks, rules and text, `--brand-fill` (#d00000) for
the one filled surface a screen is allowed. It lives in **`brand.css`**, a third global
stylesheet between `tokens.css` (achromatic structure) and `market.css` (colour with
market meaning), and its scope is exhaustive and written at the top of that file: the mark
beside the wordmark, the 2px bar under the current tab, a primary button, a link inside
prose. **Nothing else, and never a datum.**

The scope is not tidiness. This accent is a hair from `--price-negative`, and on a screen
where a number can be red because the market fell, a second red meaning "MarketPulse" is a
coin flip for the reader — worse than a coin flip for the roughly one man in twelve with a
red-green deficiency, who is already missing the green half of the pair. The reference
design breaks this rule in exactly one place, setting the benchmark ETF's ticker in the
brand crimson, and the break is instructive: on a day SPY is down, that cell is red for
two unrelated reasons at once.

**The alternative was a non-red accent** — indigo removes the collision outright. It was
declined because the collision is removable by scope, because a market instrument in blue
looks like every other dashboard, and because the scope rule is enforced by something a
reviewer can check: which file the token is declared in. A fourth file is where this goes
wrong, and there is no fourth file.

`market.css`'s promise was amended rather than weakened. It used to be "the only place
colour enters the interface"; it is now "the only place colour with **market** meaning
enters", and the claim that was always doing the work — every colour attached to a number
comes from this file — is still exactly true.

### 3. The near-black rule became structural rather than the default border

`--rule-hairline` was #1c1c1c and every panel in the tree took it. It is now #e2e5ec — the
ordinary border — and the near-black moved to a new `--rule-strong`, which marks
**structure**: the edge under the chrome, the underline beneath a table's head, the 2px
bar over a sector band, the bar under a page's masthead.

This is the refresh's least obvious change and the one that decides whether the result
looks designed. A near-black box around every panel is an idiom that works when a screen
has one panel and reads as a cage when it has twelve — which is what the Security Explorer
became. Reserving it for structure keeps the idiom's whole effect (an instrument's readout
rather than a card) and spends it where a reader is actually re-orienting.

The token **name** was kept while its value changed, deliberately: `--rule-hairline` still
means "the ordinary 1px border", so nine consuming files needed no edit and only the
structural cases had to be re-marked by hand. The mirror of that is the trap it leaves —
a stylesheet that wanted the near-black and says `--rule-hairline` now renders grey and
nothing complains. Two were found this way and both are recorded where they were fixed.

### 4. A component layer, extracted from three copies rather than designed up front

Six new components: `Icon`, `Button`, `Badge`, `Panel`, `PageHeader`, `MetricStrip`. Each
was extracted from something the tree was already doing more than twice:

- `Button` from **three byte-identical retry controls** in `UniverseTable`,
  `BarSeriesPanel` and `ErrorFallback`. `BarSeriesPanel.module.css` had predicted this
  exactly — "three is where this repository extracts" — and named what must not travel
  with it: the red rule and the `role="alert"` belong to a render failure, not to a
  control.
- `Panel` from `Region`, `BarSeriesPanel`, three route modules and `UniverseTable`'s
  states, each drawing "white ground, one hairline, a heading" its own way.
- `PageHeader` from five route modules each rendering their own `<h1>` with its own
  margin, two of them with a micro-label above it at a different gap.

**What was deliberately not built**: a search field, a select, a filter chip. The
reference design has all three and Story 2.11 is the story that needs them.
`CLAUDE.md`'s "do not scaffold ahead of the current step" applies to a component library
exactly as it does to infrastructure, and a control with no consumer is a control designed
against a guess.

`Icon` is a closed union of five inline SVGs rather than an icon font or a package. The
argument is the same one: a package ships a component per glyph and a tree-shaking
promise, and the first person to import a sixth glyph does it without a decision. Adding an
icon here is an edit to a file, which is a moment where somebody asks whether the
interface needs another symbol.

### 5. What was taken from the reference, and what was declined

**Taken:** the three-face typography, the crimson identity, the tabbed masthead, the
sunken status strip, the square corners, the cool ground, the dense 13px table with its
sunken head and banded groups, the data face on tickers and figures.

**Narrowed:** the crimson, to the four chrome positions above (decision 2).

**Declined, with reasons:**

- **Collapsible sector accordions.** The reference makes each sector a disclosure. Our
  groups are `<tbody>` elements with `scope="rowgroup"` headings — semantically better,
  and collapsing them is a behaviour change to a component with 723 lines of tests, in a
  refresh whose subject is the design language. It is a Story 2.11 candidate, where
  filtering makes it worth having.
- **A search and filter toolbar.** Story 2.11, per decision 4.
- **The `<header>` element for a page masthead.** `PageHeader` renders a `<div>`, which
  looks like a semantic downgrade and is not: HTML scopes `<header>` out of the **banner**
  landmark when it is inside `<main>`, and the accessibility mapping used by the component
  tests does not implement that scoping, so `getByRole("banner")` returned two elements on
  every route. A real browser and axe scope it correctly — which means the alternative was
  an application that passes its browser suite and fails its component tests, with neither
  result wrong. The `<h1>` inside does all the structural work a screen reader navigates
  by.

## What a token change certifies, and what it does not

The refresh changed four stylesheets and re-skinned every screen in the application.
`pnpm verify` passed and so did all 35 browser tests, including three axe runs at three
viewports. **That is a narrower certificate than it looks, and the gaps are the same ones
`e2e/README.md` and `CLAUDE.md` already name:**

1. **No test in this repository can see a colour.** No stylesheet is applied in the
   component environment, so `getComputedStyle` returns nothing there by construction; and
   the browser suite must not assert colour, because under `grayscale(1)` this palette's
   two price directions are 1.05:1 apart. Every contrast figure in `tokens.css`,
   `brand.css` and `market.css` was computed by hand against the new grounds and is a
   **prose figure** — the class of claim `CLAUDE.md` says nothing regenerates.
2. **A green axe run is not accessibility coverage.** It is what it always was: a
   mechanical check that caught nothing here because the structure did not change.
3. **A CSS Module class-name typo is completely silent**, and this change touched
   twenty-odd stylesheets. What stands behind that is the workshop — every new component
   ships an `AllPermutations` grid — and `pnpm stories`, which now counts 21 components
   and 21 stories files.
4. **Nothing checks that the accent stayed in `brand.css`'s four positions.** The rule is
   written at the top of that file and enforced by review. The reversal trigger is a fifth
   position: at that point the rule needs a lint rule or the accent needs a different hue.

## Consequences

- `VISUAL-LANGUAGE.md` is rewritten rather than amended, and it says so at the top. It is
  the design input to `tokens.css` and a divergence from it is still a change to that
  document.
- ADR 0004 keeps its two decisions and gains two dated amendments. **The refresh is
  evidence for that ADR rather than against it**: re-skinning an entire application was
  four stylesheets and six components, with no build step, no library migration and no
  component rewritten to accommodate it.
- Three `@fontsource-variable` packages are the frontend's first runtime dependencies that
  are not React, the router or Base UI. They ship no install scripts, so `allowBuilds` is
  untouched.
- The product's default text size moved from 14px to 13px. That is a change to every
  screen at once and it is the one decision here that a future reader is most likely to
  want to re-take; it is a single token.
