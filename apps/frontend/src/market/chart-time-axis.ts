import type {
  Bar,
  MarketDate,
  Timeframe,
  TimeRange,
} from "@marketpulse/shared";
import {
  marketDateAt,
  marketSessionsBetween,
  marketWallClockAt,
} from "@marketpulse/shared";

// The horizontal axis: sessions, slots, and what happens to the nights and the
// weekends between them (Task 2.12.3).
//
// `CHARTING.md` §3 settled the shape and this file implements it rather than
// re-taking it: **the axis is session-ordinal and the labels are temporal.** Bar
// `i` sits at `i / (n - 1)` of the plot width, there is no gap between Friday's
// last minute and Monday's first, and the seam where one session becomes the
// next is where that fact is given back — a dashed rule and a label that changes
// from a time to a date.
//
// The arithmetic behind that decision, from §3: a continuous time axis over the
// product's default window of five sessions of minute bars spans ~5,760
// wall-clock minutes of which **1,950 are trading minutes**, so roughly
// two-thirds of the chart would be empty before the reader had done anything.
//
// ## Two rules that are easy to get subtly wrong, and both are here
//
// **The axis comes from `coverage.requested`, never from the bars**
// (`CHARTING.md` §6.2). {@link timeAxis} takes a `TimeRange` and knows nothing
// about a series. Build the axis from the bars instead and a `partial` answer
// silently rescales to fill the frame and **looks complete** — no error, nothing
// red, and no test below `pnpm e2e` able to see it.
//
// **Sessions come from the calendar, not from the data.** A window whose bars
// stop on Friday afternoon still has Monday's slots in it if Monday was asked
// for, and a window containing Labor Day has none for it. `packages/shared`'s
// trading calendar is the only thing that knows which is which, and it refuses
// dates outside 2024–2028 rather than assuming a quiet year.
//
// ## Nothing here spells the market's timezone
//
// Every conversion goes through `packages/shared/src/market-time.ts` — the one
// module in this workspace allowed to do it, enforced by a
// `no-restricted-syntax` rule holding an acceptance criterion from Story 2.5.
// This file constructs no `Intl.DateTimeFormat`, names no zone, and reads no
// clock: every instant it handles arrives from the calendar or from a bar.

/** Milliseconds in a one-minute slot. */
const MINUTE_MS = 60_000;

/**
 * The most session labels an axis writes before it starts thinning them.
 *
 * Eight, which is a decision about reading rather than about pixels: a run of
 * dates closer together than roughly 100 px stops being an axis and becomes a
 * texture. It bites on a `1d` series — Story 2.13's window control is what
 * brings one, and a month of daily bars is 21 sessions — and never on the
 * default window, which is five.
 */
const MAX_SESSION_LABELS = 8;

/**
 * The most sessions an axis will put a midday tick on.
 *
 * Beyond this the dates are doing the work and a time between each pair of them
 * is noise. Five is the default window, so the default window is the widest one
 * that gets them.
 */
const MAX_SESSIONS_FOR_MIDDAY = 5;

/** The hour a midday tick lands on, in market time. */
const MIDDAY_HOUR = 12;

/** The most hourly ticks a single-session axis writes. */
const MAX_HOURLY_TICKS = 6;

const MONTH_ABBREVIATIONS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * One trading session's share of the axis.
 *
 * `open` and `close` are **clipped to the requested window**, which is what
 * makes a window starting at 15:00 on a Friday one hour wide rather than a whole
 * session wide. They are also aligned to the slot grid: a window that starts
 * mid-minute is snapped back to the minute it is inside, so a bar stamped
 * 15:00:00 is not pushed into the previous slot by a window stamped 15:00:30.
 */
export interface AxisSession {
  /** The market date. From the calendar, never sliced off an ISO string. */
  readonly date: MarketDate;
  /** The first instant this session contributes to the axis. Inclusive. */
  readonly open: Date;
  /** The instant it stops contributing. **Exclusive**, as every range here is. */
  readonly close: Date;
  /** The axis slot this session's first interval occupies. */
  readonly firstSlot: number;
  /** How many slots it contributes. At least one. */
  readonly slots: number;
}

/**
 * The horizontal axis of one chart: a run of slots, and the sessions they came
 * from.
 *
 * Plain data and no closures, for `chart-scale.ts`'s reasons.
 */
export interface TimeAxis {
  /** What one slot is: a trading minute, or a whole session. */
  readonly timeframe: Timeframe;
  /** Oldest first. Never empty — see {@link timeAxis}. */
  readonly sessions: readonly AxisSession[];
  /** Total slots. The scale's domain, handed to `slotScale`. */
  readonly slots: number;
}

