# Task 2.11.7 — The Security Explorer shell: the grid every later epic hangs a region off

**Status:** Done — 2026-09-11
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

## Amended 2026-09-11 by Task 2.11.6 — search is on the page in every state now, and one of its sentences points at the table

Three things this task inherits, and the second is the expensive one.

**1. The field is no longer gated on a successful fetch.** `SecuritySearch`
takes `SecuritiesView` whole and `SecurityExplorer` renders it unconditionally;
it is disabled with a reason when the universe cannot be read, live and holding
what was typed while the universe loads. **Do not re-gate it.** The
`view.state === "loaded" ? … : undefined` this task's grid work would naturally
reach for is the exact defect 2.11.6 removed, and it goes red in three places —
one route test and two browser specs.

**2. Search's failed-state copy assumes the tracked universe is on the same
screen, and this task may move it.** The sentence reads:

> Nothing to search yet: the tracked universe did not answer. A service starting
> up looks exactly like this, and **the control that asks again is with the
> universe itself**.

That clause exists because both surfaces read one fetch and a second _Try again_
would teach a reader that neither is real (2.11.6's record, and a browser test
asserts `toHaveCount(1)`). It is **true only while the table is on the same
screen as the field**. So "where the universe table goes" is no longer only a
navigation decision: if the table leaves `/securities/:symbol`, that route loses
the only control that re-asks for the universe, and this task owns the
consequence — either the copy changes on that route, or search grows the retry
that was deliberately not built, or the table stays. Decide it deliberately;
nothing will fail if it is missed, because the sentence stays grammatical while
becoming false.

**3. Five new regions meet a copy rule that was learned the hard way.** Two
surfaces describing one failure on one screen **must not open with the same
clause** — it happened three times in one afternoon in 2.11.6, every time caught
by a test locator resolving to two or three nodes rather than by anybody reading
the page. This shell adds five regions to a screen that already has three
surfaces with sentences in them. Each one's empty and failed states owe wording
that is theirs, and the cheap check is a locator: if `getByText` finds more than
one node, two surfaces are saying the same thing.

---

## Notes

The fence is charts. This shell has a region for a price chart and it stays
empty — Story 2.12 owns the charting decision and should take it against a data
layer already known to be right. A sparkline slipped in here is that decision
taken in the wrong place by the wrong task.

The other fence is later epics' content. A placeholder for connected securities
is a sentence and a region; it is not a graph with no data in it.

---

## What was done — 2026-09-11

`/securities/:symbol` is the screen §8.3 describes. A `PageHeader`, the search
field, **an identity block**, a **three-column grid carrying §8.3's seven
contents**, and the tracked universe last and full width.

### The grid

Three equal columns at ≥1184px, two below that, one below 768px, and every
region declares **only how many columns it spans**. `grid-template-areas` was
rejected for the property this task exists to buy: Epics 5, 6 and 9 each add a
region here, and with named areas every addition is an edit to three templates
with the chance to get two of them wrong. With spans it is a component and a
number.

| Region                   | Spans          | Fills                              |
| ------------------------ | -------------- | ---------------------------------- |
| Price                    | 2 (1 at ≤1184) | **Real bars today**; Story 2.12    |
| Abnormal-move indicators | 1              | Epic 5 — Anomaly Detection         |
| Volume                   | 2 (1 at ≤1184) | Story 2.13 — Volume Chart          |
| Relative performance     | 1              | Epic 5 — Anomaly Detection         |
| Connected securities     | 1              | Epic 6 — Market Topology           |
| Relevant filings         | 1              | Epic 9 — Corporate Filing Evidence |
| Anomaly history          | 1              | Epic 5 — Anomaly Detection         |
| Tracked universe         | 3 (2 at ≤1184) | **Real, today**                    |

Two arrangement decisions that are arguments rather than taste:

- **Price and volume are the wide pair** because they share an x-axis. A volume
  chart at a different width from the price above it cannot be read against it,
  and that is the one adjacency in §8.3 that is not a preference.
- **Abnormal move, relative performance and anomaly history share the right
  column** so Epic 5 lands in a rail rather than in three unrelated corners.

