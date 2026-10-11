import { useEffect, useMemo } from "react";

import type { Bar } from "@marketpulse/shared";

import {
  BreadthLedger,
  BreadthLedgerReservation,
} from "../components/BreadthLedger/BreadthLedger.js";
import { MarketProxyStrip } from "../components/MarketProxyStrip/MarketProxyStrip.js";
import {
  Movers,
  MoversMeta,
  MoversReservation,
} from "../components/Movers/Movers.js";
import { OverviewSourceNote } from "../components/OverviewSourceNote/OverviewSourceNote.js";
import { Region } from "../components/Region/Region.js";
import {
  SectorPerformance,
  SectorPerformanceMeta,
  SectorPerformanceReservation,
} from "../components/SectorPerformance/SectorPerformance.js";
import { useOrderHold } from "../components/OrderHeldBadge/use-order-hold.js";
import {
  marketBreadth,
  marketMovers,
  moverSymbols,
  sectorPerformance,
  type LiveFeedView,
} from "../market/index.js";
import type { MarketFeedView } from "../use-market-feed.js";
import { useSecurities } from "../use-securities.js";
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
// Everything below is §9's regions. **One of them holds figures since
// 2026-09-26** — `Market proxies`, Story 4.2's — and sectors are 4.3's, breadth
// 4.4's and the movers 4.5's, each still saying so on screen.

export interface MarketOverviewProps {
  /**
   * What the socket has said. `App` owns it, for the reason recorded there: a
   * hook that makes a network request is called in `App`.
   *
   * Optional, because three of the five routes are rendered without it and a
   * story renders this route with nothing at all. The strip's own first-paint
   * state is what an absent frame looks like, so there is no second answer.
   */
  readonly liveFeed?: LiveFeedView | undefined;
  /** See `SecurityExplorer`'s: the page declares what it needs prices for. */
  readonly onLiveSymbols?: ((symbols: readonly string[]) => void) | undefined;
  /**
   * What the chrome claims about this deployment's feed, threaded in rather
   * than fetched again (Task 4.2.7).
   *
   * The source note needs it to avoid claiming a second time what the status
   * bar already claims — `PROVENANCE.md` §1.3 — and `App`'s rule is that a
   * hook making a network request is called there. Optional for the same
   * reason `liveFeed` is: a story renders this route with nothing at all, and
   * `checking` is what an absent answer looks like.
   */
  readonly marketFeed?: MarketFeedView | undefined;
}

