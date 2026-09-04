import type { BackendStatus } from "@marketpulse/shared";
import { BACKEND_STATUSES } from "@marketpulse/shared";
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

// How a spec finds the two things every journey in this suite looks at: the
// backend indicator, and whether anything failed to render (Task 1.13.3).
//
// It is a module rather than four copies of a selector because the selectors
// are not obvious and each one has a measurement behind it. The four traps, all
// of them found rather than anticipated:
//
//  1. **The status strip's three cells are plain `<div>`s and not landmarks.**
//     They are three cells of the chrome, not three areas of the page, so there
//     is no role to scope by and the micro-label's own parent is what stands in
//     for one. That is a real coupling to the strip's shape and it is the
//     cheapest honest option — the alternative is matching a status word
//     unscoped, which matches the wrong indicator half the time, because a
//     correct first run shows a `DISCONNECTED` market feed beside a `HEALTHY`
//     backend service.
//  2. **There is no separator between the label and the word.** The region's
//     text is `Backend servicehealthy`, so `toContainText(/\bhealthy\b/)` finds
//     no word boundary and fails. Task 1.13.2 met that from the other
//     direction: Story 1.9's rule is "do not assert on a single element's text
//     where a component splits it", and the concatenation a screen reader is
//     handed is not the string the elements read as. So a status word is
//     matched as an element whose *whole* text is the word.
//  3. **The words are lowercase in the DOM and uppercased by CSS.** Playwright's
//     text matching sees the DOM text, so `healthy` matches and `HEALTHY` does
//     not — while `innerText()` reports the transformed `HEALTHY`, because that
//     is rendered text. Two different strings for one element; say which one
//     you mean.
//  4. **`checking` is not a `BackendStatus` member and must never become one.**
//     It is what every page load renders until the first poll settles — a fact
//     about this client's own startup rather than about the server, which is
//     exactly why Task 1.12.3 kept it out of the vocabulary and put a boolean
//     beside it. A spec waits past it; it never reads it as a failure and never
//     asserts it as a state.

/** The placeholder every page load renders until the first poll settles. */
export const CHECKING = "checking";

/**
 * The status strip cell that carries the backend service's state.
 *
 * Scoped through the micro-label rather than a role, for the reason above.
 */
export function backendIndicator(page: Page): Locator {
  return page
    .getByRole("banner")
    .getByText("Backend service", { exact: true })
    .locator("..");
}

/**
 * The element whose whole text is the status word, whatever that word is.
 *
 * Matching the vocabulary rather than one member is what lets a spec wait for
 * "the first poll has settled" without knowing the answer, and it is why the
 * words come from `BACKEND_STATUSES` rather than being written out — the import
 * that made the specs a workspace package in the first place.
 */
export function backendStatusWord(page: Page): Locator {
  return backendIndicator(page).getByText(
    new RegExp(`^(${[...BACKEND_STATUSES, CHECKING].join("|")})$`),
  );
}

/**
 * Wait until the backend indicator reads exactly `status`.
 *
 * `timeout` is the caller's, because the two cases are far apart: a state
 * produced before the page loads is on screen in a couple of hundred
 * milliseconds, and a state produced afterwards cannot be seen until the next
 * poll. Derive the second from `poll-timings.ts` rather than picking a number.
 */
export async function expectBackendStatus(
  page: Page,
  status: BackendStatus,
  options: { readonly timeout?: number } = {},
): Promise<void> {
  const word = backendIndicator(page).getByText(new RegExp(`^${status}$`));

  await expect(word).toBeVisible(
    options.timeout === undefined ? {} : { timeout: options.timeout },
  );
}

/**
 * Nothing on this page failed to render.
 *
 * By **role**, not by title. `ErrorFallback` is the only thing in this
 * application that carries `role="alert"`, and there are three places it can
 * appear — the header, the route outlet and inside each region — so one
 * role query covers every boundary placement, including any this application
 * grows. Matching the titles instead would mean a list that goes stale the day
 * a fourth boundary is added, silently and in the passing direction.
 *
 * This is the assertion that makes PRODUCT_SPEC.md §36 checkable: an
 * unreachable backend is a product state, and no part of the interface may
 * collapse because of one.
 */
export async function expectNothingFailedToRender(page: Page): Promise<void> {
  await expect(page.getByRole("alert")).toHaveCount(0);
}
