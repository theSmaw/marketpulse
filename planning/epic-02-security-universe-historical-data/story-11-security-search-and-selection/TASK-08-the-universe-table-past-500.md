# Task 2.11.8 — The universe table past 500: a control on it at last

**Status:** Complete — 2026-09-11
**Story:** [2.11 Security Search & Selection](STORY.md)
**Depends on:** 2.11.6, 2.11.7

## Objective

Answer the reversal trigger Story 2.4 recorded and that has now fired: **at 518
securities a single sector band is longer than a screen**, and groups need to
become jumpable or collapsible — which is a control, and controls were out of
Story 2.4's scope. They are in this story's.

## What the user can see when this lands

**A table of 518 securities that can be got around.** Whatever the design settled
on — sector jump links, sticky band headers, collapse, or something better — the
tracked universe stops being a page you scroll through to find out what is in it.

## Work

- **Implement the control the design deliverable proposed** (`DESIGN-BRIEF.md`
  §4.4), rather than choosing a fourth option here. If it proposed none, choose
  one and record the alternatives and a reversal trigger in
  `SEARCH-AND-SELECTION.md`.

  **Amended 2026-09-11 by Task 2.11.1: it proposed two things and only one of them
  is yours to build.** Read `SEARCH-AND-SELECTION.md` §5 before starting, because
  this instruction as originally written would have you implement a control that
  was declined:
  - **The sector jump rail is taken in principle** — a row of sector links over
    the table, with the band counts — and its detail is yours.
  - **The kind-filter chips are declined** (`All (518)` / `Equities (502)` /
    `Index & ETFs (16)`). Not on taste: a filter changes which rows are on screen,
    and the summary line says **which of two numbers it is reporting**, so a filter
    owes an amended summary line. It is also what fires §3's URL reversal trigger,
    because a filtered list is a view of the list and a view a person would share
    belongs in the query string — which this story deliberately leaves empty for
    Story 2.13's window control. **A filter is therefore a feature with a query
    parameter and a summary-line change, in a task that owns both, and adding it
    here as three chips over a table takes two decisions in the wrong place.** If
    the grouping work makes a genuine case that a filter is needed to make 518 rows
    navigable, that is an amendment to `SEARCH-AND-SELECTION.md` §3 and §5 rather
    than a chip row.
  - Also declined, and worth knowing because the mock is the thing you will be
    looking at: its counts are wrong (the real split is **503 `equity`, 11
    `sector_etf`, 4 `index_etf`**), and every figure in its table header — aggregate
    ADV, market cap, `100% TAPE SYNC` — is fabricated. §5 lists them by name.

- **It interacts with search, and that interaction is the design work.** A
  filtered table may not want grouping at all — eleven sector bands holding one
  row each is worse than a flat list of eleven. Decide what grouping does when a
  query is active, and produce both states rather than describing them.

- **Three things inherited from Story 2.4 that must not be silently undone**, all
  of them things a well-meant table change breaks:
  - **The band order is `SECTORS`**, not row count and not alphabetical, and each
    band names its benchmark ETF from `SECTOR_ETFS`. A market-proxies band holds
    the index ETFs, which belong to no sector.
  - **`status` is not filtered.** An untracked security is shown and marked. A
    collapse-by-default that hides one is not a filter, but a jump control that
    cannot reach one is close enough to matter — check it. **Added 2026-09-11 by
    Task 2.11.5: an untracked security is also a link like any other**, and a
    component test asserts it. A collapse that puts one out of the tab order
    is the same failure arriving through the keyboard.
  - **The summary line says which of two numbers it is reporting**, and its
    fourth figure appears only when it is non-zero. Collapsing rows, filtering
    rows and jumping between bands must all leave it true.

- **Keyboard first, not afterwards.** A collapse is a button with an
  `aria-expanded` and a controlled region; a jump list is navigation and belongs
  in the tab order somewhere sensible. Sticky headers are the one that most often
  breaks keyboard use: an element scrolled to by focus can land underneath a
  sticky band, which is invisible to every automated check and obvious to anyone
  using Tab. Walk it.

