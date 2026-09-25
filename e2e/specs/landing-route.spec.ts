import { BACKEND_STATUSES } from "@marketpulse/shared";
import { expect, test } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";

// The first journey, and deliberately the only one in this file (Task 1.13.2).
//
// It is the smallest thing that is genuinely a *journey* rather than a render:
// a browser asks a real host for the landing route, a real bundle boots, a real
// router resolves it, and what a user is left looking at is the chrome and
// PRODUCT_SPEC.md §9's four named areas. Every level below this one stops short
// of at least one of those — `app.inject()` has no socket, jsdom is not a
// browser, and neither has ever seen the built module graph load over HTTP.
//
// **What it asserts on, and what it must not.** Roles and accessible names,
// exactly as every component test here does. The must-not-assert list Story 1.9
// measured applies unchanged and a browser makes every item on it easy to write
// and none of them true: not colour, not a `useId()` value, not a DOM snapshot
// of a route, not a single element's text where a component splits it, and not
// latency.
//
// **The backend indicator's *state* is deliberately not asserted here.** The
// spec checks that the region renders one of the words the vocabulary admits;
// which one it is, and from which named cause, is Task 1.13.3's whole subject.
// Asserting `healthy` here would put the pair's health into the one spec whose
// job is to prove the harness works, and it would fail for a reason that is not
// this spec's.
//
// The words come from `BACKEND_STATUSES` rather than being written out, and
// that import is why the specs are a **workspace package** rather than a bare
// root-level directory: pnpm links a workspace package only into packages that
// declare it, so a home that could not declare this dependency would have
// forced exactly the duplication `packages/shared` exists to prevent (Task
// 1.13.1).
//
// Two things about the status labels that a selector gets wrong by default,
// both handed over by Task 1.12.7. The chrome holds **two** labelled status
// cells — `Market feed` and `Backend service`, both in `AppFooter` since
// 2026-09-16 — and on a correct first run **both read `checking` at once**
// while their requests settle (Task 2.6.7 made the market feed read from the
// backend too). So a selector matching a status word without scoping to its
// cell is matching the wrong one. And the words are rendered lowercase and
// uppercased by CSS, so the accessible text is `healthy`, not `HEALTHY`.

// §8.1's contents, in the vocabulary it gave them. Each is a `region` landmark
// named by the `<h2>` it already has, so the accessible name and the visible
// heading are one fact rather than two.
//
// **Seven since Task 4.1.3, from four.** §9's sketch places four; §8.1 lists
// two more — the index/ETF summary and sector performance — that Task 1.5.4
// deliberately left unplaced, *because where they belong is a question about
// their shape, and Epic 4 is the first thing that will know it*. Epic 4 knew,
// and drawing the screen turned up a seventh with no home in §9 either: the
// movers, which Epic 4's scope lists and which are **not** the unusual-activity
// feed — *unusual is not largest*, and a mover list standing in for an anomaly
// feed teaches a reader the wrong thing on the one screen whose job is
// explaining this product.
const REGION_NAMES = [
  "Market summary",
  "Market topology",
  "Sector performance",
  "Movers",
  "Unusual activity",
  "Market breadth",
  "Current investigations",
] as const;

// The chrome's three status micro-labels, and **which landmark each is in**
// since 2026-09-16, which is the point of the pairing rather than bookkeeping.
//
// They were all three in a status strip under the masthead until then. The
// clock stayed in the `banner` when that strip was dismantled, because it
// answers a question a person asks while reading a price; the other two moved
// to `AppFooter`'s `contentinfo` bar, because they answer *is this working* and
// *where do the numbers come from*, which are asked once. Asserting the pairing
// rather than a flat list is what makes this spec able to fail if a later
// change quietly puts one back in the wrong end of the chrome — a flat
// `page.getByText` over all three would pass either way.
//
// These are labels rather than landmarks — plain text beside each indicator —
// which is why they are matched as text and the regions below are matched by
// role.
const STATUS_LABELS = [
  { label: "Market feed", landmark: "contentinfo" },
  { label: "Backend service", landmark: "contentinfo" },
] as const;

// The clock has **no micro-label** and is asserted by the only thing it renders
// that nothing else does: a `hh:mm:ss` figure, in the banner.
//
// It had one until 2026-09-16 and it was in this list. Dropping the label was a
// layout decision — see `AppHeader` — and it is worth noting what it does to
// this spec rather than letting the line quietly become two: the pairing below
// still fails if a labelled status fact turns up in the wrong end of the
// chrome, and the clock is now asserted by its **shape**, which is a stronger
// assertion than its label ever was. A label can be present over a cell that
// renders nothing.
const CLOCK_SHAPE = /^\d{2}:\d{2}:\d{2}$/u;

