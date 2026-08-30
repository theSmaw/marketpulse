/**
 * A validated US equity ticker.
 *
 * Named `Ticker` rather than `Symbol` — which is what the product spec calls it
 * — purely to avoid shadowing the global `Symbol`. The domain word is "symbol";
 * the type name is `Ticker`.
 *
 * It is a branded string: structurally a `string`, but not assignable *from*
 * one, so a raw string cannot reach a function expecting a validated ticker
 * without passing through {@link toTicker}. The brand exists only in the type
 * system and is erased at runtime.
 */
declare const brand: unique symbol;

export type Ticker = string & { readonly [brand]: "Ticker" };

/**
 * One to five uppercase letters, optionally followed by a share-class suffix
 * (`BRK.B`). This is the shape Alpaca uses for US equities. It is deliberately
 * a format check and nothing more: whether a ticker is *listed* is a question
 * for the security universe (Epic 2), not for a string predicate.
 */
const TICKER_PATTERN = /^[A-Z]{1,5}(\.[A-Z])?$/;

export function isTicker(value: string): value is Ticker {
  return TICKER_PATTERN.test(value);
}

/**
 * Narrows a string to a {@link Ticker}, throwing if it is not one.
 *
 * Throwing is right at this boundary: a malformed ticker is a programming or
 * ingestion error, not a market condition the UI should degrade around. Call
 * sites handling untrusted input should test with {@link isTicker} first.
 */
export function toTicker(value: string): Ticker {
  if (!isTicker(value)) {
    throw new TypeError(`Not a valid US equity ticker: ${JSON.stringify(value)}`);
  }
  return value;
}