export function MarketOverview({
  liveFeed,
  onLiveSymbols,
  marketFeed,
}: MarketOverviewProps = {}) {
  const overview = liveFeed?.overview;
  const observations = liveFeed?.observations ?? EMPTY_OBSERVATIONS;
  const fromSnapshot = liveFeed?.fromSnapshot ?? EMPTY_SNAPSHOT;

  /*
   * **The sector rows, derived once per frame — the first of this task's two
   * memo boundaries** (AC 6, and Task 3.6.5's two boundaries are the
   * precedent). `RankedList` and its `Row` are the second and third.
   *
   * The boundary earns its keep on this route rather than in theory: Task 3.6.5
   * measured the backend-health poll re-rendering this tree every 30 s and the
   * live feed costing 46–49 ms of script a minute, and Stories 4.4 and 4.5 land
   * two more regions on the same page. `liveFeed` is a new object on every tick
   * whether or not the aggregate moved, so the dependency is the **frame**
   * rather than the view: `sameLiveFeedView` keeps `overview`'s identity stable
   * across ticks that did not change it.
   *
   * `observations` is in the dependency list because the arrival mark reads it,
   * and that is the one input that genuinely changes every burst.
   */
  const sectors = useMemo(
    () => sectorPerformance(overview, observations, fromSnapshot),
    [overview, observations, fromSnapshot],
  );

  /*
   * **The order the sector list is holding, if a reader is in the region**
   * (Task 4.3.6).
   *
   * It is here because the region's head and the region's contents are two
   * different slots of one `<Region>`, and a badge that said `ORDER HELD` over a
   * list that was re-ordering is the two-speakers-disagreeing defect this screen
   * has already paid for once. One value, read by both.
   */
  const sectorHold = useOrderHold(sectors?.rows);

  /*
   * **Breadth, derived once per frame — the route's second memo boundary**
   * (Task 4.4.5).
   *
   * Memoised on `overview`'s **identity** and not on `liveFeed`, which is a new
   * object on every tick whether or not the aggregate moved: `sameLiveFeedView`
   * keeps the frame's identity stable across ticks that did not change it, so a
   * burst that carries no new overview re-renders nothing in this region.
   *
   * `observations` is deliberately **not** a dependency, unlike the sector
   * rows'. There is no arrival mark here and nothing per-security to hang one
   * off — `The breadth ledger.dc.html` §12 — so the one input that changes
   * every burst is one this region does not read.
   */
  const breadth = useMemo(() => marketBreadth(overview), [overview]);

  /*
   * **The company names, and they are the one thing on this screen that does
   * not come off the socket** (Task 4.5.5).
   *
   * A mover row prints a ticker and the company's name beside it, and the
   * overview frame carries **no name**: `WireOverviewFigure` is a symbol, a
   * state and a figure. The names live in `securities`, which reaches a browser
   * through the request this hook already makes for the Security Explorer, so
   * this route reads the same answer rather than growing a second source for
   * one fact.
   *
   * ## What it costs, measured rather than assumed
   *
   * `GET /securities` against the dev pair on 2026-10-08: **190,701 bytes, and
   * 20,034 with gzip**, in 124 ms, with an `ETag` and `cache-control: private,
   * no-cache` — so a second load revalidates to a 304. It is the landing
   * page's **only** HTTP request for market data and it is made for ten
   * strings, which is the honest statement of the trade.
   *
   * ## Why not on the frame, and why not a narrower endpoint
   *
   * A name never changes and the aggregate is rebuilt up to sixteen times a
   * minute, so putting ten names on it would re-send immutable data at the
   * cadence of the most volatile thing on the page — and they would have to
   * hang off `WireOverviewFigure`, which the proxy and sector sections share
   * and neither needs. A `GET /securities/names` endpoint is the third option
   * and it is premature: there is one consumer, and the response it would
   * narrow is already cached and revalidated.
   *
   * **Reversal trigger**: the first surface on this screen needing a *second*
   * field from the universe — a sector, a kind, an exchange. At that point the
   * universe is this page's dependency rather than one region's context, and
   * the three options are owed a comparison with a measurement.
   *
   * ## The failure is quiet, by construction
   *
   * `useSecurities` never throws and this route never reads its failure state:
   * an unreachable universe leaves the map empty, every mover row's name track
   * is **blank room**, and the region keeps every figure it had. The name is
   * context; the ticker is the identifier, and it is on the row either way.
   *
   * **It was *labelled with its own ticker* until 2026-10-11** — which drew
   * the identifier twice in adjacent tracks, with the price column between
   * them dropped at 390. See `movers.ts`' `NAME_NOT_ARRIVED` (Task 4.7.5).
   * And the state is a **race** as much as a failure: the aggregate arrives
   * inside the socket's upgrade handler while this request measured 124 ms,
   * so a cold load paints movers with an empty map as a matter of course.
   * **No sentence, no retry and no `Try again` here** — Story 3.10's rule that
   * every surface but the one that owns a fact stays quiet, and the row would
   * otherwise grow an error state over a missing word.
   */
  const { view: universe } = useSecurities();
  const names = useMemo(
    () =>
      universe.state === "loaded"
        ? new Map(
            universe.securities.map((security) => [
              security.symbol,
              security.name,
            ]),
          )
        : EMPTY_NAMES,
    [universe],
  );

  /*
   * **The two movers lists, derived once per frame — the route's third memo
   * boundary** (Task 4.5.5).
   *
   * The sector rows' dependency list exactly: the **frame** rather than
   * `liveFeed`, because `sameLiveFeedView` keeps the frame's identity stable
   * across ticks that did not move the aggregate, plus `observations`, which is
   * the one input that genuinely changes every burst — and this region draws an
   * arrival mark off it. `names` is the fourth, and it changes once per page.
   */
  const movers = useMemo(
    () => marketMovers(overview, observations, fromSnapshot, names),
    [overview, observations, fromSnapshot, names],
  );

  /*
   * **The order BOTH movers lists are holding — one pin across two lists**
   * (Task 4.5.7).
   *
   * ## One hold, and the per-list version is refused rather than unbuilt
   *
   * `Region.onReaderWithin` is the region's own signal: non-bubbling
   * `pointerenter`/`pointerleave` on the region box plus bubbling
   * `focusin`/`focusout`, so there is **no per-list signal** without adding
   * listeners to each `<ol>`. That is not the reason it is one hold. A
   * list-scoped hold is **row scoping one level up**: it lets the losers list
   * move out from under a pointer that is *approaching* it diagonally across
   * the region, which is the failure the whole treatment exists to prevent.
   *
   * ## Why the concatenation is here and `useOrderHold` is unchanged
   *
   * The hook pins *the order that was on screen when the reader arrived*, and
   * for this region that order is two lists. One concatenated array makes the
   * pin one value — gainers at `0..N-1`, losers at `N..2N-1` — and `Movers`
   * applies it to each list separately, so neither list's internal order is
   * perturbed by the other's presence in the pin. **Nothing in the hook or in
   * `rowsInPinnedOrder` needed a second mode**; what did need new code is what
   * happens to a member the pin has never seen, which is that function's own
   * recorded decision.
   *
   * **It depends on the lists' identity rather than on the frame**, so it
   * re-derives exactly when `movers` does — which is the memo boundary above,
   * once per frame that moved the aggregate.
   */
  const moverRows = useMemo(
    () =>
      movers === undefined ? undefined : [...movers.gainers, ...movers.losers],
    [movers],
  );
  const moversHold = useOrderHold(moverRows);

  /*
   * **The set is served and this route renders what it is given.** The overview
   * frame is not scoped to a subscription — the gateway broadcasts it — so the
   * symbols arrive before this page has asked for anything, and what it asks
   * for afterwards is exactly the set the frame reported. A four-symbol array
   * written here would be the second home for a list `PRODUCT_SPEC.md` §6
   * already owns and `indexProxyTickers` already derives.
   *
   * **EVERY section the frame carries, not just `figures` — repaired 2026-10-07
   * by Task 4.4.1, and it had been a shipped defect since Story 4.3.** The
   * eleven sector benchmarks ride in `overview.sectors`, this route asked for
   * the four proxies only, and the gateway scopes both `bars` and `snapshot` to
   * what a client asked for (`if (!wanted.has(…)) continue`). So
   * `observations.get("XLK")` was permanently `undefined` and the arrival mark
   * Story 4.3 designed, drew and tested **could never fire on the deployed
   * page**. It was invisible at every level below the browser, because the unit
   * tests hand `sectorPerformance` an observations map directly and the browser
   * specs furnish their own frames — so the only thing that can see it is a
   * spec that lets the real gateway answer, which is what
   * `overview-frame-sections.spec.ts` now does.
   *
   * The rule that replaces the old one: **a section added to this frame owes a
   * line here**, because a region that draws a live figure or an arrival mark
   * from `observations` is drawing from a map this effect fills.
   *
   * **Keyed on the joined string rather than on the frame**, which is not a
   * micro-optimisation: the gateway recomputes the overview up to sixteen times
   * a minute, every one of them a new array, and an effect that re-ran on each
   * would push a new array into `App`'s state and re-render the whole tree at
   * that rate. `use-live-feed` already depends on a joined string for the same
   * reason one layer down.
   *
   * **And SORTED, which the four-proxy version did not need to be.** `figures`
   * arrives in `PRODUCT_SPEC.md` §6's declared order and never moves; `sectors`
   * arrives **in rank order**, so it re-orders whenever two sector moves cross
   * — and `use-live-feed` keys its own resubscribe on `symbols.join(",")`, also
   * order-sensitive. Keyed on the frame's order, a re-rank would push a new
   * array into `App`'s state and send a fresh `subscribe` for an identical set,
   * up to sixteen times a minute. A subscription is a **set**: its order carries
   * no meaning, so the key must not either.
   *
   * **Measured rather than argued** (Task 4.4.1, a throwaway Playwright
   * instrument against the dev pair, deleted). Sixteen overview frames, each
   * carrying the eleven sectors in a different rank order:
   *
   * | key          | `subscribe` messages on load | …across sixteen re-ranks |
   * | ------------ | ---------------------------- | ------------------------ |
   * | sorted       | 2 (`[]`, then the fifteen)   | **0**                    |
   * | frame order  | 2                            | **16**                   |
   *
   * And the widening itself is free at this scale: forty bursts of fifteen
   * observations produced **no long task at all** — `PerformanceObserver`
   * reported zero `longtask` entries, so nothing came near
   * `PRODUCT_SPEC.md` §28's 50 ms. The cost this route has to respect is the
   * 518-row table's on the neighbouring page, not fifteen cells here.
   *
   * ## The movers' ten, added 2026-10-08 by Task 4.5.5 — and this section's
   * membership MOVES, which the other two do not
   *
   * `figures` arrives in `PRODUCT_SPEC.md` §6's declared order and never
   * changes membership; `sectors` re-orders but is always the same eleven, so
   * the sort above makes a re-rank free (measured at sectors: sixteen re-ranks,
   * **0** resubscribes). A top-N is different in kind — **who is in it is the
   * answer** — so every membership change sends a fresh `subscribe`, and
   * `market-gateway.ts` answers every `subscribe` with a snapshot **plus a full
   * `overviewMessage()` rebuild**, the ~3.9 ms join, per browser.
   *
   * ### Measured rather than reasoned, over three real sessions
   *
   * A throwaway instrument (deleted) replayed `market_bars` minute by minute
   * over the 503 tracked equities, reproducing the eligibility window and
   * running the **shipped** `selectMovers` at `MOVERS_PER_SIDE`, and counted
   * how often the ten-symbol set changed:
   *
   * | session    | minutes | membership changes | per minute | distinct names drawn |
   * | ---------- | ------- | ------------------ | ---------- | -------------------- |
   * | 2026-09-11 | 390     | 171                | **0.44**   | 39 of 514            |
   * | 2026-09-10 | 390     | 105                | **0.27**   | 39 of 514            |
   * | 2026-09-04 | 390     | 83                 | **0.21**   | 22 of 514            |
   *
   * The busiest ten-minute block of the three was **10 changes**, just after
   * the open, i.e. a peak near one a minute. So **the current top-N is
   * subscribed to**, and the cost is 0.21–0.44 rebuilds a minute against the
   * sixteen a minute the gateway performs anyway — **under 3%** of a load this
   * page already imposes, for a subscription that is exactly the set on screen.
   *
   * ### The alternative, and why it lost
   *
   * A **stable superset** — the monotonic union of every name the lists have
   * drawn since the page opened — was measured in the same run and is cheaper
   * on this one axis: **12–24 resubscribes a session** rather than 83–171,
   * because it settles after 22–39 distinct names. It was rejected because
   * every one of those names then streams bars this page draws nothing from,
   * for the rest of the session, and the subscription stops being *what this
   * screen is showing* — which is the one thing a reader of this effect can
   * check. A superset is also unbounded in principle: nothing says a volatile
   * session's union is 39 rather than 300.
   *
   * **Reversal trigger**, as a condition: a measured membership rate above
   * ~4 a minute sustained over a session — an order of magnitude on the
   * figures above, and the point at which the resubscribes overtake the
   * gateway's own cadence — **or** a second churning section on this frame,
   * because two of them multiply on one key rather than adding.
   */
  const symbolKey = [
    ...[...(overview?.figures ?? []), ...(overview?.sectors ?? [])].map(
      (figure) => figure.symbol,
    ),
    ...moverSymbols(overview),
  ]
    .sort()
    .join(",");
  const liveSymbols = useMemo(
    () => (symbolKey === "" ? [] : symbolKey.split(",")),
    [symbolKey],
  );

  // Declared here and withdrawn on unmount, which is `SecurityExplorer`'s rule:
  // a screen that stops being shown stops asking.
  useEffect(() => {
    onLiveSymbols?.(liveSymbols);
    return () => {
      onLiveSymbols?.([]);
    };
  }, [liveSymbols, onLiveSymbols]);

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
        {/*
         * **`Market proxies`, renamed from `Market summary` on 2026-09-26.** It
         * is already the product's word for exactly these four — the
         * `/securities` group heading, and `Market proxy` on the security
         * page's classification line — and on a screen where three later
         * regions summarise all 518, `Market summary` promises the broadest
         * view and delivers the narrowest.
         *
         * **No `filledBy` and no `awaiting`.** The sentence was a caption for
         * something a reader can now see, and `Region` keys `reserved` on
         * `children === undefined` so the state cannot linger by accident — but
         * the tag is a string and a string has to be deleted.
         */}
        <Region name="Market proxies">
          <MarketProxyStrip
            overview={overview}
            observations={observations}
            fromSnapshot={fromSnapshot}
          />
        </Region>
      </div>

      <div className={styles.regions}>
        {/*
         * **SOURCE ORDER IS THE ≤860 ORDER — Task 4.4.7, and it is a decision
         * with a cost rather than a tidy-up.**
         *
         * The six regions below are written in the order the one-column layout
         * draws them: `breadth, sectors, movers, topology, unusual,
         * investigations`. Every one of them names its own grid area, so this
         * file's order decides nothing visual at any width — the stylesheet's
         * three `grid-template-areas` blocks do — and what it decides is the
         * **focus and reading order**, which is not a free variable: there are
         * six tab stops inside `.regions`, because `Region` passes `scrollable`
         * unconditionally and `Panel` renders `tabIndex={scrollable ? 0 :
         * undefined}`.
         *
         * **Story 4.4's own premise said there was not one tab stop here. There
         * are six, and the mismatch had been shipped since Task 4.1.3** —
         * Story 4.6's `STORY.md`, `Panel.tsx`'s docblock and `RankedList.tsx`
         * all already said so. What breadth changed is only that the stop the
         * eye meets second became the first one with a figure under it.
         *
         * **Why the ≤860 order and not the wide one.** Source order can express
         * exactly one layout, so it should express the one where order *is* the
         * meaning. At ≤860 the stylesheet's own comment is that *order is the
         * only hierarchy left* — one column, six regions, a reader meeting them
         * in sequence. At 1440 and 1024 the grid is two-dimensional and
         * column-major, so there is no single visual sequence for the DOM to
         * agree or disagree with.
         *
         * **The cost, stated rather than hidden.** At ≥861 a keyboard reader
         * now gets `breadth → sectors → movers → topology → unusual →
         * investigations` against a grid whose rows read `topology unusual /
         * sectors breadth / movers investigations`. So at those widths focus
         * order is not visual order. Accepted because in two columns the eye is
         * not performing a sequence: there is no reading order there to
         * disagree with, and the alternative — a source order matching the wide
         * grid — puts the ≤860 mismatch back on the layout where sequence is
         * the entire hierarchy, and on the narrower viewport.
         *
         * **Reversal trigger**: the first region on this screen whose content a
         * reader must traverse in order *at a wide width* — a numbered sequence,
         * a stepper, a form, or two regions where one's figure is read against
         * the other's. At that point the wide layout acquires a reading order
         * and this decision is owed a re-take; today it has none.
         *
         * `overview-region-order.spec.ts` asserts the DOM order against the
         * geometric top-to-bottom order at 768, which is the half of this that
         * a machine can check.
         */}
        {/*
         * **The breadth ledger — Story 4.4, and the first thing on this screen
         * that answers whether a 2% index move is everything or five names.**
         *
         * `awaiting` is gone because the work has landed. `filledBy` stays for
         * the one state where there is nothing to draw, and is narrower than it
         * was: *how much of the market* was the sentence this region's own
         * denominator exists to refuse — the count is over the **503 equities**
         * we track, which is the S&P 500 by curation and is a narrower thing
         * than the market.
         *
         * **`breadth === undefined` is two states, and they are told apart by
         * the frame rather than by the section** — `Sector performance`'s rule
         * one region across, for the same reason. `overview` present with no
         * readable breadth is a **rollback pinning a previous image**: that
         * gateway will never send a section, so the honest answer is the
         * region's own sentence. `overview` absent is the **first paint**, a few
         * hundred milliseconds on every load, where the same sentence would be
         * a promise the next frame breaks — and the panel it sits in is 103 px
         * at 768 and 139 at 390 against the filled height, so saying nothing
         * and holding the room is what keeps the lower page still.
         *
         * **The sentence for the state where nothing EVER arrives is Task
         * 4.4.6's**, together with the `useWaited` floor the sibling already
         * reuses.
         *
         * ## This sentence carries NO figure, and it carried one for a day
         *
         * **Corrected 2026-10-07 by Task 4.4.8, found by producing the state
         * rather than by reading the line.** It read *"among the 503 companies
         * we track"*, and the state it renders in is **precisely the state
         * where this screen has no readable denominator**: the frame arrived
         * and its breadth section was refused. The grid's
         * `17-measured-over-tracked` drew the consequence — a frame carrying
         * **`tracked: 400`**, its section refused, and the region saying
         * **503**. Reachable by rollback.
         *
         * Everywhere else in this story the set size is read off the frame,
         * because `BreadthClaim`'s own docblock says a literal `503` is *a lie
         * with no symptom the day a constituent is delisted* — and here there
         * is nothing to read it off, which is the whole reason the section was
         * refused. So the repair is not a different number: it is **no
         * number**, which is ADR 0029's defer rule applied to the clause rather
         * than to the region. The sentence says what the region is for; the
         * population is stated by `BreadthLedger` in the states that have one.
         */}
        <Region
          className={styles.areaBreadth}
          name="Market breadth"
          filledBy={
            breadth === undefined && overview !== undefined
              ? "Advancing, declining and unchanged among the companies we track, over the number of them the count could see."
              : undefined
          }
        >
          {breadth === undefined ? (
            overview === undefined ? (
              <BreadthLedgerReservation />
            ) : undefined
          ) : (
            <BreadthLedger view={breadth} />
          )}
        </Region>

        {/*
         * **Eleven sectors, ranked — Story 4.3, and the first thing on this
         * screen a reader could not have got from a security page.**
         *
         * `awaiting` is gone because the work has landed: `Region` renders the
         * tag only while `children === undefined`, but a forgotten
         * `awaiting="Story 4.3"` beside shipped sector data is exactly the
         * claim that component's comment says nothing in this repository can
         * read. `filledBy` stays for the one state where there is nothing to
         * draw and is narrower than it was — *each carrying what its figure is
         * computed over* described the **aggregate** option, and the owner chose
         * the ETF's own move, so this region has no denominator at all.
         *
         * **`sectors === undefined` is TWO states rather than one, and Task
         * 4.3.7 tells them apart.** The read side keeps `sectors` and
         * `sectorLadderStep` optional because a rollback pins a previous image,
         * so a new bundle can legitimately meet an old gateway that sends no such
         * section. That gateway will never send one, so the honest answer is the
         * region's own reserved panel and its sentence — *nothing here yet*, the
         * vocabulary this screen already has.
         *
         * **No frame at all is the other state, and it lasts a few hundred
         * milliseconds on every load.** The same sentence there would be a
         * promise the next frame breaks, and the panel it sits in is **103 px at
         * 768 and 121 at 390** against 461 and 437 filled — so the landing page
         * stepped ~316 px on a phone a moment after it painted. So that state
         * holds the region's real geometry, invisibly
         * (`SectorPerformanceReservation`), and says nothing at all. The
         * discriminator is the **frame** rather than the section: `overview`
         * present with no readable sectors is the rollback; `overview` absent is
         * the first paint.
         */}
        <Region
          className={styles.areaSectors}
          name="Sector performance"
          filledBy={
            sectors === undefined && overview !== undefined
              ? "Eleven sector benchmark ETFs, ranked by today’s move."
              : undefined
          }
          /*
           * **The hold is scoped to the region, never to a row.** A row-scoped
           * hold lets rows move out from under an *approaching* pointer, and the
           * region's own box is the only element here a keyboard reader can be
           * at: `Region` passes `scrollable`, which makes the section the
           * region's one tab stop.
           */
          onReaderWithin={sectorHold.onReaderWithin}
          meta={
            sectors === undefined ? undefined : (
              <SectorPerformanceMeta view={sectors} held={sectorHold.held} />
            )
          }
        >
          {sectors === undefined ? (
            overview === undefined ? (
              <SectorPerformanceReservation />
            ) : undefined
          ) : (
            <SectorPerformance view={sectors} pinned={sectorHold.pinned} />
          )}
        </Region>

        {/*
         * **The two ranked lists — Story 4.5, and the first thing on this
         * screen that answers *where should I look*.**
         *
         * `awaiting` is gone because the work has landed; `filledBy` stays for
         * the one state where there is nothing to draw.
         *
         * **The noun was repaired on 2026-10-08 by Task 4.5.6.** It read *the
         * securities we track*, which is **518** — the four index proxies and
         * the eleven sector SPDRs included — where the set this region ranks
         * over is the **503 companies**, by `eligibleMoves`' positive
         * membership test and the owner's Gate 1 decision. It is now
         * *companies*, which is the noun `measured-set.ts` uses in the one
         * clause both ranked regions state.
         *
         * **`the-population-is-never-a-literal` does not catch it and cannot
         * be widened to**: that clause fires on a **digit** beside `we track`,
         * and this sentence has none — the whole defect is a wrong noun with no
         * figure anywhere near it. See that check's own comment for the two
         * widenings considered and refused; the honest position is that the
         * guard here is this comment rather than a grep.
         *
         * **`movers === undefined` is TWO states, told apart by the FRAME
         * rather than by the section** — the rule both regions above follow, and
         * for the same reason. `overview` present with no readable movers
         * section is a **rollback pinning a previous image**: that gateway will
         * never send one, so the honest answer is the region's own sentence.
         * `overview` absent is the **first paint**, a few hundred milliseconds
         * on every load, where the same sentence is a promise the next frame
         * breaks — and at 768 and 390 the grid row is content-sized, so the
         * reservation is what keeps the lower page still.
         *
         * **An EMPTY section is neither**, and that is this region's one
         * departure from its siblings: two empty lists are *nothing was
         * rankable*, which is CI's permanent state, most of a weekend and the
         * first minute of every session. `Movers` draws it — ten held rows and
         * two headings, with its own sentence after `useWaited`'s floor — so
         * the region says what it has rather than reserving itself invisibly
         * for ever. `marketMovers` returns the empty lists rather than
         * `undefined` precisely so that this branch cannot collapse them.
         *
         * **`MoversMeta` takes the view since Task 4.5.6**, for the one
         * judgement that had to be taken with the sentence rather than beside
         * it: `Top 5 each way` **falls silent when nothing was selected**, on
         * `SectorPerformanceMeta`'s precedent, because a bound stated over two
         * empty lists is a claim about a selection that selected nothing. The
         * `ORDER HELD` badge and the hold that produces it are Task 4.5.7's,
         * and the slot's room is already reserved so nothing moves either way.
         */}
        <Region
          className={styles.areaMovers}
          name="Movers"
          filledBy={
            movers === undefined && overview !== undefined
              ? "The largest moves among the companies we track, up and down, ranked while the session runs."
              : undefined
          }
          /*
           * **The hold is scoped to the region, never to a list and never to a
           * row** (Task 4.5.7). `Region` passes `scrollable`, which makes the
           * section the region's one tab stop, so this is also the only element
           * at which a keyboard reader can be said to be *here* — and the four
           * states it answers are pointer in neither, in gainers, in losers,
           * and focus in one while the pointer is in the other.
           */
          onReaderWithin={moversHold.onReaderWithin}
          meta={
            movers === undefined ? undefined : (
              <MoversMeta view={movers} held={moversHold.held} />
            )
          }
        >
          {movers === undefined ? (
            overview === undefined ? (
              <MoversReservation />
            ) : undefined
          ) : (
            <Movers view={movers} pinned={moversHold.pinned} />
          )}
        </Region>

        <Region
          className={styles.areaTopology}
          name="Market topology"
          awaiting="Epic 6"
          filledBy="The securities graph, in WebGL — 518 nodes clustered by sector, sized by liquidity, moving with the market. It takes this column when it arrives."
        />

        <Region
          className={styles.areaUnusual}
          name="Unusual activity"
          awaiting="Epic 5"
          filledBy="Every tracked security scored 0–100 for how unusual its behaviour is, ranked, each score carrying its explanation."
        />

        <Region
          className={styles.areaInvestigations}
          name="Current investigations"
          awaiting="Epic 7"
          filledBy="Investigations in flight — running, awaiting input and completed. Epic 10 lets the agent start them."
        />
      </div>

      {/*
       * **One source note for the screen** (Task 4.2.7), after the last region
       * and before `AppFooter` — the position and the grain the Security
       * Explorer already uses, last in reading order because it qualifies
       * everything above it.
       *
       * **Not one per region and not one inside the strip.** `PROVENANCE.md`
       * §1.3's rule transfers verbatim, and it exists because five correct
       * additions made one at a time produce a footnote pile — which is
       * precisely what would happen here, with 4.3, 4.4 and 4.5 each landing a
       * region with figures in it. `one-provenance-note-on-the-landing-route`
       * refuses a second.
       *
       * It is handed the **same frame the strip is drawing**, so the note and
       * the picture cannot describe different answers.
       */}
      <OverviewSourceNote overview={overview} feed={marketFeed ?? CHECKING} />
    </>
  );
}

/**
 * What the note is told when the route is rendered without a feed answer — a
 * story, or a test that renders the route bare.
 *
 * `checking` rather than `not-configured`, because *nobody has asked yet* and
 * *the deployment has no provider* are different facts and only the first is
 * true of a route with no prop. It is also the one state that suppresses the
 * feed clause without a positive match (`chromeAlreadyNames`), so an absent
 * answer makes the note say less rather than claim more.
 */
const CHECKING: MarketFeedView = { state: "checking" };

// Stable empties, so a route rendered without a feed does not hand the strip a
// new Map on every render.
const EMPTY_OBSERVATIONS: ReadonlyMap<string, Bar> = new Map<string, Bar>();
/** The same, for the universe that has not arrived — see `names`. */
const EMPTY_NAMES: ReadonlyMap<string, string> = new Map<string, string>();
const EMPTY_SNAPSHOT: ReadonlySet<string> = new Set();
