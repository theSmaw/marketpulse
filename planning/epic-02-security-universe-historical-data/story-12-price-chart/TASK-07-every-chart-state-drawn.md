# Task 2.12.7 — Every chart state drawn, from a recorded body

**Status:** **Complete — 2026-09-12.**
**Story:** [2.12 Price Chart](STORY.md)
**Depends on:** 2.12.5

## Objective

Render every member of `BarSeriesView` as a chart state — not only the one with
bars in it — and make a **series that stops before its own x-axis does** read as
the answer it is rather than as a broken chart.

Task 2.11.6 is the precedent and the argument is the same: 2.12.4 is about the
chart working, this is about it being honest, and combining them is how the
honest half gets shortened.

## What the user can see when this lands

**A chart that never lies about what it has.** A security with no stored bars,
a window only half covered, a refused request, an untracked symbol and an
unreachable backend each produce something a person can read and, where there is
something to do, act on — and **none of them takes the page with it**, which is
§36's rule and this repository's `Region` boundary.

## Work

- **All six members, produced through the real transition.** `loading`,
  `loaded`, `partial`, `empty`, `refused`, `failed` — plus the `stale` flag on
  the three answers. **Do not construct a state by hand**: `apps/frontend/src/
fixtures/` holds eleven recorded response bodies and `barSeriesFixtureView(name)`
  returns the state built through the real transition. A hand-built `partial`
  whose coverage disagrees with its bars is unreachable in the real layer, and a
  chart tuned against one draws the real thing wrongly.

- **`partial` is the state this task exists for.** The x-axis covers the window
  that was **asked for** — the server resolved it and reported it in
  `coverage.requested` — and the data stops somewhere inside it. Draw the
  difference rather than hiding it by shrinking the axis to the data, and say in
  words where the data ends. This is the normal case, not the exceptional one:
  the store is backfilled nightly and the free plan withholds the most recent
  ~15 minutes.

- **`stale` is a mark and must never touch a number.** `FRONTEND-STATE.md` §2's
  amendment: no dim, no blur, no fade, no skeleton over a price. And note the
  stated reversal trigger — **a chart that redraws a held series in a second
  style is the first thing that would turn `stale` into a seventh union member**.
  If this task needs that, it goes to §2 rather than being taken locally.

- **`empty` and `refused` are answers, not errors.** A security we track with no
  stored bars, and a request the server declined with a reason — each gets a
  sentence that names the cause, and `refused` carries no `Try again` where
  trying again cannot help.

- **`failed` keeps the page.** One `Try again`, the `requestId` where there is
  one, and the regions around it untouched — including the tracked universe
  below, which the existing browser specs already assert survives.

- **Two sentences describing one failure must not use the same words.** This
  page now renders from two fetches and, after this task, up to three surfaces
  describing them. It has gone wrong three times in one afternoon before, every
  time caught by a locator resolving to two nodes rather than by anybody reading
  the page.

- **Stories per state**, which criterion 6 requires and `pnpm stories`
  enforces for anything under `src/components/`.

## Done when

- Every member of the union renders, plus `stale` on each answer, each from
  `barSeriesFixtureView` rather than a hand-built object
- `partial` draws the asked-for window and the shorter covered one, and says
  where the data ends
- No state dims, blurs or fades a number
- A failed chart leaves the rest of the page intact — asserted in the browser,
  where a boundary can actually be observed
- No two surfaces on this page describe one failure with the same sentence
- Stories exist per state and `pnpm stories` passes
- `pnpm verify` passes

## Notes

If a state needs a recorded body the fixture set does not have, **record one**
rather than writing an object literal. The set is the reason the states on this
page are reachable rather than plausible.

The fence is the text alternative and the screen-reader walk — 2.12.8's. This
task makes each state _render_; that one makes each state _speak_.

---

## Amended 2026-09-11 by Task 2.12.2 — `partial` has a drawn treatment; `stale` deliberately does not

**`partial` is settled and this task implements it.** From the canvas and
`VISUAL-LANGUAGE.md`'s _The chart_ section:

- the requested-but-unheld span takes **`--chart-uncovered`** — 1.107:1, the
  quietest mark in this language;
