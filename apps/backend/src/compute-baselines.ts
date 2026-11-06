import {
  BASELINE_LOOKBACK_SESSIONS,
  BASELINE_MINIMUM_SAMPLE,
  CORRELATION_LOOKBACK_SESSIONS,
  correlationIsSignificant,
  excessMoveReference,
  pearsonCorrelation,
  scoreAnomaly,
} from "@marketpulse/shared";

import type {
  AnomalyBand,
  ExcessBaselineRefusal,
  ExcessMoveReference,
  MarketSession,
  PercentileRefusal,
  Ticker,
} from "@marketpulse/shared";
import { RETURN_SPAN_MINUTES } from "./five-minute-return.js";
import type { ReturnRefusal } from "./five-minute-return.js";

import { ConfigError, loadConfig, loadEnvFile } from "./config.js";
import { closeDatabasePool, createDatabasePool } from "./database.js";
import type { DatabaseLogger } from "./database.js";
import {
  SAMPLE_SPAN_MINUTES,
  baselineReturnSeries,
  baselineWindowEndingAt,
  returnBaselineOf,
  seriesIsDiscontinuous,
} from "./return-baseline.js";
import type {
  BaselineWindow,
  ReturnBaselineOutcome,
} from "./return-baseline.js";
import {
  BASELINE_FEED,
  createReturnBaselineStore,
} from "./return-baseline-store.js";
import type {
  BaselineSubject,
  ReturnBaselineStore,
  StoredReturnBaseline,
} from "./return-baseline-store.js";
import { createSessionPercentileStore } from "./session-percentile-store.js";
import { createSessionCompositeStore } from "./session-composite-store.js";
import type { SessionCompositeStore } from "./session-composite-store.js";
import { compositeAnswers } from "./market-composite.js";
import { excessMoveFactor } from "./excess-move-factor.js";
import type {
  SessionPercentileStore,
  StoredSessionRefusals,
} from "./session-percentile-store.js";
import { excessLegOf, sessionClosingReturn } from "./session-percentile.js";
import type { SessionReturnOutcome } from "./session-percentile.js";
import { comparableBaseline, returnPercentileOf } from "./return-percentile.js";
import type {
  BaselineComparison,
  ReturnPercentile,
} from "./return-percentile.js";
import {
  TARGET_RELATIVE_STANDARD_ERROR,
  VOLUME_BASELINE_FEED,
  comparableVolumeBaseline,
  volumeBaselineOf,
} from "./volume-baseline.js";
import type { VolumeBaselineOutcome } from "./volume-baseline.js";
import { createVolumeBaselineStore } from "./volume-baseline-store.js";
import type {
  VolumeBaselineStore,
  VolumeBucketTally,
} from "./volume-baseline-store.js";
import { UNIVERSE, equityTickers } from "./universe.js";
import {
  EXCESS_REFERENCE_KIND,
  excessBaselineOf,
} from "./excess-move-baseline.js";
import { createExcessBaselineStore } from "./excess-move-baseline-store.js";
import type {
  ExcessBaselineStore,
  ExcessRefusalTally,
  StoredExcessBaseline,
} from "./excess-move-baseline-store.js";
import { createReturnCorrelationStore } from "./return-correlation-store.js";
import type {
  CorrelationRefusalTally,
  ReturnCorrelationStore,
} from "./return-correlation-store.js";
import { selectStrongestCorrelations } from "./return-correlation-selection.js";
import type { CorrelationCandidate } from "./return-correlation-selection.js";

/**
 * **The nightly pass — the one thing in this product that no request path can
 * produce** (Task 5.3.2, ADR 0044).
 *
 * ## Where it runs, and why that is a copy rather than a new pattern
 *
 * `.github/workflows/backfill.yml`, as a job **ordered after the fill**. Story
 * 5.3's AC 1 note that an in-process scheduler would be a new pattern is
 * narrowly false — `market-gateway.ts` already runs a `setInterval` keepalive —
 * and the accurate sentence is that **no timer in this process does database
 * work, or work longer than a tick**.
 *
 * **In that workflow and not in a cron of its own or in `deploy.yml`.** AC 5
 * ends the window at *the last session the backfill has completed*, which is a
 * **data dependency on the fill**: a cron of its own would race it, and
 * `deploy.yml`'s three sequenced steps are all latency-bounded and idempotent
 * while a multi-minute read is neither.
 *
 * **Not in the backend process**, and the five reasons are properties of this
 * deployment rather than preferences: the container envelope is **0.25 vCPU /
 * 0.5 GiB**, so the pass must stream; row deserialisation would run on the
 * **same single thread** as `publishObservations` (~16×/min) and the
 * deliberately synchronous overview join; an OOM or a long stall kills **the
 * only replica** (`minReplicas: 1`, `Single` revision mode), taking the market
 * socket and `live-bar-writer` with it and holing `market_bars`; it would hold
 * one of `POOL_MAX = 10` of **35 user connections** for minutes; and a deploy
 * restarts it mid-pass with no record that it failed. **Reversal trigger, a
 * condition:** *the first reader that must score a session the nightly runner
 * has not yet written.*
 *
 * ## One security at a time, and the loop is sequential on purpose
 *
 * `return-baseline-store.ts`' header carries the regime argument. What belongs
 * here is the consequence for the loop: each security is one ordered index
 * range scan of ~538 correlated blocks, and the rows are released before the
 * next security's are asked for — so the pass's resident set is one security's
 * window rather than the universe's, and a pass that dies has written every
 * generation it finished. Running them concurrently would multiply the
 * resident set by the concurrency and put the fetches back in the uncorrelated
 * regime this shape exists to stay out of.
 *
 * ## Amended 2026-11-06 by Task 6.5.1 — the paragraph above is now FALSE for
 * ## one phase of this pass, and both of its claims fail for that phase
 *
 * **The resident set is no longer one security's window.** The correlation
 * phase needs every eligible equity's return series **at the same time** —
 * a correlation is a function of two of them, so there is no ordering of the
 * pairs that lets a series be released before every pair it belongs to has
 * been computed. So {@link runPass} accumulates one `Map<Ticker,
 * ReadonlyMap<number, number>>` across the whole per-security loop and holds
 * it until the pairwise phase ends.
 *
 * **Measured on this developer's populated store** (48.8 M bars, 60 sessions
 * ending 2026-09-11), against a control arm of the same pass with the
 * accumulation removed and nothing else changed:
 *
 * | Figure                  | With the phase | Control  |
 * | ----------------------- | -------------- | -------- |
 * | RSS at pass start       | 79.2 MB        | 79.1 MB  |
 * | RSS entering the pairs  | **750.5 MB**   | 324.4 MB |
 * | peak RSS                | **750.5 MB**   | 324.5 MB |
 * | whole pass              | **38.87 s**    | 17.06 s  |
 * | pairwise phase alone    | **15.25 s**    | 0.01 s   |
 * | series held             | 496            | 0        |
 *
 * So the phase's **added** resident set is **426.1 MB** and its **added** wall
 * clock is **21.81 s**, of which 15.25 s is the pairwise walk and the
 * remaining ~6.6 s is `baselineReturnSeries` building 496 maps inside the
 * loop. The peak is reached **before** the pairwise phase and does not move
 * during it, which is the design's own claim measured: the phase allocates
 * nothing per pair.
 *
 * **The shaping's estimate of 10–20 MB for the accumulated series was 21–43×
 * low**, and the reason is worth carrying: a `Map<number, number>` of ~4,000
 * entries costs far more than its 8-bytes-an-entry payload, so an estimate
 * taken from the data's own size is not an estimate of a `Map` of it. Every
 * figure above is **local, one laptop, one store, one run per arm**.
 *
 * **The alternative was considered and is a second read.** Reading each
 * security's window twice — once in this loop and once per pair — is 125,250
 * reads of 538 correlated blocks, which is the cost regime ADR 0044's whole
 * decision exists to stay out of. Holding the series is the cheap arm, and
 * the pass runs on a GitHub runner (`backfill.yml`'s `baselines` job,
 * `timeout-minutes: 90`) rather than in the 0.25 vCPU / 0.5 GiB container —
 * this module's header above — so the figure is measured against a runner's
 * 16 GB rather than against the deployment's envelope.
 *
 * **And the resumability claim is narrower than it was, which is the half
 * worth knowing before relying on it.** *A pass that dies has written every
 * generation it finished* is still true of the **four per-security tables**:
 * each is its own upsert as the loop progresses. It is **false** of
 * `return_correlations`, whose rows all arrive after the loop ends — so a
 * crash anywhere before that point writes **no correlation row at all**, and a
 * crash during the pairwise phase writes none either. The repair is a re-run
 * of the pairwise phase, which is **in-memory and reads no bars**, so what is
 * lost is the phase's own wall clock rather than the pass's I/O. ADR 0044's
 * 2026-11-06 amendment records that this is the first member of its family
 * for which two of its stated properties do not hold.
 */

export interface ComputeBaselinesOutcome {
  readonly exitCode: 0 | 1;
  readonly lines: readonly string[];
  readonly errors: readonly string[];
}

/** What one pass did, so the summary is counted rather than described. */
interface PassTally {
  measured: number;
  refused: number;
  /** No stored `sip` grid pairs at all — **no row written**. */
  absent: number;
  samples: number;
  /** The session ranking's own figures; see {@link SessionTally}. */
  session: SessionTally;
  /** The volume baseline's own figures; see {@link VolumeTally}. */
  volume: VolumeTally;
  /** The excess-move baseline's own figures; see {@link ExcessTally}. */
  excess: ExcessTally;
  /** The stored composite's own figures; see {@link CompositeTally}. */
  composite: CompositeTally;
  /** The pairwise correlation's own figures; see {@link CorrelationTally}. */
  correlation: CorrelationTally;
}

