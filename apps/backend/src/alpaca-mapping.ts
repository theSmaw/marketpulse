/**
 * The vendor translation, both directions, as pure functions (Task 2.7.3).
 *
 * **This is the one structural decision in the task.** A client written as a
 * single file does the request, the parse, the mapping and the error handling
 * together, which is what every example anybody has read looks like — and it
 * makes every test of the mapping a test that needs a socket. Splitting the
 * mapping out keeps `pnpm test` fast, offline and buildless, which is a
 * property this repository has held since Story 1.9 and which one vendor-shaped
 * module would have broken for good.
 *
 * So: everything here is a pure function of its arguments. No `fetch`, no
 * clock, no credential, no `process.env`. `alpaca-provider.ts` is the thin part
 * — it makes the request, reads the status and hands the parsed body here.
 *
 * ## Both directions, deliberately, and the request half is not an afterthought
 *
 * The obvious split is "mapping means response → domain". It is the wrong one:
 * the single most dangerous line in this story is in the **request**, because
 * Alpaca's `end` is inclusive and ours is half-open (§4 below). Putting
 * {@link toAlpacaQuery} here makes that line testable without a socket, which
 * is exactly what it needs, and leaves the provider with nothing to get wrong
 * about a window.
 *
 * ## The measurements this file is written against
 *
 * Every one of them is from `ALPACA.md`, taken on 2026-09-07 against the live
 * API and **re-confirmed** by this task's own fixture recording. They are
 * observations of a third party on one day rather than facts reproducible from
 * a clean clone forever — re-measure rather than cite.
 */

import {
  type Adjustment,
  type Bar,
  type BarSeries,
  type BarSource,
  type MarketFeed,
  type ProviderId,
  type Timeframe,
  type TimeRange,
  toBarSeries,
  toSeriesProvenance,
} from "@marketpulse/shared";

import type { BarsRequest } from "./market-data-provider.js";

/**
 * Who this is, and which venues are in the numbers — **once**, because both are
 * read twice.
 *
 * `fixture-provider.ts`'s arrangement and for its stated reason: the provider's
 * own declared fields and the `BarSource` every series carries both read these,
 * so the chrome's standing claim about the configured feed and a series' claim
 * about its own cannot be made to disagree by editing one of them.
 */
export const ALPACA_PROVIDER_ID: ProviderId = "alpaca";

/**
 * **`sip`, and this is Story 2.7's open decision 6, settled here** — the first
 * thing in the product that writes a feed into a provenance record.
 *
 * ## The plan is asymmetric, which no open decision anticipated
 *
 * `ALPACA.md` §2, measured 2026-09-07: this free plan serves **SIP** — the full
 * US consolidated tape — for historical bars, and **IEX only** for the live
 * stream (`wss://…/v2/sip` is refused, `409 insufficient subscription`). The
 * restriction on the historical side is on **recency**, not on the tape: a SIP
 * request for the last six hours is `403 subscription does not permit querying
 * recent SIP data`.
 *
 * So `PRODUCT_SPEC.md` §7.1's own example, `Market feed: IEX`, is **wrong for
 * stored historical bars**, and a label that is wrong is worse than one that is
 * absent.
 *
 * ## Why the request sends `feed=sip` explicitly rather than taking the default
 *
 * The default was measured to be SIP — identical bar counts on three symbols
 * across a whole session — so sending nothing would produce the same data
 * today. Two arguments against relying on that, and the second is the one that
 * decides it:
 *
 *  - `sort=asc`'s argument, verbatim: **a default nobody stated is a default
 *    that can move**, and this one is a vendor's rather than ours.
 *  - **It makes the provenance record true by construction.** Whether the
 *    default silently falls back to IEX for a window SIP will not serve is
 *    *unmeasured*. An explicit `feed=sip` cannot fall back — it is a measured
 *    `403`, which Task 2.7.6 maps to a member — so a `BarSource` saying `sip`
 *    is a claim about what was asked for and answered, not an assumption about
 *    a default. Invariant 6 asks that provenance be displayed rather than
 *    implied, and a feed that might quietly be a different feed is implied.
 *
 * `feed=iex` was the third option and loses on measured quality, one way: on
 * the same session, mean minute coverage over thin names is **82.8% on `iex`
 * against 99.7%** on SIP, with `CCI` at 53.6% against 98.5%. `UNIVERSE.md`
 * §10's quality ceiling is a live-data concern and largely absent for stored
 * data.
 *
 * ## What this does NOT claim, and the line matters for Epic 3
 *
 * This is the **historical** provider's standing feed. Epic 3's live stream is
 * a *sibling* interface (`PROVIDER.md` §12) and will declare `iex`, because
 * that is what it is entitled to. §4.2's reversal trigger — *"a provider
 * serving more than one feed, chosen per request"* — is **not** met: this one
 * serves exactly one. A series later stitched from stored SIP bars and live IEX
 * bars is precisely the case `PROVIDER.md` §2.4 designed for, where a **feed**
 * disagreement across sources is truthful and reportable and only an
 * **adjustment** disagreement is refused.
 */
