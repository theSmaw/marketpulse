# Task 3.10.5 — The edge that stopped, and the gap in the middle

**Status:** **Complete — 2026-09-24, and the premise it was written on was false.** The stopped edge **is** drawn and has been since Story 2.12: the line stops at the coverage edge, a **dashed rule** marks the boundary and the ground after it is **washed**. Produced on a running page rather than reasoned about. The two decisions are therefore _what to ADD_, and both are **nothing**: a dead feed adds nothing to the plot, because a mark derived from the **connection** is neither of the two kinds `CHARTING.md` allows; and a gap in the middle stays unmarked, because **no feed this product can buy makes a missing minute exceptional**. Three browser assertions hold all of it.
**Story:** [3.10 Disconnection, Staleness & Every Degraded State](STORY.md)
**Depends on:** 3.10.2

## Objective

The chart's two degraded shapes, which Story 3.9 built the surface for and
deliberately left undrawn.

## What the user can see when this lands

**A chart that stopped extending says so**, and a chart with a hole in the
middle stops drawing a straight line across it as though nothing were missing.

## The two shapes, and they are different problems

### 1. The stopped edge

Story 3.9's close: _the line simply stops growing, and nothing says so._ There
is no marker, no fade and no gap — **the plot ends at the last bar that arrived
and looks exactly like a chart of a window that ended there.**

Task 3.9.3 took that deliberately, with three noes, on the reasoning that
nothing should be drawn until there is a vocabulary for it. **You are the
vocabulary.**

Two facts sharpen it:

- **The chrome already speaks.** The feed cell says `STALE` or `DISCONNECTED`
  and the chart says nothing — two surfaces, one fact, one of them silent. That
  is this file's own recurring defect shape.
- **The reading strip keeps answering.** A reading **holds its instant** (Task
  3.9.6), so a crosshair parked on the last bar reports it correctly and
  indefinitely after the feed dies. That is right, and it means the strip is
  **not** where a reader would learn the feed stopped.

### 2. The gap in the middle — and its reversal trigger has FIRED

Task 3.5.5 refused to invent missing minutes, on the grounds that _a reconnect
that silently invents them is worse than one that plainly resumes_. **Its
recorded trigger is a condition: the first surface where a gap in the middle is
visibly wrong rather than merely absent — a chart drawing a straight line across
four missing minutes.** Story 3.9 built that surface. The trigger has fired.

**The axis closes gaps up by design** (session-ordinal, ADR 0027), which is
correct for a weekend and wrong for a dropout. `CHARTING.md` §3's own reversal
trigger was evaluated by Task 3.9.1 and had **not** fired then. **Re-evaluate
it here**, because the input has changed.

## The trap the store hands you

**Nothing in the store tells a dropout from a quiet security** (Story 3.8's
close). `bar_coverage` is extended to the last bar seen, so a disconnection
between 10:00 and 11:30 leaves ninety minutes **inside a covered window with no
rows in them** — indistinguishable from ninety minutes in which nothing traded,
which on IEX is ordinary.

**Only this story knows the connection dropped**, and only while the page is
open: **after a reload the page has no memory of it at all.** A reader who
reloads during a gap sees a thin chart and no explanation. Decide what that
reader gets, explicitly.

## Work

- The stopped edge's treatment, argued against the real thing on a real screen
  the way Task 3.4.4 argued the arrival mark
- The gap-in-the-middle treatment, and `CHARTING.md` §3's trigger re-evaluated
- What a reader who reloads during a gap is told, decided rather than defaulted
- Both drawn on both plots, since they share one axis and one reading
- Browser assertions against a produced disconnection, using 3.10.2's harness
- `pnpm probe` at four viewports if either plot's shape moves

## Done when

1. A stopped edge is distinguishable from a finished window, asserted
2. A gap in the middle is not a straight line, or the decision not to change it
   is written down with its trigger
3. The reload case has an answer

---

## What was done — 2026-09-24

### The premise was false, and producing the state is what showed it

Story 3.9's close wrote, and this task inherited:

> the plot ends at the last bar that arrived and **looks exactly like a chart of
> a window that ended there**.

**It does not.** Produced on a running page with the socket killed:

```html
<rect class="_uncovered_…" x="484" width="242" height="280" />
```

The line stops at `x=484`, a **dashed rule** marks the boundary, and the
remaining **242 px of a 726 px frame** is washed. A window that ended there
would have neither. **About a third of the plot changes treatment between the
two readings.**

That is the coverage treatment, shipped in Story 2.12 and asserted since Task
2.12.7. **The paragraph was written from the code rather than from the screen**
— corrected in Story 3.10's own file, which had copied it forward.

### Decision 1 — a dead feed adds NOTHING to the plot

The chart already says the true thing: _we hold no data here_. That is true
whether the market has not reached those minutes yet or our socket died, and
**the difference is a fact about the connection**.

> **The rule it would break.** `CHARTING.md`: _a mark derived from the WINDOW
> runs the full frame, and a mark derived from the BARS stops at the coverage
> edge._ A mark derived from the **connection** is neither — it is a third
> kind, and the plot's appearance would start depending on a socket rather than
> on data.
>
> **And the fact has a home.** The chrome says `DISCONNECTED`, with its own
> sentence and instant, four inches below the plot (Task 3.10.2). ADR 0029's
> fourth rule: the surface that owns the data owns the account of it and
> everything else points once and stops. Two surfaces saying one fact is the
> defect this repository has produced three times on one screen.
>
> **Reversal trigger, as a condition:** the first chart this product ships that
> a reader meets **without the chrome on screen** — an exported image, a
> printed evidence card, an agent's pinned panel. The wash means _no data here_
> and only the chrome says why; separate them and the chart owes the reason.

Asserted: _killing the feed changes nothing on the plot_ — the plot's entire
`innerHTML` and its washed width are identical either side of the drop.

### Decision 2 — the gap in the middle stays unmarked, and Task 3.5.5's trigger is answered

**That trigger has fired**: _the first surface where a gap in the middle is
visibly wrong rather than merely absent_ now exists, and `linePath` really does
emit one `M` and an `L` per point, so the line runs straight across.

**The answer is still no, and the trigger's premise is why.** It assumes a
missing minute is **exceptional**:

| Feed                          | Coverage of a session's minutes |
| ----------------------------- | ------------------------------- |
| IEX, median symbol            | **65.1%** (`LIVE-DATA.md` §7.6) |
| IEX, worst case (`ERIE`)      | **2.1%**                        |
| **Consolidated tape**, `ERIE` | **131 of 390** — 33.6%          |

**There is no feed this product can buy on which a missing minute is unusual.**