/**
 * **The pairwise correlation's tally — TWO population chains at TWO grains,
 * and that is the whole point of it** (Task 6.5.1).
 *
 * Every tally above this one counts securities. This one counts securities
 * **and** pairs, because a security-grain refusal removes **~500 candidate
 * pairs at a stroke** and a pass row reporting one undifferentiated `refused`
 * count could not express that. `0018` §5 holds both arithmetics in the
 * database — the security populations **partition**, the pair populations
 * **nest** — so a pass that died mid-phase writes a row that is refused rather
 * than a row whose counts quietly do not add up.
 *
 * `samples`, `smallestOverlap`, `largestOverlap`, `strongest`, `weakest` and
 * `sameSector` are **measurement** rather than product, which is
 * `ExcessTally`'s two sample bounds one quantity over. Nothing stores them —
 * every row carries its own `n` and its own coefficient. They are here because
 * two later tasks need them and cannot get them any other way: **Task 6.5.3**
 * settles `N` from a measurement of readability and frame rate, which needs to
 * know what a real retained set looks like, and **Story 6.5's own Open
 * Decision 4** asks this pass to *measure and report what share of the
 * retained set turns out to be same-sector* — because if that share is near
 * 100%, the edge layer is mostly restating the clustering the membership edges
 * already draw rather than adding the cross-cluster information this story's
 * own "what the user can see" promises.
 */
interface CorrelationTally {
  /** The active equities the pass was over. Counted, never spelled. */
  trackedEquities: number;
  /** Passed the split guard and produced at least one grid return. */
  eligibleEquities: number;
  /** The price pass's own verdict, inherited rather than re-evaluated. */
  splitDiscontinuity: number;
  /** No stored grid pair at all — **no series**, and CI's whole state. */
  absent: number;

  /** `C(eligible, 2)`. */
  candidatePairs: number;
  /** Cleared the overlap floor and produced a finite coefficient. */
  computedPairs: number;
  /** In some node's top-N **and** significant. The rows the pass wrote. */
  retainedPairs: number;

  /** The two pair-grain refusals, which sum to `candidate − computed`. */
  refusals: CorrelationRefusalTally;
  /**
   * Computed, finite, and **not distinguishable from zero** at that pair's own
   * `n`. The **cut** rather than a refusal — Open Decision 3's *no edge below a
   * derived floor* — which is why it is outside the partition above.
   */
  belowSignificance: number;

  /** The summed overlap over the retained pairs, for a mean. */
  samples: number;
  /** The least and greatest overlap a retained pair was measured over. */
  smallestOverlap: number;
  largestOverlap: number;
  /** The greatest and least `|r|` in the retained set. */
  strongest: number;
  weakest: number;
  /**
   * How many retained pairs join two equities of the **same sector** — Open
   * Decision 4's own question, answered by the pass rather than assumed away.
   */
  sameSector: number;
}

const noCorrelationTally = (): CorrelationTally => ({
  trackedEquities: 0,
  eligibleEquities: 0,
  splitDiscontinuity: 0,
  absent: 0,
  candidatePairs: 0,
  computedPairs: 0,
  retainedPairs: 0,
  refusals: { tooFewOverlappingSamples: 0, zeroVariance: 0 },
  belowSignificance: 0,
  samples: 0,
  smallestOverlap: Number.POSITIVE_INFINITY,
  largestOverlap: 0,
  strongest: 0,
  weakest: Number.POSITIVE_INFINITY,
  sameSector: 0,
});

/**
 * **How many correlation edges one node keeps: 5 — and it is a WORKING DEFAULT
 * pending Task 6.5.3's own measurement, not a settled figure.**
 *
 * Story 6.5's Open Decision 1 is explicit about this. What Gate 1 settled is
 * the **selection mechanism** — the union of each node's own top-N, stored
 * once in canonical ticker order — and it deferred the figure to a measurement
 * of readability and frame rate against the **real elliptical ring** Story 6.2
 * shipped (`TOPOLOGY_RING_RADIUS_X = 800`, `TOPOLOGY_RING_RADIUS_Y = 340`,
 * fitted extent 1880 × 923, a 2.04 aspect ratio rather than the near-square
 * one the figure below was originally reasoned against).
 *
 * **5 is the story's own arithmetic and is here so the pass can run at all**:
 * at ~501 nodes it is 2,500 edge slots, which sits inside
 * `PRODUCT_SPEC.md` §28's *several thousand edges*, where N = 20 does not. It
 * is named rather than inlined, and it is **stored on every pass row**
 * (`retained_n`), so two generations computed under two values of it are
 * tellable apart without re-reading the code that wrote them — which is the
 * one thing a provisional parameter owes.
 *
 * **Changing it is a recompute, not a migration**: `0018` §1 labels both
 * tables derived, and the first thing that will happen to them is that every
 * row is thrown away and rebuilt under whatever Task 6.5.3 measures.
 */
const RETAINED_N = 5;

/**
 * **The stored composite's tally — TWO security populations that partition**
 * (Task 5.6.6).
 *
 * `tracked = scored + unscored`, and the reason it is two rather than `0014`'s
 * nesting three or `0016`'s partitioning four is `0017` §4: every tracked
 * equity ends in exactly one of *it has a score* and *every factor was absent*,
 * with no intermediate population to nest. There is no refusal breakdown here
 * **on purpose** — the reasons are per factor and already counted on the two
 * pass rows this one shares an `observed_at` with, and a third copy would be a
 * third home for one fact.
 *
 * `bands` is **measurement** rather than product, like `ExcessTally`'s two
 * sample bounds: `ANOMALY_BAND_FLOORS` are measured quantiles of a max-75
 * two-factor distribution, and the figure that says whether they still describe
 * this store is how many securities land in each band. Nothing stores it — each
 * row carries its own band.
 */
interface CompositeTally {
  /** The equities the pass was over. Counted, never spelled. */
  tracked: number;
  /** How many got a score, and therefore have a row. */
  scored: number;
  /** How many had no contributing factor at all — **no row written**. */
  unscored: number;
  /** How many scored securities landed in each band, and in each factor set. */
  bands: Record<AnomalyBand, number>;
  /**
   * How many scored securities had each factor set, keyed by the set's own
   * membership — `price+excess`, `price`, `excess` — so the cohort line is read
   * off the pass rather than described.
   */
  sets: Map<string, number>;
}

/**
 * **The excess-move baseline's tally — FOUR security populations that
 * partition, and the refused one's breakdown** (Task 5.6.2).
 *
 * `VolumeTally`'s three-way partition with a fourth member, and the fourth is
 * the one worth a note: `inapplicable` is not a refusal and not an absence.
 * Fifteen of 516 securities have no sector benchmark at all — four market
 * proxies with no sector and eleven sector ETFs that **are** the benchmark —
 * and no amount of backfilling will ever produce a figure for them.
 * `excess_move_baseline_passes_securities_partition` holds the arithmetic in
 * the database.
 *
 * `smallestSample` and `largestSample` are **measurement** rather than
 * product: Task 5.6.3's band boundaries are derived from the distribution this
 * pass reports rather than guessed, and the thing that bounds it is `n`.
 * Neither is stored — the per-security `n` is, in every row.
 */
interface ExcessTally {
  tracked: number;
  measured: number;
  inapplicable: number;
  /** No grid pair present on both legs — **no row written**. */
  absent: number;
  refusals: ExcessRefusalTally;
  samples: number;
  /** The least and the greatest `n` a measured security reached. */
  smallestSample: number;
  largestSample: number;
}

/**
 * **The volume baseline's tally — three security populations that PARTITION,
 * and four bucket populations** (Task 5.5.3).
 *
 * Not `0014`'s nesting three, and `0015` §5 is the argument: every tracked
 * security ends in exactly one of *measured*, *refused for an inherited price
 * break*, and *never heard on this tape* — and on the `iex` tape the third is
 * essentially all of them for weeks, which Gate 1 decision 1 accepted
 * explicitly. A reader cannot subtract *how many securities can this figure be
 * drawn for* out of three figures that overlap, and
 * `volume_baseline_passes_securities_partition` holds the arithmetic in the
 * database.
 */
export interface VolumeTally {
  tracked: number;
  measured: number;
  splitDiscontinuity: number;
  /** No bar of this tape anywhere in the window — **no row written**. */
  absent: number;
  samples: number;
  buckets: VolumeBucketTally;
  /**
   * **A bounded SAMPLE of the drawable pairs, for a person in a chair** (Task
   * 5.7.1) — never the population, and never the count.
   *
   * `buckets.measured` is the exact figure and stays the only one the summary
   * states as a number; this is a list of up to
   * {@link DRAWABLE_PAIRS_NAMED} `(symbol, bucket)` pairs so somebody can
   * **open one**. At 4 drawable of 39,928 (the deployed pass for session
   * 2026-10-20, 0.010%) the figure is unfindable by browsing, and nothing else
   * in this product can answer *which four*.
   *
   * It is **not** stored. `VolumeBaselinePassWrite` is the row the pass writes
   * and this is a line in a log — a sample of a derived population belongs in
   * neither a column nor a constraint.
   */
  drawable: DrawableBucket[];
}

/**
 * One drawable `(symbol, bucket)` pair, as the summary names it.
 *
 * The bucket is carried as the **index** and rendered as an index plus an
 * offset from the session open. There is deliberately **no wall-clock time and
 * no timezone here**: `Intl.DateTimeFormat` and the market's timezone
 * identifier are confined to `packages/shared/src/market-time.ts` by lint, and
 * a hand-rolled offset is exactly the conversion that rule exists to prevent.
 */
interface DrawableBucket {
  readonly symbol: Ticker;
  /** The grid bucket — `volumeBucketOf`'s answer, bucket 0 first. */
  readonly bucket: number;
}

/**
 * **How many drawable pairs the summary NAMES — a cap rather than a
 * population** (Task 5.7.1).
 *
 * The list is bounded because the count is not: it was **4** on the deployment
 * for session 2026-10-20 and its ceiling is the whole grid, **39,928** pairs,
 * which arrives on its own as the `iex` tape accumulates depth — 132 sessions
 * for `NVDA`'s best bucket. A pass that prints one line per drawable pair would
 * one day print tens of thousands of them into a nightly log.
 *
 * **20**, because this is read by a person choosing a page to open: it is
 * enough to offer several securities at several times of day even when the
 * first few share one, and it is one screen. It is not a number anything
 * computes with — `tally.buckets.measured` stays the exact count, and what the
 * cap elides is reported as a remainder off that figure.
 */
const DRAWABLE_PAIRS_NAMED = 20;

