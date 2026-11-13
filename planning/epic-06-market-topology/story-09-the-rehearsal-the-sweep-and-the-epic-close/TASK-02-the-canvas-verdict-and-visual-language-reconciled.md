# Task 6.9.2 — The canvas verdict, and `VISUAL-LANGUAGE.md` reconciled

**Status:** Complete — 2026-11-12. Five canvas pages verdicted (two corrected and
uploaded, one already-current amendment confirmed, two finished-as-written); the
stale story numbers fixed; the canvas→tokens→components chain holds for all three
of this epic's own additions, two of them deliberately never CSS tokens.
**Story:** [6.9 The Rehearsal, the Sweep, & Epic 6's Close](STORY.md)
**Depends on:** nothing (independent of 6.9.1)

## Objective

The design chain is **canvas → `VISUAL-LANGUAGE.md` → `tokens.css` →
components**, and `CLAUDE.md`'s own rule is that it "only stays true if a
close walks it." Every topology canvas page was drawn **before** anything
was built (Story 6.1's own framing: "Epic 6's visual language, drawn before
anything is built"), and eight stories have since re-derived figures the
canvas only guessed at, refused encodings the canvas may still show as open,
and shipped treatments (the anomaly ring, the correlation stroke ladder, the
filter's de-emphasized landmark) the canvas has never been told about. This
task is where the canvas and the shipped product are reconciled, in the one
direction `CLAUDE.md` always resolves disagreements: the canvas is amended
where it is a design decision still to make; the document is corrected where
the canvas's own figure has been superseded by a real measurement.

## What the user can see when this lands

Nothing — this is the design-system chain's own integrity, not the product.

## Work

- **Fix the two stale story numbers in `The motion vocabulary.dc.html`**,
  standing since 2026-09-21 (this story's own description names the
  defect; find the two references and correct them against the actual
  stories that now own that content).
- **Read every topology-related canvas page** (at minimum `The graph at
rest.dc.html` and `Hover, select, and the way out.dc.html` — list every
  other one found) and verdict each as **finished** (an accurate account of
  what shipped) or **needing a correction**, against the real figures this
  epic actually measured: the elliptical ring's real radii
  (`TOPOLOGY_RING_RADIUS_X/Y`, arc-length-proportional wedges, re-derived
  from the shipped layout rather than the canvas's own stale circular
  figures — already corrected in code and in `TOPOLOGY.md`, but is the
  **canvas** still showing the old figures?); the anomaly ring's real
  weights and the measured band distribution; node size's refusal (does
  the canvas still show an un-refused size candidate?); the correlation
  stroke ladder's real tertile floors; the live-update mark; the filter's
  hide/de-emphasize treatment (new since the canvas was last touched, per
  this story's own "Design work" note that there was no topology page on
  the canvas when this epic began — confirm whether one exists now and
  whether it reflects Story 6.8's shipped treatment).
- **Where the canvas is stale, correct it** (pre-authorised — draw and
  upload as part of this task, report afterwards rather than asking
  first). Where the canvas documents a decision correctly and the written
  record is what's behind, correct the written record instead. Record
  which happened, for which page, in this task's own "What was done."
- **Confirm the full chain holds**: canvas → `VISUAL-LANGUAGE.md` →
  `tokens.css` → components, for every topology-specific token this epic
  introduced (the anomaly ramp, the correlation stroke weights, the
  de-emphasis treatment) — not a re-audit of the whole design system, only
  this epic's own additions to it.

## Done when

1. `The motion vocabulary.dc.html`'s two stale story numbers are corrected.
2. Every topology-related canvas page has a stated verdict (finished /
   corrected, with what changed) in this task's own record.
3. Any canvas correction is uploaded; any document correction is made in
   the same change.
4. The canvas → tokens → components chain is confirmed to hold for every
   token this epic introduced.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-11-12

**The two stale story numbers, found and fixed.** `The mark multiplied by five
hundred.dc.html` (a sibling Epic-3 canvas page, found while surveying for
story-number drift) already documented the exact defect and its fix in its own
§08 — the 2026-09-21 Epic 3 re-numbering remapped every reference in the
repository except the canvas, which no local check can read. `The motion
vocabulary.dc.html` said "the chart is Story 3.7" (§10) and "Stories 3.6 and
3.7 inherit it" (§05); both corrected to **3.9** — the chart's real current
number ("The Live Edge on the Chart & the Two-Feed Ledger" moved 3.7→3.9 in the
same re-numbering). `Story 3.6` itself was untouched, since the universe table
was never renumbered. Uploaded.

**Five topology-related canvas pages verdicted:**

- **`The graph at rest.dc.html` (Story 6.1) — finished, no correction.** Its
  own §08 elliptical-ring recommendation (`R_x ≈ 540 / R_y ≈ 185`) is
  explicitly handed off as "6.2's to measure" rather than asserted as final —
  the page is honest that this is a recommendation for a later story to test,
  and Story 6.2 measured it, found a −53.2-unit cluster overlap, and shipped
  different real figures (`TOPOLOGY_RING_RADIUS_X = 800`,
  `TOPOLOGY_RING_RADIUS_Y = 340`). The page's own framing survives that
  outcome rather than being contradicted by it. Node-size refusal (6.6),
  correlation (6.5) and hover/select (6.4) are each correctly deferred rather
  than guessed at. No action needed.
- **`Hover, select, and the way out.dc.html` (Story 6.4) — corrected and
  uploaded.** Two of its three "What this page does not decide" items were
  stale: open decision 1 (what arrow keys do) reads as still-open on the
  canvas, but was settled at Story 6.4's own Gate 1 as a tree walk, keyed on
  symbol, clamped and wrapped around the ring — shipped exactly as the canvas
  itself asked. Open decision 3 (whether the readout plate is a live region)
  reads "the standing answer... is no live region," but Story 6.4 shipped a
  second, persistent `role="status"` paragraph that speaks on a real
  selection change — precisely the repair the canvas's own §05 had reasoned
  toward and left for "the owner." A dated `AMENDED 2026-11-12 BY TASK 6.9.2`
  block was added stating both outcomes with the real shipped mechanism named
  (confirmed via `CLAUDE.md`'s own Story 6.4 account), and confirming open
  decision 2 (selection stays local to the region) is unchanged.
- **`The motion vocabulary.dc.html` — corrected and uploaded**, per the
  story-number fix above. Not otherwise topology-related (it's Epic 3's own
  page); included because this story's own description named the defect.
- **`Market overview.dc.html` — checked, already current.** Carries its own
  dated amendment from 2026-10-30 (Story 6.1's close) correcting the
  WebGL/liquidity-size claims this page originally made and explicitly
  flagging its own elliptical-ring figure as superseded by Story 6.2 — this
  is the same correction this task would otherwise have had to write, already
  done by the story that found it. No further action.
- **`Selection from the overview.dc.html` — confirmed unrelated.** Story 4.6's
  own page (mover/sector-row click-through), no topology content.

**No topology filter/band canvas page exists**, confirmed by the full
`list_files` listing (33 pages, none named for a sector/band filter). Story
6.8's hide/de-emphasize treatment has never been drawn on the canvas — this is
a real, standing gap rather than something to paper over by inventing a page;
recorded in `docs/GAPS.md` with an owner and condition (below) rather than
addressed here, since drawing a new canvas page is design work beyond this
task's own scope ("verdict and reconcile," not "author new pages").

**The canvas → `VISUAL-LANGUAGE.md` → `tokens.css` → components chain,
confirmed for this epic's own three additions:**

- **The anomaly ramp** — `--anomaly-elevated/-high/-extreme` resolve to
  `--palette-amber-pale/-amber/-amber-deep` in `market.css`
  (`#f0dda4`/`#e2b544`/`#c08a12`), an **exact** hex match to the amber ramp
  `The graph at rest.dc.html` itself declares in its own `:root`. Chain holds.
- **The de-emphasis treatment** (Story 6.8's filtered-out landmark) — reads
  `--ink-secondary` via `TopologyPalette.landmarkMuted`
  (`apps/frontend/src/topology/palette.ts`), an existing token rather than a
  new one, deliberately: its own docblock gives the reasoning (a value step on
  a non-alpha channel, chosen to survive greyscale and to stay distinct from
  `--ink-disabled`'s "no data" meaning). Chain holds — correctly reusing
  rather than inventing.
- **The correlation stroke-weight ladder** (`CORRELATION_EDGE_WIDTH`,
  `apps/frontend/src/topology/edge-strength.ts`) — **deliberately has no CSS
  token**, and that is not a gap: it is a Canvas2D pixel-width constant
  derived from a measured tertile cut (`0.4139`/`0.5496`), the same shape as
  every other geometry constant this epic has kept out of the token system
  (node-size clamps, ring radii, annulus width) because `tokens.css` exists
  for design tokens — colour, spacing, type — not for canvas-drawing geometry
  a renderer computes from data. Confirmed consistent rather than treated as
  a missing sync.

### Gates

No code changed — this task edits only the design canvas (via `DesignSync`)
and this repository's own task record. `pnpm links`, `pnpm format` and
`pnpm verify` are unaffected by a canvas-only change but are run once at this
story's own Task 6.9.4, which verifies the final tree as a whole.

## For a stakeholder — a status report, 2026-11-12

This task reconciled the design canvas — the source of truth for this
product's visual language — against what Epic 6 actually shipped. It found
and fixed two concrete defects: a sibling Epic-3 canvas page that still named
the chart as "Story 3.7" three weeks after that story was renumbered to 3.9
(the fix was already documented on a neighbouring page and just needed
applying), and a Story 6.4 canvas page that still described its own keyboard
model and screen-reader behaviour as open questions when both were settled
and shipped weeks ago. Both are corrected and uploaded to the canvas. Three
other candidate pages checked out as either already correct, already amended
by an earlier story, or unrelated. One real gap was found and left as a named
owner rather than papered over: nobody has ever drawn Story 6.8's sector/band
filter on the design canvas, so the canvas has no record of it at all — that
is now in `docs/GAPS.md`. The three design tokens this epic introduced or
reused were checked against the real code and all three are correctly wired;
one of them (the correlation stroke ladder) was confirmed to deliberately have
no token at all, which is correct rather than an oversight.
