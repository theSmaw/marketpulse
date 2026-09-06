/**
 * The trading calendar, as data: every day the US equity market is shut and
 * every day it closes early, for the years this product covers.
 *
 * Every argument behind it is in
 * `planning/epic-02-security-universe-historical-data/story-05-trading-calendar-and-market-time/CALENDAR.md`,
 * which is Story 2.5's one document about the subject: §1.2 why this is a table
 * rather than a rule set, §1.3 why full closures and early closes share one
 * table, §1.4 why the range is 2024–2028, §1.5 why a date outside it is a
 * refusal, and §7.5/§7.6 the derived tables this file was cross-checked
 * against.
 *
 * ## Why a table and not a rule set
 *
 * Nine of the ten scheduled US market holidays are nth-weekday or fixed-date
 * rules that about a hundred lines of code produce correctly. **Good Friday is
 * Easter-derived** — it moves on a lunar-solar cycle, it appears in no federal
 * holiday list because it is not a federal holiday, and across this range alone
 * it lands on 2024-03-29, 2025-04-18, 2026-04-03, 2027-03-26 and 2028-04-14.
 *
 * The failure shape is what decides it: **a rule set that gets nine right and
 * Good Friday wrong looks correct for eleven months of every year.** It reports
 * a phantom session on one spring Friday, and the symptom arrives in Story 2.8
 * as a day of missing bars nobody can attribute and in Story 2.12 as a bar on a
 * day the market was shut.
 *
 * **And there is a row in this table no rule set can ever produce.** 2025-01-09
 * was a full closure for the National Day of Mourning for President Carter,
 * announced eleven days beforehand. `CALENDAR.md` §7.6's derived list does not
 * contain it — correctly, because it was derived — and this file does, because
 * it was checked against what actually happened. That row is the whole argument
 * in one line.
 *
 * ## What a row means
 *
 * **A row is an exception. A normal session is the absence of a row.** Every
 * weekday in the covered range with no row here is a regular 09:30–16:00 ET
 * session. Weekends are not rows: they are not exceptions, they are the rule.
 *
 * Full closures and early closes share one table with a `kind` discriminator
 * rather than living in two, and that is `UNIVERSE.md` §2's argument reused
 * rather than re-derived — `SECURITY_KINDS` widened to three members instead of
 * gaining a nullable second column, for the same reason. Two tables loses on
 * one question: _is 2026-11-27 an exception?_ would have to be asked twice, and
 * forgetting the second ask is exactly the failure this story predicts — three
 * hours of missing bars a year, read as a data-quality problem.
 *
 * **The early-close time is on the row rather than a constant.** Every
 * scheduled early close in living memory is 13:00 ET, so `EARLY_CLOSE = "13:00"`
 * is tempting. The row-level version costs nothing and buys one thing: an
 * unusual close time is expressible as **data** rather than as a code change.
 * That is not hypothetical in a table that already carries an unscheduled full
 * closure.
 *
 * ## What this module deliberately does not know
 *
 * **It does not know what a session is.** There is no `isMarketOpen` here, no
 * session bounds, no next/previous session and no "last N sessions" — those are
 * Task 2.5.4, built on top of this. The split is deliberate and it is the same
 * one that keeps `market-time.ts` separate from this file: the three fail
 * differently. A wrong conversion is wrong twice a year for everything; a wrong
 * row here is wrong on one day a year; a wrong `nextSession` is wrong every
 * weekend. Keeping them apart means a red test names which.
 *
 * **It does not convert anything.** No `Intl`, no timezone identifier, no
 * instants — `eslint.config.mjs` forbids the first two outside `market-time.ts`
 * anyway. The `Date.UTC` arithmetic below is string validation with UTC at both
 * ends, which is the same thing `isMarketDate` does and is not a market-time
 * conversion.
 *
 * ## Why the dates are plain strings
 *
 * The rows carry `date: string` rather than `date: MarketDate`, and the branding
 * happens at the boundary of the functions that read the table. That is a
 * **measured** decision rather than a stylistic one: Task 2.3.8 found that a
 * plain array literal is tree-shaken out of the frontend bundle completely,
 * while `SECTOR_ETFS` — built by *calling* `toTicker()` eleven times — costs 115
 * bytes, because a call expression is not provably side-effect-free. A table
 * whose every date is `toMarketDate("…")` is exactly that shape at scale, and
 * the measurement on a table this size is **+1,479 bytes** shipped to every
 * visitor for a table no frontend code reads.
 *
 * So validation is deferred to {@link marketCalendarIndex}, which runs once, on
 * first use, and is dead code in a build that never asks a calendar question.
 */