/** The one arm of {@link VolumeBaselineOutcome} that has buckets to tally. */
export type MeasuredVolumeOutcome = Extract<
  VolumeBaselineOutcome,
  { kind: "measured" }
>;

/**
 * **The session ranking's tally — the three populations and the five refusals**
 * (Task 5.4.5).
 *
 * The same five words the live producer counts (`ReturnRefusal`'s three and
 * `PercentileRefusal`'s two), because `Unusual activity`'s footer is **one
 * sentence either way**: a reader out of hours is owed the same three figures
 * and the same two reasons as a reader at 11:00, and a second vocabulary here
 * would be a second sentence.
 */
interface SessionTally {
  /** The equities the pass was over. Counted, never spelled. */
  tracked: number;
  /** How many held two closes exactly the span apart at the session's end. */
  eligible: number;
  /** How many of those could be ranked, and therefore have a row. */
  scored: number;
  /**
   * The five accumulators — **the stored shape with its `readonly` removed**,
   * rather than a hand-written object, so a sixth refusal column cannot be
   * added to the table without appearing here.
   */
  refusals: { -readonly [K in keyof StoredSessionRefusals]: number };
}

const noSessionTally = (): SessionTally => ({
  tracked: 0,
  eligible: 0,
  scored: 0,
  refusals: {
    nothingObserved: 0,
    noEarlierEndpoint: 0,
    noBasis: 0,
    tooFewSamples: 0,
    splitDiscontinuity: 0,
  },
});

/**
 * **One sector benchmark's window, read once in the prologue** — its closes,
 * its split verdict, and its own closing five-minute return.
 *
 * A named type rather than an inline object because it gained a third member
 * at Task 5.6.6 and is now passed to two functions.
 */
interface Benchmark {
  readonly closes: ReadonlyMap<number, number>;
  readonly discontinuous: boolean;
  /**
   * The fund's own closing return for the scored session, or `undefined` where
   * there is no scored session at all — which is the state of a window with no
   * last session, and is CI's.
   */
  readonly closingReturn: SessionReturnOutcome | undefined;
}

const noCompositeTally = (): CompositeTally => ({
  tracked: 0,
  scored: 0,
  unscored: 0,
  bands: { normal: 0, elevated: 0, high: 0, extreme: 0 },
  sets: new Map(),
});

const noExcessTally = (): ExcessTally => ({
  tracked: 0,
  measured: 0,
  inapplicable: 0,
  absent: 0,
  refusals: { splitDiscontinuity: 0, referenceSplitDiscontinuity: 0 },
  samples: 0,
  smallestSample: Number.POSITIVE_INFINITY,
  largestSample: 0,
});

export const noVolumeTally = (): VolumeTally => ({
  tracked: 0,
  measured: 0,
  splitDiscontinuity: 0,
  absent: 0,
  samples: 0,
  buckets: {
    total: 0,
    measured: 0,
    tooFewSessions: 0,
    zeroVolume: 0,
    empty: 0,
  },
  drawable: [],
});

export async function computeBaselines(): Promise<ComputeBaselinesOutcome> {
  loadEnvFile();

  let config;
  try {
    config = loadConfig();
  } catch (error) {
    return {
      exitCode: 1,
      lines: [],
      errors: [
        `\n${error instanceof ConfigError ? error.message : String(error)}\n`,
      ],
    };
  }

  const pool = createDatabasePool(
    config.database,
    consoleLogger(config.logLevel === "debug" || config.logLevel === "trace"),
  );
  const store = createReturnBaselineStore(pool);
  // **The second store, on the same pool.** Two modules because their reads
  // are of different things and at different scales; one pool because this is
  // one process doing one pass.
  const sessions = createSessionPercentileStore(pool);
  // **The third store, on the same pool, for `session-percentile-store.ts`'
  // recorded reason**: its reads are of a different thing at a different scale
  // and it is the one place that spells `feed = 'iex'`. One pool, because this
  // is one process doing one pass.
  const volumes = createVolumeBaselineStore(pool);
  // **The fourth store, on the same pool**, for the same recorded reason: its
  // writes are of a different thing, and this is one process doing one pass.
  // Note what it does NOT have — a read of `market_bars`. Both legs of the
  // excess go through `ReturnBaselineStore.readWindowCloses`, the one query
  // object `EXPLAIN` has been taken of; see that module's header.
  const excess = createExcessBaselineStore(pool);
  // **The fifth store, on the same pool**, for the same recorded reason: its
  // rows hold a **policy applied to measurements** rather than a measurement,
  // and this is one process doing one pass. It has no read of `market_bars`
  // either — every input to a composite is a value one of the four stores
  // above already produced in this iteration.
  const composites = createSessionCompositeStore(pool);
  // **The sixth store, on the same pool**, for the same recorded reason: its
  // rows are keyed by a **pair** rather than by a security, which no store
  // above it is, and this is one process doing one pass. It has no read of
  // `market_bars` either — and no read at all, because nothing reads these
  // rows until Task 6.5.2 builds the route.
  const correlations = createReturnCorrelationStore(pool);

  const lines: string[] = [];
  const errors: string[] = [];

  try {
    // **The window's end from a per-tape count, never from the clock and
    // never from the ledger** (Task 5.5.1). See
    // `ReturnBaselineStore.tapeCoveredEnd` for why all three disagree, and
    // `baseline-frontier.ts` for the two production transcripts of the one
    // this repaired — a generation stamped four hours into the future at 09:04
    // ET, and a session the fill then never fetched at all.
    const frontier = await store.tapeCoveredEnd();

    if (frontier === undefined) {
      lines.push(
        `No session in the last ${String(BASELINE_LOOKBACK_SESSIONS)} holds a ` +
          `\`1m\` \`${BASELINE_FEED}\` bar for any tracked security, so there`,
        "is no window to compute a baseline over. Run `pnpm backfill` first;",
        "this is also the state of CI's store, which holds 516 securities and",
        "zero bars.",
      );
      return { exitCode: 0, lines, errors };
    }

    // One home for the derivation; the diagnostics route reads the same
    // function so its `EXPLAIN` is of the query this pass issues.
    const window = baselineWindowEndingAt(frontier);
    const subjects = await store.activeSubjects();

    lines.push(
      `return baselines for ${window.asOfSession} — ` +
        `${String(window.sessions.length)} sessions, ` +
        `${String(subjects.length)} tracked securities`,
      `window ${window.range.start.toISOString()} … ${window.range.end.toISOString()}`,
    );

    const tally = await runPass(
      store,
      sessions,
      volumes,
      excess,
      composites,
      correlations,
      subjects,
      window,
    );

    lines.push(
      `measured ${String(tally.measured)}, ` +
        `refused ${String(tally.refused)}, ` +
        `no samples ${String(tally.absent)} (no row written)`,
      `samples ${String(tally.samples)} total, ` +
        `${tally.measured === 0 ? "—" : String(Math.round(tally.samples / tally.measured))} mean n`,
      // The session ranking's own line, read off the tally rather than
      // described — these are the three figures `/` states out of hours.
      `closing ranking for ${window.asOfSession} — ` +
        `tracked ${String(tally.session.tracked)}, ` +
        `eligible ${String(tally.session.eligible)}, ` +
        `scored ${String(tally.session.scored)}`,
      // **The volume baseline's own two lines, read off the tally.** The first
      // is the security partition and the second is the bucket one — and the
      // bucket line is the depth figure, because on the `iex` tape the ordinary
      // answer for weeks is that nothing meets the precision target at all
      // (Gate 1 decision 1's accepted outcome, not a fault).
      `volume baselines on ${VOLUME_BASELINE_FEED} for ${window.asOfSession} — ` +
        `measured ${String(tally.volume.measured)}, ` +
        `split-refused ${String(tally.volume.splitDiscontinuity)}, ` +
        `no same-tape history ${String(tally.volume.absent)} (no row written)`,
      `volume buckets — ` +
        `${String(tally.volume.buckets.measured)} drawable of ` +
        `${String(tally.volume.buckets.total)} with samples, ` +
        `${String(tally.volume.buckets.tooFewSessions)} too few sessions, ` +
        `${String(tally.volume.buckets.zeroVolume)} zero volume, ` +
        `${String(tally.volume.buckets.empty)} empty; ` +
        `${String(tally.volume.samples)} minute samples, target ` +
        `${String(TARGET_RELATIVE_STANDARD_ERROR * 100)}% relative SE`,
      // **Which buckets draw, not only how many** (Task 5.7.1). The line above
      // is the count and it is exact; this one is a bounded sample a person can
      // open — at 0.010% of the grid, a reader cannot find a drawn multiple by
      // browsing, and no other surface in this product can answer *which*.
      `drawable volume buckets — ${describeDrawableBuckets(tally.volume)}`,
      // **The excess-move baseline's two lines.** The first is the security
      // partition — four populations that sum to `tracked`, which the database
      // refuses a row that violates — and the second is the depth, because
      // Task 5.6.3's band boundaries are derived from this distribution rather
      // than guessed and `n` is what bounds it.
      `excess-move baselines vs ${EXCESS_REFERENCE_KIND} for ` +
        `${window.asOfSession} — measured ${String(tally.excess.measured)}, ` +
        `refused ${String(tally.excess.refusals.splitDiscontinuity)} own + ` +
        `${String(tally.excess.refusals.referenceSplitDiscontinuity)} reference, ` +
        `inapplicable ${String(tally.excess.inapplicable)} (no reference at all), ` +
        `no pairs ${String(tally.excess.absent)} (no row written)`,
      // **The stored composite's two lines** (Task 5.6.6). The first is the
      // security partition — two populations that sum to `tracked`, which the
      // database refuses a row that violates — and the second is the
      // measurement: which factor sets the scores came from, and how they fell
      // across the four bands, because `ANOMALY_BAND_FLOORS` are measured
      // quantiles of a two-factor distribution and this is the figure that
      // says whether they still describe this store.
      `session composites for ${window.asOfSession} — ` +
        `tracked ${String(tally.composite.tracked)}, ` +
        `scored ${String(tally.composite.scored)}, ` +
        `unscored ${String(tally.composite.unscored)} (no row written)`,
      `composite sets — ${describeSets(tally.composite.sets)}; bands — ` +
        `normal ${String(tally.composite.bands.normal)}, ` +
        `elevated ${String(tally.composite.bands.elevated)}, ` +
        `high ${String(tally.composite.bands.high)}, ` +
        `extreme ${String(tally.composite.bands.extreme)}`,
      `excess samples — ${String(tally.excess.samples)} total, ` +
        `${
          tally.excess.measured === 0
            ? "—"
            : String(Math.round(tally.excess.samples / tally.excess.measured))
        } mean n, ` +
        `${
          tally.excess.measured === 0
            ? "—"
            : String(tally.excess.smallestSample)
        } min, ` +
        `${String(tally.excess.largestSample)} max, against a minimum of ${String(BASELINE_MINIMUM_SAMPLE)}`,
      // **The pairwise correlation's two lines** (Task 6.5.1). The first is
      // the security partition — three populations that sum to `tracked`,
      // which the database refuses a row that violates — and the second is the
      // pair chain, which is the line that matters: the rows are a
      // **selection**, so `retained` says how many edges were drawn and
      // nothing whatever about how many pairs were considered, refused or cut.
      `return correlations on ${BASELINE_FEED} for ${window.asOfSession} — ` +
        `tracked ${String(tally.correlation.trackedEquities)} equities, ` +
        `eligible ${String(tally.correlation.eligibleEquities)}, ` +
        `split-refused ${String(tally.correlation.splitDiscontinuity)}, ` +
        `no series ${String(tally.correlation.absent)} (no pair formed)`,
      `correlation pairs — ` +
        `${String(tally.correlation.retainedPairs)} retained of ` +
        `${String(tally.correlation.computedPairs)} computed of ` +
        `${String(tally.correlation.candidatePairs)} candidate; ` +
        `${String(tally.correlation.refusals.tooFewOverlappingSamples)} too few ` +
        `overlapping samples, ` +
        `${String(tally.correlation.refusals.zeroVariance)} zero variance, ` +
        `${String(tally.correlation.belowSignificance)} below significance ` +
        `(a cut, not a refusal), at N = ${String(RETAINED_N)}`,
      // **The measurement rather than the product**, which is the excess
      // samples line's own shape: Task 6.5.3 settles `N` from a measurement of
      // what a real retained set looks like, and Story 6.5's Open Decision 4
      // asks this pass to report the same-sector share — because near 100%
      // would mean the edge layer is restating the clustering the membership
      // edges already draw.
      `retained correlations — ${describeRetainedCorrelations(tally.correlation)}`,
    );

    return { exitCode: 0, lines, errors };
  } catch (error) {
    errors.push(
      `\n${error instanceof Error ? error.message : String(error)}\n`,
    );
    return { exitCode: 1, lines, errors };
  } finally {
    await closeDatabasePool(pool);
  }
}

