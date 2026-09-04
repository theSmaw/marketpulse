import { expect, test } from "@playwright/test";

import {
  backendIndicator,
  expectBackendStatus,
  expectNothingFailedToRender,
} from "../support/app.js";
import { HEALTH_ROUTE_PATTERN } from "../support/pair.js";
import {
  API_TIMEOUT_MS,
  HEALTH_POLL_INTERVAL_MS,
  NEXT_POLL_TIMEOUT_MS,
  POLL_INTERVAL_TOLERANCE_MS,
} from "../support/poll-timings.js";

// Story 1.12's recovery criterion, watched rather than inferred (Task 1.13.3).
//
// Healthy, then the backend gone, then the backend back — **with no page
// reload**, on the same mounted hook, with the last confirmed time surviving
// the outage in between. Three of those four are sequences over time, which is
// the whole reason this journey cannot exist at any level below a browser: an
// injected request has no clock, and a component test's fake timers would be
// asserting the test's own scheduler.
//
// ## Why this test is slow, and why it is allowed to be
//
// It waits out **two** real poll intervals, because a state change cannot be
// observed sooner than the poll that produces it. That is ~62 s of a suite that
// otherwise runs in under two seconds, and it is the price of the one criterion
// nothing cheaper can hold. Playwright's default per-test timeout is 30 s, so
// this test raises its own — derived from the two constants rather than picked,
// which is what `poll-timings.ts` exists for.
//
// ## What it does not do
//
// It does not stop the backend. The outage is produced by refusing the request
// in the browser, which is the same `TypeError: Failed to fetch` a refused
// connection produces and is what `unreachable` is defined as — and it leaves
// the pair every other spec is sharing completely untouched. See
// `backend-failure-states.spec.ts` for the measurement that decided that, and
// `README.md` for the decision.

test("the indicator recovers on the next poll, without the page reloading", async ({
  page,
}) => {
  // Two intervals plus the page's own work, and one deadline of slack because a
  // poll that is already in flight when the route changes settles before the
  // next one is scheduled.
  test.setTimeout(2 * HEALTH_POLL_INTERVAL_MS + 4 * API_TIMEOUT_MS + 30_000);

  // Every health request the page makes, stamped. Used for two things at the
  // end: proving the poll never stopped, and checking `poll-timings.ts`'s copy
  // of the interval against the interval the application actually polls at.
  const stamps: number[] = [];

  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/health") {
      stamps.push(Date.now());
    }
  });

  // --- Healthy, from the real backend ---
  await page.goto("/");
  await expectBackendStatus(page, "healthy");

  // The two facts that will prove there was no reload. `timeOrigin` is when
  // *this document* started; a reload gives a new one. Asserting them rather
  // than asserting that a reload did not happen is this repository's own HMR
  // check, and it is the difference between evidence and the absence of it.
  const before = await page.evaluate(() => ({
    timeOrigin: performance.timeOrigin,
    navigations: performance.getEntriesByType("navigation").length,
  }));

  expect(before.navigations).toBe(1);

  // --- The backend goes away ---
  await page.route(HEALTH_ROUTE_PATTERN, async (route) => {
    await route.abort("connectionrefused");
  });

  await expectBackendStatus(page, "unreachable", {
    timeout: NEXT_POLL_TIMEOUT_MS,
  });

  // **The surviving timestamp**, which is the field most likely to be broken by
  // accident: a failed poll must not clear it, and every failing branch of the
  // hook spreads the previous state rather than building a fresh object. The
  // value is a wall clock the component formats by hand precisely so a test can
  // assert it without pinning a locale.
  const indicator = backendIndicator(page);
  const confirmed = indicator.getByText(/^Last confirmed \d{2}:\d{2}:\d{2}$/);

  await expect(confirmed).toBeVisible();

  const confirmedWhileDown = await confirmed.textContent();

  // It also must not *advance* to the failed attempt. Read again after the
  // state has been on screen long enough for another poll to have been
  // scheduled and refused.
  await expect(confirmed).toHaveText(confirmedWhileDown ?? "");

  await expectNothingFailedToRender(page);

  // --- The backend comes back ---
  await page.unroute(HEALTH_ROUTE_PATTERN);

  await expectBackendStatus(page, "healthy", { timeout: NEXT_POLL_TIMEOUT_MS });

  // In `healthy` the timestamp is deliberately not rendered at all: the word
  // already carries the fact, and a second copy of it ageing by up to a poll
  // interval would read as news in a status strip.
  await expect(confirmed).toHaveCount(0);
  await expectNothingFailedToRender(page);

  // --- No reload happened ---
  const after = await page.evaluate(() => ({
    timeOrigin: performance.timeOrigin,
    navigations: performance.getEntriesByType("navigation").length,
  }));

  expect(after.timeOrigin).toBe(before.timeOrigin);
  expect(after.navigations).toBe(1);

  // --- The copy of the interval is a checked copy ---
  //
  // The gaps between consecutive health requests, ignoring the ones a page load
  // produces back to back: the dev server plus `StrictMode` make two or three
  // requests within a fraction of a second at mount, which are not polls.
  //
  // This is the assertion that stops `poll-timings.ts` drifting from
  // `use-backend-health.ts` silently. It is deliberately not a latency
  // assertion — the tolerance is five seconds wide, and what is being checked
  // is that the two files hold the same *number*.
  const intervals = stamps
    .slice(1)
    .map((stamp, index) => stamp - (stamps[index] ?? stamp))
    .filter((gap) => gap > 1_000);

  expect(intervals.length).toBeGreaterThanOrEqual(2);

  for (const interval of intervals) {
    expect(Math.abs(interval - HEALTH_POLL_INTERVAL_MS)).toBeLessThanOrEqual(
      POLL_INTERVAL_TOLERANCE_MS,
    );
  }
});
