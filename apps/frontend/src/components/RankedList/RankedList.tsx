import { memo, useId, useLayoutEffect, useRef } from "react";

import type { SectorLadderStep } from "@marketpulse/shared";

import { cx } from "../../cx.js";
import {
  barFraction,
  ladderTicks,
  type PriceDirection,
  type SectorRow,
} from "../../market/index.js";
import { PriceChange } from "../PriceChange/PriceChange.js";
import styles from "./RankedList.module.css";

// A ranked list of rows with a signed figure — **drawn once, for two uses**
// (Task 4.3.5, `The ranked list.dc.html`).
//
// Sectors (Story 4.3) is this component with `bar: "signed"`; movers (Story 4.5)
// is the same component with `bar: "none"`. The reason to say so before the
// second one exists is that **the two lists are never on screen at the same
// size** — eleven rows in one column against a top-five each way in a split
// region — so a treatment written twice would diverge and nobody would ever see
// both versions together to notice. This product has paid for that drift once,
// when `BarSeriesPanel` grew a second copy of a provenance line a hundred pixels
// above the surface that owned it.
//
// ## Five tracks, four of them fixed, and the one that is not is the bar
//
// That is the load-bearing decision and it is a measurement rather than a
// taste. **If any track left of the bar sized to its content, the bar's left
// edge would depend on which sector happened to be in the row** — so a
// re-order would move all eleven bars' origins, and eleven bars whose origins
// move are eleven bars you cannot compare. Invisible to jsdom, to axe, to every
// unit test and to a screenshot of one state; `RankedList.module.css` states
// every track at every width for that reason.
//
// ## It composes rather than reinvents
//
// `PriceChange` owns the glyph, the sign, the colour and the spoken word, and
// **this list spells none of them** — a second speller is a second thing to
// keep in step with a palette that differs by 1.04:1 in greyscale. The arrival
// mark composes `arrivalMark` from the motion layer and this component supplies
// **position only**, which is that vocabulary's own rule.
//
// ## `<ol>` / `<li>`, and DOM order equal to visual order
//
// The honest markup for a ranking, and it hands a screen reader *"list, 11
// items, item 4"* for free — the rank channel at zero cost. A `<table>` would
// need a column header for a rank that is not data about a sector but a
// statement about the list, and would hand a listener a two-axis grid for
// something with one axis.
//
// The consequence is a hard rule Task 4.3.6 inherits: **never re-order with CSS
// `order` or `grid-row`.** That divorces the accessibility tree from the screen
// and hands a screen reader a *different ranking* — invisible to axe, to jsdom
// and to a screenshot. Rows are keyed by symbol so a row keeps its identity
// across a re-order.
//
// ## No live region, and the trigger is a condition
//
// `/` has **zero** `role="status"` regions today, so `FRONTEND-STATE.md` §7's
// region-count argument does not apply here and a different one carries it: the
// rank is a printed number inside a real `<ol>`, so a listener gets *"item 3 of
// 11"* from the platform rather than from an announcement. **Reversal
// trigger**, as a condition: *the first ranked surface on this screen whose
// order answers something the reader asked for.*
//
// ## And it says nothing about the connection
//
// `live` / `stale` / `disconnected` have one home and it is the status bar
// (Story 3.10); `one-home-for-the-feed-words` covers this route by name. Kill
// the feed and this list is byte-identical to whatever it was, because every
// figure on it was true when it was computed and the region's footer says what
// kind of figure it is.
//
// ## What is deliberately not here
//
//   - **`ORDER HELD`** (Task 4.3.6), which is a badge in the region's head
//     rather than anything in this list — and **the hold needs no code here at
//     all**, which is the finding worth keeping. A held list is a props order
//     that did not change, so the FLIP below does nothing and the release is one
//     ordinary re-order carrying every pending move. One path, one commit.
//   - **No fourth mark.** A mark saying *this row moved* is information a reader
//     can only use by remembering where it was; the movement carries both
//     positions and the ordinal is the persistent record.
//   - **No emphasis on the extreme rows.** First and last against a full-height
//     zero rule are already the two most legible positions. If *at a glance*
//     needs strengthening the lever is **weight**, never ink outside the
//     contrast floor.
//   - **No hover affordance and no pointer cursor.** Nothing here navigates
//     until Story 4.6, and a row that looks clickable and is not is worse than
//     one that plainly is not.
//
// ## The rule Story 4.6 inherits, written down so it cannot be invented
//
// The day these rows become activatable, four things are already decided by the
// treatment above and none of them is a preference (Task 4.3.6):
//
//   - **One tab stop for the region**, not eleven. The region's own box is the
//     stop today, because `Panel` makes a `scrollable` section focusable, and
//     eleven more would put a ranked list between a reader and the rest of the
//     page.
//   - **Rows are reached with the arrow keys**, inside the list.
//   - **The roving `tabIndex` is keyed on the `symbol`, never on the index** —
//     for the same reason the React key is. A re-order that moved focus by
//     position moves it to a **different sector** while the reader's hands are
//     still, and the hold does not save them: focus inside the region holds the
//     order, so the dangerous case is the frame that lands as focus arrives.
//   - **Activation resolves against identity, never position**, and anything
//     carrying a description gets `aria-disabled` rather than `disabled` —
//     a natively disabled control is not focusable, so a description hung off
//     one is unreachable. That shipped for two tasks once already.

