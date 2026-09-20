import { marketDateAt, marketSessionOn } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import {
  STREAM_SYMBOLS,
  createMarketStream,
  defaultReplayStartForTest,
} from "./market-stream.js";
import type { Config } from "./config.js";
import type { MarketBarsRepository } from "./market-bars.js";
import { ReplayDuringSessionError } from "./replay-stream.js";

/** 03:00 ET on a Saturday. */
const SHUT = Date.parse("2026-09-19T07:00:00Z");
/** 10:30 ET on a Wednesday. */
const OPEN = Date.parse("2026-09-16T14:30:00Z");

const bars = {
  readBars: () => Promise.resolve([]),
} as unknown as MarketBarsRepository;

const configWith = (overrides: Partial<Config>): Config =>
  ({ marketDataProvider: "none", ...overrides }) as Config;

describe("what the configuration selects", () => {
  it("serves NOTHING by default", () => {
    // `PROVIDER.md` §5.3, and the most important line in this file: invented
    // prices must never be reachable by forgetting to configure something.
    expect(createMarketStream(configWith({}), { bars })).toBeUndefined();
  });

  it("builds a fixture stream, stamped synthetic", () => {
    const stream = createMarketStream(
      configWith({ marketDataProvider: "fixture" }),
      { bars },
    );

    expect(stream?.id).toBe("fixture");
    expect(stream?.feed).toBe("synthetic");
  });

  it("builds an alpaca stream on iex", () => {
    const stream = createMarketStream(
      configWith({
        marketDataProvider: "alpaca",
        alpaca: { keyId: "k", secretKey: "s" },
      }),
      { bars },
    );

    expect(stream?.id).toBe("alpaca");
    expect(stream?.feed).toBe("iex");
  });

  it("builds a replay when the market is shut", () => {
    const stream = createMarketStream(
      configWith({ marketDataProvider: "replay" }),
      {
        bars,
        replayFrom: new Date("2026-09-16T13:30:00Z"),
        wallNow: () => SHUT,
      },
    );

    expect(stream?.id).toBe("replay");
    expect(stream?.feed).toBe("replay");
  });
});

describe("the asymmetry between a refused replay and a refused socket", () => {
  // **The decision this file is most likely to be read for**, and the two
  // answers differ on purpose.

  it("THROWS for a replay, because a developer must not be misled", () => {
    // ADR 0030 §7f: the case this catches is somebody who left
    // MARKET_DATA_PROVIDER=replay in their `.env` and is about to build against
    // a recording while believing they are on the live feed. A replay that
    // quietly did not start would leave them in exactly that state.
    //
    // `createReplayStream` refuses at `subscribe()`, so the throw arrives when
    // the process starts it rather than when it is built — which is the
    // behaviour `index.ts` catches and exits on.
    // **The clock is injected, because a test that depends on what time it runs
    // is not a test.** The first draft of this one passed outside market hours
    // and failed inside them, which is how `market-stream.ts` gained a
    // `wallNow` — it was the only module in this story reading one implicitly.
    const stream = createMarketStream(
      configWith({ marketDataProvider: "replay" }),
      {
        bars,
        replayFrom: new Date("2026-09-16T13:30:00Z"),
        wallNow: () => OPEN,
      },
    );

    expect(() =>
      stream?.subscribe(STREAM_SYMBOLS, {
        onObservations: () => undefined,
        onConnectionChange: () => undefined,
      }),
    ).toThrow(ReplayDuringSessionError);
  });

  it("does NOT throw for alpaca, because a refusal is normal on every deploy", () => {
    // §8.4: a refused socket stays OPEN and every error is a FRAME rather than
    // a closure. §8.2: `406 connection limit exceeded` happens on EVERY deploy
    // by design, because a rolling replacement has two processes alive and the
    // arriving one is us. A process that exited on a refused socket would fail
    // to start on every rollout — and `deploy.yml` fails a rollout whose
    // container restarted, turning a routine overlap into a failed release.
    expect(() =>
      createMarketStream(
        configWith({
          marketDataProvider: "alpaca",
          alpaca: { keyId: "wrong", secretKey: "wrong" },
        }),
        { bars },
      ),
    ).not.toThrow();
  });

  it("throws on alpaca WITHOUT a credential, which config.ts already refuses", () => {
    // Unreachable from a started process — `config.ts` refuses that pair at
    // startup — so reaching it means the configuration said one thing and the
    // object handed here says another. `PROVIDER.md` §8.5's line for when a
    // throw is correct: a fact about our code rather than about the world.
    expect(() =>
      createMarketStream(configWith({ marketDataProvider: "alpaca" }), {
        bars,
      }),
    ).toThrow(/no Alpaca credential/);
  });
});

