import {
  BASELINE_MINIMUM_SAMPLE,
  UNUSUAL_ROWS,
  marketDateAt,
  selectByPercentile,
} from "@marketpulse/shared";

import type {
  MarketFeed,
  Ticker,
  WireUnusualActivity,
  WireUnusualGeneration,
  WireUnusualRow,
} from "@marketpulse/shared";
import { BREADTH_WINDOW_MINUTES } from "./market-breadth.js";
import { RETURN_SPAN_MINUTES, fiveMinuteReturn } from "./five-minute-return.js";
import { comparableBaseline, returnPercentileOf } from "./return-percentile.js";

import { SAMPLE_SPAN_MINUTES } from "./return-baseline.js";
import { BASELINE_FEED } from "./return-baseline-store.js";

import type { EligibleMoves } from "./market-breadth.js";
import type { MarketDate } from "@marketpulse/shared";
import type {
  StoredSessionPercentile,
  StoredSessionRanking,
} from "./session-percentile-store.js";
import type { LiveObservation } from "./market-data-stream.js";
import type { MeasuredReturn, ReturnRefusal } from "./five-minute-return.js";
import type { PercentileRefusal } from "@marketpulse/shared";
import type { ReturnPercentile } from "./return-percentile.js";
import type { StoredReturnBaseline } from "./return-baseline-store.js";

/**
 * **Which securities are behaving least like themselves** (Task 5.4.2) — the
 * landing page's seventh region, and the first aggregate in this product that
 * compares something against its own history rather than reporting it.
 *
 * ## A SECOND PASS PLUS AN INTERSECTION, never a split of the shared one
 *
 * Story 5.4's Gate 1 corrected the word this task inherited: the shared
 * eligibility pass does **not** split. There is exactly one call site of
 * `eligibleMoves` — `breadth-is-counted-over-the-equities-alone` permits one —
 * and this module is handed its **answer**, reads it, and writes nothing back.
 * `Market breadth`'s tally and `Movers`' selection are byte-identical whether
 * this module runs or not, which `market-unusual.test.ts` asserts **on the
 * producer** rather than on the wire, because a wire comparison cannot see a
 * defect in a producer (Task 4.8.11).
 *
 * What this region needs is a **narrower** predicate, not a different one:
 * heard from inside the same freshness cutoff, **and** holding two bars exactly
 * the measurement span apart, **and** holding a comparable baseline. So the
 * three counts nest — `tracked ⊇ eligible ⊇ scored` — which is the only reason
 * one sentence can carry them honestly (Task 5.4.4's).
 *
 * ## Two fives, and this module reads both rather than spelling either
 *
 * ADR 0043: `BREADTH_WINDOW_MINUTES` is an **eligibility cutoff over a
 * population** and `RETURN_SPAN_MINUTES` is a **measurement span between two
 * endpoints of one security**. This module consumes the first through
 * `eligibleMoves`' answer and the second through `fiveMinuteReturn`'s own
 * figure, so **it contains no cutoff of its own** — which is also what keeps
 * `one-home-for-the-observation-window` green over a file that check's docblock
 * names by name as the plant it was written against. The baseline's grid stride
 * is a **third** quantity and the 60-session lookback a **fourth**; the first
 * is handed in by the wiring site and the second is read off the stored
 * generation.
 *
 * ## TWO BASES, AND THE IN-MEMORY FIGURE CANNOT REACH THE SESSION ONE
 *
 * `eligibleMoves` answers on the **session** basis whenever the regular session
 * is shut, and out of hours a process that was up at the bell is still holding
 * that session's last bars: eviction in `trailing-window.ts` is relative to
 * each security's **own** newest bar, so nothing expires while the market is
 * closed. A pass that ignored the basis would therefore rank yesterday's
 * 15:55→16:00 pair, **for ever**, as unusual activity right now — which is
 * Story 5.4's Gate 1 decision 2 in one sentence.
 *
 * So the trailing windows are read **only** on the `observed` basis, and that
 * gate is unchanged since Task 5.4.2. What Task 5.4.5 adds is the session path
 * **beside** it: the last completed session's closing scores, read from
 * `session_return_percentiles` through a cache, every figure of them dated by
 * the session the nightly pass wrote them for.
 *
 * **The two are different arms of a discriminated union on the wire** rather
 * than one shape whose figures mean different things on different days. A
 * process with a stale trailing window and a process with none must not draw
 * the same region for different reasons, and the basis is the only thing that
 * can say which one a reader is looking at.
 *
 * The session arm also covers extended hours, where bars **are** arriving but
 * `marketBreadth`'s basis is still `session` — Story 4.4's Gate 1 decision 3,
 * whose measurement is that a five-minute minimum of **5 of 518** securities
 * would otherwise put a market-wide ranking on screen over five names. The
 * figures a reader sees between 16:00 and the bell are then the session's own
 * closing ones, which is a true claim about a session rather than a thin claim
 * about now.
 *
 * **A store with no session written is still the session arm**, with every
 * count zero and no rows — CI's permanent state (516 securities, zero bars, no
 * nightly runner) and every store's state before its first night. That is
 * `eligible: 0` on a basis that names the session it asked about, which is the
 * honest answer rather than a region claiming the market is quiet.
 *
 * ## No band
 *
 * Gate 1 decision 1: the ordinal and nothing else.
 * `packages/shared/src/anomaly.ts` deliberately holds no score→band
 * boundaries, the four bands are defined for the composite 0–100 score, and
 * this ranks one factor of four — a chip here would read `extreme` on price
 * alone. Story 5.6 owns both.
 */

