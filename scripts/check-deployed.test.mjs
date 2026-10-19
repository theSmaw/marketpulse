// What `scripts/check-deployed.mjs` decides, and what it waits for (2026-10-16).
//
// **The first test in `scripts/`, and the reason it is here rather than in a
// package.** `check-deployed.mjs` is a mechanism and not a wrapper: the
// convention this repository records — *`scripts/*.mjs`: every root script's
// mechanism, or a thin wrapper over one in `src/`* — is satisfied by the second
// half for `migrate`, `universe` and `backfill`, and by the first half here,
// because this script drives two live hosts and belongs in neither
// application's package. Moving it into `apps/backend/src` to borrow a vitest
// config would put a check about the DEPLOYED PAIR inside one of the two halves
// it judges.
//
// So: `node:test`, run by `pnpm test:scripts`, which `pnpm verify` runs by name
// like every other step. It needs no server, no database, no network and no
// credentials — `globalThis.fetch` is replaced per test, and both polling loops
// take an injectable `now` and `sleep`, so the 60-second grace and the
// three-minute deadline are asserted in milliseconds of real time.
//
// ## What these tests are about
//
// Both subjects are the same defect class: **a check that goes red on a healthy
// deployment teaches everybody to ignore the one check that can see failures
// nothing else can.** Three pipeline runs were red for it — `probe-deployed`
// 38778595130 on a feed that was already `iex` and merely quiet, and `deploy`
// 38704668224 and 38861268104 on a container that answered `/health` before it
// could serve a series.
//
// The mirror is asserted beside each one, because the repair's whole risk is
// over-shooting it: a wrong `feed` still fails at the first attempt, and a
// deployment that never serves a series is still red.

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  checkDeployed,
  probeFeed,
  probeSeries,
  reportDeployed,
} from "./check-deployed.mjs";

const BACKEND = "https://backend.example";
const FRONTEND = "https://frontend.example";

/**
 * A clock that only moves when something waits on it.
 *
 * The seam both loops already take. `sleep` advances `now` by exactly the
 * interval it was asked for, so a grace or a deadline elapses in the number of
 * iterations it really would and in no wall-clock time at all — and a loop that
 * forgot to advance it would hang rather than pass, which is the right failure.
 */
function clock() {
  let t = 1_000_000;
  return {
    now: () => t,
    sleep: (ms) => {
      t += ms;
      return Promise.resolve();
    },
    elapsed: () => t - 1_000_000,
  };
}

/** One JSON answer, as `get()`'s `fetch` sees it. */
function json(body, status = 200) {
  return { status, json: () => Promise.resolve(body), text: () => "" };
}

/** One HTML answer. */
function html(text, status = 200) {
  return {
    status,
    json: () => Promise.reject(new Error("not JSON")),
    text: () => Promise.resolve(text),
  };
}

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

/**
 * Route every request this script makes to a handler, and count them.
 *
 * Keyed on the path rather than the whole URL, so a test says what it is about
 * — `"/diagnostics/feed"` — and an unrouted request throws by name instead of
 * arriving as `undefined.status` several assertions later.
 */
function stubFetch(routes) {
  const calls = [];

  globalThis.fetch = (url) => {
    const { pathname, search } = new URL(url);
    calls.push(pathname + search);

    const handler = routes[pathname];
    if (handler === undefined) {
      throw new Error(`nothing stubbed for ${pathname}`);
    }

    return Promise.resolve(
      typeof handler === "function" ? handler(calls.length) : handler,
    );
  };

  return calls;
}

/** The feed diagnostic's body, with one field at a time moved. */
function feedBody(overrides) {
  return {
    provider: "alpaca",
    feed: "iex",
    status: "live",
    observedAt: "2026-10-16T17:35:00.000Z",
    marketOpen: true,
    checkedAt: "2026-10-16T17:35:01.000Z",
    ...overrides,
  };
}

