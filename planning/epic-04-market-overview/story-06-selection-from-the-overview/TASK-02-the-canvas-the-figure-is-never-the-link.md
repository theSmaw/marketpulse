# Task 4.6.2 — The canvas: the figure is never the link

**Status:** **Complete — 2026-10-09.** The page is drawn, and the proxy measurement was taken here rather than deferred: the owner chose the symbol token against a design objection that its ring would hit the price, and **it clears the price ink by 4.34 px at 1440 and 5.25 at 390**. The first instrument said the opposite — a `Range` rect reports the **line box, not the ink**, and it fails in the direction that looks like a defect.
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

---

## What was done — 2026-10-09

`Selection from the overview.dc.html` is on the canvas, six sections, its own
page rather than a section of `The movers.dc.html` — the treatment spans three
anatomies, and a treatment drawn on one page for one of three is the drift that
produced `BarSeriesPanel`'s duplicated provenance line.

### The proxy measurement, taken here rather than deferred to 4.6.3

The task file said to draw whichever answer 4.6.3 found. **It was taken now
instead**, because the page is the owner's record of a decision they took
against a measured objection, and shipping it with a prediction in that slot
would have been the thing this repository keeps paying for.

**The owner chose the symbol token over the whole cell. The design objection
was that a symbol-token ring would overlap the top of the price. Measured, it
does not reach the glyphs:**

| width | symbol bottom | ring bottom | price line top | half-leading | price **ink** top | clears ink by |
| ----- | ------------- | ----------- | -------------- | ------------ | ----------------- | ------------- |
| 1440  | 245.00        | 249.00      | 245.00         | 4.50         | 253.34            | **+4.34**     |
| 390   | 282.00        | 286.00      | 282.00         | 6.00         | 291.25            | **+5.25**     |

**Both halves of the objection are true and only the second one matters**: the
ring _does_ overhang 4 px into the price's line box, and it lands **entirely in
the half-leading**.

### The first measurement was wrong and would have condemned the design

**A `Range`'s `getBoundingClientRect()` returns the line box, not the ink.** It
reported `halfLeading: 0` and `clearsGlyphsBy: -4` — i.e. _the ring sits on the
price's glyphs_ — which is false. The ink extent came from canvas
`measureText`'s `actualBoundingBoxAscent` against the resolved baseline
(`lineBoxTop + (lineHeight − (ascent + descent)) / 2 + ascent`), and was then
**photographed with the ring simulated** on the real page at 1440 and 390.
Both pictures show clear space between the ring and `764.29`.

**The lesson for the next measurement of this kind**: a `Range` rect cannot
distinguish leading from ink, and it fails in the direction that looks like a
defect rather than like a pass.

### What the page carries

**§01** the figure is never the link, with the **three-axis** separation from
the arrival disc (behaviour / box / trigger) and a drawn **DECLINED**
counter-example — the change growing an underline while the disc fires in the
same frame for an unrelated reason. Plus why the chevron does not transfer: its
slot **is** the mark slot.

**§02** the mover row at its real 27 px pitch in three states at once — rest,
hovered, and focused **with the disc lit**, so the two are seen together once.
With the four-state table and why `:active` and `:visited` draw nothing.

**§03** the ring at 4× as a y-ladder: strokes at 0–2 and 24–26, the hairline at
26–27 **untouched**, 9 px and 5 px clear of the neighbours — beside the
**rejected** 26 px version whose 34 px ring crosses both. **The 18 px target is
a consequence, not a preference.**

**§04** the proxy measurement above, with the `Range` correction recorded.

**§05** 2.5.8 by spacing, and the consequence stated in words: **shrinking the
26 px row below 23 px turns every ticker link into a failure — not the link's
size, the pitch between links** — and no test in this repository measures a row
pitch.

**§06** greyscale and reduced motion: three channels, **none of them hue**, and
the note that the ground's 1.10:1 is _why_ it is the locator and the underline
is the affordance.

### Gates

`pnpm links` green. No code changed; `pnpm verify` not re-run for a canvas
upload and a planning file.

## For a stakeholder — a status report, 2026-10-09

**What this was.** Drawing the clickable row before building it, across all
three shapes it has to work on.

**What was found.** The owner's choice of target was made against a design
objection that it would collide with the price beneath it. Measured, **it does
not** — the ring passes through the blank space above the price's digits with
4.3 to 5.3 px to spare. But the first instrument said the opposite, because the
browser API used reports the text's _line_ rather than its _ink_, and it fails
in the direction that looks like a defect. The figure that settled it came from
font metrics and a photograph.

**What is recorded that was not.** That the row's 27 px spacing is what makes
these small targets accessible — not their size — so anyone who tightens the
rows later breaks a conformance argument that nothing in the test suite can see.