- **State that persists, or deliberately does not.** If bands collapse, does that
  survive a navigation to a security and back? With client-side routing (2.11.5)
  it now can. Decide, and note that `FRONTEND-STATE.md`'s reversal trigger for
  adding a store is **the first piece of state two features must agree about that
  neither owns** — a collapse set that search also has an opinion about is worth
  looking at squarely rather than putting in a module because it is convenient.

  **Amended 2026-09-11 by Task 2.11.5 — "it now can" is too weak: it now DOES,
  unless you stop it.** `/securities` and `/securities/:symbol` are two
  `<Route>`s rendering the **same** module, so the route is re-rendered rather
  than re-mounted on a navigation between securities, and component state in it
  survives with no mechanism at all. Measured: the search field keeps its query
  across open-a-security and Back. So the default is **persistence**, and the
  decision to write down is whether that is right — not how to achieve it.
  Persisting is probably correct for a collapse set and probably wrong for a
  scroll position or a jump-rail "current band", and those are different answers
  in the same control.

  **This does not on its own reach the store's reversal trigger**, and it is
  worth being precise about why: a collapse set that only this table reads is
  state one feature owns, which is a module-level variable or a piece of `useState`
  and nothing more. The trigger is two features needing to agree about it.

## Done when

- The table is navigable at 518 securities without scrolling through it, at three
  viewports
- Grouping under an active query is decided and produced
- Band order, the ETF labels, the untracked marking and the summary line are all
  still correct — with a test for the summary line
- The control is keyboard-operable and the walk includes whatever sticky
  behaviour was added
- Stories exist for the collapsed, expanded and filtered states; `pnpm stories`
  passes
- The axe gate reads zero violations; `pnpm verify` passes

**Added 2026-09-11 by Task 2.11.5 — a keyboard cost this control can pay off.**
Every row's symbol is now a link, so the table is **518 tab stops** between the
search field and anything below it. There is no skip link in this application
(`styles/a11y.module.css` names one as the next thing that layer acquires). A
jump rail is navigation and is in the tab order anyway; whether it can also serve
as the way _past_ the table is a question this task is already in the right place
to answer, and it is cheaper to answer here than as a finding in Task 2.11.9 —
which owns the walk and has been told to measure it.

## Amended 2026-09-11 by Task 2.11.6 — the real 518 can be put in a story now, which is this task's whole problem

**`apps/frontend/src/fixtures/securities.ts` holds the recorded `GET /securities`
body**, and it collapses it through the real `toSecuritiesView`. That matters
here more than anywhere else in the story, because this task is about a table at
**518 rows** and `UniverseTable.stories.tsx` currently builds its states from a
hand-written universe of a dozen securities with the view object typed out as a
literal. Grouping, a jump rail and a collapse are all things whose only
interesting property is how they behave **at scale**, and a workshop that shows
twelve rows in eleven bands cannot show it. `securitiesFixtureView("full")` is
one call and no backend.

Two more that are directly this task's:

- **`securitiesFixtureView("untracked")` puts an untracked security in the real
  universe**, which is what the "a jump control that cannot reach an untracked
  row is close enough to a filter to matter" bullet above needs in order to be
  checked rather than reasoned about.
- **The summary line already has a test, and it is not the one this task owes.**
  `SecurityExplorer.test.tsx` asserts that typing into search leaves the summary
  sentence byte-identical — search is a surface over the page rather than a
  filter on it. This task's is the other half: a control that genuinely changes
  which rows are on screen has to change that line in the same commit. Write it
  as an assertion about the **sentence**, the way the existing one is.

Nothing above changes what this task builds. It changes what can be seen while
building it.

## Amended 2026-09-11 by Task 2.11.7 — the table's home is settled, and the tab-order note above is now wrong

**The table stays, on both addresses, last and full width**, inside the shell's
grid as a `span 3` cell under all seven of PRODUCT_SPEC.md §8.3's regions. That
answers the open question this task inherited from `TASK-07`, and it changes two
things for the control built here.

**1. Whatever this task adds goes into a cell of a grid, not onto a page with
one panel above it.** `SecurityExplorer.module.css` holds the spans, and its
hard-won rule applies to any layout change made here: **a `span N` item wider
than the explicit grid is not clamped to it — it grows implicit columns.** A
`span 3` region in a two-track grid produced `134px 134px 676px` and a visibly
broken page at every width under 1184px, with `pnpm verify` and all 54 browser
tests green, because **nothing below `pnpm e2e` can see a column.** If a jump
rail changes how the universe region sits on that grid, restate its span at every
breakpoint and assert the track count in
`e2e/specs/security-explorer-shell.spec.ts`, which is the only instrument that
can see it.

