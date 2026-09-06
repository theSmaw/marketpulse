import type { MarketSessionState, MarketWallClock } from "@marketpulse/shared";
import {
  MarketCalendarRangeError,
  marketSessionStateAt,
  marketWallClockAt,
} from "@marketpulse/shared";
import { useEffect, useMemo, useState } from "react";

// **The one module in this application that reads the wall clock**, and the
// seam Epic 13 substitutes a replay clock into (Task 2.5.5).
//
// ## The seam is an absence, and this is the module the absence is measured
// against
//
// `CALENDAR.md` §3 is the section Epic 13 reads and its rule is one sentence:
// *every function in Story 2.5 takes the instant it needs as an argument, and
// exactly one module reads the wall clock.* `packages/shared`'s three market
// modules hold the first half — `marketWallClockAt`, `marketSessionStateAt`,
// `lastMarketSessions` and the rest are all pure functions of an instant, so
// they are **already** replay-ready and there is no `Clock` interface to inject
// anywhere. This module holds the second half by being the only place a
// zero-argument `new Date()` appears on a path that reaches the market.
//
// That is this repository's established shape for the fourth time:
// `securities.ts` holds Epic 13's *query* seam by not exporting its `Kysely`
// handle, `api-client.ts` holds the transport rule by being the only file that
// calls `fetch`, and `market-time.ts` holds the conversion boundary by being
// the only file that constructs an `Intl.DateTimeFormat`. The last of those is
// enforced by `eslint.config.mjs`; so, now, is half of this one — see the
// paragraph on the `Date.now()` rule below.
//
// **What Epic 13 replaces is this hook and nothing else.** A replay clock is a
// different implementation of `useMarketClock` reading the scrubber's position
// instead of the system clock; every consumer below it is untouched, because
// none of them knows what time it is. What that does *not* buy is temporal
// isolation on **queries** — a correct instant handed to a query that ignores
// it leaks the future just as thoroughly. The two seams are independent and
// `CALENDAR.md` §3.3 says so.
//
// ## Why the `Date.now()` lint rule landed where it did
//
// `CALENDAR.md` §3.4 asked this task to write the rule in the same change that
// creates this module, on the grounds that the rule previously had nothing to
// permit. It is written, and it is scoped to **`packages/shared/src` with no
// exception at all** rather than to the whole workspace with this file excepted.
//
// That is the stronger rule rather than the weaker one, and the reason is where
// the damage would be. A clock read inside a session function is the failure
// invariant 4 names by name — it would make replay a rewrite of every call site
// rather than of this file — and `packages/shared` is where every one of those
// functions lives, so a rule that permits nothing there says exactly the thing
// that matters. Scoping it to `apps/frontend` as well would need **two**
// exceptions, not one: `use-backend-health.ts` stamps `new Date()` for "when
// this client last got an answer", which is a genuine second clock read and a
// legitimate one, because it is a diagnostic about *this browser* and has
// nothing to do with market time. A rule with two exceptions is weaker than the
// sentence it is trying to hold, so the frontend half stays prose — this
// comment — and joins `CLAUDE.md`'s third kind of gap.

/**
 * What the clock currently reads, in market terms.
 *
 * Three fields rather than one, because they fail independently and the whole
 * point of the degradation below is that **two of them survive when the third
 * does not**.
 */
export interface MarketClockReading {
  /** The instant this reading was taken. */
  readonly instant: Date;

  /**
   * That instant on the market's wall clock. A pure timezone conversion, so it
   * is correct for any instant the runtime's timezone database covers — which
   * is to say, it never runs out the way {@link session} does.
   */
  readonly time: MarketWallClock;

  /**
   * What the market was doing at that instant, or `null` when the trading
   * calendar cannot say.
   *
   * **`null` means "declines to claim", never "closed".** It is what an instant
   * outside `MARKET_CALENDAR_RANGE` produces, which from 2029-01-01 is every
   * instant. See {@link readMarketClock} for why that is a caught error rather
   * than a thrown one, and `MarketClock` for what it renders.
   */
  readonly session: MarketSessionState | null;
}

