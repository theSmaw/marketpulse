import type { Bar } from "@marketpulse/shared";
import { marketWallClockAt } from "@marketpulse/shared";

import { formatSessionDate } from "./chart-time-axis.js";
import {
  directionOf,
  formatChangePercent,
  formatPrice,
} from "./price-format.js";

// One bar, said in words and in figures (Task 2.12.6).
//
// `CHARTING.md` §2 chose a line of closes over candlesticks on the measurement
// that a candle would be **0.47 px wide** at the default window, and it took
// that decision *on the grounds that this readout exists* — "OHLC reaches the
// user through the readout rather than the mark". So this module is where three
// quarters of every bar in the store actually reaches a person, and a readout
// that stated only the close would retroactively make the series-type decision
// wrong.
//
// ## Why the sentence is a module and not a template literal in a component
//
// `search-announcement.ts`'s reasons, and one of its own.
//
// The inherited ones: the sentence is load-bearing rather than decorative, it
// has to **name its subject first** (`FRONTEND-STATE.md` §7 — the Security
// Explorer already carries three polite regions and a listener is handed them in
// an order no component controls), and it has to be **different from its
// predecessor** or the region says nothing at all. That last clause is why the
// timestamp leads: arrow along a flat stretch of a session and four consecutive
// bars can have the same four prices, so a sentence keyed on prices alone would
// announce the first of them and then go silent for the rest of the walk.
//
// The one of its own: **this sentence names a different subject from the one
// directly above it on screen**, and getting that wrong is the hazard Task
// 2.12.5's amendment spent a section on. Three things on the Security Explorer
// say up or down — the headline (the window), the wash (the price at a point,
// against the window's open) and this (one bar, its own open to its own close) —
// and all three can legitimately disagree at once. So the sentence says *on the
// bar* out loud, and the strip labels its figure `BAR`.
//
// ## The four prices, and the one figure that is not a price
//
// Open, high, low and close, plus the bar's own change. **Volume is not here**,
// and that is a fence rather than an omission: `Bar` carries it, Story 2.13
// builds the volume chart into the region directly below this one, and a volume
// figure in a price readout is the fact that would then be stated twice in two
// places with two subjects. It arrives with the chart that is about it.

/**
 * How long the reading's live region waits after the last key press, in
 * milliseconds.
 *
 * **400, and it is search's number rather than a new one**, which is a claim
 * worth being explicit about. `SEARCH_ANNOUNCEMENT_DELAY_MS` was settled
 * against a measurement of *typing* — the question it answers is *have they
 * stopped?* — and arrowing along a chart is the same question asked of the same
 * hand. What differs is only what a key press means.
 *
 * It is therefore a judgement inheriting a measurement, said plainly rather
 * than dressed up, and the reversal trigger is search's: a person reporting
 * that the region speaks over them or arrives late.
 *
 * @see READING_ANNOUNCEMENT_MIN_GAP_MS — the second number, which is the one
 * that matters here.
 */
export const READING_ANNOUNCEMENT_DELAY_MS = 400;

/**
 * The shortest gap allowed between two spoken readings, in milliseconds.
 *
 * **This is the number this surface actually needs**, and the reason is a
 * difference from search rather than a similarity. A debounce answers *have
 * they stopped?* and cannot tell a pause from an ending — Task 2.11.9 measured
 * that a hunt-and-peck typist made search speak **seven times** while typing one
 * word. A held arrow key is that failure with the brakes off: a browser repeats
 * at roughly 30 a second once the initial delay elapses, and every repeat looks
 * like the last one to a 400 ms timer.
 *
 * So the floor is what does the work here, and 1,500 ms is search's for
 * search's reason: it is roughly how long a screen reader takes to read one of
 * these sentences at a default rate, and speaking again before the previous
 * sentence has finished produces a queue rather than an announcement. Combined
 * with the delay, holding `→` across a session announces the bar the crosshair
 * is on *now*, about twice a second at most, rather than a backlog of bars it
 * has already left.
 */
export const READING_ANNOUNCEMENT_MIN_GAP_MS = 1500;

/** The subject every sentence opens with, after the symbol. */
const SUBJECT = "price chart";

