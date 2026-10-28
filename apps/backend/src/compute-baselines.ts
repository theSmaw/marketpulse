import {
  BASELINE_LOOKBACK_SESSIONS,
  BASELINE_MINIMUM_SAMPLE,
  excessMoveReference,
  scoreAnomaly,
} from "@marketpulse/shared";

import type {
  AnomalyBand,
  ExcessBaselineRefusal,
  ExcessMoveReference,
  MarketSession,
  PercentileRefusal,
} from "@marketpulse/shared";
import { RETURN_SPAN_MINUTES } from "./five-minute-return.js";
import type { ReturnRefusal } from "./five-minute-return.js";

import { ConfigError, loadConfig, loadEnvFile } from "./config.js";
import { closeDatabasePool, createDatabasePool } from "./database.js";
import type { DatabaseLogger } from "./database.js";
import {
  SAMPLE_SPAN_MINUTES,
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
}

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
interface VolumeTally {
  tracked: number;
  measured: number;
  splitDiscontinuity: number;
  /** No bar of this tape anywhere in the window — **no row written**. */
  absent: number;
  samples: number;
  buckets: VolumeBucketTally;
}

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

const noVolumeTally = (): VolumeTally => ({
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

    if (comparable.comparable) tally.buckets.measured += 1;
    else if (comparable.refusal === "zero-volume-baseline") {
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
