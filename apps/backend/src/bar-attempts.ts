// The attempt log — what happened on a session that left no bars (Task 2.8.7).
//
// **This module exists because three of acceptance criterion 4's four causes
// are already answerable and the fourth is not.** A market holiday is
// `market-session.ts`; a session nobody asked about is outside `bar_coverage`'s
// range; a security that did not trade in a minute is a bar count below
// `minuteBars`. A *failed fetch* is none of those — it looks in the database
// exactly like a session nobody asked about, and the only thing that told them
// apart was a line of output in a terminal somebody has closed.
//
// ## The two things it records, and the second is the one that gets forgotten
//
//  1. **A failure.** One of `BarsResult`'s seven non-`ok` members, or
//     `coverage-gap`, which is `market-bars.ts` refusing a write rather than the
//     vendor refusing an answer.
//  2. **A successful EMPTY answer.** `PROVIDER.md` §8.2 makes an empty answer a
//     success, and `BarSeries` gives an empty series no `covered` window — so it
//     writes no bars *and* extends no ledger, and is recorded in neither table.
//     A later session on the far side of it absorbs it, because the ledger's
//     range is a union; a session at the **frontier** of the walk is not
//     absorbed and reads as *never asked* when it was asked and was told nothing
//     happened. Those two states are exactly what the criterion is about.
//
// ## A later success clears it, and that is not tidiness
//
// Without the deletion the log accumulates a permanent record of a transient
// failure, and every report from then on reads worse than the store is — which
// is the failure mode that makes people stop reading a report.
//
// ## What it deliberately is not
//
// **Not a row per session per symbol.** That is ~130,000 rows a year at 518
// securities and two timeframes, recording something the bars already say. This
// table is empty when everything is well.
//
// **Not authoritative about completeness.** `bar_coverage` is: a session inside
// the ledger's covered range *was* attempted, guaranteed rather than assumed,
// because the walk extends the range one contiguous step at a time and
// `market-bars.ts` refuses any write that would leave a session in the gap. This
// log says *why* a covered session holds nothing. A report that inferred
// completeness from here would be inferring it from a table whose rows are
// deleted on success.

import { Kysely, PostgresDialect, sql } from "kysely";
import type pg from "pg";

import {
  toMarketDate,
  toTicker,
  type MarketDate,
  type Ticker,
  type Timeframe,
} from "@marketpulse/shared";

import type { BarsResult } from "./market-data-provider.js";
import type { Database } from "./schema.js";

/**
 * What a recorded attempt can say.
 *
 * **Nine members: `BarsResult`'s eight plus one of our own**, and both halves
 * are decisions.
 *
 * `ok` here means *the vendor answered successfully and left no bars*. A success
 * that left bars has no row at all, so the reading is unambiguous — and giving
 * it a name of its own (`empty`) would put a second vocabulary beside a closed
 * one that already has the member, which is the thing `PROVIDER.md` §8.5 argues
 * against.
 *
 * `coverage-gap` is **not** a vendor outcome and is the member Task 2.8.6 asked
 * for by name: the backfill catches `CoverageGapError`, drops the symbol from
 * every subsequent request in the run, and prints it — and that set lives in
 * memory, so when the process exits the symbol is permanently behind the rest of
 * the universe with nothing anywhere saying so.
 *
 * The database's own check constraint carries the same nine, and
 * `bar-attempts.database.test.ts` parses the constraint Postgres rewrote and
 * compares it against this array. That is how the pair is kept in step —
 * the same arrangement `SECURITY_KINDS` and `TIMEFRAMES` already have.
 */
export const BAR_ATTEMPT_OUTCOMES = [
  "ok",
  "timeout",
  "aborted",
  "unknown-symbol",
  "range-not-available",
  "rate-limited",
  "unauthorised",
  "upstream-unavailable",
  "coverage-gap",
] as const;

/** One member of {@link BAR_ATTEMPT_OUTCOMES}. */
export type BarAttemptOutcome = (typeof BAR_ATTEMPT_OUTCOMES)[number];

/**
 * A provider result, as this log spells it.
 *
 * **An exhaustive `switch` rather than a cast, and it is the compile lock.** A
 * ninth `BarsResult` member cannot be added without being spelled here, because
 * the `default` narrows to `never` — the same mechanism `isRetryableOutcome`
 * uses, and the reason a member arrives *constructed, handled, classified and
 * recorded* rather than three of the four.
 */