export const ALPACA_FEED: MarketFeed = "sip";

/** Where the bars endpoint lives. */
export const ALPACA_DATA_HOST = "https://data.alpaca.markets";

/** The bars endpoint's path, hosts aside. */
export const ALPACA_BARS_PATH = "/v2/stocks/bars";

/**
 * The largest page this endpoint will serve — **measured, and it is exact**.
 *
 * `ALPACA.md` §7: `10,000` returns 10,000 bars, and `10,001` is a clean `400`
 * rather than a silent clamp. Asking for the ceiling is what makes this task's
 * *"every request stays inside one page"* an arithmetic fact rather than a
 * hope: a full regular session is 390 minute bars, so a single-session window
 * cannot paginate, and a window that could is one Task 2.7.5 owns.
 */
export const ALPACA_MAX_LIMIT = 10_000;

/**
 * Our two timeframes onto the vendor's strings.
 *
 * `satisfies Record<Timeframe, string>` rather than a `switch`, because that is
 * what makes a third member of `TIMEFRAMES` a **compile error here** rather
 * than a request nobody checked. `PROVIDER.md` §9.4 keeps the vocabulary at two
 * and makes aggregation deliberately inexpressible; `ALPACA.md` §8 notes that
 * `5Min` and `1Week` are both served, which does not change that — they are
 * declined on replay-reconstruction grounds rather than on availability.
 */
const ALPACA_TIMEFRAMES = {
  "1m": "1Min",
  "1d": "1Day",
} as const satisfies Record<Timeframe, string>;

/**
 * Our two adjustments onto the vendor's parameter.
 *
 * A one-line pass-through rather than a corporate-actions table, which is
 * `PROVIDER.md` §3.3's finding earning its place: the vendor adjusts, so we ask
 * rather than compute. Exhaustive over `ADJUSTMENTS` for the same reason as
 * above.
 *
 * It is sent **unconditionally**, and the measurement that makes that safe is
 * the control in this task's own fixture corpus: `JNJ`, which has no split in
 * the recorded range, returns **byte-identical** bodies under both modes.
 */
const ALPACA_ADJUSTMENTS = {
  raw: "raw",
  "split-adjusted": "split",
} as const satisfies Record<Adjustment, string>;

/**
 * The query parameters for one request — the whole of the outbound mapping.
 *
 * Returned as an object rather than a URL so a test can assert one parameter
 * without parsing a string, and so the provider owns the host.
 */
export function toAlpacaQuery(request: BarsRequest): Record<string, string> {
  return {
    symbols: request.symbol,
    timeframe: ALPACA_TIMEFRAMES[request.timeframe],
    adjustment: ALPACA_ADJUSTMENTS[request.adjustment],
    feed: ALPACA_FEED,

    // **Explicitly, because `toBarSeries` refuses a series that is not strictly
    // ascending** — and because a default nobody stated is a default that can
    // move. The vendor's own default is ascending today; that is not a thing to
    // rest an invariant on.
    sort: "asc",

    // The measured ceiling, asked for on purpose. See ALPACA_MAX_LIMIT.
    limit: String(ALPACA_MAX_LIMIT),

    start: request.range.start.toISOString(),
    end: toAlpacaInclusiveEnd(request.range).toISOString(),
  };
}

