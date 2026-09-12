# Task 2.12.10 — Deployed, verified, documented, and the four tests applied

**Status:** **Complete — 2026-09-12.** Story 2.12 is closed.
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

---

## Amended 2026-09-11 by Task 2.12.3 — the conditional on the most dangerous sweep item is answered, and one list entry is already made

### "Confirm this rather than assuming it" — confirmed

2.12.1's amendment collapses the flat-config trap on the condition that 2.12.3
did not create a second feature module, and tells this task to **confirm rather
than assume it**. It did not. All five arithmetic modules landed in the existing
`src/market/` and leave it through the barrel that already has a
`no-restricted-imports` pattern.

**So the trap did not fire and nothing in `eslint.config.mjs` was touched by this
story.** Two consequences for the close, and the second is the useful one:

- _Frontend structure_ needs no change, and the entry stays on `CLAUDE.md`'s list
  exactly as written — **it is not discharged, only unfired**. Epics 3 to 11 add
  seven more feature modules and it stays the most dangerous entry there.
- **Re-measure it anyway at the close**, because the re-measure is one line and
  the failure is silent: `import path from "node:path"` in a frontend file that
  also deep-imports `market/` must produce **two** errors, not one. This story
  added five files under `src/market/` without touching the rule, which is
  exactly the change that would make somebody think it had been checked.

### One entry on the "What `pnpm verify` does not cover" list is already added

2.12.2's amendment lists two entries this story owes that list — the greyscale
encoding and the gutter subtraction. **A third was added on 2026-09-11 by
2.12.3** and is already in `CLAUDE.md`, so do not add it twice and do not read
its presence as evidence the other two were done:

> **The chart's density breakpoints are spelled twice**, once as a media query in
> the chart's stylesheet and once in `market/chart-density.ts`, and nothing
> compares them.

Note that entry has a live half this story has not built yet: **the CSS side of
the duplication does not exist until [Task 2.12.4](TASK-04-the-first-chart-in-marketpulse.md)
writes the media query.** The entry was written against the pair, so at the close
confirm both halves exist and say the same number, rather than confirming the one
that was there when it was written.

### Two smaller reconciliations

- **`CHARTING.md` gained a §10** — four findings from building the arithmetic.
  §10.1 is the one to carry forward: §6.2's visible space appears only when the
  shortfall is made of _trading_ minutes, which is amended onto
  [Task 2.12.7](TASK-07-every-chart-state-drawn.md). When this task finishes
  `CHARTING.md`, §10 is a record of what building found and should stay as one
  rather than being merged into the decisions above it.
- **The price vocabulary moved into the `market` module.** `formatPrice`,
  `formatChangePercent`, `directionOf`, `PRICE_DIRECTIONS` and `PriceDirection`
  left `UniverseTable/last-close.ts` and `BarSeriesPanel/series-facts.ts` for
  `market/price-format.ts`, on the extraction trigger `series-facts.ts` had
  written down. Nothing in a governing document names those paths, so there is
  nothing to sweep — recorded here so the close does not go looking for a
  correction that is not owed.

---

## Amended 2026-09-12 by Task 2.12.4 — four sweep items have already fired, and one instruction now points at something that does not exist

This is the first amendment to this task written from the other side of a shipped
chart rather than from a decision. **Nothing is added to the close; four things
are struck or rewritten**, because a close task that re-does work already done is
how a sweep stops being trustworthy.

### Already swept, so do not sweep twice — and what is left of each

- **`CLAUDE.md`'s _Current state_.** The Work section says the paragraph claiming
  a user "cannot see a chart of anything" becomes false the moment 2.12.4 merges.
  It did, and **it was corrected in that commit**, per `CLAUDE.md`'s own same-day
  rule. What was corrected is the **Price region only** — the paragraph now says
  what the chart draws and lists what a user still cannot do, naming 2.12.6,
  2.12.7 and Story 2.13. **What this task still owes is the story-level close**:
  reading a point, every state drawn, and the text alternative all land between
  now and then, and each moves that same paragraph.
