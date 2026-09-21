# Task 3.4.7 — What a listener hears, and what survives the motion being removed

**Status:** **Complete — 2026-09-21.** The qualifier's instant **is** the survivor, asserted in a browser rather than argued. Five browser tests under an emulated `prefers-reduced-motion`, one break behind the defect Task 3.4.5 shipped, and criterion 4 is now a **check** rather than a screenshot. The live-region decision is _announce nothing_, with four reasons and a reversal trigger. Two entries added to the listening backlog.
**Amended:** 2026-09-21 after Task 3.4.6 — the spoken qualifier is now **three clauses**, and three of the five greyscale states are already checked.
**Amended:** 2026-09-21 after Task 3.4.4 — the quiet minute is the one state where the mark is the SOLE signal, and reduced motion erases exactly that one. Check the qualifier's instant first; it may already be the survivor.
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](STORY.md)
**Depends on:** 3.4.6

## Objective

The two readers a motion vocabulary can silently exclude: the one who cannot see
it, and the one who has asked for less of it.

## What the user can see when this lands

**Nothing new on a default screen**, and that is the point — the change is
entirely in what a _different_ reader gets.

## What is already decided and must not be re-taken

- **`prefers-reduced-motion` is answered at the token layer.** Durations resolve
  to `0ms` under the preference. **What this task owes is the consequence:** a
  flash that is the **only** signal of a change is a change **invisible** to
  that reader — so whatever carries direction must survive the motion being
  removed. Criterion 3 is that sentence.

> **AMENDED 2026-09-21 — Task 3.4.4's decision creates exactly one state where
> that sentence bites, and it was not foreseeable before the decision.**

**On a minute where the price MOVED, criterion 3 is satisfied without doing
anything**: the digits are different, the percentage is different and the
arrow may be different, all of them present with the motion removed. The mark
only says _look_.

**On a QUIET minute it is not.** The owner chose to fire the mark on **every bar
arrival**, including one that changes nothing — and on that minute the mark is
the **only** signal, because by definition no digit moved. Under reduced motion
the mark does not run. **So a reader who asked for less motion gets nothing at
all on precisely the minute the mark exists to report.**

**Check the qualifier before designing anything**, because the survivor may
already be there: the line carries the bar's own instant, and on a real arrival
that instant **advances** whether or not the price did. If it does, criterion 3
is met by a fact already on the screen and this task's answer is to **say so and
assert it** rather than to invent a static fallback. If it does not, the hole is
real and it is this task's to fill.

- **Colour is never the sole encoding of anything**, and criterion 4 says it is
  checked in **greyscale rather than argued**. The price palette differs by
  1.04:1 in greyscale, so hue is the entire difference.
- **Do not announce a price change by default.** The story says it in as many
  words: **decide it, and write down what was decided and what nobody has heard
  yet.**

## The listening question, and the honest limit on answering it

A region that changes on its own is a live-region question, and this repository
already has a **known, unshipped repair** in that area: the spoken bar sentence
is 25 words against a 1,500 ms pacing floor, and **whether a region changing
every 477 ms queues or replaces is readable from neither the DOM nor a timing
nor by an agent.**

A price changing **once a minute** is a gentler case than that one and is the
same question.

**What can be decided here:** whether the region is live at all, what politeness
it would take, and what a listener is handed when the price changes — which is
the **DOM text**, not the treatment.

> **AMENDED 2026-09-21 after Task 3.4.6 — the DOM text got a third clause, and
> that is a change to the thing this task is actually about.**

The qualifier now reads **three clauses rather than two** when a price comes
from outside the regular session:

```text
Sep 16 · 07:42 EDT · pre-market · change from 2026-09-04's close
```

**A listener is handed the concatenation**, so this is not a cosmetic addition —
it is the spoken sentence getting longer, on a surface that changes **once a
minute**, against a pacing floor this repository has already measured at
**1,500 ms**. Three things follow and none of them is decidable from a DOM:

- **How the `·` is spoken**, or whether it is spoken at all, differs by screen
  reader. A separator that reads as _dot_ three times in one line is a different
  sentence from one that reads as a pause.
