# Task 4.6.3 — A proxy opens its security

**Status:** Not started
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
