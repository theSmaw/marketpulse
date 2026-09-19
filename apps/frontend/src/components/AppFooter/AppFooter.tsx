import type { BackendDegradedCause, BackendStatus } from "@marketpulse/shared";
import type { RefObject } from "react";
import { useEffect, useRef } from "react";

import { cx } from "../../cx.js";
import { BackendIndicator } from "../BackendIndicator/BackendIndicator.js";
import { FeedIndicator } from "../FeedIndicator/FeedIndicator.js";
import { FeedProvenance } from "../FeedProvenance/FeedProvenance.js";
import type { LiveFeedView } from "../../market/index.js";
import type { MarketFeedView } from "../../use-market-feed.js";
import styles from "./AppFooter.module.css";

// The application's status bar, at the bottom (2026-09-16).
//
// ## Why these two facts are down here
//
// They were in a strip under the masthead from Story 1.5 to this change, beside
// the market clock, and the arrangement was rebuilt twice in one day before the
// actual problem became sayable: **the three facts in it were not the same kind
// of fact**, and no amount of rearranging three things fixes a set that should
// have been two sets.
//
// The market clock answers a question a person asks *while reading a price* —
// is the market open, and how long until it is? It belongs where the eye
// already is, which is the top of the screen, and it is now in the masthead.
//
// These two answer *is the software working, and where do its numbers come
// from* — questions a person asks **once**, or at the moment something looks
// wrong. That is a status bar, and a status bar goes at the bottom. Every
// terminal, IDE and trading application this product is trying to read like
// puts exactly this content exactly here, and the reason is not convention: the
// bottom edge is where a fact can be permanently available without competing
// for the attention the data at the top is asking for.
//
// ## Why it is sticky, and what that costs
//
// **The recorded reason `BackendIndicator` exists at all is that it survives
// the page body.** `AppHeader`'s own notes state it: a failure inside the
// router blanks `<main>` — four named landmarks and the 70vh grid — under a
// chrome that still renders, measured in Task 1.5.5. A footer at the end of the
// document would keep the landmark and lose the property, and lose it worst
// exactly where it matters: the Security Explorer is twenty thousand pixels
// tall with the universe table on it, so "at the bottom of the page" there
// means "never seen".
//
// The cost is one band of about 32px and a second occlusion edge. The edge is
// paid the way the top one is — this measures itself and publishes
// `--sticky-footer-height`, and `base.css` spends it on `scroll-padding-bottom`
// and on the page's own bottom padding, so nothing is scrolled to underneath it
// and nothing is drawn underneath it either. That is the same mechanism Task
// 2.11.9 built for the masthead rather than a second one.
//
// **Reversal trigger: the third fact that wants to be in here.** Two
// indicators on one line is a status bar; four is the strip this replaced,
// moved to the other end of the screen.
//
// ## It is a `<footer>`, and that is a landmark this application did not have
//
// `contentinfo`, and it is the second landmark in the chrome after the header's
// `banner`. Both are top-level — outside `<main>` — which is the condition
// HTML puts on the mapping, and the one `PageHeader` deliberately fails (see
// its own notes: a `<header>` inside `<main>` maps to `banner` in a real
// browser and to nothing in the accessibility mapping the component tests use,
// so it renders a `<div>`). Nothing here has that problem, because nothing here
// is inside anything.
//
// ## The props are the header's, unchanged
//
// Four backend fields and one feed view, spread and whole respectively, for the
// reasons `AppHeader` argued when it had them: the four are independent values
// whose impossible combinations a renderer would otherwise have to be trusted
// not to construct, and `MarketFeedView` is a discriminated union, which is the
// shape that already makes them unconstructible. `App` owns both network loops
// and this component knows about neither.

export interface AppFooterProps {
  /**
   * What this deployment knows about the **market feed's provenance** — which
   * venues are in the numbers it serves.
   *
   * Invariant 6 is the reason this is a rendered fact rather than an implied
   * one, and moving it from the masthead's strip to here does not touch that:
   * it is still stated on every screen, in the chrome, from the backend, and
   * `PROVENANCE.md` §1.3's rule that the Security Explorer's source note
   * "states what the chrome cannot, and never repeats what the chrome can"
   * still has a chrome to defer to.
   */
  readonly marketFeed: MarketFeedView;

  /** The **backend service's** state, and the three fields that go with it. */
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

  /**
   * Is data arriving right now (Task 3.3.5).
   *
   * **A second fact in the same cell, not a third cell**, and the reason is the
   * subject: the venue and the connection both describe *the market feed*,
   * while the clock describes the market and the cell opposite describes us.
   * Grouping the connection with the clock — which is where
   * `PRODUCT_SPEC.md` §9's mock drew it, an epic before this chrome existed —
   * would put it with the wrong subject because it happens to change at a
   * similar rate, and would leave a reader assembling two facts four inches
   * apart.
   */
  readonly liveFeed: LiveFeedView;
}

