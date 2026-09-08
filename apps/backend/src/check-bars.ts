// `pnpm bars:check` — what the store holds, what it does not, and why (Task 2.8.7).
//
// The instrument acceptance criterion 4 needs, and it follows `pnpm
// universe:check`'s shape in **four** respects, every one of them a decision
// rather than an imitation:
//
//  1. **It reads and changes nothing.** No write path is constructed here — the
//     bars repository is used for its two read methods and the attempt log for
//     one — so it can be pointed at any environment at any time, including the
//     deployed database mid-backfill.
//  2. **A finding does NOT change the exit code.** The exit code answers *did
//     the check run*, never *did it find something*, for the reason
//     `/diagnostics/database` answers `200` with `reachable: false`: the
//     question was answered correctly. A non-zero exit would invite somebody to
//     wire this into CI, where it would go red on a thin security having a quiet
//     Tuesday.
//  3. **It is not and never can be a `pnpm verify` step**, because `verify` runs
//     with no network, no credential and no database. Unlike `universe:check`
//     this one needs no *network* — but it needs a database, which `verify`
//     equally does not have, and criterion 9 says so.
//  4. **Its comparison is pure and takes both sides as parameters.** That is
//     `bar-completeness.ts`, and it is what lets the fast suite make findings
//     happen that a healthy store has no instance of.
//
// ## What it reports, and the two columns that must not be merged
//
// Per symbol and timeframe: sessions the calendar puts in the window, how many
// the ledger covers, which it does not, and — separately — bars held against
// bars a complete store would hold.
//
// The first pair is **completeness**, a question about the ledger, and it is the
// only one a catch-up run should act on. The second is **density**, a question
// about liquidity: measured 2026-09-08, the universe-wide mean is 364.3 bars per
// security-session against a nominal 390, so a report that leads with a
// completeness percentage against 390 leads with a number that is never 100.
//
// ## The default window is the LEDGER'S OWN SPAN, and that is the useful part
//
// With no `--from`/`--to` the window is the union of every covered range in the
// ledger: earliest start to latest end. So *not fetched* means **behind the rest
// of the universe**, which is exactly the state Task 2.8.6 left with no
// instrument. The backfill catches `CoverageGapError` per symbol, drops that
// symbol from every subsequent request in the run, and prints it — and that set
// lives in memory, so when the process exits the symbol is permanently behind
// with a shorter covered range and nothing anywhere saying why. This report is
// what names it, and the attempt log is what says why.

import {
  marketDateAt,
  marketSessionsBetween,
  TIMEFRAMES,
  toMarketDate,
  toTicker,
  type MarketDate,
  type MarketSession,
  type Ticker,
  type Timeframe,
} from "@marketpulse/shared";

import {
  createBarAttemptsRepository,
  type BarAttempt,
} from "./bar-attempts.js";
import {
  compareStoreToCalendar,
  needsAttention,
  STALE_SESSION_THRESHOLD,
  type CompletenessFinding,
  type CompletenessReport,
  type SeriesStore,
} from "./bar-completeness.js";
import { ConfigError, loadConfig, loadEnvFile } from "./config.js";
import {
  closeDatabasePool,
  createDatabasePool,
  type DatabaseLogger,
} from "./database.js";
import { createMarketBarsRepository } from "./market-bars.js";

/** What one run produced. {@link BackfillOutcome}'s shape, for its reason. */
export interface BarsCheckOutcome {
  readonly exitCode: 0 | 1;
  readonly lines: readonly string[];
  readonly errors: readonly string[];
}

/** How many series the table prints before it stops naming them. */
const MAX_TABLE_ROWS = 40;

/**
 * Render a comparison.
 *
 * Separated from the reading for `summariseUniverseCheck`'s reason: this is
 * where every sentence a person reads is decided, and a test that has to open a
 * database to assert on a sentence is a test nobody writes.
 */
