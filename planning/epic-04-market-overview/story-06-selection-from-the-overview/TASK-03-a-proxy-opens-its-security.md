# Task 4.6.3 — A proxy opens its security

**Status:** **Complete — 2026-10-09.**
**Story:** [4.6 Selection From the Overview](STORY.md)
**Depends on:** 4.6.2

## Objective

**The first four destinations on the landing page**, on the simplest anatomy —
no list, no roving index, no hold, and an order that never changes.

## What the user can see when this lands

**`SPY`, `QQQ`, `DIA` and `IWM` open their security pages**, by pointer and by
keyboard. Four new tab stops, before the regions.

## Work

### Four plain tab stops, no roving group, no arrow keys

AC 1 asks for one stop per region _"where a region is a list"_ — **the strip is
not a list**: a 4-across grid of cells, no `<ol>`, no ordinal, no ranking. Its
order and membership **never change** (`figures` arrives in `PRODUCT_SPEC.md`
§6's declared order and `MarketOverview.tsx` records that it _"never moves"_),
so every reason the roving pattern exists is absent. And `/securities` already
ships **518 plain link stops**.

A 2-D arrow model is also refused on a measurement: at 390 the strip is **2×2**,
so `ArrowRight` would mean _next cell_ at three widths and _the cell beside me
on this row_ at the fourth — **layout-dependent behaviour nothing below
`pnpm e2e` can see.**

### The target is the symbol token — the owner's decision, against the designer's

The owner chose consistency with the ranked rows over the designer's
whole-cell recommendation. **The designer's measured objection is real and this
task has to answer it rather than inherit it:**

`.term` is `line-height: var(--line-height-micro)` = **16 px**; the price row
below is **26 px**; the cell is 58 px. A symbol-token link is 16 px tall, so its
ring is `16 + 8 = 24 px` outer and **overhangs 4 px into the price's row**.

**Measure whether that 4 px lands in the price row's half-leading or on its
glyphs.** `--line-height-dense` against `--font-size-dense` leaves roughly 4 px
of half-leading above the glyphs, so it may land exactly in the gap — **that is
a measurement, not an argument.** If it lands on glyphs, the repair is a gap or
an inset, **never** shrinking the ring, which is one home at the token layer.

### The accessible name is the bare ticker

**Not the cell.** A cell-wide name is
`SPY 774.03 up +0.42% 14:01 EDT · pre-market`, which **changes up to sixteen
times a minute** — an accessible name that moves under the reader is
unannounceable, unrepeatable, and breaks `getByRole("link", { name })` in any
spec that touches it.

### The states where there is nothing to open

`NoFigures` draws four cells of **`NBSP` and no symbols at all** — the comment
says why: _"The symbols are not known yet, because the set is served."_ So the
strip's link count is **4 or 0, never four disabled links**, and the trap Story
4.2's hand-off warned about — a natively `disabled` control carrying an
`aria-describedby` nobody can reach — is foreclosed by construction.

**A figure reading `unknown` is still a destination.** The security exists and
its page is the right place to find out why there is nothing; ADR 0029 governs
_claims about data_, and a link is not a claim about today's move.

### Boundaries

Not the ranked rows (4.6.4). Not the empty/degraded states beyond the strip's
own (4.6.5). Do not add a `document.title` or move focus on arrival — the
owner's Gate 1 decision is **raise it, do not build it**.

## Done when

1. The four symbol tokens are `<Link to={securityPath(symbol)}>` with the bare
   ticker as the accessible name, and the strip adds exactly four tab stops
2. The ring's 4 px overhang into the price row is **measured** at all four
   widths and either shown to land in the half-leading or repaired
3. Zero links in the `NoFigures` state, asserted
4. An `unknown` figure is still a destination, asserted
5. `pnpm verify` and `pnpm e2e` green, and `pnpm probe` run at four widths with
   the screenshots looked at

## What was done

### The change, in three files

`MarketProxyStrip.tsx` — the symbol token is a React Router `Link` carrying
`securityPath(symbol)` and nothing else builds the address. It carries
`.symbolLink` **and** `.symbol`, rather than wrapping a second element, so the
truncation and the ring are one box.

`MarketProxyStrip.module.css` — `.symbolLink` (`color: inherit`,
`text-decoration: none`) and one `:hover, :focus-visible` rule sharing the
underline. **No `:focus-visible` ring is declared**: that is the token layer's
one global rule, and `--focus-reach` is read from the cascade by every
instrument below rather than written down twice.

`MarketProxyStrip.test.tsx` — switched from a bare `render` to
`renderWithContext`, because a `Link` with no router throws, plus five new
assertions in one describe.

Nothing else moved. `.cell` is still `16 + 26 + 16 = 58` in every state, the
strip is still `325 325 325 325` at 1440 and `144 144` × 2 rows at 390, and the
region's rest state is pixel-unchanged.

### The ring: measured against the real `<a>`, and the brief's figures do not reproduce

The brief carried **+4.34 px at 1440** and **+5.25 px at 390**, taken on the
shipped `<span>`. Re-measured against the anchor, with `--focus-width` and
`--focus-offset` read from the live cascade, the clearance is **+1.19 to
+1.20 px — at all four widths, and the same at every cell**:

```
=== 1440×900   ring reach 4px   strip links 4
  SPY  link 229.00…245.00 h16.00   ring 225.00…249.00 h24.00   overhang into price line box 4.00
       figure "764.29" 20px/26 box 245.00 h26.00 halfLeading 0.00 inkAsc 14.80 inkTop 250.20  => CLEARANCE 1.20px
       absent "None stored" 16px/26 halfLeading 2.50 inkTop 254.35  => CLEARANCE 5.35px
  QQQ  …                                                                        => CLEARANCE 1.19px
=== 390×780   ring reach 4px   strip links 4
  SPY  link 266.00…282.00 h16.00   ring 262.00…286.00 h24.00   overhang into price line box 4.00
       figure "764.29" 20px/26 box 282.00 h26.00 halfLeading 0.00 inkAsc 14.80 inkTop 287.20  => CLEARANCE 1.20px
       absent "None stored" 16px/26 halfLeading 2.50 inkTop 291.35  => CLEARANCE 5.35px
```

1024 and 768 are byte-identical to 1440. **The answer to the question the task
was set is YES** — the 4 px overhang lands in the price's leading and not on
its glyphs — **but by a quarter of the margin the brief predicted**, so the
conclusion survives and the number must not be quoted from the brief again.

**Two method notes, because both changed the answer.**

1. The price span is a **flex item** of `.valueRow`, so it is blockified and
   its rect is the 26 px line box rather than the font's content area. The
   baseline is therefore
   `top + (lineHeight − (fontAscent + fontDescent)) / 2 + fontAscent`, **not**
   `top + fontAscent`. At `--font-size-metric: 20px` the face's own
   ascent + descent is exactly 26, so the half-leading is **0.00** and the whole
   gap is the font's internal leading — 5.20 px between the line box top and the
   digits — of which the ring eats 4.00.
2. The first run of the `unknown` state read `11px/18` and looked like an
   answer. It was somebody else's component: the instrument matched `._absent_…`
   across **every** stylesheet and several modules in this tree have an
   `.absent`. Scoped by the strip module's own hash it reads `16px/26`, which is
   what the stylesheet says. **A class name is not a selector for a CSS module.**

**The canvas figure was controlled by scanning painted pixels**, at
`deviceScaleFactor: 8`, which needs no font metrics at all and finds the ring,
the symbol, the underline and the digits as bands of dark rows:

```
1440px  link box y=229.00  clip top 219.00 (device 8×)
  ink band device 48…239  =>  page y 225.00…249.00
  ink band device 250…369  =>  page y 250.25…265.25

390px  link box y=266.00  clip top 256.00 (device 8×)
  ink band device 48…239  =>  page y 262.00…286.00
  ink band device 250…369  =>  page y 287.25…302.25
```

The first band is exactly the 24 px ring box; the next ink begins **1.25 px**
below it. Two instruments, two methods, 0.06 px apart.

**It is a pass and it is not a comfort, and that is the orchestrator's call
rather than this task's.** The brief says _do not re-litigate the ring_ and the
measured answer does not force a repair. What the next reader should know
before reaching for one: `.cell` is 16 + 26 + 16 in every state and `.regions`
begins immediately below it in a flex column, so a gap or an inset here moves
the **whole seven-region grid** — which is why the only two repairs the
stylesheet admits are a gap or an inset, and never a smaller ring.

### The underline survives `overflow: hidden`, and it very nearly did not

`.symbol` carries `overflow: hidden` — it is what gives `text-overflow:
ellipsis` a block container — and the element now carries the hover/focus
underline too. A rule drawn below the 16 px line box would be **clipped
silently**: nothing warns, nothing shifts, and no assertion in this repository
compares a painted underline. Photographed at 8× focused and hovered: at
`text-underline-offset: 0.2em` on a 13/16 line it is whole, and the ring, the
underline and the digits read as three separate strokes.

### Tab stops: 11 → 15, and the four are in reading order at both widths

Measured by pressing Tab against the live page, with a control on the same page
that swapped each anchor back for the span it used to be:

```
1440px before: 11 stops          1440px after: 15 stops
  …                                …
  5 SECTION:Market proxies…        5 SECTION:Market proxies…
  6 SECTION:Market breadth…        6 A:SPY
                                   7 A:QQQ
                                   8 A:DIA
                                   9 A:IWM
                                  10 SECTION:Market breadth…
```

390 is identical — **`SPY QQQ DIA IWM`**, which at 2×2 is the reading order, and
is the measurement behind refusing a 2-D arrow model rather than the argument
for it.

### What is asserted, and where

Five new assertions in `MarketProxyStrip.test.tsx`, all in jsdom, because none
of them is about a layout:

- **four links, one per cell**, asserted as the exact `href` list built by
  `securityPath()` — so a hand-interpolated address fails
- **the accessible name is the bare ticker**, asserted as an exact string with
  a figure and a change on screen beside it
- **the figure is never the link**, across all three drawing states
- **an `unknown` figure is still a destination** — and this is the only branch a
  gated browser ever exercises, because CI's store has zero bars while the
  gateway still sends an overview frame (it is registered unconditionally in
  `index.ts`, independent of `MARKET_DATA_PROVIDER`)
- **zero links when there is nothing to open**, for both ways of having no
  figures — no frame, and a frame about nothing. `NoFigures` draws four cells of
  `NBSP` and **no symbols**, so the count is 4 or 0 and never four disabled
  links; the `disabled`-with-an-unreachable-`aria-describedby` trap is
  foreclosed by construction rather than avoided.

### No check was added, so no break is owed

Nothing here is a `pnpm invariants` grep. The obvious candidate — _the landing
page's destinations are built with `securityPath()` and nothing else_ — belongs
to **Task 4.6.6**, which owns the guard by name, and writing it here would mean
writing it against one surface before 4.6.4 adds the other two. `pnpm break` was
therefore not run, and `break-verify.mjs` would have refused the dirty tree
anyway.

### The gates

- `pnpm verify` — **exit 0**. `48 invariants hold.` `apps/frontend` 86 files /
  1379 tests, `apps/backend` 50 / 1025, `packages/shared`, `test:process` 2 / 41.
  **No `Unhandled Errors` block** in the log (`grep -c` → 0). One earlier run
  failed `format:check` on the new test file only; `pnpm format` fixed it and the
  re-run is the one above.
- `pnpm e2e overview-focus-ring.spec.ts landing-route.spec.ts` — **9 passed
  (5.9s)**. The four new stops appear in the ring walk at every width and in both
  directions, and every one clears both sticky edges.
- `pnpm e2e overview-` — **48 passed (30.2s)**, the whole landing-page set.
- `pnpm probe /` at 1440, 1024, 768 and 390, screenshots looked at: the strip is
  `1358×58 grid 325 325 325 325` at 1440 and `308×128 grid 144 144` at 390,
  identical to before, and the rest state shows no link ink and no underline.

`notes.txt` was not touched: its mtime is still `2026-10-08 22:19:22`.

### What was wrong in the brief when it met the code

1. **The ring figures.** +4.34 / +5.25 do not reproduce against the `<a>`; the
   answer is +1.19 / +1.20 and it is the same at all four widths rather than
   differing between 1440 and 390. The brief's 5.25 is within 0.1 px of what the
   `unknown` state measures (**5.35**), which is the likeliest explanation: two
   different states, read as two widths.
2. **`.term`'s line height.** The brief and the stylesheet agree on 16 px, but
   `.term` sets `font-size: var(--font-size-dense)` — 13 px — on
   `line-height: var(--line-height-micro)`. It is a 13/16 line, not a micro one,
   which is what makes the box 16 px rather than the 11/16 a reader of
   `--line-height-micro` alone would expect.
3. **Not an error, but the task's own hazard**: nothing in the brief says the
   price span is a flex item, and the natural baseline formula for an inline box
   gives the wrong ink position by about 3 px — in the generous direction.

## The canvas was corrected, and the orchestrator's measurement was the wrong one — 2026-10-09

`Selection from the overview.dc.html` §04 published **+4.34 px at 1440 and
+5.25 at 390**. Both were wrong. The page now carries **+1.20 px, identical at
all four widths**, with the `None stored` state's **+5.35** beside it, and a
dated correction block naming all three errors.

**The answer to the question is unchanged — the ring lands in the leading and
not on the glyphs — and the margin is a quarter of what was published.**

### Three errors compounded, and the shape is worth more than the figure

1. **A `Range` rect reports the line box, not the ink.** The first reading said
   the ring sat 4 px _on_ the glyphs — wrong in the alarming direction, which
   is at least the direction that gets investigated.
2. **Replacing it with canvas font metrics fixed that and introduced the
   next**: the selectors were attribute-contains matches on **hashed CSS-module
   names** (`[class*="symbol"]`), so they matched **another component's
   class**. _A class name is not a selector for a CSS module._
3. **The two figures published as "1440" and "390" were two different
   states.** The second is within 0.1 px of the `None stored` row.

### And the tell was in the output and was ignored

**Two runs of the same instrument reported a half-leading of `0.00` and then
`4.50` for one quantity on one page.** An instrument that disagrees with itself
between runs has not been controlled — and the second figure was published on
the strength of being **more convenient than the first**, which is the whole
error in one sentence.

**What the implementing task did better**: two independent methods, one of
which scans **painted pixels at 8× and needs no font metrics at all**, agreeing
to **0.06 px** — then photographed. The photograph is what settles it: at 8×
the gap between the ring's lower stroke and the top of `764` is a sliver, and
+4.34 would have been unmistakably wide.

**+1.20 px is a pass, not a comfort**, and it is recorded as such. No repair is
forced — a gap or an inset would move `.cell` off `16 + 26 + 16` and take the
whole seven-region grid with it.
