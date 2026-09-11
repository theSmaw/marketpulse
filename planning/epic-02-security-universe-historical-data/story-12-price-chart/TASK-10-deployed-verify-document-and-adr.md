# Task 2.12.10 — Deployed, verified, documented, and the four tests applied

**Status:** Not started
**Story:** [2.12 Price Chart](STORY.md)
**Depends on:** 2.12.8, 2.12.9

## Objective

Close the story: see the chart working on the deployed site, finish
`CHARTING.md`, write the ADR, sweep what this story falsified **upward**, and
apply the story's design bar to a screenshot of what was actually built.

## What the user can see when this lands

**The chart, live**, at the deployed address, on a cold load, from a link. Up to
now it has been true on a development machine.

And the epic's exit criterion is half a story from met: a user can search for
NVDA, open it, and inspect its recent historical **price**. Volume and the window
are 2.13.

## Work

- **Deploy and check it deployed, honestly.** The frontend's upload is not
  atomic and the window _opens_ at the second the deploy step reports success,
  so poll for coherence rather than checking once. A deployed check runs after a
  merge and gates nothing — its output is a rollback decision.

- **Apply the four tests to a screenshot**, which the story states as an
  acceptance criterion rather than as polish: would a stranger believe this is a
  real funded product; does it look designed rather than defaulted; is there a
  moment in it worth showing somebody; does it feel alive. **If the answer to
  any is no, the story is not finished** — and "we will polish it in Epic 15" is
  not available, because Epic 15 is a release epic and polish deferred is polish
  never.

  Take the screenshot at the three viewports, in the region's real width, with
  real data — not in the workshop, where a component looks better than it does
  in place.

- **Finish `CHARTING.md`.** It is the subject document for how this product
  draws, and Epics 5, 6, 8, 9 and 11 are its readers. By the close it holds the
  five decisions, the measurements behind them, what the wrapper's props are and
  why, the axis and the market gap, the states, the accessibility findings and
  the performance figures.

- **Write the ADR — 0027**, next in sequence, never renumbered. Its subject is
  the charting decision and **what a green check does and does not certify**,
  which is this repository's ADR shape. Add it to
  [`docs/adr/README.md`](../../../docs/adr/README.md)'s index, which currently
  claims 0001–0026.

- **Sweep upward, the same day.** `CLAUDE.md`'s rule: falsification travels up,
  and a story close sweeps only that story's own documents unless somebody
  makes it sweep further. Concretely, at least:
  - `CLAUDE.md`'s **Current state** paragraph, which says today that a user
    **cannot see a chart of anything** and names this story. It is a live claim
    and becomes false the moment 2.12.4 merges.
  - The **Where the record lives** table gains `CHARTING.md`.
  - The **Intended stack** and **Frontend structure** sections, if the decision
    added a dependency or a second feature module. A second feature module also
    fires the `no-restricted-imports` trap recorded under _What `pnpm verify`
    does not cover_ — **the market module's pattern must live inside the browser
    boundary's own `patterns` array**, because flat config resolves to the last
    matching object and a new block _replaces_ rather than adds. That is the
    most dangerous entry on that list and this is the first story since it was
    written that is likely to touch it.
  - The **What `pnpm verify` does not cover** list, which this story will add to
    — a chart is layout, colour and timing, and none of those are visible below
    `pnpm e2e`. Each entry states how to re-measure it.
  - This story's `STORY.md`, the [`EPIC.md`](../EPIC.md) status line, and
    `planning/EPICS.md` if anything moved.
  - `README.md`, if what a person can do with a running copy has changed —
    it has.

- **Historical records are left standing.** Amend live claims; give an ADR a
  dated amendment rather than a rewrite; leave story files recording what was
  true when written. And count a duplicated sentence with a grep before
  correcting it.

- **Hand Story 2.13 what it needs**, in writing: the axis it inherits, the
  density decision, the seam Story 2.14 renders, and the daily-series calendar
  walk that its window control will be the first thing to pay for.

## Done when

- The chart is verified working on the deployed site, on a cold load and from a
  deep link
- Screenshots at three viewports exist and the four tests are applied to them in
  writing, with a verdict
- `CHARTING.md` is complete and linked from `CLAUDE.md`'s record table
- ADR 0027 exists and is in the ADR index
- Every live claim this story falsified is corrected, and the historical records
  are not
- `STORY.md` and `EPIC.md` reflect what is true
- `pnpm verify`, `pnpm e2e` and `pnpm e2e:deployed` pass

## Notes

The failure mode of a close task is recording the correction and not propagating
it. `CLAUDE.md` records the day that happened: for a day, two documents recorded
that `PRODUCT_SPEC.md` §7.1's feed claim was false while §7.1 itself, `README.md`,
two ADRs and an invariant went on asserting it. Grep for the claim, not for the
document you remember writing it in.

The second failure mode is calling the design bar met because the chart is
correct. Correct and accessible is the floor. The four tests are about whether
anybody would want to look at it.

---

## Amended 2026-09-11 by Task 2.12.1 — two sweep items collapse, and one is added

