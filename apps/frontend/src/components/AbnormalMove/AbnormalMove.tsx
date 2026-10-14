import { memo } from "react";

import { cx } from "../../cx.js";
import {
  NO_RETURN,
  fiveMinuteReturnBand,
  type ReturnBand,
  type SymbolReturnView,
} from "../../market/index.js";
import { PriceChange } from "../PriceChange/PriceChange.js";
import { useWaited } from "../MarketProxyStrip/use-waited.js";
import styles from "./AbnormalMove.module.css";

// `Abnormal-move indicators` — **one band, and the region is named for what
// Epic 5 fills it with progressively** (Task 5.2.3).
//
// Story 5.1's hand-off, item 6: this region is filled band by band and this is
// the **first** figure in it, not the story that finishes it. Stories 5.3, 5.5
// and 5.6 each add their own band.
//
// ## It reserves THIS band and not one pixel for the score
//
// The owner's decision, and the arithmetic is why. 5.6's score is unbuilt, so
// reserving for it is a guess that story both **re-measures and steps** —
// paying twice — and an empty reserved band is the picture Story 4.7 routed as
// a defect, where *a gateway that is behind* and *this is next year's* are one
// picture. **The accepted cost is one step per story that adds a band**,
// recorded as a probed figure per width in this task's record so 5.3/5.5/5.6
// amend a measurement rather than inherit a guess.
//
// ## The band is one height in every state, at a width
//
// The region sits in a column of three with `Relative performance` below it, so
// a band that grows when a figure arrives moves that region under the reader —
// `Movers` paid 81 px for discovering it the other way round. Every row
// reserves its own room in `AbnormalMove.module.css`, band by band, which is
// the neighbour's idiom exactly.
//
// ## And it says nothing about the feed
//
// No threshold, no status word, no connection word, no second staleness
// sentence (AC 6). The qualifier states two instants and lets the reader
// subtract; the one home for *the feed has stopped* is the status bar.

export interface AbnormalMoveProps {
  /** The security this page is about. */
  readonly symbol: string;
  /**
   * The 5-minute return the backend sent, or `undefined` before the first
   * `return` frame.
   *
   * **Not the whole `LiveFeedView`**, which would make this component a second
   * place that decides what the feed's words mean — `RelativePerformance`'s
   * own argument for taking the resolved row rather than the view.
   */
  readonly symbolReturn: SymbolReturnView | undefined;
}

export const AbnormalMove = memo(function AbnormalMove({
  symbol,
  symbolReturn,
}: AbnormalMoveProps) {
  const band = fiveMinuteReturnBand(symbol, symbolReturn);

  if (band.nothing) return <HeldRoom band={band} />;

  return (
    <div className={cx(styles.region)}>
      <Band band={band} />
    </div>
  );
});

/**
 * **The band's room, held and invisible, with one sentence over it.**
 *
 * `RelativePerformance`'s `HeldRoom` exactly, including the two-box
 * arrangement: a one-box version — `visibility: hidden` with a `visible`
 * override on the same element — un-hides every reserved row along with the
 * sentence, because `visibility` is inherited. That was live for ten days one
 * region over.
 *
 * The sentence is behind the proxy strip's **2,000 ms** floor rather than a
 * second one of this region's: an ordinary load's first frame lands at
 * 174–277 ms, so the ordinary case never shows it, and a region still empty
 * after two seconds says so instead of holding a titled empty box for ever.
 * **On CI this is the permanent state** — 516 securities and zero bars, so the
 * window is empty and no `return` frame can carry a figure.
 */
function HeldRoom({ band }: { readonly band: ReturnBand }) {
  const waited = useWaited(true);

  return (
    <div className={cx(styles.room)}>
      <div className={cx(styles.reserved)} aria-hidden="true">
        <div className={cx(styles.region)}>
          <Band band={band} />
        </div>
      </div>
      {waited ? (
        <p className={cx(styles.nothingArrived)}>{NO_RETURN}</p>
      ) : undefined}
    </div>
  );
}

/**
 * One band: a micro label, the figure, the qualifier and the tape.
 *
 * **The label's micro properties are SPELLED rather than composed**, which is
 * `MarketProxyStrip`'s 2026-09-26 defect and both ranked regions' inheritance:
 * `composes: microLabel` followed by a declaration that disagrees with it
 * reads like an override and is not one — `composes` concatenates class names,
 * so which rule wins is **stylesheet order**. This label is a word and a
 * figure, which is exactly the content that makes the failure visible — and
 * `a-compose-never-carries-an-override` refuses the shape by name.
 */
function Band({ band }: { readonly band: ReturnBand }) {
  return (
    <div className={cx(styles.band)}>
      <p className={cx(styles.label)}>{band.label}</p>

      {/*
       * **The figure, or a stated word — never a dash.** `—` is `unchanged` in
       * `PriceChange`, so a dash here asserts a zero return; a refusal has no
       * digits at all (ADR 0029). `PriceChange` carries the sign and the
       * `aria-hidden` glyph, because colour is never the sole encoding: the
       * price palette differs by 1.04:1 in greyscale.
       */}
      <p className={cx(styles.figure)}>
        {band.move === undefined ? (
          <span className={cx(styles.absent)}>{band.absent ?? NBSP}</span>
        ) : (
          <PriceChange
            change={band.move.change}
            direction={band.move.direction}
          />
        )}
      </p>

      {/*
       * **The two instants, oldest first, and how much of the span was
       * observed.** Three lines of room are reserved whether or not it draws:
       * the clause wraps to three at 390, and a region whose height depended on
       * whether a pair had been found would step the page every time one was.
       */}
      <p className={cx(styles.qualifier)}>{band.qualifier ?? NBSP}</p>

      {/*
       * **Which tape the figure came from** — invariant 6, one short line for
       * the region rather than a second copy of the chart's source note. The
       * room is kept and the ink is not drawn where there is no figure to
       * attribute.
       */}
      <p className={cx(styles.tape)}>{band.tape ?? NBSP}</p>
    </div>
  );
}

/** Room and nothing else, where a line would be. */
const NBSP = " ";
