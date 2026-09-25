# Task 4.1.4 — The render check retired, and the bundler proof kept

**Status:** Not started
**Story:** [4.1 The Decisions & the Overview Shell](STORY.md)
**Depends on:** 4.1.3

## Objective

**Story 1.4's render check sits in the topology region, and this epic is the
first thing with a reason to remove it — but it is load-bearing, and the load
it bears is invisible.**

The route file says so in its own comments:

> _"The `@marketpulse/shared` import is still the load-bearing line — it is the
> only thing proving the workspace dependency resolves through the bundler as
> well as through `tsc`, and the two use entirely different resolvers."_

And Task 1.5.1 recorded the number: routing the check out of the graph would
**quietly remove about 100 kB** from the artefact, _"one nobody should be able
to reclaim by accident."_

> **So this is a deletion with a trap in it, which is why it is its own task.**
> Delete the check and the bundler proof goes with it — silently, with
> `pnpm verify` green, because `tsc` resolves the workspace package perfectly
> well through a completely different resolver. The failure appears the day
> somebody changes a `package.json` and nothing notices.

## What the user can see when this lands

**The topology region stops being a demo and starts being an honest
deferral** — it names Epic 6 and says what will be drawn there, exactly like
the other regions.

The screen gets **quieter and more truthful** in the same change: a landing
page whose largest region is a component gallery is a landing page that looks
like a scaffold, which §5.6 names as the thing this product must never look
like.

## Work

- The render check removed from the route
- **The bundler proof replaced rather than dropped**, and the replacement is
  mechanical: a check that fails if the frontend bundle stops containing
  something that could only have come through `@marketpulse/shared`. The
  existing idiom is `pnpm invariants` reading `apps/frontend/dist/` — one
  invariant already does
- **A `pnpm break` entry for it**, and run: a check that has never gone red has
  never been tested
- The ~100 kB delta measured either side and recorded, because a number that
  moves and is not written down is indistinguishable from one that was
  mis-recorded
- Story 1.4's and Task 1.5.1's records left standing — they are history, not
  live claims

## Done when

1. The route renders regions and no component gallery
2. The bundler proof is a check rather than a component, break-verified
3. The artefact size either side is recorded with its date

## Amended by Task 4.1.1 — 2026-09-25: the scope narrows by one and gains a dependency

**Two things move:**

- **The `Placeholder` paragraph above the regions is Task 4.1.3's, not this
  task's.** Task 4.1.1 found a fifth surface saying what the four `filledBy`
  sentences already say; it becomes false the moment a region is real, which is
  4.1.3's change rather than this one.
- **This task now depends on Task 4.1.2 having answered what the empty
  dominant region looks like.** Removing the check leaves §9's visual centre of
  gravity empty for two epics, and `PRODUCT_SPEC.md` §5.6 forbids the obvious
  result — _a scaffold with data in it_. **Do not ship the deletion before the
  canvas has answered it**; the repair is a layout decision, not a CSS tweak
  made at the end of this task.

**What is unchanged is the trap, and Task 4.1.1 confirmed it rather than
assuming it**: `ANOMALY_BANDS`, `FEED_STATUSES`, `toTicker` and `AnomalyBand`
are imported from `@marketpulse/shared` and used **only** by the render check.
Deleting the check deletes the import, and with it the one proof that the
workspace dependency resolves through the **bundler** as well as through `tsc`.

## Amended by Task 4.1.2 — 2026-09-25: this task lands the interim layout, and what it removes is fixture data rather than content

**The canvas answered what replaces the gallery**, and it is not an empty box:

**`Market overview.dc.html` §01 is the interim composition** — the primary
column holds the **reserved topology band** at the top and this epic's own
regions beneath it, and the topology takes the column back when Epic 6 arrives
(§02, with the trigger). **This task ships that composition**, not just the
deletion: remove the gallery, restructure the primary column, and the screen it
leaves is the one on the canvas.

### The sequencing worry, resolved by looking at what is actually there

The concern was that removing the gallery leaves the landing page visibly
emptier until Story 4.2 fills a region — and that a screen of honest
placeholders is worse for a stakeholder than a screen that looks busy.

**It is not, and the reason is what the gallery contains.** Its rows are
**hard-coded fixture data** — four invented securities with invented prices,
sitting on the landing page of a product whose entire discipline is that a
claim about data requires data.

> **A landing page showing invented prices is not an argument for keeping it —
> it is §5.6's _scaffold with data in it_, literally.** Removing it loses a
> component demo, not content, and what replaces it says true things about a
> screen that is being built. **That is forward progress even though the pixel
> count goes down.**

**So the order stands**, and the earlier consideration of moving this task
behind Story 4.2 is settled rather than left open.

## Amended by Task 4.1.3 — 2026-09-25: the interim layout is already built, and the deferred state arrives for free

**Two of the three things this task was carrying are done.**

- **The interim layout shipped with the regions.** The grid names its areas and
  gives the topology the short row at the top of the primary column — the
  canvas's reserved band. This task does not restructure anything.
- **The reserved treatment is keyed on `children === undefined`.** So the moment
  the render check comes out of the topology region, **the region draws itself
  hatched and dashed with no further change** — the hatch cannot disagree with
  the content, because it is computed from it.

**What is left is therefore narrower and sharper:**

1. **Remove the render check**, and with it the `@marketpulse/shared` import —
   confirmed by Task 4.1.1 to be used by nothing else in the file.
2. **Replace the bundler proof with a check**, break-verified. This is the trap
   and it is unchanged.
3. **Rewrite the topology region's `filledBy`.** It currently ends _"Until then
   this is Story 1.4's render check, which is what proves the design language
   reaches the browser through the bundler"_ — **a sentence that becomes false in
   this task's own diff**, and the only `filledBy` on the screen that describes
   our scaffolding rather than the product.
4. **Look at the row.** The topology's row is `0.7fr` of an `82vh` grid, sized
   for a band holding a heading and a sentence. Confirm with `pnpm probe` rather
   than by reading the CSS.

### And one small repair this task should make while it is in `Region`

**Nothing stops an `awaiting` tag outliving the work it names.** When Story 4.3
fills the sector region, a forgotten `awaiting="Story 4.3"` leaves a tag on
screen beside real sector data — un-hatched, because `reserved` is computed, but
still promising work that has already landed.

**The fix is one line: render the tag only when the region is reserved.** The
same argument as `reserved` itself — a tag that cannot disagree with the content
is better than a tag somebody has to remember to remove — and it costs nothing,
because a filled region has no use for it.
