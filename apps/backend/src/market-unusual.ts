import {
  BASELINE_MINIMUM_SAMPLE,
  UNUSUAL_ROWS,
  marketDateAt,
  selectByScore,
  selectLargestCohort,
} from "@marketpulse/shared";

import type {
  AnomalyScore,
  CompositeFactor,
  ExcessMoveReference,
  MarketFeed,
  Ticker,
  WireUnusualActivity,
  WireUnusualCohort,
  WireUnusualGeneration,
  WireUnusualRow,
} from "@marketpulse/shared";
import { compositeAnomaly } from "./market-composite.js";
import { excessMoveFactor } from "./excess-move-factor.js";

import type { StoredExcessBaseline } from "./excess-move-baseline-store.js";
import type {
  StoredCompositeRanking,
  StoredCompositeScore,
} from "./session-composite-store.js";
import { BREADTH_WINDOW_MINUTES } from "./market-breadth.js";
import { RETURN_SPAN_MINUTES, fiveMinuteReturn } from "./five-minute-return.js";
import { comparableBaseline, returnPercentileOf } from "./return-percentile.js";

import { SAMPLE_SPAN_MINUTES } from "./return-baseline.js";
import { BASELINE_FEED } from "./return-baseline-store.js";

import type { EligibleMoves } from "./market-breadth.js";
import type { MarketDate } from "@marketpulse/shared";
import type { StoredSessionRanking } from "./session-percentile-store.js";
import type { LiveObservation } from "./market-data-stream.js";
import type { ReturnRefusal } from "./five-minute-return.js";
import type { PercentileRefusal } from "@marketpulse/shared";
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
 * ## THE FIGURE IS THE COMPOSITE SINCE TASK 5.6.7, AND BOTH ARMS MOVED AT ONCE
 *
 * This region used to rank and draw the **price percentile** — one factor of
 * three — and Story 5.4's Gate 1 refused a band chip over it for a stated
 * reason: a chip would have read `extreme` on price alone, ten times over.
 * With a real composite that refusal expires, and what replaced the ordinal is
 * `scoreAnomaly`'s 0–100 score with `bandOf`'s word beside it.
 *
 * **Both arms had to move in one change and that is the point rather than a
 * convenience.** The order and the drawn figure are one decision: a composite
 * in the comparator with an ordinal in the column draws row 1 at `85th` above
 * row 2 at `97th` — a visibly mis-ordered list, with every figure on it
 * individually correct — and the `session` arm runs about 80% of the week and
 * permanently on CI, so that defect would have been the deployment's ordinary
 * evening state rather than an edge case.
 *
 * ## THE COHORT RULE, which is AC 3 arriving at a ranked surface
 *
 * Two scores are comparable **iff computed over the same factor set**: with
 * unequal weights even a count-based cohort mixes scales, and a mixed ranking
 * systematically promotes the **worst-covered** securities, because a score
 * from fewer factors has the higher variance. So the pass ranks within the
 * largest non-empty cohort, the section names it, and the securities on other
 * scales are **counted** rather than silently absent.
 * `packages/shared/src/composite-cohort.ts` holds the rule and the two refused
 * alternatives.
 *
 * It is **invisible in this tree and correct anyway**: Task 5.6.6 measured 485
 * scored securities with **0 single-factor scores**, because the price and
 * excess factors refuse for the same root causes — so `{price, excess}` is the
 * sole cohort and `others` is `0` on every state any machine can produce. That
 * is said here rather than left for a reader to find, and it means the
 * machinery is **untested against a real second cohort**.
 *
 * ## `scored` CHANGED MEANING, and the nesting sentence still closes
 *
 * It was *how many held a comparable price baseline*; it is now *how many got
 * a composite score at all*. A refused price factor is an **absent factor**
 * rather than a dropped row, so the chain a reader checks is
 * `rows ≤ cohort.scored ≤ scored ≤ eligible ≤ tracked` — `readUnusual` walks
 * exactly that.
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

  /**
   * **Which fund this security's excess move is measured against** (Task
   * 5.6.7) — `excessMoveReference`'s answer, resolved from the curated
   * universe and never branched on here.
   *
   * `undefined` is *this process cannot resolve a reference for that symbol at
   * all*, which the shared pass's own population cannot produce — it is the 501
   * curated equities — and is therefore **not** given an invented answer: there
   * is no honest `FactorAnswer` for *we did not ask* (`inapplicable` means the
   * question does not arise and `refused` demands a word and two counts), so the
   * security falls out of the ranking unscored, which is the one gap this
   * module already documents.
   */
  readonly referenceOf?: (symbol: Ticker) => ExcessMoveReference | undefined;

  /**
   * One security's stored **excess-move** generation, or `undefined` where the
   * held generation has no row for it — `baselineOf`'s shape and its reason,
   * over the second of the two tables a composite reads.
   *
   * A separate lookup rather than a widened `baselineOf`, because the two
   * tables have different keys: `excess_move_baselines` keys on
   * `(security_id, observed_at, reference_kind, reference_symbol)` and the
   * factor refuses a row computed against a **different** benchmark, which it
   * checks itself.
   */
  readonly excessBaselineOf?: (
    symbol: Ticker,
  ) => StoredExcessBaseline | undefined;

  /**
   * **The last completed session's stored COMPOSITE ranking**, or `undefined`
   * where the store holds none (Task 5.6.7).
   *
   * Read **only** on the `session` basis, beside {@link sessionRanking} and
   * never instead of it: the composite row holds the three factor answers and
   * the minted score, and the percentile row holds the signed move the
   * direction glyph needs plus the `eligible` count this section states. `0017`
   * §2 pairs them on purpose — the two tables carry the **same**
   * `observed_at` for one session — and {@link sessionSection} refuses to mix
   * two sessions' halves.
   */
  readonly compositeRanking?: StoredCompositeRanking | undefined;

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
 * **One scored security before the cut — the shape this module ranks, which is
 * NOT the shape it ships** (Task 5.6.7).
 *
 * The separation is the whole of ADR 0031 at this grain. Ranking needs the
 * minted `AnomalyScore`, because the **cohort** is read off its clauses and
 * the cohort is what decides which securities may be ordered against each
 * other at all. What a browser may see is three fields. One type doing both
 * jobs would put ten complete factor ledgers — every figure, every `n`, every
 * refusal word — on a socket whose budget was measured at 124.3 B a row,
 * and it would do it **silently**, because a field on the object and not on
 * the type leaks.
 */
