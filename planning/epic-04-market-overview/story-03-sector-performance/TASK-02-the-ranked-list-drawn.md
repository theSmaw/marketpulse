# Task 4.3.2 — The ranked list drawn, once, for two uses

**Status:** **Complete — 2026-09-27. `The ranked list.dc.html` is drawn in eight sections with two running instruments — and the region is 433 px rather than 383, because 383 was a bare list and AC 2's printed ladder and the benchmark claim line are not optional. A falsified premise was found citing-unread in SHIPPED SOURCE and swept.**
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
4. Both canvas amendments are written — see the 4.3.1 amendment below for what
   §03 no longer owes
5. No value on the drawing requires a token that does not exist

## Amended by Task 4.3.1 — 2026-09-27: §03's height claim is already corrected, and the number you draw against is 383

**Done-when 4 asked for `Market overview.dc.html` §03's corrected height claim and
it is already written.** Task 4.3.1 measured the region, found §03's
_"`Sector performance` is a tall hatched panel today"_ **false when it was
written** — 265 px at 1440 and 1024, 103 at 768, **121 at 390**, which is shorter
than four of its six siblings and is a header plus a wrapped sentence rather than
a held band — and wrote an `AMENDED 2026-09-27 BY TASK 4.3.1` callout beside Task
4.1.4's own, carrying that correction, the retirement of the
reserved-equals-filled rule, and a table of what the canvas recorded against what
the tree now has. **Read it; do not duplicate it; do not contradict it.**

**What you owe instead is consistency with one number.** The filled sector region
is **383 px**, of which 298 px is list — measured by a throwaway that rendered
eleven `<li>` at 13 px/18 px with `padding-block: var(--space-4)`, **26 px a row**.
That row height is a **placeholder**, and Task 4.3.3's row design replaces it. So:
draw your row, state its real height, and **if it is not 26 px say so loudly** —
three documents quote 383 and the correction is 4.3.3's to make.

**And the grid will not fight a taller row.** Since 4.3.1 the two lower rows are
`minmax(min-content, 1fr)` against a `min-height` rather than shares of a fixed
height, so a taller row makes the grid grow rather than making the panel scroll.
You are designing against 298 px of body **with room above it**, not under a
ceiling.

---

## What was done — 2026-09-27

**One new canvas page and two dated amendments, uploaded to
`727b5b14-fe78-47c1-9d9c-fb84b6ce5280`. No file under the repository changed for
the drawing itself** — the three repository edits in this commit are the sweep and
the corrections the drawing forced.

### `The ranked list.dc.html` — eight sections

| §   | What it settles                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | **Five tracks, four of them fixed.** A copyable track list, the `<ol>`/`<li>` argument, the one-element zero rule via a `subgrid` wrapper so `337.6` is never typed twice, and the `position: sticky` warning |
| 02  | **One component, two uses.** Sectors and movers drawn as the same list, a six-row prop table, the bar adopted and refused, and an explicit _4.3.3 owns the re-order_ boundary                                 |
| 03  | **The bar, its anchor and its printed ladder.** The four-step ladder with its label sets, the outward-only ratchet, and frame-max **rejected on two grounds**                                                 |
| 04  | **Four widths, none inheriting.** A track table plus 768, 1024 and 390 drawn at their true region widths; why there is no bar at 390 and why the ticker stays                                                 |
| 05  | **Seven states in one box**, all at one height, with the two lines under the list reserved in every one                                                                                                       |
| 06  | **Direction and magnitude without hue**, with a running 1×/10×/greyscale instrument on all eleven rows, and mark geometry C's second-consumer argument                                                        |
| 07  | **What `Universe navigation` gives this component and what it must not** — an eight-row inherited / changed / refused / inverted table                                                                        |
| 08  | **What a later task owes a measurement for** — nine claims with owners, and the fourth design test left at **NOT YET**                                                                                        |

**Two sections run rather than describe**, which is this canvas's established
idiom: a pure-CSS `:checked` instrument on the ladder that rescales all eleven
bars so the rejected alternative can be _seen_ rather than argued, and the
greyscale switch on §06.

### The row is 26 px. The region is 433, not 383 — and the row is not why

**383 px was `2 + 51 + 32 + 298`: the frame, the header, the padding and the list,
with nothing under it.** The drawn row is exactly the placeholder's **26 px**
(`--space-4` + `--line-height-dense` 18 + `--space-4`), and eleven rows with ten
1 px separators is **296 px against the 298 measured** — a 2 px difference which is
the placeholder's own separator accounting. So the list is right and **two more
lines are not optional**:

