import type { KeyboardEvent } from "react";
import { useId, useRef } from "react";

import type { TimeWindow } from "../../market/index.js";
import {
  TIME_WINDOWS,
  describeSessionCount,
  windowForSessions,
} from "../../market/index.js";
import { cx } from "../../cx.js";
import styles from "./TimeWindowControl.module.css";

// **The control that changes what the data says** (Task 2.13.6) — the first one
// in MarketPulse that does, as opposed to changing how something is drawn.
//
// `VOLUME-AND-WINDOW.md` §8 is the drawing and §4 is the vocabulary; what is
// decided **here** is the one thing the canvas deliberately left open — the ARIA
// pattern — plus the two things implementing it corrected. Everything visual
// below is read off that document rather than chosen.
//
// ## Its props are the vocabulary of a window, not of this page
//
// A list, a current value, a change callback, and nothing about `useBarSeries`,
// the address or a security. That is not tidiness: Epic 8 reuses this for
// comparison views and Epic 11 drives it with `setTimeWindow`, so a prop named
// after this screen is a prop both of those have to work around. The component
// does not know that its change writes a URL.
//
// ## The ARIA pattern: a radio group with **manual** activation
//
// `role="radiogroup"` with five `role="radio"` cells is what this control *is* —
// a closed set of mutually exclusive options — so the semantics are not in
// question. What was open is whether selection follows focus, and the answer is
// **no**, deliberately, against the APG's default for radios:
//
//  - **Arrow keys move focus. `Space` or `Enter` commits.** One press is one
//    window is one request is one history entry.
//  - Selection following focus would make arrowing from `1D` to `1Y` four
//    window changes: four requests of up to 154 kB, four addresses pushed into
//    the browser's history, and four answers announced. That is the "expensive
//    or disruptive commit" case the APG's own guidance on automatic selection
//    names, and it is the one this control is in. A mouse user spends one click;
//    a keyboard user should not spend four addresses.
//  - It costs the thing worth naming: a keyboard user arrows to `1Y` and the
//    chart does not move until they press. What tells them so is the radio
//    itself — *"1 year, radio button, not checked, 5 of 5"* — which is the
//    standard mental model for a radio and the reason this pattern was chosen
//    over a `toolbar` of toggle buttons, where nothing in the announcement says
//    a press is pending.
//
// **There is one tab stop for the five cells** (`tabIndex` below), and it is
// held by the **checked** cell rather than by the last one focused. So tabbing
// out of a half-arrowed control and back returns to the window actually on
// screen, rather than to a cell somebody walked past — and that fell out of
// having no state at all rather than being arranged.
//
// ## There is no state in this component, and that is load-bearing
//
// The selected cell is a pure function of the `sessions` prop, which comes from
// the address. So the selection moves **in the frame the press lands**
// (§14.1) — there is nothing to wait for, no pending flag, no spinner and no
// disabled window, and the control cannot end up contradicting the chart,
// because both are built from the same address. The arrow keys move DOM focus
// through a ref rather than through a `focusedIndex` state, which is what keeps
// that true and keeps the React Compiler's `set-state-in-effect` and `refs`
// rules out of it.
//
// ## Two things implementing it corrected, both recorded on the canvas
//
//  1. **The focus ring is on the cell, not on the group.** The canvas drew it
//     around the bordered box, which is correct for a control with one
//     focusable thing in it and wrong for this one: with manual activation,
//     focus moves between five cells and the ring is the only thing saying
//     which one `Space` will commit. A ring around the group would name the
//     control and hide the target. It is therefore the ordinary global
//     `:focus-visible` rule doing its job, and `a11y.module.css`'s
//     `focusRingHost` idiom — written with this control named as its second
//     consumer — is **not** needed here.
//  2. **The readout is the group's description.** It was drawn as a static
//     micro-label beside the box, which is what it looks like; what was not
//     decided is whether a listener gets it. They do, through
//     `aria-describedby`, because the sentence *"nothing is selected because the
//     address asked for seven sessions"* is exactly the fact a listener needs
//     on arrival and the one the eye gets for free from the two sitting side by
//     side.

export interface TimeWindowControlProps {
  /**
   * The windows to offer, in the order they are shown.
   *
   * Defaults to all five (`TIME_WINDOWS`). A prop rather than a constant read
   * inside, because Epic 8's comparison views may offer fewer — and because a
   * story can then show a set this product does not ship without the component
   * learning about stories.
   */
  readonly windows?: readonly TimeWindow[];

  /**
   * The session count **on screen**, resolved from the address.
   *
   * A count and not a window, which is §4(b) in the type: the address admits any
   * count the server accepts, so a value that is none of the five is a routine
   * input rather than an error. It renders as no selection beside a readout
   * saying what the count is — never as the nearest window, because snapping
   * would answer a question nobody asked.
   *
   * `NaN` is a real value here and means *the address named something that is
   * not a count at all*. The control shows no selection and the readout says so;
   * the refusal a reader acts on comes from the server, which names what was
   * asked.
   */
  readonly sessions: number;

