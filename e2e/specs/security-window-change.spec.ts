import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import {
  AN_EMPTY_PLOT,
  expectNothingFailedToRender,
  readable,
} from "../support/app.js";
import { BARS_ROUTE_PATTERN } from "../support/pair.js";

// **Every way a window change can end, in the only instrument that can see most
// of them** (Task 2.13.7).
//
// `security-window-control.spec.ts` drives the control and asserts the address,
// the request and the tab order. This is its other half: what is **on screen**
// between one window and the next, and what is left there when the next one
// never arrives.
//
// Five things below are unreachable at any level under `pnpm e2e`, and each is
// the reason a test is here rather than in `BarSeriesPanel.test.tsx`:
//
// **Amended 2026-09-14 (§80).** The premise below — that a window change leaves
// a labelled held answer on screen — is half true now. The chart still stays and
// its figures still carry their own window; the **sentence** saying so is gone,
// because its whole visible life was 3–68 ms. A slow change draws a pending
// panel over the chart instead, which is the state two tests here reach through
// `holdTheAnswer`. What the rail still does is name the window under a refusal
// and under a failure, which are states a reader sits in.
//
//  1. **That a real window change goes through the held state at all.** A
//     component test is handed the state; only a browser produces the sequence
//     — a press, a request, an answer — with a real hook, a real cache and a
//     real address behind it.
//  2. **That the charts are still drawn.** jsdom computes no layout, so a plot
//     that vanished and a plot that is there render identically below this.
//  3. **That the control is present and operable in every state**, which the
//     search field taught: a component nobody renders raises nothing.
//  4. **The three refusals the address reaches with no stubbing**, which is a
//     property of the server and the URL together.
//  5. **A rapid sequence of presses**, where the second change lands while the
//     first answer is in flight — supersession by request identity, driven by a
//     real user action for the first time.
//
// ## What a green run here does not certify
//
//   - **Not that there are any bars.** CI's store holds 518 securities and zero
//     bars, so every window is a correct `empty` there and a `partial` locally.
//     A held `empty` is still a held answer and still carries the rail, which is
//     what lets every assertion below be about the **rail, the frame and the
//     control** rather than about a line.
//   - **Not that the rail looks right.** Contrast, the dashed marker and the
//     travelling hairline are visual; `BarSeriesPanel.stories.tsx`'s five window
//     stories are where a person reviews them.

const EXPLORER = "/securities/NVDA";

function priceRegion(page: Page) {
  return page.getByRole("region", { name: "Price" });
}

function volumeRegion(page: Page) {
  return page.getByRole("region", { name: "Volume" });
}

function control(page: Page) {
  return page.getByRole("radiogroup", { name: "Time window" });
}

function cell(page: Page, name: string) {
  return control(page).getByRole("radio", { name });
}

/** The panel has settled on an answer — **either** answer. */
function anAnswer(page: Page) {
  return priceRegion(page)
    .getByText(/(^| )Open$/)
    .or(priceRegion(page).getByText(AN_EMPTY_PLOT))
    .first();
}

/**
 * **Every mark the price plot draws, serialised** — the instrument for *the
 * picture did not move*.
 *
 * Two wrong instruments were tried first and each failed in a way worth keeping,
 * because both are the obvious thing to reach for:
 *
 *  1. **A count of `svg path` in the region.** The held-window rail brings a
 *     `Marker` of its own, so the count rises by one when a window change lands
 *     and the assertion fails against a chart that did not move.
 *  2. **The longest `d` in the region** — the series line. It is a good
 *     assertion on a store with bars and it is **meaningless on CI**, whose store
 *     holds 518 securities and **zero** bars: every window there is a correct
 *     `empty`, there is no line, and the longest `d` becomes whichever marker
 *     glyph happens to be on screen. This file's own header says every assertion
 *     here must be about the rail, the frame and the control rather than about a
 *     line; that instrument was a violation of it, and CI caught it.
 *
 * What is compared instead is every geometric element of the plot at **chart
 * scale** — the `> 100px` filter is what excludes the 13px marker glyphs — with
 * its attributes. On a backfilled store that includes the series path, the two
 * directional washes and the reference rule; on CI it is the gridlines, the
 * session seams and the uncovered ground. **Both are the whole picture**, so the
 * assertion says the same thing in both places and is strictly stronger than the
 * path comparison it replaces: a held series redrawn dimmer, dashed or in a
 * second stroke fails it, which is `FRONTEND-STATE.md` §2's reversal trigger
 * held mechanically.
 */
