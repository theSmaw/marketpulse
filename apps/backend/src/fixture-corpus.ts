/**
 * The fixture provider's data: what it holds, and how a bar is produced.
 *
 * This is the corpus half of Task 2.6.6, kept apart from the provider that
 * reads it (`fixture-provider.ts`) because the two answer different questions.
 * This file answers *what does the fixture world contain* — which symbols
 * exist, which of them misbehave, which minutes have no print, when a split
 * happened — and the provider answers *what does one call return*, which is a
 * filter, a coverage claim and a taxonomy.
 *
 * ## It is GENERATED, and `PROVIDER.md` §6.2 chose that over hand-authoring
 *
 * Three candidates were considered there and this is the one that won, on two
 * arguments worth repeating where the generator lives:
 *
 * - **A bar count is derived, never written.** `market-session.ts` already
 *   knows a regular session has 390 minutes and a half day 210, and it knows it
 *   *per date*. A hand-authored corpus has that number typed out once per
 *   fixture, and a hard-coded 390 dies the first time somebody asks for the day
 *   after Thanksgiving — which is exactly the class of bug Story 2.5 exists to
 *   remove.
 * - **It cannot invent realism, and that is a feature.** §35 forbids
 *   manufacturing observations. A corpus of plausible-looking hand-written NVDA
 *   prices is precisely that, and it is the thing most likely to end up in a
 *   screenshot. A seeded random walk is obviously a random walk.
 *
 * ## Determinism, and the two things that would break it
 *
 * The same request must produce the same series byte for byte, on every machine
 * and every run. `PROVIDER.md` §6.3 names both hazards and both are closed here
 * structurally rather than by discipline:
 *
 * - **The wall clock.** Nothing in this file or in the provider reads it.
 *   `packages/shared` *cannot* — the `Date.now()` and zero-argument `new Date()`
 *   lint rules over `packages/shared/src` have no exception — but this module
 *   lives in `apps/backend`, where that rule does not apply, so it is a decision
 *   rather than an enforcement. Every instant here comes from the request or
 *   from the trading calendar. {@link FIXTURE_RETRIEVED_AT} in particular is a
 *   fixed instant rather than a stamp, for the same reason *and* because a
 *   provenance date that is always today is one that can never report staleness
 *   — the trap Task 2.3.5 found in `UNIVERSE_PROVENANCE.checkedOn`.
 * - **An unseeded generator.** {@link mulberry32} is seeded from the symbol's
 *   own declared seed and the market date, so the bars for a session are a
 *   function of that pair and nothing else. **That is what makes a filtered
 *   range a subset of the unfiltered one rather than a different walk**: the
 *   whole session is generated and then filtered, never generated from the
 *   requested start.
 *
 * ## Why the symbols are the ones they are
 *
 * The ordinary entries use tickers from the tracked universe, because
 * `PROVIDER.md` §5.2's stated reason for shipping this provider at all is that
 * Story 2.12's charting decision should be takeable on a laptop with no vendor
 * key, and a chart of `ZZZZ` is a worse rehearsal than a chart of `NVDA`. What
 * stops that being §35's "manufacture missing observations" is §5.4's
 * mechanism rather than the choice of ticker: the series carries
 * `provider: "fixture"` and `feed: "synthetic"`, whose sentence is *"Generated
 * test data. Not a market feed."*, so a screenshot advertises itself in the
 * chrome with nobody having to remember a `SAMPLE DATA` banner.
 *
 * **The fault entries and the split entry deliberately do NOT use real
 * tickers**, and the line is worth stating because it is not the obvious one:
 * an invented *price* for a real company is labelled synthetic and is therefore
 * honest, but an invented *corporate action* is a claim about that company's
 * history, and no provenance label repairs "AMD split four-for-one in June
 * 2026". The same applies to "this symbol is permanently unauthorised". Those
 * entries are `ZZ`-prefixed, which is not an assigned NYSE or Nasdaq prefix and
 * is not in the tracked universe.
 */

