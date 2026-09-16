import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { NavLink } from "react-router";

import { cx } from "../../cx.js";
import { Icon } from "../Icon/Icon.js";
import { MarketClock } from "../MarketClock/MarketClock.js";
import { PATHS } from "../../routes/paths.js";
import { useMarketClock } from "../../use-market-clock.js";
import styles from "./AppHeader.module.css";

// The application chrome PRODUCT_SPEC.md §9 sketches: the product name, a
// market clock area and the navigation between §8's four experiences. Rendered
// once, outside `<Routes>`, so it survives navigation rather than being
// remounted by it.
//
// ## One row again, since 2026-09-16
//
// It was two from the 2026 refresh until then — a 56px masthead over a status
// strip carrying **three** facts that fail independently: the market feed, the
// backend service and the market clock. That strip was rearranged twice in one
// day, from three right-aligned runs of text to a divided cluster to three
// cells spread edge to edge, and each version was better than the last and none
// of them was right.
//
// What none of them addressed is that **the three were not the same kind of
// fact**. A clock answers a question a person asks *while reading a price* — is
// the market open, and how long until it is? The other two answer *is the
// software working* and *where do these numbers come from*, which are asked
// once, or at the moment something looks wrong. Three things arranged into one
// band will always look like a band of miscellany when one of them belongs
// beside the data and two of them belong out of the way.
//
// So the clock came up into the masthead, where there were about 615px of
// unused row between the last tab and the right edge, and the other two went
// down to `AppFooter` — a sticky status bar at the bottom of the viewport,
// which is where every terminal, IDE and trading application this product is
// trying to read like puts exactly that content. The chrome went from 132px to
// 56, and the strip's own reason for existing survived the move intact.
//
// **The one-row argument that was rejected in the refresh is not what was
// adopted here, and the difference is the point.** That proposal kept all three
// facts and dropped their labels to fit, which would have made a strip of three
// unlabelled status words — `FeedProvenance`, `BackendIndicator` and
// `MarketClock` each render one — and taken four browser specs with it. This
// keeps every label and moves two of the facts somewhere else.
//
// ## The clock's hook is called here rather than in `App`
//
// A decision this component would not otherwise take (Task 2.5.5). Task 1.12.5
// accepted a whole-tree re-render on every 30-second health poll and recorded
// the reversal trigger beside it — "a second consumer, or a render rate that is
// no longer a poll". A 1 Hz clock is sixty times that rate and mutates the DOM
// on every tick, so the trigger fired: lifting it to `App` would re-render
// `<Routes>`, the current route, all four `Region`s and the landing route's
// 36-row table once a second for a text node in the chrome. Called here, the
// tick reaches this subtree and stops.
//
// That is not a hole in the props rule this component used to carry, and the
// distinction is worth keeping now that the props themselves have gone to
// `AppFooter`: that rule is about acquiring a dependency on a **network loop** —
// state, failure states, an `AbortController`, a thing a story would have to
// construct. `useMarketClock` makes no request and has no failure states, and
// `MarketClock` itself stays presentational so all six of its renderings are
// reviewable in the workshop.
//
// ## The boundary, and what it now takes down
//
// This component sits inside its own `ErrorBoundary` (Task 1.7.6) whose
// fallback replaces the `<header>`, so a broken chrome takes the banner
// landmark, the navigation **and the clock** with it. It no longer takes the
// backend indicator, which is a straightforward improvement on the arrangement
// it replaced: the two boundaries are now independent, and the indicator whose
// recorded purpose is to survive a blanked page body is no longer inside the
// same boundary as the navigation. `App` owns both polls, outside both
// boundaries, on purpose.
//
// ## This is a component and not page shell
//
// The boundary decision Task 1.4.5 left to this story. The line is: does it
// have states worth reviewing side by side? A route placeholder has one state
// made of two strings, so `src/routes/` stays outside the workshop. This header
// has six clock renderings and four current-route states, and the only other
// way to review them is to pin a clock and click through the running
// application. That is exactly what the workshop is for. `App.tsx` and
// `main.tsx` stay exempt for the opposite reason — they are the mount and the
// router's host, and neither renders anything to look at. The same rule is
// written beside the check that enforces it, in `scripts/check-stories.mjs`.
//
// ## The identity accent
//
// The 2026 refresh (ADR 0022) gave the product three real faces and one accent
// colour, and this header is the only place in the application where that
// accent appears at all — the pulse mark and the 2px bar under the current tab,
// and nothing else. See `brand.css` for the rule that keeps it there.

