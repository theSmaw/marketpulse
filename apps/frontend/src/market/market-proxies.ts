import {
  EXTENDED_HOURS_WORDS,
  MarketCalendarRangeError,
  extendedHoursAt,
  marketDateAt,
  marketSessionStateAt,
  type Bar,
  type ExtendedHours,
  type MarketDate,
  type WireMarketOverview,
  type WireOverviewFigure,
} from "@marketpulse/shared";

import { arrivalKey } from "./arrival.js";
import { formatBarInstant } from "./chart-reading.js";
import { formatSessionTime } from "./chart-time-axis.js";
import {
  directionOf,
  formatChangePercent,
  formatPrice,
  type PriceDirection,
} from "./price-format.js";

// What the four index proxies read as, from the overview frame alone
// (Task 4.2.5).
//
// ## Why this is a function and not the component
//
// `MarketProxyStrip` draws three rows in a grid and nothing in this file
// knows that. What is here is the part a test can hold without a browser: which
// of the three wire states a cell is in, how its figure is spelled, what the one
// shared qualifier may honestly claim about four separate observations, and
// which proxies disagree with it. `CHARTING.md`'s split between a reading and a
// renderer, one region along.
//
// ## Nothing here computes a change, and that is AC 2 rather than tidiness
//
// `changePercent` arrives on the wire, already computed by `changeFromClose`
// in `packages/shared` — called by the **backend**, from an IEX numerator and a
// consolidated-SIP denominator this browser cannot see. A second derivation
// here is the ≈0.00% defect `one-home-for-the-live-change` exists to refuse.
// This module formats a number somebody else produced.
//
// ## It names no feed, no venue and no connection word
//
// `LIVE` / `STALE` / `DISCONNECTED` have exactly one home and it is the status
// bar (Story 3.10). What the strip may state is an **instant**, an **age**, a
// **change basis**, the **session** a figure belongs to and **what kind of
// figure** it is — all of which are true of either tape, which is the only
// answer to invariant 6 available without putting a second venue word on a
// screen that already has one.
//
// It also may not say **whether the market is open**: that is the masthead's
// clock, and a second answer to it on one screen is the two-surfaces defect
// this product has produced four times. Nothing below states it — the closed
// session's clause is a property of the FIGURES, not of the market.
//
// ## Every figure carries a NOUN, which it did not until Task 4.2.6
//
// **The defect was not four copies of a date, it was an unlabelled one.** A
// stored close rendered as a bare `2026-09-11` — no preposition and no noun —
// beside an observed exception reading `from 12:07`, which has one. So row 3
// carried two grammars and only one of them said what kind of thing it was
// about; and because `qualifierOf` returned `undefined` in exactly the state
// where nothing is observed, **the words *close* and *closing* appeared nowhere
// in the strip in the only state that needed them**. A reader met `764.29`
// under a heading saying `Market proxies` with a date beneath it and had to
// infer *session close*; a listener got `SPY. 764.29. 2026-09-11.`
//
// The universe table does not have this problem because it has a **column
// heading**, and the identity block does not because it has a drawn label
// (`Last session close`). This strip has neither and is four cells wide, so the
// noun goes where the shared claim already goes.
//
// ## The staleness rule here is ABSOLUTE, and the table's is relative
//
// `LastCell` dates a row only when it is *behind the page's newest
// observation*. That is right for 518 rows — it dates exactly the set whose
// number is not current — and it **fails closed when the whole map is uniformly
// old**, which is every evening, every weekend and every morning before the
// bell: `currentMarketState` is not cleared on a session boundary, so nothing
// is behind anything and no row is dated.
//
// This strip is four figures at the top of the landing page, so it gets the
// rule the table is deliberately **not** being given. The difference is
// prominence and it is recorded here rather than left to read as an
// inconsistency.
//
// **The instrument is ADR 0028's — the session the bell has rung for
// (`marketSessionStateAt`) — and never a duration.** `LIVE-DATA.md` §11.2
// measured an ordinary maximum gap of 187 minutes between one security's bars
// and refused a threshold on that measurement; a number of milliseconds in this
// file would be that refused threshold arriving by another door, which is what
// `the-proxy-strip-dates-a-figure-from-a-calendar` refuses mechanically.

