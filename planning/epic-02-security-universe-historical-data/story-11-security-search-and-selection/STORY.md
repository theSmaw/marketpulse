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

1. **Where search lives.** A dedicated route, a persistent control in the chrome, or both.
   A persistent control is how an analyst tool usually behaves and it makes symbol
   switching cheap, which is what Epic 5 onward wants; a route is simpler and does not
   touch `AppHeader`, which currently has a deliberate three-region status strip
2. **Client-side or server-side matching.** 100 securities fit in the browser and give
   instant results with no request per keystroke; the architecture is meant to expand to
   500, which still fits. Server-side is the general answer and costs a round trip per
   keystroke unless debounced
3. **The URL shape** for a selected security, since it is user-visible and shared

## Design surface

This is the epic's first real design work: a search affordance, a result row that carries
four facts without becoming a table, the Security Explorer's layout under §8.3, and the
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
  The relevant figure: 101 securities are **17,299 bytes**, ~2,591 gzipped — so the whole
  universe is already in the browser and client-side filtering is free at this size. At §6's
  500 it is ~13 kB uncompressed, still small. Decide it on the ceiling rather than on today.
- **Grouping past 500.** Task 2.4.4 recorded the reversal trigger for the sector grouping:
  at §6's 500-security ceiling a single group is longer than a screen, and groups need to
  become jumpable or collapsible — **which is a control**, and controls were out of scope for
  Story 2.4. They are in scope for you.
