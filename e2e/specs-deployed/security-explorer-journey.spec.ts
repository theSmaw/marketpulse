import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { AN_EMPTY_PLOT, expectNothingFailedToRender } from "../support/app.js";

// **The epic's exit criterion, asserted on every deploy** (Task 2.14.9).
//
// Story 2.13's close executed this journey deployed — cold, from five deep
// links, at three viewports — and that is a one-off observation by a person.
// Until this file, `pnpm e2e:deployed` was three spec files and 16 tests about
// routing, the tracked universe and the two halves being wired together:
// **nothing in it drove the window control, the rail, either plot or the
// crosshair**, so a green deployed run after Story 2.13 meant exactly what it
// meant before Story 2.13.
//
// ## One journey, not six assertions about six components
//
// The local suite owns component behaviour and owns it far better than this one
// could: seventeen spec files drive the control, the rail, the plots, the
// crosshair, the refusals and the failure states against a pair the runner
// started. What **only** this suite can say is that the whole chain is wired
// together **in the deployed environment** — three hosts, two artefacts and a
// database, each of which can break independently of the source that
// `pnpm verify` and `pnpm e2e` judged.
//
// So this is deliberately one long test rather than six short ones. Every
// additional test here is another page load against production after every
// merge, and six tests asserting six components would re-assert, over a
// network, what a gate already asserted before the merge.
//
// ## What survives a zero-bar store, and what does not
//
// This suite can be pointed at any deployment, and the two stores a spec in
// this repository can meet sit on opposite sides of nearly every figure on this
// page. The rule that falls out is the **structure/figures** distinction, and
// the assertions below are sorted by it.
//
// **Asserted unconditionally, because they are structure:**
//
//   - every region `PRODUCT_SPEC.md` §8.3 names is present **and says
//     something** — `PROVENANCE.md` §12's finding, which was a Volume region
//     rendering nothing at all. It survives a zero-bar store, a backfilled one
//     and a deployed one identically, because it is a claim about regions being
//     non-empty rather than about what any of them says;
//   - both plots hang on **one axis** — the same left edge and the same width,
//     which two components each resolving their own axis would get right only
//     at the widths somebody measured;
//   - the window control drives both, the address carries the window, and the
//     pressed window is the checked one;
//   - the source note's **classification clause**, whose data is the universe
//     answer rather than the bars, so it draws on a page holding no bars at all
//     — the commonest page in the browser suite;
//   - nothing on the page failed to render.
//
// **Gated on the store having bars, and the spec says so where it gates:** the
// crosshair. A plot with no bars has nothing to read under a pointer, and
// asserting a reading would be an assertion about the runner's data wearing a
// sentence that reads like structure.
//
// **Deliberately not asserted at all, and this is the half most likely to cost
// a round trip:**
//
//   - **the source note's adjustment, retrieval and feed clauses.** Every one
//     is a claim about bars the runner may not have. That the note is *present*
//     is fine; that it says `Unadjusted` is an assertion about data.
//   - **the coverage sentence** — *Holding 1,560 bars, through …* — which is
//     absent from the other end. It renders only under a `partial` answer, and
//     a healthy deployed store is backfilled nightly and answers a named window
//     in **full**. A deployed spec asserting it would be red exactly when the
//     store is healthiest, which is the worst signal to wire into a post-merge
//     check.
//   - **either vacancy sentence**, for the same reason from the same end: a
//     current store draws neither, because there is no vacancy on the page.
//   - **the volume plot's deferral** — *No volume to draw. The Price region
//     says why.* — which renders only under `refused` or `failed`. Its absence
//     deployed is the environment being healthy rather than a state gone
//     missing.
//   - **any figure.** A close price is a property of the session the backfill
//     last reached, and a stale store is a `pnpm backfill` rather than a
//     rollback.
//   - **any duration.** This runs from one machine over one link, after a
//     merge, against a shared environment, and `PRODUCT_SPEC.md` §28's known
//     breach on this very page — one cold-load task of 50–76 ms, the 518-row
//     universe table rather than the chart — has a named owner in Epic 14. A
//     timing assertion here would be a check that teaches everybody to re-run
//     it.

const SECURITIES = "/securities";