async function plotMarks(page: Page): Promise<string> {
  return priceRegion(page)
    .locator("svg")
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => node.getBoundingClientRect().width > 100)
        .flatMap((node) => [
          ...node.querySelectorAll("path, line, rect, circle"),
        ])
        .map(
          (element) =>
            `${element.tagName}:${[...element.attributes]
              .filter((attribute) => attribute.name !== "class")
              .map((attribute) => `${attribute.name}=${attribute.value}`)
              .join(",")}`,
        )
        .join("|"),
    );
}

/**
 * The rail that names which window is on screen.
 *
 * Through `readable`, because the panel's live region repeats this fact for a
 * listener and a plain text locator resolves to both nodes under strict mode —
 * which is the locator telling the truth rather than a nuisance.
 */
function heldRail(page: Page) {
  return readable(priceRegion(page), /Still showing the/);
}

/**
 * The pending panel, in the only way a spec can honestly reach it.
 *
 * The panel is `aria-hidden` and wordless, so there is no role and no phrase on
 * it to ask for — and a CSS-module hash is not a contract. What **is** a
 * contract is the clause the chart's text alternative gains while it is up:
 * *A newer answer is on its way.* That clause exists because the panel is
 * otherwise a fact with one audience, and writing this helper is what found
 * that — the first draft asserted `loading`'s own sentence and it is not the
 * one on screen, because the panel goes **over** a held answer rather than
 * replacing it.
 *
 * So this asserts the state rather than the class name, which is what every
 * other helper in this file does.
 */
function waiting(page: Page) {
  return readable(priceRegion(page), /A newer answer is on its way/);
}

/**
 * Hold every bars request open until the returned function is called.
 *
 * The `loading` half of this task is a *moment*, and a moment is not something
 * a browser test can assert its way into. Fulfilment is deferred rather than
 * faked: the request is the real one, the response is the real one, and what is
 * controlled is only **when** it arrives.
 */
async function holdTheAnswer(page: Page) {
  let release = (): void => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route(BARS_ROUTE_PATTERN, async (route) => {
    await held;
    await route.continue();
  });

  return () => {
    release();
  };
}

/**
 * **Where the price plot is on the page** — the instrument for *the picture did
 * not move*, as distinct from *the picture did not change*.
 *
 * `plotMarks` above compares what is drawn; this compares where it is drawn, and
 * the two are independent: the rail that appears when a window is pressed is
 * rendered **above** the chart, so a rail that takes its height out of the flow
 * pushes an identical picture down the page. That is a defect a reader finds
 * immediately — the chart jumps under the pointer that is reading it — and it is
 * invisible to every level below this one, because jsdom computes no layout.
 *
 * `svg:has(line)` is `security-price-chart.spec.ts`' plot locator, verbatim: a
 * bare `locator("svg")` also matches the reading overlay and, in the failure
 * states, nothing at all.
 */
async function plotTop(page: Page): Promise<number> {
  // **Measured against the region rather than the document, and both boxes read
  // in one evaluate.** Two properties, both learned by watching it fail:
  //
  //  - *Against the region*, because the identity block above this grid is
  //    filled by the **universe** request and under load that can land after the
  //    bars do, moving the whole region 82 px with nothing in this panel changed.
  //  - *In one evaluate*, because two `boundingBox()` calls are two round trips:
  //    anything that moves the page between them — and something on this screen
  //    moves it by 14 px shortly after load — lands entirely in the difference.
  //    That is a measurement straddling a reflow rather than a chart moving.
  return priceRegion(page).evaluate((section) => {
    const plot = section.querySelector("svg:has(line)");
    if (plot === null) throw new Error("no plot in the Price region");

    return (
      plot.getBoundingClientRect().top - section.getBoundingClientRect().top
    );
  });
}

