import { mkdir, writeFile } from "node:fs/promises";

import { REQUEST_ID_HEADER, apiError } from "@marketpulse/shared";
import type {
  MarketFeed,
  RelationshipsResponse,
  WireAnomalyBands,
  WireMarketBreadth,
  WireMarketMovers,
  WireMarketOverview,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { serveFeed } from "../support/feed.js";
import {
  RELATIONSHIPS_ROUTE_PATTERN,
  SECURITIES_ROUTE_PATTERN,
  backendOrigin,
} from "../support/pair.js";

// **The market topology's own degraded set, produced and compared** (Task
// 6.8.3, Story 6.8's acceptance criteria 4, 5, 6 and 7).
//
// ## Why this is a sibling file rather than four more rows of the landing grid
//
// `overview-degraded-grid.spec.ts` compares **seventeen** states × four widths
// × nine surfaces and keys on an aggregate; this region keys on something else
// entirely. The topology is a function of **two requests and one aggregate
// section** — `GET /securities`, `GET /market-data/relationships` and
// `overview.anomalyBands` — which is why that grid already carries four rows
// (18–21) on a second axis and a separate assertion saying the region is
// constant across the first one. A third axis in that file would multiply a
// key nine surfaces wide by states that change exactly one of them, against a
// spec whose own documented flakiness-under-load history is at seven sessions.
//
// So this reuses that file's **machinery** and not its file: every row is
// produced through the shipped socket, the shipped decoder and the real
// backend's own `GET /securities`; every row carries a **plant per channel**,
// because a production whose producer went quiet reads exactly like a state
// drawn correctly; and the collapse is asserted as **declared collision
// classes in both directions**, so an accidental collapse goes red *and* a
// documented exception that has stopped holding goes red too.
//
// ## What is produced here and what is furnished
//
// **Produced** is the transition: the socket, the connect sequence, the shipped
// encoder and decoder, the real universe request, the real relationships route
// where a row does not replace it, the renderer, the page's own retry.
// **Furnished** is the content of a frame or of a route's body. Two rows below
// furnish a body the decoder is meant to refuse, which is produced in the
// strong sense — the refusal is the shipped one.
//
// ## One surface, and the two the real differentiators live on
//
// The key is **this region's own text**, because that is the whole of what this
// region says. Three of the states below are *one picture and one sentence*
// inside it (`AC 6`'s named, accepted exception, declared below), and the facts
// that tell them apart — the connection word and the provider line — live in
// the status bar and the source note, each with exactly one home that
// `pnpm invariants` refuses a second of by name. Those two surfaces are
// `overview-degraded-grid.spec.ts`' and are deliberately **not** re-keyed here:
// this file's claim is about what the topology says, including where it
// correctly says the same thing about three different stores.

const OVERVIEW = "/";

const VENUE: MarketFeed = "iex";

const AT = "2026-09-16T18:01:00Z";

const WIDTHS = [1440, 1024, 768, 390] as const;

/**
 * Whether to photograph as well as read.
 *
 * `overview-degraded-grid.spec.ts`' own arrangement and its reason: the strings
 * are the record and can be asserted, the pictures are the illustration and
 * cannot. `9 × 4 × 2 = 72`.
 *
 * ```
 * TOPOLOGY_DEGRADED_PHOTOS=1 pnpm e2e overview-market-topology-degraded.spec.ts
 * ```
 */
const PHOTOGRAPH = process.env.TOPOLOGY_DEGRADED_PHOTOS === "1";

const CAPTURE = ".capture/overview-market-topology-degraded";

// ---------------------------------------------------------------------------
// The frames
// ---------------------------------------------------------------------------

const BREADTH: WireMarketBreadth = {
  basis: "observed",
  advancing: 284,
  declining: 152,
  unchanged: 30,
  measured: 466,
  tracked: 501,
  windowMinutes: 5,
};

/** Breadth over an empty eligibility window: `measured: 0`, and it sums. */
const BREADTH_OF_NOTHING: WireMarketBreadth = {
  basis: "observed",
  advancing: 0,
  declining: 0,
  unchanged: 0,
  measured: 0,
  tracked: 501,
  windowMinutes: 5,
};

const NO_MOVERS: WireMarketMovers = {
  basis: "observed",
  gainers: [],
  losers: [],
  eligible: 0,
  tracked: 501,
  windowMinutes: 5,
};

/**
 * **Five securities scored, every other equity drawn `normal`** — the one piece
 * of data on this screen no gated run can otherwise reach, because CI's store
 * has zero bars, no provider and no composite generation.
 *
 * `overview-market-topology-anomaly-bands.spec.ts`' `BANDS_A`, deliberately a
 * local copy rather than an import: that spec owns the band update channel and
 * this one owns the degraded set, and a shared fixture would make one spec's
 * rows depend on the other's idea of what a band section is.
 */
const BANDS: WireAnomalyBands = {
  normal: ["AAPL"],
  elevated: ["NVDA"],
  high: ["MSFT", "AMZN"],
  extreme: ["TSLA"],
  // **`scored` must equal the five symbols listed**, which `readAnomalyBands`
  // checks — a section whose cohort disagrees with its own lists is refused
  // whole, and a refused section is the same absence as a missing one. So a
  // mistyped count here would silently produce row 03's picture under row 01's
  // name, which is this harness's standing hazard.
  cohort: { factors: ["price", "excess"], max: 75, scored: 5, others: 0 },
};

/** A healthy mid-session aggregate, carrying a real band section. */
const SCORED: WireMarketOverview = {
  computedAt: AT,
  observedAt: AT,
  feeds: [VENUE],
  figures: [],
  breadth: BREADTH,
  movers: NO_MOVERS,
  anomalyBands: BANDS,
};

/**
 * **The same aggregate with the band section withdrawn** — a rollback, a pinned
 * previous image, or two nightly tables a session apart.
 *
 * `anomalyBands` is **optional** on the wire (unlike `breadth` and `movers`), so
 * this is a frame a shipped producer really can build, which is why it is
 * `produced` rather than the `rollback` kind that file uses for a section no
 * producer can omit.
 */
const SCORE_SECTION_WITHDRAWN: WireMarketOverview = {
  computedAt: AT,
  observedAt: AT,
  feeds: [VENUE],
  figures: [],
  breadth: BREADTH,
  movers: NO_MOVERS,
};

/**
 * **Every section present, every section empty** — CI's permanent shape, and a
 * replica's for the 45.8–46.5 s before its own feed authenticates.
 *
 * No `observedAt`: an aggregate that has observed nothing holds no instant, and
 * `exactOptionalPropertyTypes` makes absent and `undefined` different types.
 */
const EMPTY_JOIN: WireMarketOverview = {
  computedAt: AT,
  feeds: [],
  figures: [],
  breadth: BREADTH_OF_NOTHING,
  movers: NO_MOVERS,
};

/** What a store with no bars answers at the relationships route, for ever. */
const NO_PASS = JSON.stringify({ correlations: [] });

/**
 * **A relationships body the shipped decoder refuses** — a coefficient outside
 * `[-1, 1]`.
 *
 * `relationships-response.ts`' predicate refuses the whole body rather than
 * letting an invented figure reach a drawn edge, and `toRelationshipsView` maps
 * `unreadable-body` onto `failed` — so this row and the aborted one are **one
 * state**, which is declared as a collision class below rather than left to
 * collapse quietly. It is the row that proves the refusal actually happens: a
 * decoder that admitted this would draw an edge at `r = 4.2` and read
 * `measured` here.
 */
const REFUSED_PASS = JSON.stringify({
  correlations: [{ low: "AAPL", high: "MSFT", r: 4.2, n: 4000 }],
  pass: {
    observedAt: AT,
    trackedEquities: 501,
    eligibleEquities: 496,
    splitDiscontinuity: 5,
    absent: 0,
    candidatePairs: 122_760,
    computedPairs: 122_760,
    retainedPairs: 1,
    tooFewOverlappingSamples: 0,
    zeroVariance: 0,
    belowSignificance: 20_752,
    retainedN: 5,
    lookbackSessions: 60,
    spanMinutes: 5,
    feed: "sip",
  },
});

// ---------------------------------------------------------------------------
// Reading the region
// ---------------------------------------------------------------------------

const region = (page: Page): Locator =>
  page.getByRole("region", { name: "Market topology" });

const collapse = (text: string): string | null => {
  const written = text.replace(/\s+/gu, " ").trim();
  return written === "" ? null : written;
};

/**
 * **The region's own text, and its `reserved`-state treatment beside it** —
 * two surfaces, the second of which is Task 4.7.11's routed hand-off.
 *
 * The treatment is read from the **computed style** rather than from a class
 * name, because `Panel`'s `reserved` state is three declarations (a hatched
 * `repeating-linear-gradient`, a dashed border, no shadow) and what the finding
 * is about is whether a reader can tell *this region is degraded* from *nobody
 * has built this region* — which is a question about the drawn ink.
 */
async function readRegion(
  page: Page,
): Promise<{ text: string | null; treatment: string }> {
  const section = region(page);
  const text = collapse(await section.innerText());
  const treatment = await section.evaluate((element) => {
    const style = globalThis.getComputedStyle(element);
    return `${style.borderTopStyle} ${
      style.backgroundImage.includes("repeating-linear-gradient")
        ? "hatched"
        : "plain"
    }`;
  });
  return { text, treatment };
}

/**
 * **A settled read is two reads 300 ms apart agreeing** — the landing grid's
 * own rule, and it is needed here for the same reason: `/` re-renders
 * 13.6–32.2 times a minute in every degraded state, so a state read once may
 * differ only in which render was caught.
 */
async function settledRead(page: Page): Promise<{
  text: string | null;
  treatment: string;
  settled: boolean;
}> {
  let previous = await readRegion(page);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.waitForTimeout(300);
    const again = await readRegion(page);
    if (again.text === previous.text && again.treatment === previous.treatment)
      return { ...again, settled: true };
    previous = again;
  }
  return { ...previous, settled: false };
}

