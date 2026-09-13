import type { Timeframe } from "@marketpulse/shared";

import type { SeriesWindow } from "../bar-series-query.js";

// The windows this product offers, and the one place the mapping to a timeframe
// lives (Task 2.13.3).
//
// `VOLUME-AND-WINDOW.md` §2.2 named this file and no task owned writing it; §4
// is the table below and §2.1 is {@link timeframeForSessions}. Everything here
// is arithmetic and vocabulary with no DOM in it, which is this task's whole
// fence: the control that renders these five labels is Task 2.13.6's, and it
// reads them from here rather than spelling them again.
//
// ## Why the list, the labels and the mapping are one module
//
// A window is named on a control, in an address and in a sentence read aloud
// (§4). Three vocabularies for one window is how a sighted reader and a listener
// end up describing different things, and the cheapest way to keep them agreeing
// is to write them down together, once. The mapping belongs beside them for a
// sharper reason: **a timeframe spelled at the control and again at the request
// is the pair that disagrees the day a boundary moves**, and the boundary here is
// load-bearing — it is what makes the server's 10,000-bar cap structurally
// unreachable (§2.1).
//
// ## Why it is not in `packages/shared`
//
// Nothing outside the frontend reads it today and `CLAUDE.md`'s rule is not to
// scaffold ahead of the iteration that needs it. **Reversal trigger: the first
// non-frontend caller** — almost certainly Epic 11's `setTimeWindow`, which is
// schema-validated on the backend — at which point this module moves to
// `packages/shared` whole rather than being copied.
//
// ## `1M` and `1m` are different things
//
// The control labels are uppercase and name calendar spans; the timeframes are
// lowercase and name bar intervals (§4f). It is a real collision inside one
// module, it is resolved by case alone, and it is written down so the next reader
// does not read a typo.

/**
 * The query parameter a window is spelled with, in one place.
 *
 * `sessions`, carrying a **count** rather than a name, because that is already
 * the wire's own parameter in `bar-series-query.ts` — `?sessions=21` *is* the
 * request, spelled in the address (§4a). `?window=1M` would be a second
 * vocabulary the address holds and the request does not.
 */
export const SESSIONS_PARAM = "sessions";

/**
 * One offered window.
 *
 * `label` is what a cell shows and `name` is what a screen reader says (§4d):
 * `1D`, `5D`, `1M`, `3M`, `1Y` is the analyst-tool convention and five spelled-out
 * words in a row is a paragraph rather than a control — but "one dee" is not a
 * window, so the accessible name is the spelled-out form.
 *
 * There is no `timeframe` field. It is **derived** from `sessions` through
 * {@link timeframeForSessions}, which is the whole point of §2's decision: a
 * timeframe stored on each row is a second copy of the mapping, and an address
 * carrying a count that is not one of these five still needs the derivation.
 */
export interface TimeWindow {
  /** Stable identity, and what the control shows. */
  readonly label: "1D" | "5D" | "1M" | "3M" | "1Y";
  /** The accessible name — spelled out, never the abbreviation. */
  readonly name: string;
  /** Trading sessions, resolved against the calendar by the server. */
  readonly sessions: number;
}

/**
 * The five windows, oldest-to-newest span, in the order the control shows them.
 *
 * Each is justified in `VOLUME-AND-WINDOW.md` §1.1's cost table rather than by
 * taste, and two of the numbers are not the obvious ones:
 *
 *  - **1M is 21 sessions and not the 25 the cap would allow.** 21 × 390 = 8,190
 *    bars with 1,810 to spare; 25 is 9,750, which is 97.5% of the cap and starts
 *    being refused the first time the cap moves or a session's minute count is
 *    revised. 21 is also what "one month" means in sessions.
 *  - **1Y is 252 and there is no "max".** 672 sessions of `1d` and 251 of `1m`
 *    are different maxima and neither is "everything"; a label whose span changes
 *    every morning teaches a reader something false (§1.2).
 *
 * **1D is offered, is never the default and is never preselected** (§1.3). Until
 * Epic 3's live feed it is reliably `empty` — the store is backfilled nightly and
 * the free plan refuses the most recent quarter of an hour — and `empty` is a
 * correct answer this product already draws rather than a failure.
 */
export const TIME_WINDOWS: readonly TimeWindow[] = [
  { label: "1D", name: "1 day", sessions: 1 },
  { label: "5D", name: "5 days", sessions: 5 },
  { label: "1M", name: "1 month", sessions: 21 },
  { label: "3M", name: "3 months", sessions: 63 },
  { label: "1Y", name: "1 year", sessions: 252 },
];

/**
 * The window the application shows when the address names none.
 *
 * Five sessions, unchanged from what `SecurityExplorer.tsx` already sends, and
 * **the default writes no parameter** (§4c): `/securities/NVDA` *is* the
 * five-session view. Two consequences the control inherits — pressing `5D` from
 * another window **removes** the parameter rather than setting it, and a
 * hand-typed `?sessions=5` is honoured and left alone, because this application
 * does not rewrite an address into a different form.
 */
export const DEFAULT_WINDOW_SESSIONS = 5;

/**
 * The widest window drawn from minute bars.
 *
 * The boundary of {@link timeframeForSessions}, named because it is a claim about
 * the cap rather than a preference: 21 × 390 is 8,190 bars, and a half day is
 * **210** minute bars rather than 390, so a window containing one is *smaller*
 * and never larger. That makes 8,190 an upper bound in the only direction that
 * matters.
 */
