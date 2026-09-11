import { REQUEST_ID_HEADER, apiError } from "@marketpulse/shared";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import {
  expectBackendStatus,
  expectNothingFailedToRender,
} from "../support/app.js";
import { expectNoAxeViolations } from "../support/axe.js";
import { SECURITIES_ROUTE_PATTERN } from "../support/pair.js";

// The tracked universe on screen — the first page in this product whose content
// arrives over the network, driven in a real browser (Task 2.4.5).
//
// ## The healthy path drives the real pair and the failures are intercepted
//
// That split is Story 1.13's and it is not a style: `route.fulfill()` bypasses
// the browser's CORS check entirely — measured, a fulfilled response with **no
// CORS headers at all** is read normally by the page — so a journey built on
// interception cannot see the one failure the deployed check exists for. The
// healthy test below therefore installs no route at all, which is what makes it
// go red on a wrong `CORS_ORIGIN` in the same way `backend-health.spec.ts` does.
//
// ## The route pattern is a predicate and not a glob, and that is a finding
//
// `/securities` is an application route as well as an endpoint, so a `**` glob over `/securities`
// matches the document navigation `page.goto` performs. The first draft of this
// file did exactly that and fulfilled the *page* with a JSON body; the state it
// then measured was a blank document reporting five whole-document axe
// violations. `SECURITIES_ROUTE_PATTERN` separates them by port, derived from
// the backend's own built configuration. See `support/pair.ts`.
//
// ## What a green run here does not certify
//
// In the shape ADR 0013 uses.
//
//   - **Not that the data is correct.** Every assertion below is about the page
//     rendering what the API returned. That the API returns the right 101
//     securities is `apps/backend`'s database suite and Story 2.3's loader, and
//     nothing in a browser can tell a correct universe from a plausible one.
//   - **Not that a screen reader announces well.** It asserts that the live
//     region exists, survives the transition as the same node, and carries a
//     sentence — which is the *mechanism* an announcement needs. Whether the
//     announcement is a good one was judged by a person and is recorded in the
//     task; no instrument here can hear anything.
//   - **Not accessibility.** Three viewports of axe on four states is a much
//     wider claim than this repository has made before and is still not a
//     review. Epic 15 owns that.
//   - **Not the states it cannot produce.** A wrong allowlist is caught here and
//     never produced here, and a hung socket is not produced at all.

const SECURITIES = "/securities";

/** The frame a person can see, by role and accessible name. */
async function expectTheUniverseRendered(page: Page): Promise<void> {
  await expect(
    page.getByRole("heading", { level: 1, name: "Security Explorer" }),
  ).toBeVisible();

  const region = page.getByRole("region", { name: "Tracked universe" });
  await expect(region).toBeVisible();

  // The table, by role, with its seven column headers in order. Asserted as a
  // list rather than one at a time, so a column silently disappearing is caught
  // as well as a column being renamed — which is how the fifth one arriving in
  // Task 2.8.9 showed up here rather than being noticed later, and the sixth
  // and seventh in Task 2.9.7.
  //
  // **`Last close` is a regex and the rest are literals**, and that asymmetry
  // is the same rule the depth assertion below states: the heading carries the
  // session date when every close on the page shares one, and which session
  // that is depends on when somebody last ran `pnpm backfill` on this machine.
  // A literal date here would be a gate reporting the age of a laptop's store
  // as a defect. What is asserted is the shape the code produces — the word,
  // and a date **or nothing**, which is the state where the closes disagree.
  const table = region.getByRole("table");
  await expect(table).toBeVisible();
  await expect(table.getByRole("columnheader")).toHaveText([
    "Symbol",
    "Name",
    "Industry",
    "Kind",
    /^Last close( \d{4}-\d{2}-\d{2})?$/,
    "Change",
    "Minute-bar history",
  ]);
}

