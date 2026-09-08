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
  ALPACA_SIP_WITHHOLDING_MS,
  alpacaServableEnd,
  mapAlpacaFailure,
  parseAlpacaBarsBody,
  parseRetryAfterMs,
  toAlpacaInclusiveEnd,
  toAlpacaQuery,
  toBarSeriesFromAlpacaBars,
  toBarsFromAlpacaPage,
  singleRequestFor,
  toAlpacaManyQuery,
  toBarsBySymbolFromAlpacaPage,
} from "./alpaca-mapping.js";
import type { BarsRequest, ManyBarsRequest } from "./market-data-provider.js";

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

/**
 * One body, mapped as a whole series — the shape this module exported before
 * Task 2.7.5 split it.
 *
 * Pagination made *one answer* into *one or more bodies*, so the assembly step
 * now takes accumulated bars and only the caller that walked the pages knows
 * when it is done. Every assertion below is about a **single-page** body, where
 * the two are equivalent, so this keeps them saying what they said rather than
 * rewriting forty call sites to prove a refactor.
 *
 * `servableEnd` is `request.range.end` here, i.e. *nothing was clamped*, which
 * is true of every historical fixture in the corpus. The clamp has its own
 * tests.
 */
function seriesFromOneBody(
  request: BarsRequest,
  raw: unknown,
  retrievedAt: string,
) {
  const parsed = parseAlpacaBarsBody(raw);
  return toBarSeriesFromAlpacaBars(
    request,
    toBarsFromAlpacaPage(parsed, request.symbol),
    retrievedAt,
    request.range.end,
  );
}

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
    expect(toAlpacaInclusiveEnd(daily.range.end).getTime()).toBe(
      daily.range.end.getTime() - 1,
    );
  });
});

