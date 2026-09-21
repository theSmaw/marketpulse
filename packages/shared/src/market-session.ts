/**
 * What a trading session **is**, and the small set of questions the rest of the
 * product asks about one.
 *
 * This is the module Story 2.5 exists for. Three later stories and one epic call
 * these functions: Story 2.8 asks "which minutes should this session have bars
 * for", Story 2.12 asks "where does the x-axis start and stop", Story 2.13 asks
 * for "the last N sessions", and Epic 13's replay asks "what was the session
 * state at this instant".
 *
 * ## It composes the two modules below it and adds the one thing neither knows
 *
 * `market-time.ts` converts between a UTC instant and market wall time and knows
 * nothing about holidays. `market-calendar.ts` knows which days are exceptional
 * and knows nothing about instants — and, deliberately, nothing about Saturdays:
 * it returns `undefined` for a weekend and for an ordinary Tuesday alike,
 * because turning that `undefined` into a session is this module's job.
 *
 * The three are kept apart because they fail differently, and a red test should
 * name which. A wrong conversion is wrong twice a year for everything; a wrong
 * row in the calendar is wrong on one day a year; a wrong
 * {@link nextMarketSession} is wrong **every weekend**.
 *
 * ## Nothing here reads the clock, and that absence is the seam
 *
 * `CALENDAR.md` §3 is the section Epic 13 reads, and its rule is one sentence:
 * *every function in this story takes the instant it needs as an argument, and
 * exactly one module reads the wall clock.* That module is Task 2.5.5's, in
 * `apps/frontend`. There is no `Clock` interface here and no `Date.now()`,
 * because **a pure function of an instant is already replay-ready** — replay
 * does not need a clock injected into {@link marketSessionOn}, it needs to call
 * it with a replay date.
 *
 * So the seam is something *absent* rather than something added, which is this
 * repository's established shape for a third time: `securities.ts` holds Epic
 * 13's other seam by not exporting its `Kysely` handle, and `api-client.ts`
 * holds the transport rule by being the only file that calls `fetch`.
 *
 * ## Walking off the end of the calendar propagates, and that is a decision
 *
 * Every function here can step outside the calendar's covered 2024–2028 range,
 * and it is far less exotic than it sounds: `previousMarketSession("2024-01-02")`
 * steps into 2023, and "the last 60 sessions" from early January crosses the
 * lower bound routinely — Epic 5's baseline is specified at exactly that length
 * (`PRODUCT_SPEC.md` §5.1).
 *
 * **They all propagate {@link MarketCalendarRangeError} rather than truncating.**
 * The caller asked a question the calendar genuinely cannot answer, and a short
 * list of sessions is a wrong answer wearing the shape of a right one — which is
 * exactly what acceptance criterion 3 exists to prevent in the *holiday* case
 * and is no better in the *range* case. A truncated "last 60 sessions" is
 * indistinguishable from a correct one at the call site and shows up in Epic 5
 * as a baseline computed over 47 days that says it was computed over 60.
 *
 * **Task 2.5.5's clock is the one caller that must not propagate**, and its file
 * says why: a header that throws because the calendar ran out is a worse product
 * than a header that says it does not know.
 */

import {
  assertWithinMarketCalendar,
  MARKET_CALENDAR_RANGE,
  marketCalendarExceptionOn,
  marketEarlyCloseOn,
} from "./market-calendar.js";
import {
  instantFromMarketTime,
  marketDateAt,
  toMarketDate,
} from "./market-time.js";
import type { MarketDate, MarketTimeOfDay } from "./market-time.js";

/**
 * When a regular session opens, in market wall-clock time.
 *
 * Pre- and post-market are **out of scope for V1** and that is a settled
 * decision rather than an omission — `CALENDAR.md` §2, decided on the feed: our
 * free tier is IEX, a single venue, and its extended-hours volume is thin enough
 * that an Epic 5 baseline built on it would measure the venue rather than the
 * market. `PRODUCT_SPEC.md` §21's own replay sketch already runs 09:30–16:00.
 *
 * Every session in this module opens at this time. Only the *close* moves, and
 * only on the days the calendar says so.
 */
export const MARKET_SESSION_OPEN: MarketTimeOfDay = {
  hour: 9,
  minute: 30,
  second: 0,
};

