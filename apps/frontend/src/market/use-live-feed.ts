import { useEffect, useRef, useState } from "react";

import { reportUnreadableMessage } from "../report-error.js";
import {
  type LiveFeedView,
  advanceLiveFeed,
  firstUnreadable,
  liveFeedView,
  sameLiveFeedView,
  startedLiveFeed,
} from "./live-feed.js";
import { connectMarketStream } from "./market-stream-client.js";
import { reconnectDelayMs } from "./reconnect-policy.js";
import type { MarketStreamOptions } from "./market-stream-client.js";

// The live feed, as one hook (Task 3.3.4).
//
// **Nothing consumes it yet.** Task 3.3.5 puts it in the chrome, from **one**
// call in `AppHeader` rather than in `App` — measured rather than argued:
// lifting `useMarketClock` to `App` re-rendered the landing route **40 times in
// 20 s against 0**.
//
// ## Why the connection is a ref and only the VIEW is state
//
// The connection changes on **every** message, because `lastInboundAt` is what
// the 165 s watchdog reads. The view changes only when something a person would
// see changes. Holding the connection in state would make Task 3.3.2's 120 s
// keepalive re-render the application thirty times an hour to redraw an
// identical word — the shape of defect that produced the 40 renders above, at a
// lower rate.
//
// So: the connection lives in a ref, the derived view lives in state, and
// `sameLiveFeedView` is the gate between them. Both halves are pure functions
// in `live-feed.ts` and both are tested with no socket and no React.
//
// ## Why there is a timer at all
//
// **Silence has no event.** A feed that stops produces nothing to react to, so
// the only way to notice 165 s of it is to look. This is the second timer in
// the application and it answers a different question from the first:
// `useMarketClock` ticks to advance a displayed time, this ticks to re-ask a
// derived one.

/**
 * How often the derived view is re-taken.
 *
 * 1/12 of §11.2's 60 s threshold and 1/33 of its 165 s one, so the worst
 * lateness a transition can have is five seconds on a rule whose smallest unit
 * is a minute. **A tick that changes nothing renders nothing** —
 * `sameLiveFeedView` is checked before the state is set — so the cost of the
 * resolution is an integer comparison rather than a render.
 */
export const LIVE_FEED_TICK_MS = 5_000;

/**
 * The production seams, as module constants rather than inline defaults.
 *
 * **The React Compiler's `refs` rule found this, and the repair was simpler
 * than the code it replaced** — which is the third time in this repository, and
 * `CLAUDE.md` records the pattern. The first draft mirrored the options into a
 * ref so an inline default could not re-run the effect, and writing a ref
 * during render is exactly what that rule forbids.
 *
 * Hoisting the defaults removes the need entirely: a caller passing nothing
 * destructures the **same three references** on every render, so the effect
 * runs once; a test passing its own re-runs it, which is the correct response
 * to a changed seam rather than something to suppress.
 */
const MONOTONIC_NOW = (): number => performance.now();
const WALL_NOW = (): number => Date.now();
const SET_TIMER = (fn: () => void, ms: number): number =>
  window.setTimeout(fn, ms);
const CLEAR_TIMER = (timer: number): void => {
  window.clearTimeout(timer);
};
const IS_VISIBLE = (): boolean => document.visibilityState !== "hidden";

/** What the hook needs that is not a global. Every field is a seam for a test. */
export interface UseLiveFeedOptions extends Partial<MarketStreamOptions> {
  /** Wall-clock now as epoch milliseconds — `Date.now()` in production. */
  readonly wallNow?: () => number;
  /** How often to re-take the derived view. */
  readonly tickMs?: number;
  /**
   * How a retry is scheduled. `setTimeout` in production (Task 3.5.5).
   *
   * A seam for the same reason `now` is one: the backoff reaches 30 s, and a
   * test that waited it out would be a test nobody runs.
   */
  readonly setTimer?: (fn: () => void, ms: number) => number;
  readonly clearTimer?: (timer: number) => void;
  /**
   * Whether this tab is visible. `document.visibilityState` in production.
   *
   * **A hidden tab does not retry**, and resumes when it comes back — a
   * backgrounded tab reconnecting on a schedule is a battery and a bill, and
   * it is the same judgement `useBackendHealth` already makes about polling.
   */
  readonly isVisible?: () => boolean;
}

/**
 * Hold the live feed open and report what it says.
 *
 * **A closed socket is a state, not an error boundary.** Nothing here throws
 * and nothing here rejects: §36 forbids collapsing to a global error screen,
 * and this is the first place in the frontend where that is testable rather
 * than merely true by absence of a failure path.
 */
