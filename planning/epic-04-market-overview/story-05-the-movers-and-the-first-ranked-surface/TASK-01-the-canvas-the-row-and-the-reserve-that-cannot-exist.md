# Task 4.5.1 — The canvas, the row, and the reserve that cannot exist

**Status:** **Complete — 2026-10-08.** The canvas page is drawn and the component page's bar heading corrected — it carried a **false** reason borrowed from another story, while the body beneath it had been right all along. The row's name track was sized to eleven sector labels and **41.4% of company names are longer**; rebuilt with the name as the flexible track. The page's own first-draft name figures were **estimates wrong by 19 px and by one whole width** and were re-measured and re-uploaded the same hour. New invariant 44, whose **first draft was green on the defect it forbids**.
**Story:** [4.5 The Movers, & the First Surface That Ranks by a Live Value](STORY.md)
**Depends on:** —

## Objective

**Draw the region before building it, and settle the two things about the row
that no later task can change cheaply** — which track flexes, and whether the
quiet group's reserve exists.

`The ranked list.dc.html` carries the **component**. It does not carry this
**region**: there is no price column anywhere on it, the movers panel is a
~300 px thumbnail captioned _"abbreviated here for the drawing only"_ against a
real width of **1026 px**, and §02 defers the label track to this story in as
many words — _"Movers' names are longer and the region is narrower, which is
4.5's measurement to take, not this task's to guess."_ **The measurement now
exists and the drawn `144px` is wrong for this use.**

## What the user can see when this lands

**Nothing on `/`.** The workshop gains the movers row and its states; the canvas
gains a page. Task 4.5.5 puts it on screen.

## Work

### The canvas — a new page, `The movers.dc.html`

**Its own page, not a §06 of `The ranked list.dc.html`.** That page is the
component, drawn once for two uses; this is a **region**. `The breadth
ledger.dc.html` is the exact precedent — the ranked list's geometry with a
different subject, on its own page.

Seven sections: the region **at 1026 px, true to width**, with real universe
names including `Cognizant Technology Solutions Corporation Class A`; the five
tracks with the inversion argued; the height budget as a drawn ledger; the four
widths each restating its own track list, **with side-by-side drawn and
rejected** so nobody re-proposes it; the states; the bar refused on its own
terms; and two peers rather than a demotion.

**The orchestrator proxies `DesignSync`** — specify, hand over, and the
orchestrator uploads.

> **Corrected 2026-10-08, before the work started.** This bullet said the
> shaping fetch of `The ranked list.dc.html` **truncated at §03** and that
> §04/§05 had to be re-fetched. **That was false and the correction is worth
> more than the claim was.** Re-fetched: the page is **134,281 characters** and
> carries **§01–§08**, including `04 FOUR WIDTHS, EACH RESTATING ITS TRACKS` and
> `05 SEVEN STATES, IN ONE BOX, AND NOTHING JUMPS BETWEEN THEM` with its seven
> sub-states enumerated. **The fetch was whole; the designer's `Read` of the
> persisted file hit its own limit** — and a `Read` that stops early looks
> exactly like a file that ends there, which is why the agent reported it in
> good faith and could not have known. **The lesson for the next proxied canvas
> task: a subagent handed a large persisted file cannot tell truncation from
> brevity, so the orchestrator states the file's size and section list when it
> hands the path over.** §04 and §05 are readable and are the states this
> region's own set is derived from.

### Two corrections on existing canvas pages

- **`The ranked list.dc.html` §02's heading is wrong.** It reads _"AND REFUSED
  FOR MOVERS — ONE QUANTITY VERSUS FOUR"_, and that reason is **false**: a mover
  row carries today's percent change against the previous close, the same
  quantity on the same basis over the same interval as the eleven ETFs, from the
  same `changeFromClose`. The phrase was borrowed from Story 4.2's proxy-strip
  refusal, where it is correct, and does not transfer. Re-head it to the reason
  that survives — **a selected tail has no range** — with the argument on the new
  page. The body text under it is already right.
- **`The motion vocabulary.dc.html` gains one row** pointing at `The order that
changes.dc.html`, and the treatment **stays where it is**. **Moved to Task 4.5.7
  on 2026-10-08 — see the amendment at the foot of this file.** The vocabulary's
  one-page value is scannability, not file count; a re-order is not a fifth limb
  of the grammar but a sentence spoken in it, consuming _a fact arriving decays_
  and adding a FLIP, a hold, a contrast exception and a measurement. The actual
  defect is that the vocabulary does not know the re-order exists. Record the
  general rule — **the vocabulary owns the grammar and a complete index; a page
  per treatment owns the sentence** — with a condition-shaped reversal trigger:
  _the first treatment that adds a new limb to the grammar rather than consuming
  an existing one_.