/** What the pass needs to know about one security's recent bars. */
export interface UnusualActivityInputs {
  /**
   * **The shared eligibility pass's answer**, read and never re-filtered — the
   * same array `marketBreadth` tallies and `topMovers` ranks.
   *
   * A parameter rather than a call to `eligibleMoves` here, which is the
   * structural half of *there is one pass*: this module **cannot** take a
   * second one, because it has no entries, no `asOf`-driven filter and no
   * membership set to filter with.
   */
  readonly moves: EligibleMoves;

  /**
   * One security's trailing window, oldest first — `TrailingWindow.read`.
   *
   * A callback rather than the window itself, `closesAsOf`' shape for
   * `closesAsOf`' reason: this module must not hold anything a socket writes
   * to, so what it receives is the question rather than the structure.
   */
  readonly windowOf: (symbol: Ticker) => readonly LiveObservation[];

  /**
   * One security's stored baseline generation, or `undefined` for a security
   * the held generation has no row for — which is a cold replica, a security
   * with no stored `sip` history, and **every security on CI, for ever**.
   *
   * The caller resolves the generation **once** and hands this a lookup into
   * it, rather than this module asking the cache 501 times: `baselineAsOf` is
   * also the cache's refresh trigger, and 501 evaluations of a refresh
   * condition per applied batch is a cost nothing asked for.
   */
  readonly baselineOf: (symbol: Ticker) => StoredReturnBaseline | undefined;

  /**
   * The sampler's grid stride and the store's tape — **both read, neither
   * spelled**, `symbolReturn`'s own arguments at the wiring site.
   */
  readonly grid: { readonly spanMinutes: number; readonly feed: MarketFeed };

  /**
   * The instant the pass is **as of** — the aggregate's own `asOf`, which is
   * the replay clock's reading under a replay.
   *
   * It selects each security's newer endpoint and does nothing else; this
   * module reads no clock, which is what makes invariant 4 structural in it by
   * the same argument as `market-overview.ts`'.
   */
  readonly asOf: Date;

  /**
   * **The last completed session's stored ranking**, or `undefined` where the
   * store holds none (Task 5.4.5).
   *
   * Read **only** on the `session` basis, and resolved **once** by the caller
   * for the same reason `baselineOf` is a lookup rather than a cache: asking a
   * cache is also what triggers its refresh, and a refresh condition evaluated
   * per security is a cost nothing asked for.
   *
   * It is the whole answer rather than a lookup, because on this basis the
   * section's figures — the three counts, the five refusals and the baseline's
   * own facts — are the **pass's** rather than this process's, and they travel
   * together or they do not travel at all.
   */
  readonly sessionRanking?: StoredSessionRanking | undefined;

  /** How many rows the section carries. Defaults to {@link UNUSUAL_ROWS}. */
  readonly rows?: number;
}

