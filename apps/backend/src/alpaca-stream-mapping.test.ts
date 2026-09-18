import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ALPACA_STREAM_FEED,
  observationsIn,
  toMappedFrame,
  toMappedFrames,
  toStreamBarSource,
} from "./alpaca-stream-mapping.js";
import { parseAlpacaBarsBody, toBarsFromAlpacaPage } from "./alpaca-mapping.js";
import type { LiveObservation } from "./market-data-stream.js";

const CORPUS = join(import.meta.dirname, "fixtures", "alpaca-stream");

/** Every test below reads a FIXTURE. Nothing here hand-writes a vendor frame. */
const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(join(CORPUS, `${name}.json`), "utf8"));

const RETRIEVED = "2026-09-16T14:02:00.000Z";

const only = (name: string) => {
  const frames = toMappedFrames(fixture(name), RETRIEVED);
  expect(frames).toHaveLength(1);
  const [frame] = frames;
  if (frame === undefined) throw new Error(`${name} produced no frame`);
  return frame;
};

const observation = (name: string) => {
  const frame = only(name);
  if (frame.kind !== "observation") {
    throw new Error(`${name} mapped to ${frame.kind}`);
  }
  return frame.observation;
};

describe("a bar frame", () => {
  it("maps to a Bar with startsAt taking `t` UNSHIFTED", () => {
    // §7.3 confirmed with an HTTP control that `t` marks the interval's START
    // on the stream too. A mapping that shifted would put every live bar a
    // minute out, silently, on every surface at once.
    const { bar } = observation("bar-nvda");

    expect(bar.startsAt.toISOString()).toBe("2026-09-16T14:01:00.000Z");
    expect(bar).toEqual({
      startsAt: new Date("2026-09-16T14:01:00Z"),
      open: 214.88,
      high: 214.895,
      low: 214.555,
      close: 214.75,
      volume: 5184,
    });
  });

  it("produces the SAME Bar the HTTP client produces for the same minute", () => {
    // Acceptance criterion 3. This is stronger than two implementations
    // agreeing: `toBar` is EXPORTED from alpaca-mapping.ts and reused, so there
    // is one implementation and this test is a regression guard on that staying
    // true rather than on two things matching.
    const streamed = observation("bar-nvda").bar;

    const asHttpBody = parseAlpacaBarsBody({
      bars: {
        NVDA: [
          {
            t: "2026-09-16T14:01:00Z",
            o: 214.88,
            h: 214.895,
            l: 214.555,
            c: 214.75,
            v: 5184,
          },
        ],
      },
      next_page_token: null,
    });
    const fetched = toBarsFromAlpacaPage(asHttpBody, "NVDA")[0];

    expect(streamed).toEqual(fetched);
  });

  it("does not supersede anything", () => {
    expect(observation("bar-nvda").supersedes).toBe(false);
  });

  it("stamps iex, and the retrievedAt it was GIVEN", () => {
    const { source } = observation("bar-nvda");

    expect(source.provider).toBe("alpaca");
    expect(source.feed).toBe("iex");
    expect(source.retrievedAt).toBe(RETRIEVED);
  });
});