### The row — five tracks, and the name is the flexible one

```css
/* >= 37rem */
grid-template-columns: 2ch 52px minmax(0, 1fr) 80px 78px;
column-gap: var(--space-12);
```

**The ticker leads and the name takes the slack**, which inverts the sector row.
Both halves need their reason recorded:

- **Why the ticker leads.** It is this product's primary identifier everywhere
  else — the search field, the URL, the universe table, the identity block — and
  Story 4.6 makes these rows navigate, so the thing the reader is about to act on
  is the symbol. Sectors put the label first for a reason that **inverts** here:
  `XLK` means nothing so the name identifies, whereas `NVDA` means something so
  the ticker identifies and the name confirms. **What is lost, honestly**: a
  reader who does not know a ticker meets an opaque token first, paid for by the
  name sitting beside it at the same size, never abbreviated above 390.
- **Why the name may flex when the sector row's tracks may not.**
  `RankedList.module.css` rule 1 fixes every track left of the bar _because
  otherwise the bar's origin depends on the row's contents_. **There is no bar
  here**, so nothing has an origin to protect and the one track that may flex is
  free to be the one that needs to.

**The measurement that forces it** (taken 2026-10-08, 507 universe rows):
`p50 21, p75 26, p90 32, p99 43, max 50` characters, and **41.4% exceed 22** —
the length of `Communication Services`, which measures **143.75 px against the
144 px track**. So the track has essentially zero slack at its design maximum and
**the common case overflows**; `.label` is `white-space: nowrap` with no
`overflow` and no `text-overflow`, and a grid item does not clip, so the name
paints over the ticker column on roughly two rows in five. Invisible to jsdom, to
axe, to every unit test, and to a screenshot of `NVDA / AMD / AVGO`.

`minmax(0, 1fr)` rather than `1fr`, for the `min-width: auto` reason — and here
it is load-bearing twice: without the zero floor a 327 px name pushes the price
and change columns **off the region** at 1024 rather than ellipsising. The name
owes `min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap`.

**At 390 the price drops and the name keeps its room** (the owner's Gate 1
decision): `2ch 44px minmax(0, 1fr) 68px`, gap 8, figure at `--font-size-micro`
with the **line height unstepped** — the row is 26 px at every width and the
seven-region grid is sized off that.

**Every width restates its own track list and none inherits** — two of the four
come out identical and are restated anyway. `RankedList` already paid for this:
leaving `.bar` out of the `<37rem` hide list grew an implicit `<li>` row, making
every row 33 px instead of 26 and the region 503 instead of 461, invisible to
everything below `pnpm probe`.

### `RankedList` gains two props

```ts
/** Whether this use can produce a row with no rankable figure. */
readonly quietGroup: "possible" | "impossible";
/** Two lists on one screen need visible headings to point at. */
readonly name: string | { readonly labelledBy: string };
```

**`quietGroup` is required, not optional**, so the next use decides rather than
inherits. Sectors is `"possible"` — a sector can go quiet mid-session, which is
the hazard Task 4.3.7 bought 25 px to cover. Movers is `"impossible"`: AC 5 says
a name with no current observation cannot appear, so the quiet group has zero
members **in every state there is, for ever**, and the unconditional reserve is
**50 px held for a group that cannot exist**. At two lists that is the difference
between **five rows and four**.

**`name` as a union** because `RankedList` renders `aria-label={name}` on its
main `<ol>`, while its own docblock argues for `aria-labelledby` — _"the heading
is on screen and a listener gets the same words from the same string — one fact,
one home"_ — and applies it to the quiet group. Sectors is correct as it is (no
visible list heading); movers has two visible `h3`s to point at, so the string
form would put a second copy of each heading's words in the markup.

### Boundaries