import { toMarketDate, toMarketTimeOfDay } from "./market-time.js";
import type { MarketDate, MarketTimeOfDay } from "./market-time.js";

/**
 * The two things an exception row can say.
 *
 * Deliberately not a third member for "unscheduled": whether a closure was
 * planned is a fact about *when we found out*, not about whether the market was
 * open, and no consumer branches on it. The row's `name` carries it for a human.
 */
export const MARKET_CALENDAR_EXCEPTION_KINDS = [
  "closed",
  "early_close",
] as const;

export type MarketCalendarExceptionKind =
  (typeof MARKET_CALENDAR_EXCEPTION_KINDS)[number];

/** A day the market did not open at all. */
export interface MarketFullClosure {
  readonly date: string;
  readonly kind: "closed";
  readonly name: string;
}

/** A day the market opened at 09:30 ET and closed before 16:00 ET. */
export interface MarketEarlyClose {
  readonly date: string;
  readonly kind: "early_close";
  /** Wall-clock time in the market's timezone, `HH:MM`. Always 13:00 so far. */
  readonly closesAt: string;
  readonly name: string;
}

/**
 * One row of {@link MARKET_CALENDAR}.
 *
 * A discriminated union rather than one interface with an optional `closesAt`,
 * which is `Security`'s shape and is here for `Security`'s reason: the compiler
 * refuses a full closure carrying a close time and an early close missing one,
 * so the table cannot express a row that means nothing. That is the cheapest
 * guard available on a hand-maintained file and it costs a build rather than a
 * test run.
 */
export type MarketCalendarException = MarketFullClosure | MarketEarlyClose;

/**
 * The years this calendar covers, inclusive at both ends.
 *
 * **Backward to 2024** because Epic 5's baselines are specified in trading days
 * (`calculate_return_percentile(NVDA, 5m, 60 trading days)`, `PRODUCT_SPEC.md`
 * §5.1) and Epic 13 wants a deep pool of sessions to replay. Two full years
 * behind today clears a 60-session baseline many times over and gives Epic 13
 * roughly 670 sessions to choose a demonstration from — at ten rows a year.
 *
 * **Forward to 2028** because that is exactly as far as NYSE publishes, which
 * was confirmed rather than assumed: `CALENDAR.md` §1.4 instructed this task to
 * narrow the range to 2027 if 2028 turned out not to be published, and it is,
 * footnotes and all. Nothing here is derived.
 */
export const MARKET_CALENDAR_RANGE = {
  firstDate: "2024-01-01",
  lastDate: "2028-12-31",
} as const;

/**
 * Where this table came from, and when somebody last checked it.
 *
 * **`checkedOn` is the date the list was last read against the source, and it is
 * never "now".** That is `UNIVERSE.md` §11's convention applied rather than a
 * second one invented, and the argument transfers exactly: a provenance date
 * that is always today carries no information and cannot report staleness. Move
 * it **when you have actually re-checked**, in the same commit as whatever the
 * check changed. Leaving it here while the world moves is precisely the state a
 * provenance field exists to make visible.
 *
 * **Nothing can check that obligation**, and it joins this repository's third
 * kind of gap — a stated invariant nothing enforces — beside `UNIVERSE.md` §11's
 * own `checkedOn` and the runtime's timezone database.
 *
 * **`nextEditDue` is the one thing here that is not provenance**, and it is here
 * because this is the block somebody reads when they come to edit the file. It
 * is a full covered year before the range runs out, so the obligation is late
 * rather than fatal if it slips. The earliest useful moment to act on it is
 * whenever NYSE publishes 2029.
 *
 * ## One row has a different source, and that is stated rather than modelled
 *
 * Every scheduled row below came from NYSE's published holiday and hours
 * calendar (`https://www.nyse.com/markets/hours-calendars`, cross-checked
 * against archived editions of the same page for 2024 and 2025, which NYSE no
 * longer publishes). **2025-01-09 did not**, because an unscheduled closure is
 * announced and never forecast; it came from ICE's own announcement of it.
 *
 * `universe.ts` owes its per-group provenance the negative fact that every row
 * shares one source, and here that fact does **not** hold — so it is written
 * down instead of being encoded. A per-row `source` field was considered and
 * declined for Task 1.7.3's rule that a field ships with its first reader:
 * nothing renders calendar provenance, where Story 2.14 does render the
 * universe's. **The reversal trigger is the first screen that shows where a
 * trading day came from, or a second row from a third source.**
 */
