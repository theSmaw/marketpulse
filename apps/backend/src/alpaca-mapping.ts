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
  type Ticker,
  type Timeframe,
  type TimeRange,
  toBarSeries,
  toTimeRange,
  toSeriesProvenance,
} from "@marketpulse/shared";

import type {
  BarsRequest,
  BarsResult,
  ManyBarsRequest,
} from "./market-data-provider.js";

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
 * How far back this plan's `end` must reach before SIP will answer at all.
 *
 * **Measured 2026-09-07 by Task 2.7.5, and it is a cliff rather than a
 * gradient.** Holding `start` a day back and walking `end` towards now, on
 * `feed=sip`: an `end` **15 minutes or older is `200`**, and **14 minutes or
 * newer is `403`**.
 *
 * Three things that measurement settled, and each changes a design:
 *
 *  - **The refusal keys on `end` ALONE.** `start` inside the window is
 *    irrelevant — `start` 31 and 60 minutes ago against an `end` 30 minutes ago
 *    are both `200`.
 *  - **It refuses the WHOLE request rather than answering partially.** A window
 *    from Friday's open to now — 6½ hours of perfectly available data plus ~15
 *    minutes that is not — is a flat `403 subscription does not permit querying
 *    recent SIP data`. **Nothing comes back.** This is the finding Task 2.7.5's
 *    brief did not anticipate: it expected a short answer to clip, and there is
 *    no answer to clip.
 *  - **It applies to daily too**, not only to minute bars.
 *
 * So the vendor's recency restriction cannot be handled by reading a short
 * answer. It has to be handled **before the request**, by
 * {@link alpacaServableEnd}.
 *
 * The margin over the measured 15 minutes is deliberate and is one minute. The
 * boundary was measured at *exactly* 15, so our clock and the vendor's
 * disagreeing by a few seconds is the difference between a served request and a
 * refused one. The asymmetry decides it: the margin costs at most one bar,
 * where landing the wrong side of the cliff costs the entire request.
 */
export const ALPACA_SIP_WITHHOLDING_MS = 16 * 60 * 1000;

/**
 * The latest `end` this plan will actually serve, given the instant we ask at.
 *
 * **Clamping is the answer, and the two alternatives are rejected on
 * `PROVIDER.md`'s own rules rather than on convenience.**
 *
 * *Let it 403 and map the failure* is forbidden outright: §7 says the withheld
 * recent window **is not an error and must never map onto one**. It is also the
 * worst outcome for the caller that will actually hit this — Story 2.8's
 * backfill asks *"from the last bar I stored, to now"*, exactly the shape that
 * gets refused, so it would store **nothing** on every run rather than
 * everything up to the cliff.
 *
 * *Refuse at construction*, making the caller do the arithmetic, moves a
 * vendor-plan property into every call site — and `PROVIDER.md` §1 puts vendor
 * facts behind the provider interface precisely so callers do not learn them.
 *
 * Clamping is what `SeriesCoverage` was designed for: the answer honestly
 * covers **less** than was requested and says so, which is the distinction
 * `requested` and `covered` exist to carry. §8.5's *"an incomplete answer we
 * produced is us, not the world"* is not breached, because the incompleteness
 * is **reported** — an unreported clip would be the breach.
 *
 * `now` is a **parameter** and never a clock read here, which keeps this module
 * pure and every test of it fast. The provider stamps one instant per fetch and
 * uses it for this and for `retrievedAt`, so a paginated fetch cannot clamp
 * against a moving target.
 */
export function alpacaServableEnd(range: TimeRange, now: Date): Date {
  const cliff = new Date(now.getTime() - ALPACA_SIP_WITHHOLDING_MS);
  return range.end < cliff ? range.end : cliff;
}

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
export function toAlpacaQuery(
  request: BarsRequest,
  options: { readonly end: Date; readonly pageToken?: string } = {
    end: request.range.end,
  },
): Record<string, string> {
  return alpacaQuery(request.symbol, request, options);
}