test("the tracked universe renders from the real pair", async ({ page }) => {
  await page.goto(SECURITIES);
  await expectTheUniverseRendered(page);

  const region = page.getByRole("region", { name: "Tracked universe" });

  // A sector band. It is a `rowheader` rather than a `columnheader` because
  // `scope="rowgroup"` is what it is — it labels the rows inside its own
  // `<tbody>` — and the accessible name is the whole band read as one string,
  // which is why the count carries a visually-hidden unit: without it a
  // listener gets a bare figure at the end of a sentence.
  await expect(
    region.getByRole("rowheader", {
      name: /^Technology Benchmark XLK \d+ securities$/,
    }),
  ).toBeVisible();

  // A row, and the assertion that makes Task 2.4.3's `<th scope="row">`
  // worth having: the symbol is a `rowheader`, so a screen reader announces
  // "AAPL" before each of that row's cells rather than reading a bare
  // "Technology Hardware, Storage & Peripherals" with nothing to attach it to.
  const apple = region.getByRole("row", { name: /^AAPL / });
  await expect(apple.getByRole("rowheader", { name: "AAPL" })).toBeVisible();
  await expect(apple.getByRole("cell", { name: "Apple Inc." })).toBeVisible();

  // The market proxies group exists and says in words that it is not a sector,
  // which is what stands in for the em dash in those rows' Sector column.
  await expect(
    region.getByRole("rowheader", {
      name: /^Market proxies Whole-market ETFs, which belong to no sector \d+ securities$/,
    }),
  ).toBeVisible();

  await expectNothingFailedToRender(page);
  await expectNoAxeViolations(page, "the securities route, loaded");
});

// What we hold, on screen (Task 2.8.9) — the first thing this page says that is
// about the market rather than about our own configuration.
//
// **Driven against the real pair and asserting no number.** The store's depth
// is a property of when somebody last ran `pnpm bars:backfill`, and a literal
// here would go red on a healthy laptop whose store is a week older than the
// one this was written on — a gate reporting a decision as a defect, which is
// the mistake `specs-deployed/tracked-universe.spec.ts` already records about
// counting securities. What is asserted is the *shape* of the sentence, which
// is what the code produces and the data does not.
test("each security says how much history we hold for it", async ({ page }) => {
  await page.goto(SECURITIES);
  await expectTheUniverseRendered(page);

  const region = page.getByRole("region", { name: "Tracked universe" });

  // Asserted on the row's accessible name rather than on the cell, because
  // that is the string a screen reader is handed — and because a depth
  // rendered apart from its date would satisfy two separate cell assertions
  // and read as nonsense.
  //
  // The alternation is the honest part: a security nobody has backfilled says
  // so in words rather than showing a zero, and both are correct answers on a
  // laptop. Which one AAPL gives depends on whether this machine has run a
  // backfill, and the gate must not have an opinion about that.
  await expect(
    region.getByRole("row", {
      name: /^AAPL .*(\d+(\.\d+)?(y|mo|d) from \d{4}-\d{2}-\d{2}|No history yet)$/,
    }),
  ).toBeVisible();

  // The summary line's own claim about the store, which is where the scale
  // figure lives — the per-row cell deliberately never carries a bar count.
  await expect(
    region.getByText(
      /(all with history|\d+ with history|No market history stored yet)/,
    ),
  ).toBeVisible();
});

// The first real price on screen (Task 2.9.7), against the real pair.
//
// **Asserting no number, for the reason the history test above states.** What
// NVDA closed at is a property of the store on this machine, and a literal here
// would be a gate reporting a backfill's age as a defect. What is asserted is
// the shape the code produces: a two-decimal figure, a signed percentage with
// its glyph, and the spoken word that carries the direction when the colour
// cannot — or, on a laptop with no daily bars, the honest absence.
test("each security shows what it last closed at", async ({ page }) => {
  await page.goto(SECURITIES);
  await expectTheUniverseRendered(page);

  const region = page.getByRole("region", { name: "Tracked universe" });

  // On the row's accessible name rather than on two cells, because that is the
  // string a screen reader is handed — and because a price rendered apart from
  // its direction would satisfy two separate cell assertions and be heard as
  // nonsense. The alternation covers a store with no daily bars, which is what
  // a clean clone has.
  await expect(
    region.getByRole("row", {
      name: /^NVDA .*(\d+\.\d{2} (up|down|unchanged) [+−]?\d+\.\d{2}%|No close yet)/,
    }),
  ).toBeVisible();

  // **The direction survives the colour being removed**, which is the property
  // Task 1.4.4 measured this palette's need for: positive and negative differ
  // by 1.05:1 under `grayscale(1)`, so hue is no difference at all. The word
  // above is one channel and the glyph is the other; this asserts the glyph is
  // in the DOM and `aria-hidden`, which is what keeps it out of the sentence a
  // listener hears while remaining what a reader sees.
  const glyphs = await region
    .locator('[aria-hidden="true"]')
    .filter({ hasText: /^[▲▼—]$/ })
    .count();
  expect(
    glyphs,
    "no direction glyph is rendered beside any change",
  ).toBeGreaterThan(0);
});

