import type { ReactNode } from "react";

import type { MarketFeed } from "@marketpulse/shared";
import {
  distinctSeriesFeeds,
  MARKET_FEED_DESCRIPTIONS,
} from "@marketpulse/shared";

import { Badge } from "../Badge/Badge.js";
import { Button } from "../Button/Button.js";
import { MetricStrip } from "../MetricStrip/MetricStrip.js";
import { cx } from "../../cx.js";
import type {
  BarSeriesScreen,
  BarSeriesView,
  PopulatedBarSeries,
} from "../../market/index.js";
import {
  directionOf,
  formatChangePercent,
  formatPrice,
  seriesWindowFor,
  TIME_WINDOWS,
  windowLabelFor,
  windowPhrase,
} from "../../market/index.js";
import { Marker } from "../Marker/Marker.js";
import { PriceChange } from "../PriceChange/PriceChange.js";
import { PriceChart } from "../PriceChart/PriceChart.js";
import type { StoredHistory } from "../PriceChart/chart-vacancy.js";
import { announceSeries } from "./series-announcement.js";
import type { SeriesPrices } from "./series-facts.js";
import { changePercent, sentenceCase, seriesPrices } from "./series-facts.js";
import styles from "./BarSeriesPanel.module.css";

// One security's bar series — **the chart, and the exact figures the picture
// rounds** (Task 2.10.7, drawn since Task 2.12.4).
//
// ## The fence that used to be here, and why it came down
//
// Until 2026-09-12 this header stated that nothing was plotted — no axis, no
// line, no sparkline, no canvas, no SVG — and `e2e/specs/security-series.spec.ts`
// asserted it. That was Story 2.10's fence, and its purpose was that Story 2.12
// should take the charting decision against a data layer already known to be
// right rather than debug both at once. It worked: `CHARTING.md` §0's
// measurements were taken against a panel with no drawing in it.
//
// It came down deliberately, in the commit that added `PriceChart`, and the
// browser spec was **changed to assert what is now true rather than deleted**,
// so the instrument survives the fence.
//
// ## Nothing stopped being stated, and that is the decision
//
// `CHARTING.md` §5 went through this panel fact by fact and dropped none of
// them. An axis is sampled and it is niced, so it never states an exact figure:
// a value scale rounded to nice numbers deliberately has no tick at the true
// high, and six time labels across 1,950 bars deliberately have none at the
// first instant. **Drawing a fact is not the same as stating it, and this
// product states facts.**
//
// So what changed is arrangement rather than content. The headline moved up
// into the chart's chrome as the current-value reading, and everything else —
// the coverage sentence, the four prices, the two windows, the provenance —
// became the stated-facts block beneath the drawing. A future task that deletes
// those to tidy the region is deleting the thing that makes the region honest.
//
// **Amended 2026-09-14.** That block no longer exists. §74 took four of its
// members off the panel on the test that none of them was the only home of what
// it said, and this change moves the last of them — the four prices — **above**
// the drawing, onto the row the headline was already on. What is under the
// picture now is the reading strip and nothing else, which is the whole point:
// the volume plot is the next thing down the page, and two charts on one axis
// have to be near each other to be read against each other.
//
// ## What it is for, which is not decoration
//
// It is the first thing in this product to render a **series**, and its job is
// to make the data layer's correctness visible while it is still cheap to be
// wrong about. Every fact on it is one somebody can check against the store:
// the window asked for against the window held, the bar count, where the bars
// actually begin and end, the four prices, and which feed they came from.
//
// That is also why the two windows are always both on screen. *"We hold 780 of
// the minutes you asked for, through 16:00"* is the honest shape of this
// product's most common answer, and a panel that showed only the data would be
// a panel that quietly answers a narrower question than the one asked.
//
// ## The shape of the props
//
// **The union whole, one prop, not six.** `UniverseTable` is the precedent and
// the argument is `bar-series-view.ts`'s: a discriminated union exists so the
// impossible combinations cannot be constructed, and spreading it back into
// props hands the renderer the space it just removed. The `switch` below is
// exhaustive, so a seventh member is a compile error here rather than a
// silently missing state.
//
// It is presentational and fetches nothing: `useBarSeries` is called by the
// route, and `retry` arrives as a callback. That is what lets the workshop
// render every one of these states with no backend running, which matters more
// here than it did for the universe table because three of these states need a
// deliberately broken server to produce in a browser.
//
// ## A live region since Task 2.10.8, and the page's second
//
// The words are `series-announcement.ts`', which carries the whole argument:
// why this page has two polite regions rather than one, why every sentence here
// begins with the symbol, and why a stale answer says so out loud rather than
// passing in silence. What is here is the element — persistent, rendered in
// every state, never unmounted, and `role="status"` and never `role="alert"`.
//
// ## The two marks this panel carries that are not about the answer
//
// **Stale** — a request is in flight behind figures that are correct and one
// request old — and **untracked**, which is a property of the *security* rather
// than of this answer. They sit in different places for that reason: the stale
// rail is above the body it qualifies and goes when the answer settles; the
// untracked badge is on the subject header beside the symbol, because it is
// still true whatever the body is showing. Both can be true at once, along with
// a short coverage line, which is exactly why none of the three is allowed to
// take the same position.

export interface BarSeriesPanelProps {
  /**
   * Everything this screen is showing. Taken whole (Task 2.13.7).
   *
   * **Still one prop, and still the whole value** — `UniverseTable`'s precedent
   * and `bar-series-view.ts`'s argument, now applied one level up. Until this
   * task the panel took `BarSeriesView`, because what came back and what was
   * drawn were the same thing. On a window change they are not, and the panel
   * is genuinely about both at once: it reports on the request that was made
   * and it draws the answer that is on screen.
   *
   * Taking them as **two** props would let a caller hand over a pair that
   * disagrees — a `failed` beside a series that is actually this window's
   * answer — which is a screen the application cannot produce and a reviewer
   * cannot tell apart from one it can. `barSeriesScreen` is the only producer,
   * so that combination does not exist.
   */
  readonly screen: BarSeriesScreen;

  /**
   * The security the panel is about, from the address.
   *
   * A prop rather than read off `view.series.symbol`, because four of the six
   * states have no series on them and the panel still has to say what it was
   * asking about. A failure that cannot name its subject is a failure the
   * reader cannot act on.
   */
  readonly symbol: string;

  /**
   * Ask again. Offered only where the state says waiting will help.
   */
  readonly onRetry: () => void;