/**
 * **The load-bearing line in this story: our half-open `end` as the vendor's
 * inclusive one.**
 *
 * ## The measurement
 *
 * `ALPACA.md` §4, and this task re-recorded it: `NVDA` over
 * 2026-09-03's regular session, which the calendar says is **390** minutes.
 * Asking `end` = the close returns **391 bars**, the extra one stamped at the
 * close instant exactly. 391 is *more* than the session has minutes, which no
 * amount of missing data can explain — which is the only reason it was caught.
 *
 * `PROVIDER.md` §9.3 makes `TimeRange` half-open, `[start, end)`, precisely so
 * adjacent windows tile without a duplicated bar at the seam. Passing `end`
 * straight through fetches one extra bar — and since `t` marks the **start** of
 * its interval (see {@link toBar}), the bar stamped at the close covers
 * 16:00–16:01 ET, which is **outside the regular session** `CALENDAR.md` §2
 * scopes V1 to. Story 2.8's backfill tiles thousands of these windows, and a
 * duplicate at a seam is real corruption that `market_bars`' unique constraint
 * would then reject — reporting a failure that was the database being right.
 *
 * ## Why ONE MILLISECOND and not one timeframe
 *
 * The task file offered *"subtract one timeframe, or filter the boundary bar
 * after the fact"*. Subtracting one **millisecond** is better than either and
 * the reason is that it is not an approximation at all: it is the exact
 * conversion from a half-open upper bound to an inclusive one, so it is correct
 * for any timeframe by construction rather than by a table that has to be kept
 * in step with `TIMEFRAMES`.
 *
 * Subtracting one timeframe also has a real hazard the millisecond does not: a
 * "day" is not always 86,400,000 ms, so a daily window spanning a DST
 * transition would move by an hour. And filtering after the fact fetches a bar
 * in order to discard it, which means the wire, the page budget and any future
 * cache all carry a bar that is not in the answer.
 *
 * **Verified against the live API on both timeframes** rather than reasoned
 * about, because a vendor accepting sub-second precision is not something to
 * assume: minute bars, `19:59:59.999Z` → 390 with `19:59:00Z` last, against
 * `20:00:00Z` → 391; daily bars, `03:59:59.999Z` → 20 against `04:00:00Z` → 21.
 * Every fixture in this task's corpus was recorded through this function's own
 * output, so the corpus *is* what the client sends.
 */
export function toAlpacaInclusiveEnd(range: TimeRange): Date {
  return new Date(range.end.getTime() - 1);
}

/**
 * What this task refuses to handle, thrown rather than answered.
 *
 * A distinct class so the provider can let it through deliberately rather than
 * catching every `Error` and hoping.
 */
export class AlpacaPaginationUnsupportedError extends Error {
  public override readonly name = "AlpacaPaginationUnsupportedError";

  public constructor(token: string) {
    super(
      `Alpaca returned a next_page_token (${token.slice(0, 12)}…), so this ` +
        `answer is only the first page of a longer range. Task 2.7.5 adds ` +
        `pagination; until it does, this client refuses to return a partial ` +
        `series rather than returning one that looks complete. Ask for a ` +
        `narrower range — a single regular session is 390 minute bars against ` +
        `a measured page ceiling of ${String(ALPACA_MAX_LIMIT)}.`,
    );
  }
}

/**
 * One bar as the vendor sends it. **Their shape, named their way**, which
 * `PROVIDER.md` §7 asks for: a vendor's field names stay inside the mapping so
 * that reading it is reading a translation rather than a rename.
 *
 * Eight fields are sent and six are taken — see {@link toBar}.
 */
interface AlpacaBar {
  readonly t: string;
  readonly o: number;
  readonly h: number;
  readonly l: number;
  readonly c: number;
  readonly v: number;
}

/** The response envelope. `ALPACA.md` §8: two keys, and `currency` was absent. */
interface AlpacaBarsBody {
  readonly bars: Readonly<Record<string, readonly AlpacaBar[]>>;
  readonly next_page_token: string | null;
}

