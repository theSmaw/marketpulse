import { REQUEST_ID_HEADER, apiError } from "@marketpulse/shared";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { expectNothingFailedToRender, readable } from "../support/app.js";
import { BARS_ROUTE_PATTERN } from "../support/pair.js";

// Every state the bar-series panel can be in, produced in a **real browser**
// from a named cause (Task 2.10.8).
//
// `security-series.spec.ts` drives the healthy path against the real pair and
// installs no interception, deliberately — that is the file that can see a CORS
// misconfiguration and a window resolved by the wrong clock. This one is its
// other half: the states a correct backend over a correct store will never
// produce, and the two marks that are properties of the *transport* rather than
// of any answer.
//
// ## Why these are intercepted and the healthy ones are not
//
// Story 1.13's split. `route.fulfill()` bypasses the browser's CORS check
// entirely, so a journey built on interception cannot see the one failure the
// deployed check exists for. What it *can* do is produce a 503, an incoherent
// body and a socket that never answers, none of which a working deployment will
// ever hand this page — and reviewing those states by breaking a real backend
// six ways is how a reviewer stops reviewing them.
//
// Where a body has to look real, it is the **real body with one field changed**
// — `route.fetch()` then `route.fulfill({ json })`. That is the same rule
// `apps/frontend/src/fixtures/` follows and for the same reason: a hand-written
// body gets a closed vocabulary wrong and the symptom is an unrelated state.
//
// ## What a green run here does not certify
//
//   - **Not that these states look right.** It asserts the sentences and the
//     controls. Contrast, the stale rail's dashes and the settle wash are
//     visual, and the workshop's `AllPermutations` grid is where a person
//     reviews them.
//   - **Not the data.** Nothing here has an opinion about a price, which is
//     what lets every test below pass on CI's store of 518 securities and zero
//     bars as well as on a backfilled one.

const SYMBOL = "NVDA";

/** The panel, by the region that holds it. */
function panel(page: Page) {
  return page.getByRole("region", { name: "Price" });
}

/**
 * The panel has settled on an answer — **either** answer.
 *
 * The shape `security-series.spec.ts` arrived at after three of its four tests
 * failed the gate: CI runs `pnpm migrate` and `pnpm universe` and deliberately
 * never `pnpm backfill`, because a backfill is metered and the gate has no
 * credentials. So every window on CI is a correct `empty` and the same window
 * locally is `partial`. Waiting for the union is what makes a file honest in
 * both.
 */
function anAnswer(page: Page) {
  return readable(panel(page), /Holding .* bars/).or(
    readable(panel(page), /No bars stored for this window/),
  );
}

test("an empty window reads as an answer, not as a broken product", async ({
  page,
}) => {
  // **The one state the CI gate produces for free, on every route, with no
  // interception at all** — which makes it the cheapest browser assertion in
  // this story and the one most worth making load-bearing. Measured against
  // both stores on 2026-09-10: a one- or two-session window is `empty` because
  // the current session has not opened and the nightly backfill has not taken
  // the one before it.
  //
  // The failure mode this guards is a reader deciding between *"this stock does
  // not exist"* and *"this product is broken"*, neither of which is true. So
  // the assertion is not that the words appear — it is that they say what was
  // asked for and why nothing is in it.
  await page.route(BARS_ROUTE_PATTERN, async (route) => {
    const response = await route.fetch();
    const body: unknown = await response.json();

    // Only the *shape* is forced: an empty answer is `bars: []` with
    // `covered: null`, which is the contract's one spelling of it and is what
    // `toBarSeries` refuses either half of. The requested window, the symbol
    // and the provenance are the server's own.
    await route.fulfill({
      response,
      json: emptied(body),
    });
  });

  await page.goto(`/securities/${SYMBOL}`);

  const region = panel(page);
  await expect(
    readable(region, /No bars stored for this window/),
  ).toBeVisible();

  // It still says what was asked for, in market time with the zone named. A
  // panel that dropped the window would leave "no data" with nothing to be
  // about.
  const detail = readable(region, /We asked for/);
  await expect(detail).toBeVisible();
  await expect(detail).toContainText(/E[DS]T/);
  await expect(detail).toContainText(/caught up overnight/);

  // And it is an **answer**: no control, no correlation id, nothing that reads
  // as a fault.
  await expect(region.getByRole("button")).toHaveCount(0);
  await expect(readable(region, /Reference/)).toHaveCount(0);

  await expectNothingFailedToRender(page);
});

