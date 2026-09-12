# Task 2.12.8 — The text alternative, and the walk that proves it

**Status:** Complete — 2026-09-12
**Story:** [2.12 Price Chart](STORY.md)
**Depends on:** 2.12.6, 2.12.7

## Objective

Give the chart a text alternative that **says something true**, and then walk
the page — keyboard, screen reader, greyscale, three viewports — the way Task
2.11.9 walked search, proving the properties a green `pnpm verify` and a green
axe run structurally cannot see.

The story names this as where charts usually fail, and it is right: a chart with
`role="img"` and the label "price chart" is a chart that has been made
technically compliant and conveys nothing.

## What the user can see when this lands

**A chart a person who cannot see it can still read.** The range, the change
over the period, the period itself, the feed — the same facts a sighted reader
takes off the plot, in a sentence. And a page whose every tab stop is visible,
including the chart's.

## Work

- **The text alternative says the things the picture says.** At minimum: the
  symbol, the window in market terms, the first and last price, the change, the
  high and the low, and the feed. Build it the way `series-announcement.ts`
  was built for the panel — a pure function, tested, not a template inlined in
  JSX — and reuse that module's vocabulary rather than inventing a second one
  for the same facts.

  **Assert the concatenation a screen reader is handed**, never a single
  element's text where the component splits it. That is on `CLAUDE.md`'s list of
  what a test must not assert, and it is there because this repository has been
  caught by it.

- **What the marks are in the accessibility tree** depends on what Task 2.12.1
  chose. A canvas has no DOM to describe, so the alternative is the whole of it;
  an SVG has one, so decide deliberately whether the marks are exposed or hidden
  and say why. Either way, 780 announced elements is a defect.

- **The keyboard walk, at more than one viewport.** `CLAUDE.md` records that a
  sticky header occludes focus and that the browser's scroll-into-view does not
  know it: measured on `/securities/NVDA`, **one** occluded stop at 1440×900,
  **four** at 768×800 and **two** at 390×780 — it worsens as the viewport
  narrows, so a development machine shows the least of it. The chart adds a tab
  stop to that page. Walk it at the same viewports the existing spec uses and
  extend that spec rather than writing a second one.

  And note the one repair does not help a target taller than the viewport: a
  full-width chart region at 390px is a plausible candidate, so measure rather
  than assume it inherits the fix.

- **Greyscale and colour-vision simulation**, over the finished chart rather
  than over the mark in isolation — Task 2.12.5 proved the encoding, this proves
  the composition, including gridlines, axis ink and the crosshair together.

- **The contrast floor.** Every ink the chart introduces is measured against the
  ground it sits on, and where a canvas value failed the floor, ADR 0026's
  exception applies and the measurement is recorded beside the token. Remember
  **a browser is the only level that can see contrast** — `getTokens()` throws
  in the test environment by design.

- **axe, scoped honestly.** Zero violations on the page, and never compared
  against a Storybook run — the addon scopes to `#storybook-root` and a
  whole-document run adds page-level rules a fragment cannot satisfy. And an axe
  pass is not accessibility coverage; this walk is the evidence, axe is the
  gate.

## Done when

- The text alternative is a tested pure function and states range, change,
  period and feed — and is correct in `partial` and `empty` as well as `loaded`
- The chart's marks have a deliberate, stated presence or absence in the
  accessibility tree
- The keyboard walk is extended to include the chart at all three viewports,
  and no stop lands behind the sticky chrome
- Greyscale and deuteranopia readings of the finished chart are recorded
- Every new ink carries a measured contrast figure
- axe reads zero violations on the security page
- `pnpm verify` and `pnpm e2e` pass

## Notes

The likeliest miss is the alternative that is true for `loaded` and false for
`partial` — "the price over the last five sessions" when the data covers four
and a half. The sentence has to be built from `coverage`, not from the window
that was asked for.

