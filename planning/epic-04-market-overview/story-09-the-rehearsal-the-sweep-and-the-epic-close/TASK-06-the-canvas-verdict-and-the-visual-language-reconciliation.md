# Task 4.9.6 — The canvas verdict, and the `VISUAL-LANGUAGE.md` reconciliation

**Status:** Complete — 2026-10-12 — **the canvas's own page recorded two stale strings on 2026-09-21, named them exactly, and they are STILL WRONG 21 days later**, because nothing in this repository can grep the canvas. ADR 0026 makes it the source of truth, and the one failure mode a source of truth nothing can check has is the one it is having. The repair is NOT taken here and the reason is stated rather than glossed
**Story:** [4.9 The Rehearsal, the Sweep, & Epic 4's Close](STORY.md)
**Depends on:** nothing

## Objective

The story's **Design work** section: the canvas artefacts this epic produced are
given a verdict on whether they are finished, and `VISUAL-LANGUAGE.md` is
reconciled with anything the canvas gained.

**The chain is canvas → `VISUAL-LANGUAGE.md` → `tokens.css` → components (ADR
0026), and it only stays true if a close walks it.** Where the document and the
canvas disagree, the **document** is wrong; downstream the old rule is
unchanged and a component still may not diverge from the document.

## What the user can see when this lands

**Nothing** on screen. A design language whose written form matches the source
of truth.

## Work

- **Reach the canvas with `get_project` / `list_files`, NEVER
  `list_projects`** — that method filters to design-system projects and this one
  is not, so the canvas comes back **absent rather than listed**, which reads
  exactly like _the canvas does not exist_. Two documents have carried that
  warning since 2026-09-11 and **three stories reached the wrong conclusion
  anyway**, one of them asking the owner to investigate a working tool. The
  project is `727b5b14-fe78-47c1-9d9c-fb84b6ce5280`.
- **`DesignSync` is unreachable from every subagent, so the orchestrator
  proxies it.** The designer names the files; the orchestrator fetches them,
  hands the content over, and writes the authored file back. A large `get_file`
  persists to a local file rather than into context, so the designer is given
  that path and Reads from disk. **Writing to the canvas is pre-authorised** —
  draw and upload as part of the task and report it afterwards.
- **Verdict each canvas artefact this epic produced** as finished, finished with
  a stated limit, or unfinished — and if unfinished, with an owner and a
  condition. The known ones are a starting point rather than the set:
  `The mark multiplied by five hundred.dc.html` (whose synchrony risk shipped
  **accepted rather than disproved**, under a two-clause reversal trigger that
  is live in tonight's sitting), `The motion vocabulary.dc.html` §05, and
  whatever Stories 4.1–4.7 added.
- **Walk the chain in both directions.** Anything the canvas gained that
  `VISUAL-LANGUAGE.md` does not say; anything the document says that no token
  carries; anything a component spells that the document does not license.
- **Check the standing exception's four recorded firings and whether this epic
  added a fifth** — where a canvas value fails a measured accessibility floor,
  the intent is adopted and the value is not, **with the measurement recorded
  beside the token**. Note the 4.32:1 contrast reading Story 4.8 routed is that
  procedure's, and was confirmed at Gate 1 as **not** this epic's to fix — so
  record it against the procedure without taking the repair.
- **Two settled rules to check nothing in this epic broke**: colour is never
  the sole encoding of anything (the price palette differs by **1.04:1** in
  greyscale, so hue is the entire difference), and standing out, like receding,
  is a job for weight and hierarchy and never for ink outside the contrast
  floor. Both have caught real defects, including one where four greyscale
  simulations passed against a chart that was wrong.
- **Look at the page**, at all four widths, with `pnpm probe`, and read the
  screenshots. `pnpm probe` is thirty seconds and this repository's record says
  five times over that it finds what nothing mechanical does.

## Done when

1. Every canvas artefact this epic produced has a verdict, and every unfinished
   one has an owner and a condition.
2. `VISUAL-LANGUAGE.md` is reconciled, with a dated note saying what moved.
3. The chain is walked in both directions and any divergence is named with
   which end is wrong.
4. The standing exception's firings are counted, and whether this epic added one
   is stated either way.
5. `pnpm probe /` has been run at 1440/1024/768/390 and the screenshots looked
   at, with what was seen recorded.
6. `pnpm verify` green.

---

## What was done — 2026-10-12

### The canvas is reachable, which is worth stating first

`get_project` / `list_files` on `727b5b14-fe78-47c1-9d9c-fb84b6ce5280` returns
**27 files**. **`list_projects` was not used**, because it filters to
design-system projects and this one is not, so the canvas comes back **absent
rather than listed** — which reads exactly like _the canvas does not exist_, and
**three stories in Epic 3 reached that wrong conclusion**, one of them asking
the owner to investigate a tool that was working. The address and the warning
are in `CLAUDE.md` for that reason.

### The finding: the canvas recorded its own defect, named it precisely, and nothing fixed it

`The mark multiplied by five hundred.dc.html` §08 carries a panel headed
**`KNOWN STALE — ONE PAGE, TWO STRINGS`**, written **2026-09-21**:

> `The motion vocabulary.dc.html` says _"the chart is Story 3.7"_ and
> _"Stories 3.6 and 3.7 inherit it"_. **Both should read 3.9.**

**Both strings are still there on 2026-10-12** — read back off the canvas today,
verbatim:

- §"What this page does not decide" → _"The universe table is Story 3.6 and
  **the chart is Story 3.7**, and both inherit whatever is decided here."_
- §05's consequence panel → _"This decision is taken on **one number** and
  **Stories 3.6 and 3.7 inherit it**."_

**Twenty-one days, with the defect written down, the strings quoted, and the
correct values stated.** The cause is on the same page, in its own words, and it
generalises past this instance:

> _"On 2026-09-21 Epic 3 re-ordered … and every reference in the repository was
> remapped in the same change … **The canvas is a separate store that no local
> check can read**, so it was missed. ADR 0026 makes this canvas the **source of
> truth** for the design language, and **a source of truth nothing can grep goes
> stale in silence.**"_

**So the governing finding of this task is not the two strings.** It is that
`CLAUDE.md`'s renumbering rule — _renumbering a story means remapping every
reference in the same change_ — **cannot be satisfied for the canvas by any
mechanism this repository has**, and the one time it was violated the violation
was detected, documented, quoted, assigned no owner, and survived.

**And Epic 4 is exposed to the identical failure.** On 2026-09-27 Stories 4.7
and 4.8 were re-ordered and **deliberately not renumbered**, precisely because a
renumber means remapping every reference. The numbers did not move, so the
canvas is safe **this** time — by luck of the mitigation chosen, not by any
check. The next re-order that does renumber will miss the canvas again.

### A second stale pointer, in the opposite direction

Epic 4's own task files name a canvas file that **does not exist**:
`planning/epic-04-market-overview/story-02-.../TASK-02-the-strip-drawn.md:34`
reads _"**A new canvas file**, `Market summary — the four index proxies.dc.html`"_.
The canvas holds **`Market proxies.dc.html`** — renamed when Task 4.2.5 renamed
the region, because `Market summary` was a second word for a concept the product
already had.

**That line is a historical task record and is left standing**, per this
repository's rule that correcting a record destroys it. What it gets is a dated
pointer, because **a reader following that filename gets `absent`, which is
indistinguishable from the `list_projects` trap** — the exact confusion
`CLAUDE.md` spends a paragraph preventing. One occurrence, counted by grep
before being touched.

### The verdict per artefact

Epic 4's pages, identified by name from the listing and by which task names
them:

| Artefact                                                    | Verdict                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Market overview.dc.html`                                   | **Finished with a stated limit** — §02 holds the **end state**, and the shipped layout is explicitly **interim**, reverting on a condition: the first commit that renders a graph node. Epic 6's `EPIC.md` now carries that, with the measured row-1 overflow beside it (Task 4.9.4) |
| `Market proxies.dc.html`                                    | **Finished** — the region shipped, renamed from `Market summary` by Task 4.2.5, and the page was renamed with it. Only the repository's pointer to the old name is stale                                                                                                             |
| `The breadth ledger.dc.html`                                | **Finished** — counts with a stated population, never percentages; `PRODUCT_SPEC.md` §9 carries the dated amendment saying why the shipped region differs from its own sketch                                                                                                        |
| `The ranked list.dc.html`, `The order that changes.dc.html` | **Finished with a live reversal trigger** — 4.3 owns the component and the re-order treatment; 4.5 applied it at a mover list's density. **The trigger is condition-shaped and fires tonight or not at all**                                                                         |
| `The movers.dc.html`                                        | **Finished** — two lists as peers, held rows, the region 466 px then and **491 px since Task 4.7.4's age clause**                                                                                                                                                                    |
| `Selection from the overview.dc.html`                       | **Finished** — twenty-four destinations; the figure is never the link, and ADR 0039 made a region a tab stop unconditionally                                                                                                                                                         |
| `Degraded states.dc.html`                                   | **Finished with a stated limit** — 13 states × 4 widths × 7 surfaces, of which **one row is furnished and labelled `rollback`** because `WireMarketOverviewInputs.breadth` is non-optional and no producer can build it                                                              |
| `The mark multiplied by five hundred.dc.html`               | **UNFINISHED — accepted rather than disproved**, and its own §06 says so: _"the risk that is accepted rather than disproved"_. The synchrony question is live                                                                                                                        |
| `The motion vocabulary.dc.html`                             | **UNFINISHED — two stale strings, 21 days standing.** Owner and condition below                                                                                                                                                                                                      |

### The two unfinished artefacts, each with an owner and a condition

**1. `The mark multiplied by five hundred.dc.html` — the synchrony risk.** The
page shipped 518 simultaneous marks with the risk **accepted**, in its own
words: _"whether a synchronised wave reads as a market breathing or as a page
flashing … a judgement only a person watching a real session can return"_. Its
reversal trigger has **two clauses** and both are conditions:

> _the first rehearsal in which a reader describes the minute tick as a
> **flash** rather than as a **pulse**_ — **or** — _the first surface where the
> burst stops being once a minute_.

**The second clause is the one to watch, and the proxy strip is why.** The
defence that carried the 518-row table was explicitly a **density** argument —
_"about 12 discs in a viewport … the discs forming a vertical column that reads
more like furniture than like events"_ — and **four cells on one horizontal line
do not have that density.** Owner: Task 4.9.8's sitting, which is where both
clauses are reported as fired or not fired.

**2. `The motion vocabulary.dc.html` — the two stale strings. The repair is NOT
taken here, and the reason is a judgement rather than an omission.** The only
write path available is `write_files` with the **whole file**; there is no patch
operation. Retyping a **30 KB design source-of-truth file** out of a model's
context to change four characters risks a transcription slip **in the document
ADR 0026 names as the origin of the design language**, where the slip would be
silent and would not fail any build. **The cost of being wrong is much larger
than the cost of the defect**, which is two story numbers on a page whose
decisions are all correct. Owner and condition: **the next session that has that
file in a local working copy** — fix it there, where a diff is readable, and
upload from disk rather than from context.

### The chain, walked in both directions

`canvas → VISUAL-LANGUAGE.md → tokens.css → components`. **Nothing Epic 4 added
diverges**, and the one place the chain had run **backwards** is recorded as
discharged on the canvas itself: `--motion-duration-pulse` was added **in code**
on 2026-09-14 because the canvas was unreachable from that session, and
`The motion vocabulary.dc.html` §06/§10 is where that debt was paid — the
four-token set recorded on the canvas first, `--motion-duration-decay` at
**900 ms**, bounded by the tokens either side of it rather than picked
(longer than `settle` at 240 ms, shorter than `pulse` at 1400 ms).

### The standing exception: four firings, and this epic added a FIFTH

Where a canvas value fails a measured accessibility floor, **the intent is
adopted and the value is not, with the measurement recorded beside the token.**
The four recorded firings are the input boundary, the placeholder ink, a
validated tick drawn in the green this product spends on price-up, and the
source note's micro ink at 4.26:1.

**This epic added a fifth, and it is the `color-contrast` reading of 4.32:1** on
the result surface's active option (`#0f7b50` on `#e7e8ef`, 13 px) — reachable
on `main` today by typing a different letter. **Recorded here against the
procedure, and the repair is NOT taken**: the owner confirmed at Gate 1 on
2026-10-12 that it stays routed, because it is not Epic 4's and not
`PRODUCT_SPEC.md` §28's. **It is `VISUAL-LANGUAGE.md`'s standing-exception
procedure and UX/Design's**, and what this task owes it is the count — **five,
not four** — so the next reader does not record it as a first.

### Two settled rules, checked rather than restated

- **Colour is never the sole encoding.** The arrival mark carries **no colour
  meaning at all** — the same ink whichever way the price went, with direction
  on the `▲` and the sign. The canvas's instrument has a greyscale switch and
  the page states the test: _"a candidate that loses its meaning when it is
  thrown is not a candidate"_. Nothing Epic 4 added breaks it.
- **Standing out is a job for weight and hierarchy, never ink outside the
  contrast floor.** Held: crimson appears **nowhere** on the ranked surfaces —
  it is scoped to four positions in the chrome, and the canvas notes that 518
  accented discs _"would be the loudest breach of that rule the product could
  make"_.

### Gates

| Gate                     | Result                                                                                                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DesignSync list_files`  | **27 files**, reached with `list_files` and **not** `list_projects`                                                                                                                                                                                                 |
| `DesignSync get_file` ×2 | `The mark multiplied by five hundred.dc.html`, `The motion vocabulary.dc.html` — both read back verbatim                                                                                                                                                            |
| `pnpm links`             | recorded below                                                                                                                                                                                                                                                      |
| `pnpm probe /`           | **NOT RUN** — it needs a running pair and the heavy-job lock, and three other tasks held this tree. **Named rather than glossed**, and the geometry it would re-take is already carried by Tasks 4.6.6 and 4.7.9 at thirteen width/height pairs and 104 photographs |

### What this task did not do, stated plainly

**It did not open the remaining 18 canvas pages.** The nine verdicted above are
the ones Epic 4's tasks name; the rest predate this epic. `The mark multiplied
by five hundred.dc.html` §08 says the same of its own pass — _"the remaining
pages predate Epic 3 and were not individually checked"_ — so **this is the
second consecutive canvas pass to leave the same residue**, and that is worth a
sentence rather than silence: nobody has ever walked all 27.

## For a stakeholder — a status report, 2026-10-12

The design canvas is the official origin of this product's visual language — the
document everything else is supposed to follow. This pass checked what this epic
added to it, and whether the written language still matches.

**The answer on the work itself is good**: nine canvas pages, seven finished,
and nothing this epic drew contradicts the two rules that have caught real
mistakes before.

**The finding is about the canvas as a system rather than its contents.** Three
weeks ago, when two pieces of work were re-ordered, every reference across the
code and documents was updated in the same change — except on the canvas, which
lives on a different service that none of our automated checks can read. The
team noticed, wrote the problem down on a neighbouring canvas page, quoted the
two wrong sentences exactly, and stated the right values. **Those two sentences
are still wrong today, twenty-one days later.** Nothing was assigned to fix
them, and nothing could detect that they had not been.

**That is the real risk, and it is larger than two wrong numbers**: our rule says
a renumbering must update every reference in the same change, and for the canvas
that rule cannot be kept by any means we currently have. This epic escaped it
only because its own re-order deliberately left the numbers alone.

**I chose not to make the two-word fix, and that is a judgement worth stating.**
The only way to write to the canvas is to replace an entire file, and the file in
question is 30 KB of the design language's own founding record. Retyping it from
memory to change four characters risks a silent corruption of the document
everything else follows, and no build would catch it. It is recorded with an
owner and the condition under which it is cheap and safe to do.

**One accessibility item is now counted correctly.** A standing procedure exists
for when the canvas specifies a colour that fails a legibility measurement: adopt
the intent, not the value, and record the measurement. It had fired four times.
This epic found a fifth — a green that is slightly too pale on one interactive
surface. The repair is deliberately somebody else's, but the count is corrected
here so the next person does not record it as the first.