**2. The skip-link argument above is weaker than it looks, and the numbers are
now measured rather than reasoned about.** The "Added 2026-09-11 by Task 2.11.5"
note below says the table is "518 tab stops between the search field and
anything below it". **There is no longer anything below it.** Measured on
`/securities/NVDA`, 2026-09-11, after the shell landed:

|                                                         |         |
| ------------------------------------------------------- | ------- |
| Focusable elements on the page                          | **531** |
| Tab stops from the search field to the first table link | **8**   |
| Table links                                             | **518** |
| **Tab stops after the last table link**                 | **0**   |

So the cost a skip link would buy back is **nothing on this route** — the table
is the last thing on the page, and a keyboard user who does not want it stops
tabbing. What the eight intervening stops are is the other half of the change:
`Region` renders a `Panel` with `scrollable`, which is `overflow: auto` **and**
`tabIndex={0}` together (Task 1.13.4's WCAG 2.1.1 fix), so **every region is a
tab stop** and the shell took the page from two of them to eight.

That reframes this task's keyboard question rather than removing it. The rail is
still worth building for _getting around_ 518 rows; it is no longer obviously the
answer to _getting past_ them, because past them is the end of the document.
Decide it on the measurement, and hand the eight region stops to
[Task 2.11.9](TASK-09-keyboard-screen-reader-and-the-journey.md), which owns the
walk and now has six more of them to walk than when it was written.

**3. A sticky band header is now inside a scrolling box, and that is a different
problem from a sticky header on a page.** The table sits inside a `Panel` that
declares its own `overflow: auto`. `position: sticky` resolves against the
nearest scrolling ancestor, so a band header made sticky here sticks to the
**panel's** top edge and not the viewport's — which may be what is wanted, and is
certainly not what "sticky band headers" means by default. Produce it and look at
it; this is the class of thing that is invisible to every automated check.

---

## Notes

The measurement worth taking rather than assuming: **is the table now large
enough that rendering it is a problem?** 518 rows is not obviously one, and this
repository's rule is not to build infrastructure before the iteration that needs
it — so virtualisation is out of scope unless a measurement in this task says
otherwise, and if it does, that measurement is the finding and the work belongs
to Epic 14, which owns performance. Record the number either way; a claim about
render cost with no figure behind it is exactly what `CLAUDE.md` asks not to
carry forward.

---

# What was built — 2026-09-11

## The design deliverable

**`Universe navigation.dc.html`, in the `Component library for MarketPulse`
design canvas** — <https://claude.ai/design/p/727b5b14-fe78-47c1-9d9c-fb84b6ce5280>.
Eight sections: the measurement the trigger fired on, the rail, the band open
and shut, the whole universe on one screen, the summary line in its three forms,
four things declined with their reasons, the keyboard walk, and what grouping
does under an active query.

**It is a second file rather than a ninth section of the existing canvas, and
that was forced rather than chosen.** `DesignSync`'s `get_file` caps a read at
256 KiB and `MarketPulse Design System.dc.html` is larger than that — it comes
back as exactly 262,144 bytes, truncated mid-attribute — so a read-modify-write
of that path can only publish a file with everything past the cap deleted. ADR
0026's "the canvas is one file" bullet carries a dated amendment saying so.

## The control

**A band rail and a collapse**, both inside the tracked-universe region, above
the table:

- **The rail** is a `<nav>` named by a visible label, holding one link per band —
  eleven sectors in `SECTORS` order and the market proxies last — each with its
  row count. A link scrolls its band to just under the sticky chrome and **moves
  focus to that band's disclosure button**.
- **Each band heading is now a disclosure**: a `<button>` with `aria-expanded`
  and `aria-controls`, carrying the existing `chevronRight` rotated a quarter
  turn when open. A shut band renders no rows at all.
- **`Collapse all` / `Expand all`** sits at the rail's right end — one control
  saying which way it goes, never disabled and never absent.
- **The summary line gained one clause**, `N of 518 rows shown`, which appears
  only when N is not the whole number.

## What was measured, and where each number came from

Chromium, against the local pair serving the real database, 2026-09-11. The
performance figures are from the **production build** (`vite build` +
`vite preview`) because a dev-build figure would overstate the cost by roughly
two; both are given where they differ.

| Measurement                                | Reading                                                 |
| ------------------------------------------ | ------------------------------------------------------- |
| The page, expanded, at 1710×981            | **20,402px — 20.8 screens**                             |
| The page, every band shut                  | **2,273px** — **9.0× shorter**                          |
| Bands longer than one screen               | **11 of 12**; six are longer than two                   |
| The longest band                           | **Industrials, 84 rows, 2,976px — 3.0 screens**         |
| Focusable elements, expanded               | **556**                                                 |
| Focusable elements, every band shut        | **38**                                                  |
| `Collapse all` (530 rows → 12), production | **17, 19, 20, 44 ms**                                   |
| `Expand all` (12 rows → 530), production   | **69, 76, 76, 87 ms**                                   |
| The same pair in the dev build             | **17–27 ms** and **151–222 ms**                         |
| A sticky band header, scrolled 400px past  | viewport top **−400px** — it does not stick at all      |
| The sticky masthead                        | **133px** at 1710px, taller at the two narrow viewports |
| The rail at three viewports                | one row at 1710, two at 1024, four at 640               |

## The four findings

**1. A sticky band header does nothing here, and the cause is structural.**
The task asked for this to be produced and looked at. It was, by setting
`position: sticky; top: 0` on a live band and scrolling 400px past it: the
band's viewport top came back **−400px**. The table sits inside a `Panel` that
declares `overflow: auto`, so the _panel_ is the nearest scrollport — and the
panel never scrolls, because it grows with its content (`scrollHeight` and
`clientHeight` both read 18,764px) while the **page** scrolls. Sticky resolves
against a box that is never offset from itself. Making it work would mean giving
the panel a height and a scrollbar of its own, which puts a second scrolling
region on a page whose whole shape is _the table is last and the document ends_.
Declined, with the measurement.

**2. The jump landed behind the chrome, exactly as this task warned.** The brief
says _an element scrolled to by focus can land underneath a sticky band, which
is invisible to every automated check and obvious to anyone using Tab_. It did:
a jump to Industrials put the band's top at viewport **y=0** with the masthead
133px tall over it, after an 11,933px scroll, with focus on an element nobody
could see. `jumpToBand` now computes one scroll position and subtracts the
sticky chrome's measured height. **The chrome is read rather than tokenised**
because `--app-header-height` is the masthead only (56px) and the status strip
beneath it wraps at two more breakpoints — a token would be a second copy of a
number that lives in another component's media queries, wrong at two viewports
the first time the strip's contents change. It also degrades exactly right: in
the workshop there is no `<header>`, so the offset is zero.
`e2e/specs/universe-navigation.spec.ts` asserts the landing against the header's
own box, and **the break was verified red** by removing the subtraction — one
test failed and only that one.

**3. Two accessible names were being concatenated without spaces**, and one of
them pre-dates this task. Measured in jsdom: the band heading announced itself
as `TechnologyBenchmark XLK2securities` and the new rail link as
`Technology 2securities`. This is `e2e/README.md`'s `Backend servicehealthy`
trap arriving in a place where it would be **heard** rather than merely
mis-asserted on — the parts are flex children with no literal whitespace between
them, and an accessible name is a concatenation. Explicit `{" "}` text nodes fix
both; four component tests assert the names whole. Note that the comment in
`UniverseTable.tsx` claiming the band read `Technology Benchmark XLK 13` was
therefore describing a browser's computation and not jsdom's — the markup now
makes both right, so the claim is true rather than engine-dependent.

**4. Building 518 rows is a >50ms main-thread task, and the figure is recorded
rather than acted on.** `Expand all` costs **69–87 ms** in the production build,
against PRODUCT_SPEC.md §28's _no routine main-thread task >50 ms_.
`Collapse all` costs 17–44 ms. Two things about that:

- **It is not new and it is not routine.** The same work happens on every first
  paint of this page and always has; what changed is that there is now a control
  that repeats it, which is how it became measurable at all. It is a deliberate
  user action, once, not a per-frame or per-update cost.
- **Virtualisation stays out of scope**, which is this repository's rule about
  not building infrastructure before the iteration that needs it — and collapse
  is the cheaper answer to the same problem, because a shut band renders no rows.
  If a later measurement says otherwise, that measurement is the finding and the
  work belongs to **Epic 14**, which owns performance.

## Decisions, with their alternatives

**Expanded is the default; collapsed is never the arrival state.** An untracked
security is shown, marked and findable (`UNIVERSE.md` §12.2), and a
collapse-by-default hides one behind a control nobody has pressed yet. The rail
reaches every band including the market proxies, and a browser test asserts the
property that makes that true: **the rail's counts sum to exactly the number of
rows in the table**, so there is no band the control cannot get to.

**The full sector name in the rail, not `TECH`.** The design deliverable
abbreviated all eleven. `SECTOR_LABELS` exists precisely so nobody derives a
display string by transform, so an abbreviation is a twelfth vocabulary for
eleven things already named once. Twelve full labels wrap to two lines at 1024
and four at 640 — measured, legible, and the cheaper cost.

**The collapse set is `useState` in the table, and that is the store's reversal
trigger _not_ firing.** `FRONTEND-STATE.md`'s trigger is _the first piece of
state two features must agree about that neither owns_. This is read by the
table and by nothing else; search has no opinion about it, because search is a
surface over the page rather than a filter on it.

**It survives a navigation, and that is the default rather than a mechanism.**
`/securities` and `/securities/:symbol` render the same module, so opening a
security re-renders rather than re-mounts and the set stays. That is the right
answer for a collapse — an arrangement a reader made on purpose — and would be
the wrong one for a scroll position or a "current band", which is why the set is
the only thing kept.

**Nothing new goes in the live region.** `aria-expanded` on the band's own
button is spoken at the moment a listener presses it, about the thing they
pressed. A `role="status"` re-reading the summary on top of that is two
announcements of one action; a component test asserts the announcement is
byte-identical across a collapse.

**Grouping under an active query: nothing changes, and the state is produced
rather than described.** Search opens a result surface over the page; the table
underneath is untouched. So the brief's worry — _eleven sector bands holding one
row each is worse than a flat list of eleven_ — cannot arise, because no query
ever reduces a band to one row. The two controls answer two different questions:
search is for a person who knows the symbol, the rail for a person who does not
know what to type.

**One deviation from the Done-when list, stated rather than glossed.** It asks
for stories covering the collapsed, expanded and **filtered** states.
`AllBandsCollapsed`, `OneBandCollapsed`, `TheRealUniverse` and
`TheRealUniverseWithUntracked` exist and `pnpm stories` passes — but there is no
_filtered_ story, because `UniverseTable` has no query to be filtered by: the
field lives on the route. That state is produced in the browser instead, where
both surfaces exist, by `an active query changes the result surface and leaves
the table alone`.

**And the kind-filter chips stay declined**, per `SEARCH-AND-SELECTION.md` §5.
The grouping work made no case for one: with collapse, 518 rows already reduce
to twelve.

## What nothing checks

- **That the rail is worth pressing.** Twelve reachable links is not the same as
  a reader finding their way around 518 rows. That judgement is a person looking
  at the page, and this task's is that the collapsed table — the whole universe
  as twelve rows under a live column header — is the state worth showing
  somebody.
- **That `initiallyCollapsed` stays workshop-only.** It is honest API and the
  route passes nothing; nothing would go red if a route started seeding it.
- **That the expand cost stays where it is.** There is no performance gate in
  this repository and this task did not add one. Re-measure by timing a
  `MutationObserver` around the `Expand all` click in the production build.

## Gates

`pnpm verify` green. `pnpm e2e` green — **69 browser tests**, including nine new
ones in `e2e/specs/universe-navigation.spec.ts`, three of them whole-document axe
runs over the **collapsed** table at 1440, 1024 and 640px. That last set was the
one real risk: a `<th scope="rowgroup">` whose row group has lost its data cells
is a new shape for `th-has-data-cells` to judge, and it did not become a
violation — the table's one pre-existing `incomplete` is unchanged.

The bundle re-measure both fixture rules name still finds nothing:
`grep -o "Agilent Technologies" apps/frontend/dist/assets/*.js` → 0.

---

# For the stakeholders — what this actually did

## The problem, in one sentence

MarketPulse follows 518 companies, and the page listing them was **twenty
screens long**.

## What that was like

The list is organised by sector, which is the right way round — it answers "what
does this product actually cover?" rather than "where is one particular
company?". But at 518 companies the organisation stopped helping. Eleven of the
twelve sector groups were longer than a full screen. Industrials alone ran for
three screens. Finding Technology meant scrolling past Health Care and
Financials; finding out how much the product covered in total meant scrolling
past everything.

We knew this was coming. When the list was first built we wrote down the exact
condition that would break it — _"at 500 securities a single sector group is
longer than a screen"_ — and said that when it happened, the groups would need
to become something you could jump between or fold away. This task is that
condition arriving and being dealt with.

## What we built

**Two things, both sitting just above the list.**

**A row of sector links**, each one showing how many companies are in it —
`Technology 74`, `Industrials 84`, `Energy 22`. Click one and the page takes you
straight to that section. The counts are on the links deliberately: a row of
eleven identical-looking names is a table of contents, but a row that tells you
Industrials is 84 companies and Energy is 22 is telling you something about the
market before you have gone anywhere.

**A fold.** Every sector heading can now be clicked shut, and one button at the
top shuts all of them at once. Press it and the twenty-screen page becomes
**twelve lines on a single screen** — the whole tracked universe as a contents
page. We measured it: the page goes from 20,402 pixels tall to 2,273, nine times
shorter.

That second state is the one worth showing someone. It is the clearest answer
this product has ever given to "what does MarketPulse cover?" — eleven sectors,
their benchmark funds, and how many companies are in each, all visible at once
without moving.

## Three choices worth explaining

**We did not build the obvious thing.** The usual answer to a long table is a
sector heading that "sticks" to the top of the screen as you scroll past it. We
tried it in the live page and it did nothing at all — for a structural reason
about how the panel around the table is built, not a styling one. Rather than
guess, we measured it, wrote down why it cannot work here, and spent the effort
on the fold instead, which solves the same problem better. A sticky heading
helps you know where you are; a fold means you do not have to go there.

**We caught a real defect by walking it with a keyboard.** The first version of
the sector links scrolled to the right place and dropped you **underneath the
application's own header bar** — the section you asked for was hidden behind the
navigation, and for anyone using a keyboard rather than a mouse, the cursor was
sitting on something invisible. This is the kind of fault no automated check
catches and anyone actually using the page hits immediately. It is fixed, and
there is now a browser test that fails if it ever comes back. We deliberately
broke it again to confirm the test does its job.

**We fixed something a screen-reader user would have heard.** Each sector
heading reads out its name, its benchmark fund and its size. Those three facts
were running together without spaces — a listener heard
"TechnologyBenchmarkXLK74securities". Invisible on screen, wrong in the ear. It
is now spaced properly, and four tests check the exact wording.

**We declined a filter, on purpose.** The original design sketch put buttons
above the table to show only companies, or only funds. We left it out for a
specific reason: a filter changes which rows exist, so it also needs to change
the summary sentence above the table and it needs to be shareable in a link —
two decisions that belong to a task that owns both. It is also no longer
obviously needed: with the fold, 518 rows already come down to twelve. If the
case comes back, it comes back as a proper feature rather than as three buttons.

## The one number we are watching

Opening every sector again takes about **70–90 milliseconds** of browser work.
Our own performance target says no routine task should exceed 50. It is not a
new cost — the page has always done that work when it first loads — and it only
happens when somebody deliberately presses a button, so it is not degrading
anything today. But we wrote the figure down rather than waving at it, and the
team that owns performance now has a measured starting point instead of a
hunch. The usual industrial fix (rendering only the rows currently on screen) is
deliberately **not** built yet: folding a sector away already achieves the same
thing, and this project does not add machinery before something needs it.

## Where this leaves the product

The Security Explorer now has all three ways of getting to a company that it
needs: **type its name** (search, built two tasks ago), **click it in the list**
(built one task before that), and **navigate the market by sector** (this task).
That was the last piece of "finding a security" — the story can close.

What comes next is what a person sees once they have arrived. The next two
pieces of work draw the price chart and the volume chart for whichever company
they picked. The data behind both is already stored — 47.7 million minute-by-
minute price bars across all 518 companies — and the page currently states those
numbers as text. Turning them into charts is the immediate next step, and the
screen those charts land on is finished and waiting for them.
