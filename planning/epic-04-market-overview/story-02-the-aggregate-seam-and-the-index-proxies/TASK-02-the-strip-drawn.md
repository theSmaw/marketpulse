# Task 4.2.2 — The strip drawn: four figures side by side, and what 390 does with them

**Status:** Not started
**Story:** [4.2 The Aggregate Seam, & the Index Proxies That Move](STORY.md)
**Depends on:** nothing — runs beside 4.2.1

## Objective

**Four figures side by side is a component this product does not have**, and
the story says so. The nearest relatives are two, not one, and the story names
only the further of them:

- **`SecurityIdentity`'s close block** is closest on the _treatment_ of a price
  — label, figure, qualifier as three lines that move together, the arrival
  disc, `PriceChange` on the baseline. It is designed for **one** number with
  room around it and does not stretch.
- **`MetricStrip`** is closest on the _arrangement_ — a `<dl>`, figure over
  label, a `--metric-columns` override, and an existing measured four-across
  precedent. Its own header settles the seam: it refuses to carry direction on
  purpose, and _"the day a strip needs to say a figure has risen, the component
  for that already exists — `PriceChange`."_

So the grid is solved and the direction is solved. **What is unsolved is
everything between them**, and 390 is the part that is a judgement rather than
an arithmetic.

## What the user can see when this lands

**Nothing on the running product.** A drawing exists that the next three tasks
build against. Task 4.2.5 is the payoff.

## Work

- **A new canvas file**, `Market summary — the four index proxies.dc.html`,
  in six sections: 1440 with its tracks stated; the anatomy of one cell with
  every reserved slot marked; 1024 / 768 / 390 each **restating its tracks**;
  every state including the one with no figures at all; the arrival mark's
  third geometry drawn beside the two shipped ones; and the shared qualifier
  line checked against the universe table's heading claim and the source note.
- **An amendment to `Market overview.dc.html`** §01 and §04, drawing the strip
  **filled** where it is currently drawn deferred — and carrying the region's
  new name (see the constraint below). An amendment rather than a second file,
  because ADR 0026's rule is that a design which does not fit the main canvas
  gets its own file, and this one fits the screen it sits on.

## Constraints this task is handed, each with its source

- **390 is two by two.** Measured, not argued: `pnpm probe /` on 2026-09-26 puts
  the region's content box at **342 px** at 390, so four across is 85 px a
  column and a formatted price plus a signed percentage does not fit at any size
  this language uses. The canvas already decided 2×2 in `Market overview.dc.html`
  §04. A horizontal scroller hides two of four facts behind a gesture on the one
  screen whose job is a picture of the whole market — and this product has met
  that defect once already, in a masthead that read `Market O` with no
  affordance saying so.
- **`repeat(2, minmax(0, 1fr))` explicitly, never `auto-fit`.** `MetricStrip`'s
  own comment carries the reason: `auto-fit` answers a shortage of width by
  dropping a column, and three prices with an orphaned fourth is worse at every
  width than four narrow ones. `minmax(0, 1fr)` is also what stops all four
  cells resizing when one figure crosses from `999.99` to `1000.00`.
- **The type scale is `--font-size-metric` (20px), not `--font-size-display`.**
  `VISUAL-LANGUAGE.md` spends the display size **once per screen**; four of them
  spends it four times and makes the topology's reserved band — §9's stated
  centre of gravity — read as a footnote. `type.module.css` already names
  `.dataMetric` for exactly this job.
- **The qualifier goes once, under the strip, not once per proxy.** Four copies
  of `14:01 EDT · pre-market · change from 2026-09-11's close` is a paragraph,
  and at 390 it is four. This is the shared-claim idiom the universe table
  already uses for sessions, with a per-proxy exception line for the one that
  disagrees.
- **The arrival disc needs a third geometry.** Both shipped positions are
  absolute into a margin that already exists (`right: calc(100% + …)`), and a
  four-across grid of left-aligned columns has no such margin at 1440 and
  certainly none at 390. Draw it **in the label row, immediately after the
  symbol, in a statically reserved slot** — which also reads better, because a
  disc beside `SPY` says _a bar arrived for SPY_, which is what the mark means.
  The motion layer's header licenses this: _"What is here is appearance and
  behaviour; POSITION is the consumer's."_
- **No stagger, and four fire at once.** A stagger encodes an order the data
  does not have. Read `The mark multiplied by five hundred.dc.html` before
  drawing this — it is this product's existing answer to many marks at once.
- **No new tokens.** Every value this needs already ships;
  `--font-size-metric`, `--font-size-micro`, `--font-size-dense`,
  `--letter-spacing-micro`, `.dataMetric`, `.microLabel`, `.arrivalMark`,
  `--motion-duration-decay`, the price palette and the space ladder. Two things
  that must **not** become tokens, both with precedent: the column expression
  (a proportion has no token ladder) and the strip's min-column floor (a height
  token would be _"a measurement of one viewport declared as a constant"_).
- **The region is renamed `Market proxies`** — decided at Gate 1, because that
  is already the product's word for these four in the `/securities` group
  heading and on the security page's classification line. Draw the new name.
- **Colour is never the sole encoding**, and `PriceChange` already owns the
  pairing. The strip must not spell a sign or a glyph itself.

## Done when

1. The new canvas file exists with all six sections, and 390 restates its tracks
2. Every state is drawn, including the one with four proxies and no figures
3. The disc's third geometry is drawn beside the two shipped ones, with the
   argument for moving it
4. `Market overview.dc.html` shows the strip filled and named `Market proxies`
5. No value on the drawing requires a token that does not exist

