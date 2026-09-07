/**
 * The first real market-data client in this product (Task 2.7.3).
 *
 * ~~One symbol, one timeframe, **one page**, and the happy path.~~ **Amended
 * 2026-09-07 by Task 2.7.6: two of the three gaps are closed.** Task 2.7.5 made
 * the walk paginated and this task made every failure a `BarsResult` member
 * rather than a throw. **Retry is still Task 2.7.7's and is deliberately still
 * absent** — see below, because it is the one of the three that must not be
 * added here at all.
 *
 * ## What still fails loudly, and why that is the whole design
 *
 * A retry inside the transport lies about the caller's deadline, a swallowed
 * page lies about the data, and a laundered parse failure lies about whose
 * fault it is. Two of those are now closed by *refusing* rather than by
 * handling: a token loop throws rather than returning a short series, and a
 * `400` or an unparseable body throws rather than becoming
 * `upstream-unavailable`. `PROVIDER.md` §8.5's line — a union member is a fact
 * about the world, a throw is a fact about our code — is what decides which
 * failures got members here and which did not.
 *
 * ## What is deliberately NOT here
 *
 * `market-data-provider.ts`'s module comment says all three and this is the
 * first implementation that could break any of them:
 *
 *  - **One attempt.** No retry and no backoff. `PROVIDER.md` §8.8 puts retry in
 *    a wrapper *composed around* a provider, because a retry buried here would
 *    silently turn a caller's three seconds into nine and make *"how many times
 *    did we ask the vendor"* a question with a different answer per vendor.
 *  - **No cache.** Story 2.8 owns storage. A provider that memoised would
 *    behave differently on the second call than on the first, which is exactly
 *    what stops a fixture-backed test meaning anything.
 *  - **No pacing.** Cross-request pacing across a hundred symbols is Story
 *    2.8's backfill. Conflating the two is how a backfill re-fetches
 *    ninety-nine symbols that answered perfectly because one was rate-limited.
 *
 * ## And it is thin on purpose
 *
 * Every decision about the vendor's *shape* — which parameters, which field is
 * which, the inclusive `end`, the dropped fields — is in `alpaca-mapping.ts`,
 * pure and testable with no socket. What is left here is the request, the
 * signals and the status code. That split is the task's one structural
 * decision, and it is what keeps `pnpm test` offline.
 *
 * ## No HTTP dependency, and that was the expected answer
 *
 * Node 24 ships `fetch`. This repository has already declined a library for one
 * documented request once, at a measured cost: `@azure/identity`, 32 packages
 * and 46 MB, for one HTTP GET with one header (Task 2.1.6). The same reasoning
 * applies and the request here is smaller.
 */

import {
  ALPACA_BARS_PATH,
  ALPACA_DATA_HOST,
  ALPACA_FEED,
  ALPACA_MAX_LIMIT,
  ALPACA_PROVIDER_ID,
  alpacaServableEnd,
  mapAlpacaFailure,
  parseAlpacaBarsBody,
  toAlpacaQuery,
  toBarSeriesFromAlpacaBars,
  toBarsFromAlpacaPage,
} from "./alpaca-mapping.js";
import type { Bar } from "@marketpulse/shared";

import type { AlpacaConfig } from "./config.js";
import {
  type BarsRequest,
  type BarsRequestOptions,
  type BarsResult,
  DEFAULT_BARS_DEADLINE_MS,
  type MarketDataProvider,
} from "./market-data-provider.js";

/**
 * A provider that reads Alpaca's historical bars endpoint.
 *
 * It takes the credential as an **argument**, from `config.alpaca`, and reads
 * `process.env` nowhere — Task 2.7.2 gave the key a home and this is a
 * consumer of it. The parameter is `AlpacaConfig` rather than two strings so
 * that the pair cannot be swapped at a call site, and it is non-optional so a
 * client constructed with no credential is a **compile error** rather than a
 * request signed with `""`.
 *
 * `baseUrl` exists for the tests and for nothing else: it is what lets the
 * transport be driven against a local server without a `fetch` stub, which is
 * the difference between testing this file and testing a mock of it.
 */