test("the landing route serves the chrome and PRODUCT_SPEC §8.1's seven regions", async ({
  page,
}) => {
  await page.goto("/");

  // --- The chrome ---
  //
  // One banner, and the product name inside it is a `<p>` rather than an
  // `<h1>` on purpose (Task 1.5.2): every route renders its own `<h1>`, and two
  // on a page leaves a screen-reader user with no single answer to "what is
  // this page?". Asserting it as a heading here would be asserting the bug.
  const banner = page.getByRole("banner");
  await expect(banner).toBeVisible();
  await expect(banner.getByText("MarketPulse", { exact: true })).toBeVisible();

  // The status bar is the chrome's second landmark, and it is asserted as one:
  // a screen-reader user navigating by landmark can reach the two facts about
  // whether the software is working without reading the page.
  await expect(page.getByRole("contentinfo")).toBeVisible();

  for (const { label, landmark } of STATUS_LABELS) {
    await expect(
      page.getByRole(landmark).getByText(label, { exact: true }),
    ).toBeVisible();
  }

  await expect(banner.getByText(CLOCK_SHAPE)).toBeVisible();

  // The navigation is named, so it is distinguishable from any other `nav` the
  // application grows, and the four destinations are §8's four experiences.
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link")).toHaveText([
    "Market Overview",
    "Investigation Workspace",
    "Security Explorer",
    "Market Replay",
  ]);

  // `NavLink` sets `aria-current="page"` on the match itself, so the accessible
  // state and the visible one are the same fact. This is the assertion that the
  // router resolved `/` rather than merely that the chrome rendered.
  await expect(
    nav.getByRole("link", { name: "Market Overview" }),
  ).toHaveAttribute("aria-current", "page");

  // The status strip's regions are plain `<div>`s rather than landmarks — they
  // are three cells of the chrome, not three areas of the page — so there is no
  // role to scope by and the label's own parent is what stands in for one. That
  // is a real coupling to the strip's shape and it is the cheapest honest
  // option: the alternative is matching a status word unscoped, which matches
  // the wrong indicator half the time.
  //
  // `checking` is in the set because it is what every page load renders until
  // the first poll settles. It is not a `BackendStatus` member and must not be
  // added to one — it is a fact about this client's own startup, which is
  // exactly why Task 1.12.3 kept it out of the vocabulary and put a boolean
  // beside it instead.
  //
  // **It matches an element whose whole text is the word, not the region's
  // text**, and the first draft of this line got that wrong in a way worth
  // keeping: `toContainText(/\b(healthy|…)\b/)` on the region fails, because
  // the region's text is `Backend servicehealthy` with no separator between the
  // label and the word, so there is no word boundary to anchor to. That is
  // Story 1.9's "do not assert on a single element's text where a component
  // splits it" arriving from the other direction — the concatenation a screen
  // reader is handed is not the string the elements read as.
  // The status bar rather than the banner since 2026-09-16 — see
  // `AppFooter`. The chrome is two landmarks now, and this fact is in the
  // second one.
  const serviceRegion = page
    .getByRole("contentinfo")
    .getByText("Backend service", { exact: true })
    .locator("..");
  await expect(
    serviceRegion.getByText(
      new RegExp(`^(${[...BACKEND_STATUSES, "checking"].join("|")})$`),
    ),
  ).toBeVisible();

  // --- The route ---
  await expect(
    page.getByRole("heading", { level: 1, name: "Market Overview" }),
  ).toBeVisible();

  // --- §8.1's seven regions ---
  //
  // By role and accessible name, and the count is asserted as well as the
  // names: an eighth region appearing unnoticed is the failure a per-name loop
  // alone would not catch.
  const regions = page.getByRole("region");
  await expect(regions).toHaveCount(REGION_NAMES.length);

  for (const name of REGION_NAMES) {
    await expect(page.getByRole("region", { name })).toBeVisible();
  }

  // Nothing failed to render. `ErrorFallback` is what stands in the place of
  // what failed, and there are three places it can appear on this route — the
  // header, the route outlet and inside each region. None of them should have.
  //
  // By **role** rather than by title (amended by Task 1.13.3): `role="alert"`
  // is what every fallback carries wherever it is placed, so one query covers
  // every boundary this application has and any it grows. A title list goes
  // stale the day a fourth boundary is added — silently, and in the passing
  // direction.
  await expectNothingFailedToRender(page);
});
