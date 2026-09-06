/**
 * The one place in this workspace that converts between a UTC instant and
 * market-local time.
 *
 * **That sentence is acceptance criterion 2 of Story 2.5.** It is the same shape
 * as two rules this repository already keeps: `apps/frontend/src/api-client.ts`
 * is the only file that calls `fetch`, and `apps/backend/src/securities.ts`
 * holds Epic 13's temporal seam by *not exporting* its `Kysely` handle.
 *
 * Unlike those two, this one is **enforced rather than merely written down**.
 * Two `no-restricted-syntax` rules in `eslint.config.mjs` name this file as
 * their single exception: one forbids constructing an `Intl.DateTimeFormat`
 * anywhere else in the workspace, and one forbids spelling the market's
 * timezone identifier anywhere else. Both were made to fail, in two packages,
 * before being believed. So `pnpm verify` catches a second converter, which is
 * the failure the other two rules can only ask a reviewer to catch.
 *
 * What that check cannot see is stated here rather than left implicit: a
 * conversion written with a hard-coded `-5` and no timezone name at all. That
 * is not a duplicate of this module so much as a reimplementation of it, and it
 * is wrong twice a year — which is what `instantFromMarketTime`'s own tests
 * exist to document.
 *
 * ## Why this module exists at all
 *
 * The full rule, in one sentence: **storage is `timestamptz`, the wire is UTC
 * ISO 8601, `America/New_York` exists only at the moment of display or of
 * deciding which session something belongs to, and exactly one module performs
 * the conversion.** Scattering `Intl.DateTimeFormat` through the codebase would
 * not merely be untidy — it would scatter the two decisions in
 * {@link instantFromMarketTime}, and those decisions are the entire reason a
 * conversion boundary is worth having.
 *
 * ## What this module deliberately does not know
 *
 * **It does not know what a holiday is, what a session is, or whether the market
 * is open.** Those are Tasks 2.5.3 and 2.5.4. This module knows exactly one
 * thing: given an instant, what is the wall-clock time in `America/New_York`,
 * and given a market date and a wall-clock time, what instant is that. Keeping
 * the two apart is deliberate, because they fail differently — a wrong date in
 * the calendar table is wrong on one day a year, and a wrong conversion here is
 * wrong twice a year for everything.
 *
 * ## No dependency, and that was measured rather than assumed
 *
 * `CALENDAR.md` §6 costed luxon (+262 kB to the browser, on a 357 kB bundle),
 * `temporal-polyfill` (~30 kB gzipped to polyfill something Chrome already has)
 * and `@date-fns/tz` (small, and a wrapper over `Intl.DateTimeFormat` — so
 * paying a dependency to make the call we would otherwise make ourselves, while
 * dragging in 27 MB of `date-fns` to be useful).
 *
 * The standing rule is that a library wins when its failure mode is silent and
 * the hand-rolled version's is loud. Timezone arithmetic done wrong **is**
 * silent, so that rule points at a library here — and the measurement is what
 * overrode it: **the libraries have the same silent defaults.** luxon and
 * `@date-fns/tz` both resolve the spring gap and the autumn fold without
 * complaining, exactly as raw `Intl` does. What fixes the silence is
 * {@link instantFromMarketTime}'s refusal, and no library will refuse on your
 * behalf. So this is not a hand-roll of something a library does better; it is
 * platform calls plus the two decisions a library does not make.
 *
 * `Temporal` would genuinely help and is unavailable: it is **unflagged in
 * Chrome 148 and flagged in Node 24**, which is worse than neither having it,
 * because this package is consumed by both — a module written against it would
 * work in the browser and throw `ReferenceError` in `apps/backend`, at runtime,
 * with no compiler complaint. **The reversal trigger is Node shipping
 * `Temporal` unflagged**, at which point the platform becomes the library and
 * {@link instantFromMarketTime} gets about fifteen lines shorter.
 *
 * ## One staleness surface nobody here owns
 *
 * The timezone database is the **runtime's**, not ours — this machine's Node
 * 24.20.0 reports ICU 78.3 / tzdata 2026a. If the US ever changes its DST rule,
 * which has been legislated for repeatedly and not enacted, the correction
 * arrives through a Node upgrade and a browser upgrade on their schedule rather
 * than through this repository. Nothing here can check that.
 */

