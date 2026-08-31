# Task 1.5.2 — The route table, the four placeholders and the not-found state

**Status:** Complete (2026-08-31)
**Story:** [1.5 Application Layout & Routing](STORY.md)
**Depends on:** Task 1.5.1

## Objective

Four routes matching PRODUCT_SPEC.md §8's four primary experiences, each rendering something identifiable, plus a not-found state for everything else. No chrome and no layout regions yet — this task proves navigation works and nothing more.

## Work

- **The routes are §8's four experiences and their names come from the spec, not from this task.** Market Overview is the landing route (`/`), Investigation Workspace, Security Explorer and Market Replay follow. Read §8 before choosing paths: a Security Explorer route almost certainly wants a symbol in it eventually, and picking `/security` now versus `/security/:ticker` is a decision to take deliberately rather than to discover in Epic 4
- **A placeholder is identifiable, not empty.** Each route renders its own name and one sentence saying which epic fills it, in the product's visual language — this is the first thing anyone clicking through the application will see for several epics. `App.module.css`'s existing prose idiom is the reference; do not invent a second one
- **The not-found state is a route, not a fallback nobody looks at.** It must say what happened and offer the way back to the landing route. It is deliberately **not** an error screen in the Story 1.7 sense — an unknown URL is a user action, not a failure of the system
- **Route modules are `.tsx` under `apps/frontend/src`, and relative imports between them carry `.js` extensions.** This is the rule most often forgotten in a task that adds many small files at once, and its only enforcer here is `tsc`: drop an extension and `tsc -b` fails with TS2835 while `vite build` emits a byte-identical bundle. `pnpm verify` is the only thing that will tell you
- **Decide where route modules live, and it is not necessarily `src/components/`.** A route is not a component primitive, and `scripts/check-stories.mjs` walks `src/components/` specifically — so putting route modules there imposes a stories obligation on four placeholders that have exactly one state each. Task 1.5.3 owns the general question of where the workshop's line falls; this task owns the directory, and the two answers have to agree. State the choice in a comment where the routes are declared
- **React Router's `to` is a plain string, and Task 1.5.1 chose it knowing that. Closing the hole is this task's job.** TanStack Router lost on weight, but the thing it would have bought is a compile error on a mistyped path (`TS2322` naming the valid set, verified). Without it, `<Link to="/replayy">` typechecks, lints, builds and renders — and fails only when somebody clicks it, landing on the not-found state this task is also building. That is a **third** silent-failure class alongside the misspelled CSS Module class and the missing `.js` extension, and unlike those two it is cheap to close: declare the paths **once**, in one exported `as const` table, and have both the route declarations and every `<Link>` read from it. A typo is then an unknown property rather than an unknown route, which `tsc -b` does catch. Do this here, while there are four paths, rather than after Epic 4 has scattered them
- **Adding a route is not a reason to add a package.** `apps/frontend` stays one package; the feature modules described in the frontend structure are directories
- **No code splitting in this task.** Every route module is a static import, so `dist/` stays three files and the artefact's shape does not change here. Task 1.5.5 owns splitting as a decision with a measurement behind it — taking it accidentally, by reaching for `React.lazy` because a tutorial did, is exactly what that task exists to prevent
- Navigate between all four routes and the not-found state in the browser, and confirm the URL changes without a full document load. `performance.timeOrigin` unchanged across a navigation is the cheap proof, and it is the same method Task 1.4.6 used for HMR

## Done when

- All four routes exist, render an identifiable placeholder, and are reachable by clicking as well as by typing a URL
- An unknown path renders the not-found state rather than a blank screen or a crash
- Client-side navigation does not reload the document, proven rather than assumed
- Every path is declared once and referenced by name; a mistyped path is a compile error rather than a click that lands on the not-found page
- `pnpm verify` exits 0, and `dist/` is still three files
- **The artefact grew by roughly what Task 1.5.1 measured and not by more.** That task spent the router's cost in a spike and threw it away, so today's `dist/` is still the 193-module / 300.09 kB baseline with `react-router` absent from the output entirely. Importing it here should land near **253 modules and 337.82 kB**; the four placeholders are prose and a few classes. A materially larger number means something arrived that is neither the router nor the routes
- The `.js` extension convention holds across every new file — which `tsc -b` will confirm, since nothing else will

## Notes

Deep-linking on reload is **not** proven by this task and must not be claimed by it. Both local servers answer any unmatched path with `index.html` and a 200, so every route here will deep-link on a machine where nothing was configured, and the identical build on a plain static host will 404. Task 1.5.5 proves it against a server without an SPA fallback.

## Outcome

Five routes, five route modules, one path table and a navigation strip that is
explicitly scaffolding. `pnpm verify` exits 0 and `dist/` is still three files.

### The paths, and the one decision inside them

| Experience              | Path              | Spec |
| ----------------------- | ----------------- | ---- |
| Market Overview         | `/`               | §8.1 |
| Investigation Workspace | `/investigations` | §8.2 |
| Security Explorer       | `/securities`     | §8.3 |
| Market Replay           | `/replay`         | §8.4 |
| Not found               | `*`               | —    |

The only path that was a real choice is the Security Explorer's, and it went
**plural**. §8.3 is a view _of a security_, so the route acquires a symbol the
moment Epic 4 has data — and the shape that takes is a child,
`/securities/:symbol`, nested under this one. The singular `/security` would
mean renaming the parent then, or living with `/security/:symbol` reading as a
category with one member. The parameterised route is deliberately **not**
declared: there is nothing behind it, and an empty route with a parameter is a
promise about a data shape this story has no business making.

`*` is deliberately not in the path table. It is not an address — nothing links
to it and nothing should.

### The path table, and what it is honest about