The second likeliest is a live region added here for the chart's reading, when
2.12.6 already settled the rate. Two polite regions updated in the same moment
are queued in an order neither component controls.

---

## Amended 2026-09-11 by Task 2.12.1 — the conditional in the Work section is settled

The Work section says _"what the marks are in the accessibility tree depends on
what Task 2.12.1 chose."_ It chose **hand-built SVG**, and it chose it **largely
for this task's benefit** — `CHARTING.md` §1 rejected the fastest library
candidate because it paints to seven canvases, leaving nothing to describe. So
the question does not collapse, it sharpens:

- **There is a DOM, and the decision to expose or hide the marks is now a real
  one that must be taken and stated.** The Work section's _"780 announced
  elements is a defect"_ is close to unreachable in the base chart, because a
  line of closes is **one `<path>`** rather than 780 elements — so the likely
  answer is that the `<path>` is `aria-hidden` and the text alternative carries
  everything. **Take that deliberately and say so**; arriving at it by noticing
  there was only ever one element is not the same as deciding it.
- **`role="img"` with a real label is the shape**, and the story's own warning
  applies with force: `role="img"` labelled "price chart" is the failure mode,
  not the solution.
- **The likeliest miss named in the Notes is now sharper.** The text alternative
  must be built from `coverage`, and `CHARTING.md` §6.2 makes the same point
  about the axis: the window **asked for** and the window **covered** are
  different, and `partial` is the normal case. A sentence saying "the price over
  the last five sessions" when the data covers four and a half is the same defect
  as an axis derived from the bars — stated in words instead of pixels.
- **Contrast has more surfaces to measure than the Work section assumes**, and
  §7 of `CHARTING.md` lists them: axis ink, tick-label ink, gridlines, the series
  line, the crosshair, and — if 2.12.5 draws one — the high–low band, which sits
  _behind_ the line and therefore changes the ground the line is measured
  against.

---

## Amended 2026-09-11 by Task 2.12.2 — the contrast surfaces are enumerable now, and one of them has already been proved

### The inks are landed, so "measure every new ink" is a finite list

The Work section asks for a measured contrast figure on every ink the chart
introduces. They exist, in `tokens.css` and `market.css`, each with its figure in
the comment beside it. This task's job is therefore **re-measuring them in the
composition** rather than discovering them:

| Surface                                           | Recorded           |
| ------------------------------------------------- | ------------------ |
| `--chart-axis` on `--surface-raised`              | the structural ink |
| `--chart-grid`                                    | 1.27:1             |
| `--chart-grid` **where the wash passes under it** | **1.11:1**         |
| `--chart-seam`                                    | 1.70:1             |
| `--chart-reference`                               | 4.48:1             |
| `--chart-crosshair`                               | 9.32:1             |
| `--chart-uncovered`                               | 1.107:1            |
| `--chart-series` over either wash                 | 14.87 / 14.68      |

The third row is the one to look at rather than accept: it is a stated,
deliberate weakening, and the recorded repair is **a darker grid, not a paler
wash**. Confirm it is readable at all four breakpoints or fire that repair.

Note what none of these are: a WCAG failure. A gridline behind data is not a
control boundary and 1.4.11's 3:1 does not apply to it — which is why
`--chart-seam` carries the same `#c4c6cf` that ADR 0026's exception _rejected_
for an input boundary. `CHARTING.md` §7.1 records that collision so a reader who
notices it does not read it as a mistake.

### The greyscale proof exists and this task extends it rather than originates it

`Foundations/Chart tokens` in Storybook already carries a **`Direction survives
greyscale`** story: the same marks rendered up and down, and again under
`grayscale(1)`. The washes are indistinguishable there and the geometry is not,
which is the claim.

What that story cannot do, and what this task still owes: the proof over the
**finished chart with real data in place on the page**, including the axis, the
labels, the crosshair and the states — and under a deuteranopia matrix as well as
greyscale, which the workshop story does not apply. The Work section's framing
holds; only its premise moves, because
[Task 2.12.5](TASK-05-what-a-session-did-and-direction-without-colour.md) shrank
and is no longer the only place the encoding has been read.