/** The security the curated universe always holds, reached by its name. */
const QUERY = "nvid";
const SYMBOL = "NVDA";

/** Every region `PRODUCT_SPEC.md` §8.3 names, in the order the page draws them. */
const REGIONS = [
  "Price",
  "Abnormal-move indicators",
  "Volume",
  "Relative performance",
  "Connected securities",
  "Relevant filings",
  "Anomaly history",
  "Tracked universe",
] as const;

function priceRegion(page: Page): Locator {
  return page.getByRole("region", { name: "Price" });
}

function volumeRegion(page: Page): Locator {
  return page.getByRole("region", { name: "Volume" });
}

/**
 * The plot itself, by what it contains rather than by a class name.
 *
 * `security-price-chart.spec.ts`' locator verbatim: a CSS-module hash changes
 * whenever the file does, `Icon` also renders an SVG and appears in this region
 * in the retryable-failure state, and the chart's SVG is the only one here with
 * `<line>` elements in it.
 */
function plot(region: Locator): Locator {
  return region.locator("svg:has(line)");
}

function control(page: Page): Locator {
  return page.getByRole("radiogroup", { name: "Time window" });
}

function cell(page: Page, name: string): Locator {
  return control(page).getByRole("radio", { name });
}

/**
 * The panel has settled on an answer — **either** answer.
 *
 * The local suite's helper and its reason: a populated window states its
 * figures and an empty one says there is nothing stored for it, both are 200s,
 * and which one a run lands in is a property of the store rather than of the
 * code. `AN_EMPTY_PLOT` is the union of the two vacancy sentences, which is
 * what a spec may assert where the individual sentence is not.
 */
function anAnswer(page: Page): Locator {
  return priceRegion(page)
    .getByText(/(^| )Open$/)
    .or(priceRegion(page).getByText(AN_EMPTY_PLOT))
    .first();
}

/** Did this deployment's store answer with bars in it? */
function hasBars(page: Page): Promise<boolean> {
  return priceRegion(page)
    .getByText(/(^| )Open$/)
    .first()
    .isVisible();
}

/**
 * A market instant as both readouts spell it — `Sep 10 · 15:59 EDT`.
 *
 * **No word boundary after the zone**, and that is a finding rather than an
 * omission. A locator matches against the element's whole text, and the strip
 * concatenates its figures with no separator — `Sep 14 · 15:59 EDTO211.18…` —
 * so `EDT\b` has a `T` followed by an `O` and matches nothing. It is
 * `support/app.ts`' `Backend servicehealthy` trap on a second surface: the
 * string the elements read as is not the string a reader sees.
 */
const INSTANT = /\b[A-Z][a-z]{2} \d{1,2} · \d{2}:\d{2} (?:EDT|EST)/;

/**
 * A plot's readout strip, and **what a reader can see in it**.
 *
 * Two wrong locators were tried first, and both are the obvious thing to reach
 * for:
 *
 *  1. **The label, exactly** — `Volume` for the volume strip. It also matches
 *     the region's own heading, which is the word the region is named after, so
 *     it resolves to two nodes and fails strict mode against a page that is
 *     working. Caught deployed rather than argued.
 *  2. **The whole region's text.** Each strip holds three rows in one grid
 *     cell: the live one and **two** hidden readings that reserve the row's
 *     height so the figures beneath do not move when a pointer enters the plot.
 *     `textContent` includes all three, so a reading and the reservation of a
 *     different bar arrive as one string.
 *
 * What works is the strip's own paragraph, read with `innerText` — which
 * respects `visibility: hidden` and therefore returns the one row a reader can
 * see — located as **the paragraph carrying an instant that nothing points
 * at**. The `:not([id])` is the load-bearing half and it is a third finding:
 * the chart's text alternative is a paragraph too, it names the busiest
 * minute, and it matches the instant pattern exactly. What separates them is
 * that the alternative is referenced — by `aria-describedby` — and so carries
 * an `id`, while the readout is referenced by nothing. A CSS-module hash would
 * have told them apart today and is not a contract; being pointed at is.
 *
 * The locator is left un-narrowed beyond that, so strict mode enforces the
 * uniqueness this relies on rather than a `.first()` quietly picking one.
 */