// No props. The header took five until 2026-09-16 — a `MarketFeedView` and the
// backend service's four fields — and all five left with the status strip, to
// `AppFooter`. What is left reads the clock through `useMarketClock`, which
// makes no request and has no failure states, so this component is back to
// being renderable from nothing.

// Every `to` reads from `PATHS`. React Router's `to` is a plain string, so a
// literal typed here would be caught by nothing until somebody clicked it —
// the path table is the mitigation and it only works if it is used.
const NAVIGATION = [
  { to: PATHS.overview, label: "Market Overview" },
  { to: PATHS.investigations, label: "Investigation Workspace" },
  { to: PATHS.securities, label: "Security Explorer" },
  { to: PATHS.replay, label: "Market Replay" },
] as const;

export function AppHeader() {
  // The one clock read on any path that reaches the market — see
  // `use-market-clock.ts`, and the paragraph above for why the call site is
  // here and not in `App`.
  const clock = useMarketClock();
  const header = useStickyChromeHeight();

  return (
    <header className={styles.header} ref={header}>
      <div className={styles.masthead}>
        {/* The identity block. The product name is a `<p>`, not an `<h1>`, and
            Task 1.5.2 demoted it deliberately: every route renders its own
            `<h1>`, and two on a page leaves a screen reader user with no single
            answer to "what is this page?". Promoting it back here would
            reintroduce the problem on every route at once.

            The mark beside it is an `Icon`, so it is `aria-hidden` and adds
            nothing to the accessible name — the word "MarketPulse" is the name,
            and the drawing is the same fact for people who read shapes faster
            than words. The line under it is a descriptor rather than a tagline:
            it says what kind of thing this is on a screen a stranger may have
            been sent a link to. */}
        <div className={styles.identity}>
          <span className={styles.mark}>
            <Icon name="pulse" />
          </span>
          <span className={styles.wordmarks}>
            <p className={styles.productName}>MarketPulse</p>
            <p className={styles.descriptor}>Market situational awareness</p>
          </span>
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

          Since the refresh these are **tabs**: full-height, with a 2px brand bar
          under the current one. That bar is the accent's second and last
          permitted appearance, and it is paired with a weight change rather than
          being colour alone — which is `market.css`'s rule applied to the chrome,
          where it matters just as much and is forgotten more often.
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

        {/*
          **The market clock, in the masthead since 2026-09-16**, where it used
          to be the third cell of a status strip under it.

          It is here and the other two facts are in the footer because they are
          not the same kind of fact, which is the thing three rearrangements of
          that strip never fixed. A clock answers a question a person asks
          *while reading a price* — is the market open, and how long until it
          is? That belongs where the eye already is. *Is the software working*
          and *where do these numbers come from* are asked once, or at the
          moment something looks wrong, and that is a status bar at the bottom
          of the screen.

          The masthead had the room. Between the last tab and the right edge
          there were about 615px of nothing at 1440 — half of the dead space
          this pass was asked to remove — and the clock is 163 of them.

          `margin-left: auto` on the cell rather than `justify-content` on the
          row, because `.nav` must keep the slack: it is the thing that scrolls
          when the viewport narrows, and a row that distributes its space gives
          the navigation exactly its content width and no more.

          **And it carries no micro-label.** It had `MARKET CLOCK` for half a
          day and the label is what made the block look unaligned: `MarketClock`
          is two lines ranged right, the qualifier is the wider of them, so a
          label hanging off the block's left edge sits 64px from the figure it
          names and level with nothing. Three repairs were available and two of
          them were worse — a third line does not fit in 56px, and interleaving
          the label into the component's own rows means `display: contents` and
          a component that lays out differently here than in its stories.

          The third is that the label is **redundant**, which is the reason
          rather than the convenience. `06:08:06 ET` beside `CLOSED` in a market
          product is not mistaken for anything, and the accessible name is
          already carried inside the component — `MarketClock` renders a
          visually-hidden *"Market time, US Eastern"* before the digits, so the
          label was a second naming for a listener too. The idiom is intact
          where it earns its keep: `VISUAL-LANGUAGE.md` calls micro-labels the
          thing that most says "institutional application", and both footer
          cells still carry theirs, because `NOT CONFIGURED` and `HEALTHY` are
          words that need saying what they are about.
        */}
        <div className={styles.clockCell}>
          <MarketClock reading={clock} />
        </div>
      </div>
    </header>
  );
}

