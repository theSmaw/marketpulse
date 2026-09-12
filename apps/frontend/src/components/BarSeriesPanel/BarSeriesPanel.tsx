import type { MarketFeed, TimeRange } from "@marketpulse/shared";
import { MARKET_FEED_DESCRIPTIONS } from "@marketpulse/shared";

import { Badge } from "../Badge/Badge.js";
import { Button } from "../Button/Button.js";
import { MetricStrip } from "../MetricStrip/MetricStrip.js";
import { cx } from "../../cx.js";
import type { BarSeriesView, PopulatedBarSeries } from "../../market/index.js";
import {
  directionOf,
  formatChangePercent,
  formatPrice,
} from "../../market/index.js";
import { Marker } from "../Marker/Marker.js";
import { PriceChange } from "../PriceChange/PriceChange.js";
import { PriceChart } from "../PriceChart/PriceChart.js";
import { announceSeries } from "./series-announcement.js";
import type { SeriesPrices } from "./series-facts.js";
import {
  barSpan,
  changePercent,
  formatCount,
  formatMarketInstant,
  formatMarketRange,
  seriesPrices,
} from "./series-facts.js";
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
  /** Everything this application knows about the series. Taken whole. */
  readonly view: BarSeriesView;

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
   * Say that search is not here yet.
   *
   * True only on the bare `/securities`, where the reader had no way to name a
   * security and is looking at a default. On `/securities/AMD` they evidently
   * found one, and the sentence would be noise.
   */
  readonly defaulted: boolean;
}

export function BarSeriesPanel({
  view,
  symbol,
  onRetry,
  defaulted,
}: BarSeriesPanelProps) {
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
        {announceSeries(view, symbol)}
      </p>

      <Subject
        symbol={symbol}
        defaulted={defaulted}
        untracked={isUntracked(view)}
      />
      {isStale(view) && <Refreshing />}
      <Reading view={view} />
      {/*
       * **The chart, above the facts and not instead of them** (Task 2.12.4).
       *
       * It takes the view whole and fetches nothing, exactly as this panel
       * does, so the workshop can render it with no backend running. It draws
       * its frame in every state that has a window — including before the first
       * answer, which is `PRODUCT_SPEC.md` §28's 500 ms satisfied by the frame
       * rather than by the response.
       */}
      <PriceChart symbol={symbol} view={view} />
      <Body view={view} onRetry={onRetry} />
    </div>
  );
}

/**
 * The current value, in the chart's chrome.
 *
 * **This is the headline that used to open the facts block**, moved by
 * `CHARTING.md` §5: the one figure a person reads before they read anything
 * else belongs with the picture it is the end of, and the value scale is on the
 * right for the same reason — the latest price, the last point of the line and
 * the scale all land in the same place.
 *
 * It stays a number in the DOM, in the data face, and is never a label drawn on
 * the line. It is deliberately paired with the coverage sentence below the
 * chart rather than standing alone, because a percentage with no window
 * attached is a number about nothing.
 */
function Reading({ view }: { readonly view: BarSeriesView }) {
  const prices = readablePrices(view);
  if (prices === null) return null;

  const percent = changePercent(prices);

  return (
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
  );
}

/** The four prices of the window, when the answer has bars in it. */
function readablePrices(view: BarSeriesView): SeriesPrices | null {
  switch (view.state) {
    case "loaded":
    case "partial":
      return seriesPrices(view.series);
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
    <p className={styles.refreshing}>
      <Marker shape="dashed" />
      <span>
        Refreshing — showing the held answer while a newer one is read.
      </span>
    </p>
  );
}

/**
 * Which security this is, above everything that can change underneath it.
 *
 * Rendered in **every** state including the failures, which is the same rule
 * `Region` follows for its own heading: the thing that says what you are
 * looking at must not be the thing that disappears when looking at it fails.
 */
