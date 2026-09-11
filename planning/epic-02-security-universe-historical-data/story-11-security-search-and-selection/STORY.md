# Story 2.11 — Security Search & Selection

**Status:** Not started
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Story 2.10
**Epic scope covered:** Security search/select

## Description

The first half of the epic's exit criterion: **a user can search for a security such as
NVDA and open it.** This is the story that turns the `/securities` placeholder route into
the Security Explorer shell (§8.3) and gives the product its first real user interaction.

## What the user can see when this story lands

**Search, and the ability to open a security** — the half of the epic's exit criterion that
is about getting to a security rather than looking at one.

Concretely: a search control that finds NVDA by symbol and Nvidia by name, tolerant of case
and partial input; results showing symbol, name, sector and the equity/ETF distinction; and
**clicking a result opens that security's own page at its own URL**, which can be
bookmarked and shared. The Security Explorer shell (§8.3) appears here, with honest
placeholders naming the epic that fills each region.

**Scope note added 2026-09-05: Story 2.4 took the list**, so `/securities` already shows
the tracked universe before this story starts. What remains here is everything interactive —
search, the combobox and its keyboard behaviour, selection, the per-security route and the
Explorer shell. This story is consequently **the first genuinely interactive control in the
product** rather than the first data on screen, which sharpens what it is for.

What the user still cannot do afterwards: see a price or a chart. That is Story 2.12.

## Why it sits here in the sequence

Before the charts, because a chart needs a security to be about. It is also the smallest
useful vertical slice through Story 2.10's layer, which is a good way to find out whether
that layer is right while it is still cheap to change.

## Scope

- Search over the tracked universe: by symbol and by company name, tolerant of case and of
  partial input
- The result presentation: symbol, name, sector, and the **equity/ETF distinction** Story
  2.3 established, which a user needs in order to understand why SPY behaves differently
  from NVDA
- Selection, and the route it leads to — a per-security URL that deep-links, which Epic 1
  already proved the deployed host serves correctly
- The Security Explorer shell: the page §8.3 describes, with the regions Stories 2.12 to
  2.14 fill and honest placeholders for the ones later epics fill (abnormal-move
  indicators, connected securities, relevant filings, anomaly history) — following Story
  1.5's convention that an empty region says which epic fills it rather than pretending
- **Keyboard and accessibility as a first-class requirement, not a pass afterwards.** A
  search with results is a combobox, and it is the first genuinely interactive control in
  this product; getting its roles, focus management and keyboard behaviour right here sets
  the pattern for everything after it
- The states: no query, no matches, one match, many matches, and the search being
  unavailable because the backend is
- The empty case that is not an error: a symbol that exists but has no stored data yet

## Out of scope, and who owns it

- Any chart — Stories 2.12 and 2.13
- Selecting a security from the market overview — Epic 4
- Selecting from the topology graph — Epic 6
- Comparing two securities — Epic 8 and Epic 11
- Free-text search over anything but the tracked universe — not in V1

## Open decisions — settle with the user

**All three are settled. Amended 2026-09-11 (Task 2.11.1 took them; swept here
during Task 2.11.2, which found this section still reading as open).** They are
left below as written because they are the question this story was asked, and
the answers with their alternatives and reversal triggers are in
[`SEARCH-AND-SELECTION.md`](SEARCH-AND-SELECTION.md) §§1–3:

1. **On the page**, one field above the tracked universe; the chrome is not
   touched (§1)
2. **Client-side**, over the universe the screen already fetches; no request per
   keystroke and no `search` parameter on `GET /securities` (§2)
3. **The path names the subject and the query never carries the search** — not
   even transiently (§3)

4. **Where search lives.** A dedicated route, a persistent control in the chrome, or both.
   A persistent control is how an analyst tool usually behaves and it makes symbol
   switching cheap, which is what Epic 5 onward wants; a route is simpler and does not
   touch `AppHeader`, which currently has a deliberate three-region status strip
5. **Client-side or server-side matching.** 100 securities fit in the browser and give
   instant results with no request per keystroke; the architecture is meant to expand to
   500, which still fits. Server-side is the general answer and costs a round trip per
   keystroke unless debounced