- **`SecurityExplorer.tsx`'s `filledBy` for the Price region**, the route test
  asserting it, and `BarSeriesPanel`'s header fence — all three amended in the
  drawing commit. `STORY.md`'s 2026-09-11 amendment quotes the old sentence
  "verbatim" and was **deliberately left standing** as a dated historical record.
  Confirm that judgement rather than re-taking it; correcting it would destroy the
  record.
- **ADR 0026's file count.** 2.12.2's amendment predicted that "the canvas is
  three files" would go false quietly and it did, in a day — 2.12.4 added
  `Price region.dc.html`. **ADR 0026 now carries a 2026-09-12 amendment**, and
  that amendment replaces the count with a standing rule so the ADR stops needing
  one per file. **Do not add a fifth count.**
- **`--chart-filing-lane` was added**, so the token list is thirteen `--chart-*`
  values rather than twelve, and the "eighteen tokens with no consumer" figure in
  2.12.2's amendment has moved. See the audit below, which is the item this
  replaces.

### The density-breakpoint entry: the instruction points at something that does not exist

2.12.3's amendment tells this task to confirm that **both halves** of the
duplication exist and say the same number, noting the CSS half would arrive with
2.12.4's media query.

**There is no media query.** `PriceChart.module.css` contains none; the component
sets a density class from `chartDensity`'s answer and the stylesheet keys on the
class, so the 600px boundary is spelled **once**. `CLAUDE.md`'s entry was
rewritten in the drawing commit — struck through, kept, and re-pointed at the
thing a later author would actually do, which is reach for a media query when
making a chart responsive. `CHARTING.md` §11.1 carries the argument.

**So at the close: confirm the entry reads as a live hazard rather than as a
present duplication, and run its re-measure** —
`grep -n "@media" apps/frontend/src/components/PriceChart/PriceChart.module.css`
must find nothing.

### The gutter entry owed to the list needs rewording before it is written

2.12.2's amendment owes this list an entry on the value gutter, with the
re-measure "remove the subtraction and confirm a browser spec is what goes red".
**There is no subtraction.** The gutter is a sibling grid column and the scale is
built against the measured **plot** element, so the property holds by
construction. The hazard is real and differently shaped: a later author who
computes the scale from the _region_ — the outer element, which is also measured
and is right there — reintroduces exactly the defect. Write the entry against
that, and its re-measure is to build `slotScale` against `regionWidth` and
confirm `e2e/specs/security-price-chart.spec.ts`'s _the plot stops where the
value gutter starts_ goes red.

The greyscale entry 2.12.2 owes is unchanged and cannot be written until
[Task 2.12.5](TASK-05-what-a-session-did-and-direction-without-colour.md) ships
the reference rule.

### The token audit, with the answer already half-known

2.12.2 asks this task to check that every `--chart-*` token is read by something.
Measured 2026-09-12, counting consumers outside `tokens.css`:

| Consumed by the application                                                                                                               | Consumed **only** by the specimen story                       |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `--chart-axis`, `--chart-grid`, `--chart-seam`, `--chart-series`, `--chart-series-width`, the heights, the gutters, `--chart-filing-lane` | `--chart-reference`, `--chart-crosshair`, `--chart-uncovered` |

The three on the right are **exactly** 2.12.5's, 2.12.6's and 2.12.7's, in that
order — which makes this audit a progress check rather than a cleanup. At the
close all thirteen should have an application consumer; **a token still read only
by `components/chart-tokens.stories.module.css` is a task that did not ship what
it said it did**, not a token to delete.

### One thing that is now easy to check and was not

The Work section asks for the four tests applied to a screenshot at three
viewports, with real data. Note what "real data" now means on a developer's
store: the default window is a genuine `partial` covering one session of five, so
**the screenshot to judge is a chart that is four-fifths empty**. That is correct
and it is also the hardest possible case for test 1 — _would a stranger believe
this is a real funded product?_ — and it will look considerably better once
[Task 2.12.7](TASK-07-every-chart-state-drawn.md) dresses the uncovered span.
**Take the screenshots after 2.12.7, not before**, and if the deployed store is
better backfilled than the development one, say which one the screenshot came
from.

---