/** When a regular session closes. Half days close earlier; see {@link MarketSession}. */
export const MARKET_SESSION_CLOSE: MarketTimeOfDay = {
  hour: 16,
  minute: 0,
  second: 0,
};

/**
 * One trading session, as an object rather than as a pair of instants.
 *
 * **The object is the point.** A half day is a session whose close is 13:00, and
 * a caller handed two bare instants has to be told *separately* that it was a
 * short one — which means the fact travels beside the session rather than in it,
 * and the two get separated. Story 2.8's completeness check wants to say "this
 * session should have 210 bars, not 390" without re-deriving anything, and
 * Story 2.12's axis wants to draw the discontinuity honestly (`CALENDAR.md`
 * §2.3) rather than implying continuous coverage.
 *
 * `minuteBars` is **derived from the bounds** rather than stored as a constant
 * pair, so there is no way for the count and the times to disagree. It is 390
 * for a regular session (09:30 through 15:59 inclusive) and 210 for a 13:00 half
 * day, which is `CALENDAR.md` §2.2's arithmetic rather than a new claim.
 */
export interface MarketSession {
  /** The market date this session belongs to. Never derived from a UTC instant. */
  readonly date: MarketDate;
  /** 09:30 ET on {@link date}, as an instant. */
  readonly open: Date;
  /** 16:00 ET, or the calendar's early close, as an instant. Exclusive. */
  readonly close: Date;
  /** True when the calendar records an early close for this date. */
  readonly isEarlyClose: boolean;
  /** How many one-minute bars a complete session should have: 390, or 210. */
  readonly minuteBars: number;
}

/**
 * Why the market is not open, or that it is.
 *
 * A **discriminated union rather than a boolean**, and the task file is explicit
 * about why: `isMarketOpen()` collapses four different things a user needs to
 * tell apart — it is 04:00 on a normal Tuesday, it is Christmas Day, it is
 * Sunday, or it is 14:00 on a half day that has already shut. Task 2.5.5 renders
 * that difference in the header, and a boolean would make it render "CLOSED"
 * four times over with no way to say more.
 *
 * This is `SecuritiesView`'s shape reused rather than re-derived (Task 2.4.3):
 * the union exists so the impossible combinations cannot be constructed, and the
 * renderer picks a case instead of inferring one from a set of flags.
 *
 * The three weekday cases all carry the session, so a caller that wants to say
 * *"opens at 09:30"* or *"closed early today at 13:00"* has the bounds to hand
 * without a second lookup.
 */
export type MarketSessionState =
  /** Inside the session. `open <= instant < close`. */
  | { readonly status: "open"; readonly session: MarketSession }
  /** A trading day, before 09:30. */
  | { readonly status: "before_open"; readonly session: MarketSession }
  /** A trading day, at or after the close — which may have been an early one. */
  | { readonly status: "after_close"; readonly session: MarketSession }
  /** A weekday the market was shut all day. `name` is the calendar's own. */
  | { readonly status: "holiday"; readonly name: string }
  /** Saturday or Sunday. Not a row in the calendar: it is the rule, not an exception. */
  | { readonly status: "weekend" };

/** Every member of {@link MarketSessionState}'s discriminator, for exhaustive rendering. */
export const MARKET_SESSION_STATUSES = [
  "open",
  "before_open",
  "after_close",
  "holiday",
  "weekend",
] as const;

export type MarketSessionStatus = (typeof MARKET_SESSION_STATUSES)[number];

/**
 * Day of week for a market date, without touching a timezone.
 *
 * UTC at both ends, so this is calendar arithmetic on a date string rather than
 * a market-time conversion — the same thing `isMarketDate` and the calendar's
 * own validation do, and the reason `eslint.config.mjs`'s two rules have nothing
 * to say about it.
 */
function weekdayOf(date: MarketDate): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Is this market date a Saturday or a Sunday? */
function isWeekend(date: MarketDate): boolean {
  const day = weekdayOf(date);
  return day === 0 || day === 6;
}

/**
 * Steps a market date by whole days.
 *
 * Legitimate UTC arithmetic for the same reason {@link weekdayOf} is: both ends
 * are UTC and no timezone is involved. This is emphatically **not** "add 24
 * hours to an instant", which is the thing `market-time.ts` warns about and
 * which is wrong twice a year.
 */