export function AppFooter({
  marketFeed,
  liveFeed,
  backendStatus,
  backendDegradedCause,
  backendLastSuccessAt,
  backendHasChecked,
}: AppFooterProps) {
  const footer = useStickyFooterHeight();

  return (
    <footer className={styles.footer} ref={footer}>
      {/*
        The feed leads, because it is the one a reader consults deliberately —
        *where do these numbers come from* is a question about the product,
        asked once — while the service's state is the one that interrupts. The
        deliberate question gets the left edge, which is where reading starts;
        the interruption gets the right, where a change in the corner of the eye
        is what a status bar is for.
      */}
      <div className={cx(styles.cell, styles.feedCell)}>
        <p className={styles.microLabel}>Market feed</p>
        {/*
          Provenance first, the connection last. The cell already reads
          *subject → provenance → qualifier*, and the strip's own rule puts the
          deliberate question at the reading edge and the changing one toward
          the corner of the eye.

          **`FeedIndicator` renders nothing at all** on a deployment with no
          provider and before the first message lands — §11.3's `—`. Nothing
          collapses, because `FeedProvenance` beside it is saying `not
          configured` or `checking`; that is the difference from
          `BackendIndicator`, whose cell would be empty without a placeholder.

          When the connection is degraded the cell carries **two** sentences and
          the bar grows to a second row. That is deliberate and it is the
          cheaper of the two answers: suppressing the venue's sentence to keep
          one row would make a coverage claim conditional on a socket's health,
          which is exactly when a reader is most likely to misread numbers they
          are still looking at. `useStickyFooterHeight` publishes whatever the
          bar measures, so the page's padding follows without being told.
        */}
        <FeedProvenance view={marketFeed} />
        <FeedIndicator view={liveFeed} />
      </div>

      <div className={cx(styles.cell, styles.serviceCell)}>
        <p className={styles.microLabel}>Backend service</p>
        <BackendIndicator
          status={backendStatus}
          degradedCause={backendDegradedCause}
          lastSuccessAt={backendLastSuccessAt}
          hasChecked={backendHasChecked}
        />
      </div>
    </footer>
  );
}

/**
 * Publish how much of the bottom of the viewport this bar is sitting over, as
 * `--sticky-footer-height` on the document element.
 *
 * **The mirror of `AppHeader`'s `useStickyChromeHeight`, and deliberately a
 * second copy of it rather than a shared hook.** They are eleven lines each,
 * they publish different variables read by different declarations, and the one
 * thing that would make sharing worth it — a third sticky edge — does not
 * exist. What is shared is the *reasoning*, and that is written down once, in
 * `AppHeader`, with this comment pointing at it. A `useStickyEdge(name, ref)`
 * taking a custom-property name as an argument is the kind of abstraction that
 * makes two call sites harder to read than two functions.
 *
 * The three things worth repeating, because a reader here should not have to go
 * and find them:
 *
 *   - **`position` is checked rather than assumed.** In the workshop this bar
 *     renders inside a story with no sticky positioning, where it occludes
 *     nothing and reserving its height would be wrong rather than harmless.
 *   - **A `ResizeObserver` rather than a one-off read**, because the height
 *     changes without a re-render of this component: the bar wraps to two rows
 *     below 768, and a font that loads late moves it too.
 *   - **Feature-detected**, because `ResizeObserver` does not exist in jsdom
 *     and an unguarded constructor takes every one of this component's tests
 *     down with a `ReferenceError`. The fallback is right rather than merely
 *     safe: an environment with no observer has no layout either, `position`
 *     reads as nothing, and the one-off publish resolves to `0px`, which is
 *     the truth there.
 */
function useStickyFooterHeight(): RefObject<HTMLElement | null> {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (element === null) return;

    const root = document.documentElement;
    const publish = () => {
      const { position } = getComputedStyle(element);
      const sticky = position === "sticky" || position === "fixed";
      // Rounded up for the masthead's reason: the height is fractional at some
      // zoom levels and a pixel short is a pixel of the focus ring behind the
      // bar.
      const height = sticky
        ? Math.ceil(element.getBoundingClientRect().height)
        : 0;
      root.style.setProperty("--sticky-footer-height", `${String(height)}px`);
    };

    publish();

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(publish);
    observer?.observe(element);

    return () => {
      observer?.disconnect();
      // Removed rather than zeroed, so `base.css`'s fallback is what applies
      // when there is no bar — one answer for "nobody has said", rather than a
      // stale zero that looks like a measurement.
      root.style.removeProperty("--sticky-footer-height");
    };
  }, []);

  return ref;
}
