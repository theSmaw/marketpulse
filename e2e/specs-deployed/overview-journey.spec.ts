import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";

// **Story 4.6's exit criterion, deployed** (Task 4.6.7): the landing page is a
// place you leave from.
//
// Until this file, `pnpm e2e:deployed` drove routing, the tracked universe, the
// two halves talking and the Security Explorer journey — **nothing in it ever
// landed on `/` and left it**, so a green deployed run after this story would
// have meant exactly what it meant before this story.
//
// ## One test, and structure rather than figures
//
// `security-explorer-journey.spec.ts`' two rules, for its reasons. Every extra
// test here is another page load against production after every merge, and the
// local suite owns the components far better: `overview-journey.spec.ts` drives
// both hands over a furnished frame, `overview-nothing-to-open.spec.ts` runs
// the one query over every state, and `overview-ranked-keyboard.spec.ts` owns
// the keyboard model. What **only** this suite can say is that the chain is
// wired together in the deployed environment — three hosts, two artefacts and a
// database, each able to break independently of the source those gates judged.
//
// **No figure is asserted**, and here that is not the zero-bar rule — the
// deployed store is backfilled nightly — but the mirror of it: a change, a
// price and a rank are properties of the session the deployment is in, and a
// post-merge check that pinned one would be red on a quiet tape and green on a
// busy one. What is asserted is that a **destination the page itself drew**
// opens the security it names.
//
// ## Which row is activated is an ENVIRONMENT fact, not a fallback locator
//
// `e2e/README.md` forbids *a pattern loose enough for a neighbouring element to
// satisfy, through a locator with a fallback* — and this is deliberately not
// that. The locator is exact and structural (`a[href*="/securities/"]` inside a
// named region); what varies is **which region has rows**, and that is a fact
// about the deployment rather than a looseness in the match:
//
//   - mid-session with a live tape, `Movers` draws ten ranked rows;
//   - with the market shut, the same region draws a **session** ranking off the
//     store's own closes, so it still has rows;
//   - a deployment whose store has no closes at all for the session the frame
//     names draws two empty lists — CI's permanent state, and a possible state
//     for a freshly provisioned environment.
//
// So the spec takes the **movers** region where it has rows and the **proxy
// strip** where it does not, prints which it took, and asserts the same thing
// either way. A hard requirement for a mover would make this check red exactly
// when the deployment is new — which is the worst possible moment for the one
// instrument that runs after a merge.
//
// ## Its own locators, on purpose
//
// `specs/` and `specs-deployed/` are **two directories** and they hold their
// own copies of the same locators; a grep over one finds neither the other's
// copy nor the fact that there is one (`e2e/README.md`, `docs/GAPS.md`). That
// cost a red deploy once, when the chrome moved the market feed into
// `AppFooter` and three local files were rescoped while
// `specs-deployed/two-halves.spec.ts` was missed. **Grep over `e2e/`, never
// `e2e/specs/`** — and in particular, anything that changes how a landing-page
// destination is drawn (`data-ticker`, the `href` shape, the region names
// `Movers` / `Market proxies`) has a second reader here.

const OVERVIEW = "/";

const region = (page: Page, name: string): Locator =>
  page.getByRole("region", { name });

/** Every security destination inside a region, exactly as the page drew it. */
const destinationsIn = (scope: Locator): Locator =>
  scope.locator('a[href*="/securities/"]');

test("the exit criterion, deployed: land on `/`, activate a destination, and the security page names it", async ({
  page,
}) => {
  await page.goto(OVERVIEW);

  // The page has settled on an answer before anything below reads it. `Market
  // breadth` is first in the DOM since Task 4.4.7 and says something in every
  // state, so it is the cheapest *this page rendered* assertion there is.
  await expect(region(page, "Market breadth")).toBeVisible();

  const movers = destinationsIn(region(page, "Movers"));
  const proxies = destinationsIn(region(page, "Market proxies"));

  // **Which surface, decided from the page.** `expect.poll` rather than a
  // single read: the overview frame arrives on the socket a moment after the
  // document, so a count taken on the first paint is a count of the reserved
  // state.
  await expect
    .poll(async () => (await movers.count()) + (await proxies.count()))
    .toBeGreaterThan(0);

  const ranked = await movers.count();
  const origin = ranked > 0 ? movers : proxies;
  const surface = ranked > 0 ? "Movers" : "Market proxies";
  // Printed rather than asserted, because it is a reading of the deployment
  // and this check's output is a rollback decision: a run that opened a proxy
  // is telling whoever reads it that the deployed store had no ranked rows.
  console.log(
    `[deployed] activating a destination in ${surface} (${String(ranked)} mover rows drawn)`,
  );

  // **The ticker is read out of the link that is about to be activated**, which
  // is the local suite's anti-fixture rule arriving where there is no fixture
  // at all: nothing in this file knows which security the deployment will
  // offer, so the address can only be asserted against the name the page drew.
  const link = origin.first();
  const symbol = (await link.innerText()).trim();
  expect(symbol, "the destination's own text is not a bare ticker").toMatch(
    /^[A-Z][A-Z.-]{0,9}$/u,
  );

  await link.click();

  await expect(page).toHaveURL(new RegExp(`/securities/${symbol}$`, "u"));

  // The identity block, which is the destination's own announcement of its
  // subject — `FRONTEND-STATE.md` §7's rule, and the thing this journey exists
  // to deliver a reader to. Never a figure.
  // **`exact: true` is load-bearing.** Playwright's `name` is a
  // case-insensitive **substring** match by default, and the symbol here is
  // whatever the deployment drew — measured on `/securities/T`, which the
  // curated universe holds, `{ name: "T" }` resolves to **seven** of the
  // page's nine `<h2>`s (`Abnormal-move indicators`, `Relative performance`,
  // `Tracked universe`, …) and strict mode refuses against a working page. `T`,
  // `F`, `C`, `V` and `A` are all real tickers, so a spec that reads its
  // symbol off the page cannot assume four letters.
  await expect(
    page.getByRole("heading", { level: 2, name: symbol, exact: true }),
  ).toBeVisible();

  // `PRODUCT_SPEC.md` §36 as one mechanical claim: `ErrorFallback` is the only
  // thing in this application carrying `role="alert"`, so a page with none has
  // not collapsed into a global error screen — on either page of the journey.
  await expectNothingFailedToRender(page);
});
