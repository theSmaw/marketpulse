import type { TimeRange } from "@marketpulse/shared";

import { cx } from "../../cx.js";
import { formatMarketRange } from "../BarSeriesPanel/series-facts.js";
import { Marker } from "../Marker/Marker.js";
import type { StoredHistory } from "./chart-vacancy.js";
import styles from "./ChartVacancy.module.css";

// **Why an answer of nothing is nothing, said on the ground it is about**
// (2026-09-14).
//
// This is the same sentence `BarSeriesPanel` used to render beneath the plot. It
// was moved rather than added, and `pnpm invariants` holds that: two copies is
// not merely redundant here, it is a break, because the browser suite locates the
// panel's settled answer by that phrase and two matches is a strict-mode failure
// on every spec in CI, whose store holds 518 securities and zero bars.
//
// ## What moved it
//
// `VOLUME-AND-WINDOW.md` §1.3 offered a 1D window knowing it would be empty until
// Epic 3, and wrote a reversal trigger that needed a person: *if the empty
// rendering reads as a broken product rather than an honest one when somebody
// looks at the screen*. §39 looked and said it did not fire. §78 records the
// second look, before the opening bell on 2026-09-14, where it did — and the
// diagnosis was not the words but their **order**. A reader met a grey box first
// and its explanation second, in the smallest type on the panel, below the fold
// of their attention.
//
// Two repairs came out of that and this is the smaller one. The larger is that a
// named window now ends at the last session whose bell has rung, which removes
// the pre-open case entirely (`series-request.ts`). What is left for this
// component is the case that survives until Epic 3's live feed: from the opening
// bell until that night's backfill, a window reaching into the current session
// really is answered with nothing, and that is correct rather than broken.
//
// ## What this is not allowed to be
//
// **Not a fourth treatment.** `CHARTING.md` §14.1 collapsed four state-by-state
// renderings into one rule — *a mark derived from the window runs the full frame;
// a mark derived from the bars stops at the coverage edge* — and the frame, the
// gridlines, the seams and the session's own date are still drawn underneath
// this. §39's first two carrying reasons are unchanged: the frame is real, and
// the whole plot is the same uncovered ground a partial answer uses for its short
// tail. Only the third moved.
//
// **Not a control.** Nothing here is focusable and nothing here is a button. A
// window that holds no bars is a correct answer about the request rather than a
// failure to retry, so there is nothing to offer — which is also what keeps
// `security-series.spec.ts`'s *no buttons in a settled answer* assertion true.
//
// **Not spoken.** `aria-hidden`, because `chart-alternative.ts` already says all
// of this to a screen reader and `series-announcement.ts` puts it in the panel's
// live region. A visible duplicate that also announced would be two surfaces
// claiming one sentence, which this panel has now had to decide four times.

export interface ChartVacancyProps {
  /** The window that was asked for, which is what the sentence names. */
  readonly requested: TimeRange;

  /**
   * The security, from the address — case one's headline names it, because
   * naming the subject **is** the encoding (`PROVENANCE.md` §6.3).
   *
   * The two answers are identical in weight — same marker, type, ink, position
   * and uncovered ground — and what tells them apart is what the headline is
   * *about*: case one names the security, case two names the window. A second
   * visual treatment would rank one above the other, and the difference between
   * them is a fact about our store rather than a difference in severity. Both
   * are correct 200s.
   */
  readonly symbol: string;

  /**
   * Which empty answer this is, derived by `chart-vacancy.ts` from the
   * universe response this page already fetches.
   *
   * **`"unknown"` draws the window sentence**, which is the degradation rule
   * rather than a default: a failed or in-flight `GET /securities` must not
   * produce a confident sentence about the store. It is spelled here as one
   * comparison against `"none"` for that reason — the cautious answer is what
   * every value that is not a positive match falls into.
   */
  readonly stored: StoredHistory;

  /**
   * What the plot is missing — `bars` on the price plot, `volume` on the volume
   * one.
   *
   * Each plot names its own subject rather than sharing one sentence, which is
   * `chart-alternative.ts`'s convention arriving here for the same reason: two
   * regions saying *no bars* under one axis reads as one failure repeated, and
   * what a reader is being told is that this frame holds nothing of **this**.
   */
  readonly subject: "bars" | "volume";

  /**
   * The plot's density, from `chartDensity`, and it arrives as a prop rather
   * than as an ancestor class.
   *
   * The `.compact` class the two charts set lives in each chart's own CSS module,
   * so a descendant selector in this component's stylesheet would be written
   * against a hash that never matches — and a CSS Module class-name miss is
   * completely silent: it typechecks, lints, builds and renders unstyled.
   */
  readonly compact: boolean;
}

/**
 * The sentence a plot holding nothing draws in place of its marks.
 *
 * **Four literals, one per (subject, case) pair**, and the window pair are
 * whole strings rather than one with the subject interpolated. That is not a
 * style preference: `pnpm invariants` proves each sentence exists in exactly
 * one source file, and a grep cannot see a string a template assembles. A check
 * that cannot find the thing it guards passes for the wrong reason, which is
 * the failure mode `CLAUDE.md` names — one of the seven invariants had already
 * rotted that way.
 *
 * **The case-one pair must interpolate, because naming the security is the
 * encoding** — so each is anchored on the longest fragment a grep *can* see,
 * and the two fragments are made distinct from each other for the same reason.
 * `"No volume stored for "` would have been a prefix of the window sentence
 * above it, so the check could not have told the two homes apart and would have
 * stayed green with the sentence deleted. Hence *volume history* rather than
 * *volume*: one word, bought to keep the guard honest, and it reads as the
 * parallel of the price headline rather than as a hedge.
 *
 * The schedule sentence follows the subject rather than taking a prop of its
 * own. The volume plot is 88px tall, 68 compact, its headline already fills it,
 * and the schedule is one fact stated once under the plot with room for it — so
 * a second prop would be one that could only ever co-vary with the first.
 */
export function ChartVacancy({
  requested,
  symbol,
  stored,
  subject,
  compact,
}: ChartVacancyProps) {
  // **One positive comparison, and everything else is the window sentence.**
  // The degradation rule as a line of code: only a universe answer that was
  // read, and that placed this symbol outside its coverage, earns the confident
  // claim about the store.
  const holdsNothing = stored === "none";

  return (
    <div
      aria-hidden="true"
      className={cx(styles.vacancy, compact ? styles.compact : undefined)}
    >
      <div className={styles.content}>
        <p className={styles.headline}>
          <Marker shape="ring" />
          <span>{headline(subject, holdsNothing, symbol)}</span>
        </p>
        {subject === "bars" && (
          <p className={styles.detail}>
            {holdsNothing ? (
              <>
                We hold no bars for this security at this timeframe. Changing
                the window will not help — the store is filled overnight.
              </>
            ) : (
              <>
                We asked for {formatMarketRange(requested)} and hold nothing in
                it. A window reaching into the current session is usually this:
                stored history is caught up overnight.
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * The headline, which is the whole of the distinction.
 *
 * A function rather than a nested ternary in the JSX, so the four literals sit
 * in one place a reader can compare them in — and so the two that a template
 * assembles are visibly next to the two that do not.
 */
function headline(
  subject: ChartVacancyProps["subject"],
  holdsNothing: boolean,
  symbol: string,
): string {
  if (subject === "bars") {
    return holdsNothing
      ? `No history stored for ${symbol} yet.`
      : "No bars stored for this window.";
  }

  return holdsNothing
    ? `No volume history stored for ${symbol} yet.`
    : "No volume stored for this window.";
}