// Three viewports, because **every axe figure this repository holds was taken at
// one** and Task 1.13.4's `scrollable-region-focusable` defect proves that is
// not the same as a page having no violations: it was invisible on the
// development machine and reproduced at a window 160 px shorter. This page is
// the shape that defect was found on — a long table inside a `Region` that
// declares `overflow: auto` — so the check is taken at the same three heights
// Story 1.13 used rather than at the one that happens to be open.
for (const height of [720, 560, 480]) {
  test(`the loaded universe has no axe violations at 1280x${String(height)}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height });
    await page.goto(SECURITIES);
    await expectTheUniverseRendered(page);
    await expectNoAxeViolations(
      page,
      `the securities route, loaded, 1280x${String(height)}`,
    );
  });
}

// The open combobox is a separate axe subject from the loaded page, and until
// Task 2.11.4 added this the gate had never seen it (Story 2.11).
//
// The three tests above load the route and never type, so the result surface is
// closed for every one of them — which means a `listbox` with no accessible
// name, an `option` outside a `listbox`, or an `aria-activedescendant` pointing
// at an id that is not on the page would all have passed the "axe reads zero
// violations" criterion while being exactly the kind of defect it exists to
// catch. A combobox is mostly ARIA, and ARIA is mostly what axe is for.
test("the open result surface has no axe violations", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(SECURITIES);
  await expectTheUniverseRendered(page);

  const field = page.getByRole("combobox");
  await field.fill("he");

  // Typed rather than asserted into existence: the surface is what is being
  // checked, so the check is worthless if it runs before the surface is there.
  await expect(page.getByRole("option").first()).toBeVisible();
  await expect(field).toHaveAttribute("aria-expanded", "true");

  await expectNoAxeViolations(page, "the securities route, search open");
});

// The same surface with **no closes at all**, which is the state that actually
// carried a contrast defect into `main`.
//
// This exists because the check above caught that defect **by accident of the
// CI database**, not by design. Every one of the 518 securities has a close in
// the development database, so the "No close" text never rendered locally and
// the surface passed; CI loads the universe without bars, so every row rendered
// it at `--ink-disabled` — `#74777f`, **4.48:1** on the raised ground and
// **4.05:1** on the sunken footer, against 1.4.3's 4.5:1 for text.
//
// An accident is not a check. If CI ever gains bars, the run above stops
// covering this and nothing says so. Stubbing the join away makes the state
// reachable from any machine.
test("the result surface has no axe violations when nothing has a close", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.route(SECURITIES_ROUTE_PATTERN, async (route) => {
    const response = await route.fetch();
    const body: unknown = await response.json();
    // `lastCloses` is a separate array on the wire, so emptying it is exactly
    // the shape a partially-backfilled deployment produces — not a mangled
    // body. The universe itself is untouched and still real.
    const stripped = { ...(body as Record<string, unknown>), lastCloses: [] };
    await route.fulfill({ response, json: stripped });
  });

  await page.goto(SECURITIES);
  await expectTheUniverseRendered(page);
  await page.getByRole("combobox").fill("he");

  const rows = page.getByRole("option");
  await expect(rows.first()).toBeVisible();
  // The state is only under test if it is actually on screen.
  await expect(rows.first()).toContainText("No close");

  await expectNoAxeViolations(
    page,
    "the securities route, search open, no closes",
  );
});

// The motion, and the constraint that outranks it.
//
// `VISUAL-LANGUAGE.md` gives content arriving one duration and one easing, and
// the surface uses them. The rule that outranks the vocabulary is that **motion
// must never make a number harder to read** — and a result surface is the one
// place in this product where that is easy to violate by accident, because it
// re-renders on every keystroke. If the animation restarted each time, every
// figure on screen would fade and slide continuously while somebody typed.
//
// It does not restart, because React reconciles the same DOM node while the
// surface stays open and a CSS animation only replays on a fresh element. That
// is a claim about a framework's behaviour, which is exactly the kind of claim
// worth pinning rather than reasoning about — and it cannot be measured from a
// backgrounded tab, where no frames are rendered, animations never advance and
// `animationstart` never fires.
test("the surface animates once when it opens, and not again while typing", async ({
  page,
}) => {
  await page.goto(SECURITIES);
  await expectTheUniverseRendered(page);

  const field = page.getByRole("combobox");
  const readAnimation = async () =>
    await page.evaluate(() => {
      const surface =
        document.querySelector('[role="listbox"]')?.parentElement ?? null;
      if (surface === null) return null;
      const [animation] = surface.getAnimations();
      if (animation === undefined) return null;
      return {
        name: (animation as CSSAnimation).animationName,
        state: animation.playState,
        elapsed: Number(animation.currentTime ?? 0),
      };
    });

  await field.fill("he");
  await expect(page.getByRole("option").first()).toBeVisible();

  const opening = await readAnimation();
  expect(opening?.name).toMatch(/surfaceArrive/);

  // Let it finish, then type on. `toPass` rather than a sleep: the duration is
  // a token and a literal here would be a second spelling of it.
  await expect(async () => {
    expect((await readAnimation())?.state).toBe("finished");
  }).toPass();

  await field.fill("heal");
  await expect(page.getByRole("option").first()).toBeVisible();

  const during = await readAnimation();
  expect(during?.state, "a further keystroke must not replay the arrival").toBe(
    "finished",
  );
  expect(during?.elapsed).toBeGreaterThan(0);

  await expectNothingFailedToRender(page);
});

// Selection by pointer, which the component tests structurally cannot prove.
//
// The row commits on `mousedown` because the input's blur closes the surface
// and blur lands first — a `click` handler on a row that has already unmounted
// never runs. In jsdom nothing takes focus and nothing blurs, so that ordering
// does not exist there: a component test written as `fireEvent.click` against a
// `click` handler passes, and the control still does nothing when a person uses
// a mouse. A real browser is the only level that can tell the two apart, and
// swapping the handler here turns this test red while the component suite goes
// on reporting what it always reported.
test("clicking a result opens that security", async ({ page }) => {
  await page.goto(SECURITIES);
  await expectTheUniverseRendered(page);

  await page.getByRole("combobox").fill("nvid");
  await page.getByRole("option").first().click();

  await expect(page).toHaveURL(/\/securities\/NVDA$/);
  await expectNothingFailedToRender(page);
});

test("the arrival is announced, by a live region that survives it", async ({
  page,
}) => {
  // Slowed so the loading state is observable at all — it clears in tens of
  // milliseconds against a local pair. `continue()` rather than `fulfill()`, so
  // what finally arrives is the real response.
  await page.route(SECURITIES_ROUTE_PATTERN, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });

  await page.goto(SECURITIES);

  // A `status` role, present *before* the content it will announce changes and
  // **empty**. That ordering is the whole mechanism: a live region added at the
  // same moment as its content is not reliably announced, and one that is
  // *removed* — which is what Task 2.4.3 shipped — announces nothing at all.
  // It carries no sentence yet because arriving at a page is not a change, so a
  // loading sentence here would never be heard as an announcement and would
  // only be a second copy of the visible line.
  // **Scoped to the region since Task 2.10.8**, and the scope is the assertion
  // rather than a workaround for strict mode. This page now has *two* polite
  // live regions — the universe table's and the market-data panel's — because
  // the decision that task took is one region per subject, each naming its own
  // subject, so that a screen reader queueing them in an order neither
  // component controls still hands a listener two complete sentences. An
  // unscoped `getByRole("status")` would resolve to both and fail, which is
  // Playwright reporting the change correctly.
  const status = page
    .getByRole("region", { name: "Tracked universe" })
    .getByRole("status");
  await expect(status).toHaveText("");
  await expect(page.getByText("Loading the tracked universe…")).toBeVisible();

  // Held so the assertion below is about the same element rather than about
  // there being an element.
  await status.evaluate((element) => {
    (window as unknown as { announcer?: Element }).announcer = element;
  });

  await expect(page.getByRole("table")).toBeVisible();

  // The sentence changed in place. It names what a listener needs and not the
  // table — the failure this replaces would have been a region reading 101 rows
  // aloud, which is noise a user cannot turn off.
  // Three sentences since Task 2.8.9 — the third says whether there is
  // anything to look at, which is the fact a listener can act on. The scale
  // figure is deliberately not in it: `47.7M` spoken is worse than not said.
  // Four sentences since Task 2.9.7 — the fourth names the session the prices
  // are from, which is the one fact keeping a stale number from being *heard*
  // as a live one. A reader gets it from the column heading; a listener meeting
  // a table of prices cannot, until they land on a cell.
  await expect(status).toHaveText(
    /^The tracked universe loaded\. \d+ securities in \d+ sectors\. (No market history is stored yet\.|Market history is stored for (all of them|\d+ of them)\.) (No closing prices are stored yet\.|Closing prices are from the \d{4}-\d{2}-\d{2} session\.|Closing prices are stored for \d+ of them, from more than one session\.)$/,
  );

  // **The same node**, which is what makes it an announcement rather than a
  // sentence nobody hears. Remounting the region is precisely the defect this
  // test exists to keep fixed, and it is invisible to a text assertion.
  const sameNode = await status.evaluate(
    (element) =>
      element === (window as unknown as { announcer?: Element }).announcer,
  );
  expect(sameNode, "the live region was recreated rather than updated").toBe(
    true,
  );

  // It is `status` and never `alert`. `role="alert"` is what `ErrorFallback`
  // carries, so an alert here would be indistinguishable from a render failure
  // to the one assertion this suite makes on every route.
  await expectNothingFailedToRender(page);
});