function addDays(date: MarketDate, days: number): MarketDate {
  const cursor = new Date(`${date}T00:00:00Z`);
  cursor.setUTCDate(cursor.getUTCDate() + days);
  return toMarketDate(cursor.toISOString().slice(0, 10));
}

/**
 * The session on a market date, or `undefined` if the market did not open.
 *
 * `undefined` covers a weekend and a full closure alike, because both mean "no
 * session" and a caller asking for bounds has nothing to do differently.
 * {@link marketSessionStateAt} is what tells them apart, because that is the
 * question with a rendering behind it.
 *
 * Refuses a date outside the calendar's covered range rather than answering
 * `undefined` — see the module comment, and `market-calendar.ts`'s own reasoning
 * for why "no rows that year, so no closures" is the dangerous wrong answer.
 *
 * The bounds are built with `instantFromMarketTime` and nothing else. There is
 * no other way: `eslint.config.mjs` forbids constructing an `Intl.DateTimeFormat`
 * or naming the market's timezone outside `market-time.ts`. That function throws
 * `MarketTimeError` on the DST gap and the fold, and **no session bound can ever
 * hit either**, because every US DST transition is a Sunday and the market is
 * shut on Sundays (`CALENDAR.md` §6.3 tabulates all ten in range). So there is
 * deliberately no `try`/`catch` here: if one ever fires, the calendar table has a
 * Sunday in it, and that is a fault worth surfacing rather than swallowing.
 */
export function marketSessionOn(date: MarketDate): MarketSession | undefined {
  // Before the weekend check, so an out-of-range Saturday refuses rather than
  // answering `undefined` — the two are indistinguishable to a caller and one of
  // them is a lie. It is also **before the cache**, so a cached calendar cannot
  // turn a refusal into an answer: only dates inside the range are ever keys.
  assertWithinMarketCalendar(date);

  const held = sessionRecords.get(date);
  if (held !== undefined) return sessionFrom(held);

  const record = sessionRecordOn(date);
  sessionRecords.set(date, record);
  return sessionFrom(record);
}

/**
 * One market date's answer, as numbers only — **the memoised form of a session**
 * (Task 2.13.3).
 *
 * `null` means the market did not open. The negative answer is remembered too:
 * every window walks over the weekends and the holidays inside it, and a
 * remembered "no" costs one map entry and saves the same work as a remembered
 * "yes".
 *
 * ## Why epoch milliseconds rather than the `MarketSession` itself
 *
 * **A `Date` is mutable.** Caching a session whole would hand every caller the
 * same two `Date` objects, so one `setUTCDate` anywhere in either application
 * would silently move a trading day for everything downstream — a bug with no
 * error in it, on the value every window, every axis and every coverage
 * measurement is built from. Rebuilding the two instants per call costs two
 * allocations and keeps the cache's contents immutable by construction, which is
 * the only version of this repair that cannot become the thing it was warned
 * about: *a cache makes a correct function wrong quietly.*
 */
interface SessionRecord {
  /** The market date, kept on the record so a reader needs no second lookup. */
  readonly date: MarketDate;
  readonly openMs: number;
  readonly closeMs: number;
  readonly isEarlyClose: boolean;
}

/**
 * **The memo, and it has no clock and therefore no lifetime.**
 *
 * A TTL would be meaningless and a `Date.now()` here is a lint error in this
 * package besides: what this remembers is a pure function of a checked-in table
 * (`MARKET_CALENDAR`) and a market date, neither of which changes while the
 * process runs. Editing the table is a deploy, not an expiry.
 *
 * **Keyed on the market date and on nothing else**, which is what keeps it clear
 * of invariant 4: a memo keyed on anything ambient — a clock, a replay time, a
 * "current" window — would be a temporal-isolation hazard Epic 13 inherits,
 * because a replay reading a key it did not state would read another clock's
 * answer. The key here *is* the argument.
 *
 * ## Bounded twice, and the first bound is structural rather than enforced
 *
 * The series cache's precedent (`FRONTEND-STATE.md` §2) is a cache bounded twice
 * and with no lifetime of its own. Here:
 *
 *  1. **In entries, by the calendar's own range.** Every key passes
 *     {@link assertWithinMarketCalendar} first, so the key space is *closed*:
 *     `MARKET_CALENDAR_RANGE` covers 2024-01-01 to 2028-12-31, which is
 *     {@link MARKET_SESSION_CACHE_DATES} days, and no sequence of calls from any
 *     caller can produce a key outside it. There is no eviction because there is
 *     nothing to evict — a bound that cannot be reached needs no policy, and a
 *     policy that cannot run is untested code.
 *  2. **In size per entry**, at three numbers and a boolean. It holds no bars,
 *     no arrays and no `Date`s, so the whole cache at its structural maximum is
 *     on the order of a hundred kilobytes rather than a series-sized object.
 *
 * A test asserts both: that the stated day count is the calendar's, and that
 * walking the entire covered range leaves the cache no larger than it.
 */
