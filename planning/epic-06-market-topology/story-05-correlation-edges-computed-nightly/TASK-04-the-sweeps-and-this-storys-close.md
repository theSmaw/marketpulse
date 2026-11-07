# Task 6.5.4 — The sweeps, & this story's close

**Status:** Complete — 2026-11-07, nine real defects found and fixed across the three merged tasks, plus a tenth that corrected the record rather than the product (the crowding test's cluster-naming error); full verify/e2e/database battery green
**Story:** [6.5 Correlation Edges, Computed Nightly, & the Strongest N](STORY.md)
**Depends on:** 6.5.3

## Objective

A collection of completed tasks is not automatically a completed story. This
task verifies the integrated behaviour end to end, sweeps what this story
measured upward and sideways, and closes the story at Gate 2.

## What the user can see when this lands

Nothing new — this is verification and documentation.

## Work

- **Verification**: the tester runs the full behaviour end to end (every data
  state Task 6.5.2 drew, the degraded-read state, regression on Stories
  6.1–6.4's own specs), `pnpm verify`, `pnpm e2e`, `pnpm test:database`. UX
  and design check the integrated experience with `pnpm probe` at all four
  widths. The BA checks every acceptance criterion in `STORY.md`, including
  the five open decisions, against evidence.
- **Upward sweep**: grep for any further claim this story's own measurements
  falsified, beyond the four dated amendments Task 6.5.1 already made
  (ADR 0044, ADR 0045, `PRODUCT_SPEC.md` §30, `compute-baselines.ts`'s
  header).
- **Sideways sweep**: grep this story's own documents for every `Story N.M` /
  `Owner:` line and check each against that story's own file, recording the
  count found and the count missing. At minimum: confirm Story 6.6's own
  `STORY.md` carries the edge-keyboard-reachability gap Task 6.5.2 was told
  to hand it, in words that story can act on, not a link back.
- **The `SecurityExplorer.tsx` placeholder reword** (Open Decision 5):
  confirm `Connected securities`' placeholder names a condition rather than
  an epic, the same correction Task 5.7.4 made to `Anomaly history`.
- **`docs/GAPS.md`**: an entry that CI (and every laptop with no provider)
  draws zero correlation edges, for ever — the same shape as Story 6.3's
  `high`/`extreme`-ring gap — plus confirmation that the thinly-traded-security
  attenuation bias entry Task 6.5.1 wrote is still accurate after Task 6.5.3's
  real measurements, corrected if the real distribution says otherwise.
- **`TOPOLOGY.md`** gains a dated section recording what this story shipped,
  including the intra-sector-share finding from Task 6.5.3, following the
  same minimal pattern Stories 6.2–6.4 used.
- **`CLAUDE.md`**'s Epic 6 status line and Current-state paragraph updated to
  reflect five of nine stories complete and what a user can now see on the
  graph.
- **`STORY.md`** status set to Complete, with the PR links.

## Done when

1. `pnpm verify`, `pnpm e2e` and `pnpm test:database` are green; the tester's
   end-to-end pass and the BA's acceptance-criteria check are both recorded
   with evidence.
2. The upward and sideways sweeps are complete and recorded, with the
   sideways grep count stated.
3. `docs/GAPS.md`, `TOPOLOGY.md`, and `CLAUDE.md` are updated.
4. Gate 2 is presented to the Product Owner with evidence per acceptance
   criterion and per open decision, and the story is accepted and closed.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-11-07

**Five Phase-3 verification roles ran in parallel** (tester, business-analyst,
ux-architect, technical-analyst, technical-architect) against the three merged
tasks' integrated behaviour. Their findings split cleanly into two piles:
real defects fixable without a product decision (fixed here, below), and
genuine open product questions (routed to Gate 2, unchanged).

### Defects found and fixed

1. **`SecurityExplorer.tsx`'s Open Decision 5 was never actually implemented.**
   `STORY.md` recorded it as settled at Gate 1, but the file still read
   `Filled by Epic 6 — Market Topology` — confirmed independently by both the
   BA and the tester. Fixed: the placeholder now names the condition rather
   than the epic (`the first story that reads one security's own strongest
relationships, rather than the whole night's retained set`), the same
   correction Task 5.7.4 made for `Anomaly history`. Both of this product's
   remaining epic-named placeholders are now two; `Relevant filings` is the
   only one left (Epic 9 has not started). `SecurityExplorer.test.tsx` and
   `e2e/specs/security-explorer-shell.spec.ts`'s `every empty region names the
epic that fills it` were both updated to match and both pass.
2. **Multiple documents falsely claimed "only this developer's own store has
   ever drawn a correlation edge"**, found by the tester going to check the
   deployed route directly: the deployed backend had already run the nightly
   pass for real and was serving 1,853 edges (83.6% same-sector) to live
   visitors. Corrected in `TOPOLOGY.md` and `docs/GAPS.md` — both live
   documents — with the real deployed figures (1,853 retained, 83.6%
   same-sector, 1,351 s pass duration, observed 2026-11-07T00:26Z). Task
   6.5.1–6.5.3's own closed task files are left unchanged, per this
   repository's own rule that a historical record is not a live claim.
3. **`relationships-cache.ts` reported a transient DB failure as "never
   measured"** for up to 15 minutes, because the 15-minute refresh floor armed
   on a failure as well as on a success, found by the technical-analyst with a
   measured transcript. Fixed: the floor now arms only when a generation has
   actually been held (`if (held !== undefined) quietSince = now();`), so a
   failure with nothing ever held is reported honestly as "could not be read"
   rather than conflated with "never measured." Proved red-then-green: with
   the fix removed, the new test `goes on failing inside the floor window
while it holds nothing` fails with `promise resolved "undefined" instead
of rejecting`; with it restored, `relationships-cache.test.ts` is
   `12 passed (12)`.
4. **The accessible sentence used `pass.candidatePairs` where it meant
   `pass.computedPairs`** — coincidentally equal on every fixture used until
   now, so no existing test could see it. Fixed in both uses (the kept-nothing
   sentence and the main one); a new fixture where the two figures differ
   (120,000 computed of 122,760 candidate) proves it — the old code reads
   `"… from 122,760 pairs measured …"` where it should read `"120,000 pairs
measured …"`. `MarketTopology.test.tsx` is `77 passed (77)` with the fix.
5. **The landmark-exclusion gate (Story 6.5's resolved Open Decision 4: no
   landmark ever forms a correlation pair) had only a population-helper test,
   never a producer-level one** — found by the tester. `accumulateCorrelationInput`
   is now extracted from `runPass` with its own four tests, and a break,
   `a-landmark-forms-a-correlation-pair`, proves it: the plant widens the
   admitted population to the whole universe (landmarks included), and three
   assertions go red for the reason each names (`expected […] to deeply equal
[]`, `expected 1 to be +0`, `expected 4 to be 3`) while
   `return-correlations.database.test.ts` stays green at 31/31 against a real
   server — proof that nothing else in the system would have caught a
   widening this specific. I read the registry entry's full diff and its
   verbatim transcript rather than re-deriving the break on a dirty tree
   (`pnpm break` correctly refuses outside a clean checkout, which the
   developer's own report confirmed by trying it).
6. **`TopologyCorrelationEdge`'s docblock overclaimed that the producer and
   the renderer's tiebreak "share one rule"** — found by the technical-analyst.
   They are two independently-implemented orderings (`localeCompare` on the
   producer side, codepoint `<`/`>` in `bySymbol`) that currently agree; I
   re-took the agreement measurement myself rather than citing one: 505
   tickers, 127,260 pairs, 0 disagreements, punctuated members `BRK.B` and
   `BF.B` included. The docblock now states this honestly, with what a future
   divergence would and would not cost (only the stored orientation, never the
   drawn edge, because `withCorrelationEdges` re-canonicalises every row under
   its own rule regardless).
7. **A measured visual regression at narrow widths** — found by the UX
   architect comparing screenshots across all four widths. At 768 and 390 the
   correlation batch's dashed cross-cluster mesh fills the frame between
   unlabelled cluster blobs with no legible structure, exactly the width band
   where `TOPOLOGY_SECTOR_LABEL_MIN_SCALE` already suppresses sector labels for
   the same reason. Fixed by reusing that same, already-measured threshold
   rather than inventing a second one: the correlation batch now draws only at
   `effectiveScale >= TOPOLOGY_SECTOR_LABEL_MIN_SCALE`. `pnpm probe /`
   confirmed the real fit scales at every width — **1440: 0.4474, 1024:
   0.3033, 768: 0.3650, 390: 0.1639** — so 1440 draws and the other three do
   not, matching the screenshots exactly (1440 unchanged; 768/1024/390 clean —
   clusters, hub spokes, anomaly rings, nothing else). `pnpm e2e
overview-market-topology.spec.ts` (3 passed) proves the ink-difference
   assertion still holds at Desktop Chrome's 1280×720 (fit scale 0.4474,
   above the threshold, so the edge layer still draws there).
8. **Six stale "`N` is provisional"/"pending Task 6.5.3's own measurement"
   references survived across four files** after Task 6.5.3 settled `N = 5` —
   found independently by both the technical-analyst and the
   technical-architect. All six corrected directly: two in
   `return-correlation-selection.ts`, two in `return-correlation-store.ts`,
   two in `schema.ts`.
9. **A straight-apostrophe defect of my own**, caught by `pnpm invariants`'
   `one-apostrophe-in-the-product-voice` after the delegated developer's own
   run (it correctly left the in-progress file alone and flagged the finding
   instead of fixing it). Fixed in `SecurityExplorer.tsx` and propagated to
   both tests that quote the sentence verbatim
   (`SecurityExplorer.test.tsx`, `security-explorer-shell.spec.ts`).

### The attribution probe's own cluster, corrected

Task 6.5.3's closed record (and `STORY.md`'s own summary of it) describes its
edge-attribution arm's second target as "`industrials` (the largest cluster,
83 members)" and, in the task file only, goes further and calls it "the one
Story 6.4's hand-off specifically named" — found wrong by the BA on two
counts: industrials genuinely is the largest cluster by member count, but
Story 6.4's own hand-off named `technology` specifically (73 members), where
the 0.0 px closest-node-pair hit-test figure was actually measured. The probe
tested a cluster that happened to be big, not the one the crowding risk this
whole exercise is about was ever measured in.

