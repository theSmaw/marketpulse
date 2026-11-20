// `calculate_rolling_correlation` — the compare-market step (Task 7.2.6), the
// fifth tool this product has and the last of Story 7.2's five.
//
// It is the one step in this pipeline whose arithmetic is **new to the
// investigation engine and old to this product**: Story 6.5 built the pairwise
// correlation and ships it nightly over a fixed universe, and this tool asks
// the same arithmetic a different question — *how does THIS security move with
// the broad market* — on demand, for a pair that nightly pass structurally
// cannot answer.
//
// ## What is reused, and what is actively wrong to reuse (AC 3, confirmed at
// ## the code level rather than assumed)
//
// **Reused unchanged**: `pearsonCorrelation`, `correlationIsSignificant`,
// `CORRELATION_MINIMUM_OVERLAP` and `CORRELATION_LOOKBACK_SESSIONS`
// (`packages/shared/src/return-correlation.ts`); `baselineWindowEndingAt`,
// `baselineReturnSeries`, `seriesIsDiscontinuous` (`return-baseline.ts`); and
// `tapeCoveredEnd`, `subjectFor`, `readWindowCloses` (`return-baseline-store.ts`)
// — already **per-security** reads rather than a batch, so the on-demand fetch
// is the same query the nightly pass issues, issued **twice** instead of 516
// times.
//
// **Not reused, and it could not have been**: `selectStrongestCorrelations`
// (a top-N-per-node cut over 125,250 candidates — meaningless for one pair)
// and `accumulateCorrelationInput`, whose own landmark-exclusion gate means
// `SPY` and the other fourteen landmarks **never form a stored pair, by
// design** (`compute-baselines.ts` excludes them so the graph does not draw a
// ~500-edge starburst). So the stored `return_correlations` table cannot
// answer this question for any security at all, which is independent
// confirmation rather than a preference.
//
// ## The split guard is re-run HERE, on BOTH legs
//
// `baselineReturnSeries` deliberately does not run it — its own docblock says
// the caller is expected to hold the verdict already, because the nightly pass
// computed `returnBaselineOf` for the same `(security, window)` a few lines
// earlier. **This caller holds no such verdict**: it reads two windows of its
// own, for a pair the nightly pass never forms. So it asks
// `seriesIsDiscontinuous` itself, once per leg, and the two legs get
// **different words** — `split-discontinuity` for the subject and
// `reference-split-discontinuity` for the market proxy — for
// `compare_securities`' own reason: they refuse different securities and are
// repaired in different places, and a `SPY` break would refuse every
// investigation in the product at once.
//
// ## The window is derived from `asOf`, and the frontier only bounds it
//
// Two instants decide this window and they answer different questions.
// `tapeCoveredEnd()` answers **how far back is available** — the newest
// session the consolidated tape has actually reached, which is the only
// instant `the-baseline-window-ends-on-a-tape` permits a window to be built
// from, after that invariant's own production defect on 2026-10-15.
// `context.asOf` answers **how far forward this investigation may look**, and
// it is the one that binds: the window ends at the **earlier** of the two, so
// under Epic 13's eventual replay an investigation dated in the past cannot
// reach a session the market had not yet traded, with no second code path and
// no instruction to a model. In production `asOf` is now and the frontier is
// last night, so the clamp is inert and this tool reads exactly the window the
// nightly pass reads — which is the point: two answers about the same
// sessions, never two windows.
//
// ## No coefficient reaches the wire, and that is a decision with a trigger
// ## behind it
//
// {@link RollingCorrelationReading} carries a **direction**, a
// **significance** verdict and the **counted** overlap `n` — never `r`.
// Printing a coefficient as a figure fires `CORRELATION_MINIMUM_OVERLAP`'s own
// stated reversal trigger (*the first surface that prints a coefficient as a
// figure rather than drawing it as an edge*), which additionally requires a
// derived precision floor this story does not take on; and this product has no
// derived threshold for *strong* or *weak*, so no adjective is minted either.
// The raw `r` stays inside `run`, where the significance test consumes it.
//
// ## What no gated machine will ever see
//
// CI's store has 516 securities and **zero bars**, so both window reads come
// back empty, the intersection is **zero** anchors and this tool answers
// `too-few-overlapping-samples` on every gated run, for ever. That is the same
// word a pair with three shared anchors gets, deliberately — see
// `TOOL_REFUSALS`' own note. The `inapplicable` arm is the exception and is
// decided from the **arguments alone**, so `SPY` answers `is-the-market-proxy`
// identically on CI, on a laptop and on the deployment.

