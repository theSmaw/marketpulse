/**
 * The vendor mapping, tested against **recorded response bodies** and no
 * network (Task 2.7.3).
 *
 * ## Which corpus this is, because there are two and confusing them is easy
 *
 * `PROVIDER.md` §6.1 settles it: Story 2.6's fixture corpus produces **domain
 * types**, parses no vendor JSON and therefore has nothing vendor-shaped it
 * could be wrong about. This one is **raw HTTP response bodies**, and it is the
 * only artefact that can test a mapping — which is the only place a vendor's
 * shape can be got wrong.
 *
 * ## Every count here is DERIVED from the trading calendar, never written out
 *
 * `fixture-corpus.ts`'s rule, and it is what makes these assertions worth
 * anything: `390` and `210` appear nowhere below. A regular session asserts
 * `marketSessionOn(...).minuteBars`, so a calendar edit that made a date a half
 * day would fail here rather than silently changing what "a full session" means.
 *
 * ## And these are observations of a third party on one day
 *
 * The bodies were recorded on 2026-09-07 and every one of Task 2.7.1's figures
 * reproduced exactly — 390, 210, 384, 0, and the 391-bar inclusive-`end` trap.
 * They are frozen now, which is the point: the mapping is tested against what a
 * vendor actually sent rather than against what we believe it sends.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  marketSessionOn,
  toMarketDate,
  toTicker,
  toTimeRange,
} from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import {
  ALPACA_FEED,
  ALPACA_MAX_LIMIT,
  ALPACA_PROVIDER_ID,
  AlpacaPaginationUnsupportedError,
  parseAlpacaBarsBody,
  toAlpacaInclusiveEnd,
  toAlpacaQuery,
  toBarSeriesFromAlpaca,
} from "./alpaca-mapping.js";
import type { BarsRequest } from "./market-data-provider.js";

/**
 * The recorded bodies, read from `src/` at run time rather than `import`ed.
 *
 * **A decision rather than a habit.** `resolveJsonModule` plus an `import`
 * would compile 356 KB of fixtures into `dist/`, and `apps/backend`'s `files`
 * field ships `dist` — so the container image would carry a third of a megabyte
 * of test data. `readFileSync` from `src/` keeps them test-only, which is the
 * same boundary `files: ["dist", "!dist/**\/*.test.*"]` already draws.
 */
const FIXTURES = join(import.meta.dirname, "fixtures", "alpaca");

function body(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), "utf8"));
}

/** The instant the mapping was told the fetch happened. Never a clock. */
const RETRIEVED_AT = "2026-09-07T08:00:00.000Z";

/**
 * The session on a date the calendar has one for.
 *
 * `marketSessionOn` returns `undefined` for a holiday or a weekend, correctly —
 * and every date used below is a real trading day, so narrowing it here once
 * beats fourteen non-null assertions. `expect.fail` returns `never`, so it
 * narrows as well as failing.
 */
function sessionOn(date: string) {
  const session = marketSessionOn(toMarketDate(date));
  if (session === undefined) {
    expect.fail(`${date} is not a trading day, so this fixture is misdated.`);
  }
  return session;
}

/** A request over one session, which is what every fixture was recorded for. */
function sessionRequest(
  symbol: string,
  date: string,
  overrides: Partial<BarsRequest> = {},
): BarsRequest {
  const session = sessionOn(date);
  return {
    symbol: toTicker(symbol),
    range: toTimeRange(session.open, session.close),
    timeframe: "1m",
    adjustment: "raw",
    ...overrides,
  };
}

describe("toAlpacaQuery", () => {
  const request = sessionRequest("NVDA", "2026-09-03");

  it("asks for the feed explicitly rather than taking the vendor's default", () => {
    // Story 2.7's open decision 6, settled in the module. The explicit form is
    // what makes the provenance record true by construction: an explicit
    // feed=sip cannot silently fall back to IEX.
    expect(toAlpacaQuery(request).feed).toBe("sip");
    expect(ALPACA_FEED).toBe("sip");
  });

  it("asks for ascending order explicitly, because toBarSeries refuses anything else", () => {
    expect(toAlpacaQuery(request).sort).toBe("asc");
  });

  it("asks for the measured page ceiling", () => {
    expect(toAlpacaQuery(request).limit).toBe(String(ALPACA_MAX_LIMIT));
  });

  it("maps both timeframes onto the vendor's strings", () => {
    expect(toAlpacaQuery(request).timeframe).toBe("1Min");
    expect(toAlpacaQuery({ ...request, timeframe: "1d" }).timeframe).toBe(
      "1Day",
    );
  });

  it("maps both adjustments onto the vendor's parameter", () => {
    expect(toAlpacaQuery(request).adjustment).toBe("raw");
    expect(
      toAlpacaQuery({ ...request, adjustment: "split-adjusted" }).adjustment,
    ).toBe("split");
  });

  // **The load-bearing assertion in this file.** Alpaca's `end` is inclusive
  // and ours is half-open, so passing `end` through fetches one extra bar —
  // measured at 391 for a 390-minute session.
  it("converts our half-open end to the vendor's inclusive one", () => {
    const query = toAlpacaQuery(request);

    const end = query.end ?? expect.fail("the query carries no end parameter");
    expect(new Date(end).getTime()).toBe(request.range.end.getTime() - 1);
    expect(query.end).not.toBe(request.range.end.toISOString());
    expect(query.start).toBe(request.range.start.toISOString());
  });

  it("uses the same conversion for daily bars, with no timeframe arithmetic", () => {
    // One millisecond is the exact half-open-to-inclusive conversion, so it is
    // correct for any timeframe by construction — where subtracting "one day"
    // would move by an hour across a DST transition.
    const daily = { ...request, timeframe: "1d" as const };
    expect(toAlpacaInclusiveEnd(daily.range).getTime()).toBe(
      daily.range.end.getTime() - 1,
    );
  });
});