test("the whole table is reachable and operable by keyboard", async ({
  page,
}) => {
  // The short viewport deliberately: this is the one where the most of the
  // table is off screen, so "the last row can be reached" is a real claim
  // rather than one the window happened to satisfy.
  await page.setViewportSize({ width: 1280, height: 480 });
  await page.goto(SECURITIES);
  await expectTheUniverseRendered(page);

  const lastRow = page.getByRole("row").last();
  const inViewport = async (): Promise<boolean> =>
    await lastRow.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return box.top < window.innerHeight && box.bottom > 0;
    });

  // Not `isVisible()`, which is true for an element with a bounding box
  // wherever it is on the page. The question here is whether it is on screen.
  expect(await inViewport(), "the last row starts off screen").toBe(false);

  // Tab from the top of the document. The stops are the four navigation links,
  // then the **search field** — Story 2.11 put a control in the page's heading
  // block, above both regions and inside neither — and then the region itself,
  // which takes focus because `Region` carries `tabIndex={0}`. Task 1.13.4 put
  // that there so a region that scrolls its own overflow is reachable, and it
  // is what puts focus inside the page's content here.
  //
  // The search field's position in this order is the assertion, not an
  // incidental: a control *over* both surfaces has to come before them, and if
  // it ever moved inside the table's `Region` this expectation is what would
  // notice.
  const stops: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press("Tab");
    stops.push(
      await page.evaluate(() => document.activeElement?.tagName ?? "none"),
    );
  }
  expect(stops).toEqual(["A", "A", "A", "A", "INPUT", "SECTION"]);

  // And from there the table can be moved through without a pointer.
  await page.keyboard.press("End");
  await expect(async () => {
    expect(await inViewport()).toBe(true);
  }).toPass();

  await expectNothingFailedToRender(page);
});