Not the two-list region (4.5.3). Not the producer or the wire (4.5.4). Not the
denominator sentence (4.5.6). Do not re-decide the motion (4.3's).

## Done when

1. `The movers.dc.html` is on the canvas with all seven sections, the region
   drawn at 1026 px with real universe names, and side-by-side drawn and rejected
2. `The ranked list.dc.html` §02's bar heading no longer says _one quantity
   versus four_, and `The motion vocabulary.dc.html` references the re-order
3. `RankedList` takes `quietGroup` and the `name` union; both are exercised by
   stories, and sectors' rendering is **byte-identical** to before
4. A movers row drawn at 1440, 1024, 768 and 390 holds `Cognizant Technology
Solutions Corporation Class A` without painting over the ticker, ellipsising
   at 1024 and 390 only, with **no change of row height at any width**
5. `pnpm verify` green, and the stories gate satisfied

## Amended by Task 4.5.1 itself — 2026-10-08: the motion-vocabulary row moved to 4.5.7, and why that is not a deferral

**The row is not written here.** `DesignSync` replaces a page **wholesale** —
there is no partial edit — and `The motion vocabulary.dc.html` is ~30 KB of
hand-authored HTML that came back **inline rather than persisted to disk**,
because it is under the size at which a fetch is written to a file. So adding
one row means **re-emitting the whole page from context**, and a transcription
error anywhere in 30 KB of a design page is a real cost against a one-row
benefit — on a page whose entire value is that it is correct.

**It moves to Task 4.5.7, which is a condition rather than a calendar.** That
task works on the re-order at two lists and has to open `The order that
changes.dc.html` anyway; the page it must cross-reference is the page it will
already be holding. The recorded owner was _whoever next touches either page_,
and within this story that is 4.5.7.

**The general lesson, which is the part worth keeping**: a canvas page that
comes back **inline** can only be rewritten from context; one that is
**persisted to disk** can be patched with a script. The threshold is the file's
**size**, not its importance — so **a small page is more expensive to amend
than a large one**, which is backwards from what anybody would assume. The
cheap move for a one-line amendment to a small page is to batch it with the
next change that rewrites that page for its own reasons.

---

## What was done — 2026-10-08

### The canvas

**`The movers.dc.html` is new**, seven sections: the region **drawn true to
1026 px** with real universe rows including the longest name in the universe;
the five tracks with the inversion argued; the height budget as a ledger; the
four widths with **side-by-side drawn and rejected**; the states; the bar; and
two peers rather than a demotion. Its own page rather than a §06 of the
component's, on `The breadth ledger.dc.html`'s precedent — that page is the
ranked list's geometry with a different subject, and so is this.

**`The ranked list.dc.html` §02's bar heading is corrected** from
`AND REFUSED FOR MOVERS — ONE QUANTITY VERSUS FOUR` to
`AND REFUSED FOR MOVERS — A SELECTED TAIL HAS NO RANGE`, with a dated
amendment beneath it.

**And the body text under that heading was already right**, which is why nobody
caught it. It reads: _"A top-N over 518 has a far wider dynamic range, and its
five members are near the top of it by construction. Five bars all within a
whisker of full length carry almost no information, and the one thing a reader
would take from them — that these five are similar — is an artefact of the
selection rather than a fact about the market."_ That **is** the tail argument.
Only the heading had imported Story 4.2's proxy-strip reason, where _one
quantity versus four_ is correct and does not transfer. **A heading and its
body disagreeing is a shape worth naming: the body is what a reader checks and
the heading is what a later author quotes** — and Story 4.5's own `STORY.md`
quoted the heading.

### The truncation that was not one — corrected before any work was done

The task file said the shaping fetch of `The ranked list.dc.html` **truncated at
§03**. Re-fetched: **134,281 characters, §01–§08**, including
`04 FOUR WIDTHS, EACH RESTATING ITS TRACKS` and `05 SEVEN STATES, IN ONE BOX,
AND NOTHING JUMPS BETWEEN THEM` with its seven sub-states enumerated.

**The fetch was whole; the designer's `Read` of the persisted file hit its own
limit** — and a `Read` that stops early looks exactly like a file that ends
there, so the agent reported it in good faith and could not have known.
**The rule for the next proxied canvas task**: the orchestrator states the
file's **size and section list** when it hands the path over.

### The row, and three corrections the code forced

**1. `.plain` was not sectors' and replacing it was right.** The brief said
"beside `.plain`, which sectors uses" — it does not. `.plain` applied only when
`bar.kind === "none"`, **which no shipped caller passes**; sectors renders
`.plot` alone. `.plain` was Task 4.3.5's placeholder **for this story**, and its
own comment says so. Keeping it beside a sibling would have left dead CSS with
no discriminator to choose between them.

**2. The five tracks are unreachable without re-ordering the row's cells in the
DOM.** `Row` renders rank → **label** → ticker → figure → bar; the movers row is
rank → **ticker** → name → price → change. Done in the DOM rather than with
`grid-column`, and the reason is the right one: **placing from CSS would draw
ticker-then-name while handing a listener name-then-ticker.**

**3. Track 4 is the price's and nothing fills it yet.** There is no price on
`SectorRow` and no producer for one — 4.5.3 and 4.5.4. The change figure is
therefore placed **explicitly in track 5**, so a price cell added later
**auto-places into track 4 and moves nothing**. Flagged rather than invented.

### The measurement that corrected the canvas an hour after it was uploaded

Done-when 4, the brief and the canvas's first draft all said the longest name
ellipsises **at 1024 and 390**, on an estimated 327 px derived from
characters × 6.53. **Measured against the real row, at the four region widths:**

| region | name track | `Cognizant Technology Solutions Corporation Class A` |
| ------ | ---------- | ---------------------------------------------------- |
| 1026   | 753.45 px  | whole                                                |
| 595    | 322.45 px  | **whole — 14.45 px to spare**                        |
| 720    | 447.45 px  | whole                                                |
| 342    | 191.45 px  | ellipsised                                           |

```
=== viewport 374 → region 342 (as at 390)
   {"text":"Cognizant Technology Solutions Corporation Class A",
    "track":191.45,"intrinsic":308,"clipped":true,
    "rowHeight":27,"nameLeft":91,"tickerRight":83}
```

`intrinsic` is `scrollWidth`, which collapses to the box when the text fits, so
**308 px** is the true width and it is only readable from the clipped case.
**The estimate was wrong by 19 px and by one whole width.** The canvas page was
corrected and re-uploaded the same hour, which is the upward sweep's rule
applied to the source of truth rather than to a document.

**Row height is 27 / 27 / 27 / 26 px** (the last row drops its separator) — the
pitch does not move, which is the property §03's whole budget rests on. And
**the name cannot paint over the ticker for two independent reasons**: its left
edge is right of the ticker's right edge at every width (`107 > 95`, and
`91 > 83` at 390), **and** the cell declares `overflow: hidden`.

