import { useNavigate } from "react-router";

import { BarSeriesPanel } from "../components/BarSeriesPanel/BarSeriesPanel.js";
import { PageHeader } from "../components/PageHeader/PageHeader.js";
import { Region } from "../components/Region/Region.js";
import { RegionPlaceholder } from "../components/RegionPlaceholder/RegionPlaceholder.js";
import { SecurityIdentity } from "../components/SecurityIdentity/SecurityIdentity.js";
import { SecuritySearch } from "../components/SecuritySearch/SecuritySearch.js";
import { UniverseTable } from "../components/UniverseTable/UniverseTable.js";
import { useBarSeries } from "../market/index.js";
import { useSecurities } from "../use-securities.js";
import { securityPath } from "./paths.js";
import { useSecuritySymbol } from "./use-security-symbol.js";
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

/**
 * How many trading sessions the panel asks for by default.
 *
 * Five, and the reason is in the call site below: a named window always reaches
 * to the current session's close and the store is caught up nightly, so one or
 * two sessions is reliably an *empty* answer on a store holding 48 million
 * bars. Named rather than inlined so the story, the test and the route agree
 * about what "the default window" means.
 */
export const DEFAULT_SESSIONS = 5;

export function SecurityExplorer() {
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
  // `sessions=5` rather than a smaller number, and it is a measured choice
  // rather than a taste one (Task 2.10.6, recorded in TASK-07's amendment).
  // A named window always reaches to the *current* session's close, and the
  // store is caught up nightly — so `sessions=1` and `sessions=2` are both
  // `empty` on the local and the deployed store alike, which is a correct 200
  // that looks exactly like a broken data layer. Five reaches back past the
  // backfill's edge and has bars in it.
  //
  // The window is **named and never resolved here.** A browser in Singapore at
  // 09:00 local is on the previous market date in New York, so a client that
  // computes "the last five sessions" itself is off by one for half the world
  // for several hours of every day — and it produces a chart that is plausible
  // and shifted rather than an error anybody sees. The server resolves it and
  // reports back what it meant in `coverage.requested`, which is what the panel
  // renders.
  const series = useBarSeries({
    symbol,
    timeframe: "1m",
    window: { form: "named", sessions: DEFAULT_SESSIONS },
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
      <div className={page.grid}>
        {/*
         * The series region, first and two columns wide, because it is what
         * this route is named for.
         *
         * `filledBy` says what the region holds **and what it deliberately does
         * not**, which is Story 1.5's convention taken one step further than
         * the table needed. A panel of numbers where a reader expects a chart
         * looks unfinished unless it says the chart is a story away; saying so
         * is the difference between a fence and an omission.
         *
         * **The fence is charts.** Story 2.12 owns the charting decision and
         * should take it against a data layer already known to be right — a
         * sparkline slipped in here is that decision taken in the wrong place
         * by the wrong task.
         */}
        <div className={page.wide}>
          <Region
            name="Price"
            filledBy="One security's minute bars, stated rather than drawn. The chart itself arrives with Story 2.12."
          >
            <BarSeriesPanel
              view={series.view}
              symbol={symbol}
              onRetry={series.retry}
              defaulted={!fromAddress}
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
          filledBy="How unusual this security's behaviour is right now, scored 0–100 with the reason beside it."
        >
          <RegionPlaceholder filledBy="Epic 5 — Anomaly Detection" />
        </Region>

        {/*
         * Directly under the price and at the same width, which is the one
         * adjacency in §8.3 that is not a preference: the two share an x-axis,
         * and a volume chart at a different width from the price above it
         * cannot be read against it.
         *
         * It names a **story** rather than an epic, unlike the five below —
         * Story 2.13 is in this epic's committed scope, where an invented
         * story number is what `SEARCH-AND-SELECTION.md` §5 warns against.
         */}
        <div className={page.wide}>
          <Region
            name="Volume"
            filledBy="Traded volume across the same window as the price above it, which is why it sits directly beneath at the same width."
          >
            <RegionPlaceholder filledBy="Story 2.13 — Volume Chart" />
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
            filledBy="The securities MarketPulse follows, with each one's last stored close. Live prices arrive with the market feed in Epic 3."
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
    </div>
  );
}
