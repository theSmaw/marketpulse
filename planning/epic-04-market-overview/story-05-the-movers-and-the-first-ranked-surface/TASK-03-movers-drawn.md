# Task 4.5.3 — Movers drawn

**Status:** Not started
**Story:** [4.5 The Movers, & the First Surface That Ranks by a Live Value](STORY.md)
**Depends on:** 4.5.1

## Objective

**Two ranked lists in one region, as peers**, with every state produced in the
workshop before any of it meets a frame.

## What the user can see when this lands

**Nothing on `/`** — the region still says what it is waiting for. The workshop
gains the region and its states. Task 4.5.5 puts it on screen.

## Work

### Two peers, not a demotion — and this is the distinction that matters

The sector quiet group is a **demotion**: no ordinal, regular weight, secondary
ink, below a rule, words where a figure would be. Gainers and losers are **two
peers** — each ranked from 1, each a complete answer, neither subordinate.

**Take the mechanism, not the emphasis.** A second `<h3>`, a `--rule-control`
rule above it, a separate `<ol>`, and `.quietHeadAlone`'s rule about not drawing
a divider that divides nothing. Both lists draw primary ink, medium weight on the
name, a printed ordinal and `PriceChange` at full strength. If the losers list
inherited the receding treatment it would read as _losers are the leftovers_ —
false, and tonally wrong on a market surface where a −9% name is the most
interesting thing on the page. The distinction is safe because in the sector
region the demotion is carried by **the rows**, not by the heading.

**Headings: `GAINERS` and `LOSERS`** (the owner's Gate 1 decision). Micro size,
uppercase, medium weight, secondary ink — **properties spelled, never
`composes: microLabel`.** These are the first strings in this region to contain
**words**, which is exactly the content that makes the `composes` ordering trap
visible: `type.module.css` lands later, so `text-transform: none` under a compose
does not win, and the defect needs content of a kind the rule has never held.
First heading: no rule, no padding-top (`Panel`'s own `--rule-strong` is 32 px
above). Second: `--rule-control` plus `--space-8`, because it separates two
**lists** rather than two rows.

**Not two panels** — `Panel` is the language's one strong statement and nesting
two gives three frames with the region's name competing with two sub-names.
**Not a bare gap** — two unlabelled columns of signed figures is a permutation
waiting to be misread, and in greyscale the heading is the first and strongest of
the three non-colour channels.

### The height budget, which is why the row count is five

Content ceiling is **389 px**, not 486: the chrome above the first row is 2
(borders) + 47 (header) + 16 (`Panel.body` padding-top) + 16 (`Region.content`
margin-top) + 16 (padding-bottom) = **97**. Corroborated from a second region —
`BreadthLedger.module.css`' own head comment records _"378 against a 389 px
ceiling"_.

| element                        | px                      |
| ------------------------------ | ----------------------- |
| chrome                         | 97                      |
| `GAINERS` heading              | 16                      |
| gainers, 5 rows                | 134                     |
| gap (`--space-16` floor)       | 16                      |
| `LOSERS` heading               | 25                      |
| losers, 5 rows                 | 134                     |
| footer claim, two-line reserve | 44                      |
| **total**                      | **466** against **486** |

**Twenty pixels of slack**, absorbed by the flexible gap. **N = 6 is 520 — over
by 34, and it drags `Sector performance` and `Market breadth` with it**, because
rows 2 and 3 share one `fr`. State that in the stylesheet so nobody discovers it
by shipping it.

### The states, and the asymmetric pair is the new hazard

Produce **all** of them in the workshop: both lists full; **asymmetric** (5 and
2); every figure identical; one row; nothing rankable at all (**CI's permanent
state**); the reservation before any frame; `No moves to rank yet.` past
`useWaited`'s 2,000 ms floor; and the region error.

**The sentence is `No moves to rank yet.`** — not `No prices yet.` (the strip's)
and not `No sector moves yet.` (4.3's). Three regions, three nouns, one per
region, which is what tells a reader **which** region went quiet when two do at
once. It names the quantity and the action and claims nothing about whether the
market is flat.

**The reservation is the real component, never a `min-height`** — a `min-height`
is a second home for the row pitch, the headings and the claim, wrong the first
time any of them changes and wrong **silently**. And it is **two boxes, not
one**: the held geometry keeps its own `visibility: hidden` and `aria-hidden`
unconditionally, and the sentence is a **sibling** in the room it holds. The
one-box version was a live defect for ten days and leaked internal slugs into the
accessibility tree, because **`visibility` is inherited by children that never
set it**.

**The asymmetric pair.** At 1440 and 1024 nothing moves — the grid row is
`minmax(min-content, 1fr)` and resolves to 486 whatever the content is. **At 768
and 390 the rows are untied and the region is its content**, so a list going
5 → 2 shrinks it by 81 px and steps the whole lower page — three times the 25 px
Task 4.3.7 spent a task designing out. **Pad each list to N with held rows** —
the same `Row`, `visibility: hidden`, `aria-hidden`, so the pitch comes from
`.row` itself and no arithmetic gets a second home.

**One correctness constraint the developer must be told:** `useSettle` indexes
into `element.children`, so held rows inside the `<ol>` **must be present in the
`rows` array the FLIP is handed**, or every `to` position is read off the wrong
row and rows travel to places they were never in. `RankedList.tsx`'s own comment
at the `ranked`/`quiet` split records the trap.

### Boundaries

Not the producer or the wire (4.5.4). Not the landing page (4.5.5). Not the
denominator's wording (4.5.6) — reserve its 44 px and leave it empty here. Not
the hold at two lists (4.5.7).

## Done when

1. The region draws two headed lists as peers, with the second heading's rule and
   neither list inheriting the quiet group's receding treatment
2. Every state above has a story, including the asymmetric pair and the two-box
   reservation, and the reservation's `innerText` holds the sentence **and
   nothing else** — no label, no slug, no em dash
3. A list going 5 → 2 changes the region's height by **zero** at all four widths,
   measured with `pnpm probe`
4. The FLIP still travels correctly with held rows present, asserted rather than
   reasoned
5. `pnpm verify` green, stories gate satisfied
