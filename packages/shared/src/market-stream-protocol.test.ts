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
  type OverviewMessage,
  type SnapshotMessage,
  type WireMarketOverview,
  type WireOverviewFigure,
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

/** When the gateway sent the frame — §7.3's bar for 14:01 arrives after 14:02. */
const SENT_AT = "2026-09-16T14:02:00.512Z";

const snapshot: SnapshotMessage = {
  type: "snapshot",
  version: MARKET_STREAM_PROTOCOL_VERSION,
  sentAt: SENT_AT,
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
      sentAt: SENT_AT,
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
      sentAt: SENT_AT,
      observations: { SPY: OBSERVATION },
    };
    const feed: FeedMessage = {
      type: "feed",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      sentAt: SENT_AT,
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

describe("the send instant, which is the one field added after the wire froze", () => {
  // **Task 3.6.4, ADR 0033.** `PRODUCT_SPEC.md` §28's clock starts at
  // *server-received* and for four days nothing on this wire said when the
  // server did anything — `docs/GAPS.md` entry 12. These hold the shape that
  // repair took, and the four constraints that travelled with it.

  it("is on every server message, as an ISO 8601 string", () => {
    const bars: BarsMessage = {
      type: "bars",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      sentAt: SENT_AT,
      observations: { SPY: OBSERVATION },
    };
    const feed: FeedMessage = {
      type: "feed",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      sentAt: SENT_AT,
      feed: FEED,
    };

    for (const message of [snapshot, bars, feed]) {
      const wire = JSON.parse(encodeMarketStreamMessage(message)) as {
        sentAt: unknown;
      };
      expect(wire.sentAt).toBe(SENT_AT);
      expect(Number.isFinite(Date.parse(wire.sentAt as string))).toBe(true);
    }
  });

  it("is one per FRAME and not one per observation", () => {
    // Constraint 4: a frame carries up to 518 securities, and stamping each
    // would be 518 copies of one instant on a wire whose universe payload is
    // already 58 KiB. The observation's own six fields are unchanged.
    expect(Object.keys(OBSERVATION)).not.toContain("sentAt");

    const wire = encodeMarketStreamMessage(snapshot);
    expect(wire.match(/"sentAt"/gu)).toHaveLength(1);
  });

  it("is a NEW field and `startsAt` keeps its one meaning", () => {
    // Constraint 1: `startsAt` is the interval's START — a fact about the
    // market, load-bearing in the qualifier, the revision rule and every
    // stored row. The stamp is a different fact about a different clock, and
    // in a healthy frame the two are a minute apart (§7.3).
    const decoded = decodeMarketStreamMessage(
      encodeMarketStreamMessage(snapshot),
    );

    expect(decoded.kind === "message" && decoded.message.sentAt).toBe(SENT_AT);
    expect(
      decoded.kind === "message" &&
        decoded.message.type === "snapshot" &&
        decoded.message.observations.NVDA?.startsAt,
    ).toBe(OBSERVATION.startsAt);
  });

  it.each(["snapshot", "bars", "feed"] as const)(
    "refuses a %s frame that carries no send instant",
    (type) => {
      // Our own gateway stamps every frame, so a frame without one is a shape
      // this product does not send. Admitting it would make the field optional
      // in every reader — which is how a measurement-only field quietly
      // becomes one that is sometimes there.
      const decoded = decodeMarketStreamMessage(
        JSON.stringify({
          type,
          version: MARKET_STREAM_PROTOCOL_VERSION,
          observations: {},
          feed: FEED,
        }),
      );

      expect(decoded).toEqual({
        kind: "unreadable",
        reason: "no send instant",
      });
    },
  );

  it("still names an unknown type as unknown, stamp or no stamp", () => {
    // **Amended 2026-09-26 by Task 4.2.4.** The disposition changed from
    // `unreadable` to `unsupported`; what this test is about is unchanged and
    // is the reason it survives — the missing stamp must not swallow the type,
    // so the frame is still reported by what it IS rather than by what it
    // lacks. The old expectation is recorded here so the change is visible
    // rather than inferred: it was `unknown message type "ticks"`.
    const decoded = decodeMarketStreamMessage(
      JSON.stringify({
        type: "ticks",
        version: MARKET_STREAM_PROTOCOL_VERSION,
      }),
    );

    expect(decoded).toEqual({ kind: "unsupported", type: "ticks" });
  });
});

describe("decoding, which must never throw", () => {
  it.each([
    ["not JSON", "{not json"],
    ["not an object", "[1,2,3]"],
    ["a wrong version", '{"type":"feed","version":99,"feed":{}}'],
    ["a malformed feed", '{"type":"feed","version":1,"feed":{"status":7}}'],
  ])("returns a value for %s", (_label, raw) => {
    const decoded = decodeMarketStreamMessage(raw);

    expect(decoded.kind).toBe("unreadable");
    expect(decoded.kind === "unreadable" && decoded.reason).toBeTruthy();
  });

  // **An unknown type left this table on 2026-09-26** (Task 4.2.4) and is now
  // asserted below under its own heading. It is not a defect and must not be
  // counted as one; it is the ordinary state of a tab left open across a
  // deploy that rolls the backend first.
  it("returns a value for an unknown type, and it is not a defect", () => {
    expect(decodeMarketStreamMessage('{"type":"wat","version":1}')).toEqual({
      kind: "unsupported",
      type: "wat",
    });
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
      sentAt: SENT_AT,
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
      sentAt: SENT_AT,
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

// --------------------------------------------------- the overview frame (4.2.4)

const OVERVIEW_AT = "2026-09-26T14:02:00.000Z";

const overviewMessage = (
  overview: Partial<WireMarketOverview> = {},
): OverviewMessage => ({
  type: "overview",
  version: MARKET_STREAM_PROTOCOL_VERSION,
  sentAt: SENT_AT,
  overview: {
    computedAt: OVERVIEW_AT,
    feeds: ["iex"],
    figures: [],
    ...overview,
  },
});

describe("the overview frame, which carries the first DERIVED value on this wire", () => {
  it("does not emit a property hung off a NESTED figure", () => {
    // **Where ADR 0031's obligation is actually at risk.** A top-level leak
    // was already covered; a nested object passed through `asIs` satisfies
    // the compiler and carries whatever is on it. Each member of the figure
    // union has its own field map, so this is the assertion that says the
    // maps are being walked rather than the values.
    const figure = {
      state: "observed",
      symbol: "SPY",
      at: OVERVIEW_AT,
      price: 655.2,
      // Not on `WireObservedFigure`. On HTTP this is stripped; on a socket
      // nothing strips it, which is the whole inversion.
      internalRetrievedAt: "2026-09-26T14:02:00.400Z",
      previousClose: 651.1,
    } as unknown as WireOverviewFigure;

    const wire = encodeMarketStreamMessage(
      overviewMessage({ figures: [figure] }),
    );

    expect(wire).not.toContain("internalRetrievedAt");
    expect(wire).not.toContain("previousClose");
    expect(wire).toContain('"symbol":"SPY"');
  });

  it("OMITS an absent change from the encoded STRING, not merely from the object", () => {
    // **Asserted on the string on purpose** (Done when 2). A decoded object
    // would report `undefined` for an omitted key and for a key encoded as
    // `null` alike, and it would pass just as happily over a `0` — which is
    // the one value this wire must never use for *we cannot say*.
    const wire = encodeMarketStreamMessage(
      overviewMessage({
        figures: [
          { state: "observed", symbol: "SPY", at: OVERVIEW_AT, price: 655.2 },
        ],
      }),
    );

    expect(wire).not.toContain("changePercent");
    expect(wire).not.toContain("changeBasis");
    expect(wire).not.toContain("null");
  });

  it("carries a change and its basis when there is one", () => {
    const wire = encodeMarketStreamMessage(
      overviewMessage({
        figures: [
          {
            state: "observed",
            symbol: "SPY",
            at: OVERVIEW_AT,
            price: 655.2,
            changePercent: 0.63,
            changeBasis: "2026-09-25",
          },
        ],
      }),
    );

    expect(wire).toContain('"changePercent":0.63');
    expect(wire).toContain('"changeBasis":"2026-09-25"');
  });

  it("round-trips all three figure states in order", () => {
    const figures: readonly WireOverviewFigure[] = [
      {
        state: "observed",
        symbol: "SPY",
        at: OVERVIEW_AT,
        price: 655.2,
        changePercent: 0.63,
        changeBasis: "2026-09-25",
      },
      { state: "stored", symbol: "QQQ", session: "2026-09-25", close: 589.4 },
      { state: "unknown", symbol: "DIA" },
    ];

    const decoded = decodeMarketStreamMessage(
      encodeMarketStreamMessage(overviewMessage({ figures })),
    );

    expect(decoded.kind).toBe("message");
    if (decoded.kind !== "message") return;
    expect(decoded.message.type).toBe("overview");
    if (decoded.message.type !== "overview") return;
    expect(decoded.message.overview.figures).toEqual(figures);
    expect(decoded.message.overview.computedAt).toBe(OVERVIEW_AT);
    // The order is the answer — four proxies are reported in §6's order.
    expect(decoded.message.overview.figures.map((f) => f.symbol)).toEqual([
      "SPY",
      "QQQ",
      "DIA",
    ]);
  });

  it("OMITS a non-finite percentage rather than defaulting it", () => {
    // A change percentage is the most `Infinity`-prone number this product
    // produces, and `Infinity` survives `JSON.parse` as `null` — which the
    // `typeof === "number"` check would read as absent anyway, and which a
    // hand-written reader would read as `0`. `Number.isFinite` is the check.
    const raw = JSON.stringify({
      type: "overview",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      sentAt: SENT_AT,
      overview: {
        computedAt: OVERVIEW_AT,
        feeds: ["iex"],
        figures: [
          {
            state: "observed",
            symbol: "SPY",
            at: OVERVIEW_AT,
            price: 655.2,
            // `Infinity` written as an expression rather than as a literal
            // `1e400`, which ESLint refuses for losing precision — and which
            // would be `Infinity` anyway. `JSON.stringify` writes it as
            // `null`, which is exactly the shape that arrives on the wire.
            changePercent: Number.POSITIVE_INFINITY,
            changeBasis: "2026-09-25",
          },
        ],
      },
    });

    const decoded = decodeMarketStreamMessage(raw);
    expect(decoded.kind).toBe("message");
    if (decoded.kind !== "message") return;
    if (decoded.message.type !== "overview") return;
    const [figure] = decoded.message.overview.figures;
    expect(figure).toEqual({
      state: "observed",
      symbol: "SPY",
      at: OVERVIEW_AT,
      price: 655.2,
    });
    expect(figure).not.toHaveProperty("changePercent");
    // And the basis does not survive alone: a date describing a figure that
    // is not there is a false impression one field wide.
    expect(figure).not.toHaveProperty("changeBasis");
  });

  it("drops one malformed figure and keeps the rest", () => {
    const raw = JSON.stringify({
      type: "overview",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      sentAt: SENT_AT,
      overview: {
        computedAt: OVERVIEW_AT,
        feeds: ["iex"],
        figures: [
          { state: "observed", symbol: "SPY", at: OVERVIEW_AT, price: null },
          { state: "unknown", symbol: "QQQ" },
        ],
      },
    });

    const decoded = decodeMarketStreamMessage(raw);
    if (decoded.kind !== "message" || decoded.message.type !== "overview") {
      throw new Error("expected an overview message");
    }
    expect(decoded.message.overview.figures).toEqual([
      { state: "unknown", symbol: "QQQ" },
    ]);
  });

  it("drops a feed slug this bundle has no words for", () => {
    const raw = JSON.stringify({
      type: "overview",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      sentAt: SENT_AT,
      overview: { computedAt: OVERVIEW_AT, feeds: ["iex", "otc"], figures: [] },
    });

    const decoded = decodeMarketStreamMessage(raw);
    if (decoded.kind !== "message" || decoded.message.type !== "overview") {
      throw new Error("expected an overview message");
    }
    expect(decoded.message.overview.feeds).toEqual(["iex"]);
  });

  it("is unreadable without a send instant, like every other frame", () => {
    const raw = JSON.stringify({
      type: "overview",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      overview: { computedAt: OVERVIEW_AT, feeds: [], figures: [] },
    });
    expect(decodeMarketStreamMessage(raw)).toEqual({
      kind: "unreadable",
      reason: "no send instant",
    });
  });
});

describe("a type this bundle has never heard of", () => {
  it("is `unsupported` — neither a message nor a defect", () => {
    // **The stale tab's case.** The deploy rolls the backend first, so a tab
    // on the previous bundle meets a type it predates. Under `unreadable`
    // that tab counts a defect in a field documented as *"Zero on every
    // healthy deployment"*, and that field is in `sameLiveFeedView` — so it
    // would re-render the whole application on every such frame, for ever.
    const raw = JSON.stringify({
      type: "breadth",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      sentAt: SENT_AT,
    });

    expect(decodeMarketStreamMessage(raw)).toEqual({
      kind: "unsupported",
      type: "breadth",
    });
  });

  it("does NOT bump the protocol version to say so", () => {
    // Recorded as an assertion rather than as prose (Done when 5). Bumping is
    // the obvious-looking move and is strictly worse: the version is checked
    // BEFORE the type, so a stale tab would reject every frame — losing its
    // prices, its feed word and its snapshot — rather than ignoring one.
    expect(MARKET_STREAM_PROTOCOL_VERSION).toBe(1);

    const stale = JSON.stringify({
      type: "overview",
      version: 2,
      sentAt: SENT_AT,
      overview: { computedAt: OVERVIEW_AT, feeds: [], figures: [] },
    });
    expect(decodeMarketStreamMessage(stale).kind).toBe("unreadable");
  });
});

describe("a non-finite number never reaches this wire, and the SERIALISER is what says so", () => {
  // **These assert on the encoded STRING, both of them**, because a decoded
  // `undefined` and an omitted key are indistinguishable — and because the
  // guarantee under test is the encoder's own. The producer
  // (`toWireMarketOverview`) no longer checks: ADR 0031's argument is that a
  // transport with no schema layer owes its guarantee where the encoding
  // happens, not at whichever call site remembers.

  it.each([
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
    ["NaN", Number.NaN],
  ])("OMITS a %s percentage rather than writing `null`", (_label, value) => {
    const wire = encodeMarketStreamMessage(
      overviewMessage({
        figures: [
          {
            state: "observed",
            symbol: "SPY",
            at: OVERVIEW_AT,
            price: 655.2,
            changePercent: value,
            changeBasis: "2026-09-25",
          },
        ],
      }),
    );

    expect(wire).not.toContain("null");
    expect(wire).not.toContain("changePercent");
    // And the basis does not survive the percentage it describes.
    expect(wire).not.toContain("changeBasis");
    expect(wire).toContain('"price":655.2');
  });

  it.each([
    ["Infinity", Number.POSITIVE_INFINITY],
    ["NaN", Number.NaN],
  ])("DROPS a figure whose %s price cannot be written", (_label, value) => {
    // A `"price":null` is read as absent by a strict reader and as **`0`** by
    // a lenient one, and `0` is a plausible price. `json-schema.ts` measured
    // that trap on the HTTP wire; here there is no schema to blame.
    const wire = encodeMarketStreamMessage(
      overviewMessage({
        figures: [
          { state: "observed", symbol: "SPY", at: OVERVIEW_AT, price: value },
          { state: "unknown", symbol: "QQQ" },
        ],
      }),
    );

    expect(wire).not.toContain("null");
    expect(wire).not.toContain("SPY");
    expect(wire).toContain('{"state":"unknown","symbol":"QQQ"}');
    // `flatMap`, not `map` — a dropped figure is absent from the array
    // rather than a hole in it.
    expect(wire).toContain('"figures":[{');
  });

  it("DROPS a stored figure whose close cannot be written", () => {
    const wire = encodeMarketStreamMessage(
      overviewMessage({
        figures: [
          {
            state: "stored",
            symbol: "DIA",
            session: "2026-09-25",
            close: Number.NaN,
          },
        ],
      }),
    );

    expect(wire).toContain('"figures":[]');
    expect(wire).not.toContain("null");
  });
});

describe("a frame with no type at all is US, not a newer gateway", () => {
  it.each([
    ["absent", '{"version":1}'],
    ["a number", '{"type":7,"version":1}'],
    ["null", '{"type":null,"version":1}'],
  ])("reports a %s type as unreadable rather than unsupported", (_l, raw) => {
    // **Corrected after review.** The first version answered `unsupported`
    // for anything that fell through, so a typeless frame — which only our
    // own gateway can produce, and only by being broken — was dropped by the
    // browser and invisible on every surface. Only a NAMED type earns the
    // forward-compatible disposition.
    const decoded = decodeMarketStreamMessage(raw);
    expect(decoded.kind).toBe("unreadable");
    expect(decoded.kind === "unreadable" && decoded.reason).toContain(
      "unknown message type",
    );
  });
});