/**
 * **One accumulator per refusal word, totalled over the closed vocabulary.**
 *
 * A `Record` over the union rather than a hand-written object, so a fourth
 * `ReturnRefusal` or a third `PercentileRefusal` is a **compile error** here
 * and again at the wire's field map — rather than a refusal that silently
 * stops being counted and quietly breaks the `eligible − scored` arithmetic
 * the region's sentence depends on.
 */
const noFigureRefusals = (): Record<ReturnRefusal, number> => ({
  "nothing-observed": 0,
  "no-earlier-endpoint": 0,
  "no-basis": 0,
});

const noComparisonRefusals = (): Record<PercentileRefusal, number> => ({
  "too-few-samples": 0,
  "split-discontinuity": 0,
});

/**
 * One scored security, as a row.
 *
 * **Built field by field from the two answers, never spread** — ADR 0031: a
 * `MeasuredReturn` carries a whole `BarSource` per endpoint (a `provider` that
 * is not a claim about venues, a `retrievedAt` that is a fact about this
 * process) and a `ReturnPercentile` carries the grid facts this frame hoists to
 * the section. On a socket a field on the object and not on the type **leaks**.
 *
 * The endpoints travel because {@link MeasuredReturn} establishes that this
 * figure may not be read without the two instants it was measured between, and
 * a list is not an exemption from that rule.
 */
const rowOf = (
  symbol: Ticker,
  figure: MeasuredReturn,
  percentile: ReturnPercentile,
): WireUnusualRow => ({
  symbol,
  rank: percentile.rank,
  aboveSample: percentile.aboveSample,
  sampleCount: percentile.sampleCount,
  percent: figure.percent,
  from: {
    at: figure.from.startsAt.toISOString(),
    price: figure.from.close,
    feed: figure.from.source.feed,
  },
  to: {
    at: figure.to.startsAt.toISOString(),
    price: figure.to.close,
    feed: figure.to.source.feed,
  },
  observed: figure.observed,
});

/**
 * **The section, ranked** — the one place a price percentile is computed for
 * more than one security.
 *
 * ## A refused security is NOT a row
 *
 * Five reasons to omit one, and every one of them is an **omission** rather
 * than a sentinel: nothing observed, no bar the span back, no basis to divide
 * by, no comparable baseline, and a baseline too short to rank. ADR 0038
 * decision 5's rule at the row grain — a required figure that cannot be
 * honestly produced drops the whole row — so there is **no `?? 0`, no
 * `rank: null` and no unranked tail**. A `null` under a `"number"` reaches a
 * lenient reader as `0`, and `0` is a plausible 0th percentile: the most
 * ordinary move on record, drawn at the top of a region about unusual ones.
 *
 * The only trace is arithmetic — `eligible − scored` — with
 * {@link WireUnusualActivity.refusals} saying of what kind, because *we have
 * not heard from this security* and *we have too little history* have different
 * repairs and must not read alike.
 *
 * ## What the counts are, exactly
 *
 * `tracked` is the shared pass's own figure, read and never typed —
 * `the-population-is-never-a-literal`'s producer half. `eligible` is how many
 * of that set both reached the cutoff **and** produced a figure. `scored` is
 * how many of those were ranked. The rows are a selection from `scored`.
 *
 * `eligible − scored` equals the comparison refusals in every reachable state.
 * The one gap is stated rather than papered over: a stored distribution that is
 * not 101 points, or a non-finite magnitude, is refused by
 * `returnPercentileOf` **with no word at all** — the database's own
 * `return_baselines` constraint forbids the first and the division forbids the
 * second, and inventing a refusal word for a state no reader can act on would
 * be a sentence nobody could write.
 */
