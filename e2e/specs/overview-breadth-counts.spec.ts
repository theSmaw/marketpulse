import { decodeMarketStreamMessage } from "@marketpulse/shared";
import type {
  SecuritiesResponse,
  WireMarketBreadth,
  WireMarketOverview,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { backendOrigin } from "../support/pair.js";

// **The breadth counts, over a frame this product's own server produced**
// (Task 4.4.8 — Story 4.4's done-when 1 and 2).
//
// ## Why this spec exists beside `overview-breadth-region.spec.ts`
//
// That spec **furnishes** its frames with the shipped encoder, which is right
// for what it asserts — the drawn shape, the suppressed ledger, the one-box
// geometry — and is **structurally unable** to say anything about the count.
// Story 4.3 paid to learn the general form: four overview specs passed against
// a server with the ranking deleted, because each supplied the data it then
// checked.
//
// **Breadth is worse than the ranking was.** A rank is a permutation of an
// input, so a captured frame still carries the input and a pass-through can
// compare the two. A count is a **reduction**: the browser receives
// `advancing / declining / unchanged / measured / tracked` and draws them, and
// **the frame carries no recoverable input at all**. There is nothing on it to
// compare the counts against. A furnished frame can only be made to agree with
// itself, and so — on its own — can a recorded one.
//
// So this file reaches **outside the frame** for everything it can:
//
//   - the **identity** `advancing + declining + unchanged === measured`, which
//     the frame can answer about itself;
//   - `measured <= tracked`, likewise;
//   - **`tracked` against `GET /securities`** — an independent source (the
//     database, over HTTP) for a figure the socket computed from the
//     typechecked universe in process. This is the assertion that makes the
//     file non-vacuous **on CI**, and it is the one that catches the defect
//     `breadth-is-counted-over-the-equities-alone` was written against: a count
//     handed the join whole reports `tracked: 518`, and one handed what the
//     page subscribed to reports `15`;
//   - and, where the basis allows it, **a recount of the three buckets from
//     `GET /securities`' own closes**, which is the only instrument in this
//     repository that can see a transposed bucket or an inverted sign in the
//     producer.
//
// ## The cross-check this task specified does not exist, and the reason is
// load-bearing
//
// The brief proposed: the four proxies and eleven sectors ride on the same
// frame and are inside the 518, so the number of those fifteen that are
// `observed` with a positive move is a lower bound on `advancing`.
//
// **Those fifteen are precisely the securities breadth excludes.** The count is
// taken over `equityTickers()` — 503 companies, by positive membership — and
// `breadth-is-counted-over-the-equities-alone` holds it there, because a count
// including `SPY` and the eleven sector SPDRs **beside their own constituents**
// makes this region and `Market proxies` non-independent. So `XLK` advancing is
// not evidence about `advancing`; it is evidence about the one number the
// producer is forbidden to count. A lower-bound assertion built on it would be
// **red exactly when the producer is correct** on any frame where a fund moved
// up and the names inside it did not.
//
// The recount below is what replaces it, and it is strictly stronger: it is
// one-sided about nothing, it reaches an independent source, and it fails on a
// transposed bucket rather than only hinting at one.
//
// ## What a green run here does not certify
//
// The established sentence first: this says **everything about what the browser
// does with an arrival and nothing about whether one arrives.**
//
// And one that is specific to a count, because it is the price of the shape:
// **a producer that stops counting but keeps naming its set is invisible here,
// and necessarily so.** `advancing: 0, declining: 0, unchanged: 0, measured: 0`
// beside a correct `tracked` is *we counted and heard nothing* — CI's own state
// for ever, 518 securities and zero bars — and it is a **true** answer rather
// than a degraded one. No assertion can call it a defect without being red on
// every gated run. What closes that gap on a store that holds closes is the
// third test; on CI nothing closes it, and `docs/GAPS.md` says so rather than
// this file pretending otherwise.
//
// **No gated machine has ever seen a breadth figure.** CI's store has no bars,
// so the `observed` basis is unreachable there and the `session` basis counts
// over zero closes: `measured: 0`, the ledger suppressed, the quiet group
// carrying the whole truth. Every count in this file's local transcripts came
// from a developer's backfilled store. `pnpm store:bare` reproduces CI's shape.
//
// ## It stays out of the three characterised flakes' class
//
// All three are *a byte-identical text assertion over a page that is still
// settling*. So: nothing is captured until a **positive** state has been
// reached (a recorded overview frame carrying a breadth section **and** the
// region's set heading drawn); the screen is read **scoped to the region**
// through one `evaluate`, never as whole-`main` text; the agreement is
// converged on with `expect.poll` rather than snapped once, because a second
// overview frame landing between reading the frame and reading the DOM is a
// real sequence on a machine with a provider and not a defect; and **no
// duration and no threshold is asserted anywhere in this file.**

const OVERVIEW = "/";

/**
 * The three labels, the two quiet labels and the ladder's threshold, **written
 * out rather than imported**.
 *
 * Task 4.3.7's rule for the formatter, and it holds for the same reason here:
 * `BUCKET_LABELS`, `unheardLabelOf` and `SMALLEST_DRAWABLE_SCALE` are the
 * module under test's own, so importing them would make this spec agree with
 * that module by construction. If the product's words or its threshold change,
 * these numbers and strings are supposed to need changing.
 */
const BUCKET_LABELS = {
  advancing: "Advancing",
  declining: "Declining",
  unchanged: "Unchanged",
} as const;

const UNHEARD_LABELS = {
  observed: "Not heard from",
  session: "No prior close",
} as const;

/** The smallest N the ladder and the bands are drawn against. */
const SMALLEST_DRAWABLE_SCALE = 2;

/** The decimals the product decides a direction at — Task 4.3.7's rule again. */
const DISPLAYED_DECIMALS = 2;

/**
 * Open the landing page through a **pass-through** market-stream route, and
 * return the overview frames the real gateway sent.
 *
 * Copied from `overview-sector-ranking.spec.ts`, whose docblock argues every
 * line of it: `server.onMessage` turns off automatic forwarding so the forward
 * is explicit and verbatim, the shipped decoder reads the frame so a protocol
 * change breaks this at the compiler, the route is installed **before** `goto`
 * because a connection already made cannot be intercepted, and it is
 * **awaited**, because an unawaited `routeWebSocket` leaves the page talking to
 * the gateway directly — identical on screen, and an empty list here.
 *
 * `GET /market-data` is not intercepted: the chrome's venue and connection word
 * are the real server's answer, and nothing here reads them.
 */
async function openWithRecordedStream(
  page: Page,
): Promise<readonly WireMarketOverview[]> {
  const overviews: WireMarketOverview[] = [];

  await page.routeWebSocket(/\/market-stream$/u, (ws) => {
    const server = ws.connectToServer();

    server.onMessage((raw) => {
      const decoded = decodeMarketStreamMessage(String(raw));
      if (decoded.kind === "message" && decoded.message.type === "overview") {
        overviews.push(decoded.message.overview);
      }

      ws.send(raw);
    });
  });

  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  return overviews;
}

/** The last overview frame that carried a breadth section, or `undefined`. */
const latestBreadth = (
  overviews: readonly WireMarketOverview[],
): WireMarketBreadth | undefined =>
  overviews.reduce<WireMarketBreadth | undefined>(
    (carried, overview) => overview.breadth ?? carried,
    undefined,
  );

/**
 * The recorded section, or a loud failure.
 *
 * A helper rather than a `!`, which the lint rules forbid product-wide — and
 * the message matters: *the gateway sent no breadth section* is a different
 * finding from an assertion about a count, and it is the one a rollback
 * produces.
 */
const mustHaveBreadth = (
  breadth: WireMarketBreadth | undefined,
): WireMarketBreadth => {
  if (breadth === undefined)
    throw new Error("no overview frame carried a breadth section");
  return breadth;
};

const breadthRegion = (page: Page): Locator =>
  page.getByRole("region", { name: "Market breadth" });

/** What the region holds, read in one pass, scoped to the region. */
interface RegionReading {
  readonly heading: string | null;
  readonly ledgerVisible: boolean;
  readonly counts: Record<string, string>;
  readonly quiet: Record<string, string>;
  readonly ladder: string | null;
  readonly net: string | null;
}

/**
 * Read the region.
 *
 * **`visibility` rather than presence**, which is the component's whole idiom:
 * at N = 0 the ledger, the ladder and the headline keep their room and give up
 * their content, so *hidden* and *absent* are different answers and only the
 * first is correct. `visibility` is inherited, so the computed value on a tick
 * inside a held ladder reads `hidden` without this needing to know which
 * element carries the class.
 *
 * The two `<dl>`s are read **structurally** — list, row, `dt`, first `dd` —
 * rather than by a pattern over the region's text, which is this suite's rule
 * about a locator loose enough for a neighbour to satisfy. The ladder's
 * endpoint and the headline figure have no semantics to reach them by: both are
 * `aria-hidden` by decision, so they are reached by their module class, which
 * is `overview-breadth-region.spec.ts`' precedent.
 */
const readRegion = (region: Locator): Promise<RegionReading> =>
  region.evaluate((root) => {
    const shown = (element: Element | null): boolean =>
      element !== null && getComputedStyle(element).visibility === "visible";

    const rowsOf = (list: Element | null): Record<string, string> => {
      const out: Record<string, string> = {};
      if (list === null) return out;
      for (const row of list.querySelectorAll(":scope > div")) {
        const label = row.querySelector("dt");
        const figure = row.querySelector("dd");
        if (label === null || figure === null) continue;
        out[label.textContent.trim()] = figure.textContent.trim();
      }
      return out;
    };

    const lists = root.querySelectorAll("dl");
    const ledger = lists[0] ?? null;
    const quiet = lists[1] ?? null;
    const tick = root.querySelector('[class*="_tickFull_"]');
    const net = root.querySelector('[class*="_headlineFigure_"]');

    return {
      heading: root.querySelector("h3")?.textContent.trim() ?? null,
      ledgerVisible: shown(ledger),
      counts: rowsOf(ledger),
      quiet: rowsOf(quiet),
      ladder: shown(tick) ? (tick?.textContent.trim() ?? null) : null,
      net: shown(net) ? (net?.textContent.trim() ?? "") : null,
    };
  });

/** What the region must hold, derived from the frame and from nothing else. */
const expectedFrom = (breadth: WireMarketBreadth): RegionReading => {
  const counted = breadth.measured > 0;
  const net = breadth.advancing - breadth.declining;

  return {
    heading: `Of the ${String(breadth.tracked)} we track`,
    ledgerVisible: counted,
    counts: {
      [BUCKET_LABELS.advancing]: String(breadth.advancing),
      [BUCKET_LABELS.declining]: String(breadth.declining),
      [BUCKET_LABELS.unchanged]: String(breadth.unchanged),
    },
    quiet: {
      [UNHEARD_LABELS[breadth.basis]]: String(
        breadth.tracked - breadth.measured,
      ),
    },
    ladder:
      breadth.measured < SMALLEST_DRAWABLE_SCALE
        ? null
        : String(breadth.measured),
    // The figure is read as the **concatenation a screen reader is handed** —
    // the `aria-hidden` glyph, the visually-hidden direction word and the
    // digits are three nodes, and a spec asking for one of them is asking for
    // a node that does not exist. The grouping separator is not re-implemented
    // and does not need to be: the net of two counts over 503 has at most three
    // digits.
    net: counted
      ? `${net > 0 ? "▲up" : net < 0 ? "▼down" : "unchanged"} ${
          net > 0 ? "+" : net < 0 ? "−" : ""
        }${String(Math.abs(net))}`
      : null,
  };
};

/** `GET /securities`, from the backend the running pair resolved. */
async function securities(page: Page): Promise<SecuritiesResponse> {
  const response = await page.request.get(`${backendOrigin}/securities`);
  expect(response.ok()).toBe(true);
  return (await response.json()) as SecuritiesResponse;
}

/**
 * The set breadth is counted over, **as the database answers it**.
 *
 * `active` and `kind === "equity"`, which is `equityTickers()`' predicate
 * spelled from the other side of the wire: that function derives the set from
 * the typechecked `UNIVERSE` in the backend's own process, and this derives it
 * from the rows `pnpm universe` converged into PostgreSQL. **Two sources, one
 * claim** — which is what makes the comparison worth making at all, and is why
 * neither figure is written out here.
 */
const activeEquities = (body: SecuritiesResponse): readonly string[] =>
  body.securities
    .filter(
      (security) => security.status === "active" && security.kind === "equity",
    )
    .map((security) => security.symbol);

// 1440 × 900, the viewport every figure in this story's record was measured at.
// Nothing here asserts a box, and it is stated anyway so a failure's screenshot
// is comparable with the rest of the story's.
test.use({ viewport: { width: 1440, height: 900 } });

test("the counts partition the denominator, and the denominator is the set the universe says it is", async ({
  page,
}) => {
  const overviews = await openWithRecordedStream(page);

  // **The positive state, waited for before anything is read.** A recorded
  // overview frame carrying a breadth section says the server has answered;
  // the drawn set heading says the browser has drawn its answer rather than its
  // reservation. Neither implies the other, and reading either early is the
  // shape all three of this suite's characterised flakes have.
  await expect.poll(() => latestBreadth(overviews) !== undefined).toBe(true);
  await expect(
    breadthRegion(page).getByRole("heading", { level: 3 }),
  ).toHaveCount(1);

  const breadth = mustHaveBreadth(latestBreadth(overviews));

  // **The identity, read off the frame.** On CI every term is `0` and it still
  // holds — which is not a vacuous pass, because the **next** assertion makes
  // `0` and `503` a real distinction on exactly that store.
  expect(breadth.advancing + breadth.declining + breadth.unchanged).toBe(
    breadth.measured,
  );

  // **The remainder below the rule is `tracked − measured`**, so a denominator
  // larger than the set is a count of securities that cannot exist.
  expect(breadth.measured).toBeLessThanOrEqual(breadth.tracked);

  // **`tracked` against an independent source.** This is the assertion that
  // catches a count taken over the wrong symbol set, and the one that is
  // non-vacuous on a store with no bars: 518 is the join's whole answer, 15 is
  // what the page subscribed to, and 503 is the set the region's own heading
  // claims.
  const body = await securities(page);
  expect(breadth.tracked).toBe(activeEquities(body).length);

  // **Exactly four figures** — the negative-filter regression, asserted here
  // too because it is the frame this file records and the defect is one line
  // from the breadth split (`a-section-is-handed-the-join-whole` performs it,
  // and `overview-frame-sections.spec.ts` owns the claim).
  const latest = overviews.at(-1);
  expect(latest?.figures).toHaveLength(4);

  await expectNothingFailedToRender(page);
});

test("the screen is the frame's counts and nothing it invented", async ({
  page,
}) => {
  const overviews = await openWithRecordedStream(page);

  await expect.poll(() => latestBreadth(overviews) !== undefined).toBe(true);
  await expect(
    breadthRegion(page).getByRole("heading", { level: 3 }),
  ).toHaveCount(1);

  // **Converged on rather than snapped**: on a machine with a provider a second
  // overview frame lands every minute, and one arriving between the frame read
  // and the DOM read is the product working. What this converges on is *the
  // screen agrees with the latest frame*, which is a transition rather than an
  // absence.
  await expect
    .poll(async () => JSON.stringify(await readRegion(breadthRegion(page))))
    .toBe(
      JSON.stringify(expectedFrom(mustHaveBreadth(latestBreadth(overviews)))),
    );

  // **And the denominator reaches a listener.** The ladder is `aria-hidden` by
  // decision, so the spoken half of the footer clause is the only delivery of N
  // to that audience — derived from the frame's own `tracked`, never a literal,
  // because a `503` written here is a lie with no symptom the day a constituent
  // is delisted.
  const breadth = mustHaveBreadth(latestBreadth(overviews));
  await expect(breadthRegion(page)).toContainText(
    `Of the ${String(breadth.tracked)} companies we track`,
  );

  await expectNothingFailedToRender(page);
});

test("the three buckets recounted from the store's own closes", async ({
  page,
}) => {
  const overviews = await openWithRecordedStream(page);

  await expect.poll(() => latestBreadth(overviews) !== undefined).toBe(true);

  const breadth = mustHaveBreadth(latestBreadth(overviews));

  // **The one basis a second source can answer.** A live count is over prices
  // that exist only on the socket; a session count is over `previousClose` →
  // `close`, which `GET /securities` carries for every security it lists. So
  // this test is the shut market's, which is roughly 80% of the week — and the
  // state CI is in permanently, where it compares `0` with `0` and says so.
  test.skip(
    breadth.basis !== "session",
    `the server sent the ${breadth.basis} basis — a live count is over prices this route does not carry`,
  );
  if (breadth.basis !== "session") return;

  const body = await securities(page);
  const equities = new Set(activeEquities(body));

  // **Filtered to the session the frame names**, which is the one guard this
  // comparison needs: the producer reads a closes cache with its own window and
  // this route reads the table, so a store mid-backfill can legitimately hold a
  // newer session than the frame was computed from. Comparing only the session
  // the frame names makes the two sides answer one question instead of two.
  const sameSession = body.lastCloses.filter(
    (close) => equities.has(close.symbol) && close.session === breadth.session,
  );

  // **A skip rather than a vacuous pass, and this is the one clause the task's
  // own break produced.** With the producer handed an empty set it reports
  // `tracked: 0` and names *today* as its session — which no stored close
  // belongs to — so the filter above empties and `0 === 0` would have been a
  // green beside a producer that had stopped counting. On CI the same thing
  // happens honestly: 518 securities, zero bars, no close for any session. A
  // skip says *this instrument could not judge*, which is the true answer in
  // both cases and the one that does not let the suite claim coverage it has
  // not got. The count itself is caught either way — `tracked` is cross-checked
  // in the first test.
  test.skip(
    sameSession.length === 0,
    `the store holds no closes for ${breadth.session}, the session the frame names — there is nothing to recount`,
  );

  // `changePercent` and `directionOf`, **re-implemented rather than imported**.
  // Importing them would assert that the application agrees with itself, which
  // is the whole thing this test exists to avoid: the direction rule is decided
  // on the **displayed** figure, and that rule is what a transposed bucket or an
  // inverted sign lives inside.
  const recount = { advancing: 0, declining: 0, unchanged: 0 };
  for (const close of sameSession) {
    const previous = close.previousClose;
    if (previous === null || previous === 0) continue;
    const percent = ((close.close - previous) / previous) * 100;
    if (!Number.isFinite(percent)) continue;
    const displayed = Number(percent.toFixed(DISPLAYED_DECIMALS));
    if (displayed > 0) recount.advancing += 1;
    else if (displayed < 0) recount.declining += 1;
    else recount.unchanged += 1;
  }

  expect({
    advancing: breadth.advancing,
    declining: breadth.declining,
    unchanged: breadth.unchanged,
    measured: breadth.measured,
  }).toEqual({
    ...recount,
    measured: recount.advancing + recount.declining + recount.unchanged,
  });

  await expectNothingFailedToRender(page);
});