  /**
   * What changes the window, on the security's own name line (2026-09-13).
   *
   * **It used to be on the region's heading row** — `VOLUME-AND-WINDOW.md` §8.6
   * put it there, on the honest argument that this product has no page-level
   * control bar and inventing one for a single control is chrome arriving before
   * its second occupant. That argument still holds, and what it did not weigh is
   * that a control on a heading row makes *that* region's heading taller than
   * every other region's on the screen.
   *
   * It spent half a day on a row of its own here, which was worse: a row with
   * one right-aligned occupant is two thirds dead space. The ticker's line was
   * empty to its right the whole time — a segmented control in the micro-label
   * idiom is instrument chrome, and instrument chrome belongs on the
   * instrument's name line.
   *
   * It is a slot rather than a component, for the reason this panel takes no
   * router: the window lives in the address, and the address is the route's.
   */
  readonly control?: ReactNode;

  /**
   * What the store holds for this security (Task 2.14.6), from
   * `chart-vacancy.ts` — which of the two empty answers an empty plot is.
   *
   * **The panel does not use it and hands it on**, to the price chart and to
   * the announcement, which is worth saying because a pass-through prop looks
   * like a layering mistake until the reason is written down. The derivation
   * reads the *universe* answer, and this panel is about the *series* one: it
   * has no business fetching a second thing, and the route already holds both.
   * That the same value reaches the drawn sentence and the spoken one is the
   * point — a screen and a screen reader disagreeing about which empty answer
   * this is would be the exact drift this story spends its time preventing.
   */
  readonly stored?: StoredHistory;
}

export function BarSeriesPanel({
  screen,
  symbol,
  onRetry,
  control,
  stored = "unknown",
}: BarSeriesPanelProps) {
  const { shown } = screen;
  return (
    <div className={styles.panel}>
      {/*
       * First in the tree and rendered in every state, which is the whole
       * mechanism rather than a placement: a live region added at the same
       * moment as its content is not reliably announced, and one that is
       * *removed* announces nothing at all. It holds a constant position so
       * React updates it rather than recreating it — the property the browser
       * suite asserts by node identity, because a text assertion cannot see it.
       */}
      <p className={styles.visuallyHidden} role="status">
        {announceSeries(screen, symbol, stored)}
      </p>

      {/*
       * **What qualifies the subject, when anything does** (2026-09-14).
       *
       * This was a header band carrying the ticker and the window control, and
       * both left in the same change. The ticker because the page already sets
       * this security's symbol at display size two blocks above — a panel
       * repeating it was a second answer to *what am I looking at* on a screen
       * that had one — and the control because the figures row below is where it
       * belongs (see `.reading`).
       *
       * What could not leave is the qualification that used to hang off the
       * ticker: an untracked security. It renders `null` when it does not
       * apply, which is the ordinary case, so the row it is in costs no height
       * at all in the state the panel is usually in. That is the property the
       * header band never had.
       *
       * **There were two until 2026-09-16**, and the other was
       * *"Showing a default security. Search for another one above, or open one
       * directly at /securities/SYMBOL."* It was a paragraph of instructions
       * sitting on top of the panel's own figures, and what it explained is now
       * answered by the layout instead: the search field moved onto the page's
       * heading row, where it is the second thing on the screen rather than
       * something to be pointed at from below. The prop it needed left with it.
       */}
      <Notes untracked={isUntracked(shown)} />
      {/*
       * **The figures, and beside them what happened to the request**
       * (2026-09-13; the four prices joined them 2026-09-14).
       *
       * The rail needs a permanent partner or it moves the chart when it
       * appears, and this row is the best one in the panel: the close is set at
       * display size, so a line — or two — of secondary text beside it is
       * **inside** the height the figure already spends. §71's reservation
       * survives underneath for the widths where it is not.
       *
       * It is also where the sentence belongs to be read. A reader whose screen
       * did not change when they pressed a window asks *what am I looking at*,
       * and the answer sits against the one number they were looking at.
       */}
      <div className={styles.reading}>
        <Figures screen={screen} />
        {/*
         * **What changes the window, and what happened last time you did**
         * (2026-09-14), in one right-hand column.
         *
         * The column is a measurement rather than a preference. The control has
         * now been in three places — the region's heading, where it made *that*
         * heading 14px taller than the one in the panel beside it; a row of its
         * own, where it was one right-aligned occupant and two thirds dead
         * space; and the ticker's line, which went when the ticker did. This row
         * is where it belongs, because it belongs beside the numbers it changes.
         *
         * What it cannot do is sit *in line* with them. Measured at 1440, where
         * the panel is 889px: the headline is 170, the strip will not read below
         * about 190, the rail's basis is 288 and the control is 232 — 954 before
         * the gaps. The control wrapped to a second line and the row went from
         * 61px to 105px, which is the opposite of the change this is.
         *
         * So the two right-hand occupants stack instead of competing. They are
         * the same subject in the order a person meets them: the control is what
         * you press, and the rail is what the press did. The rail keeps its own
         * reservation inside this column, so nothing below moves when it speaks.
         */}
        <div className={styles.aside}>
          <div className={styles.control}>{control}</div>
          <Rail screen={screen} onRetry={onRetry} />
        </div>
      </div>
      {/*
       * **The chart, under the figures it is a picture of** (Task 2.12.4; the
       * figures moved above it 2026-09-14).
       *
       * It takes the view whole and fetches nothing, exactly as this panel
       * does, so the workshop can render it with no backend running. It draws
       * its frame in every state that has a window — including before the first
       * answer, which is `PRODUCT_SPEC.md` §28's 500 ms satisfied by the frame
       * rather than by the response.
       */}
      <PriceChart
        pending={screen.pending}
        stored={stored}
        symbol={symbol}
        view={shown}
      />
      {/*
       * **The body follows the picture, not the request** (Task 2.13.7), and it
       * is almost nothing now.
       *
       * The rule it exists for is unchanged and is the one that matters: every
       * figure on this panel is a figure of the series that is *drawn*, never
       * of the request in flight, because a chart of one window over the
       * numbers of another is the defect this panel exists to make impossible.
       * `Figures` above takes the same `shown` for exactly that reason.
       *
       * What is left here is the states with no picture — and, for the two that
       * have one, the provenance, which renders nothing until a series names
       * two feeds (§74.1). It returns `null` rather than an empty wrapper, so
       * the panel's stack gains no gap under the chart.
       */}
      <Body
        view={shown}
        onRetry={onRetry}
        retryHere={screen.previous === null}
      />
    </div>
  );
}