export function unusualActivity(
  inputs: UnusualActivityInputs,
): WireUnusualActivity {
  const { moves, windowOf, baselineOf, grid, asOf } = inputs;
  const limit = inputs.rows ?? UNUSUAL_ROWS;

  // **The basis gate, and it is the whole of the out-of-hours decision.** See
  // this module's header: on the `session` basis nothing has been heard from
  // inside the cutoff, and the bars a stopped feed left behind are not a
  // measurement of now — so the trailing windows are not read at all, and the
  // answer comes from what the nightly pass wrote.
  if (moves.qualifier.basis === "session") {
    return sessionSection(
      moves.qualifier.session,
      inputs.sessionRanking,
      moves.tracked,
      limit,
    );
  }

  const figureRefusals = noFigureRefusals();
  const comparisonRefusals = noComparisonRefusals();

  const candidates: WireUnusualRow[] = [];
  let eligible = 0;
  let scored = 0;
  let generation: WireUnusualGeneration | undefined;

  for (const move of moves.moves) {
    const symbol = move.entry.symbol;

    const figure = fiveMinuteReturn(windowOf(symbol), { asOf });

    if (!figure.measured) {
      figureRefusals[figure.refusal] += 1;
      continue;
    }

    eligible += 1;

    const stored = baselineOf(symbol);

    // **The generation's own facts, off a row the pass actually read** — never
    // `BASELINE_LOOKBACK_SESSIONS`, which is this bundle's belief rather than
    // what the runner stored. A rollback can put the two apart, which is
    // `WireRefusedPercentile.minimumSampleCount`' recorded reason.
    if (stored !== undefined && generation === undefined) {
      generation = {
        // `marketDateAt` is the one module permitted to convert an instant to a
        // market-local date.
        session: marketDateAt(stored.observedAt),
        lookbackSessions: stored.lookbackSessions,
      };
    }

    // **The narrowing is one call and the type carries it** (Task 5.3.4's
    // mechanism, inherited rather than re-made): the refused arm has no
    // distribution member, so this site cannot reach the arithmetic without
    // having answered *may this move be ranked at all*.
    const comparison = comparableBaseline(stored, grid);

    if (!comparison.ranked) {
      comparisonRefusals[comparison.refusal] += 1;
      continue;
    }

    const percentile = returnPercentileOf(
      figure.percent,
      comparison.distribution,
    );

    // No honest word for this state — see the note above. It is counted in
    // neither tally and leaves `scored` below `eligible`, which is the only
    // direction a count may err in.
    if (percentile === undefined) continue;

    scored += 1;
    candidates.push(rowOf(symbol, figure, percentile));
  }

  return {
    basis: "observed",
    // **Bounded rather than sorted, through the one comparator** —
    // `one-comparator-for-the-order-of-a-percentile`. Ordinal descending, then
    // ticker ascending, which is a total order: this list arrives in the
    // join's order and that order is not stable between frames.
    rows: selectByPercentile(candidates, limit),
    tracked: moves.tracked,
    eligible,
    scored,
    // Read from the pass's own constant rather than typed — the figure beside
    // a count is always the window the count was taken with.
    windowMinutes: BREADTH_WINDOW_MINUTES,
    // Read from `fiveMinuteReturn`'s own constant rather than typed, and it
    // is deliberately **not** `windowMinutes` above: ADR 0043's two fives,
    // which share a number and are uncoupled for ever.
    spanMinutes: RETURN_SPAN_MINUTES,
    baseline: {
      feed: grid.feed,
      spanMinutes: grid.spanMinutes,
      // The bound the producer applies, read from its one home rather than
      // typed into a section a browser draws a sentence from. Within one
      // process this and `comparableBaseline`'s own reading are the same
      // constant; the rollback `WireRefusedPercentile.minimumSampleCount`
      // records is between a gateway and a **bundle**, which is why the figure
      // travels at all.
      minimumSampleCount: BASELINE_MINIMUM_SAMPLE,
      ...(generation === undefined ? {} : { generation }),
    },
    refusals: { figure: figureRefusals, comparison: comparisonRefusals },
  };
}

