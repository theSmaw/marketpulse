import { SECTOR_LABELS } from "@marketpulse/shared";
import type { Security, SecurityKind } from "@marketpulse/shared";

import { Region } from "../components/Region/Region.js";
import { useSecurities } from "../use-securities.js";
import type { SecuritiesView } from "../use-securities.js";
import styles from "./routes.module.css";
import universe from "./SecurityExplorer.module.css";

// PRODUCT_SPEC.md §8.3 — "What is happening with this security?".
//
// **The first screen in MarketPulse that renders something true** (Task 2.4.3).
// It was a `Placeholder` from Story 1.5 until this task, and what replaced it
// is deliberately the plainest honest version: four columns, no grouping, no
// sorting control, no search. Task 2.4.4 owns what it looks like and Task 2.4.5
// owns the keyboard and screen-reader journey, and separating those from this
// is what stops "make it look right" from delaying "make it true" — the two
// catch different failures, and merged they would be one large change in which
// neither is clearly the cause of the other.
//
// **Still a route module rather than a component**, and that is the existing
// rule applied rather than a new judgement. `scripts/check-stories.mjs` walks
// `src/components/` and a `.tsx` there owes an `AllPermutations` grid; the
// question Task 1.5.3 settled is *does it have states worth reviewing side by
// side?* This has four, so the answer will be yes — but the states are Task
// 2.4.4's subject, and promoting the table to a workshop component before the
// task that designs those states would fix a shape one task early. It moves
// then, the way `Region` moved when it acquired a failed state.
//
// The symbol form of this route is still not declared: `paths.ts` says why,
// beside the table that would have to carry it, and it is Story 2.11's along
// with search and click-through.

/**
 * What kind of thing a row is, in words a user reads rather than the wire's
 * vocabulary.
 *
 * Local to this route rather than beside `SECTOR_LABELS` in `packages/shared`,
 * and the asymmetry is deliberate: that table exists because a sector is a
 * classification several epics will label, where this is the only place in the
 * product that has ever had to say what `sector_etf` means to a person. It
 * moves next to `SECTOR_LABELS` the day a second renderer needs it, which is
 * the rule this repository already applies to putting anything in `shared`.
 *
 * `Record<SecurityKind, string>` rather than a `switch`, so a fourth kind added
 * to `SECURITY_KINDS` is a compile error here rather than a row rendering the
 * raw enum member.
 */
const KIND_LABELS: Record<SecurityKind, string> = {
  equity: "Company",
  sector_etf: "Sector ETF",
  index_etf: "Index ETF",
};

/**
 * What fills the sector cell of a row that has no sector.
 *
 * An index ETF is the only kind whose `sector` is structurally `null` — it is a
 * proxy for the whole market rather than for part of it — so this is "there is
 * no answer" and not "the answer is missing". An empty cell would read as data
 * we failed to load, which is a different and untrue claim. Task 2.4.4 owns
 * whether an em dash is the right way to say it.
 */
const NO_SECTOR = "—";

function SecurityTableRow({ security }: { readonly security: Security }) {
  return (
    <tr className={universe.row}>
      <th scope="row" className={universe.symbol}>
        {security.symbol}
      </th>
      <td className={universe.cell}>{security.name}</td>
      <td className={universe.cell}>
        {security.sector === null ? NO_SECTOR : SECTOR_LABELS[security.sector]}
      </td>
      <td className={universe.cell}>{KIND_LABELS[security.kind]}</td>
    </tr>
  );
}

/**
 * The table, and the one thing about it that is easy to lose.
 *
 * **Every security the API returns is rendered, `untracked` ones included.**
 * `status` is this schema's one invisible predicate and `UNIVERSE.md` §12.2 puts
 * this reader on the *do not filter* side: a symbol removed from the curated
 * file is marked and kept, because Story 2.8's bars hang off it and Epic 13
 * replays a date on which it was tracked. Silently dropping the row is exactly
 * the failure a `deleted_at` column would have caused.
 *
 * That is easy to get wrong and impossible to notice: the deployed table is 101
 * rows and every one of them is `active`, so a version of this component that
 * filtered would pass every check this task can run. The test for it constructs
 * an untracked row rather than waiting for one to exist.
 *
 * **Marking the row visibly is Task 2.4.4's**, along with the page's two counts
 * — rows held and securities tracked, which stop being the same number at the
 * first removal. What this task owes is that the row is on screen at all.
 *
 * The rows arrive **already ordered by symbol**: Task 2.4.1 put the `order by`
 * in the query, because Postgres guarantees no order without one. So this sorts
 * nothing of its own, and grouping the eleven sectors is Task 2.4.4's decision
 * rather than a thing half-done here.
 */