describe("probeFeed: what resolves by waiting", () => {
  it("retries a connected iex that has printed nothing, and passes when it prints", async () => {
    // The state run 38778595130 went red on: `feed=iex status=stale` at 13:35
    // ET, with the socket up. One print later it is `live`.
    const calls = stubFetch({
      "/diagnostics/feed": (n) =>
        json(feedBody({ status: n < 4 ? "stale" : "live" })),
    });

    const time = clock();
    const result = await probeFeed(BACKEND, time);

    assert.equal(result.ok, true);
    assert.match(result.detail, /live on iex, market open/);
    assert.equal(calls.length, 4);
    assert.equal(time.elapsed(), 3_000);
  });

  it("gives up on a feed that stays quiet for the whole grace, and is red", async () => {
    const calls = stubFetch({
      "/diagnostics/feed": json(feedBody({ status: "stale" })),
    });

    const time = clock();
    const result = await probeFeed(BACKEND, time);

    assert.equal(result.ok, false);
    assert.match(
      result.detail,
      /the market is open and the feed is not a connected iex/,
    );
    // 60 s of grace at a 1 s poll, so the last attempt is the one at the
    // deadline. A probe that returned on the FIRST attempt — the behaviour
    // before 2026-10-16 — is this assertion's own counter-example.
    assert.equal(calls.length, 61);
    assert.equal(time.elapsed(), 60_000);
  });

  it("retries a disconnected feed in session, because the arriving replica is refused by design", async () => {
    // §8.2: every deploy meets a `406 connection limit exceeded` while the
    // outgoing replica holds the plan's single slot, measured at 45.8–46.5 s.
    const calls = stubFetch({
      "/diagnostics/feed": (n) =>
        json(feedBody({ status: n < 10 ? "disconnected" : "live" })),
    });

    const result = await probeFeed(BACKEND, clock());

    assert.equal(result.ok, true);
    assert.equal(calls.length, 10);
  });

  it("does NOT retry a wrong feed in session — that is configuration, not a connection", async () => {
    // The half of the old comment worth keeping. A deployment configured to
    // serve something other than `iex` serves it just as determinedly on the
    // sixty-first request.
    const calls = stubFetch({
      "/diagnostics/feed": json(feedBody({ feed: "sip", status: "live" })),
    });

    const result = await probeFeed(BACKEND, clock());

    assert.equal(result.ok, false);
    assert.equal(result.retryable, false);
    assert.equal(calls.length, 1);
  });

  it("does NOT retry a replaying deployment", async () => {
    const calls = stubFetch({
      "/diagnostics/feed": json(
        feedBody({ provider: "replay", feed: "replay", status: "live" }),
      ),
    });

    const result = await probeFeed(BACKEND, clock());

    assert.equal(result.ok, false);
    assert.match(result.detail, /REPLAYING/);
    assert.equal(calls.length, 1);
  });

  it("does NOT retry a 404 — the route does not exist on the running revision", async () => {
    const calls = stubFetch({ "/diagnostics/feed": json({}, 404) });

    const result = await probeFeed(BACKEND, clock());

    assert.equal(result.ok, false);
    assert.equal(result.missing, true);
    assert.equal(calls.length, 1);
  });

  it("still retries a disconnected feed with the market shut", async () => {
    // Condition 3's own grace, unchanged by the widening above.
    const calls = stubFetch({
      "/diagnostics/feed": (n) =>
        json(
          feedBody({
            marketOpen: false,
            status: n < 3 ? "disconnected" : "live",
          }),
        ),
    });

    const result = await probeFeed(BACKEND, clock());

    assert.equal(result.ok, true);
    assert.equal(calls.length, 3);
  });

  it("passes a quiet feed with the market shut at the first attempt", async () => {
    // `stale` out of hours is the honest state and never was a fault.
    const calls = stubFetch({
      "/diagnostics/feed": json(
        feedBody({ marketOpen: false, status: "stale" }),
      ),
    });

    const result = await probeFeed(BACKEND, clock());

    assert.equal(result.ok, true);
    assert.equal(calls.length, 1);
  });
});

/** A series answer, with `n` bars in it. */
function seriesBody(bars) {
  return {
    series: {
      symbol: "NVDA",
      timeframe: "1m",
      bars: Array.from({ length: bars }, () => ({
        startsAt: "2026-10-16T13:30:00.000Z",
        open: 1,
        high: 1,
        low: 1,
        close: 1,
        volume: 1,
      })),
      provenance: {
        adjustment: "unadjusted",
        sources: [
          {
            provider: "alpaca",
            feed: "sip",
            retrievedAt: "2026-10-16T08:00:00.000Z",
            barCount: bars,
          },
        ],
      },
      coverage: { requested: { start: "", end: "" }, covered: null },
    },
    securityStatus: "active",
  };
}

const BARS_PATH = "/market-data/bars";