export const MARKET_CALENDAR_PROVENANCE = {
  source: "NYSE published holiday and hours calendar",
  checkedOn: "2026-09-06",
  nextEditDue: "2028-01-01",
} as const;

/**
 * Every full closure and every early close in the covered range.
 *
 * **A plain array literal of object literals, and that is load-bearing** — see
 * the module comment. Do not map over a rule set to build it, do not brand the
 * dates here, and do not sort it at run time; it is written in date order and a
 * test asserts that it stayed that way.
 *
 * Sources and cross-checks, so the next editor knows what "checked" meant:
 *
 * - 2026, 2027, 2028 read off NYSE's live calendar page, footnotes included.
 * - 2024, 2025 read off archived editions of that same page (NYSE publishes
 *   three years forward and drops years as they pass), plus the announcement
 *   for 2025-01-09.
 * - Every date was then cross-checked against `CALENDAR.md` §7.5 and §7.6's
 *   independently *derived* tables. They agree on all 49 scheduled closures and
 *   all 11 early closes. The one disagreement is 2025-01-09, which the derived
 *   table cannot contain and the published record does.
 *
 * Two interactions worth knowing before editing, because both produce a plausible
 * wrong row:
 *
 * **The observance rule has an exception.** A holiday on a Saturday is observed
 * on the preceding Friday and one on a Sunday on the following Monday — except
 * New Year's Day on a Saturday, which is not observed at all, because that
 * Friday is in the previous year. That case is in range: 2028-01-01 is a
 * Saturday, so **2028 has nine closures rather than ten** and 2027-12-31 is an
 * ordinary full session. NYSE states it as a footnote in as many words.
 *
 * **The half-day rule yields to the observance rule.** 2026 and 2027 both show
 * it: Independence Day 2026 falls on a Saturday, so 2026-07-03 is the observed
 * **full closure** and not a 13:00 half day — a list applying "3 July is a half
 * day" mechanically invents a phantom half session. Christmas Day 2027 falls on
 * a Saturday, so 2027-12-24 is the observed full closure, there is no Christmas
 * Eve half day that year, and the early close does **not** shift to 23 December.
 */
