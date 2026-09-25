# Task 4.1.4 — The render check retired, and the bundler proof kept

**Status:** **Complete — 2026-09-25. The gallery is gone, the proof is a check, and the landing page is seven honest regions.** The artefact lost **106,821 bytes of JavaScript** — 22%, and Task 1.5.1's _~100 kB_ confirmed almost to the byte. **The comment this whole task was built around was stale**: the render check stopped being the only proof of the bundler path somewhere around Epic 2, and **27 files** carry a value import from `@marketpulse/shared` today. What was never true is that anything _asserted_ it.
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

---

## What was done — 2026-09-25

### The finding: the trap was smaller than the comment, and the comment was the trap

This task existed because the route file said so:

> _"The `@marketpulse/shared` import is still the load-bearing line — it is the
> **only** thing proving the workspace dependency resolves through the bundler
> as well as through `tsc`."_

**Checked rather than inherited: 27 files in this application carry a value
import from that package.** The sentence stopped being true somewhere around
Epic 2 and nobody noticed — because nobody had any reason to look, which is
exactly what a load-bearing comment does to the code beneath it.

> **Only the second half matters, and it was never true.** It was never the
> _only_ proof, and **nothing ever asserted any of it**. A proof that depends
> on somebody keeping a demo alive is a claim, not a mechanism — and this epic
> produced the same finding twice last week, in ADR 0030's missing deploy step
> and in `LIVE-REHEARSAL.md`'s missing completion marking.

### The proof, made mechanical

**`pnpm invariants` gains `the-workspace-package-reaches-the-bundle`** (28 now
hold), asserting that a value that can only have come from
`@marketpulse/shared` is in the built bundle.

**The anchor is the live feed's own sentence** — _Trades reported by the IEX
exchange only — not the full US consolidated tape._ — and it was chosen rather
than reached for:

- **`MARKET_FEED_DESCRIPTIONS` is its one home**, and the invariant beside it,
  `feed-words-in-a-renderer`, is what keeps it one. So the string's presence in
  the bundle can **only** mean shared was bundled.
- **It is a string this product would want to notice losing anyway**: it is the
  sentence that stops `IEX` implying every US exchange, which is `CLAUDE.md`'s
  invariant 6 and `PRODUCT_SPEC.md` §7.1.

> **The first anchor was rejected by the repository's own lint rule, which is a
> small story worth keeping.** The obvious choice was the market's timezone —
> `market-time.ts` is the one module permitted to spell it, so nothing else can
> put it in a bundle. Writing it in the checker **failed `pnpm lint`**: _the
> market's timezone is named in `packages/shared/src/market-time.ts` and
> nowhere else._ The rule that would have made the anchor unique is the rule
> that forbids the checker from naming it. Obfuscating the literal would have
> been gaming a rule whose intent is exactly what it says, and this repository
> disables a lint rule in shipped code **zero** times. So the anchor moved to a
> string with the same uniqueness and no such rule.

**`pnpm break the-workspace-package-leaves-the-bundle`** substitutes the
sentence in `market-provenance.ts` — **in the package, not in a caller**,
because the check has to notice the _package_ leaving — rebuilds, and goes red.
Run and restored byte-identical.

### What the artefact lost

|                |        Before |         After |                       Δ |
| -------------- | ------------: | ------------: | ----------------------: |
| `assets/*.js`  | **482,214 B** | **375,393 B** | **−106,821 B (−22.2%)** |
| `assets/*.css` |      53,042 B |      49,813 B |        −3,229 B (−6.1%) |

**Task 1.5.1 said _about 100 kB_ and it was right to within 7%** — a figure
written five epics ago, never re-measured, and confirmed on the day it was
finally spent. It is reclaimed **on purpose**, which is the only thing that
sentence ever asked for.

### What a reader sees

**Seven regions, all seven honest.** The topology's region is now hatched and
dashed like the rest, at the canvas's reserved-band height — **161 px measured**
at 1440, from the `0.7fr` row Task 4.1.3 shipped for exactly this.

