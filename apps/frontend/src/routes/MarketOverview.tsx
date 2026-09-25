import {
  ANOMALY_BANDS,
  FEED_STATUSES,
  toTicker,
  type AnomalyBand,
} from "@marketpulse/shared";

import type { LiveFeedView } from "../market/index.js";
import { AnomalyBadge } from "../components/AnomalyBadge/AnomalyBadge.js";
import { FeedIndicator } from "../components/FeedIndicator/FeedIndicator.js";
import { Region } from "../components/Region/Region.js";
import { SecurityRow } from "../components/SecurityRow/SecurityRow.js";
import rowStyles from "../components/SecurityRow/SecurityRow.module.css";
import styles from "./MarketOverview.module.css";

/** Nothing observed. §11.1: absence is the answer, and `{}` is the true one. */
const NO_OBSERVATIONS = new Map();
/** Nothing was delivered by a snapshot — Task 3.5.4's baseline/arrival split. */
const NO_SNAPSHOT = new Set<string>();

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
  normal: "Behaviour is within this security’s own history",
  elevated: "Moving more than usual, within recognisable bounds",
  unusual: "Clearly outside the historical distribution",
  extreme: "Far outside it — the case an investigation starts from",
};

// PRODUCT_SPEC.md §36's wording, near enough: data that is still shown, still
// correct as of a stated time, and no longer live.
// The three connection states, as views rather than as invented strings
// (rewritten 2026-09-19 by Task 3.3.5).
//
// **Every sentence here used to be one this product does not own** — `Updating`,
// `Last update 10:41:58 — slower than expected`. They were written in Story 1.4
// when the vocabulary did not exist; it does now, in
// `packages/shared/src/feed-words.ts`, and a render check typing its own words
// is a second home for a string the build is meant to keep to one.
//
// The instant is §7.3's measured frame rather than a plausible-looking time,
// and it is fixed so that a visual diff of this page is not a clock.
const FEED_SAMPLES: readonly LiveFeedView[] = FEED_STATUSES.map((status) => ({
  status,
  feed: "iex",
  backendReachable: true,
  observedAt: Date.parse("2026-09-16T14:01:00Z"),
  unreadable: 0,
  observations: NO_OBSERVATIONS,
  fromSnapshot: NO_SNAPSHOT,
  resumes: 0,
}));

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
  },
  {
    ticker: toTicker("NVDA"),
    last: "8,888.88",
    change: "−34.02",
    direction: "negative",
    band: "extreme",
  },
  {
    ticker: toTicker("KO"),
    last: "1,088.18",
    change: "0.00",
    direction: "unchanged",
    band: "normal",
  },
] as const;

export function MarketOverview() {
  return (
    <>
      {/*
       * **The route's accessible name, and nothing drawn — Task 4.1.3.**
       *
       * A summary paragraph stood here until 2026-09-25, describing the whole
       * screen: *index and ETF summaries, an unusual activity feed, market
       * breadth, sector performance and the topology.* It said what the seven
       * `filledBy` sentences below already say, in one more place — and one
       * fact with two homes is the defect this product has shipped twice, in a
       * chrome cell and in a provenance ledger, both inheriting a word that had
       * stopped being true.
       *
       * It was harmless while every region was a deferral and the paragraph
       * summarised deferrals. It stops being harmless the moment a region
       * carries a figure, which is Story 4.2.
       *
       * **What replaces it is nothing** (`Market overview.dc.html` §05): the
       * first thing on this screen is a fact about the market rather than a
       * sentence about the application. A page title was drawn and rejected —
       * the Security Explorer earns its heading by having a *subject* beside
       * it, and this screen's subject is the market, which the masthead already
       * frames. A shorter paragraph was rejected as the same defect at a
       * smaller size.
       *
       * The `h1` stays because a route needs one: the document outline, the
       * landmark list and a screen reader's heading navigation all read it, and
       * none of them is helped by the sentence that used to sit under it.
       */}
      <h1 className={styles.routeName}>Market Overview</h1>

      {/*
       * **The market summary, and it is a strip rather than a region in the
       * grid — `Market overview.dc.html` §01.**
       *
       * Task 1.5.4 left the index/ETF summary and sector performance unplaced
       * on purpose — *where they belong is a question about their shape, and
       * Epic 4 is the first thing that will know it* — and this is the answer
       * to the first half. Four named securities, read before a reader's eye
       * has moved, and the only thing on this screen that answers §1's *what is
       * happening* without an aggregate behind it.
       *
       * It sits outside `.regions` because it is not on the grid's proportions:
       * the grid is §9's 3:1 and 2:1 emphasis, and a headline strip that took a
       * row of it would push the primary area down by a third of the viewport
       * to hold four figures.
       */}
      <div className={styles.summary}>
        <Region
          name="Market summary"
          awaiting="Story 4.2"
          filledBy="SPY, QQQ, DIA and IWM — the last price and the change from the previous session’s close."
        />
      </div>

      <div className={styles.regions}>
        <Region
          className={styles.areaTopology}
          name="Market topology"
          awaiting="Epic 6"
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
                {FEED_SAMPLES.map((view) => (
                  <li className={styles.feedRow} key={view.status}>
                    <FeedIndicator view={view} />
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
          className={styles.areaSectors}
          name="Sector performance"
          awaiting="Story 4.3"
          filledBy="Eleven sector ETFs ranked by today’s move, each carrying what its figure is computed over."
        />

        <Region
          className={styles.areaMovers}
          name="Movers"
          awaiting="Story 4.5"
          filledBy="The largest moves among the securities we track, up and down, ranked while the session runs."
        />

        <Region
          className={styles.areaUnusual}
          name="Unusual activity"
          awaiting="Epic 5"
          filledBy="Every tracked security scored 0–100 for how unusual its behaviour is, ranked, each score carrying its explanation."
        />

        <Region
          className={styles.areaBreadth}
          name="Market breadth"
          awaiting="Story 4.4"
          filledBy="How much of the market is advancing, declining and unchanged — with the number of securities the figure could see."
        />

        <Region
          className={styles.areaInvestigations}
          name="Current investigations"
          awaiting="Epic 7"
          filledBy="Investigations in flight — running, awaiting input and completed. Epic 10 lets the agent start them."
        />
      </div>
    </>
  );
}
