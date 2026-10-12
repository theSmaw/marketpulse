# Task 4.9.6 — The canvas verdict, and the `VISUAL-LANGUAGE.md` reconciliation

**Status:** Not started
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

<!-- written at completion -->
