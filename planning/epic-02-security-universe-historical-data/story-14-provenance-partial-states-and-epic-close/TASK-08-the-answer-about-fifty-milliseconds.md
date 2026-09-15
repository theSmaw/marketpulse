# Task 2.14.8 — The answer this epic owes about §28, and it is the table's

**Status:** Complete — finished 2026-09-15
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** 2.14.4, 2.14.5, 2.14.7

> **Amended 2026-09-14 by Task 2.14.1.** The dependency read _"which may have
> added markup to the table in question"_. [`PROVENANCE.md`](PROVENANCE.md) §5
> settled the classification onto `SourceNote` and explicitly **not** onto the
> universe table, so 2.14.4 adds nothing per-row and the re-measure below is a
> **confirmation** rather than a reading of new markup. Still take it — a figure
> cited is a figure nobody checked — but expect it unchanged, and if it has moved,
> something other than this story moved it.

> **Amended 2026-09-14 by Task 2.14.3, narrowing the last sentence above.** This
> story _does_ add markup to the security page — `SourceNote` is a `dl` of two
> terms at the foot of the region group — so "something other than this story
> moved it" is now too strong. It is a handful of elements against a 518-row
> table's thousands, so the expectation is still _unchanged_; what the record
> should say, if the figure has moved, is **by how much and against which
> markup**, because the whole argument of this task is that the table is the
> cause. A note of a few elements is the cheapest possible control on that
> claim.

> **Amended 2026-09-14 by Task 2.14.4, and it adds a second control rather than
> a second worry.** Two corrections to the paragraph above, both small and both
> the kind that quietly stops being true:
>
> - **The note is a `dl` of three terms now, not two** — `Source`/`Sources` where
>   a feed is worth naming, `Prices`, and `Classification`. Still a handful of
>   elements; the expectation is unchanged for the same reason.
> - **It also added the page's first per-render read of the whole universe
>   array.** `toClassification` runs one linear `.some()` over the 518 securities
>   to decide whether this page has a security to make the claim about. That is
>   **one scan of 518, not 518 scans** — it is nowhere near the class of cost this
>   task is about, and it is deliberately not a `Map`, because the page builds two
>   of those already and a third for a single membership test would be a map
>   constructed per render to avoid a scan per render. It is named here because
>   this task's entire argument is _the table is the cause_, and an unmentioned
>   new read of the same array is exactly what makes such an argument look
>   convenient later. If the figure has moved, this is the second thing to rule
>   out and it is cheap to rule out: it is the same work whether the note draws
>   one clause or three.

> **Amended 2026-09-15 by Task 2.14.5, which is now a dependency.** The three
> amendments above each record what the preceding task added to the page, so that
> _the table is the cause_ stays an argument with controls under it rather than a
> convenient conclusion. This task added:
>
> - **Four elements per panel, hidden.** The rail's reservation became two hidden
>   cells instead of one — a `div`, a `p`, a marker and a span — laid out and
>   `visibility: hidden`, so they cost layout and no paint. Against a 518-row
>   table's thousands this is noise, and it is named for the same reason the
>   note's three terms were.
> - **No new read of the universe array**, and nothing per row anywhere. The
>   coverage sentence is a pure function of the series the page already holds.
>
> So the expectation is 2.13.9's figure unchanged, for the third time — and the
> value of taking it remains that an unchanged figure you measured and an
> unchanged figure you assumed look identical in a document and nowhere else.
> **The dependency moved because the re-measure should be taken against the tree
> that ships**, and 2.14.5 is the last task before this one that adds markup to
> the security page.