const sessionRecords = new Map<MarketDate, SessionRecord | null>();

/**
 * How many market dates the calendar can be asked about — the memo's entry
 * bound, derived from the range rather than written down beside it.
 *
 * 1,827 days for 2024-01-01 to 2028-12-31. Computed from
 * `MARKET_CALENDAR_RANGE` so that widening the calendar widens this in the same
 * commit; a literal here would be a second copy of the range, which is the shape
 * this repository keeps finding disagreements in.
 */
export const MARKET_SESSION_CACHE_DATES: number =
  (Date.parse(`${MARKET_CALENDAR_RANGE.lastDate}T00:00:00Z`) -
    Date.parse(`${MARKET_CALENDAR_RANGE.firstDate}T00:00:00Z`)) /
    86_400_000 +
  1;

/**
 * How many market dates the memo is currently holding.
 *
 * Exported for the bound's own test and for nothing else — the series cache
 * exposes its `size` for the same reason (`FRONTEND-STATE.md` §2). A bound that
 * nothing can read is a bound nothing can check, and this one is the whole of the
 * argument for having no eviction policy.
 */
export function marketSessionCacheEntries(): number {
  return sessionRecords.size;
}

/** The session bounds for a date, computed. `null` when the market did not open. */
function sessionRecordOn(date: MarketDate): SessionRecord | null {
  if (isWeekend(date)) return null;

  const exception = marketCalendarExceptionOn(date);
  if (exception?.kind === "closed") return null;

  const earlyClose = marketEarlyCloseOn(date);
  const open = instantFromMarketTime(date, MARKET_SESSION_OPEN);
  const close = instantFromMarketTime(date, earlyClose ?? MARKET_SESSION_CLOSE);

  return {
    date,
    openMs: open.getTime(),
    closeMs: close.getTime(),
    isEarlyClose: earlyClose !== undefined,
  };
}

/** A remembered record as the session its callers expect, with fresh instants. */
function sessionFrom(record: SessionRecord | null): MarketSession | undefined {
  if (record === null) return undefined;
  return {
    date: record.date,
    open: new Date(record.openMs),
    close: new Date(record.closeMs),
    isEarlyClose: record.isEarlyClose,
    // A duration between two instants, which is exactly what epoch arithmetic is
    // for. No session spans a DST transition, so this is exact.
    minuteBars: (record.closeMs - record.openMs) / 60_000,
  };
}

/**
 * The market's state at an instant — the honest version of `isMarketOpen`.
 *
 * The instant is converted to a **market date** through `marketDateAt` rather
 * than by slicing an ISO string, which is the mistake that costs a whole day:
 * `2026-09-04T00:00:00Z` is 2026-09-03 20:00 in New York, so the tempting
 * `instant.toISOString().slice(0, 10)` is right all afternoon and wrong every
 * evening.
 *
 * The close is **exclusive**: at exactly 16:00:00 the market is shut, because the
 * last minute bar of a session is 15:59. The open is inclusive.
 */
export function marketSessionStateAt(instant: Date): MarketSessionState {
  const date = marketDateAt(instant);
  const session = marketSessionOn(date);

  if (session === undefined) {
    if (isWeekend(date)) return { status: "weekend" };

    const exception = marketCalendarExceptionOn(date);
    return {
      status: "holiday",
      // Unreachable unless `marketSessionOn` and this function disagree about
      // what closes the market; present rather than a non-null assertion.
      name: exception?.name ?? "Market holiday",
    };
  }

  if (instant.getTime() < session.open.getTime()) {
    return { status: "before_open", session };
  }
  if (instant.getTime() >= session.close.getTime()) {
    return { status: "after_close", session };
  }
  return { status: "open", session };
}

