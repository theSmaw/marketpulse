# Task 5.4.3 — The region draws, ranked by percentile

**Status:** Complete — 2026-10-16 — `/`'s **last reserved region draws**, ten rows, **one height in all 42 state×viewport cells with `scrollHeight === clientHeight` in every one**; the percentile ranks `Math.abs` so a crash and a spike were the identical row until a tinted direction glyph shipped; the canvas **beat my own row count** (five left a third of the box empty) and **lost** the head-slot badge to `Movers`' recorded refusal; and the frame's own decoder refused a hand-built fixture on the tie-break, which is better evidence than any test written for it
**Story:** [5.4 `Unusual activity` on the Landing Page](STORY.md)
**Depends on:** 5.4.2

## Objective

The landing page's **last reserved region** stops being a placeholder.

## What the user can see when this lands

**`/` draws a short ranked list of the securities whose recent five-minute move
sits furthest out in their own 60-session history** — each row with its rank,
its **ticker as the only link**, its company name and its **percentile
ordinal**. Every row opens a security page that already explains the figure,
because Stories 5.1 to 5.3 filled that screen first.

## Work

- **`RankedList`'s third use**, with `bar: "none"` and
  `quietGroup: "impossible"` — its set **is** the ranking's output, so the quiet
  group has zero members in every state there is and reserving its 25 px heading
  would cost a row. The component already ships AC 4 and AC 5 whole: the printed
  ordinal, symbol-keyed roving stops that **clamp rather than wrap**, the
  ticker-only anchor with its destination resolved at render, held pads as room,
  the FLIP on transform with `--motion-duration-settle` twice, and DOM order
  equal to visual order.
- **The row shape is MEASURED, not argued.** The region is in the narrow column:
  **~308 px of content at 1440, ~323 at 1024, ~686 at 768, ~308 at 390** — so it
  is the _narrowest_ region at the _widest_ viewport, and the width is
  **non-monotonic**. Every shipped `RankedList` use is ≥595 px, so this is new
  geometry. Restate the track list at **all four** widths, inherit none, and keep
  `.bar` in the hide list at every one — leaving it out grows an implicit `<li>`
  and makes every row 33 px instead of 26, invisible below `pnpm probe`.
- **The ordinal, not a band chip** (Gate 1 decision 1). It carries no `%`, spells
  the word `percentile`, and is untinted — the four channels that separate it
  from a price change. One home: `percentileReading`.
- **Held pads carry no `href`.** `visibility: hidden` plus `aria-hidden` do
  nothing whatever to an anchor, and `RankedList` has shipped that defect once
  already by passing `held={undefined}` as a hard-coded constant. The pads must
  also be **present in the array the FLIP is handed**, or every destination is
  read off the wrong row.
- **The arrival disc keeps its shipped meaning** and is not re-pointed at the
  figure. It fires when **a bar arrives for that security** and on nothing else.
  A percentile is the first figure in this product that can change with **no bar
  for its security at all** — its peers moved, or the window rolled — and a
  second meaning for one mark is this product's most-repeated defect.
- **Repair `ORDER HELD` while a re-taken pin moves every row**, routed rather
  than repaired by Story 4.7. This is the first region whose rows move with **no
  arrival mark anywhere on the page** to account for the movement, so the badge
  is the reader's only signal and it is currently wrong.
