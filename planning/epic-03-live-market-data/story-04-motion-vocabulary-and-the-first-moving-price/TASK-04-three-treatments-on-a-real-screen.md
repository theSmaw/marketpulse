# Task 3.4.4 — Three treatments on a real screen, and the decision

**Status:** **Complete — 2026-09-21.** Four treatments were built and run against the **real component** at 1×, greyscale-checked, and **the owner decided: treatment D, the arrival mark, firing on every bar rather than on every change.** Open decision 2 answered in the same sitting, which is what turned the mark from a claim about the price into a claim about the feed. Nothing shipped — Task 3.4.5 implements it.
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](STORY.md)
**Depends on:** 3.4.3

## Objective

**Settle the design criterion this product has answered _not yet_ eight times.**
Put real options in front of the owner on a real moving screen, and take the
decision.

## What the user can see when this lands

**Two or three prices moving, side by side, differently** — a comparison page in
the workshop, or the same screen reloaded three ways. Not a deliverable; the
instrument the decision is taken with.

## Task 3.4.3 unblocks this, and it exists because of what 3.4.2 found

**This task's whole method is _two or three treatments shown at 1× against the
replay_.** Task 3.4.2 discovered there was nothing to show them against — none
of the three stream implementations delivers an observation into a running
process — so **Task 3.4.3 was inserted** to make a number move before anybody
designs how it should move.

**Do not start until a price is actually changing on screen.** A treatment
chosen against a static number is the defect this story exists to prevent,
arriving through the back door.

## What is already decided and must not be re-taken

**The canvas comes first, and it is reachable.** ADR 0026's chain is canvas →
`VISUAL-LANGUAGE.md` → `tokens.css` → components, and **the motion row is the one
place in this product where it has already run backwards** — that row owes a
sync and says so. Tasks 3.3.5 and 3.3.6 reached the canvas and added
`Live in the chrome.dc.html` to it, so **this story's section recording it as
unreachable is stale** and should be corrected rather than inherited.

**Read `Live in the chrome.dc.html` §07 before drawing.** It reserved this
position by name, and it carries the three constraints below.

### The three constraints that arrive with the position

1. **Motion means work in progress, and nothing else may borrow it.** A price
   that has _changed_ has finished changing — so whatever marks it must be
   distinguishable at a glance from the hairline that marks a request in flight,
   or one of them is lying. It already governed a shipped decision: the chart
   rail's settled states are static and only _refreshing_ travels.
2. **Green means price-positive.** The identity accent is crimson, scoped to
   four positions in the chrome. **Green is spent.** A treatment arriving in a
   colour has to answer what that colour already means here.
3. **`LIVE` stays still.** It is a statement of fact about a connection. If this
   task concludes the word itself should acquire motion, that is a **reversal of
   a decision taken with its reasoning written down** and wants the same
   treatment rather than a quiet edit.

### And two rules with teeth

- **Motion must never make a number harder to read.** A value that fades or
  slides while an analyst is reading it is worse than one that changes
  instantly. This is what makes a market application's motion genuinely hard and
  why the existing set is three tokens.
- **Colour is never the sole encoding of anything.** The price palette differs by
  **1.04:1 in greyscale**, so hue is the entire difference between up and down —
  shape, sign, glyph or word must carry it. A green flash and a red flash are
  **the same flash** to a large number of readers, and this repository has
  already caught a real defect where four greyscale simulations passed against a
  chart that was wrong.

## Work

- **Sync the canvas first**, then draw. The motion row's debt is discharged here
  or it is recorded again with a reason.
- **Build two or three treatments that actually run.** The candidates the story
  names: a direction-carrying flash, a brief emphasis on the digits that
  changed, a mark that appears beside the number, or **nothing at all with only
  the digits swapping** — which is 3.4.2's shipped state and is a real option
  rather than the control.
- **Show them at 1× against the replay**, side by side, and **ask the owner**.
  Open decision 1 is theirs and the standing instruction about the bar applies.
- **Ask open decision 2 in the same sitting**: does an unchanged tick show
  anything? A feed saying _still 174.32_ is information, and drawing it is the
  difference between a live application and a static one during a quiet minute —
  and also between a calm screen and a twitching one.
