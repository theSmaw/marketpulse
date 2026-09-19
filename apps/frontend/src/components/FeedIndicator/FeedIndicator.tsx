import type { FeedStatus } from "@marketpulse/shared";
import { connectionWordFor } from "@marketpulse/shared";

import { formatBarInstant } from "../../market/index.js";
import type { LiveFeedView } from "../../market/index.js";
import { cx } from "../../cx.js";
import { Marker } from "../Marker/Marker.js";
import type { MarkerShape } from "../Marker/Marker.js";
import styles from "./FeedIndicator.module.css";

// The market feed's state, as a marker and a word.
//
// **None of the three is an error**, and that is the property this component
// exists to hold. PRODUCT_SPEC.md §36 makes stale and disconnected product
// states: data still shown, still correct as of a stated time, and no longer
// live. Rendering either as a failure pushes the interface toward exactly the
// global error screen §36 forbids.
//
// So the marker's *shape* carries the state — filled for live, filled for
// stale, hollow for disconnected — and only stale takes a colour. Live and
// disconnected are the same grey and differ by shape alone. A green "live" dot
// was rejected: green means price-positive in this product and would be the
// only other green on the screen.
//
// Provenance belongs beside this component rather than inside it. Invariant 6
// requires the feed to be labelled — the free tier is IEX, not consolidated
// SIP — and that is a caller's string, not a status.
//
// **Task 2.6.7 built it, as `components/FeedProvenance`**, and this component
// was no longer in the chrome: the header rendered a hard-coded `disconnected`
// here from Story 1.5 to Story 2.6, and an invented status beside a truthful
// provenance line would have been keeping the invented value.
//
// ## It came back on 2026-09-19, with a true value (Task 3.3.5)
//
// **Beside provenance rather than instead of it**, because "which venues are in
// the numbers" and "is data arriving right now" are two facts that fail
// independently — Task 1.12.4's two-indicators argument, applied for the fifth
// time. The two markers are the cost of that, and they are told apart by
// default silhouette: provenance is a ring, a connection is a disc.
//
// ## It takes the VIEW rather than a status, and that is the null case
//
// §11.3's grid gives a deployment with no provider a **`—`** in this cell, and
// `connectionWordFor` returns `null` for it. Something has to render nothing,
// and doing it here rather than in `AppFooter` keeps the crossing to **one call
// site** — a component writing `status === "live" && feed === "replay"` for
// itself is what `pnpm break connection-words-in-a-renderer` goes red for.
//
// It also means a story holds a state the application can actually reach,
// rather than a combination somebody typed.

export interface FeedIndicatorProps {
  /** Everything the browser knows about the feed — `useLiveFeed`'s answer. */
  readonly view: LiveFeedView;
}

/**
 * Which states carry the observation's instant.
 *
 * **`LIVE` carries none, and that was the owner's decision on 2026-09-19.**
 * §36's example sentence — *"Live feed disconnected — displaying data through
 * 10:42:17"* — exists to **qualify a broken state**, and a healthy feed has
 * nothing to qualify. It is `PROVENANCE.md`'s existing rule rather than a new
 * one: a clause renders only when its own data is present, and this product
 * already refuses to print a fully-formed provenance record about zero bars.
 *
 * **The cost is stated rather than discovered later:** silence now means
 * *current*, and a reader has to learn that. Which is why the instant never
 * appears alone — it arrives inside the sentence that explains why it is there.
 *
 * **Reversal trigger, as a condition:** the first time a reader asks *how old
 * is this?* of a region showing `LIVE`. At that point silence has stopped
 * communicating and the always-on version is the answer.
 */
const QUALIFIES_WITH_AN_INSTANT: Readonly<Record<FeedStatus, boolean>> = {
  live: false,
  stale: true,
  disconnected: true,
};

const STATUS_CLASS: Readonly<Record<FeedStatus, string | undefined>> = {
  live: styles.live,
  stale: styles.stale,
  disconnected: styles.disconnected,
};

/**
 * Which silhouette each state draws.
 *
 * The mapping stays **here** rather than in `Marker`, which is the whole shape
 * of that extraction: the primitive owns the drawing and this owns what the
 * drawing means. `live` and `disconnected` are the same grey and are told apart
 * by this table alone.
 */
const STATUS_SHAPE: Readonly<Record<FeedStatus, MarkerShape>> = {
  live: "disc",
  stale: "disc",
  disconnected: "ring",
};

export function FeedIndicator({ view }: FeedIndicatorProps) {
  // The one crossing of the two vocabularies, called rather than re-derived.
  const word = connectionWordFor(view.status, view.feed, {
    backendReachable: view.backendReachable,
  });

  // §11.3's `—`: a deployment with no provider has no connection to describe,
  // and `DISCONNECTED` there would claim a feed broke when none was asked for.
  // **Nothing collapses** — the provenance cell beside this one is saying
  // `not configured` or `checking`, so the region keeps its height.
  if (word === null) return null;

  const through =
    QUALIFIES_WITH_AN_INSTANT[view.status] && view.observedAt !== undefined
      ? `Showing data through ${formatBarInstant(new Date(view.observedAt), "1m")}.`
      : undefined;

  // One string rather than two nodes: the sentence and the instant are one
  // statement, and a screen reader handed them as separate text nodes would
  // pause between them.
  const detail = [word.sentence, through].filter(Boolean).join(" ");

  return (
    <span className={cx(styles.indicator, STATUS_CLASS[view.status])}>
      <Marker shape={STATUS_SHAPE[view.status]} />
      <span className={styles.label}>{word.label}</span>
      {detail !== "" && <span className={styles.detail}>{detail}</span>}
    </span>
  );
}
