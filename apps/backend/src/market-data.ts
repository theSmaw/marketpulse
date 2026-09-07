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

import { createAlpacaProvider } from "./alpaca-provider.js";
import type {
  AlpacaConfig,
  Config,
  MarketDataProviderSelection,
} from "./config.js";
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
 *
 * **It fired, and it is recorded rather than quietly satisfied (Task 2.7.3).**
 * Adding `alpaca` to `PROVIDER_IDS` failed the build in this function before a
 * line of it had been edited, which is the check working exactly as written.
 * The sentence above stays in the present tense because it describes what will
 * happen to the *next* member too.
 */
export function createMarketDataProvider(
  selection: MarketDataProviderSelection,
  credentials: MarketDataCredentials = {},
): MarketDataProvider | undefined {
  switch (selection) {
    case "none":
      return undefined;
    case "fixture":
      return createFixtureProvider();
    case "alpaca": {
      // **The credential is required and its absence is a THROW, which is a
      // narrower claim than it looks** (Task 2.7.3). It is not a runtime check
      // standing in for a missing configuration check: `config.ts` already
      // refuses at startup when `MARKET_DATA_PROVIDER=alpaca` and the pair is
      // not set, so reaching this line means the configuration said one thing
      // and the object handed here says another. That is a fact about our code
      // rather than about the world, which is `PROVIDER.md` §8.5's own line for
      // when a throw is correct — and the alternative, returning `undefined`,
      // would report *"no provider is configured"* about a deployment that
      // configured one, which is the laundering this module's comment forbids.
      if (credentials.alpaca === undefined) {
        throw new Error(
          "MARKET_DATA_PROVIDER is alpaca but no Alpaca credential was passed " +
            "to createMarketDataProvider. config.ts refuses that combination at " +
            "startup, so this is a caller that read the selection without the " +
            "credential beside it — use resolveMarketData(config).",
        );
      }
      return createAlpacaProvider(credentials.alpaca);
    }
    default: {
      const unhandled: never = selection satisfies never;
      return unhandled;
    }
  }
}

/**
 * The credentials a selection might need, keyed by the provider that needs one.
 *
 * An object rather than a positional argument because the next provider needs a
 * different credential and a second positional parameter is how a call site
 * ends up passing the wrong one. Every key is optional: `none` and `fixture`
 * need nothing, which is why this whole parameter defaults to `{}`.
 */
export interface MarketDataCredentials {
  readonly alpaca?: AlpacaConfig;
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
    // The credential travels with the selection, from one place, which is what
    // makes the throw above unreachable from this path — `config.ts` has
    // already refused the incoherent pair.
    provider: createMarketDataProvider(config.marketDataProvider, {
      ...(config.alpaca === undefined ? {} : { alpaca: config.alpaca }),
    }),
  };
}