export function attemptOutcomeFor(result: BarsResult): BarAttemptOutcome {
  switch (result.outcome) {
    case "ok":
      return "ok";
    case "timeout":
      return "timeout";
    case "aborted":
      return "aborted";
    case "unknown-symbol":
      return "unknown-symbol";
    case "range-not-available":
      return "range-not-available";
    case "rate-limited":
      return "rate-limited";
    case "unauthorised":
      return "unauthorised";
    case "upstream-unavailable":
      return "upstream-unavailable";
    default: {
      const unhandled: never = result;
      return unhandled;
    }
  }
}

/**
 * Whether an outcome means *come back* or means *stop*.
 *
 * The task file's own words: `upstream-unavailable` and `rate-limited` mean come
 * back; `unauthorised` means stop. **A report that treats them alike sends
 * somebody looking at a network when the key is wrong**, which is the single
 * most expensive wrong turn this report can cause.
 *
 * It is deliberately not `isRetryableOutcome`, even though the two agree on
 * every member they share. That one classifies a *cause* for a retry wrapper
 * inside one request; this classifies a *stored record* for a person deciding
 * whether to run the command again. `coverage-gap` is the member that makes them
 * different: it is not retryable at all in the wrapper's sense — retrying the
 * same request produces the same refusal — and it is entirely actionable by a
 * person, who can back-fill the missing sessions.
 */
export function attemptNeedsAttention(outcome: BarAttemptOutcome): boolean {
  switch (outcome) {
    case "unauthorised":
    case "unknown-symbol":
    case "range-not-available":
    case "coverage-gap":
      return true;
    case "ok":
    case "timeout":
    case "aborted":
    case "rate-limited":
    case "upstream-unavailable":
      return false;
    default: {
      const unhandled: never = outcome;
      return unhandled;
    }
  }
}

/** One stored attempt, as a domain object. */
export interface BarAttempt {
  readonly symbol: Ticker;
  readonly timeframe: Timeframe;
  readonly sessionDate: MarketDate;
  readonly outcome: BarAttemptOutcome;
  /** A short human note, or absent. Never parsed. */
  readonly detail?: string;
  /** When we first recorded an attempt at this session. */
  readonly recordedAt: Date;
  /** When the outcome last changed — not when it was last confirmed. */
  readonly updatedAt: Date;
}

/** What the backfill asks to be written. */
export interface BarAttemptRecord {
  readonly symbol: Ticker;
  readonly timeframe: Timeframe;
  readonly sessionDate: MarketDate;
  readonly outcome: BarAttemptOutcome;
  readonly detail?: string;
}

/**
 * The attempt log, as the backfill and the report see it.
 *
 * **Its own repository rather than four more methods on
 * `MarketBarsRepository`.** Three tables, three jobs: that one owns the data and
 * the statement about the data, and this owns a note about one session. A
 * reader that wants the note does not want the write path, and the report does
 * not construct the bars repository at all.
 */
export interface BarAttemptsRepository {
  /**
   * Record what happened, upserting on `(security, timeframe, session)`.
   *
   * **Batched into one statement**, because the backfill calls this once per
   * request with up to 518 symbols in it, and a query per symbol would put 518
   * round trips inside a loop that already spends fifty seconds on the vendor.
   *
   * The update is guarded with `is distinct from`, so a re-run that fails the
   * same way twice leaves this table byte-identical and criterion 2's checksum
   * still covers it.
   *
   * A symbol this database does not have is **skipped rather than refused**, and
   * that is the one place this module deliberately differs from
   * `market-bars.ts`, which throws `UnknownSecurityError`. There, a dropped
   * symbol produces a store quietly one security short — a claim this product
   * makes on screen. Here it would abort a whole run's *logging* because of a
   * note, which is the log making the failure worse rather than recording it.
   */
  recordAttempts(entries: readonly BarAttemptRecord[]): Promise<number>;

  /**
   * Forget every recorded attempt at these sessions for these symbols.
   *
   * Called with the sessions a request actually stored bars for. One statement
   * for the whole batch, for `recordAttempts`' reason.
   */
  clearAttempts(
    symbols: readonly Ticker[],
    timeframe: Timeframe,
    sessionDates: readonly MarketDate[],
  ): Promise<number>;

  /**
   * Every recorded attempt, ordered by symbol, then timeframe, then session.
   *
   * A sequential scan of a table that is empty when everything is well, which is
   * why there is no window parameter and no index for one.
   */
  listAttempts(): Promise<readonly BarAttempt[]>;
}

