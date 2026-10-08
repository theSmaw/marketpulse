import { decodeMarketStreamMessage } from "@marketpulse/shared";
import type {
  SecuritiesResponse,
  WireMarketMovers,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { backendOrigin } from "../support/pair.js";

// **The two movers lists, over a frame this product's own server produced**
// (Task 4.5.8 — Story 4.5's done-when 1).
//
// ## A top-N is a SELECTION, not a reduction — which is why this file can say
// much more than its breadth sibling
//
// `overview-breadth-counts.spec.ts` opens by recording that breadth is the
// hard case: five integers reach the browser and **the frame carries no
// recoverable input at all**, so a furnished frame and a recorded one can both
// only be made to agree with themselves.
//
// A top-N is not that. **Every mover row carries its own ranking key**, so the
// claim splits four ways and three of the four are reachable:
//
//   - **(a)** the rows of each list are in that list's own order — *from the
//     frame*;
//   - **(b)** N distinct symbols, N rows, N ≤ the bound, and no symbol in both
//     lists — *from the frame*;
//   - **(c)** every row is in the population the region says it ranked over —
//     **`GET /securities`**, which is also what makes the first test
//     non-vacuous on a store with no bars;
//   - **(d) the cut** — that nothing outside a list outranks the smallest
//     thing inside it — which is the hard part, is the whole difference
//     between a ranking and ten plausible rows, and **is reachable in the
//     session basis**: `GET /securities` carries `close` and `previousClose`
//     for every security, so the third test recomputes all 503 moves, takes
//     its own top five each way, and compares membership, order, the cut and
//     the figures against the frame.
//
// ## What a green run here does not certify
//
// The established sentence first: this says **everything about what the
// browser does with an arrival and nothing about whether one arrives.**
//
// Then three that are this file's own.
//
// **No gated machine has ever seen a mover.** CI's store is 518 securities and
// **zero bars**, CI has no credential and no upstream socket, so every gated
// run reaches `eligible: 0` with **both lists empty, for ever** — a true
// answer rather than a degraded one, and the region's permanent state there.
// The first test is written to be non-vacuous in it (the section's own
// `tracked` against `GET /securities`, which is `503` against the `518` a
// section handed the join whole would report); the third **skips with its
// reason printed by name**, because a recount over zero closes compares `0`
// with `0` and would let the suite claim coverage it has not got.
//
// **The cut is checkable only where the input is recoverable.** The `observed`
// basis ranks live prices against stored closes, and the live half exists
// **only on the socket** — no HTTP route carries it. So the third test is the
// shut market's, which is roughly 80% of the week, and in a session the file
// falls back to what the frame alone can answer. The instrument that closes
// the other basis is a throwaway Node client rather than a spec, for the
// reason recorded in its own header: it subscribes to all 518, which changes
// what a page receives.
//
// **Every key is re-implemented rather than imported.** `moveRankingKey`,
// `displayedPercent`, `directionOf`, `changePercent` and `isRankedByMove` are
// all exported from `@marketpulse/shared` and every one of them is written out
// below — Task 4.3.7's rule, and it matters more here than anywhere else it
// has been applied: the functions this file exists to judge are those
// functions, so importing one would be asserting that the application agrees
// with itself. If the product's precision, direction rule or order changes,
// these lines are supposed to need changing.
//
// ## Why it is a PASS-THROUGH, and the hazard it is written against
//
// Story 4.3 paid to learn the general form: **four overview specs passed
// against a server with the ranking deleted**, each furnishing the order it
// then checked. Story 4.4 then found its own first-draft guards green on the
// exact defect they forbid twice more. `selectMovers` runs **server-side** —
// `topMovers` in `apps/backend/src/market-movers.ts` — and **nothing in the
// browser ranks**, so a spec that writes its own `movers` section writes the
// very thing under test. `openWithRecordedStream` is
// `overview-sector-ranking.spec.ts`', unchanged, and there is no stub at all.
//
// One consequence worth stating, because it is the reason the frame-side
// assertions are not redundant with the browser's own reader: `readMovers`
// **refuses** a section that is unranked, keyless, over-long or not disjoint,
// and the region then draws its reserved state. So a producer defect of that
// shape is not drawn wrongly — it is **not drawn at all**, which on screen is
// indistinguishable from a frame that never arrived. Reading the recorded
// frame is what tells those two apart.
//
// ## It stays out of the characterised flakes' class
//
// All of them are *a byte-identical text assertion over a page that is still
// settling*. So: nothing is captured until a **positive** state has been
// reached (a recorded overview frame carrying a movers section, and the
// region's two headings drawn); the screen is read **scoped to each `<ol>`**
// through one `evaluate`, never as whole-`main` text; agreement is converged
// on with `expect.poll`, because a second overview frame landing between the
// frame read and the DOM read is the product working; and **no duration and no
// threshold is asserted anywhere in this file.**

const OVERVIEW = "/";

/**
 * The bound each list is taken to, **written out rather than imported**.
 *
 * `MOVERS_PER_SIDE` is the module under test's own — the producer slices to it
 * and the drawing pads to it — so importing it would make this spec agree with
 * both by construction. It is a **height** (`sector-ranking.ts` carries the
 * 466-against-486 arithmetic), so if it changes, this number is supposed to
 * need changing and a reader is supposed to go and read that arithmetic.
 */
const PER_SIDE = 5;

/** The decimals the product decides an order and a direction at. */
const DISPLAYED_DECIMALS = 2;

/** A percentage as the screen shows it — the precision ties are decided on. */
const displayed = (percent: number): number =>
  Number(percent.toFixed(DISPLAYED_DECIMALS));

/**
 * A figure's ranking key, **read off the wire's own two fields** and not
 * through `moveRankingKey`.
 *
 * `overview-sector-ranking.spec.ts`' helper and its argument, which holds
 * identically here: the two names are deliberately different because the bases
 * are — an `observed` figure's move is live-against-a-close and a `stored`
 * figure's is the close-to-close move of a session that is over — and a figure
 * with **neither** has no key, which is the state AC 5 and the whole absent-key
 * rule are about. A figure with no key may not appear in either list at all,
 * which is asserted below rather than defaulted around.
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
 * A list's keys **as the screen shows them**, or a loud failure.
 *
 * A helper rather than a `?? 0` at the call site, and the reason is this file's
 * own subject: `?? 0` over an absent key is the defect under test, so writing
 * one in the spec that judges it would be the second home for the very default
 * the product refuses. A figure with no key may not be in a list at all —
 * asserted separately — so reaching this throw is a producer defect and the
 * message says which row.
 */
const shownKeys = (figures: readonly WireOverviewFigure[]): number[] =>
  figures.map((figure) => {
    const key = keyOf(figure);
    if (key === undefined)
      throw new Error(`${figure.symbol} is in a mover list with no move`);
    return displayed(key);
  });

/**
 * Open the landing page through a **pass-through** market-stream route, and
 * return the overview frames the real gateway sent.
 *
 * `overview-sector-ranking.spec.ts`' helper, whose docblock argues every line:
 * `server.onMessage` turns off automatic forwarding so the forward is explicit
 * and verbatim, the shipped decoder reads the frame so a protocol change breaks
 * this at the compiler, the route is installed **before** `goto` because a
 * connection already made cannot be intercepted, and it is **awaited**, because
 * an unawaited `routeWebSocket` leaves the page talking to the gateway directly
 * — identical on screen, and an empty list here.
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

/** The last overview frame that carried a movers section, or `undefined`. */
const latestMovers = (
  overviews: readonly WireMarketOverview[],
): WireMarketMovers | undefined =>
  overviews.reduce<WireMarketMovers | undefined>(
    (carried, overview) => overview.movers ?? carried,
    undefined,
  );

/**
 * The recorded section, or a loud failure.
 *
 * A helper rather than a `!`, which the lint rules forbid product-wide — and
 * the message matters: *the gateway sent no movers section* is a different
 * finding from an assertion about an order, and it is the one a rollback
 * produces.
 */
const mustHaveMovers = (
  movers: WireMarketMovers | undefined,
): WireMarketMovers => {
  if (movers === undefined)
    throw new Error("no overview frame carried a movers section");
  return movers;
};

const moversRegion = (page: Page): Locator =>
  page.getByRole("region", { name: "Movers" });

/**
 * The two drawn lists, **in document order, scoped to each `<ol>`**.
 *
 * Read in one `evaluate` rather than through two locators, because the thing
 * being asserted is a relation *between* the lists and a page that re-ordered
 * between two round trips would read as a defect. The held pads are excluded by
 * their own `aria-hidden`, which is the attribute the component puts on them —
 * so this reads *the rows that name a security* without knowing which class
 * carries the padding.
 *
 * The symbol is taken from `._symbol_`, not from *the thing on the row that
 * looks like a ticker*: a row holds an ordinal, a company name, a ticker, a
 * price and a figure, and a pattern loose enough for a neighbour to satisfy is
 * this suite's own recorded hazard.
 */
interface DrawnLists {
  readonly gainers: readonly string[];
  readonly losers: readonly string[];
}

const drawnLists = (region: Locator): Promise<DrawnLists> =>
  region.evaluate((root) => {
    const read = (list: Element | undefined): string[] => {
      if (list === undefined) return [];
      const out: string[] = [];
      for (const row of list.querySelectorAll(":scope > li")) {
        if (row.getAttribute("aria-hidden") === "true") continue;
        const symbol = row.querySelector('[class*="_symbol_"]');
        out.push(symbol?.textContent.trim() ?? "?");
      }
      return out;
    };

    const lists = root.querySelectorAll("ol");
    return { gainers: read(lists[0]), losers: read(lists[1]) };
  });

/** `GET /securities`, from the backend the running pair resolved. */
async function securities(page: Page): Promise<SecuritiesResponse> {
  const response = await page.request.get(`${backendOrigin}/securities`);
  expect(response.ok()).toBe(true);
  return (await response.json()) as SecuritiesResponse;
}

/**
 * The set the movers are selected from, **as the database answers it**.
 *
 * `active` and `kind === "equity"` — `equityTickers()`' predicate spelled from
 * the other side of the wire, which is `overview-breadth-counts.spec.ts`'
 * helper and its argument: that function derives the set from the typechecked
 * `UNIVERSE` in the backend's own process, and this derives it from the rows
 * `pnpm universe` converged into PostgreSQL. **Two sources, one claim.**
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

test("each list is bounded, keyed, internally ordered and disjoint from the other — and the population is the set the universe says it is", async ({
  page,
}) => {
  const overviews = await openWithRecordedStream(page);

  // **The positive state, waited for before anything is captured.** A recorded
  // overview frame carrying a movers section says the server has answered; the
  // two drawn headings say the browser has drawn its answer rather than its
  // reservation. Neither implies the other, and reading either early is the
  // shape every characterised flake in this suite has.
  await expect.poll(() => latestMovers(overviews) !== undefined).toBe(true);
  await expect(
    moversRegion(page).getByRole("heading", { level: 3 }),
  ).toHaveCount(2);

  const movers = mustHaveMovers(latestMovers(overviews));

  // **(b) The bound, read off neither list's length.** A selection of six is
  // not a longer answer, it is a region 520 px tall in a 486 px box — the
  // arithmetic is in `MOVERS_PER_SIDE`'s own docblock.
  expect(movers.gainers.length).toBeLessThanOrEqual(PER_SIDE);
  expect(movers.losers.length).toBeLessThanOrEqual(PER_SIDE);

  // **A selection cannot exceed the set it was taken from**, and the set cannot
  // exceed the population. Both hold on CI, where every term is `0` or `503`.
  expect(movers.gainers.length + movers.losers.length).toBeLessThanOrEqual(
    movers.eligible,
  );
  expect(movers.eligible).toBeLessThanOrEqual(movers.tracked);

  // **(c) The population, against an independent source.** This is the
  // assertion that is non-vacuous on a store with no bars, and the one that
  // catches a section handed the join whole: `518` is the join's whole answer,
  // `503` is the set of active equities, and the region's own sentence claims
  // the second. Written as a comparison rather than as a literal because one
  // delisting makes a typed `503` a lie with no symptom.
  const body = await securities(page);
  const population = activeEquities(body);
  expect(movers.tracked).toBe(population.length);

  // **Every drawn row is IN that population.** Vacuous on CI and not here: a
  // mover row naming `SPY` or `XLK` would be a ranking over the funds beside
  // their own constituents, which is the one thing both this region and
  // `Market breadth` are forbidden to count.
  const eligibleSet = new Set(population);
  const named = [...movers.gainers, ...movers.losers].map(
    (figure) => figure.symbol,
  );
  expect(named.filter((symbol) => !eligibleSet.has(symbol))).toEqual([]);

  // **(b) N distinct symbols, N rows, and no symbol in both lists.** Three
  // separate failures that fail differently — a symbol invented, a symbol
  // lost, a symbol drawn twice — and a `Set` comparison alone cannot see the
  // third, which is exactly what an off-by-one in a bounded insert that
  // rebuilds its array produces. The disjointness is a **precondition of the
  // hold**: the route pins one order across both lists, so a shared symbol
  // collides in that `Map` and last-write-wins silently reorders a row.
  expect(new Set(named).size).toBe(named.length);

  // **Every row carries a ranking key.** A keyless row is a figure placed by a
  // `?? 0` — ADR 0029's false impression expressed as a **rank position** — and
  // it is the defect AC 5 exists against, where `ranked.slice(0, 5)` returns
  // five arbitrary names we have heard nothing about presented as the day's
  // biggest movers.
  expect(
    [...movers.gainers, ...movers.losers]
      .filter((figure) => keyOf(figure) === undefined)
      .map((figure) => figure.symbol),
  ).toEqual([]);

  // **(a) Each list is in its own order, at the precision the screen prints.**
  // The comparator answers `0` for a display-equal pair deliberately, so these
  // are non-increasing and non-decreasing rather than strict — a pair that
  // reads the same on screen is allowed to sit either way round, and is
  // required not to swap from frame to frame, which is
  // `sector-ranking.test.ts`' claim and not a browser's.
  const shownGainers = shownKeys(movers.gainers);
  const shownLosers = shownKeys(movers.losers);
  expect(shownGainers).toEqual([...shownGainers].sort((a, b) => b - a));
  expect(shownLosers).toEqual([...shownLosers].sort((a, b) => a - b));

  // **The two lists interleave in exactly one way, and this is NOT a sign
  // assertion.** A top-N taken from the wrong end is the defect, and in a
  // one-sided market the bottom of the gainers and the top of the losers can
  // both carry the same sign under a `sorted.slice(0, 5)` / `sorted.slice(-5)`
  // implementation — so a sign test is green on it exactly when the market is
  // one-sided. What cannot be true of a correct pair of lists is that anything
  // in `LOSERS` outranks anything in `GAINERS`: the weakest gainer is strictly
  // stronger than the strongest loser, which fails under a transposition and
  // under a reversal, and holds in every one-sided state.
  if (shownGainers.length > 0 && shownLosers.length > 0) {
    expect(Math.min(...shownGainers)).toBeGreaterThan(Math.max(...shownLosers));
  }

  // **And each list holds only rows whose direction matches its heading** —
  // the owner's Gate 1 rule, which is a separate claim from the interleave
  // above and is deliberately stated separately: this one is about the words
  // over the list, that one is about the order between them. Decided on the
  // **displayed** figure, because that is the figure the heading is read
  // beside.
  expect(shownGainers.filter((key) => key <= 0)).toEqual([]);
  expect(shownLosers.filter((key) => key >= 0)).toEqual([]);

  // **And the screen is those two lists, under those two headings.**
  // `expect.poll` rather than a single read, because on a machine with a
  // provider a second overview frame lands every minute and one arriving
  // between the frame read and the DOM read is the product working. The
  // comparison is of **both lists at once**, which is what makes it see a
  // transposition: two correct lists drawn under each other's heading satisfy
  // every assertion above and every unit test in the region.
  await expect
    .poll(async () => JSON.stringify(await drawnLists(moversRegion(page))))
    .toBe(
      JSON.stringify({
        gainers: mustHaveMovers(latestMovers(overviews)).gainers.map(
          (figure) => figure.symbol,
        ),
        losers: mustHaveMovers(latestMovers(overviews)).losers.map(
          (figure) => figure.symbol,
        ),
      }),
    );

  await expectNothingFailedToRender(page);
});

test("the cut: the two lists recomputed from the store's own closes, membership, order and figures", async ({
  page,
}) => {
  const overviews = await openWithRecordedStream(page);

  await expect.poll(() => latestMovers(overviews) !== undefined).toBe(true);

  const movers = mustHaveMovers(latestMovers(overviews));

  // **The one basis a second source can answer**, and the reason is a property
  // of the product rather than of this route: an `observed` ranking is over
  // live prices against stored closes, and the live half exists **only on the
  // socket**. A session ranking is over `previousClose` → `close`, which
  // `GET /securities` carries for every security it lists. So this is the shut
  // market's test — roughly 80% of the week — and the instrument that closes
  // the other basis is the throwaway Node client, which cannot live here
  // because subscribing to 518 symbols changes what the page receives.
  test.skip(
    movers.basis !== "session",
    `the server sent the ${movers.basis} basis — a live ranking is over prices this route does not carry`,
  );
  if (movers.basis !== "session") return;

  const body = await securities(page);
  const equities = new Set(activeEquities(body));

  // **Filtered to the session the frame names**, which is `overview-breadth-
  // counts.spec.ts`' guard and the one this comparison needs: the producer
  // reads a closes cache with its own window while this route reads the table,
  // so a store mid-backfill can legitimately hold a newer session than the
  // frame was computed from. Comparing only the session the frame names makes
  // the two sides answer one question instead of two.
  const sameSession = body.lastCloses.filter(
    (close) => equities.has(close.symbol) && close.session === movers.session,
  );

  // **A skip rather than a vacuous pass.** With no close for the session the
  // frame names there is nothing to rank and nothing to recount, which is CI's
  // store honestly (518 securities, zero bars, `session` naming *today*) and is
  // also what a producer handed an empty set would report. A skip says *this
  // instrument could not judge*; a green would let the suite claim a cut it
  // never checked. `tracked` is cross-checked in the first test either way.
  test.skip(
    sameSession.length === 0,
    `the store holds no closes for ${movers.session}, the session the frame names — there is nothing to recount`,
  );

  // `changePercent` and `directionOf`, **re-implemented rather than imported**.
  // Importing them would assert that the application agrees with itself, which
  // is the whole thing this test exists to avoid: both the direction rule and
  // the order are decided on the **displayed** figure, and a rounding
  // introduced at a second site lives exactly there.
  const moves: { symbol: string; key: number }[] = [];
  for (const close of sameSession) {
    const previous = close.previousClose;
    if (previous === null || previous === 0) continue;
    const percent = ((close.close - previous) / previous) * 100;
    if (!Number.isFinite(percent)) continue;
    moves.push({ symbol: close.symbol, key: percent });
  }

  // **The denominator the lists were selected from**, recomputed. It is the
  // length of the measurable set, which is the figure the region's footer
  // states and the one a top five over 446 of 503 would otherwise hide.
  expect(movers.eligible).toBe(moves.length);

  // **This spec's own top five each way — a FULL SORT, deliberately.** The
  // producer's `selectMovers` is a bounded insert, chosen against a measured
  // cost, and reproducing that algorithm here would make this test agree with
  // it by construction. A sort is a different route to the same answer, which
  // is the only kind of second opinion worth having.
  //
  // The tie-break is explicit rather than left to stability: two securities
  // that read the same on screen may sit either way round in the frame, so a
  // comparison of symbol lists would be red on a coincidence. Both sides below
  // are therefore compared **as the drawn figures in order**, and membership is
  // compared as a set only where the cut is unambiguous.
  const ranked = [...moves].sort(
    (a, b) =>
      displayed(b.key) - displayed(a.key) || a.symbol.localeCompare(b.symbol),
  );
  const expectedGainers = ranked
    .filter((move) => displayed(move.key) > 0)
    .slice(0, PER_SIDE);
  const expectedLosers = [...ranked]
    .reverse()
    .filter((move) => displayed(move.key) < 0)
    .slice(0, PER_SIDE);

  // **The figures, in order, as the screen decides them** — which is the
  // comparison that sees every one of this task's named defects at once: an
  // inverted comparator, a top-N from the wrong end, an off-by-one in the cut,
  // a stale close re-ordering the list, and a figure landing on the wrong row.
  const drawnGainers = shownKeys(movers.gainers);
  const drawnLosers = shownKeys(movers.losers);

  expect(drawnGainers).toEqual(
    expectedGainers.map((move) => displayed(move.key)),
  );
  expect(drawnLosers).toEqual(
    expectedLosers.map((move) => displayed(move.key)),
  );

  // **THE CUT, stated as the thing it is: nothing outside outranks the
  // smallest inside.** The figures above already pin it, and it is asserted
  // separately because this is the sentence a reader of the record needs — and
  // because it fails with a readable message. Every security in the population
  // that is not in `GAINERS` must be display-weaker than the weakest gainer,
  // unless the list is short, in which case there is nothing outside it that
  // could have been in it.
  const asShown = new Map(
    moves.map((move) => [move.symbol, displayed(move.key)] as const),
  );

  const outranking = (
    list: readonly WireOverviewFigure[],
    keys: readonly number[],
    stronger: (outside: number, weakest: number) => boolean,
  ): readonly string[] => {
    const weakest = keys[keys.length - 1];
    if (list.length < PER_SIDE || weakest === undefined) return [];
    const inside = new Set(list.map((figure) => figure.symbol));
    return [...asShown.entries()]
      .filter(([symbol, key]) => !inside.has(symbol) && stronger(key, weakest))
      .map(([symbol]) => symbol);
  };

  expect(
    outranking(movers.gainers, drawnGainers, (out, weakest) => out > weakest),
  ).toEqual([]);
  expect(
    outranking(movers.losers, drawnLosers, (out, weakest) => out < weakest),
  ).toEqual([]);

  // **And the symbols are the ones the recount named**, as sets, which is what
  // catches a figure landing on the wrong row: ten correct figures over ten
  // wrong tickers satisfies every ordering assertion in this file and is the
  // defect `SECTOR_BY_ETF`'s docblock records one region up. Compared as sets
  // because a display-equal tie at the cut is allowed to resolve either way,
  // and it is compared **only where the cut is unambiguous** — where the
  // weakest figure in the list is not shared with a security outside it.
  const unambiguous = (
    keys: readonly number[],
    expected: readonly { symbol: string; key: number }[],
  ): boolean => {
    const weakest = keys[keys.length - 1];
    if (weakest === undefined) return true;
    const atTheCut = [...asShown.values()].filter(
      (key) => key === weakest,
    ).length;
    return atTheCut === 1 && expected.length === keys.length;
  };

  if (unambiguous(drawnGainers, expectedGainers)) {
    expect([...movers.gainers.map((figure) => figure.symbol)].sort()).toEqual(
      expectedGainers.map((move) => move.symbol).sort(),
    );
  }

  if (unambiguous(drawnLosers, expectedLosers)) {
    expect([...movers.losers.map((figure) => figure.symbol)].sort()).toEqual(
      expectedLosers.map((move) => move.symbol).sort(),
    );
  }

  await expectNothingFailedToRender(page);
});