async function runPass(
  store: ReturnBaselineStore,
  sessions: SessionPercentileStore,
  volumes: VolumeBaselineStore,
  excess: ExcessBaselineStore,
  composites: SessionCompositeStore,
  correlations: ReturnCorrelationStore,
  subjects: readonly BaselineSubject[],
  window: BaselineWindow,
): Promise<PassTally> {
  const tally: PassTally = {
    measured: 0,
    refused: 0,
    absent: 0,
    samples: 0,
    session: noSessionTally(),
    volume: noVolumeTally(),
    excess: noExcessTally(),
    composite: noCompositeTally(),
    correlation: noCorrelationTally(),
  };

  // **The equities, by the same positive-membership selection breadth and the
  // movers use** — `equityTickers()`, and nothing here spells 501. A session
  // ranking that scored `SPY` and the eleven sector SPDRs beside their own
  // constituents would make `Unusual activity` and `Market proxies` /
  // `Sector performance` non-independent, which is AC 13 and is the same
  // argument `index.ts` makes for the live path.
  const isEquity = new Set<string>(equityTickers());

  // **Which fund each security is compared against, asked once per security
  // through the one shared resolver** — `excessMoveReference`, which the drawn
  // region's `figuresOf` reads as well, so the two processes cannot disagree
  // about the benchmark.
  //
  // It is keyed off the **curated universe** rather than off a second database
  // read, which is `isEquity`'s own precedent two lines above: `kind` and
  // `sector` are curated facts, `pnpm universe` converges the store on this
  // file, and `deploy.yml` loads it before either half of the code rolls. A
  // symbol the store holds and this file does not describe therefore has no
  // resolvable reference at all and is counted **absent** rather than
  // inapplicable — *we could not reach it*, which a universe load repairs,
  // against *the question does not arise*, which nothing repairs.
  const referenceOf = new Map(
    UNIVERSE.map((security) => [
      security.symbol,
      excessMoveReference(security),
    ]),
  );

  // **Which sector each security is curated into, for ONE measurement** —
  // Story 6.5's Open Decision 4 asks this pass to report what share of the
  // retained correlation set joins two equities of the same sector, because a
  // share near 100% means the edge layer is restating the clustering the
  // membership edges already draw. Keyed off the **curated universe** rather
  // than off a second database read, which is `isEquity`'s and `referenceOf`'s
  // own precedent two lines above: `sector` is a curated fact and
  // `pnpm universe` converges the store on this file.
  const sectorOf = new Map(
    UNIVERSE.map((security) => [security.symbol, security.sector]),
  );

  /**
   * **Every eligible equity's signed 5-minute return series, held across the
   * whole loop** — the one thing in this pass whose resident set is the
   * universe's rather than one security's.
   *
   * It is accumulated as a **by-product** of the window read each iteration
   * already issues, which is the entire reason Story 6.5's Open Decision 2
   * could choose a 5-minute grid over daily closes: a daily-close correlation
   * has a Fisher-z standard error of ≈0.13 at n = 60, so a top-5 selection
   * over it re-orders close to randomly from one night to the next. The
   * 5-minute grid gives n up to 4,620 and SE ≈ 0.015, and costs **no
   * additional read of `market_bars`**.
   *
   * The cost it does have is resident memory, measured and recorded in this
   * module's own 2026-11-06 amendment above.
   */
  const seriesOf = new Map<Ticker, ReadonlyMap<number, number>>();

  // **The eleven benchmarks' windows, read ONCE.**
  //
  // 501 equities are differenced against 11 funds, so reading the reference
  // inside the loop would be 501 reads of eleven windows — `538 correlated
  // blocks` apiece (`return-baseline-store.ts`' measurement) for an answer
  // already in hand. Read up front it is **527 series reads** for the whole
  // pass rather than 1,032, which is 2% more I/O than the price pass alone
  // rather than 96% more.
  //
  // The resident set is the stated cost: eleven windows of ~24,000 closes, a
  // few tens of megabytes, held for the pass's duration. It runs on a GitHub
  // runner and not in the 0.25 vCPU container — this module's header — and
  // eleven is a constant rather than a fraction of the universe, so it does
  // not grow with the roster.
  //
  // **Each fund's split verdict is computed here too**, once, for the same
  // reason: `seriesIsDiscontinuous` over eleven series rather than over 501
  // copies of eleven answers. A benchmark that crosses a price break refuses
  // every one of its constituents, which is the honest answer and is a
  // different sentence from the constituent's own break.
  // The last session of the window **is** the session being scored, and
  // `window.observedAt` is its close — `baselineWindowEndingAt` derives both
  // from one place, so there is nothing here to put out of step. It is read
  // **before** the prologue below, because each fund's own closing return is
  // taken there and a return is of a session.
  const scored = window.sessions[window.sessions.length - 1];

  const benchmarks = new Map<string, Benchmark>();

  for (const reference of referenceOf.values()) {
    if (!reference.applies) continue;
    if (benchmarks.has(reference.symbol)) continue;

    const fund = await store.subjectFor(reference.symbol);
    if (fund === undefined) {
      // The store has never heard of this fund. Its constituents are counted
      // absent below, which is the truth: no row, and a universe load fixes it.
      continue;
    }

    const closes = await store.readWindowCloses(fund, window.range);
    benchmarks.set(reference.symbol, {
      closes,
      discontinuous: seriesIsDiscontinuous(window.sessions, closes),
      // **The fund's own CLOSING five-minute return, taken once here** (Task
      // 5.6.6) — the reference leg of every constituent's excess numerator.
      //
      // Once per fund rather than once per constituent, which is the prologue's
      // own argument one quantity over: eleven walks of eleven resident maps
      // instead of 501 walks of the same eleven. And it is taken **here**, from
      // the same `closes` the distribution was sampled from and over the same
      // `scored` session, which is what makes
      // `one-instant-for-a-subject-and-its-benchmark` true of this path: there
      // is exactly one session expression in this file and both legs are read
      // against it.
      closingReturn:
        scored === undefined
          ? undefined
          : sessionClosingReturn({ session: scored, closes }),
    });
  }

  for (const subject of subjects) {
    const closes = await store.readWindowCloses(subject, window.range);
    const outcome = returnBaselineOf({ sessions: window.sessions, closes });

    if (outcome.kind === "none") {
      // **No row, deliberately.** *The pass has not reached this security* and
      // *the pass reached it and will not answer* are different facts, and only
      // the second is safe to stop retrying.
      tally.absent += 1;
    } else {
      await store.writeBaseline(
        subject,
        window.observedAt,
        BASELINE_LOOKBACK_SESSIONS,
        outcome,
      );

      tally.samples += outcome.sampleCount;
      if (outcome.kind === "measured") tally.measured += 1;
      else tally.refused += 1;
    }

    // **The session's closing score, off the closes already in hand** (Task
    // 5.4.5) — a by-product of the read above rather than a second pass over
    // the same bars, which is what makes this cost I/O nothing.
    const price =
      scored === undefined || !isEquity.has(subject.symbol)
        ? undefined
        : await scoreClosingMove(sessions, subject, window, scored, outcome, {
            closes,
            tally: tally.session,
          });

    // **The correlation's input series, in this same iteration** (Task
    // 6.5.1) — a second walk over `closes`, which is already in hand, so it
    // costs **no I/O at all**. `computeExcessBaseline`'s own property, and the
    // reason Story 6.5 could choose a 5-minute grid without a second pass.
    //
    // **Over the equities alone**, which is `scoreClosingMove`'s population
    // rather than the two baselines': Open Decision 4 settled that no landmark
    // node — the eleven sector SPDRs, the four proxies, the hub — ever forms a
    // correlation edge, because `SPY` correlates with nearly every equity in
    // the universe and admitting it would make every cluster independently
    // discover a strong correlation to the centre. That is the starburst §10's
    // own constraint exists to prevent. `0018` §6 records why this is asserted
    // on the producer rather than as a database constraint.
    if (isEquity.has(subject.symbol)) {
      tally.correlation.trackedEquities += 1;

      if (outcome.kind === "measured") {
        // **The split verdict is READ, not re-derived** — `outcome` is the
        // price generation this pass computed for the same `(security, window
        // end)` a few lines above, so the guard travels by being in hand.
        // `computeVolumeBaseline`'s arrangement and `0014` §5's *the
        // generation is identified rather than copied*: it is the same guard
        // over the same closes, so a second evaluation would be a second
        // answer rather than a corroboration.
        const series = baselineReturnSeries({
          sessions: window.sessions,
          closes,
        });

        // `measured` is returned only when the sampler found at least one grid
        // pair, over the same anchors this walk uses — so an empty series here
        // is unreachable, which is why `0018` §5 ships **no**
        // `no_series_count` column. A column that can only ever hold `0` reads
        // to the next author as a real population that happens to be empty.
        seriesOf.set(subject.symbol, series);
        tally.correlation.eligibleEquities += 1;
      } else if (outcome.kind === "refused") {
        // **Counted once, in security space** — never once per each of the
        // ~500 pairs it would have joined. `0018` §5.
        tally.correlation.splitDiscontinuity += 1;
      } else tally.correlation.absent += 1;
    }

    // **The volume baseline, in this same iteration** (Task 5.5.3). It is a
    // second statement over the **same** index range rather than a second
    // nightly pass over the same bars — `volume-baseline-store.ts`' header
    // carries the cost argument — and it is issued here, immediately after the
    // close read, so those 538 blocks are hot.
    //
    // **Over all 516 and not only the equities**, which is the opposite call
    // from the session ranking above and is deliberate: that one feeds a ranked
    // list where scoring `SPY` beside its own constituents would make two
    // regions non-independent (AC 13), while this one answers *how unusual is
    // this security's volume* on whatever security is on screen — and the
    // fifteen proxies have security pages too.
    await computeVolumeBaseline(
      volumes,
      subject,
      window,
      outcome,
      tally.volume,
    );

    // **The excess-move baseline, in this same iteration** (Task 5.6.2), and
    // for the same reason as the volume one: `closes` is already in hand and
    // the benchmark's window is already resident, so this costs **no I/O at
    // all** — it is a second walk over bars that have already been read.
    //
    // **Over all 516 and not only the equities**, which is the volume
    // baseline's call rather than the session ranking's: the fifteen proxies
    // have security pages too, and the four of them with no sector and the
    // eleven that are their own benchmark are `inapplicable` rather than
    // excluded — a security the pass skipped silently and a security the
    // question does not arise for are different facts, and only the second is
    // something a surface can say.
    const reference = referenceOf.get(subject.symbol);

    const stored = await computeExcessBaseline(
      excess,
      subject,
      window,
      outcome,
      {
        closes,
        reference,
        benchmarks,
        tally: tally.excess,
      },
    );

    // **The composite, LAST in the iteration and over the three answers the
    // four steps above have already produced** (Task 5.6.6). It reads no bars,
    // issues no query but its own write, and costs no I/O at all — which is
    // `computeExcessBaseline`'s own property one layer up.
    //
    // **Over the equities alone**, which is `scoreClosingMove`'s population
    // rather than the two baselines': this feeds a ranked list, and scoring
    // `SPY` beside its own constituents would make `Unusual activity` and
    // `Market proxies` / `Sector performance` non-independent (AC 13). `0017`
    // §7 carries the condition for widening it.
    if (
      scored !== undefined &&
      price !== undefined &&
      reference !== undefined
    ) {
      await scoreComposite(composites, subject, window, {
        price,
        reference,
        stored,
        benchmarks,
        tally: tally.composite,
      });
    }
  }

  // **The pairwise phase, AFTER the loop and reading no bars at all** (Task
  // 6.5.1). Every input is already resident: `seriesOf` was accumulated as a
  // by-product of the reads above, so this phase is pure CPU over process
  // memory. It is the one phase of this pass that is not per security, and
  // this module's own 2026-11-06 amendment records what that costs.
  await computeCorrelations(correlations, window, {
    seriesOf,
    sectorOf,
    tally: tally.correlation,
  });

  // **Written last and outside a transaction**, which is the session pass
  // row's own arrangement below. The difference worth knowing is that these
  // populations **partition** rather than nest, so a pass that died mid-loop
  // would write a row whose counts do not sum — and
  // `volume_baseline_passes_securities_partition` refuses it. That is the
  // intended behaviour rather than a hazard: no pass row at all is the
  // readable state, exactly as it is one table over.
  // **Written last and outside a transaction**, which is the arrangement both
  // pass rows beside it already have, and the four populations **partition** —
  // so a pass that died mid-loop writes a row whose counts do not sum and
  // `excess_move_baseline_passes_securities_partition` refuses it. No pass row
  // at all is the readable state.
  await excess.writePass(window.observedAt, {
    tracked: tally.excess.tracked,
    measured: tally.excess.measured,
    inapplicable: tally.excess.inapplicable,
    absent: tally.excess.absent,
    refusals: tally.excess.refusals,
    parameters: {
      referenceKind: EXCESS_REFERENCE_KIND,
      lookbackSessions: BASELINE_LOOKBACK_SESSIONS,
      // Read from the producers that own them rather than spelled — the stride
      // is the sampler's, the tape is the store's own `where`, and the bound is
      // the one the reader applies. What is stored is what this pass applied.
      spanMinutes: SAMPLE_SPAN_MINUTES,
      feed: BASELINE_FEED,
      minimumSampleCount: BASELINE_MINIMUM_SAMPLE,
    },
  });

  // **Written last and outside a transaction**, which is the arrangement all
  // three pass rows beside it have, and the two populations **partition** — so
  // a pass that died mid-loop writes a row whose counts do not sum and
  // `session_composite_score_passes_populations_partition` refuses it. No pass
  // row at all is the readable state: `readNewestSession` bounds the scores on
  // it, so a crash leaves rows nothing reads rather than a session drawn under
  // the wrong figures.
  //
  // **The weights and the floors are not arguments** — the store reads them
  // from `FACTOR_WEIGHTS` and `ANOMALY_BAND_FLOORS`, because what must be
  // stored is what the **minting** applied and nothing else in this process
  // knows that but the scorer. `0017` §5.
  if (scored !== undefined) {
    await composites.writePass(window.observedAt, {
      tracked: tally.composite.tracked,
      scored: tally.composite.scored,
      unscored: tally.composite.unscored,
    });
  }

  await volumes.writePass(window.observedAt, {
    tracked: tally.volume.tracked,
    measured: tally.volume.measured,
    splitDiscontinuity: tally.volume.splitDiscontinuity,
    absent: tally.volume.absent,
    buckets: tally.volume.buckets,
    parameters: {
      lookbackSessions: BASELINE_LOOKBACK_SESSIONS,
      bucketMinutes: SAMPLE_SPAN_MINUTES,
    },
    targetRelativeStandardError: TARGET_RELATIVE_STANDARD_ERROR,
  });

  // **Written last, outside a transaction, and that is the recorded choice.**
  // A pass that dies has written every security it finished (this module's
  // header), so the pass row is the thing that makes a session *readable*:
  // `readNewestSession` bounds the scores on it, so a crash leaves rows nothing
  // reads rather than a session drawn under the wrong figures.
  if (scored !== undefined) {
    await sessions.writePass(window.observedAt, {
      tracked: tally.session.tracked,
      eligible: tally.session.eligible,
      scored: tally.session.scored,
      refusals: tally.session.refusals,
      // Read from the producers that own them rather than spelled, which is
      // `index.ts`' own pairing: the measurement span is
      // `five-minute-return.ts`', the stride is the sampler's and the tape is
      // the store's own `where`. What is stored is what this pass applied.
      spanMinutes: RETURN_SPAN_MINUTES,
      baseline: {
        feed: BASELINE_FEED,
        spanMinutes: SAMPLE_SPAN_MINUTES,
        lookbackSessions: BASELINE_LOOKBACK_SESSIONS,
        minimumSampleCount: BASELINE_MINIMUM_SAMPLE,
      },
    });
  }

  return tally;
}

