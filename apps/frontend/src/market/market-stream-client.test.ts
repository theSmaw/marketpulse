import {
  MARKET_STREAM_PATH,
  MARKET_STREAM_PROTOCOL_VERSION,
  encodeMarketStreamMessage,
} from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { apiBaseUrl } from "../api-base-url.js";
import type { LiveFeedEvent } from "./live-feed.js";
import {
  connectMarketStream,
  marketStreamUrl,
} from "./market-stream-client.js";

// The transport (Task 3.3.4). jsdom has no WebSocket server, so the socket is a
// seam — the same call `api-client.ts` makes about `fetch`, for the same reason.

/** A socket a test drives, with the two methods this transport actually uses. */
class FakeSocket {
  readonly listeners = new Map<string, ((event: unknown) => void)[]>();
  closed = 0;

  addEventListener(kind: string, listener: (event: unknown) => void): void {
    this.listeners.set(kind, [...(this.listeners.get(kind) ?? []), listener]);
  }

  close(): void {
    this.closed += 1;
  }

  emit(kind: string, event: unknown = {}): void {
    for (const listener of this.listeners.get(kind) ?? []) listener(event);
  }
}

const connect = () => {
  const socket = new FakeSocket();
  const events: LiveFeedEvent[] = [];
  let tick = 0;

  const disconnect = connectMarketStream((event) => events.push(event), {
    now: () => (tick += 100),
    open: () => socket as unknown as WebSocket,
  });

  return { socket, events, disconnect };
};

describe("the address", () => {
  it("is the build-time origin with the SHARED path", () => {
    // The path comes from `packages/shared` so the two halves cannot drift, and
    // this asserts that rather than re-spelling the string.
    expect(marketStreamUrl("http://localhost:3000")).toBe(
      `ws://localhost:3000${MARKET_STREAM_PATH}`,
    );
  });

  it("upgrades the scheme by PREFIX, never by replacement", () => {
    // A bare `.replace("http", "ws")` also rewrites a host containing the
    // letters, which is the kind of thing nobody finds until it is deployed.
    expect(marketStreamUrl("https://api.marketpulse.example")).toBe(
      `wss://api.marketpulse.example${MARKET_STREAM_PATH}`,
    );
    expect(marketStreamUrl("https://http-gateway.example")).toBe(
      `wss://http-gateway.example${MARKET_STREAM_PATH}`,
    );
  });

  it("is the only place in the application that knows it", () => {
    // The grep that makes "one module knows the URL" a fact rather than a
    // claim is in `market-stream-client.test.ts`'s sibling invariant; what this
    // holds is that the module composes the one configured origin rather than
    // carrying an address of its own.
    expect(marketStreamUrl(apiBaseUrl).startsWith("ws")).toBe(true);
    expect(marketStreamUrl(apiBaseUrl).endsWith(MARKET_STREAM_PATH)).toBe(true);
  });
});

describe("what reaches the state above", () => {
  it("hands a decoded message up as a typed event", () => {
    const { socket, events } = connect();

    socket.emit("open");
    socket.emit("message", {
      data: encodeMarketStreamMessage({
        type: "feed",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        feed: { status: "live", feed: "iex", marketOpen: true },
      }),
    });

    expect(events.map((event) => event.kind)).toEqual(["opened", "message"]);
    expect(events[1]).toMatchObject({ kind: "message" });
  });

  it("turns a malformed message into a value rather than a throw", () => {
    // §36: one malformed message must not take the page down.
    const { socket, events } = connect();

    expect(() => {
      socket.emit("message", { data: "{not json" });
    }).not.toThrow();

    expect(events[0]).toMatchObject({ kind: "unreadable" });
  });

  it("treats a non-text frame as unreadable rather than crashing on it", () => {
    // A browser can be handed a Blob or an ArrayBuffer as readily as a string.
    const { socket, events } = connect();

    socket.emit("message", { data: new ArrayBuffer(8) });

    expect(events[0]).toMatchObject({ kind: "unreadable", reason: "not text" });
  });

  it("reports an error and a close as the same thing, because only one is actionable", () => {
    // `error` fires without a close on some failures and `close` without an
    // error on others. What the state above can act on is that the socket is
    // gone.
    const { socket, events } = connect();

    socket.emit("error");
    expect(events[0]).toMatchObject({ kind: "closed" });

    socket.emit("close");
    expect(events[1]).toMatchObject({ kind: "closed" });
  });

  it("stamps every event with the MONOTONIC clock it was given", () => {
    const { socket, events } = connect();

    socket.emit("open");
    socket.emit("close");

    expect(events.map((event) => event.at)).toEqual([100, 200]);
  });
});

describe("disconnecting", () => {
  it("closes the socket and does not reconnect", () => {
    // Story 3.10 owns retry. A transport is exactly where somebody adds a loop
    // without noticing it is a policy.
    const { socket, disconnect, events } = connect();

    socket.emit("open");
    disconnect();

    expect(socket.closed).toBe(1);
    socket.emit("close");
    expect(events.filter((event) => event.kind === "opened")).toHaveLength(1);
  });
});
