# Task 2.11.7 — The Security Explorer shell: the grid every later epic hangs a region off

**Status:** Not started
**Story:** [2.11 Security Search & Selection](STORY.md)
**Depends on:** 2.11.5

## Objective

Turn `/securities/:symbol` into the screen PRODUCT_SPEC.md §8.3 describes: an
identity block, a column grid, the two regions Stories 2.12 and 2.13 fill, and
honest placeholders for the five that later epics fill.

This is the piece that is expensive to retrofit. §8.3 lists seven contents —
price chart, volume, abnormal-move indicators, relative performance, connected
securities, relevant filings, historical anomaly history — and four separate
epics add to this page after this story. Deciding the grid once, now, while there
are two real regions on it, is cheaper than deciding it four times.

## What the user can see when this lands

**A security's own page that looks like an instrument rather than a route.** The
symbol, the company, the sector, the kind and its last close in an identity block
at the top of the screen; the market-data region under it; and named regions for
what is coming, each saying which epic fills it.

This is the story's best candidate for "a moment worth showing somebody" — the
identity block is the one place on this screen that carries a display-size
figure — and the hardest of the four tests of the bar, because **a screen that is
mostly honest placeholders is exactly where "would a stranger believe this is a
real funded product?" is lost.** Show how a deliberately unfinished instrument
looks confident.

## Work

- **The column grid.** Modules are white panels on the cool ground. Decide which
  of the seven regions are one, two or three columns wide, and at which
  viewports; implement the grid so that adding a region later is placing it
  rather than reflowing the page. Three viewports, as the rest of this product is
  built and reviewed.

- **The identity block.** Symbol, name, sector, kind, and whatever a person needs
  to know they are in the right place. The universe response already carries a
  last close and a previous close for all 518 securities, so a real figure is
  available — and if it is shown it carries its session date or a qualifier,
  because the last close is the last session we hold a bar for and is behind the
  calendar during a live session. **Colour is never the sole encoding** of a
  change: hue plus a sign, a glyph or a word. `PriceChange` already exists and
  already does this; prefer it to a second implementation.

- **The placeholders, following Story 1.5's convention**: an empty region says
  which epic fills it rather than pretending, and it must not read as a broken
  page. `Region`'s `filledBy` is the existing mechanism and the sentences already
  on this page — _"Charts arrive with Stories 2.12 and 2.13"_ — are the voice to
  match. Five regions: abnormal-move indicators (Epic 5), relative performance
  (Epic 5), connected securities (Epic 6), relevant filings (Epic 9), anomaly
  history (Epic 5). Name the epic, not a date.

- **Where the universe table goes.** It is currently underneath this page's
  panel because it was the only way to find out what symbols exist. **That reason
  expires with this story.** Decide what happens to it — it stays, it moves to
  `/securities` only, it becomes something smaller and related — and record why.

  **Amended 2026-09-11 by Task 2.11.5: the decision now has a second input, and
  it points the other way from the first.** The table is no longer only a
  directory — each row's symbol is a link, so it is a **way in**, and on
  `/securities/:symbol` it is the only way to reach a second security without
  using search. Removing it from that route removes a navigation affordance,
  not just a list. Whatever is decided, say what a person on one security's page
  uses to get to the next one.
  Note that `/securities` and `/securities/:symbol` currently render the same
  component and share an `<h1>`, deliberately; if that changes, `App.test.tsx`
  asserts every route has a distinct heading and the browser suite walks the
  routes asserting theirs.