Resolved tracks, `pnpm probe --story market-rankedlist--movers-longest-name`:

```
=== 1440 × 900   plot.movers  1408×107  grid 15 52 1135 80 78
=== 1024 × 900   plot.movers   992×107  grid 15 52  719 80 78
===  768 × 800   plot.movers   736×107  grid 15 52  463 80 78
===  390 × 780   plot.movers   358×107  grid 15 44  207 68
```

### Sectors is unmoved — asserted rather than assumed

`SectorPerformance`'s rendered `innerHTML` captured **before** the change in two
states (all-ranked, and one quiet row), re-captured after, and diffed:

```
IDENTICAL (class hashes normalised)
IDENTICAL BYTE FOR BYTE
```

Vite's scoped-name hash is path-based, so even the class suffixes matched. The
throwaway test is deleted. And `pnpm probe /`, matching Task 4.3.7's recorded
figures exactly:

```
=== 1440   panel.scrollable.areaSectors   1026×486  @24,557
=== 1024   panel.scrollable.areaSectors    595×486  @24,557
===  768   panel.scrollable.areaSectors    720×486  @24,871
===  390   panel.scrollable.areaSectors    342×462  @24,994
```

with the sector plot's tracks unchanged: `grid 15 144 52 78 655` at 1440.

### The motion-vocabulary row moved to 4.5.7

See the amendment above. The short version: `DesignSync` replaces a page
wholesale and that page comes back **inline rather than persisted**, so a
one-row amendment means re-emitting 30 KB from context — and 4.5.7 opens the
sibling page for its own reasons. **The counter-intuitive part is worth
keeping: a small canvas page is more expensive to amend than a large one**,
because only the large one is patchable with a script.

### The guard, and the first draft was green on the defect

**`every-row-variant-restates-its-tracks`** — invariant 44. It strips comments,
brace-matches the `@media (width < 37rem)` block, and collects on each side of
it every selector whose body states a `grid-template-columns` that is **not**
`subgrid`. A selector in the outer set and not the inner set fails.

**`subgrid` is excluded deliberately** and the check records why: `.list`,
`.quiet` and `.row` adopt the parent's tracks rather than stating any, so they
have nothing to restate — **a check that demanded their restatement would be
demanding the bug.** Two anchors: a missing narrow block fails rather than
passing vacuously when the breakpoint moves, and an empty outer set fails, so
the check moves with the tracks if they move to another file.

