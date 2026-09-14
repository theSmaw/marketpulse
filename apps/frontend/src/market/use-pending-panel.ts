import { useEffect, useRef, useState } from "react";

// **Whether a wait has gone on long enough to be worth showing** (2026-09-14).
//
// A window change used to leave the previous window's chart on screen, labelled
// by a rail naming which window it belonged to, until the next answer arrived
// (ADR 0028, `CHARTING.md` §6.2). Looked at on a running page that is not what a
// reader gets, because of how fast it is: the rail appears and vanishes inside a
// tenth of a second, so what is on screen is a sentence nobody can read flashing
// over a chart that did not visibly change. §80 records the observation.
//
// So the picture is replaced by a pulsing panel instead — and the whole design
// is in *when*, because a panel that appears for 40 ms is a worse flicker than
// the sentence it replaced.
//
// ## The two numbers, measured rather than argued
//
// `SHOW_AFTER_MS` is above what a window change actually costs, so the ordinary
// case never pulses at all: it swaps one chart for the next, which is ADR 0028's
// intent surviving the reversal. Measured 2026-09-14 against a local pair, three
// runs per window: **2–9 ms warm and 7–68 ms cold** off the backend, against
// `CLAUDE.md`'s recorded 50–66 ms of main thread on a cold security page. 160 ms
// clears the sum with room, and it is what stops the rail flashing rather than
// merely stopping the panel flashing.
//
// `HOLD_FOR_MS` is the other half and it costs something honest: once the panel
// is up it stays up, even if the answer lands immediately after. Without it the
// slow case degrades into exactly the flicker the delay exists to prevent —
// 161 ms of chart, one frame of panel, then the answer. **This delays real data
// by up to 400 ms in a narrow window**, which is the trade, and it is a trade
// rather than free.
//
// ## Why a hook and not a derived value
//
// Nothing in the state says how long a request has been in flight, and nothing
// should: `FRONTEND-STATE.md` §3's rule is that the layer holds answers rather
// than clocks. Elapsed time is genuinely not derivable from anything React
// re-renders on, so this is one of the few honest uses of a timer in an effect —
// and the React Compiler's `set-state-in-effect` rule agrees, because the value
// is not computable from the render's own inputs.

/** How long a wait must last before it is worth drawing. */
export const SHOW_AFTER_MS = 160;

/** And how long the drawing stays once it is up. */
export const HOLD_FOR_MS = 400;

/**
 * `true` once `waiting` has lasted longer than {@link SHOW_AFTER_MS}, and for
 * at least {@link HOLD_FOR_MS} after that.
 *
 * Exported with its two constants so a test can reason in terms of them rather
 * than re-typing 160 — a test that spells the number is a second home for it.
 */
export function usePendingPanel(waiting: boolean): boolean {
  const [showing, setShowing] = useState(false);

  // When the panel went up, so the minimum can be measured from it. A ref rather
  // than state because nothing renders differently for it: it is read only
  // inside the effect that schedules the hide.
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    if (waiting) {
      // Already up — a second `waiting` for the same wait, which happens on any
      // re-render. Leave the clock where it is; restarting it here would make
      // the minimum measure from the last render rather than from the moment a
      // reader first saw something.
      if (shownAt.current !== null) return undefined;

      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setShowing(true);
      }, SHOW_AFTER_MS);

      // The fast case, and the reason nothing flashes: the answer arrived before
      // the timer fired, so it is cleared and the panel was never shown.
      return () => {
        clearTimeout(timer);
      };
    }

    if (shownAt.current === null) {
      // Never shown, so there is nothing to take down. Not an early return
      // above, because `showing` can still be true for one render between the
      // hide timer firing and this effect running.
      return undefined;
    }

    const remaining = shownAt.current + HOLD_FOR_MS - Date.now();

    if (remaining <= 0) {
      shownAt.current = null;
      setShowing(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      shownAt.current = null;
      setShowing(false);
    }, remaining);

    return () => {
      clearTimeout(timer);
    };
  }, [waiting]);

  return showing;
}