describe("probeSeries: can the deployment serve the thing the page reads", () => {
  // **The defect this probe was widened for, as a test.** `deploy` 39213220338
  // printed `✓ series … 1889 bars for NVDA 1m/5 sessions` and then failed
  // `security-explorer-journey.spec.ts:225` on `?sessions=21`, the window its
  // control reaches — measured against production at 2.67 s and 925 kB against
  // the 5-session window's 1.19 s and 35 kB. A deployment that serves the
  // cheap read and not the expensive one is NOT ready, and the old probe
  // called it ready.
  it("is RED when the window a control reaches fails and the cold load's succeeds", async () => {
    const calls = stubFetch({
      [BARS_PATH]: (n) =>
        n === 1
          ? json(seriesBody(1_950))
          : { ok: false, status: 503, json: () => Promise.reject(new Error()) },
    });

    const result = await probeSeries(BACKEND);

    assert.equal(result.ok, false);
    assert.match(result.detail, /HTTP 503/);
    // Both were asked for, in order, and the second is the one that answered.
    assert.equal(calls.length, 2);
    assert.match(calls[1], /sessions=21$/);
  });

  it("asks for the query the security page asks for, and reports the bars", async () => {
    const calls = stubFetch({ [BARS_PATH]: json(seriesBody(1_950)) });

    const result = await probeSeries(BACKEND);

    assert.equal(result.ok, true);
    // The client's own parameter order, which two caches key on.
    assert.deepEqual(calls, [
      // **BOTH windows, in the order a reader meets them** — updated
      // 2026-10-19 after `deploy` 39213220338 failed on the window the probe
      // had never asked for while printing a green `series` line.
      "/market-data/bars?symbol=NVDA&timeframe=1m&sessions=5",
      "/market-data/bars?symbol=NVDA&timeframe=1m&sessions=21",
    ]);
    assert.match(
      result.detail,
      /1950 bars for NVDA 1m\/5 sessions, 1 source \(sip\) · 1950 bars for NVDA 1m\/21 sessions, 1 source \(sip\)/,
    );
  });

  it("names the tapes once however many contiguous runs the window holds", async () => {
    // The shape production actually answered with on 2026-10-16: a 5-session
    // minute window reaching into extended hours alternates `sip` and `iex`,
    // eight runs of it, because the nightly backfill covers the regular
    // session and the live writer keeps what sits either side.
    const body = seriesBody(1_887);
    body.series.provenance.sources = [
      "sip",
      "iex",
      "sip",
      "iex",
      "sip",
      "iex",
      "sip",
      "iex",
    ].map((feed) => ({
      provider: "alpaca",
      feed,
      retrievedAt: "2026-10-16T08:00:00.000Z",
      barCount: 1,
    }));

    const result = await stubbedSeries(json(body));

    assert.equal(result.ok, true);
    assert.match(result.detail, /8 sources \(sip\+iex\)/);
  });

  it("is red on a 200 carrying an empty series", async () => {
    const result = await stubbedSeries(json(seriesBody(0)));

    assert.equal(result.ok, false);
    assert.match(result.detail, /EMPTY series/);
  });

  it("is red on a 5xx, naming the status", async () => {
    const result = await stubbedSeries(json({}, 503));

    assert.equal(result.ok, false);
    assert.equal(result.detail, "HTTP 503");
  });

  it("is red when the request itself fails", async () => {
    globalThis.fetch = () => Promise.reject(new Error("fetch failed"));

    const result = await probeSeries(BACKEND);

    assert.equal(result.ok, false);
    assert.equal(result.detail, "fetch failed");
  });

  it("is red on a 200 that is not the contract", async () => {
    const result = await stubbedSeries(json({ series: { symbol: "NVDA" } }));

    assert.equal(result.ok, false);
    assert.match(result.detail, /not the contract/);
  });
});

async function stubbedSeries(answer) {
  stubFetch({ [BARS_PATH]: answer });
  return probeSeries(BACKEND);
}

/** A healthy deployment, every probe answering. */
function healthyRoutes(overrides = {}) {
  return {
    "/health": json({
      status: "healthy",
      version: "1.0.0",
      uptimeSeconds: 91.6,
    }),
    "/": html('<html><script src="/assets/app-abc.js"></script></html>'),
    "/assets/app-abc.js": html("console.log(1)"),
    [BARS_PATH]: json(seriesBody(1_950)),
    "/diagnostics/freshness": json({
      timeframes: [
        {
          timeframe: "1m",
          stalestSessionsBehind: 0,
          unexplainedSessionsBehind: 0,
        },
      ],
    }),
    "/diagnostics/feed": json(feedBody({})),
    ...overrides,
  };
}

const ADDRESSES = { backendOrigin: BACKEND, frontendOrigin: FRONTEND };