/** The em dash a row with no rank shows. `UniverseTable`'s own constant. */
const NOT_APPLICABLE = "—";

/**
 * **The trailing group's heading, and the reason it is a heading rather than a
 * twelfth row** (Task 4.3.7).
 *
 * Rows with no rankable figure are a **separate list with its own heading, not
 * the tail of the `<ol>`**. Positions 10 and 11 of an ordered list are a claim
 * made by *markup* rather than by prose: a screen reader announces
 * *"item 10 of 11"* over a row this product is explicitly refusing to rank, and
 * no amount of drawn em dash in the rank column reaches that announcement.
 * ADR 0029's rule is that a claim about data requires data, and an ordinal is a
 * claim.
 *
 * **The words are `Ranked`'s own negation**, which is why nothing is invented
 * here: the region head's slot says `8 of 11 ranked` and this says `Not ranked`,
 * so a reader meets one vocabulary twice rather than two words for one idea. It
 * says nothing about *why* — the reason differs per row and the row's own figure
 * column carries it (`None stored`, `No stored close`, a session's close) —
 * and it names no feed, no venue and no connection word, which have one home
 * two hundred pixels below.
 */
const NOT_RANKED = "Not ranked";

/** The reserved heading's content — room and nothing else. */
const NBSP = "\u00a0";

/** What was on screen before this commit: the symbols drawn, and their bases. */
interface DrawnOrder {
  /** `symbol` → the index it was drawn at. */
  readonly at: ReadonlyMap<string, number>;
  /** `symbol` → {@link SectorRow.basis}, so a changed basis can refuse to move. */
  readonly basis: ReadonlyMap<string, string | undefined>;
}

const drawnOrderOf = (rows: readonly SectorRow[]): DrawnOrder => ({
  at: new Map(rows.map((row, index) => [row.symbol, index])),
  basis: new Map(rows.map((row) => [row.symbol, row.basis])),
});

/**
 * **The movement: measure, commit, invert, release** — `The order that
 * changes.dc.html` §03, and the commit is React's.
 *
 * ## Four steps, and step 2 has already happened when this runs
 *
 * A layout effect runs after the DOM has been re-ordered and the ordinals have
 * changed with it, which is the drawing's step 2 — *the moment the list becomes
 * true*. So the order of the remaining three is inverted from the naive reading:
 * the boxes are measured **after** the commit and the previous **index** is what
 * is remembered, which is the same arithmetic from the other end and one that
 * cannot hold a stale rectangle. Eleven `offsetTop` reads, **once per re-order**
 * — a frame that changes no positions returns before touching the DOM at all.
 *
 * `offsetTop` rather than `getBoundingClientRect`: a rect **includes the
 * transform**, so a second re-order arriving mid-travel would measure a box part
 * way through its own gesture and invert the wrong distance. `offsetTop` is the
 * layout position, which is the only thing the FLIP is about.
 *
 * ## The two events are separated in time, and it is one token used twice
 *
 * `--motion-duration-settle` of stillness, then `--motion-duration-settle` of
 * travel — stated **once**, in `.row`'s `transition` shorthand, as the same
 * token in the delay and the duration positions. Nothing here knows a number:
 * a hard-coded delay would leave a reader who asked for less motion waiting
 * 240 ms for nothing, because the stylesheet resolves both halves to `0ms`
 * together and no JavaScript can see that it did.
 *
 * ## Nothing is ever left transformed, and there is no `transitionend`
 *
 * The inverse and its release are written in **one commit**: the transform is
 * applied with the transition suppressed, one forced reflow makes that the
 * before-change style, and then both inline declarations are **removed** — so
 * the element's resting state is `transform: none` before this function
 * returns, and what the transition animates is the removal. There is nothing
 * left to clear, on a timer or on an event.
 *
 * That is the whole answer to the trap the drawing draws: a zero-duration
 * transition may not fire `transitionend`, and a treatment that cleared its
 * inverse there leaves a row sitting 81 px down on its neighbour's line **with
 * every printed ordinal correct** — which is what would make it survive a
 * review. Under `prefers-reduced-motion` the removal simply takes effect, and
 * the row is in its new place with its new number.
 *
 * ## A first order is not a re-order
 *
 * `arrivalKey`'s shipped rule with one word changed: a row travels only if it
 * had a previous position **under the same basis** (see
 * {@link SectorRow.basis}). So a browser's first order is drawn flat, and the
 * opening bell's wholesale basis change is a new list rather than eleven
 * simultaneous re-orders.
 *
 * ## And it is not the mark
 *
 * A row can move without marking and mark without moving. The disc keeps firing
 * off `arrivalKey` — the observation's own identity — because a disc on a row
 * that only changed rank claims data that did not arrive, and **nothing below
 * `pnpm e2e` separates the two**. This function never touches it.
 */