**The procedure `CLAUDE.md` demands, and it earned its four minutes.** The
defect written was **the file the next story would write** — a third variant
added to the wide block and forgotten in the narrow one — not a break of
`.movers`, because a break edits the file the check was written around:

```css
/* THE NEXT STORY'S THIRD VARIANT — a compact row for a narrow region. */
.compact {
  grid-template-columns: 2ch 44px minmax(0, 1fr) 60px;
}
```

**The first draft — a grep for `.movers` inside the narrow block — against that
file:**

```
44 invariants hold.
EXIT: 0
```

**Green on the exact defect it exists to forbid.** The shipped, shape-keyed
check against the same file:

```
  ✗ every-row-variant-restates-its-tracks
    1 row variant(s) state a track list above 37rem and none below it, so that width inherits one:
      .compact
    A grid item with nowhere to go grows an implicit track, and inside a subgrid that
    implicit track is a second row of the `<li>` — 33 px instead of 26, on every row,
    invisible to everything below `pnpm probe`.

1 of 44 invariants failed.
EXIT: 1
```

**`1 of 44` with the other forty-three still collecting** — an assertion
failure rather than a parse error, which is the only red that proves a check
works.

Registered as **`the-narrow-row-inherits-its-tracks`**, which deletes the
movers row's narrow restatement and leaves the wide one:

```
✓ apps/frontend/src/components/RankedList/RankedList.module.css broken → red → restored byte-identical.
  matched: state a track list above 37rem and none below it
```

### Two notes on how the break was run, recorded because the next task will hit both

**`pnpm break` refuses on a dirty target, and the target was the file being
changed** — so the break was unrunnable with the work uncommitted. It was run
against a **transient local commit of the implementation files only**, then
`git reset --soft HEAD~1 && git reset`. Verified afterwards: `HEAD` is the
merge commit, no stray commit, every change unstaged, and **`notes.txt`
untouched**. It worked, and the cheaper shape for next time is to let the
orchestrator commit first and run the break against the committed tree — which
is what the task loop does anyway, one step later.

**The dev server was deliberately not restarted, and that is correct here.**
The restart rule exists because a break whose verification runs against the
**running app** reports a guard as _absent when it is there_. This break's
command is `pnpm invariants`, which reads the file off disk — no server, no
HMR — so the failure mode cannot apply, and restarting would have killed the
pair being probed. **The rule is about what the check reads, not about what the
break edits.**

### Gates

```
pnpm --filter @marketpulse/frontend typecheck   tsc -b, exit 0
pnpm --filter @marketpulse/frontend test RankedList          19 passed (19)
pnpm --filter @marketpulse/frontend test SectorPerformance   15 passed (15)
pnpm verify    40 components, 40 stories files
               495 documents, 1677 cross-file links, 0 broken
               44 invariants hold
               shared 408 · backend 1010 · frontend 1329 · process 41
               no Unhandled Errors block
pnpm break the-narrow-row-inherits-its-tracks   ✓ red → restored byte-identical
```

**Not run and why**: `pnpm e2e` — no layout on `/` changed, the movers row
exists only in the workshop; `pnpm test:database` — no data layer touched.

## For a stakeholder — a status report, 2026-10-08

**What this was.** Drawing the movers region before building it, and settling
the two things about its row that no later task could change cheaply.

**What is on the canvas.** A new page for the region, drawn at its real
1026 px rather than as a thumbnail, and a correction to the component page:
the bar's refusal was headed with a reason that is **false** — _one quantity
versus four_ — borrowed from a different story where it is true. The bar is
still refused, on three arguments that hold, and **the body text under that
heading had been making the right argument all along.**

**What was found by measuring.** The company-name track was sized to eleven
sector labels and **41.4% of the universe is longer**, so the common case
painted over the ticker column. The row is rebuilt with the **name as the one
flexible track** — legitimate only because there is no bar whose origin has to
stay put. And the figures the page first shipped with were **estimates that
were wrong by 19 px and by one whole width**; re-measured, the longest name in
the universe is drawn whole at every width but 390.

**What is now guarded that was not.** A rule this repository had already paid
7 px a row for — that every width restates its own track list — is a check,
and **its first draft was green on the defect it forbids**, which is why the
procedure requires writing the next author's mistake rather than your own.

**What shipped open.** Nothing from this task. The price column is reserved and
empty until 4.5.3 and 4.5.4 fill it, by construction rather than by
intention — a price cell added later auto-places and moves nothing.
