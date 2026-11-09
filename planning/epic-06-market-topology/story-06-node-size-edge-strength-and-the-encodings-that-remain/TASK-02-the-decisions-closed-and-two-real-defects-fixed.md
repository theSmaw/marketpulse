# Task 6.6.2 — The decisions closed, and two real defects fixed

**Status:** Complete — 2026-11-09, both Open Decisions and two escalated questions propagated into Story 6.7's and Story 6.8's own STORY.md files; AC6 closed in the epic record; a pre-existing wrong clearance-arithmetic docblock corrected (1.25px claimed, 0.00px real); a new docs/GAPS.md entry for the eleven unlabelled sector ETFs at three of four tested widths
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

---

## What was done — 2026-11-09

All six work items completed directly (this is a documentation and
decision-closing task; the one code touch is a comment-only docblock
correction, so no developer agent was needed).

**Open Decisions 1 and 2, and the two escalated questions (Intensity,
edge affordance)** were already recorded in `STORY.md` at Gate 1 with
their reasoning and reversal triggers; this task's job was propagating
them sideways rather than re-deciding anything.

**Story 6.7's own `STORY.md`** gained a new "Handed here by Task 6.6.2"
section: §10's `Intensity` (current price movement) encoding, why it
collided with Story 6.3's band ramp and was not taken in 6.6, why 6.7's
own subject (live movement) makes it the natural owner, and what already
exists (`Movers`/`Unusual activity`) that 6.7's own shaping should weigh
before deciding whether a node-level treatment is additive or a third
home for one fact. Left genuinely open — not a decision already taken.

**Story 6.8's own `STORY.md`** gained a new "Handed here by Task 6.6.2"
section carrying Task 6.5.2's three original edge-affordance questions
verbatim (hoverable? what does the plate say? keyboard-reachable?), the
measurements already taken (the 0.0 px crowding figure in `TECHNOLOGY` at
390, the plate's five reserved line slots, `n`'s deliberate absence from
the model, the CI-absent nightly-changing correlation set problem for a
keyboard walk), and why this story is the right next owner (its own Open
Decision 1 already names correlation strength as a candidate filter).

**AC6 closed** — `TOPOLOGY.md` §3 gained a paragraph stating the shape
ladder (circle/square/diamond) IS §10's `shape/icon` encoding, taken by
Story 6.2 on 2026-11-01, closing it in writing for the first time; the
same paragraph states where all five of §10's node encodings now stand
(cluster: 6.2, shape/icon: 6.2, border: 6.3, size: refused by 6.6, intensity:
handed to 6.7).

**The clearance-arithmetic defect, found and corrected.** Verified
independently against the actual draw code rather than trusting the
original docblock's claim: every stroke width in `renderer-canvas.ts` is
set as a bare constant (`context.lineWidth = FOCUS_RING_WIDTH`,
`context.lineWidth = width` for the anomaly ring) — **never multiplied by
`nodeScale`** — while the RADII do scale. The original docblock treated
both as scaling together, halving 2.5 px to claim a 1.25 px worst-case
clearance at the zoom floor. The real arithmetic: at `nodeScale = 0.5`,
the `extreme` ring's outer edge is `6 × 0.5 + 1.5 = 4.5` and the focus
ring's inner edge is `11 × 0.5 − 1 = 4.5` — **clearance 0.00 px, the two
rings already abut exactly**, independent of anything this story does.
Corrected in the docblock itself with the derivation shown.

**`docs/GAPS.md`** gained the unlabelled-sector-ETF entry: at three of
four tested widths (1024/768/390, all below `TOPOLOGY_SECTOR_LABEL_MIN_
SCALE = 0.38`), the eleven sector benchmark ETFs draw as unlabelled
squares — a sharper framing of Task 6.2.2's own already-accepted
trade-off, found while answering Open Decision 2, owned by a future
labelling-specific task rather than fixed here with a new node encoding.

### Gates

- `pnpm typecheck`: green (one file touched, comment-only).
- `pnpm lint`: green.
- `pnpm build`: green, `82 invariants hold` (unchanged — this task adds
  no new invariant).
- `pnpm links`: `641 documents, 2019 cross-file links, 0 broken`.

## For a stakeholder — a status report, 2026-11-09

This task closed the paperwork half of Story 6.6: both Open Decisions
and two further questions found during Gate 1 shaping are now written
into the exact documents that need to act on them (Story 6.7's and
Story 6.8's own files), not just recorded in Story 6.6's own. One
long-standing documentation defect was found and fixed — a docblock had
been claiming a focus-ring clearance figure that the renderer's own code
does not actually produce (1.25px claimed, 0.00px real, meaning two
rings already touch exactly at the narrowest zoom, independent of
anything this story shipped). One new, real, measured finding was added
to the gaps ledger: the eleven sector ETFs are nameless squares at most
widths this product tests, found while confirming they don't need a
new visual treatment. No code behaviour changed.
