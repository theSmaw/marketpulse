# Task 2.13.8 — The walk: keyboard, screen reader, greyscale, and the week with a holiday in it

**Status:** Complete — 2026-09-13
**Story:** [2.13 Volume Chart & Time-Window Selection](STORY.md)
**Depends on:** 2.13.7

## Objective

Walk the whole surface this story built the way Task 2.12.8 walked the price chart —
**as a rendering rather than as a claim** — and prove acceptance criterion 3, which
is the one criterion in this story that is about arithmetic rather than about a
screen.

Two halves, and they are in one task because they are one walk:

1. **"5 days" is five trading sessions across a week containing a holiday**, proved
   **through the control** rather than re-derived at the unit level.
2. **The control and the volume plot are operable and describable** — keyboard,
   screen reader, greyscale, axe, at three viewports.

## What the user can see when this lands

**The same product, reachable with the screen off and the mouse unplugged** — and
whatever the walk finds, which on the two previous walks was a real defect each time.

## Work

### Criterion 3, through the control

- **The week is already chosen and already asserted at the unit level.** Five sessions
  back from **2026-11-30** is `11-30, 11-27, 11-25, 11-24, 11-23` — skipping
  Thanksgiving `11-26` **and** the weekend, three ways a naive implementation is
  wrong in one assertion. `lastMarketSessions(n, endDate)` returns them **oldest
  first** and that must not be reversed.
- **This task's job is to prove it through the control**, which means a request
  naming five sessions, a server resolving it, an axis drawing five sessions, and
  **`11-27`'s half day drawing 210 bars and no empty 13:00–16:00 band**. Decide where
  that test lives: it is an assertion about a window, a calendar and a picture at
  once, which is the shape nothing below `pnpm e2e` can hold entirely.

### The walk

- **Keyboard, end to end.** Tab from the top of the page through search, the control,
  the charts and the table. Count the stops. **No stop may land behind the sticky
  chrome** — measured one occluded stop at 1440×900, **four** at 768×800 and two at
  390×780, worsening as the viewport narrows because the status strip wraps, so a
  development machine shows the least of it. `scroll-padding-top` is the repair and
  **does not help a target taller than the viewport**.
- **Every control carrying an explanation must be in the tab order.** Nothing compares
  an `aria-describedby` against whether the described element can be focused, and the
  failing combination — a correct, visible sentence on an unreachable control —
  renders and lints perfectly.
- **The text alternative, extended.** The price chart's is **one sentence reached two
  ways**: a hidden paragraph in the picture's place in reading order, and the
  description on the chart's single tab stop, read before the arrow-key hint. It
  states the symbol, the window, the opening and closing price, direction **as a
  word**, the high, the low, the feed, and how much of the frame the line occupies
  **counted in the axis's own trading minutes**. Volume and a changed window both
  change that sentence: the window is now something the reader chose, and the volume
  plot is a second picture that must either be in that sentence or have one of its
  own. Decide which, and note a listener has no other channel for the plot's shape.
- **It must stay derived from the same two functions.** §17.5 and `CLAUDE.md`'s gap
  list: the sentence and the uncovered wash agree **by construction** because both
  call `timeAxis` and `positionOfInstant`. A clause recomputed from elapsed time
  reports a gap of two and a half days across a weekend the axis gives no width to,
  and the words then disagree with the picture about a fact neither can check.
- **Greyscale and deuteranopia.** The chart's direction survives hue removal because
  the **geometry** carries it — the two washes differ by **1.009:1** under
  `grayscale(1)`. If the volume bars or the control's selected state encode anything
  in hue, this is where it fails. And note the lesson rather than only the rule:
  2.12.5's four greyscale simulations **passed against a chart that was wrong**,
  because removing the hue removes the disagreement. A person looking at the screen
  found it. Look at the screen.
- **axe, and what it does not certify.** The addon scopes to `#storybook-root`; a
  whole-document run adds page-level rules a fragment cannot satisfy, and the two
  must never be compared. A green axe run says nothing about any property in this
  task: it read zero violations throughout the occluded-tab-stop finding.
- **Three viewports, and the middle one is the instrument.** §15.4's defect held at
  1440 and at no narrower width, and 2.12.8's walk found the readout's reserved
  height wrong because it ran at 768.

## Done when