- **Whether the clause order survives being heard.** Task 3.4.6 asserted the
  order — _when · what kind of when · what it is measured from_ — because it
  reads as a sentence. That was checked as **text**, not as speech.
- **Whether it is announced at all.** The default is that it is not, and the
  qualifier is not a live region. **Check that is still true** now that it has
  a clause that only appears sometimes: an element that appears and disappears
  is the shape that gets a region added to it by accident.

**Two things Task 3.4.5 left you, both concrete:**

- **`[data-arrival]` is the handle.** The mark carries it and it is stable; the
  two `data-` hooks that task was told to keep were deleted instead, because
  once the treatment moved inside the module nothing read them. If a browser
  assertion wants another handle it adds one **with a stated reason**.
- **The mark is already `aria-hidden="true"`**, asserted in the component
  suite — so the live-region decision here is about **the DOM text**, and the
  default of announcing nothing is already what the tree does rather than
  something this task has to impose.

**What cannot be decided here:** whether the result is pleasant to listen to.
That is owed by **a person with a screen reader**, is owned by them rather than
by a story, and this task **adds to that backlog rather than discharging it** —
which the story says explicitly, so recording a new entry is success rather than
a shortfall.

## Work

- **Decide the live-region question and write it down**, including the default
  (announce nothing) and what would change it.
- **Make direction survive `prefers-reduced-motion`**, and assert it — a test
  that only exercises the default preference is a test that cannot see this.
- **Check the whole set in greyscale**: a tick up, a tick down, **an unchanged
  tick — which DOES draw**, settled by Task 3.4.4 rather than left conditional —
  an extended-hours mark and a correction. Five states, one screenshot.
  **Three of the five are already done** (Task 3.4.6, on the running page: the
  arrival mark is `--ink-primary`, the extended-hours word is text, and `▼`
  still carries direction), so **confirm rather than re-derive** — what has
  never been in a greyscale frame is the **correction**, and the workshop's
  `ExtendedHours` story set is where the other two already are.
- **Add the listening entry** to the open list, naming what nobody has heard.

## Done when

- Under `prefers-reduced-motion` a price change is **still perceivable** and
  direction survives — asserted rather than argued
- **Under `prefers-reduced-motion`, an UNCHANGED tick is still perceivable** —
  the state where the mark is the sole signal, asserted separately because the
  moved case passes without it
- **The mark is INVISIBLE under the preference rather than permanent** — the
  defect Task 3.4.5 shipped and repaired, now `docs/GAPS.md` entry 11 and owned
  here. Assert it in the browser with `reducedMotion: "reduce"`, because no
  level below one can read a computed opacity
- Direction is never carried by hue alone, **checked in greyscale**
- The live-region decision is written down with its default and its trigger
- The listening backlog names this surface
- `pnpm verify` passes

---

## What was found

### The survivor was already on the screen, and now it is asserted

The brief said to **check the qualifier before designing anything**. It was
right to: on a real arrival the instant advances whether or not the price did,
so criterion 3 is met by a fact already there rather than by a fallback this
task had to invent.

**It is asserted rather than argued**, which is the whole difference:

```text
✓ an UNCHANGED tick is still perceivable with the motion removed
    reducedMotion: reduce · same close, one minute later
    14:01 → 14:02, price still 219.50
```

**Nothing was designed and that is the outcome, not a shortfall.** The one state
where the mark is the sole signal turned out to have a second signal in it
already, and the correct response to that is to hold it still with a test.

### Five browser tests, and none of them could exist below one

**Twice over, and both halves have to be true at once.** No stylesheet is
applied in the component tests — `getTokens()` throws there by design — so **a
computed opacity is not a question that level can ask**. And
`prefers-reduced-motion` is a media query, which only a real engine evaluates.

|                                                | What it holds                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| the mark is **invisible** under the preference | `docs/GAPS.md` entry 11 — the defect Task 3.4.5 shipped                      |
| and it **does** run without it                 | the control, without which the first passes against a mark that never worked |
| a price that **moved** is still perceivable    | criterion 3's easy half                                                      |
| an **unchanged** tick is still perceivable     | criterion 3's hard half, and the reason this task exists                     |
| nothing carries direction by **hue alone**     | criterion 4, as a check rather than a screenshot                             |

