import {
  ANOMALY_BANDS,
  FEED_STATUSES,
  toTicker,
  type AnomalyBand,
  type FeedStatus,
  type Ticker,
} from "@marketpulse/shared";

import { cx } from "./cx.js";
import styles from "./App.module.css";

// The placeholder shell, rendered in the product's visual language. Still
// deliberately boring and still not the application: there is no router, no
// state library and no market data. Story 1.5 replaces this markup wholesale.
//
// What it is for is proving the token layer applies, which is why each module
// below is a labelled render check rather than a pretend dashboard. Task 1.4.3
// proved the structural half — warm ground, white module, near-black hairline,
// right-aligned tabular figures. This file now also carries the three things
// Task 1.4.4 has to demonstrate rather than assert: that price direction,
// anomaly intensity and feed status each pair their colour with a second
// channel, and that a stale feed does not look like a failure.
//
// The @marketpulse/shared import is still the load-bearing line — it is the
// only thing proving the workspace dependency resolves through the bundler as
// well as through tsc, and the two use entirely different resolvers. It now
// carries more than a ticker: `AnomalyBand` and `FeedStatus` are domain names
// the backend will use too, so they live in the shared package while the
// colours presenting them stay in market.css.

// Derived from the sign of a number at render time in real code, which is why
// it is not domain vocabulary and is not in @marketpulse/shared. A band name is
// a decision; the direction of a move is arithmetic.
type Direction = "positive" | "negative" | "unchanged";

// The class carrying the colour, and the glyph carrying the same information
// without it. **Neither is optional.** Colour is never the sole encoding here,
// so the glyph and the sign on the figure are what a reader with a red-green
// deficiency is actually using; the colour is the redundancy, not the signal.
const DIRECTION_CLASS: Readonly<Record<Direction, string | undefined>> = {
  positive: styles.positive,
  negative: styles.negative,
  unchanged: styles.unchanged,
};

const DIRECTION_GLYPH: Readonly<Record<Direction, string>> = {
  positive: "▲",
  negative: "▼",
  unchanged: "—",
};

// Not market data. The three `last` values are the same digit count made of
// glyphs with different natural widths — with tabular figures their decimal
// points line up, and with a proportional figure set the `1` row is visibly
// narrower, which is what a live column would do on every tick.
const priceRows: readonly {
  readonly ticker: Ticker;
  readonly last: string;
  readonly change: string;
  readonly direction: Direction;
}[] = [
  {
    ticker: toTicker("AAPL"),
    last: "1,111.11",
    change: "+12.40",
    direction: "positive",
  },
  {
    ticker: toTicker("NVDA"),
    last: "8,888.88",
    change: "−34.02",
    direction: "negative",
  },
  {
    ticker: toTicker("KO"),
    last: "1,088.18",
    change: "0.00",
    direction: "unchanged",
  },
];

// The band names come from the shared package; what each one *means* is the
// second channel that stops the fill being the whole message.
const BAND_MEANING: Readonly<Record<AnomalyBand, string>> = {
  normal: "Behaviour is within this security's own history",
  elevated: "Moving more than usual, within recognisable bounds",
  unusual: "Clearly outside the historical distribution",
  extreme: "Far outside it — the case an investigation starts from",
};

const BAND_CLASS: Readonly<Record<AnomalyBand, string | undefined>> = {
  normal: styles.bandNormal,
  elevated: styles.bandElevated,
  unusual: styles.bandUnusual,
  extreme: styles.bandExtreme,
};

// PRODUCT_SPEC.md §36's wording, near enough: data that is still shown, still
// correct as of a stated time, and no longer live.
const FEED_DETAIL: Readonly<Record<FeedStatus, string>> = {
  live: "Updating",
  stale: "Last update 10:41:58 — slower than expected",
  disconnected: "Displaying data through 10:42:17",
};

const FEED_CLASS: Readonly<Record<FeedStatus, string | undefined>> = {
  live: styles.feedLive,
  stale: styles.feedStale,
  disconnected: styles.feedDisconnected,
};

export function App() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.microLabel}>Application shell</p>
        <h1 className={styles.title}>MarketPulse</h1>
      </header>

      <main className={styles.modules}>
        <section className={styles.module}>
          <h2 className={styles.moduleTitle}>Price direction</h2>
          <p className={styles.prose}>
            Colour, an arrow and a sign. Cover the colour and the column still
            reads correctly, which is the requirement.
          </p>

          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Symbol</th>
                <th scope="col" className={styles.numeric}>
                  Last
                </th>
                <th scope="col" className={styles.numeric}>
                  Change
                </th>
              </tr>
            </thead>
            <tbody>
              {priceRows.map((row) => (
                <tr key={row.ticker}>
                  <td>{row.ticker}</td>
                  <td className={styles.numeric}>{row.last}</td>
                  <td
                    className={cx(
                      styles.numeric,
                      DIRECTION_CLASS[row.direction],
                    )}
                  >
                    <span aria-hidden="true" className={styles.directionGlyph}>
                      {DIRECTION_GLYPH[row.direction]}
                    </span>
                    {row.change}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={styles.module}>
          <h2 className={styles.moduleTitle}>Anomaly intensity</h2>
          <p className={styles.prose}>
            Four named bands rather than a continuous ramp, because a band can
            be labelled and a gradient cannot. The ramp is amber and not red:
            red already means price-down above, and an extreme anomaly on a
            security moving sharply upward must not read as a fall. It measures
            how unusual behaviour is — never risk, never opportunity.
          </p>

          <ul className={styles.bandList}>
            {ANOMALY_BANDS.map((band) => (
              <li className={styles.bandRow} key={band}>
                <span className={cx(styles.band, BAND_CLASS[band])}>
                  {band}
                </span>
                <span className={styles.bandMeaning}>{BAND_MEANING[band]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.module}>
          <h2 className={styles.moduleTitle}>Feed status</h2>
          <p className={styles.prose}>
            None of these three is an error. Stale and disconnected data is
            still shown and still correct as of a stated time; the marker shape
            carries the state, and only stale takes a colour.
          </p>

          <ul className={styles.feedList}>
            {FEED_STATUSES.map((status) => (
              <li
                className={cx(styles.feedRow, FEED_CLASS[status])}
                key={status}
              >
                <span aria-hidden="true" className={styles.feedMarker} />
                <span className={styles.feedLabel}>{status}</span>
                <span className={styles.feedDetail}>{FEED_DETAIL[status]}</span>
              </li>
            ))}
          </ul>

          <div className={styles.error}>
            <p className={styles.errorTitle}>Peer comparison failed</p>
            <p className={styles.errorBody}>
              What a real failure looks like, here only so the three rows above
              can be compared against it. It is a labelled block rather than a
              tinted figure, which is the whole reason one red can mean both
              &ldquo;price down&rdquo; and &ldquo;this did not work&rdquo;.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
