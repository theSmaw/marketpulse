# Story 4.9 — The Rehearsal, the Sweep, & Epic 4's Close

**Status:** Not started
**Epic:** [Epic 4 — Market Overview](../EPIC.md)
**Depends on:** 4.8
**Epic scope covered:** the close

## Description

**The close, and this epic inherits a shape that has been run once end to
end.** Epic 3's close is the template and its record says what each step is
worth:

- **The rehearsal ledger.** `LIVE-REHEARSAL.md` has one row per story that
  changes something a stranger can see, taken **during a session, against the
  real feed, by a person**. Epic 3 learned that an instrumented row does not
  satisfy the word _watched_ — and that the epic stayed open for nine stories
  because of it. **This epic's visible stories each owe a row, and the sitting
  is bookable rather than a judgement.**
- **The upward sweep.** Falsification travels upward and nothing sweeps that
  way on its own: a task measures something and what it invalidates is a
  premise in an ADR, an invariant in `CLAUDE.md`, or `PRODUCT_SPEC.md`.
  **Against the list and against a grep** — the list is what somebody thought
  of, the grep is what is there.
- **The hand-off enumeration.** Grep this epic's documents for every
  `Story N.M`, `Epic N` and `Owner:` line, check each against the recipient's
  **own** file, and record the count that were missing. The record across five
  runs reads **1, 6, 3, 6, 2**, and it has caught something every single time.
- **`docs/GAPS.md`.** An entry that can be made mechanical should be. A live
  aggregate generates exactly the kind of claim that rots silently.

**And one thing this epic owes that Epic 3 did not**: its headline numbers are
**aggregates**, and an aggregate is checkable by nothing. A breadth percentage
that is quietly wrong looks exactly like one that is right, on every screen, in
every test. **The close has to say what would catch that**, and _a person
looking_ is a legitimate answer as long as it is written down as one.

## What the user can see when this story lands

**Nothing new**, and a landing page whose figures can be re-taken rather than
cited.

## Acceptance criteria

1. Every criterion in Stories 4.1–4.8 has a verdict with an instrument named,
   split between **re-takes from a clean clone** and **dated readings** a later
   reader cannot reproduce
2. **A person has watched this screen during a live session**, with a dated row
   per visible story, and the `What was wrong` column filled honestly
3. The upward sweep run against the list **and** a grep, with live claims
   amended by date and historical records left standing
4. The hand-off enumeration run and its count recorded — the sixth data point —
   **including if it is zero**
5. `docs/GAPS.md` updated, with anything mechanisable made mechanical, and the
   aggregate question above given an owner and a condition
6. `pnpm verify`, `pnpm test:database`, `pnpm e2e` and `pnpm links` green, with
   their numbers rather than an assertion
7. **Epic 4 closed**, its exit criterion verdicted, and what ships open carrying
   an **owner and a condition** rather than an epic number

## Design work

The canvas artefacts this epic produced are given a verdict on whether they are
finished, and `VISUAL-LANGUAGE.md` is reconciled with anything the canvas
gained — the chain is **canvas → `VISUAL-LANGUAGE.md` → `tokens.css` →
components**, and it only stays true if a close walks it.

## Out of scope

Epic 5's anomaly work, which fills the region this epic leaves named.

## Handed here by Task 4.2.2 — 2026-09-26: the rehearsal row for the proxy strip must say WHICH of two things was watched

**The proxy strip's arrival mark fires on up to four cells at once, and
whether that reads as _four facts arriving_ or as _the page refreshing_ depends
on a fact nobody has measured.**

Task 4.2.1 established that the gateway sends **up to ~16 `bars` frames a
minute**, not one — the story's own premise, corrected. Each security still
produces one bar a minute, but **whether `SPY`, `QQQ`, `DIA` and `IWM` arrive
in ONE of those frames or spread across several decides the question**: four
marks in one frame is a synchronised wave, and four across several frames is a
stagger the data genuinely has, arriving free.

**So read it from the gateway BEFORE the sitting and write the answer beside
the row.** A rehearsal that cannot say which of the two the watcher saw cannot
answer anything — and this is the shape of defect this epic has already paid
for once, where an instrument counted every socket on a page and two of three
were Vite's.

**The inherited reversal trigger is live here.** `The mark multiplied by five
hundred.dc.html` shipped 518 simultaneous marks with the synchrony risk
recorded as **accepted rather than disproved** — _"whether a synchronised wave
reads as a market breathing or as a page flashing … a judgement only a person
watching a real session can return"_ — under a two-clause trigger: _the first
rehearsal in which a reader describes the minute tick as a **flash** rather
than as a **pulse**_, **or the first surface where the burst stops being once
a minute**. The second clause is the one to watch, because this strip is four
subjects rather than 518, and the defence that carried the table — twelve
discs scattered in a viewport reading as texture — needs a density four cells
on one horizontal line do not have.