export const MARKET_CALENDAR: readonly MarketCalendarException[] = [
  // --- 2024 --- 252 sessions
  { date: "2024-01-01", kind: "closed", name: "New Year's Day" },
  { date: "2024-01-15", kind: "closed", name: "Martin Luther King, Jr. Day" },
  { date: "2024-02-19", kind: "closed", name: "Washington's Birthday" },
  { date: "2024-03-29", kind: "closed", name: "Good Friday" },
  { date: "2024-05-27", kind: "closed", name: "Memorial Day" },
  { date: "2024-06-19", kind: "closed", name: "Juneteenth" },
  {
    date: "2024-07-03",
    kind: "early_close",
    closesAt: "13:00",
    name: "Day before Independence Day",
  },
  { date: "2024-07-04", kind: "closed", name: "Independence Day" },
  { date: "2024-09-02", kind: "closed", name: "Labor Day" },
  { date: "2024-11-28", kind: "closed", name: "Thanksgiving Day" },
  {
    date: "2024-11-29",
    kind: "early_close",
    closesAt: "13:00",
    name: "Day after Thanksgiving",
  },
  {
    date: "2024-12-24",
    kind: "early_close",
    closesAt: "13:00",
    name: "Christmas Eve",
  },
  { date: "2024-12-25", kind: "closed", name: "Christmas Day" },

  // --- 2025 --- 250 sessions, and the only year in range that is not 251 or 252
  { date: "2025-01-01", kind: "closed", name: "New Year's Day" },
  // The row no rule set produces, and the reason this file is a table. Announced
  // on 2024-12-30 and closed eleven days later; every US equity market shut.
  {
    date: "2025-01-09",
    kind: "closed",
    name: "National Day of Mourning (President Carter)",
  },
  { date: "2025-01-20", kind: "closed", name: "Martin Luther King, Jr. Day" },
  { date: "2025-02-17", kind: "closed", name: "Washington's Birthday" },
  { date: "2025-04-18", kind: "closed", name: "Good Friday" },
  { date: "2025-05-26", kind: "closed", name: "Memorial Day" },
  { date: "2025-06-19", kind: "closed", name: "Juneteenth" },
  {
    date: "2025-07-03",
    kind: "early_close",
    closesAt: "13:00",
    name: "Day before Independence Day",
  },
  { date: "2025-07-04", kind: "closed", name: "Independence Day" },
  { date: "2025-09-01", kind: "closed", name: "Labor Day" },
  { date: "2025-11-27", kind: "closed", name: "Thanksgiving Day" },
  {
    date: "2025-11-28",
    kind: "early_close",
    closesAt: "13:00",
    name: "Day after Thanksgiving",
  },
  {
    date: "2025-12-24",
    kind: "early_close",
    closesAt: "13:00",
    name: "Christmas Eve",
  },
  { date: "2025-12-25", kind: "closed", name: "Christmas Day" },

  // --- 2026 --- 251 sessions
  { date: "2026-01-01", kind: "closed", name: "New Year's Day" },
  { date: "2026-01-19", kind: "closed", name: "Martin Luther King, Jr. Day" },
  { date: "2026-02-16", kind: "closed", name: "Washington's Birthday" },
  { date: "2026-04-03", kind: "closed", name: "Good Friday" },
  { date: "2026-05-25", kind: "closed", name: "Memorial Day" },
  { date: "2026-06-19", kind: "closed", name: "Juneteenth" },
  // Independence Day falls on a Saturday, so this is the observed FULL closure.
  // It is not a half day, and a rule set that thinks 3 July always is invents one.
  {
    date: "2026-07-03",
    kind: "closed",
    name: "Independence Day (observed)",
  },
  { date: "2026-09-07", kind: "closed", name: "Labor Day" },
  { date: "2026-11-26", kind: "closed", name: "Thanksgiving Day" },
  {
    date: "2026-11-27",
    kind: "early_close",
    closesAt: "13:00",
    name: "Day after Thanksgiving",
  },
  {
    date: "2026-12-24",
    kind: "early_close",
    closesAt: "13:00",
    name: "Christmas Eve",
  },
  { date: "2026-12-25", kind: "closed", name: "Christmas Day" },

  // --- 2027 --- 251 sessions. Both observance directions in one year, and the
  // only year in range with a single early close.
  { date: "2027-01-01", kind: "closed", name: "New Year's Day" },
  { date: "2027-01-18", kind: "closed", name: "Martin Luther King, Jr. Day" },
  { date: "2027-02-15", kind: "closed", name: "Washington's Birthday" },
  { date: "2027-03-26", kind: "closed", name: "Good Friday" },
  { date: "2027-05-31", kind: "closed", name: "Memorial Day" },
  // Juneteenth falls on a Saturday: observed on the Friday before.
  { date: "2027-06-18", kind: "closed", name: "Juneteenth (observed)" },
  // Independence Day falls on a Sunday: observed on the Monday after.
  { date: "2027-07-05", kind: "closed", name: "Independence Day (observed)" },
  { date: "2027-09-06", kind: "closed", name: "Labor Day" },
  { date: "2027-11-25", kind: "closed", name: "Thanksgiving Day" },
  {
    date: "2027-11-26",
    kind: "early_close",
    closesAt: "13:00",
    name: "Day after Thanksgiving",
  },
  // Christmas Day falls on a Saturday, so the 24th is the observed full closure
  // rather than the usual Christmas Eve half day — and the early close does not
  // move to the 23rd.
  { date: "2027-12-24", kind: "closed", name: "Christmas Day (observed)" },

  // --- 2028 --- 251 sessions. NINE closures, not ten: New Year's Day falls on a
  // Saturday and is not observed at all, because the Friday before is in 2027.
  { date: "2028-01-17", kind: "closed", name: "Martin Luther King, Jr. Day" },
  { date: "2028-02-21", kind: "closed", name: "Washington's Birthday" },
  { date: "2028-04-14", kind: "closed", name: "Good Friday" },
  { date: "2028-05-29", kind: "closed", name: "Memorial Day" },
  { date: "2028-06-19", kind: "closed", name: "Juneteenth" },
  {
    date: "2028-07-03",
    kind: "early_close",
    closesAt: "13:00",
    name: "Day before Independence Day",
  },
  { date: "2028-07-04", kind: "closed", name: "Independence Day" },
  { date: "2028-09-04", kind: "closed", name: "Labor Day" },
  { date: "2028-11-23", kind: "closed", name: "Thanksgiving Day" },
  {
    date: "2028-11-24",
    kind: "early_close",
    closesAt: "13:00",
    name: "Day after Thanksgiving",
  },
  { date: "2028-12-25", kind: "closed", name: "Christmas Day" },
];