- **Check every candidate in greyscale before showing it**, so a treatment that
  fails rule 2 is never a candidate.

## Done when

- The canvas is synced, or its unreachability is recorded in the motion row's
  own terms
- Two or three running treatments were shown at **1×**, not described
- **The owner decided**, and the rejected options are written down with why
- Open decision 2 is answered
- Every candidate was checked in **greyscale**
- Nothing is shipped yet — Task 3.4.5 implements the answer

---

## What was found

### The question this task expected to ask was the wrong one

The brief assumed a choice about **volume** — how loudly a change should
announce itself. Task 3.4.3 measured the subject first and the assumption did
not survive it: at 1×, a minute of real movement changes **one or two glyphs of
six**, and NVDA's leading digits did not move once in four minutes.

**The undesigned version is not distracting. It is nearly invisible.** So the
decision was never _how loud_ — it was **whether a change should be noticeable
to somebody who is not looking at it, and what that costs in calm.**

### Four candidates, and each answers a different question

Built as **pseudo-elements on the real `SecurityIdentity`**, with the real
tokens, the real tabular figures and the real `prefers-reduced-motion` answer —
not as a drawing.

|                            | The mark's claim                                                 | Greyscale                                                    |
| -------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| **A** — nothing            | —                                                                | survives; there is nothing to lose                           |
| **B** — the direction rule | **which way it went**: a rule above for a rise, below for a fall | survives — **position** carries direction, hue is redundancy |
| **C** — the changed digits | **what moved**: an underline under only the digits that differ   | survives — carries no hue at all                             |
| **D** — the arrival mark   | **that something arrived**: a disc beside the figure             | survives — a filled disc against nothing                     |

**All four leave the digits at full contrast for the whole of their life**,
which is _motion must never make a number harder to read_ applied rather than
restated. It rules out what market software reaches for first — the panel that
flashes behind the number — because it drops the figure's contrast at the exact
moment the figure is worth reading. It also rules out a count-up, a blur and a
cross-fade, and none of those was built.

### The decision: D, and it fires on every bar

**The owner chose the arrival mark, and answered open decision 2 `yes`.** Those
two answers are **one answer**, and that is the part worth understanding.

A mark that fired only on a change would have meant _the price moved_ — which
the `▲` and the signed percentage already say. **Firing on every bar makes it a
different claim, and one nothing else on the screen makes:**

> **A bar arrived for this security.**

### Why that does not breach §11.2, which was the first thing checked

§11.2 refuses to give a security a **status word**, and the measurement behind
it is decisive: the gap between one security's bars has a p50 of one minute and
a **maximum of 187**, so no threshold separates a quiet security from a broken
one.

**This makes no threshold judgement.** It marks an event that happened and says
nothing whatever about what silence means. A reader who sees no mark for an hour
learns that no bar arrived for an hour — which is **true**, and is a different
thing from being told the security is stale.

### And it is not the chrome's disc, which was the stated risk

The objection when D was a candidate: the same glyph two inches away, in the
status bar, means _the connection is live_. **They are told apart by behaviour
rather than by shape**, and that turns out to be the rule this task actually
contributes:

> **Work in progress LOOPS. A state PERSISTS. A fact arriving DECAYS.**

The chart rail's hairline travels for as long as a request is in flight and has
no end. The chrome's disc is static and describes a state. This one appears and
is gone. **Three behaviours, three meanings, one shape vocabulary** — and a
reader can tell them apart without being taught, which is the test a vocabulary
has to pass. It also means constraint 1 — _motion means work in progress and
nothing else may borrow it_ — is honoured rather than argued around: a price
that has changed has **finished** changing, and a decay is what finished looks
like.

### The rejected options, with why

- **A — nothing.** A real candidate, and it lost on measurement rather than
  taste: one glyph of six, leading digits unmoved across four minutes. Keeping
  it would have answered _does it feel alive_ **not yet** for the ninth time,
  at the first moment the honest version of the question was testable.