/**
 * Every figure this panel states, on one row above the picture.
 *
 * **The headline** is the one moved by `CHARTING.md` §5: the figure a person
 * reads before they read anything else belongs with the picture it is the end
 * of, and the value scale is on the right for the same reason — the latest
 * price, the last point of the line and the scale all land in the same place.
 * It stays a number in the DOM, in the data face, and is never a label drawn on
 * the line.
 *
 * **The prices joined it on 2026-09-14**, from beneath the drawing. The reason
 * is not this row's convenience, it is the row *below* the drawing: the volume
 * plot hangs on the price plot's axis, and everything between the two is
 * distance a reader has to carry a shape across. The strip was the last thing
 * in this panel standing there.
 *
 * **`CLOSE` came back on 2026-09-15, one day after it left**, and the reversal
 * is worth stating because the argument that removed it was correct and was
 * about a different question. It left because the headline beside it *is* the
 * close, so the strip was restating in the quietest type on the row the one
 * figure a reader cannot miss. What that misses is the figure two inches
 * **above** this panel: the identity block's `LAST SESSION CLOSE` is the
 * session's official close from a stored daily bar, this headline is the last
 * **minute** bar of the window, and on 2026-09-11 they read `218.29` and
 * `218.19`. A reader who notices asks which one is wrong, and the answer —
 * neither, they are different measurements — has to be legible from the screen.
 *
 * `1D CLOSE` in the window vocabulary the other three already speak is what
 * makes it legible: it says this number is *of the window*, which is exactly
 * what the one above it is not. The restatement stopped being redundancy the
 * moment there was a second close on the page to tell it apart from.
 *
 * They are one element rather than two occupants of `.reading`, and that is
 * load-bearing: with three independent items the rail could wrap *between* the
 * close and the prices it is a statement about, which is the one arrangement
 * that would be actively wrong.
 *
 * **The settle flash lives here now**, keyed exactly as it was. Task 2.10.8
 * owes a mark for the moment a held answer is replaced by a fresh one — and
 * owes it *only when something changed*, because a refetch landing on an
 * identical answer is the common case for a closed session's bars and must pass
 * in silence. The signature below is the whole implementation: React remounts a
 * keyed element when its key changes and leaves it alone when it does not, so
 * no previous-value ref and no second copy of *which fields count as the
 * answer* exists to drift from the ones on screen. It is a background wash and
 * never a transform, so no number is harder to read while it plays.
 */
function Figures({ screen }: { readonly screen: BarSeriesScreen }) {
  const series = readableSeries(screen.shown);
  if (series === null) return <FiguresReservation />;

  const prices = seriesPrices(series);
  const percent = changePercent(prices);

  /*
   * **The window the figures on screen are *of*, which is not always the one in
   * flight** (2026-09-14).
   *
   * `previous ?? asked` is `held-series.ts`'s own rule read the other way round:
   * `previous` is non-null exactly when the answer on screen belongs to a window
   * other than the one being fetched, so it is the shown series' window whenever
   * it exists and `asked` is when it does not.
   *
   * This is the whole reason the qualifier is worth more than it costs and also
   * the whole reason it is dangerous. A strip reading `1Y OPEN` over five
   * sessions of bars — which is what taking the label off the control, or off
   * `asked` alone, would produce for the second or so a held answer is on screen
   * — is a wrong number rather than a missing one. It is the defect this panel
   * exists to make impossible, in a new place.
   */
  const windowLabel = windowLabelFor((screen.previous ?? screen.asked).window);
  const priceLabel = (name: string) =>
    windowLabel === null ? name : `${windowLabel} ${name}`;

  return (
    <div className={styles.figures} key={settleSignature(series, prices)}>
      <div className={styles.headline}>
        <span className={styles.close}>{formatPrice(prices.close)}</span>
        {percent !== null && (
          <span className={styles.headlineChange}>
            <PriceChange
              change={formatChangePercent(percent)}
              direction={directionOf(percent)}
            />
          </span>
        )}
      </div>
      {/*
       * The four prices, as a strip rather than as rows of a list.
       *
       * This is the one block on the panel that has to read at a glance, and a
       * label/value list cannot: a reader comparing an open to a close is
       * comparing two figures, and putting a sentence's worth of label between
       * them is what makes a terminal feel like a form.
       *
       * **`compact` since it moved up here.** At `large` it is a headline block
       * of its own, which is what it was while it opened the facts beneath the
       * drawing; beside a figure set at display size it is a qualifier, and two
       * headlines on one row is two answers to *what is the number here*. The
       * label stays at the micro size in both, which is `MetricStrip`'s own
       * rule and the reason the size step is safe to take.
       */}
      <div className={styles.priceStrip}>
        <MetricStrip
          size="compact"
          metrics={[
            { label: priceLabel("Open"), value: formatPrice(prices.open) },
            { label: priceLabel("High"), value: formatPrice(prices.high) },
            { label: priceLabel("Low"), value: formatPrice(prices.low) },
            { label: priceLabel("Close"), value: formatPrice(prices.close) },
          ]}
        />
      </div>
    </div>
  );
}

/**
 * **The figures' reservation — present in layout, absent from everything
 * else** (Task 3.8.3).
 *
 * `Figures` returned `null` in the four states that have no readable series,
 * and the whole block went with it: `.reading` collapsed, and **the chart, the
 * window control and everything below them moved by 90 px** the moment an
 * answer with bars replaced one without. Measured on a populated store at
 * 1024: `.reading` is 182 px with figures and 92 px without, and the control
 * moves from y=450 to y=360.
 *
 * That is worse than a chart that moves. **The control moves too** — the
 * segmented control a reader has just pressed, and is likely to press again,
 * jumps 90 px out from under the pointer when the answer lands. `1D` on a
 * store that has not yet stored today against `1M`, which is every security
 * during a session before Story 3.8's writer had filled it, and any window a
 * security genuinely has no bars in afterwards.
 *
 * **This is the panel's own idiom rather than a new one.** `.rail` has done
 * exactly this since 2026-09-13 for exactly this reason, and its comment
 * carries the argument: a hidden copy of the content is *"the only form of
 * reservation that survives a sentence that wraps at 390px and does not at
 * 1440"*, and a height token would be *"a measurement of one viewport declared
 * as a constant"*. This is that idiom's second consumer in this file.
 *
 * **Why it can be exact rather than generous.** Measured at all four
 * viewports, the strip's height is **42 px at every width** — it does not wrap
 * — and the headline's is **32 px**. So the block's height is a function of the
 * *viewport* (whether the strip sits beside the headline or under it: 52 px at
 * 1440, 82 px below that) and **not of the values in it**. A reservation with
 * the same two children therefore reserves precisely what the real block
 * occupies, at every width, whatever the prices are. If `MetricStrip` ever
 * wraps, that stops being true and this has to hold the widest case instead.
 *
 * **Why the labels are blank rather than `Open`/`High`/`Low`/`Close`.** They
 * would be the honest thing to reserve with, and they cannot be used: a hidden
 * `dt` reading `Open` is still matched by `getByText`, so `security-window-change`'s
 * *"the panel has settled on an answer"* locator would resolve to the
 * reservation and then fail `toBeVisible()` — a test wedged by the fix to the
 * defect it tests. Blank labels have the same line box and the same height, and
 * `MetricStrip` keys on the label, so they differ by a count of spaces that
 * nothing can see and no column width depends on.
 *
 * **And why it is hidden rather than drawn as em-dashes.** ADR 0029: a
 * fully-formed record about zero bars is a false impression rather than a
 * courtesy. A block reading `1D OPEN —` is a figures block about a window that
 * has none. `visibility: hidden` and `aria-hidden` render no claim at all —
 * they only take up the room the real one will.
 */