> **Amended 2026-09-15 by Task 2.14.6, which is the fourth control on the same
> argument — and this one is a new per-render read, so it is the first of these
> amendments that is not simply _nothing to see_.**
>
> - **A second linear `.some()` over the 518-security array**, in
>   `storedHistoryFor` (`chart-vacancy.ts`), deciding which of the two empty
>   answers a plot is drawing. It is one scan of 518 rather than 518 scans — the
>   same class as `toClassification`'s and nowhere near what this task is about.
> - **But it does not run on the store this figure was taken against.** The scan
>   happens only when the symbol is **absent** from the coverage map, so a
>   populated store pays `Map.has` and stops. Where it does run is every page
>   `store:bare` and CI render, which is the one store where the universe table
>   is also at its cheapest — 518 rows with no closes and no depth. Whichever way
>   the figure is taken, name the store beside it.
> - **The page now performs two scans of one array for one symbol** —
>   `toClassification`'s and this one — and they are deliberately not merged.
>   Merging them would couple the source note to the chart's vacancy for a
>   membership test; a `Map` built per render to avoid a scan per render is the
>   trade 2.14.4 already declined. Recorded rather than done: **if this task's
>   measurement has moved, this is the third thing to rule out**, and ruling it
>   out is cheap because the work is identical whether the plot draws a sentence
>   or a line.

> **Amended 2026-09-15 by Task 2.14.7 — the fifth control on the same argument,
> and the dependency moved with it for the reason 2.14.5's did: the re-measure
> should be taken against the tree that ships, and 2.14.7 is now the last task
> before this one that touches the security page.**
>
> This one is a different shape from the four above. Two of the three things it
> added are **not on the path this figure is about at all**, and the third is the
> first thing this story has added that is a _layout algorithm_ rather than
> elements:
>
> - **`VolumeDeferral` — a `p`, a marker and a span — renders only under
>   `refused` or `failed`.** A cold load of `/securities/:symbol` against a
>   working backend never draws it, so it is outside the measurement rather than
>   small within it. Named anyway, because "it cannot be on the path" is a claim
>   worth writing down once rather than re-deriving.
> - **`text-wrap: balance` on the vacancy headline, and this is the one to look
>   at.** It **is** on the cold-load path of every zero-bar page — which is every
>   page CI and `store:bare` render, two of them per screen — and this task's
>   figure is **40 ms of the engine's own style, layout and paint**. Balance asks
>   the engine to try several line-break passes rather than one. On two headlines
>   of six words each that is noise against a 10,331-node document, and the
>   engines cap balancing at a small line count for exactly this reason. But it
>   is the first property this story has added that makes the _engine_ do more
>   work rather than giving it more nodes, so if the figure has moved, **this is
>   the first thing to rule out** and it is ruled out by deleting one declaration.
> - **No new read of the universe array, and nothing per row anywhere.** The two
>   scans 2.14.4 and 2.14.6 recorded are still two.
>
> So the expectation is 2.13.9's figure unchanged for the **fourth** time. The
> value of taking it is unchanged too, and by now it is the whole point of these
> five amendments: an unchanged figure you measured and an unchanged figure you
> assumed look identical in a document and nowhere else.

## Objective

Discharge the one published-target breach this epic ships with, by **deciding**
rather than by measuring again.

`PRODUCT_SPEC.md` §28 states _no routine main-thread task over 50 ms_. On every
cold load of `/securities` and `/securities/:symbol` there is one task of
**50–66 ms**, and it is the **518-row tracked universe**, not the chart. Proved
from both ends: present on `/securities` where no chart exists, absent with a
20-row universe while a **9,750-bar** chart is still drawn, with 40 of those
milliseconds in the engine's own style, layout and paint over a 10,331-node
document.

Task 2.13.9 re-measured it with a second plot and a window control on the page
and it is unchanged — and added an instrument the first run did not have: the
largest gap between consecutive `requestAnimationFrame` callbacks, continuous
where `longtask` is not. It says something the original could not. **Every
20-row page sits at 32–34 ms, which is two frames and is the floor; every
518-row page sits at 67–84 ms.** This is not a page marginally over a line.

The record is `SEARCH-AND-SELECTION.md` §10 (the measurement, the attribution and
three candidate repairs) and `CHARTING.md` §16.1 (why it was raised rather than
absorbed).

## What the user can see when this lands

**Either a faster first paint on the two most-visited routes, or nothing at
all** — depending on which of the three dispositions is taken. If it is a
deferral, say "nothing visible" plainly and name Epic 14.

## Work

Take **one** of three dispositions, in writing, with the argument:

1. **Repair it.** One of §10's three candidates, followed by a re-measure using
   2.13.9's instrument — both `longtask` and the rAF gap, ten cold loads, at 518
   rows and at 20 — so the before and after are comparable rather than
   differently taken.