import {
  type Adjustment,
  type Bar,
  type MarketDate,
  type MarketSession,
  marketSessionOn,
  type Timeframe,
  toMarketDate,
  toTicker,
} from "@marketpulse/shared";

/**
 * When this corpus claims its data was retrieved.
 *
 * **A fixed instant, not a stamp.** Two reasons and they are independent: a
 * `now()` here would make the series different on every run, which is the one
 * property Task 2.6.6 is required to have; and a provenance date that is always
 * today is permanently silent, which is the whole of what Task 2.3.5 found.
 *
 * It is also, deliberately, in the past and obviously arbitrary — which is one
 * more thing making a fixture series unmistakable for a live one.
 */
export const FIXTURE_RETRIEVED_AT = "2026-09-07T00:00:00.000Z";

/**
 * The first and last market dates this corpus has anything to say about.
 *
 * These are the source of `range-not-available`: a request whose window does
 * not overlap the instants these dates bound is one this provider will never
 * serve, which is `PROVIDER.md` §8.7's stated mechanism for that member. A
 * *partially* overlapping window is answered partially instead — see
 * `fixture-provider.ts`, which argues that split.
 *
 * They sit inside `MARKET_CALENDAR_RANGE` (2024-2028) by a wide margin, so
 * walking sessions across the corpus can never reach the calendar's edge.
 */
export const FIXTURE_FIRST_DATE: MarketDate = toMarketDate("2026-01-02");
export const FIXTURE_LAST_DATE: MarketDate = toMarketDate("2026-12-31");

/**
 * The market date this corpus's one corporate action falls on: a four-for-one
 * split, effective at the open.
 *
 * A Monday, and a session — `session()` below refuses a date that is not one,
 * so a calendar edit that turned this into a holiday would fail loudly rather
 * than silently removing the only thing in the story that exercises acceptance
 * criterion 5.
 */
export const FIXTURE_SPLIT_DATE: MarketDate = toMarketDate("2026-06-01");

/** Shares per old share. Four, because a factor of four is unmistakable. */
export const FIXTURE_SPLIT_RATIO = 4;

/**
 * Why an entry refuses to answer.
 *
 * A discriminated union on the entry rather than a `simulateError` parameter on
 * {@link import("./market-data-provider.js").MarketDataProvider}, which is
 * `PROVIDER.md` §8.7's instruction and Task 1.10.5's precedent: a test concern
 * in a shipped type is the thing that refused to widen `config.ts`'s port range
 * so a test could bind port 0.
 *
 * `unknown-symbol`, `range-not-available` and `aborted` are absent from this
 * union on purpose — none of them is a property of an entry. The first is a
 * symbol that is not in the corpus at all, the second is a window outside
 * {@link FIXTURE_FIRST_DATE}..{@link FIXTURE_LAST_DATE}, and the third is the
 * caller's own signal.
 */
export type FixtureFault =
  /**
   * Answers `rate-limited`. `retryAfterMs` is genuinely optional: an entry that
   * omits it produces a member with the field **absent** rather than present
   * and `undefined`, which is what `exactOptionalPropertyTypes` makes different
   * and what the provider branches for.
   */
  | { readonly kind: "rate-limited"; readonly retryAfterMs?: number }
  /** Answers `unauthorised`. One member covers missing, wrong and unentitled. */
  | { readonly kind: "unauthorised" }
  /** Answers `upstream-unavailable`. */
  | { readonly kind: "upstream-unavailable" }
  /**
   * Waits, so a caller with a short deadline gets `timeout`.
   *
   * The wait is real rather than faked, because the thing under test is the
   * composition of the deadline with the caller's signal, and a fake clock
   * would test the fake. `delayMs` is far longer than any deadline a test
   * passes, so the test never actually waits it out — the deadline fires first
   * and the provider stops.
   */
  | { readonly kind: "slow"; readonly delayMs: number };

/** One thing the fixture world knows about. */
export interface FixtureEntry {
  /** Seeds the walk. Part of the fixture; changing it changes every price. */
  readonly seed: number;