describe("toBarSeriesFromAlpaca — a full regular session", () => {
  const request = sessionRequest("NVDA", "2026-09-03");
  const series = toBarSeriesFromAlpaca(
    request,
    body("nvda-1min-regular-session"),
    RETRIEVED_AT,
  );

  it("returns exactly the minute bars the calendar says the session has", () => {
    // Derived, never written out: 390 appears nowhere in this file.
    expect(series.bars.length).toBe(sessionOn("2026-09-03").minuteBars);
  });

  // **`t` marks the START of its interval, and this is the assertion that
  // catches a one-minute systematic error** — which is invisible on a chart and
  // wrong in every PRODUCT_SPEC §11 calculation. If `t` marked the end, the
  // first bar would be the session open plus one minute.
  it("stamps the first bar at the session open exactly", () => {
    const session = sessionOn("2026-09-03");
    expect(series.bars[0]?.startsAt.toISOString()).toBe(
      session.open.toISOString(),
    );
  });

  it("stamps the last bar one minute before the close, never at it", () => {
    const session = sessionOn("2026-09-03");
    const last = series.bars.at(-1);

    expect(last?.startsAt.getTime()).toBe(session.close.getTime() - 60_000);
    // The half-open rule, asserted directly: a bar exactly at the close is
    // outside the regular session CALENDAR.md §2 scopes V1 to.
    expect(last?.startsAt.getTime()).toBeLessThan(session.close.getTime());
  });

  it("maps the six fields we take and drops the two we decline", () => {
    const first = series.bars[0];

    // Read off the recorded body rather than written out, so this asserts the
    // MAPPING rather than restating a number.
    const raw = (
      body("nvda-1min-regular-session") as {
        bars: Record<string, readonly Record<string, number | string>[]>;
      }
    ).bars.NVDA?.[0];

    expect(first?.open).toBe(raw?.o);
    expect(first?.high).toBe(raw?.h);
    expect(first?.low).toBe(raw?.l);
    expect(first?.close).toBe(raw?.c);
    expect(first?.volume).toBe(raw?.v);
    expect(first?.startsAt.toISOString()).toBe(
      new Date(String(raw?.t)).toISOString(),
    );

    // `n` and `vw` are declined with triggers in PROVIDER.md §9.1. A Bar with
    // either of them is a column in a ten-million-row table.
    expect(Object.keys(first ?? {}).sort()).toEqual([
      "close",
      "high",
      "low",
      "open",
      "startsAt",
      "volume",
    ]);
  });

  it("records provenance naming the provider, the feed and the count", () => {
    const source = series.provenance.sources[0];

    expect(series.provenance.sources.length).toBe(1);
    expect(source.provider).toBe(ALPACA_PROVIDER_ID);
    expect(source.feed).toBe(ALPACA_FEED);
    expect(source.barCount).toBe(series.bars.length);
    expect(series.provenance.adjustment).toBe("raw");
  });

  // `retrievedAt` is stamped at the FETCH and passed in — never read from a
  // clock here, and never re-stamped on a read path. PROVIDER.md §4.3, and the
  // trap Task 2.3.5 already fell into once.
  it("takes retrievedAt from its argument rather than from a clock", () => {
    expect(series.provenance.sources[0].retrievedAt).toBe(RETRIEVED_AT);
  });

  it("covers the whole window it was asked for, not the span of the bars", () => {
    expect(series.coverage.requested).toBe(request.range);
    expect(series.coverage.covered?.start.getTime()).toBe(
      request.range.start.getTime(),
    );
    expect(series.coverage.covered?.end.getTime()).toBe(
      request.range.end.getTime(),
    );
  });
});

