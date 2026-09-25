# Task 4.1.3 — The two regions that were waiting for a shape

**Status:** **Complete — 2026-09-25. The landing page has seven regions, and it is the first thing this epic put on a screen.** Three added in the canvas's positions, the summary paragraph removed, and the deferred state shipped as a **component state rather than an absence** — hatched ground, dashed hairline, and a tag carrying whose work fills it. **Two things came out of building it**: the grid's four auto-placed regions do not survive seven, and `main` was already providing the spacing two margins were repeating.
**Story:** [4.1 The Decisions & the Overview Shell](STORY.md)
**Depends on:** 4.1.2

## Objective

**The first visible change this epic makes**, and it is one Task 1.5.4 wrote
down as this epic's to make:

> _"§8.1 lists two contents §9's sketch does not place — the index/ETF summary
> and sector performance. They are deliberately not given regions of their own:
> where they belong is a question about their shape, and Epic 4 is the first
> thing that will know it. Adding two more empty boxes now would be guessing."_

Task 4.1.2 answered the shape question on the canvas. **This task builds the
two regions**, deferred honestly, in the grid the canvas drew.

## What the user can see when this lands

**The landing page grows two regions** — one for the index and ETF summary, one
for sector performance — each naming what fills it and when, in the same voice
the three existing deferrals use.

**It is a small change and it is the first real one**: the screen stops being
§9's sketch minus two things and becomes §9's sketch.

## Work

- Two `Region`s added in the positions the canvas decided, at all four widths
- Their `filledBy` sentences written to the existing idiom — **naming the story
  that fills them**, which for both is this epic's own 4.2 and 4.3
- The grid's spans **restated at every breakpoint that narrows it**, because an
  item wider than its explicit grid grows implicit columns and looks identical
  in every test below a browser
- `pnpm probe` at 1440, 1024, 768 and 390, read rather than filed

## Done when

1. Two regions render in the canvas's positions at four widths
2. Neither sentence points at a control that does not exist — the repair this
   product already made once, when a defaulted search note invited a reader to
   use a control that had just said it was unavailable
3. `pnpm probe`'s resolved grid tracks match what the canvas drew

## Amended by Task 4.1.1 — 2026-09-25: this task also removes the paragraph that says it twice

**There is a fifth surface above the four regions**, and nothing owned it: a
`Placeholder` whose prose describes the whole screen — _"index and ETF
summaries, an unusual activity feed, market breadth, sector performance and the
topology. Epic 4 builds it on live data, Epic 5 scores the anomalies in it and
Epic 6 draws the topology."_

**That is the same claim the four `filledBy` sentences make, in one more
place.** Today it is harmless, because everything below it is a deferral and
the paragraph summarises four deferrals. **The moment this task adds two real
regions it becomes a paragraph describing a screen that no longer matches it**
— and one fact with two homes is the defect this product has shipped twice, in
a chrome cell and in a ledger, both inheriting a word that had stopped being
true.

**So the paragraph goes in this change**, not in 4.1.4's. What survives it is
the `Region`s' own sentences, which are per-region, specific, and already the
established idiom.

## Amended by Task 4.1.2 — 2026-09-25: three regions, not two, and two of them defer to a story rather than to an epic

**Drawing the screen found a third region with no home in §9's sketch: the
movers.** Epic 4's scope lists top gainers and losers; §9 does not place them,
and Task 1.5.4's deferral named only the index summary and sector performance.

> **They could have gone in the unusual-activity region's place** — it is empty,
> and a ranked list of big movers looks like a ranked list of unusual ones.
> **Story 4.5 already names that as the trap**: _unusual is not largest_. On the
> one screen whose job is explaining what this product does, a mover list
> standing in for an anomaly feed teaches a reader the wrong thing about it.

**So this task adds three regions**, in the positions
`Market overview.dc.html` §01 places them:

| Region                                      | Where                                                | Filled by     |
| ------------------------------------------- | ---------------------------------------------------- | ------------- |
| **Market summary** — the four index proxies | a full-width strip at the very top, `span 12`        | **Story 4.2** |
| **Sector performance**                      | the primary column, under the reserved topology band | **Story 4.3** |
| **Movers**                                  | the primary column, below sectors                    | **Story 4.5** |

### And a new kind of deferral sentence

**Every `filledBy` sentence in the tree today names an EPIC.** Three of these
name a **story in this epic**, which is a different promise — weeks rather than
months — and the reader should be able to tell.

**Do not invent a second vocabulary for it.** The breadth region has named Epic
4 since Task 1.5.4 and is the precedent: the sentence describes **what will be
there**, and the tag says **whose**. A near-term deferral is the same component
with a nearer name in the tag.

---

## What was done — 2026-09-25

### Seven regions, and what a reader sees

`/` now carries, at every width: **Market summary**, **Market topology**,
**Sector performance**, **Movers**, **Unusual activity**, **Market breadth** and
**Current investigations** — each a named `region` landmark, each saying what
fills it and **whose** work that is.

Three are new (**summary**, **sectors**, **movers**), and two of the three name
**a story in this epic** rather than an epic — which is the distinction Task
4.1.2 drew on the canvas and this task shipped.

### The deferred region is a state now, not an absence

`Panel` gained **`reserved`** and `Region` sets it from `children === undefined`.

> **Keyed on having no children rather than on a prop of its own**, because the
> two can never disagree that way: a region holding content and drawn as
> reserved — or the reverse — is a state nobody can produce.

What it draws is `Market overview.dc.html` §03: a **hatched ground** built from
the two ground tokens (the sunken surface showing through the raised one at
45°), a **dashed hairline** including the header's `--rule-strong`, and **no
shadow** — the elevation says _this is above the page_, and a panel holding a
place is not.

**No new colour, no new token.** The standing accessibility exception did not
fire a fifth time because nothing new needed a value.

### The tag reuses a slot that already existed

`Region` gained **`awaiting`**, and it renders into `Panel`'s **`meta`** —
already documented as _anything that qualifies the panel rather than being its
content_. **Reusing that slot rather than adding a second header slot is why
this treatment cost one prop.**

### Two findings from building it

**1. Task 1.5.4's own comment stopped being true, and it said so in advance.**

> _"A region called `rightColumn` is a layout that cannot be rearranged; this
> one is rearranged by editing two lines here."_

That was right for **four** regions auto-placed into two columns. **It does not
survive seven.** The wide layout wants topology-sectors-movers in one column;
the narrow one wants everything with content before everything without — and
**no single source order satisfies both**. Auto-placement can express one;
named areas express both, at the cost of a class per region.

**The regions still know nothing about where they sit**: the route names the
areas and hands each one a class. The comment is replaced with the argument
rather than deleted, because it was correct when it was written.

**2. Two margins were a second opinion about spacing `main` already owned.**

`App`'s `main` is a flex column with `gap: var(--space-40)`. The strip and the
grid each carried `margin-top: var(--space-24)` on top of it, so the heading sat
**64 px** above the strip and the strip **64 px** above the grid — which reads
as three unrelated blocks rather than one screen.

> **Found by looking at `pnpm probe`'s boxes, and findable by nothing else.**
> jsdom computes no layout, the page raised no error, and nothing was _wrong_ —
> it was loose. This repository's record says the same thing five times over and
> it was true again.

### The grid, restated at every width

| Width | Tracks, measured          | Areas                                     |
| ----- | ------------------------- | ----------------------------------------- |
| 1440  | **1026 / 342** — §9's 3:1 | two columns, three rows                   |
| 1024  | **595 / 357** — 5:3       | the second column stops being a sidebar   |
| 768   | **720**                   | one column, **breadth first**             |
| 390   | **342**                   | one column, and the height goes to `auto` |

