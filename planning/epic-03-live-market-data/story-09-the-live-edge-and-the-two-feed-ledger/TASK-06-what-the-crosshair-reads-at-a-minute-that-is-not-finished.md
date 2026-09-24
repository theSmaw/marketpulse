# Task 3.9.6 — What the crosshair reads at a minute that is not finished

**Status:** **Complete — 2026-09-24. Both decisions were already right, and both for the same reason**: the reading carries the bar's **instant** and stores **no values**, so it holds its instant when a newer bar arrives and updates in place when the bar it names is revised. Measured in a browser rather than reasoned about. The finding this task did not expect is the listener's: **the chart's polite live region now changes with no key pressed at all**, which is the first time on this page, and the sentence in shipped code that justified it as safe is about key presses.
**Story:** [3.9 The Live Edge on the Chart & the Two-Feed Ledger](STORY.md)
**Depends on:** 3.9.5 (3.9.4 deleted 2026-09-24)

## Objective

Criterion 7: the reading strip, the crosshair and the keyboard walk all work at
the live edge, **including on the partial final bar** — which is a reading whose
subject changes underneath the reader.

## What the user can see when this lands

**The last bar can be read like any other**, by pointer or by keyboard, and what
it says about itself is honest about being unfinished.

## The three things that make this harder than it sounds

**1. The reading is a snapshot of a moving thing.** `End` walks to the last bar;
a minute later that bar has different numbers and there is a newer last bar.
Whether the reading follows the edge or stays on the instant it was taken is a
decision, and both are defensible — _stays_ is a reading of a bar, _follows_ is a
reading of "now". Take it explicitly.

**2. The spoken sentence is already 25 words against a 1,500 ms pacing floor.**
`docs/GAPS.md` carries a standing item — **a listening pass with a real screen
reader, four entries, owner: a person with a screen reader** — and the chart's
bar sentence is the entry with the figure on it. A live edge that re-announces
on every burst would put a fifth entry on that list. Whether the reading strip
is a live region at all, and what happens when its subject changes while a
listener is mid-sentence, is readable from neither the DOM nor a timing.
**Add the entry rather than inventing an answer**, and say what was designed.

**3. `toBarSeries`'s ascending rule reaches here too.** A reading keyed on slot
index against a series that gained a bar is a reading of a different bar.

## Work

- Decide and document whether a reading follows the edge or holds its instant
- Pointer, keyboard (`Home`, `End`, arrows, `Escape`) and the strip, all working
  at the edge, asserted in a browser
- The spoken string for a partial minute, written down in full, with its word
  count beside the existing 25
- A `docs/GAPS.md` entry for whatever only a listener can settle, with a
  re-measure and a named owner
- The one tab stop and the one crosshair are unchanged — this adds no second
  focus target

## Done when

1. The edge is readable by pointer and by keyboard, asserted
2. The follow-or-hold decision is written down with its alternative
3. The listening question is in `docs/GAPS.md` rather than answered by guess

---

## Amended by Task 3.9.1 — 2026-09-24: the title's premise is wrong, and the real question is better

**There is no minute that is not finished.** A bar arrives at the end of the
minute it describes (`LIVE-DATA.md` §7), so every bar the crosshair can reach is
complete. The task's subject is therefore **not** reading an incomplete bar.

**What it is instead**, and it is the harder half of the same problem: the bar
under the crosshair can **change while it is being read**. A revision lands
about thirty seconds after its bar on 0.064% of bars, 35.3% of them changing the
close — so a reader who walked to the last bar with `End` and is looking at its
figure can see that figure move, and a listener can be mid-sentence when it
does.

That sharpens the decision this task already carries — _does a reading follow
the edge or hold its instant?_ — into two decisions, because they are different
questions:

1. **When a NEW bar arrives**, does the reading move to it?
2. **When the bar being read is REVISED**, does the reading update in place?

The second has an answer the first does not: a reading that is stale about the
bar it names is wrong in a way a reading that is merely not-the-latest is not.

## What was done — 2026-09-24

### The two decisions, and both were already right

Measured on the real components by pressing `End`, pushing a held-back
**recorded** bar through the socket, and reading the drawn strip either side:

| After                   | The drawn strip                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `End`                   | `Sep 4 · 15:56 EDT O 230.60 H 230.74 L 230.53 C 230.60 BAR — unchanged 0.00%`       |
| a **new** bar arrives   | **identical**                                                                       |
| that bar is **revised** | `Sep 4 · 15:56 EDT O 230.60 H **235.74** L 230.53 C **235.60** BAR **▲ up +2.17%**` |

**Decision 1 — a newer bar arriving: the reading HOLDS its instant.** A reading
is a reading of a **bar**, not of _now_ — which is the canvas's own distinction
(_a slot is a position on the axis; a bar is a thing that traded_) applied to
time instead of to space. A reading that crept forward would mean a reader
could never hold one still.

> **Rejected alternative: follow the edge.** Defensible for a _glance_ at the
> latest price — and that glance already exists, in the identity block, which
> is what the block is for. A second thing doing it would take the crosshair's
> only job away from it.
>
> **Reversal trigger, as a condition:** the first surface that shows a reading
> the reader did not place — an agent's `pinEvidence`, or a replay cursor. A
> reading nobody pointed at has no instant to hold.

**Decision 2 — the bar it names being revised: the reading UPDATES IN PLACE.**
A reading that is stale about the bar it **names** is wrong in a way a reading
that is merely not-the-latest is not: the strip says `Sep 4 · 15:56` and four
prices, and if those are no longer what we hold for 15:56 the strip is
asserting something false about a named minute.