/**
 * **Every eligible pair's correlation, the top-N selection over them, and the
 * two rows that record it** (Task 6.5.1).
 *
 * ## It reads nothing and is the only phase that is not per security
 *
 * Every input is already in process memory — `seriesOf` was accumulated as a
 * by-product of the window read each loop iteration issued, and `sectorOf` is
 * the curated universe. So this phase issues **no read of `market_bars` at
 * all**, which is the whole reason Story 6.5's Open Decision 2 could choose a
 * 5-minute grid over daily closes: the alternative is 125,250 reads of 538
 * correlated blocks, which is the cost regime ADR 0044 exists to stay out of.
 *
 * ## The enumeration is over SORTED tickers, which is what makes the key
 * ## canonical by construction
 *
 * The tickers are sorted once and walked as `i < j`, so `low` is always the
 * lexicographically lower ticker and no pair is considered twice — which is
 * `0018` §3's canonicalisation rule expressed as a loop rather than as a
 * comparison per pair. The orientation is **also** asserted in the store, on
 * the tickers, because that is the one place the rule is true: the database's
 * own `check` compares **ids**, which are assigned in row-insertion order and
 * whose order CI's store and the deployed store disagree about.
 *
 * ## Three populations and three ways out, counted apart
 *
 * A candidate pair ends in exactly one of: **refused** (the overlap is below
 * `CORRELATION_MINIMUM_OVERLAP`, or a leg has no variance), **below
 * significance** (a computed, finite coefficient that is not distinguishable
 * from zero at that pair's own `n` — the **cut**, Open Decision 3), or
 * **significant** — of which the selection keeps the union of each node's own
 * top-N and the rest are simply not retained. `0018` §5 holds the arithmetic
 * in the database, so a phase that died halfway writes a row the database
 * refuses rather than a row whose counts quietly do not add up.
 *
 * ## The pass row is written LAST, and that is what makes a generation
 * ## readable
 *
 * `return-correlation-store.ts`' header carries the argument, which is every
 * sibling pass's: a reader reads the pass row first and the correlation rows
 * for its `observed_at`, so a crash between the two leaves rows nothing reads
 * rather than a session drawn under the wrong figures.
 */