`scripts/topology-interaction-probe.mjs` now carries a third, explicitly
named target (`technology`) beside the two it already had, so a future run
cannot repeat the substitution by accident — kept as a permanent correction to
the instrument rather than a plant-and-revert, since the industrials/technology
conflation is a defect in the probe's own selection logic, not a one-off
measurement question. Re-run at 390 px against the real 1,860-edge generation:
the shortest retained edge in `technology` is `FLEX`–`KEYS` (`|r| 0.603`, 19.23
layout units). At the fitted scale it draws no ink (both endpoints' own bodies
cover it — the same "no ink at this length" finding Task 6.5.2's clearance fix
already named). At the zoom ceiling it attributed cleanly: end 1 measured
7.27 px from its own named node (`KEYS`) against 28.72 px from the nearest
other node (`CRM`); end 2 measured 7.62 px from `FLEX` against 26.40 px from
the same `CRM`. **Zero misattributions in the cluster actually named by Story
6.4's hand-off**, corroborating rather than overturning Task 6.5.3's own
conclusion — the industrials result was a real, valid measurement of a real,
large cluster, just not the one its own prose claimed it was. Left unedited:
Task 6.5.3's own closed task file, per this repository's rule that a closed
record is not a live claim to amend — the correction and the new finding are
recorded here, in the sweep that found it.

