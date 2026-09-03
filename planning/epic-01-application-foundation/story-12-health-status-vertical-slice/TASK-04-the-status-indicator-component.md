# Task 1.12.4 — Build the status indicator, and settle the one-indicator-or-two question

**Status:** Not started
**Story:** [1.12 Health & Status Vertical Slice](STORY.md)
**Depends on:** Task 1.12.1

## Objective

Build what the three states look like, in the workshop, as a presentational component with no state and no network. This is where Story 1.4's vocabulary question and Story 1.5's placement question finally get answered on screen.

## Work

- **The type vocabulary is already settled and this task does not re-take it.** Task 1.12.1 named `BackendStatus` — `healthy` / `degraded` / `unreachable` — in `packages/shared`, deliberately as a second type rather than a widening of `HealthStatus`. Note it is there **despite** the backend producing none of it, which is the one place the "shared means both sides depend on the same fact" test needed stating rather than applying: every member is a statement about `HealthResponse` arriving, not arriving, or arriving unreadable, so it changes when the contract changes. What is open here is the **component** — one indicator or two, and what each state looks like — not the names
- **Take the vocabulary decision explicitly, and record it.** `AppHeader` already renders a `FeedIndicator` hard-coded to `disconnected` with the detail line "No market data until Epic 3", and the comment there names this story as the one that decides. The options are: a second indicator beside it, or one indicator whose meaning widens. **`FeedStatus` means the market feed and this story means the backend service** — two vocabularies for one visual language is one trap and one vocabulary for two different things is the other. Whichever way it goes, `FeedStatus` lives in `packages/shared` because the backend computes it, and the backend computes nothing about its own reachability
- If it is a second component, it goes in `apps/frontend/src/components/<Name>/` with `<Name>.tsx`, `<Name>.module.css` and `<Name>.stories.tsx` — one component per file, one named story per state plus an `AllPermutations` grid. `pnpm stories` fails the build otherwise, and a status indicator has a small closed set of states, so this is the cheap case
- **Colour is never the only signal, and here that is measured rather than principled.** Under greyscale this palette's red and green are **1.05:1** apart — the hue is the entire difference. `FeedIndicator` is the model: a marker **shape** plus a word. Follow it
- **A degraded or unreachable backend is a product state, not a failure, and must not be red.** `--status-error` is reserved for something that actually failed and is the same red as `--price-negative`, separated by presentation rather than hue. `FeedIndicator` is achromatic apart from the amber on `stale`. "Displaying data through 10:42:17" is the PRODUCT_SPEC.md §36 shape this story is the first instance of
- **Render the last successful check time, and decide its format on the failure case.** An absolute clock time is what §36's example uses and it is what a user can act on; a relative "3 minutes ago" needs its own ticking state, which would put a second interval in the tree. Whatever the choice, the tabular-numeral discipline applies — `font-variant-numeric: tabular-nums` is inherited from `body` and a component that breaks column alignment has overridden it
- **Do not assert on colour in the tests, and here that is structural rather than a discipline.** No global stylesheet is applied in the test environment, so `getComputedStyle` returns nothing and `getTokens()` throws. Assert the marker shape, the word, the accessible name. Two traps beside it: `getByText` fails where a component splits its text across a visually-hidden `<span>` and a sibling text node — assert the concatenation, which is what a screen reader is handed — and a `useId()` value is never the thing to assert on, only the accessible name it produces
- Focus is the token layer's. `base.css` carries one global `:focus-visible` rule; a component that adds its own is answering a question the tokens already answered
- Check the a11y panel and read what it says rather than the badge. Its tab count includes **inconclusives**, and this repository's standing one is `color-contrast` over `aria-hidden` glyphs with axe's reason "Element content contains only non-text characters" — automated tooling declining to judge the exact element that carries the non-colour encoding

## Done when

- The component renders all three states with a non-colour encoding for each, and the last successful check time in the state that needs it
- One named story per state plus an `AllPermutations` grid, and `pnpm stories` passes
- The one-indicator-or-two decision is written down where the next reader meets it — in the component and in `AppHeader`, replacing the note that points here
- Component tests through `apps/frontend/src/test-render.tsx`, asserting shape and text rather than colour
- `pnpm verify` passes from the repository root

## Approach note

Nothing in this task knows the backend exists. Keeping it that way is what makes the three states reviewable side by side in a workshop that never makes a network request — and it is what lets Task 1.12.6 produce the states for real without the component having an opinion about how they arose.
