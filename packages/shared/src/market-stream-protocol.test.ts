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
  type WireMarketBreadth,
  type WireMarketMovers,
  type WireMarketOverview,
  type WireObservedBreadth,
  type WireObservedMovers,
  type WireOverviewFigure,
  type WireSessionBreadth,
  type WireSessionMovers,
  type WireStoredFigure,
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

  it("carries the observation instant, and omits it rather than nulling it", () => {
    // **The field a drawn sentence dates the figures from** (Task 4.8.12).
    // `computedAt` says when the join ran, and the gateway runs it on every
    // connect — so a surface drawing it told a reader of a stopped feed that
    // the figures were from the minute they opened the tab.
    const withOne = encodeMarketStreamMessage({
      type: "overview",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      sentAt: SENT_AT,
      overview: {
        computedAt: OVERVIEW_AT,
        observedAt: "2026-09-25T18:01:00.000Z",
        feeds: [],
        figures: [],
      },
    });

    expect(JSON.parse(withOne)).toMatchObject({
      overview: { observedAt: "2026-09-25T18:01:00.000Z" },
    });

    // An aggregate over zero observations has no such instant, and
    // `JSON.stringify` would write `null` for one — which a lenient reader
    // turns into the epoch.
    const withNone = JSON.parse(
      encodeMarketStreamMessage({
        type: "overview",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        sentAt: SENT_AT,
        overview: { computedAt: OVERVIEW_AT, feeds: [], figures: [] },
      }),
    ) as { readonly overview: Record<string, unknown> };

    expect(withNone.overview).not.toHaveProperty("observedAt");
  });

  it("reads the observation instant back, and tolerates a frame with none", () => {
    // Optional on the read side for the sector section's reason: a rollback
    // pins a previous image, so a new bundle can meet a gateway that sends
    // no such field. Absent stays absent rather than discarding a frame that
    // carries four true prices.
    const read = (overview: Record<string, unknown>): WireMarketOverview => {
      const decoded = decodeMarketStreamMessage(
        JSON.stringify({
          type: "overview",
          version: MARKET_STREAM_PROTOCOL_VERSION,
          sentAt: SENT_AT,
          overview,
        }),
      );
      if (decoded.kind !== "message" || decoded.message.type !== "overview") {
        throw new Error("expected an overview message");
      }
      return decoded.message.overview;
    };

    expect(
      read({
        computedAt: OVERVIEW_AT,
        observedAt: "2026-09-25T18:01:00.000Z",
        feeds: [],
        figures: [],
      }).observedAt,
    ).toBe("2026-09-25T18:01:00.000Z");

    expect(
      read({ computedAt: OVERVIEW_AT, feeds: [], figures: [] }),
    ).not.toHaveProperty("observedAt");

    // Anything that is not a string is the same absence, never a value a
    // formatter is handed.
    expect(
      read({
        computedAt: OVERVIEW_AT,
        observedAt: 1_758_823_260_000,
        feeds: [],
        figures: [],
      }),
    ).not.toHaveProperty("observedAt");
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

// ------------------------------------------ the sector section (Task 4.3.4)

describe("the sector section, which is a NEW key rather than more figures", () => {
  const sector = (symbol: string, percent: number): WireOverviewFigure => ({
    state: "observed",
    symbol,
    at: OVERVIEW_AT,
    price: 100,
    changePercent: percent,
  });

  const roundTrip = (overview: Partial<WireMarketOverview>) => {
    const decoded = decodeMarketStreamMessage(
      encodeMarketStreamMessage(overviewMessage(overview)),
    );
    if (decoded.kind !== "message" || decoded.message.type !== "overview") {
      throw new Error("expected an overview message");
    }
    return decoded.message.overview;
  };

  it("survives the round trip in the order it was given, beside the proxies", () => {
    // Done-when 1's wire half: `figures` still carries the proxies and only
    // the proxies. Appending eleven sector ETFs to that array would move
    // `newest` in `market-proxies.ts` and break `sharedBasis` and
    // `sharedClosingSession`, with no compile error and no test failure.
    const overview = roundTrip({
      figures: [sector("SPY", 0.2)],
      sectors: [sector("XLE", 1.4), sector("XLK", -0.3)],
      sectorLadderStep: 2,
    });

    expect(overview.figures.map((figure) => figure.symbol)).toEqual(["SPY"]);
    expect(overview.sectors?.map((figure) => figure.symbol)).toEqual([
      "XLE",
      "XLK",
    ]);
    expect(overview.sectorLadderStep).toBe(2);
  });

  it("is ABSENT on a frame that carries none, on both sides of the wire", () => {
    // **The read side is the half that matters.** The deploy rolls the backend
    // first, but a rollback pins a previous image — so a new bundle can
    // legitimately meet an old gateway that sends no such section.
    const wire = encodeMarketStreamMessage(
      overviewMessage({ figures: [sector("SPY", 0.2)] }),
    );
    expect(wire).not.toContain("sectors");
    expect(wire).not.toContain("sectorLadderStep");

    const overview = roundTrip({ figures: [sector("SPY", 0.2)] });
    expect(overview).not.toHaveProperty("sectors");
    expect(overview).not.toHaveProperty("sectorLadderStep");
  });

  it("drops the rung when there are no sectors to scale", () => {
    // A ladder beside no figures is a scale for nothing — ADR 0029's false
    // impression, one field wide, and `changeBasis`' rule with a second
    // subject.
    const wire = encodeMarketStreamMessage(
      overviewMessage({ figures: [], sectorLadderStep: 5 }),
    );
    expect(wire).not.toContain("sectorLadderStep");

    const decoded = decodeMarketStreamMessage(
      JSON.stringify({
        type: "overview",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        sentAt: SENT_AT,
        overview: {
          computedAt: OVERVIEW_AT,
          feeds: [],
          figures: [],
          sectorLadderStep: 5,
        },
      }),
    );
    if (decoded.kind !== "message" || decoded.message.type !== "overview") {
      throw new Error("expected an overview message");
    }
    expect(decoded.message.overview).not.toHaveProperty("sectorLadderStep");
  });

  it("drops a rung that is not one of the four, and keeps the figures", () => {
    // `feeds`' leniency, for its reason: the only reader is a renderer that
    // would otherwise draw an axis nobody has reviewed, and the frame carries
    // true prices.
    const decoded = decodeMarketStreamMessage(
      JSON.stringify({
        type: "overview",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        sentAt: SENT_AT,
        overview: {
          computedAt: OVERVIEW_AT,
          feeds: [],
          figures: [],
          sectors: [{ state: "unknown", symbol: "XLK" }],
          sectorLadderStep: 3,
        },
      }),
    );
    if (decoded.kind !== "message" || decoded.message.type !== "overview") {
      throw new Error("expected an overview message");
    }
    expect(decoded.message.overview.sectors).toHaveLength(1);
    expect(decoded.message.overview).not.toHaveProperty("sectorLadderStep");
  });

  it("drops one unreadable sector rather than the section, or the frame", () => {
    const decoded = decodeMarketStreamMessage(
      JSON.stringify({
        type: "overview",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        sentAt: SENT_AT,
        overview: {
          computedAt: OVERVIEW_AT,
          feeds: [],
          figures: [],
          sectors: [
            { state: "observed", symbol: "XLK", at: OVERVIEW_AT, price: null },
            { state: "unknown", symbol: "XLV" },
          ],
        },
      }),
    );
    if (decoded.kind !== "message" || decoded.message.type !== "overview") {
      throw new Error("expected an overview message");
    }
    expect(decoded.message.overview.sectors).toEqual([
      { state: "unknown", symbol: "XLV" },
    ]);
  });
});

describe("the breadth section, required on the producer and optional here", () => {
  const counts = {
    advancing: 284,
    declining: 167,
    unchanged: 15,
    measured: 466,
    tracked: 503,
  } as const;

  const OBSERVED: WireObservedBreadth = {
    basis: "observed",
    ...counts,
    windowMinutes: 5,
  };

  const SESSION: WireSessionBreadth = {
    basis: "session",
    ...counts,
    session: "2026-09-15",
  };

  const roundTrip = (
    breadth: WireMarketBreadth,
  ): WireMarketOverview["breadth"] => {
    const decoded = decodeMarketStreamMessage(
      encodeMarketStreamMessage(overviewMessage({ breadth })),
    );
    if (decoded.kind !== "message" || decoded.message.type !== "overview") {
      throw new Error("expected an overview message");
    }
    return decoded.message.overview.breadth;
  };

  it("carries each member's own discriminating field through the round trip", () => {
    // **The ADR 0031 failure this is really about**: `WireFields<T>` is a
    // mapped type over `keyof T` and `keyof` a union is the INTERSECTION of
    // its members' keys — so one map over this union covers the counts and
    // `basis` and waves `windowMinutes` and `session` through unexamined.
    // Those are the two fields that say which question was asked, which makes
    // the single map exactly the wrong map. One map per member is what these
    // two assertions are about.
    expect(roundTrip(OBSERVED)).toEqual(OBSERVED);
    expect(roundTrip(SESSION)).toEqual(SESSION);
  });

  it("does not let the OTHER member's field through", () => {
    // The leak the per-member maps prevent, stated as bytes: a `session` hung
    // off an observed count, or a window hung off a session count, is a frame
    // claiming to answer both questions at once.
    const wire = encodeMarketStreamMessage(
      overviewMessage({
        breadth: { ...OBSERVED, session: "2026-09-15" } as WireMarketBreadth,
      }),
    );

    expect(wire).toContain('"windowMinutes":5');
    expect(wire).not.toContain("2026-09-15");
  });

  it("drops the WHOLE section for a non-finite count, never a field and never a zero", () => {
    // `encodeFigure`'s rule at a second grain. `JSON.stringify` writes `null`
    // for a non-finite number and a lenient reader turns that into **`0`** —
    // and `0` under `advancing` is a plausible, readable, wrong figure saying
    // *nothing in the market went up*. There is no partial breadth, so the
    // unit dropped is the section.
    for (const field of [
      "advancing",
      "declining",
      "unchanged",
      "measured",
      "windowMinutes",
    ] as const) {
      const wire = encodeMarketStreamMessage(
        overviewMessage({ breadth: { ...OBSERVED, [field]: Number.NaN } }),
      );

      expect(wire).not.toContain("breadth");
      expect(wire).not.toContain("null");
    }
  });

  it("is ABSENT on a frame from a gateway that never heard of it", () => {
    // The rollback case, and the only reason the wire property is optional:
    // the deploy rolls the backend first, but a rollback pins a previous
    // image, so a new bundle can legitimately meet a gateway sending no
    // breadth. Absent means *this gateway does not send breadth*, which the
    // region draws as its reserved state — and it is a different state from
    // `measured: 0`, which means *we counted and heard nothing*.
    const wire = encodeMarketStreamMessage(overviewMessage({}));
    expect(wire).not.toContain("breadth");

    const decoded = decodeMarketStreamMessage(wire);
    if (decoded.kind !== "message" || decoded.message.type !== "overview") {
      throw new Error("expected an overview message");
    }
    expect(decoded.message.overview).not.toHaveProperty("breadth");
  });

  it("carries a zero count, because that is a DIFFERENT claim from absence", () => {
    const empty: WireMarketBreadth = {
      basis: "session",
      advancing: 0,
      declining: 0,
      unchanged: 0,
      measured: 0,
      tracked: 503,
      session: "2026-09-15",
    };

    expect(roundTrip(empty)).toEqual(empty);
  });

  it("refuses a section whose counts do not sum to its denominator", () => {
    // The one cross-field check on this wire. On the producer the sum is true
    // by construction — one pass, three accumulators, their sum — so a section
    // where it is false did not come from a producer this bundle understands,
    // and the figure it would draw is WRONG rather than old. Refusing draws
    // the reserved state; accepting draws a total a reader can see is wrong.
    expect(roundTrip({ ...OBSERVED, measured: 465 })).toBeUndefined();
  });

  it("refuses a basis it has never heard of, and a count with no window", () => {
    expect(
      roundTrip({
        ...OBSERVED,
        basis: "guessed",
      } as unknown as WireMarketBreadth),
    ).toBeUndefined();

    const windowless: Record<string, unknown> = { ...OBSERVED };
    delete windowless.windowMinutes;

    const decoded = decodeMarketStreamMessage(
      JSON.stringify({
        type: "overview",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        sentAt: SENT_AT,
        overview: {
          computedAt: OVERVIEW_AT,
          feeds: [],
          figures: [],
          breadth: windowless,
        },
      }),
    );
    if (decoded.kind !== "message" || decoded.message.type !== "overview") {
      throw new Error("expected an overview message");
    }

    // A frame that still carries its figures: one unreadable section does not
    // discard four true prices.
    expect(decoded.message.overview).not.toHaveProperty("breadth");
    expect(decoded.message.overview.computedAt).toBe(OVERVIEW_AT);
  });
});

describe("the movers section, whose ORDER is the answer", () => {
  const mover = (symbol: string, percent: number): WireOverviewFigure => ({
    state: "observed",
    symbol,
    at: OVERVIEW_AT,
    price: 100,
    changePercent: percent,
  });

  const GAINERS = [mover("NVDA", 4.12), mover("AVGO", 2.8)];
  const LOSERS = [mover("KO", -3.4), mover("PG", -1.06)];

  const lists = {
    gainers: GAINERS,
    losers: LOSERS,
    eligible: 466,
    tracked: 503,
  } as const;

  const OBSERVED: WireObservedMovers = {
    basis: "observed",
    ...lists,
    windowMinutes: 5,
  };

  const SESSION: WireSessionMovers = {
    basis: "session",
    ...lists,
    session: "2026-09-15",
  };

  const roundTrip = (
    movers: WireMarketMovers,
  ): WireMarketOverview["movers"] => {
    const decoded = decodeMarketStreamMessage(
      encodeMarketStreamMessage(overviewMessage({ movers })),
    );
    if (decoded.kind !== "message" || decoded.message.type !== "overview") {
      throw new Error("expected an overview message");
    }
    return decoded.message.overview.movers;
  };

  /** A section built by hand, so a refusal can be stated as raw JSON. */
  const readRaw = (
    movers: Record<string, unknown>,
  ): WireMarketOverview["movers"] => {
    const decoded = decodeMarketStreamMessage(
      JSON.stringify({
        type: "overview",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        sentAt: SENT_AT,
        overview: { computedAt: OVERVIEW_AT, feeds: [], figures: [], movers },
      }),
    );
    if (decoded.kind !== "message" || decoded.message.type !== "overview") {
      throw new Error("expected an overview message");
    }
    // A frame that still carries the rest of itself: one unreadable section
    // does not discard four true prices.
    expect(decoded.message.overview.computedAt).toBe(OVERVIEW_AT);
    return decoded.message.overview.movers;
  };

  it("carries each member's own discriminating field through the round trip", () => {
    // **Two field maps, one per member**, for the reason the breadth pair
    // exists: `keyof` a union is the INTERSECTION of its members' keys, so one
    // map over this union would cover the two lists, the two counts and
    // `basis`, and wave `windowMinutes` and `session` through UNEXAMINED.
    expect(roundTrip(OBSERVED)).toEqual(OBSERVED);
    expect(roundTrip(SESSION)).toEqual(SESSION);
  });

  it("does not let the OTHER member's field through", () => {
    const wire = encodeMarketStreamMessage(
      overviewMessage({
        movers: { ...OBSERVED, session: "2026-09-15" } as WireMarketMovers,
      }),
    );

    expect(wire).toContain('"windowMinutes":5');
    expect(wire).not.toContain("2026-09-15");
  });

  it("drops the WHOLE section for a non-finite count, never a field and never a zero", () => {
    // `encodeBreadth`'s rule, and both counts here are denominators: a `null`
    // under `eligible` is read as **`0`** by a lenient reader, which is a
    // ranked list claiming to be a selection from nothing.
    for (const field of ["eligible", "tracked", "windowMinutes"] as const) {
      const wire = encodeMarketStreamMessage(
        overviewMessage({ movers: { ...OBSERVED, [field]: Number.NaN } }),
      );

      expect(wire).not.toContain("movers");
      expect(wire).not.toContain("null");
    }
  });

  it("is ABSENT on a frame from a gateway that never heard of it", () => {
    // The rollback case — the only reason the wire property is optional while
    // the producer's input is not. Absent means *this gateway does not send
    // movers*, which the region draws as its reserved state.
    const wire = encodeMarketStreamMessage(overviewMessage({}));
    expect(wire).not.toContain("movers");

    const decoded = decodeMarketStreamMessage(wire);
    if (decoded.kind !== "message" || decoded.message.type !== "overview") {
      throw new Error("expected an overview message");
    }
    expect(decoded.message.overview).not.toHaveProperty("movers");
  });

  it("carries two empty lists over an empty set, because that is a TRUE state", () => {
    // CI's store — 518 securities and zero bars — and every process for its
    // first minutes. `eligible: 0` says *we looked and nothing was
    // measurable*; the section's absence says *this gateway does not send
    // movers*. Different states, spelled differently.
    const empty: WireMarketMovers = {
      basis: "session",
      gainers: [],
      losers: [],
      eligible: 0,
      tracked: 503,
      session: "2026-09-15",
    };

    expect(roundTrip(empty)).toEqual(empty);
  });

  it("refuses a selection bigger than the set it claims to be from", () => {
    expect(readRaw({ ...OBSERVED, eligible: 3 })).toBeUndefined();
  });

  it("refuses an eligible set bigger than the universe it was taken over", () => {
    // `readBreadth`'s rule, for its reason: the region draws *we could measure
    // N of M*, and a negative remainder counts securities that cannot exist.
    expect(readRaw({ ...OBSERVED, eligible: 600 })).toBeUndefined();
  });

  it("refuses the same symbol in both lists", () => {
    // Reachable whenever `eligible < 2N`, and it is the one failure here that
    // draws a visible contradiction: one row up among the gainers and the same
    // row down among the losers.
    expect(
      readRaw({ ...OBSERVED, losers: [mover("NVDA", -3.4)] }),
    ).toBeUndefined();
  });

  it("refuses a list that is not in the comparator's own order", () => {
    // **The strongest check available here**, and the only one that can tell a
    // ranked frame from a furnished one: the order is computed server-side, so
    // a reader that does not verify it is taking the order on trust from
    // exactly the place it cannot see.
    expect(
      readRaw({ ...OBSERVED, gainers: [...GAINERS].reverse() }),
    ).toBeUndefined();

    // And the losers' end is the same claim with the sign turned over —
    // weakest first, so the biggest fall leads.
    expect(
      readRaw({ ...OBSERVED, losers: [...LOSERS].reverse() }),
    ).toBeUndefined();
  });

  it("accepts a pair that is equal at DISPLAYED precision, in either order", () => {
    // The order is verified through `compareByMove`, which answers `0` for two
    // figures that read the same on screen — so ties keep the order they
    // arrived in and neither arrangement is a contradiction. A raw comparison
    // here would refuse one of these two frames and call a ranked list
    // furnished.
    const near = [mover("NVDA", 0.414), mover("AVGO", 0.409)];

    expect(readRaw({ ...OBSERVED, gainers: near })).toBeDefined();
    expect(
      readRaw({ ...OBSERVED, gainers: [...near].reverse() }),
    ).toBeDefined();
  });

  it("refuses a row with no ranking key at all", () => {
    // A top-N is a SELECTION. A keyless member is a figure placed by a `?? 0`,
    // which is ADR 0029's false impression expressed as a RANK POSITION —
    // mid-table, between +0.01% and -0.01%, claiming a security we have heard
    // nothing about did not move.
    expect(
      readRaw({
        ...OBSERVED,
        gainers: [...GAINERS, { state: "unknown", symbol: "ERIE" }],
      }),
    ).toBeUndefined();
  });

  it("refuses the whole list for ONE unreadable row, unlike the figure sections", () => {
    // `readFigures` drops one bad entry out of up to 518 because the frame is a
    // batch. A mover list is five rows whose order is the answer: dropping one
    // leaves a list that is still ranked, still well-formed, and no longer the
    // top five of anything.
    expect(
      readRaw({
        ...OBSERVED,
        gainers: [
          { state: "observed", symbol: "NVDA", at: OVERVIEW_AT, price: null },
          mover("AVGO", 2.8),
        ],
      }),
    ).toBeUndefined();
  });

  it("refuses a basis it cannot qualify — no window, no session, no name", () => {
    const windowless: Record<string, unknown> = { ...OBSERVED };
    delete windowless.windowMinutes;
    expect(readRaw(windowless)).toBeUndefined();

    const sessionless: Record<string, unknown> = { ...SESSION };
    delete sessionless.session;
    expect(readRaw(sessionless)).toBeUndefined();

    expect(readRaw({ ...OBSERVED, basis: "guessed" })).toBeUndefined();
  });

  it("does NOT refuse a gainer whose move is negative", () => {
    // **A product rule rather than a wire rule**, and the owner's Gate 1
    // decision settled it the other way: `selectMovers` decides each
    // candidate's end through the one classifier, so the lists are disjoint by
    // construction and a sign check here would be a SECOND classifier
    // asserting what the order check already covers.
    expect(
      readRaw({ ...OBSERVED, gainers: [mover("NVDA", -0.4)] }),
    ).toBeDefined();
  });
});

describe("a stored figure's completed-session move", () => {
  const storedFigure = (
    over: Partial<WireStoredFigure> = {},
  ): WireStoredFigure => ({
    state: "stored",
    symbol: "XLV",
    session: "2026-09-25",
    close: 140.2,
    ...over,
  });

  it("travels when it exists and is absent when it does not", () => {
    expect(
      encodeMarketStreamMessage(
        overviewMessage({
          sectors: [storedFigure({ sessionChangePercent: -0.42 })],
        }),
      ),
    ).toContain('"sessionChangePercent":-0.42');

    expect(
      encodeMarketStreamMessage(overviewMessage({ sectors: [storedFigure()] })),
    ).not.toContain("sessionChangePercent");
  });

  it("is OMITTED rather than nulled when it is not finite", () => {
    // `Infinity` reaches this wire as `null` through `JSON.stringify`, and a
    // `null` under a number is read as `0` by a lenient reader — a figure
    // claiming the session was flat. The serialiser owns the guarantee
    // (ADR 0031), not the call site.
    const wire = encodeMarketStreamMessage(
      overviewMessage({
        sectors: [
          storedFigure({ sessionChangePercent: Number.POSITIVE_INFINITY }),
        ],
      }),
    );
    expect(wire).not.toContain("sessionChangePercent");
    expect(wire).toContain('"close":140.2');
  });

  it("is dropped on the way in when it is not finite", () => {
    const decoded = decodeMarketStreamMessage(
      JSON.stringify({
        type: "overview",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        sentAt: SENT_AT,
        overview: {
          computedAt: OVERVIEW_AT,
          feeds: [],
          figures: [],
          sectors: [{ ...storedFigure(), sessionChangePercent: null }],
        },
      }),
    );
    if (decoded.kind !== "message" || decoded.message.type !== "overview") {
      throw new Error("expected an overview message");
    }
    expect(decoded.message.overview.sectors?.[0]).toEqual(storedFigure());
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