/**
 * **The last completed session's ranking, as a section** (Task 5.4.5) — read
 * from what the nightly pass wrote, and ranked through the one comparator.
 *
 * ## Every figure here is the PASS's, and none of it is this process's
 *
 * The three counts, the five refusals, the tape, the grid stride, the lookback
 * and the sample bound all come off the stored row rather than off this
 * bundle's constants — `0014` §5's argument, which is the one
 * `WireRefusedPercentile.minimumSampleCount` already records: a rollback can
 * put a runner and a reader two values apart, and the figure a sentence states
 * must be the one the producer applied.
 *
 * The one thing this function supplies is `tracked` **when there is nothing
 * stored**, and it is the shared pass's own figure rather than a literal —
 * because *of the 501 companies we track, none…* is a true sentence about a
 * store with no session in it, while a `tracked: 0` beside it would say we
 * track nothing.
 *
 * ## The session named is the STORED one, never the one we asked about
 *
 * Where a ranking exists the sentence is dated by `pass.observedAt`'s own
 * session; where none does, by the session the shared pass asked about. A
 * date recorded against figures from another session is
 * `last-closes-cache.ts`' recorded defect — a well-formed, correctly-spelled
 * wrong answer — and the two disagree every evening between the bell and that
 * night's run.
 */
function sessionSection(
  asked: MarketDate,
  ranking: StoredSessionRanking | undefined,
  tracked: number,
  limit: number,
): WireUnusualActivity {
  if (ranking === undefined) {
    return {
      basis: "session",
      rows: [],
      // The shared pass's own figure; see the docblock.
      tracked,
      eligible: 0,
      scored: 0,
      session: asked,
      // **Read from the producers that own them even here**, because a section
      // with no rows still states what the comparison would have been of:
      // ADR 0043's measurement span, the sampler's stride and the store's
      // tape. What it carries no `generation` for is the one thing nothing
      // stored can tell us.
      spanMinutes: RETURN_SPAN_MINUTES,
      baseline: {
        feed: BASELINE_FEED,
        spanMinutes: SAMPLE_SPAN_MINUTES,
        minimumSampleCount: BASELINE_MINIMUM_SAMPLE,
      },
      refusals: {
        figure: noFigureRefusals(),
        comparison: noComparisonRefusals(),
      },
    };
  }

  const { pass, scores } = ranking;

  return {
    basis: "session",
    // **The same comparator the live arm uses** —
    // `one-comparator-for-the-order-of-a-percentile` permits exactly one home
    // for this order, and the store deliberately returns its rows in **ticker**
    // order so that the ranking is performed here or not at all.
    rows: selectByPercentile(scores.map(storedRowOf), limit),
    tracked: pass.tracked,
    eligible: pass.eligible,
    scored: pass.scored,
    // `marketDateAt` is the one module permitted to convert an instant to a
    // market-local date.
    session: marketDateAt(pass.observedAt),
    spanMinutes: pass.spanMinutes,
    baseline: {
      feed: pass.baseline.feed,
      spanMinutes: pass.baseline.spanMinutes,
      minimumSampleCount: pass.baseline.minimumSampleCount,
      generation: {
        // **The generation ranked against is the one keyed by this same
        // session** — `0014` §5: the pass ranks each closing move against the
        // generation whose window ends at the session being scored, so the
        // coordinate is the score's own and a stored copy of it would be a
        // fact with two homes. The depth is not derivable and is stored.
        session: marketDateAt(pass.observedAt),
        lookbackSessions: pass.baseline.lookbackSessions,
      },
    },
    refusals: {
      figure: {
        "nothing-observed": pass.refusals.nothingObserved,
        "no-earlier-endpoint": pass.refusals.noEarlierEndpoint,
        "no-basis": pass.refusals.noBasis,
      },
      comparison: {
        "too-few-samples": pass.refusals.tooFewSamples,
        "split-discontinuity": pass.refusals.splitDiscontinuity,
      },
    },
  };
}

/**
 * One stored score, as a row.
 *
 * **Built field by field, never spread** — ADR 0031, and the stored shape
 * carries a `Date` per endpoint where the wire carries an ISO string, so a
 * spread would not even compile. {@link rowOf} is the live arm's twin and the
 * two produce the same shape from different sources, which is what makes the
 * browser's `readUnusual` one reader rather than two.
 */
const storedRowOf = (score: StoredSessionPercentile): WireUnusualRow => ({
  symbol: score.symbol,
  rank: score.rank,
  aboveSample: score.aboveSample,
  sampleCount: score.sampleCount,
  percent: score.percent,
  from: {
    at: score.from.at.toISOString(),
    price: score.from.price,
    feed: score.from.feed,
  },
  to: {
    at: score.to.at.toISOString(),
    price: score.to.price,
    feed: score.to.feed,
  },
  observed: score.observed,
});
