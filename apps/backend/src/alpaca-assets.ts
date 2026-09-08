/**
 * Alpaca's **assets** endpoint — the only thing in this vendor's API with an
 * opinion about whether a symbol is still listed (Task 2.7.8).
 *
 * This is a **different endpoint from the bars endpoint** the rest of this
 * story is about, on a different host, and adopting it was a real scope choice
 * rather than a free consequence. What it is adopted *for* is narrower than
 * Story 2.3 anticipated, and the narrowing is the task's finding rather than a
 * shortcut — see `UNIVERSE.md` §15.
 *
 * ## It reports and it never writes
 *
 * Nothing here reaches a database. `check-universe.ts` compares this against
 * the **curated file**, so the whole command is structurally unable to change a
 * row — which is Task 2.1.7's shape for exactly this kind of question: the
 * endpoint says *whether*, and a person decides *what to do*, in
 * `UNIVERSE.md` §12.8's editing step.
 *
 * That is not fastidiousness. `load-universe.ts` writes `status` from the file
 * on **every deploy**, so a status written here would be silently reverted by
 * the next merge — produced rather than argued, and recorded in
 * `UNIVERSE.md` §15.3.
 *
 * ## It costs nothing that bar fetching needs
 *
 * The assets endpoint lives on the **trading** API, which Task 2.7.7 measured
 * as a **separate rate-limit budget** from the data API: with the data bucket
 * drained to `429`, `paper-api` answered `200` at `x-ratelimit-remaining: 199`
 * (`ALPACA.md` §6b). So this competes with nothing Story 2.8 does, and the
 * whole US-equity universe is **one request** — measured at 14,277 active rows
 * in ~2 s — rather than a lookup per symbol.
 *
 * **Read that as removing an objection rather than as a reason to adopt it.**
 * The price being zero is not an argument; `PROVIDER.md` §8.7 says as much, and
 * a decision taken on a cost that turned out not to exist is a decision taken
 * on the wrong axis.
 *
 * ## No retry, and that is the decision rather than an omission
 *
 * `withRetry` is typed to `MarketDataProvider`, so it wraps bar fetching and
 * nothing else, and this deliberately does not reach for an equivalent. This is
 * a command **a person runs and reads**, not a scheduled or deployed path: a
 * plain failure in front of somebody who can re-run it is the right answer, and
 * resilience machinery around it would be scaffolding ahead of the iteration
 * that needs it. The reversal trigger is this running unattended.
 *
 * ## It throws rather than returning a union
 *
 * `BarsResult`'s eight members exist because `PROVIDER.md` §8 needs a *caller*
 * to branch on the difference between a rate limit and a bad key. This has one
 * caller, which prints, so every failure has the same consequence: say what
 * went wrong and exit non-zero. A union here would be a taxonomy with no reader.
 */

import type { AlpacaConfig } from "./config.js";

/**
 * The trading API, which is **not** `ALPACA_DATA_HOST`.
 *
 * `paper-api` and not `api`: the credential this product holds is a free paper
 * account's, and the assets catalogue is identical on both. Reading it from the
 * paper host is also what makes it structurally impossible for this read-only
 * command to reach a live trading account.
 */
export const ALPACA_TRADING_HOST = "https://paper-api.alpaca.markets";

/** Where the asset catalogue lives. */
export const ALPACA_ASSETS_PATH = "/v2/assets";

/**
 * How long the catalogue read may take.
 *
 * An order of magnitude above `DEFAULT_BARS_DEADLINE_MS` (3 s), deliberately
 * and with the reason beside it: this transfers the **whole** US-equity
 * catalogue in one response — 14,277 active rows measured at ~2 s, 19,188
 * inactive ones — where a bars request transfers one symbol's window. A bar
 * deadline applied here would refuse a healthy call on a slow connection.
 */
export const ASSETS_TIMEOUT_MS = 30_000;

/**
 * One row of the catalogue, narrowed to the fields this product reads.
 *
 * The vendor sends fifteen; `marginable`, `shortable`, `fractionable`,
 * `borrow_status`, the three margin requirements and `attributes` are all facts
 * about **trading through Alpaca**, which this product does not do — so they
 * are not read, per `Bar`'s own rule that a field exists when something reads
 * it.
 */