/** Load the route and wait for the application to have rendered something. */
async function open(page: Page, path = OVERVIEW): Promise<void> {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("region", { name: "Market proxies" }),
  ).toBeVisible();
}

// ---------------------------------------------------------------------------
// The collision classes, declared rather than counted
// ---------------------------------------------------------------------------

const COLLISION_CLASSES: Record<string, string> = {
  "one-region-three-thin-stores":
    "A store with no bars, a deployment with no market-data provider, and an " +
    "aggregate that arrived carrying nothing are ONE picture and ONE sentence " +
    "inside this region, and that is Story 6.8's acceptance criterion 6's " +
    "named, accepted exception rather than a gap. This region reads exactly " +
    "three things — the tracked universe, the measured relationships, and the " +
    "aggregate's anomalyBands section — and all three of these states leave " +
    "all three of those in the same condition: 516 securities, no nightly " +
    "pass, nothing scored. It reads neither the connection nor the provider, " +
    "which have one home each (the status bar's connection word and the " +
    "source note's provider line) and which `pnpm invariants` refuses a " +
    "second home for by name, so the differentiators are real and are one " +
    "surface away rather than missing. Inventing region-level wording to " +
    "separate them would be that second home.",
  "a-withdrawn-band-section-changes-nothing-here":
    "A page that has been told the bands and then handed an aggregate with no " +
    "anomalyBands section at all reads IDENTICALLY to one that was only ever " +
    "told the bands — which is Story 6.3's acceptance criterion 5 asserted " +
    "from the outside: a rollback, a pinned previous image or two nightly " +
    "tables a session apart never blanks what is already drawn. " +
    "`MarketOverview.tsx`'s `appliedRealAnomalyBands` ref is the mechanism " +
    "and this is the only check on this screen that can see it stop working: " +
    "if a withdrawn section ever reverted the graph to `unscored`, these two " +
    "rows would separate and the honest-nothing clause would appear in the " +
    "second one.",
  "the-measurement-could-not-be-read-is-one-state":
    "A relationships route that refuses to answer and one that answers a body " +
    "the shipped decoder refuses are ONE state, by " +
    "`toRelationshipsView`'s own contract: `unreadable-body`, `api-error`, " +
    "`http-error`, `timeout` and `unreachable` all collapse onto `failed`, " +
    "because there is nothing a reader could act on differently and nothing " +
    "on screen to repair. Both rows are produced rather than one being " +
    "enumerated away, because the second one is the only thing that proves " +
    "the refusal happens at all: a decoder that admitted `r = 4.2` would read " +
    "`measured` here and draw an edge at an impossible coefficient.",
};