function useSettle(rows: readonly SectorRow[]) {
  const list = useRef<HTMLOListElement | null>(null);

  // Written and read **only inside the effect below**, which is the line the
  // React Compiler's `refs` rule draws: a ref read during render is what it
  // rejected in `SecuritySearch`, correctly.
  const drawn = useRef<DrawnOrder | null>(null);

  useLayoutEffect(() => {
    const element = list.current;
    if (element === null) return;

    const previous = drawn.current;
    drawn.current = drawnOrderOf(rows);

    // The first order a browser draws is drawn flat.
    if (previous === null) return;

    // **The cheap comparison first, before any layout is read.** Most frames
    // change no positions at all — a frame carries about 7% of the universe —
    // and the whole cost of this treatment on those frames is this loop.
    const moved = rows.filter((row, index) => {
      const was = previous.at.get(row.symbol);
      return (
        // **A held row is room rather than a row and never travels** (Task
        // 4.5.3). It has no basis, so the basis clause below would admit it —
        // and a pad holds a position no reader could have read, so moving one
        // is 240 ms of invisible transform. The pads sit at the tail and are
        // keyed positionally, so today nothing would move anyway; this is the
        // refusal stated rather than inferred from where the padding happens
        // to be.
        row.held !== true &&
        was !== undefined &&
        was !== index &&
        previous.basis.get(row.symbol) === row.basis
      );
    });

    if (moved.length === 0) return;

    const items = [...element.children].filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    );

    // Every slot's layout position, read once. The rows occupy the same set of
    // positions before and after — only which row is in which slot changed — so
    // one array answers both ends, and every offset comes out a multiple of the
    // row pitch.
    const tops = items.map((item) => item.offsetTop);

    const inverted: HTMLElement[] = [];

    for (const [index, row] of rows.entries()) {
      if (!moved.includes(row)) continue;

      const was = previous.at.get(row.symbol);
      const from = was === undefined ? undefined : tops[was];
      const to = tops[index];
      const item = items[index];
      if (from === undefined || to === undefined || item === undefined)
        continue;
      if (from === to) continue;

      item.style.transition = "none";
      item.style.transform = `translateY(${String(from - to)}px)`;
      inverted.push(item);
    }

    if (inverted.length === 0) return;

    // One forced reflow for the whole list, which is what makes the inverse the
    // **before-change style** the transition runs from. Reading a layout
    // property is the flush; the value is deliberately discarded.
    void element.offsetHeight;

    for (const item of inverted) {
      item.style.transition = "";
      item.style.transform = "";
    }
  }, [rows]);

  return list;
}

/**
 * The bar, and the scale it is drawn against — **one prop, so a scale for no
 * bar is not representable**.
 *
 * The drawing states them as two (`bar`, `scale`) with *required when `bar` is
 * `"signed"`, refused otherwise*; a discriminated union is that sentence as a
 * type rather than as a runtime check. `"none"` is **Story 4.5's slot**: a
 * top-N over 518 has a far wider dynamic range and its five members are near
 * the top of it by construction, so five bars all within a whisker of full
 * length carry almost no information — a real difference rather than a taste,
 * and it is already decided.
 *
 * The caller owns the rung and its outward-only ratchet, because the ratchet is
 * **session state** and a component that held it would reset it on every
 * remount.
 */