## Amended 2026-09-12 by Task 2.12.5 — the token audit ticked one row, and the greyscale entry can now be written

### One of the three unconsumed tokens has an application consumer

The audit above lists `--chart-reference`, `--chart-crosshair` and
`--chart-uncovered` as read **only** by `components/chart-tokens.stories.module.css`,
and notes that the three are exactly 2.12.5's, 2.12.6's and 2.12.7's, in that
order — which makes the audit a progress check.

**It has ticked once and one row needs a different reading.** `--chart-reference`
is read by `PriceChart.module.css`'s `.reference`, so **two** of the three remain
— `--chart-crosshair` and `--chart-uncovered`, which are 2.12.6's and 2.12.7's.

**`--price-unchanged-wash` has also lost its consumer, and that is the one case
where this audit's standing rule gives the wrong answer.** The directional wash
splits at the rule since 2026-09-12, so there is no neutral state for it to
colour. It is **deferred**, not unshipped: `VISUAL-LANGUAGE.md` and
`CHARTING.md` §12.2 both reserve it for the high–low extent band at `1d`, which
Story 2.13's window control brings. A token with a dated, documented future
consumer is a different thing from a token nobody reached for. Re-take the audit at the close
rather than citing this line; the standing rule is unchanged and is the reason it
is worth taking at all — a token still read only by the specimen story is a task
that did not ship what it said it did, not a token to delete.

### The greyscale `verify`-gap entry is unblocked and its shape is narrower than expected

The section above says the greyscale entry 2.12.2 owes _"cannot be written until
Task 2.12.5 ships the reference rule"_. **It has**, and the entry is writable.

Write it against what actually holds the property rather than against greyscale in
general, because the honest scope is small: no test in `pnpm verify` can see a
colour at all — `getTokens()` throws where no stylesheet is applied, which
`CLAUDE.md` already records as the structural reason "do not assert on colour" is
not a discipline. So the entry is not _"greyscale is unchecked"_; it is:

> **That the chart's direction survives the hue being removed.** The geometry —
> the line finishing above or below `--chart-reference` — is what carries it, and
> the two washes differ by **1.009:1 under `grayscale(1)`**, so a change that
> deleted the rule and kept the tint would leave a chart whose direction is
> carried by nothing. Nothing mechanical can see this. What holds it is
> `chart-geometry.ts`'s `DirectionalArea`, which makes the pair one value, and
> `PriceChart.stories.tsx`'s two simulation stories, which a person reads.
> Re-measure: render `Greyscale` in the workshop and say which way each of the
> four windows went.

And note there is now a **second** entry from this task, of the class this list
exists for — a claim only a browser can see:

> **That the directional wash is painted with a wash rather than with black.**
> `e2e/specs/security-price-chart.spec.ts`'s _the directional wash is actually
> painted_. The first version of that spec was **green against the break**,
> because SVG's initial `fill` is black and "is it filled with some colour" was
> true of the broken chart. Re-measure: delete `WASH[...]` from the wash's
> `className` in `PriceChart.tsx` and confirm that spec goes red — it was
> verified that way on 2026-09-12.

### One item on the sweep list is already done rather than owed

`CLAUDE.md`'s _Current state_ and its fixture no-ship entry were both corrected in
2.12.5's commit under the same-day rule — the paragraph now describes a chart that
states direction, and the no-ship entry names `dense.json` with its own grep,
having previously named the recorded universe as the largest thing on the list.
The design canvas was amended in the same commit for the same reason. Confirm
rather than repeat.

---

## Amended 2026-09-12 by Task 2.12.7 — the token audit is finished, and the canvas gained a fifth file

Four things for the close.

### The token audit's three rows are now three consumers

That audit's standing question was which chart tokens had no application
consumer. `--chart-reference` gained one at 2.12.5 and `--chart-crosshair` at
2.12.6; **`--chart-uncovered` gained one at 2.12.7** and is read by
`PriceChart.module.css`. The row that remains is not a chart token at all:
`--price-unchanged-wash` still has no application consumer, and the audit must
read it as **deferred to the extent band at `1d`** rather than as something that
did not ship — which the fifth review already recorded and which is unchanged.