async function readableReading(region: Locator): Promise<string> {
  return region.locator("p:not([id])").filter({ hasText: INSTANT }).innerText();
}

/**
 * The market instant a readout is stating, as a string, or `null`.
 *
 * Compared between the two plots rather than asserted as a value — which
 * instant a pointer lands on is a property of the store's last session and of
 * where the pointer went, and neither is something a post-merge check may pin.
 * What it may say is that **one pointer produces one reading**, which is the
 * whole of the shared-axis claim as a reader experiences it.
 */
function instantIn(text: string): string | null {
  return INSTANT.exec(text)?.[0] ?? null;
}

test("the exit criterion, deployed: search NVDA, open it, read both plots, change the window", async ({
  page,
}) => {
  // ---------------------------------------------------------------------
  // Search, and open
  // ---------------------------------------------------------------------
  await page.goto(SECURITIES);
  await expect(page.getByRole("table")).toBeVisible();

  await page.getByRole("combobox").fill(QUERY);
  await page.getByRole("option").first().click();

  await expect(page).toHaveURL(new RegExp(`/securities/${SYMBOL}$`));
  await expect(
    page.getByRole("heading", { level: 2, name: SYMBOL }),
  ).toBeVisible();

  // The panel has settled on **an** answer before anything below reads the
  // page. Which answer is the deployment's business.
  await expect(anAnswer(page)).toBeVisible();

  // ---------------------------------------------------------------------
  // The screen §8.3 describes, and the structural claim about it
  // ---------------------------------------------------------------------
  //
  // Present **and** non-empty. `PROVENANCE.md` §12's finding was a named
  // landmark with an empty box under it, which reads as the half that broke —
  // and the four regions still waiting for their epic say so in words, so
  // "says something" is true of every one of the eight in every store.
  for (const name of REGIONS) {
    const region = page.getByRole("region", { name });
    await expect(region).toBeVisible();
    await expect(region).not.toBeEmpty();
  }

  // ---------------------------------------------------------------------
  // One axis, two plots
  // ---------------------------------------------------------------------
  //
  // The failure this catches is quiet: two components that each resolved their
  // own axis from the same window would agree at every width where both had
  // been measured and differ everywhere else. Asserted as geometry rather than
  // as arithmetic, because geometry is what a reader compares.
  await expect(plot(priceRegion(page))).toBeVisible();
  await expect(plot(volumeRegion(page))).toBeVisible();

  const priceBox = await plot(priceRegion(page)).boundingBox();
  const volumeBox = await plot(volumeRegion(page)).boundingBox();
  expect(volumeBox?.x).toBeCloseTo(priceBox?.x ?? -1, 1);
  expect(volumeBox?.width).toBeCloseTo(priceBox?.width ?? -1, 1);

  // ---------------------------------------------------------------------
  // One crosshair, one reading — gated on the store having bars
  // ---------------------------------------------------------------------
  const bars = await hasBars(page);

  if (bars) {
    const reader = priceRegion(page).getByRole("img", { name: /price chart$/ });

    // **Scrolled into view first**, which is this suite's own recorded trap: a
    // `mouse.move` to a `boundingBox()` that has not been scrolled in lands
    // outside the window, the strip stays at rest, and the assertion fails
    // against a chart that is working. Reproduced deployed at 390 px while
    // walking this journey by hand.
    await reader.scrollIntoViewIfNeeded();
    const box = await reader.boundingBox();
    if (box === null) throw new Error("the reading layer has no box");

    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);

    const priceReading = await readableReading(priceRegion(page));
    const volumeReading = await readableReading(volumeRegion(page));

    // **Each strip is stating a reading rather than resting.** The price strip
    // is blank at rest and the volume strip states the window's peak, so the
    // label is what separates *the pointer was read* from *the pointer landed
    // outside the plot and nothing happened* — the failure mode this suite's
    // README records under locators with a fallback.
    //
    // **Matched case-insensitively, because `innerText` is rendered text.**
    // The labels are `Bar` and `Volume` in the DOM and uppercased by CSS, so
    // `innerText` reports `BAR` and `VOLUME` — two strings for one element, and
    // this helper needs the rendered one to get the visible row.
    expect(priceReading).toMatch(/\bbar\b/i);
    expect(volumeReading).toMatch(/\bvolume\b/i);

    const at = instantIn(priceReading);
    expect(
      at,
      `no market instant in the price reading: ${priceReading}`,
    ).not.toBeNull();

    // **The same minute in both**, which is the shared axis as a reader meets
    // it: one pointer, one answer. A value is never asserted — see the header.
    expect(instantIn(volumeReading)).toBe(at);

    // One crosshair and one disc, **counted** rather than checked for
    // visibility: a vertical line is zero pixels wide to a bounding-box check,
    // so `toBeVisible()` reports hidden against a crosshair that is on screen.
    expect(await reader.locator("line").count()).toBe(1);
    expect(await reader.locator("circle").count()).toBe(1);
  }

  // ---------------------------------------------------------------------
  // The window change
  // ---------------------------------------------------------------------
  await cell(page, "1 month").click();

  // The address carries it, so the window is shareable and reloadable — which
  // is `FRONTEND-STATE.md`'s whole argument for there being no store.
  await expect(page).toHaveURL(/\?sessions=21$/);
  await expect(cell(page, "1 month")).toHaveAttribute("aria-checked", "true");

  // And the answer that arrives is the one that was asked for. `1M` on the
  // figures' own labels where there are figures; the union where there are not.
  await expect(anAnswer(page)).toBeVisible();
  if (bars) {
    await expect(priceRegion(page).getByText("1M Open")).toBeVisible();
  }

  // **Both plots moved, and they are still one axis.** A control that drove one
  // panel and not the other is the defect this re-measure exists for, and it is
  // invisible to anything that computes no layout.
  const priceAfter = await plot(priceRegion(page)).boundingBox();
  const volumeAfter = await plot(volumeRegion(page)).boundingBox();
  expect(volumeAfter?.x).toBeCloseTo(priceAfter?.x ?? -1, 1);
  expect(volumeAfter?.width).toBeCloseTo(priceAfter?.width ?? -1, 1);

  // ---------------------------------------------------------------------
  // Where these numbers came from
  // ---------------------------------------------------------------------
  //
  // **The classification clause only**, and the choice is the header's
  // structure/figures rule arriving with a concrete case. Its data is the
  // `GET /securities` answer rather than the bars, so it renders in every store
  // this suite can be pointed at — including one holding no bars, where it is
  // the note's only line. The adjustment, retrieval and feed clauses beside it
  // are claims about bars and are deliberately unasserted.
  await expect(page.getByText("Classification", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      /Sector and industry are\s*curated, not from the market feed\./,
    ),
  ).toBeVisible();

  // ---------------------------------------------------------------------
  // And nothing collapsed
  // ---------------------------------------------------------------------
  //
  // `PRODUCT_SPEC.md` §36 as one mechanical claim: `ErrorFallback` is the only
  // thing in this application that carries `role="alert"`, so a page with none
  // has not collapsed into a global error screen.
  await expectNothingFailedToRender(page);
});