describe("toBarSeriesFromAlpaca — the sessions that are not ordinary", () => {
  it("returns a half day's own bar count, which is fewer than a full session", () => {
    const request = sessionRequest("NVDA", "2025-11-28");
    const series = toBarSeriesFromAlpaca(
      request,
      body("nvda-1min-half-day"),
      RETRIEVED_AT,
    );
    const halfDay = sessionOn("2025-11-28");

    expect(halfDay.isEarlyClose).toBe(true);
    expect(series.bars.length).toBe(halfDay.minuteBars);
    // The assertion that actually proves the half day is handled: it is SMALLER
    // than a regular session. Without it, a mapping that ignored the calendar
    // entirely would still pass the line above.
    expect(halfDay.minuteBars).toBeLessThan(sessionOn("2026-09-03").minuteBars);
  });

  it("returns an empty series for a holiday, which is a SUCCESS", () => {
    const request = sessionRequest("NVDA", "2025-12-24");
    // The recorded body is Christmas Day 2025 — a full closure, so the calendar
    // has no session for it and the request is framed on the day before.
    const series = toBarSeriesFromAlpaca(
      request,
      body("nvda-1min-holiday"),
      RETRIEVED_AT,
    );

    expect(series.bars).toEqual([]);
    // `null` exactly when there are no bars — toBarSeries enforces both ways
    // round, so a non-null covered range on an empty series would throw.
    expect(series.coverage.covered).toBeNull();
    expect(series.provenance.sources[0].barCount).toBe(0);
  });

  it("returns a thin name's real gaps rather than inventing minutes", () => {
    const request = sessionRequest("CCI", "2026-09-03");
    const series = toBarSeriesFromAlpaca(
      request,
      body("cci-1min-thin-name"),
      RETRIEVED_AT,
    );
    const session = sessionOn("2026-09-03");

    // Fewer bars than minutes, and that is ordinary rather than a fault —
    // PROVIDER.md §6.4's second number, which Story 2.8's gap handling rests on.
    expect(series.bars.length).toBeLessThan(session.minuteBars);
    expect(series.bars.length).toBeGreaterThan(0);
    // Nothing was manufactured to fill them: §35's "manufacture missing
    // observations", asserted rather than assumed.
    expect(series.provenance.sources[0].barCount).toBe(series.bars.length);
  });

  it("stamps a daily bar at midnight ET, not at the session open", () => {
    const request: BarsRequest = {
      symbol: toTicker("NVDA"),
      range: toTimeRange(
        new Date("2026-01-02T05:00:00Z"),
        new Date("2026-06-30T05:00:00Z"),
      ),
      timeframe: "1d",
      adjustment: "raw",
    };
    const series = toBarSeriesFromAlpaca(
      request,
      body("nvda-1day-months"),
      RETRIEVED_AT,
    );

    expect(series.bars.length).toBeGreaterThan(100);
    // A daily `t` is midnight ET and NOT 13:30Z — which is why nothing in the
    // mapping maps a `t` onto a session boundary.
    const first = series.bars[0];
    const session = sessionOn("2026-01-02");
    expect(first?.startsAt.toISOString()).not.toBe(session.open.toISOString());
    expect(first?.startsAt.getTime()).toBeLessThan(session.open.getTime());
  });
});

describe("toBarSeriesFromAlpaca — adjustment", () => {
  const range = toTimeRange(
    new Date("2024-05-28T04:00:00Z"),
    new Date("2024-06-20T04:00:00Z"),
  );

  function daily(symbol: string, adjustment: "raw" | "split-adjusted") {
    return {
      symbol: toTicker(symbol),
      range,
      timeframe: "1d",
      adjustment,
    } satisfies BarsRequest;
  }

  it("carries the split cliff on raw and not on split-adjusted", () => {
    // NVDA's 10-for-1 split, 2024-06-10. PROVIDER.md §3.5's recorded direction:
    // RAW carries the cliff, adjusted is continuous.
    const raw = toBarSeriesFromAlpaca(
      daily("NVDA", "raw"),
      body("nvda-1day-split-raw"),
      RETRIEVED_AT,
    );
    const split = toBarSeriesFromAlpaca(
      daily("NVDA", "split-adjusted"),
      body("nvda-1day-split-split"),
      RETRIEVED_AT,
    );

    const rawFirst = raw.bars[0]?.close ?? expect.fail("raw series is empty");
    const splitFirst =
      split.bars[0]?.close ?? expect.fail("split series is empty");

    // Ten to one, before the split.
    expect(rawFirst / splitFirst).toBeCloseTo(10, 1);
    // And identical after it, which is what makes the ratio a split rather than
    // two unrelated series.
    expect(raw.bars.at(-1)?.close).toBe(split.bars.at(-1)?.close);
  });

  // **The control, and it is what makes the test above a measurement.** A
  // symbol with no split in the range must return identical bars in both modes
  // — which is what makes `adjustment` safe to send unconditionally.
  it("returns identical bars in both modes for a symbol with no split", () => {
    const raw = toBarSeriesFromAlpaca(
      daily("JNJ", "raw"),
      body("jnj-1day-nosplit-raw"),
      RETRIEVED_AT,
    );
    const split = toBarSeriesFromAlpaca(
      daily("JNJ", "split-adjusted"),
      body("jnj-1day-nosplit-split"),
      RETRIEVED_AT,
    );

    expect(raw.bars).toEqual(split.bars);
    // The provenance still differs, correctly: the adjustment is what was
    // ASKED for, not what the numbers turned out to be.
    expect(raw.provenance.adjustment).toBe("raw");
    expect(split.provenance.adjustment).toBe("split-adjusted");
  });
});