2. **Accept the breach.** Defensible today and getting less so: one task, just
   over the line, on a load rather than during interaction. If this is the
   choice, it is recorded in `docs/GAPS.md` with the figures, the argument, and
   the existing trigger — **the first time a second surface renders per-row
   markup at universe scale** — and `PRODUCT_SPEC.md` §28 gains a dated
   amendment beside it, because a published target the product knowingly misses
   and does not annotate is the exact failure `CLAUDE.md` describes as a stated
   invariant quietly stopping being true.
3. **Hand it to Epic 14 by name.** The performance epic; a virtualised or
   paginated 518-row table is precisely its kind of work. This is materially
   different from acceptance: a named owner and a live trigger, written into
   `planning/epic-14-performance-scale-validation/EPIC.md` so it arrives with
   that epic rather than being rediscovered.

Whichever is chosen:

- **Re-measure once with the current tree** before deciding. ~~Task 2.14.4 may
  have added a per-row element to that table~~ — it did not, by decision; so the
  expected result is 2.13.9's figure unchanged, and the value of taking it is that
  an unchanged figure you measured and an unchanged figure you assumed look
  identical in a document and nowhere else.
- **Falsification travels upward.** If the number has moved, what it invalidates
  is a premise in `SEARCH-AND-SELECTION.md`, in `CHARTING.md` §16.1 and possibly
  in §28 — grep for the claim, correct the live sites, leave the historical
  records standing, and give any ADR a dated amendment rather than a rewrite.
- **A figure that has moved looks exactly like a figure that was mis-recorded.**
  If it disagrees with 2.13.9's, only rebuilding that commit tells them apart —
  and that is worth doing before publishing a different number.

## Done when

- One disposition is taken, argued, and written where it will be read: `GAPS.md`
  for an acceptance, Epic 14's `EPIC.md` for a hand-off, the measurement record
  for a repair.
- The current figure is in the record, taken with both instruments, and it is
  dated.
- No document in the tree now states §28 as met on those two routes without a
  qualifier.
- `pnpm verify` passes.

## Notes

The failure mode here is a fourth disposition nobody chooses on purpose:
mentioning it in the close, not writing it anywhere durable, and shipping. Three
of the four options are fine. That one is not.

---

## What was done, 2026-09-15

**The disposition is the third one: the repair is handed to Epic 14 by name,
with the existing trigger outranking it.** The re-measure was taken first,
because a figure cited is a figure nobody checked.

### The re-measure, and the control under it

2.13.9's method restated rather than re-derived: Playwright 1.62.1's Chromium
(the version `pnpm e2e` pins) at 1440×900, against the **built** artefact under
`vite preview`, every backend response fulfilled from a recorded body, ten cold
loads per row in a fresh context, `PerformanceObserver` on `longtask` plus the
largest gap between consecutive `requestAnimationFrame` callbacks.

**The instrument was checked before anything was measured with it**, because
§47.1's warning invalidates rather than inconveniences this measurement: every
row read `document.visibilityState === "visible"` with 84–93 rAF callbacks in
1,500 ms.

The full table is in
[`SEARCH-AND-SELECTION.md` §10](../story-11-security-search-and-selection/SEARCH-AND-SELECTION.md).
The short version:

- **Unchanged, for the third time.** 2–5 tasks of 50–76 ms on every 518-row
  page; **none** on any 20-row page while both plots are still drawn. Frame gap
  66–83 ms at 518 rows against 20–33 ms at twenty — the table costs roughly
  **35–50 ms of frame** a small universe does not spend.
- **The five amendments above each predicted "unchanged" and each was right.**
  Story 2.14 is **−1 node** on `/securities`, **−2** on the 5D page and **+17**
  on the zero-bar page, against a document of 10,385.
- **The zero-bar page was added as a row, and it is the one that rules Story 2.14
  out.** It is what CI and `store:bare` render, it is where 2.14.6's second
  `.some()` scan actually runs, and it is where 2.14.7's `text-wrap: balance`
  lives. It reads the same 66.6 ms frame gap as every other 518-row row and
  nothing at all at twenty rows. The three things the amendments asked to be
  ruled out are ruled out by that single row.