  /** Where the walk starts, on {@link FIXTURE_FIRST_DATE}. */
  readonly basePrice: number;

  /** Roughly how many shares trade in a minute. Scaled by the walk. */
  readonly baseVolume: number;

  /**
   * Minutes of every session that have **no print at all**, as offsets from the
   * open.
   *
   * This is the gap case, and it is ordinary rather than exceptional: on a
   * single venue a thinly traded name simply does not trade every minute, and
   * Story 2.8 must not read an absent minute as a fault. Declared rather than
   * drawn from the generator so a test can assert an exact count —
   * `minuteBars - missingMinutes.length`, with `minuteBars` still coming from
   * the calendar rather than from a literal.
   *
   * Offsets are kept below 210 so a half day drops the same minutes a regular
   * session does; an offset past a half day's close would silently be a no-op
   * on exactly the day this corpus exists to cover.
   */
  readonly missingMinutes: readonly number[];

  /** A four-for-one split at the open of {@link FIXTURE_SPLIT_DATE}. */
  readonly hasSplit: boolean;

  /** Present when this entry refuses to answer at all. */
  readonly fault?: FixtureFault;
}

/**
 * Everything the fixture world contains, keyed by ticker.
 *
 * Read the module comment on why the ordinary entries are real tickers and the
 * awkward ones are not.
 */
export const FIXTURE_CORPUS: Readonly<Record<string, FixtureEntry>> = {
  // Liquid: a print every minute of every session.
  NVDA: {
    seed: 0x4e_56_44_41,
    basePrice: 118.4,
    baseVolume: 42_000,
    missingMinutes: [],
    hasSplit: false,
  },
  // A second liquid name with a different seed, so a test comparing two
  // symbols is comparing two walks rather than one walk twice.
  SPY: {
    seed: 0x53_50_59_00,
    basePrice: 604.2,
    baseVolume: 96_000,
    missingMinutes: [],
    hasSplit: false,
  },
  // Thin: four minutes of every session have no print. Ordinary on a single
  // venue, and the case Story 2.8's gap handling is sized against.
  AMD: {
    seed: 0x41_4d_44_00,
    basePrice: 162.75,
    baseVolume: 7_400,
    missingMinutes: [10, 11, 12, 200],
    hasSplit: false,
  },
  // The corporate action, on a fictional ticker — see the module comment.
  ZZSPL: {
    seed: 0x5a_53_50_4c,
    basePrice: 512,
    baseVolume: 11_000,
    missingMinutes: [],
    hasSplit: true,
  },
  // The four faults. `ZZRL` says when to come back; `ZZRLN` does not, which is
  // the entry that exercises the optional field being genuinely absent.
  ZZRL: {
    seed: 1,
    basePrice: 10,
    baseVolume: 1_000,
    missingMinutes: [],
    hasSplit: false,
    fault: { kind: "rate-limited", retryAfterMs: 2_500 },
  },
  ZZRLN: {
    seed: 2,
    basePrice: 10,
    baseVolume: 1_000,
    missingMinutes: [],
    hasSplit: false,
    fault: { kind: "rate-limited" },
  },
  ZZUA: {
    seed: 3,
    basePrice: 10,
    baseVolume: 1_000,
    missingMinutes: [],
    hasSplit: false,
    fault: { kind: "unauthorised" },
  },
  ZZUP: {
    seed: 4,
    basePrice: 10,
    baseVolume: 1_000,
    missingMinutes: [],
    hasSplit: false,
    fault: { kind: "upstream-unavailable" },
  },
  ZZSLO: {
    seed: 5,
    basePrice: 10,
    baseVolume: 1_000,
    missingMinutes: [],
    hasSplit: false,
    // Two orders of magnitude above any deadline a test passes, so the deadline
    // is always what stops the call and the suite never waits.
    fault: { kind: "slow", delayMs: 30_000 },
  },
} as const;

/** Every ticker this corpus answers for, as branded tickers. */
export const FIXTURE_SYMBOLS = Object.keys(FIXTURE_CORPUS).map(toTicker);