function FiguresReservation() {
  const blank = (width: number) => NON_BREAKING_SPACE.repeat(width);

  return (
    <div aria-hidden="true" className={cx(styles.figures, styles.figuresSizer)}>
      <div className={styles.headline}>
        <span className={styles.close}>{blank(1)}</span>
      </div>
      <div className={styles.priceStrip}>
        <MetricStrip
          size="compact"
          // One blank label per column. They differ only in how many spaces
          // they are, because `MetricStrip` keys on the label and four
          // identical keys is a React warning; nothing can see the difference
          // and no column width depends on it.
          metrics={[1, 2, 3, 4].map((column) => ({
            label: blank(column),
            value: blank(1),
          }))}
        />
      </div>
    </div>
  );
}

/** The one glyph a reservation is made of: a line box with nothing in it. */
const NON_BREAKING_SPACE = "\u00a0";

/**
 * The series behind the figures, when the answer has bars in it.
 *
 * **The series rather than the prices**, since 2026-09-14: the settle key is
 * computed from the bar count and the coverage edge as well as the close, so a
 * helper that returned only `SeriesPrices` would have the caller reach back
 * into the union for the other two and narrow it a second time.
 */
function readableSeries(view: BarSeriesView): PopulatedBarSeries | null {
  switch (view.state) {
    case "loaded":
    case "partial":
      return view.series;
    case "loading":
    case "empty":
    case "refused":
    case "failed":
      return null;
  }
}

/**
 * Is a newer answer in flight behind the one on screen?
 *
 * Read from the union rather than taken as a prop, because it *is* part of the
 * union — `bar-series-view.ts` carries the argument for the flag living on the
 * three answer members. Only an answer can be stale, so this is total without a
 * default: the other three members have nothing on screen to be one request
 * old.
 */
function isStale(view: BarSeriesView): boolean {
  switch (view.state) {
    case "loaded":
    case "partial":
    case "empty":
      return view.stale;
    case "loading":
    case "refused":
    case "failed":
      return false;
  }
}

/** Is this a security we hold bars for and no longer follow? */
function isUntracked(view: BarSeriesView): boolean {
  switch (view.state) {
    case "loaded":
    case "partial":
    case "empty":
      return view.securityStatus === "untracked";
    case "loading":
    case "refused":
    case "failed":
      return false;
  }
}

/**
 * **What happened to the request, beside the value it is about** (2026-09-13).
 *
 * At most one of the two rails, in the right-hand half of the headline row.
 *
 * ## Why it lives on that row
 *
 * The rail is rendered exactly when somebody presses a window, and it has to sit
 * **above** the picture: §6.3 is explicit that the label saying *which window
 * the picture is of* cannot come after the picture, because a reader's first
 * question about a screen that did not change when they pressed something is
 * *what am I looking at*. A rail in a row of its own therefore pushed the chart
 * down 30px on every press — under the pointer of the person reading it — and
 * reserving a row for it spent that height on every screen in the steady state.
 *
 * The headline row is the one row in this panel that can absorb it for nothing.
 * The close is set at display size; a line, or two, of secondary text beside it
 * is **inside** the height that figure already spends. It is also the row the
 * sentence is about — the held window's close, above the held window's chart.
 *
 * ## The reservation that is left, and why it is still a measurement
 *
 * Two states carry no headline at all — a held `empty`, and every state before
 * the first answer — so the row cannot be relied on to be tall. And at 390 the
 * sentence wraps past the figure's height. So the cell is one grid cell holding
 * every state the rail can be in, with a hidden copy of the in-flight sentence
 * laid out beside the live one: as tall as the tallest of them **at this width**,
 * which is the only reservation that survives a sentence that wraps at 390 and
 * does not at 1440 (`CHARTING.md` §15.4). Where the figure is the taller of the
 * two, it costs nothing at all.
 *
 * What is deliberately *not* reserved is the extra content the refused and failed
 * rails bring — the server's sentence, the retry, the reference. Those are
 * settled outcomes that no press of a window can produce (the control emits only
 * the five counts, and every one of them is answerable), and reserving the
 * tallest of them permanently would put a failure's worth of empty space above
 * every chart in the product.
 */
function Rail({
  screen,
  onRetry,
}: {
  readonly screen: BarSeriesScreen;
  readonly onRetry: () => void;
}) {
  return (
    <div className={styles.rail}>
      {/*
       * The reservation: the sentences this slot could be asked to hold, laid
       * out and hidden. `aria-hidden` and `visibility: hidden` — present in
       * layout and absent from everything else, and with nothing focusable in
       * them they are out of the tab order by construction.
       *
       * **One cell again since 2026-09-16.** It was two from Task 2.14.5:
       * the rail had gained a third occupant, the drawn coverage sentence,
       * whose length is a property of an answer rather than of a closed set of
       * window phrases — so the two reservations were stacked in one grid cell
       * rather than compared as character counts. That sentence is gone (see
       * {@link Settled}) and its reservation went with it, which leaves this
       * slot reserving exactly what it reserved before: the worst in-flight
       * sentence a press of the control can produce.
       */}
      <div
        aria-hidden="true"
        className={cx(styles.railState, styles.railSizer)}
      >
        <div className={styles.railBlock}>
          <RailSentence>{reservedSentence(screen)}</RailSentence>
        </div>
      </div>
      <div className={styles.railState}>
        {/*
         * **One rail position, two subjects** (Task 2.13.7), and they are
         * mutually exclusive rather than stacked.
         *
         * `Refreshing` says *a newer answer to this question is coming*.
         * `HeldWindow` says *this is the answer to a different question, and
         * here is what happened to the one you asked*. A screen showing both
         * would be telling a reader that the picture is one request old **and**
         * about another window, which is two marks for one fact: the held
         * answer is by definition not about to be refreshed, because the
         * request behind it has already been superseded.
         *
         * **A third subject joined them on 2026-09-15** (Task 2.14.5), and it
         * is the one that is *not* exclusive with the other two — a held
         * answer can itself be partial. So the slot has a stated priority
         * rather than a stack, and {@link Settled} is where the second half of
         * it is written.
         */}
        {screen.previous === null ? (
          <Settled view={screen.shown} />
        ) : (
          <HeldWindow screen={screen} onRetry={onRetry} />
        )}
      </div>
    </div>
  );
}