function SecurityTable({
  securities,
}: {
  readonly securities: readonly Security[];
}) {
  return (
    <table className={universe.table}>
      <thead>
        <tr>
          <th scope="col" className={universe.heading}>
            Symbol
          </th>
          <th scope="col" className={universe.heading}>
            Name
          </th>
          <th scope="col" className={universe.heading}>
            Sector
          </th>
          <th scope="col" className={universe.heading}>
            Kind
          </th>
        </tr>
      </thead>
      <tbody>
        {securities.map((security) => (
          <SecurityTableRow key={security.symbol} security={security} />
        ))}
      </tbody>
    </table>
  );
}

/**
 * Render the state, rather than infer it.
 *
 * A `switch` over the discriminated union, which is the whole reason
 * `SecuritiesView` is a union rather than three booleans: `tsc` refuses this
 * function if a member is added and not handled, and there is no combination of
 * flags here that could contradict itself.
 *
 * All four branches are honest about a different thing, and the middle two are
 * the ones a first implementation collapses. `empty` is not a failure — it is a
 * database that was migrated and never seeded, which is a real production state
 * reachable by a deploy whose `pnpm universe` step did not run — and `failed`
 * says which of the two things went wrong rather than "something went wrong",
 * because those have different answers.
 */
function UniverseContent({ view }: { readonly view: SecuritiesView }) {
  switch (view.state) {
    case "loading":
      return (
        <p className={universe.state} aria-live="polite">
          Loading the tracked universe…
        </p>
      );

    case "loaded":
      return <SecurityTable securities={view.securities} />;

    case "empty":
      return (
        <p className={universe.state}>
          This service is running and holds no securities. The database has been
          migrated but the universe has not been loaded into it.
        </p>
      );

    case "failed":
      return (
        <div className={universe.state}>
          <p>
            {view.failure === "unreachable"
              ? "The service could not be reached, so the tracked universe is not available."
              : "Something answered at the service’s address and it was not this service."}
          </p>
          {/*
           * The correlation id, and this is the first place in the product that
           * puts one on screen. `api-client.ts` owns the rule: the whole id,
           * never a prefix — it is a UUID v4 with no internal structure, so
           * eight characters of it match nothing in a log — and only ever as a
           * labelled reference beside a failure the user is already being told
           * about. `null` when nothing arrived to carry one, which is most of
           * the `unreachable` cases.
           */}
          {view.requestId === null ? null : (
            <p className={universe.reference}>Reference: {view.requestId}</p>
          )}
        </div>
      );
  }
}

export function SecurityExplorer() {
  // The hook is called here rather than inside the region, so a table that
  // throws hits `Region`'s own boundary and leaves the request that produced it
  // alone — the same argument `App` makes for calling `useBackendHealth`
  // outside the header's boundary.
  const view = useSecurities();

  return (
    <div className={universe.page}>
      {/*
       * **The heading is the route's own name and matches the navigation link
       * that reaches it**, which is PRODUCT_SPEC.md §8.3's vocabulary. The first
       * draft of this task called it "Securities" and the browser gate caught
       * it: `backend-failure-states.spec.ts` walks every route asserting its
       * `<h1>`, and `specs-deployed/host-routing.spec.ts` deep-links to this
       * path and asserts the same. Both went red, correctly — a page whose
       * heading disagrees with the link a user clicked to reach it is a real
       * defect, and the specs were right where the rename was wrong.
       *
       * There is no micro-label above it. `routes.module.css`'s `.label` says
       * *what kind of thing this screen is* — "Placeholder", "Not found" — and
       * this is no longer either, so a label here would be furniture rather
       * than information.
       *
       * Whether this route should be called something else now that its first
       * content is the universe rather than one security is Task 2.4.4's, and
       * it moves three things together if so: this heading, `AppHeader`'s link
       * label, and both specs.
       */}
      <h1 className={styles.title}>Security Explorer</h1>

      {/*
       * Inside `Region` so the table inherits the landmark, the heading and the
       * error boundary rather than acquiring three near-copies of them. This is
       * the first use of that component outside the landing route's grid, and
       * it behaves: `overflow: auto` and `min-height: 0` are no-ops in a box
       * that is not height-constrained, and `tabIndex={0}` is the WCAG 2.1.1
       * fix that has to stay whether or not this particular box scrolls today.
       *
       * `filledBy` is where "there are no prices yet" is said, which is Story
       * 1.5's convention that a region names what fills it and when. A page of
       * securities with no prices looks broken unless it says why it is not.
       */}
      <Region
        name="Tracked universe"
        filledBy="The securities MarketPulse follows. Prices, volume and charts arrive with the live market feed in Epic 3."
      >
        <UniverseContent view={view} />
      </Region>
    </div>
  );
}
