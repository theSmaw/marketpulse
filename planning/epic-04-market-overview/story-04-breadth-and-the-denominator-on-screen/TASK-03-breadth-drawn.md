# Task 4.4.3 — Breadth drawn

**Status:** Not started
**Story:** [4.4 Breadth, & the Denominator on Screen](STORY.md)
**Depends on:** nothing — runs beside 4.4.1 and 4.4.2

## Objective

**The shape is decided and the drawing is where it becomes buildable.** The owner
chose **the breadth ledger** at Gate 1: three rows of `label · count · bar` on
`RankedList`'s geometry, **`Not heard from` in a trailing group below a rule** in
the idiom Task 4.3.7 shipped for `Not ranked`, plus **one headline figure**.

**The structural insight the shape rests on**: the three states partition **N**,
not the universe. `503 − N` is a drawable fact rather than a footnote, and any bar
drawn against 503 while the rows count N is a bar that is visibly short and does
not say why.

## What the user can see when this lands

**Nothing on the running product.** A drawing the next three tasks build against.
Task 4.4.5 is the payoff.

## Work

- **`The breadth ledger.dc.html`**, with the sections the designer enumerated: the
  region at 1440 **in place beside `Sector performance`**, so the two speakers on
  one `fr` row are judged together; all four widths with the bar's track and
  granularity stated at 390; the partition's arithmetic with every scale endpoint;
  **`unchanged` at a typical count, at 1 and at 0** beside `Not heard from` at a
  typical count and at 0; `grayscale(1)` with the channel carrying direction named
  per mark; the ink measured against **every ground a band can stand on**
  (`--surface-raised` and `--surface-sunken`) against 3:1; every state with its
  reserved room; where the sentence is **not**; motion; and what this did not
  decide.
- **The nearest relative is `RankedList`, not the volume chart** — correct the
  story's nomination on the drawing. Volume bars are per-bar marks on a time axis,
  read comparatively against neighbours, with **no partition, no known whole and
  explicitly no direction**. What does transfer is `--chart-volume`'s measured
  floor: **a band that is the only thing carrying magnitude is not decorative**, so
  WCAG 1.4.11's 3:1 applies.
- **Reuse the geometry; build a sibling component.** `RankedList`'s row is
  `symbol`/`rank`/`move`/`absent`/`arrival` against a `SectorLadderStep`; breadth
  has no symbol, no rank, no signed percentage and a different scale. Widening it
  to a third use puts a union inside it and starts the drift its own header was
  written to prevent.
- **The headline figure must print what the rows do not**, and be computed from
  the same counts — a fourth speaker about one subject is the `docs/GAPS.md` entry
  13 sibling risk, _two true halves and one contradiction_.
- **No new token if it can be avoided.** The unheard band's ink should be argued
  against `--chart-uncovered`, which already means _requested and not held_ and is
  scoped to the chart layer. **Record the verdict either way** — a token added by
  discovery rather than by decision is the thing to prevent.

## Done when

1. The page exists with every section, and each of the four widths states its
   tracks
2. `unchanged` is drawn at a typical count, at 1 and at 0, beside `Not heard from`
   at a typical count and at 0 — AC 2 reviewed with both on screen at once
3. Direction survives `grayscale(1)` with the carrying channel named per mark, and
   any band is measured against both grounds at 3:1
4. The volume chart is recorded as the WRONG relative, with the one thing that
   does transfer
5. No value on the drawing requires a token that does not exist, or the new token
   is argued and recorded

---

## What was done — 2026-10-07

**`The breadth ledger.dc.html`, 15 sections**, plus a dated amendment appended to
`Volume and window.dc.html` — **so the wrong nomination is corrected on the page a
reader would arrive at**, not only on the new one.

### It clears 486 exactly, and the slack is in one declared gap