describe("the symbols", () => {
  it("is a fixed handful, not the universe", () => {
    // Story 3.5 owns 518, and §10.2 settles that the upstream set is a
    // CONSTANT — so scaling it later changes this array rather than designing
    // a subscription protocol.
    expect(STREAM_SYMBOLS.length).toBeLessThan(10);
    expect(STREAM_SYMBOLS.length).toBeGreaterThan(0);
  });

  it("is liquid names, so a developer sees movement rather than a broken feed", () => {
    // §7.6 measured IEX coverage at 65.1% of minutes for a median symbol and
    // 2.1% for `ERIE`. A thin name would look broken while working perfectly.
    expect(STREAM_SYMBOLS).toContain("SPY");
    expect(STREAM_SYMBOLS).toContain("NVDA");
  });
});

describe("the replay's default start (Task 3.4.2)", () => {
  // **Found by running it on a Sunday.** `now - 7 days` lands on whatever
  // weekday the subtraction produces, and on a weekend that is another
  // weekend — so the store holds no bars, and the replay reports `live` while
  // emitting nothing. ADR 0030 added the replay so this epic's design work
  // could run at ANY hour, and the hours it most needs to serve are exactly
  // the ones where the naive subtraction fails.
  //
  // **Amended by Task 3.4.3, which found it still landed on a Saturday.** The
  // four original cases were all at `12:00:00Z`, where a UTC date and a market
  // date agree — and the defect was precisely that they can disagree: the walk
  // validated `marketDateAt(day)` and then built the instant from `day`'s UTC
  // calendar fields. Measured on 2026-09-20 at 03:36Z, the market date read
  // Friday 2026-09-11 and the instant read **Saturday 2026-09-12T13:30Z**.
  //
  // The test could not see it because **the test made the same conversion the
  // code did**. So the times of day now straddle the ET offset, and the
  // assertions are on an axis the code does not convert on: the instant must be
  // a session's own `open`, and its UTC day must be a weekday.
  it.each([
    ["a Sunday", "2026-09-20T12:00:00Z"],
    ["a Saturday", "2026-09-19T12:00:00Z"],
    ["a Monday", "2026-09-21T12:00:00Z"],
    ["a Friday", "2026-09-18T12:00:00Z"],
    ["a Sunday before dawn UTC", "2026-09-20T03:36:00Z"],
    ["a Monday before dawn UTC", "2026-09-21T00:20:00Z"],
    ["a Wednesday before dawn UTC", "2026-09-23T02:00:00Z"],
    ["a winter Tuesday, when the offset is EST", "2026-12-15T02:00:00Z"],
  ])("lands on a real trading session when today is %s", (_name, today) => {
    const from = defaultReplayStartForTest(new Date(today));
    const session = marketSessionOn(marketDateAt(from));

    expect(session).toBeDefined();
    // **The instant IS the session's open**, rather than a UTC time that
    // happens to convert to one. A hard-coded `13:30Z` is 09:30 EDT only, so
    // every winter default would have started an hour before the bell.
    expect(from.getTime()).toBe(session?.open.getTime());
    // An axis nothing in `defaultReplayStart` converts on. Saturday is 6.
    expect(from.getUTCDay()).toBeGreaterThanOrEqual(1);
    expect(from.getUTCDay()).toBeLessThanOrEqual(5);
  });

  it("is at least a week back, which is what the embargo bought", () => {
    // The 15-minute embargo and the nightly backfill are why this does not
    // replay yesterday. Walking back to a session must not walk FORWARD.
    const today = new Date("2026-09-20T12:00:00Z");
    const from = defaultReplayStartForTest(today);

    expect(from.getTime()).toBeLessThanOrEqual(
      today.getTime() - 7 * 24 * 60 * 60 * 1000,
    );
  });
});