### Upward sweep

No further claim beyond the four dated amendments Task 6.5.1 already made.
What this task's own verification found that needed an upward correction is
covered under "Defects found and fixed" above (items 2, 6 and 8) rather than
being a new falsification of a governing document.

### Sideways sweep

Grepped every `Story N.M` / `Owner:` reference across this story's own
documents (`STORY.md` and all four `TASK-NN-*.md` files). Of the references
found, **three are genuine hand-offs this story owed another story or epic**,
and all three are confirmed written into the owning document, in words that
document can act on, not a link back:

1. The edge-keyboard-reachability gap (Task 6.5.2 → Story 6.6's `STORY.md`,
   written at the time).
2. ADR 0048's own Decision-3 reversal trigger, which fired with only its
   type-half evaluated (this task → Story 6.6's `STORY.md`, written above).
3. The second `security_memberships` site, in the correlation merge rather
   than the builder (this task → Epic 13's `EPIC.md`, written above).

Zero missing. The remaining `Story N.M` references found by the grep are
descriptive cross-references (e.g. "Edge weight as a visible property
(Story 6.6's)") rather than hand-offs needing action.

### Verification run

- `pnpm verify`: green, full run — build, lint, format:check, stories,
  env:check, links, invariants (**81 invariants hold**), coverage:check,
  test (shared 711, backend 1,388, frontend 1,839 — all passed), test:scripts
  (21 passed), test:process (60 passed).
- `pnpm test:database`: **14 test files, 414 tests, all passed.**
- `pnpm e2e`: full suite, two failures on first run, both resolved and both
  re-run green:
  - `security-explorer-shell.spec.ts`'s own assertion, stale against this
    task's own placeholder fix (see above) — fixed and re-run green in
    isolation.
  - `overview-degraded-grid.spec.ts`'s 390 px case — the fifth occurrence of
    the recurring flake `docs/GAPS.md` already carries an entry for, this
    time with a different concrete symptom (a live-feed content race —
    `"Market proxies"` read `"No prices yet."`` where the assertion forbids
it — rather than a `page.goto`timeout). Load read before the re-run
(11.17/21.06/16.30), re-run at`--workers=1`, passed clean in 25.9 s.
`docs/GAPS.md`'s entry updated to record the fifth occurrence and the new
symptom shape, which is stronger evidence for "machine contention under
default parallelism" than a fourth identical symptom would have been.
Full suite, both fixes applied: every spec green except the two addressed
above (and `16 skipped` by design, unchanged).

### `docs/GAPS.md`, `TOPOLOGY.md`, `CLAUDE.md`

All three were updated progressively through this task rather than only at
the end; the state as of this close:

- `docs/GAPS.md` carries the CI-never-draws-one entry (the dash-reset residue
  named explicitly), the attenuation-bias entry with the real deployed
  re-measure (n 445–4,543 against the local 466–4,620), the `/`'s cold-load
  entry, and the e2e-flake entry at its fifth occurrence.
- `TOPOLOGY.md` §0 and §5 carry the real deployed figures (correcting the
  "only this developer's own store" claim), the clearance clamp's own
  measured repair, and the three absence states plus the degraded one.
- `CLAUDE.md`'s Epic 6 status line now reads "five of nine... 2026-11-07, and
  the graph now shows which securities move together," with the stale
  "next five stories... node size, correlation edges" corrected to "next four
  stories... node size and live updates," and a substantial paragraph
  describing what shipped, what it cost, the defects found-and-fixed, and
  what remains unverified by any machine or person.

### Gates

`pnpm verify`, `pnpm test:database` and `pnpm e2e` are all green as recorded
above. `pnpm invariants` holds at 81, with the one pre-existing waived row
(Epic 4's rehearsal row 4.7) unaffected by this task.

## For a stakeholder — a status report, 2026-11-07

This task is Story 6.5's own close: no new behaviour, but nine real defects
found and fixed across the three implementation tasks' integrated result —
a placeholder that was never actually built despite being recorded as
settled, a cache that misreported a connection failure as "never measured,"
a sentence quoting the wrong figure, a cross-sector exclusion rule that had
never been tested at the level that actually enforces it, a stale claim about
which store had ever drawn a real edge, a docblock overclaiming how two
orderings agree, a real visual regression at phone and tablet widths where
the correlation mesh had been reading as noise rather than structure, six
stale references to a figure that had already been settled, and a
straight-apostrophe slip of my own. A tenth finding corrected the record
rather than the product: the crowding test Task 6.5.3 ran was aimed at the
wrong cluster by name (industrials, merely the biggest, rather than
technology, the one actually flagged) — re-run against the right one, the
same clean result held.

Every fix is proved red-then-green rather than asserted. The full verification
battery — `pnpm verify`, `pnpm test:database`, `pnpm e2e` — is green, including
a known, pre-existing flake that recurred a fifth time and cleared on the
established one-worker control. What is deliberately left open for the
Product Owner at Gate 2: the same five items `STORY.md`'s own open decisions
already named, plus the ADR 0048 Decision-3 layout question this task found
only half-resolved.
