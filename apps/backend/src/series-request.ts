/**
 * What a caller is allowed to ask for, turned into a typed request or a named
 * refusal (Task 2.9.2).
 *
 * **A pure function, with no route, no pool and no `fetch` around it.** That is
 * the shape rather than an accident: this is the half of `GET /market-data/bars`
 * that decides what may be asked, and it is testable at every refusal without
 * an assembled server, a database or a frozen clock. Task 2.9.6 registers the
 * route over it; Task 2.9.4 reads the window it produces.
 *
 * ## It returns a result and does not throw, and that inverts `toTicker`
 *
 * `toTicker`, `toTimeRange` and `toBarSeries` all **throw**, and their files say
 * why: every refusal they can produce is a programming error, and a result a
 * caller might forget to check is worse than an exception nobody can ignore.
 *
 * A query string is the exact opposite. **Every refusal here is a client's
 * mistake**, it arrives from outside the process, and it has to become a `400`
 * with a sentence a person can act on — so an exception would be a control-flow
 * mechanism for ordinary traffic, and `errors.ts` would map it to a 500 unless
 * something remembered to catch it. `fetchBarsCommand`'s `{ problem }` union is
 * the same choice made for the same reason one layer over, and this is that
 * shape with a machine-readable reason added.
 *
 * ## Every refusal is a 400, and the reason exists anyway
 *
 * `MARKET-DATA-API.md` §6 maps this whole module to one status: a malformed
 * timeframe, a reversed range, both window forms, an over-cap window and a
 * window outside the calendar are all `BAD_REQUEST`. So {@link
 * SeriesRefusalReason} is not there for the route to branch on — it is there
 * because a **test** that asserts on prose is a test that fails when the prose
 * is improved, which is `MarketCalendarRangeError`'s stated reason for carrying
 * its date as a field. That is a reader, and `API_ERROR_CODES`' rule is that a
 * member exists when something reads it.
 *
 * The one refusal a caller can cause that is **not** here is an unknown symbol:
 * that is a `404`, it needs the database, and it is Task 2.9.6's. This module
 * checks that a symbol is *well formed*, never that it is *listed* —
 * `ticker.ts` draws that line and this does not move it.
 *
 * ## `now` is a parameter, and the lint rule is the mechanism
 *
 * "The last 5 sessions" needs today's **market** date, and `packages/shared` may
 * not read a wall clock — `eslint.config.mjs` makes a zero-argument `new Date()`
 * there a hard error. So the clock is read once, at the edge, and passed in.
 * That is also what makes the named form testable without freezing time, and it
 * is the property Epic 13 needs: a replay request is this function with a
 * different `now`.
 *
 * ## What this deliberately does not do
 *
 * **No ceiling on how recent a window may be.** Invariant 4 puts temporal
 * isolation in the data and tool layer so it is structurally impossible to
 * bypass, and Epic 13 owns it. A ceiling enforced here would be one an importer
 * of the query layer could route around, which is precisely the arrangement ADR
 * 0015 exists to avoid. What this module owes Epic 13 is to not be in its way:
 * the window is resolved from an instant it is handed, so a replay clock
 * substitutes for a wall clock with no change to anything here.
 */

import {
  isTicker,
  lastMarketSessions,
  MARKET_CALENDAR_RANGE,
  MarketCalendarRangeError,
  marketDateAt,
  marketSessionsBetween,
  TIMEFRAMES,
  toTicker,
  toTimeRange,
  type MarketSession,
  type Ticker,
  type Timeframe,
  type TimeRange,
} from "@marketpulse/shared";

import { windowFor } from "./bar-window.js";