- the coverage edge is a **dashed vertical** rule;
- the series is **clipped** at that edge rather than drawn to the frame;
- and the sentence beneath the plot carries the fact in words, unchanged and
  un-abbreviated, as `CHARTING.md` §5 requires.

The two constraints behind that shape, both of which a later tidy-up will be
tempted to break: **it must not read as a failure** — so no hatching, no warning
colour, no icon, and the wash is at the floor of visibility on purpose — and **it
must not read as flat data**, which is what the clip prevents rather than the
wash. Removing the clip and letting the line run to the frame is the defect this
whole treatment exists to make impossible, and it renders perfectly.

**`stale` was not settled and is still entirely this task's.** Worth stating
plainly, because everything else on this page's visual vocabulary now has an
answer somewhere and it would be reasonable to assume this one does too. It does
not: 2.12.2 took no position on what a held series looks like while the next one
loads. The constraints stand exactly as the Work section has them —
`FRONTEND-STATE.md` §2's amendment, no dim, no blur, no fade, no skeleton over a
price — and so does the reversal trigger: **a chart that redraws a held series in
a second style is the thing that turns `stale` into a seventh union member**, and
that is taken at §2 rather than here.

The one hint available: `BarSeriesPanel` already answers this without colour, with
a dashed marker and a travelling dashed rule above the figures rather than on
them. A chart has the same problem and more room.

**And one addition to the "two sentences must not use the same words" bullet.**
That bullet counts the surfaces on this page as "up to three" after this task.
It is now four — search, the tracked universe, the stated-facts block and the
chart's own state — and the chart's coverage sentence and the facts block's
coverage sentence describe _the same event on the same fetch_, which is the
closest pair this page has ever had.

---

## Amended 2026-09-11 by Task 2.12.3 — `partial` is not a synonym for "the line stops early"

[`CHARTING.md`](CHARTING.md) §10.1 records the finding in full; this is the half
that changes what this task builds.

§6.2's rule — the x-domain comes from `coverage.requested`, so a `partial` answer
leaves visible space at the right-hand edge — holds **only when the shortfall is
made of trading minutes**. The recorded `partial` fixture's is not: it holds 60
bars covering Friday 15:00–16:00 ET against a window requested to Saturday 16:00
ET, and on a session-ordinal axis that window has exactly 60 slots in it, because
**Saturday contributes none**. The bars fill the frame, correctly.

So `barSeriesFixtureView("partial")` **does not exercise `--chart-uncovered`, the
dashed coverage edge, or the clip**, and a treatment built and reviewed against it
alone is a treatment nothing on screen has run. Verified in
`market/chart-time-axis.test.ts`, at _comes from the requested window and not from
the bars_ and the test after it.

The state that does show space is the ordinary one — a window reaching into a
session in progress, which the free plan withholds the most recent ~15 minutes of.
Either record a body for it or build the axis for one in the story, and **do not
take a green render of the existing `partial` fixture as evidence the treatment
works**.

---

## Amended 2026-09-12 by Task 2.12.4 — four of the six states already render, so this task reviews them and draws two

The largest change to this task is that **it is no longer where most of these
states first appear**. 2.12.4 could not draw `loaded` without deciding what the
component does with the other five members, because it takes the view whole and
its `switch` is exhaustive. So it took those decisions, and this task's job on
four of six is to **confirm or overturn a decision that exists** rather than to
originate one — which is a different and smaller job, and is worth knowing before
planning it.

### What renders today, and on whose authority

| State                | Today                                                               | This task                                        |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------------------ |
| `loading`            | A real frame with an empty scale — gridlines, no labels, no line    | Finish the **treatment**; the shape is fixed     |
| `loaded`             | Drawn                                                               | Nothing                                          |
| `partial`            | Drawn as `loaded` is — correct axis, **no uncovered treatment**     | **The whole of it.** This is still the task      |
| `empty`              | A real, labelled axis and no line                                   | Review; add the sentence's relationship to it    |
| `refused` / `failed` | **No chart at all.** The panel's sentence stands alone              | Confirm or overturn, deliberately                |
| `stale`              | Untouched — the panel's dashed rail marks it and the chart does not | **Entirely this task's**, as 2.12.2 already said |

