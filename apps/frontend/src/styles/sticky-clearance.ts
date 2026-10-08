// **How much room a programmatic scroll has to leave at the top of the
// viewport**, in one place, for the one mechanism `scroll-padding` cannot
// reach.
//
// ## Why this module exists at all
//
// `base.css` reserves the sticky chrome plus the focus ring on the root
// element, and that answers sequential focus navigation, fragment links and
// `scrollIntoView()` alike — every scroll the **browser** performs. It does not
// answer `window.scrollTo`, which ignores `scroll-padding` entirely and must do
// the subtraction itself, and that is the second site: `UniverseTable`'s
// `jumpToBand`, whose flow carries `Collapse all` — the control Task 2.11.8
// calls *the real skip link*.
//
// Until Task 4.6.1 that call subtracted the chrome's height **exactly**, so it
// had the same deficit the stylesheet had and by a different mechanism: the
// band's border box landed flush against the masthead with its focus ring
// behind it. `docs/GAPS.md` recorded the stylesheet's half and named this one
// in the entry immediately next door — *`window.scrollTo` ignores
// `scroll-padding` entirely* — **without anyone connecting the two.**
//
// So the arithmetic lives here, exported once, rather than being the sum of a
// chrome reader and a ring reader at each call site. The clause a
// re-implementation cannot avoid writing is the subtraction, and there is
// exactly one of it.
//
// ## It reads the cascade and it does not use `tokens.ts`
//
// `getTokens()` throws when no stylesheet has been applied, which is correct
// for a design token a component cannot render without and wrong here: this is
// called from a click handler in a jsdom component test and in the workshop,
// where there is no chrome to clear and no token layer mounted. Every reader
// below degrades to **zero** in that case, which is the same answer
// `stickyChromeHeight` has always given a page with no `<header>`.

/**
 * How far outside its own border box a focused element's ring reaches.
 *
 * The `calc()` lives in `tokens.css` as `--focus-reach` for CSS to use; this is
 * the same arithmetic in the other language, because **the computed value of a
 * custom property keeps its `calc()` unresolved** — reading `--focus-reach`
 * here returns the string `"calc(2px + 2px)"` rather than a number. So the two
 * tokens are read and added, and the one thing that must never happen is a
 * literal `4`: the reach is the ring's measured extent, so a ring drawn 3 px
 * wide tomorrow has to move this with it.
 *
 * Returns `0` when the token layer is absent, which is the workshop and the
 * test environment.
 */
function focusReach(): number {
  const root = getComputedStyle(document.documentElement);
  const width = Number.parseFloat(root.getPropertyValue("--focus-width"));
  const offset = Number.parseFloat(root.getPropertyValue("--focus-offset"));

  if (!Number.isFinite(width) || !Number.isFinite(offset)) return 0;

  return width + offset;
}

/**
 * How much of the top of the viewport the application's own chrome is sitting
 * over.
 *
 * `<header>` rather than a class name, because the thing being asked about is
 * the page's banner landmark and there is exactly one — and because a class
 * name from a component's CSS Module is not reachable from here anyway.
 *
 * The `position` check is not defensive padding: it is the whole question. A
 * header that is not sticky occludes nothing, and subtracting its height would
 * scroll the target *past* the top of the viewport.
 *
 * **Why this measures rather than reading `--sticky-chrome-height`, which
 * `AppHeader` publishes from the same element** — recorded 2026-09-11 at Story
 * 2.11's close, because two readers of one fact with no link between them is
 * the shape this repository normally refuses. The custom property exists for
 * `base.css`'s `scroll-padding-top`, which is the browser's own
 * scroll-into-view and reaches every ordinary tab stop. It cannot serve this
 * call: `window.scrollTo` ignores `scroll-padding` entirely, so a programmatic
 * jump has to do the subtraction itself whatever the property says. Reading it
 * anyway would trade a `getBoundingClientRect()` for a `getComputedStyle()` on
 * the root plus a `parseFloat` of a string, and would go silently wrong in
 * exactly the case the `position` check exists for — a story or a test where no
 * `AppHeader` is mounted and the property is simply absent. The fact still has
 * **one source**: the element. See `useStickyChromeHeight`, which reached this
 * from the other side.
 */
function stickyChromeHeight(): number {
  const header = document.querySelector("header");
  if (header === null) return 0;

  const { position } = getComputedStyle(header);
  if (position !== "sticky" && position !== "fixed") return 0;

  // Rounded **up**, and it is a one-pixel decision with a measurement behind
  // it. The header's height is fractional at some zoom levels and browsers snap
  // a scroll offset to whole device pixels, so the exact value leaves the
  // target a pixel behind the chrome — measured at 131 against a 132px header,
  // which went red in `universe-navigation.spec.ts` and is invisible to a
  // reader. A pixel of air below the chrome is the harmless direction to be
  // wrong in.
  return Math.ceil(header.getBoundingClientRect().height);
}

/**
 * **What a `window.scrollTo` must subtract from a target's document offset so
 * that the target AND its focus ring clear the sticky chrome.** The only place
 * in this application where the chrome is subtracted from a scroll offset.
 *
 * `base.css`'s `scroll-padding-top` is the same quantity for the scrolls the
 * browser performs, and the two are deliberately spelled once each rather than
 * shared: one is a CSS length the engine applies, the other a number this
 * application computes, and the terms are the same in both.
 *
 * It does **not** add `--scroll-overshoot`. That pixel is the engine landing a
 * focus target inside its own padding edge, and a `scrollTo` goes exactly where
 * it is told; `stickyChromeHeight`'s `Math.ceil` already errs in the harmless
 * direction for the fractional case.
 */
export function stickyChromeClearance(): number {
  return stickyChromeHeight() + focusReach();
}