test("nothing answering reads as no response, and the rest of the page survives", async ({
  page,
}) => {
  await page.route(SECURITIES_ROUTE_PATTERN, async (route) => {
    await route.abort("connectionrefused");
  });
  await page.goto(SECURITIES);

  const region = page.getByRole("region", { name: "Tracked universe" });
  await expect(region.getByText("no response", { exact: true })).toBeVisible();
  await expect(
    region.getByText("The tracked universe is not available.", { exact: true }),
  ).toBeVisible();

  // No reference, because nothing arrived to carry one. Asserted rather than
  // assumed: an id rendered here would mean the hook invented one.
  await expect(region.getByText(/^Reference /)).toHaveCount(0);

  // **The chrome's own indicator is still `healthy`**, and that is the
  // assertion behind Story 1.12's two-indicators-not-one decision: only
  // `/securities` was intercepted, so the backend is answering perfectly about
  // itself while this region cannot be filled. A single widened indicator would
  // have had to pick one of those two facts to report.
  await expectBackendStatus(page, "healthy");

  await expectNothingFailedToRender(page);
  await expectNoAxeViolations(page, "the securities route, nothing answered");
});

test("a service error reads as an unexpected response, with a quotable reference", async ({
  page,
}) => {
  const requestId = "3f1c9b02-9d4e-4a51-8f0b-2c7a1e5d6b83";

  // **Two things had to be true for this to render, and both were found by the
  // assertion below failing rather than by reading anything.**
  //
  // The id on screen comes from the **header** and not from the body:
  // `api-client.ts` reads `readRequestId(response)`, because the header is the
  // one place an id is present on *every* response including the ones whose
  // body is not worth parsing — Task 1.7.2's design. A fulfilled response
  // carrying a well-formed `ApiError` and no header renders the failure
  // correctly and no reference at all.
  //
  // And the header has to be **exposed**. `e2e/README.md` records that
  // `route.fulfill()` bypasses the browser's CORS check *entirely*; measured
  // here, that is too strong. It bypasses the **check** — the body is read
  // normally with no CORS headers at all — and it does **not** bypass the
  // exposed-headers filter: without `access-control-expose-headers` the script
  // sees `content-length` and `content-type` and nothing else, so
  // `x-request-id` is invisible and the reference silently does not render.
  // Which is `@fastify/cors`'s `exposedHeaders` doing its job on a response the
  // real backend would have set it on, reproduced in miniature.
  //
  // The body is still built with the shared constructor, so this is the wire
  // shape the backend actually produces rather than a plausible copy of it, and
  // the header name is imported for the reason `packages/shared` holds it at
  // all: a header-name typo is a compile error nowhere and silently disables
  // correlation on the path it was added to.
  await page.route(SECURITIES_ROUTE_PATTERN, async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      headers: {
        [REQUEST_ID_HEADER]: requestId,
        "access-control-expose-headers": REQUEST_ID_HEADER,
      },
      body: JSON.stringify(
        apiError("INTERNAL_ERROR", "Something went wrong.", requestId),
      ),
    });
  });
  await page.goto(SECURITIES);

  const region = page.getByRole("region", { name: "Tracked universe" });
  await expect(
    region.getByText("unexpected response", { exact: true }),
  ).toBeVisible();
  await expect(
    region.getByText("The tracked universe could not be read.", {
      exact: true,
    }),
  ).toBeVisible();

  // The label and the shape, which is what survives a rewording of how the id
  // is set — Task 2.4.4 already moved this line from `Reference: <id>` to
  // `Reference <id>` once.
  const reference = region.getByText(/^Reference /);
  await expect(reference).toHaveText(
    /^Reference [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  );

  // And, because this spec supplies the id rather than reading a fresh one, the
  // **whole** id — which is `api-client.ts`'s rule that a prefix of a UUID is
  // not a shorter version of it but a different string that matches nothing in
  // a log. Do not copy this assertion to a spec that does not control the value.
  await expect(reference).toContainText(requestId);

  await expectNothingFailedToRender(page);
  await expectNoAxeViolations(page, "the securities route, answered badly");
});

