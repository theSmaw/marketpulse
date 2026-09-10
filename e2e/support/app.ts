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
//     unscoped, which matches the wrong cell. **Since Task 2.6.7 that is
//     sharper rather than softer**: every page load renders `checking` in *two*
//     cells at once, the market feed's and the backend service's, so an
//     unscoped wait for that word resolves against whichever settles first.
//     (It used to read: a correct first run shows a `DISCONNECTED` market feed
//     beside a `HEALTHY` backend service. That feed word was hard-coded and is
//     gone.)
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

/**
 * Text a **reader** can see, excluding the sentence written for a screen reader.
 *
 * Needed since Task 2.10.8 gave `/securities` a second live region. An
 * announcement deliberately repeats facts that are also on screen — visible
 * text is written to be scanned and an announcement to be heard once, out of
 * context — so a `getByText` that does not say which channel it means resolves
 * to two elements and fails strict mode.
 *
 * **That failure is the locator telling the truth**, and this helper is how a
 * spec says which of the two it is asserting rather than how it silences the
 * question. Anything asserting what a *listener* hears reaches into
 * `role="status"` directly and says so.
 *
 * `and()` is the intersection of two locators over the same element: the text
 * match, restricted to elements that are not the live region. It does not
 * exclude a live region's *descendants*, which is correct — the regions in this
 * application hold a single text node and nothing else.
 */
export function readable(scope: Locator, text: RegExp | string): Locator {
  return scope.getByText(text).and(scope.locator(':not([role="status"])'));
}