> **Rejected — wash every missing minute.** It reuses the coverage vocabulary
> exactly, which is the tempting part, and it would put **a hundred washes and
> two hundred dashed rules** on an ordinary session chart while marking the
> feed working as the feed failing. It is also the element count ADR 0027
> exists to refuse.
>
> **Rejected — wash only long gaps.** A width threshold, and the store
> **cannot tell a dropout from a quiet security** (Story 3.8's close):
> `bar_coverage` is extended to the last bar seen, so ninety missing minutes
> sit inside a covered window either way.
>
> **Chosen — the line stays continuous.** A close line joins the closes we
> hold; it has never claimed to be a tick trace. **The count is the honest
> channel for thinness** and the spoken alternative already carries it —
> _covers the first 780 of 990 trading minutes_.

`CHARTING.md` §3's own trigger is re-evaluated in place, with the note that
Task 3.9.1 had already evaluated it and this adds the input that task could not
have: the live edge shipped, and a feed can now stop mid-session.

### Decision 3 — the reader who reloads during a dropout gets no explanation, and that is correct

After a reload the page has **no memory of its own socket**, and the store
genuinely cannot tell those ninety minutes from ninety in which the security
did not trade.

**A page inventing the distinction from a memory it no longer has would be
asserting something it cannot know** — which is the one thing this product
refuses most firmly. What the reader has instead is true: a chart of the
minutes we hold, and a count that says how many.

### The assertions

`security-chart-edge.spec.ts`, three tests, produced through Task 3.10.2's
harness:

1. **an edge that stopped does not read as a window that ended** — washed
   ground present, and the spoken sentence carries the count
2. **killing the feed changes nothing on the plot, which is the decision**
3. **the line stays continuous across the minutes a thin name did not trade** —
   one `M` in the path, which is what the rejected alternative would break

> **One race caught in the writing.** The first draft read the washed width in
> the same tick as the spoken sentence appeared, and got **0**: the sentence
> lands with the state, and the plot's geometry needs a measured box that
> arrives a frame later from the `ResizeObserver`. It polls now. Had the
> assertion been written the other way round — _expect no wash_ — it would have
> passed for the wrong reason.

### Gates

`pnpm verify` green — 26 invariants. `pnpm e2e` green. **No product code
changed**: the drawing this task was written to add already existed, and what
it added is three assertions, two recorded decisions and one correction.

## For a stakeholder — a status report, 2026-09-24

### What this was meant to be

**The plan said: when the live feed stops, the chart just ends — and nothing
tells you why. Go and fix that.**

We went to fix it and found the chart was already doing the right thing. So
this task became two decisions about what _not_ to add, and the evidence to
stop either being reopened.

### What the chart already does

When the data stops, the chart does three things at once:

- the line **stops** where the data stops;
- a **dashed vertical rule** marks the boundary;
- everything after it is **shaded** as ground we hold nothing for.

About **a third of the picture** changes appearance. It is not subtle, and it
has been there since the charts were first built — we had simply written down
the opposite, from reading the code rather than looking at the screen.

That is the sixth time in this phase of work that going and looking has
overturned something we believed. It keeps being worth the half hour.

### Decision 1 — a dead feed adds nothing to the chart

The shading already says the true thing: _we have no data for this part of the
day._ That is equally true whether the market simply hasn't got there yet or
our connection died.

**Which of those it is, is a fact about the connection — and the status bar
already says it**, four inches below the chart, with the time the data was good
to. Putting it in two places is how a product ends up with two versions of one
fact that drift apart, which we have done three times on this very screen.

There is also a rule it would break. Everything on our charts is drawn either
from _the period you asked for_ or from _the data we hold_. A mark drawn from
**the connection** is a third kind, and it would make the picture change shape
because of a network socket rather than because of the market.

### Decision 2 — we will not mark gaps in the middle

This is the one with a real measurement behind it.

An earlier decision said: _if a gap in the middle ever becomes visibly wrong,
come back and mark it._ That moment has arrived — the chart does draw a
straight line across missing minutes.

**But the premise was wrong.** It assumed a missing minute is unusual. On our
live feed, a typical share is only reported in **65%** of a session's minutes.
On the _full market tape_ — the best data money can buy us — one of our quieter
shares traded in **131 minutes out of 390**.

**There is no data feed we can buy where a missing minute is unusual.** Marking
them would put roughly a hundred shaded bands on an ordinary chart and label
the feed working as the feed failing — exactly the crying-wolf problem every
decision in this story has been steering around.

So the line stays continuous, and the honest channel for "how much data is
behind this picture" remains the **count**, which the chart already states:
_covers the first 780 of 990 trading minutes_.

### Decision 3 — and one thing we deliberately cannot fix

If you reload the page during a dropout, you get a slightly thin chart and no
explanation.

We considered remembering the dropout across the reload. We decided against it,
because after a reload the page genuinely does not know, and our stored data
**cannot distinguish** ninety missing minutes caused by a dropped connection
from ninety minutes in which the share simply did not trade. Inventing that
distinction would be the product asserting something it cannot know — which is
the thing we refuse most firmly.

### What we actually built

**Three automated checks** that lock in what the chart does and both decisions —
including one that confirms killing the feed leaves the chart _character for
character identical_, because that is the decision rather than an accident.

One of them nearly passed for the wrong reason: our first version measured the
shading in the same instant the chart's text appeared, and got zero — the text
lands a frame before the geometry does. Had the check been written the other
way round ("expect no shading") it would have gone green on a race.

### Where the product stands

**Epic 3's final story, five of ten tasks done.** The status bar, the headline
price, all 518 table rows and now the charts have each been held to the same
question: _does this surface tell the truth when the data stops?_

**What is next:** filling the gap a dropout leaves, so a brief outage stops
costing the rest of the trading day.
