# Task 6.2.6 — The Sweeps, & This Story's Close

**Status:** **Complete — 2026-11-01.** `pnpm verify` and a full `pnpm e2e`
(278 passed, 16 deliberately skipped, 0 failed) both green; `pnpm
test:database` confirmed out of scope (no migration in this story);
`docs/GAPS.md`'s two relevant entries closed/amended; the upward sweep wrote
dated amendments into `PRODUCT_SPEC.md` §9 and `MARKET-OVERVIEW.md`
§1.1/§1.4/§9 (§7.3 was already done by Task 6.2.4); a real before/after
displacement re-measure — not argued, actually taken against a clean `main`
worktree — found the page got **shorter** at ≥1024 despite the topology
growing +361px, because two rows of 2-up regions collapsed into one; the
sideways sweep wrote hand-offs into Stories 6.3, 6.4, 6.5 and 6.6 (4 of 4
checked, 4 of 4 needed the write); `TOPOLOGY.md`, `EPIC.md` and `CLAUDE.md`
are all current. `STORY.md`'s own status is left for the close commit at
Gate 2's acceptance, per the `/story` skill's own convention.
**Story:** [6.2 The Topology Takes the Landing Page](STORY.md)
**Depends on:** 6.2.2, 6.2.3, 6.2.4, 6.2.5

## Objective

A collection of completed tasks is not automatically a completed story. This
task runs the verification Phase 3 asks for — including, for the first time
in this epic, `pnpm e2e` and `pnpm test:database` as genuinely in scope — and
sweeps what this story found outward to the documents that need it.

## What the user can see when this lands

**Nothing new.** This story's visible payoff was Tasks 6.2.1–6.2.4; this task
closes the record.

## Work

- **Verify the whole story, integrated**: `pnpm verify`, load read before the
  run. `pnpm e2e` is **in scope this time** (unlike Story 6.1 — this story
  ships a route) and must be run in full, not just the touched specs.
  `pnpm test:database` — confirm whether it's in scope (no migration is
  planned; state so explicitly if it stays out).
- **`docs/GAPS.md`**: close or narrow the label-collision entry per Task
  6.2.2's real figures. Confirm the 60fps/local-scale entry's language still
  holds now that the route carries the graph (it does — the route measurement
  is still local, one laptop; update if Task 6.2.5 found otherwise).
- **Upward sweep**: `PRODUCT_SPEC.md` §9 gets its dated amendment (the
  canvas's sector/movers grouping over §9's own breadth-beneath sketch —
  Gate 1's design-system reconciliation, not a Product Owner question).
  `MARKET-OVERVIEW.md` §1.1's region table, §7.3's content-class rule (the
  dated amendment from Task 6.2.4), and §1.4's trigger ledger (this story's
  own displacement figures, alongside the other route's +74px).
- **Sideways sweep**: grep this story's own documents for every `Epic N` /
  `Story N.M` mention; check each lands in the recipient's own file. Likely
  candidates: Story 6.3 (the `topologyDrawnSentence` reversal trigger —
  "nothing in it is a measurement" stops being true the moment an anomaly
  band draws), Story 6.4 (the `Reset view` control it inherits; the live-
  region reversal trigger), Story 6.5 (whether 512 edges at the new elliptical
  ring still reads cleanly, or whether 6.5's correlation edges need their own
  geometry check). Record the count checked and the count that needed the
  hand-off written, same discipline as Task 6.1.4.
- **`TOPOLOGY.md`**: amend with this story's own findings — the elliptical
  ring's real figures (replacing Story 6.1's circular ones as the current
  geometry), the renderer-side label threshold, the Storybook-bound
  frame-rate limitation, the degraded-grid's new axis. Keep the "what no one
  has seen yet" section current rather than letting it drift.
- **`CLAUDE.md`**: update the Epic 6 status paragraph (Story 6.2 of nine
  complete) and the "What a user can see today" narrative — this is the first
  story in this epic with something to say there, since `/` now draws the
  graph for real.
- **`STORY.md`'s own status** set to Complete, with the renderer's real
  on-screen outcome and headline figures in the same line.

## Done when

1. `pnpm verify` is green once, on the final tree, with its numbers quoted —
   load read before the run.