/**
 * The most recent session whose **opening bell has already rung** at an instant.
 *
 * The question is *has the bell rung*, and it is **never** *do we hold data for
 * it*. The distinction is the whole of this function's reason to exist:
 * `VOLUME-AND-WINDOW.md` §1.3 weighed and rejected "the most recent session with
 * data" because a client cannot know which session has data without asking, so
 * that rule is either a second round trip or a clock read in the browser. This
 * one is a pure function of a calendar and an instant — it returns the same
 * session for every caller on earth at the same moment, and it does not know
 * what is in the store.
 *
 * **`before_open` is the only status where this differs from
 * {@link marketDateAt}'s session**, and it is the whole repair: between midnight
 * and the bell, today is a trading day whose session has not begun, so a window
 * ending "at today's close" ends inside a session that cannot contain a bar.
 *
 * | Status at `instant` | Answer            |
 * | ------------------- | ----------------- |
 * | `open`              | today's session   |
 * | `after_close`       | today's session   |
 * | `before_open`       | the one before it |
 * | `weekend`           | the one before it |
 * | `holiday`           | the one before it |
 *
 * **The two statuses are spelled out rather than tested with `"session" in
 * state`**, and that is load-bearing rather than verbose: `before_open` *carries*
 * a session, so the membership test — which is exactly what `serve-series.ts`'s
 * `currentSession` does, correctly, for a different question — answers this one
 * with the session that has not started. The difference between the two
 * functions is one status wide and invisible in a diff.
 *
 * ## Four rules in this repository now sound alike. They are not.
 *
 * | Where                                        | The question it answers                  |
 * | -------------------------------------------- | ---------------------------------------- |
 * | here                                         | has the bell rung                        |
 * | `serve-series.ts` → `currentSession`         | which session may still be accumulating  |
 * | `series-cache.ts` → `closedThrough`          | which session is definitely over         |
 * | `store-freshness.ts` → `lastCompletedSession`| the same, computed a different way       |
 *
 * The last two are near-duplicates of each other and collapsing them is a real
 * piece of work that is deliberately not done here. They are named so that the
 * next author reaches for one of the four rather than writing a fifth.
 *
 * Propagates {@link MarketCalendarRangeError} like everything else in this
 * module — reachable from `2024-01-01`, a holiday inside the covered range whose
 * previous session is in 2023.
 */
export function lastOpenedMarketSession(instant: Date): MarketSession {
  const state = marketSessionStateAt(instant);

  if (state.status === "open" || state.status === "after_close") {
    return state.session;
  }

  return previousMarketSession(marketDateAt(instant));
}

/**
 * The first session strictly **before** a market date.
 *
 * Strictly before, so `previousMarketSession` of a trading day is the day before
 * it and not itself. That is the shape a caller stepping backwards through
 * history wants, and the alternative ("the most recent session at or before")
 * cannot express "step back one" without a special case.
 *
 * Walks off the calendar rather than stopping at its edge — see the module
 * comment. From `2024-01-02`, the first session of the covered range, this
 * throws `MarketCalendarRangeError`.
 */
export function previousMarketSession(date: MarketDate): MarketSession {
  let cursor = addDays(date, -1);
  for (;;) {
    // Throws `MarketCalendarRangeError` once the walk leaves the covered range,
    // which is also what bounds this loop.
    const session = marketSessionOn(cursor);
    if (session !== undefined) return session;
    cursor = addDays(cursor, -1);
  }
}

/**
 * The first session strictly **after** a market date. The mirror of
 * {@link previousMarketSession}, with the same walk-off behaviour.
 */
export function nextMarketSession(date: MarketDate): MarketSession {
  let cursor = addDays(date, 1);
  for (;;) {
    const session = marketSessionOn(cursor);
    if (session !== undefined) return session;
    cursor = addDays(cursor, 1);
  }
}

/**
 * Every session between two market dates, **inclusive at both ends**, oldest
 * first.
 *
 * Inclusive because the alternative makes "the sessions in March" an expression
 * with an off-by-one in it, and every caller of this in the roadmap is naming a
 * window they mean to include.
 *
 * **Oldest first, and stated because it is a decision.** `CALENDAR.md` §7.1's
 * case 16 lists its expected answer newest-first, which is how a person reads
 * "the last five sessions", but a time series is plotted, ingested and iterated
 * chronologically — so returning them in any other order means every consumer
 * reverses them, and one consumer forgets. {@link lastMarketSessions} returns
 * the same order for the same reason.
 *
 * Refuses a reversed range rather than answering with an empty array: an empty
 * result is a plausible answer that hides a caller's swapped arguments, which is
 * the same failure shape as a truncated session walk.
 */