describe("toBarSeriesFromAlpaca — a full regular session", () => {
  const request = sessionRequest("NVDA", "2026-09-03");
  const series = seriesFromOneBody(
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
    const series = seriesFromOneBody(
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
    const series = seriesFromOneBody(
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
    const series = seriesFromOneBody(
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
    const series = seriesFromOneBody(
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
    const raw = seriesFromOneBody(
      daily("NVDA", "raw"),
      body("nvda-1day-split-raw"),
      RETRIEVED_AT,
    );
    const split = seriesFromOneBody(
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
    const raw = seriesFromOneBody(
      daily("JNJ", "raw"),
      body("jnj-1day-nosplit-raw"),
      RETRIEVED_AT,
    );
    const split = seriesFromOneBody(
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
  // ~~A client quietly returning the first page of a longer range lies with a
  // perfectly well-formed answer.~~ Task 2.7.5 removed the throw by making the
  // walk real. What replaces it here is the property that made the throw safe
  // to remove: **the mapping no longer decides whether an answer is complete**,
  // because it can no longer see. A page is a page.
  it("maps one page as a page, leaving completeness to the caller that walks", () => {
    const parsed = parseAlpacaBarsBody(body("nvda-1min-paginated"));

    // A token means there is more. The mapping reports it and forms no opinion:
    // the loop in `alpaca-provider.ts` is the only thing that knows whether the
    // walk finished, and `alpaca-provider.test.ts` is where that is asserted.
    expect(parsed.next_page_token).toBeTypeOf("string");
    expect(
      toBarsFromAlpacaPage(parsed, toTicker("NVDA")).length,
    ).toBeGreaterThan(0);
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
    expect(() => seriesFromOneBody(request, value, RETRIEVED_AT)).toThrow(
      TypeError,
    );
  });

  it("throws on a bar whose close is not a finite number", () => {
    for (const close of [null, "225.21", Number.NaN]) {
      expect(() =>
        seriesFromOneBody(
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

    expect(() => seriesFromOneBody(request, recorded, RETRIEVED_AT)).toThrow(
      /starts outside the covered range/,
    );
  });
});

/**
 * The withheld recent window (Task 2.7.5).
 *
 * **Measured 2026-09-07 against the live API, and the finding inverted this
 * task's own brief.** It expected the vendor to answer a recent range *short*,
 * so that `covered` could be clipped to what arrived. It does not: on
 * `feed=sip` an `end` less than 15 minutes old is a flat **`403`** and
 * **nothing comes back at all**, including the hours of the window that were
 * perfectly available. So the handling has to happen *before* the request.
 */
describe("alpacaServableEnd — the withheld recent window", () => {
  const NOW = new Date("2026-09-07T15:00:00Z");

  it("leaves a historical window completely alone", () => {
    // Which is every window except one reaching into the last ~16 minutes, so
    // this is the case that must not move.
    const range = toTimeRange(
      new Date("2026-09-03T13:30:00Z"),
      new Date("2026-09-03T20:00:00Z"),
    );
    expect(alpacaServableEnd(range, NOW)).toEqual(range.end);
  });

  it("clamps an end inside the withheld window back to the cliff", () => {
    const range = toTimeRange(new Date("2026-09-07T13:30:00Z"), NOW);
    const servable = alpacaServableEnd(range, NOW);

    expect(servable.getTime()).toBe(NOW.getTime() - ALPACA_SIP_WITHHOLDING_MS);
    expect(servable.getTime()).toBeLessThan(range.end.getTime());
  });

  it("keeps a margin over the measured cliff, because the cliff is exact", () => {
    // The boundary was measured at EXACTLY 15 minutes: an `end` 15 minutes old
    // is served and one 14 minutes old is refused. Our clock and the vendor's
    // disagreeing by seconds is therefore the difference between an answer and
    // a total refusal, and the asymmetry decides it — the margin costs at most
    // one bar, the wrong side of the cliff costs the whole request.
    expect(ALPACA_SIP_WITHHOLDING_MS).toBeGreaterThan(15 * 60 * 1000);
  });

  it("reports the clamp as coverage rather than hiding it", () => {
    // **This is the whole point of `SeriesCoverage`.** The answer honestly
    // reaches less far than was asked for, and says so — an unreported clip
    // would be the §8.5 breach; a reported one is what `requested` and
    // `covered` exist to carry.
    const range = toTimeRange(new Date("2026-09-07T13:30:00Z"), NOW);
    const request: BarsRequest = {
      symbol: toTicker("NVDA"),
      range,
      timeframe: "1m",
      adjustment: "raw",
    };
    const servable = alpacaServableEnd(range, NOW);

    const series = toBarSeriesFromAlpacaBars(
      request,
      [
        {
          startsAt: new Date("2026-09-07T14:00:00Z"),
          open: 1,
          high: 2,
          low: 0.5,
          close: 1.5,
          volume: 10,
        },
      ],
      RETRIEVED_AT,
      servable,
    );

    expect(series.coverage.requested.end).toEqual(range.end);
    expect(series.coverage.covered?.end).toEqual(servable);
    expect(series.coverage.covered?.end.getTime()).toBeLessThan(
      series.coverage.requested.end.getTime(),
    );
  });
});

/**
 * The failure mapping (Task 2.7.6).
 *
 * Pure, so every one of these runs with no socket — which is what lets Story
 * 2.7's criterion 3 and criterion 7 hold at the same time. The bodies these are
 * written against were produced against the **live** vendor and recorded
 * verbatim under `fixtures/alpaca/`; what the tests assert is the mapping, and
 * `alpaca-provider.test.ts` asserts that the shipped client replays those exact
 * bytes into the same members.
 */
describe("mapAlpacaFailure", () => {
  const NOW = new Date("2026-09-07T13:00:00Z");

  it.each([401, 403])(
    "maps %i onto unauthorised, one member for all three causes",
    (status) => {
      // Measured: a wrong secret and no credential at all are byte-identical
      // 401s, and the only 403 this vendor produces is the recency cliff, which
      // `alpacaServableEnd` clamps out before a request is built.
      expect(mapAlpacaFailure(status, null, NOW)).toEqual({
        outcome: "unauthorised",
      });
    },
  );

  it("maps 429 onto rate-limited with the hint genuinely ABSENT when the vendor said nothing", () => {
    const result = mapAlpacaFailure(429, null, NOW);
    expect(result).toEqual({ outcome: "rate-limited" });

    // **The assertion that matters, and it is about the KEY rather than the
    // value.** Under `exactOptionalPropertyTypes` a present-and-`undefined`
    // `retryAfterMs` would satisfy `toEqual` above while collapsing
    // *"the vendor did not say"* into *"come back immediately"* at any caller
    // reading it with `??`. This is the branch-not-assignment decision, checked.
    expect("retryAfterMs" in result).toBe(false);
  });

  it("reads Retry-After's delta-seconds form when a vendor does send one", () => {
    expect(mapAlpacaFailure(429, "120", NOW)).toEqual({
      outcome: "rate-limited",
      retryAfterMs: 120_000,
    });
  });

  it("resolves Retry-After's HTTP-date form against now, so a caller gets a DURATION", () => {
    // An instant reconciled here rather than at the caller: clock skew in the
    // unlucky direction would otherwise retry EARLY, against the service that
    // just asked us to stop.
    expect(mapAlpacaFailure(429, "Mon, 07 Sep 2026 13:00:30 GMT", NOW)).toEqual(
      {
        outcome: "rate-limited",
        retryAfterMs: 30_000,
      },
    );
  });

  it.each([500, 502, 503, 504])(
    "maps %i onto upstream-unavailable",
    (status) => {
      expect(mapAlpacaFailure(status, null, NOW)).toEqual({
        outcome: "upstream-unavailable",
      });
    },
  );

  // `PROVIDER.md` §8.5: a fact about our code is a THROW. All three recorded
  // 400 bodies describe a request only this codebase could have built.
  it.each([400, 404, 405, 418])(
    "throws on %i rather than laundering our own defect into a member",
    (status) => {
      expect(() => mapAlpacaFailure(status, null, NOW)).toThrow(
        /built\s+wrongly/,
      );
    },
  );

  it("never repeats the vendor's body in the message it throws", () => {
    // Task 2.7.2's leak list names an interpolated vendor response as a way a
    // credential escapes, and a 400's message is our own request echoed back.
    let thrown = "";
    try {
      mapAlpacaFailure(400, null, NOW);
    } catch (error) {
      thrown = error instanceof Error ? error.message : String(error);
    }
    expect(thrown).not.toMatch(/end should not be before start/);
    expect(thrown).toMatch(/body is deliberately not repeated/i);
  });
});

describe("parseRetryAfterMs", () => {
  const NOW = new Date("2026-09-07T13:00:00Z");

  it("returns undefined rather than 0 when there is no header", () => {
    // Not 0: a caller reading `retryAfterMs ?? backoff()` must get its own
    // schedule, and 0 means "come back immediately" against a service that just
    // refused us.
    expect(parseRetryAfterMs(null, NOW)).toBeUndefined();
    expect(parseRetryAfterMs("   ", NOW)).toBeUndefined();
  });

  it("reads a bare integer as SECONDS and never as a year", () => {
    // `Date.parse("2020")` is a valid date in the past, so trying the date form
    // first would read `Retry-After: 2020` as "retry now" instead of as 2,020
    // seconds. Delta-seconds is tried first for exactly this.
    expect(parseRetryAfterMs("2020", NOW)).toBe(2_020_000);
  });

  it("floors a date already in the past at zero rather than going negative", () => {
    expect(parseRetryAfterMs("Mon, 07 Sep 2026 12:00:00 GMT", NOW)).toBe(0);
  });

  it("returns undefined on anything it cannot read", () => {
    // Nothing is clamped or invented: the hint is a floor rather than an
    // instruction, so silence is safe and a guess is not.
    expect(parseRetryAfterMs("soon", NOW)).toBeUndefined();
    expect(parseRetryAfterMs("-5", NOW)).toBeUndefined();
  });
});

describe("toAlpacaManyQuery", () => {
  const MANY: ManyBarsRequest = {
    symbols: [toTicker("AAPL"), toTicker("MSFT"), toTicker("NVDA")],
    range: toTimeRange(
      new Date("2026-09-03T13:30:00Z"),
      new Date("2026-09-03T20:00:00Z"),
    ),
    timeframe: "1m",
    adjustment: "raw",
  };

  it("joins the symbols and changes nothing else", () => {
    const many = toAlpacaManyQuery(MANY);
    const single = toAlpacaQuery({
      symbol: toTicker("AAPL"),
      range: MANY.range,
      timeframe: MANY.timeframe,
      adjustment: MANY.adjustment,
    });

    // One comma-separated parameter is the whole outbound half of the batch —
    // this vendor's endpoint has always been plural and the single-symbol form
    // is the degenerate case of it. Asserting the rest is IDENTICAL is what
    // stops the two forms drifting apart on `sort` or `limit`, which no test of
    // either one alone could see.
    expect(many.symbols).toBe("AAPL,MSFT,NVDA");
    expect({ ...many, symbols: "" }).toEqual({ ...single, symbols: "" });
  });

  it("clamps the end and carries a page token exactly as the single form does", () => {
    const withToken = toAlpacaManyQuery(MANY, {
      end: new Date("2026-09-03T18:00:00Z"),
      pageToken: "T2",
    });

    expect(withToken.page_token).toBe("T2");
    // Half-open to inclusive, still minus one millisecond.
    expect(withToken.end).toBe("2026-09-03T17:59:59.999Z");
  });

  it("omits the token on a first page rather than sending undefined", () => {
    expect("page_token" in toAlpacaManyQuery(MANY)).toBe(false);
  });
});

describe("toBarsBySymbolFromAlpacaPage", () => {
  it("reports what the page contained and says nothing about what it did not", () => {
    const page = parseAlpacaBarsBody({
      bars: {
        AAPL: [{ t: "2026-09-03T13:30:00Z", o: 1, h: 2, l: 1, c: 1.5, v: 10 }],
      },
      next_page_token: "more",
    });

    const bySymbol = toBarsBySymbolFromAlpacaPage(page);

    // **The whole difference from the single-symbol form.** That one asks for
    // one key and reads `[]` when it is absent, which is correct there. Here it
    // is not: a symbol absent from a page may have a full session on the next
    // one, so this function reports only what arrived and structurally cannot
    // fill in an empty array for a symbol that was asked for. The conclusion
    // belongs after exhaustion and nowhere else.
    expect([...bySymbol.keys()]).toEqual(["AAPL"]);
    expect(bySymbol.get("MSFT")).toBeUndefined();
  });
});

describe("singleRequestFor", () => {
  it("is one symbol's slice of a batch, with the window untouched", () => {
    const many: ManyBarsRequest = {
      symbols: [toTicker("AAPL"), toTicker("MSFT")],
      range: toTimeRange(
        new Date("2026-09-03T13:30:00Z"),
        new Date("2026-09-03T20:00:00Z"),
      ),
      timeframe: "1d",
      adjustment: "split-adjusted",
    };

    // This is what lets a batch reuse the single-symbol series builder verbatim
    // — and reusing it is not tidiness: `covered`, the withheld-window clamp
    // and the `barCount` cross-check each have an argument attached, and a
    // batch-specific copy would be a second place each is decided.
    expect(singleRequestFor(many, toTicker("MSFT"))).toEqual({
      symbol: "MSFT",
      range: many.range,
      timeframe: "1d",
      adjustment: "split-adjusted",
    });
  });
});
