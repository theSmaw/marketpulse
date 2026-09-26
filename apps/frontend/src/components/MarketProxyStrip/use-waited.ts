import { useEffect, useState } from "react";

// **Whether a wait has gone on long enough to stop looking like a wait**
// (Task 4.2.5).
//
// The mirror of `use-pending-panel.ts`, and it exists for the opposite reason.
// That hook keeps a *pending* treatment off the screen until a wait is long
// enough to be worth drawing. This one keeps a *terminal* sentence off the
// screen until a wait is long enough that calling it terminal is honest.
//
// ## What it is for, which is a state that had no floor
//
// `MarketProxyStrip` draws a reserved, empty box before its first overview
// frame. That is right for the case it was written against — the gateway sends
// an overview inside the upgrade handler, so an ordinary connect answers in one
// round trip. It is **wrong for the case that actually produces it in the
// field**: an unreachable backend, a proxy blocking the socket, the deploy
// window. `overview` is only ever written by an overview frame, so when none
// arrives the reserved box is not a flash — it is the **terminal** state, and
// the region sits there at its full height with its heading and nothing in it
// while the six regions below each say what they are waiting for.
//
// That is `docs/GAPS.md` entry 13 exactly: *a region whose content is
// legitimately conditional looks identical to one whose content silently
// disappeared*. Its owner is a condition — the next story that adds a region —
// and this is that story.
//
// ## The number, measured rather than argued
//
// Time from navigation to the first overview frame painting a figure, against a
// local pair, five runs, 2026-09-26: **277, 174, 182, 193, 184 ms**. The floor
// is an order of magnitude above the slowest of those, so the ordinary case
// never shows the sentence at all — and it is short enough that a reader
// looking at an empty box gets an answer before they conclude the page is
// broken.
//
// There is no hold, unlike `usePendingPanel`. The flicker that one guards
// against is a treatment coming *and going*; this one is replaced by figures
// and never by itself.

/** How long nothing may arrive before the strip says so. */
export const SAY_NOTHING_ARRIVED_AFTER_MS = 2_000;

/**
 * `true` once `waiting` has been continuously true for longer than
 * {@link SAY_NOTHING_ARRIVED_AFTER_MS}.
 *
 * Exported with its constant so a test can reason in terms of it rather than
 * re-typing 2000 — a test that spells the number is a second home for it.
 *
 * **A timer in an effect is honest here** for `usePendingPanel`'s recorded
 * reason: nothing in the state says how long a wait has lasted, and nothing
 * should (`FRONTEND-STATE.md` §3 — the layer holds answers rather than clocks).
 * Elapsed time is genuinely not derivable from anything React re-renders on.
 *
 * The React Compiler still had something to say, and it was right: the first
 * version reset the flag with a bare `setWaited(false)` in the effect body and
 * `set-state-in-effect` refused it, because *that* half **is** derivable from
 * `waiting`. See the comment on the cleanup.
 */
export function useWaited(waiting: boolean): boolean {
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    if (!waiting) return undefined;

    const timer = setTimeout(() => {
      setWaited(true);
    }, SAY_NOTHING_ARRIVED_AFTER_MS);

    // **The reset is in the cleanup rather than in the body**, and the React
    // Compiler is what moved it there: a bare `setWaited(false)` in the
    // not-waiting branch is `set-state-in-effect`, and the rule is right — that
    // value is derivable from `waiting`, which the return below already does.
    //
    // What is *not* derivable is that a second empty period must start its own
    // clock rather than inheriting a spent one, and the cleanup is exactly the
    // edge that says so. Nothing produces that sequence today, because
    // `overview` holds its last value through a disconnection; it is here so
    // that the day something does, the sentence does not appear instantly.
    return () => {
      clearTimeout(timer);
      setWaited(false);
    };
  }, [waiting]);

  return waiting && waited;
}