/**
 * Where the figures sit inside their region — the **other** row this press can
 * move, since 2026-09-14.
 *
 * The prices came up onto the headline's row that day, so the row above the
 * picture now holds a figure at display size, a strip of four and the rail. A
 * row that wrapped into a different number of lines either side of a press would
 * move the chart, and `plotTop` would catch that — but it would not say *what*
 * moved, and the reading row is now the likeliest answer. This names it.
 *
 * Against the region and in one evaluate, for `plotTop`'s two reasons above.
 *
 * **`null` where there is no answer with bars in it, and that is CI rather than
 * an edge case.** The runner's store holds all 518 securities and **zero bars**
 * — `security-series-states.spec.ts` says it out loud: *every window on CI is a
 * correct `empty` and the same window locally is `partial`*. An `empty` panel
 * renders no figures at all, so there is no `Open` label to measure, and a
 * helper that threw took this test red on the runner while passing on every
 * developer's machine. It did exactly that, once, which is how this comment
 * came to be written.
 *
 * `plotTop` has no such problem: the chart draws its frame in every state that
 * has a window, which is why it and not this is the load-bearing half.
 */
async function closeLabelTop(page: Page): Promise<number | null> {
  return priceRegion(page).evaluate((section) => {
    const label = [...section.querySelectorAll("dt")].find((element) =>
      /(^| )Open$/.test(element.textContent),
    );
    if (label === undefined) return null;

    return (
      label.getBoundingClientRect().top - section.getBoundingClientRect().top
    );
  });
}

/**
 * The figures have not moved — where there are figures.
 *
 * The two halves of the guard are asserted separately rather than folded into
 * one, because they fail for different reasons and a reader of a red run should
 * be told which: `plotTop` says *the picture moved*, this says *the row above it
 * re-wrapped*.
 */
async function expectFiguresUnmoved(page: Page, wasAt: number | null) {
  if (wasAt === null) return;

  const now = await closeLabelTop(page);
  expect(now).not.toBeNull();
  expect(Math.abs((now ?? 0) - wasAt)).toBeLessThan(1);
}

/**
 * The three widths, for the one assertion whose answer differs between them.
 *
 * The rail's sentence wraps to two lines at 390px and to one at 1440, so a slot
 * reserved by a **length** passes at the width somebody measured and fails at
 * every other. `CHARTING.md` §15.4 is the same finding on the readout strip, and
 * the middle viewport is again the instrument.
 */
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 800 },
  { name: "phone", width: 390, height: 780 },
] as const;

// **Amended 2026-09-14 (§80).** This asserted that a window change leaves the
// previous chart on screen *labelled*, which is half of what it now asserts. The
// label went: the in-flight rail's whole visible life is 3–68 ms on a local pair,
// which is a sentence appearing and vanishing over a chart that did not visibly
// change. What stayed is the chart, the figures and their labels, which are the
// part acceptance criterion 4 is actually about.
test("a window change keeps the previous window's charts on screen, unlabelled", async ({
  page,
}) => {
  await page.goto(EXPLORER);
  await expect(anAnswer(page)).toBeVisible();

  // Non-empty on both stores: a frame is drawn in every state that has a window,
  // so there are gridlines and an axis rule even where there are no bars.
  const before = await plotMarks(page);
  expect(before).not.toBe("");
  const wasAt = await plotTop(page);

  const release = await holdTheAnswer(page);
  await cell(page, "1 month").click();

  // **The whole of acceptance criterion 4's first half.** The address and the
  // control have moved; the picture has not.
  expect(await plotMarks(page)).toBe(before);

  // And no sentence about it, in either direction — neither the in-flight rail
  // nor the refresh mark. Both were unreadable at the speed this happens.
  await expect(heldRail(page)).toHaveCount(0);

  // What says which window the picture is of is the figures' own labels, which
  // is the half that was never about reading prose. `null` on CI, where the
  // store has no bars and there are no figures to label.
  const label = priceRegion(page).getByText("5D Open");
  if ((await label.count()) > 0) await expect(label).toBeVisible();
  // **And it did not move.** The rail is above the chart, so the slot it goes in
  // is reserved whether it is occupied or not — `BarSeriesPanel.tsx`'s `Rail`.
  // One pixel of tolerance rather than none: a box is a float and the rail's
  // sentence is laid out twice at the same width.
  expect(Math.abs((await plotTop(page)) - wasAt)).toBeLessThan(1);
  // `.first()`: the volume plot draws its canvas and its reading overlay as two
  // absolutely-positioned siblings, so `locator("svg")` is two nodes.
  await expect(volumeRegion(page).locator("svg").first()).toBeVisible();
  await expect(cell(page, "1 month")).toHaveAttribute("aria-checked", "true");

  release();
  await expect(anAnswer(page)).toBeVisible();
  await expectNothingFailedToRender(page);
});

