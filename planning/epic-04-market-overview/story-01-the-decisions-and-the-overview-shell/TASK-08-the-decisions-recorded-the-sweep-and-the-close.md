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