test("a dependency that is down says so, and the retry recovers the page", async ({
  page,
}) => {
  // **The commonest failure this page actually has**, and the one Task 2.10.2
  // exists for: the service is up and cannot reach its database, so it answers
  // a 503 carrying `SERVICE_UNAVAILABLE`. Until that task it rendered as
  // *unexpected response* — a sentence that was false in the direction that
  // matters, because it told a reader nothing would help at the moment when
  // waiting was the entire answer.
  //
  // The body is built with the shared constructor, so this is the wire shape
  // `apps/backend/src/errors.ts` actually produces rather than a plausible copy
  // — and the real one was produced before this spec was written, by pointing
  // the backend at a port nothing listens on.
  const requestId = "9c2e1b4e-7a52-4b1d-8f0b-3d8a6f04b571";
  let unavailable = true;

  await page.route(SECURITIES_ROUTE_PATTERN, async (route) => {
    if (unavailable) {
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
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ securities: [], coverage: [], lastCloses: [] }),
    });
  });
  await page.goto(SECURITIES);

  const region = page.getByRole("region", { name: "Tracked universe" });
  await expect(
    region.getByText("temporarily unavailable", { exact: true }),
  ).toBeVisible();
  await expect(
    region.getByText("The tracked universe is temporarily unavailable.", {
      exact: true,
    }),
  ).toBeVisible();

  // The reference is still offered — it is the one internal identifier this
  // product shows — and the discriminator behind the sentence is not.
  await expect(region.getByText(/^Reference /)).toContainText(requestId);
  await expect(page.getByText(/SERVICE_UNAVAILABLE/)).toHaveCount(0);

  // **The first control in this product that re-asks a question.** The page it
  // is on stays exactly where it is: the heading and the chrome are the same
  // elements before and after, which is the difference from the document reload
  // this replaces and is PRODUCT_SPEC.md §36's incremental degradation on the
  // one page that can currently demonstrate it.
  await expectBackendStatus(page, "healthy");
  await expectNoAxeViolations(page, "the securities route, temporarily down");

  unavailable = false;
  await page.getByRole("button", { name: "Try again" }).click();

  // The dependency came back, so the answer changes without a navigation.
  await expect(
    region.getByText("The universe has not been loaded.", { exact: true }),
  ).toBeVisible();
  await expect(region.getByRole("button")).toHaveCount(0);

  // And no navigation happened: the same document, still on the same route.
  expect(new URL(page.url()).pathname).toBe(SECURITIES);
  await expectNothingFailedToRender(page);
});

