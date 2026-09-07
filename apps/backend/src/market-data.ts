/**
 * Turning `MARKET_DATA_PROVIDER` into a provider, or into nothing at all.
 *
 * One function, and the whole of it is Task 2.6.6's last open decision.
 *
 * ## `none` is ABSENCE, not a null-object implementation
 *
 * The two are not equivalent and the first is wrong, for a reason that is about
 * the taxonomy rather than about taste. A null-object provider has to return a
 * {@link BarsResult}, and **there is no member meaning "no provider is
 * configured"** — that is a fact about our own deployment rather than a fact
 * about the world, so it fails `PROVIDER.md` §8.5's own test for membership:
 *
 * > A cause is a union member when it is a fact about the world. It is a thrown
 * > defect when it is a fact about our code.
 *
 * The two ways out of that are both worse than absence. Answering
 * `upstream-unavailable` is precisely the laundering §8.5 forbids — a
 * configuration fault wearing a transient fault's costume, which a retry
 * wrapper would then dutifully retry, forever, against a vendor nobody
 * configured. And a null object that throws is *"a method left throwing"*,
 * which Task 2.6.6's own done-when list forbids in as many words.
 *
 * So this returns `MarketDataProvider | undefined`, and the answer is pushed to
 * the layer that can give a correct one. **The defined behaviour for a caller
 * with no provider is a 503 carrying `SERVICE_UNAVAILABLE`** — the code
 * `database.ts` already reserves for exactly this shape, added by the story
 * that can produce it, per `API_ERROR_CODES`' rule that a member arrives with a
 * failure that can be produced. Owner: Story 2.9, which writes the first route
 * that needs data. A 503 is right and a 500 is not: this server has not failed,
 * a dependency it needs is not there.
 *
 * ## The consequence for Task 2.6.7, which renders this
 *
 * Under `none` **there is no provider object to ask**, so
 * `MarketDataProvider.id` cannot be the source of *"which provider is
 * configured"*. The configuration value is. That is why this module exports the
 * selection alongside the provider rather than expecting a renderer to
 * reconstruct it from a possibly-absent object.
 */

import type { Config, MarketDataProviderSelection } from "./config.js";
import { createFixtureProvider } from "./fixture-provider.js";
import type { MarketDataProvider } from "./market-data-provider.js";

/**
 * The provider the configuration selects, or `undefined` when it selects none.
 *
 * The `switch` is exhaustive against {@link MarketDataProviderSelection}, which
 * is derived from `packages/shared`'s `PROVIDER_IDS` — so **Story 2.7 adding
 * its own provider id fails the build here**, naming this function, rather than
 * shipping a configuration value the operator can set and nothing can honour.
 * That is the same mechanism Task 2.6.5's ninth-member note describes, arriving
 * one layer down.
 */
export function createMarketDataProvider(
  selection: MarketDataProviderSelection,
): MarketDataProvider | undefined {
  switch (selection) {
    case "none":
      return undefined;
    case "fixture":
      return createFixtureProvider();
    default: {
      const unhandled: never = selection satisfies never;
      return unhandled;
    }
  }
}

/**
 * What the rest of the application is handed: the selection, and the provider
 * it produced.
 *
 * Both, because they answer different questions and only one of them survives
 * `none`. A renderer asks *which provider is configured* and gets an answer
 * either way; a route asks *can I serve data* and gets `undefined` when it
 * cannot.
 */
export interface MarketData {
  readonly selection: MarketDataProviderSelection;
  readonly provider: MarketDataProvider | undefined;
}

/** {@link createMarketDataProvider}, read straight off the configuration. */
export function resolveMarketData(config: Config): MarketData {
  return {
    selection: config.marketDataProvider,
    provider: createMarketDataProvider(config.marketDataProvider),
  };
}