// **The panel a slow window change draws** (2026-09-14, §80).
//
// `holdTheAnswer` is what makes this reachable: the panel appears 160 ms into a
// wait, and an ordinary window change costs 2–9 ms warm and 7–68 ms cold, so
// nothing short of an indefinitely held response gets here. That is the point of
// the threshold rather than a limitation of the test.
//
// The instrument is the chart's text alternative rather than a class name: the
// panel is `aria-hidden` and wordless, and what it corresponds to is the state
// the alternative names. Whether it *looks* like a wait is
// `Market/ChartPending` in the workshop; no browser assertion can judge that.
test("a slow window change draws a panel over the chart, and keeps the figures", async ({
  page,
}) => {
  await page.goto(EXPLORER);
  await expect(anAnswer(page)).toBeVisible();

  const wasAt = await plotTop(page);
  const figuresWereAt = await closeLabelTop(page);

  const release = await holdTheAnswer(page);
  await cell(page, "1 month").click();

  await expect(waiting(page)).toBeVisible();

  // **Over the chart, not instead of it.** The plot has not moved and the
  // figures have not moved, which is the reserved rail slot's own rule
  // (2026-09-13) surviving a change that could easily have broken it: an earlier
  // draft of this repair replaced the whole answer and dropped the chart 30 px
  // under the pointer.
  expect(Math.abs((await plotTop(page)) - wasAt)).toBeLessThan(1);
  await expectFiguresUnmoved(page, figuresWereAt);

  release();
  await expect(anAnswer(page)).toBeVisible();
  await expect(waiting(page)).toHaveCount(0);
  await expectNothingFailedToRender(page);
});

