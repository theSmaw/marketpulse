import {
  MARKET_STREAM_PATH,
  toTicker,
  toWireObservation,
} from "@marketpulse/shared";
import { WebSocket as WsWebSocket } from "ws";
import { afterEach, describe, expect, it } from "vitest";

import { registerMarketGateway } from "./market-gateway.js";
import { buildServer } from "./server.js";

import type { FastifyInstance } from "fastify";
import type { Bar, WireObservation } from "@marketpulse/shared";
import type { LiveObservation } from "./market-data-stream.js";
import type { MarketGateway } from "./market-gateway.js";

// **The hole Task 3.5.2's sweep found, closed here** (Task 3.5.4).
//
// Nothing at any level asserted that an observation published to the gateway
// reaches an attached browser. `market-gateway.test.ts` tests the **codec** —
// it encodes and decodes message shapes and never constructs a gateway or
// attaches a socket. The process suite attached a browser but asserted only the
// snapshot's ARRIVAL and the shutdown farewell. And the browser spec
// `security-price-motion.spec.ts` serves the socket **from the test**, so it
// exercises the frontend rather than this gateway.
//
// That is the same family as the four already recorded — *something that exists
// in one layer and cannot be reached from the next* — and 3.5.2 turned the path
// into a public method with no direct caller in any test.
//
// **It lives in the PROCESS suite because it opens a socket.** `pnpm test` is
// "no build, no socket, no database, no network" by contract, and a real
// `WebSocketServer` on loopback is a socket however local it is.

const NVDA = toTicker("NVDA");
const AAPL = toTicker("AAPL");

const bar = (startsAt: string, close: number): Bar => ({
  startsAt: new Date(startsAt),
  open: close,
  high: close,
  low: close,
  close,
  volume: 5184,
});

const observation = (startsAt: string, close: number): LiveObservation => ({
  symbol: NVDA,
  bar: bar(startsAt, close),
  source: {
    provider: "alpaca",
    feed: "iex",
    retrievedAt: "2026-09-16T14:02:00.000Z",
    barCount: 1,
  },
  supersedes: false,
});

interface Attached {
  readonly app: FastifyInstance;
  readonly gateway: MarketGateway;
  readonly socket: WsWebSocket;
  readonly received: { type: string; observations?: Record<string, unknown> }[];
  waitFor: (type: string) => Promise<void>;
}

let open: Attached | undefined;

afterEach(async () => {
  open?.socket.close();
  await open?.gateway.close();
  await open?.app.close();
  open = undefined;
});

/** A listening server, a registered gateway, and one attached browser. */
async function attach(
  snapshot: ReadonlyMap<string, WireObservation> = new Map(),
): Promise<Attached> {
  const app = buildServer({
    logLevel: "silent",
    logFormat: "json",
    corsOrigin: "http://localhost:5173",
  });

  const gateway = registerMarketGateway(app, {
    snapshot: () => snapshot,
    feedState: () => ({ status: "live", feed: "iex", marketOpen: true }),
  });

  await app.listen({ port: 0, host: "127.0.0.1" });
  const address = app.server.address();
  if (address === null || typeof address === "string") {
    throw new Error("the server did not bind a port");
  }

  const received: { type: string; observations?: Record<string, unknown> }[] =
    [];
  const socket = new WsWebSocket(
    `ws://127.0.0.1:${String(address.port)}${MARKET_STREAM_PATH}`,
  );

  socket.on("message", (data: Buffer) => {
    received.push(
      JSON.parse(data.toString("utf8")) as {
        type: string;
        observations?: Record<string, unknown>;
      },
    );
  });

  const waitFor = async (type: string): Promise<void> => {
    const deadline = Date.now() + 5_000;
    for (;;) {
      if (received.some((message) => message.type === type)) return;
      if (Date.now() > deadline) {
        throw new Error(
          `no ${type} message within 5 s; got ${JSON.stringify(
            received.map((message) => message.type),
          )}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  };

  await new Promise<void>((resolve, reject) => {
    socket.once("open", () => {
      resolve();
    });
    socket.once("error", reject);
  });

  const attached = { app, gateway, socket, received, waitFor };
  open = attached;
  return attached;
}

describe("an observation published to the gateway reaches an attached browser", () => {
  it("delivers a bar down a real socket", async () => {
    const a = await attach();
    await a.waitFor("snapshot");

    a.gateway.publishObservations([
      observation("2026-09-16T14:01:00Z", 214.75),
    ]);
    await a.waitFor("bars");

    const bars = a.received.find((message) => message.type === "bars");
    expect(bars?.observations).toBeDefined();
    expect(Object.keys(bars?.observations ?? {})).toEqual(["NVDA"]);
  });

  it("sends the snapshot FIRST, and it carries what the process holds", async () => {
    // Task 3.5.4's own deliverable: a browser that connects to a process which
    // has observed bars is correct on its **first frame**, rather than showing
    // the stored close and changing all three of its lines a minute later.
    const a = await attach(
      new Map([
        ["NVDA", toWireObservation(bar("2026-09-16T14:01:00Z", 214.75))],
      ]),
    );
    await a.waitFor("snapshot");

    const first = a.received[0];
    expect(first?.type).toBe("snapshot");
    expect(Object.keys(first?.observations ?? {})).toEqual(["NVDA"]);
  });

  it("sends an EMPTY snapshot when the process has observed nothing", async () => {
    // §11.1: `{}` after a restart is the TRUE answer rather than a degraded
    // one, so filling the snapshot must not turn it into an error path.
    const a = await attach();
    await a.waitFor("snapshot");

    expect(a.received[0]?.type).toBe("snapshot");
    expect(a.received[0]?.observations).toEqual({});
  });

  it("omits an unobserved security rather than sending it empty", async () => {
    // §11.1's omission semantics, on the wire rather than in the map.
    const a = await attach(
      new Map([
        ["NVDA", toWireObservation(bar("2026-09-16T14:01:00Z", 214.75))],
      ]),
    );
    await a.waitFor("snapshot");

    expect(a.received[0]?.observations).not.toHaveProperty(AAPL);
  });

  it("publishes nothing when there is nothing to publish", async () => {
    // An empty batch must not become an empty `bars` message: a browser that
    // received one would have to decide what *no observations* means, and the
    // answer is that it should never have been asked.
    const a = await attach();
    await a.waitFor("snapshot");

    a.gateway.publishObservations([]);
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(a.received.some((message) => message.type === "bars")).toBe(false);
  });
});