function Subject({
  symbol,
  defaulted,
  untracked,
}: {
  readonly symbol: string;
  readonly defaulted: boolean;
  readonly untracked: boolean;
}) {
  return (
    <div className={styles.subject}>
      <div className={styles.subjectLine}>
        <h3 className={styles.symbol}>{symbol}</h3>
        {/*
         * **On the header and not in the body**, which is Task 2.10.8's D2 and
         * is an argument about what the fact is *about*. An untracked security
         * is untracked whatever this answer turned out to be — it is still true
         * under a partial series, under an empty one, and while a newer answer
         * is being read — so a note at the bottom of the body reads as a
         * footnote on the numbers when it is a qualification on the subject.
         * Beside the symbol it is read before the figures rather than after
         * them, which is the order it matters in.
         *
         * A `Badge`, and the neutral tone, because it is **not a warning**: the
         * bars are real and the series is correct, and what changed is the
         * universe. `BADGE_TONES` has no warning tone by design, which is the
         * language agreeing with the judgement rather than constraining it.
         */}
        {untracked && <Badge>Untracked</Badge>}
      </div>
      {untracked && (
        <p className={styles.defaulted}>
          MarketPulse no longer tracks this security. These bars are what was
          stored while it did.
        </p>
      )}
      {defaulted && (
        <p className={styles.defaulted}>
          Showing a default security. Search for another one above, or open one
          directly at <code className={styles.code}>/securities/SYMBOL</code>.
        </p>
      )}
    </div>
  );
}

