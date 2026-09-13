# Task 2.13.7 — Every state of a window change, produced rather than described

**Status:** Complete — 2026-09-13
**Story:** [2.13 Volume Chart & Time-Window Selection](STORY.md)
**Depends on:** 2.13.6

## Objective

Render every state a window change can reach, each one produced from a **recorded
response body** collapsed through the real transition rather than from a state
somebody typed — the shape Tasks 2.10.8 and 2.12.7 established.

The story's acceptance criterion 4 is the whole of this task, and its second clause
is the load-bearing one: **a failed window change leaves the previous data visible
and labelled rather than blanking the page.**

## What the user can see when this lands

**An honest sentence for every way a window can answer, and a chart that never
flickers empty on its way to a new one.** Changing the window keeps the old series
on screen, marked stale, until the new one arrives; a window with no data says so; a
partly covered one shows how much it holds; a refused one carries the server's own
sentence and offers no retry where waiting cannot help; and a failed change leaves
the previous window's charts on screen, labelled, with one `Try again`.

## Work

- **The states, and most of them already have renderings.** `loading`, `loaded`,
  `partial`, `empty`, `refused`, `failed`, plus stale-while-loading — `CHARTING.md`
  §14 decided all six with **one rule**: a mark derived from the window runs the
  full frame; a mark derived from the bars stops at the coverage edge. `empty` is
  that treatment at coverage **zero** rather than a seventh state; `refused` and
  `failed` draw **no frame at all**, deliberately, because neither carries a window
  a frame could be built from. What is new here is that there are now **two plots**
  and a **control** in each of those states, and the control is the thing most
  likely to be left in a state that contradicts the chart.