6. **The URL shape** for a selected security, since it is user-visible and shared

## Design surface

This is the epic's first real design work: a search affordance, a result row that carries
five facts without becoming a table (**four when this was written; the user added the close
and its change on 2026-09-11 — `SEARCH-AND-SELECTION.md` §5**), the Security Explorer's layout under §8.3, and the
empty and unavailable states. It should read as the dense, sober analyst tooling
`VISUAL-LANGUAGE.md` describes — the identity is structural, and a search box is where a
generic admin panel usually announces itself.

## The design bar

**PRODUCT_SPEC.md §5.6 and `VISUAL-LANGUAGE.md`'s _The bar_ apply to this story, and they
are acceptance criteria rather than polish.** Correct and accessible is the floor. Before
this story is called done, apply the four tests to a screenshot of what it built: would a
stranger believe this is a real funded product; does it look designed rather than
defaulted; is there a moment in it worth showing somebody; and does it feel alive. If the
answer to any of them is no, the story is not finished — and "we will polish it in Epic 15"
is not available, because Epic 15 is a release epic and polish deferred is polish never.

## Acceptance criteria

1. Typing `nvda`, `NVDA` or `nvid` behaves sensibly, and selecting a result opens that
   security
2. A per-security URL deep-loads cold in the deployed environment
3. The whole flow is operable by keyboard alone, and the control announces itself
   correctly to a screen reader
4. Every state above renders correctly, including "the backend is unreachable", which must
   not collapse the page (§36)
5. Components live under `src/components/<Name>/` with stories per state, so `pnpm stories`
   passes, and the axe gate stays at zero violations
6. A browser journey covers search → open → the security's page
7. `pnpm verify` passes

## What this story hands forward

The Security Explorer shell every later epic adds a region to, and the selection interaction
Epics 4 and 6 reuse.

---

## Amended 2026-09-06, after Story 2.4 closed — the list exists, and this file contradicts itself above

The scope note above was written on 2026-09-05, before Story 2.4 ran.

### One correction to this file's own Description

The Description says this is "the story that turns the `/securities` placeholder route into
the Security Explorer shell", and its own scope note two paragraphs later says Story 2.4 took
the list. **The first sentence is now wrong**: `/securities` has not been a placeholder since
Task 2.4.3. It renders the tracked universe — 101 securities, grouped into eleven sectors
plus a market-proxies band, with a summary line, four honest states and an axe reading of
**0 violations / 35 passes / 1 inconclusive** at three viewports.

What you turn it into is the **interactive** Security Explorer: search, selection and a
per-security route. That is a sharper brief than the one this file was written with, and it
is the one to work from.

### What you inherit built, and must not silently undo

- **The table, its grouping and its four states.** Sector bands ordered by `SECTORS` rather
  than by row count or alphabetically, each naming its benchmark ETF from `SECTOR_ETFS`; a
  market-proxies band for index ETFs, which belong to no sector; `industry` in the column a
  repeated sector cell would otherwise have occupied.
- **`status` is not filtered.** An `untracked` security is **shown and marked**, never
  hidden — `UNIVERSE.md` §12.2 names you as one of the readers that must not filter, and
  Task 2.4.6 produced the state against the deployed database to prove the rendering. **A
  search that filters on `status` reintroduces exactly the failure a `deleted_at` column
  would have caused.**
- **The summary line says which of two numbers it is reporting.** With one row untracked it
  reads `100 securities tracked · 11 sectors · 15 ETFs · 1 no longer tracked`, and the
  fourth figure appears only when it is non-zero. Whatever search does to the visible rows,
  it must not make that line a lie.

### Two things newly yours that Story 2.4 deliberately did not settle