**The pair is the shape to copy.** The first test alone would pass just as well
against a mark that never worked — which is this suite's own recorded hazard,
_an assertion about an absence passes for free on a deployment that cannot
produce the thing_, and it has already cost this epic four days once.

**Two mechanical things learned and written into `e2e/README.md`**, because the
next spec that emulates a preference will meet both. **Assert the animation, not
a sampled opacity** — a 900 ms decay read at an arbitrary moment is a race,
while `0s` against `0.9s` is not. And **match a `@keyframes` name with a
regex**: CSS Modules scope and hash it, so the computed value is
`_arrival-decays_14tpr_1` and asserting the literal is asserting the bundler.
That one was found by the test failing.

### Criterion 4 became a check, and the first draft of it was wrong

The task asked for **five states in one greyscale frame**. Enumerating what the
block actually paints answered it better and keeps answering it: the price
palette differs by **1.04:1 in greyscale**, so what matters is not how a frame
looks but whether anything carries meaning in **hue alone**.

Measured on the running page — the identity block paints exactly **one**
hue-bearing element, `PriceChange` at `rgb(197, 34, 31)`. Everything else is
ink. And none of the five states adds another: a correction renders exactly what
a tick renders, and the extended-hours mark is a **word**. So a fourth and fifth
frame would have been the same pixels, and the assertion covers all five plus
every state added after them.

**The first draft of the check failed on the best encoding in the component.**
It looked for `▲`/`▼` only and reported `PriceChange`'s visually-hidden _up_ as
an offender — an element that carries direction **more** strongly than the glyph
does, because it is what a listener is handed. A check written from a rule's
letter rather than its point will do that; the rule is _direction is carried by
something other than hue_, and a word qualifies.

### The live-region decision: a price that changes on its own announces NOTHING

Written into `FRONTEND-STATE.md` §7 with its reversal trigger, because that is
where the one-region-per-subject rule already lives.

**Story 3.4 put the product's first self-changing number on a screen**, and
every live region before it announced the result of something **a user did**. A
price arriving is the first thing that would announce itself **unprompted, and
for as long as the page is open**.

Four reasons, three of them measurements:

- **The page already has three `role="status"` regions** — counted on
  `/securities/NVDA`, one deliberately empty. A price region would be the
  **fourth** on one screen.
- **§11.2's p50 of one minute and maximum of 187** means a region announcing
  every arrival speaks about **once a minute, indefinitely**, against a
  **1,500 ms** pacing floor — a screen reader talking over its user roughly
  sixty times an hour about a number nobody asked for.
- **The argument this page's third region was spent on does not transfer.**
  Search speaks 400 ms after a keystroke, which is _the user just did
  something_; this block fills when two other regions do.
- **The information is not lost, only unprompted**, and a listener who goes and
  reads gets **more** than a sighted reader glancing does: direction is a
  **word**, because `PriceChange` hides its glyph from the tree and exposes
  _up_ / _down_.

**Reversal trigger, as a condition:** the first surface where a price change is
**the answer to something the user asked for**. Announcing is an interruption
when it is unprompted and an answer when it is not.

### What nobody has heard, named rather than implied

Two entries added to `CLAUDE.md`'s listening backlog, and **adding them is
success rather than a shortfall** — the story says so explicitly.

- **The block's spoken string is 10 words across three `<p>` elements**, so
  `textContent` runs them together — _"…close218.29down −0.03%2026-09-11 · …"_ —
  while a screen reader pauses between blocks. **Which of those a listener gets
  is readable from neither the DOM nor a timing.**
- **The qualifier can now carry three clauses**
  (`07:42 EDT · pre-market · change from …`), so **how the `·` is spoken**, or
  whether it is spoken at all, changes the sentence and differs by reader.

### `docs/GAPS.md` entry 11 is now PARTLY mechanical, and the split is the point

The browser suite covers **the one element that had the defect**. What stays on
the list is the general claim — _every animated element has a base state that is
correct when its animation does not run_ — true of the four that exist today and
guarded for one. That residue is exactly what the list is for, and turning half
of an entry mechanical rather than pretending to close it is the honest move.