/**
 * **What the rail says when the picture is the answer to the question that was
 * asked** (Task 2.14.5) — which is the half of the priority that is not about a
 * held window.
 *
 * `PROVENANCE.md` §3.2 states the order rather than stacking it, because the
 * slot reserves one sentence's height and two sentences in it is the layout
 * shift the reservation exists to prevent:
 *
 *   1. **A held window**, handled by {@link HeldWindow} above this component.
 *      The picture belongs to a window the reader did not ask for, and until
 *      that is said every other sentence about *the window* is ambiguous about
 *      which one — including the coverage sentence, which would otherwise be
 *      describing a window nobody asked for.
 *   2. **Refreshing**, here. Same genus as the held sentence — an outcome of a
 *      request rather than a property of the picture.
 *   3. **Nothing**, which is now every other case.
 *
 * **There were four until 2026-09-16, and the third was the drawn coverage
 * sentence** — *"Holding 1,170 bars, through 2026-09-11 16:00:00 EDT, of a
 * window running to 2026-09-15 16:00:00 EDT."* — rendered whenever the answer
 * was short of the window asked for. It is gone, and what is gone with it is
 * only the **drawing**: `coveragePhrase()` is unchanged and
 * `series-announcement.ts` still speaks it.
 *
 * That is not a parity break, and the distinction is worth being exact about
 * because it looks like one. Parity is equivalent information through each
 * channel, not identical strings. A sighted reader is told *this stops short*
 * by the picture — `CHARTING.md` §14.1's uncovered ground and coverage edge,
 * the line ending before the frame does — and told roughly *where* by the
 * axis's dated seams. A listener has neither, which is why the clause stays in
 * the announcement. The drawn sentence was a third statement, in the smallest
 * type on the screen, of something already drawn twice.
 *
 * Two full instants to the second, above the figures, on every short answer is
 * also more than the fact is worth: on the deployed store, which is backfilled
 * nightly, most answers are not short at all — this was overwhelmingly a
 * developer's view of a developer's store.
 *
 * **Reversal trigger: an axis a reader cannot read a date off.** The whole
 * argument above rests on the seams carrying dates (ADR 0027); a window whose
 * labels are times, or none, takes the visual half of the parity away and the
 * sentence has to come back — for everyone.
 */
function Settled({ view }: { readonly view: BarSeriesView }) {
  if (isStale(view)) return <Refreshing />;

  return null;
}

/**
 * The exact sentence the reservation is measured against.
 *
 * Not an approximation and not the longest sentence imaginable: it is **the
 * worst case a press of the control can actually produce from here**. The window
 * being held is whatever is on screen now, which is known; the window being
 * asked for is one of the five the control offers, so the widest of those is the
 * other half. A reservation built from the widest phrase in *both* halves
 * over-reserves by a line at every width where that extra clause wraps and the
 * real one does not — measured at 1024, where it put an empty second line above
 * the chart on every screen.
 *
 * The current window is in the candidate set for the second half too, because an
 * address may name a count the control does not offer — `?sessions=1000` — and
 * pressing a window from there holds a phrase no member of `TIME_WINDOWS` is as
 * long as.
 */
function reservedSentence(screen: BarSeriesScreen): string {
  const holding = windowPhrase((screen.previous ?? screen.asked).window);
  const offered = TIME_WINDOWS.map((window) =>
    windowPhrase(seriesWindowFor(window.sessions)),
  );

  const widest = [...offered, windowPhrase(screen.asked.window)].reduce(
    (longest, phrase) => (phrase.length > longest.length ? phrase : longest),
  );

  // **Amended 2026-09-14 (§80): the worst case is now the failure sentence.**
  // The in-flight rail no longer renders — nobody could read it — so the only
  // sentences that can reach this slot are the two settled ones, and `failed`
  // is the longer of them by four characters. Measuring against the in-flight
  // copy would leave the slot short of the sentence that can actually appear,
  // which is a chart that jumps at the moment an error lands.
  return `Still showing ${holding}. ${heldFailureSentence(widest)}`;
}

/**
 * The longest sentence the rail can now put in the slot above the chart.
 *
 * Composed from `outcomeSentence`'s own `failed` arm rather than written out,
 * for the reason the in-flight version had before it: a second copy written for
 * the sizer is a measurement of a sentence this panel does not say.
 */
function heldFailureSentence(asked: string): string {
  return outcomeSentence(
    {
      state: "failed",
      failure: "unreachable",
      requestId: null,
      retryable: true,
      retrying: false,
    },
    asked,
  );
}

/**
 * A newer answer is on its way, and the ones below are held.
 *
 * ## What it must not do, which decided nearly everything about it
 *
 * **It does not touch a single number.** No dim, no blur, no fade, no skeleton
 * replacing a value — `VISUAL-LANGUAGE.md`'s rule is that motion must never
 * make a number harder to read, and dimming a price while an analyst reads it
 * is that failure by another route. The figures below stay at full ink and full
 * weight; what changes is that a line appears above them.
 *
 * **And it does not read as a problem.** These figures are correct. They are
 * one request old, which is a fact about the request rather than about the
 * market, so there is no red, no amber and no box — the marker is the same
 * dashed silhouette `Marker` gives an indeterminate state, and the sentence
 * says *held* rather than *out of date*.
 *
 * ## Why it is a rule that moves
 *
 * The design asked for a marching perimeter and this is that idea at this
 * product's weight: one hairline under the sentence, dashed, travelling. It is
 * the only thing in the application that moves while somebody is reading, and
 * that is deliberate — the bar asks whether a screen *feels alive*, and a panel
 * whose only signal of work in progress is text is a panel that looks frozen
 * during the one second it is busiest.
 *
 * Three things keep it honest. It is **beside** the numbers rather than on
 * them; it is a **texture** rather than a value, so nothing being read is
 * moving; and the duration comes from a token that resolves to `0ms` under
 * `prefers-reduced-motion`, which leaves a static dashed rule that still marks
 * the state. Colour is not the encoding in any of the three cases — the dashes
 * are, and they survive greyscale.
 */
