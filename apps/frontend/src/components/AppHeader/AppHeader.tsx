import type { BackendDegradedCause, BackendStatus } from "@marketpulse/shared";
import { NavLink } from "react-router";

import { cx } from "../../cx.js";
import { BackendIndicator } from "../BackendIndicator/BackendIndicator.js";
import { FeedProvenance } from "../FeedProvenance/FeedProvenance.js";
import { MarketClock } from "../MarketClock/MarketClock.js";
import { PATHS } from "../../routes/paths.js";
import type { MarketFeedView } from "../../use-market-feed.js";
import { useMarketClock } from "../../use-market-clock.js";
import styles from "./AppHeader.module.css";

// The application chrome PRODUCT_SPEC.md §9 sketches: the product name, a
// market clock area, a connection status area, and the navigation between §8's
// four experiences. Rendered once, outside `<Routes>`, so it survives
// navigation rather than being remounted by it.
//
// **The status strip is three regions since Task 1.12.5**: the market feed, the
// backend service and the market clock. **Two of the three are driven by
// something real since Task 2.5.5** — `App` polls `/health` and passes the
// result down, and the clock reads the system clock through `useMarketClock`
// here — which is what makes this header the one place in the application where
// a failure of the backend is visible, and now also the first thing in the
// product that is *alive* in PRODUCT_SPEC.md §5.6's sense. The market feed is
// still hard-coded and still correctly reads `DISCONNECTED`: there is no market
// data until Epic 3.
//
// **The clock's hook is called here rather than in `App`, and that is a
// decision this component would not otherwise take** (Task 2.5.5). Task 1.12.5
// accepted a whole-tree re-render on every 30-second health poll and recorded
// the reversal trigger beside it — "a second consumer, or a render rate that is
// no longer a poll". A 1 Hz clock is sixty times that rate and mutates the DOM
// on every tick, so the trigger fired: lifting it to `App` would re-render
// `<Routes>`, the current route, all four `Region`s and the landing route's
// 36-row table once a second for a text node in the chrome. Called here, the
// tick reaches this subtree and stops.
//
// That is not a hole in the four-props rule below, and the distinction is worth
// keeping: that rule is about acquiring a dependency on a **network loop** —
// state, failure states, an `AbortController`, a thing a story would have to
// construct. `useMarketClock` makes no request and has no failure states, and
// `MarketClock` itself stays presentational so all six of its renderings are
// reviewable in the workshop.
//
// It being eager and outside `<Routes>` is what makes that indicator worth
// having. A failure inside the router blanks `<main>` — four named landmarks
// and the 70vh grid — under a header that still renders, measured in Task
// 1.5.5, so the status survives the page body. The cost is stated rather than
// discovered: this component sits inside its own `ErrorBoundary` (Task 1.7.6)
// whose fallback replaces the `<header>`, so a broken chrome takes the banner
// landmark, the navigation **and this indicator** with it. The poll itself is
// unaffected — it is called in `App`, outside that boundary, on purpose.
//
// **This is a component and not page shell, and that is the boundary decision
// Task 1.4.5 left to this story.** The line is: does it have states worth
// reviewing side by side? A route placeholder has one state made of two
// strings, so `src/routes/` stays outside the workshop. This header has three
// feed states, four backend renderings, an optional detail line and four
// current-route states, and the
// only other way to review them is to hard-code a status and click through the
// running application. That is exactly what the workshop is for. `App.tsx` and
// `main.tsx` stay exempt for the opposite reason — they are the mount and the
// router's host, and neither renders anything to look at. The same rule is
// written beside the check that enforces it, in `scripts/check-stories.mjs`.
//
// The identity here is entirely structural: no brand hue, no distinctive
// typeface. What makes this read as the product rather than a default admin
// panel is the warm ground, the 1px near-black hairline under the strip, the
// uppercase letterspaced micro-labels and the 4px grid — see VISUAL-LANGUAGE.md
// in Story 1.4's directory. Substituting a grey border looks like nothing in
// isolation and loses the whole look.

