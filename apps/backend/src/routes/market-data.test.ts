// GET /market-data, driven through the assembled server (Task 2.6.7).
//
// An integration test through `app.inject()` rather than a unit test on the
// handler, for `diagnostics.test.ts`'s reason: everything worth asserting here
// is a property of the **serialised** response. The route's whole job is to
// turn a configuration into a body a browser can render, and
// `fast-json-stringify` sits between the two — which is where the one
// measured trap lives, below.
//
// No socket, no database, no network. The route takes a resolved `MarketData`,
// which is why a stub is enough.

import {
  isMarketDataResponse,
  toBarSeries,
  toSeriesProvenance,
  toTicker,
  toTimeRange,
} from "@marketpulse/shared";
import type {
  ApiError,
  BarSeriesResponse,
  Security,
  TimeRange,
} from "@marketpulse/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { createFixtureProvider } from "../fixture-provider.js";
import { toStoredSeries } from "../market-bars.js";
import type {
  BarCoverage,
  DatedBarRow,
  MarketBarsRepository,
} from "../market-bars.js";
import type { MarketData } from "../market-data.js";
import { resolveMarketData } from "../market-data.js";
import { loadConfig } from "../config.js";
import type { SeriesRefusalReason } from "../series-request.js";
import { buildServer } from "../server.js";
import { createMarketDataRoutes, toBarSeriesResponse } from "./market-data.js";

const PATH = "/market-data";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function serverWith(marketData: MarketData): Promise<FastifyInstance> {
  // The feed route needs neither repository, so both are stubbed to the shape
  // rather than to an answer — a stub that could serve a series would let a
  // `/market-data/bars` test be written in the wrong half of this file.
  return barsServer({ marketData });
}

describe("GET /market-data", () => {
  it("reports the configured provider's feed", async () => {
    const instance = await serverWith({
      selection: "fixture",
      provider: createFixtureProvider(),
    });

    const response = await instance.inject({ method: "GET", url: PATH });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ feed: "synthetic" });
  });

  // The default deployment, and the state this whole task exists to render
  // honestly. `none` is absence rather than a null object, so there is no
  // provider to ask — `null` is how the contract spells it.
  it("reports a null feed when no provider is configured", async () => {
    const instance = await serverWith({
      selection: "none",
      provider: undefined,
    });

    const response = await instance.inject({ method: "GET", url: PATH });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ feed: null });
  });

  // The trap `routes/securities.ts` measured, asserted rather than assumed: a
  // nullable field declared plainly `"string"` reaches the wire as the EMPTY
  // STRING, which is falsy and reads as "unconfigured" to a client branching on
  // truthiness while being a different value entirely. The schema declares
  // `["string", "null"]`, and this is what would go red if somebody simplified
  // it.
  it("serialises an absent feed as null and not as the empty string", async () => {
    const instance = await serverWith({
      selection: "none",
      provider: undefined,
    });

    const response = await instance.inject({ method: "GET", url: PATH });

    expect(response.body).toBe('{"feed":null}');
  });

  // The contract's own predicate against the contract's own route. Both ends of
  // the wire agree by construction only if something checks them together, and
  // this is the cheapest place that can.
  it("answers a body the shared predicate accepts, in both states", async () => {
    for (const marketData of [
      { selection: "fixture", provider: createFixtureProvider() },
      { selection: "none", provider: undefined },
    ] satisfies readonly MarketData[]) {
      const instance = await serverWith(marketData);
      const response = await instance.inject({ method: "GET", url: PATH });

      expect(isMarketDataResponse(response.json())).toBe(true);

      await instance.close();
      app = undefined;
    }
  });

  // What the deployed page actually renders comes from `MARKET_DATA_PROVIDER`,
  // not from a hand-built object — so the one thing this test would otherwise
  // never check is that the configuration reaches the wire at all.
  it("reads the feed off the real configuration path", async () => {
    const instance = await serverWith(
      resolveMarketData(loadConfig({ MARKET_DATA_PROVIDER: "fixture" })),
    );

    const response = await instance.inject({ method: "GET", url: PATH });

    expect(response.json()).toEqual({ feed: "synthetic" });
  });

  it("exposes the correlation id like every other route", async () => {
    const instance = await serverWith({
      selection: "none",
      provider: undefined,
    });

    const response = await instance.inject({ method: "GET", url: PATH });

    expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });
});

