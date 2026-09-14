# Task 2.14.2 — The provenance surface, and the states it shares a page with, on the canvas

**Status:** Not started
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** 2.14.1

> **Amended 2026-09-14 by Task 2.14.1.** Decision 1 is **taken** rather than left
> for two pictures to settle, and it introduces a surface this task did not know
> about: a new `SourceNote` at the foot of the Security Explorer, governed by _the
> note states what the chrome cannot, and never repeats what the chrome can_
> ([`PROVENANCE.md`](PROVENANCE.md) §1.3). The classification is a clause of that
> note and **not** of the universe table. Edited in place.

## Objective

Draw, on the design canvas, the surfaces Tasks 2.14.3–2.14.6 will build: a
series that says where its numbers came from, a security whose classification
names its own source and age, a recency line, and the two empty answers. Then
reconcile downward — canvas → `VISUAL-LANGUAGE.md` → `tokens.css` → components
(ADR 0026).

Task 2.13.2 is the precedent and its lesson is the reason this task exists
rather than being folded into the build: **the marks were specified before they
were drawn, and the tasks that followed were renderers.** The risk here is
specific and different. Provenance is _text added to a panel that is already
full_ — a coverage sentence, four prices, two window labels, a count, two plots.
Every one of these tasks adds a line to it. Drawn one at a time in a component,
five correct additions produce a panel that reads as a footnote pile.

## What the user can see when this lands

**Nothing in the running product.** The output is a canvas and a reconciled
document. The payoffs are 2.14.3, 2.14.4, 2.14.5 and 2.14.6. Say "nothing
visible" plainly.

## Work

- **Reach the canvas with `DesignSync`** and work in the existing
  `Component library for MarketPulse` canvas rather than starting one. ADR 0026
  is the chain and its **one standing exception** is the only licence to diverge:
  where a canvas value fails a measured accessibility floor, adopt the intent,
  not the value, and record the measurement beside the token. It has fired three
  times; expect it to fire here, because provenance is small type by nature and
  small grey type is exactly where the floor bites.
- **Draw the whole panel, not the addition.** One artboard showing the Security
  Explorer's Price and Volume regions complete, with everything this story adds
  in place at once. If the five additions cannot coexist legibly, that is a
  finding for 2.14.1's decisions to absorb now rather than a layout problem for
  2.14.5 to discover.
- ~~**Draw provenance at the two prominences decision 1 weighed**~~ — **decided,
  so draw the one.** §1.2 records why the screenshot argument was accepted in a
  narrower form than it is usually made (nothing short of a mark **inside the plot
  frame** survives a crop, and that mark is refused by ADR 0027's element budget
  and by §74's decluttering). What is drawn is the `SourceNote` as settled. The
  alternative is recorded in §1.3 rather than drawn.
- **Draw the note beside the masthead in the same artboard**, because §1.3's rule
  is a statement about **two** surfaces and is unreviewable from one. The test the
  canvas is for: put the masthead and the note on one screen and check that no
  fact appears twice. `Market feed: All US exchanges` in two places is not
  redundancy a reader forgives — it teaches them the small type is not worth
  reading, which is the harm ADR 0019 §3 turned on.
- **Draw the note's own empty state, which is nothing at all.** §0.1: a claim
  about data requires data, so the note does not render when a series has no bars
  — and that is the state CI, `store:bare` and every zero-bar page are in. An
  artboard that only ever shows the populated note has not drawn the commonest
  case in the test suite.
- **Draw the two-feed case**, which is the one nothing can currently produce and
  which Epic 3 makes real. This is the cheapest place in the project to find out
  that two labels plus a sentence plus a coverage line is three sentences under
  a chart.
- **Draw the classification clause** — the group's claim and the date — as part
  of the note, which is where §5 put it. **Not** the identity block and **not**
  the universe table: a per-row provenance in a 518-row table is a different
  proposition entirely, and §28's open breach (Task 2.14.8) is about exactly that
  table's markup. Draw it in the note; if the artboard argues for the table, that
  is a finding with a measurement attached and it goes to 2.14.8.
- **Draw the empty answers, both of them**, as `ChartVacancy` will render them.
  Placement is settled — it is on the plot, with `pnpm invariants` holding that
  it has one home — so what is drawn here is **wording and weight**, and whether
  the two answers look different or only read different. §6.3 has the two
  sentences; what is open is their weight, and it matters more than it looks,
  because on an empty page the vacancy sentence is the **whole** explanation on
  screen — the note has correctly rendered nothing.
- **Apply the four tests to the artboard** before reconciling: real funded
  product; designed rather than defaulted; a moment worth showing somebody;
  feels alive. Test 4 has now been answered _"not yet"_ **four** times and its
  count is this story's to carry (STORY.md §3 of the 2026-09-13 amendment). If it
  is deferred here, that is the **fifth**, and it is written down as such rather
  than noted in passing.
- **Reconcile downward.** Any new token goes into `tokens.css` with its
  rationale; `VISUAL-LANGUAGE.md` gains the provenance treatment as a named part
  of the language, because Epic 3 extends it and Epic 8 has its own kind of
  provenance to be consistent with.

## Done when

- The canvas holds the artboards above and `VISUAL-LANGUAGE.md` records the
  provenance treatment, with any exception measured and noted beside its token.
- **The masthead and the note were reviewed on one artboard and no fact appears
  twice.** This is §1.3's rule as an acceptance test, and it is read rather than
  asserted.
- Every string drawn traces to a module named in 2.14.1's decisions — a canvas
  that invents copy is a second vocabulary.
- The four tests are applied in writing, with test 4's count stated as a number.
- `pnpm verify` passes.

## Notes

Do not build anything here. The one thing this task may touch in the tree is
`tokens.css` and `VISUAL-LANGUAGE.md`; components are 2.14.3 onward. The
separation is what made 2.13.2 cheap and 2.13.4 fast.