- **Do not add another asynchronously-filled surface without deciding to.**
  `FRONTEND-STATE.md` §7's reversal trigger fires on exactly that: two polite
  regions queue tolerably and nobody has found out where that stops being true.
  If the shell adds one, it is a decision recorded in
  `SEARCH-AND-SELECTION.md`, not a consequence of a layout.

  **Amended 2026-09-11 by Task 2.11.1: the count is three, not two, and the
  trigger has already fired once.** Search's own region is the third, and it was
  admitted on a specific argument rather than a general one — the other two speak
  on arrival and on navigation, while search's speaks only 400 ms after a
  keystroke, so the three cannot be updated in the same moment
  (`SEARCH-AND-SELECTION.md` §4). **A fourth region has no such argument
  available**, because the shell's regions fill when their data arrives, which is
  precisely the moment the other two are already speaking. So a region added here
  is a harder decision than the third was, not an easier one by precedent.

- **Motion.** Content arriving has a duration in this language already (240ms,
  one asymmetric easing, reduced motion answered at the token layer). Use it, and
  respect the constraint that outranks it: **motion must never make a number
  harder to read.** A figure that fades or slides while an analyst is reading it
  is worse than one that changes instantly.

  **Amended 2026-09-11 by Task 2.11.4: there is now a worked precedent for the
  hard half of that constraint, and a warning.** The search surface animates
  **once per opening and not once per render** — it re-renders on every keystroke
  and the arrival must not replay, or every figure on it moves continuously while
  somebody types. The mechanism is that React reconciles the same DOM node, and
  it is pinned by a browser test rather than trusted. Any region here that
  re-renders as its data updates has the same problem. The warning:
  **motion cannot be measured from a backgrounded tab** — no frames are rendered,
  so animations never advance, `currentTime` stays 0 and `animationstart` never
  fires, and "it replays every time" looks exactly like "it never runs".

## Done when

- `/securities/:symbol` renders an identity block, the market-data region, and
  five named placeholder regions, on a grid, at three viewports
- Every placeholder names the epic that fills it
- The universe table's new home is decided and implemented, and the route
  headings still satisfy the existing assertions
- Components live under `src/components/<Name>/` with stories; `pnpm stories`
  passes
- The axe gate reads zero violations — and note the addon scopes to
  `#storybook-root`, so a permutation grid conflicts with landmark uniqueness
  only for landmarks with no accessible name, and a whole-document run is a
  different measurement that is not comparable
- `pnpm verify` and `pnpm e2e` pass
- **The four tests of the bar are applied to a screenshot and the answers are
  written down**, not asserted: a stranger believing it is a real funded product;
  designed rather than defaulted; a moment worth showing somebody; and does it
  feel alive

## Amended 2026-09-11 by Task 2.11.5 — this route no longer re-mounts, and that is a trap for a shell

Until today, going from one security to another reloaded the document, so every
component on this page was constructed fresh each time. That is over:
`/securities` and `/securities/:symbol` are two `<Route>`s rendering the **same**
module, and a client-side navigation between them **re-renders**
`SecurityExplorer` rather than re-mounting it. Measured in Chromium — a marker
set on `window` survives, `performance.getEntriesByType("navigation")` stays at
one entry, and the search field keeps the query that was typed before the
navigation.

**A shell is exactly the kind of thing this bites.** Any state this task
introduces — a collapsed region, a selected tab, a chosen comparison, a
dismissed placeholder — survives a change of symbol **by default**. That is not
something to opt into; it is something to deliberately reset or key on the symbol
where it would otherwise be wrong. `useBarSeries` already does it correctly and
is the worked example: it compares the request key during render and resets its
view when the key changes, which is why the panel never shows one symbol's
figures under another's name. A region that does not do the equivalent is that
same defect, in a place nothing is asserting yet.

The two states already known to survive are recorded in
`SEARCH-AND-SELECTION.md` §3's amendment: the parsed-series cache, which wants
it, and the search field's query, which is benign. Anything this task adds is the
third, and it is the first one that has not been looked at.

## Notes

The fence is charts. This shell has a region for a price chart and it stays
empty — Story 2.12 owns the charting decision and should take it against a data
layer already known to be right. A sparkline slipped in here is that decision
taken in the wrong place by the wrong task.

The other fence is later epics' content. A placeholder for connected securities
is a sentence and a region; it is not a graph with no data in it.