- the **printed ladder**, `--space-8` + 16 = **24 px** — AC 2's own requirement: a
  length is a claim about a quantity, so the quantity is printed;
- the **claim line**, `--space-12` + 16 = **28 px** — the benchmark sentence, at
  every width.

| width | region  | arithmetic                                                |
| ----- | ------- | --------------------------------------------------------- |
| 1440  | **433** | `2 + 51 + 16 + 296 + 24 + 28 + 16`                        |
| 1024  | **433** | same tracks, narrower bar                                 |
| 768   | **433** | same                                                      |
| 390   | **425** | no bar, therefore no ladder; the claim reserves two lines |

**These are drawn figures and Task 4.3.5's probe is what turns them into
measurements.** The knock-on was put to the owner and **did not reopen the
retirement**: at 433 the grid is `161 + 433 + 433 + 48 = 1075` rather than 975, so
the one-time recomposition is **+337 px at 1440 rather than +237** — but the safety
argument was never about magnitude (everything that moves is still another reserved
panel or the source note) and the free half is unchanged (`Movers` still pre-pays,
so Story 4.5 still moves nothing).

### `grid-template-columns`, verbatim

| width | region | row box | tracks                               | `column-gap`      | bar                |
| ----- | ------ | ------- | ------------------------------------ | ----------------- | ------------------ |
| 1440  | 1026   | 992     | `2ch 144px 52px 78px minmax(0, 1fr)` | `var(--space-12)` | 654 px, 327 a side |
| 1024  | 595    | 561     | `2ch 144px 52px 78px minmax(0, 1fr)` | `var(--space-12)` | 223 px, 112 a side |
| 768   | 720    | 686     | `2ch 144px 52px 78px minmax(0, 1fr)` | `var(--space-12)` | 348 px, 174 a side |
| 390   | 342    | 308     | `2ch 144px 44px 68px`                | `var(--space-8)`  | **none**           |

