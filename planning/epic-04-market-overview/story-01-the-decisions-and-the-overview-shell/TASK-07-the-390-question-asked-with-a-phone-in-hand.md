# Task 4.1.7 — The 390 question, asked with a phone in hand

**Status:** **Measured — 2026-09-25. The question was wrong, and the answer is worse than the question.** _Below the fold_ is not what happens: the status bar is **sticky**, on screen at any scroll, and when the feed drops it **grows from four lines to six**. What is actually wrong is the timing — a client that loses its network reads **`LIVE` for exactly 165 seconds** before anything changes. **Nobody fails to notice the fold, because for two minutes forty-five seconds there is nothing to notice.** The decision is Story 4.7's, with the alternatives priced. **The person's half is booked for tonight's session, on `/securities`** — the protocol is below.
**Story:** [4.1 The Decisions & the Overview Shell](STORY.md)
**Depends on:** 4.1.3

## Objective

**Epic 4's own `EPIC.md` says this is owed a person BEFORE this epic ships a
screen**, and this story is the screen.

> _"Because the connection has one home and that home is sticky at the foot of
> the viewport, at 390 the distinction between the feed stopped and the market
> is shut is below the fold. No check can see it. This epic is where it matters
> most."_

**And one thing is already known that narrows it**, measured on 2026-09-25 by
Task 3.11.8: at **390 × 780 the status bar is on screen**, sticky at the foot,
about four wrapped lines. So _below the fold_ is the wrong description of the
shipped page, and the question is not presence but **noticing**: whether a
reader looking at figures at the top of a phone screen registers a change in a
four-line strip at the bottom.

**That is not answerable from a screenshot**, which is why it is a task with a
person in it rather than a spec.

## What the user can see when this lands

**Either nothing, or a repair to the one thing that tells them their numbers
have stopped being true** — and which of those is the honest output rather than
a foregone conclusion.

## Work

- The deployed site opened **on a real phone during a session**, on `/`
- The feed interrupted, and **the time to notice recorded** — by the person,
  not inferred
- The result written down whichever way it goes, including _nobody noticed and
  we are changing nothing_, with the reason
- **If a repair is needed, the constraint it must not break is stated first**:
  the connection has one home, and a second surface reporting it is the defect
  this product has produced four times. A repair that adds a second connection
  word needs a measurement and a decision, not a hunch
- `docs/GAPS.md`'s entry re-verdicted with what was learned

## Done when

1. A person has looked, on a phone, during a session
2. The time to notice is a number or an explicit _did not notice_
3. The entry says what is now known, and any repair carries the one-home rule
   in its reasoning

## Amended by Task 4.1.6 — 2026-09-25: one session serves both, and it is already running

**The coverage instrument is live and covers today's session** — started 07:13
ET for 560 minutes, through the close. **This task needs the same session**, and
Epic 3's most-repeated scheduling lesson is that the scarce thing is the sitting
rather than anybody's attention.

**So take them together.** Nothing else has to be started: the curve is
collecting itself, and what this task adds is a person with a phone during the
same hours.

### And one thing is already known that narrows the question

Task 3.11.8 measured that **at 390 × 780 the status bar is on screen**, sticky
at the foot, about four wrapped lines. So _below the fold_ is the wrong
description of the shipped page.

**The question is noticing, not presence** — and since Task 4.1.3 the landing
page at 390 is **seven stacked regions**, which is a taller scroll than the page
that measurement was taken against. **A reader at the top of that scroll is
further from the status bar than they were**, which is the case this task should
actually test: not _can you see it_ but _do you notice it change while you are
reading a figure_.

---

## What was done — 2026-09-25

### The question was answerable without waiting for the bell, and answering it changed it

**The feed does not need the market open to be interrupted.** The deployed
backend holds its socket out of hours (§9.3, confirmed at 07:26 ET today,
`status: live`), so a client can be disconnected from it at any time by taking
away its network — which is exactly what a phone does in a lift.

So the measurement was taken immediately, at **390 × 780**, against the
deployed site, by removing the browser's network and sampling the status bar's
word every five seconds:

```text
t=0s   connected: LIVE
t=20s  LIVE
t=40s  LIVE
…
t=160s LIVE
t=165s DISCONNECTED
```

**Exactly 165 seconds**, and reproducibly so.

### Why, and it is not a mystery

`DISCONNECTED_AFTER_MS` is **165 s**, the monotonic watchdog: _no inbound frame
of any kind_ (`LIVE-DATA.md` §11.2, ADR 0036). **It governs the browser's view
as well as the backend's**, and the socket closing does not flip the word — the
client detects that immediately and uses it only to start reconnecting.

> **The number was derived for a different socket.** It comes from Alpaca's
> upstream heartbeat — 53.96–54.85 s across 82 intervals, three missed — and it
> protects against flapping during a deploy, measured at **~46 s** of feed
> outage. Both of those facts are about the **backend's** connection to its
> vendor.
>
> **The browser's socket has its own heartbeat**: Task 4.1.6 measured the
> gateway sending a `feed` frame every **20–50 s**, unchanged, precisely so a
> quiet market still produces inbound traffic. So a browser could know its
> gateway socket is dead **long before 165 s** and still not cry wolf on a
> 46-second deploy.

