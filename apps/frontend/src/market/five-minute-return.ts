import { MARKET_FEED_DESCRIPTIONS, directionOf } from "@marketpulse/shared";

import { formatBarInstant } from "./chart-reading.js";
import { formatChangePercent } from "./price-format.js";

import type { MarketFeed, WireReturnRefusal } from "@marketpulse/shared";
import type { SymbolReturnView } from "./live-feed.js";
import type { PriceDirection } from "./price-format.js";

// **The 5-minute return's read side** (Task 5.2.3) — the first figure in
// `Abnormal-move indicators`, and the second of the three reserved rail
// regions to fill.
//
// ## Nothing here computes the figure
//
// The percentage, both endpoints, the observed count and the span are the
// backend's, from a trailing window no browser holds — and at `3M` and `1Y`
// the series the chart holds is `1d` bars with no five-minute endpoint in it
// at all, which is one of the three reasons the owner's Gate 1 decision put
// the computation behind the wire. What this module does is **spell** it: a
// formatted figure, a direction read off the one classifier, two instants
// through the one formatter, and a sentence per refusal.
//
// ## Why the symbol is compared rather than trusted
//
// The gateway answers the focus a browser last declared, and a reader moving
// from NVDA to AMD has one subscribe round trip in which the last answer is
// about NVDA. A surface reading the figure alone would draw NVDA's return
// under AMD's name — a well-formed, correctly-coloured figure about the wrong
// security, which is the class of defect this region exists to avoid at the
// arithmetic level. So the band is **about a symbol** and a figure for another
// one is the same answer as no figure at all.
//
// ## It says nothing about the feed, and that is AC 6
//
// No threshold, no status word, no connection word, no second staleness
// sentence. The two instants are on screen and the reader does the
// subtraction — `ProxyReading.note`'s *an age, never a verdict*, and the one
// home for *the feed has stopped* is the status bar (Story 3.10). The 187-minute
// ordinary maximum gap between one security's bars is what any threshold here
// would have had to spare.
//
// ## And it dates the OBSERVATION, never the computation
//
// `computedAt`, `sentAt` and `Date.now()` appear nowhere in this module or in
// the component that draws it. Both instants are bars' own `startsAt`, carried
// on the frame, and **neither has `OBSERVATION_INTERVAL_MS` added**:
// `describeMeasuredReach` adds it because it claims *reach* — how far the data
// we hold extends — while these two are the ends of a **span**, and a minute
// added to each would print a five-minute return as six minutes apart.

/** The micro label over the figure. */
export const RETURN_LABEL = "5-minute return";

/**
 * **`No return yet.` — the sixth honest-nothing noun in this product**, beside
 * `No prices yet.`, `No count yet.`, `No sector moves yet.`, `No moves to
 * rank yet.` and `No comparison yet.`
 *
 * It is the region's own sentence, so it takes the terminal stop the five
 * in-region absences below do not, and it means **one** thing: no `return`
 * frame about this security has arrived. *The frame arrived and the window was
 * empty* is a different fact with its own words, which is Task 5.1.4's lesson
 * one region up — collapsing them tells a reader the socket is quiet when it
 * is not, and that is the state every gated run is permanently in.
 */
export const NO_RETURN = "No return yet.";

/** The window holds no bar at or before now. A cold process's first minutes. */
const NO_BARS = "No bars observed yet";

/**
 * **The refusal this story exists for.** There is a newer bar and no bar whose
 * own instant is exactly the span before it, so there is no pair to measure —
 * and the nearest bar is not a substitute: `ERIE` at 2.1% minute coverage
 * would produce "the 5-minute return" between bars 47 minutes apart.
 */
const NO_EARLIER = "No bar five minutes back";

/** The older close is zero or not a number, so the division has no meaning. */
const NO_BASIS = "No basis for a percentage";

/** The figure, formatted and classified — `PriceChange`'s two inputs. */
export interface ReturnFigure {
  /** The signed percentage as the screen shows it — `+0.42%`, `−1.08%`. */
  readonly change: string;
  readonly direction: PriceDirection;
}

/** What the band draws. One band today; 5.3, 5.5 and 5.6 add their own. */
export interface ReturnBand {
  /** The micro label. Spelled by the component, read from here. */
  readonly label: string;
  /** The figure, or `undefined` when there is none. */
  readonly move: ReturnFigure | undefined;
  /**
   * The stated word where a figure would be — **never a dash.** `—` is
   * `unchanged` in `PriceChange`, so a dash in this slot asserts a zero
   * return.
   */
  readonly absent: string | undefined;
  /**
   * The two instants and how much of the span was observed, or `undefined`
   * where there is no pair to describe.
   */
  readonly qualifier: string | undefined;
  /** Which tape the figure was measured on — invariant 6, or `undefined`. */
  readonly tape: string | undefined;
  /**
   * **No frame about this security has arrived.** The component holds the
   * band's room and says {@link NO_RETURN} over it, which is not the same
   * state as a frame carrying a refusal.
   */
  readonly nothing: boolean;
}

/** The band's room with nothing in it — the paint before the first frame. */
export const RESERVED_RETURN: ReturnBand = {
  label: RETURN_LABEL,
  move: undefined,
  absent: undefined,
  qualifier: undefined,
  tape: undefined,
  nothing: true,
};

/**
 * The words for each refusal — three facts, three sentences.
 *
 * **A total record over `WireReturnRefusal`**, so a fourth refusal on the wire
 * is a **compile error naming the missing member** rather than an `undefined`
 * reaching the figure slot. The same guard `MARKET_FEED_DESCRIPTIONS` uses,
 * pointed at a union that crosses a socket.
 */