export type RankedListBar =
  | { readonly kind: "signed"; readonly scale: SectorLadderStep }
  | { readonly kind: "none"; readonly scale?: never };

export interface RankedListProps {
  /**
   * The rows, **in the order they are to be drawn**.
   *
   * The component never sorts. Ordering is where *two figures that read the
   * same on screen never swap* lives, and that rule belongs beside the data —
   * in `packages/shared`, server-side, for the reason Story 4.5 ranks
   * server-side.
   */
  readonly rows: readonly SectorRow[];
  readonly bar: RankedListBar;
  /**
   * The accessible name for the list itself — **a string or a reference, never
   * both**, which is why it is a union rather than two optional props.
   *
   * A `<ol>` inside a named region is already reachable, but the two uses put
   * **two** lists in one region (`Movers`' gainers and losers, each ranked from
   * 1), so the name is the caller's from the first commit rather than added
   * when the second list arrives.
   *
   * **Which form is right is a question about the screen rather than a
   * preference**, and this component already answers it once, two hundred lines
   * down, for the trailing group: *the heading is on screen and a listener gets
   * the same words from the same string — one fact, one home.* So:
   *
   *   - **A string** where there is no visible list heading to point at.
   *     Sectors is one list in a named panel and has none.
   *   - **`{ labelledBy }`** where there is. Movers draws two visible `h3`s,
   *     and the string form would put a second copy of each heading's words in
   *     the markup for a listener to meet twice.
   */
  readonly name: string | { readonly labelledBy: string };
  /**
   * **Whether this use can produce a row with no rankable figure** — and it is
   * required rather than optional so that the next use *decides* rather than
   * inherits.
   *
   * The trailing group's heading reserves its room in **every** state
   * (Task 4.3.7), which costs 25 px of held height whether or not a row is
   * quiet. That reserve was bought for a real hazard and it is the sector
   * region's: a sector can go quiet mid-session, and at 390 the grid row is
   * content-sized, so without the reserve the whole lower page steps the first
   * time a figure fails to arrive.
   *
   * **Movers has no such hazard.** Story 4.5's AC 5 says a name with no current
   * observation cannot appear in either list, so the quiet group has zero
   * members in every state there is, for ever — and with two lists on one screen
   * the reserve is **50 px held for a group that cannot exist**, which in a
   * 389 px content budget is the difference between five rows and four.
   *
   * `"impossible"` therefore renders **neither the group nor its reserve**, and
   * nothing of either reaches `textContent`. A keyless row handed to a list that
   * has declared the group impossible is a producer defect rather than a state
   * to draw: it is not drawn at all, because the alternative is an ordinal
   * announced over a row this product is refusing to rank.
   */
  readonly quietGroup: "possible" | "impossible";
}

/** The accessible name, as the one attribute the chosen form writes. */
const ariaLabel = (name: RankedListProps["name"]) =>
  typeof name === "string" ? name : undefined;

const ariaLabelledBy = (name: RankedListProps["name"]) =>
  typeof name === "string" ? undefined : name.labelledBy;