/**
 * The same, for a batch (Task 2.8.5) — **one comma-separated `symbols`
 * parameter and nothing else different.**
 *
 * That is the whole outbound half of the batch: this vendor's endpoint has
 * always been plural, and the single-symbol form is the degenerate case of it.
 * The interesting half is entirely inbound, in
 * {@link toBarsBySymbolFromAlpacaPage} and in the walk that calls it.
 *
 * **No chunking and no length guard**, measured rather than assumed: all 518
 * tracked securities in one request is a 3,209-character encoded query string
 * answered `200` (`BARS.md`, Task 2.8.2). A guard here would be a limit we
 * invented sitting in front of one the vendor does not have.
 *
 * Duplicates are not collapsed here, because the vendor tolerates them and the
 * caller has already keyed its accumulator by symbol — collapsing would be a
 * second place the symbol set is decided.
 */
export function toAlpacaManyQuery(
  request: ManyBarsRequest,
  options: { readonly end: Date; readonly pageToken?: string } = {
    end: request.range.end,
  },
): Record<string, string> {
  return alpacaQuery(request.symbols.join(","), request, options);
}

/**
 * Everything both forms share, written once.
 *
 * `symbols` is the only parameter that differs between a single fetch and a
 * batch, so it is the only one passed separately — and writing the other seven
 * twice is how the two forms come to disagree about `sort` or `limit`, which
 * would be a difference nothing in a test of either one could see.
 */
