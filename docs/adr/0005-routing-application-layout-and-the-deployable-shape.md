# ADR 0005 — Routing, the application layout, and the shape the artefact deploys in

**Status:** Accepted
**Date:** 2026-08-31
**Delivered by:** Epic 1, Story 1.5 (Tasks 1.5.1–1.5.6)

## Context

ADR 0003 left the frontend as a single-page shell with no navigation, and
ADR 0004 gave it a design language and five components with nothing to place
them on. Story 1.5 is where the application acquires a shape: four routes for
PRODUCT_SPEC.md §8's four primary experiences, the persistent chrome around
them, and the desktop region structure §9 sketches.

Three constraints shaped the decisions more than the routing question itself:

- **Four routes, not fifty.** §8 names Market Overview, Investigation
  Workspace, Security Explorer and Market Replay. Anything whose value scales
  with route count is being bought at the wrong scale here
- **Desktop-first is a product constraint** (§3), and mobile UX is explicitly
  out of V1. That is permission to assume screen real estate, and not
  permission to break at 1280px
- **A failure must be contained to the region it happened in** (§36, and one of
  this epic's exit criteria). Regions are the boundaries that criterion needs,
  and they have to exist before Story 1.7 can put anything inside them

One property of the local toolchain sits underneath half of this document and
is stated once here because it makes two acceptance criteria untestable
locally. `vite` and `vite preview` answer **any** unmatched path with
`index.html` and a 200. So a router mounted on this machine deep-links
perfectly before anybody configures a host, and a not-found route renders
perfectly for the same reason — neither is evidence of anything.

## Decisions

### 1. React Router 8.3.1, in declarative mode, as a library and nothing else

Settled 2026-08-30 in Task 1.5.1 by mounting each candidate for real — a chrome
route with an `<Outlet/>`, an index route rendering the existing shell, a
`:symbol` route holding state, and a catch-all — then building, typechecking
and linting on the unmodified toolchain.

| Build                      | Modules | JS            | JS gzip       |
| -------------------------- | ------- | ------------- | ------------- |
| Baseline (ADR 0004)        | 193     | 300.09 kB     | 97.43 kB      |
| **+ React Router 8.3.1**   | **253** | **337.82 kB** | **110.38 kB** |
| + TanStack Router 1.170.32 | 276     | 374.67 kB     | 122.68 kB     |

**+37.73 kB against +74.58 kB.** The default assumption survived, but it was
measured rather than inherited, and the alternative it beat was genuinely
better at one thing (see §7 below).

Declarative mode — `<BrowserRouter>`, `<Routes>`, `<Route>` — is a library
import with **no plugin, no code generation and no root tooling**.
`@react-router/dev`, its framework-mode Vite plugin, is deliberately not
adopted; if it ever is, it is root tooling beside Vite rather than a package
dependency, by the same rule that puts React in `apps/frontend` and
`eslint-plugin-react-hooks` at the root.

Two traps recorded because both are the kind installed from memory:
**`react-router-dom` is not the package** — it is stranded at 7.18.3 and v8
ships everything from `react-router` itself — and React Router 8 peers
`react >=19.2.7` against our 19.2.8, **the narrowest peer margin in this
repository**, so a React downgrade is now a router failure too.

### 2. Every path is declared once, in `src/routes/paths.ts`

React Router's `to=` is an unchecked string. `PATHS` is an `as const` object
read by both the `<Route path>` declarations and every `to=`, so a typo is an
unknown property and `tsc -b` catches it.

This is a **mitigation, not a fix**, and the difference matters: nothing stops
a future author writing the literal out by hand, and nothing checks that a
declared path has a route behind it. The catch-all `*` is deliberately not in
the table, because it is not an address — nothing links to it and nothing
should.

### 3. The chrome is a component, rendered once outside `<Routes>`

`components/AppHeader` carries the product name, the market feed region, a
reserved market clock region and the navigation. Rendering it outside the route
table rather than inside a layout route is what makes "survives navigation"
true of the DOM node rather than of the pixels — and that distinction is the
whole criterion, because a header remounted on every navigation looks
identical to one that is not.

The current route is read by `NavLink` and rendered as `aria-current="page"`,
so the accessible state and the visible one are one fact rather than two. The
visible indication is **three encodings, only one of which is colour**:
weight 600 against 400, an underline against none, and a darker ink.

### 4. Four named `region` landmarks on the landing route, and only there

§9's structure as a proportion rather than a pixel spec: a 3:1 by 2:1 grid
holding **Market topology**, **Unusual activity**, **Market breadth** and
**Current investigations**, auto-placed in source order. The names are §8.1's
vocabulary — what a region holds, never where it sits — so the landmark list
reads as the product's contents page and the layout can be rearranged by
editing two `grid-template-*` lines.

Each is a `region` landmark with `aria-labelledby` pointing at the heading it
already has, the id coming from `useId()` so two regions of the same name
cannot collide. The rejected alternative was plain `<div>`s: cheaper, and it
leaves a keyboard or screen-reader user nothing to jump between on the screen
the product opens on.

**The three other routes get no regions**, and the asymmetry is a decision
recorded where the routes are declared. Inventing an Investigation Workspace
layout here would be scaffolding ahead of Epic 7, and §8.2 lists eight kinds of
content while saying nothing about where any of them sits — so the layout it
invented would be wrong.

### 5. The region grid takes a `height`, not a `min-height`

Seen rather than reasoned about. Under a minimum, `fr` rows still size to their
content, so the primary region grew as tall as the content inside it and §9's
proportions vanished into one very tall box beside a short one.

A height makes the ratios real and hands the overflow to the region, which
scrolls its own content instead of pushing its neighbours around. It is `70vh`
— a proportion of the viewport rather than "the space left below the chrome",
because the second means the shell owning the page's height and
`App.module.css` has finished shrinking at two rules.

### 6. Deep-linking is handed to Story 1.11, not solved here

The fallback is a property of the host and the host is not chosen. Measured in
Task 1.5.5 and again on a clean build in 1.5.6, against `apps/frontend/dist`
copied outside the workspace and served by `python3 -m http.server`:

| Path                      | Dumb static host | `vite preview`  |
| ------------------------- | ---------------- | --------------- |
| `/`                       | 200 `text/html`  | 200 `text/html` |
| `/investigations`         | **404**          | 200 `text/html` |
| `/securities`             | **404**          | 200 `text/html` |
| `/replay`                 | **404**          | 200 `text/html` |
| `/definitely-not-a-route` | **404**          | 200 `text/html` |
| `/assets/nope.js`         | **404**          | 200 `text/html` |

**The 404s are the correct finding.** Hash routing is the rejected alternative
that needs no host support, and it loses on putting `/#/` in every URL a user
copies, pastes into an investigation or files in a ticket — permanently, to
avoid one line of hosting configuration on a platform nobody has picked. A
static export per route is the second, and four placeholders do not justify it;
it also stops being possible the moment Epic 4 gives `/securities/:symbol` a
parameter.

**The finding that nearly slipped through is that a second criterion rests on
the same property.** `NotFound` is a real route, so an unknown address renders
a not-found state only if the host served `index.html` for it. On a dumb host
the user gets the _host's_ 404 page and React never boots. The route is
correct; the hosting assumption underneath it was untested, and the story had
already recorded the criterion as met.

### 7. Route splitting: rejected, with the artefact built both ways

|                        | Unsplit                            | Split                                   |
| ---------------------- | ---------------------------------- | --------------------------------------- |
| Files in `dist/`       | **3**                              | **12**                                  |
| JavaScript, total      | 342.08 kB                          | 343.52 kB                               |
| Gzipped, total         | 114.36 kB                          | 115.62 kB                               |
| Eager chunk (JS + CSS) | 351.90 kB                          | 236.53 kB                               |
| First paint of `/`     | 351.90 kB, 2 files, one round trip | 351.39 kB, 7 files, **two** round trips |

The eager chunk does shrink, by 105.37 kB — and **not one of those bytes is
saved on the route the product opens on.** They move into a 108.85 kB
`MarketOverview` chunk, which is Base UI arriving on a second round trip
instead of the first. React and React Router stay eager either way, because the
chrome renders on every route including the not-found state. The four
placeholder chunks are 0.34–0.64 kB each: splitting them is close to free and
close to worthless.

So splitting **relocates** the cost rather than removing it, and pays 1.44 kB
and nine files to do so.

**The reversal trigger is Epic 4**, which replaces Story 1.4's render check with
the real overview and so removes the only reason Base UI is on the first-paint
route. If the topology, the charts or the replay controls then make one route
genuinely large, split **that** route rather than all five.

## Rejected, with reasons

**TanStack Router 1.170.32** — and it lost while being better at the one thing
this repository most wants. Its typed routes make a mistyped path a compile
error naming the valid set, verified in the spike:

```
error TS2322: Type '"/overvieww"' is not assignable to
              type '"/" | "/securities/$symbol" | "." | ".."'.
```

It lost on three grounds together. Twice the bundle for four static routes —
the type safety scales with route count and the 37 kB does not. Its ergonomic
path is a plugin generating `routeTree.gen.ts`, which is a generated file
needing a `.gitignore` entry, a build-order position and an answer to
staleness, arriving with `@babel/core`, `chokidar`, `zod` and `unplugin` as
root tooling — the exact shape ADR 0004 §3 rejected for design tokens. And half
its value is route-level loaders and typed search params, which are a data
layer Epic 2 owns; adopting a router _for_ them would be taking that decision
quietly.

**`@react-router/dev` (framework mode)** — a Vite plugin, a build step and a
routing convention, bought to serve four static placeholder routes. Declarative
mode is a library import, and this story needed nothing the plugin adds.

**`wouter@3.10.0`** — read on the registry and not spiked. It is smaller than
both, but it offers no typed paths, and the axis this decision turns on is type
safety against weight. A candidate weaker on one and cheaper on the other is
not a third position; it is a worse React Router.

**Plain `<div>`s instead of named landmarks** (§4) — cheaper, no `useId()`, no
`aria-labelledby`, and no risk of tripping `landmark-unique`. It loses because
it gives a keyboard or screen-reader user nothing to jump between on the screen
the product opens on, which is exactly the screen that has the most on it.

**Hash routing** and **a static export per route** (§6), and **`React.lazy` per
route** (§7) — reasons above.

## Consequences worth stating separately

### Two acceptance criteria are met _given_ a host with a fallback, and Story 1.11 owns the host

Both are recorded that way in `STORY.md` rather than ticked. Three constraints
went into Story 1.11's own STORY.md, and the third is the one that would
otherwise be discovered in production:

- The rewrite must serve `index.html` with **200**, not a redirect. A 302 to
  `/` loses the path, which is the whole point
- `base` is `/`, so every emitted asset path is absolute. A subpath deployment
  is a `base` change and a **rebuild**, not a rewrite rule — ADR 0003's
  finding, restated here because a fallback is exactly where somebody would try
  to fix it cheaply
- **The rewrite must not be a blanket catch-all.** One that answers _every_
  unmatched path with `index.html` answers a missing asset that way too, which
  is the `vite preview` trap reproduced in production: a partially uploaded
  deploy looking like a broken application, with a MIME-type error rather than
  a 404 naming the file

Task 1.5.6 built that host to confirm the constraint is implementable rather
than merely stated — a `SimpleHTTPRequestHandler` falling back to `index.html`
only for paths outside `/assets/`. Routes 200, `/assets/nope.js` 404.

**Both criteria are now closed against the real host, and all three constraints
held (Task 1.11.4, 2026-09-03).** The frontend is on Azure Static Web Apps, and
the fallback is a `navigationFallback` with `rewrite: "/index.html"` and
`exclude: ["/assets/*"]` — six lines of JSON expressing exactly what Task
1.5.6's throwaway Python host proved was expressible. Every route deep-loads
cold with a **200 and not a redirect**, a made-up path renders this
application's own `NotFound` in a browser, `/assets/nope.js` is a **404**, and
`base` is still `/` so no rebuild was needed.

One consequence this ADR did not foresee, and it is a change to the shape this
section is about: **the fallback lives inside the artefact.** Static Web Apps
requires `staticwebapp.config.json` at the root of the deployed output, so
`dist/` is **four files and 355,985 B** rather than three — the three original
files unchanged and byte-identical since Task 1.7.7, plus 300 B of routing
configuration. Unlike the backend, whose host configuration sits in a platform
panel, the frontend's is part of what ships. It reaches `dist/` through Vite's
`publicDir`, which also means Storybook's build copies it. The full record is in
Story 1.11's `HOSTING.md`.

### A fallback drawn at the router blanks the page body, not a box

Task 1.5.5 served the split build from a host delaying each chunk. The header
renders immediately and looks perfectly healthy, because `AppHeader` is outside
`<Routes>` and eager — and the whole of `<main>` is empty: four named region
landmarks and the 70vh grid, replaced by nothing.

That is a more specific problem than "a blank screen", and it is the argument
for scoping a boundary to the regions rather than to the router. **Story 1.7
faces the same choice for failures**, and it has been made visible once already
rather than argued about.

### The regions are the containment boundaries, and they exist before the story that needs them

Four landmarks, each scrolling its own overflow, so an error state goes inside
one without the other three moving. That ordering — boundaries in 1.5, states
in 1.7 — is why this story built no error boundary component: the story that
needs one is the story that should design it.

### The React Compiler rules stayed silent, and the reason is not compatibility

`react-hooks/set-state-in-effect` fired at **error** in Task 1.5.1's spike, on
a route mirroring a URL parameter into state the obvious way. The same route
written without the effect lints clean, and neither router candidate provoked
anything on its own — `useParams`, `Link`, `Outlet` and `RouterProvider` are
all silent under `strictTypeChecked` and all 17 rules.

Across the three tasks that shipped source (1.5.2, 1.5.3, 1.5.4) the rules said
nothing at all. Five route modules and the shell carry zero state between them;
the chrome holds the two shapes most likely to attract the rules — a clock and
a connection status — and holds neither, because the clock is a reserved region
and the status is a prop. `Region` calls `useId()`, the **first hook in this
application**, and `useId` is not state.

So the silence is evidence that **this story had almost nothing to hold state
about**, not that the tree is compatible with 17 rules taken wholesale. Epic 2
is where that stops being true.

### Layout is proportion, and the design language is not

Story 1.4's token layer is spacing, type, colour, one radius, one border width
and one focus rule. It has **no ladder for proportion** — no grid fractions, no
page-height convention — so the region grid is the first stylesheet here
carrying values that are not tokens: `3fr`/`1fr`, `2fr`/`1fr`, `70vh`.

That is a boundary rather than a gap in ADR 0004, and drawing it explicitly is
what stops the next author inventing a `--layout-primary-ratio` nobody else
uses. Every colour, gap, border and font in those stylesheets is still a token.

### The permutation grid and landmark uniqueness are in direct conflict

`AppHeader` renders a `<header>` and a `<nav>`, so its `AllPermutations` story
put six banners on one page and axe reported `landmark-no-duplicate-banner` and
`landmark-unique` at moderate — while every single-state story reported 0
violations. The application renders exactly one header, so the finding is the
grid's rather than the component's.

Both rules are disabled **on that one story and nowhere else**, because a
permanent badge trains the next author to ignore the badge. Expect this for
every landmark component, and expect the grid to be the half that gives.

### The workshop needed a provider, and that is a Story 1.4 gap found by Story 1.5

`AppHeader` contains `NavLink` and would not render in Storybook at all. Task
1.5.3 added a named `MemoryRouter` decorator to `.storybook/preview.tsx` —
`.tsx` now, because it holds JSX — with its entry read from a `route` story
parameter. Memory rather than browser, because the workshop is an iframe with
no address bar and a story handed the browser's history could navigate the
whole Storybook UI.

It is the first deliberate divergence between the workshop and the application,
and it is contained to one decorator in one file. It is recorded in ADR 0004
as well, because the workshop is that ADR's.

## Measured

Every figure below is from a clean tree on 2026-08-31 —
`pnpm clean && pnpm install && pnpm verify` — not from a warm one.

| Stage                         | Modules | JS        | CSS     | Files |
| ----------------------------- | ------- | --------- | ------- | ----- |
| ADR 0004 baseline             | 193     | 300.09 kB | 7.21 kB | 3     |
| Task 1.5.1 — router installed | 193     | 300.09 kB | 7.21 kB | 3     |
| Task 1.5.2 — routes mounted   | 261     | 340.10 kB | 8.62 kB | 3     |
| Task 1.5.3 — the chrome       | 263     | 340.83 kB | 9.13 kB | 3     |
| Task 1.5.4 — the regions      | 265     | 342.08 kB | 9.82 kB | 3     |
| Task 1.5.5 — splitting        | 265     | 342.08 kB | 9.82 kB | 3     |

Six figures rather than one, so each decision's cost stays attributable.
Task 1.5.1 installed the router and nothing imported it, which is why the
artefact is unchanged there and the +37.73 kB it measured is spent in 1.5.2.
Task 1.5.5 changed no source at all. The whole story is **+72 modules,
+41.99 kB of JavaScript and +2.61 kB of CSS**, still three files, no new
dependency beyond the router, and still exactly **one** file importing
`@base-ui/react`.

`pnpm verify` exits 0 in **11.0s** from a clean tree, against ADR 0004's 10.5s
— build 3.2s, lint 2.9s, `format:check` 1.6s, `stories` 0.25s, `test` 0.45s.

Accessibility, axe 4.13.0 against the built page on a static host — not against
a story:

| Route             | Violations | Passes | Inconclusive |
| ----------------- | ---------- | ------ | ------------ |
| `/`               | 0          | 37     | 1            |
| `/investigations` | 0          | 25     | 0            |
| `/securities`     | 0          | 25     | 0            |
| `/replay`         | 0          | 25     | 0            |
| unknown path      | 0          | 25     | 0            |

`landmark-unique` passes. The one inconclusive is the known one and has not
moved: `color-contrast` over two `aria-hidden` direction arrows, axe's reason
"Element content contains only non-text characters" — automated tooling
declining to judge the exact element that carries the non-colour encoding.

Layout, design width 1440 × 900 and checked at 1280 in an iframe of that exact
width (`resize_window` does not change the reported `innerWidth` on this
display):

| Width | Primary | Right column | Horizontal overflow | Nav      |
| ----- | ------- | ------------ | ------------------- | -------- |
| 1710  | 1205 px | 402 px       | none                | one line |
| 1280  | 882 px  | 294 px       | none                | one line |

Row heights are `70vh` split 2:1, so they track the viewport rather than the
content — which is the point of §5. The primary region scrolls its own content;
the other three do not. `font-variant-numeric` on a price cell still computes to
`tabular-nums`.

Focus, measured on all seven interactive elements by tabbing rather than by
reading the stylesheet: `rgb(28, 28, 28) solid 2px` at `outline-offset: 2px`,
`:focus-visible` matching on every one, and not one of them declaring a focus
style of its own.

Chrome persistence, by Task 1.5.3's method rather than by looking at the page: a
`data-probe156` attribute stamped on the `<header>` survived all four routes and
an unknown path, with `performance.timeOrigin` unchanged throughout — the same
DOM node, and no document load.

HMR, against ADR 0004's figures: a **CSS-only** edit lands in **18–135 ms**
(first edit after start 283 ms), reproducing 0004's 24–130 ms band. The
component figures are **not** comparable and are stated as what they are: the
measuring tab reported `visibilityState: "hidden"` throughout, which throttles
React's scheduler, and component edits measured 227–884 ms against 0004's
177–280 ms under the same caveat. What the run does support is the _ratio_ — a
component edit is several times a stylesheet edit — not a regression claim
either way.

## Related

- [ADR 0003](0003-frontend-build-tooling-and-browser-baseline.md) — the
  bundler, the `base` finding and the `vite preview` fallback this story kept
  running into
- [ADR 0004](0004-styling-approach-component-library-and-the-component-workshop.md)
  — the tokens, the components and the workshop this story is the first
  consumer of, and where this story's two retrospective findings are recorded
- `planning/epic-01-application-foundation/story-05-application-layout-and-routing/`
  — the six task records, each carrying the measurements this document
  summarises
- Story 1.11 owns the deep-linking fallback; Story 1.7 owns what goes inside a
  region when it fails; Story 1.12 is the next consumer of both the chrome and
  the regions
