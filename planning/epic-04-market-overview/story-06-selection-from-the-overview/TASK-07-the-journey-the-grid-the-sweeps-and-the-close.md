# Task 4.6.7 — The journey, the grid, the sweeps and the close

**Status:** Not started
**Story:** [4.6 Selection From the Overview](STORY.md)
**Depends on:** 4.6.6

## Objective

**The epic's exit criterion in a single interaction, verified — and what the
verification cannot say.**

## What the user can see when this lands

**Nothing.** The story is finished.

## Work

### The journey spec, and its data problem has two ends

AC 5 as written — _land on `/`, reach a mover, open it, read a figure_ —
**cannot pass on CI at either end**: `eligible: 0` so there is no mover, and
zero bars so there is no figure. **This is the exact six-minute round trip
`CLAUDE.md` records at `#314`.**

**Three tests, and one anti-fixture rule.**

**Test 1 — gated, furnished origin, structural destination.** Drive the
overview frame through the **shipped encoder**, satisfying `readMovers`' six
cross-field checks, with **real curated tickers** so the destination is a page
the product has. Activate one row by pointer and a second by keyboard. Assert
the URL and that the destination's identity block **names that symbol** —
identity, not a figure.

**Test 2 — the figure half, skipped loudly.** `test.skip()` **with its reason
printed by name** when the store has no bars, which is
`overview-movers-ranking.spec.ts`' shipped idiom.

**Test 3 — deployed, structural.** `specs-deployed/`: land, activate, assert
the identity block. No figure, per that suite's rule. **And note
`docs/GAPS.md:464`** — `e2e/specs/` and `e2e/specs-deployed/` are two
directories and a grep over one finds neither the other's copy nor the fact
that there is one. **Grep over `e2e/`, never `e2e/specs/`.**

**The anti-fixture rule, which is what makes test 1 worth more than its
fixture:** read the ticker **out of the row the test is about to activate** and
assert the URL contains _that_ string — never the constant the test sent. And
**activate the third row**, asserting the URL is not the first row's symbol:
**a handler that always opens row 0 passes a first-row test**, which is the
position-resolved defect arriving by the front door.

### The grid — the axis is activation, and the two speakers are the href and the handler

Walk the **producers**: every row and figure the page can draw, printing per
row — figure state, is-it-a-link, `href`, computed accessible name, tab-stop
count, `cursor`. **The grid is wrong if any state shows href ≠ handler, or a
non-link with a link's affordance.**

Cover: figure state × activatable over four surfaces (**on CI only `unknown`
occurs, for ever**, so the grid is the only place the other three are seen);
resting / hover / `:focus-visible` / active / held / reduced motion; the
population edges — an uncurated symbol, a pending name, the `Not ranked` group,
the six reserved regions; **four widths plus a deliberately short viewport**;
**both tab directions at every width with the ring box read**; and greyscale,
with the pass's own criterion — **no two states read identically at any
width**.

### The sweeps

**Upward**: `PRODUCT_SPEC.md` §8.1 and §9 — the overview becomes a place you
leave from, which is §8.1's own description finally true.

**Sideways**: the grep **and** the second pass over the epic's own story list.
**That second pass found what the grep could not in both of the last two
stories** — 4.5's missed Stories 4.7 and 4.9 entirely. Record the miss count.

**`docs/GAPS.md`** gains at least: no gated machine has ever clicked a mover;
the sector region renders **no `<ol>` when nothing is ranked**, so every
list-keyboard assertion in it is vacuous on the gate; AC 5's last clause is
unreachable on any gate; the pointer's **moment of entry** is unguarded, with
the measured rates; and **a ninth screen-reader entry** — whether a
client-side route change with an unchanged `document.title` is announced at
all. **That ninth is the inverse of the other eight**: they are unprompted
updates, and this is a change the reader explicitly asked for, which is the one
case where announcing is unambiguously right.

### The close

`STORY.md`; `CLAUDE.md`'s _Current state_; `LIVE-REHEARSAL.md` if the story
needs a person; Gate 2.

## Done when

1. Three journey tests exist, the gated one non-vacuous on CI, with the
   anti-fixture rule applied and the third row activated
2. The grid is produced with the producer walk run and its findings recorded
3. The sideways sweep's miss count is recorded, **including the second pass**
4. `PRODUCT_SPEC.md` carries its dated amendment and the GAPS entries are
   written
