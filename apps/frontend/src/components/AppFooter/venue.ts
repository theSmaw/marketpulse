import type { MarketFeedView } from "../../use-market-feed.js";
import type { LiveFeedView } from "../../market/index.js";

/**
 * **Which tape the chrome's venue word names** (Task 3.10.6).
 *
 * ## The defect this exists to close
 *
 * The cell answers two questions — *which venues are in these numbers* and *is
 * data arriving* — from **two sources**: the venue from `GET /market-data`,
 * which reports the **historical** provider's tape, and the connection from the
 * socket's own frames. On the deployed site during a session that produced
 *
 * ```text
 * MARKET FEED · ALL US EXCHANGES · LIVE
 * ```
 *
 * beside numbers that were **entirely IEX** — seen on 2026-09-22, true in both
 * halves, and `CLAUDE.md` invariant 6 breached on every route. `PRODUCT_SPEC.md`
 * §7.1 does not ask us to print an acronym; it asks that we **must not imply
 * that IEX represents every US exchange**.
 *
 * ## The rule, decided by the owner on 2026-09-24
 *
 * **The venue names the tape the newest numbers on the page came from.**
 *
 * | What the page holds              | Venue           |
 * | -------------------------------- | --------------- |
 * | nothing live has ever arrived    | the stored tape |
 * | live prices are arriving         | **the live tape** |
 * | the feed has stopped             | **the live tape** |
 * | no provider configured           | no venue word   |
 *
 * The third row is the one worth pausing on: after a disconnection the newest
 * figures on screen are **still the socket's**, which is exactly what the
 * chrome's own *showing data through …* means. A venue word that reverted to
 * the stored tape there would relabel numbers that had not changed.
 *
 * ## Why this is not "defer to the source note"
 *
 * That was the safest option against invariant 6 and it loses the at-a-glance
 * venue from the chrome, which is the one thing this cell is for — and the
 * source note is a security page's while the chrome is on all five routes.
 * `PROVENANCE.md` §1.3 keeps its division of labour: the chrome says what it
 * can and the note says what the chrome cannot, which is the **ledger** — each
 * stretch in contribution order with its counts.
 *
 * ## Why it is not "name both tapes"
 *
 * Two tapes in a status strip duplicates the note's ledger, which is the
 * two-surfaces defect this repository has produced three times on one screen,
 * and it makes a one-row bar permanently two.
 *
 * > **Reversal trigger, as a condition:** the first deployment whose stored and
 * > live tapes are the **same**. The rule still holds, it simply stops being
 * > visible — and a reader would have no way to tell that from the chrome
 * > having given up on the question.
 */
export function venueFor(
  live: LiveFeedView,
  configured: MarketFeedView,
): MarketFeedView {
  // **`null` is not "no provider" here.** `LiveFeedView.feed` is `null` before
  // the first frame lands and for a deployment with no stream — and in the
  // first of those the configured answer is still the right one, because the
  // numbers on screen are the charts' and they are the stored tape.
  if (live.feed === null) return configured;

  // A live tape is known, so it is what the newest numbers came from. The
  // configured view's own `state` is not consulted: a deployment cannot report
  // a live feed without being configured, and preferring it here would make
  // the venue lag the numbers by one HTTP request.
  return { state: "configured", feed: live.feed };
}
