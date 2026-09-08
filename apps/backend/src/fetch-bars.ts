/**
 * `pnpm bars`' mechanism (Task 2.7.3) — one symbol, one session, printed.
 *
 * **This is the operator command, and it is the only thing in this task a
 * stakeholder can be shown.** Story 2.7 fetches into a terminal rather than
 * into a database, which the story says plainly; what there is to demonstrate
 * is real closing prices for a real session out of a real market-data vendor,
 * which is the first real market number this product has ever produced.
 *
 * It lives in `src/` and not in `scripts/` for `migrate.ts` and
 * `load-universe.ts`'s reason: everything here is then typechecked, linted
 * under the full type-aware pass, formatted and testable, and
 * `scripts/fetch-bars.mjs` is a thin wrapper carrying the name, the
 * built-output guard and the exit code.
 *
 * ## It prints, and deliberately stores nothing
 *
 * Story 2.8 owns storage. This is the shape `pnpm migrate` and `pnpm universe`
 * established — a named command over a module inside `pnpm verify`'s net — with
 * the one difference that this one is read-only and touches no database at all.
 */

import {
  type Adjustment,
  ADJUSTMENTS,
  type BarSeries,
  isTicker,
  lastMarketSessions,
  type MarketSession,
  marketDateAt,
  marketSessionsBetween,
  type Timeframe,
  TIMEFRAMES,
  toMarketDate,
  toTicker,
} from "@marketpulse/shared";

import { createAlpacaProvider } from "./alpaca-provider.js";
import { windowFor } from "./bar-window.js";
import { ConfigError, loadConfig, loadEnvFile } from "./config.js";
import type { BarsRequest } from "./market-data-provider.js";
import { withRetry } from "./retry-provider.js";

/** What a run produced, so the wrapper can turn it into a process result. */
export interface FetchBarsOutcome {
  readonly exitCode: 0 | 1;
  readonly lines: readonly string[];
  readonly errors: readonly string[];
}

/**
 * Fetch one symbol's bars for the most recent complete trading session and
 * render them.
 *
 * `argv` is a parameter rather than read from `process.argv`, which is what
 * makes this testable at all — `loadConfig(env)`'s shape, for its reason.
 */
