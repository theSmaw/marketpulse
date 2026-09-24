import { useState } from "react";

import type { FeedStatus } from "@marketpulse/shared";
import {
  CONNECTION_SENTENCES_WITHOUT_DATA,
  connectionWordFor,
} from "@marketpulse/shared";

import { formatBarInstant } from "../../market/index.js";
import type { LiveFeedView } from "../../market/index.js";
import { cx } from "../../cx.js";
import { Marker } from "../Marker/Marker.js";
import type { MarkerShape } from "../Marker/Marker.js";
import { announcesDegradation } from "./announcement.js";
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
 * **`LIVE` carries none**, and the decision, its cost and its reversal trigger
 * are recorded **beside the word** — `CONNECTION_DESCRIPTIONS.live` in
 * `packages/shared/src/feed-words.ts`, where the argument for `live` having no
 * *sentence* already lives, because it is the same argument. This table is the
 * implementation of it and deliberately not a second copy.
 *
 * In one line: §36's example exists to **qualify a broken state**, and a
 * healthy feed has nothing to qualify.
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
  // **The announcement is STATE, adjusted during render**, and both halves of
  // that are the repair for a draft that looked right and announced nothing.
  //
  // The first version derived it — `announcesDegradation(previous, current)`
  // computed fresh each render, with the previous status in a ref written from
  // an effect. It put the sentence in the region for exactly **one** render and
  // the next render wiped it, because by then the ref had caught up. A polite
  // region emptied a frame later may never be read aloud at all, and nothing
  // below a real screen reader can see that: the DOM was correct at one
  // instant and the assertion that caught it was a browser one.
  //
  // So what is held is **the sentence**, until something changes it. Adjusted
  // during render rather than in an effect, which is React's own shape for
  // *state derived from a prop that has changed* and what the compiler's
  // `set-state-in-effect` rule points at — the same call `use-live-series.ts`
  // made, for the same reason.
  const [shown, setShown] = useState<FeedStatus | undefined>(undefined);
  const [announced, setAnnounced] = useState<string | null>(null);

  // The one crossing of the two vocabularies, called rather than re-derived.
  const word = connectionWordFor(view.status, view.feed, {
    backendReachable: view.backendReachable,
  });

  // §11.3's `—`: a deployment with no provider has no connection to describe,
  // and `DISCONNECTED` there would claim a feed broke when none was asked for.
  // **Nothing collapses** — the provenance cell beside this one is saying
  // `not configured` or `checking`, so the region keeps its height.
  if (word === null) return null;

  // **The sentence depends on whether there is data to be about** (Task
  // 3.10.2). `Prices shown are the last known` and `no NEW data has arrived`
  // are both claims about live prices this page has received, and a page that
  // has received none is ordinary — a cold load with the market shut, a first
  // paint before any bar lands. ADR 0029's first rule, applied to the sentence
  // rather than only to the instant it carries; `Live in the chrome` §05
  // states the rule and `Degraded states` §02 takes the decision.
  const holdsData = view.observedAt !== undefined;
  const sentence =
    (holdsData ? undefined : CONNECTION_SENTENCES_WITHOUT_DATA[view.status]) ??
    word.sentence;

  const through =
    QUALIFIES_WITH_AN_INSTANT[view.status] && holdsData
      ? `Showing data through ${formatBarInstant(new Date(view.observedAt), "1m")}.`
      : undefined;

  // One string rather than two nodes: the sentence and the instant are one
  // statement, and a screen reader handed them as separate text nodes would
  // pause between them.
  const detail = [sentence, through].filter(Boolean).join(" ");

  if (shown !== view.status) {
    setShown(view.status);
    // Recovery clears it rather than announcing: the word stays on screen to
    // be read, and what is SPOKEN is only the thing that changes what the
    // numbers mean.
    setAnnounced(
      announcesDegradation(shown, view.status)
        ? `Market feed ${word.label}. ${detail}`
        : null,
    );
  }

  return (
    <span className={cx(styles.indicator, STATUS_CLASS[view.status])}>
      {/*
        **The spoken half, and it is silent unless something got worse** (Task
        3.10.6). A polite region whose content is EMPTY except on a
        degradation: mount says nothing, recovery says nothing, and going
        `live → stale` or `→ disconnected` puts one sentence in it.

        It is a sibling of the drawn word rather than a wrapper around it,
        because the drawn word must not be announced every time it re-renders
        — which is what putting `role="status"` on the cell itself would do.
      */}
      <span className={styles.announcement} role="status">
        {announced ?? ""}
      </span>
      <Marker shape={STATUS_SHAPE[view.status]} />
      <span className={styles.label}>{word.label}</span>
      {detail !== "" && <span className={styles.detail}>{detail}</span>}
    </span>
  );
}