function Refreshing() {
  return (
    <RailSentence>
      Refreshing — showing the held answer while a newer one is read.
    </RailSentence>
  );
}

/**
 * A rail's one line: the dashed marker, and the sentence beside it.
 *
 * One home for the row, because three things render it — the stale rail, the
 * held-window rail, and the hidden reservation that measures the slot they share
 * — and a marker that differed between them would be three marks for one fact.
 */
function RailSentence({ children }: { readonly children: ReactNode }) {
  return (
    <p className={styles.refreshing}>
      <Marker shape="dashed" />
      <span>{children}</span>
    </p>
  );
}

/**
 * **A different window is on screen, and here is why** (Task 2.13.7).
 *
 * The rail `Refreshing` occupies, with a subject. It is rendered exactly when
 * the picture below is the **previous** window's answer, which is the three
 * ways a request can arrive carrying no picture of its own: it is still in
 * flight, it was refused, or it failed.
 *
 * ## Why this is a sentence about *which window* rather than about *what went
 * wrong*
 *
 * `VOLUME-AND-WINDOW.md` §6.3 named the tension and left it here. `refused` and
 * `failed` draw **no frame at all**, deliberately — neither carries a window a
 * frame could be built from — while acceptance criterion 4 asks that a failed
 * window change leave the previous data visible. Those are compatible, and only
 * one thing makes them so: **the label above the picture has to say which
 * window the picture is of.** Without it the chart is a five-session series
 * under a control reading `1M`, which is plausible and wrong rather than
 * visibly broken.
 *
 * So the sentence leads with the picture and follows with the request. That
 * order is the decision: a reader's first question about a screen that did not
 * change when they pressed something is *what am I looking at*, and the answer
 * to *what happened* is only useful once they know the first is not stale
 * nonsense.
 *
 * ## No number is written around
 *
 * Every figure here comes from the response or from the request. The window is
 * named by `windowPhrase`, which is `time-window.ts`' spelling and the same one
 * the control's readout uses a few centimetres away; the refusal's sentence is
 * the server's verbatim; and there is no bar count in the copy, because a
 * sentence built around a figure is wrong for every window but one.
 *
 * ## The mark, and what it deliberately is not
 *
 * The same dashed silhouette `Refreshing` uses, and for the same reason: the
 * figures below are **correct**. Nothing here is red, amber or boxed. What went
 * wrong went wrong to a request, and the request is not what is on screen.
 */
function HeldWindow({
  screen,
  onRetry,
}: {
  readonly screen: BarSeriesScreen;
  readonly onRetry: () => void;
}) {
  const { view } = screen;

  // Non-null by construction — this component is rendered only where it is —
  // and checked rather than asserted, because a `!` here would be a claim `tsc`
  // cannot check and the honest fallback costs one line.
  if (screen.previous === null) return null;

  // **No sentence while a window is merely in flight** (2026-09-14, §80).
  //
  // `previous` is unchanged and still non-null here, because it is the fact
  // that the picture belongs to *that* window — the figures above are labelled
  // from it, and a held 5-session chart under `1M OPEN` is the plausible-and-
  // shifted defect this panel is most careful about. What goes is only the
  // **sentence**, and only for `loading`.
  //
  // The reason is that nobody can read it. A window change costs 2–9 ms warm
  // and 7–68 ms cold against a local pair, so the in-flight rail's whole
  // visible life is under a tenth of a second: text appearing and vanishing
  // over a chart that did not visibly change, which is a flicker rather than
  // information. A wait long enough to be worth saying something about gets
  // `ChartPending` instead, and by then there is no held picture to name.
  //
  // A refusal and a failure keep theirs. Those are states a reader sits in, the
  // sentence carries the server's own words and the retry, and it is the only
  // thing explaining why a 5-session chart is under a 21-session heading.
  if (view.state === "loading") return null;

  const holding = windowPhrase(screen.previous.window);
  const asked = windowPhrase(screen.asked.window);

  return (
    <div className={styles.railBlock}>
      <RailSentence>
        {`Still showing ${holding}. ${outcomeSentence(view, asked)}`}
      </RailSentence>
      {view.state === "refused" && <RefusalDetail message={view.message} />}
      {view.state === "failed" && (
        <FailureDetail view={view} onRetry={onRetry} retry />
      )}
    </div>
  );
}

/**
 * What became of the window that *was* asked for.
 *
 * Reached only for the two states that settled without a picture. The `loading`
 * case has no sentence here because the one above already carries it in its own
 * grammar — *still showing X while Y is read* — and a second clause would be
 * the same fact twice, which is the defect this file is otherwise careful
 * about at page scale.
 *
 * Two words separate the two outcomes and they are chosen rather than
 * synonymous: a refusal is an **answer** the server gave about the request, so
 * it *was not answered* rather than *failed*; a failure is the absence of an
 * answer, so it *could not be read*. The same two words distinguish the two
 * states everywhere else on this panel.
 */
function outcomeSentence(view: BarSeriesView, asked: string): string {
  const subject = sentenceCase(asked);

  switch (view.state) {
    case "refused":
      return `${subject} was not answered.`;
    case "failed":
      return `${subject} could not be read.`;
    case "loading":
    case "loaded":
    case "partial":
    case "empty":
      return "";
  }
}

/**
 * What qualifies this security, when anything does — otherwise nothing at all.
 *
 * **This was `Subject`, and it had a ticker in it until 2026-09-14.** The h3 was
 * removed rather than restyled: `SecurityIdentity` states the symbol at display
 * size two blocks up the same page, and `Region` already names this landmark
 * `Price`, so the heading was neither the page's answer to *which security* nor
 * the region's accessible name. It was a third statement of a fact stated twice.
 *
 * What is left is **one** of the two qualifications that used to hang off it —
 * the other, *"Showing a default security"*, left on 2026-09-16 with the search
 * field that moved onto the page's heading row — and the reason it is still
 * **above** the figures is unchanged from Task 2.10.8's D2: an untracked
 * security is untracked whatever this answer turned out to be — still true
 * under a partial series, under an empty one, and while a newer answer is being
 * read — so a note at the bottom of the body reads as a footnote on the numbers
 * when it is a qualification on the subject.
 *
 * `null` when there is nothing to say, which is the ordinary case. The panel's
 * column gap is only spent when this renders something, which is the whole
 * reason the band it replaced could go.
 */
