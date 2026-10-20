import {
  BASELINE_LOOKBACK_SESSIONS,
  BASELINE_MINIMUM_SAMPLE,
} from "@marketpulse/shared";

import type { MarketSession, PercentileRefusal } from "@marketpulse/shared";
import { RETURN_SPAN_MINUTES } from "./five-minute-return.js";
import type { ReturnRefusal } from "./five-minute-return.js";

import { ConfigError, loadConfig, loadEnvFile } from "./config.js";
import { closeDatabasePool, createDatabasePool } from "./database.js";
import type { DatabaseLogger } from "./database.js";
import {
  SAMPLE_SPAN_MINUTES,
  baselineWindowEndingAt,
  returnBaselineOf,
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
import type {
  SessionPercentileStore,
  StoredSessionRefusals,
} from "./session-percentile-store.js";
import { sessionClosingReturn } from "./session-percentile.js";
import { comparableBaseline, returnPercentileOf } from "./return-percentile.js";
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
import { equityTickers } from "./universe.js";

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

    const tally = await runPass(store, sessions, volumes, subjects, window);

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
  };

  // **The equities, by the same positive-membership selection breadth and the
  // movers use** — `equityTickers()`, and nothing here spells 501. A session
  // ranking that scored `SPY` and the eleven sector SPDRs beside their own
  // constituents would make `Unusual activity` and `Market proxies` /
  // `Sector performance` non-independent, which is AC 13 and is the same
  // argument `index.ts` makes for the live path.
  const isEquity = new Set<string>(equityTickers());

  // The last session of the window **is** the session being scored, and
  // `window.observedAt` is its close — `baselineWindowEndingAt` derives both
  // from one place, so there is nothing here to put out of step.
  const scored = window.sessions[window.sessions.length - 1];

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
    if (scored !== undefined && isEquity.has(subject.symbol)) {
      await scoreClosingMove(sessions, subject, window, scored, outcome, {
        closes,
        tally: tally.session,
      });
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
  }

  // **Written last and outside a transaction**, which is the session pass
  // row's own arrangement below. The difference worth knowing is that these
  // populations **partition** rather than nest, so a pass that died mid-loop
  // would write a row whose counts do not sum — and
  // `volume_baseline_passes_securities_partition` refuses it. That is the
  // intended behaviour rather than a hazard: no pass row at all is the
  // readable state, exactly as it is one table over.
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
): Promise<void> {
  const { closes, tally } = pass;

  tally.tracked += 1;

  const figure = sessionClosingReturn({ session: scored, closes });

  if (!figure.measured) {
    tally.refusals[FIGURE_REFUSAL_FIELD[figure.refusal]] += 1;
    return;
  }

  tally.eligible += 1;

  const comparison = comparableBaseline(storedFrom(subject, window, outcome), {
    spanMinutes: SAMPLE_SPAN_MINUTES,
    feed: BASELINE_FEED,
  });

  if (!comparison.ranked) {
    tally.refusals[COMPARISON_REFUSAL_FIELD[comparison.refusal]] += 1;
    return;
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
  if (percentile === undefined) return;

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
 * Warnings to stderr, so stdout carries the summary and nothing else —
 * `prepare-indexes.ts`' arrangement, repeated here for the same reason.
 */
function consoleLogger(verbose: boolean): DatabaseLogger {
  const write = (object: object, message: string): void => {
    process.stderr.write(`  ${message} ${JSON.stringify(object)}\n`);
  };

  return { warn: write, debug: verbose ? write : (): void => undefined };
}