- **Whether search is server-side or client-side, and the measurement that decides it.**
  Task 2.4.2 shipped **no search parameter** on `GET /securities`, leaving the choice open.
  The relevant figure, ~~101 securities at **17,299 bytes** / ~2,591 gzipped~~ **re-measured
  2026-09-09 by Task 2.8.10: 518 securities with coverage are 150,660 bytes and 12,831
  gzipped** — so the whole universe is still in the browser and client-side filtering is
  still free at this size, but the uncompressed figure is now ~8.7x what this argument was
  written against. Note the universe crossed §6's 500 at Task 2.8.2 and the coverage array
  Task 2.8.9 added is most of the growth. Decide it on the ceiling rather than on today, and
  take the ceiling from a measurement rather than from this line. ~~**And take it
  uncompressed: Task 2.9.9 measured on 2026-09-10 that nothing on this path
  compresses** — neither the application nor the deployed ingress — so the gzipped figure
  above is what the payload _would_ cost, not what a browser receives.~~ **Reversed the
  same day by Task 2.9.10, which registered `@fastify/compress`: take it COMPRESSED
  again.** A browser receives **20,072 bytes**, not 190,736 — an order of magnitude, and
  it moves this decision rather than decorating it: at 20 kB the whole universe in the
  browser is comfortably free and client-side filtering needs no defending. The
  uncompressed figure is what an `Accept-Encoding: identity` client would get and nothing
  in this product is one. ~~The **~1.15 s** deployed fetch and the **~356 ms** conditional
  request (`MARKET-DATA-API.md` §12.5, §12.8) are pre-compression readings and **Task
  2.9.10 owes this line a re-take** once it is deployed; expect the first to fall towards
  the second.~~ **Re-taken 2026-09-10 against the deployed service, and the expectation
  held: the fetch is now **484 ms** against a **376 ms** conditional floor** — so what is
  left above the floor is about 100 ms of transferring 20 kB, and this endpoint's cost is
  now almost entirely the round trip. Whatever you decide about search, **the payload is
  no longer an argument against holding the universe in the browser.**
- **Grouping past 500.** Task 2.4.4 recorded the reversal trigger for the sector grouping:
  at §6's 500-security ceiling a single group is longer than a screen, and groups need to
  become jumpable or collapsible — **which is a control**, and controls were out of scope for
  Story 2.4. They are in scope for you.

---

## Amended 2026-09-10 by Task 2.10.9, after Story 2.10 closed — what you inherit rather than decide

The subject document is
[`FRONTEND-STATE.md`](../story-10-frontend-market-data-layer/FRONTEND-STATE.md)
and the decisions are ADR 0023. Read both before designing search; this is the
pointer rather than a second copy, and where they disagree the subject document
wins.

**The route already exists and the symbol is already a path segment.**
`/securities/:symbol` is declared in `routes/paths.ts`'s second table,
`ROUTE_PATTERNS`, and `securityPath(symbol)` builds a destination from one — a
pattern is **not** a destination, and six places walk `PATHS` as a list of real
destinations, one of them asserting every route has a distinct `<h1>`. So your
click-through builds a link with `securityPath()`; it does not add a third
spelling.

**There is no store, and you should not need one.** The URL holds the selection,
a bounded cache holds parsed series, and `useBarSeries` keys on the request as
sent. Clicking a row is a navigation, and the panel will paint a held series in
its first commit if the user has been there before.

**Two things are genuinely yours and both are stated as unsolved elsewhere.**

- **A client-side link between two securities does not exist yet, and its absence
  costs more than it looks.** Every route to a second symbol today is a document
  navigation, which reloads the bundle and takes the module-level cache with it.
  That is why the stale mark had to be demonstrated through the header
  navigation, and why _"the panel never shows one symbol's bars under another's
  name"_ is asserted in jsdom by request identity rather than in a browser. **Your
  click-through is what makes that browser assertion possible for the first
  time**, and it is worth adding when you add it.
- **The rate at which a live region speaks.** `/securities` now has **two**
  polite regions — the universe table's and the panel's — and the rule is one
  region per subject, with every sentence naming its subject
  (`FRONTEND-STATE.md` §7). Nothing today changes either region's text without a
  user having navigated or pressed something. **A search field that re-requested
  on every keystroke would drive a live region at typing speed, which is actively
  hostile.** You owe either a debounce upstream of the request or a decision to
  leave the region silent while a query is being typed — and if you add a third
  asynchronously-filled surface to this page, note that §7's reversal trigger
  fires: two self-describing sentences queue tolerably, and nobody has found out
  where that stops being true.