function alpacaQuery(
  symbols: string,
  request: {
    readonly range: TimeRange;
    readonly timeframe: Timeframe;
    readonly adjustment: Adjustment;
  },
  options: { readonly end: Date; readonly pageToken?: string },
): Record<string, string> {
  return {
    symbols,
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

    // The **servable** end rather than the requested one, converted to this
    // vendor's inclusive bound. On a historical range the two are the same; on
    // a range reaching into the withheld recent window the clamp is what stops
    // the whole request being refused. See {@link alpacaServableEnd}.
    end: toAlpacaInclusiveEnd(options.end).toISOString(),

    // **Present only on pages after the first**, and spread rather than
    // assigned: an `undefined` here would reach the URL as the literal string
    // `"undefined"`, which this vendor answers `400` for. The same
    // absent-versus-present-and-undefined distinction `apiError()` makes, in a
    // place where getting it wrong costs a metered request.
    ...(options.pageToken === undefined
      ? {}
      : { page_token: options.pageToken }),
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
export function toAlpacaInclusiveEnd(end: Date): Date {
  return new Date(end.getTime() - 1);
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
export interface AlpacaBarsBody {
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
 * column in a table with ~47.7M rows a year at the 518-security universe
 * (~10M at the ~100 this was written against) plus a value in every
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
export function toBarsFromAlpacaPage(
  parsed: AlpacaBarsBody,
  symbol: string,
): readonly Bar[] {
  // Absent rather than empty for a symbol with nothing to say. Measured: a
  // holiday, an unknown symbol and a range outside the plan's history are all
  // `{"bars":{}}` — BYTE-IDENTICAL, so this mapping structurally cannot tell
  // them apart and does not try. An empty answer is a SUCCESS (`PROVIDER.md`
  // §8.2), and `unknown-symbol` is not producible from this endpoint at all —
  // which is Task 2.7.8's assets-endpoint decision, not a gap here.
  return (parsed.bars[symbol] ?? []).map(toBar);
}

/**
 * Every symbol a page touched, as bars (Task 2.8.5).
 *
 * **The plural counterpart of {@link toBarsFromAlpacaPage}, and the difference
 * between them is the whole hazard this task exists for.** The single-symbol
 * form asks the page for one key and reads `[]` when it is absent, which is
 * correct there because the walk is for one symbol and an absent key on the
 * *last* page means the same as an absent key on the only page. In a batch it
 * does not: a symbol absent from a page may have a full session of data on the
 * next one.
 *
 * So this function reports **what the page actually contained** and nothing
 * about what it did not. It takes no symbol list and deliberately cannot
 * "helpfully" fill in an empty array for a symbol that was asked for and did
 * not appear — that conclusion belongs after the walk is exhausted and nowhere
 * else, and a function shaped so it could draw it here is a function somebody
 * will call from inside the loop.
 *
 * Keys are returned as the vendor spelled them, unvalidated: mapping them onto
 * the requested `Ticker`s is the caller's, because that is where the requested
 * set is known.
 */
export function toBarsBySymbolFromAlpacaPage(
  parsed: AlpacaBarsBody,
): ReadonlyMap<string, readonly Bar[]> {
  return new Map(
    Object.entries(parsed.bars).map(([symbol, bars]) => [
      symbol,
      bars.map(toBar),
    ]),
  );
}

/**
 * One symbol's slice of a batch request, as the single-symbol question.
 *
 * This is what lets a batch reuse {@link toBarSeriesFromAlpacaBars} verbatim
 * rather than growing a second series builder — and reusing it is not tidiness:
 * `covered`, the withheld-window clamp and the `barCount` cross-check are all
 * decisions with arguments attached, and a batch-specific copy would be a
 * second place each of them is made.
 */
export function singleRequestFor(
  request: ManyBarsRequest,
  symbol: Ticker,
): BarsRequest {
  return {
    symbol,
    range: request.range,
    timeframe: request.timeframe,
    adjustment: request.adjustment,
  };
}

/**
 * The accumulated bars of a whole fetch, plus the question that produced them,
 * as a {@link BarSeries}.
 *
 * **It takes bars rather than a body, which is what pagination cost this
 * module** (Task 2.7.5). Before it, one body was one answer; now one answer is
 * one *or more* bodies, and only the caller that walked them knows when it is
 * finished. Splitting it this way keeps the module pure and keeps the loop —
 * the part with a deadline, a signal and a page bound — in the provider, where
 * the other transport concerns already are.
 *
 * `retrievedAt` is a **parameter** and never read from a clock here. That keeps
 * this module pure, and it puts the stamp at the **start of the fetch** rather
 * than at its end — which matters more once a fetch can span pages, because a
 * slow walk stamped at completion claims a freshness its earliest bars do not
 * have, and reporting staleness is the field's whole job.
 *
 * `covered` is the **servable** window rather than the requested one, which is
 * how a range reaching into this plan's withheld recent window reports
 * honestly. See {@link alpacaServableEnd}.
 */
export function toBarSeriesFromAlpacaBars(
  request: BarsRequest,
  bars: readonly Bar[],
  retrievedAt: string,
  servableEnd: Date,
): BarSeries {
  const source: BarSource = {
    provider: ALPACA_PROVIDER_ID,
    feed: ALPACA_FEED,
    retrievedAt,
    barCount: bars.length,
  };

  // The window this answer actually reaches, clamped to what the plan will
  // serve. Identical to `request.range` for any historical window, which is
  // every window except one ending inside the last ~16 minutes.
  //
  // **Computed only when there ARE bars, and that is a fix rather than a
  // micro-optimisation.** When the *whole* window is withheld the clamped end
  // is earlier than the start, and `toTimeRange` refuses a reversed pair —
  // correctly, since an empty result there would hide a swapped or off-by-one
  // argument. That case has no bars, so it has no coverage to describe:
  // `toBarSeries` requires `covered` to be null exactly when the series is
  // empty, and computing the range eagerly threw before reaching that. Found
  // by a test, and by the domain type rather than by an assertion.
  const covered = (): TimeRange =>
    servableEnd >= request.range.end
      ? request.range
      : toTimeRange(request.range.start, servableEnd);

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
      covered: bars.length === 0 ? null : covered(),
    },
  });
}

/**
 * A failure status from this vendor, as a {@link BarsResult} member — or a
 * throw, when the status says the request was **ours** to get right (Task
 * 2.7.6).
 *
 * ## Map on the STATUS first, and read a body only when there is one
 *
 * This is the trap the task was written around and it is measured rather than
 * imagined. **A bad key answers `401` with an HTML body** — nginx's
 * `<html>…401 Authorization Required…</html>`, produced before the application
 * is reached, recorded verbatim as `fixtures/alpaca/error-401-bad-key.html`.
 * A client that reaches for the body first turns the single clearest
 * authorisation failure there is into a JSON parse error, which is exactly the
 * laundering `PROVIDER.md` §8.5 forbids, and it does it to the one failure a
 * misconfigured deployment produces before any other.
 *
 * So nothing here reads a body at all. Every status this vendor produces is
 * distinguishable by the status alone, which was checked rather than assumed
 * across the eight recorded failure fixtures — and it means this function
 * cannot be broken by a vendor rewording its prose.
 *
 * ## Why a `400` throws rather than becoming a member
 *
 * `PROVIDER.md` §8.5's line: a cause is a **union member when it is a fact
 * about the world** and a **thrown defect when it is a fact about our code**. A
 * `400` from this endpoint is always the second — the recorded bodies are
 * `end should not be before start`, `Invalid format for parameter start` and
 * `invalid timeframe`, and all three describe a request only this codebase
 * could have built. Two of them are additionally unreachable by construction,
 * because `toTimeRange` refuses a reversed range and `Timeframe` is a closed
 * union.
 *
 * The asymmetry is deliberate and it is the reason to prefer the throw where a
 * status does not distinguish: **a defect reported as `range-not-available` is
 * a permanent break wearing the costume of a vendor limit**, which nobody
 * investigates because it looks like the world being unhelpful — and which a
 * retry wrapper will then retry forever against a shape that will never change.
 *
 * @param status  the response status. Non-2xx by construction: the caller
 *                checks `response.ok` first.
 * @param retryAfter  the `Retry-After` header verbatim, or `null`. Measured
 *                absent on **every one of 113 real `429`s**; handled anyway,
 *                because a vendor adding it is silent.
 * @param now  for `Retry-After`'s HTTP-date form. A parameter rather than a
 *             clock read, so this file stays pure and testable with no socket.
 */
export function mapAlpacaFailure(
  status: number,
  retryAfter: string | null,
  now: Date,
): BarsResult {
  // **`401` and `403` are one member, and the reversal trigger is written here
  // rather than in a task file, because this is where somebody will read it.**
  //
  // `PROVIDER.md` §8.1 merges missing, wrong and unentitled credentials on
  // `API_ERROR_CODES`' own rule — a caller does the same thing about all three.
  // Measured, `401` is the credential (a wrong secret and no credential at all
  // are byte-identical) and `403` is this plan's entitlement.
  //
  // **The one `403` this vendor actually produces is NOT an authorisation
  // failure**, and it is unreachable only because of a clamp: a request whose
  // `end` falls inside the withheld recent window — or in the future — answers
  // `403 subscription does not permit querying recent SIP data`, and
  // `alpacaServableEnd` moves `end` before the request is ever built. So the
  // status never arrives while the clamp stands.
  //
  // **Reversal trigger: anyone removing or widening that clamp.** On that day
  // this branch tells an operator their key is wrong when it is not, and the
  // right answer becomes `range-not-available` — the symbol exists and this
  // provider will not serve *this window*, which is §8.1's definition of that
  // member word for word. Do not make that change here without moving the
  // clamp's test with it.
  if (status === 401 || status === 403) return { outcome: "unauthorised" };

  if (status === 429) {
    // **A branch and not an assignment**, which is `PROVIDER.md` §8.6's shape
    // and `apiError()`'s idiom: under `exactOptionalPropertyTypes` an absent
    // hint has to be genuinely absent rather than present-and-`undefined`, or
    // *"the vendor did not say"* collapses into *"come back immediately"* — the
    // difference between a wrapper backing off and a wrapper hammering the
    // service that just asked it to stop.
    //
    // Against this vendor the hint is **always** absent, measured across 113
    // real `429`s in one burst. That is the vindication of §8.6 rather than a
    // disappointment, and it is the number Task 2.7.7 is sized against: its
    // backoff must work with no server-supplied delay at all.
    const hint = parseRetryAfterMs(retryAfter, now);
    return hint === undefined
      ? { outcome: "rate-limited" }
      : { outcome: "rate-limited", retryAfterMs: hint };
  }

  // The vendor is broken or something between us and it is. Retryable, and the
  // one member `PROVIDER.md` §8.1 calls *"where a defect goes to hide"* — which
  // is why the `default` below throws rather than falling through to here.
  if (status >= 500) return { outcome: "upstream-unavailable" };

  // **Everything else is ours.** A `400` is a request only this codebase could
  // have built; a `404` would mean `ALPACA_BARS_PATH` is wrong; a `405` would
  // mean the method is. None of them is a fact about the market, and none of
  // them is repaired by asking again.
  //
  // A status this vendor has never been seen to produce lands here too, and
  // that is the safe direction: an unrecognised failure that stops the process
  // loudly is recoverable, where one laundered into `upstream-unavailable` is
  // an invisible degradation in front of a retry loop.
  throw new Error(
    `Alpaca answered ${String(status)}, which is a request this codebase built ` +
      `wrongly rather than a fact about the market. Refusing to launder it into ` +
      `a BarsResult member. The body is deliberately not repeated here.`,
  );
}

/**
 * HTTP `Retry-After` as milliseconds, or `undefined` when the vendor said
 * nothing usable.
 *
 * Both documented forms, because a vendor adding the header is silent and this
 * is a two-line function either way: **delta-seconds** (`120`) and an
 * **HTTP-date** (`Wed, 21 Oct 2015 07:28:00 GMT`).
 *
 * The date form is resolved against `now` **here**, so `retryAfterMs` reaches a
 * caller as a duration — `PROVIDER.md` §8.6's decision, and its reason is not
 * tidiness: an absolute instant from the vendor has to be reconciled against
 * our clock, and skew in the unlucky direction retries *early*, against the
 * service that just asked us to stop.
 *
 * Anything unparseable, negative or non-finite is `undefined` rather than
 * clamped. There is nothing to validate against, and the member's own contract
 * makes silence safe: the hint is a **floor rather than an instruction**, so a
 * wrapper with no hint waits on its own schedule instead of not waiting at all.
 */
export function parseRetryAfterMs(
  retryAfter: string | null,
  now: Date,
): number | undefined {
  if (retryAfter === null) return undefined;
  const header = retryAfter.trim();
  if (header === "") return undefined;

  // Delta-seconds first: it is the common form, and `Date.parse` would accept
  // some bare integers as years, so trying the date form first would read
  // `Retry-After: 2020` as a date in the past rather than as 2,020 seconds.
  if (/^\d+$/.test(header)) {
    const seconds = Number(header);
    return Number.isFinite(seconds) ? seconds * 1000 : undefined;
  }

  // **`Date.parse` is far more permissive than HTTP-date and that is a trap
  // rather than a convenience**: it reads `-5` and `2020` as dates, so without
  // this guard a nonsensical or negative delta-seconds falls through to the
  // date branch and comes back as `0` — *"come back immediately"* — against the
  // service that just refused us. Every HTTP-date form contains alphabetic
  // characters (a day name, a month name, `GMT`), and no delta-seconds does,
  // which is the cheapest correct discriminator. Found by a test.
  if (!/[a-z]/i.test(header)) return undefined;

  const at = Date.parse(header);
  if (Number.isNaN(at)) return undefined;

  // A date already past means "now", not a negative wait.
  return Math.max(0, at - now.getTime());
}