describe("the revision case — a replacement, not a duplicate", () => {
  // The one place in this story where doing nothing is ACTIVELY wrong: a client
  // that appends produces two bars for one minute, one that ignores `u` is
  // quietly wrong for ever. Neither is what the owner decided (§7.11).
  it.each(["bar-nvda-revision-volume-only", "bar-nvda-revision-close-changed"])(
    "%s says it supersedes",
    (name) => {
      expect(observation(name).supersedes).toBe(true);
    },
  );

  it("supersedes the SAME (symbol, minute) as the bar it corrects", () => {
    const original = observation("bar-nvda");
    const revision = observation("bar-nvda-revision-close-changed");

    expect(revision.symbol).toBe(original.symbol);
    expect(revision.bar.startsAt).toEqual(original.bar.startsAt);
    // …and is a different bar, or there would be nothing to replace.
    expect(revision.bar).not.toEqual(original.bar);
  });

  it("carries a corrected close through unchanged", () => {
    // §14.1 measured 35.3% of revisions changing the close at universe scale,
    // and NONE changing nothing at all. The close is the field that matters:
    // ignoring `u` means being a few cents wrong for ever with no way to know
    // which bar.
    expect(observation("bar-nvda-revision-close-changed").bar.close).toBe(
      214.71,
    );
    expect(observation("bar-nvda").bar.close).toBe(214.75);
  });

  it("maps a volume-only revision without touching the close", () => {
    const original = observation("bar-nvda").bar;
    const revised = observation("bar-nvda-revision-volume-only").bar;

    expect(revised.close).toBe(original.close);
    expect(revised.volume).toBeGreaterThan(original.volume);
  });

  it("is otherwise mapped identically to a `b` — same shape, same Bar fields", () => {
    // The ONLY difference a caller should see is `supersedes`. If `u` mapped
    // through a different path, a revision could silently disagree with the bar
    // it replaces about a field neither changed.
    const withoutBarOrFlag = (o: LiveObservation) => ({
      symbol: o.symbol,
      source: o.source,
    });
    const revision = observation("bar-nvda-revision-volume-only");

    expect(revision.supersedes).toBe(true);
    expect(withoutBarOrFlag(revision)).toEqual(
      withoutBarOrFlag(observation("bar-nvda")),
    );
  });
});

describe("frames that are not bars", () => {
  it.each([
    ["greeting", "success"],
    ["authenticated", "success"],
    ["subscription-ack-three", "subscription"],
    ["subscription-ack-empty", "subscription"],
    ["error-400-invalid-syntax", "error"],
    ["error-402-auth-failed", "error"],
    ["error-406-connection-limit-exceeded", "error"],
    ["error-409-insufficient-subscription", "error"],
  ])("%s is IGNORED rather than unmappable", (name, messageType) => {
    // §4.4: nine bad requests produced nine frames on a connection that
    // survived all of them. A frame that is not a bar is routine traffic, not
    // an error — and calling it unmappable would make an error frame look like
    // a defect in our parser.
    const frame = only(name);

    expect(frame.kind).toBe("ignored");
    expect(frame.kind === "ignored" && frame.messageType).toBe(messageType);
  });

  it("yields no observations from a whole error message", () => {
    expect(
      observationsIn(
        toMappedFrames(fixture("error-402-auth-failed"), RETRIEVED),
      ),
    ).toHaveLength(0);
  });
});

describe("what is rejected rather than coerced", () => {
  // `fast-json-stringify`'s lesson one layer up: a `null` under a numeric field
  // reaches the wire as `0`, A PLAUSIBLE PRICE. A defaulted Bar looks like
  // data, charts, and says nowhere that it was invented.
  const bar = {
    T: "b",
    S: "NVDA",
    o: 214.88,
    h: 214.895,
    l: 214.555,
    c: 214.75,
    v: 5184,
    t: "2026-09-16T14:01:00Z",
  };

  it.each(["o", "h", "l", "c", "v"])(
    "refuses a null `%s` rather than defaulting it to 0",
    (field) => {
      const frame = toMappedFrame({ ...bar, [field]: null }, RETRIEVED);

      expect(frame.kind).toBe("unmappable");
      expect(frame.kind === "unmappable" && frame.reason).toContain(field);
    },
  );

  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])("refuses a %s close, which `typeof` alone would admit", (_name, close) => {
    expect(toMappedFrame({ ...bar, c: close }, RETRIEVED).kind).toBe(
      "unmappable",
    );
  });

  it("refuses an unreadable `t` rather than producing an Invalid Date", () => {
    expect(toMappedFrame({ ...bar, t: "not a date" }, RETRIEVED).kind).toBe(
      "unmappable",
    );
  });

  it("refuses a malformed ticker rather than throwing", () => {
    // §4.4: Alpaca does NOT validate symbols — `ZZQQTESTX` was accepted and
    // echoed back as held. `toTicker` throws; this path must not, or one bad
    // symbol tears down a connection carrying 517 good ones.
    const frame = toMappedFrame({ ...bar, S: "ZZQQTESTX" }, RETRIEVED);

    expect(frame.kind).toBe("unmappable");
    expect(frame.kind === "unmappable" && frame.reason).toContain("ZZQQTESTX");
  });

  it("never throws, whatever it is handed", () => {
    for (const rubbish of [null, 42, "a string", [], {}, { T: 7 }]) {
      expect(() => toMappedFrame(rubbish, RETRIEVED)).not.toThrow();
    }
  });

  it("keeps a good bar in a message that also holds a bad one", () => {
    // Batched because the vendor batches (§7.2). One malformed bar for one
    // symbol is not a reason to discard a good bar for another.
    const frames = toMappedFrames(
      [bar, { ...bar, S: "SPY", c: null }],
      RETRIEVED,
    );

    expect(frames.map((f) => f.kind)).toEqual(["observation", "unmappable"]);
    expect(observationsIn(frames)).toHaveLength(1);
  });
});