import {
  CORRELATION_LOOKBACK_SESSIONS,
  correlationIsSignificant,
  pearsonCorrelation,
} from "@marketpulse/shared";

import {
  baselineReturnSeries,
  baselineWindowEndingAt,
  seriesIsDiscontinuous,
} from "./return-baseline.js";
import { BASELINE_FEED } from "./return-baseline-store.js";
import { untrackedRefusal } from "./tool-universe.js";
import { trackedSymbols } from "./universe.js";

import type { AnalyticalTool } from "./analytical-tool.js";
import type { BaselineWindow } from "./return-baseline.js";
import type { ReturnBaselineStore } from "./return-baseline-store.js";
import type {
  JsonValue,
  MarketFeed,
  Ticker,
  ToolOutcome,
} from "@marketpulse/shared";

/**
 * The mint-site brand — `tool-compare-securities.ts`'s pattern and its reason:
 * the symbol is declared and never exported, so the only way to produce one of
 * these is through {@link createRollingCorrelationTool}'s own `run`. A figure a
 * caller could assemble from a literal is a figure the model could assemble
 * too, which is invariant 1's whole subject.
 */
const brand = Symbol("rolling-correlation-reading");

/**
 * **Which way the two moved together — and `none` is exactly `r === 0`.**
 *
 * The three words are a closed vocabulary rather than the sign of a number a
 * surface would have to re-derive, and `none` is a measurable arithmetic
 * outcome (two series whose covariance cancels to exactly zero) rather than a
 * claim that the pair is unrelated: a reader is told *no direction* beside
 * `significant: false`, never *these do not move together*, which is the claim
 * `zero-variance`'s own refusal exists to avoid making.
 */
export const CORRELATION_DIRECTIONS = ["positive", "negative", "none"] as const;

/** One of {@link CORRELATION_DIRECTIONS}. */
export type CorrelationDirection = (typeof CORRELATION_DIRECTIONS)[number];

export interface RollingCorrelationReading {
  /** The investigated security. */
  readonly symbol: Ticker;
  /** What it was correlated against — **named, never implied**. */
  readonly against: Ticker;
  /** Which way the two moved together. Never a magnitude. */
  readonly direction: CorrelationDirection;
  /**
   * Is the coefficient distinguishable from zero at this pair's own counted
   * overlap — `correlationIsSignificant`'s Fisher-z interval, never a chosen
   * `|r| ≥ 0.5`.
   */
  readonly significant: boolean;
  /**
   * **The COUNTED overlap** — anchors present in both legs' grids, never
   * `60 × 77` and never either leg's own `n`. It travels because the
   * significance test is a function of both and a reader cannot re-derive it.
   */
  readonly n: number;
  /** The window's depth in trading sessions. */
  readonly lookbackSessions: number;
  /** The tape both legs' closes came from — invariant 6's field. */
  readonly feed: MarketFeed;
  readonly [brand]: true;
}

/**
 * **A general PAIR, and the `SPY` default is the wiring site's.**
 *
 * `against` is an argument rather than a constant inside this tool, so the
 * same tool serves Epic 10's `get_related_securities`-driven comparisons
 * unchanged. Story 7.2's Gate 1 resolved *compare market* as the broad-market
 * proxy, and `index.ts`'s own `buildInput` is the one home for that choice —
 * one place to read, rather than a product decision buried in a tool.
 */
export interface RollingCorrelationInput {
  readonly symbol: Ticker;
  readonly against: Ticker;
}

/** The three reads this tool makes, as a port rather than the whole store. */
export type RollingCorrelationSources = Pick<
  ReturnBaselineStore,
  "tapeCoveredEnd" | "subjectFor" | "readWindowCloses"
>;

/**
 * **The overlap-zero refusal, minted once.**
 *
 * A store with no bars, a frontier no tape has reached, and a pair whose grids
 * barely meet are one claim about one quantity: *there is not enough shared
 * history to define a coefficient*. `n` is `0` on the first of those and the
 * tool says so by refusing with the same word rather than minting a second —
 * `comparableBaseline`'s own precedent for "no generation loaded" sharing a
 * word with "too short", and `TOOL_REFUSALS`' own note.
 */