interface Candidate {
  readonly symbol: Ticker;
  /** {@link compareByScore}'s key, and the drawn figure. */
  readonly score: number;
  /**
   * **The whole minted score**, held here and never put on the wire — it is
   * what {@link selectLargestCohort} reads the factor set off, and
   * `AnomalyScore` carries a symbol-keyed brand plus a clause per factor.
   */
  readonly outcome: AnomalyScore;
  /** The signed five-minute move, where this basis holds one. */
  readonly percent: number | undefined;
}

/**
 * One scored security, as a row.
 *
 * **Built field by field from the candidate, never spread** — ADR 0031, and
 * here the leak it prevents is the whole explanation: `Candidate.outcome` is an
 * `AnomalyScore` carrying a clause per factor with every figure behind it, and
 * a spread would put ten securities' complete ledgers on a wire whose budget
 * was measured at 124.3 B a row. The band comes off the **outcome** rather
 * than from `bandOf(score)` here, because the figure a screen states must be
 * the one the producer minted.
 */
const rowOf = (candidate: Candidate): WireUnusualRow => ({
  symbol: candidate.symbol,
  score: candidate.outcome.score,
  band: candidate.outcome.band,
  // **Absent rather than `0`.** A direction of *unchanged* is the claim
  // *this security did not move*, and the glyph's whole job is to tell a −9%
  // crash from a +9% spike.
  ...(candidate.percent === undefined ? {} : { percent: candidate.percent }),
});

/**
 * **The ranked cohort, as the section states it** (Task 5.6.7) — or
 * `undefined` where nothing was scored, which is CI's permanent state.
 *
 * The `max` is read off one member's own score rather than summed from
 * `FACTOR_WEIGHTS`, for `0014` §5's reason: the figure a screen states must be
 * the one the producer applied, and out of hours that producer is the nightly
 * pass.
 */