/**
 * Where an instant falls on an ordinal axis.
 *
 * **A union rather than a number, because an ordinal axis genuinely has no
 * position for some instants**, and `CHARTING.md` §3's rule 2 says what is done
 * about it. This is not a corner case: 8-K filings are routinely made after the
 * close, so *most* of Epic 9's filing markers will land in a gap this axis does
 * not draw. Returning a plain number would put them at a plausible, wrong
 * position, which is the shape of defect this repository keeps writing down.
 */
export type AxisPosition =
  /**
   * Inside a session. `slot` is **fractional** — the whole part is the slot and
   * the fraction is how far through its interval the instant sits, which is
   * §3's rule 1 and is what lets a marker sit between two minutes rather than
   * snapping to one.
   */
  | { readonly kind: "inside"; readonly slot: number }
  /**
   * Between two sessions, where the axis draws no gap at all.
   *
   * Placed on the **boundary**: the slot the following session starts at, or
   * `axis.slots` when there is no following session inside the window. §3's rule
   * 2 attaches a duty to this answer — *the mark must carry its true timestamp
   * in its label*, because the axis is now lying about **when**, by design, and
   * the label is the only place the truth survives.
   */
  | { readonly kind: "boundary"; readonly slot: number }
  /** Outside the requested window entirely. There is nowhere to draw it. */
  | { readonly kind: "outside" };

/** A bar, and the slot it occupies. */
export interface PlacedBar {
  readonly bar: Bar;
  /** A whole slot in `[0, axis.slots)`. */
  readonly slot: number;
}

/** A slot that gets a label under the axis. */
export type TimeTick =
  /** A session's first slot, labelled with its date. */
  | {
      readonly kind: "session";
      readonly slot: number;
      readonly date: MarketDate;
      readonly label: string;
    }
  /** A time inside a session — the hour, or midday. */
  | { readonly kind: "time"; readonly slot: number; readonly label: string };

/** How many labels the axis has room for, decided by `chart-density.ts`. */
export interface TimeTickOptions {
  /**
   * `all` labels every session (thinned at {@link MAX_SESSION_LABELS}); `ends`
   * labels only the first and the last.
   */
  readonly sessionLabels: "all" | "ends";
  /** Whether there is room for times between the dates. */
  readonly intraday: boolean;
}

/**
 * Builds the axis for a requested window.
 *
 * **Takes the window, not the series.** See the header: this is the line of code
 * `CHARTING.md` §6.2 is emphatic about, and the reason Task 2.12.4 is told to
 * get it right before Task 2.12.7 draws a `partial` state. A `partial` answer
 * then stops short of the right-hand edge, and the shortfall is visible space
 * saying exactly what the coverage sentence beside it says in words.
 *
 * Throws when the window contains no session at all — a Saturday, or a holiday
 * with nothing either side of it inside the range. That is a window nobody can
 * draw an axis for, and it is reachable only through a request nothing in this
 * application makes: the server resolves `sessions=N` against the calendar, so
 * every window it returns has `N` sessions in it. An empty axis would render as
 * an empty frame, which is indistinguishable from a working chart of a security
 * that did not trade.
 */
export function timeAxis(requested: TimeRange, timeframe: Timeframe): TimeAxis {
  const sessions: AxisSession[] = [];
  let nextSlot = 0;

  // `marketDateAt` rather than slicing the ISO string, which is right all
  // afternoon and wrong every evening: 2026-09-04T00:00:00Z is 2026-09-03 in
  // New York. The end is exclusive, so a window ending at midnight ET names the
  // session before it and the zero-width session that results is dropped below.
  for (const session of marketSessionsBetween(
    marketDateAt(requested.start),
    marketDateAt(requested.end),
  )) {
    const slotMs =
      timeframe === "1m"
        ? MINUTE_MS
        : session.close.getTime() - session.open.getTime();

    // Snap the clipped open back to the session's own slot grid. A window
    // starting at 15:00:30 covers the 15:00 bar, and rounding the other way
    // would push every bar in the session one slot to the left.
    const openMs = Math.max(session.open.getTime(), requested.start.getTime());
    const gridded =
      session.open.getTime() +
      Math.floor((openMs - session.open.getTime()) / slotMs) * slotMs;

    const closeMs = Math.min(session.close.getTime(), requested.end.getTime());
    if (closeMs <= gridded) continue;

    const slots = Math.ceil((closeMs - gridded) / slotMs);

    sessions.push({
      date: session.date,
      open: new Date(gridded),
      close: new Date(closeMs),
      firstSlot: nextSlot,
      slots,
    });

    nextSlot += slots;
  }

  if (sessions.length === 0) {
    throw new RangeError(
      `The requested window contains no trading session, so there is no axis ` +
        `to draw: ${requested.start.toISOString()} to ` +
        `${requested.end.toISOString()}. An empty axis renders as an empty ` +
        `frame, which is indistinguishable from a security that did not trade.`,
    );
  }

  return { timeframe, sessions, slots: nextSlot };
}

