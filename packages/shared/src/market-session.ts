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
  // them is a lie.
  assertWithinMarketCalendar(date);

  if (isWeekend(date)) return undefined;

  const exception = marketCalendarExceptionOn(date);
  if (exception?.kind === "closed") return undefined;

  const earlyClose = marketEarlyCloseOn(date);
  const open = instantFromMarketTime(date, MARKET_SESSION_OPEN);
  const close = instantFromMarketTime(date, earlyClose ?? MARKET_SESSION_CLOSE);

  return {
    date,
    open,
    close,
    isEarlyClose: earlyClose !== undefined,
    // A duration between two instants, which is exactly what epoch arithmetic is
    // for. No session spans a DST transition, so this is exact.
    minuteBars: (close.getTime() - open.getTime()) / 60_000,
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