- The honest-nothing noun is the region's own and is **not** `No moves to rank
yet.` or `No prices yet.` — one noun per region is what tells a reader which
  region went quiet when two do at once.
- The reservation is **the real component, never a `min-height`**, and it is
  **two boxes**: the held geometry keeps its own unconditional
  `visibility: hidden` + `aria-hidden` and the sentence is a **sibling** in the
  room it holds, because `visibility` is inherited by children that never set it
  and the one-box version leaked internal slugs into the accessibility tree for
  ten days.

## Done when

1. The region draws rows on `/`, and `pnpm probe` at four widths shows **one
   height in every state** with the screenshots looked at.
2. A browser spec reaches a row by keyboard and by pointer, proves the **figure
   is not a link**, and proves arrows clamp.
3. A browser spec that is **not a pass-through**: the rank order is recomputed
   from the row's own factor values, and an **out-of-frame** claim grounds it
   (`GET /market-data` for whether this deployment has a provider at all).
   Proved green first on a planted producer defect — `percentile + 7`, or 5.3's
   `rank × 0.8 when n > 500`, which left a golden sample green.
4. `ORDER HELD` is correct across a re-taken pin, asserted.
5. `pnpm verify` and `pnpm e2e` green.

## Amended by Task 5.4.1 — 2026-10-15: the box is measured, so the row budget is no longer a guess

**The region is now `342 × 491` at 1440 and `357 × 491` at 1024** (`pnpm probe`,
2026-10-15), against `342 × 161` and `357 × 161` before. At 768 and 390 the
≤860 block is unchanged and the region is content-sized.

**Two figures to build against rather than re-derive:**

- **Content width ~308 px at 1440 and ~323 at 1024** — `342 − 2` border
  `− 32` padding. The brief's 308 figure was right, and the **non-monotonicity
  is real**: 1024 is _wider_ than 1440 for this region, and 768 (686 px) is the
  outlier with room. Design the row at **308** first.
- **The row budget is ~332 px** — 491 outer less the region's own **159 px** of
  chrome (border 2, header 47, body padding and `.content` margin 48, list
  heading 16, two-line footer 48). At the measured **27 px pitch**
  (`27N − 1`) that is **twelve rows maximum**, so a five-row list at **134 px**
  has ~198 px of slack. **The slack matters**: `Movers` had to reserve a
  _third_ footer line because its claim wraps at 390, and this region states
  more populations than `Movers` does, so a third line here is affordable
  where it was not before.

**AC 1's row count is therefore answerable, and it is a product choice within
12 rather than a constraint.** `PRODUCT_SPEC.md` §9's panel is a short list;
take the number deliberately and state it in the region's head slot the way
`Movers` states `Top 5 each way`.

**And the instrument now exists**: `pnpm probe / --viewports 1440x680,1440x700`
replaces the hard-coded viewport table rather than filtering it, and prints
`clientHeight` against `scrollHeight` per element when they differ. Use it —
it is what found a shipped region scrolling its own placeholder sentence.

## Amended by the canvas page — 2026-10-16: three figures in the amendment above are WRONG, and two decisions are taken

**`Unusual activity on the landing page.dc.html` now exists** — the canvas's
first page for this region, six sections plus six drawn states. Authoring it
falsified three things in the Task 5.4.1 amendment above, which is mine. The
amendment is left standing as the record; **this section wins.**

**1. The ceiling is ELEVEN rows, not twelve.** The five chrome terms sum to
**161 px, not 159**, and the footer term was taken at 48 where two reserved
micro lines plus a 12 px pad is 44. Re-derived, chrome is **`125 + 16K`** for
`K` reserved footer lines — and this region needs **four**, because it states
**three populations and a cut** where `Movers` states one population and had to
buy a _third_ line for that. At `K = 4` the row budget is **302 px**, so
`27N − 1 ≤ 302` gives **N ≤ 11**. **Twelve overflows by 21 px** and, because
rows 2 and 3 share one `fr`, drags `Sector performance`, `Movers` and
`Market breadth` with it. **The region ships five rows**, consistent with
`Movers`' `Top 5 each way` and `PRODUCT_SPEC.md` §9's short panel, leaving real
slack rather than spending the ceiling.

**2. `.bar` must NOT be in the hide list — the instruction in Work above is
wrong.** A `bar: "none"` use never renders one: `barCell` is `undefined` when
`scale` is, and the `mover` branch omits it. **The real hazard is the opposite
shape**, and it is live: `layout = signed ? "sector" : "mover"` would silently
give this third use `.movers`' **five**-track list with **four** children, so
`.movers .figure { grid-column: 5 }` leaves the 80 px price reserve empty —
**92 px of dead track in a 308 px row**. The repair is a **third `layout`
value**, not a hide rule. The component's own recorded reversal trigger (_bar
off **and** the label leading_) does not fire on this use.

**3. "Every shipped `RankedList` use is ≥595 px" is false.** Both variants have
shipped at **308 px** in their 390 bands since Story 4.3 and Task 4.5.8, so the
geometry is **inheritable rather than new**. The narrower true claim: no shipped
use has drawn a **16-glyph figure** in any band.

### The two decisions taken by the owner on 2026-10-16

**A direction glyph ships in the row.** The percentile ranks the **absolute**
move — `return-percentile.ts:129` takes `Math.abs(percent)` and the module
documents itself as asking _how far from zero the move is and not which way it
went_ — so without it **a −9% crash and a +9% spike draw an identical row**,
same ordinal and same rank, on the region a reader scans to decide where to
look. A tinted `▲`/`▼` in an otherwise untinted ordinal cell: the **glyph and
the sign** carry it and hue only reinforces, because colour is never the sole
encoding of anything.

**The ordinal is drawn short and the word moves to the list heading.** `99th`
in the row under a heading naming the basis, **spoken whole** through
`Movers.spoken`'s shipped shape — which is what buys the company name 125 px.
Story 5.3 established the spelled word as one of four channels separating this
figure from a price change; here the heading carries it **once** rather than
every row, and the spoken string is unchanged.

### And AC 11's noun is stale

`No scores yet.` is a claim about a figure **this story does not compute** —
Gate 1 decision 1 removed the score. Two nouns ship instead, because the two
repairs differ: **`Nothing ranked yet.`** and **`Nothing ranked while the market
is shut.`** One noun per region is what tells a reader _which_ region went quiet
when two do at once.

### Two traps the canvas found in the stylesheet, worth fixing while you are here

- The region's `header` is **47 px filled and 51 px reserved** (the `EPIC 5`
  tag's 26 px `meta`), so **deleting the placeholder shrinks the chrome by
  4 px** — a figure that moves in the opposite direction from the one anybody
  expects.
- `.figure { font-size: micro }` in the `<37rem` block is **unscoped** and would
  silently step the ordinal to 11 px.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-10-16

**The landing page's seventh and last reserved region draws.** Ten ranked rows,
read off the `unusual` section Task 5.4.2 put on the overview frame.

New: `apps/frontend/src/market/unusual-activity.ts`,
`apps/frontend/src/components/Unusual/` (component, module CSS, tests,
stories), `e2e/specs/overview-unusual-keyboard.spec.ts`,
`e2e/specs/overview-unusual-ranking.spec.ts`, `e2e/support/unusual.ts`.

Changed, load-bearing: `readUnusual` / `readUnusualRow` / `readUnusualBaseline`
/ `readRefusalTally` called from `readOverview` with **five cross-field checks**;
`isRankedByPercentile` in `packages/shared`; `percentileOrdinal` extracted and
`percentileReading` **derived from it**; `RankedList`'s third `layout`;
`DirectionGlyph` extracted from `PriceChange`, which is now its first caller;
and the **`ORDER HELD` repair** in `Region.tsx`.

### One height in every state, at every width — 42 cells

Furnished through the shipped socket **and the shipped decoder**, 2.4 s settle:

| state                  | 1440×900 | 1024×900 | 768×800 | 390×780 | 1440×700 | 1440×680 |
| ---------------------- | -------- | -------- | ------- | ------- | -------- | -------- |
| 10 ranked              | **491**  | **491**  | **458** | **458** | **491**  | **491**  |
| 10 ordinary ordinals   | **491**  | **491**  | **458** | **458** | **491**  | **491**  |
| 3 ranked + 7 held      | **491**  | **491**  | **458** | **458** | **491**  | **491**  |
| 1 ranked + 9 held      | **491**  | **491**  | **458** | **458** | **491**  | **491**  |
| nothing ranked, open   | **491**  | **491**  | **458** | **458** | **491**  | **491**  |
| nothing ranked, shut   | **491**  | **491**  | **458** | **458** | **491**  | **491**  |
| no frame (reservation) | **491**  | **491**  | **458** | **458** | **491**  | **491**  |

**`scrollHeight === clientHeight` in all 42** — 489/489 wide, 456/456 narrow,
**1440×680 included**, which is where this story's founding measurement came
from. Widths 342 / 357 / 720 / 342; row tracks `15 68 125 64` at 1440 and
`15 64 141 64` at 390, restated at each width and inherited at none. The name
track is **non-monotonic** — 141 px at 390 against 125 at 1440 — exactly as the
canvas derived it.

### The figure ranks a MAGNITUDE, which made two opposite events one row

`return-percentile.ts:129` takes `Math.abs(percent)` and the module documents
itself as asking _how far from zero the move is and not which way it went_. So a
**−9% crash and a +9% spike drew an identical row** — same ordinal, same rank —
on the region a reader scans to decide where to look. A tinted `▲`/`▼` ships in
the row: **glyph and sign carry it and hue only reinforces**, because colour is
never the sole encoding of anything. `DirectionGlyph` was extracted from
`PriceChange` rather than copied, so the three hues and the three words have one
home.

### The canvas beat me on one decision and lost the other

**Ten rows, not five.** My brief and my own Task 5.4.1 amendment both said five;
the canvas measured that five leaves **168 px of empty region** at 1440 and
1024 — a third of the box — and the owner took the canvas's side. The height is
fixed by the shared `fr` either way, so the rows cost no layout.
`27 × 10 − 1 = 269` against a **302 px** budget at four reserved footer lines:
chrome 189, content **458**, slack **33 px**. The ceiling of **11** is not
spent, and 12 overflows by 21 px and would drag `Sector performance`, `Movers`
and `Market breadth` with it.

**No `N of M` in the head slot.** The canvas drew `3 of 5 ranked`;
`Movers.tsx:334` records the refusal of exactly that — _"a second `N of M` badge
at a different denominator over a different set is two correct badges reading as
one pattern"_ — and the re-area made it **worse than when that was written**,
because `Sector performance` and this region are now **side by side on grid
row 2**, adjacent rather than 200 px apart. The slot states the **bound**:
`Top 10`, mirroring `Top 5 each way`, four glyphs in a 101 px reserve, and it
does not repeat the list heading 16 px below it. Silent when nothing ranked.

### The ordinal is short in the row and whole in the heading

`99th` per row, with `percentile` moved into the list heading and **spoken whole**
through `Movers.spoken`'s shipped shape — which is what buys the company name
125 px. Story 5.3 established the spelled word as one of four channels separating
this figure from a price change; the heading now carries it **once** rather than
every row, and the spoken string is unchanged. The canvas's drawn states used a
clipped short form at two widths; **measured, the long heading fits whole at
308 px**, so the canvas was pessimistic and the measurement won.

### Bytes at ten rows — 2,699, and three earlier figures are superseded

| shape                                                 | bytes     |
| ----------------------------------------------------- | --------- |
| fixed section, no rows                                | **370**   |
| first row                                             | **232**   |
| five rows (1,164 of rows)                             | 1,534     |
| **ten rows (2,329 of rows)**                          | **2,699** |
| CI's shape — no rows, no generation, every count zero | **303**   |

`10 × 232 = 2,320` and **the nine commas between rows are nine bytes**, so the
rows cost 2,329. **232.9 B a row against the movers' measured 124.3 B** — 1.9×,
and 118 of the 232 are the two timestamped endpoints with a tape each, which
`MeasuredReturn`'s rule requires rather than tolerates. Superseded: Gate 1's
`223 B a row / 1,281 B at five`, whose own two numbers disagree
(`1,281 / 5 = 256`) and which was taken on a shape carrying a `band`; AC 8's
`~2.4 KB a section`, which presumed ten rows and is the closest of the three.
**Against the 3,256 B frame this is +83% with ten rows drawn and +9.3% in CI's
permanent state** — past the **+74%** approved at Gate 1, taken knowingly by the
owner with the figure in front of them. The test asserts bare, one, five **and**
ten, each **read rather than multiplied**.

### The decoder refused a hand-built frame, which is the best evidence it works

The ten-row furnishing put `MNST (96)` before `GOOGL (96)` and **`readUnusual`
refused the whole section** — the tie-break is ticker-ascending — so the region
fell to its rollback shape. Corrected and re-run. That is the fifth cross-field
check catching a frame a person built by hand, which is stronger evidence than
any assertion written for it. The same mechanism means a planted
`106th percentile` **cannot reach the screen at all**.

### A pass-through proves fidelity and never correctness — demonstrated again

`overview-unusual-ranking.spec.ts` has three arms. Against a producer planted to
invent an `NVDA` row when its candidate set is empty:

```
✘ a deployment with no provider has observed nothing, so it ranks nothing — and any row it drew would be fabricated
    Expected: 0   Received: 1