/** A formatted change and the direction `PriceChange` pairs with a glyph. */
export interface ProxyChange {
  readonly change: string;
  readonly direction: PriceDirection;
}

/**
 * What one cell says, in the three states the wire distinguishes.
 *
 * The three are `WireOverviewFigure`'s own, carried through rather than
 * collapsed: *we have heard nothing about SPY* and *we hold no stored close for
 * SPY* are different facts with different remedies, and neither of them is a
 * zero.
 */
export type ProxyReading =
  | {
      readonly kind: "observed";
      readonly price: string;
      /**
       * Absent when the frame carried no `changePercent` — there was nothing to
       * measure from. ADR 0029: a clause renders only when its own data is
       * present, so the cell shows a price and no change rather than `0.00%`.
       */
      readonly change: ProxyChange | undefined;
      /**
       * `from 12:07`, and only when this proxy's observation is older than the
       * newest one in the same frame.
       *
       * **An age, never a verdict.** `LIVE-DATA.md` §11.2 refused to give a
       * security a status word with a measurement behind it — the ordinary
       * maximum gap between one security's bars is 187 minutes — so this states
       * the instant and makes no judgement about it. On IEX a proxy sitting a
       * few minutes behind is ordinary rather than broken.
       */
      readonly note: string | undefined;
    }
  | {
      /** Nothing observed, and a stored close that travels with its session. */
      readonly kind: "stored";
      readonly price: string;
      /**
       * `2026-09-11 close` — **the session, and the noun that says what the
       * figure is**, or `undefined` when the shared line has already said both
       * for the whole strip.
       *
       * It was `string` until Task 4.2.6, on the ground that *a renderer cannot
       * show this price without the date it belongs to*. That ground is intact
       * and the date is still never absent from the screen: what changed is
       * **which line carries it**. When no figure is observed and every stored
       * close is from one session, the claim is stated once beneath the four —
       * the shared-claim-with-exceptions idiom the strip already uses for the
       * instant — and repeating it in four cells is the paragraph that idiom
       * exists to prevent. When the sessions disagree, or when an observed
       * figure owns the shared line, the cell states its own and the noun
       * travels with it.
       */
      readonly note: string | undefined;
    }
  | {
      /** Nothing observed and nothing stored. CI's state for all 518. */
      readonly kind: "unknown";
    };

export interface ProxyCell {
  readonly symbol: string;
  readonly reading: ProxyReading;
  /**
   * The value the arrival mark is keyed on, or `undefined` for no mark.
   *
   * `arrivalKey`'s, unchanged — the strip is the **third** surface to mark an
   * arrival and it does not get a third policy. A snapshot is not an arrival,
   * which is what stops four marks firing on first paint.
   */
  readonly arrival: string | undefined;
}

export interface MarketProxyStrip {
  /** One per security the frame reports, **in the order it reported them**. */
  readonly cells: readonly ProxyCell[];
  /**
   * The one line under the strip, or `undefined` when it has nothing to claim.
   *
   * `undefined` is reserved-and-hidden rather than removed: four copies of the
   * instant is a paragraph, and a line that disappears moves every region below
   * the strip.
   *
   * **Its instant is the newest observed one**, because that is the only claim
   * one line can make about four separate observations without over-claiming
   * for the others — and the ones it does not cover carry their own instant in
   * {@link ProxyReading} `note`. That is the universe table's shipped idiom: a
   * shared claim in the heading, an exception on the row that disagrees.
   *
   * **Its BASIS is not, and this file asserted otherwise for a few hours.**
   * `changeBasis` is per security: a gapped store gives two proxies previous
   * closes in different sessions, which is ordinary enough that
   * `pnpm bars:check` exists for it. Taking the newest figure's basis and
   * printing it unqualified under all four made one of them true and the rest
   * a claim nobody computed — and `note` could not rescue it, because `note`
   * carries an **instant** and only for a proxy that is *behind*, so a proxy
   * that is current and measured from a different session got no exception at
   * all. The clause is therefore dropped when the observed figures disagree;
   * see {@link sharedBasis}.
   */
  readonly qualifier: string | undefined;
  /**
   * Every figure is `unknown` — the store holds nothing for any of them.
   *
   * A true answer rather than a degraded one, and the only state a browser spec
   * on CI's runner can assert about: 518 securities, zero bars.
   */
  readonly nothingStored: boolean;
}