test("a cold deep link to a window lands on that window, deployed", async ({
  page,
}) => {
  // **The second test, and the case for a second test rather than a longer
  // first one.** Everything above reaches `?sessions=21` through the control,
  // which is a client-side navigation: the bundle is already loaded, the cache
  // is warm and the router never re-mounts. A **cold** load of the same address
  // is a different chain — the host's `navigationFallback` answers a path with
  // two segments and a query string, the bundle boots, and the window is read
  // from the address before anything has been fetched.
  //
  // That is a property of the deployed host and of the artefact together, which
  // is this suite's whole remit, and `host-routing.spec.ts` deep-links only
  // paths with no query on them. It is also exactly how Epic 11's
  // `setTimeWindow` will arrive at a window, so it is worth one page load.
  await page.goto(`/securities/${SYMBOL}?sessions=21`);

  await expect(
    page.getByRole("heading", { level: 2, name: SYMBOL }),
  ).toBeVisible();
  await expect(cell(page, "1 month")).toHaveAttribute("aria-checked", "true");
  await expect(anAnswer(page)).toBeVisible();

  // The address is untouched by the load, which is the half a router that
  // normalised the query would break silently.
  await expect(page).toHaveURL(/\?sessions=21$/);
  await expectNothingFailedToRender(page);
});
