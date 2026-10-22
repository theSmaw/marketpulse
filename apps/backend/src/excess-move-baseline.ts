import type {
  ExcessBaselineRefusal,
  MarketSession,
  ReturnBaselineRefusal,
} from "@marketpulse/shared";

import { breakpointsOf, sessionAnchors } from "./return-baseline.js";

/**
 * **The excess move's arithmetic — one paired walk, two split verdicts and 101
 * order statistics, and not one of them reads a clock, a socket or a handle**
 * (Task 5.6.2).
 *
 * `return-baseline.ts` is the module this is a sibling of rather than a copy:
 * the grid, the breakpoints, the split ceiling and the session-boundary rule
 * are **imported** from it, and what is here is the one thing it cannot do —
 * difference two securities' returns over the same grid.
 *
 * ## What the excess move is
 *
 * For one five-minute grid pair, `subject's return − the benchmark's return`,
 * in **percentage points**. This is the figure Story 5.1 already draws as
 * `behind by 2.20 pts`; the sample is its **magnitude**.
 *
 * ## The magnitude, and it is AC 4 rather than a convenience
 *
 * `Math.abs`, taken here and not at a call site. A signed percentile over a
 * signed baseline scores a security **higher for falling behind than for
 * running ahead**, which makes the composite a direction signal —
 * `PRODUCT_SPEC.md` §11 forbids it in terms, and `return-baseline.ts` took the
 * same decision for the same reason one factor over. The direction is on screen
 * already, carried by the drawn region's `behind` / `ahead`.
 *
 * ## The paired walk, and why it is one walk rather than two
 *
 * A sample exists only where **four** closes exist: both legs at the earlier
 * anchor and both at the later one. So the walk has to hold both legs' closes
 * at once, and splitting it into two passes over the same sessions would be two
 * traversals to disagree with each other (`market-breadth.ts`' note, and Story
 * 4.4's defect). The consequence is worth stating because it is the headline
 * figure 5.6.3 reasons about: **`n` here is strictly below the price
 * baseline's** for the same security, because the benchmark's coverage
 * multiplies the subject's.
 *
 * ## Both legs are split-guarded, and only one of the guards runs here
 *
 * The **subject's** verdict arrives as an argument — `priceRefusal`, the price
 * pass's answer for the same `(security, window end)`, which that pass is
 * holding a line above. This is `volume-baseline.ts`' arrangement and the same
 * argument: it is the same guard over the same closes, so a second evaluation
 * would be a second answer rather than a corroboration. The **reference's**
 * verdict is computed from the reference's own closes by
 * `seriesIsDiscontinuous` — in `return-baseline.ts`, beside the ceiling's own
 * arithmetic, once per benchmark rather than once per constituent — and arrives
 * here as a `boolean`.
 *
 * An unadjusted split poisons the excess identically whichever leg carries it:
 * a −50% overnight "return" on the benchmark is a +50% "excess" for all of its
 * constituents, which breaks no percentile property and would drag 501
 * securities' figures for 60 sessions.
 *
 * ## No session boundary is ever crossed, and that is structural
 *
 * `sessionAnchors` is called per session and a pair is two **consecutive
 * anchors of one session's own array**, which is `return-baseline.ts`'
 * property 1 inherited by construction: there is no expression in this module
 * that can pair Tuesday's last minute with Wednesday's first.
 */

/**
 * **The form of the comparison, and the vocabulary `0016`'s key records.**
 *
 * One member today. Story 5.6's AC 9 left the choice open between the
 * capitalisation-weighted sector SPDR and an unweighted **industry peer
 * median**, and the owner took the ETF at Gate 1 with the bias stated on
 * screen. The second form is what the key is shaped for; it is **not** declared
 * here, because a vocabulary member nothing can produce is scaffolding ahead of
 * the step and `excess_move_baselines_reference_kind_known` would have to be
 * widened by a migration anyway.
 *
 * **Reversal trigger, a condition:** the first measurement of the weighting
 * bias AC 9 names — *scores computed from that ratio are not comparable across
 * securities of different weight and nothing has measured the effect.*
 */
export const EXCESS_REFERENCE_KINDS = ["sector_etf"] as const;

/** One of {@link EXCESS_REFERENCE_KINDS}. */
export type ExcessReferenceKind = (typeof EXCESS_REFERENCE_KINDS)[number];

/** The form this pass compares against. See {@link EXCESS_REFERENCE_KINDS}. */
export const EXCESS_REFERENCE_KIND: ExcessReferenceKind = "sector_etf";

/** What the pass learned about one security. */
export type ExcessBaselineOutcome =
  | {
      /** Samples found on both legs, breakpoints computed. */
      readonly kind: "measured";
      readonly sampleCount: number;
      /** `BASELINE_BREAKPOINT_COUNT` magnitudes in points, ascending. */
      readonly breakpoints: readonly number[];
    }
  | {
      /** A row is written, with no distribution and the reason. */
      readonly kind: "refused";
      readonly sampleCount: number;
      readonly refusal: ExcessBaselineRefusal;
    }
  | {
      /**
       * **Nothing at all — and no row is written.**
       *
       * No grid pair was present on both legs. *The pass has not reached this
       * security* and *the pass reached it and will not answer* are different
       * facts and only the second is safe to stop retrying, which is
       * `ReturnBaselineOutcome`'s own note; on CI's store — 516 securities and
       * **zero bars** — this is every security for ever.
       *
       * It is **not** the fourth kind. A security with no reference at all is
       * `inapplicable` and never reaches this function, because
       * `excessMoveReference`'s applicable arm is the only one carrying a
       * symbol to read a second series for.
       */
      readonly kind: "none";
    };