/** The one exhaustive `switch`. A seventh member is a compile error here. */
function Body({
  view,
  onRetry,
}: {
  readonly view: BarSeriesView;
  readonly onRetry: () => void;
}) {
  switch (view.state) {
    case "loading":
      return <LoadingState />;

    case "loaded":
    case "partial":
      return (
        <SeriesState series={view.series} complete={view.state === "loaded"} />
      );

    case "empty":
      return (
        <EmptyState
          requested={formatMarketRange(view.series.coverage.requested)}
        />
      );

    case "refused":
      return <RefusedState message={view.message} />;

    case "failed":
      return <FailedState view={view} onRetry={onRetry} />;
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
 * The two answers that have bars in them.
 *
 * **One component for `loaded` and `partial`, with a boolean, and that is not
 * the boolean-instead-of-a-state mistake.** The state union does the work it
 * exists for one level up — the two members are separate there, and `covered`
 * is narrowed to non-null on both — and what reaches here is the one difference
 * that shows: whether the coverage line says we hold all of it. Rendering them
 * from two near-identical components is how the two drift apart.
 */
function SeriesState({
  series,
  complete,
}: {
  readonly series: PopulatedBarSeries;
  readonly complete: boolean;
}) {
  const prices = seriesPrices(series);
  const { first, last } = barSpan(series);
  const { requested, covered } = series.coverage;

  return (
    <div className={styles.series}>
      {/*
       * **The settle flash, and it is a `key` rather than a comparison.**
       *
       * Task 2.10.8 owes a mark for the moment a held answer is replaced by a
       * fresh one — and owes it *only when something changed*, because a flash
       * over numbers that did not move is a claim about the numbers. A refetch
       * landing on an identical answer is the common case for a closed
       * session's bars, and it must pass in silence.
       *
       * The signature below is the whole implementation. React remounts a
       * keyed element when its key changes and leaves it alone when it does
       * not, so the animation on `.settle` plays exactly on the transitions
       * that moved a figure — no previous-value ref, no `useEffect`, and no
       * second copy of "which fields count as the answer" that could drift
       * from the ones on screen.
       *
       * It is a background wash and never a transform: nothing here is a
       * `translate` or an `opacity` on a value, so no number is harder to read
       * while it plays. On the first paint it runs alongside `.series`' own
       * arrival, which reads as one thing arriving rather than two.
       */}
      <div className={styles.settle} key={settleSignature(series, prices)}>
        {/*
         * The headline used to open this block and now opens the chart's chrome
         * above it (`CHARTING.md` §5, Task 2.12.4). What that costs is that the
         * settle wash no longer passes under the close — the wash marks the
         * facts, which is where the bar count and the coverage it keys on both
         * live. Extending it over the reading is Task 2.12.7's call to take
         * with the rest of the states rather than a detail to change here.
         */}
        <Coverage
          complete={complete}
          bars={series.bars.length}
          requested={requested}
          coveredEnd={formatMarketInstant(covered.end)}
        />

        {/*
         * The four prices, as a strip rather than as rows of a list.
         *
         * This is the one block on the panel that has to read at a glance, and a
         * label/value list cannot: a reader comparing an open to a close is
         * comparing two figures, and putting a sentence's worth of label between
         * them is what makes a terminal feel like a form.
         *
         * **It is a `MetricStrip` since the 2026 refresh**, which is the component
         * this block's own comment asked for: it used to say `UniverseTable`'s
         * summary strip was the idiom and that it was "reused here rather than
         * re-invented", which is a stated copy — the signal this repository
         * extracts on. The `<div>` around it keeps the rule and the padding, which
         * are this panel's business rather than the strip's.
         */}
        <div className={styles.prices}>
          <MetricStrip
            metrics={[
              { label: "Open", value: formatPrice(prices.open) },
              { label: "High", value: formatPrice(prices.high) },
              { label: "Low", value: formatPrice(prices.low) },
              { label: "Close", value: formatPrice(prices.close) },
            ]}
          />
        </div>

        {/*
         * The windows, and they are the reason this panel exists.
         *
         * Two rows rather than four scattered facts, aligned so the two ranges
         * sit directly above one another — because the question a reader is
         * asking is *how do these two differ*, and two ranges that do not line up
         * cannot be compared without reading both in full.
         */}
        <dl className={styles.windows}>
          <Window label="Asked for" value={formatMarketRange(requested)} />
          <Window label="Held" value={formatMarketRange(covered)} />
          <Window
            label="Bars"
            value={`${formatCount(series.bars.length)} × ${series.timeframe}`}
          />
          <Window
            label="First → last"
            value={`${formatMarketInstant(first.startsAt)} → ${formatMarketInstant(last.startsAt)}`}
          />
        </dl>
      </div>

      <Provenance series={series} />
    </div>
  );
}

/**
 * What counts as *the answer changed*, for the settle flash above.
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
 * How much of the window we hold, in a sentence.
 *
 * **The complete case says so rather than saying nothing**, and that is the
 * decision worth stating: silence on a complete answer would make *"we hold all
 * of it"* and *"nobody checked"* look identical, which is precisely the
 * distinction this panel exists to make visible.
 *
 * The partial case names the instant it stops at, from `covered.end`, and never
 * from a constant. It is `MARKET-DATA-API.md` §6's answer rendered as an answer:
 * a short series is not a failure and must not read as one.
 */
function Coverage({
  complete,
  bars,
  requested,
  coveredEnd,
}: {
  readonly complete: boolean;
  readonly bars: number;
  readonly requested: TimeRange;
  readonly coveredEnd: string;
}) {
  return (
    <p className={cx(styles.coverage, complete ? undefined : styles.short)}>
      <Marker shape={complete ? "disc" : "ring"} />
      {complete ? (
        <span>
          Holding all {formatCount(bars)} bars of the window asked for.
        </span>
      ) : (
        <span>
          Holding {formatCount(bars)} bars, through {coveredEnd} — less than the
          window asked for, which runs to {formatMarketInstant(requested.end)}.
        </span>
      )}
    </p>
  );
}

/**
 * One labelled window or span, on a fixed label column so the values align.
 *
 * The alignment is the whole point: two ranges that do not start in the same
 * column cannot be compared at a glance, and comparing them is the question
 * this block answers.
 */
function Window({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className={styles.window}>
      <dt className={styles.windowLabel}>{label}</dt>
      <dd className={styles.windowValue}>{value}</dd>
    </div>
  );
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
 */
function Provenance({ series }: { readonly series: PopulatedBarSeries }) {
  const feeds = [...new Set(series.provenance.sources.map((s) => s.feed))];

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
 * A 200 with nothing in it, which is an answer.
 *
 * The commonest reason is the ordinary one and is worth saying plainly: the
 * window reaches into a session the nightly backfill has not taken yet. A panel
 * that said only "no data" would leave a reader deciding between *"this stock
 * does not exist"* and *"this product is broken"*, and neither is true.
 */
function EmptyState({ requested }: { readonly requested: string }) {
  return (
    <div className={styles.state}>
      <p className={styles.stateLine}>
        <Marker shape="ring" />
        <span>No bars stored for this window.</span>
      </p>
      <p className={styles.stateDetail}>
        We asked for {requested} and hold nothing in it. A window reaching into
        the current session is usually this: stored history is caught up
        overnight.
      </p>
    </div>
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
      <p className={styles.stateDetail}>{message}</p>
    </div>
  );
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
}: {
  readonly view: Extract<BarSeriesView, { readonly state: "failed" }>;
  readonly onRetry: () => void;
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
      <p className={styles.stateDetail}>
        {view.retryable
          ? "This is usually temporary. Try again in a moment."
          : "Asking again will not change this answer."}
      </p>
      {view.retryable && (
        /* `Button` since the 2026 refresh — this was one of three hand-styled
           retry controls, each with its own copy of the same six declarations.
           The `disabled` while a retry is in flight is this panel's own
           decision and is deliberately kept: unlike the universe table's, this
           control sits inside the state it replaces, so a second press has
           nothing to supersede. */
        <Button
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
    </div>
  );
}
