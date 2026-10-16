import { describe, expect, it } from "vitest";

import { toTicker } from "./ticker.js";
import {
  MARKET_STREAM_PROTOCOL_VERSION,
  decodeMarketStreamClientMessage,
  decodeMarketStreamMessage,
  encodeMarketStreamClientMessage,
  encodeMarketStreamMessage,
  toWireObservation,
  toWireObservations,
  type BarsMessage,
  type FeedMessage,
  type OverviewMessage,
  type ReturnMessage,
  type SnapshotMessage,
  type WireMarketBreadth,
  type WireMarketMovers,
  type WireMarketOverview,
  type WireObservedBreadth,
  type WireObservedMovers,
  type WireOverviewFigure,
  type WireSessionBreadth,
  type WireSessionMovers,
  type WireMeasuredReturn,
  type WireReturnPercentile,
  type WireStoredFigure,
  type WireSymbolReturn,
  type WireUnusualActivity,
  type WireUnusualBaseline,
  type WireUnusualRow,
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

describe("the unusual-activity section, whose rows are an ORDINAL and the figures behind it", () => {
  const ROW: WireUnusualRow = {
    symbol: "NVDA",
    rank: 99,
    aboveSample: true,
    sampleCount: 4620,
    percent: -2.4137,
    from: { at: "2026-09-16T13:56:00.000Z", price: 178.42, feed: "iex" },
    to: { at: "2026-09-16T14:01:00.000Z", price: 174.11, feed: "iex" },
    observed: 5,
  };

  const SECTION: WireUnusualActivity = {
    basis: "observed",
    rows: [ROW],
    tracked: 501,
    eligible: 438,
    scored: 427,
    windowMinutes: 5,
    spanMinutes: 5,
    baseline: {
      feed: "sip",
      spanMinutes: 5,
      minimumSampleCount: 2500,
      generation: { session: "2026-09-11", lookbackSessions: 60 },
    },
    refusals: {
      figure: {
        "nothing-observed": 42,
        "no-earlier-endpoint": 19,
        "no-basis": 2,
      },
      comparison: { "too-few-samples": 11, "split-discontinuity": 0 },
    },
  };

  const roundTrip = (unusual: WireUnusualActivity): string =>
    encodeMarketStreamMessage(overviewMessage({ unusual }));

  it("does not emit a property hung off a nested ROW, an endpoint or the baseline", () => {
    // **Where ADR 0031's obligation is at risk on this section**, and it is
    // three objects deep. A row is built from a `MeasuredReturn` and a
    // `ReturnPercentile`: the first carries a whole `BarSource` per endpoint
    // (a `provider` that is not a claim about venues, a `retrievedAt` that is
    // a fact about this process) and the second a 101-point `breakpoints`
    // array. On HTTP all of it is stripped; on a socket nothing strips it.
    const leaky = {
      ...ROW,
      breakpoints: [0, 1, 2],
      from: {
        ...ROW.from,
        provider: "alpaca",
        retrievedAt: "2026-09-16T14:01:30.400Z",
      },
    } as unknown as WireUnusualRow;

    const wire = roundTrip({
      ...SECTION,
      rows: [leaky],
      baseline: {
        ...SECTION.baseline,
        // Not on `WireUnusualBaseline`.
        securityId: 4120,
      } as unknown as WireUnusualBaseline,
    });

    expect(wire).not.toContain("breakpoints");
    expect(wire).not.toContain("provider");
    expect(wire).not.toContain("retrievedAt");
    expect(wire).not.toContain("securityId");
    expect(wire).toContain('"symbol":"NVDA"');
    expect(wire).toContain('"rank":99');
  });

  it("carries the ordinal, both endpoints and the baseline's own tape", () => {
    const wire = roundTrip(SECTION);

    expect(wire).toContain('"rank":99');
    expect(wire).toContain('"aboveSample":true');
    expect(wire).toContain('"sampleCount":4620');
    expect(wire).toContain('"percent":-2.4137');
    expect(wire).toContain('"at":"2026-09-16T13:56:00.000Z"');
    expect(wire).toContain('"at":"2026-09-16T14:01:00.000Z"');
    // The numerator's tape per endpoint and the denominator's on the section:
    // every comparison this story ships is a consolidated-tape baseline
    // against a single-venue numerator, and the frame says so rather than
    // implying one tape per comparison.
    expect(wire).toContain('"feed":"iex"');
    expect(wire).toContain('"feed":"sip"');
  });

  it("carries no band, and never has", () => {
    // Gate 1 decision 1, as bytes. The four bands are defined for the
    // composite 0–100 score and this ranks one factor of four, so a chip here
    // would read `extreme` on price alone.
    const wire = roundTrip(SECTION);

    for (const band of ["normal", "elevated", "high", "extreme", "band"]) {
      expect(wire).not.toContain(band);
    }
  });

  it("counts the refusals by kind, with every word present at zero", () => {
    const wire = roundTrip(SECTION);

    // Each word is on the wire whatever its count, because an absent key and
    // a zero are different claims — *this gateway does not count that kind*
    // against *none of them refused that way* — and the arithmetic
    // `eligible − scored` is only readable beside a complete tally.
    expect(wire).toContain('"nothing-observed":42');
    expect(wire).toContain('"no-earlier-endpoint":19');
    expect(wire).toContain('"no-basis":2');
    expect(wire).toContain('"too-few-samples":11');
    expect(wire).toContain('"split-discontinuity":0');
  });

  it("omits the generation rather than writing a null for it", () => {
    const wire = roundTrip({
      ...SECTION,
      baseline: { feed: "sip", spanMinutes: 5, minimumSampleCount: 2500 },
    });

    // ADR 0029's defer rule as bytes: a cold replica has no generation to
    // name, and `JSON.stringify` would write `null` for one — which a lenient
    // reader turns into a session of `""` and a lookback of `0`.
    expect(wire).not.toContain("generation");
    expect(wire).not.toContain("null");
    expect(wire).toContain('"minimumSampleCount":2500');
  });

  it("drops the WHOLE section for a non-finite count, never a field and never a zero", () => {
    // `encodeBreadth`'s rule at a third grain. A `scored: null` reaches a
    // lenient reader as `0` — *we scored nothing* — beside rows that are
    // visibly there, and a `tracked: 0` makes the region's denominator
    // sentence say the product tracks nothing.
    for (const field of [
      "tracked",
      "eligible",
      "scored",
      "windowMinutes",
      "spanMinutes",
    ] as const) {
      const wire = roundTrip({ ...SECTION, [field]: Number.NaN });

      expect(wire).not.toContain("unusual");
      expect(wire).not.toContain("null");
    }

    const wire = roundTrip({
      ...SECTION,
      baseline: { ...SECTION.baseline, minimumSampleCount: Number.NaN },
    });

    expect(wire).not.toContain("unusual");
    expect(wire).not.toContain("null");
  });

  it("is ABSENT on a frame from a gateway that never heard of it", () => {
    // The rollback case, and the only reason the wire property is optional:
    // the producer's own input is required, so this gateway cannot build a
    // frame without the section — a rollback pinning a previous image can.
    const wire = encodeMarketStreamMessage(overviewMessage({}));

    expect(wire).not.toContain("unusual");
  });

  it("costs 389 B of section plus 232 B a row — 2,718 B at the ten rows this region ships", () => {
    // **Measured rather than estimated**, off this encoder.
    //
    // ## The figure the owner needs, because the row count moved
    //
    // `UNUSUAL_ROWS` went from five to ten on 2026-10-16 (Task 5.4.3, on the
    // measured 168 px void a five-row list left in a 491 px box), and the
    // section's cost is linear in it. **Taken at ten rather than projected
    // from five**, and the reading confirms the projection: **2,699 B**.
    //
    // | shape                          | bytes     |
    // | ------------------------------ | --------- |
    // | fixed section, no rows         | 370       |
    // | first row                      | 232       |
    // | five rows (`1,164` of rows)    | 1,534     |
    // | **ten rows (`2,329` of rows)** | **2,699** |
    //
    // Note `2,329` rather than `10 × 232 = 2,320`: **the comma between two
    // rows is a byte**, so the nine separators are nine bytes and a per-row
    // figure quoted without them under-reports a list. The same arithmetic
    // gives `1,164` at five rather than `1,160`.
    //
    // So a row is **232.9 B over ten** against the movers' measured 124.3 B,
    // which is 1.9x and is all `MeasuredReturn`'s own rule: a mover row is a
    // `WireOverviewFigure` of four or five short fields, and this row carries
    // an ordinal, a counted `n`, a move and **two timestamped endpoints with
    // a tape each** — 118 B of the 232 are the two endpoints.
    //
    // Gate 1's `223 B a row / 1,281 B at five` is superseded twice over: it
    // was taken on a shape carrying a `band`, and `1,281 / 5` is 256, so no
    // two of its own figures agree. AC 8's `~2.4 KB a section` presumed ten
    // rows and is, by luck, the closest of the three.
    //
    // The fixed cost is the part a reader of this test should notice: three
    // counts, two spans, the baseline block and five refusal words, paid on
    // **every** frame including every gated run, where all of it is zero for
    // ever. CI's shape — no rows, no generation, every count zero — is 303 B.
    //
    // **Re-measured 2026-10-16 (Task 5.4.5): the fixed cost is 389 B, up 19
    // from 370**, which is `"basis":"observed"` and nothing else. The
    // `session` arm is **393 B**, four more than the observed arm, because it
    // trades `windowMinutes: 5` for a ten-character date. Per-row figures are
    // unchanged: the
    // discriminant is one field per **section**, which is the whole of ADR
    // 0038's grain argument at the field level.
    const bare = roundTrip({ ...SECTION, rows: [] }).length;
    const one = roundTrip(SECTION).length;
    const rowsOf = (count: number) =>
      roundTrip({
        ...SECTION,
        // Distinct symbols, because `readUnusual` refuses a list that names
        // one security twice — a byte measurement over a frame the browser
        // would throw away is a measurement of nothing.
        rows: Array.from({ length: count }, (_, at) => ({
          ...ROW,
          symbol: `SYM${String(at)}`,
        })),
      }).length;

    const reference = encodeMarketStreamMessage(overviewMessage({})).length;

    expect(bare - reference).toBe(389);
    expect(one - bare).toBe(232);

    // **The session arm, measured rather than assumed to cost the same.** It
    // is the arm `/` is on for roughly 80% of the week.
    const session = roundTrip({
      basis: "session",
      rows: [],
      tracked: SECTION.tracked,
      eligible: SECTION.eligible,
      scored: SECTION.scored,
      spanMinutes: SECTION.spanMinutes,
      baseline: SECTION.baseline,
      refusals: SECTION.refusals,
      session: "2026-10-15",
    }).length;

    expect(session - reference).toBe(393);

    // Five and ten, both read rather than one read and one multiplied: the
    // comma between two rows is a byte, so `10 × 232` over-states by ten and
    // `5 × 232` by five.
    expect(rowsOf(5) - bare).toBe(1164);
    expect(rowsOf(10) - bare).toBe(2329);

    // **The whole section, as the owner's record needs it.**
    expect(rowsOf(10) - reference).toBe(2718);
  });

  // **The reader's half, added by Task 5.4.3** — the half Task 5.4.2
  // deliberately left out, where `readOverview` dropped the section on the
  // floor and nothing on screen could have said so.
  //
  // Every case below round-trips through the **shipped encoder** and then the
  // **shipped decoder**, so a producer that cannot build the shape cannot be
  // asserted about: the malformed sections are cast at the boundary, which is
  // exactly the licence a gateway from another image has.
  describe("and the reader, which refuses a section it cannot vouch for", () => {
    const decode = (unusual: unknown): WireMarketOverview | undefined => {
      const decoded = decodeMarketStreamMessage(
        encodeMarketStreamMessage(
          overviewMessage({ unusual: unusual as WireUnusualActivity }),
        ),
      );

      if (decoded.kind !== "message" || decoded.message.type !== "overview") {
        return undefined;
      }
      return decoded.message.overview;
    };

    /**
     * The same read, from a frame **this encoder cannot build**.
     *
     * Two of the shapes below are refused by the producer's own types before
     * they reach the wire — a row with no `from`, a section with no
     * `baseline` — so routing them through `encodeMarketStreamMessage` throws
     * in the encoder and asserts nothing about the reader. A gateway from
     * another image is under no such obligation, and the reader is what
     * stands between one and the screen.
     */
    const decodeRaw = (unusual: unknown): WireMarketOverview | undefined => {
      const decoded = decodeMarketStreamMessage(
        JSON.stringify({
          type: "overview",
          version: MARKET_STREAM_PROTOCOL_VERSION,
          sentAt: SENT_AT,
          overview: {
            computedAt: OVERVIEW_AT,
            feeds: ["iex"],
            figures: [],
            unusual,
          },
        }),
      );

      if (decoded.kind !== "message" || decoded.message.type !== "overview") {
        return undefined;
      }
      return decoded.message.overview;
    };

    const ranked = (rank: number, symbol: string): WireUnusualRow => ({
      ...ROW,
      symbol,
      rank,
    });

    it("reads a well-formed section whole", () => {
      expect(decode(SECTION)?.unusual).toEqual(SECTION);
    });

    it("reads the session arm whole, and keeps the two apart", () => {
      // **Task 5.4.5.** The two arms are two different claims — *this is what
      // is happening now* and *this is what happened at Friday's close* — and
      // the discriminant is the only thing that can tell a reader which one is
      // on screen. A process holding a stale trailing window and one holding
      // none must not draw the same region for different reasons.
      const session = {
        basis: "session",
        rows: SECTION.rows,
        tracked: SECTION.tracked,
        eligible: SECTION.eligible,
        scored: SECTION.scored,
        spanMinutes: SECTION.spanMinutes,
        baseline: SECTION.baseline,
        refusals: SECTION.refusals,
        session: "2026-10-15",
      } as const;

      expect(decode(session)?.unusual).toEqual(session);
      // And the window does not travel on it: *heard from in the last five
      // minutes* is not a sentence about a session that has ended.
      expect(decodeRaw(session)?.unusual).not.toHaveProperty("windowMinutes");
    });

    it("refuses a section with no basis, with an unknown one, or with no session", () => {
      // A frame from a **previous image** carries no basis at all, which a
      // rollback pins, and that is the absence the region already draws. It is
      // refused rather than defaulted: defaulting to either arm draws the
      // other one's figures under the wrong sentence.
      const basisless: Record<string, unknown> = { ...SECTION };
      delete basisless.basis;

      expect(decodeRaw(basisless)?.unusual).toBeUndefined();
      expect(decodeRaw({ ...SECTION, basis: "guessed" })?.unusual).toBe(
        undefined,
      );

      const counts: Record<string, unknown> = { ...SECTION };
      delete counts.windowMinutes;
      expect(
        decodeRaw({ ...counts, basis: "session" })?.unusual,
      ).toBeUndefined();
      expect(
        decodeRaw({ ...counts, basis: "session", session: "" })?.unusual,
      ).toBeUndefined();
    });

    it("refuses a list that is not in the comparator's own order", () => {
      // **Stronger than the movers' equivalent, and that is the tie-break
      // paying for itself**: `compareByPercentile` breaks ties on the ticker,
      // so a correct frame admits exactly ONE order and a swapped pair is a
      // defect rather than a tolerance.
      const ordered = {
        ...SECTION,
        rows: [ranked(99, "AVGO"), ranked(99, "NVDA"), ranked(97, "CRM")],
      };
      expect(decode(ordered)?.unusual?.rows).toHaveLength(3);

      const swapped = {
        ...SECTION,
        rows: [ranked(99, "NVDA"), ranked(99, "AVGO"), ranked(97, "CRM")],
      };
      expect(decode(swapped)?.unusual).toBeUndefined();

      const unranked = {
        ...SECTION,
        rows: [ranked(97, "AVGO"), ranked(99, "NVDA")],
      };
      expect(decode(unranked)?.unusual).toBeUndefined();
    });

    it("refuses a list that names one security twice", () => {
      // A symbol twice is the same list with a rank position invented, and
      // only a set comparison sees it. The pair is in the comparator's order,
      // so the check above cannot.
      expect(
        decode({
          ...SECTION,
          rows: [ranked(99, "NVDA"), ranked(99, "NVDA")],
        })?.unusual,
      ).toBeUndefined();
    });

    it("refuses counts that do not nest", () => {
      // `rows ≤ scored ≤ eligible ≤ tracked`. The only arithmetic the
      // region's cut sentence rests on: `eligible − scored` is the refused
      // count, and a negative remainder is a number of securities that
      // cannot exist.
      expect(decode({ ...SECTION, scored: 0 })?.unusual).toBeUndefined();
      expect(
        decode({ ...SECTION, eligible: 1, scored: 2 })?.unusual,
      ).toBeUndefined();
      expect(
        decode({ ...SECTION, tracked: 10, eligible: 11, scored: 11 })?.unusual,
      ).toBeUndefined();
    });

    it("refuses an ordinal outside the bound the figure can hold", () => {
      // **The check with the least help from the screen.** A `106th
      // percentile` draws as a confident, well-formed row, and nothing on
      // `/` can contradict it — the distribution behind it is 101 breakpoints
      // × 501 securities that no browser holds. `100th` is refused for the
      // same reason it is never printed: above the highest order statistic
      // there is no sample.
      for (const rank of [-1, 100, 106, 99.5, Number.NaN]) {
        expect(
          decode({ ...SECTION, rows: [{ ...ROW, rank }] })?.unusual,
        ).toBeUndefined();
      }
    });

    it("refuses a row ranked against no sample at all", () => {
      expect(
        decode({ ...SECTION, rows: [{ ...ROW, sampleCount: 0 }] })?.unusual,
      ).toBeUndefined();
    });

    it("refuses a row with no endpoints, because an ordinal with no instant is undatable", () => {
      const noFrom: Record<string, unknown> = { ...ROW };
      delete noFrom.from;
      expect(
        decodeRaw({ ...SECTION, rows: [noFrom] })?.unusual,
      ).toBeUndefined();
    });

    it("refuses a baseline whose tape this bundle cannot name", () => {
      // Invariant 6: a comparison we cannot attribute is one the region may
      // not draw. The numerator's tape is checked per endpoint for the same
      // reason, one object down.
      expect(
        decode({
          ...SECTION,
          baseline: { ...SECTION.baseline, feed: "nasdaq-basic" },
        })?.unusual,
      ).toBeUndefined();
    });

    it("refuses a tally with a refusal word missing, rather than reading it as zero", () => {
      // A `Record` over a closed vocabulary is what makes a new refusal word
      // a compile error at the producer; the reader's half is that a missing
      // word is the gateway's silence rather than a count. The surface
      // subtracts these from each other.
      expect(
        decode({
          ...SECTION,
          refusals: {
            ...SECTION.refusals,
            comparison: { "too-few-samples": 11 },
          },
        })?.unusual,
      ).toBeUndefined();
    });

    it("keeps a baseline whose GENERATION is malformed, because absent is a state", () => {
      // The pair is *both or neither* on the producer and a cold replica has
      // neither — so an unreadable generation is read as no generation and
      // the section survives, which is `seen`'s rule one wire over. Losing
      // the whole section here would put the region back on *no frame has
      // arrived*, a different and false claim.
      const decoded = decode({
        ...SECTION,
        baseline: {
          ...SECTION.baseline,
          generation: { session: "2026-09-11" },
        },
      });

      expect(decoded?.unusual?.rows).toHaveLength(1);
      expect(decoded?.unusual?.baseline.generation).toBeUndefined();
    });

    it("reads an ABSENT section as absent and a MALFORMED one as the same absence", () => {
      // `readMovers`' rule: a frame from a previous image carries no section
      // at all, and an unreadable one is the same absence rather than a
      // discarded frame carrying four true prices. Both draw the region's own
      // sentence rather than a ranking of nothing.
      expect(decode(undefined)?.unusual).toBeUndefined();
      expect(decodeRaw({ rows: [] })?.unusual).toBeUndefined();
      expect(decode(SECTION)?.computedAt).toBe(OVERVIEW_AT);
      expect(decodeRaw({ rows: [] })?.computedAt).toBe(OVERVIEW_AT);
    });
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

describe("the fifth message type, which is about ONE security", () => {
  // **`WireMeasuredReturn` rather than `WireSymbolReturn`**, so the endpoints
  // are reachable without narrowing at every use. Added 2026-10-14 with the
  // percentile: the union's `keyof` is the intersection of its members', which
  // is the same reason `measuredReturnFields` is its own map.
  const MEASURED: WireMeasuredReturn = {
    measured: true,
    percent: 0.4201680672268908,
    from: { at: "2026-10-14T18:01:00.000Z", price: 119, feed: "iex" },
    to: { at: "2026-10-14T18:06:00.000Z", price: 119.5, feed: "iex" },
    observed: 3,
    spanMinutes: 5,
    // **No baseline to compare it with**, which is the ordinary state and CI's
    // permanent one. The percentile's own frames are below.
    percentile: null,
  };

  /** A baseline comparison, as the gateway sends one (Task 5.3.3). */
  const PERCENTILE: WireReturnPercentile = {
    ranked: true,
    rank: 99,
    aboveSample: false,
    sampleCount: 4620,
    spanMinutes: 5,
    feed: "sip",
  };

  const frame = (figure: WireSymbolReturn): ReturnMessage => ({
    type: "return",
    version: MARKET_STREAM_PROTOCOL_VERSION,
    sentAt: "2026-10-14T18:06:00.500Z",
    symbol: "NVDA",
    return: figure,
  });

  it("round-trips a measured figure with both endpoints and both tapes", () => {
    const decoded = decodeMarketStreamMessage(
      encodeMarketStreamMessage(frame(MEASURED)),
    );

    expect(decoded.kind).toBe("message");
    expect(decoded.kind === "message" && decoded.message).toEqual(
      frame(MEASURED),
    );
  });

  it("round-trips each of the three refusals", () => {
    for (const refusal of [
      "nothing-observed",
      "no-earlier-endpoint",
      "no-basis",
    ] as const) {
      const decoded = decodeMarketStreamMessage(
        encodeMarketStreamMessage(
          frame({ measured: false, refusal, seen: null }),
        ),
      );

      expect(decoded.kind === "message" && decoded.message).toEqual(
        frame({ measured: false, refusal, seen: null }),
      );
    }
  });

  it("round-trips what the window DID hold beside a refusal", () => {
    // Task 5.2.4. *One bar and no pair* and *nothing at all* are two refusals
    // whose words differ by four; the **shape** differs too, so the surface
    // can print the one instant it has rather than drawing the same picture
    // for both.
    const figure: WireSymbolReturn = {
      measured: false,
      refusal: "no-earlier-endpoint",
      seen: {
        newest: { at: "2026-10-14T18:06:00.000Z", price: 119.5, feed: "iex" },
        observed: 1,
        spanMinutes: 5,
      },
    };

    const decoded = decodeMarketStreamMessage(
      encodeMarketStreamMessage(frame(figure)),
    );

    expect(decoded.kind === "message" && decoded.message).toEqual(
      frame(figure),
    );
  });

  it("keeps the refusal when the span beside it cannot be read", () => {
    // **The refusal is the fact and the span is what was held beside it**, so
    // a gateway that predates the field — or one whose span is malformed —
    // draws the sentence without the clause. Throwing the frame away would put
    // the region back on *no frame has arrived*, which is a different and
    // false claim.
    for (const seen of [
      undefined,
      "soon",
      { observed: 1 },
      { newest: {}, observed: 1, spanMinutes: 5 },
    ]) {
      const decoded = decodeMarketStreamMessage(
        JSON.stringify({
          ...frame({
            measured: false,
            refusal: "no-earlier-endpoint",
            seen: null,
          }),
          return: { measured: false, refusal: "no-earlier-endpoint", seen },
        }),
      );

      expect(
        decoded.kind === "message" &&
          decoded.message.type === "return" &&
          decoded.message.return,
      ).toEqual({
        measured: false,
        refusal: "no-earlier-endpoint",
        seen: null,
      });
    }
  });

  it("strips a field the type does not declare", () => {
    // The serialiser walks the MAP's keys, which is what makes a leak
    // impossible on a socket nothing narrows. The internal shape this guards
    // against is the backend's `ReturnEndpoint`, which carries a whole
    // `BarSource` — a provider and a retrieval instant, neither of which is a
    // claim about venues.
    const leaky = {
      ...frame(MEASURED),
      return: {
        ...MEASURED,
        from: { ...MEASURED.from, retrievedAt: "2026-10-14T18:02:00.000Z" },
      },
    } as ReturnMessage;

    expect(encodeMarketStreamMessage(leaky)).not.toContain("retrievedAt");
  });

  it("round-trips a percentile, and the five fields it carries", () => {
    // Task 5.3.3. The rank is the only one of the five a reader could sanity
    // check from the screen, so the other four are asserted here: without the
    // counted `n` a 99th of 737 and a 99th of 4,620 are one claim, and without
    // the tape every comparison silently inherits the numerator's venue.
    const decoded = decodeMarketStreamMessage(
      encodeMarketStreamMessage(frame({ ...MEASURED, percentile: PERCENTILE })),
    );

    expect(decoded.kind === "message" && decoded.message).toEqual(
      frame({ ...MEASURED, percentile: PERCENTILE }),
    );
  });

  it.each([
    ["a rank above the ceiling", { rank: 100 }],
    ["a rank below the floor", { rank: -1 }],
    ["a fractional rank", { rank: 99.1 }],
    ["a non-finite rank", { rank: null }],
    ["an empty sample", { sampleCount: 0 }],
    ["a non-finite sample", { sampleCount: null }],
    ["no span", { spanMinutes: 0 }],
    ["a tape this bundle cannot name", { feed: "lse" }],
    ["no ceiling flag", { aboveSample: undefined }],
  ])(
    "reads %s as NO percentile, and keeps the figure",
    (_label, over: Record<string, unknown>) => {
      // **A percentile is the one figure on this frame nobody can eyeball.** A
      // `140th percentile`, a `99.1st` the sample cannot resolve or an `n` of
      // zero would each draw as a confident, well-formed claim — so the bounds
      // are the decoder's, and anything outside them is *no comparison* rather
      // than a number.
      //
      // **And the figure survives**, because the return is true whatever the
      // comparison beside it was: refusing the frame would put the region back
      // on *no frame has arrived*, which is a different and false claim.
      const decoded = decodeMarketStreamMessage(
        JSON.stringify({
          ...frame(MEASURED),
          return: { ...MEASURED, percentile: { ...PERCENTILE, ...over } },
        }),
      );

      expect(decoded.kind === "message" && decoded.message.type).toBe("return");
      expect(
        decoded.kind === "message" &&
          decoded.message.type === "return" &&
          decoded.message.return.measured &&
          decoded.message.return.percentile,
      ).toBeNull();
      expect(
        decoded.kind === "message" &&
          decoded.message.type === "return" &&
          decoded.message.return.measured &&
          decoded.message.return.percent,
      ).toBe(MEASURED.percent);
    },
  );

  it("carries a REFUSED comparison round trip, with both of its numbers", () => {
    // **The arm that says *we will not compare this*** (Task 5.3.4). Both
    // numbers are on the frame because both are drawn: the counted `n` the
    // baseline reached, and the bound **the producer applied** rather than the
    // one this bundle believes in — a rollback can put a gateway and a bundle
    // two values apart.
    const refused = {
      ranked: false,
      refusal: "too-few-samples",
      sampleCount: 737,
      minimumSampleCount: 2500,
    } as const;

    const decoded = decodeMarketStreamMessage(
      encodeMarketStreamMessage(frame({ ...MEASURED, percentile: refused })),
    );

    expect(decoded.kind === "message" && decoded.message).toEqual(
      frame({ ...MEASURED, percentile: refused }),
    );
  });

  it("carries a sample count of ZERO on a refusal, which no rank may have", () => {
    // `0 of 2,500 returns` is the true sentence about a cold replica and about
    // every security on CI — so `0` is legal on this arm and refused on the
    // ranked one, where a distribution claiming no samples has no order
    // statistics to have produced it.
    const decoded = decodeMarketStreamMessage(
      encodeMarketStreamMessage(
        frame({
          ...MEASURED,
          percentile: {
            ranked: false,
            refusal: "too-few-samples",
            sampleCount: 0,
            minimumSampleCount: 2500,
          },
        }),
      ),
    );

    expect(
      decoded.kind === "message" &&
        decoded.message.type === "return" &&
        decoded.message.return.measured &&
        decoded.message.return.percentile !== null &&
        !decoded.message.return.percentile.ranked &&
        decoded.message.return.percentile.sampleCount,
    ).toBe(0);
  });

  it.each([
    ["a refusal word this bundle cannot name", { refusal: "no-sip-history" }],
    ["no refusal word at all", { refusal: undefined }],
    ["a negative sample", { sampleCount: -1 }],
    ["a fractional sample", { sampleCount: 737.5 }],
    ["no bound", { minimumSampleCount: 0 }],
  ])(
    "reads %s as NO comparison, and keeps the figure",
    (_label, over: Record<string, unknown>) => {
      // **A refusal we cannot name is not a refusal to draw.** The surface
      // picks its sentence from this word through a total record, so a third
      // refusal from a newer gateway has no sentence in this bundle — and the
      // honest answer is the one the region draws when it was told nothing,
      // rather than a blank where a reason should be.
      const decoded = decodeMarketStreamMessage(
        JSON.stringify({
          ...frame(MEASURED),
          return: {
            ...MEASURED,
            percentile: {
              ranked: false,
              refusal: "too-few-samples",
              sampleCount: 737,
              minimumSampleCount: 2500,
              ...over,
            },
          },
        }),
      );

      expect(
        decoded.kind === "message" &&
          decoded.message.type === "return" &&
          decoded.message.return.measured &&
          decoded.message.return.percentile,
      ).toBeNull();
      expect(
        decoded.kind === "message" &&
          decoded.message.type === "return" &&
          decoded.message.return.measured &&
          decoded.message.return.percent,
      ).toBe(MEASURED.percent);
    },
  );

  it("reads a comparison that does not say WHICH it is as no comparison", () => {
    // A frame from before the discriminant existed carries a `rank` and no
    // `ranked`. It is read as *nothing was said* rather than as a rank,
    // because the alternative is this bundle guessing that a record it does
    // not recognise was meant to be drawn — and the next field added to the
    // refused arm would then be read as a rank of `undefined`.
    const older: Record<string, unknown> = { ...PERCENTILE };
    delete older.ranked;

    const decoded = decodeMarketStreamMessage(
      JSON.stringify({
        ...frame(MEASURED),
        return: { ...MEASURED, percentile: older },
      }),
    );

    expect(
      decoded.kind === "message" &&
        decoded.message.type === "return" &&
        decoded.message.return.measured &&
        decoded.message.return.percentile,
    ).toBeNull();
  });

  it("reads a frame from a gateway that predates the field as no percentile", () => {
    // The deploy rolls the backend first, but a **rollback pins a previous
    // image** — so a new bundle meeting a gateway with no `percentile` key at
    // all is the ordinary case rather than a broken one. Absent and `null` are
    // one answer for that reason.
    const older: Record<string, unknown> = { ...MEASURED };
    delete older.percentile;

    const decoded = decodeMarketStreamMessage(
      JSON.stringify({ ...frame(MEASURED), return: older }),
    );

    expect(
      decoded.kind === "message" &&
        decoded.message.type === "return" &&
        decoded.message.return.measured &&
        decoded.message.return.percentile,
    ).toBeNull();
  });

  it("measures 316 bytes for a figure, 405 with a percentile, 400–405 with a refused one, and 153 or 249 for a refused figure", () => {
    // **The number the Gate 1 decision is read against**, measured here rather
    // than quoted: the rejected alternative — a field on every observation —
    // is +54,525 B a frame at 516 subscribed, so this is a factor of **183**
    // rather than the 221 B / 247× the brief estimated. The estimate did not
    // carry two endpoints' tapes or a full-precision percentage.
    // `TextEncoder` rather than `Buffer`: this package has no Node types on
    // purpose — it is the one both the server and the browser import.
    const bytes = (message: ReturnMessage): number =>
      new TextEncoder().encode(encodeMarketStreamMessage(message)).length;

    // **298 → 316 B on 2026-10-14** (Task 5.3.3): `,"percentile":null` is 18 B
    // on every measured frame, and a frame carrying the comparison is
    // **405 B** — **391 → 405 on 2026-10-14** (Task 5.3.4), the 14 B being
    // `"ranked":true,`, the discriminant that made the member a union.
    // The frame is sent once per subscribe and once per applied batch for the
    // **one** focused security, so the ratio Gate 1 decision 1 was taken on —
    // against +54,525 B a frame at 516 subscribed — is untouched: 405 B is a
    // factor of **135**.
    expect(bytes(frame(MEASURED))).toBe(316);
    expect(bytes(frame({ ...MEASURED, percentile: PERCENTILE }))).toBe(405);

    // **A REFUSED comparison costs what a ranked one costs** — 400 B for the
    // sample refusal and 405 B for the price-break one — which is the measured
    // answer to *is it cheaper to send nothing and let the browser say
    // nothing*. It is not: the saving is 84–89 B on a frame sent once per
    // applied batch for one security, against a reader who cannot otherwise
    // tell *we have not compared this* from *we will not*.
    expect(
      bytes(
        frame({
          ...MEASURED,
          percentile: {
            ranked: false,
            refusal: "too-few-samples",
            sampleCount: 737,
            minimumSampleCount: 2500,
          },
        }),
      ),
    ).toBe(400);
    expect(
      bytes(
        frame({
          ...MEASURED,
          percentile: {
            ranked: false,
            refusal: "split-discontinuity",
            sampleCount: 4620,
            minimumSampleCount: 2500,
          },
        }),
      ),
    ).toBe(405);
    // **The refusal grew on 2026-10-14** (Task 5.2.4): 141 → **153 B** with
    // nothing observed (`"seen":null`) and **249 B** carrying the one instant
    // it has. The figure is unchanged at 298, and the frame is sent once per
    // subscribe and once per applied batch **for the one focused security**, so
    // the ratio the Gate 1 decision was taken on — against +54,525 B a frame
    // at 516 subscribed — is untouched.
    expect(
      bytes(
        frame({ measured: false, refusal: "no-earlier-endpoint", seen: null }),
      ),
    ).toBe(153);
    expect(
      bytes(
        frame({
          measured: false,
          refusal: "no-earlier-endpoint",
          seen: {
            newest: {
              at: "2026-10-14T18:06:00.000Z",
              price: 119.5,
              feed: "iex",
            },
            observed: 1,
            spanMinutes: 5,
          },
        }),
      ),
    ).toBe(249);
  });

  it.each([
    ["no symbol", { symbol: undefined }],
    [
      "a refusal this bundle cannot name",
      { return: { measured: false, refusal: "weather", seen: null } },
    ],
    [
      "an unreadable tape",
      { return: { ...MEASURED, from: { ...MEASURED.from, feed: "lse" } } },
    ],
    [
      "a non-finite price",
      { return: { ...MEASURED, to: { ...MEASURED.to, price: null } } },
    ],
    ["one endpoint", { return: { ...MEASURED, from: undefined } }],
  ])("refuses a frame with %s rather than drawing half of one", (_l, over) => {
    const decoded = decodeMarketStreamMessage(
      JSON.stringify({ ...frame(MEASURED), ...over }),
    );

    expect(decoded.kind).toBe("unreadable");
  });

  it("carries a focus on the subscription, and omits it where there is none", () => {
    const focused = encodeMarketStreamClientMessage({
      type: "subscribe",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      symbols: ["NVDA", "AAPL"],
      focus: "NVDA",
    });

    expect(JSON.parse(focused)).toEqual({
      type: "subscribe",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      symbols: ["NVDA", "AAPL"],
      focus: "NVDA",
    });

    // **Omission rather than `null`**, which is this module's rule for absence
    // and is what keeps *this screen is about none of them* unambiguous.
    const unfocused = encodeMarketStreamClientMessage({
      type: "subscribe",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      symbols: ["NVDA"],
    });

    expect(Object.keys(JSON.parse(unfocused) as object)).not.toContain("focus");

    const decoded = decodeMarketStreamClientMessage(focused);
    expect(decoded.message?.focus).toBe("NVDA");
  });

  it("keeps the SUBSCRIPTION when the focus is unreadable", () => {
    // The subscription is the valuable half — a browser whose focus field was
    // mangled must still receive its 516 prices — and a missing figure is a
    // state the region draws honestly.
    const decoded = decodeMarketStreamClientMessage(
      JSON.stringify({
        type: "subscribe",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        symbols: ["NVDA"],
        focus: 7,
      }),
    );

    expect(decoded.kind).toBe("message");
    expect(decoded.message?.symbols).toEqual(["NVDA"]);
    expect(decoded.message?.focus).toBeUndefined();
  });
});
