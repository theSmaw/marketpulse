import type { Bar } from "@marketpulse/shared";

// What counts as an arrival, in one place (Task 3.6.2).
//
// ## Why this moved out of `SecurityIdentity`
//
// It was private there from Task 3.4.5 until 2026-09-21, which was correct
// while one surface marked arrivals. Task 3.6.2 gave it a second consumer, and
// **two implementations of "what counts as an arrival" is the shape Task 3.5.2
// removed from the subscription**: two policies that agree today, disagree
// invisibly, and nothing says which is authoritative.
//
// The canvas says the same thing from the design side — *a vocabulary is one
// decision and three surfaces would make it three* — so the rule has one home
// and the surfaces differ only in where they hang the mark.

/**
 * What makes one observation a different observation from the last.
 *
 * **Not the instant, and Task 3.4.6 changed it for a reason worth keeping.**
 * Task 3.4.5 keyed the arrival on `startsAt`, which is right for a new minute
 * and wrong for a **revision**: the product subscribes `updatedBars`, and a
 * corrected bar carries the minute it corrects (§7.3 — `t` marks the
 * interval's start), so a correction arriving thirty seconds later left the
 * instant unchanged and **drew no mark at all**.
 *
 * That produced the one state the vocabulary had no word for: §7.8 measured 14
 * revisions in one session and **three of them changed the close**, so a reader
 * could watch the **figure move with nothing marking it** — the exact inverse
 * of what the mark was decided to mean.
 *
 * So the identity is the observation's **content**. A revision that changed
 * something is a different observation and fires the mark; one that changed
 * nothing is not, and does not — which is correct rather than a limitation,
 * because nothing was corrected.
 *
 * `volume` is in it as well as `close` deliberately: a revision that adjusted
 * only the volume still corrected the bar, and a reader who is told *a bar
 * arrived* has been told the truth.
 */
export const observationIdentity = (
  bar: Bar | undefined,
): string | undefined =>
  bar === undefined
    ? undefined
    : `${String(bar.startsAt.getTime())}:${String(bar.close)}:${String(bar.volume)}`;

/**
 * The value a row's mark should be keyed on, or `undefined` for no mark.
 *
 * **The whole of the table's arrival logic, and it holds no state** — which is
 * the point at 518 rows. `SecurityIdentity` needs a hook because it has to
 * survive the route changing symbol underneath it without re-mounting; a table
 * row is keyed by its symbol and has no such problem, so the same rule reduces
 * to a pure function.
 *
 * **A snapshot is not an arrival** (Task 3.5.4). `fromSnapshot` carries the
 * wire's own distinction — §11.1's `snapshot` and `bars` are two message types
 * — down from the store rather than being inferred here, and it is what stops
 * **518 marks firing on first paint**: the state a browser is handed on
 * connecting is *what we already held*, not news.
 *
 * Delivery decides rather than content, which matters for the thin tail: an
 * *ignore whichever observation arrives first* rule would also suppress a
 * genuine first bar for a security the server had never observed, and §7.6
 * measured `ERIE` at 2.1% minute coverage, so that case is ordinary.
 *
 * Returning the identity rather than a boolean is what lets a consumer use it
 * as a React `key`: the element is replaced when — and only when — a different
 * observation arrives, which restarts the decay exactly once per arrival.
 */
export function arrivalKey(
  bar: Bar | undefined,
  fromSnapshot: boolean,
): string | undefined {
  return fromSnapshot ? undefined : observationIdentity(bar);
}