test("a store that is down offers a retry and names a reference", async ({
  page,
}) => {
  // Named cause: `DATABASE_PORT=59999 node dist/index.js`, which produces a real
  // 503 carrying `SERVICE_UNAVAILABLE`. That is the one code
  // `isRetryableApiErrorCode` says yes to, and it is why this is the only
  // failure on this panel that carries a control.
  const requestId = "9c2e1b4e-7a52-4b1d-8f0b-3d8a6f04b571";
  let down = true;

  await page.route(BARS_ROUTE_PATTERN, async (route) => {
    if (!down) {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 503,
      contentType: "application/json",
      headers: {
        [REQUEST_ID_HEADER]: requestId,
        "access-control-expose-headers": REQUEST_ID_HEADER,
      },
      body: JSON.stringify(
        apiError(
          "SERVICE_UNAVAILABLE",
          "Market data is temporarily unavailable. Try again shortly.",
          requestId,
        ),
      ),
    });
  });

  await page.goto(`/securities/${SYMBOL}`);

  const region = panel(page);
  await expect(readable(region, /could not be read/)).toBeVisible();
  await expect(readable(region, /usually temporary/)).toBeVisible();

  // The whole correlation id, never a prefix. It is the one internal identifier
  // this product puts on screen, and a prefix is unquotable.
  await expect(readable(region, requestId)).toBeVisible();

  // The retry recovers the page with no reload, which is the property the
  // control exists for.
  down = false;
  await region.getByRole("button", { name: "Try again" }).click();
  await expect(anAnswer(page)).toBeVisible();

  // And the page never collapsed: §36's rule is that this degrades locally.
  await expect(
    page.getByRole("region", { name: "Tracked universe" }),
  ).toBeVisible();
  await expectNothingFailedToRender(page);
});

test("a body whose numbers disagree offers no retry, and says why not", async ({
  page,
}) => {
  // Named cause: our own server answering a 200 that this contract admits and
  // whose figures contradict each other. The shipped fixture takes it by
  // decrementing a source's `barCount` so the sources no longer sum to the
  // bars; this does the same to the real body.
  //
  // **It looks exactly like any other unreadable answer, deliberately**: the
  // diagnosis differs and the reader's options do not. The sentence naming
  // which check failed goes to the console with the request id, never to the
  // screen.
  await page.route(BARS_ROUTE_PATTERN, async (route) => {
    const response = await route.fetch();
    const body: unknown = await response.json();
    await route.fulfill({ response, json: miscounted(body) });
  });

  await page.goto(`/securities/${SYMBOL}`);

  const region = panel(page);
  await expect(readable(region, /could not be read/)).toBeVisible();
  await expect(readable(region, /will not change this answer/)).toBeVisible();

  // No control, because waiting cannot fix a server that will produce the same
  // body again. Offering one is a lie the reader pays for twice.
  await expect(region.getByRole("button")).toHaveCount(0);

  await expectNothingFailedToRender(page);
});

test("nothing arriving at all is a product state, not a blank panel", async ({
  page,
}) => {
  // Named cause: stop the backend. `route.abort()` is the closest a browser
  // test gets to it without taking the pair down for every other test in the
  // file.
  await page.route(BARS_ROUTE_PATTERN, (route) => route.abort("failed"));

  await page.goto(`/securities/${SYMBOL}`);

  const region = panel(page);
  await expect(readable(region, /No response from the service/)).toBeVisible();
  await expect(region.getByRole("button", { name: "Try again" })).toBeVisible();

  // No id: nothing arrived, so there was no response to have carried one. A
  // panel that showed one anyway would be inventing a support reference.
  await expect(readable(region, /Reference/)).toHaveCount(0);

  // The heading survives every failure. The thing that says what you are
  // looking at must not be the thing that disappears when looking at it fails.
  await expect(region.getByRole("heading", { name: SYMBOL })).toBeVisible();
  await expectNothingFailedToRender(page);
});