### The accessibility-tree decision is sharper than the 2.12.1 amendment assumes

That amendment says the likely answer is that "the base chart is one `<path>`" and
therefore `aria-hidden` with the text alternative carrying everything. **The
conclusion is right and the premise is not**: the plot is roughly two dozen
elements once the frame, the grid, the seams, the reference, the wash and the
crosshair are in it. Still nowhere near 780, and still none of it per-bar — but
"there was only one element anyway" is not available as the reason. Take the
decision on its merits and say so, which is what the amendment asks for.

The measured 1.009:1 greyscale figure is also the strongest argument for the text
alternative stating the **direction in words**: the sentence is the third channel,
after geometry and hue, and it is the only one that works with the screen off.

---

## Amended 2026-09-12 by Task 2.12.4 — the accessibility-tree decision was taken, and taking it created the choice this task now owns

### What was decided, and what it deliberately did not decide

2.12.1's amendment says the likely answer is that the marks are hidden and the
text alternative carries everything, and instructs this task to **take that
deliberately and say so** rather than arrive at it by noticing there was only
ever one element.

**2.12.4 took the first half.** The plot's `<svg>` is `aria-hidden="true"` with
`focusable="false"`, and the reason is stated in the component rather than
implied: the picture is not the evidence on this page — the stated facts beneath
it are, every one checkable against the store — so a `role="img"` with a name
invented for it would have been a promise that task had not earned.

**It deliberately did not take the second half**, which is this task's: what the
text alternative is, and therefore _where_ it lives. The two are one decision and
only one of them has been made, which leaves a specific choice rather than a
blank:

1. **Give the `<svg>` `role="img"` and `aria-labelledby`**, dropping the
   `aria-hidden`. One element carries the picture and its description, which is
   the conventional shape.
2. **Leave the `<svg>` hidden and put the alternative in a sibling** — a visually
   hidden paragraph, built the way `series-announcement.ts` builds the panel's.

**The second is probably right here and it is not obviously right.** The argument
for it is that this page already states every fact in visible text, so a
`role="img"` sentence would be a **third** copy of the same facts — after the
visible figures and the existing `role="status"` announcement — and
`FRONTEND-STATE.md` §7's rule is that a region belongs to a subject. The argument
against is that a screen-reader user arrowing the document meets an image-shaped
hole where sighted readers meet a chart.

Whichever is taken, **the count of things saying the same facts is the thing to
watch**, and it is already three on this page. The Notes' second likeliest miss —
a live region added here when 2.12.6 settled the rate — is the same failure seen
from a different angle.

### The keyboard walk has a moving target, and it is not this task's to hold still

The Work section says to walk the page and extend the existing spec. Two facts
that were not true when it was written:

- **The chart has zero tab stops today**, and
  [Task 2.12.6](TASK-06-reading-a-point-crosshair-hover-and-keyboard.md) adds the
  first. So the walk this task extends is a walk over a page 2.12.6 changed, and
  the amendment there names the interaction: the focusable element and its
  accessible name are decided _there_, and the text alternative may want the same
  element. **2.12.6 lands first and this task must not silently re-decide it.**
- **The chart's height is a token, so the "target taller than the viewport"
  worry is now checkable rather than speculative.** `--chart-height` is 280px and
  `--chart-height-compact` is 220px, and the compact pair applies below 600px **of
  region**. At 390px the region is ~342px wide and the plot is 220px tall inside
  a viewport 780px tall — so the chart region is nowhere near taller than the
  viewport, and `scroll-padding-top` should cover its stop like any other. Confirm
  it rather than assume it; what the Work section warned about does not appear to
  fire, and recording that it does not is worth a line.

### The contrast table has one row that can be struck and one that cannot yet be measured

The table in 2.12.2's amendment stands. Two notes from what shipped:

- **`--chart-grid` where the wash passes under it (1.11:1) is not yet
  measurable**, because there is no wash — the directional fill is
  [Task 2.12.5](TASK-05-what-a-session-did-and-direction-without-colour.md)'s and
  has not shipped. That row is measured after 2.12.5, not before.
- **`--chart-axis` is not an SVG ink at all.** The bottom rule is a CSS
  `border-bottom` on the plot element rather than a `<line>`, so it is measured
  as a border against `--surface-raised` like every other structural hairline in
  this product. It is the same value and the same figure; it is simply not in the
  drawing, which matters if this task goes looking for it in the SVG.

---

## Amended 2026-09-12 by Task 2.12.5 — one deferred row can be measured, one conditional resolved, and the alternative gained a fact

### The deferred contrast row is now measurable

The amendment above records that `--chart-grid` where the wash passes under it
(**1.11:1**) _"is not yet measurable, because there is no wash"_, and that the row
is measured after 2.12.5 rather than before.

**2.12.5 has shipped and the row is live.** The figure to confirm is the one
`tokens.css` already states beside `--chart-grid`, and it is worth knowing which
way the argument runs before measuring it: the weakening is **accepted**, and the
stated repair if a reader ever cannot follow a gridline across a tinted region is
**a darker grid, not a paler wash** — because the wash is already at the floor of
visibility on purpose and making it paler solves nothing.

### The high–low band conditional resolved, and what replaced it is a bigger surface

The 2.12.1 amendment's contrast list ends _"and — if 2.12.5 draws one — the
high–low band, which sits behind the line and therefore changes the ground the
line is measured against."_

**It draws none.** The band is declined at every window this story serves and the
reason is in `CHARTING.md` §12.2. But the clause's _concern_ transferred intact
and got larger: **the directional wash sits behind the line and changes the ground
the line is measured against**, across most of the plot rather than in a hairline.
The figures are recorded — the near-black series measures **14.87** on the green
wash and **14.68** on the red — so what this task owes is confirming them over the
composition rather than discovering them.

**Both of them, within one chart.** Since the wash split at the rule
(`CHARTING.md` §12.6) the line crosses from one ground to the other every time it
crosses its own opening price, which on a real window is many times. So this is
not "measure the line on whichever wash this chart has" — it is one line over two
grounds, and the row that matters is the **worse** of the two.

### The text alternative now has a fact the picture states and the sentence does not

The Work section's minimum list — symbol, window, first and last price, change,
high, low, feed — was written when the plot drew a line and nothing else. The plot
now makes a **claim about direction** in its own right, and a text alternative
that omits it is describing a different picture from the one on screen.

It is probably already covered: _change_ carries the sign, and `series-facts.ts`'s
vocabulary is the one to reuse rather than invent beside. **Confirm it deliberately
rather than assume the overlap** — and note the same subject trap
[Task 2.12.6](TASK-06-reading-a-point-crosshair-hover-and-keyboard.md) is amended
with: the wash is about the **window**, the readout is about a **bar**, and one
sentence covering both without saying which is which is the text version of two
channels disagreeing.

### The greyscale half of this task got smaller and did not go away

`PriceChart.stories.tsx` now carries four windows under `grayscale(1)` and four
under a Machado deuteranopia matrix, and `CHARTING.md` §12.5 records what was read
off them on 2026-09-12.

That is the **encoding** proved, which is what the Work section credits this task's
premise to 2.12.5 for. What is still owed here is unchanged and is the harder half:
the proof over **the finished chart in place on the page** — axis, labels,
crosshair, states, the stated-facts block beneath it and the headline above it, all
at once. A component in a workshop at one width is not a screen.

---

## Amended 2026-09-12 by Task 2.12.7 — six states render, so six states have to speak

Three things change here, and the first is the largest: **the states this task
walks now exist**. Until today four of the six were drawn and two of those were
provisional; the treatment is settled and `Price chart states.dc.html` is where
it is specified. `CHARTING.md` §14 has the arguments.

