import { MARKET_STREAM_CLOSE } from "@marketpulse/shared";

/**
 * When to dial again after the browser's socket closed (Task 3.5.5).
 *
 * **A pure function, so the policy is readable without waiting.** Everything
 * here is arithmetic over an attempt count and a close code; the hook owns the
 * timer and the visibility, and this owns the decision.
 *
 * ## Why there is a policy at all
 *
 * Story 3.3 shipped the browser's socket with **no retry**, so every backend
 * deploy left every open tab reading `DISCONNECTED` until somebody reloaded —
 * and deploys happen on every merge to `main`. This is that repair.
 *
 * ## Why two schedules rather than one
 *
 * **The gateway tells us which is which, and nothing read it until now.**
 * §12.2 has it send `1001 going away` on shutdown — *we are coming back in a
 * few seconds* — while §8.5 measured that an **abnormal** close carries no
 * intent at all. One schedule would have to be pessimistic enough for a dead
 * network, which would make every deploy feel like an outage, or optimistic
 * enough for a deploy, which would hammer a server that is genuinely gone.
 */

/**
 * `1001 going away` — the gateway's shutdown code (§12.2).
 *
 * Read from `MARKET_STREAM_CLOSE` rather than spelled here, because it is one
 * fact with two ends: the gateway picks it and this decides what it means.
 */
export const GOING_AWAY = MARKET_STREAM_CLOSE.goingAway;

/**
 * First delay after a deploy.
 *
 * **Shorter than the backend's own shutdown ceiling on purpose.** A rolling
 * replacement is measured in seconds, so the first dial should land while the
 * new process is coming up rather than after it has been serving for a while.
 */
export const GOING_AWAY_FIRST_MS = 500;

/** First delay after a close that carried no intent. */
export const ABNORMAL_FIRST_MS = 2_000;

/**
 * The ceiling, and it is a ceiling rather than a give-up.
 *
 * **Nothing here ever stops retrying**, because a tab left open overnight
 * should be working in the morning — and a browser that gave up would leave
 * exactly the `DISCONNECTED`-until-reload state this task exists to remove.
 * Thirty seconds is slow enough to cost a dead server nothing and fast enough
 * that a returning network is noticed before a person is.
 */
export const RECONNECT_CEILING_MS = 30_000;

/** Doubling, which is the conventional shape and needs no argument. */
const FACTOR = 2;

/**
 * How long to wait before attempt `attempt` (1 for the first).
 *
 * **No jitter, deliberately.** Jitter exists to stop a thundering herd
 * re-synchronising on one server, and this product's realistic audience is a
 * handful of tabs — so it would be a mechanism with no measured problem behind
 * it, and an unpredictable delay is harder to assert on than a fixed one.
 *
 * **Reversal trigger, as a condition:** the first time enough browsers are
 * attached that a simultaneous reconnect is visible in the backend's own load.
 */
export function reconnectDelayMs(attempt: number, code?: number): number {
  const first = code === GOING_AWAY ? GOING_AWAY_FIRST_MS : ABNORMAL_FIRST_MS;
  const steps = Math.max(0, attempt - 1);
  return Math.min(first * FACTOR ** steps, RECONNECT_CEILING_MS);
}