/**
 * The session on a date this corpus covers, refusing a date it does not.
 *
 * Exported because the tests build their ranges from real session bounds rather
 * than from written-out instants — which is `PROVIDER.md` §6.2's requirement
 * applied to the tests as well as to the generator, and is what makes the half
 * day assert 210 without anybody typing 210.
 */
export function fixtureSessionOn(date: MarketDate): MarketSession {
  const session = marketSessionOn(date);
  if (session === undefined) {
    throw new RangeError(
      `${date} is not a trading session, so the fixture corpus has no bars ` +
        `for it. Weekends and holidays are answered with an empty series ` +
        `rather than looked up here.`,
    );
  }
  return session;
}

/**
 * A small, fast, deterministic pseudo-random generator.
 *
 * Mulberry32: 32 bits of state, no dependency, and the same sequence on every
 * engine because every operation in it is a 32-bit integer operation. `Math.random`
 * is unusable here for the obvious reason, and a library would be a dependency
 * for eleven lines.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * The seed for one symbol on one date.
 *
 * Mixing the date in is what makes each session an independent walk, so
 * generating one session never requires generating the ones before it — which
 * is what keeps a request for a single day from costing a year.
 */
function seedFor(entry: FixtureEntry, date: MarketDate): number {
  let hash = entry.seed >>> 0;
  for (const character of date) {
    hash =
      (Math.imul(hash ^ character.charCodeAt(0), 0x01_00_01_93) >>> 0) >>> 0;
  }
  return hash >>> 0;
}

/** Prices are money: rounded to `numeric(18,6)`'s scale and no further. */
function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/** A price, at the two decimals a quote is actually printed to. */
function toCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The price level this symbol trades around on a date, before any adjustment.
 *
 * **This is where the split becomes visible, and the direction matters.** A
 * four-for-one split quarters the price, so the *raw* series has a cliff in it
 * at {@link FIXTURE_SPLIT_DATE} — which is exactly the artefact `PROVIDER.md`
 * §3.6 says a raw chart honestly shows — and asking for `split-adjusted`
 * removes it by scaling the earlier half down to meet the later one.
 *
 * If it were the other way round, `split-adjusted` would introduce the step
 * instead of removing it, and every test in this story would assert the
 * opposite of what the product means.
 */
function levelOn(entry: FixtureEntry, date: MarketDate): number {
  const split = entry.hasSplit && date >= FIXTURE_SPLIT_DATE;
  return split ? entry.basePrice / FIXTURE_SPLIT_RATIO : entry.basePrice;
}

/**
 * Every bar of one session, at one-minute resolution, in the requested
 * adjustment.
 *
 * **The whole session is generated and then filtered by the caller, never
 * generated from the requested start.** That is not an implementation detail:
 * it is what makes a request for 10:00–10:05 return the same five bars a
 * request for the whole session contains at those minutes. Seeding the walk
 * from the requested start instead would give a different price for the same
 * minute depending on what else was asked for, which is a corpus that cannot be
 * used to test a cache, a stitch, or anything Story 2.8 does.
 *
 * `session.minuteBars` is the calendar's number — 390 on a regular session, 210
 * on a half day — so a half day is correct here without this file containing
 * either figure.
 */
