# Task 1.5.2 — The route table, the four placeholders and the not-found state

**Status:** Not started
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