/**
 * The slots where one session becomes the next — the dashed vertical rules, and
 * the only vertical rules this chart draws.
 *
 * **Every session after the first**, because the first session's start is the
 * frame's own left edge and a rule drawn on it is a left spine, which is exactly
 * the four-sided-box look `VISUAL-LANGUAGE.md` refuses.
 *
 * **Empty for a `1d` axis**, and that is a decision rather than a gap. A seam
 * marks the discontinuity *inside* a continuous run of slots; on a daily axis
 * every slot is already a whole session, so a rule between each pair would be a
 * rule between every bar — chrome drawn 21 times over a month, saying something
 * the slots already say.
 */
export function seamSlots(axis: TimeAxis): readonly number[] {
  if (axis.timeframe === "1d") return [];
  return axis.sessions.slice(1).map((session) => session.firstSlot);
}

/**
 * Where an instant falls. See {@link AxisPosition} for what the answers mean.
 *
 * A linear walk rather than a binary search: an axis has one session per trading
 * day, so the default window has five and the longest window this epic serves
 * has about twenty-one. A binary search over twenty-one entries is a second
 * thing to get right in exchange for nothing measurable.
 */
export function positionOfInstant(axis: TimeAxis, instant: Date): AxisPosition {
  const time = instant.getTime();
  const first = axis.sessions[0];
  const last = axis.sessions[axis.sessions.length - 1];

  // `sessions` is never empty, but `noUncheckedIndexedAccess` is on and an
  // assertion here would be this file claiming something it did not check.
  if (first === undefined || last === undefined) return { kind: "outside" };

  if (time < first.open.getTime()) {
    // Before the first session but inside the window — a pre-market instant on
    // the opening day. The boundary at the left-hand edge.
    return { kind: "boundary", slot: 0 };
  }

  if (time >= last.close.getTime()) {
    // After the last session the window reaches. The mirror of the case above:
    // one slot past the end, which the caller clips to the frame.
    return { kind: "boundary", slot: axis.slots };
  }

  for (const session of axis.sessions) {
    if (time < session.open.getTime()) {
      // Between the previous session's close and this one's open: the night, the
      // weekend, or the holiday. The axis draws no gap, so this is the boundary.
      return { kind: "boundary", slot: session.firstSlot };
    }

    if (time < session.close.getTime()) {
      const slotMs =
        axis.timeframe === "1m"
          ? MINUTE_MS
          : session.close.getTime() - session.open.getTime();
      const offset = (time - session.open.getTime()) / slotMs;
      return { kind: "inside", slot: session.firstSlot + offset };
    }
  }

  /* v8 ignore next -- unreachable: the two bounds checks above cover the ends. */
  return { kind: "outside" };
}

/**
 * The bars, each on its slot.
 *
 * **A bar the axis has no slot for is dropped rather than drawn**, and the
 * alternative is worse than it sounds: an instant with no position would
 * otherwise be positioned at slot 0, putting a stray point at the left-hand edge
 * of an otherwise correct chart. It is reachable — `MARKET-DATA-API.md`'s live
 * tail is stitched onto stored history and could in principle reach past the
 * window's end — and the honest rendering of a bar outside the window is that
 * the window did not ask for it.
 *
 * Floored to a whole slot, because a bar *is* its interval: the 15:00 bar owns
 * the 15:00 slot, and a fractional position would be this function claiming a
 * precision that a one-minute bar does not have.
 */
export function placeBars(
  axis: TimeAxis,
  bars: readonly Bar[],
): readonly PlacedBar[] {
  const placed: PlacedBar[] = [];

  for (const bar of bars) {
    const position = positionOfInstant(axis, bar.startsAt);
    if (position.kind !== "inside") continue;
    placed.push({ bar, slot: Math.floor(position.slot) });
  }

  return placed;
}