export const MAX_MINUTE_SESSIONS = 21;

/**
 * Which bars a window is drawn from — **derived, never chosen** (§2).
 *
 * > `sessions ≤ 21 → 1m`. Above → `1d`.
 *
 * Exhaustive over a session count rather than a lookup keyed on the five offered
 * windows, and that is the load-bearing part: an address may carry any count the
 * server accepts, so `?sessions=7` must map, and so must an agent's
 * `setTimeWindow` asking for thirty (§4b).
 *
 * **This is what makes the 10,000-bar cap structurally unreachable through the
 * named window form**, for any count from any source — the control's, a
 * hand-typed address's, or a command's. Below the boundary the worst case is
 * 8,190 bars; above it every window is one bar per session, and the whole covered
 * calendar is about 1,258 sessions. `time-window.test.ts` asserts that as a
 * property over the calendar rather than restating it here.
 *
 * The user never picks a timeframe, and the reason is not simplicity: five
 * windows × two timeframes is ten combinations of which **three are refused**,
 * and making the cap's refusal the routine outcome of a normal click on a control
 * the product itself drew is the opposite of what that refusal is for.
 */
export function timeframeForSessions(sessions: number): Timeframe {
  return sessions <= MAX_MINUTE_SESSIONS ? "1m" : "1d";
}

/**
 * A session count as the wire's own window form.
 *
 * The named form carries **no instants**, which is what keeps the window off the
 * browser's clock: a browser in Singapore at 09:00 local is on the previous
 * market date in New York, so `sessions=N` goes on the wire and the server
 * resolves it (`bar-series-query.ts`'s header).
 */
export function seriesWindowFor(sessions: number): SeriesWindow {
  return { form: "named", sessions };
}

/**
 * The offered window with this session count, or `undefined` when there is none.
 *
 * **`undefined` is a real answer and the control renders it as no selection**
 * (§4b): the address admits any count the server accepts, and snapping
 * `?sessions=7` to the nearest offered window would rewrite the user's address
 * into a different one and silently answer a different question. What the control
 * shows instead is a readout of the resolved count — `7 SESSIONS` beside five
 * cells with no bar on any of them (§8.4).
 */
export function windowForSessions(sessions: number): TimeWindow | undefined {
  return TIME_WINDOWS.find((window) => window.sessions === sessions);
}

/**
 * A session count in words, or `null` when the number is not a count.
 *
 * **One spelling, three readers** (Task 2.13.7): the control's readout beside
 * the five cells, the rail that names which window is on screen when a newer
 * one has not answered, and whatever Epic 11's `setTimeWindow` reports back.
 * Two of those already existed and said `21 sessions` in two places; the third
 * is what turned a duplication into a defect waiting to happen, because a rail
 * that said `1M` while the readout said `21 sessions` would be two vocabularies
 * for one window on one screen.
 *
 * `null` rather than a sentence, so the caller says what *it* wants to say
 * about a count that is not one — the control says the count is not a session
 * count, and the rail names no number at all. A shared fallback string would be
 * the two surfaces sharing a sentence, which is the defect
 * `SEARCH-AND-SELECTION.md` paid for three times in one afternoon.
 *
 * The test is the same one `use-time-window.ts` applies to the address: a whole
 * number above zero. `NaN`, `0`, `-5` and `3.5` are all real values there and
 * none of them is a count of sessions.
 */
export function describeSessionCount(sessions: number): string | null {
  if (!Number.isInteger(sessions) || sessions <= 0) return null;

  return `${sessions.toLocaleString("en-US")} ${sessions === 1 ? "session" : "sessions"}`;
}

/**
 * A window named as a noun phrase, for a sentence that has to say **which
 * window is on screen** (Task 2.13.7).
 *
 * `the 21-session window`, never `1M`. Three reasons, and the first is the one
 * that decides it: the count is the fact and the label is the approximation —
 * §4(e) — so a sentence that has to be true about the picture says the number
 * the axis is actually divided into. The second is that a window an address
 * named and the control does not offer has **no** label, and a sentence built
 * around one would have to invent it. The third is that the rail sits a few
 * centimetres from a readout already saying `21 SESSIONS`, and two vocabularies
 * for one window on one screen is a reader's problem rather than a writer's.
 *
 * **The absolute form gets no number**, deliberately. Its two instants are a
 * range rather than a count, the panel states that range in full beneath the
 * chart, and a phrase like *the Sep 3 – Sep 8 window* inside a sentence about a
 * different window is two ranges in one line with nothing to tell them apart.
 * *The window asked for* is what is left, and it is true.
 */
export function windowPhrase(window: SeriesWindow): string {
  if (window.form === "absolute") return UNNAMEABLE_WINDOW;
  if (describeSessionCount(window.sessions) === null) return UNNAMEABLE_WINDOW;

  // The **singular** noun, always: `the 21-session window`, not
  // `the 21-sessions window`. An attributive compound does not take a plural in
  // English, which is why this is built from the number rather than from the
  // sentence above it — a phrase assembled by editing that string would read
  // correctly at one and wrongly at every other count.
  return `the ${window.sessions.toLocaleString("en-US")}-session window`;
}

/**
 * What a window is called when it cannot be called a count.
 *
 * Named rather than repeated, because the two branches above reach it for
 * different reasons — an absolute range, and a count that is not one — and a
 * reader comparing them should be able to see that the answer is deliberately
 * the same rather than coincidentally.
 */
const UNNAMEABLE_WINDOW = "the window asked for";