describe("checkDeployed: readiness includes serving a series", () => {
  it("is green on a deployment where every probe answers", async () => {
    const calls = stubFetch(healthyRoutes());

    const result = await checkDeployed(ADDRESSES, clock());

    assert.equal(result.ok, true);
    assert.equal(result.series.ok, true);
    assert.equal(calls.filter((path) => path.startsWith(BARS_PATH)).length, 2);
  });

  it("WAITS for a backend that answers /health before it can serve a series", async () => {
    // `deploy` runs 38704668224 and 38861268104, at `up 91.6s` and `up 96.7s`:
    // everything else green, the bars route not yet serving, and the browser
    // suite started anyway. The whole repair is that this returns green a few
    // seconds later rather than red immediately.
    let attempts = 0;
    stubFetch(
      healthyRoutes({
        [BARS_PATH]: () => {
          attempts += 1;
          return attempts < 5 ? json({}, 503) : json(seriesBody(1_950));
        },
      }),
    );

    const time = clock();
    const result = await checkDeployed(ADDRESSES, time);

    assert.equal(result.ok, true);
    assert.equal(attempts, 6);
    assert.equal(time.elapsed(), 4_000);
  });

  it("is RED when the series never arrives, and says so without naming the store", async () => {
    // The mirror, and the reason the probe is in the verdict rather than only
    // in the output: a deployment that cannot serve a series after the deadline
    // is a real finding — the browser suite would meet it three minutes later
    // with a worse message.
    const calls = stubFetch(healthyRoutes({ [BARS_PATH]: json({}, 503) }));

    const time = clock();
    const result = await checkDeployed(ADDRESSES, time);

    assert.equal(result.ok, false);
    assert.equal(result.series.ok, false);
    assert.equal(result.backend.ok, true);
    assert.equal(result.frontend.ok, true);
    // **Neither freshness nor the feed was probed**, which is what the report's
    // "not reached" treatment prints and what keeps its diagnosis off the wrong
    // subject: nothing here is a claim about the age of the data.
    assert.equal(result.freshness, undefined);
    assert.equal(result.feed, undefined);
    assert.equal(time.elapsed(), 180_000);
    assert.equal(
      calls.filter((path) => path === "/diagnostics/freshness").length,
      0,
    );
  });

  it("does not ask for a series while the frontend is incoherent", async () => {
    // The upload window. A series request to a backend whose pair is not up
    // learns nothing and costs production a request.
    let coherent = false;
    const calls = stubFetch(
      healthyRoutes({
        "/assets/app-abc.js": () =>
          coherent ? html("console.log(1)") : html("", 404),
      }),
    );

    const time = clock();
    // Four polls of the asset, then it lands.
    const sleep = (ms) => {
      if (time.elapsed() >= 3_000) coherent = true;
      return time.sleep(ms);
    };

    const result = await checkDeployed(ADDRESSES, { now: time.now, sleep });

    assert.equal(result.ok, true);
    assert.equal(calls.filter((path) => path.startsWith(BARS_PATH)).length, 2);
  });

  it("does not say the pair never came up when it did", async () => {
    // Found by RENDERING the report rather than by reading it. With the series
    // probe in the retry set there are two reasons `store` and `feed` can be
    // absent, and the fixed sentence put *"the pair never came up"* under a
    // `✓ backend` and a `✓ frontend` — the wrong-subject message this
    // function's own comments record as worse than no message at all.
    stubFetch(healthyRoutes({ [BARS_PATH]: json({}, 503) }));

    const result = await checkDeployed(ADDRESSES, clock());
    const printed = [];
    const log = console.log;
    const error = console.error;
    console.log = (text) => printed.push(text);
    console.error = () => {};
    try {
      reportDeployed(result, ADDRESSES);
    } finally {
      console.log = log;
      console.error = error;
    }

    const store = printed.find((text) => text.includes("store"));
    assert.match(store, /not reached — the backend never served a series/);
    assert.doesNotMatch(printed.join("\n"), /the pair never came up/);
  });

  it("is red on a stale store even with everything else green", async () => {
    // Untouched by either repair, asserted because the series gate sits between
    // the pair and this one and a reordering could lose it.
    stubFetch(
      healthyRoutes({
        "/diagnostics/freshness": json({
          timeframes: [
            {
              timeframe: "1d",
              stalestSessionsBehind: 9,
              unexplainedSessionsBehind: 9,
              stalestSecurities: ["NVDA"],
              stalestSecurityCount: 1,
              unexplainedSecurities: ["NVDA"],
              unexplainedSecurityCount: 1,
            },
          ],
        }),
      }),
    );

    const result = await checkDeployed(ADDRESSES, clock());

    assert.equal(result.ok, false);
    assert.equal(result.series.ok, true);
    assert.equal(result.freshness.ok, false);
  });
});
