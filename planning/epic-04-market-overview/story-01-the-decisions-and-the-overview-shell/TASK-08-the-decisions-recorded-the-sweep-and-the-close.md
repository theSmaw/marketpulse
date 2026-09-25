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

## Amended by Task 4.1.4 — 2026-09-25: removing the render check orphaned two components, and nothing can see it

**`SecurityRow` has no shipped renderer at all**, and `AnomalyBadge`'s only
shipped renderer is `SecurityRow`. Both were Story 1.4's; the render check was
their last consumer, and Task 4.1.4 removed it.

**Nothing in `pnpm verify` can notice.** `pnpm stories` asserts every component
under `src/components/` **has** a stories file — the opposite direction — so a
component nothing renders keeps its stories, keeps its tests, keeps its place in
the coverage denominator, and looks exactly like a component in use.

### This is a disposition rather than a deletion, and the reason is in the components

- **`AnomalyBadge` is Epic 5's**, early. It renders §11's 0–100 band with its
  explanation, which is the section's own requirement — _every score should have
  an explanation_ — and it was built with four named bands rather than a
  gradient because **a band can be labelled and a gradient cannot**. Deleting it
  would throw away a decision Epic 5 would have to re-take.
- **`SecurityRow` is less clear.** It is the ancestor of `UniverseTable`'s rows
  and the place the anomaly band met a price, which is a shape Epic 5 needs and
  may or may not want in this component.

**So the close records them, with an owner and a condition** — never a story
number — and the candidates are: keep, with a written statement that they are
knowingly unrendered; or delete, with the record saying where the decisions went.
**What is not acceptable is leaving them unremarked**, because dead code that
looks alive is how a later author discovers a component by reading it and
believes it is in use.

### And ask whether it can be made mechanical

`docs/GAPS.md`'s standing instruction is that an entry which can be made
mechanical should be. **A check that every component under `src/components/` is
rendered by something shipped is a grep**, and this repository has turned seven
prose entries into `pnpm invariants` checks already.

**Weigh it honestly rather than assuming**: the check has a false-positive shape
— a component rendered only through a barrel, or only by another component that
is itself orphaned, needs the walk to be transitive — and a check that cries
wolf is worse than a list. **If it is written, it owes a break.**

## Amended by Task 4.1.5 — 2026-09-25: one namespace worth grepping, and the shape of this story's close

### A naming class the sweep can check cheaply

**Task 4.1.5 found a comment naming the wrong guard**: Task 4.1.4's invariant
said `feed-words-in-a-renderer` keeps the feed sentence unique. That is the
**break**; the invariant is `one-home-for-the-feed-words`.

**These are two namespaces that look like one.** `scripts/breaks.mjs` names
_defects_ (`a-second-clock-on-the-landing-page`), and
`scripts/check-invariants.mjs` names _claims_
(`one-caller-of-the-market-clock`) — and both are lowercase kebab-case
identifiers in backticks, written in prose, by the same author on the same day.

**The sweep can check it with a grep rather than a reading**: every
kebab-case identifier in a backtick in `scripts/`, `docs/` and `planning/`
should be either a break name or an invariant id, and the ones that are neither
are either typos or checks that do not exist. **The second kind is the one this
epic keeps finding.**

> **Do not build a checker for this without weighing it.** The false-positive
> shape is obvious — every kebab-case phrase in prose is a candidate — and a
> check that cries wolf is worse than a list. A one-off grep at the close may be
> the right answer, recorded with its result.

### What this story's close depends on, and when it can happen

**Two of this story's tasks need the market open** — 4.1.6's coverage curve and
4.1.7's phone — and this task depends on both. The US session is 21:30–04:00
local.

**That is a booking rather than a block**, and the distinction is Epic 3's:
Task 3.11.1 established that **nothing in a close should wait on a clock**, and
the repair was to make sure everything that could be done without one was. The
same applies here — the instrument, the wording, the sweep and the decisions
are all doable in daylight, and what genuinely needs the bell is **one poll and
one look.**