/**
 * **Enumerated and deliberately not produced, with the reason** — AC 5's own
 * last state and the one state of this region no frame can reach.
 */
const ENUMERATED_AND_NOT_PRODUCED = [
  {
    state: "the region nobody has built",
    why:
      "AC 5's ninth state, and no byte this harness can send removes a " +
      "shipped region from a bundle. What it is really asking — whether a " +
      "DEGRADED topology can be told from a DEFERRED one — is produced here " +
      "instead, as the `treatment` surface on every row beside the text: " +
      "`Panel`'s reserved state is a hatched `repeating-linear-gradient` and " +
      "a dashed border, and this region draws `solid plain` in every state it " +
      "has, including the three failure states where it owns the whole box. " +
      "The nearest reachable pair is asserted in its own test below, against " +
      "`Current investigations`, which is the one badged hatch left on this " +
      "screen.",
  },
  {
    state: "a region whose content THREW",
    why:
      "Not a state of any frame — the landing grid's own entry, and it is " +
      "unchanged by this region. `readOverview` refuses a malformed aggregate " +
      "at the decoder and `toRelationshipsView` refuses a malformed body, so " +
      "the renderer is never handed something that throws. It is a reachable " +
      "state of the PRODUCT and it is owned at the component level, by " +
      "`Region.test.tsx`' walk over the content slot's three states and by " +
      "`Region.stories.tsx`' FailedWithAClaimInItsHead. What this region DOES " +
      "produce, and what no other region on `/` can, is a renderer that " +
      "refuses to start — jsdom and any browser with no 2d context — which is " +
      "DOM text beside the frame rather than a thrown region, and " +
      "`overview-market-topology.spec.ts` asserts its absence.",
  },
  {
    state: "a store with no bars, as a WHOLE-RUN shape",
    why:
      "`pnpm store:bare` builds CI's own store — 516 securities, zero bars — " +
      "and a backend on it serves the real empty relationships route and a " +
      "real aggregate with no band section. That is a second backend and a " +
      "second pair, which no spec in this suite starts; the within-run " +
      "equivalent is row 03, which furnishes the same two answers through the " +
      "shipped decoder. Task 6.8.2 took the whole-run version by hand for the " +
      "band refusal and recorded the frame verbatim, which is the shape this " +
      "claim is checked in rather than mechanised.",
  },
  {
    state: "ADR 0028's 160 ms cover over a filter change",
    why:
      "Unreachable by construction and recorded as such at this story's own " +
      "Gate 1: a client-side filter over a universe already in the browser " +
      "makes no request, so there is no wait to cover. Six independent " +
      "shaping reports found it, AC 3 was rewritten around it, and " +
      "`overview-market-topology-filter.spec.ts` asserts the half that IS " +
      "checkable — no re-mount, no reset of pan, zoom or selection.",
  },
] as const;