/**
 * The most bars one series response may carry — `MARKET-DATA-API.md` §4's
 * decision, as a number rather than as prose.
 *
 * 10,000 bars is ~1.14 MB of JSON and ~184 kB gzipped, about 150 ms of transfer
 * on a 10 Mbit/s link, against §28's 500 ms budget for visible feedback. **The
 * binding constraint is the wire and not the parse**, which was measured and is
 * counter-intuitive enough to be worth restating: even a whole year of minute
 * bars — 97,530 of them, 11.08 MB — parses in 25.4 ms, inside §28's 50 ms
 * main-thread budget. Parsing refuses nothing; bandwidth refuses this.
 *
 * Stated in **bars rather than bytes** because bars are what a caller asked for
 * and bytes are what we would have to explain — and because the per-bar cost was
 * measured across eight securities spanning the price and liquidity range and
 * varied by only 4% (109.4–113.6 bytes). Re-measure rather than cite: the
 * method is `MARKET-DATA-API.md` §8.
 *
 * There is no pagination behind this. A cursor would be a **second** mechanism
 * for "you did not get everything" beside `SeriesCoverage`, which is honest and
 * already exists, and `toBarSeries` coherence-checks a whole series — so a
 * paged client could not construct one until the last page landed.
 */
export const MAX_SERIES_BARS = 10_000;

/**
 * Which of the caller's mistakes this was.
 *
 * Five members, each named for **what the caller did wrong** rather than for
 * what this module did about it. They all become a `400`; see the module
 * comment for why they are distinguished anyway.
 *
 * `window` covers every way a window can be malformed — absent, doubly
 * specified, unparseable, reversed — because they are one mistake with several
 * spellings and a caller does nothing different for each. They still carry
 * **different messages**, which is where the difference belongs: a message is
 * read by a person, a reason is read by code.
 *
 * `calendar-range` is separate from `window` for the opposite reason. It is not
 * a malformed request at all — it is a well-formed one this system cannot
 * express, because the trading calendar is a checked-in table covering
 * 2024–2028 and refuses rather than guessing which days outside it were
 * holidays. That is a different sentence to a user and a different thing to fix.
 */
export const SERIES_REFUSAL_REASONS = [
  "symbol",
  "timeframe",
  "window",
  "calendar-range",
  "too-large",
] as const;

/** One of {@link SERIES_REFUSAL_REASONS}. */
export type SeriesRefusalReason = (typeof SERIES_REFUSAL_REASONS)[number];

/** Why a request was refused, and what to tell the caller. */
export interface SeriesRefusal {
  /** For code and for tests. */
  readonly reason: SeriesRefusalReason;
  /**
   * For a person, and safe to show one.
   *
   * Every message here is written **in this file**, and the thrown messages it
   * replaces are deliberately not passed through. `MarketCalendarRangeError`'s
   * own message names the source file to edit and the constant to extend, which
   * is correct for a developer walking a stack and is exactly the internal
   * detail `errors.ts` exists to keep off the wire.
   */
  readonly message: string;
}

/**
 * A request this server is willing to answer.
 *
 * Three fields, and the window is **always absolute** whichever form the caller
 * used — `MARKET-DATA-API.md` §2's decision, which is what makes the named form
 * sugar rather than a second product. Task 2.9.3's response reports this same
 * range back as `coverage.requested`, so `sessions=5` and the equivalent
 * `start`/`end` pair are the same answer rather than two.
 *
 * Named `SeriesRequest` and not `BarsRequest` because that name is taken by the
 * **provider's** request (`market-data-provider.ts`), which is a different thing
 * one layer down: it carries an `adjustment` and is what we ask a vendor. This
 * is what a client asks us. Task 2.9.5 holds both at once and they must not be
 * confusable.
 */
export interface SeriesRequest {
  /** A well-formed ticker. Whether it is *listed* is Task 2.9.6's 404. */
  readonly symbol: Ticker;
  /** One of {@link TIMEFRAMES}. */
  readonly timeframe: Timeframe;
  /** The resolved half-open window, `[start, end)`. */
  readonly range: TimeRange;
}

/** Either a request or a refusal; never both, never neither. */
export type SeriesRequestResult =
  { readonly request: SeriesRequest } | { readonly refusal: SeriesRefusal };

