# Task 6.9.3 — The epic-wide verdict, and `docs/GAPS.md` closed out

**Status:** Not started
**Story:** [6.9 The Rehearsal, the Sweep, & Epic 6's Close](STORY.md)
**Depends on:** nothing (independent of 6.9.1/6.9.2, though citing their
amendments where relevant)

## Objective

Epic 5 closed with 59 acceptance criteria and 33 carrying no per-criterion
verdict — the three most recent of its six stories published none, and
reconstructing a verdict from task files weeks later is a different and
weaker artefact than a story writing its own. This epic's eight stories
carry 63 acceptance criteria between them (8+9+10+7+8+7+7+7), none as a
literal table, though every story's own closing task file has the evidence
somewhere in its narrative. This task compiles that evidence into one table,
the way Epic 5's own close did, rather than leaving it to a future reader to
reassemble. It also closes out everything `docs/GAPS.md` has been owed by
this epic, including fixing a real mechanical gap: the ledger invariant that
should refuse this story's own close over an unwatched row does not even
know this epic exists yet.

## What the user can see when this lands

Nothing — this is the record Epic 6 leaves behind.

## Work

- **The epic-wide AC verdict table**, one row per acceptance criterion
  across Stories 6.1–6.8, in Epic 5's own close format:
  `AC | Verdict | Instrument | Kind | Store`. **Kind** splits into
  **re-take** (a runnable command from a clean clone) or **dated reading**
  (unreproducible later, measured once). **Store** names which database/
  environment the verdict was taken against, because on this epic's own
  machines "verified" routinely means "verified in the refusal arm" (CI has
  zero bars, no provider, no composite generation — every composite-score,
  correlation-edge or live-update claim there is permanently the honest-
  absence state). Cite each story's own existing evidence (several task
  files, especially 6.7's and 6.8's own closes, already carry per-AC
  narrative walkthroughs) rather than re-measuring what was already taken —
  this is a compilation task, not a re-verification one, except where a
  citation genuinely cannot be found, in which case re-take it and say so.
- **§28's two topology targets, measured and published**: the 60 FPS
  figure (Story 6.7's own 16.7 ms median, both headless and headed, cited
  rather than re-taken) and the main-thread-rule-on-three-channels (Stories
  6.7's and 6.8's own burst-absorption and degraded-grid evidence). The
  synthetic 5,000-node target confirmed as Epic 14's and untaken, same
  wording as Task 6.9.1's own `PRODUCT_SPEC.md` amendment.
- **`docs/GAPS.md`**: walk the full list of topology-related entries (at
  least the 16 found during this story's own shaping — several already
  closed, several still open with a real owner/condition) and confirm each
  is in its correct state; mechanize anything that can be a `pnpm
invariants` check instead of prose, with its own `pnpm break`.
- **Register Epic 6 in `REHEARSAL_LEDGER_EPICS`** (currently only 3, 4, 5
  are listed, so `the-epic-close-cannot-outrun-the-rehearsal-ledger`
  cannot see this epic at all) — and in the same change, **write the
  dated, owned waiver** the Product Owner settled on at this story's own
  Gate 1 for `LIVE-REHEARSAL.md` row 6.7, naming explicitly which of the
  seven things a real sitting would check are being deferred (the four
  named in this story's own AC3, plus the three `docs/GAPS.md` entries
  that name "the same future rehearsal/sitting" as their owner: no gated
  machine draws a correlation edge; the correlation-strength perf cost
  only visible headless; the real-GPU `--live` contention noise), with a
  condition rather than a deadline, per this file's own rule that a waiver
  with no owner fails the build.
- **Confirm the invariant refuses correctly** with the waiver in place
  (Epic 5's own waived row is the precedent — a dated, owned waiver is
  accepted; an undated or unowned one is not) via `pnpm break` or a direct
  read of the check's own logic.

## Done when

1. The epic-wide AC verdict table exists, covering all 63 acceptance
   criteria across Stories 6.1–6.8, each with a verdict, an instrument,
   a re-take/dated-reading split, and a store.
2. §28's two topology targets are published with real figures (or
   confirmed unattempted, for the synthetic one).
3. `docs/GAPS.md`'s topology entries are each confirmed in their correct
   state; anything mechanisable is mechanised with its own break.
4. Epic 6 is registered in `REHEARSAL_LEDGER_EPICS`.
5. Row 6.7's waiver is written, dated, owned, and names its full scope
   (all seven deferred checks, not only the four in this story's own AC3).

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