test("a security we no longer track is marked, and keeps its bars", async ({
  page,
}) => {
  // Named cause, and it is reversible: remove a symbol from
  // `apps/backend/src/universe.ts` and run `pnpm universe` — the loader
  // untracks the row rather than deleting it — or set `status` directly.
  // Neither is a thing to do to a shared store from a browser test, so this
  // changes the one field on the real body.
  //
  // **The rendering this produces had never been executed before Task
  // 2.10.8.** `securityStatus` is a field on three of the six states rather
  // than a member of its own, which is exactly the shape a states checklist
  // walks past.
  await page.route(BARS_ROUTE_PATTERN, async (route) => {
    const response = await route.fetch();
    const body: unknown = await response.json();
    await route.fulfill({ response, json: untracked(body) });
  });

  await page.goto(`/securities/${SYMBOL}`);

  const region = panel(page);

  // On the subject, beside the ticker, because it qualifies the **security**
  // and not this answer — it stays true under a partial series, an empty one,
  // and one being refreshed.
  await expect(readable(region, "Untracked")).toBeVisible();
  await expect(
    readable(region, /MarketPulse no longer tracks this security/),
  ).toBeVisible();

  // Not a 404 and not an absence: the store keeps an untracked security's bars
  // and the route still serves them, so whatever this store holds is still the
  // answer. On CI that is `empty`; locally it is `partial`.
  await expect(anAnswer(page)).toBeVisible();

  await expectNothingFailedToRender(page);
});

test("a held answer says a newer one is coming, and stops saying it", async ({
  page,
}) => {
  // **The cached paint, from a real user's route through the application**, and
  // getting here was a finding rather than a formality.
  //
  // The obvious route — `/securities/NVDA` → `/securities/AMD` → back — does
  // not work in a browser and cannot: each of those is a `page.goto`, which is
  // a **document** navigation, and a document navigation reloads the bundle and
  // takes the module-level cache with it. Nothing in the interface links one
  // security to another yet; that is Story 2.11's search and its click-through.
  //
  // What does exist is the header's primary navigation, which is client-side.
  // Leaving this route and coming back **unmounts and remounts the panel**
  // inside one document, which is the transition the cache exists for: the
  // second mount reads the entry for the same request and paints it in its
  // first commit while the accompanying request is still in flight. The bare
  // `/securities` asks for `DEFAULT_SYMBOL`, so the key is the same one the
  // first visit stored.
  //
  // The delay does not produce the state — the state is produced by the
  // navigation. It slows the answer so a commit that would otherwise last a few
  // milliseconds against a local pair can be observed at all.
  let slow = false;

  await page.route(BARS_ROUTE_PATTERN, async (route) => {
    if (slow) await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.continue();
  });

  await page.goto(`/securities/${SYMBOL}`);
  await expect(anAnswer(page)).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Primary" });
  await nav.getByRole("link", { name: "Market Overview" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Market Overview" }),
  ).toBeVisible();

  slow = true;
  await nav.getByRole("link", { name: "Security Explorer" }).click();

  const region = panel(page);

  // The held answer is on screen **and marked**, both at once. Either half
  // alone is the defect: an unmarked held answer is numbers a reader cannot
  // date, and a mark with no numbers is the flash of nothing this cache exists
  // to prevent.
  await expect(readable(region, /Refreshing —/)).toBeVisible();
  await expect(anAnswer(page)).toBeVisible();

  // And the mark goes when the answer lands. A mark that outlived its request
  // would be a standing lie about a panel that is up to date.
  await expect(readable(region, /Refreshing —/)).toHaveCount(0, {
    timeout: 15_000,
  });

  await expectNothingFailedToRender(page);
});

test("the panel's live region is the same node before and after it speaks", async ({
  page,
}) => {
  // **The property a text assertion cannot see**, and the one that decides
  // whether anything is announced at all: a live region added at the same
  // moment as its content is not reliably announced, and one that is *removed*
  // announces nothing. Task 2.4.3 shipped exactly that defect on the universe
  // table and this is the same instrument, pointed at the second region.
  await page.route(BARS_ROUTE_PATTERN, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });

  await page.goto(`/securities/${SYMBOL}`);

  // Scoped to the region, because this page has **two** polite live regions
  // since Task 2.10.8 — one per subject, each naming its own subject, so a
  // screen reader queueing them in an order neither component controls still
  // hands a listener two complete sentences.
  //
  // **And `.first()` since Task 2.12.6**, which put a third inside this panel:
  // the chart's reading has a region of its own, and it is the one that speaks
  // when a **key** is pressed rather than when a request lands. The panel's is
  // first in the DOM because it is the first child of the panel, above the
  // subject — which is where a live region belongs when it is about the whole
  // of what follows it.
  const status = panel(page).getByRole("status").first();

  // Empty before the first answer: arriving at a page is not a change, so a
  // loading sentence would only be a second copy of the visible line.
  await expect(status).toHaveText("");

  await status.evaluate((element) => {
    (window as unknown as { seriesAnnouncer?: Element }).seriesAnnouncer =
      element;
  });

  // The sentence names its subject, which is what makes it complete beside a
  // sentence about 518 securities.
  await expect(status).toHaveText(new RegExp(`^${SYMBOL}: `));

  const sameNode = await status.evaluate(
    (element) =>
      element ===
      (window as unknown as { seriesAnnouncer?: Element }).seriesAnnouncer,
  );
  expect(sameNode, "the live region was recreated rather than updated").toBe(
    true,
  );

  // It is `status` and never `alert`. `role="alert"` is `ErrorFallback`'s, so
  // an alert here would be indistinguishable from a render failure to the one
  // assertion this suite makes on every route.
  await expectNothingFailedToRender(page);
});