export function useLiveFeed(options: UseLiveFeedOptions = {}): LiveFeedView {
  const {
    now = MONOTONIC_NOW,
    wallNow = WALL_NOW,
    tickMs = LIVE_FEED_TICK_MS,
    setTimer = SET_TIMER,
    clearTimer = CLEAR_TIMER,
    isVisible = IS_VISIBLE,
    open,
  } = options;

  // **One evaluation, held two ways.** `useState`'s lazy initialiser rather
  // than a second `startedLiveFeed(now())` call: two calls would stamp two
  // different instants on what is one connection, and reading the ref here to
  // avoid that is what the React Compiler's `refs` rule forbids — correctly,
  // since a ref read during render is a value React cannot see change.
  const [started] = useState(() => startedLiveFeed(now()));
  const connection = useRef(started);
  const [view, setView] = useState<LiveFeedView>(() =>
    liveFeedView(started, { now: now(), wallNow: wallNow() }),
  );

  // **Captured for the life of the connection, and that is the semantics
  // rather than a workaround.** A socket's clock and its constructor are fixed
  // for as long as it is open: swapping either under a live connection is not a
  // thing to support, it is a new connection, which is what unmounting gives.
  //
  // Written once by `useRef`'s initial value and never during a render — the
  // React Compiler's `refs` rule is right that a ref written while rendering is
  // a bug, and it fired on the draft that did.
  //
  // **It is also what keeps the effect stable.** Every caller passes an object
  // literal, so a seam in the dependency list tears the socket down and rebuilds
  // it on every render — which this test suite caught by losing the snapshot
  // between a message and the assertion about it.
  const seams = useRef({
    now,
    wallNow,
    open,
    setTimer,
    clearTimer,
    isVisible,
  });

  useEffect(() => {
    // Read once, at the top, into locals the cleanup can close over — a
    // `seams.current` read inside a cleanup is a read at teardown time rather
    // than at setup time, which `react-hooks/exhaustive-deps` warns about and
    // is right to.
    const {
      now: readNow,
      wallNow: readWallNow,
      open: openSocket,
      setTimer: schedule,
      clearTimer: cancel,
      isVisible: visible,
    } = seams.current;

    // **A closed socket fires its `close` event AFTER this effect has torn
    // down**, and the listener below closes over the ref the *next* mount is
    // already using — so without this guard a teardown writes `socket:
    // "closed"` into a connection that has just been created.
    //
    // **Found in a browser on 2026-09-19 by Task 3.3.6**, through React's
    // `StrictMode` double-invoke: two sockets are opened on every mount in
    // development, the first is closed immediately, and its close landed on the
    // second's state — leaving the feed permanently `disconnected` on the
    // developer's own screen. Production does not double-invoke, so what is
    // left there is the same race against any real unmount.
    //
    // It is the *"resolved after unmount"* bug `use-backend-health.ts` closes
    // deliberately, arriving on a socket instead of a request — and read
    // through a function for that file's stated reason: TypeScript narrows a
    // `let` from an enclosing scope and does not widen it again, so a direct
    // `if (stopped)` is `no-unnecessary-condition` at error.
    let stopped = false;
    const hasStopped = (): boolean => stopped;

    const read = (): void => {
      const next = liveFeedView(connection.current, {
        now: readNow(),
        wallNow: readWallNow(),
      });

      // The whole no-render guarantee, in one line: React bails out of a
      // re-render when the state is the same value, so returning `previous`
      // for an unchanged view is what makes a keepalive free.
      setView((previous) =>
        sameLiveFeedView(previous, next) ? previous : next,
      );
    };

    // **The retry, and its whole state is these three** (Task 3.5.5). Story 3.3
    // shipped this socket with none, so every backend deploy left every open
    // tab reading `DISCONNECTED` until somebody reloaded — on every merge.
    let disconnect: (() => void) | undefined;
    let pending: number | undefined;
    let attempt = 0;

    const dial = (): void => {
      if (hasStopped()) return;
      pending = undefined;

      disconnect = connectMarketStream(
        (event) => {
          if (hasStopped()) return;

          const before = connection.current;
          const after = advanceLiveFeed(before, event);
          connection.current = after;

          // **Reported once rather than per message.** A protocol mismatch
          // after a deploy produces the same reason on every message, and a
          // console filling at the feed's own rate is a log nobody reads. The
          // count keeps rising in the state either way, so nothing is lost.
          if (firstUnreadable(before, after) && after.lastUnreadableReason) {
            reportUnreadableMessage(after.lastUnreadableReason);
          }

          // **A message means the connection works**, so the backoff resets
          // here rather than on `opened`. A socket that opens and is closed
          // immediately — a server refusing during a rollout — would otherwise
          // reset the count every time and retry forever at 500 ms.
          if (event.kind === "message") attempt = 0;

          if (event.kind === "closed") scheduleRetry(event.code);

          read();
        },
        // **`exactOptionalPropertyTypes` is on**, so *absent* and *present as
        // `undefined`* are different types and the transport's own default only
        // applies to the first. Branching is the setting behaving correctly
        // rather than friction to route around.
        openSocket === undefined
          ? { now: readNow }
          : { now: readNow, open: openSocket },
      );
    };

    const scheduleRetry = (code?: number): void => {
      if (hasStopped() || pending !== undefined) return;

      // **A hidden tab does not retry.** It resumes on `visibilitychange`
      // below, which is the same judgement `useBackendHealth` already makes
      // about polling — a backgrounded tab reconnecting on a schedule is a
      // battery and a bill.
      if (!visible()) return;

      attempt += 1;
      pending = schedule(dial, reconnectDelayMs(attempt, code));
    };

    // Returning to a hidden tab retries **now** rather than waiting out a
    // backoff that was never running. `useBackendHealth` polls immediately on
    // becoming visible for the same stated reason: *so a returning user does
    // not read a stale state.*
    const onVisibility = (): void => {
      if (hasStopped() || !visible()) return;
      if (connection.current.socket === "closed" && pending === undefined) {
        attempt = 0;
        pending = schedule(dial, 0);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    dial();

    const ticking = setInterval(read, tickMs);

    return () => {
      // Set first, so nothing the disconnect provokes can write.
      stopped = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (pending !== undefined) cancel(pending);
      clearInterval(ticking);
      disconnect?.();
      connection.current = startedLiveFeed(readNow());
    };
  }, [tickMs]);

  return view;
}