Its sentence changed too, and it had to: it ended _"Until then this is Story
1.4's render check, which is what proves the design language reaches the browser
through the bundler"_ — **the only `filledBy` on the screen describing our
scaffolding rather than the product**, and false the moment this task ran. It
now says what Epic 6 will draw.

### Two repairs made while in the neighbourhood

**The `awaiting` tag renders only while a region is reserved.** Without it, the
day Story 4.3 fills the sector region a forgotten `awaiting="Story 4.3"` sits
beside real sector data, promising work that already landed — and nothing in
this repository could say so, because prose on a screen is exactly the kind of
claim no check reads. **Computed from the content, it cannot disagree with it**,
which is the same argument `reserved` already makes.

**`MarketOverview.module.css` lost 161 of its 302 lines.** The modules, the
table header, the band list, the feed list and the error block were the render
check's, and a class nothing renders is a class the next author has to read
before being sure of that.

### One design decision, taken by looking

**`Sector performance` is now the largest hatched panel on the screen** — 342 px
for one sentence — and the canvas's §03 rejects _deferred at full height_. So is
this the rejected option?

**No, and the difference is a rule this product already measured.** A reserved
region is **the size of the thing it is holding a place for**, not the size of
its sentence, so nothing moves when it fills. The security page's figures block
used to return nothing in four states, taking 90 px with it — and the chart
_and the window control the reader had just pressed_ moved the moment an answer
with bars arrived. It now reserves its room, hidden (`VOLUME-AND-WINDOW.md`
§83). **Reserving room beats reflow**, and a landing page that re-composes
itself weekly as stories land is that defect at the scale of a screen.

**The reserved band is the exception and it is deliberate**: the topology is two
epics away rather than three weeks, so holding half the viewport for it would
trade a real screen today against a hypothetical one later. **The band holds a
place; a near-term region holds a size.** That is now on the canvas and in
`VISUAL-LANGUAGE.md`.

### Gates

`pnpm verify` green with **28 invariants**. `pnpm e2e` green — **166 passed**.
`pnpm links` green. The new break run red and restored. `pnpm probe` at 1440,
read.

## For a stakeholder — a status report, 2026-09-25

### What changed on screen

**The last piece of fake content is gone from the landing page.**

Since the first week of this project, the middle of our front page has held a
demonstration: a small table of four invented companies with invented prices, a
list of colour swatches, and a sample error message. It was there for a real
reason — it proved our styling and our components actually reached the browser —
and it had quietly become the largest thing on the screen a first-time visitor
sees.

**A product whose entire discipline is _never show a number you cannot source_
had invented prices on its front page.** That is now removed, and the page is
seven honestly-labelled panels waiting for real data.

### The interesting part is what we found while removing it

The code carried a warning, in capital letters, that this demonstration was
**the only thing proving a critical piece of our build still worked** — and that
removing it would silently break that proof.

**We checked, instead of believing it. It stopped being true around a year of
work ago**: twenty-seven other parts of the application now rely on the same
connection, so the proof had been redundant for a long time.

> **But the half that mattered was never true at all: nothing ever actually
> _checked_ it.** The "proof" was a demonstration somebody had to remember not
> to delete. That is not a safeguard — it is a note. We have now replaced it
> with an automated check that fails the build if the connection breaks, and we
> deliberately broke it once to confirm the alarm sounds.
>
> This is the third time in a week we have found a documented safeguard that
> was a sentence rather than a mechanism. The rule we wrote down after the
> first two — _when you write that something is guarded, write the check in the
> same change_ — is why we looked.

### And the number was right

A note from five phases ago estimated that removing this demonstration would
strip **about 100 kB** from what every visitor downloads. Measured: **107 kB**,
a **22%** reduction in the page's JavaScript. Every visitor to MarketPulse now
downloads a fifth less code, on the screen they see first.

### Where this leaves us

**The landing page is structurally finished.** Seven panels, each saying what
belongs there and when it arrives — three of them within this phase, weeks
rather than months.

**Next comes the filling**, and each piece is one story with something visible
at the end: four live index figures, eleven sector movements, the breadth of the
market, and the day's biggest movers.