/**
 * Reads an unknown parsed body as {@link AlpacaBarsBody}, or throws.
 *
 * **A parse failure is a THROW and not a `BarsResult` member**, and the line is
 * `PROVIDER.md` §8.5's: a cause is a union member when it is a fact about the
 * world, and a thrown defect when it is a fact about our code. A body that does
 * not have the documented shape means our understanding of this vendor is
 * wrong, which is ours. Laundering it into `upstream-unavailable` would put it
 * in front of a retry wrapper that would then retry a shape that will never
 * change.
 *
 * The check is deliberately shallow on the envelope and **strict on each bar**,
 * because the envelope failing is loud either way and a bar failing quietly is
 * how a `null` close reaches a chart.
 */
export function parseAlpacaBarsBody(body: unknown): AlpacaBarsBody {
  if (typeof body !== "object" || body === null) {
    throw new TypeError(
      `Alpaca response body is ${body === null ? "null" : typeof body}, not an object.`,
    );
  }

  const record = body as Record<string, unknown>;
  const bars = record.bars;

  // `bars` is an OBJECT keyed by symbol, and it is `{}` rather than absent for
  // an empty answer — measured on a holiday, an unknown symbol and a range
  // outside the plan's history, all three `200 {"bars":{},"next_page_token":null}`.
  if (typeof bars !== "object" || bars === null || Array.isArray(bars)) {
    throw new TypeError(
      `Alpaca response body has no "bars" object; got ${describeType(bars)}.`,
    );
  }

  // **On the last page this field is PRESENT and `null`** (`ALPACA.md` §7,
  // walked to exhaustion over five pages), so a nullish check is what handles
  // both it and a hypothetical absence. A client testing for the key's absence
  // would loop forever.
  const token = record.next_page_token;
  if (token !== null && token !== undefined && typeof token !== "string") {
    throw new TypeError(
      `Alpaca next_page_token is ${describeType(token)}, expected a string or null.`,
    );
  }

  const parsed: Record<string, readonly AlpacaBar[]> = {};
  for (const [symbol, value] of Object.entries(
    bars as Record<string, unknown>,
  )) {
    if (!Array.isArray(value)) {
      throw new TypeError(
        `Alpaca bars for ${symbol} is ${describeType(value)}, expected an array.`,
      );
    }
    parsed[symbol] = value.map((bar, index) =>
      parseAlpacaBar(bar, symbol, index),
    );
  }

  return { bars: parsed, next_page_token: token ?? null };
}

/** One bar, checked field by field. */
function parseAlpacaBar(
  value: unknown,
  symbol: string,
  index: number,
): AlpacaBar {
  if (typeof value !== "object" || value === null) {
    throw new TypeError(
      `Alpaca bar ${String(index)} for ${symbol} is ${describeType(value)}, expected an object.`,
    );
  }

  const bar = value as Record<string, unknown>;
  const where = `Alpaca bar ${String(index)} for ${symbol}`;

  const t = bar.t;
  if (typeof t !== "string") {
    throw new TypeError(
      `${where} has t=${describeType(t)}, expected an RFC 3339 string.`,
    );
  }

  return {
    t,
    o: finite(bar.o, "o", where),
    h: finite(bar.h, "h", where),
    l: finite(bar.l, "l", where),
    c: finite(bar.c, "c", where),
    v: finite(bar.v, "v", where),
  };
}

/**
 * One numeric field, or a throw naming it.
 *
 * **`Number.isFinite` and not `typeof === "number"`**, which is the whole
 * reason this is a function rather than a cast: a `NaN` or an `Infinity` is a
 * number that would reach a chart and every percentage calculation and be
 * silently wrong. Invariant 1 is about numbers coming from deterministic code,
 * and a `NaN` that arrived from a vendor is not that.
 */
function finite(value: unknown, key: string, where: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(
      `${where} has ${key}=${describeType(value)}, expected a finite number.`,
    );
  }
  return value;
}

function describeType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  return typeof value;
}

