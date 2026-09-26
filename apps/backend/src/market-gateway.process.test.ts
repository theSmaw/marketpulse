import {
  MARKET_STREAM_CLOSE,
  MARKET_STREAM_PATH,
  MARKET_STREAM_PROTOCOL_VERSION,
  encodeMarketStreamClientMessage,
  toTicker,
  toWireObservation,
} from "@marketpulse/shared";
import { WebSocket as WsWebSocket } from "ws";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MAX_BUFFERED_BYTES,
  SLOW_CLIENT_CLOSE_CODE,
  registerMarketGateway,
} from "./market-gateway.js";
import { buildServer } from "./server.js";

import type { FastifyInstance } from "fastify";
import type {
  Bar,
  WireMarketOverview,
  WireObservation,
} from "@marketpulse/shared";
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

/** The aggregate an unwired test does not care about. Empty is a true state. */
const EMPTY_OVERVIEW: WireMarketOverview = {
  computedAt: "2026-09-26T14:02:00.000Z",
  feeds: [],
  figures: [],
};

interface ReceivedFrame {
  type: string;
  sentAt?: string;
  observations?: Record<string, unknown>;
  overview?: Record<string, unknown>;
}

interface Client {
  readonly socket: WsWebSocket;
  readonly received: ReceivedFrame[];
  waitFor: (type: string) => Promise<void>;
  /** Wait for the Nth message of a type — see the note on the implementation. */
  waitForCount: (type: string, count: number) => Promise<void>;
}

interface Attached extends Client {
  readonly app: FastifyInstance;
  readonly gateway: MarketGateway;
  /** Attach another browser to the SAME gateway — Task 3.5.6 needs two. */
  join: () => Promise<Client>;
}

let open: Attached | undefined;
const extra: WsWebSocket[] = [];

afterEach(async () => {
  // **`terminate` rather than `close`, and that is the backpressure tests'
  // doing.** A client whose socket has been paused never completes a graceful
  // close — the handshake needs a read that is not happening — so a `close()`
  // here hangs the hook for the full 30 s timeout and reports it as the test
  // failing. `terminate` drops the TCP connection, which is what a torn-down
  // fixture wants anyway.
  for (const socket of extra.splice(0)) socket.terminate();
  open?.socket.terminate();
  await open?.gateway.close();
  await open?.app.close();
  open = undefined;
});