function Notes({ untracked }: { readonly untracked: boolean }) {
  if (!untracked) return null;

  // Still a `<div>` around a single `<p>`, and deliberately: `.notes` is the
  // row, and a second qualification going in beside this one is a sibling
  // rather than a restructuring. There were two here until 2026-09-16.
  return (
    <div className={styles.notes}>
      <p className={styles.defaulted}>
        {/*
         * A `Badge`, and the neutral tone, because it is **not a warning**:
         * the bars are real and the series is correct, and what changed is the
         * universe. `BADGE_TONES` has no warning tone by design, which is the
         * language agreeing with the judgement rather than constraining it.
         *
         * It leads the sentence now that it has no ticker to sit beside, so
         * the sentence is what gives it its subject.
         */}
        <Badge>Untracked</Badge> MarketPulse no longer tracks this security.
        These bars are what was stored while it did.
      </p>
    </div>
  );
}

/** The one exhaustive `switch`. A seventh member is a compile error here. */
function Body({
  view,
  onRetry,
  retryHere,
}: {
  readonly view: BarSeriesView;
  readonly onRetry: () => void;
  /**
   * Whether this is the screen's one `Try again`.
   *
   * `false` where a held answer is on screen, because there the rail above
   * already carries the failure **and** its retry, and the body is a correct
   * answer to a different window. Two retry controls on one screen teaches a
   * reader that neither is the real one — the finding
   * `SEARCH-AND-SELECTION.md` records for two surfaces sharing one fetch, here
   * as one surface reached two ways.
   *
   * Note the `failed` branch is still reachable with this `false`: the body can
   * only be `failed` when nothing is held, so in practice it is `true` there —
   * and the prop is threaded rather than assumed, because *in practice* is how
   * a second control gets added by accident.
   */
  readonly retryHere: boolean;
}) {
  switch (view.state) {
    case "loading":
      return <LoadingState />;

    case "loaded":
    case "partial":
      return <Provenance series={view.series} />;

    // **Nothing here, because the sentence moved into the plot** (2026-09-14).
    //
    // It used to render `EmptyState` under the figures. `VOLUME-AND-WINDOW.md`
    // §78 has the argument: the words were right and their position was not, so
    // `ChartVacancy` draws them on the uncovered ground they are about. `null`
    // rather than an empty element, which is what `Provenance` returns for the
    // same three states, so the stack gains no gap.
    //
    // **Moved, not copied.** `pnpm invariants` proves the sentence exists in one
    // source file: two visible copies inside the Price region is a Playwright
    // strict-mode failure in every spec whose store has no bars, which on CI is
    // all of them.
    case "empty":
      return null;

    case "refused":
      return <RefusedState message={view.message} />;

    case "failed":
      return <FailedState view={view} onRetry={onRetry} retry={retryHere} />;
  }
}

/**
 * Before the first answer.
 *
 * Bars rather than a spinner, and ragged rather than uniform, which is
 * `UniverseTable`'s finding restated: identical bars read as a loading
 * *graphic*, and an uneven edge reads as content that has not arrived. The
 * widths and the stagger are `:nth-child` rules in the stylesheet, because they
 * are texture rather than data and putting them here would be the one place in
 * this file with a literal length in it.
 *
 * `aria-hidden` on the bars: they are a picture of waiting, and the sentence
 * above them is what a screen reader is given.
 */
function LoadingState() {
  return (
    <div className={styles.state}>
      <p className={styles.stateLine}>Reading the series…</p>
      <div className={styles.skeleton} aria-hidden="true">
        {SKELETON_ROWS.map((row) => (
          <span className={styles.skeletonRow} key={row} />
        ))}
      </div>
    </div>
  );
}

const SKELETON_ROWS = [1, 2, 3, 4];

/**
 * What counts as *the answer changed*, for `Figures`' settle flash.
 *
 * The three facts a reader would notice moving: where it closed, how many bars
 * we hold, and how far the coverage reaches. Deliberately **not** every field —
 * a retrieval timestamp in the provenance changes on every request and means
 * nothing to anybody looking at a price, and keying on it would flash the panel
 * on precisely the refetch this is designed to leave alone.
 *
 * The instant is compared by `getTime`, for the reason `toBarSeriesView`
 * compares its windows that way: two `Date`s are two objects, and interpolating
 * one would work here by accident of its string form rather than on purpose.
 */
function settleSignature(
  series: PopulatedBarSeries,
  prices: SeriesPrices,
): string {
  return [
    prices.close,
    series.bars.length,
    series.coverage.covered.end.getTime(),
  ].join("·");
}

/**
 * Which feed these bars came from, in the shipped vocabulary.
 *
 * The words are `MARKET_FEED_DESCRIPTIONS`', never this component's: a renderer
 * deriving a user-facing sentence from a slug and a table of its own is two
 * vocabularies for one fact, and is the copy that drifts. The rule that record
 * carries is that **a sentence appears when the label cannot stand alone**, so
 * `IEX` gets one and `All US exchanges` does not — and that rule is applied by
 * reading `.sentence`, not by re-deciding it here.
 *
 * **`sources` is a list because a stitched series truthfully names more than
 * one.** Today both halves of a stitch report `sip`, which is what the recorded
 * fixture shows and is not the steady state — Epic 3's IEX socket is what makes
 * two sources mean two feeds. So this renders the distinct feeds rather than one
 * label, and it does not write the *"stitched from two feeds"* wording, because
 * that sentence has no producer yet and Story 2.14 owns it.
 *
 * ## It renders only where the chrome's own label cannot be right — 2026-09-14
 *
 * The masthead carries `FeedProvenance` on every screen, so for a series whose
 * sources all name **one** feed this line was the same fact twice, three
 * centimetres below a chart that had just been given back its vertical space.
 *
 * What it is *not* safe to delete is the case invariant 6 exists for. The free
 * Alpaca plan is asymmetric — stored history is consolidated SIP and the live
 * stream is IEX — so the moment Epic 3 stitches a live tail onto stored bars,
 * **one page-level label is wrong about half of this series** and the honest
 * answer is per-series. That is the condition below, and it is a property of the
 * answer rather than a flag: more than one distinct feed in the sources.
 *
 * So today it never renders and no reader loses anything, and the day the second
 * feed arrives it renders itself. The alternative was a note in a document
 * saying *put this back in Epic 3*, which is the kind of note that is read after
 * the screen has shipped without it.
 */