// ---------------------------------------------------------------------------
// The states
// ---------------------------------------------------------------------------

interface Produced {
  readonly plant: Record<string, number>;
  readonly note?: string;
}

interface State {
  readonly id: string;
  readonly kind: "produced" | "furnished-body";
  readonly collisionClass?: string;
  readonly drive: (page: Page) => Promise<Produced>;
}

/** Hold the relationships route to one answer, and count the interceptions. */
async function serveRelationships(
  page: Page,
  body: string,
): Promise<() => number> {
  let served = 0;
  await page.route(RELATIONSHIPS_ROUTE_PATTERN, async (route) => {
    served += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body,
    });
  });
  return () => served;
}

const STATES: readonly State[] = [
  {
    // **The baseline, and the only row here that is not degraded in any
    // way** — the whole market, with a real band section and whatever the real
    // store answers about measured relationships. Its own figures are
    // `overview-market-topology.spec.ts`'; what it is for here is distinctness.
    id: "01-the-whole-market",
    kind: "produced",
    collisionClass: "a-withdrawn-band-section-changes-nothing-here",
    drive: async (page) => {
      const produced = await serveFeed(page, {
        feed: VENUE,
        overview: SCORED,
      });
      await open(page);
      await expect
        .poll(() => produced.overviews(), { timeout: 10_000 })
        .toBeGreaterThan(0);
      return {
        plant: {
          connections: produced.connections(),
          overviews: produced.overviews(),
        },
      };
    },
  },
  {
    // **One sector, reused as a cross-check rather than re-built** — Task
    // 6.8.1's own spec owns every assertion about what a filter does; this row
    // exists so the degraded states below are compared against a NARROWED
    // picture too, which is the one state in AC 5's list that is a reader's
    // choice rather than a fault.
    id: "02-one-sector",
    kind: "produced",
    drive: async (page) => {
      const produced = await serveFeed(page, {
        feed: VENUE,
        overview: SCORED,
      });
      await open(page, "/?sector=technology");
      await expect
        .poll(() => produced.overviews(), { timeout: 10_000 })
        .toBeGreaterThan(0);
      await expect(region(page)).toContainText("Show all");
      return {
        plant: {
          connections: produced.connections(),
          overviews: produced.overviews(),
        },
        note: "the sector filter's own spec owns what it draws; this row is here for the key",
      };
    },
  },
  {
    // **A store with no bars**: the relationships route answers the body a
    // bare store really answers, and the aggregate carries no band section.
    // The provider is configured, which is what makes this a different
    // PRODUCTION from row 04 while being the same picture.
    id: "03-a-store-with-no-bars",
    kind: "produced",
    collisionClass: "one-region-three-thin-stores",
    drive: async (page) => {
      const relationships = await serveRelationships(page, NO_PASS);
      const produced = await serveFeed(page, {
        feed: VENUE,
        overview: SCORE_SECTION_WITHDRAWN,
      });
      await open(page);
      await expect
        .poll(() => produced.overviews(), { timeout: 10_000 })
        .toBeGreaterThan(0);
      // **Channel: the relationships route.** A route that was never dialled
      // and one that answered an empty pass leave the same sentence.
      await expect.poll(relationships, { timeout: 10_000 }).toBeGreaterThan(0);
      return {
        plant: {
          connections: produced.connections(),
          overviews: produced.overviews(),
          "relationships served": relationships(),
        },
        note: "no bars: no nightly pass, no composite scores, a provider configured",
      };
    },
  },
  {
    // **No provider at all.** `serveFeed`'s `feed: null` serves both halves of
    // the feed cell from one value, so the chrome renders no connection word —
    // and the relationships route is held at the empty answer for coherence,
    // because a deployment with no provider has stored no bar and therefore
    // cannot have retained a pair. Serving a pass row beside `feed: null`
    // would be this harness manufacturing a state the server cannot reach,
    // which is its own standing hazard.
    id: "04-no-provider",
    kind: "produced",
    collisionClass: "one-region-three-thin-stores",
    drive: async (page) => {
      const relationships = await serveRelationships(page, NO_PASS);
      const produced = await serveFeed(page, {
        feed: null,
        overview: SCORE_SECTION_WITHDRAWN,
      });
      await open(page);
      await expect
        .poll(() => produced.overviews(), { timeout: 10_000 })
        .toBeGreaterThan(0);
      await expect.poll(relationships, { timeout: 10_000 }).toBeGreaterThan(0);
      return {
        plant: {
          connections: produced.connections(),
          overviews: produced.overviews(),
          "relationships served": relationships(),
        },
        note: "feed: null — no connection word in the chrome, which this region does not read",
      };
    },
  },
  {
    // **The aggregate arrived carrying nothing**: every section present, every
    // section empty, no observation instant. CI's shape and a restarted
    // replica's.
    id: "05-the-aggregate-carrying-nothing",
    kind: "produced",
    collisionClass: "one-region-three-thin-stores",
    drive: async (page) => {
      const relationships = await serveRelationships(page, NO_PASS);
      const produced = await serveFeed(page, {
        feed: VENUE,
        overview: EMPTY_JOIN,
      });
      await open(page);
      await expect
        .poll(() => produced.overviews(), { timeout: 10_000 })
        .toBeGreaterThan(0);
      await expect.poll(relationships, { timeout: 10_000 }).toBeGreaterThan(0);
      return {
        plant: {
          connections: produced.connections(),
          overviews: produced.overviews(),
          "relationships served": relationships(),
        },
        note: "every section present and empty, and no observedAt at all",
      };
    },
  },
  {
    // **The backend unreachable** — at the route rather than by killing the
    // real process, which would poison every later spec in the run. This is
    // the one row where the region owns the whole box: a sentence, a
    // `Try again` because retrying is worth offering, and no correlation id,
    // because nothing answered to carry one.
    id: "06-the-backend-unreachable",
    kind: "produced",
    drive: async (page) => {
      let aborted = 0;
      await page.route(SECURITIES_ROUTE_PATTERN, async (route) => {
        aborted += 1;
        await route.abort("connectionrefused");
      });
      const produced = await serveFeed(page, {
        feed: VENUE,
        overview: SCORED,
      });
      await open(page);
      await expect(region(page)).toContainText(
        "Nothing answered at the service’s address",
      );
      // **Channel: the refusals, counted at the route.** A universe request
      // that was never made and one that was refused leave the same sentence.
      expect(aborted).toBeGreaterThan(0);
      return {
        plant: {
          connections: produced.connections(),
          overviews: produced.overviews(),
          "universe refused": aborted,
        },
      };
    },
  },
  {
    // **The band section withdrawn mid-session** — a real rollback frame,
    // produced: the page is told the bands, then handed an aggregate with no
    // `anomalyBands` at all. The claim is that nothing changes, which is why
    // this shares a collision class with row 01.
    id: "07-the-band-section-withdrawn",
    kind: "produced",
    collisionClass: "a-withdrawn-band-section-changes-nothing-here",
    drive: async (page) => {
      const produced = await serveFeed(page, {
        feed: VENUE,
        overview: SCORED,
      });
      await open(page);
      await expect
        .poll(() => produced.overviews(), { timeout: 10_000 })
        .toBeGreaterThan(0);
      // The band account has to be on screen BEFORE the section is withdrawn,
      // or this row produces "a page that was never told anything" and reads
      // as row 03 — a state the grid already has, under a name claiming
      // something else.
      await expect(region(page)).toContainText("2 are high and 1 is extreme");

      const served = produced.overviews();
      produced.sendOverview(SCORE_SECTION_WITHDRAWN);
      // **Channel: the second aggregate.** A frame that was built and never
      // sent and a frame that changed nothing read identically here — which
      // is this row's entire subject.
      await expect
        .poll(() => produced.overviews(), { timeout: 10_000 })
        .toBeGreaterThan(served);

      return {
        plant: {
          connections: produced.connections(),
          overviews: produced.overviews(),
        },
        note: "bands applied, then an aggregate with no anomalyBands section at all",
      };
    },
  },
  {
    // **The relationships route refuses to answer.** The graph beside it is
    // correct and complete about its own subject; one layer is missing, and
    // that is the whole claim — no `Try again`, no correlation id, no status
    // word.
    id: "08-the-relationships-route-failed",
    kind: "produced",
    collisionClass: "the-measurement-could-not-be-read-is-one-state",
    drive: async (page) => {
      let aborted = 0;
      await page.route(RELATIONSHIPS_ROUTE_PATTERN, async (route) => {
        aborted += 1;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          headers: {
            [REQUEST_ID_HEADER]: "a1b2c3d4-5e6f-4071-8a92-b3c4d5e6f708",
            "access-control-expose-headers": REQUEST_ID_HEADER,
          },
          body: JSON.stringify(
            apiError(
              "SERVICE_UNAVAILABLE",
              "Market data is temporarily unavailable. Try again shortly.",
              "a1b2c3d4-5e6f-4071-8a92-b3c4d5e6f708",
            ),
          ),
        });
      });
      const produced = await serveFeed(page, {
        feed: VENUE,
        overview: SCORE_SECTION_WITHDRAWN,
      });
      await open(page);
      await expect(region(page)).toContainText("could not be read");
      expect(aborted).toBeGreaterThan(0);
      return {
        plant: {
          connections: produced.connections(),
          overviews: produced.overviews(),
          "relationships refused": aborted,
        },
      };
    },
  },
  {
    // **The relationships route answers a shape the decoder refuses** — the
    // row that proves the refusal exists. See {@link REFUSED_PASS}.
    id: "09-the-relationships-body-refused",
    kind: "furnished-body",
    collisionClass: "the-measurement-could-not-be-read-is-one-state",
    drive: async (page) => {
      const relationships = await serveRelationships(page, REFUSED_PASS);
      const produced = await serveFeed(page, {
        feed: VENUE,
        overview: SCORE_SECTION_WITHDRAWN,
      });
      await open(page);
      await expect(region(page)).toContainText("could not be read");
      // **Channel: the body was served.** A route that answered nothing and a
      // body that was refused leave the same sentence — and without this
      // counter, a pattern that silently matched nothing would read as the
      // decoder working.
      await expect.poll(relationships, { timeout: 10_000 }).toBeGreaterThan(0);
      // **And the impossible coefficient reached no sentence**, which is the
      // half a count cannot show: an admitted body would say `measured` here.
      await expect(region(page)).not.toContainText("1 pair, reaching");
      return {
        plant: {
          connections: produced.connections(),
          overviews: produced.overviews(),
          "refused bodies served": relationships(),
        },
        note: "r = 4.2, which relationships-response.ts refuses whole",
      };
    },
  },
];

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

