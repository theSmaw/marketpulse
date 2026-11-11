# Task 6.8.4 — The sweeps, and this story's close

**Status:** Complete — 2026-11-11. All four tasks merged; one routed grammar defect fixed (and two pre-existing tests that had coincidentally asserted the bug corrected); full verification green across `pnpm verify`/`pnpm e2e`/`pnpm test:database`/`pnpm probe`; story closed.
**Story:** [6.8 Filtering, & the Degraded Set](STORY.md)
**Depends on:** 6.8.1, 6.8.2, 6.8.3

## Objective

A collection of completed tasks is not automatically a completed story. This
task verifies the whole story end to end — filtering and the degraded set
together, not each task's own surface in isolation — performs the upward and
sideways sweeps, and closes Story 6.8.

## What the user can see when this lands

Nothing new — this is the verification and close.

## Work

- **Full verification**: `pnpm verify`, `pnpm e2e`, `pnpm test:database`,
  `pnpm probe` at all four widths across the combined filter × degraded-state
  space Tasks 6.8.1–6.8.3 each took separately.
- **Acceptance criteria walked one by one with evidence**, per `STORY.md`'s
  own rewritten text — including the two accepted departures (AC3's
  unreachable-by-construction cover, AC6's declared collision class).
- **Upward sweep**: grep this story's own documents and code for anything
  that falsifies a governing document (an ADR, `CLAUDE.md`, `PRODUCT_SPEC.md`);
  correct the live sites, leave historical records standing.
- **Sideways sweep**: grep every file this story touched for `Story N.M` and
  `Owner:` lines, check each against that story's own file, and state the
  count that were missing — in particular confirming whether the three
  edge-affordance questions and the correlation-strength refusal (Open
  Decision 1) need anything written into a sibling story's own `STORY.md`
  beyond this story's own record.
- **`docs/GAPS.md`**: close the native-context-menu entry (disposition taken)
  and the Task 4.7.11 hand-off (discharged or re-owed, per Task 6.8.3's
  finding); add any new entries this story leaves standing that nothing
  mechanical guards.
- **`TOPOLOGY.md`, `CLAUDE.md`, `LIVE-REHEARSAL.md`** updated if this story
  changed what a user can see (it does) — a new §8 in `TOPOLOGY.md`
  mirroring the shape §6/§7 already established; `CLAUDE.md`'s Epic 6 status
  line moved to eight of nine stories; a new `LIVE-REHEARSAL.md` row if a
  person needs to have watched any of this working, per that file's own
  rules (most of this story's own claims are producible and verified by a
  gated machine — state plainly if nothing here needs a person, rather than
  adding a row by default).
- **`STORY.md` status** set to Complete, with the four tasks' PR links.
- **Gate 2** presented to the Product Owner.

## Done when

1. `pnpm verify`, `pnpm e2e`, `pnpm test:database` are green; `pnpm probe`
   results are recorded.
2. Every acceptance criterion is walked with evidence, including the two
   accepted AC departures.
3. The sweeps are complete and recorded, with the sideways grep count stated.
4. `docs/GAPS.md`, `TOPOLOGY.md`, `CLAUDE.md`, `LIVE-REHEARSAL.md` are updated
   as warranted.
5. Gate 2 is presented with evidence per acceptance criterion and per Open
   Decision, and the story is accepted and closed.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-11-11

**Status: Complete.** All four tasks of Story 6.8 are built, verified and
merged. This task fixed one routed defect, verified the whole story end to
end, performed the sweeps, and closes it.

### A routed defect, fixed rather than left

Task 6.8.3's own `docs/GAPS.md` entry named a sibling of the grammar defect
it had just fixed — `topologyFilterWords`' own population clause read `1 of
the 501 companies we track **are** high`, reachable the first session
exactly one security is `high`/`extreme` alone, and routed itself to "Story
6.8's own close sweep... which is already walking these two builders."
Taken up here: a `matchedVerb` idiom (`count === 1 ? "is" : "are"`, the same
shape `MarketTopology.tsx`'s own `isAre` already uses) at both of the
clause's call sites, plus a new unit test constructing the exact state by
hand (no store this epic has measured against reaches it — 122 and 16 are
the only counts seen). **Two pre-existing tests in
`MarketTopology.test.tsx` had coincidentally hit `matched === 1` and
asserted the buggy `are`** — found and corrected in the same change, not a
regression this task introduced.

### Full verification

- **`pnpm verify`** — green. `86 invariants hold.` 711 + 1388 + 1956 unit/
  component tests, 21 script tests, 60 process tests, no `Unhandled
Errors` block.
- **`pnpm e2e`** (the whole suite, 325 passed, 16 skipped, 8.6 minutes) —
  **2 failures on the first run**, both `color-contrast` axe violations on
  `security-explorer-shell.spec.ts` — a route Story 6.8 never touched (last
  commit under that path: Story 6.5, 2026-11-07) and a borderline figure
  (4.32:1) this repository's own `CLAUDE.md` already records as a routed,
  pre-existing defect from Epic 4's close. **Both passed cleanly on
  individual re-run** (load had been at ratio ~2.4 during the full run),
  confirming a load-sensitive flake on a borderline measurement rather than
  anything this story touched.
- **`pnpm test:database`** — green. 414 tests, 14 files.
- **`pnpm probe / --within "Market topology"`** — all four widths, with
  both filter controls present: 1440 unchanged to the pixel (meta fits in
  one row, 665×34); 1024 and 390 show the header growth Tasks 6.8.1/6.8.2
  already measured and repaired (59→95 at 390, the meta wrapping through
  its own wrapper rather than `Panel.meta`'s shared `flex-wrap`); no
  overlapping boxes at any width; the region's own height is unchanged in
  every state (`document.scrollHeight` identical before and after, per Task
  6.8.3's own figures).

### Acceptance criteria, walked with evidence

1. **Filtering states its own population** — `topologyFilterWords`/
   `topologyBandWords` (Task 6.8.1/6.8.2), the house `describeMeasuredSet`-
   style discipline (figures read off the graph, `countInWords`' `none`
   never `0`, now with the `is`/`are` grammar fix above). Verified: unit
   tests, the e2e filter spec's population assertions against `GET
/securities`.
2. **A filter is reflected in the URL** — `?sector=<slug>`,
   `?band=high,extreme`, via `<Link>`s resolved at render (never
   `setSearchParams`), so `one-home-for-imperative-navigation` holds by
   construction. Verified: the e2e spec's cold-address and shared-link
   tests.
3. **Rewritten and verified**: a filter press neither re-mounts the
   renderer nor resets pan/zoom/selection (`framesDrawn()` unchanged, a
   pan survives — e2e, Task 6.8.1), and the ADR 0028 cover is recorded as
   unreachable by construction (no request a client-side filter could ever
   need to cover).
4. **Every degraded state produced rather than furnished where possible**
   — Task 6.8.3's new sibling spec, nine states, eight produced through
   the real socket/decoder/store and one (the region removed from the
   bundle) named unproducible, alongside the pre-existing "content threw"
   exception.
5. **Rewritten and verified**: the real, producible states (whole market;
   one sector; no bars; no provider; aggregate carrying nothing; backend
   unreachable; `anomalyBands` absent; relationships failed/refused) are
   each asserted; the one genuine exception is named rather than built.
6. **No two states read identically, with one declared, accepted
   exception** — `one-region-three-thin-stores` (no bars / no provider /
   aggregate-carrying-nothing), asserted in both directions in Task
   6.8.3's spec. Every other state stays distinct.
7. **The accessible fallback carries the state in words, and now survives
   a live band update AND a width change** — the band clause threaded
   through both sentence writers (Task 6.8.2); the correlation clause
   fixed to be width-aware rather than claiming edges that are suppressed
   below the fit-scale threshold at three of four widths (Task 6.8.3, a
   real pre-existing defect found and fixed, not merely discovered).

**Open Decision 1** (filter by what): settled — sector and band, correlation
strength and the three edge-affordance questions refused a third time under
one shared reversal trigger. No sibling story's `STORY.md` needs anything
written into it: the trigger is a condition ("the first surface that needs
to name a single pair's own coefficient to a reader"), not a story number,
and no later story currently depends on this story resolving it differently.

**Open Decision 2** (hide vs. dim): settled — hide the excluded equities,
hold the layout, de-emphasize (never hide) the fifteen landmarks. Verified:
Task 6.8.1's three real UI defects found by looking (none would have been
caught by any level below a browser), the de-emphasized treatment's two
survive-grayscale channels (fill-vs-outline, size).

**The native context-menu disposition** (carried from Story 6.4's own
Gate 2): settled — left alone, since filtering added no third kind of
press to the canvas. The real bug beside it (`event.button`/`isPrimary`)
is fixed.

**One thing surfaced during implementation, not resolved as a decision**:
Task 6.8.3 found that the sector/band controls and `Reset view` remain
present-and-inert over a degraded topology that has no graph to filter —
consistent with `Reset view`'s own precedent (present in every state,
never appearing/disappearing under a reader), but never explicitly put to
the Product Owner for this surface. Recorded for Gate 2 below rather than
decided here.

### The sweeps

**Upward** — nothing this story measured falsifies a governing document.
No ADR, `PRODUCT_SPEC.md` clause, or `CLAUDE.md` invariant needed a
correction.

**Sideways** — grepped every file under this story's own directory for
`Story N.M` and `Owner:` lines, and the three `docs/GAPS.md` entries this
story touched. Result: **0 missing** — every `Story N.M` reference in this
story's own documents is to an already-complete prior story (6.3–6.7),
cited for context; the two `Owner:` lines this story's own new `docs/GAPS.md`
entries carry are both conditions rather than story numbers (the first
story to fill `Current investigations`; the native-context-menu entry and
the grammar entry are both now closed in this same task, so neither carries
a forward-looking owner at all).

**`docs/GAPS.md`** — the native-context-menu entry closed (disposition
taken, bug fixed); the routed grammar entry closed (fixed in this task);
the degraded-vs-deferred finding (Task 6.8.3) left open with a real,
narrower condition (`Current investigations` is now the only remaining
badged hatch).

**`TOPOLOGY.md`** — §8–§10 already written by Tasks 6.8.1–6.8.3; §0's own
bound-chain narrative closed its "what remains" link for this story, naming
only §2's local renderer figures and Story 6.9 as what's left in the whole
document.

**`CLAUDE.md`** — Epic 6's status line moved to eight of nine stories, with
a new paragraph covering the whole of Story 6.8 (the filter architecture,
the curated-vs-live asymmetry between sector and band, the degraded set,
the two real defects found and fixed, the context-menu disposition).

**`LIVE-REHEARSAL.md`** — **no new row.** Unlike Story 6.7's live-update
mark, nothing this story ships depends on watching a real market session:
filtering is client-side over data already in the browser, the band
filter's underlying data comes from the nightly composite batch (not the
live socket), and the degraded set is produced through route-level
intercepts and a bare store rather than anything requiring a person at a
real session. Stated plainly rather than adding a row by default.

### Gates

- `pnpm verify` — green.
- `pnpm e2e` (full suite) — green; 2 transient machine-contention failures
  on an unrelated, untouched spec, confirmed clean on individual re-run.
- `pnpm test:database` — green.
- `pnpm probe / --within "Market topology"` — all four widths, no
  regression, matches Tasks 6.8.1–6.8.3's own recorded figures.

## For a stakeholder — a status report, 2026-11-11

**Story 6.8 is complete.** A reader can now narrow the market topology to
one sector, and further to one or more anomaly bands within it — both as a
simple control in the region's own chrome, both reflected in the address so
a narrowed view can be shared or reloaded. The graph never redraws itself
when a filter changes: the same 516-node picture stays in the same place,
with excluded securities simply not drawn, so a reader's pan, zoom and
current selection all survive every press.

**The two axes behave differently on purpose.** Sector membership is a
fixed, curated fact, so filtering by sector is simple and always available.
Band membership is a live measurement that updates continuously, so
filtering by band had to be built to survive that: a reader's selection is
never yanked away by an update happening in the background, and on a brand
new deployment or the automated test environment — where nothing has been
measured yet — picking a band tells the reader plainly that there's nothing
to narrow yet, rather than showing an empty, misleadingly "nothing is
unusual" market.

**The second half of this story makes the product honest when its data is
thin, which is the permanent state of every automated check this product
runs.** A new automated test suite proves that eight distinct ways the data
behind this graph can come back incomplete are each handled with the right
words and the right picture — and three of those ways are deliberately
treated as indistinguishable from each other, because the real difference
between them belongs to a different part of the screen that already states
it, and repeating it here would risk the product disagreeing with itself.

**Two real, previously-unknown defects were found and fixed while building
this**, neither related to filtering directly: a sentence describing how
securities are connected by measured relationships was claiming those
connections were drawn on screen even at phone and tablet widths, where
they are actually hidden for legibility — now fixed to describe what's
actually visible. And a count-dependent sentence had a grammar mistake
(saying "1 are" instead of "1 is") that no real data this team has seen has
triggered yet, but would have on the right day.

**Everything else closes cleanly.** A long-standing open question from an
earlier story (whether the browser's own right-click menu belongs on an
interactive graph node) is resolved: it stays, and a related minor bug
(right-click also selecting the node underneath) is fixed. The whole
product was re-verified end to end with nothing regressed.