function Provenance({ series }: { readonly series: PopulatedBarSeries }) {
  // `distinctSeriesFeeds` rather than a `Set` built here: three surfaces asked
  // this same question with three copies of the same expression, and the source
  // note was going to be the fourth (Task 2.14.3).
  const feeds = distinctSeriesFeeds(series.provenance);

  if (feeds.length < 2) return null;

  return (
    <div className={styles.provenance}>
      {/*
       * The line is labelled, because a venue name floating under a table of
       * prices is a caption without a subject. `Market feed` is the chrome's
       * own words for the same fact one region away, and using them twice is
       * the point rather than a duplication: a reader who has learned what the
       * strip means should not have to learn it again here.
       */}
      <span className={styles.provenanceLabel}>Market feed</span>
      {feeds.map((feed) => (
        <FeedLabel key={feed} feed={feed} />
      ))}
    </div>
  );
}

function FeedLabel({ feed }: { readonly feed: MarketFeed }) {
  const description = MARKET_FEED_DESCRIPTIONS[feed];

  // Amber and a square for generated data, grey and a disc for a market feed —
  // `FeedProvenance`'s mapping, for the same safety reason: a fixture-backed
  // deployment advertises itself structurally rather than by somebody
  // remembering a banner. The shape carries it as well as the colour, so the
  // distinction survives desaturation.
  const synthetic = feed === "synthetic";

  return (
    <span
      className={cx(
        styles.feed,
        synthetic ? styles.synthetic : styles.realFeed,
      )}
    >
      <Marker shape={synthetic ? "square" : "disc"} />
      <span className={styles.feedLabel}>{description.label}</span>
      {description.sentence !== undefined && (
        <span className={styles.feedSentence}>{description.sentence}</span>
      )}
    </span>
  );
}

/**
 * The server declined to answer, and said why in a sentence written for a
 * person.
 *
 * **The message is rendered verbatim and is never re-worded.** It is the one
 * field on the error contract written to be shown, the numbers in it are the
 * server's own arithmetic — the bar count against the cap, the calendar's
 * range, the symbol the reader typed — and a client that re-wrote it would be
 * inventing a sentence about a calculation it did not do.
 *
 * **No retry control here, deliberately.** A refusal is a well-formed answer
 * about the request: waiting never helps, and offering a button that cannot
 * work is a lie the reader pays for twice. `refused` carries no `retryable`
 * flag for exactly this reason, so there is nothing here to get wrong.
 *
 * **And no `requestId`.** The rule `api-client.ts` states is that the id
 * appears only beside a failure the user is already being told about; a refusal
 * is not one, and a support reference under a correct answer is noise that
 * looks like an incident.
 */
function RefusedState({ message }: { readonly message: string }) {
  return (
    <div className={styles.state}>
      <p className={styles.stateLine}>
        <Marker shape="ring" />
        <span>That request could not be answered.</span>
      </p>
      <RefusalDetail message={message} />
    </div>
  );
}

/**
 * The server's own sentence, and nothing else.
 *
 * Extracted at Task 2.13.7 because it is now rendered under **two** different
 * headlines — the body's *"that request could not be answered"* when nothing is
 * held, and the rail's *"still showing the 5-session window"* when something is.
 * The two headlines are deliberately different sentences about different
 * subjects; the server's message is the same fact in both, and copying it would
 * be the copy that drifts.
 */
function RefusalDetail({ message }: { readonly message: string }) {
  return <p className={styles.stateDetail}>{message}</p>;
}

/**
 * Something went wrong, and whether waiting will help.
 *
 * The vocabulary is `SecuritiesView`'s, spelled the same way on purpose: two
 * pages disagreeing about what a 503 means is the outcome `FRONTEND-STATE.md`
 * §4 exists to prevent. `retryable` is derived from the error's `code` in
 * `packages/shared` and never from the status number, and `retrying` keeps the
 * failure's own sentence on screen while the retry is in flight rather than
 * returning to `loading`, which would read as the thing breaking twice.
 */
function FailedState({
  view,
  onRetry,
  retry,
}: {
  readonly view: FailedBarSeriesView;
  readonly onRetry: () => void;
  readonly retry: boolean;
}) {
  return (
    <div className={styles.state}>
      <p className={cx(styles.stateLine, styles.failed)}>
        <Marker shape="dashed" />
        <span>
          {view.failure === "unreachable"
            ? "No response from the service."
            : "The series could not be read."}
        </span>
      </p>
      <FailureDetail view={view} onRetry={onRetry} retry={retry} />
    </div>
  );
}

/** The `failed` member, named once so two components can take it. */
type FailedBarSeriesView = Extract<BarSeriesView, { readonly state: "failed" }>;

/**
 * What can be done about a failure, and the reference for it.
 *
 * Extracted at Task 2.13.7 for {@link RefusalDetail}'s reason, and it carries
 * the `retry` gate rather than deciding it: *whose* control this is, is a fact
 * about the screen rather than about the failure.
 */
function FailureDetail({
  view,
  onRetry,
  retry,
}: {
  readonly view: FailedBarSeriesView;
  readonly onRetry: () => void;
  readonly retry: boolean;
}) {
  return (
    <>
      <p className={styles.stateDetail}>
        {view.retryable
          ? "This is usually temporary. Try again in a moment."
          : "Asking again will not change this answer."}
      </p>
      {retry && view.retryable && (
        /* `Button` since the 2026 refresh — this was one of three hand-styled
           retry controls, each with its own copy of the same six declarations.
           The `disabled` while a retry is in flight is this panel's own
           decision and is deliberately kept: unlike the universe table's, this
           control sits inside the state it replaces, so a second press has
           nothing to supersede. */
        /* The subject in the accessible name — `UniverseTable`'s control
           carries the other half of this and its comment carries the argument.
           Two fetches fail separately on this screen, so two controls is
           correct and two identical names is not. */
        <Button
          aria-label={`${view.retrying ? "Trying again…" : "Try again"} — the price series`}
          variant="secondary"
          icon="refresh"
          onClick={onRetry}
          disabled={view.retrying}
        >
          {view.retrying ? "Trying again…" : "Try again"}
        </Button>
      )}
      {/*
       * The whole correlation id, never a prefix, and only here — beside a
       * failure the reader is already being told about. It is the one internal
       * identifier this product puts on screen, and it is what makes a support
       * conversation about one request rather than about a page.
       */}
      {view.requestId !== null && (
        <p className={styles.reference}>
          Reference <code className={styles.code}>{view.requestId}</code>
        </p>
      )}
    </>
  );
}