export interface AppHeaderProps {
  /**
   * What this page knows about the **market feed's provenance** — which venues
   * are in the numbers this deployment serves (Task 2.6.7).
   *
   * **One prop rather than spread fields, which is the opposite of the backend
   * four below and is not an inconsistency.** That rule exists because those
   * four are *independent* values whose impossible combinations a component
   * would have to be trusted not to construct. `MarketFeedView` is a
   * discriminated union, which is the shape that makes those combinations
   * unconstructible — so spreading it would hand the renderer back exactly the
   * space it removes. `UniverseTable` takes `SecuritiesView` whole for the same
   * reason.
   *
   * It is still a network loop's result, and the header still does not know
   * that: this is a value, and `App` owns the call.
   */
  readonly marketFeed: MarketFeedView;

  /**
   * The **backend service's** state, and the three fields that go with it.
   *
   * These are four props rather than one `health: BackendHealth` object, and
   * the collapse is the thing to resist rather than the tidy-up to make. A
   * prop named after a hook's return type is how a presentational component
   * acquires a dependency on a network loop: `AppHeader` would then be a
   * component that cannot be rendered without knowing what `useBackendHealth`
   * returns, and its stories and tests would have to construct one. Four
   * fields spread through a header that already takes `feedStatus` and
   * `feedDetail` is the same shape it already has.
   *
   * They are prefixed `backend` for the reason the feed's are prefixed `feed`:
   * this header carries two indicators reporting two facts that fail
   * independently, and a bare `status` here would be ambiguous between them.
   *
   * The hook's fifth field, `lastSuccess`, is deliberately not here. Its only
   * interesting member is `version`, which is `"0.0.0"` on purpose — the image
   * tag and its digest are what answer "what is deployed" — so nothing renders
   * it and passing it would be a prop with no reader.
   */
  readonly backendStatus: BackendStatus;

  /** Which cause made it `degraded`, and `null` in every other state. */
  readonly backendDegradedCause: BackendDegradedCause | null;

  /** When the last successful check completed, or `null` if none ever has. */
  readonly backendLastSuccessAt: Date | null;

  /**
   * Has any check settled yet? Before the first one has, the indicator renders
   * a neutral placeholder rather than the hook's literally-true-but-
   * uninteresting `unreachable` — see `BackendIndicator`.
   */
  readonly backendHasChecked: boolean;
}

// Every `to` reads from `PATHS`. React Router's `to` is a plain string, so a
// literal typed here would be caught by nothing until somebody clicked it —
// the path table is the mitigation and it only works if it is used.
const NAVIGATION = [
  { to: PATHS.overview, label: "Market Overview" },
  { to: PATHS.investigations, label: "Investigation Workspace" },
  { to: PATHS.securities, label: "Security Explorer" },
  { to: PATHS.replay, label: "Market Replay" },
] as const;