const cohortOfSelection = (selection: {
  readonly cohort:
    | { readonly factors: readonly CompositeFactor[]; readonly max: number }
    | undefined;
  readonly members: readonly unknown[];
  readonly others: number;
}): WireUnusualCohort | undefined =>
  selection.cohort === undefined
    ? undefined
    : {
        factors: selection.cohort.factors,
        max: selection.cohort.max,
        scored: selection.members.length,
        others: selection.others,
      };

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
  const referenceOf = inputs.referenceOf;
  const excessBaselineOf = inputs.excessBaselineOf;

  // **The basis gate, and it is the whole of the out-of-hours decision.** See
  // this module's header: on the `session` basis nothing has been heard from
  // inside the cutoff, and the bars a stopped feed left behind are not a
  // measurement of now — so the trailing windows are not read at all, and the
  // answer comes from what the nightly pass wrote.
  if (moves.qualifier.basis === "session") {
    return sessionSection(
      moves.qualifier.session,
      inputs.sessionRanking,
      inputs.compositeRanking,
      moves.tracked,
      limit,
    );
  }

  const figureRefusals = noFigureRefusals();
  const comparisonRefusals = noComparisonRefusals();

  const candidates: Candidate[] = [];
  let eligible = 0;
  let scored = 0;
  let generation: WireUnusualGeneration | undefined;

  /**
   * **The eleven benchmarks' own five-minute returns, read once each** — a
   * per-batch memo and not a cache: it is created here, used inside this one
   * loop and discarded, so there is nothing to invalidate and nothing that can
   * outlive the `asOf` its entries were read at.
   *
   * It is the whole of this task's cost story. Without it the excess factor's
   * second leg is 501 extra window walks a batch; with it the pass is ~512
   * walks over ≤7 bars — 501 subjects plus the eleven sector SPDRs. A `Map`
   * keyed on the **benchmark's** symbol rather than on the subject's is what
   * makes 501 reads into 11.
   */
  const referenceFigures = new Map<
    Ticker,
    ReturnType<typeof fiveMinuteReturn>
  >();

  for (const move of moves.moves) {
    const symbol = move.entry.symbol;

    const figure = fiveMinuteReturn(windowOf(symbol), { asOf });

    if (!figure.measured) {
      // **Still the whole row, and still `continue`** — which is *not* the
      // same judgement as the baseline refusal below, and the difference is
      // the composite's. A security we hold no five-minute move for refuses
      // **both** scored factors for one root cause: the price factor on
      // `no-subject-move` and the excess factor on the same word, because the
      // subtraction has no subject. So there is no factor left to score and
      // `eligible` keeps exactly the meaning it has always had — *produced a
      // move to rank at all*.
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

    // **Counted and NOT dropped, which is the meaning change at the heart of
    // this task.** Until Task 5.6.7 a refused price baseline `continue`d: the
    // ordinal was the row's figure, so no baseline meant no figure meant no
    // row. Under a composite a refused price factor is an **absent factor** —
    // the score is minted from three answers and one of them saying *too
    // little history* is a smaller claim rather than no claim, so a security
    // whose excess move ranked is honestly `1 of 3 · max 35`.
    //
    // The tally still counts it, because the region's cut sentence is written
    // from these words and *we hold too little history* is still true of the
    // price factor. What changed is that the count no longer predicts the
    // **row's** absence: `eligible − scored` is now the securities that got no
    // factor at all, and the cohort rule is what keeps a 1-of-3 score off a
    // 2-of-3 list.
    if (!comparison.ranked) comparisonRefusals[comparison.refusal] += 1;

    const percentile = comparison.ranked
      ? returnPercentileOf(figure.percent, comparison.distribution)
      : undefined;

    // **Which fund this security is measured against**, from the one shared
    // resolver — the same answer `symbolReturn` reads, so the two paths cannot
    // disagree about which benchmark a security has.
    const reference = referenceOf?.(symbol);

    // A symbol with no resolvable reference is not given an invented answer;
    // see `UnusualActivityInputs.referenceOf`. It is counted in neither tally
    // and leaves `scored` below `eligible`, which is the only direction a count
    // may err in, and it is unreachable for the shared pass's own population.
    if (reference === undefined) continue;

    // **The benchmark's own five-minute return, read at the SAME `asOf` as the
    // subject's.** `one-instant-for-a-subject-and-its-benchmark` holds this and
    // nothing else can see it: two legs read at two instants subtract to a
    // well-formed, correctly-signed figure that is **wrong** and that re-adds
    // to itself, so every check at the wire's end is green on it.
    //
    // The memo is read before the window is walked, which is what makes the
    // eleven benchmarks eleven reads rather than 501 — and it is **inside** the
    // loop body so that the figure it holds and the subject's are over one
    // interval by construction rather than by a comment.
    let referenceFigure = reference.applies
      ? referenceFigures.get(reference.symbol)
      : undefined;

    if (reference.applies && referenceFigure === undefined) {
      referenceFigure = fiveMinuteReturn(windowOf(reference.symbol), { asOf });
      referenceFigures.set(reference.symbol, referenceFigure);
    }

    const excess = excessMoveFactor({
      subject: figure,
      reference: referenceFigure,
      referenceOf: reference,
      stored: excessBaselineOf?.(symbol),
      grid,
    });

    // **The composite, through the one producer** — `market-composite.ts`
    // translates each factor's own vocabulary into the scorer's and
    // `scoreAnomaly` holds every arithmetic in the score. Nothing is computed
    // here and nothing is rounded here.
    const outcome = compositeAnomaly({
      price: { figure, comparison, percentile },
      excess,
    });

    // **Every factor refused, so there is no score and no row.** ADR 0038
    // decision 5 at the row grain, unchanged: `UnscoredAnomaly` has no `score`
    // member at all, so there is no `?? 0` to write and no `rank: null` to
    // leak — a `0` would be the most ordinary security on record drawn at the
    // top of a region about unusual ones.
    if (!outcome.scored) continue;

    scored += 1;
    candidates.push({
      symbol,
      score: outcome.score,
      outcome,
      percent: figure.percent,
    });
  }

  // **The cohort rule, and the ranking inside it** (AC 3). Two scores are
  // comparable only over the same factor set, so the largest cohort is
  // selected first and the order is applied **within** it — a top-N taken
  // before the partition would be a top-N of whichever scale happened to
  // produce the biggest numbers, which is the promotion of the worst-covered
  // securities AC 3 refuses in terms.
  const cohort = selectLargestCohort(candidates, (row) => row.outcome);
  const scale = cohortOfSelection(cohort);

  return {
    basis: "observed",
    // **Bounded rather than sorted, through the one comparator** —
    // `one-comparator-for-the-order-of-a-composite-score`. Score descending,
    // then ticker ascending, which is a total order: this list arrives in the
    // join's order and that order is not stable between frames.
    rows: selectByScore(cohort.members, limit).map(rowOf),
    tracked: moves.tracked,
    eligible,
    scored,
    // `exactOptionalPropertyTypes`: *absent* and *present as `undefined`* are
    // different types, and the wire's own encoder drops neither — a key in the
    // map is a key on the wire whatever it holds.
    ...(scale === undefined ? {} : { cohort: scale }),
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
 * **The last completed session's ranking, as a section** (Task 5.4.5; re-based
 * on the stored composite at Task 5.6.7) — read from what the nightly pass
 * wrote, and ranked through the one comparator.
 *
 * ## Every figure here is the PASS's, and none of it is this process's
 *
 * The counts, the five refusals, the tape, the grid stride, the lookback and
 * the sample bound all come off the stored rows rather than off this bundle's
 * constants — `0014` §5's argument, which is the one
 * `WireRefusedPercentile.minimumSampleCount` already records: a rollback can
 * put a runner and a reader two values apart, and the figure a sentence states
 * must be the one the producer applied.
 *
 * ## TWO TABLES, ONE SESSION — and the halves may not be mixed
 *
 * `0017` §2 pairs them deliberately: `session_composite_scores` and
 * `session_return_percentiles` carry the **same** `observed_at` for one
 * session, so a reader holding both has the price factor's own figures beside
 * the composite with no second key. This function needs both halves and
 * neither alone:
 *
 *   - the **composite** rows carry the minted score, its band and the three
 *     factor answers the cohort is read off;
 *   - the **percentile** rows carry the signed closing move the direction
 *     glyph needs, and the pass row carries `eligible` and the five refusal
 *     counts — figures `session_composite_score_passes` has no column for,
 *     because `tracked = scored + unscored` is the only arithmetic that table
 *     closes.
 *
 * **Where the two halves are for different sessions the composite is
 * dropped**, and the region draws the percentile pass's counts with
 * `scored: 0` and no rows. That is not a tidy-up: the two caches memoise on
 * their own pass rows' instants and read *the newest session at or before*
 * independently, so a crash between the two writes — or a re-run that got
 * through one — leaves them one session apart, and stating Friday's `eligible`
 * beside Thursday's scores is `last-closes-cache.ts`' recorded defect exactly.
 * A well-formed, correctly-dated wrong answer is the one failure mode this
 * whole arm exists to prevent.
 *
 * ## The one figure this function supplies
 *
 * `tracked` **when there is nothing stored**, and it is the shared pass's own
 * figure rather than a literal — because *of the 501 companies we track,
 * none…* is a true sentence about a store with no session in it, while a
 * `tracked: 0` beside it would say we track nothing.
 *
 * ## The session named is the STORED one, never the one we asked about
 *
 * Where a ranking exists the sentence is dated by `pass.observedAt`'s own
 * session; where none does, by the session the shared pass asked about. A
 * date recorded against figures from another session is
 * `last-closes-cache.ts`' recorded defect, and the two disagree every evening
 * between the bell and that night's run.
 */
function sessionSection(
  asked: MarketDate,
  ranking: StoredSessionRanking | undefined,
  composites: StoredCompositeRanking | undefined,
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
      // stored can tell us. **And no `cohort`** — a region with no scored
      // security has no scale to name, and naming one would be ADR 0029's
      // fully-formed record about zero rows.
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
  const session = marketDateAt(pass.observedAt);

  // **The two halves, or neither** — see the docblock. The comparison is on the
  // market-local session rather than on the two instants, because that is the
  // coordinate both tables are keyed *for* and a reader asking *are these the
  // same session* must not have to know that both store a close.
  const composite =
    composites !== undefined &&
    marketDateAt(composites.pass.observedAt) === session
      ? composites
      : undefined;

  // **The signed closing move, by symbol** — the one thing the composite rows
  // do not carry and the direction glyph cannot do without. A `Map` over at
  // most 485 rows, built once per section rather than a find per row.
  const moveOf = new Map(scores.map((score) => [score.symbol, score.percent]));

  const candidates: Candidate[] =
    composite === undefined
      ? []
      : composite.scores.map((score) => storedCandidateOf(score, moveOf));

  const cohort = selectLargestCohort(candidates, (row) => row.outcome);
  const scale = cohortOfSelection(cohort);

  return {
    basis: "session",
    // **The same comparator the live arm uses** —
    // `one-comparator-for-the-order-of-a-composite-score` permits exactly one
    // home for this order, and the store deliberately returns its rows in
    // **ticker** order so that the ranking is performed here or not at all.
    rows: selectByScore(cohort.members, limit).map(rowOf),
    tracked: pass.tracked,
    eligible: pass.eligible,
    // **The COMPOSITE pass's count, not the percentile pass's** — `scored`
    // means *got a composite score* since Task 5.6.7, and the two figures are
    // genuinely different: the percentile pass scored 485 and a security whose
    // price baseline refused can still have a composite from its excess move.
    // `0` where the composite half was dropped, which is honest rather than
    // conservative: none of these securities has a composite this process can
    // draw.
    scored: composite === undefined ? 0 : composite.pass.scored,
    ...(scale === undefined ? {} : { cohort: scale }),
    session,
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
        session,
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
 * One stored composite, as a candidate.
 *
 * **The outcome is the store's MINTED one and never the stored column** —
 * Task 5.6.6's constraint 2 and `a-stored-composite-is-minted-from-its-answers`
 * in `pnpm invariants`: `StoredCompositeScore.outcome` was produced by
 * `scoreAnomaly` from the row's three stored factor answers, and the row's
 * stored `score`, `band` and `max` were read only to be **disagreed with**. A
 * row whose stored figures did not reproduce was dropped and counted by the
 * store before this function ever saw it.
 *
 * **Built field by field, never spread** — ADR 0031, and here the type would
 * not even allow one: `StoredCompositeScore` carries the three `FactorAnswer`s
 * as the row's content and those are the score's identity rather than anything
 * a browser draws.
 *
 * An unscored outcome cannot reach here —
 * `session_composite_scores_one_factor_contributes` refuses a row with no
 * ranked factor and the store counts a non-reproducing one as a disagreement —
 * so the narrowing is a filter in the mapper's own type rather than a branch
 * with an invented alternative.
 */
const storedCandidateOf = (
  score: StoredCompositeScore,
  moveOf: ReadonlyMap<Ticker, number>,
): Candidate => {
  if (!score.outcome.scored) {
    // Unreachable through the store; see the docblock. A `throw` rather than a
    // fallback for `scoreAnomaly`'s own reason — a substituted score here would
    // be a figure nobody can trace, at the top of a region about unusual
    // behaviour.
    throw new RangeError(
      `the stored composite for ${score.symbol} carries no contributing ` +
        "factor, which session_composite_scores_one_factor_contributes forbids.",
    );
  }

  const percent = moveOf.get(score.symbol);

  return {
    symbol: score.symbol,
    score: score.outcome.score,
    outcome: score.outcome,
    // **Absent rather than `0`.** A security scored on its excess factor alone
    // has a composite row and no percentile row — `0` of 485 measured, and
    // representable — and the glyph is then absent rather than claiming the
    // security did not move.
    percent,
  };
};