/**
 * Read the market clock at a given instant. Pure, and exported for that reason.
 *
 * Everything interesting about this module except the timer is here, and it is
 * a pure function of its argument — so the out-of-range degradation below is
 * testable by **passing an instant in 2029**, with no fake timers, no clock
 * mocking and no waiting. That is the seam paying for itself the first time it
 * is used.
 *
 * ## The `catch` is one line wide and typed, and both halves are deliberate
 *
 * The trading calendar covers 2024–2028 and **refuses** an instant outside it
 * rather than answering "no holidays that year" — Story 2.5's acceptance
 * criterion 4, and a refusal `market-calendar.ts` deliberately gives no flag to
 * turn off. Every other consumer of the calendar is handed a date by a user or
 * a query and can decline it. **This one reads the system clock, so its input is
 * always today**, and on 2029-01-01 the calendar throws at it.
 *
 * Left to propagate, that throw lands in a React render, the chrome's
 * `ErrorBoundary` catches it, and **the entire header is replaced by a fallback
 * on every route** — on New Year's Day, for a reason nobody debugging it at the
 * time would guess. So it is caught here, and what makes catching cheap rather
 * than a compromise is that the two facts come from different places: the
 * **time** is a timezone conversion that works forever, and only the **session
 * state** needs the calendar. A clock that shows the time and says it does not
 * know whether the market is open is honest, is PRODUCT_SPEC.md §36's
 * degrade-locally rule applied, and is strictly better than either a blank
 * header or a confident guess.
 *
 * **`MarketCalendarRangeError` by type, and anything else rethrown.** A bare
 * `catch` here would also swallow a `MarketTimeError` and any genuine bug in the
 * session functions, which would turn "the header degraded honestly" into "the
 * header hides faults" — the one failure mode a green screen cannot be
 * distinguished from.
 *
 * The throw comes from exactly **one** call, so the `try` wraps one line rather
 * than the render.
 */
export function readMarketClock(instant: Date): MarketClockReading {
  let session: MarketSessionState | null;

  try {
    session = marketSessionStateAt(instant);
  } catch (error) {
    if (!(error instanceof MarketCalendarRangeError)) throw error;
    session = null;
  }

  return { instant, time: marketWallClockAt(instant), session };
}

/**
 * The system clock, as a module constant rather than an inline default.
 *
 * A default written `options.now ?? (() => new Date())` builds a **new function
 * on every render**, which would go into the effect's dependency array and tear
 * the timer down and back up sixty times a minute. Hoisting it makes the
 * default referentially stable, so a caller that passes nothing has a
 * dependency array that never changes.
 */
const systemNow = (): Date => new Date();

/** How long until the next whole second, from an instant. */
function msToNextSecond(instant: Date): number {
  return 1000 - (instant.getTime() % 1000);
}

export interface UseMarketClockOptions {
  /**
   * Where "now" comes from. Defaults to the system clock.
   *
   * It exists for the reason `loadConfig(env)` takes an argument and
   * `useBackendHealth` takes an interval: a value that can only be varied by
   * editing the module is a value no test can exercise. **It is not a `Clock`
   * interface threaded through the domain** — `CALENDAR.md` §3.2 rejects that
   * explicitly, and rightly, because every function below this one is already
   * substitutable by being pure. This is one optional argument, on the one
   * module that reads a clock, which is precisely where a substitution seam
   * belongs.
   */
  readonly now?: () => Date;
}