test("a host that is not this service reads the same, without a reference", async ({
  page,
}) => {
  // The realistic producer: `VITE_API_BASE_URL` pointed at a static host, which
  // answers the API's address with its own SPA fallback. Task 1.12.7 measured
  // the deployed frontend doing exactly this.
  await page.route(SECURITIES_ROUTE_PATTERN, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html><body>a static host</body></html>",
    });
  });
  await page.goto(SECURITIES);

  const region = page.getByRole("region", { name: "Tracked universe" });

  // The same word and the same sentence as the test above, from a completely
  // different cause. That collapse is the design rather than an accident — a
  // reader can act on "something else is answering that address" and cannot act
  // on the difference between a 500 and an HTML page — and asserting it from
  // both producers is what proves the two are genuinely one state.
  await expect(
    region.getByText("unexpected response", { exact: true }),
  ).toBeVisible();
  await expect(
    region.getByText("The tracked universe could not be read.", {
      exact: true,
    }),
  ).toBeVisible();

  // No reference: the body carried nothing to quote.
  await expect(region.getByText(/^Reference /)).toHaveCount(0);

  await expectNothingFailedToRender(page);
});

test("an empty universe names the command that fills it", async ({ page }) => {
  // A migrated-but-unseeded database — the state a first run meets and a deploy
  // whose `pnpm universe` step did not run produces. It is neither a failure
  // nor a loading state, which is why it has a member of its own.
  await page.route(SECURITIES_ROUTE_PATTERN, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ securities: [], coverage: [], lastCloses: [] }),
    });
  });
  await page.goto(SECURITIES);

  const region = page.getByRole("region", { name: "Tracked universe" });
  await expect(
    region.getByText("The universe has not been loaded.", { exact: true }),
  ).toBeVisible();

  // The command, because an empty screen is an invitation to act and "no data"
  // is not one.
  await expect(
    region.getByText("pnpm universe", { exact: true }),
  ).toBeVisible();

  // No table at all, rather than a header row over nothing.
  await expect(region.getByRole("table")).toHaveCount(0);

  await expectNothingFailedToRender(page);
  await expectNoAxeViolations(page, "the securities route, empty");
});

// Search, when the universe it searches is not there (Task 2.11.6).
//
// These are browser tests rather than component ones because what is being
// asserted is the **page**: that one failure produces one explanation per
// surface and exactly one control, and that a disabled control with a sentence
// beside it clears the contrast floor. Neither is visible at a level with no
// stylesheet.