/**
 * The query string as it actually arrives, before anything has checked it.
 *
 * Every value is `unknown` rather than `string | undefined`, and that is honest
 * rather than defensive: a query string can repeat a key, and `?symbol=NVDA&
 * symbol=AMD` reaches a handler as an **array**. Typing these as strings would
 * make that case a lie the compiler agrees with, and the first thing to notice
 * would be `isTicker` being handed an array. So a present non-string is a
 * refusal with its own sentence.
 */
export interface SeriesRequestQuery {
  readonly symbol?: unknown;
  readonly timeframe?: unknown;
  readonly start?: unknown;
  readonly end?: unknown;
  readonly sessions?: unknown;
}

/**
 * A UTC ISO 8601 instant, and **the `Z` is required**.
 *
 * `CALENDAR.md` §5 fixed the wire format: an instant is UTC with the `Z`, and
 * `America/New_York` exists only at the moment of display. Requiring the suffix
 * is what makes that a mechanism instead of a convention, and the failure it
 * prevents is invisible in local testing: `new Date("2026-09-04T13:30:00")`
 * parses as **local** time, so a zone-less instant is correct on a UTC server,
 * wrong by hours on a developer's laptop, and produces a chart that is plausible
 * and shifted rather than an error anybody sees.
 *
 * A numeric offset (`+01:00`) is refused with it. It is unambiguous and it would
 * be easy to accept, and accepting it would put a second wire format in a
 * contract whose whole point is that there is one.
 */
const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

/** A positive count of sessions, before it is a number. */
const SESSION_COUNT = /^\d+$/;

/**
 * Parse and validate a series request, resolving a named window through the
 * trading calendar.
 *
 * `now` is the instant the request arrived. It is used for exactly one thing —
 * resolving the named window's end date through `marketDateAt` — and an
 * absolute request never reads it.
 */
export function parseSeriesRequest(
  query: SeriesRequestQuery,
  now: Date,
): SeriesRequestResult {
  const symbol = parseSymbol(query.symbol);
  if ("refusal" in symbol) return symbol;

  const timeframe = parseTimeframe(query.timeframe);
  if ("refusal" in timeframe) return timeframe;

  const range = parseWindow(query, timeframe.value, now);
  if ("refusal" in range) return range;

  // The cap is checked **before the query runs**, not after, which is
  // `MARKET-DATA-API.md` §4's stated arrangement: an over-cap request costs a
  // walk of the calendar rather than a scan of 97,530 rows that is then thrown
  // away. A cap enforced after the read is a cap that costs exactly what it
  // exists to save.
  const capped = enforceCap(timeframe.value, range.value);
  if (capped !== undefined) return capped;

  return {
    request: {
      symbol: symbol.value,
      timeframe: timeframe.value,
      range: range.value,
    },
  };
}

/** A parsed value, or the refusal that stopped it. */
type Parsed<T> = { readonly value: T } | { readonly refusal: SeriesRefusal };

function refuse(
  reason: SeriesRefusalReason,
  message: string,
): { readonly refusal: SeriesRefusal } {
  return { refusal: { reason, message } };
}

function parseSymbol(raw: unknown): Parsed<Ticker> {
  if (raw === undefined) {
    return refuse("symbol", "No symbol given. Pass ?symbol=NVDA.");
  }
  if (typeof raw !== "string") {
    return refuse(
      "symbol",
      "The symbol was given more than once. A series is for one symbol.",
    );
  }
  if (!isTicker(raw)) {
    return refuse(
      "symbol",
      `${JSON.stringify(raw)} is not a well-formed US equity ticker. ` +
        `Expected one to five capital letters, optionally with a share-class ` +
        `suffix, as in NVDA or BRK.B.`,
    );
  }
  return { value: toTicker(raw) };
}