// ---------------------------------------------------------------------------
// GET /market-data/bars — the route (Task 2.9.6), and the response schema
// (Task 2.9.3) now driven through it
// ---------------------------------------------------------------------------
//
// **The six schema tests below used to drive a throwaway route registered
// inside this file, because the real one did not exist. They drive the real one
// now.** A suite that goes on testing a stub path beside a real one is a suite
// whose green tells you about the stub — so the only thing that changed is what
// serves the body, which is the change worth making.
//
// The arrangement is the one that ships: `buildServer()`, the plugin `index.ts`
// registers, the same schema, the same serialiser. What is stubbed is the two
// repositories and the provider, which is what keeps this file inside
// `pnpm verify` — no socket, no database, no network, no credential.

/** Mid-session on Wednesday 2026-09-09; the Tuesday before is an ordinary session. */
const NOW = new Date("2026-09-09T18:00:00.000Z");

/** A whole ordinary session, as an absolute window. 390 minute bars at most. */
const SESSION_START = "2026-09-08T13:30:00.000Z";
const SESSION_END = "2026-09-08T20:00:00.000Z";
const BARS_PATH = `/market-data/bars?symbol=NVDA&timeframe=1m&start=${SESSION_START}&end=${SESSION_END}`;

const RETRIEVED_AT = "2026-09-08T20:05:00.000Z";

const NVDA: Security = {
  symbol: toTicker("NVDA"),
  name: "NVIDIA Corporation",
  exchange: "NASDAQ",
  kind: "equity",
  sector: "technology",
  industry: "Semiconductors",
  status: "active",
  cik: null,
};

/**
 * A stored row, spelled the way the driver hands one over — `numeric` as a
 * string, which is the representation `toBar` exists to convert.
 */
function row(at: string, close: number): DatedBarRow {
  return {
    observed_at: new Date(at),
    open: close.toFixed(6),
    high: close.toFixed(6),
    low: close.toFixed(6),
    close: close.toFixed(6),
    volume: "1000",
    recorded_at: new Date(RETRIEVED_AT),
  };
}

const TWO_ROWS = [
  row("2026-09-08T13:30:00.000Z", 198.5401),
  row("2026-09-08T13:31:00.000Z", 198.22),
] as const;

/** The ledger's statement about what those two rows are part of. */
function ledger(covered: TimeRange, barCount: number): BarCoverage {
  return {
    symbol: toTicker("NVDA"),
    timeframe: "1m",
    covered,
    source: { provider: "alpaca", feed: "sip" },
    barCount,
    updatedAt: new Date(RETRIEVED_AT),
  };
}

const TWO_BAR_LEDGER = ledger(
  toTimeRange(
    new Date("2026-09-08T13:30:00.000Z"),
    new Date("2026-09-08T13:32:00.000Z"),
  ),
  2,
);

interface StoreStub {
  /** Rows the store holds inside the requested window. */
  readonly rows?: readonly DatedBarRow[];
  /** The ledger row, or `undefined` for "we hold nothing for this series". */
  readonly held?: BarCoverage | undefined;
  /** Thrown by `readSeries` instead of answering. */
  readonly fails?: Error;
}

/**
 * A bar store built through the **real** {@link toStoredSeries}.
 *
 * `serve-series.test.ts`'s arrangement, for its reason: a hand-built
 * `BarSeries` would let this suite serialise a series the domain refuses to
 * construct, and every coherence check between the bars, the counts and the
 * coverage would go unexercised at exactly the layer that publishes them.
 * Every other method throws, so a test that reached one is a red test rather
 * than a quiet empty answer.
 */
function stubBars(store: StoreStub): MarketBarsRepository {
  const unused = (name: string) => (): never => {
    throw new Error(`the bars route must not call ${name}.`);
  };

  return {
    readSeries: (symbol, timeframe, requested, now) => {
      if (store.fails !== undefined) return Promise.reject(store.fails);

      const held = store.held;
      return Promise.resolve({
        series: toStoredSeries({
          symbol,
          timeframe,
          requested,
          rows: store.rows ?? [],
          held,
          now,
        }),
        held,
      });
    },
    recordSeries: unused("recordSeries"),
    readBars: unused("readBars"),
    readCoverage: unused("readCoverage"),
    listCoverage: unused("listCoverage"),
    readLastBarDates: unused("readLastBarDates"),
    readLastCloses: unused("readLastCloses"),
  };
}

