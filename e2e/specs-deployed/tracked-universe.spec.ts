import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { reportAxe } from "../support/axe.js";
import {
  deployedBackendOrigin,
  deployedFrontendOrigin,
} from "../support/deployed.js";

// **The first deployed page in this product whose content arrives over the
// network** (Task 2.4.6), and the first thing added to this suite since it was
// built.
//
// ## Why this is here at all, given `two-halves.spec.ts` exists
//
// Task 2.4.6's brief expected the answer to be yes and gave a reason that does
// not survive contact: it said a wrong `VITE_API_BASE_URL` "gives a page that
// loads and shows nothing", which is already caught deployed, **at the cause**,
// by `two-halves.spec.ts` asserting which origin the page's own request went
// to. A second spec asserting that same one value would add a request to
// production and no signal.
//
// Two things make this file worth its cost anyway, and neither is that one.
//
// **Nothing deployed asserts that any page renders DATA.** `two-halves` reads
// `/health`, whose body is three fields the server makes up about itself;
// `host-routing` deep-loads `/securities` and asserts the `<h1>`, which a page
// with an empty table satisfies perfectly. So the whole read path this story
// built — Postgres, `selectFrom`, the wire contract, the fetch, the table —
// has been verified deployed by a person looking at it, once, and by no
// instrument. That is the gap.
//
// **And `two-halves`'s origin assertion does not cover this request.** It
// filters on `pathname === "/health"` — correctly, that is what it is about —
// so the `/securities` request is unasserted anywhere. Today both come from
// one `API_BASE_URL` and one implies the other; the day they do not, this is
// where it shows.
//
// ## The property that makes this route different from every other one
//
// **`/securities` is an application route AND an API path**, which nothing else
// in this product is. Task 1.12.7 measured that Azure Static Web Apps'
// `navigationFallback` is a URL-pattern rule rather than an `Accept` rule, and
// it holds here: the deployed frontend answers `/securities` with **200
// `index.html` at 1,101 B, byte-identical under `Accept: application/json` and
// `Accept: text/html`**, while `/assets/securities` 404s at both. Re-measured
// for this task rather than inherited.
//
// So a `VITE_API_BASE_URL` pointing at the frontend's own origin does not fail
// to connect here — it gets a **200 that is not this service**, and the page
// renders `answered-badly`. The last test below asserts that host behaviour
// directly, because it is the precondition for that state and it is a property
// of a platform setting no file in this repository holds.
//
// **One correction, because Task 2.4.6's own amendment gets it backwards.**
// That amendment says the same misconfiguration "produces `unreachable` on the
// health indicator", making the two indicators disagree diagnostically. It does
// not. Task 1.12.7 measured the deployed frontend's own origin answering
// `/health` with the same 200 `index.html`, which the health client reads as
// `degraded` / `unreadable-body` — "something answered and it was not this
// service", the same conclusion this page reaches. **The two indicators agree**,
// and the argument for this file rests on the two bullets above rather than on
// a disagreement that does not happen.
//
// ## What a green run here does not certify
//
//   - **Not that the universe is correct.** It asserts the page rendered what
//     the deployed API returned, and that the shape is the tracked universe.
//     Whether those are the right securities is `apps/backend`'s database suite
//     and Story 2.3's loader; no browser can tell a correct universe from a
//     plausible one.
//   - **Not a count.** Deliberately. The universe is curated and is meant to
//     grow to §6's 500, and Task 2.4.6 was itself run across a window in which
//     the tracked count was 100 and the row count 101. A literal here would go
//     red on an ordinary edit to a data file, which is a gate reporting a
//     decision as a defect.
//   - **Not accessibility.** `reportAxe`, not a gate, for the reason
//     `support/axe.ts` records: a red post-deploy result is a rollback
//     decision and a contrast ratio is not a rollback.

const SECURITIES = "/securities";

/** Every `/securities` request URL the page's own JavaScript issues, in order. */
function collectSecuritiesRequests(page: Page): readonly string[] {
  const urls: string[] = [];

  page.on("request", (request) => {
    // Origin-agnostic on purpose: the whole point is to catch a request that
    // went somewhere it should not have, so filtering by origin would filter
    // out the failure. The document navigation is excluded by resource type
    // rather than by URL, because on THIS route the document and the endpoint
    // share a pathname — which is the property this file exists for.
    if (request.resourceType() === "document") return;
    if (new URL(request.url()).pathname === SECURITIES)
      urls.push(request.url());
  });

  return urls;
}