- **B — the direction rule.** The most designed of the three, and it **says what
  is already said**: `PriceChange` carries direction with a glyph _and_ a sign
  _and_ a hue, built so the meaning survives greyscale. A second encoding of one
  fact is a repetition, and this one would have been the loudest thing on the
  page for the least new information. It also needs two reserved positions.
- **C — the changed digits.** The most informative, rejected for what the
  measurement says it would **become**: a minute moves the cents, so it would
  underline the same two glyphs nearly every time and settle into furniture.
  And it **cannot answer the quiet minute at all** — when nothing changed there
  are no digits to mark — so choosing it would have decided open decision 2 by
  omission rather than by decision.

### The cost, accepted with eyes open, and its reversal trigger

**It fires once a minute for this security, for ever**, through a completely
flat afternoon with nothing to report. A signal that always fires carries little
information. That objection was put and overruled deliberately: what it carries
is not _what happened_ but _that the feed is alive here_.

**Reversal trigger — a condition, not a date:** the first time a reader reports
the mark as noise, or **the first surface where it fires more than once a
second.**

### Two things found by looking, which nothing mechanical could have caught

**1. The first draft struck through the label and the qualifier.** The block's
label sits **4 px** above the figure and the qualifier **4 px** below — measured,
not guessed — so a mark hung outside the digits drew a line through one of them.
It looked fine on the canvas, where the spacing is generous, and wrong the
moment it met the real type.

**The repair is better than the original intent.** A 30 px monospace figure
fills only about **21 px of its 32 px box**, so a 2 px mark lives in the unused
room above the digit tops or below their baseline: **nothing reserved, no layout
shift, at 1440, 1024, 768 and 390**, and no horizontal overflow at any of them.
At 390 the figure still has **26 px** of room to its left, so D's disc clears
the gutter with 9 px to spare.

**2. Remounting the block to replay an animation is a trap, and it is the
obvious implementation.** A CSS animation does not restart when the same
animation is re-applied to the same element — the browser never sees the
intermediate state — so the instinctive fix is a React `key` on the block.
**`SecurityIdentity` animates its own arrival**, so that replays _the block
arriving_ on every price change: a fading, sliding block, which is precisely
what rule A forbids, and indistinguishable from a treatment.

The instrument therefore alternates **two animations with different names**,
which restarts reliably and touches nothing else. It is also the answer to _two
changes inside one animation_ — **restart, never queue or overlap** — which
matters because §7.8 measured **14 revisions in one session**: a corrected
minute arrives as a second change to the same figure, seconds after the first.

### What was built, and what is deliberately not shipped

- **`The motion vocabulary.dc.html`** on the design canvas — the four treatments
  running, at 1×, with a greyscale switch and the decision recorded in §05.
  **The canvas runs them rather than drawing them**, which is open decision 1's
  own rule honoured rather than worked around.
- **`MotionTreatments.stories.tsx`** and `motion-treatments.module.css` — the
  same four against the **real component and the real tokens**, which the canvas
  structurally cannot do: every colour on a canvas page is a hex somebody typed.
  This is where greyscale was actually checked.
- **`data-live-figure` and `data-live-price`** on `SecurityIdentity` — two
  attributes that render nothing. A treatment has to be positioned against the
  digits, and a CSS Module's generated class name is not reachable from outside
  the module. Task 3.4.5 attaches the chosen mark to the same hooks, so the
  alternative was inventing them twice.
- **Nothing else.** No token, no component, no treatment in the product. Task
  3.4.5 implements the answer.

### The motion row's debt, discharged

`--motion-duration-pulse` was added **in code** on 2026-09-14 because the canvas
was not reachable from that session — the one place in this product where
ADR 0026's chain has run backwards. **The canvas now carries the whole set**,
and the fourth member was decided there first and travels down.

| Token                      | Value      | Shape                                          |
| -------------------------- | ---------- | ---------------------------------------------- |
| `--motion-duration-quick`  | 120 ms     | once                                           |
| `--motion-duration-settle` | 240 ms     | once                                           |
| `--motion-duration-pulse`  | 1400 ms    | **loop** — the one that means work in progress |
| a fourth, unnamed          | Task 3.4.5 | **decay** — a fact arriving and then receding  |