**One thing that is not yours**, so it is not taken in passing: the window
control and its calendar vocabulary are Story 2.13's, and the panel deliberately
carries no control that changes the window.

---

## Tasks — added 2026-09-10

Ten tasks, sequential. The shape follows Stories 2.9 and 2.10: **the decisions
are settled first and ship nothing** (2.11.1), the pieces that can be built
without a screen are built and tested on their own (2.11.2, 2.11.3), and the
control lands as early as the dependency graph allows rather than at the end.

**This story is visible in a way the two before it were not.** Six of the ten
tasks change something a person can see, and the first of those is fourth rather
than last. That is deliberate: this is the epic's exit criterion and the first
genuinely interactive control in the product, and a run of tasks with nothing on
screen is how a product stops being demonstrable.

**2.11.4 is the payoff and 2.11.6 is what makes it honest.** They are split on
purpose. The first is about the control working — matching, ranking, roles,
keyboard, and a navigation that opens a security. The second is about every way
it can go right while looking wrong: no matches, more matches than shown, a
security with no stored bars, an untracked security that must be found rather
than hidden, and a backend that is unreachable without the page collapsing.
Combining them is how the second half gets shortened.

**2.11.5 is a behaviour change to the whole page's lifetime**, not a link-tag
substitution. Every route to a second symbol today is a document navigation,
which reloads the bundle and takes the parsed-series cache with it. Ending that
is what puts the cache in the condition it was designed for and what makes the
browser assertion Story 2.10 could not write — _the panel never shows one
symbol's bars under another's name_ — possible for the first time.

**2.11.7 is the expensive-to-retrofit one.** Four later epics add a region to the
Security Explorer; the grid, the identity block and the placeholder treatment are
decided once here, while there are two real regions to decide them against.

| Task                                                                  | What it does                                                              | Visible?                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------- |
| [2.11.1](TASK-01-settle-search-selection-and-the-url.md)              | Where search lives, how it matches, what the address carries              | No                           |
| [2.11.2](TASK-02-the-matcher.md)                                      | What `nvid` matches, in what order, and the cap                           | No                           |
| [2.11.3](TASK-03-the-field-the-product-never-had.md)                  | The input idiom and its full state set                                    | **In the workshop**          |
| [2.11.4](TASK-04-search-on-screen.md)                                 | The combobox, results, and opening a security                             | **Yes — the payoff**         |
| [2.11.5](TASK-05-client-side-navigation-and-the-table-as-a-way-in.md) | Client-side navigation; a table row as a way in; the cache survives       | **Yes**                      |
| [2.11.6](TASK-06-every-search-state-produced.md)                      | Every state from a named cause, including untracked and unreachable       | **Yes**                      |
| [2.11.7](TASK-07-the-security-explorer-shell.md)                      | §8.3's shell: the grid, the identity block, five honest placeholders      | **Yes**                      |
| [2.11.8](TASK-08-the-universe-table-past-500.md)                      | The grouping control Story 2.4's trigger asked for, now that it has fired | **Yes**                      |
| [2.11.9](TASK-09-keyboard-screen-reader-and-the-journey.md)           | The keyboard flow, a screen-reader pass, and the browser journey          | Fixes rather than new pixels |
| [2.11.10](TASK-10-deployed-verify-document-and-adr.md)                | Deployed deep-load, `SEARCH-AND-SELECTION.md`, ADR 0024, the sweep        | **Yes — live**               |

**What this story deliberately does not take**, so that no task quietly does: any
chart, including a sparkline in a result row or in the shell (2.12 and 2.13); the
window control and its calendar vocabulary (2.13); provenance as a product-wide
requirement (2.14); selection from the overview (Epic 4) or the topology graph
(Epic 6); and comparing two securities (Epics 8 and 11).
