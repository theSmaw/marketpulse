import { describe, expect, it } from "vitest";

import { toTicker } from "./ticker.js";
import {
  MARKET_STREAM_PROTOCOL_VERSION,
  decodeMarketStreamMessage,
  encodeMarketStreamMessage,
  toWireObservation,
  toWireObservations,
  type BarsMessage,
  type FeedMessage,
  type SnapshotMessage,
} from "./market-stream-protocol.js";

const OBSERVATION = {
  startsAt: "2026-09-16T14:01:00.000Z",
  open: 214.88,
  high: 214.895,
  low: 214.555,
  close: 214.75,
  volume: 5184,
};

const FEED = { status: "live", feed: "iex", marketOpen: true } as const;

const snapshot: SnapshotMessage = {
  type: "snapshot",
  version: MARKET_STREAM_PROTOCOL_VERSION,
  observations: { NVDA: OBSERVATION },
  feed: FEED,
};

describe("the guard that plays `satisfies`'s role", () => {
  it("does NOT emit a property that is on the object and not on the type", () => {
    // **The whole reason this module exists.** On the HTTP wire
    // `fast-json-stringify` strips an undeclared property, which is what makes
    // *no internal detail reaches a client* structural. A socket has no such
    // mechanism, so the failure INVERTS: an absence becomes a LEAK, and what
    // leaks is whatever a developer attached to the internal object.
    //
    // `toWire` walks the MAP's keys rather than the value's, so a property
    // nothing declares is never read and cannot be written.
    const contaminated = {
      ...snapshot,
      feed: {
        ...FEED,
        SECRET_CREDENTIAL: "apca-key-that-must-never-leave",
        internalRowId: 42,
      },
    } as SnapshotMessage;

    const wire = encodeMarketStreamMessage(contaminated);

    expect(JSON.stringify(contaminated)).toContain("apca-key");
    expect(wire).not.toContain("apca-key");
    expect(wire).not.toContain("internalRowId");
  });

  it("emits exactly the declared fields, in the declared shape", () => {
    expect(JSON.parse(encodeMarketStreamMessage(snapshot))).toEqual({
      type: "snapshot",
      version: 1,
      observations: { NVDA: OBSERVATION },
      feed: { status: "live", feed: "iex", marketOpen: true },
    });
  });

  // A field added to a message type and not to its field map is TS2741,
  // demonstrated by doing it: adding `leakedField` to `WireFeedState` produced
  //
  //   error TS2741: Property 'leakedField' is missing in type
  //   '{ status: …; feed: …; marketOpen: … }' but required in
  //   type 'WireFields<WireFeedState>'
  //
  // `WireFields` uses `-?`, so an OPTIONAL field cannot satisfy the map by
  // omission either — which is the hole a naive `Partial` mapped type leaves.
  it("keeps every message type serialisable, exhaustively", () => {
    const bars: BarsMessage = {
      type: "bars",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      observations: { SPY: OBSERVATION },
    };
    const feed: FeedMessage = {
      type: "feed",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      feed: FEED,
    };

    for (const message of [snapshot, bars, feed]) {
      expect(() => encodeMarketStreamMessage(message)).not.toThrow();
    }
  });
});

describe("absence is expressed by omission", () => {
  it("round-trips an EMPTY snapshot as the true answer", () => {
    // §11.1: after a restart the snapshot is `{}` — and that is the TRUE
    // answer, not a degraded one. Nothing about it should look like an error.
    const empty: SnapshotMessage = { ...snapshot, observations: {} };
    const decoded = decodeMarketStreamMessage(encodeMarketStreamMessage(empty));

    expect(decoded.kind).toBe("message");
    expect(
      decoded.kind === "message" &&
        Object.keys((decoded.message as SnapshotMessage).observations),
    ).toEqual([]);
  });

  it("has no field a security could be present-but-empty in", () => {
    // The done-when: omission semantics in the TYPE rather than a comment.
    // Every field of `WireObservation` is required, so there is no way to spell
    // "present, but nothing observed" — the key is either there with a whole
    // observation or it is not there.
    const keys = Object.keys(OBSERVATION);
    expect(keys).toEqual([
      "startsAt",
      "open",
      "high",
      "low",
      "close",
      "volume",
    ]);
  });

  it("carries no `staleSeconds`, because an age is a clock read", () => {
    // §11.1, and ADR 0017 forbids `packages/shared` reading the wall clock.
    // Every entry carries its observation's OWN instant; the browser has a
    // clock and can subtract.
    const wire = encodeMarketStreamMessage(snapshot);

    expect(wire).toContain("startsAt");
    expect(wire).not.toContain("stale");
    expect(wire).not.toContain("age");
  });

  it("carries no per-security status word", () => {
    // §11.2 measured the gap between one security's bars at p50 1 minute and a
    // MAXIMUM of 187, so no threshold separates a quiet security from a broken
    // one. There is no field here for one, and that is the point.
    expect(Object.keys(OBSERVATION)).not.toContain("status");
  });
});