  /**
   * Change the window. Called with the new session count.
   *
   * Never called with the count already on screen: pressing the cell that is
   * already checked is a no-op, because the alternative is a history entry and
   * a request that change nothing a reader can see.
   */
  readonly onChange: (sessions: number) => void;
}

export function TimeWindowControl({
  windows = TIME_WINDOWS,
  sessions,
  onChange,
}: TimeWindowControlProps) {
  const readoutId = useId();
  // One ref for the row of cells, read only inside a key handler. Not state: see
  // the header — the whole selection is a function of the `sessions` prop, and a
  // focused index held here would be a second, disagreeing copy of where focus
  // actually is.
  const cells = useRef<(HTMLButtonElement | null)[]>([]);

  const selected = windowForSessions(sessions);

  function focusCell(index: number) {
    // Wrapping rather than clamping, which is the APG's radio-group behaviour
    // and the one a person operating a five-cell control actually expects: the
    // set is a ring, and `1Y` → `→` → `1D` is shorter than five presses back.
    const count = windows.length;
    cells.current[((index % count) + count) % count]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        focusCell(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        focusCell(index - 1);
        break;
      case "Home":
        focusCell(0);
        break;
      case "End":
        focusCell(windows.length - 1);
        break;
      default:
        // Every other key, `Tab` and `Space` included, is the browser's. A
        // handler that swallowed `Tab` would take the one stop out of the tab
        // order it is in.
        return;
    }

    // Only for the five keys above, and only after one of them matched: the
    // arrows scroll a page and `Home` jumps it, which on a control inside a
    // `Region` that declares `overflow: auto` would scroll the panel under the
    // reader's hand.
    event.preventDefault();
  }

  return (
    <div className={styles.control}>
      <div
        aria-describedby={readoutId}
        aria-label="Time window"
        className={styles.group}
        role="radiogroup"
      >
        {windows.map((window, index) => {
          const checked = window.sessions === sessions;

          return (
            <button
              aria-checked={checked}
              className={cx(styles.cell, checked ? styles.checked : undefined)}
              key={window.label}
              onClick={() => {
                if (!checked) onChange(window.sessions);
              }}
              onKeyDown={(event) => {
                onKeyDown(event, index);
              }}
              ref={(element) => {
                cells.current[index] = element;
              }}
              role="radio"
              // The roving stop, and it is derived rather than held. The checked
              // cell owns it; with nothing checked — `?sessions=7` — the first
              // cell does, so the control is always reachable in one press and
              // never traps five.
              tabIndex={
                (selected === undefined ? index === 0 : checked) ? 0 : -1
              }
              type="button"
            >
              {/*
               * **The abbreviation for the eye and the spelled-out name for the
               * ear** (§4d). `1D` is the analyst-tool convention and five
               * spelled-out words in a row is a paragraph rather than a control;
               * "one dee" is not a window. Both come off `TIME_WINDOWS` rather
               * than being written here, so the control, the address and the
               * chart's spoken description cannot learn different names for one
               * window.
               */}
              <span aria-hidden="true">{window.label}</span>
              <span className={styles.name}>{window.name}</span>
            </button>
          );
        })}
      </div>

      {/*
       * **The readout, outside the box** (§8.3, §8.4) — the resolved session
       * count of whatever is on screen, in the micro-label idiom the status
       * strip already uses for the market feed.
       *
       * It is what makes "nothing selected" an ordinary state rather than a
       * sixth one to draw: five cells with no bar read as broken, and five cells
       * beside `7 SESSIONS` read as a product that understood the address. It is
       * also §4(e) made visible — **the label says the approximation and this
       * says the fact** — and it is the only place on screen that says `1M` means
       * twenty-one trading sessions, which is the number the axis is divided into
       * and the number the chart's description speaks aloud.
       *
       * Static, never focusable, never a button. Drawn inside the box first, as
       * a sixth cell, where it read as a sixth *button* and competed with hover
       * for the one ground a cell can take.
       */}
      <span className={styles.readout} id={readoutId}>
        {readoutText(sessions)}
      </span>
    </div>
  );
}

/**
 * What the readout says.
 *
 * Two forms and not one, which is a departure from the canvas's `N SESSIONS` and
 * is forced by the same decision the canvas took: if the address admits any
 * count the server accepts, it also admits `?sessions=abc`. `NaN SESSIONS` is
 * the kind of figure this product must never print, and the honest alternative
 * is to say what is wrong with it rather than to guess a number.
 *
 * It deliberately does not *explain* — the sentence a reader acts on is the
 * server's refusal, which names exactly what was asked for, and a second
 * explanation beside the control would be the two-surfaces-one-failure defect
 * `SEARCH-AND-SELECTION.md` paid for three times in one afternoon.
 */
export function readoutText(sessions: number): string {
  // **The count itself is `time-window.ts`'s spelling since Task 2.13.7**, and
  // that is a repair rather than a tidy-up: the rail that names which window is
  // on screen when a newer one has not answered says the same number a few
  // centimetres from here, and two surfaces spelling one window two ways is a
  // reader's problem. What stays here is the **fallback**, deliberately — the
  // sentence a surface says about a count that is not one is that surface's own,
  // and a shared one would be the two-surfaces-one-sentence defect.
  return describeSessionCount(sessions) ?? "not a session count";
}