/**
 * A date the calendar has no opinion about, because it is outside the years the
 * table covers.
 *
 * **This is acceptance criterion 4, and it is the half most calendar
 * implementations skip.** A date past the last covered year is not a normal
 * input with a sensible default. The plausible wrong answer — "no rows that
 * year, so no closures" — turns every 2029 holiday into a phantom trading
 * session, silently, and surfaces in Story 2.12 as a chart with a bar on
 * Christmas Day. The other plausible wrong answer, "assume closed", is worse: it
 * loses a whole year of sessions.
 *
 * So the calendar refuses, and the refusal names the range **and the file to
 * edit**, because the person reading it needs to do something rather than
 * understand something. It is loud on the day the obligation was missed rather
 * than a year later, and it is testable.
 *
 * There is deliberately **no fallback, no `strict` flag and no "assume open
 * outside the range" option.** That follows `instantFromMarketTime`'s refusal
 * for its reason: a flag whose safe setting is the default and whose unsafe
 * setting is available is a flag somebody sets during an incident.
 *
 * A class with the offending date on it rather than a message to match on, so a
 * test and a caller can both work without asserting on prose — the shape
 * {@link MarketTimeError} already uses.
 */
export class MarketCalendarRangeError extends Error {
  readonly date: string;

  constructor(date: string) {
    super(
      `${date} is outside the trading calendar, which covers ` +
        `${MARKET_CALENDAR_RANGE.firstDate} to ${MARKET_CALENDAR_RANGE.lastDate}. ` +
        `Extend MARKET_CALENDAR in packages/shared/src/market-calendar.ts from ` +
        `NYSE's published holiday and hours calendar, and move ` +
        `MARKET_CALENDAR_PROVENANCE.checkedOn when you do. Guessing which days ` +
        `the market is shut would report every holiday as a trading session.`,
    );
    this.name = "MarketCalendarRangeError";
    this.date = date;
  }
}

/**
 * Refuses a date the calendar cannot answer for. Returns nothing on success.
 *
 * Exported because Task 2.5.4's session functions need the same refusal at their
 * own boundaries, and a second copy of the range check is a second place for the
 * range to be wrong.
 */
export function assertWithinMarketCalendar(date: MarketDate): void {
  if (
    date < MARKET_CALENDAR_RANGE.firstDate ||
    date > MARKET_CALENDAR_RANGE.lastDate
  ) {
    throw new MarketCalendarRangeError(date);
  }
}

/**
 * The table as a lookup, validated, built once on first use.
 *
 * **Lazy for the reason the formatters in `market-time.ts` are lazy**, and it is
 * the same measured finding: a module-load `const INDEX = build()` is a call
 * expression, so a bundler cannot prove it side-effect-free and retains it —
 * along with everything it touches — in a build that never asks a calendar
 * question. Inside a function it is dead code in a dead function, which drops
 * entirely.
 *
 * **The validation is here rather than in the type because a type cannot express
 * it**, and every check below catches a mistake a human editing this table
 * actually makes:
 *
 * - the date exists (`2026-02-30` matches the shape and is not a day);
 * - it is inside the covered range, so a row cannot be silently unreachable;
 * - it is a **weekday**, because a closure on a Saturday is either observed
 *   somewhere else or does not exist, and a weekend row means the observance
 *   rule was applied wrongly. This is also what keeps a Sunday out of the table,
 *   which matters downstream: every US DST transition is a Sunday, so a Sunday
 *   row is the only way Task 2.5.4 could ever make `instantFromMarketTime`
 *   refuse;
 * - the rows are in ascending date order with no duplicates, so the file stays
 *   reviewable in a diff and two rows cannot disagree about one day;
 * - an early close parses as a market time, through
 *   {@link toMarketTimeOfDay} rather than a second parser written here.
 *
 * A violation throws at the first call rather than reporting every problem, and
 * that is the one place this file departs from `load-universe.ts`, which
 * deliberately reports all violations in one run. The difference is who is
 * looking: the loader validates data that arrives from a person mid-task and
 * wants to tell them everything at once, where this validates a literal in the
 * same file as the check, caught by the first test that runs.
 */