/**
 * The index of the placed thing nearest a slot, or `null` when there is nothing
 * placed (Task 2.12.6).
 *
 * ## Why this exists at all, which is the distinction the whole crosshair rests on
 *
 * **A slot is a position on the axis; a bar is a thing that traded**, and
 * `bars[nearestSlot(...)]` confuses the two. They coincide only when every slot
 * in the window holds a bar, which is the *uncommon* case on this screen: a
 * `partial` answer covers the first *n* slots of a longer axis — the normal
 * state, since the free plan withholds the most recent quarter of an hour — and
 * a minute with no prints leaves a hole in the middle of a session, which the
 * store records as an absent row rather than a zero-volume bar.
 *
 * Indexing the array by slot is wrong in both, and **wrong quietly in the
 * second**: it returns a real bar, just not the one under the pointer, with
 * everything after the hole shifted by one. Nothing renders badly and no test
 * that does not know about holes can see it.
 *
 * ## The answer is the nearest placed thing, never nothing
 *
 * Task 2.12.3 handed this task two decisions and this is the first: what the
 * crosshair does over a slot with no bar. It **snaps**, and the argument is on
 * the canvas (`Price reading.dc.html` §05) and in `CHARTING.md` §13.2. Briefly:
 * the readout leads with the bar's own market timestamp, so a snap cannot
 * mislead — a reader is always told which minute they are reading — and the
 * alternative blanks the reading across the whole uncovered span, which is a
 * third of the commonest screen in the product.
 *
 * Takes anything carrying a `slot` rather than {@link PlacedBar}, because the
 * caller is the pixel layer and what it holds is a placed bar **with its
 * coordinates already on it**. Narrowing to `PlacedBar` would make the
 * component re-find a pixel it is already holding. It returns an **index**
 * rather than the thing found for the same reason: the caller wants a position
 * it can step from, and arrows step positions.
 *
 * A binary search rather than a scan, and that is a measurement rather than
 * tidiness: this runs on every pointer move over a 1,950-point series, which is
 * `PRODUCT_SPEC.md` §28's 50 ms budget being spent on a lookup.
 *
 * Ties go to the **earlier** slot. Arbitrary, and stated so it stays stable:
 * an unstated tie-break is a reading that changes when an unrelated edit
 * reverses a comparison.
 */
export function nearestPlaced(
  placed: readonly { readonly slot: number }[],
  slot: number,
): number | null {
  if (placed.length === 0) return null;

  let low = 0;
  let high = placed.length - 1;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    // `?? Infinity` is unreachable — `middle` is inside the array — and is what
    // `noUncheckedIndexedAccess` costs. Written as a comparison that cannot pick
    // a wrong side rather than as a non-null assertion.
    if ((placed[middle]?.slot ?? Infinity) < slot) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  const at = placed[low]?.slot;
  const before = placed[low - 1]?.slot;
  if (at === undefined) return null;
  if (before === undefined) return low;

  return slot - before <= at - slot ? low - 1 : low;
}

/**
 * Which slots get a label, and what they say.
 *
 * Two kinds, and the split is `CHARTING.md` §7.1's answer 9: **a session
 * boundary carries the date and everything between carries the time.** That is
 * the whole of what the reader is told about the night the axis did not draw, so
 * the dates go first and the times are what density takes away.
 */
export function timeTicks(
  axis: TimeAxis,
  options: TimeTickOptions,
): readonly TimeTick[] {
  const ticks: TimeTick[] = [];

  for (const index of labelledSessions(axis.sessions.length, options)) {
    const session = axis.sessions[index];
    if (session === undefined) continue;
    ticks.push({
      kind: "session",
      slot: session.firstSlot,
      date: session.date,
      label: formatSessionDate(session.date),
    });
  }

  if (options.intraday && axis.timeframe === "1m") {
    ticks.push(...intradayTicks(axis));
  }

  return ticks.sort((left, right) => left.slot - right.slot);
}

/** A market date as `Sep 4`, which is what an axis has room for. */
export function formatSessionDate(date: MarketDate): string {
  // A `MarketDate` is `YYYY-MM-DD` by construction, so this reads the string
  // rather than constructing a `Date` — which would be an instant, in some zone,
  // for a value that is already a market date and has no instant in it.
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  return `${MONTH_ABBREVIATIONS[month - 1] ?? date.slice(5, 7)} ${String(day)}`;
}

/** An instant as `09:30`, in market time. */
export function formatSessionTime(instant: Date): string {
  const wall = marketWallClockAt(instant);
  return `${pad(wall.hour)}:${pad(wall.minute)}`;
}

