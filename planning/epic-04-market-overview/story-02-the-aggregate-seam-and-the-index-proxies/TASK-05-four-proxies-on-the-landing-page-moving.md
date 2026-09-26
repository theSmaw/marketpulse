# Task 4.2.5 — Four proxies on the landing page, moving

**Status:** **Complete — 2026-09-26.** Four index proxies are on the landing page and the region is `Market proxies`. **Two constraints in this file contradicted each other** — a threshold derived from a six-glyph price beside a binding case declared as seven — and the build followed the arithmetic, correctly; measured, a cell needs **146 px** and 390's column is 144. **The first-paint state was the terminal state** when no frame ever arrives: a named region rendering silence while six hatched regions each said what they were waiting for.
**Story:** [4.2 The Aggregate Seam, & the Index Proxies That Move](STORY.md)
**Depends on:** 4.2.2, 4.2.4

## Objective

**The payoff.** Four tasks have put a join behind a frame; this one puts the
figures on the screen. `SPY`, `QQQ`, `DIA` and `IWM` with their last price,
their change from the previous session's close in both sign and glyph, and the
arrival mark this product already uses.

**And the region is renamed.** `Market proxies` is already the product's word
for exactly these four — the `/securities` group heading, and `Market proxy` on
the security page's classification line. `Market summary` is a second word for
a shipped concept, and on a screen where three later regions summarise all 518
it promises the broadest view while delivering the narrowest.

## What the user can see when this lands

**Four index proxies at the top of the landing page, moving.** A price that
updates without a refresh, a change measured from the previous session's close
carrying its direction in sign and glyph as well as hue, and a disc that appears
beside a proxy when **a bar arrives** and decays over 900 ms.

**What they still cannot do:** read sectors (4.3), breadth (4.4) or the movers
(4.5), or click a proxy to open it (4.6). And the honest states — a proxy
nobody has heard from, a store with nothing in it — are 4.2.6, which is the
next task.

## Work

- **`MarketSummaryStrip`** under `src/components/`, built to 4.2.2's drawing.
  It owes stories under the `pnpm stories` rule and genuinely has states worth
  seeing side by side. What it owns: the dividers, the reserved slots, the
  arrival positioning and the shared qualifier line.
- **It composes rather than reinvents.** `MetricStrip` with a `--metric-columns`
  override for the grid; `PriceChange` inside `Metric.value` for the direction.
  **The strip must not spell a sign or a glyph itself** — `PriceChange` keeps
  that pairing inside itself _"so that 'colour is never the sole encoding' has a
  component behind it instead of a convention every author has to remember"_,
  and this must not become the fourth spelling.
- **The order is `SPY, QQQ, DIA, IWM`** — §6's order, `INDEX_PROXIES`'
  declaration order, and the order already on screen in the reserved region's
  own sentence. The **set** is derived from the universe (`kind === "index_etf"`),
  never a hard-coded four-symbol array in a component; the **order** is served
  by the seam and the browser renders what it is given and never sorts.
- **The rename, swept in this task** rather than deferred: `MarketOverview.tsx`,
  `e2e/specs/landing-route.spec.ts`'s region list, `PRODUCT_SPEC.md` §9's
  2026-09-25 amendment (which enumerates the seven names), `EPIC.md`. The
  canvas is 4.2.2's. The CSS grid area name is internal and may stay.
- **The `reserved` state must become unreachable.** `Region` keys it on
  `children === undefined`, so it cannot linger by accident — but the
  `awaiting="Story 4.2"` string goes in the same change.
- **Nothing on this region announces the connection.** `one-home-for-the-feed-words`
  already covers this route; the region may state a figure's **instant**, its
  **age**, its **basis** and its **tape**, and may not state `LIVE` / `STALE` /
  `DISCONNECTED`, whether the market is open, or any per-security verdict.
- **No live region**, and the reversal trigger recorded as a condition: the
  first surface on this screen where a change is the answer to something the
  user asked for. `FRONTEND-STATE.md` §7's four reasons hold _a fortiori_ here —
  four subjects nobody asked for, on the most unprompted screen in the product.
- **The arrival mark: four, simultaneous, no stagger.** A stagger encodes an
  order the data does not have and turns one event into four. Under
  `prefers-reduced-motion` the token is `0ms` and the animation does not run —
  which makes the per-proxy instant the **only** surviving evidence that a bar
  arrived on a minute where the price did not change. That is a behavioural
  requirement on the layout, not a nicety.