/**
 * Read the overview frame as four cells and one line.
 *
 * `observations` and `fromSnapshot` are the **socket's** map rather than the
 * frame's, and they are here only for the mark: the figure a reader sees is the
 * backend's join, and the disc says *a bar arrived for this security*. They are
 * two different claims from two different frames and they are deliberately not
 * derived from each other — a mark keyed on the aggregate would fire on every
 * recomputation, which the gateway does on connect, on subscribe and up to
 * sixteen times a minute.
 */
export function marketProxyStrip(
  overview: WireMarketOverview,
  observations: ReadonlyMap<string, Bar>,
  fromSnapshot: ReadonlySet<string>,
): MarketProxyStrip {
  // **A malformed instant is skipped rather than poisoning the line.**
  // `Date.parse` returns `NaN` for what it cannot read, `Math.max` with one
  // `NaN` is `NaN`, and `new Date(NaN)` formats without complaining — which is
  // how `Invalid Date` reaches a qualifier. `live-feed.ts` owns the same rule
  // one layer up for the same reason.
  const instants = new Map<string, number>();
  let newest: number | undefined;

  for (const figure of overview.figures) {
    if (figure.state !== "observed") continue;

    const instant = Date.parse(figure.at);
    if (Number.isNaN(instant)) continue;

    instants.set(figure.symbol, instant);
    if (newest === undefined || instant > newest) newest = instant;
  }

  // The session the shared line may name as *the* closing session, and the
  // market date the shared instant belongs to. Both are computed once and
  // handed down, because a cell's exception is defined against the shared
  // claim: a cell only speaks where the line above it does not cover it.
  const closingSession = sharedClosingSession(overview.figures);
  const newestSession =
    newest === undefined ? undefined : marketDateAt(new Date(newest));

  return {
    cells: overview.figures.map((figure) => ({
      symbol: figure.symbol,
      reading: readingOf(figure, {
        instant: instants.get(figure.symbol),
        newest,
        newestSession,
        closingSession,
      }),
      arrival: arrivalKey(
        observations.get(figure.symbol),
        fromSnapshot.has(figure.symbol),
      ),
    })),
    qualifier: qualifierOf(
      overview.figures,
      newest,
      overview.computedAt,
      closingSession,
    ),
    nothingStored:
      overview.figures.length > 0 &&
      overview.figures.every((figure) => figure.state === "unknown"),
  };
}

/** What a cell needs to know about the claim the shared line is making. */
interface SharedClaim {
  /** This figure's own instant, when it has a readable one. */
  readonly instant: number | undefined;
  /** The newest observed instant in the frame. */
  readonly newest: number | undefined;
  /** The market date {@link SharedClaim.newest} falls in. */
  readonly newestSession: MarketDate | undefined;
  /** The session the shared line names as the closing one, if it names one. */
  readonly closingSession: string | undefined;
}

function readingOf(
  figure: WireOverviewFigure,
  shared: SharedClaim,
): ProxyReading {
  if (figure.state === "unknown") return { kind: "unknown" };

  if (figure.state === "stored") {
    return {
      kind: "stored",
      price: formatPrice(figure.close),
      // **The noun, or nothing** — see the type. `2026-09-11 close` rather than
      // `close from 2026-09-11`, so that the date keeps the position it has in
      // every other stored-close qualifier in this product (`SecurityIdentity`
      // renders `2026-09-11 · change from the previous close`) and the noun is
      // the word that is new.
      note:
        figure.session === shared.closingSession
          ? undefined
          : `${figure.session} close`,
    };
  }

  return {
    kind: "observed",
    price: formatPrice(figure.price),
    change:
      figure.changePercent === undefined
        ? undefined
        : {
            // **The direction is taken from the ROUNDED percentage**, so a
            // +0.001% move cannot render an up arrow beside a figure reading
            // `0.00%`. `directionOf` owns that; the table met it first.
            change: formatChangePercent(figure.changePercent),
            direction: directionOf(figure.changePercent),
          },
    note: behindNote(shared),
  };
}