✓ the three populations nest and the set is the one the universe says it is
✓ every ordinal is inside the bound the figure can hold, and the list is in the one order its own rows admit
```

**The two frame-derived arms are GREEN on the fabricated row.** Only the
out-of-frame arm sees it — `GET /market-data` answering `{"feed":null}` means
nothing was observed, so any row is fabricated **by construction**. This is Task
5.2.4's doctrine reproduced on a third surface.

### The 92 px dead track is a COMPILE error rather than a check

`RankedList`'s bar union gained a required `figure: "change" | "ordinal"` on its
`kind: "none"` arm, so a third use silently inheriting `.movers`' five-track
list with four children — leaving the 80 px price reserve empty, **92 px of dead
track in a 308 px row** — does not compile. It fired on all five existing call
sites when added. `.bar` is **not** in any hide list: a `bar: "none"` use never
renders one, which is the instruction in the Work section above being wrong.

### `ORDER HELD`, repaired

`focusout` now defers one microtask and asks `document.activeElement` rather
than trusting the event. That closes **both** triggers — `relatedTarget` alone
would have closed only the arrow press, because a removal's `focusout` carries
no related target. The two tests that characterised the defect are rewritten to
assert the repair and **went red on it first**, with the pinned order held.

### One guard added, proved green on its own defect first

`one-home-for-the-ordinal-suffix`. The naive draft — _`percentileOrdinal` is
declared once, in the home_ — was **green** on a plant that is the file Story 5.6
writes, rendering `` `${String(rank)}th percentile` `` with no import:

```
NAIVE DRAFT GREEN — `percentileOrdinal` is declared once, in apps/frontend/src/market/return-percentile.ts.
```

The shipped clause is **the suffix beside a number**, which a re-implementer
cannot avoid. Red on the same plant, and measured over the three shipped trees:
**5 matches, all in the home, no false positive.**

**And a duplicate check was deleted rather than shipped.** The same procedure for
the track-list hazard found that `every-row-variant-restates-its-tracks`
**already** went red on the plant, in the same run. One home for one claim.

### Three breaks, and two of them had rotted

All hand-performed with checksums, because `pnpm break` refuses a dirty target.
**`a-second-speller-for-the-ordinal`** is new. **`the-landing-page-asks-only-for-the-proxies`**
had rotted and `every-break-can-still-land` caught it — repointed to the
**declaration line** rather than the spread list, so the next section cannot rot
it a third time. **`a-row-per-security-on-the-landing-page`** had rotted because
its plant **was** the `Unusual activity` placeholder this task deletes;
repointed to `Current investigations`.

### What was deliberately not taken

**The footer**, which is Task 5.4.4's by its own `Work` list — the three
populations, the cut and `OverviewSourceNote`'s third source. **Its room is
reserved now**: `.claim` holds **four** micro lines, not `Movers`' three, so when
5.4.4 writes the sentences **the region does not grow**. That four is the one
term in the height ledger that could still move the row count.

### One seam, documented with a reversal trigger

`WireUnusualActivity` carries no basis of its own, so to tell `Nothing ranked
yet.` from `Nothing ranked while the market is shut.` the region reads
`overview.breadth.basis` — the frame's one eligibility pass, which
`Market breadth` and `Movers` also state. **Reversal trigger:** _the first state
in which this region's population and breadth's are taken on different bases._
It falls back to the open-market noun when breadth is unreadable. A section-level
basis is a wire change and belongs to 5.4.4 or 5.4.5.

### Gates

`pnpm verify` **exit 0** — `45 components, 45 stories files`, `576 documents,
1861 cross-file links, 0 broken`, **`61 invariants hold.`**, shared 507, backend
1161, frontend 1608, process 60, all passed, no `Unhandled Errors` block.
`pnpm lint` and `pnpm format:check` clean.

Scoped `/` specs — `overview-unusual-keyboard`, `overview-unusual-ranking`,
`overview-degraded-stops`, `overview-frame-sections`,
`overview-no-element-per-security`, `overview-ranked-keyboard`,
`overview-movers-hold`, `overview-region-order`, `overview-focus-ring`,
`landing-route`: **38 passed, 1 skipped** (the recompute arm, with its reason
printed, because this deployment ranks nothing).

`pnpm test:database` **not run** — the data layer is untouched.

**The full browser suite: 260 passed, 17 skipped, 3 FAILED — and the three are
the documented family.** Taken on a settled machine, load read **before** at
**4.24** on eight cores (ratio 0.53, settled by `docs/GAPS.md`'s own criterion)
and **28.61 after**, which is that document's own point: four Chromium
processes on eight cores **are** the load, so the suite is its own plant.

The three were `securities-route.spec.ts:107`,
`security-holiday-week.spec.ts:217` and `security-price-chart.spec.ts:909` —
**all three named in `docs/GAPS.md`'s own ranked table of tests nearest their
own timeout**, at 16.7 / 16.9 / **24.9** s, 16.1 / **47.4** / 29.8 s and
24.5 / **31.1** / 14.1 s against a 30 s budget. None is on `/`; none touches a
file this change modified. **Re-run scoped on a settled machine (load 5.87):
38 passed, 15 skipped, 0 failed in 43.3 s.**

So **0 of 4 full runs today were clean**, against that entry's recorded
_"0 of 3 settled runs"_ and its conclusion that **a clean full run is not the
common case and a settled machine is not the cure**. CI is the arbiter for the
suite as a whole, on a machine with different contention, and it produced a
clean `e2e` for both of this story's earlier PRs (12m6s and 11m27s).

The implementing developer's own full run is **separately discarded**: it
started `pnpm lint` alongside, which the working loop forbids, so it measured
its own contention rather than the code. And
`market-gateway.process.test.ts > leaves a HEALTHY client on the same process
untouched` failed **2 of 7** executions with a dev pair running and **0 of 4** on
a quieter machine, against a backend tree with **no changes at all** — reported
rather than attributed, and at that rate one green run does not clear it.

### Owed

Three `pnpm break` registry runs on a clean tree, post-commit.

## For a stakeholder — a status report, 2026-10-16

**The landing page is finished.** Its last empty panel now lists the ten
securities whose last five minutes look least like their own recent history —
each with its rank, its ticker as the only clickable thing, the company's name,
and how unusual the move is expressed as a percentile of that company's own past
sixty sessions. Every row opens a page that already explains the figure, because
the three earlier stories in this epic filled that screen first.

**One defect found here was worth the whole task.** The figure this region ranks
on measures _how far from zero_ a move is, deliberately — so a share that fell
9% and one that rose 9% were producing **the identical row**, on the one list a
reader scans to decide where to look. A small up or down arrow now carries the
direction, and it is drawn so that it still reads in greyscale, because this
product never lets colour be the only thing distinguishing two facts.

**The design canvas and I disagreed twice, and we were each right once.** It
argued for ten rows against my five, with a measurement — five left a third of
the box empty, which is the first thing a stranger would notice — and it won. It
also proposed a small `3 of 10` counter in the region's corner, which lost: the
neighbouring region already has one at a different denominator, they now sit side
by side, and two of those read as one pattern that means nothing. The region says
`Top 10` instead and the counts go in the footer.

**The region is one height in every state it can be in** — forty-two
measurements across seven states and six window sizes, all identical, and
nothing scrolls inside it anywhere, including the short window where this story's
original problem was found. So nothing on the page moves as data arrives or stops
arriving.

**What was checked, and what that does not prove.** A new test was deliberately
written to fail first against a server rigged to invent a figure — and two of its
three arms **passed the lie**, because a test that only checks the page agrees
with the server proves faithfulness, never correctness. Only the arm that asks
_does this deployment even have a market feed_ caught it. That is the third
surface in this epic to demonstrate the same thing.

**Honest limits.** Nothing is deployed, and **no person and no automated test
machine has ever seen this region draw a single row** — the test environment has
no price history at all, so it shows the honest empty state for ever. The region
will also be empty while the market is shut, which is most of the week, until the
next-but-one step writes a nightly record.
