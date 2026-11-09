# Task 6.6.2 — The decisions closed, and two real defects fixed

**Status:** Not started
**Story:** [6.6 Node Size, Edge Strength, & the Encodings That Remain](STORY.md)
**Depends on:** nothing in this story (can run alongside 6.6.1)

## Objective

This story's Gate 1 settled both of its own Open Decisions and two further
questions escalated during shaping. None of that is self-executing — each
needs writing into the record it belongs in, several of them into a
sibling story's own `STORY.md` rather than a link back (this repository's
own rule: a hand-off sweeps sideways and a story close does not reach it on
its own). Two real, measured defects were also found during shaping and
need fixing regardless of any decision above.

## What the user can see when this lands

Nothing new on screen — this task is decisions, hand-offs and two
documentation/arithmetic corrections.

## Work

- **Record Open Decision 1 (refuse node size)** in `STORY.md`, already done
  at Gate 1 above — confirm it stands, with its reversal trigger.
- **Record Open Decision 2 (no landmark treatment beyond shape)**, already
  done at Gate 1 above — confirm it stands.
- **Close AC6 in the epic record.** One line in `TOPOLOGY.md` or `CLAUDE.md`
  stating that §10's `shape/icon — security type` encoding was taken by
  Story 6.2 (circle 8 / square 10 / diamond 12), so a future reader sees
  §10's encodings each closed by a named story.
- **Hand §10's `Intensity` encoding to Story 6.7's own `STORY.md`**, in
  words that story can act on: the encoding exists, is undecided, and
  collides with Story 6.3's band ramp if taken without a plan for the
  collision.
- **Hand Task 6.5.2's three edge-affordance questions to Story 6.8's own
  `STORY.md`**, with the measurements this story's shaping pass already has
  on hand: the 0.0 px hit-test crowding figure in `TECHNOLOGY` at 390, the
  readout plate's five already-reserved line slots (a sixth is a new plate
  height), the counted overlap `n` deliberately absent from the model, and
  the keyboard-walk shape problem (an edge has no position in `walk.ts`'s
  tree, and the obvious answer makes the walk depend on a nightly-changing,
  CI-absent correlation set).
- **Fix the pre-existing wrong clearance arithmetic** found during shaping:
  `renderer-canvas.ts`'s own docblock claims the `extreme`-anomaly-ring to
  focus-ring clearance is 1.25 px at the zoom floor. The real figure is
  **0.00 px** — the two rings already abut exactly today — because the
  docblock's arithmetic assumed both rings' _strokes_ scale with zoom, and
  only their _radii_ do (`context.lineWidth` is set to a constant in both
  passes). This is independent of any decision in this story and was true
  before it started; correct the docblock and record the real figure.
- **Add a `docs/GAPS.md` entry**: the eleven sector benchmark ETFs draw as
  unlabelled squares at three of the four tested widths (1024/768/390),
  below `TOPOLOGY_SECTOR_LABEL_MIN_SCALE` — found while answering Open
  Decision 2, which called them "arguably the most important nodes on the
  screen." This is a measured sharpening of an existing, deliberately
  accepted trade-off (Task 6.2.2's own decision 8), not a new defect this
  story introduces — owner a future labelling-specific task, condition
  stated.

## Done when

1. Both Open Decisions and both escalated questions are recorded in
   `STORY.md` with their reasoning and reversal triggers (already drafted
   at Gate 1 — this task confirms and cross-links).
2. Story 6.7's own `STORY.md` carries the `Intensity`-encoding hand-off in
   words it can act on.
3. Story 6.8's own `STORY.md` carries the edge-affordance hand-off, with the
   measurements named above, in words it can act on.
4. AC6 is closed with one line in the epic record.
5. The clearance-arithmetic docblock is corrected and the real figure
   (0.00 px) is recorded.
6. `docs/GAPS.md` carries the unlabelled-landmark entry with an owner and a
   condition.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