**The most dangerous item on the sweep list does not fire for this story.** The
Work section flags the `no-restricted-imports` trap — a second feature module's
pattern replacing rather than adding to the browser boundary's, because ESLint
flat config resolves to the last matching object. `CHARTING.md` §1 added **no
dependency at all**, and
[Task 2.12.3](TASK-03-scales-ticks-and-the-market-gap.md)'s amendment settles
that the chart arithmetic lives in the **existing `market` module** rather than in
a new `charts/` one. So:

- **_Intended stack_ needs no change for a dependency**, because none was added.
  It may still need one for what the chart layer _is_ — see the addition below.
- **_Frontend structure_ needs no change**, and the flat-config trap is not
  touched. **Confirm this rather than assuming it**: if 2.12.3 ended up creating a
  module after all, the trap is live and it is the single most dangerous entry on
  `CLAUDE.md`'s list.

**One addition to the sweep, which is a live claim this story falsifies and the
Work section does not name.** `CLAUDE.md`'s _Intended stack_ and
`PRODUCT_SPEC.md` §27 both discuss rendering only in terms of **Sigma.js/WebGL
for the topology**. After this story the product has a **second, separate
rendering decision** — hand-built SVG for the 2-D chart layer — and nothing in
either document says so. `CHARTING.md`'s preamble draws the line; the governing
documents should carry a pointer to it, or the next reader will reasonably assume
the topology's renderer is the product's renderer.

**And what 2.12.1 already swept, so it is not swept twice.** The stale
"nothing on the path compresses" premise was corrected on 2026-09-11 at
**three** live instruction sites — [`STORY.md`](STORY.md)'s Task 2.9.9 amendment,
[Task 2.12.1](TASK-01-settle-the-charting-decision.md)'s Decision 4 bullet, and
[Task 2.12.4](TASK-04-the-first-chart-in-marketpulse.md)'s _Paint the frame
immediately_. `CHARTING.md` §8 records the grep that found them and why the
other sites are correct as they stand. **Re-run that grep at the close anyway** —
the third site was missed on the first pass, which is the Notes section's own
failure mode happening inside the task that warned about it.

---

## Amended 2026-09-11 by Task 2.12.2 — five additions to the sweep, and one of the four tests has already been answered "not yet"

### What 2.12.2 changed outside this story, which the close now has to reconcile

- **`VISUAL-LANGUAGE.md` gained a _The chart_ section.** It is a design document
  written _before_ the chart existed, which means every value in it is a claim
  about something not yet built. **Reconcile it against what shipped** — the
  breakpoint table, the tick counts, the plot heights and the reserved lanes are
  all things an implementation can quietly diverge from with nothing going red.
  Where the built chart is right and the document is wrong, the canvas is
  upstream of both (ADR 0026), so the fix is a canvas edit first.
- **`ADR 0026` carries a dated amendment** saying the canvas is three files. If
  this story adds a fourth — a volume or comparison artboard — it needs another,
  and the count in that amendment is exactly the kind of present-tense claim
  `CLAUDE.md` says becomes false quietly.
- **Eighteen tokens exist with, until 2.12.4, no consumer.** At the close, check
  that every one of them is actually read by something. A `--chart-*` token that
  survived the story unused is a value designed against no consumer, which is the
  reason ADR 0026 declined `micro/10`.
- **`Foundations/Chart tokens` is a Storybook surface with no component beside
  it**, which exists because 2.12.2 had tokens and no chart. Once the chart has
  its own stories, decide whether it stays. It is not obviously redundant — it is
  the only place the marks are shown _as a language_ rather than as one chart,
  which is the argument `Marker`'s own story makes — but it should be a decision
  rather than a leftover.
- **`CLAUDE.md`'s design-language paragraph** names "a six-component
  building-block layer" and says nothing about a chart vocabulary. The `Icon` set
  is still six and that sentence is still true; what is now missing is any mention
  that the language has a chart layer at all.

### Two entries this story owes the "What `pnpm verify` does not cover" list

Both are the same class as the entries already there — a claim that is true today
and checked by nothing — and both are properties of 2.12.2's decisions rather
than of the component:

- **That direction survives greyscale.** The two washes are **1.009:1** apart
  under `grayscale(1)`; the entire encoding rests on the reference rule and the
  side of it the line finishes on. Nothing in `verify` can see colour at all, and
  axe has no rule for "is this fill load-bearing". Re-measure: delete the
  reference rule and confirm the greyscale pair in `Foundations/Chart tokens`
  becomes two identical pictures.
- **That the value scale's gutter is subtracted from the scale's range.** A scale
  built against the region width rather than the plot width draws a line that runs
  under its own labels — a plausible chart, not a broken one, and invisible to
  jsdom. Re-measure: remove the subtraction and confirm a browser spec, not a
  component test, is what goes red.

### Test 4 of the four already has an answer, and it is "no, and not from here"

2.12.2 applied the four tests to the canvas and recorded three passes and one
**deliberate** fail: **does it feel alive? Not yet.**

That is not a defect to be repaired at this close. `VISUAL-LANGUAGE.md` defers the
motion vocabulary to Epic 3 on purpose, against real moving numbers, and a chart
that animates its own first paint is decoration rather than a market moving. So
when this task applies the four tests to a screenshot of the deployed product,
**test 4 is the one that needs an argued answer rather than a verdict** — and the
honest form of it is what the product does when the data arrives, not what the
chart does when it is first drawn.

The other three were answered against the canvas. Answering them again against
the built page is the point; a canvas is a drawing of a product.
