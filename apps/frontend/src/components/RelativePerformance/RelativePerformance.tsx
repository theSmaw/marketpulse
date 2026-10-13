import { memo, useState } from "react";

import type {
  Bar,
  PriceDirection,
  Security,
  SecurityLastClose,
  WireMarketOverview,
} from "@marketpulse/shared";

import { cx } from "../../cx.js";
import {
  NO_COMPARISON,
  RESERVED_RELATIVE,
  fitRelativeRung,
  ladderClause,
  ladderTicks,
  relativePerformance,
  type RelativeEntry,
  type RelativePerformance as RelativePerformanceView,
  type RelativeRung,
} from "../../market/index.js";
import { PriceChange } from "../PriceChange/PriceChange.js";
import { useWaited } from "../MarketProxyStrip/use-waited.js";
import styles from "./RelativePerformance.module.css";

// `Relative performance` — three moves and two differences on one anchored
// track (Task 5.1.3, `The rail that says how unusual.dc.html`).
//
// **A comparison is ONE anchored track, and the references are ticks on it.**
// The subject draws a bar, the two references draw ticks on the same track, and
// each difference is the **span between the subject's end and a reference's
// tick** — so the picture is literally the subtraction. One track rather than
// three is what makes the region fit the rail's 324 px at 1440, and three bars
// from zero would be three lengths for a reader to subtract by eye.
//
// ## Nothing here is `RankedList`
//
// Not its ordinal, not its ranking, not its roving arrow group, not its quiet
// group and not its held-row padding. Three figures read against each other is
// not a ranking and the order is fixed at subject → sector → market; the one
// thing reused is the **arithmetic** — `barFraction` and `ladderTicks`, which
// are pure and tested, against this region's own wider rung set.
//
// ## One height in every state, band by band
//
// The region sits in a column of three, so a region that grows when a benchmark
// arrives moves `Anomaly history` under the reader — `Movers` paid this already,
// where 5 rows → 2 shrank the region by 81 px and stepped the whole lower page.
// Every band reserves its own room: two headline cells, the track, the ladder,
// three rows, and a footer with a **two-line floor**, the footer being the one
// band that can still change height because it renders clause by clause.
//
// ## And no new colour
//
// Every mark is an existing token: the price palette on the three figures,
// `--ink-secondary` for a reference tick and for a bracket, `--rule-strong` for
// the zero rule, grey for everything else. **The two derived lines are
// achromatic** — `--ink-primary` with the sign carried by the word — because a
// difference is not a price: a security down 4.2% against a sector down 6.0% is
// *ahead while falling*, and a tinted cell there would read green and red at
// once.

export interface RelativePerformanceProps {
  /**
   * The security this page is about, or `undefined` while the universe answer
   * has not resolved one.
   *
   * **Not `SecuritiesView`**, which is `SecurityIdentity`'s and
   * `UniverseTable`'s contract: this region needs the resolved row and its
   * close, both of which the route already holds, and taking the view whole
   * would make a second place that decides what *unresolved* means.
   */
  readonly security: Security | undefined;
  /** The latest observation, when the live feed has sent one. */
  readonly live: Bar | undefined;
  /** The last stored close, from the universe answer. */
  readonly lastClose: SecurityLastClose | undefined;
  /** The overview aggregate, carrying both references' moves. */
  readonly overview: WireMarketOverview | undefined;
}

export const RelativePerformance = memo(function RelativePerformance({
  security,
  live,
  lastClose,
  overview,
}: RelativePerformanceProps) {
  // **The held geometry before the universe answer resolves a security**, which
  // is the same drawing as *nothing has arrived* one branch along and is
  // deliberately not a third state: the region's answer in both is that it
  // cannot compare anything yet, and `SecurityIdentity` is the surface that
  // says which of the two the fetch is in.
  if (security === undefined) return <HeldRoom view={RESERVED_RELATIVE} />;

  return (
    <Comparison
      security={security}
      live={live}
      lastClose={lastClose}
      overview={overview}
    />
  );
});

/**
 * The rung in force — **raised within a session, never lowered.**
 *
 * ## The cell that remembers is here, and that is where it has to be
 *
 * The sector ladder is ratcheted **server-side** so every reader of `/` shares
 * one rung. This region has no such requirement and no field to carry one: the
 * three figures are already on the page and the frame carries no rung for it,
 * so a backend change to send one would be a change to the aggregate for a
 * scale nobody else reads. It is therefore **client-side with a page-session
 * lifetime**, which is the simplest thing that cannot lower within a session.
 *
 * ## Keyed on the subject, so a change of security starts again
 *
 * This route **re-renders rather than re-mounts** when a person moves between
 * two securities (measured in Chromium, Task 2.11.5), so without a key a quiet
 * name would inherit a ±50 rung from the earnings-day mover a reader looked at
 * a moment ago — eleven-twelfths of the track empty, for a reason that is not
 * on the screen any more.
 *
 * ## Adjusted during render rather than in an effect
 *
 * React's own pattern for state derived from props, and the only one that does
 * not paint a frame of the wrong answer first. A ref would be the obvious
 * alternative and the React Compiler's `refs` rule refuses a write during
 * render — correctly, since nothing here needs to survive one.
 */