/**
 * One vendor bar as one of ours.
 *
 * ## `t` maps to `startsAt` with NO SHIFT, and that is measured
 *
 * `ALPACA.md` §5.3: `SPY` on 2026-09-03, whose session opens at `13:30:00Z`,
 * has its **first bar stamped `13:30:00Z` exactly**. If `t` marked the *end* of
 * its interval the first bar would be `13:31:00Z`. So `t` marks the **start**,
 * and `Bar.startsAt` takes it directly.
 *
 * The evidence is written here rather than the conclusion alone, because a
 * future reader who disagrees needs to know what would settle it — and
 * `alpaca-mapping.test.ts` asserts it against a recorded session whose first and
 * last bars are known, so a shift is a red test rather than a silent
 * one-minute systematic error. `PROVIDER.md` §9.2 named this as the trap the
 * field's name exists to catch; the convention turned out to be the convenient
 * one and the naming decision cost nothing.
 *
 * **A daily bar's `t` is stamped at midnight ET** (`04:00:00Z` under EDT, not
 * the session open), which is a different thing and is why nothing here maps a
 * `t` onto a session boundary.
 *
 * ## Two fields are dropped, and they are declined rather than forgotten
 *
 * `n` (trade count) and `vw` (volume-weighted price). `PROVIDER.md` §9.1
 * declined both **with triggers**, and the rule is that adding one costs a
 * column in a table with roughly ten million rows a year plus a value in every
 * response. Do not widen `Bar` here: that is a decision with an owner, not a
 * convenience taken while writing a mapping.
 */
function toBar(bar: AlpacaBar): Bar {
  return {
    startsAt: new Date(bar.t),
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
  };
}

/**
 * The whole inbound mapping: a parsed body plus the question that produced it,
 * as a {@link BarSeries}.
 *
 * `retrievedAt` is a **parameter** and never read from a clock here, which is
 * two decisions at once. It keeps this module pure, so every test of it is a
 * fast test. And it puts the stamp at the **fetch**, which is `PROVIDER.md`
 * §4.3's rule and the trap this repository has already fallen into once: Task
 * 2.3.5's `checkedOn` defaulting to `now()` made a provenance date always today
 * and therefore permanently silent about the one thing it exists to report. A
 * read path that re-stamps is the same failure — so it is stamped here, once,
 * and Story 2.9's read path has nothing left to stamp.
 */
export function toBarSeriesFromAlpaca(
  request: BarsRequest,
  body: unknown,
  retrievedAt: string,
): BarSeries {
  const parsed = parseAlpacaBarsBody(body);

  // **Loud, and it stays loud until Task 2.7.5 removes it.** A client that
  // quietly returned the first page of a longer range would lie with a
  // perfectly well-formed answer: ascending, correct provenance, plausible
  // coverage, and missing data nobody notices until a chart has a hole in it.
  // `PROVIDER.md` §8.5 applies exactly — an incomplete answer we produced is
  // US, not the world — so laundering it into `upstream-unavailable` or into a
  // successful short series is the shape that section forbids.
  if (parsed.next_page_token !== null) {
    throw new AlpacaPaginationUnsupportedError(parsed.next_page_token);
  }

  // Absent rather than empty for a symbol with nothing to say. Measured: a
  // holiday, an unknown symbol and a range outside the plan's history are all
  // `{"bars":{}}` — BYTE-IDENTICAL, so this mapping structurally cannot tell
  // them apart and does not try. An empty answer is a SUCCESS (`PROVIDER.md`
  // §8.2), and `unknown-symbol` is not producible from this endpoint at all —
  // which is Task 2.7.8's assets-endpoint decision, not a gap here.
  const vendorBars = parsed.bars[request.symbol] ?? [];
  const bars = vendorBars.map(toBar);

  const source: BarSource = {
    provider: ALPACA_PROVIDER_ID,
    feed: ALPACA_FEED,
    retrievedAt,
    barCount: bars.length,
  };

  return toBarSeries({
    symbol: request.symbol,
    timeframe: request.timeframe,
    bars,
    provenance: toSeriesProvenance(request.adjustment, source),
    coverage: {
      requested: request.range,

      // **The window this answer REACHES, which is the whole window we asked
      // for** — not the span of the bars. `fixture-provider.ts` records the
      // reasoning and it transfers unchanged: coverage says how far an answer
      // reaches rather than whether it is dense, so a thin name whose last
      // print was 15:42 is still covered to the close. Reading it as the span
      // of the bars is what makes *"we have data through 15:42"* — which is
      // wrong, and is the sentence a user would be shown.
      //
      // `null` exactly when there are no bars, which `toBarSeries` enforces
      // both ways round.
      covered: bars.length === 0 ? null : request.range,
    },
  });
}