async function computeCorrelations(
  correlations: ReturnCorrelationStore,
  window: BaselineWindow,
  pass: {
    seriesOf: ReadonlyMap<Ticker, ReadonlyMap<number, number>>;
    sectorOf: ReadonlyMap<Ticker, string | null>;
    tally: CorrelationTally;
  },
): Promise<void> {
  const { seriesOf, sectorOf, tally } = pass;

  // **Sorted once**, which is what makes `i < j` the canonical order rather
  // than one comparison per pair. `localeCompare` and not `<`, so the order is
  // the one the store asserts and the selection sorts by.
  const tickers = [...seriesOf.keys()].sort((left, right) =>
    left.localeCompare(right),
  );

  const candidates: CorrelationCandidate[] = [];

  for (let i = 0; i < tickers.length; i += 1) {
    const low = tickers[i];
    if (low === undefined) continue;
    const seriesLow = seriesOf.get(low);
    if (seriesLow === undefined) continue;

    for (let j = i + 1; j < tickers.length; j += 1) {
      const high = tickers[j];
      if (high === undefined) continue;
      const seriesHigh = seriesOf.get(high);
      if (seriesHigh === undefined) continue;

      tally.candidatePairs += 1;

      const outcome = pearsonCorrelation(seriesLow, seriesHigh);

      if ("refusal" in outcome) {
        if (outcome.refusal === "too-few-overlapping-samples") {
          tally.refusals.tooFewOverlappingSamples += 1;
        } else tally.refusals.zeroVariance += 1;
        continue;
      }

      tally.computedPairs += 1;

      // **The CUT, and it is not a refusal.** Open Decision 3: no edge below a
      // derived floor, because until Story 6.6 ships the visual encoding that
      // distinguishes a weak edge from a strong one, a weak edge is a claim
      // the data does not support. The floor is a function of `n` rather than
      // a number, which is AC 4.
      if (!correlationIsSignificant(outcome.r, outcome.n)) {
        tally.belowSignificance += 1;
        continue;
      }

      candidates.push({ low, high, r: outcome.r, n: outcome.n });
    }
  }

  // **The selection, over the significant candidates alone.** A pair the
  // significance test refused is not a weaker edge competing for a slot — it
  // is not an edge, so it must not displace one.
  const retained = selectStrongestCorrelations(candidates, RETAINED_N);

  for (const pair of retained) {
    tally.samples += pair.n;
    tally.smallestOverlap = Math.min(tally.smallestOverlap, pair.n);
    tally.largestOverlap = Math.max(tally.largestOverlap, pair.n);

    const strength = Math.abs(pair.r);
    tally.strongest = Math.max(tally.strongest, strength);
    tally.weakest = Math.min(tally.weakest, strength);

    // Open Decision 4's own measurement. A sector is a curated fact, so a
    // ticker the file does not describe has no sector and cannot be counted
    // either way — stated as a branch rather than defaulted, because
    // "both unknown" is not "the same sector".
    const sectorLow = sectorOf.get(pair.low);
    const sectorHigh = sectorOf.get(pair.high);
    if (
      sectorLow !== undefined &&
      sectorLow !== null &&
      sectorLow === sectorHigh
    ) {
      tally.sameSector += 1;
    }
  }

  const parameters = {
    // Read from the producers that own them rather than spelled — the depth is
    // the correlation vocabulary's (which is the price baseline's own, by
    // re-export), the stride is the sampler's, and the tape is the store's own
    // `where`. What is stored is what this pass applied.
    lookbackSessions: CORRELATION_LOOKBACK_SESSIONS,
    spanMinutes: SAMPLE_SPAN_MINUTES,
    feed: BASELINE_FEED,
  };

  // **The writer's own answer for how many rows it wrote**, rather than a
  // second count of the same set here: `retained.length` and *rows written*
  // are the same number today and only one of them is a fact about the
  // database.
  tally.retainedPairs = await correlations.writeCorrelations(
    window.observedAt,
    parameters,
    retained,
  );

  await correlations.writePass(window.observedAt, {
    trackedEquities: tally.trackedEquities,
    eligibleEquities: tally.eligibleEquities,
    splitDiscontinuity: tally.splitDiscontinuity,
    absent: tally.absent,
    candidatePairs: tally.candidatePairs,
    computedPairs: tally.computedPairs,
    retainedPairs: tally.retainedPairs,
    refusals: tally.refusals,
    belowSignificance: tally.belowSignificance,
    retainedN: RETAINED_N,
    parameters,
  });
}

/**
 * **One security's volume baseline, on the tape its numerator will come from —
 * or the reason there is not one** (Task 5.5.3).
 *
 * ## The split verdict is READ here rather than re-derived
 *
 * `outcome` is the price generation this pass computed for the **same**
 * `(security, window end)` a line above, so the verdict travels by being in
 * hand rather than by a second read of `return_baselines` — which is `0014`
 * §5's *the generation is identified rather than copied*, and is the reason
 * Gate 1's false premise 9 could be answered at all: the price guard is a ratio
 * over two **closes** at a session boundary, and volume legitimately moves 10×
 * day to day, so there is no analogous overnight ratio to threshold. A split
 * breaks volume **harder** — the share count multiplies by exactly the factor
 * the price divides by, so an unadjusted 10:1 split is a **+900%** figure.
 *
 * ## What it cannot see, said rather than left to be noticed
 *
 * The verdict is computed over the **consolidated** tape's closes. A security
 * holding `iex` volume and no `sip` close in the window gets no verdict at all
 * (`outcome.kind === "none"`), so a split inside such a window would go
 * undetected. The window's end is derived from `sip` presence
 * (`baselineTapeFrontier`), so this is a security whose own history is
 * `iex`-only — which, until the backfill has run for it, is a state the store
 * can be in. It is a bound on the guard rather than a hole in the pass, and
 * nothing cheaper closes it.
 *
 * ## The bucket tally goes through the same narrowing the reader will
 *
 * `comparableVolumeBaseline` is the one function that turns a stored bucket
 * into a denominator, and the pass counts with it rather than re-expressing the
 * bound — so the depth figure the summary prints is the number of buckets a
 * surface could actually draw, and a pass that counted its own way would be a
 * second answer to *is this bucket printable*.
 */
async function computeVolumeBaseline(
  volumes: VolumeBaselineStore,
  subject: BaselineSubject,
  window: BaselineWindow,
  outcome: ReturnBaselineOutcome,
  tally: VolumeTally,
): Promise<void> {
  tally.tracked += 1;

  const minutes = await volumes.readWindowVolumes(subject, window.range);

  const volume = volumeBaselineOf({
    sessions: window.sessions,
    volumes: minutes,
    priceRefusal: outcome.kind === "refused" ? outcome.refusal : null,
  });

  if (volume.kind === "none") {
    // **No row, deliberately** — `0015` §5. The reader is told
    // `no-same-tape-baseline`, which is *we have never heard IEX for this
    // security*, and is NOT the same sentence as *the history is too short*.
    tally.absent += 1;
    return;
  }

  await volumes.writeBaseline(
    subject,
    window.observedAt,
    {
      lookbackSessions: BASELINE_LOOKBACK_SESSIONS,
      bucketMinutes: SAMPLE_SPAN_MINUTES,
    },
    volume,
  );

  tally.samples += volume.sampleCount;

  if (volume.kind === "refused") {
    tally.splitDiscontinuity += 1;
    return;
  }

  tally.measured += 1;

  tallyVolumeBuckets(subject, volume, tally);
}

/**
 * **One measured generation's buckets, partitioned — and a bounded sample of
 * the drawable ones** (Task 5.5.3; the sample is Task 5.7.1).
 *
 * Exported for its test rather than for a second caller: the pass around it
 * needs a pool, a store and a window, and the two properties worth holding —
 * that the sample names **only** drawable pairs, and that the cap changes the
 * list without changing `buckets.measured` — are properties of this loop alone.
 *
 * Every verdict here comes from `comparableVolumeBaseline`, the one narrowing
 * the reader also goes through, so the pass cannot drift into a second answer
 * to *is this bucket printable*.
 */
export function tallyVolumeBuckets(
  subject: BaselineSubject,
  volume: MeasuredVolumeOutcome,
  tally: VolumeTally,
): void {
  for (let bucket = 0; bucket < volume.bucketCount; bucket += 1) {
    const held = volume.buckets[bucket];

    // A bucket with no sample at all is a fact about the **grid** rather than
    // about the security — an early close has 42 buckets where a regular
    // session has 78 — so it is counted outside the partition.
    if (held === undefined || held.samples === 0) {
      tally.buckets.empty += 1;
      continue;
    }

    tally.buckets.total += 1;

    const comparable = comparableVolumeBaseline(volume, bucket);

    if (comparable.comparable) {
      tally.buckets.measured += 1;

      // **The count is exact and the list is a sample.** `measured` is
      // incremented above unconditionally; the push below stops at the cap, and
      // what it drops is recovered as a remainder when the line is rendered.
      // Taking the first `n` rather than a spread across the universe is
      // deliberate: the loop runs securities in universe order, so the sample
      // is reproducible between two passes over the same store, which a
      // reservoir would not be.
      if (tally.drawable.length < DRAWABLE_PAIRS_NAMED) {
        tally.drawable.push({ symbol: subject.symbol, bucket });
      }
    } else if (comparable.refusal === "zero-volume-baseline") {
      tally.buckets.zeroVolume += 1;
    } else tally.buckets.tooFewSessions += 1;
  }
}

