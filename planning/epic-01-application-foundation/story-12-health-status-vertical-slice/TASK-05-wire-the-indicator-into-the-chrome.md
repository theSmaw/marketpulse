# Task 1.12.5 — Wire the indicator into the chrome, on every route, without making the chrome fragile

**Status:** Not started
**Story:** [1.12 Health & Status Vertical Slice](STORY.md)
**Depends on:** Tasks 1.12.3 and 1.12.4

## Objective

Connect the poll to the indicator and put it in `AppHeader`, so backend status is visible on all five routes and the rest of the interface stays usable when the backend is not.

## Work

- Decide **where the hook is called** and record it. `AppHeader` is rendered once by `App.tsx` outside `<Routes>`, so a prop from `App` is the smallest thing that works and needs no context. A context provider is the alternative and its cost is real: `apps/frontend/src/test-render.tsx` becomes the place every test gets it from, and that is the file Story 1.9 named as the third and last description of the application's context. Take the cheap option unless a second consumer already exists
- **The indicator goes in the header's feed region or the reserved market clock region — a decision, not a search.** `AppHeader` carries four slots: the product name, a market feed region, a reserved market clock region and the navigation. The clock is reserved for a clock; putting a status indicator in it spends a slot Epic 3 has a use for
- **`AppHeader`'s `AllPermutations` grid is already an exception, and this task multiplies it.** Six headers on one page is six `banner` landmarks, so `landmark-no-duplicate-banner` and `landmark-unique` are disabled **on that one story and nowhere else**. Adding a status prop multiplies the grid; keep the disable scoped to the grid story rather than widening it to the component, because a permanent badge trains the next reader to ignore the badge. Note the general rule Task 1.7.6 corrected: `landmark-unique` keys on role **and accessible name together**, so it fires on landmarks that are indistinguishable rather than on landmarks that repeat — the conflict only exists for a landmark with no name
- **The chrome is eager and outside the router, and that is what makes this indicator trustworthy.** A failure inside `<Routes>` blanks `<main>` — four named region landmarks and the 70vh grid — under a header that still renders, measured in Task 1.5.5 against a host delaying chunks. So the status stays visible when the page body has failed, which is exactly the §36 shape. The cost is stated rather than discovered: `AppHeader` has its own boundary since Task 1.7.6, and that fallback replaces the `<header>`, so a broken chrome takes the banner landmark, the navigation **and this indicator** with it
- **Check the not-found route specifically.** There are five routes and the indicator is on all of them; an unreachable-backend state has to read correctly on a page that is itself an error state, and `NotFound` is a real route rather than a fallback. Worth looking at rather than assuming
- **"The rest of the interface remains usable" is a criterion, so exercise it rather than reasoning about it.** With the backend down: navigate between all four routes, use the recovery affordance in a region, and confirm nothing collapses to a global error screen. An unreachable backend must not reach `ErrorBoundary` at all — a failed fetch is a value the hook holds, not a throw during render
- Component tests through the render helper. `App.test.tsx` is the one deliberate exception to it: it drives the real `BrowserRouter` through `window.history` because `App` contains its own router, and re-declaring the routes inside a `MemoryRouter` would test a copy of the route table rather than the one that ships

## Done when

- The indicator renders in `AppHeader` on all five routes, driven by the real poll
- With the backend stopped, every route still navigates and renders, and no fallback appears anywhere
- The a11y disable on `AppHeader`'s grid story is still scoped to that story, and the panel reports no new violation on any single-state story
- `pnpm verify` passes, and `pnpm dev` plus `pnpm ready` still describe a healthy pair

## Approach note

Two criteria are met here and only one of them is visible. "Displays it in the application chrome" is the obvious half. The other is that a backend the user cannot reach leaves them with an application they can still use — which is met by the shape of the code (a value in state, not an exception) rather than by anything on screen, and which is therefore the half that will silently stop being true.