**The `refused`/`failed` decision is the one to take seriously rather than
inherit.** 2.12.4's reasoning is that neither has a window to be about, so a
frame under either would be a picture of a window nobody asked for. That is
defensible and it is not obviously right: the alternative — an empty frame with
the failure's sentence inside it — keeps the region's height stable, which stops
the page below jumping when a retry succeeds. Neither was measured. **Decide it
here and say which, because "nobody revisited it" and "it was decided" render
identically.**

### The state this task exists for now exists on screen, and it is not the fixture

[`CHARTING.md`](CHARTING.md) §11.3. 2.12.3's amendment above tells this task to
"either record a body for it or build the axis for one in the story", because the
recorded `partial` fixture's shortfall is a weekend and therefore exercises none
of `--chart-uncovered`, the dashed edge or the clip.

**Both halves of that instruction have moved:**

- **Building the axis for one is done and tested.** `chart-geometry.test.ts`'s
  _stops the line short when the shortfall is made of trading minutes_ takes the
  `full` fixture's 30 bars against a window extended by an hour of the same
  session, and asserts the line ends 29/89ths across. So the geometry this
  treatment sits on is already verified against a trading-time shortfall.
- **The live product is in that state right now.** A developer's store answers
  the default window with 390 bars covering one session of five, because the
  backfill is paced and sequential. `/securities/NVDA` today draws a line
  occupying a fifth of its frame with four uncovered sessions beside it — which
  is what `--chart-uncovered`, the dashed edge and the clip are for, and it is
  the single most visible unfinished thing in the product.

**What is still owed is a recorded body**, and the reason is narrower than the
amendment above implies: a **story** cannot reach the live state, and criterion 6
wants a story per state. So record one — a window reaching into a session in
progress — for the workshop, and use the running page for the judgement.

### Two smaller things

- **The `stale` hint has a second half now.** 2.12.2 points at `BarSeriesPanel`'s
  dashed marker and travelling rule as the precedent. Note the chart currently
  sits **above** that rail rather than inside it, so a held chart is marked by
  something that is no longer adjacent to it. That is either fine — one mark for
  one answer — or it is the reason to move the rail. Decide; do not let the
  layout decide.
- **The "four surfaces describing one failure" count is right and the pairing has
  changed.** 2.12.4 moved the current-value reading above the chart, so the
  closest pair on this page is now the reading and the chart, which describe the
  same window in two channels rather than two sentences. The grep still applies
  to the sentences; the new risk is the two **channels** disagreeing, which is
  [Task 2.12.5](TASK-05-what-a-session-did-and-direction-without-colour.md)'s
  opening-close question and is named there.

---

## Amended 2026-09-12 by Task 2.12.5 — two washes now meet at the coverage edge, and one mark already crosses it

The directional rule and the wash shipped. Three things change here, and the
first is a decision this task did not previously have because the surface it is
about did not exist.

### The reference rule runs into the uncovered region. The wash does not

This is the concrete form of the adjacency `STORY.md`'s fourth review predicted
when it declined pulling this task forward — _"the directional wash and the
uncovered wash are adjacent surfaces whose contrast has to be judged together"_.
They are now adjacent on a real screen, and they behave differently:

- **The wash already stops at the data.** It is the close line's own path closed
  back to the rule, so it ends at the last bar and nothing about it reaches the
  frame. `--chart-uncovered` will land beside it, not under it.
- **The dashed rule does not.** It is drawn `x1=0 → x2=plot.width`, full width,
  because at 2.12.5 there was nothing to stop at. On `/securities/NVDA` today it
  crosses four uncovered sessions.

**Decide it here, because both readings are defensible and they say different
things.** A rule that stops at the coverage edge says _this datum describes the
data we hold_; a rule that continues says _this price is the datum for the whole
window you asked about, and we simply have nothing to plot against it out here_.
The second is arguably more honest about what the axis means, and it is also the
one that puts a `--chart-reference` hairline at 4.48:1 on top of
`--chart-uncovered` at 1.107:1 — a mark markedly louder than the region it sits
in, which is the one thing that treatment must not become.

Whichever way it goes, **the clip is the mechanism** and it already exists for
the series. One `clipPath` that takes the rule, the wash and the line together,
or a deliberate statement that the rule is outside it.

### Four contrast pairs are now measurable and three are new

