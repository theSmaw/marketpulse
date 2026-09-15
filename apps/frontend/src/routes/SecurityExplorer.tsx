import { useNavigate } from "react-router";

import { BarSeriesPanel } from "../components/BarSeriesPanel/BarSeriesPanel.js";
import { ChartAxis } from "../components/PriceChart/ChartAxis.js";
import { PageHeader } from "../components/PageHeader/PageHeader.js";
import { Region } from "../components/Region/Region.js";
import { RegionPlaceholder } from "../components/RegionPlaceholder/RegionPlaceholder.js";
import { SecurityIdentity } from "../components/SecurityIdentity/SecurityIdentity.js";
import { storedHistoryFor } from "../components/PriceChart/chart-vacancy.js";
import { SourceNote } from "../components/SourceNote/SourceNote.js";
import { SecuritySearch } from "../components/SecuritySearch/SecuritySearch.js";
import { UniverseTable } from "../components/UniverseTable/UniverseTable.js";
import { TimeWindowControl } from "../components/TimeWindowControl/TimeWindowControl.js";
import { VolumeChart } from "../components/PriceChart/VolumeChart.js";
import {
  seriesWindowFor,
  timeframeForSessions,
  useBarSeries,
} from "../market/index.js";
import type { MarketFeedView } from "../use-market-feed.js";
import { useSecurities } from "../use-securities.js";
import { securityPath } from "./paths.js";
import { useSecuritySymbol } from "./use-security-symbol.js";
import { useTimeWindow } from "./use-time-window.js";
import page from "./SecurityExplorer.module.css";

// PRODUCT_SPEC.md §8.3 — "What is happening with this security?".
//
// **The first screen in MarketPulse that renders something true** (Task 2.4.3),
// and since Task 2.4.4 the first one that has been designed rather than merely
// made correct. What is left in this file is the page's *frame*: the heading,
// the region, and the one call that fetches. The table and its four states are
// `components/UniverseTable`, which is where they moved the day somebody had to
// design them — see that file for why, and `Region` for the precedent.
//
// **The symbol form of this route arrived at Task 2.10.7**, and with it the
// first series this product has ever rendered. `ROUTE_PATTERNS.security` is the
// declaration and `use-security-symbol.ts` is the one place the segment is
// read; both files carry why. Story 2.11 still owns **search** — how a reader
// names a security without typing a URL — and click-through from the table
// below.
//
// The page serves both addresses and renders the same shell for each.
// `/securities` shows a default security and says so; `/securities/AMD` shows
// that one.
//
// **Task 2.11.7 turned it into the screen §8.3 describes**: an identity block,
// then a grid carrying §8.3's seven contents — two of them real or one story
// away, five of them honest placeholders naming the epic that fills them — and
// the tracked universe last and full width. The grid was decided once, now,
// while there are two real regions on it, because four separate epics add to
// this page and deciding it four times is how a screen stops being one.
//
// **This route re-renders rather than re-mounts** when a person moves between
// two securities (measured in Chromium, Task 2.11.5), so any state a region
// introduces survives a change of symbol by default. Nothing in this shell
// holds state — that is why — and a region that acquires some owes the reset
// `useBarSeries` already does.

export interface SecurityExplorerProps {
  /**
   * What the chrome claims about this deployment's feed, passed down rather
   * than fetched here.
   *
   * `App` owns every hook that makes a request — a component that fetches is a
   * component the workshop cannot render, and `useMarketFeed` is fetched once
   * per page load for a value that cannot change without a deploy. The source
   * note at the foot of this page needs it for one reason: to say nothing about
   * a feed the masthead is already naming correctly (`PROVENANCE.md` §1.3).
   */
  readonly marketFeed: MarketFeedView;
}