**At two columns the wide pair stops being wide**, which is the opposite of the
obvious arrangement and was chosen by looking at both. Seven regions in two
columns leave exactly one hole wherever the spans fall; leaving the pair at two
tracks puts that hole beside the abnormal-move region a third of the way down
the page, where it reads as a panel that failed to render. Collapsing it moves
the hole to the last placeholder row, directly above the full-width universe,
where it reads as the end of a list — and price and volume are still the same
width as each other and still vertically adjacent, stacked in the left track.

### The defect this task nearly shipped, and what nothing would have caught

The first draft declared the spans once and changed only
`grid-template-columns` per viewport, on the belief that **a `span 3` item in a
two-track grid is clamped to two tracks**. It is not. Chromium grows an
implicit third column: the computed tracks came back `134px 134px 676px` — two
starved columns and one implicit one holding the universe table — and the page
was visibly broken at every width below 1184px.

`pnpm verify` was green throughout, and so were all 54 browser tests. **Nothing
below `pnpm e2e` can see a column**: jsdom applies no stylesheet and computes no
layout, so every unit, component and integration test in this repository passes
against a grid whose spans have inverted. It was caught by looking at the page,
which is the only instrument that could have caught it, and it is now pinned by
`e2e/specs/security-explorer-shell.spec.ts` — whose red was verified by putting
the break back and watching test 2 fail.

### The identity block

`components/SecurityIdentity/`. The symbol and the last close at display size —
**the only display-size figures on the screen**, which is what makes a page of
seven panels read as an instrument pointed at NVDA rather than as a dashboard
that happens to be filtered.

Four states, because the symbol is known before the profile is:

| State               | What it says                                                                            |
| ------------------- | --------------------------------------------------------------------------------------- |
| Loaded, found       | Symbol, kind, name, `SECTOR · INDUSTRY · EXCHANGE`, last session close with its change  |
| Universe in flight  | The symbol at full size, from the address, and "Reading this security's profile…"       |
| Loaded, not in it   | "MarketPulse does not track this security…" — reachable by typing an address, not a 404 |
| Universe unreadable | "No profile for this symbol: …the bars below are unaffected." §36 degrading locally     |

**The loading state is deliberately not a skeleton.** A grey bar where a name
will be is a promise that something is coming, and this component cannot make
it — the universe may fail. The symbol comes from the path and is printed at
full size on the first frame; nothing below it moves when the rest lands.

**The close says which grain it is, and that was found by looking at the page.**
The universe's `lastCloses` comes from a stored **`1d`** bar — the session's
official close — and the panel directly below renders the last **minute** bar of
the window it asked for. For NVDA on 2026-09-04 those are `230.36` and `230.34`.
Both correct, both labelled "close", two inches apart: they read as one number
that cannot make up its mind. So the label is _Last session close_ and the
qualifier is `2026-09-04 · from a stored daily bar`. The minute-bar depth that
was on that line in the first draft is **gone** for the same reason — a
minute-bar count beside a daily close invites exactly the reading that the close
is what those minute bars add up to.

### The four decisions this task owed

**1. Where the universe table goes — it stays, on both addresses, last and full
width.** Search retires the reason it was there (it was the only way to find out
what symbols exist); it does not retire the other two things it has become.
Since Task 2.11.5 every symbol in it is a link, so on `/securities/:symbol` it
is the only way to reach a second security without typing one. And it owns the
single control that re-asks for the universe, which `SecuritySearch`'s
failed-state copy points at by name — _"the control that asks again is with the
universe itself"_. Moving the table to `/securities` alone would leave that
sentence grammatical and false on this route, and would make a failed universe a
dead end here.

The cost is a long page, paid deliberately: the table is **last**, under all
seven regions, so nothing a reader came for is below it. Task 2.11.8 owns making
518 rows navigable.

**Reversal trigger:** the first region that must sit _below_ the table, or a
second control on this screen that re-asks for the universe (which would free
the copy dependency).

**So: a person on one security's page reaches the next one by the search field
above, or by any symbol in the table below.**

**2. A fourth asynchronously-filled surface — yes, and it does not speak.** The
identity block fills from the universe fetch. `FRONTEND-STATE.md` §7's trigger
fires on a fourth surface and `SEARCH-AND-SELECTION.md` §4 admitted the third on
an argument this one cannot borrow: search speaks only 400 ms after a keystroke,
while this fills at exactly the moment the other two do. So it renders **no
`role="status"` and no `aria-live`** — the universe's own region already speaks
for this fetch, and a second sentence about it in the same moment is the queueing
defect §7 exists to prevent. Pinned by a component test and a route test; the
page still holds exactly three live regions.