### Two things the same run settled, and both weaken the fold story

- **The status bar is sticky**, so it is on screen at 390 at any scroll
  position. Task 3.11.8 measured that; this confirms it on a second surface.
- **When the word does flip, the bar GROWS** — four wrapped lines to six — and
  `BACKEND SERVICE` goes `UNREACHABLE` beside it. That is a **size change that
  moves the page**, which is a stronger peripheral signal than a word swap, and
  the opposite of the concern this task inherited.

### So the inherited claim is corrected rather than confirmed

Epic 4's `EPIC.md` said the distinction is _below the fold_ and that _no check
can see it_. **The first half is wrong and the second is right for a different
reason**: no check can see whether a person notices, and no check can see that
there is nothing to notice for 165 s either, because every liveness test in
this repository injects the state rather than waiting for the clock.

**Amended in place**, and the decision handed to **Story 4.7** — which owns the
overview's degraded states and is the right place for a change to a shipped
vocabulary's timing. The alternatives are priced in its file: today's 165 s, a
shorter browser-side threshold (~75 s), retries-failing-for-N, or the socket
closing (which does flap on a deploy).

> **And the owner chose to investigate rather than patch**, which is the right
> call: ADR 0036's rule is that the two-clock shape is the durable half and
> **the numbers are dated observations that get re-derived, not tuned.** A
> browser-side threshold is a third number and needs its own derivation from
> the gateway's heartbeat.

### The person's half, booked with a protocol

**On `/securities` rather than on `/`.** The landing page has no moving figures
until Story 4.2 — every region is reserved — and _do you notice it while
reading a figure_ needs a figure. `/securities` has 518 live rows, the same
chrome and the same fold.

**Five minutes, during tonight's session:**

1. Open `https://red-smoke-029583a0f.5.azurestaticapps.net/securities` on a
   real phone after **21:30 local**, and read the rows for a minute — prices,
   changes, whatever draws the eye. **Do not look at the bottom of the screen.**
2. **Airplane mode on**, without watching for it.
3. Keep reading. **Say when you first notice anything at all** — the expected
   answer is _about three minutes_, and _not at all_ is a valid one.
4. **Airplane mode off**, and note whether the recovery is visible.
5. **The control, and it matters**: do the same for two minutes **without**
   turning anything off. If something gets "noticed" in the control too, the
   answer is noise rather than a signal.

**Record the answer whichever way it goes**, including _nobody noticed and we
are changing nothing_, with the reason. The row belongs in
`LIVE-REHEARSAL.md`'s ledger beside the others.

### The entry this task was told to re-verdict does not exist

**`docs/GAPS.md` has no entry for the fold.** The claim lives in Task 3.10.9's
record — which is history and stands — and in Epic 4's `EPIC.md`, which is a
live claim and is the one amended. **Recorded because the task's own brief
asserted an entry**, and a brief that names a document is worth checking against
the document.

### The instrument

**Deleted, which is this repository's shape for a throwaway** — and the reading
above is quoted verbatim, which is what makes that safe.

### Gates

`pnpm links` green. No product code changed; the measurement is a reading of
the deployed site.

## For a stakeholder — a status report, 2026-09-25

### The question we were asked to answer

Our product shows one small indicator, at the very bottom of the screen, that
tells you whether live prices are still arriving. On a phone that is a long way
from the numbers you are actually reading, and we had written down a worry:
**would anybody notice it change?**

### The answer is that the worry was aimed at the wrong thing

**For the first two minutes and forty-five seconds after a phone loses its
signal, the screen still says LIVE.** Nothing changes. There is nothing to
notice.

We measured it on the real deployed site: exactly **165 seconds**, every time.

> **This is not a bug, it is a number that was chosen for a different job.** It
> was set so that when we ship a new version of the software — which costs about
> 46 seconds of live prices — the screen does not flash a scary warning at
> everybody for no reason. That is a good reason. But it also governs the very
> different case of _your phone went into a tunnel_, where waiting three minutes
> to say so is a long time to show somebody stale prices as if they were live.

### And two things turned out better than we feared

The indicator **is** visible on a phone — it sticks to the bottom of the screen
no matter how far you scroll. And when it does change, it **gets bigger**, from
four lines to six, which shifts the whole page. That is much easier to catch out
of the corner of your eye than a word changing.

**So the original worry — that it is hidden — is simply wrong**, and we have
corrected the document that said so.

### What happens next

**We chose to investigate rather than patch.** Changing that 165-second number
is a change to something the whole product relies on, and our own rules say
numbers like that get **re-derived from a measurement**, not nudged because
somebody is uncomfortable. The work is now booked into the piece of work that
owns exactly this question, with four options costed.

**And a person still looks tonight**, on the screen that actually has moving
prices, because "does a human notice" is the one question no amount of
measurement answers.

### Where this leaves us

This is the last measurement the landing page's foundations needed. What remains
is the close — and then four pieces of work, each ending with something new on
the screen: the index summary, the sectors, the breadth of the market, and the
day's biggest movers.