**Every breakpoint that narrows the grid restates its areas**, because a
`span N` item wider than the explicit grid is not clamped — it grows implicit
columns, and it renders identically in every test below a real browser.

**At 768 and below the deferred regions sink and breadth rises**, which is
§04's decision: below two columns, reading order is the only hierarchy left, so
a reader meets everything with content before anything without.

### The canvas gained the near-term deferral

`Market overview.dc.html` §03 now draws **the two distances side by side** —
`EPIC 5` against `STORY 4.3` — with the decision stated: **the tag is the only
difference, deliberately.** A brighter ground, a countdown or a _coming soon_
would make the near-term deferral louder than the region beside it that already
has content, which is the wrong hierarchy on a screen whose subject is the
market rather than our schedule.

`Region.stories.tsx` carries both as stories, so the pair is reviewable side by
side in the workshop as well as on the canvas.

### What is still on screen that should not be

**The topology region is the one region not drawn reserved**, because it still
holds Story 1.4's render check — four invented securities with invented prices.
That is **Task 4.1.4's**, with its trap intact: the `@marketpulse/shared` import
in that file is the only proof the workspace resolves through the **bundler**.

### Gates

`pnpm verify` green. `pnpm e2e` green — **166 passed**, including
`landing-route.spec.ts`, whose region list went from four to seven and whose
count assertion is what would catch an eighth appearing unnoticed.
`pnpm probe` at four widths, read rather than filed.

> **One honest note about the first `pnpm verify`**: it went red on
> `market-gateway.process.test.ts`, and the cause was **a running `pnpm dev`**
> rather than this change — the process suite spawns `dist/index.js` and binds
> ports. Re-run alone: 16 passed. Re-run with the pair stopped: the whole of
> `verify` green. Recorded rather than quietly re-run, which is this
> repository's rule.

## For a stakeholder — a status report, 2026-09-25

### What changed on screen

**The landing page now has all seven of its panels**, for the first time.

Until today it had four, and two of the product's headline features — the market
summary and sector performance — had no place on the screen at all. A note in
the code from months ago explained why: _where they belong is a question about
their shape, and this phase is the first thing that will know it._ This phase
knew, and drawing the screen last week turned up a seventh panel nobody had
listed: **biggest movers**.

### Empty, but not blank

Five of the seven panels are waiting for work that is still to come. **They no
longer look like holes.**

Each one now has a lightly striped background, a dashed edge, and a small tag
saying who fills it — `Story 4.3` for something a few weeks away, `Epic 6` for
something months away. A reader can tell at a glance **which parts of this
screen are coming soon and which are coming later**, which is a question our own
design records had never answered because the panels had been implemented
without ever being designed.

> **An empty panel and a broken panel must never look alike.** That is the whole
> reason for the stripes: when something genuinely fails, this product shows a
> labelled block with a sentence in it, and a plain empty box sitting beside one
> is exactly what teaches people to ignore error messages.

### Two things we found by building it

**A note in the code predicted its own expiry, and was right.** The original
layout deliberately avoided naming where each panel sits, so the arrangement
could be changed by editing two lines. That works for four panels. It does not
work for seven, because the wide layout and the phone layout want genuinely
different orders — so the panels are now named, and the note has been replaced
with the reasoning rather than deleted.

**And the page had been quietly loose for months.** Two pieces of spacing were
each adding a gap the page layout already provided, so the screen read as three
unrelated blocks. It was not broken, no test could see it, and it was obvious
the moment somebody looked at a photograph of the page. We have a tool for
exactly that, and using it is a habit this project has written down five times.

### Where this leaves us

**The next task removes the last piece of demo content** — a table of invented
prices sitting in the middle of the landing page since the very first week —
and after that every panel on this screen is either real or honestly reserved.

Then the filling starts: four live index figures, eleven sectors, the breadth
of the market, and the biggest movers. **Each is one story, and each puts
something on this page a visitor can read.**
