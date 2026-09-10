# Task 2.11.8 — The universe table past 500: a control on it at last

**Status:** Not started
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
    cannot reach one is close enough to matter — check it.
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

## Notes

The measurement worth taking rather than assuming: **is the table now large
enough that rendering it is a problem?** 518 rows is not obviously one, and this
repository's rule is not to build infrastructure before the iteration that needs
it — so virtualisation is out of scope unless a measurement in this task says
otherwise, and if it does, that measurement is the finding and the work belongs
to Epic 14, which owns performance. Record the number either way; a claim about
render cost with no figure behind it is exactly what `CLAUDE.md` asks not to
carry forward.