describe("zero volume is real", () => {
  it("maps a zero-volume bar rather than rejecting it", () => {
    // §7.2: a quiet minute produces no frame at all rather than a zero-volume
    // bar — but when one arrives it is a fact about the market, not an error.
    const frame = toMappedFrame(
      {
        T: "b",
        S: "ERIE",
        o: 1,
        h: 1,
        l: 1,
        c: 1,
        v: 0,
        t: "2026-09-16T14:01:00Z",
      },
      RETRIEVED,
    );

    expect(frame.kind).toBe("observation");
    expect(frame.kind === "observation" && frame.observation.bar.volume).toBe(
      0,
    );
  });
});

describe("the feed cannot be sip", () => {
  it("narrows the DESTINATION type, not just the constant", () => {
    // **The first attempt at this guard did not work, and that is why this test
    // exists in this shape.** `ALPACA_STREAM_FEED` was already
    // `"iex" as const satisfies MarketFeed` — but `BarSource.feed` is the wide
    // `MarketFeed`, so writing `feed: "sip"` directly into
    // `toStreamBarSource` still compiled. Verified by substituting it.
    //
    // The fix was to narrow what the function RETURNS. Substituting `"sip"` now
    // fails with TS2322 — `Type '"sip"' is not assignable to type '"iex"'`.
    // This assertion is the cheap half: it fails if `StreamBarSource` is ever
    // widened back to a plain `BarSource`.
    const source = toStreamBarSource(RETRIEVED);
    const feed: "iex" = source.feed;

    expect(feed).toBe("iex");
  });

  it("is the literal `iex`, not the wide MarketFeed", () => {
    // Acceptance criterion 4, and the guard is the TYPE rather than this test:
    // `ALPACA_STREAM_FEED` is `"iex" as const satisfies MarketFeed`, so
    // assigning "sip" downstream is a compile error. This asserts the value so
    // that widening the constant's type is also a red test.
    const feed: "iex" = ALPACA_STREAM_FEED;

    expect(feed).toBe("iex");
    expect(toStreamBarSource(RETRIEVED).feed).toBe("iex");
  });

  it("stamps iex on every observation the corpus can produce", () => {
    for (const name of [
      "bar-nvda",
      "bar-nvda-revision-volume-only",
      "bar-nvda-revision-close-changed",
    ]) {
      expect(observation(name).source.feed).not.toBe("sip");
      expect(observation(name).source.feed).toBe("iex");
    }
  });
});

describe("purity", () => {
  it("reads no clock — the same frame maps identically twice", () => {
    expect(toMappedFrame(fixture("bar-nvda"), RETRIEVED)).toEqual(
      toMappedFrame(fixture("bar-nvda"), RETRIEVED),
    );
  });

  it("takes retrievedAt as an argument rather than stamping one", () => {
    const early = toMappedFrame(
      (fixture("bar-nvda") as unknown[])[0],
      "2020-01-01T00:00:00.000Z",
    );

    expect(
      early.kind === "observation" && early.observation.source.retrievedAt,
    ).toBe("2020-01-01T00:00:00.000Z");
  });
});