/**
 * The market's timezone. Every `Intl` call in this file names it, and no other
 * file in the workspace names it at all.
 *
 * A constant rather than a parameter, deliberately. This product is US equities
 * (`PRODUCT_SPEC.md` §1), the universe is US-listed (`UNIVERSE.md`), and a
 * timezone parameter would be a second thing every call site has to get right
 * in exchange for a generality nothing needs. A second market is a change to
 * this module and to the calendar table together, which is the correct unit of
 * work for that change.
 */
const MARKET_TIME_ZONE = "America/New_York";

/**
 * A calendar date in the market's own timezone: `YYYY-MM-DD`, and never an
 * instant at midnight.
 *
 * A branded string, following {@link Ticker}: structurally a `string` but not
 * assignable *from* one, so a raw string reaches a function expecting a market
 * date only through {@link toMarketDate}. The brand is erased at runtime.
 *
 * **Encoding a market date as an instant is the mistake that costs a whole
 * day**, and it is worth spelling out because the wrong version looks right.
 * `2026-09-04T00:00:00Z` is 2026-09-03 **20:00** in New York, so the obvious
 * `instant.toISOString().slice(0, 10)` on a session's own open is correct in the
 * afternoon and wrong in the evening — which is to say it passes every test
 * written before dinner. Story 2.8's per-session bar counts, Story 2.9's
 * contract and Story 2.13's window control all key on the market date and would
 * all be wrong the same way. {@link marketDateAt} is the correct conversion.
 */
declare const brand: unique symbol;

export type MarketDate = string & { readonly [brand]: "MarketDate" };

/** `YYYY-MM-DD`, shape only — {@link isMarketDate} also checks the date exists. */
const MARKET_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Is this a real `YYYY-MM-DD` calendar date?
 *
 * Shape **and** existence: `2026-02-30` matches the pattern and is not a date,
 * so it is refused. That matters more than it looks, because the calendar table
 * Task 2.5.3 writes is hand-maintained, and a typo producing an impossible date
 * should fail where it is written rather than resolve silently to 2 March.
 */
export function isMarketDate(value: string): value is MarketDate {
  const match = MARKET_DATE_PATTERN.exec(value);
  if (match === null) return false;

  const [, year, month, day] = match;
  // The capture groups exist because the pattern matched; `noUncheckedIndexedAccess`
  // cannot see that, and this is narrowing rather than a runtime concern.
  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }

  // Round-tripping through UTC is the existence check. It is safe to use an
  // instant here precisely because both ends are UTC and no timezone is
  // involved — this is string validation, not a market-time conversion.
  const probe = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );

  return (
    probe.getUTCFullYear() === Number(year) &&
    probe.getUTCMonth() === Number(month) - 1 &&
    probe.getUTCDate() === Number(day)
  );
}

/**
 * Narrows a string to a {@link MarketDate}, throwing if it is not one.
 *
 * Throwing is right at this boundary for {@link toTicker}'s reason: a malformed
 * date is a programming or data-entry error rather than a market condition the
 * interface should degrade around.
 */
export function toMarketDate(value: string): MarketDate {
  if (!isMarketDate(value)) {
    throw new TypeError(
      `Not a valid market date (expected YYYY-MM-DD): ${JSON.stringify(value)}`,
    );
  }
  return value;
}