function parseTimeframe(raw: unknown): Parsed<Timeframe> {
  // Validated against `TIMEFRAMES` and never against a literal pair, so this
  // vocabulary cannot fork from the one `market_bars`' `check` constraint and
  // the fixture provider are both held to. There is deliberately no default: a
  // caller who mistypes `timeframe` would otherwise be served minute bars for a
  // daily window, which is a plausible-looking wrong chart rather than an error.
  if (raw === undefined) {
    return refuse(
      "timeframe",
      `No timeframe given. Pass ?timeframe= with ${TIMEFRAMES.join(" or ")}.`,
    );
  }
  if (typeof raw !== "string" || !isMember(TIMEFRAMES, raw)) {
    return refuse(
      "timeframe",
      `${JSON.stringify(raw)} is not a timeframe. Expected ${TIMEFRAMES.join(" or ")}.`,
    );
  }
  return { value: raw };
}

/**
 * The window, in whichever of its two forms — and **a request naming both is
 * refused**.
 *
 * Not "prefer the absolute one" and not "prefer the named one". A caller that
 * sent both does not agree with itself, and silently picking one is how it stays
 * wrong: the request that was honoured and the request that was written are
 * different, and nothing on the response says so.
 */
function parseWindow(
  query: SeriesRequestQuery,
  timeframe: Timeframe,
  now: Date,
): Parsed<TimeRange> {
  const absolute = query.start !== undefined || query.end !== undefined;
  const named = query.sessions !== undefined;

  if (absolute && named) {
    return refuse(
      "window",
      "A window is either an absolute range (start and end) or a count of " +
        "sessions, never both. Send one of the two.",
    );
  }
  if (!absolute && !named) {
    return refuse(
      "window",
      "No window given. Pass ?sessions=5 for the last five trading sessions, " +
        "or ?start= and ?end= as UTC instants.",
    );
  }

  return named
    ? namedWindow(query.sessions, timeframe, now)
    : absoluteWindow(query.start, query.end);
}

/**
 * `sessions=N`, resolved through the trading calendar.
 *
 * `lastMarketSessions` returns sessions **oldest first** and that order is not
 * reversed here: a time series is plotted, ingested and iterated
 * chronologically, and a module that reverses it is the one consumer that
 * forgets to reverse it back.
 *
 * The window itself comes from `windowFor` rather than from `[first.open,
 * last.close)` written out again, because the two timeframes need different
 * shapes and that difference is the most expensive thing in this area to get
 * wrong: a **daily** bar is stamped at midnight ET, hours before the session
 * opens, so a daily request framed on the session bounds contains no daily bar
 * at all and returns a perfectly well-formed empty answer. That function is the
 * one place that knows it, and this is its third caller rather than a copy.
 *
 * **Today counts as a session if today is a trading day**, even before the open.
 * That is deliberate and it is `MARKET-DATA-API.md` §2's resolution written
 * literally. The alternative — quietly ending at the last *complete* session —
 * would make `sessions=5` mean a different window depending on the hour, and the
 * honest report of how much of it we actually hold is `coverage.covered`, which
 * Task 2.9.4 fills in.
 */
function namedWindow(
  raw: unknown,
  timeframe: Timeframe,
  now: Date,
): Parsed<TimeRange> {
  if (typeof raw !== "string" || !SESSION_COUNT.test(raw)) {
    return refuse(
      "window",
      `${JSON.stringify(raw)} is not a session count. Expected a whole number ` +
        `of trading sessions, as in ?sessions=5.`,
    );
  }

  const count = Number(raw);
  if (count < 1) {
    return refuse(
      "window",
      "A window of zero sessions contains nothing. Ask for at least one.",
    );
  }

  try {
    // `marketDateAt` and not `now.toISOString().slice(0, 10)`, which is the
    // mistake that costs a whole day: 2026-09-04T00:00:00Z is 2026-09-03 in New
    // York, so the slice is right all afternoon and wrong every evening.
    const sessions = lastMarketSessions(count, marketDateAt(now));
    const first = sessions[0];
    const last = sessions.at(-1);
    if (first === undefined || last === undefined) {
      // `lastMarketSessions` runs out of calendar rather than returning fewer
      // than asked for, so this is unreachable for a positive count. Present
      // rather than a non-null assertion.
      return refuse(
        "window",
        "The trading calendar returned no session for that window.",
      );
    }
    return { value: windowFor(timeframe, first, last) };
  } catch (error) {
    return calendarRefusal(error);
  }
}

