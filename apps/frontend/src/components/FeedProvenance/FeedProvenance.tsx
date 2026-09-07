import { MARKET_FEED_DESCRIPTIONS } from "@marketpulse/shared";

import { cx } from "../../cx.js";
import { Marker } from "../Marker/Marker.js";
import type { MarkerShape } from "../Marker/Marker.js";
import type { MarketFeedView } from "../../use-market-feed.js";
import styles from "./FeedProvenance.module.css";

// Which market feed this deployment reads, as a marker, a word and a sentence
// (Task 2.6.7) — invariant 6 and PRODUCT_SPEC.md §7.1 on screen for the first
// time.
//
// It replaces the hard-coded `DISCONNECTED` the chrome has rendered since Story
// 1.5. That value was honest about there being no market data and it was still
// an **invented value in a status strip on a market product**, which is the one
// place a reader is entitled to assume nothing is invented.
//
// ## Why the sentence is the requirement and the word is only the affordance
//
// §7.1 does not ask for an acronym. It says MarketPulse *"must not imply that
// IEX represents every US exchange"* — and a reader who does not know what IEX
// is learns nothing from three letters, so `Market feed: IEX` satisfies the
// letter and fails the intent. The words are not chosen here: they live in
// `MARKET_FEED_DESCRIPTIONS`, beside the vocabulary they describe, because a
// renderer deriving a user-facing sentence from a slug and a lookup table of
// its own is two vocabularies for one fact and is the copy that drifts. A
// string literal here would be that copy. The `satisfies` on that record means
// a feed added later without words is a compile error, and re-wording them here
// would put that guarantee back outside the compiler.
//
// The **one** sentence this component does own is the unconfigured state's,
// because there is no entry for it and there should not be: *"no provider is
// configured"* is a fact about our own deployment rather than about a market
// venue, and a feed table is not where that belongs.
//
// ## Two indicators, one visual language, now three components
//
// This is the fourth thing in the application to hold the marker idiom
// (`FeedIndicator`, `BackendIndicator`, `MarketClock`, this) and the third to
// hold it through `components/Marker`, which owns the geometry and the four
// silhouettes and knows nothing about any vocabulary. What stays here is what
// is this component's own: which shape each state draws, and which colour.
//
// **Nothing here is red and nothing is green.** A single-venue feed is not a
// fault — §36 makes it a product state — and neither is a deployment with no
// provider configured. The one amber is on `synthetic`, and it is the one
// placement in this component with a *safety* argument rather than a legibility
// one: a fixture-backed deployment serves invented prices, and `PROVIDER.md`
// §5.4's mechanism is that it advertises itself in the chrome structurally. It
// is a second channel rather than the only one, because that state is also the
// one square here and carries a sentence saying so in words.
//
// ## Not a live region
//
// `role="status"` would announce on every page load and every navigation, and
// the commonest transition here is the mount — which is the argument
// `BackendIndicator` and `MarketClock` both made, and it is stronger here,
// because this value cannot change at all without a deploy and a reload.
// `UniverseTable` owns the page's one live region.
//
// It is presentational: one prop, no hook, no `fetch`. The view is
// `use-market-feed.ts`'s and every state is reachable from a story, which
// matters because two of them cannot be produced in a browser without changing
// a deployment.

export interface FeedProvenanceProps {
  /**
   * What this page knows about the feed.
   *
   * **The union taken whole rather than spread into props**, which is the
   * opposite of what `AppHeader` does with `useBackendHealth`'s four fields and
   * is `UniverseTable`'s precedent rather than an inconsistency. The four-props
   * rule exists because those fields are *independent* — a status, a cause, a
   * timestamp and a boolean, whose impossible combinations a component would
   * have to be trusted not to construct. A discriminated union is the shape
   * that makes those combinations unconstructible, so spreading it would hand
   * the renderer back the very space it removes, and a story would gain the
   * ability to build a state that cannot happen.
   */
  readonly view: MarketFeedView;
}

