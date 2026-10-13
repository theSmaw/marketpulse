# Task 5.1.2 — The Rail Drawn on the Canvas

**Status:** Not started
**Story:** [5.1 The Decisions, the Adjustment, & `Relative performance` Drawn](STORY.md)
**Depends on:** 5.1.1

## Objective

**The canvas has 27 files and none of them is about an anomaly**, and three
reserved regions on the security page are about to be filled by three different
stories. One page drawn now, covering all three, is what stops it being drawn
three times — and **geometry and height are decided here because height is a
layout fact nothing below `pnpm e2e` can see.**

ADR 0026 makes the canvas the source of truth, and the chain is
**canvas → `VISUAL-LANGUAGE.md` → `tokens.css` → components**. The designer
draws before anything is built.

## What the user can see when this lands

**Nothing in the product.** The canvas gains `The rail that says how
unusual.dc.html`, and Stories 5.2 and 5.6 inherit a drawn idiom rather than
re-deciding one.

## Work

**One page, eight sections**, so 5.2 and 5.6 amend rather than redraw:

- **§01 The rail** — the three regions in column 3 at 1440, **and the honest
  degradation at 1024/768/390 where the span arithmetic stops producing a
  rail**. Draw the **hatch / built / hatch adjacency at 1440 as it will
  actually be**, because Epic 4's close routed a finding here: at 1440 the
  three unbuilt regions currently read as _more_ intentional than the four built
  ones, and this story puts one built region between two hatched ones.
- **§02 The comparison** — **one anchored bar track**, the subject's bar, the
  two reference **ticks on that same track**, the ladder — drawn at the rail's
  **real** width rather than a comfortable one.
- **§03 The excess** — the derived line's typography, the **`pts`** unit, the
  **achromatic** ink, `behind` / `ahead`, and the refusal — **beside the
  rejected version** (a fourth bar from zero, tinted green), so the rejection is
  on the page rather than in a task file.
- **§04 The footer** — two clauses, sentence-case micro: what the references
  **are**, and what the scale is. Never the basis, the instant, the feed or a
  connection word.
- **§05 The states** — all seven, four widths, in greyscale. Drawn as **intent**
  now and **replaced by photographs produced through the shipped socket path**
  at the story close, because Story 3.10's lesson is that a degraded set only
  finds things when its states come through the real path.
- **§06 The height** — the fullest state with the reserve outlined, and the step
  each absence would cost unreserved.
- **§07 Reserved for 5.2 and 5.6** — the slot each takes, **the one amber
  position**, and the rail's ink rule. Stated, not detailed.
- **§08 Reserved: the chart marker lane** — restating `VISUAL-LANGUAGE.md` line
  716's **16 px lane in the plot's top padding carrying the score as a number**,
  so 5.6 does not re-decide it, and noting that the lane and the rail must share
  one vocabulary.

**The seven-clause column idiom goes on the page**, because it is what 5.2 and
5.6 inherit: subject first and never ranked among its references; the rail owns
magnitude and the plots own time; one shared anchored scale per region, printed
and named; one footer of at most two clauses; one height per region in every
state; **amber appears exactly once in the rail and only as 5.6's band fill
behind its written name**; and the figure is never the link.

**`DesignSync` is unreachable from a subagent**, so the orchestrator proxies
every read and the upload. Writing to the canvas is pre-authorised. Reach the
project with `get_project` / `list_files`, **never `list_projects`** — that
method filters to design-system projects and this one is not, so the canvas
comes back **absent rather than listed**, and three stories have reached the
wrong conclusion from it.

## Done when

1. `The rail that says how unusual.dc.html` is on the canvas with §01–§08, and
   §02/§03/§06 are drawn at the rail's resolved width at **each** of the four
   widths rather than at one.
2. The **rejected** excess treatment is on the page beside the chosen one.
3. The column idiom's seven clauses are stated on the page in words 5.2 and 5.6
   can act on.
4. `VISUAL-LANGUAGE.md` is amended with anything the canvas gained, and the
   chain is walked in **both** directions — anything the document says that no
   token carries, and anything a component spells that the document does not
   license.
5. The upload is reported rather than asked about, and the page's address is
   recorded in the task.

---

## What was done — 2026-10-13

<!-- written at completion -->