/**
 * The market clock, ticking on the second.
 *
 * ## The state stays here rather than in `App`, and the trigger for that fired
 *
 * Task 1.12.5 accepted a whole-tree re-render on every backend health poll,
 * with the measurement beside it — 2 renders a minute, zero `longtask` entries,
 * zero header DOM mutations — and recorded the reversal trigger in the same
 * breath: *"a second consumer, or a render rate that is no longer a poll"*.
 *
 * **A 1 Hz clock is sixty times that rate and it mutates the DOM on every
 * single tick**, so the trigger has fired and repeating the accepted-re-render
 * argument at a rate it was never measured at would be citing a measurement
 * rather than taking one. Lifting this into `App` would re-render `AppHeader`,
 * `<Routes>`, the current route, all four `Region`s and the landing route's
 * 36-row table once a second, for a text node in the chrome.
 *
 * So this hook is called from **`AppHeader`**, which is rendered exactly once,
 * outside `<Routes>`, and the tick reaches the header's own subtree and stops
 * there. That looks like a departure from `AppHeaderProps`' four-props rule and
 * is not: that rule is about a component acquiring a dependency on a **network
 * loop** — state, failure states, an `AbortController`, a thing a story would
 * have to construct. This hook makes no request and has no failure states, and
 * the component it feeds (`MarketClock`) stays presentational so all of its
 * renderings are still reviewable in the workshop.
 *
 * ## It schedules to the second boundary, not every 1000 ms
 *
 * `setInterval(…, 1000)` drifts: each tick is scheduled 1000 ms after the
 * *callback ran* rather than after the second changed, so the displayed second
 * slides against the real one and visibly skips one every minute or so — on the
 * one component in this product whose whole job is to be right about the time.
 * Scheduling to `msToNextSecond` re-anchors on every tick, and it is also what
 * makes a returning hidden tab correct for free.
 *
 * ## A hidden tab does not tick, and a returning one is correct immediately
 *
 * The same two decisions `useBackendHealth` took, and they must not be re-taken
 * differently in the same chrome. A background tab re-rendering once a second
 * forever is work nobody is looking at, multiplied by every tab a user forgot;
 * and a tab that resumes on its old schedule shows a time that is up to a
 * second stale, which on a clock is the one thing it must never be. So the
 * timer stops on `visibilitychange` to hidden, and becoming visible reads the
 * clock **immediately** and re-anchors.
 *
 * What is *not* shared is the reason: `useBackendHealth` stops a hidden tab
 * because a poll costs a request and a billed byte, and this stops one because
 * a tick costs a render. Neither has a failure to preserve across the gap.
 */
export function useMarketClock(
  options: UseMarketClockOptions = {},
): MarketClockReading {
  const now = options.now ?? systemNow;

  // Seeded from the clock rather than from a placeholder, so the first paint
  // is a real time. There is no "not yet read" state here and deliberately no
  // equivalent of `BackendIndicator`'s `checking` placeholder: reading a clock
  // is synchronous and cannot fail, so a moment where the answer is unknown
  // does not exist.
  const [instant, setInstant] = useState<Date>(now);

  useEffect(() => {
    let timer: number | undefined;

    const clearPending = (): void => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    };

    const isHidden = (): boolean => document.visibilityState === "hidden";

    const schedule = (from: Date): void => {
      clearPending();
      if (isHidden()) return;
      timer = window.setTimeout(() => {
        tick();
      }, msToNextSecond(from));
    };

    const tick = (): void => {
      const next = now();
      setInstant(next);
      schedule(next);
    };

    const onVisibilityChange = (): void => {
      if (isHidden()) {
        clearPending();
        return;
      }

      // Catch up rather than resume. Whatever is on screen was written before
      // the tab was hidden and is arbitrarily old.
      tick();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    // Anchored on a fresh read rather than on the state's `instant`, and that
    // is what keeps `instant` out of this effect's dependency array. Listing it
    // would tear the listener down and rebuild it on every tick — sixty times a
    // minute — to compute a boundary the loop already re-anchors from inside
    // itself. The two values differ by the microseconds between the render and
    // the effect, which cannot move a millisecond boundary that is up to a
    // second away.
    schedule(now());

    return () => {
      clearPending();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [now]);

  // Two conversions and a calendar lookup per tick, so they are memoised on the
  // instant rather than recomputed on every render of the header — which
  // re-renders for its two indicators as well as for this.
  return useMemo(() => readMarketClock(instant), [instant]);
}