`--chart-grid` where the wash passes under it was recorded at **1.11:1** and is
now real rather than predicted. What this task adds to that list:

| Pair                                              | Why it is this task's                                              |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `--chart-uncovered` against `--surface-raised`    | The existing row; 1.107:1, deliberately the quietest               |
| `--chart-uncovered` against the **positive** wash | **New.** Two pale fills meeting at a vertical edge                 |
| `--chart-uncovered` against the **negative** wash | **New**, and it is a separate row rather than pedantry — see below |
| `--chart-reference` against `--chart-uncovered`   | **New**, and only if the rule is not clipped                       |

**Two rows rather than one, because the wash splits at the rule.** Since
2026-09-12 the fill is green above the reference and red below it
(`CHARTING.md` §12.6), so which wash `--chart-uncovered` meets at the coverage
edge depends on where the line was when coverage ran out — and **a single chart
can present both**, one above the edge's midpoint and one below, if the line
crosses the rule near it. A treatment judged against the green pair alone has
been judged against half of what ships.

There is a fifth pair this task does **not** own and should know about: the two
washes meet each other along a horizontal boundary at the rule. They differ by
1.013:1, which is nothing — and what carries that boundary is the dashed
`--chart-reference` at 4.48:1 sitting exactly on it. That makes the rule
load-bearing in a way it was not when the fill was one colour, and it is a reason
to think hard before clipping it at the coverage edge: clip the rule and the two
washes meet at an invisible seam wherever coverage is short.

The second is the one to look at rather than compute: 1.107:1 and 1.15:1 against
the same ground are within a few hundredths of each other, so the coverage edge
may be invisible **precisely where the wash is**, which is the left-hand side of
it. The dashed edge is what carries it, and that is now load-bearing rather than
a nicety.

### The fixture set is thirteen bodies, not eleven — and neither new one is yours

The Work section says _"`apps/frontend/src/fixtures/` holds eleven recorded
response bodies"_. It holds **thirteen**. 2.12.5 added two, and stating what they
are is the point, because the risk here is re-recording something that exists:

- **`flat.json`** — a window that opened and closed at the same price. Not this
  task's; it is the neutral wash's story.
- **`dense.json`** — 1,950 bars over five sessions, **`loaded`**. Not this task's
  either, and specifically **not** the body this task is still owed: it is fully
  covered, so it exercises no uncovered treatment at all. What it does give you
  is the density to judge the uncovered region _against_ — a four-fifths-empty
  frame and a full one, side by side in the workshop.

**The recording this task owes is unchanged**: a window reaching into a session
in progress, so a _story_ can reach the state the running page is already in.
`bar-series.ts`'s header now carries the recording procedure for two bodies that
had to be _found_ rather than requested, and the `psql` query idiom there is the
one to copy if the store has to be searched for a window with the right shape.

### One thing that got easier

The `refused`/`failed` decision this task was told to take seriously rather than
inherit is **unaffected** by anything 2.12.5 did — neither state has a window, so
neither has a rule or a wash. It is still the call to make deliberately, and it is
still the one where "nobody revisited it" and "it was decided" render identically.

---

## What was built — 2026-09-12

The design was taken first, on the canvas ADR 0026 makes the source of truth:
**`Price chart states.dc.html`**, a fifth file in the
`Component library for MarketPulse` project, added for `Price region.dc.html`'s
reason rather than the 256 KiB one — it is a different question about the same
subject. Every drawing on it is the **real geometry** of a recorded body, so what
was reviewed is what ships. `VISUAL-LANGUAGE.md`'s _Partial coverage is drawn as
space_ carries the decisions and [`CHARTING.md`](CHARTING.md) §14 carries the
findings.

### The six states, and what each got

| State                | What it draws now                                          | Originated or confirmed             |
| -------------------- | ---------------------------------------------------------- | ----------------------------------- |
| `loading`            | The frame, an unlabelled scale, and **no wash**            | Confirmed — the shape was fixed     |
| `loaded`             | Unchanged, and it produces no coverage marks by arithmetic | Unchanged                           |
| `partial`            | The uncovered ground, the dashed edge, and the clip        | **Originated.** The whole of it     |
| `empty`              | The same wash across the **whole plot**                    | **Overturned** — see below          |
| `refused` / `failed` | Nothing at all                                             | **Confirmed**, with a new argument  |
| `stale`              | Nothing. The chart is identical to a fresh answer          | **Originated**, and it is a decline |

