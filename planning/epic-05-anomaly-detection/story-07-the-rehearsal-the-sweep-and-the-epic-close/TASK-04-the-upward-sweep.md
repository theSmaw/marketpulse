# Task 5.7.4 — The upward sweep, run against the list and against a grep

**Status:** Not started
**Story:** [5.7 The Rehearsal, the Sweep, & Epic 5's Close](STORY.md)
**Depends on:** —

## Objective

Epic 5 measured things that falsify claims in governing documents, and nothing
sweeps upward on its own. The story names five candidates; a grep at Gate 1
found **nine more**, and the largest is a false claim about a mechanism sitting
in **shipped code** in three places.

The rule that governs every judgement here: **amend live claims by date, leave
historical records standing.** A story or task file records what was true when
it was written and correcting it destroys the record.

## What the user can see when this lands

**One sentence changes.** `Anomaly history`'s placeholder on
`/securities/:symbol` stops telling readers that Epic 5 fills it.

## Work

**The named candidates.**

- **`PRODUCT_SPEC.md` §9's `Unusual Activity` sketch** (`:508-516`) — unswept
  entirely, no Epic 5 amendment anywhere in §9. Falsified four ways: three rows
  against ten; `91/84/79` **arithmetically unreachable** above the 75 ceiling; a
  bare integer with no band, population or cut; and `[Investigate]`, refused by
  name at Epic 5's Gate 1. Highest-value amendment in the sweep, because §9 is
  what a reader building this region works from. §12's `NVDA — anomaly 91`
  (`:939`) is the same figure in the section Epic 7's flow is written from.
- **`PRODUCT_SPEC.md` §11** — well swept already (five dated amendments). Two
  residues: `:840` says the shipped score is **three scored factors**, which the
  unconditional `no-distribution` arm falsifies (three slots, two scored), and
  the section contradicts its own later amendment's "34,318 **two-factor**
  scores". The quiet-day sentence is Task 5.7.3's.
- **`PROVIDER.md` §3.4** (`:359-362`) — "Epic 5, which is the stronger reader" of
  `split-adjusted`. **Epic 5 is not a reader of it at all** since 2026-10-14.
  §3.5 was amended; §3.4 was not, so the Decision clause and the Consequence
  clause now disagree and the Decision one is reached first (`:287`).
- **`PROVIDER.md` §3.6** (`:421-423`) — a reversal trigger that **has fired**:
  _the first split inside the stored window_. Four exact split factors found on
  the deployed store, named. Also `~86 large-cap equities` is stale (516), and
  the section's bounded-ness argument now **understates** Epic 5 in its favour —
  Epic 5 refuses the figure rather than drawing the cliff.
- **`market-bars.ts`'s `STORED_BAR_ADJUSTMENT` docblock** (`:535-551`) — says
  "the baseline fetches a `split-adjusted` series for its window". Verified:
  **zero provider calls** in `return-baseline.ts` or `compute-baselines.ts`. The
  awkward case — it is itself a dated correction, so it _looks_ historical, but
  it is a present-tense description of shipped code and is wrong. Amend by date;
  the struck clause above stays struck.
- **`UNIVERSE.md` §5's drift table** (`:338`) — the prediction is **confirmed and
  now an understatement**: a reclassification re-points a _stored_ 60-session
  baseline keyed to the benchmark, is invisible to the split guard, and feeds a
  scored ranked surface. Also correct this story's own mis-citation: the
  no-benchmark-for-an-industry-group claim is §1/§7/§16, not §5.

**What the grep found.**

- **`packages/shared/src/market-provenance.ts:316-320`** — the §3.4 sentence, in
  the package both sides of the wire share, immediately above the module's own
  rule that each vocabulary member needs a reader. Third copy of one claim; the
  fourth is `market-bars.ts`.
- **ADR 0029 §6** (`:218-223`) — a reversal trigger fired by its own named
  candidate on 2026-10-14. No Epic 5 amendment.
- **ADR 0017 §4** (`:125-143`) — the 2026-09-09 amendment withdrew the IEX
  argument on the premise that the volume baseline would rest on stored SIP.
  Story 5.5 built it on **`iex` deliberately**, so the withdrawn sentence is
  **correct again for this factor**, now with a figure: 3.54%–15.19% of volume.
  And the trigger itself is **unevaluated with Epic 5 as its only named owner** —
  it needs an explicit verdict in writing or it never fires.
- **ADR 0020** (`:405-407`) — misdescribes the inheritance: the volume baseline
  does **not** read "these rows", and the 93.4% density handed over is off by an
  order of magnitude against 99.990% of buckets refusing.
- **ADR 0041** (`:147-152`) — a future-tense prediction that came exactly true,
  including its stated risk. No Epic 5 amendment.
- **`planning/EPICS.md:199-200`** — Task 5.5.5's correction never arrived.
  Task 5.7.3 owns the rewrite; this task records why the copy diverged.
- **`SecurityExplorer.tsx:687`** — `filledBy="Epic 5 — Anomaly Detection"` on a
  region Epic 5 is closing without filling. **Decided at Gate 1: the placeholder
  names the CONDITION rather than the epic**, and the deferral condition is
  re-worded, because _the first surface that needs a score older than the
  process_ **has arguably already fired** — Task 5.6.7's session arm reads
  `session_composite_scores`, a nightly table. The new wording: _the first
  surface that needs more than one past session's score for one security._
  Blast radius: `SecurityExplorer.test.tsx:637` is a test named "names the epic
  that fills every empty region", and `:634` asserts the region count.
- **`CLAUDE.md`'s Current state** — `/securities/:symbol` draws **five** of
  §8.3's regions, not four; the sentence was written for Story 5.1 on 2026-10-13
  and went false on 2026-10-14. And the listening-pass open item has gained three
  Epic 5 candidates: a ledger column that sums to the figure above it, a band
  stated once for ten rows (a listener on row 7 has no band), and a six-refusal
  region.

## Done when

1. Every hit above is amended by date or explicitly judged a historical record,
   with the judgement recorded.
2. The false provider claim is corrected in **all three** live sites.
3. ADR 0017 §4's trigger carries a written verdict.
4. The placeholder names a condition and the re-worded deferral condition is
   recorded with its alternatives.
5. `pnpm verify` green, including the two tests the placeholder change touches.

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