## For a stakeholder — a status report, 2026-09-21

**Where the product is.** A user can explore 518 US companies and their
historical charts, a price moves on its own, a dot says a fresh price landed,
and a word says when a price came from outside normal trading hours. **This task
was about the two readers all of that can quietly exclude**: somebody who cannot
see the screen, and somebody who has asked their computer for less movement.

**The second one first, because it had a real hole in it.**

Operating systems let people say _reduce motion_ — for motion sickness,
migraine, or simple preference — and we honour it: our dot does not animate for
them. But the dot is the **only** thing that moves on a minute where the price
arrives unchanged. So for that reader, on that minute, we were at risk of
showing **nothing at all** on precisely the event the dot exists to report.

**It turned out we already had the answer on the screen and had not noticed.**
The small print under the price carries the time the price is from, and that
time **advances every minute whether or not the price moved**. So the change is
still visible without any movement — the dot was only ever saying _look_.

We did not design anything for this. We **proved** it, in a real browser with
the preference switched on, and wrote the test that goes red if it ever stops
being true.

**And we made sure the dot really is off, not just different.** A few days ago
we shipped a version where, for exactly that reader, the dot appeared and then
**never went away** — a permanent mark beside the price, which reads as a
permanent _condition_ rather than a fleeting event. We fixed it then; this task
is where it became impossible to bring back. We deliberately reintroduced the
old code to confirm the new test catches it.

**Now the reader who cannot see the screen.**

The decision is that **a changing price announces nothing**, and that is a
choice rather than an omission. Three reasons, and two are measurements:

- This page already has **three** regions that speak. A fourth is how a page
  starts talking over itself.
- We measured that a company can go **over three hours** between updates, or
  update every minute. A price that announced itself would interrupt roughly
  **sixty times an hour**, indefinitely, about a number nobody asked about.
- Everything before this announced the result of something the **user did**. A
  price arriving on its own is the first thing that would interrupt unprompted.

**The information is not hidden — it is just not shouted.** A screen-reader user
who navigates to the price gets it as a sentence, and in fact gets **more** than
a sighted user glancing at it: the direction is spoken as the word _up_ or
_down_, not left to a small coloured triangle.

We also wrote down **what would change our minds**: the first time a price
change is _the answer to something the user asked for_ — an alert they signed up
for, an investigation they started. Interrupting is rude when it is unprompted
and helpful when it is not.

**One thing we are honest about not knowing.** We can read the words a screen
reader will be handed; we cannot hear how they sound. Two specific unknowns are
now written on the record by name — whether the three lines run together or
pause, and how the small `·` separator is read aloud now that the line can carry
three parts. That list is waiting for a person with a screen reader, and adding
to it deliberately is the point rather than a failure.

**What a user can see today: nothing new**, and for two particular readers,
nothing missing.

**What is left in this story:** the measurements we owe, one chrome
contradiction that only shows on a replay, and then the rehearsal against the
real market — which, because of what we shipped yesterday, now has to straddle
the opening bell.

---

## Amended by Task 3.6.1 — 2026-09-21: the spoken string has a second length

**The first of the two backlog entries above says the block's spoken string is
10 words. It is now 10 _or_ 11**, and which one depends on something a listener
cannot see.

Task 3.6.1 gave the change a session-aware basis, so the qualifier's third
clause has two spellings:

| When                                                            | The clause                       | Words |
| --------------------------------------------------------------- | -------------------------------- | ----- |
| The stored close is from an earlier session — the ordinary case | `change from 2026-09-04's close` | 4     |
| The store already holds the live bar's own session              | `change from the previous close` | 5     |

**Derived from the measured figure rather than re-measured**, and flagged as
such: the 10 was counted on the block as it stood, and this adds one word to one
branch of one clause.

**It does not change what is open, and it sharpens why.** The question was never
the count — it was _which of three `<p>` elements a listener actually gets, and
how the `·` is spoken_. A string whose length changes with the state of the
**store** rather than with anything on screen is one more reason that question
cannot be answered from a DOM, a timing, or by an agent. **Owner is unchanged:
a person with a screen reader.**
