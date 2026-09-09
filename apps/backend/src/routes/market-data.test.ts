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
  mergeSeriesProvenance,
  toBarSeries,
  toSeriesProvenance,
  toTicker,
  toTimeRange,
} from "@marketpulse/shared";
import type {
  BarSeries,
  BarSeriesResponse,
  BarSource,
} from "@marketpulse/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { createFixtureProvider } from "../fixture-provider.js";
import type { MarketData } from "../market-data.js";
import { resolveMarketData } from "../market-data.js";
import { loadConfig } from "../config.js";
import { buildServer } from "../server.js";
import {
  barSeriesResponseSchema,
  createMarketDataRoutes,
} from "./market-data.js";

const PATH = "/market-data";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function serverWith(marketData: MarketData): Promise<FastifyInstance> {
  const instance = buildServer({
    logLevel: "silent",
    logFormat: "json",
    corsOrigin: "http://localhost:5173",
  });

  // Registered here exactly as `index.ts` does it, so this drives the
  // arrangement that ships rather than a convenient one.
  instance.register(createMarketDataRoutes(marketData));

  await instance.ready();
  app = instance;
  return instance;
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

// The bar-series response schema (Task 2.9.3), driven through the serialiser
// rather than inspected as an object.
//
// Everything worth asserting about a response schema is a property of the
// **serialised** body, and `fast-json-stringify` is what makes that so: it
// strips every property the schema does not declare and it decides how a null
// is spelled. Neither behaviour is visible in the schema literal, and one of
// them is the whole reason this task exists.
//
// The route this schema belongs to is Task 2.9.6's and does not exist yet, so
// these register it on a throwaway path. That is the smallest thing that
// exercises the real mechanism: the same Fastify, the same serialiser, the same
// schema object the route will be given. No socket, no database, no network.
describe("the GET /market-data/bars response schema", () => {
  async function serveSchema(body: unknown): Promise<FastifyInstance> {
    const instance = buildServer({
      logLevel: "silent",
      logFormat: "json",
      corsOrigin: "http://localhost:5173",
    });

    instance.get("/probe", { schema: barSeriesResponseSchema }, async () =>
      Promise.resolve(body),
    );

    await instance.ready();
    app = instance;
    return instance;
  }

  const RETRIEVED_AT = "2026-09-05T00:14:22.000Z";

  function source(overrides: Partial<BarSource> = {}): BarSource {
    return {
      provider: "alpaca",
      feed: "sip",
      retrievedAt: RETRIEVED_AT,
      barCount: 2,
      ...overrides,
    };
  }

  // A response built the way the read path will build one: through the domain
  // constructors, so every coherence check `toBarSeries` performs has actually
  // run over the values being serialised. A hand-written literal would pass
  // this test while describing a series the domain refuses to construct.
  function responseFor(series: BarSeries): BarSeriesResponse {
    return {
      series: {
        symbol: series.symbol,
        timeframe: series.timeframe,
        bars: series.bars.map((bar) => ({
          startsAt: bar.startsAt.toISOString(),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume,
        })),
        provenance: {
          adjustment: series.provenance.adjustment,
          sources: series.provenance.sources,
        },
        coverage: {
          requested: {
            start: series.coverage.requested.start.toISOString(),
            end: series.coverage.requested.end.toISOString(),
          },
          covered:
            series.coverage.covered === null
              ? null
              : {
                  start: series.coverage.covered.start.toISOString(),
                  end: series.coverage.covered.end.toISOString(),
                },
        },
      },
      securityStatus: "active",
    };
  }

  const REQUESTED = toTimeRange(
    new Date("2026-09-04T13:30:00.000Z"),
    new Date("2026-09-04T20:00:00.000Z"),
  );

  const TWO_BARS = [
    {
      startsAt: new Date("2026-09-04T13:30:00.000Z"),
      open: 197.69,
      high: 198.78,
      low: 196.85,
      close: 198.5401,
      volume: 2315350,
    },
    {
      startsAt: new Date("2026-09-04T13:31:00.000Z"),
      open: 198.54,
      high: 198.9,
      low: 198.1,
      close: 198.22,
      volume: 411208,
    },
  ] as const;

  function populatedSeries(): BarSeries {
    return toBarSeries({
      symbol: toTicker("NVDA"),
      timeframe: "1m",
      bars: TWO_BARS,
      provenance: toSeriesProvenance("raw", source()),
      coverage: {
        requested: REQUESTED,
        covered: toTimeRange(
          new Date("2026-09-04T13:30:00.000Z"),
          new Date("2026-09-04T13:32:00.000Z"),
        ),
      },
    });
  }

  it("carries every field of a populated series through the serialiser", async () => {
    const body = responseFor(populatedSeries());
    const instance = await serveSchema(body);

    const response = await instance.inject({ method: "GET", url: "/probe" });

    expect(response.statusCode).toBe(200);
    // A deep equality against the whole body rather than a field at a time:
    // what this is testing is that nothing was stripped, and a per-field
    // assertion cannot see a field that vanished.
    expect(response.json()).toEqual(body);
  });

  // The assertion this task turns on, and it is made on the RAW body because
  // `JSON.parse` is exactly what hides the difference: `""` and `null` both
  // parse to something falsy, and only the bytes tell them apart.
  //
  // `coverage.covered` is the field that carries the partial answer. Declared
  // without the `"null"` member of its type union, the serialiser emits a value
  // that is not null — `routes/securities.ts` measured a nullable string
  // reaching the wire as `""` — which would turn "we hold nothing for this
  // symbol" into a covered window a chart would try to draw.
  it("serialises a null covered window as null and not as the empty string", async () => {
    const empty = toBarSeries({
      symbol: toTicker("NVDA"),
      timeframe: "1m",
      bars: [],
      provenance: toSeriesProvenance("raw", source({ barCount: 0 })),
      coverage: { requested: REQUESTED, covered: null },
    });

    const instance = await serveSchema(responseFor(empty));

    const response = await instance.inject({ method: "GET", url: "/probe" });

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
    const empty = toBarSeries({
      symbol: toTicker("NVDA"),
      timeframe: "1m",
      bars: [],
      provenance: toSeriesProvenance("raw", source({ barCount: 0 })),
      coverage: { requested: REQUESTED, covered: null },
    });

    const instance = await serveSchema(responseFor(empty));

    const response = await instance.inject({ method: "GET", url: "/probe" });

    expect(response.json()).toMatchObject({
      series: {
        coverage: {
          requested: {
            start: "2026-09-04T13:30:00.000Z",
            end: "2026-09-04T20:00:00.000Z",
          },
        },
        provenance: {
          adjustment: "raw",
          sources: [{ provider: "alpaca", feed: "sip", barCount: 0 }],
        },
      },
    });
  });

  // `MARKET-DATA-API.md` §5's stitch, which is the entire reason `sources` is a
  // list. Today both parts of a stitched series report `sip` and the seam is
  // invisible; when Epic 3's live tail lands the same series carries `sip` and
  // `iex`, and §7.1 requires each to be labelled for what it is. A schema that
  // flattened this to one record would make that unrepresentable, so it is
  // asserted here rather than left to the task that first produces one.
  it("carries every source of a stitched series, disagreeing feeds included", async () => {
    const stitched = toBarSeries({
      symbol: toTicker("NVDA"),
      timeframe: "1m",
      bars: TWO_BARS,
      provenance: mergeSeriesProvenance(
        toSeriesProvenance("raw", source({ feed: "sip", barCount: 1 })),
        toSeriesProvenance("raw", source({ feed: "iex", barCount: 1 })),
      ),
      coverage: {
        requested: REQUESTED,
        covered: toTimeRange(
          new Date("2026-09-04T13:30:00.000Z"),
          new Date("2026-09-04T13:32:00.000Z"),
        ),
      },
    });

    const instance = await serveSchema(responseFor(stitched));

    const response = await instance.inject({ method: "GET", url: "/probe" });

    const body = response.json<BarSeriesResponse>();
    expect(body.series.provenance.sources.map((one) => one.feed)).toEqual([
      "sip",
      "iex",
    ]);
    // The counts are what make the record checkable rather than trustworthy:
    // `toBarSeries` asserts they sum to the bars, and a consumer that
    // re-validates gets the same check only if they reach it.
    expect(body.series.provenance.sources.map((one) => one.barCount)).toEqual([
      1, 1,
    ]);
  });

  // `MARKET-DATA-API.md` §7: `status` is not filtered on this path, so a series
  // for a security we have stopped tracking is served with its history and says
  // so. A 404 there would be a lie about data we hold.
  it("says when the security is no longer tracked", async () => {
    const instance = await serveSchema({
      ...responseFor(populatedSeries()),
      securityStatus: "untracked",
    });

    const response = await instance.inject({ method: "GET", url: "/probe" });

    expect(response.json()).toMatchObject({ securityStatus: "untracked" });
  });

  // The failure the `satisfies` guard exists to prevent, demonstrated rather
  // than described. `fast-json-stringify` strips what the schema does not
  // declare, silently and with a green build — so a field added to an interface
  // and forgotten in the schema does not error, it disappears. This is what a
  // consumer would see, and it is why the guard is applied once per nested
  // shape rather than once per response.
  it("silently strips a field the schema does not declare, at every level", async () => {
    const populated = responseFor(populatedSeries());
    const instance = await serveSchema({
      ...populated,
      unknownOnEnvelope: "gone",
      series: {
        ...populated.series,
        unknownOnSeries: "gone",
        coverage: { ...populated.series.coverage, unknownOnCoverage: "gone" },
      },
    });

    const response = await instance.inject({ method: "GET", url: "/probe" });

    expect(response.body).not.toContain("gone");
    expect(response.json()).toEqual(populated);
  });
});