/** `start` and `end` as UTC instants. */
function absoluteWindow(rawStart: unknown, rawEnd: unknown): Parsed<TimeRange> {
  // Both ends or neither, and one end alone is refused rather than defaulted.
  // "start with no end" could mean "to now" or "to the last complete session",
  // and guessing produces a window nobody asked for — `pnpm bars`' rule for
  // `--from`/`--to`, arriving at the same conclusion from the same ambiguity.
  if (rawStart === undefined || rawEnd === undefined) {
    return refuse(
      "window",
      `An absolute window needs both ends; ${rawStart === undefined ? "start" : "end"} is missing. ` +
        "Send both, or ask for a count of sessions instead.",
    );
  }

  const start = parseInstant("start", rawStart);
  if ("refusal" in start) return start;
  const end = parseInstant("end", rawEnd);
  if ("refusal" in end) return end;

  // Checked here rather than left to `toTimeRange`, so the message is one this
  // API wrote for a caller. The constructor is still the only way a `TimeRange`
  // is obtained, which is the property the brand exists for — this check just
  // means its throw is unreachable from a query string.
  if (start.value.getTime() >= end.value.getTime()) {
    const zeroWidth = start.value.getTime() === end.value.getTime();
    return refuse(
      "window",
      `The window is ${zeroWidth ? "zero-width" : "reversed"}: start ` +
        `${start.value.toISOString()} is not before end ${end.value.toISOString()}. ` +
        `Windows are half-open, [start, end), so ${zeroWidth ? "an instant contains no bars" : "the two are the wrong way round"}.`,
    );
  }

  return { value: toTimeRange(start.value, end.value) };
}

function parseInstant(name: "start" | "end", raw: unknown): Parsed<Date> {
  if (typeof raw !== "string" || !UTC_INSTANT.test(raw)) {
    return refuse(
      "window",
      `${JSON.stringify(raw)} is not a valid ${name}. Instants are UTC ISO 8601 ` +
        `with the Z, as in 2026-09-04T13:30:00Z.`,
    );
  }
  // The shape being right does not make the date real, and `new Date` is
  // **inconsistent** about which unreal ones it rejects — measured, on Node 24:
  // `2026-13-01T00:00:00Z`, `2026-01-32T00:00:00Z` and an hour of 25 are all
  // `Invalid Date`, and `2026-02-30T13:30:00Z` is silently **2026-03-02**. So
  // both failures have to be caught, and only one of them is a NaN.
  //
  // The rollover is the one worth the round-trip: an invalid `Date` compares as
  // neither before nor after anything, so it survives the ordering check and
  // produces an empty answer nobody can explain — but a date that quietly moved
  // by two days produces a *plausible* answer over a window nobody asked for,
  // which is worse.
  const instant = new Date(raw);
  if (
    Number.isNaN(instant.getTime()) ||
    instant.toISOString().slice(0, 10) !== raw.slice(0, 10)
  ) {
    return refuse(
      "window",
      `${JSON.stringify(raw)} is not a real instant, so ${name} names no moment.`,
    );
  }
  return { value: instant };
}

/**
 * How many bars the store can return for this window, and the refusal if that
 * is more than {@link MAX_SERIES_BARS}.
 *
 * Counted from the **calendar** rather than from the table, which is what makes
 * the check affordable: an over-cap request costs a walk over at most a few
 * hundred session records, and the count it produces is what makes the message
 * actionable — a limit without the number you would have hit does not tell a
 * caller how much narrower to go.
 *
 * It counts **session** minutes only. That is what the store holds: the backfill
 * stores complete regular sessions, one session per request, so extended-hours
 * prints are not in it. If that ever stops being true this count is an
 * under-estimate and the cap admits a response larger than it means to — which
 * is the direction worth stating rather than discovering.
 */