2. `pnpm e2e` is green in full (not scoped to touched specs).
3. `docs/GAPS.md`'s relevant entries are closed, narrowed, or confirmed
   current, each with its re-measure command re-verified.
4. The upward sweep is complete: `PRODUCT_SPEC.md` §9, `MARKET-OVERVIEW.md`
   §1.1/§1.4/§7.3 all carry their dated amendments.
5. The sideways sweep is recorded: count checked, count that needed the
   hand-off written.
6. `TOPOLOGY.md` and `CLAUDE.md` are both current.
7. `STORY.md`'s status is **Complete**.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-11-01

### Verification

- `pnpm verify` — green (load read before each run; a first run at load 12.0
  and a second at 14.3 both passed with identical counts, confirming the
  result rather than the load).
- `pnpm e2e` in full — first full run hit **one** failure
  (`overview-degraded-grid.spec.ts` at 768, a content-class assertion), which
  passed cleanly in isolation immediately afterward; the machine's one-minute
  load average was 18.67 at the time, traced to `spotlightknowledged` at
  116% CPU re-indexing after the worktree work below. Re-run in full once
  load settled (4.66): **278 passed, 16 deliberately skipped, 0 failed** —
  confirming the first failure was the documented load-contention class of
  flake (`CLAUDE.md`'s own "re-run before treating as a defect" rule) rather
  than a regression.
- `pnpm test:database` — **out of scope**, confirmed explicitly: no
  migration was written anywhere in this story's five prior tasks (checked
  via `git log` against `apps/backend/migrations/`).

### `docs/GAPS.md`

- The label-collision entry was already closed by Task 6.2.2, before this
  task — confirmed rather than re-closed.
- The 60fps/local-scale entry gained a dated amendment: the **cold-load**
  half now has a real route-level re-measurement (Task 6.2.5's figures); the
  **frame-rate-under-interaction** half is unchanged and still Storybook-only,
  with the same owner and condition.

### Upward sweep

- `PRODUCT_SPEC.md` §9 gained a dated amendment recording the sketch's
  breadth-beneath-topology grouping as superseded by the shipped grid
  (sector performance/movers beneath the topology, breadth moved to the
  right column) — the design-system reconciliation Gate 1 already decided,
  written down rather than left implicit.
- `MARKET-OVERVIEW.md` §1.1's region table: `Market topology` row updated
  from `reserved` to its real content, with a dated note that six of seven
  regions now hold content.
- `MARKET-OVERVIEW.md` §1.4's trigger ledger: a **fifth** firing recorded,
  with a real before/after displacement measurement — see below — rather
  than the argument Task 6.2.1 had substituted for it.
- `MARKET-OVERVIEW.md` §9 gained a dated note that `Market topology` is now
  an exception to the "what no gated machine has ever seen" table.
- §7.3's dated amendment was already written by Task 6.2.4, before this
  task — confirmed rather than re-written.

### The real displacement re-measure AC 2 and Task 6.2.1 both left outstanding

Task 6.2.1's own record explicitly flagged that it had **not** independently
re-verified the before/after region displacement against a clean `main`
checkout — it substituted a code-comment citation and a 30-spec regression
run. This task took the real measurement rather than carrying the flag
forward: a second git worktree at `98d6a9a1` (the commit at Story 6.2's
Gate 1, immediately before Task 6.2.1's grid reversion), its own isolated
production pair (`provider=none` both sides, so the overview aggregate is
held constant and only the grid differs), `pnpm probe` before and after at
the four standard widths plus the three 1440-height variants AC 2 names.

**Finding, stated plainly because it was not predicted**: the page at
1440/1024 got **shorter** after this story (1893→1763px at 1440, −130px)
despite `Market topology` itself growing by +361px — because the old grid
spent two separate `minmax(min-content, 1fr)` rows of 491px each
(sectors+unusual, movers+breadth) where the new grid spends one
(sectors+movers+breadth together, with unusual promoted into the
topology's own row), a structural saving of one 491px row that outweighs
the topology's own growth. At ≤860 the page genuinely grew (+425px at 768,
+413px at 390) because the one-column stack has no such row-sharing to
offset the topology's height. The full table is in `MARKET-OVERVIEW.md`
§1.4's fifth-firing entry. The 1440-height variants (700/680/500) also
confirm Task 6.2.1's own fix is structural rather than coincidental: all
three produced byte-identical region boxes to 1440×900 in the new grid,
where the old grid's `calc(82vh...)` row made the topology's own height — and
everything below it — a function of viewport height, scrolling at 1440×500.

### Sideways sweep

Checked **4** candidate recipients named in this story's own documents
(grepped for every `Story 6.[3-9]` / `Epic N` mention across `STORY.md` and
all five task files): Stories 6.3, 6.4, 6.5 and 6.6. **4 of 4 needed the
hand-off written** — none had it already:

- **6.3**: `topologyDrawnSentence`'s own reversal trigger (its "nothing in
  it is a measurement" clause breaks the moment an anomaly band draws), and
  the declined-memo-boundary's reversal trigger (6.3's band is one of the
  two named likely sources).
- **6.4**: the live-region reversal trigger (named by `MarketTopology.tsx`'s
  own docblock as 6.4's condition), the pointer/keyboard state it inherits
  (`fit.ts`'s `TopologyView`, `nodeAt()`'s hit-test), and the shared
  `Reset view` control's own open question (does a selection clear on
  reset?).
- **6.5**: the ring is no longer the shape its own figures were reasoned
  against (elliptical 1880×923 extent, 2.04 aspect, against the circular
  1080×1008) — correlation-edge readability needs re-taking against the
  real geometry.
- **6.6**: the declined-memo-boundary's other named likely source (node
  size changing at feed cadence), and the 4-unit node annulus now a THIRD
  claimant alongside 6.3's band and 6.4's focus ring.