export async function fetchBarsCommand(
  argv: readonly string[],
  env?: NodeJS.ProcessEnv,
): Promise<FetchBarsOutcome> {
  const lines: string[] = [];
  const errors: string[] = [];

  const parsed = parseArguments(argv);
  if ("problem" in parsed) {
    return { exitCode: 1, lines, errors: [parsed.problem, "", USAGE] };
  }

  // `apps/backend/.env` is where a developer's key lives, and `loadConfig`
  // reads the process rather than a file — so this is the same two-step
  // `migrate.ts` and `load-universe.ts` both take. `loadEnvFile` is the only
  // thing in this application that writes the process environment, which is why
  // it is called from an entrypoint rather than from `loadConfig`.
  //
  // **It is skipped when a caller supplies its own environment**, and that is a
  // stated behaviour rather than a convenience: supplying one means *this is
  // the environment*, so reading a file over the top of it would make the
  // argument a lie. It is also what keeps this module's fast tests from
  // mutating the process they run in — `loadEnvFile` writes `process.env`, and
  // a test that reached a developer's real key would make a metered request.
  const environment = env ?? (loadEnvFile(), process.env);

  let config;
  try {
    config = loadConfig(environment);
  } catch (error) {
    return {
      exitCode: 1,
      lines,
      errors: [error instanceof ConfigError ? error.message : String(error)],
    };
  }

  if (config.alpaca === undefined) {
    return {
      exitCode: 1,
      lines,
      errors: [
        "No Alpaca credential is configured, so there is nothing to ask.",
        "Set ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY in apps/backend/.env.",
      ],
    };
  }

  const provider = withRetry(createAlpacaProvider(config.alpaca));

  // Sessions come from the trading calendar rather than from arithmetic on
  // today's date, so weekends, holidays and half days are all correct without
  // this file knowing anything about any of them. `lastMarketSessions` is
  // oldest-first.
  //
  // **The most recent COMPLETE session is the last one it does NOT return**,
  // which is why one extra is asked for and the newest dropped: today's session
  // may not have happened yet, may be in progress, and in any case falls inside
  // the plan's withheld recent window — see ALPACA.md §10.
  let first: MarketSession;
  let last: MarketSession;

  if (parsed.from === undefined || parsed.to === undefined) {
    const wanted = parsed.timeframe === "1m" ? 1 : DAILY_SESSIONS;
    const sessions = lastMarketSessions(
      wanted + 1,
      marketDateAt(new Date()),
    ).slice(0, wanted);
    const head = sessions[0];
    const tail = sessions.at(-1);
    if (head === undefined || tail === undefined) {
      return {
        exitCode: 1,
        lines,
        errors: ["The trading calendar returned no recent session."],
      };
    }
    first = head;
    last = tail;
  } else {
    // **A given range is resolved through the trading calendar rather than
    // through arithmetic on the dates**, which is what makes a weekend, a
    // holiday and a half day all correct without this file knowing about any of
    // them — and what makes a date the market was shut a REFUSAL rather than a
    // silently empty answer, which is the failure mode a user cannot
    // distinguish from "there was no trading".
    const resolved = sessionsFor(parsed.from, parsed.to);
    if ("problem" in resolved) {
      return { exitCode: 1, lines, errors: [resolved.problem] };
    }
    first = resolved.first;
    last = resolved.last;
  }

  const request: BarsRequest = {
    symbol: parsed.symbol,
    range: windowFor(parsed.timeframe, first, last),
    timeframe: parsed.timeframe,
    adjustment: parsed.adjustment,
  };

  lines.push(
    `${parsed.symbol}  ${first.date}${first.date === last.date ? "" : ` → ${last.date}`}  ${parsed.timeframe}  ${parsed.adjustment}`,
    `  window  ${request.range.start.toISOString()} → ${request.range.end.toISOString()}`,
    `  provider ${provider.id}  feed ${provider.feed}`,
    "",
  );

  const result = await provider.fetchBars(request, {
    deadlineMs: BARS_COMMAND_DEADLINE_MS,
  });

  if (result.outcome !== "ok") {
    // Every non-`ok` member is printed rather than mapped to a message per
    // member: Task 2.7.6 owns what this vendor can produce, and a table of
    // sentences written here would be the second copy of that taxonomy.
    return {
      exitCode: 1,
      lines,
      errors: [`Alpaca answered: ${result.outcome}`],
    };
  }

  lines.push(...render(result.series));
  return { exitCode: 0, lines, errors };
}

/**
 * This command's own deadline, and it is passed explicitly because
 * `DEFAULT_BARS_DEADLINE_MS` is the wrong number here twice over.
 *
 * That default is 3,000 ms, derived for a **single** request against the
 * browser's 5-second budget — and Task 2.7.5 then measured a five-page walk at
 * **2,170 ms, 72% of it**, so at the default a paginated range has room for
 * zero retries. `retry-provider.ts` states that as its precondition: a caller
 * that wants retries on a multi-page range must pass its own deadline, because
 * the wrapper wraps `fetchBars` and a range is not a page count.
 *
 * The second reason is that a browser's budget is not this command's. Nobody is
 * waiting on a render; a person is waiting on a terminal, and would rather wait
 * ten seconds than read an error.
 *
 * **20 s ≈ nine of the measured five-page walks**, which leaves room for a walk
 * plus a retried walk plus backoff, and is short enough that a human does not
 * wonder whether it has hung. The limit worth stating rather than hiding: the
 * rate-limit window is ~60 s, so this recovers from a burst that has just
 * cleared and **not** from a saturated minute — a genuinely rate-limited key
 * still reports `rate-limited`, which is the honest answer.
 */