test("search says it cannot answer, and does not grow a second retry", async ({
  page,
}) => {
  await page.route(SECURITIES_ROUTE_PATTERN, async (route) => {
    await route.abort("connectionrefused");
  });
  await page.goto(SECURITIES);

  // The field is on the page, labelled, and honest about what it can do. Before
  // this task it was simply absent in this state, which a reader cannot tell
  // from a product with no search in it.
  const field = page.getByRole("combobox");
  await expect(field).toBeVisible();
  await expect(field).toBeDisabled();
  // Its own words rather than the table's: two surfaces are describing one
  // failure on one screen, and the strictness of this locator is what keeps
  // them from being the same paragraph printed twice.
  await expect(
    page.getByText(
      /Nothing to search yet: the tracked universe did not answer/,
    ),
  ).toBeVisible();

  // **One failure, one control.** Both surfaces read the same fetch, so a
  // second `Try again` would be a second way to do one thing.
  await expect(page.getByRole("button", { name: /try again/i })).toHaveCount(1);

  await expectNothingFailedToRender(page);
  await expectNoAxeViolations(page, "the securities route, search unavailable");
});

test("a query typed before the universe arrives is kept, not answered", async ({
  page,
}) => {
  // Held open rather than failed: the request never settles, so the page stays
  // in the one state that cannot be reached by waiting.
  await page.route(SECURITIES_ROUTE_PATTERN, async () => {
    await new Promise(() => undefined);
  });
  await page.goto(SECURITIES);

  const field = page.getByRole("combobox");
  await expect(field).toBeEnabled();
  await field.fill("nv");

  // The defect this forbids: an empty corpus matches nothing, so "no matches"
  // is reachable here and would be a claim about the market made from data
  // nobody has seen.
  await expect(page.getByText("Still loading securities.")).toBeVisible();
  await expect(page.getByText(/No security matches/)).toHaveCount(0);
  await expect(field).toHaveValue("nv");

  await expectNothingFailedToRender(page);
  await expectNoAxeViolations(page, "the securities route, universe loading");
});

test("a query that matches nothing is a sentence rather than an empty list", async ({
  page,
}) => {
  await page.goto(SECURITIES);
  await expectTheUniverseRendered(page);

  await page.getByRole("combobox").fill("zzz");

  await expect(page.getByText(/No security matches “zzz”/)).toBeVisible();
  // No listbox at all, so the combobox is not claiming to be expanded over one.
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(page.getByRole("combobox")).toHaveAttribute(
    "aria-expanded",
    "false",
  );

  await expectNoAxeViolations(page, "the securities route, no matches");
});

test("prefers-reduced-motion stops the table arriving", async ({ page }) => {
  // **The real preference, through the media query**, which is what this adds
  // over Task 2.4.4: that task proved the *mechanism* by overwriting the motion
  // tokens by hand and watching both consumers collapse to `0s`. Forcing a
  // token proves the tokens are wired to each other. Only a browser told the
  // preference proves they are wired to the preference, and a media query is
  // exactly the kind of thing that is one typo away from never matching while
  // every other check stays green.
  //
  // It is answered **once, at the token layer** — `tokens.css` sets both
  // durations to `0ms` under the preference — rather than per component, which
  // is the whole argument for those being tokens: a per-component media query
  // is a thing each author has to remember, and its failure is silent.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(SECURITIES);
  await expectTheUniverseRendered(page);

  const reduced = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const entering = document.querySelector("table")?.parentElement;

    return {
      matches: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      settle: root.getPropertyValue("--motion-duration-settle").trim(),
      quick: root.getPropertyValue("--motion-duration-quick").trim(),
      entrance:
        entering === null || entering === undefined
          ? null
          : getComputedStyle(entering).animationDuration,
    };
  });

  expect(reduced).toEqual({
    matches: true,
    settle: "0ms",
    quick: "0ms",
    entrance: "0s",
  });

  // The control, and it is what makes the assertion above mean something: a
  // token that read `0ms` in both worlds would satisfy the first half of this
  // test while proving the preference is not being read at all.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await expectTheUniverseRendered(page);

  const normal = await page.evaluate(() => {
    const entering = document.querySelector("table")?.parentElement;

    return {
      matches: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      settle: getComputedStyle(document.documentElement)
        .getPropertyValue("--motion-duration-settle")
        .trim(),
      entrance:
        entering === null || entering === undefined
          ? null
          : getComputedStyle(entering).animationDuration,
    };
  });

  expect(normal).toEqual({
    matches: false,
    settle: "240ms",
    entrance: "0.24s",
  });
});
