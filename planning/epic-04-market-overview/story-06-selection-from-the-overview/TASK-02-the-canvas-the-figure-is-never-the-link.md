# Task 4.6.2 — The canvas: the figure is never the link

**Status:** Not started
**Story:** [4.6 Selection From the Overview](STORY.md)
**Depends on:** 4.6.1

## Objective

**Draw the treatment before building it, across all three anatomies at once.**
A figure-that-is-a-link is drawn nowhere: `Universe navigation.dc.html` carries
the input idiom as **prose plus one focused rail chip**, and draws **no row
hover state and no row focus state** at all.

## What the user can see when this lands

**Nothing.** 4.6.3 and 4.6.4 pay it off.

## Work

### Its own page, because the treatment spans three anatomies

`Selection from the overview.dc.html`. **Not** a section of `The movers.dc.html`
— a treatment drawn on one page for one of three is the drift that produced
`BarSeriesPanel`'s duplicated provenance line.

### The answer to the story's own question

**The figure is never the link; the identifier is.** A figure is a thing whose
glyphs change under the reader, so decorating it on hover puts two unrelated
signals in one box — _this number just changed_ and _this number can be
pressed_ — and the one that fires on its own wins.

**The three-axis separation from the arrival disc** is the load-bearing part,
and it is Task 3.4.4's settled rule doing the job it was written for:

|           | arrival disc                             | hover / focus                                 |
| --------- | ---------------------------------------- | --------------------------------------------- |
| behaviour | **decays** — 900 ms, one-shot            | **persists** — held while the reader is there |
| box       | the 8 px `markSlot`, right of the symbol | the symbol's glyph box + the row's ground     |
| trigger   | a bar arrived for this security          | a reader is pointing at this row              |

**The chevron does not transfer, and the reason is geometric**: `UniverseTable`
reserves room right of the symbol for one, and on both of these surfaces that
position **is** `markSlot`, holding the arrival disc. So the second encoding is
the **ground**, not a glyph.

### The ring forces the target's height — this is the finding to draw

`18 + 2 × (2 + 2) = 26` — **the row's padding box, to the pixel.** Taking the
focused row's padding box as y = 0…26 with the glyph line at 4…22:

|                     | y                       |
| ------------------- | ----------------------- |
| link border box     | 4 … 22                  |
| **outline strokes** | **0 … 2 and 24 … 26**   |
| this row's hairline | 26 … 27 — **untouched** |
| row below, glyphs   | 31 … 49 — 9 px clear    |

**A row-height link gives a 34 px ring against a 27 px pitch** — strokes at
−4…−2 and 28…30, through both neighbours' padding, with the row's own hairline
_inside_ the ring. **So the 18 px line-box target is a consequence, not a
preference**, and that is why the target was not stretched vertically to buy
size.

### 2.5.8 is met by the spacing exception, which makes the row pitch load-bearing

18 px tall fails 24×24 on the block axis and **passes under the spacing
exception**: vertically adjacent ticker links are **27 px centre-to-centre**,
which clears 24. **So the conformance argument is the row pitch** — and the
page must say, in words: _shrinking the 26 px row below 23 px turns every
ticker link into a 2.5.8 failure, and nothing mechanical will say so._

### The sections

**§01** the figure is never the link, with the three-axis table and one drawn
**DECLINED** counter-example — the figure growing an underline. **§02** three
anatomies × four states (rest / hover / focus-visible / active-unchanged), the
link's box drawn as a dashed overlay with its measured dimensions inside, and
**the arrival disc lit in at least one hover and one focus cell** so the two
are seen together once. **§03** the ring at 4× with the y-ladder, beside the
**rejected** 26 px version. **§04** the four widths, with 390 reading
`64 of 308 px — 21% of the row`, flagged as the accepted cost. **§05** 2.5.8
by spacing, with the circles drawn. **§06** greyscale and reduced motion.

### The owner's proxy decision overrides the designer's, and the page must show the version that shipped

**The owner chose the symbol token, not the whole cell**, for consistency with
the ranked rows. The designer's measured objection stands and the page must
carry it rather than quietly drop it: a symbol-token ring **overhangs 4 px into
the price's row**. 4.6.3 measures whether that lands in the price's
half-leading or on its glyphs; **draw whichever answer it found**, with the
arithmetic beside it.

### The orchestrator proxies `DesignSync`

Specify, hand over, and the orchestrator uploads. **When handing a canvas file
to a subagent, state its size and section list** — a `Read` that stops early
looks exactly like a file that ends there, and that cost Story 4.5 a false
claim.

## Done when

1. `Selection from the overview.dc.html` exists with all six sections, the ring
   arithmetic drawn at 4×, and the rejected row-height version beside it
2. The 2.5.8-by-spacing argument is drawn and the row-pitch warning is in words
3. The proxy section shows what 4.6.3 measured, not what was predicted
4. `pnpm links` green