interface MarketCalendarIndex {
  readonly exceptions: ReadonlyMap<string, MarketCalendarException>;
}

let index: MarketCalendarIndex | undefined;

function marketCalendarIndex(): MarketCalendarIndex {
  if (index !== undefined) return index;

  const exceptions = new Map<string, MarketCalendarException>();
  let previous = "";

  for (const exception of MARKET_CALENDAR) {
    // Throws on a date that does not exist. `toMarketDate` rather than a second
    // pattern here, so "what is a market date" has one definition.
    const date = toMarketDate(exception.date);

    if (
      date < MARKET_CALENDAR_RANGE.firstDate ||
      date > MARKET_CALENDAR_RANGE.lastDate
    ) {
      throw new RangeError(
        `${date} is in MARKET_CALENDAR and outside its own covered range ` +
          `(${MARKET_CALENDAR_RANGE.firstDate} to ${MARKET_CALENDAR_RANGE.lastDate}). ` +
          `Either the row or MARKET_CALENDAR_RANGE is wrong.`,
      );
    }

    if (date <= previous) {
      throw new RangeError(
        `MARKET_CALENDAR is out of order or has a duplicate at ${date} ` +
          `(previous row was ${previous}). Rows are written in ascending date ` +
          `order so the file is reviewable in a diff.`,
      );
    }
    previous = date;

    // UTC at both ends, so this is calendar arithmetic on a date string rather
    // than a market-time conversion — the same thing `isMarketDate` does.
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (weekday === 0 || weekday === 6) {
      throw new RangeError(
        `${date} (${exception.name}) falls on a weekend, so it cannot be a ` +
          `market exception — the market is already shut. A holiday on a ` +
          `Saturday is observed on the preceding Friday and one on a Sunday on ` +
          `the following Monday, except New Year's Day on a Saturday, which is ` +
          `not observed at all.`,
      );
    }

    // Throws on an unparseable close time. The calendar stores the string form
    // and market-time.ts owns parsing it; a second parser here is the
    // duplication criterion 2 exists to prevent.
    if (exception.kind === "early_close") toMarketTimeOfDay(exception.closesAt);

    exceptions.set(date, exception);
  }

  index = { exceptions };
  return index;
}

/**
 * What, if anything, is exceptional about this market date.
 *
 * `undefined` means "nothing" — which for a weekday is an ordinary 09:30–16:00
 * session and for a weekend is a weekend. **This function does not know which**,
 * deliberately: turning the absence of a row into a session is Task 2.5.4's, and
 * it is the piece that also has to know about Saturdays.
 *
 * Refuses a date outside the covered range rather than answering `undefined`,
 * which is the whole of {@link MarketCalendarRangeError}'s reason for existing —
 * the two answers are indistinguishable to a caller and one of them is a lie.
 */
export function marketCalendarExceptionOn(
  date: MarketDate,
): MarketCalendarException | undefined {
  assertWithinMarketCalendar(date);
  return marketCalendarIndex().exceptions.get(date);
}

/**
 * The early close for a market date, as parts, or `undefined` if it closes at
 * the regular time.
 *
 * A convenience over {@link marketCalendarExceptionOn} that exists because
 * `closesAt` is a **string** on the row (so the table tree-shakes) and every
 * caller wants it parsed. Putting the parse here means Task 2.5.4 never touches
 * the string form, and neither does anything after it.
 *
 * Note what it does *not* say: a full closure returns `undefined` here, exactly
 * as an ordinary session does, because "closes early at" is not a question with
 * an answer on a day the market never opened. Ask
 * {@link marketCalendarExceptionOn} if the difference matters — it does to Task
 * 2.5.4 and it does not to a bar count.
 */
export function marketEarlyCloseOn(
  date: MarketDate,
): MarketTimeOfDay | undefined {
  const exception = marketCalendarExceptionOn(date);
  return exception?.kind === "early_close"
    ? toMarketTimeOfDay(exception.closesAt)
    : undefined;
}