export interface ExcessBaselineInput {
  /**
   * The window's sessions, **oldest first** — `lastMarketSessions`' order,
   * which the guard's session-boundary walk depends on.
   */
  readonly sessions: readonly MarketSession[];
  /**
   * The subject's closes at every minute of the window, keyed by the bar's own
   * `startsAt` in epoch milliseconds. One tape; the store applies that.
   */
  readonly closes: ReadonlyMap<number, number>;
  /** The benchmark's, read with the same query over the same window. */
  readonly referenceCloses: ReadonlyMap<number, number>;
  /**
   * The price pass's verdict for this security and this window end, or `null`.
   *
   * **Read rather than re-derived** — see the header. It is typed as the price
   * baseline's own union so a second member added there is a compile error
   * here rather than a verdict that silently stops travelling.
   */
  readonly priceRefusal: ReturnBaselineRefusal | null;
  /**
   * Whether the **benchmark's** own history crosses a session-boundary jump
   * beyond `SPLIT_DISCONTINUITY_RATIO` — `seriesIsDiscontinuous`' answer, which
   * lives in `return-baseline.ts` beside the ceiling's own arithmetic rather
   * than here, so the split rule keeps one home.
   *
   * A `boolean` and not a refusal word, because the word a reader is told is
   * this factor's (`reference-split-discontinuity`) and not the price
   * baseline's — the mapping belongs here, where the leg it describes is named.
   */
  readonly referenceDiscontinuous: boolean;
}

/** What one paired walk over the window found. */
export interface ExcessSamples {
  /**
   * Every sample's magnitude in percentage points, in the order the walk found
   * them.
   *
   * **Exported for the multiplicity property**, which is
   * `BaselineSamples.magnitudes`' own reason: *a grid pair contributes one
   * sample, not five* is a statement about the set and cannot be read off 101
   * interpolated order statistics.
   */
  readonly magnitudes: readonly number[];
  /** How many grid pairs the subject had, whether or not the reference did. */
  readonly subjectPairs: number;
}

/**
 * **One paired walk over the window: every sample, and how many the reference
 * cost us.**
 *
 * `subjectPairs` is carried for the measurement rather than for the figure:
 * the ratio `magnitudes.length / subjectPairs` is *what fraction of this
 * security's own grid its benchmark could be differenced against*, which is the
 * one number that says whether this factor's `n` is bounded by the subject or
 * by the reference. Nothing on screen reads it.
 */
export function excessSamples(input: ExcessBaselineInput): ExcessSamples {
  const { sessions, closes, referenceCloses } = input;

  const magnitudes: number[] = [];
  let subjectPairs = 0;

  for (const session of sessions) {
    const anchors = sessionAnchors(session);

    for (let index = 1; index < anchors.length; index += 1) {
      // **The pair is the PREVIOUS anchor of this session's own array**, which
      // is what makes the grid non-overlapping and a cross-session pair
      // unrepresentable. `index` starts at 1 because anchor 0 has no partner.
      const earlier = anchors[index - 1];
      const later = anchors[index];
      if (earlier === undefined || later === undefined) continue;

      const from = earlier.getTime();
      const to = later.getTime();

      const ourFrom = closes.get(from);
      const ourTo = closes.get(to);
      if (ourFrom === undefined || ourTo === undefined) continue;
      if (!Number.isFinite(ourFrom) || ourFrom === 0) continue;

      subjectPairs += 1;

      const theirFrom = referenceCloses.get(from);
      const theirTo = referenceCloses.get(to);
      // **A missing reference close is a sample that does not exist**, never a
      // stretch to the nearest bar and never a reference return of `0`. The
      // second is the defect AC 8 names at a cache: a benchmark that printed
      // nothing in this minute has not been flat, and treating it as flat makes
      // the subject's whole move read as excess.
      if (theirFrom === undefined || theirTo === undefined) continue;
      if (!Number.isFinite(theirFrom) || theirFrom === 0) continue;

      const ours = ((ourTo - ourFrom) / ourFrom) * 100;
      const theirs = ((theirTo - theirFrom) / theirFrom) * 100;

      magnitudes.push(Math.abs(ours - theirs));
    }
  }

  return { magnitudes, subjectPairs };
}

/**
 * **One security's excess-move baseline, or the reason there is not one.**
 *
 * The two refusals outrank the samples they were computed beside and the count
 * travels with them anyway — `returnBaselineOf`'s rule, and
 * `excess_move_baselines_one_answer` makes a refusal beside stale breakpoints
 * unrepresentable in the store.
 *
 * **The subject's break is reported first** where both legs are broken, and
 * that is a judgement rather than an accident: the reader is looking at the
 * security, so *this security's history crosses a price break* is the sentence
 * that answers what they asked. The benchmark's break is still true and is
 * still reported for every other constituent of that sector.
 */
export function excessBaselineOf(
  input: ExcessBaselineInput,
): ExcessBaselineOutcome {
  const { magnitudes } = excessSamples(input);

  if (input.priceRefusal !== null) {
    return {
      kind: "refused",
      sampleCount: magnitudes.length,
      // The price baseline's word, widened into this factor's vocabulary. The
      // two lists share this member by name on purpose: it is the same guard
      // over the same closes, so a different word would be a second sentence
      // for one fact.
      refusal: input.priceRefusal,
    };
  }

  if (input.referenceDiscontinuous) {
    return {
      kind: "refused",
      sampleCount: magnitudes.length,
      refusal: "reference-split-discontinuity",
    };
  }

  if (magnitudes.length === 0) return { kind: "none" };

  return {
    kind: "measured",
    sampleCount: magnitudes.length,
    breakpoints: breakpointsOf(magnitudes),
  };
}
