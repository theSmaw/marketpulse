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
// worth being precise about why. **The composite score is the only figure on
// this screen that a reader cannot check against anything on the page.** A
// price has a chart beside it; a sector move has ten siblings; this score's
// inputs are **two** 60-session distributions of tables the browser never
// reads. So a wrong score is a confident, well-formed row at the top of a
// region about unusual behaviour, and nothing on screen contradicts it.
//
// **And it got worse at Task 5.6.7, not better.** The figure was a price
// percentile — one factor, one distribution — and it is now a weighted sum of
// two, with a band word over it whose thresholds are a third thing nothing on
// screen can check. The row also carries **less**: the ordinal, its counted
// `n`, `aboveSample` and both endpoints left the wire, so the invariant-5
// arms below that re-derived the figure from its own inputs have nothing to
// re-derive from. What replaced them is the **cohort** — the scale the rows
// were ranked on, which is the one thing that makes a raw score comparison
// honest — and the arms are rewritten accordingly rather than deleted.
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
// `compareByScore`, `isRankedByScore` and `selectByScore` are all exported
// from `@marketpulse/shared` and **every one of them is written out below**
// (Task 4.3.7's rule): the functions this file exists to judge are those
// functions, so importing one would be asserting that the application agrees
// with itself. If the product's tie-break or precision changes, these lines
// are supposed to need changing.
//
// **Rewritten by hand at Task 5.6.7 rather than re-pointed.** The quantity
// changed, so the comparator did: `b.rank - a.rank` became `b.score -
// a.score`, which is a different expression over a different field with the
// same tie-break. Had this file imported the comparator, the rename would
// have been invisible here and the recompute would have gone on agreeing with
// the renderer by construction — which is the whole thing it exists not to do.
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
 * The score's bounds, **written out rather than imported**.
 *
 * `0` through `100`, and `100` **is** a value — which is the difference from
 * the ordinal this replaced, where the ceiling was 99 because above the
 * highest order statistic there is no sample. A composite is a weighted sum
 * whose every factor can reach its own weight, so the structural ceiling is
 * the sum of the weights.
 *
 * The **drawn** ceiling in this tree is 75, because the volume factor is
 * `no-distribution` for every security — and that figure is deliberately NOT
 * asserted here: a bound written from today's factor coverage would go red on
 * the first night a volume distribution is stored, which is a change this
 * check has no business failing.
 */
const LOWEST = 0;
const HIGHEST = 100;

/** The four band words, written out rather than imported for the same reason. */
const BANDS = ["normal", "elevated", "high", "extreme"];

/**
 * **The order, re-expressed**: highest score first, then ticker ascending.
 *
 * A **total** order, which is the difference from the movers' comparator and
 * the reason this is an equality rather than a monotonicity check: ties break
 * on the symbol, so a correct frame admits exactly **one** order and a swapped
 * pair is a defect rather than a tolerance.
 *
 * **An integer score makes ties routine rather than rare.** The shipped
 * two-factor scale holds 76 values for ~484 scored securities, so by the
 * pigeonhole principle some score is shared on every frame — which is why the
 * tie-break is the half of this expression that matters.
 */
const inRankedOrder = (rows: readonly WireUnusualRow[]): string[] =>
  [...rows]
    .sort((a, b) =>
      a.score === b.score ? (a.symbol < b.symbol ? -1 : 1) : b.score - a.score,
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
  //   - **the section names a session, and it is a real date.** A producer
  //     ranking its own in-memory bars has no session to name, which is the
  //     exact confusion the two bases exist to prevent.
  //   - **the baseline's tape is `sip`.** The nightly pass reads `feed =
  //     'sip'` rows by name, and the only other tape in this product arrives
  //     on a live socket a provider-less deployment does not have.
  //   - **the generation this ranking was taken against is keyed by the same
  //     session.** ADR 0044's rule, and a stored row is the only thing that
  //     can satisfy it: the pass ranks each closing move against the
  //     generation whose window ends at the session being scored.
  //
  // **AMENDED 2026-10-28 (Task 5.6.7), and the amendment is a LOSS this file
  // has to be honest about.** The per-endpoint `sip` check above was the
  // strongest arm here and it is **gone**, because the endpoints left the
  // wire with the ordinal: the row is a score, a band and a move. So the
  // tape claim moves from ten rows' endpoints to the section's one baseline,
  // which is a weaker statement about the same fact — one field instead of
  // twenty — and the per-row *is this instant inside the session* arm has no
  // instant left to read. Stated rather than quietly dropped, because the
  // next reader is owed the shape of what this spec can still see.
  const session = unusual.session;
  expect(session).toMatch(/^\d{4}-\d{2}-\d{2}$/u);

  expect(unusual.baseline.feed).toBe("sip");

  // The generation's own session, read through **the one module permitted to
  // convert an instant to a market-local date** — a `no-restricted-syntax`
  // rule refuses a second formatter and it caught this file's first draft
  // building one. Here the figure is already a date, so the conversion is the
  // comparison's own anchor rather than a parse.
  if (unusual.baseline.generation !== undefined) {
    expect(unusual.baseline.generation.session).toBe(session);
    expect(marketDateAt(new Date(`${session}T20:00:00.000Z`))).toBeDefined();
  }

  // And the region drew them, rather than claiming the market is quiet.
  if (unusual.rows.length > 0) {
    await expect(
      page.getByRole("region", { name: "Unusual activity" }),
    ).toContainText(/composite anomaly score/iu);
  }
});