/**
 * `from 12:07`, or `from Sep 24 · 12:07 EDT`, or nothing.
 *
 * **The whole instant joins when this figure is from a different session from
 * the one the shared line names**, which is the absolute rule at the grain of a
 * cell and needs no clock at all — it is two instants compared with each other.
 * A bare `from 12:07` under a line reading `Sep 25 · 15:59 EDT` says *three
 * hours behind* when the truth may be *a day and three hours behind*, and
 * `currentMarketState` is not cleared on a session boundary, so a proxy whose
 * last bar was yesterday is a state this map can hold.
 *
 * **Two spellings, and the rule is which fact is being stated.** The short form
 * is a **time borrowed from the line above**: same session, so the date and the
 * zone are already on screen a few pixels away and repeating them is the
 * paragraph the shared claim exists to prevent. The long form is a **whole
 * instant** and therefore goes through `formatBarInstant`, which is how every
 * other dated instant in this product is spelled and is what carries the zone.
 * A hand-built `from 2026-09-24 12:07` shipped for one review round and was a
 * third spelling with no zone in it.
 *
 * A **session name** is a different kind of value and keeps the store's
 * spelling — `2026-09-11 close`, `change from 2026-09-24's close` — which is
 * `SecurityIdentity`'s and the wire's.
 *
 * **Still an age and never a verdict**: no threshold, no status word, and the
 * shared claim above does not bend to accommodate it (§11.2 measured an
 * ordinary maximum gap of 187 minutes between one security's bars and refused
 * a threshold on that measurement).
 */
function behindNote(shared: SharedClaim): string | undefined {
  const { instant, newest, newestSession } = shared;
  if (instant === undefined || newest === undefined || instant >= newest) {
    return undefined;
  }

  const at = new Date(instant);

  return marketDateAt(at) === newestSession
    ? `from ${formatSessionTime(at)}`
    : `from ${formatBarInstant(at, "1m")}`;
}

/**
 * The session a single *closing prices* claim may name for the whole strip.
 *
 * `undefined` unless **nothing is observed** — an observed figure owns the
 * shared line, and a strip that has heard from one proxy is not a strip of
 * closing prices — **and** every stored figure is from the same session. An
 * `unknown` figure abstains rather than disagreeing: it says `None stored` in
 * its own cell and has no session to contribute.
 */
function sharedClosingSession(
  figures: readonly WireOverviewFigure[],
): string | undefined {
  let session: string | undefined;

  for (const figure of figures) {
    if (figure.state === "observed") return undefined;
    if (figure.state !== "stored") continue;

    if (session === undefined) session = figure.session;
    else if (session !== figure.session) return undefined;
  }

  return session;
}

/**
 * The shared line, in every state the strip can be in.
 *
 * ## Two grammars, and both of them now carry a noun
 *
 * **Nothing observed**: `2026-09-11 · closing prices`. The date keeps the first
 * slot it has in every other qualifier in this product, and the clause that
 * follows says what the four figures above it *are* — which was the one thing
 * missing from the state a developer's machine and CI are both permanently in.
 * It is a **shared** claim, so it is made only when it is true of all of them;
 * see {@link sharedClosingSession}, and the cells carry their own where it is
 * not.
 *
 * **Something observed**: the instant, then the extended-hours word, then the
 * closed-session clause, then the basis — the last two decided together by
 * {@link sessionTiming}, which is also the one place the calendar is read.
 *
 * The strip **does not say whether the market is open** — that is the
 * masthead's clock, and Task 4.2.5's constraint holds. Every clause here is a
 * property of the figures: what they are, when they were true, and what they
 * were measured against.
 */