interface RouteOptions {
  readonly marketData?: MarketData;
  readonly store?: StoreStub;
  /** What the universe answers: a security, or nothing for the 404. */
  readonly security?: Security | undefined;
  /** Thrown by `findSecurity` instead of answering. */
  readonly lookupFails?: Error;
  readonly now?: Date;
  /** Installed as a `preSerialization` hook, for the stripping test. */
  readonly decorate?: (payload: unknown) => unknown;
}

async function barsServer(
  options: RouteOptions = {},
): Promise<FastifyInstance> {
  const instance = buildServer({
    logLevel: "silent",
    logFormat: "json",
    corsOrigin: "http://localhost:5173",
  });

  // `preSerialization` and not `onSend`: the hook has to see the payload as an
  // object, because `onSend` is handed a string that the serialiser has already
  // stripped — which would make the stripping test pass without the stripping.
  if (options.decorate !== undefined) {
    const decorate = options.decorate;
    instance.addHook("preSerialization", (_request, _reply, payload, done) => {
      done(null, decorate(payload));
    });
  }

  // Registered exactly as `index.ts` does it, so this drives the arrangement
  // that ships rather than a convenient one.
  instance.register(
    createMarketDataRoutes({
      marketData: options.marketData ?? {
        selection: "none",
        provider: undefined,
      },
      bars: stubBars(options.store ?? {}),
      securities: {
        findSecurity: () =>
          options.lookupFails !== undefined
            ? Promise.reject(options.lookupFails)
            : Promise.resolve("security" in options ? options.security : NVDA),
      },
      now: () => options.now ?? NOW,
    }),
  );

  await instance.ready();
  app = instance;
  return instance;
}

/** A server holding the two bars and a ledger row that covers them. */
function populatedServer(
  overrides: Partial<RouteOptions> = {},
): Promise<FastifyInstance> {
  return barsServer({
    store: { rows: TWO_ROWS, held: TWO_BAR_LEDGER },
    ...overrides,
  });
}

