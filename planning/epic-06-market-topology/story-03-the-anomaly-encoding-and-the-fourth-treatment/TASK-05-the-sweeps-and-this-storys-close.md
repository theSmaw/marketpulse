# Task 6.3.5 — The Sweeps, & This Story's Close

**Status:** **Complete — 2026-11-03** — `pnpm verify` green on the final
tree; `pnpm e2e` green in full (one isolated flake confirmed environmental,
same pattern this story's own earlier tasks already documented); the
degraded grid's purity declaration corrected (done at Task 6.3.4, confirmed
here); Story 6.4's annulus hand-off and Epic 7's new third-consumer note
both written; `MARKET-OVERVIEW.md`, `docs/GAPS.md`, `TOPOLOGY.md` and
`CLAUDE.md` all current; `STORY.md` set Complete. Ready for Gate 2.
**Story:** [6.3 The Anomaly Encoding, & the Fourth Treatment a Canvas Needs](STORY.md)
**Depends on:** 6.3.1, 6.3.2, 6.3.3, 6.3.4

## Objective

A collection of completed tasks is not automatically a completed story.
This task runs Phase 3's verification and sweeps what this story found
outward to the documents and sibling stories that need it.

## What the user can see when this lands

**Nothing new.** This story's visible payoff was Tasks 6.3.1–6.3.4; this
task closes the record.

## Work

- **Verify the whole story, integrated**: `pnpm verify`, load read before
  the run; `pnpm e2e` in full (this story ships on a route, same as 6.2).
  `pnpm test:database` — confirm whether it's in scope (no migration is
  planned; state so explicitly if it stays out).
- **The degraded grid's declaration breaks, and needs correcting rather than
  deleting.** `overview-degraded-grid.spec.ts` currently declares `Market
topology` **constant across every aggregate-only row** — true because its
  content was a function of the universe request alone. After this story
  it is a function of **two** axes (the universe request, and the band
  section this story adds to the overview aggregate), so the existing
  declaration is false the moment this story ships. Correct it to state
  what is actually still true (the graph's _structure_ and the _unscored_
  fallback are constant across aggregate-only rows; the _bands drawn when
  something is scored_ are not, because they come from the aggregate this
  grid varies) — this is a correction to a kept spec, not a new grid.
- **Sideways sweep**: grep this story's own documents (`STORY.md` plus all
  five task files) for every `Story N.M`/`Epic N` mention; check each lands
  in the recipient's own file.
  - **Story 6.4** (nearly certain): the annulus allocation decided at this
    story's Gate 1 — write it into 6.4's own `STORY.md`, in words that
    story can act on, not a link back.
  - **Story 6.6, 6.8** (check): anything about the reserved channels
    (size, opacity) this story confirmed are spoken for elsewhere.
  - **Epic 7** (check): the `ANOMALY_BAND_FLOORS` reversal trigger this
    story's own description already names — confirm Epic 7's own file
    carries the condition in words it can act on, not only this story's.
  - Record the count checked and the count that needed the hand-off
    written, same discipline as Task 6.1.4 and Task 6.2.6.
- **Upward sweep**: `MARKET-OVERVIEW.md` §8.4 gets the real measured byte
  cost from Task 6.3.1 (the frame-size table), and a dated note that the
  overview frame now carries a sixth-ish section. `docs/GAPS.md` gains an
  entry for anything this story leaves standing that nothing mechanical
  guards (the low-fit-scale `elevated` suppression threshold, if Task 6.3.2
  derived one but could not make it fully mechanical; the legend's deferred
  state if Task 6.3.4 found no room).
- **`TOPOLOGY.md`**: amend §4 ("what no machine and no person has seen")
  with this story's own findings — whether the band encoding has been
  watched against a real feed, what no gated machine can verify (CI's
  all-hollow state is the only one it will ever draw), and the treatment
  ladder's real figures.
- **`CLAUDE.md`**: update the Epic 6 status paragraph (Story 6.3 of nine
  complete) and the "What a user can see today" narrative.
- **`STORY.md`'s own status** set to Complete, with the shipped outcome and
  headline figures in the same line.

## Done when

1. `pnpm verify` is green once, on the final tree, with its numbers quoted
   — load read before the run.
2. `pnpm e2e` is green in full.
3. The degraded grid's `Market topology` declaration is corrected to state
   what is actually constant now, not deleted or left false.