function qualifierOf(
  figures: readonly WireOverviewFigure[],
  newest: number | undefined,
  computedAt: string,
  closingSession: string | undefined,
): string | undefined {
  if (newest === undefined) {
    return closingSession === undefined
      ? undefined
      : `${closingSession} · closing prices`;
  }

  const at = new Date(newest);
  const { extended, closed } = sessionTiming(at, computedAt);
  const basis = sharedBasis(figures);

  return [
    // **The instant, always, and it is the first clause.** §10.3's rule: every
    // observation carries its own instant and no reader may render a price
    // without reading it. It is also what makes the strip alive when the disc
    // is not — when the feed stops the discs simply stop firing, an absence
    // nobody notices, while this stops advancing and stays on screen.
    formatBarInstant(at, "1m"),
    // Derived from the bar's own instant against Story 2.5's calendar, because
    // §7.7 measured that nothing on the frame distinguishes an extended-hours
    // bar. The words are `feed-words.ts`'s and a second spelling of either is
    // refused by `one-home-for-the-feed-words`.
    extended === undefined ? undefined : EXTENDED_HOURS_WORDS[extended],
    closed ? CLOSED_SESSION : undefined,
    basis,
  ]
    .filter((clause) => clause !== undefined)
    .join(" · ");
}

/** The absolute rule's own words. See {@link sessionTiming}. */
const CLOSED_SESSION = "last prices of the session";

/**
 * **The absolute rule**, and the one guarded reading of the trading calendar.
 *
 * Two facts, answered together because they are two questions about the same
 * instant and because **both calls can throw the same error** — see the
 * refusals below.
 *
 * `extended` is the shipped extended-hours word for `at`; `closed` is whether
 * the newest observation belongs to a session that is **not running**, which is
 * the clause `Market proxies` gets and `LastCell` deliberately does not.
 *
 * ## `closed` is false in extended hours, and that is a correction
 *
 * The clause shipped for one review round firing whenever `marketSessionStateAt`
 * was not `open` — which includes `before_open` and `after_close`, so on any
 * weekday between 04:00 and 09:30 and between 16:00 and 20:00 ET it produced:
 *
 *     Sep 28 · 07:42 EDT · pre-market · last prices of the session · change …
 *
 * **Two clauses three words apart contradicting each other**: `pre-market` says
 * the session has not started and `last prices of the session` says it has
 * ended. And in the pre-market case the sentence is not merely odd, it is
 * **wrong** — that figure is *today's* pre-market print, and the clause invites
 * a reader to take it for the previous session's close. The backend stores and
 * streams extended-hours bars, so this was the deployed landing page for about
 * nine and a half hours of every trading day, against the weekend state the
 * rule was written for.
 *
 * So `extended` **suppresses** `closed` rather than sitting beside it. The
 * extended-hours word already says when the price is from, which is the fact
 * the reader needs, and it is a fact about the figure rather than a claim about
 * the session's having ended. The residue is recorded rather than hidden: a
 * Friday after-hours print read on the Saturday renders `Sep 25 · 16:12 EDT ·
 * after-hours` with no closed-session clause — dated, correct, and one clause
 * shorter than it could be. A sentence that is silent is better than one that
 * is false.
 *
 * ## Why `computedAt` and not a clock in the browser
 *
 * Because there is no clock in the browser to read. `useMarketClock` ticks once
 * a second and `a-second-clock-on-the-landing-page` refuses a second caller on
 * this route by name; a strip that re-rendered every second to decide whether
 * to draw one clause would be paying that cost on the page that is about to
 * hold four aggregates over 518 securities.
 *
 * `computedAt` is **when the aggregate was true, by the server's clock**, and
 * its own docblock is written for this: *a surface that wants to say “these
 * figures are as of …” has to read this one*. It is rebuilt on every connect
 * and every subscribe, so a page opened on a Saturday is answered with
 * Saturday. It is **not** a clock a status is derived from — this is not a
 * status, it is the calendar question asked at the instant the figures were
 * joined, and `the-send-instant-is-not-a-clock` guards the three files where
 * that distinction is load-bearing. Both instants are server-origin, so no
 * browser clock is read and skew is not a hazard.
 *
 * What it cannot do is move on a page nobody is reloading: a tab held open
 * across the closing bell keeps the last frame's `computedAt` until the next
 * one arrives. The figures on it are equally frozen, they carry the instant
 * they were true at, and a feed that has stopped delivering has exactly one
 * home (Story 3.10).
 *
 * ## The refusals, and why they are in ONE function
 *
 * An unreadable `computedAt`, and either instant falling outside the trading
 * calendar's covered range (2024–2028), all mean *make no claim*. An
 * unsupported input is a reason to say less, never a licence to assert
 * something this function could not establish — and the alternative,
 * propagating `MarketCalendarRangeError` out of a render, is a blank page:
 * nothing above `App` catches one, so `main` and all seven regions go with it.
 *
 * **The guard used to be on one of the two calls, which made it inert.**
 * `extendedHoursAt(at)` was called unguarded by {@link qualifierOf} two lines
 * before the guarded call was reached, so an out-of-range `at` threw before the
 * `catch` existed — and the test written for the refusal varied only
 * `computedAt`, so it passed over the hazard. Both readings are inside the
 * guard now because they are one guard's subject: *what the calendar says about
 * these two instants, or nothing*.
 */