function enforceCap(
  timeframe: Timeframe,
  range: TimeRange,
): { readonly refusal: SeriesRefusal } | undefined {
  let sessions: readonly MarketSession[];
  try {
    sessions = marketSessionsBetween(
      marketDateAt(range.start),
      marketDateAt(range.end),
    );
  } catch (error) {
    // An **absolute** window reaching outside 2024-2028 lands here rather than
    // in the named form's resolution, and it is the same refusal for the same
    // reason: the calendar is a table and it does not guess.
    return calendarRefusal(error);
  }

  const bars =
    timeframe === "1m"
      ? sessions.reduce(
          (total, session) => total + minuteBarsIn(session, range),
          0,
        )
      : // One daily bar per session at most. An upper bound rather than an exact
        // count, because a daily bar is stamped at midnight ET and reproducing
        // that convention here would be a second copy of the thing `windowFor`
        // centralises. It cannot change an answer: the whole covered calendar is
        // about 1,258 sessions against a cap of 10,000, so no daily window is
        // refusable at all.
        sessions.length;

  if (bars <= MAX_SERIES_BARS) return undefined;

  return {
    refusal: {
      reason: "too-large",
      message:
        `That window is ${bars.toLocaleString("en-US")} bars and one response ` +
        `carries at most ${MAX_SERIES_BARS.toLocaleString("en-US")}. Ask for a ` +
        `narrower window, or the same window at the 1d timeframe. The series is ` +
        `never silently reduced.`,
    },
  };
}

/**
 * How many minute bars of this session start inside the window.
 *
 * Counted in **bar starts** rather than by dividing a duration, because that is
 * what a bar is: the session's minutes are `open + k minutes` for `k` in
 * `[0, minuteBars)`, and the half-open window admits the ones at or after
 * `start` and strictly before `end`. `minuteBars` is derived from the session's
 * own bounds, so a half day is 210 here without this function knowing that half
 * days exist.
 */
function minuteBarsIn(session: MarketSession, range: TimeRange): number {
  const openedAt = session.open.getTime();
  const from = Math.max(
    0,
    Math.ceil((range.start.getTime() - openedAt) / 60_000),
  );
  const to = Math.min(
    session.minuteBars,
    Math.ceil((range.end.getTime() - openedAt) / 60_000),
  );
  return Math.max(0, to - from);
}

/**
 * The calendar's refusal, rewritten for a client.
 *
 * `MarketCalendarRangeError`'s own message names `packages/shared/src/market-calendar.ts`
 * and the constant to extend, which is right for a developer reading a stack and
 * is internal detail on a wire — `errors.ts` draws exactly that line for 5xx
 * messages and it does not stop applying at 400. So the range is named from
 * `MARKET_CALENDAR_RANGE` and the instruction is dropped.
 *
 * Anything that is not a range error is rethrown. A `RangeError` from a reversed
 * pair cannot reach here — the range is already a `TimeRange` — so an unexpected
 * throw is a fault worth surfacing as a 500 rather than reporting as the
 * caller's mistake.
 */
function calendarRefusal(error: unknown): {
  readonly refusal: SeriesRefusal;
} {
  if (!(error instanceof MarketCalendarRangeError)) throw error;

  return {
    refusal: {
      reason: "calendar-range",
      message:
        `That window reaches ${error.date}, outside the trading calendar this ` +
        `system covers — ${MARKET_CALENDAR_RANGE.firstDate} to ` +
        `${MARKET_CALENDAR_RANGE.lastDate}. Ask for a window inside it.`,
    },
  };
}

/** `includes` on a `readonly T[]` narrows nothing, so this does. */
function isMember<T extends string>(
  allowed: readonly T[],
  value: string,
): value is T {
  return (allowed as readonly string[]).includes(value);
}