**3. Motion — once, on mount, and never again.** The identity block fades and
rises 6px over `--motion-duration-settle`. The mechanism is that React
reconciles the same DOM node across a change of symbol (Task 2.11.5 measured
that this route no longer re-mounts), so the animation plays on the first frame
the page exists and is never replayed by a re-render or a navigation. That is
the property it needs, because **motion must never make a number harder to
read**: an analyst switching from NVDA to AMD gets the new close instantly, with
no fade and no slide. Reduced motion is answered once at the token layer.

**4. State that survives a change of symbol — there is none.** Task 2.11.5's
amendment warns that a collapsed region, a selected tab or a dismissed
placeholder would survive a navigation by default. Nothing in this shell holds
state, and that is the reason: the cheapest way to be correct about a trap is
not to walk into it. A region that acquires state owes the reset `useBarSeries`
already does.

### Copy

Eight regions arrived on a screen that already had three surfaces with sentences
in them, and Task 2.11.6's rule is that two surfaces describing one screen must
not open on the same clause. Every region's sentence opens on its own, and it is
asserted rather than read: a route test walks eight openings and fails if a
locator resolves to two nodes.

One redundancy is accepted and recorded rather than removed: on `/securities/ZZZZ`
the identity block says _"MarketPulse does not track this security…"_ and the
price panel says _"ZZZZ is not a security this system tracks."_ Different
clauses, and both are needed — one answers "whose page is this?", the other
answers "why are there no bars?".

The same judgement covers two headings reading `AMD` (the block's `h2` names the
page's subject, the panel's `h3` names its own) and the company name appearing
twice (the block and its table row). **A subject stated twice is what the
self-describing-surface rule requires**; what is forbidden is one _event_
described twice in the same words.

### What was built

- `components/SecurityIdentity/` — the block, its four states, stories and tests
- `components/RegionPlaceholder/` — the dashed field and its epic label
- `routes/SecurityExplorer.module.css` — the grid, the spans, three viewports
- `e2e/specs/security-explorer-shell.spec.ts` — 7 tests: the tracks at three
  viewports, the wide pair, the reading order, the six placeholder labels, the
  close's qualifier, and axe at each viewport separately

### Why the placeholder is a dashed field and not a greyed-out mock

A placeholder drawn as the thing it will become — a graph with no nodes, a chart
with a flat line — is **indistinguishable from that thing being broken**, and it
takes the next epic's design decision on its behalf in a task that has not seen
the data. A dashed field with a plan written in it can only be read one way. The
dash is this language's existing silhouette for _not yet_ (the bar panel's held
answer, search's in-flight universe) and deliberately not the amber square,
which marks the one condition that needs somebody to go and look at something.

The panel **around** it is a real panel — same ground, same hairline, same
near-black rule under the heading. That is what stops seven cells reading as a
scaffold: the furniture is finished even where the content is not.

### The four tests of the bar, applied to a screenshot

Applied at 1440 × 1000, `/securities/NVDA`, against the real local store.

1. **Would a stranger believe this is a real, funded product?** Yes, and this
   was the test at risk. What carries it is that the unfinished regions are
   unfinished _in a finished frame_ — real panels, real rules, real headings,
   with one consistent dashed field inside each. Five identical placeholders read
   as a plan; five different ones would have read as five broken panels.
2. **Does it look designed rather than defaulted?** Yes. The identity band with
   a near-black rule under it, the mono ticker at 28px against the body face,
   the 11px letterspaced micro-labels, 3px corners, the close's change carrying a
   glyph and a sign before it carries a colour. Nothing here is a framework
   default.
3. **Is there a moment worth showing somebody?** The identity block — `NVDA`,
   `NVIDIA Corporation`, and `230.36 ▲ +0.84%` at display size with
   `2026-09-04 · from a stored daily bar` under it. It is the first thing in this
   product that looks like an instrument naming its subject.
4. **Does it feel alive?** Partly, and the honest answer is that it is the
   weakest of the four. The block arrives with a 240ms rise and the figures are
   real, but nothing on this screen moves after that — because nothing on this
   screen changes yet. Epic 3's live feed is what answers this test properly,
   and the constraint that outranks it (a number must not move while it is being
   read) is already honoured here.

### What a green run here does not certify