**One token was added**, so the audit has a new row to check rather than only to
tick: `--chart-coverage-edge` (`#74777f`, 4.05:1 against the wash it bounds), read
by `PriceChart.module.css` and declared in `styles/tokens.ts`. It shares a value
with `--chart-reference` and is separately named for that block's own stated
reason.

### The canvas is five files, and the rule ADR 0026 states has now held five times

`Price chart states.dc.html`, added for `Price region.dc.html`'s reason rather
than the 256 KiB one: it is a different question about the same subject. **ADR
0026 needs no amendment for it** — its own standing instruction is not to restate
the count, and `list_files` is the answer. What the close should confirm is that
the instruction was followed rather than that the number is right.

### One `verify`-gap entry was added and it is a measurement rather than a mark

_That the plot is measured to the area there is to draw in, and not to the axis
rule as well._ It is on `CLAUDE.md`'s list with its re-measure, and it is the one
entry in this story that **cannot** be made mechanical by any level below a
browser: jsdom implements neither `offsetHeight` nor `clientHeight`, so the
correction is zero there and every component test is identical with the repair
and without it.

### The deployed check has a new state to expect

The deployed store is backfilled nightly, so `/securities/NVDA` in the deployed
environment is normally `partial` with a **small** shortfall rather than the
four-fifths-empty frame a developer's store shows. Both are the same treatment
and neither is a fault; what would be worth noticing after a merge is a deployed
chart showing a _large_ uncovered span, which is `GET /diagnostics/freshness`
saying the same thing in a number.

### The screenshot conditional is discharged, and the instruction it carried is now live

The amendment above tells this task to **take the screenshots after 2.12.7, not
before**, because the developer's store answers the default window four-fifths
short and an undressed uncovered span is the hardest possible case for test 1.
**2.12.7 has shipped**, so the conditional is spent and the instruction is simply
in force: the screenshots are takeable now, and the four-fifths-empty frame is no
longer an embarrassment to be timed around — it is the state the treatment was
designed for and is arguably the most interesting thing to photograph.

Say which store each screenshot came from, which the amendment above already
asks for and which matters more now that the two stores produce visibly different
charts: a deployed store backfilled nightly shows a **small** uncovered span, a
developer's shows a large one, and both are correct.

### The handover to Story 2.13 gains a fourth item

The Work section's list is _"the axis it inherits, the density decision, the seam
Story 2.14 renders, and the daily-series calendar walk"_. Add **the coverage
rule**, and it is the item most likely to be got wrong by a second plot:

> A mark derived from the window runs the full frame; a mark derived from the
> bars stops at the coverage edge. Two plots sharing one x-domain must stop at
> **the same pixel** — the volume bars, their own baseline, and the price line
> above them — and the uncovered ground is drawn once per plot rather than once
> per region. A volume chart that drew bars into the uncovered span, or that
> washed a different width from the chart above it, is the defect this rule
> exists to prevent, arriving in the one place the rule was not restated.

And note the volume bars are **fills**, which is what §14.5's one-pixel finding
was about: the measurement error was invisible for three tasks because every mark
before it was a stroke.

---

## Amended 2026-09-12 by Task 2.12.8 — three sweep items already fired, the screenshots have a precondition again, and the handover gains a fifth item

### Already swept, so do not sweep twice

All three under `CLAUDE.md`'s same-day rule, in 2.12.8's own commit:

- **`CLAUDE.md`'s _Current state_** gained a paragraph — the chart can be read
  with the screen off, what the sentence says, and that the walk found a defect.
  The Price-region paragraphs from 2.12.4, 2.12.5 and 2.12.7 are unchanged and
  correct. **What this task still owes is the story-level close**, which is the
  paragraph those four become once 2.12.9 has measured and the chart is on the
  deployed site.
- **The `verify`-gap list moved in both directions and the net is zero.**
  §14.5's measurement was struck through and kept — it is a browser assertion now
  (§15.7) — and one entry was added: the alternative's coverage clause and the
  uncovered wash agree only by both calling `timeAxis` and `positionOfInstant`.
  **Read the list rather than counting it**; a close that reports "one added" or
  "one removed" has read half of it.
