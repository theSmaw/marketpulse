import type { MarketSessionState } from "@marketpulse/shared";
import { MARKET_CALENDAR_RANGE, marketWallClockAt } from "@marketpulse/shared";

import { cx } from "../../cx.js";
import type { MarketClockReading } from "../../use-market-clock.js";
import { Marker } from "../Marker/Marker.js";
import type { MarkerShape } from "../Marker/Marker.js";
import styles from "./MarketClock.module.css";

// The market clock, and the first thing on this product's screen that is
// **alive** in PRODUCT_SPEC.md §5.6's sense (Task 2.5.5).
//
// PRODUCT_SPEC.md §9's sketch has carried `10:42:16 ET` in the header since the
// first line of this repository, and `AppHeader` has reserved the space for it
// since Story 1.5 with a `--:--:--` placeholder that deliberately did not lie.
// Everything behind it was built by Tasks 2.5.2 to 2.5.4; this puts it on
// screen.
//
// ## Presentational, and the hook is `AppHeader`'s
//
// It takes a `MarketClockReading` and renders it. It reads no clock, sets no
// timer and holds no state, which is what lets the workshop review all six of
// its renderings side by side — two of them (a holiday, and an instant past the
// calendar's range) being states a browser cannot be put into without waiting
// years. That is `UniverseTable`'s arrangement exactly: the container owns the
// call site and the component owns the renderings.
//
// ## It says what time it is and whether the market is open, and nothing more
//
// **Nothing here reads as `LIVE`.** §9's sketch shows that word beside the
// clock and it belongs to Epic 3: it is a claim that data is *arriving*, which
// is a fact about the feed and not about the calendar. Putting it here would be
// the first thing in this product to overstate its own evidence, which is
// exactly what invariant 6 and §35 exist to prevent. The `Market feed` region
// two cells to the left is where that claim will go, and it currently and
// correctly reads `DISCONNECTED`.
//
// ## The viewer's clock, rendered in market time — which is a timezone claim
// and not a synchronisation one
//
// This is the browser's own clock converted to `America/New_York`. A viewer's
// machine can be wrong by minutes, and a market clock that disagrees with the
// market is worse than no clock at all — so it is worth being precise about
// what is and is not being asserted here. **The timezone is right; the instant
// is the viewer's.** Nothing in this application currently has a better source:
// the backend's `/health` carries an uptime and no wall clock, and adding one
// would be inventing a time authority for a header.
//
// Epic 3 is where a server-supplied time becomes available honestly, because a
// market feed carries exchange timestamps — at which point this component is
// unchanged and the *reading* comes from somewhere else, which is the same
// substitution Epic 13's replay clock makes. Both are changes to
// `useMarketClock` and to nothing below it.
//
// ## `ET` rather than `EDT`/`EST`, decided rather than defaulted
//
// `marketOffsetAt()` reports what is actually in effect — `EDT` in summer,
// `EST` in winter — and it is deliberately not rendered. Three reasons, in
// order of weight.
//
//  1. **`ET` is what the product has always promised.** §9's sketch reads
//     `10:42:16 ET` and the placeholder this replaces read `--:--:-- ET`.
//  2. **It is fixed width and never lies.** `EDT` and `EST` are the same width
//     as each other but the pair *changes twice a year*, which is a change a
//     reader notices in a status strip and cannot explain — and being more
//     precise about a fact nobody asked about is not a service. `ET` is the
//     generic name for the pair and is true on both sides of the transition.
//  3. **It is what a trader says.** "The market opens 9:30 ET" is the sentence;
//     nobody says "9:30 EDT".
//
// The third option — rendering the offset, `-04:00` — is precise, unreadable at
// a glance, and not what anybody calls it. The abbreviation stays available on
// `MarketOffset` for a chart axis and a log line, where the exact offset is the
// point.
//
// ## Not a live region, and that is the same decision `BackendIndicator` took
//
// A `role="status"` announcing the time every second is unusable with a screen
// reader, and that much is not a judgement call. The session *state* changing is
// arguably worth announcing and is deliberately not announced either, for
// `BackendIndicator`'s recorded reason: the most common transition a live region
// would fire on is the **mount**, so every page load and every client-side
// navigation would announce "market closed" — noise about arriving at a page
// rather than news about the market. The two live regions this application does
// have — `UniverseTable`'s and `BarSeriesPanel`'s — both belong to a subject
// whose content changes over the network, which a wall clock's does not.
//
// The reversal trigger is a page a user keeps open across an actual bell, which
// is Epic 3's — at which point 09:29:59 → 09:30:00 is genuinely news and the
// announcement is of the *state*, never of the time.

export interface MarketClockProps {
  /** Straight from `useMarketClock()`. */
  readonly reading: MarketClockReading;
}

/**
 * The word under the marker. Four renderings collapse onto three words, and
 * both collapses are decisions.
 *
 * `before_open`, `after_close`, `holiday` and `weekend` are four
 * `MarketSessionState` members that all mean **the market is not trading**, so
 * they share the word `closed` and differ in the sentence below it — which is
 * `BackendIndicator`'s `degraded` shape exactly, where two causes share a word
 * and select different sentences. A union member silently rendered identically
 * to another would be the boolean `MarketSessionState` was built to replace;
 * these are rendered identically at the *word* and distinguishably at the
 * sentence, which is the difference.
 *
 * `unknown` is not a `MarketSessionStatus` member and must not become one. It is
 * what a clock past the trading calendar renders — a fact about our own data
 * running out, not about the market — which is why it is a `null` session here
 * and a boolean beside a status there.
 */
const SESSION_WORD = "closed";