export const RankedList = memo(function RankedList({
  rows,
  bar,
  name,
  quietGroup,
}: RankedListProps) {
  const signed = bar.kind === "signed";

  /*
   * **The split, and it is a partition rather than a filter with a fallback.**
   *
   * A row has a rank or it has not; `sector-ranking.ts`'s absent-key rule
   * guarantees the ranked ones come first, so `ranked` is a prefix and `quiet`
   * is the tail — nothing is re-ordered here and no figure is read, which is
   * what keeps *two figures equal at displayed precision never swap* a property
   * of the one comparator in `packages/shared`.
   */
  const ranked = rows.filter((row) => row.rank !== undefined);
  const quiet =
    quietGroup === "impossible"
      ? []
      : rows.filter((row) => row.rank === undefined);

  /*
   * **The settle sees the ranked rows only, and that is a correctness
   * requirement rather than a tidy-up.** The FLIP indexes into
   * `element.children`, so the array it measures must be exactly the `<ol>`'s
   * children — handed all eleven while the list holds eight, every `to`
   * position would be read off the wrong row and rows would travel to places
   * they were never in. A row crossing from quiet to ranked cannot animate
   * either way, because its `basis` was `undefined` and is now not.
   */
  const settle = useSettle(ranked);

  /*
   * **Whether a bar is drawn anywhere, which is what licenses the axis and the
   * ladder** (ADR 0029, and Task 4.3.7's done-when 2 one clause wider than the
   * figure column).
   *
   * A printed `±1%` ladder under eleven rows that drew no bar is a scale for a
   * quantity nothing on screen shows — the fully-formed record about zero rows.
   * On CI that is the permanent state. So the axis is not drawn and the ladder's
   * ticks are not printed, while the ladder's **room** is kept, because the room
   * is what keeps this region one height in every state.
   */
  const anyBar = signed && ranked.length > 0;

  const quietHeadingId = useId();

  /*
   * **The row's anatomy follows from the bar, because the bar is what the two
   * geometries differ about** (Task 4.5.1).
   *
   * With a bar, every track left of it is a fixed length — otherwise the bar's
   * origin depends on which row happened to be drawn — and the label leads,
   * because `XLK` means nothing and the name identifies. With no bar there is
   * no origin to protect, so the one track that may flex is free to be the one
   * that needs to: the name, which at 50 characters is three times the longest
   * sector label. And the **ticker leads**, because `NVDA` means something and
   * is this product's primary identifier everywhere else — the search field,
   * the URL, the universe table, the identity block — so the thing Story 4.6
   * makes activatable is the thing the reader meets first.
   *
   * **Reversal trigger**, as a condition: *the first use that wants the bar off
   * and the label leading.* It would make this a third prop rather than a
   * consequence, and nothing today needs it.
   */
  const layout = signed ? "sector" : "mover";

  return (
    <div className={cx(styles.plot, signed ? undefined : styles.movers)}>
      {/*
       * **The zero rule and the ladder gridlines: one element for the whole
       * list**, behind the bars.
       *
       * A *full-height* hairline means one line down all eleven rows rather
       * than eleven 26 px segments with a 1 px break at every separator. It is
       * a grid item in the bar's own column, so it takes that column's
       * geometry from the same track list the rows do and **337.6 px is never
       * typed**.
       *
       * `position: sticky` would do nothing here and would fail silently:
       * `Panel` passes `scrollable` unconditionally, so the panel *is* the
       * nearest scrollport and a sticky element never offsets from its own —
       * measured, the viewport top came back −400 px. The ladder below is
       * therefore an ordinary block.
       */}
      {anyBar && (
        <div className={cx(styles.rules)} aria-hidden="true">
          <span className={cx(styles.gridline, styles.gridlineLow)} />
          <span className={cx(styles.gridline, styles.gridlineHigh)} />
          <span className={cx(styles.zero)} />
        </div>
      )}

      {/*
       * **No `<ol>` at all when nothing is ranked**, which is what makes CI's
       * permanent state coherent rather than a ranking of nothing: 518
       * securities and zero bars means all eleven are `unknown` there for ever,
       * and an ordered list of eleven unranked rows is the false impression with
       * a role attribute on it. The eleven rows still render — the **set** is
       * known from the universe and does not depend on any observation, which is
       * the sharpest difference between this region and a movers list.
       */}
      {ranked.length === 0 ? undefined : (
        <ol
          className={cx(styles.list)}
          aria-label={ariaLabel(name)}
          aria-labelledby={ariaLabelledBy(name)}
          ref={settle}
        >
          {ranked.map((row) => (
            <Row
              key={row.symbol}
              layout={layout}
              symbol={row.symbol}
              label={row.label}
              rank={row.rank}
              change={row.move?.change}
              direction={row.move?.direction}
              percent={row.move?.percent}
              price={row.price}
              absent={row.absent}
              arrival={row.arrival}
              scale={bar.scale}
              held={row.held}
            />
          ))}
        </ol>
      )}

      {/*
       * **The printed ladder, which AC 2 requires rather than offers**: a
       * length is a claim about a quantity, so the quantity is printed. Without
       * it the bar means nothing outside this one screen — and with the
       * frame-max normalisation the drawing rejected, a ±0.1% day and a ±5% day
       * are the same picture.
       *
       * **The room is kept and the ticks are not printed when no bar was
       * drawn.** Both halves matter: a scale for a quantity nothing shows is
       * ADR 0029's false impression, and a region whose height depends on
       * whether the feed has spoken is the one thing this drawing's geometry was
       * settled to prevent.
       */}
      {signed && (
        <div
          className={cx(
            styles.ladder,
            anyBar ? undefined : styles.ladderTrailing,
          )}
          aria-hidden="true"
        >
          {!anyBar
            ? undefined
            : ladderTicks(bar.scale).map((tick) =>
                tick.label === undefined ? undefined : (
                  <span
                    key={tick.at}
                    className={cx(
                      styles.ladderTick,
                      tick.at === 25 || tick.at === 75
                        ? styles.ladderMid
                        : undefined,
                    )}
                    style={{ left: `${String(tick.at)}%` }}
                  >
                    {tick.label}
                  </span>
                ),
              )}
        </div>
      )}

      {/*
       * **The trailing quiet group: its own heading, its own list, below the
       * rule.**
       *
       * ## The heading's room is reserved in every state, and that is measured
       *
       * The drawing has no heading when every row is ranked and one when a row
       * is not — so a live page would grow this region the first time a sector
       * went quiet, and shrink it again when the feed caught up. At 1440 and
       * 1024 the region's height is the grid's `1fr` share and nothing would
       * move; at 390 the row is content-sized and the region **is** its content,
       * so the whole lower page would step 20 px on a figure arriving. The
       * reserve is `.rail`'s idiom and the region head's slot's, one row down,
       * and it is what keeps *the region is the same height with eleven figures
       * and with none* an assertion about this component rather than about which
       * state a runner happened to reach.
       *
       * ## `aria-labelledby` rather than a repeated `aria-label`
       *
       * The heading is on screen and a listener gets the same words from the
       * same string — one fact, one home. `useId` because two ranked lists on
       * one page (sectors and, from Story 4.5, movers) would otherwise share an
       * id, which is `Panel`'s own reason for it.
       */}
      {/*
       * **And the reserve itself is conditional on the hazard existing**, which
       * is {@link RankedListProps.quietGroup} (Task 4.5.1). A reserve is held
       * room for a state that can occur; held for a state that *cannot* it is
       * 25 px of nothing per list, and movers has two lists and four hundred
       * pixels. Required rather than defaulted so a third use decides.
       */}
      {quietGroup === "impossible" ? undefined : quiet.length === 0 ? (
        <p className={cx(styles.quietHeadReserved)} aria-hidden="true">
          {NBSP}
        </p>
      ) : (
        <h3
          className={cx(
            styles.quietHead,
            ranked.length === 0 ? styles.quietHeadAlone : undefined,
          )}
          id={quietHeadingId}
        >
          {NOT_RANKED}
        </h3>
      )}

      {quiet.length === 0 ? undefined : (
        <ul className={cx(styles.quiet)} aria-labelledby={quietHeadingId}>
          {quiet.map((row) => (
            <Row
              key={row.symbol}
              layout={layout}
              symbol={row.symbol}
              label={row.label}
              rank={undefined}
              change={row.move?.change}
              direction={row.move?.direction}
              percent={row.move?.percent}
              /*
               * **No price in this group either, and for a reason of its own
               * rather than by inheritance.** The quiet group belongs to the
               * sector anatomy, which has no price cell at any width — and a
               * row we are refusing to rank is one we have no current figure
               * for, so a price beside the words saying so would be the
               * confident half of a claim whose honest half is right next to
               * it.
               */
              price={undefined}
              absent={row.absent}
              arrival={row.arrival}
              /*
               * **No bar cell at all in this group, which is what gives the
               * words their room.** A keyless row has nothing to draw there —
               * `Bar` already returned `null` for every one of them — and the
               * empty cell was costing the absence words the only slack on the
               * row: `2026-09-25 close` needs 82 px and the figure column is
               * 78, so it ellipsised to `2026-09-25 cl…` at 1440, 1024 and 768
               * and fitted only at 390, where that column takes the slack.
               * Found by looking at the picture; every test was green.
               */
              scale={undefined}
              /* A quiet row is a row we are refusing to rank, which is the
                 opposite of a row that is not there. */
              held={undefined}
            />
          ))}
        </ul>
      )}
    </div>
  );
});