`src/routes/paths.ts` is one exported `as const` object, read by both the
`<Route path>` declarations and every `<Link>`/`<NavLink to>`. A typo is then
`PATHS.overvieww` — an unknown property, which `tsc -b` catches — rather than an
unknown route that fails only when somebody clicks it.

It is a **mitigation and not the guarantee TanStack sells**, and the file says so
in its own header: nothing stops a future author writing the string out by hand,
and nothing checks that every declared path has a route. What it does buy is
that the four paths exist once, before Epic 4 scatters them.

### `App` stopped being a page, and the render check did not get deleted with it

`App.tsx` is now the router's host — `<BrowserRouter>`, the four `<Route>`s, the
catch-all, and the temporary navigation. Everything that used to be in it moved
to `src/routes/MarketOverview.tsx`, and **that move is the one decision in this
task that could have gone wrong quietly.**

Deleting Story 1.4's render check instead — or letting the landing route render
a bare placeholder — would have routed `App`'s five components and Base UI out
of the module graph and taken about **100 kB** out of the artefact. Task 1.5.1
already recorded that 104 kB as the price of Base UI, paid knowingly; it is not
a saving to be reclaimed by accident in a task about navigation. It also would
have removed the only thing in the _application_ proving the token layer, the
semantic colours and the five components reach a browser through the bundler
rather than only through Storybook. So the landing route is a placeholder
heading with the render check underneath it, and Epic 4 replaces both.

Task 1.5.1's spike hit exactly the same trap in reverse and measured a false
70 kB "improvement" from it. That is twice now.

### Where route modules live, and why not in `src/components/`

`src/routes/`, one file per route, plus `Placeholder.tsx` for the shape they
share and `routes.module.css` for the surface they render on.

Not `src/components/`, because `scripts/check-stories.mjs` walks that directory
specifically and a component there owes a `.stories.tsx` covering its
permutations — and a route placeholder has one state made of two strings. Route
furniture is not workshop material. **Task 1.5.3 still owns the general question
of where that line falls** now that there is real chrome; this task only claims
the far side of it for route placeholders, and states the claim in a comment
where the routes are declared.

### `cx()` earns its keep with one argument, and the error is a different one

`className={styles.navLink}` does not compile:

```
error TS2375: Type '{ ... className: string | undefined; }' is not assignable to
type 'NavLinkProps' with 'exactOptionalPropertyTypes: true'.
  Types of property 'className' are incompatible.
```

This is the CSS Modules idiom recorded in ADR 0004 arriving through a **third**
door. A module class is `string | undefined` under `noUncheckedIndexedAccess`;
`NavLink`'s `className` is `string | ((props) => string | undefined)`; and
`exactOptionalPropertyTypes` makes the mismatch a hard **TS2375** rather than the
`restrict-template-expressions` lint error the two-class case gives. So
`cx(styles.navLink)` around a single class is not redundant — it is the
narrowing, and it is what makes a router's link props typecheck at all. Expect
every Base UI or React Router component taking a `className` to want it.

### The React Compiler rules said nothing, and that is the point

Zero hooks and zero state in five route modules and the shell. `useState`,
`useEffect` and `useParams` appear nowhere; the current route is read by
`NavLink` and rendered as `aria-current="page"`, so the accessible state and the
visible one are the same fact rather than two. Task 1.5.1's `set-state-in-effect`
failure came from mirroring a URL parameter into state, and the way not to meet
it again is to have nothing to mirror. Task 1.5.3's clock and connection areas
are where this gets tested for real.

### Two things found by looking at the page rather than at the build

- **Two `<h1>`s.** The product name was one and every route now has one. A
  screen reader user then gets no single answer to "what is this page?", so the
  product name was demoted to a `<p>` with the same class — no visual change, and
  the route's heading wins because it is the thing that changes. Story 1.5.3
  inherits the property when it builds the real chrome
- **A JSX line break is a space, and a closing quote does not survive one.**
  `&rdquo;` pushed onto the next line by the formatter renders as `happening? ”`
  with a gap in front of it. Prettier decides where prose wraps, so the fix is
  to write the sentence so no entity can land at the start of a line rather than
  to fight the wrap

### Measured

| Build                       | Modules |        JS |   JS gzip |     CSS | Files |
| --------------------------- | ------: | --------: | --------: | ------: | ----: |
| Baseline (Task 1.4.6)       |     193 | 300.09 kB |  97.43 kB | 7.21 kB |     3 |
| Task 1.5.1's spike estimate |     253 | 337.82 kB | 110.38 kB | 7.21 kB |     3 |
| This task                   |     261 | 340.10 kB | 111.35 kB | 8.62 kB |     3 |

**+8 modules and +2.28 kB over what Task 1.5.1 predicted**, which is the five
route modules, `NavLink` (the spike used `Link`) and the path table. The
stylesheet grew 1.41 kB for the route surface and the navigation strip. Three
files, as required: every route module is a static import and there is no
`React.lazy` anywhere. Task 1.5.5 owns splitting.

### Verified in the browser, against the built artefact

`vite preview` on the built `dist/`, not the dev server:

- All four routes and the not-found state render, and the current route is
  underlined and carries `aria-current="page"`
- Clicking between routes changes `location.pathname` with
  **`performance.timeOrigin` unchanged** across three navigations — the same
  cheap proof Task 1.4.6 used for HMR, and it is a real client-side navigation
  rather than a document load
- `/replayy` renders the not-found state with its way back, and the back link
  returns to `/` client-side

**Deep-linking is not proven and is not claimed.** `/securities` loaded directly
in the address bar works here only because `vite preview` answers any unmatched
path with `index.html` and a 200. Task 1.5.5 proves it against a server without
an SPA fallback.