### The four decisions this task was told to take rather than inherit

**1. The reference rule is clipped at the coverage edge.** This is the one the
story's fifth review flagged as genuinely open with two defensible readings, and
one of the two turned out not to be a reading. The case for leaving it full width
was that it carries the seam where the two washes meet — and the washes exist
only where the bars do, which is the side of the edge the rule survives on, so
clipping it removes it from a region that has no seam in it. What decided it is
that `--chart-reference` is 4.48:1 and `--chart-uncovered` is 1.107:1: unclipped,
the loudest mark on the plot sits inside the quietest region, which is the one
thing that treatment must not become. §14.2.

**2. `empty` washes the whole plot.** Overturning 2.12.4's bare labelled axis,
and the reason is that it is not a new treatment at all: a 200 with no bars is a
window we asked for and hold **none** of, so it is coverage zero. It costs no new
mark, and it is what tells `empty` apart from `loading` at a glance — the two
were previously the same frame with the same marks on it.

**3. `refused` and `failed` still draw nothing.** The argument is structural
rather than aesthetic, which is what makes it a decision rather than an
inheritance: neither member carries a series, so neither carries a requested
window, and a frame under either would have to **invent** one to be a picture of.
The case against — that an empty frame would hold the region's height so the page
below did not jump on a successful retry — is real and is paid for by the
sentence, its detail and the retry occupying the region.

**4. A stale chart is identical to a fresh one.** No dim, no blur, no fade, no
second style. The mark's subject is the **answer** — the current value above, the
drawing and the eight stated facts below are one answer and are one request old
as a whole — so a second mark inside the plot would say two things were
independently stale, and `BarSeriesPanel`'s dashed rail already sits above all
three. Declining it also keeps `FRONTEND-STATE.md` §2's stated reversal trigger
unfired, which is worth more than the mark would have been.

### The rule the treatment collapsed to

> **A mark derived from the window runs the full frame. A mark derived from the
> bars stops at the coverage edge.**

That is one sentence in place of four state-by-state specifications, and every
state above falls out of one number — how much of the window is held — rather
than out of a branch. `chart-geometry.ts` returns a `ChartCoverage`: the covered
span (the clip), the spans that are not (the wash), and the interior boundaries
between them (the edges). Zero, one or **two** uncovered spans, because a store
can be missing the start of a window as well as the end and both ends come from
the same range.

The spans come from `coverage.covered` measured against the axis, never from
where the last bar landed — which is what makes §10.1's weekend case fall out
rather than needing a special case, and what stops a complete answer whose final
minute never traded being washed.

### What the fourteenth recorded body is for

`uncovered.json`: NVDA over 2026-09-03 to 2026-09-08, **780 bars against a window
of 990 trading minutes**. Owed to this task because the recorded `partial`
fixture's shortfall is a Saturday and a session-ordinal axis gives Saturday no
slots, so it exercises none of this. The judgement was taken on the **running
page**, which has been in this state since 2.12.4; the recording is what keeps it
reviewable in the workshop and in CI afterwards.

### The defect this shipped for an hour, and what it teaches

The uncovered ground painted **over the axis rule**, so the frame appeared to
stop at the coverage edge — the exact impression the treatment exists to prevent.
The cause predates this task: the plot's bottom border _is_ the axis rule and
`getBoundingClientRect()` includes it, so the measured height was always one
pixel taller than the drawable area. Every mark before today tolerated it because
a stroke a pixel low lands under a near-black rule and is invisible. **A fill does
not.** Found by looking at the running page; §14.5 has the repair and the general
form.

### Verification

`pnpm verify` passes. Beyond it: the coverage arithmetic is verified in
`chart-geometry.test.ts` against the recorded bodies — including the weekend case
producing _no_ wash, which is the treatment being right rather than skipped —
the wiring and the shared clip in `PriceChart.test.tsx`, with the clip's test
**verified by performing the break** rather than assumed, and the ground being
painted at all in `e2e/specs/security-price-chart.spec.ts`, which is the only
level that can see a fill. That spec branches rather than skipping on an empty
store, so CI exercises the coverage-zero end of the same treatment while a
developer's store exercises the ordinary one.

