import type { FeedStatus } from "@marketpulse/shared";

/**
 * **What a listener is told when the feed degrades, and when it is told
 * nothing** (Task 3.10.6).
 *
 * ## Why this region exists at all, when the venue beside it refused one
 *
 * `FeedProvenance`'s *Not a live region* argument is correct and is about the
 * **venue**, whose value *"cannot change at all without a deploy and a
 * reload"*. The **connection** is the opposite case: it changes while a page
 * is open, and since Task 3.10.5 this cell is the **only** surface on a
 * security page that says the feed stopped — the plot is byte-identical either
 * side of an outage, the identity block keeps its figure and its instant, the
 * table keeps its rows, and the reading strip answers correctly for ever.
 *
 * A surface that deliberately says nothing plus a surface that is never
 * announced is a page on which a listener is told **nothing at all**.
 *
 * ## Why not a plain `role="status"` on the cell
 *
 * It announces on **mount**, which is the commonest transition in a footer and
 * the exact reason the venue half refused one. A bar that speaks on every page
 * load and every navigation teaches a listener to ignore it, which is worse
 * than silence.
 *
 * ## The rule, decided by the owner on 2026-09-24
 *
 * **Only a degradation is announced.** Silent on mount; silent on recovery.
 *
 * | Transition             | Announced |
 * | ---------------------- | --------- |
 * | mount, any state       | **no**    |
 * | `live` → `stale`       | yes       |
 * | `live` → `disconnected`| yes       |
 * | `stale` → `disconnected` | yes     |
 * | `disconnected` → `stale` | **no** — see below |
 * | anything → `live`      | **no**    |
 *
 * Recovery is the state a reader wanted; saying so interrupts them to deliver
 * good news, and the word is on screen to be read at any time. What is
 * announced is only the thing that **changes what the numbers mean**.
 *
 * `disconnected` → `stale` is an improvement — the socket is back and merely
 * quiet — so it is silent by the same rule rather than by an exception.
 *
 * ## What is still unanswerable
 *
 * Whether a real screen reader **queues or replaces** this while a sentence is
 * in progress is readable from no DOM and no timing. It joins `docs/GAPS.md`'s
 * standing listening item, whose owner is a person with a screen reader.
 */

/** How bad a connection state is, so a change can be read as a direction. */
const SEVERITY: Readonly<Record<FeedStatus, number>> = {
  live: 0,
  stale: 1,
  disconnected: 2,
};

/**
 * Should the move from `before` to `after` be spoken?
 *
 * `before` is `undefined` on the first render, which is **mount** — and mount
 * is never announced, whatever it is showing.
 */
export function announcesDegradation(
  before: FeedStatus | undefined,
  after: FeedStatus,
): boolean {
  if (before === undefined) return false;
  return SEVERITY[after] > SEVERITY[before];
}