interface SessionTiming {
  readonly extended: ExtendedHours | undefined;
  readonly closed: boolean;
}

/** What the calendar cannot answer: no word, and no claim. */
const NO_TIMING: SessionTiming = { extended: undefined, closed: false };

function sessionTiming(at: Date, computedAt: string): SessionTiming {
  return (
    withinCalendar<SessionTiming>(() => {
      // **First, and inside the guard, because it is the range check for
      // `at`.** A refusal has to be a property of the instant as a whole:
      // `marketDateAt` is a timezone conversion and answers happily for the
      // year 2030, so a version that caught only this call and carried on
      // reached the comparison below with a date the calendar cannot classify
      // and asserted `last prices of the session` about it. Found by varying
      // `at` in the refusal test, which is the half the first guard missed.
      const extended = extendedHoursAt(at);
      if (extended !== undefined) return { extended, closed: false };

      const now = Date.parse(computedAt);
      if (Number.isNaN(now)) return NO_TIMING;

      const state = marketSessionStateAt(new Date(now));
      const running =
        state.status === "open" && state.session.date === marketDateAt(at);

      return { extended: undefined, closed: !running };
    }) ?? NO_TIMING
  );
}

/**
 * Read the trading calendar, or answer `undefined` where it does not reach.
 *
 * Only {@link MarketCalendarRangeError} is caught. Anything else is a fault in
 * this product rather than an unsupported input, and swallowing it here would
 * turn a bug into a missing clause nobody can see.
 */
function withinCalendar<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch (error) {
    if (error instanceof MarketCalendarRangeError) return undefined;
    throw error;
  }
}

/**
 * The basis clause, **only when every measured figure agrees about it**.
 *
 * A shared line may say *change from 2026-09-24's close* only if that is true
 * of all of them. Where it is not, the line says **nothing** about the basis
 * rather than one proxy's answer — ADR 0029's rule that a clause renders only
 * when its own data is present, applied to a clause whose data is four values
 * rather than one.
 *
 * **Only figures that carry a `changePercent` are consulted**, because only
 * they assert a basis. A proxy with a price and no measurable change has an
 * opinion about nothing and must not be able to suppress a clause that is true
 * of the ones that do.
 *
 * `undefined` as a basis is itself a value here and not a gap: it is
 * `LiveChange.basis`'s same-session case, *the previous close* — a number with
 * no date beside it. So a strip where one proxy measures from a named session
 * and another from an unnamed previous close is a **disagreement**, which is
 * the case a `?? "…"` default would have silently spelled as agreement.
 */
function sharedBasis(
  figures: readonly WireOverviewFigure[],
): string | undefined {
  const measured = figures.filter(
    (figure) =>
      figure.state === "observed" && figure.changePercent !== undefined,
  );
  if (measured.length === 0) return undefined;

  const [first] = measured;
  if (first?.state !== "observed") return undefined;

  const agreed = first.changeBasis;
  for (const figure of measured) {
    if (figure.state !== "observed") return undefined;
    if (figure.changeBasis !== agreed) return undefined;
  }

  return agreed === undefined
    ? "change from the previous close"
    : `change from ${agreed}'s close`;
}