export function createAlpacaProvider(
  credential: AlpacaConfig,
  options: { readonly baseUrl?: string } = {},
): MarketDataProvider {
  const baseUrl = options.baseUrl ?? ALPACA_DATA_HOST;

  return {
    id: ALPACA_PROVIDER_ID,
    feed: ALPACA_FEED,
    fetchBars: (request, requestOptions) =>
      fetchBars(credential, baseUrl, request, requestOptions),
  };
}

async function fetchBars(
  credential: AlpacaConfig,
  baseUrl: string,
  request: BarsRequest,
  options: BarsRequestOptions = {},
): Promise<BarsResult> {
  const deadlineMs = options.deadlineMs ?? DEFAULT_BARS_DEADLINE_MS;

  // Two signals, composed rather than chosen between, and **which one fired is
  // read off the signals rather than off the rejection** — `api-client.ts`'s
  // arrangement, reused whole for its stated reason: a `DOMException` name is a
  // string comparison against a value from another realm, where these two flags
  // are facts this function owns. They produce *different members*, so getting
  // it wrong is not cosmetic.
  const deadline = AbortSignal.timeout(deadlineMs);
  const signal =
    options.signal === undefined
      ? deadline
      : AbortSignal.any([deadline, options.signal]);

  // A caller that tore down before the call was even made. Checked first,
  // because answering it with data is the "resolved after unmount" bug Task
  // 1.12.3 closed at the one place it can be closed — and because it is the one
  // branch that must not cost a metered request.
  if (signal.aborted) {
    return classifyAbort(deadline, options.signal, deadlineMs);
  }

  /** See the note in the `catch` below: a call expression is never narrowed. */
  const hasAborted = (): boolean => signal.aborted;

  // **One instant for the whole fetch**, stamped before the first request and
  // used for two things that must not disagree: the provenance stamp, and the
  // clamp below. Reading the clock per page would let a slow walk clamp against
  // a moving target, so page three could be asked for a window page one was
  // refused — a bug that only appears under load.
  const startedAt = new Date();
  const retrievedAt = startedAt.toISOString();

  // What this plan will actually serve. On any historical window this is the
  // requested end unchanged; on one reaching into the withheld recent window it
  // is earlier, and `covered` says so.
  const servableEnd = alpacaServableEnd(request.range, startedAt);

  // **A window entirely inside the withheld window costs no request at all.**
  // There is nothing the vendor could answer, so asking is a metered request
  // guaranteed to be refused — and Story 2.8's backfill produces exactly this
  // shape on a symbol it is already caught up on. An empty series is the honest
  // answer and is a SUCCESS per `PROVIDER.md` §8.2; `toBarSeries` makes
  // `covered` null exactly when there are no bars, so this reports "we reached
  // nothing" rather than claiming a window.
  if (servableEnd <= request.range.start) {
    return {
      outcome: "ok",
      series: toBarSeriesFromAlpacaBars(request, [], retrievedAt, servableEnd),
    };
  }

  const bars: Bar[] = [];
  let pageToken: string | undefined;

  // **A bound on pages, derived from the range rather than picked.** A
  // `next_page_token` that never becomes null is an infinite loop wearing the
  // costume of a slow request, and it is the one failure here that burns a rate
  // limit while producing nothing.
  const maxPages = maxPagesFor(request, servableEnd);

  for (let page = 1; ; page += 1) {
    if (page > maxPages) {
      // **A throw and not a member.** `PROVIDER.md` §8.5's line: this is either
      // the vendor behaving impossibly or our page arithmetic being wrong, and
      // both are defects rather than facts about the world. Returning the bars
      // collected so far would be the exact lie this whole task exists to
      // prevent — a well-formed, ascending, correctly provenanced series that
      // is missing data nobody can detect.
      throw new Error(
        `Alpaca kept returning a next_page_token after ${String(maxPages)} ` +
          `pages for ${request.symbol}, which is more than the requested range ` +
          `can contain at ${String(ALPACA_MAX_LIMIT)} bars a page. Refusing to ` +
          `loop, and refusing to return the ${String(bars.length)} bars ` +
          `collected so far as if they were the whole answer.`,
      );
    }

    const url = new URL(ALPACA_BARS_PATH, baseUrl);
    const query = toAlpacaQuery(request, {
      end: servableEnd,
      ...(pageToken === undefined ? {} : { pageToken }),
    });
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        signal,
        headers: {
          // The two headers this vendor authenticates with. **Only one of them
          // is a secret** — `config.ts` records why the pair is two variables
          // rather than one packed string, and the key id travels in the clear
          // here by the vendor's own design.
          "APCA-API-KEY-ID": credential.keyId,
          "APCA-API-SECRET-KEY": credential.secretKey,
          accept: "application/json",
        },
      });
    } catch (error) {
      // A rejected `fetch` is either one of our two signals or a transport
      // failure. The signals are read off the signals, per above; anything else
      // is Task 2.7.6's to map and is **rethrown** rather than guessed at,
      // because guessing is the laundering `PROVIDER.md` §8.5 forbids and a
      // wrong guess would put a permanent fault in front of a retry wrapper.
      //
      // **An abort mid-walk discards every page already collected**, which is
      // the decision rather than an accident. A partial `ok` with `covered`
      // clipped to what arrived is truthful in one sense and is
      // *indistinguishable from "the vendor had nothing after this point"* —
      // precisely the distinction Story 2.8's backfill has to make, since one
      // means resume and the other means done. A member that is usually right
      // and occasionally silently wrong is worse than one that is blunt. The
      // reversal trigger is 2.8 wanting resumable partial fetches, at which
      // point the shape is a NEW outcome member carrying a resume point rather
      // than a widened `ok`.
      //
      // **`hasAborted()` and not `signal.aborted`, and the indirection is
      // load-bearing.** TypeScript narrows `signal.aborted` to `false` at the
      // early return above and does not widen it again across the `await`, so
      // the direct read is `no-unnecessary-condition` at error — *"value is
      // always falsy"*. It is not always falsy: it is exactly the case an abort
      // during the request produces. `CLAUDE.md` records this from Task 1.12.3,
      // along with the fix — **a call expression is never narrowed** — which
      // closes it with no assertion and no disabled rule.
      if (hasAborted()) {
        return classifyAbort(deadline, options.signal, deadlineMs);
      }

      // **A `fetch` that rejects for any other reason never reached the vendor,
      // and that is `upstream-unavailable`.** Measured whole rather than by
      // message (Task 2.1.6's discipline, applied to a second vendor): a
      // refused connection, a host that does not resolve and an unroutable
      // address all reject with a `TypeError` whose message is the constant
      // string `fetch failed`, carrying the real cause — `ECONNREFUSED`,
      // `ENOTFOUND`, a connect timeout — underneath as `cause`. The `cause` is
      // deliberately **not** read: it is undici's shape rather than a contract,
      // and every value it takes maps to this one member anyway.
      //
      // An unroutable address does NOT arrive here, which is worth knowing
      // before anyone tries to produce it: it hangs, so our own deadline fires
      // first and the branch above answers `timeout`. That is correct —
      // *"we gave up after N ms"* admits raising N where *"they are down"* does
      // not — and it is why Task 2.1.7 used `203.0.113.7` to produce a timeout.
      //
      // Anything that is not a `TypeError` is rethrown, because `fetch` has no
      // other documented rejection and an undocumented one is a defect rather
      // than a fact about the world. `upstream-unavailable` is the member
      // `PROVIDER.md` §8.1 calls *"where a defect goes to hide"*, so the
      // `instanceof` is a gate rather than a formality.
      if (error instanceof TypeError) {
        return { outcome: "upstream-unavailable" };
      }
      throw error;
    }

    if (!response.ok) {
      // **Task 2.7.6's mapping, and it reads the STATUS and never the body.**
      // Every failure this vendor produces was produced against the live API
      // and recorded verbatim under `fixtures/alpaca/`; `mapAlpacaFailure`
      // carries the argument for each, including the one a documentation-based
      // mapping gets wrong — a bad key answers `401` with an **HTML** body from
      // nginx, so a client that parses an error body turns the clearest auth
      // failure there is into a laundered parse error.
      //
      // The body is still never read into anything. Task 2.7.2's leak list
      // names an interpolated vendor response as a way this credential could
      // escape, and a `400`'s message is our own request echoed back.
      //
      // **A failure on page three discards pages one and two**, exactly as an
      // abort mid-walk does and for the same recorded reason: a partial `ok`
      // with `covered` clipped to what arrived is indistinguishable from
      // *"the vendor had nothing after this point"*, which is the one
      // distinction Story 2.8's backfill has to make.
      return mapAlpacaFailure(
        response.status,
        response.headers.get("retry-after"),
        new Date(),
      );
    }

    const body: unknown = await response.json();
    const parsed = parseAlpacaBarsBody(body);
    bars.push(...toBarsFromAlpacaPage(parsed, request.symbol));

    // **On the last page this field is PRESENT and `null`** rather than absent,
    // which `parseAlpacaBarsBody` normalises — so this reads a plain `null`, and
    // a loop testing for the key's absence, which would never terminate, is not
    // expressible here.
    if (parsed.next_page_token === null) break;
    pageToken = parsed.next_page_token;
  }

  return {
    outcome: "ok",
    series: toBarSeriesFromAlpacaBars(request, bars, retrievedAt, servableEnd),
  };
}

