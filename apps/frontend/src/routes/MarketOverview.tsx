import { Region } from "../components/Region/Region.js";
import styles from "./MarketOverview.module.css";

// PRODUCT_SPEC.md §8.1 — "What is happening?", and the spec's landing screen,
// which is why it is the route at `/`.
//
// **Story 1.4's render check was here until 2026-09-25, and Task 4.1.4 removed
// it.** It had been in this file since Task 1.5.2 — three labelled modules, a
// four-row table, an anomaly band list and a feed list, all of it hard-coded —
// and it proved something real: that the token layer, the semantic market
// colours and five components reached the browser through the bundler rather
// than only through Storybook.
//
// **What it also did was put four invented securities with invented prices on
// the landing page of a product whose entire discipline is that a claim about
// data requires data** (ADR 0029). That is `PRODUCT_SPEC.md` §5.6's *scaffold
// with data in it*, literally, on the one screen §40 says a first-time viewer
// has to understand in about a minute.
//
// **The load-bearing half was kept and made mechanical.** This file's own
// comment said the `@marketpulse/shared` import here was *the only thing
// proving the workspace dependency resolves through the bundler as well as
// through `tsc`, and the two use entirely different resolvers*. Task 4.1.4
// checked that claim instead of inheriting it: **27 files in this application
// now carry a value import from that package**, so the check stopped being the
// only proof somewhere around Epic 2 and nobody noticed. What was never true is
// that anything *asserted* it — so `pnpm invariants` now does, over the built
// bundle, with a `pnpm break` entry proving it goes red.
//
// Everything below is §9's regions. Nothing in this file renders a figure yet:
// the market summary is Story 4.2's, sectors 4.3's, breadth 4.4's and the
// movers 4.5's, and each says so on screen.

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
          filledBy="The securities graph, in WebGL — 518 nodes clustered by sector, sized by liquidity, moving with the market. It takes this column when it arrives."
        />

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
