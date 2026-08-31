import {
  ANOMALY_BANDS,
  FEED_STATUSES,
  toTicker,
  type AnomalyBand,
  type FeedStatus,
} from "@marketpulse/shared";

import { AnomalyBadge } from "./components/AnomalyBadge/AnomalyBadge.js";
import { FeedIndicator } from "./components/FeedIndicator/FeedIndicator.js";
import { SecurityRow } from "./components/SecurityRow/SecurityRow.js";
import rowStyles from "./components/SecurityRow/SecurityRow.module.css";
import styles from "./App.module.css";

// The placeholder shell, rendered in the product's visual language. Still
// deliberately boring and still not the application: there is no router, no
// state library and no market data. Story 1.5 replaces this markup wholesale.
//
// What changed in Task 1.4.5 is where the markup comes from. The three labelled
// render checks below used to be inline JSX with their own classes; they are
// now built from the components in `src/components/`, which is what makes this
// file the answer to "does the workshop show the same thing the application
// does?" A component that renders correctly in Storybook and wrongly here has a
// cascade problem, and that is a failure worth being able to see.
//
// The @marketpulse/shared import is still the load-bearing line — it is the
// only thing proving the workspace dependency resolves through the bundler as
// well as through tsc, and the two use entirely different resolvers.

const BAND_MEANING: Readonly<Record<AnomalyBand, string>> = {
  normal: "Behaviour is within this security's own history",
  elevated: "Moving more than usual, within recognisable bounds",
  unusual: "Clearly outside the historical distribution",
  extreme: "Far outside it — the case an investigation starts from",
};

// PRODUCT_SPEC.md §36's wording, near enough: data that is still shown, still
// correct as of a stated time, and no longer live.
const FEED_DETAIL: Readonly<Record<FeedStatus, string>> = {
  live: "Updating",
  stale: "Last update 10:41:58 — slower than expected",
  disconnected: "Displaying data through 10:42:17",
};

// Not market data. The three `last` values are the same digit count made of
// glyphs with different natural widths — with tabular figures their decimal
// points line up, and with a proportional figure set the `1` row is visibly
// narrower, which is what a live column would do on every tick.
const rows = [
  {
    ticker: toTicker("AAPL"),
    last: "1,111.11",
    change: "+12.40",
    direction: "positive",
    band: "elevated",
    status: "live",
  },
  {
    ticker: toTicker("NVDA"),
    last: "8,888.88",
    change: "−34.02",
    direction: "negative",
    band: "extreme",
    status: "stale",
  },
  {
    ticker: toTicker("KO"),
    last: "1,088.18",
    change: "0.00",
    direction: "unchanged",
    band: "normal",
    status: "disconnected",
  },
] as const;

export function App() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.microLabel}>Application shell</p>
        <h1 className={styles.title}>MarketPulse</h1>
      </header>

      <main className={styles.modules}>
        <section className={styles.module}>
          <h2 className={styles.moduleTitle}>Securities</h2>
          <p className={styles.prose}>
            Story 1.4&rsquo;s representative component. Each row carries a
            price, a signed change, an anomaly band and the state of the feed it
            came from — and every one of those pairs its colour with a second
            channel. Cover the colour and the table still reads correctly, which
            is the requirement rather than the aspiration. The band chip is a
            popover trigger — a real button, so it is reachable by keyboard and
            its explanation reaches a screen reader, which is why it is a
            popover rather than a tooltip. §11 requires every score to carry its
            explanation.
          </p>

          <table className={rowStyles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th scope="col">Symbol</th>
                <th scope="col" className={styles.numericHeading}>
                  Last
                </th>
                <th scope="col" className={styles.numericHeading}>
                  Change
                </th>
                <th scope="col">Anomaly</th>
                <th scope="col">Feed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <SecurityRow
                  key={row.ticker}
                  ticker={row.ticker}
                  last={row.last}
                  change={row.change}
                  direction={row.direction}
                  band={row.band}
                  bandExplanation={BAND_MEANING[row.band]}
                  status={row.status}
                />
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
                <AnomalyBadge band={band} />
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
              <li className={styles.feedRow} key={status}>
                <FeedIndicator status={status} detail={FEED_DETAIL[status]} />
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