export function SecurityExplorer({ marketFeed }: SecurityExplorerProps) {
  // The hooks are called here rather than inside the regions, so a component
  // that throws hits `Region`'s own boundary and leaves the request that
  // produced it alone — the same argument `App` makes for calling
  // `useBackendHealth` outside the header's boundary.
  const navigate = useNavigate();
  const { view, retry } = useSecurities();
  const { symbol, fromAddress } = useSecuritySymbol();

  // The request is a fresh object literal on every render **and that is the
  // intended call shape**: `useBarSeries` keys on `barSeriesQuery(request)`
  // rather than on object identity, precisely so a route can build one inline
  // without a `useMemo` that would be load-bearing and look decorative.
  //
  // **Five is the default and it is a measured choice rather than a taste one**
  // (Task 2.10.6, recorded in TASK-07's amendment), and it now lives in
  // `time-window.ts` as `DEFAULT_WINDOW_SESSIONS` because three things need to
  // agree about it: this request, the address the control writes, and the cell
  // the control draws a bar under. A named window always reaches to the
  // *current* session's close, and the store is caught up nightly — so
  // `sessions=1` and `sessions=2` are both `empty` on the local and the deployed
  // store alike, which is a correct 200 that looks exactly like a broken data
  // layer. Five reaches back past the backfill's edge and has bars in it. `1D`
  // is offered by the control, is never the default and is never preselected
  // (`VOLUME-AND-WINDOW.md` §1.3).
  //
  // The window is **named and never resolved here.** A browser in Singapore at
  // 09:00 local is on the previous market date in New York, so a client that
  // computes "the last five sessions" itself is off by one for half the world
  // for several hours of every day — and it produces a chart that is plausible
  // and shifted rather than an error anybody sees. The server resolves it and
  // reports back what it meant in `coverage.requested`, which is what the panel
  // renders.
  // **The window comes from the address since Task 2.13.6**, which is what makes
  // it shareable, survive a reload and survive the back button —
  // `use-time-window.ts` is the one place it is decoded and `securityPath` the
  // one place it is written.
  const { sessions } = useTimeWindow();

  // **Which of the two empty answers an empty chart is** (Task 2.14.6), derived
  // here because this is the one place that holds both answers.
  //
  // `PROVENANCE.md` §6.2: the server distinguishes *we hold nothing for this
  // security* from *we hold nothing in this window* in a debug log and nowhere
  // else, and both are the same 200. The distinction is already on the wire —
  // on the **universe** response, where a security with no bars is absent from
  // `coverage` rather than present with a zero — and this page has fetched that
  // since the identity block. So no new request, no new field, and no seventh
  // member of `BarSeriesView`: one derivation, read by the two plots and by the
  // panel's announcement, so the drawn sentence and the spoken one cannot come
  // to disagree.
  //
  // It is a property of the **screen** rather than of either response, which is
  // the cost as well as the saving. §6.2's reversal trigger is the first
  // consumer of `GET /market-data/bars` that does not also hold the universe.
  const stored = storedHistoryFor(view, symbol);

  const series = useBarSeries({
    symbol,
    // **Derived, never chosen** (`VOLUME-AND-WINDOW.md` §2): the mapping lives in
    // `time-window.ts` and is exhaustive over a *count*, so a hand-typed
    // `?sessions=7` and an agent's `setTimeWindow` map as surely as a press of
    // `1M` does. This is also what makes the server's 10,000-bar cap structurally
    // unreachable through the named form, so there is no size check here.
    timeframe: timeframeForSessions(sessions),
    window: seriesWindowFor(sessions),
  });

  return (
    <div className={page.page}>
      {/*
       * **The heading is the route's own name and matches the navigation link
       * that reaches it**, which is PRODUCT_SPEC.md §8.3's vocabulary. The first
       * draft of Task 2.4.3 called it "Securities" and the browser gate caught
       * it: `backend-failure-states.spec.ts` walks every route asserting its
       * `<h1>`, and `specs-deployed/host-routing.spec.ts` deep-links to this
       * path and asserts the same. Both went red, correctly — a page whose
       * heading disagrees with the link a user clicked to reach it is a real
       * defect.
       *
       * Task 2.4.4 was handed the question of whether the route should be
       * renamed now that its first content is the universe rather than one
       * security, and the answer is **no**. §8.3 names this experience the
       * Security Explorer and lists a price chart, filings and connected
       * securities among its contents; Stories 2.11 to 2.13 build those into
       * this same screen. Renaming it to "Universe" would name it after the one
       * thing it happens to hold today and then need renaming back — and it
       * would move three things at once, this heading, `AppHeader`'s link and
       * two browser specs, for a name with a shorter life than the route.
       *
       * There is no eyebrow above it. `PageHeader`'s says *what kind of thing
       * this screen is* — "Placeholder", "Not found" — and this is no longer
       * either.
       *
       * **It is a `PageHeader` since the 2026 refresh** (ADR 0022), which is
       * where the `<h1>` now lives for every route in the application. The
       * description under it is new and is the sentence this screen never had:
       * a stranger landing here from a link had the route's name and nothing
       * saying what it was for.
       */}
      <PageHeader
        title="Security Explorer"
        description="What is happening with one security — its bars, its last close, and the universe it belongs to."
      />

      {/*
       * Search, in the page's own heading block — above both regions and inside
       * neither (`SEARCH-AND-SELECTION.md` §1).
       *
       * **Not inside the table's `Region`**, and that is a defect avoided
       * rather than a layout preference: `Region` declares `overflow: auto`,
       * and a control inside a scrollable container is how Task 1.13.4's
       * `scrollable-region-focusable` class of defect gets reintroduced. It is
       * also simply true that a control *over* two surfaces belongs to neither.
       *
       * **Rendered in every state of the universe fetch**, which is Task
       * 2.11.6's whole subject. Until then it was rendered only once the fetch
       * had succeeded — so while the universe was loading, unreachable or
       * answered badly, the field simply was not on the page. That is not a
       * designed state; it is the absence of one, and it is indistinguishable
       * to a reader from a product with no search in it.
       *
       * It takes the view whole for `UniverseTable`'s reason, and takes no
       * `onRetry`: one control on this screen re-asks for the universe and it
       * is the table's, because both surfaces read the same fetch and two
       * buttons doing one thing teach a reader that neither is the real one.
       *
       * Where the table ends up underneath is Task 2.11.7's; that the field
       * sits above whatever it becomes is settled here.
       */}
      <SecuritySearch
        view={view}
        onOpen={(symbol) => {
          // The one spelling of this destination. `securityPath` is the only
          // thing that builds one from `ROUTE_PATTERNS.security`, and a push
          // rather than a replace is what keeps Back working.
          void navigate(securityPath(symbol));
        }}
      />

      {/*
       * **Whose page this is** (Task 2.11.7). Above the grid and spanning it,
       * because it is not one of §8.3's seven contents — it is the subject all
       * seven are about.
       *
       * It fills from the same fetch the table below does and carries **no
       * live region of its own**: `SEARCH-AND-SELECTION.md` §4 spent this
       * page's third `role="status"` on search, on an argument this surface
       * cannot borrow (search speaks 400ms after a keystroke; this fills at
       * exactly the moment the other two do). The decision is recorded there
       * rather than left as a consequence of a layout.
       */}
      <SecurityIdentity symbol={symbol} view={view} />

      {/*
       * **The grid PRODUCT_SPEC.md §8.3's seven contents sit on**, decided once
       * here while there are two real regions on it rather than four times as
       * Epics 5, 6 and 9 each add one. Adding a region later is placing it in
       * `SecurityExplorer.module.css`'s `grid-template`, not reflowing a page.
       *
       * The reading order is fixed and the columns are laid over it: price,
       * volume, abnormal move, relative performance, connected securities,
       * filings, anomaly history. A keyboard and a screen reader therefore meet
       * the same sequence a mouse does at every one of the three viewports.
       */}
      {/*
       * **One axis, two plots** (Task 2.13.4). The Price and Volume regions are
       * not adjacent in the DOM — §8.3's reading order puts the Abnormal-move
       * region between them, and at one column that separation is real — so the
       * thing they share is a provider around the grid rather than a common
       * parent element.
       *
       * It renders `children` through unchanged and holds the only state on
       * this page. That is deliberate and is `VOLUME-AND-WINDOW.md` §15.1's
       * constraint: this route re-renders the 518-row universe table below, and
       * chart state held *here* would re-render it on every resize — and, once
       * Task 2.13.5 puts the read position in the same wrapper, on every
       * pointer move across a chart.
       */}
      {/*
       * **The axis is built from what is DRAWN, not from what was asked**
       * (Task 2.13.7). `series.screen.shown` is the previous window's answer
       * wherever the current request carries no picture — in flight with
       * nothing cached, refused, or failed — so the two plots keep the frame
       * they had rather than collapsing to nothing and back.
       *
       * `series.view` is still what the panel *reports on*, which is why both
       * reach `BarSeriesPanel` and only one reaches the plots.
       */}
      <ChartAxis view={series.screen.shown}>
        <div className={page.grid}>
          {/*
           * The series region, first and two columns wide, because it is what
           * this route is named for.
           *
           * **It carries no `filledBy` sentence** (2026-09-13), and it is the
           * first region without one. That sentence earned its place while this
           * region held a fence — *a panel of numbers where a reader expects a
           * chart looks unfinished unless it says the chart is a story away* —
           * and Task 2.12.4 took the fence down by drawing the chart. What was
           * left was a caption for a picture immediately below it, above a
           * control that says the same thing in less space, costing the drawing
           * a paragraph of height at every width. `Region`'s prop is optional
           * for that reason rather than for this one region's convenience.
           */}
          <div className={page.wide}>
            <Region name="Price">
              <BarSeriesPanel
                screen={series.screen}
                stored={stored}
                symbol={symbol}
                onRetry={series.retry}
                defaulted={!fromAddress}
                control={
                  /*
                   * **The window control, on the row above the picture**
                   * (2026-09-13, moved off the region's heading row by §71).
                   *
                   * `VOLUME-AND-WINDOW.md` §8.6 put it on the heading row on the
                   * argument that this product has no page-level control bar and
                   * inventing one for a single control is chrome arriving before
                   * its second occupant. That argument still holds — this is not
                   * a control bar, it is one row inside one panel — and what it
                   * did not weigh is that the control made the Price region's
                   * heading taller than every other region's on the screen, and
                   * that the held-window rail had nowhere to go but into the
                   * flow above the chart.
                   *
                   * **Where the slot lands is `BarSeriesPanel`'s and has moved
                   * twice since.** It was the ticker's line; the ticker came off
                   * on 2026-09-14 and it is now the top of the headline row's
                   * right-hand column, above the rail. See `.aside` there — the
                   * arrangement is a measurement rather than a preference, and
                   * this route deliberately knows none of it.
                   *
                   * It knows nothing about `useBarSeries`. It reports a session
                   * count; this route turns that into an address, and the address
                   * is what the next request is built from. So the selected cell
                   * moves in the frame the press lands, and the control cannot end
                   * up contradicting the chart.
                   */
                  <TimeWindowControl
                    onChange={(next) => {
                      // A **push** rather than a replace, for `navigate`'s reason
                      // above: pressing a window is a deliberate act and Back
                      // should undo it. It is also why the control commits on a key
                      // press rather than on an arrow — four arrow presses would
                      // otherwise be four addresses.
                      void navigate(securityPath(symbol, next));
                    }}
                    sessions={sessions}
                  />
                }
              />
            </Region>
          </div>

          {/*
           * Epic 5's rail begins here, and the three regions that answer "how
           * unusual is this?" share a column for that reason rather than landing
           * in three unrelated corners of the page.
           */}
          <Region
            name="Abnormal-move indicators"
            filledBy="How unusual this security’s behaviour is right now, scored 0–100 with the reason beside it."
          >
            <RegionPlaceholder filledBy="Epic 5 — Anomaly Detection" />
          </Region>

          {/*
           * Directly under the price and at the same width, which is the one
           * adjacency in §8.3 that is not a preference: the two share an x-axis,
           * and a volume chart at a different width from the price above it
           * cannot be read against it.
           *
           * **Filled by Task 2.13.4**, and the sentence was amended in the same
           * commit as the drawing — a region that says it holds a plan while
           * holding a chart is the live claim `CLAUDE.md` says to amend rather
           * than leave standing. The same thing happened here at Task 2.12.4 for
           * the Price region.
           *
           * **And on 2026-09-14 the sentence is deleted rather than amended a
           * second time**, which is §71.3's judgement made again for the same
           * reason one region up: what was left was a caption for a picture
           * immediately below it, costing the drawing a paragraph of height at
           * every width — and here that paragraph sat in the one place on this
           * screen where height is most expensive, directly between two plots
           * that hang on one axis and have to be read against each other. The
           * region's *name* and its landmark are unchanged and still asserted.
           *
           * The chart is **inside** this region and not in a panel beside it,
           * which is the concrete defect `e2e/specs/security-price-chart.spec.ts`
           * exists to catch: jsdom computes no layout, so every unit and component
           * test is green either way.
           */}
          <div className={page.wide}>
            <Region name="Volume">
              <VolumeChart
                pending={series.screen.pending}
                stored={stored}
                symbol={symbol}
                view={series.screen.shown}
              />
            </Region>
          </div>

          <Region
            name="Relative performance"
            filledBy="This security measured against its sector proxy and the broad market, so a move can be told apart from a tide."
          >
            <RegionPlaceholder filledBy="Epic 5 — Anomaly Detection" />
          </Region>

          <Region
            name="Connected securities"
            filledBy="Which securities move with this one, and the evidence for saying so."
          >
            <RegionPlaceholder filledBy="Epic 6 — Market Topology" />
          </Region>

          <Region
            name="Relevant filings"
            filledBy="Primary-source evidence from SEC EDGAR — 8-K, 10-Q, 10-K — filed around the days this security moved."
          >
            <RegionPlaceholder filledBy="Epic 9 — Corporate Filing Evidence" />
          </Region>

          <Region
            name="Anomaly history"
            filledBy="Every earlier occasion this security behaved unusually, so today can be read against its own past."
          >
            <RegionPlaceholder filledBy="Epic 5 — Anomaly Detection" />
          </Region>

          {/*
           * **Where these numbers came from** (Task 2.14.3) — one note for the
           * screen, at the foot of the region group and above the tracked
           * universe, on the page ground rather than in a `Region`.
           *
           * It is **not** one of §8.3's seven contents: it is an account of the
           * other seven, which is why it declares no landmark and carries no
           * heading. `PROVENANCE.md` §1.3 settles the position and the rule
           * that keeps it to two lines — *the note states what the chrome
           * cannot, and never repeats what the chrome can* — and
           * `VISUAL-LANGUAGE.md`'s Provenance section is where the arrangement
           * lives, because Epic 3 extends this surface and Epic 8 has a
           * parallel kind of provenance to be consistent with.
           *
           * **Above the table rather than at the foot of the page**, which is
           * Task 2.14.2's fourth finding: the table is not one of the seven
           * contents either and it is not about this security, so a note about
           * this security's numbers placed under it would be a footnote to the
           * wrong thing.
           *
           * It reads `screen.shown` — what is drawn — for the reason every
           * other surface on this page does: while a newer request is in flight
           * the picture is the previous answer, and provenance for bars nobody
           * can see is worse than none.
           *
           * **It also reads the universe answer** (Task 2.14.4), which is the
           * same `useSecurities()` the identity block and the table already
           * read — no second request, and none needed: the curated file's claim
           * and its date have been on that body since Story 2.9. That clause is
           * why the note now appears on a page holding no bars at all, which is
           * every page CI renders.
           */}
          <div className={page.full}>
            <SourceNote
              shown={series.screen.shown}
              feed={marketFeed}
              securities={view}
              symbol={symbol}
            />
          </div>

          {/*
           * **The universe table stays, on both addresses, last and full width**
           * — Task 2.11.7's one open decision, and it was taken against three
           * inputs rather than against tidiness.
           *
           * It was underneath this page because it was the only way to find out
           * what symbols exist, and search retires that reason. What search does
           * **not** retire is the other two things it became. Since Task 2.11.5
           * every symbol in it is a link, so it is **a way in** — on
           * `/securities/:symbol` the only way to reach a second security without
           * typing one. And it owns the single control that re-asks for the
           * universe, which `SecuritySearch`'s failed-state copy points at by
           * name: *"the control that asks again is with the universe itself"*.
           * Moving the table to `/securities` alone would leave that sentence
           * grammatical and false on this route, and would make a failed universe
           * a dead end here.
           *
           * The cost is a long page, and it is paid deliberately: the table is
           * **last**, under all seven regions, so nothing a reader came for is
           * below it. Task 2.11.8 owns making 518 rows navigable.
           *
           * `filledBy` is where "there are no prices yet" is said, which is Story
           * 1.5's convention that a region names what fills it and when.
           */}
          <div className={page.full}>
            <Region
              name="Tracked universe"
              filledBy="The securities MarketPulse follows, with each one’s last stored close. Live prices arrive with the market feed in Epic 3."
            >
              {/*
               * `retry` is passed down rather than the table asking for the
               * universe itself. The same reason the hook is called here: a
               * component that fetches is a component the workshop cannot render,
               * and every one of this table's states is reviewable with no backend
               * running precisely because the only thing it does with the network
               * is take a callback for it (Task 2.10.2).
               */}
              <UniverseTable view={view} onRetry={retry} />
            </Region>
          </div>
        </div>
      </ChartAxis>
    </div>
  );
}
