# Task 2.14.2 — The provenance surface, and the states it shares a page with, on the canvas

**Status:** Not started
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** 2.14.1

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
- **Draw provenance at the two prominences decision 1 weighed**, so the choice is
  made from two pictures rather than two sentences. A screenshot of a chart
  travels without its chrome; that argument is easy to make and easy to
  over-serve.
- **Draw the two-feed case**, which is the one nothing can currently produce and
  which Epic 3 makes real. This is the cheapest place in the project to find out
  that two labels plus a sentence plus a coverage line is three sentences under
  a chart.
- **Draw the classification block** — source and age beside a sector — at both
  the Security Explorer's identity block and, if 2.14.1 put it there, the
  universe table. A per-row provenance in a 518-row table is a different
  proposition from one in an identity block, and §28's open breach (Task 2.14.8)
  is about exactly that table's markup.
- **Draw the empty answers, both of them**, as `ChartVacancy` will render them.
  Placement is settled — it is on the plot, with `pnpm invariants` holding that
  it has one home — so what is drawn here is **wording and weight**, and whether
  the two answers look different or only read different.
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
- Every string drawn traces to a module named in 2.14.1's decisions — a canvas
  that invents copy is a second vocabulary.
- The four tests are applied in writing, with test 4's count stated as a number.
- `pnpm verify` passes.

## Notes

Do not build anything here. The one thing this task may touch in the tree is
`tokens.css` and `VISUAL-LANGUAGE.md`; components are 2.14.3 onward. The
separation is what made 2.13.2 cheap and 2.13.4 fast.