describe("GET /market-data/bars", () => {
  it("serves the stored series, with its provenance and its coverage", async () => {
    const instance = await populatedServer();

    const response = await instance.inject({ method: "GET", url: BARS_PATH });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toStrictEqual({
      series: {
        symbol: "NVDA",
        timeframe: "1m",
        bars: [
          {
            startsAt: "2026-09-08T13:30:00.000Z",
            open: 198.5401,
            high: 198.5401,
            low: 198.5401,
            close: 198.5401,
            volume: 1000,
          },
          {
            startsAt: "2026-09-08T13:31:00.000Z",
            open: 198.22,
            high: 198.22,
            low: 198.22,
            close: 198.22,
            volume: 1000,
          },
        ],
        provenance: {
          adjustment: "raw",
          sources: [
            {
              provider: "alpaca",
              feed: "sip",
              retrievedAt: RETRIEVED_AT,
              barCount: 2,
            },
          ],
        },
        coverage: {
          requested: { start: SESSION_START, end: SESSION_END },
          covered: {
            start: "2026-09-08T13:30:00.000Z",
            end: "2026-09-08T13:32:00.000Z",
          },
        },
      },
      securityStatus: "active",
    });
  });

  it("carries the correlation id, on the answer and on every failure", async () => {
    const instance = await populatedServer();

    const ok = await instance.inject({ method: "GET", url: BARS_PATH });
    const refused = await instance.inject({
      method: "GET",
      url: "/market-data/bars?symbol=NVDA",
    });

    expect(ok.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    // The id in the *body* is the one a person can copy out of a failure, and
    // it is the same id: the header alone is easy to lose through a client, a
    // screenshot or a paste.
    expect(refused.json<ApiError>().requestId).toBe(
      refused.headers["x-request-id"],
    );
  });
});

// Every row of `MARKET-DATA-API.md` §6's table, in the order the table states
// it. The point of driving them through the real route rather than through
// `parseSeriesRequest` directly is that the *interception* is what is in doubt:
// a request schema, a plugin or a hook can answer a malformed query before the
// handler runs, and the parser's five reasons would then be dead code for
// exactly the inputs they were written for.
describe("the bars route's status table", () => {
  // One case per member of `SERIES_REFUSAL_REASONS`, named by the member, so a
  // reason added without a route test is visible as a shorter list here.
  const REFUSALS: readonly {
    readonly reason: SeriesRefusalReason;
    readonly query: string;
    readonly says: string;
  }[] = [
    {
      reason: "symbol",
      query: "?symbol=NOTATICKER1&timeframe=1m&sessions=1",
      says: "well-formed US equity ticker",
    },
    {
      reason: "timeframe",
      query: "?symbol=NVDA&timeframe=5m&sessions=1",
      says: "is not a timeframe",
    },
    {
      reason: "window",
      query: `?symbol=NVDA&timeframe=1m&start=${SESSION_END}&end=${SESSION_START}`,
      says: "reversed",
    },
    {
      reason: "calendar-range",
      query:
        "?symbol=NVDA&timeframe=1m&start=2019-01-02T14:30:00.000Z&end=2019-01-02T21:00:00.000Z",
      says: "outside the trading calendar",
    },
    {
      reason: "too-large",
      query:
        "?symbol=NVDA&timeframe=1m&start=2026-01-02T14:30:00.000Z&end=2026-09-08T20:00:00.000Z",
      says: "one response carries at most",
    },
  ];

  it.each(REFUSALS)(
    "refuses a bad $reason with a 400 carrying the parser's own message",
    async ({ query, says }) => {
      const instance = await populatedServer();

      const response = await instance.inject({
        method: "GET",
        url: `/market-data/bars${query}`,
      });

      expect(response.statusCode).toBe(400);

      const body = response.json<ApiError>();
      expect(body.code).toBe("BAD_REQUEST");
      // The parser's sentence reached the client rather than Fastify's — which
      // is the assertion that would go red if a `querystring` schema were ever
      // declared on this route, because ajv answers first and answers
      // differently. Measured: it says "must be equal to one of the allowed
      // values" and does not say what they are.
      expect(body.message).toContain(says);
      expect(body.message).not.toContain("querystring");
      expect(body.requestId).toBe(response.headers["x-request-id"]);
    },
  );

  // The repeated key is the case a request schema would rewrite rather than
  // refuse: ajv coerces, and `?symbol=NVDA&symbol=AMD` arrives as an array.
  // `series-request.ts` types every query value `unknown` for exactly this, and
  // this test is what holds that property at the route.
  it("refuses a repeated parameter rather than picking one of the values", async () => {
    const instance = await populatedServer();

    const response = await instance.inject({
      method: "GET",
      url: "/market-data/bars?symbol=NVDA&symbol=AMD&timeframe=1m&sessions=1",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<ApiError>().message).toContain("given more than once");
  });

  it("answers a symbol the universe does not hold with a 404", async () => {
    const instance = await barsServer({ security: undefined });

    const response = await instance.inject({ method: "GET", url: BARS_PATH });

    expect(response.statusCode).toBe(404);

    const body = response.json<ApiError>();
    expect(body.code).toBe("NOT_FOUND");
    expect(body.message).toContain("NVDA");
    // The client's own input comes back; the route it asked for does not. The
    // 404 handler declines to name the route for the same reason and the two
    // agree — see `errors.ts`.
    expect(body.message).not.toContain("/market-data/bars");
  });

  // §6's sentence, and the one this route exists to keep: a 404 is about the
  // security, never about the data. Both empty cases are a 200 with a body, and
  // the body is what makes them tell-apart-able by a person.
  it("answers 200 with an empty series when we hold nothing for the security", async () => {
    const instance = await barsServer({ store: { rows: [], held: undefined } });

    const response = await instance.inject({ method: "GET", url: BARS_PATH });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      series: {
        bars: [],
        coverage: {
          requested: { start: SESSION_START, end: SESSION_END },
          covered: null,
        },
      },
      securityStatus: "active",
    });
  });

  it("answers 200 with an empty series when the window itself holds no bars", async () => {
    // We hold the Tuesday session; the request asks about a window inside it
    // that no bar falls in. A ledger row exists, which is the distinction Task
    // 2.9.4 made available — and it is deliberately not on the wire.
    const instance = await barsServer({
      store: { rows: [], held: TWO_BAR_LEDGER },
    });

    const response = await instance.inject({
      method: "GET",
      url: `/market-data/bars?symbol=NVDA&timeframe=1m&start=2026-09-08T17:00:00.000Z&end=2026-09-08T17:30:00.000Z`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      series: { bars: [], coverage: { covered: null } },
    });
  });

  // The partial answer §36 calls a product state: we hold two minutes of a
  // whole session, and the response says so rather than pretending the window
  // was served.
  it("answers 200 with a covered window narrower than the requested one", async () => {
    const instance = await populatedServer();

    const response = await instance.inject({ method: "GET", url: BARS_PATH });

    const body = response.json<BarSeriesResponse>();
    expect(body.series.coverage.requested).toStrictEqual({
      start: SESSION_START,
      end: SESSION_END,
    });
    expect(body.series.coverage.covered).toStrictEqual({
      start: "2026-09-08T13:30:00.000Z",
      end: "2026-09-08T13:32:00.000Z",
    });
  });

  it("answers 200 with the stored part when the live tail fails", async () => {
    const instance = await populatedServer({
      marketData: {
        selection: "alpaca",
        provider: {
          id: "alpaca",
          feed: "iex",
          fetchBars: () =>
            Promise.resolve({
              outcome: "upstream-unavailable" as const,
              retryable: true,
              message: "alpaca returned 503 for GET /v2/stocks/bars",
            }),
          fetchManyBars: () => {
            throw new Error("the bars route must not batch.");
          },
        },
      },
      now: new Date("2026-09-08T18:00:00.000Z"),
    });

    const response = await instance.inject({ method: "GET", url: BARS_PATH });

    expect(response.statusCode).toBe(200);

    const body = response.json<BarSeriesResponse>();
    expect(body.series.bars).toHaveLength(2);
    // Coverage ends where the store ends, which is the one field a client needs
    // in order to say "displaying data through …".
    expect(body.series.coverage.covered).toStrictEqual({
      start: "2026-09-08T13:30:00.000Z",
      end: "2026-09-08T13:32:00.000Z",
    });
    // The provider's taxonomy is internal and must not reach a client, in any
    // field and at any nesting.
    expect(response.body).not.toContain("upstream-unavailable");
    expect(response.body).not.toContain("alpaca returned 503");
  });

  // The 503, and the assertion that is the whole reason `SERVICE_UNAVAILABLE`
  // and the mapping had to land together: the *code*, not only the status. A
  // 503 raised before the mapping existed serialised cleanly through the right
  // shape carrying `INTERNAL_ERROR`.
  it.each([
    {
      where: "the series read",
      options: { store: { fails: refusedConnection() } },
    },
    {
      where: "the security lookup",
      options: { lookupFails: refusedConnection() },
    },
  ])(
    "answers 503 SERVICE_UNAVAILABLE when the database is unreachable during $where",
    async ({ options }) => {
      const instance = await barsServer(options);

      const response = await instance.inject({ method: "GET", url: BARS_PATH });

      expect(response.statusCode).toBe(503);

      const body = response.json<ApiError>();
      expect(body.code).toBe("SERVICE_UNAVAILABLE");
      expect(body.requestId).toBe(response.headers["x-request-id"]);
      // Never the thrown message: the host, the port and the driver stay in the
      // log record that carries this same id.
      expect(response.body).not.toContain("10.0.0.4");
      expect(response.body).not.toContain("ECONNREFUSED");
      expect(response.body).not.toContain("postgres");
    },
  );

  // The named 500 that arrived with Task 2.9.4: a store holding bars for a
  // window its ledger makes no statement about. It is an inconsistent store
  // rather than a bad request, so it is ours — and it errs to 500 by *not*
  // being recognised by the classifier, which is the direction that decision
  // was taken in.
  it("answers 500 INTERNAL_ERROR when the store's ledger disagrees with its bars", async () => {
    const instance = await barsServer({
      store: { rows: TWO_ROWS, held: undefined },
    });

    const response = await instance.inject({ method: "GET", url: BARS_PATH });

    expect(response.statusCode).toBe(500);

    const body = response.json<ApiError>();
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.message).toBe("An unexpected error occurred.");
    // `MissingCoverageError`'s message is written for a developer and names the
    // symbol, the timeframe and the bar count. None of it is the client's.
    expect(response.body).not.toContain("coverage");
    expect(body.requestId).toBe(response.headers["x-request-id"]);
  });
});

