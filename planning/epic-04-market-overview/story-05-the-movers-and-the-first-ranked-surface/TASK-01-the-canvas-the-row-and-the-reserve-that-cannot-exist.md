# Task 4.5.1 — The canvas, the row, and the reserve that cannot exist

**Status:** Not started
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
orchestrator uploads. **Re-fetch `The ranked list.dc.html` first**: the fetch
used during shaping **truncated at §03**, and §04/§05 exist and are cited by
name in the shipped CSS. Nothing may cite them from the truncated copy.

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
changes.dc.html`, and the treatment **stays where it is**. The vocabulary's
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