const REFUSED_TOO_FEW: ToolOutcome<never> = Object.freeze({
  kind: "refused",
  reason: "too-few-overlapping-samples",
});

/**
 * Builds the compare-market tool. Takes the three store reads as a port rather
 * than reading a module singleton, so its own unit suite runs the real
 * `baselineWindowEndingAt`, `baselineReturnSeries`, `seriesIsDiscontinuous`,
 * `pearsonCorrelation` and `correlationIsSignificant` against furnished
 * `ReadonlyMap`s with no server, no socket and no database — and its database
 * suite runs the same code against real stored rows.
 */
export function createRollingCorrelationTool(
  sources: RollingCorrelationSources,
  universe: ReadonlySet<string> = trackedSymbols(),
): AnalyticalTool<RollingCorrelationInput, RollingCorrelationReading> {
  return {
    name: "calculate_rolling_correlation",
    // Gate 1's own sentence for this step.
    description: "Compare against the broad market",
    // `async` rather than the other four tools' `Promise.resolve`, because
    // this is the one tool in the pipeline that reads a database. `asOf` comes
    // off the `ToolContext` — this file reads no clock, which
    // `a-tool-reads-no-clock` holds.
    async run(
      { symbol, against },
      { asOf },
    ): Promise<ToolOutcome<RollingCorrelationReading>> {
      // **The membership question first, and asked of BOTH legs**, through the
      // one home every tool in this story shares. A correlation against a
      // symbol outside the curated universe is not a thinner answer, it is a
      // different question — and `PSKY`/`WBD` run the full checklist with each
      // tool answering this independently (Story 7.2's Gate 1).
      const untracked =
        untrackedRefusal(symbol, universe) ??
        untrackedRefusal(against, universe);
      if (untracked !== undefined) return untracked;

      // **The question does not arise.** A security's correlation with itself
      // is `1` by construction, which is arithmetic rather than a measurement
      // — and it is asked as `symbol === against` rather than against a list
      // of proxies, because Story 7.2's Gate 1 settled that `QQQ`/`DIA`/`IWM`
      // against `SPY` are real, if unsurprising, measurements and stay
      // computed. The only vacuous pair is a security against **itself**, so
      // the comparison that decides it is the one that cannot be wrong about
      // which fund this deployment calls the market.
      if (symbol === against) {
        return { kind: "inapplicable", because: "is-the-market-proxy" };
      }

      // **How far back is available** — never the window's end on its own.
      // See the header: `bar_coverage` is tape-blind and this is the per-tape
      // frontier `the-baseline-window-ends-on-a-tape` requires.
      const frontier = await sources.tapeCoveredEnd();
      if (frontier === undefined) return REFUSED_TOO_FEW;

      // **`asOf` binds, the frontier bounds.** The earlier of the two, so a
      // replayed investigation cannot reach a session the market had not
      // traded; in production the frontier is always the earlier one and this
      // reads exactly the nightly pass's window.
      const end = asOf.getTime() < frontier.getTime() ? asOf : frontier;
      const window = windowEndingAtOrBefore(end);
      if (window === undefined) return REFUSED_TOO_FEW;

      // Resolved to row ids here, because every read below is keyed on the id
      // rather than on the symbol — `windowQuery`'s own note carries the
      // `Sort` that measurement removed.
      const subject = await sources.subjectFor(symbol);
      const reference = await sources.subjectFor(against);

      // A tracked symbol this store has never heard of cannot happen — the
      // membership set is built from the same curated universe the loader
      // writes — so this is the two sources disagreeing rather than a market
      // condition, and `not-tracked` is the honest answer: we hold no row for
      // this security.
      if (subject === undefined || reference === undefined) {
        return { kind: "refused", reason: "not-tracked" };
      }

      // Two reads, sequential. They are independent and `Promise.all` is the
      // reflex, but each is the 538-block window read `return-baseline-store.ts`
      // measured, and two of them concurrently on two pooled connections
      // contend for the same buffers inside a 0.25 vCPU container — the
      // orchestrator is sequential for its own reasons and this is the same
      // judgement one level down.
      const subjectCloses = await sources.readWindowCloses(
        subject,
        window.range,
      );
      const referenceCloses = await sources.readWindowCloses(
        reference,
        window.range,
      );

      // **The split guard, re-run here, per leg** — see the header. The
      // subject's word and the benchmark's are deliberately different.
      if (seriesIsDiscontinuous(window.sessions, subjectCloses)) {
        return { kind: "refused", reason: "split-discontinuity" };
      }
      if (seriesIsDiscontinuous(window.sessions, referenceCloses)) {
        return { kind: "refused", reason: "reference-split-discontinuity" };
      }

      // Both legs sampled on the **same** session grid, which is what makes
      // the intersection meaningful at all: `baselineReturnSeries` keys each
      // return on its own later anchor, so two securities' maps meet exactly
      // where both printed a bar.
      const outcome = pearsonCorrelation(
        baselineReturnSeries({
          sessions: window.sessions,
          closes: subjectCloses,
        }),
        baselineReturnSeries({
          sessions: window.sessions,
          closes: referenceCloses,
        }),
      );

      // `CORRELATION_REFUSALS`' two words, verbatim rather than collapsed —
      // the vocabulary's owning module spells them and `TOOL_REFUSALS` carries
      // them, with a type-level assertion refusing a third it has not been
      // told about.
      if (!("r" in outcome)) {
        return { kind: "refused", reason: outcome.refusal };
      }

      return {
        kind: "ok",
        value: {
          symbol,
          against,
          direction: correlationDirectionOf(outcome.r),
          significant: correlationIsSignificant(outcome.r, outcome.n),
          n: outcome.n,
          lookbackSessions: CORRELATION_LOOKBACK_SESSIONS,
          feed: BASELINE_FEED,
          [brand]: true,
        },
      };
    },
  };
}