interface AttemptRow {
  readonly symbol: string;
  readonly timeframe: Timeframe;
  readonly session_date: string;
  readonly outcome: BarAttemptOutcome;
  readonly detail: string | null;
  readonly recorded_at: Date;
  readonly updated_at: Date;
}

function toAttempt(row: AttemptRow): BarAttempt {
  return {
    // Re-validated through the constructors rather than cast, for
    // `toCoverage`'s reason: a brand asserts a check happened, and a value that
    // arrived from a database has been checked by nothing in this process.
    symbol: toTicker(row.symbol),
    timeframe: row.timeframe,
    sessionDate: toMarketDate(row.session_date),
    outcome: row.outcome,
    // Spread rather than assigned, because `exactOptionalPropertyTypes` makes
    // an explicit `undefined` a different thing from an absent key.
    ...(row.detail === null ? {} : { detail: row.detail }),
    recordedAt: row.recorded_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Build the repository over an existing pool.
 *
 * Takes a pool rather than opening one and has no `destroy()`, for
 * `createMarketBarsRepository`'s stated reasons: `index.ts` and the commands own
 * the pool's lifecycle, and Kysely's `destroy()` would end it.
 *
 * The handle is constructed here and **not exported**, which is the temporal
 * seam Epic 13 attaches to — even though nothing in this table has an
 * `observed_at` to be filtered, because the seam is an arrangement rather than a
 * per-table judgement.
 */
export function createBarAttemptsRepository(
  pool: pg.Pool,
): BarAttemptsRepository {
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  return {
    async recordAttempts(entries) {
      if (entries.length === 0) return 0;

      const symbols = [...new Set(entries.map((entry) => entry.symbol))];
      const securities = await db
        .selectFrom("securities")
        .select(["id", "symbol"])
        .where("symbol", "in", symbols)
        .execute();

      const idBySymbol = new Map(
        securities.map((row) => [row.symbol, row.id] as const),
      );

      const values = entries.flatMap((entry) => {
        const securityId = idBySymbol.get(entry.symbol);
        // See the interface: a symbol this database does not have is skipped,
        // because refusing here would make a note abort a run's logging.
        if (securityId === undefined) return [];
        return [
          {
            security_id: securityId,
            timeframe: entry.timeframe,
            session_date: entry.sessionDate,
            outcome: entry.outcome,
            detail: entry.detail ?? null,
          },
        ];
      });

      if (values.length === 0) return 0;

      const written = await db
        .insertInto("bar_attempts")
        .values(values)
        .onConflict((conflict) =>
          conflict
            .columns(["security_id", "timeframe", "session_date"])
            .doUpdateSet((builder) => ({
              outcome: builder.ref("excluded.outcome"),
              detail: builder.ref("excluded.detail"),
              updated_at: sql<Date>`now()`,
            }))
            // `load-universe.ts`'s idiom, row-wise and `is distinct from`
            // rather than `<>` for its reason: `null <> null` is `null`, so a
            // `<>` comparison would treat every row with a null `detail` as
            // unchanged forever. The update happens only when the stored record
            // actually differs, so `updated_at` means *when this changed*
            // rather than *when the backfill last ran*.
            .where(
              sql<boolean>`(
                bar_attempts.outcome, bar_attempts.detail
              ) is distinct from (
                excluded.outcome, excluded.detail
              )`,
            ),
        )
        .returning("id")
        .execute();

      return written.length;
    },

    async clearAttempts(symbols, timeframe, sessionDates) {
      if (symbols.length === 0 || sessionDates.length === 0) return 0;

      const deleted = await db
        .deleteFrom("bar_attempts")
        .where("timeframe", "=", timeframe)
        .where("session_date", "in", [...sessionDates])
        .where((eb) =>
          eb(
            "security_id",
            "in",
            eb
              .selectFrom("securities")
              .select("id")
              .where("symbol", "in", symbols),
          ),
        )
        .executeTakeFirst();

      return Number(deleted.numDeletedRows);
    },

    async listAttempts() {
      const rows = await db
        .selectFrom("bar_attempts")
        .innerJoin("securities", "securities.id", "bar_attempts.security_id")
        .select([
          "securities.symbol",
          "bar_attempts.timeframe",
          "bar_attempts.session_date",
          "bar_attempts.outcome",
          "bar_attempts.detail",
          "bar_attempts.recorded_at",
          "bar_attempts.updated_at",
        ])
        .orderBy("securities.symbol")
        .orderBy("bar_attempts.timeframe")
        .orderBy("bar_attempts.session_date")
        .execute();

      return rows.map(toAttempt);
    },
  };
}