interface Row {
  readonly state: State;
  readonly text: string | null;
  readonly treatment: string;
  readonly produced: Produced;
  readonly settled: boolean;
}

function renderGrid(width: number, rows: readonly Row[]): string {
  const lines = [
    `# The market topology's degraded set at ${String(width)}`,
    "",
  ];

  for (const row of rows) {
    lines.push(
      `## ${row.state.id}  [${row.state.kind}]${row.settled ? "" : " (UNSETTLED)"}`,
    );
    if (row.produced.note !== undefined)
      lines.push(`    note: ${row.produced.note}`);
    lines.push(
      `    plant    : ${Object.entries(row.produced.plant)
        .map(([channel, count]) => `${channel}=${String(count)}`)
        .join(", ")}`,
      `    class    : ${row.state.collisionClass ?? "—"}`,
      `    treatment: ${row.treatment}`,
      `    text     : ${row.text ?? "(nothing drawn)"}`,
      "",
    );
  }

  lines.push("## Enumerated and deliberately not produced");
  for (const item of ENUMERATED_AND_NOT_PRODUCED) {
    lines.push(`  - ${item.state}: ${item.why}`);
  }

  lines.push("", "## The declared collision classes");
  for (const [name, sentence] of Object.entries(COLLISION_CLASSES)) {
    lines.push(`  - ${name}: ${sentence}`);
  }

  return lines.join("\n");
}

