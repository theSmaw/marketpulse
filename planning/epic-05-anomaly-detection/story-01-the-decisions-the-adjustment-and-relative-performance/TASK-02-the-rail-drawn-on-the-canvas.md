# Task 5.1.2 — The Rail Drawn on the Canvas

**Status:** Complete — 2026-10-13 — the page is on the canvas, and the one thing it got wrong was §08: the chart's anomaly lane was reserved in `VISUAL-LANGUAGE.md` fourteen months of commits ago, in the plot's **top padding**, and the first drawing put it **below** the plot where Epic 9's 14 px filing lane already lives. Corrected on the page. Done-when 1 is **partially met and recorded as such** — the specimens are drawn at the rail's one resolved width, 324 px, because below 74rem the rail does not exist and a "rail's resolved width" is not a thing there
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

`The rail that says how unusual.dc.html` is on the canvas —
`https://claude.ai/design/p/727b5b14-fe78-47c1-9d9c-fb84b6ce5280`, project
`727b5b14-fe78-47c1-9d9c-fb84b6ce5280`, **57,020 bytes**, uploaded with
`finalize_plan` + `write_files` by `localPath` so the file never round-tripped
through a context window. Eight numbered sections, plus the seven-clause rail
idiom, `Reconciled downward`, and `What this page does not decide`.

### The one thing this task was for, and it fired

**§08 was drawn wrong first, and the document caught it.** The task brief itself
said to restate `VISUAL-LANGUAGE.md`'s reservation — _a 16 px lane inside the
plot's **top** padding, at the bar's x, carrying the score as a number_ — and the
first version of §08 drew a **9 px lane between the plot and the axis, outside
the plot**. That is wrong for two reasons that were both already written down:

- **The space is let.** Epic 9's filing lane is `--chart-filing-lane: 14px`,
  _below the baseline and above the tick labels_, moved on 2026-09-13 to sit
  under the volume plot. A second lane there either stacks two unrelated
  vocabularies on one seam or pushes the axis labels.
- **The top padding is already paid for.** The y-domain is padded so the data
  never touches the frame, so a lane in the top half of it **displaces nothing**,
  while anything below the baseline displaces something.

The canvas is upstream of the document and may overrule it — but not by accident,
and there was no argument here that beat the one already recorded. §08 now draws
the reserved placement, and says on the page that it drew the other one first.

**And a second finding came out of fixing it: the lane is reserved by PROSE
ONLY.** `--chart-filing-lane: 14px` exists in `tokens.css:776`; there is no
`--chart-anomaly-lane`. That is the weaker half of the lesson that made the
filing lane a token in the first place — _reserved space that exists only as a
number inside one component's stylesheet is reserved by nobody_ — and space
reserved only in a document is reserved by less. Written into
`VISUAL-LANGUAGE.md` with its obligation: **the first component that draws the
lane owes `--chart-anomaly-lane: 16px` in the same change.**

### What the page draws

- **§01 The rail** — the three Epic 5 regions in column 3 at 1440 at the rail's
  real **324 px**, beside the honest degradation: at `<74rem` `.wide` collapses to
  `span 1`, two of the three land in column 2 and `Anomaly history` lands in
  column 1 with `Connected securities` and `Relevant filings` between them. So
  the route's own comment — _"they answer **how unusual is this?** and share a
  column for that reason rather than landing in three unrelated corners of the
  page"_ — **is true at 1440 and false at 1024, and nothing asserts it either
  way.** The idiom is therefore stated as **adjacency at ≥74rem and order
  everywhere**. The **hatch / built / hatch** adjacency is drawn as it will
  actually be, with Epic 4's routed finding stated beside it: a reserved panel is
  hatched, tagged `EPIC 5` and carries a sentence, while a region waiting for
  data is a plain void — so one built region between two hatched ones has to
  carry presence or read as a white gap in a patterned column.
- **§02 The comparison** — one track anchored at zero, the subject a **bar**, the
  two references **ticks on that same track**, drawn at 324 px. One track rather
  than three because the answer is the **gap**, and because three tracks is the
  height the region has least of. Nothing ranked; order fixed at subject →
  sector → market. Rung set widened to `±1/2/5/10/25/50`, chosen from
  `max(|subject|,|sector|,|market|)` and **raised but never lowered within a
  session**.
- **§03 The excess** — the two derived differences in **words**
  (`behind by 2.2 pts`), untinted, **beside the rejected fourth bar** which is
  drawn in amber on a second track so the rejection is on the page: a third
  colour in a region whose palette means price, 26 px of height the region has
  not got, and 2.2 pts on a ±10 scale is **11% of the track** — the figure the
  reader came for as the smallest mark on screen.