test("the three populations nest and the set is the one the universe says it is", async ({
  page,
}) => {
  const overviews = await openWithRecordedStream(page);
  await expect.poll(() => latestUnusual(overviews) !== undefined).toBe(true);

  const unusual = mustHaveUnusual(latestUnusual(overviews));

  // **`rows ≤ cohort.scored ≤ scored ≤ eligible ≤ tracked`.** The chain the
  // region's cut sentence rests on, and the only arithmetic behind
  // `eligible − scored`, which is the **sole** trace a security with no factor
  // at all leaves. Every term is `0` or `501` on CI, where it holds and is
  // worth holding: a negative remainder is a count of securities that cannot
  // exist.
  //
  // **It gained a link at Task 5.6.7**, because the rows are a selection from
  // the **cohort** rather than from `scored`: `scored` counts every security
  // that got a composite at all, and a 1-of-3 score is honestly scored and
  // deliberately not ranked against a 2-of-3 one (AC 3). The weaker chain
  // would be green on a producer ranking across cohorts.
  if (unusual.cohort !== undefined) {
    expect(unusual.rows.length).toBeLessThanOrEqual(unusual.cohort.scored);
    expect(unusual.cohort.scored).toBeLessThanOrEqual(unusual.scored);
    expect(unusual.cohort.scored + unusual.cohort.others).toBeLessThanOrEqual(
      unusual.scored,
    );
  } else {
    expect(unusual.rows.length).toBeLessThanOrEqual(unusual.scored);
  }
  expect(unusual.scored).toBeLessThanOrEqual(unusual.eligible);
  expect(unusual.eligible).toBeLessThanOrEqual(unusual.tracked);

  // **A section with rows and no cohort is a producer that ranked without
  // declaring a scale**, which is the one shape AC 3 cannot tolerate: a raw
  // score comparison is honest only over one factor set, so a list with no
  // named set is a list nobody can say is comparable.
  if (unusual.rows.length > 0) {
    expect(unusual.cohort).toBeDefined();
  }

  // **The population, against an independent source** — the one assertion
  // here that is non-vacuous on a store with no bars, and the one that
  // catches a section handed the join whole: `516` is the join's whole
  // answer, `501` is the set of active equities. A comparison rather than a
  // literal, because one delisting makes a typed `501` a lie with no symptom.
  expect(unusual.tracked).toBe((await activeEquities(page)).length);
});

test("every score is inside the bound the figure can hold, and the list is in the one order its own rows admit", async ({
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
    // **Integer and bounded.** `scoreAnomaly` sums rounded per-factor
    // contributions, so a fractional score is a figure no scorer in this
    // product produces — and an addition a reader performs on the screen
    // would fail on it.
    expect(Number.isInteger(row.score)).toBe(true);
    expect(row.score).toBeGreaterThanOrEqual(LOWEST);
    expect(row.score).toBeLessThanOrEqual(HIGHEST);

    // **The band is one of four**, and `BANDS` is written out above rather
    // than imported. A fifth word is a region heading that names a band this
    // product has no floor for — the head slot writes whatever the frame
    // sends, which is deliberate (it is the producer's word) and is why the
    // vocabulary is checked here rather than trusted.
    expect(BANDS).toContain(row.band);

    // **Every score is inside its own cohort's ceiling.** This is the arm that
    // replaces the per-row invariant-5 checks the endpoints used to carry, and
    // it is the strongest thing left that is recomputable from the frame: a
    // 2-of-3 score of 84 is not a wrong number, it is a number from a factor
    // set the section did not declare.
    if (unusual.cohort !== undefined) {
      expect(
        row.score,
        `${row.symbol} against the cohort's ceiling`,
      ).toBeLessThanOrEqual(unusual.cohort.max);
    }

    // **The move, where the frame carries one** — optional on purpose: the
    // session arm reads it from beside the score, and a security scored on its
    // excess factor alone has no percentile row. `0` is not substituted for
    // it, because a direction of *unchanged* is the claim *this security did
    // not move*.
    if (row.percent !== undefined) {
      expect(Number.isFinite(row.percent)).toBe(true);
    }
  }

  // **The order, recomputed from the rows' own scores.** An equality rather
  // than a monotonicity check, because the comparator is total: ties break on
  // the ticker, so a correct frame admits exactly one order.
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