/**
 * Which sessions get a date, given how much room there is.
 *
 * `ends` is the density table's answer below 600 px of region: the first and the
 * last, so the reader still knows what period they are looking at. `all` thins
 * at {@link MAX_SESSION_LABELS} by stride, always keeping the last one — and
 * dropping the stride's own last pick when it would sit on top of it, because
 * two dates a few pixels apart is worse than one date missing.
 */
function labelledSessions(
  count: number,
  options: TimeTickOptions,
): readonly number[] {
  if (count === 1) return [0];

  if (options.sessionLabels === "ends") return [0, count - 1];

  if (count <= MAX_SESSION_LABELS) {
    return Array.from({ length: count }, (_unused, index) => index);
  }

  const stride = Math.ceil((count - 1) / (MAX_SESSION_LABELS - 1));
  const indices: number[] = [];
  for (let index = 0; index < count; index += stride) indices.push(index);

  const last = indices[indices.length - 1];
  if (last !== count - 1) {
    if (last !== undefined && count - 1 - last < stride / 2) indices.pop();
    indices.push(count - 1);
  }

  return indices;
}

/**
 * The times between the dates.
 *
 * Two shapes, because "how much is on screen" is the question and one session is
 * a different picture from five:
 *
 * - **One session** — the hours. 10:00 through 15:00 on a regular day, which is
 *   what an analyst reading a single session writes down.
 * - **Up to five sessions** — midday in each, once. Any more than one tick per
 *   session and the dates stop standing out from the times, which is the one
 *   thing this axis has to keep.
 *
 * Beyond {@link MAX_SESSIONS_FOR_MIDDAY}, none: the dates are carrying the axis
 * and a time between each pair is texture.
 */
function intradayTicks(axis: TimeAxis): readonly TimeTick[] {
  const [only] = axis.sessions;

  if (axis.sessions.length === 1 && only !== undefined) {
    return hourlyTicks(only);
  }

  if (axis.sessions.length > MAX_SESSIONS_FOR_MIDDAY) return [];

  const ticks: TimeTick[] = [];

  for (const session of axis.sessions) {
    const slot = slotAtHour(session, MIDDAY_HOUR);
    if (slot === null) continue;
    ticks.push({
      kind: "time",
      slot,
      label: formatSessionTime(
        new Date(
          session.open.getTime() + (slot - session.firstSlot) * MINUTE_MS,
        ),
      ),
    });
  }

  return ticks;
}

/**
 * Whole hours inside one session, thinned to {@link MAX_HOURLY_TICKS}.
 *
 * The session's own open is skipped: it already carries the date, and a `09:30`
 * beneath a `Sep 4` is the same slot labelled twice.
 */
function hourlyTicks(session: AxisSession): readonly TimeTick[] {
  const hours: TimeTick[] = [];
  const openWall = marketWallClockAt(session.open);

  // The first whole hour strictly after the open. `minute === 0` means the
  // window itself started on the hour, so the next one is an hour later.
  const firstHourOffset =
    openWall.minute === 0 && openWall.second === 0 ? 60 : 60 - openWall.minute;

  const spanMinutes =
    (session.close.getTime() - session.open.getTime()) / MINUTE_MS;

  for (let offset = firstHourOffset; offset < spanMinutes; offset += 60) {
    const instant = new Date(session.open.getTime() + offset * MINUTE_MS);
    hours.push({
      kind: "time",
      slot: session.firstSlot + offset,
      label: formatSessionTime(instant),
    });
  }

  if (hours.length <= MAX_HOURLY_TICKS) return hours;

  const stride = Math.ceil(hours.length / MAX_HOURLY_TICKS);
  return hours.filter((_unused, index) => index % stride === 0);
}

/**
 * The slot a whole hour of market time falls on inside a session, or `null` when
 * that hour is outside the session's clipped bounds.
 *
 * `null` is a real answer rather than a guard: a half day closes at 13:00 and a
 * window clipped to the last hour of a session contains no midday at all, and
 * both should produce no tick rather than a tick pinned to an edge.
 */
function slotAtHour(session: AxisSession, hour: number): number | null {
  const openWall = marketWallClockAt(session.open);
  const offset =
    (hour - openWall.hour) * 60 -
    openWall.minute -
    (openWall.second > 0 ? 1 : 0);

  const spanMinutes =
    (session.close.getTime() - session.open.getTime()) / MINUTE_MS;

  if (offset <= 0 || offset >= spanMinutes) return null;
  return session.firstSlot + offset;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
