import { type Bar, marketSessionOn, toMarketDate } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import {
  aggregateToDailyBar,
  FIXTURE_CORPUS,
  FIXTURE_FIRST_DATE,
  FIXTURE_LAST_DATE,
  FIXTURE_RETRIEVED_AT,
  FIXTURE_SPLIT_DATE,
  FIXTURE_SPLIT_RATIO,
  type FixtureEntry,
  fixtureSessionOn,
  generateMinuteBars,
  generateSessionBars,
  mulberry32,
} from "./fixture-corpus.js";

// A regular session and a half day, both taken from the calendar rather than
// written out — which is `PROVIDER.md` §6.2's requirement applied to the tests
// as well as to the generator. 2026-11-27 is the day after Thanksgiving, the
// day a hard-coded 390 dies on.
const REGULAR = fixtureSessionOn(toMarketDate("2026-09-04"));
const HALF_DAY = fixtureSessionOn(toMarketDate("2026-11-27"));

/**
 * `noUncheckedIndexedAccess` hands back a possible gap and `strictTypeChecked`
 * forbids a non-null assertion. `expect.fail` returns `never`, so this narrows
 * as well as failing — the idiom `CLAUDE.md` records for exactly this.
 */
function first(bars: readonly Bar[]): Bar {
  const bar = bars[0];
  if (bar === undefined) expect.fail("expected at least one bar");
  return bar;
}

function entry(symbol: string): FixtureEntry {
  const found = FIXTURE_CORPUS[symbol];
  if (found === undefined)
    expect.fail(`${symbol} is not in the fixture corpus`);
  return found;
}

