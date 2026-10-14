import { BASELINE_LOOKBACK_SESSIONS } from "@marketpulse/shared";

import { ConfigError, loadConfig, loadEnvFile } from "./config.js";
import { closeDatabasePool, createDatabasePool } from "./database.js";
import type { DatabaseLogger } from "./database.js";
import { baselineWindowEndingAt, returnBaselineOf } from "./return-baseline.js";
import type { BaselineWindow } from "./return-baseline.js";
import { createReturnBaselineStore } from "./return-baseline-store.js";
import type {
  BaselineSubject,
  ReturnBaselineStore,
} from "./return-baseline-store.js";

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
}

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

  const lines: string[] = [];
  const errors: string[] = [];

  try {
    // **The window's end from the ledger, never from the clock.** See
    // `ReturnBaselineStore.coveredEnd` for why those two disagree between the
    // bell and the nightly run, and why that disagreement is the `loadedFor`
    // defect one surface over.
    const frontier = await store.coveredEnd();

    if (frontier === undefined) {
      lines.push(
        "No `1m` coverage is recorded for any tracked security, so there is no",
        "window to compute a baseline over. Run `pnpm backfill` first; this is",
        "also the state of CI's store, which holds 516 securities and zero bars.",
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

    const tally = await runPass(store, subjects, window);

    lines.push(
      `measured ${String(tally.measured)}, ` +
        `refused ${String(tally.refused)}, ` +
        `no samples ${String(tally.absent)} (no row written)`,
      `samples ${String(tally.samples)} total, ` +
        `${tally.measured === 0 ? "—" : String(Math.round(tally.samples / tally.measured))} mean n`,
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
  subjects: readonly BaselineSubject[],
  window: BaselineWindow,
): Promise<PassTally> {
  const tally: PassTally = { measured: 0, refused: 0, absent: 0, samples: 0 };

  for (const subject of subjects) {
    const closes = await store.readWindowCloses(subject, window.range);
    const outcome = returnBaselineOf({ sessions: window.sessions, closes });

    if (outcome.kind === "none") {
      // **No row, deliberately.** *The pass has not reached this security* and
      // *the pass reached it and will not answer* are different facts, and only
      // the second is safe to stop retrying.
      tally.absent += 1;
      continue;
    }

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

  return tally;
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