/**
 * Which silhouette each state draws.
 *
 * The mapping stays here rather than in `Marker`: the primitive owns the
 * drawing, this owns what the drawing means. The four silhouettes carry four
 * different claims, which is what lets `not-configured` and `unknown` be told
 * apart by more than their words:
 *
 *  - `dashed` — **we do not know.** The placeholder before the first answer,
 *    and the state after one that could not be read. Both are the absence of an
 *    answer, and `BackendIndicator` already uses dashed for exactly that.
 *  - `ring` — **we know there is nothing.** A deployment with no provider
 *    configured is a definite, deliberate absence rather than an unknown one.
 *  - `disc` — a real market feed.
 *  - `square` — a feed that is not market data, which is the one state a glance
 *    should land on and the one that carries the amber.
 */
const SHAPE: Readonly<Record<MarketFeedView["state"], MarkerShape>> = {
  checking: "dashed",
  "not-configured": "ring",
  configured: "disc",
  unknown: "dashed",
};

const STATE_CLASS: Readonly<
  Record<MarketFeedView["state"], string | undefined>
> = {
  checking: styles.unknown,
  "not-configured": styles.unknown,
  configured: styles.feed,
  unknown: styles.unknown,
};

/**
 * The sentence for the states that are about **us** rather than about a venue.
 *
 * `MARKET_FEED_DESCRIPTIONS` covers every feed and deliberately covers none of
 * these, so these three are the only user-facing words this component owns.
 *
 * `unknown` names no cause on purpose. The two producible ones — nothing
 * arrived, and something answered that was not this service — are the same
 * collapse `SecuritiesFailure` makes, and there is nothing a reader can do
 * differently about them from a status strip; the `Backend service` indicator
 * one cell to the right is the thing that says which, and repeating it here
 * would be two components reporting one fact.
 */
const OWN_SENTENCE: Readonly<Partial<Record<MarketFeedView["state"], string>>> =
  {
    "not-configured": "No market-data provider is configured.",
    unknown: "The market feed could not be read.",
  };

/**
 * The word beside the marker.
 *
 * For a configured feed it is `MARKET_FEED_DESCRIPTIONS[feed].label` — the
 * affordance the shared record exists to provide, short enough for a status
 * region. The other three are this component's own, and `checking` is the same
 * word `BackendIndicator` shows for the same reason: it is a fact about this
 * client's own startup rather than about the deployment, so it is never a
 * vocabulary member anywhere.
 */
function word(view: MarketFeedView): string {
  switch (view.state) {
    case "checking":
      return "checking";
    case "not-configured":
      return "not configured";
    case "configured":
      return MARKET_FEED_DESCRIPTIONS[view.feed].label;
    case "unknown":
      return "unknown";
  }
}

/** The sentence under the word, or nothing while the first answer is pending. */
function sentence(view: MarketFeedView): string | undefined {
  return view.state === "configured"
    ? MARKET_FEED_DESCRIPTIONS[view.feed].sentence
    : OWN_SENTENCE[view.state];
}

export function FeedProvenance({ view }: FeedProvenanceProps) {
  // The amber is a property of the *feed* rather than of the state, so it is
  // not in `STATE_CLASS`: `configured` is grey for a real market feed and amber
  // for generated data, which is the whole of §5.4's mechanism.
  const syntheticClass =
    view.state === "configured" && view.feed === "synthetic"
      ? styles.synthetic
      : undefined;

  // Likewise the shape: `configured` is a disc for a real feed and the one
  // square in this region for generated data, so the amber is never the only
  // thing marking it.
  const shape: MarkerShape =
    syntheticClass === undefined ? SHAPE[view.state] : "square";

  const detail = sentence(view);

  return (
    <span
      className={cx(styles.provenance, STATE_CLASS[view.state], syntheticClass)}
    >
      <Marker shape={shape} />
      <span className={styles.label}>{word(view)}</span>
      {detail !== undefined && <span className={styles.detail}>{detail}</span>}
    </span>
  );
}