/**
 * **One security's excess-move baseline, against its sector benchmark — or the
 * reason there is not one** (Task 5.6.2).
 *
 * ## The split verdict is READ on one leg and COMPUTED on the other
 *
 * `outcome` is the price generation this pass computed for the **same**
 * `(security, window end)` a few lines above, so the subject's verdict travels
 * by being in hand — `computeVolumeBaseline`'s arrangement and `0014` §5's
 * *the generation is identified rather than copied*. It is the same guard over
 * the same closes, so a second evaluation would be a second answer rather than
 * a corroboration.
 *
 * The **benchmark's** verdict cannot arrive that way: the loop is ordered by
 * symbol, so `XLK` is reached after `AAPL` and before `ZTS`, and a constituent
 * cannot read a verdict the pass has not computed yet. It is computed up front,
 * once per fund, in the prologue above.
 *
 * ## What it cannot see, said rather than left to be noticed
 *
 * A benchmark the **store** has never heard of leaves its constituents counted
 * `absent`, which is the same bound `computeVolumeBaseline` states for its own
 * verdict: it is a bound on the guard rather than a hole in the pass, and
 * nothing cheaper closes it. On CI's store — 516 securities and **zero bars** —
 * every fund resolves and every window is empty, so every security is `absent`
 * for ever and no row is written at all.
 */
async function computeExcessBaseline(
  excess: ExcessBaselineStore,
  subject: BaselineSubject,
  window: BaselineWindow,
  outcome: ReturnBaselineOutcome,
  pass: {
    closes: ReadonlyMap<number, number>;
    reference: ExcessMoveReference | undefined;
    benchmarks: ReadonlyMap<string, Benchmark>;
    tally: ExcessTally;
  },
  // **It RETURNS the generation it wrote** (Task 5.6.6), in the shape the
  // serving path's own narrowing takes, so the composite a few lines later
  // ranks against the row this iteration produced rather than re-reading it.
  // `storedFrom`'s arrangement one factor over, and the same reason: the bound
  // is `comparableExcessBaseline`'s to apply, not this function's.
  //
  // `undefined` for every kind that is **not a row** — absent, inapplicable,
  // and a store that has never heard of the fund — which is exactly what
  // `excessMoveFactor` takes for *nothing to rank against*: `too-few-samples`
  // at `0 of 2,500`, the true figure.
): Promise<StoredExcessBaseline | undefined> {
  const { closes, reference, benchmarks, tally } = pass;

  tally.tracked += 1;

  // **A security the curated file does not describe is ABSENT, not
  // inapplicable** — see the prologue's note. The two are different facts and
  // only one of them is repaired by `pnpm universe`.
  if (reference === undefined) {
    tally.absent += 1;
    return undefined;
  }

  if (!reference.applies) {
    // **No row, and it is not the absence of one either** — `0016` §4. The
    // fact lives in `securities.kind` and `securities.sector`, which a reader
    // resolves with the same `excessMoveReference` this pass used; a stored
    // copy would be a second home for it and would go stale the day a
    // curation changes a security's kind.
    tally.inapplicable += 1;
    return undefined;
  }

  const benchmark = benchmarks.get(reference.symbol);
  if (benchmark === undefined) {
    tally.absent += 1;
    return undefined;
  }

  const excessOutcome = excessBaselineOf({
    sessions: window.sessions,
    closes,
    referenceCloses: benchmark.closes,
    priceRefusal: outcome.kind === "refused" ? outcome.refusal : null,
    referenceDiscontinuous: benchmark.discontinuous,
  });

  if (excessOutcome.kind === "none") {
    tally.absent += 1;
    return undefined;
  }

  await excess.writeBaseline(
    subject,
    window.observedAt,
    { kind: EXCESS_REFERENCE_KIND, symbol: reference.symbol },
    {
      referenceKind: EXCESS_REFERENCE_KIND,
      lookbackSessions: BASELINE_LOOKBACK_SESSIONS,
      spanMinutes: SAMPLE_SPAN_MINUTES,
      feed: BASELINE_FEED,
      minimumSampleCount: BASELINE_MINIMUM_SAMPLE,
    },
    excessOutcome,
  );

  tally.samples += excessOutcome.sampleCount;

  // **The generation in the shape a reader takes it**, built once here rather
  // than twice: the write above and the return below are the same facts, and
  // the row that was just written is the row the composite ranks against.
  const facts = {
    symbol: subject.symbol,
    observedAt: window.observedAt,
    referenceKind: EXCESS_REFERENCE_KIND,
    referenceSymbol: reference.symbol,
    lookbackSessions: BASELINE_LOOKBACK_SESSIONS,
    sampleCount: excessOutcome.sampleCount,
  };

  if (excessOutcome.kind === "refused") {
    tally.refusals[EXCESS_REFUSAL_FIELD[excessOutcome.refusal]] += 1;
    return { ...facts, refusal: excessOutcome.refusal };
  }

  tally.measured += 1;
  tally.smallestSample = Math.min(
    tally.smallestSample,
    excessOutcome.sampleCount,
  );
  tally.largestSample = Math.max(
    tally.largestSample,
    excessOutcome.sampleCount,
  );

  return {
    ...facts,
    refusal: null,
    breakpoints: excessOutcome.breakpoints,
  };
}

/**
 * **The two stored refusal words, mapped to the columns that count them** — a
 * `Record` over the closed union, so a third member of
 * `EXCESS_BASELINE_REFUSALS` is a **compile error here** rather than a refusal
 * that silently stops being counted and quietly breaks the partition
 * `excess_move_baseline_passes_securities_partition` holds.
 *
 * `FIGURE_REFUSAL_FIELD`'s mechanism, two tables over.
 */
const EXCESS_REFUSAL_FIELD: Record<
  ExcessBaselineRefusal,
  keyof ExcessRefusalTally
> = {
  "split-discontinuity": "splitDiscontinuity",
  "reference-split-discontinuity": "referenceSplitDiscontinuity",
};

/**
 * **One security's closing move, ranked against the generation this pass just
 * computed — or counted as a refusal** (Task 5.4.5).
 *
 * ## The bound and the refusal words are the SHIPPED ones
 *
 * `comparableBaseline` is the one function that produces a distribution, and
 * its refused arm has no distribution member at all (Task 5.3.4's mechanism).
 * So this pass cannot rank a generation the serving path would refuse, and the
 * two words a reader sees — *too short a baseline* and *crosses an unadjusted
 * price break* — come from the same place on both bases rather than from a
 * second mapping here.
 *
 * ## Which generation, and the one consequence that differs from the live path
 *
 * The one whose window ends at the session being scored, because that is the
 * generation the pass is holding — so the window **contains** the sample being
 * ranked. `0014` §5 states the consequence rather than leaving it to be
 * noticed: `aboveSample` is `false` on every row this writes, while the live
 * path ranks a move its stored window cannot contain and reaches `>99th`.
 */
async function scoreClosingMove(
  sessions: SessionPercentileStore,
  subject: BaselineSubject,
  window: BaselineWindow,
  scored: MarketSession,
  outcome: ReturnBaselineOutcome,
  pass: { closes: ReadonlyMap<number, number>; tally: SessionTally },
): Promise<SessionPriceFactor> {
  const { closes, tally } = pass;

  tally.tracked += 1;

  const figure = sessionClosingReturn({ session: scored, closes });

  // **Asked unconditionally since Task 5.6.6**, where it used to sit behind a
  // measured figure: the composite's price clause states *how much history we
  // hold* beside its refusal, so *we have no move* and *we have no baseline*
  // are two facts a reader is owed both of. `index.ts` took the same step on
  // the live path at Task 5.6.4, for the same reason. It is pure — the
  // generation is already in hand — so moving it changes no I/O and no tally.
  const comparison = comparableBaseline(storedFrom(subject, window, outcome), {
    spanMinutes: SAMPLE_SPAN_MINUTES,
    feed: BASELINE_FEED,
  });

  if (!figure.measured) {
    tally.refusals[FIGURE_REFUSAL_FIELD[figure.refusal]] += 1;
    return { figure, comparison, percentile: undefined };
  }

  tally.eligible += 1;

  if (!comparison.ranked) {
    tally.refusals[COMPARISON_REFUSAL_FIELD[comparison.refusal]] += 1;
    return { figure, comparison, percentile: undefined };
  }

  const percentile = returnPercentileOf(
    figure.percent,
    comparison.distribution,
  );

  // **Counted in neither tally, and that is the producer's own treatment of
  // this state** (`market-unusual.ts`): a distribution that is not 101 points
  // or a non-finite magnitude is refused by `returnPercentileOf` with **no
  // word at all**, because inventing a refusal word for a state no reader can
  // act on would be a sentence nobody could write. It leaves `scored` below
  // `eligible`, which is the only direction a count may err in.
  if (percentile === undefined) {
    return { figure, comparison, percentile: undefined };
  }

  tally.scored += 1;

  await sessions.writeScore(subject, window.observedAt, {
    rank: percentile.rank,
    aboveSample: percentile.aboveSample,
    sampleCount: percentile.sampleCount,
    // **The SIGNED move.** The percentile ranks the magnitude, so the sign is
    // not recoverable from the ordinal and the drawn row's direction glyph
    // reads this figure.
    percent: figure.percent,
    // **The tape is the store's own `where`**, which is why both endpoints are
    // `sip` here and both are `iex` on the live path. Invariant 6: the screen
    // says where a figure came from rather than implying it.
    from: { ...figure.from, feed: BASELINE_FEED },
    to: { ...figure.to, feed: BASELINE_FEED },
    observed: figure.observed,
  });

  return { figure, comparison, percentile };
}

/**
 * **The price factor's three inputs, as this pass produced them** — returned
 * rather than discarded (Task 5.6.6), because the composite a few lines later
 * needs exactly these three and recomputing them would re-walk ~24,000 closes
 * and re-take an ordinal over 101 breakpoints for an answer already in hand.
 *
 * It is `PriceFactorInput`'s shape without being that type: the figure here is
 * a `SessionReturnOutcome` and the live path's is a `FiveMinuteReturn`, which
 * is why `market-composite.ts`' parameter is the contract both satisfy rather
 * than either one of them.
 */
interface SessionPriceFactor {
  readonly figure: SessionReturnOutcome;
  readonly comparison: BaselineComparison;
  readonly percentile: ReturnPercentile | undefined;
}