Derived from the relative's own shipped decomposition — `2 + 47 + 16 + 16 + 16 =
97 px` of chrome — **so the body may not exceed 389 px. It is 378**, with the 11 px
of slack in **one** declared gap (`margin-top: auto` on the quiet group, floor
`--space-16`).

| width | reserved | drawn   | verdict                     |
| ----- | -------- | ------- | --------------------------- |
| 1440  | 486      | **486** | exactly — **nothing moves** |
| 1024  | 486      | **486** | exactly — **nothing moves** |
| 768   | 103      | **475** | grows 372 px (rows untied)  |
| 390   | 139      | **475** | grows 336 px                |

**The 11 px is the margin**: a third footer line can be absorbed before the grid
moves. Two width findings worth keeping: **breadth is the narrow column** (342 /
357 / 720 / 342 — 1440 and 390 are the same width to the pixel), and **the band
survives 390 where the sector row's bar does not**, because breadth's fixed part is
135 px against the ranked list's 337.6.

### Zero new tokens, and the reason is better than a saving

**`--chart-uncovered` is refused twice over.** It means exactly the right thing —
_"requested and not held… a product state rather than a fault"_ — but **its own
comment says what stops it reading as flat data is the CLIP, not the value**, and a
band has no clip: it _is_ the mark. Measured, it is **1.108:1 on raised and 1.00:1
on sunken**, so it fails the 3:1 a band carrying magnitude must clear.

**And then the question dissolves: the unheard row draws no band at all.** That is
Gate 1's own idiom — Task 4.3.7's quiet row has no bar by construction — and it is
the honest encoding: the row is **not on the 0–N scale**, so a fourth band would
assert a four-part whole that does not exist. The glance already has the fact from
the printed endpoint and the aligned count.

### Greyscale, and a pair nobody had measured

Direction survives, and **it is never the band that carries it**:

| mark             | → `grayscale(1)`      | carrying channel                                                                                                                      |
| ---------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Advancing band   | `#0f7b50` → `#616161` | the **word**, on an 80 px fixed track — the band is magnitude only                                                                    |
| Declining band   | `#c5221f` → `#444444` | the **word**                                                                                                                          |
| Unchanged band   | `#43474f` → `#474747` | the **word**; achromatic already                                                                                                      |
| `Not heard from` | no band               | **six channels, none colour** — below the rule, own heading, no band track, origin rule stops above it, regular weight, secondary ink |
| Headline net     | → `#616161`/`#444444` | `▲`/`▼` + sign + spoken word, all `PriceChange`'s                                                                                     |

**The measurement, at a pair nobody had taken: declining against unchanged is
1.05:1 after greyscale** — advancing/declining is 1.57:1 and advancing/unchanged
1.50:1. **The three bands are one grey.** Fine here, where a word carries every
row — and **fatal to the rejected four-segment bar**, where an abutting pair's only
separator is that 1.05:1 edge _and it moves_.

**3:1 against both grounds**, arithmetic calibrated three times against published
figures in `tokens.css`:

| mark                           | vs raised | vs sunken |          |
| ------------------------------ | --------- | --------- | -------- |
| `--price-positive`             | **5.28**  | **4.77**  | pass     |
| `--price-negative`             | **5.80**  | **5.23**  | pass     |
| `--price-unchanged`            | **9.32**  | **8.42**  | pass     |
| `--rule-control`               | **4.48**  | **4.05**  | pass     |
| _rejected_ `--chart-uncovered` | **1.108** | **1.00**  | **fail** |

**ADR 0026's standing exception does not fire on this drawing — the first time the
answer has been no.**

### Six published contrast figures describe a colour this product does not declare

`market.css`'s green comment argues for **`#046a38`** and quotes **6.28 / 6.72 /
6.00**; the **declared** value is **`#0f7b50`**, which measures **5.29 on white and
4.77 on sunken** — re-derived independently here and agreeing with the drawing to
0.01. The red comment quotes 6.03 / 6.46 / 5.76 against a declared `#c5221f`
measuring **5.80 / 5.23**.

