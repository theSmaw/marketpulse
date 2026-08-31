import type { FeedStatus } from "@marketpulse/shared";

import { cx } from "../../cx.js";
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

export interface FeedIndicatorProps {
  readonly status: FeedStatus;

  /**
   * The half of the message §36 actually specifies: "displaying data through
   * 10:42:17". Optional, because a dense row has no space for it and a chrome
   * strip does — but a `disconnected` state without one is a component telling
   * the user less than the spec asks for.
   */
  readonly detail?: string;
}

const STATUS_CLASS: Readonly<Record<FeedStatus, string | undefined>> = {
  live: styles.live,
  stale: styles.stale,
  disconnected: styles.disconnected,
};

export function FeedIndicator({ status, detail }: FeedIndicatorProps) {
  return (
    <span className={cx(styles.indicator, STATUS_CLASS[status])}>
      <span aria-hidden="true" className={styles.marker} />
      <span className={styles.label}>{status}</span>
      {detail !== undefined && <span className={styles.detail}>{detail}</span>}
    </span>
  );
}
