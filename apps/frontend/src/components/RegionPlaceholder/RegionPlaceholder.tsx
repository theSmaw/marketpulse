import { Marker } from "../Marker/Marker.js";
import styles from "./RegionPlaceholder.module.css";

// What sits inside a region of the Security Explorer that a later epic fills
// (Task 2.11.7).
//
// PRODUCT_SPEC.md §8.3 lists seven contents for this screen. Two of them are
// real or one story away; the other five belong to Epics 5, 6 and 9. So five of
// the seven panels on the page are empty on the day the grid lands, and **a
// screen that is mostly honest placeholders is exactly where "would a stranger
// believe this is a real funded product?" is lost**.
//
// ## Why a dashed field with a plan in it, rather than the thing it will become
//
// The tempting placeholder is a drawing of the eventual content — a graph with
// no nodes, a chart with a flat line, a list of dashes. It is worse in two
// separate ways. It is **indistinguishable from that content being broken**,
// which is the one reading a placeholder must not have; and it takes the next
// epic's design decision on its behalf, in a task that has not seen the data.
// A dashed field with a sentence in it can only be read one way.
//
// The `filledBy` label names an **epic**, never a date and never a story number
// this repository has not committed to. `SEARCH-AND-SELECTION.md` §5 records
// what happens otherwise: the 2.11 design deliverable labelled its placeholder
// cards Stories 2.12 to 2.16, and Epic 2 ends at 2.14.
//
// ## The silhouette is `dashed`, and it is the one already in use
//
// `Marker`'s dashed ring is this language's existing mark for *not yet* — the
// bar panel draws it for a held answer, and search draws it while the universe
// is in flight. It is deliberately **not** the square, which marks the one
// condition that needs somebody to go and look at something. Nobody needs to
// look at this.
//
// Note the trap `CLAUDE.md` records: `Marker` renders nothing at all unless
// something above it sets `--marker-color`. This component's own stylesheet
// sets it, which is why the primitive is usable here without a consumer having
// to remember.

export interface RegionPlaceholderProps {
  /**
   * Who fills this region, written for a reader rather than for a backlog:
   * `"Epic 5 — Anomaly Detection"`.
   *
   * The word "Filled by" is supplied here so that five call sites cannot drift
   * into five phrasings of one sentence.
   */
  readonly filledBy: string;
}

export function RegionPlaceholder({ filledBy }: RegionPlaceholderProps) {
  return (
    <div className={styles.placeholder}>
      <Marker shape="dashed" />
      <p className={styles.label}>Filled by {filledBy}</p>
    </div>
  );
}