describe("what this task refuses to handle", () => {
  // **The decision that makes splitting the client across four tasks honest.**
  // A client quietly returning the first page of a longer range lies with a
  // perfectly well-formed answer: ascending, correct provenance, plausible
  // coverage, and missing data nobody notices until a chart has a hole in it.
  it("throws on a next_page_token rather than returning a partial series", () => {
    const request: BarsRequest = {
      symbol: toTicker("NVDA"),
      range: toTimeRange(
        new Date("2026-08-03T13:30:00Z"),
        new Date("2026-08-14T20:00:00Z"),
      ),
      timeframe: "1m",
      adjustment: "raw",
    };

    expect(() =>
      toBarSeriesFromAlpaca(request, body("nvda-1min-paginated"), RETRIEVED_AT),
    ).toThrow(AlpacaPaginationUnsupportedError);

    // It names the task that fixes it, so the throw is actionable rather than
    // merely loud.
    expect(() =>
      toBarSeriesFromAlpaca(request, body("nvda-1min-paginated"), RETRIEVED_AT),
    ).toThrow(/2\.7\.5/);
  });

  it("treats a present-and-null token as the last page, not as an absent key", () => {
    // Measured over five pages: on the last page the field is PRESENT and
    // `null`. A client testing for the key's ABSENCE would loop forever.
    const parsed = parseAlpacaBarsBody(body("nvda-1min-regular-session"));
    expect(parsed.next_page_token).toBeNull();
  });
});

describe("a body that is not the shape we believe", () => {
  const request = sessionRequest("NVDA", "2026-09-03");

  // **A parse failure is a THROW and not a BarsResult member**, per
  // PROVIDER.md §8.5: a body that does not have the documented shape means our
  // understanding of this vendor is wrong, which is a fact about our code.
  // Laundering it into `upstream-unavailable` would put it in front of a retry
  // wrapper that would retry a shape that will never change.
  it.each([
    ["null", null],
    ["a string", "nope"],
    ["an object with no bars", { next_page_token: null }],
    ["bars as an array", { bars: [], next_page_token: null }],
  ])("throws on %s", (_label, value) => {
    expect(() => toBarSeriesFromAlpaca(request, value, RETRIEVED_AT)).toThrow(
      TypeError,
    );
  });

  it("throws on a bar whose close is not a finite number", () => {
    for (const close of [null, "225.21", Number.NaN]) {
      expect(() =>
        toBarSeriesFromAlpaca(
          request,
          {
            bars: {
              NVDA: [
                {
                  t: "2026-09-03T13:30:00Z",
                  o: 1,
                  h: 1,
                  l: 1,
                  c: close,
                  v: 1,
                },
              ],
            },
            next_page_token: null,
          },
          RETRIEVED_AT,
        ),
      ).toThrow(TypeError);
    }
  });
});

// **The strongest evidence that the `end` subtraction is necessary**, and it
// needs no assertion about a query string at all: the body Alpaca returns for
// the UN-subtracted request is one the domain type REFUSES.
describe("the body an un-subtracted end produces", () => {
  it("is rejected by toBarSeries because a bar falls outside the window", () => {
    const request = sessionRequest("NVDA", "2026-09-03");
    const recorded = body("nvda-1min-end-at-close") as {
      bars: Record<string, readonly unknown[]>;
    };

    // 391 bars for a 390-minute session — more than the session has minutes,
    // which no amount of missing data can explain. That arithmetic impossibility
    // is the only reason the trap was caught at all.
    expect(recorded.bars.NVDA?.length).toBe(
      sessionOn("2026-09-03").minuteBars + 1,
    );

    expect(() =>
      toBarSeriesFromAlpaca(request, recorded, RETRIEVED_AT),
    ).toThrow(/starts outside the covered range/);
  });
});