- **`VISUAL-LANGUAGE.md`'s `--chart-readout-height` row.** It said the token was
  the reading strip's reserved row _whether or not it holds a reading_, which
  2.12.8 falsified: it is the row's **floor**, and the reservation is a hidden
  reading in the same cell. Corrected the same day.

### One thing the canvas and the document may now disagree about, which is ADR 0026's own procedure

`Price reading.dc.html` §01 specifies the strip as a reserved row, and it is
drawn at one width. The **intent** is unchanged and was met; the **mechanism** is
not what a single reserved height implies, because no single height is correct at
more than one width (`CHARTING.md` §15.4). ADR 0026's chain is canvas →
`VISUAL-LANGUAGE.md` → `tokens.css` → components, and where the document and the
canvas disagree the document is wrong — so **this is a canvas edit to consider at
the close**, not a component to change back. It is a note rather than a finding:
the canvas draws one width and cannot express "as tall as a reading is here", so
the honest resolution may be a sentence on the artboard rather than a new value.

### The screenshots have a precondition again, and it is different from 2.12.7's

2.12.7's amendment discharged _"take the screenshots after 2.12.7"_. **Take them
after 2.12.8 as well**, and the reason is not cosmetic: the readout's resting
height changed at two of the three review viewports — 20px to 36px at 1024, 40px
to 54px at 390 — so every screenshot taken before this task is of a page that is
now a line taller below the chart. At 1440 nothing moved.

While taking them, **look at the strip at rest at the narrow sizes**. A row sized
by a hidden two-line reading is a row with visible empty space under a one-line
invitation, and whether that reads as _reserved_ or as _a gap_ is a judgement for
test 2 — _does it look designed rather than defaulted?_ — that only a person
looking at the screenshot can make. The alternative was measured and rejected
(§15.4); if the screenshot says it looks wrong, the finding belongs in
`CHARTING.md` §15.4 beside the measurement rather than as a silent revert.

### The four tests gain nothing and test 4's answer is unchanged

2.12.2's amendment records test 4 — _does it feel alive?_ — as a deliberate "not
yet", deferred to Epic 3's motion vocabulary against real moving numbers. Nothing
in 2.12.8 changes that, and the text alternative is not an answer to it: a
sentence read aloud is not motion. Answer it the way that amendment says, against
what the product does when data arrives.

### The handover to Story 2.13 gains a fifth item, and it is a code path no test has run

2.12.7's amendment added the coverage rule as the fourth. The fifth:

> **`chart-alternative.ts` has `1d` branches that nothing has ever executed.**
> `intervalWord` and `slotWord` each carry one — _"trading session"_ and
> _"sessions"_ against `1m`'s _"minute of trading"_ and _"trading minutes"_ — and
> **all fourteen recorded bodies are `1m`**, so no test in this repository
> reaches either. They are written, they typecheck, and they are unverified
> English. Story 2.13's window control is the first thing that will produce a
> `1d` series, and it should record a body at `1d` for the same reason 2.12.5
> recorded `dense` and 2.12.7 recorded `uncovered`: a state a story cannot render
> is a state nobody reviews.

And one sentence for 2.13 to read before it changes the window, because it is the
cheapest possible regression: **the alternative says what window was asked for.**
A control that changes the window changes that sentence, and the failure mode is
the one this task's own Notes name — a clause that was true when written, left
standing.

---

## Amended 2026-09-12 by Task 2.12.9 — the performance half of your sweep is done, and one of the four tests now has a number behind it

**`CHARTING.md` §16 is written** and holds every figure this task would
otherwise have to take: the render cost at four densities, the pointer and
keyboard paths, the bundle table in Story 1.5's shape, the calendar walk, and
the two deliberate breaks. **Do not re-take them for the ADR — cite §16 and say
it is dated**, which is what §0 already asks of every number in that file.

Four things this task inherits rather than discovers:

- **Acceptance criterion 5 is met and criterion 7 is met.** No main-thread task
  over 50 ms at the 9,750-bar cap, cold or under interaction; the bundle cost of
  the decision is **6,552 B gzipped, 4.2% of the artefact**, against the rejected
  library's **+94,809 B**. The ADR's "what a green check does not certify"
  section has a ready-made example: §28's criterion is `longtask`, and §16.7
  records a real 17× regression that produces **no** long task and is caught only
  by a unit test.
- **One thing to say plainly in ADR 0027**, because it is the decision's
  strongest evidence and it was measured rather than argued: drawing **one
  element per bar** at the cap produces 9,790 plot elements and main-thread tasks
  of **137–254 ms**, and at the default window produces none. That is §1's
  constraint and §2's threshold in one measurement.
- **`CLAUDE.md`'s gap list moved, and 2.12.8's amendment above is right that the
  useful instruction is _read it_ rather than count it** — this bullet said "grew
  by two" in its first version and the list had gained three, which is that
  warning landing on the task that repeated it. What is there now: the universe
  table's breach with its re-measure, the chart's figures as dated observations of
  one laptop, and the counter-example — that lifting the reading's state back into
  `PriceChart` is a 17× regression **no long task can see**, held only by a unit
  test. A new mechanical guard exists alongside them:
  `PriceChart.test.tsx`'s _draws no element per bar, at sixty-five times the
  bars_, break-verified at `expected 1952 to be 32`.
- **One thing to carry into the four tests rather than the ADR.** Test 4 — _does
  it feel alive?_ — was answered **"not yet, and not from here"** on the canvas
  and this task owns the argued answer. §16.3 is a fact worth having while
  answering it: the crosshair holds **60 FPS at the cap**, so whatever "alive"
  turns out to mean for this product, the chart's interaction is not what is
  standing in its way.

