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

import { isMarketDataResponse } from "@marketpulse/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { createFixtureProvider } from "../fixture-provider.js";
import type { MarketData } from "../market-data.js";
import { resolveMarketData } from "../market-data.js";
import { loadConfig } from "../config.js";
import { buildServer } from "../server.js";
import { createMarketDataRoutes } from "./market-data.js";

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