The fixed part above 390 is `15.6 + 144 + 52 + 78 + 4 × 12 = 337.6`. At 390 it is
`15.6 + 144 + 44 + 68 + 3 × 8 = 295.6` against 308 — **12.4 px of margin** — with
the mark's inline gap closing to `--space-4` (the proxy strip's own `<48rem` lever)
and the figure stepping to `--font-size-micro` (the strip's own step), while **the
label and the rank refuse to step**: the label is the 144 px this story measured
`Communication Services` against, and a rank that shrinks is a channel weakened to
buy room for one that is already there.

### The seven states, and where each came from

Derived from `MarketOverviewEntry` and `WireOverviewFigure` — `observed` /
`stored` / `unknown`, with `changePercent` **omitted rather than null** — plus the
region's two lifecycle states and Gate 1 decision 3:

1. **Ranked, live** — eleven `observed` with `changePercent` and `changeBasis`.
2. **A reading of exactly zero** — `observed`, `changePercent: 0`. **Anchor tick
   only, no bar**, `—` glyph, achromatic.
3. **The trailing quiet group** — eight `observed` ranked, three `stored`/`unknown`
   below a `--rule-control` divider **in symbol order**, with an **em dash in the
   rank column**, words instead of digits in the figure column, and the **bar cell
   empty rather than zero-length** — a zero-length bar is a claim of no movement.
4. **Outside a session** — eleven `stored`, the last completed session's
   close-to-close move, labelled; **no arrival mark ever**.
5. **No figures at all** — eleven `unknown`, which is **CI's store for ever**.
   **Universe order, not alphabetical.** The ladder is hidden, not removed.
6. **First paint** — no frame yet; `visibility: hidden`, the shipped `FirstPaint`
   idiom.
7. **`ORDER HELD`** — Gate 1 decision 3. Figures and printed ranks update, the
   order does not, and **the disagreement between them IS the pending re-order**.

**The feed stopping is recorded as NOT an eighth state**: byte-identical output,
one home for the connection word. And §05 carries the `docs/GAPS.md` entry-13
sibling warning, because **this region has two speakers** — the ranking and the
claim line — which is the _two speakers must agree_ form rather than the _a region
must speak_ form.

### Tokens — zero residue

Every `--*` name on the drawing was diffed against the declarations in
`apps/frontend/src/styles/*.css`. Named: `--font-size-dense`, `--font-size-micro`,
`--line-height-dense`, `--line-height-micro`, `--font-weight-medium`,
`--font-weight-strong`, `--ink-primary`, `--price-positive`, `--price-negative`,
`--price-unchanged`, `--price-positive-wash` (named **only** to record its
rejection — at 1.15:1 an 8 px wash is invisible), `--rule-control`, `--space-4`,
`--space-8`, `--space-12`, `--font-data`, `--surface-sunken`. **No new token.**
`--space-2`, `--space-6` and `--space-32` do not exist and are not used —
done-when 5.

### Four falsifications found, and three swept in this change

**1. `packages/shared/src/security.ts` cites a premise falsified nineteen days
earlier, in SHIPPED SOURCE.** `SECTORS`' doc comment carries, verbatim,
_"**The sector SPDRs hold S&P 500 constituents only**, so a tracked equity outside
the index has a sector, has a benchmark, and is not a constituent of it"_.
`UNIVERSE.md` §5 has carried a dated amendment since **2026-09-08** saying that
objection is **dissolved rather than worked around, because the universe IS the
index** — so the equity the comment warns about does not exist. **This is the same
citing-without-reading failure this story's own rename was taken on**, and the
sweep that day reached the story file and not this one. Struck through with a dated
amendment, and **the surviving caveat is named: WEIGHTING, not membership** — a
sector SPDR is capitalisation-weighted, so its move is not the average of its
members' moves, which is exactly why this story is _the Benchmark That Is Not an
Average_.

**2. `UNIVERSE.md` §1's own bullet had no amendment beside it**, while §5's did.
§1 is **the bullet a reader arrives at** — it ends _"Epic 5 reads this
paragraph"_, which is a live instruction to a future epic resting on a false
premise. Amended in place, nineteen days late, with the weighting caveat named as
the sentence Epic 5 should read instead.

**3. `383` is falsified as the region's height** and is corrected at its three live
sites — `STORY.md`'s retirement argument, Task 4.3.5's movement table, and
`MarketOverview.module.css`'s `.regions` comment. **Task 4.3.1's own record is
left standing**: 383 was true of what it measured.

**4. Not swept, and flagged deliberately.** `Market overview.dc.html` §01's sector
footer is drawn as `THE ETF'S OWN MOVE · S&P 500 CONSTITUENTS ONLY` — the same
falsified clause, as **shipped copy inside a historical drawing**. It was left
rather than silently edited, and §06's new amendment supersedes it with the
benchmark wording. It is flagged because **it is the string a developer would
copy**.

### One wire consequence, restated rather than discovered

**`WireStoredFigure` carries no change**, so state 4 — Gate 1 decision 2, a stored
figure carrying the last completed session's close-to-close move — **is
unsatisfiable on today's wire.** Known from the Gate 1 record; restated here
because it is a wire change inside this story and it interacts with the frame-grain
decision Task 4.3.3 owns.

### Gates

- **`pnpm format:check`, `pnpm links` and `pnpm verify`** — see the commit; the
  drawing itself is outside the repository and gated by nothing mechanical, which
  is what done-when 5 exists for and why every token was diffed by hand.
- **No check added, so no break is owed.** A canvas page is not reachable from
  `pnpm verify` by design — ADR 0026's own gap, and the reason a falsified string
  can sit on the source of truth for nineteen days.

## For a stakeholder — a status report, 2026-09-27

**Nothing reached the running product.** This was the drawing the next three tasks
build against: a ranked list of eleven sectors, designed once and for two uses, so
that Story 4.5's movers reuse it rather than growing a second component that looks
similar and drifts.

What it decided: the row's five columns and which four are fixed; that the label
column is a **fixed 144 px** so a re-order cannot move all eleven bars' origins;
that the bar's scale is a **printed stepped ladder** rather than normalised to the
biggest mover, because normalising would make a quiet day and a violent one look
identical; that there is **no bar at 390**, where 25 px each side of zero is a tick
that says less than the ordered list already does; and the **seven states** the
region can actually be in, drawn at one height so nothing jumps between them.

Two things were found rather than drawn. The region is **433 px rather than the
383 px everybody has been quoting** — 383 was eleven rows and nothing underneath,
and the printed scale and the benchmark sentence are both required. The owner was
asked whether the bigger number reopened last task's decision and it does not, for
the reason that decision was taken on: everything that moves is an empty panel.

And a sentence that stopped being true on **8 September** is still sitting in
shipped source, having been copied out of a document whose correction was one
section away. It is the third time this repository has caught that exact shape of
mistake, and it is corrected in the same change — along with the document's own
bullet, which told a future epic to read a paragraph that was wrong.
