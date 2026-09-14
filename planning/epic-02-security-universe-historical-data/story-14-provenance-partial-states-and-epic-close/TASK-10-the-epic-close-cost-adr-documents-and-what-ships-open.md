# Task 2.14.10 — The epic close: the cost, the ADR, the sweep, and what ships open

**Status:** Not started
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** 2.14.1 – 2.14.9

## Objective

Close Story 2.14 and close Epic 2: take the cost figure with a database
running, write the ADR this story's **own** decisions need, sweep every document
that now describes a tree that has changed, apply the four design tests, and
state in writing what ships **open and with an owner** rather than quietly.

## What the user can see when this lands

**Nothing new on screen.** What changes is that the epic is finished and its
record is true. Say "nothing visible" plainly, and name what the user still
cannot do: **watch a price move.** There is no live data; that is Epic 3.

## What is already decided and must not be re-taken

- **The six ADRs this story's scope bullet lists already exist**, written at each
  story's own close: 0014 (the database), 0015 (migrations), 0018 (the provider
  and provenance), 0020 (the storage model), 0023 (frontend state), 0027 and
  0028 (charting). Plus 0016, 0017, 0019, 0021, 0024 and 0026, which the bullet
  does not name. **Reading acceptance criterion 7 as a backlog produces six
  duplicates.** What it actually owes is the ADR for _this_ story's decisions
  and a check that the index is complete.
- **ADRs are never renumbered and their decisions are never rewritten.** A
  present-tense description that has become false gets a **dated amendment**
  beside it.
- **An applied migration is immutable**, comments included. Applied migrations
  therefore contain historical claims that are wrong today, and that is the
  correct state — the sweep does not touch them.
- **Story files record what was true when they were written.** Amend live
  claims; leave historical records standing. A sentence duplicated for legibility
  is counted with a grep before it is corrected.

## Work

- **The ADR this story owes.** One ADR for the decisions Task 2.14.1 took — the
  obvious subject being **what a series says when its sources disagree about
  feed**, which is a wording rule with a mechanism behind it and which Epic 3 is
  the first thing to exercise. Fold in whichever of 2.14.1's other five
  decisions are load-bearing (the wire-level empty distinction is the candidate).
  Then read `docs/adr/README.md` and confirm the index covers every ADR through
  this one — the index is a current index, not an append log.
- **The cost figure, re-taken with the database running**, against the $20
  budget and its alerts (acceptance criterion 6). The free-offer clock started at
  signup — the subscription's first resource is stamped `2026-09-03T05:32:32Z` —
  so record **how much of the twelve months is spent** alongside the monthly
  figure, because that is the number that decides anything. `HOSTING.md` is the
  home, and the B1MS tier and the networking mode are the two irreversible
  choices the figure should be read against. **Market data is free** — Alpaca
  costs quota, not cash; do not report a provider request as a cost.
- **The must-not-ship fixture sweep, against the deploy build.** The list grew by
  five in Story 2.13 — `dense`, `uncovered`, `holiday-week` (**357 kB**, now the
  largest), `daily` and `daily-year` — each with its own distinctive grep. All
  seven were re-run green at Story 2.13's close against a freshly built `dist/`.
  **They have never been run against the _deploy_ build**, which is a different
  invocation on a different machine, and this story is the one that touches the
  deploy. Run them there.
- **The document sweep.** `CLAUDE.md` and `README.md` reflect what actually
  landed (criterion 7): the current-state section, the "what a user can see
  today" section, the open items, the epic status. `EPIC.md` gains its close.
  And specifically — **this story's own STORY.md contains the inverted premise**,
  the IEX disclaimer struck through in two places, plus scope prose Task 2.14.1
  flagged; live claims get amended, the struck-through record stays.
- **The four design tests, applied to a screenshot of what this story built**,
  in writing: real funded product; designed rather than defaulted; a moment worth
  showing somebody; **does it feel alive**. That fourth has been answered _"not
  yet"_ **four** times — Task 2.4.4, Story 2.12's close, Task 2.13.2 and Story
  2.13's close — each correctly and for the same reason: the hard version of the
  question is what happens when a **price** changes, and there are no live
  prices. If it is deferred again here, **write the number five**, and note that
  its trigger is the calendar rather than a condition, which is precisely why it
  needs writing down: nothing fires.
- **State what ships open, with owners.** Neither is this story's work and both
  are the close's to record honestly — _"nobody checked"_ and _"it was checked
  and it was fine"_ are different artefacts and only one is worth anything to
  Epic 11:
  - **The listening pass.** Whether a polite live region changing every 477 ms
    **queues or replaces** is a property of a specific screen reader on a
    specific platform — not readable from the DOM, a timing, or by an agent. The
    repair is designed and unshipped: split the sentence, do not raise the floor.
    **Owner: a person with a screen reader, before Epic 11 hands this surface to
    a model.**
  - **The weekday `1D` photograph.** Narrower since 2026-09-14 — a named window
    now ends at the last session whose bell has rung, so the photograph that
    cannot be taken is only the one between the bell and that night's backfill.
    **Owner: the next person to open `/securities/NVDA?sessions=1` on the
    deployed site during market hours.**
  - Plus whatever Task 2.14.8 deferred, and the `synthetic` branch that no
    recorded body exercises.
- **Hand Epic 3 what it inherits**, in one paragraph in `EPIC.md`: the
  provenance pattern extends from _which feed_ to _which feed, and is it still
  connected_; `FeedIndicator` has read `disconnected` throughout this epic
  deliberately and correctly and Epic 3 is what makes it true; and the two-feed
  sentence this story wrote is the first thing Epic 3's socket will produce.
- **Then the gates.** `pnpm verify`, `pnpm e2e`, `pnpm e2e:deployed`, and
  `pnpm test:database` — the last is not in `verify` and this epic is the one
  that added every database test in the tree.

## Done when

- Acceptance criteria 1–8 are each addressed by name, with what discharged them.
- The story's ADR is written and `docs/adr/README.md` indexes it.
- The cost figure is in `HOSTING.md`, dated, with the offer's remaining months.
- All seven fixture greps were run against the **deploy** build and found
  nothing.
- `CLAUDE.md`, `README.md`, `EPIC.md`, `STORY.md` and `docs/GAPS.md` describe the
  tree that exists; `pnpm links` and `pnpm invariants` pass.
- The four tests are applied in writing and test 4 carries a count.
- Everything shipping open is named with an owner.
- `pnpm verify`, both browser suites and `pnpm test:database` are green.

## Notes

Do not idle while the suites run — write the record, amend the documents,
prepare the commit. And do the document sweep with greps rather than from
memory: this epic's own history contains a day on which two documents recorded
that a spec claim was false while the spec, the README, two ADRs and an
invariant went on asserting it.