const REFUSALS: Readonly<Record<WireReturnRefusal, string>> = {
  "nothing-observed": NO_BARS,
  "no-earlier-endpoint": NO_EARLIER,
  "no-basis": NO_BASIS,
};

/**
 * **Which tape the figure was measured on** — invariant 6, at the region
 * rather than at the screen.
 *
 * Every bar in the backend's trailing window is `iex` by construction (there
 * is no store fill), while the chart a few centimetres away says `All US
 * exchanges` about its stored bars — so a region that said nothing would
 * inherit a coverage claim the plan does not have for this figure.
 *
 * **The words come from `MARKET_FEED_DESCRIPTIONS`** and not from this file:
 * `one-home-for-the-feed-words` is the check, and the reason behind it is that
 * a renderer with its own spelling of a venue is a coverage claim no
 * vocabulary decided. The **sentence** is deliberately not drawn — the source
 * note at the foot of this screen carries the explanation, and repeating it
 * here would be the duplicate `BarSeriesPanel` shipped for two years.
 *
 * Two different tapes across the pair cannot happen today and are spelled
 * anyway, in endpoint order, because a return measured across a stitch is a
 * thing a reader is owed rather than a thing to assume away.
 */
function tapeOf(feeds: readonly MarketFeed[]): string {
  const named: string[] = [];
  for (const feed of feeds) {
    const label = MARKET_FEED_DESCRIPTIONS[feed].label;
    if (!named.includes(label)) named.push(label);
  }

  return `Measured on ${named.join(" and ")}`;
}

/**
 * **The two instants and the part of the span that was observed.**
 *
 * ## Oldest first, and both of them
 *
 * AC 4 asks for the older — it is the only thing distinguishing a 5-minute
 * return from a 47-minute one — and printing one leaves the reader doing
 * arithmetic the product has already done. The span is the whole defence
 * against the 47-minute figure, so it is **shown** rather than implied.
 *
 * ## Both are spelled by `formatBarInstant`, which prints the date too
 *
 * That function is the one home for *a bar's instant in market terms*, and at
 * `1m` it prints `Oct 14 · 14:06 EDT` — the date, the time and the zone. So
 * this clause repeats the date, and the repetition is **chosen**: the
 * alternative, a time-only second endpoint, is a second spelling of an
 * instant, which is the duplication this product refuses, and the first
 * endpoint's date is load-bearing — a process that has been quiet since Friday
 * holds a perfectly valid pair whose instants are days old, and times alone
 * would read as today's.
 *
 * ## One grammar for k, with no special case at five
 *
 * `observed 5 of 5 minutes`, never *all five*. A second grammar at the
 * complete end is two sentences for one fact and destroys the scan between two
 * securities — and `5` is **read** off the frame's `spanMinutes` rather than
 * typed here, which is `one-home-for-the-observation-window`'s rule applied to
 * a span: a rollback can put a gateway and a bundle two values apart.
 */
function qualifierOf(
  from: Date,
  to: Date,
  observed: number,
  spanMinutes: number,
): string {
  return (
    `${formatBarInstant(from, "1m")} → ${formatBarInstant(to, "1m")} · ` +
    `observed ${String(observed)} of ${String(spanMinutes)} minutes`
  );
}

/**
 * An instant off the wire, or `undefined` where it cannot be read.
 *
 * `Date.parse` answers `NaN` for anything it cannot read and `new Date(NaN)`
 * **formats without complaining** — it reaches a screen as the words `Invalid
 * Date`. The decoder checks the field is a string; whether it parses is the
 * drawing surface's refusal, exactly as it is for the overview's instants.
 */
function instantOf(value: string): Date | undefined {
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : new Date(at);
}

/**
 * **The band, for the security this page is about.**
 *
 * @param symbol The security on screen.
 * @param held What the feed is holding, or `undefined` before the first frame.
 */
export function fiveMinuteReturnBand(
  symbol: string,
  held: SymbolReturnView | undefined,
): ReturnBand {
  // **A figure about another security is no figure at all** — see the module
  // comment. This is the navigation window, one subscribe round trip wide.
  if (held?.symbol !== symbol) return RESERVED_RETURN;

  const { figure } = held;

  if (!figure.measured) {
    return {
      label: RETURN_LABEL,
      move: undefined,
      absent: REFUSALS[figure.refusal],
      qualifier: undefined,
      // **No tape line on a refusal** (ADR 0029): there is no number, so there
      // is nothing whose provenance could be claimed, and a fully-formed
      // source line about no figure is the false impression that rule exists
      // for.
      tape: undefined,
      nothing: false,
    };
  }

  const from = instantOf(figure.from.at);
  const to = instantOf(figure.to.at);

  // **The direction is the one classifier's**, never a comparison here:
  // `one-classifier-for-the-direction-of-a-move` decides on the **displayed**
  // figure, so a +0.004% return cannot draw an up arrow beside `0.00%`. A
  // non-finite percentage has no direction and the decoder has already refused
  // one, so `?? "unchanged"` is the unreachable arm rather than a decision.
  const direction = directionOf(figure.percent) ?? "unchanged";

  return {
    label: RETURN_LABEL,
    move: { change: formatChangePercent(figure.percent), direction },
    absent: undefined,
    // **The clause is absent when either instant is unreadable, and the figure
    // still draws.** The percentage is true whatever the strings carrying its
    // instants did; what must not happen is `Invalid Date` on the page.
    qualifier:
      from === undefined || to === undefined
        ? undefined
        : qualifierOf(from, to, figure.observed, figure.spanMinutes),
    tape: tapeOf([figure.from.feed, figure.to.feed]),
    nothing: false,
  };
}
