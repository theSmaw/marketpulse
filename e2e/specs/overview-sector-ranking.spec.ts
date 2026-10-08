import {
  SECTORS,
  SECTOR_ETFS,
  decodeMarketStreamMessage,
} from "@marketpulse/shared";
import type {
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";

// **The order on the landing page is the comparator's, over a frame this
// product's own server produced** (Task 4.3.8 — Story 4.3's done-when 1 and 2).
//
// ## What a green run here does not certify
//
// The established sentence, unchanged: this says **everything about what the
// browser does with an arrival and nothing about whether one arrives**. And
// here it has a second, sharper half that belongs at the top rather than in a
// footnote:
//
// **The ranked state this story exists to produce occurs on no gated machine.**
// CI's store is 518 securities and **zero bars**, CI has no credential and no
// upstream socket, so all eleven sector figures there are `unknown` **for
// ever** — no ranking key, no `<ol>`, nothing for a comparator to order. The
// second test below therefore **skips on every gated run**, by name and with
// the reason printed, and the only machine that has ever watched the shipped
// sort produce an order in a browser is a developer's with a backfilled store.
// `pnpm store:bare` reproduces CI's shape locally in seconds and is how that
// claim was checked rather than assumed.
//
// The first test runs everywhere, including on CI's permanently-quiet store,
// because *nothing is lost and nothing is invented between the frame and the
// screen* is a claim the all-`unknown` state can still answer.
//
// ## Why this spec does NOT furnish the stream, where its three siblings do
//
// `overview-proxy-live-update.spec.ts`, `overview-sector-region.spec.ts` and
// `overview-sector-order.spec.ts` all answer `/market-stream` **from the
// test**, and they are right to: each asserts what the browser draws, and a
// browser draws figures a runner with no bars could never obtain. This spec
// asserts something none of them can, and the difference is where the sort
// runs.
//
// **`rankSectorFigures` runs server-side** — `toWireMarketOverview` in
// `apps/backend/src/market-overview.ts`, handed the eleven in `SECTORS`'
// declared order and returning them ranked — and **nothing in the browser
// ranks** (`sector-performance.ts` says so at length, and that is a property
// worth keeping). So a spec that writes its own `sectors` array writes the very
// thing under test: a furnished frame carries whatever order the fixture holds,
// the browser draws it faithfully, and **deleting the comparator changes
// nothing any of those three specs can see**. Checked, not assumed — see the
// task record.
//
// Two consequences, and they are this file's whole shape:
//
//   - **The harness is a PASS-THROUGH.** `ws.connectToServer()` dials the real
//     gateway and every frame is forwarded verbatim; the route records them on
//     the way past. Nothing is manufactured, which keeps
//     `overview-proxy-live-update.spec.ts`'s narrowness rule — *a stub that can
//     send any frame can manufacture states the server cannot, and those look
//     exactly like findings* — satisfied by having no stub at all. It is also
//     why **no fixture is served out of order here**: the deliberately wrong
//     order is the one the shipped producer is already handed, `SECTORS`'
//     declared order, and the sort's job is to not return it.
//   - **The assertion is a PERMUTATION of a captured order, never a literal
//     list.** Eleven literal positions would re-implement the sort in the spec
//     and assert a wrong comparator rather than catch one — so what is captured
//     is the server's own `sectors` array, and what is asserted is a property of
//     it: a permutation of the declared eleven, strongest first, keyless last,
//     and not the order it was given.
//
// ## It stays out of the two characterised flakes' class
//
// Both are *a byte-identical text assertion over a page that is still
// settling*. So: the baseline is captured only after a **positive** state (a
// recorded overview frame **and** eleven rows on screen); the screen is read
// **scoped to the eleven symbols' document order** rather than as whole-`main`
// text; the drawn order is converged on with `expect.poll` rather than snapped
// once, because a second overview frame landing between reading the frame and
// reading the DOM is a real sequence on a machine with a provider and not a
// defect; and **no duration and no threshold is asserted anywhere in this
// file**.

const OVERVIEW = "/";

/**
 * The eleven benchmarks **in the order the producer is handed them**, derived
 * from `SECTOR_ETFS` rather than written out.
 *
 * Two reasons it is derived and both are enforced elsewhere.
 * `one-pairing-of-a-sector-and-its-benchmark` refuses a second pairing of a
 * sector with its fund, so a list of eleven tickers in a spec is a check
 * failure as well as a duplicate. And this **is** the producer's input order —
 * `sectorEtfTickers()` is `SECTORS.map((sector) => SECTOR_ETFS[sector])`
 * filtered by what is tracked — which makes it the fixture that is deliberately
 * in the wrong order. Writing it out would be a second copy of the one thing
 * the sort has to change.
 */
const DECLARED: readonly string[] = SECTORS.map(
  (sector) => SECTOR_ETFS[sector] as string,
);

/**
 * The decimals the screen prints a percentage at.
 *
 * **Written out rather than imported**, which is Task 4.3.7's rule for the
 * formatter and holds for the same reason here: `PERCENT_DISPLAY_DECIMALS` is
 * shared with `sector-ranking.ts`, so importing it would make this spec agree
 * with the module it is judging by construction. If the product's precision
 * changes, this number is supposed to need changing.
 */
const DISPLAYED_DECIMALS = 2;

/** A percentage as the screen shows it — the precision ties are decided on. */
const displayed = (percent: number): number =>
  Number(percent.toFixed(DISPLAYED_DECIMALS));

/**
 * A figure's ranking key, **read off the wire's own two fields** and not
 * through `moveRankingKey`.
 *
 * The same rule as the formatter above, and it matters more here: the function
 * this spec exists to judge reads these two fields, so asking it which one to
 * read would be asserting that the application agrees with itself. The two
 * names are deliberately different because the bases are — an `observed`
 * figure's move is live-against-a-close and a `stored` figure's is the
 * close-to-close move of a session that is over — and a figure with neither has
 * **no key**, which is the state the whole absent-key rule is about.
 */
const keyOf = (figure: WireOverviewFigure): number | undefined => {
  if (figure.state === "observed") {
    return figure.changePercent !== undefined &&
      Number.isFinite(figure.changePercent)
      ? figure.changePercent
      : undefined;
  }

  if (figure.state === "stored") {
    return figure.sessionChangePercent !== undefined &&
      Number.isFinite(figure.sessionChangePercent)
      ? figure.sessionChangePercent
      : undefined;
  }

  return undefined;
};

/**
 * Open the landing page through a **pass-through** market-stream route, and
 * return the overview frames the real gateway sent.
 *
 * `server.onMessage` turns off Playwright's automatic server-to-client
 * forwarding, so the forward is explicit and verbatim — the frame the browser
 * receives is the bytes the gateway wrote, and this route's only effect is that
 * somebody wrote them down. Client-to-server forwarding is left automatic, so
 * the page's own `subscribe` reaches the gateway unaltered and is answered as
 * it always is.
 *
 * **Installed before `goto`**, which is this suite's standing rule for both
 * kinds of route: a connection already made cannot be intercepted. And
 * **awaited**, for `overview-sector-order.spec.ts`'s reason — an unawaited
 * `routeWebSocket` is a route that may not be in place when the page dials, and
 * the page then talks to the gateway directly, which looks identical on screen
 * and leaves this list empty.
 *
 * `GET /market-data` is **not** intercepted either: the chrome's venue and
 * connection word are the real server's answer, which on a machine with no
 * provider configured is no connection word at all. Nothing here reads them.
 */
async function openWithRecordedStream(
  page: Page,
): Promise<readonly WireMarketOverview[]> {
  const overviews: WireMarketOverview[] = [];

  await page.routeWebSocket(/\/market-stream$/u, (ws) => {
    const server = ws.connectToServer();

    server.onMessage((raw) => {
      const frame = String(raw);

      // Read with the **shipped decoder**, so a protocol change breaks this at
      // the compiler rather than at an assertion — and so an `unreadable` or
      // `unsupported` frame is counted as neither an overview nor a defect
      // here, exactly as the browser counts it.
      const decoded = decodeMarketStreamMessage(frame);
      if (decoded.kind === "message" && decoded.message.type === "overview") {
        overviews.push(decoded.message.overview);
      }

      // Verbatim, and whatever it was. A route that re-encoded would be a route
      // that could not see a frame the shared decoder refuses.
      ws.send(raw);
    });
  });

  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  return overviews;
}

const sectorRegion = (page: Page): Locator =>
  page.getByRole("region", { name: "Sector performance" });

/** Every row the region draws — the ranked `<ol>` and the trailing `<ul>`. */
const rowsIn = (page: Page): Locator =>
  sectorRegion(page).getByRole("listitem");

/**
 * The benchmarks **in the order they are drawn**, read off the rows.
 *
 * Scoped to the eleven symbols rather than matched by a pattern, which is this
 * suite's rule about a locator loose enough for a neighbour to satisfy: a row
 * holds an ordinal, a sector name, a ticker, a figure and sometimes a sentence,
 * and *the thing on it that looks like a ticker* is a description of a defect
 * waiting to happen. `allInnerTexts` returns document order, which is the order
 * a reader and a screen reader are both handed.
 */
const drawnOrder = async (page: Page): Promise<readonly string[]> => {
  const texts = await rowsIn(page).allInnerTexts();
  return texts.map(
    (text) => DECLARED.find((symbol) => text.includes(symbol)) ?? "?",
  );
};

/** The rows of the ranked `<ol>` alone, in document order. */
const rankedOrder = async (page: Page): Promise<readonly string[]> => {
  const texts = await sectorRegion(page)
    .locator("ol")
    .getByRole("listitem")
    .allInnerTexts();
  return texts.map(
    (text) => DECLARED.find((symbol) => text.includes(symbol)) ?? "?",
  );
};

/** The last overview frame that carried a sector section, or `undefined`. */
const latestSectors = (
  overviews: readonly WireMarketOverview[],
): readonly WireOverviewFigure[] | undefined =>
  overviews.reduce<readonly WireOverviewFigure[] | undefined>(
    (carried, overview) => overview.sectors ?? carried,
    undefined,
  );

// 1440 × 900, the viewport every figure in this story's record was measured at.
// Nothing here asserts a box, and it is stated anyway so a failure's screenshot
// is comparable with the rest of the story's.
test.use({ viewport: { width: 1440, height: 900 } });

test("the eleven on screen are a permutation of the frame the server sent — nothing lost, nothing invented, nothing twice", async ({
  page,
}) => {
  const overviews = await openWithRecordedStream(page);

  // **The positive state, waited for before anything is captured.** Both halves
  // are needed and neither implies the other: a recorded overview frame says
  // the server has answered, and eleven rows say the browser has drawn its
  // answer rather than its reservation. Reading either one early is the shape
  // both of this suite's characterised flakes have.
  await expect.poll(() => latestSectors(overviews)?.length ?? 0).toBe(11);
  await expect(rowsIn(page)).toHaveCount(11);

  const sent = latestSectors(overviews) ?? [];

  // **The captured order**, which is the only order this spec may compare
  // against. Eleven literal positions here would re-implement the sort.
  const order = sent.map((figure) => figure.symbol);

  // **A permutation of the declared eleven**, which is the producer's input.
  // Three separate failures, and they fail differently: a symbol invented, a
  // symbol lost, a symbol drawn twice. A `Set` comparison alone cannot see the
  // third, which is why the length is asserted beside it — and the third is
  // exactly what an off-by-one in a sort that rebuilds its array produces.
  expect(order).toHaveLength(DECLARED.length);
  expect(new Set(order).size).toBe(DECLARED.length);
  expect([...order].sort()).toEqual([...DECLARED].sort());

  // **And the screen is that order, not another one.** `expect.poll` rather
  // than a single read: on a machine with a provider a second overview frame
  // lands every minute, and a frame arriving between the two reads above is the
  // product working. What this converges on is *the screen agrees with the
  // latest frame*, which is a transition rather than an absence.
  await expect
    .poll(async () => (await drawnOrder(page)).join(" "))
    .toBe(order.join(" "));

  await expectNothingFailedToRender(page);
});

test("the frame's own order is the comparator's: strongest first, keyless last, and not the order it was handed", async ({
  page,
}) => {
  const overviews = await openWithRecordedStream(page);

  await expect.poll(() => latestSectors(overviews)?.length ?? 0).toBe(11);
  await expect(rowsIn(page)).toHaveCount(11);

  const sent = latestSectors(overviews) ?? [];
  const keys = sent.map((figure) => keyOf(figure));
  const keyed = keys.filter((key): key is number => key !== undefined);

  // **The skip that is the honest answer on every gated machine.** CI's store
  // is 518 securities and zero bars, so every sector figure there is `unknown`,
  // every key is absent, and there is no order for a comparator to have
  // produced. A test that passed here would be asserting an absence for free —
  // this suite's own recorded hazard — so it says so and stops.
  //
  // Two keyed figures rather than one: a single key is trivially sorted, and a
  // single-figure store cannot tell a working comparator from a deleted one.
  test.skip(
    keyed.length < 2,
    `the server ranked ${String(keyed.length)} of ${String(sent.length)} sectors — a store with no bars cannot produce a ranked order, so there is nothing here to judge`,
  );

  // **Strongest first, at the precision the screen prints.** The comparator
  // returns `0` for a display-equal pair deliberately, so the assertion is
  // non-increasing rather than strictly decreasing — a pair that reads the same
  // on screen is allowed to sit either way round, and is required not to swap
  // from frame to frame, which is `sector-ranking.test.ts`'s claim and not a
  // browser's.
  const shown = keyed.map((key) => displayed(key));
  expect(shown).toEqual([...shown].sort((left, right) => right - left));

  // **Keyless last, and never at a position `?? 0` would give it.** A sector we
  // have heard nothing about has not moved 0%: a default would place it between
  // a sector that moved +0.01% and one that moved −0.01% and claim the one
  // thing that is missing, as a position rather than as a number. So the
  // assertion is that the keyed block is a prefix — no absent key before a
  // present one, anywhere.
  const firstKeyless = keys.findIndex((key) => key === undefined);
  if (firstKeyless !== -1) {
    expect(keys.slice(firstKeyless).every((key) => key === undefined)).toBe(
      true,
    );
  }

  // **And the sort demonstrably did something.** Deleting `rankSectorFigures`
  // from the producer returns `SECTORS`' declared order unchanged, which is the
  // likeliest shape of the real defect and the one a fixture that was already
  // sorted makes invisible.
  //
  // The clause is **conditioned on the captured data rather than asserted
  // blind**: if the declared order happened to already be in rank order there
  // would be nothing to detect, and a spec that failed on that coincidence
  // would be red against correct code. The condition is computed from the same
  // captured keys, so it says precisely *this frame could tell them apart*.
  const asHanded = DECLARED.map((symbol) =>
    keyOf(
      sent.find((figure) => figure.symbol === symbol) ?? {
        state: "unknown",
        symbol,
      },
    ),
  );
  const handedIsAlreadyRanked = asHanded.every((key, index) => {
    // The last entry has nothing after it. Read as a bound rather than through
    // an `undefined` from the index, because at this position *past the end*
    // and *this figure has no key* are two different things and `?? 0` over
    // either of them is the very defect being asserted about.
    if (index === asHanded.length - 1) return true;

    const next = asHanded[index + 1];
    if (key === undefined) return next === undefined;
    return next === undefined || displayed(key) >= displayed(next);
  });

  if (!handedIsAlreadyRanked) {
    expect(sent.map((figure) => figure.symbol)).not.toEqual([...DECLARED]);
  }

  // **The printed ordinals are the ranked block's own count**, read off the
  // screen rather than recomputed: `1` to n over the `<ol>`, with every keyless
  // figure outside it. That is the one arithmetic the browser does, and it is a
  // count rather than a comparison — which is only sound because every keyless
  // figure already sorts after every keyed one, two assertions above.
  const ranked = await rankedOrder(page);
  expect(ranked).toEqual(
    sent
      .filter((figure) => keyOf(figure) !== undefined)
      .map((figure) => figure.symbol),
  );

  const ordinals = await sectorRegion(page)
    .locator("ol")
    .getByRole("listitem")
    .evaluateAll((items) =>
      items.map((item) => item.firstElementChild?.textContent ?? "?"),
    );
  expect(ordinals).toEqual(ranked.map((_, index) => String(index + 1)));

  await expectNothingFailedToRender(page);
});