/** What the report knows about its own blind spots. */
export interface BarsCheckCaveats {
  /**
   * How many of the reported series the daily ledger cannot answer for.
   *
   * **Printed rather than swallowed**, because a reader who sees no
   * "stopped printing" findings will otherwise conclude that nothing has
   * stopped printing — and a check that cannot see something must say so, which
   * is Task 1.13.6's blind-renderer lesson in a new place.
   */
  readonly seriesWithoutDailyLedger: number;
}

export function summariseBarsCheck(
  timeframe: Timeframe,
  window: { readonly from: MarketDate; readonly to: MarketDate },
  caveats: BarsCheckCaveats,
  report: CompletenessReport,
): BarsCheckOutcome {
  const lines: string[] = [
    "",
    `  ${timeframe} bars, ${window.from} → ${window.to}, ` +
      `${String(report.series.length)} ${report.series.length === 1 ? "series" : "series"}`,
    "",
  ];

  const complete = report.series.filter(
    (entry) => entry.notFetched.length === 0,
  ).length;
  const heldBars = report.series.reduce(
    (total, entry) => total + entry.barsHeld,
    0,
  );
  const expectedBarsTotal = report.series.reduce(
    (total, entry) => total + entry.barsExpected,
    0,
  );

  lines.push(
    `  sessions   ${String(complete)}/${String(report.series.length)} series hold every session in the window`,
    // The two figures are printed on two lines with two names on purpose. See
    // the module header: merging them into one percentage is how a permanently
    // ~93%-thin universe comes to be reported as permanently incomplete.
    `  density    ${String(heldBars)} bars held of ${String(expectedBarsTotal)} the sessions could hold` +
      (expectedBarsTotal === 0
        ? ""
        : `  (${percentage(heldBars, expectedBarsTotal)})`),
    "",
    "  Density is a LIQUIDITY measure and not a completeness one. Measured against the",
    "  live feed, the universe-wide mean is 364.3 bars per security-session against a",
    "  nominal 390 — most securities do not trade in every minute, and that is a fact",
    "  about the market rather than about our ingestion.",
  );

  if (caveats.seriesWithoutDailyLedger > 0) {
    lines.push(
      "",
      `  ! The "has it stopped printing" check is BLIND for ${String(caveats.seriesWithoutDailyLedger)} of these series,`,
      "    because the daily ledger holds nothing for them. That signal reads daily bars —",
      "    the same question over minute bars is a full table scan — so with no daily",
      "    backfill it cannot tell `never asked` from `stopped trading` and does not guess.",
      "    `pnpm backfill --timeframe 1d` is what makes it able to answer.",
    );
  }

  if (report.findings.length === 0) {
    lines.push(
      "",
      "  Nothing to look at. Every series holds every trading session in the window, no",
      "  session was attempted and left empty, and nothing has stopped printing.",
      "",
    );
    return { exitCode: 0, lines, errors: [] };
  }

  lines.push(...renderFindings(report.findings));

  const attention = report.findings.filter(needsAttention).length;
  lines.push(
    "",
    attention === 0
      ? "  Nothing here needs a person: re-running `pnpm backfill` is the whole response."
      : `  ${String(attention)} of these need a person rather than another backfill run.`,
    "",
    "  Nothing was written. This command reads the store and reports on it.",
    "",
  );

  return { exitCode: 0, lines, errors: [] };
}