function useRatchetedRung(subject: string, fits: RelativeRung): RelativeRung {
  const [held, setHeld] = useState({ subject, step: fits });

  if (held.subject !== subject) {
    setHeld({ subject, step: fits });
    return fits;
  }

  if (fits > held.step) {
    setHeld({ subject, step: fits });
    return fits;
  }

  return held.step;
}

function Comparison({
  security,
  live,
  lastClose,
  overview,
}: RelativePerformanceProps & { readonly security: Security }) {
  const subject = { security, live, lastClose };

  // Two calls over the same three figures rather than one, because the rung is
  // an **input** to the geometry and the cell that holds it is a hook: the fit
  // is what the ratchet is fed, and the ratcheted rung is what the view is
  // drawn against.
  const step = useRatchetedRung(
    security.symbol,
    fitRelativeRung(subject, overview),
  );
  const view = relativePerformance(subject, overview, step);

  if (view.nothing) return <HeldRoom view={view} />;

  return <Drawn view={view} />;
}

/**
 * **The region with nothing to compare: its own geometry, held and invisible,
 * with one sentence over it.**
 *
 * `SectorPerformanceReservation`'s shape, and the floor is that region's own
 * `useWaited` rather than a second one — the ordinary load never reaches it
 * (first frame measured at 174–277 ms against a 2,000 ms floor), and a region
 * that is still empty after two seconds says so instead of holding a titled
 * empty box indefinitely. **On CI this is the permanent state**: 516 securities
 * and zero bars, so every figure is `unknown` for ever.
 *
 * `visibility: hidden` plus `aria-hidden`, never `display: none` — which is the
 * entire point — and the sentence is a **sibling** inside the room rather than
 * an override on the same element. That distinction was a live defect for ten
 * days one region over: `visibility` is inherited, so un-hiding the box
 * un-hides every reserved row in it.
 */
function HeldRoom({ view }: { readonly view: RelativePerformanceView }) {
  const waited = useWaited(true);

  return (
    <div className={cx(styles.room)}>
      <div className={cx(styles.reserved)} aria-hidden="true">
        <Drawn view={view} />
      </div>
      {waited ? (
        <p className={cx(styles.nothingArrived)}>{NO_COMPARISON}</p>
      ) : undefined}
    </div>
  );
}