export function marketSessionsBetween(
  from: MarketDate,
  to: MarketDate,
): readonly MarketSession[] {
  if (from > to) {
    throw new RangeError(
      `Market session range is reversed: ${from} is after ${to}. ` +
        `Pass the earlier date first — an empty result here would hide the swap.`,
    );
  }

  assertWithinMarketCalendar(from);
  assertWithinMarketCalendar(to);

  const sessions: MarketSession[] = [];
  for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
    const session = marketSessionOn(cursor);
    if (session !== undefined) sessions.push(session);
  }
  return sessions;
}

/**
 * The last `count` sessions at or before a market date, oldest first.
 *
 * **This is acceptance criterion 3, and it is the whole reason the story exists
 * as a separate piece of work.** "The last 5 days" meaning five *calendar* days
 * is wrong in three different ways in one ordinary week: from Monday
 * 2026-11-30 it would reach back through the weekend and through Thanksgiving
 * and land on the wrong window entirely. This returns
 * `11-23, 11-24, 11-25, 11-27, 11-30` — five *sessions*, one of them a half day.
 *
 * "At or before" rather than "before", unlike {@link previousMarketSession}:
 * every caller in the roadmap is asking for a window ending today, and Story
 * 2.13's control means to include the date on the scrubber.
 *
 * Runs out of calendar rather than returning fewer than asked for — a short list
 * here is precisely the failure the criterion is about, arriving through the
 * range instead of through a holiday.
 */
export function lastMarketSessions(
  count: number,
  upToAndIncluding: MarketDate,
): readonly MarketSession[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(
      `Session count must be a positive integer, received ${JSON.stringify(count)}.`,
    );
  }

  const sessions: MarketSession[] = [];
  let cursor = upToAndIncluding;

  while (sessions.length < count) {
    // Throws `MarketCalendarRangeError` if the window reaches past the covered
    // range, rather than handing back a window shorter than the one requested.
    const session = marketSessionOn(cursor);
    if (session !== undefined) sessions.push(session);
    cursor = addDays(cursor, -1);
  }

  return sessions.reverse();
}

/**
 * Which extended-hours stretch an observation's instant falls in, or
 * `undefined` for one inside the regular session (Task 3.4.6).
 *
 * ## It is derived, and that is `LIVE-DATA.md` §7.7's finding rather than a
 * preference
 *
 * **Nothing on the frame distinguishes an extended-hours bar.** The vendor
 * sends a 07:42 pre-market bar and a 10:42 regular-session bar identically, so
 * the distinction is **entirely ours to make** — from the bar's own instant,
 * against this calendar, and never from a field on the wire. §7.11 settles that
 * such bars are **rendered and marked** rather than filtered: a price is a
 * price, and hiding one because of the hour would be removing a true fact.
 *
 * ## Two states, not four, and the two it leaves out cannot occur on the feed
 *
 * `weekend` and `holiday` are **deliberately not marked**. IEX does not trade
 * on either, so a live observation cannot carry such an instant; the only way
 * to produce one is ADR 0030's replay, which re-stamps recorded bars onto the
 * wall clock — and the chrome already says `REPLAYING` for exactly that case.
 * Marking them would be true and useless, and would put two more words in front
 * of a reader to describe a situation another surface has already named.
 *
 * `before_open` and `after_close` are the two §7.11 names and the two a reader
 * needs in order to read the price beside them.
 */
export function extendedHoursAt(instant: Date): ExtendedHours | undefined {
  const state = marketSessionStateAt(instant);

  if (state.status === "before_open") return "pre_market";
  if (state.status === "after_close") return "after_hours";
  return undefined;
}

/**
 * The two stretches either side of a regular session.
 *
 * **Snake case here and hyphenated in the words**, which is the same split
 * `MarketSessionStatus` already makes: this is the domain's name for a state,
 * and what a reader sees is `feed-words.ts`'s to decide.
 */
export type ExtendedHours = "pre_market" | "after_hours";