- **Not that the layout is good.** Three track counts being right is not a page
  being worth looking at; test 1 to 4 above are a person's judgement.
- **Not that the placeholders are still honest.** An epic that ships without
  filling its region leaves a sentence that is true today and false later, and
  nothing checks the roadmap against these six labels.
- **Not that a fifth live region has not appeared.** The route test counts three
  `role="status"` on this page and is the only thing anywhere that does.

---

## For the stakeholders — a non-technical status report

**What this is.** MarketPulse is a tool for a market analyst: it watches US
stocks, spots behaviour that is statistically unusual, and lets a person — or
later an AI agent — investigate it against real evidence. It is not a trading
system and never recommends a trade.

**What just landed.** The Security Explorer — the screen that answers _"what is
happening with this one company?"_ — now looks like the screen it is going to
be, rather than like a page with one panel on it.

At the top, a **company identity block**: the ticker, the company name, its
sector, industry and exchange, and its last closing price with the move beside
it, all at a size you read from across a desk. Under that, a **grid of seven
panels** — one for the price, one for volume, and five for the things later
phases add: how unusual today is, how this company is doing against its sector
and the market, which other securities move with it, which SEC filings landed
around a move, and its own history of unusual days.

**Two of the seven have real data in them today. Five say, in plain English,
which phase of the project fills them.** That was the difficult part of this
piece of work, and it was a deliberate choice rather than a shortcut.

**Why build the empty ones now.** Four separate later phases each add something
to this screen. If we let each of them decide where its panel goes, we would
take that decision four times, get a different answer each time, and end up
rearranging the whole page four times — expensive, and the kind of rework that
shows. Deciding the layout **once, now, while there are two real panels to judge
it against** is the cheap version. From here, adding the anomaly panel is
dropping it into a slot that already exists.

**Why the empty ones say what they say.** A screen that is mostly placeholders
is exactly where a demo loses credibility — it can look broken rather than
unfinished. We could have drawn a fake chart with a flat line in each. We
didn't, for two reasons: a fake chart is indistinguishable from a real one that
has failed, and drawing it would quietly commit the next phase to a design
nobody has thought about yet. Instead each empty panel is a properly finished
panel — same white card, same heading, same rule — with a single dashed area
inside it saying "Filled by Epic 6 — Market Topology". Honest, consistent, and
it reads as a plan rather than as damage.

Note the labels name a **phase**, never a date. A date we might miss is worse
than no date at all, and an earlier design mock in this project invented story
numbers for its placeholders that do not exist in the plan.

**A judgement call worth telling you about.** The screen showed the company's
closing price twice, from two places, and the two numbers differed by two cents
— 230.36 and 230.34. Both were correct: one is the official closing price for
the day, the other is the last minute-by-minute price we hold. Two inches apart,
both labelled "close", they read as a system that cannot make up its mind, which
is corrosive on a product whose entire pitch is trustworthy evidence. The fix
was not to hide one. It was to say which is which, in three extra words. That
instinct — _state the grain of a number rather than round the problem away_ — is
the same one behind the feed labelling and the confidence levels elsewhere in
the product.

**A decision about the list of 518 companies.** That table used to sit under this
page because it was the only way to find out which companies exist. Search has
now replaced that job — but the table has quietly become two other things: the
only way to click through to a second company without typing, and the home of
the one "try again" button when the company list fails to load. So it stays, at
the very bottom, under everything a reader actually came for.

**What a user can do today that they could not last week.** Land on a company's
page and immediately see which company it is, what it does, where it trades and
what it last closed at — and see, at a glance, the shape of everything the
product is going to tell them about it.

**What they still cannot do.** See a chart. The price panel states its numbers
rather than drawing them; the chart is the very next piece of work (Story 2.12),
and volume the one after it (Story 2.13). There is still no live price — the
market feed is Epic 3 — and none of the five planned panels does anything yet.

**How it was checked.** Every automated gate the project has: the full build,
lint, format and 1,424 tests, plus 61 browser tests driving a real Chromium
against a real database. Seven of those browser tests are new and exist only for
this screen, including an accessibility scan at each of the three screen sizes,
all clean.

Worth recording: this work shipped one genuine layout bug that **every automated
test passed** — the grid quietly collapsed into three unusable columns on
anything smaller than a large desktop. It was found by opening the page and
looking at it. There is now a test that catches it, and we confirmed that test
actually goes red by putting the bug back.