/**
 * **A window whose last session had already CLOSED at `end`** — never one
 * `end` sits inside.
 *
 * `baselineWindowEndingAt` takes an exclusive covered end and is handed one by
 * the nightly pass, where the instant is always a session boundary; this
 * caller's own instant is `context.asOf`, which on a replay is an ordinary
 * mid-session moment. Left alone, the window it builds would end on the
 * session **containing** `asOf` — a partial session, whose later minutes are
 * exactly the future information invariant 4 forbids a replay from reaching.
 *
 * So the window is rebuilt once from the **previous** session's close where
 * that happens. Once is enough: at most one session can contain `end`, and a
 * non-trading `end` already resolves to the last session before it.
 *
 * `undefined` where the window holds no session to step back to, which the
 * calendar makes unreachable at 60 sessions and is answered as the
 * overlap-zero refusal rather than thrown.
 */
function windowEndingAtOrBefore(end: Date): BaselineWindow | undefined {
  const window = baselineWindowEndingAt(end);
  if (window.observedAt.getTime() <= end.getTime()) return window;

  const penultimate = window.sessions.at(-2);
  return penultimate === undefined
    ? undefined
    : baselineWindowEndingAt(penultimate.close);
}

/**
 * The sign of a **coefficient** as a word. See {@link CORRELATION_DIRECTIONS}.
 *
 * **Deliberately not `price-direction.ts`'s `directionOf`**, which is the one
 * home for classifying a *move* and would be wrong here twice over: it rounds
 * its argument to the two decimals a percentage is displayed at first — an
 * `|r|` of 0.004 is a real coefficient, not a figure that prints `0.00%` — and
 * its third word is `unchanged`, which is a claim about a security over time
 * rather than about a pair. `one-classifier-for-the-direction-of-a-move` holds
 * that separation by name and this function is on the other side of it: it
 * compares no percentage against zero and classifies no move.
 */
function correlationDirectionOf(r: number): CorrelationDirection {
  if (r > 0) return "positive";
  if (r < 0) return "negative";
  return "none";
}

/**
 * The wire projection for a `TOOL_CALL_COMPLETED` event's `outcome.value` —
 * named fields rather than a spread, for `toWireSecuritySnapshot`'s reason: a
 * field added to {@link RollingCorrelationReading} without being added here is
 * never read, so it cannot reach the wire unexamined.
 *
 * **There is no `r` here and there is none on the reading either**, so this
 * function is not what keeps the coefficient off the wire — the type is. This
 * is the second reader of that decision rather than its home.
 */
export function toWireRollingCorrelation(
  reading: RollingCorrelationReading,
): Readonly<Record<string, JsonValue>> {
  return {
    symbol: reading.symbol,
    against: reading.against,
    direction: reading.direction,
    significant: reading.significant,
    n: reading.n,
    lookbackSessions: reading.lookbackSessions,
    feed: reading.feed,
  };
}