export function generateMinuteBars(
  entry: FixtureEntry,
  session: MarketSession,
  adjustment: Adjustment,
): readonly Bar[] {
  const random = mulberry32(seedFor(entry, session.date));
  const missing = new Set(entry.missingMinutes);

  // A session's opening level moves day to day, so a multi-day series is not a
  // flat repeat. Drawn from this session's own generator, so it needs no state
  // carried from the session before it.
  let previousClose = toCents(
    levelOn(entry, session.date) * (0.9 + random() * 0.2),
  );

  const bars: Bar[] = [];

  for (let minute = 0; minute < session.minuteBars; minute += 1) {
    // Drawn on every minute, including the missing ones, so removing a minute
    // from `missingMinutes` does not shift every later price. A gap is an
    // absent print, not a different market.
    const drift = (random() - 0.5) * 0.004;
    const spread = random() * 0.002;

    const open = previousClose;
    const close = toCents(open * (1 + drift));
    const high = toCents(Math.max(open, close) * (1 + spread));
    const low = toCents(Math.min(open, close) * (1 - spread));
    const volume = Math.round(entry.baseVolume * (0.5 + random()));

    previousClose = close;

    if (missing.has(minute)) continue;

    bars.push(
      adjust(
        {
          startsAt: new Date(session.open.getTime() + minute * 60_000),
          open,
          // Rounding can push `high` below `open` or `close` by a cent on a
          // near-zero spread, so the invariant is re-established after it
          // rather than assumed to survive it.
          high: Math.max(high, open, close),
          low: Math.min(low, open, close),
          close,
          volume,
        },
        entry,
        session.date,
        adjustment,
      ),
    );
  }

  return bars;
}

/**
 * One bar for a whole session, aggregated from that session's minute bars.
 *
 * Derived rather than generated separately, so the two timeframes agree: the
 * daily open is the first minute's open, the close the last minute's close, the
 * high and low the extremes, and the volume the sum. A separately seeded daily
 * walk would let a `1d` request and a `1m` request describe two different days.
 *
 * `startsAt` is the **session's open instant** rather than midnight, which is
 * `bar.ts`'s stated rule: the market is what the bar is about, and a session is
 * not a calendar day.
 *
 * Returns nothing when the session produced no bars at all, which for this
 * corpus cannot happen — every entry prints at least once — but is the shape a
 * thinner one would need.
 */
export function aggregateToDailyBar(minutes: readonly Bar[]): Bar | undefined {
  const first = minutes[0];
  const last = minutes[minutes.length - 1];
  if (first === undefined || last === undefined) return undefined;

  return {
    startsAt: first.startsAt,
    open: first.open,
    high: minutes.reduce(
      (highest, bar) => Math.max(highest, bar.high),
      first.high,
    ),
    low: minutes.reduce((lowest, bar) => Math.min(lowest, bar.low), first.low),
    close: last.close,
    volume: minutes.reduce((total, bar) => total + bar.volume, 0),
  };
}

/**
 * Every bar of one session at the requested timeframe.
 *
 * The `1d` case deliberately goes through the `1m` case — see
 * {@link aggregateToDailyBar}.
 */
export function generateSessionBars(
  entry: FixtureEntry,
  session: MarketSession,
  timeframe: Timeframe,
  adjustment: Adjustment,
): readonly Bar[] {
  const minutes = generateMinuteBars(entry, session, adjustment);
  if (timeframe === "1m") return minutes;

  const daily = aggregateToDailyBar(minutes);
  return daily === undefined ? [] : [daily];
}

/**
 * Applies the requested adjustment to one raw bar.
 *
 * Only bars **before** the split move, and they move by exactly the factor:
 * prices divided, volume multiplied, so the notional traded is preserved. A bar
 * on or after the split date is already on the post-split scale and is
 * untouched in both modes — which is why a series that does not span the split
 * returns identical numbers whichever adjustment was asked for.
 *
 * That last sentence is the one worth remembering: it is `market-provenance.ts`'s
 * warning made concrete, and it is why acceptance criterion 5 forbids a
 * default. A wrong adjustment argument is invisible on almost every series.
 */
function adjust(
  bar: Bar,
  entry: FixtureEntry,
  date: MarketDate,
  adjustment: Adjustment,
): Bar {
  if (adjustment === "raw") return bar;
  if (!entry.hasSplit || date >= FIXTURE_SPLIT_DATE) return bar;

  return {
    startsAt: bar.startsAt,
    open: round(bar.open / FIXTURE_SPLIT_RATIO),
    high: round(bar.high / FIXTURE_SPLIT_RATIO),
    low: round(bar.low / FIXTURE_SPLIT_RATIO),
    close: round(bar.close / FIXTURE_SPLIT_RATIO),
    volume: bar.volume * FIXTURE_SPLIT_RATIO,
  };
}