/**
 * The most pages the requested range could possibly need.
 *
 * **A provable upper bound rather than a modelled one, and that is the
 * decision.** The obvious approach is the trading calendar — sum `minuteBars`
 * over the sessions the range covers — and it is tighter and it can be
 * *wrong*: a window spanning a night picks up extended-hours prints the
 * session bounds do not contain, measured by this task at **2.35× the
 * regular-hours count** over a month. A bound a correct answer can exceed is a
 * bound that throws on good data.
 *
 * Wall-clock intervals inside the range cannot be exceeded by any answer: this
 * vendor emits at most one bar per interval per symbol, so the count is a hard
 * ceiling whatever the session structure, the feed or the extended hours. It
 * needs no calendar and cannot false-positive.
 *
 * The `+ 1` and the floor of 2 are slack for a boundary case rather than
 * superstition — a walk ending exactly on a page boundary may be handed a token
 * for an empty final page, and a bound that throws on a *correct* answer is the
 * failure this function exists to avoid being.
 */
function maxPagesFor(request: BarsRequest, servableEnd: Date): number {
  const spanMs = servableEnd.getTime() - request.range.start.getTime();
  const intervalMs = request.timeframe === "1m" ? 60_000 : 24 * 60 * 60_000;
  const upperBoundBars = Math.ceil(spanMs / intervalMs);
  return Math.max(2, Math.ceil(upperBoundBars / ALPACA_MAX_LIMIT) + 1);
}

/**
 * Which of the two signals fired.
 *
 * `fixture-provider.ts`'s function and deliberately the same one: the deadline
 * is checked first, so that when both have fired the answer describes the
 * request rather than the caller. `aborted` carries nothing at all, because a
 * caller's own teardown is not a fact about the world; `timeout` carries the
 * number, because a caller that passed no `deadlineMs` does not otherwise know
 * which one it was measured against.
 */
function classifyAbort(
  deadline: AbortSignal,
  callerSignal: AbortSignal | undefined,
  deadlineMs: number,
): BarsResult {
  if (deadline.aborted) return { outcome: "timeout", deadlineMs };
  if (callerSignal?.aborted === true) return { outcome: "aborted" };

  // Unreachable: this is only called when one of the two composed signals has
  // aborted. `upstream-unavailable` rather than a throw would be laundering a
  // defect, which the interface's own comment forbids.
  throw new Error(
    "fetchBars stopped without either its deadline or the caller's signal " +
      "having aborted, which cannot happen.",
  );
}