for (const width of WIDTHS) {
  test.describe(`the topology's degraded set at ${String(width)}`, () => {
    test.use({ viewport: { width, height: width === 390 ? 780 : 900 } });

    test("nine states, the declared collisions, and the deferred hatch it never borrows", async ({
      context,
    }) => {
      test.slow();
      const rows: Row[] = [];

      for (const state of STATES) {
        // **Every state gets its own page**, from the `context` fixture rather
        // than the `page` one — the landing grid's own rule: a `page.route` one
        // state installs would otherwise answer the next.
        const page = await context.newPage();
        try {
          const produced = await state.drive(page);
          const { text, treatment, settled } = await settledRead(page);

          // **No state here is a crash**, which is the claim every degraded
          // picture is only worth anything under.
          await expectNothingFailedToRender(page);

          expect(
            settled,
            `${state.id} never settled at ${String(width)}: eight reads ` +
              `300 ms apart disagreed, so every collision assertion over it ` +
              `would be a coin toss`,
          ).toBe(true);

          expect(
            text,
            `${state.id} drew NOTHING in this region at ${String(width)} — ` +
              "which is the one reading this grid may never contain: a " +
              "region that says nothing is the state ADR 0029's fourth rule " +
              "forbids outright",
          ).not.toBeNull();

          // **The deferred hatch, per row** (Task 4.7.11's hand-off): this
          // region owns its own box in every state it has, including the
          // three failures, and it never borrows `Panel`'s reserved
          // treatment — which is what keeps *this is degraded* and *nobody
          // has built this* two pictures.
          expect(
            treatment,
            `${state.id} draws Panel's RESERVED treatment at ` +
              `${String(width)} — a degraded region wearing the picture this ` +
              "screen uses for one nobody has built, which is Task 4.7.11's " +
              "own finding arriving in the region this story owns",
          ).toBe("solid plain");

          rows.push({ state, text, treatment, produced, settled });

          if (PHOTOGRAPH) {
            await mkdir(CAPTURE, { recursive: true });
            const name = `${state.id}-${String(width)}`;
            await region(page).screenshot({ path: `${CAPTURE}/${name}.png` });
            await page.addStyleTag({
              content: `html { filter: grayscale(1) !important }`,
            });
            await region(page).screenshot({
              path: `${CAPTURE}/${name}-grey.png`,
            });
          }
        } finally {
          await page.close();
        }
      }

      console.log(renderGrid(width, rows));

      if (PHOTOGRAPH) {
        await mkdir(CAPTURE, { recursive: true });
        await writeFile(
          `${CAPTURE}/readings-${String(width)}.json`,
          `${JSON.stringify(
            rows.map((row) => ({
              id: row.state.id,
              kind: row.state.kind,
              width,
              collisionClass: row.state.collisionClass ?? null,
              text: row.text,
              treatment: row.treatment,
              plant: row.produced.plant,
              settled: row.settled,
            })),
            null,
            1,
          )}\n`,
          "utf8",
        );
      }

      // **The partition by drawn string equals the partition by declared
      // class**, pairwise, so a failure names the two rows and the direction.
      // Both directions are live: an accidental collapse is a grid that has
      // stopped distinguishing something, and a declared exception that no
      // longer holds is the half a count can never see.
      for (const row of rows) {
        if (row.state.collisionClass === undefined) continue;
        expect(
          Object.keys(COLLISION_CLASSES),
          `${row.state.id} declares a class nothing justifies`,
        ).toContain(row.state.collisionClass);
      }

      for (let a = 0; a < rows.length; a += 1) {
        for (let b = a + 1; b < rows.length; b += 1) {
          const one = rows[a];
          const two = rows[b];
          if (one === undefined || two === undefined) continue;

          const collide = one.text === two.text;
          const declared =
            one.state.collisionClass !== undefined &&
            one.state.collisionClass === two.state.collisionClass;

          expect(
            collide,
            declared
              ? `${one.state.id} and ${two.state.id} share the class ` +
                  `${one.state.collisionClass ?? ""} and no longer read ` +
                  `identically at ${String(width)} — the documented ` +
                  `exception has stopped holding`
              : `${one.state.id} and ${two.state.id} read IDENTICALLY at ` +
                  `${String(width)} and declare no shared class — an ` +
                  `accidental collapse`,
          ).toBe(declared);
        }
      }
    });

    /**
     * **The nearest reachable pair for *the region nobody has built***, which
     * is AC 5's one unproducible state asked as a question a browser can
     * answer (Task 4.7.11's routed hand-off, closed here).
     *
     * `Current investigations` is the last badged hatch on this screen. If the
     * topology's own failure state ever came to look like it, a reader would
     * have no way to tell *this broke* from *this is Epic 7's*.
     */
    test("a degraded topology and a deferred region are two different pictures", async ({
      page,
    }) => {
      await page.route(SECURITIES_ROUTE_PATTERN, async (route) => {
        await route.abort("connectionrefused");
      });
      await serveFeed(page, { feed: VENUE, overview: SCORED });
      await open(page);

      const degraded = region(page);
      await expect(degraded).toContainText(
        "Nothing answered at the service’s address",
      );

      const deferred = page.getByRole("region", {
        name: "Current investigations",
      });

      const treatmentOf = (locator: Locator): Promise<string> =>
        locator.evaluate((element) => {
          const style = globalThis.getComputedStyle(element);
          return `${style.borderTopStyle} ${
            style.backgroundImage.includes("repeating-linear-gradient")
              ? "hatched"
              : "plain"
          }`;
        });

      // **The positive control first**: the deferred region really does draw
      // the hatch, so the negative below is a difference rather than a
      // selector that stopped matching.
      expect(await treatmentOf(deferred)).toBe("dashed hatched");
      expect(await treatmentOf(degraded)).toBe("solid plain");

      // And the words differ in kind, not only in treatment: the deferred
      // region names whose work fills it, and the degraded one says what it
      // could not do and offers the one repair worth offering.
      await expect(deferred).toContainText("Epic 7");
      // **By name, because this region has FOUR buttons in its failure
      // state** — `Sector`, `Band`, `Reset view` and `Try again` (found by
      // writing this assertion the broad way first). The filter controls and
      // `Reset view` stay present over a graph that could not be drawn, which
      // is `Reset view`'s own recorded argument inherited by the two controls
      // Tasks 6.8.1 and 6.8.2 added beside it: a control that comes and goes
      // under a reader is worse than one that is briefly inert.
      await expect(
        degraded.getByRole("button", { name: /^Try again/u }),
      ).toHaveAccessibleName(/Try again — the market topology/u);
      expect(await degraded.getByRole("button").count()).toBe(4);
      await expect(degraded).not.toContainText(/Epic \d/u);
    });

    /**
     * **The measured-edge clause follows the picture**, which is this task's
     * own repair and AC 7's subject (Task 6.8.3).
     *
     * The renderer suppresses the whole correlation batch below
     * `TOPOLOGY_SECTOR_LABEL_MIN_SCALE` — measured at **1440 only** of the four
     * widths this product tests, against resolved content boxes of 998, 570,
     * 686 and 308 px and fit scales of 0.4604, 0.3033, 0.3650 and 0.1639 — and
     * the sentence beside it claimed a dashed edge at all four until this task.
     *
     * **Grounded outside the page**: whether this store has a measured pass at
     * all is asked of the backend directly, so a producer that fabricated one
     * could not satisfy this by agreeing with itself. On CI there is no pass
     * for ever — zero bars, no provider, no nightly job — so the arm that runs
     * there is the `never-measured` one, which claims no ink at any width and
     * is asserted as such.
     */
    test("the measured-edge clause claims a dashed edge only where one is drawn", async ({
      page,
    }) => {
      const response = await page.request.get(
        `${backendOrigin}/market-data/relationships`,
      );
      expect(response.ok()).toBe(true);
      const body = (await response.json()) as RelationshipsResponse;

      await serveFeed(page, { feed: VENUE, overview: SCORED });
      await open(page);

      const sentence = region(page).locator("p", {
        hasText: /^A graph of every security we track/u,
      });
      await expect(sentence).toBeVisible();

      if (body.pass === undefined || body.correlations.length === 0) {
        // **CI, permanently, and every laptop before its first
        // `pnpm baselines`.** There is no measurement, so there is no ink
        // claim to be wrong about — stated rather than skipped, because a
        // conditional assertion in a browser spec is otherwise
        // indistinguishable from a passing one.
        await expect(sentence).not.toContainText("joined by a dashed edge");
        await expect(sentence).not.toContainText("not drawn at this size");
        return;
      }

      if (width === 1440) {
        await expect(sentence).toContainText("joined by a dashed edge");
        await expect(sentence).not.toContainText("not drawn at this size");
      } else {
        await expect(sentence).toContainText(
          "are not drawn at this size, where the sector clusters are unlabelled too",
        );
        await expect(sentence).not.toContainText("joined by a dashed edge");
      }

      // **The account of the measurement is width-blind, and that is the half
      // of the old argument that was right**: the retained count, the reach,
      // the population, the window and the per-security `N` are facts about
      // last night's pass rather than about this viewport.
      await expect(sentence).toContainText(
        new RegExp(
          `from ${body.pass.computedPairs.toLocaleString("en-US")} pairs measured over ${String(body.pass.lookbackSessions)} trading sessions`,
          "u",
        ),
      );
    });
  });
}