/** Each kind of finding, grouped and rendered in its own words. */
function renderFindings(
  findings: readonly CompletenessFinding[],
): readonly string[] {
  const lines: string[] = [];

  const never = findings.filter((finding) => finding.kind === "never-fetched");
  if (never.length > 0) {
    lines.push(
      "",
      `  ○ ${String(never.length)} series with nothing fetched at all:`,
      `      ${listSymbols(never.map((finding) => finding.symbol))}`,
      "",
      "    The ledger has no row for these. Either they were added to the universe after",
      "    the last backfill, or every run so far has stopped before reaching them.",
      "    `pnpm backfill` is the response.",
    );
  }

  const behind = findings.filter((finding) => finding.kind === "not-fetched");
  if (behind.length > 0) {
    lines.push(
      "",
      `  ○ ${String(behind.length)} series behind the rest of the window:`,
      ...behind
        .slice(0, MAX_TABLE_ROWS)
        .map(
          (finding) =>
            `      ${finding.symbol.padEnd(8)}${String(finding.sessions.length)} sessions, ` +
            describeSessions(finding.sessions),
        ),
      ...(behind.length > MAX_TABLE_ROWS
        ? [`      … and ${String(behind.length - MAX_TABLE_ROWS)} more`]
        : []),
      "",
      "    These sessions lie OUTSIDE the ledger's covered range, so they were never",
      "    fetched — this is the one finding that means something is wrong with us",
      "    rather than with the market. A symbol that is behind and stays behind after a",
      "    re-run is one the backfill gave up on; look for it below.",
    );
  }

  const attempted = findings.filter(
    (finding) => finding.kind === "attempted-and-empty",
  );
  if (attempted.length > 0) {
    lines.push(
      "",
      `  ○ ${String(attempted.length)} sessions attempted that left no bars:`,
      ...attempted
        .slice(0, MAX_TABLE_ROWS)
        .map(
          (finding) =>
            `      ${finding.symbol.padEnd(8)}${finding.attempt.sessionDate}  ` +
            finding.attempt.outcome +
            (finding.attempt.detail === undefined
              ? ""
              : `  — ${finding.attempt.detail}`),
        ),
      ...(attempted.length > MAX_TABLE_ROWS
        ? [`      … and ${String(attempted.length - MAX_TABLE_ROWS)} more`]
        : []),
      "",
      "    `ok` means the vendor answered and had nothing to send, which is a genuine",
      "    untraded session rather than a failure. Everything else is a failed fetch, and",
      "    the two look identical in the bars — telling them apart is what this log is",
      "    for. `rate-limited` and `upstream-unavailable` mean come back; `unauthorised`",
      "    means stop and fix the credential; `coverage-gap` means the backfill refused to",
      "    join this window to what it already held, and that symbol stopped extending.",
    );
  }

  const overFull = findings.filter((finding) => finding.kind === "over-full");
  if (overFull.length > 0) {
    lines.push(
      "",
      `  ! ${String(overFull.length)} series holding MORE bars than their sessions have minutes:`,
      ...overFull.map(
        (finding) =>
          `      ${finding.symbol.padEnd(8)}${String(finding.held)} held, ${String(finding.expected)} possible`,
      ),
      "",
      "    This is an invariant violation rather than a large number. It means the",
      "    timestamp mapping or the request's window shape is wrong — a span-shaped",
      "    request collects pre- and post-market prints at a measured 2.35x, which is",
      "    exactly this. The bars in that range cannot be trusted.",
    );
  }

  const stale = findings.filter((finding) => finding.kind === "no-recent-bars");
  if (stale.length > 0) {
    lines.push(
      "",
      `  ○ ${String(stale.length)} securities that have stopped printing:`,
      ...stale
        .slice(0, MAX_TABLE_ROWS)
        .map(
          (finding) =>
            `      ${finding.symbol.padEnd(8)}` +
            (finding.lastBarDate === undefined
              ? "no bars at all"
              : `last bar ${finding.lastBarDate}`) +
            `, ${String(finding.sessionsSince)} covered sessions since`,
        ),
      ...(stale.length > MAX_TABLE_ROWS
        ? [`      … and ${String(stale.length - MAX_TABLE_ROWS)} more`]
        : []),
      "",
      `    Zero bars across ${String(STALE_SESSION_THRESHOLD)} or more consecutive sessions the backfill asked for is not`,
      "    thinness — the thinnest security measured on an ordinary session still returned",
      "    344 of 390 minutes. This is what a delisting looks like from here, and bars",
      "    stopping correlates with reality better than the vendor's own `inactive` flag",
      "    (100% against 92%, measured at Task 2.7.8).",
      "",
      "    NOTHING IS WRITTEN FOR THIS, deliberately. A `status` written by anything other",
      "    than `pnpm universe` is silently reverted by the next deploy's load, reported",
      "    as an ordinary `1 updated` — `UNIVERSE.md` §15.3 produced that. Edit",
      "    `apps/backend/src/universe.ts` if you agree with the finding.",
    );
  }

  return lines;
}