- **Measure, then assert.** `pnpm probe /` before any suite, at 1440/1024/768/390,
  and take the tolerance from its output. Nothing below `pnpm e2e` can see a
  layout, and `.summary` sits **outside** `.regions` so it does not inherit the
  grid's per-breakpoint span restatement.

## Done when

1. Four proxies render in `SPY, QQQ, DIA, IWM` order with price, change and the
   shipped arrival mark, and the figure changes when a bar arrives with no reload
2. The mark fires for the proxy the frame carried and not for the other three,
   and does not fire on a snapshot
3. The region is named `Market proxies` everywhere, including `PRODUCT_SPEC.md`
   §9's amendment and the landing-route spec
4. The strip's height is identical across its states at each width, measured
5. Nothing in the region spells a connection or session word, and
   `one-home-for-the-feed-words` is green
6. `pnpm probe` output is recorded in the task, and the 390 arrangement is the
   one the canvas drew

## Amended by Task 4.2.2 — 2026-09-26: ten constraints off the drawing, in words this task can act on

1. **Track lists are stated at every width and inherited at none:**
   `repeat(4, minmax(0, 1fr))` at 1440, 1024 and 768; `repeat(2, minmax(0, 1fr))`
   at 390. **Never `auto-fit`.** The threshold rule is a content box of
   **508 px** (`4 × 112 + 60`), so a future width answers itself rather than
   being re-argued.
2. **Reserve the mark's 8 px slot statically, in the flow, in the label row
   after the symbol.** `composes: arrivalMark from
"../../styles/motion.module.css"` and declare **position only** — never
   re-declare the disc, its ink, its `opacity: 0` base or the 900 ms decay.
   That base is what stops reduced motion leaving four permanent dots at the
   top of the landing page: a zero-duration animation applies no keyframes at
   all. Both shipped geometries are absolute into a right-hand slack that
   already existed (a measured 26 px gutter; a right-aligned cell); a
   four-across grid of left-aligned columns has neither, which is why this one
   is in the flow.
3. **The acceptance on the mark is `0` layout shift at 1440, 1024, 768 and
   390**, measured in a browser — `The motion vocabulary.dc.html` §10's own
   words, _measured in the browser, never drawn_. Not inferred from a green
   unit run.
4. **Re-take the strip's height at all four widths with `pnpm probe /` and
   record the DELTA, not the absolute.** The reserved region is 103/103/103/121;
   the drawing intends ~158/~158/~158/~236. `.regions` is a flex column
   immediately below, so the delta is what every region on the page moves by.
5. **At 390 the change steps to `--font-size-micro` and the figure does not
   step at all.** The binding case is a four-digit price: render `1234.56` in
   all four cells at 390 and read the boxes — 138 of 149 px. If `PriceChange`
   has no size seam, adding one is a small change and not a new token.
6. **This is a new component, not `MetricStrip` with props.** Borrow the
   arrangement and the type (`.dataMetric`, `.microLabel`), not the element.
7. **The strip names no feed, no venue and no connection word, in any state.**
   It states an instant and a change basis, both true of either tape — which is
   the only AC 5 answer available without a second venue word on a screen that
   already has one.
8. **The exception line occupies row 3 — the index name's slot.** No new row,
   no growth, no re-flow of the other three cells.
9. **Nothing in the no-figures state may assert a window.** Its sentence is
   distinct from both of the security page's empty answers; four named
   securities have no window to change.
10. **`tabular-nums` on the figure.** A proportional digit changing its advance
    width on every tick is the same defect as a layout shift, one glyph at a
    time.

**And one correction to this story's own arithmetic:** the 390 figure quoted
during decomposition (85 px a column) ignored the border, the padding and the
gaps. It is **64.5 px**, which cannot render one of the four figures, let alone
four. Two by two gives 149 px.

---

## What was done — 2026-09-26

### What is on the screen

