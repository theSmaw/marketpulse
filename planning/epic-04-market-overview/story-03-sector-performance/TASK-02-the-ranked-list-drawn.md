# Task 4.3.2 — The ranked list drawn, once, for two uses

**Status:** Not started
**Story:** [4.3 Sector Performance, & the Benchmark That Is Not an Average](STORY.md)
**Depends on:** 4.3.1

## Objective

**A ranked list of eleven rows with a signed figure is a component this product
does not have, and the canvas's nearest relative promises the opposite thing.**
`Universe navigation.dc.html` is a 518-row table that **never re-orders** —
Task 3.6.3, _"a row that moves while it is being read is a row that cannot be
read"_ — and this is the surface that decision pointed at, in its own words:
_"anything ranked by a live value is Epic 4's … a ranked view is a different
surface with a different promise."_

**Draw it for two uses.** Story 4.5's movers reuse it. One ranked-list component
with two uses is a design decision; two components that look similar is an
accident — and the expensive half is the re-order treatment, which is the part
that would drift invisibly between two copies because the two lists are never on
screen at the same size.

## What the user can see when this lands

**Nothing on the running product.** A drawing the next three tasks build
against. Task 4.3.5 is the payoff.

## Work

- **`The ranked list.dc.html`** — the row anatomy with every track stated; the
  two uses side by side with the prop table and the one-component argument; the
  bar, its central anchor and its printed ladder; four widths each restating
  tracks; seven states in one box with nothing jumping; direction and magnitude
  without hue, with a greyscale switch; what `Universe navigation` gives it and
  what it must not; and what a later task owes a measurement for.
- **Amend `Market overview.dc.html`** — §06's _one component, two uses_ gains
  the prop table and the bar judgement; §01/§04 gain the real filled heights.
- **Amend `Market proxies.dc.html`** — the index label in the cell's third row,
  four curated labels declared as _the index this fund tracks_, no wire field.
  The judgement is already the owner's; this records it where the blank row was
  drawn.

## Constraints handed to this task, each with its source

- **Full sector names from `SECTOR_LABELS`, never abbreviated.** That record
  exists _"precisely so nobody derives a display string by transform — 'Health
  Care' and 'Healthcare' are the same slug and different words."_ Measured:
  `Communication Services` is **143.75 px** at 13 px in the text face, **163 px**
  in micro caps — so caps plus tracking make it _wider_, and the micro-label
  idiom is the wrong one for this label.
- **The label column is FIXED at 144 px, never `max-content`.** Otherwise the
  bar's left edge depends on which sector is in the row, so **a re-order moves
  all eleven bars' origins** — invisible to everything below a browser.
- **`BENCHMARK XLK` is already this product's words**, shipped on the universe
  table's band headings. AC 2 reuses vocabulary rather than inventing an honesty
  label, which is why it costs almost nothing.
- **The ticker is on the row**, and the rank is **printed** as a tabular `2ch`
  ordinal. Both are decided; draw them.
- **The bar is adopted for sectors and refused for movers.** The reason is _one
  quantity versus four_: eleven sector ETFs all carry today's percent change on
  the same basis over the same interval, so the ratio of two bars **is** the
  ratio of two moves. Central zero anchor with a full-height hairline zero rule;
  a printed stepped ladder `±1 / ±2 / ±5 / ±10%`, smallest step containing all
  eleven, stepping outward only within a session; **never** normalised to the
  frame's maximum, which would make a ±0.1% day and a ±5% day look identical and
  would rescale all eleven bars on every tick. Solid price ink, not the washes —
  at 1.15:1 an 8 px wash is invisible. `0.00%` draws **no bar**, only the anchor
  tick.
- **No bar at 390**, and the benchmark symbol goes with it: 25 px each side of
  zero is a tick, and the comparison it offers says less than the ordered list
  already does. The claim lives in the footer at every width.
- **Mark geometry C's second consumer**, not a fourth geometry — the first time
  one of the three has been reused rather than invented. The table's refusal to
  reserve width (_"absent 98% of the time"_) **inverts** at eleven liquid funds
  where the mark is close to the common case.
- **`position: sticky` does nothing inside a `Panel`** — measured, the viewport
  top came back `−400px`, because the Panel is the nearest scrollport and never
  offsets from itself. Anyone reaching for a sticky scale legend or group heading
  gets silence rather than an error.
- **`<ol>`/`<li>`, not a `<table>`.** It is the honest markup for a ranking and
  it hands a screen reader _"list, 11 items, item 4"_ for free — the rank channel
  at zero cost, and one fact in two renderings.
- **Eleven rows, never twelve.** The table's grouping has a twelfth band for the
  market proxies; they have their own strip 200 px above and must not appear.
- **No emphasis on the extreme rows.** _Standing out, like receding, is a job
  for weight and hierarchy, never for ink outside the contrast floor_ — first
  and last against a full-height zero rule are already the two most legible
  positions. If _at a glance_ needs strengthening, the lever is weight, never
  ink.

## Done when

1. `The ranked list.dc.html` exists with every section, and each of the four
   widths restates its tracks
2. Seven states are drawn in one box, with the trailing quiet group among them
3. The bar's scale is printed on the drawing and the frame-max alternative is
   recorded as rejected with its reason
4. Both canvas amendments are written, including §03's corrected height claim
5. No value on the drawing requires a token that does not exist