function listSymbols(symbols: readonly Ticker[]): string {
  const shown = symbols.slice(0, MAX_TABLE_ROWS).join(", ");
  return symbols.length > MAX_TABLE_ROWS
    ? `${shown}, … and ${String(symbols.length - MAX_TABLE_ROWS)} more`
    : shown;
}

/** `2026-09-01 … 2026-09-05` for a run, the date itself for a single session. */
function describeSessions(sessions: readonly MarketDate[]): string {
  const first = sessions[0];
  const last = sessions.at(-1);
  if (first === undefined || last === undefined) return "none";
  return first === last ? first : `${first} … ${last}`;
}

function percentage(part: number, whole: number): string {
  return `${((part / whole) * 100).toFixed(1)}%`;
}

/** How {@link checkBarsCommand} reaches the world. Injected for testability. */
export interface BarsCheckOptions {
  readonly env?: NodeJS.ProcessEnv;
}

/**
 * Read the store and compare it against the calendar.
 *
 * `argv` is a parameter rather than read from `process.argv`, for
 * `backfillCommand`'s reason: it is what makes this testable at all.
 */
export async function checkBarsCommand(
  argv: readonly string[],
  options: BarsCheckOptions = {},
): Promise<BarsCheckOutcome> {
  const parsed = parseArguments(argv);
  if ("help" in parsed) return { exitCode: 0, lines: [USAGE], errors: [] };
  if ("problem" in parsed) {
    return { exitCode: 1, lines: [], errors: [parsed.problem, "", USAGE] };
  }

  const environment = options.env ?? (loadEnvFile(), process.env);

  let config;
  try {
    config = loadConfig(environment);
  } catch (error) {
    return {
      exitCode: 1,
      lines: [],
      errors: [error instanceof ConfigError ? error.message : String(error)],
    };
  }

  const log: DatabaseLogger = {
    warn: (object, message) => {
      process.stderr.write(`  ${message} ${JSON.stringify(object)}\n`);
    },
    debug: (): void => undefined,
  };

  const pool = createDatabasePool(
    config.database,
    log,
    "marketpulse-bars-check",
  );
  const bars = createMarketBarsRepository(pool);
  const attempts = createBarAttemptsRepository(pool);

  try {
    // Three reads and nothing else, all of them a few hundred to a few thousand
    // rows. `listCoverage` is one row per series, `listAttempts` is a sparse
    // table that is empty when everything is well, and `readLastBarDates` is a
    // grouped `max` over the DAILY bars — see its own doc comment for why the
    // daily timeframe answers the question for both.
    const [coverage, recorded, lastDailyBars] = await Promise.all([
      bars.listCoverage(),
      attempts.listAttempts(),
      // Always the DAILY timeframe, whatever is being reported on. See
      // `readLastBarDates`: the same question over minute bars is a full table
      // scan, measured at 192 ms over 863k rows and ~11 s extrapolated to a
      // year of the universe.
      bars.readLastBarDates("1d"),
    ]);

    // Which series the daily ledger can answer for at all. A store that has
    // back-filled minute bars and not daily ones has no daily row for anything,
    // and "no daily bar" then means *we never asked* rather than *it has
    // stopped printing* — which is a false positive this reported on the day it
    // was written, on two perfectly healthy securities.
    const dailyLedger = new Set<Ticker>(
      coverage
        .filter((entry) => entry.timeframe === "1d")
        .map((entry) => entry.symbol),
    );

    const forTimeframe = coverage.filter(
      (entry) => entry.timeframe === parsed.timeframe,
    );
    const wanted =
      parsed.symbols === undefined
        ? undefined
        : new Set<string>(parsed.symbols);
    const selected =
      wanted === undefined
        ? forTimeframe
        : forTimeframe.filter((entry) => wanted.has(entry.symbol));

    if (selected.length === 0) {
      return {
        exitCode: 0,
        lines: [
          "",
          `  The ledger holds nothing at ${parsed.timeframe}` +
            (wanted === undefined ? "" : " for the symbols asked for") +
            ", so there is nothing to compare.",
          "",
          "  `pnpm backfill` is what fills it. If a backfill has run, check that it ran at",
          "  this timeframe — minute and daily history are walked independently.",
          "",
        ],
        errors: [],
      };
    }

    const window = resolveWindow(parsed, selected);
    if ("problem" in window) {
      return { exitCode: 1, lines: [], errors: [window.problem] };
    }

    // The sessions handed to the comparison are a SUPERSET of the window, wide
    // enough to cover every ledger range as well: *not fetched* is a question
    // about the window and *thin* is a question about whatever the ledger
    // covers, and those are not the same span.
    let sessions: readonly MarketSession[];
    try {
      sessions = marketSessionsBetween(window.scopeFrom, window.scopeTo);
    } catch (error) {
      // `MarketCalendarRangeError` names the range and the file to edit.
      return {
        exitCode: 1,
        lines: [],
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }

    const attemptsBySeries = new Map<Ticker, BarAttempt[]>();
    for (const attempt of recorded) {
      if (attempt.timeframe !== parsed.timeframe) continue;
      const key = attempt.symbol;
      const list = attemptsBySeries.get(key) ?? [];
      list.push(attempt);
      attemptsBySeries.set(key, list);
    }

    const series: SeriesStore[] = selected.map((entry) => ({
      symbol: entry.symbol,
      timeframe: entry.timeframe,
      coverage: entry,
      attempts: attemptsBySeries.get(entry.symbol) ?? [],
      // Absent when the daily ledger cannot answer, `null` when it can and the
      // answer is "no bars at all". Three values, not two.
      ...(dailyLedger.has(entry.symbol)
        ? { lastBarAt: lastDailyBars.get(entry.symbol) ?? null }
        : {}),
    }));

    return summariseBarsCheck(
      parsed.timeframe,
      { from: window.from, to: window.to },
      {
        seriesWithoutDailyLedger: series.filter(
          (entry) => entry.lastBarAt === undefined,
        ).length,
      },
      compareStoreToCalendar({
        sessions,
        window: { from: window.from, to: window.to },
        series,
      }),
    );
  } catch (error) {
    return {
      exitCode: 1,
      lines: [],
      errors: [
        "",
        "  The store could not be read, so nothing was compared.",
        "",
        `  ${error instanceof Error ? error.message : String(error)}`,
        "",
        "  If the database is not running, `pnpm db` starts it. If the tables do not",
        "  exist, `pnpm migrate` creates them.",
        "",
      ],
    };
  } finally {
    await closeDatabasePool(pool);
  }
}

interface ParsedArguments {
  readonly timeframe: Timeframe;
  readonly symbols?: readonly Ticker[];
  readonly from?: string;
  readonly to?: string;
}

/**
 * The window to report on, and the wider scope to compute density over.
 *
 * **With no `--from`/`--to` the window is the LEDGER'S OWN SPAN** — the union of
 * every covered range at this timeframe. That default is what makes *not
 * fetched* mean *behind the rest of the universe*, which is the state this
 * report exists to surface and the one nothing else can see.
 */
function resolveWindow(
  parsed: ParsedArguments,
  coverage: readonly { readonly covered: { start: Date; end: Date } }[],
):
  | {
      readonly from: MarketDate;
      readonly to: MarketDate;
      readonly scopeFrom: MarketDate;
      readonly scopeTo: MarketDate;
    }
  | { readonly problem: string } {
  let earliest = coverage[0]?.covered.start;
  let latest = coverage[0]?.covered.end;
  /* c8 ignore next 3 -- the caller refuses an empty selection. */
  if (earliest === undefined || latest === undefined) {
    return { problem: "The ledger holds nothing to report on." };
  }
  for (const entry of coverage) {
    if (entry.covered.start < earliest) earliest = entry.covered.start;
    if (entry.covered.end > latest) latest = entry.covered.end;
  }

  // The stored end is exclusive, so the last covered session's close is the
  // range's end and its market date is one millisecond earlier. Taking the date
  // of `end` itself would name the next calendar day.
  const scopeFrom = marketDateAt(earliest);
  const scopeTo = marketDateAt(new Date(latest.getTime() - 1));

  if (parsed.from === undefined || parsed.to === undefined) {
    return { from: scopeFrom, to: scopeTo, scopeFrom, scopeTo };
  }

  try {
    const from = toMarketDate(parsed.from);
    const to = toMarketDate(parsed.to);
    if (from > to) {
      return { problem: `--from ${parsed.from} is after --to ${parsed.to}.` };
    }
    return {
      from,
      to,
      // The scope is the union of the two, because the window can reach outside
      // what the ledger covers and the ledger can reach outside the window.
      scopeFrom: from < scopeFrom ? from : scopeFrom,
      scopeTo: to > scopeTo ? to : scopeTo,
    };
  } catch (error) {
    return { problem: error instanceof Error ? error.message : String(error) };
  }
}

const USAGE = [
  "Usage: pnpm bars:check [--timeframe 1m|1d] [--symbols A,B]",
  "                       [--from YYYY-MM-DD --to YYYY-MM-DD]",
  "",
  "  Reports what the store holds and what it does not, and CHANGES NOTHING.",
  "",
  "  With no range the window is the ledger's own span — earliest covered start to",
  "  latest covered end — so a symbol reported as behind is behind the rest of the",
  "  universe rather than behind an arbitrary date.",
  "",
  "  A finding never changes the exit code. The exit code answers whether the check",
  "  ran, so this is safe to script and deliberately useless as a CI gate.",
  "",
  "  pnpm bars:check",
  "  pnpm bars:check --timeframe 1d",
  "  pnpm bars:check --symbols NVDA,AMD --from 2026-09-01 --to 2026-09-05",
].join("\n");

function parseArguments(
  argv: readonly string[],
): ParsedArguments | { problem: string } | { help: true } {
  let timeframe: Timeframe = "1m";
  let symbols: readonly Ticker[] | undefined;
  let from: string | undefined;
  let to: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];

    if (argument === undefined) continue;
    if (argument === "--help" || argument === "-h") return { help: true };
    if (!argument.startsWith("--")) {
      return {
        problem: `${JSON.stringify(argument)} is not an option. Every argument to this command is named.`,
      };
    }
    if (value === undefined || value.startsWith("--")) {
      return { problem: `${argument} needs a value.` };
    }
    index += 1;

    switch (argument) {
      case "--timeframe": {
        if (!(TIMEFRAMES as readonly string[]).includes(value)) {
          return {
            problem: `${JSON.stringify(value)} is not a timeframe. Expected ${TIMEFRAMES.join(" or ")}.`,
          };
        }
        // `includes` on a `readonly T[]` narrows nothing, so the guard above
        // has not narrowed `value`. `isTimeframe` in `backfill.ts` takes the
        // same shape for the same reason.
        timeframe = value as Timeframe;
        break;
      }
      case "--symbols": {
        const parsedSymbols: Ticker[] = [];
        for (const raw of value.split(",")) {
          const trimmed = raw.trim();
          if (trimmed === "") continue;
          try {
            parsedSymbols.push(toTicker(trimmed));
          } catch {
            return {
              problem: `${JSON.stringify(trimmed)} is not a well-formed ticker.`,
            };
          }
        }
        if (parsedSymbols.length === 0) {
          return { problem: "--symbols was given no symbols." };
        }
        symbols = parsedSymbols;
        break;
      }
      case "--from":
        from = value;
        break;
      case "--to":
        to = value;
        break;
      default:
        return { problem: `${JSON.stringify(argument)} is not an option.` };
    }
  }

  // A range needs both ends or neither, for `pnpm backfill`'s reason: one end
  // alone is ambiguous, and guessing produces a window nobody asked for.
  if ((from === undefined) !== (to === undefined)) {
    return { problem: "--from and --to go together; give both or neither." };
  }

  return {
    timeframe,
    ...(symbols === undefined ? {} : { symbols }),
    ...(from === undefined ? {} : { from }),
    ...(to === undefined ? {} : { to }),
  };
}