/**
 * A connection error shaped the way `pg` hands one over.
 *
 * Built here rather than imported from a fixture because the property under
 * test is the *shape* the classifier keys on — `code` on an `Error` — and a
 * helper that returned something already recognised would be testing itself.
 */
function refusedConnection(): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error(
    "connect ECONNREFUSED 10.0.0.4:5432 (postgres)",
  );
  error.code = "ECONNREFUSED";
  return error;
}

// The response schema (Task 2.9.3), driven through the real route.
//
// Everything worth asserting about a response schema is a property of the
// **serialised** body, and `fast-json-stringify` is what makes that so: it
// strips every property the schema does not declare and it decides how a null
// is spelled. Neither behaviour is visible in the schema literal, and one of
// them is the whole reason Task 2.9.3 exists.
//
// These six were written against a throwaway route because Task 2.9.6's did not
// exist. Two of them could not simply move: the stripping test needs the
// `preSerialization` hook the harness above installs, and the two-source stitch
// needs Task 2.9.5's live tail rather than a hand-built series. Both are done
// through the route here, which is strictly more than they asserted before.
describe("the GET /market-data/bars response schema", () => {
  it("carries every field of a populated series through the serialiser", async () => {
    const instance = await populatedServer();

    const response = await instance.inject({ method: "GET", url: BARS_PATH });

    expect(response.statusCode).toBe(200);
    // A deep equality against the whole body rather than a field at a time:
    // what this is testing is that nothing was stripped, and a per-field
    // assertion cannot see a field that vanished.
    expect(response.json()).toStrictEqual(
      toBarSeriesResponse(
        toStoredSeries({
          symbol: toTicker("NVDA"),
          timeframe: "1m",
          requested: toTimeRange(
            new Date(SESSION_START),
            new Date(SESSION_END),
          ),
          rows: TWO_ROWS,
          held: TWO_BAR_LEDGER,
          now: NOW,
        }),
        "active",
      ),
    );
  });

  // The assertion Task 2.9.3 turned on, and it is made on the RAW body because
  // `JSON.parse` is exactly what hides the difference: `""` and `null` both
  // parse to something falsy, and only the bytes tell them apart.
  //
  // `coverage.covered` is the field that carries the partial answer. Declared
  // without the `"null"` member of its type union, the serialiser emits a value
  // that is not null — `routes/securities.ts` measured a nullable string
  // reaching the wire as `""` — which would turn "we hold nothing for this
  // symbol" into a covered window a chart would try to draw.
  it("serialises a null covered window as null and not as the empty string", async () => {
    const instance = await barsServer({ store: { rows: [], held: undefined } });

    const response = await instance.inject({ method: "GET", url: BARS_PATH });

    expect(response.body).toContain('"covered":null');
    expect(response.body).not.toContain('"covered":""');
    expect(response.body).not.toContain('"covered":{}');
    // And the key is present rather than dropped, which is the other way this
    // could fail quietly: a client cannot tell "the series is empty" from "this
    // server did not say" if the field is simply absent.
    expect(response.json()).toMatchObject({
      series: { bars: [], coverage: { covered: null } },
    });
  });

  // The empty answer is a 200 with a body, not a 204 and not a 404
  // (`MARKET-DATA-API.md` §6). What makes it informative is that the two facts
  // it still carries survive: the window we asked over, and who we asked.
  it("keeps the requested window and the provenance on an empty series", async () => {
    const instance = await barsServer({ store: { rows: [], held: undefined } });

    const response = await instance.inject({ method: "GET", url: BARS_PATH });

    expect(response.json()).toMatchObject({
      series: {
        coverage: {
          requested: { start: SESSION_START, end: SESSION_END },
        },
        provenance: {
          adjustment: "raw",
          sources: [{ provider: "alpaca", feed: "sip", barCount: 0 }],
        },
      },
    });
  });

  // `MARKET-DATA-API.md` §5's stitch, which is the entire reason `sources` is a
  // list — and it is produced here rather than assembled: the stub provider
  // declares `iex` where the store holds `sip`, and `serveSeries` merges them.
  // §7.1 requires each to be labelled for what it is, so a schema that
  // flattened this to one record would make Story 2.14 unrepresentable.
  it("carries every source of a stitched series, disagreeing feeds included", async () => {
    const tailStart = new Date("2026-09-09T13:30:00.000Z");
    const instance = await barsServer({
      now: new Date("2026-09-09T18:00:00.000Z"),
      store: {
        rows: [row("2026-09-08T13:30:00.000Z", 198.5401)],
        held: ledger(
          toTimeRange(
            new Date("2026-09-08T13:30:00.000Z"),
            new Date("2026-09-09T13:30:00.000Z"),
          ),
          1,
        ),
      },
      marketData: {
        selection: "alpaca",
        provider: {
          id: "alpaca",
          feed: "iex",
          fetchBars: (request) =>
            Promise.resolve({
              outcome: "ok" as const,
              series: toBarSeries({
                symbol: request.symbol,
                timeframe: request.timeframe,
                bars: [
                  {
                    startsAt: tailStart,
                    open: 201,
                    high: 201,
                    low: 201,
                    close: 201,
                    volume: 500,
                  },
                ],
                provenance: toSeriesProvenance("raw", {
                  provider: "alpaca",
                  feed: "iex",
                  retrievedAt: "2026-09-09T18:00:00.000Z",
                  barCount: 1,
                }),
                coverage: {
                  requested: request.range,
                  covered: toTimeRange(
                    tailStart,
                    new Date("2026-09-09T13:31:00.000Z"),
                  ),
                },
              }),
            }),
          fetchManyBars: () => {
            throw new Error("the bars route must not batch.");
          },
        },
      },
    });

    const response = await instance.inject({
      method: "GET",
      url: `/market-data/bars?symbol=NVDA&timeframe=1m&start=2026-09-08T13:30:00.000Z&end=2026-09-09T17:00:00.000Z`,
    });

    const body = response.json<BarSeriesResponse>();
    expect(body.series.provenance.sources.map((one) => one.feed)).toStrictEqual(
      ["sip", "iex"],
    );
    // The counts are what make the record checkable rather than trustworthy:
    // `toBarSeries` asserts they sum to the bars, and a consumer that
    // re-validates gets the same check only if they reach it.
    expect(
      body.series.provenance.sources.map((one) => one.barCount),
    ).toStrictEqual([1, 1]);
    expect(body.series.bars).toHaveLength(2);
  });

  // `MARKET-DATA-API.md` §7: `status` is not filtered on this path, so a series
  // for a security we have stopped tracking is served with its history and says
  // so. A 404 there would be a lie about data we hold. Driven off the *lookup*
  // now rather than off a literal, which is what makes it a test of the rule
  // rather than of the schema's enum.
  it("says when the security is no longer tracked, and still serves its bars", async () => {
    const instance = await populatedServer({
      security: { ...NVDA, status: "untracked" },
    });

    const response = await instance.inject({ method: "GET", url: BARS_PATH });

    expect(response.statusCode).toBe(200);
    expect(response.json<BarSeriesResponse>().securityStatus).toBe("untracked");
    expect(response.json<BarSeriesResponse>().series.bars).toHaveLength(2);
  });

  // The failure the `satisfies` guard exists to prevent, demonstrated rather
  // than described, and now on the **real route's real payload** — which is the
  // half a throwaway route could not show. `fast-json-stringify` strips what the
  // schema does not declare, silently and with a green build, so a field added
  // to a handler and forgotten in the schema does not error: it disappears.
  it("silently strips a field the schema does not declare, at every level", async () => {
    const instance = await populatedServer({
      decorate: (payload) => {
        const body = payload as BarSeriesResponse;
        return {
          ...body,
          // A *declared* field, changed to a value the route would never send.
          // It is what stops this test passing vacuously: without it, a hook
          // that never ran and a serialiser that stripped everything look
          // identical, because nothing else in the response says "gone".
          securityStatus: "untracked",
          unknownOnEnvelope: "gone",
          series: {
            ...body.series,
            unknownOnSeries: "gone",
            coverage: { ...body.series.coverage, unknownOnCoverage: "gone" },
          },
        };
      },
    });

    const response = await instance.inject({ method: "GET", url: BARS_PATH });

    expect(response.body).not.toContain("gone");
    // The hook's payload is what was serialised — so the three undeclared
    // fields really were there to be stripped.
    expect(response.json<BarSeriesResponse>().securityStatus).toBe("untracked");
    expect(response.json<BarSeriesResponse>().series.bars).toHaveLength(2);
  });
});