- **Stale-while-loading is inherited whole and is this task's centre**
  (`FRONTEND-STATE.md` §2's amendment): a held answer for the same request paints in
  the first commit, marked with a rail above the body — a dashed marker, a sentence,
  a travelling dashed hairline — and **no number is touched**; the settle wash plays
  only if a figure actually moved. A **stale** chart is identical to a fresh one,
  one mark for one answer, on the panel's rail. Your control is the **second** thing
  to produce this transition and the first to produce it deliberately, so it is the
  natural place to check the mark under a **rapid** sequence of changes, which
  nothing has done.

- **Superseded, in a real browser, finally.** Change the window while a request is in
  flight. `useBarSeries` asserts this by request identity in jsdom because there has
  never been a client-side route from one request to another; this control is that
  route. Record what the screen actually does, and note Story 2.11's amendment holds
  the other half of the same gap.

- **Two refusals that are not user errors.** A window **over the cap** — a 400 that
  names the number, rendered verbatim, with no retry because waiting never helps —
  and a window **off the calendar's range**, which `lastMarketSessions` refuses
  rather than shortening (ADR 0017 decision 9). Whether the second is reachable was
  decided in 2.13.6; if it is, it is rendered here, beside "empty" and "partly
  covered" rather than in a crash. **Write no copy around a bar count**: every
  number on this surface comes from the response, and a sentence built around a
  figure is wrong for every window but one.

- **The reading, across a change.** The crosshair is anchored to a bar that may not
  exist in the new window. Decide whether it clears or re-anchors, and make the
  keyboard case explicit — focus must not be lost, and `Escape`'s contract is that
  it clears the reading and **keeps** focus.

- **Record the bodies you need, and say their names.** The fixture set is fourteen
  bodies today and every one of them is `1m`. At minimum this task needs a `1d`
  body — §17.5 item 5 — and whatever the window transition needs that no existing
  body provides. Each new body under `apps/frontend/src/fixtures/` **must not reach
  the shipped bundle**, and the re-measure is per fixture by a string only it
  contains: `dense.json` is 221,603 B, `uncovered.json` is 146,807 B, and the
  universe body is 190,736 B. Add the new one's grep to `CLAUDE.md`'s list in the
  same change.

- **Two surfaces must not describe one failure in the same words.** Search and the
  universe table already share a fetch and it happened **three times in one
  afternoon**, caught every time by a locator resolving to two nodes rather than by
  anybody reading the page. A window control, a price chart and a volume chart now
  share one fetch — three surfaces, one event.

- **A control is present in every state, or it is absent from a state nobody
  noticed.** The search field was missing from three of its states for two tasks
  with `pnpm verify` green throughout, because a component nobody renders raises
  nothing. The window control must be on screen in `loading`, `failed` and
  `refused` too — a reader whose window was refused needs the control that picks a
  different one.

## Done when

- Every state renders for **both** plots and for the control, from a recorded body
  collapsed through the real transition
- A failed window change leaves the previous window's charts on screen, labelled
  stale or failed per the inherited rail, with exactly one `Try again`
- A rapid sequence of window changes is exercised and what the stale mark does is
  recorded
- A superseded answer is observed in a real browser and written down
- Both refusals render, carrying the server's sentence, with retry offered only where
  it can help
- The reading's behaviour across a change is decided and tested
- New fixtures exist, are named in `CLAUDE.md`'s bundle-leak list with their own
  grep, and `dist/` is verified to contain none of them
- No two surfaces describing the same failure use the same sentence
- Stories per state for the pair and the control; `pnpm stories` passes
- `pnpm verify` and `pnpm e2e` pass

## Notes

The fence is **provenance**. A stitched series naming two feeds is Story 2.14's
subject and a materially larger surface than a label; what this task owes it is that
the states do not make 2.14's sentence impossible to place.

The trap is believing a break went red. A state rendered from a body that cannot
reach it proves nothing: `loaded` is the one state where the window-derived and
bar-derived x-domains agree, which is why anything built against it alone proves
nothing at all.

---

## Amended 2026-09-12 by Task 2.13.1 — two judgements this task owns, and a correction

[`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) placed both refusals and left this
task two things to decide that its Work section does not currently name.

**Correction: reachability was decided in 2.13.1, not in 2.13.6.** The bullet
above says _"whether the second is reachable was decided in 2.13.6"_. §6 decided
it: **neither refusal is reachable through the control.** The calendar refusal is
reachable by a hand-typed address and by Epic 11's `setTimeWindow`; the cap is
reachable only through the **absolute** window form. Both are still rendered
here — a state the control cannot cause is still a state the product can be in —
and both carry the server's sentence with **no retry**, because a refusal is a
fact about the request rather than about the moment.

**§1.3's trigger is this task's to fire or not, and it needs a person.** 1D is
offered knowing it is reliably `empty` on a nightly-backfilled store. The written
reversal trigger is: **if the `empty` rendering at 1D reads as a broken product
rather than as an honest one when somebody looks at the screen, 1D is withdrawn
until Epic 3's live feed lands.** That judgement was deliberately deferred to
this task because this is the first task that can see it. Look at it, and write
down the answer either way — `CHARTING.md` §12.6 is the standing reminder that
four automated simulations passed against a chart a person spotted was wrong.

**§6.3's labelling tension is named and not resolved, on purpose.** `refused` and
`failed` draw **no frame at all**, deliberately, because neither carries a window
a frame could be built from. Acceptance criterion 4 asks that a failed window
change leave the previous data visible and labelled. Those are compatible — a
refusal is an answer about the **new** window, and the previous window's series
is still a true picture of the **previous** window — but only if the label above
it says **which window is on screen**. That is this task's to design, and it was
written down so it is inherited rather than discovered halfway through.

**The `1d` body moved to 2.13.6**, which is the task that first makes a `1d`
window reachable and therefore first executes `chart-alternative.ts`'s unverified
English. Whatever bodies the transitions themselves need are still this task's.

Add to **Done when**:

- The label above a `refused` or `failed` chart names **which window** is on
  screen, and a test proves a reader cannot mistake the old window for the new one
- §1.3's trigger is answered in writing, from a screenshot, either way

---

## Amended 2026-09-13 by Task 2.13.2 — one of this task's stated risks cannot occur, and one surface became three

Two carries from [`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) Part two.

**The control cannot contradict the chart, and that is structural.** The Work
section says _"the control is the thing most likely to be left in a state that
contradicts the chart"_. §14.1 removed the mechanism: the control follows the
**address**, not the request, so its selection moves in the frame the press lands
and it has **no pending, loading or disabled state at all**. The chart carries
the stale rail; the control carries nothing. So the thing to test here is not
that the two agree under load — they cannot disagree — but that the control is
**present and operable** in `loading`, `failed` and `refused`, which the Work
section already requires for the reason the search field taught: a component
nobody renders raises nothing.

**The chart adds nothing to the stale rail, and that is now a decision to hold
rather than a question to answer.** §14.1: two windows have no interpolable
intermediate, so there is no dim, no blur, no fade and no second style on a held
series. A **stale** chart is identical to a fresh one. Declining it is what keeps
`FRONTEND-STATE.md` §2's own reversal trigger — _a chart that redraws a held
series in a second style_ — unfired, and this task is the first thing in the
product that could fire it by accident.

**And the "two surfaces, one failure" bullet is now four surfaces.** It counts a
window control, a price chart and a volume chart. Since 2.13.5 there are **two
readout strips** as well (§15), each a surface with its own sentence, and the
page already carried four live regions before any of this. The rule is unchanged
and the count is what matters: **a readout belongs to a subject and its sentences
name it**, and nothing anywhere catches a sentence with no subject.

Add to **Done when**:

- A held series is drawn in **exactly the same style** as a fresh one, and a test
  or a screenshot shows the only difference is the rail above it
- Both readout strips are accounted for in the "no two surfaces, one sentence"
  check

---

## Amended 2026-09-13 by Task 2.13.3 — two small facts about what the volume plot draws in the states with no bars

Nothing in this task's scope moves. Two consequences of the arithmetic are worth
inheriting rather than finding, and both are about the states this task exists for.

- **`empty` and `loading` draw a volume frame with no columns and an empty
  gutter.** `volumeFrame` returns no path when there are no bars, and
  `volumePeakLabel` returns `null` — so volume's single value label is **absent**
  rather than `0`. That is deliberate: a peak of nothing is not zero shares traded,
  it is no answer. The frame, the seams, the two date labels and the uncovered
  ground still draw, because those come from the window. `refused` and `failed`
  draw no frame in either plot, unchanged.
- **A window in which nothing traded is a different state from `empty`, and it is
  reachable.** `volumeDomain` answers an all-zero window with a ceiling of **one
  share**, so every column is zero pixels tall and the picture is a baseline with
  no columns on it — while the gutter reads `0` and the series is genuinely
  `loaded`. It is not one of the six and it needs no new rendering; it is worth
  knowing that a blank volume plot beneath a drawn price line has two possible
  causes and only one of them is a shortfall.

The "no two surfaces describe one failure in the same words" count is unchanged at
four surfaces plus the page's live regions.

---

## Amended 2026-09-13 by Task 2.13.4 — the volume half of every state is already rendered, and the surface count went up again

### Six of this task's states already exist for the volume plot, as stories

2.13.4 built `VolumeChart.stories.tsx` and `ChartAxis.stories.tsx` from recorded
bodies collapsed through the real transition — `Wide`, `Narrow`, `Dense`,
`Waiting`, `NoBars`, `Uncovered` and `Refused`, plus the **pair** at four of
those. So this task's _"stories per state for the pair"_ item is largely paid,
and what is left is the states only a **window change** can produce: stale, the
rapid sequence, superseded, and both refusals **arriving after a held answer**.

Reuse those stories rather than writing a second set. A second `NoBars` story
built for this task would be a second rendering of one state with nothing
comparing them — and the volume plot's `empty` is deliberately the uncovered
treatment at coverage zero rather than a state of its own, which is a property
two independent stories could quietly stop sharing.

### The surface count is now **six**, not four

The 2.13.2 amendment counted a window control, a price chart and a volume chart,
then added two readout strips. 2.13.4 added a **sixth**: the volume plot's own
text alternative, `volumeAlternative`, a hidden paragraph that describes the same
window and the same shortfall the price chart's sentence describes.

It is not a live region — deliberately, for the reason the price chart's is not —
so it does not queue against the page's four polite regions. It **is** a surface
with a sentence about an event three other surfaces also describe, which is the
thing that went wrong three times in one afternoon on the search screen. The two
alternatives are told apart by subject (`NVDA price chart:` / `NVDA volume
chart:`) and by a shared coverage clause parameterised on which mark it is about —
_the line runs_ against _the columns run_. **Check that a window change does not
collapse that distinction**, which is the one way it could: a state whose sentence
drops its own subject reads as the other plot's.

### One state that is not one of the six, and it now has a second cause

2.13.3's amendment recorded that an all-zero window draws a baseline with no
columns while the gutter reads `0`. 2.13.4 adds the other half of that
observation, and the pair is what a reader actually sees: **a volume plot with no
columns beneath a price line that has some has three possible causes** — nothing
was asked for yet (`loading`, no wash), nothing is held (`empty`, whole-plot
wash), or nothing traded (`loaded`, no wash, a `0` in the gutter and a sentence
saying so). The wash and the gutter are what separate them, and a window change
can move between all three. Render them adjacent somewhere a person looks.

Add to **Done when**:

- The volume plot's existing state stories are **reused**, and any new story is a
  state a window change produces rather than a second copy of one 2.13.4 drew
- The "no two surfaces, one sentence" check counts **six** surfaces, the two text
  alternatives included, and no window change makes either alternative drop its
  subject
- The three causes of a columnless volume plot are distinguishable on screen, and
  somebody looked at them side by side

---

## Amended 2026-09-13 by Task 2.13.5 — the reading's behaviour across a change is **already decided by default**, and the default is the wrong one

This task's Work section says _"the crosshair is anchored to a bar that may not
exist in the new window. Decide whether it clears or re-anchors."_ That was
written when the read position did not exist. It does now, and it has a behaviour
— so this task is **overriding a default rather than choosing from two options**,
and the default is not either of the two the bullet names.

### What is built, precisely

The read position lives in `ChartAxis` as `{ index, source }`, in a **second
context** whose consumers are the two reading overlays and neither frame owner
([`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) §27). `index` is a position into
`readings`, which both plots build from the same `placeBars(axis, bars)` — which
is what lets one index address one bar in both.

A window change replaces `view`, rebuilds both frames, and **does not touch the
index**. Each overlay reads it through a bounds check, so:

| The new window is     | What the reader sees                                                   |
| --------------------- | ---------------------------------------------------------------------- |
| **shorter**           | No reading. The index is out of range and both overlays render nothing |
| **as long or longer** | A reading of a **different bar**, silently and plausibly               |

The second row is the one that matters, and it is worse than it looks: index 300
of a five-session `1m` window and index 300 of a 1Y `1d` window are not adjacent
facts, they are different years. The crosshair lands somewhere real, the strips
state a real instant and a real volume, and nothing is wrong on screen except the
answer.

### Why it has not been seen, which is the reason to decide it deliberately

**Both input paths clear the reading on the way to the control.** A pointer
travelling to a control above the plot fires `onPointerLeave`; a keyboard user
tabbing to it blurs the plot. So a person operating 2.13.6's control cannot
normally hold a reading across the change at all.

What can:

- **Epic 11's `setTimeWindow`** — an agent changing the window with nobody
  touching anything. This is the case the product is being built for, two epics
  early, and it is the one with no pointer to leave the plot.
- **A rapid sequence**, which this task already owes: press two windows quickly
  and the second change lands while the first answer is in flight.
- **Any later control a pointer can reach without leaving the plot** — an overlay
  button, a context menu, a keyboard shortcut on the chart itself.

So this is a fence that is currently held by a coincidence of layout, and a
coincidence of layout is not a decision.

### What to decide, and the two candidates

- **Clear on a window change.** Honest and cheap; the cost is that an agent's
  `setTimeWindow` leaves a reader who was mid-reading with nothing, having not
  asked for that either.
- **Re-anchor by instant.** Keep the bar's `startsAt`, find the nearest placed bar
  in the new window, and clear only if the instant falls outside it. More work,
  and it is the only answer that means anything at all when the two windows
  overlap in time — which four of the five do.

Whichever: **the keyboard case is explicit and is part of the decision.** Focus
must not be lost, and `Escape`'s contract is that it clears the reading and keeps
focus — so a cleared reading caused by a window change must leave focus exactly
where a cleared reading caused by `Escape` does.

### Two smaller carries

- **The volume strip is the one surface that changes with nobody pointing at
  anything.** Its resting state is the window's **peak and when it happened**,
  which is a window-derived fact — so a window change rewrites it even with no
  reading live. That is correct, and it is a cheap visible confirmation that a
  change landed, in a state where the charts may still be showing a held answer.
  Make sure it is not mistaken for a reading, and note that it is `null` where a
  window holds no bars, in which case the strip renders nothing at all.
- **The "no two surfaces, one sentence" count stays at six, with a wrinkle.** The
  volume strip is `aria-hidden` by design (§23.1 — `volumeAlternative` already
  states the peak, and an exposed strip would state it twice), so it cannot
  collide with either alternative **by sentence**. It can still collide
  **visually**, which is the check to run on it: the volume strip and the volume
  region's own copy must not say the same thing in the same words on screen.

Add to **Done when**:

- The reading across a window change is decided **against the built default**, not
  chosen from two hypotheticals, and the test proves the case that is hard to
  reach: a change with a reading still live, driven without a pointer
- A cleared reading leaves focus where `Escape` leaves it
- The volume strip's resting peak is shown changing with the window, and is
  distinguishable on screen from a reading

---

## Amended 2026-09-13 by Task 2.13.6 — the control exists, one Work bullet is paid, and every state has gained a **second timeframe**

Nothing in this task's scope moves and nothing is deleted. Four carries, and the
second is the one that makes this task bigger than it was written to be.

### The `1d` body bullet is paid, and the fixture set is **sixteen**

The Work section says _"the fixture set is fourteen bodies today and every one of
them is `1m` … at minimum this task needs a `1d` body"_. Both halves are done:
`daily.json` (63 sessions, the `3M` window) and `daily-year.json` (252, `1Y`),
recorded from the **deployed** store and named in `CLAUDE.md`'s bundle-leak list
with their own greps. Whatever bodies the **transitions** need are still this
task's; a `1d` one is not.

### Every state now has a timeframe dimension, and the two look different

This is the real widening. A window change is no longer only a change of _length_
— `3M` and `1Y` resolve to `1d`, which draws **no session seams**, dates instead
of times on the axis, and one column per session rather than a silhouette. So
each of the six states has two pictures, and the crossing between them is a state
of its own: **the transition from `1m` to `1d` replaces the axis's vocabulary, not
just its extent.**

Two consequences worth inheriting rather than finding:

- **A `1d` window is `partial` by construction on any store that is not caught up
  to the current session.** A named window always reaches to the current session's
  close, so `3M` asks for a window ending tomorrow-midnight and the store holds
  through the last backfilled session. On the local store that is a sliver of
  uncovered ground at the right-hand edge; on the deployed store it is one
  session. Neither is a defect and both are the coverage treatment working — but
  it means **`loaded` is effectively unreachable at `1d`**, which is worth knowing
  before a state is assumed missing.
- **The three causes of a columnless volume plot** (2.13.4's amendment) gain a
  fourth arrangement at `1d`: one column per session is wide enough that a single
  missing session is visible as a gap, where at `1m` it is invisible inside a
  silhouette.

### Two refusals are now reachable from the address bar, with no stubbing at all

2.13.1's amendment records that **neither refusal is reachable through the
control**. That is unchanged and it is not the whole picture: with the address
reading the window, three refusals are now reachable by typing a URL, which makes
them cheap to produce in a browser and cheap to photograph.

| Address          | What the server answers                                   |
| ---------------- | --------------------------------------------------------- |
| `?sessions=1000` | the **calendar** refusal, naming 2024-01-01 to 2028-12-31 |
| `?sessions=0`    | _"A window of zero sessions contains nothing."_           |
| `?sessions=abc`  | _"… is not a session count"_, naming `NaN` — see §31.1    |

The last one is the state 2.13.6 shipped a second readout form for (`NOT A
SESSION COUNT`), and it was verified on screen. **The cap refusal is still
unreachable** through any address this product writes, because §2.1's mapping
forecloses it — so it stays a fixture-driven rendering.

### The control is already present in every state, and that is structural

The Work section requires it, and the check is a **confirmation** rather than a
build: the control is rendered from `Region`'s `control` slot, which sits on the
panel's heading row **outside** the region's `ErrorBoundary` and outside every
branch of the panel's state switch. So a chart that throws, a refusal and a
failure all leave the control exactly where it was. Assert it; do not rebuild it.

And §14.1's "cannot contradict the chart" is now true in code rather than in
design: the component holds **no state at all**, so there is no pending flag to
leave stale.

### One judgement this task owns, with an observation rather than an answer

§1.3's trigger — _does 1D's permanent `empty` read as a broken product or an
honest one_ — is still this task's to answer in writing. As input and not as the
answer: it was looked at on 2026-09-13 on the local store and read as **honest** —
the whole frame is uncovered ground, the hourly ticks and the date are drawn from
the window, and the sentence beneath says _"No bars stored for this window."_
Nothing about it looks like a fault. Take that as one person's reading of one
store and answer it from the **deployed** page, where the store is caught up and
1D's emptiness is a fact about the free plan's fifteen-minute embargo rather than
about a backfill.

Add to **Done when**:

- Every state is rendered at **both** timeframes, and the `1m` → `1d` crossing is
  exercised as a transition rather than as two separate windows
- The three address-reachable refusals are produced **without stubbing**, and the
  control is shown present and operable in each
- The control's presence in every state is asserted where it actually lives — the
  region's heading row, outside the boundary — rather than re-argued

---

## What was built — 2026-09-13

**Status: complete.** `pnpm verify` green, `pnpm e2e` green at **129 tests** —
eight of them new.

### A stakeholder's account of it, in plain English

**The problem, in one sentence.** Until today, if you were looking at NVDA's last
five trading days and you pressed the button for the last month, the chart went
blank while the new data was fetched — and if that fetch failed, or the period
you asked for was one the system cannot answer, it stayed blank. You pressed a
button and the screen took away the thing you were already reading.

That is a bad experience anywhere. On a market screen it is worse than bad,
because an analyst mid-thought loses the evidence they were reasoning about, for
no reason: the five days of data were correct, they were on the screen, and
nothing about them stopped being true.

**What happens now.** The old chart stays. Every time. While the new period
loads, while it fails, and even when the system refuses the request outright —
the five-day picture you were looking at remains exactly where it was, at full
brightness, with every number under it unchanged. What appears above it is one
short line that says, in words, _which_ period is still on screen and what
happened to the one you asked for:

> **Still showing the 5-session window. The 21-session window could not be read.**
> This is usually temporary. Try again in a moment. **[ Try again ]**

That sentence is the whole of the design decision, and it is why the picture is
allowed to stay. A chart of one period sitting silently under a button that says
a different period is a **lie** — plausible and wrong, which is the most
dangerous kind of wrong in a product whose job is evidence. A chart of one period
sitting under a line that names that period is simply a true picture with a
caption.

**Why we did it this way rather than the obvious ways.**

- We did **not** add a new "sort-of loading" state to the system's vocabulary.
  The application already describes what it knows about data in six states, and
  every screen in the product branches on those six. Adding a seventh would have
  put a new case into every one of those branches for ever. What we added is much
  smaller: the application now simply remembers the last real answer it drew,
  alongside the question that answer was to. That single memory covers the
  loading case, the failure case and the refusal case at once.
- We did **not** dim, blur or fade the old chart. It is tempting, and it is
  wrong: those figures are _correct_, and dimming a price an analyst is reading
  makes it harder to read in order to say something the caption already says in
  words. The held chart is drawn identically to a fresh one. The only difference
  is the line above it.
- We did **not** animate the transition between two periods. Five trading days
  and twenty-one trading days have no meaningful halfway picture — a chart
  morphing between them would be drawing four charts of periods nobody asked
  for, to soften the arrival of the one they did. What moves instead is a single
  dashed hairline under the caption, and only while something is genuinely in
  flight. When the answer has settled — refused, or failed — the movement stops
  and the dashes stay.
- We kept one hard limit: **the old data is thrown away the instant you switch
  to a different company.** NVDA's chart under an AMD heading would be the worst
  failure this product could have, so that case still clears the screen, exactly
  as before.

**A second, quieter fix came free.** The same rule — _keep the last real answer_
— also covers something nobody had reported: when you returned to a page the
application had cached and the background refresh failed, the correct cached
chart used to be replaced by an error message. It no longer is.

**Reading a specific bar now survives a period change.** Hovering the chart, or
arrowing across it with the keyboard, puts a crosshair on one bar and states its
prices and volume. Previously, changing the period left that crosshair pointing
at whatever bar happened to sit at the same _position_ in the new data — which,
going from five days of minutes to a year of days, is a different year. It looked
completely normal and was completely wrong. The crosshair now remembers the
**moment in time** it was on, and finds the nearest bar to that moment in the new
period; if the new period does not reach back that far, the reading is simply
cleared, and your keyboard focus stays exactly where it was. This matters
earlier than it looks: in a few epochs' time the AI agent will change the period
by itself, with nobody's hand on the mouse, which is precisely the case where
this silently went wrong.

**We also found and fixed a real bug by looking at the running page rather than
at a test.** If you opened a link containing a period the system cannot answer —
say, a thousand trading days — and then pressed one of the normal buttons, the
chart never appeared again. The numbers were all correct, the frame was drawn,
and the drawing inside it was zero pixels wide. The cause was that the chart only
ever measured its own size once, when it first appeared, and in that particular
sequence it first appeared with nothing to draw. Nothing in our automated checks
could have caught it — the test environment has no concept of screen layout at
all — so it took a person opening the page. There is now a browser test that
holds it, and we deliberately reintroduced the bug to confirm the test catches
it.

**One judgement was deferred to this task months ago, and it has been answered.**
The period control offers "1D" — one trading day — knowing that during market
hours we hold no data for it yet, because our data is topped up overnight. The
open question was whether that empty state would read as _a broken product_ or as
_an honest one_, and the rule was that a person had to look and decide. A person
looked, at full desktop size, on both our development data and the live site.
**It reads as honest, and 1D stays.** The chart still draws a real trading day's
axis, the whole area is shaded in the same way a partly-covered period is shaded,
and the sentence beneath says what was asked for and why nothing is in it. As a
bonus, the live site turned out to be _better_ than the note predicted: outside
market hours, 1D shows a complete, detailed intraday chart.

### What a user can see today that they could not yesterday

- Change the period and **the chart never flickers empty** on its way to the new
  one.
- A period that **fails** to load leaves the previous chart on screen, clearly
  labelled, with one retry button.
- A period the system **refuses** — pasted in a link, or sent by an agent —
  leaves the previous chart on screen with the server's own explanation beneath
  it, and no retry button, because waiting would not help.
- The **period buttons remain usable in every one of those states**, which is the
  point: someone whose chosen period was refused needs the control that picks a
  different one.
- A **crosshair reading survives** a period change when the new period still
  covers that moment.

### What they still cannot do

Watch a price move. There is still no live market feed — that is the next epic —
and four of the seven regions on this screen are still deliberately empty,
each naming the epic that fills it.

### How this moves the product forward

This is the last substantive task in the story that adds behaviour; what remains
is a keyboard and screen-reader walk, a performance measurement, and the story's
close. With it, **Epic 2's exit criterion is met in substance**: a user can
search for a company, open it, choose a period, and inspect real historical price
and volume — and every way that can go wrong is now a designed state rather than
an accident.

It also pays forward in two specific places. Epic 11's AI agent will change the
period by issuing a `setTimeWindow` command, and everything above — the held
chart, the caption, the re-anchored crosshair — is exactly what makes that
command safe to hand to a model two epics before the model exists. And Epic 3's
live feed will land on the same seam: a screen that already knows how to keep
showing the last true thing while it waits for the next one is a screen ready to
be fed by a socket.

### Where the record is

- **The decisions, with their alternatives and reversal triggers:**
  [`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) Part six, §§36–41.
- **The design:** `Window change.dc.html` on the `Component library for
MarketPulse` canvas — the four rail sentences, the three-frame sequence of a
  press, the states at both timeframes, the four causes of a columnless volume
  plot, and the crosshair across a change.
- **The code:** `market/held-series.ts` is the rule and its three transitions;
  `BarSeriesPanel.tsx`'s `HeldWindow` is the rail;
  `chart-reading-context.ts`'s `resolveRead` is the crosshair;
  `use-plot-box.ts` carries the measurement repair.
- **The instruments:** `e2e/specs/security-window-change.spec.ts` (eight tests),
  `market/held-series.test.ts`, `chart-reading-context.test.ts`, and the five new
  `BarSeriesPanel` stories.

---

## Done when — how each item was met

| Item                                                                     | Where                                                                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Every state renders for both plots and the control, from a recorded body | `windowChangeFixtureScreen` runs two requests through the real transitions; five panel stories   |
| A failed change leaves the charts, labelled, with exactly one retry      | `security-window-change.spec.ts`, and `BarSeriesPanel.test.tsx`'s count of one                   |
| A rapid sequence is exercised and the stale mark recorded                | _a rapid sequence of presses settles on the last one, showing one held answer_ — **one** rail    |
| A superseded answer observed in a real browser                           | the same test: three presses inside one answer's flight, address and rail both on the last       |
| Both refusals render, with retry only where it helps                     | _the three refusals the address reaches are produced with no stubbing_                           |
| The reading's behaviour across a change is decided and tested            | §38; `chart-reading-context.test.ts` (7) and `ChartReading.test.tsx` (4), all keyboard-driven    |
| New fixtures, named in `CLAUDE.md`'s leak list                           | **none were needed** — see the note below                                                        |
| No two surfaces describing one failure share a sentence                  | six surfaces checked; the control's readout and the server's refusal were the one near-collision |
| Stories per state; `pnpm stories` passes                                 | 31 components, 31 stories files                                                                  |
| `pnpm verify` and `pnpm e2e` pass                                        | green; 129 browser tests                                                                         |
| The label names **which window** is on screen                            | §37, and three tests assert the sentence names both windows                                      |
| §1.3's trigger answered in writing                                       | §39 — **1D stays**, with a correction to the premise from the deployed store                     |
| A held series is drawn in exactly the same style as a fresh one          | the browser suite compares the **series path data** before and after; it is identical            |
| Both readout strips accounted for                                        | neither changed; the volume strip's resting peak follows the window, as §23 designed             |
| The volume plot's existing state stories reused                          | reused; the one new volume story is `ColumnlessCauses`, a state no single view shows             |
| The three causes of a columnless volume plot distinguishable             | `VolumeChart.stories.tsx` → `ColumnlessCauses`, the three adjacent                               |
| Every state at both timeframes; the `1m` → `1d` crossing exercised       | the crossing is exercised as a **transition** by `resolveRead`'s tests and `ChartReading`'s      |
| The three address-reachable refusals produced without stubbing           | `security-window-change.spec.ts`, and the control asserted operable in each                      |
| The control's presence asserted where it lives                           | asserted in the refused and failed states rather than re-argued                                  |

**On fixtures, and why none was recorded.** The Work section anticipated new
bodies; the `1d` half was paid by 2.13.6 and the rest turned out not to be
needed, which is worth stating rather than leaving as a silence. A window change
is a **sequence of two requests**, and every state it can reach is a _pair_ of
bodies this directory already holds — `dense` then `refusedCalendar`, `partial`
then `unavailable`, `dense` then `daily` for the timeframe crossing. What was
missing was not a body but a way to collapse two of them through the real
transitions in the real order, which is `windowChangeFixtureScreen`. Adding a
seventeenth body would have been a second rendering of a state the sixteen
already reach. `CLAUDE.md`'s bundle-leak list is therefore unchanged.
