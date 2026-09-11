import { useNavigate } from "react-router";

import { BarSeriesPanel } from "../components/BarSeriesPanel/BarSeriesPanel.js";
import { PageHeader } from "../components/PageHeader/PageHeader.js";
import { Region } from "../components/Region/Region.js";
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
// The page serves both addresses and renders the same two regions for each.
// `/securities` shows a default security and says so; `/securities/AMD` shows
// that one. The universe table stays underneath in both, because until search
// ships it is the only way to find out what symbols exist.

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
       * **Rendered only when the universe has loaded**, because a matcher with
       * nothing to match against is not a state this task decides. Every other
       * state of this control — loading, unreachable, answered badly — is
       * Task 2.11.6's, deliberately: this task is about the control working and
       * that one is about it being honest, and combining them is how the second
       * half gets shortened.
       *
       * Where the table ends up underneath is Task 2.11.7's; that the field
       * sits above whatever it becomes is settled here.
       */}
      {view.state === "loaded" ? (
        <SecuritySearch
          universe={view.securities}
          lastCloses={view.lastCloses}
          onOpen={(symbol) => {
            // The one spelling of this destination. `securityPath` is the only
            // thing that builds one from `ROUTE_PATTERNS.security`, and a push
            // rather than a replace is what keeps Back working.
            void navigate(securityPath(symbol));
          }}
        />
      ) : undefined}

      {/*
       * The series region, above the universe, because it is what this route is
       * named for: §8.3 asks *"what is happening with this security?"*, and the
       * table below answers *"which securities are there?"* — a supporting
       * question until Story 2.11 turns it into navigation.
       *
       * `filledBy` says what the region holds **and what it deliberately does
       * not**, which is Story 1.5's convention taken one step further than the
       * table needed. A panel of numbers where a reader expects a chart looks
       * unfinished unless it says the chart is a story away; saying so is the
       * difference between a fence and an omission.
       */}
      <Region
        name="Market data"
        filledBy="One security's minute bars, stated rather than drawn. Charts arrive with Stories 2.12 and 2.13."
      >
        <BarSeriesPanel
          view={series.view}
          symbol={symbol}
          onRetry={series.retry}
          defaulted={!fromAddress}
        />
      </Region>

      {/*
       * Inside `Region` so the table inherits the landmark, the heading and the
       * error boundary rather than acquiring three near-copies of them.
       *
       * `filledBy` is where "there are no prices yet" is said, which is Story
       * 1.5's convention that a region names what fills it and when. A page of
       * securities with no prices looks broken unless it says why it is not.
       */}
      <Region
        name="Tracked universe"
        filledBy="The securities MarketPulse follows, with each one's last stored close. Live prices arrive with the market feed in Epic 3."
      >
        {/*
         * `retry` is passed down rather than the table asking for the universe
         * itself. The same reason the hook is called here: a component that
         * fetches is a component the workshop cannot render, and every one of
         * this table's states is reviewable with no backend running precisely
         * because the only thing it does with the network is take a callback
         * for it (Task 2.10.2).
         */}
        <UniverseTable view={view} onRetry={retry} />
      </Region>
    </div>
  );
}