/**
 * A wall-clock time of day in the market's timezone, as parts rather than as a
 * string.
 *
 * Parts because that is what the conversion actually produces and what a test
 * should assert: a test asserting `"09:30:00"` is asserting a *formatter*, and
 * a test asserting `{ hour: 9, minute: 30 }` is asserting the *conversion*. The
 * formatter is Task 2.5.5's and lives in `apps/frontend`.
 *
 * `second` is required rather than optional, so `exactOptionalPropertyTypes`
 * never has an opinion about it and every construction states the whole time.
 * {@link toMarketTimeOfDay} is what turns the calendar table's `"13:00"` into
 * one.
 */
export interface MarketTimeOfDay {
  /** 0–23. Never 24 — see the `hourCycle` note on {@link marketWallClockAt}. */
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

/** `HH:MM` or `HH:MM:SS`. */
const MARKET_TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Parses `"09:30"` or `"13:00:00"` into a {@link MarketTimeOfDay}.
 *
 * It exists because the calendar table Task 2.5.3 writes stores an early close
 * as `closesAt: "13:00"` — a string, because a table of literals is reviewable
 * and tree-shakes to nothing. Parsing it belongs here rather than there, so
 * that the one module owning market time owns the string form of it too.
 */
export function toMarketTimeOfDay(value: string): MarketTimeOfDay {
  const match = MARKET_TIME_PATTERN.exec(value);
  const [, hour, minute, second] = match ?? [];

  if (hour === undefined || minute === undefined) {
    throw new TypeError(
      `Not a valid market time (expected HH:MM or HH:MM:SS): ${JSON.stringify(value)}`,
    );
  }

  const parsed = {
    hour: Number(hour),
    minute: Number(minute),
    second: second === undefined ? 0 : Number(second),
  };

  if (
    parsed.hour > 23 ||
    parsed.minute > 59 ||
    parsed.second > 59 ||
    // 24:00 is a real ISO 8601 spelling of midnight and is refused here rather
    // than accepted, because it would be the only value in this module able to
    // name one instant two ways.
    !Number.isInteger(parsed.hour)
  ) {
    throw new RangeError(`Market time out of range: ${JSON.stringify(value)}`);
  }

  return parsed;
}

/**
 * The UTC offset in effect in the market's timezone at some instant.
 *
 * Three representations of one fact, computed together in
 * {@link marketOffsetAt} so they cannot disagree. Each has a caller:
 *
 * - `minutes` is what arithmetic needs, and is the source the other two derive
 *   from. Negative west of Greenwich, so New York is `-240` or `-300`.
 * - `abbreviation` is what a chart axis and a log line want — `EDT` / `EST`.
 * - `iso` is the `±HH:MM` form, for anywhere an offset has to be written down.
 *
 * `abbreviation` is a plain `string` rather than an `"EST" | "EDT"` union, and
 * that is deliberate: the value comes from the **runtime's** timezone database
 * (see the module comment), so pinning a union would turn a tzdata update into
 * a compile error nobody in this repository can act on. It is data from a
 * source we do not control, and typing it as though we did would be a lie the
 * compiler enforces.
 *
 * Note also what is *not* here: no `isDaylightSaving` boolean. Whether the
 * offset is the summer one is a question about `minutes`, and a derived boolean
 * beside the value it derives from is a second thing to keep in step.
 */
export interface MarketOffset {
  /** Minutes to add to UTC to get market time. `-240` in EDT, `-300` in EST. */
  readonly minutes: number;
  /** As the runtime's timezone database names it: `EDT`, `EST`. */
  readonly abbreviation: string;
  /** ISO 8601 offset: `-04:00`, `-05:00`. */
  readonly iso: string;
}

/**
 * An instant, expressed in the market's wall clock.
 *
 * The `date` here is the **market** date, which is the field most likely to
 * differ from what a careless reading of the instant would give — see
 * {@link MarketDate}.
 */
export interface MarketWallClock {
  readonly date: MarketDate;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly offset: MarketOffset;
}

/**
 * The formatter, memoised — and constructed **lazily, on first use, never at
 * module load.**
 *
 * That is an instruction rather than a preference, and it has two independent
 * reasons.
 *
 * **Cost.** Constructing an `Intl.DateTimeFormat` is expensive and reusing one
 * is cheap: measured on this machine over 20,000 iterations, **30.98 µs to
 * construct against 2.19 µs to reuse — 14.2×**. At Task 2.5.5's clock ticking
 * once a second that difference is nothing; at Story 2.8's ingest — 390 bars ×
 * 101 securities × a backfill's worth of sessions — it is the difference
 * between a fast backfill and a slow one.
 *
 * **Bundle.** `packages/shared` is inlined into the frontend bundle whether or
 * not the frontend imports it, and Task 2.3.8 measured exactly what survives
 * tree-shaking: a plain array literal vanishes completely, while `SECTOR_ETFS`
 * — built by *calling* `toTicker()` eleven times — cost 115 bytes, because a
 * call expression is not provably side-effect-free. A module-load
 * `const FMT = new Intl.DateTimeFormat(...)` is precisely that shape and would
 * be retained in a build that never uses it. Inside the function it is dead
 * code in a dead function, which the bundler drops entirely.
 *
 * The variable is module-scoped because the *cache* has to outlive the call;
 * only the *construction* is deferred.
 */
let wallClockFormatter: Intl.DateTimeFormat | undefined;

function getWallClockFormatter(): Intl.DateTimeFormat {
  wallClockFormatter ??= new Intl.DateTimeFormat("en-US", {
    timeZone: MARKET_TIME_ZONE,
    // `hourCycle: "h23"` and not `"h24"`, and this is a measured trap rather
    // than a style preference: under `"h24"` midnight in ET formats as **`24`**,
    // an hour outside 0–23 that every downstream `Number()` accepts and no
    // downstream comparison handles. `"h12"` would be worse still. Confirmed on
    // this machine against 2026-09-04T04:00:00Z.
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return wallClockFormatter;
}

let offsetFormatter: Intl.DateTimeFormat | undefined;

function getOffsetFormatter(): Intl.DateTimeFormat {
  offsetFormatter ??= new Intl.DateTimeFormat("en-US", {
    timeZone: MARKET_TIME_ZONE,
    // Two names for the same fact in one formatter, so one `formatToParts` call
    // answers both. `"short"` gives the abbreviation (`EDT`); `"longOffset"`
    // gives `GMT-04:00`. They cannot both be requested at once, so the
    // abbreviation is read here and the numeric offset is computed by
    // arithmetic in `marketOffsetAt` — which is more robust anyway, because
    // `Intl`'s offset strings are prose we would have to parse.
    timeZoneName: "short",
  });

  return offsetFormatter;
}

/**
 * Reads one instant's wall-clock fields out of `Intl`, as numbers.
 *
 * `formatToParts` rather than `format` plus a regular expression, because the
 * *format* is locale prose (`en-US` gives `09/04/2026, 09:30:00`, and another
 * locale gives something else) while the *parts* are named data. Parsing the
 * rendered string would make this module depend on a locale it does not set.
 */
function wallClockParts(instant: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = getWallClockFormatter().formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((candidate) => candidate.type === type);
    if (part === undefined) {
      // Unreachable while the formatter above requests every one of these, and
      // present because the alternative is a non-null assertion on data from a
      // platform API. If it ever fires, the formatter's options changed.
      throw new Error(`Intl did not return a "${type}" part`);
    }
    return Number(part.value);
  };

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

/** `-240` → `"-04:00"`. */
function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const absolute = Math.abs(minutes);
  const pad = (value: number): string => String(value).padStart(2, "0");

  return `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

/**
 * The UTC offset in effect in the market's timezone at `instant`.
 *
 * The minute count is computed rather than parsed out of `Intl`'s offset
 * string, for the reason given on {@link getOffsetFormatter}: the difference
 * between the same instant read as market wall time and read as UTC *is* the
 * offset, and arithmetic on two sets of numbers is more robust than a regular
 * expression over `GMT-4` in one locale and something else in another.
 *
 * The arithmetic is safe despite this module's own standing warning about
 * instant arithmetic, and the distinction is worth being precise about: this
 * subtracts two epoch values to obtain a *duration*, which is exactly what
 * epoch arithmetic is for. What the warning forbids is treating a duration
 * added to an instant as a calendar operation — "the same time tomorrow" is not
 * "24 hours later", twice a year.
 */
export function marketOffsetAt(instant: Date): MarketOffset {
  const parts = wallClockParts(instant);

  const asIfUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  // Seconds are the finest granularity the formatter reports, so the instant's
  // own milliseconds have to come off the other side of the subtraction or a
  // non-zero millisecond field would round the offset.
  const offsetMs = asIfUtc - (instant.getTime() - instant.getMilliseconds());
  const minutes = Math.round(offsetMs / 60_000);

  const abbreviationPart = getOffsetFormatter()
    .formatToParts(instant)
    .find((part) => part.type === "timeZoneName");

  return {
    minutes,
    abbreviation: abbreviationPart?.value ?? formatOffset(minutes),
    iso: formatOffset(minutes),
  };
}

/**
 * Operation 1 — an instant, as the market's wall clock reads it.
 *
 * The one function every display path eventually calls.
 */
export function marketWallClockAt(instant: Date): MarketWallClock {
  const parts = wallClockParts(instant);
  const pad = (value: number): string => String(value).padStart(2, "0");

  return {
    date: toMarketDate(
      `${String(parts.year).padStart(4, "0")}-${pad(parts.month)}-${pad(parts.day)}`,
    ),
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
    offset: marketOffsetAt(instant),
  };
}

/**
 * Operation 3 — which market date an instant falls on.
 *
 * Its own function rather than `marketWallClockAt(instant).date`, because it is
 * the question asked most often and the one most often answered wrongly. "Which
 * session does this bar belong to" is a *date* question, and the tempting
 * `instant.toISOString().slice(0, 10)` is right by luck for most of the day and
 * wrong every evening — see {@link MarketDate}.
 */
export function marketDateAt(instant: Date): MarketDate {
  return marketWallClockAt(instant).date;
}

/** Why {@link instantFromMarketTime} refused. */
export type MarketTimeErrorReason = "nonexistent" | "ambiguous";

/**
 * A wall-clock time that does not identify exactly one instant.
 *
 * A class with a `reason` rather than two exported functions or a message to
 * match on, so a caller — and more importantly a test — can distinguish the two
 * cases without asserting on prose. The message is for a human reading a log;
 * the `reason` is the contract.
 */
export class MarketTimeError extends Error {
  readonly reason: MarketTimeErrorReason;

  constructor(reason: MarketTimeErrorReason, message: string) {
    super(message);
    this.name = "MarketTimeError";
    this.reason = reason;
  }
}

/** A day in milliseconds. Used only to bracket a DST transition — see below. */
const PROBE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Operation 2 — a market date and a wall-clock time, as the instant they name.
 *
 * **This is the function the whole module exists for, because it is the one
 * with a decision in it.**
 *
 * ## The two cases, and why the answer is a refusal
 *
 * Twice a year a local wall-clock time does not name exactly one instant, and
 * on this platform both cases resolve *silently* to something plausible and
 * wrong. Both measured on this machine:
 *
 * **The spring-forward gap.** 2026-03-08 02:30 ET does not exist — the clock
 * goes 01:59:59 → 03:00:00. The natural two-pass resolution returns
 * `2026-03-08T06:30:00Z`, which formats back as **01:30** — a *different time
 * from the one asked for*, returned with no error.
 *
 * **The autumn fold.** 2026-11-01 01:30 ET happens **twice**, once at `-04:00`
 * and once an hour later at `-05:00`. Asking for it returns the **first**,
 * chosen with no error and no signal that a choice was made. This is the same
 * fact `apps/backend/migrations/README.md` records as the reason a naive
 * `timestamp` column means nothing, arriving in the application layer.
 *
 * `CALENDAR.md` §6.3 checked the libraries: **luxon and `@date-fns/tz` have the
 * same defaults**, so this is not a case where buying a dependency buys the
 * answer.
 *
 * ## Refusing is provably safe here, which is stronger than it being correct
 *
 * Every US DST transition is a **Sunday** — second Sunday in March, first Sunday
 * in November — and the market is closed on Sundays. `CALENDAR.md` §6.3
 * tabulates all ten transitions across the covered 2024–2028 range and every
 * one is a Sunday. So **no trading session begins in, ends in, or contains
 * either transition**, and refusing is not merely the cheap correct answer: it
 * is an answer no legitimate caller in this application can be forced to want.
 *
 * ## There is deliberately no escape hatch
 *
 * No `resolve: "earlier" | "later"` parameter, no `lenient` flag, no
 * "disambiguation" option. This follows `CALENDAR.md` §1.5's rule about the
 * calendar's own out-of-range refusal, for the same reason: **a flag whose safe
 * setting is the default and whose unsafe setting is available is a flag
 * somebody sets during an incident**, and the incident is the worst moment to
 * choose silently between two instants an hour apart. If a caller ever
 * genuinely needs one of the two, it should say which *instant* it means, which
 * it can already do — it has one.
 *
 * ## On the arithmetic
 *
 * `naiveUtc` below is **not an instant**. It is the requested wall-clock fields
 * packed into a number using UTC as a neutral encoding, which is why adding and
 * subtracting a day to it is legitimate: the ±24 h probes exist only to find
 * the two offsets that bracket any transition, since transitions are months
 * apart. The candidates are then validated by **round-tripping through
 * {@link marketWallClockAt}** — a candidate is correct exactly when reading it
 * back gives the date and time that were asked for. That is a stronger check
 * than comparing offsets, and it is one a reader can verify by eye.
 */
export function instantFromMarketTime(
  date: MarketDate,
  time: MarketTimeOfDay,
): Date {
  const match = MARKET_DATE_PATTERN.exec(date);
  const [, year, month, day] = match ?? [];

  if (year === undefined || month === undefined || day === undefined) {
    // Unreachable through `MarketDate`, whose brand can only be obtained from
    // `toMarketDate`. Present because the alternative is a non-null assertion.
    throw new TypeError(`Not a valid market date: ${JSON.stringify(date)}`);
  }

  const naiveUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    time.hour,
    time.minute,
    time.second,
  );

  const offsetBefore = marketOffsetAt(
    new Date(naiveUtc - PROBE_WINDOW_MS),
  ).minutes;
  const offsetAfter = marketOffsetAt(
    new Date(naiveUtc + PROBE_WINDOW_MS),
  ).minutes;

  const candidates = [
    ...new Set([
      naiveUtc - offsetBefore * 60_000,
      naiveUtc - offsetAfter * 60_000,
    ]),
  ].map((epoch) => new Date(epoch));

  const resolved = candidates.filter((candidate) => {
    const readBack = marketWallClockAt(candidate);
    return (
      readBack.date === date &&
      readBack.hour === time.hour &&
      readBack.minute === time.minute &&
      readBack.second === time.second
    );
  });

  const asked = `${date} ${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}:${String(time.second).padStart(2, "0")} ET`;

  if (resolved.length === 0) {
    throw new MarketTimeError(
      "nonexistent",
      `${asked} does not exist: the clock skips forward over it when daylight saving time begins. No trading session starts on a DST transition day, so this is a caller error rather than a market condition.`,
    );
  }

  if (resolved.length > 1) {
    throw new MarketTimeError(
      "ambiguous",
      `${asked} happens twice, at ${resolved.map((candidate) => marketOffsetAt(candidate).iso).join(" and ")}, because daylight saving time ends that day. Pass the instant you mean rather than the wall-clock time. No trading session ends on a DST transition day, so this is a caller error rather than a market condition.`,
    );
  }

  const [only] = resolved;
  if (only === undefined) throw new Error("unreachable");

  return only;
}