export interface AlpacaAsset {
  /**
   * The vendor's per-asset identifier.
   *
   * **It does NOT survive a ticker rename**, which is the measurement that
   * decided Story 2.7's open decision 5 and the opposite of what that decision
   * assumed. Six real renames were checked and the id differs in every one —
   * `UNIVERSE.md` §15.5. It is read here only to tell two rows apart within a
   * single response, never stored, and never treated as an identity across
   * time.
   */
  readonly id: string;
  readonly symbol: string;
  readonly name: string;
  readonly exchange: string;
  /**
   * `active` or `inactive`, and **`inactive` is not `delisted`** — it is a fact
   * about what Alpaca will trade rather than about what the market lists. See
   * `UNIVERSE.md` §15.2, which measures the difference at 8%.
   */
  readonly status: string;
  readonly tradable: boolean;
}

/** Which half of the catalogue to read. */
export type AlpacaAssetStatus = "active" | "inactive";

/**
 * Read one half of the US-equity asset catalogue.
 *
 * `asset_class=us_equity` because that is the universe this product tracks; the
 * endpoint also carries crypto and options, both of which `PRODUCT_SPEC.md` §37
 * excludes from V1.
 *
 * `baseUrl` exists for the tests and for nothing else, exactly as it does on
 * `createAlpacaProvider` — it is what lets the transport be driven against a
 * local server without a `fetch` stub, which is the difference between testing
 * this file and testing a mock of it.
 */
export async function fetchAlpacaAssets(
  credential: AlpacaConfig,
  status: AlpacaAssetStatus,
  options: { readonly baseUrl?: string; readonly signal?: AbortSignal } = {},
): Promise<readonly AlpacaAsset[]> {
  const baseUrl = options.baseUrl ?? ALPACA_TRADING_HOST;
  const url = `${baseUrl}${ALPACA_ASSETS_PATH}?status=${status}&asset_class=us_equity`;

  const deadline = AbortSignal.timeout(ASSETS_TIMEOUT_MS);
  const signal =
    options.signal === undefined
      ? deadline
      : AbortSignal.any([deadline, options.signal]);

  const response = await fetch(url, {
    headers: {
      "APCA-API-KEY-ID": credential.keyId,
      "APCA-API-SECRET-KEY": credential.secretKey,
    },
    signal,
  });

  if (!response.ok) {
    // **The body is deliberately not read into this message.** Task 2.7.3
    // measured that a bad key answers with an nginx HTML page rather than
    // JSON, so a client that assumed a shape here would turn a clear
    // `401` into a laundered parse failure. The status is the fact.
    throw new Error(
      `Alpaca's assets endpoint answered ${String(response.status)} ${response.statusText}. ` +
        `The status is the fact worth having: 401 or 403 is the credential, 429 is the ` +
        `trading API's own rate limit, 5xx is the vendor.`,
    );
  }

  const body: unknown = await response.json();

  if (!Array.isArray(body)) {
    throw new Error(
      "Alpaca's assets endpoint answered 200 with something that is not an array. " +
        "That is a change to the vendor's contract rather than a failure of this request.",
    );
  }

  return body.filter(isAlpacaAsset);
}

/**
 * Is this parsed JSON an {@link AlpacaAsset}?
 *
 * It **filters** rather than refusing the whole response, which is the one
 * place this module is deliberately lenient and the reason is the catalogue's
 * size: one malformed row out of 14,277 should not cost a report that is
 * otherwise entirely correct. That is safe precisely because every consumer of
 * this data is a *report a person reads* — a dropped row understates what we
 * know, which is the direction that produces a missing finding rather than a
 * wrong one.
 */
function isAlpacaAsset(value: unknown): value is AlpacaAsset {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.symbol === "string" &&
    typeof row.name === "string" &&
    typeof row.exchange === "string" &&
    typeof row.status === "string" &&
    typeof row.tradable === "boolean"
  );
}