### `TOPOLOGY.md` and `CLAUDE.md`

- `TOPOLOGY.md` §0 and §4: the "nothing is on any route" framing corrected
  (struck, with a dated false-since note); the label-collision bullet
  struck and replaced with the closure account; a new bullet added for the
  degraded grid's new axis and `overview-market-topology.spec.ts`; the
  frame-rate-under-interaction bullet (added by Task 6.2.5) confirmed
  current.
- `CLAUDE.md`'s Epic 6 status paragraph: "one of nine... nothing visible"
  corrected to "two of nine... the graph is on the route," with the full
  shipped account (the ring, the label fix, pan/zoom, the retry, the
  CI-capable verification, the cold-load figure). The "What a user can see
  today" narrative's stale `reserved`/interim-layout claims for
  `Market topology` corrected — its own reversal trigger (_the first commit
  that renders a graph node_) fired, and the sentence now says so.

### Gates

- `pnpm build` — passed.
- `pnpm lint` — clean, 0 warnings.
- `pnpm format:check` — clean.
- `pnpm invariants` — 80/80 hold.
- `pnpm links` — 0 broken (1995 cross-file links, 39 anchor links).
- `pnpm e2e` — 278 passed, 16 skipped, 0 failed (full suite, second run).
- `pnpm test:database` — confirmed out of scope.

## For a stakeholder — a status report, 2026-11-01

This task adds nothing new to the screen — it is the close-out work that
makes Story 6.2 a verified, documented whole rather than five separate
merged changes.

Two findings are worth knowing about beyond the checklist. First: when I
actually measured (rather than argued, which is what the first task in this
story had settled for) how much the rest of the landing page moved because
of this change, the answer was a surprise — on a normal desktop screen, the
page got **shorter**, not taller, even though the new market map is much
bigger than the placeholder it replaced. That's because three regions that
used to each get their own row now share one row more efficiently. On a
phone-width screen the page did get taller, by close to the map's own
height, because there's no row-sharing to offset it there.

Second: I went back and checked every later piece of work this story's own
planning documents said would depend on it — four upcoming features (the
anomaly-colour encoding, click-to-select, correlation lines between related
companies, and sizing nodes by importance) — and found that none of them
had been told about four decisions this story made that will affect them.
All four are now written into those features' own plans, in plain terms
about what to check before starting.

Everything verifies cleanly: the full automated browser suite (294 tests),
the full test suite (3,720 tests), and every documentation cross-reference
in the repository. One test failed on the first full run and passed
immediately on a clean re-run — traced to a macOS background process
(Spotlight re-indexing) competing for the machine's CPU during an unrelated
step of this task's own measurement work, not a product defect.

This is the story's last task. What remains is the Product Owner's
acceptance of the story as a whole (Gate 2) — the report for that follows
separately.