describe("mulberry32", () => {
  it("is a pure function of its seed, so the corpus is reproducible", () => {
    const first = Array.from({ length: 5 }, mulberry32(12_345));
    const second = Array.from({ length: 5 }, mulberry32(12_345));

    expect(first).toStrictEqual(second);
  });

  it("gives different sequences for different seeds", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe("the corpus", () => {
  it("declares a fixed retrievedAt rather than stamping one", () => {
    // A `now()` here would make the series different on every run, and — the
    // half that outlives this task — a provenance date that is always today
    // is permanently silent about staleness. Task 2.3.5's finding.
    expect(FIXTURE_RETRIEVED_AT).toMatch(/Z$/);
    expect(Number.isNaN(Date.parse(FIXTURE_RETRIEVED_AT))).toBe(false);
  });

  it("covers a window whose ends are real trading sessions", () => {
    expect(marketSessionOn(FIXTURE_FIRST_DATE)).toBeDefined();
    expect(marketSessionOn(FIXTURE_LAST_DATE)).toBeDefined();
    expect(marketSessionOn(FIXTURE_SPLIT_DATE)).toBeDefined();
  });

  it("refuses a date that is not a session rather than inventing one", () => {
    // A Saturday. The provider answers a weekend with an empty series; nothing
    // ever asks the corpus for one, and asking is a mistake worth naming.
    expect(() => fixtureSessionOn(toMarketDate("2026-09-05"))).toThrow(
      /not a trading session/,
    );
  });

  it("keeps every gap inside a half day, so a half day drops the same minutes", () => {
    // An offset past a half day's close would silently be a no-op on exactly
    // the day this corpus exists to cover.
    for (const [symbol, fixture] of Object.entries(FIXTURE_CORPUS)) {
      for (const minute of fixture.missingMinutes) {
        expect(
          minute,
          `${symbol} declares a gap at minute ${String(minute)}`,
        ).toBeLessThan(HALF_DAY.minuteBars);
      }
    }
  });
});

describe("generateMinuteBars", () => {
  it("produces one bar per minute of the session, counted by the calendar", () => {
    // 390 and 210 appear nowhere in this file: `minuteBars` is the calendar's
    // number, per date, which is the whole reason Story 2.5 exists.
    expect(generateMinuteBars(entry("NVDA"), REGULAR, "raw")).toHaveLength(
      REGULAR.minuteBars,
    );
    expect(generateMinuteBars(entry("NVDA"), HALF_DAY, "raw")).toHaveLength(
      HALF_DAY.minuteBars,
    );
    expect(HALF_DAY.isEarlyClose).toBe(true);
  });

  it("drops the declared gap minutes, on a regular session and on a half day", () => {
    const thin = entry("AMD");

    expect(generateMinuteBars(thin, REGULAR, "raw")).toHaveLength(
      REGULAR.minuteBars - thin.missingMinutes.length,
    );
    expect(generateMinuteBars(thin, HALF_DAY, "raw")).toHaveLength(
      HALF_DAY.minuteBars - thin.missingMinutes.length,
    );
  });

  it("leaves a gap where the missing minute was rather than shifting later bars", () => {
    // A gap is an absent print, not a different market: the minutes either side
    // are at the instants they would have been at anyway.
    const bars = generateMinuteBars(entry("AMD"), REGULAR, "raw");
    const minuteOf = (bar: Bar): number =>
      (bar.startsAt.getTime() - REGULAR.open.getTime()) / 60_000;
    const minutes = bars.map(minuteOf);

    expect(minutes).not.toContain(10);
    expect(minutes).toContain(9);
    expect(minutes).toContain(13);
  });

  it("is strictly ascending and coherent, which is what toBarSeries assumes", () => {
    const bars = generateMinuteBars(entry("SPY"), REGULAR, "raw");

    for (const [index, bar] of bars.entries()) {
      const previous = bars[index - 1];
      if (previous !== undefined) {
        expect(bar.startsAt.getTime()).toBeGreaterThan(
          previous.startsAt.getTime(),
        );
      }
      expect(bar.high).toBeGreaterThanOrEqual(Math.max(bar.open, bar.close));
      expect(bar.low).toBeLessThanOrEqual(Math.min(bar.open, bar.close));
      expect(bar.volume).toBeGreaterThan(0);
    }
  });

  it("gives two symbols two different walks", () => {
    const nvda = generateMinuteBars(entry("NVDA"), REGULAR, "raw");
    const spy = generateMinuteBars(entry("SPY"), REGULAR, "raw");

    expect(nvda[0]?.close).not.toBe(spy[0]?.close);
  });

  it("gives one symbol two different sessions two different walks", () => {
    const monday = generateMinuteBars(entry("NVDA"), REGULAR, "raw");
    const other = generateMinuteBars(
      entry("NVDA"),
      fixtureSessionOn(toMarketDate("2026-09-08")),
      "raw",
    );

    expect(monday[0]?.close).not.toBe(other[0]?.close);
  });
});

describe("the split", () => {
  const spl = () => entry("ZZSPL");
  const before = fixtureSessionOn(toMarketDate("2026-05-29"));
  const after = fixtureSessionOn(FIXTURE_SPLIT_DATE);

  it("puts a genuine cliff in the RAW series, because that is what happened", () => {
    // A four-for-one split quarters the price. The raw series is honest about
    // that step and `PROVIDER.md` §3.6 says a chart of it is an honest chart —
    // provided the label beside it says `raw`.
    const rawBefore = first(generateMinuteBars(spl(), before, "raw"));
    const rawAfter = first(generateMinuteBars(spl(), after, "raw"));

    expect(rawBefore.open / rawAfter.open).toBeGreaterThan(3);
  });

  it("removes the cliff under split-adjusted, by scaling the EARLIER half down", () => {
    const rawBefore = first(generateMinuteBars(spl(), before, "raw"));
    const adjustedBefore = first(
      generateMinuteBars(spl(), before, "split-adjusted"),
    );

    expect(adjustedBefore.open).toBe(rawBefore.open / FIXTURE_SPLIT_RATIO);
    // Volume moves the other way, so the notional traded is preserved.
    expect(adjustedBefore.volume).toBe(rawBefore.volume * FIXTURE_SPLIT_RATIO);
  });

  it("leaves bars on and after the split date untouched in both modes", () => {
    expect(generateMinuteBars(spl(), after, "split-adjusted")).toStrictEqual(
      generateMinuteBars(spl(), after, "raw"),
    );
  });

  it("returns IDENTICAL numbers in both modes for a symbol with no split", () => {
    // This is the consequence `market-provenance.ts` warns about, made
    // concrete: a wrong adjustment argument is invisible on almost every
    // series, which is exactly why acceptance criterion 5 forbids a default.
    expect(
      generateMinuteBars(entry("NVDA"), REGULAR, "split-adjusted"),
    ).toStrictEqual(generateMinuteBars(entry("NVDA"), REGULAR, "raw"));
  });
});

describe("aggregateToDailyBar", () => {
  it("derives the day from the minutes rather than walking separately", () => {
    const minutes = generateMinuteBars(entry("NVDA"), REGULAR, "raw");
    const [daily] = generateSessionBars(entry("NVDA"), REGULAR, "1d", "raw");

    expect(daily).toBeDefined();
    expect(daily?.startsAt).toStrictEqual(REGULAR.open);
    expect(daily?.open).toBe(minutes[0]?.open);
    expect(daily?.close).toBe(minutes[minutes.length - 1]?.close);
    expect(daily?.high).toBe(Math.max(...minutes.map((bar) => bar.high)));
    expect(daily?.low).toBe(Math.min(...minutes.map((bar) => bar.low)));
    expect(daily?.volume).toBe(
      minutes.reduce((total, bar) => total + bar.volume, 0),
    );
  });

  it("has nothing to say about a session that printed nothing", () => {
    expect(aggregateToDailyBar([])).toBeUndefined();
  });
});