---

## What was done — 2026-09-26

**Two files on the canvas: `Market proxies.dc.html` (new, 601 lines, seven
sections) and `Market overview.dc.html` (amended, 50,365 → 55,957 bytes).**

### The drawing found two defects on the canvas itself

**The canvas is the source of truth (ADR 0026), and §01 already drew this strip
filled — wrongly, in the exact way this task's own constraint was written to
prevent.** It used `grid-template-columns: repeat(4, 1fr)`. A bare `1fr`
carries a `min-width: auto` floor, so the first price crossing
`999.99 → 1000.00` widens its column and **moves all four**. The constraint
citing `minmax(0, 1fr)` was sitting one document away from a drawing that
contradicted it. Corrected, together with the vertical rules it drew: divider
plus padding is where the same shift creeps back, and the gap and the
left-aligned label already carry the separation.

**And §04 said the strip drops to two per row at 1024, annotating 768 as
`2×2`.** False, with the arithmetic now on the drawing: at 768 the region's
content box is **694 px**, giving **163 px** a column against `MetricStrip`'s
own stated 7 rem (112 px) floor. Only 390 cannot hold four. What gives way at
1024 is the **index name**, not a column. The correction is flagged in the
amended prose rather than silently overwritten, because this task file had read
§04's `2×2` as a decided 2×2 at 768 and it was not one.

### One figure in this task file was loose, in the safe direction

`342 ÷ 4 = 85 px` ignores the frame's border, its 22 px of padding and three
20 px gaps. **The honest figure at 390 is 64.5 px**, and a six-glyph price at
`--font-size-metric` is 72 px on its own — so four across at 390 cannot render
**one** of the four figures. Two by two gives **149 px**.

**And the binding case at 390 is not today's prices.** `1234.56` at 20 px mono
is 84 px; a 13 px change beside it needs 55 px plus an 8 px gap — **147 against
149**, two pixels of margin. So the change steps to `--font-size-micro` at 390
(138 px, eleven to spare) and **the figure never steps down**.

### The threshold rule, so a future width answers itself

Four across survives while every column clears the 112 px floor, which needs a
content box of **`4 × 112 + 60 = 508 px`**. Stated on the drawing rather than
left as four breakpoint facts.

### The synchrony question: narrowed, not settled — and a prior question found

`The mark multiplied by five hundred.dc.html` does **not** overrule the
objection, and its own panel is why. Its defence of 518 simultaneous marks is
**rate** — §7.4's 332 bars inside a 243 ms burst, so the trigger's words
(_fires more than once a second_) were never met — which is an argument about
cost, and four marks cost nothing. The one perceptual reading it offers is
discs at full density forming _"a vertical column that reads more like
furniture than like events"_, and **that needs density to work**. Twelve marks
scattered down a table at 1440 is a texture; four on one horizontal line in a
103 px strip is a row of lights. That page files the whole question under
**"THE RISK THAT IS ACCEPTED RATHER THAN DISPROVED"**, answerable only by a
person watching a real session.

So §05 draws the shipped vocabulary, unchanged and unstaggered, and says the
drawing has not settled it.

**But a prior question may dissolve it, and it is cheap.** Task 4.2.1
established the gateway sends **up to ~16 `bars` frames a minute**, not one.
Each security still produces one bar a minute — but **whether SPY, QQQ, DIA and
IWM land in one of those frames or in four is unmeasured, and it decides the
question.** Four bars across four frames is a stagger the data genuinely has,
arriving free, and the objection evaporates. Four in one frame is the row of
lights. **Measure it from the gateway before the rehearsal**, not during: a
sitting that cannot say which of the two the watcher saw cannot answer
anything.

### The division of labour, and why it is a decision rather than an inherited rule

**The disc says a fact arrived; the advancing instant says it is still
arriving** — and they fail differently, which is the argument. When the feed
stops, the discs simply stop firing, an absence nobody notices; the instant
stops advancing and stays visibly wrong.

### Decisions taken here rather than deferred

- **The canvas file is `Market proxies.dc.html`**, not the name this task
  originally mandated. All three residues the designer flagged as out of scope
  turned out to be references to the **filename**, so the naming question and
  the residue question were one: a canvas whose §01 says `Market proxies` under
  a file called `Market summary …` cannot be told from a missed sweep.
  `Market overview.dc.html` is likewise named for its screen.
- **At 1024 the index name is dropped**, not truncated or abbreviated. An
  abbreviation appearing at one width is a fourth spelling of four names.
- **This is a new component rather than `MetricStrip` with props.**
  `MetricStrip`'s own header declines the job, and a three-part cell in fixed
  vertical order is reachable only through `display: contents`, which its
  comment refuses. Borrow the arrangement and the type, not the element.

### Gates

The canvas has no suite. Both files were written through `DesignSync`
(`finalize_plan` → `write_files`, 2 written) and `list_files` confirms
`Market proxies.dc.html` present and `Market overview.dc.html` updated. Tag
balance was checked per element type before writing. No repository file
changed, so no repository gate applies.

### A tooling finding that outlives this task

**`DesignSync` is unreachable from every subagent**, and it is not the
`list_projects` trap `CLAUDE.md` warns about three times — the tool is absent
from the subagent's registry entirely, so there is no method to call and fail.
Removing the agent definition's `tools:` allowlist did not fix it. The working
arrangement is that the **orchestrator proxies**: it reads the canvas, hands
the content over, and writes the authored file back. A large `get_file`
persists to a local file rather than into context, so the cost is small — but
it is a workflow constraint rather than a preference, and it belongs in the
`/story` skill.
