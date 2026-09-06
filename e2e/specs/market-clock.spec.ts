import { MARKET_SESSION_STATUSES } from "@marketpulse/shared";
import { expect, test } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";

// The market clock, and the one assertion no cheaper level can make: **it
// advances** (Task 2.5.5).
//
// A component test can prove that a given instant renders a given time — and
// `MarketClock.test.tsx` does, for all six renderings including two that cannot
// be reached in a browser at all. What it cannot prove is that the timer was
// ever wired up: a hook whose effect never runs renders a perfectly correct
// time, once, and then holds it for ever. From the outside that is
// indistinguishable from a working clock until you look twice, which is exactly
// what this spec does.
//
// **What it must not assert**, and both are on `README.md`'s list for reasons
// that bite harder here than anywhere else in this suite:
//
//  - **Not a value.** The clock's whole subject changes on its own, once a
//    second. Any literal is a flake with a fuse on it. What is asserted is the
//    *shape* — `HH:MM:SS` — and that the value **changed**.
//  - **Not the session state.** Whether the market is open depends on the day
//    the suite is run, so pinning `open` would be red every evening and all
//    weekend. What is asserted is that the word is one the vocabulary admits,
//    which is `landing-route.spec.ts`'s treatment of the backend indicator
//    applied to a second strip cell for the same reason.
//
// The words come from `MARKET_SESSION_STATUSES` rather than being written out,
// which is what a workspace package buys — with one addition the shared
// vocabulary deliberately does not carry, see below.

/** `HH:MM:SS`, and nothing about which. */
const CLOCK_SHAPE = /^\d{2}:\d{2}:\d{2}$/;

/**
 * The words the clock can render.
 *
 * `MarketSessionState` has five members and the clock renders three words:
 * `open`, `closed` — which four members share, differing in the sentence below
 * it — and `unknown`, which is **not** a session status at all and must never
 * become one. It is what a clock past the trading calendar's covered range
 * shows, a fact about our own data running out rather than about the market.
 * That is the same shape as `checking` in `support/app.ts`: a rendering the
 * vocabulary deliberately excludes, listed here and never there.
 */
const CLOCK_WORDS = [
  ...new Set(
    MARKET_SESSION_STATUSES.map((status) =>
      status === "open" ? "open" : "closed",
    ),
  ),
  "unknown",
];

test("the market clock renders in ET and advances on its own", async ({
  page,
}) => {
  await page.goto("/");

  // Scoped through the micro-label rather than a role, for `support/app.ts`'s
  // reason: the strip's three cells are cells of the chrome rather than areas
  // of the page, so there is no landmark to scope by. Unscoped, `^\d{2}:...`
  // would also match the backend indicator's `Last confirmed` time whenever
  // that state is on screen.
  const region = page
    .getByRole("banner")
    .getByText("Market clock", { exact: true })
    .locator("..");

  const clock = region.getByText(CLOCK_SHAPE);
  await expect(clock).toBeVisible();

  // The placeholder this replaced, asserted absent. A clock stuck on
  // `--:--:--` is what a hook that never ran looks like, and it is the failure
  // this journey exists to catch alongside the one below.
  await expect(region.getByText("--:--:--")).toHaveCount(0);

  // `ET` and not `EDT`/`EST` — the decision recorded in `MarketClock.tsx`. It
  // is `aria-hidden`, so this matches the rendered text rather than the
  // accessible name; the accessible name is the visually-hidden prefix beside
  // it, asserted next.
  await expect(region.getByText("ET", { exact: true })).toBeVisible();

  // Read aloud, "ET" is two letters. The clip-rect idiom keeps this in the
  // accessibility tree, which is why it is not `display: none`.
  await expect(region.getByText(/Market time, US Eastern/)).toBeAttached();

  // One of the words, without saying which — see the comment on CLOCK_WORDS.
  await expect(
    region.getByText(new RegExp(`^(${CLOCK_WORDS.join("|")})$`)),
  ).toBeVisible();

  // --- It advances ---
  //
  // The assertion a unit test with fake timers structurally cannot make: it can
  // prove a timer was scheduled, and only a real browser can prove it fires
  // against a real clock in the shipped bundle.
  //
  // Waiting for the text to *differ from what it was* rather than for a
  // specific value, and giving it well over a second, because the first tick
  // lands on the next second boundary — which can be up to a second away, plus
  // whatever a loaded runner adds. This is not a latency assertion: what is
  // being checked is that the value changes at all, and CI's runner-to-runner
  // spread on identical work is 13.6 s.
  const first = await clock.textContent();
  expect(first).toMatch(CLOCK_SHAPE);
  await expect(clock).not.toHaveText(first ?? "", { timeout: 5_000 });

  // And it is still a clock afterwards rather than having become something
  // else — the assertion that fails if a tick ever renders a partial reading.
  await expect(clock).toHaveText(CLOCK_SHAPE);

  // Nothing failed to render. This matters more here than on most routes: the
  // clock is the one thing in the chrome that calls into the trading calendar,
  // and the calendar **refuses** an instant outside 2024–2028 rather than
  // guessing. Left to propagate that refusal replaces the whole header through
  // its own ErrorBoundary, so a `role="alert"` here on a machine whose clock is
  // set past 2028 is precisely the failure `readMarketClock`'s typed `catch`
  // exists to prevent — caught by role, so it covers every boundary placement.
  await expectNothingFailedToRender(page);
});

test("the clock is on every route and does not restart when one changes", async ({
  page,
}) => {
  await page.goto("/");

  const clock = page
    .getByRole("banner")
    .getByText("Market clock", { exact: true })
    .locator("..")
    .getByText(CLOCK_SHAPE);

  // `AppHeader` is rendered once, outside `<Routes>`, so navigating must not
  // remount it. If it did, the clock would flash back to its mount value —
  // which is the same property `backend-recovery.spec.ts` asserts about the
  // health poll, arriving on a second consumer of the same arrangement.
  for (const name of [
    "Investigation Workspace",
    "Security Explorer",
    "Market Replay",
    "Market Overview",
  ]) {
    await page.getByRole("link", { name }).click();
    await expect(clock).toBeVisible();
    await expect(clock).toHaveText(CLOCK_SHAPE);
  }

  await expectNothingFailedToRender(page);
});
