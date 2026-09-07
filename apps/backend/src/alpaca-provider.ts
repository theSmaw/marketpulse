/**
 * The first real market-data client in this product (Task 2.7.3).
 *
 * One symbol, one timeframe, **one page**, and the happy path. Pagination is
 * Task 2.7.5's, the error taxonomy is Task 2.7.6's and retry is Task 2.7.7's —
 * and this file **fails loudly on everything it does not handle**, which is
 * what makes splitting a client across four tasks honest rather than dangerous.
 *
 * ## Why the happy path is the half that ships first
 *
 * The other three fail *silently*: a retry inside the transport lies about the
 * caller's deadline, a swallowed page lies about the data, and a laundered
 * parse failure lies about whose fault it is. Only this one fails loudly, so it
 * is the one that can stand alone.
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
  ALPACA_PROVIDER_ID,
  toAlpacaQuery,
  toBarSeriesFromAlpaca,
} from "./alpaca-mapping.js";
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

  const url = new URL(ALPACA_BARS_PATH, baseUrl);
  for (const [key, value] of Object.entries(toAlpacaQuery(request))) {
    url.searchParams.set(key, value);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      signal,
      headers: {
        // The two headers this vendor authenticates with. **Only one of them is
        // a secret** — `config.ts` records why the pair is two variables rather
        // than one packed string, and the key id travels in the clear here by
        // the vendor's own design.
        "APCA-API-KEY-ID": credential.keyId,
        "APCA-API-SECRET-KEY": credential.secretKey,
        accept: "application/json",
      },
    });
  } catch (error) {
    // A rejected `fetch` is either one of our two signals or a transport
    // failure. The signals are read off the signals, per above; anything else
    // is Task 2.7.6's to map and is **rethrown** here rather than guessed at,
    // because guessing is exactly the laundering `PROVIDER.md` §8.5 forbids and
    // a wrong guess would put a permanent fault in front of a retry wrapper.
    //
    // **`hasAborted()` and not `signal.aborted`, and the indirection is
    // load-bearing.** TypeScript narrows `signal.aborted` to `false` at the
    // early return above and does not widen it again across the `await`, so the
    // direct read is `no-unnecessary-condition` at error — *"value is always
    // falsy"*. It is not always falsy: it is exactly the case an abort during
    // the request produces. `CLAUDE.md` records this from Task 1.12.3, along
    // with the fix — **a call expression is never narrowed** — which closes it
    // with no assertion and no disabled rule.
    if (hasAborted()) {
      return classifyAbort(deadline, options.signal, deadlineMs);
    }
    throw error;
  }

  if (!response.ok) {
    // **Task 2.7.6's, and it throws rather than mapping.** Every status this
    // vendor produces was recorded verbatim in `ALPACA.md` §9 and mapping them
    // is a task with its own measurements — including the one a documentation
    // -based mapping gets wrong, that a bad key answers with an **HTML** body
    // from nginx rather than JSON, so a client assuming JSON turns a clear
    // `unauthorised` into a laundered parse failure.
    //
    // The body is deliberately NOT read into this message. It may be an HTML
    // error page, and more to the point Task 2.7.2's leak list names a logged
    // request path as the most plausible way this credential escapes: the URL
    // carries no credential, but a habit of interpolating vendor bytes into
    // messages is the habit that eventually does.
    throw new Error(
      `Alpaca answered ${String(response.status)} ${response.statusText} for ` +
        `${request.symbol}. Task 2.7.6 maps this vendor's failures onto ` +
        `BarsResult; until it does, this client refuses to guess which member ` +
        `a status means rather than laundering it into one.`,
    );
  }

  const body: unknown = await response.json();

  // `retrievedAt` is stamped HERE, at the fetch, and passed in — never read
  // inside the mapping, which is what keeps that module pure, and never
  // re-stamped on a read path, which is `PROVIDER.md` §4.3's rule and the trap
  // Task 2.3.5 already fell into once.
  const retrievedAt = new Date().toISOString();

  return {
    outcome: "ok",
    series: toBarSeriesFromAlpaca(request, body, retrievedAt),
  };
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