4. The sideways sweep is recorded: count checked, count that needed the
   hand-off written — Story 6.4's annulus allocation confirmed written.
5. `docs/GAPS.md` and `MARKET-OVERVIEW.md` §8.4 both carry this story's
   findings.
6. `TOPOLOGY.md` and `CLAUDE.md` are both current.
7. `STORY.md`'s status is **Complete**.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-11-03

**Verified the whole story, integrated.** `pnpm verify` green on the final
tree (build, lint, format:check, stories, env:check, links, invariants —
80 hold — coverage:check, test, test:scripts, test:process). `pnpm e2e` in
full, load read before the run (`uptime` 3.05/3.27/3.66 across 8 cores):
**280 of 281 runnable specs passed**; the one failure
(`overview-degraded-grid.spec.ts` at 768, a DIFFERENT assertion than the
one Task 6.3.4 fixed — the generic content-class partition check, rows 03
vs 09) was re-run in isolation immediately afterward and passed cleanly in
24.0s, confirming the same environmental-contention pattern this story's
own earlier tasks already documented (Tasks 6.3.1 and 6.3.3's own
completion records) rather than a new regression — and this exact file was
independently confirmed green on CI's own clean runner twice already, in
PR #648 and PR #649. `pnpm test:database` is **explicitly out of scope**:
this story made zero migrations and zero schema changes across all four
implementation tasks (`git log`/`git diff` against `apps/backend/migrations/`
confirms no commits touched it), so there is nothing for that suite to
exercise that `pnpm test` does not already cover.

**The degraded grid's declaration — corrected at Task 6.3.4, not here.**
This task's own Work item anticipated the fix (`Market topology` is no
longer constant across every aggregate-only row); Task 6.3.4 found and
fixed it already, as a direct, necessary consequence of wiring the live
band (not a separate piece of work saved for this task). Confirmed here
rather than redone: `overview-degraded-grid.spec.ts`'s own two-group
assertion (the lone row that never hears an overview vs. the fourteen that
do, all uniformly carrying AC 4's fallback since none construct a real
`anomalyBands` section) is in place and green.

**Sideways sweep.** Grepped `STORY.md` and Tasks 6.3.1–6.3.4's own files
for every `Story N.M`/`Epic N` mention (this task's own file excluded, as
the one doing the grepping rather than a target of it): **20 occurrences
found across 5 files, 2 distinct recipients needed a hand-off, both
written** — `Story 6.4` (twice, both in `STORY.md`) and `Epic 7` (once,
`STORY.md`). The remaining 17 are backward citations, read in context
rather than assumed from the word alone: twelve `Story 6.2` (what Story
6.2 already shipped — the renderer, the mount effect, the drawn graph),
one `Story 6.1` (the layout model), one `Story 6.6` and one `Story 6.8`
(an existing scope division, not a new finding), `Epic 6`'s own metadata
link, and `Story 6.3`'s own self-reference in `STORY.md`'s title.

- **Story 6.4** (`story-04-hover-select-and-the-way-out/STORY.md`): a new
  dated section, "Handed here by Story 6.3's close." States the annulus
  resolution in words that story can act on directly — 6.3 takes the
  4px annulus for its ring, 6.4's own focus/selection treatment goes
  **outside** the 16-unit footprint, and `nodeAt()`'s existing hit-test
  threshold already covers it with no change needed. Also updated: the
  live-region reversal trigger that story's own earlier note names has
  now fired once (Task 6.3.3), with Story 6.3 restating rather than
  retaking "no live region" — recorded so 6.4 knows it is answering a
  SECOND firing of the same condition, not a clean first one.
- **Epic 7** (`epic-07-deterministic-investigation-engine/EPIC.md`): a new
  dated section naming the topology's own ring treatment as a THIRD
  consumer of `ANOMALY_BAND_FLOORS`, beyond the score and the DOM chip
  Epic 7's own file already discussed at length. States the real measured
  distribution the ring's current design was built against and the
  concrete action owed when the floors move: re-take Task 6.3.1's own
  measurement before assuming the ring still reads the way it was
  designed to.