**The handover to Story 2.13 gains a sixth item, and it is already written
down** — which is the point of saying so here. 2.12.8's amendment left the list at
five. The sixth is the trading-calendar walk, and Task 2.12.9 put the figures into
[Story 2.13's own `STORY.md`](../story-13-volume-chart-and-time-window/STORY.md)
rather than leaving them for this close to hand over:

> `timeAxis` is **0.202 ms** at today's five-session default and **23.051 ms**
> over the whole stored depth at `1d`, **twice per render** — so **46 ms of a
> 50 ms budget** at a "max" window, before a pixel is drawn, and again at every
> resize tick. Task 2.9.9 measured the same walk at **20.6 ms** on the server, so
> the `packages/shared` repair it argued for once now pays three callers.

So this task owes that item **a check rather than a write-up**: confirm 2.13's
file still carries it, and do not hand over a handover list that omits the one
number the window control is most likely to be surprised by. The same applies to
volume's marks — `CHARTING.md` §1's constraint and §2's threshold are what 2.13
should read before drawing the first per-bar `<rect>` this axis will carry, and
§16.7 now has both ends of it measured in the real component.

**And one item for the upward sweep that is not this story's.** The security page
carries a **50–66 ms main-thread task on every cold load**, and it is the 518-row
universe table rather than the chart (§16.1). It is already recorded in
`SEARCH-AND-SELECTION.md` §10, named in Story 2.14's close and on `CLAUDE.md`'s
gap list — so this task owes it **nothing but not contradicting it**: do not write
"the security page produces no long task" anywhere in ADR 0027 or in the close.
The chart does. The page does not.

---

## What this task did — 2026-09-12

**Nothing was re-measured that a previous task had already measured.** Nine
tasks' amendments say what they already swept, and this close confirmed those
rather than repeating them. What was taken fresh is the deployed verification,
the screenshots, the audits the story explicitly owed, and four mechanical
re-measures whose whole cost is one command each.

### Deployed, and it was already there

The deploy ran on the 2.12.9 merge and succeeded; no deploy was needed.
`pnpm e2e:deployed` is **16/16 green**, `check-deployed` reports the pair
coherent, and `/securities/NVDA` was opened cold, from a deep link, at three
viewports. **The deployed chart is `loaded` and holds all 1,950 bars of the
window asked for** — the store was one session behind at both timeframes and the
nightly backfill had caught up to Friday. `CHARTING.md` §17.1 records the
consequence nobody had written down: the deployed environment is the one place
§14's coverage treatment is **not** under observation, because there is nothing
uncovered there to observe.

### The four tests: three pass, and test 4's answer is argued

`CHARTING.md` §17.2, against the deployed page at 1440×900, 1024×800 and
390×780. Test 4 — _does it feel alive?_ — is "not yet, and not from here" for the
second time, and the argument is the one 2.12.2 and 2.12.8 both made: the motion
vocabulary belongs to Epic 3, against real moving numbers.

**2.12.8's question about the narrow viewports was answered by looking.** At 390
the invitation wraps to two lines and fills the reserved row exactly; at 1024 it
is one line with roughly a line of space beneath it, and it reads as separation
rather than as a gap because the coverage sentence below is a separate unit with
its own marker. **No change taken**, and §15.4's measurement stands.

### What was found rather than confirmed

**One live claim was false, and it was in code rather than in a document.**
`market/chart-density.ts`'s header said the 600 px boundary was stated twice,
once as a media query in the component's stylesheet — which Task 2.12.4 had
already falsified when it built the chart the other way. Every document that
carries this was correct; the module asserting it about itself was not, and
nothing swept it because the sweep lists name documents. Corrected.

**One stale claim in `README.md`, stale by three stories.** The routes table said
`/securities` held "101 real securities ... eleven sectors" and "no search, no
click-through and no prices". It has 518 in twelve bands, with search and
click-through since 2.11 and a chart since 2.12, and `/securities/:symbol` was
not in the table at all. Corrected, and the row for the per-security route added.

### Audits, taken rather than cited

All in `CHARTING.md` §17.3. **Every one of the sixteen `--chart-*` tokens has an
application consumer** — the audit 2.12.2 opened with eighteen tokens and no
consumers is closed. `--price-unchanged-wash` is the single row with none and is
deferred by name, which both the component and its stylesheet carry a comment
about.

**The most dangerous entry on `CLAUDE.md`'s gap list was re-measured rather than
assumed**, because this story added five files under `src/market/`: a file
importing `node:path` and deep-importing `market/chart-geometry.js` produces
**two** errors. The browser boundary and the market pattern are both live.

Also re-run: no `@media` in `PriceChart.module.css`; both `timeAxis` and
`positionOfInstant` in both `chart-alternative.ts` and `chart-geometry.ts`; all
four fixture-leak greps clean against a fresh build; `initiallyCollapsed` unused
by any route.

### The sweep

`CLAUDE.md` — the story-level close paragraph, the ADR range 0001–**0027**, the
record table gaining `CHARTING.md`, the **two rendering decisions** under
_Intended stack_, the chart vocabulary in the design-language paragraph, and the
**three gap-list entries this story owed** (the greyscale property, the wash
painted with a wash rather than with black, and the scale built against the plot
rather than the region). `PRODUCT_SPEC.md` §27 gained the same pointer, because
it is the document that most invites the wrong inference. `README.md`, `EPIC.md`,
`STORY.md` and `VISUAL-LANGUAGE.md` as above.

**`VISUAL-LANGUAGE.md`'s chart section reconciled by checking rather than by
assuming**: the breakpoint table, the tick counts, the plot heights and the
gutters all match `chart-density.ts`.

### One thing left owed, deliberately visible

**The canvas edit ADR 0026's procedure calls for was not taken.** The
`Component library for MarketPulse` project is not reachable through `DesignSync`
from this session. The edit is a sentence on `Price reading.dc.html` §01 saying
the reading strip's reservation is a measurement rather than a height, and it is
recorded in `CHARTING.md` §17.3a and as a note in `VISUAL-LANGUAGE.md` so that it
is owed rather than lost.

### Gates

`pnpm verify` green, `pnpm links` green (286 documents, 922 cross-file links, 0
broken), `pnpm e2e:deployed` green at 16/16. **`pnpm e2e` was not run locally**:
this change is Markdown plus one comment block, it cannot turn a browser suite
red, and CI's required `e2e` check runs it on the pull request.