**Four index proxies at the top of `/`, in `SPY, QQQ, DIA, IWM` order**, each a
symbol with a reserved arrival slot, a price with its change beside it, and a
reserved third row carrying a per-proxy exception. One shared qualifier line
beneath the four. The region is named **`Market proxies`**, and the sweep took
`MarketOverview.tsx`, `landing-route.spec.ts`'s `REGION_NAMES`,
`PRODUCT_SPEC.md` §9's amendment and `CLAUDE.md`'s region list;
`awaiting="Story 4.2"` and the `filledBy` caption are gone. `EPIC.md` never
spelled either name.

### The probe figures, verbatim

```text
           before (reserved)          after
1440       1392×103 @24,149           1392×183   strip 1358×58   grid 325 325 325 325
1024        976×103                    976×183   strip  942×58   grid 221 221 221 221
768         720×103                    720×183   strip  686×58   grid 157 157 157 157
390         342×121                    342×269   strip  308×128  grid 144 144
```

**Delta +80 / +80 / +80 / +148**, which is what every region below moves by.
Every column clears `MetricStrip`'s 112 px floor. Across seven states the
`stackItem` is **140 px** at the wide widths and **226 px** at 390, with the
strip at 58/58/58/128 throughout, and a firing mark shifts nothing at any
width — `markSlot` is 8×8 in every state including the reserved one, so zero
shift is by construction rather than by luck.

### A defect only `pnpm probe` could have found

**`FirstPaint` reserved one cell instead of four.** At 1440, 1024 and 768 one
cell and four are both 58 px because the grid puts them on one row, so it is
**invisible at three widths out of four**. At 390 the grid is 2×2 and the strip
was **156 px against every other state's 226** — so the first frame to land
grew it by 70 px and took the seven-region grid with it. It now reserves four,
from the stylesheet's `repeat(4, …)` rather than from §6's list, so nothing in
the component names a security.

### Two constraints in this file contradicted each other

Constraint 1 derived the four-across threshold as `4 × 112 + 60 = 508`, where
112 px is where a **six**-glyph price stops sharing a line. Constraint 5
declared the binding case to be a **seven**-glyph price. **The build followed
constraint 1, which was right**, because it was the one stated as arithmetic.

Measured in Chromium with `1234.56` in all four cells: figure **82.61 px** —
and it never steps, at any width — change **62.03** dense, **54.95** micro. So
a cell needs **152.64** dense and **145.56** micro, and the step to micro that
constraint 5 offered as the remedy **is already inside that measurement and
does not close the gap**. `FourDigitPrices`' docblock said it did; corrected.

Four across now stops at **48rem** (`4 × 146 + 60 = 644` content / 726 px
viewport, rounded to 768 — an existing breakpoint and the drawing's own
four-across width; 726 leaves zero margin on a figure measured with one font
stack on one machine). Below it the inner gap closes to `--space-4`, the one
lever in the cell that is neither the figure nor the change.

**And re-measuring the fix found a second thin margin**, which is why one pass
was not enough: stepping the change at 48rem left **4.1 px** spare at 769 px
and moved the font size across a single pixel of resize. The step is at
**64rem**, where the drawing's two dense widths end. Re-taken, the spare is
+171.9 / +67.9 / +10.9 at the four-across widths and **+2.4 at 390**. Below
~385 px of viewport it stops fitting, which is narrower than any width this
product states — recorded in the stylesheet rather than left to be
rediscovered.

### The shared qualifier was stating one proxy's basis as a claim about all four

`qualifierOf` took the **newest observed** figure's `changeBasis` and rendered
it as an unqualified line under the whole strip. `changeBasis` is **per
security**, so two proxies with previous closes in different sessions — which
a gapped store produces ordinarily — give one true and one false basis under
one sentence. The code claimed the uncovered ones _"say so themselves"_ in the
exception line; they do not, because that line carries only an **instant**, and
only when a proxy is behind.

**The clause is dropped when the measured figures disagree.** ADR 0029: when
_against what_ has no single answer, the honest line states only the instant.
Two details that would each have spelled disagreement as agreement:
`sharedBasis` consults **only figures carrying a `changePercent`** — a proxy
with a price and no measurable change has an opinion about nothing — and
`undefined` is a **value** there rather than a gap, being `LiveChange`'s
same-session previous close, so a named session against an unnamed one is a
disagreement and a `?? "…"` default would have hidden it.

### The first-paint state was the terminal state