**The tail is lower than 2.13.9 published — 76 ms here against 107 and 149 —
and that was separated from the product rather than argued away.** `CLAUDE.md`
says a figure that has moved looks exactly like a figure that was mis-recorded
and only rebuilding the old commit tells them apart, so commit **`997170d`**, the
tree 2.13.9 measured, was checked out into a worktree, installed, built and
served beside the shipped build on the same machine within the same ten minutes,
and measured with the identical harness. **The old tree and the new tree read the
same, and neither reproduces the published tail.** So the tail is the laptop —
2.13.9 said as much at the time, and this is the control that settles it. Nothing
in the record needed correcting upward; nothing was falsified.

### The disposition, and why it is not the other two

**Not a repair here.** All three of §10's candidates are decisions this close
cannot honestly take: `content-visibility: auto` changes column sizing and the
jump control's measured offsets, so it is a table redesign wearing a stylesheet
change; collapsing bands was declined by Task 2.11.8 **on its merits**, and
reversing a product decision to buy a performance figure is the shape of change
this repository keeps arguing against; virtualisation is an ADR with a dependency
decision inside it. A close that quietly rebuilds another story's surface is a
close whose scope has stopped meaning anything.

**Not acceptance.** Acceptance says the number is fine, and it is not: the
continuous instrument says a 20-row page is at the two-frame floor while a
518-row page spends 35–50 ms more, on the two most-visited routes, **before the
product has a live price in it** — and Epic 5 adds an anomaly score per security
to exactly this surface. Writing "accepted" against a number about to double is
how a published target quietly stops being true.

**Epic 14 is a real owner rather than a deferral.** Its scope already names
main-thread task measurement and bottleneck analysis; it already inherits one
measured §28 exception on this same table (`Expand all`, 69–87 ms); and **the two
are the same component and probably the same repair.** Joining them is what makes
the hand-off worth more than a note.

### Where it is written

| Document                       | What it now says                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| `SEARCH-AND-SELECTION.md` §10  | the third dated measurement, the `997170d` control, and the disposition with its argument |
| `planning/epic-14-.../EPIC.md` | the hand-off — both exceptions, the three repairs, the trigger, the re-measure            |
| `planning/EPICS.md`            | the same entry beside the `Expand all` one it joins                                       |
| `PRODUCT_SPEC.md` §28          | a dated amendment naming both exceptions. **The target itself is not amended**            |
| `docs/GAPS.md`                 | the third dating and the owner                                                            |
| `CLAUDE.md`                    | moved from _open_ to _owned_, with the trigger kept above the epic                        |

**The trigger is unchanged and it outranks Epic 14 deliberately: the first time a
second surface on this page renders per-row markup at universe scale.** A
hand-off to an epic eleven epics away is only honest if the condition can fire
first, and this one can.

### What the user can see

**Nothing visible**, and that is the honest answer for this disposition. No
frontend code changed. The 50–76 ms on a cold load of `/securities` and
`/securities/NVDA` is still there, and a person on a fast machine will not notice
it. What changed is that it is now a piece of work with an owner, a set of
figures, three costed repairs and a condition that pulls it forward if the page
grows a second per-row surface first — instead of a paragraph in a task file that
somebody would have measured again from scratch. **Epic 14 pays it off**, or the
trigger does, whichever comes first.

### What nothing checks

Unchanged and worth restating, because this task's whole output is prose. Nothing
in `pnpm verify` can see this figure — jsdom computes no layout — and `pnpm e2e`
cannot assert it either: CI's store is 518 securities and **zero bars**, so an
assertion there would be a duration on a shared runner. The re-measure command is
in Epic 14's `EPIC.md` and in `docs/GAPS.md`, and it begins by checking
`document.visibilityState`, because a tab driven over CDP reports `hidden` and
every figure taken in one is small, plausible and meaningless.

---

## In plain words — a status report for stakeholders

### What this task was actually about

Somewhere in the project's written commitments there is a promise about
responsiveness: **no single piece of work the app does should block the screen
for more than a twentieth of a second.** That is the threshold at which a person
stops experiencing a click as instant and starts experiencing it as a computer
thinking.

Three weeks ago we measured our own product against that promise and **found we
were breaking it.** Not badly, not everywhere — but on the two screens people
visit most, every time they arrive.