---

## For the stakeholders — what this actually changed, in plain terms

### The problem, in one sentence

MarketPulse rarely has everything you ask it for, and until today the chart did
not say so.

Ask for the last five trading days and the honest answer is often "here are four
and a bit". The historical data is topped up overnight, and our market-data plan
withholds the most recent quarter of an hour, so a chart drawn at eleven in the
morning is always a little behind the market. That is not a fault — it is how the
data arrives — but it puts a chart in an awkward position: it has been asked
about a window it can only partly answer.

There are two ways to handle that and only one of them is honest. The tempting
one is to stretch what you have to fill the picture. It looks perfect. It is also
a lie, because the reader asked about five days and is looking at four, with
nothing on the screen to tell them which. The other is to draw the window that
was asked for and leave the part you cannot answer visibly empty.

We had already chosen the honest one. What was missing was the _drawing_ of it:
the line simply stopped in mid-air, with plain white to the right of it. That
reads as a chart that broke, or as a price that went flat and stopped moving.

### What is on the screen now

Open NVDA today and the part of the window we hold is drawn as before — the price
line, the shading that says which way it went. The part we do **not** hold is now
a faint grey ground, with a dashed line marking exactly where our data stops.

Three deliberate details:

- **The grey is the quietest colour in the entire product.** A missing stretch of
  data is a normal state, not an error, so it must not look like a warning. No
  red, no stripes, no exclamation mark. It is just a change of ground.
- **The frame keeps its full width.** The bottom rule, the gridlines, the day
  labels — all of them run right across, because those describe the window the
  reader asked about. Only the things that describe actual prices stop early.
  That is the whole distinction, and it is the difference between "we have not
  got this yet" and "there is nothing here".
- **Nothing about it depends on colour.** We measured it: strip the colour out
  entirely and every part of this treatment reads exactly the same. Roughly one
  man in twelve has some form of colour-vision difference, and none of them loses
  anything here.

We also settled the three quieter states while we were in there. A chart that is
still **waiting** for an answer shows the empty frame and no grey — because we do
not yet know whether anything is missing. A chart that got an answer with
**nothing in it** is grey all the way across, which now says something different
from waiting rather than looking identical to it. And when a request is
**refused** or a lookup **fails**, the chart draws nothing at all and the panel
explains why in a sentence, because those states have no time window to be a
picture of. Crucially, a failure stays in its own box: the rest of the page,
including the full list of 518 securities below, carries on working.

### Why this matters for the product we are building

MarketPulse is being built to answer "what is unusual here, and what is the
evidence?" Everything downstream — the anomaly scores, the AI investigations, the
historical replay — rests on a reader being able to trust that what they are
shown is what we actually know.

A chart that quietly fills in its own gaps poisons that. If the picture can
overstate what we hold in a way nobody can see, then no number beside it can be
taken at face value either, and the AI features we are building towards inherit
that doubt. This is a small piece of drawing that buys a large piece of
credibility: **you can now tell, at a glance and without reading anything, how
much of what you asked for we actually have.**

### Where the product stands

The price chart is now complete as a _picture_. It draws a real series, says
which way the window went without relying on colour, lets you point at any minute
and read it, and is honest about its own coverage in every state it can be in.

Two things remain in this chapter of the work: making the chart describe itself
properly to somebody using a screen reader, and measuring that it stays fast at
the largest windows. After that comes the volume chart and the ability to change
the time window — at which point a user can explore a security's history rather
than just look at the last few days of it.

### One decision worth knowing about

We found and fixed a one-pixel error that had been present since the chart was
first drawn: the grey ground was painting over the chart's own baseline, which
made the frame look like it stopped early — precisely the impression this work
exists to prevent. It was invisible until now because every previous mark on the
chart was a thin line, and a thin line a pixel out of place hides under the
baseline. A solid block of colour does not.

We mention it because of how it was found: not by a test, but by opening the page
and looking at it. Our automated checks are extensive and they were all green
throughout. There are things about a picture that only a person looking at it can
see, and this is the second time in this piece of work that a human eye has
caught something a green tick could not.