/** Connect one browser to a listening gateway and collect what it is sent. */
async function connectClient(port: number): Promise<Client> {
  const received: ReceivedFrame[] = [];
  const socket = new WsWebSocket(
    `ws://127.0.0.1:${String(port)}${MARKET_STREAM_PATH}`,
  );

  socket.on("message", (data: Buffer) => {
    received.push(JSON.parse(data.toString("utf8")) as ReceivedFrame);
  });

  /**
   * **Counts rather than checks presence**, and that is not a nicety.
   *
   * The first draft waited for *a* snapshot, which the INITIAL snapshot
   * already satisfied — so a test that subscribed and then waited raced the
   * server and published before the subscription had been processed. The
   * failure read as a broken filter. Counting makes *the next one* sayable.
   */
  const waitForCount = async (type: string, count: number): Promise<void> => {
    const deadline = Date.now() + 5_000;
    for (;;) {
      if (received.filter((message) => message.type === type).length >= count) {
        return;
      }
      if (Date.now() > deadline) {
        throw new Error(
          `fewer than ${String(count)} ${type} messages within 5 s; got ${JSON.stringify(
            received.map((message) => message.type),
          )}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  };

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

  return { socket, received, waitFor, waitForCount };
}

/** A listening server, a registered gateway, and one attached browser. */
async function attach(
  snapshot: ReadonlyMap<string, WireObservation> = new Map(),
  wallNow?: () => number,
  overview: () => WireMarketOverview = () => EMPTY_OVERVIEW,
): Promise<Attached> {
  const app = buildServer({
    logLevel: "silent",
    logFormat: "json",
    corsOrigin: "http://localhost:5173",
  });

  const gateway = registerMarketGateway(app, {
    snapshot: () => snapshot,
    feedState: () => ({ status: "live", feed: "iex", marketOpen: true }),
    overview,
    // `exactOptionalPropertyTypes`: absent and `undefined` are different types.
    ...(wallNow === undefined ? {} : { wallNow }),
  });

  await app.listen({ port: 0, host: "127.0.0.1" });
  const address = app.server.address();
  if (address === null || typeof address === "string") {
    throw new Error("the server did not bind a port");
  }
  const { port } = address;

  const first = await connectClient(port);

  const attached: Attached = {
    ...first,
    app,
    gateway,
    join: async () => {
      const client = await connectClient(port);
      extra.push(client.socket);
      return client;
    },
  };

  open = attached;
  return attached;
}

describe("an observation published to the gateway reaches an attached browser", () => {
  it("delivers a bar down a real socket", async () => {
    // **This test needed a `subscribe` added by Task 3.5.6**, and it was not a
    // bad test: until then a browser received everything without asking, so
    // *attach and wait* was the whole protocol. Scoping the fan-out made
    // "asked for nothing" mean "receives nothing" — which is the task — and
    // this assertion encoded the old contract.
    const a = await attach();
    await a.waitFor("snapshot");

    a.socket.send(
      encodeMarketStreamClientMessage({
        type: "subscribe",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        symbols: ["NVDA"],
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 60));

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

    // **The FIRST snapshot is empty since Task 3.5.6**, because nothing has
    // been asked for yet — §11.1's omission semantics applied to a
    // subscription. This test was written before the fan-out was scoped, when
    // *attach and wait* was the whole protocol; it was not a bad test, it
    // encoded the contract of its day.
    expect(a.received[0]?.type).toBe("snapshot");

    a.socket.send(
      encodeMarketStreamClientMessage({
        type: "subscribe",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        symbols: ["NVDA"],
      }),
    );
    await a.waitForCount("snapshot", 2);

    const reply = a.received.filter((m) => m.type === "snapshot").at(-1);
    expect(Object.keys(reply?.observations ?? {})).toEqual(["NVDA"]);
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

describe("a browser receives only what it asked for (Task 3.5.6)", () => {
  /**
   * 200 well-formed tickers — a size where a filter shows.
   *
   * **The task's own warning made concrete:** every question here has a wrong
   * answer that works perfectly for one security, and a test with three
   * symbols passes against a `broadcast()` that ignores the filter entirely.
   *
   * Generated rather than typed, and **well-formed** rather than `SYM0`:
   * `toTicker` validates the shape, so a made-up-looking symbol throws before
   * it can test anything.
   */
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const MANY = Array.from({ length: 200 }, (_unused, i) => {
    const first = LETTERS[Math.floor(i / 26) % 26] ?? "A";
    const second = LETTERS[i % 26] ?? "A";
    return `Z${first}${second}`;
  });
  const ONE_OF_MANY = MANY[7] ?? "ZAH";

  const observationsFor = (symbols: readonly string[]) =>
    symbols.map((symbol) => ({
      symbol: toTicker(symbol),
      bar: bar("2026-09-16T14:01:00Z", 100),
      source: {
        provider: "alpaca" as const,
        feed: "iex" as const,
        retrievedAt: "2026-09-16T14:02:00.000Z",
        barCount: 1,
      },
      supersedes: false,
    }));

  const subscribe = (a: Client, symbols: readonly string[]): void => {
    a.socket.send(
      encodeMarketStreamClientMessage({
        type: "subscribe",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        symbols,
      }),
    );
  };

  it("sends one client its symbol while another gets the universe, at once", async () => {
    // **Criterion 1 and 2 together, and the size is the point.** The task's own
    // warning: every question here has a wrong answer that works perfectly for
    // one security, and a test with three symbols passes against a
    // `broadcast()` that ignores the filter entirely. 200 is a size where the
    // right answer and the wrong one are different bytes.
    const narrow = await attach();
    await narrow.waitFor("snapshot");
    const wide = await narrow.join();
    await wide.waitFor("snapshot");

    subscribe(narrow, [ONE_OF_MANY]);
    subscribe(wide, MANY);

    // The SECOND snapshot each — the reply to the subscribe, not the empty one
    // sent on connect. Publishing before that has landed races the server.
    await narrow.waitForCount("snapshot", 2);
    await wide.waitForCount("snapshot", 2);

    narrow.received.length = 0;
    wide.received.length = 0;

    narrow.gateway.publishObservations(observationsFor(MANY));
    await narrow.waitFor("bars");
    await wide.waitFor("bars");

    const narrowBars = narrow.received.find((m) => m.type === "bars");
    const wideBars = wide.received.find((m) => m.type === "bars");

    expect(Object.keys(narrowBars?.observations ?? {})).toEqual([ONE_OF_MANY]);
    expect(Object.keys(wideBars?.observations ?? {})).toHaveLength(MANY.length);
  });

  it("sends a client that has asked for nothing NOTHING, and that is not an error", async () => {
    // §11.1's omission semantics applied to a subscription. It is also the
    // state every browser is in for the first moments of every connection,
    // including each reconnect.
    const a = await attach();
    await a.waitFor("snapshot");
    a.received.length = 0;

    a.gateway.publishObservations(observationsFor(MANY));
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(a.received.some((m) => m.type === "bars")).toBe(false);
    expect(a.socket.readyState).toBe(a.socket.OPEN);
  });

  it("answers a LATE subscribe with a snapshot rather than bars", async () => {
    // **Task 3.5.4's rule, on the door this task opens.** A snapshot sets the
    // arrival mark's baseline; `bars` fires it. Answering a subscribe with
    // `bars` would mark every newly subscribed security — on every subscribe
    // and, since Task 3.5.5, on every reconnect.
    const a = await attach(
      new Map([
        ["ZAH", toWireObservation(bar("2026-09-16T14:01:00Z", 214.75))],
      ]),
    );
    await a.waitFor("snapshot");
    expect(a.received[0]?.observations).toEqual({});

    subscribe(a, ["ZAH"]);
    await a.waitForCount("snapshot", 2);

    const reply = a.received.filter((m) => m.type === "snapshot").at(-1);
    expect(reply?.type).toBe("snapshot");
    expect(Object.keys(reply?.observations ?? {})).toEqual(["ZAH"]);
  });

  it("scopes the snapshot too, omitting what was not asked for", async () => {
    const a = await attach(
      new Map([
        ["ZAH", toWireObservation(bar("2026-09-16T14:01:00Z", 1))],
        ["ZAI", toWireObservation(bar("2026-09-16T14:01:00Z", 2))],
      ]),
    );
    await a.waitFor("snapshot");

    subscribe(a, ["ZAH"]);
    await a.waitForCount("snapshot", 2);

    const scoped = a.received.filter((m) => m.type === "snapshot").at(-1);
    expect(Object.keys(scoped?.observations ?? {})).toEqual(["ZAH"]);
  });

  it("survives a malformed subscribe rather than dropping the browser", async () => {
    // §36: one bad frame from one browser must not take down a gateway serving
    // every other browser, and there is no honest reply to a message we could
    // not read.
    const a = await attach();
    await a.waitFor("snapshot");

    a.socket.send("{not json");
    a.socket.send(JSON.stringify({ type: "subscribe", version: 99 }));
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(a.socket.readyState).toBe(a.socket.OPEN);

    // And it still works afterwards.
    subscribe(a, ["ZAH"]);
    await a.waitForCount("snapshot", 2);
    expect(
      a.received.filter((m) => m.type === "snapshot").at(-1),
    ).toBeDefined();
  });
});

describe("a slow browser is dropped rather than tolerated (Task 3.5.7)", () => {
  // **The failure this prevents is the hardest kind to find later** — a memory
  // leak that only appears on a slow connection during a busy session.
  // Measured on 2026-09-21 against a client that stops reading: the outbound
  // buffer grows by one payload per batch, WITHOUT BOUND — 5.1 MB at 100
  // batches and 33.6 MB at 600.
  //
  // The apparatus is the test: a client that connects, subscribes and then
  // stops reading. `pause()` on the underlying socket is what "stops reading"
  // means in Node — the kernel receive buffer fills, TCP flow control stops
  // the server, and the server's own buffer is what grows.

  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const UNIVERSE = Array.from({ length: 518 }, (_unused, i) => {
    const first = LETTERS[Math.floor(i / 26) % 26] ?? "A";
    const second = LETTERS[i % 26] ?? "A";
    return `Z${first}${second}`;
  });

  const universeObservations = () =>
    UNIVERSE.map((symbol) => ({
      symbol: toTicker(symbol),
      bar: bar("2026-09-16T14:01:00Z", 100),
      source: {
        provider: "alpaca" as const,
        feed: "iex" as const,
        retrievedAt: "2026-09-16T14:02:00.000Z",
        barCount: 1,
      },
      supersedes: false,
    }));

  const subscribeAll = (client: Client): void => {
    client.socket.send(
      encodeMarketStreamClientMessage({
        type: "subscribe",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        symbols: UNIVERSE,
      }),
    );
  };

  /** Stop reading, as a browser on a stalled connection does. */
  const stopReading = (client: Client): void => {
    const underlying = (
      client.socket as unknown as { _socket?: { pause: () => void } }
    )._socket;
    if (underlying === undefined) throw new Error("no underlying socket");
    underlying.pause();
  };

  it("drops a client that stops reading, rather than queueing for it", async () => {
    const a = await attach();
    await a.waitFor("snapshot");
    subscribeAll(a);
    await a.waitForCount("snapshot", 2);

    stopReading(a);

    // Publish until the threshold is crossed. The bound is generous rather
    // than tight: what is asserted is that it stops, not how fast.
    const observations = universeObservations();
    for (
      let batch = 0;
      batch < 400 && a.gateway.clientCount() > 0;
      batch += 1
    ) {
      a.gateway.publishObservations(observations);
      if (batch % 25 === 0) await new Promise((r) => setTimeout(r, 5));
    }

    expect(a.gateway.clientCount()).toBe(0);
  });

  it("leaves a HEALTHY client on the same process untouched", async () => {
    // **Criterion 4, and the reason it is separate.** *We dropped everybody*
    // also satisfies a naive reading of "the slow one was dropped".
    const slow = await attach();
    await slow.waitFor("snapshot");
    const healthy = await slow.join();
    await healthy.waitFor("snapshot");

    subscribeAll(slow);
    subscribeAll(healthy);
    await slow.waitForCount("snapshot", 2);
    await healthy.waitForCount("snapshot", 2);

    stopReading(slow);

    const observations = universeObservations();
    for (
      let batch = 0;
      batch < 400 && slow.gateway.clientCount() > 1;
      batch += 1
    ) {
      slow.gateway.publishObservations(observations);
      if (batch % 25 === 0) await new Promise((r) => setTimeout(r, 5));
    }

    // One attached, and it is the reader.
    expect(slow.gateway.clientCount()).toBe(1);
    expect(healthy.socket.readyState).toBe(healthy.socket.OPEN);

    // And it is still being served — not merely still connected.
    healthy.received.length = 0;
    slow.gateway.publishObservations(observations);
    await healthy.waitFor("bars");
  });

  it("closes with a code that is NOT `going away`", () => {
    // **`goingAway` would produce a tight loop**: the browser reads it as
    // *they are redeploying* and returns in 500 ms — still slow, dropped
    // again, all afternoon.
    //
    // The other half of this — that the browser actually backs off on it —
    // is asserted in `reconnect-policy.test.ts`, because that is where the
    // interpretation lives. Both ends read `MARKET_STREAM_CLOSE`, which is
    // what stops them disagreeing.
    expect(SLOW_CLIENT_CLOSE_CODE).toBe(MARKET_STREAM_CLOSE.slowClient);
    expect(SLOW_CLIENT_CLOSE_CODE).not.toBe(MARKET_STREAM_CLOSE.goingAway);
  });

  it("has a threshold clear of what the kernel absorbs on its own", () => {
    // **The measurement that decides the constant.** The kernel absorbed
    // ~557 KiB before `bufferedAmount` moved at all, so a threshold below that
    // would never fire on loopback — a check that silently does nothing, which
    // this repository has shipped before.
    expect(MAX_BUFFERED_BYTES).toBeGreaterThan(600 * 1024);
  });
});

describe("every frame is stamped from the gateway's clock at the send (Task 3.6.4)", () => {
  // **The instrument `docs/GAPS.md` entry 12 said did not exist.** §28's clock
  // starts at *server-received* and until this field nothing on the wire said
  // when the server did anything. These hold the two properties a browser's
  // subtraction depends on: the stamp is on every frame, and it is read from
  // THIS process's clock at the moment of the send — which is only assertable
  // because the clock is a seam.
  //
  // `pnpm break the-gateway-stamps-nothing` replaces the stamp with a constant
  // and proves the first of these goes red.

  it("stamps the snapshot and the bars from the injected clock", async () => {
    let now = Date.parse("2026-09-16T14:02:00.500Z");
    const a = await attach(new Map(), () => now);
    await a.waitFor("snapshot");

    expect(a.received[0]?.sentAt).toBe("2026-09-16T14:02:00.500Z");

    now += 250;
    a.socket.send(
      encodeMarketStreamClientMessage({
        type: "subscribe",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        symbols: ["NVDA"],
      }),
    );
    await a.waitForCount("snapshot", 2);

    now += 250;
    a.gateway.publishObservations([
      observation("2026-09-16T14:01:00Z", 214.75),
    ]);
    await a.waitFor("bars");

    // **The overview frames were added to this expectation on 2026-09-26**
    // (Task 4.2.4) rather than filtered out of it, because the list is also
    // the record of what a browser receives and in what order: one aggregate
    // beside each snapshot, and one ahead of each batch of bars. Every one of
    // them carries the same stamp as the frame it accompanies, from this
    // clock, at its own send.
    const stamps = a.received.map((m) => [m.type, m.sentAt]);
    expect(stamps).toEqual([
      ["snapshot", "2026-09-16T14:02:00.500Z"],
      ["overview", "2026-09-16T14:02:00.500Z"],
      ["snapshot", "2026-09-16T14:02:00.750Z"],
      ["overview", "2026-09-16T14:02:00.750Z"],
      ["overview", "2026-09-16T14:02:01.000Z"],
      ["bars", "2026-09-16T14:02:01.000Z"],
    ]);
  });

  it("stamps per SEND rather than once per publish, so each client's stamp is its own", async () => {
    // `publishObservations` encodes one payload per client. A single reading
    // shared across the loop would put every client after the first on an
    // instant that predates its own send — small today, and exactly the kind
    // of error a distribution over many clients would quietly absorb.
    let now = Date.parse("2026-09-16T14:02:00.000Z");
    const a = await attach(new Map(), () => {
      now += 1;
      return now;
    });
    const b = await a.join();
    await a.waitFor("snapshot");
    await b.waitFor("snapshot");

    for (const client of [a, b]) {
      client.socket.send(
        encodeMarketStreamClientMessage({
          type: "subscribe",
          version: MARKET_STREAM_PROTOCOL_VERSION,
          symbols: ["NVDA"],
        }),
      );
    }
    await a.waitForCount("snapshot", 2);
    await b.waitForCount("snapshot", 2);

    a.gateway.publishObservations([
      observation("2026-09-16T14:01:00Z", 214.75),
    ]);
    await a.waitFor("bars");
    await b.waitFor("bars");

    const stampA = a.received.find((m) => m.type === "bars")?.sentAt;
    const stampB = b.received.find((m) => m.type === "bars")?.sentAt;
    expect(stampA).toBeDefined();
    expect(stampB).toBeDefined();
    expect(stampA).not.toBe(stampB);
  });
});

describe("the overview frame, over a real socket (Task 4.2.4)", () => {
  /** A copy of the helper in the subscription block, which is block-scoped. */
  const subscribe = (client: Client, symbols: readonly string[]): void => {
    client.socket.send(
      encodeMarketStreamClientMessage({
        type: "subscribe",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        symbols,
      }),
    );
  };

  const figures: WireMarketOverview = {
    computedAt: "2026-09-26T14:02:00.000Z",
    feeds: ["iex"],
    figures: [
      {
        state: "observed",
        symbol: "SPY",
        at: "2026-09-26T14:01:00.000Z",
        price: 655.2,
        changePercent: 0.63,
        changeBasis: "2026-09-25",
      },
      { state: "unknown", symbol: "QQQ" },
    ],
  };

  // **These run against `registerMarketGateway`, not against the codec.**
  // `market-gateway.test.ts` hand-builds frames and never constructs a
  // gateway, so an assertion added there would prove the DECODER and say
  // nothing about which path the frame rides.

  it("arrives on connect, before the browser has asked for anything", async () => {
    // The overview is not scoped to a subscription, so a browser that
    // connects mid-session would otherwise hold no figures until the next
    // upstream batch — §11.1's own argument one level up.
    const a = await attach(new Map(), undefined, () => figures);
    await a.waitFor("overview");

    const frame = a.received.find((m) => m.type === "overview");
    expect(frame?.overview).toEqual(figures);
    expect(frame?.sentAt).toEqual(expect.any(String));
    // `computedAt` is a field of its own and not a second meaning for
    // `sentAt`: the aggregate was true before the frame was sent.
    expect(frame?.overview?.computedAt).toBe("2026-09-26T14:02:00.000Z");
  });

  it("arrives again on subscribe", async () => {
    const a = await attach(new Map(), undefined, () => figures);
    await a.waitFor("overview");
    subscribe(a, ["SPY"]);
    await a.waitForCount("overview", 2);
  });

  it("is broadcast once per applied batch, to every attached browser", async () => {
    const a = await attach(new Map(), undefined, () => figures);
    const b = await a.join();
    await a.waitFor("overview");
    await b.waitFor("overview");
    a.received.length = 0;
    b.received.length = 0;

    a.gateway.publishObservations([
      observation("2026-09-16T14:01:00Z", 214.75),
    ]);
    await a.waitFor("overview");
    await b.waitFor("overview");

    // **Every browser, including the one that asked for nothing.** `b` has
    // sent no `subscribe`, so it receives no `bars` — and it is still on the
    // landing page, which is what the aggregate is for.
    expect(a.received.filter((m) => m.type === "overview")).toHaveLength(1);
    expect(b.received.filter((m) => m.type === "overview")).toHaveLength(1);
    expect(b.received.some((m) => m.type === "bars")).toBe(false);
  });

  it("does NOT ride the feed-state path", async () => {
    // Task 4.1.6 measured that path at ~332 frames a minute on the deployed
    // gateway. `the-overview-frame-is-not-a-heartbeat` refuses the word
    // there; this is the behavioural half, over a socket.
    const a = await attach(new Map(), undefined, () => figures);
    await a.waitFor("overview");
    a.received.length = 0;

    a.gateway.publishFeedState();
    await a.waitFor("feed");
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(a.received.some((m) => m.type === "overview")).toBe(false);
  });

  it("is not built at all when there is nothing to publish", async () => {
    // `publishObservations([])` returns before anything is encoded, so an
    // empty batch cannot produce an aggregate nobody asked for.
    const built = vi.fn(() => figures);
    const a = await attach(new Map(), undefined, built);
    await a.waitFor("overview");
    const onConnect = built.mock.calls.length;

    a.gateway.publishObservations([]);
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(built.mock.calls.length).toBe(onConnect);
  });

  it("builds the aggregate ONCE for two browsers, unlike `bars`", async () => {
    const built = vi.fn(() => figures);
    const a = await attach(new Map(), undefined, built);
    const b = await a.join();
    await a.waitFor("overview");
    await b.waitFor("overview");
    subscribe(a, ["NVDA"]);
    subscribe(b, ["NVDA"]);
    await a.waitForCount("overview", 2);
    await b.waitForCount("overview", 2);
    built.mockClear();

    a.gateway.publishObservations([
      observation("2026-09-16T14:01:00Z", 214.75),
    ]);
    await a.waitFor("bars");
    await b.waitFor("bars");

    // One compute, one broadcast — Task 4.1.1's decision 1. A `bars` payload
    // genuinely differs per client; this one does not.
    expect(built).toHaveBeenCalledOnce();
  });
});