/**
 * A bar's own change, open to close, as a percentage — or `null` when there is
 * no percentage to state.
 *
 * `null` for an opening price of **zero**, which is not a price any equity has
 * and is a corrupt bar rather than a division to attempt. `series-facts.ts` and
 * `chart-geometry.ts`'s reference rule both decline the same case for the same
 * reason, and the three staying one statement is what keeps the headline, the
 * plot and this readout from disagreeing about a bar nobody can read.
 */
export function barChangePercent(bar: Bar): number | null {
  if (bar.open === 0) return null;
  return ((bar.close - bar.open) / bar.open) * 100;
}

/**
 * A bar's instant, in market terms — `Sep 4 · 11:52 EDT`.
 *
 * **The date, the time and the zone**, which is three facts where the axis has
 * room for one. A time alone is ambiguous across a five-session window that
 * draws no gap between Friday's last minute and Monday's first — which is
 * exactly the fact the ordinal axis took away — and a zone abbreviation is what
 * stops a reader in London doing arithmetic they should not have to do.
 *
 * Seconds are dropped, unlike `series-facts.ts`'s `formatMarketInstant`. That
 * is not an inconsistency to tidy: a `1m` bar's instant has no seconds in it,
 * and a trailing `:00` on every reading is three characters of noise repeated
 * on every arrow press. The window facts below the chart state whole instants
 * because a *window* genuinely has a second in it.
 *
 * Every conversion goes through `packages/shared/src/market-time.ts`, the one
 * module in this workspace allowed to name the market's timezone.
 */
export function formatBarInstant(instant: Date): string {
  const wall = marketWallClockAt(instant);
  return (
    `${formatSessionDate(wall.date)} · ` +
    `${pad(wall.hour)}:${pad(wall.minute)} ${wall.offset.abbreviation}`
  );
}

/**
 * What the reading's live region says, or `null` when it has nothing to say.
 *
 * `null` is the resting state and is a real answer rather than an empty string,
 * for `searchAnnouncement`'s reason: a chart nobody has pointed at must be
 * **silent on arrival**, and keeping the distinction in the type stops a caller
 * announcing a sentence about no reading.
 *
 * ## The order of the clauses, which is the whole design of the sentence
 *
 * Subject, then instant, then the close, then the bar's direction, then the
 * other three prices. A listener stepping along a session is asking *what was
 * it here?* and gets an answer in the first six words; the open, high and low
 * are the detail they can wait for, and putting them first would make every
 * sentence's useful half arrive last.
 *
 * "on the bar" is not padding. It is the clause that keeps this sentence apart
 * from the panel's own, which announces what the **window** did in words that
 * are otherwise the same.
 */
export function readingAnnouncement(
  symbol: string,
  bar: Bar | null,
): string | null {
  if (bar === null) return null;

  const percent = barChangePercent(bar);
  // **A word and not the formatted figure's sign.** `formatChangePercent`
  // spells a fall with a Unicode minus, which is right on screen — it is the
  // typographic character — and is read aloud inconsistently, from "minus" to
  // nothing at all. `PriceChange` already solves this for the visible figure by
  // putting a hidden word in front of it, and this is the same repair one layer
  // down: the direction is spoken, and the magnitude is a plain number.
  const direction =
    percent === null
      ? "change not stated for this bar"
      : `${DIRECTION_WORDS[directionOf(percent)]} ` +
        `${formatChangePercent(percent).replace(SIGNS, "")} on the bar`;

  return (
    `${symbol} ${SUBJECT}: ${formatBarInstant(bar.startsAt)}, ` +
    `close ${formatPrice(bar.close)}, ${direction}. ` +
    `Open ${formatPrice(bar.open)}, high ${formatPrice(bar.high)}, ` +
    `low ${formatPrice(bar.low)}.`
  );
}

/** Spoken direction, matching `PriceChange`'s hidden word for the same fact. */
const DIRECTION_WORDS = {
  positive: "up",
  negative: "down",
  unchanged: "unchanged at",
} as const;

/** The two signs `formatChangePercent` may put in front of a figure. */
const SIGNS = /[+\u2212]/gu;

/** What a listener is told when a reading is cleared rather than moved. */
export function clearedAnnouncement(symbol: string): string {
  return `${symbol} ${SUBJECT}: reading cleared.`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
