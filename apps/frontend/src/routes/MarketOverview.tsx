import {
  ANOMALY_BANDS,
  FEED_STATUSES,
  toTicker,
  type AnomalyBand,
  type FeedStatus,
} from "@marketpulse/shared";

import { AnomalyBadge } from "../components/AnomalyBadge/AnomalyBadge.js";
import { FeedIndicator } from "../components/FeedIndicator/FeedIndicator.js";
import { SecurityRow } from "../components/SecurityRow/SecurityRow.js";
import rowStyles from "../components/SecurityRow/SecurityRow.module.css";
import { Placeholder } from "./Placeholder.js";
import { Region } from "./Region.js";
import styles from "./MarketOverview.module.css";

// PRODUCT_SPEC.md §8.1 — "What is happening?", and the spec's landing screen,
// which is why it is the route at `/`.
//
// This is the one placeholder that is not only a placeholder, and that is
// deliberate. Everything below the heading is Story 1.4's render check, moved
// here wholesale from `App.tsx` in Task 1.5.2 when `App` became the router's
// host. It could have been deleted instead, and deleting it would have been the
// worse choice twice over: the check is the only thing in the application that
// proves the token layer, the semantic market colours and the five components
// reach the browser through the bundler rather than only through Storybook, and
// routing it out of the graph would have quietly removed about 100 kB from the
// artefact — a number Task 1.5.1 already recorded as the price of Base UI, and
// one nobody should be able to reclaim by accident.
//
// Epic 4 replaces all of it with the real overview.
//
// Task 1.5.4 put the region structure around it. §9's sketch is a dominant
// primary area with the topology as the visual centre of gravity, a narrower
// right column carrying unusual activity above investigations, and a lower band
// for market breadth — four boxes, of which three are a name and a sentence
// today. The render check went into the primary area rather than above or
// beside the regions, because a region structure built around an empty box is a
// structure nobody has actually looked at, and because the render check is the
// closest thing this application currently has to the content §9 puts there.
// Epic 6 replaces it with the topology and the walls stay where they are.
//
// §8.1 lists two contents §9's sketch does not place — the index/ETF summary
// and sector performance. They are deliberately not given regions of their own:
// where they belong is a question about their shape, and Epic 4 is the first
// thing that will know it. Adding two more empty boxes now would be guessing.
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

export function MarketOverview() {
  return (
    <>
      <Placeholder label="Placeholder" name="Market Overview">
        The landing screen, and the one that answers what is happening right
        now: index and ETF summaries, an unusual activity feed, market breadth,
        sector performance and the topology. Epic 4 builds it on live data, Epic
        5 scores the anomalies in it and Epic 6 draws the topology. What follows
        is Story 1.4&rsquo;s render check, kept until then.
      </Placeholder>

      <div className={styles.regions}>
        <Region
          name="Market topology"
          filledBy="Epic 6 draws the securities graph here, in WebGL. Until then this is Story 1.4’s render check, which is what proves the design language reaches the browser through the bundler."
        >
          <div className={styles.modules}>
            <section className={styles.module}>
              <h3 className={styles.moduleTitle}>Securities</h3>
              <p className={styles.prose}>
                Story 1.4&rsquo;s representative component. Each row carries a
                price, a signed change, an anomaly band and the state of the
                feed it came from — and every one of those pairs its colour with
                a second channel. Cover the colour and the table still reads
                correctly, which is the requirement rather than the aspiration.
                The band chip is a popover trigger — a real button, so it is
                reachable by keyboard and its explanation reaches a screen
                reader, which is why it is a popover rather than a tooltip. §11
                requires every score to carry its explanation.
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
              <h3 className={styles.moduleTitle}>Anomaly intensity</h3>
              <p className={styles.prose}>
                Four named bands rather than a continuous ramp, because a band
                can be labelled and a gradient cannot. The ramp is amber and not
                red: red already means price-down above, and an extreme anomaly
                on a security moving sharply upward must not read as a fall. It
                measures how unusual behaviour is — never risk, never
                opportunity.
              </p>

              <ul className={styles.bandList}>
                {ANOMALY_BANDS.map((band) => (
                  <li className={styles.bandRow} key={band}>
                    <AnomalyBadge band={band} />
                    <span className={styles.bandMeaning}>
                      {BAND_MEANING[band]}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.module}>
              <h3 className={styles.moduleTitle}>Feed status</h3>
              <p className={styles.prose}>
                None of these three is an error. Stale and disconnected data is
                still shown and still correct as of a stated time; the marker
                shape carries the state, and only stale takes a colour.
              </p>

              <ul className={styles.feedList}>
                {FEED_STATUSES.map((status) => (
                  <li className={styles.feedRow} key={status}>
                    <FeedIndicator
                      status={status}
                      detail={FEED_DETAIL[status]}
                    />
                  </li>
                ))}
              </ul>

              <div className={styles.error}>
                <p className={styles.errorTitle}>Peer comparison failed</p>
                <p className={styles.errorBody}>
                  What a real failure looks like, here only so the three rows
                  above can be compared against it. It is a labelled block
                  rather than a tinted figure, which is the whole reason one red
                  can mean both &ldquo;price down&rdquo; and &ldquo;this did not
                  work&rdquo;.
                </p>
              </div>
            </section>
          </div>
        </Region>

        <Region
          name="Unusual activity"
          filledBy="Epic 5 scores every tracked security and ranks the unusual ones here, each score carrying its explanation."
        />

        <Region
          name="Market breadth"
          filledBy="Epic 4 fills this with advancing, declining and unchanged counts once there is live market data behind them."
        />

        <Region
          name="Current investigations"
          filledBy="Epic 7 lists investigations here — running, awaiting input and completed — and Epic 10 lets the agent start them."
        />
      </div>
    </>
  );
}