- A test proves five sessions across the Thanksgiving week **through the control**,
  including the half day's 210 bars and the absence of an empty afternoon
- The tab walk is recorded at 1440, 768 and 390, with the stop count and no occluded
  stop
- Every described control is reachable
- The text alternative accounts for volume and for a chosen window, still derived from
  `timeAxis` and `positionOfInstant`
- Greyscale and deuteranopia renderings exist as stories a person reads, and somebody
  read them
- axe is clean at three viewports, with what it does not cover stated
- Whatever the walk found is fixed or recorded with a named owner
- `pnpm verify` and `pnpm e2e` pass

## Notes

The fence is scope creep into Story 2.14: the feed label's wording and a stitched
series' two sources are 2.14's, and this task reads whatever label is there today
rather than improving it.

The thing to expect: **this walk will find something.** 2.11.9 found three unchecked
properties, 2.12.8 found a reserved height that held at exactly one viewport. Budget
for the finding rather than for the confirmation.

---

## Amended 2026-09-13 by Task 2.13.2 — two of this walk's questions are narrowed, and one is answered

**The greyscale bullet becomes a confirmation rather than a search.**
[`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) §12 decided volume encodes **no**
direction, and §8.2 gave the control's selected state three channels of which
none is hue — a 2 px near-black bar, a weight and an ink step. So neither of the
two things this bullet was told to look at spends hue at all.

**Confirm it rather than skipping it**, and note the asymmetry that makes that
worth doing: a simulation cannot prove a mark carries meaning without hue, but it
can catch a mark that started spending hue after the decision said it would not.
`CHARTING.md` §12.6 is the standing reminder in the other direction — four
greyscale simulations passed against a chart a person could see was wrong — so
the instruction stands unchanged: **look at the screen.**

**The text alternative's open question is leaning, not decided.** The Work bullet
asks whether the volume plot is in the price chart's sentence or has one of its
own, and §15 decided the parallel question for the **readout** — two strips, two
subjects, on the rule that a readout belongs to a subject and its sentences name
it. That is the same rule and it points the same way, so a second alternative for
the second picture is the likely answer rather than the settled one. **Decide it
here, informed by that, and record which.** A listener has no other channel for
the plot's shape, and the price chart's sentence is already at the length where a
clause about a second picture stops being one sentence.

**And it must stay derived.** Whatever the answer, both sentences count the same
axis: `timeAxis` and `positionOfInstant`, never elapsed time. `CLAUDE.md`'s gap
list carries that as a live hazard, and a second alternative is a second place it
can be got wrong.

Add to **Done when**:

- The greyscale walk **confirms** that neither the volume bars nor the control's
  selected state spends hue, rather than discovering it
- Whether volume has its own text alternative is decided and recorded, and both
  sentences derive from `timeAxis` and `positionOfInstant`

---

## Amended 2026-09-13 by Task 2.13.3 — criterion 3's unit half is done, and the spoken form is a call rather than a decision

### Criterion 3: the axis half is asserted, and what it asserts is an **absence**

This task's job is unchanged — **prove it through the control** — but the layer
below it is now covered, so this task is not deriving anything for the first time
and should not re-assert what is already held.

`chart-geometry.test.ts` now holds the holiday week at the axis level, from
`lastMarketSessions(5, 2026-11-30)`: five sessions
(`11-23, 11-24, 11-25, 11-27, 11-30`), the half day at **210 slots**, a total of
**1,770**, no tick labelled `Nov 26`, and Monday's first slot exactly 210 after the
half day's.

**The assertion that actually rules out an empty afternoon is about a missing
position**, and it is the form worth copying rather than paraphrasing: 14:00 ET on
`11-27` is a real instant inside the requested window and `positionOfInstant`
answers `boundary` for it — the same answer it gives a night or a weekend. A
continuous time axis would have given that instant 180 slots of empty plot and
every state test would still have passed.

So what is left here is the part only `pnpm e2e` can hold: a request naming five
sessions, a server resolving it, and **the picture** — the seam count, the two
date labels, and no three-hour blank between the half day's last bar and Monday's
first.

### The spoken volume form exists

`spokenVolume(volume)` gives `4.06 million` to the same precision `formatVolume`
gives `4.06M`, decided in one file so the two cannot drift. Whatever this task
decides about **whether** volume gets its own sentence, the figure inside it is
that call and not a second spelling.

The "it must stay derived" bullet is unchanged and now has a second reason to be
careful: `CLAUDE.md`'s gap list gained an entry from 2.13.3 about the memoised
walk, and the sentence and the wash still agree only because both call `timeAxis`
and `positionOfInstant`.

---

## Amended 2026-09-13 by Task 2.13.4 — the text alternative's open question is **answered**, and the second-place-to-get-it-wrong did not materialise

### Volume has its own sentence. Confirm and extend; do not decide.

2.13.2's amendment left this "leaning, not decided" and told this task to settle
it. **2.13.4 settled it by building it**, and the reason is one this task would
have reached anyway: the volume plot's SVG, its single value label and its two
dates are all `aria-hidden`, so without a sentence of its own the Volume region is
a heading with nothing in the accessibility tree underneath it.

`volumeAlternative(view, symbol)` states the symbol, the bar count, the interval,
the window's peak **and when it happened**, the coverage, and the feed. It is a
hidden paragraph in the picture's place in reading order, the same shape as the
price chart's.

So the Work bullet's question — _in that sentence or one of its own_ — reads
**one of its own**, and this task's job on it is what it does to that sentence: a
window the reader chose changes what both sentences say, and `1d` windows execute
`intervalWord`'s and `slotWord`'s unverified English for the first time.

### The "second place it can be got wrong" does not exist, and that is worth checking rather than assuming

The amendment warned that a second alternative is a second place the
derived-from-`timeAxis` rule can be broken. **It is not, as built**: there is one
`coverageClause`, parameterised by a small `Mark` vocabulary — `The line runs` /
`The columns run` — so both sentences count the same axis through the same call to
`axisSpan`, which calls `timeAxis` and `positionOfInstant`.

That is the good outcome and it is exactly the kind of thing a later edit undoes
by "simplifying" one sentence into its own function. `CLAUDE.md`'s gap list
carries the derivation as a live hazard; **re-measure it here** rather than
trusting this paragraph:
`grep -n "timeAxis\|positionOfInstant" apps/frontend/src/components/PriceChart/chart-alternative.ts`
must find them, and `grep -c "coverageClause" …` must find one definition and two
call sites.

### The greyscale walk has nothing to look at in the workshop yet

2.13.2's amendment made the greyscale bullet a **confirmation** — neither the
volume columns nor the control's selected state spends hue. The confirmation is
still owed and the instrument is still missing: `PriceChart.stories.tsx` carries
`Greyscale` and `Deuteranopia` stories over four windows, and
`VolumeChart.stories.tsx` and `ChartAxis.stories.tsx` **carry neither**.

`--chart-volume` is `#848995`, which `grayscale(1)` takes to `#898989` — nothing
on the plot changes, because nothing on it was ever distinguished by hue. But that
is a claim about a token, and `CHARTING.md` §12.6 is the standing reminder that
four greyscale simulations passed against a chart a person could see was wrong.
**Add the pair of simulation stories over the pair of plots, and look at them.**

Add to **Done when**:

- The alternative's `1d` English is read aloud by a person at a 3M or 1Y window,
  which is the first time `intervalWord` and `slotWord` execute their `1d` branches
- One `coverageClause` still serves both sentences, re-measured by grep rather
  than asserted
- `Greyscale` and `Deuteranopia` stories exist over the **pair**, and somebody
  says which way each window went and where the heavy trading was

---

## Amended 2026-09-13 by Task 2.13.5 — the walk gains one claim to **test rather than confirm**, and it is a deliberate absence

Most of what 2.13.5 built narrows this task. One thing widens it, and it is the
kind of decision a walk exists to falsify.

### **The volume strip is not in the accessibility tree**, and this walk is what says whether that was right

`VolumeReading`'s readout is `aria-hidden`, deliberately
([`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) §23.1): every other mark in that
region is hidden for the same reason, and `volumeAlternative` already states the
window's peak — so an exposed strip would state the same fact in the same breath,
which is the two-surfaces defect with the peak in it.

What replaces it for a listener is **a clause in the price chart's spoken
sentence** — `Volume 4.06 million.` — reached through the pair's one tab stop.
That is a chain of three assumptions, and no automated instrument can see any of
them: axe cannot tell that a hidden element's content is available elsewhere, and
`CLAUDE.md`'s gap list carries the clause as held by a single unit test.

**So walk it, with a real screen reader, and answer one question: can somebody who
cannot see the screen get a bar's traded volume?** The path is `Tab` to the price
plot, arrow to a bar, hear the sentence. If they cannot — if the clause is
swallowed by the pacing, or arrives too late in a long sentence to be usable —
the decision is wrong and the repair is to expose the strip and reconcile its
wording with `volumeAlternative`'s peak sentence. Record the answer either way.

Note also the **exact-versus-spoken split** while you are there: the strip writes
`4,061,234` and the sentence says `4.06 million`. Both are deliberate and decided
in one module, but a listener is the one person who gets only the rounded form.
Say whether that is acceptable rather than assuming it.

### Two things this walk no longer has to discover

- **The tab order did not move.** The pair adds **no** second tab stop — the
  volume plot answers a pointer and is not focusable — so every new stop in the
  count is 2.13.6's control. That makes the occlusion finding attributable rather
  than a bisection.
- **The reservation is now measured on two strips, not one.** Both hide **every**
  state they can be in, from one home (`chart-readout.module.css`), which is
  §15.4's mechanism completed rather than repeated. The three-viewport rule
  applies to both and the middle viewport is still the instrument — but there are
  now two instruments on one page, and the volume strip's two states are both
  figures, so its wrap points are not the price strip's.

### One mark to add to the greyscale confirmation

2.13.4's amendment listed what the simulation stories must cover. There is now a
third mark on the volume plot: **the crosshair's hollow disc**, at the bar's own
volume. It spends no hue — `--surface-raised` fill, `--chart-point` ring — and it
is the one mark on that plot whose _position_ carries a fact the drawing
otherwise rounds away, so it is worth looking at under both simulations rather
than reasoning about its tokens.

Add to **Done when**:

- A real screen reader is used to get a **bar's traded volume**, and whether the
  hidden strip plus the spoken clause is sufficient is recorded either way
- The stop count names how many stops the control added, against a pair that
  added none
- Both strips' reservations are measured at three viewports, not one strip's
- The simulation stories include the volume disc

---

## Amended 2026-09-13 by Task 2.13.6 — **criterion 3 cannot be proved through the control**, and three of this walk's items are part-paid

The second half of this amendment is bookkeeping. The first is a genuine problem
with this task's own instruction, and it is much cheaper to meet here than
halfway through the walk.

### The instruction _"prove it through the control"_ is not satisfiable as written

The week is `2026-11-23 … 2026-11-30`. **It is in the future**, and the control
cannot ask for a window that does not end at the current session: §4(a) settled
the address as `?sessions=N`, a **count**, which the server resolves against the
market date it is answering on. There is no absolute form in the address —
`bar-series-query.ts` supports one, `paths.ts` does not write one, and
`use-time-window.ts` does not read one. So no press of any cell and no hand-typed
URL reaches Thanksgiving week from 2026-09-13.

This was not wrong when it was written: the task predates the decision that the
address carries a count. It is wrong now, and the three ways out are different
sizes:

1. **Pin the clock and assert at the level that has one.** The server resolves
   the window, so an `app.inject()` test with the route's clock seam pinned to
   2026-11-30 produces the real five sessions, the real half day and a real body —
   the same technique that recorded `stitched.json`. It proves the request and the
   resolution, and **not** the picture.
2. **Drive the browser with that body.** Intercept `GET /market-data/bars` and
   fulfil it with the body from (1). The axis, the seams, the ticks and the
   coverage are all computed **client-side from `coverage.requested`**, so the
   picture under test is entirely real even though the response was served by
   Playwright — this is the only option that reaches _the picture_, which is what
   the task is actually about. It costs a recorded body for a week that has not
   happened, which is a departure from the fixture rule and must be argued in
   writing rather than slipped in: the body would be **generated by this
   product's own server against the real calendar**, not typed, which is the
   distinction that makes it admissible.
3. **Give the address an absolute form.** Real, useful, and firmly Epic 13's —
   the scrubber produces exactly that form. Doing it here to satisfy a test is
   scope creep into another epic's vocabulary.

**(2) is the likely answer** and (1) is its precondition. Whichever is taken, say
in the test file why the week is not reachable through the control, or the next
reader will assume the spec was written lazily.

Note what is already held and must not be re-derived: `chart-geometry.test.ts`
holds the whole week at the axis level from `lastMarketSessions(5, 2026-11-30)` —
five sessions, the half day at 210 slots, 1,770 total, no tick labelled `Nov 26`,
and 14:00 ET on the half day answering `boundary` rather than a position. What is
missing is only the rendering.

### What the walk inherits, and what it no longer has to find

- **The control adds exactly one tab stop**, and it is a **roving** one: five
  `role="radio"` cells in a `role="radiogroup"`, with the stop held by the
  **checked** cell. So the delta against 2.11.9's count is one, and the occluded-
  stop check for it is already held at 1440 and 1024 by
  `e2e/specs/security-window-control.spec.ts`. **390 is not covered there** and is
  the viewport where occlusion was worst — that is this walk's.
- **Manual activation is the thing to walk rather than to confirm.** The arrows
  move focus and `Space` commits, deliberately (§32), which is a departure from
  the APG's default for radios. The claim behind it is that the radio's own
  announcement — _"1 year, radio button, not checked, 5 of 5"_ — tells a listener
  a press is pending. **That is a claim about a real screen reader and nothing
  else can check it.** If a listener arrows across the control and cannot tell
  why nothing moved, the decision is wrong and the repair is either selection-
  following-focus with a `replace`d address or an explicit hint.
- **The greyscale confirmation for the control is already built and needs
  reading, not writing.** `TimeWindowControl.stories.tsx`'s `AllPermutations`
  renders all seven states and the same seven again under `grayscale(1)`. The
  pair of plots still has no simulation stories — 2.13.4's amendment is unpaid.
- **The `1d` English is read.** 2.13.6 owed _"somebody read the two `1d`
  sentences aloud"_ and it is done: `intervalWord`'s _"trading session"_ and
  `slotWord`'s _"sessions"_ both execute against a recorded body and a story
  renders it. What is **not** done is hearing them in a real screen reader in
  sequence with the six instants §30.2 changed — a sentence that reads correctly
  and a sentence that is heard correctly are different claims, and this walk is
  where the second one is made.

### And one new surface for the "every described control is reachable" bullet

The window control carries an `aria-describedby` — the readout, so a listener
arriving at the group hears _"Time window … 7 sessions"_. That is the exact
combination `TextField` got wrong for two tasks (a correct, attached, visible
sentence on a control no key press could reach), and it is the only new one on
this page. The control is focusable, so it passes; **check it rather than assume
it**, because nothing in `pnpm verify` compares the two.

Add to **Done when**:

- Criterion 3's unreachability through the control is **stated in the test file**,
  and whichever of the three routes is taken is argued rather than assumed
- The control's one tab stop is walked at **390** as well as at 1440 and 1024
- A real screen reader is used to arrow across the control without committing, and
  whether manual activation is discoverable is recorded either way
- The control's `aria-describedby` is confirmed reachable

---

## Amended 2026-09-13 by Task 2.13.7 — **four new surfaces to walk**, one new keyboard behaviour, and a warning about the instrument

Nothing in this task's scope is removed. What changed is that the page now has
states it did not have when this was written, and one of them is a **listener's**
state that no automated instrument can judge.

### The instrument first, because it invalidates a whole class of observation

**A browser tab driven over CDP reports `document.visibilityState === "hidden"`,
which pauses `requestAnimationFrame` — and `ResizeObserver` delivery with it.**
Measured 2026-09-13: a freshly constructed observer on a laid-out **939 × 221**
element fired **zero times in 500 ms**. Every chart in such a tab therefore
measures zero and renders an `<svg>` at 0 × 0 inside a correctly-sized plot,
which is **indistinguishable on inspection from a real defect** — it cost this
task's predecessor a session chasing one.

This walk is largely conducted by looking at screens, so it matters here more
than anywhere: **Playwright's page is visible and a CDP-driven tab may not be.**
Before believing any observation that depends on layout, read
`document.visibilityState` and count `requestAnimationFrame` ticks for 400 ms.
`CLAUDE.md`'s gap list carries it.

### The four new surfaces

1. **The held-window rail** — a visible sentence in the Price region in four
   forms (§37). Three of them are reachable by hand: `?sessions=1000` after an
   answer, a stalled request, and a 503. It spends **no hue** — a dashed marker,
   `--ink-secondary`, and a dashed hairline — so the greyscale bullet gains a
   confirmation rather than a search, exactly as 2.13.2's amendment framed the
   other two.
2. **The rail's `Try again`** — in the failed state this is the screen's **one**
   retry and it is **a new tab stop**, in a position the panel has never had one.
   The stop count in a failed state is therefore not the stop count in a loaded
   one, which the count bullet should say rather than pick one state and report
   it.
3. **A new clause in the panel's live region** — _"The 5-session window is still
   on screen."_ It is appended after the state's own sentence and after `stale`,
   and it exists so a listener can tell _the page went blank_ from _the page kept
   the previous answer_. **Nobody has heard it.** That is the same class of claim
   as 2.13.5's volume clause and wants the same treatment: walk it with a real
   screen reader and record whether it arrives late enough in a long sentence to
   be missed.
4. **`describeSessionCount` is now spoken in two places** — the control's readout
   (`aria-describedby` on the group) and the rail. A listener arriving at the
   control hears _"Time window … 21 sessions"_; a listener hearing the region
   update hears _"The 21-session window …"_. Confirm those read as one vocabulary
   rather than as two, which is the thing a single grep cannot tell you.

### One new keyboard behaviour, and it is the hard one to reach

**A reading now survives a window change** (§38). The crosshair keeps the bar's
instant and re-anchors to the nearest placed bar in the new window, clearing only
when the instant falls outside it — and **focus is not touched**, so a cleared
reading lands exactly where `Escape` leaves it.

The part to walk is the part the unit tests cannot reach: **what a listener
hears.** The reading's live region is paced, and a window change may move the
crosshair with no key press behind it. Arrow to a bar, press a window cell,
and record whether the new bar is announced, whether it is announced _late_, and
whether a cleared reading says anything at all. If a listener cannot tell that
the crosshair moved, that is a finding rather than a nuisance — it is the case
Epic 11's `setTimeWindow` puts in front of every user.

Note the **manual activation** interaction while you are there: `→ → Space` moves
focus twice and commits once, so a keyboard user reaches a window change with the
plot blurred and no reading live. The re-anchor is therefore **mouse- and
agent-facing** rather than keyboard-facing, which is worth stating in the walk's
record so a later reader does not conclude it was built for a path it does not
serve.

### Two things this walk no longer has to find

- **The control is present and operable in `loading`, `failed` and `refused`**,
  asserted in `e2e/specs/security-window-change.spec.ts` where it actually lives —
  the region's heading row, outside the `ErrorBoundary`. Confirm by keyboard; do
  not re-derive.
- **The three address-reachable refusals are produced without stubbing** in that
  same spec. The walk can use those three addresses as free fixtures for a
  screen-reader pass over a state that has no chart in it.

Add to **Done when**:

- `document.visibilityState` is checked before any observation that depends on
  layout, and the walk says which browser it was conducted in
- The rail is walked in all three reachable forms, greyscale included, and
  confirmed to spend no hue
- The stop count is recorded **per state**, naming the one the rail's `Try again`
  adds
- A real screen reader hears the held-window clause, and whether it is reachable
  in practice is recorded either way
- A window change is driven with a reading live, and what a listener hears about
  the moved or cleared crosshair is recorded

---

## What was done — 2026-09-13

The full record is [`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) **Part seven,
§§42–46**. This is the index into it against the Done-when list.

### Criterion 3

- **Stated in the test file that the week is unreachable through the control**,
  and why: the address carries a session **count**, the week is in the future,
  and there is no absolute form. Options (1) and (2) of 2.13.6's amendment were
  both taken — (1) as the precondition and the assertion about the request,
  (2) as the assertion about the picture. §42.
- `apps/backend/src/routes/market-data.test.ts` — the shipped route, clock
  pinned to `2026-11-30T21:05Z`, `?sessions=5` resolving to
  `2026-11-23T14:30Z → 2026-11-30T21:00Z`: **5 sessions over 7.27 calendar
  days.** Break-verified.
- `apps/frontend/src/fixtures/bar-series/holiday-week.json` — 1,770 bars,
  357 KB, generated by that arrangement over the checked-in calendar. The
  departure from the fixture rule is argued in writing in
  `fixtures/bar-series.ts` and in §42.2.
- `e2e/specs/security-holiday-week.spec.ts` — four seams not five, the five
  dates and not `Nov 26`, the half day's band at `210 / 390`, both plots
  dividing the week identically, and the spoken sentence counting five.
  Break-verified against a forced 390-slot session.

### The walk

- **Tab order recorded per state at four widths** (§44.1). 15 stops loaded,
  14 refused, 15 failed — and the rail's `Try again` takes the position the
  chart's stop had. **Zero occluded** at 1440, 1024, 768 and 390.
- **Every described control reachable** — and one was not (§43.4). Repaired and
  held by a browser assertion that reads the description off the element focus
  landed on.
- **Both alternatives account for volume and for a chosen window** (§44.4),
  still derived from `timeAxis` and `positionOfInstant`. Re-measured by grep:
  one `coverageClause`, two call sites; `timeAxis` and `positionOfInstant` both
  present in `chart-alternative.ts`.
- **Greyscale and deuteranopia exist over the pair and were read** (§44.3),
  including the volume disc and the `1d` window. The control's permutations were
  read rather than written.
- **axe clean over six states at three viewports**, with what it does not cover
  stated (§44.2).
- **`1d` English heard in sequence** with §30.2's six instants (§44.5).
- **Playwright throughout**, `document.visibilityState` checked (§44).

### What the walk found

Four repairs and one measurement — §43, and all four are on `CLAUDE.md`'s gap
list with a re-measure command.

### What is still owed, and to whom

**Three questions need a person with a screen reader** (§45): whether the
25-word bar sentence survives a 1,500 ms floor, whether the held-window clause
is heard at the end of a long sentence, and whether manual activation is
discoverable from _"not checked"_ alone. Each has its repair named. **Task 2.13.10
owns them** — they were handed to Story 2.14's close first and moved back the
same day, because all three surfaces are this story's and a screen's quality is
an acceptance criterion on the story that builds it. §45.3 — that a window change does not announce a moved
crosshair — is recorded as built behaviour and handed to Epic 11.

---

## For the stakeholders — what this actually was, in plain terms

### The short version

Everything MarketPulse can currently show about a security — the price line, the
volume bars beneath it, the crosshair that reads a single minute, and the new
control that switches between a day and a year — had been built, tested and
looked at **by people using a mouse and a screen**. This task was the first time
anybody drove the whole thing with **the mouse unplugged and the screen off**,
and separately, the first time we proved the product counts a holiday week
correctly by **looking at the chart it draws**, rather than by trusting the
arithmetic underneath it.

It found four things that were wrong. That is the point of doing it, and it is
the third time in a row one of these walks has paid for itself.

### The holiday week

One of this story's promises was that when a user asks for "5 days", they get
**five trading days** — not five calendar days. In a normal week those are the
same thing. In the week of American Thanksgiving they are very much not: the
market is shut on the Thursday, shut at the weekend, and **closes at one o'clock
on the Friday**. Five trading days back from that Monday is a span of seven
calendar days with a hole in the middle and a stunted Friday.

The arithmetic for this was already proved. What was not proved is that the
**picture** is right — and a chart is where that kind of mistake shows up as
something a user would actually notice: three hours of blank space on the Friday
afternoon, or a date label for a day nobody traded.

The awkward part is that this week **has not happened yet**. Our database
obviously holds no prices for it, and the product's web address only lets you
ask for "the last N trading days", counted from today — so there is no way to
type a URL that takes you to November. Rather than bolt on a feature from a much
later phase of the project just to make a test possible, we did something more
honest: we ran **our own server** with its clock set to the Monday after
Thanksgiving, let it work out the five sessions from the trading calendar we
already maintain, and recorded exactly what it answered. Then we showed the real
chart that real answer.

It draws it correctly. Four dividers between five days, no divider and no label
for Thanksgiving, and the Friday's band is a little over half the width of the
others because it really was a half day. We then deliberately broke the code to
make sure the test would have caught it — it did.

### The four things that were wrong

1. **A sentence that read as broken English to the only people who hear it.**
   Every chart has a hidden written description for people using a screen
   reader. The volume chart's description said _"The columns cover the first 780
   of 990 trading minutes and **stops** at four o'clock."_ A plural subject with
   a singular verb. Nobody had noticed because the volume chart's description
   had **no tests at all** — the price chart's version of the same sentence is
   grammatically correct, and every test was pointed at that one. Small, and
   exactly the kind of thing that makes a product feel unfinished to the person
   it is meant to serve. Fixed, and the missing tests written.

2. **A description that said data stopped two days later than it did.** On the
   three-month and one-year views, the same hidden description claimed _"the
   bars stop at 13 September"_ when the last actual price was from the 11th. It
   was quoting a bookkeeping timestamp — the moment our nightly data download
   finished — rather than the last real trading day. On the shorter views the two
   happen to be the same number, which is why it had read correctly for a month.
   Now it says _"what is stored reaches only to…"_, which is true on both.

3. **Two labels printed on top of each other.** On the holiday week the chart's
   time axis read `12:00Nov 30` — the Friday's midday marker collided with the
   next Monday's date, because a half day squashes them together. Found by
   looking at the screen; no automated check in this project can see two pieces
   of text overlapping. Fixed with a general rule (a minimum gap between
   labels), not a special case for half days, because a user dragging a time
   range in a later phase will hit the same thing from a different direction.

4. **The most important one: a label nobody using a keyboard could ever reach.**
   The new time-window control shows `1D 5D 1M 3M 1Y` and, beside them, a small
   readout: `21 SESSIONS`. That readout is the _only_ place the product explains
   that "1M" does not mean a calendar month — it means twenty-one trading days.
   It is also the only thing that makes sense of an unusual web address asking
   for, say, seven days, where none of the five buttons lights up.

   For a screen-reader user that readout was attached to the wrong element — a
   wrapper that keyboard focus never lands on. So the explanation was correct,
   present, visible on screen, and **structurally unreachable** by the people who
   needed it most. The automated accessibility checker reported no problem at
   all, because as far as it is concerned the label exists and points somewhere
   real.

   This is the second time this exact defect has appeared in this product. The
   first was the search box, months ago, and we wrote down what it looked like so
   we would recognise it again. We did. It is now attached to each of the five
   buttons, so whichever one a keyboard user lands on, they are told which window
   they are looking at — the same fact a sighted user gets for free from the
   readout sitting next to it.

### One improvement that was not a bug

Both hidden chart descriptions now open by saying **how many trading sessions
the chart covers** — _"The frame is drawn across 21 trading sessions."_

Until the time-window control shipped, there was only one view and nobody had
chosen it, so describing it by its start and end dates said everything there was
to say. Now that a user picks the period, the description was the one place on
screen that never said **which period** it was describing: someone listening to
the one-month view was told "8,190 trading minutes" and left to do the division.

It is calculated from the same code that draws the chart's gridlines, which
matters more than it sounds: a description that counted calendar days would say
"eight days" for Thanksgiving week, and disagree with a picture showing five
columns, with nothing able to tell which was lying.

### What we deliberately did not finish, and why

Three questions in this task can only be answered by a **human being wearing
headphones**, and we are not going to pretend otherwise.

The biggest is a timing problem we can describe precisely but not resolve. When
someone arrows along the chart, the product speaks a sentence: the time, the
four prices, the change, and — added a few days ago — the traded volume. That
sentence is now twenty-five words, which takes about eight seconds to read
aloud. The product allows a new sentence to start every 1.5 seconds. That pacing
was chosen before the volume was added and has not been revisited.

Depending on which screen reader someone uses, the result is either fine (each
new sentence replaces the last) or poor (they pile up in a queue, and the volume
figure — being last — is the first thing lost). We have measured the numbers on
both sides and written down the fix if the answer is "poor": split the sentence,
so stepping along gives the time and the price quickly and the full detail
arrives when the user pauses. **Roughly two minutes with VoiceOver settles it**,
and that is booked into the story's closing task rather than guessed at here.

### Where the product stands

The epic's goal — _find a company, and inspect its recent price and volume
history_ — is functionally complete and has now been checked by keyboard, under
a simulation of colour blindness, with colour removed entirely, and against an
automated accessibility audit across six different states and three screen
sizes. Two tasks remain in this story: a performance measurement, and the
deployment-and-documentation close.

The thing worth taking away is that three consecutive walks of this kind have
each found real defects that every automated check in the project reported as
fine — an overlapping label, a broken sentence, a fact that could not be
reached. Automated tests tell you the thing you built still works. They do not
tell you it was worth building, or that anybody can use it. That still takes
somebody looking.