**Both declared values are the canvas's `--mp-up` and `--mp-down`, on every staged
page.** So this reads as **ADR 0026 working** — the canvas is the source of truth
and the token followed it — **with the comment left unswept**, which is this
repository's own note that _recording a correction and propagating it are two
obligations_.

**Nothing on screen is wrong; the document was.** Swept the same day, with both
figures struck and re-measured in place, and the pairing argument preserved on the
real numbers (within ~0.5 of each other rather than 0.25).

**And `CLAUDE.md`'s 1.04:1 is narrower than the phenomenon** — that is the up/down
pair, and the pair that decides a partition bar (**declining against unchanged**)
had never been taken. The standing claim is not falsified; it is incomplete.

### Two owner decisions, taken 2026-10-07

**The window clause lives in the region's footer; the note keeps `computedAt`.**
Two documents read as though they disagreed — Task 4.1.5's _"it sits beside the
breadth count it describes"_ against Story 4.2's close _"do not add a second note"_
— and the resolution satisfies **both** rather than picking one: the note gains no
second provenance surface, and the clause that makes `451 of 503` interpretable is
not 500 px below the count it defines, which is the footnote nobody reads the
footnote of.

**`breadth` is REQUIRED on the frame.** If optional, a frame can arrive carrying no
breadth — `waiting` is false, the 2,000 ms floor never fires, and the region sits
reserved and **silent for ever**: the exact defect Task 4.3.8 produced and
repaired. Required makes that state **not exist** rather than needing a sentence.

### Two decisions I took rather than escalating

**The headline reuses `PriceChange` for a signed count.** Its contract is _the
already-formatted figure, sign included_ plus a caller-derived direction, and it
brings the glyph, the hidden spoken word and the ink **as one pairing**. A
`SignedCount` sibling would be a second `DIRECTION_GLYPH` table — the drift that
component exists to prevent.

**No mark, no transition, no reserved slot.** A count is **a state, and a state
PERSISTS**; a decaying disc would claim an observation this region did not make,
and breadth has **no security for a mark to be about**. The proxy strip marks and
the sector list marks, so the difference in register is deliberate. **It is the one
item on this page a measurement cannot settle** — it wants a look in front of a
real session, and it is on the rehearsal list.

### Gates

The drawing is outside the repository and gated by nothing mechanical, which is
what the token diff exists for: **every `--*` name checked against `tokens.css` and
`market.css`**, zero residue, no motion token. Three stated literals, the
relative's own practice (label `80px`, count `4ch`, band `6px`/`2px` floor) — and
**every micro line spells its own `text-transform` and `letter-spacing` rather than
composing and overriding**, which is Task 4.2.6's trap and matters here because
**the footer clause is the first string in this region to contain words**.

## For a stakeholder — a status report, 2026-10-07

**Nothing is on screen.** This is the drawing the next two tasks build against, and
it answers the question the story left open: how three counts and the number the
measurement could not see share one small panel.

The shape is a ledger — three rows, each with its label, its count and a band, and
below a rule the names the feed did not reach. **It fits the space already reserved
for it exactly**, with eleven pixels to spare, so filling this region will move
nothing on the two widest screens.

Three things came out of drawing it rather than describing it.

**The colour that was going to mark "not heard from" fails the contrast floor** — and
once that was measured, the better answer turned out to be **no colour at all**:
that row has no band, because it is not part of the thing the other three divide
up. Zero new colours were added to the product.

**The three bands become one grey when colour is removed**, which is why every row
carries its name in words. The same measurement is what rules out the single
stacked bar the spec sketches — there, two touching segments have nothing but that
invisible edge between them, and the edge moves.

**And six contrast figures published in the stylesheet describe a green this
product does not use.** The comment argues for one colour and the code declares
another — the canvas's — so the code is right and the documentation was six numbers
out of date. Corrected the same day; nothing on screen was wrong.