const BARS_COMMAND_DEADLINE_MS = 20_000;

/**
 * How many sessions a daily run covers. Enough to be a demonstration and small
 * enough to stay inside one page — a month of daily bars is 21 rows against a
 * measured page ceiling of 10,000.
 */
const DAILY_SESSIONS = 30;

/**
 * Two market dates as the two sessions that bound a range, or a refusal.
 *
 * Every failure here is named rather than answered with an empty series,
 * because *"the market was shut that day"* and *"no trades happened"* are
 * different sentences and only one of them is a user's mistake.
 */
function sessionsFor(
  from: string,
  to: string,
): { first: MarketSession; last: MarketSession } | { problem: string } {
  let firstDate;
  let lastDate;
  try {
    firstDate = toMarketDate(from);
    lastDate = toMarketDate(to);
  } catch (error) {
    return { problem: error instanceof Error ? error.message : String(error) };
  }

  if (firstDate > lastDate) {
    return { problem: `--from ${from} is after --to ${to}.` };
  }

  let sessions;
  try {
    sessions = marketSessionsBetween(firstDate, lastDate);
  } catch (error) {
    // The calendar covers 2024–2028 and refuses outside it, naming the range
    // and the file to edit. Propagated rather than swallowed — a short list of
    // sessions is a wrong answer wearing the shape of a right one.
    return { problem: error instanceof Error ? error.message : String(error) };
  }

  const first = sessions[0];
  const last = sessions.at(-1);
  if (first === undefined || last === undefined) {
    return {
      problem: `The market was not open on any day between ${from} and ${to}.`,
    };
  }
  return { first, last };
}

/** The series as a person reads it: the head, the tail and what it claims. */
function render(series: BarSeries): readonly string[] {
  const lines: string[] = [];
  const { bars } = series;

  if (bars.length === 0) {
    lines.push(
      "  no bars — which is a SUCCESSFUL empty answer rather than a failure.",
      "  A holiday, a symbol outside the plan's history, or a symbol this",
      "  vendor does not know all answer identically. PROVIDER.md §8.2.",
    );
    return lines;
  }

  lines.push(
    `  ${String(bars.length)} bars`,
    "",
    "      time (UTC)              open      high       low     close        volume",
  );

  // Head and tail rather than everything: 390 lines is not a demonstration.
  const HEAD = 5;
  const TAIL = 5;
  const shown =
    bars.length <= HEAD + TAIL
      ? bars.map((bar, index) => ({ bar, index }))
      : [
          ...bars.slice(0, HEAD).map((bar, index) => ({ bar, index })),
          ...bars.slice(bars.length - TAIL).map((bar, offset) => ({
            bar,
            index: bars.length - TAIL + offset,
          })),
        ];

  let previous = -1;
  for (const { bar, index } of shown) {
    if (index !== previous + 1) {
      lines.push(`      … ${String(index - previous - 1)} more …`);
    }
    previous = index;
    lines.push(
      `      ${bar.startsAt.toISOString()}  ${money(bar.open)} ${money(bar.high)} ${money(bar.low)} ${money(bar.close)} ${String(bar.volume).padStart(13)}`,
    );
  }

  const source = series.provenance.sources[0];
  lines.push(
    "",
    `  provenance  ${series.provenance.adjustment}, ${String(series.provenance.sources.length)} source`,
    `              ${source.provider} / ${source.feed}, ${String(source.barCount)} bars, retrieved ${source.retrievedAt}`,
    `  coverage    ${describeCoverage(series)}`,
  );
  return lines;
}

function describeCoverage(series: BarSeries): string {
  const { covered } = series.coverage;
  if (covered === null) return "nothing — the answer is empty";
  return `${covered.start.toISOString()} → ${covered.end.toISOString()}`;
}

/** Right-aligned to a fixed width, because a price column that jiggles is noise. */
function money(value: number): string {
  return value.toFixed(4).padStart(9);
}