// **The chart does not move when a window is pressed** (2026-09-13).
//
// **Red on a STALE developer store, and that is the store rather than the
// chart** (found 2026-09-22, against a store six sessions behind). The default
// window is five sessions; on a store whose newest session is older than that
// it is a correct `empty` with no figures row, and `1 month` reaches back far
// enough to hold bars — so the press is an `empty → partial` transition, the
// reading row appears above the picture, and the plot moves **90 px** at
// tablet and phone with nothing wrong. CI's store (zero bars) and the deployed
// one (backfilled nightly) are the same state either side of the press, which
// is the assumption this test makes. Run it against `pnpm store:bare` or
// backfill first; do not widen the tolerance.
//
// The rail is rendered above the picture and only while a request is
// unanswered, so without a reserved slot the chart drops the instant somebody
// presses a window and rises again when the answer lands — 30px, measured, under
// the pointer of the person reading it. `BarSeriesPanel.tsx`'s `Rail` is the
// repair and this is the only instrument that can see it: jsdom computes no
// layout, so the defect and the fix render identically below `pnpm e2e`.
for (const viewport of VIEWPORTS) {
  test(`pressing a window does not move the chart at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto(EXPLORER);
    await expect(anAnswer(page)).toBeVisible();

    const wasAt = await plotTop(page);

    // `null` on CI, where the store has no bars and the panel is a correct
    // `empty` — see the helper. Captured rather than skipped, so the figures
    // half runs wherever there are figures and the chart half runs everywhere.
    const figuresWereAt = await closeLabelTop(page);

    const release = await holdTheAnswer(page);
    await cell(page, "1 month").click();
    // The in-flight rail stopped rendering on 2026-09-14 (§80), so what marks
    // the moment is the state itself. The assertion below is unchanged and is
    // the point: whatever is drawn while a window is in flight, the chart does
    // not move.
    await expect(waiting(page)).toBeVisible();

    // One pixel of tolerance rather than none: a box is a float, and the
    // reservation is the same sentence laid out twice at the same width.
    expect(Math.abs((await plotTop(page)) - wasAt)).toBeLessThan(1);
    await expectFiguresUnmoved(page, figuresWereAt);

    release();
    await expect(anAnswer(page)).toBeVisible();
    expect(Math.abs((await plotTop(page)) - wasAt)).toBeLessThan(1);
    await expectFiguresUnmoved(page, figuresWereAt);
    await expectNothingFailedToRender(page);
  });
}

test("a failed window change leaves the charts, one retry, and no blank page", async ({
  page,
}) => {
  await page.goto(EXPLORER);
  await expect(anAnswer(page)).toBeVisible();

  const before = await plotMarks(page);

  // The one retryable failure this layer has. `route.fulfill()` rather than a
  // real broken backend, for `security-series-states.spec.ts`'s reason: a
  // journey built on breaking a deployment six ways is a journey nobody
  // reviews.
  await page.route(BARS_ROUTE_PATTERN, async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      // **A whole `ApiError`, including the `requestId`.** The contract makes
      // that field required, `isApiError` refuses a body without it, and a
      // refused body is classified `http-error` — which this layer deliberately
      // does not promise is retryable. A stub missing it produces a failure with
      // no `Try again` on it and looks exactly like the product being wrong.
      body: JSON.stringify({
        code: "SERVICE_UNAVAILABLE",
        message: "The market data store is not reachable.",
        requestId: "a3f1c0e2-7b44-4d19-9e0c-52a8d6f1b330",
      }),
    });
  });

  await cell(page, "1 month").click();

  await expect(heldRail(page)).toContainText(
    "Still showing the 5-session window. The 21-session window could not be read",
  );

  // The charts are untouched, the control is still operable, and there is
  // **exactly one** `Try again` on the screen.
  expect(await plotMarks(page)).toBe(before);
  // `/^Try again/` rather than the whole name: this assertion is about **how
  // many** retry controls the screen offers, across every subject, and Task
  // 2.14.7 put the subject in each one’s accessible name.
  await expect(page.getByRole("button", { name: /^Try again/ })).toHaveCount(1);
  await expect(cell(page, "5 days")).toBeEnabled();
  await expectNothingFailedToRender(page);
});

test("the three refusals the address reaches are produced with no stubbing", async ({
  page,
}) => {
  // Neither refusal is reachable through the **control** — the five windows are
  // all inside the calendar, and §2.1's timeframe mapping forecloses the cap —
  // and all three are reachable by typing an address, which is what Epic 11's
  // `setTimeWindow` will also do.
  const refusals = [
    { sessions: "1000", says: /trading calendar/ },
    { sessions: "0", says: /zero sessions/ },
    // The **server's** sentence and not the control's readout, which says the
    // same three words a few centimetres away. Two surfaces, two sentences, one
    // event — and a locator that cannot tell them apart is testing neither.
    { sessions: "abc", says: /is not a session count\. Expected/ },
  ];

  for (const { sessions, says } of refusals) {
    await page.goto(`${EXPLORER}?sessions=${sessions}`);

    // The server's own sentence, rendered verbatim, with no retry: a refusal is
    // a fact about the request rather than about the moment.
    await expect(readable(priceRegion(page), says)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Try again/ })).toHaveCount(
      0,
    );

    // **The control is present and operable in a refused state**, which is the
    // thing the search field taught and the reason this assertion is here
    // rather than argued: a reader whose window was refused needs the control
    // that picks a different one.
    await expect(cell(page, "5 days")).toBeEnabled();
    await expect(page).toHaveURL(new RegExp(`sessions=${sessions}$`));
  }

  await expectNothingFailedToRender(page);
});

test("a refusal after an answer keeps the answer, and names which window it is", async ({
  page,
}) => {
  await page.goto(EXPLORER);
  await expect(anAnswer(page)).toBeVisible();

  const before = await plotMarks(page);

  // A hand-typed address, which is exactly how this refusal is reached — and
  // the navigation is client-side, so the previous answer is still held.
  await page.getByRole("link", { name: /NVDA/ }).first().click({ trial: true });
  await page.evaluate(() => {
    window.history.pushState({}, "", "?sessions=1000");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

  await expect(heldRail(page)).toContainText(
    "Still showing the 5-session window. The 1,000-session window was not answered",
  );
  expect(await plotMarks(page)).toBe(before);
  await expect(page.getByRole("button", { name: /^Try again/ })).toHaveCount(0);
});

test("a chart that arrives after a refusal is measured, and draws", async ({
  page,
}) => {
  // **A defect found by looking at the running page** (Task 2.13.7), and it is
  // older than this task.
  //
  // Both plots return `null` before they have a window to draw, so a mount that
  // begins in `refused` has no plot element when `usePlotBox`'s effect runs. Its
  // dependencies were `[report, role]`, neither of which ever changes — so the
  // `ResizeObserver` was never created, and **nothing re-ran the effect to
  // create one**. Pressing a window with bars then rendered a real frame with a
  // zero measurement in it: an `<svg>` at 0 × 0 inside a plot 939px wide, the
  // compact density class at a 985px region, and a panel of correct figures
  // under an empty box.
  //
  // Reachable since Task 2.13.6 put the window in the address, by exactly this
  // route: a cold link to a refused window, then any window with bars. The
  // navigation is client-side, so the component never remounts.
  //
  // Nothing below `pnpm e2e` can see it. jsdom implements no `ResizeObserver`
  // and computes no layout, so the measurement is zero there whether the repair
  // is present or not.
  await page.goto(`${EXPLORER}?sessions=1000`);
  await expect(readable(priceRegion(page), /trading calendar/)).toBeVisible();

  // No frame at all, which is the correct rendering of a cold refusal and is
  // also the state that used to strand the observer.
  expect(await priceRegion(page).locator("svg").count()).toBe(0);

  await cell(page, "5 days").click();
  await expect(anAnswer(page)).toBeVisible();

  // Measured, not merely present. A stranded observer renders every one of
  // these elements at zero, so a `toBeVisible` here would pass against the
  // defect — `CHARTING.md` §11.2's rule about counting rather than asserting
  // visibility, arriving from the other direction.
  const plot = priceRegion(page).locator("svg").first();
  const box = await plot.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(200);
  expect(box?.height ?? 0).toBeGreaterThan(100);
  await expectNothingFailedToRender(page);
});

test("a rapid sequence of presses settles on the last one, showing one held answer", async ({
  page,
}) => {
  const asked: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/market-data/bars")) asked.push(url);
  });

  await page.goto(EXPLORER);
  await expect(anAnswer(page)).toBeVisible();

  const release = await holdTheAnswer(page);

  // Three presses inside one answer's flight. The hook supersedes by request
  // identity — `useBarSeries` has asserted that in jsdom since Task 2.10.5, and
  // until the control existed there was no client-side route from one request
  // to another to drive it with.
  await cell(page, "1 month").click();
  await cell(page, "3 months").click();
  await cell(page, "1 year").click();

  // **One wait, not three.** Superseded requests do not each get their own
  // state: what is on screen never changed, and it is still the answer to five
  // sessions with one panel over it.
  //
  // Amended 2026-09-14 (§80): this read the rail's sentence, which no longer
  // renders. The alternative says the same fact and is the one thing addressed
  // to a reader in this state.
  await expect(waiting(page)).toHaveCount(1);
  await expect(heldRail(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\?sessions=252$/);

  release();
  await expect(waiting(page)).toHaveCount(0);

  // Every press asked, and the last one is what settled. Nothing here asserts
  // that the earlier answers did not arrive — they may have — only that none of
  // them is what the page ended up showing.
  expect(asked.filter((url) => url.includes("sessions=252"))).toHaveLength(1);
  await expectNothingFailedToRender(page);
});

test("changing the security drops the held answer rather than relabelling it", async ({
  page,
}) => {
  await page.goto(EXPLORER);
  await expect(anAnswer(page)).toBeVisible();

  const release = await holdTheAnswer(page);
  await page.goto(`/securities/AMD?sessions=21`);

  // The fence, in a browser: a held NVDA series under an AMD heading is
  // plausible and wrong rather than visibly broken, so the screen blanks to
  // `loading` exactly as it did before this task.
  await expect(
    priceRegion(page).getByText("Reading the series…"),
  ).toBeVisible();
  await expect(heldRail(page)).toHaveCount(0);

  release();
  await expect(anAnswer(page)).toBeVisible();
});
