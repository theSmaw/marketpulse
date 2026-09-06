import { cx } from "../../cx.js";
import styles from "./Marker.module.css";

// The status marker: 8px of silhouette, and the only thing in this application
// that three unrelated components had been drawing the same way by hand.
//
// ## What it extracts, and — more importantly — what it does not
//
// `FeedIndicator`, `BackendIndicator` and `MarketClock` each report a fact that
// has nothing to do with the other two, and this repository has **twice**
// rejected collapsing them into one component. Those rejections were right and
// they still stand: a `<StatusIndicator variant="backend" status="healthy" />`
// would be one component holding three vocabularies — ten members across
// `FeedStatus`, `BackendStatus` and the clock's own words — and the first person
// to add a member to any of them would have to work out which.
//
// **This is a different extraction and it is deliberately much smaller.** What
// was genuinely identical across the three was never the vocabulary; it was the
// **geometry** (an 8px circle nudged onto the text's optical centre) and the
// **silhouettes** (solid, hollow, dashed, square). Those are one language and
// were held by three authors each remembering it — the cost `BackendIndicator`
// stated when it was the second copy and `MarketClock` inherited as the third.
//
// So each component keeps its own union, its own words, its own colour tokens
// and its own mapping from a state to a shape. All this owns is the drawing.
//
// ## Colour comes from `--marker-color`, and the cost is stated
//
// The consumer sets it on whichever element carries the state class, and it
// inherits down. That keeps every colour token in a stylesheet — this codebase
// has **no inline styles anywhere**, checked rather than assumed, and a `color`
// prop would have been the first.
//
// The cost: a consumer that forgets it renders an invisible marker, and no test
// here can see that. Nothing renders with a stylesheet applied in the component
// tests, so `getComputedStyle` returns nothing; and the browser suite must not
// assert colour, because under `grayscale(1)` this palette's two price
// directions are 1.05:1 apart and colour is never the encoding. **The workshop
// is the check** — each of the four consumers renders every one of its states in
// an `AllPermutations` grid, where a missing colour is a blank space rather than
// a subtle one. That is the same instrument that caught this component's own
// layout defect on a date the running application cannot reach.
//
// ## It is `aria-hidden`, always, and that is not configurable
//
// A silhouette read aloud is nothing — "the state is: circle" — so every one of
// the three call sites this replaced was already `aria-hidden="true"`, with a
// word beside it carrying the meaning. Making that a prop would invite somebody
// to turn it off and ship a marker as the accessible name of a status.

/**
 * The four silhouettes, named for what they look like rather than for what they
 * mean — because what they mean is each consumer's business.
 *
 * There are four rather than the three a glance suggests: `square` exists
 * because `BackendIndicator`'s `degraded` is a filled **square** rather than a
 * second coloured disc, so that the amber it carries is never the only thing
 * distinguishing it.
 */
export const MARKER_SHAPES = ["disc", "ring", "dashed", "square"] as const;

export type MarkerShape = (typeof MARKER_SHAPES)[number];

export interface MarkerProps {
  /**
   * Which silhouette. Required, and there is no default: a default would be a
   * shape chosen by whoever wrote this component rather than by the component
   * that knows what it is reporting.
   */
  readonly shape: MarkerShape;
}

const SHAPE_CLASS: Readonly<Record<MarkerShape, string | undefined>> = {
  disc: styles.disc,
  ring: styles.ring,
  dashed: styles.dashed,
  square: styles.square,
};

export function Marker({ shape }: MarkerProps) {
  return (
    <span
      aria-hidden="true"
      className={cx(styles.marker, SHAPE_CLASS[shape])}
    />
  );
}