> **Rejected alternative: freeze the numbers as they were read.** It would make
> the strip a screenshot, and this product's rule is that a claim about data
> requires data — the data it is about has changed.
>
> **Reversal trigger:** a measurement showing revisions common enough that a
> figure visibly flickers under a reader, which §14.1's 0.064% is nowhere near.

**Both are true by construction rather than by anything this task built.**
`ChartRead` carries the bar's **instant** beside its index and `resolveRead`
keys on the instant with the index as a fast path (Task 2.13.7, built for a
window change); and the strip stores **no values**, so the numbers are
re-derived from the drawn series every render. Two decisions, one mechanism,
neither written for this.

### The finding this task did not expect: a listener is spoken to with no key pressed

The reading strip is a polite `role="status"`, and the reason it was safe to be
this page's **fourth** such region is written in the component:

> it is safe to be the fourth for one reason: **nothing else on this screen
> updates when a key is pressed.**

**That sentence is about key presses, and since Task 3.9.2 the chart updates
without one.** The two cases are not the same, which is the saving grace:

- **A new bar changes nothing this region says.** The reading holds its instant,
  so the sentence is the same sentence and there is no announcement.
- **A revision of the bar under the crosshair rewrites it**, unprompted — and
  that is arguably the one case where speaking is **right**, because the number
  under the reader's cursor has just changed.

Both halves are asserted in `security-live-edge.spec.ts`. The comment is
amended in place with both measurements.

### What only a listener can settle, and it is a FIFTH entry

`docs/GAPS.md`'s standing listening item gains the case that arrives by a new
route: **an unprompted polite update landing while a sentence is in progress**
either queues or replaces, reader by reader, and no DOM and no timing can say
which. Every half an instrument can perform is performed; the deciding half is
a property of a specific screen reader on a specific platform.

**Owner unchanged — a person with a screen reader** — and this entry is the
argument for booking that pass rather than deferring it a sixth time.

### The keyboard, at the edge

Asserted: after a bar arrives, `ArrowLeft` steps from where the reading **is**
rather than from a stale index (which is why `resolveRead` hands back the
resolved position); `End` then reaches the bar that arrived; and `Escape`
clears the reading and **keeps the focus**. One tab stop, one crosshair, no
second focus target — unchanged.

### The title was wrong and stays

_What the crosshair reads at a minute that is not finished_ describes a case
that does not exist — Task 3.9.1 established there is no partial bar anywhere.
The file keeps the name because a renumbered or renamed task is a trap for
every reader who followed a link to it; the amendment at the top says what the
subject actually is.

### The canvas

`Price reading.dc.html` — the file that already owns this surface — gains **a
reading whose subject can change underneath the reader**: the two decisions
with the mechanism that makes each true by construction, the measured table
above, and the live-region finding with the sentence it falsifies. Everything
above that section is unchanged and the note says so: one tab stop, one
crosshair, the focus ring round the plot, two strips each naming its own
subject.

**Amended rather than added to**, which is ADR 0026's chain the right way round
for the second story running now that the canvas is reachable.

## For a stakeholder — a status report, 2026-09-24

### What this was

**When you point at a price on the chart, what should happen to that reading
when new prices arrive?** That is the whole question, and it has two halves
that turned out to need opposite answers.

### The two answers

**If a newer minute arrives, your reading stays where you put it.** You pointed
at 15:56; you are still looking at 15:56. A reading that crept forward on its
own would mean you could never hold one still, and a chart you cannot point at
steadily is not a chart you can read.

**If the minute you are pointing at gets corrected, the numbers update under
you.** Our data provider occasionally sends a revised version of a minute about
thirty seconds later. The reading names a specific minute — "15:56" — so if we
are no longer showing the right prices for 15:56, the reading is telling you
something false about a minute it has named. It updates, and the time label
does not move.

**Both were already correct**, which we confirmed by measuring rather than
assuming. They come from one design decision taken two epics ago for a
different reason entirely: the reading remembers _which minute_ you pointed at
rather than _which position on the screen_, and it holds no numbers of its own.

### What we did not expect to find

**A screen-reader user can now be spoken to without pressing anything.**

The reading has a spoken counterpart that announces politely when you move the
crosshair. That was safe, and the code says exactly why: _nothing else on this
screen updates when a key is pressed_.

**That sentence is about key presses — and since two days ago the chart updates
on its own.** So if you are pointing at a minute and that minute gets
corrected, you will be read a new sentence with no action on your part.

We measured both cases, and the distinction matters: a **new** minute arriving
says nothing (your reading did not change), and only a **correction to the
minute you are reading** speaks. That is roughly one bar in 1,500 — and it is
arguably the one moment where speaking unprompted is exactly right, because the
number under your cursor has just changed.

### What we deliberately did not decide

**What a real screen reader actually does with that interruption.** Whether an
unprompted announcement waits for the sentence in progress or cuts it off
differs by reader and by platform, and it is readable from neither the code nor
a stopwatch. We did every part a machine can do and wrote the rest down as the
fifth item on a standing list that needs a person with a screen reader and
about an hour.

**We are recording that plainly rather than guessing**, because a guess here
would be an accessibility claim we cannot support — and the list existing is
the argument for booking the hour rather than deferring it again.

### Where the product stands

**Five of nine tasks done.** What you can see: during trading hours, both
charts extend as the session runs, and you can point at any minute — including
the newest — by mouse or keyboard, and it behaves the way you would expect in
both directions.

**What is next:** the ledger that says which part of a chart came from which
data source, which is the last piece of visible work in this story.
