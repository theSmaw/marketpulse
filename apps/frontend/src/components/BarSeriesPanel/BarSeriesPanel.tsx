import type {
  MarketFeed,
  SecurityStatus,
  TimeRange,
} from "@marketpulse/shared";
import { MARKET_FEED_DESCRIPTIONS } from "@marketpulse/shared";

import { cx } from "../../cx.js";
import type { BarSeriesView, PopulatedBarSeries } from "../../market/index.js";
import { Marker } from "../Marker/Marker.js";
import { PriceChange } from "../PriceChange/PriceChange.js";
import {
  barSpan,
  changePercent,
  directionOf,
  formatChangePercent,
  formatCount,
  formatMarketInstant,
  formatMarketRange,
  formatPrice,
  seriesPrices,
} from "./series-facts.js";
import styles from "./BarSeriesPanel.module.css";

// One security's bar series, as **stated facts and not a drawing** (Task
// 2.10.7).
//
// ## The fence, and it is a hard one
//
// **Nothing here is plotted. No axis, no line, no bars, no sparkline, no
// canvas, no SVG series** — and that is a scope decision rather than an
// unfinished state. Story 2.12 owns the charting decision: library or
// hand-built, line or candlestick, how an x-axis handles the gaps between
// sessions. Every one of those is easier to take against a data layer already
// known to be right, and a sparkline added here would be that decision made by
// accident, on the smallest possible evidence, by whoever needed one first.
//
// If this panel starts wanting a picture, that is the signal that Story 2.12
// has arrived — not the signal to draw a small one.
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
// ## Not a live region
//
// Deliberately, and it is Task 2.10.8's to add. That task owns what a surface
// whose content changes *more than once* says when it changes — a question the
// universe page could not raise, because its content arrives once — and
// answering it here, for one panel, is how two surfaces end up disagreeing.

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
      <Subject symbol={symbol} defaulted={defaulted} />
      <Body view={view} onRetry={onRetry} />
    </div>
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
}: {
  readonly symbol: string;
  readonly defaulted: boolean;
}) {
  return (
    <div className={styles.subject}>
      <h3 className={styles.symbol}>{symbol}</h3>
      {defaulted && (
        <p className={styles.defaulted}>
          Showing a default security. Search arrives with Story 2.11; until
          then, a security's page is reachable at{" "}
          <code className={styles.code}>/securities/SYMBOL</code>.
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
        <SeriesState
          series={view.series}
          securityStatus={view.securityStatus}
          complete={view.state === "loaded"}
        />
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
  securityStatus,
  complete,
}: {
  readonly series: PopulatedBarSeries;
  readonly securityStatus: SecurityStatus;
  readonly complete: boolean;
}) {
  const prices = seriesPrices(series);
  const { first, last } = barSpan(series);
  const percent = changePercent(prices);
  const { requested, covered } = series.coverage;

  return (
    <div className={styles.series}>
      {/*
       * The headline: what the security did across the bars we hold. It is the
       * one figure on this panel a person reads before they read anything else,
       * so it is the one thing set at display size — and it is deliberately
       * paired with the coverage line below rather than standing alone, because
       * a percentage with no window attached is a number about nothing.
       */}
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
       * them is what makes a terminal feel like a form. `UniverseTable`'s
       * summary strip is the idiom — figure large, label small beneath it —
       * and it is reused here rather than re-invented.
       */}
      <dl className={styles.prices}>
        <Price label="Open" value={formatPrice(prices.open)} />
        <Price label="High" value={formatPrice(prices.high)} />
        <Price label="Low" value={formatPrice(prices.low)} />
        <Price label="Close" value={formatPrice(prices.close)} />
      </dl>

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

      <Provenance series={series} />
      {securityStatus === "untracked" && <Untracked />}
    </div>
  );
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
 * One of the four prices: the figure first, its name beneath it.
 *
 * `<dd>` before `<dt>` in the source would be wrong — a definition list is
 * name-then-value and a screen reader reads it in document order — so the
 * visual inversion is `flex-direction: column-reverse` in the stylesheet, which
 * leaves the DOM order correct and puts the figure on top.
 */
function Price({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className={styles.price}>
      <dt className={styles.priceLabel}>{label}</dt>
      <dd className={styles.priceValue}>{value}</dd>
    </div>
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
 * A security we hold data for and no longer track.
 *
 * `securityStatus` is the field the response envelope carries so that this can
 * be said at all, and this panel is the first thing in the product able to say
 * it. It is a note rather than a warning: the bars are real and the series is
 * correct; what has changed is whether the universe still follows it.
 */
function Untracked() {
  return (
    <p className={styles.note}>
      <Marker shape="ring" />
      <span>
        MarketPulse no longer tracks this security. These bars are what was
        stored while it did.
      </span>
    </p>
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
        <button
          type="button"
          className={styles.retry}
          onClick={onRetry}
          disabled={view.retrying}
        >
          {view.retrying ? "Trying again…" : "Try again"}
        </button>
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