### The text alternative has a new fact to carry, and it is the one a picture-reader most needs

The uncovered span is a **fact about coverage that reaches a sighted reader as a
change of ground**. There is no such channel in a text alternative, so it has to
be a clause — and the honest version says _how much_, not merely _that_: a window
covered to four sessions of five and one covered to 780 minutes of 990 are the
same sentence otherwise.

Note the fact is **already on the page in words**, in `BarSeriesPanel`'s coverage
sentence directly beneath the plot. So this is the closest pair on this screen to
a sentence duplicated for two audiences, and the rule against two surfaces using
the same words applies with the usual force. What the chart's alternative can say
that the coverage sentence cannot is where the data stops _on the axis it is
describing_ — the shape of the answer rather than the arithmetic of it.

### The contrast table gains four rows, and two of them are the closest pairs in the product

Measured at 2.12.7 and reproduced here so this task re-measures rather than
discovers:

| Surface                                             | Recorded    |
| --------------------------------------------------- | ----------- |
| `--chart-uncovered` against `--price-positive-wash` | **1.038:1** |
| `--chart-uncovered` against `--price-negative-wash` | **1.051:1** |
| `--chart-coverage-edge` against `--chart-uncovered` | 4.045:1     |
| `--chart-grid` crossing the uncovered wash          | 1.146:1     |

The first two are why the dashed edge is load-bearing rather than a nicety, and
**a single chart can present both** — one above the reference rule and one below
— wherever the line crosses its own opening price near the edge. The useful half
for this task: every row moves by **less than a hundredth of a ratio** under
`grayscale(1)`, so unlike the directional wash this treatment has no hue to lose
and the greyscale proof here is confirming rather than defending.

### Two states now have no chart in them at all, which is an accessibility-tree decision

`refused` and `failed` render **nothing** — no SVG, no reading layer, no live
region from this component. That is settled and argued (§14, and this story's
seventh review), and it means the screen-reader walk must confirm the _panel's_
sentence is what a listener reaches in those states rather than a chart
announcing its own absence. The failure to look for is the opposite one: a chart
that says "no data" in the accessibility tree while the panel says the same thing
two lines later, which is the two-surfaces-one-sentence defect in the one place
nothing on screen would show it.

### The chart's tab stop is conditional on the state, which the walk must not assume

Missed by this amendment's first pass and worth stating plainly, because it is a
property of the walk rather than of the text alternative. `ChartReading` renders
**nothing** where there is nothing to read, so the chart contributes a tab stop
in **`loaded` and `partial` only** — not in `loading`, not in `empty`, and not in
the two states that draw no chart at all.

Three consequences for the Work section's keyboard walk:

- **`CLAUDE.md`'s occluded-stop counts predate the chart.** One at 1440×900, four
  at 768×800, two at 390×780 were measured on a page with no chart tab stop on
  it. The chart adds at most one and the walk must re-take them rather than cite
  them.
- **CI's store has no bars**, so every chart there is `empty` and contributes
  **no** stop. A browser assertion written against the developer's store will
  pass locally and assert nothing in the pipeline — the same branch the coverage
  spec already takes, and for the same reason.
- **The stop appears and disappears with the answer.** A walk taken while the
  panel is still `loading` counts one fewer stop than the same page a second
  later, which is the shape of flake `security-price-chart.spec.ts` already had
  twice. Wait for the answer before counting.

### One `verify`-gap entry is this task's to make mechanical rather than to inherit

2.12.7 added an entry to `CLAUDE.md`'s list — _that the plot is measured to the
area there is to draw in, and not to the axis rule as well_ — and it is the
weakest kind of entry on that list: prose with a re-measure that means opening a
page and looking at it. `CLAUDE.md`'s own standing preference is that **an entry
which can be made mechanical should be**, and this one can, in the spec this task
is already extending:

> The uncovered ground's painted box must end **above** the plot's own bottom
> edge, because the pixel between them is the axis rule. One `evaluate` comparing
> two `getBoundingClientRect().bottom` values, in a browser, where the border
> exists — jsdom implements neither `offsetHeight` nor `clientHeight`, so the
> correction reads as zero there and every component test is identical with the
> repair and without it.

Verify it by restoring the break rather than assuming it: delete the
`offsetHeight - clientHeight` subtraction in `usePlotSize` and confirm the new
assertion goes red. If it lands, strike the entry from the gap list and say so —
that is the migration the list wants, and this story has already performed it
once (`pnpm coverage:check`).

---

## What was built — 2026-09-12

**Status: complete.** `pnpm verify` passes; `pnpm e2e` passes at 97 tests.

### The text alternative

`apps/frontend/src/components/PriceChart/chart-alternative.ts` — a pure function
of the state, built the way `series-announcement.ts` was and reusing
`series-facts.ts`' vocabulary rather than inventing a second one for the same
facts. `chart-alternative.test.ts` reads it as text against the recorded bodies.

It states, for an answer with bars: the symbol, how many closing prices and what
one point is, the opening and closing price, the direction **as a word** with the
magnitude as a plain number, the high, the low, **how much of the frame the line
occupies**, and the feed in the shipped vocabulary. `loading` and `empty` each get
their own sentence; `refused` and `failed` get `null`, because neither draws a
chart and the panel's sentence two lines below already says what happened.

Three decisions inside it are worth naming:

- **Built from `coverage`, not from the window asked for**, which is the Notes'
  likeliest miss. The count comes from `timeAxis` and `positionOfInstant` — the
  same two functions the wash is derived from — so the words and the pixels
  cannot disagree.
- **A third branch §10.1 forced.** Where the shortfall is a weekend the axis
  gives no width to, the picture is complete and the answer is not, so the
  sentence says that rather than agreeing with the drawing.
- **It counts the axis's own units rather than restating the panel**, because
  `CLAUDE.md`'s rule is that two surfaces describing one fact must not use the
  same words. The panel has the arithmetic; this has the shape of the answer.

### Where it lives, which was the open half of a decision

`CHARTING.md` §15.1. The plot's `<svg>` stays `aria-hidden` — 2.12.4's decision,
confirmed rather than reversed — and the sentence is a **sibling**: a hidden
paragraph in the picture's own place in reading order, and the target of the
reading layer's `aria-describedby`, listed before its arrow-key hint. One string,
two routes, no new live region.

The objection the task file records — that a screen-reader user meets an
image-shaped hole — is answered rather than set aside: since 2.12.6 the reading
layer **is** a `role="img"` with a name and a tab stop. The picture already had
an element. What it lacked was a description.

**The value scale and the time labels left the tree** (§15.2), which is this
task's own decision and is asserted rather than claimed: a component test
requires that no hidden label's text appears in what the tree keeps, and that
the high and the low appear in the sentence replacing them.

### The walk, and the defect it found

Keyboard at three viewports, greyscale and a deuteranopia matrix over the
finished chart on the page, every ink re-measured in the composition, axe green.

- **Tab order**: the chart is the **seventh** stop and **zero** stops are
  obscured at 1440×900, 768×800 or 390×780. `CLAUDE.md`'s counts predate the
  chart; they are re-taken, and 390 is now in the spec for the first time. The
  "target taller than the viewport" worry the Work section raised does **not**
  fire — recorded, as §15.6's amendment asked.
- **Contrast** (§15.5): every recorded figure survives the composition. Every
  mark moves by less than a hundredth of a ratio with the hue removed **except
  the one pair whose whole difference is hue** — the two washes, 1.013 as
  rendered, 1.009 under greyscale, 1.003 under deuteranopia.
