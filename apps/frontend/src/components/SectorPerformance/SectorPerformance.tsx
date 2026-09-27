import { memo } from "react";

import { cx } from "../../cx.js";
import {
  SECTOR_CLAIM,
  ladderClause,
  type SectorPerformance as SectorPerformanceView,
} from "../../market/index.js";
import { RankedList } from "../RankedList/RankedList.js";
import styles from "./SectorPerformance.module.css";

// Eleven sectors, ranked, with the region's footer under them (Task 4.3.5).
//
// **The thin half.** `RankedList` draws the rows, the bar and the ladder;
// `sector-performance.ts` reads the frame; what is left here is the footer and
// the decision to compose the two. It is its own component rather than five
// lines in the route for one reason: the region has states worth reviewing side
// by side, and a stateful component dropped into `src/routes/` escapes the
// stories rule silently.
//
// ## Two subjects in one box, produced from one value
//
// `docs/GAPS.md` entry 13's sibling wants **two speakers to agree**, and this
// region has two: the ranking and the footer. States where they can contradict
// each other are exactly the ones where some rows have no move — eight ranked
// rows under a line claiming something about all eleven is two true halves and
// one contradiction, which is the shape that shipped on the market-feed cell for
// four days.
//
// The repair is the one that worked there: **the footer says nothing the rows
// disagree with**. It states what a row *is* (a benchmark ETF) and what the bar
// is drawn against (the rung), and both are true of every row including the ones
// with nothing to draw. The basis, the instant and the session are the screen's
// one source note's, and per-row absences are the row's own words. Task 4.3.7
// owns the honest states and the guard.

export interface SectorPerformanceProps {
  /** The rows and the rung, from `sectorPerformance`. */
  readonly view: SectorPerformanceView;
}

export const SectorPerformance = memo(function SectorPerformance({
  view,
}: SectorPerformanceProps) {
  return (
    <>
      <RankedList
        rows={view.rows}
        bar={{ kind: "signed", scale: view.step }}
        name="Sectors ranked by today’s move"
      />
      {/*
       * **The footer, in two clauses and one line box.**
       *
       * Sentence case at the micro size rather than the uppercase micro label,
       * because it is prose rather than a stamp — `MarketProxyStrip`'s
       * `.qualifier` idiom, one region above, and the two properties are
       * **spelled rather than composed** for the reason that file records: a
       * `text-transform: none` under `composes: microLabel` is not an override,
       * and the first word ever put into one rendered `2026-09-11 · CLOSING
       * PRICES` on this page.
       *
       * The scale clause is its own element so the stylesheet can drop it where
       * it drops the bar — ADR 0029's rule that a clause renders only when its
       * own data is present, and below 37rem there is no bar for it to describe.
       */}
      <p className={cx(styles.claim)}>
        {SECTOR_CLAIM}{" "}
        <span className={cx(styles.scale)}>· {ladderClause(view.step)}</span>
      </p>
    </>
  );
});
