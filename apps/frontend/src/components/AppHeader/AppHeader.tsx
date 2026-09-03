import type {
  BackendDegradedCause,
  BackendStatus,
  FeedStatus,
} from "@marketpulse/shared";
import { NavLink } from "react-router";

import { cx } from "../../cx.js";
import { BackendIndicator } from "../BackendIndicator/BackendIndicator.js";
import { FeedIndicator } from "../FeedIndicator/FeedIndicator.js";
import { PATHS } from "../../routes/paths.js";
import styles from "./AppHeader.module.css";

// The application chrome PRODUCT_SPEC.md §9 sketches: the product name, a
// market clock area, a connection status area, and the navigation between §8's
// four experiences. Rendered once, outside `<Routes>`, so it survives
// navigation rather than being remounted by it.
//
// **The status strip is three regions since Task 1.12.5**: the market feed, the
// backend service and the reserved clock. Only the second of them is driven by
// anything real — `App` polls `/health` and passes the result down — and that
// is what makes this header the one place in the application where a failure of
// the backend is visible.
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
   * The **market feed's** state, not the backend service's. Hard-coded by the
   * caller until Epic 3 supplies a feed.
   *
   * Task 1.12.4 answered the question this comment used to point at: the
   * backend connection is **not** the same fact, and it gets a second
   * indicator — `components/BackendIndicator` — beside this one rather than
   * widening `FeedStatus`. The reasoning is written out there; the short form
   * is that `FeedStatus` is something the backend *reports* about the market
   * data and `BackendStatus` is something this client *concludes* about
   * whether the backend answered at all, they fail independently, and a user
   * needs both answers. Task 1.12.5 is what puts the second one in this file.
   */
  readonly feedStatus: FeedStatus;

  /**
   * The half of PRODUCT_SPEC.md §36's message that carries the information —
   * "displaying data through 10:42:17". The chrome is the one place with room
   * for it, which is why `FeedIndicator` made it optional.
   */
  readonly feedDetail?: string;

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
  feedStatus,
  feedDetail,
  backendStatus,
  backendDegradedCause,
  backendLastSuccessAt,
  backendHasChecked,
}: AppHeaderProps) {
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
          The connection status area. `FeedIndicator` already knows that none
          of its three states is an error — §36 makes stale and disconnected
          product states — so this is a placement, not a coloured dot invented
          here.

          It is the **market feed's** indicator and it stays that way. The
          backend service's state is the second region below
          (`components/BackendIndicator`, Task 1.12.4, wired in here by Task
          1.12.5) — two indicators sharing one marker language rather than one
          indicator carrying two vocabularies.

          This region is also where invariant 6's provenance label belongs
          ("Market feed: IEX", because the free tier is not consolidated SIP).
          It is deliberately **not** written yet: there is no market data in
          this application, and a provenance claim with nothing behind it is
          the kind of statement the invariant exists to prevent. Epic 3 adds
          it here, beside the status.
        */}
        <div className={styles.region}>
          <p className={styles.microLabel}>Market feed</p>
          {feedDetail === undefined ? (
            <FeedIndicator status={feedStatus} />
          ) : (
            <FeedIndicator status={feedStatus} detail={feedDetail} />
          )}
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
          The clock area is a region, not a clock. Epic 3 supplies the live
          market clock; what this reserves is the space, and reserving it
          correctly is the whole job — a continuously changing time in a fixed
          strip is precisely what `font-variant-numeric: tabular-nums` on
          `body` exists for, and it is inherited here rather than re-declared.

          `--:--:--` rather than a plausible-looking `00:00:00`, which would be
          a fake time. The reserved width is close but not exact: tabular
          figures fix the width of digits, and a hyphen is not a digit, so the
          strip will shift slightly the first time the real clock renders.
          Better a visible small shift then than a placeholder that lies now.
        */}
        <div className={cx(styles.region, styles.clock)}>
          <p className={styles.microLabel}>Market clock</p>
          <p className={styles.clockValue}>
            <span>--:--:--</span> <span className={styles.clockZone}>ET</span>
          </p>
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