/**
 * The real body, emptied.
 *
 * `bars: []` **and** `covered: null` together, because the contract makes them
 * one fact and `toBarSeries` refuses either without the other. Every source's
 * `barCount` goes to zero with them — sources that account for bars that are
 * not there is the *incoherent* state, which is a different test — and the
 * sources themselves stay, because a real empty answer keeps them: the recorded
 * `empty.json` carries one source reporting `barCount: 0`.
 */
function emptied(body: unknown): unknown {
  const answer = body as {
    series: {
      bars: unknown[];
      coverage: { covered: unknown };
      provenance: { sources: { barCount: number }[] };
    };
  };

  answer.series.bars = [];
  answer.series.coverage.covered = null;
  for (const source of answer.series.provenance.sources) source.barCount = 0;
  return answer;
}

/**
 * The real body, with one source claiming a bar it did not deliver.
 *
 * The same single-field derivation `incoherent.json` uses, in the direction that
 * works whatever this run's store holds. That fixture *decrements* a count,
 * which needs a source with bars in it; incrementing contradicts an empty answer
 * too — a source reporting one bar over a series of none — so this one test
 * covers the CI store and a backfilled one with no branch between them.
 *
 * Every closed vocabulary in the body stays valid, which is the point:
 * `isBarSeriesResponse` accepts it and `toBarSeries` refuses it, so the state
 * reached is `answered-badly` by way of the coherence check rather than by way
 * of the guard.
 */
function miscounted(body: unknown): unknown {
  const answer = body as {
    series: { provenance: { sources: { barCount: number }[] } };
  };

  const [source] = answer.series.provenance.sources;
  if (source !== undefined) source.barCount += 1;
  return answer;
}

/** The real body, for a security the universe no longer follows. */
function untracked(body: unknown): unknown {
  const answer = body as { securityStatus: string };
  answer.securityStatus = "untracked";
  return answer;
}