This task was not asked to fix it. It was asked to **decide what we are going to
do about it, and write that down somewhere it will actually be read.**

### What we found, and why we trust it

The culprit is not the thing you would guess. It is not the price chart, which
draws thousands of data points and is genuinely the clever part of the screen.
**It is the list of the 518 companies we track.** Building that list as a web page
is about ten thousand small pieces of layout, and the browser takes roughly
fifty milliseconds to do it.

We know it is the list and not the chart because we tested it from both ends: the
delay is there on the page that has the **list and no chart at all**, and it
**disappears** when we shrink the list to twenty companies while still drawing the
biggest chart the product can produce. That is as close to proof as this kind of
measurement gets, and we have now taken it three separate times, a day and three
days apart, on progressively busier versions of the screen.

One detail is worth mentioning because it shows the standard we hold ourselves
to. This time the numbers came out slightly _better_ than last time — the worst
spikes were smaller. That is exactly the sort of thing a team talks itself into
believing ("we must have improved something"). We did not believe it. We
**rebuilt the three-day-old version of the product from scratch** and ran both
versions side by side on the same laptop, ten minutes apart. They performed
identically. So the improvement was the laptop being quieter, not the product
getting faster, and we wrote that down rather than taking the credit.

### The decision, and why

Three options were on the table.

**Fix it now.** We declined, and the reason is discipline rather than laziness.
The real fix is to stop building all 518 rows at once and only build the ones on
screen — a well-understood technique, and a genuine piece of engineering with its
own design decision attached. Doing that as an unplanned side-quest at the end of
an epic about market data is how projects acquire half-finished rewrites of
things that were working. The two cheaper shortcuts both have real costs: one
breaks how the table sizes its columns and how the "jump to a sector" control
works, and the other reverses a product decision we took deliberately a week ago
for good reasons that have not changed.

**Accept it and move on.** We declined this too, and this is the more important
refusal. Accepting means writing "this is fine" — and it is not going to stay
fine. Our measurements show the big list costs about **forty milliseconds more
per page load** than a small one, and that is _today_, on a product that does not
yet show live prices. A later phase of this project adds an "unusual activity
score" next to every one of those 518 companies. That is a second helping of
exactly the work that is already too slow. Signing off a number that is about to
double is how a written promise quietly becomes a lie.

**Give it to the team that owns performance.** This is what we did. There is a
planned phase of this project — Epic 14 — whose entire job is measuring and
proving performance at scale. A properly engineered 518-row table is precisely
its kind of work. Crucially, **there is already a second, related slowness on the
very same table** waiting in that epic's inbox, found a week ago. They are the
same component, and one piece of work almost certainly fixes both. Putting them
side by side is worth more than either note on its own.

### The part that stops this from being a polite way of ignoring it

Epic 14 is a long way off. A deferral with a distant date is often just a burial.

So the hand-off carries a **condition that overrides the schedule**: the moment
anyone adds a second per-row element to that table — the anomaly score being the
obvious candidate — the repair becomes due **then**, regardless of which epic we
are in. Two helpings of a fifty-millisecond delay in one page load is not
something a user mistakes for a slow laptop.

And we have written the breach into **six places**, including the product
specification itself, right underneath the promise it breaks. The specification's
target has not been watered down — the fifty-millisecond promise is correct and
stands. What it now says, dated, is that we currently miss it in two specific
places, who owns fixing it, and where the evidence lives.

### How this moves the product forward

Honestly: **a user would not see a single difference today.** No code changed.
The tenth of a second is still there.

What changed is the project's relationship to it. The difference between a
respectable engineering project and an impressive one is rarely that the
impressive one has no problems — it is that the impressive one can tell you
exactly which problems it has, how big they are, how it measured them, who owns
them, and what would make them urgent. Before this task, that fifty milliseconds
was a worry living in a document. After it, it is a tracked piece of work with
three costed options and a tripwire.

This also clears the last substantive question standing between us and closing
out the historical-data phase of the product. The picture there is genuinely
healthy: a person can search 518 real companies, open one, and read a real price
and volume chart driven by real market data, with the source of every number
stated on screen. The thing they still cannot do — **watch a price actually
move** — is the next phase's job, and it starts as soon as this one is signed
off.