/**
 * **One security's composite for the scored session, from the three answers
 * this iteration already has — or no row at all** (Task 5.6.6).
 *
 * ## It computes nothing and decides nothing
 *
 * `compositeAnswers` translates each factor's own vocabulary into the scorer's
 * and `scoreAnomaly` holds every arithmetic in the score — the weights, the
 * `round(w × u / 100)`, the sum, the maximum and the band. The two together
 * **are** `compositeAnomaly`, which `index.ts` calls as one function because it
 * needs the outcome alone; this pass needs the answers too, because the answers
 * are the row's content (`0017` §5) and deriving them back out of the outcome's
 * clauses would be a second mapping between the two vocabularies.
 *
 * ## The excess numerator is the CLOSING five-minute excess, and both legs are
 * ## over the same five minutes
 *
 * This is the lesson of the defect repaired on 2026-10-26, arriving on the
 * second basis. The subject's leg is `sessionClosingReturn` over the closes
 * this iteration read; the benchmark's is `sessionClosingReturn` over the
 * fund's closes, taken once in the prologue over the **same `scored`
 * session** — so there is one session expression in this file and the two legs
 * cannot be over two intervals by construction. `excessMoveFactor` still
 * refuses `mixed-basis` on the narrower fact that a fund may print a minute the
 * constituent does not, and it still compares the numerator's own
 * `spanMinutes` against the distribution's stride, which is the guard the live
 * path shipped without.
 *
 * **A stored composite is a cache of a policy**, so storing a wrong term writes
 * it into 60 sessions of rows that look well-formed. The protection is that
 * nothing here is a term: every figure is a producer's, and the one new thing
 * this function does is choose which two legs to difference.
 *
 * ## An unscored security is NO ROW, and is counted
 *
 * `0017` §4. Every factor absent is `UnscoredAnomaly`, which has no `score`
 * member at all, and the store throws rather than writing one — so the absence
 * is the record and `unscored_count` is the figure.
 */
async function scoreComposite(
  composites: SessionCompositeStore,
  subject: BaselineSubject,
  window: BaselineWindow,
  pass: {
    price: SessionPriceFactor;
    reference: ExcessMoveReference;
    stored: StoredExcessBaseline | undefined;
    benchmarks: ReadonlyMap<string, Benchmark>;
    tally: CompositeTally;
  },
): Promise<void> {
  const { price, reference, stored, benchmarks, tally } = pass;

  tally.tracked += 1;

  // **The benchmark's own closing return, or nothing at all.** `undefined`
  // reaches `excessMoveFactor` as `no-reference-move` — never as a return of
  // `0`, which would score the subject's whole move as excess. The inapplicable
  // arm is answered inside that function and never looks at this.
  const benchmark = reference.applies
    ? benchmarks.get(reference.symbol)
    : undefined;

  const excess = excessMoveFactor({
    subject: excessLegOf(price.figure),
    reference:
      benchmark?.closingReturn === undefined
        ? undefined
        : excessLegOf(benchmark.closingReturn),
    referenceOf: reference,
    stored,
    grid: { spanMinutes: SAMPLE_SPAN_MINUTES, feed: BASELINE_FEED },
  });

  const answers = compositeAnswers({
    price: {
      figure: price.figure,
      comparison: price.comparison,
      percentile: price.percentile,
    },
    excess,
  });

  const outcome = scoreAnomaly(answers);

  if (!outcome.scored) {
    tally.unscored += 1;
    return;
  }

  tally.scored += 1;
  tally.bands[outcome.band] += 1;

  // **The factor set, keyed by its own membership** — measurement rather than
  // product, and the figure Task 5.6.7 needs before it ranks: a `{price}`
  // score caps at 40 and a `{price, excess}` one at 75, so how many securities
  // are in each set is how many are on each scale.
  const set = outcome.contributing
    .map((clause) => clause.factor)
    .sort((a, b) => a.localeCompare(b))
    .join("+");
  // Written as a branch rather than `?? 0`, which is the shape this epic has
  // forbidden in five consecutive stories: the `0` here is a **true** figure
  // about a set nothing has counted yet, and the one place `?? 0` would read as
  // correct is the one place a grep for it stops being usable.
  const seen = tally.sets.get(set);
  tally.sets.set(set, seen === undefined ? 1 : seen + 1);

  await composites.writeScore(subject, window.observedAt, {
    outcome,
    answers,
  });
}

/**
 * The outcome this pass just computed, in the shape the **serving path's**
 * narrowing takes — so the bound is applied by `comparableBaseline` rather
 * than re-expressed here.
 *
 * `undefined` for `none`, which is exactly what a security with no row in the
 * held generation hands that function: `0 of 2,500 returns`, the true figure.
 */
function storedFrom(
  subject: BaselineSubject,
  window: BaselineWindow,
  outcome: ReturnBaselineOutcome,
): StoredReturnBaseline | undefined {
  if (outcome.kind === "none") return undefined;

  const facts = {
    symbol: subject.symbol,
    observedAt: window.observedAt,
    lookbackSessions: BASELINE_LOOKBACK_SESSIONS,
    sampleCount: outcome.sampleCount,
  };

  return outcome.kind === "refused"
    ? { ...facts, refusal: outcome.refusal }
    : { ...facts, refusal: null, breakpoints: outcome.breakpoints };
}

/**
 * **The two vocabularies' members, mapped to the columns that count them** —
 * a `Record` over each closed union, so a fourth `ReturnRefusal` or a third
 * `PercentileRefusal` is a **compile error here** rather than a refusal that
 * silently stops being counted and quietly breaks the `eligible − scored`
 * arithmetic the region's sentence depends on.
 *
 * `market-unusual.ts` holds the same mechanism for the live path's tally; this
 * is the stored path's, and the pair is what makes the footer one sentence.
 */
const FIGURE_REFUSAL_FIELD: Record<ReturnRefusal, keyof StoredSessionRefusals> =
  {
    "nothing-observed": "nothingObserved",
    "no-earlier-endpoint": "noEarlierEndpoint",
    "no-basis": "noBasis",
  };

const COMPARISON_REFUSAL_FIELD: Record<
  PercentileRefusal,
  keyof StoredSessionRefusals
> = {
  "too-few-samples": "tooFewSamples",
  "split-discontinuity": "splitDiscontinuity",
};

/**
 * **The bounded sample of drawable pairs, as a line somebody can act on** (Task
 * 5.7.1).
 *
 * `NVDA bucket 31 (open+155m)` — the **index** and the minutes from the session
 * open, and nothing else. A wall-clock time would be more useful in the chair
 * and is deliberately not computed here: `Intl.DateTimeFormat` and the market's
 * timezone identifier live in `packages/shared/src/market-time.ts` by lint
 * rule, and a hand-rolled offset is the conversion that rule exists to prevent.
 * The clock reading is stated once, in Story 5.7's sitting protocol.
 *
 * The remainder is computed from `buckets.measured` rather than counted here,
 * so the exact figure has one home: a cap that elides nothing prints no
 * remainder at all.
 */
export function describeDrawableBuckets(volume: VolumeTally): string {
  if (volume.buckets.measured === 0) return "none";

  const named = volume.drawable
    .map(
      ({ symbol, bucket }) =>
        `${symbol} bucket ${String(bucket)} ` +
        `(open+${String(bucket * SAMPLE_SPAN_MINUTES)}m)`,
    )
    .join(", ");

  const elided = volume.buckets.measured - volume.drawable.length;

  return elided > 0 ? `${named}, … and ${String(elided)} more` : named;
}

/**
 * **The retained correlation set's own shape, as one line** — or `none`, which
 * is CI's permanent state and every bare store's (Task 6.5.1).
 *
 * `|r| 0.312–0.887, n 1,204–4,620 (mean 3,998), 1,612 of 2,431 same-sector
 * (66.3%)`.
 *
 * It is a line in the summary and nothing else. Every figure in it is readable
 * off the stored rows — each carries its own coefficient and its own `n` — so
 * this is a **measurement of the pass** rather than anything the pass stores,
 * which is `describeSets`' own property one quantity over. Two later readers
 * need it and cannot get it any other way: Task 6.5.3 settles `N` against what
 * a real retained set looks like, and Story 6.5's Open Decision 4 asks for the
 * same-sector share by name.
 *
 * **The percentage is printed beside the two counts rather than instead of
 * them**, which is `PRODUCT_SPEC.md` §9's own dated amendment: a percentage
 * hides its denominator, and here the denominator — how many pairs were
 * retained at all — is the figure Task 6.5.3 is actually after.
 */
export function describeRetainedCorrelations(tally: {
  retainedPairs: number;
  samples: number;
  smallestOverlap: number;
  largestOverlap: number;
  strongest: number;
  weakest: number;
  sameSector: number;
}): string {
  if (tally.retainedPairs === 0) return "none";

  const share = ((tally.sameSector / tally.retainedPairs) * 100).toFixed(1);

  return (
    `|r| ${tally.weakest.toFixed(3)}–${tally.strongest.toFixed(3)}, ` +
    `n ${String(tally.smallestOverlap)}–${String(tally.largestOverlap)} ` +
    `(mean ${String(Math.round(tally.samples / tally.retainedPairs))}), ` +
    `${String(tally.sameSector)} of ${String(tally.retainedPairs)} ` +
    `same-sector (${share}%)`
  );
}

/**
 * **The factor sets a pass produced, counted**, in descending order of how many
 * securities were in each — `price+excess 485` — or `—` where nothing scored,
 * which is CI's permanent state.
 *
 * It is a line in the summary and nothing else: the set is readable off every
 * stored row's three states, so this is a measurement of the pass rather than a
 * figure anything stores. `0017` §5's *the factor set IS the set of states*.
 */

function describeSets(sets: ReadonlyMap<string, number>): string {
  if (sets.size === 0) return "—";

  return [...sets.entries()]
    .sort(([leftSet, left], [rightSet, right]) =>
      left === right ? leftSet.localeCompare(rightSet) : right - left,
    )
    .map(([set, count]) => `${set} ${String(count)}`)
    .join(", ");
}

/**
 * Warnings to stderr, so stdout carries the summary and nothing else —
 * `prepare-indexes.ts`' arrangement, repeated here for the same reason.
 */
function consoleLogger(verbose: boolean): DatabaseLogger {
  const write = (object: object, message: string): void => {
    process.stderr.write(`  ${message} ${JSON.stringify(object)}\n`);
  };

  return { warn: write, debug: verbose ? write : (): void => undefined };
}
