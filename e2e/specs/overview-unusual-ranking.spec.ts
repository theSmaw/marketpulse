import { decodeMarketStreamMessage, marketDateAt } from "@marketpulse/shared";

import type {
  SecuritiesResponse,
  WireMarketOverview,
  WireUnusualActivity,
  WireUnusualRow,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { backendOrigin } from "../support/pair.js";

// **The ranking, judged against something that is not the frame** (Task
// 5.4.3, done-when 3).
//
// ## Why this file exists, and why the obvious spec would not have
//
// Task 5.2.4 proved the general form rather than arguing it: the refusal was
// deleted from a producer and the **pass-through shrugged**. A pass-through
// forwards the server's bytes honestly, so a producer broken into inventing a
// figure is drawn exactly as faithfully as a correct one, and **every *the
// page agrees with the frame* assertion stays green.** Story 5.3 then planted
// `rank × 0.8 when n > 500` and the golden sample stayed green too; only an
// independent recompute saw it.
//
// This region is the worst case this product has for that failure, and it is
// worth being precise about why. **A percentile is the only figure on this
// screen that a reader cannot check against anything on the page.** A price
// has a chart beside it; a sector move has ten siblings; this ordinal's inputs
// are sixty sessions of a table the browser never reads — 101 breakpoints ×
// 501 securities, ~417 KB, which is never going on this wire. So a wrong
// ordinal is a confident, well-formed row at the top of a region about unusual
// behaviour, and nothing on screen contradicts it.
//
// ## So the claim is grounded OUT OF FRAME, in two places
//
// **1. `GET /market-data` — does this deployment have a provider at all?**
// `security-abnormal-move.spec.ts`' mechanism, and it is the strongest claim
// available here. A deployment answering `{"feed": null}` constructs **no
// market stream** (`createMarketStream` refuses the pair), so its trailing
// windows are empty, nothing has been observed, and **any ranked row is
// fabricated by construction**. That is CI's permanent state and a
// developer's default, so this arm is non-vacuous on every machine that will
// ever run it — and it is the arm that goes red on a producer broken into
// inventing a row, which is the exact defect a pass-through cannot see.
//
// **2. `GET /securities` — is the population the one the universe says?**
// `overview-breadth-counts.spec.ts`' `tracked`-against-the-database check:
// `equityTickers()`' predicate spelled from the other side of the wire, over
// the rows `pnpm universe` converged into PostgreSQL rather than over the
// typechecked `UNIVERSE` the backend holds in its own process.
//
// ## And the ORDER is recomputed rather than read
//
// Every row carries its own key, so the order is checkable **from the frame**
// — but only if the order is re-expressed here rather than imported.
// `compareByPercentile`, `isRankedByPercentile` and `selectByPercentile` are
// all exported from `@marketpulse/shared` and **every one of them is written
// out below** (Task 4.3.7's rule): the functions this file exists to judge are
// those functions, so importing one would be asserting that the application
// agrees with itself. If the product's tie-break or precision changes, these
// lines are supposed to need changing.
//
// ## What a green run here does not certify
//
// The established sentence first: this says everything about what the server
// sent and nothing about whether a bar ever arrives.
//
// Then this file's own. **No gated machine has ever seen a ranked row.** CI
// has 516 securities, zero bars, no provider and no baseline generation, so
// every gated run reaches the first arm and stops — the recompute arms are
// **skipped with their reason printed by name**, because comparing an empty
// order with an empty order would let the suite claim coverage it has not
// got. And **nothing here sees the cut**: whether some security outside the
// list outranks the weakest row inside it needs the population's own
// distributions, which no browser holds and no route serves. That bound is
// stated rather than papered over.

const OVERVIEW = "/";

/**
 * The ordinal's bounds, **written out rather than imported**.
 *
 * `0` through `99`, never `100`: above the highest order statistic there is no
 * sample, so a ceiling of 100 would assert a strict maximum over a
 * distribution that deliberately excludes the window being scored. A rank of
 * `106` — `rank + 7` at the top of the list — fails here, and that is the
 * plant this file was proved red on.
 */
const LOWEST = 0;
const HIGHEST = 99;

/**
 * **The order, re-expressed**: most unusual first, then ticker ascending.
 *
 * A **total** order, which is the difference from the movers' comparator and
 * the reason this is an equality rather than a monotonicity check: ties break
 * on the symbol, so a correct frame admits exactly **one** order and a swapped
 * pair is a defect rather than a tolerance.
 */
const inRankedOrder = (rows: readonly WireUnusualRow[]): string[] =>
  [...rows]
    .sort((a, b) =>
      a.rank === b.rank ? (a.symbol < b.symbol ? -1 : 1) : b.rank - a.rank,
    )
    .map((row) => row.symbol);

/** Open `/` through a pass-through socket and return the frames the gateway sent. */
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

/** The last frame that carried an unusual section, or `undefined`. */
const latestUnusual = (
  overviews: readonly WireMarketOverview[],
): WireUnusualActivity | undefined =>
  overviews.reduce<WireUnusualActivity | undefined>(
    (carried, overview) => overview.unusual ?? carried,
    undefined,
  );

/**
 * The recorded section, or a loud failure.
 *
 * A helper rather than a `!`, and the message matters: *the gateway sent no
 * unusual section* is a different finding from an assertion about an ordinal,
 * and it is the one a rollback produces.
 */
const mustHaveUnusual = (
  unusual: WireUnusualActivity | undefined,
): WireUnusualActivity => {
  if (unusual === undefined)
    throw new Error("no overview frame carried an unusual section");
  return unusual;
};

/** **Out of frame**: does this deployment have a market-data provider at all? */
async function hasAProvider(page: Page): Promise<boolean> {
  const response = await page.request.get(`${backendOrigin}/market-data`);
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { readonly feed: string | null };
  return body.feed !== null;
}

/** **Out of frame**: the active equities, as the database answers them. */
async function activeEquities(page: Page): Promise<readonly string[]> {
  const response = await page.request.get(`${backendOrigin}/securities`);
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as SecuritiesResponse;
  return body.securities
    .filter(
      (security) => security.status === "active" && security.kind === "equity",
    )
    .map((security) => security.symbol);
}

test.use({ viewport: { width: 1440, height: 900 } });

test("a deployment with no provider has observed nothing, so the OBSERVED basis ranks nothing — and a session row it drew would be stored or fabricated", async ({
  page,
}) => {
  const overviews = await openWithRecordedStream(page);
  await expect.poll(() => latestUnusual(overviews) !== undefined).toBe(true);

  const unusual = mustHaveUnusual(latestUnusual(overviews));

  if (await hasAProvider(page)) {
    test.skip(
      true,
      "this deployment has a provider, so an empty ranking is not implied",
    );
    return;
  }

  // **Amended 2026-10-16 (Task 5.4.5), and the amendment is the point rather
  // than a weakening.** Until the session arm existed, *no provider* implied
  // *no rows*, full stop. It no longer does: out of hours the region draws the
  // last completed session's closing ranking, **read from
  // `session_return_percentiles`**, which a deployment with no provider can
  // perfectly well hold — the nightly pass reads stored `sip` bars and talks
  // to no vendor.
  //
  // So the out-of-frame claim splits by basis, and neither half is weaker
  // than the original.
  if (unusual.basis === "observed") {
    // **Unchanged, and still the only assertion in this story that catches a
    // lying producer.** `MARKET_DATA_PROVIDER=none` constructs no stream, so
    // `trailing-window.ts` is empty for ever and `eligibleMoves` hears from
    // nobody. A row here is not a wrong figure — it is a figure about an
    // observation that cannot exist.
    expect(unusual.eligible).toBe(0);
    expect(unusual.scored).toBe(0);
    expect(unusual.rows).toEqual([]);

    // **And the region draws the honest-nothing state rather than a ranking
    // of nothing** — the browser's half of the same claim, which is what
    // makes this arm about the product rather than about a JSON body.
    await expect(
      page.getByRole("region", { name: "Unusual activity" }),
    ).toContainText(/Nothing ranked/u);
    return;
  }

  // **The session arm, grounded out of frame the same way.** A row here came
  // from the store or it was invented, and the two are separable without
  // trusting the producer:
  //
  //   - **every endpoint is `sip`.** The nightly pass reads `feed = 'sip'`
  //     rows by name, and the only other tape in this product arrives on a
  //     live socket a provider-less deployment does not have. An `iex`
  //     endpoint on this deployment is a figure about an observation that
  //     cannot exist — the original claim, one field over.
  //   - **every endpoint falls inside the session the section names.** A
  //     producer ranking its own in-memory bars would carry today's instants
  //     under a date from last week, which is the exact confusion the two
  //     bases exist to prevent.
  const session = unusual.session;
  expect(session).toMatch(/^\d{4}-\d{2}-\d{2}$/u);

  for (const row of unusual.rows) {
    expect(row.from.feed, `${row.symbol} from`).toBe("sip");
    expect(row.to.feed, `${row.symbol} to`).toBe("sip");

    // The market-local date of each instant, through **the one module
    // permitted to convert one** rather than by slicing an ISO string or
    // building a second formatter — a `no-restricted-syntax` rule refuses
    // both, and it caught this file's first draft doing the second.
    for (const at of [row.from.at, row.to.at]) {
      expect(marketDateAt(new Date(at)), `${row.symbol} ${at}`).toBe(session);
    }
  }

  // And the region drew them, rather than claiming the market is quiet.
  if (unusual.rows.length > 0) {
    await expect(
      page.getByRole("region", { name: "Unusual activity" }),
    ).toContainText("percentile");
  }
});

test("the three populations nest and the set is the one the universe says it is", async ({
  page,
}) => {
  const overviews = await openWithRecordedStream(page);
  await expect.poll(() => latestUnusual(overviews) !== undefined).toBe(true);

  const unusual = mustHaveUnusual(latestUnusual(overviews));

  // **`rows ≤ scored ≤ eligible ≤ tracked`.** The chain the region's cut
  // sentence rests on, and the only arithmetic behind `eligible − scored`,
  // which is the **sole** trace a refused security leaves. Every term is `0`
  // or `501` on CI, where it holds and is worth holding: a negative remainder
  // is a count of securities that cannot exist.
  expect(unusual.rows.length).toBeLessThanOrEqual(unusual.scored);
  expect(unusual.scored).toBeLessThanOrEqual(unusual.eligible);
  expect(unusual.eligible).toBeLessThanOrEqual(unusual.tracked);

  // **The population, against an independent source** — the one assertion
  // here that is non-vacuous on a store with no bars, and the one that
  // catches a section handed the join whole: `516` is the join's whole
  // answer, `501` is the set of active equities. A comparison rather than a
  // literal, because one delisting makes a typed `501` a lie with no symptom.
  expect(unusual.tracked).toBe((await activeEquities(page)).length);
});

test("every ordinal is inside the bound the figure can hold, and the list is in the one order its own rows admit", async ({
  page,
}) => {
  const overviews = await openWithRecordedStream(page);
  await expect.poll(() => latestUnusual(overviews) !== undefined).toBe(true);

  const unusual = mustHaveUnusual(latestUnusual(overviews));

  if (unusual.rows.length === 0) {
    test.skip(
      true,
      "this deployment ranked nothing, so there is no order to recompute " +
        "(CI: 516 securities, zero bars, no provider, no baseline generation)",
    );
    return;
  }

  for (const row of unusual.rows) {
    // **Integer, bounded, and `100` is not a value.** The precision is an
    // integer because the binomial standard error at the 99th of n = 4,620 is
    // 0.146 points; the ceiling is 99 because above the highest order
    // statistic there is no sample.
    expect(Number.isInteger(row.rank)).toBe(true);
    expect(row.rank).toBeGreaterThanOrEqual(LOWEST);
    expect(row.rank).toBeLessThanOrEqual(HIGHEST);

    // **The counted `n`, never a constant and never zero.** A rank taken
    // against nothing is an ordinal over an empty distribution.
    expect(row.sampleCount).toBeGreaterThan(0);

    // **Every factor behind the ordinal travels** (invariant 5): the move it
    // ranked, and the two instants it was measured between. An ordinal with
    // no instant is a claim about a move nobody can date.
    expect(Number.isFinite(row.percent)).toBe(true);
    expect(Number.isNaN(Date.parse(row.from.at))).toBe(false);
    expect(Number.isNaN(Date.parse(row.to.at))).toBe(false);
  }

  // **The order, recomputed from the rows' own factor values.** An equality
  // rather than a monotonicity check, because the comparator is total: ties
  // break on the ticker, so a correct frame admits exactly one order.
  expect(unusual.rows.map((row) => row.symbol)).toEqual(
    inRankedOrder(unusual.rows),
  );

  // **Distinct securities.** A symbol twice is the same list with a rank
  // position invented, and only a set comparison sees it.
  const symbols = unusual.rows.map((row) => row.symbol);
  expect(new Set(symbols).size).toBe(symbols.length);

  // **Every ranked row is in the population the region claims** — vacuous on
  // CI and not here: a row naming `SPY` or `XLK` would rank a fund beside its
  // own constituents, which is the one thing this region is forbidden to do.
  const population = new Set(await activeEquities(page));
  expect(symbols.filter((symbol) => !population.has(symbol))).toEqual([]);
});