- **The defect** (§15.4): the readout's reserved height held at 1440 and at no
  narrower viewport, because a reading wraps where the invitation does not. The
  exact figures the picture rounds moved **14 to 32 px** under the reader's hand
  at every other width, with `pnpm verify` green, every browser test green and
  axe silent. Repaired with a hidden reading in the same grid cell, so the
  reservation is a measurement rather than a token; the spec now runs at three
  viewports.

### One `verify`-gap entry made mechanical

§14.5's measurement — that the plot is measured to the area there is to draw in
and not to the axis rule as well — is now one browser assertion, and the break
was performed: deleting the subtraction in `usePlotSize` takes exactly that test
red. Struck from `CLAUDE.md`'s list, which is the second time this story has done
that.

One entry was **added**, because it is a derivation nothing checks: the
alternative's coverage clause and the uncovered wash agree by both calling
`timeAxis` and `positionOfInstant`, and nothing would catch a later edit that
recomputed one of them from elapsed time.

---

## For the stakeholders — what this actually delivers

**The plain version: the price chart can now be read by somebody who cannot see
it, and proving that turned up a bug that would have annoyed everybody.**

A chart is a picture, and a picture is invisible to a screen reader. The lazy fix
is to label it "price chart" and move on — technically compliant, completely
useless. What this task built instead is a sentence that says what the picture
says: which company, over what period, what it opened and closed at, which way it
went **in words**, its high and low, where the prices came from, and — the part
that matters most — **how much of the chart is actually filled with data**.

That last one is the bit worth dwelling on, because it is where a lot of finance
software quietly lies. Our store of market data is usually a few days behind the
window somebody asks for. On screen we are honest about it: the part we have no
data for gets a faint grey background and the line stops at a dashed edge, so you
can see at a glance that the chart is not making anything up. Somebody listening
gets none of that, so they now get the sentence: _"the line covers the first 780
of 990 trading minutes in the window and stops at 4pm on the 4th; the rest has no
stored bars."_ Same honesty, different channel.

There is a subtle case we deliberately got right. Sometimes the missing part of a
window is a **weekend** — and because our chart deliberately draws no gap for
nights and weekends (it squeezes trading time together so the interesting bits
are bigger), the picture looks complete even though the answer is short. A
sentence written from the picture would have confidently said "we have all of
it", which would be wrong. It says the truth instead. That is the kind of detail
that separates a product people trust with money-adjacent decisions from one they
don't.

**We also chose to hide something, on purpose.** The numbers along the chart's
edges — the price scale and the time labels — are now skipped by screen readers.
They are approximations by design (rounded to neat values, sampled to fit), so
read aloud they are a dozen bare numbers with no context, immediately before a
paragraph that gives the same range properly and a table that gives every exact
figure. We checked that nothing is lost before removing it, and there is now an
automated test that fails if anybody ever removes something that _is_ only stated
there.

**And the walk found a real bug that every automated check had missed.** There is
a strip under the chart that shows the exact prices of whichever minute your
pointer is on. We had a test making sure that strip doesn't push the rest of the
page down when it appears — because having the numbers you are reading jump
under your hand feels cheap and makes people misread figures. That test was
green. It was also running at one screen size, and that screen size happened to
be the only one where the bug couldn't happen. On a laptop, a tablet and a phone,
the page jumped by up to 32 pixels every time you touched the chart. Nobody had
seen it because the automation was looking in the one place it wasn't.

It is fixed — the strip now sizes itself to a real reading rather than to a
number somebody picked once — and the test now runs at all three screen sizes. We
also confirmed the fix by deliberately breaking it again and checking the test
went red, which is this project's standing rule: a test that has never failed is
not yet evidence of anything.

**Where this leaves the product.** The price chart is now finished as a piece of
work: it draws, it is honest about what it has, it answers questions with a mouse
or a keyboard, it survives having its colour removed, and it can be read aloud.
Next up is the volume chart (Story 2.13), which fills the empty region directly
below it and brings the control that lets you change the time window — the first
time a user will be able to ask this product for a different period. After that
the epic closes and we move on to live market data, which is when the screen
starts moving on its own.
