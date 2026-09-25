# Task 4.1.8 — The decisions recorded, the sweep, and the close

**Status:** Not started
**Story:** [4.1 The Decisions & the Overview Shell](STORY.md)
**Depends on:** 4.1.5, 4.1.6, 4.1.7

## Objective

**Four decisions, four consumers, and the thing this repository keeps learning:
recording a decision and propagating it are two obligations.**

## What the user can see when this lands

**Nothing**, and four later stories start from answers rather than from a
re-derivation.

## Work

### The decisions, written where they are consumed

Each of the four goes into **the story that acts on it**, in words that story
can use — never a link back, because a pointer is what a reader follows when
they already know to look, and the whole failure is that they do not.

| Decision                              | Consumer                           |
| ------------------------------------- | ---------------------------------- |
| The denominator, and the words for it | 4.4 primarily; 4.3 and 4.5 inherit |
| Where an aggregate is computed        | 4.2 builds it; 4.3–4.5 use it      |
| The 390 answer                        | 4.7, and any repair                |
| Whether this screen re-orders         | 4.5 owns the shape                 |

**And the hand-off enumeration applies here too**: grep this story's documents
for every `Story N.M` and `Owner:` line and check each against the recipient's
own file. The epic-level record across five runs reads **1, 6, 3, 6, 2**, and
it has caught something every time it has run.

### The sweep

- **`PRODUCT_SPEC.md` §9's sketch** against what was built, with a dated
  amendment where the screen differs and why — a spec sketch is a live claim
- **Task 1.5.4's comments** in the route file: the two unplaced contents are
  placed, and the render-check paragraph is false once 4.1.4 lands. Comments
  are code and rot the same way
- **`CLAUDE.md`'s _What a user can see today_**, which still describes a
  landing route that is a placeholder naming Epic 4
- **Epic 6's and Epic 5's `EPIC.md`**, which inherit the regions this story
  leaves named — and whose own files should say so rather than learning it from
  a comment in a route

### The close

- Story 4.1's acceptance criteria verdicted with an instrument named
- What ships open carrying an **owner and a condition** rather than a story
  number
- `pnpm verify`, `pnpm e2e` and `pnpm links` green, with their numbers

## Done when

1. Every decision is in its consumer's file, in usable words
2. The hand-off count is recorded, including if it is zero
3. The sweep is run against the list **and** a grep
4. Story 4.1 is closed, or the single reason it is not is named with its owner

## Amended by Task 4.1.1 — 2026-09-25: three decisions are already written, and one of them may owe an ADR

**The recording half of this task is mostly done.** Task 4.1.1 wrote the three
answers into `STORY.md` **and** into each consuming file — Stories 4.2, 4.3,
4.4 and 4.5, and Task 4.1.6 — rather than leaving them for the close. **What
remains is to verify that, not to do it**: grep each consumer for the
constraint in its own words, and record any that are missing, which is the
enumeration this product runs at every close and which has caught something on
all five of its runs.

### The judgement this task now owes

**Decision 2 adds a new FRAME TYPE to the market-stream wire**, and this
repository has a precedent for the smaller version of that: ADR 0033 added a
**field** — `sentAt` — and carries four constraints about how it may be used.
A frame type is bigger.

**So: does the overview frame owe an ADR of its own?**

- **For**: the wire is a contract three epics already read, ADR 0031 says what
  a transport without a schema layer owes, and _which frames exist_ is exactly
  the kind of decision a later reader looks for in `docs/adr/` rather than in a
  story file.
- **Against**: ADR 0031 may already cover it, and this product's rule is that
  an ADR is written **only where a decision has no home** — Task 3.11.9's
  verdict on four candidates was that two already had one.

**Decide it in writing either way**, and if the answer is yes, it is Story
4.2's to write rather than this task's — this task decides, 4.2 builds and
documents.

## Amended by Task 4.1.2 — 2026-09-25: one hand-off nothing owns, and it is to an epic two away

**The canvas's interim layout has a reversal trigger — _the first commit that
renders a graph node on this route_ — and the epic that will trip it does not
know it exists.**

When Epic 6 draws its first node, **the overview's layout changes**: the
reserved band becomes the primary area, and sectors and movers drop to a lower
band. That is not Epic 6's design work to invent; it is drawn already, in
`Market overview.dc.html` §02.

**So this task writes it into Epic 6's own `EPIC.md`, in words that epic can
act on** — never a pointer back. The enumeration this product runs at every
close has caught a missed hand-off on all five of its runs, and **the two it
caught most recently were both cases where an ADR said in its own text that the
receiving epic did not know**, and nobody then told it.

**What Epic 6 needs to be told, specifically:**

- The landing route runs an **interim layout** until its first node renders.
- **The end state is already drawn** — it does not need designing, only
  building, and the regions keep their names, their order and their landmarks
  across the change.
- **The reserved band does not grow in the meantime.** If it has, something has
  gone wrong that predates Epic 6.

## Amended by Task 4.1.3 — 2026-09-25: two live claims are now false, and one new component state needs its home checked

**The sweep has concrete subjects rather than a category.**

### Two sentences this story made false

- **Epic 4's own `EPIC.md`**: _"And the landing route is currently a placeholder
  naming this epic."_ It is not. It is seven named regions, three of them added
  by Task 4.1.3, five drawn in the reserved state and one still holding Story
  1.4's render check until Task 4.1.4. **The paragraph is this epic's own and it
  is the first thing a reader of this epic meets.**
- **`Region.stories.tsx`'s `Empty` story** said _"what three of the four
  landing-route regions look like today"_ — corrected in the same change, and
  noted here because **a story's prose is a live claim about the product** in
  exactly the way a task file's is not.

**Check `CLAUDE.md`'s _What a user can see today_ with a grep rather than a
memory.** Its seven-regions paragraph is about the **security page** (§8.3) and
is still true; whether anything there describes the landing route is a question
for the grep, not for this sentence.

### One component state, and where it is written down

`Panel.reserved` and `Region.awaiting` are new, and `VISUAL-LANGUAGE.md` gained
_The landing screen_ for them in Task 4.1.2. **The close checks the chain ran in
the right direction and stops** — canvas → `VISUAL-LANGUAGE.md` → `tokens.css`
→ components — **and that nothing in it needs an ADR.** The working assumption
is that it does not: this is a component state in a documented language, not a
decision about what the product does, and Task 3.11.9's verdict on four
candidates was that two of them already had a home.