export function AppHeader({
  marketFeed,
  backendStatus,
  backendDegradedCause,
  backendLastSuccessAt,
  backendHasChecked,
}: AppHeaderProps) {
  // The one clock read on any path that reaches the market — see
  // `use-market-clock.ts`, and the paragraph above for why the call site is
  // here and not in `App`.
  const clock = useMarketClock();

  return (
    <header className={styles.header}>
      {/* The product name is a `<p>`, not an `<h1>`, and Task 1.5.2 demoted it
          deliberately: every route renders its own `<h1>`, and two on a page
          leaves a screen reader user with no single answer to "what is this
          page?". Promoting it back here would reintroduce the problem on every
          route at once. */}
      <p className={styles.productName}>MarketPulse</p>

      <div className={styles.status}>
        {/*
          The market feed, and since Task 2.6.7 it says something true.

          The comment that used to sit here said invariant 6's provenance label
          belonged in this region and was "deliberately not written yet, because
          there is no market data in this application". That was right about the
          placement and wrong about the precondition, which is the correction
          this task makes: **provenance is a fact about our configuration, not
          about a number**, so it is answerable before a single price exists —
          and it was the hard-coded `DISCONNECTED` beside it that was the claim
          with nothing behind it.

          Not a fourth region, deliberately. `.clock` is `align-items:
          flex-end` because it is the end of the strip, so a region appended
          after it takes that edge away (Task 1.12.5 hit this once already), and
          `AppHeader`'s own `AllPermutations` stopped being a cartesian product
          for a reason a fourth axis makes worse. Provenance is what this region
          is *for*; it does not need one of its own.
        */}
        <div className={cx(styles.region, styles.feedRegion)}>
          <p className={styles.microLabel}>Market feed</p>
          <FeedProvenance view={marketFeed} />
        </div>

        {/*
          The backend service, and it is a **third region** rather than a
          second thing inside the feed's (Task 1.12.5).

          The micro-label names the **service**, not the connection and not the
          network. "Connection" was the obvious word and is wrong twice over:
          the states already say "unreachable", which is a statement about
          reaching it, so the label would be redundant — and worse, a strip
          holding two indicators would then have one labelled by the thing being
          reported on and one by the act of reaching it, which is exactly the
          ambiguity two separate indicators exist to remove.

          It sits **before** the clock deliberately. `.clock` is
          `align-items: flex-end` because it is the end of the strip, and a
          region appended after it would take that edge away — so the two status
          facts are adjacent, which is also where they are most comparable, and
          the clock keeps the right-hand edge it is aligned to.
        */}
        <div className={cx(styles.region, styles.serviceRegion)}>
          <p className={styles.microLabel}>Backend service</p>
          <BackendIndicator
            status={backendStatus}
            degradedCause={backendDegradedCause}
            lastSuccessAt={backendLastSuccessAt}
            hasChecked={backendHasChecked}
          />
        </div>

        {/*
          The clock, and it is a clock now (Task 2.5.5).

          This region reserved the space with a `--:--:--` placeholder from
          Story 1.5 to Story 2.5, deliberately: a plausible-looking `00:00:00`
          would have been a fake time. The placeholder's own comment predicted
          the one-off width shift when hyphens became digits — hyphens are not
          in the font's tabular set — and paying it was always the better trade
          than a placeholder that lied.

          **It shipped here rather than in Epic 3, and `STORY.md` is amended
          rather than left contradicting itself.** A clock is a fact about the
          *calendar*: it needs a timezone and a session definition, both of
          which exist after Task 2.5.4, and none of Epic 3's live feed. What
          stays Epic 3's is the `LIVE` word in §9's sketch and anything else
          claiming data is arriving — which is the feed's region, two cells to
          the left.
        */}
        <div className={cx(styles.region, styles.clock)}>
          <p className={styles.microLabel}>Market clock</p>
          <MarketClock reading={clock} />
        </div>
      </div>

      {/*
        A four-item navigation is a `<nav>` and four links. Reaching for a menu
        primitive here would make this the second file importing
        `@base-ui/react` and widen that seam for nothing.

        NavLink sets `aria-current="page"` on the match itself, so the
        accessible state and the visible one are the same fact rather than two,
        and the stylesheet selects on the attribute. `end` on the landing route
        stops `/` matching every path beneath it. There is no focus rule in the
        stylesheet either: `base.css` carries one global `:focus-visible`
        outline and a link declaring its own is answering a question the token
        layer already answered.
      */}
      <nav aria-label="Primary" className={styles.nav}>
        {NAVIGATION.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === PATHS.overview}
            /* `cx` around a single class, which looks redundant and is not: a
               CSS Module class is `string | undefined` under
               `noUncheckedIndexedAccess`, NavLink's `className` is
               `string | ((props) => string | undefined)`, and under
               `exactOptionalPropertyTypes` that mismatch is a hard TS2375
               rather than a lint warning. Every Base UI primitive taking a
               `className` has the same shape. */
            className={cx(styles.navLink)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