/**
 * One row.
 *
 * **A memo boundary on primitive props, which is AC 6 and Task 3.6.5's
 * precedent.** Its props are strings and numbers rather than the row object,
 * so the boundary actually holds: the gateway rebuilds the aggregate up to
 * sixteen times a minute and a minute's burst moves a handful of the eleven
 * figures, so the rows that did not change do not re-render at all. Handing it
 * `row` instead would make every prop a fresh object identity and the memo a
 * comment.
 */
const Row = memo(function Row({
  layout,
  symbol,
  label,
  rank,
  change,
  direction,
  percent,
  price,
  absent,
  arrival,
  scale,
  held,
}: {
  /**
   * Which anatomy — see the `layout` const in `RankedList`.
   *
   * **A string rather than a boolean, and the cells are re-ordered in the DOM
   * rather than placed with `grid-column`.** Visual order and DOM order are the
   * same thing in this component by rule: `order` and `grid-row` divorce the
   * accessibility tree from the screen, and a row whose drawn columns read
   * ticker-then-name while a listener is handed name-then-ticker is the same
   * defect one axis over — invisible to axe, to jsdom and to a screenshot.
   */
  readonly layout: "sector" | "mover";
  readonly symbol: string;
  readonly label: string;
  readonly rank: number | undefined;
  readonly change: string | undefined;
  readonly direction: PriceDirection | undefined;
  readonly percent: number | undefined;
  /**
   * The price, already formatted — see {@link SectorRow.price}, which carries
   * the decision about what it may and may not claim.
   *
   * **Rendered in the mover anatomy only**, because the sector row has no
   * price track at any width; a value handed to the sector layout is drawn
   * nowhere rather than squeezed in beside the bar.
   */
  readonly price: string | undefined;
  readonly absent: string | undefined;
  readonly arrival: string | undefined;
  /** Absent when the bar is off — see {@link RankedListBar}. */
  readonly scale: SectorLadderStep | undefined;
  /**
   * Room and nothing else — see {@link SectorRow.held}.
   *
   * `visibility: hidden` plus `aria-hidden` on the `<li>` itself, which is the
   * one place both can be stated once for the whole row: `visibility` is
   * inherited by children that never set it, which is the property that makes
   * this a two-line treatment rather than a per-cell one — and the same
   * property that made the one-box reservation a defect for ten days, used
   * deliberately here because nothing inside a pad ever has to come back.
   */
  readonly held: boolean | undefined;
}) {
  const rankCell =
    rank === undefined ? (
      <span className={cx(styles.rank)}>
        {/*
         * The em dash reads as nothing to a screen reader, which is right for
         * a structurally inapplicable field and is right here too: there is
         * no rank, and the figure column says why in words a listener gets.
         * `UniverseTable` makes the same trade in three columns.
         */}
        <span aria-hidden="true">{NOT_APPLICABLE}</span>
      </span>
    ) : (
      <span className={cx(styles.rank)}>{rank}</span>
    );

  const nameCell = <span className={cx(styles.label)}>{label}</span>;

  const tickerCell = (
    <span className={cx(styles.ticker)}>
      <span className={cx(styles.symbol)}>{symbol}</span>
      {/*
       * **The mark's 8 px slot, reserved in every state including the empty
       * one, from the stylesheet rather than from this list.** Geometry C
       * reused — the proxy strip's static inline slot — because every track
       * left of the bar is fixed to the pixel and the one flexible track is a
       * picture, so there is no slack to be absolute into.
       *
       * The universe table's refusal to reserve width inverts here and its
       * own argument is why: at 518 rows a mark is absent 98% of the time, so
       * reserving 8 px is a permanent cost for a rare event. At eleven of the
       * most liquid funds in the market, each marking about once a minute, it
       * is close to the common case — and it is what makes zero layout shift
       * when a mark fires reachable at all.
       */}
      <span className={cx(styles.markSlot)}>
        {arrival === undefined ? undefined : (
          /*
           * `key` is the mechanism rather than a detail: a CSS animation does
           * not restart when the same animation is re-applied to the same
           * element, so React replacing the node is what makes it run again.
           * `aria-hidden` for the same reason the other three surfaces do it —
           * the information is the figure, and the mark only says *look*.
           */
          <span
            key={arrival}
            className={cx(styles.arrival)}
            data-arrival={arrival}
            aria-hidden="true"
          />
        )}
      </span>
    </span>
  );

  /*
   * **The price: track 4, drawn only in the mover anatomy, and reserved by the
   * stylesheet since Task 4.5.3** — so this cell auto-places into room that
   * already existed and moves nothing (confirmed: the region is 466 px at all
   * four widths with the cell filled, as it was with it empty).
   *
   * **Secondary ink and no weight of its own.** The change is the ranking key
   * and is the row's point; the price is the context that makes it checkable
   * against a public quote. `UniverseTable`'s own rule inverted for the
   * opposite reason — there the price *is* the figure and the ticker is the
   * only strong word.
   *
   * It is **not** `aria-hidden`. A listener gets `1 NVDA NVIDIA Corporation
   * 189.42 up 3.41%`, which is the row read in the order it is drawn, and the
   * price is the one field on it that is not derivable from the others.
   */
  const priceCell =
    price === undefined ? undefined : (
      <span className={cx(styles.price)}>{price}</span>
    );

  const figureCell = (
    <span className={cx(styles.figure)}>
      {change === undefined || direction === undefined ? (
        /*
         * Words instead of digits, which is what tells an absence apart from
         * a figure — weight and hierarchy doing the job rather than ink
         * outside the contrast floor. `--ink-secondary` rather than
         * `--ink-disabled`: this is a sentence a person has to read.
         */
        <span className={cx(styles.absent)}>{absent}</span>
      ) : (
        <PriceChange change={change} direction={direction} />
      )}
    </span>
  );

  const barCell =
    scale === undefined ? undefined : (
      <span className={cx(styles.bar)} aria-hidden="true">
        <Bar percent={percent} direction={direction} scale={scale} />
      </span>
    );

  /*
   * **The mover row's cells are in the drawn order** — rank, ticker, name,
   * price, then the change in the row's last track.
   *
   * **The price arrived on 2026-10-08 (Task 4.5.5) and the prediction held**:
   * the cell auto-places into the track `.movers` has reserved since Task
   * 4.5.3 and the region is the same height with it as without. What the
   * stylesheet still owns is its **absence at 390**, where the track list is
   * four columns and a fifth grid item would be placed in an implicit track —
   * which in a `subgrid` is a second row of the `<li>`, the measured 7 px
   * defect `.bar` paid for once already.
   */
  return (
    <li
      className={cx(styles.row, held === true ? styles.held : undefined)}
      aria-hidden={held}
    >
      {layout === "mover" ? (
        <>
          {rankCell}
          {tickerCell}
          {nameCell}
          {priceCell}
          {figureCell}
        </>
      ) : (
        <>
          {rankCell}
          {nameCell}
          {tickerCell}
          {figureCell}
          {barCell}
        </>
      )}
    </li>
  );
});

