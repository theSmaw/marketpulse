# Task 4.1.1 — What the shell already is, and the four decisions this story cannot start without

**Status:** Not started
**Story:** [4.1 The Decisions & the Overview Shell](STORY.md)
**Depends on:** —

## Objective

**Read before building, and ask before deciding.** This story was written from
`PRODUCT_SPEC.md` §9 and Epic 4's `EPIC.md`; neither of them describes the
landing route as it exists in the tree **today**, and the tree is further along
than the story assumes.

## What the user can see when this lands

**Nothing** — and the two tasks after it are cheaper because of it.

## What is already there, to be confirmed rather than assumed

`apps/frontend/src/routes/MarketOverview.tsx` is not an empty placeholder. Task
1.5.4 put a **region structure** around it, and the file's own comments record
decisions this story would otherwise re-take:

- **A `Region` component with a `name` and a `filledBy` sentence**, which is
  already ADR 0029's defer rule in a component. **Three regions defer correctly
  today** — the topology to Epic 6, unusual activity to Epic 5, investigations
  to Epic 7 — and one names **this epic**.
- **Two of §8.1's contents deliberately have no region at all.** The file says
  why: _"where they belong is a question about their shape, and Epic 4 is the
  first thing that will know it. Adding two more empty boxes now would be
  guessing."_ The index/ETF summary and sector performance are **this story's to
  place**, and that sentence is the instruction.
- **Story 1.4's render check occupies the topology region**, and it is
  **load-bearing** rather than decorative: the `@marketpulse/shared` import in
  that file is the only thing proving the workspace dependency resolves through
  **the bundler** as well as through `tsc`, and Task 1.5.1 recorded ~100 kB of
  artefact that routing it out would quietly reclaim.

**Confirm each of these against the file rather than against this list**, which
is the same instruction Epic 3's closes kept earning.

## The four questions, to be put to the owner with their options priced

Each is written in `STORY.md` with its alternatives. This task's job is to put
them in front of the owner **with what is measured beside them**, and to record
the answers where the story that needs them will read them.

1. **The denominator** — what _current_ means. Task 4.1.6 measures the shape of
   the answer; this task establishes that the question is open and that four
   stories depend on it.
2. **Where an aggregate is computed** — backend `currentMarketState` or the
   browser's `LiveFeedView.observations`.
3. **The 390 fold** — owed a person before this epic ships a screen. Task 4.1.7
   takes it; this task books it.
4. **Whether this screen re-orders under live data.**

> **Two of the four are answerable today and two are not**, and saying which is
> the useful output. A decision recorded as _taken_ when it was in fact assumed
> is the shape Epic 3 produced twice.

## Work

- The route file read end to end, and every decision its comments record listed
  with a verdict: **still true**, **this story's to change**, or **false**
- `PRODUCT_SPEC.md` §8.1 and §9 compared against what the regions currently are
- The four questions put to the owner, with options and costs
- Answers written into `STORY.md`'s _Open decisions_ section **and** into the
  task that consumes each one — a pointer back is what a reader follows when
  they already know to look

## Done when

1. The route's existing decisions each have a verdict
2. The two unplaced §8.1 contents have a named owner task
3. Four questions have four answers, or a recorded reason a question cannot be
   answered yet and what would answer it