const USAGE = [
  "Usage: pnpm bars <SYMBOL> [1m|1d] [raw|split-adjusted] [--from YYYY-MM-DD] [--to YYYY-MM-DD]",
  "",
  "  Fetches one symbol's bars from Alpaca and prints them. It stores nothing",
  "  — Story 2.8 owns that.",
  "",
  "  With no range it is the most recent complete trading session (1m) or the",
  "  last 30 sessions (1d). With a range it is that range, walked across as",
  "  many pages as it takes.",
  "",
  "  pnpm bars NVDA",
  "  pnpm bars NVDA 1d",
  "  pnpm bars NVDA 1d split-adjusted",
  "  pnpm bars NVDA 1m --from 2026-08-03 --to 2026-09-04",
  "",
  "  Dates are market dates and the range is half-open on the SESSION: --from",
  "  opens at that date's market open and --to closes at that date's close, so",
  "  --from X --to X is exactly one session. A date the market was shut is a",
  "  refusal rather than a silent empty answer.",
].join("\n");

type ParsedArguments =
  | {
      readonly symbol: ReturnType<typeof toTicker>;
      readonly timeframe: Timeframe;
      readonly adjustment: Adjustment;
      readonly from?: string;
      readonly to?: string;
    }
  | { readonly problem: string };

/**
 * Arguments are parsed rather than refused, which is the opposite of
 * `pnpm migrate` and `pnpm universe` — and the difference is what the command
 * *is*. Those two have exactly one operation over one description of the world,
 * so an option would be a second way to reach a database. This one asks a
 * question, and a question with no subject is not a question.
 */
function parseArguments(argv: readonly string[]): ParsedArguments {
  // The two flags are pulled out first, so the positional arguments keep the
  // shape Task 2.7.3 shipped and an existing invocation is unaffected.
  const positional: string[] = [];
  let from: string | undefined;
  let to: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--from" || argument === "--to") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) {
        return { problem: `${argument} needs a date, as YYYY-MM-DD.` };
      }
      if (argument === "--from") from = value;
      else to = value;
      index += 1;
      continue;
    }
    if (argument?.startsWith("--") === true) {
      return { problem: `${JSON.stringify(argument)} is not an option.` };
    }
    if (argument !== undefined) positional.push(argument);
  }

  const [rawSymbol, rawTimeframe = "1m", rawAdjustment = "raw"] = positional;

  if (rawSymbol === undefined) {
    return { problem: "No symbol given." };
  }
  if (!isTicker(rawSymbol)) {
    return {
      problem: `${JSON.stringify(rawSymbol)} is not a well-formed ticker.`,
    };
  }
  if (!isMember(TIMEFRAMES, rawTimeframe)) {
    return {
      problem: `${JSON.stringify(rawTimeframe)} is not a timeframe. Expected ${TIMEFRAMES.join(" or ")}.`,
    };
  }
  if (!isMember(ADJUSTMENTS, rawAdjustment)) {
    return {
      problem: `${JSON.stringify(rawAdjustment)} is not an adjustment. Expected ${ADJUSTMENTS.join(" or ")}.`,
    };
  }

  // **A range needs both ends or neither.** One end alone is ambiguous — does
  // `--from` mean "to now", which this plan refuses inside its withheld window,
  // or "to the last complete session"? Guessing produces a window nobody asked
  // for, so it is refused rather than defaulted.
  if ((from === undefined) !== (to === undefined)) {
    return {
      problem: "--from and --to go together; give both or neither.",
    };
  }

  return {
    symbol: toTicker(rawSymbol),
    timeframe: rawTimeframe,
    adjustment: rawAdjustment,
    ...(from === undefined ? {} : { from }),
    ...(to === undefined ? {} : { to }),
  };
}

/** `includes` on a `readonly T[]` narrows nothing, so this does. */
function isMember<T extends string>(
  allowed: readonly T[],
  value: string,
): value is T {
  return (allowed as readonly string[]).includes(value);
}