/**
 * The bar itself: a band on one side of the anchor, or the anchor tick alone,
 * or nothing.
 *
 * **`0.00%` draws no bar, only the anchor tick**, and a row with no reading at
 * all draws neither. A zero-length band is a claim of no movement; an absent
 * one is not, and the tick is what lets a reading of exactly zero be told apart
 * from a row we have heard nothing about.
 *
 * **The direction is the SAME value `PriceChange` is given**, which is what
 * makes the picture and the number unable to disagree: `directionOf` decides on
 * the **rounded** figure, so a +0.001% move renders `0.00%` with an em dash and
 * draws the anchor tick rather than a 0.025%-wide green sliver beside a figure
 * saying nothing moved. Deciding it here on `percent > 0` was the first draft
 * and was that defect.
 *
 * That is also the single best thing the central anchor buys: **which side of
 * the anchor a bar grows from is a position, not a colour**, so direction
 * survives `grayscale(1)` with the length intact.
 *
 * The fill is `--price-positive` / `--price-negative`, **never the washes**: at
 * 1.15:1 against the page ground an 8 px band of wash is not a light bar, it is
 * an invisible one, and a bar nobody can see is worse than no bar because the
 * layout still says there is one.
 */
function Bar({
  percent,
  direction,
  scale,
}: {
  readonly percent: number | undefined;
  readonly direction: PriceDirection | undefined;
  readonly scale: SectorLadderStep;
}) {
  if (percent === undefined || direction === undefined) return null;
  if (direction === "unchanged") return <i className={cx(styles.anchorTick)} />;

  // Half the track is one side of the anchor, so a full-rung move is 50%.
  const width = `${String(barFraction(percent, scale) * 50)}%`;

  return (
    <i
      className={cx(
        direction === "positive" ? styles.positive : styles.negative,
      )}
      style={{ width }}
    />
  );
}