function Drawn({ view }: { readonly view: RelativePerformanceView }) {
  // **What licenses the ladder and the scale clause** (ADR 0029): a printed
  // `±2%` under a track with no mark on it describes a scale for a quantity
  // nothing on screen shows. The predicate is the marks themselves rather than
  // a second threshold, so the two cannot disagree.
  const anyMark = view.entries.some((entry) => entry.at !== undefined);
  const subject = view.entries.find((entry) => entry.role === "subject");

  return (
    <div className={cx(styles.region)}>
      {/*
       * **Two separately labelled lines, never one prose sentence**, because
       * the sector half and the market half fail independently and prose
       * cannot be half-refused without becoming ungrammatical. A `<dl>` for
       * the same reason `BreadthLedger` uses one: these are two labelled
       * values in a fixed vocabulary order rather than a list of results.
       */}
      <dl className={cx(styles.derived)}>
        {view.comparisons.map((line) => (
          <div key={line.reference} className={cx(styles.line)}>
            <dt className={cx(styles.lineLabel)}>{line.label}</dt>
            <dd
              className={cx(
                styles.lineValue,
                line.excess.kind === "refused" ? styles.lineRefused : undefined,
              )}
            >
              {line.excess.kind === "excess"
                ? line.excess.stated
                : line.excess.because}
            </dd>
          </div>
        ))}
      </dl>

      {/*
       * **The picture, and it is `aria-hidden`.** Every quantity in it is
       * printed in the rows below and in the two lines above — the ladder's
       * endpoints are the one exception and they are the scale rather than a
       * figure, which is the clause the footer carries for a listener.
       * `RankedList` hides its own ladder on the same reading.
       */}
      <div className={cx(styles.plot)} aria-hidden="true">
        <div className={cx(styles.track)}>
          <span
            className={cx(styles.zero, anyMark ? undefined : styles.quiet)}
          />
          {subject?.at === undefined ? undefined : (
            <span
              className={cx(
                styles.bar,
                DIRECTION_CLASS[subject.move?.direction ?? "unchanged"],
              )}
              style={reach(subject.at)}
            />
          )}
          {view.entries
            .filter((entry) => entry.role !== "subject")
            .map((entry) => markOf(entry))}
          {view.comparisons.map((line) =>
            line.excess.kind === "excess" &&
            line.excess.bracket !== undefined ? (
              <span
                key={line.reference}
                className={cx(
                  styles.bracket,
                  line.reference === "sector" ? styles.above : styles.below,
                )}
                style={span(line.excess.bracket.from, line.excess.bracket.to)}
              />
            ) : undefined,
          )}
        </div>
        <div className={cx(styles.ladder, anyMark ? undefined : styles.quiet)}>
          {ladderTicks(view.step).map((tick) =>
            tick.label === undefined ? undefined : (
              <span
                key={tick.at}
                className={cx(styles.ladderTick)}
                style={{ left: `${String(tick.at)}%` }}
              >
                {tick.label}
              </span>
            ),
          )}
        </div>
      </div>

      {/*
       * The three figures, in the fixed order. **A held row is room and
       * nothing else** — it is in the list, off the screen and out of the
       * accessibility tree — so the region is the same height whether or not
       * the subject has a sector at all.
       */}
      <dl className={cx(styles.rows)}>
        {view.entries.map((entry) => (
          <div
            key={entry.role}
            className={cx(
              styles.row,
              entry.held === true ? styles.held : undefined,
            )}
            aria-hidden={entry.held === true ? true : undefined}
          >
            <dt className={cx(styles.rowLabel)}>
              {entry.label}
              {entry.symbol === undefined ? undefined : (
                <span className={cx(styles.symbol)}>{entry.symbol}</span>
              )}
            </dt>
            <dd className={cx(styles.rowFigure)}>
              {entry.move === undefined ? (
                <span className={cx(styles.absent)}>
                  {entry.absent ?? NBSP}
                </span>
              ) : (
                <PriceChange
                  change={entry.move.change}
                  direction={entry.move.direction}
                />
              )}
            </dd>
          </div>
        ))}
      </dl>

      {/*
       * **The footer, in two clauses and a two-line box.** The first is what
       * the references are — `SECTOR_CLAIM`'s invariant half, reused rather
       * than copied — and the second is the scale, which is its own element so
       * the stylesheet can drop it exactly where the track is dropped. The
       * two-line floor is `SectorPerformance.module.css`'s measurement and
       * its reason applies here with one word changed: the clause's width is a
       * function of the **rung**, and the rung steps outward during a session,
       * so a one-line reserve makes the region's height depend on how heavy
       * the day is.
       */}
      <p className={cx(styles.claim)}>
        {view.claim}{" "}
        <span
          className={cx(styles.scale, anyMark ? undefined : styles.quiet)}
          aria-hidden={anyMark ? undefined : true}
        >
          · {ladderClause(view.step)}
        </span>
      </p>
    </div>
  );
}

/** Room and nothing else, where a figure would be. */
const NBSP = " ";

/**
 * The bar's ink, by direction — **the price palette, which is the one place in
 * this region colour means anything.**
 *
 * A table rather than bracket access on the stylesheet, which
 * `noUncheckedIndexedAccess` and `dot-notation` refuse between them, and which
 * is also what makes the three cases readable in one place. Colour is never the
 * sole encoding: the bar's **side of the anchor** carries the direction, and
 * the row's figure carries the sign and the glyph.
 */
const DIRECTION_CLASS: Readonly<Record<PriceDirection, string | undefined>> = {
  positive: styles.positive,
  negative: styles.negative,
  unchanged: styles.flat,
};

/** A reference's tick — **never drawn at zero when the figure is absent.** */
function markOf(entry: RelativeEntry) {
  if (entry.at === undefined) return undefined;

  return (
    <span
      key={entry.role}
      className={cx(styles.tick)}
      style={{ left: `${String(entry.at)}%` }}
    />
  );
}

/** The subject's bar, from the anchor out to its own end. */
function reach(at: number): { readonly left: string; readonly width: string } {
  return span(50, at);
}

/** A box between two positions on the track, in either order. */
function span(
  from: number,
  to: number,
): { readonly left: string; readonly width: string } {
  const left = Math.min(from, to);
  return {
    left: `${String(left)}%`,
    width: `${String(Math.abs(to - from))}%`,
  };
}
