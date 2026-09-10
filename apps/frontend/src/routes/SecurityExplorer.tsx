import { Region } from "../components/Region/Region.js";
import { UniverseTable } from "../components/UniverseTable/UniverseTable.js";
import { useSecurities } from "../use-securities.js";
import styles from "./routes.module.css";
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
// The symbol form of this route is still not declared: `paths.ts` says why,
// beside the table that would have to carry it, and it is Story 2.11's along
// with search and click-through.

export function SecurityExplorer() {
  // The hook is called here rather than inside the region, so a table that
  // throws hits `Region`'s own boundary and leaves the request that produced it
  // alone — the same argument `App` makes for calling `useBackendHealth`
  // outside the header's boundary.
  const { view, retry } = useSecurities();

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
       * There is no micro-label above it. `routes.module.css`'s `.label` says
       * *what kind of thing this screen is* — "Placeholder", "Not found" — and
       * this is no longer either.
       */}
      <h1 className={styles.title}>Security Explorer</h1>

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
        filledBy="The securities MarketPulse follows. Prices, volume and charts arrive with the live market feed in Epic 3."
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