- **§04 The footer** — two clauses, 10 px mono: the references are
  **capitalisation-weighted index ETFs, not averages of their members**, and the
  scale. Not a second source note; renders clause by clause.
- **§05 The seven states**, with a working greyscale switch over all of them:
  complete; nothing observed (`No comparison yet.`); no move for the subject with
  both references present; **no sector**, where the clause is absent rather than
  empty; a silent reference, whose tick is **not drawn at zero**; the **basis
  refusal**; and the subject **being** a reference. Plus what is _not_ a state —
  staleness, which belongs to the status bar.
- **§06 One height**, reserved band by band, with the finding that the **footer**
  is the one band that can still change height and therefore needs a **two-line
  floor**.
- **§07 Reserved for 5.2 and 5.6** — shape only, with what each inherits and must
  not re-decide.
- **The seven-clause rail idiom**, stated in words 5.2 and 5.6 can act on,
  including **amber appears exactly once in the rail** (5.6's band fill behind its
  written name) and **the figure is never the link**.

### Done when — one by one

1. **Partially met, and recorded rather than claimed.** §01–§08 are on the
   canvas. The specimens are drawn at **one** resolved width — 324 px, the
   rail at 1440 — not four, because **below 74rem the rail does not exist**:
   §01's whole finding is that the regions scatter across two columns there, so
   "the rail's resolved width at 1024/768/390" is not a quantity. What stands in
   its place is §01's column table for `<74rem` and the third treatment in §03
   recorded as the sub-74rem fallback (two cells inline with the track's ends),
   explicitly **not drawn**.
2. **Met.** The rejected fourth bar is drawn beside the chosen treatment with
   three reasons under it.
3. **Met.** Seven clauses, verbatim, as their own block between §07 and §08.
4. **Met, and it found something in each direction.** Downward: the four band
   tokens exist (`--anomaly-normal/elevated/high/extreme`, `market.css:239–242`,
   renamed by 5.1.1) and **no new colour is needed** — every mark on the page is
   an existing token, the amber in §03 being drawn to be rejected. Upward: the
   document reserves a 16 px lane that **no token carries**, now written down
   with its obligation.
5. **Met.** The upload was performed rather than asked about, and the address is
   above.

### What is NOT on the page, deliberately

The §05 states are **intent, not photographs**. No gated machine has ever seen a
relative move — CI's store holds 516 securities and zero bars, so every
comparison there is `No comparison yet.` for ever, and the deployed store
produces the complete, silent-reference and basis-refusal states only
**mid-session**. The page says so in its own last panel, and the four-width
greyscale set produced **through the shipped socket path** is owed by Story 5.1's
close.

### Gates

- `pnpm format` — ran, rewrote `VISUAL-LANGUAGE.md`'s wrapping only.
- `pnpm links` — `557 documents, 1819 cross-file links, 39 anchor links, 0 broken.`
- No code changed in this task, so `build`, `test`, `invariants` and `e2e` are
  not in its scope and were not run.

## For a stakeholder — a status report, 2026-10-13

**Nothing changed on the screen.** What exists now is one drawing of the
right-hand column the security page has been reserving for three Epic 5 regions
since Epic 4 — the comparison this story builds, drawn at the column's real width
of 324 pixels, in all seven of the states it can legitimately be in, with the two
treatments we rejected drawn beside the ones we chose so the next story cannot
quietly re-take the decision.

Two things were found by drawing it. First, **the column is not a column below
1184 pixels** — the page's own code comment says the three regions share a column
because they answer one question, and that is true on a desktop and false on a
laptop at 1024, where they scatter across two columns with two unrelated regions
between them. Nothing in the product asserts it either way. We have written the
idiom down as what it actually is, and making the rail real at every width is a
separate change to seven regions' placement that this story is not taking.

Second, **the page drew the chart's anomaly marker in the wrong place and the
design document caught it.** The lane was reserved fourteen months of commits ago
inside the chart's top padding, where it costs nothing; the first drawing put it
under the chart, in the space already reserved for Epic 9's filing markers. It is
corrected, and the correction surfaced a smaller gap worth one sentence: the
filing lane is a real number in the stylesheet and the anomaly lane is only a
sentence in a document, so the first story that draws it owes the number.

What is deliberately still open: the states on the page are drawings rather than
photographs, because no machine with a gate on it has ever had the data to produce
one — the test store holds 516 securities and no price bars at all, so a
comparison there is permanently "nothing observed". The photographs are owed by
this story's close, against a live market.