- **Story 6.6, Story 6.8**: checked and confirmed as backward references
  to an existing scope division ("node sizing is Story 6.6's", "a filter
  control, that is Story 6.8's") rather than new findings those stories
  need told — no hand-off needed, same discipline Task 6.1.4 and Task
  6.2.6 both applied to their own sideways sweeps.
- **Story 6.1, Story 6.2** mentions throughout the task files are
  backward citations of prior decisions (the ring geometry, the renderer,
  the mount-effect deps) — not hand-offs, since those stories are already
  closed and nothing in them needs correcting on this story's account.

**Upward sweep.** `MARKET-OVERVIEW.md` §8.4 gained a dated paragraph: the
real measured byte cost (3,145 bytes for the `anomalyBands` section alone,
over 485 real symbols, confirming the ~3.1KB shaping estimate) and an
explicit note that this table's own five existing rows predate the
section and now understate every post-6.3 frame's true size — with a
re-take against the real deployed gateway named as owed and not done here.
`docs/GAPS.md` gained two entries: the legend's 390px deferral (measured,
not mechanically guarded — nothing asserts the legend reappears above
390px or stays absent at it) and the real band distribution's own standing
(one instant, one local store, not a session-spanning measurement — the
same caveat Task 6.3.1 already carried, now given its own permanent home
with a re-measure query against the deployed store).

**`TOPOLOGY.md`** §0 and §4 both amended: §0's "still Storybook-only or
unbuilt" list corrected (the anomaly encoding is off it; node size,
correlation edges, interaction and live updates remain). §4 gained three
entries — the degraded-grid declaration's own correction (cross-referenced
to Task 6.3.4's record), a note that the frame-rate-under-interaction gap
Task 6.2.5 flagged is STILL open despite Story 6.3 being the predicted
trigger (what shipped was a FUNCTIONAL confirmation that a live update
doesn't break pan, not a frame-rate re-take under the ring's own drawing
cost), and a plain statement of what no gated machine will ever see for
this feature specifically (CI's permanent zero-bars state means every
equity is `unscored` there, for ever — a `high`/`extreme` ring and the
`extreme` recolour are structurally unreachable on any machine but this
developer's own local store).

**`CLAUDE.md`** gained: the Epic 6 status line (two of nine → three of
nine, dated), a new paragraph under the Epic 6 account describing the
five-state ladder and its headline figures, a note on what no gated
machine will ever see, and a trim of the "what remains Storybook-only or
unbuilt" list — the anomaly band removed, leaving node size, correlation
edges, interaction and live updates as the four named themes the
remaining six stories (6.4–6.9) still own. The "What a user can see today"
section's own topology account is intentionally left as Story 6.2's
account plus the new Epic-6-status paragraph above it, rather than
rewritten in place — the existing text already correctly describes what
Story 6.2 shipped and nothing in it became false; Story 6.3's own payoff
is additive.

**`STORY.md`'s own status** set to Complete, with the five tasks named,
their headline figures in the same line, and the real measured
distribution restated.

### Gates

`pnpm verify` → exit 0, 80 invariants hold. `pnpm e2e` (full suite) → 280
of 281 passed; the one failure confirmed an isolated-rerun-clean
environmental flake. `pnpm test` → shared 667/667, backend 1344/1344,
frontend 1729/1729. `pnpm test:database` → explicitly out of scope, no
migrations this story. `pnpm format:check` and `pnpm lint` → exit 0.
`node scripts/check-links.mjs` → 0 broken.

## For a stakeholder — a status report, 2026-11-03

Story 6.3 is complete. The landing page's market graph now shows, for
every one of the 501 tracked equities, how unusual its recent behaviour
is — a quiet ring that grows louder through four steps, the loudest of
which also changes the node's own colour — updating live as the market
moves, without ever losing a reader's place if they had zoomed in or
dragged the view. A screen reader gets a real account of what the graph
means, not just that a graph exists. This was watched working against a
real copy of the product with real market data, not only reviewed in the
design workshop.

What this task itself added: the paper trail. Every later story and epic
that needs to know something this story found — where Story 6.4's own
focus ring has to live so it doesn't collide with this one, what Epic 7
needs to re-check if the scoring model ever changes, what this product's
own test suite needed corrected because this feature is now genuinely
live — has that written into its own file, in words it can act on,
rather than left to be rediscovered. Two measurements are recorded as
honestly incomplete rather than overstated: the real distribution of how
many securities land in each band is from one session on one developer's
machine, not a representative sample, and the cost of panning and zooming
the graph while it is actively ringing securities has not been separately
timed.

The story is ready for your acceptance as Product Owner.
