import { toTicker, type Ticker } from "@marketpulse/shared";

// The placeholder shell. Deliberately boring: a heading naming the product and
// an empty region for what Stories 1.4 and 1.5 and Epic 2 will put there. No
// router, no styling system, no state library — introducing one here would
// make this story about that decision instead of about React rendering at all.
//
// The @marketpulse/shared import is inherited from the entry file this
// replaced, and is still the load-bearing line: it is the only thing proving
// the workspace dependency resolves through the bundler as well as through
// tsc, and the two use entirely different resolvers.
const ticker: Ticker = toTicker("AAPL");

export function App() {
  return (
    <main>
      <h1>MarketPulse</h1>
      <p>
        Application shell — no market data yet. Shared package resolves through
        the bundler: {ticker}
      </p>
    </main>
  );
}