describe("decoding, which must never throw", () => {
  it.each([
    ["not JSON", "{not json"],
    ["not an object", "[1,2,3]"],
    ["an unknown type", '{"type":"wat","version":1}'],
    ["a wrong version", '{"type":"feed","version":99,"feed":{}}'],
    ["a malformed feed", '{"type":"feed","version":1,"feed":{"status":7}}'],
  ])("returns a value for %s", (_label, raw) => {
    const decoded = decodeMarketStreamMessage(raw);

    expect(decoded.kind).toBe("unreadable");
    expect(decoded.kind === "unreadable" && decoded.reason).toBeTruthy();
  });

  it("never throws, whatever it is handed", () => {
    // The browser is the side that must not crash: a malformed message from a
    // server we wrote is a bug, but a browser that THROWS on one takes the page
    // down, which §36 forbids.
    for (const raw of ["", "null", "undefined", "{}", '{"version":1}']) {
      expect(() => decodeMarketStreamMessage(raw)).not.toThrow();
    }
  });

  it("refuses a NaN or Infinity price, which `typeof` alone would admit", () => {
    // Built rather than written as `1e999`, which the linter rightly refuses as
    // a literal that loses precision — the value under test is what JSON.parse
    // produces from an over-large number, and that is Infinity either way.
    const INFINITE = Number.POSITIVE_INFINITY;
    // JSON cannot carry NaN, but a hand-rolled or proxied producer can send
    // `null` where a number belongs, and `1e999` parses to Infinity.
    const withInfinity = JSON.stringify({
      type: "bars",
      version: 1,
      observations: { NVDA: { ...OBSERVATION, close: INFINITE } },
    });

    const decoded = decodeMarketStreamMessage(withInfinity);

    // The message survives; the malformed entry does not.
    expect(decoded.kind).toBe("message");
    expect(
      decoded.kind === "message" &&
        Object.keys((decoded.message as BarsMessage).observations),
    ).toEqual([]);
  });

  it("keeps the good securities in a frame that also holds a bad one", () => {
    // The vendor batches (§7.2), so a frame carries many securities. Losing all
    // of them because one is malformed is the failure `alpaca-stream-mapping`
    // already refuses one layer over.
    const mixed = JSON.stringify({
      type: "bars",
      version: 1,
      observations: { NVDA: OBSERVATION, SPY: { startsAt: "x" } },
    });

    const decoded = decodeMarketStreamMessage(mixed);

    expect(
      decoded.kind === "message" &&
        Object.keys((decoded.message as BarsMessage).observations),
    ).toEqual(["NVDA"]);
  });
});

describe("the round trip", () => {
  it("survives encode → decode unchanged", () => {
    const decoded = decodeMarketStreamMessage(
      encodeMarketStreamMessage(snapshot),
    );

    expect(decoded.kind === "message" && decoded.message).toEqual(snapshot);
  });

  it("maps a domain Bar with `startsAt` as the interval's START", () => {
    // §7.3, confirmed with an HTTP control: `t` marks the start on the stream
    // too, and nothing here shifts it.
    const bar = {
      startsAt: new Date("2026-09-16T14:01:00Z"),
      open: 1,
      high: 2,
      low: 0.5,
      close: 1.5,
      volume: 10,
    };

    expect(toWireObservation(bar).startsAt).toBe("2026-09-16T14:01:00.000Z");
  });

  it("maps a whole current-state map", () => {
    const bars = new Map([
      [
        toTicker("NVDA"),
        {
          startsAt: new Date("2026-09-16T14:01:00Z"),
          open: 1,
          high: 2,
          low: 0.5,
          close: 1.5,
          volume: 10,
        },
      ],
    ]);

    expect(Object.keys(toWireObservations(bars))).toEqual(["NVDA"]);
  });
});