### What this hands forward, in the sibling's own words

**Story 3.6 has 518 rows.** The decision was taken on **one number**, and the
same rule on the universe table is **up to 518 marks a minute — 8.6 a second**,
which is the reversal trigger's own second clause. That constraint is written
into `story-06-live-prices-across-the-universe/STORY.md` **in words that story
can act on**, rather than linked back to here: a pointer is what a reader
follows when they already know to look, and the whole failure is that they do
not.

## For a stakeholder — a status report, 2026-09-21

**Where the product is.** A user can explore 518 US companies and their
historical charts, the chrome says honestly whether live data is arriving, and
since two days ago **a price moves on its own**. This task decided what that
movement should look like — the question this product has postponed **eight
times** since the very first phase of work.

**The question turned out to be the opposite of the one we expected.** We
assumed we were choosing how loudly a changing price should announce itself, and
that the risk was a distracting, twitching screen. Then we watched a real one
for four minutes. A minute of genuine market movement changes **one or two
digits in the middle of a six-digit number**, and the first three digits did not
change once. **It is not distracting. It is almost impossible to notice.**

So the real question was: _should a change be noticeable to somebody who is not
looking directly at it, and what does that cost in calm?_

**How we decided.** Four options were built and put on the real screen, side by
side, changing on their own, at the real once-a-minute rate — not described, not
drawn. You cannot choose how a moving thing should look by looking at a picture
of it, and that rule is written into this story precisely so nobody would try.

The options were: **nothing at all** (what ships today), **a line that appears
above the number when it rises and below when it falls**, **an underline beneath
exactly the digits that changed**, and **a small dot that appears beside the
number and fades**.

**You chose the dot — and, importantly, chose to show it every time a price
arrives rather than only when the price is different.** Those two answers
together change what the dot means, and that is the good part of the decision.

A dot that appeared only on a change would say _this price moved_ — which the
little green or red arrow beside it already says. A dot that appears on **every**
update says something nothing else on the screen says: **this company is being
fed right now.**

That matters more than it sounds. Some companies trade constantly; some go
quiet. We measured that the gap between two updates for one company can be
**over three hours** and still be perfectly healthy. Until now, _this price has
not changed_ and _we have heard nothing about this company since lunchtime_
looked **identical** on screen. The dot separates them, without ever claiming a
company's feed is broken — which we deliberately refuse to claim, because there
is no honest threshold for it.

**The options we turned down, and why.** The direction line was the
best-looking, and it lost because it **repeats information already on the
screen**: the arrow and the percentage say which way the price went, in a
component already built so that a colour-blind reader gets the same answer. The
changed-digit underline was the most informative and would have quietly become
wallpaper — a minute almost always moves the pennies, so it would have
underlined the same two digits every time until nobody saw it. And doing nothing
lost on the measurement: it would have answered _does this feel alive_ with
**not yet** for the ninth time, at the first moment we could actually test it.

**Two things we only found by looking at it.** The first draft drew its line
straight through the words above and below the price — invisible in the design
tool, obvious the second it met the real screen. Fixing it produced a better
answer than we had planned: the mark now sits in **empty space the number
already occupies**, so it pushes nothing around at any screen size, from a
desktop down to a phone.

The second is the kind of thing that costs an afternoon if you meet it in the
wild: the obvious way to make an animation replay also **replays the whole block
arriving**, which would have put a fading, sliding panel on screen every minute
— the one thing this product's rules forbid outright.

**One cost we accepted knowingly.** The dot will blink once a minute, for ever,
including through a completely flat afternoon when nothing is happening. We
wrote down the condition under which we would change our minds rather than
leaving it as a feeling — and we have **already flagged it to the next piece of
work**, because the same rule on the 518-company table would be nine dots a
second across one page. That is a real question, it is written into that story
in its own words, and it is not this one's to answer.

**What a user can see today: nothing new.** This task deliberately shipped no
change at all — it exists to take a decision, and the decision is now made,
argued and recorded. **The very next task puts the dot on the screen**, and with
it the first answer this product has ever given to _does it feel alive_.