/**
 * Publish how much of the top of the viewport this chrome is sitting over, as
 * `--sticky-chrome-height` on the document element.
 *
 * ## Why this exists at all: focus scrolled under the chrome (Task 2.11.9)
 *
 * A sticky header occludes the top of the viewport, and the browser's own
 * scroll-into-view — the one it performs for **sequential focus navigation**,
 * which is to say for every press of Tab — knows nothing about it. It scrolls
 * the newly-focused element to the top of the *scrollport* and stops, which on
 * this application puts the element, its heading and its focus ring behind the
 * chrome. Measured in Chromium on 2026-09-11, tabbing from the top of
 * `/securities/NVDA`:
 *
 * | Viewport | Chrome  | Occluded stops in the first 30                                    |
 * | -------- | ------- | ----------------------------------------------------------------- |
 * | 1440×900 | 132px   | 1 — the Tracked universe region                                   |
 * | 768×800  | 180px   | 4 — Price, Abnormal-move, Tracked universe, **`Collapse all`**    |
 * | 390×780  | 208px   | 2 — Price, Tracked universe                                       |
 *
 * It gets **worse as the viewport narrows**, because the status strip wraps to
 * two rows at 768 and three at 390 — so the one instrument that could have
 * caught it, a person tabbing through on a development machine, is the one
 * looking at the widest chrome. `Collapse all` at 768 is the sharpest case: the
 * control Task 2.11.8 calls the real skip link, reached by keyboard, invisible.
 *
 * This is WCAG 2.2's 2.4.11 *Focus Not Obscured (Minimum)*, and axe reads zero
 * violations through all of it — it judges a DOM, and this is a fact about
 * where a scroller stopped.
 *
 * ## The repair is one CSS declaration, and this is the number it needs
 *
 * `base.css` sets `scroll-padding-top` on the scroll container, which is the
 * standard way to tell every scroll-into-view in a document that the top N
 * pixels are spoken for. It applies to focus navigation, to fragment links and
 * to `scrollIntoView()` alike, so it is one mechanism rather than a correction
 * at each call site.
 *
 * What it cannot be is a constant. `--app-header-height` is **56px and is the
 * masthead only**; the chrome also carries the status strip, which wraps at two
 * breakpoints — so the number exists at three values and is decided by a media
 * query in this component's own stylesheet. A token would be a second copy of
 * it, checked by nothing and wrong at two viewports the first time the strip's
 * contents change. `UniverseTable`'s `stickyChromeHeight()` reached the same
 * conclusion from the other side and measures the element; this measures the
 * same element and publishes it, so the fact has one source and two readers
 * rather than two definitions.
 *
 * A `ResizeObserver` rather than a one-off read, because the height changes
 * without a re-render of this component: a viewport crossing 768px rewraps the
 * strip, and so does a font that loads late.
 *
 * It is deliberately tolerant of not being the page's chrome. In the workshop
 * this header is rendered inside a story with no sticky positioning, and the
 * `position` check is the whole question rather than defensive padding — a
 * header that is not sticky occludes nothing, and reserving its height would
 * leave every scrolled-to element a chrome's height below where it belongs.
 */
function useStickyChromeHeight(): RefObject<HTMLElement | null> {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (element === null) return;

    const root = document.documentElement;
    const publish = () => {
      const { position } = getComputedStyle(element);
      const sticky = position === "sticky" || position === "fixed";
      // Rounded up, for `stickyChromeHeight()`'s reason: the height is
      // fractional at some zoom levels and a pixel short is a pixel of the
      // focus ring behind the chrome.
      const height = sticky
        ? Math.ceil(element.getBoundingClientRect().height)
        : 0;
      root.style.setProperty("--sticky-chrome-height", `${String(height)}px`);
    };

    publish();

    // **Feature-detected rather than assumed**, and it is not defensive
    // padding: `ResizeObserver` does not exist in jsdom, so an unguarded `new
    // ResizeObserver` takes all fourteen of this component's own tests down
    // with a `ReferenceError` — which is how this line came to be written. The
    // fallback is exactly right rather than merely safe: an environment with no
    // observer is an environment with no layout either, `position` reads as
    // nothing, and the one-off publish above resolves to `0px`, which is the
    // truth there.
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(publish);
    observer?.observe(element);

    return () => {
      observer?.disconnect();
      // Removed rather than zeroed, so the fallback in `base.css` is what
      // applies when there is no chrome — one answer for "nobody has said",
      // rather than a stale zero that looks like a measurement.
      root.style.removeProperty("--sticky-chrome-height");
    };
  }, []);

  return ref;
}