/**
 * One rendering of one reading: the word, the sentence and the silhouette.
 *
 * All three keyed off the same `session === null` question in one place rather
 * than in three parallel ternaries — because the three have to agree, and three
 * copies of a condition is how they come to disagree. The `unknown` case in
 * particular is a **set**: a dashed marker with the word `closed` under it would
 * be a confident claim wearing a placeholder's silhouette.
 */
function render(session: MarketSessionState | null): {
  readonly word: string;
  readonly detail: string;
  readonly className: string | undefined;
  readonly shape: MarkerShape;
} {
  if (session === null) {
    return {
      word: "unknown",
      // Names the fact and the date, because "unknown" alone is
      // indistinguishable from a broken clock — and because this sentence is
      // the only thing in the running product that will ever tell anybody that
      // `MARKET_CALENDAR_PROVENANCE.nextEditDue` came and went. The date is read
      // from the range rather than written out, so extending the calendar
      // corrects this line for free.
      detail: `Trading calendar ends ${MARKET_CALENDAR_RANGE.lastDate}`,
      className: styles.unknown,
      // `dashed` reads as "not yet" rather than as a state, which is exactly
      // what this rendering is — `BackendIndicator`'s `checking` placeholder
      // uses it for the same reason.
      shape: "dashed",
    };
  }

  if (session.status === "open") {
    return {
      word: "open",
      detail: sessionDetail(session),
      className: styles.open,
      shape: "disc",
    };
  }

  return {
    word: SESSION_WORD,
    detail: sessionDetail(session),
    className: styles.closed,
    // Hollow, and the same colour as `open`. The shape is the whole difference,
    // which is what survives greyscale.
    shape: "ring",
  };
}

/**
 * The sentence under the word, and the whole reason `MarketSessionState` is a
 * union rather than a boolean.
 *
 * Each case says something the others cannot, and the two that a boolean would
 * throw away are the interesting ones: the name of a closure, and the fact that
 * today is a half day. Note what none of them does — read the calendar. Every
 * fact here is already on the state `marketSessionStateAt` returned, which is
 * what keeps this component to **one** call site that can throw the range error
 * rather than two.
 */
function sessionDetail(state: MarketSessionState): string {
  switch (state.status) {
    case "open":
      return state.session.isEarlyClose
        ? `Closes early at ${formatTimeOfDay(state.session.close)}`
        : `Closes at ${formatTimeOfDay(state.session.close)}`;

    case "before_open":
      return state.session.isEarlyClose
        ? `Opens at ${formatTimeOfDay(state.session.open)}, closing early at ${formatTimeOfDay(state.session.close)}`
        : `Opens at ${formatTimeOfDay(state.session.open)}`;

    case "after_close":
      return state.session.isEarlyClose
        ? `Closed early at ${formatTimeOfDay(state.session.close)}`
        : `Closed at ${formatTimeOfDay(state.session.close)}`;

    // The calendar's own name, rendered whole. **A template of the shape
    // "Closed for the holiday: X" is wrong** and the row that proves it is real
    // and in range: `2025-01-09` is a `National Day of Mourning (President
    // Carter)`, which is not a holiday, is not annual and is not short. The
    // word above already says "closed", so the name stands alone underneath it
    // — which is `Closed — X` split across the two elements the indicator
    // language already has. That the calendar was read off a published record
    // rather than derived from rules is what makes this a name worth rendering
    // at all.
    case "holiday":
      return state.name;

    // Nothing else to say, and nothing invented to fill the line. The day of
    // the week is on the reader's own calendar.
    case "weekend":
      return "Weekend";
  }
}

/**
 * `HH:MM` for a session bound, in **market** time.
 *
 * A session's `open` and `close` are *instants*, not wall-clock parts — that is
 * the whole point of `MarketSession` — so they go back through the conversion
 * boundary to be displayed. Reaching for `Date#getHours()` here is the mistake
 * this story exists to prevent: it would render a 16:00 ET close as whatever
 * 16:00 ET is on the **viewer's** machine, which on the browser this was last
 * measured in is 04:00 the following morning.
 *
 * Hand-formatted rather than `toLocaleTimeString`, which is Task 1.12.4's idiom
 * and its reason applies with more force here: a locale-dependent string changes
 * width when a meridiem comes and goes, `tabular-nums` cannot fix that, and this
 * strip already holds a value that changes every second.
 */
function formatTimeOfDay(instant: Date): string {
  const wall = marketWallClockAt(instant);
  return `${pad(wall.hour)}:${pad(wall.minute)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function MarketClock({ reading }: MarketClockProps) {
  const { time, session } = reading;
  const clock = `${pad(time.hour)}:${pad(time.minute)}:${pad(time.second)}`;
  const { word, detail, className, shape } = render(session);

  return (
    <div className={styles.clock}>
      <p className={styles.time}>
        {/* The accessible name for the figure, and the reason the `ET` beside
            it is `aria-hidden`: read aloud, "ET" is two letters rather than a
            timezone. A screen reader hears "Market time, US Eastern
            09:42:16"; the eye reads "09:42:16 ET". Same fact, said in the
            register each channel understands. */}
        <span className={styles.visuallyHidden}>Market time, US Eastern </span>
        <span>{clock}</span>{" "}
        <span aria-hidden="true" className={styles.zone}>
          ET
        </span>
      </p>

      {/* The marker and the word are their own row, and the sentence is a
          sibling rather than a third grid cell spanning it. That is forced
          rather than tidy — see the stylesheet: a spanning item inflates the
          columns it spans, so the two indicators' grid arrangement puts the
          marker a centimetre from its word on the longest sentence this
          renders. Caught in the workshop, on the one permutation the running
          application cannot be put into on an ordinary day. */}
      <span className={cx(styles.state, className)}>
        <Marker shape={shape} />
        <span className={styles.label}>{word}</span>
      </span>
      <span className={styles.detail}>{detail}</span>
    </div>
  );
}