test("the deployed page renders the tracked universe from the deployed database", async ({
  page,
}) => {
  await page.goto(SECURITIES);

  const region = page.getByRole("region", { name: "Tracked universe" });
  await expect(region).toBeVisible();

  // The table by role with its five column headers in order, asserted as a list
  // so a column silently disappearing is caught as well as one being renamed.
  const table = region.getByRole("table");
  await expect(table).toBeVisible();
  await expect(table.getByRole("columnheader")).toHaveText([
    "Symbol",
    "Name",
    "Industry",
    "Kind",
    "Minute-bar history",
  ]);

  // **Rows, which is the assertion nothing deployed has ever made.** A count
  // would be wrong here (see the header); what is asserted is that the table is
  // not empty, because "empty" is exactly what a migrated-but-never-seeded
  // database, a wrong backend and a filtered query all produce.
  await expect(table.getByRole("row").nth(1)).toBeVisible();

  // A sector band and a row inside it, by role and accessible name. These are
  // the two structures Task 2.4.4 built the page around, and they are the
  // difference between "the API answered" and "the page understood the answer":
  // the band is derived from `SECTORS` and `SECTOR_ETFS` in `packages/shared`,
  // so it is the first thing on a deployed page whose correctness depends on
  // the shared package having been rebuilt.
  await expect(
    region.getByRole("rowheader", {
      name: /^Technology Benchmark XLK \d+ securities$/,
    }),
  ).toBeVisible();

  const apple = region.getByRole("row", { name: /^AAPL / });
  await expect(apple.getByRole("rowheader", { name: "AAPL" })).toBeVisible();
  await expect(apple.getByRole("cell", { name: "Apple Inc." })).toBeVisible();

  // And the market proxies band, which is the union's two meanings of a null
  // sector surviving all the way to a deployed screen: an index ETF belongs to
  // no sector, and the page says so in words rather than leaving a gap.
  await expect(
    region.getByRole("rowheader", {
      name: /^Market proxies Whole-market ETFs, which belong to no sector \d+ securities$/,
    }),
  ).toBeVisible();

  // **What we hold, deployed** (Task 2.8.9), and it clears this suite's bar for
  // a reason narrower than "the column exists".
  //
  // This is the newest field on the widest-read contract in the product, and it
  // travels a path no other deployed instrument covers end to end: the deployed
  // ledger, a new key on the envelope, a **stricter predicate** — `coverage` is
  // required where `provenance` is optional — the deployed bundle's parse, and
  // a render. A backend and a frontend that disagree about that field do not
  // produce a missing column; they produce a page reading *something answered
  // and it was not this service*, because `api-client.ts` maps a body its
  // predicate refuses to `unreadable-body`. So this asserts the one thing that
  // separates "the deployed halves agree" from "the deployed halves are the
  // same age", and it costs production nothing: it rides the page load two
  // assertions above it.
  //
  // **No number, and no claim that the store is full.** The deployed store's
  // depth is a property of when the backfill last ran, and a red post-deploy
  // result is a rollback decision — an emptier store than expected is not a
  // rollback, it is a `pnpm bars:backfill`. Both honest renderings satisfy this.
  await expect(
    region.getByRole("row", {
      name: /^AAPL .*(\d+(\.\d+)?(y|mo|d) from \d{4}-\d{2}-\d{2}|No history yet)$/,
    }),
  ).toBeVisible();

  await expectNothingFailedToRender(page);
});

test("the deployed page fetches its data from the backend rather than from itself", async ({
  page,
}) => {
  const requests = collectSecuritiesRequests(page);

  await page.goto(SECURITIES);

  // The table having rendered is what proves the request was made AND answered,
  // so this waits on the page rather than polling the array.
  await expect(
    page.getByRole("region", { name: "Tracked universe" }).getByRole("table"),
  ).toBeVisible();

  expect(
    requests.length,
    "the deployed page made no /securities request. Either the artefact " +
      "served is not this application, or the request was blocked before it " +
      "was issued.",
  ).toBeGreaterThan(0);

  // **The assertion.** On every other route a request to the page's own origin
  // would be an obvious mistake; on this one it is a 200 carrying `index.html`,
  // because the host's `navigationFallback` answers this pathname — so the
  // failure is silent at the network layer and only visible here.
  expect(
    requests.map((url) => new URL(url).origin),
    "every /securities request the deployed page made must go to the backend " +
      "VITE_API_BASE_URL named. The frontend's OWN origin is the dangerous " +
      "wrong answer here: it returns 200 index.html rather than refusing, so " +
      "nothing upstream of the page notices.",
  ).toEqual(requests.map(() => new URL(deployedBackendOrigin).origin));
});

test("the deployed host answers /securities with the application, which is why the wrong origin is silent", async ({
  page,
}) => {
  // The precondition for the test above, asserted directly rather than assumed,
  // because it is a property of `staticwebapp.config.json`'s `navigationFallback`
  // — a platform behaviour that no unit test can reach and that the local dev
  // server gets differently (`vite preview` splits on `Accept`; this host splits
  // on path).
  //
  // Written as an assertion rather than a comment so that the day the fallback
  // is narrowed — or the day `/securities` is added to `exclude` — this fails
  // and somebody has to decide what the suite now means.
  const asJson = await page.request.get(SECURITIES, {
    headers: { Accept: "application/json" },
  });
  const asHtml = await page.request.get(SECURITIES, {
    headers: { Accept: "text/html" },
  });

  expect(asJson.status()).toBe(200);
  expect(asHtml.status()).toBe(200);

  // Byte-identical at both, which is the whole difference from `vite preview`
  // and the reason this is a URL-pattern rule rather than a content negotiation.
  expect(await asJson.body()).toEqual(await asHtml.body());
  expect(await asJson.text()).toContain("<!doctype html>");

  // And the exclusion still holds, so the fallback is scoped rather than
  // blanket — the configuration Task 1.11.4 chose, still configured.
  const excluded = await page.request.get("/assets/securities");
  expect(excluded.status()).toBe(404);
});

test("the deployed securities page's accessibility figures match the pre-merge gate's", async ({
  page,
}) => {
  await page.goto(SECURITIES);

  // Waits for the table, so the reading is taken on the loaded state rather
  // than on the skeleton — and `reportAxe` settles finite animations itself,
  // which is what makes this figure comparable to the gate's rather than a
  // measurement of Task 2.4.4's 240 ms entrance.
  await expect(
    page.getByRole("region", { name: "Tracked universe" }).getByRole("table"),
  ).toBeVisible();

  await reportAxe(
    page,
    `the deployed securities route, served from ${deployedFrontendOrigin}`,
  );
});