`overview` is only ever written by an overview frame. When none arrives —
unreachable backend, a proxy blocking the socket, the deploy window — the
reserved box was not a flash but the **final** state: a 1392×183 panel with the
heading and nothing in it, its ARIA snapshot the heading and silence, while the
six regions below were hatched and each said what they were waiting for. **The
one region that was the payoff was the only one on the screen saying nothing.**
A second route to the same hole: `overview.figures === []` fell through a guard
one `||` too narrow, collapsing the grid to height 0.

**This fires `docs/GAPS.md` entry 13, whose owner is a condition — _the next
story that adds a region_ — and this is that story.**

The floor is measured rather than argued: navigation to a figure on screen took
**277 / 174 / 182 / 193 / 184 ms** over five runs, and the wait is **2,000 ms**,
an order of magnitude above the slowest, so the ordinary case never shows it.
The sentence is **`No prices yet.`** — deliberately not _No prices stored for
these four yet_, because that is a claim about the **store** and in this state
nothing has told us anything about the store; it would invent the missing fact.
It uses the `No … yet` shape the product already has, with nothing after it,
because nothing after it is what is known.

### Gates

`pnpm verify` green — `32 invariants hold.`, 36 components / 36 stories, 470
documents and 0 broken links, frontend 1,185 tests, backend 973, shared 345,
process 41, **no `Unhandled Errors` block**. `pnpm e2e` **166 passed, 15
skipped, 0 failed** — an earlier run's single `security-feed-degraded`
failure was a pre-existing race on a page this task does not touch, not
reproduced on a scoped re-run or on two later full runs.
`a-second-clock-on-the-landing-page` red and restored byte-identical — **it had
rotted**, its `find` anchored on `export function MarketOverview() {`, which
this task's two new props moved, so nothing would have gone red in the
meantime. That is the fourth break to rot in three tasks and the fourth
`every-break-can-still-land` could not see.

### Renamed, and the reserved space is a character

The component is `MarketProxyStrip`; `MarketSummaryStrip` was the last live
`Summary` spelling for a region that no longer has that name, and it is what a
future reader would have grepped for and not found. And the reserved rows hold
a named `NBSP` constant rather than `{" "}` — the behaviour was already right,
but **the whole reservation scheme rests on a whitespace-collapsing edge case
that the comment said was guarded by a character that was not there**. Verified
red by substituting a regular space.

## For a stakeholder — a status report, 2026-09-26

### What this was

**The payoff.** Four index funds — the S&P 500, the Nasdaq, the Dow and the
Russell 2000 — now sit across the top of the landing page with their price and
their move, updating on their own during a session. Four pieces of groundwork
went into this and it is the first one a person can see.

### What we found by looking rather than testing

**A layout fault invisible at three of the four screen sizes.** Before any data
arrives the strip holds space for what is coming. It was holding space for one
figure instead of four — and because a wide screen puts one and four on the
same line, it looked perfect at every size except a phone, where the page
jumped by 70 pixels the moment the first price landed. Thirty seconds of
looking at the page found it; nothing mechanical could.

### The part worth telling

**Two of our own written requirements contradicted each other, and the code
followed the wrong one correctly.** One said four figures fit side by side down
to a certain width; another said the case to design for was a four-digit price.
Both cannot hold, and the developer followed the one expressed as arithmetic —
which was the right call. Measured, the figures needed two more pixels than a
phone screen gives them. Nothing breaks today, because none of these four funds
trades above a thousand.

That was our specification's fault, not the implementation's, and it is worth
saying because the second attempt found another one: the first fix left four
pixels of margin, which is close enough that a different typeface or a
different machine would have eaten it.

### The thing we would have shipped

**When the data never arrives, the strip said nothing at all** — an empty
titled box, while every other region on the page politely explained what it was
waiting for. Not a flicker: the permanent state, for anyone whose connection to
us is blocked. It now says `No prices yet.` after two seconds — two seconds
being ten times the slowest normal load we measured, so nobody sees it in
ordinary use.

Its wording was argued over and the argument is the point: the obvious sentence
was _No prices stored yet_, and we cannot say that, because in this state
nothing has told us anything about what is stored. It would invent the fact
that is missing.

### Where this leaves the work

**A user can now open MarketPulse and see the market's four headline numbers.**
Four tasks remain: honest dating of those figures, where the numbers came from,
the browser tests, and the close.
